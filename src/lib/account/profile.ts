// Modifica del profilo: la RLS consente al cliente solo nome, telefono e lingua.

export const PROFILE_LOCALES = ["it", "en"] as const;
export type ProfileLocale = (typeof PROFILE_LOCALES)[number];

export type ProfileValues = { full_name: string; phone: string | null; locale: ProfileLocale };
export type ProfileField = "full_name" | "phone" | "locale";
export type ProfileErrorCode = "name_required" | "name_too_long" | "phone_invalid" | "locale_invalid";

type FormLike = { get(name: string): FormDataEntryValue | null };

const PHONE_RE = /^[0-9+()\-./ ]{3,40}$/;

export function parseProfileForm(
  form: FormLike,
): { ok: true; values: ProfileValues } | { ok: false; errors: Partial<Record<ProfileField, ProfileErrorCode>> } {
  const text = (name: string) => {
    const v = form.get(name);
    return typeof v === "string" ? v.trim() : "";
  };
  const errors: Partial<Record<ProfileField, ProfileErrorCode>> = {};

  const fullName = text("full_name");
  if (fullName === "") errors.full_name = "name_required";
  else if (fullName.length > 200) errors.full_name = "name_too_long";

  const phone = text("phone");
  if (phone !== "" && !PHONE_RE.test(phone)) errors.phone = "phone_invalid";

  const locale = text("locale");
  if (!(PROFILE_LOCALES as readonly string[]).includes(locale)) errors.locale = "locale_invalid";

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    values: { full_name: fullName, phone: phone === "" ? null : phone, locale: locale as ProfileLocale },
  };
}
