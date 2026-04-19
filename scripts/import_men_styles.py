"""Import Men styles into the existing catalog and tag all presets with categories."""

from __future__ import annotations

import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
PROMPT_FILE_PATTERN = re.compile(r"^prompt.*\.txt$", re.IGNORECASE)

# Reuse model rules from main import script
MODEL_RULES: list[tuple[re.Pattern[str], dict[str, str]]] = [
    (re.compile(r"gemini\s*(?:3(?:\.1)?|2(?:\.5)?)\s*[- ]?flash\s*[- ]?image(?:\s*preview)?", re.IGNORECASE),
     {"provider": "together", "model": "google/flash-image-3.1", "displayName": "Google Flash Image 3.1 Preview"}),
    (re.compile(r"gemini\s*(?:3(?:\.1)?|3)\s*[- ]?pro\s*[- ]?image", re.IGNORECASE),
     {"provider": "together", "model": "google/gemini-3-pro-image", "displayName": "Google Gemini 3 Pro Image"}),
    (re.compile(r"flux\s*2\s*max", re.IGNORECASE),
     {"provider": "together", "model": "black-forest-labs/FLUX.2-max", "displayName": "FLUX.2 Max"}),
    (re.compile(r"flux\s*2\s*(?:-\s*)?pro", re.IGNORECASE),
     {"provider": "together", "model": "black-forest-labs/FLUX.2-pro", "displayName": "FLUX.2 Pro"}),
]
MODEL_ANNOTATION_PATTERN = re.compile(
    r'[\s"""\']*\(\s*[^()\n]*(?:flux\s*2|reve|gpt|chat\s*gpt|chatgpt|gemini|qwen)[^()\n]*\)?\s*$',
    re.IGNORECASE,
)

# Human-readable labels for numbered folders
MEN_STYLE_LABELS: dict[str, str] = {
    "1": "Raw Hoodie Flash",
    "2": "Pastel Tee Lo-fi",
    "3": "Dark Overcoat Night",
    "4": "Turtleneck BW Portrait",
    "5": "Dark Moody Editorial",
    "6": "Model Street Style",
    "7": "Crossing Street Urban",
    "8": "Buzz Cut Portrait",
    "9": "White Tee Casual",
    "10": "Black Outfit Urban",
    "11": "Walking City Street",
    "12": "Standing Architecture",
    "13": "Sunglasses Cool Style",
    "14": "Reclining Casual",
    "15": "Reading Newspaper",
    "16": "Leaning Wall Portrait",
    "17": "Walking Confidently",
}


def slugify(value: str) -> str:
    normalized = re.sub(r"[^a-zA-Z0-9]+", "_", value.strip().lower())
    normalized = re.sub(r"_+", "_", normalized).strip("_")
    return normalized or "style"


def extract_models_from_text(prompt_text: str) -> list[dict[str, str]]:
    matches: list[tuple[int, dict[str, str]]] = []
    for pattern, descriptor in MODEL_RULES:
        for match in pattern.finditer(prompt_text):
            matches.append((match.start(), descriptor.copy()))
    seen: set[tuple[str, str]] = set()
    ordered: list[dict[str, str]] = []
    for _, descriptor in sorted(matches, key=lambda item: item[0]):
        key = (descriptor["provider"], descriptor["model"])
        if key in seen:
            continue
        seen.add(key)
        ordered.append(descriptor)
    return ordered


def strip_model_annotation(prompt_text: str) -> str:
    cleaned = prompt_text.strip()
    while True:
        updated = MODEL_ANNOTATION_PATTERN.sub("", cleaned).strip()
        if updated == cleaned:
            return cleaned
        cleaned = updated


def strip_variant_prefix(prompt_text: str) -> str:
    return re.sub(r"(?im)^\s*(?:prompt\s*)?\d+\s*[:.)-]?\s*", "", prompt_text.strip(), count=1).strip()


def extract_models(prompt_text: str) -> tuple[str, list[dict[str, str]]]:
    cleaned_prompt = strip_variant_prefix(strip_model_annotation(prompt_text))
    models = extract_models_from_text(prompt_text)
    return cleaned_prompt, models


