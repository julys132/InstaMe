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
import {
  INSTAME_ART_STYLES,
  INSTAME_WELCOME_CARD_SOURCES,
} from "@/constants/instameArtStyles";

const FRAME_LAYOUT = [
  { x: -76, y: 12, rotate: "-9deg", scale: 0.9, tint: "rgba(8,8,10,0.68)", border: "rgba(255,255,255,0.06)", z: 1 },
  { x: 70, y: 22, rotate: "7deg", scale: 0.88, tint: "rgba(10,10,12,0.70)", border: "rgba(255,255,255,0.06)", z: 1 },
  { x: -18, y: 68, rotate: "-4deg", scale: 0.96, tint: "rgba(82,10,36,0.46)", border: "rgba(255,92,146,0.16)", z: 2 },
  { x: 18, y: -10, rotate: "4deg", scale: 1.03, tint: "rgba(102,8,40,0.54)", border: "rgba(255,108,163,0.22)", z: 3 },
] as const;

const SIGNAL_WORDS = ["Editorials", "Authentic", "Swift"] as const;

export default function WelcomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <LinearGradient colors={["#020202", "#0C070A", "#030303"]} style={StyleSheet.absoluteFill} />
      <View style={styles.vignette} />
      <View style={styles.accentGlow} />

      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.brand}>CHICOO</Text>
            <Text style={styles.tagline}>YOUR FACE, STYLED BETTER.</Text>
            <Text style={styles.subline}>
              TRANSFORM YOUR PORTRAITS{"\n"}
              INTO A TREND-LED LOOK{"\n"}
              WITH ONE TOUCH.
            </Text>
          </View>

          <View style={styles.collageArea}>
            {FRAME_LAYOUT.map((frame, index) => (
              <View
                key={`frame-${index}`}
                style={[
                  styles.frameOuter,
                  {
                    transform: [
                      { translateX: frame.x },
                      { translateY: frame.y },
                      { rotate: frame.rotate },
                      { scale: frame.scale },
                    ],
                    zIndex: frame.z,
                    shadowColor: frame.tint,
                  },
                ]}
              >
                <View style={[styles.frameCard, { borderColor: frame.border }]}>
                  <Image
                    source={INSTAME_WELCOME_CARD_SOURCES[index % INSTAME_WELCOME_CARD_SOURCES.length]}
                    style={styles.frameImage}
                    contentFit="cover"
                  />
                  <LinearGradient
                    colors={["rgba(255,255,255,0.05)", "rgba(0,0,0,0.04)", frame.tint]}
                    locations={[0, 0.2, 1]}
                    style={styles.frameTint}
                  />
                  <View style={styles.innerPanel} />
                  <View style={styles.centerRing} />
                  <Text style={styles.frameIndex}>{String(index + 1).padStart(2, "0")}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={styles.signalRow}>
            {SIGNAL_WORDS.map((word) => (
              <Text key={word} style={styles.signalText}>
                {word}
              </Text>
            ))}
          </View>

          <View style={styles.artStylesSection}>
            <Text style={styles.artStylesEyebrow}>Art Styles</Text>
            <Text style={styles.artStylesTitle}>Turn portraits into illustrated looks.</Text>
            <View style={styles.artStylesGrid}>
              {INSTAME_ART_STYLES.map((style) => (
                <View key={style.id} style={styles.artStyleCard}>
                  <Image source={style.preview} style={styles.artStyleImage} contentFit="cover" />
                  <LinearGradient
                    colors={["rgba(255,255,255,0.04)", "rgba(0,0,0,0.10)", "rgba(0,0,0,0.82)"]}
                    style={styles.artStyleOverlay}
                  />
                  <View style={styles.artStyleTextWrap}>
                    <Text style={styles.artStyleLabel}>{style.label}</Text>
                    <Text style={styles.artStyleSubtitle}>{style.subtitle}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(auth)/register")}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>CREATE ACCOUNT</Text>
          </Pressable>

          <View style={styles.signInBlock}>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={({ pressed }) => [
                styles.signInCircle,
                pressed && styles.buttonPressed,
              ]}
            >
              <LinearGradient
                colors={["rgba(255,255,255,0.05)", "rgba(255,79,125,0.12)", "rgba(0,0,0,0.12)"]}
                style={StyleSheet.absoluteFill}
              />
              <Ionicons name="person-outline" size={18} color="#FFD9E5" />
            </Pressable>

            <Text style={styles.signInText}>
              Existing account? Tap the circle{"\n"}to sign in.
            </Text>
          </View>

          <Pressable onPress={() => router.push("/launch")} style={styles.openLink}>
            <Text style={styles.openLinkText}>Open Chicoo</Text>
          </Pressable>
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
    minHeight: "100%",
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 30,
    alignItems: "center",
  },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.34)",
  },
  accentGlow: {
    position: "absolute",
    bottom: -120,
    left: "15%",
    width: 240,
    height: 240,
    borderRadius: 240,
    backgroundColor: "rgba(255,79,125,0.08)",
  },
  hero: {
    marginTop: 28,
    alignItems: "center",
    gap: 12,
  },
  brand: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 34,
    letterSpacing: 10,
    textAlign: "center",
    textTransform: "uppercase",
  },
  tagline: {
    color: "#F8F1F4",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 6,
    textAlign: "center",
    textTransform: "uppercase",
  },
  subline: {
    color: "#7D7780",
    fontFamily: "Inter_400Regular",
    fontSize: 10.5,
    lineHeight: 24,
    letterSpacing: 4.2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  collageArea: {
    position: "relative",
    width: "100%",
    height: 470,
    marginTop: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  frameOuter: {
    position: "absolute",
    width: 218,
    aspectRatio: 4 / 5,
    borderRadius: 24,
    padding: 2,
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  frameCard: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    backgroundColor: "#070709",
  },
  frameImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.22,
  },
  frameTint: {
    ...StyleSheet.absoluteFillObject,
  },
  innerPanel: {
    position: "absolute",
    width: "32%",
    height: "38%",
    left: "24%",
    top: "18%",
    borderRadius: 16,
    backgroundColor: "rgba(255,79,125,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,120,170,0.12)",
  },
  centerRing: {
    position: "absolute",
    width: 64,
    height: 64,
    left: "50%",
    top: "50%",
    marginLeft: -32,
    marginTop: -18,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,79,125,0.06)",
  },
  frameIndex: {
    position: "absolute",
    right: 14,
    bottom: 12,
    color: "rgba(255,255,255,0.18)",
    fontFamily: "Inter_500Medium",
    fontSize: 10,
    letterSpacing: 1.2,
  },
  signalRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -8,
    marginBottom: 10,
    paddingHorizontal: 10,
  },
  signalText: {
    color: "#5F5A62",
    fontFamily: "Inter_400Regular",
    fontSize: 10,
    letterSpacing: 3.1,
    textTransform: "uppercase",
  },
  artStylesSection: {
    width: "100%",
    marginTop: 10,
    marginBottom: 18,
    gap: 10,
  },
  artStylesEyebrow: {
    color: Colors.accent,
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 3,
    textTransform: "uppercase",
    textAlign: "center",
  },
  artStylesTitle: {
    color: "#EEE6EA",
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  artStylesGrid: {
    gap: 12,
  },
  artStyleCard: {
    width: "100%",
    height: 168,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#09090C",
  },
  artStyleImage: {
    ...StyleSheet.absoluteFillObject,
  },
  artStyleOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  artStyleTextWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 14,
    gap: 4,
  },
  artStyleLabel: {
    color: "#FFF4F8",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  artStyleSubtitle: {
    color: "#CABCC3",
    fontFamily: "Inter_400Regular",
    fontSize: 11.5,
    lineHeight: 17,
  },
  primaryButton: {
    width: "100%",
    maxWidth: 352,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(7,8,12,0.86)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "rgba(0,0,0,0.8)",
    shadowOpacity: 0.4,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  primaryButtonText: {
    color: "#EEE6EA",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  signInBlock: {
    marginTop: 22,
    alignItems: "center",
    gap: 12,
  },
  signInCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#0B0B0E",
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    color: "#66616A",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 20,
    letterSpacing: 1.1,
    textAlign: "center",
  },
  openLink: {
    marginTop: 18,
    paddingVertical: 6,
  },
  openLinkText: {
    color: "#7A7480",
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
});
