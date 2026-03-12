import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { apiClient, type InstaMeUploadedImage } from "@/lib/api-client";
import {
  MAX_STORED_UPLOADS,
  optimizeImageAsset,
  VIEW_MODE_OPTIONS,
  VIEW_MODE_TILE_SIZE,
  type PreparedUploadImage,
  type UploadedImageViewMode,
} from "@/lib/instame-uploaded-images";
import Colors from "@/constants/colors";

export default function UploadedImagesScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ selectedImageId?: string | string[] }>();
  const selectedImageIdParam = Array.isArray(params.selectedImageId)
    ? params.selectedImageId[0]
    : params.selectedImageId;

  const [images, setImages] = useState<InstaMeUploadedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<UploadedImageViewMode>("medium");

  const tileWidth = VIEW_MODE_TILE_SIZE[viewMode];

  const loadImages = useCallback(async () => {
    try {
      const result = await apiClient.getInstaMeUploadedImages();
      setImages(Array.isArray(result.images) ? result.images : []);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message || "Could not load saved portraits.");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

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

  const savePreparedToLibrary = useCallback(
    async (prepared: PreparedUploadImage, name?: string) => {
      if (images.length >= MAX_STORED_UPLOADS) {
        Alert.alert("Limit reached", `You can save up to ${MAX_STORED_UPLOADS} portraits.`);
        return null;
      }

      setActionLoading(true);
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
        await loadImages();
        return result.image;
      } catch (error: any) {
        Alert.alert("Save failed", error?.message || "Could not save this portrait.");
        return null;
      } finally {
        setActionLoading(false);
      }
    },
    [images.length, loadImages],
  );

  const handleAddImage = useCallback(async () => {
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

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace({
      pathname: "/(tabs)/instame",
      params: {
        uploadedImageId: saved.id,
        uploadedImageNonce: String(Date.now()),
      },
    });
  }, [pickRawImage, savePreparedToLibrary]);

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      setActionLoading(true);
      try {
        await apiClient.deleteInstaMeUploadedImage(imageId);
        await loadImages();
        await Haptics.selectionAsync();
      } catch (error: any) {
        Alert.alert("Delete failed", error?.message || "Could not remove this portrait.");
      } finally {
        setActionLoading(false);
      }
    },
    [loadImages],
  );

  const handleUseImage = useCallback(async (imageId: string) => {
    await Haptics.selectionAsync();
    router.replace({
      pathname: "/(tabs)/instame",
      params: {
        uploadedImageId: imageId,
        uploadedImageNonce: String(Date.now()),
      },
    });
  }, []);

  const headerCountText = useMemo(
    () => `${images.length}/${MAX_STORED_UPLOADS}`,
    [images.length],
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={["#050505", "#170C12", "#080808"]} style={StyleSheet.absoluteFill} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 44,
        }}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace("/(tabs)/instame"))}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color="#FFF" />
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.headerEyebrow}>InstaMe Library</Text>
            <Text style={styles.headerTitle}>Uploaded Images</Text>
            <Text style={styles.headerSubtitle}>
              Save up to 10 optimized portraits and reuse them instantly in generation.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{headerCountText}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Portrait Library</Text>
              <Text style={styles.cardSubtitle}>
                Each portrait is stored at max 1024 x 1024 px and 1MB for lower AI cost.
              </Text>
            </View>
            {actionLoading ? <ActivityIndicator color={Colors.accent} size="small" /> : null}
          </View>

          <View style={styles.actionRow}>
            <Pressable
              onPress={handleAddImage}
              disabled={images.length >= MAX_STORED_UPLOADS || actionLoading}
              style={({ pressed }) => [
                styles.primaryButton,
                (images.length >= MAX_STORED_UPLOADS || actionLoading) && styles.primaryButtonDisabled,
                pressed && images.length < MAX_STORED_UPLOADS ? { opacity: 0.9 } : undefined,
              ]}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#0A0A0A" />
              <Text style={styles.primaryButtonText}>Add portrait</Text>
            </Pressable>
          </View>

          <View style={styles.viewModeRow}>
            {VIEW_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => setViewMode(option.value)}
                style={[
                  styles.viewModeChip,
                  viewMode === option.value && styles.viewModeChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.viewModeChipText,
                    viewMode === option.value && styles.viewModeChipTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator color={Colors.accent} />
              <Text style={styles.emptyStateTitle}>Loading saved portraits...</Text>
            </View>
          ) : images.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={28} color={Colors.accent} />
              <Text style={styles.emptyStateTitle}>No saved portraits yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add portraits here once, then reuse them without browsing your phone every time.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {images.map((image) => {
                const isSelected = selectedImageIdParam === image.id;
                return (
                  <View
                    key={image.id}
                    style={[
                      styles.tileWrap,
                      {
                        width: tileWidth,
                        height: Math.round(tileWidth * 1.3),
                      },
                    ]}
                  >
                    <Pressable
                      onPress={() => handleUseImage(image.id)}
                      style={[styles.tile, isSelected && styles.tileActive]}
                    >
                      <Image source={{ uri: image.previewUri }} style={styles.tileImage} contentFit="cover" />
                      <LinearGradient
                        colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.22)", "rgba(0,0,0,0.86)"]}
                        locations={[0, 0.48, 1]}
                        style={styles.tileOverlay}
                      />
                      {isSelected ? (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark" size={12} color="#050505" />
                        </View>
                      ) : null}
                      <View style={styles.tileMeta}>
                        <Text style={styles.tileName} numberOfLines={1}>
                          {image.name}
                        </Text>
                        <Text style={styles.tileInfo}>
                          {image.width} x {image.height}
                        </Text>
                      </View>
                    </Pressable>
                    <Pressable
                      onPress={() => handleDeleteImage(image.id)}
                      style={styles.deleteButton}
                    >
                      <Ionicons name="close" size={14} color="#FFF" />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    marginBottom: 14,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  headerEyebrow: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  headerTitle: {
    color: "#FFF",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
  },
  headerSubtitle: {
    color: "#AEAEAE",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  countBadge: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.34)",
    backgroundColor: "rgba(255,79,125,0.10)",
  },
  countBadgeText: {
    color: "#FFD5E2",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(7,7,7,0.86)",
    padding: 16,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  cardSubtitle: {
    color: "#A8A8A8",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  primaryButton: {
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryButtonDisabled: {
    opacity: 0.45,
  },
  primaryButtonText: {
    color: "#0A0A0A",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
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
  emptyState: {
    minHeight: 184,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  emptyStateTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    color: "#9D9D9D",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tileWrap: {
    position: "relative",
  },
  tile: {
    flex: 1,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0B0B0B",
  },
  tileActive: {
    borderColor: "rgba(255,79,125,0.82)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  tileImage: {
    ...StyleSheet.absoluteFillObject,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  selectedBadge: {
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
  tileMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 18,
  },
  tileName: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  tileInfo: {
    color: "#D5D5D5",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  deleteButton: {
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
});
