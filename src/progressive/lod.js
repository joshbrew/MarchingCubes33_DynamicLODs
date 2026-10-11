import { height, bounds, estimatedError } from "./field.js";

export const key = (level, x, z) => `${level}:${x}:${z}`;
export function tile(level, x, z, rootSize = 1024) {
  const size = rootSize / 2 ** level;
  return {
    key: key(level, x, z),
    level,
    x,
    z,
    size,
    ox: x * size,
    oz: z * size,
  };
}
export function children(node, rootSize = 1024) {
  return [
    tile(node.level + 1, node.x * 2, node.z * 2, rootSize),
    tile(node.level + 1, node.x * 2 + 1, node.z * 2, rootSize),
    tile(node.level + 1, node.x * 2, node.z * 2 + 1, rootSize),
    tile(node.level + 1, node.x * 2 + 1, node.z * 2 + 1, rootSize),
  ];
}
export function parent(node, rootSize = 1024) {
  return tile(
    node.level - 1,
    Math.floor(node.x / 2),
    Math.floor(node.z / 2),
    rootSize,
  );
}
export function boundsFor(node) {
  if (node.lo === undefined) {
    const h = height(node.ox + node.size / 2, node.oz + node.size / 2);
    // Each base-field partial derivative is bounded by 2.5. Across a square
    // the maximum Manhattan offset from its centre is size. The extra noise
    // octaves can differ by at most twice their summed amplitudes (<1.75 m).
    const extent = 2.5 * node.size + 1.75;
    node.lo = Math.max(bounds[0], h - extent);
    node.hi = Math.min(bounds[1], h + extent);
  }
  return node;
}
export function distanceToBounds(node, position) {
  const { lo, hi } = boundsFor(node);
  return Math.hypot(
    Math.max(node.ox - position[0], 0, position[0] - node.ox - node.size),
    Math.max(lo - position[1], 0, position[1] - hi),
    Math.max(node.oz - position[2], 0, position[2] - node.oz - node.size),
  );
}
export function visible(node, planes = []) {
  if (!planes.length) return true;
  boundsFor(node);
  return planes.every(
    ([x, y, z, w]) =>
      x * (x >= 0 ? node.ox + node.size : node.ox) +
        y * (y >= 0 ? node.hi : node.lo) +
        z * (z >= 0 ? node.oz + node.size : node.oz) +
        w >=
      0,
  );
}
export function distance(node, position) {
  const x = Math.max(node.ox, Math.min(node.ox + node.size, position[0]));
  const z = Math.max(node.oz, Math.min(node.oz + node.size, position[2]));
  return Math.hypot(
    x - position[0],
    z - position[2],
    height(x, z) - position[1],
  );
}
export function findLeaf(leaves, x, z, rootSize, maxLevel, hint = 0) {
  const lookup = (level) => {
    const size = rootSize / 2 ** level;
    return leaves.get(key(level, Math.floor(x / size), Math.floor(z / size)));
  };
  // Balanced neighbors are at the same level or one level either side.
  // Start there instead of walking every coarse ancestor for every edge.
  // Search farther out as well for partially generated, unbalanced cuts.
  const atLevel = lookup(hint);
  if (atLevel) return atLevel;
  for (let offset = 1; offset <= maxLevel; offset++) {
    if (hint - offset >= 0) {
      const found = lookup(hint - offset);
      if (found) return found;
    }
    if (hint + offset <= maxLevel) {
      const found = lookup(hint + offset);
      if (found) return found;
    }
  }
}
export function neighbors(node, leaves, rootSize = 1024, maxLevel = 10) {
  const { ox, oz, size } = node,
    e = rootSize / 2 ** maxLevel / 4;
  return [
    [ox - e, oz + size / 2, 1],
    [ox + size + e, oz + size / 2, 2],
    [ox + size / 2, oz - e, 4],
    [ox + size / 2, oz + size + e, 8],
  ].map(([x, z, mask]) => [
    findLeaf(leaves, x, z, rootSize, maxLevel, node.level),
    mask,
  ]);
}

