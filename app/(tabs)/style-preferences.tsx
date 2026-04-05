import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";
import { useAuth } from "@/contexts/AuthContext";

const STYLE_TAGS = [
  "Minimalist",
  "Streetwear",
  "Elegant",
  "Classic",
  "Romantic",
  "Edgy",
  "Boho",
  "Sporty",
];

export default function StylePreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { user, updateProfile } = useAuth();
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const stylePreferences = useMemo(
    () => (Array.isArray(user?.stylePreferences) ? [...user.stylePreferences] : []),
    [user?.stylePreferences],
  );

  useEffect(() => {
    setSelected(stylePreferences);
  }, [user?.id, stylePreferences]);

  function toggleTag(tag: string) {
    setSelected((prev) => (prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag]));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateProfile({ stylePreferences: selected });
      Alert.alert("Saved", "Your style preferences were updated.");
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Could not save preferences.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View>
            <Text style={styles.headerLabel}>Chicoo Profile</Text>
            <Text style={styles.headerTitle}>Style Preferences</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.description}>
            Choose styles you love. The stylist will prioritize these in outfit suggestions.
          </Text>
          <View style={styles.tagsWrap}>
            {STYLE_TAGS.map((tag) => {
              const active = selected.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.85 }, saving && { opacity: 0.6 }]}
        >
          <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save Preferences"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  backButton: { padding: 6, marginLeft: -6 },
  headerLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  headerTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 28,
    color: Colors.white,
  },
  section: {
    marginHorizontal: 20,
    backgroundColor: "rgba(10,10,14,0.84)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    padding: 16,
    gap: 14,
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  tagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tag: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  tagActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  tagText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    color: Colors.textSecondary,
  },
  tagTextActive: {
    color: Colors.black,
  },
  saveButton: {
    marginHorizontal: 20,
    marginTop: 18,
    borderRadius: 26,
    backgroundColor: "rgba(7,8,12,0.90)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  saveButtonText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#F5E9EE",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
});
