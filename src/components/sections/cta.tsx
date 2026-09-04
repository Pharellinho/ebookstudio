import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Doodle } from "@/components/ui/doodle";
import { Reveal } from "@/components/ui/reveal";
import { pricing } from "@/lib/site";

export function Cta() {
  return (
    <section className="bg-surface-warm py-28 lg:py-40">
      <div className="container-page mx-auto max-w-2xl text-center">
        <Reveal
          as="h2"
          className="relative font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl"
        >
          Your knowledge is worth more than you think
          <Doodle
            kind="sparkle"
            className="absolute -top-7 left-2 size-7 text-primary sm:-left-8 sm:-top-9 sm:size-9"
          />
          <Doodle
            kind="sparkle"
            className="absolute -right-1 -top-4 size-4 text-primary sm:-right-8 sm:-top-2"
          />
          <Doodle
            kind="sparkle"
            className="absolute -bottom-5 right-6 size-3 text-primary-strong sm:-right-2 sm:-bottom-3"
          />
        </Reveal>

        <Reveal
          as="p"
          delay={70}
          className="mt-6 text-lg leading-relaxed text-muted-foreground"
        >
          ${pricing.monthlyPrice} a month, {pricing.monthlyCredits} credits,
          commercial rights on everything you make. Cancel anytime.
        </Reveal>

        <Reveal
          delay={140}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row"
        >
          <ButtonLink href="/signup" size="lg">
            Start your first book
            <ArrowRight className="size-4 text-primary" aria-hidden="true" />
          </ButtonLink>
          <ButtonLink href="/pricing" variant="secondary" size="lg">
            See pricing
          </ButtonLink>
        </Reveal>
      </div>
    </section>
  );
}
