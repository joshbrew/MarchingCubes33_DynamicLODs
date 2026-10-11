import type { Algorithm, GridSize, Vec3, GPUDeviceLike } from "./common.js";
export type { Algorithm, GridSize, GPUDeviceLike } from "./common.js";
export interface CoordinateOptions {
  type?: "cartesian" | "spherical" | "cube-sphere";
  face?: number;
  center?: Vec3;
  radius?: readonly number[];
  longitude?: readonly number[];
  latitude?: readonly number[];
}
export interface MeshData {
  positions: Float32Array;
  normals: Float32Array | null;
  triangleCount: number;
  bounds: { min: number[]; max: number[] };
}
export interface SurfaceOptions {
  field?: Float32Array;
  sample?: (x: number, y: number, z: number) => number;
  size?: GridSize;
  isoLevel?: number;
  algorithm?: Algorithm;
  coordinates?: CoordinateOptions;
  backend?: "cpu" | "gpu";
  device?: GPUDeviceLike;
  normals?: boolean;
}
export interface SphereOptions {
  points?: ArrayLike<number>;
  center?: Vec3;
  radius?: number;
  surface?: "outer" | "inner" | "both";
  thickness?: number;
  offset?: number;
  coordinates?: "cartesian" | "spherical" | "cube-sphere";
  size?: GridSize;
  algorithm?: Algorithm;
  backend?: "cpu" | "gpu";
  device?: GPUDeviceLike;
}
export interface SphereMesh extends MeshData {
  normals: Float32Array;
  fit: { center: number[]; radius: number; [key: string]: any };
  groups: {
    side: "outer" | "inner";
    radius: number;
    start: number;
    count: number;
  }[];
}
export function createSurface(options: SurfaceOptions): Promise<MeshData>;
export function createSphere(options?: SphereOptions): Promise<SphereMesh>;
export function extractCPU(
  field: Float32Array,
  size: GridSize,
  isoLevel?: number,
  algorithm?: Algorithm,
  options?: { coordinates?: CoordinateOptions },
): Float32Array;
export function extractGPU(
  device: GPUDeviceLike,
  field: Float32Array,
  size: GridSize,
  isoLevel?: number,
  algorithm?: Algorithm,
  options?: { coordinates?: CoordinateOptions },
): Promise<Float32Array>;
export function disposeGPU(device: GPUDeviceLike): Promise<void>;
export function createShader(algorithm: Algorithm): string;
export function brickDepthForLimits(
  size: GridSize,
  implementation: any,
  limits: Record<string, number>,
): number;
export const algorithms: Record<Algorithm, any>;
export const Bourke: Record<string, any>;
export const MC33: Record<string, any>;
export const MarchingCubes: {
  extractCPU: typeof extractCPU;
  extractGPU: typeof extractGPU;
  disposeGPU: typeof disposeGPU;
  createShader: typeof createShader;
  algorithms: typeof algorithms;
  brickDepthForLimits: typeof brickDepthForLimits;
};
export const Coordinates: {
  createMapper(
    options?: CoordinateOptions,
  ): (x: number, y: number, z: number) => number[];
  mapPositions(
    positions: Float32Array,
    options?: CoordinateOptions,
  ): Float32Array;
  sampleField(
    size: GridSize,
    sample: (x: number, y: number, z: number) => number,
    options?: CoordinateOptions,
  ): Float32Array;
  cartesianSampler(
    field: Float32Array,
    size: GridSize,
  ): (x: number, y: number, z: number) => number;
};
export const Fields: {
  generateSpherePoints(
    count: number,
    center: { x: number; y: number; z: number },
    radius: number,
  ): Float32Array;
  fitSphere(points: ArrayLike<number>): {
    center: number[];
    radius: number;
    [key: string]: any;
  };
  sphereSurfaces(
    fit: { center: Vec3; radius: number },
    surface?: "outer" | "inner" | "both",
    thickness?: number,
    offset?: number,
  ): { side: string; radius: number; iso: number }[];
  sphereSampler(fit: {
    center: Vec3;
    radius: number;
  }): (x: number, y: number, z: number) => number;
  refineSphereSurface(
    positions: Float32Array,
    fit: { center: Vec3; radius: number },
    boundary: { side: string; radius: number },
  ): { positions: Float32Array; normals: Float32Array };
  createScalarField(
    points: ArrayLike<number>,
    size: GridSize,
    k: number,
    epsilon?: number,
  ): { data: Float32Array; idx: (x: number, y: number, z: number) => number };
};
export function createGPUDevice(options?: {
  adapterOptions?: Record<string, unknown>;
  requiredFeatures?: string[];
  requiredLimits?: Record<string, number>;
  timestamps?: boolean;
}): Promise<GPUDeviceLike>;
export function isWebGPUSupported(): boolean;
