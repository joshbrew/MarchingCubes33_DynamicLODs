import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import * as esm from "marching-cubes-bourke-mc33";

test("ESM, Node CommonJS and plain browser builds expose the same working API", async () => {
  const cjs = createRequire(import.meta.url)("marching-cubes-bourke-mc33");
  const context = vm.createContext({ URL, Blob });
  vm.runInContext(
    await readFile(new URL("../dist/index.js", import.meta.url), "utf8"),
    context,
  );
  const browser = context.MarchingCubes;
  assert.deepEqual(Object.keys(cjs).sort(), Object.keys(esm).sort());
  assert.deepEqual(Object.keys(browser).sort(), Object.keys(esm).sort());
  for (const api of [esm, cjs]) {
    assert.equal(typeof api.SpaceRenderer, "function");
    assert.equal(typeof api.TerrainRenderer, "function");
    const size = { x: 4, y: 4, z: 4 };
    const field = api.Coordinates.sampleField(size, (x, y, z) => x + y + z - 1);
    for (const algorithm of ["bourke", "mc33"]) {
      const positions = api.extractCPU(field, size, 0, algorithm);
      assert.ok(positions.length > 0 && positions.every(Number.isFinite));
      assert.deepEqual(positions, esm.extractCPU(field, size, 0, algorithm));
      assert.match(api.createShader(algorithm), /@compute/);
    }
  }
  // The regular script also works without Node globals or a DOM. Its samples
  // must be created in the same realm as its Float32Array validation.
  assert.ok(
    vm.runInContext(
      `(() => {
    const size = { x: 4, y: 4, z: 4 };
    const field = MarchingCubes.Coordinates.sampleField(size, (x,y,z) => x+y+z-1);
    return MarchingCubes.extractCPU(field, size, 0, 'mc33').length;
  })()`,
      context,
    ) > 0,
  );
});
