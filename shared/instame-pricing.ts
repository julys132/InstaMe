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
    id: "edit",
    label: "Edit",
    subtitle: "Refine your generated result",
    credits: 3,
    provider: "Together",
    model: "Google Flash Image 3.1 Preview",
    output: "1024 x 1024",
    badge: "Live",
    availability: "live",
  },
];

export const INSTAME_PORTRAIT_ENHANCE_TIER: InstaMePortraitEnhanceTier = {
  id: "portrait_enhance",
  label: "Portrait Enhance",
  subtitle: "Polish your selfie before styling",
  credits: 3,
  provider: "Together",
  model: "Google Flash Image 3.1 Preview",
  output: "1024 x 1024",
  badge: "Live",
  availability: "live",
};

export function getLiveInstaMeGenerationTier(): InstaMeGenerationTier {
  return INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live") || INSTAME_GENERATION_TIERS[0];
}
