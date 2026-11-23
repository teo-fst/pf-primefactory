import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18n = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  // 1. next-intl: redirect/rewrite della lingua
  const response = handleI18n(request);
  // 2. Supabase: refresh della sessione sui cookie della stessa risposta
  return updateSession(request, response);
}

export const config = {
  // Tutto tranne API, file interni di Next e file statici (con estensione)
  matcher: ["/((?!api|trpc|_next|_vercel|.*\..*).*)"],
};
