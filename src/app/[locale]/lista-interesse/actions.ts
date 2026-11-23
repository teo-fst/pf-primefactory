"use server";

import { headers } from "next/headers";
import { redirect } from "@/i18n/navigation";
import { sendMagicLink } from "@/lib/auth/magic-link";
import { createInterestStore } from "@/lib/interest/store";
import { isFormLocale } from "@/lib/interest/schema";
import { processInterest } from "@/lib/interest/submit";
import { checkAbuse } from "@/lib/security/anti-abuse";
import { getClientIp } from "@/lib/security/client-ip";
import type { InterestFormState } from "./state";

// Server Action del modulo. Tutta la logica (e le regole di sicurezza) sta in lib/interest/submit.ts;
// qui solo il collegamento a Next: intestazioni, database reale, redirect finale.
export async function submitInterest(
  _previous: InterestFormState,
  formData: FormData,
): Promise<InterestFormState> {
  const rawLocale = formData.get("locale");
  const locale = isFormLocale(rawLocale) ? rawLocale : "it";

  let store;
  try {
    store = createInterestStore();
  } catch {
    console.error("[interest] configurazione Supabase mancante lato server");
    return { status: "error", code: "unavailable", values: {} };
  }

  const ip = getClientIp(await headers());
  const outcome = await processInterest(formData, ip, {
    store,
    checkAbuse: (input) => checkAbuse(input),
    sendMagicLink,
  });

  if (outcome.status === "ok") {
    // Stessa pagina per email nuova, già registrata o oltre il limite: nessuna enumerazione.
    redirect({ href: "/lista-interesse/conferma", locale });
  }
  return outcome as InterestFormState;
}
