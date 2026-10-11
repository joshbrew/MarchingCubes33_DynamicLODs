import type {
  Algorithm,
  CanvasLike,
  GPUOptions,
  CommonSettings,
  RawRenderer,
  WorldView,
} from "./common.js";
export type { WorldView } from "./common.js";
export interface SpaceSettings extends CommonSettings {
  algorithm: Algorithm;
  mode: "mesh" | "points" | "hybrid";
  quality: number;
  uniform: boolean;
  pointSize: number;
  lodDistance: number;
  nearRadius: number;
  caves: boolean;
}
export interface SpaceOptions extends GPUOptions {
  maxInstances?: number;
  maxChunks?: number;
  geometryMB?: number;
  pointBudget?: number;
  workers?: number;
  workerURL?: string | { toString(): string };
  settings?: Partial<SpaceSettings>;
}
export interface SpaceRenderer extends RawRenderer {
  options: SpaceOptions;
}
export const SpaceRenderer: {
  new (canvas: CanvasLike, options?: SpaceOptions): SpaceRenderer;
};
export function createSpace(
  canvas: CanvasLike,
  options?: SpaceOptions,
): Promise<WorldView<SpaceSettings, SpaceRenderer>>;
export const SpaceWorld: Record<string, any>;
export const SpaceGeometry: Record<string, any>;
