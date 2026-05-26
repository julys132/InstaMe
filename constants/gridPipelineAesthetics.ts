/**
 * Grid Pipeline Aesthetics
 * Curated aesthetic options for the Two-Step AI Grid Pipeline.
 * Each entry maps directly to the `aesthetic` parameter in /api/instame/grid-pipeline/plan.
 *
 * Add new entries here as more aesthetic folders are added to the reference library.
 */

export type GridPipelineAesthetic = {
  /** Unique identifier (matches aesthetic name used in the pipeline system prompt) */
  id: string;
  /** Display label shown in the UI */
  label: string;
  /** Short label for rail/chip display */
  shortLabel: string;
  /** One-line description shown on the card */
  tagline: string;
  /** Suggested default palette to pre-fill in the form */
  defaultPalette: string;
  /** Suggested default light type */
  defaultLightType: string;
  /** Ionicon name for the card icon */
  icon: string;
  /** Accent color (hex) */
  accent: string;
  /** Three-stop gradient for card background */
  gradient: [string, string, string];
  /**
   * Vocabulary used in system prompts to anchor Gemini Flash's shot descriptions.
   * These keywords are injected when the user selects this aesthetic.
   */
  promptKeywords: string[];
};

export const GRID_PIPELINE_AESTHETICS: GridPipelineAesthetic[] = [
  {
    id: "Dark Academia",
    label: "Dark Academia",
    shortLabel: "Dark Acad.",
    tagline: "Moody libraries, candlelight, scholarly vintage energy.",
    defaultPalette: "deep brown, charcoal, burgundy, aged ivory, dark wood",
    defaultLightType: "warm candlelight glow, moody amber library light",
    icon: "book-outline",
    accent: "#C2A46E",
    gradient: [
      "rgba(80,55,30,0.82)",
      "rgba(50,30,18,0.90)",
      "rgba(10,8,5,0.97)",
    ],
    promptKeywords: [
      "antique library shelves",
      "vintage leather armchairs",
      "candle glow",
      "dark wood paneling",
      "scholarly architecture",
      "moody editorial",
      "aged paper texture",
      "burgundy velvet",
      "wrought iron details",
      "intellectual refinement",
    ],
  },
  {
    id: "Desert Oasis Luxury",
    label: "Desert Oasis Luxury",
    shortLabel: "Desert Oasis",
    tagline: "Terracotta, sunlit pools, warm arid luxury.",
    defaultPalette: "terracotta, sandy beige, dusty rose, warm gold",
    defaultLightType: "golden desert hour, warm haze, sun-drenched",
    icon: "sunny-outline",
    accent: "#E2A96B",
    gradient: [
      "rgba(180,110,55,0.72)",
      "rgba(130,75,30,0.88)",
      "rgba(20,12,6,0.96)",
    ],
    promptKeywords: [
      "desert resort",
      "clay and adobe walls",
      "palm tree shadows",
      "rattan and wicker",
      "infinity pool",
      "warm arid luxury",
      "sand dune backdrop",
      "Moroccan tilework",
      "linen and cotton",
      "golden hour haze",
    ],
  },
  {
    id: "Luxury European Lifestyle",
    label: "Luxury European Lifestyle",
    shortLabel: "European Luxe",
    tagline: "Parisian streets, Italian piazzas, champagne lifestyle.",
    defaultPalette: "warm beige, soft white, cobblestone grey, champagne",
    defaultLightType: "soft European afternoon light, golden Parisian glow",
    icon: "wine-outline",
    accent: "#D4B896",
    gradient: [
      "rgba(160,130,90,0.62)",
      "rgba(90,70,45,0.86)",
      "rgba(8,7,5,0.96)",
    ],
    promptKeywords: [
      "Parisian boulevard",
      "Italian piazza",
      "luxury boutique façade",
      "café terrasse",
      "cobblestone street",
      "European architecture",
      "fashion week energy",
      "ornate balcony",
      "champagne and croissants",
      "old-world elegance",
    ],
  },
  {
    id: "Minimalist Scandinavian Wellness",
    label: "Minimalist Scandinavian Wellness",
    shortLabel: "Scandi Wellness",
    tagline: "Clean whites, birch wood, hygge and Nordic calm.",
    defaultPalette: "crisp white, ash grey, nude, warm birch, sage",
    defaultLightType: "soft diffused Nordic daylight, clean natural light",
    icon: "leaf-outline",
    accent: "#A8BBA8",
    gradient: [
      "rgba(140,160,140,0.44)",
      "rgba(80,100,80,0.72)",
      "rgba(10,14,10,0.96)",
    ],
    promptKeywords: [
      "clean white minimalist interior",
      "natural birch wood",
      "hygge atmosphere",
      "wellness retreat",
      "organic linen textures",
      "Nordic simplicity",
      "stone and concrete",
      "indoor plants",
      "floor-to-ceiling windows",
      "calm and intentional",
    ],
  },
  {
    id: "Old Money Luxury",
    label: "Old Money Luxury",
    shortLabel: "Old Money",
    tagline: "Quiet luxury, tailored elegance, understated wealth.",
    defaultPalette: "muted beige, ivory, warm grey, navy, camel",
    defaultLightType: "soft golden afternoon, understated diffused light",
    icon: "diamond-outline",
    accent: "#C8B89A",
    gradient: [
      "rgba(150,130,100,0.58)",
      "rgba(80,65,40,0.86)",
      "rgba(8,7,5,0.96)",
    ],
    promptKeywords: [
      "quiet luxury",
      "heritage architectural details",
      "tailored silhouettes",
      "classic European manor",
      "equestrian references",
      "understated wealth",
      "cashmere and silk",
      "monogrammed accessories",
      "private members club",
      "refined restraint",
    ],
  },
];

/** Returns an aesthetic by its id, or undefined */
export function getGridPipelineAestheticById(
  id: string,
): GridPipelineAesthetic | undefined {
  return GRID_PIPELINE_AESTHETICS.find((a) => a.id === id);
}
