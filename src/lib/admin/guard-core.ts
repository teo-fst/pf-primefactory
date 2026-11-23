import { roleAllows, type AppRole } from "@/lib/auth/roles";

// Regola di accesso del pannello: solo gli admin (Q12). Gli operatori non hanno accesso alle tabelle
// del pannello (la RLS è riservata agli admin), quindi qui non passano.
// Funzione pura: il ruolo è quello letto dalla tabella `profiles`, mai dai metadata dell'utente.

export type GuardProfile = { id: string; role: AppRole } | null | undefined;

export type AdminGuard =
  | { ok: true; userId: string }
  | { ok: false; reason: "unauthenticated" | "forbidden" };

export function evaluateAdmin(profile: GuardProfile): AdminGuard {
  if (!profile) return { ok: false, reason: "unauthenticated" };
  if (!roleAllows(profile.role, "admin")) return { ok: false, reason: "forbidden" };
  return { ok: true, userId: profile.id };
}
