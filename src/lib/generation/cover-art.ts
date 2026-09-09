import "server-only";
import type { EbookFormat } from "@/lib/content";
import { GENERATION_MODEL, getOpenAI, sampling, logUsage } from "@/lib/generation/openai";

const IMAGE_MODEL = "gpt-image-2";

/* TEMPORARY debug trace: prints the brief and the exact prompts sent to the
   image model in the `npm run dev` terminal, so they can be read and tuned.
   Off in production; never reaches the browser or an API response. */
const DEBUG_COVER_PROMPTS = process.env.NODE_ENV !== "production";

/* ---------------------------------------------------------------------------
   Registers.

   One visual strategy does not fit every subject: a game guide wants a
   person mid-action, a cookbook wants the dish alone, a productivity book
   wants one metaphor or pure type, a report wants almost nothing but type.
   The text model classifies the SUBJECT (never the format) into one of six
   registers, and only that register's rules reach the image model.

   Colour: the brief names the subject's own colour world once, then three
   variations of it (saturated, deep, light). Three different worlds made
   the three covers look like three different books.
--------------------------------------------------------------------------- */
export const COVER_REGISTERS = [
  "action",
  "object",
  "place",
  "concept",
  "institutional",
  "activity-book",
] as const;
export type CoverRegister = (typeof COVER_REGISTERS)[number];

type Direction = {
  id: string;
  brief: string;
  /** True for the photographic directions; the prompt then forbids any drawn treatment. */
  photo: boolean;
};

type RegisterRules = {
  /** What the cover shows, in the art director's words. */
  shows: string;
  /** Whether a photographic treatment is allowed at all. */
  photoreal: boolean;
  /** The three directions, each with its own composition. */
  directions: [Direction, Direction, Direction];
};

/* How a person appears on a cover without giving the model a face or a pair
   of hands to get wrong — the two things that betray a generated image. */
const PERSON_RULE =
  "If a person is shown: from BEHIND, in PROFILE, CROPPED above or below the face, small and AT A DISTANCE inside the scene, or ONLY THE HANDS in close-up on what they are doing. Never a face straight on in close-up, never eye contact with the camera, never a stock-photo smile. Someone caught in their gesture, not posing.";

/* Said on the two photographic directions of every concrete register, so
   that only the third direction is ever drawn. */
const PHOTOGRAPH_NOT_DRAWN =
  "TREATMENT: this cover is a PHOTOGRAPH. Not an illustration, not a painting, not a drawing, not a flat vector, not a 3D render. If it does not look like a real photograph of a real place, object or person, it is wrong.";

const PHOTO_RULE =
  "Photographic and realistic: real materials with their texture (wood grain, worn paper, steel, fabric, skin at a distance), natural or cinematic light, shallow depth of field, a light film grain. It should read as a photograph a good art director commissioned, not as a render.";

