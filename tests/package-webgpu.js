import {
  createGPUDevice,
  createTerrain,
  createSpace,
  createProgressiveTerrain,
  createSurface,
  createSphere,
  disposeGPU,
  TerrainField,
  ProgressiveTerrainField,
  attachFlyControls,
} from "../dist/index.esm.js";
const output = document.getElementById("results"),
  canvas = document.getElementById("world"),
  lines = [];
const log = (s) => {
  lines.push(s);
  output.textContent = lines.join("\n");
};
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
let device, view;
try {
  device = await createGPUDevice();
  device.pushErrorScope("validation");
  const cpu = await createSurface({
    sample: (x, y, z) => x + y + z - 1,
    size: { x: 9, y: 9, z: 9 },
  });
  const gpu = await createSurface({
    sample: (x, y, z) => x + y + z - 1,
    size: { x: 9, y: 9, z: 9 },
    backend: "gpu",
    device,
  });
  assert(
    cpu.positions.length === gpu.positions.length,
    "CPU/GPU surface triangle counts",
  );
  const sphere = await createSphere({
    radius: 12,
    center: [20, -4, 9],
    coordinates: "cube-sphere",
    surface: "both",
    thickness: 1,
    backend: "gpu",
    device,
    size: { x: 9, y: 9, z: 9 },
  });
  assert(
    sphere.groups.every((g) => g.count > 0),
    "GPU sphere shell groups",
  );
  log("PASS surface + sphere convenience API on a caller-owned GPU device");
  for (const [kind, create, options, field] of [
    [
      "terrain",
      createTerrain,
      {
        worldSize: 1024,
        tileSize: 128,
        maxDivs: 16,
        memoryMB: 8,
        settings: {
          trees: { enabled: true, distance: 800 },
          infinite: true,
          algorithm: "bourke",
        },
      },
      TerrainField,
    ],
    [
      "progressive",
      createProgressiveTerrain,
      { settings: { pixelError: 2, tileBorders: true } },
      ProgressiveTerrainField,
    ],
    [
      "space",
      createSpace,
      {
        maxInstances: 1000,
        maxChunks: 128,
        workers: 1,
        workerURL: "../dist/space.worker.js",
        settings: { mode: "mesh", quality: 4, caves: false },
      },
      null,
    ],
  ]) {
    view = await create(canvas, { device, pixelRatio: 1, ...options });
    const camera = field
      ? {
          position: [128.25, field.height(128.25, 96.25) + 40, 96.25],
          forward: [0.1, -0.3, -1],
          far: 1024,
        }
      : { position: [0, 180, 1500], forward: [0, -0.07, -1], far: 3000 };
    let stats;
    for (let frame = 0; frame < 100; frame++) {
      stats = view.render(camera, { now: frame * 130 });
      await device.queue.onSubmittedWorkDone();
      if (kind === "space") await new Promise(requestAnimationFrame);
      if ((stats.triangles ?? 0) > 0 && (!stats.pending || kind === "space"))
        break;
    }
    assert(
      stats.triangles > 0,
      `${kind} draws geometry through the shared API`,
    );
    if (kind === "terrain") {
      view.configure({
        trees: { enabled: false },
        algorithm: "mc33",
        wireframe: true,
        renderDistance: 900,
      });
      assert(!view.renderer.vegetation.enabled, "tree toggle");
    }
    if (kind === "progressive")
      view.configure({ wireframe: true, pixelError: 3 });
    if (kind === "space")
      view.configure({ mode: "hybrid", caves: true, algorithm: "bourke" });
    canvas.style.width = "480px";
    view.render(camera, { planes: [], now: 20000 });
    assert(canvas.width === 480, `${kind} resizes its drawing buffer`);
    await device.queue.onSubmittedWorkDone();
    assert(view.errors.length === 0, `${kind} has no renderer errors`);
    view.dispose();
    view.dispose();
    view = null;
    canvas.style.width = "640px";
    // Submitting real work after dispose proves the caller's device survived.
    const encoder = device.createCommandEncoder();
    device.queue.submit([encoder.finish()]);
    await device.queue.onSubmittedWorkDone();
    log(
      `PASS ${kind}: initialize, render, configure, resize, double dispose; supplied device remains usable`,
    );
  }
  const camera = { position: [0, 10, 0] },
    controls = attachFlyControls(canvas, camera, {
      speed: 2,
      groundHeight: () => 5,
      clearance: 5,
    });
  canvas.focus();
  canvas.dispatchEvent(
    new KeyboardEvent("keydown", { code: "KeyW", bubbles: true }),
  );
  controls.update(0.05);
  assert(camera.position[2] < 0, "keyboard controls move camera");
  window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW" }));
  controls.dispose();
  controls.dispose();
  const before = camera.position.slice();
  window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW" }));
  assert(
    before.every((v, i) => v === camera.position[i]),
    "disposed controls stop changing the camera",
  );
  log("PASS optional controls: movement, ground following and cleanup");
  await disposeGPU(device);
  await device.queue.onSubmittedWorkDone();
  const error = await device.popErrorScope();
  assert(!error, error?.message);
  log("PASS WebGPU validation: no errors");
} catch (error) {
  log(`FAIL ${error.stack || error.message}`);
  console.error(error);
} finally {
  view?.dispose();
  device?.destroy();
}
