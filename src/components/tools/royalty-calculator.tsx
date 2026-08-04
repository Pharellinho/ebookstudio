"use client";

import { useState } from "react";

const DELIVERY_COST_PER_MB = 0.15;

function currency(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function RoyaltyCalculator() {
  const [price, setPrice] = useState(4.99);
  const [fileSizeMb, setFileSizeMb] = useState(2);
  const [sales, setSales] = useState(100);

  const eligibleFor70 = price >= 2.99 && price <= 9.99;
  const deliveryCost = fileSizeMb * DELIVERY_COST_PER_MB;
  const royalty70 = eligibleFor70
    ? Math.max(price * 0.7 - deliveryCost, 0)
    : null;
  const royalty35 = price * 0.35;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5 rounded-2xl border border-border bg-surface p-6">
        <Field
          label="List price (USD)"
          value={price}
          min={0.99}
          max={200}
          step={0.5}
          onChange={setPrice}
        />
        <Field
          label="File size (MB)"
          value={fileSizeMb}
          min={0.1}
          max={50}
          step={0.5}
          onChange={setFileSizeMb}
          help="Only affects the 70% plan. A text-only ebook is usually 1–3 MB."
        />
        <Field
          label="Sales per month"
          value={sales}
          min={1}
          max={100000}
          step={10}
          onChange={setSales}
        />
      </div>

      <div className="space-y-4">
        <ResultCard
          title="70% royalty plan"
          available={eligibleFor70}
          perSale={royalty70}
          monthly={royalty70 === null ? null : royalty70 * sales}
          note={
            eligibleFor70
              ? `Delivery cost of ${currency(deliveryCost)} deducted per sale.`
              : "Only available when the list price is between $2.99 and $9.99."
          }
          highlight
        />
        <ResultCard
          title="35% royalty plan"
          available
          perSale={royalty35}
          monthly={royalty35 * sales}
          note="No delivery cost. Available at any price from $0.99 to $200."
        />
        <p className="text-sm leading-relaxed text-muted-foreground">
          Estimates for the Amazon.com store. Actual payouts vary by
          marketplace, VAT treatment and promotional pricing.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  min,
  max,
  step,
  onChange,
  help,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  help?: string;
}) {
  const id = label.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? next : 0);
        }}
        className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-base transition-colors duration-200 focus:border-primary focus:outline-none"
      />
      {help ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

function ResultCard({
  title,
  available,
  perSale,
  monthly,
  note,
  highlight = false,
}: {
  title: string;
  available: boolean;
  perSale: number | null;
  monthly: number | null;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-6 ${
        highlight && available
          ? "border-primary bg-primary-soft/50"
          : "border-border bg-background"
      }`}
    >
      <h3 className="font-display text-base font-semibold">{title}</h3>
      {available && perSale !== null ? (
        <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="font-display text-3xl font-bold text-primary">
            {currency(perSale)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              per sale
            </span>
          </p>
          <p className="font-display text-lg font-semibold">
            {monthly === null ? "—" : currency(monthly)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">
              per month
            </span>
          </p>
        </div>
      ) : (
        <p className="mt-3 font-display text-lg font-semibold text-muted-foreground">
          Not available at this price
        </p>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{note}</p>
    </div>
  );
}
