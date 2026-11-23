import "server-only";

// Verifica dell'header "Authorization: Bearer <CRON_SECRET>" a tempo costante: si confrontano gli hash
// SHA-256 byte per byte senza uscire al primo byte diverso, così la durata non rivela quanti caratteri
// del segreto sono corretti (e nemmeno la sua lunghezza).
async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(digest);
}

export function parseBearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer[ ]+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function isValidBearer(header: string | null, secret: string | undefined): Promise<boolean> {
  if (!secret) return false; // senza segreto configurato nessuno passa
  const token = parseBearer(header);
  if (token === null) {
    // Fa comunque il lavoro del confronto, per non distinguere "header assente" da "header sbagliato".
    await sha256("");
    return false;
  }
  const [a, b] = await Promise.all([sha256(token), sha256(secret)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}
