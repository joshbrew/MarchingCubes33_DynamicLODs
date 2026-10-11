// Replace this path with "marching-cubes-bourke-mc33" in an installed project.
import {
  createTerrain,
  createSpace,
  createProgressiveTerrain,
  attachFlyControls,
  TerrainField,
  ProgressiveTerrainField,
  SpaceWorld,
} from "../dist/index.esm.js";

const $ = (id) => document.getElementById(id);
const choices = {
  terrain: [createTerrain, TerrainField, "Terrain & trees", 1800],
  progressive: [
    createProgressiveTerrain,
    ProgressiveTerrainField,
    "Fine noise tiles",
    2048,
  ],
  space: [createSpace, null, "Infinite space", 9000],
};
const requested = new URLSearchParams(location.search).get("world");
const kind = Object.hasOwn(choices, requested) ? requested : "terrain";
const [create, field, title, far] = choices[kind];
const canvas = $("world"),
  status = $("status");
const number = (n) => Math.round(n || 0).toLocaleString();
const ms = (n) => (Number.isFinite(n) ? `${n.toFixed(2)} ms` : "—");
const meters = (n) =>
  Math.abs(n) >= 1000
    ? `${(n / 1000).toFixed(2)} km`
    : Math.abs(n) < 1
      ? `${(n * 100).toFixed(2)} cm`
      : `${n.toFixed(1)} m`;
const mb = (n) => `${(n / 1024 ** 2).toFixed(1)} MB`;
const mean = (a) =>
  a.length ? a.reduce((sum, n) => sum + n, 0) / a.length : null;
const percentile = (a, p) =>
  a.length
    ? [...a].sort((a, b) => a - b)[
        Math.min(a.length - 1, Math.floor(a.length * p))
      ]
    : null;
const frames = [],
  submits = [],
  widgets = new Map();
let view,
  controls,
  camera,
  frame,
  last,
  lastHUD = 0,
  lastStats,
  benchmark;
let selectionMs = null,
  batchMs = null;

