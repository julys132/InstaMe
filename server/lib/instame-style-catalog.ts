import * as fs from "node:fs";
import * as path from "node:path";
import type {
  InstaMePromptVariant,
  InstaMeRequestedModel,
  InstaMeStylePreset,
} from "../../shared/instame-style-presets";

type StyleCatalogFile = {
  generatedAt?: string;
  presetCount?: number;
  presets?: InstaMeStylePreset[];
};

const STYLE_CATALOG_PATH = path.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "catalog.json",
);

let catalogCache: StyleCatalogFile | null = null;

function getObjectRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function normalizeRequestedModel(input: unknown): InstaMeRequestedModel | null {
  const record = getObjectRecord(input);
  const provider = typeof record?.provider === "string" ? record.provider : "";
  const model = typeof record?.model === "string" ? record.model : "";
  const displayName = typeof record?.displayName === "string" ? record.displayName : "";

  if (!provider || !model || !displayName) return null;
  if (provider !== "openai" && provider !== "together" && provider !== "reve") return null;

  return { provider, model, displayName };
}

function normalizePromptVariant(input: unknown): InstaMePromptVariant | null {
  const record = getObjectRecord(input);
  const id = typeof record?.id === "string" ? record.id : "";
  const label = typeof record?.label === "string" ? record.label : "";
  const prompt = typeof record?.prompt === "string" ? record.prompt : "";
  const requestedModelsRaw = Array.isArray(record?.requestedModels) ? record.requestedModels : [];
  const requestedModels = requestedModelsRaw
    .map((entry) => normalizeRequestedModel(entry))
    .filter((entry): entry is InstaMeRequestedModel => Boolean(entry));

  if (!id || !label || !prompt) return null;
  return {
    id,
    label,
    prompt,
    requestedModels,
  };
}

function normalizePreset(input: unknown): InstaMeStylePreset | null {
  const record = getObjectRecord(input);
  const id = typeof record?.id === "string" ? record.id : "";
  const label = typeof record?.label === "string" ? record.label : "";
  const subtitle = typeof record?.subtitle === "string" ? record.subtitle : "";
  const promptHint = typeof record?.promptHint === "string" ? record.promptHint : "";
  const representativeImage =
    typeof record?.representativeImage === "string" ? record.representativeImage : "";
  const cover = typeof record?.cover === "string" ? record.cover : undefined;
  const promptFile = typeof record?.promptFile === "string" ? record.promptFile : undefined;
  const examples = Array.isArray(record?.examples)
    ? record.examples.filter((entry): entry is string => typeof entry === "string")
    : [];
  const promptVariants = Array.isArray(record?.promptVariants)
    ? record.promptVariants
        .map((entry) => normalizePromptVariant(entry))
        .filter((entry): entry is InstaMePromptVariant => Boolean(entry))
    : [];
  const promptOnlyAfterFirstUse = record?.promptOnlyAfterFirstUse === true;

  if (!id || !label || !subtitle || !promptHint || !representativeImage || examples.length === 0) {
    return null;
  }

  return {
    id,
    label,
    subtitle,
    promptHint,
    cover,
    representativeImage,
    examples,
    promptFile,
    promptVariants,
    promptOnlyAfterFirstUse,
  };
}

export function loadInstaMeStyleCatalog(): StyleCatalogFile | null {
  if (catalogCache) return catalogCache;
  if (!fs.existsSync(STYLE_CATALOG_PATH)) return null;

  try {
    const raw = fs.readFileSync(STYLE_CATALOG_PATH, "utf-8");
    const parsed = JSON.parse(raw) as StyleCatalogFile;
    const presets = Array.isArray(parsed.presets)
      ? parsed.presets
          .map((entry) => normalizePreset(entry))
          .filter((entry): entry is InstaMeStylePreset => Boolean(entry))
      : [];
    catalogCache = {
      generatedAt: parsed.generatedAt,
      presetCount: parsed.presetCount,
      presets,
    };
    return catalogCache;
  } catch (error) {
    console.error("Failed to load InstaMe style catalog:", error);
    return null;
  }
}

