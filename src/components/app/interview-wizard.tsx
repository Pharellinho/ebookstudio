"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { formats } from "@/lib/content";

type Goal =
  | "lead-magnet"
  | "how-to-guide"
  | "course-companion"
  | "fiction-novel"
  | "activity-pack"
  | "other";

type Answers = {
  goal: Goal | null;
  audience: string;
  topic: string;
  promise: string;
  tone: string;
  extras: string;
};

const goals: { id: Goal; label: string; hint: string; formatSlug: string }[] = [
  {
    id: "lead-magnet",
    label: "A free lead magnet",
    hint: "Short PDF to grow an email list",
    formatSlug: "lead-magnet",
  },
  {
    id: "how-to-guide",
    label: "A how-to guide",
    hint: "Step-by-step practical book",
    formatSlug: "how-to-guide",
  },
  {
    id: "course-companion",
    label: "A course companion",
    hint: "Workbook for a video course",
    formatSlug: "course-companion",
  },
  {
    id: "fiction-novel",
    label: "A story / novel",
    hint: "Fiction with chapters",
    formatSlug: "fiction-novel",
  },
  {
    id: "activity-pack",
    label: "An illustrated activity pack",
    hint: "Page scenes for printables / coloring later",
    formatSlug: "coloring-book",
  },
  {
    id: "other",
    label: "Something else",
    hint: "We’ll shape it from your answers",
    formatSlug: "lead-magnet",
  },
];

const tones = [
  "Friendly and simple",
  "Professional and sharp",
  "Warm and coaching",
  "Bold and direct",
  "Playful",
];

const steps = [
  "goal",
  "audience",
  "topic",
  "promise",
  "tone",
  "extras",
  "review",
] as const;

function buildBrief(answers: Answers): { idea: string; formatSlug: string } {
  const goal = goals.find((item) => item.id === answers.goal) ?? goals[0];
  const formatSlug = formats.some((format) => format.slug === goal.formatSlug)
    ? goal.formatSlug
    : "lead-magnet";

  const idea = [
    `Goal: ${goal.label}.`,
    answers.audience.trim() && `Audience: ${answers.audience.trim()}.`,
    answers.topic.trim() && `Topic: ${answers.topic.trim()}.`,
    answers.promise.trim() && `Reader outcome: ${answers.promise.trim()}.`,
    answers.tone.trim() && `Tone: ${answers.tone.trim()}.`,
    answers.extras.trim() && `Extra constraints: ${answers.extras.trim()}.`,
  ]
    .filter(Boolean)
    .join(" ");

  return { idea, formatSlug };
}

