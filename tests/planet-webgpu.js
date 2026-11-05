import {
  createCamera,
  createPlanet,
  bakeStudioPlanetNoise,
  PlanetField,
  PlanetPresets,
} from "../dist/index.esm.js";

const canvas = document.querySelector("#planet");
const output = document.querySelector("#results");
const log = (line) => {
  output.textContent += `\n${line}`;
};
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const { radius, unit, cross } = PlanetField;
let planet, readback;
try {
  planet = await createPlanet(canvas, { format: "rgba8unorm", pixelRatio: 1 });
  const { device, context } = planet;
  const map = planet.studioMap;
  assert(
    map.side === 1001 && map.min < -1 && map.max > 2,
    "Planet Studio's noise stack produces relief",
  );
  for (let row = 0; row < map.side; row++) {
    const first = row * map.side;
    assert(
      map.values[first] === map.values[first + map.side - 1],
      "sphere bake closes the longitude seam",
    );
  }
  log("PASS Planet Studio noise bake has relief and a closed longitude seam");
  const erosionOptions = {
    seed: planet.studioSeed,
    segments: 128,
    erosion: true,
  };
  const geologies = [];
  for (const geology of ["alpine", "mesa", "volcanic"])
    geologies.push(
      await bakeStudioPlanetNoise(device, { ...erosionOptions, geology }),
    );
  for (let i = 0; i < geologies.length; i++) {
    const { side, values } = geologies[i];
    for (let row = 0; row < side; row++)
      assert(
        values[row * side] === values[(row + 1) * side - 1],
        "geology closes the longitude seam",
      );
    for (const previous of geologies.slice(0, i)) {
      const difference = values.reduce(
        (sum, value, at) => sum + Math.abs(value - previous.values[at]),
        0,
      );
      assert(
        difference / values.length > 0.015,
        "geology changes the shape with the same seed",
      );
    }
  }
  log("PASS alpine, mesa, and volcanic bakes produce distinct seamless relief");
  context.configure({
    device,
    format: planet.format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
  });
  device.pushErrorScope("validation");
  readback = device.createBuffer({
    size: 512,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  async function pixels() {
    const encoder = device.createCommandEncoder();
    const texture = context.getCurrentTexture();
    for (const [i, origin] of [
      [0, [0, 0]],
      [1, [canvas.width >> 1, canvas.height >> 1]],
    ]) {
      encoder.copyTextureToBuffer(
        { texture, origin },
        { buffer: readback, offset: i * 256 },
        [1, 1, 1],
      );
    }
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const data = new Uint8Array(readback.getMappedRange());
    const result = [
      Array.from(data.slice(0, 3)),
      Array.from(data.slice(256, 259)),
    ];
    readback.unmap();
    return result;
  }
  function view(dir, clearance, yaw, pitch) {
    const east = unit(cross([0, 1, 0], dir));
    const north = cross(dir, east);
    const forward = dir.map(
      (v, i) =>
        v * Math.sin(pitch) +
        (east[i] * Math.sin(yaw) + north[i] * Math.cos(yaw)) * Math.cos(pitch),
    );
    const right = east.map(
      (v, i) => v * Math.cos(yaw) - north[i] * Math.sin(yaw),
    );
    return {
      ...createCamera({
        position: dir.map(
          (v) => v * (radius + planet.sampleSurface(dir).height + clearance),
        ),
        forward,
        up: cross(right, forward),
        near: Math.max(0.12, clearance * 0.08),
        far: 2 * radius + clearance + 12000,
        height: canvas.height,
        aspect: canvas.width / canvas.height,
      }),
      clearance,
    };
  }
  const orbit = view(unit([0.67, 0.32, 0.67]), radius * 2.15, 0, -Math.PI / 2);
  const orbitStats = { ...planet.render(orbit, 0) };
  const [sky, globe] = await pixels();
  assert(
    Math.max(...sky) < 60 && Math.max(...globe) > 80,
    "lit globe inside dark sky",
  );
  assert(
    orbitStats.triangles < 70000,
    "orbit stays within its coarse triangle budget",
  );
  log(`PASS orbit renders ${orbitStats.triangles} triangles`);
  const surfaceView = view(
    unit([0.3827867676, 0.793019669, 0.4739135946]),
    3,
    -2.87883,
    -Math.PI / 2,
  );
  const near = { ...planet.render(surfaceView, 110) };
  const [, ground] = await pixels();
  assert(Math.max(...ground) > 60, "near view renders the terrain");
  assert(
    near.finest <= 2 && near.grades >= 5,
    "refines to 2 m with several visible grades",
  );
  assert(
    near.leaves <= 576 && near.instanceBytes === 18432,
    "bounded tile plan and storage",
  );
  assert(near.drawCalls <= 17, "terrain draws stay grouped");
  const bundle = planet.bundle;
  planet.render(surfaceView, 220);
  assert(planet.bundle === bundle, "static camera reuses the draw bundle");
  const orbitColors = new Set();
  planet.render(orbit, 330);
  const orbitBundle = planet.bundle;
  const originalSeed = planet.studioSeed;
  assert(planet.oceanLevel === null, "the default test seed is dry");
  for (const { id } of PlanetPresets) {
    await planet.configure({ preset: id, studioSeed: originalSeed });
    planet.render(orbit, 440);
    const [, color] = await pixels();
    orbitColors.add(color.join(","));
    assert(
      planet.bundle === orbitBundle,
      `${id} changed the orbit draw bundle`,
    );
  }
  assert(
    orbitColors.size >= 14,
    "the planet presets produce distinct orbital colors",
  );
  log(
    "PASS every palette renders with a fixed seed and reuses the draw bundle",
  );
  const sampleDirection = unit([0.67, 0.32, 0.67]);
  const probes = [sampleDirection, [1, 0, 0], [0, 1, 0], [0, 0, 1], [-1, 0, 0]];
  const elevations = () =>
    probes.map((dir) => planet.sampleSurface(dir).height);
  const changed = (before) =>
    elevations().some((height, i) => Math.abs(height - before[i]) > 100);
  const original = elevations();
  await planet.configure({ preset: "volcanic" });
  const selectedSeed = planet.studioSeed;
  assert(
    selectedSeed !== originalSeed && changed(original),
    "switching presets generates new terrain by default",
  );
  assert(
    planet.geology === "volcanic",
    "volcanic presets bake volcanic terrain",
  );
  for (const seed of [411305, 227429]) {
    const before = elevations();
    await planet.configure({ studioSeed: seed });
    assert(
      planet.studioSeed === seed && changed(before),
      "changing the seed regenerates elevations on the same preset",
    );
    const camera = view(unit([0.67, 0.32, 0.67]), 3, 0, -Math.PI / 2);
    const close = planet.render(camera, 550 + seed);
    const [, color] = await pixels();
    assert(
      close.finest === 2 && close.leaves <= 576,
      `${seed} refines to 2 m within budget`,
    );
    assert(
      Math.max(...color) > 45,
      `${seed} has visible terrain under the camera`,
    );
  }
  assert(planet.oceanLevel !== null, "the ocean test seed is wet");
  const waterDir = probes.find(
    (dir) => Math.abs(dir[1]) < 0.98 && planet.sampleSurface(dir).depth > 50,
  );
  assert(waterDir, "the wet seed has submerged terrain");
  assert(
    planet.sampleSurface(waterDir).height === planet.oceanLevel,
    "the water surface is at sea level",
  );
  planet.render(view(waterDir, 3, 0, -Math.PI / 2), 400000);
  const [, ocean] = await pixels();
  assert(ocean[2] > ocean[0] + 20, "the GPU draws water over submerged ground");
  log("PASS seed-based ocean draws above submerged terrain");
  const superseded = planet.configure({ studioSeed: 72671 });
  await Promise.resolve();
  await Promise.all([
    superseded,
    planet.configure({ preset: "lakeshore", studioSeed: originalSeed }),
  ]);
  assert(
    planet.studioSeed === originalSeed &&
      elevations().every((height, i) => height === original[i]),
    "the same seed restores the original terrain",
  );
  log(
    "PASS preset changes and reseeding generate distinct terrain with repeatable elevations",
  );
  await device.queue.onSubmittedWorkDone();
  const error = await device.popErrorScope();
  assert(
    !error && !planet.errors.length,
    error?.message || planet.errors.join("\n"),
  );
  log(
    `PASS surface renders ${near.triangles} triangles at ${near.finest} m spacing`,
  );
  log("ALL PLANET GPU CHECKS PASSED");
  document.body.dataset.result = "pass";
} catch (error) {
  log(`FAIL ${error.stack || error}`);
  document.body.dataset.result = "fail";
} finally {
  readback?.destroy();
  planet?.dispose();
}
