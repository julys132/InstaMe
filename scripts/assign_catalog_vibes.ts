/**
 * Assigns an explicit `vibeId` (style category) to every preset in
 * assets/instame-style-presets/catalog.json so the client no longer relies on
 * fuzzy keyword matching. Run with: npx tsx scripts/assign_catalog_vibes.ts
 */
import * as fs from "fs";
import * as path from "path";

const CATALOG_PATH = path.resolve(__dirname, "..", "assets", "instame-style-presets", "catalog.json");

type CatalogPreset = {
  id: string;
  label?: string;
  subtitle?: string;
  category?: string;
  promptHint?: string;
  examples?: string[];
  promptVariants?: Array<{ id: string; label?: string; prompt?: string }>;
  vibeId?: string;
  [key: string]: unknown;
};

type Rule = { vibeId: string; keywords: string[] };

// Priority-ordered: the FIRST rule that matches wins. More specific scenes
// (mirror selfie, car, café…) come before broad ones (street, editorial).
const RULES: Rule[] = [
  {
    vibeId: "mirror_selfies",
    keywords: [
      "mirror selfie", "selfie mirror", "fitting room", "bathroom selfie", "taking selfie",
      "selfie", "зеркал", "селфи", "примерочн",
    ],
  },
  {
    vibeId: "car_luxe",
    keywords: [
      "car ", " car", "bmw", "mercedes", "convertible", "scooter", "porsche", "vehicle", "driving",
      "машин", "автомобил", "авто", "руле", "кабриолет",
    ],
  },
  {
    vibeId: "cafe_lifestyle",
    keywords: [
      "cafe", "café", "coffee", "breakfast", "restaurant", "wine", "popcorn", "cinema", "brunch", "croissant",
      "кафе", "кофе", "завтрак", "ресторан", "вино", "бокал",
    ],
  },
  {
    vibeId: "travel_escape",
    keywords: [
      "airport", "beach", "mountain", "cliff", "resort", "hotel", "pool", "travel", "vacation",
      "rocks", "sea", "ocean", "embankment", "bridge", "terrace", "balcony", "rooftop", "roof",
      "аэропорт", "пляж", "гор", "море", "океан", "отел", "террас", "балкон", "набережн", "крыш",
    ],
  },
  {
    vibeId: "cozy_home",
    keywords: [
      "bed", "sofa", "couch", "cozy", "curlers", "bath", "pajama", "home", "bedroom", "lying on fabric",
      "кроват", "диван", "ванн", "дом", "спальн", "пижам", "бигуди", "уютн",
    ],
  },
  {
    vibeId: "flash_night",
    keywords: [
      "flash", "night", "noir", "dark", "neon", "corridor",
      "вспышк", "ночь", "ночн", "темн", "неон",
    ],
  },
  {
    vibeId: "soft_romantic",
    keywords: [
      "tulip", "rose", "flower", "lilac", "ranunculus", "hibiscus", "magnolia", "bouquet", "romantic",
      "dreamy", "milk bath", "blowing kiss", "lavender",
      "тюльпан", "роз", "цвет", "букет", "сирен", "магноли", "романтич", "нежн",
    ],
  },
  {
    vibeId: "life_moments",
    keywords: [
      "mom", "kids", "son", "daughter", "family", "dog", "horse", "lion", "pet", "child",
      "мама", "дет", "сын", "дочь", "собак", "лошад", "семь",
    ],
  },
  {
    vibeId: "old_money_luxe",
    keywords: [
      "luxury", "luxe", "old money", "fur coat", "jewelry", "elegant", "mall", "suit", "pearl", "silk",
      "люкс", "роскош", "элегант", "шуб", "украшен", "жемчуг", "костюм",
    ],
  },
  {
    vibeId: "street_luxe",
    keywords: [
      "street", "sidewalk", "crosswalk", "walk", "urban", "denim", "leather", "steps", "wall",
      "escalator", "doorway", "city", "bench", "park", "crouching", "standing",
      "улиц", "город", "тротуар", "ступен", "стен", "джинс", "кож", "переход", "скамейк",
    ],
  },
  {
    vibeId: "clean_glow",
    keywords: [
      "glow", "skin", "beauty", "clean", "natural glam", "close up face", "face closeup", "wet profile",
      "сияни", "кож", "естествен",
    ],
  },
  {
    vibeId: "event_glam",
    keywords: [
      "glam", "party", "event", "red dress", "gown", "evening",
      "вечерн", "плать", "праздн",
    ],
  },
  {
    vibeId: "signature_editorial",
    keywords: [
      "editorial", "studio", "cinematic", "chic", "minimal", "black and white", "noir", "posing",
      "эдиториал", "студи", "черно бел",
    ],
  },
];

const DEFAULT_VIBE = "signature_editorial";

// Manual overrides for presets whose metadata keywords are misleading.
const OVERRIDES: Record<string, string> = {
  milk_bath_portrait: "soft_romantic",
  fashion_portrait_lacquer: "signature_editorial",
  fashion_portrait_studio: "signature_editorial",
  studio_portrait_soft: "signature_editorial",
  posing_studio_young: "signature_editorial",
  natural_glam_portrait: "clean_glow",
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ");
}

function buildSearchText(preset: CatalogPreset, includePrompts: boolean): string {
  const parts = [preset.id, preset.label, preset.subtitle, preset.promptHint].filter(Boolean) as string[];
  if (includePrompts) {
    for (const variant of preset.promptVariants || []) {
      if (variant.prompt) parts.push(variant.prompt.slice(0, 600));
    }
  }
  return normalize(parts.join(" \n "));
}

function matchRules(text: string): string | null {
  for (const rule of RULES) {
    if (rule.keywords.some((keyword) => text.includes(normalize(keyword)))) {
      return rule.vibeId;
    }
  }
  return null;
}

function assignVibe(preset: CatalogPreset): string {
  const category = (preset.category || "").toLowerCase();
  if (category === "men" || preset.id.startsWith("men_")) return "men_editorial";
  if (category === "couple" || preset.id.startsWith("couple")) return "couple_shoots";
  if (OVERRIDES[preset.id]) return OVERRIDES[preset.id];

  // Pass 1: metadata only (most precise signal).
  const metaMatch = matchRules(buildSearchText(preset, false));
  if (metaMatch) return metaMatch;

  // Pass 2: include prompt text (covers Russian-labelled presets).
  const promptMatch = matchRules(buildSearchText(preset, true));
  if (promptMatch) return promptMatch;

  return DEFAULT_VIBE;
}

function main(): void {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
  const presets: CatalogPreset[] = catalog.presets || [];

  const distribution: Record<string, number> = {};
  for (const preset of presets) {
    const vibeId = assignVibe(preset);
    preset.vibeId = vibeId;
    distribution[vibeId] = (distribution[vibeId] || 0) + 1;
  }

  catalog.generatedAt = new Date().toISOString();
  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 4), "utf8");

  console.log(`Assigned vibeId for ${presets.length} presets.`);
  console.log("Distribution:");
  for (const [vibeId, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${vibeId}: ${count}`);
  }
}

main();
