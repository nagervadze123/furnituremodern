// Compact admin tile that renders Real User Performance p75s over the
// last 7 days. Reads from the public.web_vitals_p75_7d view (defined
// in supabase/schema.sql + the 2026-05-02-web-vitals-extend migration).
//
// Server component — no client interactivity needed. Falls back to an
// empty-state ("Real user data appears after deployment receives live
// traffic") whenever the view is unreachable, returns no rows, or
// Supabase isn't configured at all. Public pages must keep working
// even when this tile breaks; the catch in fetchRumP75 enforces that.

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type Metric = "LCP" | "INP" | "CLS";
type Rating = "good" | "needs-improvement" | "poor";

type P75Row = {
  metric: string;
  p75: number;
  samples: number;
  last_occurred_at: string;
};

type RumSnapshot = {
  rows: Map<Metric, P75Row>;
  totalSamples: number;
  lastOccurredAt: string | null;
};

const VISIBLE_METRICS: ReadonlyArray<Metric> = ["LCP", "INP", "CLS"];

// Core Web Vitals thresholds. Values are inclusive on the "good" /
// "poor" boundary the way Google publishes them:
//   https://web.dev/articles/vitals
const THRESHOLDS: Record<Metric, { good: number; poor: number }> = {
  LCP: { good: 2500, poor: 4000 }, // milliseconds
  INP: { good: 200, poor: 500 },   // milliseconds
  CLS: { good: 0.1, poor: 0.25 },  // unitless
};

function ratingFor(metric: Metric, value: number): Rating {
  const t = THRESHOLDS[metric];
  if (value <= t.good) return "good";
  if (value > t.poor) return "poor";
  return "needs-improvement";
}

// Display: LCP in seconds (1 decimal), INP in integer ms, CLS in
// 2-decimal-place float. Matches what the CrUX/PSI surfaces show.
function formatValue(metric: Metric, value: number): string {
  if (metric === "LCP") return `${(value / 1000).toFixed(1)}s`;
  if (metric === "INP") return `${Math.round(value)}ms`;
  return value.toFixed(2);
}

async function fetchRumP75(): Promise<RumSnapshot | null> {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("web_vitals_p75_7d")
      .select("metric, p75, samples, last_occurred_at");
    if (error || !data) return null;

    const rows = new Map<Metric, P75Row>();
    let totalSamples = 0;
    let lastOccurredAt: string | null = null;
    for (const r of data) {
      if (
        r.metric === "LCP" ||
        r.metric === "INP" ||
        r.metric === "CLS"
      ) {
        rows.set(r.metric, {
          metric: r.metric,
          p75: Number(r.p75),
          samples: Number(r.samples),
          last_occurred_at: r.last_occurred_at,
        });
      }
      totalSamples += Number(r.samples);
      if (!lastOccurredAt || r.last_occurred_at > lastOccurredAt) {
        lastOccurredAt = r.last_occurred_at;
      }
    }
    return { rows, totalSamples, lastOccurredAt };
  } catch {
    return null;
  }
}

export async function RumTile() {
  const snapshot = await fetchRumP75();
  const isEmpty =
    snapshot === null || snapshot.rows.size === 0 || snapshot.totalSamples === 0;

  return (
    <section className="rounded-xl border border-border bg-background p-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            Real User Performance (7d)
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            p75 across all visitors
          </p>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-4">
        {VISIBLE_METRICS.map((m) => {
          const row = snapshot?.rows.get(m);
          if (!row) return <MetricCell key={m} metric={m} />;
          return (
            <MetricCell
              key={m}
              metric={m}
              value={row.p75}
              rating={ratingFor(m, row.p75)}
            />
          );
        })}
      </div>

      <footer className="mt-4 text-xs text-muted-foreground">
        {isEmpty
          ? "Real user data appears after deployment receives live traffic."
          : `${snapshot.totalSamples.toLocaleString()} samples • last updated ${formatRelative(
              snapshot.lastOccurredAt
            )}`}
      </footer>
    </section>
  );
}

function MetricCell({
  metric,
  value,
  rating,
}: {
  metric: Metric;
  value?: number;
  rating?: Rating;
}) {
  const display = value === undefined ? "—" : formatValue(metric, value);
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {metric}
      </p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums tracking-tight">
          {display}
        </span>
        {rating ? <RatingBadge rating={rating} /> : null}
      </div>
    </div>
  );
}

function RatingBadge({ rating }: { rating: Rating }) {
  const label =
    rating === "good"
      ? "good"
      : rating === "needs-improvement"
        ? "fair"
        : "poor";
  // Tailwind classes can't be picked dynamically (the JIT can't see the
  // string), so each rating variant gets a literal className branch.
  const cls =
    rating === "good"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
      : rating === "needs-improvement"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-500"
        : "bg-red-500/15 text-red-700 dark:text-red-400";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
