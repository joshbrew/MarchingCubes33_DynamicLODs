import test from "node:test";
import assert from "node:assert/strict";
import { createCamera } from "../src/api/camera.js";
import {
  radius,
  surface,
  unit,
  studioElevationBounds,
  studioHeightScale,
  studioOceanLevel,
  dot,
} from "../src/planet/field.js";
import { cube, neighbors, project, selectPlanet } from "../src/planet/lod.js";
import { getPreset, PlanetPresets } from "../src/planet/presets.js";
import {
  moveOnSphere,
  surfaceFrame,
  surfaceRoute,
  viewAxes,
} from "../src/planet/navigation.js";
import {
  createStudioPlanetNoise,
  sampleStudioPlanetNoise,
} from "../src/noise/studio.js";
import { erodeSphericalTerrain } from "../src/noise/studio-erosion.js";
import { erodeRegionalWatersheds } from "../src/noise/studio-watersheds.js";

const side = 5;
const values = Float32Array.from({ length: side * side }, (_, i) => {
  const row = Math.floor(i / side);
  return (
    row +
    (row === 0 || row === side - 1 ? 0 : Math.sin(((i % side) * Math.PI) / 2))
  );
});
const map = { side, values, min: 0, max: 4, mean: 2 };
const sample = (dir) => surface(dir, radius, 29, "lakeshore", map);

test("the Studio surface keeps its raw shape across cube faces and adds fine relief", () => {
  const [low, high] = studioElevationBounds(map);
  const relief = (dir) =>
    sample(dir).height -
    sampleStudioPlanetNoise(map, dir) * studioHeightScale();
  for (let face = 0; face < 6; face++) {
    for (let u = -1; u <= 1; u += 0.25) {
      const dir = unit(cube(face, u, 1));
      const height = sample(dir).height;
      assert.ok(height >= low && height <= high);
      assert.deepEqual(sample(dir), sample(unit(cube(...project(dir)))));
      assert.ok(Math.abs(relief(dir)) < 561);
      assert.equal(sample(dir).land, sampleStudioPlanetNoise(map, dir));
    }
  }
  const profile = Array.from({ length: 81 }, (_, i) =>
    relief(unit([1, 0.4, 0.8 + (2 * i) / radius])),
  );
  const curvature = profile
    .slice(1, -1)
    .map((height, i) => profile[i] + profile[i + 2] - 2 * height);
  assert.ok(Math.min(...curvature) < -0.2 && Math.max(...curvature) > 0.2);
  const regional = Array.from({ length: 81 }, (_, i) =>
    relief(unit([1, 0.4, 0.8 + (500 * i) / radius])),
  );
  assert.ok(Math.max(...regional) - Math.min(...regional) > 160);
});

test("planet LOD stays bounded from orbit to 2 m spacing and stitches across faces", () => {
  const dir = unit([1, 1, 1]),
    divs = 16,
    maxTiles = 576;
  const planAt = (clearance) => {
    const camera = createCamera({
      position: dir.map((v) => v * (radius + sample(dir).height + clearance)),
      target: [0, 0, 0],
      height: 540,
      aspect: 16 / 9,
      far: clearance + 2 * radius + studioElevationBounds(map)[1],
    });
    return selectPlanet(
      { ...camera, clearance },
      { divs, maxTiles, elevationBounds: studioElevationBounds(map) },
    );
  };
  const orbit = planAt(radius * 2.15),
    near = planAt(3);
  assert.ok(orbit.visible.length > 0 && orbit.leaves.size < near.leaves.size);
  assert.ok(near.leaves.size <= maxTiles);
  assert.equal(Math.min(...near.visible.map((node) => node.spacing)), 2);
  assert.equal(
    new Set(Array.from(near.leaves.values(), (n) => n.face)).size,
    6,
  );
  const segments = new Map();
  let crossFaceStitches = 0;
  for (const tile of near.leaves.values()) {
    const adjacent = neighbors(tile, near.leaves);
    for (let edge = 0; edge < 4; edge++) {
      const other = adjacent[edge];
      const stitched = other && other.level < tile.level;
      if (stitched) {
        assert.equal(tile.level - other.level, 1);
        if (other.face !== tile.face) crossFaceStitches++;
      }
      const step = stitched ? 2 : 1;
      const point = (i) => {
        const t = (i * tile.size) / divs;
        return cube(
          tile.face,
          tile.u + (edge < 2 ? edge * tile.size : t),
          tile.v + (edge < 2 ? t : (edge - 2) * tile.size),
        ).join(",");
      };
      for (let i = 0; i < divs; i += step) {
        const segment = [point(i), point(i + step)].sort().join("|");
        segments.set(segment, (segments.get(segment) || 0) + 1);
      }
    }
  }
  assert.ok(crossFaceStitches > 0);
  assert.ok([...segments.values()].every((count) => count === 2));
});

