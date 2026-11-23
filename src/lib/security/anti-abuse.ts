import "server-only";
import { checkRateLimit } from "./rate-limit";
import { verifyTurnstile } from "./turnstile";

// Controlli anti-spam comuni al modulo lista d'interesse e al login (Q17).
// Ordine: limite per IP -> Turnstile -> limite per email. Il limite per email viene dopo Turnstile
// perché ha bisogno dell'email e non vogliamo che un bot consumi quote altrui senza token valido.

export type AbuseScope = "interest" | "login";

export type AbuseOutcome =
  | { ok: true }
  | { ok: false; kind: "ip_limited" | "unavailable" | "turnstile" | "email_limited" };

export type AbuseDeps = {
  rateLimit: typeof checkRateLimit;
  turnstile: typeof verifyTurnstile;
};

const defaultDeps: AbuseDeps = { rateLimit: checkRateLimit, turnstile: verifyTurnstile };

export async function checkAbuse(
  input: { scope: AbuseScope; ip: string | null; email: string; turnstileToken: string | null },
  deps: AbuseDeps = defaultDeps,
): Promise<AbuseOutcome> {
  const byIp = await deps.rateLimit(`${input.scope}-ip`, input.ip ?? "unknown");
  if (!byIp.ok) return { ok: false, kind: byIp.reason === "limited" ? "ip_limited" : "unavailable" };

  const captcha = await deps.turnstile(input.turnstileToken, input.ip);
  if (!captcha.ok) return { ok: false, kind: captcha.reason === "config" ? "unavailable" : "turnstile" };

  const byEmail = await deps.rateLimit(`${input.scope}-email`, input.email);
  if (!byEmail.ok) return { ok: false, kind: byEmail.reason === "limited" ? "email_limited" : "unavailable" };

  return { ok: true };
}
