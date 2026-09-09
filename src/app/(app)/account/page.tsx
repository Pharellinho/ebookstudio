import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserProfile } from "@clerk/nextjs";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { ManageBillingButton } from "@/components/app/manage-billing-button";
import { getCurrentProfile } from "@/lib/auth/session";
import { FOUNDING_PRICE, PLAN_NAMES, PLAN_PRICES } from "@/lib/billing/plans";
import { stripeConfigured } from "@/lib/billing/stripe";
import { loadBilling, syncCheckoutSession, type Billing } from "@/lib/billing/subscription";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/account">;

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

/** One sentence on where the subscription stands, for the account page. */
function statusLine(billing: Billing): { text: string; warn: boolean } | null {
  const date = formatDate(billing.currentPeriodEnd);
  if (billing.plan === "free") return null;
  if (billing.subscriptionStatus === "past_due") {
    return { text: "The last payment failed. Update your card to keep your plan.", warn: true };
  }
  if (billing.cancelAtPeriodEnd) {
    return { text: date ? `Cancelled. Your plan stays on until ${date}.` : "Cancelled at the end of the period.", warn: true };
  }
  if (billing.subscriptionStatus === "trialing") {
    return { text: date ? `Trial until ${date}.` : "On trial.", warn: false };
  }
  return { text: date ? `Renews on ${date}.` : "Active.", warn: false };
}

export default async function AccountPage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  /* Back from Stripe: apply the session before the webhook gets here, so
     the plan is already on screen. Any failure just leaves it to the webhook. */
  const { checkout, session_id: sessionId } = await searchParams;
  let justPaid = false;
  let billing = profile.billing;
  if (checkout === "success" && typeof sessionId === "string" && stripeConfigured()) {
    try {
      justPaid = await syncCheckoutSession(sessionId, profile.id);
      if (justPaid) billing = await loadBilling(profile.id);
    } catch (error) {
      console.error("checkout return sync failed", error);
    }
  }

  const paid = billing.plan !== "free";
  const status = statusLine(billing);
  const studioPrice = profile.isFounder ? FOUNDING_PRICE : PLAN_PRICES.studio;

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight">Profile</h1>

      <section
        aria-labelledby="plan-heading"
        className="mb-6 rounded-2xl border border-border/80 bg-background p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
      >
        {justPaid ? (
          <p className="mb-4 flex items-center gap-2 rounded-xl bg-primary-soft px-4 py-3 text-sm font-semibold text-foreground">
            <CheckCircle2 className="size-4 text-primary-strong" aria-hidden="true" />
            Thank you. Your plan is on, and every export is now open.
          </p>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p id="plan-heading" className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              Your plan
            </p>
            <p className="mt-1 font-display text-2xl font-extrabold tracking-tight">{PLAN_NAMES[billing.plan]}</p>
            {status ? (
              <p className={status.warn ? "mt-1 text-sm font-semibold text-destructive" : "mt-1 text-sm text-muted-foreground"}>
                {status.text}
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                One complete book, read in full on screen. A plan opens the exports, the coloring studio and more books.
              </p>
            )}
          </div>
          {paid ? (
            <ManageBillingButton />
          ) : (
            <div className="flex flex-col items-end gap-1">
              <Link
                href="/upgrade?plan=studio"
                prefetch={false}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong"
              >
                Get Studio · ${studioPrice}/mo
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/pricing" className="text-xs font-semibold text-muted-foreground underline-offset-4 hover:underline">
                Compare plans
              </Link>
            </div>
          )}
        </div>
        {paid ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Invoices, card, plan change and cancellation live in the billing page, run by Stripe.
          </p>
        ) : null}
      </section>

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "shadow-none border-0",
            },
            variables: {
              colorPrimary: "#d4a017",
            },
          }}
        />
      </div>
    </div>
  );
}
