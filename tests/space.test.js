import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import {
  SpaceWorld as World,
  SpaceGeometry as Geometry,
} from "../dist/index.esm.js";

test("space sectors regenerate the same 3D objects, including far and negative coordinates", () => {
  for (const cell of [
    [0, 0, 0],
    [-1, 0, -1],
    [14, -7, 28],
    [100000, -130000, 20000],
  ]) {
    const a = World.chunk(...cell),
      b = World.chunk(...cell);
    assert.deepEqual(a, b);
    for (const body of a) {
      assert.ok(body.radius > 0 && body.radius <= World.maxRadius);
      assert.ok(Math.abs(Math.hypot(...body.rotation) - 1) < 1e-8);
      assert.equal(body.position.length, 3);
    }
  }
  assert.notDeepEqual(
    World.chunk(4, 7, 0),
    World.chunk(4, 8, 0),
    "vertical sectors contain different bodies",
  );
  assert.ok(World.chunk(-1, 0, -1).some((body) => body.id === "planet"));
});

test("space selection covers truly 3D travel and respects its sector budget", () => {
  const planes = [[1, 0, 0, 0]],
    a = World.sectors([1000, 1000, 1000], planes, 4000, 1000);
  assert.ok(
    a.cells.some((c) => c.cell[1] < 0) && a.cells.some((c) => c.cell[1] > 0),
  );
  const distant = World.sectors([1000, 97000, -64000], [], 4000, 1000);
  assert.ok(
    distant.cells.every(
      (c) => Math.abs((c.cell[1] + 0.5) * World.cellSize - 97000) < 9000,
    ),
  );
  const limited = World.sectors([0, 0, 0], [], 32000, 20);
  assert.equal(limited.cells.length, 20);
  assert.ok(limited.limited);
  assert.ok(World.visibleSphere([1, 2, -20], 2, [[0, 0, -1, 0]]));
  assert.ok(!World.visibleSphere([1, 2, 20], 2, [[0, 0, -1, 0]]));
});

test("space sector culling preserves conservative bounds across FOVs, rotation and far travel", () => {
  const planesFor = (fov, target) => {
    const camera = new THREE.PerspectiveCamera(fov, 16 / 9, 1, 32000);
    camera.lookAt(new THREE.Vector3(...target));
    camera.updateMatrixWorld();
    const vp = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse,
    );
    return new THREE.Frustum()
      .setFromProjectionMatrix(vp)
      .planes.map((p) => [p.normal.x, p.normal.y, p.normal.z, p.constant]);
  };
  // A simple exhaustive reference guards against dropping boundary sectors
  // while the production scan avoids allocating cells that it will reject.
  const reference = (position, planes, distance) => {
    const origin = position.map((v) => Math.floor(v / World.cellSize));
    const range = Math.ceil((distance + World.maxRadius) / World.cellSize);
    const bound = (Math.sqrt(3) * World.cellSize) / 2 + World.maxRadius;
    const cells = [];
    for (let z = -range; z <= range; z++)
      for (let y = -range; y <= range; y++)
        for (let x = -range; x <= range; x++) {
          const cell = [origin[0] + x, origin[1] + y, origin[2] + z];
          const relative = cell.map(
            (v, axis) => (v + 0.5) * World.cellSize - position[axis],
          );
          const near = Math.hypot(
            ...relative.map((v) =>
              Math.max(0, Math.abs(v) - World.cellSize / 2),
            ),
          );
          if (
            near <= distance + World.maxRadius &&
            World.visibleSphere(relative, bound, planes)
          )
            cells.push({ key: cell.join(":"), cell, distance: near });
        }
    return cells.sort(
      (a, b) => a.distance - b.distance || a.key.localeCompare(b.key),
    );
  };
  for (const [position, target] of [
    [
      [0, 180, 1500],
      [0, 0, -1],
    ],
    [
      [81000, -55000, 99000],
      [0.8, -0.3, 0.5],
    ],
  ]) {
    for (const fov of [30, 90]) {
      const planes = planesFor(fov, target);
      assert.deepEqual(
        World.sectors(position, planes, 32000, 100000).cells,
        reference(position, planes, 32000),
      );
    }
  }
  const narrow = planesFor(30, [0, 0, -1]),
    wide = planesFor(90, [0, 0, -1]);
  assert.ok(
    World.sectors([0, 180, 1500], narrow, 32000, 100000).requested <
      World.sectors([0, 180, 1500], wide, 32000, 100000).requested,
  );
  assert.ok(!World.visibleSphere([2000, 0, -2000], 100, narrow));
  assert.ok(World.visibleSphere([2000, 0, -2000], 100, wide));
  assert.ok(
    !World.visibleSphere([0, 0, 2000], 100, wide),
    "bodies behind the camera are culled",
  );
});

