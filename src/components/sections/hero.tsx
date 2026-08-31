import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { PlatformStrip } from "@/components/sections/platform-strip";
import { founder } from "@/lib/site";
import { getWaitlistStats } from "@/lib/waitlist";

export async function Hero() {
  const stats = await getWaitlistStats();
  const taken = founder.spots - stats.spotsLeft;
  const filled = Math.round((taken / founder.spots) * 100);

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-32 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-primary/40 blur-3xl"
      />

      <div className="container-page relative pb-14 pt-14 text-center lg:pt-20">
        <p className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-primary px-4 py-1.5 text-sm font-bold text-foreground shadow-sm">
          <span
            className="size-2 animate-pulse rounded-full bg-foreground"
            aria-hidden="true"
          />
          The studio is live
        </p>

        <h1 className="mx-auto mt-7 max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Write it once.{" "}
          <span className="box-decoration-clone bg-primary px-2">
            Get paid for years.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          One idea in, a finished ebook out — manuscript, cover, and files ready
          for Amazon KDP. Commercial rights included, no royalties to us.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href="/signup" size="lg">
            Start your first book
            <ArrowRight className="size-4" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/#how-it-works" variant="secondary" size="lg">
            See how it works
          </ButtonLink>
        </div>

        {/* Replaces the old launch countdown: the urgency is the 100 spots. */}
        <div className="mx-auto mt-10 max-w-md rounded-2xl border-2 border-foreground bg-background p-5 shadow-md">
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-display text-3xl font-extrabold tabular-nums">
              {stats.spotsLeft}
              <span className="ml-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                of {founder.spots} founding spots left
              </span>
            </p>
          </div>
          <div
            className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
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
          <p className="mt-3 text-sm text-muted-foreground">
            Founding members pay ${founder.monthlyPrice}/mo for as long as they
            stay. The price goes to ${founder.launchPrice} once the spots are
            gone.
          </p>
        </div>
      </div>

      <PlatformStrip />
    </section>
  );
}
