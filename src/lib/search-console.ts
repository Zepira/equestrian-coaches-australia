import { JWT } from "google-auth-library";

// Google Search Console via a service account (spec: "GSC via a service
// account (webmasters.readonly), which must be added as a user on the
// property or it 403s"). Same degrade-gracefully pattern as
// Stripe/Resend/Supabase — this can't actually be exercised until the
// domain property is verified and the service account granted access
// (CLAUDE.md, "Verify the Search Console domain property on launch day"),
// so it's wired for real but genuinely inert until then, not a stub that
// needs rewriting later.
export const isGscConfigured = Boolean(
  process.env.GOOGLE_SERVICE_ACCOUNT_KEY && process.env.GSC_SITE_URL
);

const SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"];

function getClient(): JWT | null {
  if (!isGscConfigured) return null;
  const key = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY!) as {
    client_email: string;
    private_key: string;
  };
  return new JWT({ email: key.client_email, key: key.private_key, scopes: SCOPES });
}

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

// Raw wrapper around searchAnalytics.query. Limits from the spec: 2-3 day
// data lag, 16-month retention, 25k rows/request, max 4 dimensions,
// 1,200 queries/100s — callers stay well under all of those for a site
// this size, so no pagination/backoff is built in yet.
async function queryAnalytics(params: {
  startDate: string;
  endDate: string;
  dimensions: string[];
  rowLimit?: number;
  dimensionFilterGroups?: unknown[];
}): Promise<GscRow[]> {
  const client = getClient();
  if (!client) return [];

  const siteUrl = process.env.GSC_SITE_URL!;
  const res = await client.request<{ rows?: GscRow[] }>({
    url: `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    method: "POST",
    data: { rowLimit: 1000, ...params },
  });
  return res.data.rows ?? [];
}

// Per-query performance (spec: unmapped queries, near misses). "query" is
// GSC's actual search-term dimension — this is the only place raw
// Google search terms enter the app, and only ever into an internal
// digest email, never rendered on-site.
export function queryPerformance(startDate: string, endDate: string) {
  return queryAnalytics({ startDate, endDate, dimensions: ["query"] });
}

// Per-page performance (spec: "performance by URL pattern"). Grouping into
// route patterns happens in seo-digest.ts, not here — this just returns
// the raw per-URL rows GSC gives back.
export function pagePerformance(startDate: string, endDate: string) {
  return queryAnalytics({ startDate, endDate, dimensions: ["page"] });
}
