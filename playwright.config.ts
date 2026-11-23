import { defineConfig, devices } from "@playwright/test";

// In locale (profilo e2e di docker compose) BASE_URL punta al servizio `app`.
// In CI parte da solo il server di produzione con `npm run build && npm start`.
const baseURL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: { baseURL },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: "npm run build && npm run start",
        url: "http://localhost:3000/it",
        reuseExistingServer: !process.env.CI,
        timeout: 300_000,
      },
});
