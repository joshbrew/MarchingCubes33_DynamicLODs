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
  cruiseElevation,
  moveOnSphere,
  surfaceFrame,
  surfaceRoute,
  viewAxes,
} from "../src/planet/navigation.js";
import {
  createStudioPlanetNoise,
  sampleStudioPlanetNoise,
  studioMosaic,
  studioPlanetRelief,
} from "../src/noise/studio.js";
import { erodeSphericalTerrain } from "../src/noise/studio-erosion.js";
import { applyStudioRunoff, erodeRegionalWatersheds } from "../src/noise/studio-watersheds.js";
import { studioSeaDatum, weatherStudioShore } from "../src/noise/studio-ocean.js";
import { frostMargin, studioClimate } from "../src/noise/studio-climate.js";
import { carveStudioGlacialValleys } from "../src/noise/studio-glaciers.js";
import { sampleStudioAlluvium } from "../src/noise/studio-alluvium.js";
import { shapeStudioLandmarks } from "../src/noise/studio-landmarks.js";
import { bakePlanetImpacts, createImpactHistory, giantImpactSites } from "../src/noise/studio-impacts.js";
import { PlanetTileCache } from "../src/planet/tile-cache.js";
import { bakeStudioSprings, studioSpringWater } from "../src/noise/studio-springs.js";
import { bakeStudioDunes } from "../src/noise/studio-dunes.js";
import { meshRockSpan, rockSpanField } from "../src/noise/studio-rock-spans.js";
import { regularizeStudioPoles } from "../src/noise/studio-poles.js";
import { defaultDetail, planetDetail } from "../src/planet/detail.js";

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

test("polar filtering suppresses longitude streaks while keeping broad slopes", () => {
  const side = 513, span = side - 1;
  const clean = Float32Array.from({ length: side ** 2 }, (_, i) => {
    const theta = Math.floor(i / side) * Math.PI / span;
    const phi = ((i % side) % span) * 2 * Math.PI / span;
    return 0.24 * Math.cos(theta) + Math.sin(theta) * (0.43 * Math.cos(phi) - 0.31 * Math.sin(phi));
  });
  const noisy = clean.slice();
  for (let row = 1; row < span; row++) {
    const r = Math.min(row, span - row);
    if (r > 22) continue;
    for (let x = 0; x <= span; x++)
      noisy[row * side + x] += 0.17 * Math.sin(2 * Math.PI * (x % span) * 113 / span);
  }
  const error = (row) => clean.subarray(row * side, (row + 1) * side)
    .reduce((sum, value, x) => sum + Math.abs(value - noisy[row * side + x]), 0) / side;
  const before = error(14);
  regularizeStudioPoles(noisy, side);
  assert.ok(error(14) < before * 0.22 && error(span - 14) < before * 0.22);
  const equator = (span / 2) * side;
  assert.deepEqual(noisy.subarray(equator, equator + side), clean.subarray(equator, equator + side));
  for (let row = 0; row < side; row++) assert.equal(noisy[row * side], noisy[row * side + span]);
  for (const sign of [1, -1]) {
    const poleSlope = [0, 0, 0], approachSlope = [0, 0, 0];
    const atlas = { side, values: noisy };
    sampleStudioPlanetNoise(atlas, [0, sign, 0], poleSlope);
    assert.ok(Math.abs(poleSlope[0] - 0.43 * 0.023) < 0.001);
    assert.ok(Math.abs(poleSlope[2] + 0.31 * 0.023) < 0.001);
    for (const heading of [0, 0.71, 2.19, 4.28]) {
      sampleStudioPlanetNoise(atlas, unit([0.0004 * Math.cos(heading), sign, 0.0004 * Math.sin(heading)]), approachSlope);
      assert.ok(Math.hypot(...poleSlope.map((value, axis) => value - approachSlope[axis])) < 0.001);
    }
  }
});

test("world relief scales the terrain, sea level, and elevation bounds together", () => {
  const relief = Array.from({ length: 64 }, (_, seed) => studioPlanetRelief(seed));
  assert.ok(Math.min(...relief) < 0.30 && Math.max(...relief) > 1.05);
  assert.equal(studioPlanetRelief(227429), studioPlanetRelief(227429));
  const flatter = { ...map, reliefScale: 0.5 };
  const dir = unit([0.67, 0.32, 0.67]);
  assert.equal(surface(dir, radius, 29, "lakeshore", flatter).height, 0.5 * sample(dir).height);
  assert.deepEqual(studioElevationBounds(flatter), studioElevationBounds(map).map((bound) => 0.5 * bound));
  assert.notEqual(studioOceanLevel(map, 227429), null);
  assert.equal(studioOceanLevel(flatter, 227429), 0.5 * studioOceanLevel(map, 227429));
});

