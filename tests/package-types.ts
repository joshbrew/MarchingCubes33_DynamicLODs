import {
  createSurface,
  createSphere,
  createCamera,
  createTerrain,
  createSpace,
  createProgressiveTerrain,
  extractCPU,
  Coordinates,
  attachFlyControls,
  type CanvasLike,
} from "marching-cubes-bourke-mc33";
import { createTerrain as terrainOnly } from "marching-cubes-bourke-mc33/terrain";
import { createSpace as spaceOnly } from "marching-cubes-bourke-mc33/space";
import { createProgressiveTerrain as progressiveOnly } from "marching-cubes-bourke-mc33/progressive";
import { createCamera as cameraOnly } from "marching-cubes-bourke-mc33/camera";
import { createSphere as sphereOnly } from "marching-cubes-bourke-mc33/core";
declare const canvas: CanvasLike;
const surface = await createSurface({
  sample: (x, y, z) => x + y + z - 1,
  algorithm: "mc33",
});
surface.positions satisfies Float32Array;
const sphere = await createSphere({
  radius: 10,
  surface: "inner",
  coordinates: "cube-sphere",
});
sphere.normals satisfies Float32Array;
await sphereOnly({ points: new Float32Array(12) });
const camera = createCamera({ position: [0, 200, 300], target: [0, 0, 0] });
cameraOnly(camera);
const terrain = await createTerrain(canvas, {
  settings: { trees: { enabled: true }, infinite: true },
});
terrain.configure({ trees: { distance: 2000 }, algorithm: "bourke" });
terrain.render(camera);
terrain.dispose();
const controls = attachFlyControls(canvas, { position: [0, 200, 300] });
controls.update(0.016);
controls.dispose();
await terrainOnly(canvas);
await spaceOnly(canvas);
await progressiveOnly(canvas);
const space = await createSpace(canvas, {
  workers: 1,
  settings: { caves: true, mode: "mesh" },
});
space.render(camera);
space.dispose();
const progressive = await createProgressiveTerrain(canvas, {
  minSize: 1,
  settings: { pixelError: 2 },
});
progressive.render(camera);
progressive.dispose();
extractCPU(
  Coordinates.sampleField({ x: 2, y: 2, z: 2 }, (x, y, z) => x + y + z),
  { x: 2, y: 2, z: 2 },
);
// @ts-expect-error algorithm names are checked
await createSurface({ sample: () => 1, algorithm: "other" });
// @ts-expect-error feature-specific settings are checked
terrain.configure({ caves: true });
// @ts-expect-error feature-specific settings are checked
progressive.configure({ trees: { enabled: true } });
