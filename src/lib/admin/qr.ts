import qrcode from "qrcode-generator";
import { siteUrl } from "@/lib/seo";

// QR code degli eventi (Q39): punta al modulo d'interesse con il codice fonte già compilato.
// Il codice QR si genera qui, in locale: l'indirizzo non viene mai inviato a servizi esterni.

export type QrLocale = "it" | "en";

export function isQrLocale(value: unknown): value is QrLocale {
  return value === "it" || value === "en";
}

/** Indirizzo codificato nel QR. Usa NEXT_PUBLIC_SITE_URL (o http://localhost:3000 se manca). */
export function eventSignupUrl(locale: QrLocale, sourceCode: string): string {
  return `${siteUrl()}/${locale}/lista-interesse?fonte=${encodeURIComponent(sourceCode)}`;
}

const QUIET_ZONE = 4; // margine bianco in moduli, come da specifica QR

/**
 * Disegno del QR come un solo tracciato (path) in una griglia di `size` x `size` moduli,
 * margine incluso. Il tracciato lo costruiamo noi dai moduli: nell'SVG non entra mai testo.
 */
export function qrShape(text: string): { size: number; path: string } {
  const qr = qrcode(0, "M"); // correzione errori media
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }
  return { size: count + QUIET_ZONE * 2, path };
}

/** SVG completo (sfondo bianco, moduli neri), scalabile. */
export function qrSvg(text: string): string {
  const { size, path } = qrShape(text);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 8}" height="${size * 8}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#000000"/>` +
    `</svg>`
  );
}
