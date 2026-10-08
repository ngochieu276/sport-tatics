/** Court space: x runs left to right across the doubles width, y runs from the near baseline (0) to the far baseline (1). The net is y = 0.5. */

export const FORMATS = ["singles", "doubles"] as const;
export type Format = (typeof FORMATS)[number];

export const SINGLES_SLOTS = ["near", "far"] as const;
export const DOUBLES_SLOTS = ["nearLeft", "nearRight", "farLeft", "farRight"] as const;
export const PLAYER_SLOTS = [...SINGLES_SLOTS, ...DOUBLES_SLOTS] as const;
export type PlayerSlot = (typeof PLAYER_SLOTS)[number];

export const SHOT_TYPES = [
  "lowServe",
  "highServe",
  "flickServe",
  "clear",
  "drop",
  "smash",
  "drive",
  "net",
  "lift",
  "push",
  "kill",
  "block",
] as const;
export type ShotType = (typeof SHOT_TYPES)[number];

export type Point = { x: number; y: number };

export type PlayerState = {
  id: PlayerSlot;
  x: number;
  y: number;
};

export type Shot = {
  hitterId: PlayerSlot;
  type: ShotType;
  target: Point;
};

export type Bounds = { x0: number; x1: number; y0: number; y1: number };
export type CoverArea = Bounds & { id: string };

export type BranchKind = "follow" | "option";

export type Snapshot = {
  id: string;
  parentId: string | null;
  kind: BranchKind | null;
  players: PlayerState[];
  shot: Shot;
  coverAreas: CoverArea[];
};

export const COVER_MIN = 0.06;
export const MAX_COVER_AREAS = 8;
export type CoverHandle = "move" | "x0" | "x1" | "y0" | "y1" | "x0y0" | "x0y1" | "x1y0" | "x1y1";

export const MAX_NEXT_RALLIES = 3;
export const MAX_OPTIONS = 3;

export const COURT = {
  lengthM: 13.4,
  doublesWidthM: 6.1,
  singlesWidthM: 5.18,
  shortServiceFromNetM: 1.98,
  longServiceFromBaselineM: 0.76,
} as const;

export const SINGLES_LEFT =
  (COURT.doublesWidthM - COURT.singlesWidthM) / 2 / COURT.doublesWidthM;
export const SINGLES_RIGHT = 1 - SINGLES_LEFT;
export const SHORT_SERVICE_NEAR =
  (COURT.lengthM / 2 - COURT.shortServiceFromNetM) / COURT.lengthM;
export const SHORT_SERVICE_FAR = 1 - SHORT_SERVICE_NEAR;
export const LONG_SERVICE_NEAR = COURT.longServiceFromBaselineM / COURT.lengthM;
export const LONG_SERVICE_FAR = 1 - LONG_SERVICE_NEAR;
export const NET_Y = 0.5;
export const COURT_MARGIN = 0.04;

export type LineKind = "boundary" | "inner" | "service" | "center" | "net";

export type CourtSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: LineKind;
};

export type ShotProfile = {
  type: ShotType;
  label: string;
  arc: number;
  durationMs: number;
};

const SHOT_DETAILS: Record<ShotType, { label: string; arc: number; durationMs: number }> = {
  lowServe: { label: "Low serve", arc: 0.02, durationMs: 1700 },
  highServe: { label: "High serve", arc: 0.22, durationMs: 3200 },
  flickServe: { label: "Flick serve", arc: 0.14, durationMs: 2000 },
  clear: { label: "Clear", arc: 0.2, durationMs: 2900 },
  drop: { label: "Drop", arc: 0.1, durationMs: 2300 },
  smash: { label: "Smash", arc: 0.015, durationMs: 1100 },
  drive: { label: "Drive", arc: 0.03, durationMs: 1200 },
  net: { label: "Net shot", arc: 0.07, durationMs: 1800 },
  lift: { label: "Lift", arc: 0.21, durationMs: 2900 },
  push: { label: "Push", arc: 0.045, durationMs: 1400 },
  kill: { label: "Kill", arc: 0.012, durationMs: 900 },
  block: { label: "Block", arc: 0.04, durationMs: 1300 },
};

export const SHOT_GROUPS: { label: string; types: ShotType[] }[] = [
  { label: "Serve", types: ["lowServe", "highServe", "flickServe"] },
  { label: "Overhead", types: ["clear", "smash", "drop", "kill"] },
  { label: "Net and drive", types: ["drive", "net", "push", "lift", "block"] },
];

export const SLOT_LABELS: Record<PlayerSlot, { full: string; short: string }> = {
  near: { full: "Near", short: "N" },
  far: { full: "Far", short: "F" },
  nearLeft: { full: "N1", short: "N1" },
  nearRight: { full: "N2", short: "N2" },
  farLeft: { full: "F1", short: "F1" },
  farRight: { full: "F2", short: "F2" },
};

