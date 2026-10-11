import type {
  Algorithm,
  GPUOptions,
  CommonSettings,
  RawRenderer,
  WorldView,
} from "./common.js";
export type { WorldView } from "./common.js";
export interface TerrainSettings extends CommonSettings {
  algorithm: Algorithm;
  pixelError: number;
  nearRadius: number;
  uniform: boolean;
  infinite: boolean;
  wireframe: boolean;
  trees: { enabled?: boolean; distance?: number };
}
export interface TerrainOptions extends GPUOptions {
  worldSize?: number;
  tileSize?: number;
  maxDivs?: number;
  memoryMB?: number;
  buildsPerFrame?: number;
  settings?: Partial<TerrainSettings>;
}
export interface TerrainRenderer extends RawRenderer {
  vegetation: Trees;
  algorithm: Algorithm;
  options: TerrainOptions;
  readPatch(id: number): Promise<{ data: Float32Array; divs: number }>;
}
export const TerrainRenderer: {
  new (
    canvas: import("./common.js").CanvasLike,
    options?: TerrainOptions,
  ): TerrainRenderer;
};
export function createTerrain(
  canvas: import("./common.js").CanvasLike,
  options?: TerrainOptions,
): Promise<WorldView<TerrainSettings, TerrainRenderer>>;
export interface Trees {
  enabled: boolean;
  distance: number;
  stats: Record<string, any>;
  initialize(): Promise<this>;
  dispose(): void;
  [key: string]: any;
}
export const Trees: { new (terrain: TerrainRenderer): Trees };
export const TerrainField: {
  height(x: number, z: number, seed?: number): number;
  heightGradient(x: number, z: number, seed?: number): number[];
  estimatedError(step: number): number;
  wgsl: string;
  bounds: number[];
  [key: string]: any;
};
export const TerrainLOD: Record<string, any>;
export const TerrainPLOC: Record<string, any>;
export const TerrainSurface: Record<string, any>;
export const TerrainVegetation: Record<string, any>;
