export type Vec3 = readonly number[] | Float32Array | Float64Array;
export type Matrix4 = readonly number[] | Float32Array | Float64Array;
export type Plane = readonly number[];
export type Algorithm = "bourke" | "mc33";
export interface GridSize {
  x: number;
  y: number;
  z: number;
}
export interface CanvasLike {
  width: number;
  height: number;
  readonly clientWidth?: number;
  readonly clientHeight?: number;
  getContext(id: "webgpu"): unknown;
}
/** Structural device type: no @webgpu/types or DOM types are required for Node users. */
export interface GPUDeviceLike {
  features: { has(feature: string): boolean };
  destroy(): void;
  [key: string]: any;
}
export interface GPUOptions {
  device?: GPUDeviceLike;
  format?: string;
  pixelRatio?: number;
}
export interface CameraOptions {
  position?: Vec3;
  target?: Vec3;
  forward?: Vec3;
  up?: Vec3;
  player?: Vec3;
  fov?: number;
  near?: number;
  far?: number;
  aspect?: number;
  height?: number;
}
export interface CameraInput {
  position: Vec3;
  player: Vec3;
  fov: number;
  near: number;
  far: number;
  aspect: number;
  height: number;
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  skyForward?: Vec3;
  tanX: number;
  tanY: number;
  pixelScale: number;
  viewProjection: Matrix4;
  planes: Plane[];
}
export type CameraSource =
  | CameraOptions
  | CameraInput
  | { isPerspectiveCamera: true; [key: string]: any };
export interface DrawOptions {
  lodColors?: boolean;
  wireframe?: boolean;
  tileBorders?: boolean;
}
export interface CommonSettings {
  renderDistance: number;
  lodColors: boolean;
}
export interface RawRenderer {
  canvas: CanvasLike;
  device: GPUDeviceLike;
  stats: Record<string, any>;
  errors: string[];
  disposed: boolean;
  initialize(): Promise<this>;
  configure(settings: Record<string, unknown>): void;
  resize(): void;
  render(
    camera: CameraInput,
    planes: readonly Plane[],
    now: number,
    draw?: DrawOptions,
  ): Record<string, any>;
  dispose(): void;
}
export interface WorldView<Settings, Renderer = RawRenderer> {
  readonly kind: "terrain" | "space" | "progressive";
  readonly renderer: Renderer;
  readonly stats: Record<string, any>;
  readonly errors: string[];
  readonly settings: Partial<Settings>;
  readonly disposed: boolean;
  configure(settings: Partial<Settings>): this;
  render(
    camera?: CameraSource,
    options?: { now?: number; planes?: readonly Plane[] },
  ): Record<string, any>;
  dispose(): void;
}
