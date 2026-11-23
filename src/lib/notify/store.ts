import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { isEventType, pickLocale, type Labels, type OutboxEvent, type Recipient } from "./types";

// Accesso al database del processore, con la chiave segreta (la RLS non permette a un visitatore
// di leggere l'outbox). Le funzioni notify_* sono eseguibili solo da service_role.

type Admin = ReturnType<typeof createAdminClient>;

export interface NotifyStore {
  /** Prende un lotto di eventi da inviare (con lease: vedi notify_claim_batch). */
  claimBatch(limit: number): Promise<OutboxEvent[]>;
  markDone(id: number, delivered: string[]): Promise<void>;
  markFailed(id: number, errorCode: string, nextAttemptAt: Date, delivered: string[]): Promise<void>;
  getLineLabels(slug: string): Promise<Labels | null>;
  getStatusLabels(code: string): Promise<Labels | null>;
  /** Email, nome e lingua di un utente; `null` se non esiste più o non ha email. */
  getRecipient(userId: string): Promise<Recipient | null>;
  /** I soci con ruolo admin che hanno un indirizzo email. */
  listAdmins(): Promise<Recipient[]>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function createNotifyStore(admin: Admin = createAdminClient()): NotifyStore {
  async function emailOf(userId: string): Promise<string | null> {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user?.email) return null;
    return data.user.email;
  }

  return {
    async claimBatch(limit) {
      const { data, error } = await admin.rpc("notify_claim_batch", { p_limit: limit });
      if (error) throw error;
      const events: OutboxEvent[] = [];
      for (const row of data ?? []) {
        if (!isEventType(row.event_type)) continue;
        events.push({
          id: row.id,
          eventType: row.event_type,
          requestId: row.request_id,
          payload: isRecord(row.payload) ? row.payload : {},
          attempts: row.attempts,
          delivered: row.delivered ?? [],
        });
      }
      return events;
    },

    async markDone(id, delivered) {
      const { error } = await admin.rpc("notify_mark_done", { p_id: id, p_delivered: delivered });
      if (error) throw error;
    },

    async markFailed(id, errorCode, nextAttemptAt, delivered) {
      const { error } = await admin.rpc("notify_mark_failed", {
        p_id: id,
        p_error: errorCode,
        p_next_attempt_at: nextAttemptAt.toISOString(),
        p_delivered: delivered,
      });
      if (error) throw error;
    },

    async getLineLabels(slug) {
      const { data, error } = await admin
        .from("business_lines")
        .select("name_it, name_en")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw error;
      return data ? { it: data.name_it, en: data.name_en } : null;
    },

    async getStatusLabels(code) {
      const { data, error } = await admin
        .from("request_statuses")
        .select("label_it, label_en")
        .eq("code", code)
        .maybeSingle();
      if (error) throw error;
      return data ? { it: data.label_it, en: data.label_en } : null;
    },

    async getRecipient(userId) {
      const [profile, email] = await Promise.all([
        admin.from("profiles").select("full_name, locale").eq("id", userId).maybeSingle(),
        emailOf(userId),
      ]);
      if (profile.error) throw profile.error;
      if (!email) return null;
      return {
        userId,
        email,
        name: profile.data?.full_name ?? "",
        locale: pickLocale(profile.data?.locale),
      };
    },

    async listAdmins() {
      const { data, error } = await admin.from("profiles").select("id, full_name, locale").eq("role", "admin");
      if (error) throw error;
      const found = await Promise.all(
        (data ?? []).map(async (p): Promise<Recipient | null> => {
          const email = await emailOf(p.id);
          return email ? { userId: p.id, email, name: p.full_name, locale: pickLocale(p.locale) } : null;
        }),
      );
      return found.filter((r): r is Recipient => r !== null);
    },
  };
}