export function getInstaMeStylePresetsFromCatalog(): InstaMeStylePreset[] {
  return loadInstaMeStyleCatalog()?.presets || [];
}

export function findCatalogStylePresetById(id: string): InstaMeStylePreset | undefined {
  return getInstaMeStylePresetsFromCatalog().find((preset) => preset.id === id);
}

export function getCatalogAssetAbsolutePath(styleId: string, filename: string): string | null {
  const slug = styleId.trim();
  const safeFilename = path.basename(filename);
  if (!slug || !safeFilename) return null;

  const absolutePath = path.resolve(
    process.cwd(),
    "assets",
    "instame-style-presets",
    "styles",
    slug,
    safeFilename,
  );

  const stylesRoot = path.resolve(process.cwd(), "assets", "instame-style-presets", "styles");
  if (!absolutePath.startsWith(stylesRoot)) {
    return null;
  }

  if (!fs.existsSync(absolutePath)) {
    return null;
  }

  return absolutePath;
}

export function getCatalogRelativeAssetParts(relativePath: string): { styleId: string; filename: string } | null {
  const normalized = relativePath.replace(/\\/g, "/");
  const marker = "assets/instame-style-presets/styles/";
  const index = normalized.indexOf(marker);
  if (index < 0) return null;

  const remainder = normalized.slice(index + marker.length);
  const [styleId, ...rest] = remainder.split("/");
  const filename = rest.join("/");
  if (!styleId || !filename) return null;

  return {
    styleId,
    filename,
  };
}

export function choosePromptVariant(
  preset: InstaMeStylePreset | undefined,
  usageCount: number,
): InstaMePromptVariant | null {
  const variants = preset?.promptVariants || [];
  if (variants.length === 0) return null;

  const index = usageCount <= 0 ? 0 : usageCount % variants.length;
  return variants[index] || variants[0] || null;
}

export function chooseRequestedModel(
  variant: InstaMePromptVariant | null,
  mode: "preview" | "high_res",
): InstaMeRequestedModel | null {
  const models = variant?.requestedModels || [];
  if (models.length === 0) return null;
  if (models.length === 1) return models[0] || null;

  const rankModel = (model: InstaMeRequestedModel): number => {
    const normalized = `${model.provider}:${model.model}:${model.displayName}`.toLowerCase();

    if (mode === "high_res") {
      if (normalized.includes("flux.2-max")) return 100;
      if (normalized.includes("gemini-3-pro-image")) return 95;
      if (normalized.includes("gpt-image-1.5")) return 90;
      if (normalized.includes("qwen-image")) return 85;
      if (normalized.includes("flux.2-pro")) return 80;
      if (normalized.includes("reve-v1.1")) return 75;
      if (normalized.includes("flash-image-3.1") || normalized.includes("flash image 3.1")) return 72;
      if (normalized.includes("flash-image-2.5")) return 70;
      if (normalized.includes("gpt-image-1")) return 60;
      return 50;
    }

    if (normalized.includes("flash-image-3.1") || normalized.includes("flash image 3.1")) return 100;
    if (normalized.includes("flash-image-2.5")) return 98;
    if (normalized.includes("qwen-image")) return 95;
    if (normalized.includes("flux.2-pro")) return 90;
    if (normalized.includes("gpt-image-1")) return 85;
    if (normalized.includes("gpt-image-1.5")) return 80;
    if (normalized.includes("reve-v1.1")) return 75;
    if (normalized.includes("gemini-3-pro-image")) return 70;
    if (normalized.includes("flux.2-max")) return 65;
    return 50;
  };

  return models
    .slice()
    .sort((left, right) => rankModel(right) - rankModel(left))[0] || models[0] || null;
}
