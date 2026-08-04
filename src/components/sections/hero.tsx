import { WaitlistForm } from "@/components/waitlist-form";
import { Countdown } from "@/components/countdown";
import { PlatformStrip } from "@/components/sections/platform-strip";
import { founder } from "@/lib/site";
import { getWaitlistStats } from "@/lib/waitlist";

export async function Hero() {
  const stats = await getWaitlistStats();

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
          {stats.spotsLeft} of {founder.spots} founding spots left
        </p>

        <h1 className="mx-auto mt-7 max-w-4xl font-display text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          Create once.{" "}
          <span className="box-decoration-clone bg-primary px-2">
            Get paid forever.
          </span>
        </h1>

        <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          One idea in. A finished ebook, cover and store-ready files out. Join
          before launch and lock the founding price for as long as you stay.
        </p>

        <div className="mx-auto mt-9 max-w-xl">
          <WaitlistForm />
        </div>

        <div className="mt-10">
          <Countdown />
        </div>
      </div>

      <PlatformStrip />
    </section>
  );
}
