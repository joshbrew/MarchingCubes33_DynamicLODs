import type {
  CameraInput,
  CanvasLike,
  GPUDeviceLike,
  GPUOptions,
  Vec3,
} from "./common.js";
import type { StudioPlanetNoiseMap } from "./noise.js";
export type PlanetPresetId =
  | "lakeshore"
  | "utahish"
  | "volcanic"
  | "desert"
  | "forest"
  | "oceanic"
  | "ice"
  | "ice2"
  | "mars-dawn"
  | "badlands"
  | "jungle"
  | "toxic"
  | "lavender-dusk"
  | "gas-giant"
  | "copper-oxide"
  | "moon-dust"
  | "coral-sea"
  | "verdigris-sea"
  | "amethyst-tide"
  | "lunar-highlands"
  | "basalt-mare"
  | "titan"
  | "io"
  | "pluto"
  | "ceres";
export const PlanetPresets: ReadonlyArray<
  Readonly<{ id: PlanetPresetId; name: string; wet: boolean }>
>;
export interface PlanetNoiseDetail {
  range: "hybrid" | "ridges" | "rolling";
  landscape: "natural" | "mesas" | "fractal" | "mosaic";
  landscapeStrength: number;
  relief: number;
  slopes: "erosion" | "incised" | "soft";
  ground: "erosion" | "incised" | "soft";
  slopeOctaves: number;
  groundOctaves: number;
  erosionStrength: number;
  variation: number;
}
export interface PlanetOptions extends GPUOptions {
  radius?: number;
  seed?: number;
  studioSeed?: number;
  divs?: 8 | 16 | 32;
  maxTiles?: number;
  tileBudget?: number;
  /** Limit new terrain splits per update and favor the center of the view. */
  streamingLod?: boolean;
  /** Draw a lightweight atlas view while the full terrain pipelines compile. */
  progressiveStartup?: boolean;
  minSpacing?: number;
  preset?: PlanetPresetId;
  /** Include the legacy local landmark patches. Defaults to false. */
  landmarkPatches?: boolean;
  /** Base terrain sampling resolution. Defaults to 1000, or 1536 for smaller worlds. */
  atlasSegments?: number;
  /** Select per-vertex noise generation or the baked atlas. Defaults to cached. */
  terrainSampling?: "cached" | "procedural";
  detail?: Partial<PlanetNoiseDetail>;
}
export interface PlanetSample {
  height: number;
  depth: number;
  land: number;
  lake: boolean;
}
export interface PlanetStats {
  tiles: number;
  leaves: number;
  triangles: number;
  grades: number;
  finest: number;
  cpuMs: number;
  gpuMs: number | null;
  selectionMs: number;
  planBuilds: number;
  drawCalls: number;
  instanceBytes: number;
  baseTileBuilds?: number;
}
export class PlanetRenderer {
  constructor(canvas: CanvasLike, options?: PlanetOptions);
  readonly canvas: CanvasLike;
  readonly device: GPUDeviceLike;
  readonly stats: PlanetStats;
  readonly errors: string[];
  readonly terrainSampling: "cached" | "procedural";
  readonly preset: PlanetPresetId;
  readonly studioSeed: number;
  readonly radius: number;
  readonly oceanLevel: number | null;
  readonly geology: "mixed" | "alpine" | "mesa" | "volcanic";
  readonly detail: Readonly<PlanetNoiseDetail>;
  initialize(): Promise<this>;
  /** Maximum tile budget for this device and terrain sampling mode. */
  maxTileBudget(sampling?: "cached" | "procedural"): number;
  configure(settings?: {
    pixelError?: number;
    lodScale?: number;
    tileBudget?: number;
    preset?: PlanetPresetId;
    studioSeed?: number;
    radius?: number;
    detail?: Partial<PlanetNoiseDetail>;
    terrainSampling?: "cached" | "procedural";
  }): Promise<void>;
  sampleSurface(direction: Vec3): PlanetSample;
  /** Read the generated base height at a direction for close flight. */
  probeSurface(direction: Vec3): Promise<PlanetSample | null>;
  sampleLandforms(direction: Vec3): { alpine: number; canyon: number; granite: number; volcanic: number };
  resize(): void;
  render(
    camera: CameraInput & { clearance?: number },
    now?: number,
    options?: {
      lodColors?: boolean;
      wireframe?: boolean;
      /** Sun orbit in turns. Defaults to a fixed angle at 0. */
      sunPhase?: number;
      atmosphere?: "preset" | "blue" | "amber" | "violet" | "teal" | "thin";
    },
  ): PlanetStats;
  dispose(): void;
}
export function createPlanet(
  canvas: CanvasLike,
  options?: PlanetOptions,
): Promise<PlanetRenderer>;
export const PlanetField: {
  readonly radius: number;
  readonly seed: number;
  readonly elevationBound: number;
  studioHeightScale(radius?: number): number;
  studioOceanLevel(
    map: StudioPlanetNoiseMap,
    seed: number,
    radius?: number,
  ): number | null;
  studioElevationBounds(
    map: StudioPlanetNoiseMap,
    radius?: number,
    geology?: PlanetRenderer["geology"],
  ): [number, number];
  dot(a: Vec3, b: Vec3): number;
  cross(a: Vec3, b: Vec3): number[];
  unit<T extends Vec3>(
    v: T,
  ): T extends Float32Array | Float64Array ? T : number[];
  clamp(value: number, min: number, max: number): number;
  noise3(x: number, y: number, z: number, seed?: number): number;
  surface(
    direction: Vec3,
    radius: number | undefined,
    seed: number | undefined,
    preset: PlanetPresetId | undefined,
    studioMap: StudioPlanetNoiseMap,
    oceanLevel?: number | null,
    geology?: PlanetRenderer["geology"],
    detail?: PlanetNoiseDetail,
  ): PlanetSample;
};
export interface PlanetTile {
  key: number;
  face: number;
  level: number;
  x: number;
  y: number;
  u: number;
  v: number;
  size: number;
  dir: number[];
  visible: boolean;
}
export const PlanetLOD: {
  cube(face: number, u: number, v: number): number[];
  project(position: Vec3): [face: number, u: number, v: number];
  neighbors(
    tile: PlanetTile,
    leaves: Map<number, PlanetTile>,
  ): Array<PlanetTile | undefined>;
  selectPlanet(
    camera: CameraInput & { clearance?: number },
    options?: Pick<
      PlanetOptions,
      "radius" | "divs" | "maxTiles" | "minSpacing"
    > & {
      pixelError?: number;
      lodScale?: number;
      elevationBounds?: readonly [number, number];
      sampleRelief?: (tile: PlanetTile) => readonly [elevation: number, variation: number];
    },
    previous?: Set<number>,
  ): {
    leaves: Map<number, PlanetTile>;
    visible: Array<PlanetTile & { mask: number; spacing: number }>;
    split: Set<number>;
  };
};
