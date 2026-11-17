// Isolated development/test preview. This flag cannot enable demo data in production mode.
import { spawn } from "node:child_process";
const child = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--mode",
    "demo",
    "--host",
    "127.0.0.1",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit", env: { ...process.env, VITE_ENABLE_DEMO: "true" } },
);
child.on("exit", (code) => process.exit(code ?? 1));
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => child.kill(signal));
