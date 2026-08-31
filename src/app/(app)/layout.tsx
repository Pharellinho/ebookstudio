import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app/sidebar";
import { getCurrentProfile } from "@/lib/auth/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh bg-[#f7f5f1] lg:h-dvh lg:flex-row lg:overflow-hidden">
      <a
        href="#app-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-on-primary"
      >
        Skip to content
      </a>
      <AppSidebar
        displayName={profile.displayName}
        email={profile.email}
        isFounder={profile.isFounder}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <main id="app-main" className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
