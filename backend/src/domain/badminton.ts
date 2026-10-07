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

export type Snapshot = {
  id: string;
  players: PlayerState[];
  shot: Shot;
};

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

export type Bounds = { x0: number; x1: number; y0: number; y1: number };

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
    players: defaultStances(format),
    shot: {
      hitterId,
      type: "lowServe",
      target: clampTarget(format, hitterId, rawTarget),
    },
  };
}

export function copySnapshot(source: Snapshot): Snapshot {
  return {
    id: crypto.randomUUID(),
    players: source.players.map((player) => ({ ...player })),
    shot: {
      hitterId: source.shot.hitterId,
      type: source.shot.type,
      target: { ...source.shot.target },
    },
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
  return null;
}
