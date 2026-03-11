import * as fs from "node:fs";
import * as path from "node:path";
import { randomUUID } from "node:crypto";

export type RuntimeAssetRecord = {
  token: string;
  absolutePath: string;
  mimeType: string;
  createdAt: number;
};

const RUNTIME_ASSETS_ROOT = path.resolve(process.cwd(), ".runtime", "instame-assets");
const runtimeAssetMap = new Map<string, RuntimeAssetRecord>();
const MAX_RUNTIME_ASSET_AGE_MS = 1000 * 60 * 30;

function normalizeMimeType(input: string | undefined): string {
  if (typeof input === "string" && input.startsWith("image/")) {
    return input;
  }
  return "image/png";
}

function extensionFromMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function ensureRuntimeAssetsRoot(): void {
  if (!fs.existsSync(RUNTIME_ASSETS_ROOT)) {
    fs.mkdirSync(RUNTIME_ASSETS_ROOT, { recursive: true });
  }
}

export function cleanupRuntimeAssets(now = Date.now()): void {
  for (const [token, record] of runtimeAssetMap.entries()) {
    if (now - record.createdAt <= MAX_RUNTIME_ASSET_AGE_MS) continue;

    runtimeAssetMap.delete(token);
    try {
      if (fs.existsSync(record.absolutePath)) {
        fs.unlinkSync(record.absolutePath);
      }
    } catch {
      // Best-effort cleanup only.
    }
  }
}

export function createRuntimeAsset(options: { base64: string; mimeType?: string }): RuntimeAssetRecord {
  cleanupRuntimeAssets();
  ensureRuntimeAssetsRoot();

  const mimeType = normalizeMimeType(options.mimeType);
  const token = randomUUID();
  const extension = extensionFromMimeType(mimeType);
  const absolutePath = path.join(RUNTIME_ASSETS_ROOT, `${token}.${extension}`);

  fs.writeFileSync(absolutePath, Buffer.from(options.base64, "base64"));

  const record: RuntimeAssetRecord = {
    token,
    absolutePath,
    mimeType,
    createdAt: Date.now(),
  };
  runtimeAssetMap.set(token, record);
  return record;
}

export function getRuntimeAsset(token: string): RuntimeAssetRecord | null {
  cleanupRuntimeAssets();
  return runtimeAssetMap.get(token) || null;
}
