import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { founder } from "@/lib/site";
import { getSupabaseAdmin, supabaseConfigured } from "@/lib/supabase/admin";

export type WaitlistEntry = {
  email: string;
  code: string;
  confirmToken: string;
  referredBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  founder: boolean;
  source: string | null;
};

export type SignupResult =
  | {
      ok: true;
      alreadyOnList: false;
      code: string;
      confirmToken: string;
      position: number;
    }
  | {
      ok: true;
      alreadyOnList: true;
      /** Server-only payload for throttled resend — never put in API JSON. */
      resend: {
        code: string;
        confirmToken: string;
        position: number;
      };
    }
  | {
      ok: false;
      error: "invalid-email" | "consent-required" | "storage" | "unavailable";
    };

export type WaitlistStanding = {
  emailMasked: string;
  position: number;
  referrals: number;
  founder: boolean;
  bonusCredits: number;
  spotsLeft: number;
  freeSpotEarned: boolean;
  confirmed: boolean;
};

const LOCAL_STORE = path.join(process.cwd(), ".data", "waitlist.json");
const INVITE_CODE_PATTERN = /^[a-f0-9]{8,64}$/;

const emailPattern = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function normalise(email: string) {
  return email.trim().toLowerCase();
}

function makeCode() {
  return randomBytes(16).toString("hex");
}

function makeConfirmToken() {
  return randomBytes(16).toString("hex");
}

function tokensMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return "***";
  const keep = Math.min(2, user.length);
  return `${user.slice(0, keep)}***@${domain}`;
}

export function sanitizeSource(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim().slice(0, 120);
  if (!trimmed) return null;

  if (/^[a-z0-9_\-]{1,64}$/i.test(trimmed)) return trimmed.toLowerCase();

  try {
    const url = new URL(trimmed);
    return url.hostname.slice(0, 120) || null;
  } catch {
    return trimmed.replace(/[^\w.\-:/]/g, "").slice(0, 64) || null;
  }
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
  confirmed: boolean;
}): WaitlistStanding {
  return {
    emailMasked: maskEmail(input.email),
    position: effectivePosition(input.rawPosition, input.referrals),
    referrals: input.referrals,
    founder: input.founder,
    bonusCredits:
      founder.bonusCredits + input.referrals * founder.referralCredits,
    spotsLeft: Math.max(founder.spots - input.foundersTaken, 0),
    freeSpotEarned: input.referrals >= founder.referralsForFreeSpot,
    confirmed: input.confirmed,
  };
}

function isProductionRuntime() {
  return process.env.VERCEL === "1" || process.env.NODE_ENV === "production";
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
    const parsed = JSON.parse(raw) as Array<Partial<WaitlistEntry> & WaitlistEntry>;
    return parsed.map((entry) => ({
      ...entry,
      confirmToken: entry.confirmToken || makeConfirmToken(),
      confirmedAt: entry.confirmedAt ?? null,
    }));
  } catch {
    return [];
  }
}

async function writeLocal(entries: WaitlistEntry[]) {
  await mkdir(path.dirname(LOCAL_STORE), { recursive: true });
  await writeFile(LOCAL_STORE, JSON.stringify(entries, null, 2), "utf8");
}

function countConfirmedReferralsLocal(entries: WaitlistEntry[], code: string) {
  return entries.filter(
    (item) => item.referredBy === code && item.confirmedAt,
  ).length;
}

async function joinLocal(input: {
  email: string;
  referredBy: string | null;
  source: string | null;
  ipHash?: string | null;
}): Promise<SignupResult> {
  if (isProductionRuntime()) {
    return { ok: false, error: "unavailable" };
  }

  const entries = await readLocal();
  const existing = entries.find((entry) => entry.email === input.email);

  if (existing) {
    const index = entries.indexOf(existing);
    const referrals = countConfirmedReferralsLocal(entries, existing.code);
    return {
      ok: true,
      alreadyOnList: true,
      resend: {
        code: existing.code,
        confirmToken: existing.confirmToken,
        position: effectivePosition(index + 1, referrals),
      },
    };
  }

  const referrer = input.referredBy
    ? entries.find((entry) => entry.code === input.referredBy)
    : undefined;

  const referredBy =
    referrer && referrer.email !== input.email ? referrer.code : null;
  const isFounder = entries.length < founder.spots;

  const entry: WaitlistEntry = {
    email: input.email,
    code: makeCode(),
    confirmToken: makeConfirmToken(),
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
    alreadyOnList: false,
    code: entry.code,
    confirmToken: entry.confirmToken,
    position: entries.length,
  };
}

async function standingLocal(code: string): Promise<WaitlistStanding | null> {
  const entries = await readLocal();
  const index = entries.findIndex((entry) => entry.code === code);
  if (index === -1) return null;

  const entry = entries[index];
  const referrals = countConfirmedReferralsLocal(entries, code);
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
    confirmed: Boolean(entry.confirmedAt),
  });
}

