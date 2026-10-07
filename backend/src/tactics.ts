import type { Prisma, PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import { createInitialSnapshot, snapshotError, type Format, type Snapshot } from "./domain/badminton.js";
import {
  tacticCreateSchema,
  tacticPatchSchema,
  tacticQuerySchema,
  type TacticDetail,
  type TacticSummary,
} from "./domain/schemas.js";
import type { AppEnv } from "./app-env.js";

function asTags(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

function asSnapshot(row: { id: string; players: Prisma.JsonValue; shot: Prisma.JsonValue }): Snapshot {
  return {
    id: row.id,
    players: row.players as Snapshot["players"],
    shot: row.shot as Snapshot["shot"],
  };
}

function json(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function readJson(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function normalizeTags(tags: string[]): string[] {
  const unique: string[] = [];
  for (const tag of tags) {
    const clean = tag.trim().replace(/\s+/g, " ");
    if (!clean) continue;
    if (unique.some((item) => item.toLowerCase() === clean.toLowerCase())) continue;
    unique.push(clean);
  }
  return unique;
}

function snapshotListError(format: Format, snapshots: Snapshot[]): string | null {
  const ids = new Set<string>();
  for (const snapshot of snapshots) {
    if (ids.has(snapshot.id)) return "Each rally must have its own id";
    ids.add(snapshot.id);
    const message = snapshotError(format, snapshot);
    if (message) return message;
  }
  return null;
}

async function loadOwned(db: PrismaClient, userId: string, tacticId: string): Promise<TacticDetail | null> {
  const row = await db.tactic.findFirst({
    where: { id: tacticId, userId },
    include: { snapshots: { orderBy: { position: "asc" } } },
  });
  if (!row || (row.format !== "singles" && row.format !== "doubles")) return null;
  return {
    id: row.id,
    sport: "badminton",
    format: row.format,
    title: row.title,
    notes: row.notes,
    tags: asTags(row.tags),
    snapshots: row.snapshots.map(asSnapshot),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function replaceSnapshots(tx: Prisma.TransactionClient, tacticId: string, snapshots: Snapshot[]) {
  await tx.snapshot.deleteMany({ where: { tacticId } });
  await tx.snapshot.createMany({
    data: snapshots.map((snapshot, position) => ({
      id: snapshot.id,
      tacticId,
      position,
      players: json(snapshot.players),
      shot: json(snapshot.shot),
    })),
  });
}

export async function listTactics(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const parsed = tacticQuerySchema.safeParse({
    format: c.req.query("format") ?? "",
    q: c.req.query("q") ?? "",
  });
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid search" }, 400);
  }
  const format = parsed.data.format || undefined;
  const needle = (parsed.data.q ?? "").trim();
  const rows = await db.tactic.findMany({
    where: {
      userId: user.id,
      ...(format ? { format } : {}),
      ...(needle ? { title: { contains: needle, mode: "insensitive" } } : {}),
    },
    include: { _count: { select: { snapshots: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const tactics: TacticSummary[] = rows.flatMap((row) => {
    if (row.format !== "singles" && row.format !== "doubles") return [];
    return [{
      id: row.id,
      format: row.format,
      title: row.title,
      notes: row.notes,
      tags: asTags(row.tags),
      snapshotCount: row._count.snapshots,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }];
  });
  return c.json({ tactics });
}

export async function createTactic(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const parsed = tacticCreateSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid tactic" }, 400);
  }
  const id = crypto.randomUUID();
  const now = new Date();
  const notes = parsed.data.notes?.trim() ?? "";
  const tags = normalizeTags(parsed.data.tags ?? []);
  const snapshot = createInitialSnapshot(parsed.data.format);
  await db.$transaction(async (tx) => {
    await tx.tactic.create({
      data: {
        id,
        userId: user.id,
        sport: "badminton",
        format: parsed.data.format,
        title: parsed.data.title,
        notes,
        tags: json(tags),
        createdAt: now,
        updatedAt: now,
      },
    });
    await tx.snapshot.create({
      data: {
        id: snapshot.id,
        tacticId: id,
        position: 0,
        players: json(snapshot.players),
        shot: json(snapshot.shot),
      },
    });
  });
  return c.json({ tactic: await loadOwned(db, user.id, id) }, 201);
}

function routeId(c: Context): string | null {
  return c.req.param("id") ?? null;
}

export async function readTactic(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const tacticId = routeId(c);
  if (!tacticId) return c.json({ error: "Not found" }, 404);
  const tactic = await loadOwned(db, user.id, tacticId);
  if (!tactic) return c.json({ error: "Not found" }, 404);
  return c.json({ tactic });
}

export async function patchTactic(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const tacticId = routeId(c);
  if (!tacticId) return c.json({ error: "Not found" }, 404);
  const existing = await loadOwned(db, user.id, tacticId);
  if (!existing) return c.json({ error: "Not found" }, 404);
  const parsed = tacticPatchSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid tactic" }, 400);
  }
  const message = snapshotListError(existing.format, parsed.data.snapshots);
  if (message) return c.json({ error: message }, 400);
  const tags = normalizeTags(parsed.data.tags);
  const now = new Date();
  await db.$transaction(async (tx) => {
    await tx.tactic.update({
      where: { id: tacticId },
      data: {
        title: parsed.data.title,
        notes: parsed.data.notes.trim(),
        tags: json(tags),
        updatedAt: now,
      },
    });
    await replaceSnapshots(tx, tacticId, parsed.data.snapshots);
  });
  return c.json({ tactic: await loadOwned(db, user.id, tacticId) });
}

export async function removeTactic(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const tacticId = routeId(c);
  if (!tacticId) return c.json({ error: "Not found" }, 404);
  const result = await db.tactic.deleteMany({ where: { id: tacticId, userId: user.id } });
  if (result.count === 0) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
}
