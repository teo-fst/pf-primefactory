import { z } from "zod";
import type { AbuseOutcome } from "@/lib/security/anti-abuse";
import { isFormLocale, type FormLocale } from "@/lib/interest/schema";

// Accesso con magic link (F1.7). Stessi principi del modulo: risposta uguale per email registrate
// e non registrate, Turnstile e rate limit, nessun dato personale nei log.

export type LoginErrorCode = "turnstile" | "rate_limited" | "unavailable" | "server";

export type LoginState =
  | { status: "idle" }
  | { status: "sent" }
  | { status: "invalid"; error: "required" | "invalid_email" | "too_long"; email: string }
  | { status: "error"; code: LoginErrorCode; email: string };

export type LoginDeps = {
  checkAbuse: (input: {
    scope: "login";
    ip: string | null;
    email: string;
    turnstileToken: string | null;
  }) => Promise<AbuseOutcome>;
  sendMagicLink: (email: string, locale: FormLocale) => Promise<void>;
};

const emailSchema = z
  .string({ error: "required" })
  .max(254, { error: "too_long" })
  .pipe(z.email({ error: "invalid_email" }));

type FormLike = { get(name: string): FormDataEntryValue | null };

export async function processLogin(form: FormLike, ip: string | null, deps: LoginDeps): Promise<LoginState> {
  const rawLocale = form.get("locale");
  const locale: FormLocale = isFormLocale(rawLocale) ? rawLocale : "it";

  const trap = form.get("company_website");
  if (typeof trap === "string" && trap.trim() !== "") return { status: "sent" };

  const rawEmail = form.get("email");
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const parsed = emailSchema.safeParse(email === "" ? undefined : email);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    const error = message === "too_long" || message === "invalid_email" ? message : "required";
    return { status: "invalid", error, email: email.slice(0, 254) };
  }

  const token = form.get("cf-turnstile-response");
  const abuse = await deps.checkAbuse({
    scope: "login",
    ip,
    email: parsed.data,
    turnstileToken: typeof token === "string" ? token : null,
  });
  if (!abuse.ok) {
    switch (abuse.kind) {
      case "email_limited":
        return { status: "sent" }; // non rivela che l'indirizzo e noto
      case "ip_limited":
        return { status: "error", code: "rate_limited", email: parsed.data };
      case "turnstile":
        return { status: "error", code: "turnstile", email: parsed.data };
      case "unavailable":
        return { status: "error", code: "unavailable", email: parsed.data };
    }
  }

  try {
    await deps.sendMagicLink(parsed.data, locale);
  } catch {
    console.error("[login] invio magic link non riuscito");
  }
  return { status: "sent" }; // sempre lo stesso esito, l'account esista o no
}
