import project from "./public-project.json";
import { cloudConfiguration } from "./config";
// These project identifiers are public, never administrator/server credentials.
export const configuration = cloudConfiguration(
  import.meta.env.VITE_SUPABASE_URL ?? project.url,
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? project.publishableKey,
);
export const demoMode =
  import.meta.env.MODE === "demo" &&
  import.meta.env.VITE_ENABLE_DEMO === "true";
