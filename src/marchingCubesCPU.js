import Bourke from "./bourke.js";
import MC33 from "./mc33.js";
import * as coordinates from "./coordinates.js";
const algorithms = { bourke: Bourke, mc33: MC33 };

function validate(field, size, iso, algorithm) {
  const impl = algorithms[algorithm];
  if (!impl) throw new Error(`Unknown marching cubes algorithm: ${algorithm}`);
  if (
    !["x", "y", "z"].every(
      (axis) => Number.isInteger(size[axis]) && size[axis] >= 2,
    )
  ) {
    throw new Error("Grid dimensions must be integers of at least 2");
  }
  if (
    !(field instanceof Float32Array) ||
    field.length !== size.x * size.y * size.z
  ) {
    throw new Error(
      "Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x",
    );
  }
  if (!Number.isFinite(iso)) throw new Error("Isolevel must be finite");
  for (const value of field) {
    if (!Number.isFinite(value) || !Number.isFinite(Math.fround(value - iso))) {
      throw new Error(
        "Field samples and their differences from the isolevel must be finite f32 values",
      );
    }
  }
  return impl;
}

// Input: x-fastest scalar samples. Output: triangle soup [x,y,z,...] in [0,1]^3.
function extractCPU(field, size, iso = 0, algorithm = "bourke", options = {}) {
  iso = Math.fround(iso);
  if (options.coordinates) coordinates.createMapper(options.coordinates);
  const impl = validate(field, size, iso, algorithm);
  const { x: gx, y: gy, z: gz } = size;
  const polygonize = impl.createPolygonizer();
  const values = new Float32Array(8);
  const codes = new Uint8Array(impl.maxVertices);
  const vertices = new Float32Array(13 * 3);
  let output = new Float32Array(65536),
    ptr = 0;
  for (let z = 0; z < gz - 1; z++) {
    for (let y = 0; y < gy - 1; y++) {
      for (let x = 0; x < gx - 1; x++) {
        let mask = 0;
        for (let c = 0; c < 8; c++) {
          const p = impl.corners[c];
          values[c] = field[((z + p[2]) * gy + y + p[1]) * gx + x + p[0]] - iso;
          if (values[c] < 0) mask |= impl.cornerBit(c);
        }
        if (mask === 0 || mask === 255) continue;
        const count = polygonize(values, mask, codes);
        if (ptr + count * 3 > output.length) {
          const bigger = new Float32Array(
            Math.max(output.length * 2, ptr + count * 3),
          );
          bigger.set(output);
          output = bigger;
        }
        for (let e = 0; e < 12; e++) {
          const [a, b] = impl.edges[e];
          if (values[a] < 0 === values[b] < 0) continue;
          const diff = values[a] - values[b];
          const t =
            Math.abs(diff) < 1e-9
              ? 0.5
              : Math.max(0, Math.min(1, values[a] / diff));
          const p = impl.corners[a],
            q = impl.corners[b];
          vertices[e * 3] = (x + p[0] + t * (q[0] - p[0])) / (gx - 1);
          vertices[e * 3 + 1] = (y + p[1] + t * (q[1] - p[1])) / (gy - 1);
          vertices[e * 3 + 2] = (z + p[2] + t * (q[2] - p[2])) / (gz - 1);
        }
        // MC33 pattern code 12 uses the cloud shader's cell-center convention.
        vertices[36] = (x + 0.5) / (gx - 1);
        vertices[37] = (y + 0.5) / (gy - 1);
        vertices[38] = (z + 0.5) / (gz - 1);
        for (let i = 0; i < count; i++) {
          const code = codes[i] * 3;
          output[ptr++] = vertices[code];
          output[ptr++] = vertices[code + 1];
          output[ptr++] = vertices[code + 2];
        }
      }
    }
  }
  return coordinates.mapPositions(output.slice(0, ptr), options.coordinates);
}

export { algorithms, validate, extractCPU };
