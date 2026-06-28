/**
 * Instagram Grid Pipeline — Two-Step AI Generation
 *
 * Step 1: Text-AI (Gemini Flash) receives user parameters and a rigid System Prompt.
 *         It outputs a structured JSON shot plan with per-position type, hairstyle,
 *         angle, and a ready-to-use prompt for GPT Image 2.
 *
 * Step 2: GPT Image 2 receives each shot's prompt (+ optional portrait reference)
 *         and renders the final images.
 *
 * Grid extension (Continuity): A second Text-AI call receives the previous grid's
 * context and generates a fresh continuation plan with no repeated scenes/hairstyles,
 * maintaining palette + light + identity coherence.
 */

import {
  INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST,
  INSTAME_GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE,
  INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST,
  INSTAME_GRID_PIPELINE_PLAN_CREDIT_COST,
  INSTAME_GRID_PIPELINE_RENDER_QUALITY_TIER,
} from "../../shared/instame-pricing";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GridPositionType = "COMPLEX" | "SIMPLE" | "MEDIUM";
export type GridToneContrast = "medium" | "high";

export type GridShotPlan = {
  /** 1-based position index */
  position: number;
  type: GridPositionType;
  /** Short label shown in UI (e.g. "Urban crosswalk — movement") */
  label: string;
  /** Hairstyle assigned to this position (only when model appears) */
  hairstyle: string | null;
  /** Camera angle (e.g. "front", "profile", "from behind", "overhead") */
  angle: string | null;
  /**
   * Final GPT Image 2 prompt — complete, self-contained, ready to send directly
   * to the image model without any modification.
   */
  imagePrompt: string;
};

export type GridPlan = {
  /** Total number of images in this grid */
  imageCount: number;
  /** Aesthetic label chosen by the user */
  aesthetic: string;
  /** Dominant palette description (e.g. "muted beige, ivory, warm grey") */
  palette: string;
  /** Light type (e.g. "soft golden hour", "studio strobe", "flash night") */
  lightType: string;
  shots: GridShotPlan[];
};

export type GridPipelineImageCount = 4 | 6 | 9 | 12;

export type GridPipelineUserInputs = {
  /** Number of images: 4, 6, 9, or 12 */
  imageCount: GridPipelineImageCount;
  /** Aesthetic name (e.g. "Old Money Luxe", "Flash Night", "Clean Glow") */
  aesthetic: string;
  /** Dominant palette (e.g. "muted beige, ivory, warm sand") */
  palette: string;
  /** Light type (e.g. "soft golden hour", "cool studio", "flash night") */
  lightType: string;
  /** Tonal contrast between neighbouring grid cells */
  toneContrast?: GridToneContrast;
  /** Extra free-text instructions from the user */
  extraNotes: string;
  /** Whether there is a portrait reference uploaded */
  hasPortraitReference: boolean;
  /**
   * Per-request variation seed. When provided, the prompt builder pre-allocates
   * distinct hairstyles/angles/object-categories per position and shuffles the
   * aesthetic vocabulary so two requests with the same aesthetic/palette still
   * yield visibly different grids. Identity, palette, light and aesthetic stay locked.
   */
  seed?: number;
};

export type GridContinuityContext = {
  aesthetic: string;
  palette: string;
  lightType: string;
  /** Condensed list of scenes already used (to avoid repetition) */
  usedScenes: string[];
  /** Condensed list of hairstyles already used */
  usedHairstyles: string[];
  /** Condensed list of camera angles already used */
  usedAngles: string[];
};

// ─── Aesthetic vocabulary (mirrors constants/gridPipelineAesthetics.ts) ──────
// Kept server-side so the system prompt can inject specific vocabulary without
// requiring the frontend constants to be imported in the server bundle.

const PIPELINE_AESTHETIC_VOCABULARY: Record<string, string[]> = {
  "Dark Academia": [
    "antique library shelves",
    "vintage leather armchairs",
    "candle glow",
    "dark wood paneling",
    "scholarly architecture",
    "moody editorial",
    "aged paper texture",
    "burgundy velvet",
  ],
  "Desert Oasis Luxury": [
    "desert resort",
    "clay and adobe walls",
    "palm tree shadows",
    "rattan and wicker",
    "infinity pool",
    "warm arid luxury",
    "sand dune backdrop",
    "Moroccan tilework",
  ],
  "Luxury European Lifestyle": [
    "Parisian boulevard",
    "Italian piazza",
    "luxury boutique façade",
    "café terrasse",
    "cobblestone street",
    "European architecture",
    "fashion week energy",
    "ornate balcony",
  ],
  "Minimalist Scandinavian Wellness": [
    "clean white minimalist interior",
    "natural birch wood",
    "hygge atmosphere",
    "wellness retreat",
    "organic linen textures",
    "Nordic simplicity",
    "stone and concrete",
    "indoor plants",
  ],
  "Old Money Luxury": [
    "quiet luxury",
    "heritage architectural details",
    "tailored silhouettes",
    "classic European manor",
    "equestrian references",
    "understated wealth",
    "cashmere and silk",
    "private members club",
  ],
  "Amalfi Coast Vibe": [
    "Amalfi cliffside terraces",
    "lemon groves and citrus detail",
    "azure Mediterranean water",
    "whitewashed walls with bougainvillea",
    "ceramic tile patterns",
    "boat deck on turquoise bay",
    "Italian coastal village alleys",
    "sun-soaked summer editorial",
  ],
  "French Riviera Vintage Summer": [
    "Saint-Tropez harbor",
    "vintage yacht deck",
    "retro straw hat and sunglasses",
    "marinière stripe detail",
    "golden sandy beach",
    "pastel parasol shade",
    "French Riviera promenade",
    "60s summer film grain",
  ],
  "Private Jet & Executive": [
    "private jet interior leather seat",
    "aircraft window golden hour",
    "runway tarmac boarding",
    "executive tailored power dressing",
    "luxury aviation lounge",
    "monogram luggage detail",
    "sleek jet staircase",
    "city skyline from altitude",
  ],
  "Monaco Night Drive": [
    "Monaco marina lights",
    "black luxury car",
    "casino entrance",
    "chrome reflections",
    "leather car interior",
    "harbor night walk",
    "flash evening portrait",
    "silk evening outfit",
    "city lights bokeh",
    "polished night drive",
  ],
  "Paris Hotel Morning": [
    "Paris hotel balcony",
    "cream knit lounge set",
    "room service tray",
    "croissant and espresso",
    "marble vanity",
    "French window light",
    "ornate balcony railing",
    "tailored cardigan",
    "hotel corridor",
    "soft morning city view",
  ],
  "Milan Street Editorial": [
    "Milan street architecture",
    "tailored oversized blazer",
    "fashion week crosswalk",
    "luxury boutique facade",
    "structured leather handbag",
    "stone sidewalk",
    "espresso bar corner",
    "sleek sunglasses",
    "editorial city walk",
    "Italian fashion district",
  ],
  "Ski Chalet Luxe": [
    "alpine chalet interior",
    "fireplace lounge",
    "cashmere knit texture",
    "snowy window view",
    "pine wood walls",
    "apres-ski outfit",
    "wool scarf detail",
    "hot drink still-life",
    "mountain lodge sofa",
    "warm amber cabin light",
  ],
  "Gallery Date Muse": [
    "modern art gallery",
    "sculptural pose",
    "minimal black dress",
    "marble floor",
    "framed abstract artwork",
    "museum bench",
    "clean white walls",
    "soft gallery lighting",
    "stone sculpture detail",
    "cultured date mood",
  ],
  "Champagne Brunch Club": [
    "terrace brunch table",
    "champagne glass",
    "fresh flower arrangement",
    "linen table setting",
    "pastry plate",
    "polished daytime outfit",
    "sunlit cafe terrace",
    "delicate glassware",
    "soft greenery",
    "social brunch moment",
  ],
  "Balletcore Soft Glam": [
    "satin ballet ribbon",
    "pearl accessory",
    "wrap cardigan",
    "ballet flats",
    "soft studio backdrop",
    "delicate pose",
    "tulle texture",
    "champagne highlight",
    "romantic closeup",
    "polished soft glam",
  ],
  "Rooftop Golden Hour": [
    "rooftop skyline",
    "golden hour backlight",
    "silk evening dress",
    "city railing",
    "cocktail glass",
    "sunset wind movement",
    "warm skyline bokeh",
    "elevated terrace",
    "black evening outfit",
    "amber city glow",
  ],
  "Bridal Weekend Glow": [
    "bridal hotel suite",
    "white tailored mini dress",
    "pearl earrings",
    "champagne toast",
    "bouquet detail",
    "silver accessories",
    "hotel mirror moment",
    "soft blush flowers",
    "celebration prep",
    "clean bridal weekend",
  ],
  "CEO Airport Uniform": [
    "premium airport lounge",
    "structured blazer",
    "carry-on suitcase",
    "boarding gate walk",
    "espresso cup",
    "brushed steel detail",
    "executive travel outfit",
    "passport holder",
    "quiet luxury commute",
    "airport window light",
  ],
};

