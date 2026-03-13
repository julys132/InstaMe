import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChicooBackground from "@/components/ChicooBackground";
import Colors from "@/constants/colors";
import { PUBLIC_PAGE_PATHS, getPublicPageUrl } from "@/lib/public-site";

export type ComplianceSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type ComplianceAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
  icon?: string;
};

const LEGAL_NAV_ITEMS = [
  { key: "privacy", label: "Privacy", path: PUBLIC_PAGE_PATHS.privacy },
  { key: "terms", label: "Terms", path: PUBLIC_PAGE_PATHS.terms },
  { key: "contact", label: "Contact", path: PUBLIC_PAGE_PATHS.contact },
  { key: "deleteAccount", label: "Delete", path: PUBLIC_PAGE_PATHS.deleteAccount },
] as const;

export default function CompliancePageLayout({
  activePage,
  eyebrow,
  title,
  intro,
  lastUpdated,
  sections,
  actions = [],
}: {
  activePage: keyof typeof PUBLIC_PAGE_PATHS;
  eyebrow: string;
  title: string;
  intro: string;
  lastUpdated: string;
  sections: ComplianceSection[];
  actions?: ComplianceAction[];
}) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 60 : insets.top + 8;

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topInset, paddingBottom: Math.max(insets.bottom, 20) + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => {
              if (typeof router.canGoBack === "function" && router.canGoBack()) {
                router.back();
                return;
              }
              router.replace("/welcome");
            }}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.82 }]}
          >
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.eyebrow}>{eyebrow}</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.intro}>{intro}</Text>
            <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navRow}
        >
          {LEGAL_NAV_ITEMS.map((item) => {
            const active = item.key === activePage;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.replace(item.path as any)}
                style={({ pressed }) => [
                  styles.navPill,
                  active && styles.navPillActive,
                  pressed && { opacity: 0.84 },
                ]}
              >
                <Text style={[styles.navPillText, active && styles.navPillTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.card}>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.paragraphs?.map((paragraph) => (
                <Text key={paragraph} style={styles.sectionText}>
                  {paragraph}
                </Text>
              ))}
              {section.bullets?.map((bullet) => (
                <View key={bullet} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        {actions.length > 0 ? (
          <View style={styles.actionsRow}>
            {actions.map((action) => {
              const primary = action.variant !== "secondary";
              return (
                <Pressable
                  key={action.label}
                  onPress={action.onPress}
                  style={({ pressed }) => [
                    primary ? styles.primaryAction : styles.secondaryAction,
                    pressed && { opacity: 0.86 },
                  ]}
                >
                  {action.icon ? (
                    <Ionicons
                      name={action.icon as any}
                      size={16}
                      color={primary ? Colors.black : Colors.white}
                    />
                  ) : null}
                  <Text style={primary ? styles.primaryActionText : styles.secondaryActionText}>
                    {action.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Public page URL: {getPublicPageUrl(PUBLIC_PAGE_PATHS[activePage])}
          </Text>
          <Pressable
            onPress={() => Linking.openURL(getPublicPageUrl(PUBLIC_PAGE_PATHS[activePage]))}
            style={({ pressed }) => [styles.footerLinkButton, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.footerLinkText}>Open public URL</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    paddingHorizontal: 20,
    gap: 18,
  },
  header: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
  },
  headerTextWrap: {
    flex: 1,
    gap: 6,
  },
  eyebrow: {
    color: Colors.accentLight,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    letterSpacing: 3.4,
    textTransform: "uppercase",
  },
  title: {
    color: Colors.white,
    fontFamily: "PlayfairDisplay_700Bold",
    fontSize: 30,
  },
  intro: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  lastUpdated: {
    color: Colors.textMuted,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  navRow: {
    gap: 10,
    paddingRight: 12,
  },
  navPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  navPillActive: {
    borderColor: "rgba(255,143,174,0.62)",
    backgroundColor: "rgba(255,79,125,0.16)",
  },
  navPillText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  navPillTextActive: {
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 18,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
  sectionText: {
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bulletDot: {
    color: Colors.accentLight,
    fontSize: 18,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    color: Colors.textSecondary,
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  actionsRow: {
    gap: 12,
  },
  primaryAction: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: Colors.accent,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  secondaryAction: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  primaryActionText: {
    color: Colors.black,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  secondaryActionText: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  footerNote: {
    gap: 8,
    alignItems: "flex-start",
  },
  footerNoteText: {
    color: Colors.textMuted,
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  footerLinkButton: {
    paddingVertical: 4,
  },
  footerLinkText: {
    color: Colors.accentLight,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
});
