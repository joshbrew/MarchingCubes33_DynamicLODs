import {
  createCamera,
  cameraFromThree,
  frustumPlanes,
  relativeCamera,
} from "./camera.js";

const common = { renderDistance: [1, Infinity], lodColors: "boolean" };
const settingsByKind = {
  terrain: {
    ...common,
    pixelError: [0.01, Infinity],
    nearRadius: [0, Infinity],
    uniform: "boolean",
    infinite: "boolean",
    algorithm: ["bourke", "mc33"],
    wireframe: "boolean",
    trees: "trees",
  },
  space: {
    ...common,
    mode: ["mesh", "points", "hybrid"],
    quality: [0.01, Infinity],
    uniform: "boolean",
    algorithm: ["bourke", "mc33"],
    pointSize: [0.01, Infinity],
    lodDistance: [1, Infinity],
    nearRadius: [0, Infinity],
    caves: "boolean",
  },
  progressive: {
    ...common,
    pixelError: [0.01, Infinity],
    wireframe: "boolean",
    tileBorders: "boolean",
  },
};
function validate(kind, values) {
  if (!values || typeof values !== "object" || Array.isArray(values))
    throw new TypeError("settings must be an object.");
  for (const [key, value] of Object.entries(values)) {
    if (!Object.hasOwn(settingsByKind[kind], key))
      throw new TypeError(`Unknown ${kind} setting: ${key}`);
    const rule = settingsByKind[kind][key];
    if (rule === "trees") {
      if (!value || typeof value !== "object" || Array.isArray(value))
        throw new TypeError("trees must be { enabled, distance }.");
      for (const [k, v] of Object.entries(value)) {
        if (k === "enabled" && typeof v === "boolean") continue;
        if (k === "distance" && Number.isFinite(v) && v >= 0) continue;
        throw new TypeError(`Invalid trees setting: ${k}`);
      }
    } else if (
      rule === "boolean"
        ? typeof value !== "boolean"
        : typeof rule[0] === "string"
          ? !rule.includes(value)
          : !Number.isFinite(value) || value < rule[0] || value > rule[1]
    )
      throw new RangeError(`Invalid ${kind} setting: ${key}`);
  }
}

/** One lifecycle for all three standalone WebGPU worlds; no DOM controls or loop. */
export class WorldView {
  constructor(kind, renderer) {
    this.kind = kind;
    this.renderer = renderer;
    this.disposed = false;
    this.values = {
      ...Object.fromEntries(
        Object.keys(settingsByKind[kind])
          .filter((k) => k in renderer.settings)
          .map((k) => [k, renderer.settings[k]]),
      ),
      lodColors: false,
    };
    if (kind !== "space") this.values.wireframe = false;
    if (kind === "progressive") this.values.tileBorders = true;
    if (kind === "terrain") {
      this.values.algorithm = renderer.algorithm;
      this.values.trees = {
        enabled: renderer.vegetation.enabled,
        distance: renderer.vegetation.distance,
      };
    }
  }
  get stats() {
    return this.renderer.stats;
  }
  get errors() {
    return this.renderer.errors;
  }
  get settings() {
    return {
      ...this.values,
      ...(this.values.trees ? { trees: { ...this.values.trees } } : {}),
    };
  }
  configure(values) {
    if (this.disposed) throw new Error("World view has been disposed.");
    validate(this.kind, values);
    const backend = {};
    for (const [key, value] of Object.entries(values)) {
      if (key === "trees") {
        this.values.trees = { ...this.values.trees, ...value };
        const trees = this.renderer.vegetation;
        trees.enabled = this.values.trees.enabled;
        trees.distance = this.values.trees.distance;
        trees.lastPlan = null;
      } else {
        this.values[key] = value;
        if (key === "algorithm" && this.kind === "terrain")
          this.renderer.algorithm = value;
        else if (
          !["renderDistance", "lodColors", "wireframe", "tileBorders"].includes(
            key,
          )
        )
          backend[key] = value;
      }
    }
    if (Object.keys(backend).length) this.renderer.configure(backend);
    return this;
  }
  render(camera = {}, { now = performance.now(), planes } = {}) {
    if (this.disposed) throw new Error("World view has been disposed.");
    const renderer = this.renderer;
    renderer.resize();
    const height = renderer.canvas.height,
      aspect = renderer.canvas.width / height;
    let input;
    if (camera.isPerspectiveCamera) input = cameraFromThree(camera, { height });
    else if (camera.viewProjection) {
      // Matrix inputs must provide their matching perspective/basis metadata.
      if (
        !camera.position ||
        !(camera.fov > 0 && camera.fov < Math.PI) ||
        !Number.isFinite(camera.far) ||
        camera.far <= 0
      )
        throw new TypeError(
          "Matrix cameras need position, fov (radians) and far.",
        );
      const tanY = Math.tan(camera.fov / 2);
      input = {
        ...camera,
        height: camera.height ?? height,
        player: camera.player ?? camera.position,
        tanY,
        tanX: camera.tanX ?? tanY * aspect,
        pixelScale: (camera.height ?? height) / (2 * tanY),
      };
      input.planes = frustumPlanes(camera.viewProjection);
    } else
      input = createCamera({
        ...camera,
        aspect: camera.aspect ?? aspect,
        height: camera.height ?? height,
      });
    if (
      this.values.renderDistance !== undefined &&
      input.far !== this.values.renderDistance
    ) {
      const far = this.values.renderDistance,
        near = input.near;
      if (!(near > 0 && far > near))
        throw new RangeError(
          "Render distance must exceed camera.near; matrix cameras must include near.",
        );
      // Rewrite the projection depth row without changing the caller's camera.
      const m = Array.from(input.viewProjection),
        a = (far + near) / (near - far),
        b = (2 * far * near) / (near - far);
      for (let c = 0; c < 4; c++)
        m[c * 4 + 2] = -a * m[c * 4 + 3] + (c === 3 ? b : 0);
      input = { ...input, far, viewProjection: m, planes: frustumPlanes(m) };
    }
    if (this.kind === "space") {
      if (![input.right, input.up, input.forward].every((v) => v?.length === 3))
        throw new TypeError(
          "Space matrix cameras also need right, up and forward basis vectors. Use createCamera or cameraFromThree.",
        );
      if (planes)
        planes = planes.map(([x, y, z, w]) => [
          x,
          y,
          z,
          w +
            x * input.position[0] +
            y * input.position[1] +
            z * input.position[2],
        ]);
      input = relativeCamera(input);
    }
    return renderer.render(input, planes ?? input.planes, now, this.values);
  }
  dispose() {
    if (!this.disposed) {
      this.disposed = true;
      this.renderer.dispose();
    }
  }
}

export async function initializeWorld(kind, Renderer, canvas, options = {}) {
  if (!canvas || typeof canvas.getContext !== "function")
    throw new TypeError("Pass a canvas element or OffscreenCanvas.");
  const { settings = {}, ...allocation } = options;
  validate(kind, settings);
  if (
    kind === "space" &&
    allocation.workers !== undefined &&
    (!Number.isInteger(allocation.workers) ||
      allocation.workers < 1 ||
      allocation.workers > 8)
  )
    throw new RangeError("workers must be an integer from 1 to 8.");
  const renderer = new Renderer(canvas, allocation);
  try {
    await renderer.initialize();
    return new WorldView(kind, renderer).configure(settings);
  } catch (error) {
    renderer.dispose();
    throw error;
  }
}