function getAestheticVocabularyLine(aesthetic: string): string {
  const vocab = PIPELINE_AESTHETIC_VOCABULARY[aesthetic];
  if (!vocab || vocab.length === 0) return "";
  return `Aesthetic visual vocabulary (use these in imagePrompt fields): ${vocab.join(", ")}.`;
}

// ─── Hairstyle & angle banks (for position enforcement) ──────────────────────

const HAIRSTYLE_BANK = [
  "sleek low bun",
  "high bouncy ponytail",
  "loose beach waves",
  "silk scarf wrap",
  "straight blowout",
  "messy textured updo",
  "half-up half-down",
  "braided crown",
  "slicked-back wet look",
  "voluminous old-money blowout",
];

const ANGLE_BANK = ["front-facing", "side profile", "from behind", "over-the-shoulder", "overhead tilt", "three-quarter turn"];

// Distinct subject categories for OBJECT-only (SIMPLE) cells. Assigning one per
// SIMPLE position (seeded) forces object cells to tell a varied story instead of
// all collapsing into the same flat-lay motif across users.
const OBJECT_SUBJECT_CATEGORIES = [
  "a signature fashion accessory (handbag, watch, sunglasses, or fine jewelry)",
  "a food or drink moment (coffee, cocktail, pastry, or fresh fruit)",
  "an architectural detail (doorway, column, staircase, window, or railing)",
  "an interior surface texture (marble, linen, wood grain, ceramic, or velvet)",
  "an outdoor / nature element (foliage, water, stone, sand, or flowers)",
  "a wardrobe flat-lay (folded garments, shoes, or layered fabrics)",
  "a lifestyle still-life (books, stationery, perfume, candle, or keys)",
];

// ─── Seeded RNG helpers (per-request creative variation) ──────────────────────

