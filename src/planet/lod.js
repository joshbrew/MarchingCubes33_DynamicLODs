import {
  dot,
  unit,
  clamp,
  radius as defaultRadius,
  elevationBound,
} from "./field.js";

// -cross(U,V) points outwards, matching the shared stitched grid winding.
const faces = [
  [
    [1, 0, 0],
    [0, 0, 1],
    [0, 1, 0],
  ],
  [
    [-1, 0, 0],
    [0, 0, -1],
    [0, 1, 0],
  ],
  [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  [
    [0, 0, 1],
    [-1, 0, 0],
    [0, 1, 0],
  ],
  [
    [0, 0, -1],
    [1, 0, 0],
    [0, 1, 0],
  ],
];
export function cube(face, u, v) {
  const [normal, x, y] = faces[face];
  return normal.map((n, i) => n + u * x[i] + v * y[i]);
}
export function project(p) {
  const a = p.map(Math.abs),
    axis = a[0] >= a[1] && a[0] >= a[2] ? 0 : a[1] >= a[2] ? 1 : 2;
  const face = axis * 2 + Number(p[axis] < 0);
  return [
    face,
    dot(p, faces[face][1]) / a[axis],
    dot(p, faces[face][2]) / a[axis],
  ];
}
// Two 20-bit tile coordinates plus face/level fit exactly in a JS number.
const maxTileLevel = 20;
const key = (face, level, x, y) =>
  (face * 32 + level) * 1099511627776 + x * 1048576 + y;
export const parentTileKey = (tile) =>
  tile.level > 0 ? key(tile.face, tile.level - 1, tile.x >> 1, tile.y >> 1) : null;
export const childTileKey = (tile, quadrant) => tile.level < maxTileLevel
  ? key(tile.face, tile.level + 1, tile.x * 2 + (quadrant & 1), tile.y * 2 + (quadrant >> 1))
  : null;
function tile(face, level, x, y) {
  const size = 2 / 2 ** level,
    u = x * size - 1,
    v = y * size - 1;
  return {
    key: key(face, level, x, y),
    face,
    level,
    x,
    y,
    size,
    u,
    v,
    dir: unit(cube(face, u + size / 2, v + size / 2)),
  };
}
function neighbor(node, leaves, edge, split) {
  const { u, v, size, level } = node,
    count = 2 ** level;
  let face = node.face;
  let x = node.x + Number(edge === 1) - Number(edge === 0);
  let y = node.y + Number(edge === 3) - Number(edge === 2);
  if (x < 0 || x >= count || y < 0 || y >= count) {
    const e = size * 1e-4;
    const a = edge === 0 ? u - e : edge === 1 ? u + size + e : u + size / 2;
    const b = edge === 2 ? v - e : edge === 3 ? v + size + e : v + size / 2;
    const [f, px, py] = project(cube(face, a, b));
    face = f;
    x = clamp(Math.floor(((px + 1) * count) / 2), 0, count - 1);
    y = clamp(Math.floor(((py + 1) * count) / 2), 0, count - 1);
  }
  const sameLevel = key(face, level, x, y);
  const peer = leaves.get(sameLevel);
  if (peer || split?.has(sameLevel)) return peer;
  for (let l = level - 1; l >= 0; l--) {
    x >>= 1;
    y >>= 1;
    const found = leaves.get(key(face, l, x, y));
    if (found) return found;
  }
  // A finer neighbor cannot require a stitch from this tile.
  return undefined;
}
export function neighbors(node, leaves) {
  return [0, 1, 2, 3].map((edge) => neighbor(node, leaves, edge));
}
function smoothstep(start, end, value) {
  const t = clamp((value - start) / (end - start), 0, 1);
  return t * t * (3 - 2 * t);
}
export function orbitDetailWeight(height, start, full) {
  return smoothstep(start, full, height) * (1 - smoothstep(500000, 850000, height));
}
class Heap {
  items = [];
  push(value) {
    const a = this.items;
    let i = a.length;
    a.push(value);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p].score >= value.score) break;
      a[i] = a[p];
      i = p;
    }
    a[i] = value;
  }
  pop() {
    const a = this.items,
      top = a[0],
      last = a.pop();
    if (!a.length) return top;
    let i = 0;
    while (i * 2 + 1 < a.length) {
      let c = i * 2 + 1;
      if (c + 1 < a.length && a[c + 1].score > a[c].score) c++;
      if (a[c].score <= last.score) break;
      a[i] = a[c];
      i = c;
    }
    a[i] = last;
    return top;
  }
}

