import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
const id = "11111111-1111-4111-8111-111111111111",
  email = "lordsimonpro@gmail.com",
  password = "fixture pass 987!",
  serverKey = "sb_secret_fixture_only";
async function run(scenario) {
  let creates = 0,
    grants = 0,
    updates = 0;
  const received = [];
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url, "http://localhost").pathname;
    let raw = "";
    for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const respond = (status, data) => {
      res.writeHead(status, {
        "Content-Type": "application/json",
        "Content-Range": "0-0/1",
      });
      res.end(JSON.stringify(data));
    };
    if (
      req.method === "GET" &&
      ["/rest/v1/settings", "/rest/v1/artist_follows"].includes(pathname)
    )
      return respond(
        scenario === "missing-schema" ? 404 : 200,
        scenario === "missing-schema" ? { message: "Missing table" } : [],
      );
    if (pathname === "/storage/v1/bucket")
      return respond(
        200,
        ["music", "covers", "adverts"].map((name) => ({
          id: name,
          name,
          public: scenario === "public-bucket" && name === "music",
        })),
      );
    if (pathname === "/auth/v1/admin/users" && req.method === "POST") {
      creates++;
      received.push(body);
      return scenario === "existing-wrong-password"
        ? respond(422, {
            msg: "User already registered",
            error_code: "email_exists",
          })
        : respond(200, { id, email });
    }
    if (pathname === "/auth/v1/token")
      return respond(400, {
        msg: "Invalid login credentials",
        error_code: "invalid_credentials",
      });
    if (req.method === "PUT") updates++;
    if (pathname === "/rest/v1/admin_roles" && req.method === "POST") {
      grants++;
      return respond(201, []);
    }
    if (pathname === "/rest/v1/admin_roles" && req.method === "GET")
      return respond(200, grants ? { user_id: id } : []);
    return respond(500, { message: "Unexpected fixture endpoint" });
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  try {
    const child = spawn(
      process.execPath,
      ["scripts/provision-admin.mjs", "--stdin-json"],
      { cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] },
    );
    let output = "";
    child.stdout.on("data", (c) => (output += c));
    child.stderr.on("data", (c) => (output += c));
    child.stdin.end(
      JSON.stringify({ url, serviceKey: serverKey, email, password }) + "\n",
    );
    const code = await new Promise((resolve) => child.on("exit", resolve));
    return { code, output, creates, grants, updates, received };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}
test("owner bootstrap creates the requested account and protected role without printing credentials", async () => {
  const r = await run("new");
  assert.equal(r.code, 0);
  assert.equal(r.creates, 1);
  assert.equal(r.grants, 1);
  assert.equal(r.received[0].email, email);
  assert.equal(r.received[0].password, password);
  assert.ok(!r.output.includes(password));
  assert.ok(!r.output.includes(serverKey));
});
test("an existing account with another password is never overwritten or promoted", async () => {
  const r = await run("existing-wrong-password");
  assert.equal(r.code, 1);
  assert.equal(r.grants, 0);
  assert.equal(r.updates, 0);
  assert.match(r.output, /password was not changed/);
});
test("missing migrations stop bootstrap before account creation", async () => {
  const r = await run("missing-schema");
  assert.equal(r.code, 1);
  assert.equal(r.creates, 0);
  assert.match(r.output, /migrations/);
});
test("public music storage stops bootstrap before account creation", async () => {
  const r = await run("public-bucket");
  assert.equal(r.code, 1);
  assert.equal(r.creates, 0);
  assert.match(r.output, /private/);
});
