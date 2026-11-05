import { initializeGPU, disposeGPUContext, renderSize } from "../api/gpu.js";
import { relativeCamera } from "../api/camera.js";
import { buildIndices, lines } from "../terrain/surface.js";
import { cube, selectPlanet } from "./lod.js";
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
import { bakeStudioMap } from "../noise/studio-map.js";
import { NoiseComputeBuilder } from "../noise/noiseCompute.js";
import { coarsenStudioPlanetNoise, sampleStudioPlanetNoise, studioSeed } from "../noise/studio.js";
import fieldWGSL from "./shaders/field.wgsl";
import renderWGSL from "./shaders/render.wgsl";
import shadowWGSL from "./shaders/shadow.wgsl";
import studioWGSL from "./shaders/studio.wgsl";

function worldSeed(value) {
  if (!Number.isSafeInteger(value))
    throw new RangeError("Use an integer planet seed.");
  return value >>> 0;
}

const shadowSide = 512;

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
    };
    const { radius: r, divs, maxTiles, minSpacing } = this.options;
    if (
      !(
        Number.isFinite(r) &&
        r >= 16384 &&
        r <= 2000000 &&
        [8, 16, 32].includes(divs) &&
        Number.isInteger(maxTiles) &&
        maxTiles >= 24 &&
        maxTiles <= 1200 &&
        Number.isFinite(minSpacing) &&
        minSpacing >= 0.5 &&
        minSpacing <= r
      )
    )
      throw new RangeError(
        "Use a radius of 16,384–2,000,000 m, 8/16/32 divisions, 24–1200 tiles and valid spacing.",
      );
    this.pixelError = 3;
    this.lodScale = 1.5;
    this.tileBudget = maxTiles;
    this.reliefCache = new Map();
    this.profile = getPreset(options.preset);
    this.activeStudioSeed = worldSeed(
      options.studioSeed ?? this.options.studioSeed + this.profile.seedOffset,
    );
    this.studioRequest = 0;
    this.studioQueue = Promise.resolve();
    this.split = new Set();
    this.templates = new Map();
    this.stats = { gpuMs: null, planBuilds: 0 };
    this.errors = [];
    this.lastSelect = -Infinity;
    this.dirty = true;
    this.frame = new Float32Array(36);
    this.words = new Uint32Array(this.frame.buffer);
  }
  async initialize() {
    const d = await initializeGPU(this);
    this.noiseBuilder = new NoiseComputeBuilder(d, d.queue);
    const map = await bakeStudioMap(this.noiseBuilder, {
      seed: this.studioSeed,
      erosion: true,
      geology: this.profile.geology,
    });
    this.geology = this.profile.geology;
    const coarse = coarsenStudioPlanetNoise(map);
    this.studioBuffer = d.createBuffer({
      size: map.values.byteLength + coarse.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.sunMap = d.createTexture({
      label: "Planet baked sun visibility",
      size: [shadowSide, shadowSide],
      format: "rgba8unorm",
      usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
    });
    const sunView = this.sunMap.createView();
    this.sunBake = await d.createComputePipelineAsync({
      layout: "auto",
      compute: {
        module: d.createShaderModule({ code: studioWGSL + shadowWGSL }),
        entryPoint: "bake_sun_visibility",
      },
    });
    this.sunBakeGroup = d.createBindGroup({
      layout: this.sunBake.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: sunView },
        { binding: 3, resource: { buffer: this.studioBuffer, size: map.values.byteLength } },
      ],
    });
    this.uploadStudioMap(map, this.studioSeed, coarse);
    this.uniform = d.createBuffer({
      size: this.frame.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.styleBuffer = d.createBuffer({
      size: (2 + 32) * 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.uploadStyle();
    this.instances = d.createBuffer({
      size: this.options.maxTiles * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    this.records = new ArrayBuffer(this.instances.size);
    const layout = d.createBindGroupLayout({
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
          texture: { sampleType: "float" },
        },
        {
          binding: 5,
          visibility: GPUShaderStage.FRAGMENT,
          sampler: { type: "filtering" },
        },
      ],
    });
    this.group = d.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: this.uniform } },
        { binding: 1, resource: { buffer: this.instances } },
        { binding: 2, resource: { buffer: this.styleBuffer } },
        { binding: 3, resource: { buffer: this.studioBuffer } },
        { binding: 4, resource: sunView },
        {
          binding: 5,
          resource: d.createSampler({
            addressModeU: "repeat",
            minFilter: "linear",
            magFilter: "linear",
          }),
        },
      ],
    });
    const module = d.createShaderModule({
      label: "Planet terrain and atmosphere",
      code: studioWGSL + fieldWGSL + renderWGSL,
    });
    const compilation = await module.getCompilationInfo();
    const errors = compilation.messages.filter((m) => m.type === "error");
    if (errors.length) throw new Error(errors.map((m) => m.message).join("\n"));
    const pipelineLayout = d.createPipelineLayout({
      bindGroupLayouts: [layout],
    });
    function pipeline(vertex, fragment, topology, terrain) {
      return d.createRenderPipelineAsync({
        layout: pipelineLayout,
        vertex: { module, entryPoint: vertex },
        fragment: {
          module,
          entryPoint: fragment,
          targets: [{ format: this.format }],
        },
        primitive: {
          topology,
          cullMode: terrain && topology === "triangle-list" ? "back" : "none",
        },
        depthStencil: {
          format: "depth24plus",
          depthWriteEnabled: terrain,
          depthCompare: terrain ? "less" : "always",
        },
      });
    }
    [this.solid, this.wire, this.sky] = await Promise.all([
      pipeline.call(
        this,
        "planet_vertex",
        "planet_fragment",
        "triangle-list",
        true,
      ),
      pipeline.call(
        this,
        "planet_vertex",
        "planet_fragment",
        "line-list",
        true,
      ),
      pipeline.call(this, "sky_vertex", "sky_fragment", "triangle-list", false),
    ]);
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
  get preset() {
    return this.profile.id;
  }
  get studioSeed() {
    return this.activeStudioSeed;
  }
  get detailSeed() {
    return this.studioSeed + this.options.seed;
  }
  sampleSurface(direction) {
    return surface(
      direction,
      this.options.radius,
      this.detailSeed,
      this.preset,
      this.studioMap,
      this.oceanLevel,
      this.geology,
    );
  }
  uploadStudioMap(map, studioSeed, coarse = coarsenStudioPlanetNoise(map)) {
    this.device.queue.writeBuffer(this.studioBuffer, 0, map.values);
    this.device.queue.writeBuffer(this.studioBuffer, map.values.byteLength, coarse);
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(this.sunBake);
    pass.setBindGroup(0, this.sunBakeGroup);
    pass.dispatchWorkgroups(shadowSide / 8, shadowSide / 8);
    pass.end();
    this.device.queue.submit([encoder.finish()]);
    this.studioMap = map;
    this.reliefCache.clear();
    this.activeStudioSeed = studioSeed;
    this.oceanLevel = studioOceanLevel(map, studioSeed, this.options.radius);
    this.elevationBounds = studioElevationBounds(
      map,
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
  uploadStyle() {
    const { stops } = this.profile;
    const { min, max, side } = this.studioMap;
    const span = max - min;
    const style = new Float32Array(this.styleBuffer.size / 4);
    style.set([stops.length, 1 / (span * 1.08), side, min - span * 0.04]);
    style.set(
      [
        this.oceanLevel ?? 0,
        Number(this.oceanLevel !== null),
        Number(this.geology === "mesa"),
        Number(this.geology === "alpine" || this.geology === "mixed"),
      ],
      4,
    );
    for (let i = 0; i < stops.length; i++) {
      const rgb = stops[i];
      for (let channel = 0; channel < 3; channel++) {
        const srgb = (rgb >> (16 - channel * 8)) & 255;
        style[8 + i * 4 + channel] = srgb / 255;
      }
    }
    this.device.queue.writeBuffer(this.styleBuffer, 0, style);
  }
  configure({
    pixelError = this.pixelError,
    lodScale = this.lodScale,
    tileBudget = this.tileBudget,
    preset,
    studioSeed,
  } = {}) {
    if (!(Number.isFinite(pixelError) && pixelError > 0))
      throw new RangeError("Pixel error must be positive.");
    if (!(Number.isFinite(lodScale) && lodScale >= 0.25 && lodScale <= 4))
      throw new RangeError("LOD scale must be between 0.25 and 4.");
    if (
      !Number.isInteger(tileBudget) ||
      tileBudget < 24 ||
      tileBudget > this.options.maxTiles
    )
      throw new RangeError("Tile budget must be between 24 and the allocated maximum.");
    const profile = getPreset(preset ?? this.preset);
    const nextSeed = worldSeed(
      studioSeed ??
        (profile === this.profile
          ? this.studioSeed
          : this.options.studioSeed + profile.seedOffset),
    );
    if (
      pixelError !== this.pixelError ||
      lodScale !== this.lodScale ||
      tileBudget !== this.tileBudget
    ) {
      this.pixelError = pixelError;
      this.lodScale = lodScale;
      this.tileBudget = tileBudget;
      this.split.clear();
      this.dirty = true;
    }
    if (preset === undefined && studioSeed === undefined)
      return Promise.resolve();
    if (!this.studioBuffer) {
      this.profile = profile;
      this.activeStudioSeed = nextSeed;
      return Promise.resolve();
    }
    const request = ++this.studioRequest;
    const current = () => !this.disposed && request === this.studioRequest;
    const update = this.studioQueue.then(async () => {
      if (!current()) return;
      if (nextSeed !== this.studioSeed) {
        const map = await bakeStudioMap(this.noiseBuilder, {
          seed: nextSeed,
          erosion: true,
          geology: profile.geology,
        });
        if (!current()) return;
        this.geology = profile.geology;
        this.uploadStudioMap(map, nextSeed);
      }
      this.profile = profile;
      this.uploadStyle();
    });
    this.studioQueue = update.catch(() => {});
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
  template(mask) {
    if (this.templates.has(mask)) return this.templates.get(mask);
    const indices = buildIndices(this.options.divs, mask),
      wire = lines(indices);
    const upload = (data) => {
      const b = this.device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
      });
      new Uint32Array(b.getMappedRange()).set(data);
      b.unmap();
      return b;
    };
    const result = {
      solid: upload(indices),
      wire: upload(wire),
      solidCount: indices.length,
      wireCount: wire.length,
    };
    this.templates.set(mask, result);
    return result;
  }
  sampleTileRelief(node) {
    const cached = this.reliefCache.get(node.key);
    if (cached) return cached;
    const scale = studioHeightScale(this.options.radius);
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
    if (this.reliefCache.size > 16000) this.reliefCache.clear();
    const plan = selectPlanet(
      camera,
      {
        ...this.options,
        maxTiles: this.tileBudget,
        pixelError: this.pixelError,
        lodScale: this.lodScale,
        elevationBounds: this.elevationBounds,
        sampleRelief: (node) => this.sampleTileRelief(node),
      },
      this.split,
    );
    this.split = plan.split;
    this.pose = pose;
    this.lastSelect = now;
    this.dirty = false;
    this.stats.selectionMs = performance.now() - start;
    this.stats.leaves = plan.leaves.size;
    const state = plan.visible.map((t) => `${t.key}:${t.mask}`).join("|");
    if (this.state === state) return;
    this.state = state;
    this.bundle = null;
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
    { lodColors = false, wireframe = false } = {},
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
    if (
      this.dirty ||
      turned ||
      (now - this.lastSelect >= 95 && pose.some((v, i) => v !== this.pose[i]))
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
    d.queue.writeBuffer(this.uniform, 0, f);
    this.stats.drawCalls = this.draws.length + 1;
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
    pass.executeBundles([this.bundle]);
    pass.end();
    if (timed) {
      encoder.resolveQuerySet(this.queries, 0, 2, this.resolve, 0);
      encoder.copyBufferToBuffer(this.resolve, 0, this.read, 0, 16);
    }
    d.queue.submit([encoder.finish()]);
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
      t.wire.destroy();
    }
    for (const resource of [
      this.depth,
      this.uniform,
      this.styleBuffer,
      this.studioBuffer,
      this.sunMap,
      this.instances,
      this.queries,
      this.resolve,
      this.read,
    ])
      resource?.destroy();
    this.studioMap = null;
    this.studioQueue.then(() => this.noiseBuilder?.dispose());
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
