import type { Metadata } from "next";
import { UseCasePage, type UseCaseContent } from "@/components/use-case-page";

export const metadata: Metadata = {
  title: "For course creators",
  description:
    "Turn your curriculum into a companion ebook and workbook students actually finish. EbookStudio generates chapter-per-lesson guides, recap sheets and print-ready exports.",
  alternates: { canonical: "/for-course-creators" },
};

const content: UseCaseContent = {
  eyebrow: "For course creators",
  title: "Give students something they can hold, print and finish",
  intro:
    "Video-only courses lose people in module three. A written companion gives students a way back in, and gives you a second asset to sell or bundle.",
  problems: [
    {
      title: "Completion stalls in the middle",
      body: "A companion book lets students skim, re-read and catch up without rewatching an hour of video. Recap sheets close every chapter with the action for that lesson.",
    },
    {
      title: "Writing the workbook never happens",
      body: "Exercises, prompts and reflection questions are the part everyone plans and nobody writes. The workbook format generates them per module, ready to print.",
    },
    {
      title: "Terminology drifts across lessons",
      body: "The studio keeps the full outline in context, so the words you use in module one still mean the same thing in module fifteen.",
    },
  ],
  outcomes: [
    "One chapter per lesson or module, matched to your curriculum",
    "Recap sheets and action items at the end of each chapter",
    "A fillable workbook students can print",
    "A bonus asset for your order bump or upsell",
    "Exports in PDF, EPUB and DOCX",
  ],
  recommendedFormats: ["course-companion", "interactive-workbook"],
};

export default function ForCourseCreatorsPage() {
  return <UseCasePage content={content} />;
}
