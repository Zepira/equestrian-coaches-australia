import { unstable_cache } from "next/cache";
import { createPublicSupabase } from "@/lib/supabase/public";
import { CMS_TAG } from "@/lib/cms/read";
import { SubscribeCardForm, type SubscribeCardProps } from "@/components/subscribe-card-form";

/** The newest alert and round-up wordings, cached like the rest of the site's words. */
export const getAlertWordings = unstable_cache(
  async () => {
    const db = createPublicSupabase();
    if (!db) return { alerts: null, news: null };
    const pick = async (purpose: string) => {
      const { data } = await db.from("consent_wordings").select("id, body").eq("purpose", purpose).order("version", { ascending: false }).limit(1).maybeSingle();
      return data ? { id: data.id as string, body: data.body as string } : null;
    };
    return { alerts: await pick("rider_alerts"), news: await pick("rider_news") };
  },
  ["alert-wordings"],
  { tags: [CMS_TAG], revalidate: 300 }
);

/**
 * "Tell me when a new farrier starts near Kyneton" (The Marketing Engine
 * M3): one card for area pages, profession pages, events and empty results.
 * It knows where it is from its props and asks only for what's missing.
 */
export async function SubscribeCard(props: Omit<SubscribeCardProps, "wordings">) {
  return <SubscribeCardForm {...props} wordings={await getAlertWordings()} />;
}
