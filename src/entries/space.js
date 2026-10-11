import { Renderer } from "../space/renderer.js";
import { initializeWorld } from "../api/world.js";
export const createSpace = (canvas, options) =>
  initializeWorld("space", Renderer, canvas, options);
export { Renderer as SpaceRenderer };
export * as SpaceWorld from "../space/world.js";
export * as SpaceGeometry from "../space/geometry.js";
