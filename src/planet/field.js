import { getPreset } from "./presets.js";
import { sampleStudioPlanetNoise } from "../noise/studio.js";

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
const waves = [8600, 3600, 1550, 720, 340, 155, 68, 26, 6];
const amplitudes = [290, 165, 124, 86, 54, 26, 12, 4.2, 0.74];
const terraceWeights = [0.13, 0.22, 0.08, 0.12, 0.15, 0.23, 0.31, 0.4, 0.22];
const ridgeWeights = [0, 0.06, 0, 0, 0, 0, 0, 0.66, 0];
const normalWarp = [0, 0.21, 0.2, 0.32, 0.41, 0.52, 0.67, 0, 0];
const bandSeeds = [0, 1, 9, 2, 10, 3, 4, 5, 6];
const localBound = 1.22 * amplitudes.slice(2).reduce((sum, value) => sum + value, 0);
const regionalSize = (size) => clamp(size / radius, 0.32, 1);

function hash(x, y, z, salt) {
  let n =
    Math.imul(x, 0x8da6b343) ^
    Math.imul(y, 0xd8163841) ^
    Math.imul(z, 0xcb1ab31f) ^
    Math.imul(salt, 0x165667b1);
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}
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
  const scale = studioHeightScale(size);
  const detailBound =
    localBound +
    (geology === "alpine" || geology === "mixed" ? 2.4 : 1.22) *
      (amplitudes[0] + amplitudes[1]) * regionalSize(size) +
    (geology === "mesa" ? 0.07 * scale : 0);
  return [
    (map.min - padding) * scale - detailBound,
    (map.max + padding) * scale + detailBound,
  ];
}

export function studioOceanLevel(map, worldSeed, size = radius) {
  const roll = hash(0, 0, 0, worldSeed);
  if (roll >= 0x80000000) return null;
  const { side, values, min, max } = map;
  const span = max - min;
  if (span === 0) return min * studioHeightScale(size);
  // Choose a sea level by surface area. Equirectangular rows get narrower
  // toward the poles, and the last longitude column repeats the first.
  const histogram = new Float64Array(96);
  const stride = Math.max(1, Math.floor((side - 1) / 160));
  let area = 0;
  for (let y = 1; y < side - 1; y += stride) {
    const rowArea = Math.sin((Math.PI * y) / (side - 1));
    for (let x = 0; x < side - 1; x += stride) {
      const bin = Math.min(
        95,
        Math.floor(((values[y * side + x] - min) / span) * 96),
      );
      histogram[bin] += rowArea;
      area += rowArea;
    }
  }
  const coverage = 0.28 + 0.36 * (roll / 0x80000000);
  let remaining = area * coverage;
  for (let bin = 0; bin < histogram.length; bin++) {
    const weight = histogram[bin];
    if (weight > 0 && remaining <= weight)
      return (
        (min + (span * (bin + remaining / weight)) / 96) *
        studioHeightScale(size)
      );
    remaining -= weight;
  }
  return map.mean * studioHeightScale(size);
}

