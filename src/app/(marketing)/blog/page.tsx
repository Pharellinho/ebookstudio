import type { Metadata } from "next";
import Link from "next/link";
import { posts } from "@/lib/posts";
import { Cta } from "@/components/sections/cta";

export const metadata: Metadata = {
  title: "Blog — publishing, pricing and AI writing",
  description:
    "Practical writing on self-publishing with AI: ebook structure, KDP pricing, lead magnets that convert and workflows that keep your voice.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  return (
    <>
      <section className="border-b border-border bg-surface py-16 lg:py-20">
        <div className="container-page mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            Blog
          </p>
          <h1 className="mt-3 font-display text-4xl font-bold sm:text-5xl">
            Write, publish, price, repeat
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Field notes on making books with AI without making the mistakes
            readers can smell.
          </p>
        </div>
      </section>

      <section className="py-16 lg:py-20">
        <div className="container-page grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="flex flex-col rounded-2xl border border-border bg-surface p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </time>
                {" · "}
                {post.readingTime}
              </p>
              <h2 className="mt-3 font-display text-lg font-semibold">
                <Link
                  href={`/blog/${post.slug}`}
                  className="transition-colors duration-200 hover:text-primary"
                >
                  {post.title}
                </Link>
              </h2>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {post.description}
              </p>
              <Link
                href={`/blog/${post.slug}`}
                className="mt-5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Read the article
              </Link>
            </article>
          ))}
        </div>
      </section>

      <Cta />
    </>
  );
}
