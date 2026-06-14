// Instagram Grid Pack — prompt building service
// Handles brief → shot plan → individual prompts for preview and render.

import {
  INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST,
  INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST,
} from "../../shared/instame-pricing";

export type GridPackIdentityMode = "portrait_reference" | "inspired_muse" | "fictional_muse";

export type GridPackRequiredElementId =
  | "outfit"
  | "location"
  | "car"
  | "accessories"
  | "mirror"
  | "detail";

export type GridPackBrief = {
  packId: string;
  packLabel: string;
  packCount: number;
  vibeId: string;
  vibeLabel: string;
  requiredElementIds: GridPackRequiredElementId[];
  notes: string;
  identityMode: GridPackIdentityMode;
};

export type GridPackShot = {
  index: number;
  shotType: string;
  shotLabel: string;
  shotDescription: string;
  assignedElement: GridPackRequiredElementId | null;
};

// ─── Vibe prompt hints ────────────────────────────────────────────────────────

const VIBE_PROMPT_HINTS: Record<string, string> = {
  signature_editorial:
    "polished editorial photography, studio-quality light, magazine energy, clean skin, cinematic composition, fashion-forward",
  flash_night:
    "night flash photography, Y2K grain, after-dark paparazzi energy, high contrast, dark backgrounds",
  old_money_luxe:
    "quiet luxury, muted beige/grey/black palette, European elegance, cinematic editorial, subtle film grain, premium but natural, rich-girl aesthetic",
  clean_glow:
    "soft natural light, bright skin tone, airy and clean palette, effortless everyday beauty, fresh glow",
  cafe_lifestyle:
    "café terrace, warm morning light, latte art, effortless Parisian lifestyle, candid warmth, relaxed aesthetic",
  street_luxe:
    "urban movement, confident street presence, dynamic composition, denim and leather styling, city backdrop",
  mirror_selfies:
    "creator mirror frame, fitting room or hotel bathroom, outfit reveal energy, casual luxury, iphone aesthetic",
  travel_escape:
    "sun-drenched travel content, architectural backgrounds, Mediterranean or European city, golden hour light",
  car_luxe:
    "luxury car interior or exterior, dashboard glow, cinematic automotive perspective, premium lifestyle",
  soft_romantic:
    "blush tones, floral details, soft gestures, romantic editorial, warm haze, feminine elegance",
  cozy_home:
    "intimate interior frames, soft bedroom or sofa setting, polished homebody aesthetic, warm tones",
  event_glam:
    "party shine, glam evening look, jewelry and dress detail, polished event photography, sparkle",
  life_moments:
    "warm personal frames, emotional and natural, memory-like quality, candid warmth, storytelling",
  couple_shoots:
    "synchronized couple energy, shared chemistry, cinematic two-person composition, matching aesthetic",
  men_editorial:
    "moody urban street portraits, confident masculine framing, editorial menswear, architectural backdrops",
};

const REQUIRED_ELEMENT_LABELS: Record<GridPackRequiredElementId, string> = {
  outfit: "signature outfit clearly visible",
  location: "recognizable location in frame",
  car: "luxury car or ride visible",
  accessories: "jewelry or accessory close-up",
  mirror: "mirror selfie framing",
  detail: "stylish detail crop — fabric, jewelry, or shoes",
};

// ─── Shot recipes per pack ────────────────────────────────────────────────────

type ShotTemplate = Omit<GridPackShot, "index" | "assignedElement">;

