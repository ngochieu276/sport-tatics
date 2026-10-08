import type { PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import { groupCreateSchema, groupPatchSchema, type GroupSummary } from "./domain/schemas.js";
import type { AppEnv } from "./app-env.js";

const MAX_GROUPS = 40;

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function routeId(c: Context): string | null {
  return c.req.param("id") ?? null;
}

function asGroup(row: { id: string; name: string; updatedAt: Date; _count: { tactics: number } }): GroupSummary {
  return {
    id: row.id,
    name: row.name,
    tacticCount: row._count.tactics,
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listGroups(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const rows = await db.group.findMany({
    where: { userId: user.id },
    include: { _count: { select: { tactics: true } } },
    orderBy: { name: "asc" },
  });
  return c.json({ groups: rows.map(asGroup) });
}

export async function createGroup(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const parsed = groupCreateSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid group" }, 400);
  }
  const count = await db.group.count({ where: { userId: user.id } });
  if (count >= MAX_GROUPS) return c.json({ error: "You can have 40 groups" }, 400);
  const now = new Date();
  const group = await db.group.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      name: parsed.data.name,
      createdAt: now,
      updatedAt: now,
    },
    include: { _count: { select: { tactics: true } } },
  });
  return c.json({ group: asGroup(group) }, 201);
}

export async function patchGroup(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const id = routeId(c);
  if (!id) return c.json({ error: "Not found" }, 404);
  const parsed = groupPatchSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid group" }, 400);
  }
  const updated = await db.group.updateMany({
    where: { id, userId: user.id },
    data: { name: parsed.data.name, updatedAt: new Date() },
  });
  if (updated.count === 0) return c.json({ error: "Not found" }, 404);
  const group = await db.group.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { tactics: true } } },
  });
  if (!group) return c.json({ error: "Not found" }, 404);
  return c.json({ group: asGroup(group) });
}

export async function removeGroup(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const id = routeId(c);
  if (!id) return c.json({ error: "Not found" }, 404);
  const result = await db.group.deleteMany({ where: { id, userId: user.id } });
  if (result.count === 0) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
}

export async function ownedGroupIds(db: PrismaClient, userId: string, groupIds: string[]): Promise<string[] | null> {
  const unique = [...new Set(groupIds)];
  if (unique.length === 0) return [];
  const rows = await db.group.findMany({
    where: { userId, id: { in: unique } },
    select: { id: true },
  });
  if (rows.length !== unique.length) return null;
  return unique;
}
