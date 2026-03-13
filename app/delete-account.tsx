import { Linking } from "react-native";
import CompliancePageLayout from "@/components/CompliancePageLayout";
import { CHICOO_PRIVACY_EMAIL } from "@/lib/public-site";

export default function DeleteAccountScreen() {
  return (
    <CompliancePageLayout
      activePage="deleteAccount"
      eyebrow="Chicoo Account"
      title="Delete Account"
      intro="Chicoo users can request deletion directly in the app or contact the privacy team through this public page if app access is unavailable."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: "Delete from inside the app",
          bullets: [
            "Open Chicoo.",
            "Go to Profile.",
            "Tap Delete Account and confirm the request.",
          ],
        },
        {
          title: "Delete without app access",
          paragraphs: [
            `If you cannot sign in, email ${CHICOO_PRIVACY_EMAIL} from the address linked to your account and use the subject line "Delete My Chicoo Account".`,
          ],
        },
        {
          title: "What deletion covers",
          bullets: [
            "Your Chicoo account profile.",
            "Saved uploaded portraits, wardrobe data, favorites, and account-linked generated content where technically applicable.",
            "Associated login credentials and active access to the app.",
          ],
        },
        {
          title: "What may be retained",
          paragraphs: [
            "Certain records may be retained for a limited period when required for fraud prevention, chargebacks, payment reconciliation, tax, legal compliance, or security investigations.",
          ],
        },
      ]}
      actions={[
        {
          label: "Email deletion request",
          icon: "mail-outline",
          onPress: () => Linking.openURL(`mailto:${CHICOO_PRIVACY_EMAIL}?subject=Delete%20My%20Chicoo%20Account`),
        },
      ]}
    />
  );
}
