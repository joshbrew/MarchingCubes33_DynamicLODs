import { NoiseComputeBuilder } from "./noiseCompute.js";
import { applyStudioRunoff } from "./studio-watersheds.js";
import erosionWorkerURL from "./studio-erosion.worker.js";
import {
  createStudioPlanetNoise,
  studioSeed,
  studioSegments,
} from "./studio.js";
const geologyMode = { mixed: 0, alpine: 1, mesa: 2, volcanic: 3 };

async function finishRunoff(values, side, geology) {
  if (typeof Worker === "function") {
    let worker;
    try {
      worker = new Worker(erosionWorkerURL);
      return await new Promise((resolve, reject) => {
        worker.onmessage = ({ data }) => resolve(data);
        worker.onerror = reject;
        worker.onmessageerror = reject;
        // Keep the original for hosts whose CSP blocks blob workers.
        worker.postMessage({ values, side, geology });
      });
    } catch {
      // The same bake also runs in Node and hosts that block workers.
    } finally {
      worker?.terminate();
    }
  }
  return applyStudioRunoff(values, side, geology);
}

function floatFromHalf(word) {
  const exponent = (word >> 10) & 31;
  const fraction = (word & 1023) / 1024;
  const sign = word & 32768 ? -1 : 1;
  if (exponent === 31) return fraction ? NaN : sign * Infinity;
  return (
    sign *
    (exponent ? 2 ** (exponent - 15) * (1 + fraction) : 2 ** -14 * fraction)
  );
}

export async function bakeStudioPlanetNoise(device, options) {
  const builder = new NoiseComputeBuilder(device, device.queue);
  try {
    return await bakeStudioMap(builder, options);
  } finally {
    builder.dispose();
  }
}

export async function bakeStudioMap(
  builder,
  {
    seed = studioSeed,
    segments = studioSegments,
    reseedLayers,
    erosion = false,
    geology = "mixed",
  } = {},
) {
  if (!Number.isInteger(segments) || segments < 8 || segments > 1024)
    throw new RangeError("Planet Studio noise needs 8–1024 segments.");
  if (!Number.isInteger(seed))
    throw new RangeError("Use an integer noise seed.");
  if (!Object.hasOwn(geologyMode, geology))
    throw new RangeError("Unknown planet geology.");
  const side = segments + 1;
  const { sphereOffset, sphereOffset2, layers } = createStudioPlanetNoise(
    seed,
    { reseedLayers },
  );
  const { device } = builder;
  const textureKey = "planet-studio-height";
  let readback;
  try {
    const { messages } = await builder.shaderModule.getCompilationInfo();
    const errors = messages.filter((message) => message.type === "error");
    if (errors.length)
      throw new Error(errors.map((message) => message.message).join("\n"));
    await builder.computeToTexture(
      side,
      side,
      { scalar: 1, transform: 0 },
      {
        textureKey,
        noiseChoices: ["clearTexture"],
      },
    );
    const mountainRanges = geology === "alpine" || geology === "mixed";
    const ridgeBoost = geology === "alpine" ? 2.05 : geology === "volcanic" ? 1.2 : 1.55;
    for (const { entryPoint, params } of layers) {
      let layer = params;
      if (erosion && entryPoint === "computeRidgedMultifractal4") {
        layer = { ...params, scalar: ridgeBoost, transform: 0.36 * (ridgeBoost - 1) };
      } else if (erosion && mountainRanges) {
        if (entryPoint === "computeFBM2") layer = { ...params, scalar: params.scalar * 0.60 };
        if (entryPoint === "computeLanczosBillow") layer = { ...params, scalar: params.scalar * 0.48 };
      }
      builder.buildPermTable(layer.seed);
      await builder.computeToTexture(side, side, layer, {
        textureKey,
        useCustomPos: 2,
        sphereOffset,
        sphereOffset2,
        noiseChoices: [entryPoint],
      });
    }
    if (erosion) {
      await builder.computeToTexture(
        side,
        side,
        { seed, voroMode: geologyMode[geology] },
        {
          textureKey,
          noiseChoices: [
            "computeStudioSphereRelief",
            "computeStudioSphereMountainErosion",
            "computeStudioSphereErosion",
          ],
        },
      );
    }

    const { texture } = builder.getCurrentTextureResource(textureKey);
    const bytesPerRow = Math.ceil((side * 8) / 256) * 256;
    readback = device.createBuffer({
      size: bytesPerRow * side,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
    });
    const encoder = device.createCommandEncoder();
    encoder.copyTextureToBuffer(
      { texture },
      { buffer: readback, bytesPerRow },
      [side, side, 1],
    );
    device.queue.submit([encoder.finish()]);
    await readback.mapAsync(GPUMapMode.READ);
    const source = new Uint16Array(readback.getMappedRange());
    let values = new Float32Array(side * side);
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        const value = floatFromHalf(source[y * (bytesPerRow / 2) + x * 4]);
        if (!Number.isFinite(value))
          throw new Error("Planet Studio noise produced a nonfinite height.");
        values[y * side + x] = value;
      }
    }
    readback.destroy();
    readback = null;
    // Match Studio's eight-row polar blend before measuring the palette range.
    const blendRows = Math.min(8, Math.floor(segments / 8));
    for (const start of [0, segments]) {
      for (let row = 1; row <= blendRows; row++) {
        const base = Math.abs(start - row) * side;
        let mean = 0;
        for (let x = 0; x < segments; x++) mean += values[base + x] / segments;
        const blend = 0.9 * (1 - row / (blendRows + 1)) ** 2;
        for (let x = 0; x < side; x++)
          values[base + x] += (mean - values[base + x]) * blend;
      }
    }
    if (erosion) values = await finishRunoff(values, side, geology);
    let min = Infinity,
      max = -Infinity,
      sum = 0;
    for (const value of values) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      sum += value;
    }
    if (max - min < 1e-7)
      throw new Error("Planet Studio noise produced a flat heightmap.");
    return { side, values, min, max, mean: sum / values.length };
  } finally {
    readback?.destroy();
    builder.destroyTexturePair(textureKey);
  }
}
