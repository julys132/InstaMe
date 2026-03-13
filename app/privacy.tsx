import { Linking } from "react-native";
import { router } from "expo-router";
import CompliancePageLayout from "@/components/CompliancePageLayout";
import { CHICOO_PRIVACY_EMAIL, PUBLIC_PAGE_PATHS } from "@/lib/public-site";

export default function PrivacyScreen() {
  return (
    <CompliancePageLayout
      activePage="privacy"
      eyebrow="Chicoo Legal"
      title="Privacy Policy"
      intro="This page explains what information Chicoo collects, how we use it, and the choices users have over their account data and generated content."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: "Information we collect",
          bullets: [
            "Account information such as name, email address, sign-in provider, and account settings.",
            "User content you choose to upload, including portrait images, saved references, prompts, and generated outputs.",
            "Billing and subscription metadata needed to process credits, subscriptions, refunds, and fraud prevention.",
            "Technical information such as device type, app version, error logs, and request metadata used to keep the service secure and working.",
          ],
        },
        {
          title: "How we use information",
          bullets: [
            "To create, edit, and store AI-generated images requested by the user.",
            "To authenticate accounts, manage credits, process purchases, and provide customer support.",
            "To detect abuse, protect the platform, and investigate billing or security issues.",
            "To improve product reliability, performance, and safety.",
          ],
        },
        {
          title: "AI image processing",
          paragraphs: [
            "When you upload an image or submit a prompt, Chicoo may send that content to third-party AI providers that power generation and editing features. Those providers process the content only to fulfill the requested feature and are selected as part of the product infrastructure.",
            "Users should upload only content they are authorized to use. You remain responsible for the legality of the images and prompts you submit.",
          ],
        },
        {
          title: "Retention and deletion",
          paragraphs: [
            "Users can request account deletion from inside the app or by contacting the privacy team. When an account is deleted, Chicoo removes or anonymizes account-linked content except where limited retention is required for security, fraud prevention, chargebacks, tax, or legal compliance.",
          ],
        },
        {
          title: "Your choices",
          bullets: [
            "You can delete your account from the app profile screen.",
            "You can contact us to request account deletion, data export, or privacy support.",
            "You can manage Stripe billing through the in-app Manage Billing flow when applicable.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [`For privacy requests, email ${CHICOO_PRIVACY_EMAIL}.`],
        },
      ]}
      actions={[
        {
          label: "Email privacy team",
          icon: "mail-outline",
          onPress: () => Linking.openURL(`mailto:${CHICOO_PRIVACY_EMAIL}?subject=Privacy%20Request`),
        },
        {
          label: "Delete account options",
          icon: "trash-outline",
          variant: "secondary",
          onPress: () => router.push(PUBLIC_PAGE_PATHS.deleteAccount as any),
        },
      ]}
    />
  );
}
