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
import { apiClient, type InstaMeUploadedImage } from "@/lib/api-client";
import {
  VIEW_MODE_OPTIONS,
  VIEW_MODE_TILE_SIZE,
  type UploadedImageViewMode,
} from "@/lib/instame-uploaded-images";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";

export default function EnhancedPortraitsScreen() {
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
      const result = await apiClient.getInstaMeUploadedImages("enhanced");
      setImages(Array.isArray(result.images) ? result.images : []);
    } catch (error: any) {
      Alert.alert("Load failed", error?.message || "Could not load enhanced portraits.");
      setImages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadImages();
  }, [loadImages]);

  const handleDeleteImage = useCallback(
    async (imageId: string) => {
      setActionLoading(true);
      try {
        await apiClient.deleteInstaMeUploadedImage(imageId);
        await loadImages();
        await Haptics.selectionAsync();
      } catch (error: any) {
        Alert.alert("Delete failed", error?.message || "Could not remove this enhanced portrait.");
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

  const headerCountText = useMemo(() => `${images.length}/10`, [images.length]);

  return (
    <View style={styles.container}>
      <ChicooBackground />
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
            <Text style={styles.headerEyebrow}>Chicoo Library</Text>
            <Text style={styles.headerTitle}>Enhanced Portraits</Text>
            <Text style={styles.headerSubtitle}>
              Reuse polished base portraits later, without running Enhance Portrait again.
            </Text>
          </View>

          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{headerCountText}</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Enhanced Library</Text>
              <Text style={styles.cardSubtitle}>
                These are your saved AI-polished base portraits, ready to reuse in Chicoo.
              </Text>
            </View>
            {actionLoading ? <ActivityIndicator color={Colors.accent} size="small" /> : null}
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
              <Text style={styles.emptyStateTitle}>Loading enhanced portraits...</Text>
            </View>
          ) : images.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="sparkles-outline" size={28} color={Colors.accent} />
              <Text style={styles.emptyStateTitle}>No enhanced portraits yet</Text>
              <Text style={styles.emptyStateSubtitle}>
                Keep an enhanced result once, and it will stay here for reuse later.
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
                    <Pressable onPress={() => handleDeleteImage(image.id)} style={styles.deleteButton}>
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
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
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
    fontSize: 34,
    lineHeight: 40,
  },
  headerSubtitle: {
    color: "#BEBEBE",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  countBadge: {
    alignSelf: "flex-start",
    minWidth: 48,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.45)",
    backgroundColor: "rgba(255,79,125,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  countBadgeText: {
    color: "#FFD8E4",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  card: {
    marginHorizontal: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.28)",
    backgroundColor: "rgba(10,10,12,0.92)",
    padding: 14,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  cardTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 22,
  },
  cardSubtitle: {
    color: "#BDBDBD",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  viewModeRow: {
    flexDirection: "row",
    gap: 10,
  },
  viewModeChip: {
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewModeChipActive: {
    borderColor: "rgba(255,79,125,0.65)",
    backgroundColor: "rgba(255,79,125,0.18)",
  },
  viewModeChipText: {
    color: "#D3D3D3",
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  viewModeChipTextActive: {
    color: "#FFE0EA",
  },
  emptyState: {
    minHeight: 220,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.025)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 22,
    gap: 10,
  },
  emptyStateTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
    textAlign: "center",
  },
  emptyStateSubtitle: {
    color: "#AEAEAE",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  tileWrap: {
    position: "relative",
  },
  tile: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "#0B0B0E",
  },
  tileActive: {
    borderColor: "rgba(255,79,125,0.75)",
    shadowColor: "#FF5CB8",
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
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
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentLight,
    alignItems: "center",
    justifyContent: "center",
  },
  tileMeta: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 12,
    gap: 2,
  },
  tileName: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  tileInfo: {
    color: "#D0D0D0",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  deleteButton: {
    position: "absolute",
    top: 10,
    left: 10,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.58)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
});