const REGISTER_RULES: Record<CoverRegister, RegisterRules> = {
  action: {
    shows:
      "Someone doing the thing. A person caught mid-action with the stakes visible — the tool in use, the moment before the result. " +
      PERSON_RULE +
      " " +
      PHOTO_RULE,
    photoreal: true,
    directions: [
      {
        id: "moment",
        photo: true,
        brief:
          "Direction A — the moment, photographic: the person seen from behind or in profile, mid-gesture, in the real setting of the subject; cinematic light, shallow depth of field. Full-bleed image; the title sits in the calmest, clearly dark or clearly light third of the frame.",
      },
      {
        id: "hands",
        photo: true,
        brief:
          "Direction B — the hands, photographic: a tight close-up on the hands and the tool or object they work with, no face in frame, hard crop, natural light. The title set large across the top or bottom band.",
      },
      {
        id: "scene",
        photo: false,
        brief:
          "Direction C — the scene, illustrated (the one drawn direction): the same action as an editorial illustration in ink and flat colour, the figure small enough that the setting reads too, seen from behind or at a distance. Image on the lower two thirds, title on a solid colour block above.",
      },
    ],
  },
  object: {
    shows:
      "The thing itself, alone, beautifully lit. No people, no hands, no scene around it: one object, or a small arrangement of the subject's objects, given the whole frame. " +
      PHOTO_RULE +
      " The three covers must differ in FRAMING as strongly as in colour — each direction below fixes a different camera position and a different place for the type.",
    photoreal: true,
    directions: [
      {
        id: "top-down",
        photo: true,
        brief:
          "Direction A — top-down, photographic: the object seen from directly above, flat-lay, centred on a plain real surface, soft even light. The title sits ABOVE the object in the top third, the author name at the very bottom.",
      },
      {
        id: "eye-level",
        photo: true,
        brief:
          "Direction B — eye-level close-up, photographic: the camera at the object's own height, very close, shallow depth of field so the background dissolves; the object fills the LOWER two thirds and is cropped by the bottom edge. The title sits in the soft, out-of-focus upper third.",
      },
      {
        id: "offset",
        photo: false,
        brief:
          "Direction C — offset, illustrated (the one drawn direction): the object as a considered illustration pushed hard into one lower corner, small, occupying a fifth of the cover at most, leaving a large plain field of colour where the title is set very large and flush to the opposite side.",
      },
    ],
  },
  place: {
    shows:
      "A space: its light, its scale, its weather. The cover is somewhere the reader could stand, and unless there is a reason not to, someone is in it — small, seen from behind or at a distance, walking into the place or standing in it. " +
      PERSON_RULE +
      " " +
      PHOTO_RULE,
    photoreal: true,
    directions: [
      {
        id: "vista",
        photo: true,
        brief:
          "Direction A — vista, photographic: a wide view of the place at a specific hour (dawn, dusk, storm light), a single distant figure for scale, full-bleed, the title set in the sky or the calmest area.",
      },
      {
        id: "threshold",
        photo: true,
        brief:
          "Direction B — threshold, photographic: at eye level, close to a doorway, a street corner or a window of the place, a person seen from behind about to step through; shallow depth of field, the title on the darkest or lightest plane.",
      },
      {
        id: "painted",
        photo: false,
        brief:
          "Direction C — painted (the one drawn direction): the place as a flat-colour landscape illustration, layered planes, limited palette, a tiny figure from behind; a horizontal band for the title.",
      },
    ],
  },
  concept: {
    shows:
      "The subject is abstract, so the cover is ONE real object, photographed, that stands for the idea — an hourglass, a closed door, a shut notebook, a single key. Never an abstract shape, never a chevron, circle or line as decoration, never a narrative scene, never a person at a desk. " +
      PHOTO_RULE +
      " FORBIDDEN: decorative ornaments with no meaning placed under the title to fill space. If no real object honestly stands for the idea, draw nothing: well-set text alone is the cover.",
    photoreal: true,
    directions: [
      {
        id: "object-metaphor",
        photo: true,
        brief:
          "Direction A — the object, photographic: ONLY if a metaphor object is given below, photograph that one real object alone on a plain surface, soft directional light, plenty of empty space, title above it. If no metaphor is given, this cover is purely typographic: title very large, nothing else.",
      },
      {
        id: "type-only",
        photo: false,
        brief:
          "Direction B — type only: no image, no mark, no ornament of any kind. One perfectly flat, uniform background colour from the palette — no gradient, no fog, no glow — and the title set very large in crisp letters, flush left, with the subtitle and author aligned to the same left edge.",
      },
      {
        id: "oversized",
        photo: false,
        brief:
          "Direction C — oversized: purely typographic. The title's first word set so large it bleeds off the edges of the cover, the rest of the title normal size beneath it, two colours only, no image, no ornament.",
      },
    ],
  },
  institutional: {
    shows:
      "Typography dominates. Very sober. At most ONE discreet graphic element, and it is abstract: a fine rule, a single geometric mark, or one thin chart line. Absolutely no icons, pictograms, clip-art, symbols or little objects — not a calendar, a magnifier, a coin, a ruler, a mouse, a pie chart. No illustration, no photograph, no narrative of any kind.",
    photoreal: false,
    directions: [
      {
        id: "type-block",
        photo: false,
        brief:
          "Direction A — type block: a perfectly flat, uniform off-white paper ground (no haze, no gradient, no texture beyond faint print grain), the title in a strong grotesque typeface set flush left, one thin rule in the accent colour, and nothing else at all.",
      },
      {
        id: "pattern",
        photo: false,
        brief:
          "Direction B — pattern: a fine, quiet geometric pattern (thin lines, small dots or a soft grid) filling the ground, and a solid panel carrying the title. The pattern is the only element; no icons or objects anywhere.",
      },
      {
        id: "colour-field",
        photo: false,
        brief:
          "Direction C — colour field: the whole cover is one perfectly flat, uniform deep colour from the palette — no gradient, no fog, no vignette, no glow — with the title reversed out in large crisp type and a small mark in one corner; the most restrained of the three.",
      },
    ],
  },
  "activity-book": {
    shows:
      "Clearly made to be filled in: crisp black outlines, high contrast, generous white, a cheerful subject drawn as bold line art. It must look like the first page of the book, not like a painting.",
    photoreal: false,
    directions: [
      {
        id: "outline-scene",
        photo: false,
        brief:
          "Direction A — outline scene: a full scene from the subject as thick black line art on white, partially coloured in bright flat colours as a sample, the title in a rounded bold typeface.",
      },
      {
        id: "hero-outline",
        photo: false,
        brief:
          "Direction B — hero outline: one big character or object from the subject as bold outline art, centred on a single bright colour ground, title above.",
      },
      {
        id: "framed",
        photo: false,
        brief:
          "Direction C — framed: a white cover with a coloured border, a small line-art vignette in the middle, and the title large and playful. Simple, high contrast.",
      },
    ],
  },
};

