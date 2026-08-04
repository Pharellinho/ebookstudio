import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { founder } from "@/lib/site";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type WaitlistEntry = {
  email: string;
  code: string;
  referredBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  founder: boolean;
  source: string | null;
};

export type SignupResult =
  | { ok: true; code: string; position: number; alreadyOnList: boolean }
  | { ok: false; error: "invalid-email" | "consent-required" | "storage" };

export type WaitlistStanding = {
  email: string;
  position: number;
  referrals: number;
  founder: boolean;
  bonusCredits: number;
  spotsLeft: number;
  freeSpotEarned: boolean;
};

const LOCAL_STORE = path.join(process.cwd(), ".data", "waitlist.json");

const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function normalise(email: string) {
  return email.trim().toLowerCase();
}

function makeCode() {
  return randomBytes(4).toString("hex");
}

/** Effective queue position after referral boosts. */
function effectivePosition(rawPosition: number, referrals: number) {
  return Math.max(rawPosition - referrals * founder.referralJump, 1);
}

function standingFrom(input: {
  email: string;
  founder: boolean;
  rawPosition: number;
  referrals: number;
  foundersTaken: number;
}): WaitlistStanding {
  return {
    email: input.email,
    position: effectivePosition(input.rawPosition, input.referrals),
    referrals: input.referrals,
    founder: input.founder,
    bonusCredits:
      founder.bonusCredits + input.referrals * founder.referralCredits,
    spotsLeft: Math.max(founder.spots - input.foundersTaken, 0),
    freeSpotEarned: input.referrals >= founder.referralsForFreeSpot,
  };
}

export function usingLocalStore() {
  return !supabaseConfigured();
}

/* -------------------------------------------------------------------------- */
/* Local JSON fallback (dev only)                                             */
/* -------------------------------------------------------------------------- */

async function readLocal(): Promise<WaitlistEntry[]> {
  try {
    const raw = await readFile(LOCAL_STORE, "utf8");
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}

async function writeLocal(entries: WaitlistEntry[]) {
  await mkdir(path.dirname(LOCAL_STORE), { recursive: true });
  await writeFile(LOCAL_STORE, JSON.stringify(entries, null, 2), "utf8");
}

async function joinLocal(input: {
  email: string;
  referredBy: string | null;
  source: string | null;
  ipHash?: string | null;
}): Promise<SignupResult> {
  const entries = await readLocal();
  const existing = entries.find((entry) => entry.email === input.email);

  if (existing) {
    const index = entries.indexOf(existing);
    const referrals = entries.filter(
      (item) => item.referredBy === existing.code,
    ).length;
    return {
      ok: true,
      code: existing.code,
      position: effectivePosition(index + 1, referrals),
      alreadyOnList: true,
    };
  }

  const referrer = input.referredBy
    ? entries.find((entry) => entry.code === input.referredBy)
    : undefined;

  // Ignore unknown codes and self-invites (same email).
  const referredBy =
    referrer && referrer.email !== input.email ? referrer.code : null;
  const isFounder = entries.length < founder.spots;

  const entry: WaitlistEntry = {
    email: input.email,
    code: makeCode(),
    referredBy,
    createdAt: new Date().toISOString(),
    confirmedAt: null,
    founder: isFounder,
    source: input.source,
  };

  entries.push(entry);
  await writeLocal(entries);

  return {
    ok: true,
    code: entry.code,
    position: entries.length,
    alreadyOnList: false,
  };
}

async function standingLocal(code: string): Promise<WaitlistStanding | null> {
  const entries = await readLocal();
  const index = entries.findIndex((entry) => entry.code === code);
  if (index === -1) return null;

  const entry = entries[index];
  const referrals = entries.filter((item) => item.referredBy === code).length;
  const foundersTaken = Math.min(
    entries.filter((item) => item.founder).length || entries.length,
    founder.spots,
  );

  return standingFrom({
    email: entry.email,
    founder: entry.founder,
    rawPosition: index + 1,
    referrals,
    foundersTaken,
  });
}

async function statsLocal() {
  const entries = await readLocal();
  const foundersTaken = Math.min(
    entries.filter((item) => item.founder).length || entries.length,
    founder.spots,
  );
  return {
    total: entries.length,
    spotsLeft: Math.max(founder.spots - foundersTaken, 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Supabase                                                                   */
/* -------------------------------------------------------------------------- */

async function resolveReferrer(
  referredBy: string | null,
  signupEmail: string,
): Promise<string | null> {
  if (!referredBy) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("waitlist")
    .select("code, email")
    .eq("code", referredBy)
    .maybeSingle();

  // Ignore unknown codes and self-invites (same email).
  if (!data || data.email === signupEmail) return null;

  return data.code;
}

async function joinSupabase(input: {
  email: string;
  referredBy: string | null;
  source: string | null;
  ipHash?: string | null;
}): Promise<SignupResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, error: "storage" };

  const { data: existing } = await supabase
    .from("waitlist")
    .select("code, created_at")
    .eq("email", input.email)
    .maybeSingle();

  if (existing) {
    const position = await rawPositionFor(existing.created_at, existing.code);
    const referrals = await countReferrals(existing.code);
    return {
      ok: true,
      code: existing.code,
      position: effectivePosition(position, referrals),
      alreadyOnList: true,
    };
  }

  const referredBy = await resolveReferrer(input.referredBy, input.email);

  const { count: totalBefore } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true });

  const { count: foundersBefore } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("founder", true);

  const foundersTaken = foundersBefore ?? totalBefore ?? 0;
  const isFounder = foundersTaken < founder.spots;

  // Retry once if the invite code collides (very unlikely with 8 hex chars).
  for (let attempt = 0; attempt < 2; attempt++) {
    const code = makeCode();
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email: input.email,
        code,
        referred_by: referredBy,
        founder: isFounder,
        source: input.source,
        ip_hash: input.ipHash ?? null,
      })
      .select("code, created_at")
      .single();

    if (error) {
      // Unique violation on invite code — mint another and retry.
      if (
        error.code === "23505" &&
        (error.message.includes("code") || error.details?.includes("code"))
      ) {
        continue;
      }

      // Race: same email inserted concurrently — return the existing row.
      if (
        error.code === "23505" &&
        (error.message.includes("email") || error.details?.includes("email"))
      ) {
        const { data: raced } = await supabase
          .from("waitlist")
          .select("code, created_at")
          .eq("email", input.email)
          .maybeSingle();

        if (raced) {
          const position = await rawPositionFor(raced.created_at, raced.code);
          const referrals = await countReferrals(raced.code);
          return {
            ok: true,
            code: raced.code,
            position: effectivePosition(position, referrals),
            alreadyOnList: true,
          };
        }
      }

      console.error("waitlist insert failed", error);
      return { ok: false, error: "storage" };
    }

    const rawPosition = await rawPositionFor(data.created_at, data.code);

    return {
      ok: true,
      code: data.code,
      position: rawPosition,
      alreadyOnList: false,
    };
  }

  return { ok: false, error: "storage" };
}