test("body LOD responds to distance, projection, quality and pure point-cloud mode", () => {
  const body = { position: [0, 0, 0], radius: 200 },
    near = World.chooseLOD(body, [0, 0, 400], 600, {
      mode: "hybrid",
      quality: 3,
    }),
    far = World.chooseLOD(body, [0, 0, 8000], 600, {
      mode: "hybrid",
      quality: 3,
    });
  assert.equal(near.representation, "mesh");
  assert.equal(far.representation, "points");
  const coarse = World.chooseLOD(body, [0, 0, 3000], 600, {
      mode: "points",
      quality: 6,
    }),
    dense = World.chooseLOD(body, [0, 0, 3000], 600, {
      mode: "points",
      quality: 1,
    });
  assert.ok(dense.level < coarse.level);
  const low = World.chooseLOD(body, [0, 0, 1000], 300, {
      mode: "mesh",
      quality: 6,
    }),
    high = World.chooseLOD(body, [0, 0, 1000], 1200, {
      mode: "mesh",
      quality: 1,
    });
  assert.ok(high.level < low.level);
  assert.equal(
    World.chooseLOD(body, [0, 0, 20000], 600, { mode: "points", uniform: true })
      .level,
    0,
  );
});

test("asteroids, ringed planets and cave-bearing islands produce closed volumetric meshes for both algorithms", () => {
  for (const algorithm of ["bourke", "mc33"])
    for (const kind of [0, 1, 2]) {
      const mesh = Geometry.build(kind, 0, World.meshLevels - 1, algorithm, {
          caves: true,
        }),
        edges = new Map();
      assert.ok(mesh.count > 100);
      assert.equal(mesh.vertices.length, mesh.count * 8);
      for (let i = 0; i < mesh.count; i += 3) {
        const keys = [];
        for (let v = 0; v < 3; v++) {
          const at = (i + v) * 8,
            p = Array.from(mesh.vertices.slice(at, at + 3)),
            n = Array.from(mesh.vertices.slice(at + 4, at + 7));
          assert.ok(
            p.every(Number.isFinite) && Math.max(...p.map(Math.abs)) < 1,
          );
          assert.ok(Math.abs(Math.hypot(...n) - 1) < 1e-5);
          keys.push(p.map((value) => Math.round(value * 1e5)).join(","));
        }
        for (let e = 0; e < 3; e++) {
          const key = [keys[e], keys[(e + 1) % 3]].sort().join("|");
          if (keys[e] !== keys[(e + 1) % 3])
            edges.set(key, (edges.get(key) || 0) + 1);
        }
      }
      for (const count of edges.values())
        assert.equal(
          count,
          2,
          `${algorithm} kind ${kind}: closed surface edge`,
        );
    }
  assert.ok(
    World.field(2, 0, 0.45, -0.1, 0.04, { caves: true }) > 0,
    "carved island cavity is empty space",
  );
  assert.ok(
    World.field(2, 0, 0.45, -0.1, 0.04) < 0,
    "default island keeps the shoulder solid",
  );
  assert.ok(
    World.field(2, 0, 0, -0.4, 0) < 0,
    "island extends below its upper surface",
  );
});

