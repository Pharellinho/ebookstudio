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

const supportEmail = `hello@${site.domain}`;

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
  // Transactional wording helps Gmail avoid the Promotions tab.
  const subject = input.alreadyOnList
    ? `${site.name} waitlist confirmation (spot #${input.position})`
    : `${site.name} waitlist confirmation (spot #${input.position})`;

  try {
    const { error } = await resend.emails.send({
      from: fromAddress(),
      to: input.email,
      replyTo: supportEmail,
      subject,
      headers: {
        "List-Unsubscribe": `<mailto:${supportEmail}?subject=unsubscribe>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
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
    ? `This confirms you are already on the ${site.name} waitlist.`
    : `This confirms your place on the ${site.name} waitlist.`;

  return [
    intro,
    "",
    `Queue position: #${input.position}`,
    `Your spot page: ${input.welcomeUrl}`,
    "",
    `On ${launch.label} we will send your access link.`,
    `Founding price locked for waitlist members: $${founder.monthlyPrice}/mo.`,
    "",
    `Your personal invite link: ${input.referralUrl}`,
    "",
    `Support: ${supportEmail}`,
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
    ? `This confirms you are already on the ${site.name} waitlist.`
    : `This confirms your place on the ${site.name} waitlist.`;

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#ffffff;color:#111111;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;padding:32px 20px;">
      <p style="margin:0 0 8px;font-size:13px;color:#666666;">${escapeHtml(site.name)}</p>
      <h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:700;">
        Waitlist confirmation
      </h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        ${escapeHtml(intro)}
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Queue position: <strong>#${input.position}</strong>
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Spot page:<br />
        <a href="${escapeHtml(input.welcomeUrl)}" style="color:#111111;">${escapeHtml(input.welcomeUrl)}</a>
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        On ${escapeHtml(launch.label)} we will send your access link.
        Founding price for waitlist members: $${founder.monthlyPrice}/mo.
      </p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;">
        Your personal invite link:<br />
        <a href="${escapeHtml(input.referralUrl)}" style="color:#111111;">${escapeHtml(input.referralUrl)}</a>
      </p>
      <p style="margin:28px 0 0;font-size:13px;line-height:1.5;color:#666666;">
        Support:
        <a href="mailto:${escapeHtml(supportEmail)}" style="color:#666666;">${escapeHtml(supportEmail)}</a>
      </p>
    </div>
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
