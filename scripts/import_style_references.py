from __future__ import annotations

import argparse
import json
import shutil
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass(frozen=True)
class ProfileRule:
    profile_id: str
    title: str
    description: str
    matcher: Callable[[dict], bool]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import and classify style reference images for InstaMe.",
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Absolute path to the source folder containing style screenshots.",
    )
    parser.add_argument(
        "--max-images",
        type=int,
        default=0,
        help="Optional limit for imported images (0 = all).",
    )
    return parser.parse_args()


def clamp_channel(value: int) -> int:
    return max(0, min(255, value))


def rgb_to_hex(rgb: tuple[int, int, int]) -> str:
    return "#{:02X}{:02X}{:02X}".format(*rgb)


def classify_levels(arr: np.ndarray) -> tuple[str, str, str, str, float, float, float]:
    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    brightness = float(np.mean(luma))
    contrast = float(np.std(luma))

    max_rgb = np.maximum(np.maximum(r, g), b)
    min_rgb = np.minimum(np.minimum(r, g), b)
    saturation_map = np.where(max_rgb > 0, (max_rgb - min_rgb) / np.maximum(max_rgb, 1), 0.0)
    saturation = float(np.mean(saturation_map))

    mean_r = float(np.mean(r))
    mean_b = float(np.mean(b))
    warmth_score = mean_r - mean_b

    if brightness < 90:
        brightness_level = "low"
    elif brightness < 155:
        brightness_level = "medium"
    else:
        brightness_level = "high"

    if contrast < 38:
        contrast_level = "soft"
    elif contrast < 68:
        contrast_level = "balanced"
    else:
        contrast_level = "high"

    if saturation < 0.22:
        saturation_level = "muted"
    elif saturation < 0.42:
        saturation_level = "balanced"
    else:
        saturation_level = "vivid"

    if warmth_score > 12:
        temperature = "warm"
    elif warmth_score < -12:
        temperature = "cool"
    else:
        temperature = "neutral"

    return (
        brightness_level,
        contrast_level,
        saturation_level,
        temperature,
        brightness,
        contrast,
        saturation,
    )


