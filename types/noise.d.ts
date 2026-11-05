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
  },
): Promise<StudioPlanetNoiseMap>;
export function sampleStudioPlanetNoise(
  map: StudioPlanetNoiseMap,
  direction: Vec3,
): number;
