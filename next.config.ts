import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Cache Components e partialPrefetching (attivi nello scaffold) sono disattivati:
// su Cloudflare/OpenNext danno errore 500 a runtime (vedi README, sezione Note).
const nextConfig: NextConfig = {
  // Il container e2e raggiunge il server di sviluppo come "pf-web": senza questa voce Next blocca
  // le risorse /_next/* (HMR e idratazione) e i test che usano JavaScript nel browser non funzionano.
  allowedDevOrigins: ["pf-web"],
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
