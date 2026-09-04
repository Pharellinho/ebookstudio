export type ContentsEntry = { label: string; page?: number; part?: boolean };

export type SamplePage =
  | { kind: "cover" }
  | { kind: "contents"; heading: string; entries: ContentsEntry[]; folio: number }
  | {
      kind: "chapter";
      number: string;
      heading: string;
      paragraphs: string[];
      folio: number;
    }
  | { kind: "body"; subheading?: string; paragraphs: string[]; folio: number }
  | {
      kind: "table";
      heading: string;
      intro: string;
      columns: string[];
      rows: string[][];
      footnote: string;
      folio: number;
    }
  | {
      kind: "statement";
      label: string;
      statement: string;
      support: string;
      folio: number;
    }
  | {
      kind: "steps";
      heading: string;
      intro: string;
      steps: { window: string; title: string; body: string }[];
      folio: number;
    }
  | {
      kind: "template";
      label: string;
      subject: string;
      preview: string;
      body: string[];
      note: string;
      swaps: { field: string; hint: string }[];
      folio: number;
    }
  | {
      kind: "callout";
      /** Eyebrow printed above the rule: TIP, IMPORTANT, REMEMBER… */
      label: string;
      heading: string;
      paragraphs: string[];
      folio: number;
    }
  /** Bold term, then the explanation — a glossary or a diagnosis list. */
  | {
      kind: "definitions";
      heading: string;
      intro: string;
      items: { term: string; body: string }[];
      folio: number;
    }
  /** Two facing columns under one accent header: what it is, what it is not. */
  | {
      kind: "comparison";
      heading: string;
      intro: string;
      columns: [string, string];
      rows: { term: string; body: string }[][];
      folio: number;
    }
  | {
      kind: "quote";
      quote: string;
      attribution: string;
      folio: number;
    }
  | { kind: "art"; caption: string; image: string; folio: number };

/* Each book is typeset by a different imaginary publisher. These switches are
   what stop the five samples reading as one template with the colour swapped. */
export type BookDesign = {
  /** How a chapter page opens: printed book, workbook exercise, PDF banner, or
   *  a full-bleed colour band with the chapter figure knocked out of it. */
  chapterOpener: "classic" | "numeral" | "block" | "banner";
  /** Drop cap on the first paragraph of a chapter. */
  dropCap: boolean;
  /** What sits at the top of continuation pages. */
  runningHead: "smallcaps" | "rule" | "none";
  /** Justified like print, or ragged right like a designed PDF. */
  align: "justify" | "ragged";
};

export type SampleBook = {
  id: string;
  label: string;
  title: string;
  /** Small caps line printed at the top of continuation pages. */
  runningHead: string;
  meta: string;
  cover: string;
  /** Tint shown behind the cover while the image loads. */
  tint: string;
  /** Each book gets its own accent so the set never looks like one template. */
  accent: string;
  /** Typeset like print, or laid out like a designed PDF. */
  typeface: "serif" | "sans";
  /** The page furniture that gives this title its own editorial identity. */
  design: BookDesign;
  pages: SamplePage[];
};