async function rawPositionFor(createdAt: string, code: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 1;

  // Rank by join time; break ties with code for stability.
  const [{ count: before }, { count: sameTimeEarlier }] = await Promise.all([
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .lt("created_at", createdAt),
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("created_at", createdAt)
      .lt("code", code),
  ]);

  return (before ?? 0) + (sameTimeEarlier ?? 0) + 1;
}

async function countReferrals(code: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const { count } = await supabase
    .from("waitlist")
    .select("*", { count: "exact", head: true })
    .eq("referred_by", code);

  return count ?? 0;
}

async function standingSupabase(
  code: string,
): Promise<WaitlistStanding | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: entry } = await supabase
    .from("waitlist")
    .select("email, code, created_at, founder")
    .eq("code", code)
    .maybeSingle();

  if (!entry) return null;

  const [rawPosition, referrals, foundersResult] = await Promise.all([
    rawPositionFor(entry.created_at, entry.code),
    countReferrals(entry.code),
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("founder", true),
  ]);

  return standingFrom({
    email: entry.email,
    founder: entry.founder,
    rawPosition,
    referrals,
    foundersTaken: foundersResult.count ?? 0,
  });
}

async function statsSupabase() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { total: 0, spotsLeft: founder.spots };

  const [{ count: total }, { count: foundersTaken }] = await Promise.all([
    supabase.from("waitlist").select("*", { count: "exact", head: true }),
    supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .eq("founder", true),
  ]);

  return {
    total: total ?? 0,
    spotsLeft: Math.max(founder.spots - (foundersTaken ?? 0), 0),
  };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                 */
/* -------------------------------------------------------------------------- */

export async function joinWaitlist(input: {
  email: string;
  consent: boolean;
  referredBy?: string | null;
  source?: string | null;
  ipHash?: string | null;
}): Promise<SignupResult> {
  const email = normalise(input.email);

  if (!emailPattern.test(email)) return { ok: false, error: "invalid-email" };
  if (!input.consent) return { ok: false, error: "consent-required" };

  const referredBy = input.referredBy?.trim().toLowerCase() || null;
  const source = input.source?.slice(0, 120) ?? null;
  const ipHash = input.ipHash?.trim() || null;

  try {
    if (usingLocalStore()) {
      return await joinLocal({ email, referredBy, source, ipHash });
    }
    return await joinSupabase({ email, referredBy, source, ipHash });
  } catch (error) {
    console.error("joinWaitlist failed", error);
    return { ok: false, error: "storage" };
  }
}

export async function getStanding(
  code: string,
): Promise<WaitlistStanding | null> {
  const normalised = code.trim().toLowerCase();
  if (!normalised) return null;

  try {
    if (usingLocalStore()) return await standingLocal(normalised);
    return await standingSupabase(normalised);
  } catch (error) {
    console.error("getStanding failed", error);
    return null;
  }
}

export async function getWaitlistStats() {
  try {
    if (usingLocalStore()) return await statsLocal();
    return await statsSupabase();
  } catch (error) {
    console.error("getWaitlistStats failed", error);
    return { total: 0, spotsLeft: founder.spots };
  }
}
