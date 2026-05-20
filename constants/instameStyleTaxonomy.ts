import type { InstaMeStyleCategory, InstaMeStylePreset } from "@shared/instame-style-presets";

type StyleAudience = InstaMeStyleCategory | "any";

export type StyleVibeCategory = {
  id: string;
  label: string;
  shortLabel: string;
  tagline: string;
  icon: string;
  accent: string;
  gradient: [string, string, string];
  audience?: StyleAudience;
  keywords: string[];
};

export type PhotoPackPreset = {
  id: string;
  label: string;
  count: 4 | 6;
  vibeId: string;
  icon: string;
  accent: string;
  gradient: [string, string, string];
  subtitle: string;
  example: string;
};

export const STYLE_VIBE_CATEGORIES: StyleVibeCategory[] = [
  {
    id: "all",
    label: "All Looks",
    shortLabel: "All",
    tagline: "The full Chicoo wall, from clean selfies to cinematic editorials.",
    icon: "apps-outline",
    accent: "#FFFFFF",
    gradient: ["rgba(255,255,255,0.14)", "rgba(255,79,125,0.10)", "rgba(0,229,204,0.10)"],
    audience: "any",
    keywords: [],
  },
  {
    id: "signature_editorial",
    label: "Signature Muse",
    shortLabel: "Muse",
    tagline: "Polished closeups, studio light, magazine-style energy.",
    icon: "aperture-outline",
    accent: "#FFD6EA",
    gradient: ["rgba(255,214,234,0.24)", "rgba(96,45,76,0.16)", "rgba(0,0,0,0.84)"],
    keywords: ["editorial", "studio", "portrait", "closeup", "close up", "cinematic", "fashion", "lacquer", "collage", "minimalist"],
  },
  {
    id: "flash_night",
    label: "Flash Night",
    shortLabel: "Flash",
    tagline: "After-dark flash, Y2K grain, paparazzi glow.",
    icon: "flash-outline",
    accent: "#7EF3FF",
    gradient: ["rgba(126,243,255,0.22)", "rgba(46,76,88,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["flash", "night", "corridor", "noir", "dark", "analog", "bmw", "fur", "glove", "black outfit", "embankment", "bridge"],
  },
  {
    id: "old_money_luxe",
    label: "Old Money Luxe",
    shortLabel: "Luxe",
    tagline: "Quiet luxury, polished neutrals, hotel and city elegance.",
    icon: "diamond-outline",
    accent: "#F4D7A1",
    gradient: ["rgba(244,215,161,0.24)", "rgba(72,58,34,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["luxury", "hotel", "mercedes", "jewelry", "suit", "blazer", "wine", "roof", "elegant", "mediterranean", "polished", "chic", "balcony", "convertible", "escalator", "mall"],
  },
  {
    id: "clean_glow",
    label: "Clean Glow",
    shortLabel: "Glow",
    tagline: "Bright skin, soft light, polished everyday beauty.",
    icon: "sunny-outline",
    accent: "#F8FFB8",
    gradient: ["rgba(248,255,184,0.22)", "rgba(118,145,107,0.14)", "rgba(0,0,0,0.86)"],
    keywords: ["soft", "dreamy", "natural", "bright", "white", "pastel", "clean", "smiling", "sunglasses", "long hair closeup", "natural glam"],
  },
  {
    id: "cafe_lifestyle",
    label: "Cafe Lifestyle",
    shortLabel: "Cafe",
    tagline: "Coffee, breakfast, terrace light, effortless social posts.",
    icon: "cafe-outline",
    accent: "#FFC6A7",
    gradient: ["rgba(255,198,167,0.22)", "rgba(104,59,40,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["coffee", "cafe", "breakfast", "table", "terrace", "stone ledge", "popcorn", "cinema", "outdoor cafe"],
  },
  {
    id: "street_luxe",
    label: "Street Luxe",
    shortLabel: "Street",
    tagline: "Urban movement, denim, leather, confident sidewalk frames.",
    icon: "walk-outline",
    accent: "#B4C7FF",
    gradient: ["rgba(180,199,255,0.22)", "rgba(46,54,93,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["street", "crosswalk", "sidewalk", "denim", "leather", "urban", "steps", "bench", "walk", "wide pants", "architecture", "wall", "crouching", "monochromatic"],
  },
  {
    id: "mirror_selfies",
    label: "Mirror Selfies",
    shortLabel: "Mirror",
    tagline: "Creator-style mirror frames, store fitting rooms, quick outfit energy.",
    icon: "scan-outline",
    accent: "#C9B8FF",
    gradient: ["rgba(201,184,255,0.22)", "rgba(68,48,108,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["mirror", "selfie", "bathroom", "overhead", "taking selfie", "room mirror", "store"],
  },
  {
    id: "travel_escape",
    label: "Travel Escape",
    shortLabel: "Travel",
    tagline: "Airport, cliffs, balconies, scooters and city-break frames.",
    icon: "airplane-outline",
    accent: "#AEEAD6",
    gradient: ["rgba(174,234,214,0.22)", "rgba(36,86,72,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["airport", "mountain", "cliff", "rocks", "scooter", "balcony", "mediterranean", "convertible", "outdoor", "park", "sky", "magnolia", "sakura", "terrace", "doorway"],
  },
  {
    id: "car_luxe",
    label: "Car Luxe",
    shortLabel: "Car",
    tagline: "Dashboard glow, luxury rides, night-drive portraits.",
    icon: "car-sport-outline",
    accent: "#9DE8FF",
    gradient: ["rgba(157,232,255,0.22)", "rgba(28,66,81,0.18)", "rgba(0,0,0,0.86)"],
    keywords: ["car", "bmw", "mercedes", "convertible", "drive", "ride"],
  },
  {
    id: "soft_romantic",
    label: "Soft Romantic",
    shortLabel: "Romance",
    tagline: "Flowers, blush tones, soft gestures and romantic closeups.",
    icon: "flower-outline",
    accent: "#FFC1D7",
    gradient: ["rgba(255,193,215,0.24)", "rgba(108,46,66,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["rose", "roses", "tulip", "tulips", "flower", "ranunculus", "lavender", "lilac", "hibiscus", "sakura", "magnolia", "kiss", "pink", "milk bath", "foam bath"],
  },
  {
    id: "cozy_home",
    label: "Cozy Home",
    shortLabel: "Cozy",
    tagline: "Bedroom, sofa, soft indoor frames, intimate but polished.",
    icon: "bed-outline",
    accent: "#FFE0B8",
    gradient: ["rgba(255,224,184,0.22)", "rgba(86,59,41,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["bed", "sofa", "room", "floor", "chair", "curlers", "lying", "cozy", "bathroom", "bath"],
  },
  {
    id: "event_glam",
    label: "Event Glam",
    shortLabel: "Glam",
    tagline: "Party shine, red dresses, jewelry, makeup and evening polish.",
    icon: "sparkles-outline",
    accent: "#FF9BC5",
    gradient: ["rgba(255,155,197,0.24)", "rgba(116,38,78,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["glam", "red dress", "cinema", "popcorn", "wine", "black elegant", "jewelry", "makeup", "dress", "luxurious"],
  },
  {
    id: "life_moments",
    label: "Life Moments",
    shortLabel: "Moments",
    tagline: "Warm personal frames for family, flowers and memory-like posts.",
    icon: "heart-outline",
    accent: "#FFD1A6",
    gradient: ["rgba(255,209,166,0.22)", "rgba(114,69,37,0.16)", "rgba(0,0,0,0.86)"],
    keywords: ["mom", "kids", "son", "dog", "horse", "flower", "lilacs", "hibiscus"],
  },
  {
    id: "couple_shoots",
    label: "Couple Shoots",
    shortLabel: "Couples",
    tagline: "Two-person frames built for matching drops and shared posts.",
    icon: "people-outline",
    accent: "#FFB3E6",
    gradient: ["rgba(255,179,230,0.22)", "rgba(86,42,94,0.16)", "rgba(0,0,0,0.86)"],
    audience: "couple",
    keywords: ["couple", "fitting room", "mixed style"],
  },
  {
    id: "men_editorial",
    label: "Men Editorial",
    shortLabel: "Men",
    tagline: "Moody street, clean portraits and confident masculine frames.",
    icon: "man-outline",
    accent: "#D7F3FF",
    gradient: ["rgba(215,243,255,0.22)", "rgba(48,74,88,0.16)", "rgba(0,0,0,0.86)"],
    audience: "men",
    keywords: ["men", "hoodie", "tee", "overcoat", "turtleneck", "buzz", "urban", "street", "architecture", "newspaper"],
  },
];

export const PHOTO_PACK_PRESETS: PhotoPackPreset[] = [
  {
    id: "signature_four",
    label: "Signature 4",
    count: 4,
    vibeId: "signature_editorial",
    icon: "grid-outline",
    accent: "#FFD6EA",
    gradient: ["rgba(255,214,234,0.26)", "rgba(255,79,125,0.14)", "rgba(0,0,0,0.86)"],
    subtitle: "One aesthetic, four polished feed posts.",
    example: "Cover closeup, half-body editorial, seated frame, detail crop.",
  },
  {
    id: "story_drop_six",
    label: "Story Drop 6",
    count: 6,
    vibeId: "flash_night",
    icon: "layers-outline",
    accent: "#7EF3FF",
    gradient: ["rgba(126,243,255,0.26)", "rgba(255,79,125,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "Six frames that feel like one night-out story.",
    example: "Mirror flash, closeup, walking shot, car light, grainy portrait, final hero.",
  },
  {
    id: "clean_grid_four",
    label: "Clean Grid 4",
    count: 4,
    vibeId: "clean_glow",
    icon: "albums-outline",
    accent: "#F8FFB8",
    gradient: ["rgba(248,255,184,0.24)", "rgba(126,243,255,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "Soft, bright, consistent posts for a reset grid.",
    example: "Beauty closeup, daylight selfie, calm seated frame, soft portrait.",
  },
  {
    id: "luxe_weekend_six",
    label: "Luxe Weekend 6",
    count: 6,
    vibeId: "old_money_luxe",
    icon: "diamond-outline",
    accent: "#F4D7A1",
    gradient: ["rgba(244,215,161,0.26)", "rgba(255,198,167,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "Hotel, city and quiet-luxury frames ready for a carousel.",
    example: "Hotel entrance, city walk, jewelry closeup, terrace, car frame, refined portrait.",
  },
  {
    id: "city_muse_six",
    label: "City Muse 6",
    count: 6,
    vibeId: "street_luxe",
    icon: "trail-sign-outline",
    accent: "#B4C7FF",
    gradient: ["rgba(180,199,255,0.24)", "rgba(201,184,255,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "A full urban drop with movement and outfit-led frames.",
    example: "Crosswalk, wall portrait, steps, street walk, denim detail, confident hero.",
  },
  {
    id: "couple_drop_four",
    label: "Couple Drop 4",
    count: 4,
    vibeId: "couple_shoots",
    icon: "people-outline",
    accent: "#FFB3E6",
    gradient: ["rgba(255,179,230,0.24)", "rgba(126,243,255,0.10)", "rgba(0,0,0,0.86)"],
    subtitle: "Four matching frames for a shared post or carousel.",
    example: "Close pose, walking frame, candid laugh, cinematic final.",
  },
];

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ");
}

function getPresetSearchText(preset: InstaMeStylePreset): string {
  return normalizeSearchText(
    [
      preset.id,
      preset.label,
      preset.subtitle,
      preset.promptHint,
      preset.cover,
      preset.representativeImage,
      ...(preset.examples || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getPresetAudience(preset: InstaMeStylePreset): InstaMeStyleCategory {
  const text = getPresetSearchText(preset);

  if ((preset.category || "").toLowerCase() === "men" || preset.id.startsWith("men_")) {
    return "men";
  }

  if ((preset.category || "").toLowerCase() === "couple" || preset.id.startsWith("couple") || text.includes("couple ")) {
    return "couple";
  }

  return "women";
}

function audienceMatches(preset: InstaMeStylePreset, audience: StyleAudience | undefined): boolean {
  if (!audience || audience === "any") {
    return true;
  }

  return getPresetAudience(preset) === audience;
}

export function matchStyleVibe(preset: InstaMeStylePreset, vibeId: string): boolean {
  const vibe = STYLE_VIBE_CATEGORIES.find((item) => item.id === vibeId) || STYLE_VIBE_CATEGORIES[0];

  if (vibe.id === "all") {
    return true;
  }

  const audience = vibe.audience || "women";
  if (!audienceMatches(preset, audience)) {
    return false;
  }

  const text = getPresetSearchText(preset);
  return vibe.keywords.some((keyword) => text.includes(normalizeSearchText(keyword)));
}

export function getStyleVibeById(vibeId: string | null | undefined): StyleVibeCategory {
  return STYLE_VIBE_CATEGORIES.find((vibe) => vibe.id === vibeId) || STYLE_VIBE_CATEGORIES[0];
}

export function getPrimaryStyleVibeId(preset: InstaMeStylePreset): string {
  const match = STYLE_VIBE_CATEGORIES.find((vibe) => vibe.id !== "all" && matchStyleVibe(preset, vibe.id));
  return match?.id || "all";
}

export function getStylePresetPreviewImages(preset: InstaMeStylePreset | null | undefined): string[] {
  if (!preset) {
    return [];
  }

  const seen = new Set<string>();
  return [preset.cover, preset.representativeImage, ...(preset.examples || [])]
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

export function getPhotoPackPreviewImages(
  pack: PhotoPackPreset,
  presets: InstaMeStylePreset[],
  limit = 4,
): string[] {
  const seen = new Set<string>();
  const images: string[] = [];

  for (const preset of presets) {
    if (!matchStyleVibe(preset, pack.vibeId)) {
      continue;
    }

    for (const image of getStylePresetPreviewImages(preset)) {
      if (!seen.has(image)) {
        seen.add(image);
        images.push(image);
      }

      if (images.length >= limit) {
        return images;
      }
    }
  }

  return images;
}