// A complete quadtree is budgeted, including parents retained for streaming
// fallback. A split reserves all four children, never only the visible ones.
export function select(
  camera,
  planes = [],
  options = {},
  previous = new Set(),
) {
  const {
    rootSize = 1024,
    minSize = 1,
    divs = 32,
    maxNodes = 334,
    pixelError = 2,
    boundsCache,
  } = options;
  const maxLevel = Math.round(Math.log2(rootSize / minSize));
  const errors = Array.from({ length: maxLevel + 1 }, (_, level) =>
    estimatedError(rootSize / 2 ** level / divs),
  );
  function reuseBounds(n) {
    const old = boundsCache?.get(n.key);
    if (old?.size === n.size) {
      n.lo = old.lo;
      n.hi = old.hi;
    }
    return n;
  }
  const nodes = new Map(),
    leaves = new Map(),
    splits = new Set(),
    roots = [];
  const radius = Math.max(rootSize, camera.far);
  // The renderer grows rootSize for larger requested ranges before calling us.
  const loX = Math.floor((camera.position[0] - radius) / rootSize);
  const hiX = Math.floor((camera.position[0] + radius) / rootSize);
  const loZ = Math.floor((camera.position[2] - radius) / rootSize);
  const hiZ = Math.floor((camera.position[2] + radius) / rootSize);
  for (let z = loZ; z <= hiZ; z++)
    for (let x = loX; x <= hiX; x++) {
      const n = reuseBounds(tile(0, x, z, rootSize));
      roots.push(n);
      nodes.set(n.key, n);
      leaves.set(n.key, n);
    }
  if (nodes.size > maxNodes)
    throw new RangeError("Tile budget is too small for root coverage");
  const scale = camera.height / (2 * Math.tan(camera.fov / 2));
  const samplePosition = [...camera.position];
  const candidates = [];
  const score = (n) => {
    if (n.level >= maxLevel) return 0;
    const d = (n.distance ??= distance(n, camera.position));
    n.distancePosition = samplePosition;
    // Keep detail resident in every heading. Rotation only changes the cheap
    // draw cull, never the generated tile set or its topology.
    if (distanceToBounds(n, camera.position) > camera.far) return 0;
    return (
      ((errors[n.level] * scale) / Math.max(d, 0.05) / pixelError) *
      (previous.has(n.key) ? 1.2 : 1)
    );
  };
  const addCandidate = (n) => {
    const priority = score(n);
    if (priority > 1) candidates.push({ n, priority });
  };
  roots.forEach(addCandidate);
  let limited = false;
  while (candidates.length) {
    let best = 0;
    for (let i = 1; i < candidates.length; i++)
      if (candidates[i].priority > candidates[best].priority) best = i;
    const { n } = candidates.splice(best, 1)[0];
    if (!leaves.has(n.key)) continue;
    const closure = new Map();
    function requireSplit(item) {
      if (closure.has(item.key)) return;
      closure.set(item.key, item);
      for (const [neighbor] of neighbors(item, leaves, rootSize, maxLevel))
        if (neighbor && neighbor.level < item.level) requireSplit(neighbor);
    }
    requireSplit(n);
    if (nodes.size + closure.size * 4 > maxNodes) {
      limited = true;
      continue;
    }
    for (const item of [...closure.values()].sort(
      (a, b) => a.level - b.level,
    )) {
      leaves.delete(item.key);
      splits.add(item.key);
      for (const child of children(item, rootSize)) {
        reuseBounds(child);
        nodes.set(child.key, child);
        leaves.set(child.key, child);
        addCandidate(child);
      }
    }
  }
  return { nodes, leaves, splits, roots, rootSize, maxLevel, limited };
}

