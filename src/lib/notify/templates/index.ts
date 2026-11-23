import "server-only";
import type { NotifyEventType, NotifyLocale } from "../types";
import { renderHtml, renderPlainText } from "./html";
import { FOOTERS, TEXTS, templateKey, type EmailAudience, type TemplateVars } from "./texts";

export type RenderInput = {
  eventType: NotifyEventType;
  audience: EmailAudience;
  locale: NotifyLocale;
  publicCode: string;
  lineName?: string | null;
  statusLabel?: string | null;
  fileCount?: number | null;
  recipientName?: string | null;
  /** Link da aprire (area clienti o pannello admin). */
  link: string;
};

export type RenderedEmail = { subject: string; html: string; text: string };

/** Compone oggetto, HTML e testo semplice. Solleva un errore se la combinazione evento/destinatario non esiste. */
export function renderEmail(input: RenderInput): RenderedEmail {
  const key = templateKey(input.audience, input.eventType);
  if (!key) throw new Error(`nessun template per ${input.audience}/${input.eventType}`);

  const vars: TemplateVars = {
    code: input.publicCode,
    line: (input.lineName ?? "").trim(),
    status: (input.statusLabel ?? "").trim(),
    count: Math.max(1, input.fileCount ?? 1),
    name: (input.recipientName ?? "").trim(),
  };
  const copy = TEXTS[input.locale][key];
  const layout = {
    locale: input.locale,
    heading: copy.heading(vars),
    paragraphs: copy.paragraphs(vars),
    ctaLabel: copy.cta,
    ctaUrl: input.link,
    footer: FOOTERS[input.locale][input.audience],
  };
  return {
    subject: copy.subject(vars),
    html: renderHtml(layout),
    text: renderPlainText(layout),
  };
}

export type { EmailAudience } from "./texts";
