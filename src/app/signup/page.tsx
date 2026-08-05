import type { Metadata } from "next";
import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return (
    <section className="py-16 lg:py-24">
      <div className="container-page mx-auto flex max-w-md flex-col items-center text-center">
        <h1 className="font-display text-3xl font-extrabold sm:text-4xl">
          Create your {site.name} account
        </h1>
        <p className="mt-3 text-muted-foreground">
          Sign up with Google or use your email and password.
        </p>

        <div className="mt-8 w-full">
          <SignUp
            routing="hash"
            forceRedirectUrl="/create"
            signInUrl="/login"
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
