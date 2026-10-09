import * as SpaceGeometry from "./geometry.js";
import * as SpaceWorld from "./world.js";
self.onmessage = (event) => {
  const { key, kind, variant, level, algorithm, caves } = event.data;
  try {
    const start = performance.now(),
      mesh = SpaceGeometry.build(
        kind,
        variant,
        level === "points" ? 0 : level,
        algorithm,
        { caves },
      );
    const geometry =
      level === "points"
        ? SpaceGeometry.pointCloud(mesh.vertices, 8192, kind * 71 + variant)
        : mesh;
    const fallback =
      level === SpaceWorld.meshLevels - 1
        ? SpaceGeometry.pointCloud(mesh.vertices, 512, kind * 71 + variant)
        : null;
    self.postMessage(
      { key, ...geometry, fallback, ms: performance.now() - start },
      fallback
        ? [geometry.vertices.buffer, fallback.vertices.buffer]
        : [geometry.vertices.buffer],
    );
  } catch (error) {
    self.postMessage({ key, error: error.message });
  }
};
