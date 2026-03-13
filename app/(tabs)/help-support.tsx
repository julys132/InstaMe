import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import ChicooBackground from "@/components/ChicooBackground";
import {
  CHICOO_BILLING_EMAIL,
  CHICOO_PRIVACY_EMAIL,
  CHICOO_SUPPORT_EMAIL,
} from "@/lib/public-site";

function SupportCard({
  icon,
  title,
  description,
  onPress,
}: {
  icon: string;
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}>
      <Ionicons name={icon as any} size={20} color={Colors.accent} />
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </Pressable>
  );
}

export default function HelpSupportScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <ChicooBackground />
      <ScrollView contentContainerStyle={{ paddingBottom: 80 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={22} color={Colors.white} />
          </Pressable>
          <View>
            <Text style={styles.headerLabel}>Chicoo Support</Text>
            <Text style={styles.headerTitle}>Help & Support</Text>
          </View>
        </View>

        <View style={styles.section}>
          <SupportCard
            icon="shield-outline"
            title="Privacy Policy"
            description="Read how Chicoo collects, uses, and deletes data."
            onPress={() => router.push("/privacy" as any)}
          />
          <SupportCard
            icon="document-text-outline"
            title="Terms of Service"
            description="Review account, payment, and content usage terms."
            onPress={() => router.push("/terms" as any)}
          />
          <SupportCard
            icon="chatbubble-ellipses-outline"
            title="Contact Us"
            description="Open the public support and contact page."
            onPress={() => router.push("/contact" as any)}
          />
          <SupportCard
            icon="trash-outline"
            title="Delete Account"
            description="See the public account deletion instructions and contact path."
            onPress={() => router.push("/delete-account" as any)}
          />
          <SupportCard
            icon="mail-outline"
            title="Email Support"
            description="Contact us for account, billing, or technical issues."
            onPress={() => Linking.openURL(`mailto:${CHICOO_SUPPORT_EMAIL}`)}
          />
          <SupportCard
            icon="document-text-outline"
            title="Billing Questions"
            description="Learn how credits, subscriptions, and payments work."
            onPress={() => Linking.openURL(`mailto:${CHICOO_BILLING_EMAIL}?subject=Billing%20Question`)}
          />
          <SupportCard
            icon="shield-checkmark-outline"
            title="Privacy & Security"
            description="Request account data export or account deletion help."
            onPress={() => Linking.openURL(`mailto:${CHICOO_PRIVACY_EMAIL}?subject=Privacy%20Request`)}
          />
        </View>
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
    overflow: "hidden",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.cardBorder,
  },
  cardTitle: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    fontSize: 14,
    marginBottom: 2,
  },
  cardDescription: {
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});
