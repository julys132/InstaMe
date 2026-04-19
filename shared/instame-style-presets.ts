import type { InstaMeQualityTier } from "./instame-pricing";

export type InstaMeRequestedModel = {
  provider: "openai" | "together" | "reve";
  model: string;
  displayName: string;
};

export type InstaMePromptVariant = {
  id: string;
  label: string;
  prompt: string;
  requestedModels: InstaMeRequestedModel[];
};

export type InstaMeStyleCategory = "women" | "men" | "couple";

export type InstaMeStylePreset = {
  id: string;
  label: string;
  subtitle: string;
  category?: InstaMeStyleCategory;
  qualityTier?: InstaMeQualityTier;
  promptHint: string;
  cover?: string;
  representativeImage: string;
  examples: string[];
  promptFile?: string;
  promptVariants?: InstaMePromptVariant[];
  promptOnlyAfterFirstUse?: boolean;
};

export const INSTAME_OWN_STYLE_ID = "own_style";

export const INSTAME_STYLE_PRESETS: InstaMeStylePreset[] = [
  {
    id: "old_money",
    label: "Old Money",
    subtitle: "Timeless tailoring and refined neutrals",
    qualityTier: "premium",
    promptHint:
      "quiet old-money elegance, tailored silhouettes, premium fabrics, minimal luxury accessories",
    representativeImage:
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "retro",
    label: "Retro",
    subtitle: "Vintage vibe with film-like warmth",
    qualityTier: "premium",
    promptHint: "retro editorial mood, soft grain feeling, vintage styling cues, analog-inspired color",
    representativeImage:
      "https://images.unsplash.com/photo-1464863979621-258859e62245?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1464863979621-258859e62245?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "glam",
    label: "Glam",
    subtitle: "Polished beauty and statement details",
    qualityTier: "premium",
    promptHint: "high-end glam editorial, sculpted light, clean skin texture, polished luxury finish",
    representativeImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1488716820095-cbe80883c496?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "selfie",
    label: "Selfie",
    subtitle: "Natural face-first premium selfie look",
    qualityTier: "premium",
    promptHint:
      "clean premium selfie aesthetic, flattering light, natural skin texture, subtle makeup refinement",
    representativeImage:
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521146764736-56c929d59c83?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "in_car_selfie",
    label: "In-Car Selfie",
    subtitle: "Luxury car ambience with elegant light",
    qualityTier: "premium",
    promptHint:
      "inside premium car selfie look, realistic in-car reflections, elegant contrast, social-ready framing",
    representativeImage:
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=1200&auto=format&fit=crop",
    ],
  },
  {
    id: "street_luxe",
    label: "Street Luxe",
    subtitle: "Modern city chic with premium edge",
    qualityTier: "premium",
    promptHint: "urban luxury editorial, crisp styling, clean structure, premium street-chic mood",
    representativeImage:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1000&auto=format&fit=crop",
    examples: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1495385794356-15371f348c31?q=80&w=1200&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?q=80&w=1200&auto=format&fit=crop",
    ],
  },
];

export function findInstaMeStylePresetById(id: string): InstaMeStylePreset | undefined {
  return INSTAME_STYLE_PRESETS.find((preset) => preset.id === id);
}
