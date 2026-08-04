import { testimonials } from "@/lib/content";

export function Testimonials() {
  const half = Math.ceil(testimonials.length / 2);
  const rowOne = testimonials.slice(0, half);
  const rowTwo = testimonials.slice(half);

  return (
    <section className="overflow-hidden py-20 lg:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">Creators</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            Books that shipped instead of staying in drafts
          </h2>
        </div>
      </div>

      <div className="mt-14 space-y-5">
        <MarqueeRow items={rowOne} />
        <MarqueeRow items={rowTwo} reverse />
      </div>
    </section>
  );
}

function MarqueeRow({
  items,
  reverse = false,
}: {
  items: typeof testimonials;
  reverse?: boolean;
}) {
  const loop = [...items, ...items];

  return (
    <div
      className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
      aria-hidden={reverse ? "true" : undefined}
    >
      <ul
        className={`flex w-max shrink-0 gap-5 pr-5 ${
          reverse ? "animate-marquee-reverse" : "animate-marquee"
        }`}
      >
        {loop.map((testimonial, position) => (
          <li
            key={`${testimonial.name}-${position}`}
            className="w-80 shrink-0 rounded-2xl border border-border bg-surface p-6"
          >
            <p className="leading-relaxed text-foreground">
              “{testimonial.quote}”
            </p>
            <p className="mt-5 text-sm font-semibold">{testimonial.name}</p>
            <p className="text-sm text-muted-foreground">{testimonial.role}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
