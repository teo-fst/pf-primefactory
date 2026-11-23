// Filtri dell'elenco richieste (Q13): lettura sicura dei parametri dell'indirizzo.
// Ogni valore è validato; i caratteri che hanno un significato speciale nella sintassi
// dei filtri di PostgREST (virgola, parentesi, apici, % e _ dei LIKE) vengono tolti dal testo libero.

export const PAGE_SIZE = 20;
export const REQUEST_KINDS = ["interesse", "preventivo"] as const;
export type RequestKind = (typeof REQUEST_KINDS)[number];

export type RequestFilters = {
  status: string | null;
  line: string | null;
  kind: RequestKind | null;
  source: string | null;
  q: string | null;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Testo libero reso innocuo per `ilike` dentro un filtro `or(...)`. */
export function sanitizeSearchText(raw: string): string {
  return raw
    .replace(/[,()"'\\%*_:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export function parseRequestFilters(params: Params): RequestFilters {
  const status = first(params.stato);
  const line = first(params.linea);
  const kind = first(params.tipo);
  const source = first(params.fonte).toLowerCase();
  const q = sanitizeSearchText(first(params.q));
  const page = Number.parseInt(first(params.pagina), 10);
  return {
    status: /^[a-z_]{1,40}$/.test(status) ? status : null,
    line: /^[a-z0-9-]{1,60}$/.test(line) ? line : null,
    kind: (REQUEST_KINDS as readonly string[]).includes(kind) ? (kind as RequestKind) : null,
    source: /^[a-z0-9-]{1,80}$/.test(source) ? source : null,
    q: q === "" ? null : q,
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Indirizzo dell'elenco con i filtri dati (per link di paginazione e azzeramento). */
export function requestsHref(filters: Partial<RequestFilters>, page?: number): string {
  const search = new URLSearchParams();
  if (filters.status) search.set("stato", filters.status);
  if (filters.line) search.set("linea", filters.line);
  if (filters.kind) search.set("tipo", filters.kind);
  if (filters.source) search.set("fonte", filters.source);
  if (filters.q) search.set("q", filters.q);
  if (page && page > 1) search.set("pagina", String(page));
  const query = search.toString();
  return query ? `/admin/richieste?${query}` : "/admin/richieste";
}
