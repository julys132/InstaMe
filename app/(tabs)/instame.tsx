import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  InteractionManager,
  PanResponder,
  useWindowDimensions,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  type InstaMeUploadedImageAsset,
} from "@/lib/api-client";
import {
  buildDataUri,
  optimizeImageAsset,
  optimizeGeneratedBase64Image,
  type PreparedUploadImage,
} from "@/lib/instame-uploaded-images";
import Colors from "@/constants/colors";
import { INSTAME_ART_STYLES } from "@/constants/instameArtStyles";
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
  getInstaMeQualityTierSubtitle,
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
    label: "Signature Match",
    subtitle: "Closest match to your reference look",
  },
  {
    value: "creative_prompt",
    label: "Creative Freedom",
    subtitle: "More variety from the same style direction",
  },
];

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

function getStyleCardTheme(styleId: string): StyleCardTheme {
  return STYLE_CARD_THEME_MAP[styleId] || DEFAULT_STYLE_CARD_THEME;
}


export default function InstaMeScreen() {
  const params = useLocalSearchParams<{ uploadedImageId?: string | string[]; uploadedImageNonce?: string | string[] }>();
  const insets = useSafeAreaInsets();
  useWindowDimensions();
  const { user } = useAuth();
  const { credits, refreshCredits } = useCredits();
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [intensity, setIntensity] = useState<OptionalTransformIntensity>(null);
  const [showFineTunePanel, setShowFineTunePanel] = useState(false);
  const [stylePresets, setStylePresets] = useState<InstaMeStylePreset[]>(INSTAME_STYLE_PRESETS);
  const [generationTiers, setGenerationTiers] = useState<PublicInstaMeGenerationTier[]>(INSTAME_GENERATION_TIERS);
  const [editTiers, setEditTiers] = useState<PublicInstaMeEditTier[]>(INSTAME_EDIT_TIERS);
  const [portraitEnhanceTier, setPortraitEnhanceTier] = useState<PublicInstaMePortraitEnhanceTier>(
    INSTAME_PORTRAIT_ENHANCE_TIER,
  );
  const [selectedGenerationTierId, setSelectedGenerationTierId] = useState<string>(
    INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_GENERATION_TIERS[0]?.id || "high_res",
  );
  const [selectedEditTierId, setSelectedEditTierId] = useState<string>(
    INSTAME_EDIT_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_EDIT_TIERS[0]?.id || "edit",
  );
  const [selectedStyleId, setSelectedStyleId] = useState<string>(INSTAME_STYLE_PRESETS[0]?.id || "");
  const [selectedArtStyleId, setSelectedArtStyleId] = useState<string>("");
  const [previewStyleId, setPreviewStyleId] = useState<string | null>(null);
  const [ownStylePhoto, setOwnStylePhoto] = useState<UploadedPhoto | null>(null);
  const [savedOwnStyles, setSavedOwnStyles] = useState<InstaMeOwnStyle[]>([]);
  const [ownStylesLoaded, setOwnStylesLoaded] = useState(false);
  const [selectedOwnStyleId, setSelectedOwnStyleId] = useState<string | null>(null);
  const [ownStyleMode, setOwnStyleMode] = useState<OwnStyleGenerationMode>("reference_locked");
  const [ownStyleDraftReady, setOwnStyleDraftReady] = useState(false);
  const [favoriteStyleKeys, setFavoriteStyleKeys] = useState<FavoriteStyleKey[]>([]);
  const [generationHistory, setGenerationHistory] = useState<InstaMeHistoryEntry[]>([]);
  const [ownStyleNameDraft, setOwnStyleNameDraft] = useState("");
  const [renamingOwnStyle, setRenamingOwnStyle] = useState(false);
  const [savingResultAsStyle, setSavingResultAsStyle] = useState(false);
  const [compareWidth, setCompareWidth] = useState(0);
  const [compareRatio, setCompareRatio] = useState(0.5);
  const [comparisonImageUri, setComparisonImageUri] = useState<string | null>(null);
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<GenerationResultMeta | null>(null);
  const [lastUsedStyleRefs, setLastUsedStyleRefs] = useState<string[]>([]);
  const [portraitEnhanceCandidate, setPortraitEnhanceCandidate] = useState<UploadedPhoto | null>(null);
  const [portraitEnhanceLoading, setPortraitEnhanceLoading] = useState(false);
  const [usingEnhancedPortrait, setUsingEnhancedPortrait] = useState(false);
  const styleListRef = useRef<ScrollView | null>(null);
  const [canScrollMoreRight, setCanScrollMoreRight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showEditComposer, setShowEditComposer] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);

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

  const favoritePresetCards = useMemo(
    () => stylePresets.filter((preset) => favoriteStyleKeys.includes(toPresetFavoriteKey(preset.id))),
    [favoriteStyleKeys, stylePresets],
  );

  const favoriteOwnStyleCards = useMemo(
    () => savedOwnStyles.filter((style) => favoriteStyleKeys.includes(toOwnStyleFavoriteKey(style.id))),
    [favoriteStyleKeys, savedOwnStyles],
  );

  const comparePanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          if (!compareWidth) return;
          setCompareRatio(Math.min(1, Math.max(0, event.nativeEvent.locationX / compareWidth)));
        },
        onPanResponderMove: (event) => {
          if (!compareWidth) return;
          setCompareRatio(Math.min(1, Math.max(0, event.nativeEvent.locationX / compareWidth)));
        },
      }),
    [compareWidth],
  );

  const ownStylePreset = useMemo<InstaMeStylePreset>(() => ({
    id: INSTAME_OWN_STYLE_ID,
    label: "OWN STYLE",
    subtitle: "Upload a reference image with the style you want",
    qualityTier: "premium",
    promptHint: "user uploaded style reference",
    representativeImage:
      ownStylePhoto?.uri ||
      selectedSavedOwnStyle?.previewUri ||
      stylePresets[0]?.representativeImage ||
      "",
    cover:
      ownStylePhoto?.uri ||
      selectedSavedOwnStyle?.previewUri ||
      stylePresets[0]?.cover ||
      stylePresets[0]?.representativeImage ||
      "",
    examples: ownStylePhoto?.uri
      ? [ownStylePhoto.uri]
      : selectedSavedOwnStyle?.previewUri
        ? [selectedSavedOwnStyle.previewUri]
        : [],
  }), [ownStylePhoto, selectedSavedOwnStyle, stylePresets]);

  const visibleStylePresets = useMemo(
    () => [ownStylePreset, ...stylePresets.filter((preset) => preset.id !== INSTAME_OWN_STYLE_ID)],
    [ownStylePreset, stylePresets],
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

  const selectedArtStyle = useMemo(
    () => INSTAME_ART_STYLES.find((style) => style.id === selectedArtStyleId) || null,
    [selectedArtStyleId],
  );

  const liveGenerationTier = useMemo(
    () => generationTiers.find((tier) => tier.id === selectedGenerationTierId) || generationTiers[0],
    [generationTiers, selectedGenerationTierId],
  );

  const highResGenerationTier = useMemo(
    () =>
      generationTiers.find((tier) => tier.id === "high_res") ||
      INSTAME_GENERATION_TIERS.find((tier) => tier.id === "high_res") ||
      generationTiers[generationTiers.length - 1] ||
      INSTAME_GENERATION_TIERS[INSTAME_GENERATION_TIERS.length - 1],
    [generationTiers],
  );

  const activeGenerationTier = selectedArtStyle ? highResGenerationTier : liveGenerationTier;
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

  const activeGenerationQualitySubtitle = useMemo(
    () => getInstaMeQualityTierSubtitle(activeGenerationQualityTier, "generate"),
    [activeGenerationQualityTier],
  );
  const isFirstOwnStyleGeneration = isOwnStyleSelected && !selectedOwnStyleId;
  const transformBaseCost = getInstaMeCreditsForQualityTier(activeGenerationQualityTier);
  const transformCost =
    transformBaseCost +
    (isFirstOwnStyleGeneration ? INSTAME_OWN_STYLE_FIRST_USE_SURCHARGE_CREDITS : 0);
  const portraitEnhanceCost = portraitEnhanceTier?.credits ?? INSTAME_PORTRAIT_ENHANCE_TIER.credits;

  const selectedEditTier = useMemo(
    () => editTiers.find((tier) => tier.id === selectedEditTierId) || editTiers[0],
    [editTiers, selectedEditTierId],
  );

  const selectedIntensityOption = useMemo(
    () => INTENSITY_OPTIONS.find((option) => option.value === intensity) || null,
    [intensity],
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
        setPhoto({
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
        setComparisonImageUri(image.previewUri || image.dataUri);
        setPortraitEnhanceCandidate(null);
        setUsingEnhancedPortrait(image.kind === "enhanced");
        setResultBase64(null);
        setResultMeta(null);
        setShowEditComposer(false);
        setEditInstruction("");
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
  }, [uploadedImageIdParam, uploadedImageNonce]);

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

  const canGenerate = useMemo(
    () => Boolean(
      photo &&
      !loading &&
      !ownStyleNeedsActivation &&
      credits >= transformCost &&
      (!isOwnStyleSelected || ownStylePhoto || selectedOwnStyleId),
    ),
    [photo, loading, ownStyleNeedsActivation, credits, transformCost, isOwnStyleSelected, ownStylePhoto, selectedOwnStyleId],
  );

  const handleStyleRowScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const remainingRight = contentSize.width - (contentOffset.x + layoutMeasurement.width);
    setCanScrollMoreRight(remainingRight > 16);
  }, []);

  const scrollStylesRight = useCallback(() => {
    (styleListRef.current as ScrollView | null)?.scrollTo({ x: 220, animated: true });
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

    setPhoto({
      uri: prepared.uri,
      base64: prepared.base64,
      previewBase64: prepared.previewBase64,
      mimeType: prepared.mimeType,
      kind: "uploaded",
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: undefined,
      name: asset.fileName || "Portrait",
    });
    setComparisonImageUri(buildDataUri(prepared.previewBase64 || prepared.base64, prepared.mimeType));
    setPortraitEnhanceCandidate(null);
    setUsingEnhancedPortrait(false);
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
    await Haptics.selectionAsync();
  }, [pickRawImage]);

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
    const duplicateOwnStyle = savedOwnStyles.find(
      (style) => style.imageHash && style.imageHash === preparedHash,
    );

    if (duplicateOwnStyle) {
      Alert.alert(
        "Style already saved",
        `This looks like your saved style \"${duplicateOwnStyle.name}\". Reuse it instead of paying the first-time Own Style fee again?`,
        [
          {
            text: "Keep new upload",
            style: "cancel",
            onPress: () => {
              setSelectedStyleId(INSTAME_OWN_STYLE_ID);
              setIntensity(null);
              setPreviewStyleId(null);
              setOwnStylePhoto({
                uri: prepared.uri,
                base64: prepared.base64,
                previewBase64: prepared.previewBase64,
                mimeType: prepared.mimeType,
                width: prepared.width,
                height: prepared.height,
                fileSizeBytes: prepared.fileSizeBytes,
                sourceImageId: undefined,
                name: asset.fileName || "Style reference",
              });
              setSelectedOwnStyleId(null);
              setResultBase64(null);
              setResultMeta(null);
              setShowEditComposer(false);
              setEditInstruction("");
            },
          },
          {
            text: "Use saved style",
            onPress: () => {
              setSelectedStyleId(INSTAME_OWN_STYLE_ID);
              setIntensity(null);
              setPreviewStyleId(null);
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

    setOwnStylePhoto({
      uri: prepared.uri,
      base64: prepared.base64,
      previewBase64: prepared.previewBase64,
      mimeType: prepared.mimeType,
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: undefined,
      name: asset.fileName || "Style reference",
    });
    setSelectedStyleId(INSTAME_OWN_STYLE_ID);
    setIntensity(null);
    setPreviewStyleId(null);
    setSelectedOwnStyleId(null);
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
    await Haptics.selectionAsync();
  }, [pickRawImage, savedOwnStyles]);

  const handleStylePresetPress = useCallback((preset: InstaMeStylePreset) => {
    setSelectedStyleId(preset.id);

    if (preset.id === INSTAME_OWN_STYLE_ID) {
      setIntensity(null);
      setPreviewStyleId(null);

      if (!ownStylePhoto && !selectedOwnStyleId) {
        InteractionManager.runAfterInteractions(() => {
          void pickOwnStyleImage();
        });
      }
      return;
    }

    setPreviewStyleId(preset.id);
  }, [ownStylePhoto, pickOwnStyleImage, selectedOwnStyleId]);

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

  const handleSelectSavedOwnStyle = useCallback(async (style: InstaMeOwnStyle) => {
    setSelectedStyleId(INSTAME_OWN_STYLE_ID);
    setIntensity(null);
    setPreviewStyleId(null);
    setSelectedOwnStyleId(style.id);
    setOwnStylePhoto(null);
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
    await Haptics.selectionAsync();
  }, []);

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

    setShowEditComposer(Boolean(openEditComposer));
    if (openEditComposer) {
      setEditInstruction("");
    }
    await Haptics.selectionAsync();
  }, [resultMeta?.qualityLabel, resultMeta?.qualityTier, savedOwnStyles]);

  const handleSaveResultAsOwnStyle = useCallback(async () => {
    if (!resultBase64) {
      Alert.alert("Missing image", "Generate an image before saving it as a style.");
      return;
    }

    setSavingResultAsStyle(true);
    try {
      const prepared = await optimizeGeneratedBase64Image({
        base64: resultBase64,
        mimeType: "image/png",
      });
      const result = await apiClient.saveInstaMeOwnStyle({
        image: {
          name: `${selectedStylePreset?.label || "Chicoo"} Style`,
          base64: prepared.base64,
          previewBase64: prepared.previewBase64,
          mimeType: prepared.mimeType,
          width: prepared.width,
          height: prepared.height,
          fileSizeBytes: prepared.fileSizeBytes,
        },
      });
      setSavedOwnStyles((current) => {
        const rest = current.filter((style) => style.id !== result.ownStyle.id);
        return [result.ownStyle, ...rest];
      });
      setSelectedStyleId(INSTAME_OWN_STYLE_ID);
      setSelectedOwnStyleId(result.ownStyle.id);
      setOwnStylePhoto(null);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Save failed", error?.message || "Could not save this result as an Own Style.");
    } finally {
      setSavingResultAsStyle(false);
    }
  }, [resultBase64, selectedStylePreset?.label]);

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
        photo: { base64: photo.base64, mimeType: photo.mimeType },
      });

      setPortraitEnhanceCandidate({
        uri: `data:image/png;base64,${result.imageBase64}`,
        base64: result.imageBase64,
        previewBase64: result.imageBase64,
        mimeType: "image/png",
        kind: "enhanced",
        width: 1024,
        height: 1024,
        name: `${photo.name || "Portrait"} Enhanced`,
      });
      setComparisonImageUri(buildDataUri(photo.previewBase64 || photo.base64, photo.mimeType));
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: "image/png",
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

    setPhoto({
      ...optimizedEnhanced,
      sourceImageId: savedImageId || optimizedEnhanced.sourceImageId,
    });
    setPortraitEnhanceCandidate(null);
    setUsingEnhancedPortrait(true);
    await Haptics.selectionAsync();
    if (savedImageId) {
      Alert.alert("Saved", "Your enhanced portrait was saved to Enhanced Portraits for later use.");
    }
  }, [photo?.name, portraitEnhanceCandidate]);

  const handleTransform = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload one photo before transforming.");
      return;
    }
    if (ownStyleNeedsActivation) {
      Alert.alert(
        "Own Style not active",
        "You uploaded an Own Style image, but another main style is still selected. Tap 'Use this style' before generating so the app cannot fall back to another preset.",
      );
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
        photo: { base64: photo.base64, mimeType: photo.mimeType },
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

      setResultBase64(result.imageBase64);
  setComparisonImageUri(buildDataUri(photo.previewBase64 || photo.base64, photo.mimeType));
      setResultMeta({
        qualityTier: result.qualityTier,
        qualityLabel: result.qualityLabel,
        promptOnlyMode: result.promptOnlyMode,
        generationTierId: result.generationTierId,
        stylePresetId: result.stylePresetId,
      });
      if (result.savedOwnStyle) {
        setSavedOwnStyles((current) => {
          const rest = current.filter((entry) => entry.id !== result.savedOwnStyle?.id);
          return [result.savedOwnStyle, ...rest];
        });
        setSelectedOwnStyleId(result.savedOwnStyle.id);
        setOwnStylePhoto(null);
      }
      setLastUsedStyleRefs(Array.isArray(result.styleReferenceIds) ? result.styleReferenceIds : []);
      setShowEditComposer(false);
      setEditInstruction("");
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: "image/png",
        styleLabel: selectedArtStyle ? `${selectedPreset?.label || "Chicoo"} + ${selectedArtStyle.label}` : selectedPreset?.label || "Chicoo",
        stylePresetId: result.stylePresetId,
        ownStyleId: result.savedOwnStyle?.id || selectedOwnStyleId || null,
        customPrompt: composedPrompt,
        creditsCharged: result.creditsCharged || transformCost,
        source: "transform",
      });
      await refreshCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Transformation failed.");
    } finally {
      setLoading(false);
    }
  }, [
    photo,
    ownStyleNeedsActivation,
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
        currentImage: { base64: resultBase64, mimeType: "image/png" },
        originalPhoto: photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined,
        editInstruction: editInstruction.trim(),
        customPrompt: customPrompt.trim(),
        editTierId: selectedEditTierId,
      });

      setResultBase64(result.imageBase64);
      setComparisonImageUri(`data:image/png;base64,${previousResultBase64}`);
      setResultMeta({
        qualityTier: result.qualityTier,
        qualityLabel: result.qualityLabel,
      });
      await persistHistoryResult({
        imageBase64: result.imageBase64,
        mimeType: "image/png",
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
    persistHistoryResult,
    refreshCredits,
    resultMeta?.stylePresetId,
    selectedStyleId,
    selectedStylePreset?.label,
    selectedOwnStyleId,
  ]);

  const handleDownload = useCallback(async () => {
    if (!resultBase64) return;

    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${resultBase64}`;
        link.download = `instame-style-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const filePath = `${FileSystem.cacheDirectory}instame-style-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(filePath, resultBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "image/png",
          dialogTitle: "Save Chicoo Result",
        });
      } else {
        Alert.alert("Info", "Sharing is not available on this device.");
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not export this image.");
    }
  }, [resultBase64]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#050505", "#1A0E13", "#0A0A0A"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>Chicoo</Text>
          <Text style={styles.headerTitle}>Portrait Studio</Text>
          <View style={styles.creditBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.accent} />
            <Text style={styles.creditText}>{credits} credits</Text>
          </View>
          {lastUsedStyleRefs.length > 0 ? (
            <Text style={styles.libraryHintMuted}>Last transform anchors: {lastUsedStyleRefs.join(", ")}</Text>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Upload your photo</Text>
          <Pressable style={styles.uploadBox} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.uploadImage} contentFit="cover" />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={30} color={Colors.accent} />
                <Text style={styles.uploadPlaceholderTitle}>Select an image</Text>
                <Text style={styles.uploadPlaceholderSubtitle}>
                  Front-facing portrait selfies work best for identity-preserving edits.
                </Text>
              </View>
            )}
          </Pressable>

          <View style={styles.uploadActionRow}>
            <Pressable
              onPress={pickImage}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={16} color="#FFE1EA" />
              <Text style={styles.secondaryActionButtonText}>Upload from device</Text>
            </Pressable>

            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/uploaded-images",
                  params: {
                    selectedImageId: photo?.sourceImageId || "",
                  },
                })
              }
              style={({ pressed }) => [
                styles.secondaryActionButton,
                styles.secondaryActionButtonAccent,
                pressed ? { opacity: 0.9 } : undefined,
              ]}
            >
              <Ionicons name="images-outline" size={16} color={Colors.accentLight} />
              <Text style={[styles.secondaryActionButtonText, styles.secondaryActionButtonTextAccent]}>
                Uploaded Images
              </Text>
            </Pressable>
          </View>

          <View style={styles.uploadActionRow}>
            <Pressable
              onPress={() => router.push("/enhanced-portraits")}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                pressed && { opacity: 0.88 },
              ]}
            >
              <Ionicons name="sparkles-outline" size={16} color="#FFE1EA" />
              <Text style={styles.secondaryActionButtonText}>Enhanced Portraits</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={handleEnhancePortrait}
            disabled={!photo || portraitEnhanceLoading}
            style={({ pressed }) => [
              styles.enhanceButton,
              (!photo || portraitEnhanceLoading) && styles.enhanceButtonDisabled,
              pressed && photo && !portraitEnhanceLoading ? { opacity: 0.9 } : undefined,
            ]}
          >
            {portraitEnhanceLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="sparkles-outline" size={18} color="#000" />
                <Text style={styles.enhanceButtonText}>Enhance portrait (recommended)</Text>
                <Text style={styles.enhanceButtonCost}>{portraitEnhanceCost} credits</Text>
              </>
            )}
          </Pressable>
          {portraitEnhanceLoading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}

          <Text style={styles.enhanceHintText}>
            Optional but recommended. It can reduce face distortion in later styled generations, but you can also skip it or reuse a saved image from Enhanced Portraits.
          </Text>
          {usingEnhancedPortrait ? (
            <Text style={styles.enhanceSelectedText}>
              Enhanced portrait selected as your current base image.
            </Text>
          ) : null}

          {portraitEnhanceCandidate ? (
            <View style={styles.enhancePreviewCard}>
              <Text style={styles.enhancePreviewTitle}>Enhanced portrait preview</Text>
              <Text style={styles.enhancePreviewSubtitle}>
                If you like this improved version, keep it as your new base image and save it to Enhanced Portraits.
              </Text>
              <Image
                source={{ uri: portraitEnhanceCandidate.uri }}
                style={styles.enhancePreviewImage}
                contentFit="cover"
              />
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
                  <Text style={styles.enhanceRetryButtonText}>I don&apos;t like it / Try again</Text>
                </Pressable>
                <Pressable
                  onPress={handleKeepEnhancedPortrait}
                  style={({ pressed }) => [
                    styles.enhanceDecisionButton,
                    styles.enhanceKeepButton,
                    pressed ? { opacity: 0.9 } : undefined,
                  ]}
                >
                  <Text style={styles.enhanceKeepButtonText}>Yes, I like it / Keep this one</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Main Styles</Text>
          {favoritePresetCards.length > 0 || favoriteOwnStyleCards.length > 0 ? (
            <View style={styles.favoriteStylesSection}>
              <View style={styles.ownStylesLibraryHeader}>
                <Text style={styles.ownStylesLibraryTitle}>Favorite Styles</Text>
                <Text style={styles.ownStylesLibraryCount}>{favoritePresetCards.length + favoriteOwnStyleCards.length}</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ownStylesRow}>
                {favoritePresetCards.map((preset) => {
                  const theme = getStyleCardTheme(preset.id);
                  return (
                    <Pressable
                      key={`favorite-preset-${preset.id}`}
                      onPress={() => handleStylePresetPress(preset)}
                      style={[styles.savedOwnStyleCardOuter, { backgroundColor: theme.ambient, shadowColor: theme.glow }]}
                    >
                      <View style={[styles.savedOwnStyleCard, { borderColor: theme.border, backgroundColor: theme.footerBottom }]}>
                        <Image source={{ uri: preset.cover || preset.representativeImage }} contentFit="cover" style={styles.styleCardImage} />
                        <LinearGradient colors={[theme.ambient, "rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]} locations={[0, 0.22, 1]} style={styles.styleCardAtmosphere} />
                        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)", "rgba(0,0,0,0.92)"]} locations={[0, 0.4, 1]} style={styles.styleCardFooter} />
                        <View style={styles.styleCardTextWrap}>
                          <Text style={[styles.savedOwnStyleCardTitle, { color: theme.text }]}>{preset.label}</Text>
                          <Text numberOfLines={2} style={styles.savedOwnStyleCardText}>{preset.subtitle}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
                {favoriteOwnStyleCards.map((style) => {
                  const theme = getStyleCardTheme(INSTAME_OWN_STYLE_ID);
                  return (
                    <Pressable
                      key={`favorite-own-${style.id}`}
                      onPress={() => handleSelectSavedOwnStyle(style)}
                      style={[styles.savedOwnStyleCardOuter, { backgroundColor: theme.ambient, shadowColor: theme.glow }]}
                    >
                      <View style={[styles.savedOwnStyleCard, { borderColor: theme.border, backgroundColor: theme.footerBottom }]}>
                        <Image source={{ uri: style.previewUri }} contentFit="cover" style={styles.styleCardImage} />
                        <LinearGradient colors={[theme.ambient, "rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]} locations={[0, 0.22, 1]} style={styles.styleCardAtmosphere} />
                        <LinearGradient colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)", "rgba(0,0,0,0.92)"]} locations={[0, 0.4, 1]} style={styles.styleCardFooter} />
                        <View style={styles.styleCardTextWrap}>
                          <Text style={[styles.savedOwnStyleCardTitle, { color: theme.text }]}>{style.name}</Text>
                          <Text numberOfLines={2} style={styles.savedOwnStyleCardText}>{style.promptPreview}</Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
          <View style={styles.styleCarouselWrap}>
            <ScrollView
              ref={styleListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleRow}
              onScroll={handleStyleRowScroll}
              scrollEventThrottle={16}
            >
              {visibleStylePresets.map((preset, index) => {
                const active = selectedStyleId === preset.id;
                const isOwnStylePreset = preset.id === INSTAME_OWN_STYLE_ID;
                const isFirst = index === 0;
                const isLast = index === visibleStylePresets.length - 1;
                const theme = getStyleCardTheme(preset.id);

                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => handleStylePresetPress(preset)}
                    style={[
                      styles.styleCardOuter,
                      isFirst && styles.styleCardOuterFirst,
                      isLast && styles.styleCardOuterLast,
                      {
                        backgroundColor: theme.ambient,
                        shadowColor: theme.glow,
                      },
                      active && styles.styleCardOuterActive,
                      active && {
                        shadowColor: theme.glow,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.styleCard,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.footerBottom,
                        },
                        active && styles.styleCardActive,
                        active && {
                          borderColor: theme.glow,
                        },
                      ]}
                    >
                      {isOwnStylePreset && !ownStylePhoto && !selectedSavedOwnStyle ? (
                        <View style={styles.ownStyleCardPlaceholder}>
                          <Ionicons name="sparkles-outline" size={36} color={theme.text} />
                          <Text style={[styles.ownStyleCardPlaceholderText, { color: theme.text }]}>Upload a look you love</Text>
                        </View>
                      ) : (
                        <Image
                          source={{ uri: preset.cover || preset.representativeImage }}
                          contentFit="cover"
                          style={styles.styleCardImage}
                        />
                      )}

                      <LinearGradient
                        colors={
                          active
                            ? [theme.glowSoft, "rgba(0,0,0,0.10)", "rgba(0,0,0,0.58)"]
                            : [theme.ambient, "rgba(0,0,0,0.10)", "rgba(0,0,0,0.62)"]
                        }
                        locations={[0, 0.22, 1]}
                        style={styles.styleCardAtmosphere}
                      />
                      <LinearGradient
                        colors={["rgba(255,255,255,0.10)", "rgba(0,0,0,0.06)", "rgba(0,0,0,0.18)"]}
                        locations={[0, 0.14, 1]}
                        style={styles.styleCardImageWash}
                      />
                      <View
                        style={[
                          styles.styleCardInnerRing,
                          {
                            borderColor: active ? theme.border : "rgba(255,255,255,0.12)",
                          },
                          active && styles.styleCardInnerRingActive,
                        ]}
                      />
                      <LinearGradient
                        colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.74)", "rgba(0,0,0,0.92)"]}
                        locations={[0, 0.4, 1]}
                        style={styles.styleCardFooter}
                      />

                      <View style={styles.styleCardTextWrap}>
                        <Text
                          style={[
                            styles.styleCardTitle,
                            { color: theme.text },
                            active && styles.styleCardTitleActive,
                            active && { color: theme.text },
                          ]}
                        >
                          {preset.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            {canScrollMoreRight ? (
              <View pointerEvents="box-none" style={styles.styleScrollHintWrap}>
                <LinearGradient
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)", "rgba(0,0,0,0.94)"]}
                  locations={[0, 0.45, 1]}
                  style={styles.styleScrollFade}
                />

                <Pressable
                  onPress={scrollStylesRight}
                  style={({ pressed }) => [
                    styles.styleScrollArrow,
                    pressed && { transform: [{ scale: 0.96 }] },
                  ]}
                >
                  <Ionicons name="chevron-forward" size={18} color="#FFD7E3" />
                </Pressable>
              </View>
            ) : null}
          </View>

          <View style={styles.selectedStyleRow}>
            <Text style={styles.selectedStyleText}>
              Selected style: <Text style={styles.selectedStyleAccent}>{selectedStylePreset?.label || "None"}</Text>
            </Text>
            {currentFavoriteStyleKey ? (
              <Pressable onPress={() => void toggleCurrentStyleFavorite()} style={styles.favoriteStyleButton}>
                <Ionicons name={isCurrentStyleFavorite ? "heart" : "heart-outline"} size={18} color={isCurrentStyleFavorite ? "#FF7CA9" : "#FFD6E3"} />
                <Text style={styles.favoriteStyleButtonText}>{isCurrentStyleFavorite ? "Favorited" : "Favorite"}</Text>
              </Pressable>
            ) : null}
          </View>

          {isOwnStyleSelected ? (
            <View style={styles.ownStylePanel}>
              <Text style={styles.ownStylePanelTitle}>Upload your style reference</Text>
              <Text style={styles.ownStylePanelText}>
                Add one image whose styling you want to transfer. After the first successful generation, we save a compact thumbnail and the analyzed prompt so you can reuse that look instantly later.
              </Text>
              <Text style={styles.processingHintText}>
                First-time Own Style generation costs {transformCost} credits. Saved Own Styles return to {activeGenerationTier?.credits ?? DEFAULT_TRANSFORM_COST} credits.
              </Text>
              <View style={styles.uploadActionRow}>
                {OWN_STYLE_MODE_OPTIONS.map((option) => {
                  const active = ownStyleMode === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setOwnStyleMode(option.value)}
                      style={({ pressed }) => [
                        styles.secondaryActionButton,
                        active && styles.secondaryActionButtonAccent,
                        { flex: 1 },
                        pressed && { opacity: 0.88 },
                      ]}
                    >
                      <Ionicons
                        name={active ? "radio-button-on-outline" : "radio-button-off-outline"}
                        size={16}
                        color={active ? Colors.accentLight : "#FFE1EA"}
                      />
                      <Text style={[
                        styles.secondaryActionButtonText,
                        active && styles.secondaryActionButtonTextAccent,
                      ]}>
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.processingHintText}>
                {ownStyleMode === "reference_locked"
                  ? "Signature Match keeps the style reference image involved in generation for the closest result."
                  : "Creative Freedom uses only the analyzed style prompt during generation, so the result can explore more beyond the original reference image."}
              </Text>
              <Pressable onPress={pickOwnStyleImage} style={styles.ownStyleUploadBox}>
                {ownStylePhoto ? (
                  <Image source={{ uri: ownStylePhoto.uri }} style={styles.ownStyleUploadImage} contentFit="cover" />
                ) : selectedSavedOwnStyle ? (
                  <Image source={{ uri: selectedSavedOwnStyle.previewUri }} style={styles.ownStyleUploadImage} contentFit="cover" />
                ) : (
                  <View style={styles.ownStyleUploadPlaceholder}>
                    <Ionicons name="images-outline" size={28} color={Colors.accent} />
                    <Text style={styles.ownStyleUploadPlaceholderTitle}>Choose style image</Text>
                    <Text style={styles.ownStyleUploadPlaceholderText}>Use a photo with the exact pose and styling direction you want.</Text>
                  </View>
                )}
              </Pressable>
              {hasOwnStyleInput ? (
                <>
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
                  {ownStyleNeedsActivation ? (
                    <Text style={styles.processingHintText}>
                      Own Style is loaded, but another main style is still selected. Generate stays locked until you tap &quot;Use this style&quot;.
                    </Text>
                  ) : null}
                </>
              ) : null}
              {selectedSavedOwnStyle ? (
                <View style={styles.ownStyleSavedMeta}>
                  <Text style={styles.ownStyleSavedMetaTitle}>Using saved style: {selectedSavedOwnStyle.name}</Text>
                  <Text style={styles.ownStyleSavedMetaText}>{selectedSavedOwnStyle.promptPreview}</Text>
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
                <Pressable
                  onPress={pickOwnStyleImage}
                  style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }]}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color="#FFE1EA" />
                  <Text style={styles.secondaryActionButtonText}>
                    {ownStylePhoto || selectedSavedOwnStyle ? "Use another style image" : "Upload style image"}
                  </Text>
                </Pressable>
                {ownStylePhoto ? (
                  <Pressable
                    onPress={() => setOwnStylePhoto(null)}
                    style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFE1EA" />
                    <Text style={styles.secondaryActionButtonText}>Remove</Text>
                  </Pressable>
                ) : selectedSavedOwnStyle ? (
                  <Pressable
                    onPress={() => handleDeleteSavedOwnStyle(selectedSavedOwnStyle)}
                    style={({ pressed }) => [styles.secondaryActionButton, pressed && { opacity: 0.88 }]}
                  >
                    <Ionicons name="trash-outline" size={16} color="#FFE1EA" />
                    <Text style={styles.secondaryActionButtonText}>Delete saved style</Text>
                  </Pressable>
                ) : null}
              </View>

              {savedOwnStyles.length > 0 ? (
                <View style={styles.ownStylesLibrarySection}>
                  <View style={styles.ownStylesLibraryHeader}>
                    <Text style={styles.ownStylesLibraryTitle}>Your Own Styles</Text>
                    <Text style={styles.ownStylesLibraryCount}>{savedOwnStyles.length}</Text>
                  </View>
                  <Text style={styles.ownStylesLibraryText}>
                    Reuse the looks you already analyzed. Each one keeps a compact preview plus the saved styling prompt.
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.ownStylesRow}
                  >
                    {savedOwnStyles.map((style, index) => {
                      const active = selectedOwnStyleId === style.id;
                      const isFirst = index === 0;
                      const isLast = index === savedOwnStyles.length - 1;
                      const theme = getStyleCardTheme(INSTAME_OWN_STYLE_ID);

                      return (
                        <Pressable
                          key={style.id}
                          onPress={() => handleSelectSavedOwnStyle(style)}
                          style={[
                            styles.savedOwnStyleCardOuter,
                            isFirst && styles.styleCardOuterFirst,
                            isLast && styles.styleCardOuterLast,
                            { backgroundColor: theme.ambient, shadowColor: theme.glow },
                            active && styles.styleCardOuterActive,
                          ]}
                        >
                          <View
                            style={[
                              styles.savedOwnStyleCard,
                              { borderColor: active ? theme.glow : theme.border, backgroundColor: theme.footerBottom },
                            ]}
                          >
                            <Image source={{ uri: style.previewUri }} contentFit="cover" style={styles.styleCardImage} />
                            <LinearGradient
                              colors={active
                                ? [theme.glowSoft, "rgba(0,0,0,0.08)", "rgba(0,0,0,0.66)"]
                                : [theme.ambient, "rgba(0,0,0,0.08)", "rgba(0,0,0,0.72)"]}
                              locations={[0, 0.22, 1]}
                              style={styles.styleCardAtmosphere}
                            />
                            <LinearGradient
                              colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.72)", "rgba(0,0,0,0.92)"]}
                              locations={[0, 0.4, 1]}
                              style={styles.styleCardFooter}
                            />
                            <View style={styles.styleCardTextWrap}>
                              <Text style={[styles.savedOwnStyleCardTitle, { color: theme.text }]}>{style.name}</Text>
                              <Text numberOfLines={2} style={styles.savedOwnStyleCardText}>{style.promptPreview}</Text>
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.fineTuneDropdownWrap}>
            <Pressable
              onPress={() => setShowFineTunePanel((prev) => !prev)}
              style={[
                styles.fineTuneDropdownTrigger,
                showFineTunePanel && styles.fineTuneDropdownTriggerActive,
              ]}
            >
              <View style={styles.fineTuneDropdownHeaderText}>
                <Text style={styles.fineTuneDropdownTitle}>Fine tune (optional)</Text>
                <Text style={styles.fineTuneDropdownSummary}>
                  {selectedArtStyle
                    ? "Art Styles take priority. You can still keep the background and add notes here."
                    : isOwnStyleSelected
                      ? "Own Style uses your uploaded or saved reference. You can still keep the background and add notes here."
                    : selectedIntensityOption
                      ? `${selectedIntensityOption.label}: ${selectedIntensityOption.subtitle}`
                      : "No extra fine tune selected."}
                </Text>
              </View>
              <Ionicons
                name={showFineTunePanel ? "chevron-up" : "chevron-down"}
                size={18}
                color={showFineTunePanel ? Colors.accentLight : "#D7D7D7"}
              />
            </Pressable>

            {showFineTunePanel ? (
              <View style={styles.fineTuneDropdownBody}>
                <Text style={styles.fineTuneIntro}>
                  Your selected style sets the main look. Fine tune only adjusts how strongly that style is applied.
                </Text>
                <View style={styles.fineTuneExplanationCard}>
                  <Text style={styles.fineTuneExplanationTitle}>What it changes</Text>
                  <Text style={styles.fineTuneExplanationText}>
                    It can change lighting strength, contrast, mood, styling polish, and overall cinematic impact.
                  </Text>
                  <Text style={styles.fineTuneExplanationText}>
                    It does not replace your selected style. If you choose{" "}
                    <Text style={styles.fineTuneAccent}>{selectedStylePreset?.label || "a style"}</Text>, the result stays in
                    that style family.
                  </Text>
                </View>

                {!selectedArtStyle && !isOwnStyleSelected ? (
                  <>
                    <Pressable
                      onPress={() => {
                        setIntensity(null);
                        setShowFineTunePanel(false);
                      }}
                      style={[styles.fineTuneSkipCard, intensity === null && styles.fineTuneSkipCardActive]}
                    >
                      <View style={styles.fineTuneSkipTopRow}>
                        <Text
                          style={[styles.fineTuneSkipTitle, intensity === null && styles.fineTuneSkipTitleActive]}
                        >
                          No extra fine tune
                        </Text>
                        {intensity === null ? (
                          <Ionicons name="checkmark-circle" size={18} color={Colors.accent} />
                        ) : null}
                      </View>
                      <Text
                        style={[styles.fineTuneSkipText, intensity === null && styles.fineTuneSkipTextActive]}
                      >
                        Use the selected style as-is, with standard balanced styling.
                      </Text>
                    </Pressable>
                    <View style={styles.intensityRow}>
                      {INTENSITY_OPTIONS.map((option) => (
                        <Pressable
                          key={option.value}
                          onPress={() => {
                            setIntensity(option.value);
                            setShowFineTunePanel(false);
                          }}
                          style={[styles.chip, intensity === option.value && styles.chipActive]}
                        >
                          <Text
                            style={[styles.chipLabel, intensity === option.value && styles.chipLabelActive]}
                          >
                            {option.label}
                          </Text>
                          <Text
                            style={[styles.chipSubtitle, intensity === option.value && styles.chipSubtitleActive]}
                          >
                            {option.subtitle}
                          </Text>
                          <Text
                            style={[styles.chipDetails, intensity === option.value && styles.chipDetailsActive]}
                          >
                            {option.details}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </>
                ) : isOwnStyleSelected ? (
                  <View style={styles.fineTuneArtStyleNotice}>
                    <Text style={styles.fineTuneArtStyleNoticeTitle}>Own Style selected</Text>
                    <Text style={styles.fineTuneArtStyleNoticeText}>
                      Your uploaded or saved Own Style drives the look here. You can still preserve the background and add custom notes below.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.fineTuneArtStyleNotice}>
                    <Text style={styles.fineTuneArtStyleNoticeTitle}>Art Style selected</Text>
                    <Text style={styles.fineTuneArtStyleNoticeText}>
                      Fine tune strength is skipped while an Art Style is active. Background and notes still apply.
                    </Text>
                  </View>
                )}

                <Pressable
                  onPress={() => setPreserveBackground((prev) => !prev)}
                  style={[styles.toggle, preserveBackground && styles.toggleActive]}
                >
                  <Ionicons
                    name={preserveBackground ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={preserveBackground ? Colors.accent : "#8E8E8E"}
                  />
                  <Text style={styles.toggleText}>Keep original background</Text>
                </Pressable>

                <TextInput
                  value={customPrompt}
                  onChangeText={setCustomPrompt}
                  placeholder="Extra notes (optional): colder shadows, softer makeup, stronger grain, pearl earrings..."
                  placeholderTextColor="#7A7A7A"
                  multiline
                  style={styles.promptInput}
                />
              </View>
            ) : null}
          </View>

          <View style={styles.artStylesPanel}>
            <View style={styles.artStylesPanelHeader}>
              <Text style={styles.artStylesPanelTitle}>Art Styles</Text>
              <Text style={styles.artStylesPanelSubtitle}>
                Optional. Art styles export in High Res and override fine tune strength while active.
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.artStylesRow}
            >
              <Pressable
                onPress={() => setSelectedArtStyleId("")}
                style={[
                  styles.artStyleOption,
                  styles.artStyleOptionEmpty,
                  !selectedArtStyleId && styles.artStyleOptionActive,
                ]}
              >
                <View style={styles.artStyleOptionTextWrap}>
                  <Text style={[styles.artStyleOptionTitle, !selectedArtStyleId && styles.artStyleOptionTitleActive]}>
                    No art style
                  </Text>
                  <Text
                    style={[
                      styles.artStyleOptionSubtitle,
                      !selectedArtStyleId && styles.artStyleOptionSubtitleActive,
                    ]}
                  >
                    Keep the result fully photographic.
                  </Text>
                </View>
              </Pressable>

              {INSTAME_ART_STYLES.map((style) => {
                const active = selectedArtStyleId === style.id;
                return (
                  <Pressable
                    key={style.id}
                    onPress={() => setSelectedArtStyleId(style.id)}
                    style={[styles.artStyleOption, active && styles.artStyleOptionActive]}
                  >
                    <Image source={style.preview} style={styles.artStyleOptionImage} contentFit="cover" />
                    <LinearGradient
                      colors={["rgba(255,255,255,0.05)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.88)"]}
                      style={styles.artStyleOptionOverlay}
                    />
                    <View style={styles.artStyleOptionTextWrap}>
                      <Text style={[styles.artStyleOptionTitle, active && styles.artStyleOptionTitleActive]}>
                        {style.label}
                      </Text>
                      <Text
                        style={[
                          styles.artStyleOptionSubtitle,
                          active && styles.artStyleOptionSubtitleActive,
                        ]}
                      >
                        {style.subtitle}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.selectedStyleText}>
              Art finish: <Text style={styles.selectedStyleAccent}>{selectedArtStyle?.label || "None"}</Text>
            </Text>
          </View>

          <View style={styles.pricingSection}>
            <Text style={styles.pricingSectionTitle}>Generate</Text>
            {selectedArtStyle ? (
              <>
                <Text style={styles.selectedStyleText}>
                  Art Styles automatically use{" "}
                  <Text style={styles.selectedStyleAccent}>{activeGenerationQualityLabel}</Text>
                  {" "}quality for the final export.
                </Text>
                <View style={styles.pricingCardsRow}>
                  <View style={[styles.pricingCard, styles.pricingCardActive]}>
                    <View style={styles.pricingTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingLabel}>{activeGenerationQualityLabel}</Text>
                        <Text style={styles.pricingSubtitle}>
                          {activeGenerationQualitySubtitle}
                        </Text>
                      </View>
                      <View style={[styles.pricingBadge, styles.pricingBadgeLive]}>
                        <Text style={styles.pricingBadgeText}>
                          {highResGenerationTier?.badge || "Auto"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.pricingMetaRow}>
                      <Text style={styles.pricingCredits}>
                        {transformCost} credits
                      </Text>
                      <Text style={styles.pricingMetaText}>
                        {highResGenerationTier?.output || "1024 x 1024"}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.selectedStyleText}>
                  Your selected style automatically uses{" "}
                  <Text style={styles.selectedStyleAccent}>{activeGenerationQualityLabel}</Text>
                  {" "}quality.
                </Text>
                <View style={styles.pricingCardsRow}>
                  <View style={[styles.pricingCard, styles.pricingCardActive]}>
                    <View style={styles.pricingTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingLabel}>{activeGenerationQualityLabel}</Text>
                        <Text style={styles.pricingSubtitle}>{activeGenerationQualitySubtitle}</Text>
                      </View>
                      <View style={[styles.pricingBadge, styles.pricingBadgeLive]}>
                        <Text style={styles.pricingBadgeText}>{liveGenerationTier?.badge || "Auto"}</Text>
                      </View>
                    </View>

                    <View style={styles.pricingMetaRow}>
                      <Text style={styles.pricingCredits}>{transformCost} credits</Text>
                      <Text style={styles.pricingMetaText}>{activeGenerationTier?.output || "1024 x 1024"}</Text>
                    </View>
                  </View>
                </View>
              </>
            )}
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
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="sparkles" size={18} color="#000" />
                <Text style={styles.generateButtonText}>Transform now</Text>
                <Text style={styles.costText}>{transformCost} credits</Text>
              </>
            )}
          </Pressable>
          {loading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
        </View>

        {resultBase64 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{selectedArtStyle ? "3. Your Chicoo result" : "4. Your Chicoo result"}</Text>
            {comparisonImageUri ? (
              <View style={styles.compareSection}>
                <View style={styles.compareHeader}>
                  <Text style={styles.compareTitle}>Before / After</Text>
                  <Text style={styles.compareSubtitle}>Drag the divider to compare your original photo with the generated result.</Text>
                </View>
                <View
                  style={styles.compareFrame}
                  onLayout={(event) => setCompareWidth(event.nativeEvent.layout.width)}
                  {...comparePanResponder.panHandlers}
                >
                  <Image source={{ uri: `data:image/png;base64,${resultBase64}` }} style={styles.compareImage} contentFit="cover" />
                  <View style={[styles.compareOverlay, { width: Math.max(0, compareWidth * compareRatio) }]}>
                    <Image
                      source={{ uri: comparisonImageUri }}
                      style={[styles.compareImage, compareWidth ? { width: compareWidth } : null]}
                      contentFit="cover"
                    />
                  </View>
                  <View style={[styles.compareDivider, { left: `${compareRatio * 100}%` }]}>
                    <View style={styles.compareHandle}>
                      <Ionicons name="swap-horizontal" size={16} color="#091114" />
                    </View>
                  </View>
                  <View style={styles.compareLabelRow}>
                    <Text style={styles.compareLabel}>Before</Text>
                    <Text style={styles.compareLabel}>After</Text>
                  </View>
                </View>
              </View>
            ) : null}
            <Image
              source={{ uri: `data:image/png;base64,${resultBase64}` }}
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
                Mode: {resultMeta?.stylePresetId === INSTAME_OWN_STYLE_ID ? "Own Style" : resultMeta?.promptOnlyMode ? "Prompt preset" : "Reference guided"} - Resolution: {activeGenerationTier?.output || "1024 x 1024"}
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
                <Text style={styles.downloadText}>Download</Text>
              </Pressable>
              <Pressable
                style={[styles.resultActionButton, styles.resultActionButtonSecondary]}
                onPress={() => setShowEditComposer((prev) => !prev)}
              >
                <Ionicons name="create-outline" size={18} color="#FFD6E3" />
                <Text style={styles.editButtonText}>Edit</Text>
              </Pressable>
              <Pressable
                style={[styles.resultActionButton, styles.resultActionButtonSecondary]}
                onPress={() => void handleSaveResultAsOwnStyle()}
                disabled={savingResultAsStyle}
              >
                <Ionicons name="bookmark-outline" size={18} color="#FFD6E3" />
                <Text style={styles.editButtonText}>{savingResultAsStyle ? "Saving..." : "Save as style"}</Text>
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
                    <ActivityIndicator color="#000" />
                  ) : (
                    <>
                      <Ionicons name="create-outline" size={18} color="#000" />
                      <Text style={styles.generateButtonText}>Apply edit</Text>
                      <Text style={styles.costText}>{selectedEditTier?.credits ?? 0} credits</Text>
                    </>
                  )}
                </Pressable>
                {editLoading ? <Text style={styles.processingHintText}>{GENERATION_WAIT_MESSAGE}</Text> : null}
              </View>
            ) : null}
            <Text style={styles.resultFootnote}>
              Download is free. Every edit is charged separately.
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

      <Modal
        animationType="fade"
        transparent
        visible={Boolean(previewStyle)}
        onRequestClose={() => setPreviewStyleId(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Pressable style={styles.modalCloseButton} onPress={() => setPreviewStyleId(null)}>
              <Ionicons name="close" size={20} color="#FFF" />
            </Pressable>
            <Text style={styles.modalTitle}>{previewStyle?.label}</Text>
            <Text style={styles.modalSubtitle}>{previewStyle?.subtitle}</Text>
            <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
              {(previewStyle?.examples || []).map((imageUri, index) => (
                <View key={`${previewStyle?.id || "style"}-${index}`} style={styles.modalImageWrap}>
                  <Image source={{ uri: imageUri }} style={styles.modalImage} contentFit="cover" />
                </View>
              ))}
            </ScrollView>
            <Text style={styles.modalFootnote}>Swipe to view more examples.</Text>
            <Pressable style={styles.modalApplyButton} onPress={() => setPreviewStyleId(null)}>
              <Text style={styles.modalApplyButtonText}>Use this style</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 20, gap: 6, marginBottom: 12 },
  headerEyebrow: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    fontSize: 12,
  },
  headerTitle: { color: "#FFF", fontFamily: "PlayfairDisplay_700Bold", fontSize: 30, lineHeight: 34 },
  creditBadge: {
    marginTop: 2,
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    backgroundColor: "rgba(255,79,125,0.20)",
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.42)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  creditText: { color: "#FFD8E4", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  libraryHint: { color: "#CFCFCF", fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  libraryHintMuted: { color: "#8B8B8B", fontFamily: "Inter_400Regular", fontSize: 11 },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.30)",
    borderRadius: 18,
    backgroundColor: "rgba(7,7,7,0.86)",
    padding: 12,
    gap: 10,
  },
  cardTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  uploadBox: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  uploadImage: { width: "100%", height: 250 },
  uploadPlaceholder: { height: 160, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, gap: 8 },
  uploadPlaceholderTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  uploadPlaceholderSubtitle: { color: "#A3A3A3", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  uploadActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  enhanceButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  enhanceButtonDisabled: {
    opacity: 0.55,
  },
  enhanceButtonText: {
    color: "#000",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  enhanceButtonCost: {
    color: "#111",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  enhanceHintText: {
    color: "#A8A0A6",
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
    marginTop: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.24)",
    backgroundColor: "rgba(255,79,125,0.06)",
    padding: 12,
    gap: 10,
  },
  enhancePreviewTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  enhancePreviewSubtitle: {
    color: "#C9C0C6",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  enhancePreviewImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  enhanceDecisionRow: {
    flexDirection: "row",
    gap: 10,
  },
  enhanceDecisionButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  enhanceRetryButton: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  enhanceKeepButton: {
    backgroundColor: Colors.accent,
  },
  enhanceRetryButtonText: {
    color: "#F5E7EC",
    fontFamily: "Inter_500Medium",
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  secondaryActionButtonAccent: {
    borderColor: "rgba(255,79,125,0.35)",
    backgroundColor: "rgba(255,79,125,0.08)",
  },
  secondaryActionButtonDisabled: {
    opacity: 0.45,
  },
  secondaryActionButtonText: {
    color: "#FFE1EA",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  secondaryActionButtonTextAccent: {
    color: Colors.accentLight,
  },
  ownStylePanel: {
    marginTop: 8,
    gap: 10,
  },
  ownStylePanelTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ownStylePanelText: {
    color: "#BFBFBF",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  processingHintText: {
    color: "#9FB0B6",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  ownStyleUploadBox: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.28)",
    backgroundColor: "rgba(134,244,255,0.08)",
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
    paddingHorizontal: 20,
    gap: 8,
  },
  ownStyleUploadPlaceholderTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  ownStyleUploadPlaceholderText: {
    color: "#A9BCC2",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  ownStyleSavedMeta: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.18)",
    backgroundColor: "rgba(134,244,255,0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 6,
  },
  ownStyleSavedMetaTitle: {
    color: "#E7FDFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  ownStyleSavedMetaText: {
    color: "#A9C4CB",
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(134,244,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.03)",
    color: "#FFF",
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    paddingHorizontal: 12,
  },
  renameOwnStyleButton: {
    minWidth: 92,
    minHeight: 42,
    borderRadius: 10,
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
    gap: 10,
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
    color: "#B7C9CE",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  ownStylesRow: {
    gap: 14,
    paddingLeft: 2,
    paddingRight: 10,
  },
  savedOwnStyleCardOuter: {
    width: 156,
    height: 198,
    borderRadius: 24,
    backgroundColor: "rgba(134,244,255,0.08)",
    padding: 1,
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  savedOwnStyleCard: {
    flex: 1,
    borderRadius: 23,
    overflow: "hidden",
    borderWidth: 1,
  },
  savedOwnStyleCardTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  savedOwnStyleCardText: {
    color: "#D8E7EA",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  uploadedImagesSection: {
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.025)",
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
    fontSize: 15,
  },
  uploadedImagesSubtitle: {
    color: "#AFAFAF",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  uploadedImagesCount: {
    color: "#FFB6CC",
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
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  viewModeChipActive: {
    borderColor: "rgba(255,79,125,0.64)",
    backgroundColor: "rgba(255,79,125,0.14)",
  },
  viewModeChipText: {
    color: "#D4D4D4",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  viewModeChipTextActive: {
    color: "#FFE1EA",
  },
  uploadedImagesEmptyState: {
    minHeight: 124,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 18,
  },
  uploadedImagesEmptyTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    textAlign: "center",
  },
  uploadedImagesEmptySubtitle: {
    color: "#9B9B9B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  uploadedImagesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  uploadedImageTileWrap: {
    position: "relative",
  },
  uploadedImageTile: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    color: "#D5D5D5",
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
    marginRight: -14,
  },
  styleRow: {
    gap: 18,
    paddingLeft: 2,
    paddingRight: 86,
  },
  styleCardOuter: {
    width: 198,
    height: 246,
    borderRadius: 30,
    backgroundColor: "rgba(255,79,125,0.06)",
    padding: 2,
    shadowColor: "#FF4FBE",
    shadowOpacity: 0.32,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 14,
  },
  styleCardOuterFirst: {
    marginLeft: 2,
  },
  styleCardOuterLast: {
    marginRight: 2,
  },
  styleCardOuterActive: {
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.7,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 16 },
    elevation: 20,
  },
  styleCard: {
    flex: 1,
    borderRadius: 28,
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
    paddingHorizontal: 20,
    gap: 10,
    backgroundColor: "rgba(134,244,255,0.10)",
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
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "rgba(255,210,228,0.16)",
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
    paddingHorizontal: 18,
    paddingBottom: 18,
    minHeight: 92,
    justifyContent: "flex-end",
  },
  styleCardTitle: {
    color: "#FFD9E5",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 20,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  styleCardTitleActive: {
    color: "#FFE7F0",
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
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,79,125,0.22)",
    borderWidth: 1,
    borderColor: "rgba(255,173,212,0.58)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.48,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  favoriteStylesSection: {
    gap: 10,
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
    color: "#D7D7D7",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },
  selectedStyleAccent: {
    color: "#FF9EBC",
    fontFamily: "Inter_700Bold",
  },
  favoriteStyleButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  favoriteStyleButtonText: {
    color: "#FFD6E3",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  fineTuneDropdownWrap: {
    marginTop: 10,
    gap: 8,
  },
  fineTuneDropdownTrigger: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fineTuneDropdownTriggerActive: {
    borderColor: "rgba(255,79,125,0.54)",
    backgroundColor: "rgba(255,79,125,0.08)",
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
    color: "#C5C5C5",
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    lineHeight: 18,
  },
  fineTuneDropdownBody: {
    gap: 8,
  },
  artStylesPanel: {
    marginTop: 10,
    gap: 10,
  },
  artStylesPanelHeader: {
    gap: 4,
  },
  artStylesPanelTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  artStylesPanelSubtitle: {
    color: "#C8C8C8",
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    lineHeight: 18,
  },
  artStylesRow: {
    gap: 12,
    paddingRight: 2,
  },
  artStyleOption: {
    width: 180,
    height: 200,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "#09090C",
  },
  artStyleOptionEmpty: {
    backgroundColor: "rgba(255,255,255,0.035)",
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
    left: 14,
    right: 14,
    bottom: 14,
    gap: 4,
  },
  artStyleOptionTitle: {
    color: "#F3EDF0",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13.5,
    lineHeight: 18,
  },
  artStyleOptionTitleActive: {
    color: "#FFF2F7",
  },
  artStyleOptionSubtitle: {
    color: "#C2BAC0",
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 16,
  },
  artStyleOptionSubtitleActive: {
    color: "#E5D3DB",
  },
  pricingSection: {
    gap: 10,
    marginTop: 4,
  },
  pricingSectionTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  pricingCardsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
  },
  pricingCardsStacked: {
    flexDirection: "column",
  },
  pricingCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 132,
    justifyContent: "space-between",
    gap: 12,
  },
  pricingCardStacked: {
    flex: 0,
    minHeight: 0,
    width: "100%",
  },
  pricingCardActive: {
    borderColor: "rgba(255,79,125,0.62)",
    backgroundColor: "rgba(255,79,125,0.10)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
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
    fontSize: 15,
  },
  pricingSubtitle: {
    color: "#BEBEBE",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2,
  },
  pricingBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
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
    color: "#FFD8E4",
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
    color: "#FF9EBC",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  pricingMetaText: {
    color: "#D2D2D2",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  postGenerationSection: {
    gap: 10,
  },
  fineTuneIntro: {
    color: "#C9C9C9",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: -2,
  },
  fineTuneExplanationCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  fineTuneExplanationTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  fineTuneExplanationText: {
    color: "#BDBDBD",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  fineTuneAccent: {
    color: "#FFD3DF",
    fontFamily: "Inter_700Bold",
  },
  fineTuneArtStyleNotice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.035)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  fineTuneArtStyleNoticeTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  fineTuneArtStyleNoticeText: {
    color: "#C2C2C2",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  fineTuneSkipCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 6,
  },
  fineTuneSkipCardActive: {
    borderColor: "rgba(255,79,125,0.66)",
    backgroundColor: "rgba(255,79,125,0.16)",
  },
  fineTuneSkipTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  fineTuneSkipTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  fineTuneSkipTitleActive: {
    color: Colors.accentLight,
  },
  fineTuneSkipText: {
    color: "#9A9A9A",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  fineTuneSkipTextActive: {
    color: "#FFD3DF",
  },
  intensityRow: { gap: 8 },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 2,
  },
  chipActive: {
    borderColor: "rgba(255,79,125,0.70)",
    backgroundColor: "rgba(255,79,125,0.20)",
  },
  chipLabel: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  chipLabelActive: { color: Colors.accentLight },
  chipSubtitle: { color: "#8D8D8D", fontFamily: "Inter_400Regular", fontSize: 12 },
  chipSubtitleActive: { color: "#FFD3DF" },
  chipDetails: {
    color: "#9B9B9B",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
    marginTop: 2,
  },
  chipDetailsActive: {
    color: "#FFE2EA",
  },
  toggle: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleActive: {
    borderColor: "rgba(255,79,125,0.62)",
  },
  toggleText: { color: "#FFF", fontFamily: "Inter_500Medium", fontSize: 13 },
  promptInput: {
    minHeight: 86,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#FFF",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlignVertical: "top",
  },
  generateButton: {
    marginTop: 2,
    height: 52,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  generateButtonDisabled: {
    opacity: 0.5,
  },
  generateButtonText: { color: "#000", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  costText: {
    marginLeft: 4,
    color: "#111",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    backgroundColor: "rgba(0,0,0,0.12)",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  resultImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
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
    color: "#C9C9C9",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  compareFrame: {
    position: "relative",
    width: "100%",
    aspectRatio: 1,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
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
    paddingVertical: 5,
    borderRadius: 999,
  },
  resultMetaCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 4,
  },
  resultMetaTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  resultMetaText: {
    color: "#C7C7C7",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  resultActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  resultActionButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    flex: 1,
  },
  resultActionButtonPrimary: {
    borderColor: "rgba(255,79,125,0.55)",
    backgroundColor: "rgba(255,79,125,0.10)",
  },
  resultActionButtonSecondary: {
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  downloadText: { color: Colors.accentLight, fontFamily: "Inter_600SemiBold", fontSize: 14 },
  editButtonText: {
    color: "#FFE1EA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  editComposer: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.28)",
    backgroundColor: "rgba(255,79,125,0.06)",
    padding: 12,
    gap: 10,
  },
  editComposerTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  editComposerSubtitle: {
    color: "#C7C7C7",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
  },
  resultFootnote: {
    color: "#8F8F8F",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  historyCard: {
    width: 220,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  historyCardImage: {
    width: "100%",
    aspectRatio: 1,
  },
  historyCardBody: {
    paddingHorizontal: 12,
    paddingTop: 12,
    gap: 4,
  },
  historyCardTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  historyCardMeta: {
    color: "#FFB1C9",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  historyCardPrompt: {
    color: "#C5C5C5",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    minHeight: 34,
  },
  historyActionRow: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  historyActionButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  historyActionText: {
    color: "#FFE1EA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#111111",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.35)",
    padding: 14,
    gap: 10,
  },
  modalCloseButton: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 5,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 18,
    paddingRight: 36,
  },
  modalSubtitle: {
    color: "#BFBFBF",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    marginTop: -2,
    marginBottom: 4,
    paddingRight: 24,
  },
  modalImageWrap: {
    width: 290,
    height: 360,
    marginRight: 10,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#0E0E0E",
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalFootnote: {
    color: "#8A8A8A",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    textAlign: "center",
  },
  modalApplyButton: {
    marginTop: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  modalApplyButtonText: {
    color: "#090909",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
});
