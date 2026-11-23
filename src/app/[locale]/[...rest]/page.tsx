import { notFound } from "next/navigation";

// Percorsi sconosciuti sotto /it o /en: mostra la pagina 404 con header e footer del sito.
export default function CatchAll() {
  notFound();
}
