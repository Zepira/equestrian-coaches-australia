import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceSupabase } from "@/lib/supabase/service";

/**
 * The signed-in person's share ref ("r-" and the start of their contact
 * token), for the share buttons (M6). Nothing for anyone signed out.
 */
export async function GET() {
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const service = createServiceSupabase();
  if (!user || !service) return NextResponse.json({});
  const { data } = await service.from("contacts").select("token").eq("profile_id", user.id).maybeSingle();
  return NextResponse.json(data?.token ? { ref: `r-${String(data.token).slice(0, 10)}` } : {});
}
