"use server";

import { headers } from "next/headers";
import { sendMagicLink } from "@/lib/auth/magic-link";
import { processLogin, type LoginState } from "@/lib/auth/login";
import { checkAbuse } from "@/lib/security/anti-abuse";
import { getClientIp } from "@/lib/security/client-ip";

export async function requestMagicLink(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const ip = getClientIp(await headers());
  return processLogin(formData, ip, {
    checkAbuse: (input) => checkAbuse(input),
    sendMagicLink,
  });
}
