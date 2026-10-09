import * as Vegetation from "./vegetation.js";
import * as Field from "./field.js";
import * as LOD from "./lod.js";
import renderShader from "./shaders/trees.wgsl";
const shader = renderShader;

class Trees {
  constructor(terrain) {
    this.terrain = terrain;
    this.enabled = true;
    this.distance = 1400;
    this.limit = 16000;
    this.cache = new Map();
    this.previous = new Map();
    this.data = new ArrayBuffer(this.limit * 64);
    this.lastPlan = null;
    this.lastView = "";
    this.stats = { trees: 0, triangles: 0, draws: 0 };
  }
  async initialize() {
    const t = this.terrain,
      d = t.device;
    this.buffer = d.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const layout = d.createBindGroupLayout({
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
    this.group = d.createBindGroup({
      layout,
      entries: [
        { binding: 0, resource: { buffer: t.atlas } },
        { binding: 1, resource: { buffer: this.buffer } },
        { binding: 2, resource: { buffer: t.frameParams } },
      ],
    });
    const module = d.createShaderModule({ code: shader }),
      info = await module.getCompilationInfo();
    if (info.messages.some((m) => m.type === "error"))
      throw new Error(info.messages.map((m) => m.message).join("\n"));
    this.pipeline = await d.createRenderPipelineAsync({
      layout: d.createPipelineLayout({ bindGroupLayouts: [layout] }),
      vertex: {
        module,
        entryPoint: "vertex",
        buffers: [
          {
            arrayStride: 36,
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x3" },
              { shaderLocation: 1, offset: 12, format: "float32x3" },
              { shaderLocation: 2, offset: 24, format: "float32x3" },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fragment",
        targets: [{ format: t.format }],
      },
      primitive: { topology: "triangle-list", cullMode: "none" },
      depthStencil: {
        format: "depth24plus",
        depthWriteEnabled: true,
        depthCompare: "less",
      },
    });
    this.meshes = [0, 1, 2].map((lod) => {
      const data = Vegetation.geometry(lod),
        buffer = d.createBuffer({
          size: data.byteLength,
          usage: GPUBufferUsage.VERTEX,
          mappedAtCreation: true,
        });
      new Float32Array(buffer.getMappedRange()).set(data);
      buffer.unmap();
      return { buffer, count: data.length / 9 };
    });
    return this;
  }
  prepare(camera, planes, now) {
    if (!this.enabled) {
      this.stats = { trees: 0, triangles: 0, draws: 0 };
      this.draws = [];
      this.lastPlan = null;
      return;
    }
    const t = this.terrain,
      view = [
        ...camera.position,
        camera.height,
        camera.fov,
        camera.far,
        this.distance,
        ...planes.flat(),
      ].join(",");
    if (
      this.lastPlan === t.drawPlan &&
      (view === this.lastView || now - this.lastTime < 100)
    )
      return;
    this.lastPlan = t.drawPlan;
    this.lastView = view;
    this.lastTime = now;
    const candidates = [],
      far = Math.min(this.distance, camera.far),
      masks = LOD.seams(t.lastActual, t.side),
      keep = new Set();
    for (const id of t.visibleIds) {
      const level = t.lastActual.get(id);
      if (level === undefined) continue;
      const tile = t.tiles[id];
      if (LOD.distanceTo(tile, camera.position) > far) continue;
      const key = `${t.seed}:${tile.ox}:${tile.oz}`;
      keep.add(key);
      let cached = this.cache.get(key);
      if (!cached) {
        cached = { trees: Vegetation.trees(tile, 32, t.seed), time: now };
        for (const tree of cached.trees)
          tree.y = Field.height(tree.x, tree.z, t.seed);
        this.cache.set(key, cached);
      }
      cached.time = now;
      for (const tree of cached.trees) {
        const center = [tree.x, tree.y + tree.height * 0.5, tree.z],
          distance = Math.hypot(
            ...center.map((v, i) => v - camera.position[i]),
          );
        if (
          distance > far ||
          planes.some(
            (p) =>
              p[0] * center[0] + p[1] * center[1] + p[2] * center[2] + p[3] <
              -tree.height * 0.6,
          )
        )
          continue;
        candidates.push({ tree, id, level, distance });
      }
    }
    if (this.cache.size > 512) {
      const victims = Array.from(this.cache).sort(
        (a, b) =>
          Number(keep.has(a[0])) - Number(keep.has(b[0])) ||
          a[1].time - b[1].time,
      );
      for (const [key] of victims) {
        if (this.cache.size <= 512) break;
        this.cache.delete(key);
      }
    }
    candidates.sort((a, b) => a.distance - b.distance);
    const buckets = [[], [], []],
      previous = new Map();
    for (const item of candidates.slice(0, this.limit)) {
      const lod = Vegetation.level(
        item.tree,
        camera,
        this.previous.get(item.tree.id),
      );
      buckets[lod].push(item);
      previous.set(item.tree.id, lod);
    }
    this.previous = previous;
    const f32 = new Float32Array(this.data),
      u32 = new Uint32Array(this.data);
    let at = 0,
      triangles = 0;
    this.draws = [];
    for (let lod = 0; lod < 3; lod++) {
      const first = at;
      for (const { tree, id, level, distance } of buckets[lod]) {
        const entry = t.entries.get(id),
          divs = t.options.maxDivs >> level,
          stored = t.options.maxDivs >> entry.lod,
          step = stored / divs,
          attachment = Vegetation.attachment(
            divs,
            masks.get(id),
            t.algorithm,
            tree.u,
            tree.v,
          ),
          o = at++ * 16;
        f32.set([tree.x, 0, tree.z, tree.height], o);
        f32.set(
          [
            tree.yaw,
            tree.tint,
            Math.min(1, (far - distance) / (far * 0.15)),
            lod,
          ],
          o + 4,
        );
        u32.set(
          attachment.ids.map(
            (index) =>
              entry.slot * t.stride +
              Math.floor(index / (divs + 1)) * step * (stored + 1) +
              (index % (divs + 1)) * step,
          ),
          o + 8,
        );
        f32.set(attachment.weights, o + 12);
      }
      if (at > first) {
        this.draws.push({ lod, first, instances: at - first });
        triangles += ((at - first) * this.meshes[lod].count) / 3;
      }
    }
    if (at) t.device.queue.writeBuffer(this.buffer, 0, this.data, 0, at * 64);
    this.stats = {
      trees: at,
      triangles,
      draws: this.draws.length,
      cachedTiles: this.cache.size,
      lods: buckets.map((b) => b.length),
      limited: candidates.length > this.limit,
    };
  }
  render(pass) {
    if (!this.enabled || !this.draws?.length) return;
    pass.setPipeline(this.pipeline);
    pass.setBindGroup(0, this.group);
    for (const draw of this.draws) {
      const mesh = this.meshes[draw.lod];
      pass.setVertexBuffer(0, mesh.buffer);
      pass.draw(mesh.count, draw.instances, 0, draw.first);
    }
  }
  dispose() {
    this.buffer?.destroy();
    for (const mesh of this.meshes || []) mesh.buffer.destroy();
  }
}

export { Trees, shader };
export default Trees;
