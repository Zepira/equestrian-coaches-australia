/**
 * Australian states and territories, and how riders type them. Shared by
 * the location resolver (server), the suggestion API, the search bar's
 * copy and the header summary (client) — so it holds no server imports.
 */
export type AuState = { code: string; name: string; aliases: string[] };

export const AU_STATES: AuState[] = [
  { code: "VIC", name: "Victoria", aliases: ["vic", "victoria"] },
  { code: "NSW", name: "New South Wales", aliases: ["nsw", "new south wales"] },
  { code: "QLD", name: "Queensland", aliases: ["qld", "queensland"] },
  { code: "SA", name: "South Australia", aliases: ["sa", "south australia"] },
  { code: "WA", name: "Western Australia", aliases: ["wa", "western australia"] },
  { code: "TAS", name: "Tasmania", aliases: ["tas", "tasmania", "tassie"] },
  { code: "ACT", name: "Australian Capital Territory", aliases: ["act", "australian capital territory", "canberra region"] },
  { code: "NT", name: "Northern Territory", aliases: ["nt", "northern territory"] },
];

export const STATE_CODES = AU_STATES.map((s) => s.code);

const norm = (s: string) => s.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");

/**
 * The state a whole query names, or null. "VIC", "vic.", "Victoria" and
 * "victoria state-wide" all resolve; "Bendigo VIC" does not — that's a town
 * with a state qualifier, which resolveLocation() handles.
 */
export function parseState(text: string): AuState | null {
  const q = norm(text).replace(/\b(state ?wide|statewide|all of|across|whole of)\b/g, "").trim();
  if (!q) return null;
  return AU_STATES.find((s) => s.aliases.includes(q)) ?? null;
}

/** States whose name or code starts with the typed prefix — for suggestions. */
export function statesMatching(prefix: string): AuState[] {
  const q = norm(prefix);
  if (q.length < 2) return [];
  return AU_STATES.filter((s) => s.aliases.some((a) => a.startsWith(q)));
}

export function stateName(code: string) {
  return AU_STATES.find((s) => s.code === code)?.name ?? code;
}
