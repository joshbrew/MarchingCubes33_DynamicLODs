import test from "node:test";
import assert from "node:assert/strict";
import { createCamera } from "../src/api/camera.js";
import { guardPlanes, turnedSince } from "../src/api/visibility.js";

test("visibility overlap leaves the depth cutoff intact and detects abrupt turns", () => {
  const camera = createCamera({ forward: [0, 0, -1], far: 2000 });
  const overlap = guardPlanes(camera.planes, 2000);
  assert.deepEqual(overlap.slice(4), camera.planes.slice(4));
  assert.ok(
    overlap.slice(0, 4).every((p, i) => p[3] === camera.planes[i][3] + 240),
  );
  assert.equal(turnedSince(camera.planes, camera.planes), false);
  assert.equal(
    turnedSince(createCamera({ forward: [0.01, 0, -1] }).planes, camera.planes),
    false,
  );
  assert.equal(
    turnedSince(createCamera({ forward: [0, 0, 1] }).planes, camera.planes),
    true,
  );
  assert.equal(turnedSince([], camera.planes), true);
  assert.equal(turnedSince([], []), false);
});
