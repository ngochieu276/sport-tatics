import type { Prisma, PrismaClient } from "@prisma/client";
import type { Context } from "hono";
import {
  createInitialSnapshot,
  rallyTreeError,
  snapshotError,
  type BranchKind,
  type CoverArea,
  type Format,
  type Snapshot,
} from "./domain/badminton.js";
import {
  tacticCreateSchema,
  tacticPatchSchema,
  tacticQuerySchema,
  type GroupSummary,
  type TacticDetail,
  type TacticSummary,
} from "./domain/schemas.js";
import type { AppEnv } from "./app-env.js";
import { ownedGroupIds } from "./groups.js";

function asTags(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((tag): tag is string => typeof tag === "string") : [];
}

function asGroups(rows: Array<{ group: { id: string; name: string; updatedAt: Date; _count: { tactics: number } } }>): GroupSummary[] {
  return rows.map((row) => ({
    id: row.group.id,
    name: row.group.name,
    tacticCount: row.group._count.tactics,
    updatedAt: row.group.updatedAt.toISOString(),
  }));
}

const groupInclude = {
  groups: {
    include: {
      group: { include: { _count: { select: { tactics: true } } } },
    },
  },
} as const;

async function setTacticGroups(
  db: PrismaClient,
  userId: string,
  tacticId: string,
  groupIds: string[] | undefined,
): Promise<string | null> {
  if (!groupIds) return null;
  const owned = await ownedGroupIds(db, userId, groupIds);
  if (!owned) return "Those groups are not in your library";
  await db.tacticGroup.deleteMany({ where: { tacticId } });
  if (owned.length > 0) {
    await db.tacticGroup.createMany({
      data: owned.map((groupId) => ({ tacticId, groupId })),
    });
  }
  return null;
}

function asBounds(raw: Record<string, unknown>): Omit<CoverArea, "id"> | null {
  if (
    typeof raw.x0 === "number" &&
    typeof raw.x1 === "number" &&
    typeof raw.y0 === "number" &&
    typeof raw.y1 === "number"
  ) {
    return { x0: raw.x0, x1: raw.x1, y0: raw.y0, y1: raw.y1 };
  }
  return null;
}

function asCoverAreas(value: Prisma.JsonValue): CoverArea[] {
  const rows = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? [value]
      : [];
  return rows.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const raw = item as Record<string, unknown>;
    const bounds = asBounds(raw);
    if (!bounds) return [];
    return [{
      id: typeof raw.id === "string" ? raw.id : crypto.randomUUID(),
      ...bounds,
    }];
  });
}

function asKind(value: string | null): BranchKind | null {
  return value === "follow" || value === "option" ? value : null;
}

