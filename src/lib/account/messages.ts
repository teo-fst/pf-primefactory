// Messaggi della conversazione (Q35): testo semplice, nessun HTML.

export const MESSAGE_MAX_LENGTH = 5000;

export type MessageCheck = { ok: true; body: string } | { ok: false; error: "empty" | "too_long" };

export function validateMessageBody(raw: unknown): MessageCheck {
  const body = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : "";
  if (body === "") return { ok: false, error: "empty" };
  if (body.length > MESSAGE_MAX_LENGTH) return { ok: false, error: "too_long" };
  return { ok: true, body };
}
