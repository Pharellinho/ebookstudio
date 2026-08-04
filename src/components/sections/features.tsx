import { BookOpen, Download, PenLine, Sparkles } from "lucide-react";

const items = [
  {
    icon: Sparkles,
    title: "From idea to finished book",
    body: "Write one sentence about what you know. The studio turns it into a titled, chaptered, fully written ebook.",
  },
  {
    icon: PenLine,
    title: "Covers that earn the click",
    body: "A professional cover designed for you, the kind that still reads clearly as a thumbnail on a crowded store page.",
  },
  {
    icon: BookOpen,
    title: "Ebooks and coloring books",
    body: "Lead magnets, guides, reports, workbooks, course companions and novels, plus a studio for print-ready coloring books.",
  },
  {
    icon: Download,
    title: "Store-ready in one click",
    body: "Export a clean, typeset PDF or EPUB that is ready for KDP, Etsy or Apple Books the same day.",
  },
];

export function Features() {
  return (
    <section id="features" className="py-20 lg:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow-pill">Features</p>
          <h2 className="mt-5 font-display text-4xl font-extrabold sm:text-5xl">
            Everything you need to publish and profit
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            No writing degree, no design skills, no ghostwriter invoice. Your
            idea and a few minutes.
          </p>
        </div>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary-soft text-primary-strong">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-display text-base font-bold">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