def dominant_palette(arr: np.ndarray, max_colors: int = 4) -> list[str]:
    quantized = (arr // 16).astype(np.int16)
    flat = quantized.reshape(-1, 3)
    colors, counts = np.unique(flat, axis=0, return_counts=True)
    order = np.argsort(counts)[::-1]

    dominant: list[str] = []
    for idx in order[:max_colors]:
        q_r, q_g, q_b = colors[idx]
        rgb = (
            clamp_channel(int(q_r) * 16 + 8),
            clamp_channel(int(q_g) * 16 + 8),
            clamp_channel(int(q_b) * 16 + 8),
        )
        dominant.append(rgb_to_hex(rgb))
    return dominant


def build_tags(
    *,
    brightness_level: str,
    contrast_level: str,
    saturation_level: str,
    temperature: str,
    orientation: str,
) -> tuple[list[str], list[str], list[str], list[str], list[str]]:
    style_tags = {"old_money", "luxury_editorial", "timeless_tailoring"}
    vibe_tags = {"refined", "polished"}
    aesthetic_tags = {"quiet_luxury"}
    gender_tags = {"feminine"}
    prompt_hints = {
        "preserve facial identity and natural proportions",
        "keep hair structure from style reference but preserve target hair color",
        "make only subtle wardrobe adjustments",
    }

    if orientation == "portrait":
        style_tags.add("portrait_composition")
    if orientation == "landscape":
        style_tags.add("environment_story")
    if orientation == "square":
        style_tags.add("social_media_framing")

    if brightness_level == "low":
        vibe_tags.update({"moody", "cinematic"})
        aesthetic_tags.update({"editorial_night", "noir_luxe"})
        prompt_hints.add("use sculpted low-key lighting")
    elif brightness_level == "high":
        vibe_tags.update({"airy", "clean"})
        aesthetic_tags.update({"daylight_editorial", "minimal_luxury"})
        prompt_hints.add("use soft daylight and elegant highlights")
    else:
        vibe_tags.add("balanced_light")
        aesthetic_tags.add("modern_editorial")

    if contrast_level == "high":
        style_tags.add("dramatic_contrast")
        vibe_tags.add("statement")
        prompt_hints.add("use pronounced contrast with crisp details")
    elif contrast_level == "soft":
        style_tags.add("soft_contrast")
        vibe_tags.add("delicate")
        prompt_hints.add("keep contrast soft and skin texture natural")
    else:
        style_tags.add("balanced_contrast")

    if saturation_level == "muted":
        style_tags.add("muted_palette")
        vibe_tags.add("understated")
        aesthetic_tags.add("heritage_chic")
        prompt_hints.add("focus on muted neutrals and premium fabrics")
    elif saturation_level == "vivid":
        style_tags.add("rich_palette")
        vibe_tags.add("bold")
        aesthetic_tags.add("glam_editorial")
        prompt_hints.add("keep color rich but still elegant")
    else:
        style_tags.add("controlled_palette")

    if temperature == "warm":
        style_tags.add("warm_tones")
        vibe_tags.add("golden")
        aesthetic_tags.add("sunset_luxury")
        prompt_hints.add("favor warm golden highlights and skin tones")
    elif temperature == "cool":
        style_tags.add("cool_tones")
        vibe_tags.add("sleek")
        aesthetic_tags.add("minimal_noir")
        prompt_hints.add("use cool polished tones with neutral shadows")
    else:
        style_tags.add("neutral_tones")
        vibe_tags.add("clean")
        aesthetic_tags.add("timeless_minimal")

    return (
        sorted(style_tags),
        sorted(vibe_tags),
        sorted(aesthetic_tags),
        sorted(gender_tags),
        sorted(prompt_hints),
    )


def build_profiles(references: list[dict]) -> list[dict]:
    rules = [
        ProfileRule(
            profile_id="quiet_luxury",
            title="Quiet Luxury",
            description="Muted palette, warm or neutral tones, refined and understated mood.",
            matcher=lambda ref: "muted_palette" in ref["styleTags"]
            and ("warm_tones" in ref["styleTags"] or "neutral_tones" in ref["styleTags"]),
        ),
        ProfileRule(
            profile_id="modern_editorial",
            title="Modern Editorial",
            description="Balanced contrast and polished tones for premium social-ready edits.",
            matcher=lambda ref: "balanced_contrast" in ref["styleTags"]
            and "controlled_palette" in ref["styleTags"],
        ),
        ProfileRule(
            profile_id="cinematic_editorial",
            title="Cinematic Editorial",
            description="Moody, high-contrast references for dramatic old-money visuals.",
            matcher=lambda ref: "dramatic_contrast" in ref["styleTags"] and "moody" in ref["vibeTags"],
        ),
        ProfileRule(
            profile_id="heritage_soft",
            title="Heritage Soft",
            description="Lower-contrast references with classic textures and delicate finishing.",
            matcher=lambda ref: "soft_contrast" in ref["styleTags"] and "muted_palette" in ref["styleTags"],
        ),
        ProfileRule(
            profile_id="statement_glam",
            title="Statement Glam",
            description="Rich palette and elevated contrast for bolder premium edits.",
            matcher=lambda ref: "rich_palette" in ref["styleTags"] and "statement" in ref["vibeTags"],
        ),
    ]

    profiles = []
    for rule in rules:
        matched_ids = [ref["id"] for ref in references if rule.matcher(ref)]
        profiles.append(
            {
                "id": rule.profile_id,
                "title": rule.title,
                "description": rule.description,
                "referenceIds": matched_ids,
            }
        )
    return profiles


def index_dimension(references: list[dict], field_name: str) -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for ref in references:
        for token in ref[field_name]:
            result.setdefault(token, []).append(ref["id"])
    for token in list(result.keys()):
        result[token] = sorted(result[token])
    return dict(sorted(result.items()))


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    source_dir = Path(args.source).expanduser().resolve()
    target_dir = root / "assets" / "style-references" / "images"
    metadata_path = root / "assets" / "style-references" / "library.json"

    if not source_dir.exists():
        raise FileNotFoundError(f"Source folder does not exist: {source_dir}")

    source_files = sorted(
        [
            path
            for path in source_dir.rglob("*")
            if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
        ]
    )
    if args.max_images > 0:
        source_files = source_files[: args.max_images]

    if not source_files:
        raise RuntimeError("No images found in source folder.")

    if target_dir.exists():
        shutil.rmtree(target_dir)
    target_dir.mkdir(parents=True, exist_ok=True)

    references: list[dict] = []
    for index, src_path in enumerate(source_files, start=1):
        ref_id = f"style_ref_{index:03d}"
        extension = src_path.suffix.lower() if src_path.suffix else ".png"
        dest_name = f"{ref_id}{extension}"
        dest_path = target_dir / dest_name
        shutil.copy2(src_path, dest_path)

        with Image.open(src_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            sample = image.resize((160, 160), Image.Resampling.BILINEAR)
            arr = np.asarray(sample).astype(np.float32)

        aspect_ratio = round(width / max(height, 1), 4)
        if aspect_ratio > 1.15:
            orientation = "landscape"
        elif aspect_ratio < 0.85:
            orientation = "portrait"
        else:
            orientation = "square"

        (
            brightness_level,
            contrast_level,
            saturation_level,
            temperature,
            brightness,
            contrast,
            saturation,
        ) = classify_levels(arr)
        palette = dominant_palette(arr, max_colors=4)
        style_tags, vibe_tags, aesthetic_tags, gender_tags, prompt_hints = build_tags(
            brightness_level=brightness_level,
            contrast_level=contrast_level,
            saturation_level=saturation_level,
            temperature=temperature,
            orientation=orientation,
        )

        references.append(
            {
                "id": ref_id,
                "file": f"assets/style-references/images/{dest_name}",
                "sourceFilename": src_path.name,
                "width": width,
                "height": height,
                "orientation": orientation,
                "styleTags": style_tags,
                "vibeTags": vibe_tags,
                "aestheticTags": aesthetic_tags,
                "genderTags": gender_tags,
                "promptHints": prompt_hints,
                "metrics": {
                    "brightnessLevel": brightness_level,
                    "contrastLevel": contrast_level,
                    "saturationLevel": saturation_level,
                    "temperature": temperature,
                    "brightnessScore": round(brightness, 2),
                    "contrastScore": round(contrast, 2),
                    "saturationScore": round(saturation, 4),
                    "dominantPalette": palette,
                },
            }
        )

    profiles = build_profiles(references)
    indexes = {
        "byStyle": index_dimension(references, "styleTags"),
        "byVibe": index_dimension(references, "vibeTags"),
        "byAesthetic": index_dimension(references, "aestheticTags"),
        "byGender": index_dimension(references, "genderTags"),
    }

    metadata = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFolder": str(source_dir),
        "referenceCount": len(references),
        "profiles": profiles,
        "indexes": indexes,
        "references": references,
    }

    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
    print(f"Imported {len(references)} images into {target_dir}")
    print(f"Generated metadata at {metadata_path}")


if __name__ == "__main__":
    main()