const PACK_SHOT_RECIPES: Record<string, ShotTemplate[]> = {
  signature_four: [
    {
      shotType: "cover_portrait",
      shotLabel: "Cover Portrait",
      shotDescription:
        "tight editorial portrait, direct gaze, strong directional light, magazine-front energy",
    },
    {
      shotType: "half_body",
      shotLabel: "Half-Body Editorial",
      shotDescription:
        "half-body fashion frame, full outfit prominent, confident posture",
    },
    {
      shotType: "seated_lifestyle",
      shotLabel: "Seated Lifestyle",
      shotDescription:
        "candid seated moment, natural relaxed expression, environment visible behind",
    },
    {
      shotType: "detail_crop",
      shotLabel: "Detail Crop",
      shotDescription:
        "extreme close-up detail — jewelry, bag strap, shoes or fabric texture",
    },
  ],
  story_drop_six: [
    {
      shotType: "mirror_flash",
      shotLabel: "Mirror Flash",
      shotDescription:
        "hotel or home mirror selfie with flash, full outfit reveal, flash reflection visible",
    },
    {
      shotType: "face_closeup",
      shotLabel: "Face Close-Up",
      shotDescription:
        "editorial face close-up, sharp eyes, dramatic or soft directional light",
    },
    {
      shotType: "walking_shot",
      shotLabel: "Walking Shot",
      shotDescription:
        "mid-movement walking frame, confident stride, urban or venue backdrop",
    },
    {
      shotType: "blurry_flash",
      shotLabel: "Blurry Flash Moment",
      shotDescription:
        "intentionally blurry flash candid, night-out or party energy, motion blur",
    },
    {
      shotType: "grainy_portrait",
      shotLabel: "Grainy Portrait",
      shotDescription:
        "high-grain analog-style portrait, intimate scale, warm or desaturated tone",
    },
    {
      shotType: "hero_final",
      shotLabel: "Hero Final",
      shotDescription:
        "signature composed hero shot, full look visible, best editorial energy of the set",
    },
  ],
  clean_grid_four: [
    {
      shotType: "beauty_closeup",
      shotLabel: "Beauty Close-Up",
      shotDescription:
        "face and neck beauty shot, clean skin, natural makeup, soft front light, no shadows",
    },
    {
      shotType: "daylight_selfie",
      shotLabel: "Daylight Selfie",
      shotDescription:
        "bright natural-light selfie, relaxed authentic expression, outdoor or window light",
    },
    {
      shotType: "calm_seated",
      shotLabel: "Calm Seated",
      shotDescription:
        "peaceful seated frame in a bright minimal space — café, desk or living room",
    },
    {
      shotType: "soft_portrait",
      shotLabel: "Soft Portrait",
      shotDescription:
        "full or half-body portrait in soft diffused light, neutral background, clean and minimal",
    },
  ],
  luxe_weekend_six: [
    {
      shotType: "hotel_entrance",
      shotLabel: "Hotel Entrance",
      shotDescription:
        "luxury hotel lobby or entrance, marble architecture, polished arrival moment",
    },
    {
      shotType: "city_walk",
      shotLabel: "City Walk",
      shotDescription:
        "elegant European city walk, polished outfit, cobblestone or wide boulevard backdrop",
    },
    {
      shotType: "jewelry_closeup",
      shotLabel: "Jewelry Close-Up",
      shotDescription:
        "hand or neck close-up focusing on gold jewelry — watch, ring, or necklace",
    },
    {
      shotType: "terrace_moment",
      shotLabel: "Terrace Moment",
      shotDescription:
        "luxury terrace or hotel balcony, city or sea view, relaxed elegant posture",
    },
    {
      shotType: "car_frame",
      shotLabel: "Car Frame",
      shotDescription:
        "luxury car door, window or interior — Mercedes G-Class, 911 or equivalent",
    },
    {
      shotType: "refined_portrait",
      shotLabel: "Refined Portrait",
      shotDescription:
        "polished editorial portrait in a quiet luxury setting — understated power and elegance",
    },
  ],
  city_muse_six: [
    {
      shotType: "crosswalk",
      shotLabel: "Crosswalk",
      shotDescription:
        "dynamic crosswalk shot, mid-movement, urban energy, confident stride",
    },
    {
      shotType: "wall_portrait",
      shotLabel: "Wall Portrait",
      shotDescription:
        "posed against textured urban wall, direct gaze, architectural geometric framing",
    },
    {
      shotType: "steps_sit",
      shotLabel: "Steps Sit",
      shotDescription:
        "sitting or leaning on outdoor steps, layered city depth in background",
    },
    {
      shotType: "street_walk",
      shotLabel: "Street Walk",
      shotDescription:
        "candid street walk, mid-movement, natural expression, full look visible",
    },
    {
      shotType: "outfit_detail",
      shotLabel: "Outfit Detail",
      shotDescription:
        "close-up of outfit detail — jacket collar, belt, boots or bag handle",
    },
    {
      shotType: "hero_confident",
      shotLabel: "Hero Confident",
      shotDescription:
        "strong full or half-body hero shot, urban backdrop, full look composed confidently",
    },
  ],
  couple_drop_four: [
    {
      shotType: "close_pose",
      shotLabel: "Close Pose",
      shotDescription:
        "intimate close pose, faces near each other, genuine connection and chemistry",
    },
    {
      shotType: "walking_couple",
      shotLabel: "Walking Frame",
      shotDescription:
        "walking side by side, hands held or shoulders touching, light and dynamic movement",
    },
    {
      shotType: "candid_laugh",
      shotLabel: "Candid Laugh",
      shotDescription:
        "genuine candid laughter moment, real emotion, warm and natural light",
    },
    {
      shotType: "cinematic_final",
      shotLabel: "Cinematic Final",
      shotDescription:
        "wide cinematic two-shot, environment prominent, couple as subjects in the scene",
    },
  ],
  luxe_grid_nine: [
    {
      shotType: "editorial_portrait",
      shotLabel: "Editorial Portrait",
      shotDescription:
        "cover-quality editorial portrait, strong direct gaze, polished directional light",
    },
    {
      shotType: "mirror_selfie",
      shotLabel: "Mirror Selfie",
      shotDescription:
        "hotel or home mirror selfie, full outfit visible, clean reflection",
    },
    {
      shotType: "cafe_candid",
      shotLabel: "Café Candid",
      shotDescription:
        "candid café moment, coffee cup in hand, warm ambient interior light",
    },
    {
      shotType: "jewelry_detail",
      shotLabel: "Jewelry Detail",
      shotDescription:
        "hand or neck close-up on gold jewelry — ring, necklace or earring",
    },
    {
      shotType: "street_walk",
      shotLabel: "Street Walk",
      shotDescription:
        "confident street walking shot, full outfit look, European or urban street backdrop",
    },
    {
      shotType: "hotel_interior",
      shotLabel: "Hotel Interior",
      shotDescription:
        "luxury hotel interior frame — lobby corridor, suite bed or ornate staircase",
    },
    {
      shotType: "over_shoulder",
      shotLabel: "Over-Shoulder",
      shotDescription:
        "over-the-shoulder walking shot, partial face visible, elegant composition",
    },
    {
      shotType: "blurry_flash",
      shotLabel: "Flash Moment",
      shotDescription:
        "intentionally blurry flash candid, party or night energy, motion blur",
    },
    {
      shotType: "hero_wide",
      shotLabel: "Hero Wide",
      shotDescription:
        "wide editorial hero shot, full environment visible, signature composed pose",
    },
  ],
};

