"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  LayoutDashboard,
  MessageSquare,
  Palette,
  PenTool,
  Plus,
  UserRound,
  Zap,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Logo } from "@/components/logo";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: "NEW" | "SOON";
  disabled?: boolean;
};

const nav: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/create", label: "Create ebook", icon: Plus },
  { href: "/coloring", label: "Activity pack", icon: Palette, badge: "NEW" },
  { href: "/books", label: "My eBooks", icon: BookOpen },
  {
    href: "#",
    label: "Editor",
    icon: PenTool,
    badge: "SOON",
    disabled: true,
  },
  { href: "/account", label: "Profile", icon: UserRound },
];

export function AppSidebar({
  displayName,
  email,
  isFounder,
}: {
  displayName: string | null;
  email: string | null;
  isFounder: boolean;
}) {
  const pathname = usePathname();

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border/80 bg-background lg:h-full lg:w-[272px] lg:border-r lg:border-b-0">
      <div className="px-5 py-5">
        <Logo />
      </div>

      <div className="hidden px-4 lg:block">
        <div className="relative overflow-hidden rounded-2xl bg-primary p-4 text-on-primary shadow-[0_8px_24px_rgba(212,160,23,0.28)]">
          <Zap
            className="absolute top-3 right-3 size-5 opacity-80"
            aria-hidden="true"
          />
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-80">
            Credits
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold tracking-tight">
            Free preview
          </p>
          <div className="mt-4 flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-black/10 px-2.5 py-1 text-[10px] font-bold uppercase">
              {isFounder ? "Pro" : "Free plan"}
            </span>
            <Link
              href="/pricing"
              className="text-[11px] font-bold underline-offset-2 hover:underline"
            >
              Upgrade →
            </Link>
          </div>
        </div>
      </div>

      <nav
        className="mt-5 flex flex-1 flex-row gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible lg:px-3 lg:pb-0"
        aria-label="App"
      >
        {nav.map((item) => {
          const Icon = item.icon;
          const active =
            !item.disabled &&
            (pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(`${item.href}/`)));

          const className = `flex min-w-fit items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
            active
              ? "bg-primary/20 text-primary-strong"
              : item.disabled
                ? "cursor-not-allowed text-muted-foreground/50"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`;

          const badge =
            item.badge === "NEW" ? (
              <span className="rounded-md bg-destructive px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-white">
                NEW
              </span>
            ) : item.badge === "SOON" ? (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold uppercase text-muted-foreground">
                Soon
              </span>
            ) : null;

          if (item.disabled) {
            return (
              <span key={item.label} className={className} aria-disabled>
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className="flex-1 whitespace-nowrap">{item.label}</span>
                {badge}
              </span>
            );
          }

          return (
            <Link key={item.href} href={item.href} className={className}>
              <Icon
                className={`size-4 shrink-0 ${active ? "text-primary-strong" : ""}`}
                aria-hidden="true"
              />
              <span className="flex-1 whitespace-nowrap">{item.label}</span>
              {badge}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-1 border-t border-border/80 p-3">
        <a
          href={`mailto:ebook.studiai@gmail.com?subject=EbookStudio%20feedback`}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MessageSquare className="size-4" aria-hidden="true" />
          Feedback
        </a>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "size-9 rounded-full",
              },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {displayName ?? "Account"}
            </p>
            {email ? (
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
