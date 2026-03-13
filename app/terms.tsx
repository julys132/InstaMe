import { Linking } from "react-native";
import CompliancePageLayout from "@/components/CompliancePageLayout";
import { CHICOO_SUPPORT_EMAIL } from "@/lib/public-site";

export default function TermsScreen() {
  return (
    <CompliancePageLayout
      activePage="terms"
      eyebrow="Chicoo Legal"
      title="Terms of Service"
      intro="These terms describe how users may access Chicoo, buy credits or subscriptions, and use generated image features responsibly."
      lastUpdated="March 13, 2026"
      sections={[
        {
          title: "Accounts",
          bullets: [
            "You must provide accurate account information and keep your login credentials secure.",
            "You are responsible for activity that happens through your account unless you report unauthorized access promptly.",
          ],
        },
        {
          title: "Credits, purchases, and subscriptions",
          bullets: [
            "Chicoo may offer one-time credit packs and recurring subscriptions.",
            "Pricing, included credits, and plan features may change over time.",
            "Payments are processed by third-party payment providers and app store billing systems where applicable.",
            "Credits are intended for use within Chicoo and generally have no cash value.",
          ],
        },
        {
          title: "User content and generated results",
          bullets: [
            "You keep ownership of content you upload, subject to the rights needed for Chicoo to process and deliver the service.",
            "You are responsible for ensuring you have permission to upload images and request edits or generations based on them.",
            "Generated outputs may vary and should be reviewed by the user before publishing or commercial use.",
          ],
        },
        {
          title: "Acceptable use",
          bullets: [
            "Do not use Chicoo for unlawful, deceptive, exploitative, abusive, or rights-infringing content.",
            "Do not attempt to abuse payment systems, exploit credits, bypass safeguards, or interfere with platform operations.",
          ],
        },
        {
          title: "Service availability",
          paragraphs: [
            "Chicoo may update, improve, suspend, or discontinue parts of the service at any time. We aim for reliability, but uninterrupted availability is not guaranteed.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [`For support or legal questions about these terms, email ${CHICOO_SUPPORT_EMAIL}.`],
        },
      ]}
      actions={[
        {
          label: "Contact support",
          icon: "mail-outline",
          onPress: () => Linking.openURL(`mailto:${CHICOO_SUPPORT_EMAIL}?subject=Terms%20Question`),
        },
      ]}
    />
  );
}
