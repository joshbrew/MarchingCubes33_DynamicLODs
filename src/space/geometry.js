import * as World from "./world.js";
import * as MC from "../marchingCubes.js";
function distantPlanet(variant, segments) {
  // Sparse volume sampling loses thin rings. Keep their connected torus
  // explicitly at distance, with a closed low-poly sphere fitted to the field.
  const points = [],
    rows = segments / 2,
    ringed = variant % 2 === 0;
  function sphere(theta, phi) {
    const direction = [
      Math.sin(theta) * Math.cos(phi),
      Math.cos(theta),
      Math.sin(theta) * Math.sin(phi),
    ];
    let low = ringed ? 0.5 : 0.66,
      high = ringed ? 0.69 : 0.84;
    for (let i = 0; i < 14; i++) {
      const r = (low + high) / 2;
      if (World.field(1, variant, ...direction.map((v) => v * r)) < 0) low = r;
      else high = r;
    }
    return direction.map((v) => (v * (low + high)) / 2);
  }
  function emit(a, b, c) {
    points.push(...a, ...b, ...c);
  }
  for (let lat = 0; lat < rows; lat++)
    for (let lon = 0; lon < segments; lon++) {
      const t = (lat * Math.PI) / rows,
        u = ((lat + 1) * Math.PI) / rows,
        p = (lon * 2 * Math.PI) / segments,
        q = (((lon + 1) % segments) * 2 * Math.PI) / segments;
      const a = sphere(t, p),
        b = sphere(t, q),
        c = sphere(u, q),
        d = sphere(u, p);
      if (lat > 0) emit(a, b, d);
      if (lat < rows - 1) emit(b, c, d);
    }
  if (ringed) {
    const sides = 4,
      torus = (theta, phi) => {
        const r = 0.82 + 0.055 * Math.cos(phi);
        return [
          r * Math.cos(theta),
          0.055 * Math.sin(phi),
          r * Math.sin(theta),
        ];
      };
    for (let i = 0; i < segments; i++)
      for (let j = 0; j < sides; j++) {
        const p = (i * 2 * Math.PI) / segments,
          q = (((i + 1) % segments) * 2 * Math.PI) / segments,
          t = (j * 2 * Math.PI) / sides,
          u = (((j + 1) % sides) * 2 * Math.PI) / sides;
        const a = torus(p, t),
          b = torus(q, t),
          c = torus(q, u),
          d = torus(p, u);
        emit(a, d, b);
        emit(b, d, c);
      }
  }
  // The common writer below expects positions normalized to [0,1].
  return Float32Array.from(points, (v) => (v + 1) / 2);
}
function placeInteriorVertices(positions, divisions) {
  // The cloud port places code-12 fans at the cell center. At sharp solid or
  // cave edges that center can lie behind the polygon and fold its triangles.
  // Keep the MC33 connectivity, but place each fan at its boundary centroid.
  const centers = new Map(),
    isCenter = (p) =>
      p.every(
        (v) => Math.abs(v * divisions - Math.floor(v * divisions) - 0.5) < 1e-5,
      );
  for (let i = 0; i < positions.length; i += 9) {
    const tri = [0, 1, 2].map((v) =>
      Array.from(positions.subarray(i + v * 3, i + v * 3 + 3)),
    );
    for (let v = 0; v < 3; v++)
      if (isCenter(tri[v])) {
        const key = tri[v].join(",");
        if (!centers.has(key))
          centers.set(key, { boundary: new Map(), offsets: [] });
        const entry = centers.get(key);
        entry.offsets.push(i + v * 3);
        for (let other = 0; other < 3; other++)
          if (other !== v) entry.boundary.set(tri[other].join(","), tri[other]);
      }
  }
  for (const entry of centers.values()) {
    const p = [0, 0, 0];
    for (const v of entry.boundary.values())
      for (let axis = 0; axis < 3; axis++)
        p[axis] += v[axis] / entry.boundary.size;
    for (const offset of entry.offsets) positions.set(p, offset);
  }
  return centers.size;
}
function build(kind, variant, level, algorithm = "mc33", options = {}) {
  const divisions = World.meshDivisions[kind]?.[level];
  if (!divisions) throw new Error("Invalid body mesh level");
  const proxy = kind === 1 && level >= 5;
  let positions;
  if (proxy) positions = distantPlanet(variant, divisions);
  else {
    const n = divisions + 1,
      size = { x: n, y: n, z: n },
      field = new Float32Array(n * n * n);
    for (let z = 0; z < n; z++)
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++)
          field[(z * n + y) * n + x] = World.field(
            kind,
            variant,
            (x / divisions) * 2 - 1,
            (y / divisions) * 2 - 1,
            (z / divisions) * 2 - 1,
            options,
          );
    positions = MC.extractCPU(field, size, 0, algorithm);
  }
  const vertices = new Float32Array((positions.length / 3) * 8);
  let written = 0,
    orientation = 0;
  const interiorVertices =
    !proxy && algorithm === "mc33"
      ? placeInteriorVertices(positions, divisions)
      : 0;
  for (let i = 0; i < positions.length; i += 9) {
    const tri = [],
      normal = [];
    for (let v = 0; v < 3; v++) {
      const p = [0, 1, 2].map((axis) => positions[i + v * 3 + axis] * 2 - 1);
      tri.push(p);
      normal.push(World.gradient(kind, variant, ...p, options));
    }
    const a = tri[1].map((v, k) => v - tri[0][k]),
      b = tri[2].map((v, k) => v - tri[0][k]),
      cross = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
    if (Math.hypot(...cross) < 1e-12) continue;
    // A corner gradient can face across a sharp crease/cavity. Flipping each
    // triangle by that gradient destroys consistent winding and opens visible
    // gaps with backface culling. Preserve the extractor's connected winding,
    // and choose its global outward convention by the area-weighted normals.
    orientation += cross.reduce(
      (sum, v, k) => sum + v * (normal[0][k] + normal[1][k] + normal[2][k]),
      0,
    );
    for (let v = 0; v < 3; v++) {
      const at = written++ * 8;
      vertices.set([...tri[v], 1, ...normal[v], 0], at);
    }
  }
  if (orientation < 0)
    for (let i = 0; i < written * 8; i += 24)
      for (let k = 0; k < 8; k++) {
        const value = vertices[i + 8 + k];
        vertices[i + 8 + k] = vertices[i + 16 + k];
        vertices[i + 16 + k] = value;
      }
  return {
    vertices: vertices.slice(0, written * 8),
    count: written,
    divisions,
    interiorVertices,
    proxy,
  };
}
function pointCloud(vertices, limit = 8192, seed = 7) {
  const unique = new Map();
  for (let i = 0; i < vertices.length; i += 8) {
    const key = [vertices[i], vertices[i + 1], vertices[i + 2]]
      .map((v) => Math.round(v * 1e6))
      .join(":");
    if (!unique.has(key)) unique.set(key, i);
  }
  const indices = Array.from(unique.values()),
    rng = World.random(seed);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const count = Math.min(limit, indices.length),
    points = new Float32Array(count * 8);
  indices
    .slice(0, count)
    .forEach((at, i) => points.set(vertices.subarray(at, at + 8), i * 8));
  return { vertices: points, count }; // Every density tier uses a prefix of this cloud.
}
export { build, pointCloud };
export default { build, pointCloud };
