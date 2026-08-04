import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { Countdown } from "@/components/countdown";
import { ReferralLink } from "@/components/referral-link";
import { founder, launch, site } from "@/lib/site";
import { getStanding } from "@/lib/waitlist";

export const metadata: Metadata = {
  title: `You are on the list | ${site.name}`,
  robots: { index: false, follow: false },
};

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const standing = code ? await getStanding(code) : null;

  if (!standing) {
    return (
      <section className="container-page py-24 text-center">
        <h1 className="font-display text-4xl font-extrabold">
          We could not find that spot
        </h1>
        <p className="mx-auto mt-4 max-w-md text-muted-foreground">
          The link may be incomplete. Join again with the same email address and
          you will get your original position back.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-primary px-7 py-3.5 font-bold text-on-primary transition-colors hover:bg-primary-strong"
        >
          Back to the waitlist
        </Link>
      </section>
    );
  }

  const referralUrl = `${site.url}/?ref=${code}`;
  const remaining = Math.max(
    founder.referralsForFreeSpot - standing.referrals,
    0,
  );

  return (
    <section className="relative overflow-hidden py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-56 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-linear-to-b from-primary-soft to-transparent blur-3xl"
      />

      <div className="container-page relative mx-auto max-w-2xl text-center">
        <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>

        <h1 className="mt-6 font-display text-4xl font-extrabold sm:text-5xl">
          Your founding spot is reserved
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
          Confirmation sent to{" "}
          <span className="font-semibold text-foreground">
            {standing.email}
          </span>
          . On {launch.label} we email you an access link with $
          {founder.monthlyPrice}/mo locked in.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { value: `#${standing.position}`, label: "Your position" },
            {
              value: `${standing.bonusCredits}`,
              label: "Bonus credits waiting",
            },
            { value: `${standing.spotsLeft}`, label: "Spots still open" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-border bg-background p-5 shadow-sm"
            >
              <p className="font-display text-3xl font-extrabold text-primary">
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border bg-surface-warm p-8 text-left">
          <h2 className="font-display text-xl font-extrabold">
            Move up the queue
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Every person who joins with your link moves you up{" "}
            {founder.referralJump} places and adds {founder.referralCredits}{" "}
            bonus credits.{" "}
            {standing.freeSpotEarned
              ? "You have earned a free founding year."
              : `${remaining} more and your first year is free.`}
          </p>

          <div className="mt-5">
            <ReferralLink url={referralUrl} />
          </div>

          <p className="mt-4 text-sm font-semibold">
            {standing.referrals} invited so far
          </p>
        </div>

        <div className="mt-12">
          <Countdown />
        </div>

        <p className="mt-10 inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Mail className="size-4" aria-hidden="true" />
          Nothing in your inbox yet? Check spam, then write to{" "}
          {site.contactEmail}.
        </p>
      </div>
    </section>
  );
}