function isRegister(value: unknown): value is CoverRegister {
  return typeof value === "string" && (COVER_REGISTERS as readonly string[]).includes(value);
}

/* Non-negotiable, and said first so it does not dilute: a cover whose title
   cannot be read is a manufacturing defect, whatever else it gets right. */
const LEGIBILITY_FIRST =
  "FIRST RULE — CONTRAST: every piece of text must contrast STRONGLY with whatever is behind it: light text on a dark ground, or dark text on a light ground, never two close values (no cream on beige, no grey on grey, no white on pale sky). Where the text sits over an image, that area of the image must be clearly dark or clearly light. The title must stay readable in black and white and at 150 pixels wide. SECOND RULE — SAFE MARGIN: keep a clear margin of at least 6% of the width on every side; no letter of the title, subtitle or author name may touch or leave the edge of the cover.";

/* The two things that wrecked the first runs: the model drawing a physical
   book on a table instead of the cover artwork, and reaching for the
   obvious symbol (money bags, coins, light bulbs). Both are named. */
const FLAT_ARTWORK =
  "IMPORTANT: produce the flat 2D cover artwork itself — the design file as it goes to the printer — filling the entire image edge to edge, viewed straight on, no perspective. Do NOT draw a physical book, a mock-up, a table, a wall, a floor, a shadow, a spine, page edges, thickness, or any background around the cover. The image IS the cover.";

const TASTE =
  "Taste: the restraint of a real publisher's cover. Controlled colour, asymmetric composition, breathing room, subtle print grain. Everything is sharp: crisp letter edges, no blur, no haze, no glow or halo around type, no soft gradients standing in for a background. Avoid glossy 3D renders, neon or over-saturated colour, lens flares, hyper-detailed clutter, glowing edges, fantasy-art gloss, stock-photo smiles. No literal clichés: no money bags, coins, dollar signs, light bulbs, rockets, handshakes, trophies or arrows.";

/* Universal rules, the same for every register. */
/* A phone filming a woman from the front cannot show her back on its
   screen. The picture must obey its own physics, and the cheapest way to
   make that true is to keep every screen and reflection empty. */
const COHERENCE =
  "PHYSICAL COHERENCE, NON-NEGOTIABLE: no device in the picture is filming, photographing or mirroring the person. Every phone, laptop, monitor, camera and TV screen is switched OFF: a plain dark glass, showing nothing at all — no picture, no interface, no second copy of the person or the room. If a phone must appear, show its back or lay it flat with the screen dark. No mirror or glossy surface reflects the person. Nothing in the image may contradict another part of it.";