function asSnapshot(row: {
  id: string;
  parentId: string | null;
  branchKind: string | null;
  players: Prisma.JsonValue;
  shot: Prisma.JsonValue;
  coverArea: Prisma.JsonValue;
}, _format: Format): Snapshot {
  return {
    id: row.id,
    parentId: row.parentId,
    kind: asKind(row.branchKind),
    players: row.players as Snapshot["players"],
    shot: row.shot as Snapshot["shot"],
    coverAreas: asCoverAreas(row.coverArea),
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
  return rallyTreeError(snapshots);
}

async function loadOwned(db: PrismaClient, userId: string, tacticId: string): Promise<TacticDetail | null> {
  const row = await db.tactic.findFirst({
    where: { id: tacticId, userId },
    include: { snapshots: { orderBy: { position: "asc" } }, ...groupInclude },
  });
  if (!row || (row.format !== "singles" && row.format !== "doubles")) return null;
  const format = row.format;
  const groups = asGroups(row.groups);
  return {
    id: row.id,
    sport: "badminton",
    format,
    title: row.title,
    notes: row.notes,
    tags: asTags(row.tags),
    snapshots: row.snapshots.map((snapshot) => asSnapshot(snapshot, format)),
    groupIds: groups.map((group) => group.id),
    groups,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listTactics(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const parsed = tacticQuerySchema.safeParse({
    format: c.req.query("format") ?? "",
    q: c.req.query("q") ?? "",
    groupId: c.req.query("groupId") ?? "",
  });
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid search" }, 400);
  }
  const format = parsed.data.format || undefined;
  const needle = (parsed.data.q ?? "").trim();
  const groupId = parsed.data.groupId || undefined;
  const rows = await db.tactic.findMany({
    where: {
      userId: user.id,
      ...(format ? { format } : {}),
      ...(needle ? { title: { contains: needle, mode: "insensitive" } } : {}),
      ...(groupId ? { groups: { some: { groupId } } } : {}),
    },
    include: groupInclude,
    orderBy: { updatedAt: "desc" },
  });
  const tactics: TacticSummary[] = rows.flatMap((row) => {
    if (row.format !== "singles" && row.format !== "doubles") return [];
    const groups = asGroups(row.groups);
    return [{
      id: row.id,
      format: row.format,
      title: row.title,
      tags: asTags(row.tags),
      groups,
      snapshotCount: row.snapshotCount,
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
  const owned = await ownedGroupIds(db, user.id, parsed.data.groupIds ?? []);
  if (!owned) return c.json({ error: "Those groups are not in your library" }, 400);
  const id = crypto.randomUUID();
  const now = new Date();
  const notes = parsed.data.notes?.trim() ?? "";
  const tags = normalizeTags(parsed.data.tags ?? []);
  const snapshot = createInitialSnapshot(parsed.data.format);
  await db.tactic.create({
    data: {
      id,
      userId: user.id,
      sport: "badminton",
      format: parsed.data.format,
      title: parsed.data.title,
      notes,
      tags: json(tags),
      snapshotCount: 1,
      createdAt: now,
      updatedAt: now,
      snapshots: {
        create: {
          id: snapshot.id,
          position: 0,
          branchKind: snapshot.kind,
          players: json(snapshot.players),
          shot: json(snapshot.shot),
          coverArea: json(snapshot.coverAreas),
        },
      },
    },
  });
  const groupError = await setTacticGroups(db, user.id, id, owned);
  if (groupError) return c.json({ error: groupError }, 400);
  const tactic = await loadOwned(db, user.id, id);
  if (!tactic) return c.json({ error: "Could not create the tactic" }, 500);
  return c.json({ tactic }, 201);
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
  const parsed = tacticPatchSchema.safeParse(await readJson(c));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid tactic" }, 400);
  }
  const now = new Date();
  const snapshots = parsed.data.snapshots;
  const existing = await db.tactic.findFirst({
    where: { id: tacticId, userId: user.id },
    select: { format: true },
  });
  if (!existing || (existing.format !== "singles" && existing.format !== "doubles")) {
    return c.json({ error: "Not found" }, 404);
  }
  if (snapshots) {
    const message = snapshotListError(existing.format, snapshots);
    if (message) return c.json({ error: message }, 400);
  }
  const groupError = parsed.data.groupIds ? await ownedGroupIds(db, user.id, parsed.data.groupIds) : [];
  if (groupError === null) return c.json({ error: "Those groups are not in your library" }, 400);
  await db.$transaction(async (tx) => {
    await tx.tactic.update({
      where: { id: tacticId },
      data: {
        ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
        ...(parsed.data.notes !== undefined ? { notes: parsed.data.notes.trim() } : {}),
        ...(parsed.data.tags !== undefined ? { tags: json(normalizeTags(parsed.data.tags)) } : {}),
        ...(snapshots ? { snapshotCount: snapshots.length } : {}),
        updatedAt: now,
      },
    });
    if (snapshots) {
      await tx.snapshot.deleteMany({ where: { tacticId } });
      await tx.snapshot.createMany({
        data: snapshots.map((snapshot, position) => ({
          id: snapshot.id,
          tacticId,
          position,
          parentId: snapshot.parentId,
          branchKind: snapshot.kind,
          players: json(snapshot.players),
          shot: json(snapshot.shot),
          coverArea: json(snapshot.coverAreas),
        })),
      });
    }
    if (parsed.data.groupIds) {
      await tx.tacticGroup.deleteMany({ where: { tacticId } });
      if (parsed.data.groupIds.length > 0) {
        await tx.tacticGroup.createMany({
          data: parsed.data.groupIds.map((groupId) => ({ tacticId, groupId })),
        });
      }
    }
  });
  const tactic = await loadOwned(db, user.id, tacticId);
  if (!tactic) return c.json({ error: "Not found" }, 404);
  return c.json({ tactic });
}

export async function removeTactic(db: PrismaClient, c: Context<AppEnv>) {
  const user = c.get("user");
  const tacticId = routeId(c);
  if (!tacticId) return c.json({ error: "Not found" }, 404);
  const result = await db.tactic.deleteMany({ where: { id: tacticId, userId: user.id } });
  if (result.count === 0) return c.json({ error: "Not found" }, 404);
  return c.body(null, 204);
}
