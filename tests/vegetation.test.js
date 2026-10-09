import test from "node:test";
import assert from "node:assert/strict";
import {
  TerrainVegetation as V,
  TerrainField as Field,
} from "../dist/index.esm.js";
test("streamed forests are deterministic, do not duplicate at boundaries, and reject water and steep slopes", () => {
  const ids = new Set();
  let total = 0;
  for (const x of [-32768, -128, 0, 128, 32768])
    for (const z of [-128, 0, 128]) {
      const tile = { ox: x, oz: z, size: 128 },
        a = V.trees(tile);
      assert.deepEqual(a, V.trees({ ...tile }));
      for (const tree of a) {
        const h = Field.heightGradient(tree.x, tree.z);
        assert.ok(h[0] >= -6 && h[0] <= 200 && Math.hypot(h[1], h[2]) <= 0.65);
        assert.ok(tree.u > 0 && tree.u < 1 && tree.v > 0 && tree.v < 1);
        assert.ok(!ids.has(tree.id));
        ids.add(tree.id);
        total++;
      }
    }
  assert.ok(total > 30);
});
test("tree roots attach to the actual triangles for all 16 stitch masks and both algorithms", () => {
  for (const algorithm of ["bourke", "mc33"])
    for (const divs of [2, 4, 8, 32, 64])
      for (let mask = 0; mask < 16; mask++)
        for (let i = 0; i < 30; i++) {
          const u = 0.001 + ((i * 17.71) % 1) * 0.998,
            v = 0.001 + ((i * 11.37) % 1) * 0.998,
            a = V.attachment(divs, mask, algorithm, u, v);
          assert.ok(a.weights.every((w) => w >= -1e-6));
          assert.ok(Math.abs(a.weights.reduce((s, w) => s + w, 0) - 1) < 1e-8);
          const x = a.ids.reduce(
              (s, id, k) => s + (id % (divs + 1)) * a.weights[k],
              0,
            ),
            z = a.ids.reduce(
              (s, id, k) => s + Math.floor(id / (divs + 1)) * a.weights[k],
              0,
            );
          assert.ok(
            Math.abs(x - u * divs) < 1e-7 && Math.abs(z - v * divs) < 1e-7,
            "barycentric root preserves world position",
          );
        }
});
test("tree LOD reduces triangles and responds to camera distance and resolution", () => {
  const meshes = [0, 1, 2].map((l) => V.geometry(l));
  assert.ok(
    meshes[0].length > meshes[1].length && meshes[1].length > meshes[2].length,
  );
  meshes.forEach((m) => assert.ok(Array.from(m).every(Number.isFinite)));
  const tree = { x: 0, y: 0, z: 0, height: 20 },
    camera = { height: 900, fov: Math.PI / 3 };
  assert.equal(V.level(tree, { ...camera, position: [0, 20, 100] }), 0);
  assert.equal(V.level(tree, { ...camera, position: [0, 20, 500] }), 1);
  assert.equal(V.level(tree, { ...camera, position: [0, 20, 1800] }), 2);
});
