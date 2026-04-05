import { Buffer } from "node:buffer";
import OpenAI, { toFile } from "openai";

export type RuntimeImageInput = {
  base64: string;
  mimeType?: string;
  filename?: string;
};

type OpenAiImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";
type ReveGenerationMode = "preview" | "high_res";
type TogetherResolution = { width: number; height: number };

const GOOGLE_TOGETHER_SUPPORTED_SIZES: TogetherResolution[] = [
  { width: 768, height: 1376 },
  { width: 1376, height: 768 },
  { width: 1536, height: 2752 },
  { width: 2752, height: 1536 },
  { width: 3072, height: 5504 },
  { width: 5504, height: 3072 },
  { width: 1548, height: 672 },
  { width: 1584, height: 672 },
  { width: 3168, height: 1344 },
  { width: 6336, height: 2688 },
];

function normalizeMimeType(input: string | undefined): string {
  if (typeof input === "string" && input.startsWith("image/")) {
    return input;
  }
  return "image/png";
}

function getOpenAiClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required for OpenAI image generation.");
  }

  return new OpenAI({
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

function resolveOpenAiImageModelAlias(model: string): string {
  const normalized = model.trim().toLowerCase();
  const latestHighFidelityWithVersion = "chatgpt-image-latest-high-fidelity (20251216)";
  if (!normalized) return model;

  if (
    normalized === "gpt-image-1.5" ||
    normalized === "gpt-image-1" ||
    normalized === "chatgpt-image-latest-high-fidelity" ||
    normalized === "chatgpt image latest high fidelity" ||
    normalized === latestHighFidelityWithVersion
  ) {
    return "chatgpt-image-latest-high-fidelity";
  }

  return model;
}

function getTogetherApiKey(): string {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY is required for Together image generation.");
  }
  return apiKey;
}

function getReveApiKey(): string {
  const apiKey = process.env.REVE_API_KEY;
  if (!apiKey) {
    throw new Error("REVE_API_KEY is required for Reve image generation.");
  }
  return apiKey;
}

function getReveBaseUrl(): string {
  return process.env.REVE_API_BASE_URL || "https://api.reve.com";
}

function resolveTogetherModelAlias(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (!normalized) return model;

  if (
    normalized === "gemini-3.1-flash-image-preview" ||
    normalized === "gemini 3.1 flash image preview" ||
    normalized === "gemini-2.5-flash-image" ||
    normalized === "google/flash-image-2.5" ||
    normalized === "google/flash-image-3.1"
  ) {
    return normalized === "google/flash-image-2.5" ? "google/flash-image-2.5" : "google/flash-image-3.1";
  }

  if (
    normalized === "gemini-3-pro-image" ||
    normalized === "gemini 3 pro image" ||
    normalized === "google/gemini-3-pro-image"
  ) {
    return "google/gemini-3-pro-image";
  }

  return model;
}

function isGoogleTogetherModel(model: string): boolean {
  return model.trim().toLowerCase().startsWith("google/");
}

function getImageOrientation(width: number, height: number): "portrait" | "landscape" | "square" {
  if (width === height) return "square";
  return height > width ? "portrait" : "landscape";
}

function resolveGoogleTogetherSize(options: {
  width: number;
  height: number;
  sourceWidth?: number;
  sourceHeight?: number;
}): TogetherResolution {
  const requestedWidth = Math.max(1, Math.round(options.width));
  const requestedHeight = Math.max(1, Math.round(options.height));
  const sourceWidth = Number.isFinite(options.sourceWidth) ? Math.round(options.sourceWidth as number) : 0;
  const sourceHeight = Number.isFinite(options.sourceHeight) ? Math.round(options.sourceHeight as number) : 0;
  const preferredOrientation = sourceWidth > 0 && sourceHeight > 0
    ? getImageOrientation(sourceWidth, sourceHeight)
    : getImageOrientation(requestedWidth, requestedHeight);
  const normalizedOrientation = preferredOrientation === "square" ? "portrait" : preferredOrientation;
  const requestedRatio = requestedWidth / requestedHeight;
  const requestedArea = requestedWidth * requestedHeight;

  const candidates = GOOGLE_TOGETHER_SUPPORTED_SIZES.filter((size) => {
    const orientation = getImageOrientation(size.width, size.height);
    return normalizedOrientation === "portrait" ? orientation === "portrait" : orientation === "landscape";
  });

  const pool = candidates.length > 0 ? candidates : GOOGLE_TOGETHER_SUPPORTED_SIZES;
  const ranked = pool
    .map((size) => {
      const ratio = size.width / size.height;
      return {
        size,
        score: Math.abs(Math.log(ratio / requestedRatio)) + Math.abs(Math.log((size.width * size.height) / requestedArea)),
      };
    })
    .sort((left, right) => left.score - right.score);

  return ranked[0]?.size || GOOGLE_TOGETHER_SUPPORTED_SIZES[0]!;
}

function normalizeReveModelEnvKey(model: string): string {
  return model
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase();
}

function readFirstEnv(keys: string[]): string | null {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function resolveReveVersion(options: {
  model: string;
  operation: "create" | "edit";
  mode: ReveGenerationMode;
}): string {
  const alias = normalizeReveModelEnvKey(options.model);
  const qualityKey = options.mode === "high_res" ? "HIGH_RES" : "PREVIEW";
  const operationKey = options.operation.toUpperCase();
  const defaultVersion =
    options.operation === "edit"
      ? options.mode === "high_res"
        ? "latest"
        : "latest-fast"
      : "latest";

  return (
    readFirstEnv([
      `REVE_${operationKey}_VERSION_${alias}_${qualityKey}`,
      `REVE_${operationKey}_VERSION_${alias}`,
      `REVE_${operationKey}_VERSION_${qualityKey}`,
      `REVE_${operationKey}_VERSION`,
      `REVE_VERSION_${alias}_${qualityKey}`,
      `REVE_VERSION_${alias}`,
      "REVE_VERSION",
    ]) || defaultVersion
  );
}

function sanitizeBase64Image(input: string): string {
  return input.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "").trim();
}

function extractReveImageBase64(payload: any): string | null {
  const directCandidates = [
    payload?.image,
    payload?.b64_json,
    payload?.data?.image,
    payload?.data?.b64_json,
  ];
  for (const candidate of directCandidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return sanitizeBase64Image(candidate);
    }
  }

  const arrayCandidates = [
    Array.isArray(payload?.data) ? payload.data : [],
    Array.isArray(payload?.images) ? payload.images : [],
  ];

  for (const items of arrayCandidates) {
    for (const item of items) {
      if (typeof item?.image === "string" && item.image.trim()) {
        return sanitizeBase64Image(item.image);
      }
      if (typeof item?.b64_json === "string" && item.b64_json.trim()) {
        return sanitizeBase64Image(item.b64_json);
      }
    }
  }

  return null;
}