export function surface(
  direction,
  size = radius,
  worldSeed = seed,
  presetId,
  studioMap,
  oceanLevel = null,
  geology = "mixed",
) {
  getPreset(presetId);
  if (!studioMap)
    throw new TypeError(
      "Bake a Planet Studio noise map before sampling the surface.",
    );
  const [x, y, z] = direction;
  const land = sampleStudioPlanetNoise(studioMap, direction);
  const scale = studioHeightScale(size);
  let height = land * scale;
  // Keep the same world-space frame at every cube edge. Each band offsets
  // the next along a different axis using its height and transverse slope.
  const px = ((4 * x - 20 * y + 22 * z) * size) / 30;
  const py = ((28 * x + 10 * y + 4 * z) * size) / 30;
  const pz = ((-10 * x + 20 * y + 20 * z) * size) / 30;
  const qx = (4 * px - 4 * py + 7 * pz) / 9;
  const qy = (8 * px + py - 4 * pz) / 9;
  const qz = (px + 8 * py + 4 * pz) / 9;
  const region = regionalSize(size);
  const upland = clamp((land + 1) / 3, 0, 1);
  const regionalStrength = 0.6 + 0.62 * upland * upland * (3 - 2 * upland);
  const mountains = geology === "alpine" || geology === "mixed";
  let warpX = 1.15 * land,
    warpY = 0,
    rock = 0,
    ridgeCarry = 0,
    strataWarp = 0;
  for (let i = 0; i < waves.length; i++) {
    const regional = i < 2;
    const wave = waves[i] * (regional ? region : 1);
    const bandSeed = bandSeeds[i];
    const twisted = bandSeed % 2 === 1;
    const ribs = i >= 2 && i <= 6;
    const [n, slopeY, slopeX] = noiseWithSlope(
      ((twisted ? qx : px) * (ribs ? 1.25 : 1)) / wave + warpX,
      ((twisted ? qy : py) * (ribs ? 0.46 : 1)) / wave + warpY,
      ((twisted ? qz : pz) * (ribs ? 1.05 : 1)) / wave,
      worldSeed + 131 + bandSeed * 19,
    );
    const groove = Math.max(0, 1 - (n * n) / (0.34 * 0.34));
    const layer = (n + 1) * 4;
    const step = Math.floor(layer);
    const edge = clamp((layer - step - 0.22) / 0.56, 0, 1);
    const shelf = (step + edge * edge * (3 - 2 * edge)) / 4 - 1;
    if (i === 0) {
      const exposed = clamp((n + 0.29) / 0.61, 0, 1);
      rock = 0.36 + 0.64 * exposed * exposed * (3 - 2 * exposed);
      strataWarp = 0.38 * n;
    }
    const crest = Math.max(0, 1 - (Math.hypot(n, 0.035) - 0.035) / 0.27);
    const channel = Math.max(0, 1 - ((n - 0.27) / 0.25) ** 2);
    const rounded =
      mix(n, shelf, terraceWeights[i]) -
      (i < 7 ? 0.11 : 0.36) * groove * groove;
    const sculpted = 0.5 * n + 0.89 * crest * crest - 0.61 * channel * channel;
    let form = mix(rounded, sculpted, ridgeWeights[i] * rock);
    if (mountains && regional) {
      const width = n > 0 ? 0.88 : 0.68;
      const crest = Math.max(0, 1 - (Math.hypot(n, 0.036) - 0.036) / width);
      const ridge = crest * crest;
      const parent = i === 0 ? 1 : ridgeCarry;
      const relief = i === 0 ? 1.72 : 2.25;
      form = mix(form, 0.31 * n + relief * (ridge * parent - 0.28), 0.89);
      if (i === 0) ridgeCarry = 0.3 + 0.7 * ridge;
    }
    if (i >= 1 && i <= 6) {
      const ridge = Math.max(0, 1 - (Math.hypot(n, 0.022) - 0.022) / 0.72) ** 2;
      if (i >= 2) {
        const ridged = 0.55 * rounded + 1.05 * ridge * ridgeCarry - 0.36;
        form = mix(rounded, ridged, 0.78);
      }
      ridgeCarry = 0.3 + 0.7 * Math.min(1, 1.58 * ridge);
    }
    height += amplitudes[i] * (regional ? region * regionalStrength : 1) * form;
    if (i === 1 && geology === "mesa") {
      const strata = land / 0.165 + strataWarp + 0.24 * n;
      const bed = Math.floor(strata);
      const lip = clamp((strata - bed - 0.3) / 0.4, 0, 1);
      height +=
        (bed + lip * lip * (3 - 2 * lip) - strata) * (0.165 * scale * 0.82);
    }
    warpX = 0.65 * n + (0.34 + 0.14 * normalWarp[i]) * slopeY;
    warpY = -0.22 * normalWarp[i] * slopeX;
  }
  const depth = oceanLevel === null ? 0 : Math.max(0, oceanLevel - height);
  return { height: depth > 0 ? oceanLevel : height, depth, land, lake: false };
}
