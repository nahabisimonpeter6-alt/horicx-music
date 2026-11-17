/** Privileged owner bootstrap. Secrets live only in process memory, never the frontend. */
import { createClient } from "@supabase/supabase-js";
import { promptText, promptHidden, privateJSON } from "./private-input.mjs";
import { readFileSync } from "node:fs";
const publicProject = JSON.parse(
  readFileSync(
    new URL("../src/lib/public-project.json", import.meta.url),
    "utf8",
  ),
);
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Optional public configuration. */
}
const intendedEmail = "lordsimonpro@gmail.com";
let secrets = [];
try {
  const input = process.argv.includes("--stdin-json")
    ? await privateJSON()
    : {
        url:
          process.env.VITE_SUPABASE_URL ||
          publicProject.url ||
          (await promptText("Supabase project URL: ")),
        serviceKey: await promptHidden(
          "Supabase secret/service-role key (hidden, never saved): ",
        ),
        email: intendedEmail,
        password: await promptHidden(
          "Chosen administrator password (hidden, spaces preserved): ",
        ),
      };
  const url = new URL(String(input.url));
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    !["https:", "http:"].includes(url.protocol) ||
    (url.protocol === "http:" &&
      !["localhost", "127.0.0.1"].includes(url.hostname))
  )
    throw Error("Use a valid Supabase HTTPS project URL.");
  const email = String(input.email ?? intendedEmail)
    .trim()
    .toLowerCase();
  if (email !== intendedEmail)
    throw Error(`This bootstrap is configured only for ${intendedEmail}.`);
  if (typeof input.password !== "string" || input.password.length < 8)
    throw Error(
      "The administrator password must contain at least eight characters.",
    );
  if (typeof input.serviceKey !== "string" || !input.serviceKey.trim())
    throw Error(
      "A server secret/service-role key is required in private input.",
    );
  secrets = [input.password, input.serviceKey];
  const options = {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  };
  const admin = createClient(url.origin, input.serviceKey, options);
  // Check schema and private buckets before creating any account.
  for (const [table, column] of [
    ["settings", "id"],
    ["admin_roles", "user_id"],
    ["artist_follows", "user_id"],
  ]) {
    const { error } = await admin.from(table).select(column).limit(1);
    if (error)
      throw Error(
        "Apply the database migrations before provisioning the administrator.",
      );
  }
  const { data: buckets, error: bucketError } =
    await admin.storage.listBuckets();
  if (
    bucketError ||
    !["music", "covers", "adverts"].every((name) =>
      buckets.some((b) => b.id === name && !b.public),
    )
  )
    throw Error(
      "The music, cover and advert buckets must exist and be private.",
    );
  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
  });
  let id = created.data.user?.id;
  if (created.error) {
    if (
      !["email_exists", "user_already_exists"].includes(created.error.code) &&
      !/already (?:been )?registered|already exists/i.test(
        created.error.message,
      )
    )
      throw created.error;
    // Existing accounts are never overwritten. Verify the supplied password first.
    const verifier = createClient(url.origin, input.serviceKey, options);
    const signed = await verifier.auth.signInWithPassword({
      email,
      password: input.password,
    });
    if (signed.error || !signed.data.user)
      throw Error(
        "The account already exists. Its password was not changed. Use its existing password or reset it through Supabase.",
      );
    id = signed.data.user.id;
    await verifier.auth.signOut({ scope: "local" });
  }
  if (!id) throw Error("The authentication server did not return an account.");
  const granted = await admin.from("admin_roles").upsert({ user_id: id });
  if (granted.error)
    throw Error(
      "The account exists, but its administrator role could not be saved. Check migrations and rerun this command.",
    );
  const verified = await admin
    .from("admin_roles")
    .select("user_id")
    .eq("user_id", id)
    .single();
  if (verified.error || !verified.data)
    throw Error("Administrator role verification failed.");
  console.log(
    `Administrator account and protected role configured for ${email}.`,
  );
  console.log(
    "Sign in through Horicx Music after configuring its public Supabase URL and key.",
  );
} catch (error) {
  let message =
    error instanceof Error ? error.message : "Administrator setup failed.";
  for (const secret of secrets)
    if (secret) message = message.split(secret).join("[redacted]");
  console.error(message);
  process.exitCode = 1;
}
