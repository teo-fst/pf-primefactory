import "server-only";
import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth/session";
import { evaluateAdmin, type AdminGuard } from "./guard-core";

/**
 * Ricontrollo del ruolo dentro ogni Server Action e Route Handler del pannello.
 * Non ci si fida del fatto che la pagina sia protetta: una Server Action è un endpoint HTTP
 * che chiunque può chiamare. Il ruolo viene riletto dal database a ogni chiamata.
 * La seconda barriera è la RLS: le tabelle accettano scritture solo dagli admin.
 */
export async function guardAdmin(): Promise<AdminGuard> {
  return evaluateAdmin(await getCurrentProfile());
}

/** Per i Route Handler: l'utente admin oppure la risposta 401/403 da restituire. */
export async function guardAdminRoute(): Promise<{ userId: string } | NextResponse> {
  const guard = await guardAdmin();
  if (guard.ok) return { userId: guard.userId };
  return new NextResponse(null, {
    status: guard.reason === "unauthenticated" ? 401 : 403,
    headers: { "Cache-Control": "no-store" },
  });
}
