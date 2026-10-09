import * as THREE from "three";
import { SpaceRenderer, SpaceWorld } from "../dist/index.esm.js";
const SpaceLOD = { Renderer: SpaceRenderer };
(async function () {
  const result = document.getElementById("results"),
    lines = [],
    log = (text) => {
      lines.push(text);
      result.textContent = lines.join("\n");
    },
    assert = (ok, text) => {
      if (!ok) throw new Error(text);
    };
  let renderer,
    validationOpen = false;
  try {
    renderer = await new SpaceLOD.Renderer(
      document.getElementById("space"),
    ).initialize();
    renderer.device.pushErrorScope("validation");
    validationOpen = true;
    renderer.context.configure({
      device: renderer.device,
      format: renderer.format,
      alphaMode: "opaque",
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
    });
    const camera = new THREE.PerspectiveCamera(60, 1280 / 720, 1, 32000),
      vp = new THREE.Matrix4(),
      frustum = new THREE.Frustum(),
      seen = new Set();
    let now = 0;
    camera.lookAt(new THREE.Vector3(0, -0.07, -1));
    camera.updateMatrixWorld();
    vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(vp);
    const planes = frustum.planes.map((p) => [
        p.normal.x,
        p.normal.y,
        p.normal.z,
        p.constant,
      ]),
      tanY = Math.tan(Math.PI / 6);
    function render(position = [0, 180, 1500], step = 110) {
      return renderer.render(
        {
          position,
          far: 32000,
          pixelScale: renderer.canvas.height / (2 * tanY),
          viewProjection: vp.elements,
          right: [1, 0, 0],
          up: [0, 1, 0],
          forward: [0, -0.07, -1],
          tanX: (tanY * 1280) / 720,
          tanY,
        },
        planes,
        (now += step),
      );
    }
    async function settle(position) {
      let stats;
      renderer.dirty = true;
      for (let i = 0; i < 800; i++) {
        stats = render(position);
        await renderer.device.queue.onSubmittedWorkDone();
        if (stats.pending === 0 && stats.waiting === 0 && i > 0) {
          stats.histogram.slice(0, 8).forEach((count, level) => {
            if (count) seen.add(level);
          });
          return { ...stats, histogram: stats.histogram.slice() };
        }
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      throw new Error("32 km geometry did not settle");
    }
    renderer.configure({ maxMeshLevel: 4 });
    const baseline = await settle(),
      ids = renderer.visible.map((item) => item.body.id);
    log(
      `FIVE LEVEL BASELINE: ${baseline.drawn} bodies, ${baseline.triangles.toLocaleString()} triangles`,
    );
    renderer.configure({ maxMeshLevel: 7 });
    const adaptive = await settle();
    assert(
      JSON.stringify(ids) ===
        JSON.stringify(renderer.visible.map((item) => item.body.id)),
      "same bodies remain visible",
    );
    assert(
      adaptive.drawn === baseline.drawn && adaptive.clouds === 0,
      "same solid mesh population, no point substitution",
    );
    assert(
      adaptive.triangles < baseline.triangles * 0.3,
      "far detail reduces triangles by at least 70%",
    );
    assert(
      adaptive.histogram.slice(5, 8).every((count) => count > 0),
      "all three new far levels are actually drawn",
    );
    log(
      `EIGHT LEVELS: ${adaptive.drawn} bodies, ${adaptive.triangles.toLocaleString()} triangles (${(100 * (1 - adaptive.triangles / baseline.triangles)).toFixed(1)}% fewer), ${adaptive.drawCalls} draws`,
    );
    log(`LOD 0–7 populations: ${adaptive.histogram.slice(0, 8).join(" / ")}`);
    const batches = renderer.stats.batchBuilds,
      selection = renderer.lastSelect;
    let cpu = 0;
    for (let i = 0; i < 60; i++) {
      cpu += render().cpuMs;
      await renderer.device.queue.onSubmittedWorkDone();
    }
    assert(
      renderer.stats.batchBuilds === batches &&
        renderer.lastSelect === selection,
      "stationary frames reuse selection and uploaded instance batches",
    );
    log(
      `PASS stationary selection and batches reused, mean CPU submission ${(cpu / 60).toFixed(3)} ms`,
    );
    renderer.dirty = true;
    render();
    const shifted = [13.25, 182.5, 1495.75],
      retainedBundle = renderer.bundles[0],
      retainedBuilds = renderer.stats.batchBuilds;
    render(shifted, 16);
    assert(
      renderer.bundles[0] === retainedBundle &&
        renderer.stats.batchBuilds === retainedBuilds,
      "camera translation reuses uploaded instances and the render bundle between visibility cuts",
    );
    const capture = async () => {
      // Copy in the same task as rendering, before the canvas texture expires
      // at presentation. A later 2D canvas snapshot may have already cleared.
      const { width, height } = renderer.canvas;
      const bytesPerRow = Math.ceil((width * 4) / 256) * 256;
      const read = renderer.device.createBuffer({
        size: bytesPerRow * height,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      const encoder = renderer.device.createCommandEncoder();
      encoder.copyTextureToBuffer(
        { texture: renderer.context.getCurrentTexture() },
        { buffer: read, bytesPerRow },
        [width, height],
      );
      renderer.device.queue.submit([encoder.finish()]);
      await read.mapAsync(GPUMapMode.READ);
      const padded = new Uint8Array(read.getMappedRange());
      const pixels = new Uint8Array(width * height * 4);
      for (let y = 0; y < height; y++)
        pixels.set(
          padded.subarray(y * bytesPerRow, y * bytesPerRow + width * 4),
          y * width * 4,
        );
      read.unmap();
      read.destroy();
      return pixels;
    };
    const offsetImage = await capture();
    renderer.prepareDraws({ position: shifted }, now);
    render(shifted, 1);
    const rebasedImage = await capture();
    let imageError = 0,
      litPixels = 0;
    for (let i = 0; i < offsetImage.length; i += 4) {
      for (let c = 0; c < 3; c++)
        imageError += Math.abs(offsetImage[i + c] - rebasedImage[i + c]);
      if (offsetImage[i] > 30) litPixels++;
    }
    assert(
      litPixels > 1000,
      "pixel comparison contains the rendered mesh scene",
    );
    const meanImageError = imageError / (offsetImage.length * 0.75);
    assert(
      meanImageError < 0.5,
      `GPU camera offset matches a freshly rebased mesh image (${meanImageError})`,
    );
    log(
      `PASS translated render bundle matches rebased image, mean RGB error ${meanImageError.toFixed(4)} / 255`,
    );
    let movingCPU = 0,
      movingMax = 0,
      reusedFrames = 0;
    const movingBatches = renderer.stats.batchBuilds;
    for (let i = 1; i <= 120; i++) {
      const beforeSelect = renderer.lastSelect,
        beforeRevision = renderer.geometryRevision,
        beforeDrawRevision = renderer.drawRevision,
        beforeBuilds = renderer.stats.batchBuilds,
        beforeBundle = renderer.bundles[0];
      const stats = render([i * 2, 180, 1500 - i * 4], 16);
      if (
        renderer.lastSelect === beforeSelect &&
        renderer.geometryRevision === beforeRevision &&
        beforeDrawRevision === beforeRevision
      ) {
        assert(
          renderer.stats.batchBuilds === beforeBuilds &&
            renderer.bundles[0] === beforeBundle,
          "moving frames between visibility cuts reuse their render bundle",
        );
        reusedFrames++;
      }
      movingCPU += stats.cpuMs;
      movingMax = Math.max(movingMax, stats.cpuMs);
      await renderer.device.queue.onSubmittedWorkDone();
    }
    log(
      `FLIGHT: mean CPU ${(movingCPU / 120).toFixed(3)} ms, max ${movingMax.toFixed(3)} ms, ${renderer.stats.batchBuilds - movingBatches} batch rebuilds / 120 frames`,
    );
    assert(
      reusedFrames > 80,
      "most flight frames reuse the existing render bundle and instances",
    );
    await settle([-230, 160, 900]);
    assert(
      renderer.stats.batchBuilds > batches,
      "movement invalidates batches",
    );
    assert(
      seen.size === 8,
      "all eight drawn levels reached across camera travel",
    );
    log("PASS all eight drawn mesh levels, movement invalidation");
    const repeat = await settle([81000, -55000, 99000]);
    assert(
      repeat.drawn <= 12000 &&
        repeat.sectors <= 2048 &&
        repeat.cachedChunks <= 4096 &&
        repeat.geometryBytes <= 64 * 1024 ** 2,
      "production view and cache bounds during long travel",
    );
    log("PASS 99 km travel with production body / sector / geometry budgets");
    const validation = await renderer.device.popErrorScope();
    validationOpen = false;
    assert(!validation, validation?.message || "GPU validation");
    assert(!renderer.errors.length, renderer.errors.join("\n"));
    log("ALL 32 KM STRESS CHECKS PASSED");
    document.body.dataset.result = "pass";
  } catch (error) {
    log(`FAIL ${error.stack || error}`);
    if (validationOpen) {
      const validation = await renderer.device.popErrorScope();
      if (validation) log(`GPU VALIDATION: ${validation.message}`);
    }
    document.body.dataset.result = "fail";
  } finally {
    renderer?.dispose();
  }
})();
