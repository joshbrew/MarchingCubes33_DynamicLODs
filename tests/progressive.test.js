import test from "node:test";
import assert from "node:assert/strict";
import {
  ProgressiveTerrainLOD as LOD,
  ProgressiveTerrainField as Field,
  ProgressiveTerrainRenderer,
  TerrainField,
  TerrainSurface,
} from "../dist/index.esm.js";

function camera(clearance, x = 128.25, z = 96.25) {
  return {
    position: [x, Field.height(x, z) + clearance, z],
    height: 900,
    fov: Math.PI / 3,
    far: 2048,
  };
}
function checkBalance(leaves, plan) {
  for (const n of leaves.values())
    for (const [other] of LOD.neighbors(
      n,
      leaves,
      plan.rootSize,
      plan.maxLevel,
    ))
      if (other)
        assert.ok(
          Math.abs(n.level - other.level) <= 1,
          `2:1 adjacency ${n.key} / ${other.key}`,
        );
}
function area(leaves) {
  return [...leaves.values()].reduce((a, n) => a + n.size ** 2, 0);
}

test("progressive tiles reach centimetre spacing near the surface within a bounded budget", () => {
  const options = { maxNodes: 424 };
  const near = LOD.select(camera(0.75), [], options),
    far = LOD.select(camera(1200), [], options);
  assert.ok(near.nodes.size <= 424);
  assert.ok(near.leaves.size < near.nodes.size);
  assert.equal(
    Math.min(...[...near.leaves.values()].map((n) => n.size / 32)),
    0.03125,
  );
  assert.ok(Math.min(...[...far.leaves.values()].map((n) => n.size / 32)) >= 1);
  assert.equal(area(near.leaves), near.roots.length * 1024 ** 2);
  checkBalance(near.leaves, near);
  checkBalance(far.leaves, far);
});

test("every partial generation batch preserves parent coverage and 2:1 seams", () => {
  const plan = LOD.select(camera(0.75, -0.25, -128.25), [], { maxNodes: 320 });
  const ready = new Set(plan.roots.map((n) => n.key));
  const expectedArea = area(plan.roots);
  const requests = [...plan.nodes.values()]
    .filter((n) => n.level > 0)
    .sort((a, b) => a.level - b.level);
  for (let i = 0; i <= requests.length; i += 3) {
    for (const n of requests.slice(Math.max(0, i - 3), i)) ready.add(n.key);
    const cut = LOD.residentCut(plan, (id) => ready.has(id));
    assert.equal(
      area(cut),
      expectedArea,
      "full root coverage during refinement",
    );
    checkBalance(cut, plan);
    const values = [...cut.values()];
    for (let a = 0; a < values.length; a++)
      for (let b = a + 1; b < values.length; b++) {
        const p = values[a],
          q = values[b];
        assert.ok(
          p.ox + p.size <= q.ox ||
            q.ox + q.size <= p.ox ||
            p.oz + p.size <= q.oz ||
            q.oz + q.size <= p.oz,
          "resident cut has no overlapping parent/child",
        );
      }
  }
  const cut = LOD.residentCut(plan, () => true);
  assert.deepEqual([...cut.keys()].sort(), [...plan.leaves.keys()].sort());
});

test("negative-coordinate parent/child samples and mixed-resolution borders agree", () => {
  const p = LOD.tile(6, -3, -5),
    children = LOD.children(p),
    divs = 16;
  for (const n of children)
    for (let z = 0; z <= divs; z += 2)
      for (let x = 0; x <= divs; x += 2) {
        const wx = n.ox + (x * n.size) / divs,
          wz = n.oz + (z * n.size) / divs;
        const px = ((wx - p.ox) * divs) / p.size,
          pz = ((wz - p.oz) * divs) / p.size;
        assert.equal(
          Field.height(wx, wz),
          Field.height(
            p.ox + (px * p.size) / divs,
            p.oz + (pz * p.size) / divs,
          ),
        );
      }
  const plan = LOD.select(camera(0.75), [], { maxNodes: 300 });
  let seams = 0;
  for (const n of plan.leaves.values()) {
    const mask = LOD.seamMask(n, plan.leaves, plan.rootSize, plan.maxLevel);
    if (!mask) continue;
    seams++;
    const indices = TerrainSurface.buildIndices(divs, mask);
    const used = new Set(indices);
    for (const [other, side] of LOD.neighbors(
      n,
      plan.leaves,
      plan.rootSize,
      plan.maxLevel,
    )) {
      if (!other || other.level >= n.level) continue;
      for (let i = 1; i < divs; i += 2) {
        const id =
          side === 1
            ? i * (divs + 1)
            : side === 2
              ? i * (divs + 1) + divs
              : side === 4
                ? i
                : divs * (divs + 1) + i;
        assert.ok(!used.has(id), "odd fine border samples are omitted");
      }
    }
  }
  assert.ok(seams > 0);
});

