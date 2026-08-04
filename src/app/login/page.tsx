import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="container-page mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl font-bold">Log in</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Authentication is not connected yet. Supabase Auth goes here, with
          email magic links and Google sign-in.
        </p>
        <ButtonLink href="/create" size="lg" className="mt-8">
          Continue without an account
        </ButtonLink>
        <p className="mt-6 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-semibold text-primary underline-offset-4 hover:underline"
          >
            Back to the homepage
          </Link>
        </p>
      </div>
    </section>
  );
}