test("the flyover sliders change distant detail and respect the patch cap", () => {
  const camera = {
    ...createCamera({
      position: [radius + 600, 0, 0],
      forward: [-0.14, 0, 1],
      up: [1, 0, 0],
      height: 900,
      aspect: 16 / 9,
      far: 550000,
    }),
    clearance: 600,
  };
  const plan = (lodScale, pixelError, maxTiles) =>
    selectPlanet(camera, {
      lodScale,
      pixelError,
      maxTiles,
      elevationBounds: [-9000, 9000],
      sampleRelief: (tile) => [0, tile.dir[2] > 0.02 ? 480 : 10],
    });
  const fineDistant = (selection) =>
    selection.visible.filter(
      ({ dir, spacing }) => dir[2] > 0.02 && dir[2] < 0.13 && spacing <= 64,
    ).length;
  const low = plan(0.25, 3, 1200);
  const high = plan(4, 3, 1200);
  assert.ok(fineDistant(high) > fineDistant(low) + 100);
  assert.ok(plan(4, 24, 1200).leaves.size < high.leaves.size);
  assert.ok(plan(4, 3, 192).leaves.size <= 192);
});

test("every planet preset fits the GPU palette and can use the same explicit seed", () => {
  assert.equal(PlanetPresets.length, 17);
  const dir = unit([0.7, 0.2, 0.6]);
  for (const { id } of PlanetPresets) {
    const { stops } = getPreset(id);
    assert.ok(stops.length >= 2 && stops.length <= 32);
    assert.deepEqual(surface(dir, radius, 29, id, map), sample(dir));
  }
  assert.throws(() => surface(dir), TypeError);
});

test("Planet Studio's five layers are seeded and its height sampling wraps across longitude", () => {
  const studio = createStudioPlanetNoise();
  assert.deepEqual(studio, createStudioPlanetNoise());
  assert.notEqual(studio.sphereOffset, createStudioPlanetNoise(5).sphereOffset);
  assert.deepEqual(
    studio.layers.map(({ entryPoint }) => entryPoint),
    [
      "computeFBM",
      "computeFBM2",
      "computeVoronoiTileNoise",
      "computeRidgedMultifractal4",
      "computeLanczosBillow",
    ],
  );
  assert.equal(
    new Set(createStudioPlanetNoise(5).layers.map(({ params }) => params.seed))
      .size,
    5,
  );
  assert.equal(sampleStudioPlanetNoise(map, [0, 1, 0]), 0);
  assert.equal(sampleStudioPlanetNoise(map, [0, -1, 0]), 4);
  const east = unit([1, 0, 1e-7]),
    west = unit([1, 0, -1e-7]);
  assert.ok(
    Math.abs(
      sampleStudioPlanetNoise(map, east) - sampleStudioPlanetNoise(map, west),
    ) < 1e-6,
  );
});

test("seeded oceans are repeatable and leave about half the worlds dry", () => {
  const levels = Array.from({ length: 256 }, (_, seed) =>
    studioOceanLevel(map, seed),
  );
  const wet = levels.filter((level) => level !== null);
  assert.ok(wet.length > 105 && wet.length < 150);
  assert.ok(new Set(wet).size > 100);
  assert.deepEqual(
    levels,
    levels.map((_, seed) => studioOceanLevel(map, seed)),
  );
  const dir = [0, 1, 0],
    dry = sample(dir);
  const flooded = surface(dir, radius, 29, "lakeshore", map, wet[0]);
  assert.equal(flooded.height, wet[0]);
  assert.equal(flooded.depth, wet[0] - dry.height);
});

