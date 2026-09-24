import { readFileSync, writeFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(".env", "utf8").split(/\r?\n/).filter((l) => l && !l.startsWith("#") && l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const H = { Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, apikey: env.SUPABASE_SERVICE_ROLE_KEY, "Content-Type": "application/json" };
const stamp = Date.now();
const mk = async (email, meta) => {
  const r = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users`, { method: "POST", headers: H, body: JSON.stringify({ email, password: `Tt-${stamp}-pw!`, email_confirm: true, user_metadata: meta }) });
  const j = await r.json(); if (!r.ok) throw new Error(JSON.stringify(j)); return j.id;
};
const ids = {
  farrier: await mk(`smoke-farrier-${stamp}@example.com`, { role: "provider", name: "Smoke Farrier", profession: "farriers" }),
  coach: await mk(`smoke-coach-${stamp}@example.com`, { role: "coach", name: "Smoke Coach" }),
  rider: await mk(`smoke-rider-${stamp}@example.com`, { role: "rider", name: "Smoke Rider" }),
};
writeFileSync(process.env.TEMP + "/smoke-ids.json", JSON.stringify({ stamp, ids, password: `Tt-${stamp}-pw!` }));
console.log(JSON.stringify(ids));
