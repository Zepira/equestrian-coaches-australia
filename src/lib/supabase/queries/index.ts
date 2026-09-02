// Re-exports the domain-split query modules below so every existing
// `import { ... } from "@/lib/supabase/queries"` call site keeps resolving
// unchanged. Split from one 250-line file (was terms/location/search/
// coach-profile all jammed together) into one module per domain —
// see each file for what it owns.
export * from "./terms";
export * from "./location";
export * from "./search";
export * from "./coach-profile";
