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

export const pricingTiers = [
  { price: 29, credits: 300, note: "Around 8 lead magnets or 6 how-to guides" },
  { price: 39, credits: 500, note: "Around 14 lead magnets or 8 novels" },
  { price: 49, credits: 750, popular: true, note: "The sweet spot for weekly publishing" },
  { price: 59, credits: 1000, note: "For teams shipping a book a week" },
  { price: 79, credits: 1500, note: "Agencies producing client books" },
  { price: 99, credits: 2000, note: "High-volume publishing operations" },
];

export const proFeatures = [
  "Unlimited PDF, EPUB and DOCX exports",
  "Commercial rights on everything you generate",
  "Coloring book studio",
  "Cover regeneration",
  "Analytics dashboard",
  "Priority support",
];

export const prelaunchFaqs = [
  {
    q: "What happens when I join the waitlist?",
    a: "You get an email confirming your position in the queue and a personal invite link. On 15 August we email you an access link, and your founding price is attached to that account.",
  },
  {
    q: "Do I pay anything now?",
    a: "No. The waitlist only needs your email. You subscribe when we open access on 15 August, and founding members keep the $19/mo rate.",
  },
  {
    q: "How long does the founding price last?",
    a: "It stays at $19/mo for as long as your subscription runs without interruption. If you cancel and come back later, the public price applies.",
  },
  {
    q: "Why is my position in the queue worth anything?",
    a: "We let people in gradually so generation stays fast on day one. Earlier positions get access sooner, and every friend who joins with your link moves you up ten places.",
  },
  {
    q: "Will I own the ebooks I create?",
    a: "Yes. Every plan includes a commercial licence, so you can sell your books on Amazon KDP, Etsy, Apple Books, Gumroad or your own site without paying royalties to us.",
  },
  {
    q: "What if I change my mind?",
    a: "Unsubscribe from any email and your entry is deleted. We only use your address for launch news and nothing else.",
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
    a: "There is no free plan at launch. Join the waitlist to lock the founding price, then subscribe when access opens to create, export and sell your books.",
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
