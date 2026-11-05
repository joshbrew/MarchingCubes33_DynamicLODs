import * as field from "./field.js";
const WEST = 1,
  EAST = 2,
  NORTH = 4,
  SOUTH = 8;
function makeTiles(worldSize = 8192, tileSize = 128) {
  const side = worldSize / tileSize;
  if (!Number.isInteger(side) || side < 1)
    throw new Error("World size must be divisible by tile size");
  const tiles = [];
  for (let z = 0; z < side; z++)
    for (let x = 0; x < side; x++) {
      const ox = x * tileSize - worldSize / 2,
        oz = z * tileSize - worldSize / 2;
      tiles.push({
        id: z * side + x,
        x,
        z,
        ox,
        oz,
        size: tileSize,
        lo: [ox, field.bounds[0], oz],
        hi: [ox + tileSize, field.bounds[1], oz + tileSize],
      });
    }
  return { tiles, side };
}
function neighbors(id, side) {
  const x = id % side,
    z = Math.floor(id / side);
  return [
    [x > 0 ? id - 1 : -1, WEST],
    [x < side - 1 ? id + 1 : -1, EAST],
    [z > 0 ? id - side : -1, NORTH],
    [z < side - 1 ? id + side : -1, SOUTH],
  ];
}
// Slide the candidate window in tile-aligned increments. Its local hierarchy
// stays immutable; overlapping world tiles keep their GPU samples.
function windowOffset(position, worldSize, tileSize) {
  const step = tileSize * Math.max(1, Math.floor(worldSize / tileSize / 8));
  return [
    Math.round(position[0] / step) * step,
    Math.round(position[2] / step) * step,
  ];
}
function shiftTileMap(map, side, dx, dz, onDiscard = () => {}) {
  if (!Number.isInteger(dx) || !Number.isInteger(dz))
    throw new Error("Window shifts must use whole tiles");
  const next = new Map();
  for (const [id, value] of map) {
    const x = (id % side) - dx,
      z = Math.floor(id / side) - dz;
    if (x >= 0 && z >= 0 && x < side && z < side) next.set(z * side + x, value);
    else onDiscard(value);
  }
  return next;
}
function moveTiles(tiles, dx, dz) {
  for (const tile of tiles) {
    tile.ox += dx;
    tile.oz += dz;
    tile.lo[0] += dx;
    tile.hi[0] += dx;
    tile.lo[2] += dz;
    tile.hi[2] += dz;
  }
}
function relativePlanes(planes, offset) {
  return planes.map((p) => [
    p[0],
    p[1],
    p[2],
    p[3] + p[0] * offset[0] + p[2] * offset[1],
  ]);
}
function distanceTo(tile, position) {
  let squared = 0;
  for (let i = 0; i < 3; i++) {
    const d = Math.max(tile.lo[i] - position[i], 0, position[i] - tile.hi[i]);
    squared += d * d;
  }
  return Math.sqrt(squared);
}
function desiredLevel(tile, camera, settings, previous, errors) {
  const distance = Math.max(1, distanceTo(tile, camera.position));
  const pixelScale = errors
    ? 0
    : camera.height / (2 * Math.tan(camera.fov / 2));
  const near = Math.hypot(
    Math.max(
      tile.ox - camera.player[0],
      0,
      camera.player[0] - tile.ox - tile.size,
    ),
    Math.max(
      tile.oz - camera.player[2],
      0,
      camera.player[2] - tile.oz - tile.size,
    ),
  );
  if (near < settings.nearRadius) return 0;
  const screenError = (level) =>
    (errors
      ? errors[level]
      : field.estimatedError(tile.size / (settings.maxDivs >> level)) *
        pixelScale) / distance;
  let level = 0;
  while (
    level < settings.levels - 1 &&
    screenError(level + 1) <= settings.pixelError
  )
    level++;
  // Retain a previous level within a dead band; never retain a gross mismatch
  // after teleports or a quality-setting change.
  if (previous !== undefined && previous < settings.levels) {
    const error = screenError(previous),
      next =
        previous + 1 < settings.levels ? screenError(previous + 1) : Infinity;
    if (error <= settings.pixelError * 1.2 && next >= settings.pixelError * 0.8)
      return previous;
  }
  return level;
}
// Desired grids refine coarse neighbors. Rendering can only coarsen finer
// resident grids, so partially generated/streamed tiles remain compatible.
function balance(levels, side, mode = "refine") {
  const queue = Array.from(levels.keys());
  const relax = (id, neighbor) => {
    const current = levels.get(id),
      other = levels.get(neighbor);
    if (other === undefined || Math.abs(current - other) <= 1) return;
    const target =
      mode === "refine"
        ? current > other
          ? id
          : neighbor
        : current < other
          ? id
          : neighbor;
    levels.set(
      target,
      mode === "refine"
        ? Math.min(current, other) + 1
        : Math.max(current, other) - 1,
    );
    queue.push(target);
  };
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head],
      x = id % side;
    if (x) relax(id, id - 1);
    if (x < side - 1) relax(id, id + 1);
    if (id >= side) relax(id, id - side);
    if (id + side < side * side) relax(id, id + side);
  }
  return levels;
}
function seams(levels, side) {
  const masks = new Map();
  for (const [id, level] of levels) {
    let mask = 0;
    for (const [neighbor, bit] of neighbors(id, side))
      if (levels.get(neighbor) === level + 1) mask |= bit;
    masks.set(id, mask);
  }
  return masks;
}
function select(tiles, ids, side, camera, settings, previous = new Map()) {
  const levels = new Map();
  const pixelScale = camera.height / (2 * Math.tan(camera.fov / 2));
  const errors = ids.length
    ? Array.from(
        { length: settings.levels },
        (_, level) =>
          field.estimatedError(
            tiles[ids[0]].size / (settings.maxDivs >> level),
          ) * pixelScale,
      )
    : [];
  for (const id of ids)
    levels.set(
      id,
      settings.uniform
        ? 0
        : desiredLevel(tiles[id], camera, settings, previous.get(id), errors),
    );
  balance(levels, side);
  return { levels, masks: seams(levels, side) };
}
export {
  makeTiles,
  neighbors,
  windowOffset,
  shiftTileMap,
  moveTiles,
  relativePlanes,
  distanceTo,
  desiredLevel,
  balance,
  seams,
  select,
  WEST,
  EAST,
  NORTH,
  SOUTH,
};
export default {
  makeTiles,
  neighbors,
  windowOffset,
  shiftTileMap,
  moveTiles,
  relativePlanes,
  distanceTo,
  desiredLevel,
  balance,
  seams,
  select,
  WEST,
  EAST,
  NORTH,
  SOUTH,
};
