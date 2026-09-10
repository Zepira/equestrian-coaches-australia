import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Reads for the coach dashboard (canvas: Dashboards › coach dashboard) —
 * the four monthly numbers with deltas, the twelve-month view trend, and
 * profile completeness. Runs as the coach (RLS: own rows only).
 */
export type MonthStats = {
  month: string; // "August 2026"
  impressions: number;
  views: number;
  reveals: number;
  enquiries: number;
  delta: { impressions: number; views: number; reveals: number; enquiries: number };
};

const startOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
const addMonths = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));

async function countBetween(
  supabase: SupabaseClient,
  table: "coach_events" | "enquiries",
  coachId: string,
  from: Date,
  to: Date,
  kind?: string
) {
  let q = supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .gte("created_at", from.toISOString())
    .lt("created_at", to.toISOString());
  if (kind) q = q.eq("kind", kind);
  const { count } = await q;
  return count ?? 0;
}

export async function monthStats(supabase: SupabaseClient, coachId: string, now = new Date()): Promise<MonthStats> {
  const thisStart = startOfMonth(now);
  const nextStart = addMonths(thisStart, 1);
  const prevStart = addMonths(thisStart, -1);
  const [impressions, views, reveals, enquiries, pImp, pViews, pRev, pEnq] = await Promise.all([
    countBetween(supabase, "coach_events", coachId, thisStart, nextStart, "impression"),
    countBetween(supabase, "coach_events", coachId, thisStart, nextStart, "view"),
    countBetween(supabase, "coach_events", coachId, thisStart, nextStart, "reveal"),
    countBetween(supabase, "enquiries", coachId, thisStart, nextStart),
    countBetween(supabase, "coach_events", coachId, prevStart, thisStart, "impression"),
    countBetween(supabase, "coach_events", coachId, prevStart, thisStart, "view"),
    countBetween(supabase, "coach_events", coachId, prevStart, thisStart, "reveal"),
    countBetween(supabase, "enquiries", coachId, prevStart, thisStart),
  ]);
  return {
    month: thisStart.toLocaleString("en-AU", { month: "long", year: "numeric", timeZone: "UTC" }),
    impressions,
    views,
    reveals,
    enquiries,
    delta: {
      impressions: impressions - pImp,
      views: views - pViews,
      reveals: reveals - pRev,
      enquiries: enquiries - pEnq,
    },
  };
}

/** Twelve monthly view counts, oldest first, ending with the current month. */
export async function twelveMonthViews(supabase: SupabaseClient, coachId: string, now = new Date()) {
  const thisStart = startOfMonth(now);
  const from = addMonths(thisStart, -11);
  const { data } = await supabase
    .from("coach_events")
    .select("created_at")
    .eq("coach_id", coachId)
    .eq("kind", "view")
    .gte("created_at", from.toISOString());
  const buckets = Array.from({ length: 12 }, (_, i) => {
    const d = addMonths(from, i);
    return { month: d.toLocaleString("en-AU", { month: "short", timeZone: "UTC" }).charAt(0), key: d.toISOString().slice(0, 7), views: 0 };
  });
  for (const row of data ?? []) {
    const key = String(row.created_at).slice(0, 7);
    const b = buckets.find((x) => x.key === key);
    if (b) b.views++;
  }
  return buckets;
}

export type CompletenessItem = { label: string; done: boolean; href?: string };

export function profileCompleteness(input: {
  hasPhoto: boolean;
  bio: string;
  disciplineCount: number;
  hasLocation: boolean;
  testimonialCount: number;
  hasVideo: boolean;
}): { pct: number; items: CompletenessItem[] } {
  const items: CompletenessItem[] = [
    { label: "Photo uploaded", done: input.hasPhoto, href: "/dashboard/profile#photo" },
    { label: "Bio written", done: input.bio.trim().length >= 80, href: "/dashboard/profile#bio" },
    { label: "Disciplines tagged", done: input.disciplineCount > 0, href: "/dashboard/profile#disciplines" },
    { label: "Location set", done: input.hasLocation, href: "/dashboard/profile#location" },
    { label: "Three testimonials", done: input.testimonialCount >= 3, href: "/dashboard/profile#testimonials" },
    { label: "Intro video", done: input.hasVideo, href: "/dashboard/profile#video" },
  ];
  const done = items.filter((i) => i.done).length;
  return { pct: Math.round((done / items.length) * 100), items };
}
