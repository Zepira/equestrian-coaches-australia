import { createClient as createServiceClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/client";

// Every rider search, logged for the weekly SEO digest (phase 9 taxonomy
// spec) — supply gaps vs vocabulary gaps, unmapped queries, etc. Uses the
// service-role client deliberately: search_events has no anon insert
// policy (an open insert policy there is a spam endpoint), so this can
// only ever be written server-side, never from the browser.
export async function logSearchEvent(event: {
  termIds: string[];
  locationText?: string | null;
  lat?: number | null;
  lng?: number | null;
  radiusKm?: number | null;
  resultCount: number;
}) {
  if (!isSupabaseConfigured) return; // no live project — nothing to log to

  try {
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    await supabase.from("search_events").insert({
      term_ids: event.termIds,
      location_text: event.locationText ?? null,
      lat: event.lat ?? null,
      lng: event.lng ?? null,
      radius_km: event.radiusKm ?? null,
      result_count: event.resultCount,
    });
  } catch (err) {
    // Logging failure should never break a rider's search.
    console.error("logSearchEvent failed:", err);
  }
}