const UNIVERSAL =
  "If an author's name is given it is set small, at about one fifth of the title's letter height — present, never competing. No other words, numbers, logos, badges, stickers, blurbs or watermarks anywhere — and that includes props: any paper, screen, sign, label or board in the picture is blank, with no writing on it at all. Vertical portrait format.";

/**
 * The art director's brief, worked out by the text model before any picture
 * is drawn: which register the SUBJECT belongs to, what to show for it,
 * the subject's colour world with three variations of it, and a cover-length
 * subtitle.
 */
export type CoverBrief = {
  register: CoverRegister;
  /** One sentence: what the cover shows, in this register's terms. */
  subject: string;
  /** Only for "action": the precise thing the person is doing. */
  activity?: string;
  /** Only for "concept": one real object, photographed, that stands for the idea — or null. */
  metaphor?: string | null;
  /** Only for "concept" and "institutional": why no concrete anchor was found. */
  whyAbstract?: string;
  /** Concrete, drawable specifics of THIS subject. */
  motifs: string[];
  /** The subject's own colour world: the palette a reader recognises the subject by. */
  paletteCore: string;
  /** Three variations INSIDE that world (saturated, deep, light), one per direction. */
  palettes: [string, string, string];
  mood: string;
  /** The subtitle as it should appear on the cover: six words at most. */
  coverSubtitle: string | null;
};

/* Six words at most, no trailing punctuation, and never a dangling "for"
   or "and" left over from a cut. */
const DANGLING = new Set(["for", "and", "to", "of", "the", "a", "an", "in", "on", "with", "your", "or", "but"]);
function sixWords(text: string | null | undefined): string | null {
  if (!text) return null;
  const words = text.trim().replace(/[.!?]+$/, "").split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  const kept = words.slice(0, 6);
  while (kept.length > 1 && DANGLING.has(kept[kept.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ""))) {
    kept.pop();
  }
  return kept.join(" ").replace(/[,:;–—-]+$/, "");
}

