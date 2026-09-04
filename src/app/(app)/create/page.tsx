import type { Metadata } from "next";
import { ScribeFlow } from "@/components/app/scribe-flow";

export const metadata: Metadata = {
  title: "Create ebook",
  robots: { index: false, follow: false },
};

export default function CreatePage() {
  return (
    <div className="space-y-4">
      <ScribeFlow />
    </div>
  );
}
