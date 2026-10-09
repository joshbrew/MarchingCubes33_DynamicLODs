import * as MC from "../marchingCubes.js";
function cellCorners(algorithm) {
  const impl = MC.algorithms[algorithm];
  if (!impl) throw new Error("Unknown terrain algorithm");
  const values = Float32Array.from(impl.corners, (p) => (p[1] ? 1 : -1));
  let mask = 0;
  values.forEach((v, i) => {
    if (v < 0) mask |= impl.cornerBit(i);
  });
  const codes = new Uint8Array(impl.maxVertices),
    count = impl.createPolygonizer()(values, mask, codes),
    corners = [];
  for (const code of codes.slice(0, count)) {
    if (code === 12)
      throw new Error("Heightfield template unexpectedly uses a center vertex");
    const [a, b] = impl.edges[code],
      p = impl.corners[a],
      q = impl.corners[b];
    if (p[0] !== q[0] || p[2] !== q[2])
      throw new Error("Heightfield crossing must be vertical");
    corners.push([p[0], p[2]]);
  }
  return corners;
}
function buildIndices(divs, mask = 0, algorithm = "mc33") {
  if (!Number.isInteger(divs) || divs < 2 || divs & (divs - 1))
    throw new Error("Divisions must be a power of two of at least 2");
  if (!Number.isInteger(mask) || mask < 0 || mask > 15)
    throw new Error("Seam mask must be 0..15");
  const row = divs + 1,
    corners = cellCorners(algorithm),
    indices = [];
  function emit(tri) {
    const p = tri.map((i) => [i % row, Math.floor(i / row)]);
    const area =
      (p[1][0] - p[0][0]) * (p[2][1] - p[0][1]) -
      (p[1][1] - p[0][1]) * (p[2][0] - p[0][0]);
    if (area === 0) return;
    // Positive Y is outward for this signed-heightfield specialization.
    if (area > 0) [tri[1], tri[2]] = [tri[2], tri[1]];
    indices.push(...tri);
  }
  // Stitch each affected 2x2 block as a perimeter fan. Omitting the odd edge
  // vertex makes the border identical to its coarse neighbor. This also
  // handles all corner combinations, without overlapping or missing cells.
  for (let z = 0; z < divs; z += 2)
    for (let x = 0; x < divs; x += 2) {
      const stitched =
        (x === 0 && mask & 1) ||
        (x === divs - 2 && mask & 2) ||
        (z === 0 && mask & 4) ||
        (z === divs - 2 && mask & 8);
      if (stitched) {
        const perimeter = [
          [0, 0],
          [1, 0],
          [2, 0],
          [2, 1],
          [2, 2],
          [1, 2],
          [0, 2],
          [0, 1],
        ]
          .map((p) => [x + p[0], z + p[1]])
          .filter(([px, pz]) => {
            const vertical =
              (px === 0 && mask & 1) || (px === divs && mask & 2);
            const horizontal =
              (pz === 0 && mask & 4) || (pz === divs && mask & 8);
            return !(vertical && pz & 1) && !(horizontal && px & 1);
          })
          .map(([px, pz]) => pz * row + px);
        const center = (z + 1) * row + x + 1;
        for (let i = 0; i < perimeter.length; i++)
          emit([center, perimeter[i], perimeter[(i + 1) % perimeter.length]]);
      } else {
        for (let dz = 0; dz < 2; dz++)
          for (let dx = 0; dx < 2; dx++)
            for (let t = 0; t < corners.length; t += 3) {
              emit(
                corners
                  .slice(t, t + 3)
                  .map((p) => (z + dz + p[1]) * row + x + dx + p[0]),
              );
            }
      }
    }
  return Uint32Array.from(indices);
}
function lines(indices) {
  const edges = new Map();
  for (let i = 0; i < indices.length; i += 3)
    for (let j = 0; j < 3; j++) {
      const a = indices[i + j],
        b = indices[i + ((j + 1) % 3)],
        key = a < b ? `${a},${b}` : `${b},${a}`;
      if (!edges.has(key)) edges.set(key, [a, b]);
    }
  return Uint32Array.from(Array.from(edges.values()).flat());
}
export { buildIndices, lines, cellCorners };
export default { buildIndices, lines, cellCorners };
