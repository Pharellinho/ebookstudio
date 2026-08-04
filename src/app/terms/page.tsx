import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { founder, launch, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description: `The terms that apply when you use ${site.name}, including the waitlist, accounts, subscriptions and acceptable use.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro="By using this site you agree to these Terms. If you do not agree, do not use the site or sign up for the Services."
      sections={[
        {
          number: "1.",
          heading: "Acknowledgment and acceptance",
          body: [
            `By using any ${site.name} services ("Services") — including this website, the waitlist, and the ebook studio after launch — you agree to be bound by these Terms of Service ("Terms"). The Services are operated under the name ${site.name} at ${site.domain}.`,
            "We may change these Terms at any time. Continued use of the Services after changes are posted means you accept the revised Terms. We encourage you to review this page regularly.",
            "Your agreement with us becomes effective as soon as you start using the site (including joining the waitlist). Your remedy for dissatisfaction with the site or Services is to stop using them.",
          ],
        },
        {
          number: "2.",
          heading: "Waitlist (pre-launch)",
          body: [
            `Until ${launch.label}, the primary Service available is the founding waitlist. Joining requires an accurate email address. You may not use an email address that you do not control or that violates a third party's rights.`,
            "We use your email to confirm your place in the queue, send launch and founding-offer updates, and (if you used a referral link) attribute referrals. Joining the waitlist does not create a paid subscription by itself.",
            `Founding members who join before launch may lock the founding price of $${founder.monthlyPrice}/mo when they subscribe after access opens, subject to the offer terms shown on the site at the time of signup.`,
          ],
        },
        {
          number: "3.",
          heading: "Membership and accounts",
          body: [
            "After launch, full use of the studio requires registration with an accurate email address. You may not use someone else's email or an address that violates third-party rights.",
            "Email is our primary way to reach you (system updates, product news, account status and support). You are responsible for reading those messages. We are not responsible if you miss information because you ignored or filtered our emails.",
            "You must keep your login credentials confidential and are responsible for all activity under your account. Notify us promptly at the contact email below if you become aware of unauthorized access. We are not liable for unauthorized use of your account that results from your failure to safeguard credentials.",
            "If you sign up on behalf of an employer or organization, that entity is the account owner and you warrant that you have authority to bind them to these Terms.",
          ],
        },
        {
          number: "4.",
          heading: "Account ownership",
          body: [
            "You may request a transfer of account ownership by contacting us and updating account information. Once transferred, you may no longer claim ownership of that account.",
            "If ownership is disputed, we may, to the extent we reasonably can, determine the rightful owner or suspend the account until the parties resolve the dispute. Outstanding amounts remain payable by the rightful owner.",
          ],
        },
        {
          number: "5.",
          heading: "Payments, plans and refunds",
          body: [
            `There is no free plan at launch. Creating, exporting and selling books requires a paid subscription (or other paid package we may offer). Public plans start from the prices shown on our Pricing page; founding waitlist members may receive the founding rate described on the site.`,
            "Subscriptions renew automatically each billing cycle until cancelled. One-time credit or add-on purchases, if offered, are billed when purchased.",
            "Because generation and hosting costs are incurred when you use the Service, we do not offer partial or full refunds on subscriptions or credit purchases, except where required by applicable law.",
            "We may change plan prices and terms. Changes will be posted on the site. Price changes for an active subscription typically apply from the next renewal, unless otherwise stated or required by law.",
          ],
        },
        {
          number: "6.",
          heading: "Credits and generated content",
          body: [
            "Paid plans may include a monthly credit allowance. Credits refresh each billing period and do not roll over unless we explicitly say otherwise. Regenerating chapters, covers or books may consume credits as described in the product.",
            "Subject to these Terms and applicable law, you own the ebooks and covers you generate and may sell them commercially under the commercial licence included with paid plans. You remain responsible for reviewing output, ensuring it is lawful, and that publishing it does not infringe others' rights.",
            "You must not use the Service to generate illegal, defamatory, fraudulent or abusive content, or to impersonate a real person without authority.",
          ],
        },
        {
          number: "7.",
          heading: "Cancellation and termination by you",
          body: "You may cancel a subscription at any time through your account or by contacting us. To avoid being billed for the next cycle, cancel before the renewal date. Access typically continues until the end of the period already paid for.",
        },
        {
          number: "8.",
          heading: "Disclaimer of warranties",
          body: [
            'THE SERVICES AND MATERIALS ARE PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT.',
            "We do not warrant that the Services will meet your requirements, be uninterrupted, timely, secure or error-free, or that results (including generated text, covers or files) will be accurate, reliable or suitable for any particular store or audience. You use the Services and download materials at your own risk.",
            "Some jurisdictions do not allow certain warranty exclusions; some of the above may not apply to you.",
          ],
        },
        {
          number: "9.",
          heading: "Limitation of liability",
          body: [
            "TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR AFFILIATES ARE NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA OR USE, ARISING FROM YOUR USE OF THE SITE OR SERVICES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.",
            "We are not liable for third-party platforms (for example Amazon KDP, Etsy or payment processors) or for outcomes of commercial transactions you run with files exported from the Service.",
            "Some jurisdictions do not allow certain liability limits; some of the above may not apply to you.",
          ],
        },
        {
          number: "10.",
          heading: "Indemnification",
          body: "You agree to defend, indemnify and hold us and our affiliates harmless from claims, liabilities and expenses (including reasonable attorneys' fees) arising from your use or misuse of the site, your content, or your breach of these Terms. We may assume exclusive defense of any matter subject to indemnification; you will cooperate with us.",
        },
        {
          number: "11.",
          heading: "International use",
          body: "The site may be accessible worldwide. We do not represent that the Services are appropriate or available everywhere. You are responsible for complying with local laws. Offers are void where prohibited.",
        },
        {
          number: "12.",
          heading: "Termination by us",
          body: [
            "We may suspend or terminate your access, with or without notice, for any reason including breach of these Terms, suspected fraud, abuse or illegal activity. We may refer such activity to law enforcement.",
            "On termination, your right to use the Services ends immediately. We may deactivate or delete your account and related files. We are not liable for damages arising from suspension or termination.",
          ],
        },
        {
          number: "13.",
          heading: "Notices",
          body: `Notices to us must be sent by email to ${site.contactEmail}. Notices to you may be sent to the email on your waitlist or account, or shown on the site. Site-wide notices count as notice when posted or sent.`,
        },
        {
          number: "14.",
          heading: "Entire agreement and miscellaneous",
          body: [
            "These Terms are the entire agreement between you and us regarding the Services and supersede prior agreements on that subject. They may only be amended in a writing we accept, or by updated Terms posted on this page.",
            "If any part of these Terms is held invalid, the rest remains in effect. Our failure to enforce a provision is not a waiver. You may not assign your rights under these Terms without our consent; we may assign ours. Force majeure events excuse delay or non-performance beyond our reasonable control.",
            "Any claim you bring against us related to these Terms or the Services must be filed within one year after it arises, or it is waived, to the extent allowed by law.",
          ],
        },
      ]}
    />
  );
}
