import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export type Profile = {
  id: string;
  email: string;
  displayName: string | null;
  imageUrl: string | null;
  isFounder: boolean;
};

/**
 * Upsert a Clerk user into Supabase profiles.
 * Founding pricing only when waitlist.founder is true and email is confirmed
 * (same 100-spot cap as joinWaitlist — never "any waitlist row").
 */
export async function ensureProfile(input: {
  clerkUserId: string;
  email: string;
  displayName?: string | null;
  imageUrl?: string | null;
}): Promise<Profile | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.error("ensureProfile: Supabase is not configured");
    return null;
  }

  const email = input.email.trim().toLowerCase();
  if (!email) return null;

  const isFounderEligible = await resolveFounderEligibility(supabase, email);

  const { data: existing } = await supabase
    .from("profiles")
    .select("id, email, display_name, image_url, is_founder")
    .eq("id", input.clerkUserId)
    .maybeSingle();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("profiles")
      .update({
        email,
        display_name: input.displayName ?? existing.display_name,
        image_url: input.imageUrl ?? existing.image_url,
        // Re-sync so false grants from older logic are corrected, and
        // real founders who confirm after signup still get the flag.
        is_founder: isFounderEligible,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.clerkUserId)
      .select("id, email, display_name, image_url, is_founder")
      .single();

    if (error || !updated) {
      console.error("ensureProfile update failed", error);
      return {
        id: existing.id,
        email: existing.email,
        displayName: existing.display_name,
        imageUrl: existing.image_url,
        isFounder: existing.is_founder,
      };
    }

    return {
      id: updated.id,
      email: updated.email,
      displayName: updated.display_name,
      imageUrl: updated.image_url,
      isFounder: updated.is_founder,
    };
  }

  const { data: created, error } = await supabase
    .from("profiles")
    .insert({
      id: input.clerkUserId,
      email,
      display_name: input.displayName ?? null,
      image_url: input.imageUrl ?? null,
      is_founder: isFounderEligible,
    })
    .select("id, email, display_name, image_url, is_founder")
    .single();

  if (error || !created) {
    console.error("ensureProfile insert failed", error);
    return null;
  }

  return {
    id: created.id,
    email: created.email,
    displayName: created.display_name,
    imageUrl: created.image_url,
    isFounder: created.is_founder,
  };
}

async function resolveFounderEligibility(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  email: string,
): Promise<boolean> {
  const { data: waitlistHit } = await supabase
    .from("waitlist")
    .select("founder, confirmed_at")
    .eq("email", email)
    .maybeSingle();

  return (
    waitlistHit?.founder === true && waitlistHit.confirmed_at != null
  );
}
