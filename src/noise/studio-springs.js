import { studioRegionWeights } from "./studio.js";
import { districtAtlasSide, studioDistrictMask } from "./studio-district.js";

const tau = 2 * Math.PI;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const mix = (a, b, t) => a + (b - a) * t;
function smooth(lo, hi, value) {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

function direction(x, y, span) {
  const phi = tau * x / span, theta = Math.PI * y / span;
  const horizontal = Math.sin(theta);
  return [horizontal * Math.cos(phi), Math.cos(theta), horizontal * Math.sin(phi)];
}

export function studioSpringWater(springs, dir) {
  return smooth(0.48, 0.92, studioDistrictMask(springs, dir));
}

// Search the finished runoff terrain for a moderate, sunlit slope well
// above the low basins. The terraces then follow that slope downhill.
export function bakeStudioSprings(values, side, seed, variation, glacialSites, landmarks, regions) {
  const amount = smooth(0.31, 0.76, variation);
  if (side < 513 || amount <= 0) return;
  const span = side - 1;
  const wrap = (x) => ((x % span) + span) % span;
  const yStep = Math.PI / span;
  const at = (x, y) => values[clamp(Math.round(y), 0, span) * side + wrap(Math.round(x))];
  const elevations = [];
  for (let row = 0; row < 24; row++) {
    const y = Math.acos(1 - (row + 0.5) / 12) / yStep;
    for (let col = 0; col < 40; col++) elevations.push(at((col + 0.5) * span / 40, y));
  }
  elevations.sort((a, b) => a - b);
  const highland = elevations[Math.floor(elevations.length * 0.74)] + 0.14;
  const busy = [
    ...glacialSites.map(({ head }) => head),
    ...Object.values(landmarks).flat().map(({ target }) => target),
  ];
  let state = Math.imul(seed ^ (seed >>> 17), 0x68bc21eb) ^ 0x714c9d65;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  let site;
  for (let row = 0; row < 17; row++) {
    for (let col = 0; col < 32; col++) {
      const x = (col + random()) * span / 32;
      const y = (0.22 + 0.56 * (row + random()) / 17) * span;
      const dir = direction(x, y, span);
      if (busy.some((p) => p[0] * dir[0] + p[1] * dir[1] + p[2] * dir[2] > 0.955)) continue;
      const light = 0.54 * dir[0] + 0.45 * dir[1] + 0.71 * dir[2];
      if (light < 0.22) continue;
      const xStep = tau * Math.sin(y * yStep) / span;
      const size = 0.042 + 0.018 * random();
      const phase = random() * tau;
      const [, canyon, granite, volcanic] = studioRegionWeights({ regions }, dir);
      for (let bearing = 0; bearing < 8; bearing++) {
        const angle = phase + bearing * tau / 8;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const high = at(x - dx * size / xStep, y - dy * size / yStep);
        const low = at(x + dx * size / xStep, y + dy * size / yStep);
        const fall = high - low;
        if (low < highland - 0.20 || fall < 0.16 || fall > 1.30) continue;
        const mid = at(x, y);
        const score = 0.92 * light - 0.60 * Math.abs(fall - 0.56) -
          0.54 * Math.abs(mid - (high + low) * 0.5) - 0.38 * Math.abs(low - highland) +
          0.31 * volcanic + 0.19 * canyon + 0.12 * granite + 0.20 * random();
        if (!site || score > site.score) site = { x, y, xStep, size, dx, dy, high, low, score };
      }
    }
  }
  if (!site) return;

  const { x, y, xStep, size, dx, dy, high, low } = site;
  const bend = 0.15 + 0.15 * random(), phase = random() * tau;
  const grade = 0.70 + 0.60 * random();
  const chemistry = random();
  const form = (Math.imul(seed ^ (seed >>> 16), 0x9e3779b1) >>> 0) % 3;
  const fan = 0.42 + 0.19 * random();
  const course = (u, branch = 0) => bend * Math.sin(2.4 * u + phase) +
    branch * fan * smooth(-0.36, 0.68, u);
  const waterLevel = (u) => mix(high, low, clamp((u + 0.95) / 1.90, 0, 1) ** grade);
  const pools = [];
  function addPool(u, branch, length, width) {
    pools.push({
      u, v: course(u, branch) + 0.17 * (random() - 0.5),
      length, width, level: waterLevel(u),
      phase: random() * tau,
      chemistry: clamp(0.82 * chemistry + 0.33 * random() - 0.06, 0, 1),
    });
  }
  function addReach(start, end, branch, count, width) {
    const spacing = (end - start) / count;
    for (let i = 0; i < count; i++) {
      const u = start + spacing * (i + 0.48 + 0.32 * (random() - 0.5));
      addPool(u, branch, spacing * (0.39 + 0.21 * random()), width * (0.62 + 0.52 * random()));
    }
  }
  if (form === 0) {
    // A broad upper shelf feeds two smaller channels down the fan.
    addPool(-0.68, 0, 0.30, 0.54 + 0.19 * random());
    addReach(-0.37, 0.97, -1, 2 + Math.floor(2 * random()), 0.31);
    addReach(-0.11, 1.00, 1, 2 + Math.floor(2 * random()), 0.36);
  } else if (form === 1) {
    addReach(-1.0, 1.04, 0, 3 + Math.floor(4 * random()), 0.54);
  } else {
    // An old, broad source basin spills into a short run of narrow steps.
    addPool(-0.54, 0, 0.55 + 0.10 * random(), 0.68 + 0.13 * random());
    addReach(0.12, 1.10, 0, 2 + Math.floor(2 * random()), 0.46);
  }
  pools.sort((a, b) => a.u - b.u);
  const extent = 2.10 * size;
  const halfX = extent / xStep, halfY = extent / yStep;
  const chart = [x / span, y / span, halfX / span, halfY / span];
  const mask = new Uint32Array(districtAtlasSide ** 2);
  const result = { height: 0, wet: 0, crust: 0, tint: 0 };
  const sample = (col, row, original) => {
    const east = (col - x) * xStep / size, south = (row - y) * yStep / size;
    const u = east * dx + south * dy, v = south * dx - east * dy;
    const cross = form === 0 ? Math.min(Math.abs(v - course(u, -1)), Math.abs(v - course(u, 1)))
      : Math.abs(v - course(u));
    const spillway = (1 - smooth(0.045, 0.16, cross)) *
      smooth(-1.23, -0.83, u) * (1 - smooth(0.89, 1.42, u));
    const runoff = waterLevel(u);
    let shaped = mix(original, Math.min(original, runoff), 0.42 * spillway);
    let wet = 0, crust = spillway * 0.43, tint = chemistry;
    for (const pool of pools) {
      const along = (u - pool.u) / pool.length, cross = (v - pool.v) / pool.width;
      if (Math.abs(along) > 1.62 || Math.abs(cross) > 1.62) continue;
      const angle = Math.atan2(cross, along);
      const lobes = 1 + 0.097 * Math.sin(3 * angle + pool.phase) + 0.042 * Math.cos(7 * angle - pool.phase);
      const d = Math.hypot(along, cross) / lobes;
      if (d >= 1.42) continue;
      // Retaining rims rise just above the water and dip along the spillway.
      const notch = smooth(0.52, 0.98, Math.cos(angle)) * (1 - smooth(0.09, 0.29, Math.abs(cross)));
      const lip = smooth(0.76, 0.93, d) * (1 - smooth(1.00, 1.24, d));
      const apron = smooth(1.02, 1.23, d) * (1 - smooth(1.27, 1.42, d));
      const shelf = pool.level + lip * (0.077 - 0.063 * notch) - 0.050 * apron;
      const cover = 1 - smooth(0.83, 1.42, d);
      shaped = mix(shaped, shelf, cover);
      const water = 1 - smooth(0.64, 0.80, d);
      const deposit = (1 - smooth(1.01, 1.42, d)) * smooth(0.58, 0.85, d);
      wet = mix(wet, water, cover);
      if (deposit > crust) {
        crust = deposit;
        tint = pool.chemistry * (0.61 + 0.39 * lip);
      }
    }
    result.height = mix(original, shaped, amount);
    result.wet = wet * amount;
    result.crust = crust * amount;
    result.tint = tint;
  };
  for (let row = Math.ceil(y - halfY); row <= Math.floor(y + halfY); row++) {
    for (let col = Math.ceil(x - halfX); col <= Math.floor(x + halfX); col++) {
      const index = row * side + wrap(col);
      sample(col, row, values[index]);
      values[index] = result.height;
    }
    values[row * side + span] = values[row * side];
  }
  const last = districtAtlasSide - 1;
  for (let row = 0; row <= last; row++) {
    for (let col = 0; col <= last; col++) {
      sample(x + (2 * col / last - 1) * halfX, y + (2 * row / last - 1) * halfY, 0);
      mask[row * districtAtlasSide + col] = 0x3f000000 |
        Math.round(255 * result.wet) | (Math.round(255 * result.crust) << 8) | (Math.round(255 * result.tint) << 16);
    }
  }
  const look = (u, v) => direction(x + (u * dx - v * dy) * size / xStep,
    y + (u * dy + v * dx) * size / yStep, span);
  landmarks.springs = [{ overlook: look(0.86, 0.82), target: look(-0.12, 0) }];
  return { chart, values: mask, side: districtAtlasSide };
}
