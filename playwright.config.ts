import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  testMatch: "*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: { args: ["--autoplay-policy=no-user-gesture-required"] },
  },
  webServer: [
    {
      command: "node scripts/run-demo.mjs --port 5173 --strictPort",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 60000,
    },
    {
      command: "npx vite --host 127.0.0.1 --port 5174 --strictPort",
      url: "http://127.0.0.1:5174",
      reuseExistingServer: true,
      env: {
        VITE_SUPABASE_URL: "https://horicx-test.supabase.co",
        VITE_SUPABASE_ANON_KEY: "fixture-public-key",
      },
      timeout: 60000,
    },
    {
      command: "npm run build && npm run preview -- --port 5175 --strictPort",
      url: "http://127.0.0.1:5175",
      reuseExistingServer: false,
      timeout: 60000,
    },
  ],
});
