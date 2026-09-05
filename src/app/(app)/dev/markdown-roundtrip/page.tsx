/**
 * Manual fidelity check for the chapter editor: loads every chapter of the
 * signed-in user's books (plus synthetic samples) into a headless editor and
 * serialises it straight back. Any line that changes without an edit is a
 * bug in the markdown round trip. Run it again whenever the editor's
 * extensions change. Signed-in users only; not linked from the app.
 */
import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/session";
import { listBooksForUser, listChapters } from "@/lib/books";
import { RoundTripClient } from "./roundtrip-client";
import { syntheticSamples } from "./samples";

export default async function DevRoundTripPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  const books = await listBooksForUser(profile.id, 50);
  const samples: { label: string; body: string }[] = [...syntheticSamples];
  for (const book of books) {
    const chapters = await listChapters(book.id);
    for (const chapter of chapters) {
      if (chapter.body.trim()) {
        samples.push({ label: `${book.title ?? book.id} / ${chapter.position + 1}. ${chapter.title}`, body: chapter.body });
      }
    }
  }
  return (
    <>
      <p className="text-xs text-muted-foreground">{books.length} books scanned</p>
      <RoundTripClient samples={samples} />
    </>
  );
}
