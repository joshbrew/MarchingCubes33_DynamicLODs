import * as TerrainField from "../terrain/field.js";
import detailShader from "./shaders/field.wgsl";

// World-space samples, not a separately seeded image per tile. All resolutions
// therefore agree at shared sample positions, including negative coordinates.
export const detailBands = [
  [4, 0.42],
  [2, 0.22],
  [1, 0.11],
  [0.5, 0.055],
  [0.25, 0.0275],
  [0.125, 0.01375],
  [0.0625, 0.006875],
];
export const bounds = [-382, 482];
export const wgsl = TerrainField.wgsl + detailShader;
export function heightGradient(x, z, seed = 7) {
  const result = TerrainField.heightGradient(x, z, seed);
  detailBands.forEach(([wave, amplitude], i) => {
    const n = TerrainField.noise(x / wave, z / wave, seed + 211 + i * 19);
    result[0] += n[0] * amplitude;
    result[1] += (n[1] * amplitude) / wave;
    result[2] += (n[2] * amplitude) / wave;
  });
  return result;
}
export function height(x, z, seed = 7) {
  let result = TerrainField.height(x, z, seed);
  for (let i = 0; i < detailBands.length; i++) {
    const [wave, amplitude] = detailBands[i];
    result +=
      TerrainField.noiseValue(x / wave, z / wave, seed + 211 + i * 19) *
      amplitude;
  }
  return result;
}
export function estimatedError(step) {
  let error = TerrainField.estimatedError(step);
  for (const [wave, amplitude] of detailBands)
    error += amplitude * Math.min(1, 2 * (step / wave) ** 2);
  return error;
}
