import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  COURT_MARGIN,
  NET_Y,
  SINGLES_LEFT,
  SINGLES_RIGHT,
  clampPlayer,
  clampTarget,
  courtSegments,
  createInitialSnapshot,
  defaultStances,
  shotProfile,
  slotsFor,
  snapshotError,
} from "./badminton.js";

test("singles sidelines sit inside the doubles width", () => {
  assert.ok(Math.abs(SINGLES_LEFT - 0.0754) < 0.001);
  assert.ok(Math.abs(SINGLES_RIGHT - 0.9246) < 0.001);
});

test("players stay on their own half and inside the active sidelines", () => {
  const near = clampPlayer("singles", "near", { x: 0.01, y: 0.9 });
  assert.equal(near.y, NET_Y - COURT_MARGIN);
  assert.equal(near.x, SINGLES_LEFT + COURT_MARGIN);

  const far = clampPlayer("doubles", "farLeft", { x: 0.04, y: 0.1 });
  assert.equal(far.y, NET_Y + COURT_MARGIN);
  assert.equal(far.x, 0.04);

  const alley = clampPlayer("singles", "far", { x: 0.04, y: 0.7 });
  assert.equal(alley.x, SINGLES_LEFT + COURT_MARGIN);
});

test("the shuttlecock lands in the opposite half", () => {
  const target = clampTarget("singles", "near", { x: 0.2, y: 0.2 });
  assert.equal(target.y, NET_Y + COURT_MARGIN);
  assert.ok(target.x >= SINGLES_LEFT + COURT_MARGIN);
});

test("default stances and the seeded rally match the format", () => {
  assert.deepEqual(defaultStances("singles").map((player) => player.id), slotsFor("singles"));
  assert.deepEqual(defaultStances("doubles").map((player) => player.id), slotsFor("doubles"));
  const singles = createInitialSnapshot("singles", crypto.randomUUID());
  const doubles = createInitialSnapshot("doubles", crypto.randomUUID());
  assert.equal(snapshotError("singles", singles), null);
  assert.equal(snapshotError("doubles", doubles), null);
  assert.equal(singles.shot.type, "lowServe");
  assert.equal(doubles.players.length, 4);
});

test("a player cannot be saved across the net", () => {
  const snapshot = createInitialSnapshot("singles", crypto.randomUUID());
  snapshot.players[0] = { id: "near", x: 0.5, y: 0.8 };
  assert.equal(snapshotError("singles", snapshot), "A player is outside their half of the court");
});

test("shot profiles give clears and high serves a taller, slower arc than a smash", () => {
  const smash = shotProfile("smash");
  const drive = shotProfile("drive");
  const clear = shotProfile("clear");
  const lift = shotProfile("lift");
  const highServe = shotProfile("highServe");
  const drop = shotProfile("drop");
  const net = shotProfile("net");
  assert.ok(smash.arc < drive.arc);
  assert.ok(smash.durationMs < clear.durationMs);
  assert.ok(clear.arc > drop.arc);
  assert.ok(lift.arc > net.arc);
  assert.ok(highServe.arc > shotProfile("lowServe").arc);
  assert.equal(courtSegments("singles").some((line) => line.kind === "net"), true);
  assert.equal(courtSegments("singles").filter((line) => line.kind === "boundary").length > 0, true);
});
