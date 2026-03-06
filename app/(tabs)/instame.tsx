import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  { value: "editorial", label: "Editorial", subtitle: "Balanced old money look" },
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
  const [preserveBackground, setPreserveBackground] = useState(true);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      Alert.alert("Image error", "Nu am putut citi această imagine.");
      return;
    }

    if (base64.length > MAX_UPLOAD_IMAGE_BASE64_LENGTH) {
      Alert.alert("Imagine prea mare", "Alege o imagine mai mică sau decupează fotografia.");
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
      Alert.alert("Lipsește imaginea", "Încarcă o fotografie înainte de transformare.");
      return;
    }
    if (credits < TRANSFORM_COST) {
      Alert.alert("Credite insuficiente", `Transformarea costă ${TRANSFORM_COST} credite.`);
      return;
    }

    setLoading(true);
    try {
      const result = await apiClient.transformOldMoney({
        photo: { base64: photo.base64, mimeType: photo.mimeType },
        customPrompt: customPrompt.trim(),
        intensity,
        preserveBackground,
      });
      setResultBase64(result.imageBase64);
      await refreshCredits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Eroare", error?.message || "Transformarea a eșuat.");
    } finally {
      setLoading(false);
    }
  }, [photo, credits, customPrompt, intensity, preserveBackground, refreshCredits]);

  const handleDownload = useCallback(async () => {
    if (!resultBase64) return;

    try {
      if (Platform.OS === "web" && typeof document !== "undefined") {
        const link = document.createElement("a");
        link.href = `data:image/png;base64,${resultBase64}`;
        link.download = `instame-old-money-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const filePath = `${FileSystem.cacheDirectory}instame-old-money-${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(filePath, resultBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: "image/png",
          dialogTitle: "Save InstaMe Result",
        });
      } else {
        Alert.alert("Info", "Sharing nu este disponibil pe acest dispozitiv.");
      }
    } catch (error: any) {
      Alert.alert("Eroare", error?.message || "Nu am putut exporta imaginea.");
    }
  }, [resultBase64]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#050505", "#1B1410", "#0A0A0A"]} style={StyleSheet.absoluteFill} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 120 }}
      >
        <View style={styles.header}>
          <Text style={styles.headerEyebrow}>InstaMe</Text>
          <Text style={styles.headerTitle}>Old Money Luxury Transform</Text>
          <View style={styles.creditBadge}>
            <Ionicons name="sparkles" size={14} color="#C9A96E" />
            <Text style={styles.creditText}>{credits} credite</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>1. Încarcă fotografia</Text>
          <Pressable style={styles.uploadBox} onPress={pickImage}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.uploadImage} contentFit="cover" />
            ) : (
              <View style={styles.uploadPlaceholder}>
                <Ionicons name="image-outline" size={30} color="#C9A96E" />
                <Text style={styles.uploadPlaceholderTitle}>Selectează o imagine</Text>
                <Text style={styles.uploadPlaceholderSubtitle}>
                  Portret sau fotografie full-body pentru rezultate mai bune.
                </Text>
              </View>
            )}
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>2. Setări de stil</Text>
          <View style={styles.chipsRow}>
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
              color={preserveBackground ? "#C9A96E" : "#8E8E8E"}
            />
            <Text style={styles.toggleText}>Păstrează fundalul original</Text>
          </Pressable>

          <TextInput
            value={customPrompt}
            onChangeText={setCustomPrompt}
            placeholder="Instrucțiuni extra (opțional): ex. pearl earrings, wool blazer, warm sunset tone"
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
                <Text style={styles.generateButtonText}>Transformă Acum</Text>
                <Text style={styles.costText}>{TRANSFORM_COST} credite</Text>
              </>
            )}
          </Pressable>
        </View>

        {resultBase64 ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>3. Rezultat InstaMe</Text>
            <Image
              source={{ uri: `data:image/png;base64,${resultBase64}` }}
              style={styles.resultImage}
              contentFit="cover"
            />
            <Pressable style={styles.downloadButton} onPress={handleDownload}>
              <Ionicons name="download-outline" size={18} color="#C9A96E" />
              <Text style={styles.downloadText}>Download</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  header: { paddingHorizontal: 20, gap: 6, marginBottom: 12 },
  headerEyebrow: {
    color: "#C9A96E",
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
    backgroundColor: "rgba(201,169,110,0.16)",
    borderWidth: 1,
    borderColor: "rgba(201,169,110,0.35)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  creditText: { color: "#F3E0BA", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  card: {
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "rgba(201,169,110,0.25)",
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
  chipsRow: { gap: 8 },
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
    borderColor: "rgba(201,169,110,0.65)",
    backgroundColor: "rgba(201,169,110,0.16)",
  },
  chipLabel: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 13 },
  chipLabelActive: { color: "#EBD6AA" },
  chipSubtitle: { color: "#8D8D8D", fontFamily: "Inter_400Regular", fontSize: 12 },
  chipSubtitleActive: { color: "#D4C09A" },
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
    borderColor: "rgba(201,169,110,0.6)",
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
    backgroundColor: "#C9A96E",
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
    borderColor: "rgba(201,169,110,0.5)",
    backgroundColor: "rgba(201,169,110,0.08)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  downloadText: { color: "#EBD6AA", fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
