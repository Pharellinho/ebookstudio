import { Resend } from "resend";
import { founder, launch, site } from "@/lib/site";

function getResend() {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function fromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    `${site.name} <onboarding@resend.dev>`
  );
}

export type WaitlistEmailInput = {
  email: string;
  code: string;
  position: number;
  alreadyOnList: boolean;
};

export async function sendWaitlistConfirmation(
  input: WaitlistEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  const resend = getResend();
  if (!resend) {
    return { sent: false, reason: "missing-api-key" };
  }

  const welcomeUrl = `${site.url}/welcome?code=${input.code}`;
  const referralUrl = `${site.url}/?ref=${input.code}`;
  const subject = input.alreadyOnList
    ? `Your ${site.name} spot is still #${input.position}`
    : `You're #${input.position} on the ${site.name} waitlist`;

  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.email,
      subject,
      html: renderWaitlistHtml({
        ...input,
        welcomeUrl,
        referralUrl,
        subject,
      }),
      text: renderWaitlistText({
        ...input,
        welcomeUrl,
        referralUrl,
      }),
    });

    if (error) {
      console.error("Resend waitlist email failed", error);
      return { sent: false, reason: error.message };
    }

    return { sent: true };
  } catch (error) {
    console.error("Resend waitlist email threw", error);
    return {
      sent: false,
      reason: error instanceof Error ? error.message : "unknown",
    };
  }
}

function renderWaitlistText(input: {
  position: number;
  alreadyOnList: boolean;
  welcomeUrl: string;
  referralUrl: string;
}) {
  const intro = input.alreadyOnList
    ? `You're already on the ${site.name} waitlist at position #${input.position}.`
    : `You're on the ${site.name} waitlist at position #${input.position}.`;

  return [
    intro,
    "",
    `Your spot page: ${input.welcomeUrl}`,
    `Invite friends (each one moves you up ${founder.referralJump} places): ${input.referralUrl}`,
    "",
    `On ${launch.label} we'll email you an access link with $${founder.monthlyPrice}/mo locked in.`,
    "",
    `Questions? ${site.contactEmail}`,
    site.name,
  ].join("\n");
}

function renderWaitlistHtml(input: {
  position: number;
  alreadyOnList: boolean;
  welcomeUrl: string;
  referralUrl: string;
  subject: string;
}) {
  const intro = input.alreadyOnList
    ? `You're already on the list. Your founding spot is still reserved.`
    : `Your founding spot is reserved.`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#f3efe6;color:#1c1915;font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaf2;border:1px solid #e4dccb;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:36px 32px 28px;background:linear-gradient(180deg,#2f5d4a 0%,#244a3b 100%);color:#f7f1e6;">
                <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;opacity:0.85;">${escapeHtml(site.name)}</p>
                <h1 style="margin:14px 0 0;font-size:30px;line-height:1.2;font-weight:700;">${escapeHtml(intro)}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px 32px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                <p style="margin:0;font-size:16px;line-height:1.6;color:#3f3a32;">
                  You are <strong style="color:#1c1915;">#${input.position}</strong> in line.
                  On ${escapeHtml(launch.label)} we will email you an access link with
                  <strong style="color:#1c1915;">$${founder.monthlyPrice}/mo</strong> locked in.
                </p>
                <p style="margin:20px 0 0;">
                  <a href="${escapeHtml(input.welcomeUrl)}" style="display:inline-block;background:#2f5d4a;color:#f7f1e6;text-decoration:none;font-weight:700;font-size:15px;padding:14px 22px;border-radius:999px;">
                    Open your spot
                  </a>
                </p>
                <p style="margin:28px 0 0;font-size:15px;line-height:1.6;color:#3f3a32;">
                  Share your invite link — every friend who joins moves you up
                  ${founder.referralJump} places and adds ${founder.referralCredits} bonus credits.
                </p>
                <p style="margin:12px 0 0;word-break:break-all;font-size:13px;line-height:1.5;">
                  <a href="${escapeHtml(input.referralUrl)}" style="color:#2f5d4a;">${escapeHtml(input.referralUrl)}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#7a7265;">
                Questions? Write to
                <a href="mailto:${escapeHtml(site.contactEmail)}" style="color:#2f5d4a;">${escapeHtml(site.contactEmail)}</a>.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