async function confirmLocal(code: string, token: string): Promise<boolean> {
  const entries = await readLocal();
  const entry = entries.find((item) => item.code === code);
  if (!entry || !tokensMatch(entry.confirmToken, token)) return false;
  if (!entry.confirmedAt) {
    entry.confirmedAt = new Date().toISOString();
    await writeLocal(entries);
  }
  return true;
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
  if (!referredBy || !INVITE_CODE_PATTERN.test(referredBy)) return null;

  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data } = await supabase
    .from("waitlist")
    .select("code, email")
    .eq("code", referredBy)
    .maybeSingle();

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
    .select("code, confirm_token, created_at")
    .eq("email", input.email)
    .maybeSingle();

  if (existing) {
    const position = await rawPositionFor(existing.created_at, existing.code);
    const referrals = await countReferrals(existing.code);
    return {
      ok: true,
      alreadyOnList: true,
      resend: {
        code: existing.code,
        confirmToken: existing.confirm_token,
        position: effectivePosition(position, referrals),
      },
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

  for (let attempt = 0; attempt < 3; attempt++) {
    const code = makeCode();
    const confirmToken = makeConfirmToken();
    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        email: input.email,
        code,
        confirm_token: confirmToken,
        referred_by: referredBy,
        founder: isFounder,
        source: input.source,
        ip_hash: input.ipHash ?? null,
        confirmed_at: null,
      })
      .select("code, confirm_token, created_at")
      .single();

    if (error) {
      if (
        error.code === "23505" &&
        (error.message.includes("code") ||
          error.message.includes("confirm_token") ||
          error.details?.includes("code") ||
          error.details?.includes("confirm_token"))
      ) {
        continue;
      }

      if (
        error.code === "23505" &&
        (error.message.includes("email") || error.details?.includes("email"))
      ) {
        const { data: raced } = await supabase
          .from("waitlist")
          .select("code, confirm_token, created_at")
          .eq("email", input.email)
          .maybeSingle();

        if (raced) {
          const position = await rawPositionFor(raced.created_at, raced.code);
          const referrals = await countReferrals(raced.code);
          return {
            ok: true,
            alreadyOnList: true,
            resend: {
              code: raced.code,
              confirmToken: raced.confirm_token,
              position: effectivePosition(position, referrals),
            },
          };
        }
      }

      console.error("waitlist insert failed", error);
      return { ok: false, error: "storage" };
    }

    const rawPosition = await rawPositionFor(data.created_at, data.code);

    return {
      ok: true,
      alreadyOnList: false,
      code: data.code,
      confirmToken: data.confirm_token,
      position: rawPosition,
    };
  }

  return { ok: false, error: "storage" };
}

async function rawPositionFor(createdAt: string, code: string) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return 1;

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
    .eq("referred_by", code)
    .not("confirmed_at", "is", null);

  return count ?? 0;
}

async function standingSupabase(
  code: string,
): Promise<WaitlistStanding | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: entry } = await supabase
    .from("waitlist")
    .select("email, code, created_at, founder, confirmed_at")
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
    confirmed: Boolean(entry.confirmed_at),
  });
}

async function confirmSupabase(code: string, token: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: entry } = await supabase
    .from("waitlist")
    .select("code, confirm_token, confirmed_at")
    .eq("code", code)
    .maybeSingle();

  if (!entry || !tokensMatch(entry.confirm_token, token)) return false;

  if (!entry.confirmed_at) {
    const { error } = await supabase
      .from("waitlist")
      .update({ confirmed_at: new Date().toISOString() })
      .eq("code", code)
      .eq("confirm_token", token);

    if (error) {
      console.error("waitlist confirm failed", error);
      return false;
    }
  }

  return true;
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

  if (usingLocalStore() && isProductionRuntime()) {
    return { ok: false, error: "unavailable" };
  }

  const referredBy = input.referredBy?.trim().toLowerCase() || null;
  const source = sanitizeSource(input.source);
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
  if (!INVITE_CODE_PATTERN.test(normalised)) return null;

  try {
    if (usingLocalStore()) return await standingLocal(normalised);
    return await standingSupabase(normalised);
  } catch (error) {
    console.error("getStanding failed", error);
    return null;
  }
}

/** Marks the waitlist row confirmed when the email link token matches. */
export async function confirmWaitlist(
  code: string,
  token: string,
): Promise<boolean> {
  const normalisedCode = code.trim().toLowerCase();
  const normalisedToken = token.trim().toLowerCase();
  if (
    !INVITE_CODE_PATTERN.test(normalisedCode) ||
    !INVITE_CODE_PATTERN.test(normalisedToken)
  ) {
    return false;
  }

  try {
    if (usingLocalStore()) return await confirmLocal(normalisedCode, normalisedToken);
    return await confirmSupabase(normalisedCode, normalisedToken);
  } catch (error) {
    console.error("confirmWaitlist failed", error);
    return false;
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
