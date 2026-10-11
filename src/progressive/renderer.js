import { initializeGPU, disposeGPUContext, renderSize } from "../api/gpu.js";
import * as Field from "./field.js";
import * as LOD from "./lod.js";
import * as Surface from "../terrain/surface.js";
import tileShader from "./shaders/tiles.wgsl";

export class ProgressiveTerrainRenderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      rootSize: 1024,
      minSize: 1,
      divs: 32,
      memoryMB: 8,
      maxTiles: 384,
      buildsPerFrame: 6,
      ...options,
    };
    const { rootSize, minSize, divs, memoryMB, buildsPerFrame, maxTiles } =
      this.options;
    const power = (n) => n > 0 && Number.isInteger(Math.log2(n));
    if (
      !power(rootSize) ||
      !power(minSize) ||
      minSize > rootSize ||
      !power(divs) ||
      divs < 2 ||
      divs > 128 ||
      !Number.isFinite(memoryMB) ||
      memoryMB < 4 ||
      !Number.isInteger(buildsPerFrame) ||
      buildsPerFrame < 1 ||
      buildsPerFrame > 32 ||
      !Number.isInteger(maxTiles) ||
      maxTiles < 48 ||
      maxTiles > 1024
    )
      throw new RangeError(
        "Use power-of-two tile sizes/divisions, 4+ MB, 48–1024 tiles and 1–32 builds per frame",
      );
    this.settings = { pixelError: 2 };
    this.entries = new Map();
    this.templates = new Map();
    this.free = [];
    this.errors = [];
    this.stats = { generated: 0, evicted: 0, bundleBuilds: 0, selections: 0 };
    this.frameData = new ArrayBuffer(112);
    this.lastSelect = -Infinity;
    this.dirty = true;
    this.disposed = false;
  }
  async initialize() {
    const d = await initializeGPU(this);
    const row = this.options.divs + 1;
    const maxSlots = Math.min(
      this.options.maxTiles,
      Math.floor((this.options.memoryMB * 1024 ** 2) / (row * row * 16)),
    );
    this.columns = Math.min(
      Math.floor(Math.sqrt(maxSlots)),
      Math.floor(d.limits.maxTextureDimension2D / row),
    );
    this.rows = Math.min(
      Math.floor(maxSlots / this.columns),
      Math.floor(d.limits.maxTextureDimension2D / row),
    );
    this.capacity = this.columns * this.rows;
    if (this.capacity < 48)
      throw new Error("Tile cache needs room for at least 48 tiles");
    this.texture = d.createTexture({
      label: "Bounded progressive height/gradient tile atlas",
      size: [row * this.columns, row * this.rows],
      format: "rgba32float",
      usage:
        GPUTextureUsage.STORAGE_BINDING |
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC,
    });
    this.stats.atlasBytes = this.capacity * row * row * 16;
    this.free = Array.from({ length: this.capacity }, (_, i) => i);
    this.buildParams = d.createBuffer({
      size: 256 * this.options.buildsPerFrame,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.frameParams = d.createBuffer({
      size: 112,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.instanceBuffer = d.createBuffer({
      size: this.capacity * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const module = d.createShaderModule({ code: Field.wgsl + tileShader });
    const errors = (await module.getCompilationInfo()).messages.filter(
      (m) => m.type === "error",
    );
    if (errors.length) throw new Error(errors.map((m) => m.message).join("\n"));
    const buildLayout = d.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          storageTexture: { access: "write-only", format: "rgba32float" },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.COMPUTE,
          buffer: {
            type: "uniform",
            hasDynamicOffset: true,
            minBindingSize: 32,
          },
        },
      ],
    });
    this.compute = d.createComputePipeline({
      layout: d.createPipelineLayout({ bindGroupLayouts: [buildLayout] }),
      compute: { module, entryPoint: "generate" },
    });
    this.buildGroup = d.createBindGroup({
      layout: buildLayout,
      entries: [
        { binding: 0, resource: this.texture.createView() },
        { binding: 1, resource: { buffer: this.buildParams, size: 32 } },
      ],
    });
    const renderLayout = d.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          texture: { sampleType: "unfilterable-float" },
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
      ],
    });
    const pipeline = {
      layout: d.createPipelineLayout({ bindGroupLayouts: [renderLayout] }),
      vertex: { module, entryPoint: "vertex_main" },
      fragment: {
        module,
        entryPoint: "fragment_main",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list", cullMode: "back" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    };
    this.pipeline = d.createRenderPipeline(pipeline);
    this.linePipeline = d.createRenderPipeline({
      ...pipeline,
      primitive: { topology: "line-list" },
    });
    this.renderGroup = d.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: this.texture.createView() },
        { binding: 1, resource: { buffer: this.instanceBuffer } },
        { binding: 2, resource: { buffer: this.frameParams } },
      ],
    });
    if (d.features.has("timestamp-query"))
      this.timer = {
        query: d.createQuerySet({ type: "timestamp", count: 4 }),
        resolve: d.createBuffer({
          size: 32,
          usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
        }),
        read: d.createBuffer({
          size: 32,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
        }),
        busy: false,
      };
    this.resize();
    return this;
  }
  configure(values) {
    Object.assign(this.settings, values);
    this.dirty = true;
  }
  resize() {
    const { width: w, height: h } = renderSize(this.canvas, this.options);
    if (this.depth && w === this.canvas.width && h === this.canvas.height)
      return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.depth?.destroy();
    this.depth = this.device.createTexture({
      size: [w, h],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.dirty = true;
  }
  select(camera, planes, now) {
    const start = performance.now();
    let rootSize = this.options.rootSize;
    while (
      (Math.ceil((2 * camera.far) / rootSize) + 2) ** 2 >
      this.capacity / 4
    )
      rootSize *= 2;
    if (this.plan && this.plan.rootSize !== rootSize) {
      this.entries.clear();
      this.free = Array.from({ length: this.capacity }, (_, i) => i);
    }
    this.plan = LOD.select(
      camera,
      planes,
      {
        ...this.options,
        rootSize,
        maxNodes: Math.floor(this.capacity * 0.88),
        boundsCache: this.plan?.nodes,
        ...this.settings,
      },
      this.plan?.splits,
    );
    this.planes = planes;
    this.lastSelect = now;
    this.lastView = [...camera.position, camera.fov, camera.far, camera.height];
    const clearance = Math.abs(
      camera.position[1] - Field.height(camera.position[0], camera.position[2]),
    );
    this.sampleMove = Math.max(
      this.options.minSize * 0.25,
      Math.min(64, clearance * 0.06),
    );
    this.buildQueue = [];
    for (const n of this.plan.nodes.values()) {
      const e = this.entries.get(n.key);
      if (e) e.touched = now;
      else this.buildQueue.push(n);
    }
    this.buildQueue.sort(
      (a, b) => a.level - b.level || (a.distance ?? 0) - (b.distance ?? 0),
    );
    this.stats.pending = this.buildQueue.length;
    this.stats.selections++;
    this.stats.selectionMs = performance.now() - start;
    this.dirty = false;
    this.cutDirty = true;
    this.bundle = null;
  }
  allocate(n, now) {
    if (!this.free.length) {
      let victim;
      for (const e of this.entries.values())
        if (
          !this.plan.nodes.has(e.key) &&
          (!victim || e.touched < victim.touched)
        )
          victim = e;
      if (!victim) throw new Error("Resident tile budget exhausted");
      this.entries.delete(victim.key);
      this.free.push(victim.slot);
      this.stats.evicted++;
    }
    const e = { ...n, slot: this.free.pop(), touched: now };
    this.entries.set(n.key, e);
    return e;
  }
  build(encoder, now, timed) {
    const builds = this.buildQueue.splice(0, this.options.buildsPerFrame);
    this.stats.pending = this.buildQueue.length;
    this.stats.builtThisFrame = builds.length;
    if (!builds.length) return false;
    const data = new ArrayBuffer(builds.length * 256),
      f = new Float32Array(data),
      u = new Uint32Array(data);
    builds.forEach((n, i) => {
      const e = this.allocate(n, now),
        at = i * 64;
      f.set([n.ox, n.oz, n.size], at);
      u.set([e.slot, this.options.divs, this.columns, 7, 0], at + 3);
    });
    this.device.queue.writeBuffer(this.buildParams, 0, data);
    const pass = encoder.beginComputePass(
      timed
        ? {
            timestampWrites: {
              querySet: this.timer.query,
              beginningOfPassWriteIndex: 0,
              endOfPassWriteIndex: 1,
            },
          }
        : {},
    );
    pass.setPipeline(this.compute);
    builds.forEach((_, i) => {
      pass.setBindGroup(0, this.buildGroup, [i * 256]);
      pass.dispatchWorkgroups(
        Math.ceil((this.options.divs + 1) / 8),
        Math.ceil((this.options.divs + 1) / 8),
      );
    });
    pass.end();
    this.stats.generated += builds.length;
    this.cutDirty = true;
    this.bundle = null;
    return true;
  }
  template(divs, mask, wireframe) {
    const key = `${divs}:${mask}:${wireframe}`;
    if (this.templates.has(key)) return this.templates.get(key);
    let data = Surface.buildIndices(divs, mask, "mc33");
    const triangles = data.length / 3;
    if (wireframe) data = Surface.lines(data);
    const buffer = this.device.createBuffer({
      size: data.byteLength,
      usage: GPUBufferUsage.INDEX,
      mappedAtCreation: true,
    });
    new Uint32Array(buffer.getMappedRange()).set(data);
    buffer.unmap();
    const result = { buffer, count: data.length, triangles };
    this.templates.set(key, result);
    return result;
  }
  prepareCut(camera) {
    const start = performance.now();
    this.cut = LOD.residentCut(this.plan, (id) => this.entries.has(id));
    this.meshLevels = LOD.meshLevels(
      this.cut,
      camera,
      this.plan.rootSize,
      this.plan.maxLevel,
      { ...this.options, ...this.settings },
    );
    this.records = [];
    for (const n of this.cut.values()) {
      LOD.boundsFor(n);
      const geometry = this.meshLevels.get(n.key);
      this.records.push({
        n,
        ...geometry,
        slot: this.entries.get(n.key).slot,
        visible: false,
      });
    }
    this.cutDirty = false;
    this.bundle = null;
    this.stats.cutMs = performance.now() - start;
  }
  prepare(camera, planes, wireframe) {
    const start = performance.now();
    let changed = !this.bundle || this.wireframe !== wireframe;
    for (const record of this.records) {
      const shown =
        LOD.visible(record.n, planes) &&
        LOD.distanceToBounds(record.n, camera.position) <= camera.far;
      if (shown !== record.visible) changed = true;
      record.visible = shown;
    }
    if (!changed) {
      this.stats.drawPlanMs = performance.now() - start;
      return;
    }
    const buckets = new Map(),
      histogram = Array(this.plan.maxLevel + 1).fill(0);
    let finest = Infinity,
      seams = 0;
    for (const record of this.records) {
      if (!record.visible) continue;
      const { n, mask, divs } = record,
        key = `${divs}:${mask}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(record);
      histogram[n.level]++;
      if (mask) seams++;
      finest = Math.min(finest, n.size / divs);
    }
    const data = new ArrayBuffer(this.capacity * 32),
      f = new Float32Array(data),
      u = new Uint32Array(data);
    const encoder = this.device.createRenderBundleEncoder({
      colorFormats: [this.format],
      depthStencilFormat: "depth24plus",
    });
    encoder.setPipeline(wireframe ? this.linePipeline : this.pipeline);
    encoder.setBindGroup(0, this.renderGroup);
    let at = 0,
      triangles = 0;
    for (const items of buckets.values()) {
      const template = this.template(items[0].divs, items[0].mask, wireframe),
        base = at;
      for (const { n, slot, divs } of items) {
        f.set([n.ox, n.oz, n.size, n.level], at * 8);
        u.set([slot, divs], at * 8 + 4);
        at++;
      }
      encoder.setIndexBuffer(template.buffer, "uint32");
      encoder.drawIndexed(template.count, items.length, 0, 0, base);
      triangles += template.triangles * items.length;
    }
    if (at)
      this.device.queue.writeBuffer(this.instanceBuffer, 0, data, 0, at * 32);
    this.bundle = encoder.finish();
    this.wireframe = wireframe;
    Object.assign(this.stats, {
      drawn: at,
      triangles,
      drawCalls: buckets.size,
      finest,
      seams,
      histogram,
    });
    this.stats.bundleBuilds++;
    this.stats.drawPlanMs = performance.now() - start;
  }
  render(
    camera,
    planes = [],
    now = performance.now(),
    { lodColors = false, tileBorders = true, wireframe = false } = {},
  ) {
    if (this.disposed) throw new Error("Renderer has been disposed");
    const start = performance.now();
    this.stats.selectionMs = 0;
    this.stats.cutMs = 0;
    this.resize();
    const view = [...camera.position, camera.fov, camera.far, camera.height];
    const moved =
      !this.lastView ||
      Math.hypot(...camera.position.map((v, i) => v - this.lastView[i])) >
        this.sampleMove ||
      view.slice(3).some((v, i) => Math.abs(v - this.lastView[i + 3]) > 1e-5);
    if (this.dirty || (moved && now - this.lastSelect >= 120))
      this.select(camera, planes, now);
    const encoder = this.device.createCommandEncoder();
    const timed =
      this.timer &&
      !this.timer.busy &&
      (!this.lastTimer || now - this.lastTimer > 350);
    if (timed) {
      this.timer.busy = true;
      this.lastTimer = now;
    }
    const built = this.build(encoder, now, timed);
    if (this.cutDirty) this.prepareCut(camera);
    this.prepare(camera, planes, wireframe);
    const f = new Float32Array(this.frameData),
      u = new Uint32Array(this.frameData);
    f.set(camera.viewProjection);
    f.set([...camera.position, 1], 16);
    f.set([camera.far, Number(lodColors), Number(tileBorders), 0], 20);
    u.set([this.options.divs, this.columns, 0, 0], 24);
    this.device.queue.writeBuffer(this.frameParams, 0, this.frameData);
    const descriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.54, g: 0.66, b: 0.75, a: 1 },
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
    };
    if (timed)
      descriptor.timestampWrites = {
        querySet: this.timer.query,
        beginningOfPassWriteIndex: 2,
        endOfPassWriteIndex: 3,
      };
    const pass = encoder.beginRenderPass(descriptor);
    pass.executeBundles([this.bundle]);
    pass.end();
    if (timed) {
      encoder.resolveQuerySet(
        this.timer.query,
        built ? 0 : 2,
        built ? 4 : 2,
        this.timer.resolve,
        0,
      );
      encoder.copyBufferToBuffer(
        this.timer.resolve,
        0,
        this.timer.read,
        0,
        built ? 32 : 16,
      );
    }
    this.device.queue.submit([encoder.finish()]);
    if (timed)
      this.timer.read
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const stamps = new BigUint64Array(this.timer.read.getMappedRange());
          this.stats.gpuMs =
            Number(stamps[built ? 3 : 1] - stamps[built ? 2 : 0]) / 1e6;
          this.stats.generationGpuMs = built
            ? Number(stamps[1] - stamps[0]) / 1e6
            : 0;
          this.timer.read.unmap();
          this.timer.busy = false;
        })
        .catch((e) => {
          if (!this.disposed) this.errors.push(e.message);
        });
    Object.assign(this.stats, {
      resident: this.entries.size,
      capacity: this.capacity,
      limited: this.plan.limited,
      cpuMs: performance.now() - start,
    });
    return this.stats;
  }
  async readTile(id) {
    const e = this.entries.get(id);
    if (!e) throw new Error("Tile is not resident");
    const row = this.options.divs + 1,
      pitch = Math.ceil((row * 16) / 256) * 256;
    const buffer = this.device.createBuffer({
      size: pitch * row,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      {
        texture: this.texture,
        origin: [
          (e.slot % this.columns) * row,
          Math.floor(e.slot / this.columns) * row,
        ],
      },
      { buffer, bytesPerRow: pitch },
      [row, row],
    );
    this.device.queue.submit([encoder.finish()]);
    await buffer.mapAsync(GPUMapMode.READ);
    const source = new Float32Array(buffer.getMappedRange()),
      data = new Float32Array(row * row * 4);
    for (let z = 0; z < row; z++)
      data.set(
        source.subarray((z * pitch) / 4, (z * pitch) / 4 + row * 4),
        z * row * 4,
      );
    buffer.unmap();
    buffer.destroy();
    return { node: e, data, divs: this.options.divs };
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.depth?.destroy();
    this.texture?.destroy();
    this.buildParams?.destroy();
    this.frameParams?.destroy();
    this.instanceBuffer?.destroy();
    for (const t of this.templates.values()) t.buffer.destroy();
    this.timer?.query.destroy();
    this.timer?.resolve.destroy();
    this.timer?.read.destroy();
    disposeGPUContext(this);
  }
}
