import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Image } from "expo-image";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const FEATURES = [
  {
    icon: "sparkles-outline",
    title: "Luxury editorial finish",
    text: "Elevate any photo with polished contrast, refined tones and a premium old-money mood.",
  },
  {
    icon: "person-outline",
    title: "Preserve your identity",
    text: "Keep the same person, pose and feeling while enhancing the overall aesthetic.",
  },
  {
    icon: "flash-outline",
    title: "Fast and simple",
    text: "Upload, choose intensity and get a beautifully transformed result in seconds.",
  },
] as const;

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={["#000000", "#0A0A0A", "#121212"]}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.badge}>
              <Ionicons name="sparkles" size={14} color={Colors.accent} />
              <Text style={styles.badgeText}>Luxury image transformation</Text>
            </View>

            <Text style={styles.brand}>InstaMe</Text>

            <Text style={styles.title}>
              Make every photo look quietly expensive.
            </Text>

            <Text style={styles.subtitle}>
              Transform your images into a refined luxury-editorial aesthetic
              with elegant light, polished contrast and timeless mood.
            </Text>

            <View style={styles.previewCard}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
                }}
                style={styles.previewImage}
                contentFit="cover"
              />
              <View style={styles.previewOverlay} />
              <View style={styles.previewLabel}>
                <Text style={styles.previewLabelText}>Soft - Editorial - Dramatic</Text>
              </View>
            </View>
          </View>

          <View style={styles.features}>
            {FEATURES.map((item) => (
              <View key={item.title} style={styles.featureCard}>
                <View style={styles.featureIconWrap}>
                  <Ionicons name={item.icon as any} size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureText}>{item.text}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.ctaBlock}>
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              style={({ pressed }) => [
                styles.primaryBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.985 }] },
              ]}
            >
              <Text style={styles.primaryBtnText}>Create Account</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.secondaryBtn,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.secondaryBtnText}>Sign In</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/launch")} style={styles.launchLink}>
              <Text style={styles.launchLinkText}>Already signed in? Open app</Text>
            </Pressable>

            <Text style={styles.footnote}>
              Create luxury-looking edits with a cleaner, faster workflow.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 28,
  },
  hero: {
    gap: 18,
  },
  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(201,169,110,0.22)",
  },
  badgeText: {
    color: Colors.textSecondary,
    fontSize: 12,
    letterSpacing: 0.6,
    fontFamily: "Inter_500Medium",
  },
  brand: {
    color: Colors.accent,
    fontSize: 14,
    letterSpacing: 3,
    textTransform: "uppercase",
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  title: {
    color: Colors.white,
    fontSize: 42,
    lineHeight: 48,
    fontFamily: "PlayfairDisplay_700Bold",
    maxWidth: 330,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
    maxWidth: 360,
  },
  previewCard: {
    height: 320,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    marginTop: 8,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  previewLabel: {
    position: "absolute",
    left: 14,
    bottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.45)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  previewLabelText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  features: {
    gap: 12,
  },
  featureCard: {
    flexDirection: "row",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: "#101010",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  featureIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(201,169,110,0.10)",
  },
  featureTitle: {
    color: Colors.white,
    fontSize: 15,
    marginBottom: 4,
    fontFamily: "Inter_600SemiBold",
  },
  featureText: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    fontFamily: "Inter_400Regular",
  },
  ctaBlock: {
    gap: 12,
    paddingTop: 4,
  },
  primaryBtn: {
    height: 58,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: Colors.black,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  secondaryBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  launchLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  launchLinkText: {
    color: Colors.accent,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  footnote: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    fontFamily: "Inter_400Regular",
  },
});