test("regional mosaic leaves natural terrain between distinct seed-specific styles", () => {
  const worlds = [0, 100, 700, 1700].map(studioMosaic);
  const types = new Set(worlds.map(({ mesas, fractal }) => `${mesas}/${fractal}`));
  assert.deepEqual(types, new Set(["true/false", "false/true", "true/true"]));
  const both = worlds.find(({ mesas, fractal }) => mesas && fractal);
  const weights = Array.from({ length: 120 }, (_, i) => {
    const y = (2 * i + 1) / 120 - 1, angle = i * 2.39996323, r = Math.sqrt(1 - y * y);
    return both.score([r * Math.cos(angle), y, r * Math.sin(angle)]);
  });
  assert.ok(weights.some(([mesa]) => mesa > 0.8));
  assert.ok(weights.some(([, fractal]) => fractal > 0.8));
  assert.ok(weights.some(([mesa, fractal]) => mesa === 0 && fractal === 0));
  assert.ok(weights.every(([mesa, fractal]) => mesa * fractal === 0));
});

test("mineral spring districts bake flat water cores and preserve longitude wrapping", () => {
  const side = 513, span = side - 1;
  const input = Float32Array.from({ length: side ** 2 }, (_, i) => {
    const phi = (i % side % span) * 2 * Math.PI / span;
    const theta = Math.floor(i / side) * Math.PI / span;
    return Math.sin(theta) ** 2 * (0.8 * Math.sin(7 * phi + 3 * theta) + 0.41 * Math.cos(10 * theta));
  });
  const terrain = input.slice(), replay = input.slice(), other = input.slice();
  const sites = {};
  const springs = bakeStudioSprings(terrain, side, 227429, 0.8, [], sites);
  assert.equal(sites.springs.length, 1);
  assert.deepEqual(bakeStudioSprings(replay, side, 227429, 0.8, [], {}), springs);
  assert.deepEqual(replay, terrain);
  assert.notDeepEqual(bakeStudioSprings(other, side, 227430, 0.8, [], {}), springs);
  assert.ok(springs.values.some((value) => (value & 255) === 255));
  assert.ok(springs.values.some((value) => ((value >>> 8) & 255) > 240));
  const [u, v, width, height] = springs.chart;
  let flatPool = false;
  for (let y = 1; y < span - 1 && !flatPool; y++) {
    if (Math.abs(y / span - v) >= height) continue;
    for (let x = 0; x < span - 1; x++) {
      const delta = ((x / span - u + 1.5) % 1) - 0.5;
      if (Math.abs(delta) >= width) continue;
      const theta = Math.PI * y / span, phi = 2 * Math.PI * x / span;
      const dir = [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
      if (studioSpringWater(springs, dir) !== 1) continue;
      const at = y * side + x;
      if (terrain[at] === terrain[at + 1] && terrain[at] === terrain[at + side]) {
        flatPool = true;
        break;
      }
    }
  }
  assert.ok(flatPool);
  for (let y = 0; y < side; y++) assert.equal(terrain[y * side], terrain[y * side + span]);
});

test("wind basins bake sand and salt locally and reproduce the same seed", () => {
  const side = 513;
  const values = new Float32Array(side ** 2);
  const replay = values.slice(), other = values.slice();
  const landmarks = {};
  const dunes = bakeStudioDunes(values, side, 227429, 0.8, [], landmarks);
  assert.equal(landmarks.dunes.length, 1);
  assert.deepEqual(bakeStudioDunes(replay, side, 227429, 0.8, [], {}), dunes);
  assert.deepEqual(replay, values);
  assert.notDeepEqual(bakeStudioDunes(other, side, 4157756612, 0.8, [], {}), dunes);
  assert.ok(dunes.values.some((value) => (value & 255) > 200));
  assert.ok(dunes.values.some((value) => ((value >>> 8) & 255) > 200));
  assert.ok(values.some((value) => value > 0.08));
  assert.ok(values.some((value) => value < -0.045));
  assert.ok(values.filter((value) => value !== 0).length < values.length * 0.02);
  for (let y = 0; y < side; y++) assert.equal(values[y * side], values[y * side + side - 1]);
});

test("the MC33 rock span leaves a through opening under a solid roof", () => {
  const shape = {
    bend: 0.09, twist: -0.12, thickness: 0.31, peak: 0.94,
    portals: [{ at: 0, width: 0.61, height: 0.58, lean: 0.09 }],
  };
  for (let z = -0.48; z <= 0.48; z += 0.04)
    assert.ok(rockSpanField(0, 0.11, z, shape) > 0);
  assert.ok(rockSpanField(0, 0.68, 0, shape) < 0, "lintel");
  for (const x of [-0.79, 0.79])
    assert.ok(rockSpanField(x, 0.06, 0, shape) < 0, "embedded pier");
  const vertices = meshRockSpan(shape);
  assert.ok(vertices.length > 1000 && vertices.length % 18 === 0);
  assert.ok(vertices.every(Number.isFinite));
  assert.ok(vertices.filter((_, i) => i % 6 === 1).some((y) => y > 0.62));
  const edges = new Map();
  for (let i = 0; i < vertices.length; i += 18) {
    const keys = [0, 6, 12].map((offset) =>
      Array.from(vertices.subarray(i + offset, i + offset + 3), (value) => Math.round(value * 1e5)).join(","));
    for (let side = 0; side < 3; side++) {
      const a = keys[side], b = keys[(side + 1) % 3];
      if (a === b) continue;
      const edge = a < b ? `${a}/${b}` : `${b}/${a}`;
      edges.set(edge, (edges.get(edge) ?? 0) + 1);
    }
  }
  assert.ok([...edges.values()].every((count) => count === 2), "closed rock surface");
});

test("planet climate can be snow-free, highland-only, or polar", () => {
  const bare = studioClimate(3428310528);
  const highlands = studioClimate(1488795261);
  const polar = studioClimate(227429);
  assert.equal(frostMargin(0, 1, 0, 3, bare), -Infinity);
  assert.ok(frostMargin(0, 1, 0, 0.5, highlands) < 0);
  assert.ok(frostMargin(1, 0, 0, 2, highlands) > 0);
  assert.ok(frostMargin(0, 1, 0, 0.25, polar) > 0);
  assert.ok(frostMargin(1, 0, 0, 0.25, polar) < 0);
  assert.deepEqual(studioClimate(227429), polar);
});

test("glacial valleys cut localized relief and keep the longitude seam closed", () => {
  const side = 257;
  const span = side - 1;
  const input = Float32Array.from({ length: side ** 2 }, (_, i) => {
    const phi = (i % side % span) * 2 * Math.PI / span;
    const theta = Math.floor(i / side) * Math.PI / span;
    return Math.sin(theta) ** 2 * (0.7 * Math.cos(7 * phi) + 0.45 * Math.sin(12 * theta));
  });
  const first = input.slice(), second = input.slice(), off = input.slice();
  const sites = carveStudioGlacialValleys(first, side, 227429, 0.8);
  assert.ok(sites.length > 1);
  assert.deepEqual(sites, carveStudioGlacialValleys(second, side, 227429, 0.8));
  assert.deepEqual(first, second);
  assert.deepEqual(carveStudioGlacialValleys(off, side, 227429, 0), []);
  assert.deepEqual(off, input);
  const changed = first.reduce((sum, value, at) => sum + Number(value !== input[at]), 0);
  assert.ok(changed > 20 && changed < first.length * 0.1);
  assert.ok(first.some((value, at) => value < input[at] - 0.2));
  for (let row = 0; row < side; row++) assert.equal(first[row * side], first[row * side + span]);
});

test("Pluto carves narrow ice canyons into dry impact terrain", () => {
  const side = 385, span = side - 1, seed = 227429;
  const input = Float32Array.from({ length: side ** 2 }, (_, i) => {
    const phi = (i % side % span) * 2 * Math.PI / span;
    const theta = Math.floor(i / side) * Math.PI / span;
    return Math.sin(theta) ** 2 * (0.32 * Math.cos(7 * phi) + 0.18 * Math.sin(12 * theta));
  });
  const profile = getPreset("pluto");
  const bake = (cryo) =>
    applyStudioRunoff(input.slice(), side, profile.geology, seed, .8, undefined, false, .375, 0,
      profile.lunar, profile.craterDetail, cryo);
  const rocky = bake(false), frozen = bake(profile.cryoGlaciers);
  assert.equal(frozen.ocean.datum, null);
  assert.deepEqual(frozen.impactBasins, rocky.impactBasins);
  assert.ok(frozen.glacialSites.length >= 11);
  const lengths = frozen.glacialSites.map(({ head, overlook }) => Math.acos(dot(head, overlook)));
  assert.ok(Math.max(...lengths) > .30 && lengths.filter(length => length > .21).length >= 8);
  const visibleOutlets = frozen.glacialSites.filter(({ overlook }) => sampleStudioAlluvium(frozen.glacialIce, overlook) > .20);
  assert.ok(visibleOutlets.length >= 10);
  assert.ok(frozen.values.some((height, i) => height < rocky.values[i] - .35));
  for (const atlas of [{ side, values: frozen.values }, frozen.glacialIce]) {
    for (let row = 0; row < atlas.side; row++)
      assert.equal(atlas.values[row * atlas.side], atlas.values[(row + 1) * atlas.side - 1]);
  }
});

test("landmarks are repeatable, localized and seam-safe", () => {
  const side = 257, span = side - 1;
  const flat = new Float32Array(side ** 2);
  const values = flat.slice(), replay = flat.slice();
  const first = shapeStudioLandmarks(values, side, 227429, 0.8, []);
  assert.equal(first.impact.length, 1);
  assert.equal(first.karst.length, 1);
  assert.equal(first.rift.length, 1);
  assert.deepEqual(shapeStudioLandmarks(replay, side, 227429, 0.8, []), first);
  assert.deepEqual(replay, values);
  assert.ok(sampleStudioPlanetNoise({ side, values }, first.rift[0].target) < -0.19,
    "the rift cuts into the existing surface");
  assert.ok(values.some((value) => value > 0.16), "the impact raises a rim");
  assert.ok(values.some((value) => value < -0.27), "the bake carves deep depressions");
  assert.ok(values.filter((value) => value !== 0).length < values.length * 0.035);
  for (let row = 0; row < side; row++) assert.equal(values[row * side], values[row * side + span]);
  assert.deepEqual(shapeStudioLandmarks(flat, side, 227429, 0, []), { impact: [], karst: [], rift: [] });
  assert.ok(flat.every((value) => value === 0));
});

test("planet tile cache reuses active and recently hidden patches", () => {
  const cache = new PlanetTileCache(4);
  const tiles = (...keys) => keys.map((key) => ({ key }));
  const first = cache.assign(tiles("a", "b", "c"));
  const turned = cache.assign(tiles("b", "c", "d"));
  assert.deepEqual(turned.builds.map(({ tile }) => tile.key), ["d"]);
  assert.equal(turned.assigned.get("b"), first.assigned.get("b"));
  assert.equal(cache.assign(tiles("a", "c")).builds.length, 0);
  const replaced = cache.assign(tiles("a", "e", "f"));
  assert.equal(replaced.assigned.get("a"), first.assigned.get("a"));
  assert.equal(new Set(replaced.assigned.values()).size, 3);
  assert.equal(cache.slots.size, 4);
  cache.clear();
  assert.equal(cache.assign(tiles("a")).builds.length, 1);
});

test("planet impact populations vary from sparse basins to dense crater fields", () => {
  const side = 257;
  const quiet = new Float32Array(side ** 2), cratered = quiet.slice(), repeat = quiet.slice();
  const sparseCount = bakePlanetImpacts(quiet, side, 2, .85);
  const denseCount = bakePlanetImpacts(cratered, side, 4, .85);
  assert.equal(bakePlanetImpacts(repeat, side, 4, .85), denseCount);
  assert.ok(sparseCount <= 3 && denseCount > 30);
  assert.deepEqual(cratered, repeat);
  assert.ok(cratered.some((height) => height < -.2) && cratered.some((height) => height > .1));
  for (let row = 0; row < side; row++)
    assert.equal(cratered[row * side], cratered[(row + 1) * side - 1]);
});

test("lunar worlds have broad depressed basins and raised rims even at zero variation", () => {
  const side = 257, seed = 227429;
  const original = new Float32Array(side ** 2);
  const terrain = applyStudioRunoff(original, side, "mixed", seed, 0, undefined, false, .375, undefined, true);
  assert.equal(studioOceanLevel({ ...terrain, side }, seed), null);
  const [basin] = giantImpactSites(seed, true);
  const atlas = { side, values: terrain.values };
  const east = [-Math.sin(basin.longitude), 0, Math.cos(basin.longitude)];
  const sample = (offset) => sampleStudioPlanetNoise(atlas,
    unit(basin.center.map((coordinate, axis) => coordinate + offset * basin.size * east[axis])));
  assert.ok(sample(0) < -.65 && sample(.45) < -.60, "the floor spans tens of kilometers");
  assert.ok(Math.max(sample(.97), sample(1.03)) > .10, "the basin has a raised rim");
});

test("giant impact basins vary by seed and only occasionally form on other worlds", () => {
  const counts = Array.from({ length: 512 }, (_, seed) => giantImpactSites(seed, true).length);
  assert.deepEqual([...new Set(counts)].sort(), [1, 2, 3, 4]);
  const otherCounts = counts.map((_, seed) => giantImpactSites(seed).length);
  const uncommon = otherCounts.filter(Boolean);
  assert.ok(uncommon.length > 20 && uncommon.length < 60);
  assert.ok(uncommon.includes(2));
  const seed = otherCounts.indexOf(1);
  const sites = giantImpactSites(seed);
  assert.deepEqual(sites, giantImpactSites(seed));
  const side = 129, values = new Float32Array(side ** 2);
  const terrain = applyStudioRunoff(values, side, "volcanic", seed, .85, undefined, false, 1, 0);
  assert.deepEqual(terrain.impactBasins, sites);
  assert.ok(sampleStudioPlanetNoise({ side, values }, sites[0].center) < -.55);
  assert.equal(terrain.ocean.datum, null);
});

test("Ceres and Pluto add distinct populations of smaller craters around the same giant basins", () => {
  const side = 385, seed = 227429;
  const basins = giantImpactSites(seed, true);
  const bake = (craterDetail) => {
    const values = new Float32Array(side ** 2);
    const count = bakePlanetImpacts(values, side, seed, .8, .375, true, basins, craterDetail);
    return { values, count };
  };
  const lunar = bake(0);
  const pluto = bake(getPreset("pluto").craterDetail);
  const ceres = bake(getPreset("ceres").craterDetail);
  const profile = getPreset("ceres-crater-fields");
  const fields = bake(profile.craterDetail);
  assert.ok(pluto.count > lunar.count + 50 && ceres.count > 2 * pluto.count && ceres.count > 550);
  assert.ok(fields.count > 1.4 * ceres.count);
  assert.ok(ceres.values.some((height, i) => height < lunar.values[i] - .12));
  const terrain = applyStudioRunoff(new Float32Array(side ** 2), side, profile.geology,
    seed, .8, undefined, false, .375, 0, profile.lunar, profile.craterDetail);
  assert.deepEqual(terrain.values, fields.values);
  assert.ok(terrain.impactMaterial.values.some(height => height > .05));
  assert.ok(terrain.impactMaterial.values.some(height => height < -.12));
  let impacted = 0;
  for (let i = 0; i < 1024; i++) {
    const y = 1 - (2 * i + 1) / 1024;
    const radial = Math.sqrt(1 - y * y), angle = i * 2.39996323;
    const point = [radial * Math.cos(angle), y, radial * Math.sin(angle)];
    impacted += Number(Math.abs(sampleStudioAlluvium(terrain.impactMaterial, point)) > .025);
  }
  assert.ok(impacted > 665, `${impacted} of 1024 samples show impact relief`);
  for (const atlas of [{ side, values: ceres.values }, { side, values: fields.values }, terrain.impactMaterial])
    for (let row = 0; row < atlas.side; row++)
      assert.equal(atlas.values[row * atlas.side], atlas.values[(row + 1) * atlas.side - 1]);
});

test("impact histories vary the layout and shape even on the same underlying terrain", () => {
  const terrain = (x, y) => x * 0.14 + y * 0.08;
  const seeds = [227429, 227430, 123456789, 4157756612, 0, 1, 2, 3, 4, 5, 6, 7];
  const histories = seeds.map((seed) => createImpactHistory(seed, terrain));
  assert.deepEqual(createImpactHistory(seeds[0], terrain), histories[0]);
  assert.ok(histories.some((history) => history.length === 1));
  assert.ok(histories.some((history) => history.length >= 3));
  const pairs = histories.filter((history) => history.length === 2);
  assert.ok(pairs.length > 1);
  const relativeLayout = ([primary, secondary]) =>
    [Math.hypot(secondary.x, secondary.y) / primary.size, secondary.size / primary.size];
  assert.ok(pairs.some((pair) => relativeLayout(pair).some((value, i) =>
    Math.abs(value - relativeLayout(pairs[0])[i]) > 0.15)));
  assert.ok(new Set(histories.map(([event]) => event.rebound)).size >= 3);
  const uphill = createImpactHistory(seeds[0], (x, y) => -terrain(x, y));
  assert.notEqual(uphill[0].low, histories[0][0].low);
});

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
      assert.equal(sample(dir).land, sampleStudioPlanetNoise(map, dir));
    }
  }
  const incision = planetDetail({ ground: "incised" });
  const noGround = planetDetail({ groundOctaves: 0 });
  const profile = Array.from({ length: 81 }, (_, i) => {
    const dir = unit([1, 0.4, 0.8 + (2 * i) / radius]);
    const sampleWith = (detail) => surface(dir, radius, 29, "lakeshore", map, null, "mixed", detail).height;
    return sampleWith(incision) - sampleWith(noGround);
  });
  const curvature = profile
    .slice(1, -1)
    .map((height, i) => profile[i] + profile[i + 2] - 2 * height);
  assert.ok(Math.min(...curvature) < -0.2 && Math.max(...curvature) > 0.2);
  assert.ok(profile.every((height) => height <= 1e-8) && Math.min(...profile) < -1);
  const regional = Array.from({ length: 81 }, (_, i) =>
    relief(unit([1, 0.4, 0.8 + (500 * i) / radius])),
  );
  assert.ok(Math.max(...regional) - Math.min(...regional) > 160);
});

