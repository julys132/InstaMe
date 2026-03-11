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
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Ionicons } from "@expo/vector-icons";
import { useCredits } from "@/contexts/CreditsContext";
import { apiClient } from "@/lib/api-client";
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
};

type TransformIntensity = "soft" | "editorial" | "dramatic";
type GenerationResultMeta = {
  model: string;
  provider?: string;
  promptOnlyMode?: boolean;
  generationTierId?: string;
};

const DEFAULT_TRANSFORM_COST = 5;
const MAX_UPLOAD_IMAGE_BASE64_LENGTH = 2_300_000;

const INTENSITY_OPTIONS: { value: TransformIntensity; label: string; subtitle: string }[] = [
  { value: "soft", label: "Soft", subtitle: "Subtle luxury refinement" },
  { value: "editorial", label: "Editorial", subtitle: "Balanced premium look" },
  { value: "dramatic", label: "Dramatic", subtitle: "Bold cinematic styling" },
];


function stripDataUriPrefix(base64OrDataUri: string): string {
  const commaIndex = base64OrDataUri.indexOf(",");
  return commaIndex >= 0 ? base64OrDataUri.slice(commaIndex + 1) : base64OrDataUri;
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

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      apiClient.getInstaMeStyleLibrary(),
      apiClient.getInstaMeStylePresets(),
      apiClient.getInstaMePricing(),
    ]).then(([styleLibraryResult, stylePresetResult, pricingResult]) => {
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

  const pickImage = useCallback(async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (pickerResult.canceled || !pickerResult.assets[0]) {
      return;
    }

    const asset = pickerResult.assets[0];
    let base64 = typeof asset.base64 === "string" ? stripDataUriPrefix(asset.base64) : "";

    if (!base64 && asset.uri?.startsWith("file://")) {
      try {
        base64 = await FileSystem.readAsStringAsync(asset.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
      } catch {
        base64 = "";
      }
    }

    if (!base64) {
      Alert.alert("Image error", "Could not read this image.");
      return;
    }

    if (base64.length > MAX_UPLOAD_IMAGE_BASE64_LENGTH) {
      Alert.alert("Image too large", "Choose a smaller image or crop this photo.");
      return;
    }

    setPhoto({
      uri: asset.uri,
      base64,
      mimeType:
        typeof asset.mimeType === "string" && asset.mimeType.startsWith("image/")
          ? asset.mimeType
          : "image/jpeg",
    });
    setResultBase64(null);
    setResultMeta(null);
    setShowEditComposer(false);
    Haptics.selectionAsync();
  }, []);

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
                      active && styles.styleCardOuterActive,
                    ]}
                  >
                    <View style={[styles.styleCard, active && styles.styleCardActive]}>
                      <Image
                        source={{ uri: preset.cover || preset.representativeImage }}
                        contentFit="cover"
                        style={styles.styleCardImage}
                      />

                      <LinearGradient
                        colors={["rgba(255,130,180,0.18)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.82)"]}
                        locations={[0, 0.34, 1]}
                        style={styles.styleCardOverlay}
                      />
                      <LinearGradient
                        colors={
                          active
                            ? ["rgba(255,96,160,0.26)", "rgba(255,96,160,0.08)", "rgba(0,0,0,0)"]
                            : ["rgba(255,96,160,0.12)", "rgba(255,96,160,0.04)", "rgba(0,0,0,0)"]
                        }
                        locations={[0, 0.35, 1]}
                        style={styles.styleCardGlow}
                      />
                      <View style={[styles.styleCardInnerRing, active && styles.styleCardInnerRingActive]} />

                      <View style={styles.styleCardTextWrap}>
                        <Text style={[styles.styleCardTitle, active && styles.styleCardTitleActive]}>
                          {preset.label}
                        </Text>

                        <Text
                          style={[styles.styleCardSubtitle, active && styles.styleCardSubtitleActive]}
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
            <View style={styles.pricingHeaderRow}>
              <Text style={styles.pricingSectionTitle}>Current pricing</Text>
              <Text style={styles.pricingSectionNote}>Download included</Text>
            </View>

            <Text style={styles.pricingGroupTitle}>Generate</Text>
            <View style={styles.pricingStack}>
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
                    <Text style={styles.pricingModelText}>
                      {tier.provider} · {tier.model}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.pricingGroupTitle}>Edit after generation</Text>
            <View style={styles.pricingStack}>
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
                    <View style={[styles.pricingBadge, styles.pricingBadgeSoon]}>
                      <Text style={styles.pricingBadgeText}>{tier.badge || "Soon"}</Text>
                    </View>
                  </View>

                  <View style={styles.pricingMetaRow}>
                    <Text style={styles.pricingCredits}>{tier.credits} credits</Text>
                    <Text style={styles.pricingMetaText}>{tier.output}</Text>
                  </View>
                  <Text style={styles.pricingModelText}>
                    {tier.provider} · {tier.model}
                  </Text>
                </Pressable>
              ))}
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
                {resultMeta?.provider || liveGenerationTier?.provider || "Provider"} · {resultMeta?.model || liveGenerationTier?.model || "Model"}
              </Text>
              <Text style={styles.resultMetaText}>
                Mode: {resultMeta?.promptOnlyMode ? "Prompt preset" : "Reference guided"} · Tier: {resultMeta?.generationTierId || selectedGenerationTierId}
              </Text>
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
                  Selected tier: {selectedEditTier?.label || "Edit"} · {selectedEditTier?.credits ?? 0} credits
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
  styleCarouselWrap: {
    position: "relative",
    marginRight: -14,
  },
  styleRow: {
    gap: 14,
    paddingLeft: 2,
    paddingRight: 74,
  },
  styleCardOuter: {
    width: 168,
    height: 208,
    borderRadius: 22,
    backgroundColor: "rgba(255,79,125,0.08)",
    padding: 1.5,
    shadowColor: "#FF4FBE",
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
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
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 16,
  },
  styleCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,180,215,0.28)",
    backgroundColor: "#101010",
    justifyContent: "flex-end",
  },
  styleCardActive: {
    borderColor: "rgba(255,132,185,0.98)",
    backgroundColor: "#121012",
  },
  styleCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardGlow: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardInnerRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,210,228,0.12)",
  },
  styleCardInnerRingActive: {
    borderColor: "rgba(255,179,210,0.42)",
  },
  styleCardTextWrap: {
    paddingHorizontal: 14,
    paddingBottom: 13,
  },
  styleCardTitle: {
    color: "#FFD9E5",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 4,
  },
  styleCardTitleActive: {
    color: "#FF8DB4",
  },
  styleCardSubtitle: {
    color: "rgba(255,255,255,0.82)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  styleCardSubtitleActive: {
    color: "#FFE1EA",
  },
  styleScrollHintWrap: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: 72,
    justifyContent: "center",
    alignItems: "flex-end",
  },
  styleScrollFade: {
    ...StyleSheet.absoluteFillObject,
  },
  styleScrollArrow: {
    marginRight: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,79,125,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,140,194,0.48)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
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
  pricingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pricingSectionTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  pricingSectionNote: {
    color: "#A9A9A9",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  pricingGroupTitle: {
    color: "#FFB8CD",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 4,
  },
  pricingStack: {
    gap: 8,
  },
  pricingCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
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
    fontSize: 14,
  },
  pricingSubtitle: {
    color: "#BEBEBE",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
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
  pricingModelText: {
    color: "#8E8E8E",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
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
