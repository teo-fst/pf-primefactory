// Carica testi del sito e documenti legali da content/ nel database Supabase.
// Idempotente: i testi esistenti NON vengono sovrascritti (le modifiche fatte dal pannello restano),
// i documenti legali vengono inseriti solo se la versione non esiste già.
// Uso (nel container): docker compose run --rm --no-deps app node scripts/seed-content.mjs
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY");
  process.exit(1);
}

const LEGAL_VERSION = 1;

async function insert(table, rows, onConflict) {
  const res = await fetch(`${url}/rest/v1/${table}?on_conflict=${onConflict}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  const inserted = await res.json();
  console.log(`${table}: ${inserted.length} nuove righe su ${rows.length}`);
}

const texts = JSON.parse(readFileSync("content/site-texts.json", "utf8"));
const textRows = Object.entries(texts).flatMap(([k, v]) =>
  ["it", "en"].map((locale) => ({ key: k, locale, value: v[locale] })),
);
await insert("site_texts", textRows, "key,locale");

const legalRows = readdirSync("content/legal")
  .filter((f) => f.endsWith(".md"))
  .map((f) => {
    const [kind, locale] = f.replace(/\.md$/, "").split(".");
    return {
      kind,
      locale,
      version: LEGAL_VERSION,
      body_md: readFileSync(join("content/legal", f), "utf8"),
      published_at: new Date().toISOString(),
    };
  });
await insert("legal_documents", legalRows, "kind,locale,version");
