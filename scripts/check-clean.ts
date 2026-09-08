// Hand-checked cases for cleanModelText. Run: node --experimental-strip-types scripts/check-clean.ts
import { cleanModelText, countProseDashes } from "../src/lib/generation/clean.ts";

const cases: [string, string][] = [
  // 1. enclosed aside → commas
  ["The starter — if you feed it daily — will survive.", "The starter, if you feed it daily, will survive."],
  // 2. lone dash, lowercase continuation → comma
  ["Water in the morning — before the sun hits the pots.", "Water in the morning, before the sun hits the pots."],
  // 2. lone dash, capital continuation → colon
  ["One habit fixes most yellow leaves — Check the soil first.", "One habit fixes most yellow leaves: Check the soil first."],
  // 2. lone dash, digit continuation → colon
  ["Terracotta dries fast — 2 days in July.", "Terracotta dries fast: 2 days in July."],
  // em dash glued to words is still prose
  ["A dead herb—almost always—is a drowned herb.", "A dead herb, almost always, is a drowned herb."],
  // en dash range untouched
  ["Plan for 5–7 chapters and the 2019–2020 season.", "Plan for 5–7 chapters and the 2019–2020 season."],
  // en dash with spaces is prose
  ["Feed it – then wait.", "Feed it, then wait."],
  // hyphenated compounds untouched
  ["A well-known, low-cost, two-knuckle test.", "A well-known, low-cost, two-knuckle test."],
  // code and links untouched
  ["Run `a — b` and see [the guide — part 2](https://x.y/a—b) — it helps.", "Run `a — b` and see [the guide — part 2](https://x.y/a—b), it helps."],
  ["```\nx — y\n```\nText — more text.", "```\nx — y\n```\nText, more text."],
  // trailing dash dropped, no double spaces
  ["It works —\nNext line.", "It works\nNext line."],
  // markdown table delimiter row untouched
  ["| A | B |\n| --- | --- |\n| 1 — one | 2 |", "| A | B |\n| --- | --- |\n| 1, one | 2 |"],
];

let failed = 0;
for (const [input, expected] of cases) {
  const got = cleanModelText(input);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${JSON.stringify(input)}\n     → ${JSON.stringify(got)}${ok ? "" : `\n     expected ${JSON.stringify(expected)}`}`);
  // idempotence
  if (cleanModelText(got) !== got) { failed++; console.log("FAIL not idempotent:", JSON.stringify(got)); }
}
console.log(`\n${cases.length - failed}/${cases.length} passed; prose dashes left in outputs: ${cases.reduce((n, [i]) => n + countProseDashes(cleanModelText(i)), 0)}`);
process.exit(failed ? 1 : 0);
