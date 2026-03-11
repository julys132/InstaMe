from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
PROMPT_FILE_PATTERN = re.compile(r"^prompt.*\.txt$", re.IGNORECASE)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Import InstaMe representative style folders into the project catalog.",
    )
    parser.add_argument(
        "--source",
        required=True,
        help="Absolute path to the source folder that contains representative style subfolders.",
    )
    return parser.parse_args()


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "style"


def normalize_model_token(raw: str) -> dict[str, str] | None:
    token = raw.strip().lower()
    if not token:
        return None

    cleaned = re.sub(r"\s+", " ", token)
    if "flux 2 max" in cleaned:
        return {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-max",
            "displayName": "FLUX.2 Max",
        }
    if "flux 2 pro" in cleaned or "flux 2 -pro" in cleaned:
        return {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-pro",
            "displayName": "FLUX.2 Pro",
        }
    if "flux 2 flex" in cleaned:
        return {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-Flex",
            "displayName": "FLUX.2 Flex",
        }
    if "reve v1.1" in cleaned or "reve-v1.1" in cleaned or "reve 1.1" in cleaned:
        return {
            "provider": "together",
            "model": "reve-v1.1",
            "displayName": "Reve v1.1",
        }
    if "chat gpt 1.5 image model" in cleaned or "gpt image 1.5" in cleaned or "gpt-image-1.5" in cleaned:
        return {
            "provider": "openai",
            "model": "gpt-image-1.5",
            "displayName": "GPT Image 1.5",
        }
    if "gpt-image-1" in cleaned or "gpt image 1" in cleaned or "chat gpt image model" in cleaned:
        return {
            "provider": "openai",
            "model": "gpt-image-1",
            "displayName": "GPT Image 1",
        }
    return None


def extract_models(prompt_text: str) -> tuple[str, list[dict[str, str]]]:
    matches = list(re.finditer(r"\(([^()]*)\)\s*$", prompt_text.strip(), re.MULTILINE))
    if not matches:
        return prompt_text.strip(), []

    last_match = matches[-1]
    model_tokens = [normalize_model_token(token) for token in last_match.group(1).split(",")]
    models = [token for token in model_tokens if token is not None]
    if not models:
        return prompt_text.strip(), []

    cleaned_prompt = prompt_text[: last_match.start()].strip()
    return cleaned_prompt, models


def split_prompt_variants(prompt_text: str) -> list[dict[str, object]]:
    prompt_text = prompt_text.replace("\r\n", "\n").strip()
    if not prompt_text:
        return []

    marker_pattern = re.compile(r"(?im)^\s*prompt\s*(\d+)\s*:?\s*$")
    matches = list(marker_pattern.finditer(prompt_text))

    if not matches:
        cleaned_prompt, models = extract_models(prompt_text)
        return [
            {
                "id": "prompt_1",
                "label": "Prompt 1",
                "prompt": cleaned_prompt,
                "requestedModels": models,
            }
        ]

    variants: list[dict[str, object]] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(prompt_text)
        raw_body = prompt_text[start:end].strip()
        cleaned_body, models = extract_models(raw_body)
        if cleaned_body:
            variants.append(
                {
                    "id": f"prompt_{match.group(1)}",
                    "label": f"Prompt {match.group(1)}",
                    "prompt": cleaned_body,
                    "requestedModels": models,
                }
            )

    return variants


def build_subtitle(folder_name: str, prompt_variants: list[dict[str, object]]) -> str:
    if "selfie" in folder_name.lower():
        return "Curated selfie portrait preset"
    if "editorial" in folder_name.lower():
        return "Curated editorial portrait preset"
    if "glam" in folder_name.lower():
        return "Curated glam portrait preset"
    if prompt_variants:
        return "Prompt-led portrait transformation preset"
    return "Curated portrait style preset"


def main() -> None:
    args = parse_args()
    root = Path(__file__).resolve().parents[1]
    source_dir = Path(args.source).expanduser().resolve()
    catalog_root = root / "assets" / "instame-style-presets"
    styles_root = catalog_root / "styles"
    catalog_path = catalog_root / "catalog.json"

    if not source_dir.exists():
        raise FileNotFoundError(f"Source folder does not exist: {source_dir}")

    if styles_root.exists():
        shutil.rmtree(styles_root)
    styles_root.mkdir(parents=True, exist_ok=True)

    presets: list[dict[str, object]] = []

    for style_dir in sorted([path for path in source_dir.iterdir() if path.is_dir()], key=lambda path: path.name.lower()):
        slug = slugify(style_dir.name)
        target_style_dir = styles_root / slug
        target_style_dir.mkdir(parents=True, exist_ok=True)

        image_files = sorted(
            [path for path in style_dir.iterdir() if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS],
            key=lambda path: path.name.lower(),
        )
        prompt_files = sorted(
            [path for path in style_dir.iterdir() if path.is_file() and PROMPT_FILE_PATTERN.match(path.name)],
            key=lambda path: path.name.lower(),
        )

        if not image_files:
            continue

        copied_images: list[str] = []
        for image_file in image_files:
            target_image_path = target_style_dir / image_file.name
            shutil.copy2(image_file, target_image_path)
            copied_images.append(
                str(target_image_path.relative_to(root)).replace("\\", "/")
            )

        prompt_variants: list[dict[str, object]] = []
        prompt_file_relative_path = ""
        if prompt_files:
            prompt_file = prompt_files[0]
            copied_prompt_path = target_style_dir / prompt_file.name
            shutil.copy2(prompt_file, copied_prompt_path)
            prompt_file_relative_path = str(copied_prompt_path.relative_to(root)).replace("\\", "/")
            prompt_variants = split_prompt_variants(prompt_file.read_text(encoding="utf-8"))

        cover_path = copied_images[0]
        presets.append(
            {
                "id": slug,
                "label": style_dir.name,
                "subtitle": build_subtitle(style_dir.name, prompt_variants),
                "promptHint": style_dir.name,
                "cover": cover_path,
                "representativeImage": cover_path,
                "examples": copied_images,
                "promptFile": prompt_file_relative_path,
                "promptVariants": prompt_variants,
                "promptOnlyAfterFirstUse": True,
            }
        )

    catalog = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFolder": str(source_dir),
        "presetCount": len(presets),
        "presets": presets,
    }

    catalog_root.mkdir(parents=True, exist_ok=True)
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"Imported {len(presets)} representative style presets.")
    print(f"Catalog written to {catalog_path}")


if __name__ == "__main__":
    main()
