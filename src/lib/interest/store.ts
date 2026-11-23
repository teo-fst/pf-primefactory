import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InterestStore } from "./submit";

// Operazioni sul database del modulo, con la chiave segreta (la RLS non permette a un visitatore
// di creare account o richieste). Ogni query ha filtri espliciti: la chiave segreta salta la RLS,
// quindi qui decidiamo noi cosa è lecito leggere.

type Admin = ReturnType<typeof createAdminClient>;

async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("get_user_id_by_email", { p_email: email });
  if (error) throw error;
  return data ?? null;
}

export function createInterestStore(admin: Admin = createAdminClient()): InterestStore {
  return {
    async isPageActive() {
      const { data, error } = await admin
        .from("pages")
        .select("slug")
        .eq("slug", "lista-interesse")
        .eq("visibility", "attiva")
        .maybeSingle();
      if (error) throw error;
      return data !== null;
    },

    async getQuoteMode() {
      const { data, error } = await admin
        .from("site_settings")
        .select("value")
        .eq("key", "quote_mode")
        .maybeSingle();
      if (error) throw error;
      return data?.value;
    },

    async getLine(slug) {
      const { data, error } = await admin
        .from("business_lines")
        .select("id, form_schema")
        .eq("slug", slug)
        .eq("visibility", "attiva")
        .eq("accepts_requests", true)
        .maybeSingle();
      if (error) throw error;
      return data ? { id: data.id, formSchema: data.form_schema } : null;
    },

    async getPrivacyDocumentId(locale) {
      // Ultima versione pubblicata nella lingua; se manca, in italiano (lingua predefinita).
      for (const candidate of locale === "it" ? ["it"] : [locale, "it"]) {
        const { data, error } = await admin
          .from("legal_documents")
          .select("id")
          .eq("kind", "privacy")
          .eq("locale", candidate)
          .not("published_at", "is", null)
          .order("version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (data) return data.id;
      }
      return null;
    },

    async ensureCustomer({ email, fullName, phone, locale }) {
      const existing = await findUserIdByEmail(admin, email);
      if (existing) return existing; // non tocchiamo nome e telefono di un account già esistente

      const { data, error } = await admin.auth.admin.createUser({
        email,
        // Nessuna mail di conferma: la proprietà dell'indirizzo si prova con il magic link.
        email_confirm: true,
        user_metadata: { full_name: fullName, ...(phone ? { phone } : {}), locale },
      });
      if (error || !data.user) {
        // Due invii quasi simultanei con la stessa email: il secondo trova l'utente creato dal primo.
        const retry = await findUserIdByEmail(admin, email);
        if (retry) return retry;
        throw error ?? new Error("createUser senza utente");
      }
      return data.user.id;
    },

    async insertRequest(row) {
      const { error } = await admin.from("requests").insert(row);
      if (error) throw error;
    },
  };
}
