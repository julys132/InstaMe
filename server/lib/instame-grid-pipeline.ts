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

// ─── Types ────────────────────────────────────────────────────────────────────

export type GridPositionType = "COMPLEX" | "SIMPLE" | "MEDIUM";

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
  /** Extra free-text instructions from the user */
  extraNotes: string;
  /** Whether there is a portrait reference uploaded */
  hasPortraitReference: boolean;
};

export type GridContinuityContext = {
  aesthetic: string;
  palette: string;
  lightType: string;
  /** Condensed list of scenes already used (to avoid repetition) */
  usedScenes: string[];
  /** Condensed list of hairstyles already used */
  usedHairstyles: string[];
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

// ─── System Prompt builders ───────────────────────────────────────────────────

/**
 * Builds the rigid system prompt for Gemini Flash (Master Grid generation).
 * The AI MUST output valid JSON matching GridPlan — nothing else.
 */
export function buildMasterGridSystemPrompt(inputs: GridPipelineUserInputs): string {
  const { imageCount, aesthetic, palette, lightType, extraNotes, hasPortraitReference } = inputs;

  // Derive position assignments using the contrast matrix
  const positionMap = buildPositionMap(imageCount);

  const positionInstructions = positionMap
    .map(
      ({ position, type }) =>
        `  - Position ${position}: ${type} — ${POSITION_TYPE_RULES[type]}`,
    )
    .join("\n");

  const hairstyleList = HAIRSTYLE_BANK.join(", ");
  const angleList = ANGLE_BANK.join(", ");
  const vocabularyLine = getAestheticVocabularyLine(aesthetic);

  const portraitInstruction = hasPortraitReference
    ? "A portrait reference image of the model WILL be passed to GPT Image 2 alongside each prompt. Each imagePrompt MUST include the instruction: 'Preserve the model's face and identity exactly from the provided reference image.'"
    : "No portrait reference is available. Each imagePrompt should describe the model generically in a way that is consistent across all shots (same apparent age, skin tone, body type).";

  return `You are an expert Instagram content strategist and AI photo director.
Your ONLY task is to generate a structured JSON shot plan for a ${imageCount}-image Instagram grid.
You must output VALID JSON and NOTHING else — no markdown, no explanation, no code fences.

═══════════════════════════════════════════════
GRID PARAMETERS
═══════════════════════════════════════════════
Aesthetic: ${aesthetic}
Color palette: ${palette}
Light type: ${lightType}
Image count: ${imageCount}
${vocabularyLine ? vocabularyLine + "\n" : ""}Extra notes from user: ${extraNotes || "none"}

═══════════════════════════════════════════════
CONTRAST MATRIX (MANDATORY — do not deviate)
═══════════════════════════════════════════════
You MUST assign the correct type to every position:
${positionInstructions}

Position type rules:
- COMPLEX: medium or full-body frame with action, movement, or location rich in detail.
- SIMPLE: minimalist flat-lay, accessory macro, geometric shadow, or texture detail — NO model required.
- MEDIUM: elegant portrait or mirror selfie — tight on face/shoulders, calm and refined.

═══════════════════════════════════════════════
DIVERSITY RULES (MANDATORY)
═══════════════════════════════════════════════
Every position where the model appears MUST have:
  1. A different hairstyle (choose from: ${hairstyleList})
  2. A different camera angle (choose from: ${angleList})
  3. A different location or scene context

NO two adjacent positions may share the same hairstyle OR the same angle.

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
): string {
  const positionMap = buildPositionMap(newImageCount);

  const positionInstructions = positionMap
    .map(({ position, type }) => `  - Position ${position}: ${type}`)
    .join("\n");

  const vocabularyLine = getAestheticVocabularyLine(context.aesthetic);

  const usedScenesList = context.usedScenes.length > 0 ? context.usedScenes.join(", ") : "none";
  const usedHairstylesList = context.usedHairstyles.length > 0 ? context.usedHairstyles.join(", ") : "none";

  const portraitInstruction = hasPortraitReference
    ? "Portrait reference IS available. Include in each imagePrompt: 'Preserve the model's face and identity exactly from the provided reference image.'"
    : "No portrait reference. Describe the model generically but consistently across all shots.";

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

═══════════════════════════════════════════════
NEW GRID PARAMETERS
═══════════════════════════════════════════════
New image count: ${newImageCount}
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
4. Use FRESH camera angles — vary from: ${ANGLE_BANK.join(", ")}.
5. SIMPLE positions must be pure minimalist object/texture shots — no model.

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
    "minimalist flat-lay / accessory macro / geometric shadow / texture — no model",
  MEDIUM:
    "elegant tight portrait or mirror selfie — face/shoulders, calm composition",
};

/**
 * Maps each 1-based position to its required type following the contrast matrix.
 *
 * Matrix rule (repeating pattern):
 *   pos 1, 5, 9, 13 → COMPLEX
 *   pos 2, 4, 6, 8, 10, 12 → SIMPLE
 *   pos 3, 7, 11 → MEDIUM
 */
function buildPositionMap(count: number): Array<{ position: number; type: GridPositionType }> {
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
  const model = options.model || "gemini-2.0-flash";
  const modelName = model.startsWith("models/") ? model.slice("models/".length) : model;

  const url = `${options.geminiApiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: options.systemPrompt }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
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
export function parseGridPlan(rawJson: string, expectedCount: number): GridPlan {
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

  const shots: GridShotPlan[] = (root.shots as unknown[]).map((s, idx) => {
    const shot = s as Record<string, unknown>;
    const position = typeof shot.position === "number" ? shot.position : idx + 1;
    const type = shot.type === "COMPLEX" || shot.type === "SIMPLE" || shot.type === "MEDIUM"
      ? (shot.type as GridPositionType)
      : "COMPLEX";
    const label = typeof shot.label === "string" ? shot.label : `Shot ${position}`;
    const hairstyle = typeof shot.hairstyle === "string" ? shot.hairstyle : null;
    const angle = typeof shot.angle === "string" ? shot.angle : null;
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

  for (const shot of plan.shots) {
    if (shot.label) usedScenes.push(shot.label);
    if (shot.hairstyle) usedHairstyles.push(shot.hairstyle);
  }

  return {
    aesthetic: plan.aesthetic,
    palette: plan.palette,
    lightType: plan.lightType,
    usedScenes: [...new Set(usedScenes)],
    usedHairstyles: [...new Set(usedHairstyles)],
  };
}

// ─── Credit constants ─────────────────────────────────────────────────────────

/** 1 credit for the Gemini Flash planning step (master or continuity) */
export const GRID_PIPELINE_PLAN_CREDIT_COST = 1;

/** 1 credit per rendered image in Step 2 */
export const GRID_PIPELINE_RENDER_CREDIT_COST_PER_IMAGE = 1;

/** 2 credits for composite preview (Gemini plan + GPT composite render) */
export const GRID_PIPELINE_COMPOSITE_CREDIT_COST = 2;

/** 1 credit per image extracted from the composite */
export const GRID_PIPELINE_EXTRACT_CREDIT_COST_PER_IMAGE = 1;

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
export function buildCompositeGridPrompt(plan: GridPlan, hasPortraitReference: boolean): string {
  const totalRows = Math.ceil(plan.imageCount / GRID_COLS);

  const shotLines = plan.shots
    .map((shot) => {
      const row = Math.ceil(shot.position / GRID_COLS);
      const col = ((shot.position - 1) % GRID_COLS) + 1;
      const detail = [
        shot.label,
        shot.hairstyle ? `hairstyle: ${shot.hairstyle}` : null,
        shot.angle ? `camera angle: ${shot.angle}` : null,
      ]
        .filter(Boolean)
        .join(", ");
      return `  Position ${shot.position} (row ${row}, col ${col}): ${detail}`;
    })
    .join("\n");

  const portraitNote = hasPortraitReference
    ? "A female model with consistent identity appears in all relevant cells."
    : "A stylish female model with consistent appearance throughout appears in the relevant cells.";

  return `Create a photorealistic Instagram profile grid preview image showing exactly ${plan.imageCount} coordinated editorial photos arranged in a ${GRID_COLS}-column × ${totalRows}-row grid, exactly as they appear on an Instagram profile page.

GRID STRUCTURE: ${plan.imageCount} equal cells in ${totalRows} row${totalRows > 1 ? "s" : ""} of ${GRID_COLS} columns. Cells are separated by a thin white 1px divider (like Instagram). The grid fills the entire canvas.

AESTHETIC: ${plan.aesthetic}
COLOR PALETTE: ${plan.palette}
LIGHT TYPE: ${plan.lightType}

CELL CONTENTS (left to right, top to bottom — numbering is exact):
${shotLines}

RULES:
- All cells share identical color grading, tonal range, and aesthetic mood
- Each cell is clearly distinct but visually harmonious with all others
- ${portraitNote}
- No extra borders or margins outside the grid — the grid fills the entire image
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
  shot: { label: string; hairstyle: string | null; angle: string | null; type: string };
  hasPortrait: boolean;
  aesthetic: string;
  palette: string;
  lightType: string;
}): string {
  const { position, imageCount, shot, hasPortrait, aesthetic, palette, lightType } = params;
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
      ? "Flat-lay / object detail — no person in frame"
      : shot.type === "MEDIUM"
      ? "Tight portrait — face and shoulders, calm and refined"
      : "Full or medium body — action, movement, or rich location";

  const portraitInstruction = hasPortrait
    ? `\nCRITICAL IDENTITY RULE: The facial features, face shape, skin tone, and complete identity of any person in this image MUST belong 100% to the individual shown in the provided reference portrait. Adapt their face naturally to the scene. Never alter their identity.`
    : "";

  return `Extract and recreate at full standalone resolution the single photo at position ${position} of ${imageCount} in the Instagram grid preview (first image provided).

EXACT POSITION: position ${position}, counting left to right, top to bottom — row ${row}, column ${col} (${corner}).

TARGET CELL DETAILS:
- Scene: ${shot.label}${shot.hairstyle ? `\n- Hairstyle: ${shot.hairstyle}` : ""}${shot.angle ? `\n- Camera angle: ${shot.angle}` : ""}
- Shot type: ${typeDesc}

OUTPUT REQUIREMENTS:
- Output ONLY this single standalone photo — no grid lines, no other cells, no borders
- 100% faithful replica of the composition, subject, colors, lighting, and background from that exact cell
- Maintain the ${aesthetic} aesthetic, palette (${palette}), and ${lightType} lighting
- Ultra-detailed, photorealistic, shot with a professional 8K camera
- Vertical portrait format (4:5 ratio)${portraitInstruction}`;
}