export async function coverBrief(input: {
  title: string;
  subtitle: string | null;
  idea: string;
  chapterTitles: string[];
}): Promise<CoverBrief> {
  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: GENERATION_MODEL,
    ...sampling(GENERATION_MODEL, 0.4),
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a book cover art director. Before anything else, look for a REAL, CONCRETE anchor for the book's subject: a person doing something, a physical object, or an actual place. Almost every subject has one. Focused work is a desk and a closed door. Negotiation is two people and a table. Saving money is a jar on a kitchen shelf. A real object always beats a geometric shape. Only when you honestly find no concrete anchor do you fall back to an abstract register, and then you must say why.

Registers, in the order you should try them:
- "action": someone does something — games, sport, freelancing, crafts, trades, job hunting, moving abroad, studying, cooking as a practice. The cover shows a person caught in the gesture, never posing.
- "object": the subject IS a thing — a dish, a tool, a plant, a piece of gear, a garment. The cover shows the object alone, photographed, no people.
- "place": the subject is a place or a world — a city, a house, a landscape, a room, an in-game world. The cover shows the space, usually with a small figure in it.
- "concept": ONLY if no person, object or place honestly fits — a mindset, a theory, money as an idea. Even then the cover shows one real photographed object as metaphor (an hourglass, a closed door), never an abstract shape.
- "institutional": a report, a survey, an analysis, a professional point of view. Typography dominates. This is the one register that stays legitimately typographic.
- "activity-book": coloring or exercise books. Crisp line art, high contrast.

Examples:
- "Finding a student job in Germany" → "action": a student seen from behind at a Berlin café counter, CV in hand.
- "Deep work every morning" → "action": a desk by a window at dawn, a closed door, a person from behind already writing — not "concept".
- "Buying your first apartment in Lisbon" → "place": the tiled street, the light, a figure with keys seen from behind.
- "Weeknight stir-fries" → "object": the wok and the dish, photographed.
- "Thinking in bets" → "concept": no person, object or place fits; the metaphor is a single real die on a table.
- "Freelance rates survey 2026" → "institutional": an analysis, so typography.

Return ONLY JSON:
{"register":"...","subject":"...","activity":"...","metaphor":"...","why_abstract":"...","motifs":["...","...","...","...","..."],"palette_core":"...","palettes":["...","...","..."],"mood":"...","coverSubtitle":"..."}
- subject: never a scene that needs a screen, camera or mirror to show the person (filming oneself, a video call, a selfie): the image model draws those wrong. Show the person doing the physical part of the activity instead, with any screen dark. One sentence saying what the cover shows in this register's terms — the action for "action", the object for "object", the space for "place", the single metaphor for "concept", the typographic idea for "institutional", the line-art subject for "activity-book".
- activity: ONLY for "action" — the precise thing the person is doing (omit the field otherwise).
- metaphor: ONLY for "concept" — one single REAL object that can be photographed and genuinely stands for the idea (an hourglass, a closed door, a shut notebook, a key). Be strict: if nothing stands for the idea without explanation, return null. Never a chevron, a line, an arrow, a swoosh or an abstract shape.
- why_abstract: ONLY for "concept" and "institutional" — one sentence explaining why no person, object or place could carry this subject. Omit the field for the concrete registers.
- motifs: 5 concrete, drawable specifics of THIS subject (objects, places, clothing, tools, creatures, textures). Specific beats generic. Never money bags, coins, dollar signs, light bulbs, rockets, handshakes, trophies or arrows.
- palette_core: the ONE palette the subject lives in, as "colour, colour, colour" — the colours a reader recognises the subject by before reading a word.
- palettes: three VARIATIONS of palette_core, in this order: [0] the saturated version, [1] the dark and deep version, [2] the light version. Each as "colour, colour, colour", each unmistakably the same world as palette_core. Never three different worlds.
- mood: three adjectives.
- coverSubtitle: the subtitle rewritten for a cover, six words at most, saying what the title does not (the promise, the who, the how); it must not repeat words from the title. Null if there is none.
COLOUR: colour is what makes a reader recognise the subject before the picture even registers. A book about social media lives in the warm, saturated colours of screens — coral, magenta, orange. A cookbook lives in the warm tones of food. A report lives in sober tones. NEVER leave the subject's colour world to get variety: vary the intensity, the depth and the lightness INSIDE that world. A night-blue or a cream cover for a social media book looks like a different book.
BRANDS: never borrow the logo, the name, the wordmark or the graphic identity of a brand or a platform. Take the colour register of the DOMAIN (screens, food, paper), never the brand guidelines of a company. Do not mention brand logos or trademarked characters; describe the world in your own words.`,
      },
      {
        role: "user",
        content: `Title: ${input.title}
Subtitle: ${input.subtitle ?? "(none)"}
Idea: ${input.idea}
Chapters: ${input.chapterTitles.slice(0, 12).join(" | ") || "(none yet)"}`,
      },
    ],
  });
  logUsage("cover-brief", GENERATION_MODEL, completion.usage);

  const raw = completion.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Fall through to the defaults below.
  }

  const register = isRegister(parsed.register) ? parsed.register : "concept";
  const motifs = Array.isArray(parsed.motifs)
    ? parsed.motifs.filter((m): m is string => typeof m === "string").slice(0, 5)
    : [];
  const palettesRaw = Array.isArray(parsed.palettes)
    ? parsed.palettes.filter((p): p is string => typeof p === "string")
    : [];
  const paletteCore =
    typeof parsed.palette_core === "string" && parsed.palette_core.trim()
      ? parsed.palette_core.trim()
      : (palettesRaw[0] ?? "the colours the subject is recognised by");
  const palettes: [string, string, string] = [
    palettesRaw[0] ?? `${paletteCore}, saturated`,
    palettesRaw[1] ?? `${paletteCore}, dark and deep`,
    palettesRaw[2] ?? `${paletteCore}, light`,
  ];
  const brief: CoverBrief = {
    register,
    subject: typeof parsed.subject === "string" ? parsed.subject : input.idea,
    ...(register === "action" && typeof parsed.activity === "string"
      ? { activity: parsed.activity }
      : {}),
    ...(register === "concept"
      ? { metaphor: typeof parsed.metaphor === "string" && parsed.metaphor.trim() ? parsed.metaphor.trim() : null }
      : {}),
    ...((register === "concept" || register === "institutional") && typeof parsed.why_abstract === "string"
      ? { whyAbstract: parsed.why_abstract.trim() }
      : {}),
    motifs: motifs.length > 0 ? motifs : [input.idea],
    paletteCore,
    palettes,
    mood: typeof parsed.mood === "string" ? parsed.mood : "confident, specific, considered",
    coverSubtitle: sixWords(
      typeof parsed.coverSubtitle === "string" ? parsed.coverSubtitle : input.subtitle,
    ),
  };
  if (DEBUG_COVER_PROMPTS) {
    console.log("[cover] brief\n" + JSON.stringify(brief, null, 2));
  }
  return brief;
}

/** What the routes fall back to when the brief call itself fails. */
export function fallbackCoverBrief(input: { idea: string; subtitle: string | null }): CoverBrief {
  return {
    register: "concept",
    subject: input.idea,
    metaphor: null,
    motifs: [input.idea],
    paletteCore: "the colours the subject is recognised by",
    palettes: [
      "the subject's colours, saturated",
      "the subject's colours, dark and deep",
      "the subject's colours, light",
    ],
    mood: "specific, considered",
    coverSubtitle: sixWords(input.subtitle),
  };
}

/**
 * The one direction drawn automatically while the book is being written:
 * the register's primary photographic direction. A concept with nothing to
 * photograph goes straight to its type-only direction.
 */
export function welcomeDirectionIndex(brief: CoverBrief): 0 | 1 | 2 {
  if (brief.register === "concept" && !brief.metaphor) return 1;
  return 0;
}

/** The three directions of the brief's register. */
export function coverDirections(brief: CoverBrief): [Direction, Direction, Direction] {
  return REGISTER_RULES[brief.register].directions;
}

/* Photograph or drawing, said bluntly. In the concrete registers two
   directions are photographs and the third is the one drawing; a concept
   cover without a metaphor is type alone, so neither word applies. */
const CONCRETE: readonly CoverRegister[] = ["action", "object", "place"];
function treatmentLine(brief: CoverBrief, direction: Direction): string {
  const rules = REGISTER_RULES[brief.register];
  if (!rules.photoreal) {
    return "No photorealism for this register: flat colour, graphic or typographic treatment only.";
  }
  if (brief.register === "concept" && !brief.metaphor) return "";
  if (direction.photo) return PHOTOGRAPH_NOT_DRAWN;
  if (CONCRETE.includes(brief.register)) {
    return "This is the ONE drawn direction of its register: an illustration, deliberately, in the same colour world as the photographs.";
  }
  return "";
}

/* The three palette variations, in the order the brief returns them. */
const PALETTE_VARIATION = ["saturated", "dark and deep", "light"] as const;

/** Quotes are what the model must copy letter for letter. */
function exact(text: string) {
  return `"${text.replace(/"/g, "'")}"`;
}

