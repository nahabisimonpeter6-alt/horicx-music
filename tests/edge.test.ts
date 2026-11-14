// Real request handler; Supabase HTTP calls are explicitly mocked in these tests.
import assert from "node:assert/strict";
Deno.env.set("SUPABASE_URL", "http://127.0.0.1:54321");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-fixture-not-a-secret");
Deno.env.set("ALLOWED_ORIGINS", "http://localhost:5173");
const listener = "11111111-1111-4111-8111-111111111111";
let scenario = "listener";
const originalFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
  );
  const json = (body: unknown, status = 200) =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    );
  if (url.pathname === "/auth/v1/user")
    return scenario === "invalid"
      ? json({ message: "Invalid JWT" }, 401)
      : json({
          id: listener,
          aud: "authenticated",
          email: "listener@example.test",
          app_metadata: {},
          user_metadata: {},
          created_at: "2026-01-01T00:00:00Z",
        });
  if (url.pathname === "/rest/v1/rpc/consume_rate_limit")
    return json(scenario !== "limited");
  if (
    url.pathname === "/rest/v1/admin_roles" ||
    url.pathname === "/rest/v1/listening_passes"
  )
    return json([]);
  return json({ message: "Unexpected mock endpoint" }, 500);
}) as typeof fetch;
const { handler } = await import("../supabase/functions/music-api/handler.ts");
function request(
  action: string,
  options: {
    token?: string;
    origin?: string;
    extra?: Record<string, unknown>;
  } = {},
) {
  return new Request("http://localhost/music-api", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.origin ? { Origin: options.origin } : {}),
    },
    body: JSON.stringify({ action, ...options.extra }),
  });
}
Deno.test("allowed preflight succeeds without authentication", async () => {
  const r = await handler(
    new Request("http://localhost/music-api", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    }),
  );
  assert.equal(r.status, 204);
  assert.equal(
    r.headers.get("Access-Control-Allow-Origin"),
    "http://localhost:5173",
  );
});
Deno.test("unrecognised origin is rejected", async () => {
  const r = await handler(
    request("catalog", { origin: "https://evil.example" }),
  );
  assert.equal(r.status, 403);
  await r.body?.cancel();
});
Deno.test("unsupported methods return a clear error", async () => {
  const r = await handler(new Request("http://localhost/music-api"));
  assert.equal(r.status, 405);
  await r.body?.cancel();
});
Deno.test("malformed JSON is rejected", async () => {
  const r = await handler(
    new Request("http://localhost/music-api", {
      method: "POST",
      body: "{broken",
    }),
  );
  assert.equal(r.status, 400);
  await r.body?.cancel();
});
Deno.test(
  "streamed oversized JSON is rejected without Content-Length",
  async () => {
    const r = await handler(
      new Request("http://localhost/music-api", {
        method: "POST",
        body: JSON.stringify({ action: "play", padding: "x".repeat(40000) }),
      }),
    );
    assert.equal(r.status, 413);
    await r.body?.cancel();
  },
);
Deno.test("missing user token cannot access admin endpoints", async () => {
  const r = await handler(request("admin_overview"));
  assert.equal(r.status, 401);
  await r.body?.cancel();
});
Deno.test("missing user token cannot upload files", async () => {
  const r = await handler(
    new Request("http://localhost/music-api?upload=audio", {
      method: "POST",
      body: new FormData(),
    }),
  );
  assert.equal(r.status, 401);
  await r.body?.cancel();
});
Deno.test(
  "an invalid token is rejected by the authentication server",
  async () => {
    scenario = "invalid";
    try {
      const r = await handler(request("admin_overview", { token: "invalid" }));
      assert.equal(r.status, 401);
      await r.body?.cancel();
    } finally {
      scenario = "listener";
    }
  },
);
Deno.test(
  "a real listener token cannot perform administrator actions",
  async () => {
    const r = await handler(
      request("admin_overview", { token: "listener-fixture" }),
    );
    assert.equal(r.status, 403);
    assert.match((await r.json()).error, /Administrator access/);
  },
);
Deno.test(
  "client-supplied pass flags cannot unlock cloud playback",
  async () => {
    const r = await handler(
      request("play", {
        token: "listener-fixture",
        extra: {
          trackId: crypto.randomUUID(),
          hasPass: true,
          passUntil: Date.now() + 1800000,
        },
      }),
    );
    assert.equal(r.status, 402);
    assert.match((await r.json()).error, /Watch a short ad/);
  },
);
Deno.test("database rate limit rejection produces HTTP 429", async () => {
  scenario = "limited";
  try {
    const r = await handler(request("library", { token: "listener-fixture" }));
    assert.equal(r.status, 429);
    await r.body?.cancel();
  } finally {
    scenario = "listener";
  }
});
Deno.test(
  "responses prohibit caching of credentials and signed URLs",
  async () => {
    const r = await handler(request("library"));
    assert.equal(r.headers.get("Cache-Control"), "no-store");
    await r.body?.cancel();
  },
);
Deno.test("restore test fetch", () => {
  globalThis.fetch = originalFetch;
});
