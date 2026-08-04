import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects your personal information — today on the waitlist, and when the studio launches.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={`At ${site.name}, we respect your privacy and are committed to protecting your personal information.`}
      sections={[
        {
          number: "01",
          heading: "Commitment to privacy",
          body: [
            `This Privacy Policy explains how we collect, use and safeguard the information you provide when using ${site.name} (${site.domain}), including our waitlist today and the ebook studio after launch.`,
            "By joining the waitlist or creating an account, you agree to the practices described here.",
          ],
        },
        {
          number: "02",
          heading: "Information we collect",
          body: [
            "Today (pre-launch): the only personal information we collect is your email address when you join the waitlist. If you arrive through a referral link, we also store the referral code that brought you here so we can credit the person who invited you.",
            "After launch: when you create an account we collect the email you use to sign up and log in. When you subscribe, our payment provider (Stripe) processes your payment details — we do not store full card numbers on our servers. When you use the studio, we store the ideas you submit, the books and covers you generate, export files, and usage needed to run your account (such as credit balance and plan status).",
            "Like most websites, we may also receive standard technical data from your browser (for example IP address, device type and pages visited) to keep the service secure and working.",
          ],
        },
        {
          number: "03",
          heading: "How we use your information",
          body: [
            "Your email is used to confirm your waitlist place, send launch and founding-offer updates, and — after launch — to manage your account, logins and support.",
            "Studio content (prompts, manuscripts, covers and exports) is used to deliver the product you asked for: generating, storing and exporting your ebooks. We may review generated content in aggregate or on a case-by-case basis to improve quality and catch abuse. We will never sell your ebooks or share them publicly as our own.",
            "We do not sell your personal information. We only share data with service providers that help us run EbookStudio (for example hosting, email delivery, authentication, payments and generation infrastructure), and only as needed to provide the service.",
          ],
        },
        {
          number: "04",
          heading: "Data deletion",
          body: `You can request deletion of your waitlist entry, account and associated data — including generated books and activity history — at any time. Email ${site.contactEmail} and our team will delete it. Some records may be kept where the law requires it (for example payment receipts).`,
        },
        {
          number: "05",
          heading: "Your rights",
          body: `Depending on where you live, you may have the right to access, correct or delete your personal information, or to object to certain processing. To exercise those rights, make a complaint, or ask about this policy, email ${site.contactEmail}.`,
        },
      ]}
    />
  );
}
