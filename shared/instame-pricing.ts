export type InstaMeTierAvailability = "live" | "coming_soon";

export type InstaMeGenerationTier = {
  id: string;
  label: string;
  subtitle: string;
  credits: number;
  provider: string;
  model: string;
  output: string;
  badge?: string;
  availability: InstaMeTierAvailability;
};

export type InstaMeEditTier = {
  id: string;
  label: string;
  subtitle: string;
  credits: number;
  provider: string;
  model: string;
  output: string;
  badge?: string;
  availability: InstaMeTierAvailability;
};

export type InstaMePortraitEnhanceTier = {
  id: string;
  label: string;
  subtitle: string;
  credits: number;
  provider: string;
  model: string;
  output: string;
  badge?: string;
  availability: InstaMeTierAvailability;
};

export const INSTAME_GENERATION_TIERS: InstaMeGenerationTier[] = [
  {
    id: "preview",
    label: "Preview",
    subtitle: "Fast low-res test generation",
    credits: 5,
    provider: "Google",
    model: "gemini-3.1-flash-image-preview",
    output: "512 x 512",
    badge: "Live",
    availability: "live",
  },
  {
    id: "high_res",
    label: "High Res",
    subtitle: "Sharper premium export",
    credits: 9,
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "1024 x 1024",
    badge: "Live",
    availability: "live",
  },
];

export const INSTAME_EDIT_TIERS: InstaMeEditTier[] = [
  {
    id: "basic_edit",
    label: "Basic Edit",
    subtitle: "Cheapest correction pass",
    credits: 3,
    provider: "OpenAI",
    model: "gpt-image-1-mini",
    output: "1024 x 1024 low",
    badge: "Cheapest",
    availability: "live",
  },
  {
    id: "pro_edit",
    label: "Pro Edit",
    subtitle: "Best balance for face consistency",
    credits: 6,
    provider: "Together",
    model: "FLUX.1 Kontext [pro]",
    output: "1024 x 1024",
    badge: "Recommended",
    availability: "live",
  },
  {
    id: "premium_edit",
    label: "Premium Edit",
    subtitle: "Highest quality refinement pass",
    credits: 10,
    provider: "Together",
    model: "FLUX.1 Kontext [max]",
    output: "1024 x 1024+",
    badge: "Premium",
    availability: "live",
  },
];

export const INSTAME_PORTRAIT_ENHANCE_TIER: InstaMePortraitEnhanceTier = {
  id: "portrait_enhance",
  label: "Portrait Enhance",
  subtitle: "Polish your selfie before styling",
  credits: 3,
  provider: "Gemini",
  model: "gemini-3.1-flash-image-preview",
  output: "1024 x 1024",
  badge: "Live",
  availability: "live",
};

export function getLiveInstaMeGenerationTier(): InstaMeGenerationTier {
  return INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live") || INSTAME_GENERATION_TIERS[0];
}
