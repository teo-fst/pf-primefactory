import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import type { EventRow } from "@/lib/content";
import { pick } from "@/lib/content";
import { formatDateRange } from "@/lib/format";

export async function EventList({
  events,
  locale,
  headingLevel = "h3",
}: {
  events: EventRow[];
  locale: string;
  headingLevel?: "h2" | "h3";
}) {
  const t = await getTranslations({ locale, namespace: "Site" });
  const Heading = headingLevel;
  const kinds = ["trackday", "motoraduno", "fiera", "altro"] as const;

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {events.map((event) => {
        const kind = kinds.find((k) => k === event.kind) ?? "altro";
        const description = pick(event, "description", locale);
        return (
          <li key={event.id} className="border bg-card p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{t(`eventKinds.${kind}`)}</Badge>
              <time
                dateTime={event.starts_on}
                className="font-mono text-sm text-muted-foreground"
              >
                {formatDateRange(event.starts_on, event.ends_on, locale)}
              </time>
            </div>
            <Heading className="text-lg font-semibold">{pick(event, "title", locale)}</Heading>
            {event.location ? (
              <p className="mt-1 text-sm">
                <span className="text-muted-foreground">{t("location")}: </span>
                {event.location}
              </p>
            ) : null}
            {description ? <p className="mt-2 text-sm">{description}</p> : null}
          </li>
        );
      })}
    </ul>
  );
}
