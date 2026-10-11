import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import * as API from "marching-cubes-bourke-mc33";
import { WorldView, initializeWorld } from "../src/api/world.js";
import { disposeGPUContext, renderSize } from "../src/api/gpu.js";

test("feature entry points expose complete standalone APIs in Node", async () => {
  for (const [path, names] of Object.entries({
    core: ["createSurface", "createSphere", "extractCPU", "extractGPU"],
    camera: ["createCamera", "cameraFromThree", "attachFlyControls"],
    terrain: ["createTerrain", "TerrainRenderer", "Trees"],
    space: ["createSpace", "SpaceRenderer"],
    progressive: ["createProgressiveTerrain", "ProgressiveTerrainRenderer"],
  })) {
    const entry = await import(`marching-cubes-bourke-mc33/${path}`);
    for (const name of names) assert.equal(typeof entry[name], "function");
  }
});
test("surface convenience API returns usable normals and bounds for both algorithms", async () => {
  for (const algorithm of ["bourke", "mc33"]) {
    const size = { x: 9, y: 7, z: 6 },
      sample = (x, y, z) => x + y + z - 1;
    const mesh = await API.createSurface({ sample, size, algorithm });
    assert.deepEqual(
      mesh.positions,
      API.extractCPU(
        API.Coordinates.sampleField(size, sample),
        size,
        0,
        algorithm,
      ),
    );
    assert.ok(mesh.triangleCount > 0);
    assert.equal(mesh.normals.length, mesh.positions.length);
    for (let i = 0; i < mesh.normals.length; i += 3) {
      const length = Math.hypot(...mesh.normals.slice(i, i + 3));
      // Exact isosurface corners may emit collapsed triangles; their normal is zero.
      assert.ok(length === 0 || Math.abs(length - 1) < 1e-6);
    }
    assert.ok(
      mesh.bounds.min.every((v) => v >= 0) &&
        mesh.bounds.max.every((v) => v <= 1),
    );
  }
  const empty = await API.createSurface({
    sample: () => 1,
    normals: false,
    size: { x: 2, y: 2, z: 2 },
  });
  assert.equal(empty.normals, null);
  assert.equal(empty.triangleCount, 0);
  assert.deepEqual(empty.bounds, { min: [0, 0, 0], max: [0, 0, 0] });
  await assert.rejects(API.createSurface({}), /exactly one/);
  await assert.rejects(
    API.createSurface({ sample: () => 0, field: new Float32Array(8) }),
    /exactly one/,
  );
  await assert.rejects(
    API.createSurface({ sample: () => 0, backend: "other" }),
    /backend/,
  );
});
test("drop-in sphere API preserves arbitrary world size, shell groups and radial normals", async () => {
  for (const algorithm of ["bourke", "mc33"])
    for (const coordinates of ["cartesian", "spherical", "cube-sphere"]) {
      const mesh = await API.createSphere({
        center: [11, -7, 3],
        radius: 2,
        thickness: 0.25,
        surface: "both",
        coordinates,
        algorithm,
        size: { x: 17, y: 17, z: 17 },
      });
      assert.equal(mesh.groups.length, 2);
      assert.equal(mesh.groups[1].start, mesh.groups[0].count);
      for (const group of mesh.groups) {
        assert.ok(group.count > 0);
        for (let v = group.start; v < group.start + group.count; v++) {
          const at = v * 3,
            d = mesh.positions
              .slice(at, at + 3)
              .map((p, k) => p - mesh.fit.center[k]);
          assert.ok(Math.abs(Math.hypot(...d) - group.radius) < 2e-6);
          const dot = d.reduce(
            (sum, n, k) => sum + n * mesh.normals[at + k],
            0,
          );
          assert.equal(Math.sign(dot), group.side === "inner" ? -1 : 1);
        }
      }
    }
  const points = new Float32Array([1, 1, 1, -1, -1, 1, -1, 1, -1, 1, -1, -1]);
  const fitted = await API.createSphere({
    points,
    surface: "inner",
    thickness: 0.1,
  });
  assert.ok(Math.abs(fitted.fit.radius - Math.sqrt(3)) < 1e-6);
  assert.equal(fitted.groups[0].side, "inner");
});
test("engine-free camera and Three.js adapter match view projection and culling", () => {
  const three = new THREE.PerspectiveCamera(67, 1.6, 0.02, 5000);
  three.position.set(130, 220, -345);
  three.lookAt(125, 190, -400);
  three.updateMatrixWorld();
  const input = API.createCamera({
    position: [130, 220, -345],
    target: [125, 190, -400],
    fov: (67 * Math.PI) / 180,
    near: 0.02,
    far: 5000,
    aspect: 1.6,
    height: 900,
  });
  const adapter = API.cameraFromThree(three, { height: 900 });
  for (let i = 0; i < 16; i++)
    assert.ok(
      Math.abs(input.viewProjection[i] - adapter.viewProjection[i]) < 1e-9,
    );
  const frustum = new THREE.Frustum().setFromProjectionMatrix(
    new THREE.Matrix4().fromArray(input.viewProjection),
  );
  for (let i = 0; i < 120; i++) {
    const point = [Math.sin(i) * 1000, Math.cos(i * 3) * 300, -i * 50];
    const actual = input.planes.every(
      (p) => p[0] * point[0] + p[1] * point[1] + p[2] * point[2] + p[3] >= 0,
    );
    assert.equal(actual, frustum.containsPoint(new THREE.Vector3(...point)));
  }
  three.zoom = 1.7;
  three.setViewOffset(1600, 1000, 100, 50, 800, 500);
  three.updateProjectionMatrix();
  const zoomed = API.cameraFromThree(three, { height: 500 });
  assert.ok(zoomed.pixelScale > adapter.pixelScale * 0.5);
  const p = three.projectionMatrix.elements;
  zoomed.skyForward.forEach((v, i) =>
    assert.ok(
      Math.abs(
        v -
          (zoomed.forward[i] +
            (zoomed.right[i] * p[8]) / p[0] +
            (zoomed.up[i] * p[9]) / p[5]),
      ) < 1e-12,
    ),
  );
  assert.deepEqual(
    zoomed.viewProjection,
    Float64Array.from(
      new THREE.Matrix4().multiplyMatrices(
        three.projectionMatrix,
        three.matrixWorldInverse,
      ).elements,
    ),
  );
  assert.throws(() => API.createCamera({ target: [0, 200, 450] }), /direction/);
  assert.throws(() => API.createCamera({ near: 10, far: 1 }), /near/);
});
test("space camera-relative projection preserves world positions and frustum classification", () => {
  const camera = API.createCamera({
    position: [1e6, 200, -1e6],
    target: [1e6 + 1, 199, -1e6 - 5],
    far: 10000,
  });
  const relative = API.relativeCamera(camera),
    world = [1e6 + 5, 180, -1e6 - 100],
    local = world.map((v, i) => v - camera.position[i]);
  const project = (m, p) =>
    [0, 1, 2, 3].map(
      (r) => m[r] * p[0] + m[4 + r] * p[1] + m[8 + r] * p[2] + m[12 + r],
    );
  const a = project(camera.viewProjection, world),
    b = project(relative.viewProjection, local);
  a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-8));
  assert.equal(
    camera.planes.every(
      (p) => p.slice(0, 3).reduce((s, v, i) => s + v * world[i], p[3]) >= 0,
    ),
    relative.planes.every(
      (p) => p.slice(0, 3).reduce((s, v, i) => s + v * local[i], p[3]) >= 0,
    ),
  );
});
function fakeRenderer() {
  return {
    canvas: { width: 640, height: 400 },
    settings: { pixelError: 2 },
    vegetation: { enabled: true, distance: 1400 },
    stats: {},
    errors: [],
    resize() {},
    configure(s) {
      Object.assign(this.settings, s);
    },
    render(input, planes, now, draw) {
      return { input, planes, now, draw };
    },
    dispose() {
      this.disposals = (this.disposals || 0) + 1;
    },
  };
}
test("world API routes settings, far projection, world planes and cleanup consistently", () => {
  const backend = fakeRenderer(),
    view = new WorldView("terrain", backend);
  view.configure({
    pixelError: 3,
    trees: { enabled: false },
    algorithm: "bourke",
    wireframe: true,
    renderDistance: 4096,
  });
  assert.equal(backend.settings.pixelError, 3);
  assert.equal(backend.vegetation.enabled, false);
  assert.equal(backend.algorithm, "bourke");
  const input = {
    position: [10, 200, 300],
    target: [10, 190, 0],
    far: 1024,
    near: 0.1,
  };
  const result = view.render(input, { now: 100 });
  assert.equal(result.input.far, 4096);
  assert.equal(result.draw.wireframe, true);
  assert.deepEqual(
    result.input.viewProjection,
    Array.from(
      API.createCamera({ ...input, aspect: 1.6, height: 400, far: 4096 })
        .viewProjection,
    ),
  );
  assert.throws(() => view.configure({ typo: 1 }), /Unknown/);
  assert.throws(() => view.configure({ constructor: 3 }), /Unknown/);
  assert.throws(() => view.configure({ trees: { distance: -1 } }), /trees/);
  assert.throws(() => view.configure({ pixelError: NaN }), /pixelError/);
  const snapshot = view.settings;
  snapshot.trees.enabled = true;
  assert.equal(view.settings.trees.enabled, false);
  const space = new WorldView("space", fakeRenderer()),
    plane = [0, 0, 1, 10];
  assert.deepEqual(space.render(input, { planes: [plane] }).planes, [
    [0, 0, 1, 310],
  ]);
  view.dispose();
  view.dispose();
  assert.equal(backend.disposals, 1);
  assert.throws(() => view.render(input), /disposed/);
});
test("renderer context cleanup never destroys a caller-owned device", () => {
  for (const ownsDevice of [false, true]) {
    let destroyed = 0,
      unconfigured = 0,
      removed = 0;
    disposeGPUContext({
      ownsDevice,
      device: {
        destroy() {
          destroyed++;
        },
        removeEventListener() {
          removed++;
        },
      },
      onGPUError() {},
      context: {
        unconfigure() {
          unconfigured++;
        },
      },
    });
    assert.equal(destroyed, Number(ownsDevice));
    assert.equal(unconfigured, 1);
    assert.equal(removed, 1);
  }
  assert.deepEqual(renderSize({ width: 500, height: 300 }, { pixelRatio: 2 }), {
    ratio: 2,
    width: 500,
    height: 300,
  });
  assert.deepEqual(
    renderSize(
      { width: 1, height: 1, clientWidth: 500, clientHeight: 300 },
      { pixelRatio: 2 },
    ),
    { ratio: 2, width: 1000, height: 600 },
  );
});

test("factory failures clean up partially initialized renderers", async () => {
  let disposed = 0,
    initialized = 0;
  class FailedRenderer {
    async initialize() {
      initialized++;
      throw new Error("Initialization failed");
    }
    dispose() {
      disposed++;
    }
  }
  await assert.rejects(
    initializeWorld(
      "terrain",
      FailedRenderer,
      { getContext() {} },
      { settings: { infinite: true } },
    ),
    /Initialization failed/,
  );
  assert.equal(initialized, 1);
  assert.equal(disposed, 1);
  await assert.rejects(
    initializeWorld(
      "terrain",
      FailedRenderer,
      { getContext() {} },
      { settings: { misspelled: true } },
    ),
    /Unknown/,
  );
  assert.equal(initialized, 1);
  assert.equal(disposed, 1);
});
