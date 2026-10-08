import { strict as assert } from "node:assert";
import { after, test } from "node:test";
import { createApp } from "./app.js";
import { prisma } from "./db.js";

const emails: string[] = [];

function cookieFrom(response: Response): string {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const raw = cookies.find((cookie) => cookie.startsWith("st_session="));
  if (!raw) throw new Error(`missing session cookie: ${response.status}`);
  return raw.split(";")[0] ?? raw;
}

function testEmail(label: string): string {
  const email = `${label}-${crypto.randomUUID()}@example.com`;
  emails.push(email);
  return email;
}

async function register(app: ReturnType<typeof createApp>, email: string) {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  const body = await response.json();
  return { response, body, cookie: cookieFrom(response) };
}

after(async () => {
  if (emails.length > 0) {
    await prisma.user.deleteMany({ where: { email: { in: emails } } });
  }
  await prisma.$disconnect();
});

test("accounts can register, log in, and log out", async () => {
  const app = createApp(prisma);
  const email = testEmail("coach");
  const created = await register(app, email);
  assert.equal(created.response.status, 201);
  assert.equal(created.body.user.email, email);
  assert.equal(typeof created.body.token, "string");

  const me = await app.request("/api/auth/me", { headers: { cookie: created.cookie } });
  assert.equal(me.status, 200);
  const bearer = await app.request("/api/auth/me", {
    headers: { authorization: `Bearer ${created.body.token}` },
  });
  assert.equal(bearer.status, 200);

  const logout = await app.request("/api/auth/logout", {
    method: "POST",
    headers: { cookie: created.cookie },
  });
  assert.equal(logout.status, 204);
  const afterLogout = await app.request("/api/auth/me", { headers: { cookie: created.cookie } });
  assert.equal(afterLogout.status, 401);

  const bad = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "wrong-password" }),
  });
  assert.equal(bad.status, 401);

  const again = await app.request("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password123" }),
  });
  assert.equal(again.status, 200);
});

test("an expired session is rejected", async () => {
  const app = createApp(prisma);
  const created = await register(app, testEmail("expired"));
  await prisma.session.updateMany({
    where: { user: { email: created.body.user.email } },
    data: { expiresAt: new Date("2000-01-01T00:00:00.000Z") },
  });
  const me = await app.request("/api/auth/me", { headers: { cookie: created.cookie } });
  assert.equal(me.status, 401);
});

test("tactics stay private to the user who created them", async () => {
  const app = createApp(prisma);
  const ada = await register(app, testEmail("ada"));
  const grace = await register(app, testEmail("grace"));

  const created = await app.request("/api/tactics", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ title: "High serve rotation", format: "doubles", tags: ["serve", "serve"] }),
  });
  assert.equal(created.status, 201);
  const tactic = (await created.json()).tactic;
  assert.equal(tactic.snapshots.length, 1);
  assert.equal(tactic.snapshots[0].players.length, 4);
  assert.deepEqual(tactic.tags, ["serve"]);

  const hidden = await app.request(`/api/tactics/${tactic.id}`, { headers: { cookie: grace.cookie } });
  assert.equal(hidden.status, 404);
  const patched = await app.request(`/api/tactics/${tactic.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: grace.cookie },
    body: JSON.stringify({ title: "Stolen", notes: "", tags: [], snapshots: tactic.snapshots }),
  });
  assert.equal(patched.status, 404);
  const removed = await app.request(`/api/tactics/${tactic.id}`, {
    method: "DELETE",
    headers: { cookie: grace.cookie },
  });
  assert.equal(removed.status, 404);

  const graceList = await app.request("/api/tactics", { headers: { cookie: grace.cookie } });
  assert.deepEqual((await graceList.json()).tactics, []);

  const adaList = await app.request("/api/tactics?format=doubles&q=rotation", {
    headers: { cookie: ada.cookie },
  });
  const listed = (await adaList.json()).tactics;
  assert.equal(listed.length, 1);
  assert.equal(listed[0].snapshotCount, 1);

  const singlesOnly = await app.request("/api/tactics?format=singles", {
    headers: { cookie: ada.cookie },
  });
  assert.deepEqual((await singlesOnly.json()).tactics, []);

  const next = {
    ...tactic.snapshots[0],
    id: crypto.randomUUID(),
    parentId: tactic.snapshots[0].id,
    kind: "follow",
    players: tactic.snapshots[0].players.map((player: { id: string; x: number; y: number }) =>
      player.id === "nearRight" ? { ...player, x: 0.8 } : player
    ),
    shot: { ...tactic.snapshots[0].shot, type: "smash" },
  };
  const saved = await app.request(`/api/tactics/${tactic.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({
      title: "High serve rotation",
      notes: "Attack the backhand",
      tags: ["Attack"],
      snapshots: [tactic.snapshots[0], next],
    }),
  });
  assert.equal(saved.status, 200);
  const updated = (await saved.json()).tactic;
  assert.equal(updated.snapshots[1].shot.type, "smash");
  assert.equal(updated.notes, "Attack the backhand");

  const illegal = structuredClone(updated.snapshots);
  illegal[0].players[0].y = 0.9;
  const rejected = await app.request(`/api/tactics/${tactic.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({
      title: updated.title,
      notes: updated.notes,
      tags: updated.tags,
      snapshots: illegal,
    }),
  });
  assert.equal(rejected.status, 400);

  const deleted = await app.request(`/api/tactics/${tactic.id}`, {
    method: "DELETE",
    headers: { cookie: ada.cookie },
  });
  assert.equal(deleted.status, 204);
  const gone = await app.request(`/api/tactics/${tactic.id}`, { headers: { cookie: ada.cookie } });
  assert.equal(gone.status, 404);
});

test("tactics can be renamed and placed in more than one group", async () => {
  const app = createApp(prisma);
  const ada = await register(app, testEmail("groups"));
  const serve = await app.request("/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ name: "Serve" }),
  });
  const smash = await app.request("/api/groups", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ name: "Smash" }),
  });
  assert.equal(serve.status, 201);
  assert.equal(smash.status, 201);
  const serveId = (await serve.json()).group.id;
  const smashId = (await smash.json()).group.id;

  const created = await app.request("/api/tactics", {
    method: "POST",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ title: "First name", format: "singles", groupIds: [serveId] }),
  });
  assert.equal(created.status, 201);
  const tactic = (await created.json()).tactic;
  assert.deepEqual(tactic.groups.map((group: { name: string }) => group.name), ["Serve"]);

  const renamed = await app.request(`/api/tactics/${tactic.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ title: "Second name" }),
  });
  assert.equal(renamed.status, 200);
  assert.equal((await renamed.json()).tactic.title, "Second name");

  const grouped = await app.request(`/api/tactics/${tactic.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: ada.cookie },
    body: JSON.stringify({ groupIds: [serveId, smashId] }),
  });
  assert.equal(grouped.status, 200);
  const names = (await grouped.json()).tactic.groups.map((group: { name: string }) => group.name).sort();
  assert.deepEqual(names, ["Serve", "Smash"]);
});