/** Deterministic 32-bit PRNG (mulberry32). The same seed yields the same stream. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Returns a shuffled copy of `items` using the provided RNG (Fisher–Yates). */
function shuffleWith<T>(items: T[], rng: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalizeGridToneContrast(value: unknown): GridToneContrast {
  return value === "high" ? "high" : "medium";
}

function getPlanToneContrastDirective(toneContrast: GridToneContrast, palette: string): string {
  if (toneContrast === "high") {
    return `The finished grid must NOT be tonally flat. Staying STRICTLY inside the palette "${palette}", deliberately alternate the tonal value of the cells:
- Some cells must lean to the DARKER / moodier / low-key end of the palette (deep shadow, dramatic light, rich dark tones).
- Other cells must lean to the LIGHTER / airier / high-key end (bright, soft, luminous).
- Neighbouring cells (side by side AND stacked) must differ in overall brightness so the grid reads as a clear light-and-dark rhythm.
In EVERY imagePrompt, explicitly state whether that shot is "bright and airy" or "dark and moody" and name the lighter or darker palette colors accordingly. This varies brightness and mood ONLY - never the color family.`;
  }

  return `The finished grid should have MEDIUM editorial contrast, not a harsh checkerboard and not a flat monotone look. Staying STRICTLY inside the palette "${palette}":
- Keep most cells in balanced midtones with natural shadows and soft highlights.
- Let some neighbouring cells be gently brighter or gently moodier, but avoid extreme black shadows or blown-out whites.
- The brightness rhythm should be visible when scanning the grid, while still feeling cohesive and calm.
In EVERY imagePrompt, describe the shot as either "softly luminous", "balanced midtone", or "gently moody" and name the palette colors used. This varies brightness and mood ONLY - never the color family.`;
}

// ─── System Prompt builders ───────────────────────────────────────────────────

/**
 * Builds the rigid system prompt for Gemini Flash (Master Grid generation).
 * The AI MUST output valid JSON matching GridPlan — nothing else.
 */
export function buildMasterGridSystemPrompt(inputs: GridPipelineUserInputs): string {
  const { imageCount, aesthetic, palette, lightType, extraNotes, hasPortraitReference, seed } = inputs;
  const toneContrast = normalizeGridToneContrast(inputs.toneContrast);
  const toneContrastDirective = getPlanToneContrastDirective(toneContrast, palette);

  // Derive position assignments using the contrast matrix (seeded when available
  // so two identical requests still produce visibly different layouts).
  const positionMap = buildPositionMap(imageCount, seed);

  const positionInstructions = positionMap
    .map(
      ({ position, type }) =>
        `  - Position ${position}: ${type} — ${POSITION_TYPE_RULES[type]}`,
    )
    .join("\n");

  const hairstyleList = HAIRSTYLE_BANK.join(", ");
  const angleList = ANGLE_BANK.join(", ");

  // Seeded creative pre-allocation: shuffle the banks + aesthetic vocabulary and
  // assign a distinct hairstyle/angle/scene-anchor to every model cell and a
  // distinct object category to every SIMPLE cell. This is the main lever that
  // makes grids differ between users while keeping identity/palette/light locked.
  const rng = mulberry32(((seed ?? 0) >>> 0) || 1);
  const fullVocab = PIPELINE_AESTHETIC_VOCABULARY[aesthetic] ?? [];
  const shuffledVocab = seed !== undefined ? shuffleWith(fullVocab, rng) : fullVocab;
  const shuffledHair = seed !== undefined ? shuffleWith(HAIRSTYLE_BANK, rng) : HAIRSTYLE_BANK;
  const shuffledAngles = seed !== undefined ? shuffleWith(ANGLE_BANK, rng) : ANGLE_BANK;
  const shuffledCategories =
    seed !== undefined ? shuffleWith(OBJECT_SUBJECT_CATEGORIES, rng) : OBJECT_SUBJECT_CATEGORIES;

  // A focused vocabulary subset keeps scenes on-brand but stops every grid from
  // gravitating to the same one or two clichéd interpretations of the aesthetic.
  const vocabSubset =
    fullVocab.length > 0
      ? shuffledVocab.slice(
          0,
          Math.min(shuffledVocab.length, Math.max(4, Math.ceil(shuffledVocab.length * 0.6))),
        )
      : [];
  const vocabularyLine =
    vocabSubset.length > 0
      ? `Aesthetic visual vocabulary (use these in imagePrompt fields, favor variety): ${vocabSubset.join(", ")}.`
      : getAestheticVocabularyLine(aesthetic);

  // Per-position creative assignments (only emitted when a seed is supplied).
  let modelIdx = 0;
  let objectIdx = 0;
  const assignmentLines = positionMap
    .map(({ position, type }) => {
      if (type === "SIMPLE") {
        const category =
          shuffledCategories.length > 0
            ? shuffledCategories[objectIdx % shuffledCategories.length]
            : "a distinct hero object";
        objectIdx++;
        return `  - Position ${position} (OBJECT, no model): hero subject category = ${category}. Must be a DISTINCT object from every other cell.`;
      }
      const hairstyle = shuffledHair[modelIdx % shuffledHair.length];
      const angle = shuffledAngles[modelIdx % shuffledAngles.length];
      const sceneAnchor = shuffledVocab.length > 0 ? shuffledVocab[modelIdx % shuffledVocab.length] : "";
      modelIdx++;
      const sceneTxt = sceneAnchor ? ` Scene anchor: ${sceneAnchor}.` : "";
      return `  - Position ${position} (${type}, model present): hairstyle = ${hairstyle}; camera angle = ${angle}.${sceneTxt}`;
    })
    .join("\n");

  const variationDirective =
    seed !== undefined
      ? `\nVariation seed: ${seed}. Use it to make bold, non-obvious creative choices and avoid the single most clichéd interpretation of this aesthetic. Follow the PER-POSITION ASSIGNMENTS section below EXACTLY.`
      : "";

  const assignmentSection =
    seed !== undefined
      ? `
═══════════════════════════════════════════════
PER-POSITION ASSIGNMENTS (MANDATORY — use EXACTLY)
═══════════════════════════════════════════════
Use exactly the hairstyle, camera angle, scene anchor and object category assigned to each position below. Do NOT swap them between positions and do NOT reuse one across two positions.
${assignmentLines}
`
      : "";

  const portraitInstruction = hasPortraitReference
    ? "A portrait reference image of the model WILL be passed to GPT Image 2 alongside each prompt. Each imagePrompt MUST include the instruction: 'Preserve the model's face and identity exactly from the provided reference image.' IDENTITY IS LOCKED, EVERYTHING ELSE VARIES: keep the SAME face/identity across all shots, but every position with the model must show a DISTINCT outfit, pose, and expression. Never reuse the same wardrobe piece, pose, or facial expression twice, and never repeat the same look from a different angle."
    : "No portrait reference is available. Each imagePrompt should describe the model generically in a way that is consistent across all shots (same apparent age, skin tone, body type), while still giving every shot a distinct outfit, pose, and expression.";

  return `You are an expert Instagram content strategist and AI photo director.
Your ONLY task is to generate a structured JSON shot plan for a ${imageCount}-image Instagram grid.
You must output VALID JSON and NOTHING else — no markdown, no explanation, no code fences.

═══════════════════════════════════════════════
GRID PARAMETERS
═══════════════════════════════════════════════
Aesthetic: ${aesthetic}
Color palette: ${palette}
Light type: ${lightType}
Tone contrast mode: ${toneContrast === "high" ? "high contrast" : "medium contrast"}
Image count: ${imageCount}
${vocabularyLine ? vocabularyLine + "\n" : ""}Extra notes from user: ${extraNotes || "none"}${variationDirective}

═══════════════════════════════════════════════
COLOR PALETTE (DOMINANT — overrides scene-natural colors)
═══════════════════════════════════════════════
The color palette "${palette}" is the SINGLE SOURCE OF TRUTH for color in every shot.
- It OVERRIDES the colors normally associated with the aesthetic, the scenes, the wardrobe, and the props. If the aesthetic or a scene would normally be warm/beige/terracotta but the palette is cool/dark, the final colors MUST follow the palette, NOT the scene's expected colors.
- Weave the exact palette colors into EVERY single imagePrompt field: name the palette colors explicitly in the wardrobe, set dressing, props, lighting tint, and color grade of each shot.
- Wardrobe, walls, objects, and ambient light must all read in these palette tones. Do NOT default to the aesthetic's typical color scheme.
- End every imagePrompt with an explicit color-grade instruction, e.g. "Color grade strictly to the palette: ${palette}."

═══════════════════════════════════════════════
CONTRAST MATRIX (MANDATORY — do not deviate)
═══════════════════════════════════════════════
You MUST assign the correct type to every position:
${positionInstructions}

Position type rules:
- COMPLEX: medium or full-body frame with action, movement, or location rich in detail.
- SIMPLE: minimalist flat-lay, accessory macro, geometric shadow, or texture detail — NO model required. Compose with ONE single hero subject and GENEROUS negative space around it; keep it clean, airy, uncluttered and breathable — never busy, never crowded, never multiple objects competing for attention.
- MEDIUM: elegant portrait or mirror selfie — tight on face/shoulders, calm and refined.

═══════════════════════════════════════════════
DIVERSITY RULES (MANDATORY)
═══════════════════════════════════════════════
Every position where the model appears MUST have:
  1. A different hairstyle (choose from: ${hairstyleList})
  2. A different camera angle (choose from: ${angleList})
  3. A different location or scene context

NO two adjacent positions may share the same hairstyle OR the same angle.

SUBJECT VARIETY (MANDATORY): every position must depict a DISTINCT subject/object/location. Never show the same object, prop, garment, or place twice — not even from a different distance, crop, or angle. Spread SIMPLE/object positions across different subject categories (e.g. accessory, food/drink, architecture detail, interior texture, outdoor element, wardrobe flat-lay) so the grid tells a varied story instead of repeating one motif.

═══════════════════════════════════════════════
TONAL CONTRAST & VISUAL RHYTHM (MANDATORY)
═══════════════════════════════════════════════
${toneContrastDirective}
${assignmentSection}
═══════════════════════════════════════════════
PORTRAIT REFERENCE
═══════════════════════════════════════════════
${portraitInstruction}

═══════════════════════════════════════════════
OUTPUT FORMAT (strict — output ONLY this JSON, no extra text)
═══════════════════════════════════════════════
{
  "imageCount": ${imageCount},
  "aesthetic": "${aesthetic}",
  "palette": "${palette}",
  "lightType": "${lightType}",
  "shots": [
    {
      "position": 1,
      "type": "COMPLEX" | "SIMPLE" | "MEDIUM",
      "label": "<short human-readable scene label>",
      "hairstyle": "<hairstyle or null if no model in frame>",
      "angle": "<camera angle or null if no model in frame>",
      "imagePrompt": "<complete, self-contained prompt for GPT Image 2 — include aesthetic, palette, light, scene, hairstyle, angle, and any portrait-reference instruction>"
    }
    // ... one entry per position, total ${imageCount} entries
  ]
}`;
}

/**
 * Builds the system prompt for Gemini Flash (Grid Continuity / Extension).
 * The AI receives the previous grid context and generates FRESH shots only.
 */
export function buildContinuityGridSystemPrompt(
  context: GridContinuityContext,
  newImageCount: GridPipelineImageCount,
  hasPortraitReference: boolean,
  extraNotes = "",
  seed?: number,
  toneContrast: GridToneContrast = "medium",
): string {
  const normalizedToneContrast = normalizeGridToneContrast(toneContrast);
  const toneContrastDirective = getPlanToneContrastDirective(normalizedToneContrast, context.palette);
  const positionMap = buildPositionMap(newImageCount, seed);

  const positionInstructions = positionMap
    .map(({ position, type }) => `  - Position ${position}: ${type}`)
    .join("\n");

  const vocabularyLine = getAestheticVocabularyLine(context.aesthetic);

  const usedScenesList = context.usedScenes.length > 0 ? context.usedScenes.join(", ") : "none";
  const usedHairstylesList = context.usedHairstyles.length > 0 ? context.usedHairstyles.join(", ") : "none";
  const usedAnglesList =
    Array.isArray(context.usedAngles) && context.usedAngles.length > 0 ? context.usedAngles.join(", ") : "none";

  // Seeded per-position assignments drawn from the banks MINUS what the prior
  // grid already used, so the extension is both fresh and clearly varied.
  const rng = mulberry32(((seed ?? 0) >>> 0) || 1);
  const usedHairSet = new Set(context.usedHairstyles);
  const usedAngleSet = new Set(context.usedAngles);
  const freshHairBank = HAIRSTYLE_BANK.filter((h) => !usedHairSet.has(h));
  const freshAngleBank = ANGLE_BANK.filter((a) => !usedAngleSet.has(a));
  const hairPool = freshHairBank.length > 0 ? freshHairBank : HAIRSTYLE_BANK;
  const anglePool = freshAngleBank.length > 0 ? freshAngleBank : ANGLE_BANK;
  const shuffledHair = seed !== undefined ? shuffleWith(hairPool, rng) : hairPool;
  const shuffledAngles = seed !== undefined ? shuffleWith(anglePool, rng) : anglePool;
  const shuffledCategories =
    seed !== undefined ? shuffleWith(OBJECT_SUBJECT_CATEGORIES, rng) : OBJECT_SUBJECT_CATEGORIES;

  let modelIdx = 0;
  let objectIdx = 0;
  const assignmentLines = positionMap
    .map(({ position, type }) => {
      if (type === "SIMPLE") {
        const category =
          shuffledCategories.length > 0
            ? shuffledCategories[objectIdx % shuffledCategories.length]
            : "a distinct hero object";
        objectIdx++;
        return `  - Position ${position} (OBJECT, no model): hero subject category = ${category}. Must be DISTINCT from every cell in this pack so far.`;
      }
      const hairstyle = shuffledHair[modelIdx % shuffledHair.length];
      const angle = shuffledAngles[modelIdx % shuffledAngles.length];
      modelIdx++;
      return `  - Position ${position} (${type}, model present): hairstyle = ${hairstyle}; camera angle = ${angle}.`;
    })
    .join("\n");

  const assignmentSection =
    seed !== undefined
      ? `
═══════════════════════════════════════════════
PER-POSITION ASSIGNMENTS (MANDATORY — use EXACTLY)
═══════════════════════════════════════════════
Use exactly the hairstyle, camera angle and object category assigned to each position below. They are already chosen to avoid everything used in earlier images of this pack.
${assignmentLines}
`
      : "";

  const portraitInstruction = hasPortraitReference
    ? "Portrait reference IS available. Include in each imagePrompt: 'Preserve the model's face and identity exactly from the provided reference image.' IDENTITY IS LOCKED, EVERYTHING ELSE VARIES: keep the SAME face/identity, but every new shot must show a DIFFERENT outfit, pose, expression, and styling than any previous image. Do NOT reuse a wardrobe piece, pose, or facial expression already used in earlier images of this pack. Never repeat the same look from a new angle — change the actual outfit and pose."
    : "No portrait reference. Describe the model generically but consistently across all shots (same apparent age, skin tone, body type), while still varying outfit, pose, and expression in every shot.";

  return `You are an expert Instagram content strategist and AI photo director.
You are continuing an existing Instagram grid. Your ONLY task is to generate a JSON shot plan for ${newImageCount} NEW images that extend the grid seamlessly.
Output VALID JSON and NOTHING else.

═══════════════════════════════════════════════
EXISTING GRID CONTEXT (maintain coherence)
═══════════════════════════════════════════════
Aesthetic: ${context.aesthetic}
Color palette: ${context.palette}
Light type: ${context.lightType}
${vocabularyLine ? vocabularyLine + "\n" : ""}Already-used scenes (AVOID repeating these): ${usedScenesList}
Already-used hairstyles (AVOID repeating these): ${usedHairstylesList}
Already-used camera angles (AVOID repeating these): ${usedAnglesList}

═══════════════════════════════════════════════
NEW GRID PARAMETERS
═══════════════════════════════════════════════
New image count: ${newImageCount}
Tone contrast mode: ${normalizedToneContrast === "high" ? "high contrast" : "medium contrast"}
Extra notes: ${extraNotes || "none"}

═══════════════════════════════════════════════
CONTRAST MATRIX (MANDATORY)
═══════════════════════════════════════════════
${positionInstructions}

═══════════════════════════════════════════════
CONTINUITY RULES (MANDATORY)
═══════════════════════════════════════════════
1. Keep IDENTICAL: palette (${context.palette}), light type (${context.lightType}), aesthetic mood.
2. Use FRESH scenes — none of the already-used scenes above.
3. Use FRESH hairstyles — none of the already-used hairstyles above. Choose from: ${HAIRSTYLE_BANK.join(", ")}.
4. Use FRESH camera angles — none of the already-used angles above. Choose from: ${ANGLE_BANK.join(", ")}.
5. SIMPLE positions must be pure minimalist object/texture shots — no model. Compose ONE single hero subject with generous negative space around it: clean, airy, uncluttered, breathable — never busy or crowded.
6. NO RE-SHOOTING SUBJECTS (CRITICAL): treat the already-used scenes above as subjects/objects/props/locations that are now OFF-LIMITS. Do NOT re-depict any of them from a different distance, crop, zoom, or angle. Example: if a previous image already featured a wristwatch, this extension must NOT contain ANY watch — not closer, not farther, not from another angle. Pick entirely different objects and locations.
7. EXPAND THE STORY: each new image must ADD a genuinely new narrative beat to the pack (new prop category, new wardrobe piece, new setting, new lifestyle moment, new texture). Across the whole extension, vary the subject categories (e.g. accessories, food/drink, architecture, interior detail, outdoor scene, wardrobe flat-lay) so the grid feels like the next chapter — never a re-run of the same motifs in new framing.
8. TONAL CONTRAST MODE: ${toneContrastDirective}
${assignmentSection}
═══════════════════════════════════════════════
PORTRAIT REFERENCE
═══════════════════════════════════════════════
${portraitInstruction}

═══════════════════════════════════════════════
OUTPUT FORMAT (output ONLY this JSON)
═══════════════════════════════════════════════
{
  "imageCount": ${newImageCount},
  "aesthetic": "${context.aesthetic}",
  "palette": "${context.palette}",
  "lightType": "${context.lightType}",
  "shots": [
    {
      "position": 1,
      "type": "COMPLEX" | "SIMPLE" | "MEDIUM",
      "label": "<scene label>",
      "hairstyle": "<hairstyle or null>",
      "angle": "<angle or null>",
      "imagePrompt": "<complete GPT Image 2 prompt>"
    }
  ]
}`;
}

// ─── Position map builder (Contrast Matrix) ───────────────────────────────────

const POSITION_TYPE_RULES: Record<GridPositionType, string> = {
  COMPLEX:
    "medium or full-body frame, action, movement, rich location details",
  SIMPLE:
    "minimalist flat-lay / accessory macro / geometric shadow / texture — no model. ONE single hero subject only, surrounded by GENEROUS empty negative space; clean, airy, uncluttered, calm and breathable — never busy or crowded",
  MEDIUM:
    "elegant tight portrait or mirror selfie — face/shoulders, calm composition",
};

/**
 * Maps each 1-based position to its required type following the contrast matrix.
 *
 * Default (no seed) matrix rule (repeating pattern):
 *   pos 1, 5, 9, 13 → COMPLEX
 *   pos 2, 4, 6, 8, 10, 12 → SIMPLE
 *   pos 3, 7, 11 → MEDIUM
 *
 * When a `seed` is supplied the model/object ALTERNATION is preserved (odd
 * positions = model, even = object → SIMPLE) and the per-grid COMPLEX/MEDIUM
 * counts are preserved, but WHICH model positions are MEDIUM vs COMPLEX is
 * randomized. This varies the layout rhythm between requests without ever
 * clustering object cells or breaking the visual balance. Passing the same seed
 * to the parser reproduces the exact same map, so plan normalization stays consistent.
 */
function buildPositionMap(
  count: number,
  seed?: number,
): Array<{ position: number; type: GridPositionType }> {
  if (seed === undefined) {
    const result: Array<{ position: number; type: GridPositionType }> = [];
    for (let i = 1; i <= count; i++) {
      let type: GridPositionType;
      if (i % 2 === 0) {
        type = "SIMPLE";
      } else if (i === 3 || i === 7 || i === 11) {
        type = "MEDIUM";
      } else {
        type = "COMPLEX";
      }
      result.push({ position: i, type });
    }
    return result;
  }

  // Seeded variant: keep odd = model, even = object; randomize which model
  // positions are MEDIUM (same MEDIUM count as the deterministic layout).
  const rng = mulberry32((seed >>> 0) || 1);
  const modelPositions: number[] = [];
  for (let i = 1; i <= count; i++) {
    if (i % 2 === 1) modelPositions.push(i);
  }
  const mediumCount = [3, 7, 11].filter((p) => p <= count).length;
  const mediumSet = new Set(shuffleWith(modelPositions, rng).slice(0, mediumCount));

  const result: Array<{ position: number; type: GridPositionType }> = [];
  for (let i = 1; i <= count; i++) {
    let type: GridPositionType;
    if (i % 2 === 0) {
      type = "SIMPLE";
    } else if (mediumSet.has(i)) {
      type = "MEDIUM";
    } else {
      type = "COMPLEX";
    }
    result.push({ position: i, type });
  }
  return result;
}

/**
 * Returns the contrast-matrix type for a single 1-based position.
 * Mirrors buildPositionMap so the parsed plan can be normalized deterministically.
 */
function positionTypeFor(position: number): GridPositionType {
  if (position % 2 === 0) return "SIMPLE";
  if (position === 3 || position === 7 || position === 11) return "MEDIUM";
  return "COMPLEX";
}

// ─── Gemini Flash text call ───────────────────────────────────────────────────

/**
 * Calls Gemini Flash with a strict text-only prompt and returns the raw text response.
 * Exported so routes.ts can use it directly without importing the full Gemini client.
 */
export async function callGeminiFlashText(options: {
  systemPrompt: string;
  geminiApiBaseUrl: string;
  geminiApiKey: string;
  model?: string;
}): Promise<string> {
  const requestedModel = options.model || "gemini-3-flash-preview";
  const normalizedModel = requestedModel.startsWith("models/")
    ? requestedModel.slice("models/".length)
    : requestedModel;

  // Older model aliases can still appear from stale env vars.
  // Remap to a currently supported text model to avoid 404 failures.
  const modelName =
    normalizedModel === "gemini-2.0-flash" || normalizedModel === "gemini-2.0-flash-exp"
      ? "gemini-3-flash-preview"
      : normalizedModel;

  const url = `${options.geminiApiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.systemPrompt }],
      },
    ],
    generationConfig: {
      // Higher temperature + nucleus sampling so plans for the same aesthetic/
      // palette diverge more between requests (more creative scene variety).
      temperature: 0.95,
      topP: 0.95,
      maxOutputTokens: 8192,
      responseMimeType: "application/json",
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": options.geminiApiKey,
    },
    body: JSON.stringify(payload),
  });

  const rawText = await response.text();

  if (!response.ok) {
    let remoteMessage = "";
    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const err = parsed.error as Record<string, unknown> | undefined;
      remoteMessage = (typeof err?.message === "string" ? err.message : "") || rawText;
    } catch {
      remoteMessage = rawText;
    }
    throw new Error(`Gemini Flash error (${response.status}): ${remoteMessage}`);
  }

  // Extract text from candidates[0].content.parts[0].text
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const candidates = Array.isArray(parsed.candidates) ? parsed.candidates : [];
    for (const candidate of candidates) {
      const c = candidate as Record<string, unknown>;
      const content = c.content as Record<string, unknown> | undefined;
      const parts = Array.isArray(content?.parts) ? content.parts : [];
      for (const part of parts) {
        const p = part as Record<string, unknown>;
        if (typeof p.text === "string" && p.text.trim().length > 0) {
          return p.text.trim();
        }
      }
    }
  } catch {
    // fall through
  }

  throw new Error("Gemini Flash returned no usable text.");
}

// ─── Plan parser ─────────────────────────────────────────────────────────────

/**
 * Parses the raw Gemini Flash JSON output into a typed GridPlan.
 * Throws if the structure is invalid.
 */
export function parseGridPlan(rawJson: string, expectedCount: number, seed?: number): GridPlan {
  let parsed: unknown;
  try {
    // Strip any accidental markdown fences Gemini might add despite instructions
    const clean = rawJson.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    parsed = JSON.parse(clean);
  } catch {
    throw new Error("Grid plan parsing failed: Gemini did not return valid JSON.");
  }

  const root = parsed as Record<string, unknown>;

  if (!Array.isArray(root.shots) || root.shots.length === 0) {
    throw new Error("Grid plan parsing failed: 'shots' array is missing or empty.");
  }

  if (root.shots.length !== expectedCount) {
    throw new Error(
      `Grid plan parsing failed: expected ${expectedCount} shots, got ${root.shots.length}.`,
    );
  }

  // Rebuild the SAME (seeded) contrast matrix used to build the prompt so we can
  // normalize each shot's type deterministically — never trust Gemini's type.
  const typeByPosition = new Map(
    buildPositionMap(expectedCount, seed).map(({ position, type }) => [position, type] as const),
  );

  const shots: GridShotPlan[] = (root.shots as unknown[]).map((s, idx) => {
    const shot = s as Record<string, unknown>;
    const position = typeof shot.position === "number" ? shot.position : idx + 1;
    // Enforce the contrast matrix deterministically — never trust Gemini's type,
    // otherwise the model can drift (e.g. put portraits in consecutive cells).
    const type = typeByPosition.get(position) ?? positionTypeFor(position);
    const label = typeof shot.label === "string" ? shot.label : `Shot ${position}`;
    // Object-only (SIMPLE) cells must never carry a hairstyle/angle (no model in frame).
    const hairstyle = type === "SIMPLE" ? null : typeof shot.hairstyle === "string" ? shot.hairstyle : null;
    const angle = type === "SIMPLE" ? null : typeof shot.angle === "string" ? shot.angle : null;
    const imagePrompt = typeof shot.imagePrompt === "string" ? shot.imagePrompt : "";

    if (!imagePrompt) {
      throw new Error(`Grid plan parsing failed: shot ${position} is missing imagePrompt.`);
    }

    return { position, type, label, hairstyle, angle, imagePrompt };
  });

  return {
    imageCount: expectedCount,
    aesthetic: typeof root.aesthetic === "string" ? root.aesthetic : "",
    palette: typeof root.palette === "string" ? root.palette : "",
    lightType: typeof root.lightType === "string" ? root.lightType : "",
    shots,
  };
}

// ─── Continuity context extractor ────────────────────────────────────────────

/**
 * Derives a GridContinuityContext from a completed GridPlan.
 * Pass this to generateContinuityPromptStructure on the next extension call.
 */
export function extractContinuityContext(plan: GridPlan): GridContinuityContext {
  const usedScenes: string[] = [];
  const usedHairstyles: string[] = [];
  const usedAngles: string[] = [];

  for (const shot of plan.shots) {
    if (shot.label) usedScenes.push(shot.label);
    if (shot.hairstyle) usedHairstyles.push(shot.hairstyle);
    if (shot.angle) usedAngles.push(shot.angle);
  }

  return {
    aesthetic: plan.aesthetic,
    palette: plan.palette,
    lightType: plan.lightType,
    usedScenes: [...new Set(usedScenes)],
    usedHairstyles: [...new Set(usedHairstyles)],
    usedAngles: [...new Set(usedAngles)],
  };
}

// ─── Credit constants ─────────────────────────────────────────────────────────

/**
 * Quality tier of the image model used by the grid pipeline render step.
 * GPT Image 2 is a premium-class model, so each rendered image is priced the
 * same as a premium standalone generation (see INSTAME_QUALITY_TIER_CREDITS).
 */
export const GRID_PIPELINE_RENDER_QUALITY_TIER = INSTAME_GRID_PIPELINE_RENDER_QUALITY_TIER;

/** Credits per rendered/extracted image, aligned to the model's quality tier. */
export const GRID_PIPELINE_IMAGE_CREDIT_COST = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;

/** 1 credit for the Gemini Flash planning step (master or continuity) */
export const GRID_PIPELINE_PLAN_CREDIT_COST = INSTAME_GRID_PIPELINE_PLAN_CREDIT_COST;

/** Per-image render cost in Step 2, aligned to the premium quality tier */
export const GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;

/**
 * Composite preview = Gemini plan (1) + one premium composite render.
 * Priced so the preview at least covers its own model cost.
 */
export const GRID_PIPELINE_COMPOSITE_CREDIT_COST = INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST;

/** Credits per image extracted from the composite, aligned to the premium tier */
export const GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE =
  INSTAME_GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE;

// ─── Grid position helpers ────────────────────────────────────────────────────

const GRID_COLS = 3; // Instagram always uses 3 columns

/**
 * Returns a human-readable grid position label.
 * e.g. position 1 in a 9-image grid → "row 1, column 1 (top-left)"
 */
export function getGridPositionLabel(position: number, imageCount: number): string {
  const totalRows = Math.ceil(imageCount / GRID_COLS);
  const row = Math.ceil(position / GRID_COLS);
  const col = ((position - 1) % GRID_COLS) + 1;
  const rowLabel = row === 1 ? "top" : row === totalRows ? "bottom" : "center";
  const colLabel = col === 1 ? "left" : col === GRID_COLS ? "right" : "center";
  const corner =
    rowLabel === "center" && colLabel === "center"
      ? "center of grid"
      : rowLabel === colLabel
      ? rowLabel
      : `${rowLabel}-${colLabel}`;
  return `row ${row}, column ${col} (${corner})`;
}

// ─── Composite grid prompt ────────────────────────────────────────────────────

/**
 * Builds the GPT Image 2 prompt for generating a single composite
 * Instagram grid preview image containing all shots in a grid layout.
 */
export function buildCompositeGridPrompt(
  plan: GridPlan,
  hasPortraitReference: boolean,
  toneContrast: GridToneContrast = "medium",
): string {
  const totalRows = Math.ceil(plan.imageCount / GRID_COLS);
  const normalizedToneContrast = normalizeGridToneContrast(toneContrast);
  const isHighContrast = normalizedToneContrast === "high";

  // Deterministic light/dark checkerboard so neighbouring cells ALWAYS alternate
  // tonal value (side by side AND stacked) instead of leaving it to the render
  // model's interpretation. (row + col) even = bright/airy, odd = dark/moody.
  const toneForPosition = (position: number): "DARK" | "LIGHT" => {
    const row = Math.ceil(position / GRID_COLS);
    const col = ((position - 1) % GRID_COLS) + 1;
    return (row + col) % 2 === 0 ? "LIGHT" : "DARK";
  };

  const shotLines = plan.shots
    .map((shot) => {
      const row = Math.ceil(shot.position / GRID_COLS);
      const col = ((shot.position - 1) % GRID_COLS) + 1;
      const cellKind =
        shot.type === "SIMPLE"
          ? "OBJECT-ONLY (NO person, NO model — flat-lay / accessory / texture detail)"
          : shot.type === "MEDIUM"
          ? "PORTRAIT (model present — tight on face/shoulders)"
          : "PORTRAIT (model present — full or medium body, action/location)";
      const tone =
        toneForPosition(shot.position) === "DARK"
          ? isHighContrast
            ? "tone: DARK & moody (low-key, deep shadow, rich dark palette tones)"
            : "tone: gently moody (balanced midtones, soft shadow, rich but not black)"
          : isHighContrast
            ? "tone: BRIGHT & airy (high-key, luminous, light palette tones)"
            : "tone: softly luminous (natural highlights, balanced exposure, not blown out)";
      const detail = [
        cellKind,
        shot.label,
        shot.hairstyle ? `hairstyle: ${shot.hairstyle}` : null,
        shot.angle ? `camera angle: ${shot.angle}` : null,
        tone,
      ]
        .filter(Boolean)
        .join(" — ");
      return `  Position ${shot.position} (row ${row}, col ${col}): ${detail}`;
    })
    .join("\n");

  const darkPositions = plan.shots.filter((s) => toneForPosition(s.position) === "DARK").map((s) => s.position);
  const lightPositions = plan.shots.filter((s) => toneForPosition(s.position) === "LIGHT").map((s) => s.position);
  const tonalContrastSection = isHighContrast
    ? `TONAL CONTRAST & VISUAL RHYTHM (HIGH CONTRAST):
- Do NOT render every cell at the same brightness. A monotone grid where all cells are equally light (or equally dark) looks flat and amateur.
- Within the SAME palette "${plan.palette}", deliberately alternate the tonal value of neighbouring cells: some cells lean to the DARKER / moodier / low-key end of the palette (deep shadow, dramatic light, rich dark tones) and others to the LIGHTER / airier / high-key end (bright, soft, luminous).
- EXACT TONAL ASSIGNMENT (MANDATORY - follow position-by-position, this creates the light/dark checkerboard):
   - DARK & moody (low-key) cells - render these positions noticeably darker, deep shadow, dramatic light: ${darkPositions.join(", ") || "none"}.
   - BRIGHT & airy (high-key) cells - render these positions noticeably lighter, luminous, soft light: ${lightPositions.join(", ") || "none"}.
- The brightness gap between a DARK cell and an adjacent BRIGHT cell must be obvious at a glance - clearly different exposure, not a subtle shift.
- No two side-by-side or stacked cells may share the same overall brightness. Honour the dark/light positions exactly.
- Mix close-up high-detail cells with open negative-space cells, and bright daylight moments with shadowy dramatic ones.
- This tonal variation must stay strictly inside the palette - change brightness and mood, NOT the color family.`
    : `TONAL CONTRAST & VISUAL RHYTHM (MEDIUM CONTRAST):
- Do NOT render every cell at the exact same brightness, but avoid a harsh checkerboard.
- Within the SAME palette "${plan.palette}", create a soft editorial rhythm using balanced midtones, natural shadows, and gentle highlights.
- SUGGESTED TONAL ASSIGNMENT (follow softly, not extremely):
   - GENTLY MOODY cells - render these positions with deeper midtones and soft shadow, not black underexposure: ${darkPositions.join(", ") || "none"}.
   - SOFTLY LUMINOUS cells - render these positions slightly brighter with natural highlights, not blown-out whites: ${lightPositions.join(", ") || "none"}.
- The brightness difference between neighbouring cells should be visible but refined, like a cohesive editorial carousel.
- No cell should become extremely dark or extremely bright; keep the full grid calm, premium, and harmonious.
- This tonal variation must stay strictly inside the palette - change brightness and mood, NOT the color family.`;

  const modelPositions = plan.shots.filter((s) => s.type !== "SIMPLE").map((s) => s.position);
  const objectPositions = plan.shots.filter((s) => s.type === "SIMPLE").map((s) => s.position);

  const portraitNote = hasPortraitReference
    ? "The female model with consistent identity (same face) appears ONLY in the PORTRAIT cells listed below."
    : "A stylish female model with consistent appearance (same face) appears ONLY in the PORTRAIT cells listed below.";

  return `Create a photorealistic Instagram profile grid preview image showing exactly ${plan.imageCount} coordinated editorial photos arranged in a ${GRID_COLS}-column × ${totalRows}-row grid, exactly as they appear on an Instagram profile page.

GRID STRUCTURE: ${plan.imageCount} equal cells in ${totalRows} row${totalRows > 1 ? "s" : ""} of ${GRID_COLS} columns. Cells are separated by a thin white 1px divider (like Instagram). The grid fills the entire canvas.

AESTHETIC: ${plan.aesthetic}
COLOR PALETTE: ${plan.palette}
LIGHT TYPE: ${plan.lightType}

COLOR PALETTE IS DOMINANT: every cell — wardrobe, walls, props, set dressing, ambient light, and overall color grade — MUST be rendered strictly in the palette "${plan.palette}". This palette OVERRIDES the colors normally associated with the aesthetic or the scenes. If a scene would normally be warm/beige/terracotta but the palette is cool or dark, render it in the palette colors instead. Do NOT fall back to the aesthetic's typical colors.

CELL CONTENTS (left to right, top to bottom — numbering is exact):
${shotLines}

CELL-TYPE PLACEMENT (MANDATORY — do NOT deviate):
- PORTRAIT cells (model visible) are ONLY positions: ${modelPositions.join(", ") || "none"}.
- OBJECT-ONLY cells (absolutely NO person, NO face, NO body part) are ONLY positions: ${objectPositions.join(", ") || "none"}.
- The model must NEVER appear in an OBJECT-ONLY cell. Object-only cells show a single hero object/texture with generous negative space — no human anywhere.
- Do NOT place portrait cells next to each other when an object cell is specified between them — follow the exact placement above so portraits and objects alternate as listed.

OUTFIT & WARDROBE VARIETY (MANDATORY):
- Every PORTRAIT cell must show the model in a COMPLETELY DIFFERENT outfit — different garment type, cut, and color story in each one.
- NEVER reuse the same black blazer (or any single garment) across multiple cells. If one cell is a black blazer, the others must be e.g. a knit, a dress, a coat, a blouse, tailored trousers with a different top, etc.
- Also vary pose, expression, and framing in every portrait cell. Never repeat the same look from a different angle.

${tonalContrastSection}

RULES:
- All cells share the SAME palette and overall color grade, but their TONAL VALUE (brightness/darkness) MUST deliberately vary from cell to cell per the TONAL CONTRAST section above — do not flatten them to one identical brightness
- Each cell is clearly distinct but visually harmonious with all others
- VISUAL BALANCE (IMPORTANT): keep object/flat-lay (OBJECT-ONLY) cells minimalist and airy — ONE hero subject with generous negative space, never cluttered. Alternate busy and calm cells so the overall grid feels balanced and breathable, not crowded
- ${portraitNote}
- No extra borders or margins outside the grid — the grid fills the entire image
- Render photos only: no text, captions, labels, numbers, UI chrome, stickers, logos, watermarks, signs, or readable words anywhere in the image
- Professional editorial photography quality, photorealistic`;
}

// ─── Extraction prompt ────────────────────────────────────────────────────────

/**
 * Builds the GPT Image 2 prompt to extract and recreate one cell from the
 * composite grid at full standalone resolution.
 */
export function buildExtractionPrompt(params: {
  position: number;
  imageCount: number;
  shot: { label: string; hairstyle: string | null; angle: string | null; type: string; imagePrompt?: string };
  hasPortrait: boolean;
  aesthetic: string;
  palette: string;
  lightType: string;
  // When true, the FIRST input image is already the single cropped cell (not the
  // full grid), so the prompt must tell the model to enhance the whole provided
  // image instead of locating and cropping cell N out of a grid.
  preCropped?: boolean;
}): string {
  const { position, imageCount, shot, hasPortrait, aesthetic, palette, lightType, preCropped } = params;
  const totalRows = Math.ceil(imageCount / GRID_COLS);
  const row = Math.ceil(position / GRID_COLS);
  const col = ((position - 1) % GRID_COLS) + 1;
  const rowLabel = row === 1 ? "top" : row === totalRows ? "bottom" : "center";
  const colLabel = col === 1 ? "left" : col === GRID_COLS ? "right" : "center";
  const corner =
    rowLabel === "center" && colLabel === "center"
      ? "center of the grid"
      : `${rowLabel}-${colLabel} of the grid`;

  const typeDesc =
    shot.type === "SIMPLE"
      ? "Flat-lay / object detail — no person in frame. ONE single hero subject with generous empty negative space around it; minimalist, clean, airy, uncluttered and breathable — never busy or crowded"
      : shot.type === "MEDIUM"
      ? "Tight portrait — face and shoulders, calm and refined"
      : "Full or medium body — action, movement, or rich location";

  // The grid cell shown in the preview is the SOURCE OF TRUTH. The user already
  // approved that preview, so extraction must FAITHFULLY reproduce that exact cell
  // (composition, wardrobe, background, props, pose, expression, colors) and ONLY
  // add resolution / sharpness / fine detail — it must NOT re-invent or change any
  // element. The per-shot brief is provided purely as descriptive context to help
  // the model understand what it is enhancing, never to override what is visible.
  const brief = (shot.imagePrompt && shot.imagePrompt.trim().length > 0)
    ? shot.imagePrompt.trim()
    : `Scene: ${shot.label}.${shot.hairstyle ? ` Hairstyle: ${shot.hairstyle}.` : ""}${shot.angle ? ` Camera angle: ${shot.angle}.` : ""}`;

  const portraitInstruction = hasPortrait
    ? `\nCRITICAL IDENTITY RULE: The facial features, face shape, skin tone, and complete identity of any person in this image MUST belong 100% to the individual shown in the provided reference portrait, exactly as they already appear in the reference cell. Never alter their identity.`
    : "";

  const openingLine = preCropped
    ? `Upscale and enhance the provided photo into a single full-resolution editorial image. This is an ENHANCEMENT task, NOT a re-generation: the provided image is the exact picture the user already approved.`
    : `Upscale and enhance cell ${position} of ${imageCount} from the Instagram grid preview (first image provided) into a single full-resolution editorial photo. This is an ENHANCEMENT task, NOT a re-generation: the reference cell is the exact picture the user already approved.`;

  const referenceLine = preCropped
    ? `REFERENCE: the provided image IS the photo to enhance — it already shows ONLY this single cell. Treat every pixel of it as the SOURCE OF TRUTH and keep the entire frame; do NOT crop, zoom, re-frame, or cut anything out.`
    : `REFERENCE CELL: position ${position}, counting left to right, top to bottom — row ${row}, column ${col} (${corner}). Crop to this cell and treat its pixels as the SOURCE OF TRUTH.`;

  return `${openingLine}

${referenceLine}

WHAT TO PRESERVE EXACTLY (do NOT change any of these):
- The exact same composition, framing, camera angle, and crop
- The exact same outfit / wardrobe — every garment, color, cut, fabric, and accessory stays identical (do not add, remove, swap, or restyle clothing)
- The exact same background, location, set dressing, props, and every object in frame
- The exact same pose, body position, hands, and facial expression
- The exact same colors, palette, tonal range, and lighting direction
- For object/flat-lay cells: the exact same hero subject and layout

WHAT TO IMPROVE (this is the ONLY thing you may change):
- Increase resolution and sharpness; add realistic fine detail and texture (skin, fabric weave, material surfaces, edges)
- Remove the blur, softness, and compression artifacts of the small preview cell
- Do NOT introduce new elements, new scenery, or any creative reinterpretation

CONTEXT (describes the approved cell — use only to understand what you are enhancing, never to override what is visible):
${brief}

SHOT TYPE: ${typeDesc}

OUTPUT REQUIREMENTS:
- Output ONLY this single standalone photo — no grid lines, no other cells, no borders
- The result must look like the SAME photo as the reference cell, just at much higher resolution and clarity
- Keep the ${aesthetic} aesthetic, palette (${palette}), and ${lightType} lighting consistent with the reference cell — do not re-grade or shift colors
- Ultra-detailed, photorealistic, shot with a professional 8K camera
- Tall vertical portrait format, as close to a 9:16 ratio as possible: the subject and scene must fill the entire frame edge-to-edge with NO letterboxing, NO black or white bars, and NO borders${portraitInstruction}`;
}
