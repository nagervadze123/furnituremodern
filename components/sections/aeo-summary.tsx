// Server component that renders the visible AEO summary panel on home
// and category pages. Plain semantic HTML — no client interactivity —
// so the same markup reaches users, assistive tech, and AI crawlers.
// We deliberately style this subdued (small text, muted, framed) so
// it reads as a "quick facts" box, not a primary content section.

import type { AeoSummary } from "@/lib/aeo/summary";

type Props = {
  summary: AeoSummary;
  /** Stable id used as the section's aria-labelledby target. */
  id?: string;
};

export function AeoSummaryPanel({ summary, id = "aeo-summary" }: Props) {
  const headingId = `${id}-heading`;
  return (
    <section
      aria-labelledby={headingId}
      className="mx-auto my-8 max-w-3xl rounded-lg border border-border bg-muted/30 px-4 py-5 text-sm text-muted-foreground md:px-6"
    >
      <h2
        id={headingId}
        className="font-display text-base font-semibold text-foreground"
      >
        {summary.heading}
      </h2>
      <p className="mt-2 leading-relaxed">{summary.paragraph}</p>
      <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
        {summary.facts.map((f) => (
          <div key={f.label} className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-foreground">{f.label}:</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
