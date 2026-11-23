"use server";

import { hasLocale } from "next-intl";
import { revalidatePath } from "next/cache";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { processAccountDeletion } from "@/lib/account/delete-account";
import { parseProfileForm, type ProfileErrorCode, type ProfileField } from "@/lib/account/profile";
import { createDeleteAccountDeps } from "@/lib/account/server";
import { getCurrentUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type ProfileState =
  | { status: "idle" }
  | { status: "saved" }
  | { status: "invalid"; errors: Partial<Record<ProfileField, ProfileErrorCode>> }
  | { status: "error"; code: "auth" | "server" };

export type DeleteState =
  | { status: "idle" }
  | { status: "error"; code: "confirmation" | "storage" | "delete" | "auth" };

export async function updateProfile(_previous: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = parseProfileForm(formData);
  if (!parsed.ok) return { status: "invalid", errors: parsed.errors };

  const user = await getCurrentUser();
  if (!user) return { status: "error", code: "auth" };

  const supabase = await createClient();
  // La RLS e i grant di colonna consentono solo nome, telefono e lingua del PROPRIO profilo.
  const { error } = await supabase.from("profiles").update(parsed.values).eq("id", user.id);
  if (error) return { status: "error", code: "server" };

  revalidatePath("/[locale]/area-clienti", "layout");
  return { status: "saved" };
}

export async function deleteAccount(_previous: DeleteState, formData: FormData): Promise<DeleteState> {
  // Identità ed email dalla sessione verificata: il form porta solo la conferma digitata e la lingua.
  const user = await getCurrentUser();
  if (!user) return { status: "error", code: "auth" };

  const rawLocale = formData.get("locale");
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;

  const result = await processAccountDeletion(
    { userId: user.id, userEmail: user.email, confirmation: formData.get("confirmation") },
    createDeleteAccountDeps(),
  );
  if (result.status === "error") return { status: "error", code: result.code };

  // Account eliminato: chiude la sessione locale (cookie) e mostra la pagina di conferma.
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
  redirect({ href: "/account-eliminato", locale });
  return { status: "idle" };
}