test("drainage controls change terrain without a longitude seam", () => {
  const coarse = planetDetail({ slopeOctaves: 0, groundOctaves: 0 });
  const height = (dir, detail) => surface(dir, radius, 29, "lakeshore", map, null, "mixed", detail).height;
  const dir = unit([0.70, 0.25, 0.2]);
  assert.notEqual(height(dir, defaultDetail), height(dir, coarse));
  const dry = planetDetail({ erosionStrength: 0, groundOctaves: 0 });
  const wet = planetDetail({ erosionStrength: 2, groundOctaves: 0 });
  const steepMap = { ...map, values: values.map((value) => 8 * value) };
  const transect = Array.from({ length: 240 }, (_, i) => unit([1, .4, .7 + i * .001]));
  const deepestCut = (geology) => Math.max(...transect.map((p) =>
    surface(p, radius, 29, "lakeshore", steepMap, null, geology, dry).height -
    surface(p, radius, 29, "lakeshore", steepMap, null, geology, wet).height));
  assert.ok(deepestCut("mixed") > 150);
  assert.ok(deepestCut("mixed") > 1.45 * deepestCut("mesa"));
  assert.ok(Math.abs(height(unit([1, .4, -1e-9]), defaultDetail) -
    height(unit([1, .4, 1e-9]), defaultDetail)) < .01);
  assert.throws(() => planetDetail({ slopeOctaves: 5 }), RangeError);
  assert.throws(() => planetDetail({ erosionStrength: 2.01 }), RangeError);
  assert.equal(defaultDetail.landscape, "natural");
  assert.equal(planetDetail({ landscape: "mesas", landscapeStrength: 0.65 }).landscapeStrength, 0.65);
  assert.throws(() => planetDetail({ landscape: "unknown" }), RangeError);
  assert.throws(() => planetDetail({ landscapeStrength: 1.01 }), RangeError);
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

test("streaming refinement limits new splits and retains visible coverage", () => {
  const camera = {
    ...createCamera({
      position: [radius + 600, 0, 0],
      forward: [-0.28, 0, 1],
      up: [1, 0, 0],
      height: 900,
      aspect: 16 / 9,
      far: 550000,
    }),
    clearance: 600,
  };
  const options = { maxTiles: 768, centerPriority: true, splitBudget: 24, pixelError: 2, lodScale: 2.25 };
  let plan = selectPlanet(camera, options);
  const distanceOnly = selectPlanet(camera, { ...options, centerPriority: false });
  assert.deepEqual(plan.leaves, distanceOnly.leaves);
  assert.ok(plan.deferred && plan.visible.length > 0 && plan.split.size <= options.splitBudget);
  const first = plan.visible.length;
  for (let step = 0; step < 15 && plan.deferred; step++) {
    const next = selectPlanet(camera, { ...options, previousFocal: plan.focalSplit }, plan.split);
    assert.ok([...next.split].filter(key => !plan.split.has(key)).length <= options.splitBudget);
    assert.ok(next.leaves.size <= options.maxTiles && next.visible.length > 0);
    plan = next;
  }
  assert.ok(plan.visible.length > first * 2);
});

test("center refinement adds splits only after distance refinement", () => {
  const camera = {
    ...createCamera({
      position: [radius + 3200, 0, 0], forward: [-1, 0, 0], up: [0, 1, 0],
      height: 900, aspect: 16 / 9, far: 550000,
    }),
    clearance: 3200,
  };
  const options = { maxTiles: 4096, pixelError: 7, lodScale: 2.25 };
  const distance = selectPlanet(camera, options);
  const focused = selectPlanet(camera, { ...options, centerPriority: true });
  assert.ok(focused.focalSplit.size > 0);
  for (const key of distance.split) {
    assert.ok(focused.split.has(key) && !focused.focalSplit.has(key));
  }
});

test("orbital refinement spends the patch budget on the visible terrain beneath the camera", () => {
  const options = {
    maxTiles: Math.floor(800000 / (2 * 16 ** 2)),
    pixelError: 1.25,
    lodScale: 4,
    elevationBounds: [-8000, 12000],
  };
  const finestBelow = ({ visible }) =>
    Math.min(...visible.filter(({ dir }) => dir[0] > .995).map(({ spacing }) => spacing));
  for (const clearance of [200000, 300000, 500000]) {
    const camera = {
      ...createCamera({
        position: [radius + clearance, 0, 0],
        forward: [-1, 0, 0],
        up: [0, 1, 0],
        height: 900,
        aspect: 16 / 9,
        far: 2000000,
      }),
      clearance,
    };
    const baseline = selectPlanet(camera, options);
    const orbital = selectPlanet(camera, { ...options, centerPriority: true });
    assert.ok(orbital.leaves.size <= options.maxTiles);
    assert.ok(finestBelow(orbital) <= finestBelow(baseline) / 2);
  }
  const camera = {
    ...createCamera({
      position: [radius + 300000, 0, 0], forward: [-1, 0, 0], up: [0, 1, 0],
      height: 540, aspect: 16 / 9, far: 2000000,
    }),
    clearance: 300000,
  };
  const plan = selectPlanet(camera, { ...options, centerPriority: true });
  const center = plan.visible.filter(({ dir }) => dir[0] > .998);
  const surround = plan.visible.filter(({ dir }) => dir[0] > .97 && dir[0] < .99);
  assert.ok(center.length && surround.length);
  assert.ok(Math.max(...center.map(({ spacing }) => spacing)) <=
    Math.min(...surround.map(({ spacing }) => spacing)));
});

test("planet stress settings can plan about 16 million grid vertices within the patch cap", () => {
  const clearance = 300000;
  const camera = {
    ...createCamera({
      position: [radius + clearance, 0, 0],
      forward: [-1, 0, 0],
      up: [0, 1, 0],
      height: 1080,
      aspect: 16 / 9,
      far: 2000000,
    }),
    clearance,
  };
  const verticesPerTile = 17 ** 2;
  const maxTiles = Math.floor(16000000 / verticesPerTile);
  const plan = selectPlanet(camera, {
    maxTiles, pixelError: 1, lodScale: 32, centerPriority: true, elevationBounds: [-8000, 12000],
  });
  assert.ok(plan.leaves.size <= maxTiles);
  assert.ok(plan.visible.length * verticesPerTile > 15000000);
});

test("every planet preset fits the GPU palette and can use the same explicit seed", () => {
  assert.equal(PlanetPresets.length, 26);
  assert.equal(getPreset("gas-giant").name, "Amberstone");
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

test("water world presets flood most of the surface even on a normally dry seed", () => {
  const side = 161;
  const values = Float32Array.from({ length: side * side }, (_, i) =>
    Math.sin((i % side) / (side - 1) * 2 * Math.PI));
  const seed = Array.from({ length: 32 }, (_, i) => i).find(i => studioSeaDatum(values, side, i) === null);
  assert.notEqual(seed, undefined);
  const worlds = PlanetPresets.filter(({ wet }) => wet);
  assert.deepEqual(worlds.map(({ id }) => id), ["verdigris-sea", "amethyst-tide", "titan"]);
  for (const { id } of worlds) {
    const { coverage } = getPreset(id).ocean;
    const datum = studioSeaDatum(values, side, seed, { coverage });
    const flooded = values.subarray(0, side - 1).filter(height => height < datum).length / (side - 1);
    assert.ok(Math.abs(flooded - coverage) < .03);
  }
});

test("planet flight holds its elevation through valleys and recovers after clearing a ridge", () => {
  const target = -25;
  const dt = 1 / 60;
  assert.equal(cruiseElevation(target, target, -90, -50, dt), target);
  const climbing = cruiseElevation(target, target, -90, 0, dt);
  assert.ok(climbing > target && climbing < 2);
  let elevation = cruiseElevation(climbing, target, 0, -90, dt);
  assert.ok(elevation >= 2);
  const firstDescent = cruiseElevation(elevation, target, -90, -90, dt);
  assert.ok(firstDescent < elevation && firstDescent > target);
  for (let i = 0; i < 300; i++) {
    elevation = cruiseElevation(elevation, target, -90, -90, dt);
  }
  assert.equal(elevation, target);
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
  const section = terrain.slice(144 * side, 144 * side + 7);
  assert.ok(Math.abs(section[1] - section[0]) < 0.002, "the trunk opens into a flat floor");
  assert.ok(section[4] > section[2] + 0.08, "the bank rises away from the floor");
  assert.equal(terrain[0], raw[0]);
  assert.equal(terrain[span * side], raw[span * side]);
  const rock = { side: 2, values: new Uint32Array(4).fill(0xff0000) };
  const hard = { seed: 227429, variation: 1, regions: rock, sites: [] };
  const ridges = erodeRegionalWatersheds(raw.slice(), side, 1, null, null, null, hard);
  assert.ok(hard.sites.length > 0 && hard.sites.length <= 48);
  assert.ok(ridges.some((height, at) => height - terrain[at] > 0.20));
  assert.ok(ridges.some((height, at) => terrain[at] - height > 0.025));
  const other = { ...hard, seed: 227430, sites: [] };
  erodeRegionalWatersheds(raw.slice(), side, 1, null, null, null, other);
  assert.notDeepEqual(hard.sites, other.sites);
  for (let y = 0; y < side; y++) assert.equal(ridges[y * side], ridges[y * side + span]);
  const frozen = erodeRegionalWatersheds(raw.slice(), side, 1, null, [0, 1, 0, -1]);
  assert.ok(frozen[144 * side + 6] < terrain[144 * side + 6] - 0.04,
    "glacial erosion widens the shoulder of the routed trunk");
  assert.equal(frozen[144 * side + 128], terrain[144 * side + 128]);
  const sea = 0.85;
  const coastal = erodeRegionalWatersheds(raw.slice(), side, 1, sea);
  assert.ok(coastal.some((height, at) => raw[at] < sea && height > terrain[at] + 0.045),
    "runoff leaves sediment below the waterline near large outlets");
  assert.equal(coastal[45 * side + 92], terrain[45 * side + 92]);
  const shore = coastal.slice();
  weatherStudioShore(shore, side, sea);
  assert.ok(shore.some((height, at) => coastal[at] > sea && height < coastal[at] - 0.01));
  assert.ok(shore.some((height, at) => coastal[at] < sea && height > coastal[at] + 0.01));
  for (let row = 0; row < side; row++) assert.equal(shore[row * side], shore[row * side + span]);
  const continuous = applyStudioRunoff(raw.slice(), side, "alpine", 1488795261, 0.8, undefined, false);
  assert.deepEqual(continuous.landmarks, {});
  assert.deepEqual(continuous.glacialSites, []);
  assert.equal(continuous.springs, undefined);
  assert.ok(continuous.values[144 * side] < raw[144 * side] - 0.13,
    "continuous terrain still receives regional runoff");
});

test("sheltered shores build a shallow apron without moving the shoreline", () => {
  const side = 257, span = side - 1;
  const raw = Float32Array.from({ length: side ** 2 }, (_, at) => {
    const x = at % side, y = Math.floor(at / side);
    const coast = 0.06 * (128 - y);
    return Math.abs(x - 128) < 48 && y >= 132 ? Math.max(coast, 0.28) : coast;
  });
  const shore = raw.slice();
  weatherStudioShore(shore, side, 0);
  const seafloor = 130 * side;
  assert.ok(shore[seafloor + 128] > shore[seafloor] + 0.035);
  assert.equal(shore[128 * side + 128], 0);
  for (let y = 0; y < side; y++) assert.equal(shore[y * side], shore[y * side + span]);
  assert.ok(shore.every((height, at) => Math.sign(height) === Math.sign(raw[at])));
});

test("steep washes spread inland sediment where they reach gentler ground", () => {
  const side = 257, span = side - 1;
  const input = Float32Array.from({ length: side * side }, (_, at) => {
    const u = (at % side) / span, v = Math.floor(at / side) / span;
    return 0.42 + 11 * Math.max(0, 0.53 - v) +
      0.35 * (1 - Math.cos(2 * Math.PI * u)) * Math.sin(Math.PI * v) + 0.075 * (1 - v);
  });
  const atlas = { side: 129, values: new Float32Array(129 ** 2) };
  const eroded = erodeRegionalWatersheds(input.slice(), side);
  const fans = erodeRegionalWatersheds(input.slice(), side, 1, null, null, atlas);
  assert.ok(fans.some((height, at) => Math.floor(at / side) > 134 && height - eroded[at] > 0.02));
  assert.ok(atlas.values.some((cover) => cover > 0.13));
  assert.equal(fans[45 * side + 92], eroded[45 * side + 92]);
  for (let y = 0; y < atlas.side; y++) {
    const at = y * atlas.side;
    assert.equal(atlas.values[at], atlas.values[at + atlas.side - 1]);
  }
});

test("low-gradient trunks develop benches without filling their channel", () => {
  const side = 257, span = side - 1;
  const raw = Float32Array.from({ length: side * side }, (_, at) => {
    const u = (at % side) / span, v = Math.floor(at / side) / span;
    return 0.3 + 0.75 * (1 - v) + 0.85 * (1 - Math.cos(2 * Math.PI * u)) * Math.sin(Math.PI * v);
  });
  const atlas = { side: 129, values: new Float32Array(129 ** 2) };
  const incised = erodeRegionalWatersheds(raw.slice(), side);
  const benched = erodeRegionalWatersheds(raw.slice(), side, 1, null, null, atlas);
  for (let y = 165; y <= 180; y++) {
    const row = y * side;
    assert.ok(benched[row + 2] > incised[row + 2] + 0.008);
    assert.ok(Math.abs(benched[row] - incised[row]) < 0.002);
    assert.equal(benched[row], benched[row + span]);
  }
  assert.equal(benched[0], raw[0]);
  assert.equal(benched[span * side], raw[span * side]);
});

test("substantial tributaries widen their junction across the longitude seam", () => {
  const side = 257, span = side - 1;
  const raw = Float32Array.from({ length: side ** 2 }, (_, at) => {
    const x = at % side, y = Math.floor(at / side);
    const tributary = Math.max(0, 122 - y) * 0.53;
    const distance = Math.abs(Math.min(x, span - x) - tributary);
    return 2.1 * (1 - y / span) + Math.min(1.8, 0.034 * distance);
  });
  const atlas = { side: 129, values: new Float32Array(129 ** 2) };
  const incised = erodeRegionalWatersheds(raw.slice(), side);
  const merged = erodeRegionalWatersheds(raw.slice(), side, 1, null, null, atlas);
  assert.ok(merged[122 * side + 4] < incised[122 * side + 4] - 0.07);
  assert.ok(merged[124 * side + 3] < incised[124 * side + 3] - 0.04);
  assert.equal(merged[128 * side], incised[128 * side]);
  assert.equal(merged[122 * side + 40], incised[122 * side + 40]);
  for (let y = 105; y < 130; y++) assert.equal(merged[y * side], merged[y * side + span]);
});

test("sandstone runoff cuts continuous, seed-dependent bends across longitude", () => {
  const side = 257, span = side - 1;
  const raw = Float32Array.from({ length: side ** 2 }, (_, i) => {
    const x = i % side, y = Math.floor(i / side);
    return 1.9 * (1 - y / span) + Math.min(0.9, 0.012 * Math.min(x, span - x));
  });
  const bake = (seed) =>
    erodeRegionalWatersheds(raw.slice(), side, 1, null, null, null, null, { seed, geology: "mesa" });
  const first = bake(227429), second = bake(4157756612);
  const centers = [];
  const otherCenters = [];
  for (let y = 84; y <= 176; y++) {
    const row = y * side;
    const center = (terrain) => {
      let lowest = -6;
      const index = (x) => row + ((x + span) % span);
      for (let x = -5; x <= 6; x++)
        if (terrain[index(x)] < terrain[index(lowest)]) lowest = x;
      assert.ok(raw[index(lowest)] - terrain[index(lowest)] > 0.15);
      assert.equal(terrain[row], terrain[row + span]);
      return lowest;
    };
    centers.push(center(first));
    otherCenters.push(center(second));
  }
  assert.ok(Math.min(...centers) <= -2 && Math.max(...centers) >= 2);
  assert.ok(centers.some((x, i) => Math.abs(x - otherCenters[i]) >= 3));
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
