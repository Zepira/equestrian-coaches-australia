import { getProfessions } from "@/lib/cms/read";
import { createServiceSupabase } from "@/lib/supabase/service";
import { SignupForm, type SignupInvite } from "./signup-form";

export const metadata = { title: "Sign up", robots: { index: false, follow: true } };

type Params = {
  role?: string;
  profession?: string;
  plan?: string;
  tier?: string;
  invite?: string;
  ref?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

/**
 * /signup (The Site as a CMS §06.1–2). Every way in lands here with the
 * profession already known: /join/[profession], /for-coaches, the plans
 * table, /for-professionals, and Kim's invites. The link also carries the
 * plan (`plan`; `tier` from older links is read too), where they came from
 * (`ref`, utm tags, which become acquisition_source) and an invite token.
 *
 * The invite is looked up here with the service role (invites are admin-only
 * under RLS) and only its name, email and profession reach the page. The
 * sign-up trigger checks the token again before using it.
 */
export default async function SignupPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const professions = (await getProfessions())
    .filter((p) => p.launchState !== "draft")
    .map((p) => ({ slug: p.slug, name: p.name, singular: p.singular }));
  const invite = sp.invite ? await readInvite(sp.invite) : null;

  const professional = sp.role === "coach" || sp.role === "provider" || Boolean(sp.profession) || Boolean(invite);
  const source = [
    ["ref", sp.ref],
    ["utm_source", sp.utm_source],
    ["utm_medium", sp.utm_medium],
    ["utm_campaign", sp.utm_campaign],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${String(v).slice(0, 80)}`)
    .join(";");

  return (
    <SignupForm
      professional={professional}
      professions={professions}
      defaultProfession={invite?.profession ?? (professions.some((p) => p.slug === sp.profession) ? sp.profession! : "coaches")}
      plan={sp.plan ?? sp.tier ?? ""}
      source={source}
      invite={invite}
    />
  );
}

async function readInvite(token: string): Promise<SignupInvite | null> {
  const service = createServiceSupabase();
  if (!service || !/^[a-f0-9]{16,80}$/.test(token)) return null;
  const { data } = await service
    .from("invites")
    .select("token, name, email, used_at, expires_at, terms(slug)")
    .eq("token", token)
    .maybeSingle();
  if (!data) return null;
  const expired = data.used_at || new Date(data.expires_at) < new Date();
  return {
    token: data.token,
    name: data.name,
    email: data.email,
    profession: (data as unknown as { terms: { slug: string } | null }).terms?.slug ?? null,
    usable: !expired,
  };
}
