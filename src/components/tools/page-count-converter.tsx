"use client";

import { useState } from "react";

const trimSizes = [
  { label: '5" × 8"', wordsPerPage: 250 },
  { label: '5.5" × 8.5"', wordsPerPage: 280 },
  { label: '6" × 9"', wordsPerPage: 320 },
  { label: '8.5" × 11"', wordsPerPage: 450 },
];

const fontSizes = [
  { label: "10 pt", factor: 1.15 },
  { label: "11 pt", factor: 1 },
  { label: "12 pt", factor: 0.85 },
  { label: "14 pt (large print)", factor: 0.65 },
];

export function PageCountConverter() {
  const [words, setWords] = useState(20000);
  const [trim, setTrim] = useState(trimSizes[2].label);
  const [font, setFont] = useState(fontSizes[1].label);

  const trimSize = trimSizes.find((item) => item.label === trim) ?? trimSizes[2];
  const fontSize = fontSizes.find((item) => item.label === font) ?? fontSizes[1];

  const wordsPerPage = trimSize.wordsPerPage * fontSize.factor;
  const pages = words > 0 ? Math.max(Math.round(words / wordsPerPage), 1) : 0;
  const readingMinutes = Math.round(words / 240);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
        <div>
          <label htmlFor="words" className="block text-sm font-semibold">
            Word count
          </label>
          <input
            id="words"
            type="number"
            inputMode="numeric"
            min={0}
            step={500}
            value={words}
            onChange={(event) => setWords(Number(event.target.value) || 0)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
          />
        </div>

        <Select
          id="trim"
          label="Trim size"
          value={trim}
          options={trimSizes.map((item) => item.label)}
          onChange={setTrim}
        />
        <Select
          id="font"
          label="Body font size"
          value={font}
          options={fontSizes.map((item) => item.label)}
          onChange={setFont}
        />
      </div>

      <div className="space-y-4">
        <div className="rounded-2xl border border-primary bg-primary-soft/50 p-6">
          <p className="text-sm font-semibold text-primary-strong">
            Estimated printed pages
          </p>
          <p className="mt-2 font-display text-5xl font-bold text-primary">
            {pages}
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Around {Math.round(wordsPerPage)} words per page at this trim and
            font size.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-background p-6">
          <p className="text-sm font-semibold">Reading time</p>
          <p className="mt-1 font-display text-2xl font-bold">
            {readingMinutes < 60
              ? `${readingMinutes} min`
              : `${Math.floor(readingMinutes / 60)} h ${readingMinutes % 60} min`}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Based on an average reading speed of 240 words per minute.
          </p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">
          Estimates only. Chapter breaks, images and front matter typically add
          5 to 10 pages to the final count.
        </p>
      </div>
    </div>
  );
}

function Select({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full cursor-pointer rounded-lg border border-border bg-background px-4 py-3 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