function range(
  parent,
  id,
  label,
  min,
  max,
  step,
  value,
  change,
  format = String,
  logarithmic = false,
) {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<div><label for="${id}">${label}</label><output id="${id}Value" for="${id}"></output></div><input id="${id}" type="range">`;
  $(parent).append(row);
  const input = $(id),
    output = $(`${id}Value`);
  input.min = logarithmic ? Math.log2(min) : min;
  input.max = logarithmic ? Math.log2(max) : max;
  input.step = logarithmic ? 0.01 : step;
  const set = (v) => {
    input.value = logarithmic ? Math.log2(v) : v;
    output.textContent = format(v);
    input.setAttribute("aria-valuetext", format(v));
  };
  widgets.set(id, set);
  input.addEventListener("input", () => {
    const v = logarithmic ? 2 ** Number(input.value) : Number(input.value);
    output.textContent = format(v);
    input.setAttribute("aria-valuetext", format(v));
    change(v);
  });
  set(value);
}
function check(parent, id, label, value, change) {
  const row = document.createElement("label");
  row.className = "check";
  row.innerHTML = `<input id="${id}" type="checkbox">${label}`;
  $(parent).append(row);
  $(id).checked = value;
  $(id).addEventListener("change", () => change($(id).checked));
}
function select(parent, id, label, options, value, change) {
  const row = document.createElement("div");
  row.className = "row";
  row.innerHTML = `<label for="${id}">${label}</label><select id="${id}"></select>`;
  $(parent).append(row);
  for (const [value, text] of options) $(id).add(new Option(text, value));
  $(id).value = value;
  $(id).addEventListener("change", () => change($(id).value));
}
function preset(label, action) {
  const button = document.createElement("button");
  button.textContent = label;
  button.onclick = () => {
    action();
    canvas.focus();
  };
  $("presets").append(button);
}
function moveTo(position, forward = [0, -0.25, -1]) {
  const saved = controls
    ? {
        speed: controls.speed,
        followGround: controls.followGround,
        clearance: controls.clearance,
      }
    : { speed: field ? 50 : 300, followGround: Boolean(field), clearance: 80 };
  controls?.dispose();
  camera.position = [...position];
  camera.forward = [...forward];
  if (field)
    saved.clearance = Math.max(
      0.25,
      position[1] - field.height(position[0], position[2]),
    );
  controls = attachFlyControls(canvas, camera, {
    ...saved,
    groundHeight: field?.height,
  });
  $("fly").textContent = "Start flythrough";
  widgets.get("height")?.(saved.clearance);
}
function startPosition() {
  return field
    ? [128.25, field.height(128.25, 96.25) + 80, 96.25]
    : [0, 180, 1500];
}
function configureUI() {
  const settings = view.settings;
  range(
    "simulation",
    "distance",
    "Render distance",
    256,
    65536,
    1,
    far,
    (v) => {
      camera.far = v;
      view.configure({ renderDistance: v });
    },
    meters,
    true,
  );
  if (kind !== "progressive") {
    select(
      "simulation",
      "algorithm",
      "Surface algorithm",
      [
        ["bourke", "Bourke"],
        ["mc33", "MC33"],
      ],
      settings.algorithm,
      (algorithm) => view.configure({ algorithm }),
    );
    select(
      "simulation",
      "sampling",
      "Sampling",
      [
        ["adaptive", "Adaptive LOD"],
        ["full", "Full detail"],
      ],
      settings.uniform ? "full" : "adaptive",
      (v) => view.configure({ uniform: v === "full" }),
    );
  }
  if (kind === "space") {
    select(
      "simulation",
      "mode",
      "Display",
      [
        ["mesh", "Mesh only"],
        ["hybrid", "Mesh + points"],
        ["points", "Points only"],
      ],
      settings.mode,
      (mode) => view.configure({ mode }),
    );
    range(
      "simulation",
      "quality",
      "Detail spacing",
      0.5,
      12,
      0.25,
      settings.quality,
      (quality) => view.configure({ quality }),
      (v) => `${v.toFixed(2)} px`,
    );
    range(
      "simulation",
      "lodDistance",
      "LOD distance",
      250,
      16000,
      1,
      settings.lodDistance,
      (lodDistance) => view.configure({ lodDistance }),
      meters,
      true,
    );
    range(
      "simulation",
      "nearRadius",
      "Near detail",
      0,
      2000,
      10,
      settings.nearRadius,
      (nearRadius) => view.configure({ nearRadius }),
      meters,
    );
    range(
      "simulation",
      "pointSize",
      "Point size",
      1,
      8,
      0.25,
      settings.pointSize,
      (pointSize) => view.configure({ pointSize }),
      (v) => `${v.toFixed(2)} px`,
    );
    check("simulation", "caves", "Island caves", settings.caves, (caves) =>
      view.configure({ caves }),
    );
    preset("Floating island", () => moveTo([420, 180, 500]));
    preset("Ringed planet", () => moveTo([-1300, 700, -300]));
    preset("Asteroid", () => moveTo([-230, 160, 900]));
  } else {
    range(
      "simulation",
      "pixelError",
      kind === "progressive" ? "Tile detail" : "Pixel error",
      0.5,
      12,
      0.25,
      settings.pixelError,
      (pixelError) => view.configure({ pixelError }),
      (v) => `${v.toFixed(2)} px`,
    );
    if (kind === "terrain") {
      range(
        "simulation",
        "nearRadius",
        "Player detail",
        0,
        1000,
        10,
        settings.nearRadius,
        (nearRadius) => view.configure({ nearRadius }),
        meters,
      );
      check(
        "simulation",
        "infinite",
        "Infinite terrain",
        settings.infinite,
        (infinite) => view.configure({ infinite }),
      );
      check(
        "simulation",
        "trees",
        "Instanced trees",
        settings.trees.enabled,
        (enabled) => view.configure({ trees: { enabled } }),
      );
      range(
        "simulation",
        "treeDistance",
        "Tree distance",
        100,
        8000,
        1,
        settings.trees.distance,
        (distance) => view.configure({ trees: { distance } }),
        meters,
        true,
      );
    } else {
      check(
        "simulation",
        "borders",
        "Tile edges",
        settings.tileBorders,
        (tileBorders) => view.configure({ tileBorders }),
      );
      preset("Near the ground", () => {
        controls.clearance = 0.75;
        controls.speed = 2;
        widgets.get("speed")(2);
        camera.position[1] =
          field.height(camera.position[0], camera.position[2]) + 0.75;
        widgets.get("height")(0.75);
      });
      preset("From above", () => {
        controls.clearance = 180;
        controls.speed = 50;
        widgets.get("speed")(50);
        camera.position[1] =
          field.height(camera.position[0], camera.position[2]) + 180;
        widgets.get("height")(180);
      });
    }
    check("simulation", "wire", "Wireframe", settings.wireframe, (wireframe) =>
      view.configure({ wireframe }),
    );
  }
  check("simulation", "colors", "LOD colors", settings.lodColors, (lodColors) =>
    view.configure({ lodColors }),
  );
  range(
    "movement",
    "speed",
    "Fly speed",
    0.25,
    4000,
    1,
    controls.speed,
    (v) => (controls.speed = v),
    (v) => `${v.toFixed(1)} m/s`,
    true,
  );
  range(
    "movement",
    "fov",
    "Field of view",
    30,
    110,
    1,
    60,
    (v) => (camera.fov = (v * Math.PI) / 180),
    (v) => `${Math.round(v)}°`,
  );
  if (field) {
    range(
      "movement",
      "height",
      "Height above ground",
      0.25,
      2048,
      1,
      80,
      (v) => {
        controls.clearance = v;
        camera.position[1] =
          field.height(camera.position[0], camera.position[2]) + v;
      },
      meters,
      true,
    );
    check("movement", "follow", "Follow ground", controls.followGround, (v) => {
      controls.followGround = v;
      if (v)
        controls.clearance = Math.max(
          0.25,
          camera.position[1] -
            field.height(camera.position[0], camera.position[2]),
        );
    });
  }
  $("fly").onclick = () => {
    controls.fly = !controls.fly;
    $("fly").textContent = controls.fly
      ? "Stop flythrough"
      : "Start flythrough";
    canvas.focus();
  };
  $("reset").onclick = () => {
    moveTo(startPosition());
    canvas.focus();
  };
  $("parameters").disabled = false;
  $("compare").hidden = kind === "progressive";
  $("compare").disabled = false;
  $("compare").onclick = () =>
    benchmark ? finishBenchmark("Comparison cancelled.") : beginBenchmark();
  $("save").disabled = false;
  $("save").onclick = saveStats;
}
function totalTriangles(stats) {
  return (stats.triangles || 0) + (stats.vegetation?.triangles || 0);
}
function performanceData() {
  return {
    fps: frames.length && !document.hidden ? 1000 / mean(frames) : null,
    frameMs: mean(frames),
    frameP95Ms: percentile(frames, 0.95),
    cpuSubmitMs: mean(submits),
    gpuDrawMs: lastStats?.gpuMs ?? null,
    selectionMs,
    batchMs,
  };
}
function updateHUD(now, stats) {
  if (now - lastHUD < 250) return;
  lastHUD = now;
  const perf = performanceData(),
    renderer = view.renderer;
  $("fps").textContent = document.hidden
    ? "Background"
    : perf.fps === null
      ? "—"
      : Math.round(perf.fps);
  $("frameTime").textContent =
    perf.frameMs === null
      ? "—"
      : `${perf.frameMs.toFixed(1)} / ${perf.frameP95Ms.toFixed(1)}`;
  $("cpuTime").textContent = ms(perf.cpuSubmitMs);
  $("gpuTime").textContent = ms(stats.gpuMs);
  $("triangles").textContent = number(totalTriangles(stats));
  $("drawCalls").textContent = number(
    (stats.drawCalls || 0) + (stats.vegetation?.draws || 0),
  );
  const rows = [
    ["Last visibility / batch", `${ms(selectionMs)} / ${ms(batchMs)}`],
    ["Generation GPU", ms(stats.generationGpuMs)],
    [
      "Generated / evicted",
      `${number(stats.generated)} / ${number(stats.evicted)}`,
    ],
  ];
  if (kind === "space")
    rows.push(
      [
        "Meshes / point clouds",
        `${number(stats.meshes)} / ${number(stats.clouds)}`,
      ],
      ["Point samples", number(stats.points)],
      [
        "Geometry cache",
        `${mb(stats.geometryBytes)} / ${renderer.options.geometryMB} MB`,
      ],
      [
        "Sectors active / cached",
        `${number(stats.sectors)} / ${number(stats.cachedChunks)}`,
      ],
      [
        "Jobs / refining bodies",
        `${number(stats.pending)} / ${number(stats.waiting)}`,
      ],
      ["Last worker job", ms(stats.workerMs)],
      ["Bundle builds", number(stats.batchBuilds)],
    );
  else
    rows.push(
      [
        "Tiles drawn / resident",
        `${number(stats.drawn)} / ${number(stats.resident)}`,
      ],
      [
        "Atlas slots / memory",
        `${renderer.capacity} / ${mb(stats.atlasBytes)}`,
      ],
      [
        "Built / pending",
        `${number(stats.builtThisFrame)} / ${number(stats.pending)}`,
      ],
      ["Stitched tiles", number(stats.seams)],
      ...(kind === "progressive"
        ? [
            [
              "Finest mesh spacing",
              Number.isFinite(stats.finest) ? meters(stats.finest) : "—",
            ],
            ["Bundle builds", number(stats.bundleBuilds)],
          ]
        : [
            ["Terrain triangles", number(stats.triangles)],
            [
              "Trees / tree triangles",
              `${number(stats.vegetation?.trees)} / ${number(stats.vegetation?.triangles)}`,
            ],
            [
              "Tree LOD 0 / 1 / 2",
              (stats.vegetation?.lods || [0, 0, 0]).map(number).join(" / "),
            ],
            [
              "Samples / full grid",
              `${number(stats.activeSamples)} / ${number(stats.uniformSamples)}`,
            ],
            ["Offscreen prefetch tiles", number(stats.prefetched)],
          ]),
    );
  $("worldStats").replaceChildren(
    ...rows.flatMap(([name, value]) => {
      const dt = document.createElement("dt"),
        dd = document.createElement("dd");
      dt.textContent = name;
      dd.textContent = value;
      return [dt, dd];
    }),
  );
  const palette =
    kind === "space"
      ? [...SpaceWorld.meshColors, ...SpaceWorld.pointColors]
      : [
          "#ff4d30",
          "#ffa52e",
          "#ebd948",
          "#43b879",
          "#288fff",
          "#36cbd9",
          "#8276ff",
          "#bd70e8",
        ];
  $("histogram").replaceChildren(
    ...(stats.histogram || []).map((count, level) => {
      const bar = document.createElement("div");
      bar.style.background = palette[level % palette.length];
      bar.style.flex = String(count);
      bar.hidden = !count;
      bar.title = `LOD ${level}: ${number(count)}`;
      return bar;
    }),
  );
  const counts = stats.histogram || [];
  $("lodCounts").textContent =
    kind === "space"
      ? `Mesh LOD 0–7: ${counts.slice(0, 8).map(number).join(" / ")}${stats.clouds ? ` · Point tiers: ${counts.slice(8).map(number).join(" / ")}` : ""}`
      : `LOD 0–${Math.max(0, counts.length - 1)}: ${counts.map(number).join(" / ")}`;
  $("coords").textContent =
    `Position x ${meters(camera.position[0])} · y ${meters(camera.position[1])} · z ${meters(camera.position[2])} · ${canvas.width} × ${canvas.height} pixels`;
  if (field)
    widgets.get("height")(
      Math.max(
        0.25,
        camera.position[1] -
          field.height(camera.position[0], camera.position[2]),
      ),
    );
  const limited =
    stats.capacityLimited ||
    stats.limited ||
    stats.sectorLimited ||
    stats.instanceLimited ||
    stats.pointLimited;
  const error = view.errors.at(-1);
  status.textContent =
    error ||
    `${stats.pending || stats.waiting ? "Refining detail…" : "Cache ready"}${limited ? " · view budget reached" : ""}`;
  status.classList.toggle("error", Boolean(error));
  Object.assign(status.dataset, {
    pending: stats.pending || 0,
    errors: view.errors.length,
    drawn: stats.drawn || 0,
    kind,
  });
}
function beginBenchmark() {
  if (document.hidden) {
    $("comparison").textContent = "Select this tab to measure frame timing.";
    return;
  }
  benchmark = {
    savedUniform: view.settings.uniform,
    savedFly: controls.fly,
    phase: "adaptive",
    start: performance.now(),
    samples: [],
    stable: 0,
    results: [],
    width: canvas.width,
    height: canvas.height,
  };
  controls.enabled = false;
  $("parameters").disabled = true;
  $("compare").textContent = "Cancel comparison";
  view.configure({ uniform: false });
  $("sampling").value = "adaptive";
  $("comparison").textContent = "Adaptive LOD: warming the current view…";
}
function advanceBenchmark(now, elapsed, stats) {
  const b = benchmark;
  if (!b) return;
  if (now - b.start > 30000)
    return finishBenchmark(
      "Comparison timed out while detail was loading. Try a shorter distance.",
    );
  if (canvas.width !== b.width || canvas.height !== b.height)
    return finishBenchmark("View size changed; comparison cancelled.");
  if (stats.pending || stats.waiting) {
    b.stable = 0;
    return;
  }
  if (++b.stable < 10) return;
  b.samples.push({
    frame: elapsed,
    cpu: stats.cpuMs,
    gpu: stats.gpuMs,
    triangles: totalTriangles(stats),
    points: stats.points || 0,
  });
  $("comparison").textContent =
    `${b.phase === "adaptive" ? "Adaptive LOD" : "Full detail"}: sampling ${b.samples.length}/40 frames…`;
  if (b.samples.length < 40) return;
  b.results.push({
    mode: b.phase,
    triangles: b.samples.at(-1).triangles,
    points: b.samples.at(-1).points,
    frame: mean(b.samples.map((s) => s.frame)),
    cpu: mean(b.samples.map((s) => s.cpu)),
    gpu: mean(b.samples.map((s) => s.gpu).filter(Number.isFinite)),
  });
  if (b.phase === "adaptive") {
    b.phase = "full";
    b.samples = [];
    b.stable = 0;
    b.start = now;
    view.configure({ uniform: true });
    $("sampling").value = "full";
    $("comparison").textContent = "Full detail: warming the same view…";
  } else {
    const [adaptive, full] = b.results;
    const reduction = full.triangles
      ? 100 * (1 - adaptive.triangles / full.triangles)
      : 0;
    finishBenchmark(
      `Same camera · ${canvas.width} × ${canvas.height}\nAdaptive: ${number(adaptive.triangles)} triangles\nFull detail: ${number(full.triangles)} triangles\n${full.triangles ? `${reduction.toFixed(1)}% fewer triangles\n` : ""}${adaptive.points || full.points ? `Points: ${number(adaptive.points)} / ${number(full.points)}\n` : ""}Frame avg: ${ms(adaptive.frame)} / ${ms(full.frame)}\nCPU avg: ${ms(adaptive.cpu)} / ${ms(full.cpu)}\nGPU draw: ${ms(adaptive.gpu)} / ${ms(full.gpu)}\nAdaptive / full · trees included when enabled\nView budgets still apply`,
    );
  }
}
function finishBenchmark(message) {
  if (!benchmark) return;
  view.configure({ uniform: benchmark.savedUniform });
  $("sampling").value = benchmark.savedUniform ? "full" : "adaptive";
  controls.enabled = true;
  controls.fly = benchmark.savedFly;
  benchmark = null;
  $("parameters").disabled = false;
  $("compare").textContent = "Compare LOD";
  $("comparison").textContent = message;
}
function saveStats() {
  const record = {
    capturedAt: new Date().toISOString(),
    world: kind,
    settings: view.settings,
    camera: {
      position: [...camera.position],
      forward: [...camera.forward],
      fov: camera.fov,
      far: camera.far,
    },
    resolution: [canvas.width, canvas.height],
    performance: performanceData(),
    renderer: lastStats,
    comparison: $("comparison").textContent,
    backgroundTab: document.hidden,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `marching-cubes-${kind}-stats.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function cleanup() {
  cancelAnimationFrame(frame);
  controls?.dispose();
  view?.dispose();
}
try {
  view = await create(canvas, {
    settings: {
      renderDistance: far,
      ...(kind === "terrain"
        ? { infinite: true, trees: { enabled: true } }
        : {}),
    },
  });
  camera = {
    position: startPosition(),
    forward: [0, -0.25, -1],
    fov: Math.PI / 3,
    far,
  };
  moveTo(camera.position);
  $("title").textContent = title;
  document
    .querySelector(`nav a[href="?world=${kind}"]`)
    .setAttribute("aria-current", "page");
  configureUI();
  function animate(now) {
    const firstFrame = last === undefined;
    const elapsed = last === undefined ? 16.67 : Math.max(0, now - last);
    last = now;
    try {
      controls.update(elapsed / 1000);
      const stats = (lastStats = view.render(camera, { now }));
      if (!document.hidden && !firstFrame && elapsed > 0) {
        frames.push(elapsed);
        if (frames.length > 120) frames.shift();
      }
      submits.push(stats.cpuMs);
      if (submits.length > 120) submits.shift();
      if (stats.selectionMs > 0) selectionMs = stats.selectionMs;
      if ((stats.batchMs ?? stats.drawPlanMs) > 0)
        batchMs = stats.batchMs ?? stats.drawPlanMs;
      advanceBenchmark(now, elapsed, stats);
      updateHUD(now, stats);
      frame = requestAnimationFrame(animate);
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
      cleanup();
      console.error(error);
    }
  }
  frame = requestAnimationFrame(animate);
} catch (error) {
  status.textContent = error.message;
  status.classList.add("error");
  cleanup();
  console.error(error);
}
document.addEventListener("visibilitychange", () => {
  last = undefined;
  frames.length = 0;
  lastHUD = 0;
  if (document.hidden && benchmark)
    finishBenchmark(
      "Comparison cancelled because the tab was hidden. Keep it selected for timing.",
    );
});
window.addEventListener("pagehide", cleanup, { once: true });
