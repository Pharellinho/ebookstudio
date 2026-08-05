import type { Metadata } from "next";
import Link from "next/link";
import { formats } from "@/lib/content";
import { IdeaForm } from "@/components/idea-form";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create your ebook",
  robots: { index: false, follow: false },
};

export default async function CreatePage({
  searchParams,
}: PageProps<"/create">) {
  const profile = await getCurrentProfile();
  const params = await searchParams;
  const idea = typeof params.idea === "string" ? params.idea : "";

  return (
    <section className="py-16 lg:py-20">
      <div className="container-page mx-auto max-w-3xl">
        {profile?.isFounder ? (
          <p className="mb-4 inline-flex rounded-full border-2 border-foreground bg-primary px-3 py-1 text-xs font-bold">
            Founding member — $19/mo locked at launch
          </p>
        ) : null}

        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {idea ? "Your brief" : "Start with one sentence"}
        </h1>

        {idea ? (
          <blockquote className="mt-6 rounded-2xl border border-border bg-surface p-6 text-lg leading-relaxed">
            {idea}
          </blockquote>
        ) : (
          <div className="mt-8">
            <IdeaForm autoFocus />
          </div>
        )}

        <h2 className="mt-12 font-display text-xl font-semibold">
          Choose a format
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {formats.map((format) => (
            <div
              key={format.slug}
              className="rounded-xl border border-border bg-background p-5"
            >
              <p className="font-display text-sm font-semibold">
                {format.name}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {format.pages} pages · {format.chapters} chapters ·{" "}
                {format.credits} credits
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-dashed border-primary/40 bg-primary-soft/40 p-6">
          <p className="font-display text-base font-semibold text-primary-strong">
            You are signed in
            {profile?.email ? ` as ${profile.email}` : ""}. Generation comes
            next.
          </p>
          <p className="mt-2 leading-relaxed text-muted-foreground">
            Auth is live. Next we wire outline, chapters, cover and export —
            the getebook-style studio loop.
          </p>
          <Link
            href="/"
            className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to the homepage
          </Link>
        </div>
      </div>
    </section>
  );
}
