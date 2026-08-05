import Link from "next/link";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";

const links = [
  { label: "How it works", href: "/#how-it-works" },
  { label: "Features", href: "/#features" },
  { label: "Founding offer", href: "/#founding-offer" },
  { label: "FAQ", href: "/#faq" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-6">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Show when="signed-out">
            <SignInButton mode="redirect" forceRedirectUrl="/create">
              <button
                type="button"
                className="hidden cursor-pointer text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline"
              >
                Log in
              </button>
            </SignInButton>
            <Link
              href="/#founding-offer"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-4 py-2 text-sm font-extrabold text-on-primary shadow-sm transition-all duration-150 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
            >
              Join the waitlist
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </Show>

          <Show when="signed-in">
            <Link
              href="/create"
              className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              Studio
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "size-8 border-2 border-foreground",
                },
              }}
            />
          </Show>

          <details className="group relative md:hidden">
            <summary
              className="flex size-9 cursor-pointer list-none items-center justify-center rounded-lg transition-colors duration-200 hover:bg-muted [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5 group-open:hidden" aria-hidden="true" />
              <X className="hidden size-5 group-open:block" aria-hidden="true" />
            </summary>
            <nav
              aria-label="Mobile"
              className="absolute right-0 top-11 w-56 rounded-2xl border border-border bg-background p-2 shadow-lg"
            >
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-muted hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
              <Show when="signed-out">
                <Link
                  href="/login"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground"
                >
                  Log in
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/create"
                  className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground"
                >
                  Studio
                </Link>
              </Show>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
