import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createInitialSnapshot, defaultStances, shotProfile } from "./badminton.js";
import { distanceToChord, previousPlayers, rallyFrame, shuttlePoint } from "./playback.js";

test("a rally starts at the previous positions and finishes on the snapshot", () => {
  const current = createInitialSnapshot("singles", crypto.randomUUID());
  current.players = [
    { id: "near", x: 0.3, y: 0.2 },
    { id: "far", x: 0.62, y: 0.78 },
  ];
  current.shot = { hitterId: "near", type: "smash", target: { x: 0.7, y: 0.72 } };
  const previous = defaultStances("singles");
  const start = rallyFrame({ previous, current, t: 0 });
  const end = rallyFrame({ previous, current, t: 1 });

  assert.deepEqual(start.players, previous);
  assert.deepEqual(end.players, current.players);
  assert.deepEqual(start.shuttle, { x: previous[0].x, y: previous[0].y });
  assert.deepEqual(end.shuttle, current.shot.target);
});

test("the first rally leaves the default stance and later rallies leave the previous snapshot", () => {
  const first = createInitialSnapshot("doubles", crypto.randomUUID());
  const second = createInitialSnapshot("doubles", crypto.randomUUID());
  second.players = second.players.map((player) => ({ ...player, x: player.x + 0.05 }));
  assert.deepEqual(previousPlayers("doubles", [first], 0), defaultStances("doubles"));
  assert.equal(previousPlayers("doubles", [first, second], 1), first.players);
});

test("a clear bows farther off the straight line than a smash", () => {
  const from = { x: 0.5, y: 0.3 };
  const to = { x: 0.5, y: 0.75 };
  const smash = shuttlePoint(from, to, shotProfile("smash").arc, 0.5);
  const clear = shuttlePoint(from, to, shotProfile("clear").arc, 0.5);
  const smashDistance = distanceToChord(smash, from, to);
  const clearDistance = distanceToChord(clear, from, to);
  assert.ok(clearDistance > smashDistance);
  assert.ok(smashDistance < 0.02);
  assert.deepEqual(shuttlePoint(from, to, 0, 0), from);
  assert.deepEqual(shuttlePoint(from, to, 0.2, 1), to);
});
