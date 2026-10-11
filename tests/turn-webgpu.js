import {
  createTerrain,
  createSpace,
  createCamera,
  TerrainLOD,
  SpaceWorld,
} from "../dist/index.esm.js";

const output = document.querySelector("#results"),
  lines = [];
const log = (line) => {
  lines.push(line);
  output.textContent = lines.join("\n");
};
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
let terrain, space;
try {
  terrain = await createTerrain(document.querySelector("#terrain"), {
    worldSize: 4096,
    maxDivs: 32,
    memoryMB: 8,
    settings: {
      renderDistance: 1600,
      trees: { enabled: true, distance: 1200 },
    },
  });
  const t = terrain.renderer,
    position = [0, 150, 0];
  let now = 0;
  const camera = (yaw, at = position, far = 1600) =>
    createCamera({
      position: at,
      forward: [Math.sin(yaw), -0.2, -Math.cos(yaw)],
      height: 400,
      aspect: 1.6,
      far,
    });
  t.device.pushErrorScope("validation");
  for (let i = 0; i < 140; i++) {
    terrain.render(camera(0), { now: (now += 16) });
    await t.device.queue.onSubmittedWorkDone();
  }
  assert(
    t.stats.pending === 0,
    "terrain warms within its bounded build budget",
  );
  const ready = new Set(
    [...t.entries].filter(([, e]) => e.ready).map(([id]) => id),
  );
  const readyTrees = new Set(t.vegetation.cache.keys());
  const selectedAt = t.lastSelect;
  terrain.render(camera(Math.PI), { now: (now += 16) });
  assert(
    t.lastSelect > selectedAt,
    "180 degree terrain turn updates before the 100 ms interval",
  );
  const near = t.visibleIds.filter(
    (id) => TerrainLOD.distanceTo(t.tiles[id], position) < 400,
  );
  assert(
    near.length > 0 && near.every((id) => ready.has(id)),
    "newly revealed nearby terrain was already resident",
  );
  const treeTiles = near.map((id) => t.tiles[id]);
  assert(
    treeTiles.every((tile) =>
      readyTrees.has(`${t.seed}:${tile.ox}:${tile.oz}`),
    ),
    "nearby tree placements were cached before the turn",
  );
  assert(
    t.entries.size <= t.capacity && t.vegetation.cache.size <= 512,
    "terrain and tree caches remain bounded",
  );
  const terrainError = await t.device.popErrorScope();
  assert(
    !terrainError && !t.errors.length,
    terrainError?.message || t.errors.join("\n"),
  );
  log(
    `PASS 180° terrain turn: ${near.length} newly facing nearby patches already resident; trees cached; fixed ${t.capacity}-patch atlas`,
  );
  terrain.dispose();

  space = await createSpace(document.querySelector("#space"), {
    maxInstances: 4000,
    maxChunks: 512,
    geometryMB: 16,
    settings: { renderDistance: 9000 },
  });
  const s = space.renderer;
  s.device.pushErrorScope("validation");
  const allCoarse = () =>
    [0, 1, 2].every((kind) =>
      [0, 1, 2, 3].every((variant) =>
        s.cache.has(s.key({ kind, variant }, SpaceWorld.meshLevels - 1)),
      ),
    );
  for (let i = 0; i < 500; i++) {
    space.render(camera(0, [0, 180, 1500], 9000), { now: (now += 16) });
    await s.device.queue.onSubmittedWorkDone();
    if (allCoarse() && i > 5) break;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert(
    allCoarse(),
    "all twelve connected fallback shapes warm before expensive detail",
  );
  const times = [],
    selections = [];
  let peakTriangles = 0,
    minDrawn = Infinity;
  for (let turn = 0; turn < 24; turn++) {
    const before = s.lastSelect;
    const stats = space.render(
      camera((turn * Math.PI) / 12, [0, 180, 1500], 9000),
      { now: (now += 16) },
    );
    assert(
      stats.drawn === s.visible.length,
      "no visible body is omitted while finer geometry loads",
    );
    if (turn)
      assert(
        s.lastSelect > before,
        "large turns refresh visibility immediately",
      );
    assert(
      stats.geometryBytes <= s.options.geometryMB * 1024 ** 2,
      "geometry budget remains bounded",
    );
    times.push(stats.cpuMs);
    selections.push(stats.selectionMs);
    peakTriangles = Math.max(peakTriangles, stats.triangles);
    minDrawn = Math.min(minDrawn, stats.drawn);
    await s.device.queue.onSubmittedWorkDone();
  }
  times.sort((a, b) => a - b);
  const error = await s.device.popErrorScope();
  assert(!error && !s.errors.length, error?.message || s.errors.join("\n"));
  log(
    `PASS 24 space headings: zero omitted bodies during refinement; at least ${minDrawn} drawn per heading; peak ${peakTriangles.toLocaleString()} triangles`,
  );
  log(
    `PROFILE space turn CPU submit p95 ${times[Math.floor(times.length * 0.95)].toFixed(2)} ms; max ${times.at(-1).toFixed(2)} ms (scripted submissions, not FPS)`,
  );
  log("PASS no WebGPU validation errors; default memory budgets preserved");
  log("All turn streaming checks passed.");
} catch (error) {
  log(`FAIL ${error.stack || error.message}`);
} finally {
  terrain?.dispose();
  space?.dispose();
}
