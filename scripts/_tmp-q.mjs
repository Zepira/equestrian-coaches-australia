import { readFileSync } from "node:fs"; import pg from "pg";
const env = Object.fromEntries(readFileSync(".env","utf8").split(/\r?\n/).filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>[l.slice(0,l.indexOf("=")).trim(),l.slice(l.indexOf("=")+1).trim()]));
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];
const db = new pg.Client({ connectionString:`postgresql://postgres.${ref}:${encodeURIComponent(env.DATABASE_PASSWORD)}@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres`, ssl:{rejectUnauthorized:false}}); await db.connect();
const r = (await db.query(process.argv[2])).rows; console.log(process.argv[3]==="t" ? r.map(x=>Object.values(x).join(" | ")).join("\n") : JSON.stringify(r)); await db.end();
