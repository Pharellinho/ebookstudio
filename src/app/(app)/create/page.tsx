import type { Metadata } from "next";
import { ScribeFlow } from "@/components/app/scribe-flow";
import { UpgradePanel } from "@/components/app/upgrade-panel";
import { getCurrentProfile } from "@/lib/auth/session";
import { FREE_BOOK_LIMIT, planAllowsAnotherBook } from "@/lib/billing/plans";
import { countBooksForUser } from "@/lib/books";

export const metadata: Metadata = {
  title: "Create ebook",
  robots: { index: false, follow: false },
};

export default async function CreatePage() {
  /* The name on the account is the first guess for the name on the cover;
     the author can change it before the book is built. */
  const profile = await getCurrentProfile();
  /* The free plan holds one book: a second one is where the plan starts. */
  if (profile && !planAllowsAnotherBook(profile.billing.plan, await countBooksForUser(profile.id))) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <UpgradePanel
          title="Your next book"
          body={`The free plan holds ${FREE_BOOK_LIMIT === 1 ? "one complete book" : `${FREE_BOOK_LIMIT} books`}, written end to end and readable in full. A plan opens the next ones, with every export.`}
          isFounder={profile.isFounder}
        />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ScribeFlow defaultAuthor={profile?.displayName ?? ""} />
    </div>
  );
}
