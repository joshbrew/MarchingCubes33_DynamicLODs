import { Renderer } from "../terrain/renderer.js";
import { initializeWorld } from "../api/world.js";
export const createTerrain = (canvas, options) =>
  initializeWorld("terrain", Renderer, canvas, options);
export { Renderer as TerrainRenderer };
export { Trees } from "../terrain/trees.js";
export * as TerrainField from "../terrain/field.js";
export * as TerrainLOD from "../terrain/lod.js";
export * as TerrainPLOC from "../terrain/ploc.js";
export * as TerrainSurface from "../terrain/surface.js";
export * as TerrainVegetation from "../terrain/vegetation.js";
