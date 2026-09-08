import type { Metadata } from "next";
import { ScribeFlow } from "@/components/app/scribe-flow";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Create ebook",
  robots: { index: false, follow: false },
};

export default async function CreatePage() {
  /* The name on the account is the first guess for the name on the cover;
     the author can change it before the book is built. */
  const profile = await getCurrentProfile();
  return (
    <div className="space-y-4">
      <ScribeFlow defaultAuthor={profile?.displayName ?? ""} />
    </div>
  );
}
