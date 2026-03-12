import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { router } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { INSTAME_STYLE_PRESETS } from "@shared/instame-style-presets";

const HERO_FRAMES = [
  {
    id: "mono",
    title: "Archive Mono",
    subtitle: "Quiet luxury portrait",
    image:
      INSTAME_STYLE_PRESETS.find((preset) => preset.id === "old_money")?.representativeImage ||
      "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=1200&auto=format&fit=crop",
    glow: "rgba(255,255,255,0.08)",
    frame: "rgba(255,255,255,0.14)",
    accent: "#F1E9EE",
    x: -24,
    y: 18,
    rotation: -7,
    scale: 0.98,
  },
  {
    id: "rose",
    title: "Rose Edit",
    subtitle: "Soft glam narrative",
    image:
      INSTAME_STYLE_PRESETS.find((preset) => preset.id === "glam")?.representativeImage ||
      "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=1200&auto=format&fit=crop",
    glow: "rgba(255,79,125,0.28)",
    frame: "rgba(255,142,182,0.30)",
    accent: "#FFD6E1",
    x: 16,
    y: -6,
    rotation: 4,
    scale: 1.03,
  },
  {
    id: "grey",
    title: "Grey Film",
    subtitle: "Retro portrait styling",
    image:
      INSTAME_STYLE_PRESETS.find((preset) => preset.id === "retro")?.representativeImage ||
      "https://images.unsplash.com/photo-1464863979621-258859e62245?q=80&w=1200&auto=format&fit=crop",
    glow: "rgba(158,158,158,0.16)",
    frame: "rgba(222,222,222,0.18)",
    accent: "#ECE7EA",
    x: 34,
    y: 56,
    rotation: -3,
    scale: 0.97,
  },
] as const;

