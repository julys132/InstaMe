"""
Fix catalog.json by replacing mangled '???' paths with actual filesystem filenames.
PowerShell encoded Cyrillic characters as '?' in catalog.json — this script corrects them.
"""

import json
import os
import sys

CATALOG_PATH = os.path.join(os.path.dirname(__file__), "..", "assets", "instame-style-presets", "catalog.json")
STYLES_ROOT = os.path.join(os.path.dirname(__file__), "..", "assets", "instame-style-presets", "styles")

def get_images_for_style(style_id):
    folder = os.path.join(STYLES_ROOT, style_id)
    if not os.path.isdir(folder):
        return []
    files = sorted([
        f for f in os.listdir(folder)
        if f.lower().endswith((".jpeg", ".jpg", ".png", ".webp"))
    ])
    return files

def make_relative_path(style_id, filename):
    return f"assets/instame-style-presets/styles/{style_id}/{filename}"

def fix_preset(preset):
    style_id = preset.get("id", "")
    images = get_images_for_style(style_id)
    if not images:
        print(f"  WARNING: no images found for {style_id}")
        return preset

    # How many images the preset currently declares (for examples list)
    current_examples = preset.get("examples", [])
    
    # Pick cover/representative as first image
    cover_file = images[0]
    cover_path = make_relative_path(style_id, cover_file)

    # Build examples list: use all images found (up to however many existed)
    example_paths = [make_relative_path(style_id, f) for f in images]

    # Detect if cover was mangled (contains '?')
    old_cover = preset.get("cover", "")
    was_mangled = "?" in old_cover or old_cover == "" or not os.path.isfile(
        os.path.join(STYLES_ROOT, style_id, os.path.basename(old_cover.replace("\\", "/")))
    )

    if was_mangled:
        print(f"  FIXED {style_id}: {ascii(os.path.basename(old_cover))} -> {ascii(cover_file)}")
        preset["cover"] = cover_path
        preset["representativeImage"] = cover_path
        preset["examples"] = example_paths
    else:
        # Verify examples too
        fixed_examples = []
        changed = False
        for ex in current_examples:
            filename = os.path.basename(ex.replace("\\", "/"))
            if "?" in filename or not os.path.isfile(os.path.join(STYLES_ROOT, style_id, filename)):
                # Try to find matching image by position
                idx = current_examples.index(ex)
                if idx < len(images):
                    new_path = make_relative_path(style_id, images[idx])
                    fixed_examples.append(new_path)
                    changed = True
                    print(f"  FIXED example {style_id}[{idx}]: {ascii(filename)} -> {ascii(images[idx])}")
                else:
                    fixed_examples.append(ex)
            else:
                fixed_examples.append(ex)
        if changed:
            preset["examples"] = fixed_examples

    return preset

def main():
    print(f"Reading catalog from {CATALOG_PATH}")
    with open(CATALOG_PATH, "r", encoding="utf-8") as f:
        catalog = json.load(f)

    presets = catalog.get("presets", [])
    print(f"Processing {len(presets)} presets...")

    fixed_count = 0
    for preset in presets:
        style_id = preset.get("id", "")
        old_cover = preset.get("cover", "")
        fix_preset(preset)
        if preset.get("cover") != old_cover:
            fixed_count += 1

    print(f"\nFixed {fixed_count} presets.")
    
    with open(CATALOG_PATH, "w", encoding="utf-8") as f:
        json.dump(catalog, f, ensure_ascii=False, indent=4)
    print("catalog.json saved.")

if __name__ == "__main__":
    main()
