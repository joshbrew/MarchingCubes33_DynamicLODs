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
const key = (face, level, x, y) =>
  (face * 32 + level) * 1099511627776 + x * 1048576 + y;
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
function neighbor(node, leaves, edge) {
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
  for (let l = level; l >= 0; l--, x >>= 1, y >>= 1) {
    const found = leaves.get(key(face, l, x, y));
    if (found) return found;
  }
  // A finer neighbor cannot require a stitch from this tile.
  return undefined;
}
export function neighbors(node, leaves) {
  return [0, 1, 2, 3].map((edge) => neighbor(node, leaves, edge));
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
  } = {},
  previous = new Set(),
) {
  const leaves = new Map(),
    split = new Set(),
    heap = new Heap();
  const eye = camera.position,
    eyeLength = Math.hypot(...eye),
    eyeDir = unit(eye);
  const height = Math.max(1, camera.clearance ?? eyeLength - radius);
  const deepest = clamp(
    Math.ceil(Math.log2((2 * radius) / (divs * minSpacing))),
    0,
    20,
  );
  const [low, high] = elevationBounds ?? [-elevationBound, elevationBound];
  const inner = radius + low,
    outer = radius + high;
  const midpoint = (inner + outer) / 2,
    halfRange = (outer - inner) / 2;
  const horizon =
    Math.acos(clamp(inner / eyeLength, -1, 1)) + Math.acos(inner / outer);
  const margin = Math.min(5000, Math.max(64, height * 0.1));
  const planes = camera.planes || [];
  const metrics = Array.from({ length: deepest + 1 }, (_, level) => {
    const size = 2 / 2 ** level,
      chord = Math.SQRT1_2 * size,
      spacing = (radius * size) / divs;
    return {
      lateral: radius * chord,
      bound: midpoint * chord + halfRange,
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
    let weight = 1 + (lodScale - 1) * clamp((lateral - 150) / 1800, 0, 1);
    if (sampleRelief && height < 60000 && node.visible && node.level >= 3) {
      const [ground, variation] = sampleRelief(node);
      const rugged = clamp(variation / Math.max(1, m.lateral) - 0.16, 0, 1);
      weight *= 1 + rugged * 1.6;
      // The conservative globe bounds include mountains far outside this
      // patch. Deprioritize tiles outside the view at their local elevation.
      const viewBound = m.lateral * 1.1 + variation + Math.min(650, m.lateral);
      for (let i = 0; i < Math.min(4, planes.length); i++) {
        if (
          (radius + ground) * dot(planes[i], node.dir) + planes[i][3] <
          -viewBound - margin
        ) {
          weight *= 0.42;
          break;
        }
      }
    }
    const error = (m.error * weight) / distance;
    if (error > pixelError * (previous.has(node.key) ? 0.8 : 1))
      heap.push({ node, score: error * (node.visible ? 1.15 : 1) });
  }
  for (let f = 0; f < 6; f++) add(tile(f, 0, 0, 0));
  while (heap.items.length && leaves.size + 3 <= maxTiles) {
    const { node } = heap.pop();
    if (!leaves.has(node.key)) continue;
    const required = new Set();
    function addSplit(n) {
      if (required.has(n)) return;
      required.add(n);
      for (let edge = 0; edge < 4; edge++) {
        const other = neighbor(n, leaves, edge);
        if (other && other.level < n.level) addSplit(other);
      }
    }
    addSplit(node);
    if (leaves.size + 3 * required.size > maxTiles) continue;
    for (const n of required) {
      leaves.delete(n.key);
      split.add(n.key);
      for (let y = 0; y < 2; y++)
        for (let x = 0; x < 2; x++)
          add(tile(n.face, n.level + 1, n.x * 2 + x, n.y * 2 + y));
    }
  }
  const visible = [];
  for (const node of leaves.values()) {
    if (!node.visible) continue;
    let mask = 0;
    neighbors(node, leaves).forEach((n, i) => {
      if (n && n.level < node.level) mask |= 1 << i;
    });
    visible.push({ ...node, mask, spacing: (radius * node.size) / divs });
  }
  return { leaves, visible, split };
}
