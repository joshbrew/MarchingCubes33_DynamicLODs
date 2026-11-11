import { defaultDetail, rangeWeights } from "./detail.js";
import { drainageBound, drainageHeight } from "./drainage.js";
import { getPreset } from "./presets.js";
import { sampleStudioPlanetNoise, studioRegionWeights } from "../noise/studio.js";
import { studioSpringWater } from "../noise/studio-springs.js";
import { studioDistrictMask } from "../noise/studio-district.js";
import { studioHash as hash, studioSeaDatum } from "../noise/studio-ocean.js";

export const radius = 262144;
export const seed = 29;
export const elevationBound = 5000;
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (v) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const mix = (a, b, t) => a + (b - a) * t;
const waves = [8600, 3600];
const amplitudes = [290, 165];
const terraceWeights = [0.13, 0.22];

export function noise3(x, y, z, salt = seed) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const weight = (f) => f * f * (3 - 2 * f);
  const u = weight(x - ix),
    v = weight(y - iy),
    w = weight(z - iz);
  const sample = (i, j, k) =>
    (hash(ix + i, iy + j, iz + k, salt) / 4294967295) * 2 - 1;
  const line = (j, k) => mix(sample(0, j, k), sample(1, j, k), u);
  return mix(mix(line(0, 0), line(1, 0), v), mix(line(0, 1), line(1, 1), v), w);
}

function noiseWithSlope(x, y, z, salt) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    iz = Math.floor(z);
  const fx = x - ix,
    fy = y - iy,
    fz = z - iz;
  const fade = (f) => f * f * f * (10 + f * (-15 + 6 * f));
  const u = fade(fx),
    v = fade(fy),
    w = fade(fz);
  const gain = 1.15 / Math.SQRT2;
  const fadeDerivative = (f) => 30 * f ** 2 * (1 - f) ** 2;
  const du = fadeDerivative(fx),
    dv = fadeDerivative(fy);
  const corner = (i, j, k) => {
    const h = hash(ix + i, iy + j, iz + k, salt) & 15;
    const a = h & 1 ? -gain : gain,
      b = h & 2 ? -gain : gain;
    const dx = fx - i,
      dy = fy - j,
      dz = fz - k;
    return [
      a * (h < 8 ? dx : dy) + b * (h < 4 ? dy : h === 12 || h === 14 ? dx : dz),
      (h >= 8 ? a : 0) + (h < 4 ? b : 0),
      (h < 8 ? a : 0) + (h === 12 || h === 14 ? b : 0),
    ];
  };
  const line = (j, k) => {
    const [a, ay, ax] = corner(0, j, k),
      [b, by, bx] = corner(1, j, k);
    return [mix(a, b, u), mix(ay, by, u), mix(ax, bx, u) + (b - a) * du];
  };
  const row = (k) => {
    const [a, ay, ax] = line(0, k),
      [b, by, bx] = line(1, k);
    return [
      mix(a, b, v),
      mix(ay, by, v) + (b - a) * dv,
      mix(ax, bx, v),
    ];
  };
  const [a, ay, ax] = row(0),
    [b, by, bx] = row(1);
  return [mix(a, b, w), mix(ay, by, w), mix(ax, bx, w)];
}

// Planet Studio defaults to a 1.15-unit displacement scale on a radius-50
// sphere. Preserve that proportion when the same world is measured in meters.
export const studioHeightScale = (size = radius) => size * (1.15 / 50);

export function studioElevationBounds(map, size = radius, geology = "mixed") {
  // A bicubic sample can overshoot the texel extrema. Bound the negative
  // lobes of the Catmull–Rom weights in both dimensions, then add fine detail.
  const padding = (map.max - map.min) * 0.28125;
  const scale = studioHeightScale(size) / (map.featureDensity ?? 1);
  const detailBound =
    drainageBound +
    (map.regions || geology === "alpine" || geology === "mixed" ? 2.4 : 1.22) *
      (amplitudes[0] + amplitudes[1]);
  const relief = map.reliefScale ?? 1;
  return [
    ((map.min - padding) * scale - detailBound) * relief,
    ((map.max + padding) * scale + detailBound) * relief,
  ];
}

