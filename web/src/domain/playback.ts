import {
  defaultStances,
  shotProfile,
  type Format,
  type PlayerState,
  type Point,
  type Snapshot,
} from "./badminton";

export function smoothstep(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

export function shuttleControl(from: Point, to: Point, arc: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  return {
    x: (from.x + to.x) / 2 + (-dy / len) * arc,
    y: (from.y + to.y) / 2 + (dx / len) * arc,
  };
}

export function quadraticBezier(p0: Point, p1: Point, p2: Point, t: number): Point {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

export function shuttlePoint(from: Point, to: Point, arc: number, t: number): Point {
  return quadraticBezier(from, shuttleControl(from, to, arc), to, t);
}

export function previousPlayers(
  format: Format,
  snapshots: Snapshot[],
  index: number,
): PlayerState[] {
  if (index <= 0) return defaultStances(format);
  return snapshots[index - 1]?.players ?? defaultStances(format);
}

export function rallyFrame(args: {
  previous: PlayerState[];
  current: Snapshot;
  t: number;
}): { players: PlayerState[]; shuttle: Point } {
  const eased = smoothstep(args.t);
  const players = args.current.players.map((player) => {
    const start = args.previous.find((item) => item.id === player.id) ?? player;
    return { id: player.id, ...lerpPoint(start, player, eased) };
  });
  const hitter = args.previous.find((item) => item.id === args.current.shot.hitterId) ??
    args.current.players.find((item) => item.id === args.current.shot.hitterId);
  if (!hitter) throw new Error("Hitter is missing from the rally");
  const profile = shotProfile(args.current.shot.type);
  return {
    players,
    shuttle: shuttlePoint(hitter, args.current.shot.target, profile.arc, eased),
  };
}

export function distanceToChord(point: Point, start: Point, end: Point): number {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  const cross = Math.abs(dx * (start.y - point.y) - dy * (start.x - point.x));
  return cross / length;
}
