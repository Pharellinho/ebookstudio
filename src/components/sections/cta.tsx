import { WaitlistForm } from "@/components/waitlist-form";
import { founder, launch } from "@/lib/site";
import { getWaitlistStats } from "@/lib/waitlist";

export async function Cta() {
  const stats = await getWaitlistStats();

  return (
    <section className="relative overflow-hidden border-t border-border bg-surface-warm py-20 lg:py-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-64 left-1/2 size-[44rem] -translate-x-1/2 rounded-full bg-linear-to-t from-primary/15 to-transparent blur-3xl"
      />
      <div className="container-page relative mx-auto max-w-2xl text-center">
        <h2 className="font-display text-4xl font-extrabold sm:text-5xl">
          Your knowledge is worth more than you think
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
          We open the doors on {launch.label}. Join the waitlist now and keep $
          {founder.monthlyPrice}/mo instead of ${founder.launchPrice} when you
          subscribe.
        </p>

        <div className="mx-auto mt-9 max-w-lg">
          <WaitlistForm />
        </div>

        <p className="mt-6 text-sm font-semibold text-muted-foreground">
          {stats.spotsLeft} founding spots still open
        </p>
      </div>
    </section>
  );
}
