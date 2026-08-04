"use client";

import { useEffect, useState } from "react";
import { launch } from "@/lib/site";

type Remaining = { days: number; hours: number; minutes: number; seconds: number };

function remainingUntil(target: number): Remaining | null {
  const diff = target - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export function Countdown() {
  const target = new Date(launch.date).getTime();
  // Rendered only after mount: the server and the visitor never agree on "now".
  const [mounted, setMounted] = useState(false);
  const [remaining, setRemaining] = useState<Remaining | null>(null);

  useEffect(() => {
    setMounted(true);
    setRemaining(remainingUntil(target));

    const timer = setInterval(() => {
      setRemaining(remainingUntil(target));
    }, 1000);

    return () => clearInterval(timer);
  }, [target]);

  if (!mounted) {
    return <div className="h-24" aria-hidden="true" />;
  }

  if (!remaining) {
    return (
      <div className="inline-flex flex-col items-center gap-2 rounded-2xl border-2 border-foreground bg-primary px-8 py-5 shadow-md">
        <p className="font-display text-2xl font-extrabold text-foreground">
          We are live
        </p>
        <p className="text-sm text-muted-foreground">
          Founding spots are being assigned right now.
        </p>
      </div>
    );
  }

  const units = [
    { value: remaining.days, label: "days" },
    { value: remaining.hours, label: "hours" },
    { value: remaining.minutes, label: "min" },
    { value: remaining.seconds, label: "sec" },
  ];

  return (
    <div>
      <p className="text-center text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
        Launching {launch.label}
      </p>
      <div
        className="mt-3 flex items-center justify-center gap-2 sm:gap-3"
        role="timer"
        aria-live="off"
      >
        {units.map((unit) => (
          <div
            key={unit.label}
            className="min-w-16 rounded-xl border-2 border-foreground bg-background px-3 py-2.5 text-center shadow-sm sm:min-w-20"
          >
            <p className="font-display text-2xl font-extrabold tabular-nums sm:text-3xl">
              {String(unit.value).padStart(2, "0")}
            </p>
            <p className="mt-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-muted-foreground">
              {unit.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