export function shotProfile(type: ShotType): ShotProfile {
  return { type, ...SHOT_DETAILS[type] };
}

export function slotsFor(format: Format): PlayerSlot[] {
  return format === "singles" ? [...SINGLES_SLOTS] : [...DOUBLES_SLOTS];
}

export function halfOf(slot: PlayerSlot): "near" | "far" {
  return slot.startsWith("near") ? "near" : "far";
}

export function courtSegments(format: Format): CourtSegment[] {
  const sidelineKind = (doublesLine: boolean): LineKind => {
    if (doublesLine) return format === "doubles" ? "boundary" : "inner";
    return format === "singles" ? "boundary" : "inner";
  };

  return [
    { x1: 0, y1: 0, x2: 1, y2: 0, kind: sidelineKind(true) },
    { x1: 0, y1: 1, x2: 1, y2: 1, kind: sidelineKind(true) },
    { x1: 0, y1: 0, x2: 0, y2: 1, kind: sidelineKind(true) },
    { x1: 1, y1: 0, x2: 1, y2: 1, kind: sidelineKind(true) },
    { x1: SINGLES_LEFT, y1: 0, x2: SINGLES_LEFT, y2: 1, kind: sidelineKind(false) },
    { x1: SINGLES_RIGHT, y1: 0, x2: SINGLES_RIGHT, y2: 1, kind: sidelineKind(false) },
    { x1: SINGLES_LEFT, y1: LONG_SERVICE_NEAR, x2: SINGLES_RIGHT, y2: LONG_SERVICE_NEAR, kind: "service" },
    { x1: SINGLES_LEFT, y1: LONG_SERVICE_FAR, x2: SINGLES_RIGHT, y2: LONG_SERVICE_FAR, kind: "service" },
    { x1: 0, y1: SHORT_SERVICE_NEAR, x2: 1, y2: SHORT_SERVICE_NEAR, kind: "service" },
    { x1: 0, y1: SHORT_SERVICE_FAR, x2: 1, y2: SHORT_SERVICE_FAR, kind: "service" },
    { x1: 0.5, y1: 0, x2: 0.5, y2: SHORT_SERVICE_NEAR, kind: "center" },
    { x1: 0.5, y1: SHORT_SERVICE_FAR, x2: 0.5, y2: 1, kind: "center" },
    { x1: 0, y1: NET_Y, x2: 1, y2: NET_Y, kind: "net" },
  ];
}

export function playerBounds(format: Format, slot: PlayerSlot): Bounds {
  const x0 = format === "singles" ? SINGLES_LEFT : 0;
  const x1 = format === "singles" ? SINGLES_RIGHT : 1;
  const near = halfOf(slot) === "near";
  return {
    x0: x0 + COURT_MARGIN,
    x1: x1 - COURT_MARGIN,
    y0: near ? COURT_MARGIN : NET_Y + COURT_MARGIN,
    y1: near ? NET_Y - COURT_MARGIN : 1 - COURT_MARGIN,
  };
}

export function targetBounds(format: Format, hitter: PlayerSlot): Bounds {
  const slot: PlayerSlot = halfOf(hitter) === "near"
    ? (format === "singles" ? "far" : "farLeft")
    : (format === "singles" ? "near" : "nearLeft");
  return playerBounds(format, slot);
}

export function contains(bounds: Bounds, point: Point, epsilon = 1e-4): boolean {
  return point.x >= bounds.x0 - epsilon &&
    point.x <= bounds.x1 + epsilon &&
    point.y >= bounds.y0 - epsilon &&
    point.y <= bounds.y1 + epsilon;
}

export function clampToBounds(bounds: Bounds, point: Point): Point {
  return {
    x: Math.min(bounds.x1, Math.max(bounds.x0, point.x)),
    y: Math.min(bounds.y1, Math.max(bounds.y0, point.y)),
  };
}

export function clampPlayer(format: Format, slot: PlayerSlot, point: Point): Point {
  return clampToBounds(playerBounds(format, slot), point);
}

export function clampTarget(format: Format, hitter: PlayerSlot, point: Point): Point {
  return clampToBounds(targetBounds(format, hitter), point);
}

export function courtPlayBounds(format: Format): Bounds {
  const x0 = format === "singles" ? SINGLES_LEFT : 0;
  const x1 = format === "singles" ? SINGLES_RIGHT : 1;
  return {
    x0: x0 + COURT_MARGIN,
    x1: x1 - COURT_MARGIN,
    y0: COURT_MARGIN,
    y1: 1 - COURT_MARGIN,
  };
}

