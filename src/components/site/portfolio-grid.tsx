import { pick, portfolioImageUrl, type PortfolioItem } from "@/lib/content";

/**
 * Griglia di foto dal bucket pubblico `portfolio`.
 * Usa <img> e non next/image: l'ottimizzazione immagini di Next richiede su Cloudflare Workers
 * un binding dedicato (Images) non configurato; le foto sono gia servite dalla CDN di Supabase.
 */
export function PortfolioGrid({
  items,
  locale,
  lineNames,
}: {
  items: PortfolioItem[];
  locale: string;
  lineNames: Map<number, string>;
}) {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const src = portfolioImageUrl(item.image_path);
        if (!src) return null;
        const caption = pick(item, "caption", locale);
        const lineName = item.business_line_id ? lineNames.get(item.business_line_id) : undefined;
        return (
          <li key={item.id}>
            <figure className="border bg-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={caption || lineName || ""}
                loading="lazy"
                decoding="async"
                className="aspect-[4/3] w-full object-cover"
              />
              {caption || lineName ? (
                <figcaption className="space-y-1 p-3 text-sm">
                  {lineName ? <span className="pf-label block">{lineName}</span> : null}
                  {caption ? <span className="block">{caption}</span> : null}
                </figcaption>
              ) : null}
            </figure>
          </li>
        );
      })}
    </ul>
  );
}
