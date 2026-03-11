import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useCredits } from "@/contexts/CreditsContext";
import {
  apiClient,
  type InstaMeUploadedImage,
  type InstaMeUploadedImageAsset,
} from "@/lib/api-client";
import Colors from "@/constants/colors";
import { INSTAME_STYLE_PRESETS, type InstaMeStylePreset } from "@shared/instame-style-presets";
import {
  INSTAME_EDIT_TIERS,
  INSTAME_GENERATION_TIERS,
  type InstaMeEditTier,
  type InstaMeGenerationTier,
} from "@shared/instame-pricing";

type UploadedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
  previewBase64?: string;
  width?: number;
  height?: number;
  fileSizeBytes?: number;
  sourceImageId?: string;
  name?: string;
};

type PreparedUploadImage = {
  uri: string;
  base64: string;
  previewBase64: string;
  mimeType: string;
  width: number;
  height: number;
  fileSizeBytes: number;
};

type UploadedImageViewMode = "tiny" | "small" | "medium" | "large";

type TransformIntensity = "soft" | "editorial" | "dramatic";
type GenerationResultMeta = {
  model: string;
  provider?: string;
  promptOnlyMode?: boolean;
  generationTierId?: string;
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

const DEFAULT_TRANSFORM_COST = 5;
const MAX_STORED_UPLOADS = 10;
const MAX_LIBRARY_IMAGE_BYTES = 1_000_000;
const MAX_LIBRARY_IMAGE_DIMENSION = 1024;
const LIBRARY_PREVIEW_DIMENSION = 360;
const VIEW_MODE_OPTIONS: { value: UploadedImageViewMode; label: string }[] = [
  { value: "tiny", label: "XS" },
  { value: "small", label: "S" },
  { value: "medium", label: "M" },
  { value: "large", label: "L" },
];
const VIEW_MODE_TILE_SIZE: Record<UploadedImageViewMode, number> = {
  tiny: 72,
  small: 96,
  medium: 124,
  large: 164,
};

const INTENSITY_OPTIONS: { value: TransformIntensity; label: string; subtitle: string }[] = [
  { value: "soft", label: "Soft", subtitle: "Subtle luxury refinement" },
  { value: "editorial", label: "Editorial", subtitle: "Balanced premium look" },
  { value: "dramatic", label: "Dramatic", subtitle: "Bold cinematic styling" },
];

const STYLE_CARD_THEME_MAP: Record<string, StyleCardTheme> = {
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


function stripDataUriPrefix(base64OrDataUri: string): string {
  const commaIndex = base64OrDataUri.indexOf(",");
  return commaIndex >= 0 ? base64OrDataUri.slice(commaIndex + 1) : base64OrDataUri;
}

function estimateBase64Bytes(base64: string): number {
  const sanitized = stripDataUriPrefix(base64).replace(/\s+/g, "");
  if (!sanitized) return 0;

  const padding =
    sanitized.endsWith("==") ? 2 : sanitized.endsWith("=") ? 1 : 0;
  return Math.floor((sanitized.length * 3) / 4) - padding;
}

function buildDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${stripDataUriPrefix(base64)}`;
}

async function optimizeImageAsset(
  asset: ImagePicker.ImagePickerAsset,
  previewDimension: number = LIBRARY_PREVIEW_DIMENSION,
): Promise<PreparedUploadImage> {
  const sourceWidth = Math.max(asset.width || 0, 1);
  const sourceHeight = Math.max(asset.height || 0, 1);
  const largestSide = Math.max(sourceWidth, sourceHeight);
  const resizeAction =
    largestSide > MAX_LIBRARY_IMAGE_DIMENSION
      ? sourceWidth >= sourceHeight
        ? [{ resize: { width: MAX_LIBRARY_IMAGE_DIMENSION } }]
        : [{ resize: { height: MAX_LIBRARY_IMAGE_DIMENSION } }]
      : [];

  const compressSteps = [0.82, 0.72, 0.62, 0.52, 0.42];
  let optimizedBase64 = "";
  let optimizedUri = asset.uri;
  let optimizedWidth = sourceWidth;
  let optimizedHeight = sourceHeight;
  let optimizedBytes = asset.fileSize || 0;

  for (const compress of compressSteps) {
    const result = await manipulateAsync(asset.uri, resizeAction, {
      compress,
      format: SaveFormat.JPEG,
      base64: true,
    });
    const candidateBase64 = stripDataUriPrefix(result.base64 || "");
    const candidateBytes = estimateBase64Bytes(candidateBase64);

    optimizedBase64 = candidateBase64;
    optimizedUri = result.uri;
    optimizedWidth = result.width;
    optimizedHeight = result.height;
    optimizedBytes = candidateBytes;

    if (candidateBase64 && candidateBytes <= MAX_LIBRARY_IMAGE_BYTES) {
      break;
    }
  }

  if (!optimizedBase64) {
    throw new Error("Could not optimize this image.");
  }

  if (optimizedBytes > MAX_LIBRARY_IMAGE_BYTES) {
    throw new Error("This photo is still larger than 1MB after optimization.");
  }

  const previewResizeAction =
    Math.max(optimizedWidth, optimizedHeight) > previewDimension
      ? optimizedWidth >= optimizedHeight
        ? [{ resize: { width: previewDimension } }]
        : [{ resize: { height: previewDimension } }]
      : [];

  const previewResult = await manipulateAsync(optimizedUri, previewResizeAction, {
    compress: 0.62,
    format: SaveFormat.JPEG,
    base64: true,
  });
  const previewBase64 = stripDataUriPrefix(previewResult.base64 || optimizedBase64);

  return {
    uri: optimizedUri,
    base64: optimizedBase64,
    previewBase64,
    mimeType: "image/jpeg",
    width: optimizedWidth,
    height: optimizedHeight,
    fileSizeBytes: optimizedBytes,
  };
}

export default function InstaMeScreen() {
  const insets = useSafeAreaInsets();
  const { credits, refreshCredits } = useCredits();
  const [photo, setPhoto] = useState<UploadedPhoto | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [intensity, setIntensity] = useState<TransformIntensity>("editorial");
  const [stylePresets, setStylePresets] = useState<InstaMeStylePreset[]>(INSTAME_STYLE_PRESETS);
  const [generationTiers, setGenerationTiers] = useState<InstaMeGenerationTier[]>(INSTAME_GENERATION_TIERS);
  const [editTiers, setEditTiers] = useState<InstaMeEditTier[]>(INSTAME_EDIT_TIERS);
  const [selectedGenerationTierId, setSelectedGenerationTierId] = useState<string>(
    INSTAME_GENERATION_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_GENERATION_TIERS[0]?.id || "preview",
  );
  const [selectedEditTierId, setSelectedEditTierId] = useState<string>(
    INSTAME_EDIT_TIERS.find((tier) => tier.availability === "live")?.id || INSTAME_EDIT_TIERS[0]?.id || "basic_edit",
  );
  const [selectedStyleId, setSelectedStyleId] = useState<string>(INSTAME_STYLE_PRESETS[0]?.id || "");
  const [previewStyleId, setPreviewStyleId] = useState<string | null>(null);
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [resultMeta, setResultMeta] = useState<GenerationResultMeta | null>(null);
  const [styleReferenceCount, setStyleReferenceCount] = useState<number>(0);
  const [lastUsedStyleRefs, setLastUsedStyleRefs] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<InstaMeUploadedImage[]>([]);
  const [uploadedImagesLoading, setUploadedImagesLoading] = useState(true);
  const [libraryActionLoading, setLibraryActionLoading] = useState(false);
  const [imageViewMode, setImageViewMode] = useState<UploadedImageViewMode>("medium");
  const styleListRef = useRef<ScrollView | null>(null);
  const [canScrollMoreRight, setCanScrollMoreRight] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showEditComposer, setShowEditComposer] = useState(false);
  const [editInstruction, setEditInstruction] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  const selectedStylePreset = useMemo(
    () => stylePresets.find((preset) => preset.id === selectedStyleId) || stylePresets[0],
    [stylePresets, selectedStyleId],
  );

  const previewStyle = useMemo(
    () => stylePresets.find((preset) => preset.id === previewStyleId) || null,
    [stylePresets, previewStyleId],
  );

  const liveGenerationTier = useMemo(
    () => generationTiers.find((tier) => tier.id === selectedGenerationTierId) || generationTiers[0],
    [generationTiers, selectedGenerationTierId],
  );

  const transformCost = liveGenerationTier?.credits ?? DEFAULT_TRANSFORM_COST;

  const selectedEditTier = useMemo(
    () => editTiers.find((tier) => tier.id === selectedEditTierId) || editTiers[0],
    [editTiers, selectedEditTierId],
  );

  const selectedLibraryImageId = photo?.sourceImageId || null;
  const selectedImageTileSize = VIEW_MODE_TILE_SIZE[imageViewMode];

  const loadUploadedImages = useCallback(async () => {
    try {
      const result = await apiClient.getInstaMeUploadedImages();
      setUploadedImages(Array.isArray(result.images) ? result.images : []);
    } catch {
      setUploadedImages([]);
    } finally {
      setUploadedImagesLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      apiClient.getInstaMeStyleLibrary(),
      apiClient.getInstaMeStylePresets(),
      apiClient.getInstaMePricing(),
      apiClient.getInstaMeUploadedImages(),
    ]).then(([styleLibraryResult, stylePresetResult, pricingResult, uploadedImagesResult]) => {
        if (!mounted) return;

        if (styleLibraryResult.status === "fulfilled") {
          setStyleReferenceCount(styleLibraryResult.value.referenceCount || 0);
        } else {
          setStyleReferenceCount(0);
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
          if (pricingResult.value.liveGenerationTierId) {
            setSelectedGenerationTierId(pricingResult.value.liveGenerationTierId);
          }
        }

        if (uploadedImagesResult.status === "fulfilled") {
          setUploadedImages(Array.isArray(uploadedImagesResult.value.images) ? uploadedImagesResult.value.images : []);
        } else {
          setUploadedImages([]);
        }
        setUploadedImagesLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedStyleId && stylePresets[0]) {
      setSelectedStyleId(stylePresets[0].id);
      return;
    }

    const exists = stylePresets.some((preset) => preset.id === selectedStyleId);
    if (!exists && stylePresets[0]) {
      setSelectedStyleId(stylePresets[0].id);
    }
  }, [selectedStyleId, stylePresets]);

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

  const canGenerate = useMemo(
    () => Boolean(photo && !loading && credits >= transformCost),
    [photo, loading, credits, transformCost],
  );

  const handleStyleRowScroll = useCallback((event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const remainingRight = contentSize.width - (contentOffset.x + layoutMeasurement.width);
    setCanScrollMoreRight(remainingRight > 16);
  }, []);

  const scrollStylesRight = useCallback(() => {
    (styleListRef.current as ScrollView | null)?.scrollTo({ x: 220, animated: true });
  }, []);

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
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: undefined,
      name: asset.fileName || "Portrait",
    });
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
    await Haptics.selectionAsync();
  }, [pickRawImage]);

  const savePreparedToLibrary = useCallback(
    async (prepared: PreparedUploadImage, name?: string) => {
      if (uploadedImages.length >= MAX_STORED_UPLOADS) {
        Alert.alert("Limit reached", `You can save up to ${MAX_STORED_UPLOADS} portraits.`);
        return null;
      }

      setLibraryActionLoading(true);
      try {
        const result = await apiClient.saveInstaMeUploadedImage({
          image: {
            name: name || "Portrait",
            mimeType: prepared.mimeType,
            base64: prepared.base64,
            previewBase64: prepared.previewBase64,
            width: prepared.width,
            height: prepared.height,
            fileSizeBytes: prepared.fileSizeBytes,
          },
        });
        await loadUploadedImages();
        return result.image;
      } catch (error: any) {
        Alert.alert("Save failed", error?.message || "Could not save this portrait.");
        return null;
      } finally {
        setLibraryActionLoading(false);
      }
    },
    [loadUploadedImages, uploadedImages.length],
  );

  const handleSaveCurrentPhoto = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload a portrait before saving it.");
      return;
    }
    if (photo.sourceImageId) {
      Alert.alert("Already saved", "This portrait is already in your uploaded images.");
      return;
    }

    const saved = await savePreparedToLibrary(
      {
        uri: photo.uri,
        base64: photo.base64,
        previewBase64: photo.previewBase64 || photo.base64,
        mimeType: photo.mimeType,
        width: photo.width || MAX_LIBRARY_IMAGE_DIMENSION,
        height: photo.height || MAX_LIBRARY_IMAGE_DIMENSION,
        fileSizeBytes: photo.fileSizeBytes || estimateBase64Bytes(photo.base64),
      },
      photo.name,
    );

    if (!saved) return;

    setPhoto((prev) =>
      prev
        ? {
            ...prev,
            sourceImageId: saved.id,
            previewBase64: prev.previewBase64 || photo.previewBase64,
          }
        : prev,
    );
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [photo, savePreparedToLibrary]);

  const handleAddImageToLibrary = useCallback(async () => {
    const asset = await pickRawImage();
    if (!asset) return;

    let prepared: PreparedUploadImage;
    try {
      prepared = await optimizeImageAsset(asset);
    } catch (error: any) {
      Alert.alert("Image error", error?.message || "Could not optimize this image.");
      return;
    }

    const saved = await savePreparedToLibrary(prepared, asset.fileName || "Portrait");
    if (!saved) return;

    setPhoto({
      uri: buildDataUri(prepared.previewBase64, prepared.mimeType),
      base64: prepared.base64,
      previewBase64: prepared.previewBase64,
      mimeType: prepared.mimeType,
      width: prepared.width,
      height: prepared.height,
      fileSizeBytes: prepared.fileSizeBytes,
      sourceImageId: saved.id,
      name: saved.name,
    });
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    setEditInstruction("");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [pickRawImage, savePreparedToLibrary]);

  const handleSelectUploadedImage = useCallback(async (imageId: string) => {
    setLibraryActionLoading(true);
    try {
      const result = await apiClient.getInstaMeUploadedImage(imageId);
      const image: InstaMeUploadedImageAsset = result.image;
      setPhoto({
        uri: image.previewUri || image.dataUri,
        base64: image.base64,
        previewBase64: stripDataUriPrefix(image.previewUri || image.dataUri),
        mimeType: image.mimeType,
        width: image.width,
        height: image.height,
        fileSizeBytes: image.fileSizeBytes,
        sourceImageId: image.id,
        name: image.name,
      });
      setResultBase64(null);
      setResultMeta(null);
      setShowEditComposer(false);
      setEditInstruction("");
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert("Load failed", error?.message || "Could not load this saved portrait.");
    } finally {
      setLibraryActionLoading(false);
    }
  }, []);

  const handleDeleteUploadedImage = useCallback(async (imageId: string) => {
    setLibraryActionLoading(true);
    try {
      await apiClient.deleteInstaMeUploadedImage(imageId);
      if (photo?.sourceImageId === imageId) {
        setPhoto(null);
        setResultBase64(null);
        setResultMeta(null);
        setShowEditComposer(false);
        setEditInstruction("");
      }
      await loadUploadedImages();
      await Haptics.selectionAsync();
    } catch (error: any) {
      Alert.alert("Delete failed", error?.message || "Could not remove this saved portrait.");
    } finally {
      setLibraryActionLoading(false);
    }
  }, [loadUploadedImages, photo?.sourceImageId]);

  const handleTransform = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload one photo before transforming.");
      return;
    }
    if (credits < transformCost) {
      Alert.alert("Not enough credits", `This transform costs ${transformCost} credits.`);
      return;
    }

    setLoading(true);
    try {
      const selectedPreset = selectedStylePreset || stylePresets[0];
      const composedPrompt = [customPrompt.trim()].filter(Boolean).join(". ");

      const result = await apiClient.transformOldMoney({
        photo: { base64: photo.base64, mimeType: photo.mimeType },
        customPrompt: composedPrompt,
        intensity,
        preserveBackground,
        stylePresetId: selectedPreset?.id,
        generationTierId: selectedGenerationTierId,
      });

      setResultBase64(result.imageBase64);
      setResultMeta({
        model: result.model,
        provider: result.provider,
        promptOnlyMode: result.promptOnlyMode,
        generationTierId: result.generationTierId,
      });
      setLastUsedStyleRefs(Array.isArray(result.styleReferenceIds) ? result.styleReferenceIds : []);
      setShowEditComposer(false);
      setEditInstruction("");
      await refreshCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Transformation failed.");
    } finally {
      setLoading(false);
    }
  }, [
    photo,
    credits,
    transformCost,
    selectedStylePreset,
    stylePresets,
    customPrompt,
    intensity,
    preserveBackground,
    refreshCredits,
    selectedGenerationTierId,
  ]);

  const handleEditResult = useCallback(async () => {
    if (!resultBase64) {
      Alert.alert("Missing image", "Generate an image before editing it.");
      return;
    }
    if (!editInstruction.trim()) {
      Alert.alert("Missing edit", "Tell InstaMe what you want to change.");
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
      const result = await apiClient.editInstaMeImage({
        currentImage: { base64: resultBase64, mimeType: "image/png" },
        originalPhoto: photo ? { base64: photo.base64, mimeType: photo.mimeType } : undefined,
        editInstruction: editInstruction.trim(),
        customPrompt: customPrompt.trim(),
        editTierId: selectedEditTierId,
      });

      setResultBase64(result.imageBase64);
      setResultMeta({
        model: result.model,
        provider: result.provider,
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
    refreshCredits,
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
          dialogTitle: "Save InstaMe Result",
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
          <Text style={styles.headerEyebrow}>InstaMe</Text>
          <Text style={styles.headerTitle}>Luxury Portrait Transformer</Text>
          <View style={styles.creditBadge}>
            <Ionicons name="sparkles" size={14} color={Colors.accent} />
            <Text style={styles.creditText}>{credits} credits</Text>
          </View>
          <Text style={styles.libraryHint}>Style base: {styleReferenceCount} curated references</Text>
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
              onPress={handleSaveCurrentPhoto}
              disabled={!photo || Boolean(photo?.sourceImageId) || uploadedImages.length >= MAX_STORED_UPLOADS || libraryActionLoading}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                styles.secondaryActionButtonAccent,
                (!photo || Boolean(photo?.sourceImageId) || uploadedImages.length >= MAX_STORED_UPLOADS || libraryActionLoading) &&
                  styles.secondaryActionButtonDisabled,
                pressed && photo && !photo.sourceImageId ? { opacity: 0.9 } : undefined,
              ]}
            >
              <Ionicons name="bookmark-outline" size={16} color={Colors.accentLight} />
              <Text style={[styles.secondaryActionButtonText, styles.secondaryActionButtonTextAccent]}>
                Save current
              </Text>
            </Pressable>

            <Pressable
              onPress={handleAddImageToLibrary}
              disabled={uploadedImages.length >= MAX_STORED_UPLOADS || libraryActionLoading}
              style={({ pressed }) => [
                styles.secondaryActionButton,
                uploadedImages.length >= MAX_STORED_UPLOADS && styles.secondaryActionButtonDisabled,
                pressed && uploadedImages.length < MAX_STORED_UPLOADS ? { opacity: 0.88 } : undefined,
              ]}
            >
              <Ionicons name="images-outline" size={16} color="#FFE1EA" />
              <Text style={styles.secondaryActionButtonText}>Add to library</Text>
            </Pressable>
          </View>

          <Text style={styles.uploadMetaText}>
            Portraits saved here are automatically optimized to max 1024 x 1024 px and 1MB before generation.
          </Text>

          <View style={styles.uploadedImagesSection}>
            <View style={styles.uploadedImagesHeader}>
              <View>
                <Text style={styles.uploadedImagesTitle}>Uploaded Images</Text>
                <Text style={styles.uploadedImagesSubtitle}>
                  Tap any saved portrait to reuse it instantly.
                </Text>
              </View>
              <View style={styles.uploadedImagesHeaderRight}>
                {libraryActionLoading ? <ActivityIndicator color={Colors.accent} size="small" /> : null}
                <Text style={styles.uploadedImagesCount}>
                  {uploadedImages.length}/{MAX_STORED_UPLOADS}
                </Text>
              </View>
            </View>

            <View style={styles.viewModeRow}>
              {VIEW_MODE_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setImageViewMode(option.value)}
                  style={[
                    styles.viewModeChip,
                    imageViewMode === option.value && styles.viewModeChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.viewModeChipText,
                      imageViewMode === option.value && styles.viewModeChipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {uploadedImagesLoading ? (
              <View style={styles.uploadedImagesEmptyState}>
                <ActivityIndicator color={Colors.accent} />
                <Text style={styles.uploadedImagesEmptyTitle}>Loading saved portraits...</Text>
              </View>
            ) : uploadedImages.length === 0 ? (
              <View style={styles.uploadedImagesEmptyState}>
                <Ionicons name="images-outline" size={24} color={Colors.accent} />
                <Text style={styles.uploadedImagesEmptyTitle}>No saved portraits yet</Text>
                <Text style={styles.uploadedImagesEmptySubtitle}>
                  Save up to 10 portraits here so you do not have to browse your phone every time.
                </Text>
              </View>
            ) : (
              <View style={styles.uploadedImagesGrid}>
                {uploadedImages.map((image) => {
                  const isSelected = selectedLibraryImageId === image.id;
                  return (
                    <View
                      key={image.id}
                      style={[
                        styles.uploadedImageTileWrap,
                        {
                          width: selectedImageTileSize,
                          height: Math.round(selectedImageTileSize * 1.28),
                        },
                      ]}
                    >
                      <Pressable
                        onPress={() => handleSelectUploadedImage(image.id)}
                        style={[
                          styles.uploadedImageTile,
                          isSelected && styles.uploadedImageTileActive,
                        ]}
                      >
                        <Image source={{ uri: image.previewUri }} style={styles.uploadedImageTileImage} contentFit="cover" />
                        <LinearGradient
                          colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.18)", "rgba(0,0,0,0.84)"]}
                          locations={[0, 0.5, 1]}
                          style={styles.uploadedImageTileOverlay}
                        />
                        {isSelected ? (
                          <View style={styles.uploadedImageSelectedBadge}>
                            <Ionicons name="checkmark" size={12} color="#050505" />
                          </View>
                        ) : null}
                        <View style={styles.uploadedImageTileMeta}>
                          <Text style={styles.uploadedImageTileName} numberOfLines={1}>
                            {image.name}
                          </Text>
                          <Text style={styles.uploadedImageTileInfo}>
                            {image.width} x {image.height}
                          </Text>
                        </View>
                      </Pressable>
                      <Pressable
                        onPress={() => handleDeleteUploadedImage(image.id)}
                        style={styles.uploadedImageDeleteButton}
                      >
                        <Ionicons name="close" size={14} color="#FFF" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Choose a style</Text>
          <View style={styles.styleCarouselWrap}>
            <ScrollView
              ref={styleListRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleRow}
              onScroll={handleStyleRowScroll}
              scrollEventThrottle={16}
            >
              {stylePresets.map((preset, index) => {
                const active = selectedStyleId === preset.id;
                const isFirst = index === 0;
                const isLast = index === stylePresets.length - 1;
                const theme = getStyleCardTheme(preset.id);

                return (
                  <Pressable
                    key={preset.id}
                    onPress={() => {
                      setSelectedStyleId(preset.id);
                      setPreviewStyleId(preset.id);
                    }}
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
                      <Image
                        source={{ uri: preset.cover || preset.representativeImage }}
                        contentFit="cover"
                        style={styles.styleCardImage}
                      />

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

                        <Text
                          style={[
                            styles.styleCardSubtitle,
                            active && styles.styleCardSubtitleActive,
                          ]}
                          numberOfLines={2}
                        >
                          {preset.subtitle}
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

          <Text style={styles.selectedStyleText}>
            Selected style: <Text style={styles.selectedStyleAccent}>{selectedStylePreset?.label || "None"}</Text>
          </Text>

          <View style={styles.pricingSection}>
            <Text style={styles.pricingSectionTitle}>Generate</Text>
            <View style={styles.pricingCardsRow}>
              {generationTiers.map((tier) => {
                const isLiveTier = tier.id === liveGenerationTier?.id;
                return (
                  <Pressable
                    key={tier.id}
                    onPress={() => setSelectedGenerationTierId(tier.id)}
                    style={[
                      styles.pricingCard,
                      isLiveTier && styles.pricingCardActive,
                    ]}
                  >
                    <View style={styles.pricingTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingLabel}>{tier.label}</Text>
                        <Text style={styles.pricingSubtitle}>{tier.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.pricingBadge,
                          tier.availability === "live"
                            ? styles.pricingBadgeLive
                            : styles.pricingBadgeSoon,
                        ]}
                      >
                        <Text style={styles.pricingBadgeText}>{tier.badge || tier.availability}</Text>
                      </View>
                    </View>

                    <View style={styles.pricingMetaRow}>
                      <Text style={styles.pricingCredits}>{tier.credits} credits</Text>
                      <Text style={styles.pricingMetaText}>{tier.output}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Text style={styles.cardTitle}>3. Fine tune</Text>
          <View style={styles.intensityRow}>
            {INTENSITY_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setIntensity(option.value)}
                style={[styles.chip, intensity === option.value && styles.chipActive]}
              >
                <Text style={[styles.chipLabel, intensity === option.value && styles.chipLabelActive]}>
                  {option.label}
                </Text>
                <Text style={[styles.chipSubtitle, intensity === option.value && styles.chipSubtitleActive]}>
                  {option.subtitle}
                </Text>
              </Pressable>
            ))}
          </View>

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
            placeholder="Extra instructions (optional): pearl earrings, soft blush, sunset lighting..."
            placeholderTextColor="#7A7A7A"
            multiline
            style={styles.promptInput}
          />

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
        </View>

        {resultBase64 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>4. Your InstaMe result</Text>
            <Image
              source={{ uri: `data:image/png;base64,${resultBase64}` }}
              style={styles.resultImage}
              contentFit="cover"
            />
            <View style={styles.resultMetaCard}>
              <Text style={styles.resultMetaTitle}>Generation details</Text>
              <Text style={styles.resultMetaText}>
                Style: {selectedStylePreset?.label || "InstaMe"} - Export: {liveGenerationTier?.label || "Preview"}
              </Text>
              <Text style={styles.resultMetaText}>
                Mode: {resultMeta?.promptOnlyMode ? "Prompt preset" : "Reference guided"} - Resolution: {liveGenerationTier?.output || "512 x 512"}
              </Text>
            </View>
            <View style={styles.postGenerationSection}>
              <Text style={styles.pricingSectionTitle}>Edit after generation</Text>
              <View style={styles.pricingCardsRow}>
                {editTiers.map((tier) => (
                  <Pressable
                    key={tier.id}
                    onPress={() => setSelectedEditTierId(tier.id)}
                    style={[
                      styles.pricingCard,
                      selectedEditTier?.id === tier.id && styles.pricingCardActive,
                    ]}
                  >
                    <View style={styles.pricingTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pricingLabel}>{tier.label}</Text>
                        <Text style={styles.pricingSubtitle}>{tier.subtitle}</Text>
                      </View>
                      <View
                        style={[
                          styles.pricingBadge,
                          tier.availability === "live"
                            ? styles.pricingBadgeLive
                            : styles.pricingBadgeSoon,
                        ]}
                      >
                        <Text style={styles.pricingBadgeText}>{tier.badge || tier.availability}</Text>
                      </View>
                    </View>

                    <View style={styles.pricingMetaRow}>
                      <Text style={styles.pricingCredits}>{tier.credits} credits</Text>
                      <Text style={styles.pricingMetaText}>{tier.output}</Text>
                    </View>
                  </Pressable>
                ))}
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
            </View>
            {showEditComposer ? (
              <View style={styles.editComposer}>
                <Text style={styles.editComposerTitle}>Refine this result</Text>
                <Text style={styles.editComposerSubtitle}>
                  Selected option: {selectedEditTier?.label || "Edit"} - {selectedEditTier?.credits ?? 0} credits
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
              </View>
            ) : null}
            <Text style={styles.resultFootnote}>
              Download is free. Every edit is charged separately based on the selected tier.
            </Text>
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
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.30)",
    borderRadius: 18,
    backgroundColor: "rgba(7,7,7,0.86)",
    padding: 14,
    gap: 12,
  },
  cardTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 16 },
  uploadBox: {
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  uploadImage: { width: "100%", height: 360 },
  uploadPlaceholder: { height: 220, justifyContent: "center", alignItems: "center", paddingHorizontal: 18, gap: 8 },
  uploadPlaceholderTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  uploadPlaceholderSubtitle: { color: "#A3A3A3", fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
  uploadActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  secondaryActionButton: {
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
  uploadMetaText: {
    color: "#A8A8A8",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
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
    height: 114,
  },
  styleCardTextWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingBottom: 18,
    minHeight: 114,
    justifyContent: "flex-end",
  },
  styleCardTitle: {
    color: "#FFD9E5",
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    lineHeight: 20,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.75)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  styleCardTitleActive: {
    color: "#FFE7F0",
  },
  styleCardSubtitle: {
    color: "rgba(255,255,255,0.92)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.72)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  styleCardSubtitleActive: {
    color: "#FFFFFF",
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
  selectedStyleText: {
    color: "#D7D7D7",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  selectedStyleAccent: {
    color: "#FF9EBC",
    fontFamily: "Inter_700Bold",
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