test("camera-relative movement keeps its heading across the poles and longitude seam", () => {
  const same = (a, b) => assert.ok(dot(a, b) > 1 - 1e-12);
  let frame = surfaceFrame(unit([0.3, 1, 0]));
  for (let i = 0; i < 80; i++) {
    const next = moveOnSphere(frame, 0, 0, radius / 100, radius);
    assert.ok(dot(frame.north, next.north) > 0.9999);
    same(frame.east, next.east);
    assert.ok(Math.abs(dot(next.east, next.direction)) < 1e-12);
    frame = next;
  }
  assert.ok(frame.direction[0] < 0 && frame.direction[1] > 0);

  const start = surfaceFrame(unit([1, 0, -0.02]));
  const yaw = Math.PI / 2;
  const [, forward] = viewAxes(start, yaw);
  const crossed = moveOnSphere(start, yaw, 0, radius / 20, radius);
  assert.ok(
    crossed.direction[2] < start.direction[2] ||
      dot(crossed.direction, forward) > 0,
  );
  const across = moveOnSphere(start, yaw, 0, -radius / 20, radius);
  assert.ok(across.direction[2] > 0);
  assert.ok(dot(viewAxes(across, yaw)[1], forward) > 0.998);
  same(
    moveOnSphere(across, yaw, 0, radius / 20, radius).direction,
    start.direction,
  );
  same(surfaceRoute(start, across.direction)(1).direction, across.direction);
  const [right] = viewAxes(across, yaw);
  assert.ok(dot(moveOnSphere(across, yaw, 20, 0, radius).direction, right) > 0);
});

test("regional erosion links a headwater basin across its spill saddle", () => {
  const side = 257;
  const span = side - 1;
  const raw = Float32Array.from({ length: side * side }, (_, i) => {
    const v = Math.floor(i / side) / span;
    const u = (i % side) / span;
    const acrossValley = 0.8 * (1 - Math.cos(u * 2 * Math.PI)) * Math.sin(v * Math.PI);
    const saddle = 0.27 * Math.exp(-((v - 0.56) ** 2) / 0.00045);
    return (1 - v) * 1.65 + acrossValley + saddle;
  });
  const terrain = erodeRegionalWatersheds(raw.slice(), side);
  const incision = (x, y) => raw[y * side + x] - terrain[y * side + x];
  assert.ok(raw[144 * side] > raw[129 * side], "the route has an uphill saddle");
  for (let y = 132; y <= 154; y++) {
    assert.ok(incision(0, y) > 0.13, `the main valley stays connected at row ${y}`);
    assert.equal(terrain[y * side], terrain[y * side + span]);
  }
  assert.ok(incision(128, 144) < 0.04, "the distant divide stays intact");
  assert.equal(terrain[0], raw[0]);
  assert.equal(terrain[span * side], raw[span * side]);
});

test("the erosion bake routes runoff down a continuous valley across longitude", () => {
  const side = 257;
  const segments = side - 1;
  const raw = Float32Array.from({ length: side * side }, (_, i) => {
    const y = Math.floor(i / side),
      x = i % side;
    return (
      (2 * (segments - y)) / segments +
      (1 - Math.cos((x * Math.PI * 2) / segments)) *
        Math.sin((y * Math.PI) / segments) *
        0.4
    );
  });
  const terrain = erodeSphericalTerrain(raw.slice(), side);
  assert.ok(terrain.every(Number.isFinite));
  for (let y = 0; y < side; y++)
    assert.equal(terrain[y * side], terrain[y * side + side - 1]);
  assert.deepEqual(terrain.slice(0, side), raw.slice(0, side));
  const cut = (x, y) => raw[y * side + x] - terrain[y * side + x];
  const row = 148;
  assert.ok(cut(0, row) > 0.12 && cut(0, row) > cut(128, row) + 0.1);
  assert.ok(Math.abs(cut(1, row) - cut(segments - 1, row)) < 0.02);
});