const FALLBACK_SHOT_RECIPE: ShotTemplate[] = PACK_SHOT_RECIPES["signature_four"];

// ─── Public helpers ───────────────────────────────────────────────────────────

export function resolvePackShotRecipe(packId: string): ShotTemplate[] {
  return PACK_SHOT_RECIPES[packId] ?? FALLBACK_SHOT_RECIPE;
}

export function getVibePromptHint(vibeId: string): string {
  return VIBE_PROMPT_HINTS[vibeId] ?? vibeId.replace(/_/g, " ");
}

/**
 * Distribute required elements across shot slots.
 * First elements go to first shots; unassigned shots get null.
 */
export function assignElementsToShots(
  shotCount: number,
  requiredElementIds: GridPackRequiredElementId[],
): (GridPackRequiredElementId | null)[] {
  const assignments: (GridPackRequiredElementId | null)[] = Array(shotCount).fill(null);
  let elementIndex = 0;
  for (let shotIndex = 0; shotIndex < shotCount && elementIndex < requiredElementIds.length; shotIndex++) {
    assignments[shotIndex] = requiredElementIds[elementIndex];
    elementIndex++;
  }
  return assignments;
}

/**
 * Build the full shot plan (list of GridPackShot) for a given brief.
 */
export function buildGridPackShotPlan(brief: GridPackBrief): GridPackShot[] {
  const recipe = resolvePackShotRecipe(brief.packId);
  const elementAssignments = assignElementsToShots(recipe.length, brief.requiredElementIds);

  return recipe.map((template, index) => ({
    ...template,
    index,
    assignedElement: elementAssignments[index],
  }));
}

/**
 * Build a prompt for the Instagram grid PREVIEW image.
 * This produces a single composite image resembling an Instagram profile grid.
 */
