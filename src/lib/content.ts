export type EbookFormat = {
  slug: string;
  name: string;
  pages: string;
  chapters: string;
  credits: number;
  regenCredits: number;
  summary: string;
  audience: string;
  highlights: string[];
};

export const formats: EbookFormat[] = [
  {
    slug: "lead-magnet",
    name: "Lead Magnet",
    pages: "8–15",
    chapters: "5–7",
    credits: 25,
    regenCredits: 13,
    summary:
      "A short, high-value giveaway that turns cold traffic into email subscribers.",
    audience: "Marketers, coaches and freelancers building a list.",
    highlights: [
      "Punchy chapters written for skimmers",
      "Opt-in ready cover and title page",
      "Clear call to action on the final page",
    ],
  },
  {
    slug: "research-report",
    name: "Research Report",
    pages: "20–40",
    chapters: "8–12",
    credits: 30,
    regenCredits: 15,
    summary:
      "A structured report with findings, context and takeaways your audience can act on.",
    audience: "Consultants and agencies publishing point-of-view content.",
    highlights: [
      "Executive summary and key findings",
      "Section intros written for scanning",
      "Charts and data placeholders you can fill",
    ],
  },
  {
    slug: "how-to-guide",
    name: "How-To Guide",
    pages: "30–60",
    chapters: "10–12",
    credits: 35,
    regenCredits: 18,
    summary:
      "A step-by-step manual that walks a reader from problem to result.",
    audience: "Creators selling practical knowledge on Amazon KDP or Gumroad.",
    highlights: [
      "Numbered steps with worked examples",
      "Checklists at the end of every chapter",
      "Troubleshooting and FAQ sections",
    ],
  },
  {
    slug: "interactive-workbook",
    name: "Interactive Workbook",
    pages: "40–80",
    chapters: "10–15",
    credits: 35,
    regenCredits: 18,
    summary:
      "Exercises, prompts and reflection questions readers actually complete.",
    audience: "Coaches and therapists who want clients to do the work.",
    highlights: [
      "Fillable exercise pages",
      "Reflection prompts per chapter",
      "Progress trackers and summaries",
    ],
  },
  {
    slug: "course-companion",
    name: "Course Companion",
    pages: "50–120",
    chapters: "15–20",
    credits: 45,
    regenCredits: 23,
    summary:
      "A written companion that lifts completion rates for your video course.",
    audience: "Course creators on Teachable, Kajabi or Skool.",
    highlights: [
      "Chapter per lesson or module",
      "Recap sheets and action items",
      "Consistent terminology across the book",
    ],
  },
  {
    slug: "fiction-novel",
    name: "Fiction Novel",
    pages: "150–300",
    chapters: "20–30",
    credits: 60,
    regenCredits: 30,
    summary:
      "A full-length novel with an outline, a character bible and chapter-by-chapter prose.",
    audience: "Indie authors publishing serial fiction.",
    highlights: [
      "Outline approved before writing starts",
      "Character bible keeps voices consistent",
      "Scene-level pacing across the whole book",
    ],
  },
  {
    slug: "coloring-book",
    name: "Coloring Book",
    pages: "20–40",
    chapters: "12–16",
    credits: 40,
    regenCredits: 20,
    summary:
      "Printable black-and-white line-art pages built around one theme.",
    audience: "Parents, teachers and creators selling activity books.",
    highlights: [
      "One scene per page with clear outlines",
      "Age-appropriate complexity",
      "Ready for KDP coloring interiors",
    ],
  },
];

export const steps = [
  {
    title: "Describe your idea in one sentence",
    body: "Tell us the topic and who it is for. That is the whole brief.",
  },
  {
    title: "Approve the title and outline",
    body: "You get title options and an editable table of contents before a single chapter is written.",
  },
  {
    title: "Watch chapters get written live",
    body: "Full prose, not summaries. Every chapter keeps the context of the ones before it.",
  },
  {
    title: "Download store-ready files",
    body: "A typeset PDF, an EPUB and a DOCX, plus a cover sized for Amazon KDP.",
  },
];

export const features = [
  {
    icon: "sparkles",
    title: "One sentence to a full manuscript",
    body: "8,000 to 18,000 words depending on the format, written chapter by chapter with persistent context.",
  },
  {
    icon: "layout",
    title: "Covers designed for the shelf",
    body: "Genre-aware cover art at KDP dimensions, with a title treatment that stays legible as a thumbnail.",
  },
  {
    icon: "file",
    title: "Typeset PDF, not a text dump",
    body: "Title page, clickable table of contents, chapter breaks, page numbers and widow control.",
  },
  {
    icon: "refresh",
    title: "Regenerate anything",
    body: "Not happy with a chapter, the title or the cover? Regenerate just that piece for a fraction of the credits.",
  },
  {
    icon: "pencil",
    title: "Edit before you export",
    body: "Rewrite passages in your own voice, add your examples, then export when it reads like you.",
  },
  {
    icon: "shield",
    title: "Commercial licence included",
    body: "You own what you generate. Sell it on KDP, Etsy, Gumroad or your own site.",
  },
];

