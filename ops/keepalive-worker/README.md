# keepalive-worker

Piccolo Worker Cloudflare con due cron trigger:

| Cron | Cosa fa |
|------|---------|
| `0 6 */3 * *` (ogni 3 giorni) | `GET ${SUPABASE_URL}/rest/v1/` con l'header `apikey`: evita che Supabase (piano gratuito) metta in pausa il progetto per inattivita (decisione Q29). |
| `*/5 * * * *` (ogni 5 minuti) | `POST ${NOTIFY_URL}` con `Authorization: Bearer ${CRON_SECRET}`: consegna le notifiche in coda (email e Telegram, F1.10). |

**Non e ancora deployato.** Il deploy va fatto a mano quando il progetto Supabase e il sito esistono.

## Perche le notifiche partono da qui

Il Worker principale (OpenNext) esporta solo `fetch`: per aggiungere un gestore `scheduled` bisognerebbe
sostituire `main` in `wrangler.jsonc` con un file che riesporta `.open-next/worker.js` e le sue classi
Durable Object. Funziona, ma lega il deploy del sito a un file di colla da tenere allineato a ogni versione di OpenNext.
Un Worker separato e piu semplice e non tocca il sito: chiama solo l'endpoint protetto dal segreto.

## Variabili

Nessun valore e scritto nel codice. Si impostano come variabili/segreti del Worker:

- `SUPABASE_URL` (es. l'URL del progetto)
- `SUPABASE_PUBLISHABLE_KEY` (la chiave pubblicabile)
- `NOTIFY_URL`: indirizzo completo dell'endpoint, es. `https://<dominio>/api/cron/notifiche`
- `CRON_SECRET`: lo **stesso** valore del segreto `CRON_SECRET` del Worker del sito

Se `NOTIFY_URL`/`CRON_SECRET` mancano il cron delle notifiche non fa nulla (scrive un avviso nel log).
Se una chiamata diretta tra due Worker non funziona, usa un service binding: vedi i commenti in `wrangler.jsonc`.

## Deploy (quando serve)

Da questa cartella, in un container con Node 22:

```bash
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put NOTIFY_URL
npx wrangler secret put CRON_SECRET
npx wrangler deploy
```

I cron sono definiti in `wrangler.jsonc`. Il codice distingue i due compiti dal valore `controller.cron`:
se cambi l'espressione del cron delle notifiche, cambia anche `NOTIFY_CRON` in `src/index.ts`.

## Provare in locale

```bash
npx wrangler dev --test-scheduled --port 8789
# in un altro terminale (cron delle notifiche):
curl "http://localhost:8789/__scheduled?cron=*/5+*+*+*+*"
```
