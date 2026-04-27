import * as fs from "node:fs/promises";
import * as path from "node:path";
import { uploadStyleAssetObject } from "../server/lib/railway-bucket";

const ROOT = process.cwd();
const STYLE_ASSET_ROOT = path.resolve(ROOT, "assets", "instame-style-presets", "styles");
const DEFAULT_CACHE_CONTROL = "public, max-age=31536000, immutable";

function getMimeType(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";
  if (extension === ".gif") return "image/gif";
  if (extension === ".txt") return "text/plain; charset=utf-8";
  return "image/jpeg";
}

async function listFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name);
      if (entry.isDirectory()) {
        return listFiles(fullPath);
      }
      return [fullPath];
    }),
  );
  return files.flat();
}

async function main() {
  const files = await listFiles(STYLE_ASSET_ROOT);
  if (files.length === 0) {
    throw new Error(`No style asset files found under ${STYLE_ASSET_ROOT}`);
  }

  console.log(`Uploading ${files.length} InstaMe style asset files to the configured bucket...`);

  let uploaded = 0;
  for (const fullPath of files) {
    const relativePath = path.relative(ROOT, fullPath).replace(/\\/g, "/");
    const body = await fs.readFile(fullPath);
    await uploadStyleAssetObject({
      relativePath,
      body,
      contentType: getMimeType(fullPath),
      cacheControl: DEFAULT_CACHE_CONTROL,
    });
    uploaded += 1;
    if (uploaded % 25 === 0 || uploaded === files.length) {
      console.log(`Uploaded ${uploaded}/${files.length}`);
    }
  }

  console.log("Style asset upload complete.");
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