/**
 * The whole cover comes out of the model — title, subtitle and author name
 * drawn into the picture. Only the retained register's rules are injected;
 * a report never receives an action scene, a cookbook never a metaphor.
 */
export function coverPrompt(input: {
  title: string;
  /** Empty when nobody has given a name yet: the cover then carries none. */
  author: string;
  idea: string;
  format: EbookFormat;
  brief: CoverBrief;
  /** 0, 1 or 2: which of the register's three directions, and which palette. */
  directionIndex: 0 | 1 | 2;
}): string {
  const rules = REGISTER_RULES[input.brief.register];
  const direction = rules.directions[input.directionIndex];
  const palette = input.brief.palettes[input.directionIndex];

  const titleWords = input.title.trim().split(/\s+/).filter(Boolean);
  const longTitle = titleWords.length > 5;
  const textBlock = [
    `The title, large and dominant, spelled exactly: ${exact(input.title)}.`,
    longTitle
      ? `This title is long (${titleWords.length} words): do NOT set it in one size across many lines. Build a hierarchy — the two or three strongest words very large, the connecting words much smaller — so it reads as one shape, never as six equal lines.`
      : "",
    input.brief.coverSubtitle
      ? `The subtitle, smaller, directly under the title, spelled exactly: ${exact(input.brief.coverSubtitle)}.`
      : "",
    input.author.trim()
      ? `The author's name, small, near the bottom, spelled exactly: ${exact(input.author.trim())}.`
      : "No author name on this cover: title and subtitle only.",
  ]
    .filter(Boolean)
    .join(" ");

  const registerBlock = [
    `REGISTER: ${input.brief.register}. ${rules.shows}`,
    `What this cover shows: ${input.brief.subject}`,
    input.brief.activity ? `The action, precisely: ${input.brief.activity}.` : "",
    input.brief.register === "concept"
      ? input.brief.metaphor
        ? `The metaphor, a real object to photograph: ${input.brief.metaphor}.`
        : "No metaphor is given: every direction is purely typographic — no image, no mark, no ornament."
      : "",
    `Specifics of the subject to draw from: ${input.brief.motifs.join("; ")}.`,
    `COLOUR WORLD of the subject: ${input.brief.paletteCore}. This cover uses the ${PALETTE_VARIATION[input.directionIndex]} variation of it: ${palette}. Stay inside this colour world; it is what makes the subject recognisable. Mood: ${input.brief.mood}.`,
    "No brand logo, wordmark or platform identity anywhere: the colour register of the domain, never a company's branding.",
    treatmentLine(input.brief, direction),
  ]
    .filter(Boolean)
    .join(" ");

  return [
    LEGIBILITY_FIRST,
    COHERENCE,
    `Front cover artwork for a ${input.format.name.toLowerCase()}. Book idea: ${input.idea}.`,
    FLAT_ARTWORK,
    registerBlock,
    direction.brief,
    TASTE,
    textBlock,
    "Typography: a clean professional typeface, straight baselines, correct spelling with every letter legible, clear hierarchy between title, subtitle and author.",
    UNIVERSAL,
  ].join(" ");
}