test("microdetail is real displacement with an analytic gradient", () => {
  let displacement = 0;
  for (const [x, z] of [
    [128.23, 96.28],
    [-15.122, -3.187],
    [0.21, 0.41],
  ]) {
    const h = Field.heightGradient(x, z),
      eps = 1e-6;
    assert.ok(
      Math.abs(
        (Field.height(x + eps, z) - Field.height(x - eps, z)) / (2 * eps) -
          h[1],
      ) < 0.0001,
    );
    assert.ok(
      Math.abs(
        (Field.height(x, z + eps) - Field.height(x, z - eps)) / (2 * eps) -
          h[2],
      ) < 0.0001,
    );
    displacement = Math.max(
      displacement,
      Math.abs(h[0] - TerrainField.height(x, z)),
    );
  }
  assert.ok(displacement > 0.01, "extra octaves change the actual height");
});

test("allocation-free scalar heights preserve the gradient field's exact values", () => {
  for (const field of [TerrainField, Field])
    for (let i = 0; i < 100; i++) {
      const x = (i - 50) * 103.17 + 0.0125,
        z = (33 - i) * 41.31 - 0.0625;
      assert.equal(field.height(x, z), field.heightGradient(x, z)[0]);
    }
});

test("tile renderer rejects configurations that cannot represent the hierarchy", () => {
  for (const options of [
    { rootSize: 1000 },
    { minSize: 3 },
    { divs: 30 },
    { buildsPerFrame: 0 },
    { memoryMB: 1 },
  ])
    assert.throws(
      () => new ProgressiveTerrainRenderer(null, options),
      RangeError,
    );
});

test("tight tile bounds contain the noise surface and reject tiles outside the view", () => {
  for (const n of [
    LOD.tile(0, -1, 0),
    LOD.tile(6, -3, 5),
    LOD.tile(9, 64, -48),
  ]) {
    LOD.visible(n, [[0, 1, 0, 1000]]);
    for (let z = 0; z <= 8; z++)
      for (let x = 0; x <= 8; x++) {
        const h = Field.height(
          n.ox + (x * n.size) / 8,
          n.oz + (z * n.size) / 8,
        );
        assert.ok(h >= n.lo && h <= n.hi);
      }
    assert.ok(!LOD.visible(n, [[0, 1, 0, -n.hi - 1]]));
    assert.ok(LOD.visible(n, [[0, 1, 0, -n.lo]]));
  }
});

test("adaptive triangle grids preserve watertight borders across spatial and mesh LODs", () => {
  const view = camera(0.75),
    plan = LOD.select(view, [], { maxNodes: 424 });
  const meshes = LOD.meshLevels(
    plan.leaves,
    view,
    plan.rootSize,
    plan.maxLevel,
  );
  const edges = new Map(),
    templates = new Map();
  const loX = Math.min(...plan.roots.map((n) => n.ox)),
    hiX = Math.max(...plan.roots.map((n) => n.ox + n.size));
  const loZ = Math.min(...plan.roots.map((n) => n.oz)),
    hiZ = Math.max(...plan.roots.map((n) => n.oz + n.size));
  let triangles = 0,
    fullTriangles = 0;
  for (const n of plan.leaves.values()) {
    const { divs, mask } = meshes.get(n.key),
      row = divs + 1,
      key = `${divs}:${mask}`;
    if (!templates.has(key))
      templates.set(key, TerrainSurface.buildIndices(divs, mask));
    const indices = templates.get(key);
    triangles += indices.length / 3;
    fullTriangles += 64 * 64 * 2;
    for (const [other] of LOD.neighbors(
      n,
      plan.leaves,
      plan.rootSize,
      plan.maxLevel,
    ))
      if (other)
        assert.ok(
          Math.max(n.size / divs, other.size / meshes.get(other.key).divs) /
            Math.min(n.size / divs, other.size / meshes.get(other.key).divs) <=
            2,
        );
    for (let at = 0; at < indices.length; at += 3)
      for (let e = 0; e < 3; e++) {
        const a = indices[at + e],
          b = indices[at + ((e + 1) % 3)],
          ax = a % row,
          az = Math.floor(a / row),
          bx = b % row,
          bz = Math.floor(b / row);
        if (!(
          (ax === bx && (ax === 0 || ax === divs)) ||
          (az === bz && (az === 0 || az === divs))
        ))
          continue;
        const p = [n.ox + (ax * n.size) / divs, n.oz + (az * n.size) / divs],
          q = [n.ox + (bx * n.size) / divs, n.oz + (bz * n.size) / divs];
        const id = [p.join(","), q.join(",")].sort().join("|");
        const boundary =
          (p[0] === q[0] && (p[0] === loX || p[0] === hiX)) ||
          (p[1] === q[1] && (p[1] === loZ || p[1] === hiZ));
        if (!edges.has(id)) edges.set(id, { count: 0, boundary });
        edges.get(id).count++;
      }
  }
  for (const [id, { count, boundary }] of edges)
    assert.equal(count, boundary ? 1 : 2, `matching mesh border ${id}`);
  assert.ok(
    triangles < fullTriangles * 0.4,
    "adaptive meshes remove most unnecessary triangles",
  );
  assert.equal(
    Math.min(
      ...[...plan.leaves.values()].map((n) => n.size / meshes.get(n.key).divs),
    ),
    0.03125,
  );
});

test("turning the view does not change the generated detail neighborhood", () => {
  const view = camera(1.5),
    a = LOD.select(view, [[1, 0, 0, -view.position[0]]], { maxNodes: 424 }),
    b = LOD.select(view, [[-1, 0, 0, view.position[0]]], { maxNodes: 424 });
  assert.deepEqual([...a.nodes.keys()], [...b.nodes.keys()]);
});