async function toOpenAiUpload(input: RuntimeImageInput, fallbackName: string) {
  const mimeType = normalizeMimeType(input.mimeType);
  const extension = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
  const filename = input.filename || `${fallbackName}.${extension}`;
  return toFile(Buffer.from(input.base64, "base64"), filename, { type: mimeType });
}

export async function generateOpenAiImage(options: {
  model: string;
  prompt: string;
  images?: RuntimeImageInput[];
  size?: OpenAiImageSize;
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<string> {
  const client = getOpenAiClient();
  const resolvedModel = resolveOpenAiImageModelAlias(options.model);
  const size = options.size || "1024x1024";
  const quality = options.quality || "auto";
  const inputImages = Array.isArray(options.images) ? options.images : [];

  if (inputImages.length > 0) {
    const files = await Promise.all(
      inputImages.map((image, index) => toOpenAiUpload(image, `instame-edit-${index + 1}`)),
    );

    const response = await client.images.edit({
      model: resolvedModel,
      prompt: options.prompt,
      image: files as any,
      size,
      quality,
    } as any);

    const base64 = response.data?.[0]?.b64_json;
    if (!base64) {
      throw new Error("OpenAI image edit returned no image data.");
    }
    return base64;
  }

  const response = await client.images.generate({
    model: resolvedModel,
    prompt: options.prompt,
    size,
    quality,
  } as any);

  const base64 = response.data?.[0]?.b64_json;
  if (!base64) {
    throw new Error("OpenAI image generation returned no image data.");
  }
  return base64;
}

export async function generateTogetherImage(options: {
  model: string;
  prompt: string;
  referenceImages?: string[];
  imageUrl?: string;
  width: number;
  height: number;
  sourceWidth?: number;
  sourceHeight?: number;
}): Promise<string> {
  const apiKey = getTogetherApiKey();
  const baseUrl = process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";
  const resolvedModel = resolveTogetherModelAlias(options.model);
  const resolvedSize = isGoogleTogetherModel(resolvedModel)
    ? resolveGoogleTogetherSize({
        width: options.width,
        height: options.height,
        sourceWidth: options.sourceWidth,
        sourceHeight: options.sourceHeight,
      })
    : { width: options.width, height: options.height };
  const payload: Record<string, unknown> = {
    model: resolvedModel,
    prompt: options.prompt,
    width: resolvedSize.width,
    height: resolvedSize.height,
    response_format: "b64_json",
    output_format: "png",
  };

  if (!resolvedModel.toLowerCase().startsWith("google/")) {
    payload.n = 1;
  }

  if (Array.isArray(options.referenceImages) && options.referenceImages.length > 0) {
    payload.reference_images = options.referenceImages;
  }
  if (typeof options.imageUrl === "string" && options.imageUrl.trim()) {
    payload.image_url = options.imageUrl.trim();
  }

  const response = await fetch(`${baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const parsedError =
      parsed && typeof parsed.error === "object" && parsed.error !== null
        ? (parsed.error as Record<string, unknown>)
        : null;
    const remoteMessage =
      typeof parsedError?.message === "string"
        ? parsedError.message
        : typeof parsed?.message === "string"
          ? parsed.message
          : "";
    const message = remoteMessage || responseText || `Together API returned status ${response.status}`;
    const payloadKeys = Object.keys(payload).sort().join(", ");
    throw new Error(
      `Together API error (${response.status}) for model ${resolvedModel} with payload keys [${payloadKeys}]: ${message}`,
    );
  }

  const data = Array.isArray(parsed?.data) ? parsed.data : [];
  const base64 = data[0]?.b64_json;
  if (!base64) {
    throw new Error(`Together image generation returned no image data for model ${resolvedModel}.`);
  }
  return base64;
}

export async function generateReveImage(options: {
  model: string;
  prompt: string;
  referenceImage?: RuntimeImageInput;
  aspectRatio?: "16:9" | "9:16" | "3:2" | "2:3" | "4:3" | "3:4" | "1:1" | "auto";
  mode?: ReveGenerationMode;
  testTimeScaling?: number;
  postprocessing?: Array<Record<string, unknown>>;
}): Promise<string> {
  const apiKey = getReveApiKey();
  const baseUrl = getReveBaseUrl();
  const mode = options.mode || "preview";
  const isEdit = Boolean(options.referenceImage);
  const endpoint = isEdit ? "/v1/image/edit" : "/v1/image/create";
  const version = resolveReveVersion({
    model: options.model,
    operation: isEdit ? "edit" : "create",
    mode,
  });

  const payload: Record<string, unknown> = {
    version,
  };

  if (options.aspectRatio && options.aspectRatio !== "auto") {
    payload.aspect_ratio = options.aspectRatio;
  }

  if (
    typeof options.testTimeScaling === "number" &&
    Number.isFinite(options.testTimeScaling) &&
    options.testTimeScaling >= 1 &&
    options.testTimeScaling <= 15
  ) {
    payload.test_time_scaling = Math.round(options.testTimeScaling);
  }

  if (Array.isArray(options.postprocessing) && options.postprocessing.length > 0) {
    payload.postprocessing = options.postprocessing;
  }

  if (isEdit) {
    payload.edit_instruction = options.prompt;
    payload.reference_image = sanitizeBase64Image(options.referenceImage!.base64);
  } else {
    payload.prompt = options.prompt;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(payload),
  });

  const responseText = await response.text();
  let parsed: any = null;
  try {
    parsed = responseText ? JSON.parse(responseText) : null;
  } catch {
    parsed = null;
  }

  if (!response.ok) {
    const message =
      parsed?.message ||
      parsed?.error ||
      parsed?.error_code ||
      responseText ||
      `Reve API returned status ${response.status}`;
    throw new Error(message);
  }

  const base64 = extractReveImageBase64(parsed);
  if (!base64) {
    throw new Error("Reve image generation returned no image data.");
  }
  return base64;
}