export function buildGridPreviewPrompt(brief: GridPackBrief): string {
  const vibeHint = getVibePromptHint(brief.vibeId);
  const shots = buildGridPackShotPlan(brief);
  const count = shots.length;
  const cols = count <= 4 ? 2 : 3;
  const rows = count <= 4 ? 2 : count <= 6 ? 2 : 3;

  const elementLabels = brief.requiredElementIds.map((id) => REQUIRED_ELEMENT_LABELS[id]);
  const elementsNote =
    elementLabels.length > 0
      ? `Required visual elements distributed across the grid: ${elementLabels.join("; ")}.`
      : "";

  const shotDescriptions = shots
    .map((s) => `[${s.index + 1}] ${s.shotLabel}: ${s.shotDescription}`)
    .join(" | ");

  const identityNote =
    brief.identityMode === "portrait_reference"
      ? "The same woman appears in every photo with identical facial features, hair color, and general styling throughout the grid."
      : brief.identityMode === "inspired_muse"
        ? "A consistent editorial woman muse appears throughout the grid, her style inspired by the brief."
        : "A fictional editorial muse appears consistently across all photos in the grid.";

  const notesNote = brief.notes.trim() ? `Additional creative direction: ${brief.notes.trim()}.` : "";

  return [
    `Generate a photorealistic Instagram profile page screenshot showing a ${cols}×${rows} photo grid.`,
    `All ${count} photos share one cohesive aesthetic: ${vibeHint}.`,
    `Shot composition across the grid: ${shotDescriptions}.`,
    elementsNote,
    identityNote,
    notesNote,
    `The result looks like a real iPhone Instagram feed screenshot. Photos are naturally shot and edited with a consistent color palette. All ${count} photo tiles are tiled in a ${cols}-column grid filling the entire image — no UI chrome, no text, just the photo grid. Premium, authentic, ready-to-post quality.`,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Build a prompt for rendering ONE individual shot in the pack.
 * Pass hasPortraitReference=true when a portrait image will be sent alongside.
 */
export function buildGridShotRenderPrompt(options: {
  shot: GridPackShot;
  brief: GridPackBrief;
  totalShots: number;
  hasPortraitReference: boolean;
}): string {
  const { shot, brief, totalShots, hasPortraitReference } = options;
  const vibeHint = getVibePromptHint(brief.vibeId);

  const elementNote = shot.assignedElement
    ? ` This specific photo must clearly show: ${REQUIRED_ELEMENT_LABELS[shot.assignedElement]}.`
    : "";

  const identityInstruction = hasPortraitReference
    ? " Preserve the exact facial features, hair color, and hair style from the provided reference portrait."
    : brief.identityMode === "inspired_muse"
      ? " The subject is a consistent editorial woman whose look is inspired by the brief direction."
      : " The subject is a stylish editorial woman whose appearance is consistent with the pack aesthetic.";

  // Only append custom notes to the first shot to avoid repetition
  const notesNote =
    brief.notes.trim() && shot.index === 0
      ? ` Additional creative direction: ${brief.notes.trim()}.`
      : "";

  return [
    `Instagram portrait photo. Shot ${shot.index + 1} of ${totalShots} in a ${brief.vibeLabel} pack.`,
    `Shot type: ${shot.shotLabel}. ${shot.shotDescription}.`,
    `Visual aesthetic: ${vibeHint}.`,
    elementNote,
    identityInstruction,
    notesNote,
    "Tall vertical Instagram portrait format, as close to a 9:16 ratio as possible, filling the entire frame edge-to-edge with NO letterboxing, bars, or borders. Photorealistic, natural iPhone or editorial photography. No AI artifacts. Premium but authentic feed image. Ready to post on Instagram.",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Credits charged for a grid preview call (flat rate).
 * Aligned to the premium quality tier (Gemini plan + composite render).
 */
export const GRID_PREVIEW_CREDIT_COST = INSTAME_GRID_PIPELINE_COMPOSITE_CREDIT_COST;

/**
 * Credits per image for a grid render call.
 * Aligned to the premium quality tier of the GPT Image model.
 */
export const GRID_RENDER_CREDIT_COST_PER_IMAGE = INSTAME_GRID_PIPELINE_IMAGE_CREDIT_COST;
