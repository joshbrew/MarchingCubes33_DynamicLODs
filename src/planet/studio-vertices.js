import { BaseNoise } from "../noise/noiseCompute.js";
import { geologyMode, studioLayers } from "../noise/studio-map.js";
import { studioLandscapes } from "../noise/studio.js";
import { rangeWeights } from "./detail.js";
import noiseWGSL from "../noise/noiseCompute.wgsl";
import canyonBedsWGSL from "../noise/canyon-beds.wgsl";
import studioWindWGSL from "../noise/studio-wind.wgsl";
import volcanicReliefWGSL from "../noise/volcanic-relief.wgsl";
import studioWGSL from "./shaders/studio.wgsl";
import verticesWGSL from "./shaders/studio-vertices.wgsl";

export const guideSegments = 512;

// NoiseCompute binds a permutation per dispatch when building an atlas.
// The point kernel chooses the same permutations independently at each sample.
const pointNoiseWGSL = noiseWGSL
  .replace("@group(0) @binding(0) var<uniform> options", "var<private> options")
  .replace("@group(0) @binding(1) var<uniform> params", "var<private> params")
  .replace("var<storage, read> permTable : PermTable;", "var<storage, read> permTables : array<PermTable,5>;\nvar<private> studioPermutationSlot:u32;")
  .replace("permTable.values[idx & PERM_MASK]", "permTables[studioPermutationSlot].values[idx & PERM_MASK]");

export class StudioVertices {
  constructor(device) {
    this.device = device;
  }

  async initialize() {
    const d = this.device;
    const studio = studioWGSL.replace("@group(0) @binding(3)", "@group(1) @binding(3)");
    const module = d.createShaderModule({ label: "Planet Studio point sampling",
      code: canyonBedsWGSL + studioWindWGSL + volcanicReliefWGSL + pointNoiseWGSL + studio + verticesWGSL });
    const { messages } = await module.getCompilationInfo();
    const errors = messages.filter(({ type }) => type === "error");
    if (errors.length) throw new Error(errors.map(({ message }) => message).join("\n"));
    this.pipeline = await d.createComputePipelineAsync({ layout: "auto",
      compute: { module, entryPoint: "sample_studio_vertices" } });
    this.recipe = d.createBuffer({ size: 5 * 96 + 64, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.permutations = d.createBuffer({ size: 5 * 512 * 4, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.probeJob = d.createBuffer({ size: 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.probeOutput = d.createBuffer({ size: 16, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
    this.probeReadback = d.createBuffer({ size: 4, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  }

  setWorld(map, size, geology, seed, detail, divs, referenceSegments) {
    const d = this.device;
    const rangeWeight = rangeWeights[detail.range];
    const { sphereOffset, sphereOffset2, layers } =
      studioLayers(seed, geology, true, detail.variation, rangeWeight, map.featureDensity);
    const packed = new ArrayBuffer(this.recipe.size);
    const values = new Float32Array(packed), ints = new Uint32Array(packed);
    const permutations = new Uint32Array(5 * 512);
    layers.forEach(({ layer }, index) => {
      const at = 24 * index;
      values.set([0, layer.zoom, layer.freq, 0, layer.lacunarity, layer.gain,
        layer.xShift, layer.yShift, layer.zShift, 0, layer.seedAngle, 1, 0, layer.threshold,
        10, 0, layer.warpAmp, 4, 8, 0, 0, 0, layer.scalar, layer.transform], at);
      ints[at] = layer.seed;
      ints[at + 3] = layer.octaves;
      ints[at + 20] = layer.voroMode;
      permutations.set(new BaseNoise(layer.seed).perm, index * 512);
    });
    values.set([size, sphereOffset, sphereOffset2, map.featureDensity, detail.variation,
      rangeWeight, detail.landscapeStrength, map.hostRelief ?? 1], 120);
    ints.set([seed, geologyMode[geology], studioLandscapes[detail.landscape], divs, map.side, referenceSegments], 128);
    d.queue.writeBuffer(this.recipe, 0, packed);
    d.queue.writeBuffer(this.permutations, 0, permutations);
    this.guide ??= d.createBuffer({ size: map.guide.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    d.queue.writeBuffer(this.guide, 0, map.guide);
    this.probeGroups = this.groups(this.probeJob, this.probeOutput);
  }

  groups(jobs, samples) {
    const d = this.device;
    return [
      d.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0),
        entries: [{ binding: 2, resource: { buffer: this.permutations } }] }),
      d.createBindGroup({ layout: this.pipeline.getBindGroupLayout(1), entries: [
        { binding: 0, resource: { buffer: this.recipe } },
        { binding: 1, resource: { buffer: jobs } },
        { binding: 2, resource: { buffer: samples } },
        { binding: 3, resource: { buffer: this.guide } },
      ] }),
    ];
  }

  bindTiles(jobs, samples) {
    this.tileGroups = this.groups(jobs, samples);
  }

  dispatch(pass, verticesPerPatch, patches) {
    pass.setPipeline(this.pipeline);
    this.tileGroups.forEach((group, index) => pass.setBindGroup(index, group));
    pass.dispatchWorkgroups(Math.ceil(verticesPerPatch / 16), patches);
  }

  probe(direction) {
    const measure = async () => {
      if (this.disposed) return undefined;
      const d = this.device;
      const job = new ArrayBuffer(32);
      new Float32Array(job).set(direction);
      new Uint32Array(job)[3] = 6;
      d.queue.writeBuffer(this.probeJob, 0, job);
      const encoder = d.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(this.pipeline);
      this.probeGroups.forEach((group, index) => pass.setBindGroup(index, group));
      pass.dispatchWorkgroups(1);
      pass.end();
      encoder.copyBufferToBuffer(this.probeOutput, 0, this.probeReadback, 0, 4);
      d.queue.submit([encoder.finish()]);
      await this.probeReadback.mapAsync(GPUMapMode.READ);
      const height = new Float32Array(this.probeReadback.getMappedRange())[0];
      this.probeReadback.unmap();
      return height;
    };
    const pending = (this.pendingProbe ?? Promise.resolve()).then(measure);
    this.pendingProbe = pending.catch(() => {});
    return pending;
  }

  dispose() {
    this.disposed = true;
    for (const resource of [this.recipe, this.permutations, this.guide, this.probeJob,
      this.probeOutput, this.probeReadback]) resource?.destroy();
  }
}