export type PricingTier = {
  name: string;
  /** Dollars per month; 0 is the free tier. */
  price: number;
  credits: number;
  note: string;
  popular?: boolean;
};

/* Three tiers, no more. Prices here are the only source: the pricing table,
   the landing section and the /pricing schema all read this array. */
export const pricingTiers: PricingTier[] = [
  {
    price: 0,
    credits: 0,
    name: "Free",
    note: "One complete book. Read it all on screen — export stays locked.",
  },
  {
    price: 29,
    credits: 300,
    name: "Studio",
    note: "Around 8 lead magnets or 6 how-to guides",
  },
  {
    price: 49,
    credits: 750,
    name: "Studio Plus",
    popular: true,
    note: "The sweet spot for weekly publishing",
  },
];

/* Only what is actually built. Cover regeneration, analytics and priority
   support do not exist yet, so they are not promised here. */
export const proFeatures = [
  "Unlimited PDF, EPUB and DOCX exports",
  "Commercial rights on everything you generate",
  "Coloring book studio",
];

export const freeFeatures = [
  "One complete book, written end to end",
  "Read every page in the studio",
  "Export unlocks when you upgrade",
];

export const homeFaqs = [
  {
    q: "What do I actually get?",
    a: "A full manuscript you can edit chapter by chapter, a designed cover, and the export files: a print-ready PDF sized for Amazon KDP, an EPUB for Kindle and Apple Books, and a DOCX if you want to finish the edit in Word.",
  },
  {
    q: "What does it cost?",
    a: "$29/mo for 300 credits, which covers several books a month depending on the format. You can cancel at any time and keep every file you have already exported.",
  },
  {
    q: "Is there a free plan?",
    a: "No. Creating, exporting and selling books requires a paid plan, which is what pays for the generation itself. You choose your plan when you create your account.",
  },
  {
    q: "Will I own the ebooks I create?",
    a: "Yes. Every plan includes a commercial licence, so you can sell your books on Amazon KDP, Etsy, Apple Books, Gumroad or your own site without paying royalties to us.",
  },
  {
    q: "What if I change my mind?",
    a: "You can cancel at any time and keep every book and file you have already exported. Write to us and we close the account and delete your data.",
  },
];

export const faqs = [
  {
    q: "Do I own the ebooks I create?",
    a: "Yes. Every plan includes a commercial licence, so you can sell your books on Amazon KDP, Etsy, Apple Books, Gumroad or your own website without paying royalties to us.",
  },
  {
    q: "How long does it take to generate a book?",
    a: "A lead magnet takes a few minutes. A full fiction novel takes closer to thirty minutes because each chapter is written in sequence with the full context of the story so far.",
  },
  {
    q: "Can I edit the text before publishing?",
    a: "Yes. Every chapter is editable in the browser. Most authors add their own stories and examples before exporting, which is what makes the book sound like them.",
  },
  {
    q: "What file formats do I get?",
    a: "A print-ready PDF sized for Amazon KDP, an EPUB for Kindle and Apple Books, and a DOCX if you prefer to finish the edit in Word or Google Docs.",
  },
  {
    q: "How do credits work?",
    a: "Each format costs a fixed number of credits, and regenerating a chapter or cover costs less than a full book. Credits refresh every month and do not roll over.",
  },
  {
    q: "Can I try it before paying?",
    a: "There is no free plan. A paid plan is required to create, export and sell your books, which is what pays for the generation itself. It is $29/mo and you can cancel at any time.",
  },
];

// Placeholder copy. Replace with real, attributable quotes before launch.
export const testimonials = [
  {
    quote:
      "I turned a workshop I have taught for years into a 60-page guide in an afternoon. It has been my best-performing lead magnet since.",
    name: "Marta Reinholt",
    role: "Business coach",
  },
  {
    quote:
      "The course companion lifted completion on my flagship program noticeably. Students actually print the workbook.",
    name: "Devon Ackerly",
    role: "Course creator",
  },
  {
    quote:
      "The cover was the part I always outsourced. Now I get something I can upload to KDP without touching a design tool.",
    name: "Priya Nandakumar",
    role: "Self-publishing author",
  },
  {
    quote:
      "I had the outline in my head for two years. Seeing it laid out as chapters was the push that finally got it written.",
    name: "Tomas Berglund",
    role: "Consultant",
  },
  {
    quote:
      "Formatting used to eat my launch week. Now the export is done before I have finished my coffee.",
    name: "Aisha Karim",
    role: "Indie author",
  },
  {
    quote:
      "I added a few coloring books to my shop with no inventory and no design work. That catalogue keeps working without me.",
    name: "Lena Kowalczyk",
    role: "Etsy seller",
  },
  {
    quote:
      "I edit every chapter before exporting, and that is the point. It gives me a draft to react to instead of a blank page.",
    name: "Rufus Amankwah",
    role: "Newsletter writer",
  },
  {
    quote:
      "No design skills, no writing background, and I still ended up with something I am happy to put my name on.",
    name: "Clara Nyeleti",
    role: "Nutrition coach",
  },
];

export const exportTargets = [
  "Amazon KDP",
  "Apple Books",
  "Etsy",
  "Gumroad",
  "Kobo",
  "Your own site",
];
