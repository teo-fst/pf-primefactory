import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

// Piccoli elementi condivisi dal pannello: stessi stili dei moduli pubblici (zinc), niente di nuovo.

export const cardClass = "rounded-lg border border-zinc-300 bg-white p-4";
export const tableClass = "w-full text-left text-sm";
export const thClass = "py-2 pr-4 font-medium text-zinc-600";
export const tdClass = "py-2 pr-4 align-top";

export function PageTitle({ children, actions }: { children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold tracking-tight">{children}</h1>
      {actions}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const tones = {
    neutral: "border-zinc-300 bg-zinc-100 text-zinc-800",
    good: "border-green-300 bg-green-50 text-green-900",
    warn: "border-amber-300 bg-amber-50 text-amber-900",
    bad: "border-red-300 bg-red-50 text-red-800",
  } as const;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone])}>
      {children}
    </span>
  );
}

/** Pagine precedente/successiva di un elenco. `hrefFor` costruisce l'indirizzo di una pagina. */
export function Pager({
  page,
  total,
  pageSize,
  hrefFor,
  labels,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefFor: (page: number) => string;
  labels: { prev: string; next: string; summary: string };
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const summary = labels.summary
    .replace("{page}", String(Math.min(page, pages)))
    .replace("{pages}", String(pages))
    .replace("{total}", String(total));
  return (
    <nav className="mt-4 flex items-center justify-between gap-4 text-sm" aria-label={summary}>
      <span className="text-zinc-600">{summary}</span>
      <span className="flex gap-4">
        {page > 1 ? (
          <Link href={hrefFor(page - 1)} className="underline underline-offset-2">
            {labels.prev}
          </Link>
        ) : null}
        {page < pages ? (
          <Link href={hrefFor(page + 1)} className="underline underline-offset-2">
            {labels.next}
          </Link>
        ) : null}
      </span>
    </nav>
  );
}

/** Data e ora nel fuso dell'attività. */
export function formatDateTime(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "it-IT", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Rome",
  }).format(new Date(iso));
}
