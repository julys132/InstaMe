# InstaMe Style Reference Library

This folder stores the curated visual anchor set used by `POST /api/instame/transform`.

## Structure

- `images/`:
  - Imported style screenshots, renamed to stable IDs (`style_ref_001.png`, etc.).
- `library.json`:
  - Multi-label metadata for each image:
    - `styleTags`
    - `vibeTags`
    - `aestheticTags`
    - `genderTags`
    - `promptHints`
    - lighting/palette metrics
  - Style profiles (quiet luxury, modern editorial, cinematic, etc.).

## Rebuild / Refresh

Run this command when you add new source screenshots:

```powershell
python scripts\import_style_references.py --source "C:\Users\stiul\OneDrive\Pictures\Screenshots\Styles"
```

This command:

1. Copies all source images into `assets/style-references/images`.
2. Generates/updates `assets/style-references/library.json`.

The backend auto-loads this file at runtime and injects selected style references into Gemini prompts.
