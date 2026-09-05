"use client";

import { useEffect, useState } from "react";
import { firstDifference, roundTripMarkdown } from "@/lib/editor/round-trip";

type Result = {
  label: string;
  identical: boolean;
  diff: { line: number; before: string; after: string } | null;
  length: number;
};

export function RoundTripClient({ samples }: { samples: { label: string; body: string }[] }) {
  const [results, setResults] = useState<Result[] | null>(null);

  useEffect(() => {
    const out: Result[] = samples.map((sample) => {
      const output = roundTripMarkdown(sample.body);
      const identical = output === sample.body;
      return {
        label: sample.label,
        identical,
        diff: identical ? null : firstDifference(sample.body, output),
        length: sample.body.length,
      };
    });
    setResults(out);
    // Exposed for the automated check in the browser panel.
    (window as unknown as { __roundtrip: Result[] }).__roundtrip = out;
    (window as unknown as { __roundTrip: unknown }).__roundTrip = roundTripMarkdown;
    (window as unknown as { __samples: unknown }).__samples = samples.map((s) => ({
      label: s.label,
      body: s.body,
      output: roundTripMarkdown(s.body),
    }));
  }, [samples]);

  if (!results) return <p>Running…</p>;
  const bad = results.filter((r) => !r.identical);
  return (
    <div className="space-y-4 text-sm">
      <p className="font-semibold">
        {results.length} chapters · {results.length - bad.length} identical · {bad.length} differ
      </p>
      <ul className="space-y-3">
        {bad.map((r) => (
          <li key={r.label} className="rounded-lg border border-border p-3">
            <p className="font-semibold">{r.label}</p>
            <p className="text-xs text-muted-foreground">line {r.diff?.line}</p>
            <pre className="mt-1 whitespace-pre-wrap text-xs text-destructive">- {r.diff?.before}</pre>
            <pre className="whitespace-pre-wrap text-xs text-emerald-700">+ {r.diff?.after}</pre>
          </li>
        ))}
      </ul>
    </div>
  );
}
