import "server-only";

// Escape per testo e attributi HTML: i valori che arrivano dal database (nome del cliente,
// nome della linea, etichetta dello stato) non finiscono mai nell'HTML senza passare di qui.
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailLayout = {
  locale: "it" | "en";
  heading: string;
  paragraphs: string[];
  ctaLabel: string;
  ctaUrl: string;
  footer: string;
};

// Layout semplice a tabella con stili in linea: è l'unico modo che i client di posta rendono in modo affidabile.
export function renderHtml(layout: EmailLayout): string {
  const paragraphs = layout.paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.55">${escapeHtml(p)}</p>`)
    .join("\n");
  const url = escapeHtml(layout.ctaUrl);
  return `<!doctype html>
<html lang="${layout.locale}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(layout.heading)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Arial,Helvetica,sans-serif;color:#18181b">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5">
<tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:8px">
<tr><td style="padding:28px">
<p style="margin:0 0 18px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#71717a">Primefactory</p>
<h1 style="margin:0 0 16px;font-size:20px;line-height:1.3">${escapeHtml(layout.heading)}</h1>
${paragraphs}
<p style="margin:22px 0"><a href="${url}" style="display:inline-block;padding:11px 20px;background:#18181b;color:#ffffff;text-decoration:none;border-radius:6px;font-size:15px">${escapeHtml(layout.ctaLabel)}</a></p>
<p style="margin:0 0 6px;font-size:12px;color:#71717a;word-break:break-all">${url}</p>
<p style="margin:14px 0 0;font-size:12px;color:#71717a">${escapeHtml(layout.footer)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function renderPlainText(layout: EmailLayout): string {
  return [
    layout.heading,
    "",
    ...layout.paragraphs.flatMap((p) => [p, ""]),
    `${layout.ctaLabel}: ${layout.ctaUrl}`,
    "",
    "--",
    layout.footer,
  ].join("\n");
}
