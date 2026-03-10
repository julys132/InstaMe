import { useCallback, useEffect, useMemo, useState } from "react";
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

type UploadedPhoto = {
  uri: string;
  base64: string;
  mimeType: string;
};

type TransformIntensity = "soft" | "editorial" | "dramatic";

const TRANSFORM_COST = 5;
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
  const [selectedStyleId, setSelectedStyleId] = useState<string>(INSTAME_STYLE_PRESETS[0]?.id || "");
  const [previewStyleId, setPreviewStyleId] = useState<string | null>(null);
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [styleReferenceCount, setStyleReferenceCount] = useState<number>(0);
  const [lastUsedStyleRefs, setLastUsedStyleRefs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedStylePreset = useMemo(
    () => stylePresets.find((preset) => preset.id === selectedStyleId) || stylePresets[0],
    [stylePresets, selectedStyleId],
  );

  const previewStyle = useMemo(
    () => stylePresets.find((preset) => preset.id === previewStyleId) || null,
    [stylePresets, previewStyleId],
  );

  useEffect(() => {
    let mounted = true;

    Promise.allSettled([apiClient.getInstaMeStyleLibrary(), apiClient.getInstaMeStylePresets()]).then(
      ([styleLibraryResult, stylePresetResult]) => {
        if (!mounted) return;

        if (styleLibraryResult.status === "fulfilled") {
          setStyleReferenceCount(styleLibraryResult.value.referenceCount || 0);
        } else {
          setStyleReferenceCount(0);
        }

        if (stylePresetResult.status === "fulfilled" && stylePresetResult.value.presets.length > 0) {
          setStylePresets(stylePresetResult.value.presets);
        }
      },
    );

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

  const canGenerate = useMemo(
    () => Boolean(photo && !loading && credits >= TRANSFORM_COST),
    [photo, loading, credits],
  );

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
    Haptics.selectionAsync();
  }, []);

  const handleTransform = useCallback(async () => {
    if (!photo) {
      Alert.alert("Missing image", "Upload one photo before transforming.");
      return;
    }
    if (credits < TRANSFORM_COST) {
      Alert.alert("Not enough credits", `This transform costs ${TRANSFORM_COST} credits.`);
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
      });

      setResultBase64(result.imageBase64);
      setLastUsedStyleRefs(Array.isArray(result.styleReferenceIds) ? result.styleReferenceIds : []);
      await refreshCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Transformation failed.");
    } finally {
      setLoading(false);
    }
  }, [photo, credits, selectedStylePreset, stylePresets, customPrompt, intensity, preserveBackground, refreshCredits]);

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
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.styleRow}>
            {stylePresets.map((preset) => {
              const active = selectedStyleId === preset.id;
              return (
                <Pressable
                  key={preset.id}
                  onPress={() => {
                    setSelectedStyleId(preset.id);
                    setPreviewStyleId(preset.id);
                  }}
                  style={[styles.styleCard, active && styles.styleCardActive]}
                >
                  <Image source={{ uri: preset.representativeImage }} style={styles.styleCardImage} contentFit="cover" />
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.9)"]}
                    style={styles.styleCardOverlay}
                  />
                  <Text style={[styles.styleCardTitle, active && styles.styleCardTitleActive]}>{preset.label}</Text>
                  <Text style={styles.styleCardSubtitle} numberOfLines={2}>
                    {preset.subtitle}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.selectedStyleText}>
            Selected style: <Text style={styles.selectedStyleAccent}>{selectedStylePreset?.label || "None"}</Text>
          </Text>

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
                <Text style={styles.costText}>{TRANSFORM_COST} credits</Text>
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
            <Pressable style={styles.downloadButton} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color={Colors.accent} />
              <Text style={styles.downloadText}>Download</Text>
            </Pressable>
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
  styleRow: {
    gap: 10,
    paddingRight: 6,
  },
  styleCard: {
    width: 160,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "#101010",
    padding: 10,
    justifyContent: "flex-end",
  },
  styleCardActive: {
    borderColor: "rgba(255,79,125,0.95)",
    shadowColor: "#FF4F7D",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  styleCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  styleCardTitle: {
    color: "#F8F8F8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 3,
  },
  styleCardTitleActive: {
    color: Colors.accentLight,
  },
  styleCardSubtitle: {
    color: "#CFCFCF",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  selectedStyleText: {
    color: "#CFCFCF",
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  selectedStyleAccent: {
    color: Colors.accentLight,
    fontFamily: "Inter_600SemiBold",
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
  downloadButton: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.55)",
    backgroundColor: "rgba(255,79,125,0.10)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  downloadText: { color: Colors.accentLight, fontFamily: "Inter_600SemiBold", fontSize: 14 },
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
