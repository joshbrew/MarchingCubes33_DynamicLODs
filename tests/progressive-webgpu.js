import * as THREE from "three";
import {
  ProgressiveTerrainRenderer,
  ProgressiveTerrainField as Field,
  ProgressiveTerrainLOD as LOD,
} from "../dist/index.esm.js";

const output = document.getElementById("results"),
  lines = [];
const log = (text) => {
  lines.push(text);
  output.textContent = lines.join("\n");
};
const assert = (value, message) => {
  if (!value) throw new Error(message);
};
let renderer;
try {
  renderer = await new ProgressiveTerrainRenderer(
    document.getElementById("terrain"),
  ).initialize();
  renderer.device.pushErrorScope("validation");
  const camera = new THREE.PerspectiveCamera(60, 1.6, 0.015, 2048),
    vp = new THREE.Matrix4(),
    frustum = new THREE.Frustum();
  let now = 0;
  function render(
    x = 128.25,
    z = 96.25,
    clearance = 0.75,
    far = 2048,
    wireframe = false,
    lookingAway = false,
    yaw = 0,
  ) {
    camera.position.set(x, Field.height(x, z) + clearance, z);
    camera.far = far;
    camera.lookAt(
      new THREE.Vector3(
        x + Math.sin(yaw + 0.32) * 16,
        camera.position.y - 3,
        z + Math.cos(yaw + 0.32) * (lookingAway ? 16 : -16),
      ),
    );
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(vp);
    return renderer.render(
      {
        position: camera.position.toArray(),
        height: 900,
        fov: Math.PI / 3,
        far,
        viewProjection: vp.elements,
      },
      frustum.planes.map((p) => [
        p.normal.x,
        p.normal.y,
        p.normal.z,
        p.constant,
      ]),
      (now += 130),
      { wireframe },
    );
  }
  async function settle(...args) {
    let stats;
    for (let i = 0; i < 130; i++) {
      stats = render(...args);
      await renderer.device.queue.onSubmittedWorkDone();
      const readyRoots = renderer.plan.roots.filter((n) =>
        renderer.entries.has(n.key),
      );
      const area = [...renderer.cut.values()].reduce(
        (sum, n) => sum + n.size ** 2,
        0,
      );
      assert(
        area === readyRoots.length * renderer.plan.rootSize ** 2,
        "coarse coverage survives every progressive batch",
      );
      for (const n of renderer.cut.values())
        for (const [other] of LOD.neighbors(
          n,
          renderer.cut,
          renderer.plan.rootSize,
          renderer.plan.maxLevel,
        ))
          if (other)
            assert(
              Math.abs(n.level - other.level) <= 1,
              "every intermediate cut stays 2:1 balanced",
            );
      assert(
        stats.resident <= renderer.capacity,
        "resident cache stays bounded",
      );
      if (!stats.pending) break;
    }
    assert(!stats.pending, "progressive cache settles");
    assert(stats.drawn > 0, "visible geometry is drawn");
    return stats;
  }
  const stats = await settle();
  assert(stats.finest <= 0.03125, "near-surface tiles reach 3.125 cm spacing");
  log(
    `PASS GPU compute/render and progressive parent fallback: ${stats.drawn} visible tiles, ${stats.finest * 100} cm spacing`,
  );
  const finest = [...renderer.cut.values()].sort(
    (a, b) => b.level - a.level,
  )[0];
  const patch = await renderer.readTile(finest.key);
  let heightError = 0,
    gradientError = 0;
  for (let z = 0; z <= patch.divs; z += 4)
    for (let x = 0; x <= patch.divs; x += 4) {
      const expected = Field.heightGradient(
          finest.ox + (x * finest.size) / patch.divs,
          finest.oz + (z * finest.size) / patch.divs,
        ),
        at = (z * (patch.divs + 1) + x) * 4;
      heightError = Math.max(
        heightError,
        Math.abs(patch.data[at] - expected[0]),
      );
      gradientError = Math.max(
        gradientError,
        Math.abs(patch.data[at + 1] - expected[1]),
        Math.abs(patch.data[at + 2] - expected[2]),
      );
    }
  assert(
    heightError < 0.002 && gradientError < 0.002,
    "centimetre GPU samples agree with CPU noise and derivatives",
  );
  log(
    `PASS fine tile readback: height error ${heightError.toFixed(6)} m, gradient error ${gradientError.toFixed(6)}`,
  );
  let checked = 0;
  for (const n of renderer.cut.values()) {
    const neighbor = LOD.neighbors(
      n,
      renderer.cut,
      renderer.plan.rootSize,
      renderer.plan.maxLevel,
    ).find(([p]) => p && p.level === n.level - 1);
    if (!neighbor) continue;
    const [coarse, side] = neighbor,
      fineData = (await renderer.readTile(n.key)).data,
      coarseData = (await renderer.readTile(coarse.key)).data,
      divs = renderer.options.divs;
    for (let i = 0; i <= divs; i += 2) {
      const x = side === 1 ? 0 : side === 2 ? divs : i,
        z = side === 4 ? 0 : side === 8 ? divs : i;
      const wx = n.ox + (x * n.size) / divs,
        wz = n.oz + (z * n.size) / divs;
      const cx = Math.round(((wx - coarse.ox) * divs) / coarse.size),
        cz = Math.round(((wz - coarse.oz) * divs) / coarse.size);
      const a = (z * (divs + 1) + x) * 4,
        b = (cz * (divs + 1) + cx) * 4;
      for (let channel = 0; channel < 3; channel++)
        assert(
          fineData[a + channel] === coarseData[b + channel],
          "GPU stitched-edge heights and gradients match exactly",
        );
    }
    if (++checked === 8) break;
  }
  assert(checked > 0, "mixed-resolution GPU seams exist");
  log(`PASS ${checked} GPU mixed-resolution borders match exactly`);
  const generated = renderer.stats.generated,
    bundles = renderer.stats.bundleBuilds;
  for (let i = 0; i < 6; i++) render();
  assert(
    renderer.stats.generated === generated &&
      renderer.stats.bundleBuilds === bundles,
    "stationary views reuse tiles and render bundles",
  );
  log("PASS stationary view generates no tiles and reuses its render bundle");
  const selectionCount = renderer.stats.selections,
    rotationCPU = [];
  let peakTriangles = 0;
  for (let i = 0; i < 120; i++) {
    const s = render(
      128.25,
      96.25,
      0.75,
      2048,
      false,
      false,
      (i * Math.PI) / 60,
    );
    rotationCPU.push(s.cpuMs);
    peakTriangles = Math.max(peakTriangles, s.triangles);
    await renderer.device.queue.onSubmittedWorkDone();
  }
  assert(
    renderer.stats.generated === generated &&
      renderer.stats.selections === selectionCount,
    "360-degree turns neither regenerate noise nor reselect topology",
  );
  assert(
    peakTriangles < 600000,
    "default triangle count remains below 600k while rotating",
  );
  rotationCPU.sort((a, b) => a - b);
  log(
    `PASS 360° turn: no new tiles or selections; CPU p95 ${rotationCPU[114].toFixed(2)} ms / max ${rotationCPU.at(-1).toFixed(2)} ms; peak ${peakTriangles.toLocaleString()} triangles`,
  );
  const movementCPU = [];
  let maxSelection = 0,
    maxCut = 0;
  for (let i = 0; i < 40; i++) {
    const s = render(128.25 + i * 2, 96.25, 0.75);
    movementCPU.push(s.cpuMs);
    maxSelection = Math.max(maxSelection, s.selectionMs);
    maxCut = Math.max(maxCut, s.cutMs);
    await renderer.device.queue.onSubmittedWorkDone();
  }
  movementCPU.sort((a, b) => a - b);
  log(
    `MEASURE travel: CPU p95 ${movementCPU[38].toFixed(2)} ms / max ${movementCPU.at(-1).toFixed(2)} ms; selection max ${maxSelection.toFixed(2)} ms; cut max ${maxCut.toFixed(2)} ms`,
  );
  const atlas = renderer.texture,
    bytes = renderer.stats.atlasBytes;
  await settle(128.25, 96.25, 1200);
  assert(renderer.stats.finest >= 1, "altitude allows coarser sampling");
  await settle(-3250.25, 4100.75, 0.75);
  await settle(8128.25, -6096.75, 0.75);
  await settle(-12288.25, -1024.75, 0.75);
  assert(renderer.stats.evicted > 0, "travel evicts old tiles");
  assert(
    renderer.texture === atlas && renderer.stats.atlasBytes === bytes,
    "infinite travel reuses the same atlas allocation",
  );
  await settle();
  const replay = await renderer.readTile(finest.key);
  assert(
    patch.data.every((v, i) => v === replay.data[i]),
    "evicted tiles regenerate identical noise",
  );
  log(
    `PASS negative-coordinate and distant travel, ${renderer.stats.evicted} evictions, deterministic revisit, fixed ${(bytes / 1024 ** 2).toFixed(1)} MB atlas`,
  );
  await settle(128.25, 96.25, 0.75, 8192);
  assert(
    renderer.plan.rootSize > 1024 && renderer.stats.atlasBytes === bytes,
    "larger range adapts coarse roots within the same memory budget",
  );
  await settle(128.25, 96.25, 0.75, 2048, true, true);
  log("PASS 8 km range, FOV changes and wireframe pipeline");
  await renderer.device.queue.onSubmittedWorkDone();
  const validation = await renderer.device.popErrorScope();
  assert(
    !validation && !renderer.errors.length,
    validation?.message || renderer.errors.join("\n"),
  );
  log("PASS WebGPU validation: no errors");
  output.dataset.result = "pass";
} catch (error) {
  log(`FAIL ${error.stack || error.message}`);
  output.dataset.result = "fail";
  console.error(error);
} finally {
  renderer?.dispose();
}