/* Dev-only knobs for cheap prompt iteration. COVER_DEV_QUALITY=low|medium
   lowers the image quality; COVER_DEV_SINGLE_VARIANT=1 makes a run draw
   only its first direction. Both are ignored in production. */
const DEV = process.env.NODE_ENV !== "production";
export const DEV_SINGLE_VARIANT = DEV && process.env.COVER_DEV_SINGLE_VARIANT === "1";
function imageQuality(override?: string): "low" | "medium" | "high" {
  const wanted = DEV ? (override ?? process.env.COVER_DEV_QUALITY) : undefined;
  return wanted === "low" || wanted === "medium" ? wanted : "high";
}

/** Long side 2592: the KDP recommendation is 2560, and the 2:3 ratio of the whole product. */
export const COVER_SIZE = "1728x2592";
/** A coloring book is printed 8.5 × 11; its cover keeps that shape. */
export const COLORING_COVER_SIZE = "2432x3152";
export const COVER_MIME = "image/jpeg";

export function coverSizeFor(formatSlug: string): string {
  return formatSlug === "coloring-book" ? COLORING_COVER_SIZE : COVER_SIZE;
}

/** One complete cover as JPEG bytes. */
export async function generateCover(
  prompt: string,
  variantId = "?",
  qualityOverride?: string,
  size: string = COVER_SIZE,
): Promise<Buffer> {
  if (DEBUG_COVER_PROMPTS) {
    console.log(`[cover] prompt — variant ${variantId}\n${prompt}\n`);
  }
  const openai = getOpenAI();
  const result = await openai.images.generate({
    model: IMAGE_MODEL,
    prompt,
    n: 1,
    /* 2:3, 2592 px on the long side: KDP's "ideal" cover resolution is
       1600 × 2560, and JPEG is the format it takes. Multiples of 16, as the
       model requires. */
    size,
    quality: imageQuality(qualityOverride),
    output_format: "jpeg",
    output_compression: 90,
  });
  logUsage(`cover-image(${size},${imageQuality(qualityOverride)})`, IMAGE_MODEL, (result as { usage?: Parameters<typeof logUsage>[2] }).usage);
  const b64 = result.data?.[0]?.b64_json;
  if (!b64) throw new Error("The image model returned no picture");
  return Buffer.from(b64, "base64");
}
