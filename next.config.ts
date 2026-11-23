import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Cache Components e partialPrefetching (attivi nello scaffold) sono disattivati:
// su Cloudflare/OpenNext danno errore 500 a runtime (vedi README, sezione Note).
const nextConfig: NextConfig = {
  // Serve a forbidden(): pagine riservate a un ruolo rispondono 403 (src/lib/auth/session.ts).
  experimental: { authInterrupts: true },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
