import { redirect } from "next/navigation";
import { SignOutButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { AppSidebar } from "@/components/app/sidebar";
import { getCurrentProfile } from "@/lib/auth/session";
import { site } from "@/lib/site";

function AccountSetupError() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-warm p-6">
      <div className="w-full max-w-md rounded-2xl border-2 border-foreground bg-background p-8 text-center shadow-md">
        <h1 className="font-display text-2xl font-extrabold">
          We couldn&apos;t open your studio
        </h1>
        <p className="mt-3 text-muted-foreground">
          You&apos;re signed in, but your account didn&apos;t finish setting up.
          Email us at{" "}
          <a
            href={`mailto:${site.contactEmail}`}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            {site.contactEmail}
          </a>{" "}
          and we&apos;ll sort it out.
        </p>
        <SignOutButton>
          <button
            type="button"
            className="mt-6 inline-flex cursor-pointer items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-colors hover:bg-foreground/85"
          >
            Log out
          </button>
        </SignOutButton>
      </div>
    </main>
  );
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/login");
  }

  const profile = await getCurrentProfile();
  if (!profile) {
    /* Signed in with Clerk, but no Supabase profile could be loaded or
       created (e.g. the email already belongs to another Clerk user id).
       Redirecting to /login here loops forever: /login sees a signed-in
       user and sends them straight back. Stop and say so instead. */
    return <AccountSetupError />;
  }

  /* Column on phones (sidebar on top, content below), row from lg. Without
     `flex-col` the full-width sidebar sat beside the content and pushed every
     signed-in page off the right edge of a phone screen. */
  return (
    <div className="flex min-h-dvh flex-col bg-[#f7f5f1] lg:h-dvh lg:flex-row lg:overflow-hidden">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <AppSidebar
        displayName={profile.displayName}
        email={profile.email}
        plan={profile.billing.plan}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main id="app-main" className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