export function InterviewWizard({
  initialGoal = null,
  title = "Let’s shape your book",
  subtitle = "Answer a few questions — we’ll build the brief, then generate.",
}: {
  initialGoal?: Goal | null;
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(initialGoal ? 1 : 0);
  const [answers, setAnswers] = useState<Answers>({
    goal: initialGoal,
    audience: "",
    topic: "",
    promise: "",
    tone: tones[0],
    extras: "",
  });

  const step = steps[stepIndex];
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const canContinue = useMemo(() => {
    switch (step) {
      case "goal":
        return Boolean(answers.goal);
      case "audience":
        return answers.audience.trim().length >= 3;
      case "topic":
        return answers.topic.trim().length >= 4;
      case "promise":
        return answers.promise.trim().length >= 4;
      case "tone":
        return Boolean(answers.tone);
      case "extras":
      case "review":
        return true;
      default:
        return false;
    }
  }, [answers, step]);

  function next() {
    if (!canContinue) return;
    if (step === "review") {
      const brief = buildBrief(answers);
      router.push(
        `/create?idea=${encodeURIComponent(brief.idea)}&format=${encodeURIComponent(brief.formatSlug)}&start=1`,
      );
      return;
    }
    setStepIndex((value) => Math.min(value + 1, steps.length - 1));
  }

  function back() {
    setStepIndex((value) => Math.max(value - 1, 0));
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {title}
        </h1>
        <p className="mt-2 text-muted-foreground">{subtitle}</p>
      </div>

      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Step {stepIndex + 1} of {steps.length}
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border/80 bg-background p-6 shadow-[0_8px_30px_rgba(0,0,0,0.05)] sm:p-8">
        {step === "goal" ? (
          <Question
            title="What do you want to create?"
            subtitle="Pick the closest match — the next questions personalize it."
          >
            <div className="grid gap-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  type="button"
                  onClick={() =>
                    setAnswers((prev) => ({ ...prev, goal: goal.id }))
                  }
                  className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors ${
                    answers.goal === goal.id
                      ? "border-foreground bg-primary/15"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <p className="font-display text-sm font-bold">{goal.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {goal.hint}
                  </p>
                </button>
              ))}
            </div>
          </Question>
        ) : null}

        {step === "audience" ? (
          <Question
            title="Who is this for?"
            subtitle="Be specific — age, job, hobby, situation."
          >
            <textarea
              rows={3}
              value={answers.audience}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  audience: event.target.value,
                }))
              }
              placeholder="Teens who play FIFA / new freelance designers / tired parents…"
              className="w-full resize-none rounded-xl border border-border bg-[#f7f5f1] px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Question>
        ) : null}

        {step === "topic" ? (
          <Question
            title="What’s the topic or world?"
            subtitle="One clear subject. No preset chips — your words."
          >
            <textarea
              rows={3}
              value={answers.topic}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, topic: event.target.value }))
              }
              placeholder="FIFA 27 career mode / meal prep for nurses / launching on Gumroad…"
              className="w-full resize-none rounded-xl border border-border bg-[#f7f5f1] px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Question>
        ) : null}

        {step === "promise" ? (
          <Question
            title="What should they walk away with?"
            subtitle="The result, feeling, or skill after finishing."
          >
            <textarea
              rows={3}
              value={answers.promise}
              onChange={(event) =>
                setAnswers((prev) => ({
                  ...prev,
                  promise: event.target.value,
                }))
              }
              placeholder="Win more career-mode matches / a calm Sunday routine / a finished first offer…"
              className="w-full resize-none rounded-xl border border-border bg-[#f7f5f1] px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Question>
        ) : null}

        {step === "tone" ? (
          <Question
            title="How should it feel?"
            subtitle="We’ll keep this voice throughout."
          >
            <div className="flex flex-wrap gap-2">
              {tones.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => setAnswers((prev) => ({ ...prev, tone }))}
                  className={`cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold ${
                    answers.tone === tone
                      ? "bg-primary text-on-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tone}
                </button>
              ))}
            </div>
          </Question>
        ) : null}

        {step === "extras" ? (
          <Question
            title="Anything else to respect?"
            subtitle="Optional — must-includes, length, language, things to avoid."
          >
            <textarea
              rows={4}
              value={answers.extras}
              onChange={(event) =>
                setAnswers((prev) => ({ ...prev, extras: event.target.value }))
              }
              placeholder="Keep it PG, French examples only, end with a CTA to my Discord…"
              className="w-full resize-none rounded-xl border border-border bg-[#f7f5f1] px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </Question>
        ) : null}

        {step === "review" ? (
          <Question
            title="Ready to build?"
            subtitle="This brief is built from your answers — not from limited presets."
          >
            <div className="rounded-xl border border-border bg-[#f7f5f1] p-4 text-sm leading-relaxed">
              {buildBrief(answers).idea}
            </div>
          </Question>
        ) : null}

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={stepIndex === 0}
            className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted-foreground disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back
          </button>
          <button
            type="button"
            onClick={next}
            disabled={!canContinue}
            className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-extrabold text-on-primary shadow-[0_6px_18px_rgba(212,160,23,0.35)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {step === "review" ? "Build it" : "Continue"}
            <ArrowRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Question({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="font-display text-2xl font-extrabold tracking-tight sm:text-[1.7rem]">
        {title}
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </div>
  );
}
