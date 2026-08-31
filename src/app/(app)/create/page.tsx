import type { Metadata } from "next";
import { ScribeFlow } from "@/components/app/scribe-flow";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create ebook",
  robots: { index: false, follow: false },
};

export default async function CreatePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-4">
      {profile?.isFounder ? (
        <p className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary-strong">
          Founding member — $19/mo locked at launch
        </p>
      ) : null}
      <ScribeFlow />
    </div>
  );
}
