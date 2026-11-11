import {
  createCamera,
  createPlanet,
  bakeStudioPlanetNoise,
  PlanetField,
  PlanetPresets,
} from "../dist/index.esm.js";
import { getPreset } from "../src/planet/presets.js";
import { sunDirection } from "../src/planet/lighting.js";
import { findLanding } from "../src/planet/demo.js";
import canyonBedsWGSL from "../src/noise/canyon-beds.wgsl";
import volcanicReliefWGSL from "../src/noise/volcanic-relief.wgsl";

const canvas = document.querySelector("#planet");
const output = document.querySelector("#results");
const log = (line) => {
  output.textContent += `\n${line}`;
};
const assert = (ok, message) => {
  if (!ok) throw new Error(message);
};
const { radius, unit, cross } = PlanetField;
async function checkRockBeds(device) {
  const samplesPerColumn = 512, columns = 4;
  const size = samplesPerColumn * columns * 48;
  const data = device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  const read = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
  try {
    const module = device.createShaderModule({ code: canyonBedsWGSL + volcanicReliefWGSL + `
      @group(0) @binding(0) var<storage,read_write> samples:array<vec4<f32>>;
      @compute @workgroup_size(64) fn probe(@builtin(global_invocation_id) id:vec3<u32>){
        let height=-1.25+f32(id.x)*.008;
        let sites=array<vec3<f32>,2>(vec3<f32>(1.0,.27,-.41),vec3<f32>(.13,-.8,.61));
        let seed=select(227429u,4157756612u,id.y>=2u);
        let direction=normalize(sites[id.y%2u]);
        let bed=canyon_bed(direction,height,seed);
        let lava=basalt_flow(direction,height,seed);
        let bends=array<vec2<f32>,4>(vec2<f32>(0,.15),vec2<f32>(.15,0),vec2<f32>(0,-.15),vec2<f32>(0,.15));
        let wear=canyon_gully_wear(vec2<f32>(18,0),bends[id.y],.42,select(.18,0.0,id.y==3u));
        let at=3u*(id.y*${samplesPerColumn}u+id.x);
        samples[at]=vec4<f32>(height+bed.displacement,bed.thickness,bed.lowerShelf,wear);
        samples[at+1u]=vec4<f32>(height+lava.displacement,lava.thickness,lava.cap,lava.ash);
        let distance=f32(id.x)*.00054;
        var collapse=0.0;
        for(var i=-3;i<=3;i++){
          collapse=min(collapse,lava_tube_collapse(vec2<f32>(distance,.004*f32(i)),.047,.23,seed,.006));
        }
        samples[at+2u]=vec4<f32>(volcanic_vent(vec2<f32>(distance*5.5,0),vec3<f32>(.8,.5,.3),0),
          collapse,select(lava_tube_collapse(vec2<f32>(distance,.07),.047,.23,seed,.006),
            volcanic_caldera(vec2<f32>(distance*5.5,0),vec3<f32>(.6,.5,.3),0),id.y==1u),
          lava_tube_collapse(vec2<f32>(distance,0),.047,.23,seed,.033));
      }
    ` });
    const pipeline = await device.createComputePipelineAsync({ layout: "auto", compute: { module, entryPoint: "probe" } });
    const group = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: data } }],
    });
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginComputePass();
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(samplesPerColumn / 64, columns);
    pass.end();
    encoder.copyBufferToBuffer(data, 0, read, 0, size);
    device.queue.submit([encoder.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const values = new Float32Array(read.getMappedRange());
    const shelfStrength = [];
    let darkCap = 0, softAsh = 0;
    for (let column = 0; column < columns; column++) {
      const thickness = [], lavaThickness = [];
      let previous = -Infinity, previousLava = -Infinity, shelf = 0;
      for (let row = 0; row < samplesPerColumn; row++) {
        const i = (column * samplesPerColumn + row) * 12;
        assert(Number.isFinite(values[i]) && values[i] >= previous,
          "canyon contacts do not reverse the height profile");
        assert(Number.isFinite(values[i + 4]) && values[i + 4] >= previousLava,
          "lava flow contacts do not reverse the height profile");
        previous = values[i];
        previousLava = values[i + 4];
        thickness.push(values[i + 1]);
        lavaThickness.push(values[i + 5]);
        shelf = Math.max(shelf, values[i + 2]);
        if (values[i + 7] < 0.1) darkCap = Math.max(darkCap, values[i + 6]);
        if (values[i + 6] < 0.1) softAsh = Math.max(softAsh, values[i + 7]);
      }
      assert(Math.max(...thickness) > 1.45 * Math.min(...thickness),
        "adjacent beds have distinct thicknesses");
      assert(Math.max(...lavaThickness) > 1.45 * Math.min(...lavaThickness),
        "lava layers vary in thickness through the same rock face");
      shelfStrength.push(shelf);
    }
    assert(Math.max(...shelfStrength) > 0.3 && Math.max(...shelfStrength) - Math.min(...shelfStrength) > 0.2,
      "secondary ledges pinch out across sites and seeds");
    const wear = Array.from({ length: columns }, (_, column) => values[column * samplesPerColumn * 12 + 3]);
    assert(wear[0] > 0.9 && wear.slice(1).every((value) => value === 0),
      "runoff recesses a concave cross-slope gully while preserving spurs and intact steps");
    assert(darkCap > 0.8 && softAsh > 0.7, "hard lava caps and softer ash ramps occupy separate bands");
    let previousPit = false, pitCount = 0, seedDifferences = 0;
    for (let row = 0; row < samplesPerColumn; row++) {
      const i = row * 12 + 8;
      const pit = values[i + 1] < -0.025;
      if (pit && !previousPit) pitCount++;
      previousPit = pit;
      if (Math.abs(values[i + 1] - values[i + 1 + 2 * samplesPerColumn * 12]) > .04) seedDifferences++;
      assert(values[i + 2] === 0 && values[i + 3] === 0,
        "collapse stays on the flow and drops out below atlas resolution");
    }
    assert(values[112 * 12 + 8] > values[8] + .32 && values[511 * 12 + 8] === 0,
      "a cinder cone has a raised rim above its summit crater and blends back into its base");
    const caldera = (row) => values[(samplesPerColumn + row) * 12 + 10];
    assert(caldera(0) < -.3 && caldera(322) > .28 && caldera(511) === 0,
      "a caldera cuts below the surrounding terrain and raises a rim that blends into it");
    assert(pitCount >= 2 && seedDifferences > 12, "lava tubes collapse into separate, seeded pits");
  } finally {
    data.destroy();
    read.destroy();
  }
}
let planet, readback;
async function checkOceanShadows(planet) {
  const { device, sunBake } = planet;
  const side = 129, width = 128, height = 64, bytesPerRow = width * 4;
  const seabed = Float32Array.from({ length: side ** 2 }, (_, i) =>
    -0.92 + 0.42 * Math.cos((i % side) * Math.PI / 64) * Math.sin(Math.floor(i / side) * Math.PI / 128),
  );
  const atlas = device.createBuffer({ size: seabed.byteLength, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  const sea = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
  const texture = device.createTexture({ size: [width, height], format: "rgba8unorm",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.COPY_SRC });
  const output = device.createBuffer({ size: bytesPerRow * height, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  try {
    device.queue.writeBuffer(atlas, 0, seabed);
    const group = device.createBindGroup({
      layout: sunBake.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: texture.createView() },
        { binding: 1, resource: { buffer: sea } },
        { binding: 3, resource: { buffer: atlas } },
      ],
    });
    async function minimumVisibility(wet) {
      device.queue.writeBuffer(sea, 0, new Float32Array([0, Number(wet), 1, 0, ...sunDirection(0), 0]));
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginComputePass();
      pass.setPipeline(sunBake);
      pass.setBindGroup(0, group);
      pass.dispatchWorkgroups(width / 8, height / 8);
      pass.end();
      encoder.copyTextureToBuffer({ texture }, { buffer: output, bytesPerRow }, [width, height, 1]);
      device.queue.submit([encoder.finish()]);
      await output.mapAsync(GPUMapMode.READ);
      const colors = new Uint8Array(output.getMappedRange());
      let minimum = 255;
      for (let i = 0; i < colors.length; i += 4) minimum = Math.min(minimum, colors[i]);
      output.unmap();
      return minimum;
    }
    assert(await minimumVisibility(true) === 255, "submerged rock cannot shadow open ocean");
    assert(await minimumVisibility(false) < 250, "exposed terrain still casts shadows");
  } finally {
    atlas.destroy();
    sea.destroy();
    texture.destroy();
    output.destroy();
  }
}
try {
  planet = await createPlanet(canvas, { format: "rgba8unorm", pixelRatio: 1 });
  const { device, context } = planet;
  await checkRockBeds(device);
  log("PASS canyon beds vary in thickness and runoff recesses shelves inside gullies");
  log("PASS basalt caps alternate with softer ash beds without reversing the height profile");
  log("PASS cinder cones have summit craters and lava tubes collapse into seeded pit chains");
  await checkOceanShadows(planet);
  log("PASS open ocean has no seabed shadows at the terminator");
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
  const regionalCoverage = { alpine: 0, canyon: 0, granite: 0, volcanic: 0 };
  for (let row = 0; row < map.regions.side; row++) {
    const first = row * map.regions.side;
    assert(map.regions.values[first] === map.regions.values[first + map.regions.side - 1],
      "regional rock map closes the longitude seam");
  }
  for (let i = 0; i < 512; i++) {
    const y = (i + 0.5) / 256 - 1;
    const a = i * Math.PI * (3 - Math.sqrt(5));
    const r = Math.sqrt(1 - y * y);
    const weights = planet.sampleLandforms([r * Math.cos(a), y, r * Math.sin(a)]);
    const entries = Object.entries(weights);
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    assert(Math.abs(total - 1) < 1e-5, "province weights sum to one");
    const [province] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
    regionalCoverage[province]++;
  }
  assert(Object.values(regionalCoverage).every((area) => area > 15),
    "one Lakeshore seed contains all four provinces");
  log("PASS a single planet contains four blended rock provinces");
  const mesa = findLanding(planet, "canyon");
  assert(mesa && planet.sampleLandforms(mesa.dir).canyon >= 0.55,
    "the mesa overlook lands inside the canyon province");
  log("PASS the mesa overlook finds a cap and cliff inside the canyon province");
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
  const landscapeOptions = { ...erosionOptions, geology: "mesa", landmarkPatches: false };
  const natural = await bakeStudioPlanetNoise(device, landscapeOptions);
  for (const landscape of ["mesas", "fractal", "mosaic"]) {
    const styled = await bakeStudioPlanetNoise(device, { ...landscapeOptions, landscape });
    const difference = styled.values.reduce((sum, height, i) => sum + Math.abs(height - natural.values[i]), 0);
    assert(difference / styled.values.length > 0.015, `${landscape} changes the base mesh`);
    for (let row = 0; row < styled.side; row++) {
      assert(styled.values[row * styled.side] === styled.values[(row + 1) * styled.side - 1],
        `${landscape} closes the longitude seam`);
    }
  }
  const neutral = await bakeStudioPlanetNoise(device, {
    ...landscapeOptions, landscape: "mesas", landscapeStrength: 0,
  });
  assert(neutral.values.every((value, i) => value === natural.values[i]), "zero strength restores natural terrain");
  log("PASS landscape styles change the base mesh and blend back to natural");
  const reliefMap = planet.studioMap;
  await planet.configure({ detail: { relief: 0.5 } });
  assert(planet.studioMap.values === reliefMap.values &&
    planet.studioMap.reliefScale === 0.5 * reliefMap.reliefScale, "relief reuses the baked height samples");
  await planet.configure({ detail: { relief: 1 } });
  log("PASS relief multiplier reuses the existing terrain bake");
  const originalRadius = planet.radius;
  const originalHeights = planet.studioMap.values;
  const originalRelief = planet.studioMap.reliefScale;
  const originalWorldSeed = planet.studioSeed;
  const provinceCrossings = [];
  for (const radius of [98304, 786432, originalRadius]) {
    await planet.configure({ radius });
    assert(planet.radius === radius && planet.studioSeed === originalWorldSeed,
      "world size changes preserve the seed");
    assert(Math.abs(planet.studioMap.reliefScale / originalRelief - Math.min(1, Math.sqrt(radius / originalRadius))) < 1e-6,
      "Moon relief is lower and larger worlds retain the original relief");
    if (radius !== originalRadius) {
      assert(planet.studioMap.values.some((height, i) => Math.abs(height - originalHeights[i]) > .1),
        "world size changes the normalized relief at the same direction");
      let crossings = 0;
      for (const y of [-.65, -.26, .26, .65]) {
        let previous = "";
        for (let i = 0; i < 256; i++) {
          const angle = i * Math.PI / 128;
          const radial = Math.sqrt(1 - y * y);
          const rock = planet.sampleLandforms([radial * Math.cos(angle), y, radial * Math.sin(angle)]);
          const dominant = Object.keys(rock).reduce((a, b) => rock[a] > rock[b] ? a : b);
          if (previous && dominant !== previous) crossings++;
          previous = dominant;
        }
      }
      provinceCrossings.push(crossings);
    }
    assert(planet.shadowBins.every((bin) => bin === -1), "world size invalidates the cached shadows");
    assert(planet.studioMap.side === (radius === 98304 ? 1537 : 1001),
      "the moon uses a denser atlas and resizing restores the standard atlas");
  }
  assert(provinceCrossings[1] > 1.3 * provinceCrossings[0], "larger worlds fit more landform provinces");
  log("PASS world sizes change angular landform density on the same seed");
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
  assert(orbitStats.baseTileBuilds > 0, "orbit prepares its terrain samples");
  assert(
    planet.render(orbit, 10).baseTileBuilds === orbitStats.baseTileBuilds,
    "an unchanged view reuses its terrain samples",
  );
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
  planet.render(surfaceView, 220, { sunPhase: .5 });
  const [, nightGround] = await pixels();
  assert(Math.max(...nightGround) < Math.max(...ground) * .64, "the night side darkens the same terrain");
  planet.render(surfaceView, 221, { sunPhase: .501 });
  assert(planet.shadowBins.includes(36) && planet.shadowBins.includes(37), "moving sunlight keeps adjacent shadow maps");
  assert(planet.bundle === bundle, "changing sunlight reuses the draw bundle");
  log("PASS day/night shading with cached moving shadows");
  const orbitColors = new Set();
  planet.render(orbit, 330);
  const originalSeed = planet.studioSeed;
  const initialDetail = planet.detail;
  assert(planet.oceanLevel === null, "the default test seed is dry");
  const palettes = [...PlanetPresets].sort((a, b) =>
    getPreset(a.id).geology.localeCompare(getPreset(b.id).geology));
  for (const { id } of palettes) {
    const before = planet.studioMap;
    const orbitBundle = planet.bundle;
    const sameGeology = planet.geology === getPreset(id).geology;
    await planet.configure({ preset: id, studioSeed: originalSeed });
    planet.render(orbit, 440);
    const [, color] = await pixels();
    orbitColors.add(color.join(","));
    assert(
      sameGeology ? planet.studioMap === before && planet.bundle === orbitBundle
        : planet.studioMap !== before,
      `${id} should rebake only when the landform style changes`,
    );
  }
  assert(
    orbitColors.size >= 14,
    "the planet presets produce distinct orbital colors",
  );
  log(
    "PASS every palette renders and color-only changes reuse the draw bundle",
  );
  await planet.configure({ preset: "lakeshore", studioSeed: originalSeed });
  const originalMap = planet.studioMap;
  await planet.configure({ detail: { slopes: "incised", groundOctaves: 0 } });
  assert(planet.studioMap === originalMap, "slope detail changes without rebaking");
  planet.render(view(unit([.6,.4,.7]), 3, 0, -.6), 485);
  await pixels();
  await planet.configure({ detail: { range: "rolling", variation: 0 } });
  assert(planet.studioMap !== originalMap, "range and variance rebake terrain");
  assert(planet.sampleLandforms([1, 0, 0]).alpine === 1,
    "zero variation retains only the preset's landform");
  await planet.configure({ detail: initialDetail });
  log("PASS range, variation and detail controls take effect");
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
  await planet.configure({ terrainSampling: "procedural", tileBudget: 96 });
  const live = await planet.probeSurface(sampleDirection);
  const repeat = await planet.probeSurface(sampleDirection);
  assert(planet.studioMap.side === 513 && Number.isFinite(live?.land) && live.land === repeat?.land &&
    Math.abs(live.land - planet.sampleSurface(sampleDirection).land) > 0.0001,
    "procedural height is deterministic and resolves detail between guide samples");
  assert(planet.studioSeed === originalSeed, "sampling modes preserve the seed");
  const sampleBytes = planet.baseTileBuffer.size;
  await planet.configure({ tileBudget: 48 });
  const liveStats = planet.render(orbit, 400010);
  const [, liveGlobe] = await pixels();
  assert(liveStats.triangles > 0 && Math.max(...liveGlobe) > 45 && planet.baseTileBuffer.size < sampleBytes,
    "procedural geometry renders and vertex storage follows the patch budget");
  log("PASS procedural height, rendering and budget-sized storage");
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
