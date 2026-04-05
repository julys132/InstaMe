export type InstaMeTierAvailability = "live" | "coming_soon";

export type InstaMeQualityTier = "standard" | "premium" | "pro";

type InstaMeTierBase = {
  id: string;
  label: string;
  subtitle: string;
  credits: number;
  qualityTier: InstaMeQualityTier;
  output: string;
  badge?: string;
  availability: InstaMeTierAvailability;
};

export type InstaMeGenerationTier = InstaMeTierBase & {
  provider: string;
  model: string;
};

export type InstaMeEditTier = InstaMeTierBase & {
  provider: string;
  model: string;
};

export type InstaMePortraitEnhanceTier = InstaMeTierBase & {
  provider: string;
  model: string;
};

export type PublicInstaMeGenerationTier = Omit<InstaMeGenerationTier, "provider" | "model">;
export type PublicInstaMeEditTier = Omit<InstaMeEditTier, "provider" | "model">;
export type PublicInstaMePortraitEnhanceTier = Omit<InstaMePortraitEnhanceTier, "provider" | "model">;

export const INSTAME_QUALITY_TIER_CREDITS: Record<InstaMeQualityTier, number> = {
  standard: 1,
  premium: 2,
  pro: 4,
};

const INSTAME_QUALITY_TIER_RANK: Record<InstaMeQualityTier, number> = {
  standard: 1,
  premium: 2,
  pro: 3,
};

export function getInstaMeCreditsForQualityTier(qualityTier: InstaMeQualityTier): number {
  return INSTAME_QUALITY_TIER_CREDITS[qualityTier] || INSTAME_QUALITY_TIER_CREDITS.premium;
}

export function getInstaMeQualityTierLabel(qualityTier: InstaMeQualityTier): string {
  if (qualityTier === "standard") return "Fast";
  if (qualityTier === "pro") return "Signature";
  return "Best";
}

export function getInstaMeQualityTierSubtitle(
  qualityTier: InstaMeQualityTier,
  action: "generate" | "edit" | "enhance" = "generate",
): string {
  if (action === "edit") {
    return qualityTier === "pro"
      ? "Signature art-direction pass"
      : qualityTier === "premium"
        ? "Detailed refinement pass"
        : "Quick touch-up pass";
  }

  if (action === "enhance") {
    return qualityTier === "pro"
      ? "Top-tier base portrait polish"
      : qualityTier === "premium"
        ? "Enhanced portrait cleanup"
        : "Portrait cleanup before styling";
  }

  return qualityTier === "pro"
    ? "Top-tier cinematic generation"
    : qualityTier === "premium"
      ? "High-fidelity portrait generation"
      : "Quick everyday generation";
}

export function getHigherInstaMeQualityTier(
  left: InstaMeQualityTier,
  right: InstaMeQualityTier,
): InstaMeQualityTier {
  return INSTAME_QUALITY_TIER_RANK[left] >= INSTAME_QUALITY_TIER_RANK[right] ? left : right;
}

export function resolveInstaMeQualityTierForModel(input: {
  provider?: string;
  model?: string;
}): InstaMeQualityTier {
  const provider = (input.provider || "").trim().toLowerCase();
  const model = (input.model || "").trim().toLowerCase();
  const fingerprint = `${provider}:${model}`;

  if (fingerprint.includes("flux.2-max") || fingerprint.includes("reve-v1.1") || fingerprint.includes("reve")) {
    return "pro";
  }

  if (
    fingerprint.includes("flux.2-pro") ||
    fingerprint.includes("chatgpt-image-latest-high-fidelity") ||
    fingerprint.includes("gpt-image-1") ||
    fingerprint.includes("gemini-3-pro-image")
  ) {
    return "premium";
  }

  if (
    fingerprint.includes("flash-image-3.1") ||
    fingerprint.includes("gemini-3.1-flash-image-preview") ||
    fingerprint.includes("qwen-image-2.0")
  ) {
    return "standard";
  }

  return provider === "reve" ? "pro" : provider === "openai" ? "premium" : "premium";
}

export function resolveHighestInstaMeQualityTier(
  models: Array<{ provider?: string; model?: string }>,
  fallback: InstaMeQualityTier = "premium",
): InstaMeQualityTier {
  if (!Array.isArray(models) || models.length === 0) return fallback;

  return models.reduce<InstaMeQualityTier>((highest, model) => {
    const nextTier = resolveInstaMeQualityTierForModel(model);
    return getHigherInstaMeQualityTier(highest, nextTier);
  }, fallback);
}

export function toPublicInstaMeGenerationTier(tier: InstaMeGenerationTier): PublicInstaMeGenerationTier {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability,
  };
}

export function toPublicInstaMeEditTier(tier: InstaMeEditTier): PublicInstaMeEditTier {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability,
  };
}

export function toPublicInstaMePortraitEnhanceTier(
  tier: InstaMePortraitEnhanceTier,
): PublicInstaMePortraitEnhanceTier {
  return {
    id: tier.id,
    label: tier.label,
    subtitle: tier.subtitle,
    credits: tier.credits,
    qualityTier: tier.qualityTier,
    output: tier.output,
    badge: tier.badge,
    availability: tier.availability,
  };
}

export const INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS = 1;

export const INSTAME_GENERATION_TIERS: InstaMeGenerationTier[] = [
  {
    id: "high_res",
    label: "Best",
    subtitle: "High-fidelity portrait generation",
    credits: getInstaMeCreditsForQualityTier("premium"),
    qualityTier: "premium",
    provider: "Together",
    model: "FLUX.2 Pro",
    output: "1024 x 1024",
    badge: "Included",
    availability: "live",
  },
];

export const INSTAME_EDIT_TIERS: InstaMeEditTier[] = [
  {
    id: "edit",
    label: "Fast",
    subtitle: "Quick touch-up pass",
    credits: getInstaMeCreditsForQualityTier("standard"),
    qualityTier: "standard",
    provider: "Together",
    model: "Google Flash Image 3.1 Preview",
    output: "1024 x 1024",
    badge: "Included",
    availability: "live",
  },
];

export const INSTAME_PORTRAIT_ENHANCE_TIER: InstaMePortraitEnhanceTier = {
  id: "portrait_enhance",
  label: "Fast",
  subtitle: "Portrait cleanup before styling",
  credits: getInstaMeCreditsForQualityTier("standard"),
  qualityTier: "standard",
  provider: "Together",
  model: "Google Flash Image 3.1 Preview",
  output: "1024 x 1024",
  badge: "Included",
  availability: "live",
};

export function getLiveInstaMeGenerationTier(): InstaMeGenerationTier {
  return INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live") || INSTAME_GENERATION_TIERS[0];
}
