import { Check, Loader } from "lucide-react";

const chapters = [
  { title: "1. Why your energy collapses at 3pm", state: "done" },
  { title: "2. The 30-day reset framework", state: "done" },
  { title: "3. Week one: subtract before you add", state: "done" },
  { title: "4. Week two: anchor two keystone habits", state: "writing" },
  { title: "5. Week three: protect the calendar", state: "queued" },
  { title: "6. Week four: make it boring and permanent", state: "queued" },
];

export function BookPreview() {
  return (
    <div className="relative">
      <div className="rounded-3xl border border-border bg-background p-5 shadow-xl">
        <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Generating · How-To Guide
            </p>
            <p className="mt-1 font-display text-base font-semibold">
              The 30-Day Energy Reset
            </p>
          </div>
          <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent-strong">
            68%
          </span>
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-[7.5rem_1fr]">
          <div className="relative mx-auto aspect-2/3 w-30 overflow-hidden rounded-lg bg-linear-to-br from-primary via-secondary to-accent p-3 text-on-primary shadow-lg sm:mx-0">
            <p className="font-display text-[0.6rem] font-medium uppercase tracking-widest opacity-80">
              A practical guide
            </p>
            <p className="mt-6 font-display text-sm font-bold leading-tight">
              The 30-Day Energy Reset
            </p>
            <p className="absolute bottom-3 left-3 text-[0.6rem] font-medium opacity-80">
              M. Reinholt
            </p>
          </div>

          <ul className="space-y-2.5">
            {chapters.map((chapter) => (
              <li key={chapter.title} className="flex items-start gap-2.5">
                {chapter.state === "done" ? (
                  <span className="mt-0.5 flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary">
                    <Check
                      className="size-3 text-on-primary"
                      aria-hidden="true"
                    />
                  </span>
                ) : chapter.state === "writing" ? (
                  <Loader
                    className="mt-0.5 size-4.5 shrink-0 animate-spin text-accent"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="mt-0.5 size-4.5 shrink-0 rounded-full border border-border" />
                )}
                <span
                  className={
                    chapter.state === "queued"
                      ? "text-sm text-muted-foreground/70"
                      : "text-sm text-foreground"
                  }
                >
                  {chapter.title}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 rounded-xl bg-muted p-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            <span className="text-foreground">Chapter 4 · </span>
            Two habits, chosen well, do more for your week than ten habits you
            abandon by Thursday. This week you pick them and nothing else…
          </p>
        </div>
      </div>

      <div className="absolute -bottom-5 -left-4 hidden rounded-xl border border-border bg-background px-4 py-3 shadow-lg sm:block">
        <p className="text-xs text-muted-foreground">Exports ready</p>
        <p className="font-display text-sm font-semibold">PDF · EPUB · DOCX</p>
      </div>
    </div>
  );
}
