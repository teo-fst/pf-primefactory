# keepalive-worker

Piccolo Worker Cloudflare che ogni 3 giorni fa una `GET` a `${SUPABASE_URL}/rest/v1/`
con l'header `apikey`. Serve a evitare che Supabase (piano gratuito) metta in pausa
il progetto per inattivita (decisione Q29).

**Non e ancora deployato.** Il deploy va fatto a mano quando il progetto Supabase esiste.

## Variabili

Nessun valore e scritto nel codice. Si impostano come variabili/segreti del Worker:

- `SUPABASE_URL` (es. l'URL del progetto)
- `SUPABASE_PUBLISHABLE_KEY` (la chiave pubblicabile)

## Deploy (quando serve)

Da questa cartella, in un container con Node 22:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler deploy
```

Il cron e definito in `wrangler.jsonc` (`0 6 */3 * *`).
