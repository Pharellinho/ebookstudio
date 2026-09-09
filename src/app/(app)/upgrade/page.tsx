import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckoutRedirect } from "@/components/app/checkout-redirect";
import { getCurrentProfile } from "@/lib/auth/session";
import { PLAN_NAMES, isPaidPlan, priceFor } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Upgrade",
  robots: { index: false, follow: false },
};

type Props = PageProps<"/upgrade">;

/**
 * /upgrade?plan=studio — the one door to a paid plan. Signed out, Clerk
 * brings the visitor back here after signing in or up; signed in, the
 * page opens Stripe Checkout. An account that already pays goes to its
 * account page, where the plan is changed through the portal.
 */
export default async function UpgradePage({ searchParams }: Props) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const { plan: wanted } = await searchParams;
  const plan = isPaidPlan(wanted) ? wanted : "studio";
  if (profile.billing.plan !== "free") redirect("/account");

  return (
    <div className="mx-auto max-w-2xl py-8">
      <p className="text-center text-[10px] font-bold uppercase tracking-wide text-primary-strong">
        {PLAN_NAMES[plan]} · ${priceFor(plan, profile.isFounder)}/mo
        {profile.isFounder && plan === "studio" ? " · founding price" : ""}
      </p>
      <div className="mt-4">
        <CheckoutRedirect plan={plan} />
      </div>
    </div>
  );
}
