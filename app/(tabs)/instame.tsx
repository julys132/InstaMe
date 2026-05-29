import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Alert,
  Easing,
  Image as NativeImage,
  InteractionManager,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import {
  apiClient,
  type InstaMeOwnStyle,
  type InstaMeUploadedImage,
  type InstaMeUploadedImageAsset,
} from "@/lib/api-client";
import {
  buildDataUri,
  inferImageMimeTypeFromBase64,
  optimizeImageAsset,
  optimizeGeneratedBase64Image,
  stripDataUriPrefix,
  type PreparedUploadImage,
} from "@/lib/instame-uploaded-images";
import Colors from "@/constants/colors";
import { INSTAME_ART_STYLES } from "@/constants/instameArtStyles";
import {
  PHOTO_PACK_PRESETS,
  STYLE_VIBE_CATEGORIES,
  getPhotoPackPreviewImages,
  getStyleVibeById,
  matchStyleVibe,
} from "@/constants/instameStyleTaxonomy";
import {
  GRID_PIPELINE_AESTHETICS,
  type GridPipelineAesthetic,
} from "@/constants/gridPipelineAesthetics";
import {
  INSTAME_OWN_STYLE_ID,
  INSTAME_STYLE_PRESETS,
  type InstaMeStylePreset,
} from "@shared/instame-style-presets";
import {
  INSTAME_EDIT_TIERS,
  INSTAME_GENERATION_TIERS,
  INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS,
  INSTAME_PORTRAIT_ENHANCE_TIER,
  getInstaMeCreditsForQualityTier,
  getInstaMeQualityTierLabel,
  type InstaMeQualityTier,
  type PublicInstaMeEditTier,
  type PublicInstaMeGenerationTier,
  type PublicInstaMePortraitEnhanceTier,
} from "@shared/instame-pricing";

type UploadedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  kind?: "uploaded" | "enhanced" | "own_style";
  previewBase64?: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  sourceImageId?: string;
  name?: string;
};

type TransformIntensity = "soft" | "editorial" | "dramatic";
type OptionalTransformIntensity = TransformIntensity | null;
type OwnStyleGenerationMode = "reference_locked" | "creative_prompt";
type GenerationResultMeta = {
  qualityTier?: InstaMeQualityTier;
  qualityLabel?: string;
  promptOnlyMode?: boolean;
  generationTierId?: string;
  stylePresetId?: string | null;
  imageMimeType?: string;
};

type PipelineShotPlanItem = {
  position: number;
  type: string;
  label: string;
  hairstyle: string | null;
  angle: string | null;
  imagePrompt: string;
};

type PipelinePlanState = {
  imageCount: number;
  aesthetic: string;
  palette: string;
  lightType: string;
  shots: PipelineShotPlanItem[];
};

type StyleCardTheme = {
  glow: string;
  glowSoft: string;
  border: string;
  text: string;
  footerTop: string;
  footerBottom: string;
  ambient: string;
};

const DEFAULT_TRANSFORM_COST = getInstaMeCreditsForQualityTier("premium");
const GENERATION_WAIT_MESSAGE = "This can take around 1 to 2 minutes when providers are busy.";
const MAX_INSTAME_HISTORY_ITEMS = 10;
const ENHANCE_PREVIEW_CARD_ID = "__enhance_portrait__";
const OWN_UPLOAD_CARD_ID = "__own_upload_card__";
const ART_STYLE_NONE_ID = "__art_style_none__";

function resolveDisplayedGenerationQualityTier(options: {
  preset: InstaMeStylePreset | null | undefined;
  generationTier: PublicInstaMeGenerationTier | undefined;
  selectedArtStyle: boolean;
  isOwnStyleSelected: boolean;
}): InstaMeQualityTier {
  if (options.isOwnStyleSelected) {
    return options.generationTier?.qualityTier || "premium";
  }

  const presetTier = options.preset?.qualityTier || options.generationTier?.qualityTier || "premium";
  if (options.selectedArtStyle && presetTier === "standard") {
    return "premium";
  }
  return presetTier;
}

type FavoriteStyleKey = string;

type InstaMeHistoryEntry = {
  id: string;
  previewUri: string;
  editableBase64: string;
  editableMimeType: string;
  sourcePhotoUri?: string;
  styleLabel: string;
  stylePresetId?: string | null;
  ownStyleId?: string | null;
  artStyleId?: string | null;
  customPrompt: string;
  creditsCharged: number;
  createdAt: string;
  source: "transform" | "edit" | "portrait_enhance";
};

function getInstaMeFavoritesStorageKey(userId?: string | null): string {
  return `@instame_style_favorites_${userId || "guest"}`;
}

function getInstaMeHistoryStorageKey(userId?: string | null): string {
  return `@instame_generation_history_${userId || "guest"}`;
}

function getInstaMeOwnStyleDraftStorageKey(userId?: string | null): string {
  return `@instame_own_style_draft_${userId || "guest"}`;
}

function getInstaMeBasePhotoDraftStorageKey(userId?: string | null): string {
  return `@instame_base_photo_draft_${userId || "guest"}`;
}

function normalizeStoredUploadedPhoto(input: unknown): UploadedPhoto | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const candidate = input as Partial<UploadedPhoto>;
  const uri = typeof candidate.uri === "string" ? candidate.uri : "";
  const base64 = typeof candidate.base64 === "string" ? candidate.base64 : "";
  const previewBase64 = typeof candidate.previewBase64 === "string" ? candidate.previewBase64 : base64;
  const mimeType =
    typeof candidate.mimeType === "string" && candidate.mimeType.startsWith("image/")
      ? candidate.mimeType
      : "image/jpeg";

  if (!uri || !base64) {
    return null;
  }

  return {
    uri,
    base64,
    previewBase64,
    mimeType,
    kind:
      candidate.kind === "uploaded" || candidate.kind === "enhanced" || candidate.kind === "own_style"
        ? candidate.kind
        : undefined,
    width: typeof candidate.width === "number" ? candidate.width : undefined,
    height: typeof candidate.height === "number" ? candidate.height : undefined,
    fileSizeBytes: typeof candidate.fileSizeBytes === "number" ? candidate.fileSizeBytes : undefined,
    sourceImageId: typeof candidate.sourceImageId === "string" ? candidate.sourceImageId : undefined,
    name: typeof candidate.name === "string" ? candidate.name : undefined,
  };
}

function toPresetFavoriteKey(styleId: string): FavoriteStyleKey {
  return `preset:${styleId}`;
}

function toOwnStyleFavoriteKey(styleId: string): FavoriteStyleKey {
  return `own:${styleId}`;
}

const INTENSITY_OPTIONS: {
  value: TransformIntensity;
  label: string;
  subtitle: string;
  details: string;
}[] = [
  {
    value: "soft",
    label: "Soft",
    subtitle: "Lighter styling pass",
    details: "Keeps the chosen style more natural and closer to your original photo.",
  },
  {
    value: "editorial",
    label: "Editorial",
    subtitle: "Balanced style upgrade",
    details: "Adds a clearer fashion finish to lighting, mood, and styling without pushing too far.",
  },
  {
    value: "dramatic",
    label: "Dramatic",
    subtitle: "Stronger cinematic effect",
    details: "Pushes the chosen style further with bolder lighting, contrast, pose energy, and atmosphere.",
  },
];

const OWN_STYLE_MODE_OPTIONS: {
  value: OwnStyleGenerationMode;
  label: string;
  subtitle: string;
}[] = [
  {
    value: "reference_locked",
    label: "Very High Similarity",
    subtitle: "Closest match to your reference look",
  },
  {
    value: "creative_prompt",
    label: "More Creative",
    subtitle: "More variety from the same style direction",
  },
];

const PACK_BRIEF_REQUIRED_ELEMENTS = [
  { id: "outfit", label: "Signature outfit" },
  { id: "location", label: "Location moment" },
  { id: "car", label: "Car or ride frame" },
  { id: "accessories", label: "Accessory close-up" },
  { id: "mirror", label: "Mirror selfie" },
  { id: "detail", label: "Detail crop" },
] as const;

const PACK_BRIEF_FLOW_STEPS = ["Preset", "Brief", "Visual Grid", "Extract"] as const;
const PACK_BRIEF_NOTES_MAX_LENGTH = 220;

const PACK_IMAGE_COUNT_OPTIONS = [6, 9, 12] as const;

const PACK_COLOR_PALETTES = [
  {
    id: "cream-charcoal-gold",
    label: "Cream & Charcoal",
    paletteText: "ivory cream, charcoal black, champagne gold",
    colors: ["#F3EEE4", "#2B2B2B", "#C7A66A"],
  },
  {
    id: "mocha-sand-olive",
    label: "Mocha Sand",
    paletteText: "espresso brown, warm sand, olive gray",
    colors: ["#4A372B", "#CFB89A", "#7A7F67"],
  },
  {
    id: "graphite-ice-steel",
    label: "Graphite Ice",
    paletteText: "graphite, ice gray, brushed steel",
    colors: ["#34383E", "#D7DDE3", "#8B98A5"],
  },
  {
    id: "linen-clay-cocoa",
    label: "Linen Clay",
    paletteText: "linen white, terracotta clay, cocoa brown",
    colors: ["#EFE7DA", "#B87155", "#5A4438"],
  },
  {
    id: "navy-bone-brass",
    label: "Navy Brass",
    paletteText: "deep navy, bone white, brass accent",
    colors: ["#1E2A44", "#E8E1D5", "#B88A44"],
  },
  {
    id: "burgundy-smoke-rose",
    label: "Burgundy Smoke",
    paletteText: "burgundy wine, smoke gray, dusty rose",
    colors: ["#5A1F2D", "#8C8581", "#B68D8B"],
  },
  {
    id: "sage-stone-oat",
    label: "Sage Stone",
    paletteText: "sage green, stone gray, oat beige",
    colors: ["#7F8A73", "#A9A79E", "#DDD0B6"],
  },
  {
    id: "teal-sand-copper",
    label: "Teal Copper",
    paletteText: "dark teal, warm sand, copper",
    colors: ["#1C5C60", "#D2C1A5", "#A05E3B"],
  },
  {
    id: "pearl-mushroom-taupe",
    label: "Pearl Taupe",
    paletteText: "pearl white, mushroom beige, taupe",
    colors: ["#F3F1EC", "#B7A892", "#8E7C69"],
  },
  {
    id: "forest-cream-amber",
    label: "Forest Amber",
    paletteText: "forest green, soft cream, amber",
    colors: ["#1F4D3B", "#EFE7D4", "#C47F33"],
  },
] as const;

const STYLE_CARD_THEME_MAP: Record<string, StyleCardTheme> = {
  own_style: {
    glow: "#86F4FF",
    glowSoft: "rgba(134,244,255,0.34)",
    border: "rgba(185,251,255,0.48)",
    text: "#E0FDFF",
    footerTop: "#08242B",
    footerBottom: "#03090C",
    ambient: "rgba(134,244,255,0.14)",
  },
  analog_night_flash: {
    glow: "#8FF5C2",
    glowSoft: "rgba(143,245,194,0.35)",
    border: "rgba(182,255,216,0.46)",
    text: "#D8FFE9",
    footerTop: "#052615",
    footerBottom: "#020E08",
    ambient: "rgba(143,245,194,0.12)",
  },
  old_money: {
    glow: "#F0D2AA",
    glowSoft: "rgba(240,210,170,0.32)",
    border: "rgba(255,227,191,0.42)",
    text: "#FFF1DA",
    footerTop: "#23170E",
    footerBottom: "#0C0907",
    ambient: "rgba(240,210,170,0.10)",
  },
  minimalistic_chic: {
    glow: "#E7CFFF",
    glowSoft: "rgba(231,207,255,0.34)",
    border: "rgba(244,219,255,0.46)",
    text: "#F8E9FF",
    footerTop: "#24112B",
    footerBottom: "#09040D",
    ambient: "rgba(231,207,255,0.12)",
  },
  minimalist_chic: {
    glow: "#E7CFFF",
    glowSoft: "rgba(231,207,255,0.34)",
    border: "rgba(244,219,255,0.46)",
    text: "#F8E9FF",
    footerTop: "#24112B",
    footerBottom: "#09040D",
    ambient: "rgba(231,207,255,0.12)",
  },
  edgy_editorial_minimalism: {
    glow: "#FF70D6",
    glowSoft: "rgba(255,112,214,0.40)",
    border: "rgba(255,162,231,0.52)",
    text: "#FFD7F5",
    footerTop: "#290728",
    footerBottom: "#0A030A",
    ambient: "rgba(255,112,214,0.14)",
  },
  retro: {
    glow: "#FF70D6",
    glowSoft: "rgba(255,112,214,0.40)",
    border: "rgba(255,162,231,0.52)",
    text: "#FFD7F5",
    footerTop: "#290728",
    footerBottom: "#0A030A",
    ambient: "rgba(255,112,214,0.14)",
  },
  glam: {
    glow: "#FF6EC7",
    glowSoft: "rgba(255,110,199,0.40)",
    border: "rgba(255,165,224,0.54)",
    text: "#FFD9F0",
    footerTop: "#2A0822",
    footerBottom: "#090309",
    ambient: "rgba(255,110,199,0.14)",
  },
  luxurious_mediterranean_glamour: {
    glow: "#FF6EC7",
    glowSoft: "rgba(255,110,199,0.40)",
    border: "rgba(255,165,224,0.54)",
    text: "#FFD9F0",
    footerTop: "#2A0822",
    footerBottom: "#090309",
    ambient: "rgba(255,110,199,0.14)",
  },
  selfie: {
    glow: "#FF6CC6",
    glowSoft: "rgba(255,108,198,0.40)",
    border: "rgba(255,159,221,0.52)",
    text: "#FFD8F0",
    footerTop: "#280722",
    footerBottom: "#080308",
    ambient: "rgba(255,108,198,0.14)",
  },
  selfie_glamour_dark: {
    glow: "#FF67BE",
    glowSoft: "rgba(255,103,190,0.42)",
    border: "rgba(255,158,220,0.54)",
    text: "#FFD9EF",
    footerTop: "#26061D",
    footerBottom: "#080307",
    ambient: "rgba(255,103,190,0.14)",
  },
  in_car_selfie: {
    glow: "#21F3FF",
    glowSoft: "rgba(33,243,255,0.36)",
    border: "rgba(135,252,255,0.46)",
    text: "#D8FCFF",
    footerTop: "#032A29",
    footerBottom: "#020B0C",
    ambient: "rgba(33,243,255,0.12)",
  },
  street_luxe: {
    glow: "#FF6AC8",
    glowSoft: "rgba(255,106,200,0.38)",
    border: "rgba(255,164,226,0.48)",
    text: "#FFD8EF",
    footerTop: "#290822",
    footerBottom: "#090309",
    ambient: "rgba(255,106,200,0.13)",
  },
  monochromatic_urban_elegance: {
    glow: "#FF68C7",
    glowSoft: "rgba(255,104,199,0.40)",
    border: "rgba(255,159,224,0.50)",
    text: "#FFD9EF",
    footerTop: "#290822",
    footerBottom: "#090309",
    ambient: "rgba(255,104,199,0.13)",
  },
  natural_glam_portrait: {
    glow: "#7CFFB3",
    glowSoft: "rgba(124,255,179,0.34)",
    border: "rgba(182,255,214,0.44)",
    text: "#DFFFF0",
    footerTop: "#062718",
    footerBottom: "#020D08",
    ambient: "rgba(124,255,179,0.12)",
  },
  polished_urban_chic: {
    glow: "#FF70D6",
    glowSoft: "rgba(255,112,214,0.40)",
    border: "rgba(255,162,231,0.52)",
    text: "#FFD7F5",
    footerTop: "#290728",
    footerBottom: "#0A030A",
    ambient: "rgba(255,112,214,0.14)",
  },
  soft_dreamy_editorial: {
    glow: "#FFD66F",
    glowSoft: "rgba(255,214,111,0.36)",
    border: "rgba(255,234,171,0.46)",
    text: "#FFF0C8",
    footerTop: "#2A2007",
    footerBottom: "#0C0903",
    ambient: "rgba(255,214,111,0.12)",
  },
  timeless_cinematic_chic: {
    glow: "#9EFF7B",
    glowSoft: "rgba(158,255,123,0.34)",
    border: "rgba(205,255,187,0.46)",
    text: "#EAFFD9",
    footerTop: "#132709",
    footerBottom: "#060B03",
    ambient: "rgba(158,255,123,0.12)",
  },
};

const DEFAULT_STYLE_CARD_THEME: StyleCardTheme = {
  glow: "#FF6BC6",
  glowSoft: "rgba(255,107,198,0.38)",
  border: "rgba(255,164,225,0.48)",
  text: "#FFD8EF",
  footerTop: "#26071F",
  footerBottom: "#080308",
  ambient: "rgba(255,107,198,0.12)",
};

const ART_STYLE_CARD_THEME_MAP: Record<string, StyleCardTheme> = {
  [ART_STYLE_NONE_ID]: {
    glow: "#F0D2AA",
    glowSoft: "rgba(240,210,170,0.34)",
    border: "rgba(255,229,197,0.46)",
    text: "#FFF0DB",
    footerTop: "#251A11",
    footerBottom: "#090605",
    ambient: "rgba(240,210,170,0.12)",
  },
  colored_hand_drawn_sketch: {
    glow: "#FF977B",
    glowSoft: "rgba(255,151,123,0.36)",
    border: "rgba(255,200,182,0.48)",
    text: "#FFE2D7",
    footerTop: "#2A120E",
    footerBottom: "#0B0505",
    ambient: "rgba(255,151,123,0.13)",
  },
  black_and_white_sketch: {
    glow: "#9BE7FF",
    glowSoft: "rgba(155,231,255,0.34)",
    border: "rgba(202,244,255,0.46)",
    text: "#E6FBFF",
    footerTop: "#102026",
    footerBottom: "#04080A",
    ambient: "rgba(155,231,255,0.11)",
  },
  simple_watercolor: {
    glow: "#FFD66F",
    glowSoft: "rgba(255,214,111,0.34)",
    border: "rgba(255,236,173,0.48)",
    text: "#FFF1CB",
    footerTop: "#2A220A",
    footerBottom: "#0C0904",
    ambient: "rgba(255,214,111,0.11)",
  },
};

function getStyleCardTheme(styleId: string): StyleCardTheme {
  return STYLE_CARD_THEME_MAP[styleId] || DEFAULT_STYLE_CARD_THEME;
}

function getArtStyleCardTheme(styleId: string): StyleCardTheme {
  return ART_STYLE_CARD_THEME_MAP[styleId] || DEFAULT_STYLE_CARD_THEME;
}

function getImageCandidates(...values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();

  return values
    .flatMap((value) => (typeof value === "string" ? [value.trim()] : []))
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }

      seen.add(value);
      return true;
    });
}

function getPresetImageCandidates(
  preset: Pick<InstaMeStylePreset, "cover" | "representativeImage" | "examples"> | null | undefined,
): string[] {
  if (!preset) {
    return [];
  }

  return getImageCandidates(preset.cover, preset.representativeImage, ...(preset.examples || []));
}


