import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image as NativeImage,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  apiClient,
  type InstaMePackDetail,
  type InstaMePackImageAsset,
  type InstaMePackSummary,
} from "@/lib/api-client";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";

function stripDataUriPrefix(value: string): string {
  return value.replace(/^data:[^;]+;base64,/, "");
}

function buildDataUri(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${stripDataUriPrefix(base64)}`;
}

async function exportBase64Image(
  base64: string,
  options?: { mimeType?: string; fileNamePrefix?: string; dialogTitle?: string },
): Promise<void> {
  const normalizedBase64 = stripDataUriPrefix(base64);
  if (!normalizedBase64) return;

  const mimeType = options?.mimeType || "image/png";
  const fileNamePrefix = options?.fileNamePrefix || "chicoo-pack";
  const dialogTitle = options?.dialogTitle || "Save Pack Image";
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
      await Sharing.shareAsync(filePath, { mimeType, dialogTitle });
    } else {
      Alert.alert("Info", "Sharing is not available on this device.");
    }
  } catch (error: any) {
    Alert.alert("Error", error?.message || "Could not export this image.");
  }
}

function renderImage(uri: string, style: any) {
  const sanitizedUri = (uri || "").replace(/\s+/g, "");
  if (!sanitizedUri) {
    return (
      <View style={[style, styles.thumbFallback]}>
        <Ionicons name="image-outline" size={20} color="rgba(255,255,255,0.38)" />
      </View>
    );
  }
  if (Platform.OS === "ios") {
    return <NativeImage source={{ uri: sanitizedUri }} style={style} resizeMode="cover" />;
  }
  return <ExpoImage source={{ uri: sanitizedUri }} style={style} contentFit="cover" />;
}

export default function SavedPacksScreen() {
  const insets = useSafeAreaInsets();

  const [packs, setPacks] = useState<InstaMePackSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedPack, setSelectedPack] = useState<InstaMePackDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadPacks = useCallback(async () => {
    try {
      const result = await apiClient.getInstaMePacks();
      setPacks(Array.isArray(result.packs) ? result.packs : []);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message || "Could not load saved packs.");
      setPacks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPacks();
  }, [loadPacks]);

  const openPack = useCallback(async (packId: string) => {
    setDetailLoading(true);
    try {
      const result = await apiClient.getInstaMePack(packId);
      setSelectedPack(result.pack);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message || "Could not open this pack.");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDownloadImage = useCallback(
    async (packId: string, image: InstaMePackImageAsset) => {
      setActionLoading(true);
      try {
        const result = await apiClient.getInstaMePackImage(packId, image.id);
        await exportBase64Image(result.image.base64, {
          mimeType: result.image.mimeType || image.mimeType || "image/png",
          fileNamePrefix:
            image.role === "preview" ? "chicoo-pack-preview" : `chicoo-pack-${image.position || 0}`,
          dialogTitle: image.role === "preview" ? "Save Pack Preview" : "Save Pack Image",
        });
        await Haptics.selectionAsync();
      } catch (error: any) {
        Alert.alert("Download failed", error?.message || "Could not download this image.");
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  const handleRetouchImage = useCallback(
    async (packId: string, image: InstaMePackImageAsset) => {
      await Haptics.selectionAsync();
      router.replace({
        pathname: "/(tabs)/instame",
        params: {
          retouchPackId: packId,
          retouchImageId: image.id,
          retouchNonce: String(Date.now()),
        },
      });
    },
    [],
  );

  const handleDeletePack = useCallback(
    (packId: string) => {
      Alert.alert("Delete pack", "This will permanently remove this saved pack.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setActionLoading(true);
            try {
              await apiClient.deleteInstaMePack(packId);
              setSelectedPack((current) => (current?.id === packId ? null : current));
              await loadPacks();
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch (error: any) {
              Alert.alert("Delete failed", error?.message || "Could not delete this pack.");
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]);
    },
    [loadPacks],
  );

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 44 }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (selectedPack) {
                setSelectedPack(null);
                return;
              }
              router.canGoBack() ? router.back() : router.replace("/(tabs)/instame");
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEyebrow}>Chicoo Library</Text>
            <Text style={styles.headerTitle}>{selectedPack ? selectedPack.title : "My Packs"}</Text>
            <Text style={styles.headerSubtitle}>
              {selectedPack
                ? "Download the preview, download or retouch individual images."
                : "Revisit your generated packs anytime to download or retouch them."}
            </Text>
          </View>

          {actionLoading || detailLoading ? (
            <ActivityIndicator color={Colors.accent} size="small" />
          ) : (
            <View style={{ width: 24 }} />
          )}
        </View>

        {selectedPack ? (
          <View style={styles.card}>
            {selectedPack.preview ? (
              <View style={styles.previewBlock}>
                <View style={styles.previewFrame}>
                  {renderImage(selectedPack.preview.previewUri || "", styles.previewImage)}
                </View>
                <Pressable
                  onPress={() => handleDownloadImage(selectedPack.id, selectedPack.preview!)}
                  disabled={actionLoading}
                  style={({ pressed }) => [
                    styles.previewDownloadButton,
                    pressed ? { opacity: 0.86 } : undefined,
                  ]}
                >
                  <Ionicons name="download-outline" size={16} color="#0A0A0A" />
                  <Text style={styles.previewDownloadText}>Download preview</Text>
                </Pressable>
              </View>
            ) : null}

            <Text style={styles.sectionLabel}>
              {selectedPack.images.length} image{selectedPack.images.length === 1 ? "" : "s"}
            </Text>

            <View style={styles.grid}>
              {selectedPack.images.map((image) => (
                <View key={image.id} style={styles.tileWrap}>
                  <View style={styles.tile}>
                    {renderImage(image.previewUri || "", styles.tileImage)}
                    <LinearGradient
                      colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.82)"]}
                      locations={[0, 0.5, 1]}
                      style={styles.tileOverlay}
                    />
                    <Text style={styles.tileLabel} numberOfLines={1}>
                      {image.label}
                    </Text>
                  </View>
                  <View style={styles.tileActions}>
                    <Pressable
                      onPress={() => handleDownloadImage(selectedPack.id, image)}
                      disabled={actionLoading}
                      style={({ pressed }) => [styles.tileActionBtn, pressed ? { opacity: 0.8 } : undefined]}
                    >
                      <Ionicons name="download-outline" size={15} color="#FFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleRetouchImage(selectedPack.id, image)}
                      style={({ pressed }) => [
                        styles.tileActionBtn,
                        styles.tileActionBtnAccent,
                        pressed ? { opacity: 0.8 } : undefined,
                      ]}
                    >
                      <Ionicons name="color-wand-outline" size={15} color="#0A0A0A" />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => handleDeletePack(selectedPack.id)}
              disabled={actionLoading}
              style={({ pressed }) => [styles.deleteButton, pressed ? { opacity: 0.8 } : undefined]}
            >
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.deleteButtonText}>Delete pack</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            {loading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={Colors.accent} />
                <Text style={styles.emptyStateTitle}>Loading saved packs...</Text>
              </View>
            ) : packs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="albums-outline" size={28} color={Colors.accent} />
                <Text style={styles.emptyStateTitle}>No saved packs yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Generate a photo pack and it will be saved here automatically.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {packs.map((pack) => (
                  <Pressable
                    key={pack.id}
                    onPress={() => openPack(pack.id)}
                    style={({ pressed }) => [styles.packTileWrap, pressed ? { opacity: 0.9 } : undefined]}
                  >
                    <View style={styles.tile}>
                      {renderImage(pack.previewUri || "", styles.tileImage)}
                      <LinearGradient
                        colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.88)"]}
                        locations={[0, 0.48, 1]}
                        style={styles.tileOverlay}
                      />
                      <View style={styles.packTileMeta}>
                        <Text style={styles.tileName} numberOfLines={2}>
                          {pack.title}
                        </Text>
                        <Text style={styles.tileInfo}>
                          {pack.imageCount} photos · {formatDate(pack.createdAt)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 18,
    marginBottom: 16,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  headerTextWrap: { flex: 1 },
  headerEyebrow: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerTitle: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 2 },
  headerSubtitle: { color: Colors.textMuted, fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4 },
  card: {
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 48, gap: 10 },
  emptyStateTitle: { color: "#FFF", fontFamily: "Inter_600SemiBold", fontSize: 15 },
  emptyStateSubtitle: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12.5,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 20,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  packTileWrap: { width: "47%" },
  tileWrap: { width: "47%" },
  tile: {
    width: "100%",
    aspectRatio: 1024 / 1536,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  tileImage: { width: "100%", height: "100%" },
  tileOverlay: { ...StyleSheet.absoluteFillObject },
  tileLabel: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
  },
  packTileMeta: { position: "absolute", bottom: 10, left: 10, right: 10 },
  tileName: { color: "#FFF", fontFamily: "Inter_700Bold", fontSize: 13 },
  tileInfo: { color: "rgba(255,255,255,0.72)", fontFamily: "Inter_400Regular", fontSize: 11, marginTop: 3 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  tileActions: { flexDirection: "row", gap: 8, marginTop: 8, justifyContent: "center" },
  tileActionBtn: {
    flex: 1,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  tileActionBtnAccent: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  previewBlock: { marginBottom: 18 },
  previewFrame: {
    width: "100%",
    aspectRatio: 1024 / 1536,
    maxHeight: 420,
    borderRadius: 16,
    overflow: "hidden",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  previewImage: { width: "100%", height: "100%" },
  previewDownloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.accent,
  },
  previewDownloadText: { color: "#0A0A0A", fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionLabel: {
    color: Colors.textSecondary,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12.5,
    marginBottom: 12,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,68,68,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,68,68,0.28)",
  },
  deleteButtonText: { color: Colors.error, fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