export const sampleBooks: SampleBook[] = [
  {
    id: "balcony-garden",
    label: "How-to guide",
    title: "The Balcony Garden Year",
    runningHead: "The Balcony Garden Year",
    meta: "How-to guide · 142 pages",
    cover: "/samples/cover-balcony-garden.webp",
    tint: "#efeadb",
    accent: "#2f6b4f",
    typeface: "serif",
    /* A traditional printed how-to: justified columns, indented paragraphs,
       a drop cap opening each chapter and the title running along the top. */
    design: {
      chapterOpener: "banner",
      dropCap: true,
      runningHead: "smallcaps",
      align: "justify",
    },
    pages: [
      { kind: "cover" },
      {
        kind: "contents",
        heading: "Contents",
        folio: 5,
        entries: [
          { label: "Part One · Before you plant", part: true },
          { label: "1. What a balcony can grow", page: 11 },
          { label: "2. Reading the light you have", page: 23 },
          { label: "3. Pots, soil and drainage", page: 37 },
          { label: "Part Two · The growing season", part: true },
          { label: "4. The spring planting window", page: 53 },
          { label: "5. Watering in a heatwave", page: 71 },
          { label: "6. Feeding without guesswork", page: 88 },
          { label: "7. Pests at four floors up", page: 101 },
          { label: "Part Three · Closing the year", part: true },
          { label: "8. Pulling the season to a close", page: 117 },
          { label: "9. Notes for next March", page: 129 },
          { label: "Seed sources and reading", page: 138 },
        ],
      },
      {
        kind: "chapter",
        number: "Chapter Two",
        heading: "Reading the light you have",
        folio: 23,
        paragraphs: [
          "Before you buy a single seed, spend one Saturday watching your balcony. Note the hour the sun first reaches the railing and the hour it leaves. That number decides everything that follows, and it is the one piece of information no seed catalogue can give you.",
          "Six hours of direct summer sun and tomatoes are on the table. Four, and you are in the world of lettuce, chard, mint and parsley, which is a perfectly good world to live in and rather less work. Two, and you are growing for leaves rather than fruit.",
          "The mistake almost everyone makes is planting for the balcony they wish they had. A shaded balcony growing herbs beautifully beats a shaded balcony growing three leggy tomatoes that never ripen. There is no prize for attempting the difficult thing badly.",
          "South-facing is not the whole answer either. A balcony with a deep concrete slab overhead can end up shadier in midsummer than an east-facing one with open sky, because the sun climbs high enough to sit behind the floor above. Look up before you trust the compass.",
        ],
      },
      {
        kind: "body",
        subheading: "Mapping a day of sun",
        folio: 24,
        paragraphs: [
          "Light moves twice: across the day, and across the year. The corner that bakes in the middle of July may sit in shadow by the second week of September, when the sun drops behind the building opposite a full hour earlier than it did.",
          "So map it properly. Stand in the same spot and take a photograph at nine in the morning, at noon, and at four in the afternoon. Do it once in April and again in early July. Two afternoons of patience will save you a season of guessing, and the photographs settle arguments later, when nobody can remember whether the far end of the railing ever caught the sun at all.",
          "What you are looking for is not a number but a shape: a band of light that crosses the floor and climbs the wall. Pots go where that band sits longest. Anything that has to ripen takes the sunny end, herbs fill the middle, and the shaded end takes the mint, which will otherwise colonise everything you own.",
          "Reflected light counts for more than people expect. A pale wall behind a pot throws a surprising amount back onto the leaves, and a glass balustrade does the same. A dark brick wall gives back heat rather than light, which helps you in May and works against you in August.",
          "Keep the photographs. A season later they stop being a plan and become a record, and the difference between a gardener who improves each year and one who repeats the same year forever is usually nothing more grand than the habit of writing things down.",
        ],
      },
      {
        kind: "definitions",
        heading: "Reading a plant's complaint",
        intro:
          "A pot tells you what is wrong long before it dies. Four signs cover most of a first season.",
        items: [
          {
            term: "Yellow lower leaves",
            body: "Almost always water, and almost always too much of it. Push a finger in to the second knuckle before you reach for the can again.",
          },
          {
            term: "Crisp brown edges",
            body: "Heat and wind rather than thirst. Move the pot back from the railing and give it an hour of afternoon shade.",
          },
          {
            term: "Long stems, few leaves",
            body: "The plant is reaching for light it cannot find. Nothing you feed it will fix a shaded corner.",
          },
          {
            term: "Flowers but no fruit",
            body: "Nobody has pollinated it. Four floors up there are fewer insects, so brush the flowers with a soft brush yourself.",
          },
        ],
        folio: 26,
      },
      {
        kind: "callout",
        label: "In practice",
        heading: "Water the soil, never the leaves",
        folio: 29,
        paragraphs: [
          "A wet leaf in full sun scorches, and a wet leaf overnight invites the grey mildew that no amount of feeding will undo. Put the spout under the foliage and let it run at the base.",
          "Count to five while you pour. If the water is still sitting on the surface when you stop, the compost has dried hard enough to repel it, and the pot needs a slow second pass ten minutes later.",
        ],
      },
      {
        kind: "quote",
        quote:
          "A balcony will grow almost anything you ask of it, provided you ask in the right month and accept that the railing, not the seed catalogue, decides what is possible.",
        attribution: "Nadia Korrel, on her third season",
        folio: 33,
      },
      {
        kind: "table",
        heading: "What each crop needs",
        intro:
          "Sun is the hours of direct light in midsummer. Pot is the smallest width that will not dry out by lunchtime.",
        columns: ["Crop", "Sun", "Pot", "Weeks"],
        rows: [
          ["Cherry tomato", "6 h", "30 cm", "14"],
          ["Dwarf bean", "6 h", "25 cm", "11"],
          ["Bush basil", "5 h", "18 cm", "8"],
          ["Chard", "4 h", "25 cm", "9"],
          ["Radish", "4 h", "12 cm", "4"],
          ["Leaf lettuce", "3 h", "15 cm", "6"],
          ["Parsley", "3 h", "18 cm", "10"],
          ["Mint", "3 h", "20 cm", "7"],
        ],
        footnote:
          "Weeks are counted from sowing, not from planting out. Add a fortnight to everything if your balcony faces north.",
        folio: 18,
      },
      {
        kind: "chapter",
        number: "Chapter Five",
        heading: "Watering in a heatwave",
        folio: 71,
        paragraphs: [
          "A pot on a hot balcony is a small desert with a plant in the middle of it. Terracotta dries fastest because it breathes, dark plastic cooks the roots at the edges, and anything narrower than twenty centimetres will want water twice a day through July.",
          "Water early, water slowly, and water until it runs out of the bottom. A quick splash wets the surface and teaches the roots to stay shallow, which is the opposite of what you want in the week the temperature climbs.",
          "Mulch is the cheapest thing you will do all year. Two centimetres of bark, gravel or even torn cardboard on the surface halves how fast the pot dries, and it stops the soil crusting into a lid that water simply runs across.",
          "Saucers are a matter of judgement rather than rule. In a heatwave they buy you a few hours, which can save a pot on a day you cannot get home. In a wet fortnight they drown roots quietly, and by the time the leaves yellow the damage is already a week old. Fill them in July, tip them out in September.",
        ],
      },
    ],
  },
  {
    id: "focus-workbook",
    label: "Interactive workbook",
    title: "The Weekly Focus Workbook",
    runningHead: "The Weekly Focus Workbook",
    meta: "Interactive workbook · 48 pages",
    cover: "/samples/cover-focus-workbook.webp",
    tint: "#e8efe6",
    accent: "#3d6b4f",
    typeface: "sans",
    /* A workbook: exercises are numbered in big accent figures, the copy is
       ragged right so it reads as something you write in, not something you
       curl up with. */
    design: {
      chapterOpener: "numeral",
      dropCap: false,
      runningHead: "rule",
      align: "ragged",
    },
    pages: [
      { kind: "cover" },
      {
        kind: "contents",
        heading: "Contents",
        folio: 3,
        entries: [
          { label: "How to use this book", page: 5 },
          { label: "1. Name the real work", page: 9 },
          { label: "2. Cut the noise", page: 15 },
          { label: "3. Protect three blocks", page: 21 },
          { label: "4. Write the finish line", page: 27 },
          { label: "5. Defend the calendar", page: 33 },
          { label: "6. Close the week", page: 39 },
          { label: "A filled-in example", page: 44 },
        ],
      },
      {
        kind: "chapter",
        number: "Before you begin",
        heading: "How to use this book",
        folio: 5,
        paragraphs: [
          "This workbook asks for one quiet hour. Not a perfect morning, not a retreat — an hour with a pen, a calendar and the honesty to admit that most of your to-do list is optional.",
          "You will move through six short exercises. Do them in order. Each one feeds the next, and none of them needs more than ten minutes if you stop polishing and start writing.",
          "Skip nothing on the first pass. The point is not a flawless plan. The point is a week with a centre — one outcome that would make Friday feel like a win even if half the noise never got done.",
          "Write in the margins if you need to. Cross things out. The page is a tool, not a keepsake. When you finish exercise six, you should be able to say, in one sentence, what this week is for.",
        ],
      },
      {
        kind: "body",
        subheading: "1 · Name the real work",
        folio: 9,
        paragraphs: [
          "Open a blank page and write every task, worry and half-promise currently living in your head. Do not organise yet. Do not judge. Empty the bag first. Meetings, emails you owe, the project you keep postponing, the errand that has followed you for a fortnight — all of it goes down.",
          "When the list feels complete, read it once slowly. Circle the single outcome that would make this week feel successful even if everything else slipped. That circle is your centre. Everything else is optional until Friday.",
          "If you circled more than one thing, you have not chosen yet. Choose. The workbook only works when the week has one job that matters most. Two centres is the same as none.",
          "Write that outcome at the top of the next page in a full sentence. Not “finish website”, but “Ship the pricing page so new visitors can buy without a call.” Specific beats ambitious. Ambition without a finish line is just another open tab.",
          "Expect resistance at the circling step. The mind will insist that three things are equally urgent, because choosing one means admitting the other two will sit untouched for five days. That discomfort is the exercise working, not the exercise failing.",
        ],
      },
      {
        kind: "callout",
        label: "Remember",
        heading: "When a block collapses",
        folio: 12,
        paragraphs: [
          "Some weeks a protected block gets eaten anyway. Do not rebuild the plan around it. That is how one lost hour turns into a lost week.",
          "Move the block once, to the next morning, and leave everything else exactly where it stands. A plan that survives a bad Tuesday is worth more than a plan that was perfect on Monday.",
        ],
      },
      {
        kind: "body",
        subheading: "2 · Cut the noise",
        folio: 15,
        paragraphs: [
          "Return to the list you made. Draw a line through anything that does not serve the outcome you circled. Be ruthless. Most lists survive without half their items, and the half that remains is usually the half nobody was waiting for.",
          "What you cross out is not forgotten forever. It is postponed on purpose. Write a short “later” column if that helps you let go — three lines at most. Then close it. The week cannot hold every good idea you have ever had.",
          "You should now have one sentence for the week and a short set of supporting tasks. If the supporting list is still longer than a dozen lines, cut again. Focus is not a mood. It is the discipline of leaving good work on the floor.",
          "Watch for the tasks that survive every cut because they feel productive. Reorganising files, refining a system, grooming a backlog — none of them move the outcome, and all of them are more comfortable than the work that does. Cross those out first, precisely because you would rather not.",
          "Some items are not tasks at all. Anything waiting on another person is a message you owe them, not work you owe yourself. Turn it into one line, send it, and delete the task. Ninety seconds, and three lines leave the page.",
        ],
      },
      {
        kind: "comparison",
        heading: "What this workbook is",
        intro:
          "Before exercise four, settle what you are actually buying with the hour. Most disappointment starts in the right-hand column.",
        columns: ["A week plan is", "A week plan is not"],
        rows: [
          [
            {
              term: "A single decision",
              body: "Made once on Monday, so the other four days do not each need one.",
            },
            {
              term: "A full calendar",
              body: "Filling every hour is not planning. It is hiding from the choice.",
            },
          ],
          [
            {
              term: "A finish line",
              body: "One outcome you can point at on Friday and call done.",
            },
            {
              term: "A wish list",
              body: "Six priorities is the same as none, written more neatly.",
            },
          ],
          [
            {
              term: "Repairable",
              body: "It survives a bad Tuesday because it only holds one thing.",
            },
            {
              term: "A promise",
              body: "Nobody is grading you on it. Cross things out without ceremony.",
            },
          ],
        ],
        folio: 21,
      },
      {
        kind: "quote",
        quote:
          "A week without a centre is not a busy week. It is five days of deciding again, every hour, what the week was supposed to be about.",
        attribution: "From exercise three · Protect three blocks",
        folio: 27,
      },
      {
        kind: "body",
        subheading: "A week, filled in",
        folio: 44,
        paragraphs: [
          "Here is how one reader used the same pages. Steal the shape, not the content. Her centre for the week was: ship the pricing page so new visitors can buy without a call.",
          "Monday, nine to half past ten: outline the offer page. Tuesday, same block: write the hero and the proof. Thursday afternoon: add pricing and the FAQ. Friday: review only — page live, link in the bio. No new ideas after Wednesday. No “quick” redesign on Friday morning.",
          "Notice the finish line is public and small. That is what makes it reachable. When Friday arrived, she had one clear yes: the page was live. The rest of the list could wait until next Monday without pretending it was urgent today.",
          "What she did not do is as instructive as what she did. No new client calls on Tuesday or Wednesday. No answering the thread about next quarter. Two requests landed on Thursday and both got the same reply: yes, next week.",
          "The blocks are ninety minutes, not four hours. A four-hour block is a fantasy that collapses at the first interruption and takes the day's confidence down with it. Ninety minutes survives a late start, a phone call and a slow coffee, and it still ships something.",
        ],
      },
    ],
  },
  {
    id: "deep-sea",
    label: "Coloring book",
    title: "Deep Sea Wanderers",
    runningHead: "Deep Sea Wanderers",
    meta: "Coloring book · 40 pages",
    cover: "/samples/cover-deep-sea.webp",
    tint: "#3ba0d8",
    accent: "#0e7490",
    typeface: "sans",
    /* Every page here is full-bleed artwork, so none of these switches render.
       Kept at the printed-book defaults so the coloring book is untouched. */
    design: {
      chapterOpener: "classic",
      dropCap: false,
      runningHead: "smallcaps",
      align: "justify",
    },
    pages: [
      { kind: "cover" },
      {
        kind: "art",
        folio: 3,
        caption: "A turtle in the kelp forest",
        image: "/samples/page-deep-sea-turtle.webp",
      },
      {
        kind: "art",
        folio: 7,
        caption: "The octopus and the shell",
        image: "/samples/page-deep-sea-octopus.webp",
      },
      {
        kind: "art",
        folio: 11,
        caption: "Whale song near the surface",
        image: "/samples/page-deep-sea-whale.webp",
      },
      {
        kind: "art",
        folio: 15,
        caption: "Breakfast on the reef",
        image: "/samples/page-deep-sea-reef.webp",
      },
    ],
  },
  {
    id: "rate-card",
    label: "Lead magnet",
    title: "The Freelancer Rate Card",
    runningHead: "The Freelancer Rate Card",
    meta: "Lead magnet · 22 pages",
    cover: "/samples/cover-rate-card.webp",
    tint: "#1a1f2e",
    accent: "#d4a017",
    typeface: "sans",
    /* A lead-magnet PDF: headings sit in solid accent bands, nothing runs along
       the top, and the whole page is tighter than a printed book would be. */
    design: {
      chapterOpener: "block",
      dropCap: false,
      runningHead: "none",
      align: "ragged",
    },
    pages: [
      { kind: "cover" },
      {
        kind: "statement",
        label: "The one idea",
        statement:
          "Your rate is not a feeling. It is a number that keeps the business alive after the invoice is paid.",
        support:
          "This guide replaces guesswork with a short worksheet you can fill in before the next discovery call.",
        folio: 3,
      },
      {
        kind: "table",
        heading: "What the number has to cover",
        intro:
          "Start from monthly costs, not from what a peer charged last year. The peer is not paying your rent.",
        columns: ["Line", "Monthly", "Notes"],
        rows: [
          ["Salary you need", "€3,200", "after tax, your real floor"],
          ["Tools and software", "€180", "design, hosting, accounting"],
          ["Buffer (taxes, sick days)", "€640", "twenty percent, non-negotiable"],
          ["Billable hours available", "96 h", "four days a week, realistic"],
          ["Floor rate", "€42 / h", "costs ÷ hours, before profit"],
        ],
        footnote:
          "If a client wants a project price, multiply hours by your floor, then add thirty percent for scope risk.",
        folio: 8,
      },
      {
        kind: "callout",
        label: "Important",
        heading: "Before you send the number",
        folio: 10,
        paragraphs: [
          "Read the price out loud and stop at the full stop. If you hear yourself adding but, just, or normally, delete the sentence that follows. It is a discount nobody asked you for.",
          "The client is measuring your number against a budget, not against your worth. Let the figure sit on the page and wait.",
        ],
      },
      {
        kind: "steps",
        heading: "Three prices, one conversation",
        intro:
          "Never walk into a call with a single number. Walk in with a ladder the client can climb.",
        steps: [
          {
            window: "Essential",
            title: "The clean delivery",
            body: "Scope, one revision round, your floor rate. Enough to say yes without resentment.",
          },
          {
            window: "Standard",
            title: "The one most people buy",
            body: "Two revision rounds, a short strategy note, and a timeline they can plan around.",
          },
          {
            window: "Partner",
            title: "The quiet premium",
            body: "Priority slots, a monthly check-in, and the right to say no to rush work elsewhere.",
          },
        ],
        folio: 12,
      },
      {
        kind: "quote",
        quote:
          "Nobody has ever been talked out of a budget by an apology. Plenty of people have been talked out of hiring you by one.",
        attribution: "Mira Solano, on quoting without flinching",
        folio: 15,
      },
      {
        kind: "body",
        subheading: "A sample reply, after the call",
        folio: 17,
        paragraphs: [
          "Hi Sarah, thanks for walking me through the brand refresh. Here are three ways we can work together, priced so the scope stays honest on both sides.",
          "Essential — €1,800: delivery only, one revision round, ten days. Standard — €2,600: two revision rounds plus a one-page strategy note, fourteen days. This is what most clients choose. Partner — €3,900: priority scheduling and a monthly check-in for the first quarter.",
          "Reply with the option that fits, or tell me what needs to move and I will reshape the middle tier. — Mira",
          "Three options kill the awkward single-number stare-down. The middle tier is designed to win, and the close invites a conversation instead of a discount.",
          "Notice what is missing. No apology, no explanation of how much work this really is, no hedging about whether the budget might stretch. The prices sit in plain sentences with a full stop after them. Explaining a number invites the client to negotiate the explanation rather than the number.",
        ],
      },
    ],
  },
];
