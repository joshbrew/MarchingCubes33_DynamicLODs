import Bourke from "./bourke.js";
import MC33 from "./mc33.js";
import * as coordinates from "./coordinates.js";
import commonShader from "./shaders/common.wgsl";
import mc33Core from "./shaders/mc33-core.wgsl";
import mc33Triangles from "./shaders/mc33-triangles.wgsl";
import bourkeTriangles from "./shaders/bourke-triangles.wgsl";
import extractShader from "./shaders/extract.wgsl";
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

function createShader(algorithm) {
  if (!algorithms[algorithm])
    throw new Error(`Unknown marching cubes algorithm: ${algorithm}`);
  const core =
    algorithm === "mc33" ? mc33Core + mc33Triangles : bourkeTriangles;
  return commonShader + core + extractShader;
}

// Each device caches compiled pipelines and constant lookup buffers.
const deviceCaches = new WeakMap();
async function getPipeline(device, algorithm) {
  let cache = deviceCaches.get(device);
  if (!cache) {
    cache = new Map();
    deviceCaches.set(device, cache);
  }
  if (!cache.has(algorithm)) {
    const promise = (async () => {
      const mod = device.createShaderModule({
        code: createShader(algorithm),
        label: `${algorithm} marching cubes`,
      });
      const info = await mod.getCompilationInfo();
      const errors = info.messages.filter((m) => m.type === "error");
      if (errors.length)
        throw new Error(
          errors.map((m) => `${m.lineNum}: ${m.message}`).join("\n"),
        );
      const pipeline = await device.createComputePipelineAsync({
        layout: "auto",
        compute: { module: mod, entryPoint: "cs" },
      });
      const table = upload(
        device,
        algorithms[algorithm].table,
        GPUBufferUsage.STORAGE,
      );
      return { pipeline, table };
    })();
    cache.set(algorithm, promise);
    promise.catch(() => cache.delete(algorithm));
  }
  return cache.get(algorithm);
}

function upload(device, data, usage) {
  const buffer = device.createBuffer({
    size: data.byteLength,
    usage,
    mappedAtCreation: true,
  });
  new Uint8Array(buffer.getMappedRange()).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  buffer.unmap();
  return buffer;
}

// Bricks overlap by one sample plane; the cells are disjoint. MC33 needs 36
// vertices/cell, compared with Bourke's 15. Size against both GPU buffer limits.
function brickDepthForLimits(size, impl, limits) {
  const limit = Math.min(
    limits.maxBufferSize,
    limits.maxStorageBufferBindingSize,
  );
  const samplePlanes = Math.floor(limit / (size.x * size.y * 4));
  const cellPlanes = Math.floor(
    limit / ((size.x - 1) * (size.y - 1) * impl.maxVertices * 16),
  );
  const dispatchLimit = limits.maxComputeWorkgroupsPerDimension * 4;
  const depth = Math.min(
    size.z,
    samplePlanes,
    cellPlanes + 1,
    dispatchLimit + 1,
  );
  if (depth < 2 || size.x - 1 > dispatchLimit || size.y - 1 > dispatchLimit) {
    throw new Error(
      "Grid XY plane exceeds GPU limits; reduce the grid dimensions",
    );
  }
  return depth;
}

async function extractGPU(
  device,
  field,
  size,
  iso = 0,
  algorithm = "bourke",
  options = {},
) {
  iso = Math.fround(iso);
  if (options.coordinates) coordinates.createMapper(options.coordinates);
  const impl = validate(field, size, iso, algorithm);
  const { x: gx, y: gy, z: gz } = size;
  let brickDepth = brickDepthForLimits(size, impl, device.limits);
  if (options.brickDepth !== undefined) {
    if (!Number.isInteger(options.brickDepth) || options.brickDepth < 2)
      throw new Error("Brick depth must be at least 2");
    brickDepth = Math.min(brickDepth, options.brickDepth);
  }
  const { pipeline, table } = await getPipeline(device, algorithm);
  const chunks = [];
  let totalFloats = 0;
  for (let z0 = 0; z0 < gz - 1; z0 += brickDepth - 1) {
    const depth = Math.min(brickDepth, gz - z0);
    const buffers = [];
    const track = (b) => {
      buffers.push(b);
      return b;
    };
    try {
      const subfield = field.subarray(z0 * gx * gy, (z0 + depth) * gx * gy);
      const fieldBuffer = track(
        upload(device, subfield, GPUBufferUsage.STORAGE),
      );
      const capacity = (gx - 1) * (gy - 1) * (depth - 1) * impl.maxVertices;
      const vertices = track(
        device.createBuffer({
          size: capacity * 16,
          usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        }),
      );
      const counter = track(
        upload(
          device,
          new Uint32Array([0]),
          GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
        ),
      );
      const u32 = new Uint32Array(8),
        f32 = new Float32Array(u32.buffer);
      f32.set([iso, 1 / (gx - 1), 1 / (gy - 1), 1 / (gz - 1)]);
      u32.set([gx, gy, depth], 4);
      f32[7] = z0 / (gz - 1);
      const uniforms = track(upload(device, u32, GPUBufferUsage.UNIFORM));
      const bind = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [uniforms, fieldBuffer, table, vertices, counter].map(
          (buffer, binding) => ({ binding, resource: { buffer } }),
        ),
      });
      const countRead = track(
        device.createBuffer({
          size: 4,
          usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
        }),
      );
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bind);
      pass.dispatchWorkgroups(
        Math.ceil((gx - 1) / 4),
        Math.ceil((gy - 1) / 4),
        Math.ceil((depth - 1) / 4),
      );
      pass.end();
      encoder.copyBufferToBuffer(counter, 0, countRead, 0, 4);
      device.queue.submit([encoder.finish()]);
      await countRead.mapAsync(GPUMapMode.READ);
      const count = new Uint32Array(countRead.getMappedRange())[0];
      countRead.unmap();
      if (count > capacity || count % 3 !== 0)
        throw new Error("Invalid GPU vertex count");
      if (count) {
        const read = track(
          device.createBuffer({
            size: count * 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          }),
        );
        const copy = device.createCommandEncoder();
        copy.copyBufferToBuffer(vertices, 0, read, 0, count * 16);
        device.queue.submit([copy.finish()]);
        await read.mapAsync(GPUMapMode.READ);
        const vec4 = new Float32Array(read.getMappedRange());
        const xyz = new Float32Array(count * 3);
        for (let i = 0, j = 0; i < vec4.length; i += 4) {
          xyz[j++] = vec4[i];
          xyz[j++] = vec4[i + 1];
          xyz[j++] = vec4[i + 2];
        }
        read.unmap();
        chunks.push(xyz);
        totalFloats += xyz.length;
      }
    } finally {
      for (const buffer of buffers) buffer.destroy();
    }
  }
  const output = new Float32Array(totalFloats);
  let offset = 0;
  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }
  return coordinates.mapPositions(output, options.coordinates);
}

async function disposeGPU(device) {
  const cache = deviceCaches.get(device);
  if (!cache) return;
  const entries = await Promise.allSettled(cache.values());
  for (const entry of entries)
    if (entry.status === "fulfilled") entry.value.table.destroy();
  deviceCaches.delete(device);
}
export {
  extractCPU,
  extractGPU,
  createShader,
  disposeGPU,
  algorithms,
  brickDepthForLimits,
};
export default {
  extractCPU,
  extractGPU,
  createShader,
  disposeGPU,
  algorithms,
  brickDepthForLimits,
};
