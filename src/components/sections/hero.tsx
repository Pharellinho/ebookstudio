import { PlatformStrip } from "@/components/sections/platform-strip";
import { HeroIdeaForm } from "@/components/sections/hero-idea-form";
import { Doodle } from "@/components/ui/doodle";

export function Hero() {
  return (
    <section className="relative">
      {/* Spacing here is tight on purpose: the headline, the idea box and the
          example chips all have to land above the fold on a 13" laptop. */}
      <div className="container-page relative pt-12 text-center lg:pt-14">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-surface-warm px-3.5 py-1.5 text-xs font-medium text-muted-foreground">
          <span
            className="size-1.5 rounded-full bg-primary"
            aria-hidden="true"
          />
          Free to start · No card required
        </p>

        <h1 className="mx-auto mt-6 max-w-4xl font-display text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-5xl lg:text-6xl">
          {/* The inline-block hugs the widest line so the doodles anchor to the
              words themselves, not to the max-w-4xl box. */}
          <span className="relative inline-block">
            Write it once.
            <br className="hidden sm:block" />{" "}
            <span className="text-primary-strong">Get paid</span> for years.
            <Doodle
              kind="circle"
              className="absolute left-1/2 top-1/2 hidden h-auto w-[108%] -translate-x-1/2 -translate-y-1/2 text-primary sm:block"
            />
            <Doodle
              kind="sparkle"
              className="absolute -left-4 -top-6 size-7 text-primary sm:-left-12 sm:-top-8 sm:size-9"
            />
            <Doodle
              kind="sparkle"
              className="absolute -right-3 -top-3 size-4 text-primary sm:-right-9 sm:top-0"
            />
            <Doodle
              kind="sparkle"
              className="absolute -bottom-3 right-2 size-3 text-primary-strong sm:-right-6 sm:bottom-1"
            />
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-muted-foreground lg:text-lg">
          One idea in, a finished ebook out — manuscript, cover, and files ready
          for Amazon KDP. Commercial rights included, no royalties to us.
        </p>

        <HeroIdeaForm />
      </div>

      <div className="mt-14 lg:mt-16">
        <PlatformStrip />
      </div>
    </section>
  );
}
