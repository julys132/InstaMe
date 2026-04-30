import * as fs from "node:fs";
import * as path from "node:path";
import type {
  InstaMePromptVariant,
  InstaMeRequestedModel,
  InstaMeStyleCategory,
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
const STYLE_PROMPTS_ROOT = path.resolve(
  process.cwd(),
  "assets",
  "instame-style-presets",
  "styles",
);

let catalogCache: StyleCatalogFile | null = null;
const promptFileTextCache = new Map<string, string | null>();

function isLikelyCorruptedPrompt(prompt: string): boolean {
  const normalized = prompt.trim();
  if (!normalized) return true;
  if (normalized.includes("\uFFFD") || normalized.includes("ï¿½")) return true;

  const questionMarkCount = (normalized.match(/\?/g) || []).length;
  const cyrillicCount = (normalized.match(/[А-Яа-яЁё]/g) || []).length;

  if (questionMarkCount >= 12 && cyrillicCount === 0) {
    return true;
  }

  return questionMarkCount >= 24 && questionMarkCount / Math.max(normalized.length, 1) > 0.08;
}

function readPromptFileText(promptFile: string | undefined): string | null {
  const normalizedPath = (promptFile || "").trim().replace(/\\/g, "/");
  if (!normalizedPath) return null;

  const cached = promptFileTextCache.get(normalizedPath);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const absolutePath = path.resolve(process.cwd(), normalizedPath);
    const relativeToRoot = path.relative(STYLE_PROMPTS_ROOT, absolutePath);
    if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
      promptFileTextCache.set(normalizedPath, null);
      return null;
    }

    if (!fs.existsSync(absolutePath)) {
      promptFileTextCache.set(normalizedPath, null);
      return null;
    }

    const promptText = fs.readFileSync(absolutePath, "utf-8").trim();
    const resolved = promptText || null;
    promptFileTextCache.set(normalizedPath, resolved);
    return resolved;
  } catch {
    promptFileTextCache.set(normalizedPath, null);
    return null;
  }
}

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
  const promptFileFallbackText = readPromptFileText(promptFile);
  const examples = Array.isArray(record?.examples)
    ? record.examples.filter((entry): entry is string => typeof entry === "string")
    : [];
  const promptVariants = Array.isArray(record?.promptVariants)
    ? record.promptVariants
        .map((entry) => normalizePromptVariant(entry))
        .filter((entry): entry is InstaMePromptVariant => Boolean(entry))
        .map((entry) => {
          if (!promptFileFallbackText || !isLikelyCorruptedPrompt(entry.prompt)) {
            return entry;
          }

          return {
            ...entry,
            prompt: promptFileFallbackText,
          };
        })
    : [];
  const promptOnlyAfterFirstUse = record?.promptOnlyAfterFirstUse === true;
  const rawCategory = typeof record?.category === "string" ? record.category : "";
  const category: InstaMeStyleCategory | undefined =
    rawCategory === "men" ? "men" : rawCategory === "couple" ? "couple" : rawCategory === "women" ? "women" : undefined;

  if (!id || !label || !subtitle || !promptHint || !representativeImage || examples.length === 0) {
    return null;
  }

  return {
    id,
    label,
    subtitle,
    category,
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

export function getCatalogAssetRelativePath(styleId: string, filename: string): string | null {
  const slug = styleId.trim();
  const safeFilename = path.basename(filename);
  if (!slug || !safeFilename) return null;

  return `assets/instame-style-presets/styles/${slug}/${safeFilename}`;
}

export function getCatalogAssetAbsolutePath(styleId: string, filename: string): string | null {
  const relativePath = getCatalogAssetRelativePath(styleId, filename);
  if (!relativePath) return null;

  const absolutePath = path.resolve(process.cwd(), relativePath);

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
  _usageCount: number,
): InstaMePromptVariant | null {
  const variants = preset?.promptVariants || [];
  if (variants.length === 0) return null;

  const preferredVariant = variants.find((variant) => variant.requestedModels.length > 0);
  return preferredVariant || variants[0] || null;
}

export function chooseRequestedModel(
  variant: InstaMePromptVariant | null,
  usageCount: number,
): InstaMeRequestedModel | null {
  const models = variant?.requestedModels || [];
  if (models.length === 0) return null;
  if (models.length === 1) return models[0] || null;
  const index = Math.abs(usageCount) % models.length;
  return models[index] || models[0] || null;
}
