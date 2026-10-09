const cellSize = 2400,
  maxRadius = 900;
function hash(x, y, z, salt = 0) {
  let h =
    (Math.imul(x, 73856093) ^
      Math.imul(y, 19349663) ^
      Math.imul(z, 83492791) ^
      Math.imul(salt + 31, 1597334677)) >>>
    0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
function random(seed) {
  let n = seed >>> 0;
  return () => {
    n = (n + 0x6d2b79f5) >>> 0;
    let t = Math.imul(n ^ (n >>> 15), n | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function quaternion(rng) {
  const a = rng(),
    b = rng() * Math.PI * 2,
    c = rng() * Math.PI * 2;
  return [
    Math.sqrt(1 - a) * Math.sin(b),
    Math.sqrt(1 - a) * Math.cos(b),
    Math.sqrt(a) * Math.sin(c),
    Math.sqrt(a) * Math.cos(c),
  ];
}
const heroes = [
  {
    id: "island",
    kind: 2,
    variant: 0,
    position: [420, -70, -250],
    radius: 440,
    rotation: [0, 0, 0, 1],
    tint: [0.68, 0.87, 0.78],
  },
  {
    id: "planet",
    kind: 1,
    variant: 0,
    position: [-1300, 430, -1900],
    radius: 880,
    rotation: [
      0.25,
      0.08,
      0.14,
      Math.sqrt(1 - 0.25 ** 2 - 0.08 ** 2 - 0.14 ** 2),
    ],
    tint: [0.45, 0.72, 0.91],
  },
  {
    id: "asteroid",
    kind: 0,
    variant: 2,
    position: [-230, 100, 500],
    radius: 185,
    rotation: [
      0.16,
      0.34,
      0.11,
      Math.sqrt(1 - 0.16 ** 2 - 0.34 ** 2 - 0.11 ** 2),
    ],
    tint: [0.63, 0.51, 0.39],
  },
];
function chunk(x, y, z) {
  const rng = random(hash(x, y, z)),
    bodies = [];
  for (let i = 0; i < 7; i++) {
    const roll = rng(),
      kind = roll < 0.07 ? 1 : roll < 0.17 ? 2 : 0;
    bodies.push({
      id: `${x}:${y}:${z}:${i}`,
      kind,
      variant: Math.floor(rng() * 4),
      position: [
        (x + rng()) * cellSize,
        (y + rng()) * cellSize,
        (z + rng()) * cellSize,
      ],
      radius:
        kind === 1
          ? 350 + rng() * 500
          : kind === 2
            ? 180 + rng() * 300
            : 35 + rng() * 125,
      rotation: quaternion(rng),
      tint:
        kind === 0
          ? [0.42 + rng() * 0.3, 0.36 + rng() * 0.2, 0.3 + rng() * 0.2]
          : [0.4 + rng() * 0.3, 0.65 + rng() * 0.2, 0.7 + rng() * 0.25],
    });
  }
  for (const body of heroes)
    if (
      body.position.every(
        (v, axis) => Math.floor(v / cellSize) === [x, y, z][axis],
      )
    )
      bodies.push({
        ...body,
        position: body.position.slice(),
        rotation: body.rotation.slice(),
        tint: body.tint.slice(),
      });
  return bodies;
}
function visibleSphere(relative, radius, planes) {
  return planes.every(
    (p) =>
      p[0] * relative[0] + p[1] * relative[1] + p[2] * relative[2] + p[3] >=
      -radius,
  );
}
function sectors(position, planes, distance, budget = 2048) {
  const origin = position.map((v) => Math.floor(v / cellSize)),
    range = Math.ceil((distance + maxRadius) / cellSize),
    candidates = [];
  let examined = 0;
  const bound = (Math.sqrt(3) * cellSize) / 2 + maxRadius;
  // Reject with scalar coordinates before allocating candidate cells. At 32 km
  // most of the surrounding cube is outside the view or radial cutoff.
  for (let z = -range; z <= range; z++) {
    const cz = origin[2] + z,
      rz = (cz + 0.5) * cellSize - position[2];
    const dz = Math.max(0, Math.abs(rz) - cellSize / 2);
    for (let y = -range; y <= range; y++) {
      const cy = origin[1] + y,
        ry = (cy + 0.5) * cellSize - position[1];
      const dy = Math.max(0, Math.abs(ry) - cellSize / 2);
      for (let x = -range; x <= range; x++) {
        examined++;
        const cx = origin[0] + x,
          rx = (cx + 0.5) * cellSize - position[0];
        const dx = Math.max(0, Math.abs(rx) - cellSize / 2);
        const near = Math.hypot(dx, dy, dz);
        if (near > distance + maxRadius) continue;
        let visible = true;
        for (const p of planes)
          if (p[0] * rx + p[1] * ry + p[2] * rz + p[3] < -bound) {
            visible = false;
            break;
          }
        if (!visible) continue;
        candidates.push({
          key: `${cx}:${cy}:${cz}`,
          cell: [cx, cy, cz],
          distance: near,
        });
      }
    }
  }
  candidates.sort(
    (a, b) => a.distance - b.distance || a.key.localeCompare(b.key),
  );
  return {
    cells: candidates.slice(0, budget),
    examined,
    requested: candidates.length,
    limited: candidates.length > budget,
  };
}
function field(kind, variant, x, y, z, { caves = false } = {}) {
  const seed = variant * 1.713,
    noise =
      Math.sin(x * 5.3 + seed) *
      Math.cos(y * 4.1 - seed) *
      Math.sin(z * 6.2 + 1.3);
  if (kind === 0) {
    const r = Math.hypot(x / 1.05, y / 0.87, z / 0.96),
      rough =
        0.055 * noise +
        0.025 * Math.sin(x * 13 + seed) * Math.sin(y * 11) * Math.cos(z * 9);
    const crater =
      0.07 *
      Math.exp(-65 * ((x - 0.46) ** 2 + (y - 0.22) ** 2 + (z - 0.35) ** 2));
    return r - 0.67 - rough + crater;
  }
  if (kind === 1) {
    const ringed = variant % 2 === 0,
      r = Math.hypot(x, y, z),
      sphere =
        r -
        (ringed ? 0.6 : 0.75) -
        0.025 * noise -
        0.012 * Math.sin(x * 17 + seed) * Math.cos(z * 13);
    return ringed
      ? Math.min(sphere, Math.hypot(Math.hypot(x, z) - 0.82, y) - 0.055)
      : sphere;
  }
  const horizontal = Math.hypot(x, z),
    edge = 0.7 + 0.05 * Math.sin(x * 8 + seed) * Math.cos(z * 7);
  const top = 0.23 + 0.09 * Math.sin(x * 5 + seed) * Math.cos(z * 6),
    bottom = -0.78 + 0.8 * Math.pow(horizontal, 1.1) + 0.035 * noise;
  const solid = Math.max(horizontal - edge, y - top, bottom - y);
  // Optional carved cave, not missing mesh geometry. Solid islands are the
  // default so an intentional cutout cannot be mistaken for an LOD defect.
  return caves
    ? Math.max(solid, 0.235 - Math.hypot(x - 0.48, y + 0.1, z - 0.04))
    : solid;
}
function gradient(kind, variant, x, y, z, options) {
  const e = 0.0015;
  const n = [
    field(kind, variant, x + e, y, z, options) -
      field(kind, variant, x - e, y, z, options),
    field(kind, variant, x, y + e, z, options) -
      field(kind, variant, x, y - e, z, options),
    field(kind, variant, x, y, z + e, options) -
      field(kind, variant, x, y, z - e, options),
  ];
  const length = Math.hypot(...n) || 1;
  return n.map((v) => v / length);
}
const meshDivisions = [
    [48, 36, 28, 20, 16, 10, 6, 4],
    [64, 48, 36, 28, 24, 16, 12, 8],
    [64, 48, 32, 24, 16, 10, 6, 4],
  ],
  meshLevels = 8;
const meshColors = [
  "#ff4d30",
  "#ffa52e",
  "#ebd948",
  "#43b879",
  "#288fff",
  "#36cbd9",
  "#8276ff",
  "#bd70e8",
];
const pointColors = [
  "#43ebd9",
  "#7178ff",
  "#b855fa",
  "#d9a6ff",
  "#f09dc8",
  "#beb8e8",
  "#9aa9cc",
  "#778399",
];
const pointTiers = [8192, 2048, 512, 128, 32, 8, 2, 1];
const distanceBands = [0.12, 0.25, 0.5, 1, 2, 4, 6];
const meshErrors = [
  [0.005, 0.009, 0.016, 0.027, 0.05, 0.08, 0.14, 0.25],
  [0.003, 0.005, 0.01, 0.018, 0.028, 0.04, 0.065, 0.12],
  [0.003, 0.006, 0.013, 0.024, 0.045, 0.08, 0.14, 0.25],
];
function chooseLOD(
  body,
  position,
  pixelScale,
  {
    mode = "mesh",
    quality = 3,
    uniform = false,
    pointSize = 2,
    lodDistance = 4000,
    nearRadius = 250,
    maxMeshLevel = meshLevels - 1,
  },
  previous,
) {
  const centerDistance = Math.hypot(
      body.position[0] - position[0],
      body.position[1] - position[1],
      body.position[2] - position[2],
    ),
    surfaceDistance = Math.max(0, centerDistance - body.radius);
  const distance = Math.max(1, centerDistance - body.radius * 0.45);
  const pixels = (2 * body.radius * 0.8 * pixelScale) / distance;
  const mesh =
    mode === "mesh" ||
    (mode === "hybrid" &&
      (uniform || pixels > (previous?.representation === "mesh" ? 30 : 42)));
  let result;
  if (mesh) {
    const errors = meshErrors[body.kind] || meshErrors[0];
    const projected = (level) => (errors[level] * pixels) / 2;
    const bandScale = Math.max(1, lodDistance),
      last = Math.max(0, Math.min(meshLevels - 1, maxMeshLevel));
    let errorLevel = 0;
    while (errorLevel < last && projected(errorLevel + 1) <= quality * 0.35)
      errorLevel++;
    let distanceLevel = 0;
    while (
      distanceLevel < last &&
      surfaceDistance > distanceBands[distanceLevel] * bandScale
    )
      distanceLevel++;
    let level =
      uniform || surfaceDistance <= nearRadius
        ? 0
        : Math.min(distanceLevel, errorLevel);
    if (
      !uniform &&
      surfaceDistance > nearRadius &&
      previous?.representation === "mesh"
    ) {
      const p = previous.level,
        low = p === 0 ? 0 : distanceBands[p - 1] * bandScale * 0.85,
        high =
          p === meshLevels - 1 ? Infinity : distanceBands[p] * bandScale * 1.15;
      if (
        p <= last &&
        projected(p) <= quality * 0.42 &&
        surfaceDistance >= low &&
        surfaceDistance <= high &&
        (p === last ||
          projected(p + 1) >= quality * 0.28 ||
          p === distanceLevel)
      )
        level = p;
    }
    result = { representation: "mesh", level, rank: level, pixels };
  } else {
    // Hybrid clouds hand off at a small silhouette; sample densely enough for
    // the chosen dot size rather than leaving large random holes in a body.
    const spacing =
      mode === "hybrid" ? Math.min(quality, pointSize * 0.7) : quality;
    const count = uniform ? 8192 : Math.PI * (pixels / (2 * spacing)) ** 2;
    let level = pointTiers.length - 1;
    while (level > 0 && pointTiers[level] < count) level--;
    if (
      !uniform &&
      previous?.representation === "points" &&
      pointTiers[previous.level] >= count * 0.8 &&
      (previous.level === pointTiers.length - 1 ||
        pointTiers[previous.level + 1] < count * 1.2)
    )
      level = previous.level;
    result = {
      representation: "points",
      level,
      rank: level + meshLevels,
      pixels,
    };
  }
  return result;
}
export {
  cellSize,
  maxRadius,
  hash,
  random,
  chunk,
  heroes,
  visibleSphere,
  sectors,
  field,
  gradient,
  meshDivisions,
  meshLevels,
  meshColors,
  pointColors,
  pointTiers,
  chooseLOD,
};
export default {
  cellSize,
  maxRadius,
  hash,
  random,
  chunk,
  heroes,
  visibleSphere,
  sectors,
  field,
  gradient,
  meshDivisions,
  meshLevels,
  meshColors,
  pointColors,
  pointTiers,
  chooseLOD,
};
