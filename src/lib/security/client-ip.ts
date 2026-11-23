// Indirizzo IP del visitatore. Dietro Cloudflare l'intestazione affidabile è cf-connecting-ip
// (impostata da Cloudflare, il client non può falsificarla). Le altre servono solo in sviluppo.
export function getClientIp(headers: { get(name: string): string | null }): string | null {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || null;
}
