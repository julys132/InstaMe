import { Buffer } from "node:buffer";
import OpenAI, { toFile } from "openai";

export type RuntimeImageInput = {
  base64: string;
  mimeType?: string;
  filename?: string;
};

type OpenAiImageSize = "1024x1024" | "1536x1024" | "1024x1536" | "auto";

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

function getTogetherApiKey(): string {
  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    throw new Error("TOGETHER_API_KEY is required for Together image generation.");
  }
  return apiKey;
}

function resolveTogetherModelAlias(model: string): string {
  const normalized = model.trim().toLowerCase();
  if (normalized === "reve-v1.1" || normalized === "reve v1.1") {
    return process.env.TOGETHER_MODEL_REVE_V1_1 || model;
  }
  return model;
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
  const size = options.size || "1024x1024";
  const quality = options.quality || "auto";
  const inputImages = Array.isArray(options.images) ? options.images : [];

  if (inputImages.length > 0) {
    const files = await Promise.all(
      inputImages.map((image, index) => toOpenAiUpload(image, `instame-edit-${index + 1}`)),
    );

    const response = await client.images.edit({
      model: options.model,
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
    model: options.model,
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
  steps?: number;
}): Promise<string> {
  const apiKey = getTogetherApiKey();
  const baseUrl = process.env.TOGETHER_BASE_URL || "https://api.together.xyz/v1";
  const payload: Record<string, unknown> = {
    model: resolveTogetherModelAlias(options.model),
    prompt: options.prompt,
    width: options.width,
    height: options.height,
    n: 1,
    response_format: "b64_json",
    output_format: "png",
  };

  if (Array.isArray(options.referenceImages) && options.referenceImages.length > 0) {
    payload.reference_images = options.referenceImages;
  }
  if (typeof options.imageUrl === "string" && options.imageUrl.trim()) {
    payload.image_url = options.imageUrl.trim();
  }
  if (typeof options.steps === "number" && Number.isFinite(options.steps)) {
    payload.steps = options.steps;
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
  const parsed = responseText ? JSON.parse(responseText) : null;
  if (!response.ok) {
    const message =
      parsed?.error?.message ||
      parsed?.message ||
      responseText ||
      `Together API returned status ${response.status}`;
    throw new Error(message);
  }

  const data = Array.isArray(parsed?.data) ? parsed.data : [];
  const base64 = data[0]?.b64_json;
  if (!base64) {
    throw new Error("Together image generation returned no image data.");
  }
  return base64;
}
