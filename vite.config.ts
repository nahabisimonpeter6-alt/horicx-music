import { defineConfig, loadEnv, type Plugin } from "vite";
import { cloudConfiguration } from "./src/lib/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
function productionAssets(mode: string): Plugin {
  let outDir = "";
  return {
    name: "horicx-production-assets",
    apply: "build",
    configResolved(c) {
      outDir = path.resolve(c.root, c.build.outDir);
    },
    async closeBundle() {
      if (mode === "demo") return;
      await rm(path.join(outDir, "audio"), { recursive: true, force: true });
      await rm(path.join(outDir, "demo-advert.mp4"), { force: true });
      const keep = new Set([
        "hero.svg",
        "cover-placeholder.svg",
        "artist-placeholder.svg",
      ]);
      for (const file of await readdir(path.join(outDir, "art")).catch(
        () => [],
      ))
        if (!keep.has(file))
          await rm(path.join(outDir, "art", file), { force: true });
    },
  };
}
export default defineConfig(({ mode }) => {
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  const inspected = cloudConfiguration(
    env.VITE_SUPABASE_URL || "https://placeholder.supabase.co",
    env.VITE_SUPABASE_ANON_KEY || "public-placeholder",
  );
  if (inspected.issue === "private-key" || inspected.issue === "invalid-url")
    throw Error(
      "Use a valid public Supabase URL and publishable/anon key. Server credentials must never enter frontend builds.",
    );
  return {
    plugins: [react(), tailwindcss(), productionAssets(mode)],
    resolve: {
      alias: {
        "@catalogue": fileURLToPath(
          new URL(
            mode === "demo"
              ? "./src/lib/demo.ts"
              : "./src/lib/production-catalogue.ts",
            import.meta.url,
          ),
        ),
      },
    },
    server: { port: 5173, strictPort: true },
    build: {
      target: "es2022",
      rollupOptions: {
        output: {
          manualChunks: {
            "vendor-supabase": ["@supabase/supabase-js"],
            "vendor-react": ["react", "react-dom"],
          },
        },
      },
    },
  };
});
