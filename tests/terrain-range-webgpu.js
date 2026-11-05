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
