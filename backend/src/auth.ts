import bcrypt from "bcryptjs";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import { credentialsSchema, type UserProfile } from "./domain/schemas.js";

const COOKIE = "st_session";
const SESSION_DAYS = 30;
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

function randomToken(): string {
  return [...crypto.getRandomValues(new Uint8Array(32))]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function addDays(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function cookieOptions(c: Context) {
  const configured = process.env.COOKIE_SAMESITE;
  const sameSite: "None" | "Strict" | "Lax" =
    configured === "None" || configured === "Strict" || configured === "Lax" ? configured : "Lax";
  const secure = process.env.COOKIE_SECURE === "true" ||
    new URL(c.req.url).protocol === "https:" ||
    sameSite === "None";
  return {
    httpOnly: true,
    path: "/",
    secure,
    sameSite,
    partitioned: sameSite === "None",
  };
}

function issueCookie(c: Context, token: string) {
  setCookie(c, COOKIE, token, {
    ...cookieOptions(c),
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

function clearCookie(c: Context) {
  deleteCookie(c, COOKIE, cookieOptions(c));
}

function presentedToken(c: Context): string | null {
  const header = c.req.header("authorization");
  if (header?.toLowerCase().startsWith("bearer ")) {
    const token = header.slice(7).trim();
    if (token) return token;
  }
  return getCookie(c, COOKIE) ?? null;
}

async function createSession(db: PrismaClient, c: Context, userId: string): Promise<string> {
  const token = randomToken();
  await db.session.create({
    data: {
      id: crypto.randomUUID(),
      userId,
      tokenHash: await sha256(token),
      expiresAt: addDays(SESSION_DAYS),
      createdAt: new Date(),
    },
  });
  issueCookie(c, token);
  return token;
}

const SESSION_CACHE_MS = 60_000;
const sessionCache = new Map<string, { user: UserProfile; expiresAt: number; cachedAt: number }>();

function rememberSession(tokenHash: string, user: UserProfile, expiresAt: Date) {
  sessionCache.set(tokenHash, { user, expiresAt: expiresAt.getTime(), cachedAt: Date.now() });
}

function forgetSession(tokenHash: string) {
  sessionCache.delete(tokenHash);
}

export async function findUser(db: PrismaClient, c: Context): Promise<UserProfile | null> {
  const token = presentedToken(c);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const cached = sessionCache.get(tokenHash);
  const now = Date.now();
  if (cached && cached.expiresAt > now && now - cached.cachedAt < SESSION_CACHE_MS) {
    return cached.user;
  }
  if (cached) sessionCache.delete(tokenHash);
  const row = await db.session.findUnique({
    where: { tokenHash },
    select: {
      id: true,
      expiresAt: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!row) return null;
  if (row.expiresAt.getTime() <= now) {
    forgetSession(tokenHash);
    await db.session.delete({ where: { id: row.id } });
    return null;
  }
  const user = { id: row.user.id, email: row.user.email };
  rememberSession(tokenHash, user, row.expiresAt);
  return user;
}

export async function register(db: PrismaClient, c: Context) {
  const parsed = credentialsSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid account" }, 400);
  }
  const email = parsed.data.email.toLowerCase();
  const id = crypto.randomUUID();
  try {
    await db.user.create({
      data: {
        id,
        email,
        passwordHash: bcrypt.hashSync(parsed.data.password, 10),
        createdAt: new Date(),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return c.json({ error: "An account with that email already exists" }, 409);
    }
    throw error;
  }
  const token = await createSession(db, c, id);
  return c.json({ user: { id, email }, token }, 201);
}

export async function login(db: PrismaClient, c: Context) {
  const parsed = credentialsSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid account" }, 400);
  }
  const email = parsed.data.email.toLowerCase();
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true },
  });
  const hash = user?.passwordHash ?? DUMMY_HASH;
  const matches = bcrypt.compareSync(parsed.data.password, hash);
  if (!user || !matches) {
    return c.json({ error: "Invalid email or password" }, 401);
  }
  const token = await createSession(db, c, user.id);
  return c.json({ user: { id: user.id, email: user.email }, token });
}

export async function logout(db: PrismaClient, c: Context) {
  const token = presentedToken(c);
  if (token) {
    const tokenHash = await sha256(token);
    forgetSession(tokenHash);
    await db.session.deleteMany({ where: { tokenHash } });
  }
  clearCookie(c);
  return c.body(null, 204);
}

export async function me(db: PrismaClient, c: Context) {
  const user = await findUser(db, c);
  if (!user) return c.json({ error: "Unauthorized" }, 401);
  return c.json({ user });
}
