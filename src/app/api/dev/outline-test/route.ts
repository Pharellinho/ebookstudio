// TEMPORARY dev-only check: builds an outline for ?idea= with the real
// prompts, optionally with ?model= for comparisons. 404 in production.
import { NextResponse } from "next/server";
import { generateOutline, generateVerifiedOutline, verifyOutline } from "@/lib/generation/run";

export const maxDuration = 120;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const url = new URL(request.url);
  const idea = url.searchParams.get("idea") ?? "Cameroonian recipes and how to cook them";
  const formatSlug = url.searchParams.get("format") ?? "how-to-guide";
  const model = url.searchParams.get("model") ?? undefined;
  const started = Date.now();
  if (url.searchParams.get("verify") === "1") {
    const first = await generateOutline({ idea, formatSlug, model });
    const problems = await verifyOutline({ idea, outline: first, model });
    const final = problems.length > 0 ? await generateOutline({ idea, formatSlug, model, avoid: problems }) : first;
    const recheck = problems.length > 0 ? await verifyOutline({ idea, outline: final, model }) : [];
    return NextResponse.json({ model: model ?? "(default)", ms: Date.now() - started, first, problems, regenerated: problems.length > 0, outline: final, recheck });
  }
  if (url.searchParams.get("verified") === "1") {
    const result = await generateVerifiedOutline({ idea, formatSlug, model });
    return NextResponse.json({ model: model ?? "(default)", ms: Date.now() - started, ...result });
  }
  const outline = await generateOutline({ idea, formatSlug, model });
  return NextResponse.json({ model: model ?? "(default)", ms: Date.now() - started, outline });
}
