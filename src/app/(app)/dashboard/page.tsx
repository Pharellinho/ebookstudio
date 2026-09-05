import type { Metadata } from "next";
import Link from "next/link";
import { BookCardActions } from "@/components/app/book-card-actions";
import { ResumeIdeaLink } from "@/components/app/resume-idea-link";
import {
  BookOpen,
  Clock,
  Layers,
  PenLine,
  Plus,
  Trophy,
  Zap,
} from "lucide-react";
import { getCurrentProfile } from "@/lib/auth/session";
import { getUserBookStats, listBooksForUser } from "@/lib/books";
import { getFormat } from "@/lib/generation/prompts";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const [stats, books] = await Promise.all([
    getUserBookStats(profile.id),
    listBooksForUser(profile.id, 5),
  ]);

  const firstName =
    profile.displayName?.split(" ")[0] ??
    profile.email?.split("@")[0] ??
    "there";

  const achievements = [
    {
      title: "First ebook",
      body: "Created your first ebook",
      icon: Trophy,
      earned: stats.totalBooks >= 1,
    },
    {
      title: "Publisher",
      body: "Created 5+ ebooks",
      icon: BookOpen,
      earned: stats.totalBooks >= 5,
    },
    {
      title: "Speedy creator",
      body: "Finished a ready ebook",
      icon: Zap,
      earned: stats.readyBooks >= 1,
    },
    {
      title: "Dedicated author",
      body: "Wrote 5,000+ words",
      icon: Clock,
      earned: stats.wordsWritten >= 5000,
    },
  ];

  return (
    <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-8 pb-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-[2rem] font-extrabold tracking-tight sm:text-4xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Pick up where you left off or start something new.
          </p>
        </div>
        <Link
          href="/create"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary shadow-[0_6px_18px_rgba(212,160,23,0.35)] transition-transform hover:-translate-y-0.5"
        >
          <Plus className="size-4" aria-hidden="true" />
          New ebook
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total ebooks"
          value={stats.totalBooks}
          icon={BookOpen}
        />
        <StatCard
          label="Chapters generated"
          value={stats.chaptersGenerated}
          icon={Layers}
        />
        <StatCard
          label="Words written"
          value={stats.wordsWritten}
          icon={PenLine}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold">Recent projects</h2>
          <Link
            href="/books"
            className="text-sm font-semibold text-primary-strong hover:underline"
          >
            View all →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            href="/create"
            className="group flex min-h-[220px] flex-col rounded-2xl border border-dashed border-foreground/15 bg-background p-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all hover:-translate-y-0.5 hover:border-primary/40"
          >
            <div className="flex flex-1 items-center justify-center rounded-xl bg-[#efe8dc]">
              <Plus className="size-8 text-muted-foreground transition-transform group-hover:scale-110" aria-hidden="true" />
            </div>
            <p className="mt-4 font-display text-base font-bold">
              Start new project
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create from scratch
            </p>
          </Link>

          {books.map((book) => {
            const format = getFormat(book.format_slug);
            const cardClass =
              "block h-full rounded-2xl border border-border/80 bg-background p-5 pb-12 shadow-[0_4px_20px_rgba(0,0,0,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_28px_rgba(0,0,0,0.07)]";
            const cardTitle = book.title ?? book.idea;
            const card = (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wide text-primary-strong">
                  {format?.name ?? book.format_slug} · {book.status}
                </p>
                <p className="mt-2 font-display text-base font-bold line-clamp-2">
                  {book.title ?? book.idea}
                </p>
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                  {book.subtitle ?? book.idea}
                </p>
              </>
            );
            return (
              <BookCardActions key={book.id} bookId={book.id} title={cardTitle}>
                {book.status === "ready" ? (
                  <Link href={`/studio/${book.id}`} className={cardClass}>
                    {card}
                  </Link>
                ) : (
                  <ResumeIdeaLink idea={book.idea} className={cardClass}>
                    {card}
                  </ResumeIdeaLink>
                )}
              </BookCardActions>
            );
          })}
        </div>
      </section>

      <section className="mt-auto pt-10">
        <h2 className="mb-4 font-display text-xl font-bold">
          Your achievements
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {achievements.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className={`rounded-2xl border border-border/80 bg-background p-5 shadow-[0_4px_16px_rgba(0,0,0,0.03)] ${
                  item.earned ? "ring-2 ring-primary/40" : "opacity-75"
                }`}
              >
                <span
                  className={`inline-flex size-10 items-center justify-center rounded-xl ${
                    item.earned
                      ? "bg-primary/20 text-primary-strong"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <p className="mt-3 font-display text-sm font-bold">
                  {item.title}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{item.body}</p>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {item.earned ? "Earned" : "Not earned yet"}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: typeof BookOpen;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-background p-5 shadow-[0_4px_20px_rgba(0,0,0,0.04)]">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/15 text-primary-strong">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">
        {value}
      </p>
      <Icon
        className="pointer-events-none absolute -right-3 -bottom-3 size-24 text-primary/10"
        aria-hidden="true"
      />
    </div>
  );
}
