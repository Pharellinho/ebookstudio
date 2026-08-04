import Link from "next/link";
import { Logo } from "@/components/logo";
import { site } from "@/lib/site";

const columns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Features", href: "/#features" },
      { label: "Examples", href: "/#examples" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Free tools", href: "/tools" },
      { label: "Ebook types", href: "/ebook-types" },
    ],
  },
  {
    title: "For",
    links: [
      { label: "Authors", href: "/for-authors" },
      { label: "Course creators", href: "/for-course-creators" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.5fr_repeat(4,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            The AI ebook studio for creators who publish. One idea in, a
            store-ready book out.
          </p>
          <a
            href={`mailto:${site.contactEmail}`}
            className="mt-4 inline-block text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            {site.contactEmail}
          </a>
        </div>

        {columns.map((column) => (
          <div key={column.title}>
            <h2 className="font-display text-sm font-bold">{column.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        <div className="container-page py-6">
          <p className="text-sm text-muted-foreground">
            {`© ${new Date().getFullYear()} ${site.name}. All rights reserved.`}
          </p>
        </div>
      </div>
    </footer>
  );
}
