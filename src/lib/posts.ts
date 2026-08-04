export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  readingTime: string;
  body: string[];
};

export const posts: Post[] = [
  {
    slug: "how-to-write-an-ebook-with-ai",
    title: "How to write an ebook with AI without it sounding like AI",
    description:
      "A practical workflow for using an AI ebook generator: what to automate, what to write yourself, and where readers notice the difference.",
    date: "2026-07-28",
    readingTime: "7 min read",
    body: [
      "The failure mode of AI-written books is not bad grammar. It is flatness: every chapter the same length, every paragraph the same shape, no specific story anywhere. Readers cannot always name it, but they stop reading.",
      "The fix is a division of labour. Let the model handle structure, coverage and first-draft prose. You handle the three or four moments in the book where a specific example, a number from your own work, or an opinion earns the reader's trust.",
      "Start with the outline, not the prose. If the table of contents is generic, no amount of rewriting saves the chapters underneath it. Cut any chapter you could find on the first page of a search result and replace it with something only you would think to include.",
      "Then edit for rhythm. Vary paragraph length. Delete the summary sentence at the end of each section, because that is the tell. Add one concrete scene or dataset per chapter.",
      "Done well, the model saves you the forty hours of drafting and you spend six hours making it yours. That trade is why AI ebook tools work for practitioners and fail for people with nothing to add.",
    ],
  },
  {
    slug: "lead-magnet-ebook-that-converts",
    title: "The lead magnet ebook structure that actually converts",
    description:
      "Most lead magnets are ignored because they promise education. The ones that build lists deliver one finished outcome in under fifteen pages.",
    date: "2026-07-14",
    readingTime: "5 min read",
    body: [
      "A lead magnet is not a short book. It is a promise that gets kept quickly. The moment it reads like a course, the download rate holds but the read rate collapses, and an unread lead magnet builds no trust.",
      "Structure it around a single outcome the reader can complete the same day. Chapter one names the problem in their words. Chapters two to five walk the steps. The last page is a checklist and a single call to action.",
      "Length is a feature. Eight to fifteen pages signals that you respect their time. Anything longer and you are asking for a commitment they have not agreed to yet.",
      "The call to action should be the natural next step after the outcome you just delivered, not a generic booking link. If the guide got them to a first draft, the offer is the edit.",
    ],
  },
  {
    slug: "pricing-your-first-kdp-ebook",
    title: "Pricing your first KDP ebook: the $2.99 floor and why it exists",
    description:
      "Amazon's royalty plans create a hard pricing boundary. Here is how to think about price, page count and royalty together.",
    date: "2026-06-30",
    readingTime: "6 min read",
    body: [
      "Amazon pays 70% only when your ebook is listed between $2.99 and $9.99. Outside that window you drop to 35%. That single rule shapes almost every indie pricing decision.",
      "At $0.99 on the 35% plan you keep about 35 cents. At $2.99 on the 70% plan you keep roughly $1.80 after delivery cost. You need five times the volume at $0.99 to match it, and cheap pricing rarely produces five times the sales.",
      "Above $9.99 the maths flips again. A $14.99 listing on the 35% plan pays about $5.25, which can beat $9.99 at 70% if your audience is professional and the book is genuinely reference material.",
      "Run your own numbers before you list. The royalty calculator on this site takes thirty seconds and will change how you price your first title.",
    ],
  },
];