test("point clouds use nested deterministic surface samples of the actual volumetric mesh", () => {
  for (const kind of [0, 1, 2]) {
    const mesh = Geometry.build(kind, 1, 1),
      a = Geometry.pointCloud(mesh.vertices, 8192, 123),
      b = Geometry.pointCloud(mesh.vertices, 8192, 123);
    assert.deepEqual(a, b);
    assert.ok(a.count > 256);
    const source = new Set();
    for (let i = 0; i < mesh.vertices.length; i += 8)
      source.add(Array.from(mesh.vertices.slice(i, i + 3)).join(","));
    for (let i = 0; i < a.count; i++)
      assert.ok(
        source.has(Array.from(a.vertices.slice(i * 8, i * 8 + 3)).join(",")),
      );
    const small = Geometry.pointCloud(mesh.vertices, 32, 123);
    assert.deepEqual(small.vertices, a.vertices.slice(0, 32 * 8));
  }
});

test("island creases and cavities retain consistent outward winding at every detail level", () => {
  for (const caves of [false, true])
    for (const algorithm of ["bourke", "mc33"])
      for (let variant = 0; variant < 4; variant++)
        for (let level = 0; level < World.meshLevels; level++) {
          const mesh = Geometry.build(2, variant, level, algorithm, { caves }),
            edges = new Map();
          let volume = 0;
          for (let i = 0; i < mesh.count; i += 3) {
            const tri = [0, 1, 2].map((v) =>
                Array.from(mesh.vertices.slice((i + v) * 8, (i + v) * 8 + 3)),
              ),
              keys = tri.map((p) =>
                p.map((x) => Math.round(x * 1e7)).join(","),
              );
            const [a, b, c] = tri;
            volume +=
              a[0] * (b[1] * c[2] - b[2] * c[1]) +
              a[1] * (b[2] * c[0] - b[0] * c[2]) +
              a[2] * (b[0] * c[1] - b[1] * c[0]);
            for (let v = 0; v < 3; v++) {
              const p = keys[v],
                q = keys[(v + 1) % 3];
              if (p === q) continue;
              const key = [p, q].sort().join("|"),
                edge = edges.get(key) || [0, 0];
              edge[0]++;
              edge[1] += p < q ? 1 : -1;
              edges.set(key, edge);
            }
          }
          for (const [count, direction] of edges.values()) {
            assert.equal(
              count,
              2,
              `${algorithm}/${variant}/${level} closed edges`,
            );
            assert.equal(
              direction,
              0,
              `${algorithm}/${variant}/${level} opposite directed shared edges`,
            );
          }
          assert.ok(volume > 0, "closed island faces outward");
        }
});

test("space has eight mesh resolutions with distance and near-detail controls", () => {
  assert.equal(World.meshLevels, 8);
  for (const divisions of World.meshDivisions) {
    assert.equal(new Set(divisions).size, 8);
    for (let i = 1; i < divisions.length; i++)
      assert.ok(divisions[i] < divisions[i - 1]);
  }
  const body = { kind: 0, position: [0, 0, 0], radius: 100 },
    settings = { mode: "mesh", quality: 3, lodDistance: 4000, nearRadius: 0 };
  const levels = [200, 700, 1500, 3000, 6000, 12000, 20000, 28000].map(
    (distance) =>
      World.chooseLOD(body, [0, 0, distance + 100], 10, settings).level,
  );
  assert.deepEqual(
    levels,
    [0, 1, 2, 3, 4, 5, 6, 7],
    "all eight distance bands are reachable",
  );
  assert.ok(
    World.chooseLOD(body, [0, 0, 3100], 10, { ...settings, lodDistance: 16000 })
      .level < World.chooseLOD(body, [0, 0, 3100], 10, settings).level,
  );
  assert.equal(
    World.chooseLOD(body, [0, 0, 1600], 10, { ...settings, nearRadius: 2000 })
      .level,
    0,
  );
  assert.equal(
    World.chooseLOD(body, [0, 0, 6000], 10, {}).representation,
    "mesh",
    "default display remains solid",
  );
  for (const algorithm of ["bourke", "mc33"]) {
    let last = Infinity;
    for (let level = 0; level < World.meshLevels; level++) {
      const mesh = Geometry.build(0, 0, level, algorithm);
      assert.ok(mesh.count < last, "coarser meshes contain fewer triangles");
      last = mesh.count;
    }
  }
});

