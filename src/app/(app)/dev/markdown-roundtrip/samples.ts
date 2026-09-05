/* Synthetic chapters covering every construct Scribe's prompts produce, plus
   the punctuation that markdown serialisers like to escape. */
export const syntheticSamples: { label: string; body: string }[] = [
  {
    label: "synthetic / headings, lists, bold lead-ins",
    body: `Before you plant your first seed, it’s crucial to understand your garden space. Each garden is unique, and factors like sunlight, soil type, and available resources vary depending on your location.

## Sunlight: The Lifeblood of Your Garden

Vegetables need sunlight to thrive. Most require at least six hours of direct sunlight each day. Here’s how to assess sunlight in your garden:

1. **Observe the Area**: Spend a few days noting how much sun different areas of your yard receive.
2. **Identify Shade Sources**: Look for trees, buildings, or fences that might cast shadows.
3. **Use a Sunlight Chart**: Create a simple chart to track sunlight hours throughout the day.

Consider these factors when choosing where to place your garden.

### Soil Type: The Foundation of Growth

- **Sandy soil** drains fast and warms early.
- **Clay soil** holds water but compacts.
- **Loam** is the balance most vegetables want.

> Tip: a $12 soil test kit tells you more than a month of guessing.

---

**Takeaway:** pick the sunniest spot you have, then fix the soil.`,
  },
  {
    label: "synthetic / italics, underscores, ampersands, brackets",
    body: `Herbs like basil, mint & thyme are *forgiving*, and _rosemary_ is nearly indestructible.

Some growers use names like balcony_mix or plan_v2 in their notes; others write [brackets] or 3 * 4 = 12 when they mean it literally.

Prices sit between $8–$15 a pot, and a 20% discount is common in September.`,
  },
  {
    label: "synthetic / loose list and nested list",
    body: `Two routines work:

- Morning watering, before the sun hits the pots.

- Evening watering, once the balcony is in shade.

Either way:

- Check the soil first
  - Dry two knuckles down: water
  - Still damp: wait
- Empty the saucer after ten minutes`,
  },
  {
    label: "synthetic / numbered list restarting and inline code",
    body: `Use the \`finger test\` before every watering.

1. Push a finger into the soil.
2. Dry? Water slowly until it drains.
3. Damp? Come back tomorrow.

Then repeat:

1. Note the date.
2. Note the weather.`,
  },
  {
    label: "synthetic / new prompt shape: quote and comparison table",
    body: `Most people water on a schedule. The plant does not care about your schedule; it cares about the top two centimetres of soil.

## The two-knuckle test

Push a finger in to the second knuckle. Dry means water now, damp means wait until tomorrow. That single habit fixes most of the yellow leaves people blame on "bad soil".

> A dead herb is almost always a drowned herb, not a thirsty one.

## Pot material changes the maths

| Material | Dries out | Weight | Cost |
| --- | --- | --- | --- |
| Terracotta | 2 days in July | Heavy | $4–$9 |
| Glazed ceramic | 4 days | Heavy | $12–$25 |
| Plastic | 5–6 days | Light | $2–$5 |

Terracotta breathes, which is why it dries fastest and why basil loves it in spring and hates it in August.`,
  },
];
