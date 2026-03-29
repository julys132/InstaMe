from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path


IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
PROMPT_FILE_PATTERN = re.compile(r"^prompt.*\.txt$", re.IGNORECASE)
MODEL_RULES: list[tuple[re.Pattern[str], dict[str, str]]] = [
    (
        re.compile(r"flux\s*2\s*max", re.IGNORECASE),
        {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-max",
            "displayName": "FLUX.2 Max",
        },
    ),
    (
        re.compile(r"flux\s*2\s*(?:-\s*)?pro", re.IGNORECASE),
        {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-pro",
            "displayName": "FLUX.2 Pro",
        },
    ),
    (
        re.compile(r"flux\s*2\s*flex", re.IGNORECASE),
        {
            "provider": "together",
            "model": "black-forest-labs/FLUX.2-Flex",
            "displayName": "FLUX.2 Flex",
        },
    ),
    (
        re.compile(r"reve(?:\s|-)?v?\s*1\.1|reve(?:\s|-)?1\.1", re.IGNORECASE),
        {
            "provider": "reve",
            "model": "reve-v1.1",
            "displayName": "Reve v1.1",
        },
    ),
    (
        re.compile(r"chat\s*gpt\s*1\.5\s*image\s*model|gpt(?:-|\s*)image\s*1\.5", re.IGNORECASE),
        {
            "provider": "openai",
            "model": "gpt-image-1.5",
            "displayName": "GPT Image 1.5",
        },
    ),
    (
        re.compile(r"gpt(?:-|\s*)image\s*1(?!\.\d)|chat\s*gpt\s*image\s*model", re.IGNORECASE),
        {
            "provider": "openai",
            "model": "gpt-image-1",
            "displayName": "GPT Image 1",
        },
    ),
    (
        re.compile(r"chatgpt-image-latest-high-fidelity", re.IGNORECASE),
        {
            "provider": "openai",
            "model": "gpt-image-1.5",
            "displayName": "GPT Image 1.5",
        },
    ),
    (
        re.compile(r"qwen(?:-|\s*)image(?:-|\s*)2(?:\.0)?(?:-|\s*)pro|qwen\s*image\s*2(?:\.0)?\s*pro", re.IGNORECASE),
        {
            "provider": "together",
            "model": "Qwen/Qwen-Image-2.0-Pro",
            "displayName": "Qwen Image 2.0 Pro",
        },
    ),
    (
        re.compile(r"qwen(?:-|\s*)image(?:-|\s*)2(?:\.0)?|qwen\s*image\s*2(?:\.0)?", re.IGNORECASE),
        {
            "provider": "together",
            "model": "Qwen/Qwen-Image-2.0",
            "displayName": "Qwen Image 2.0",
        },
    ),
    (
        re.compile(r"qwen\s*image", re.IGNORECASE),
        {
            "provider": "together",
            "model": "Qwen/Qwen-Image",
            "displayName": "Qwen Image",
        },
    ),
    (
        re.compile(
            r"gemini\s*(?:3(?:\.1)?|2(?:\.5)?)\s*[- ]?flash\s*[- ]?image(?:\s*preview)?",
            re.IGNORECASE,
        ),
        {
            "provider": "together",
            "model": "google/flash-image-3.1",
            "displayName": "Google Flash Image 3.1 Preview",
        },
    ),
    (
        re.compile(r"gemini\s*(?:3(?:\.1)?|3)\s*[- ]?pro\s*[- ]?image", re.IGNORECASE),
        {
            "provider": "together",
            "model": "google/gemini-3-pro-image",
            "displayName": "Google Gemini 3 Pro Image",
        },
    ),
]
MODEL_ANNOTATION_PATTERN = re.compile(
    r'[\s"“”\']*\(\s*[^()\n]*(?:flux\s*2|reve(?:\s|-)?v?\s*1\.1|gpt(?:-|\s*)image|chat\s*gpt|chatgpt-image-latest-high-fidelity|gemini|qwen(?:-|\\s*)image)[^()\n]*\)?\s*$',
    re.IGNORECASE,
)


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
    token = raw.strip()
    if not token:
        return None

    for pattern, descriptor in MODEL_RULES:
        if pattern.search(token):
            return descriptor.copy()
    return None


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
        return [
            {
                "id": "prompt_1",
                "label": "Prompt 1",
                "prompt": cleaned_prompt,
                "requestedModels": models,
            }
        ]

    variants: list[dict[str, object]] = []
    first_block = prompt_text[: matches[0].start()].strip()
    if first_block:
        cleaned_body, models = extract_models(first_block)
        if cleaned_body:
            variants.append(
                {
                    "id": "prompt_1",
                    "label": "Prompt 1",
                    "prompt": cleaned_body,
                    "requestedModels": models,
                }
            )

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
                "promptOnlyAfterFirstUse": False,
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

