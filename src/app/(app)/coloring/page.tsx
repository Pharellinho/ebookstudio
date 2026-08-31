import type { Metadata } from "next";
import { InterviewWizard } from "@/components/app/interview-wizard";

export const metadata: Metadata = {
  title: "Activity pack",
  robots: { index: false, follow: false },
};

/** Separate from the ebook Scribe flow — printable activity / page plans. */
export default function ColoringPage() {
  return (
    <InterviewWizard
      initialGoal="activity-pack"
      title="Activity pack"
      subtitle="Separate from ebooks. Answer a few questions to plan printable pages — illustration comes next."
    />
  );
}
