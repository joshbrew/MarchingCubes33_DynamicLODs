import { extractCPU } from "../marchingCubesCPU.js";
import { studioRegionWeights } from "./studio.js";

const tau = 2 * Math.PI;
function direction(theta, phi) {
  return [Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi)];
}
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// Negative is solid. Excavation passes through the body in Z and opens
// underneath it in Y, leaving solid piers and a continuous lintel.
export function rockSpanField(x, y, z, shape) {
  const { bend, twist, thickness, peak, portals } = shape;
  const face = z - bend * x * x + twist * x * y;
  const roof = peak - 0.17 * x - 0.13 * Math.cos(4.1 * x + twist);
  const crown = Math.hypot(x * 0.87 + 0.08 * y, (y - 0.15) / roof, face / thickness) - 1;
  const shoulder = Math.hypot((Math.abs(x) - 0.83 - 0.11 * y) / 0.34,
    (y + 0.28) / 0.68, (face + 0.06 * x) / (thickness * 1.48)) - 1;
  const seam = Math.max(0, 0.20 - Math.abs(crown - shoulder));
  const outer = Math.min(crown, shoulder) - 1.25 * seam * seam;
  const beds = 0.034 * Math.sin(19 * y + 2.3 * x + 2.1 * face) +
    0.025 * Math.sin(12 * x + 7.3 * face + 5 * y) * Math.cos(10 * y - 3 * face);
  let air = Infinity;
  for (const { at, width, height, lean } of portals) {
    const across = (x - at - lean * y - 0.05 * z) / width;
    const crown = Math.max(0, y + 0.08 + 0.05 * z) / height;
    air = Math.min(air, Math.hypot(across, crown) - 1);
  }
  return Math.max(outer + beds, -air + 0.37 * beds);
}

export function meshRockSpan(shape) {
  const grid = { x: 55, y: 45, z: 29 };
  const lo = [-1.39, -1.05, -0.88], hi = [1.39, 1.60, 0.88];
  const step = hi.map((v, i) => (v - lo[i]) / ([grid.x, grid.y, grid.z][i] - 1));
  const field = new Float32Array(grid.x * grid.y * grid.z);
  for (let z = 0; z < grid.z; z++)
    for (let y = 0; y < grid.y; y++)
      for (let x = 0; x < grid.x; x++)
        field[(z * grid.y + y) * grid.x + x] = rockSpanField(
          lo[0] + x * step[0], lo[1] + y * step[1], lo[2] + z * step[2], shape,
        );
  const triangles = extractCPU(field, grid, 0, "mc33");
  const vertices = new Float32Array(triangles.length * 2);
  for (let i = 0; i < triangles.length; i += 3) {
    const x = lo[0] + triangles[i] * (hi[0] - lo[0]);
    const y = lo[1] + triangles[i + 1] * (hi[1] - lo[1]);
    const z = lo[2] + triangles[i + 2] * (hi[2] - lo[2]);
    const e = 0.004;
    vertices.set([x, y, z,
      rockSpanField(x + e, y, z, shape) - rockSpanField(x - e, y, z, shape),
      rockSpanField(x, y + e, z, shape) - rockSpanField(x, y - e, z, shape),
      rockSpanField(x, y, z + e, shape) - rockSpanField(x, y, z - e, shape),
    ], i * 2);
  }
  return vertices;
}

export function bakeStudioRockSpans(values, side, seed, variation, landmarks, regions) {
  if (side < 513 || variation < 0.38) return;
  const last = side - 1;
  const occupied = Object.values(landmarks).flat().map(({ target }) => target);
  const at = (x, y) => values[Math.round(y) * side + ((Math.round(x) % last) + last) % last];
  const sorted = [];
  for (let y = 12; y < last; y += 19)
    for (let x = 1; x < last; x += 19) sorted.push(at(x, y));
  sorted.sort((a, b) => a - b);
  const high = sorted[Math.floor(0.77 * sorted.length)];
  let state = Math.imul(seed ^ (seed >>> 17), 0x9e3779b1) ^ 0x431e891b;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const candidates = [];
  for (let j = 0; j < 19; j++) {
    for (let i = 0; i < 33; i++) {
      const x = (i + random()) * last / 33, y = (0.22 + 0.56 * (j + random()) / 19) * last;
      const h = at(x, y);
      if (h < high - 0.18) continue;
      const theta = Math.PI * y / last, phi = tau * x / last;
      const dir = direction(theta, phi);
      const light = dot(dir, [0.54, 0.45, 0.71]);
      if (light < 0.25 || occupied.some((p) => dot(p, dir) > 0.998)) continue;
      const [, canyon, granite, volcanic] = studioRegionWeights({ regions }, dir);
      const dx = at(x + 2, y) - at(x - 2, y);
      const dy = at(x, y + 4) - at(x, y - 4);
      const grade = Math.hypot(dx, dy);
      const score = 0.80 * light + 0.56 * canyon + 0.32 * granite + 0.24 * volcanic -
        0.51 * Math.abs(h - high - 0.21) - 0.38 * Math.abs(grade - 0.31) + 0.22 * random();
      candidates.push({ dir, theta, phi, dx, dy, canyon, volcanic, score });
    }
  }
  const selected = [];
  for (const candidate of candidates.sort((a, b) => b.score - a.score)) {
    if (selected.some((p) => dot(p.dir, candidate.dir) > 0.94)) continue;
    selected.push(candidate);
    if (selected.length === 2) break;
  }
  if (!selected.length) return;
  const rockSpans = selected.map(({ dir, theta, phi, dx, dy, canyon, volcanic }) => {
    const east = [-Math.sin(phi), 0, Math.cos(phi)];
    const south = [Math.cos(theta) * Math.cos(phi), -Math.sin(theta), Math.cos(theta) * Math.sin(phi)];
    const bearing = Math.atan2(dy, dx) + Math.PI / 2 + (random() - 0.5) * 1.55;
    const span = east.map((v, i) => v * Math.cos(bearing) + south[i] * Math.sin(bearing));
    const depth = east.map((v, i) => -v * Math.sin(bearing) + south[i] * Math.cos(bearing));
    const size = 240 + 250 * random(), rise = 0.64 + 0.45 * random();
    const shape = {
      bend: 0.25 * (random() - 0.5), twist: 0.35 * (random() - 0.5),
      thickness: 0.23 + 0.13 * random(), peak: 0.79 + 0.20 * random(), portals: [],
    };
    if (random() < 0.39) {
      shape.portals.push(
        { at: -0.41, width: 0.24 + 0.10 * random(), height: 0.40 + 0.14 * random(), lean: -0.11 },
        { at: 0.34, width: 0.29 + 0.10 * random(), height: 0.49 + 0.13 * random(), lean: 0.13 },
      );
    } else {
      shape.portals.push({ at: (random() - 0.5) * 0.24, width: 0.52 + 0.17 * random(),
        height: 0.49 + 0.14 * random(), lean: (random() - 0.5) * 0.36 });
    }
    const facing = dot(depth, [0.54, 0.45, 0.71]) >= 0 ? 1 : -1;
    const eye = dir.map((v, i) => v + (depth[i] * facing * size * 3.6 + span[i] * size * 0.78) / 262144);
    const len = Math.hypot(...eye);
    return {
      direction: dir, span, depth, size, rise,
      tint: Math.min(1, 0.24 + 0.59 * canyon - 0.20 * volcanic + 0.27 * random()),
      site: { target: dir, overlook: eye.map((v) => v / len) },
      vertices: meshRockSpan(shape),
    };
  });
  landmarks.arches = rockSpans.map(({ site }) => site);
  return rockSpans;
}
