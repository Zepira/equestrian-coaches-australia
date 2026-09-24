import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * The check every admin action starts with. The admin layout already sends
 * non-admins away, but an action can be called directly, so each one asks
 * again. Returns the signed-in client (RLS applies, and the history
 * triggers see who it was) and the admin's user id.
 */
export async function requireAdmin(): Promise<{ supabase: SupabaseClient; userId: string }> {
  const supabase = await createClient();
  if (!supabase) throw new Error("Supabase isn't connected yet.");
  const [{ data: isAdmin }, { data: auth }] = await Promise.all([supabase.rpc("is_admin"), supabase.auth.getUser()]);
  if (!isAdmin || !auth.user) throw new Error("Not an admin.");
  return { supabase, userId: auth.user.id };
}

/** Form text: trimmed, CRLF to LF (browsers send textareas as CRLF), capped. */
export function formText(fd: FormData, key: string, max = 20_000): string {
  return String(fd.get(key) ?? "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .slice(0, max);
}

export type HistoryRow = { when: string; who: string | null; what: string; detail?: string };

/** First names for the people in a history list, one query. */
export async function whoNames(supabase: SupabaseClient, ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => Boolean(x)))];
  if (!unique.length) return new Map();
  const { data } = await supabase.from("profiles").select("id, name, email").in("id", unique);
  return new Map((data ?? []).map((p) => [p.id as string, String(p.name || p.email || "someone")]));
}

/** Rows from change_log, readable. */
export async function changeLog(supabase: SupabaseClient, filter: { table: string | string[]; rowIds?: string[] }, limit = 20): Promise<HistoryRow[]> {
  let q = supabase
    .from("change_log")
    .select("table_name, row_id, label, op, old_row, new_row, changed_by, changed_at")
    .in("table_name", Array.isArray(filter.table) ? filter.table : [filter.table])
    .order("changed_at", { ascending: false })
    .limit(limit);
  if (filter.rowIds) q = q.in("row_id", filter.rowIds.length ? filter.rowIds : ["-"]);
  const { data } = await q;
  const names = await whoNames(supabase, (data ?? []).map((r) => r.changed_by as string | null));
  return (data ?? []).map((r) => {
    const fields = r.op === "update" ? changedFields(r.old_row, r.new_row) : [];
    const noun = TABLE_NOUN[r.table_name as string] ?? r.table_name;
    const what =
      r.op === "insert" ? `Added ${noun} ${r.label}` : r.op === "delete" ? `Removed ${noun} ${r.label}` : `Changed ${noun} ${r.label}`;
    return {
      when: r.changed_at as string,
      who: names.get(r.changed_by as string) ?? null,
      what: what.trim(),
      detail: fields.length ? fields.map(labelField).join(", ") : undefined,
    };
  });
}

const TABLE_NOUN: Record<string, string> = {
  terms: "",
  profession_details: "",
  term_aliases: "alias",
  area_intros: "area intro",
};

function changedFields(a: unknown, b: unknown): string[] {
  const x = (a ?? {}) as Record<string, unknown>;
  const y = (b ?? {}) as Record<string, unknown>;
  return Object.keys({ ...x, ...y }).filter((k) => JSON.stringify(x[k]) !== JSON.stringify(y[k]));
}

const labelField = (k: string) => k.replace(/_/g, " ");
