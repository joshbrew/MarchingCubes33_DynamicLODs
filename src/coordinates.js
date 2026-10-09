// Joshua Brewster (MIT License).
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MarchingCoordinates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function createMapper(config = { type: 'cartesian' }) {
    if (config.type === 'cartesian') return (x, y, z) => [x, y, z];
    if (config.type !== 'spherical' && config.type !== 'cube-sphere') throw new Error(`Unknown coordinates: ${config.type}`);
    const radius = config.radius || [0.02, 0.7];
    const center = config.center || [0.5, 0.5, 0.5];
    if (radius.length !== 2 || !radius.every(Number.isFinite) || radius[0] < 0 || radius[1] <= radius[0]) {
      throw new Error('Radius must be an increasing, nonnegative pair');
    }
    if (center.length !== 3 || !center.every(Number.isFinite)) throw new Error('Center must contain three finite coordinates');
    if (config.type === 'cube-sphere') {
      if (!Number.isInteger(config.face) || config.face < 0 || config.face > 5) throw new Error('Cube-sphere face must be 0..5');
      // Same face mapping as the planet cloud shader: x/y are angular, z radial.
      return (x, y, z) => {
        const u = 2 * x - 1, v = 2 * y - 1;
        const directions = [[1,v,-u],[-1,v,u],[u,1,-v],[u,-1,v],[u,v,1],[-u,v,-1]];
        const dir = directions[config.face], r = radius[0] + z * (radius[1] - radius[0]);
        const scale = r / Math.hypot(...dir);
        return dir.map((value, axis) => center[axis] + value * scale);
      };
    }
    const longitude = config.longitude || [-Math.PI, Math.PI];
    const latitude = config.latitude || [-Math.PI / 2, Math.PI / 2];
    for (const range of [longitude, latitude]) {
      if (range.length !== 2 || !range.every(Number.isFinite) || range[1] <= range[0]) {
        throw new Error('Angular ranges must be increasing finite pairs in radians');
      }
    }
    if (latitude[0] < -Math.PI / 2 || latitude[1] > Math.PI / 2 || longitude[1] - longitude[0] > 2 * Math.PI + 1e-9) {
      throw new Error('Latitude must be within ±pi/2 and longitude span at most 2*pi');
    }
    return (x, y, z) => {
      const lon = longitude[0] + x * (longitude[1] - longitude[0]);
      const lat = latitude[0] + y * (latitude[1] - latitude[0]);
      const r = radius[0] + z * (radius[1] - radius[0]), horizontal = r * Math.cos(lat);
      if (Math.abs(Math.cos(lat)) < 1e-15) return [center[0], center[1] + r * Math.sin(lat), center[2]];
      return [center[0] + horizontal * Math.cos(lon), center[1] + r * Math.sin(lat), center[2] + horizontal * Math.sin(lon)];
    };
  }

  function mapPositions(positions, config) {
    if (!config || config.type === 'cartesian') return positions;
    const map = createMapper(config);
    for (let i = 0; i < positions.length; i += 3) {
      const p = map(positions[i], positions[i + 1], positions[i + 2]);
      positions[i] = p[0]; positions[i + 1] = p[1]; positions[i + 2] = p[2];
    }
    return positions;
  }

  // Evaluate a world-space field at a structured coordinate grid's sample points.
  // For full longitude coverage, duplicate the first longitude at the last column.
  function sampleField(size, sampleWorld, config) {
    const map = createMapper(config), field = new Float32Array(size.x * size.y * size.z);
    const periodic = config?.type === 'spherical' &&
      Math.abs((config.longitude || [-Math.PI, Math.PI])[1] - (config.longitude || [-Math.PI, Math.PI])[0] - 2 * Math.PI) < 1e-9;
    for (let z = 0; z < size.z; z++) for (let y = 0; y < size.y; y++) for (let x = 0; x < size.x; x++) {
      const index = (z * size.y + y) * size.x + x;
      if (periodic && x === size.x - 1) { field[index] = field[(z * size.y + y) * size.x]; continue; }
      const p = map(x / (size.x - 1), y / (size.y - 1), z / (size.z - 1));
      field[index] = sampleWorld(...p);
    }
    return field;
  }

  function cartesianSampler(field, size) {
    return (x, y, z) => {
      if (x < 0 || x > 1 || y < 0 || y > 1 || z < 0 || z > 1) return 0;
      const p = [x * (size.x - 1), y * (size.y - 1), z * (size.z - 1)];
      const base = p.map(Math.floor), t = p.map((v, i) => v - base[i]);
      let value = 0;
      for (let dz = 0; dz < 2; dz++) for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const ix = Math.min(base[0] + dx, size.x - 1), iy = Math.min(base[1] + dy, size.y - 1), iz = Math.min(base[2] + dz, size.z - 1);
        value += field[(iz * size.y + iy) * size.x + ix] * (dx ? t[0] : 1 - t[0]) * (dy ? t[1] : 1 - t[1]) * (dz ? t[2] : 1 - t[2]);
      }
      return value;
    };
  }
  return { createMapper, mapPositions, sampleField, cartesianSampler };
});
