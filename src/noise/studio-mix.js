export const studioNoiseAlgorithms = Object.freeze({
  computeFBM: "Perlin fBm",
  computeFBM2: "Warped fBm",
  computeVoronoiTileNoise: "Voronoi",
  computeRidgedMultifractal4: "Ridged multifractal",
  computeLanczosBillow: "Lanczos billow",
  computeLanczosAntiBillow: "Lanczos anti-billow",
  computeSimplexFBM: "Simplex fBm",
  computeBillow: "Billow",
  computeRidgedMultifractal: "Ridged Perlin",
  computeVoronoiBM1: "Voronoi fractal",
});

export const studioRegionAlgorithms = Object.freeze({
  perlin: "Perlin",
  ridged: "Ridged Perlin",
  fbm: "Perlin fBm",
  value: "Value noise",
});

export const studioLayerCount = 5;
export const studioRegionLabels = ["Mountains", "Canyons", "Granite", "Volcanic"];
export const studioNoiseUniforms = Object.freeze({
  seed: [0, 4294967295, 1], zoom: [.0001, 100, .01], freq: [.0001, 100, .01],
  octaves: [1, 12, 1], lacunarity: [1, 4, .05], gain: [0, 1, .01],
  xShift: [-1000, 1000, .05], yShift: [-1000, 1000, .05], zShift: [-1000, 1000, .05],
  turbulence: [0, 1, 1], seedAngle: [-10, 10, .05], exp1: [0, 8, .05], exp2: [0, 8, .05],
  threshold: [0, 1, .01], rippleFreq: [0, 100, .1], time: [-1000, 1000, .05],
  warpAmp: [-10, 10, .05], gaborRadius: [.001, 20, .1], terraceStep: [.001, 100, .1],
  toroidal: [0, 1, 1], voroMode: [0, 16, 1], edgeK: [0, 100, .1],
  scalar: [-4, 4, .05], transform: [-4, 4, .05],
});

export const studioNoiseDefaults = Object.freeze({
  turbulence: 0, exp1: 1, exp2: 0, rippleFreq: 10, time: 0,
  gaborRadius: 4, terraceStep: 8, toroidal: 0, edgeK: 0,
});

export function normalizeStudioNoiseMix(mix) {
  if (mix == null) return null;
  const { regionMap, layers } = mix;
  if (!regionMap || !Object.hasOwn(studioRegionAlgorithms, regionMap.algorithm) ||
      !(regionMap.frequency >= .25 && regionMap.frequency <= 24) ||
      !(regionMap.transition >= .05 && regionMap.transition <= 2) ||
      !Array.isArray(layers) || layers.length !== studioLayerCount) {
    throw new RangeError("Choose a valid region map and five terrain layers.");
  }
  return Object.freeze({
    regionMap: Object.freeze({ algorithm: regionMap.algorithm, frequency: Number(regionMap.frequency),
      transition: Number(regionMap.transition) }),
    layers: Object.freeze(layers.map(({ algorithm, uniforms = {}, weights }) => {
      if (!Object.hasOwn(studioNoiseAlgorithms, algorithm) || !Array.isArray(weights) ||
          weights.length !== 4 || !weights.every(value => Number.isFinite(value) && value >= 0 && value <= 1)) {
        throw new RangeError("Choose a valid layer noise and region weights from 0 to 1.");
      }
      const params = {};
      for (const [name, value] of Object.entries(uniforms)) {
        const range = studioNoiseUniforms[name];
        if (!Object.hasOwn(studioNoiseUniforms, name) || !Number.isFinite(value) ||
            value < range[0] || value > range[1] || (range[2] === 1 && !Number.isInteger(value))) {
          throw new RangeError(`Invalid terrain uniform ${name}.`);
        }
        params[name] = value;
      }
      return Object.freeze({ algorithm, uniforms: Object.freeze(params), weights: Object.freeze([...weights]) });
    })),
  });
}

export function studioRegionUniforms(mix, geology) {
  const region = mix?.regionMap;
  return region ? [region.frequency, region.transition,
    Object.keys(studioRegionAlgorithms).indexOf(region.algorithm) + 1, geology] : [0, 0, 0, 0];
}