export function defaultCoverArea(format: Format, hitter: PlayerSlot): Bounds {
  return targetBounds(format, hitter);
}

export function createCoverArea(format: Format, hitter: PlayerSlot, existing: CoverArea[]): CoverArea {
  const base = defaultCoverArea(format, hitter);
  const shift = (existing.length % 4) * 0.05;
  const bounds = clampCoverArea(format, {
    x0: base.x0 + shift,
    y0: base.y0 + shift,
    x1: base.x1,
    y1: base.y1,
  });
  return { id: crypto.randomUUID(), ...bounds };
}

export function clampCoverArea(format: Format, area: Bounds): Bounds {
  const court = courtPlayBounds(format);
  let x0 = Math.min(area.x0, area.x1);
  let x1 = Math.max(area.x0, area.x1);
  let y0 = Math.min(area.y0, area.y1);
  let y1 = Math.max(area.y0, area.y1);
  x0 = Math.min(Math.max(x0, court.x0), court.x1 - COVER_MIN);
  y0 = Math.min(Math.max(y0, court.y0), court.y1 - COVER_MIN);
  x1 = Math.max(x0 + COVER_MIN, Math.min(x1, court.x1));
  y1 = Math.max(y0 + COVER_MIN, Math.min(y1, court.y1));
  return { x0, y0, x1, y1 };
}

export function applyCoverHandle(
  format: Format,
  start: Bounds,
  handle: CoverHandle,
  origin: Point,
  point: Point,
): Bounds {
  if (handle === "move") {
    const court = courtPlayBounds(format);
    const width = start.x1 - start.x0;
    const height = start.y1 - start.y0;
    const x0 = Math.min(Math.max(start.x0 + point.x - origin.x, court.x0), court.x1 - width);
    const y0 = Math.min(Math.max(start.y0 + point.y - origin.y, court.y0), court.y1 - height);
    return { x0, y0, x1: x0 + width, y1: y0 + height };
  }
  const next = { ...start };
  if (handle.includes("x0")) next.x0 = point.x;
  if (handle.includes("x1")) next.x1 = point.x;
  if (handle === "y0" || handle.endsWith("y0")) next.y0 = point.y;
  if (handle === "y1" || handle.endsWith("y1")) next.y1 = point.y;
  return clampCoverArea(format, next);
}

export function defaultStances(format: Format): PlayerState[] {
  if (format === "singles") {
    return [
      { id: "near", x: 0.5, y: 0.32 },
      { id: "far", x: 0.5, y: 0.68 },
    ];
  }
  return [
    { id: "nearLeft", x: 0.32, y: 0.3 },
    { id: "nearRight", x: 0.68, y: 0.3 },
    { id: "farLeft", x: 0.32, y: 0.7 },
    { id: "farRight", x: 0.68, y: 0.7 },
  ];
}

export function createInitialSnapshot(format: Format, id = crypto.randomUUID()): Snapshot {
  const hitterId: PlayerSlot = format === "singles" ? "near" : "nearRight";
  const rawTarget = format === "singles" ? { x: 0.42, y: 0.66 } : { x: 0.3, y: 0.66 };
  return {
    id,
    parentId: null,
    kind: null,
    players: defaultStances(format),
    shot: {
      hitterId,
      type: "lowServe",
      target: clampTarget(format, hitterId, rawTarget),
    },
    coverAreas: [],
  };
}

export function childrenOf(snapshots: Snapshot[], parentId: string): Snapshot[] {
  return snapshots.filter((item) => item.parentId === parentId);
}

export function followChild(snapshots: Snapshot[], parentId: string): Snapshot | undefined {
  return childrenOf(snapshots, parentId).find((item) => item.kind === "follow");
}

export function optionChildren(snapshots: Snapshot[], parentId: string): Snapshot[] {
  return childrenOf(snapshots, parentId).filter((item) => item.kind !== "follow");
}

export function rallyLabel(snapshots: Snapshot[], snapshot: Snapshot): string {
  if (!snapshot.parentId) return "Opening";
  if (snapshot.kind === "follow") return "Follow";
  return `Option ${optionChildren(snapshots, snapshot.parentId).findIndex((item) => item.id === snapshot.id) + 1}`;
}

export function pathTo(snapshots: Snapshot[], id: string): Snapshot[] {
  const byId = new Map(snapshots.map((item) => [item.id, item]));
  const path: Snapshot[] = [];
  const seen = new Set<string>();
  let cursor = byId.get(id);
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    path.push(cursor);
    cursor = cursor.parentId ? byId.get(cursor.parentId) : undefined;
  }
  return path.reverse();
}

