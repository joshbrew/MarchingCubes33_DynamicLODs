import { erodeSphericalTerrain } from "./studio-erosion.js";

export function applyStudioRunoff(values, side, geology) {
  erodeRegionalWatersheds(values, side, geology === "volcanic" ? 0.58 : 1);
  return erodeSphericalTerrain(values, side, geology === "alpine" ? 0.58 : 0.70);
}

// Route water over a smoothed globe before adding the local gullies. A
// priority flood finds the lowest spill path out of each enclosed basin.
export function erodeRegionalWatersheds(values, side, strength = 1) {
  const span = side - 1;
  const width = Math.min(256, Math.floor(span / 3.5));
  if (width < 12) return values;
  const count = width * (width - 1);
  const step = span / width;
  const heights = new Float32Array(count);
  const rowArea = Float32Array.from({ length: width + 1 }, (_, y) =>
    Math.sin((Math.PI * y) / width),
  );
  const wrap = (x, period) => (x + period) % period;
  const heightAt = (x, y) =>
    values[Math.round(y) * side + wrap(Math.round(x), span)];

  for (let y = 1; y < width; y++) {
    for (let x = 0; x < width; x++) {
      const u = x * step, v = y * step, h = step * 0.48;
      heights[(y - 1) * width + x] =
        0.4 * heightAt(u, v) +
        0.15 * (heightAt(u - h, v) + heightAt(u + h, v) +
          heightAt(u, v - h) + heightAt(u, v + h));
    }
  }

  const sorted = heights.slice().sort();
  const baseLevel = sorted[Math.floor(count * 0.20)];
  const spill = new Float32Array(count).fill(Infinity);
  const receiver = new Int32Array(count).fill(-1);
  const order = new Uint32Array(count);
  const rank = new Uint32Array(count).fill(count);
  const flow = new Float32Array(count);
  const heap = new Uint32Array(count);
  let length = 0;
  function push(id) {
    let i = length++;
    while (i) {
      const parent = (i - 1) >> 1;
      if (spill[heap[parent]] <= spill[id]) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = id;
  }
  function pop() {
    const first = heap[0], last = heap[--length];
    let i = 0;
    while (i * 2 + 1 < length) {
      let child = i * 2 + 1;
      if (child + 1 < length && spill[heap[child + 1]] < spill[heap[child]]) child++;
      if (spill[last] <= spill[heap[child]]) break;
      heap[i] = heap[child];
      i = child;
    }
    heap[i] = last;
    return first;
  }
  for (let i = 0; i < count; i++) {
    if (heights[i] <= baseLevel) {
      spill[i] = heights[i];
      push(i);
    }
  }
  for (let at = 0; length; at++) {
    const id = pop();
    const x = id % width, y = Math.floor(id / width) + 1;
    const area = rowArea[y];
    const eastWest = Math.max(0.08, 2 * area);
    const diagonal = 1 / Math.hypot(eastWest, 1);
    order[at] = id;
    rank[id] = at;
    flow[id] = area;
    let best = 0;
    for (let dy = -1; dy <= 1; dy++) {
      const row = y + dy;
      if (row < 1 || row >= width) continue;
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const other = (row - 1) * width + wrap(x + dx, width);
        if (spill[other] === Infinity) {
          spill[other] = Math.max(heights[other], spill[id] + 0.00002);
          receiver[other] = id;
          push(other);
        } else if (rank[other] < at) {
          const slope = (spill[id] - spill[other]) *
            (dy ? (dx ? diagonal : 1) : 1 / eastWest);
          if (slope > best) {
            best = slope;
            receiver[id] = other;
          }
        }
      }
    }
  }
  for (let i = count - 1; i >= 0; i--) {
    const id = order[i], downstream = receiver[id];
    if (downstream >= 0) flow[downstream] += flow[id];
  }

  // Sweep a valley profile along each trunk and tributary. Take the deepest
  // cut at junctions so neighboring branches cannot stack into a spike.
  const cut = new Float32Array(side * side);
  const areaScale = (1000 / width) ** 2;
  const channelSize = (id) =>
    Math.max(0, Math.min(1, (Math.log2(1 + flow[id] * areaScale) - 7.2) / 5.5));
  const channelDepth = (id, size) => {
    const upland = Math.min(1, Math.max(0, (heights[id] - baseLevel + 0.12) / 0.36));
    return strength * size * (0.095 + 0.24 * size) * (0.46 + 0.54 * upland);
  };
  for (let id = 0; id < count; id++) {
    const next = receiver[id];
    if (next < 0) continue;
    const size = channelSize(id);
    if (size <= 0) continue;
    const downstreamSize = channelSize(next);
    const row = Math.floor(id / width) + 1;
    const x = (id % width) * step, y = row * step;
    const dx = (wrap((next % width) - (id % width) + 1, width) - 1) * step;
    const dy = (Math.floor(next / width) - row + 1) * step;
    const longitude = Math.max(0.35, 2 * rowArea[row]);
    const metricX = dx * longitude;
    const segmentLength2 = metricX * metricX + dy * dy;
    const startWidth = (0.43 + 1.44 * size) * step;
    const endWidth = (0.43 + 1.44 * downstreamSize) * step;
    const valleyWidth = Math.max(startWidth, endWidth);
    const extent = valleyWidth / longitude;
    const startDepth = channelDepth(id, size);
    const endDepth = channelDepth(next, downstreamSize);
    const firstY = Math.max(1, Math.floor(Math.min(y, y + dy) - valleyWidth));
    const lastY = Math.min(span - 1, Math.ceil(Math.max(y, y + dy) + valleyWidth));
    const firstX = Math.floor(Math.min(x, x + dx) - extent);
    const lastX = Math.ceil(Math.max(x, x + dx) + extent);
    for (let v = firstY; v <= lastY; v++) {
      const polar = Math.min(1, Math.min(v, span - v) / (span * 0.022));
      const fade = polar * polar * (3 - 2 * polar);
      const py = v - y;
      for (let u = firstX; u <= lastX; u++) {
        const px = (u - x) * longitude;
        const t = Math.min(1, Math.max(0, (px * metricX + py * dy) / segmentLength2));
        const halfWidth = startWidth + t * (endWidth - startWidth);
        const d = ((px - t * metricX) ** 2 + (py - t * dy) ** 2) / (halfWidth ** 2);
        if (d >= 1) continue;
        const depth = startDepth + t * (endDepth - startDepth);
        const bank = (1 - d) ** 2;
        const at = v * side + wrap(u, span);
        cut[at] = Math.max(cut[at], depth * fade * bank * (0.57 + 0.43 * bank * bank));
      }
    }
  }
  for (let y = 1; y < span; y++) {
    const row = y * side;
    for (let x = 0; x < span; x++) values[row + x] -= cut[row + x];
    values[row + span] = values[row];
  }
  return values;
}
