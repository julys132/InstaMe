import { Linking } from "react-native";
import { router } from "expo-router";
import CompliancePageLayout from "@/components/CompliancePageLayout";
import {
  CHICOO_BILLING_EMAIL,
  CHICOO_PRIVACY_EMAIL,
  CHICOO_SUPPORT_EMAIL,
  PUBLIC_PAGE_PATHS,
} from "@/lib/public-site";

export default function ContactScreen() {
  return (
    <CompliancePageLayout
      activePage="contact"
      eyebrow="Chicoo Support"
      title="Contact Us"
      intro="Use the contact options below for support, billing, privacy requests, and account deletion help. This page is public and can also be used in store listings."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: "Support channels",
          bullets: [
            `General support: ${CHICOO_SUPPORT_EMAIL}`,
            `Billing support: ${CHICOO_BILLING_EMAIL}`,
            `Privacy requests: ${CHICOO_PRIVACY_EMAIL}`,
          ],
        },
        {
          title: "What to include",
          bullets: [
            "The email address tied to your Chicoo account.",
            "A short description of the issue or request.",
            "For billing requests, include the payment date and platform if known.",
            "For deletion requests, clearly state whether you want account deletion or data export.",
          ],
        },
        {
          title: "Account deletion help",
          paragraphs: [
            "If you cannot access the app, you can still request deletion through the public delete-account page and privacy contact.",
          ],
        },
      ]}
      actions={[
        {
          label: "Email support",
          icon: "mail-outline",
          onPress: () => Linking.openURL(`mailto:${CHICOO_SUPPORT_EMAIL}?subject=Chicoo%20Support`),
        },
        {
          label: "Delete account page",
          icon: "trash-outline",
          variant: "secondary",
          onPress: () => router.push(PUBLIC_PAGE_PATHS.deleteAccount as any),
        },
      ]}
    />
  );
}