export default function InstaMeScreen() {
  const params = useLocalSearchParams<{ uploadedImageId?: string | string[]; uploadedImageNonce?: string | string[] }>();
  const insets = useSafeAreaInsets();
  const { width: viewportWidth } = useWindowDimensions();
  const { user } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [intensity, setIntensity] = useState<OptionalTransformIntensity>(null);
  const [stylePresets, setStylePresets] = useState<InstaMeStylePreset[]>(INSTAME_STYLE_PRESETS);
  const [generationTiers, setGenerationTiers] = useState<PublicInstaMeGenerationTier[]>(INSTAME_GENERATION_TIERS);
  const [editTiers, setEditTiers] = useState<PublicInstaMeEditTier[]>(INSTAME_EDIT_TIERS);
  const [portraitEnhanceTier, setPortraitEnhanceTier] = useState<PublicInstaMePortraitEnhanceTier>(
    INSTAME_PORTRAIT_ENHANCE_TIER,
  );
  const [selectedGenerationTierId, setSelectedGenerationTierId] = useState<string>(
    INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_GENERATION_TIERS[0]?.id || "good",
  );
  const [selectedEditTierId, setSelectedEditTierId] = useState<string>(
    INSTAME_EDIT_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_EDIT_TIERS[0]?.id || "edit",
  );
  const [selectedStyleId, setSelectedStyleId] = useState<string>("");
  const [selectedArtStyleId, setSelectedArtStyleId] = useState<string>("");
  const [styleSectionTab, setStyleSectionTab] = useState<"main" | "own" | "art">("main");
  const [selectedStyleVibeId, setSelectedStyleVibeId] = useState("all");
  const [selectedPhotoPackId, setSelectedPhotoPackId] = useState<string | null>(null);
  const [selectedPackBriefVibeId, setSelectedPackBriefVibeId] = useState("all");
  const [packBriefRequiredElementIds, setPackBriefRequiredElementIds] = useState<string[]>([]);
  const [packBriefNotes, setPackBriefNotes] = useState("");
  const [selectedPackImageCount, setSelectedPackImageCount] = useState<6 | 9 | 12>(6);
  const [selectedPackPaletteId, setSelectedPackPaletteId] = useState<string>(PACK_COLOR_PALETTES[0].id);
  const [packGridPreviewBase64, setPackGridPreviewBase64] = useState<string | null>(null);
  const [packGridPreviewLoading, setPackGridPreviewLoading] = useState(false);
  const [packGridRenderImages, setPackGridRenderImages] = useState<Array<{ shotIndex: number; shotLabel: string; imageBase64: string }>>([]);
  const [packGridRenderLoading, setPackGridRenderLoading] = useState(false);
  const [packGridError, setPackGridError] = useState<string | null>(null);
  const [packImagePreviewId, setPackImagePreviewId] = useState<string | null>(null);
  const [packImagePreviewIndex, setPackImagePreviewIndex] = useState(0);
  const [pipelineAestheticId, setPipelineAestheticId] = useState<string | null>(null);
  const [pipelineImageCount, setPipelineImageCount] = useState<6 | 9 | 12>(6);
  const [pipelineExtraNotes, setPipelineExtraNotes] = useState("");
  const [pipelinePlanLoading, setPipelinePlanLoading] = useState(false);
  const [pipelineRenderLoading, setPipelineRenderLoading] = useState(false);
  const [pipelinePlan, setPipelinePlan] = useState<PipelinePlanState | null>(null);
  const [selectedPipelineShotPositions, setSelectedPipelineShotPositions] = useState<number[]>([]);
  const [pipelineContinuityContext, setPipelineContinuityContext] = useState<null | {
    aesthetic: string; palette: string; lightType: string; usedScenes: string[]; usedHairstyles: string[];
  }>(null);
  const [pipelineRenderResults, setPipelineRenderResults] = useState<Array<{ position: number; label: string; type: string; imageBase64: string }>>([]);
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  // ──────────────────────────────────────────────────────────────────────────
  const [previewStyleId, setPreviewStyleId] = useState<string | null>(null);
  const [ownStylePhoto, setOwnStylePhoto] = useState<UploadedPhoto | null>(null);
  const [savedOwnStyles, setSavedOwnStyles] = useState<InstaMeOwnStyle[]>([]);
  const [ownStylesLoaded, setOwnStylesLoaded] = useState(false);
  const [selectedOwnStyleId, setSelectedOwnStyleId] = useState<string | null>(null);
  const [ownStyleMode, setOwnStyleMode] = useState<OwnStyleGenerationMode>("reference_locked");
  const [ownStyleDraftReady, setOwnStyleDraftReady] = useState(false);
  const [basePhotoDraftReady, setBasePhotoDraftReady] = useState(false);
  const [favoriteStyleKeys, setFavoriteStyleKeys] = useState<FavoriteStyleKey[]>([]);
  const [generationHistory, setGenerationHistory] = useState<InstaMeHistoryEntry[]>([]);
  const [ownStyleNameDraft, setOwnStyleNameDraft] = useState("");
  const [renamingOwnStyle, setRenamingOwnStyle] = useState(false);
  const [, setComparisonImageUri] = useState<string | null>(null);
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<GenerationResultMeta | null>(null);
  const [isRetouchDrawerOpen, setIsRetouchDrawerOpen] = useState(false);
  const [portraitEnhanceCandidate, setPortraitEnhanceCandidate] = useState<UploadedPhoto | null>(null);
  const [portraitEnhanceLoading, setPortraitEnhanceLoading] = useState(false);
  const [usingEnhancedPortrait, setUsingEnhancedPortrait] = useState(false);
  const mainScrollRef = useRef<ScrollView | null>(null);
  const resultCardRef = useRef<View | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEditComposer, setShowEditComposer] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [collageTileAspectRatios, setCollageTileAspectRatios] = useState<Record<string, number>>({});
  const [collageTileImageOverrides, setCollageTileImageOverrides] = useState<Record<string, string>>({});
  const [inlineGalleryType, setInlineGalleryType] = useState<"uploaded" | "enhanced" | null>(null);
  const [inlineGalleryImages, setInlineGalleryImages] = useState<InstaMeUploadedImage[]>([]);
  const [inlineGalleryLoading, setInlineGalleryLoading] = useState(false);
  const collageRevealProgress = useRef(new Animated.Value(1)).current;

  const selectedSavedOwnStyle = useMemo(
    () => savedOwnStyles.find((style) => style.id === selectedOwnStyleId) || null,
    [savedOwnStyles, selectedOwnStyleId],
  );

  const hasOwnStyleInput = Boolean(ownStylePhoto || selectedOwnStyleId);
  const ownStyleNeedsActivation = hasOwnStyleInput && selectedStyleId !== INSTAME_OWN_STYLE_ID;

  const currentFavoriteStyleKey = useMemo(() => {
    if (selectedStyleId === INSTAME_OWN_STYLE_ID && selectedSavedOwnStyle) {
      return toOwnStyleFavoriteKey(selectedSavedOwnStyle.id);
    }
    if (selectedStyleId && selectedStyleId !== INSTAME_OWN_STYLE_ID) {
      return toPresetFavoriteKey(selectedStyleId);
    }
    return null;
  }, [selectedSavedOwnStyle, selectedStyleId]);

  const isCurrentStyleFavorite = currentFavoriteStyleKey
    ? favoriteStyleKeys.includes(currentFavoriteStyleKey)
    : false;

  const applyBasePhoto = useCallback((nextPhoto: UploadedPhoto) => {
    setPhoto(nextPhoto);
    setComparisonImageUri(buildDataUri(nextPhoto.previewBase64 || nextPhoto.base64, nextPhoto.mimeType));
    setPortraitEnhanceCandidate(null);
    setUsingEnhancedPortrait(nextPhoto.kind === "enhanced");
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
  }, []);

  const renderInlineGalleryPreview = useCallback((img: InstaMeUploadedImage) => {
    const sanitizedUri = (img.previewUri || "").replace(/\s+/g, "");

    if (!sanitizedUri) {
      return (
        <View style={[StyleSheet.absoluteFillObject, styles.inlineGalleryThumbFallback]}>
          <Ionicons name="image-outline" size={18} color="rgba(255,255,255,0.38)" />
        </View>
      );
    }

    if (Platform.OS === "ios") {
      return (
        <NativeImage
          source={{ uri: sanitizedUri }}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      );
    }

    return (
      <Image
        source={{ uri: sanitizedUri }}
        style={StyleSheet.absoluteFillObject}
        contentFit="cover"
        cachePolicy="none"
        recyclingKey={img.id}
      />
    );
  }, []);

  const openInlineGallery = useCallback(async (kind: "uploaded" | "enhanced") => {
    if (inlineGalleryType === kind) {
      setInlineGalleryType(null);
      return;
    }
    setInlineGalleryType(kind);
    setInlineGalleryLoading(true);
    try {
      const result = await apiClient.getInstaMeUploadedImages(kind);
      setInlineGalleryImages(
        Array.isArray(result.images)
          ? result.images.map((image) => ({
              ...image,
              previewUri: (image.previewUri || "").replace(/\s+/g, ""),
            }))
          : [],
      );
    } catch {
      setInlineGalleryImages([]);
    } finally {
      setInlineGalleryLoading(false);
    }
  }, [inlineGalleryType]);

  const selectInlineGalleryImage = useCallback(async (imageId: string) => {
    try {
      const result = await apiClient.getInstaMeUploadedImage(imageId);
      const image = result.image;
      applyBasePhoto({
        uri: image.dataUri,
        base64: image.base64,
        previewBase64: image.base64,
        mimeType: image.mimeType,
        kind: image.kind === "enhanced" ? "enhanced" : "uploaded",
        width: image.width,
        height: image.height,
        fileSizeBytes: image.fileSizeBytes,
        sourceImageId: image.id,
        name: image.name,
      });
      setInlineGalleryType(null);
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert("Failed to load image", error?.message || "Could not load this portrait.");
    }
  }, [applyBasePhoto]);

  const fallbackPresetImageCandidates = useMemo(() => getPresetImageCandidates(stylePresets[0]), [stylePresets]);

  const ownStylePreset = useMemo<InstaMeStylePreset>(() => {
    const ownStyleReferenceCandidates = getImageCandidates(
      ownStylePhoto?.uri,
      selectedSavedOwnStyle?.previewUri,
    );

    return {
      id: INSTAME_OWN_STYLE_ID,
      label: "OWN STYLE",
      subtitle: "Upload a reference image with the style you want",
      qualityTier: "premium",
      promptHint: "user uploaded style reference",
      representativeImage: ownStyleReferenceCandidates[0] || "",
      cover: ownStyleReferenceCandidates[0] || "",
      examples: getImageCandidates(ownStylePhoto?.uri, selectedSavedOwnStyle?.previewUri),
    };
  }, [ownStylePhoto, selectedSavedOwnStyle]);

  const visibleStylePresets = useMemo(
    () => [ownStylePreset, ...stylePresets.filter((preset) => preset.id !== INSTAME_OWN_STYLE_ID)],
    [ownStylePreset, stylePresets],
  );

  const styleVibeCounts = useMemo(() => {
    const catalogPresets = stylePresets.filter((preset) => preset.id !== INSTAME_OWN_STYLE_ID);

    return Object.fromEntries(
      STYLE_VIBE_CATEGORIES.map((vibe) => [
        vibe.id,
        catalogPresets.filter((preset) => matchStyleVibe(preset, vibe.id)).length,
      ]),
    ) as Record<string, number>;
  }, [stylePresets]);

  const selectedStyleVibe = useMemo(() => getStyleVibeById(selectedStyleVibeId), [selectedStyleVibeId]);

  const activePhotoPack = useMemo(
    () => PHOTO_PACK_PRESETS.find((pack) => pack.id === selectedPhotoPackId) || null,
    [selectedPhotoPackId],
  );

  const photoPackPreviewMap = useMemo(
    () =>
      Object.fromEntries(
        PHOTO_PACK_PRESETS.map((pack) => [pack.id, getPhotoPackPreviewImages(pack, stylePresets, 4)]),
      ) as Record<string, string[]>,
    [stylePresets],
  );

  const mainOnlyStylePresets = useMemo(
    () => stylePresets.filter((preset) => preset.id !== INSTAME_OWN_STYLE_ID && matchStyleVibe(preset, selectedStyleVibeId)),
    [stylePresets, selectedStyleVibeId],
  );

  const defaultStylePreset = useMemo(
    () => visibleStylePresets.find((preset) => preset.id !== INSTAME_OWN_STYLE_ID) || visibleStylePresets[0],
    [visibleStylePresets],
  );

  const selectedStylePreset = useMemo(
    () => visibleStylePresets.find((preset) => preset.id === selectedStyleId) || defaultStylePreset,
    [defaultStylePreset, selectedStyleId, visibleStylePresets],
  );

  const previewStyle = useMemo(
    () => visibleStylePresets.find((preset) => preset.id === previewStyleId) || null,
    [previewStyleId, visibleStylePresets],
  );

  const isPhoneViewport = viewportWidth <= 430;
  const selectedPackBriefVibe = useMemo(() => getStyleVibeById(selectedPackBriefVibeId), [selectedPackBriefVibeId]);
  const selectedPackPalette = useMemo(
    () => PACK_COLOR_PALETTES.find((palette) => palette.id === selectedPackPaletteId) || PACK_COLOR_PALETTES[0],
    [selectedPackPaletteId],
  );
  const selectedPackRequiredLabels = useMemo(
    () =>
      PACK_BRIEF_REQUIRED_ELEMENTS
        .filter((item) => packBriefRequiredElementIds.includes(item.id))
        .map((item) => item.label),
    [packBriefRequiredElementIds],
  );
  const packBriefVibeOptions = useMemo(
    () => STYLE_VIBE_CATEGORIES.filter((vibe) => vibe.id !== "all"),
    [],
  );
  const isPackBriefConfigured = Boolean(activePhotoPack);
  const selectedPipelineShots = useMemo(
    () =>
      pipelinePlan
        ? pipelinePlan.shots.filter((shot) => selectedPipelineShotPositions.includes(shot.position))
        : [],
    [pipelinePlan, selectedPipelineShotPositions],
  );
  const selectedPipelineShotCount = selectedPipelineShots.length;
  const excludedPipelineShotCount = Math.max(0, (pipelinePlan?.shots.length || 0) - selectedPipelineShotCount);
  const areAllPipelineShotsSelected = Boolean(
    pipelinePlan?.shots.length && selectedPipelineShotCount === pipelinePlan.shots.length,
  );
  const packPlannerCurrentStep = !activePhotoPack ? 1 : pipelinePlan ? (pipelineRenderResults.length > 0 ? 4 : 3) : 2;
  const collageColumnCount = viewportWidth >= 1360 ? 4 : 3;
  const collageColumnOffsets = collageColumnCount === 4 ? [0, 18, 10, 22] : isPhoneViewport ? [0, 10, 4] : [0, 18, 10];
  const collageColumnGap = isPhoneViewport ? 6 : 8;
  const collageRevealAnimatedStyle = useMemo(
    () => ({
      opacity: collageRevealProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.84, 1],
      }),
      transform: [
        {
          translateY: collageRevealProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [8, 0],
          }),
        },
      ],
    }),
    [collageRevealProgress],
  );

  useEffect(() => {
    if (!pipelinePlan) {
      setSelectedPipelineShotPositions([]);
      return;
    }

    setSelectedPipelineShotPositions(pipelinePlan.shots.map((shot) => shot.position));
  }, [pipelinePlan]);

  const getCollageColumnRevealStyle = useCallback((columnIndex: number) => {
    const delayStart = Math.min(0.42, columnIndex * 0.14);
    const delayEnd = Math.min(1, delayStart + 0.56);
    const columnProgress = collageRevealProgress.interpolate({
      inputRange: [0, delayStart, delayEnd, 1],
      outputRange: [0, 0, 1, 1],
      extrapolate: "clamp",
    });

    return {
      opacity: columnProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0.38, 1],
      }),
      transform: [
        {
          translateY: columnProgress.interpolate({
            inputRange: [0, 1],
            outputRange: [22, 0],
          }),
        },
      ],
    };
  }, [collageRevealProgress]);

  const isEnhancePreviewActive = previewStyleId === ENHANCE_PREVIEW_CARD_ID;

  const modalStyleResultAvailable = useMemo(() => {
    if (!resultBase64 || !previewStyleId || isEnhancePreviewActive) {
      return false;
    }

    if (resultMeta?.stylePresetId) {
      return resultMeta.stylePresetId === previewStyleId;
    }

    return selectedStyleId === previewStyleId;
  }, [isEnhancePreviewActive, previewStyleId, resultBase64, resultMeta?.stylePresetId, selectedStyleId]);

  const resultImageMimeType = useMemo(
    () => resultMeta?.imageMimeType || (resultBase64 ? inferImageMimeTypeFromBase64(resultBase64) : "image/jpeg"),
    [resultBase64, resultMeta?.imageMimeType],
  );

  const previewPanelImageUri = useMemo(() => {
    if (isEnhancePreviewActive) {
      return getImageCandidates(portraitEnhanceCandidate?.uri, photo?.uri, ...fallbackPresetImageCandidates)[0] || "";
    }

    if (previewStyleId === INSTAME_OWN_STYLE_ID) {
      return getImageCandidates(
        selectedOwnStyleId ? selectedSavedOwnStyle?.previewUri : ownStylePhoto?.uri,
      )[0] || "";
    }

    return (
      getImageCandidates(
        ...getPresetImageCandidates(previewStyle || selectedStylePreset || defaultStylePreset),
        ...fallbackPresetImageCandidates,
      )[0] || ""
    );
  }, [
    defaultStylePreset,
    fallbackPresetImageCandidates,
    isEnhancePreviewActive,
    photo?.uri,
    portraitEnhanceCandidate?.uri,
    previewStyle,
    previewStyleId,
    ownStylePhoto?.uri,
    selectedOwnStyleId,
    selectedSavedOwnStyle?.previewUri,
    selectedStylePreset,
  ]);

  const closePreviewPanel = useCallback(() => {
    if (previewStyleId === INSTAME_OWN_STYLE_ID && ownStylePhoto && !selectedOwnStyleId) {
      setOwnStylePhoto(null);
    }
    setPreviewStyleId(null);
  }, [ownStylePhoto, previewStyleId, selectedOwnStyleId]);

  const previewPanelTitle = isEnhancePreviewActive
    ? "Enhance your portrait"
    : previewStyleId === INSTAME_OWN_STYLE_ID
      ? selectedSavedOwnStyle?.name || "Own Style"
      : previewStyle?.label || selectedStylePreset?.label || "Portrait style";

  const previewPanelSubtitle = isEnhancePreviewActive
    ? "Clean up and strengthen your base portrait before applying any style."
    : previewStyleId === INSTAME_OWN_STYLE_ID
      ? "Upload one reference and build a persistent styling direction, then generate on your portrait."
      : previewStyle?.subtitle || "Choose your portrait, adjust the retouch template and generate.";

  const ownStyleHeroUri = useMemo(
    () =>
      getImageCandidates(ownStylePhoto?.uri, selectedSavedOwnStyle?.previewUri, ...fallbackPresetImageCandidates)[0] || "",
    [fallbackPresetImageCandidates, ownStylePhoto?.uri, selectedSavedOwnStyle?.previewUri],
  );

  const selectedArtStyle = useMemo(
    () => INSTAME_ART_STYLES.find((style) => style.id === selectedArtStyleId) || null,
    [selectedArtStyleId],
  );

  const activeArtPreviewSource = useMemo(
    () => selectedArtStyle?.preview || INSTAME_ART_STYLES[0]?.preview,
    [selectedArtStyle],
  );

  const liveGenerationTier = useMemo(
    () => generationTiers.find((tier) => tier.id === selectedGenerationTierId) || generationTiers[0],
    [generationTiers, selectedGenerationTierId],
  );

  const activeGenerationTier = liveGenerationTier;
  const isOwnStyleSelected = selectedStyleId === INSTAME_OWN_STYLE_ID;

  const activeGenerationQualityTier = useMemo(
    () =>
      resolveDisplayedGenerationQualityTier({
        preset: selectedStylePreset,
        generationTier: activeGenerationTier,
        selectedArtStyle: Boolean(selectedArtStyle),
        isOwnStyleSelected,
      }),
    [activeGenerationTier, isOwnStyleSelected, selectedArtStyle, selectedStylePreset],
  );

  const activeGenerationQualityLabel = useMemo(
    () => getInstaMeQualityTierLabel(activeGenerationQualityTier),
    [activeGenerationQualityTier],
  );

  const selectedOwnStyleNeedsFirstUseSurcharge = Boolean(
    selectedSavedOwnStyle && selectedSavedOwnStyle.firstUseSurchargePending,
  );
  const isFirstOwnStyleGeneration =
    isOwnStyleSelected && (Boolean(ownStylePhoto) || selectedOwnStyleNeedsFirstUseSurcharge);
  const transformBaseCost = activeGenerationTier?.credits ?? getInstaMeCreditsForQualityTier(activeGenerationQualityTier);
  const transformCost =
    transformBaseCost +
    (isFirstOwnStyleGeneration ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0);
  const portraitEnhanceCost = portraitEnhanceTier?.credits ?? INSTAME_PORTRAIT_ENHANCE_TIER.credits;

  const selectedEditTier = useMemo(
    () => editTiers.find((tier) => tier.id === selectedEditTierId) || editTiers[0],
    [editTiers, selectedEditTierId],
  );

  const uploadedImageIdParam = Array.isArray(params.uploadedImageId)
    ? params.uploadedImageId[0]
    : params.uploadedImageId;
  const uploadedImageNonce = Array.isArray(params.uploadedImageNonce)
    ? params.uploadedImageNonce[0]
    : params.uploadedImageNonce;

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      apiClient.getInstaMeStyleLibrary(),
      apiClient.getInstaMeStylePresets(),
      apiClient.getInstaMePricing(),
      apiClient.getInstaMeOwnStyles(),
    ]).then(([styleLibraryResult, stylePresetResult, pricingResult, ownStylesResult]) => {
        if (!mounted) return;

        if (styleLibraryResult.status === "fulfilled") {
          void styleLibraryResult.value.referenceCount;
        }

        if (stylePresetResult.status === "fulfilled" && stylePresetResult.value.presets.length > 0) {
          setStylePresets(stylePresetResult.value.presets);
        }

        if (pricingResult.status === "fulfilled") {
          if (pricingResult.value.generationTiers.length > 0) {
            setGenerationTiers(pricingResult.value.generationTiers);
          }
          if (pricingResult.value.editTiers.length > 0) {
            setEditTiers(pricingResult.value.editTiers);
          }
          if (pricingResult.value.portraitEnhanceTier) {
            setPortraitEnhanceTier(pricingResult.value.portraitEnhanceTier);
          }
          if (pricingResult.value.liveGenerationTierId) {
            setSelectedGenerationTierId(pricingResult.value.liveGenerationTierId);
          }
        }

        if (ownStylesResult.status === "fulfilled") {
          setSavedOwnStyles(Array.isArray(ownStylesResult.value.ownStyles) ? ownStylesResult.value.ownStyles : []);
        } else {
          setSavedOwnStyles([]);
        }

        setOwnStylesLoaded(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!ownStylesLoaded) {
      return;
    }

    if (selectedOwnStyleId && !savedOwnStyles.some((style) => style.id === selectedOwnStyleId)) {
      setSelectedOwnStyleId(null);
    }
  }, [ownStylesLoaded, savedOwnStyles, selectedOwnStyleId]);

  useEffect(() => {
    const storageKey = getInstaMeOwnStyleDraftStorageKey(user?.id);
    let cancelled = false;

    setOwnStyleDraftReady(false);

    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (cancelled || !stored) {
          return;
        }

        const parsed = JSON.parse(stored) as {
          selectedStyleId?: unknown;
          selectedOwnStyleId?: unknown;
          ownStylePhoto?: unknown;
          ownStyleMode?: unknown;
        };

        if (parsed.selectedStyleId !== INSTAME_OWN_STYLE_ID) {
          return;
        }

        const restoredOwnStylePhoto = normalizeStoredUploadedPhoto(parsed.ownStylePhoto);
        const restoredOwnStyleId =
          typeof parsed.selectedOwnStyleId === "string" && parsed.selectedOwnStyleId.trim().length > 0
            ? parsed.selectedOwnStyleId
            : null;
        const restoredOwnStyleMode =
          parsed.ownStyleMode === "creative_prompt" ? "creative_prompt" : "reference_locked";

        if (!restoredOwnStylePhoto && !restoredOwnStyleId) {
          return;
        }

        setSelectedStyleId(INSTAME_OWN_STYLE_ID);
        setPreviewStyleId(null);
        setIntensity(null);
        setSelectedOwnStyleId(restoredOwnStyleId);
        setOwnStylePhoto(restoredOwnStylePhoto);
        setOwnStyleMode(restoredOwnStyleMode);
      })
      .catch(() => {
        // no-op
      })
      .finally(() => {
        if (!cancelled) {
          setOwnStyleDraftReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (uploadedImageIdParam && uploadedImageNonce) {
      setBasePhotoDraftReady(true);
      return;
    }

    const storageKey = getInstaMeBasePhotoDraftStorageKey(user?.id);
    let cancelled = false;

    setBasePhotoDraftReady(false);

    AsyncStorage.getItem(storageKey)
      .then(async (stored) => {
        if (cancelled || !stored) {
          return;
        }

        const parsed = JSON.parse(stored) as {
          sourceImageId?: unknown;
          photo?: unknown;
        };

        const storedSourceImageId =
          typeof parsed.sourceImageId === "string" && parsed.sourceImageId.trim().length > 0
            ? parsed.sourceImageId
            : "";

        if (storedSourceImageId) {
          const result = await apiClient.getInstaMeUploadedImage(storedSourceImageId);
          if (cancelled) return;
          const image: InstaMeUploadedImageAsset = result.image;
          applyBasePhoto({
            uri: image.previewUri || image.dataUri,
            base64: image.base64,
            previewBase64: image.previewUri ? image.previewUri.split(",")[1] || image.base64 : image.base64,
            mimeType: image.mimeType,
            kind: image.kind,
            width: image.width,
            height: image.height,
            fileSizeBytes: image.fileSizeBytes,
            sourceImageId: image.id,
            name: image.name,
          });
          return;
        }

        const restoredPhoto = normalizeStoredUploadedPhoto(parsed.photo);
        if (restoredPhoto) {
          applyBasePhoto(restoredPhoto);
        }
      })
      .catch(() => {
        // no-op
      })
      .finally(() => {
        if (!cancelled) {
          setBasePhotoDraftReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [applyBasePhoto, uploadedImageIdParam, uploadedImageNonce, user?.id]);

  useEffect(() => {
    if (!ownStyleDraftReady) {
      return;
    }

    const storageKey = getInstaMeOwnStyleDraftStorageKey(user?.id);

    if (selectedStyleId === INSTAME_OWN_STYLE_ID && (selectedOwnStyleId || ownStylePhoto)) {
      void AsyncStorage.setItem(
        storageKey,
        JSON.stringify({
          selectedStyleId: INSTAME_OWN_STYLE_ID,
          selectedOwnStyleId,
          ownStylePhoto,
          ownStyleMode,
        }),
      );
      return;
    }

    void AsyncStorage.removeItem(storageKey);
  }, [ownStyleDraftReady, ownStyleMode, ownStylePhoto, selectedOwnStyleId, selectedStyleId, user?.id]);

  useEffect(() => {
    if (!basePhotoDraftReady) {
      return;
    }

    const storageKey = getInstaMeBasePhotoDraftStorageKey(user?.id);

    if (photo) {
      const payload = photo.sourceImageId
        ? { sourceImageId: photo.sourceImageId }
        : { photo };
      void AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      return;
    }

    void AsyncStorage.removeItem(storageKey);
  }, [basePhotoDraftReady, photo, user?.id]);

  useEffect(() => {
    const storageKey = getInstaMeFavoritesStorageKey(user?.id);
    let cancelled = false;

    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (cancelled) return;
        const parsed = stored ? JSON.parse(stored) : [];
        setFavoriteStyleKeys(Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : []);
      })
      .catch(() => {
        if (!cancelled) setFavoriteStyleKeys([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    const storageKey = getInstaMeHistoryStorageKey(user?.id);
    let cancelled = false;

    AsyncStorage.getItem(storageKey)
      .then((stored) => {
        if (cancelled) return;
        const parsed = stored ? JSON.parse(stored) : [];
        setGenerationHistory(Array.isArray(parsed) ? parsed : []);
      })
      .catch(() => {
        if (!cancelled) setGenerationHistory([]);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    setOwnStyleNameDraft(selectedSavedOwnStyle?.name || "");
  }, [selectedSavedOwnStyle?.id, selectedSavedOwnStyle?.name]);

  useEffect(() => {
    if (!uploadedImageIdParam || !uploadedImageNonce) {
      return;
    }

    let cancelled = false;

    apiClient
      .getInstaMeUploadedImage(uploadedImageIdParam)
      .then((result) => {
        if (cancelled) return;
        const image: InstaMeUploadedImageAsset = result.image;
        applyBasePhoto({
          uri: image.previewUri || image.dataUri,
          base64: image.base64,
          previewBase64: image.previewUri ? image.previewUri.split(",")[1] || image.base64 : image.base64,
          mimeType: image.mimeType,
          kind: image.kind,
          width: image.width,
          height: image.height,
          fileSizeBytes: image.fileSizeBytes,
          sourceImageId: image.id,
          name: image.name,
        });
      })
      .catch((error: any) => {
        if (!cancelled) {
          Alert.alert("Load failed", error?.message || "Could not load the selected saved portrait.");
        }
      })
      .finally(() => {
        // no-op
      });

    return () => {
      cancelled = true;
    };
  }, [applyBasePhoto, uploadedImageIdParam, uploadedImageNonce]);

  useEffect(() => {
    if (!selectedStyleId && defaultStylePreset) {
      setSelectedStyleId(defaultStylePreset.id);
      return;
    }

    const exists =
      selectedStyleId === INSTAME_OWN_STYLE_ID || stylePresets.some((preset) => preset.id === selectedStyleId);
    if (!exists && defaultStylePreset) {
      setSelectedStyleId(defaultStylePreset.id);
    }
  }, [defaultStylePreset, selectedStyleId, stylePresets]);

  useEffect(() => {
    setUsingEnhancedPortrait(photo?.kind === "enhanced");
  }, [photo?.kind]);

  useEffect(() => {
    if (!generationTiers.some((tier) => tier.id === selectedGenerationTierId) && generationTiers[0]) {
      setSelectedGenerationTierId(generationTiers[0].id);
    }
  }, [generationTiers, selectedGenerationTierId]);

  useEffect(() => {
    if (!editTiers.some((tier) => tier.id === selectedEditTierId) && editTiers[0]) {
      setSelectedEditTierId(editTiers[0].id);
    }
  }, [editTiers, selectedEditTierId]);

  useEffect(() => {
    if (selectedArtStyleId) {
      setIntensity(null);
    }
  }, [selectedArtStyleId]);

  useEffect(() => {
    collageRevealProgress.setValue(0);
    const animation = Animated.timing(collageRevealProgress, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    animation.start();

    return () => {
      animation.stop();
    };
  }, [collageRevealProgress, styleSectionTab]);

  useEffect(() => {
    if (!previewStyleId) {
      setIsRetouchDrawerOpen(false);
      setShowEditComposer(false);
      return;
    }

    setIsRetouchDrawerOpen(false);
  }, [previewStyleId]);

  const canGenerate = useMemo(
    () => Boolean(
      photo &&
      !loading &&
      credits >= transformCost &&
      (!isOwnStyleSelected || ownStylePhoto || selectedOwnStyleId),
    ),
    [photo, loading, credits, transformCost, isOwnStyleSelected, ownStylePhoto, selectedOwnStyleId],
  );

  const generateBlockedReason = useMemo(() => {
    if (loading) {
      return null;
    }

    if (!photo) {
      return "Select one portrait first (Uploaded or Enhanced).";
    }

    if (isOwnStyleSelected && !ownStylePhoto && !selectedOwnStyleId) {
      return "Upload or select one Own Style image first.";
    }

    if (credits < transformCost) {
      const missingCredits = Math.max(0, transformCost - credits);
      return missingCredits > 0
        ? `Not enough credits: ${credits}/${transformCost}. Need ${missingCredits} more.`
        : `Not enough credits: ${credits}/${transformCost}.`;
    }

    return null;
  }, [loading, photo, isOwnStyleSelected, ownStylePhoto, selectedOwnStyleId, credits, transformCost]);

  const handleCollageTileLoad = useCallback((styleId: string, event: any) => {
    const width = event?.source?.width;
    const height = event?.source?.height;

    if (typeof width !== "number" || typeof height !== "number" || width <= 0 || height <= 0) {
      return;
    }

    const nextAspectRatio = width / height;
    setCollageTileAspectRatios((current) => {
      if (current[styleId] && Math.abs(current[styleId] - nextAspectRatio) < 0.01) {
        return current;
      }

      return {
        ...current,
        [styleId]: nextAspectRatio,
      };
    });
  }, []);

  const persistFavoriteKeys = useCallback(async (nextKeys: FavoriteStyleKey[]) => {
    setFavoriteStyleKeys(nextKeys);
    await AsyncStorage.setItem(getInstaMeFavoritesStorageKey(user?.id), JSON.stringify(nextKeys));
  }, [user?.id]);

  const toggleCurrentStyleFavorite = useCallback(async () => {
    if (!currentFavoriteStyleKey) return;
    const nextKeys = favoriteStyleKeys.includes(currentFavoriteStyleKey)
      ? favoriteStyleKeys.filter((key) => key !== currentFavoriteStyleKey)
      : [currentFavoriteStyleKey, ...favoriteStyleKeys];
    await persistFavoriteKeys(nextKeys);
    await Haptics.selectionAsync();
  }, [currentFavoriteStyleKey, favoriteStyleKeys, persistFavoriteKeys]);

  const appendGenerationHistory = useCallback(async (entry: InstaMeHistoryEntry) => {
    const nextHistory = [entry, ...generationHistory.filter((item) => item.id !== entry.id)].slice(0, MAX_INSTAME_HISTORY_ITEMS);
    setGenerationHistory(nextHistory);
    await AsyncStorage.setItem(getInstaMeHistoryStorageKey(user?.id), JSON.stringify(nextHistory));
  }, [generationHistory, user?.id]);

  const pickRawImage = useCallback(async (): Promise<ImagePicker.ImagePickerAsset | null> => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      base64: false,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) {
      return null;
    }

    return pickerResult.assets[0];
  }, []);

  const pickImage = useCallback(async () => {
    const asset = await pickRawImage();
    if (!asset) return;

    let prepared: PreparedUploadImage;
    try {
      prepared = await optimizeImageAsset(asset);
    } catch (error: any) {
      Alert.alert("Image error", error?.message || "Could not optimize this image.");
      return;
    }

    let savedImageId = "";
    try {
      const saved = await apiClient.saveInstaMeUploadedImage({
        image: {
          name: asset.fileName || "Portrait",
          kind: "uploaded",
          mimeType: prepared.mimeType,
          base64: prepared.base64,
          previewBase64: prepared.previewBase64 || prepared.base64,
          width: prepared.width,
          height: prepared.height,
          fileSizeBytes: prepared.fileSizeBytes || Math.ceil((prepared.base64.length * 3) / 4),
        },
      });
      savedImageId = saved.image?.id || "";
    } catch (_) {
      // Save failed silently – user can still use the photo for this session
    }

    applyBasePhoto({
      uri: prepared.uri,
      base64: prepared.base64,
      previewBase64: prepared.previewBase64,
      mimeType: prepared.mimeType,
      kind: "uploaded",
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: savedImageId || undefined,
      name: asset.fileName || "Portrait",
    });
    await Haptics.selectionAsync();
  }, [applyBasePhoto, pickRawImage]);

  const pickOwnStyleImage = useCallback(async () => {
    const asset = await pickRawImage();
    if (!asset) return;

    let prepared: PreparedUploadImage;
    try {
      prepared = await optimizeImageAsset(asset);
    } catch (error: any) {
      Alert.alert("Image error", error?.message || "Could not optimize this style image.");
      return;
    }

    const preparedHash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      prepared.previewBase64,
    );
    const nextOwnStylePhoto: UploadedPhoto = {
      uri: prepared.uri,
      base64: prepared.base64,
      previewBase64: prepared.previewBase64,
      mimeType: prepared.mimeType,
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: undefined,
      name: asset.fileName || "Style reference",
      kind: "own_style",
    };

    const applyTemporaryOwnStylePhoto = () => {
      setOwnStylePhoto(nextOwnStylePhoto);
      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
      setIntensity(null);
      setPreviewStyleId(INSTAME_OWN_STYLE_ID);
      setSelectedOwnStyleId(null);
      setResultBase64(null);
      setResultMeta(null);
      setShowEditComposer(false);
      setEditInstruction("");
    };

    const saveOwnStyleImmediately = async () => {
      const optimisticId = `__optimistic_own_style_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const optimisticStyle: InstaMeOwnStyle = {
        id: optimisticId,
        name: nextOwnStylePhoto.name || "Own Style",
        mimeType: nextOwnStylePhoto.mimeType,
        createdAt: new Date().toISOString(),
        previewUri: buildDataUri(nextOwnStylePhoto.previewBase64 || nextOwnStylePhoto.base64, nextOwnStylePhoto.mimeType),
        promptPreview: "Saving your style...",
        imageHash: preparedHash,
        firstUseSurchargePending: true,
      };

      setSavedOwnStyles((current) => [optimisticStyle, ...current.filter((style) => style.id !== optimisticId)]);

      try {
        const saved = await apiClient.saveInstaMeOwnStyle({
          image: {
            name: nextOwnStylePhoto.name,
            mimeType: nextOwnStylePhoto.mimeType,
            base64: nextOwnStylePhoto.base64,
            previewBase64: nextOwnStylePhoto.previewBase64 || nextOwnStylePhoto.base64,
            width: nextOwnStylePhoto.width,
            height: nextOwnStylePhoto.height,
            fileSizeBytes:
              nextOwnStylePhoto.fileSizeBytes || Math.ceil((nextOwnStylePhoto.base64.length * 3) / 4),
          },
          ownStyleMode,
        });

        setSavedOwnStyles((current) => {
          const next = current.filter((style) => style.id !== optimisticId && style.id !== saved.ownStyle.id);
          return [saved.ownStyle, ...next];
        });
      } catch (error: any) {
        setSavedOwnStyles((current) => current.filter((style) => style.id !== optimisticId));
        console.warn("[InstaMe] Immediate Own Style save failed:", error?.message || "unknown error");
      }
    };

    const duplicateOwnStyle = savedOwnStyles.find(
      (style) => style.imageHash && style.imageHash === preparedHash,
    );

    if (duplicateOwnStyle) {
      Alert.alert(
        "Style already saved",
        `This looks like your saved style \"${duplicateOwnStyle.name}\". Reuse it instead of paying the first-time Own Style fee again?`,
        [
          {
            text: "Use this upload",
            style: "cancel",
            onPress: () => {
              applyTemporaryOwnStylePhoto();
              void saveOwnStyleImmediately();
            },
          },
          {
            text: "Use saved style",
            onPress: () => {
              setSelectedStyleId(INSTAME_OWN_STYLE_ID);
              setIntensity(null);
              setPreviewStyleId(INSTAME_OWN_STYLE_ID);
              setSelectedOwnStyleId(duplicateOwnStyle.id);
              setOwnStylePhoto(null);
              setResultBase64(null);
              setResultMeta(null);
              setShowEditComposer(false);
              setEditInstruction("");
            },
          },
        ],
      );
      await Haptics.selectionAsync();
      return;
    }

    applyTemporaryOwnStylePhoto();
    void saveOwnStyleImmediately();
    await Haptics.selectionAsync();
  }, [ownStyleMode, pickRawImage, savedOwnStyles]);

  const handleStylePresetPress = useCallback((preset: InstaMeStylePreset) => {
    setSelectedStyleId(preset.id);

    if (preset.id === INSTAME_OWN_STYLE_ID) {
      setIntensity(null);
      setPreviewStyleId(INSTAME_OWN_STYLE_ID);
      return;
    }

    setPreviewStyleId(preset.id);
  }, []);

  const handleEnhancePreviewPress = useCallback(() => {
    setPreviewStyleId(ENHANCE_PREVIEW_CARD_ID);
  }, []);

  const handleStyleVibePress = useCallback((vibeId: string) => {
    setSelectedStyleVibeId(vibeId);
    setSelectedPhotoPackId((currentPackId) => {
      const currentPack = PHOTO_PACK_PRESETS.find((pack) => pack.id === currentPackId);
      return currentPack && currentPack.vibeId === vibeId ? currentPackId : null;
    });
    void Haptics.selectionAsync();
  }, []);

  const handlePhotoPackPress = useCallback((packId: string) => {
    const pack = PHOTO_PACK_PRESETS.find((item) => item.id === packId);
    if (!pack) {
      return;
    }

    setSelectedPhotoPackId((currentPackId) => (currentPackId === pack.id ? null : pack.id));
    setSelectedStyleVibeId(pack.vibeId);
    setSelectedPackBriefVibeId(pack.vibeId);
    // Reset pipeline state when switching aesthetics
    setPipelinePlan(null);
    setPipelineContinuityContext(null);
    setPipelineRenderResults([]);
    setPipelineError(null);
    setPackGridPreviewBase64(null);
    setPackGridRenderImages([]);
    setPackGridError(null);
    void Haptics.selectionAsync();
  }, []);

  const togglePackBriefRequiredElement = useCallback((elementId: string) => {
    setPackBriefRequiredElementIds((current) =>
      current.includes(elementId) ? current.filter((id) => id !== elementId) : [...current, elementId],
    );
    void Haptics.selectionAsync();
  }, []);

  const togglePipelineShotSelection = useCallback((position: number) => {
    setSelectedPipelineShotPositions((current) =>
      current.includes(position) ? current.filter((item) => item !== position) : [...current, position],
    );
    setPipelineRenderResults([]);
    void Haptics.selectionAsync();
  }, []);

  const selectAllPipelineShots = useCallback(() => {
    if (!pipelinePlan) return;
    setSelectedPipelineShotPositions(pipelinePlan.shots.map((shot) => shot.position));
    setPipelineRenderResults([]);
    void Haptics.selectionAsync();
  }, [pipelinePlan]);

  const clearPipelineShotSelection = useCallback(() => {
    setSelectedPipelineShotPositions([]);
    setPipelineRenderResults([]);
    void Haptics.selectionAsync();
  }, []);

  const handleGenerateGridPreview = useCallback(async () => {
    if (!activePhotoPack) return;
    if (!photo) {
      Alert.alert("Portrait required", "Add a portrait above before generating this pack.");
      return;
    }
    const aesthetic = GRID_PIPELINE_AESTHETICS.find((a) => a.id === activePhotoPack.id);
    const elementsNote =
      packBriefRequiredElementIds.length > 0
        ? `Include: ${packBriefRequiredElementIds
            .map((id) => PACK_BRIEF_REQUIRED_ELEMENTS.find((e) => e.id === id)?.label)
            .filter(Boolean)
            .join(", ")}.`
        : "";
    const extraNotes = [elementsNote, packBriefNotes.trim() ? `Must-have details: ${packBriefNotes.trim()}` : ""]
      .filter(Boolean)
      .join(" ");
    setPackGridPreviewLoading(true);
    setPackGridError(null);
    setPackGridPreviewBase64(null);
    setPipelinePlan(null);
    setPipelineRenderResults([]);
    setPipelineError(null);
    try {
      const result = await apiClient.generateInstaMeGridCompositePreview({
        imageCount: selectedPackImageCount,
        aesthetic: activePhotoPack.id,
        palette: selectedPackPalette.paletteText || aesthetic?.defaultPalette || "",
        lightType: aesthetic?.defaultLightType || "",
        extraNotes: extraNotes || undefined,
        hasPortraitReference: Boolean(photo),
        portrait: photo.base64,
      });
      setPackGridPreviewBase64(result.gridImageBase64);
      setPipelinePlan(result.plan);
      setPipelineContinuityContext(result.continuityContext);
      await refreshCredits();
    } catch (error: any) {
      setPackGridError(error?.message || "Failed to generate visual grid preview. Please try again.");
    } finally {
      setPackGridPreviewLoading(false);
    }
  }, [
    activePhotoPack,
    packBriefRequiredElementIds,
    packBriefNotes,
    photo,
    refreshCredits,
    selectedPackImageCount,
    selectedPackPalette,
  ]);

  const renderSelectedGridPackShots = useCallback(async (shotsToRender: PipelineShotPlanItem[]) => {
    if (!activePhotoPack || !pipelinePlan) return;
    if (!photo) {
      Alert.alert("Portrait required", "Add a portrait above before extracting individual images.");
      return;
    }
    if (!packGridPreviewBase64) {
      Alert.alert("Missing visual preview", "Generate the visual grid preview before extracting individual images.");
      return;
    }
    if (shotsToRender.length === 0) {
      Alert.alert("No images selected", "Select at least one image from the pack before rendering.");
      return;
    }

    const orderedShots = [...shotsToRender].sort((a, b) => a.position - b.position);
    const positions = orderedShots.map((shot) => shot.position);

    const portrait = photo.base64;

    setPackGridRenderLoading(true);
    setPackGridError(null);
    setPipelineError(null);
    setPipelineRenderResults([]);
    try {
      const result = await apiClient.generateInstaMeGridExtractShots({
        gridImageBase64: packGridPreviewBase64,
        plan: {
          aesthetic: pipelinePlan.aesthetic,
          palette: pipelinePlan.palette,
          lightType: pipelinePlan.lightType,
          shots: pipelinePlan.shots.map((shot) => ({
            position: shot.position,
            label: shot.label,
            hairstyle: shot.hairstyle,
            angle: shot.angle,
            type: shot.type,
          })),
        },
        positions,
        portrait,
      });
      setPipelineRenderResults([...result.images].sort((a, b) => a.position - b.position));
      await refreshCredits();
    } catch (error: any) {
      setPackGridError(error?.message || "Failed to extract selected grid images. Please try again.");
    } finally {
      setPackGridRenderLoading(false);
    }
  }, [activePhotoPack, pipelinePlan, photo, refreshCredits, packGridPreviewBase64]);

  const handleRenderGridPack = useCallback(() => {
    if (!activePhotoPack || !pipelinePlan) return;
    if (!packGridPreviewBase64) {
      Alert.alert("Generate preview first", "Create a visual grid preview before extracting separate images.");
      return;
    }

    const shotsToRender = pipelinePlan.shots.filter((shot) => selectedPipelineShotPositions.includes(shot.position));
    if (shotsToRender.length === 0) {
      Alert.alert("No images selected", "Select at least one image from the pack before rendering.");
      return;
    }

    const orderedShots = [...shotsToRender].sort((a, b) => a.position - b.position);
    const extractionOrder = orderedShots
      .map((shot) => {
        const row = Math.ceil(shot.position / 3);
        const col = ((shot.position - 1) % 3) + 1;
        return `${shot.position}(r${row},c${col})`;
      })
      .join(", ");

    const excludedCount = pipelinePlan.shots.length - shotsToRender.length;
    const title = `Extract ${shotsToRender.length} separate image${shotsToRender.length === 1 ? "" : "s"}?`;
    const message = [
      `${activePhotoPack.label} will be extracted from the visual grid with GPT Image at medium quality.`,
      `Selected: ${shotsToRender.length}/${pipelinePlan.shots.length} image${pipelinePlan.shots.length === 1 ? "" : "s"}.`,
      excludedCount > 0 ? `Excluded: ${excludedCount} image${excludedCount === 1 ? "" : "s"}.` : "All pack images are selected.",
      "Order is strict: row 1 left-to-right, then row 2, then row 3.",
      `Extraction sequence: ${extractionOrder}.`,
      `Cost: ${shotsToRender.length} credit${shotsToRender.length === 1 ? "" : "s"}.`,
    ].join("\n");

    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Generate",
        style: "default",
        onPress: () => {
          void renderSelectedGridPackShots(orderedShots);
        },
      },
    ]);
  }, [activePhotoPack, pipelinePlan, renderSelectedGridPackShots, selectedPipelineShotPositions, packGridPreviewBase64]);

  // ─── Grid Pipeline callbacks ──────────────────────────────────────────────

  const handlePipelineGeneratePlan = useCallback(async () => {
    if (!pipelineAestheticId) return;
    const aesthetic = GRID_PIPELINE_AESTHETICS.find((a) => a.id === pipelineAestheticId);
    if (!aesthetic) return;
    setPipelinePlanLoading(true);
    setPipelineError(null);
    setPipelinePlan(null);
    setPipelineRenderResults([]);
    try {
      const result = await apiClient.generateInstaMeGridPipelinePlan({
        imageCount: pipelineImageCount,
        aesthetic: aesthetic.id,
        palette: aesthetic.defaultPalette,
        lightType: aesthetic.defaultLightType,
        extraNotes: pipelineExtraNotes,
        hasPortraitReference: Boolean(photo),
      });
      setPipelinePlan(result.plan);
      setPipelineContinuityContext(result.continuityContext);
      void refreshCredits();
    } catch (error: any) {
      setPipelineError(error?.message || "Failed to generate grid plan. Please try again.");
    } finally {
      setPipelinePlanLoading(false);
    }
  }, [pipelineAestheticId, pipelineImageCount, pipelineExtraNotes, photo, refreshCredits]);

  const handlePipelineRender = useCallback(async () => {
    if (!pipelinePlan) return;
    setPipelineRenderLoading(true);
    setPipelineError(null);
    setPipelineRenderResults([]);
    try {
      const result = await apiClient.generateInstaMeGridPipelineRender({
        plan: pipelinePlan,
        portrait: photo?.base64,
      });
      setPipelineRenderResults(result.images);
      void refreshCredits();
    } catch (error: any) {
      setPipelineError(error?.message || "Failed to render grid images. Please try again.");
    } finally {
      setPipelineRenderLoading(false);
    }
  }, [pipelinePlan, photo, refreshCredits]);

  const handlePipelineExtend = useCallback(async () => {
    if (!pipelineContinuityContext) return;
    setPipelinePlanLoading(true);
    setPipelineError(null);
    setPipelineRenderResults([]);
    try {
      const result = await apiClient.generateInstaMeGridPipelineExtend({
        newImageCount: pipelineImageCount,
        continuityContext: pipelineContinuityContext,
        hasPortraitReference: Boolean(photo),
        extraNotes: pipelineExtraNotes,
      });
      setPipelinePlan(result.plan);
      setPipelineContinuityContext(result.continuityContext);
      void refreshCredits();
    } catch (error: any) {
      setPipelineError(error?.message || "Failed to extend grid. Please try again.");
    } finally {
      setPipelinePlanLoading(false);
    }
  }, [pipelineContinuityContext, pipelineImageCount, pipelineExtraNotes, photo, refreshCredits]);

  const handlePipelineReset = useCallback(() => {
    setPipelinePlan(null);
    setPipelineContinuityContext(null);
    setPipelineRenderResults([]);
    setPipelineError(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────

  const mainCollageItems = useMemo(() => {
    const enhanceCard = {
      id: ENHANCE_PREVIEW_CARD_ID,
      label: "Enhance your portrait",
      imageCandidates: getImageCandidates(portraitEnhanceCandidate?.uri, photo?.uri, ...fallbackPresetImageCandidates),
      theme: getStyleCardTheme(INSTAME_OWN_STYLE_ID),
      active: isEnhancePreviewActive,
      onPress: handleEnhancePreviewPress,
      aspectRatio:
        collageTileAspectRatios[ENHANCE_PREVIEW_CARD_ID] ||
        (photo?.width && photo?.height ? photo.width / photo.height : 0.72),
    };

    const presetCards = mainOnlyStylePresets.map((preset) => ({
      id: preset.id,
      label: preset.label,
      imageCandidates: getPresetImageCandidates(preset),
      theme: getStyleCardTheme(preset.id),
      active: selectedStyleId === preset.id,
      onPress: () => handleStylePresetPress(preset),
      aspectRatio: collageTileAspectRatios[preset.id] || 0.72,
    }));

    return [enhanceCard, ...presetCards];
  }, [
    collageTileAspectRatios,
    handleEnhancePreviewPress,
    handleStylePresetPress,
    isEnhancePreviewActive,
    mainOnlyStylePresets,
    photo?.height,
    photo?.uri,
    photo?.width,
    portraitEnhanceCandidate?.uri,
    selectedStyleId,
    fallbackPresetImageCandidates,
  ]);

  const mainCollageColumns = useMemo(() => {
    const columns = Array.from({ length: collageColumnCount }, () => [] as typeof mainCollageItems);

    mainCollageItems.forEach((item, index) => {
      columns[index % collageColumnCount].push(item);
    });

    return columns;
  }, [collageColumnCount, mainCollageItems]);

  const ownCollageItems = useMemo(() => {
    const uploadCard = {
      id: OWN_UPLOAD_CARD_ID,
      label: "CLONE ANY AESTHETIC",
      imageCandidates: [] as string[],
      theme: getStyleCardTheme(INSTAME_OWN_STYLE_ID),
      active: selectedStyleId === INSTAME_OWN_STYLE_ID && !selectedOwnStyleId,
      onPress: () => {
        setSelectedStyleId(INSTAME_OWN_STYLE_ID);
        setIntensity(null);
        setPreviewStyleId(INSTAME_OWN_STYLE_ID);
        setSelectedOwnStyleId(null);
        setOwnStylePhoto(null);
      },
      aspectRatio: collageTileAspectRatios[OWN_UPLOAD_CARD_ID] || 0.72,
    };

    const savedCards = savedOwnStyles.map((style) => {
      const cardId = `__own_saved_${style.id}`;
      return {
        id: cardId,
        label: style.name,
        imageCandidates: getImageCandidates(style.previewUri, ownStyleHeroUri),
        theme: getStyleCardTheme(INSTAME_OWN_STYLE_ID),
        active: selectedOwnStyleId === style.id,
        onPress: () => {
          setSelectedStyleId(INSTAME_OWN_STYLE_ID);
          setIntensity(null);
          setSelectedOwnStyleId(style.id);
          setOwnStylePhoto(null);
          setResultBase64(null);
          setResultMeta(null);
          setShowEditComposer(false);
          setEditInstruction("");
          setPreviewStyleId(INSTAME_OWN_STYLE_ID);
          void Haptics.selectionAsync();
        },
        aspectRatio: collageTileAspectRatios[cardId] || 0.72,
      };
    });

    return [uploadCard, ...savedCards];
  }, [
    collageTileAspectRatios,
    ownStyleHeroUri,
    savedOwnStyles,
    selectedOwnStyleId,
    selectedStyleId,
  ]);

  const ownCollageColumns = useMemo(() => {
    const columns = Array.from({ length: collageColumnCount }, () => [] as typeof ownCollageItems);

    ownCollageItems.forEach((item, index) => {
      columns[index % collageColumnCount].push(item);
    });

    return columns;
  }, [collageColumnCount, ownCollageItems]);

  const artCollageItems = useMemo(() => {
    const noneTheme = getArtStyleCardTheme(ART_STYLE_NONE_ID);
    const noneCard = {
      id: ART_STYLE_NONE_ID,
      label: "No art finish",
      imageCandidates: getImageCandidates(...getPresetImageCandidates(selectedStylePreset || defaultStylePreset)),
      previewSource: null,
      theme: noneTheme,
      active: !selectedArtStyleId,
      onPress: () => setSelectedArtStyleId(""),
      aspectRatio: collageTileAspectRatios[ART_STYLE_NONE_ID] || 0.72,
    };

    const styleCards = INSTAME_ART_STYLES.map((style) => ({
      id: style.id,
      label: style.label,
      imageCandidates: [] as string[],
      previewSource: style.preview,
      theme: getArtStyleCardTheme(style.id),
      active: selectedArtStyleId === style.id,
      onPress: () => setSelectedArtStyleId(style.id),
      aspectRatio: collageTileAspectRatios[style.id] || 0.72,
    }));

    return [noneCard, ...styleCards];
  }, [
    collageTileAspectRatios,
    defaultStylePreset,
    selectedArtStyleId,
    selectedStylePreset,
  ]);

  const artCollageColumns = useMemo(() => {
    const columns = Array.from({ length: collageColumnCount }, () => [] as typeof artCollageItems);

    artCollageItems.forEach((item, index) => {
      columns[index % collageColumnCount].push(item);
    });

    return columns;
  }, [artCollageItems, collageColumnCount]);

  const collageTileCandidateMap = useMemo(
    () =>
      Object.fromEntries(
        [...mainCollageItems, ...ownCollageItems, ...artCollageItems].map((item) => [item.id, item.imageCandidates]),
      ) as Record<string, string[]>,
    [artCollageItems, mainCollageItems, ownCollageItems],
  );

  const handleCollageTileError = useCallback((styleId: string, failedUri?: string) => {
    const candidates = collageTileCandidateMap[styleId] || [];
    const currentUri = failedUri || candidates[0] || "(unknown)";
    console.warn(`[InstaMe] Image load error — style: ${styleId}, failed URI: ${currentUri}, total candidates: ${candidates.length}`);

    if (candidates.length <= 1) {
      return;
    }

    setCollageTileImageOverrides((current) => {
      const resolvedCurrent = current[styleId] || candidates[0];
      const currentIndex = candidates.indexOf(resolvedCurrent);
      const nextCandidate = candidates[currentIndex + 1];

      if (!nextCandidate) {
        return current;
      }

      console.log(`[InstaMe] Trying next candidate for ${styleId}: ${nextCandidate}`);
      return {
        ...current,
        [styleId]: nextCandidate,
      };
    });
  }, [collageTileCandidateMap]);

  const handleUseCurrentOwnStyle = useCallback(async () => {
    if (!ownStylePhoto && !selectedOwnStyleId) {
      Alert.alert("Missing style image", "Upload or select one Own Style before activating it.");
      return;
    }

    setSelectedStyleId(INSTAME_OWN_STYLE_ID);
    setIntensity(null);
    setPreviewStyleId(null);
    await Haptics.selectionAsync();
  }, [ownStylePhoto, selectedOwnStyleId]);

  const handleDeleteSavedOwnStyle = useCallback((style: InstaMeOwnStyle) => {
    Alert.alert(
      "Delete saved style?",
      "This removes the saved prompt and thumbnail from your Own Styles library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await apiClient.deleteInstaMeOwnStyle(style.id);
              setSavedOwnStyles((current) => current.filter((entry) => entry.id !== style.id));
              const nextFavoriteKeys = favoriteStyleKeys.filter((key) => key !== toOwnStyleFavoriteKey(style.id));
              setFavoriteStyleKeys(nextFavoriteKeys);
              await AsyncStorage.setItem(getInstaMeFavoritesStorageKey(user?.id), JSON.stringify(nextFavoriteKeys));
              if (selectedOwnStyleId === style.id) {
                setSelectedOwnStyleId(null);
              }
              await Haptics.selectionAsync();
            } catch (error: any) {
              Alert.alert("Delete failed", error?.message || "Could not remove this saved style.");
            }
          },
        },
      ],
    );
  }, [favoriteStyleKeys, selectedOwnStyleId, user?.id]);

  const handleRenameSavedOwnStyle = useCallback(async () => {
    if (!selectedSavedOwnStyle) return;
    const nextName = ownStyleNameDraft.trim().slice(0, 48);
    if (!nextName || nextName === selectedSavedOwnStyle.name) return;

    setRenamingOwnStyle(true);
    try {
      const result = await apiClient.renameInstaMeOwnStyle(selectedSavedOwnStyle.id, nextName);
      setSavedOwnStyles((current) =>
        current.map((style) => (style.id === result.ownStyle.id ? result.ownStyle : style)),
      );
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert("Rename failed", error?.message || "Could not rename this saved style.");
    } finally {
      setRenamingOwnStyle(false);
    }
  }, [ownStyleNameDraft, selectedSavedOwnStyle]);

  const restoreHistoryEntry = useCallback(async (entry: InstaMeHistoryEntry, openEditComposer?: boolean) => {
    if (entry.sourcePhotoUri) {
      const [, sourceBase64 = ""] = entry.sourcePhotoUri.split(",");
      setPhoto((current) => ({
        uri: entry.sourcePhotoUri || current?.uri || "",
        base64: sourceBase64 || current?.base64 || "",
        previewBase64: sourceBase64 || current?.previewBase64,
        mimeType: current?.mimeType || "image/jpeg",
        kind: current?.kind,
        width: current?.width,
        height: current?.height,
        fileSizeBytes: current?.fileSizeBytes,
        sourceImageId: current?.sourceImageId,
        name: current?.name,
      }));
    }
    setComparisonImageUri(entry.sourcePhotoUri || null);

    setResultBase64(entry.editableBase64);
    setResultMeta({
      qualityTier: resultMeta?.qualityTier,
      qualityLabel: resultMeta?.qualityLabel,
      promptOnlyMode: entry.stylePresetId === INSTAME_OWN_STYLE_ID,
      stylePresetId: entry.stylePresetId || null,
    });
    setCustomPrompt(entry.customPrompt || "");
    setOwnStylePhoto(null);
    setSelectedArtStyleId(entry.artStyleId || "");

    if (entry.stylePresetId === INSTAME_OWN_STYLE_ID && entry.ownStyleId) {
      const ownStyle = savedOwnStyles.find((style) => style.id === entry.ownStyleId);
      if (ownStyle) {
        setSelectedStyleId(INSTAME_OWN_STYLE_ID);
        setSelectedOwnStyleId(ownStyle.id);
      }
    } else if (entry.stylePresetId) {
      setSelectedStyleId(entry.stylePresetId);
      setSelectedOwnStyleId(null);
    }

    if (styleSectionTab === "main" && entry.stylePresetId) {
      setPreviewStyleId(entry.stylePresetId);
      setIsRetouchDrawerOpen(false);
    }

    setShowEditComposer(Boolean(openEditComposer));
    if (openEditComposer) {
      setEditInstruction("");
    }
    await Haptics.selectionAsync();
  }, [resultMeta?.qualityLabel, resultMeta?.qualityTier, savedOwnStyles, styleSectionTab]);

  const persistHistoryResult = useCallback(async (options: {
    imageBase64: string;
    mimeType?: string;
    styleLabel: string;
    stylePresetId?: string | null;
    ownStyleId?: string | null;
    customPrompt: string;
    creditsCharged: number;
    source: "transform" | "edit" | "portrait_enhance";
  }) => {
    const prepared = await optimizeGeneratedBase64Image({
      base64: options.imageBase64,
      mimeType: options.mimeType || "image/png",
    });

    await appendGenerationHistory({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      previewUri: buildDataUri(prepared.previewBase64, prepared.mimeType),
      editableBase64: prepared.base64,
      editableMimeType: prepared.mimeType,
      sourcePhotoUri: photo ? buildDataUri(photo.previewBase64 || photo.base64, photo.mimeType) : undefined,
      styleLabel: options.styleLabel,
      stylePresetId: options.stylePresetId || null,
      ownStyleId: options.ownStyleId || null,
      artStyleId: selectedArtStyleId || null,
      customPrompt: options.customPrompt,
      creditsCharged: options.creditsCharged,
      createdAt: new Date().toISOString(),
      source: options.source,
    });
  }, [appendGenerationHistory, photo, selectedArtStyleId]);

  const handleEnhancePortrait = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload one portrait before enhancing it.");
      return;
    }

    if (credits < portraitEnhanceCost) {
      Alert.alert(
        "Not enough credits",
        `Portrait Enhance costs ${portraitEnhanceCost} credits.`,
      );
      return;
    }

    setPortraitEnhanceLoading(true);
    try {
      const result = await apiClient.enhanceInstaMePortrait({
        photo: {
          base64: photo.base64,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
        },
      });

      const enhancedMimeType = inferImageMimeTypeFromBase64(result.imageBase64);

      setPortraitEnhanceCandidate({
        uri: buildDataUri(result.imageBase64, enhancedMimeType),
        base64: result.imageBase64,
        previewBase64: result.imageBase64,
        mimeType: enhancedMimeType,
        kind: "enhanced",
        width: 1024,
        height: 1024,
        name: `${photo.name || "Portrait"} Enhanced`,
      });
      setComparisonImageUri(buildDataUri(photo.previewBase64 || photo.base64, photo.mimeType));
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: enhancedMimeType,
        styleLabel: "Portrait Enhance",
        customPrompt: "",
        creditsCharged: portraitEnhanceCost,
        source: "portrait_enhance",
      });
      await refreshCredits();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Portrait enhancement failed.");
    } finally {
      setPortraitEnhanceLoading(false);
    }
  }, [credits, persistHistoryResult, photo, portraitEnhanceCost, refreshCredits]);

  const handleKeepEnhancedPortrait = useCallback(async () => {
    if (!portraitEnhanceCandidate) {
      return;
    }

    let optimizedEnhanced = portraitEnhanceCandidate;
    let savedImageId = "";
    try {
      const prepared = await optimizeGeneratedBase64Image({
        base64: portraitEnhanceCandidate.base64,
        mimeType: portraitEnhanceCandidate.mimeType,
      });

      optimizedEnhanced = {
        ...portraitEnhanceCandidate,
        uri: buildDataUri(prepared.base64, prepared.mimeType),
        base64: prepared.base64,
        previewBase64: prepared.previewBase64,
        mimeType: prepared.mimeType,
        width: prepared.width,
        height: prepared.height,
        fileSizeBytes: prepared.fileSizeBytes,
      };

      const saved = await apiClient.saveInstaMeUploadedImage({
        image: {
          name: portraitEnhanceCandidate.name || `${photo?.name || "Portrait"} Enhanced`,
          kind: "enhanced",
          mimeType: optimizedEnhanced.mimeType,
          base64: optimizedEnhanced.base64,
          previewBase64: optimizedEnhanced.previewBase64 || optimizedEnhanced.base64,
          width: optimizedEnhanced.width || 1024,
          height: optimizedEnhanced.height || 1024,
          fileSizeBytes:
            optimizedEnhanced.fileSizeBytes || Math.ceil((optimizedEnhanced.base64.length * 3) / 4),
        },
      });
      savedImageId = saved.image?.id || "";
    } catch (error: any) {
      Alert.alert(
        "Saved as current portrait only",
        error?.message || "The enhanced portrait could not be added to Uploaded Images.",
      );
    }

    applyBasePhoto({
      ...optimizedEnhanced,
      sourceImageId: savedImageId || optimizedEnhanced.sourceImageId,
    });
    setPortraitEnhanceCandidate(null);
    await Haptics.selectionAsync();
    if (savedImageId) {
      Alert.alert("Saved", "Your enhanced portrait was saved to Enhanced Portraits for later use.");
    }
  }, [applyBasePhoto, photo?.name, portraitEnhanceCandidate]);

  const handleTransform = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload one photo before transforming.");
      return;
    }
    if (!isOwnStyleSelected && !stylePresets.some((preset) => preset.id === selectedStyleId)) {
      Alert.alert("Style unavailable", "The selected style is no longer available. Please choose another style and try again.");
      return;
    }
    if (isOwnStyleSelected && !ownStylePhoto && !selectedOwnStyleId) {
      Alert.alert("Missing style image", "Upload one style reference image for Own Style before generating.");
      return;
    }
    if (credits < transformCost) {
      Alert.alert("Not enough credits", `This transform costs ${transformCost} credits.`);
      return;
    }

    setLoading(true);
    try {
      const selectedPreset = selectedStylePreset || defaultStylePreset;
      const composedPrompt = [selectedArtStyle?.promptHint, customPrompt.trim()].filter(Boolean).join(". ");

      const result = await apiClient.transformOldMoney({
        photo: {
          base64: photo.base64,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
        },
        stylePhoto: isOwnStyleSelected && ownStylePhoto && !selectedOwnStyleId
          ? {
              base64: ownStylePhoto.base64,
              mimeType: ownStylePhoto.mimeType,
              previewBase64: ownStylePhoto.previewBase64,
              width: ownStylePhoto.width,
              height: ownStylePhoto.height,
              fileSizeBytes: ownStylePhoto.fileSizeBytes,
              name: ownStylePhoto.name,
            }
          : undefined,
        savedOwnStyleId: isOwnStyleSelected ? selectedOwnStyleId || undefined : undefined,
        saveOwnStyle: Boolean(isOwnStyleSelected && ownStylePhoto && !selectedOwnStyleId),
        ownStyleMode: isOwnStyleSelected ? ownStyleMode : undefined,
        customPrompt: composedPrompt,
        intensity: selectedArtStyle || isOwnStyleSelected ? undefined : intensity || undefined,
        preserveBackground,
        stylePresetId: selectedPreset?.id,
        generationTierId: activeGenerationTier?.id || selectedGenerationTierId,
      });

      const transformedMimeType = inferImageMimeTypeFromBase64(result.imageBase64);

      setResultBase64(result.imageBase64);
      setComparisonImageUri(buildDataUri(photo.previewBase64 || photo.base64, photo.mimeType));
      setResultMeta({
        qualityTier: result.qualityTier,
        qualityLabel: result.qualityLabel,
        promptOnlyMode: result.promptOnlyMode,
        generationTierId: result.generationTierId,
        stylePresetId: result.stylePresetId,
        imageMimeType: transformedMimeType,
      });
      if (result.savedOwnStyle) {
        const savedStyle = result.savedOwnStyle as InstaMeOwnStyle;
        setSavedOwnStyles((current) => {
          const rest = current.filter((entry) => entry.id !== savedStyle.id);
          return [savedStyle, ...rest];
        });
        setSelectedOwnStyleId(result.savedOwnStyle.id);
        setOwnStylePhoto(null);
      }
      setShowEditComposer(false);
      setEditInstruction("");
      setIsRetouchDrawerOpen(false);
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: transformedMimeType,
        styleLabel: selectedArtStyle ? `${selectedPreset?.label || "Chicoo"} + ${selectedArtStyle.label}` : selectedPreset?.label || "Chicoo",
        stylePresetId: result.stylePresetId,
        ownStyleId: result.savedOwnStyle?.id || selectedOwnStyleId || null,
        customPrompt: composedPrompt,
        creditsCharged: result.creditsCharged || transformCost,
        source: "transform",
      });
      await refreshCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      InteractionManager.runAfterInteractions(() => {
        resultCardRef.current?.measureLayout(
          mainScrollRef.current?.getInnerViewNode?.() as any,
          (_x, y) => { mainScrollRef.current?.scrollTo({ y: y - 20, animated: true }); },
          () => {},
        );
      });
    } catch (error: any) {
      const message = typeof error?.message === "string" ? error.message : "";
      if (isOwnStyleSelected && (error?.status === 404 || error?.status === 400) && /saved own style not found/i.test(message)) {
        setSelectedOwnStyleId(null);
        try {
          const ownStylesResult = await apiClient.getInstaMeOwnStyles();
          setSavedOwnStyles(Array.isArray(ownStylesResult.ownStyles) ? ownStylesResult.ownStyles : []);
        } catch {
          // Keep local state fallback even if refresh fails.
        }
        Alert.alert(
          "Own Style unavailable",
          "This saved Own Style is no longer available. Please select another saved style or upload a new one, then try again.",
        );
        return;
      }
      Alert.alert("Error", error?.message || "Transformation failed.");
    } finally {
      setLoading(false);
    }
  }, [
    photo,
    credits,
    transformCost,
    selectedStylePreset,
    customPrompt,
    defaultStylePreset,
    selectedArtStyle,
    isOwnStyleSelected,
    intensity,
    ownStylePhoto,
    selectedOwnStyleId,
    ownStyleMode,
    preserveBackground,
    persistHistoryResult,
    refreshCredits,
    activeGenerationTier,
    selectedGenerationTierId,
    selectedStyleId,
    stylePresets,
  ]);

  const handleEditResult = useCallback(async () => {
    if (!resultBase64) {
      Alert.alert("Missing image", "Generate an image before editing it.");
      return;
    }
    if (!editInstruction.trim()) {
      Alert.alert("Missing edit", "Tell Chicoo what you want to change.");
      return;
    }
    if (credits < (selectedEditTier?.credits ?? 0)) {
      Alert.alert(
        "Not enough credits",
        `This edit costs ${selectedEditTier?.credits ?? 0} credits.`,
      );
      return;
    }

    setEditLoading(true);
    try {
      const previousResultBase64 = resultBase64;
      const result = await apiClient.editInstaMeImage({
        currentImage: {
          base64: resultBase64,
          mimeType: resultImageMimeType,
          width: photo?.width,
          height: photo?.height,
        },
        originalPhoto: photo ? {
          base64: photo.base64,
          mimeType: photo.mimeType,
          width: photo.width,
          height: photo.height,
        } : undefined,
        editInstruction: editInstruction.trim(),
        customPrompt: customPrompt.trim(),
        editTierId: selectedEditTierId,
      });

      const editedMimeType = inferImageMimeTypeFromBase64(result.imageBase64);

      setResultBase64(result.imageBase64);
      setComparisonImageUri(buildDataUri(previousResultBase64, resultImageMimeType));
      setResultMeta({
        qualityTier: result.qualityTier,
        qualityLabel: result.qualityLabel,
        imageMimeType: editedMimeType,
      });
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: editedMimeType,
        styleLabel: `${selectedStylePreset?.label || "Chicoo"} Edit`,
        stylePresetId: resultMeta?.stylePresetId || selectedStyleId,
        ownStyleId: selectedOwnStyleId,
        customPrompt: editInstruction.trim(),
        creditsCharged: selectedEditTier?.credits ?? 0,
        source: "edit",
      });
      await refreshCredits();
      setShowEditComposer(false);
      setEditInstruction("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Edit failed.");
    } finally {
      setEditLoading(false);
    }
  }, [
    resultBase64,
    editInstruction,
    credits,
    selectedEditTier,
    selectedEditTierId,
    photo,
    customPrompt,
    resultImageMimeType,
    persistHistoryResult,
    refreshCredits,
    resultMeta?.stylePresetId,
    selectedStyleId,
    selectedStylePreset?.label,
    selectedOwnStyleId,
  ]);

  const exportBase64Image = useCallback(async (
    base64: string,
    options?: {
      mimeType?: string;
      fileNamePrefix?: string;
      dialogTitle?: string;
    },
  ) => {
    const normalizedBase64 = stripDataUriPrefix(base64);
    if (!normalizedBase64) {
      return;
    }

    const mimeType = options?.mimeType || "image/png";
    const fileNamePrefix = options?.fileNamePrefix || "instame-style";
    const dialogTitle = options?.dialogTitle || "Save Chicoo Result";
    const fileExtension = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg" : "png";

    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = buildDataUri(normalizedBase64, mimeType);
        link.download = `${fileNamePrefix}-${Date.now()}.${fileExtension}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const filePath = `${FileSystem.cacheDirectory}${fileNamePrefix}-${Date.now()}.${fileExtension}`;
      await FileSystem.writeAsStringAsync(filePath, normalizedBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType,
          dialogTitle,
        });
      } else {
        Alert.alert("Info", "Sharing is not available on this device.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not export this image.");
    }
  }, []);

  const handleDownload = useCallback(async () => {
    if (!resultBase64) return;

    await exportBase64Image(resultBase64, {
      mimeType: resultImageMimeType,
      fileNamePrefix: "instame-style",
      dialogTitle: "Save Chicoo Result",
    });
  }, [exportBase64Image, resultBase64, resultImageMimeType]);

  const handleDownloadEnhancedPortrait = useCallback(async () => {
    if (!portraitEnhanceCandidate?.base64) {
      return;
    }

    await exportBase64Image(portraitEnhanceCandidate.base64, {
      mimeType: portraitEnhanceCandidate.mimeType || "image/png",
      fileNamePrefix: "instame-enhanced-portrait",
      dialogTitle: "Save Enhanced Portrait",
    });
  }, [exportBase64Image, portraitEnhanceCandidate]);

  const handleDownloadPackImage = useCallback(async (imageBase64: string, label: string, position: number) => {
    const safeLabel = label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `image-${position}`;
    await exportBase64Image(imageBase64, {
      mimeType: "image/png",
      fileNamePrefix: `chicoo-pack-${position}-${safeLabel}`,
      dialogTitle: "Save Pack Image",
    });
  }, [exportBase64Image]);

  const selectedStyleVibeCount = styleVibeCounts[selectedStyleVibe.id] ?? mainOnlyStylePresets.length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#000000", "#111111", "#000000"]} locations={[0, 0.5, 1]} style={StyleSheet.absoluteFill} />

      <ScrollView
        ref={mainScrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerCopySolo}>
              <Text style={styles.headerBrand}>Chicoo</Text>
              <Text style={styles.headerTitle}>Aesthetic studio</Text>
            </View>
            <View style={styles.headerCreditsLine}>
              <Text style={styles.headerCreditsCount}>{credits}</Text>
              <Text style={styles.headerCreditsLabel}>Credits</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionTabBarOuter}>
          <View style={styles.sectionTabBar}>
          {([  
              { key: "main" as const, label: "Main Styles", icon: "sparkles" as const },
              { key: "own" as const, label: "Clone Aesthetic", icon: "copy-outline" as const },
              { key: "art" as const, label: "Art Styles", icon: "color-palette-outline" as const },
            ]).map((tab) => {
              const active = styleSectionTab === tab.key;
              return (
                <Pressable
                  key={tab.key}
                  onPress={() => {
                    setStyleSectionTab(tab.key);
                    if (tab.key === "own") {
                      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
                      setIntensity(null);
                      setPreviewStyleId(null);
                    }
                  }}
                  style={[styles.sectionTab, active && styles.sectionTabActive]}
                >
                  <View style={styles.sectionTabContent}>
                    <Ionicons name={tab.icon} size={16} color={active ? Colors.accent : Colors.textMuted} />
                    <Text style={[styles.sectionTabText, active && styles.sectionTabTextActive]}>{tab.label}</Text>
                  </View>
                  {active ? <View style={styles.sectionTabIndicator} /> : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        {styleSectionTab === "main" ? (
          <>
            <View style={styles.vibeSection}>
              <LinearGradient
                colors={selectedStyleVibe.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.vibeFeatureCard}
              >
                <View style={styles.vibeFeatureTopRow}>
                  <View style={[styles.vibeFeatureIcon, { borderColor: selectedStyleVibe.accent }]}>
                    <Ionicons name={selectedStyleVibe.icon as keyof typeof Ionicons.glyphMap} size={18} color={selectedStyleVibe.accent} />
                  </View>
                  <View style={styles.vibeFeatureCopy}>
                    <Text style={styles.vibeFeatureEyebrow}>Curated style map</Text>
                    <Text style={styles.vibeFeatureTitle}>{selectedStyleVibe.label}</Text>
                  </View>
                  <View style={styles.vibeFeatureCountPill}>
                    <Text style={styles.vibeFeatureCountText}>{selectedStyleVibeCount} looks</Text>
                  </View>
                </View>
                <Text style={styles.vibeFeatureTagline}>{selectedStyleVibe.tagline}</Text>
                {activePhotoPack ? (
                  <View style={styles.vibeActivePackStrip}>
                    <Ionicons name={activePhotoPack.icon as keyof typeof Ionicons.glyphMap} size={14} color={activePhotoPack.accent} />
                    <Text style={styles.vibeActivePackText}>
                      {activePhotoPack.label}: {activePhotoPack.example}
                    </Text>
                  </View>
                ) : null}
              </LinearGradient>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.vibeRail}
              >
                {STYLE_VIBE_CATEGORIES.map((vibe) => {
                  const active = selectedStyleVibeId === vibe.id;
                  const count = styleVibeCounts[vibe.id] ?? 0;
                  return (
                    <Pressable
                      key={vibe.id}
                      onPress={() => handleStyleVibePress(vibe.id)}
                      style={({ pressed }) => [
                        styles.vibeRailCard,
                        active && styles.vibeRailCardActive,
                        pressed ? { opacity: 0.9, transform: [{ scale: 0.98 }] } : undefined,
                      ]}
                    >
                      <LinearGradient
                        colors={vibe.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.vibeRailCardFill}
                      >
                        <View style={styles.vibeRailCardTop}>
                          <Ionicons name={vibe.icon as keyof typeof Ionicons.glyphMap} size={15} color={vibe.accent} />
                          <Text style={[styles.vibeRailCount, active && { color: vibe.accent }]}>{count}</Text>
                        </View>
                        <Text numberOfLines={1} style={styles.vibeRailLabel}>{vibe.shortLabel}</Text>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.packSection}>
              <View style={styles.packHeaderRow}>
                <View>
                  <Text style={styles.packEyebrow}>Instagram content packs</Text>
                  <Text style={styles.packTitle}>Build a coordinated pack brief</Text>
                </View>
                <Text style={styles.packMetaText}>
                  Step {packPlannerCurrentStep} of {PACK_BRIEF_FLOW_STEPS.length}
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.packRail}>
                {PHOTO_PACK_PRESETS.map((pack) => {
                  const active = activePhotoPack?.id === pack.id;
                  const hasImages = (pack.previewImages?.length ?? 0) > 0;
                  const imgCount = pack.previewImages?.length ?? 0;
                  return (
                    <Pressable
                      key={pack.id}
                      onPress={() => {
                        if (hasImages) {
                          setPackImagePreviewId(pack.id);
                          setPackImagePreviewIndex(0);
                        }
                        handlePhotoPackPress(pack.id);
                      }}
                      style={({ pressed }) => [
                        styles.packCard,
                        active && styles.packCardActive,
                        pressed ? { opacity: 0.9, transform: [{ scale: 0.97 }] } : undefined,
                      ]}
                    >
                      {/* Background: diptych if 2+ images, single contain, or gradient fallback */}
                      {imgCount >= 2 ? (
                        <Image source={pack.previewImages![0]} style={StyleSheet.absoluteFillObject as any} contentFit="contain" />
                      ) : hasImages ? (
                        <Image source={pack.previewImages![0]} style={StyleSheet.absoluteFillObject as any} contentFit="contain" />
                      ) : (
                        <LinearGradient colors={pack.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFillObject as any} />
                      )}

                      {/* Bottom gradient overlay with text */}
                      <LinearGradient
                        colors={["transparent", "transparent", "rgba(0,0,0,0.68)", "rgba(0,0,0,0.96)"]}
                        locations={[0, 0.38, 0.70, 1]}
                        style={styles.packCardOverlay}
                      >
                        <View style={styles.packCardTopRow}>
                          <Text style={styles.packCardCount}>6-12 IMAGES</Text>
                          {hasImages ? (
                            <View style={styles.packCardExpandHint}>
                              <Ionicons name="expand-outline" size={11} color="rgba(255,255,255,0.72)" />
                            </View>
                          ) : (
                            <Ionicons name={pack.icon as keyof typeof Ionicons.glyphMap} size={13} color={pack.accent} />
                          )}
                        </View>
                        <View style={styles.packCardBottomCopy}>
                          <Text style={styles.packCardTitle}>{pack.label}</Text>
                          <Text numberOfLines={2} style={styles.packCardSubtitle}>{pack.subtitle}</Text>
                        </View>
                      </LinearGradient>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={styles.packPlannerCard}>
                <View style={styles.packPlannerStepsRow}>
                  {PACK_BRIEF_FLOW_STEPS.map((stepLabel, index) => {
                    const stepNumber = index + 1;
                    return (
                      <Text
                        key={stepLabel}
                        style={[
                          styles.packPlannerStepText,
                          stepNumber <= packPlannerCurrentStep && styles.packPlannerStepTextActive,
                        ]}
                      >
                        {stepNumber}. {stepLabel}
                      </Text>
                    );
                  })}
                </View>

                {!activePhotoPack ? (
                  <View style={styles.packPlannerEmptyState}>
                    <Ionicons name="albums-outline" size={18} color="rgba(255,255,255,0.56)" />
                    <Text style={styles.packPlannerEmptyTitle}>Choose a pack preset to begin</Text>
                    <Text style={styles.packPlannerEmptySubtitle}>
                      Select a preset, then choose 6, 9, or 12 images before preview.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.packPlannerSummaryCard}>
                      <Text style={styles.packPlannerSummaryTitle}>{activePhotoPack.label}</Text>
                      <Text style={styles.packPlannerSummaryText}>
                        {selectedPackImageCount} images • {selectedPackBriefVibe.label}
                      </Text>
                      <Text style={styles.packPlannerDeliverableText}>{activePhotoPack.deliverable}</Text>
                    </View>

                    <View style={styles.packPlannerBlock}>
                      <Text style={styles.packPlannerLabel}>Image count (pack + extension)</Text>
                      <View style={styles.packPlannerCountRow}>
                        {PACK_IMAGE_COUNT_OPTIONS.map((count) => {
                          const active = selectedPackImageCount === count;
                          return (
                            <Pressable
                              key={`pack-count-${count}`}
                              onPress={() => {
                                setSelectedPackImageCount(count);
                                setPipelineImageCount(count);
                                void Haptics.selectionAsync();
                              }}
                              style={({ pressed }) => [
                                styles.packPlannerCountChip,
                                active && styles.packPlannerCountChipActive,
                                pressed ? { opacity: 0.88 } : undefined,
                              ]}
                            >
                              <Text style={[styles.packPlannerCountChipText, active && styles.packPlannerCountChipTextActive]}>
                                {count}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                      <Text style={styles.packPlannerSelectionHint}>Applied to preview generation and continuity extension.</Text>
                    </View>

                    <View style={styles.packPlannerBlock}>
                      <Text style={styles.packPlannerLabel}>Style direction</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.packPlannerVibeRail}
                      >
                        {packBriefVibeOptions.map((vibe) => {
                          const active = selectedPackBriefVibeId === vibe.id;
                          return (
                            <Pressable
                              key={`pack-vibe-${vibe.id}`}
                              onPress={() => {
                                setSelectedPackBriefVibeId(vibe.id);
                                void Haptics.selectionAsync();
                              }}
                              style={({ pressed }) => [
                                styles.packPlannerVibeChip,
                                active && styles.packPlannerVibeChipActive,
                                pressed ? { opacity: 0.9 } : undefined,
                              ]}
                            >
                              <Ionicons name={vibe.icon as keyof typeof Ionicons.glyphMap} size={12} color={active ? vibe.accent : "rgba(255,255,255,0.75)"} />
                              <Text style={[styles.packPlannerVibeChipText, active && { color: "#FFF" }]}>{vibe.shortLabel}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.packPlannerBlock}>
                      <Text style={styles.packPlannerLabel}>Color palette direction</Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.packPlannerPaletteRail}
                      >
                        {PACK_COLOR_PALETTES.map((palette) => {
                          const active = selectedPackPaletteId === palette.id;
                          return (
                            <Pressable
                              key={palette.id}
                              onPress={() => {
                                setSelectedPackPaletteId(palette.id);
                                void Haptics.selectionAsync();
                              }}
                              style={({ pressed }) => [
                                styles.packPlannerPaletteCard,
                                active && styles.packPlannerPaletteCardActive,
                                pressed ? { opacity: 0.9 } : undefined,
                              ]}
                            >
                              <View style={styles.packPlannerPaletteSwatches}>
                                {palette.colors.map((color) => (
                                  <View key={`${palette.id}-${color}`} style={[styles.packPlannerPaletteSwatch, { backgroundColor: color }]} />
                                ))}
                              </View>
                              <Text style={styles.packPlannerPaletteTitle}>{palette.label}</Text>
                              <Text numberOfLines={1} style={styles.packPlannerPaletteSubtitle}>{palette.paletteText}</Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <View style={styles.packPlannerBlock}>
                      <Text style={styles.packPlannerLabel}>Quick element tags</Text>
                      <View style={styles.packPlannerElementWrap}>
                        {PACK_BRIEF_REQUIRED_ELEMENTS.map((element) => {
                          const active = packBriefRequiredElementIds.includes(element.id);
                          return (
                            <Pressable
                              key={element.id}
                              onPress={() => togglePackBriefRequiredElement(element.id)}
                              style={({ pressed }) => [
                                styles.packPlannerElementChip,
                                active && styles.packPlannerElementChipActive,
                                pressed ? { opacity: 0.88 } : undefined,
                              ]}
                            >
                              <Text style={[styles.packPlannerElementChipText, active && styles.packPlannerElementChipTextActive]}>
                                {element.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    <View style={styles.packPlannerBlock}>
                      <Text style={styles.packPlannerLabel}>Must-have elements (optional)</Text>
                      <TextInput
                        value={packBriefNotes}
                        onChangeText={setPackBriefNotes}
                        placeholder="Ex: white blazer, marble stairs, no sunglasses, include watch close-up"
                        placeholderTextColor="rgba(255,255,255,0.40)"
                        multiline
                        maxLength={PACK_BRIEF_NOTES_MAX_LENGTH}
                        style={styles.packPlannerNotesInput}
                      />
                    </View>

                    <View style={styles.packPlannerDraftSummary}>
                      <Text style={styles.packPlannerDraftSummaryTitle}>Draft brief</Text>
                      <Text style={styles.packPlannerDraftSummaryText}>
                        Vibe: {selectedPackBriefVibe.label}
                        {"\n"}
                        Palette: {selectedPackPalette.label}
                        {"\n"}
                        Selected tags: {selectedPackRequiredLabels.length > 0 ? selectedPackRequiredLabels.join(", ") : "Not selected yet"}
                        {"\n"}
                        Must-have details: {packBriefNotes.trim() ? packBriefNotes.trim() : "No extra constraints"}
                      </Text>
                    </View>

                    {(packGridError || pipelineError) ? (
                      <View style={styles.packPlannerErrorCard}>
                        <Text style={styles.packPlannerErrorText}>{packGridError || pipelineError}</Text>
                      </View>
                    ) : null}

                    {pipelinePlan ? (
                      <View style={styles.packPlannerPreviewCard}>
                        {packGridPreviewBase64 ? (
                          <View style={styles.packPlannerCompositeCard}>
                            <Text style={styles.packPlannerLabel}>Visual grid preview</Text>
                            <Text style={styles.packPlannerSelectionHint}>
                              Position order is strict: row 1 left-to-right, then row 2, then row 3.
                            </Text>
                            <NativeImage
                              source={{ uri: `data:image/png;base64,${packGridPreviewBase64}` }}
                              style={styles.packPlannerPreviewImage}
                              resizeMode="cover"
                            />
                          </View>
                        ) : null}
                        <View style={styles.packPlannerSelectionHeader}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.packPlannerLabel}>Shot plan - {pipelinePlan.imageCount} images</Text>
                            <Text style={styles.packPlannerSelectionHint}>
                              Select the images you want to extract as separate files at medium quality.
                            </Text>
                          </View>
                          <View style={styles.packPlannerSelectionPill}>
                            <Text style={styles.packPlannerSelectionPillText}>
                              {selectedPipelineShotCount}/{pipelinePlan.shots.length}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.packPlannerSelectionActions}>
                          <Pressable
                            onPress={selectAllPipelineShots}
                            disabled={areAllPipelineShotsSelected}
                            style={({ pressed }) => [
                              styles.packPlannerSelectionAction,
                              areAllPipelineShotsSelected && styles.packPlannerSelectionActionDisabled,
                              pressed && !areAllPipelineShotsSelected ? { opacity: 0.86 } : undefined,
                            ]}
                          >
                            <Text style={styles.packPlannerSelectionActionText}>Select all</Text>
                          </Pressable>
                          <Pressable
                            onPress={clearPipelineShotSelection}
                            disabled={selectedPipelineShotCount === 0}
                            style={({ pressed }) => [
                              styles.packPlannerSelectionAction,
                              selectedPipelineShotCount === 0 && styles.packPlannerSelectionActionDisabled,
                              pressed && selectedPipelineShotCount > 0 ? { opacity: 0.86 } : undefined,
                            ]}
                          >
                            <Text style={styles.packPlannerSelectionActionText}>Exclude all</Text>
                          </Pressable>
                        </View>
                        <View style={styles.packPlannerShotGrid}>
                          {pipelinePlan.shots.map((shot) => {
                            const selected = selectedPipelineShotPositions.includes(shot.position);
                            const row = Math.ceil(shot.position / 3);
                            const col = ((shot.position - 1) % 3) + 1;
                            return (
                              <Pressable
                                key={shot.position}
                                onPress={() => togglePipelineShotSelection(shot.position)}
                                style={({ pressed }) => [
                                  styles.packPlannerShotRow,
                                  styles.packPlannerShotSelectableRow,
                                  selected ? styles.packPlannerShotSelectedRow : styles.packPlannerShotExcludedRow,
                                  pressed ? { opacity: 0.88 } : undefined,
                                ]}
                              >
                                <View style={[styles.packPlannerShotCheck, selected && styles.packPlannerShotCheckActive]}>
                                  <Ionicons name={selected ? "checkmark" : "close"} size={12} color={selected ? "#000" : "rgba(255,255,255,0.48)"} />
                                </View>
                                <Text style={[styles.packPlannerShotNum, selected && styles.packPlannerShotNumSelected]}>
                                  {shot.position}
                                </Text>
                                <Text style={[styles.packPlannerShotLabel, !selected && styles.packPlannerShotLabelExcluded]}>
                                  {`row ${row}, col ${col} - ${shot.label}`}
                                  {shot.hairstyle ? ` - ${shot.hairstyle}` : ""}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                        <View style={styles.packPlannerRenderSummary}>
                          <Text style={styles.packPlannerRenderSummaryText}>
                            {excludedPipelineShotCount > 0
                              ? `${excludedPipelineShotCount} excluded. ${selectedPipelineShotCount} will be extracted.`
                              : `All ${selectedPipelineShotCount} images will be extracted.`}
                          </Text>
                          <Text style={styles.packPlannerRenderSummaryText}>GPT Image - medium quality, exact row/column mapping</Text>
                        </View>
                        <Pressable
                          onPress={handleRenderGridPack}
                          disabled={packGridRenderLoading || selectedPipelineShotCount === 0}
                          style={({ pressed }) => [
                            styles.packPlannerRenderButton,
                            (packGridRenderLoading || selectedPipelineShotCount === 0 || pressed) && { opacity: 0.7 },
                          ]}
                        >
                          {packGridRenderLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Ionicons name="images-outline" size={14} color="#FFF" />
                          )}
                          <Text style={styles.packPlannerRenderButtonText}>
                            {packGridRenderLoading
                              ? "Extracting images\u2026"
                              : `Confirm extract ${selectedPipelineShotCount} image${selectedPipelineShotCount === 1 ? "" : "s"} - ${selectedPipelineShotCount} credit${selectedPipelineShotCount === 1 ? "" : "s"}`}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {pipelineRenderResults.length > 0 ? (
                      <View style={styles.packPlannerResultsGrid}>
                        <Text style={styles.packPlannerLabel}>
                          {pipelineRenderResults.length} image{pipelineRenderResults.length !== 1 ? "s" : ""} ready
                        </Text>
                        <View style={styles.packPlannerResultsWrap}>
                          {pipelineRenderResults.map((img) => (
                            <Pressable
                              key={img.position}
                              onPress={() => void handleDownloadPackImage(img.imageBase64, img.label, img.position)}
                              style={({ pressed }) => [
                                styles.packPlannerResultCard,
                                pressed ? { opacity: 0.88 } : undefined,
                              ]}
                            >
                              <NativeImage
                                source={{ uri: `data:image/png;base64,${img.imageBase64}` }}
                                style={styles.packPlannerResultThumb}
                                resizeMode="cover"
                              />
                              <View style={styles.packPlannerResultFooter}>
                                <Text numberOfLines={1} style={styles.packPlannerResultLabel}>
                                  {img.position}. {img.label}
                                </Text>
                                <Ionicons name="download-outline" size={13} color="#FFF" />
                              </View>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    ) : null}

                    {!pipelinePlan ? (
                      <Pressable
                        onPress={handleGenerateGridPreview}
                        disabled={packGridPreviewLoading}
                        style={({ pressed }) => [
                          styles.packPlannerPreviewButton,
                          (packGridPreviewLoading || pressed) && { opacity: 0.6 },
                        ]}
                      >
                        {packGridPreviewLoading ? (
                          <ActivityIndicator size="small" color="#000" />
                        ) : (
                          <Ionicons name="grid-outline" size={14} color="#000" />
                        )}
                        <Text style={styles.packPlannerPreviewButtonText}>
                          {packGridPreviewLoading
                            ? "Generating visual grid preview\u2026"
                            : "Generate visual grid preview \u2014 2 credits"}
                        </Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        onPress={() => {
                          setPipelinePlan(null);
                          setPipelineRenderResults([]);
                          setPipelineContinuityContext(null);
                          setPipelineError(null);
                          setPackGridError(null);
                          setPackGridPreviewBase64(null);
                        }}
                        style={styles.packPlannerResetButton}
                      >
                        <Ionicons name="refresh-outline" size={13} color="rgba(255,255,255,0.72)" />
                        <Text style={styles.packPlannerResetButtonText}>Start over</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            </View>
          </>
        ) : null}

        {styleSectionTab === "main" ? (
          <View style={styles.collageSection}>
            <View style={styles.collageSectionHeader}>
              <View style={styles.collageSectionTitleWrap}>
                <Text style={styles.collageSectionEyebrow}>
                  {activePhotoPack ? `${selectedPackImageCount}-image direction` : "Style wall"}
                </Text>
                <Text style={styles.collageSectionTitle}>
                  {activePhotoPack ? activePhotoPack.label : selectedStyleVibe.label}
                </Text>
              </View>
              <Text style={styles.collageSectionMeta}>{mainOnlyStylePresets.length} styles</Text>
            </View>
            <Animated.View style={collageRevealAnimatedStyle}>
              {mainOnlyStylePresets.length === 0 ? (
                <View style={styles.categoryEmptyState}>
                  <Ionicons name="heart-outline" size={36} color="rgba(255,255,255,0.25)" />
                  <Text style={styles.categoryEmptyText}>Coming soon</Text>
                  <Text style={styles.categoryEmptySubtext}>Stay tuned - new styles are on the way.</Text>
                </View>
              ) : (
                <View style={[styles.collageColumnsWrap, { gap: collageColumnGap }]}> 
                  {mainCollageColumns.map((column, columnIndex) => (
                    <Animated.View
                      key={`collage-column-${columnIndex}`}
                      style={[
                        styles.collageColumn,
                        getCollageColumnRevealStyle(columnIndex),
                        {
                          gap: collageColumnGap,
                          marginTop: collageColumnOffsets[columnIndex] || 0,
                        },
                      ]}
                    >
                      {column.map((item) => {
                        const collageImageUri = collageTileImageOverrides[item.id] || item.imageCandidates[0] || "";

                        return (
                          <Pressable
                            key={item.id}
                            onPress={item.onPress}
                            style={[
                              styles.collageTile,
                              item.active && styles.collageTileActive,
                              {
                                shadowColor: "#00E5CC",
                                shadowOpacity: item.active ? 0.72 : 0.36,
                                shadowRadius: item.active ? 18 : 9,
                                shadowOffset: { width: 0, height: 0 },
                                elevation: item.active ? 14 : 7,
                              },
                            ]}
                          >
                            <View
                              style={[
                                styles.collageTileInner,
                                {
                                  borderColor: item.active ? "#00E5CC" : item.theme.border,
                                  backgroundColor: item.theme.footerBottom,
                                },
                              ]}
                            >
                              <View style={[styles.collageTileMedia, { aspectRatio: item.aspectRatio, backgroundColor: item.theme.ambient }]}> 
                                {collageImageUri ? (
                                  <Image
                                    source={{ uri: collageImageUri }}
                                    style={styles.collageTileImageContained}
                                    contentFit="cover"
                                    onLoad={(event) => handleCollageTileLoad(item.id, event)}
                                    onError={() => handleCollageTileError(item.id, collageImageUri)}
                                  />
                                ) : (
                                  <View style={styles.collageTileFallback}>
                                    <Ionicons name="image-outline" size={22} color={item.theme.text} />
                              {item.id === OWN_UPLOAD_CARD_ID ? (
                                <View style={styles.ownUploadInlineActions}>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
                                      setIntensity(null);
                                      setPreviewStyleId(INSTAME_OWN_STYLE_ID);
                                      void openInlineGallery("uploaded");
                                    }}
                                    style={({ pressed }) => [styles.ownUploadInlineAction, pressed ? { opacity: 0.9 } : undefined]}
                                  >
                                    <Text style={styles.ownUploadInlineActionText}>Uploaded</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
                                      setIntensity(null);
                                      setPreviewStyleId(INSTAME_OWN_STYLE_ID);
                                      void openInlineGallery("enhanced");
                                    }}
                                    style={({ pressed }) => [styles.ownUploadInlineAction, pressed ? { opacity: 0.9 } : undefined]}
                                  >
                                    <Text style={styles.ownUploadInlineActionText}>Enhanced</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={(event) => {
                                      event.stopPropagation();
                                      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
                                      setIntensity(null);
                                      setPreviewStyleId(INSTAME_OWN_STYLE_ID);
                                      void handleEnhancePortrait();
                                    }}
                                    disabled={!photo || portraitEnhanceLoading}
                                    style={({ pressed }) => [
                                      styles.ownUploadInlineAction,
                                      (!photo || portraitEnhanceLoading) && styles.ownUploadInlineActionDisabled,
                                      pressed && photo && !portraitEnhanceLoading ? { opacity: 0.9 } : undefined,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.ownUploadInlineActionText,
                                        (!photo || portraitEnhanceLoading) && styles.ownUploadInlineActionTextDisabled,
                                      ]}
                                    >
                                      Enhance
                                    </Text>
                                  </Pressable>
                                </View>
                              ) : null}
                                  </View>
                                )}
                                <LinearGradient
                                  colors={["rgba(0,229,204,0.08)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.28)"]}
                                  locations={[0, 0.32, 1]}
                                  style={styles.collageTileOverlay}
                                />
                                <View
                                  style={[
                                    styles.collageTileGlow,
                                    item.active ? styles.collageTileGlowActive : styles.collageTileGlowIdle,
                                    {
                                      backgroundColor: "transparent",
                                      borderColor: item.active ? "#00E5CC" : "rgba(0,229,204,0.20)",
                                      shadowColor: "#00E5CC",
                                      shadowOpacity: item.active ? 0.80 : 0.40,
                                      shadowRadius: item.active ? 14 : 7,
                                      elevation: item.active ? 12 : 6,
                                    },
                                  ]}
                                />
                                <View pointerEvents="none" style={styles.collageTileCaption}>
                                  <Text numberOfLines={2} style={styles.collageTileCaptionText}>{item.label}</Text>
                                </View>
                              </View>
                            </View>
                          </Pressable>
                        );
                      })}
                    </Animated.View>
                  ))}
                </View>
              )}
            </Animated.View>
          </View>
        ) : styleSectionTab === "own" ? (
          <View style={styles.collageSection}>
            <Animated.View style={collageRevealAnimatedStyle}>
              <View style={[styles.collageColumnsWrap, { gap: collageColumnGap }]}> 
                {ownCollageColumns.map((column, columnIndex) => (
                  <Animated.View
                    key={`own-collage-column-${columnIndex}`}
                    style={[
                      styles.collageColumn,
                      getCollageColumnRevealStyle(columnIndex),
                      {
                        gap: collageColumnGap,
                        marginTop: collageColumnOffsets[columnIndex] || 0,
                      },
                    ]}
                  >
                    {column.map((item) => {
                      const collageImageUri = collageTileImageOverrides[item.id] || item.imageCandidates[0] || "";

                      return (
                        <Pressable
                          key={item.id}
                          onPress={item.onPress}
                          style={[
                            styles.collageTile,
                            item.active && styles.collageTileActive,
                            {
                              shadowColor: "#00E5CC",
                              shadowOpacity: item.active ? 0.72 : 0.36,
                              shadowRadius: item.active ? 18 : 9,
                              shadowOffset: { width: 0, height: 0 },
                              elevation: item.active ? 14 : 7,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.collageTileInner,
                              {
                                borderColor: item.active ? "#00E5CC" : item.theme.border,
                                backgroundColor: item.theme.footerBottom,
                              },
                            ]}
                          >
                            <View style={[styles.collageTileMedia, { aspectRatio: item.aspectRatio, backgroundColor: item.theme.ambient }]}> 
                              {item.id === OWN_UPLOAD_CARD_ID ? (
                                <View style={styles.ownUploadAnchorMedia}>
                                  <LinearGradient
                                    colors={["rgba(38,244,237,0.22)", "rgba(0,0,0,0.98)", "rgba(0,0,0,1)"]}
                                    locations={[0, 0.42, 1]}
                                    style={styles.ownUploadAnchorBackdrop}
                                  />
                                  <Text style={styles.ownUploadAnchorText}>CLONE{"\n"}ANY{"\n"}AESTHETIC</Text>
                                  <View style={styles.ownUploadAnchorPlus}>
                                    <Ionicons name="add" size={14} color="#26F4ED" />
                                  </View>
                                </View>
                              ) : (
                                <>
                                  {collageImageUri ? (
                                    <Image
                                      source={{ uri: collageImageUri }}
                                      style={styles.collageTileImageContained}
                                      contentFit="cover"
                                      onLoad={(event) => handleCollageTileLoad(item.id, event)}
                                      onError={() => handleCollageTileError(item.id, collageImageUri)}
                                    />
                                  ) : (
                                    <View style={styles.collageTileFallback}>
                                      <Ionicons name="image-outline" size={22} color={item.theme.text} />
                                    </View>
                                  )}
                                  <LinearGradient
                                    colors={["rgba(0,229,204,0.08)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.28)"]}
                                    locations={[0, 0.32, 1]}
                                    style={styles.collageTileOverlay}
                                  />
                                  <View
                                    style={[
                                      styles.collageTileGlow,
                                      item.active ? styles.collageTileGlowActive : styles.collageTileGlowIdle,
                                      {
                                        backgroundColor: "transparent",
                                        borderColor: item.active ? "#00E5CC" : "rgba(0,229,204,0.20)",
                                        shadowColor: "#00E5CC",
                                        shadowOpacity: item.active ? 0.80 : 0.40,
                                        shadowRadius: item.active ? 14 : 7,
                                        elevation: item.active ? 12 : 6,
                                      },
                                    ]}
                                  />
                                  <View pointerEvents="none" style={styles.collageTileCaption}>
                                    <Text numberOfLines={2} style={styles.collageTileCaptionText}>{item.label}</Text>
                                  </View>
                                </>
                              )}
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          </View>
        ) : null}

        {styleSectionTab !== "main" ? (
          <View style={styles.studioSection}>
            <View style={styles.studioPortraitStrip}>
              <Text style={styles.studioPortraitLabel}>Add your portrait</Text>
              <View style={styles.portraitButtonGrid}>
                <Pressable onPress={pickImage} style={styles.portraitSourceCard}>
                  <Ionicons name="cloud-upload-outline" size={16} color={Colors.accentPale} />
                  <Text numberOfLines={1} style={styles.portraitSourceCardText}>Upload</Text>
                </Pressable>
                <Pressable
                  onPress={() => void openInlineGallery("uploaded")}
                  style={[styles.portraitSourceCard, inlineGalleryType === "uploaded" && styles.portraitSourceCardActive]}
                >
                  <Ionicons name="images-outline" size={16} color={inlineGalleryType === "uploaded" ? Colors.accentLight : Colors.accentPale} />
                  <Text numberOfLines={1} style={[styles.portraitSourceCardText, inlineGalleryType === "uploaded" && styles.portraitSourceCardTextActive]}>Uploaded</Text>
                </Pressable>
                <Pressable
                  onPress={() => void openInlineGallery("enhanced")}
                  style={[styles.portraitSourceCard, inlineGalleryType === "enhanced" && styles.portraitSourceCardActive]}
                >
                  <Ionicons name="sparkles-outline" size={16} color={inlineGalleryType === "enhanced" ? Colors.accentLight : Colors.accentPale} />
                  <Text numberOfLines={1} style={[styles.portraitSourceCardText, inlineGalleryType === "enhanced" && styles.portraitSourceCardTextActive]}>Enhanced</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={handleEnhancePortrait}
                disabled={!photo || portraitEnhanceLoading}
                style={[
                  styles.portraitEnhanceCard,
                  (!photo || portraitEnhanceLoading) && styles.secondaryActionButtonDisabled,
                ]}
              >
                {portraitEnhanceLoading ? (
                  <ActivityIndicator color="#7EF3FF" size="small" />
                ) : (
                  <>
                    <View style={styles.portraitEnhanceCardIconWrap}>
                      <LinearGradient
                        colors={["rgba(126,243,255,0.22)", "rgba(66,214,235,0.08)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.portraitEnhanceCardIconFill}
                      >
                        <Ionicons name="sparkles" size={18} color="#7EF3FF" />
                      </LinearGradient>
                    </View>
                    <View style={styles.portraitEnhanceCardCopy}>
                      <Text style={styles.portraitEnhanceCardTitle}>Enhance portrait</Text>
                      <Text style={styles.portraitEnhanceCardSubtitle}>Create a cleaner portrait base before styling</Text>
                    </View>
                    <View style={styles.portraitEnhanceCardBadge}>
                      <Text style={styles.portraitEnhanceCardBadgeText}>Glow</Text>
                    </View>
                  </>
                )}
              </Pressable>
              {inlineGalleryType ? (
                <View style={styles.inlineGalleryPanel}>
                  <View style={styles.inlineGalleryHeader}>
                    <Text style={styles.inlineGalleryTitle}>
                      {inlineGalleryType === "uploaded" ? "Uploaded Portraits" : "Enhanced Portraits"}
                    </Text>
                    <Pressable onPress={() => setInlineGalleryType(null)} style={styles.inlineGalleryCloseBtn}>
                      <Ionicons name="close" size={18} color="#FFF" />
                    </Pressable>
                  </View>
                  {inlineGalleryLoading ? (
                    <ActivityIndicator color={Colors.accent} style={{ alignSelf: "center", marginVertical: 16 }} />
                  ) : inlineGalleryImages.length === 0 ? (
                    <Text style={styles.inlineGalleryEmpty}>No {inlineGalleryType} portraits yet.</Text>
                  ) : (
                    <View style={styles.inlineGalleryGrid}>
                      {inlineGalleryImages.map((img) => (
                        <Pressable
                          key={img.id}
                          onPress={() => void selectInlineGalleryImage(img.id)}
                          style={[
                            styles.inlineGalleryThumb,
                            photo?.sourceImageId === img.id && styles.inlineGalleryThumbActive,
                          ]}
                        >
                          {renderInlineGalleryPreview(img)}
                          <LinearGradient
                            colors={["transparent", "rgba(0,0,0,0.72)"]}
                            style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end", padding: 6 }]}
                          >
                            <Text style={styles.inlineGalleryThumbName} numberOfLines={2}>{img.name}</Text>
                          </LinearGradient>
                          {photo?.sourceImageId === img.id ? (
                            <View style={styles.inlineGalleryThumbCheck}>
                              <Ionicons name="checkmark" size={12} color="#FFF" />
                            </View>
                          ) : null}
                        </Pressable>
                      ))}
                    </View>
                  )}
                </View>
              ) : null}
              {usingEnhancedPortrait ? <Text style={styles.enhanceSelectedText}>Enhanced portrait active.</Text> : null}
            </View>
            {portraitEnhanceCandidate ? (
              <View style={styles.enhancePreviewCard}>
                <Text style={styles.enhancePreviewTitle}>Enhanced preview</Text>
                <Image source={{ uri: portraitEnhanceCandidate.uri }} style={styles.enhancePreviewImage} contentFit="cover" />
                <View style={styles.enhanceDecisionRow}>
                  <Pressable
                    onPress={handleEnhancePortrait}
                    disabled={portraitEnhanceLoading}
                    style={({ pressed }) => [
                      styles.enhanceDecisionButton,
                      styles.enhanceRetryButton,
                      pressed && !portraitEnhanceLoading ? { opacity: 0.88 } : undefined,
                    ]}
                  >
                    <Text style={styles.enhanceRetryButtonText}>Try again</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void handleDownloadEnhancedPortrait()}
                    style={({ pressed }) => [
                      styles.enhanceDecisionButton,
                      styles.enhanceDownloadButton,
                      pressed ? { opacity: 0.9 } : undefined,
                    ]}
                  >
                    <Text style={styles.enhanceDownloadButtonText}>Download</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleKeepEnhancedPortrait}
                    style={({ pressed }) => [
                      styles.enhanceDecisionButton,
                      styles.enhanceKeepButton,
                      pressed ? { opacity: 0.9 } : undefined,
                    ]}
                  >
                    <Text style={styles.enhanceKeepButtonText}>Keep this one</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {styleSectionTab === "own" ? (
              <>
                <Pressable onPress={pickOwnStyleImage} style={styles.studioHero}>
                  <Image source={{ uri: ownStyleHeroUri }} style={styles.studioHeroImage} contentFit="cover" />
                  <LinearGradient
                    colors={["rgba(134,244,255,0.10)", "rgba(0,0,0,0.28)", "rgba(0,0,0,0.90)"]}
                    locations={[0, 0.28, 1]}
                    style={styles.studioHeroOverlay}
                  />
                  <View style={styles.studioHeroBadge}>
                    <Text style={styles.studioHeroBadgeText}>Clone Any Aesthetic</Text>
                  </View>
                </Pressable>

                <View style={styles.studioPanel}>
                  <Text style={styles.ownStylePositioningText}>Upload any aesthetic reference. Reuse it forever.</Text>
                  <Text style={styles.processingHintText}>
                    First use: {transformCost} cr. Saved styles: {activeGenerationTier?.credits ?? DEFAULT_TRANSFORM_COST} cr.
                  </Text>

                  {selectedSavedOwnStyle ? (
                    <View style={styles.ownStyleSavedMeta}>
                      <Text style={styles.ownStyleSavedMetaTitle}>Using: {selectedSavedOwnStyle.name}</Text>
                      <View style={styles.renameOwnStyleRow}>
                        <TextInput
                          value={ownStyleNameDraft}
                          onChangeText={setOwnStyleNameDraft}
                          placeholder="Rename this style"
                          placeholderTextColor="#7EA1A7"
                          style={styles.renameOwnStyleInput}
                        />
                        <Pressable
                          onPress={() => void handleRenameSavedOwnStyle()}
                          disabled={renamingOwnStyle || ownStyleNameDraft.trim() === selectedSavedOwnStyle.name}
                          style={({ pressed }) => [
                            styles.renameOwnStyleButton,
                            (renamingOwnStyle || ownStyleNameDraft.trim() === selectedSavedOwnStyle.name) && styles.secondaryActionButtonDisabled,
                            pressed && !(renamingOwnStyle || ownStyleNameDraft.trim() === selectedSavedOwnStyle.name) ? { opacity: 0.88 } : undefined,
                          ]}
                        >
                          <Text style={styles.renameOwnStyleButtonText}>{renamingOwnStyle ? "Saving..." : "Rename"}</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}

                  <View style={styles.uploadActionRow}>
                    <Pressable onPress={pickOwnStyleImage} style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }] }>
                      <Ionicons name="cloud-upload-outline" size={16} color={Colors.accentPale} />
                      <Text style={styles.secondaryActionButtonText}>{ownStylePhoto || selectedSavedOwnStyle ? "Change image" : "Upload"}</Text>
                    </Pressable>
                    {hasOwnStyleInput ? (
                      <Pressable
                        onPress={() => void handleUseCurrentOwnStyle()}
                        disabled={!ownStyleNeedsActivation}
                        style={({ pressed }) => [
                          styles.secondaryActionButton,
                          styles.secondaryActionButtonAccent,
                          !ownStyleNeedsActivation && styles.secondaryActionButtonDisabled,
                          pressed && ownStyleNeedsActivation ? { opacity: 0.9 } : undefined,
                        ]}
                      >
                        <Ionicons name="checkmark-circle-outline" size={16} color={Colors.accentLight} />
                        <Text style={[styles.secondaryActionButtonText, styles.secondaryActionButtonTextAccent]}>
                          {ownStyleNeedsActivation ? "Use this style" : "Using this style"}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  {ownStylePhoto ? (
                    <Pressable onPress={() => setOwnStylePhoto(null)} style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }]}>
                      <Ionicons name="trash-outline" size={16} color={Colors.accentPale} />
                      <Text style={styles.secondaryActionButtonText}>Remove uploaded reference</Text>
                    </Pressable>
                  ) : selectedSavedOwnStyle ? (
                    <Pressable onPress={() => handleDeleteSavedOwnStyle(selectedSavedOwnStyle)} style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }]}>
                      <Ionicons name="trash-outline" size={16} color={Colors.accentPale} />
                      <Text style={styles.secondaryActionButtonText}>Delete saved style</Text>
                    </Pressable>
                  ) : null}

                  <View style={styles.customChangesPanel}>
                    <View style={styles.customChangesHeader}>
                      <Text style={styles.customChangesTitle}>Aesthetic Direction</Text>
                      <Text style={styles.customChangesSubtitle}>Add pose, mood, lighting, location or color notes for this aesthetic.</Text>
                    </View>
                    <View style={styles.subTabBar}>
                      {OWN_STYLE_MODE_OPTIONS.map((option) => {
                        const active = ownStyleMode === option.value;
                        return (
                          <Pressable
                            key={option.value}
                            onPress={() => setOwnStyleMode(option.value)}
                            style={[styles.subTab, active && styles.subTabActive]}
                          >
                            <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{option.label}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                    <TextInput
                      value={customPrompt}
                      onChangeText={setCustomPrompt}
                      placeholder="Example: same cinematic mood, softer smile, warm dusk light, cleaner background."
                      placeholderTextColor="rgba(255,255,255,0.34)"
                      multiline
                      style={styles.customChangesInput}
                    />
                    <Text style={styles.customChangesFootnote}>Your notes guide the final result on top of the selected own style.</Text>
                  </View>

                  <View style={styles.modalQualityRow}>
                    {generationTiers.map((tier) => {
                      const selected = tier.id === (activeGenerationTier?.id || selectedGenerationTierId);
                      const tierCost = tier.credits + (isFirstOwnStyleGeneration ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0);
                      return (
                        <Pressable
                          key={tier.id}
                          onPress={() => setSelectedGenerationTierId(tier.id)}
                          style={[styles.modalQualityButton, selected && styles.modalQualityButtonActive]}
                        >
                          <Text style={[styles.modalQualityButtonLabel, selected && styles.modalQualityButtonLabelActive]}>{tier.label}</Text>
                          <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tier.output}</Text>
                          <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tierCost} credits</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={handleTransform}
                    disabled={!canGenerate}
                    style={({ pressed }) => [
                      styles.generateButton,
                      !canGenerate && styles.generateButtonDisabled,
                      pressed && canGenerate ? { opacity: 0.9 } : undefined,
                    ]}
                  >
                    <View style={styles.generateButtonInner}>
                      {loading ? <ActivityIndicator color="#FF7FB1" /> : <Text style={styles.generateButtonText}>Generate with this aesthetic</Text>}
                    </View>
                  </Pressable>
                  <Text style={styles.generateCostLabel}>{transformCost} credits</Text>
                  {!canGenerate && generateBlockedReason ? <Text style={styles.generateBlockedHintText}>{generateBlockedReason}</Text> : null}
                  {loading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
                </View>
              </>
            ) : (
              <>
                <View style={styles.studioHero}>
                  <Image source={activeArtPreviewSource} style={styles.studioHeroImage} contentFit="cover" />
                  <LinearGradient
                    colors={["rgba(255,240,180,0.10)", "rgba(0,0,0,0.24)", "rgba(0,0,0,0.90)"]}
                    locations={[0, 0.28, 1]}
                    style={styles.studioHeroOverlay}
                  />
                  <View style={styles.studioHeroBadge}>
                    <Text style={styles.studioHeroBadgeText}>Art Finish</Text>
                  </View>
                </View>

                <View style={styles.studioPanel}>
                  <Animated.View style={collageRevealAnimatedStyle}>
                    <View style={[styles.collageColumnsWrap, { gap: collageColumnGap }]}> 
                      {artCollageColumns.map((column, columnIndex) => (
                        <Animated.View
                          key={`art-collage-column-${columnIndex}`}
                          style={[
                            styles.collageColumn,
                            getCollageColumnRevealStyle(columnIndex),
                            {
                              gap: collageColumnGap,
                              marginTop: collageColumnOffsets[columnIndex] || 0,
                            },
                          ]}
                        >
                          {column.map((item) => {
                            const collageImageUri = collageTileImageOverrides[item.id] || item.imageCandidates[0] || "";

                            return (
                              <Pressable
                                key={item.id}
                                onPress={item.onPress}
                                style={[
                                  styles.collageTile,
                                  item.active && styles.collageTileActive,
                                  {
                                    shadowColor: "#00E5CC",
                                    shadowOpacity: item.active ? 0.72 : 0.36,
                                    shadowRadius: item.active ? 18 : 9,
                                    shadowOffset: { width: 0, height: 0 },
                                    elevation: item.active ? 14 : 7,
                                  },
                                ]}
                              >
                                <View
                                  style={[
                                    styles.collageTileInner,
                                    {
                                      borderColor: item.active ? "#00E5CC" : item.theme.border,
                                      backgroundColor: item.theme.footerBottom,
                                    },
                                  ]}
                                >
                                  <View style={[styles.collageTileMedia, { aspectRatio: item.aspectRatio, backgroundColor: item.theme.ambient }]}> 
                                    {item.id === ART_STYLE_NONE_ID ? (
                                      <View style={styles.artNoneCollageMedia}>
                                        <LinearGradient
                                          colors={[
                                            getArtStyleCardTheme(ART_STYLE_NONE_ID).glowSoft,
                                            "rgba(0,0,0,0.08)",
                                            "rgba(0,0,0,0.94)",
                                          ]}
                                          locations={[0, 0.28, 1]}
                                          style={StyleSheet.absoluteFillObject}
                                        />
                                        <Ionicons name="color-wand-outline" size={24} color="#FFECC8" />
                                        <Text style={styles.artNoneCollageText}>NO ART</Text>
                                      </View>
                                    ) : item.previewSource ? (
                                      <Image
                                        source={item.previewSource}
                                        style={styles.collageTileImageContained}
                                        contentFit="cover"
                                        onLoad={(event) => handleCollageTileLoad(item.id, event)}
                                      />
                                    ) : collageImageUri ? (
                                      <Image
                                        source={{ uri: collageImageUri }}
                                        style={styles.collageTileImageContained}
                                        contentFit="cover"
                                        onLoad={(event) => handleCollageTileLoad(item.id, event)}
                                        onError={() => handleCollageTileError(item.id, collageImageUri)}
                                      />
                                    ) : (
                                      <View style={styles.collageTileFallback}>
                                        <Ionicons name="image-outline" size={22} color={item.theme.text} />
                                      </View>
                                    )}
                                    <LinearGradient
                                      colors={["rgba(0,229,204,0.08)", "rgba(255,255,255,0.01)", "rgba(0,0,0,0.28)"]}
                                      locations={[0, 0.32, 1]}
                                      style={styles.collageTileOverlay}
                                    />
                                    <View
                                      style={[
                                        styles.collageTileGlow,
                                        item.active ? styles.collageTileGlowActive : styles.collageTileGlowIdle,
                                        {
                                          backgroundColor: "transparent",
                                          borderColor: item.active ? "#00E5CC" : "rgba(0,229,204,0.20)",
                                          shadowColor: "#00E5CC",
                                          shadowOpacity: item.active ? 0.80 : 0.40,
                                          shadowRadius: item.active ? 14 : 7,
                                          elevation: item.active ? 12 : 6,
                                        },
                                      ]}
                                    />
                                    <View pointerEvents="none" style={styles.collageTileCaption}>
                                      <Text numberOfLines={2} style={styles.collageTileCaptionText}>{item.label}</Text>
                                    </View>
                                  </View>
                                </View>
                              </Pressable>
                            );
                          })}
                        </Animated.View>
                      ))}
                    </View>
                  </Animated.View>

                  <View style={styles.customChangesPanel}>
                    <View style={styles.customChangesHeader}>
                      <Text style={styles.customChangesTitle}>Art Direction</Text>
                      <Text style={styles.customChangesSubtitle}>Add optional notes if you want this art finish to lean in a specific direction.</Text>
                    </View>
                    <TextInput
                      value={customPrompt}
                      onChangeText={setCustomPrompt}
                      placeholder="Example: more pastel color, softer expression, warm background, cleaner light."
                      placeholderTextColor="rgba(255,255,255,0.34)"
                      multiline
                      style={styles.customChangesInput}
                    />
                    <Text style={styles.customChangesFootnote}>Leave it empty if you want only the default preset + art style behavior.</Text>
                  </View>

                  <View style={styles.modalQualityRow}>
                    {generationTiers.map((tier) => {
                      const selected = tier.id === (activeGenerationTier?.id || selectedGenerationTierId);
                      return (
                        <Pressable
                          key={tier.id}
                          onPress={() => setSelectedGenerationTierId(tier.id)}
                          style={[styles.modalQualityButton, selected && styles.modalQualityButtonActive]}
                        >
                          <Text style={[styles.modalQualityButtonLabel, selected && styles.modalQualityButtonLabelActive]}>{tier.label}</Text>
                          <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tier.output}</Text>
                          <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tier.credits} credits</Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Pressable
                    onPress={handleTransform}
                    disabled={!canGenerate}
                    style={({ pressed }) => [
                      styles.generateButton,
                      !canGenerate && styles.generateButtonDisabled,
                      pressed && canGenerate ? { opacity: 0.9 } : undefined,
                    ]}
                  >
                    <View style={styles.generateButtonInner}>
                      {loading ? <ActivityIndicator color="#FF7FB1" /> : <Text style={styles.generateButtonText}>Create art result</Text>}
                    </View>
                  </Pressable>
                  <Text style={styles.generateCostLabel}>{transformCost} credits</Text>
                  {!canGenerate && generateBlockedReason ? <Text style={styles.generateBlockedHintText}>{generateBlockedReason}</Text> : null}
                  {loading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
                </View>
              </>
            )}
          </View>
        ) : null}

        {resultBase64 && styleSectionTab !== "main" ? (
          <View ref={resultCardRef} style={styles.card}>
            <Text style={styles.cardTitle}>Your result</Text>
            <Image
              source={{ uri: buildDataUri(resultBase64, resultImageMimeType) }}
              style={styles.resultImage}
              contentFit="cover"
            />
            <View style={styles.resultMetaCard}>
              <Text style={styles.resultMetaTitle}>Generation details</Text>
              <Text style={styles.resultMetaText}>
                Style: {selectedStylePreset?.label || "Chicoo"}
                {selectedArtStyle ? ` + ${selectedArtStyle.label}` : ""} - Quality: {resultMeta?.qualityLabel || activeGenerationQualityLabel}
              </Text>
              <Text style={styles.resultMetaText}>
                Mode: {resultMeta?.stylePresetId === INSTAME_OWN_STYLE_ID ? "Own Style" : resultMeta?.promptOnlyMode ? "Prompt preset" : "Reference guided"}
              </Text>
            </View>
            <View style={styles.postGenerationSection}>
              <Text style={styles.pricingSectionTitle}>Edit after generation</Text>
              <View style={[styles.pricingCard, styles.pricingCardActive]}>
                <View style={styles.pricingTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pricingLabel}>{selectedEditTier?.label || "Edit"}</Text>
                    <Text style={styles.pricingSubtitle}>
                      {selectedEditTier?.subtitle || "Refine your generated result"}
                    </Text>
                  </View>
                  <View style={[styles.pricingBadge, styles.pricingBadgeLive]}>
                    <Text style={styles.pricingBadgeText}>{selectedEditTier?.badge || "Live"}</Text>
                  </View>
                </View>

                <View style={styles.pricingMetaRow}>
                  <Text style={styles.pricingCredits}>{selectedEditTier?.credits ?? 0} credits</Text>
                  <Text style={styles.pricingMetaText}>{selectedEditTier?.output || "1024 x 1024"}</Text>
                </View>
              </View>
            </View>
            <View style={styles.resultActionRow}>
              <Pressable style={[styles.resultActionButton, styles.resultActionButtonPrimary]} onPress={handleDownload}>
                <Ionicons name="download-outline" size={18} color={Colors.accent} />
                <Text numberOfLines={1} style={styles.downloadText}>Download</Text>
              </Pressable>
              <Pressable
                style={[styles.resultActionButton, styles.resultActionButtonSecondary]}
                onPress={() => setShowEditComposer((prev) => !prev)}
              >
                <Ionicons name="create-outline" size={18} color={Colors.accentSoft} />
                <Text numberOfLines={1} style={styles.editButtonText}>Edit</Text>
              </Pressable>
            </View>
            {showEditComposer ? (
              <View style={styles.editComposer}>
                <Text style={styles.editComposerTitle}>Refine this result</Text>
                <Text style={styles.editComposerSubtitle}>
                  This edit costs {selectedEditTier?.credits ?? 0} credits
                </Text>
                <TextInput
                  value={editInstruction}
                  onChangeText={setEditInstruction}
                  placeholder="Example: soften makeup, keep outfit, make the background more cinematic..."
                  placeholderTextColor="#7A7A7A"
                  multiline
                  style={styles.promptInput}
                />
                <Pressable
                  onPress={handleEditResult}
                  disabled={editLoading}
                  style={({ pressed }) => [
                    styles.generateButton,
                    editLoading && styles.generateButtonDisabled,
                    pressed && !editLoading ? { opacity: 0.9 } : undefined,
                  ]}
                >
                  {editLoading ? (
                    <LinearGradient
                      colors={["#FF7FB1", "#FF6698", "#FF4F7D"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.generateButtonInner}
                    >
                      <ActivityIndicator color="#FFF" />
                    </LinearGradient>
                  ) : (
                    <LinearGradient
                      colors={["#FF7FB1", "#FF6698", "#FF4F7D"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.generateButtonInner}
                    >
                      <Ionicons name="create-outline" size={18} color="#FFF" />
                      <Text style={styles.generateButtonText}>Apply Edit</Text>
                      <Text style={styles.costText}>{selectedEditTier?.credits ?? 0} credits</Text>
                    </LinearGradient>
                  )}
                </Pressable>
                {editLoading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
              </View>
            ) : null}
            <Text style={styles.resultFootnote}>
              Download is free. Edit creates a fresh variation from this result.
            </Text>
          </View>
        ) : null}

        {generationHistory.length > 0 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Results</Text>
            <Text style={styles.ownStylesLibraryText}>Reload a setup, reopen a result, or jump straight back into edit.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownStylesRow}>
              {generationHistory.map((entry) => (
                <View key={entry.id} style={styles.historyCard}>
                  <Image source={{ uri: entry.previewUri }} style={styles.historyCardImage} contentFit="cover" />
                  <View style={styles.historyCardBody}>
                    <Text style={styles.historyCardTitle}>{entry.styleLabel}</Text>
                    <Text style={styles.historyCardMeta}>{entry.creditsCharged} credits - {entry.source.replace(/_/g, " ")}</Text>
                    <Text numberOfLines={2} style={styles.historyCardPrompt}>{entry.customPrompt || "No extra prompt"}</Text>
                  </View>
                  <View style={styles.historyActionRow}>
                    <Pressable onPress={() => void restoreHistoryEntry(entry)} style={styles.historyActionButton}>
                      <Text style={styles.historyActionText}>Use setup</Text>
                    </Pressable>
                    <Pressable onPress={() => void restoreHistoryEntry(entry, true)} style={styles.historyActionButton}>
                      <Text style={styles.historyActionText}>Edit again</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null}

      </ScrollView>

      {/* ── Aesthetic image lightbox ── */}
      {(() => {
        const previewPack = packImagePreviewId ? PHOTO_PACK_PRESETS.find((p) => p.id === packImagePreviewId) : null;
        const images = previewPack?.previewImages ?? [];
        return (
          <Modal
            animationType="fade"
            transparent
            visible={Boolean(previewPack)}
            onRequestClose={() => setPackImagePreviewId(null)}
            statusBarTranslucent
          >
            <View style={styles.packLightboxBackdrop}>
              {/* Header */}
              <View style={styles.packLightboxHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.packLightboxTitle}>{previewPack?.label}</Text>
                  <Text style={styles.packLightboxSubtitle}>{previewPack?.count} images · tap to select</Text>
                </View>
                <Pressable onPress={() => setPackImagePreviewId(null)} style={styles.packLightboxClose}>
                  <Ionicons name="close" size={22} color="#FFF" />
                </Pressable>
              </View>

              {/* Image pager */}
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / viewportWidth);
                  setPackImagePreviewIndex(idx);
                }}
                style={{ flex: 1 }}
              >
                {images.map((src, i) => (
                  <View key={i} style={[styles.packLightboxPage, { width: viewportWidth }]}>
                    <Image source={src} style={styles.packLightboxImage} contentFit="contain" />
                  </View>
                ))}
              </ScrollView>

              {/* Dots */}
              {images.length > 1 ? (
                <View style={styles.packLightboxDots}>
                  {images.map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.packLightboxDot,
                        i === packImagePreviewIndex && styles.packLightboxDotActive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}

              {/* Footer: select button */}
              <View style={styles.packLightboxFooter}>
                <Pressable
                  onPress={() => {
                    if (previewPack) handlePhotoPackPress(previewPack.id);
                    setPackImagePreviewId(null);
                  }}
                  style={({ pressed }) => [styles.packLightboxSelectButton, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="checkmark-circle-outline" size={16} color="#0a0a0f" />
                  <Text style={styles.packLightboxSelectText}>Select {previewPack?.label}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        );
      })()}

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(previewStyleId)}
        onRequestClose={closePreviewPanel}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalCloseButton} onPress={closePreviewPanel}>
              <Ionicons name="close" size={20} color="#FFF" />
            </Pressable>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.modalHero}>
                {previewStyleId === INSTAME_OWN_STYLE_ID && !selectedOwnStyleId && !ownStylePhoto ? (
                  <Pressable
                    onPress={() => {
                      void pickOwnStyleImage();
                    }}
                    style={({ pressed }) => [
                      styles.modalOwnStyleUploadCard,
                      pressed ? { opacity: 0.92 } : undefined,
                    ]}
                  >
                    <LinearGradient
                      colors={["rgba(38,244,237,0.22)", "rgba(0,0,0,0.98)", "rgba(0,0,0,1)"]}
                      locations={[0, 0.4, 1]}
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.modalOwnStyleUploadPlus}>
                      <Ionicons name="add" size={36} color="#26F4ED" />
                    </View>
                    <Text style={styles.modalOwnStyleUploadText}>UPLOAD ANY AESTHETIC</Text>
                  </Pressable>
                ) : previewPanelImageUri ? (
                  <>
                    <Image source={{ uri: previewPanelImageUri }} style={styles.modalHeroImage} contentFit="cover" />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.04)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.86)"]}
                      locations={[0, 0.36, 1]}
                      style={styles.modalHeroOverlay}
                    />
                  </>
                ) : (
                  <View style={styles.modalHeroFallback}>
                    <Ionicons name="image-outline" size={24} color="rgba(255,255,255,0.42)" />
                  </View>
                )}
                {isEnhancePreviewActive ? (
                  <View style={styles.modalHeroTextWrap}>
                    <Text style={styles.modalHeroEyebrow}>Base portrait</Text>
                    <Text style={styles.modalTitle}>{previewPanelTitle}</Text>
                    <Text style={styles.modalSubtitle}>{previewPanelSubtitle}</Text>
                  </View>
                ) : null}
                {!isEnhancePreviewActive && currentFavoriteStyleKey ? (
                  <Pressable onPress={() => void toggleCurrentStyleFavorite()} style={styles.modalFavoriteButton}>
                    <Ionicons name={isCurrentStyleFavorite ? "heart" : "heart-outline"} size={16} color={isCurrentStyleFavorite ? Colors.accentPink : Colors.accentSoft} />
                    <Text style={styles.modalFavoriteButtonText}>{isCurrentStyleFavorite ? "Favorited" : "Favorite"}</Text>
                  </Pressable>
                ) : null}
              </View>

              {!isEnhancePreviewActive ? (
                <View style={styles.modalSection}>
                  <Pressable
                    onPress={() => setIsRetouchDrawerOpen((prev) => !prev)}
                    style={({ pressed }) => [
                      styles.modalRetouchToggle,
                      pressed ? { opacity: 0.9 } : undefined,
                    ]}
                  >
                    <View style={styles.modalRetouchToggleCopy}>
                      <Text style={styles.modalRetouchToggleTitle}>Retouch</Text>
                      <Text style={styles.modalRetouchToggleSubtitle}>
                        Open notes layered over the selected style.
                      </Text>
                    </View>
                    <View style={styles.modalRetouchToggleIconWrap}>
                      <Ionicons
                        name={isRetouchDrawerOpen ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={Colors.accentPale}
                      />
                    </View>
                  </Pressable>

                  {isRetouchDrawerOpen ? (
                    <View style={styles.modalRetouchDrawer}>
                      {isOwnStyleSelected ? (
                        <View style={[styles.subTabBar, { marginBottom: 10 }]}>
                          {OWN_STYLE_MODE_OPTIONS.map((option) => {
                            const active = ownStyleMode === option.value;
                            return (
                              <Pressable
                                key={option.value}
                                onPress={() => setOwnStyleMode(option.value)}
                                style={[styles.subTab, active && styles.subTabActive]}
                              >
                                <Text style={[styles.subTabText, active && styles.subTabTextActive]}>{option.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      ) : null}
                      <TextInput
                        value={customPrompt}
                        onChangeText={setCustomPrompt}
                        placeholder="Example: cleaner makeup, softer smile, warmer neutrals, brighter skin, calmer background."
                        placeholderTextColor="rgba(255,255,255,0.34)"
                        multiline
                        style={styles.modalPromptInput}
                      />
                      <Text style={styles.editorInlineHint}>These notes are layered over the selected style.</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Add your portrait</Text>
                <View style={styles.portraitButtonGrid}>
                  <Pressable onPress={pickImage} style={styles.portraitSourceCard}>
                    <Ionicons name="cloud-upload-outline" size={16} color={Colors.accentPale} />
                    <Text numberOfLines={1} style={styles.portraitSourceCardText}>Upload</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void openInlineGallery("uploaded")}
                    style={[styles.portraitSourceCard, inlineGalleryType === "uploaded" && styles.portraitSourceCardActive]}
                  >
                    <Ionicons name="images-outline" size={16} color={inlineGalleryType === "uploaded" ? Colors.accentLight : Colors.accentPale} />
                    <Text numberOfLines={1} style={[styles.portraitSourceCardText, inlineGalleryType === "uploaded" && styles.portraitSourceCardTextActive]}>Uploaded</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => void openInlineGallery("enhanced")}
                    style={[styles.portraitSourceCard, inlineGalleryType === "enhanced" && styles.portraitSourceCardActive]}
                  >
                    <Ionicons name="sparkles-outline" size={16} color={inlineGalleryType === "enhanced" ? Colors.accentLight : Colors.accentPale} />
                    <Text numberOfLines={1} style={[styles.portraitSourceCardText, inlineGalleryType === "enhanced" && styles.portraitSourceCardTextActive]}>Enhanced</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleEnhancePortrait}
                  disabled={!photo || portraitEnhanceLoading}
                  style={[
                    styles.portraitEnhanceCard,
                    (!photo || portraitEnhanceLoading) && styles.secondaryActionButtonDisabled,
                  ]}
                >
                  {portraitEnhanceLoading ? (
                    <ActivityIndicator color="#7EF3FF" size="small" />
                  ) : (
                    <>
                      <View style={styles.portraitEnhanceCardIconWrap}>
                        <LinearGradient
                          colors={["rgba(126,243,255,0.22)", "rgba(66,214,235,0.08)"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.portraitEnhanceCardIconFill}
                        >
                          <Ionicons name="sparkles" size={18} color="#7EF3FF" />
                        </LinearGradient>
                      </View>
                      <View style={styles.portraitEnhanceCardCopy}>
                        <Text style={styles.portraitEnhanceCardTitle}>Enhance portrait</Text>
                        <Text style={styles.portraitEnhanceCardSubtitle}>Use a polished base before your Own Style render</Text>
                      </View>
                      <View style={styles.portraitEnhanceCardBadge}>
                        <Text style={styles.portraitEnhanceCardBadgeText}>Boost</Text>
                      </View>
                    </>
                  )}
                </Pressable>
                {inlineGalleryType ? (
                  <View style={styles.inlineGalleryPanel}>
                    <View style={styles.inlineGalleryHeader}>
                      <Text style={styles.inlineGalleryTitle}>
                        {inlineGalleryType === "uploaded" ? "Uploaded Portraits" : "Enhanced Portraits"}
                      </Text>
                      <Pressable onPress={() => setInlineGalleryType(null)} style={styles.inlineGalleryCloseBtn}>
                        <Ionicons name="close" size={18} color="#FFF" />
                      </Pressable>
                    </View>
                    {inlineGalleryLoading ? (
                      <ActivityIndicator color={Colors.accent} style={{ alignSelf: "center", marginVertical: 16 }} />
                    ) : inlineGalleryImages.length === 0 ? (
                      <Text style={styles.inlineGalleryEmpty}>No {inlineGalleryType} portraits yet.</Text>
                    ) : (
                      <View style={styles.inlineGalleryGrid}>
                        {inlineGalleryImages.map((img) => (
                          <Pressable
                            key={img.id}
                            onPress={() => void selectInlineGalleryImage(img.id)}
                            style={[
                              styles.inlineGalleryThumb,
                              photo?.sourceImageId === img.id && styles.inlineGalleryThumbActive,
                            ]}
                          >
                            {renderInlineGalleryPreview(img)}
                            <LinearGradient
                              colors={["transparent", "rgba(0,0,0,0.72)"]}
                              style={[StyleSheet.absoluteFillObject, { justifyContent: "flex-end", padding: 6 }]}
                            >
                              <Text style={styles.inlineGalleryThumbName} numberOfLines={2}>{img.name}</Text>
                            </LinearGradient>
                            {photo?.sourceImageId === img.id ? (
                              <View style={styles.inlineGalleryThumbCheck}>
                                <Ionicons name="checkmark" size={12} color="#FFF" />
                              </View>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>
                ) : null}
                {usingEnhancedPortrait ? <Text style={styles.editorInlineHint}>Enhanced portrait active.</Text> : null}
              </View>

              {isEnhancePreviewActive ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Portrait upgrade</Text>
                  <Pressable
                    onPress={handleEnhancePortrait}
                    disabled={!photo || portraitEnhanceLoading}
                    style={({ pressed }) => [
                      styles.enhanceButton,
                      (!photo || portraitEnhanceLoading) && styles.enhanceButtonDisabled,
                      pressed && photo && !portraitEnhanceLoading ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : undefined,
                    ]}
                  >
                    {portraitEnhanceLoading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <>
                        <View style={styles.enhanceButtonIconWrap}>
                          <LinearGradient
                            colors={["#FF7BAF", "#FF5D90", "#FF4F7D"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.enhanceButtonIconFill}
                          >
                            <Ionicons name="sparkles" size={14} color="#FFF" />
                          </LinearGradient>
                        </View>
                        <Text style={styles.enhanceButtonText}>Enhance portrait</Text>
                      </>
                    )}
                  </Pressable>
                  {portraitEnhanceLoading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}

                  {portraitEnhanceCandidate ? (
                    <View style={styles.enhancePreviewCard}>
                      <Text style={styles.enhancePreviewTitle}>Enhanced preview</Text>
                      <Image source={{ uri: portraitEnhanceCandidate.uri }} style={styles.enhancePreviewImage} contentFit="cover" />
                      <View style={styles.enhanceDecisionRow}>
                        <Pressable
                          onPress={handleEnhancePortrait}
                          disabled={portraitEnhanceLoading}
                          style={({ pressed }) => [
                            styles.enhanceDecisionButton,
                            styles.enhanceRetryButton,
                            pressed && !portraitEnhanceLoading ? { opacity: 0.88 } : undefined,
                          ]}
                        >
                          <Text style={styles.enhanceRetryButtonText}>Try again</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleDownloadEnhancedPortrait()}
                          style={({ pressed }) => [
                            styles.enhanceDecisionButton,
                            styles.enhanceDownloadButton,
                            pressed ? { opacity: 0.9 } : undefined,
                          ]}
                        >
                          <Text style={styles.enhanceDownloadButtonText}>Download</Text>
                        </Pressable>
                        <Pressable
                          onPress={handleKeepEnhancedPortrait}
                          style={({ pressed }) => [
                            styles.enhanceDecisionButton,
                            styles.enhanceKeepButton,
                            pressed ? { opacity: 0.9 } : undefined,
                          ]}
                        >
                          <Text style={styles.enhanceKeepButtonText}>Keep this one</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : (
                <>
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Choose quality</Text>
                    <View style={styles.modalQualityRow}>
                      {generationTiers.map((tier) => {
                        const selected = tier.id === (activeGenerationTier?.id || selectedGenerationTierId);
                        const tierCost = tier.credits + (isFirstOwnStyleGeneration ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0);
                        return (
                          <Pressable
                            key={tier.id}
                            onPress={() => setSelectedGenerationTierId(tier.id)}
                            style={[styles.modalQualityButton, selected && styles.modalQualityButtonActive]}
                          >
                            <Text style={[styles.modalQualityButtonLabel, selected && styles.modalQualityButtonLabelActive]}>{tier.label}</Text>
                            <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tier.output}</Text>
                            <Text style={[styles.modalQualityButtonMeta, selected && styles.modalQualityButtonMetaActive]}>{tierCost} credits</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.modalSection}>
                    <Pressable
                      onPress={handleTransform}
                      disabled={!canGenerate}
                      style={({ pressed }) => [
                        styles.generateButton,
                        !canGenerate && styles.generateButtonDisabled,
                        pressed && canGenerate ? { opacity: 0.9 } : undefined,
                      ]}
                    >
                      <View style={styles.generateButtonInner}>
                        {loading ? (
                          <ActivityIndicator color="#FF7FB1" />
                        ) : (
                          <Text style={styles.generateButtonText}>Restyle</Text>
                        )}
                      </View>
                    </Pressable>
                    <Text style={styles.generateCostLabel}>{transformCost} credits</Text>
                    <Text style={styles.generateActionHint}>Generates a new image</Text>
                    {!canGenerate && generateBlockedReason ? <Text style={styles.generateBlockedHintText}>{generateBlockedReason}</Text> : null}
                    {loading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
                  </View>

                  {modalStyleResultAvailable ? (
                    <View style={styles.modalSection}>
                      <Image
                        source={{ uri: buildDataUri(resultBase64 || "", resultImageMimeType) }}
                        style={styles.resultImage}
                        contentFit="cover"
                      />
                      <View style={styles.resultMetaCard}>
                        <Text style={styles.resultMetaTitle}>Generation details</Text>
                        <Text style={styles.resultMetaText}>
                          Style: {selectedStylePreset?.label || "Chicoo"}
                          {selectedArtStyle ? ` + ${selectedArtStyle.label}` : ""} - Quality: {resultMeta?.qualityLabel || activeGenerationQualityLabel}
                        </Text>
                        <Text style={styles.resultMetaText}>
                          Mode: {resultMeta?.stylePresetId === INSTAME_OWN_STYLE_ID ? "Own Style" : resultMeta?.promptOnlyMode ? "Prompt preset" : "Reference guided"}
                        </Text>
                      </View>
                      <View style={styles.postGenerationSection}>
                        <Text style={styles.pricingSectionTitle}>Edit after generation</Text>
                        <View style={[styles.pricingCard, styles.pricingCardActive]}>
                          <View style={styles.pricingTopRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.pricingLabel}>{selectedEditTier?.label || "Edit"}</Text>
                              <Text style={styles.pricingSubtitle}>
                                {selectedEditTier?.subtitle || "Refine your generated result"}
                              </Text>
                            </View>
                            <View style={[styles.pricingBadge, styles.pricingBadgeLive]}>
                              <Text style={styles.pricingBadgeText}>{selectedEditTier?.badge || "Live"}</Text>
                            </View>
                          </View>

                          <View style={styles.pricingMetaRow}>
                            <Text style={styles.pricingCredits}>{selectedEditTier?.credits ?? 0} credits</Text>
                            <Text style={styles.pricingMetaText}>{selectedEditTier?.output || "1024 x 1024"}</Text>
                          </View>
                        </View>
                      </View>
                      <View style={styles.resultActionRow}>
                        <Pressable style={[styles.resultActionButton, styles.resultActionButtonPrimary]} onPress={handleDownload}>
                          <Ionicons name="download-outline" size={18} color={Colors.accent} />
                          <Text numberOfLines={1} style={styles.downloadText}>Download</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.resultActionButton, styles.resultActionButtonSecondary]}
                          onPress={() => setShowEditComposer((prev) => !prev)}
                        >
                          <Ionicons name="create-outline" size={18} color={Colors.accentSoft} />
                          <Text numberOfLines={1} style={styles.editButtonText}>Edit</Text>
                        </Pressable>
                      </View>
                      {showEditComposer ? (
                        <View style={styles.editComposer}>
                          <Text style={styles.editComposerTitle}>Refine this result</Text>
                          <Text style={styles.editComposerSubtitle}>
                            This edit costs {selectedEditTier?.credits ?? 0} credits
                          </Text>
                          <TextInput
                            value={editInstruction}
                            onChangeText={setEditInstruction}
                            placeholder="Example: soften makeup, keep outfit, make the background more cinematic..."
                            placeholderTextColor="#7A7A7A"
                            multiline
                            style={styles.promptInput}
                          />
                          <Pressable
                            onPress={handleEditResult}
                            disabled={editLoading}
                            style={({ pressed }) => [
                              styles.generateButton,
                              editLoading && styles.generateButtonDisabled,
                              pressed && !editLoading ? { opacity: 0.9 } : undefined,
                            ]}
                          >
                            {editLoading ? (
                              <LinearGradient
                                colors={["#FF7FB1", "#FF6698", "#FF4F7D"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.generateButtonInner}
                              >
                                <ActivityIndicator color="#FFF" />
                              </LinearGradient>
                            ) : (
                              <LinearGradient
                                colors={["#FF7FB1", "#FF6698", "#FF4F7D"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.generateButtonInner}
                              >
                                <Ionicons name="create-outline" size={18} color="#FFF" />
                                <Text style={styles.generateButtonText}>Apply Edit</Text>
                                <Text style={styles.costText}>{selectedEditTier?.credits ?? 0} credits</Text>
                              </LinearGradient>
                            )}
                          </Pressable>
                          {editLoading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
                        </View>
                      ) : null}
                      <Text style={styles.resultFootnote}>
                        Download is free. Edit creates a fresh variation from this result.
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backgroundGlowTopRight: {
    position: "absolute",
    top: -64,
    right: -44,
    width: 260,
    height: 320,
    borderRadius: 160,
    transform: [{ rotate: "-14deg" }],
  },
  backgroundGlowBottomLeft: {
    position: "absolute",
    left: -90,
    bottom: 28,
    width: 250,
    height: 220,
    borderRadius: 140,
    transform: [{ rotate: "18deg" }],
  },
  backgroundVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.14)",
  },
  header: { paddingHorizontal: 16, gap: 6, marginBottom: 10 },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerCopySolo: {
    flex: 1,
    paddingTop: 4,
  },
  headerBrand: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textTransform: "uppercase",
    fontSize: 30,
    lineHeight: 34,
  },
  headerTitle: {
    color: "rgba(255,255,255,0.5)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginTop: 4,
  },
  headerCreditsLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  headerCreditsCount: {
    color: Colors.accentLight,
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 18,
  },
  headerCreditsLabel: {
    color: "rgba(255,255,255,0.65)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  categoryPillRowTop: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 6,
  },
  libraryHint: { color: Colors.textSecondary, fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  libraryHintMuted: { color: Colors.textDim, fontFamily: "Inter_400Regular", fontSize: 11 },
  vibeSection: {
    marginTop: 14,
    gap: 12,
  },
  vibeFeatureCard: {
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  vibeFeatureTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  vibeFeatureIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  vibeFeatureCopy: {
    flex: 1,
    gap: 2,
  },
  vibeFeatureEyebrow: {
    color: "rgba(255,255,255,0.52)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },
  vibeFeatureTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 26,
  },
  vibeFeatureCountPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.34)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  vibeFeatureCountText: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  vibeFeatureTagline: {
    marginTop: 12,
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 19,
  },
  vibeActivePackStrip: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  vibeActivePackText: {
    flex: 1,
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 16,
  },
  vibeRail: {
    paddingHorizontal: 16,
    gap: 10,
  },
  vibeRailCard: {
    width: 104,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  vibeRailCardActive: {
    borderColor: "rgba(255,255,255,0.42)",
  },
  vibeRailCardFill: {
    minHeight: 82,
    padding: 10,
    justifyContent: "space-between",
  },
  vibeRailCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vibeRailCount: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  vibeRailLabel: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    lineHeight: 17,
  },
  packSection: {
    marginTop: 18,
    gap: 12,
  },
  packHeaderRow: {
    marginHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
  },
  packEyebrow: {
    color: Colors.accentLight,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  packTitle: {
    marginTop: 3,
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  packMetaText: {
    color: "rgba(255,255,255,0.48)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  packRail: {
    paddingHorizontal: 16,
    gap: 12,
  },
  packCard: {
    width: 148,
    aspectRatio: 9 / 16,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(12,12,16,0.95)",
  },
  packCardActive: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.52)",
    shadowColor: "#fff",
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  packCardDiptych: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  packCardDiptychHalf: {
    flex: 1,
    height: "100%",
  },
  packCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    padding: 10,
    paddingBottom: 12,
  },
  packCardFill: {
    padding: 10,
    gap: 10,
  },
  packMosaic: {
    height: 112,
    borderRadius: 16,
    overflow: "hidden",
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "rgba(0,0,0,0.36)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  packMosaicImage: {
    width: "50%",
    height: "50%",
  },
  packMosaicFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  packCardCopy: {
    gap: 5,
  },
  packCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  packCardBottomCopy: {
    gap: 4,
  },
  packCardExpandHint: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  // ── Aesthetic lightbox ──────────────────────────────────────────────────────
  packLightboxBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.97)",
  },
  packLightboxHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    gap: 12,
  },
  packLightboxTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  packLightboxSubtitle: {
    color: "rgba(255,255,255,0.46)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  packLightboxClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  packLightboxPage: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  packLightboxImage: {
    width: "100%",
    flex: 1,
  },
  packLightboxDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  packLightboxDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.28)",
  },
  packLightboxDotActive: {
    backgroundColor: "#FFF",
    width: 18,
  },
  packLightboxFooter: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 8,
  },
  packLightboxSelectButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingVertical: 14,
  },
  packLightboxSelectText: {
    color: "#0a0a0f",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  // ───────────────────────────────────────────────────────────────────────────
  packCardCount: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  packCardTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    lineHeight: 22,
  },
  packCardSubtitle: {
    color: "rgba(255,255,255,0.74)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  packCardExample: {
    color: "rgba(255,255,255,0.42)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  packCardShotList: {
    gap: 4,
    marginTop: 2,
  },
  packCardShotPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  packCardShotPillNum: {
    color: "rgba(255,255,255,0.38)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 14,
    width: 14,
    textAlign: "center",
  },
  packCardShotPillText: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 14,
    flexShrink: 1,
  },
  packPlannerCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(12,12,16,0.95)",
    padding: 12,
    gap: 12,
  },
  packPlannerStepsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  packPlannerStepText: {
    color: "rgba(255,255,255,0.56)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  packPlannerStepTextActive: {
    color: "#FFF",
    borderColor: "rgba(126,243,255,0.42)",
    backgroundColor: "rgba(126,243,255,0.15)",
  },
  packPlannerEmptyState: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  packPlannerEmptyTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  packPlannerEmptySubtitle: {
    color: "rgba(255,255,255,0.66)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  packPlannerSummaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.28)",
    backgroundColor: "rgba(126,243,255,0.09)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  packPlannerSummaryTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  packPlannerSummaryText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  packPlannerDeliverableText: {
    color: "rgba(255,255,255,0.52)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  packPlannerShotGrid: {
    gap: 5,
    marginTop: 8,
  },
  packPlannerSelectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  packPlannerSelectionHint: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 3,
  },
  packPlannerSelectionPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.36)",
    backgroundColor: "rgba(126,243,255,0.12)",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  packPlannerSelectionPillText: {
    color: "#DFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  packPlannerSelectionActions: {
    flexDirection: "row",
    gap: 8,
  },
  packPlannerSelectionAction: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    paddingVertical: 8,
  },
  packPlannerSelectionActionDisabled: {
    opacity: 0.42,
  },
  packPlannerSelectionActionText: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  packPlannerShotRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  packPlannerShotSelectableRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 8,
  },
  packPlannerShotSelectedRow: {
    borderColor: "rgba(126,243,255,0.35)",
    backgroundColor: "rgba(126,243,255,0.08)",
  },
  packPlannerShotExcludedRow: {
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  packPlannerShotCheck: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  packPlannerShotCheckActive: {
    borderColor: "rgba(126,243,255,0.85)",
    backgroundColor: "#7EF3FF",
  },
  packPlannerShotNum: {
    color: "rgba(255,255,255,0.38)",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    lineHeight: 16,
    width: 16,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    borderRadius: 4,
  },
  packPlannerShotNumSelected: {
    color: "#DFFFFF",
    borderColor: "rgba(126,243,255,0.38)",
  },
  packPlannerShotLabel: {
    color: "rgba(255,255,255,0.84)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  packPlannerShotLabelExcluded: {
    color: "rgba(255,255,255,0.36)",
    textDecorationLine: "line-through",
  },
  packPlannerBlock: {
    gap: 8,
  },
  packPlannerLabel: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPlannerVibeRail: {
    gap: 8,
    paddingRight: 8,
  },
  packPlannerVibeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  packPlannerVibeChipActive: {
    borderColor: "rgba(255,255,255,0.36)",
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  packPlannerVibeChipText: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  packPlannerCountRow: {
    flexDirection: "row",
    gap: 8,
  },
  packPlannerCountChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    paddingVertical: 8,
  },
  packPlannerCountChipActive: {
    borderColor: "rgba(126,243,255,0.44)",
    backgroundColor: "rgba(126,243,255,0.16)",
  },
  packPlannerCountChipText: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  packPlannerCountChipTextActive: {
    color: "#DFFFFF",
  },
  packPlannerPaletteRail: {
    gap: 8,
    paddingRight: 8,
  },
  packPlannerPaletteCard: {
    width: 156,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    gap: 6,
  },
  packPlannerPaletteCardActive: {
    borderColor: "rgba(126,243,255,0.46)",
    backgroundColor: "rgba(126,243,255,0.12)",
  },
  packPlannerPaletteSwatches: {
    flexDirection: "row",
    gap: 5,
  },
  packPlannerPaletteSwatch: {
    flex: 1,
    height: 18,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },
  packPlannerPaletteTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPlannerPaletteSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
  },
  packPlannerElementWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  packPlannerElementChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  packPlannerElementChipActive: {
    borderColor: "rgba(255,79,125,0.52)",
    backgroundColor: "rgba(255,79,125,0.14)",
  },
  packPlannerElementChipText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  packPlannerElementChipTextActive: {
    color: "#FFF",
  },
  packPlannerIdentityList: {
    gap: 8,
  },
  packPlannerIdentityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  packPlannerIdentityCardActive: {
    borderColor: "rgba(0,229,204,0.56)",
    backgroundColor: "rgba(0,229,204,0.12)",
  },
  packPlannerIdentityTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPlannerIdentitySubtitle: {
    color: "rgba(255,255,255,0.66)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  packPlannerIdentityHint: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  packPlannerNotesInput: {
    minHeight: 72,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    textAlignVertical: "top",
  },
  packPlannerDraftSummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.32)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 4,
  },
  packPlannerDraftSummaryTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPlannerDraftSummaryText: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 17,
  },
  packPlannerComingSoonButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    opacity: 0.8,
  },
  packPlannerComingSoonText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  packPlannerPreviewButton: {
    borderRadius: 12,
    backgroundColor: "#FFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  packPlannerPreviewButtonText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  packPlannerRenderButton: {
    borderRadius: 12,
    backgroundColor: "rgba(126,243,255,0.80)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  packPlannerRenderButtonText: {
    color: "#000",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  packPlannerRenderSummary: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.18)",
    backgroundColor: "rgba(126,243,255,0.07)",
    paddingHorizontal: 10,
    paddingVertical: 9,
    gap: 3,
  },
  packPlannerRenderSummaryText: {
    color: "rgba(223,255,255,0.78)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  packPlannerResetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  packPlannerResetButtonText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  packPlannerErrorCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.36)",
    backgroundColor: "rgba(255,79,125,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  packPlannerErrorText: {
    color: "#FF7A9E",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
  },
  packPlannerPreviewCard: {
    gap: 8,
  },
  packPlannerCompositeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    padding: 10,
    gap: 6,
  },
  packPlannerPreviewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
  },
  packPlannerResultsGrid: {
    gap: 8,
  },
  packPlannerResultsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  packPlannerResultCard: {
    width: "48%",
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  packPlannerResultThumb: {
    width: "100%",
    aspectRatio: 4 / 5,
  },
  packPlannerResultFooter: {
    minHeight: 34,
    paddingHorizontal: 8,
    paddingVertical: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.54)",
  },
  packPlannerResultLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },

  // Grid Pipeline styles
  pipelineSection: {
    gap: 16,
    paddingBottom: 24,
  },
  pipelineBlock: {
    paddingHorizontal: 16,
    gap: 4,
  },
  pipelineEyebrow: {
    color: "rgba(255,255,255,0.46)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  pipelineTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  pipelineSubtitle: {
    color: "rgba(255,255,255,0.56)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  pipelineAestheticRail: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 12,
  },
  pipelineAestheticCard: {
    width: 200,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  pipelineAestheticCardActive: {
    borderColor: "rgba(255,255,255,0.36)",
  },
  pipelineAestheticCardFill: {
    padding: 14,
    gap: 8,
  },
  pipelineAestheticIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pipelineAestheticLabel: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 20,
  },
  pipelineAestheticTagline: {
    color: "rgba(255,255,255,0.60)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  pipelineAestheticPaletteRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  pipelineAestheticPaletteText: {
    color: "rgba(255,255,255,0.48)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
    flex: 1,
  },
  pipelineConfigCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    backgroundColor: "rgba(12,12,16,0.96)",
    padding: 14,
    gap: 8,
  },
  pipelineConfigTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  pipelineCountRow: {
    flexDirection: "row",
    gap: 8,
  },
  pipelineCountChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  pipelineCountChipActive: {
    borderColor: "rgba(255,255,255,0.55)",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pipelineCountChipText: {
    color: "rgba(255,255,255,0.56)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  pipelineCountChipTextActive: {
    color: "#FFF",
  },
  pipelineNotesInput: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    padding: 10,
    minHeight: 64,
    textAlignVertical: "top",
  },
  pipelineErrorCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.36)",
    backgroundColor: "rgba(255,79,125,0.10)",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  pipelineErrorText: {
    color: "#FF7A9E",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  pipelinePlanCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.22)",
    backgroundColor: "rgba(126,243,255,0.06)",
    padding: 12,
    gap: 8,
  },
  pipelinePlanTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  pipelinePlanMeta: {
    color: "rgba(255,255,255,0.52)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  pipelinePlanRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  pipelinePlanTypeBadge: {
    width: 20,
    height: 20,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  pipelinePlanTypeBadgeComplex: {
    backgroundColor: "rgba(255,79,125,0.36)",
  },
  pipelinePlanTypeBadgeSimple: {
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pipelinePlanTypeBadgeMedium: {
    backgroundColor: "rgba(126,243,255,0.28)",
  },
  pipelinePlanTypeBadgeText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  pipelinePlanShotLabel: {
    color: "rgba(255,255,255,0.84)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  pipelinePlanShotMeta: {
    color: "rgba(255,255,255,0.40)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
  pipelineResultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pipelineResultThumbWrap: {
    width: "48%",
    gap: 4,
  },
  pipelineResultThumb: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 10,
  },
  pipelineResultThumbLabel: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    lineHeight: 14,
  },
  pipelineActionsRow: {
    gap: 8,
    marginTop: 4,
  },
  pipelinePlanButton: {
    backgroundColor: "#00E5CC",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  pipelinePlanButtonText: {
    color: "#0a0a0f",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  pipelineRenderButton: {
    backgroundColor: "#FF4F7D",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  pipelineRenderButtonText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  pipelineExtendButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.44)",
    backgroundColor: "rgba(126,243,255,0.10)",
  },
  pipelineExtendButtonText: {
    color: "#7EF3FF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  pipelineResetButton: {
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  pipelineResetButtonText: {
    color: "rgba(255,255,255,0.56)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  card: {
    marginHorizontal: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    borderRadius: Colors.radiusLg,
    backgroundColor: "rgba(18,18,22,0.92)",
    padding: 14,
    gap: 12,
  },
  cardTitle: {
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 16,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  sectionTabBarOuter: {
    marginHorizontal: 16,
    marginTop: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  sectionTabBar: {
    flexDirection: "row",
    gap: 0,
  },
  sectionTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  sectionTabActive: {},
  sectionTabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionTabIndicator: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  sectionTabText: {
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  sectionTabTextActive: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
  },
  subTabBar: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  subTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Colors.radiusSm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  subTabActive: {
    borderColor: Colors.accent,
    backgroundColor: "rgba(255,79,125,0.10)",
  },
  subTabText: {
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  subTabTextActive: {
    color: Colors.accentLight,
  },
  uploadBox: {
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
  },
  uploadImage: { width: "100%", height: 250 },
  uploadPlaceholder: { height: 160, justifyContent: "center", alignItems: "center", paddingHorizontal: 16, gap: 8 },
  uploadPlaceholderTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 14 },
  uploadPlaceholderSubtitle: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
  uploadCompactRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch",
  },
  uploadThumbBox: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Colors.radiusLg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.28)",
    backgroundColor: "rgba(18,18,22,0.6)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  uploadThumbImage: {
    width: "100%",
    height: "100%",
  },
  uploadThumbPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonsColumn: {
    flex: 1,
    gap: 6,
  },
  uploadCompactButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: Colors.radiusSm,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  uploadCompactButtonAccent: {
    borderColor: "rgba(255,79,125,0.25)",
    backgroundColor: "rgba(255,79,125,0.06)",
  },
  uploadCompactButtonText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  uploadCompactButtonTextAccent: {
    color: Colors.accentLight,
  },
  uploadActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  collageSection: {
    marginHorizontal: 16,
    marginTop: 16,
    gap: 8,
  },
  collageSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 4,
  },
  collageSectionTitleWrap: {
    flex: 1,
    gap: 2,
  },
  collageSectionEyebrow: {
    color: "rgba(255,255,255,0.44)",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  collageSectionTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 19,
    lineHeight: 23,
  },
  collageSectionMeta: {
    color: Colors.accentLight,
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  collageColumnsWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  collageColumn: {
    flex: 1,
    gap: 8,
  },
  collageHeroTile: {
    height: 356,
    borderRadius: 34,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0C0F13",
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 12,
  },
  collageHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  collageTileOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  collageHeroBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(223,255,250,0.88)",
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  collageHeroBadgeText: {
    color: "#081012",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  collageHeroTextWrap: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 22,
    gap: 8,
  },
  collageHeroTitle: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 31,
    lineHeight: 35,
  },
  collageHeroSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
    maxWidth: "78%",
  },
  collageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "flex-start",
  },
  collageTile: {
    borderRadius: 24,
    backgroundColor: "transparent",
    shadowOpacity: 0.36,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  collageTileActive: {
    shadowOpacity: 0.72,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 14,
  },
  collageTileInner: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 0.85,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#060606",
  },
  collageTileMedia: {
    position: "relative",
    width: "100%",
    padding: 2,
  },
  collageTileGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  collageTileGlowIdle: {
    borderWidth: 1,
    shadowOpacity: 0.40,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 0 },
  },
  collageTileGlowActive: {
    borderWidth: 1.5,
    shadowOpacity: 0.80,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  collageTileCaption: {
    position: "absolute",
    left: 8,
    right: 8,
    bottom: 8,
    borderRadius: 14,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.54)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  collageTileCaptionText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  collageTileImageContained: {
    ...StyleSheet.absoluteFillObject,
  },
  collageTileFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  collageTileFallbackText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    lineHeight: 15,
    textAlign: "center",
  },
  ownUploadInlineActions: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 6,
  },
  ownUploadInlineAction: {
    flex: 1,
    minHeight: 30,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.30)",
    backgroundColor: "rgba(10,18,22,0.72)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  ownUploadInlineActionDisabled: {
    opacity: 0.45,
  },
  ownUploadInlineActionText: {
    color: "#DFFFFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    lineHeight: 13,
    textAlign: "center",
  },
  ownUploadInlineActionTextDisabled: {
    color: "rgba(223,255,255,0.58)",
  },
  ownUploadAnchorMedia: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(38,244,237,0.62)",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000000",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  ownUploadAnchorBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  ownUploadAnchorText: {
    color: "#26F4ED",
    fontFamily: "Inter_700Bold",
    fontSize: 23,
    lineHeight: 24,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    textShadowColor: "rgba(38,244,237,0.82)",
    textShadowRadius: 12,
    textShadowOffset: { width: 0, height: 0 },
  },
  ownUploadAnchorPlus: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(38,244,237,0.82)",
    backgroundColor: "rgba(7,45,44,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  artNoneCollageMedia: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#0A0806",
  },
  artNoneCollageText: {
    color: "#FFE8C4",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textShadowColor: "rgba(255,226,175,0.45)",
    textShadowRadius: 8,
    textShadowOffset: { width: 0, height: 0 },
  },
  studioSection: {
    marginHorizontal: 16,
    marginTop: 14,
    gap: 14,
  },
  studioPortraitStrip: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.24)",
    backgroundColor: "rgba(18,18,24,0.94)",
    padding: 14,
    gap: 10,
    shadowColor: "#53ECFF",
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  studioPortraitLabel: {
    color: "rgba(235,255,255,0.88)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  portraitButtonGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    justifyContent: "space-between",
    gap: 10,
  },
  portraitSourceCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 78,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(8,12,16,0.82)",
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  portraitSourceCardActive: {
    borderColor: "rgba(126,243,255,0.52)",
    backgroundColor: "rgba(126,243,255,0.12)",
    shadowColor: "#58F0FF",
    shadowOpacity: 0.36,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  portraitSourceCardText: {
    color: Colors.accentPale,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 14,
    textAlign: "center",
  },
  portraitSourceCardTextActive: {
    color: "#DFFFFF",
  },
  portraitEnhanceCard: {
    minHeight: 74,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.34)",
    backgroundColor: "rgba(16,28,34,0.92)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#53ECFF",
    shadowOpacity: 0.46,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  portraitEnhanceCardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: "hidden",
  },
  portraitEnhanceCardIconFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  portraitEnhanceCardCopy: {
    flex: 1,
    gap: 2,
  },
  portraitEnhanceCardTitle: {
    color: "#E8FFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  portraitEnhanceCardSubtitle: {
    color: "rgba(235,255,255,0.68)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  portraitEnhanceCardBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.24)",
    backgroundColor: "rgba(126,243,255,0.14)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: "flex-start",
  },
  portraitEnhanceCardBadgeText: {
    color: "#DFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  inlineGalleryPanel: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.16)",
    backgroundColor: "rgba(10,14,18,0.98)",
    padding: 12,
    gap: 10,
  },
  inlineGalleryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  inlineGalleryTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  inlineGalleryCloseBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  inlineGalleryEmpty: {
    color: "rgba(255,255,255,0.46)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: 12,
  },
  inlineGalleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 10,
  },
  inlineGalleryThumb: {
    width: "31%",
    aspectRatio: 0.78,
    minHeight: 96,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#0A0A0A",
  },
  inlineGalleryThumbFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A0A0A",
  },
  inlineGalleryThumbActive: {
    borderColor: "rgba(126,243,255,0.82)",
    shadowColor: "#58F0FF",
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  inlineGalleryThumbName: {
    color: "#FFF",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    lineHeight: 13,
  },
  inlineGalleryThumbCheck: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(126,243,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  studioPortraitActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  studioQuickButton: {
    minHeight: 44,
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  studioQuickButtonAccent: {
    borderColor: "rgba(255,79,125,0.28)",
    backgroundColor: "rgba(255,79,125,0.08)",
  },
  studioQuickButtonText: {
    color: Colors.accentPale,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  studioQuickButtonTextAccent: {
    color: Colors.accentLight,
  },
  studioHero: {
    height: 392,
    borderRadius: 32,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#090B10",
    shadowColor: "#000",
    shadowOpacity: 0.22,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
  studioHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  studioHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  studioHeroBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  studioHeroBadgeText: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  studioHeroTextWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    gap: 6,
  },
  studioHeroTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 29,
    lineHeight: 33,
  },
  studioHeroSubtitle: {
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: "82%",
  },
  studioPanel: {
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(18,18,24,0.94)",
    padding: 14,
    gap: 14,
  },
  ownStylePositioningText: {
    color: "#DFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    lineHeight: 20,
    letterSpacing: 0.2,
  },
  enhanceButton: {
    marginTop: 12,
    alignSelf: "stretch",
    minHeight: 46,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "rgba(10,10,10,0.85)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#FF5D9F",
    shadowOpacity: 0.50,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(255,100,160,0.45)",
  },
  enhanceButtonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
  },
  enhanceButtonIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    overflow: "hidden",
  },
  enhanceButtonIconFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  enhanceButtonCopy: {
    flex: 1,
    gap: 2,
  },
  enhanceButtonText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    lineHeight: 20,
  },
  enhanceButtonSubtitle: {
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    lineHeight: 18,
  },
  enhanceButtonTrailing: {
    width: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  enhanceButtonCost: {
    color: "#111",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Colors.radiusSm,
  },
  enhanceHintText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  enhanceSelectedText: {
    color: Colors.accentLight,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  enhancePreviewCard: {
    marginTop: 8,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.20)",
    backgroundColor: "rgba(255,79,125,0.04)",
    padding: 12,
    gap: 12,
  },
  enhancePreviewTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  enhancePreviewSubtitle: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  enhancePreviewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  enhanceDecisionRow: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  enhanceDecisionButton: {
    flex: 1,
    minWidth: 96,
    minHeight: 46,
    borderRadius: Colors.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  enhanceRetryButton: {
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
  },
  enhanceKeepButton: {
    backgroundColor: Colors.accent,
  },
  enhanceDownloadButton: {
    borderWidth: 1,
    borderColor: "rgba(126,243,255,0.45)",
    backgroundColor: "rgba(126,243,255,0.12)",
  },
  enhanceRetryButtonText: {
    color: Colors.accentPale,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  enhanceDownloadButtonText: {
    color: Colors.accentLight,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  enhanceKeepButtonText: {
    color: "#050505",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 17,
  },
  secondaryActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryActionButtonAccent: {
    borderColor: "rgba(255,79,125,0.30)",
    backgroundColor: "rgba(255,79,125,0.06)",
  },
  secondaryActionButtonDisabled: {
    opacity: 0.45,
  },
  secondaryActionButtonText: {
    color: Colors.accentPale,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  secondaryActionButtonTextAccent: {
    color: Colors.accentLight,
  },
  ownStyleModeButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  ownStyleModeButtonMatch: {
    borderColor: "rgba(255, 210, 126, 0.42)",
    backgroundColor: "rgba(255, 196, 92, 0.18)",
  },
  ownStyleModeButtonCreative: {
    borderColor: "rgba(127, 228, 255, 0.42)",
    backgroundColor: "rgba(78, 214, 255, 0.18)",
  },
  ownStyleModeButtonActive: {
    borderColor: "rgba(255,255,255,0.72)",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  ownStyleModeButtonText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  ownStyleModeButtonTextActive: {
    color: "#0B0B0B",
  },
  ownStylePanel: {
    marginTop: 8,
    gap: 12,
  },
  ownStylePanelTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ownStylePanelText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  processingHintText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  ownStyleUploadBox: {
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.28)",
    backgroundColor: "rgba(134,244,255,0.06)",
    minHeight: 220,
    justifyContent: "center",
  },
  ownStyleUploadImage: {
    width: "100%",
    height: 240,
  },
  ownStyleUploadPlaceholder: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 8,
  },
  ownStyleUploadPlaceholderTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ownStyleUploadPlaceholderText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  ownStyleSavedMeta: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.18)",
    backgroundColor: "rgba(134,244,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  ownStyleSavedMetaTitle: {
    color: "#E7FDFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  ownStyleSavedMetaText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  renameOwnStyleRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  renameOwnStyleInput: {
    flex: 1,
    minHeight: 42,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.16)",
    backgroundColor: Colors.surfaceFaint,
    color: "#FFF",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    paddingHorizontal: 12,
  },
  renameOwnStyleButton: {
    minWidth: 92,
    minHeight: 42,
    borderRadius: Colors.radiusMd,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
    backgroundColor: "rgba(134,244,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.24)",
  },
  renameOwnStyleButtonText: {
    color: "#E7FDFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  ownStylesLibrarySection: {
    gap: 12,
    marginTop: 4,
  },
  ownStylesLibraryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  ownStylesLibraryTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ownStylesLibraryCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    textAlign: "center",
    textAlignVertical: "center",
    overflow: "hidden",
    color: "#E7FDFF",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    backgroundColor: "rgba(134,244,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.24)",
    paddingTop: 6,
  },
  ownStylesLibraryText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  ownStylesRow: {
    gap: 12,
    paddingLeft: 2,
    paddingRight: 12,
  },
  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  libraryGridCard: {
    width: "48.2%",
    height: 208,
    borderRadius: Colors.radiusLg,
    backgroundColor: "rgba(134,244,255,0.06)",
    padding: 1,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  savedOwnStyleCardOuter: {
    width: 156,
    height: 198,
    borderRadius: Colors.radiusLg,
    backgroundColor: "rgba(134,244,255,0.06)",
    padding: 1,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  savedOwnStyleCard: {
    flex: 1,
    borderRadius: Colors.radiusLg,
    overflow: "hidden",
    borderWidth: 1,
  },
  savedOwnStyleCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  savedOwnStyleCardText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  uploadedImagesSection: {
    marginTop: 16,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    padding: 12,
    gap: 12,
  },
  uploadedImagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  uploadedImagesHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  uploadedImagesTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  uploadedImagesSubtitle: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  uploadedImagesCount: {
    color: Colors.accentLight,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  viewModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  viewModeChip: {
    minWidth: 40,
    height: 34,
    borderRadius: Colors.radiusFull,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  viewModeChipActive: {
    borderColor: "rgba(255,79,125,0.50)",
    backgroundColor: "rgba(255,79,125,0.10)",
  },
  viewModeChipText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  viewModeChipTextActive: {
    color: Colors.accentPale,
  },
  uploadedImagesEmptyState: {
    minHeight: 124,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  uploadedImagesEmptyTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  uploadedImagesEmptySubtitle: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  uploadedImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  uploadedImageTileWrap: {
    position: "relative",
  },
  uploadedImageTile: {
    flex: 1,
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: "#0B0B0B",
  },
  uploadedImageTileActive: {
    borderColor: "rgba(255,79,125,0.82)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  uploadedImageTileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  uploadedImageTileOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  uploadedImageSelectedBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadedImageTileMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 18,
  },
  uploadedImageTileName: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  uploadedImageTileInfo: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  uploadedImageDeleteButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.68)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  styleCarouselWrap: {
    position: "relative",
    marginRight: -16,
  },
  styleRow: {
    gap: 16,
    paddingLeft: 2,
    paddingRight: 86,
  },
  styleCardOuter: {
    width: 180,
    height: 230,
    borderRadius: Colors.radiusLg,
    backgroundColor: "rgba(255,79,125,0.04)",
    padding: 2,
    shadowColor: "#FF4FBE",
    shadowOpacity: 0.24,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  styleCardOuterFirst: {
    marginLeft: 2,
  },
  styleCardOuterLast: {
    marginRight: 2,
  },
  styleCardOuterActive: {
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.5,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    elevation: 16,
  },
  styleCard: {
    flex: 1,
    borderRadius: Colors.radiusLg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,180,215,0.28)",
    backgroundColor: "#050505",
  },
  styleCardActive: {
    borderColor: "rgba(255,132,185,0.98)",
    backgroundColor: "#050505",
  },
  styleCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  ownStyleCardPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: "rgba(134,244,255,0.08)",
  },
  ownStyleCardPlaceholderText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 18,
  },
  styleCardAtmosphere: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardImageWash: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: Colors.radiusLg,
    borderWidth: 1,
    borderColor: "rgba(255,210,228,0.12)",
  },
  styleCardInnerRingActive: {
    borderColor: "rgba(255,179,210,0.62)",
  },
  styleCardFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 92,
  },
  styleCardTextWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    minHeight: 80,
    justifyContent: "flex-end",
  },
  styleCardTitle: {
    color: Colors.accentSoft,
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  styleCardTitleActive: {
    color: Colors.accentPale,
  },
  styleScrollHintWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 96,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  styleScrollFade: {
    ...StyleSheet.absoluteFillObject,
  },
  styleScrollArrow: {
    marginRight: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,79,125,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,173,212,0.40)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.3,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  categoryPillRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  categoryPillActive: {
    backgroundColor: "rgba(255,127,177,0.18)",
    borderColor: "rgba(255,127,177,0.50)",
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.45)",
    letterSpacing: 0.3,
  },
  categoryPillTextActive: {
    color: "#fff",
  },
  categoryEmptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 8,
  },
  categoryEmptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: "rgba(255,255,255,0.50)",
  },
  categoryEmptySubtext: {
    fontSize: 13,
    color: "rgba(255,255,255,0.30)",
  },
  favoriteStylesSection: {
    gap: 12,
    marginBottom: 8,
  },
  selectedStyleRow: {
    marginTop: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  selectedStyleText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },
  selectedStyleAccent: {
    color: Colors.accentPink,
    fontFamily: "Inter_700Bold",
  },
  favoriteStyleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: Colors.radiusFull,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  favoriteStyleButtonText: {
    color: Colors.accentSoft,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  fineTuneDropdownWrap: {
    marginTop: 12,
    gap: 8,
  },
  fineTuneDropdownTrigger: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fineTuneDropdownTriggerActive: {
    borderColor: "rgba(255,79,125,0.40)",
    backgroundColor: "rgba(255,79,125,0.06)",
  },
  fineTuneDropdownHeaderText: {
    flex: 1,
    gap: 4,
  },
  fineTuneDropdownTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  fineTuneDropdownSummary: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  fineTuneDropdownBody: {
    gap: 8,
  },
  artStylesPanel: {
    marginTop: 12,
    gap: 12,
  },
  artMasonryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  artMasonryTile: {
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  artMasonryTileWide: {
    width: "100%",
  },
  artMasonryTileActive: {
    borderColor: "rgba(255,122,176,0.82)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  artMasonryNoneTile: {
    height: 128,
    justifyContent: "flex-end",
  },
  artMasonryTextWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    gap: 4,
  },
  artMasonryGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 1,
  },
  artMasonryTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 20,
  },
  artMasonryTitleActive: {
    color: Colors.accentPale,
  },
  artMasonrySubtitle: {
    color: "rgba(255,255,255,0.70)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  artMasonrySubtitleActive: {
    color: "rgba(255,255,255,0.90)",
  },
  artStylesPanelHeader: {
    gap: 4,
  },
  artStylesPanelTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  artStylesPanelSubtitle: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  artStylesRow: {
    gap: 12,
    paddingRight: 2,
  },
  artStyleOption: {
    width: 170,
    height: 190,
    borderRadius: Colors.radiusLg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: "#09090C",
  },
  artStyleOptionEmpty: {
    backgroundColor: Colors.surfaceFaint,
    justifyContent: "flex-end",
  },
  artStyleOptionActive: {
    borderColor: "rgba(255,122,176,0.82)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  artStyleOptionImage: {
    ...StyleSheet.absoluteFillObject,
  },
  artStyleOptionOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  artStyleOptionTextWrap: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    gap: 4,
  },
  artStyleOptionTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 16,
  },
  artStyleOptionTitleActive: {
    color: Colors.accentPale,
  },
  artStyleOptionSubtitle: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  artStyleOptionSubtitleActive: {
    color: Colors.textSecondary,
  },
  pricingSection: {
    gap: 12,
    marginTop: 4,
  },
  pricingSectionTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pricingCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
  },
  pricingCardsStacked: {
    flexDirection: "column",
  },
  pricingCard: {
    flex: 1,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#000000",
    paddingHorizontal: 10,
    paddingVertical: 10,
    minHeight: 0,
    justifyContent: "space-between",
    gap: 4,
  },
  pricingCardStacked: {
    flex: 0,
    minHeight: 0,
    width: "100%",
  },
  pricingCardActive: {
    borderColor: "rgba(255,79,125,0.62)",
    backgroundColor: "rgba(255,79,125,0.16)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  pricingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pricingTopRowStacked: {
    flexWrap: "wrap",
  },
  pricingLabel: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pricingSubtitle: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  pricingBadge: {
    borderRadius: Colors.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
  },
  pricingBadgeStacked: {
    alignSelf: "flex-start",
  },
  pricingBadgeLive: {
    backgroundColor: "rgba(255,79,125,0.18)",
    borderColor: "rgba(255,79,125,0.42)",
  },
  pricingBadgeSoon: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderColor: "rgba(255,255,255,0.12)",
  },
  pricingBadgeText: {
    color: Colors.accentSoft,
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  pricingMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  pricingCredits: {
    color: Colors.accentPink,
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  pricingMetaText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  postGenerationSection: {
    gap: 12,
  },
  fineTuneIntro: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: -2,
  },
  fineTuneExplanationCard: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  fineTuneExplanationTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  fineTuneExplanationText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  fineTuneAccent: {
    color: "#FFD3DF",
    fontFamily: "Inter_700Bold",
  },
  fineTuneArtStyleNotice: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  fineTuneArtStyleNoticeTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  fineTuneArtStyleNoticeText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  customChangesPanel: {
    marginTop: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "#000000",
    padding: 14,
    gap: 12,
  },
  customChangesHeader: {
    gap: 4,
  },
  customChangesTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  customChangesSubtitle: {
    color: "rgba(255,255,255,0.68)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  customChangesHintRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  customChangesHintChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  customChangesHintChipText: {
    color: Colors.accentSoft,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "lowercase",
  },
  customChangesInput: {
    minHeight: 22,
    maxHeight: 60,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(0,229,204,0.50)",
    backgroundColor: "rgba(10,30,55,0.58)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
    shadowColor: "#00E5CC",
    shadowOpacity: 0.40,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  customChangesFootnote: {
    color: "rgba(255,255,255,0.46)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  chipDetailsActive: {
    color: Colors.accentPale,
  },
  toggle: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleActive: {
    borderColor: "rgba(255,79,125,0.50)",
  },
  toggleText: { color: "#FFF", fontFamily: "Inter_500Medium", fontSize: 12 },
  promptInput: {
    minHeight: 86,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlignVertical: "top",
  },
  generateButton: {
    marginTop: 4,
    height: 56,
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#FF4F7D",
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  generateButtonInner: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,127,177,0.72)",
    backgroundColor: "rgba(0,0,0,0.88)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
  },
  generateButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
  },
  generateButtonText: { color: "rgba(255,255,255,0.9)", fontFamily: "Inter_600SemiBold", fontSize: 16, letterSpacing: 0.3 },
  generateCostLabel: {
    textAlign: "center",
    color: "rgba(255,255,255,0.55)",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    marginTop: 6,
  },
  generateActionHint: {
    textAlign: "center",
    color: "rgba(255,255,255,0.48)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: -2,
  },
  generateBlockedHintText: {
    textAlign: "center",
    color: "#FF9CB2",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  costText: {
    marginLeft: 4,
    color: "rgba(255,255,255,0.95)",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    backgroundColor: "rgba(255,255,255,0.16)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Colors.radiusSm,
  },
  resultImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  compareSection: {
    gap: 8,
  },
  compareHeader: {
    gap: 4,
  },
  compareTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  compareSubtitle: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  compareFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: "#090909",
  },
  compareImage: {
    ...StyleSheet.absoluteFillObject,
  },
  compareOverlay: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  compareDivider: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    marginLeft: -1,
    backgroundColor: "rgba(255,255,255,0.88)",
    alignItems: "center",
    justifyContent: "center",
  },
  compareHandle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E7FDFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(9,17,20,0.12)",
  },
  compareLabelRow: {
    position: "absolute",
    left: 12,
    right: 12,
    top: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  compareLabel: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    backgroundColor: "rgba(0,0,0,0.46)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Colors.radiusFull,
  },
  resultMetaCard: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 4,
  },
  resultMetaTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  resultMetaText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  resultActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  resultActionButton: {
    minHeight: 44,
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resultActionButtonWide: {
    flexBasis: "100%",
  },
  resultActionButtonPrimary: {
    borderColor: "rgba(255,79,125,0.40)",
    backgroundColor: "rgba(255,79,125,0.08)",
  },
  resultActionButtonSecondary: {
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surfaceFaint,
  },
  downloadText: {
    color: Colors.accentLight,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flexShrink: 1,
    textAlign: "center",
  },
  editButtonText: {
    color: Colors.accentPale,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    flexShrink: 1,
    textAlign: "center",
  },
  editComposer: {
    borderRadius: Colors.radiusMd,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.20)",
    backgroundColor: "rgba(255,79,125,0.04)",
    padding: 12,
    gap: 12,
  },
  editComposerTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  editComposerSubtitle: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  resultFootnote: {
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  historyCard: {
    width: 180,
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
  },
  historyCardImage: {
    width: "100%",
    aspectRatio: 3 / 4,
  },
  historyCardBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 4,
  },
  historyCardTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  historyCardMeta: {
    color: Colors.accentLight,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  historyCardPrompt: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  historyActionRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  historyActionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: Colors.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceFaint,
  },
  historyActionText: {
    color: Colors.accentPale,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "100%",
    backgroundColor: "#0E1014",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  modalCloseButton: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.58)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScrollContent: {
    padding: 16,
    gap: 14,
  },
  modalHero: {
    height: 470,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#090B10",
  },
  modalHeroFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#06090D",
  },
  modalHeroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  modalHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  modalOwnStyleUploadCard: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#000",
    borderWidth: 1,
    borderColor: "rgba(38,244,237,0.58)",
  },
  modalOwnStyleUploadPlus: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
    borderColor: "rgba(38,244,237,0.78)",
    backgroundColor: "rgba(4,28,31,0.72)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#26F4ED",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  modalOwnStyleUploadText: {
    marginTop: 22,
    color: "#26F4ED",
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
    letterSpacing: 1.4,
    textAlign: "center",
    textTransform: "uppercase",
    textShadowColor: "rgba(38,244,237,0.66)",
    textShadowRadius: 10,
    textShadowOffset: { width: 0, height: 0 },
  },
  modalHeroTextWrap: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 20,
    gap: 6,
  },
  modalHeroEyebrow: {
    color: "rgba(227,255,252,0.84)",
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  modalTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    lineHeight: 32,
    paddingRight: 36,
  },
  modalSubtitle: {
    color: "rgba(255,255,255,0.76)",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: -2,
    marginBottom: 4,
    paddingRight: 24,
  },
  modalFavoriteButton: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.42)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
  },
  modalFavoriteButtonText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  modalSection: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 14,
    gap: 12,
  },
  modalSectionTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  modalRetouchToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  modalRetouchToggleCopy: {
    flex: 1,
    gap: 4,
  },
  modalRetouchToggleTitle: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  modalRetouchToggleSubtitle: {
    color: "rgba(255,255,255,0.62)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  modalRetouchToggleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalRetouchDrawer: {
    gap: 12,
  },
  modalRetouchDrawerEmpty: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(0,0,0,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 8,
    alignItems: "flex-start",
  },
  modalRetouchDrawerEmptyText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  editorUploadRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "stretch",
  },
  editorUploadThumb: {
    width: 120,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    minHeight: 160,
  },
  editorUploadPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  editorUploadPlaceholderText: {
    color: "rgba(255,255,255,0.72)",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  editorUploadActions: {
    flex: 1,
    gap: 8,
  },
  editorUploadButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.28)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  editorUploadButtonText: {
    color: Colors.accentPale,
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  editorInlineHint: {
    color: "rgba(255,255,255,0.54)",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  modalPromptInput: {
    minHeight: 48,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: "rgba(0,229,204,0.50)",
    backgroundColor: "rgba(10,30,55,0.58)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: "top",
    shadowColor: "#00E5CC",
    shadowOpacity: 0.40,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  modalQualityRow: {
    flexDirection: "row",
    gap: 8,
  },
  modalQualityButton: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(0,0,0,0.26)",
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 6,
  },
  modalQualityButtonActive: {
    borderColor: "rgba(255,122,176,0.72)",
    backgroundColor: "rgba(255,79,125,0.14)",
  },
  modalQualityButtonLabel: {
    color: "#FFF",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  modalQualityButtonLabelActive: {
    color: Colors.accentPale,
  },
  modalQualityButtonMeta: {
    color: "rgba(255,255,255,0.64)",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  modalQualityButtonMetaActive: {
    color: "rgba(255,255,255,0.86)",
  },
  modalImageWrap: {
    width: 290,
    height: 360,
    marginRight: 12,
    borderRadius: Colors.radiusMd,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: "#0E0E0E",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalFootnote: {
    color: Colors.textDim,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  modalApplyButton: {
    marginTop: 4,
    height: 46,
    borderRadius: Colors.radiusMd,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalApplyButtonText: {
    color: "#090909",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
