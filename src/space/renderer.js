import * as World from "./world.js";
import workerURL from "./space.worker.js";
import renderShader from "./shaders/render.wgsl";
const shader = renderShader;

class Renderer {
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.options = {
      maxInstances: 12000,
      maxChunks: 2048,
      geometryMB: 64,
      pointBudget: 600000,
      ...options,
    };
    this.settings = {
      mode: "mesh",
      quality: 3,
      uniform: false,
      algorithm: "mc33",
      pointSize: 2,
      lodDistance: 4000,
      nearRadius: 250,
      caves: false,
    };
    this.chunks = new Map();
    this.cache = new Map();
    this.queue = new Map();
    this.inflight = new Set();
    this.failed = new Set();
    this.protected = new Set();
    this.previous = new Map();
    this.visible = [];
    this.lastSelect = -Infinity;
    this.dirty = true;
    this.disposed = false;
    this.bytes = 0;
    this.errors = [];
    this.stats = {
      generated: 0,
      streamed: 0,
      evicted: 0,
      gpuMs: null,
      workerMs: 0,
    };
    this.geometryRevision = 0;
    this.viewState = [];
    this.draws = null;
  }
  async initialize() {
    if (!navigator.gpu)
      throw new Error(
        "Space LOD needs WebGPU on localhost in a supported browser",
      );
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter");
    this.device = await adapter.requestDevice({
      requiredFeatures: adapter.features.has("timestamp-query")
        ? ["timestamp-query"]
        : [],
    });
    const d = this.device;
    d.addEventListener("uncapturederror", (event) => {
      this.errors.push(event.error.message);
      console.error(event.error);
    });
    d.lost.then((info) => {
      if (!this.disposed) this.errors.push(`GPU lost: ${info.message}`);
    });
    this.context = this.canvas.getContext("webgpu");
    this.format = navigator.gpu.getPreferredCanvasFormat();
    this.context.configure({
      device: d,
      format: this.format,
      alphaMode: "opaque",
    });
    this.frameBuffer = d.createBuffer({
      size: 176,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    this.instances = d.createBuffer({
      size: this.options.maxInstances * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const frameLayout = d.createBindGroupLayout({
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
      ],
    });
    this.geometryLayout = d.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.VERTEX,
          buffer: { type: "read-only-storage" },
        },
      ],
    });
    this.frameGroup = d.createBindGroup({
      layout: frameLayout,
      entries: [
        { binding: 0, resource: { buffer: this.frameBuffer } },
        { binding: 1, resource: { buffer: this.instances } },
      ],
    });
    const module = d.createShaderModule({
        code: shader,
        label: "Space meshes, point clouds and star sky",
      }),
      info = await module.getCompilationInfo();
    const errors = info.messages.filter((m) => m.type === "error");
    if (errors.length)
      throw new Error(
        errors.map((m) => `${m.lineNum}: ${m.message}`).join("\n"),
      );
    const layout = d.createPipelineLayout({
      bindGroupLayouts: [frameLayout, this.geometryLayout],
    });
    const pipeline = (vertex, fragment, primitive) =>
      d.createRenderPipelineAsync({
        layout,
        vertex: { module, entryPoint: vertex },
        fragment: {
          module,
          entryPoint: fragment,
          targets: [{ format: this.format }],
        },
        primitive,
        depthStencil: {
          format: "depth24plus",
          depthWriteEnabled: true,
          depthCompare: "less",
        },
      });
    this.mesh = await pipeline("mesh_vertex", "mesh_fragment", {
      topology: "triangle-list",
      cullMode: "back",
    });
    this.points = await pipeline("point_vertex", "point_fragment", {
      topology: "triangle-list",
    });
    this.sky = await d.createRenderPipelineAsync({
      layout: d.createPipelineLayout({ bindGroupLayouts: [frameLayout] }),
      vertex: { module, entryPoint: "sky_vertex" },
      fragment: {
        module,
        entryPoint: "sky_fragment",
        targets: [{ format: this.format }],
      },
      primitive: { topology: "triangle-list" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: false,
        depthCompare: "always",
      },
    });
    this.workers = Array.from({ length: 2 }, () => {
      const state = { worker: new Worker(workerURL), busy: false, key: null };
      state.worker.onmessage = (event) => this.receive(state, event.data);
      state.worker.onerror = (event) => {
        this.errors.push(event.message);
        if (state.key) {
          this.failed.add(state.key);
          this.inflight.delete(state.key);
        }
        state.busy = false;
      };
      return state;
    });
    this.timers = [];
    if (d.features.has("timestamp-query"))
      for (let i = 0; i < 3; i++)
        this.timers.push({
          busy: false,
          queries: d.createQuerySet({ type: "timestamp", count: 2 }),
          resolve: d.createBuffer({
            size: 16,
            usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
          }),
          read: d.createBuffer({
            size: 16,
            usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
          }),
        });
    this.instanceData = new Float32Array(this.options.maxInstances * 16);
    this.frameData = new Float32Array(44);
    this.frameIndex = 0;
    this.resize();
    return this;
  }
  configure(values) {
    Object.assign(this.settings, values);
    this.previous.clear();
    this.queue.clear();
    this.dirty = true;
  }
  resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5),
      width = Math.max(1, Math.round(this.canvas.clientWidth * ratio)),
      height = Math.max(1, Math.round(this.canvas.clientHeight * ratio));
    this.ratio = ratio;
    if (
      this.canvas.width === width &&
      this.canvas.height === height &&
      this.depth
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
  key(body, level) {
    return `${this.settings.algorithm}:${body.kind}:${body.variant}${body.kind === 2 ? (this.settings.caves ? "c" : "s") : ""}:${level}`;
  }
  request(body, level, priority) {
    const key = this.key(body, level);
    if (this.cache.has(key) || this.inflight.has(key) || this.failed.has(key))
      return;
    const previous = this.queue.get(key);
    if (!previous || priority > previous.priority)
      this.queue.set(key, {
        key,
        kind: body.kind,
        variant: body.variant,
        level,
        algorithm: this.settings.algorithm,
        caves: this.settings.caves,
        priority,
      });
  }
  dispatch() {
    for (const state of this.workers) {
      if (state.busy || !this.queue.size) continue;
      const request = Array.from(this.queue.values()).sort(
        (a, b) => b.priority - a.priority,
      )[0];
      this.queue.delete(request.key);
      this.inflight.add(request.key);
      state.busy = true;
      state.key = request.key;
      state.worker.postMessage(request);
    }
  }
  upload(key, vertices, count) {
    const limit = this.options.geometryMB * 1024 ** 2;
    while (this.bytes + vertices.byteLength > limit) {
      let victim = null;
      for (const [id, g] of this.cache)
        if (
          !this.protected.has(id) &&
          (!victim || g.touched < victim[1].touched)
        )
          victim = [id, g];
      if (!victim) return;
      victim[1].buffer.destroy();
      this.bytes -= victim[1].bytes;
      this.cache.delete(victim[0]);
    }
    const buffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.STORAGE,
      mappedAtCreation: true,
    });
    new Float32Array(buffer.getMappedRange()).set(vertices);
    buffer.unmap();
    const group = this.device.createBindGroup({
      layout: this.geometryLayout,
      entries: [{ binding: 0, resource: { buffer } }],
    });
    this.cache.set(key, {
      key,
      buffer,
      group,
      count,
      bytes: vertices.byteLength,
      touched: performance.now(),
    });
    this.bytes += vertices.byteLength;
    this.geometryRevision++;
  }
  receive(state, result) {
    if (this.disposed) return;
    state.busy = false;
    state.key = null;
    this.inflight.delete(result.key);
    if (result.error) {
      this.failed.add(result.key);
      this.errors.push(result.error);
    } else {
      this.upload(result.key, result.vertices, result.count);
      if (result.fallback)
        this.upload(
          result.key.slice(0, result.key.lastIndexOf(":")) + ":fallback-points",
          result.fallback.vertices,
          result.fallback.count,
        );
      this.stats.generated++;
      this.stats.workerMs = result.ms;
    }
    this.dispatch();
  }
  select(camera, planes, now) {
    const start = performance.now(),
      selection = World.sectors(
        camera.position,
        planes,
        camera.far,
        this.options.maxChunks,
      ),
      keep = new Set(selection.cells.map((c) => c.key)),
      visible = [];
    for (const sector of selection.cells) {
      let entry = this.chunks.get(sector.key);
      if (!entry) {
        entry = { bodies: World.chunk(...sector.cell), touched: now };
        this.chunks.set(sector.key, entry);
        this.stats.streamed++;
      }
      entry.touched = now;
      for (const body of entry.bodies) {
        const relative = body.position.map((v, i) => v - camera.position[i]),
          distance = Math.hypot(...relative);
        if (
          distance - body.radius > camera.far ||
          !World.visibleSphere(relative, body.radius, planes)
        )
          continue;
        visible.push({
          body,
          distance,
          lod: World.chooseLOD(
            body,
            camera.position,
            camera.pixelScale,
            this.settings,
            this.previous.get(body.id),
          ),
        });
      }
    }
    visible.sort((a, b) => a.distance - b.distance);
    this.visible = visible.slice(0, this.options.maxInstances);
    this.previous = new Map(this.visible.map((v) => [v.body.id, v.lod]));
    if (this.chunks.size > this.options.maxChunks * 2) {
      const victims = Array.from(this.chunks)
        .filter(([key]) => !keep.has(key))
        .sort((a, b) => a[1].touched - b[1].touched);
      for (const [key] of victims) {
        if (this.chunks.size <= this.options.maxChunks * 2) break;
        this.chunks.delete(key);
        this.stats.evicted++;
      }
    }
    this.stats.requestedBodies = visible.length;
    this.stats.sectors = selection.cells.length;
    this.stats.examined = selection.examined;
    this.stats.sectorLimited = selection.limited;
    this.stats.instanceLimited = visible.length > this.options.maxInstances;
    this.stats.selectionMs = performance.now() - start;
    this.lastSelect = now;
    this.dirty = false;
  }
  viewChanged(camera, planes) {
    let at = 0,
      changed = false;
    const compare = (v) => {
      if (this.viewState[at] !== v) changed = true;
      this.viewState[at++] = v;
    };
    camera.position.forEach(compare);
    compare(camera.far);
    compare(camera.pixelScale);
    for (const plane of planes) plane.forEach(compare);
    return changed;
  }
  prepareDraws(camera, now) {
    const start = performance.now();
    const groups = new Map();
    this.protected.clear();
    let requestedPoints = 0,
      points = 0,
      triangles = 0,
      meshes = 0,
      clouds = 0,
      waiting = 0,
      pointLimited = false;
    const histogram = new Array(
        World.meshLevels + World.pointTiers.length,
      ).fill(0),
      coarse = World.meshLevels - 1;
    for (const item of this.visible) {
      const { body, lod } = item;
      let representation = lod.representation,
        geometry;
      this.request(body, coarse, 1000 + lod.pixels);
      const key = this.key(
        body,
        representation === "points" ? "points" : lod.level,
      );
      this.request(
        body,
        representation === "points" ? "points" : lod.level,
        100 + lod.pixels * 20,
      );
      geometry = this.cache.get(key);
      if (!geometry) {
        waiting++;
        if (representation === "points")
          geometry = this.cache.get(this.key(body, "fallback-points"));
        else {
          // Prefer the nearest coarser resident mesh while the requested LOD
          // loads. Picking the finest cached shape here can turn a newly
          // expanded far view into millions of unnecessary triangles.
          for (let level = lod.level + 1; level <= coarse; level++) {
            const cached = this.cache.get(this.key(body, level));
            if (cached) {
              geometry = cached;
              break;
            }
          }
          if (!geometry)
            for (let level = lod.level - 1; level >= 0; level--) {
              const cached = this.cache.get(this.key(body, level));
              if (cached) {
                geometry = cached;
                break;
              }
            }
        }
      }
      if (!geometry) continue;
      geometry.touched = now;
      this.protected.add(geometry.key);
      let count = geometry.count,
        rank = lod.rank;
      if (representation === "points") {
        count = Math.min(count, World.pointTiers[lod.level]);
        requestedPoints += count;
        const remaining = this.options.pointBudget - points;
        if (count > remaining) {
          pointLimited = true;
          count =
            World.pointTiers.find((n) => n <= remaining && n <= count) || 0;
        }
        if (!count) continue;
        points += count;
        clouds++;
        rank = World.meshLevels + World.pointTiers.findIndex((n) => n <= count);
      } else {
        triangles += count / 3;
        meshes++;
        rank = Number(geometry.key.slice(geometry.key.lastIndexOf(":") + 1));
      }
      histogram[rank]++;
      const groupKey = `${geometry.key}:${representation}:${count}`;
      if (!groups.has(groupKey))
        groups.set(groupKey, { geometry, representation, count, items: [] });
      groups.get(groupKey).items.push({ body, rank });
    }
    this.dispatch();
    const data = this.instanceData,
      draws = [];
    let at = 0;
    for (const group of groups.values()) {
      const first = at;
      for (const { body, rank } of group.items) {
        const o = at++ * 16;
        data.set(
          [...body.position.map((v, i) => v - camera.position[i]), body.radius],
          o,
        );
        data.set(body.rotation, o + 4);
        data.set([...body.tint, 1], o + 8);
        data.set([rank, body.kind, body.variant, 0], o + 12);
      }
      draws.push({ ...group, first, instances: group.items.length });
    }
    if (at) this.device.queue.writeBuffer(this.instances, 0, data, 0, at * 16);
    this.draws = draws;
    // Buffers and uniforms keep their bindings while their contents change.
    // Record the sky and instanced draws once per resident visibility cut.
    const bundle = this.device.createRenderBundleEncoder({
      label: "Space visibility draw bundle",
      colorFormats: [this.format],
      depthStencilFormat: "depth24plus",
    });
    bundle.setPipeline(this.sky);
    bundle.setBindGroup(0, this.frameGroup);
    bundle.draw(3);
    for (const draw of draws) {
      bundle.setPipeline(
        draw.representation === "mesh" ? this.mesh : this.points,
      );
      bundle.setBindGroup(0, this.frameGroup);
      bundle.setBindGroup(1, draw.geometry.group);
      bundle.draw(
        draw.count * (draw.representation === "points" ? 6 : 1),
        draw.instances,
        0,
        draw.first,
      );
    }
    this.bundles = [bundle.finish()];
    this.drawPosition = camera.position.slice();
    this.drawSelect = this.lastSelect;
    this.drawRevision = this.geometryRevision;
    Object.assign(this.stats, {
      drawCalls: draws.length + 1,
      triangles,
      points,
      requestedPoints,
      meshes,
      clouds,
      drawn: at,
      waiting,
      pointLimited,
      histogram,
    });
    this.stats.batchBuilds = (this.stats.batchBuilds || 0) + 1;
    this.stats.batchMs = performance.now() - start;
  }
  render(camera, planes, now, { lodColors = false } = {}) {
    const start = performance.now();
    // Per-frame costs: cached frames report zero selection / batch work.
    this.stats.selectionMs = 0;
    this.stats.batchMs = 0;
    this.resize();
    if (
      this.dirty ||
      (now - this.lastSelect >= 100 && this.viewChanged(camera, planes))
    ) {
      this.select(camera, planes, now);
      this.viewChanged(camera, planes);
    }
    if (
      !this.draws ||
      this.drawSelect !== this.lastSelect ||
      this.drawRevision !== this.geometryRevision
    )
      this.prepareDraws(camera, now);
    const frame = this.frameData;
    frame.set(camera.viewProjection);
    frame.set([0.4, 0.75, 0.6, 0], 16);
    frame.set(
      [camera.far, Number(lodColors), this.settings.pointSize * this.ratio, 0],
      20,
    );
    frame.set(
      [this.canvas.width, this.canvas.height, camera.tanX, camera.tanY],
      24,
    );
    frame.set(camera.right, 28);
    frame.set(camera.up, 32);
    frame.set(camera.forward, 36);
    // Instance centers stay relative to the last batch origin. Updating this
    // small delta moves the camera smoothly between the 10 Hz visibility cuts,
    // without regrouping and uploading thousands of bodies every flight frame.
    for (let i = 0; i < 3; i++)
      frame[40 + i] = camera.position[i] - this.drawPosition[i];
    this.device.queue.writeBuffer(this.frameBuffer, 0, frame);
    const encoder = this.device.createCommandEncoder(),
      timer =
        this.frameIndex++ % 20 === 0 ? this.timers.find((t) => !t.busy) : null;
    if (timer) timer.busy = true;
    const descriptor = {
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
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
        beginningOfPassWriteIndex: 0,
        endOfPassWriteIndex: 1,
      };
    const pass = encoder.beginRenderPass(descriptor);
    pass.executeBundles(this.bundles);
    pass.end();
    if (timer) {
      encoder.resolveQuerySet(timer.queries, 0, 2, timer.resolve, 0);
      encoder.copyBufferToBuffer(timer.resolve, 0, timer.read, 0, 16);
    }
    this.device.queue.submit([encoder.finish()]);
    if (timer)
      timer.read
        .mapAsync(GPUMapMode.READ)
        .then(() => {
          const stamps = new BigUint64Array(timer.read.getMappedRange());
          this.stats.gpuMs = Number(stamps[1] - stamps[0]) / 1e6;
          timer.read.unmap();
          timer.busy = false;
        })
        .catch((error) => {
          timer.busy = false;
          if (!this.disposed) this.errors.push(error.message);
        });
    Object.assign(this.stats, {
      cpuMs: performance.now() - start,
      pending: this.queue.size + this.inflight.size,
      geometryBytes: this.bytes,
      cachedChunks: this.chunks.size,
    });
    return this.stats;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    for (const state of this.workers || []) state.worker.terminate();
    for (const geometry of this.cache.values()) geometry.buffer.destroy();
    for (const timer of this.timers || []) {
      timer.queries.destroy();
      timer.resolve.destroy();
      timer.read.destroy();
    }
    this.frameBuffer?.destroy();
    this.instances?.destroy();
    this.depth?.destroy();
    this.context?.unconfigure();
    this.device?.destroy();
  }
}

export { Renderer, shader };
export default Renderer;
