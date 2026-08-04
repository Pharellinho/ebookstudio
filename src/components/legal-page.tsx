import { site } from "@/lib/site";

type LegalSection = {
  number?: string;
  heading: string;
  body: string | string[];
};

type LegalPageProps = {
  title: string;
  intro?: string;
  sections: LegalSection[];
};

export function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <section className="py-16 lg:py-20">
      <div className="container-page mx-auto max-w-2xl">
        <h1 className="font-display text-4xl font-bold">{title}</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated{" "}
          {new Date().toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
          .
          {intro
            ? ` ${intro}`
            : " This document should be reviewed by a lawyer before public launch."}
        </p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => {
            const paragraphs = Array.isArray(section.body)
              ? section.body
              : [section.body];

            return (
              <div key={section.heading}>
                <h2 className="font-display text-xl font-semibold">
                  {section.number ? (
                    <span className="mr-2 text-muted-foreground">
                      {section.number}
                    </span>
                  ) : null}
                  {section.heading}
                </h2>
                <div className="mt-3 space-y-3">
                  {paragraphs.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 48)}
                      className="leading-relaxed text-muted-foreground"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}

          <div>
            <h2 className="font-display text-xl font-semibold">Contact</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Questions about this Privacy Policy or your personal information?
              Email{" "}
              <a
                href={`mailto:${site.contactEmail}`}
                className="font-semibold text-foreground underline-offset-4 hover:underline"
              >
                {site.contactEmail}
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
