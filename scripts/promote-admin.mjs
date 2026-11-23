// Promuove a "admin" un utente che ha già un account (Q37: il primo admin è il fondatore).
//
// Uso, nel container:
//   docker compose run --rm --no-deps app node scripts/promote-admin.mjs <email>          (simulazione)
//   docker compose run --rm --no-deps app node scripts/promote-admin.mjs <email> --yes    (applica)
//
// Prima l'utente deve esistere: si crea inviando il modulo lista d'interesse con quell'email
// (oppure da Supabase > Authentication > Users > Add user). Lo script NON crea utenti.
// Usa la chiave segreta (SUPABASE_SECRET_KEY, solo lato server/terminale, mai nel browser):
// salta la RLS, che altrimenti impedisce a chiunque di cambiare il proprio ruolo.
// Senza --yes mostra solo cosa farebbe. Cambia solo la colonna role della tabella profiles.

const clean = (v) => {
  if (v === undefined) return undefined;
  const s = v.trim().replace(/^(["'])(.*)\1$/, "$2").trim();
  return s === "" ? undefined : s;
};

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/$/, "");
const key = clean(process.env.SUPABASE_SECRET_KEY);
const args = process.argv.slice(2);
const apply = args.includes("--yes");
const email = args.find((a) => !a.startsWith("--"))?.trim().toLowerCase();

if (!url || !key) {
  console.error("Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY (vedi .env.local).");
  process.exit(1);
}
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: node scripts/promote-admin.mjs <email> [--yes]");
  process.exit(1);
}

const headers = { apikey: key, "Content-Type": "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${url}${path}`, { ...init, headers: { ...headers, ...init.headers } });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} su ${path.split("?")[0]}: ${text.slice(0, 200)}`);
  return text === "" ? null : JSON.parse(text);
}

// 1. id dell'utente dall'email (funzione SQL eseguibile solo con la chiave segreta)
const userId = await call("/rest/v1/rpc/get_user_id_by_email", {
  method: "POST",
  body: JSON.stringify({ p_email: email }),
});
if (!userId) {
  console.error("Nessun utente con questa email. Crealo prima (modulo lista d'interesse o pannello Supabase).");
  process.exit(1);
}

// 2. profilo esistente
const profiles = await call(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=id,role`);
if (!Array.isArray(profiles) || profiles.length === 0) {
  console.error(`Utente trovato (${userId}) ma senza riga in profiles: controlla il trigger on_auth_user_created.`);
  process.exit(1);
}
const current = profiles[0].role;
if (current === "admin") {
  console.log(`${email} (${userId}) è già admin: niente da fare.`);
  process.exit(0);
}

console.log(`Utente ${email} (${userId}): ruolo attuale "${current}" -> "admin".`);
if (!apply) {
  console.log("Simulazione: non ho modificato nulla. Aggiungi --yes per applicare.");
  process.exit(0);
}

// 3. applica e verifica
const updated = await call(`/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
  method: "PATCH",
  headers: { Prefer: "return=representation" },
  body: JSON.stringify({ role: "admin" }),
});
if (!Array.isArray(updated) || updated.length !== 1 || updated[0].role !== "admin") {
  console.error("Aggiornamento non confermato: controlla il profilo da Supabase.");
  process.exit(1);
}
console.log("Fatto: l'utente ora è admin. Vale subito: il ruolo si legge dal database a ogni richiesta.");
