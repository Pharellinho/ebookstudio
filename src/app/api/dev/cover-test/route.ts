// TEMPORARY test bench for the cover brief — four subjects from four
// registers. Dev only: answers 404 in production. Delete after tuning.
import { mkdir, writeFile } from "fs/promises";
import { NextResponse } from "next/server";
import { formats } from "@/lib/content";
import { DEV_SINGLE_VARIANT, coverBrief, coverDirections, coverPrompt, generateCover } from "@/lib/generation/cover-art";

export const maxDuration = 300;

const SUBJECTS = [
  {
    key: "instagram",
    formatSlug: "how-to-guide",
    title: "Grow on Instagram",
    subtitle: "From zero to your first ten thousand followers, one post at a time",
    idea: "How to grow an Instagram account from zero to 10,000 followers: content, hooks, reels, posting rhythm and turning followers into customers",
    chapters: ["Choose a niche people search for", "Hooks that stop the scroll", "Reels, carousels and when to use each", "A posting rhythm you can keep", "From followers to buyers"],
  },
  {
    key: "cameroon",
    formatSlug: "how-to-guide",
    title: "Taste Cameroon",
    subtitle: "Cooking the classic dishes of Cameroon at home",
    idea: "Cameroonian recipes and how to cook them at home",
    chapters: ["Ndolé, the bitterleaf stew", "Poulet DG with fried plantains", "Eru and water fufu", "Koki, steamed black-eyed pea cake", "Grilled fish and the pepper sauces"],
  },
  {
    key: "german",
    formatSlug: "how-to-guide",
    title: "Conquer the German Job Market as a Foreign Student",
    subtitle: "A practical guide to finding student jobs, internships and your first role in Germany",
    idea: "How a foreign student finds a job in Germany: paperwork, where to look, how to apply, what employers expect",
    chapters: ["Which permits you need before you apply", "Where the student jobs actually are", "A German CV, line by line", "The interview, and what they will not tell you"],
  },
  {
    key: "apartment",
    formatSlug: "how-to-guide",
    title: "Your First Lisbon Flat",
    subtitle: "Buying an apartment in Portugal, step by step",
    idea: "A guide to buying your first apartment in Lisbon as a foreigner, from neighbourhoods to notary",
    chapters: ["Neighbourhoods, honestly compared", "What the listing price hides", "The notary, the tax number and the bank", "The week you get the keys"],
  },
  {
    key: "bicycle",
    formatSlug: "how-to-guide",
    title: "The Vintage Road Bike",
    subtitle: "Restore a steel classic in your garage",
    idea: "Restoring a vintage steel road bike from a flea-market find to a rideable classic, tool by tool",
    chapters: ["Choosing a frame worth the work", "Stripping and cleaning without damage", "Bearings, cables and brakes", "Paint, decals and the first ride"],
  },
  {
    key: "game",
    formatSlug: "lead-magnet",
    title: "Unlock Quick Cash",
    subtitle: "5 ways to earn in Albion Online, a step-by-step guide for players looking to boost their income",
    idea: "5 ways to earn silver fast in Albion Online for new players",
    chapters: ["Maximizing resource gathering for quick profits", "Crafting high-demand items for fast sales", "Engaging in the player-driven economy", "Trapping and ambushing for quick loot"],
  },
  {
    key: "recipes",
    formatSlug: "how-to-guide",
    title: "The Weeknight Wok",
    subtitle: "Thirty stir-fries in under twenty minutes, from one pan",
    idea: "A cookbook of fast weeknight stir-fries for people who get home late and hungry",
    chapters: ["Heat, oil and the first thirty seconds", "The five sauces that do everything", "Vegetables that hold their crunch", "Rice and noodles from the fridge"],
  },
  {
    key: "productivity",
    formatSlug: "lead-magnet",
    title: "Deep Hours",
    subtitle: "Reclaiming your mornings for the work that actually matters",
    idea: "A short guide to protecting two hours of focused work every morning before the day takes over",
    chapters: ["Why the first two hours are worth the whole afternoon", "The shutdown ritual the night before", "Saying no without a meeting", "Measuring a week by its deep hours"],
  },
  {
    key: "report",
    formatSlug: "research-report",
    title: "The State of Freelance Design Rates",
    subtitle: "What independent designers charged in 2026 and what it means for 2027",
    idea: "An analysis of what freelance designers charge across markets, with benchmarks and a point of view on where rates are heading",
    chapters: ["Method and sample", "Hourly, day and project pricing compared", "Where rates rose and where they fell", "Recommendations for setting 2027 rates"],
  },
];

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const withImages = url.searchParams.get("images") === "1";
  const only = url.searchParams.get("only")?.split(",").filter(Boolean);
  const outDir = url.searchParams.get("out") ?? "/tmp/cover-test";
  const single = DEV_SINGLE_VARIANT || url.searchParams.get("single") === "1";
  const quality = url.searchParams.get("quality") ?? undefined;
  /* ?variants=recipes,productivity — subjects that still get all three
     directions while everything else runs single. */
  const fullFor = url.searchParams.get("variants")?.split(",").filter(Boolean) ?? [];
  if (withImages) await mkdir(outDir, { recursive: true });

  const out: Record<string, unknown>[] = [];
  for (const subject of SUBJECTS) {
    if (only && !only.includes(subject.key)) continue;
    const format = formats.find((f) => f.slug === subject.formatSlug)!;
    const brief = await coverBrief({
      title: subject.title,
      subtitle: subject.subtitle,
      idea: subject.idea,
      chapterTitles: subject.chapters,
    });
    const directions = coverDirections(brief);
    const indexes = single && !fullFor.includes(subject.key) ? ([0] as const) : ([0, 1, 2] as const);
    const prompts = indexes.map((index) =>
      coverPrompt({ title: subject.title, author: "Bell Pharell", idea: subject.idea, format, brief, directionIndex: index }),
    );
    const files: string[] = [];
    if (withImages) {
      const results = await Promise.allSettled(
        prompts.map(async (prompt, index) => {
          const dir = directions[indexes[index]];
          const png = await generateCover(prompt, `${brief.register}/${dir.id}`, quality);
          const file = `${outDir}/${subject.key}-${indexes[index] + 1}-${dir.id}.png`;
          await writeFile(file, png);
          return file;
        }),
      );
      for (const r of results) {
        files.push(r.status === "fulfilled" ? r.value : `FAILED: ${String((r as PromiseRejectedResult).reason)}`);
      }
    }
    out.push({ key: subject.key, brief, directions: directions.map((d) => d.id), prompts, files });
  }
  return NextResponse.json(out);
}
