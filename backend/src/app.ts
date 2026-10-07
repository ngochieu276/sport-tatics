import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";
import type { AppEnv } from "./app-env.js";
import { findUser, login, logout, me, register } from "./auth.js";
import { createTactic, listTactics, patchTactic, readTactic, removeTactic } from "./tactics.js";

const BUILTIN_ORIGINS = [
  "https://sport-tatics.vercel.app",
  "http://localhost:5173",
];

function allowedOrigins(): Set<string> {
  const fromEnv = (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return new Set([...BUILTIN_ORIGINS, ...fromEnv]);
}

export function createApp(db: PrismaClient) {
  const app = new Hono<AppEnv>();

  app.use("/api/*", async (c, next) => {
    const requestOrigin = c.req.header("origin");
    const allowed = requestOrigin !== undefined && allowedOrigins().has(requestOrigin.replace(/\/$/, ""));
    if (allowed && requestOrigin) {
      c.header("Access-Control-Allow-Origin", requestOrigin);
      c.header("Access-Control-Allow-Credentials", "true");
      c.header("Vary", "Origin");
    }
    if (c.req.method === "OPTIONS") {
      if (allowed) {
        c.header("Access-Control-Allow-Methods", "GET,POST,PATCH,DELETE,OPTIONS");
        c.header("Access-Control-Allow-Headers", "Content-Type,Authorization");
        c.header("Access-Control-Max-Age", "600");
      }
      return c.body(null, 204);
    }
    try {
      await next();
    } finally {
      if (allowed && requestOrigin) {
        c.header("Access-Control-Allow-Origin", requestOrigin);
        c.header("Access-Control-Allow-Credentials", "true");
        c.header("Vary", "Origin");
      }
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

  app.get("/api/tactics", (c) => listTactics(db, c));
  app.post("/api/tactics", (c) => createTactic(db, c));
  app.get("/api/tactics/:id", (c) => readTactic(db, c));
  app.patch("/api/tactics/:id", (c) => patchTactic(db, c));
  app.delete("/api/tactics/:id", (c) => removeTactic(db, c));

  app.notFound((c) => {
    if (c.req.path.startsWith("/api")) return c.json({ error: "Not found" }, 404);
    return c.text("Not found", 404);
  });

  return app;
}
