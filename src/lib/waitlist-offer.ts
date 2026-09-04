/**
 * Legacy founding-offer numbers.
 *
 * The founding offer is gone from the marketing site — the public price is a
 * flat $29/mo. These constants stay only because the pre-launch waitlist
 * (`src/lib/waitlist.ts`, the confirmation email and `/welcome`) still runs on
 * them, and that system is being retired separately. Nothing new should import
 * this file.
 */
export const waitlistOffer = {
  spots: 100,
  monthlyPrice: 19,
  monthlyCredits: 500,
  bonusCredits: 300,
  reservationPrice: 9,
  launchPrice: 29,
  launchCredits: 300,
  /** Credits granted per confirmed referral. */
  referralCredits: 50,
  /** Positions gained per confirmed referral. */
  referralJump: 10,
  /** Referrals needed for a free founding spot. */
  referralsForFreeSpot: 10,
} as const;
