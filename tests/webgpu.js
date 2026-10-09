import {
  MarchingCubes,
  Coordinates as MarchingCoordinates,
  Fields as DemoFields,
} from "../dist/index.esm.js";
(async function () {
  const results = document.getElementById("results");
  const lines = [];
  let device;
  function log(text) {
    lines.push(text);
    results.textContent = lines.join("\n");
  }
  function canonical(positions) {
    const tris = [];
    for (let i = 0; i < positions.length; i += 9) {
      const points = Array.from({ length: 3 }, (_, v) =>
        Array.from(positions.slice(i + v * 3, i + v * 3 + 3)),
      );
      // A cyclic rotation preserves winding while ignoring the first vertex.
      const keys = points.map((p) =>
        p.map((n) => Math.round(n * 10000)).join(","),
      );
      tris.push(
        [
          keys.join("|"),
          [keys[1], keys[2], keys[0]].join("|"),
          [keys[2], keys[0], keys[1]].join("|"),
        ].sort()[0],
      );
    }
    return tris.sort();
  }
  function compare(cpu, gpu, label) {
    if (cpu.length !== gpu.length)
      throw new Error(
        `${label}: CPU ${cpu.length / 9} vs GPU ${gpu.length / 9} triangles`,
      );
    const a = canonical(cpu),
      b = canonical(gpu);
    if (a.some((key, i) => key !== b[i]))
      throw new Error(`${label}: geometry/winding differs`);
    log(`PASS ${label}: ${cpu.length / 9} triangles`);
  }
  async function check(field, size, iso, algorithm, label, options = {}) {
    const cpu = MarchingCubes.extractCPU(field, size, iso, algorithm, options);
    device.pushErrorScope("validation");
    const gpu = await MarchingCubes.extractGPU(
      device,
      field,
      size,
      iso,
      algorithm,
      options,
    );
    const error = await device.popErrorScope();
    if (error) throw new Error(error.message);
    compare(cpu, gpu, `${algorithm} ${label}`);
  }
  try {
    if (!navigator.gpu) throw new Error("WebGPU unavailable in this browser");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter");
    device = await adapter.requestDevice();
    device.addEventListener("uncapturederror", (event) =>
      log(`GPU ERROR: ${event.error.message}`),
    );
    for (const algorithm of ["bourke", "mc33"]) {
      // Put all masks in separate cells with one sample column between them.
      const impl = MarchingCubes.algorithms[algorithm],
        size = { x: 768, y: 2, z: 2 },
        field = new Float32Array(3072).fill(4);
      for (let mask = 0; mask < 256; mask++)
        for (let c = 0; c < 8; c++) {
          const p = impl.corners[c];
          field[(p[2] * size.y + p[1]) * size.x + mask * 3 + p[0]] =
            (mask & impl.cornerBit(c) ? -1 : 1) *
            (1 + ((mask * 13 + c * 7) % 29) / 8);
        }
      await check(field, size, 0, algorithm, "all masks");
      const volumeSize = { x: 11, y: 9, z: 13 };
      const volume = MarchingCoordinates.sampleField(
        volumeSize,
        (x, y, z) =>
          Math.sin(x * 17 + 0.1) *
            Math.cos(y * 13 + 0.2) *
            Math.sin(z * 11 + 0.3) +
          0.03,
        { type: "cartesian" },
      );
      await check(volume, volumeSize, 0, algorithm, "ambiguous volume");
      await check(volume, volumeSize, 0, algorithm, "overlapping Z bricks", {
        brickDepth: 3,
      });
      await check(
        new Float32Array(11 * 9 * 13),
        volumeSize,
        1,
        algorithm,
        "empty field",
        { brickDepth: 3 },
      );
      await check(
        MarchingCoordinates.sampleField(volumeSize, (x, y, z) => x + y + z, {
          type: "cartesian",
        }),
        volumeSize,
        1,
        algorithm,
        "exact corners",
        { brickDepth: 3 },
      );
      const spherical = {
        type: "spherical",
        radius: [0.1, 0.6],
        center: [0, 0, 0],
      };
      const radial = MarchingCoordinates.sampleField(
        volumeSize,
        (x, y, z) => Math.hypot(x, y, z) - 0.33,
        spherical,
      );
      await check(radial, volumeSize, 0, algorithm, "spherical mapping", {
        coordinates: spherical,
        brickDepth: 3,
      });
      for (let face = 0; face < 6; face++) {
        const config = {
          type: "cube-sphere",
          face,
          radius: [0.1, 0.6],
          center: [0, 0, 0],
        };
        const field = MarchingCoordinates.sampleField(
          volumeSize,
          (x, y, z) => Math.hypot(x, y, z) - 0.33,
          config,
        );
        await check(
          field,
          volumeSize,
          0,
          algorithm,
          `cube-sphere face ${face}`,
          { coordinates: config, brickDepth: 3 },
        );
      }
    }
    // Test both independent boundaries of a shell thinner than one sample step.
    const fit = DemoFields.fitSphere(
      DemoFields.generateSpherePoints(
        512,
        { x: 0.48, y: 0.51, z: 0.49 },
        0.301,
      ),
    );
    const shellSize = { x: 19, y: 17, z: 21 },
      sampler = DemoFields.sphereSampler(fit);
    const configs = [
      { type: "cartesian" },
      { type: "spherical", center: fit.center, radius: [0.02, 0.7] },
      ...Array.from({ length: 6 }, (_, face) => ({
        type: "cube-sphere",
        face,
        center: fit.center,
        radius: [0.02, 0.7],
      })),
    ];
    for (const algorithm of ["bourke", "mc33"])
      for (const coordinates of configs) {
        const field = MarchingCoordinates.sampleField(
          shellSize,
          sampler,
          coordinates,
        );
        for (const boundary of DemoFields.sphereSurfaces(
          fit,
          "both",
          0.00001,
        )) {
          const label = `tight ${coordinates.type}${coordinates.face === undefined ? "" : ` face ${coordinates.face}`} ${boundary.side}`;
          await check(field, shellSize, boundary.iso, algorithm, label, {
            coordinates,
          });
          const gpu = await MarchingCubes.extractGPU(
            device,
            field,
            shellSize,
            boundary.iso,
            algorithm,
            { coordinates },
          );
          const refined = DemoFields.refineSphereSurface(gpu, fit, boundary);
          if (!refined.positions.length)
            throw new Error(`${label}: boundary disappeared`);
          for (let i = 0; i < refined.positions.length; i += 3) {
            const d = [0, 1, 2].map(
              (axis) => refined.positions[i + axis] - fit.center[axis],
            );
            if (Math.abs(Math.hypot(...d) - boundary.radius) > 1e-7)
              throw new Error(`${label}: incorrect radius`);
            const dot = d.reduce(
              (sum, value, axis) => sum + value * refined.normals[i + axis],
              0,
            );
            if (boundary.side === "inner" ? dot >= 0 : dot <= 0)
              throw new Error(`${label}: incorrect normal`);
          }
        }
      }
    log("ALL WEBGPU CHECKS PASSED");
    document.body.dataset.result = "pass";
  } catch (error) {
    log(`FAIL ${error.stack || error.message}`);
    document.body.dataset.result = "fail";
  } finally {
    if (device) {
      await MarchingCubes.disposeGPU(device);
      device.destroy();
    }
  }
})();
