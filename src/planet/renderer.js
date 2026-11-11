import { initializeGPU, disposeGPUContext, renderSize } from "../api/gpu.js";
import { relativeCamera } from "../api/camera.js";
import { buildIndices, lines } from "../terrain/surface.js";
import { cube, orbitDetailWeight, parentTileKey, selectPlanet } from "./lod.js";
import { PlanetTileCache } from "./tile-cache.js";
import { guideSegments, StudioVertices } from "./studio-vertices.js";
import {
  radius,
  seed,
  studioElevationBounds,
  studioHeightScale,
  studioOceanLevel,
  surface,
  unit,
} from "./field.js";
import { getPreset } from "./presets.js";
import { detailUniforms, planetDetail, rangeWeights } from "./detail.js";
import { atmosphereColors, sunDirection } from "./lighting.js";
import { bakeStudioMap } from "../noise/studio-map.js";
import { NoiseComputeBuilder } from "../noise/noiseCompute.js";
import canyonBedsWGSL from "../noise/canyon-beds.wgsl";
import studioWindWGSL from "../noise/studio-wind.wgsl";
import { coarsenStudioPlanetNoise, sampleStudioPlanetNoise, studioPlanetRelief, studioRegionWeights, studioSeed, studioSegments } from "../noise/studio.js";
import { districtAtlasSide } from "../noise/studio-district.js";
import { studioClimate } from "../noise/studio-climate.js";
import fieldWGSL from "./shaders/field.wgsl";
import drainageWGSL from "./shaders/drainage.wgsl";
import sceneWGSL from "./shaders/scene.wgsl";
import patchesWGSL from "./shaders/patches.wgsl";
import surfaceNoiseWGSL from "./shaders/surface-noise.wgsl";
import orbitWGSL from "./shaders/orbit.wgsl";
import renderWGSL from "./shaders/render.wgsl";
import rocksWGSL from "./shaders/rocks.wgsl";
import skyWGSL from "./shaders/sky.wgsl";
import shadowWGSL from "./shaders/shadow.wgsl";
import studioWGSL from "./shaders/studio.wgsl";

function worldSeed(value) {
  if (!Number.isSafeInteger(value))
    throw new RangeError("Use an integer planet seed.");
  return value >>> 0;
}

const shadowSide = 512;
const shadowSteps = 72;
const defaultShallowWater = [.032, .16, .17, .008];
const defaultDeepWater = [.009, .038, .073, .0019];
const featureDensity = (size) => size / radius;
const atlasSegments = (size) => size < radius * .5 ? 1536 : undefined;
const maximumGridVertices = 16_000_000;
const spareTileSlots = 64;
const verticesPerTile = (divs) => (divs + 1) ** 2;
const sampleStride = (sampling) => sampling === "procedural" ? 16 : 48;
const cacheSlots = (tiles) => tiles + Math.min(tiles, spareTileSlots);
function samplingMode(value) {
  if (value !== "cached" && value !== "procedural")
    throw new RangeError("Choose cached or procedural terrain sampling.");
  return value;
}

