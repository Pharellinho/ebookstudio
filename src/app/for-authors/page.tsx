import type { Metadata } from "next";
import { UseCasePage, type UseCaseContent } from "@/components/use-case-page";

export const metadata: Metadata = {
  title: "For self-publishing authors",
  description:
    "Draft, typeset and cover your next KDP title without hiring a designer. EbookStudio produces print-ready PDF and EPUB files with a commercial licence included.",
  alternates: { canonical: "/for-authors" },
};

const content: UseCaseContent = {
  eyebrow: "For self-publishing authors",
  title: "Ship the next title while the last one is still selling",
  intro:
    "Most indie authors do not stall on ideas. They stall on the 40 hours between a finished draft and a file Amazon will accept. This is the part EbookStudio removes.",
  problems: [
    {
      title: "The cover is outsourced and slow",
      body: "A freelance cover takes a week and two rounds of feedback. Genre-aware cover generation gets you something uploadable in minutes, and you can regenerate until it reads well as a thumbnail.",
    },
    {
      title: "Formatting eats the launch week",
      body: "Chapter breaks, running heads, page numbers, a clickable table of contents. The export handles all of it at KDP trim sizes so you are not fighting a layout tool.",
    },
    {
      title: "Series consistency drifts",
      body: "A character bible and a persistent outline keep names, voices and timelines aligned across a full novel instead of drifting by chapter twelve.",
    },
  ],
  outcomes: [
    "A full manuscript with an outline you approved first",
    "A cover sized and typeset for Amazon KDP",
    "Print-ready PDF plus EPUB for Kindle and Apple Books",
    "A DOCX if you want to finish the edit in Word",
    "Commercial rights on everything you generate",
  ],
  recommendedFormats: ["fiction-novel", "how-to-guide"],
};

export default function ForAuthorsPage() {
  return <UseCasePage content={content} />;
}
