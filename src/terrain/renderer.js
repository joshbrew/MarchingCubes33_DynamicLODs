import { initializeGPU, disposeGPUContext, renderSize } from "../api/gpu.js";
import * as Field from "./field.js";
import * as LOD from "./lod.js";
import * as Surface from "./surface.js";
import * as PLOC from "./ploc.js";
import { boundaryMask, selectHorizon } from "./horizon.js";
import { Trees } from "./trees.js";
import { guardPlanes, turnedSince } from "../api/visibility.js";
import renderShader from "./shaders/render.wgsl";
const shader = Field.wgsl + renderShader;

class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      worldSize: 8192,
      tileSize: 128,
      maxDivs: 64,
      memoryMB: 64,
      buildsPerFrame: 8,
      ...options,
    };
    if (
      !Number.isInteger(this.options.maxDivs) ||
      this.options.maxDivs < 4 ||
      this.options.maxDivs > 128 ||
      this.options.maxDivs & (this.options.maxDivs - 1)
    )
      throw new Error("Terrain maxDivs must be a power of two from 4 to 128");
    const { worldSize, tileSize, memoryMB, buildsPerFrame } = this.options;
    const power = (n) =>
      Number.isFinite(n) && n >= 1 && Number.isInteger(Math.log2(n));
    if (
      !power(worldSize) ||
      !power(tileSize) ||
      tileSize > worldSize ||
      worldSize / tileSize > 512 ||
      !Number.isFinite(memoryMB) ||
      memoryMB <= 0 ||
      !Number.isInteger(buildsPerFrame) ||
      buildsPerFrame < 1 ||
      buildsPerFrame > 32
    )
      throw new RangeError(
        "Use power-of-two world/tile sizes (up to 512 tiles per side), positive memoryMB and 1–32 builds per frame.",
      );
    const map = LOD.makeTiles(this.options.worldSize, this.options.tileSize);
    this.tiles = map.tiles;
    this.side = map.side;
    this.levels = Math.log2(this.options.maxDivs); // 64,32,16,8,4,2
    const start = performance.now();
    this.tree = PLOC.build(this.tiles);
    this.treeBuildMs = performance.now() - start;
    this.settings = {
      maxDivs: this.options.maxDivs,
      levels: this.levels,
      pixelError: 2.5,
      nearRadius: 110,
      uniform: false,
      infinite: false,
    };
    this.origin = [0, 0];
    this.entries = new Map();
    this.free = [];
    this.templates = new Map();
    this.previous = new Map();
    this.selected = new Map();
    this.detailSelected = new Map();
    this.visibleIds = [];
    this.horizonTiles = [];
    this.horizonPlan = [];
    this.needsSelection = true;
    this.lastSelect = -Infinity;
    this.generation = 0;
    this.seed = 7;
    this.algorithm = "mc33";
    this.stats = {
      generated: 0,
      samples: 0,
      cacheHits: 0,
      evicted: 0,
      windowShifts: 0,
      gpuMs: null,
      treeBuildMs: this.treeBuildMs,
    };
    this.errors = [];
    this.disposed = false;
    this.drawPlan = null;
    this.planAlgorithm = null;
    this.viewState = [];
    this.frameData = new Float32Array(32);
    this.frameWords = new Uint32Array(this.frameData.buffer);
  }
  async initialize() {
    const device = await initializeGPU(this);
    this.stride = (this.options.maxDivs + 1) ** 2;
    const bytesPerSlot = this.stride * 32;
    const atlasLimit = Math.min(
      device.limits.maxStorageBufferBindingSize,
      device.limits.maxBufferSize,
      this.options.memoryMB * 1024 ** 2,
    );
    this.coverageBytes = this.tiles.length * 9 * 32;
    this.capacity = Math.min(
      1024,
      Math.floor((atlasLimit - this.coverageBytes) / bytesPerSlot),
    );
    if (this.capacity < 16)
      throw new Error(
        "GPU memory budget is too small for map coverage and 16 detail patches",
      );
    this.coverageBase = this.capacity * this.stride;
    this.coverageGeneration = -1;
    this.coverageOrigin = [];
    this.coverageEntries = this.tiles.map((tile) => ({
      id: tile.id,
      base: this.coverageBase + tile.id * 9,
      lod: this.levels - 1,
      ready: true,
    }));
    this.atlas = device.createBuffer({
      label: "Resident terrain samples",
      size: this.capacity * bytesPerSlot + this.coverageBytes,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
    });
    this.free = Array.from(
      { length: this.capacity },
      (_, i) => this.capacity - i - 1,
    );
    this.buildBudget = this.options.buildsPerFrame;
    this.buildParams = device.createBuffer({
      size: (this.buildBudget + 1) * 256,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.frameParams = device.createBuffer({
      size: 128,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.instanceBuffer = device.createBuffer({
      size: this.tiles.length * 16,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const module = device.createShaderModule({
      label: "Terrain field, generation and render",
      code: shader,
    });
    const compilation = await module.getCompilationInfo(),
      errors = compilation.messages.filter((m) => m.type === "error");
    if (errors.length)
      throw new Error(
        errors.map((m) => `${m.lineNum}: ${m.message}`).join("\n"),
      );
    const buildLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.COMPUTE,
          buffer: { type: "storage" },
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
    this.compute = await device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [buildLayout] }),
      compute: { module, entryPoint: "generate" },
    });
    this.coverageCompute = await device.createComputePipelineAsync({
      layout: device.createPipelineLayout({ bindGroupLayouts: [buildLayout] }),
      compute: { module, entryPoint: "generate_coverage" },
    });
    this.buildGroup = device.createBindGroup({
      layout: buildLayout,
      entries: [
        { binding: 0, resource: { buffer: this.atlas } },
        { binding: 1, resource: { buffer: this.buildParams, size: 32 } },
      ],
    });
    const renderLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
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
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [renderLayout],
    });
    const descriptor = {
      layout: pipelineLayout,
      vertex: { module, entryPoint: "vertex_main" },
      fragment: {
        module,
        entryPoint: "fragment_main",
        targets: [{ format: this.format }],
      },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    };
    this.renderPipeline = await device.createRenderPipelineAsync({
      ...descriptor,
      primitive: { topology: "triangle-list", cullMode: "back" },
    });
    this.linePipeline = await device.createRenderPipelineAsync({
      ...descriptor,
      primitive: { topology: "line-list" },
    });
    const horizonDescriptor = {
      ...descriptor,
      vertex: { module, entryPoint: "vertex_horizon" },
    };
    [this.horizonPipeline, this.horizonLines] = await Promise.all([
      device.createRenderPipelineAsync({
        ...horizonDescriptor,
        primitive: { topology: "triangle-list", cullMode: "back" },
      }),
      device.createRenderPipelineAsync({
        ...horizonDescriptor,
        primitive: { topology: "line-list" },
      }),
    ]);
    this.renderLayout = renderLayout;
    this.renderGroup = device.createBindGroup({
      layout: renderLayout,
      entries: [
        { binding: 0, resource: { buffer: this.atlas } },
        { binding: 1, resource: { buffer: this.instanceBuffer } },
        { binding: 2, resource: { buffer: this.frameParams } },
      ],
    });
    this.stats.atlasBytes = this.capacity * bytesPerSlot + this.coverageBytes;
    this.stats.coverageBytes = this.coverageBytes;
    this.stats.coverageTiles = this.tiles.length;
    // Timing is asynchronous and sampled, never a render-loop queue wait.
    this.timers = [];
    if (device.features.has("timestamp-query"))
      for (let i = 0; i < 3; i++)
        this.timers.push({
          busy: false,
          queries: device.createQuerySet({ type: "timestamp", count: 4 }),
          resolve: device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
          }),
          read: device.createBuffer({
            size: 32,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          }),
        });
    this.frameIndex = 0;
    this.resize();
    this.vegetation = await new Trees(this).initialize();
    return this;
  }
  resize() {
    const { width: w, height: h } = renderSize(this.canvas, this.options);
    if (this.canvas.width === w && this.canvas.height === h && this.depth)
      return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.depth?.destroy();
    this.depth = this.device.createTexture({
      size: [w, h],
      format: "depth24plus",
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.needsSelection = true;
  }
  configure(values) {
    Object.assign(this.settings, values);
    this.previous.clear();
    this.needsSelection = true;
  }
  updateWindow(camera) {
    const next = this.settings.infinite
      ? LOD.windowOffset(
          camera.position,
          this.options.worldSize,
          this.options.tileSize,
        )
      : [0, 0];
    const dx = next[0] - this.origin[0],
      dz = next[1] - this.origin[1];
    if (!dx && !dz) return;
    const shiftX = dx / this.options.tileSize,
      shiftZ = dz / this.options.tileSize;
    LOD.moveTiles(this.tiles, dx, dz);
    this.entries = LOD.shiftTileMap(
      this.entries,
      this.side,
      shiftX,
      shiftZ,
      (entry) => {
        this.free.push(entry.slot);
        this.stats.evicted++;
      },
    );
    for (const [id, entry] of this.entries) entry.id = id;
    this.previous = LOD.shiftTileMap(this.previous, this.side, shiftX, shiftZ);
    this.selected.clear();
    this.visibleIds = [];
    this.lastActual = new Map();
    this.origin = next;
    this.needsSelection = true;
    this.stats.windowShifts++;
  }
  select(camera, planes, now) {
    const start = performance.now();
    const cull = PLOC.query(
      this.tree,
      LOD.relativePlanes(
        guardPlanes(planes, Math.min(camera.far, this.options.tileSize * 8)),
        this.origin,
      ),
    );
    cull.ids = cull.ids.filter(
      (id) => LOD.distanceTo(this.tiles[id], camera.position) <= camera.far,
    );
    // Reserve nearby detail in every direction, within the same atlas budget.
    // A turn can then reveal ready samples instead of starting from empty slots.
    const keep = new Set(cull.ids);
    const px = Math.floor(
        (camera.player[0] - this.origin[0] + this.options.worldSize / 2) /
          this.options.tileSize,
      ),
      pz = Math.floor(
        (camera.player[2] - this.origin[1] + this.options.worldSize / 2) /
          this.options.tileSize,
      );
    const radius = Math.min(
        camera.far,
        this.options.tileSize * Math.sqrt((this.capacity * 0.35) / Math.PI),
      ),
      reach = Math.ceil(radius / this.options.tileSize);
    this.prefetchIds = new Set();
    for (let z = pz - reach; z <= pz + reach; z++)
      for (let x = px - reach; x <= px + reach; x++)
        if (
          x >= 0 &&
          z >= 0 &&
          x < this.side &&
          z < this.side &&
          LOD.distanceTo(this.tiles[z * this.side + x], camera.player) <= radius
        ) {
          keep.add(z * this.side + x);
          this.prefetchIds.add(z * this.side + x);
        }
    const ids = Array.from(keep);
    const selection = LOD.select(
      this.tiles,
      ids,
      this.side,
      camera,
      this.settings,
      this.previous,
    );
    const detailIds = ids.filter(
      (id) => selection.levels.get(id) < this.levels - 1,
    );
    this.stats.capacityLimited = detailIds.length > this.capacity;
    if (detailIds.length > this.capacity)
      detailIds.sort(
        (a, b) =>
          LOD.distanceTo(this.tiles[a], camera.position) -
          LOD.distanceTo(this.tiles[b], camera.position),
      );
    this.detailSelected = new Map(
      detailIds
        .slice(0, this.capacity)
        .map((id) => [id, selection.levels.get(id)]),
    );
    this.visibleIds = cull.ids;
    this.horizonTiles = this.settings.infinite
      ? selectHorizon(
          this.options.worldSize,
          this.options.tileSize,
          this.origin,
          camera,
          guardPlanes(planes, camera.far),
        )
      : [];
    this.selected = selection.levels;
    this.previous = new Map(selection.levels);
    this.stats.selectionMs = performance.now() - start;
    this.stats.visited = cull.visited;
    this.stats.visible = cull.ids.length;
    this.stats.requested = ids.length;
    this.stats.prefetchRadius = radius;
    this.stats.prefetched = selection.levels.size - this.visibleIds.length;
    this.lastSelect = now;
    this.selectionPlanes = planes.map((p) => p.slice());
    this.needsSelection = false;
    this.drawDirty = true;
  }
  getTemplate(divs, mask) {
    const key = `${this.algorithm}:${divs}:${mask}`;
    if (this.templates.has(key)) return this.templates.get(key);
    const indices = Surface.buildIndices(divs, mask, this.algorithm),
      lines = Surface.lines(indices),
      device = this.device;
    function upload(data, label) {
      const b = device.createBuffer({
        size: data.byteLength,
        usage: GPUBufferUsage.INDEX,
        mappedAtCreation: true,
        label,
      });
      new Uint32Array(b.getMappedRange()).set(data);
      b.unmap();
      return b;
    }
    const template = {
      triangles: indices.length / 3,
      indexCount: indices.length,
      lineCount: lines.length,
      index: upload(indices, "Terrain topology"),
      line: upload(lines, "Terrain wire topology"),
    };
    this.templates.set(key, template);
    return template;
  }
  allocate(id, keep, now) {
    if (!this.free.length) {
      let victim = null;
      for (const e of this.entries.values())
        if (!keep.has(e.id) && (!victim || e.touched < victim.touched))
          victim = e;
      if (!victim) return null;
      this.entries.delete(victim.id);
      this.free.push(victim.slot);
      this.stats.evicted++;
    }
    const entry = {
      id,
      slot: this.free.pop(),
      lod: this.levels - 1,
      touched: now,
      ready: false,
      generation: this.generation,
    };
    entry.base = entry.slot * this.stride;
    this.entries.set(id, entry);
    return entry;
  }
  planBuilds(camera, now) {
    if (
      this.stats.pending === 0 &&
      !this.drawDirty &&
      this.drawPlan &&
      this.planGeneration === this.generation
    )
      return [];
    const keep = new Set(this.detailSelected.keys()),
      missing = [],
      updates = [];
    for (const [id, lod] of this.detailSelected) {
      const e = this.entries.get(id),
        distance = LOD.distanceTo(this.tiles[id], camera.position);
      if (e) e.touched = now;
      if (!e || !e.ready || e.generation !== this.generation)
        missing.push({ id, lod, distance });
      else if (e.lod > lod) updates.push({ id, lod, distance, refine: true });
      else this.stats.cacheHits++;
    }
    missing.sort((a, b) => a.distance - b.distance);
    // The coverage layer is already resident; spend this bounded batch on detail.
    updates.sort(
      (a, b) => Number(b.refine) - Number(a.refine) || a.distance - b.distance,
    );
    const visible = new Set(this.visibleIds),
      planned = [],
      requests = [missing, updates].flatMap((items) =>
        items
          .filter((r) => visible.has(r.id))
          .concat(items.filter((r) => !visible.has(r.id))),
      );
    for (const request of requests) {
      if (planned.length >= this.buildBudget) break;
      const entry =
        this.entries.get(request.id) || this.allocate(request.id, keep, now);
      if (!entry) continue;
      planned.push({ entry, lod: request.lod });
    }
    this.stats.pending = missing.length + updates.length - planned.length;
    return planned;
  }
  viewChanged(camera, planes) {
    let at = 0,
      changed = false;
    const compare = (value) => {
      if (this.viewState[at] !== value) changed = true;
      this.viewState[at++] = value;
    };
    camera.position.forEach(compare);
    camera.player.forEach(compare);
    [camera.height, camera.fov, camera.far].forEach(compare);
    for (const p of planes) p.forEach(compare);
    return changed;
  }
  prepareDrawPlan() {
    const actual = new Map(),
      drawEntries = new Map();
    for (const [id, target] of this.selected) {
      const cached = this.entries.get(id),
        entry =
          cached?.ready && cached.generation === this.generation
            ? cached
            : this.coverageEntries[id];
      // Taper the outside row of the detail window into the first horizon
      // band. Four divisions can stitch to its two; two already match.
      const edge =
        this.horizonTiles.length && boundaryMask(id, this.side)
          ? this.levels - 2
          : 0;
      actual.set(id, Math.max(target, entry.lod, edge));
      drawEntries.set(id, entry);
    }
    LOD.balance(actual, this.side, "coarsen");
    const masks = LOD.seams(actual, this.side),
      buckets = new Map();
    if (this.horizonTiles.length)
      for (const [id, level] of actual)
        if (level === this.levels - 2)
          masks.set(id, masks.get(id) | boundaryMask(id, this.side));
    this.lastActual = actual;
    this.lastMasks = masks;
    this.drawEntries = drawEntries;
    this.drawDirty = false;
    const state = new Uint32Array(this.visibleIds.length * 4);
    for (let i = 0; i < this.visibleIds.length; i++) {
      const id = this.visibleIds[i],
        entry = drawEntries.get(id),
        at = i * 4;
      state[at] = id;
      state[at + 1] = entry.base;
      state[at + 2] = entry.lod;
      state[at + 3] = (actual.get(id) << 4) | masks.get(id);
    }
    if (
      this.drawPlan &&
      this.drawState?.length === state.length &&
      state.every((value, i) => this.drawState[i] === value) &&
      this.planAlgorithm === this.algorithm &&
      this.planGeneration === this.generation
    ) {
      this.stats.planReuses = (this.stats.planReuses || 0) + 1;
      return;
    }
    this.drawState = state;
    const histogram = new Array(this.levels).fill(0);
    let triangles = 0,
      coarseDrawn = 0,
      samples = 0,
      seamCount = 0;
    for (const id of this.visibleIds) {
      const level = actual.get(id);
      if (level === undefined) continue;
      const entry = drawEntries.get(id),
        divs = this.options.maxDivs >> level,
        mask = masks.get(id),
        key = `${divs}:${mask}`;
      if (entry.base >= this.coverageBase) coarseDrawn++;
      if (!buckets.has(key)) buckets.set(key, { divs, mask, entries: [] });
      buckets.get(key).entries.push({ entry, level });
      histogram[level]++;
      samples += (divs + 1) ** 2;
      if (mask) seamCount++;
    }
    const records = new Uint32Array(this.visibleIds.length * 4),
      draws = [];
    let instance = 0;
    for (const bucket of buckets.values()) {
      const template = this.getTemplate(bucket.divs, bucket.mask),
        base = instance;
      for (const { entry, level } of bucket.entries) {
        records.set(
          [entry.base, this.options.maxDivs >> entry.lod, bucket.divs, level],
          instance * 4,
        );
        instance++;
      }
      draws.push({ template, base, count: bucket.entries.length });
      triangles += template.triangles * bucket.entries.length;
    }
    if (instance)
      this.device.queue.writeBuffer(
        this.instanceBuffer,
        0,
        records,
        0,
        instance * 4,
      );
    Object.assign(this.stats, {
      nearTriangles: triangles,
      coarseDrawn,
      nearDrawCalls: draws.length,
      nearDrawn: instance,
      histogram,
      seams: seamCount,
      activeSamples: samples,
      uniformSamples: instance * (this.options.maxDivs + 1) ** 2,
    });
    this.drawPlan = draws;
    this.planAlgorithm = this.algorithm;
    this.planGeneration = this.generation;
    this.stats.planBuilds = (this.stats.planBuilds || 0) + 1;
  }
  prepareHorizon() {
    const tiles = this.horizonTiles,
      previous = this.horizonPlannedTiles;
    if (tiles === previous && this.horizonAlgorithm === this.algorithm) return;
    this.horizonPlannedTiles = tiles;
    if (
      this.horizonAlgorithm === this.algorithm &&
      previous?.length === tiles.length &&
      tiles.every((tile, i) => {
        const old = previous[i];
        return (
          tile.x === old.x &&
          tile.z === old.z &&
          tile.size === old.size &&
          tile.mask === old.mask &&
          tile.grade === old.grade
        );
      })
    )
      return;
    this.horizonAlgorithm = this.algorithm;
    this.horizonPlan = [];
    this.stats.horizonDrawn = tiles.length;
    this.stats.horizonTriangles = 0;
    this.stats.horizonGrades = [];
    if (!tiles.length) return;
    if (!this.horizonBuffer || tiles.length * 16 > this.horizonBuffer.size) {
      const size = 16 * 2 ** Math.ceil(Math.log2(tiles.length));
      this.horizonBuffer?.destroy();
      this.horizonBuffer = this.device.createBuffer({
        label: "Terrain horizon patch instances",
        size,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      });
      this.horizonGroup = this.device.createBindGroup({
        layout: this.renderLayout,
        entries: [
          { binding: 0, resource: { buffer: this.atlas } },
          { binding: 1, resource: { buffer: this.horizonBuffer } },
          { binding: 2, resource: { buffer: this.frameParams } },
        ],
      });
      this.stats.horizonBytes = size;
    }
    const buckets = new Map();
    for (const tile of tiles) {
      if (!buckets.has(tile.mask)) buckets.set(tile.mask, []);
      buckets.get(tile.mask).push(tile);
      this.stats.horizonGrades[tile.grade] =
        (this.stats.horizonGrades[tile.grade] || 0) + 1;
    }
    const data = new ArrayBuffer(tiles.length * 16);
    const f32 = new Float32Array(data),
      u32 = new Uint32Array(data);
    let at = 0;
    for (const [mask, bucket] of buckets) {
      const template = this.getTemplate(2, mask),
        base = at / 4;
      for (const { x, z, size, grade } of bucket) {
        f32[at] = x;
        f32[at + 1] = z;
        f32[at + 2] = size;
        u32[at + 3] = grade;
        at += 4;
      }
      this.horizonPlan.push({ template, base, count: bucket.length });
      this.stats.horizonTriangles += template.triangles * bucket.length;
    }
    this.device.queue.writeBuffer(this.horizonBuffer, 0, data);
  }
  render(camera, planes, now, { lodColors = false, wireframe = false } = {}) {
    const cpuStart = performance.now();
    this.resize();
    this.updateWindow(camera);
    if (
      this.needsSelection ||
      turnedSince(planes, this.selectionPlanes) ||
      (now - this.lastSelect >= 100 && this.viewChanged(camera, planes))
    ) {
      this.select(camera, planes, now);
      this.viewChanged(camera, planes);
    }
    const builds = this.planBuilds(camera, now),
      device = this.device,
      encoder = device.createCommandEncoder({
        label: "Adaptive terrain frame",
      });
    const timer =
      this.frameIndex++ % 20 === 0 ? this.timers.find((t) => !t.busy) : null;
    if (timer) timer.busy = true;
    const coverageChanged =
      this.coverageGeneration !== this.generation ||
      this.coverageSeed !== this.seed ||
      this.origin.some((v, i) => v !== this.coverageOrigin[i]);
    if (builds.length || coverageChanged) {
      const uniforms = new ArrayBuffer((this.buildBudget + 1) * 256),
        f32 = new Float32Array(uniforms),
        u32 = new Uint32Array(uniforms);
      builds.forEach(({ entry, lod }, i) => {
        const tile = this.tiles[entry.id],
          o = i * 64,
          divs = this.options.maxDivs >> lod;
        f32[o] = tile.ox;
        f32[o + 1] = tile.oz;
        f32[o + 2] = tile.size;
        u32[o + 3] = divs;
        u32[o + 4] = entry.base;
        u32[o + 5] = this.stride;
        u32[o + 6] = this.seed;
        entry.lod = lod;
        entry.ready = true;
        entry.generation = this.generation;
        this.stats.generated++;
        this.stats.samples += (divs + 1) ** 2;
      });
      if (coverageChanged) {
        const o = this.buildBudget * 64;
        f32[o] = this.origin[0] - this.options.worldSize / 2;
        f32[o + 1] = this.origin[1] - this.options.worldSize / 2;
        f32[o + 2] = this.options.tileSize;
        u32[o + 4] = this.coverageBase;
        u32[o + 6] = this.seed;
        u32[o + 7] = this.side;
        this.coverageOrigin = this.origin.slice();
        this.coverageSeed = this.seed;
        this.coverageGeneration = this.generation;
        this.stats.coverageBuilds = (this.stats.coverageBuilds || 0) + 1;
      }
      device.queue.writeBuffer(this.buildParams, 0, uniforms);
      const pass = encoder.beginComputePass(
        timer
          ? {
              timestampWrites: {
                querySet: timer.queries,
                beginningOfPassWriteIndex: 0,
                endOfPassWriteIndex: 1,
              },
            }
          : {},
      );
      pass.setPipeline(this.compute);
      builds.forEach(({ entry }, i) => {
        const divs = this.options.maxDivs >> entry.lod;
        pass.setBindGroup(0, this.buildGroup, [i * 256]);
        pass.dispatchWorkgroups(
          Math.ceil((divs + 1) / 8),
          Math.ceil((divs + 1) / 8),
        );
      });
      if (coverageChanged) {
        pass.setPipeline(this.coverageCompute);
        pass.setBindGroup(0, this.buildGroup, [this.buildBudget * 256]);
        pass.dispatchWorkgroups(
          Math.ceil((this.side * 3) / 8),
          Math.ceil((this.side * 3) / 8),
        );
      }
      pass.end();
    }
    if (
      !this.drawPlan ||
      this.drawDirty ||
      builds.length ||
      this.planAlgorithm !== this.algorithm
    )
      this.prepareDrawPlan();
    this.prepareHorizon();
    this.vegetation?.prepare(camera, planes, now);
    if (
      this.bundlePlan !== this.drawPlan ||
      this.bundleHorizon !== this.horizonPlan ||
      this.bundleTrees !== this.vegetation?.draws ||
      this.bundleWire !== wireframe
    ) {
      const bundle = device.createRenderBundleEncoder({
        colorFormats: [this.format],
        depthStencilFormat: "depth24plus",
      });
      bundle.setPipeline(wireframe ? this.linePipeline : this.renderPipeline);
      bundle.setBindGroup(0, this.renderGroup);
      for (const draw of this.drawPlan) {
        bundle.setIndexBuffer(
          wireframe ? draw.template.line : draw.template.index,
          "uint32",
        );
        bundle.drawIndexed(
          wireframe ? draw.template.lineCount : draw.template.indexCount,
          draw.count,
          0,
          0,
          draw.base,
        );
      }
      if (this.horizonPlan.length) {
        bundle.setPipeline(
          wireframe ? this.horizonLines : this.horizonPipeline,
        );
        bundle.setBindGroup(0, this.horizonGroup);
        for (const draw of this.horizonPlan) {
          bundle.setIndexBuffer(
            wireframe ? draw.template.line : draw.template.index,
            "uint32",
          );
          bundle.drawIndexed(
            wireframe ? draw.template.lineCount : draw.template.indexCount,
            draw.count,
            0,
            0,
            draw.base,
          );
        }
      }
      this.vegetation?.render(bundle);
      this.renderBundle = bundle.finish();
      this.bundlePlan = this.drawPlan;
      this.bundleHorizon = this.horizonPlan;
      this.bundleTrees = this.vegetation?.draws;
      this.bundleWire = wireframe;
      this.stats.bundleBuilds = (this.stats.bundleBuilds || 0) + 1;
    }
    const frame = this.frameData;
    frame.set(camera.viewProjection, 0);
    frame.set([...camera.position, 1], 16);
    frame.set([0.5, 0.85, 0.35, 0], 20);
    frame.set([0, Number(lodColors), Number(wireframe), camera.far], 28);
    this.frameWords[28] = this.seed;
    device.queue.writeBuffer(this.frameParams, 0, frame);
    const descriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: 0.71, g: 0.78, b: 0.82, a: 1 },
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
    if (timer)
      descriptor.timestampWrites = {
        querySet: timer.queries,
        beginningOfPassWriteIndex: 2,
        endOfPassWriteIndex: 3,
      };
    const pass = encoder.beginRenderPass(descriptor);
    pass.executeBundles([this.renderBundle]);
    pass.end();
    if (timer) {
      // Queries 0/1 are unwritten in frames without generation; resolve only 2/3.
      const generated = builds.length || coverageChanged;
      const first = generated ? 0 : 2,
        count = generated ? 4 : 2;
      encoder.resolveQuerySet(timer.queries, first, count, timer.resolve, 0);
      encoder.copyBufferToBuffer(timer.resolve, 0, timer.read, 0, count * 8);
    }
    device.queue.submit([encoder.finish()]);
    if (timer)
      timer.read
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const stamps = new BigUint64Array(timer.read.getMappedRange());
          const generate =
              builds.length || coverageChanged
                ? Number(stamps[1] - stamps[0]) / 1e6
                : 0,
            render =
              builds.length || coverageChanged
                ? Number(stamps[3] - stamps[2]) / 1e6
                : Number(stamps[1] - stamps[0]) / 1e6;
          this.stats.gpuMs = render;
          this.stats.generationGpuMs = generate;
          timer.read.unmap();
          timer.busy = false;
        })
        .catch((error) => {
          timer.busy = false;
          if (!this.disposed) this.errors.push(error.message);
        });
    this.stats.cpuMs = performance.now() - cpuStart;
    this.stats.drawn = this.stats.nearDrawn + this.stats.horizonDrawn;
    this.stats.triangles =
      this.stats.nearTriangles + this.stats.horizonTriangles;
    this.stats.drawCalls = this.stats.nearDrawCalls + this.horizonPlan.length;
    this.stats.resident = this.entries.size;
    this.stats.builtThisFrame = builds.length;
    this.stats.vegetation = this.vegetation?.stats;
    return this.stats;
  }
  // Explicit diagnostics for tests; production rendering never calls this.
  async readPatch(id) {
    const cached = this.entries.get(id);
    const entry =
      cached?.ready && cached.generation === this.generation
        ? cached
        : this.drawEntries?.get(id);
    if (!entry?.ready) throw new Error("Patch is not ready");
    const divs = this.options.maxDivs >> entry.lod,
      count = (divs + 1) ** 2;
    const read = this.device.createBuffer({
      size: count * 32,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    try {
      const e = this.device.createCommandEncoder();
      e.copyBufferToBuffer(this.atlas, entry.base * 32, read, 0, count * 32);
      this.device.queue.submit([e.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const data = new Float32Array(read.getMappedRange()).slice();
      read.unmap();
      return { data, divs };
    } finally {
      read.destroy();
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.vegetation?.dispose();
    for (const t of this.templates.values()) {
      t.index.destroy();
      t.line.destroy();
    }
    for (const t of this.timers || []) {
      t.queries.destroy();
      t.resolve.destroy();
      t.read.destroy();
    }
    for (const b of [
      this.atlas,
      this.buildParams,
      this.frameParams,
      this.instanceBuffer,
      this.horizonBuffer,
    ])
      b?.destroy();
    this.depth?.destroy();
    disposeGPUContext(this);
  }
}

export { Renderer, shader };
export default Renderer;
