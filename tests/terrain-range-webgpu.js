import {
  createTerrain,
  createCamera,
  TerrainLOD,
  TerrainField,
} from "../dist/index.esm.js";
const output = document.querySelector("#results"),
  lines = [];
const log = (line) => {
  lines.push(line);
  output.textContent = lines.join("\n");
};
const assert = (ok, text) => {
  if (!ok) throw new Error(text);
};
let world;
try {
  world = await createTerrain(document.querySelector("#terrain"), {
    settings: { trees: { enabled: false } },
  });
  const t = world.renderer,
    position = [128.25, 171, 96.25];
  t.device.pushErrorScope("validation");
  let now = 0,
    previous = new Set();
  const camera = (far, x = position[0]) =>
    createCamera({
      position: [x, position[1], position[2]],
      forward: [0, -0.25, -1],
      far,
      height: 540,
      aspect: 16 / 9,
    });
  for (const far of [1800, 3000, 4000, 8000, 16000, 64000]) {
    world.configure({ renderDistance: far });
    const stats = world.render(camera(far), { now: (now += 110) });
    assert(
      stats.drawn === t.visibleIds.length,
      "all selected tiles are drawn immediately, even with a cold detail cache",
    );
    for (const id of previous)
      assert(t.visibleIds.includes(id), `${far} m contracts previous coverage`);
    previous = new Set(t.visibleIds);
    assert(
      t.stats.atlasBytes <= 64 * 1024 ** 2 && t.entries.size <= t.capacity,
      "coverage and detail share the original 64 MiB budget",
    );
    log(
      `PASS ${far.toLocaleString()} m: ${stats.drawn} tiles covered; ${t.entries.size}/${t.capacity} detail slots`,
    );
    await t.device.queue.onSubmittedWorkDone();
  }
  const farId = t.visibleIds.find(
    (id) => TerrainLOD.distanceTo(t.tiles[id], position) > 3500,
  );
  assert(farId !== undefined, "terrain genuinely extends past 3.5 km");
  const patch = await t.readPatch(farId);
  assert(patch.divs === 2, "far tile uses the compact coverage grid");
  let error = 0;
  for (let at = 0; at < patch.data.length; at += 8)
    error = Math.max(
      error,
      Math.abs(
        patch.data[at + 1] -
          TerrainField.height(patch.data[at], patch.data[at + 2]),
      ),
    );
  assert(error < 0.02, "far GPU coverage matches the actual terrain noise");
  const coverageBuilds = t.stats.coverageBuilds;
  for (let i = 0; i < 100 && t.stats.pending; i++) {
    world.render(camera(64000), { now: (now += 16) });
    await t.device.queue.onSubmittedWorkDone();
  }
  assert(t.stats.pending === 0, "detail cache settles at the long range");
  const timings = [],
    bundles = t.stats.bundleBuilds;
  for (let i = 0; i < 120; i++) {
    const stats = world.render(camera(64000, position[0] + i * 0.25), {
      now: (now += 16),
    });
    timings.push(stats.cpuMs);
    await t.device.queue.onSubmittedWorkDone();
  }
  assert(
    t.stats.coverageBuilds === coverageBuilds,
    "moving or extending range does not rebuild the coarse atlas",
  );
  assert(
    t.stats.bundleBuilds - bundles < 60,
    "most moving frames reuse the terrain render bundle",
  );
  timings.sort((a, b) => a - b);
  log(
    `PASS far noise readback error ${error.toFixed(6)} m; unchanged coverage dispatch count`,
  );
  log(
    `PROFILE moving terrain CPU submit p95 ${timings[Math.floor(timings.length * 0.95)].toFixed(2)} ms; max ${timings.at(-1).toFixed(2)} ms; ${t.stats.bundleBuilds - bundles} bundle rebuilds / 120 frames (trees off; scripted submissions, not FPS)`,
  );
  world.configure({ trees: { enabled: true } });
  for (let i = 0; i < 60; i++) {
    world.render(camera(64000), { now: (now += 16) });
    await t.device.queue.onSubmittedWorkDone();
  }
  const forestTimes = [];
  for (let i = 0; i < 120; i++) {
    const stats = world.render(camera(64000, position[0] + i * 0.25), {
      now: (now += 16),
    });
    forestTimes.push(stats.cpuMs);
    await t.device.queue.onSubmittedWorkDone();
  }
  forestTimes.sort((a, b) => a - b);
  assert(
    t.stats.vegetation.trees > 0 && t.stats.vegetation.draws <= 3,
    "forest stays instanced over the covered map",
  );
  log(
    `PROFILE forest CPU submit p95 ${forestTimes[Math.floor(forestTimes.length * 0.95)].toFixed(2)} ms; max ${forestTimes.at(-1).toFixed(2)} ms; ${t.stats.vegetation.trees} trees; ${t.canvas.width} x ${t.canvas.height} framebuffer (scripted submissions, not FPS)`,
  );
  // Read a pixel whose ground ray is well beyond the former map edge. The
  // same pixel must be sky with a shorter cutoff or with infinite mode off.
  t.context.configure({
    device: t.device,
    format: t.format,
    alphaMode: "opaque",
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  const read = t.device.createBuffer({
    size: 256,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  async function survey(far, infinite, position, fraction) {
    world.configure({
      renderDistance: far,
      infinite,
      trees: { enabled: false },
    });
    const stats = world.render(
      createCamera({
        position,
        forward: [0, -1, 0],
        up: [0, 0, -1],
        fov: Math.PI / 2,
        near: 1,
        far,
        height: t.canvas.height,
        aspect: t.canvas.width / t.canvas.height,
      }),
      { now: (now += 110) },
    );
    const encoder = t.device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      {
        texture: t.context.getCurrentTexture(),
        origin: [
          Math.floor(t.canvas.width * fraction),
          Math.floor(t.canvas.height / 2),
          0,
        ],
      },
      { buffer: read, bytesPerRow: 256 },
      [1, 1, 1],
    );
    t.device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const color = Array.from(new Uint8Array(read.getMappedRange()).slice(0, 3));
    read.unmap();
    return {
      color,
      patches: stats.horizonDrawn,
      bytes: stats.horizonBytes,
      atlas: stats.atlasBytes,
    };
  }
  try {
    const bounded = await survey(32000, false, [128.25, 12000, 96.25], 0.8);
    const clipped = await survey(14000, true, [128.25, 12000, 96.25], 0.8);
    const distant = await survey(32000, true, [128.25, 12000, 96.25], 0.8);
    assert(
      !bounded.patches && distant.patches > 0,
      "only infinite terrain adds a horizon",
    );
    assert(
      bounded.color.every((value, i) => value === clipped.color[i]),
      "the short cutoff clips the distant ground",
    );
    const difference = (a, b) =>
      a.color.reduce((sum, value, i) => sum + Math.abs(value - b.color[i]), 0);
    assert(
      difference(bounded, distant) > 50,
      "the GPU draws actual terrain about 13 km beyond the camera's horizontal position",
    );
    const shifted = [-98000, 32000, 61000];
    const mid = await survey(32000, true, shifted, 0.97);
    const far = await survey(64000, true, shifted, 0.97);
    assert(
      mid.color.every((value, i) => value === bounded.color[i]),
      "32 km still clips the farther pixel",
    );
    assert(
      difference(mid, far) > 50,
      "64 km draws ground over 50 km away horizontally after recentering",
    );
    assert(
      far.atlas === bounded.atlas && far.bytes <= 65536,
      "long range keeps the detail atlas unchanged and uses only a small instance buffer",
    );
    log(
      `PASS GPU pixels: 32 km reveals terrain ~13 km away horizontally; 64 km reveals terrain ~53 km away after recentering. ${far.patches} horizon patches, ${far.bytes / 1024} KiB of instance storage.`,
    );
  } finally {
    read.destroy();
  }
  const validation = await t.device.popErrorScope();
  assert(
    !validation && !t.errors.length,
    validation?.message || t.errors.join("\n"),
  );
  log("ALL TERRAIN RANGE CHECKS PASSED");
} catch (error) {
  log(`FAIL ${error.stack || error}`);
} finally {
  world?.dispose();
}
