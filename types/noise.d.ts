import type { GPUDeviceLike, Vec3 } from "./common.js";

export type NoiseParameters = Partial<
  Record<
    | "seed"
    | "zoom"
    | "freq"
    | "octaves"
    | "lacunarity"
    | "gain"
    | "xShift"
    | "yShift"
    | "zShift"
    | "seedAngle"
    | "exp1"
    | "exp2"
    | "threshold"
    | "rippleFreq"
    | "time"
    | "warpAmp"
    | "gaborRadius"
    | "terraceStep"
    | "voroMode"
    | "edgeK"
    | "scalar"
    | "transform",
    number
  >
> & { turbulence?: boolean | 0 | 1; toroidal?: boolean | 0 | 1 };

export interface NoiseComputeOptions {
  noiseChoices?: (string | number)[];
  id?: string | number;
  textureKey?: string | number;
  outputChannel?: number;
  getGradient?: number;
  useCustomPos?: number;
  customData?: Float32Array;
  baseRadius?: number;
  heightScale?: number;
  sphereOffset?: number;
  sphereOffset2?: number;
  sphereBlend?: number;
  sphereBlendPhase?: number;
  sphereRangeWeight?: number;
  spherePolarFade?: number;
  sphereLandscape?: number;
  sphereLandscapeStrength?: number;
  sphereFeatureDensity?: number;
  [key: string]: unknown;
}

export class BaseNoise {
  constructor(seed?: number);
  readonly perm: Uint8Array;
  setSeed(seed: number): void;
  random(x: number, y: number, z?: number): number;
  seededRandom(): number;
  resetSeed(): void;
}

export class NoiseComputeBuilder {
  constructor(device: GPUDeviceLike, queue: GPUDeviceLike["queue"]);
  readonly entryPoints: string[];
  buildPermTable(seed?: number): void;
  computeToTexture(
    width: number,
    height: number,
    params?: NoiseParameters,
    options?: NoiseComputeOptions,
  ): Promise<any>;
  computeToTexture3D(
    width: number,
    height: number,
    depth: number,
    params?: NoiseParameters,
    options?: NoiseComputeOptions,
  ): Promise<any>;
  getCurrentView(textureKey?: string): any;
  getCurrentTextureResource(textureKey?: string): {
    texture: any;
    view: any;
    width: number;
    height: number;
    layers: number;
    format: "rgba16float";
  } | null;
  destroyTexturePair(textureKey: string): void;
  destroyVolume(id: string | number): void;
  dispose(): void;
}

export const studioSeed: number;
export interface StudioPlanetNoiseMap {
  side: number;
  values: Float32Array;
  min: number;
  max: number;
  mean: number;
  reliefScale?: number;
  featureDensity?: number;
  ocean?: { seed: number; datum: number | null };
  impactBasins?: { center: [number, number, number]; longitude: number; size: number }[];
  alluvium?: { side: number; values: Float32Array };
  glacialIce?: { side: number; values: Float32Array };
  invertedRidges?: [number, number, number][];
  regions?: { side: number; values: Uint32Array };
  glacialSites?: { overlook: [number, number, number]; head: [number, number, number] }[];
  landmarks?: Partial<Record<"impact" | "karst" | "rift" | "springs" | "dunes" | "arches", {
    overlook: [number, number, number];
    target: [number, number, number];
  }[]>>;
  springs?: { chart: [number, number, number, number]; side: number; values: Uint32Array };
  dunes?: { chart: [number, number, number, number]; side: number; values: Uint32Array; wind: [number, number, number] };
  rockSpans?: {
    direction: [number, number, number];
    span: [number, number, number];
    depth: [number, number, number];
    size: number;
    rise: number;
    tint: number;
    site: { overlook: [number, number, number]; target: [number, number, number] };
    vertices: Float32Array;
  }[];
}
export function createStudioPlanetNoise(
  seed?: number,
  options?: { reseedLayers?: boolean },
): {
  seed: number;
  sphereOffset: number;
  sphereOffset2: number;
  layers: { entryPoint: string; params: NoiseParameters }[];
};
export function bakeStudioPlanetNoise(
  device: GPUDeviceLike,
  options?: {
    seed?: number;
    segments?: number;
    reseedLayers?: boolean;
    erosion?: boolean;
    geology?: "mixed" | "alpine" | "mesa" | "volcanic";
    variation?: number;
    rangeWeight?: number;
    landscape?: "natural" | "mesas" | "fractal" | "mosaic";
    landscapeStrength?: number;
    featureDensity?: number;
    /** Target flooded fraction of the surface for eroded maps, between 0 and 1. */
    oceanCoverage?: number;
    /** Give the eroded world a dry surface and large lunar impact basins. */
    lunar?: boolean;
    /** Density of smaller craters on lunar terrain, from 0 to 1. */
    craterDetail?: number;
    /** Carve ice-filled fault valleys on a lunar world. */
    cryoGlaciers?: boolean;
    /** Include local landmark patches in eroded maps. Defaults to true. */
    landmarkPatches?: boolean;
  },
): Promise<StudioPlanetNoiseMap>;
export function sampleStudioPlanetNoise(
  map: StudioPlanetNoiseMap,
  direction: Vec3,
): number;
