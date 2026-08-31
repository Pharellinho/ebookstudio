import type { Metadata } from "next";
import { UserProfile } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Profile",
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-6 font-display text-3xl font-extrabold tracking-tight">
        Profile
      </h1>
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-background shadow-[0_8px_30px_rgba(0,0,0,0.05)]">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "shadow-none border-0",
            },
            variables: {
              colorPrimary: "#d4a017",
            },
          }}
        />
      </div>
    </div>
  );
}
