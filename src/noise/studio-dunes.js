import { studioRegionWeights } from "./studio.js";
import { districtAtlasSide } from "./studio-district.js";

const tau = 2 * Math.PI;
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const mix = (a, b, t) => a + (b - a) * t;
function smooth(lo, hi, x) {
  const t = clamp((x - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

function sphereDirection(x, y, span) {
  const theta = Math.PI * y / span, phi = tau * x / span;
  return [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
}

function duneRidge(phase, slip) {
  const t = phase - Math.floor(phase);
  const profile = Math.min(t / slip, (1 - t) / (1 - slip));
  return profile * profile * (1.32 - 0.32 * profile);
}

// Carve the host basin only where sand and salt can accumulate. High ribs
// of the original bedrock remain exposed and interrupt the moving dunes.
export function bakeStudioDunes(values, side, seed, variation, glacialSites, landmarks, regions) {
  const strength = smooth(0.32, 0.76, variation);
  if (side < 513 || strength <= 0) return;
  const span = side - 1, yStep = Math.PI / span;
  const wrap = (x) => ((x % span) + span) % span;
  const at = (x, y) => values[clamp(Math.round(y), 0, span) * side + wrap(Math.round(x))];
  let rng = Math.imul(seed ^ (seed >>> 16), 0x846ca68b) ^ 0x1b56c4e9;
  const random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  const occupied = [
    ...glacialSites.map(({ head }) => head),
    ...Object.values(landmarks).flat().map(({ target }) => target),
  ];
  const samples = [];
  for (let j = 0; j < 20; j++) {
    const y = Math.acos(1 - (j + 0.5) / 10) / yStep;
    for (let i = 0; i < 36; i++) samples.push(at((i + 0.5) * span / 36, y));
  }
  samples.sort((a, b) => a - b);
  const highland = samples[Math.floor(samples.length * 0.75)];
  let best;
  for (let j = 0; j < 18; j++) {
    for (let i = 0; i < 36; i++) {
      const x = (i + random()) * span / 36;
      const y = (0.23 + 0.54 * (j + random()) / 18) * span;
      const dir = sphereDirection(x, y, span);
      const light = 0.54 * dir[0] + 0.45 * dir[1] + 0.71 * dir[2];
      if (light < 0.22 || occupied.some((p) =>
        p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2] > 0.934)) continue;
      const xStep = tau * Math.sin(y * yStep) / span;
      const radius = 0.066 + 0.027 * random();
      const outer = Array.from({ length: 8 }, (_, k) => {
        const angle = k * tau / 8;
        return at(x + radius * Math.cos(angle) / xStep, y + radius * Math.sin(angle) / yStep);
      });
      const center = at(x, y);
      if (center < highland - 0.12) continue;
      const mean = outer.reduce((sum, h) => sum + h, 0) / outer.length;
      const relief = Math.max(...outer) - Math.min(...outer);
      const [, canyon, , volcanic] = studioRegionWeights({ regions }, dir);
      const score = 0.80 * light - 0.52 * Math.abs(center - highland - 0.17) +
        0.55 * clamp(mean - center, -0.6, 0.65) -
        0.26 * clamp(relief - 0.33, 0, 1.6) +
        0.30 * canyon + 0.39 * volcanic + 0.18 * random();
      if (!best || score > best.score) best = { x, y, xStep, radius, center, mean, volcanic, score };
    }
  }
  if (!best) return;
  const { x, y, xStep, radius, center, mean, volcanic } = best;
  const bearing = random() * tau, dx = Math.cos(bearing), dy = Math.sin(bearing);
  const phase = random() * tau;
  const mode = (Math.imul(seed ^ (seed >>> 17), 0x7feb352d) >>> 0) % 3;
  const frequency = 3.05 + 1.24 * random();
  const pigment = clamp(0.70 * volcanic + 0.55 * random() - 0.10, 0, 1);
  const floor = mix(center, mean, 0.19);
  const panWidth = 0.19 + 0.16 * random();
  const panLength = panWidth * (0.68 + 0.58 * random());
  let panX = 0, panY = 0, panLevel = Infinity;
  for (let i = 0; i < 18; i++) {
    const u = 0.14 + 0.56 * random(), v = 0.86 * (random() - 0.5);
    const h = at(x + (dx * u - dy * v) * radius / xStep, y + (dy * u + dx * v) * radius / yStep);
    if (h < panLevel) {
      panX = u;
      panY = v;
      panLevel = h;
    }
  }
  panLevel = Math.max(floor - 0.19, panLevel - 0.055);
  const field = Array.from({ length: 20 + Math.floor(12 * random()) }, () => ({
    x: 1.94 * (random() - 0.5), y: 1.90 * (random() - 0.5),
    length: 0.15 + 0.20 * random(), width: 0.17 + 0.23 * random(),
    height: 0.09 + 0.15 * random(),
    curve: 0.22 + 0.60 * random(),
  }));

  const halfX = 1.37 * radius / xStep, halfY = 1.37 * radius / yStep;
  const chart = [x / span, y / span, halfX / span, halfY / span];
  const mask = new Uint32Array(districtAtlasSide ** 2);
  const result = { height: 0, sand: 0, salt: 0 };
  function sample(col, row, host) {
    const east = (col - x) * xStep / radius, south = (row - y) * yStep / radius;
    const u = dx * east + dy * south, v = dx * south - dy * east;
    const edge = 1 - smooth(0.71, 1.21, Math.hypot(u * 0.95, v));
    const ground = floor + 0.12 * v + 0.075 * u * u;
    const rock = smooth(0.19, 0.59, host - ground);
    const transport = smooth(-0.63, 0.62, 0.65 * Math.sin(5.7 * v + phase + 1.5 * u) +
      0.36 * Math.cos(7.2 * u - 4.5 * v));
    const sand = edge * (1 - rock) * mix(0.53, 1, transport);
    const pan = Math.hypot((u - panX) / panLength, (v - panY) / panWidth) +
      0.10 * Math.sin(17 * v + 5 * u + phase);
    const salt = edge * (1 - smooth(0.63, 1.23, pan)) *
      (1 - smooth(panLevel + 0.15, panLevel + 0.33, host));
    let dunes;
    if (mode === 1) {
      dunes = 0;
      for (const bed of field) {
        const across = (v - bed.y) / bed.width;
        if (Math.abs(across) >= 1) continue;
        const acrossSq = across * across;
        const t = (u - bed.x) / bed.length - bed.curve * acrossSq;
        const crescent = (1 - smooth(0.06, 1, Math.abs(across))) * smooth(-1.0, 0.48, t) *
          (1 - smooth(0.48, 0.83, t));
        dunes = Math.max(dunes, bed.height * crescent);
      }
    } else {
      const lane = u + 0.095 * Math.sin(4.6 * v + phase) + 0.054 * Math.cos(10 * v - 3.4 * u);
      const primary = duneRidge(frequency * lane + 0.18 * Math.sin(v * 7 + phase), 0.76);
      if (mode === 2) {
        const cross = duneRidge(frequency * (v * 0.67 - 0.77 * u + 0.08 * Math.sin(u * 8 + phase)), 0.68);
        const third = duneRidge(frequency * (v * 0.72 + 0.63 * u + 0.13 * Math.sin(v * 6 - phase)), 0.72);
        dunes = 0.13 * primary + 0.115 * cross * third + 0.082 * primary * Math.max(cross, third);
      } else {
        dunes = 0.22 * primary;
      }
    }
    const drift = mix(host, ground + dunes * mix(0.49, 1.18, transport), sand * 0.92);
    result.height = mix(host, mix(drift, panLevel, salt * 0.95), strength);
    result.sand = sand * (1 - salt) * strength;
    result.salt = salt * strength;
  }

  const last = districtAtlasSide - 1;
  for (let row = 0; row <= last; row++) {
    for (let col = 0; col <= last; col++) {
      const px = x + (2 * col / last - 1) * halfX, py = y + (2 * row / last - 1) * halfY;
      sample(px, py, at(px, py));
      mask[row * districtAtlasSide + col] = 0x3f000000 |
        Math.round(255 * result.sand) | (Math.round(255 * result.salt) << 8) | (Math.round(255 * pigment) << 16);
    }
  }
  for (let row = Math.ceil(y - halfY); row <= Math.floor(y + halfY); row++) {
    for (let col = Math.ceil(x - halfX); col <= Math.floor(x + halfX); col++) {
      const index = row * side + wrap(col);
      sample(col, row, values[index]);
      values[index] = result.height;
    }
    values[row * side + span] = values[row * side];
  }
  const look = (u, v) => sphereDirection(x + (u * dx - v * dy) * radius / xStep,
    y + (u * dy + v * dx) * radius / yStep, span);
  landmarks.dunes = [{ overlook: look(0.94, 0.69), target: look(-0.07, 0) }];
  const west = look(-0.01, 0), east = look(0.01, 0);
  const wind = east.map((v, i) => v - west[i]);
  const length = Math.hypot(...wind);
  return { chart, values: mask, side: districtAtlasSide, wind: wind.map((v) => v / length) };
}
