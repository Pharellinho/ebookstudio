import { Check, Gift, Lock, Users } from "lucide-react";
import { WaitlistForm } from "@/components/waitlist-form";
import { founder, launch } from "@/lib/site";
import { getWaitlistStats } from "@/lib/waitlist";

const founderPerks = [
  `$${founder.monthlyPrice}/mo locked for as long as you stay subscribed`,
  `${founder.monthlyCredits} credits every month instead of ${founder.launchCredits}`,
  `${founder.bonusCredits} bonus credits the day you get access`,
  "Early access before public launch",
  "Commercial rights on everything you generate",
];

export async function FounderOffer() {
  const stats = await getWaitlistStats();
  const taken = founder.spots - stats.spotsLeft;
  const filled = Math.round((taken / founder.spots) * 100);

  return (
    <section
      id="founding-offer"
      className="border-y border-border bg-surface-warm py-20 lg:py-24"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">Founding offer</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            The first {founder.spots} people pay less, forever
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            On {launch.label} the public price starts at $
            {founder.launchPrice}/mo. Everyone who joins before then keeps the
            founding rate instead.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-4xl items-stretch gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-border bg-background p-8">
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-muted-foreground">
              At launch
            </p>
            <p className="mt-4 font-display text-4xl font-extrabold text-muted-foreground">
              ${founder.launchPrice}
              <span className="text-base font-semibold">/mo</span>
            </p>
            <p className="mt-2 font-semibold text-muted-foreground">
              {founder.launchCredits} credits every month
            </p>
            <ul className="mt-7 space-y-3">
              {[
                "Standard monthly price",
                `${founder.launchCredits} credits every month`,
                "No bonus credits",
                "Access when everyone else gets it",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                  />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative rounded-3xl border-2 border-foreground bg-primary-soft p-8 shadow-lg">
            <span className="absolute -top-3.5 left-8 rounded-full border-2 border-foreground bg-primary px-4 py-1.5 text-xs font-extrabold uppercase tracking-wide text-on-primary shadow-sm">
              Founding member
            </span>

            <p className="text-sm font-extrabold uppercase tracking-[0.14em]">
              Join before {launch.label}
            </p>
            <div className="mt-4 flex items-baseline gap-3">
              <p className="font-display text-5xl font-extrabold">
                ${founder.monthlyPrice}
                <span className="text-base font-semibold text-muted-foreground">
                  /mo
                </span>
              </p>
              <p className="text-lg font-semibold text-muted-foreground line-through">
                ${founder.launchPrice}
              </p>
            </div>
            <p className="mt-2 font-semibold">
              {founder.monthlyCredits} credits every month
            </p>

            <ul className="mt-7 space-y-3">
              {founderPerks.map((perk) => (
                <li key={perk} className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                    <Check
                      className="size-3 text-primary-strong"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="text-sm text-muted-foreground">{perk}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">
                  {taken} of {founder.spots} claimed
                </span>
                <span className="text-muted-foreground">
                  {stats.spotsLeft} left
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={filled}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Founding spots claimed"
              >
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${Math.max(filled, 2)}%` }}
                />
              </div>
            </div>

            <div className="mt-7">
              <WaitlistForm compact />
            </div>
          </div>
        </div>

        <div className="mx-auto mt-12 grid max-w-4xl gap-5 sm:grid-cols-3">
          {[
            {
              icon: Users,
              title: "Waitlist only",
              body: "Leave your email today. You subscribe when access opens, at the founding rate.",
            },
            {
              icon: Lock,
              title: "Price locked",
              body: `Your $${founder.monthlyPrice} rate holds for as long as your subscription stays active.`,
            },
            {
              icon: Gift,
              title: "Invite and earn",
              body: `Every friend who joins adds ${founder.referralCredits} bonus credits and moves you up the queue.`,
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-background p-5"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 font-display text-sm font-bold">
                {item.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