def split_prompt_variants(prompt_text: str) -> list[dict[str, object]]:
    prompt_text = prompt_text.replace("\r\n", "\n").strip()
    if not prompt_text:
        return []

    marker_pattern = re.compile(r"(?im)^\s*prompt\s*(\d+)\s*[:.)-]?\s*")
    matches = list(marker_pattern.finditer(prompt_text))

    if not matches:
        cleaned_prompt, models = extract_models(prompt_text)
        return [{"id": "prompt_1", "label": "Prompt 1", "prompt": cleaned_prompt, "requestedModels": models}]

    variants: list[dict[str, object]] = []
    first_block = prompt_text[: matches[0].start()].strip()
    if first_block:
        cleaned_body, models = extract_models(first_block)
        if cleaned_body:
            variants.append({"id": "prompt_1", "label": "Prompt 1", "prompt": cleaned_body, "requestedModels": models})

    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(prompt_text)
        raw_body = prompt_text[start:end].strip()
        cleaned_body, models = extract_models(raw_body)
        if cleaned_body:
            variants.append({
                "id": f"prompt_{match.group(1)}",
                "label": f"Prompt {match.group(1)}",
                "prompt": cleaned_body,
                "requestedModels": models,
            })

    return variants


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    men_source = Path(r"C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles\Styles Representative Image\Men")
    catalog_root = root / "assets" / "instame-style-presets"
    styles_root = catalog_root / "styles"
    catalog_path = catalog_root / "catalog.json"

    if not men_source.exists():
        raise FileNotFoundError(f"Men source folder does not exist: {men_source}")

    # Load existing catalog
    existing_presets: list[dict] = []
    if catalog_path.exists():
        with open(catalog_path, encoding="utf-8") as f:
            existing_catalog = json.load(f)
        existing_presets = existing_catalog.get("presets", [])

    # Tag all existing presets as 'women' if they don't have a category
    for preset in existing_presets:
        if "category" not in preset or not preset["category"]:
            preset["category"] = "women"

    # Remove any old men presets (in case of re-run)
    existing_presets = [p for p in existing_presets if p.get("category") != "men"]

    existing_ids = {p["id"] for p in existing_presets}

    # Import men styles (only folders 1-17 that have images)
    men_presets: list[dict] = []
    for folder_num in range(1, 51):
        style_dir = men_source / str(folder_num)
        if not style_dir.exists():
            continue

        image_files = sorted(
            [p for p in style_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS],
            key=lambda p: p.name.lower(),
        )
        if not image_files:
            continue

        prompt_files = sorted(
            [p for p in style_dir.iterdir() if p.is_file() and PROMPT_FILE_PATTERN.match(p.name)],
            key=lambda p: p.name.lower(),
        )

        label = MEN_STYLE_LABELS.get(str(folder_num), f"Men Style {folder_num}")
        slug = f"men_{slugify(label)}"

        # Avoid ID collisions
        if slug in existing_ids:
            slug = f"men_{folder_num}_{slugify(label)}"

        target_style_dir = styles_root / slug
        target_style_dir.mkdir(parents=True, exist_ok=True)

        copied_images: list[str] = []
        for image_file in image_files:
            target_path = target_style_dir / image_file.name
            shutil.copy2(image_file, target_path)
            copied_images.append(str(target_path.relative_to(root)).replace("\\", "/"))

        prompt_variants: list[dict[str, object]] = []
        prompt_file_relative = ""
        if prompt_files:
            prompt_file = prompt_files[0]
            copied_prompt = target_style_dir / prompt_file.name
            shutil.copy2(prompt_file, copied_prompt)
            prompt_file_relative = str(copied_prompt.relative_to(root)).replace("\\", "/")
            prompt_variants = split_prompt_variants(prompt_file.read_text(encoding="utf-8"))

        men_presets.append({
            "id": slug,
            "label": label,
            "subtitle": "Men's portrait style preset",
            "category": "men",
            "promptHint": label,
            "cover": copied_images[0],
            "representativeImage": copied_images[0],
            "examples": copied_images,
            "promptFile": prompt_file_relative,
            "promptVariants": prompt_variants,
            "promptOnlyAfterFirstUse": False,
        })

    all_presets = existing_presets + men_presets

    catalog = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "sourceFolder": str(men_source),
        "presetCount": len(all_presets),
        "presets": all_presets,
    }

    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"Tagged {len(existing_presets)} existing presets as 'women'.")
    print(f"Imported {len(men_presets)} men style presets.")
    print(f"Total presets: {len(all_presets)}")
    print(f"Catalog written to {catalog_path}")


if __name__ == "__main__":
    main()
