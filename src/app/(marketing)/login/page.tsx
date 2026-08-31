import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container-page mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Log in to {site.name}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Continue with Google or use your email and password.
        </p>

        <div className="mt-8 w-full">
          <SignIn
            routing="hash"
            forceRedirectUrl="/dashboard"
            signUpUrl="/signup"
            appearance={{
              elements: {
                rootBox: "mx-auto w-full",
                card: "shadow-md border-2 border-foreground",
              },
              variables: {
                colorPrimary: "#d4a017",
              },
            }}
          />
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <Link
            href="/"
            className="font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Back to the homepage
          </Link>
        </p>
      </div>
    </section>
  );
}
