import { ProgressiveTerrainRenderer } from "../progressive/renderer.js";
import { initializeWorld } from "../api/world.js";
export const createProgressiveTerrain = (canvas, options) =>
  initializeWorld("progressive", ProgressiveTerrainRenderer, canvas, options);
export { ProgressiveTerrainRenderer };
export * as ProgressiveTerrainField from "../progressive/field.js";
export * as ProgressiveTerrainLOD from "../progressive/lod.js";
