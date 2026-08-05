import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { ensureProfile, type Profile } from "@/lib/auth/profile";

/** Returns the synced Supabase profile for the signed-in Clerk user, or null. */
export async function getCurrentProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress;

  if (!email || !user) return null;

  return ensureProfile({
    clerkUserId: userId,
    email,
    displayName: user.fullName ?? user.firstName ?? null,
    imageUrl: user.imageUrl ?? null,
  });
}
