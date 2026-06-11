/**
 * Generates ~480px-wide thumbnails for every catalog example image and records them
 * in catalog.json as `examplesThumbs` (parallel array to `examples`) plus `coverThumb`.
 * Thumbnails live next to the originals as `__thumb_<name>.jpg` so the existing
 * /api/instame/style-asset/:styleId/:filename endpoint serves them with zero changes.
 *
 * Run: npx tsx scripts/generate_catalog_thumbnails.ts
 */
import * as fs from "node:fs";
import * as path from "node:path";
import sharp from "sharp";

const REPO_ROOT = path.resolve(__dirname, "..");
const CATALOG_PATH = path.join(REPO_ROOT, "assets", "instame-style-presets", "catalog.json");

const THUMB_WIDTH = 480;
const THUMB_PREFIX = "__thumb_";

type CatalogPreset = {
  id: string;
  cover?: string;
  representativeImage?: string;
  examples?: string[];
  examplesThumbs?: string[];
  coverThumb?: string;
  [key: string]: unknown;
};

type Catalog = {
  generatedAt?: string;
  presets?: CatalogPreset[];
  [key: string]: unknown;
};

function thumbNameFor(filename: string): string {
  const base = path.basename(filename, path.extname(filename));
  return `${THUMB_PREFIX}${base}.jpg`;
}

async function ensureThumb(absImagePath: string): Promise<string | null> {
  const dir = path.dirname(absImagePath);
  const thumbName = thumbNameFor(absImagePath);
  const thumbAbs = path.join(dir, thumbName);

  if (!fs.existsSync(absImagePath)) return null;

  if (!fs.existsSync(thumbAbs)) {
    try {
      await sharp(absImagePath)
        .rotate()
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: 72, mozjpeg: true })
        .toFile(thumbAbs);
    } catch (error) {
      console.warn(`  ! Failed thumb for ${absImagePath}: ${(error as Error).message}`);
      return null;
    }
  }

  return thumbName;
}

async function main() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf-8")) as Catalog;
  const presets = catalog.presets || [];

  let generated = 0;
  let presetsTouched = 0;

  for (const preset of presets) {
    const examples = Array.isArray(preset.examples) ? preset.examples : [];
    if (examples.length === 0) continue;

    const thumbs: string[] = [];
    let changed = false;

    for (const rel of examples) {
      // Never thumbnail the portrait badge or already-thumbed files
      const baseName = path.basename(rel);
      if (baseName.startsWith(THUMB_PREFIX)) {
        thumbs.push(rel);
        continue;
      }

      const abs = path.join(REPO_ROOT, rel.replace(/\//g, path.sep));
      const thumbName = await ensureThumb(abs);
      if (thumbName) {
        const relDir = rel.slice(0, rel.lastIndexOf("/"));
        thumbs.push(`${relDir}/${thumbName}`);
        generated++;
        changed = true;
      } else {
        thumbs.push(rel); // fallback to original
      }
    }

    preset.examplesThumbs = thumbs;

    // coverThumb mirrors cover (or representativeImage)
    const coverRel = preset.cover || preset.representativeImage;
    if (coverRel) {
      const idx = examples.indexOf(coverRel);
      preset.coverThumb = idx >= 0 ? thumbs[idx] : thumbs[0];
      changed = true;
    }

    if (changed) presetsTouched++;
  }

  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 4), "utf-8");

  console.log(`Thumbnails ensured: ${generated}`);
  console.log(`Presets updated: ${presetsTouched}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
