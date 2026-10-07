import { cors } from "hono/cors";
import { Hono } from "hono";
import type { PrismaClient } from "@prisma/client";
import type { AppEnv } from "./app-env.js";
import { findUser, login, logout, me, register } from "./auth.js";
import { createTactic, listTactics, patchTactic, readTactic, removeTactic } from "./tactics.js";

function allowedOrigins(): string[] {
  return (process.env.CORS_ORIGIN ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export function createApp(db: PrismaClient) {
  const app = new Hono<AppEnv>();
  const origins = allowedOrigins();

  app.use("/api/*", cors({
    origin: (origin) => (origins.includes(origin) ? origin : null),
    credentials: true,
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }));

  app.use("/api/*", async (c, next) => {
    await next();
    c.header("cache-control", "no-store");
  });

  app.onError((error, c) => {
    console.error(error);
    return c.json({ error: "Something went wrong" }, 500);
  });

  app.get("/api/health", async (c) => {
    await db.$queryRaw`SELECT 1`;
    return c.json({ ok: true });
  });

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