const SIGNALS = ["Old Money", "Retro", "Glam", "Selfie-ready"] as const;

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#040404", "#140C11", "#070707"]} style={StyleSheet.absoluteFill} />
      <View style={styles.topGlow} />
      <View style={styles.bottomGlow} />
      <View style={styles.sideGlow} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroHeader}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>C</Text>
              </View>
              <View style={styles.brandTextWrap}>
                <Text style={styles.brandEyebrow}>Portrait Style Studio</Text>
                <Text style={styles.brand}>CHICOO</Text>
              </View>
            </View>

            <View style={styles.badge}>
              <Ionicons name="sparkles" size={13} color={Colors.accentLight} />
              <Text style={styles.badgeText}>Trending portrait styling</Text>
            </View>

            <Text style={styles.title}>Your face, styled better.</Text>
            <Text style={styles.subtitle}>
              Luxury-inspired portrait styling with a softer, trend-driven edge.
              Upload once, refine the vibe, and get a polished result in seconds.
            </Text>
          </View>

          <View style={styles.collageWrap}>
            <View style={styles.collageFrame}>
              <LinearGradient
                colors={["rgba(255,255,255,0.03)", "rgba(255,255,255,0)", "rgba(255,79,125,0.05)"]}
                style={styles.collageSurface}
              />
              {HERO_FRAMES.map((frame) => (
                <View
                  key={frame.id}
                  style={[
                    styles.heroCardOuter,
                    {
                      transform: [
                        { translateX: frame.x },
                        { translateY: frame.y },
                        { rotate: `${frame.rotation}deg` },
                        { scale: frame.scale },
                      ],
                      shadowColor: frame.glow,
                      backgroundColor: frame.glow,
                    },
                  ]}
                >
                  <View style={[styles.heroCard, { borderColor: frame.frame }]}>
                    <Image source={{ uri: frame.image }} style={styles.heroCardImage} contentFit="cover" />
                    <LinearGradient
                      colors={["rgba(255,255,255,0.10)", "rgba(0,0,0,0.08)", "rgba(0,0,0,0.22)"]}
                      locations={[0, 0.15, 1]}
                      style={styles.heroCardImageWash}
                    />
                    <LinearGradient
                      colors={["rgba(0,0,0,0.02)", "rgba(0,0,0,0.38)", "rgba(0,0,0,0.88)"]}
                      locations={[0, 0.52, 1]}
                      style={styles.heroCardFooter}
                    />
                    <View style={styles.heroCardMeta}>
                      <Text style={[styles.heroCardTitle, { color: frame.accent }]}>{frame.title}</Text>
                      <Text style={styles.heroCardSubtitle}>{frame.subtitle}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.signalRow}>
            {SIGNALS.map((item) => (
              <View key={item} style={styles.signalPill}>
                <Text style={styles.signalText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.copyCard}>
            <Text style={styles.copyCardTitle}>Built for portraits that still feel like you.</Text>
            <Text style={styles.copyCardText}>
              Chicoo keeps identity first, then layers on style direction,
              lighting mood, and editorial finish without turning the result
              into someone else.
            </Text>
          </View>

          <View style={styles.ctaBlock}>
            <Pressable
              onPress={() => router.push("/(auth)/register")}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.primaryButtonText}>Create Account</Text>
            </Pressable>

            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.secondaryButtonText}>Sign In</Text>
            </Pressable>

            <Pressable onPress={() => router.push("/launch")} style={styles.openLink}>
              <Text style={styles.openLinkText}>Already signed in? Open Chicoo</Text>
            </Pressable>

            <Text style={styles.footnote}>
              Vintage mono. Grey film. Rose glow. One portrait, styled better.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  safeArea: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 36,
    gap: 24,
  },
  topGlow: {
    position: "absolute",
    top: -80,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 220,
    backgroundColor: "rgba(255,79,125,0.14)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -90,
    left: -40,
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: "rgba(255,79,125,0.10)",
  },
  sideGlow: {
    position: "absolute",
    top: "30%",
    left: -70,
    width: 180,
    height: 180,
    borderRadius: 180,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  heroHeader: {
    gap: 14,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,79,125,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,150,183,0.30)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandMarkText: {
    color: "#FFF4F7",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 22,
    lineHeight: 24,
    marginTop: -1,
  },
  brandTextWrap: {
    gap: 2,
  },
  brandEyebrow: {
    color: "#A9A1A5",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  brand: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 17,
    letterSpacing: 3.4,
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
    borderColor: "rgba(255,79,125,0.25)",
  },
  badgeText: {
    color: "#D3CCD0",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.4,
  },
  title: {
    color: "#FFF8FB",
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 42,
    lineHeight: 46,
    maxWidth: 300,
  },
  subtitle: {
    color: "#B2AAAE",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
    maxWidth: 360,
  },
  collageWrap: {
    paddingTop: 6,
  },
  collageFrame: {
    height: 388,
    borderRadius: 34,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(10,10,10,0.78)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  collageSurface: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCardOuter: {
    position: "absolute",
    width: "58%",
    aspectRatio: 4 / 5,
    borderRadius: 22,
    padding: 2,
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  heroCard: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#0F0F0F",
  },
  heroCardImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCardImageWash: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCardFooter: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCardMeta: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 18,
  },
  heroCardTitle: {
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 20,
    lineHeight: 22,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.70)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  heroCardSubtitle: {
    color: "rgba(255,255,255,0.88)",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 17,
    textShadowColor: "rgba(0,0,0,0.65)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  signalRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  signalPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.10)",
    backgroundColor: "rgba(255,255,255,0.03)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signalText: {
    color: "#D7D0D4",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  copyCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 16,
    gap: 8,
  },
  copyCardTitle: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  copyCardText: {
    color: "#AEA7AB",
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 20,
  },
  ctaBlock: {
    gap: 12,
  },
  primaryButton: {
    height: 58,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#090909",
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  secondaryButton: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.03)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#FFF",
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
  },
  openLink: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  openLinkText: {
    color: Colors.accentLight,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  footnote: {
    color: "#7F777B",
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
