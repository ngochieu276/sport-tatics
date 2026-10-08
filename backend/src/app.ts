import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";
import type { AppEnv } from "./app-env.js";
import { findUser, login, logout, me, register } from "./auth.js";
import { createGroup, listGroups, patchGroup, removeGroup } from "./groups.js";
import { createTactic, listTactics, patchTactic, readTactic, removeTactic } from "./tactics.js";

const BUILTIN_ORIGINS = [
  "https://sport-tatics.vercel.app",
  "https://sporttactic-web.fly.dev",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, "");
}

function isAllowedOrigin(origin: string | undefined): origin is string {
  if (!origin) return false;
  const normalized = normalizeOrigin(origin);
  if (BUILTIN_ORIGINS.includes(normalized)) return true;
  if (/^https:\/\/sport-tatics(?:-[a-z0-9-]+)*\.vercel\.app$/.test(normalized)) return true;
  const extra = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
  return extra.includes(normalized);
}

function applyCors(c: { header: (name: string, value: string) => void }, origin: string) {
  c.header("Access-Control-Allow-Origin", origin);
  c.header("Access-Control-Allow-Credentials", "true");
  c.header("Vary", "Origin");
}

export function createApp(db: PrismaClient) {
  const app = new Hono<AppEnv>();

  app.use("/api/*", async (c, next) => {
    const requestOrigin = c.req.header("origin");
    const allowed = isAllowedOrigin(requestOrigin);
    if (allowed) applyCors(c, requestOrigin);
    if (c.req.method === "OPTIONS") {
      if (allowed) {
        c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        c.header(
          "Access-Control-Allow-Headers",
          c.req.header("access-control-request-headers") ?? "Content-Type,Authorization",
        );
        c.header("Access-Control-Max-Age", "600");
      }
      return c.body(null, 204);
    }
    try {
      await next();
    } finally {
      if (allowed) applyCors(c, requestOrigin);
    }
  });

  app.use("/api/*", async (c, next) => {
    await next();
    c.header("cache-control", "no-store");
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Something went wrong" }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  app.post("/api/auth/register", (c) => register(db, c));
  app.post("/api/auth/login", (c) => login(db, c));
  app.post("/api/auth/logout", (c) => logout(db, c));
  app.get("/api/auth/me", (c) => me(db, c));

  app.use("/api/tactics", async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", user);
    await next();
  });
  app.use("/api/tactics/*", async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", user);
    await next();
  });
  app.use("/api/groups", async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", user);
    await next();
  });
  app.use("/api/groups/*", async (c, next) => {
    const user = await findUser(db, c);
    if (!user) return c.json({ error: "Unauthorized" }, 401);
    c.set("user", user);
    await next();
  });

  app.get("/api/tactics", (c) => listTactics(db, c));
  app.post("/api/tactics", (c) => createTactic(db, c));
  app.get("/api/tactics/:id", (c) => readTactic(db, c));
  app.patch("/api/tactics/:id", (c) => patchTactic(db, c));
  app.delete("/api/tactics/:id", (c) => removeTactic(db, c));

  app.get("/api/groups", (c) => listGroups(db, c));
  app.post("/api/groups", (c) => createGroup(db, c));
  app.patch("/api/groups/:id", (c) => patchGroup(db, c));
  app.delete("/api/groups/:id", (c) => removeGroup(db, c));

  app.notFound((c) => {
    if (c.req.path.startsWith("/api")) return c.json({ error: "Not found" }, 404);
    return c.text("Not found", 404);
  });

  return app;
}
