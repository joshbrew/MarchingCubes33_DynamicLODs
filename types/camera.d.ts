import type {
  CameraOptions,
  CameraInput,
  Matrix4,
  Plane,
  Vec3,
  CanvasLike,
} from "./common.js";
export type {
  CameraOptions,
  CameraInput,
  CameraSource,
  Matrix4,
  Vec3,
  Plane,
} from "./common.js";
export function createCamera(options?: CameraOptions): CameraInput;
export function cameraFromThree(
  camera: any,
  options?: { height?: number; player?: Vec3 },
): CameraInput;
export function frustumPlanes(matrix: Matrix4): Plane[];
export function relativeCamera(camera: CameraInput): CameraInput;
export interface FlyCamera {
  position: number[];
  target?: number[];
  forward?: number[];
}
export interface FlyControls {
  enabled: boolean;
  speed: number;
  fly: boolean;
  followGround: boolean;
  clearance: number;
  update(dtSeconds: number): FlyCamera;
  dispose(): void;
}
export function attachFlyControls(
  canvas: CanvasLike,
  camera: FlyCamera,
  options?: {
    speed?: number;
    lookSpeed?: number;
    groundHeight?: (x: number, z: number) => number;
    clearance?: number;
    followGround?: boolean;
  },
): FlyControls;
