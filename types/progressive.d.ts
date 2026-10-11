import type {
  CanvasLike,
  GPUOptions,
  CommonSettings,
  RawRenderer,
  WorldView,
} from "./common.js";
export type { WorldView } from "./common.js";
export interface ProgressiveSettings extends CommonSettings {
  pixelError: number;
  wireframe: boolean;
  tileBorders: boolean;
}
export interface ProgressiveOptions extends GPUOptions {
  rootSize?: number;
  minSize?: number;
  divs?: number;
  memoryMB?: number;
  maxTiles?: number;
  buildsPerFrame?: number;
  settings?: Partial<ProgressiveSettings>;
}
export interface ProgressiveTerrainRenderer extends RawRenderer {
  options: ProgressiveOptions;
  readTile(
    id: string,
  ): Promise<{ node: any; data: Float32Array; divs: number }>;
}
export const ProgressiveTerrainRenderer: {
  new (
    canvas: CanvasLike,
    options?: ProgressiveOptions,
  ): ProgressiveTerrainRenderer;
};
export function createProgressiveTerrain(
  canvas: CanvasLike,
  options?: ProgressiveOptions,
): Promise<WorldView<ProgressiveSettings, ProgressiveTerrainRenderer>>;
export const ProgressiveTerrainField: {
  height(x: number, z: number, seed?: number): number;
  heightGradient(x: number, z: number, seed?: number): number[];
  estimatedError(step: number): number;
  bounds: number[];
  wgsl: string;
  detailBands: number[][];
};
export const ProgressiveTerrainLOD: Record<string, any>;
