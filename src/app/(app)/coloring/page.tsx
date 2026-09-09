import type { Metadata } from "next";
import { ColoringBrief } from "@/components/app/coloring-brief";
import { UpgradePanel } from "@/components/app/upgrade-panel";
import { getCurrentProfile } from "@/lib/auth/session";
import { planAllowsColoring } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Coloring books",
  robots: { index: false, follow: false },
};

/** A coloring book starts here: the brief, then the plan of its pages. */
export default async function ColoringPage() {
  const profile = await getCurrentProfile();
  if (profile && !planAllowsColoring(profile.billing.plan)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <UpgradePanel
          title="The coloring book studio"
          body="Plan a coloring book from a theme, have every page drawn as clean black lines, then download the pack for KDP, Etsy and your own site. Every page is drawn by the image model, which is why the studio comes with a plan."
          isFounder={profile.isFounder}
        />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ColoringBrief defaultAuthor={profile?.displayName ?? ""} />
    </div>
  );
}
