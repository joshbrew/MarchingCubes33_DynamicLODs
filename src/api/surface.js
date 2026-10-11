import { extractCPU, extractGPU, disposeGPU } from "../marchingCubes.js";
import { sampleField } from "../coordinates.js";
import {
  fitSphere,
  sphereSampler,
  sphereSurfaces,
  refineSphereSurface,
} from "../fields.js";
import { createGPUDevice } from "./gpu.js";

function dimensions(size = { x: 33, y: 33, z: 33 }) {
  if (![size.x, size.y, size.z].every((v) => Number.isInteger(v) && v >= 2))
    throw new RangeError("size needs integer x/y/z dimensions >= 2.");
  return size;
}
function mesh(positions, normals) {
  const min = [Infinity, Infinity, Infinity],
    max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i++) {
    min[i % 3] = Math.min(min[i % 3], positions[i]);
    max[i % 3] = Math.max(max[i % 3], positions[i]);
  }
  if (!positions.length) {
    min.fill(0);
    max.fill(0);
  }
  return {
    positions,
    normals,
    triangleCount: positions.length / 9,
    bounds: { min, max },
  };
}
function flatNormals(positions) {
  const output = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 9) {
    const a = [0, 1, 2].map((k) => positions[i + 3 + k] - positions[i + k]),
      b = [0, 1, 2].map((k) => positions[i + 6 + k] - positions[i + k]);
    const n = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ],
      length = Math.hypot(...n) || 1;
    for (let j = 0; j < 9; j++) output[i + j] = n[j % 3] / length;
  }
  return output;
}
async function withBackend(backend, device, run) {
  if (!["cpu", "gpu"].includes(backend))
    throw new RangeError("backend must be cpu or gpu.");
  const owned = backend === "gpu" && !device;
  if (owned) device = await createGPUDevice();
  try {
    return await run(backend === "gpu" ? device : null);
  } finally {
    if (owned) {
      try {
        await disposeGPU(device);
      } finally {
        device.destroy();
      }
    }
  }
}

/** Return renderer-independent triangle data; CPU works in Node and browsers. */
export async function createSurface({
  field,
  sample,
  size,
  isoLevel = 0,
  algorithm = "mc33",
  coordinates,
  backend = "cpu",
  device,
  normals = true,
} = {}) {
  size = dimensions(size);
  if ((field === undefined) === (sample === undefined))
    throw new TypeError("Provide exactly one of field or sample.");
  if (sample !== undefined && typeof sample !== "function")
    throw new TypeError("sample must be a function.");
  field ??= sampleField(size, sample, coordinates);
  return withBackend(backend, device, async (gpu) => {
    const positions = gpu
      ? await extractGPU(gpu, field, size, isoLevel, algorithm, { coordinates })
      : extractCPU(field, size, isoLevel, algorithm, { coordinates });
    return mesh(positions, normals ? flatNormals(positions) : null);
  });
}

/** Fitted spheres and shells at any world size. This is a sphere-specific fit. */
export async function createSphere({
  points,
  center = [0, 0, 0],
  radius = 1,
  surface = "outer",
  thickness,
  offset = 0,
  coordinates = "cartesian",
  size,
  algorithm = "mc33",
  backend = "cpu",
  device,
} = {}) {
  const fit = points
    ? fitSphere(points)
    : { center: Array.from(center), radius };
  if (
    fit.center.length !== 3 ||
    !fit.center.every(Number.isFinite) ||
    !Number.isFinite(fit.radius) ||
    fit.radius <= 0
  )
    throw new RangeError("Use a positive radius and finite xyz center.");
  const boundaries = sphereSurfaces(
    fit,
    surface,
    thickness ?? fit.radius * 0.02,
    offset,
  );
  if (!["cartesian", "spherical", "cube-sphere"].includes(coordinates))
    throw new RangeError(
      "coordinates must be cartesian, spherical or cube-sphere.",
    );
  size = dimensions(size);
  const outer = fit.radius + offset,
    span = outer * 2.2,
    sampler = sphereSampler(fit);
  const radial = [
    Math.max(0, (outer - (thickness ?? fit.radius * 0.02)) * 0.5),
    outer * 1.1,
  ];
  const grids = Array.from(
    { length: coordinates === "cube-sphere" ? 6 : 1 },
    (_, face) => {
      const config = {
        type: coordinates,
        center: fit.center,
        radius: radial,
        ...(coordinates === "cube-sphere" ? { face } : {}),
      };
      const sample =
        coordinates === "cartesian"
          ? (x, y, z) =>
              sampler(
                fit.center[0] + (x - 0.5) * span,
                fit.center[1] + (y - 0.5) * span,
                fit.center[2] + (z - 0.5) * span,
              )
          : sampler;
      return { config, field: sampleField(size, sample, config) };
    },
  );
  return withBackend(backend, device, async (gpu) => {
    const chunks = [],
      groups = [];
    let length = 0;
    for (const boundary of boundaries) {
      const start = length / 3;
      for (const { config, field } of grids) {
        const p = gpu
          ? await extractGPU(gpu, field, size, boundary.iso, algorithm, {
              coordinates: config,
            })
          : extractCPU(field, size, boundary.iso, algorithm, {
              coordinates: config,
            });
        if (coordinates === "cartesian")
          for (let i = 0; i < p.length; i++)
            p[i] = fit.center[i % 3] + (p[i] - 0.5) * span;
        const chunk = refineSphereSurface(p, fit, boundary);
        chunks.push(chunk);
        length += chunk.positions.length;
      }
      groups.push({
        side: boundary.side,
        radius: boundary.radius,
        start,
        count: length / 3 - start,
      });
    }
    const positions = new Float32Array(length),
      normals = new Float32Array(length);
    let at = 0;
    for (const chunk of chunks) {
      positions.set(chunk.positions, at);
      normals.set(chunk.normals, at);
      at += chunk.positions.length;
    }
    return { ...mesh(positions, normals), fit, groups };
  });
}
