import { Buffer } from "node:buffer";
import { randomUUID } from "node:crypto";

export type RuntimeAssetRecord = {
  token: string;
  mimeType: string;
  createdAt: number;
  buffer: Buffer;
};

const runtimeAssetMap = new Map<string, RuntimeAssetRecord>();
const MAX_RUNTIME_ASSET_AGE_MS = 1000 * 60 * 30;

function normalizeMimeType(input: string | undefined): string {
  if (typeof input === "string" && input.startsWith("image/")) {
    return input;
  }
  return "image/png";
}

export function cleanupRuntimeAssets(now = Date.now()): void {
  for (const [token, record] of runtimeAssetMap.entries()) {
    if (now - record.createdAt <= MAX_RUNTIME_ASSET_AGE_MS) continue;
    runtimeAssetMap.delete(token);
  }
}

export function createRuntimeAsset(options: { base64: string; mimeType?: string }): RuntimeAssetRecord {
  cleanupRuntimeAssets();

  const mimeType = normalizeMimeType(options.mimeType);
  const token = randomUUID();
  const buffer = Buffer.from(options.base64, "base64");

  const record: RuntimeAssetRecord = {
    token,
    mimeType,
    createdAt: Date.now(),
    buffer,
  };

  runtimeAssetMap.set(token, record);
  return record;
}

export function getRuntimeAsset(token: string): RuntimeAssetRecord | null {
  cleanupRuntimeAssets();
  return runtimeAssetMap.get(token) || null;
}