test("distant planet proxies preserve closed outward spheres and rings in every variant", () => {
  for (let variant = 0; variant < 4; variant++)
    for (let level = 5; level < 8; level++) {
      const mesh = Geometry.build(1, variant, level),
        edges = new Map(),
        neighbors = new Map(),
        volumes = new Map();
      const key = (p) => p.map((x) => Math.round(x * 1e6)).join(",");
      for (let i = 0; i < mesh.count; i += 3) {
        const tri = [0, 1, 2].map((v) =>
            Array.from(mesh.vertices.slice((i + v) * 8, (i + v) * 8 + 3)),
          ),
          keys = tri.map(key),
          [a, b, c] = tri;
        const volume =
          a[0] * (b[1] * c[2] - b[2] * c[1]) +
          a[1] * (b[2] * c[0] - b[0] * c[2]) +
          a[2] * (b[0] * c[1] - b[1] * c[0]);
        volumes.set(keys[0], (volumes.get(keys[0]) || 0) + volume);
        for (let v = 0; v < 3; v++) {
          assert.ok(
            Math.abs(World.field(1, variant, ...tri[v])) < 0.002,
            "proxy vertices fit the original density surface",
          );
          const p = keys[v],
            q = keys[(v + 1) % 3],
            id = [p, q].sort().join("|"),
            edge = edges.get(id) || [0, 0];
          edge[0]++;
          edge[1] += p < q ? 1 : -1;
          edges.set(id, edge);
          if (!neighbors.has(p)) neighbors.set(p, new Set());
          neighbors.get(p).add(q);
        }
      }
      for (const [count, direction] of edges.values()) {
        assert.equal(count, 2, "closed proxy edge");
        assert.equal(direction, 0, "consistent winding");
      }
      const visited = new Set();
      let components = 0;
      for (const start of neighbors.keys())
        if (!visited.has(start)) {
          components++;
          let volume = 0;
          const queue = [start];
          visited.add(start);
          while (queue.length) {
            const p = queue.pop();
            volume += volumes.get(p) || 0;
            for (const q of neighbors.get(p))
              if (!visited.has(q)) {
                visited.add(q);
                queue.push(q);
              }
          }
          assert.ok(volume > 0, "each sphere/ring component faces outward");
        }
      assert.equal(
        components,
        variant % 2 === 0 ? 2 : 1,
        "ring remains a complete separate torus",
      );
      assert.ok(mesh.count / 3 <= 352, "far planet has bounded triangle cost");
    }
});

test("hybrid representation hysteresis holds steady across its handoff region", () => {
  const body = { kind: 0, position: [0, 0, 0], radius: 100 },
    position = (p) => [0, 0, 45 + (160 * 600) / p],
    settings = { mode: "hybrid", quality: 3, pointSize: 2 };
  let previous = World.chooseLOD(body, position(50), 600, settings);
  assert.equal(previous.representation, "mesh");
  for (const p of [37, 40, 33, 39, 31]) {
    previous = World.chooseLOD(body, position(p), 600, settings, previous);
    assert.equal(previous.representation, "mesh");
  }
  previous = World.chooseLOD(body, position(29), 600, settings, previous);
  assert.equal(previous.representation, "points");
  for (const p of [33, 40, 38, 41]) {
    previous = World.chooseLOD(body, position(p), 600, settings, previous);
    assert.equal(previous.representation, "points");
  }
  assert.equal(
    World.chooseLOD(body, position(43), 600, settings, previous).representation,
    "mesh",
  );
});