export class PlanetRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      radius,
      seed,
      studioSeed: options.seed ?? studioSeed,
      divs: 16,
      maxTiles: 576,
      minSpacing: 2,
      ...options,
      landmarkPatches: options.landmarkPatches ?? false,
    };
    const { radius: r, divs, maxTiles, minSpacing } = this.options;
    const tileLimit = Math.min(65535, Math.floor(maximumGridVertices / verticesPerTile(divs)));
    if (
      !(
        Number.isFinite(r) &&
        r >= 16384 &&
        r <= 2000000 &&
        [8, 16, 32].includes(divs) &&
        Number.isInteger(maxTiles) &&
        maxTiles >= 24 &&
        maxTiles <= tileLimit &&
        Number.isFinite(minSpacing) &&
        minSpacing >= 0.5 &&
        minSpacing <= r
      )
    )
      throw new RangeError(
        `Use a radius of 16,384–2,000,000 m, 8/16/32 divisions, 24–${tileLimit} tiles and valid spacing.`,
      );
    this.pixelError = 3;
    this.lodScale = 1.5;
    this.tileBudget = options.tileBudget ?? maxTiles;
    if (!Number.isInteger(this.tileBudget) || this.tileBudget < 24 || this.tileBudget > maxTiles)
      throw new RangeError("Tile budget must be between 24 and the allocated maximum.");
    this.reliefCache = new Map();
    this.profile = getPreset(options.preset);
    this.activeStudioSeed = worldSeed(
      options.studioSeed ?? this.options.studioSeed + this.profile.seedOffset,
    );
    this.detail = planetDetail(options.detail);
    this.terrainSampling = samplingMode(options.terrainSampling ?? "cached");
    this.startupPreview = options.progressiveStartup === true;
    this.terrainPipelines = new Map();
    this.requestedWorld = { profile: this.profile, seed: this.studioSeed, detail: this.detail, radius: r,
      terrainSampling: this.terrainSampling };
    this.studioRequest = 0;
    this.studioQueue = Promise.resolve();
    this.split = new Set();
    this.focalSplit = new Set();
    this.templates = new Map();
    this.rockSpans = [];
    this.terrainTriangles = 0;
    this.stats = { gpuMs: null, planBuilds: 0 };
    this.errors = [];
    this.lastSelect = -Infinity;
    this.dirty = true;
    this.frame = new Float32Array(52);
    this.words = new Uint32Array(this.frame.buffer);
  }
  async initialize() {
    const maxSampleBytes = cacheSlots(this.options.maxTiles) * verticesPerTile(this.options.divs) *
      sampleStride("cached");
    const d = await initializeGPU(this, {
      preferredStorageBufferSize: maxSampleBytes > 128 * 1024 ** 2 ? maxSampleBytes : 0,
    });
    const budgetLimit = this.maxTileBudget();
    if (budgetLimit < 24 || (this.options.tileBudget !== undefined && this.tileBudget > budgetLimit))
      throw new RangeError(`This GPU supports up to ${budgetLimit} ${this.terrainSampling} terrain patches.`);
    this.tileBudget = Math.min(this.tileBudget, budgetLimit);
    this.noiseBuilder = new NoiseComputeBuilder(d, d.queue);
    this.geology = this.profile.geology;
    this.sunMap = d.createTexture({
      label: "Planet sun visibility snapshots",
      size: [shadowSide, shadowSide, 2],
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    this.sunView = this.sunMap.createView({ dimension: "2d-array" });
    this.sunSampler = d.createSampler({ addressModeU: "repeat", minFilter: "linear", magFilter: "linear" });
    this.shadowParams = [0, 1].map(() => d.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    }));
    this.uniform = d.createBuffer({
      size: this.frame.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleBuffer = d.createBuffer({
      size: (4 + 32 + 4 + 6 + 1 + 2 + 3 + 1) * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.instances = d.createBuffer({
      size: this.options.maxTiles * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.records = new ArrayBuffer(this.instances.size);
    const max = this.options.maxTiles;
    this.tileJobRecords = new ArrayBuffer(max * 32);
    this.tileJobBuffer = d.createBuffer({ size: max * 32, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
    this.allocateTileSamples();
    const layout = this.terrainLayout = d.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "uniform" },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
          buffer: { type: "read-only-storage" },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          texture: { sampleType: "float", viewDimension: "2d-array" },
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
        { binding: 6, visibility: GPUShaderStage.VERTEX, buffer: { type: "read-only-storage" } },
      ],
    });
    const pipelineLayout = d.createPipelineLayout({
      bindGroupLayouts: [layout],
    });
    this.makeRenderPipeline = (module, vertex, fragment, {
      wire = false, sky = false, buffers = [], constants,
    } = {}) =>
      d.createRenderPipelineAsync({
        label: `${vertex}${wire ? " wireframe" : ""}${constants ? constants.proceduralTerrain ? " procedural" : " cached" : ""}`,
        layout: pipelineLayout,
        vertex: { module, entryPoint: vertex, buffers, constants },
        fragment: {
          module,
          entryPoint: fragment,
          targets: [{ format: this.format }],
          constants,
        },
        primitive: {
          topology: wire ? "line-list" : "triangle-list",
          cullMode: !wire && !sky && !buffers.length ? "back" : "none",
        },
        depthStencil: {
          format: "depth24plus",
          depthWriteEnabled: !sky,
          depthCompare: sky ? "always" : "less",
        },
      });
    const world = this.requestedWorld;
    const baking = this.bakeWorld(world, !this.startupPreview);
    this.studioQueue = baking.then(() => {}, () => {});
    const preview = this.startupPreview;
    const [map, sunBake, tileCompute, solid, sky, rockSolid, wire, rockWire] = await Promise.all([
      baking,
      d.createComputePipelineAsync({
        layout: "auto",
        compute: {
          module: d.createShaderModule({ code: studioWGSL + shadowWGSL }),
          entryPoint: "bake_sun_visibility",
        },
      }),
      !preview && world.terrainSampling === "cached" ? this.cachedTilePipeline() : undefined,
      preview
        ? this.makeRenderPipeline(d.createShaderModule({ label: "Initial planet orbit",
          code: sceneWGSL + studioWGSL + patchesWGSL + orbitWGSL }), "orbit_vertex", "orbit_fragment")
        : this.terrainPipeline(world.terrainSampling),
      this.makeRenderPipeline(d.createShaderModule({ label: "Planet atmosphere",
        code: sceneWGSL + surfaceNoiseWGSL + skyWGSL }), "sky_vertex", "sky_fragment", { sky: true }),
      !preview && this.options.landmarkPatches ? this.rockPipeline() : undefined,
      !preview ? this.terrainPipeline(world.terrainSampling, true) : undefined,
      !preview && this.options.landmarkPatches ? this.rockPipeline(true) : undefined,
    ]);
    Object.assign(this, { sunBake, tileCompute, solid, sky, rockSolid, wire, rockWire,
      wireMode: wire ? world.terrainSampling : undefined });
    this.uploadStudioMap(map, this.studioSeed);
    if (preview) this.startupMap = map;
    else {
      if (world.terrainSampling === "procedural") this.uploadProceduralWorld(map, world);
      this.fitRockSpans();
    }
    this.uploadStyle();
    if (d.features.has("timestamp-query")) {
      this.queries = d.createQuerySet({ type: "timestamp", count: 2 });
      this.resolve = d.createBuffer({
        size: 16,
        usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
      });
      this.read = d.createBuffer({
        size: 16,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
    }
    this.frameIndex = 0;
    this.resize();
    return this;
  }
  cachedTilePipeline() {
    const d = this.device;
    return this.cachedTileCompilation ??= d.createComputePipelineAsync({
      layout: "auto",
      compute: {
        module: d.createShaderModule({ label: "Cached planet patches", code: sceneWGSL + studioWGSL + patchesWGSL }),
        entryPoint: "bake_tile_vertices",
      },
    });
  }
  terrainPipeline(sampling, wire = false) {
    const key = `${sampling}:${wire}`;
    if (!this.terrainPipelines.has(key)) {
      this.terrainModule ??= this.device.createShaderModule({
        label: "Planet terrain",
        code: canyonBedsWGSL + studioWindWGSL + sceneWGSL + studioWGSL + patchesWGSL +
          surfaceNoiseWGSL + fieldWGSL + drainageWGSL + renderWGSL,
      });
      this.terrainPipelines.set(key, this.makeRenderPipeline(this.terrainModule, "planet_vertex", "planet_fragment", {
        wire, constants: { proceduralTerrain: sampling === "procedural" },
      }));
    }
    return this.terrainPipelines.get(key);
  }
  rockPipeline(wire = false) {
    this.rockModule ??= this.device.createShaderModule({ label: "Planet rock formations",
      code: sceneWGSL + studioWGSL + surfaceNoiseWGSL + rocksWGSL });
    return this.makeRenderPipeline(this.rockModule, "rock_vertex", "rock_fragment", { wire, buffers: [{
      arrayStride: 32,
      attributes: [
        { shaderLocation: 0, format: "float32x3", offset: 0 },
        { shaderLocation: 1, format: "float32x3", offset: 12 },
        { shaderLocation: 2, format: "float32x2", offset: 24 },
      ],
    }] });
  }
  finishStartup() {
    return this.startupCompletion ??= this.upgradeOrbit();
  }
  async upgradeOrbit() {
    if (!this.startupPreview || this.disposed) return;
    const world = this.requestedWorld;
    const [solid, rockSolid, tileCompute] = await Promise.all([
      this.terrainPipeline(world.terrainSampling),
      this.options.landmarkPatches ? this.rockPipeline() : undefined,
      world.terrainSampling === "cached" ? this.cachedTilePipeline() : undefined,
      world.terrainSampling === "procedural" ? this.initializeStudioVertices() : undefined,
    ]);
    if (this.disposed) return;
    this.solid = solid;
    this.rockSolid = rockSolid;
    this.tileCompute = tileCompute;
    this.startupPreview = false;
    this.allocateTileSamples(false);
    if (world.terrainSampling === "procedural") {
      this.uploadProceduralWorld(this.startupMap, world);
    }
    this.startupMap = null;
    this.bundle = null;
    this.fitRockSpans();
    this.uploadStyle();
  }
  initializeStudioVertices() {
    this.studioVertices ??= new StudioVertices(this.device);
    return this.studioVerticesCompilation ??= this.studioVertices.initialize();
  }
  get preset() {
    return this.profile.id;
  }
  get studioSeed() {
    return this.activeStudioSeed;
  }
  get radius() {
    return this.options.radius;
  }
  get detailSeed() {
    return this.studioSeed + this.options.seed;
  }
  get usesProceduralTiles() {
    return !this.startupPreview && this.terrainSampling === "procedural";
  }
  maxTileBudget(sampling = this.terrainSampling) {
    samplingMode(sampling);
    if (!this.device) return this.options.maxTiles;
    const limits = this.device.limits;
    const maxBytes = Math.min(limits.maxStorageBufferBindingSize, limits.maxBufferSize);
    const slots = Math.floor(maxBytes / (verticesPerTile(this.options.divs) * sampleStride(sampling)));
    const usable = slots >= 2 * spareTileSlots ? slots - spareTileSlots : Math.floor(slots / 2);
    return Math.min(this.options.maxTiles, limits.maxComputeWorkgroupsPerDimension, usable);
  }
  sampleSurface(direction, baseHeight) {
    return surface(
      direction,
      this.options.radius,
      this.detailSeed,
      this.preset,
      this.studioMap,
      this.oceanLevel,
      this.geology,
      this.detail,
      baseHeight,
    );
  }
  async probeSurface(direction) {
    if (this.terrainSampling !== "procedural") return this.sampleSurface(direction);
    if (this.startupPreview) await this.finishStartup();
    const map = this.studioMap;
    const height = await this.studioVertices.probe(direction);
    return map === this.studioMap && Number.isFinite(height) ? this.sampleSurface(direction, height) : null;
  }

  async bakeWorld({ profile, seed, detail, radius: size, terrainSampling }, compileVertices = true) {
    const procedural = terrainSampling === "procedural";
    const results = await Promise.allSettled([
      bakeStudioMap(this.noiseBuilder, {
        seed, erosion: true, geology: profile.geology, variation: detail.variation,
        rangeWeight: rangeWeights[detail.range], landscape: detail.landscape,
        landscapeStrength: detail.landscapeStrength, featureDensity: featureDensity(size),
        oceanCoverage: profile.dry ? 0 : profile.ocean?.coverage,
        lunar: profile.lunar,
        craterDetail: profile.craterDetail,
        cryoGlaciers: profile.cryoGlaciers,
        landmarkPatches: this.options.landmarkPatches,
        segments: procedural ? guideSegments : this.options.atlasSegments ?? atlasSegments(size),
        proceduralGuide: procedural,
      }),
      procedural && compileVertices ? this.initializeStudioVertices() : undefined,
    ]);
    for (const result of results) {
      if (result.status === "rejected") throw result.reason;
    }
    return results[0].value;
  }

  uploadProceduralWorld(map, { radius, profile, seed, detail }) {
    this.studioVertices.setWorld(map, radius, profile.geology, seed, detail, this.options.divs,
      this.options.atlasSegments ?? atlasSegments(radius) ?? studioSegments);
    this.studioVertices.bindTiles(this.tileJobBuffer, this.baseTileBuffer);
  }

  allocateTileSamples(resetSelection = true, keepCachedTiles = false) {
    const capacity = cacheSlots(this.tileBudget);
    const tileBytes = verticesPerTile(this.options.divs) * sampleStride(this.terrainSampling);
    const bytes = this.startupPreview ? 16 : capacity * tileBytes;
    if (this.baseTileBuffer?.size === bytes) return;
    const previous = this.baseTileBuffer;
    const canCopy = keepCachedTiles && !this.startupPreview && previous?.size < bytes && this.tileCache.slots.size > 0;
    this.baseTileBuffer = this.device.createBuffer({
      size: bytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
    });
    if (canCopy) {
      const encoder = this.device.createCommandEncoder();
      encoder.copyBufferToBuffer(previous, 0, this.baseTileBuffer, 0, this.tileCache.slots.size * tileBytes);
      this.device.queue.submit([encoder.finish()]);
      this.tileCache.capacity = capacity;
    } else {
      this.tileCache = new PlanetTileCache(capacity);
    }
    if (this.studioBuffer) this.bindTerrain();
    if (this.usesProceduralTiles && this.studioVertices?.guide)
      this.studioVertices.bindTiles(this.tileJobBuffer, this.baseTileBuffer);
    this.state = null;
    this.bundle = null;
    if (resetSelection && !canCopy && this.options.streamingLod) {
      this.split.clear();
      this.focalSplit.clear();
    }
    this.dirty = true;
    previous?.destroy();
  }
  sampleLandforms(direction) {
    const [alpine, canyon, granite, volcanic] = studioRegionWeights(this.studioMap, direction, this.geology);
    return { alpine, canyon, granite, volcanic };
  }
  fitRockSpans() {
    for (const rock of this.rockSpans) {
      rock.vertices.destroy();
      rock.indices?.destroy();
    }
    this.rockSpans = [];
    const r = this.options.radius;
    for (const rock of this.studioMap.rockSpans ?? []) {
      const { direction: up, span, depth } = rock;
      const size = rock.size * r / radius;
      const tall = size * rock.rise * Math.sqrt(this.studioMap.reliefScale ?? 1);
      const foot = (axis, offset) => this.sampleSurface(unit(up.map((v, i) => v + offset * size / r * axis[i])));
      const left = foot(span, -0.76), right = foot(span, 0.76);
      if (left.depth > 0 || right.depth > 0) continue;
      const grade = (right.height - left.height) / 1.52;
      const depthGrade = (foot(depth, 0.48).height - foot(depth, -0.48).height) / 0.96;
      const base = (left.height + right.height) * 0.5 - tall * 0.06;
      const center = up.map((v) => v * (r + base));
      const count = rock.vertices.length / 6;
      const data = new Float32Array(count * 8);
      for (let i = 0; i < count; i++) {
        const at = i * 6;
        const x = rock.vertices[at], y = rock.vertices[at + 1], z = rock.vertices[at + 2];
        // Transform normals by the inverse transpose of the slope fit.
        const ny = rock.vertices[at + 4] / tall;
        const nx = (rock.vertices[at + 3] - grade * ny) / size;
        const nz = (rock.vertices[at + 5] - depthGrade * ny) / size;
        const length = Math.hypot(nx, ny, nz) || 1;
        for (let axis = 0; axis < 3; axis++) {
          data[i * 8 + axis] = center[axis] + size * (x * span[axis] + z * depth[axis]) +
            (y * tall + x * grade + z * depthGrade) * up[axis];
          data[i * 8 + 3 + axis] = (nx * span[axis] + ny * up[axis] + nz * depth[axis]) / length;
        }
        data[i * 8 + 6] = y + 0.10 * x;
        data[i * 8 + 7] = rock.tint;
      }
      const vertices = this.device.createBuffer({ size: data.byteLength, usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST });
      this.device.queue.writeBuffer(vertices, 0, data);
      this.rockSpans.push({
        site: { ...rock.site, targetHeight: base + 0.42 * tall },
        vertices, count, center, size, tall, span, depth,
        bound: size * 2.3 + Math.abs(grade) + Math.abs(depthGrade),
      });
    }
  }
  visibleRockSpans(camera, wireframe) {
    const visible = [];
    for (const rock of this.rockSpans) {
      const dx = rock.center[0] - camera.position[0];
      const dy = rock.center[1] - camera.position[1];
      const dz = rock.center[2] - camera.position[2];
      const project = (axis) => axis[0] * dx + axis[1] * dy + axis[2] * dz;
      const forward = project(camera.forward), pad = rock.bound * 1.6;
      const range = Math.min(camera.far, 22000 * this.options.radius / radius);
      if (forward < -rock.bound || dx * dx + dy * dy + dz * dz > range * range ||
          Math.abs(project(camera.right)) > forward * camera.tanX + pad ||
          Math.abs(project(camera.up)) > forward * camera.tanY + pad) continue;
      const key = wireframe ? "wire" : "solid";
      if (!rock[key]) {
        const bundle = this.device.createRenderBundleEncoder({
          colorFormats: [this.format], depthStencilFormat: "depth24plus",
        });
        bundle.setBindGroup(0, this.group);
        bundle.setPipeline(wireframe ? this.rockWire : this.rockSolid);
        bundle.setVertexBuffer(0, rock.vertices);
        if (wireframe) {
          const indices = lines(Uint32Array.from({ length: rock.count }, (_, i) => i));
          rock.indices = this.device.createBuffer({ size: indices.byteLength, usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST });
          this.device.queue.writeBuffer(rock.indices, 0, indices);
          bundle.setIndexBuffer(rock.indices, "uint32");
          bundle.drawIndexed(indices.length);
        } else bundle.draw(rock.count);
        rock[key] = bundle.finish();
      }
      visible.push(rock);
    }
    return visible;
  }
  bindTerrain() {
    this.group = this.device.createBindGroup({
      layout: this.terrainLayout,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: this.instances } },
        { binding: 2, resource: { buffer: this.styleBuffer } },
        { binding: 3, resource: { buffer: this.studioBuffer } },
        { binding: 4, resource: this.sunView },
        { binding: 5, resource: this.sunSampler },
        { binding: 6, resource: { buffer: this.baseTileBuffer } },
      ],
    });
    this.bundle = null;
    if (this.tileCompute) this.bindTileCompute();
  }
  bindTileCompute() {
    this.tileComputeGroup = this.device.createBindGroup({
      layout: this.tileCompute.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 2, resource: { buffer: this.styleBuffer } },
        { binding: 3, resource: { buffer: this.studioBuffer } },
        { binding: 7, resource: { buffer: this.tileJobBuffer } },
        { binding: 8, resource: { buffer: this.baseTileBuffer } },
      ],
    });
  }
  uploadStudioMap(map, studioSeed, coarse = coarsenStudioPlanetNoise(map), relief = this.detail.relief) {
    const d = this.device;
    this.tileCache.clear();
    this.state = null;
    const deposits = map.glacialIce ?? map.alluvium;
    const required = map.values.byteLength + coarse.byteLength + map.regions.values.byteLength +
      districtAtlasSide ** 2 * 8 + (deposits?.values.byteLength ?? 0);
    if (!this.studioBuffer || this.studioBuffer.size !== required) {
      const previous = this.studioBuffer;
      this.studioBuffer = d.createBuffer({
        size: required,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.bindTerrain();
      this.shadowBytes = 0;
      previous?.destroy();
    }
    if (this.shadowBytes !== map.values.byteLength) {
      this.shadowBytes = map.values.byteLength;
      this.sunBakeGroups = this.shadowParams.map((buffer, layer) => d.createBindGroup({
        layout: this.sunBake.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: this.sunMap.createView({ dimension: "2d", baseArrayLayer: layer, arrayLayerCount: 1 }) },
          { binding: 1, resource: { buffer } },
          { binding: 3, resource: { buffer: this.studioBuffer, size: this.shadowBytes } },
        ],
      }));
    }
    this.device.queue.writeBuffer(this.studioBuffer, 0, map.values);
    this.device.queue.writeBuffer(this.studioBuffer, map.values.byteLength, coarse);
    this.device.queue.writeBuffer(this.studioBuffer, map.values.byteLength + coarse.byteLength, map.regions.values);
    const districtsAt = map.values.byteLength + coarse.byteLength + map.regions.values.byteLength;
    if (map.springs) this.device.queue.writeBuffer(this.studioBuffer, districtsAt, map.springs.values);
    if (map.dunes) this.device.queue.writeBuffer(this.studioBuffer,
      districtsAt + districtAtlasSide ** 2 * 4, map.dunes.values);
    if (deposits) this.device.queue.writeBuffer(this.studioBuffer,
      districtsAt + districtAtlasSide ** 2 * 8, deposits.values);
    this.setStudioSurface(map, studioSeed, relief);
  }
  setStudioSurface(map, studioSeed, relief) {
    const sizeRelief = Math.min(1, Math.sqrt(this.radius / radius));
    const reliefScale = studioPlanetRelief(studioSeed) * sizeRelief * relief;
    if (map.guide) {
      // The extra guide planes are only needed to upload the point sampler.
      const { guide, ...surface } = map;
      this.studioMap = { ...surface, reliefScale };
    } else {
      this.studioMap = map.reliefScale === reliefScale ? map : { ...map, reliefScale };
    }
    this.shadowBins = [-1, -1];
    this.reliefCache.clear();
    this.activeStudioSeed = studioSeed;
    this.oceanLevel = studioOceanLevel(this.studioMap, studioSeed, this.options.radius);
    this.elevationBounds = studioElevationBounds(
      this.studioMap,
      this.options.radius,
      this.geology,
    );
    if (this.oceanLevel !== null)
      this.elevationBounds[0] = Math.max(
        this.elevationBounds[0],
        this.oceanLevel,
      );
    this.dirty = true;
  }
  updateSunShadows(encoder, step, blend) {
    // Alternate between layers. Adjacent samples crossfade, so animation
    // normally needs only one new compute dispatch every five degrees.
    let pass;
    for (let i = 0; i < (blend > 0 ? 2 : 1); i++) {
      const bin = (step + i) % shadowSteps;
      const layer = bin % 2;
      if (this.shadowBins[layer] === bin) continue;
      this.device.queue.writeBuffer(this.shadowParams[layer], 0, new Float32Array([
        (this.oceanLevel ?? 0) / this.options.radius, Number(this.oceanLevel !== null),
        (this.studioMap.reliefScale ?? 1) / this.studioMap.featureDensity, 0, ...sunDirection(bin / shadowSteps), 0,
      ]));
      if (!pass) {
        pass = encoder.beginComputePass();
        pass.setPipeline(this.sunBake);
      }
      pass.setBindGroup(0, this.sunBakeGroups[layer]);
      pass.dispatchWorkgroups(shadowSide / 8, shadowSide / 8);
      this.shadowBins[layer] = bin;
    }
    pass?.end();
  }
  uploadStyle() {
    const { stops, ocean } = this.profile;
    const { min, max, side } = this.studioMap;
    const span = max - min;
    const style = new Float32Array(this.styleBuffer.size / 4);
    style.set([stops.length, 1 / (span * 1.08), side, min - span * 0.04]);
    const datum = this.studioMap.ocean?.datum;
    if (ocean && datum != null && datum < max) {
      // Use the third stop at the shoreline and the remaining stops on land.
      const shore = 2 / (stops.length - 1);
      style[1] = (1 - shore) / (max - datum);
      style[3] = datum - shore / style[1];
    }
    style.set(
      [
        this.oceanLevel ?? 0,
        Number(this.oceanLevel !== null),
        Number(this.geology === "mesa"),
        Number(this.geology === "alpine" || this.geology === "mixed"),
      ],
      4,
    );
    style.set(detailUniforms(this.detail), 8);
    // Two exactly representable words keep the material seed stable for
    // every uint32 seed, including values with float NaN bit patterns.
    style[14] = this.studioSeed & 0xffff;
    style[15] = this.studioSeed >>> 16;
    for (let i = 0; i < stops.length; i++) {
      const rgb = stops[i];
      for (let channel = 0; channel < 3; channel++) {
        const srgb = (rgb >> (16 - channel * 8)) & 255;
        style[16 + i * 4 + channel] = srgb / 255;
      }
    }
    style[144] = this.studioMap.reliefScale ?? 1;
    style[147] = districtAtlasSide ** 2;
    if (!this.options.landmarkPatches && !this.profile.lunar && !this.profile.material)
      style.set(studioClimate(this.studioSeed), 184);
    style.set(ocean?.shallow ?? defaultShallowWater, 188);
    style.set(ocean?.deep ?? defaultDeepWater, 192);
    if (ocean) {
      style.set(ocean.sediment, 196);
      style.set(ocean.outcrop, 200);
      style.set(ocean.shoal, 204);
    }
    style[208] = Number(this.profile.lunar);
    style[209] = this.detail.erosionStrength;
    style[210] = this.profile.material;
    style[211] = Number(!!this.studioMap.glacialIce);
    if (this.studioMap.springs) {
      style[145] = this.studioMap.springs.side;
      style.set(this.studioMap.springs.chart, 148);
    }
    if (this.studioMap.dunes) {
      style[146] = this.studioMap.dunes.side;
      style.set(this.studioMap.dunes.chart, 152);
      style.set(this.studioMap.dunes.wind, 156);
    }
    style[159] = this.profile.vegetation;
    for (let i = 0; i < this.rockSpans.length; i++) {
      const rock = this.rockSpans[i], start = 160 + i * 12;
      style.set([...rock.center, rock.size, ...rock.span, rock.tall, ...rock.depth, 0], start);
    }
    this.device.queue.writeBuffer(this.styleBuffer, 0, style);
  }
  configure(options = {}) {
    const {
    pixelError = this.pixelError,
    lodScale = this.lodScale,
    tileBudget = this.tileBudget,
    preset,
    studioSeed,
    detail,
    radius: requestedRadius,
    terrainSampling,
    } = options;
    if (this.studioBuffer && this.startupPreview && (preset !== undefined || studioSeed !== undefined ||
        detail !== undefined || requestedRadius !== undefined || terrainSampling !== undefined))
      return this.finishStartup().then(() => this.configure(options));
    if (!(Number.isFinite(pixelError) && pixelError > 0))
      throw new RangeError("Pixel error must be positive.");
    if (!(Number.isFinite(lodScale) && lodScale >= 0.25 && lodScale <= 32))
      throw new RangeError("LOD scale must be between 0.25 and 32.");
    const previous = this.requestedWorld;
    const nextSampling = terrainSampling === undefined ? previous.terrainSampling : samplingMode(terrainSampling);
    const budgetMode = terrainSampling === undefined ? this.terrainSampling : nextSampling;
    const budgetLimit = this.maxTileBudget(budgetMode);
    if (
      options.tileBudget !== undefined &&
      (!Number.isInteger(tileBudget) || tileBudget < 24 || tileBudget > budgetLimit)
    )
      throw new RangeError(`Tile budget must be between 24 and ${budgetLimit} for ${budgetMode} sampling.`);
    const applyBudgetNow = budgetMode === this.terrainSampling;
    const activeBudget = applyBudgetNow ? tileBudget : this.tileBudget;
    const nextRadius = requestedRadius ?? previous.radius;
    if (!Number.isFinite(nextRadius) || nextRadius < 16384 || nextRadius > 2000000 ||
        nextRadius < this.options.minSpacing)
      throw new RangeError("Use a radius of 16,384–2,000,000 m and at least the minimum spacing.");
    const profile = preset === undefined ? previous.profile : getPreset(preset);
    const nextDetail = detail === undefined ? previous.detail : planetDetail(detail, previous.detail);
    const nextSeed = worldSeed(
      studioSeed ??
        (profile === previous.profile
          ? previous.seed
          : this.options.studioSeed + profile.seedOffset),
    );
    if (
      pixelError !== this.pixelError ||
      lodScale !== this.lodScale ||
      activeBudget !== this.tileBudget
    ) {
      this.pixelError = pixelError;
      this.lodScale = lodScale;
      this.tileBudget = activeBudget;
      if (this.baseTileBuffer) this.allocateTileSamples(true, true);
      if (!this.options.streamingLod) this.split.clear();
      this.dirty = true;
    }
    if (preset === undefined && studioSeed === undefined && detail === undefined &&
        requestedRadius === undefined && terrainSampling === undefined)
      return Promise.resolve();
    const world = this.requestedWorld = { profile, seed: nextSeed, detail: nextDetail, radius: nextRadius,
      terrainSampling: nextSampling };
    if (!this.studioBuffer) {
      this.profile = profile;
      this.activeStudioSeed = nextSeed;
      this.detail = nextDetail;
      this.options.radius = nextRadius;
      this.terrainSampling = nextSampling;
      this.tileBudget = Math.min(tileBudget, this.maxTileBudget(nextSampling));
      return Promise.resolve();
    }
    const request = ++this.studioRequest;
    const current = () => !this.disposed && request === this.studioRequest;
    const update = this.studioQueue.then(async () => {
      if (!current()) return;
      const before = this.studioMap;
      const previousDetail = this.detail;
      const sizeChanged = nextRadius !== this.radius;
      const samplingChanged = nextSampling !== this.terrainSampling;
      if (sizeChanged || samplingChanged || nextSeed !== this.studioSeed || profile.geology !== this.geology ||
          profile.ocean?.coverage !== this.profile.ocean?.coverage ||
          profile.lunar !== this.profile.lunar ||
          profile.dry !== this.profile.dry ||
          profile.craterDetail !== this.profile.craterDetail ||
          profile.cryoGlaciers !== this.profile.cryoGlaciers ||
          nextDetail.variation !== this.detail.variation || nextDetail.range !== this.detail.range ||
          nextDetail.landscape !== this.detail.landscape ||
          (nextDetail.landscape !== "natural" && nextDetail.landscapeStrength !== this.detail.landscapeStrength)) {
        const [baked, compiled] = await Promise.allSettled([
          this.bakeWorld(world),
          samplingChanged ? Promise.all([
            this.terrainPipeline(nextSampling),
            nextSampling === "cached" ? this.cachedTilePipeline() : undefined,
            !this.options.progressiveStartup ? this.terrainPipeline(nextSampling, true) : undefined,
          ]) : undefined,
        ]);
        if (baked.status === "rejected") throw baked.reason;
        if (compiled.status === "rejected") throw compiled.reason;
        if (!current()) return;
        const map = baked.value;
        this.options.radius = nextRadius;
        this.geology = profile.geology;
        this.terrainSampling = nextSampling;
        if (samplingChanged) {
          this.tileBudget = Math.min(applyBudgetNow ? this.tileBudget : (options.tileBudget ?? this.tileBudget),
            this.maxTileBudget(nextSampling));
          [this.solid, this.tileCompute, this.wire] = compiled.value;
          this.wireMode = this.wire ? nextSampling : undefined;
        }
        const previousSamples = this.baseTileBuffer;
        this.allocateTileSamples();
        if (samplingChanged && this.tileCompute && previousSamples === this.baseTileBuffer)
          this.bindTileCompute();
        this.uploadStudioMap(map, nextSeed, undefined, nextDetail.relief);
        if (nextSampling === "procedural") this.uploadProceduralWorld(map, world);
        else if (this.studioVertices) {
          this.studioVertices.dispose();
          this.studioVertices = null;
          this.studioVerticesCompilation = null;
        }
      } else if (nextDetail.relief !== previousDetail.relief) {
        this.setStudioSurface(before, nextSeed, nextDetail.relief);
      }
      this.profile = profile;
      this.detail = nextDetail;
      if (sizeChanged) this.split.clear();
      if (before !== this.studioMap || previousDetail !== nextDetail) this.fitRockSpans();
      this.uploadStyle();
    });
    this.studioQueue = update.catch(() => {
      if (current()) this.requestedWorld = { profile: this.profile, seed: this.studioSeed, detail: this.detail,
        radius: this.radius, terrainSampling: this.terrainSampling };
    });
    return update;
  }
  resize() {
    const { width, height } = renderSize(this.canvas, this.options);
    if (
      this.depth &&
      width === this.canvas.width &&
      height === this.canvas.height
    )
      return;
    this.canvas.width = width;
    this.canvas.height = height;
    this.depth?.destroy();
    this.depth = this.device.createTexture({
      size: [width, height],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.dirty = true;
  }
  indexBuffer(data) {
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    return buffer;
  }
  template(mask) {
    if (this.templates.has(mask)) return this.templates.get(mask);
    const indices = buildIndices(this.options.divs, mask, "mc33", true);
    const result = {
      solid: this.indexBuffer(indices),
      solidCount: indices.length,
      indices,
    };
    this.templates.set(mask, result);
    return result;
  }
  sampleTileRelief(node) {
    const cached = this.reliefCache.get(node.key);
    if (cached) return cached;
    const scale = studioHeightScale(this.options.radius) / this.studioMap.featureDensity * (this.studioMap.reliefScale ?? 1);
    const elevation = (dir) => {
      const height = sampleStudioPlanetNoise(this.studioMap, dir) * scale;
      return this.oceanLevel === null ? height : Math.max(height, this.oceanLevel);
    };
    const center = elevation(node.dir);
    let min = center,
      max = center;
    for (const [x, y] of [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]]) {
      const height = elevation(
        unit(cube(node.face, node.u + x * node.size, node.v + y * node.size)),
      );
      min = Math.min(min, height);
      max = Math.max(max, height);
    }
    const result = [center, max - min];
    this.reliefCache.set(node.key, result);
    return result;
  }
  select(camera, now, pose) {
    const start = performance.now();
    if (this.reliefCache.size > Math.max(16000, this.tileBudget * 3)) this.reliefCache.clear();
    const streaming = this.options.streamingLod;
    // Keep the normal streaming batch at the default budget. Stress budgets
    // need larger batches to avoid repeatedly planning tens of thousands of
    // already-built patches just to add a handful of new ones.
    const batchScale = Math.min(12, Math.ceil(this.tileBudget / 4096));
    const quality = streaming ? Math.min(1, Math.sqrt(2 / this.pixelError)) : 1;
    const plan = selectPlanet(
      camera,
      {
        ...this.options,
        maxTiles: Math.max(24, Math.floor(this.tileBudget * quality)),
        centerPriority: streaming,
        previousFocal: this.focalSplit,
        splitBudget: streaming ? (this.usesProceduralTiles ? 24 : 48) * batchScale : Infinity,
        pixelError: this.pixelError,
        lodScale: this.lodScale,
        elevationBounds: this.elevationBounds,
        sampleRelief: (node) => this.sampleTileRelief(node),
      },
      this.split,
    );
    this.split = plan.split;
    this.focalSplit = plan.focalSplit;
    this.pose = pose;
    this.lastSelect = now;
    this.dirty = false;
    this.stats.selectionMs = performance.now() - start;
    this.stats.leaves = plan.leaves.size;
    const previous = this.state;
    const sameTiles = previous?.length === plan.visible.length && plan.visible.every(
      (tile, i) => tile.key === previous[i].key && tile.mask === previous[i].mask,
    );
    this.refineNext = plan.deferred && !sameTiles;
    if (sameTiles) return;
    this.state = plan.visible;
    this.bundle = null;
    const cached = this.startupPreview ? null : this.tileCache.assign(plan.visible);
    this.pendingBaseTiles = cached?.builds.length ?? 0;
    if (cached?.builds.length) {
      const { builds } = cached;
      const jf = new Float32Array(this.tileJobRecords), ju = new Uint32Array(this.tileJobRecords);
      const pendingKeys = new Set(builds.map(({ tile }) => tile.key));
      builds.forEach(({ tile, slot }, i) => {
        const at = i * 8;
        jf[at] = tile.u;
        jf[at + 1] = tile.v;
        jf[at + 2] = tile.size;
        ju[at + 3] = tile.face;
        ju[at + 5] = slot;
        const parent = parentTileKey(tile);
        const parentSlot = pendingKeys.has(parent) ? undefined : this.tileCache.slots.get(parent);
        ju[at + 6] = parentSlot === undefined ? 0 : parentSlot + 1;
        ju[at + 7] = (tile.x & 1) | ((tile.y & 1) << 1);
      });
      this.device.queue.writeBuffer(this.tileJobBuffer, 0, this.tileJobRecords, 0, this.pendingBaseTiles * 32);
    }
    const buckets = Array.from({ length: 16 }, () => []);
    for (const node of plan.visible) buckets[node.mask].push(node);
    const f = new Float32Array(this.records),
      u = new Uint32Array(this.records);
    let count = 0,
      triangles = 0,
      finest = Infinity;
    const grades = new Set();
    this.draws = [];
    for (let mask = 0; mask < 16; mask++) {
      const tiles = buckets[mask];
      if (!tiles.length) continue;
      const template = this.template(mask),
        base = count;
      for (const node of tiles) {
        const at = count++ * 8;
        f[at] = node.u;
        f[at + 1] = node.v;
        f[at + 2] = node.size;
        u[at + 3] = node.face;
        u[at + 4] = node.level;
        u[at + 5] = cached?.assigned.get(node.key) ?? 0;
        finest = Math.min(finest, node.spacing);
        grades.add(node.level);
      }
      triangles += (tiles.length * template.solidCount) / 3;
      this.draws.push({ template, count: tiles.length, base });
    }
    if (count)
      this.device.queue.writeBuffer(
        this.instances,
        0,
        this.records,
        0,
        count * 32,
      );
    this.terrainTriangles = triangles;
    Object.assign(this.stats, {
      tiles: count,
      triangles,
      grades: grades.size,
      finest,
      planBuilds: this.stats.planBuilds + 1,
      instanceBytes: this.instances.size,
    });
  }
  render(
    camera,
    now = performance.now(),
    { lodColors = false, wireframe = false, sunPhase = 0, atmosphere = "preset" } = {},
  ) {
    const start = performance.now(),
      d = this.device;
    this.resize();
    const clearance =
      camera.clearance ??
      Math.hypot(...camera.position) -
        this.options.radius -
        this.sampleSurface(unit(camera.position)).height;
    const pose = [
      ...camera.position,
      ...camera.forward,
      ...camera.up,
      camera.pixelScale,
      camera.far,
      clearance,
    ];
    const turned =
      this.pose &&
      camera.forward.some((v, i) => Math.abs(v - this.pose[i + 3]) > 0.08);
    const procedural = this.usesProceduralTiles;
    if (wireframe && !this.startupPreview) {
      const sampling = this.terrainSampling;
      if (this.wireMode !== sampling) {
        this.wireMode = sampling;
        this.wire = undefined;
        this.terrainPipeline(sampling, true).then((pipeline) => {
          if (this.wireMode === sampling) this.wire = pipeline;
        }).catch((error) => { if (!this.disposed) this.errors.push(error.message); });
      }
      if (this.rockSpans.length && !this.rockWire && !this.rockWireCompilation) {
        this.rockWireCompilation = this.rockPipeline(true).then((pipeline) => {
          this.rockWire = pipeline;
        }).catch((error) => { if (!this.disposed) this.errors.push(error.message); });
      }
      wireframe = !!this.wire && (!this.rockSpans.length || !!this.rockWire);
    } else wireframe = false;
    if (
      (!this.refinementInFlight || this.state === null) &&
      (this.dirty ||
        turned ||
        (now - this.lastSelect >= 95 && pose.some((v, i) => v !== this.pose[i])))
    )
      this.select({ ...camera, clearance }, now, pose);
    const f = this.frame;
    f.set(relativeCamera(camera).viewProjection);
    f.set([...camera.position, this.options.radius], 16);
    f.set([...camera.right, camera.tanX], 20);
    f.set([...camera.up, camera.tanY], 24);
    f.set(camera.forward, 28);
    f[31] = 1 / camera.pixelScale;
    f.set(
      [this.options.divs, 0, Number(lodColors), Math.max(0, clearance)],
      32,
    );
    this.words[33] = this.detailSeed;
    const turn = Number.isFinite(sunPhase) ? sunPhase - Math.floor(sunPhase) : 0;
    const step = Math.floor(turn * shadowSteps);
    const blend = turn * shadowSteps - step;
    const [sky, dusk, density] = atmosphereColors(this.preset, atmosphere);
    f.set([...sunDirection(turn), blend], 36);
    f.set([...sky, density], 40);
    f.set([...dusk, step % 2], 44);
    // Bring in orbital shading before the flyover normals fade out.
    f[48] = this.options.streamingLod ? orbitDetailWeight(clearance, 60000, 100000) : 0;
    f[49] = this.options.minSpacing;
    d.queue.writeBuffer(this.uniform, 0, f);
    const rocks = this.visibleRockSpans(camera, wireframe);
    this.stats.drawCalls = this.draws.length + 1 + rocks.length;
    this.stats.triangles = this.terrainTriangles + rocks.reduce((sum, rock) => sum + rock.count / 3, 0);
    if (!this.bundle || this.bundleWire !== wireframe) {
      const b = d.createRenderBundleEncoder({
        colorFormats: [this.format],
        depthStencilFormat: "depth24plus",
      });
      b.setBindGroup(0, this.group);
      b.setPipeline(this.sky);
      b.draw(3);
      b.setPipeline(wireframe ? this.wire : this.solid);
      for (const { template, count, base } of this.draws) {
        if (wireframe && !template.wire) {
          const indices = lines(template.indices);
          template.wire = this.indexBuffer(indices);
          template.wireCount = indices.length;
          template.indices = null;
        }
        b.setIndexBuffer(wireframe ? template.wire : template.solid, "uint32");
        b.drawIndexed(
          wireframe ? template.wireCount : template.solidCount,
          count,
          0,
          0,
          base,
        );
      }
      this.bundle = b.finish();
      this.bundleWire = wireframe;
    }
    const encoder = d.createCommandEncoder();
    const buildingTiles = this.pendingBaseTiles > 0;
    if (this.pendingBaseTiles) {
      const bake = encoder.beginComputePass();
      const verticesPerPatch = (this.options.divs + 1) ** 2;
      if (procedural) this.studioVertices.dispatch(bake, verticesPerPatch, this.pendingBaseTiles);
      else {
        bake.setPipeline(this.tileCompute);
        bake.setBindGroup(0, this.tileComputeGroup);
        bake.dispatchWorkgroups(Math.ceil(verticesPerPatch / 64), this.pendingBaseTiles);
      }
      bake.end();
      this.stats.baseTileBuilds = (this.stats.baseTileBuilds ?? 0) + this.pendingBaseTiles;
      this.pendingBaseTiles = 0;
    }
    if (!this.startupPreview) this.updateSunShadows(encoder, step, blend);
    const timed = this.queries && !this.timing && this.frameIndex++ % 20 === 0;
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: [0, 0, 0, 1],
          loadOp: "clear",
          storeOp: "store",
        },
      ],
      depthStencilAttachment: {
        view: this.depth.createView(),
        depthClearValue: 1,
        depthLoadOp: "clear",
        depthStoreOp: "discard",
      },
      ...(timed
        ? {
            timestampWrites: {
              querySet: this.queries,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {}),
    });
    pass.executeBundles([this.bundle, ...rocks.map((rock) => wireframe ? rock.wire : rock.solid)]);
    pass.end();
    if (timed) {
      encoder.resolveQuerySet(this.queries, 0, 2, this.resolve, 0);
      encoder.copyBufferToBuffer(this.resolve, 0, this.read, 0, 16);
    }
    d.queue.submit([encoder.finish()]);
    if (this.startupPreview && !this.startupScheduled) {
      this.startupScheduled = true;
      d.queue.onSubmittedWorkDone().then(() => this.finishStartup())
        .catch((error) => { if (!this.disposed) this.errors.push(error.message); });
    }
    if (this.options.streamingLod && !this.refinementInFlight && (buildingTiles || this.refineNext)) {
      this.refinementInFlight = true;
      const refine = this.refineNext;
      d.queue.onSubmittedWorkDone().then(() => {
        if (!this.disposed && refine) this.dirty = true;
      }).catch((error) => {
        if (!this.disposed) this.errors.push(error.message);
      }).finally(() => { this.refinementInFlight = false; });
    }
    if (timed) {
      this.timing = true;
      this.read
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const ticks = new BigUint64Array(this.read.getMappedRange());
          this.stats.gpuMs = Number(ticks[1] - ticks[0]) / 1e6;
          this.read.unmap();
        })
        .catch((error) => {
          if (!this.disposed) this.errors.push(error.message);
        })
        .finally(() => {
          this.timing = false;
        });
    }
    this.stats.cpuMs = performance.now() - start;
    return this.stats;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const t of this.templates.values()) {
      t.solid.destroy();
      t.wire?.destroy();
    }
    for (const rock of this.rockSpans) {
      rock.vertices.destroy();
      rock.indices?.destroy();
    }
    for (const resource of [
      this.depth,
      this.uniform,
      this.styleBuffer,
      this.studioBuffer,
      this.baseTileBuffer,
      this.tileJobBuffer,
      ...(this.shadowParams ?? []),
      this.sunMap,
      this.instances,
      this.queries,
      this.resolve,
      this.read,
    ])
      resource?.destroy();
    this.studioMap = null;
    this.startupMap = null;
    Promise.allSettled([this.studioQueue, this.startupCompletion, this.studioVerticesCompilation]).then(() => {
      this.noiseBuilder?.dispose();
      this.studioVertices?.dispose();
    });
    disposeGPUContext(this);
  }
}
export async function createPlanet(canvas, options) {
  const renderer = new PlanetRenderer(canvas, options);
  try {
    return await renderer.initialize();
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}
