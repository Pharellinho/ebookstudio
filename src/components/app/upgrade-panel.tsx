import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import { FOUNDING_PRICE, PLAN_PRICES } from "@/lib/billing/plans";

/**
 * The wall a free account meets where a plan is needed: exports, the
 * coloring studio, a second book. One line on what opens, one button to
 * the checkout, one link to compare. No credit counts, no fine print.
 */
export function UpgradePanel({
  title,
  body,
  isFounder = false,
}: {
  title: string;
  body: string;
  isFounder?: boolean;
}) {
  const price = isFounder ? FOUNDING_PRICE : PLAN_PRICES.studio;
  return (
    <section className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary-soft/50 p-6">
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-primary-strong">
        <Lock className="size-3" aria-hidden="true" />
        Comes with a plan
      </p>
      <p className="mt-1 font-display text-lg font-semibold">{title}</p>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">{body}</p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Link
          href="/upgrade?plan=studio"
          prefetch={false}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary hover:bg-primary-strong"
        >
          Get Studio · ${price}/mo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
        <Link href="/pricing" className="text-sm font-semibold underline-offset-4 hover:underline">
          Compare plans
        </Link>
        {isFounder ? (
          <span className="text-xs font-semibold text-primary-strong">Founding price, yours for as long as you stay.</span>
        ) : null}
      </div>
    </section>
  );
}
