import * as coordinates from "./coordinates.js";
import { algorithms, validate, extractCPU } from "./marchingCubesCPU.js";
import commonShader from "./shaders/common.wgsl";
import mc33Core from "./shaders/mc33-core.wgsl";
import mc33Triangles from "./shaders/mc33-triangles.wgsl";
import bourkeTriangles from "./shaders/bourke-triangles.wgsl";
import extractShader from "./shaders/extract.wgsl";

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