export function studioOceanLevel(map, worldSeed, size = radius) {
  const datum = map.ocean?.seed === worldSeed ? map.ocean.datum :
    studioSeaDatum(map.values, map.side, worldSeed, map);
  return datum === null ? null : datum * studioHeightScale(size) * (map.reliefScale ?? 1) / (map.featureDensity ?? 1);
}

export function surface(
  direction,
  size = radius,
  worldSeed = seed,
  presetId,
  studioMap,
  oceanLevel = null,
  geology = "mixed",
  detail = defaultDetail,
  baseHeight,
) {
  getPreset(presetId);
  if (!studioMap)
    throw new TypeError(
      "Bake a Planet Studio noise map before sampling the surface.",
    );
  const [x, y, z] = direction;
  const grade = [0, 0, 0];
  const guideHeight = sampleStudioPlanetNoise(studioMap, direction, grade);
  const land = baseHeight ?? guideHeight;
  const density = studioMap.featureDensity ?? 1;
  const scale = studioHeightScale(size) / density;
  for (let axis = 0; axis < 3; axis++) grade[axis] /= density;
  let height = land * scale;
  // Keep the same world-space frame at every cube edge. Each band offsets
  // the next along a different axis using its height and transverse slope.
  const px = ((4 * x - 20 * y + 22 * z) * size) / 30;
  const py = ((28 * x + 10 * y + 4 * z) * size) / 30;
  const pz = ((-10 * x + 20 * y + 20 * z) * size) / 30;
  const qx = (4 * px - 4 * py + 7 * pz) / 9;
  const qy = (8 * px + py - 4 * pz) / 9;
  const qz = (px + 8 * py + 4 * pz) / 9;
  const upland = clamp((land + 1) / 3, 0, 1);
  const regionalStrength = 0.6 + 0.62 * upland * upland * (3 - 2 * upland);
  const rock = studioRegionWeights(studioMap, direction, geology);
  const [alpine, canyon, granite] = rock;
  let warpX = 1.15 * land,
    ridgeCarry = 0;
  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const [n, slopeY] = noiseWithSlope(
      (i === 1 ? qx : px) * (1 + 0.18 * alpine) / wave + warpX,
      (i === 1 ? qy : py) * (1 - 0.30 * alpine) / wave,
      (i === 1 ? qz : pz) * (1 - 0.06 * alpine) / wave,
      worldSeed + 131 + i * 19,
    );
    const groove = Math.max(0, 1 - (n * n) / (0.34 * 0.34));
    const layer = (n + 1) * 4;
    const step = Math.floor(layer);
    const edge = clamp((layer - step - 0.22) / 0.56, 0, 1);
    const shelf = (step + edge * edge * (3 - 2 * edge)) / 4 - 1;
    const rounded = mix(n, shelf, terraceWeights[i]) - 0.11 * groove * groove;
    let form = rounded;
    if (alpine > 0) {
      const width = n > 0 ? 0.90 : 0.66;
      const crest = Math.max(0, 1 - (Math.hypot(n, 0.012) - 0.012) / width);
      const ridge = crest * crest;
      const parent = i === 0 ? 1 : ridgeCarry;
      const relief = i === 0 ? 1.72 : 2.25;
      form = mix(form, 0.31 * n + relief * (ridge * parent - 0.28), Math.min(0.97, 0.89 * rangeWeights[detail.range]) * alpine);
      if (i === 0) ridgeCarry = 0.3 + 0.7 * ridge;
    }
    height += amplitudes[i] * regionalStrength * form * (1 - 0.66 * canyon - 0.52 * granite);
    warpX = 0.65 * n + 0.34 * slopeY;
  }
  height += drainageHeight(direction, size, worldSeed, grade, land * scale, height, detail, rock, noiseWithSlope, hash);
  const sand = studioDistrictMask(studioMap.dunes, direction);
  const salt = studioDistrictMask(studioMap.dunes, direction, 8);
  const flat = Math.max(studioSpringWater(studioMap.springs, direction), 1 - (1 - 0.91 * sand) * (1 - salt));
  height = mix(height, land * scale, flat);
  height *= studioMap.reliefScale ?? 1;
  const depth = oceanLevel === null ? 0 : Math.max(0, oceanLevel - height);
  return { height: depth > 0 ? oceanLevel : height, depth, land, lake: false };
}