export function rallyPaths(snapshots: Snapshot[]): Snapshot[][] {
  const opening = snapshots.find((item) => item.parentId === null);
  if (!opening) return [];
  const paths: Snapshot[][] = [];
  const visit = (node: Snapshot, prefix: Snapshot[]) => {
    const next = [...prefix, node];
    const kids = childrenOf(snapshots, node.id);
    if (kids.length === 0) {
      paths.push(next);
      return;
    }
    for (const child of kids) visit(child, next);
  };
  visit(opening, []);
  return paths;
}

export function pathShotLabel(path: Snapshot[]): string {
  return path.map((item) => shotProfile(item.shot.type).label).join(" → ");
}

export function pathContaining(snapshots: Snapshot[], rallyId: string): Snapshot[] {
  const paths = rallyPaths(snapshots);
  return paths.find((path) => path[path.length - 1]?.id === rallyId)
    ?? paths.find((path) => path.some((item) => item.id === rallyId))
    ?? paths[0]
    ?? [];
}

export function descendantIds(snapshots: Snapshot[], id: string): string[] {
  const ids = [id];
  for (const child of childrenOf(snapshots, id)) ids.push(...descendantIds(snapshots, child.id));
  return ids;
}

export function rallyTreeError(snapshots: Snapshot[]): string | null {
  if (snapshots.length === 0) return "A tactic needs at least one rally";
  const ids = new Set<string>();
  for (const snapshot of snapshots) {
    if (ids.has(snapshot.id)) return "Each rally must have its own id";
    ids.add(snapshot.id);
  }
  if (snapshots.filter((item) => item.parentId === null).length !== 1) {
    return "A tactic needs one opening rally";
  }
  for (const snapshot of snapshots) {
    if (snapshot.parentId === null) continue;
    if (!ids.has(snapshot.parentId)) return "A next rally must follow a rally in this tactic";
    const siblings = childrenOf(snapshots, snapshot.parentId);
    if (siblings.filter((item) => item.kind === "follow").length > 1) {
      return "A rally can only have one follow-on rally";
    }
    if (siblings.filter((item) => item.kind !== "follow").length > MAX_OPTIONS) {
      return "A rally can lead to at most 3 options";
    }
    const seen = new Set<string>();
    let cursor: string | null = snapshot.parentId;
    while (cursor) {
      if (cursor === snapshot.id || seen.has(cursor)) return "Rally options cannot loop";
      seen.add(cursor);
      const parent = snapshots.find((item) => item.id === cursor);
      cursor = parent?.parentId ?? null;
    }
  }
  return null;
}

export function copySnapshot(
  source: Snapshot,
  link?: { parentId: string; kind: BranchKind },
): Snapshot {
  return {
    id: crypto.randomUUID(),
    parentId: link?.parentId ?? source.id,
    kind: link?.kind ?? "option",
    players: source.players.map((player) => ({ ...player })),
    shot: {
      hitterId: source.shot.hitterId,
      type: source.shot.type,
      target: { ...source.shot.target },
    },
    coverAreas: (source.coverAreas ?? []).map((area) => ({ ...area, id: crypto.randomUUID() })),
  };
}

export function snapshotError(format: Format, snapshot: Snapshot): string | null {
  const expected = slotsFor(format);
  const ids = snapshot.players.map((player) => player.id);
  if (ids.length !== expected.length || new Set(ids).size !== expected.length) {
    return "Players do not match the court format";
  }
  for (const slot of expected) {
    if (!ids.includes(slot)) return "Players do not match the court format";
  }
  for (const player of snapshot.players) {
    if (!contains(playerBounds(format, player.id), player)) {
      return "A player is outside their half of the court";
    }
  }
  if (!expected.includes(snapshot.shot.hitterId)) {
    return "The hitter is not on this court";
  }
  if (!contains(targetBounds(format, snapshot.shot.hitterId), snapshot.shot.target)) {
    return "The shuttlecock must land in the opposite half";
  }
  const coverAreas = snapshot.coverAreas ?? [];
  if (coverAreas.length > MAX_COVER_AREAS) return "A rally can hold 8 cover areas";
  const coverIds = new Set<string>();
  const court = courtPlayBounds(format);
  for (const cover of coverAreas) {
    if (coverIds.has(cover.id)) return "Each cover area must have its own id";
    coverIds.add(cover.id);
    if (cover.x1 - cover.x0 < COVER_MIN - 1e-4 || cover.y1 - cover.y0 < COVER_MIN - 1e-4) {
      return "Cover area is too small";
    }
    if (
      cover.x0 < court.x0 - 1e-3 ||
      cover.y0 < court.y0 - 1e-3 ||
      cover.x1 > court.x1 + 1e-3 ||
      cover.y1 > court.y1 + 1e-3
    ) {
      return "Cover area must stay on the court";
    }
  }
  return null;
}
