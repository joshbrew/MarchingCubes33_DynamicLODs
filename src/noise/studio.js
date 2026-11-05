export const studioSeed = 123456789;
export const studioSegments = 1000;

// Planet Studio's default stack, including its seeded sphere domain offsets.
export function createStudioPlanetNoise(
  seed = studioSeed,
  { reseedLayers = seed !== studioSeed } = {},
) {
  let state = seed >>> 0;
  function random() {
    state += 0x6d2b79f5;
    let n = Math.imul(state ^ (state >>> 15), 1 | state);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  }
  const signed = (magnitude) =>
    (random() < 0.5 ? -1 : 1) * random() * magnitude;
  const sphereOffset = signed(0.3);
  const sphereOffset2 = signed(0.1);
  const ridgeShift = random() * 0.4 - 0.2 + 0.65;
  const billowShift = random() * 0.2 - 0.1 + 0.65;
  const fbmShift = random() * 0.2 - 0.1;
  const zoom = 2.4;
  const layers = [
    ["computeFBM", 0.8, 6, 2, 0.75, fbmShift + 2],
    ["computeFBM2", 1, 8, 2, 0.75, fbmShift + 1.3],
    ["computeVoronoiTileNoise", 0.35, 2, 2, 0.9, ridgeShift],
    ["computeRidgedMultifractal4", 0.2, 6, 2.1, 1, ridgeShift],
    ["computeLanczosBillow", 0.5, 6, 2, 1, billowShift],
  ].map(([entryPoint, scale, octaves, lacunarity, scalar, shift], index) => ({
    entryPoint,
    params: {
      seed: reseedLayers ? (seed + (index + 1) * 15485863) >>> 0 : seed,
      zoom: zoom * scale,
      freq: 1,
      octaves,
      lacunarity,
      gain: 0.5,
      scalar,
      transform: 0,
      xShift: shift,
      yShift: shift,
      zShift: shift,
      seedAngle: Math.PI / 2,
      threshold: 0.3,
      voroMode: 2,
      warpAmp: 0,
    },
  }));
  return { seed, sphereOffset, sphereOffset2, layers };
}

function cubic(a, b, c, d, t) {
  return (
    b +
    t *
      (0.5 * (c - a) +
        t *
          (a - 2.5 * b + 2 * c - 0.5 * d + t * (0.5 * (d - a) + 1.5 * (b - c))))
  );
}

// The last longitude column duplicates the first. Cubic interpolation wraps
// across that seam and gives the near terrain a continuous broad slope.
export function sampleStudioPlanetNoise({ side, values }, [x, y, z]) {
  const horizontal = Math.hypot(x, z);
  const longitude = horizontal > 0 ? Math.atan2(z, x) / (2 * Math.PI) : 0;
  const u = (longitude - Math.floor(longitude)) * (side - 1);
  const v = (Math.atan2(horizontal, y) * (side - 1)) / Math.PI;
  const i = Math.floor(u),
    j = Math.floor(v);
  const wrap = (column) => (column + side - 1) % (side - 1);
  const row = (offset) => {
    const base = Math.min(side - 1, Math.max(0, j + offset)) * side;
    return cubic(
      values[base + wrap(i - 1)],
      values[base + wrap(i)],
      values[base + wrap(i + 1)],
      values[base + wrap(i + 2)],
      u - i,
    );
  };
  return cubic(row(-1), row(0), row(1), row(2), v - j);
}