// Select a complete resident cut. A parent remains visible until all children
// exist. Then coarsen any temporary >2:1 adjacency caused by staggered builds.
export function residentCut(plan, ready) {
  const leaves = new Map();
  function visit(n) {
    if (!ready(n.key)) return;
    if (!plan.splits.has(n.key)) {
      leaves.set(n.key, n);
      return;
    }
    const kids = children(n, plan.rootSize).map(
      (c) => plan.nodes.get(c.key) || c,
    );
    if (kids.every((c) => ready(c.key))) kids.forEach(visit);
    else leaves.set(n.key, n);
  }
  plan.roots.forEach(visit);
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of leaves.values()) {
      if (
        neighbors(n, leaves, plan.rootSize, plan.maxLevel).some(
          ([other]) => other && n.level - other.level > 1,
        )
      ) {
        const p = plan.nodes.get(parent(n, plan.rootSize).key);
        if (!p || !ready(p.key)) throw new Error("Resident ancestor missing");
        for (const [id, child] of leaves) {
          if (
            child.ox >= p.ox &&
            child.oz >= p.oz &&
            child.ox + child.size <= p.ox + p.size &&
            child.oz + child.size <= p.oz + p.size
          )
            leaves.delete(id);
        }
        leaves.set(p.key, p);
        changed = true;
        break;
      }
    }
  }
  return leaves;
}
export function seamMask(node, leaves, rootSize, maxLevel) {
  let mask = 0;
  for (const [other, side] of neighbors(node, leaves, rootSize, maxLevel))
    if (other && other.level < node.level) mask |= side;
  return mask;
}

// Texture resolution and triangle resolution are independent. Balanced tiles
// and distant tiles can need fewer vertices than their stored samples.
// Keep siblings at one mesh resolution so a large edge meeting two half-size
// tiles has the same spacing along both halves of that edge.
export function meshLevels(leaves, camera, rootSize, maxLevel, options = {}) {
  const { divs = 32, pixelError = 2 } = options,
    minDivs = Math.min(4, divs);
  const scale = camera.height / (2 * Math.tan(camera.fov / 2));
  const groups = new Map(),
    memberships = new Map();
  const adjacency = new Map();
  const errors = new Map();
  const errorAt = (step) => {
    if (!errors.has(step)) errors.set(step, estimatedError(step));
    return errors.get(step);
  };
  for (const n of leaves.values()) {
    adjacency.set(n.key, neighbors(n, leaves, rootSize, maxLevel));
    const groupId = parent(n, rootSize).key;
    const at = n.distancePosition,
      p = camera.position;
    const d =
      at && at[0] === p[0] && at[1] === p[1] && at[2] === p[2]
        ? n.distance
        : distance(n, camera.position);
    let resolution = minDivs;
    while (
      resolution < divs &&
      (errorAt(n.size / resolution) * scale) / Math.max(d, 0.05) > pixelError
    )
      resolution *= 2;
    let group = groups.get(groupId);
    if (!group) {
      group = { divs: resolution };
      groups.set(groupId, group);
    }
    group.divs = Math.max(group.divs, resolution);
    memberships.set(n.key, group);
  }
  // Refine only the coarser mesh, preserving coverage and the quadtree cut.
  let changed = true;
  while (changed) {
    changed = false;
    for (const n of leaves.values()) {
      const a = memberships.get(n.key);
      for (const [other] of adjacency.get(n.key)) {
        if (!other) continue;
        const b = memberships.get(other.key),
          step = n.size / a.divs,
          otherStep = other.size / b.divs;
        if (step > otherStep * 2 && a.divs < divs) {
          a.divs *= 2;
          changed = true;
        }
        if (otherStep > step * 2 && b.divs < divs) {
          b.divs *= 2;
          changed = true;
        }
      }
    }
  }
  const result = new Map();
  for (const n of leaves.values()) {
    const resolution = memberships.get(n.key).divs,
      step = n.size / resolution;
    let mask = 0;
    for (const [other, side] of adjacency.get(n.key))
      if (other && other.size / memberships.get(other.key).divs > step)
        mask |= side;
    result.set(n.key, { divs: resolution, mask });
  }
  return result;
}
