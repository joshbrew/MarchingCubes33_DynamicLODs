import { bounds } from "./field.js";
import { WEST, EAST, NORTH, SOUTH } from "./lod.js";

export const horizonDivisions = (grade) => 2 << Math.min(grade, 3);

export function boundaryMask(id, side) {
  const x = id % side,
    z = Math.floor(id / side);
  return (
    (x === 0 ? WEST : 0) |
    (x === side - 1 ? EAST : 0) |
    (z === 0 ? NORTH : 0) |
    (z === side - 1 ? SOUTH : 0)
  );
}

// Each band adds only one or two rows on each side, then doubles the patch
// size. Align the outer edges to that next grid so the existing 2:1 stitch
// templates also work between bands. Use a fixed world grid to avoid sliding
// distant samples whenever the fine window recenters.
export function horizonPatches(worldSize, tileSize, origin, position, far) {
  const anchor = -worldSize / 2,
    side = worldSize / tileSize;
  let size = tileSize,
    grade = 0;
  let left = origin[0] / size,
    top = origin[1] / size;
  let right = left + side,
    bottom = top + side;
  const patches = [];
  while (
    Number.isFinite(size * 4) &&
    (anchor + left * size > position[0] - far ||
      anchor + right * size < position[0] + far ||
      anchor + top * size > position[2] - far ||
      anchor + bottom * size < position[2] + far)
  ) {
    const minX = Math.floor((left - 1) / 2) * 2;
    const maxX = Math.ceil((right + 1) / 2) * 2;
    const minZ = Math.floor((top - 1) / 2) * 2;
    const maxZ = Math.ceil((bottom + 1) / 2) * 2;
    function strip(x0, x1, z0, z1) {
      for (let dz = 0; dz < z1 - z0; dz++)
        for (let dx = 0; dx < x1 - x0; dx++) {
          const x = x0 + dx,
            z = z0 + dz;
          // The first three bands double their divisions along with their
          // width, so they keep the same sample spacing without stitches.
          const mask =
            grade < 3
              ? 0
              : (x === minX ? WEST : 0) |
                (x === maxX - 1 ? EAST : 0) |
                (z === minZ ? NORTH : 0) |
                (z === maxZ - 1 ? SOUTH : 0);
          patches.push({
            x: anchor + x * size,
            z: anchor + z * size,
            size,
            grade,
            mask,
          });
        }
    }
    strip(minX, maxX, minZ, top);
    strip(minX, maxX, bottom, maxZ);
    strip(minX, left, top, bottom);
    strip(right, maxX, top, bottom);
    [left, right, top, bottom] = [minX / 2, maxX / 2, minZ / 2, maxZ / 2];
    size *= 2;
    grade++;
  }
  return patches;
}

export function selectHorizon(worldSize, tileSize, origin, camera, planes) {
  const [px, py, pz] = camera.position;
  const dy = Math.max(bounds[0] - py, 0, py - bounds[1]);
  const radius = camera.far ** 2 - dy ** 2;
  if (radius < 0) return [];
  return horizonPatches(
    worldSize,
    tileSize,
    origin,
    camera.position,
    camera.far,
  ).filter(({ x, z, size }) => {
    const dx = Math.max(x - px, 0, px - x - size);
    const dz = Math.max(z - pz, 0, pz - z - size);
    if (dx ** 2 + dz ** 2 > radius) return false;
    return planes.every(
      ([a, b, c, d]) =>
        a * (a > 0 ? x + size : x) +
          b * bounds[b > 0 ? 1 : 0] +
          c * (c > 0 ? z + size : z) +
          d >=
        0,
    );
  });
}