export function selectPlanet(
  camera,
  {
    radius = defaultRadius,
    divs = 16,
    maxTiles = 576,
    pixelError = 3,
    lodScale = 1.5,
    minSpacing = 2,
    elevationBounds,
    sampleRelief,
    centerPriority = false,
    previousFocal = new Set(),
    splitBudget = Infinity,
  } = {},
  previous = new Set(),
) {
  const leaves = new Map(),
    split = new Set(),
    focalSplit = new Set(),
    heap = new Heap(),
    focalHeap = new Heap();
  const eye = camera.position,
    eyeLength = Math.hypot(...eye),
    eyeDir = unit(eye);
  const height = Math.max(1, camera.clearance ?? eyeLength - radius);
  const deepest = clamp(
    Math.ceil(Math.log2((2 * radius) / (divs * minSpacing))),
    0,
    maxTileLevel,
  );
  const [low, high] = elevationBounds ?? [-elevationBound, elevationBound];
  const inner = radius + low,
    outer = radius + high;
  const midpoint = (inner + outer) / 2,
    halfRange = (outer - inner) / 2;
  const horizon =
    Math.acos(clamp(inner / eyeLength, -1, 1)) + Math.acos(inner / outer);
  const margin = Math.min(5000, Math.max(64, height * 0.1));
  const distanceFalloff = 1 / lodScale;
  // Stretch the distance beyond the near field. A lateral multiplier can
  // increase error faster than distance falls off and refine a ring at nadir.
  const nearDistance = Math.hypot(height, Math.min(1200, Math.max(150, height * .55)));
  const orbitBlend = smoothstep(20000, 100000, height);
  const distanceFloor = nearDistance * (1 - orbitBlend);
  const nearDistanceWeight = (1 - distanceFalloff) * (1 - orbitBlend);
  const focalGain = .82;
  const orbitalGain = centerPriority
    ? (4 + 3 * smoothstep(300000, 500000, height)) * orbitDetailWeight(height, 100000, 220000)
    : 0;
  const nadirStart = Math.min(height * .12, radius * .16);
  const nadirEnd = Math.min(height * .55, radius * .60);
  const planes = camera.planes || [];
  const sidePlanes = Math.min(4, planes.length);
  const eyeForward = centerPriority ? dot(eye, camera.forward) : 0;
  const eyeRight = centerPriority ? dot(eye, camera.right) : 0;
  const eyeUp = centerPriority ? dot(eye, camera.up) : 0;
  let remainingSplits = splitBudget, deferred = false, distanceDeferred = false;
  const metrics = Array.from({ length: deepest + 1 }, (_, level) => {
    const size = 2 / 2 ** level,
      chord = Math.SQRT1_2 * size,
      spacing = (radius * size) / divs;
    return {
      lateral: radius * chord,
      bound: midpoint * chord + halfRange,
      capCos: 1 - chord * chord / 2,
      capSin: chord * Math.sqrt(1 - chord * chord / 4),
      horizon: Math.cos(Math.min(Math.PI, horizon + 2 * Math.asin(chord / 2))),
      nearby: Math.min(90, radius * size * 0.65),
      error:
        (Math.min(
          elevationBounds ? halfRange : 3300,
          spacing * (elevationBounds ? 0.25 : 0.13),
        ) +
          spacing ** 2 / (2 * radius)) *
        camera.pixelScale,
    };
  });
  function add(node) {
    leaves.set(node.key, node);
    const m = metrics[node.level],
      alignment = clamp(dot(node.dir, eyeDir), -1, 1);
    node.visible = alignment >= m.horizon;
    for (let i = 0; node.visible && i < planes.length; i++) {
      const plane = planes[i];
      node.visible =
        midpoint * dot(plane, node.dir) + plane[3] >=
        -m.bound - (i < 4 ? margin : 0);
    }
    if (node.level >= deepest) return;
    const lateral = Math.max(
      0,
      radius * Math.sqrt(2 * (1 - alignment)) - m.lateral,
    );
    if (!node.visible && lateral >= m.nearby) return;
    const distance = Math.hypot(height, lateral);
    const effectiveDistance = distance * distanceFalloff +
      Math.min(distance, distanceFloor) * nearDistanceWeight;
    let error = m.error / effectiveDistance;
    const wasFocal = previousFocal.has(node.key);
    const wasSplit = previous.has(node.key);
    const distanceThreshold = pixelError * (wasSplit && !wasFocal ? .76 : 1);
    const focalThreshold = pixelError * (wasSplit ? .76 : 1);
    const canFocus = centerPriority && node.visible;
    if (sampleRelief && height < 60000 && node.visible && node.level >= 3) {
      // Ruggedness can increase the weight by at most 1 + 1.6.
      const maxError = error * (1 + 1.6);
      if (maxError <= distanceThreshold && (!canFocus || maxError * (1 + focalGain) <= focalThreshold))
        return;
      const [ground, variation] = sampleRelief(node);
      const rugged = clamp(variation / Math.max(1, m.lateral) - 0.16, 0, 1);
      error *= 1 + rugged * 1.6;
      // The conservative globe bounds include mountains far outside this
      // patch. Fade its refinement priority across the local frustum edge.
      const viewBound = m.lateral * 1.1 + variation + Math.min(650, m.lateral) + margin;
      const fadeWidth = Math.max(margin, viewBound * .5);
      const surfaceRadius = radius + ground;
      let outside = 0;
      for (let i = 0; i < sidePlanes; i++) {
        const plane = planes[i];
        const excess = -(surfaceRadius * dot(plane, node.dir) + plane[3]) - viewBound;
        if (excess > outside) outside = excess;
        if (outside >= fadeWidth) break;
      }
      if (outside > 0) error *= 1 - .58 * Math.min(1, outside / fadeWidth);
    }
    const orbitalFocus = orbitalGain > 0 && lateral < nadirEnd ? orbitalGain : 0;
    let focus = 0;
    if (canFocus && ((orbitalFocus > 0 && error * (1 + orbitalFocus) > distanceThreshold) ||
        (error <= distanceThreshold && error * (1 + focalGain) > focalThreshold))) {
      const depth = Math.max(1, midpoint * dot(node.dir, camera.forward) - eyeForward);
      const x = (Math.abs(midpoint * dot(node.dir, camera.right) - eyeRight) - m.lateral * .35) /
        (depth * camera.tanX);
      const y = (Math.abs(midpoint * dot(node.dir, camera.up) - eyeUp) - m.lateral * .35) /
        (depth * camera.tanY);
      const edge = clamp((Math.hypot(Math.max(0, x), Math.max(0, y)) - .12) / .98, 0, 1);
      focus = 1 - edge * edge * (3 - 2 * edge);
    }
    // At orbital heights the distance pass can fill the budget before
    // ordinary center refinement. Prioritize the visible sub-camera region
    // within that pass so the extra detail still fits the same patch cap.
    const orbitalBonus = orbitalFocus > 0 && focus > 0
      ? orbitalFocus * (1 - smoothstep(nadirStart, nadirEnd, lateral)) * focus * focus
      : 0;
    const distanceError = error * (1 + orbitalBonus);
    if (distanceError > distanceThreshold) {
      // Keep near-field detail competitive when the triangle cap is tight.
      const nearPriority = centerPriority && height < 60000 && lateral < 1750
        ? 1 + .32 * (1 - smoothstep(750, 1750, lateral)) * (1 - orbitBlend)
        : 1;
      heap.push({ node, score: distanceError * nearPriority * (node.visible ? 1.15 : 1) *
        (centerPriority && wasSplit ? 1.52 : 1) });
    } else if (focus > 0) {
      const focusedError = error * (1 + focalGain * focus);
      if (focus > 0 && focusedError > focalThreshold)
        focalHeap.push({ node, score: focusedError * (wasSplit ? 1.16 : 1) });
    }
  }
  const required = new Set();
  function addRequiredSplit(node) {
    if (required.has(node)) return;
    required.add(node);
    for (let edge = 0; edge < 4; edge++) {
      const adjacent = neighbor(node, leaves, edge, split);
      if (adjacent && adjacent.level < node.level) addRequiredSplit(adjacent);
    }
  }
  for (let f = 0; f < 6; f++) add(tile(f, 0, 0, 0));
  while ((heap.items.length || (!distanceDeferred && focalHeap.items.length)) && leaves.size + 3 <= maxTiles) {
    const focal = !heap.items.length;
    const { node } = (focal ? focalHeap : heap).pop();
    if (!leaves.has(node.key)) continue;
    required.clear();
    addRequiredSplit(node);
    if (leaves.size + 3 * required.size > maxTiles) continue;
    if (remainingSplits < Infinity) {
      let newSplits = 0;
      for (const candidate of required) if (!previous.has(candidate.key)) newSplits++;
      if (newSplits > remainingSplits) {
        deferred = true;
        if (!focal) distanceDeferred = true;
        continue;
      }
      remainingSplits -= newSplits;
    }
    for (const n of required) {
      leaves.delete(n.key);
      split.add(n.key);
      if (focal) focalSplit.add(n.key);
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++)
          add(tile(n.face, n.level + 1, n.x * 2 + x, n.y * 2 + y));
    }
  }
  const visible = [];
  for (const node of leaves.values()) {
    if (!node.visible) continue;
    const { capCos, capSin, bound } = metrics[node.level];
    // Treat relief as radial when testing draw visibility. A sphere around
    // the tile adds the full elevation range sideways to every view plane.
    // Keep a guard band for camera turns between renderer selections.
    const viewMargin = margin + .09 * bound;
    let turnMargin;
    let inView = true;
    for (let i = 0; i < sidePlanes; i++) {
      const plane = planes[i];
      const alignment = dot(plane, node.dir);
      if (alignment >= capCos) continue;
      const support = alignment * capCos + Math.sqrt(Math.max(0, 1 - alignment * alignment)) * capSin;
      const outside = -(support * (support < 0 ? inner : outer) + plane[3]) - viewMargin;
      if (outside <= 0) continue;
      turnMargin ??= .09 * Math.hypot(
        midpoint * node.dir[0] - eye[0],
        midpoint * node.dir[1] - eye[1],
        midpoint * node.dir[2] - eye[2],
      );
      if (outside > turnMargin) {
        inView = false;
        break;
      }
    }
    if (!inView) {
      node.visible = false;
      continue;
    }
    let mask = 0;
    for (let edge = 0; edge < 4; edge++) {
      const adjacent = neighbor(node, leaves, edge, split);
      if (adjacent && adjacent.level < node.level) mask |= 1 << edge;
    }
    node.mask = mask;
    node.spacing = (radius * node.size) / divs;
    visible.push(node);
  }
  return { leaves, visible, split, focalSplit, deferred, advanced: remainingSplits < splitBudget };
}
