// A drainage pass on the spherical height bake. Longitude wraps and latitude
// uses area-weighted rainfall and distances, so there is no rectangular edge.
export function erodeSphericalTerrain(values, side) {
  const width = side - 1;
  const count = width * (side - 2);
  const primary = new Int32Array(count).fill(-1);
  const secondary = new Int32Array(count).fill(-1);
  const incoming = new Uint8Array(count);
  const grade = new Float32Array(count);
  const share = new Float32Array(count);
  const flow = new Float32Array(count);
  const queue = new Uint32Array(count);
  const xAt = (x) => (x + width) % width;
  const rowWidths = Float64Array.from({ length: side }, (_, y) =>
    Math.sin((Math.PI * y) / width),
  );

  for (let y = 1; y < width; y++) {
    const area = rowWidths[y];
    const longitude = Math.max(0.06, 2 * area);
    const diagonal = 1 / Math.hypot(1, longitude);
    for (let x = 0; x < width; x++) {
      const id = (y - 1) * width + x;
      const height = values[y * side + x];
      flow[id] = area;
      let first = -1,
        second = -1,
        a = 0,
        b = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = y + dy;
        if (row <= 0 || row >= width) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const col = xAt(x + dx);
          const drop = height - values[row * side + col];
          const slope = drop * (dy ? (dx ? diagonal : 1) : 1 / longitude);
          const next = (row - 1) * width + col;
          if (slope > a) {
            second = first;
            b = a;
            first = next;
            a = slope;
          } else if (slope > b) {
            second = next;
            b = slope;
          }
        }
      }
      if (first < 0) continue;
      primary[id] = first;
      grade[id] = a;
      incoming[first]++;
      if (b >= 0.42 * a) {
        secondary[id] = second;
        incoming[second]++;
        share[id] = (b * b) / (a * a + b * b);
      }
    }
  }

  // Edges always lead to strictly lower ground. Drain the graph in one
  // topological pass, accumulating the watershed behind each cell.
  let end = 0;
  for (let i = 0; i < count; i++) if (!incoming[i]) queue[end++] = i;
  for (let at = 0; at < end; at++) {
    const id = queue[at];
    const first = primary[id],
      second = secondary[id];
    if (first < 0) continue;
    const split = flow[id] * share[id];
    flow[first] += flow[id] - split;
    if (!--incoming[first]) queue[end++] = first;
    if (second >= 0) {
      flow[second] += split;
      if (!--incoming[second]) queue[end++] = second;
    }
  }

  const cut = new Float32Array(count);
  const sediment = new Float32Array(count);
  const repose = (0.66 * Math.PI) / (0.023 * width);
  const areaScale = (1000 / width) ** 2;
  for (let id = 0; id < count; id++) {
    // Normalize catchment size to the 1000-segment Studio bake.
    const upstream = Math.max(
      0,
      flow[id] - rowWidths[Math.floor(id / width) + 1],
    );
    const t = Math.max(
      0,
      Math.min(1, (Math.log2(1 + upstream * areaScale) - 2.65) / 5.9),
    );
    cut[id] = t * (0.065 + 0.18 * t);
    const downhill = primary[id];
    if (downhill >= 0) {
      const debris = Math.max(0, grade[id] - repose) * 0.11;
      sediment[id] -= debris;
      sediment[downhill] += debris;
    }
  }

  for (let y = 1; y < width; y++) {
    const polar = Math.min(
      1,
      Math.min(y, width - y) / Math.max(2, width * 0.015),
    );
    const fade = polar * polar * (3 - 2 * polar);
    for (let x = 0; x < width; x++) {
      const id = (y - 1) * width + x;
      let spread = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const row = Math.max(1, Math.min(width - 1, y + dy));
        for (let dx = -1; dx <= 1; dx++)
          spread +=
            cut[(row - 1) * width + xAt(x + dx)] * (dx ? 1 : 2) * (dy ? 1 : 2);
      }
      values[y * side + x] +=
        fade * (sediment[id] - 0.52 * cut[id] - (0.82 * spread) / 16);
    }
    values[y * side + width] = values[y * side];
  }
  return values;
}
