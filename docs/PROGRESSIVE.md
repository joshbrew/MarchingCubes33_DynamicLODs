# Progressive noise tiles

Open **Noise tiles** in the demo navigation (`index.html?demo=progressive`).
Click **Near the ground**, or lower **Height**, and watch the finest spacing
change. Turn on **LOD colors**, **Tile edges** or **Wireframe** to see the tiles.
Use **Start flythrough** to keep moving over newly generated ground.

The idea is like zooming into a map: keep the overview, request smaller pieces
where you need them, then recycle pieces you have left behind. Here those pieces
are generated from noise on your GPU, instead of downloaded.

## What actually gets finer

Each tile contains **33 × 33 height/gradient samples**, stored in a small region
of one GPU texture atlas. A shared indexed grid draws those samples as a real
triangle surface. A 1,024 m tile has 32 m mesh spacing. Splitting it into four
children halves the spacing; the default 1 m minimum tile reaches **3.125 cm**.
That is 64 times finer along each axis than the original terrain demo's 2 m
minimum spacing. There are eleven available scales at the default root size.

The field combines the terrain demo's hills with seven extra noise octaves,
from 4 m down to 6.25 cm wavelengths. Small bumps change the mesh height and its
analytic normal. This is a heightfield specialization using the existing MC33
grid topology, rather than a full 3D voxel volume; it does not create caves.

Tiles sample **absolute world coordinates and the same seed**. A tile has no
independent random border. Coarse and fine tiles agree wherever their samples
meet, including across negative coordinates. The noise is continuous across
tile boundaries; the whole landscape is not a repeating image.

## Keeping memory and frame work bounded

- The default atlas has **380 slots / 6.3 MiB** of RGBA32F storage. Its size stays
  fixed while you descend or travel. Depth, index, instance and uniform buffers
  add a small amount of renderer memory; the atlas reading is not total GPU memory.
- Selection estimates the screen-space error of the noise octaves using camera
  height, field of view and distance. Lower **Tile detail** preserves smaller
  bumps. Generated detail surrounds the player in every heading, so turning
  needs no new noise tiles or quadtree selection. A separate cheap visibility
  pass culls draw tiles every frame using conservative height bounds.
- The budget includes parents and children. A parent stays visible until all four
  children are generated; resident cuts are balanced to 2:1 and use the existing
  stitched border templates. No skirts hide gaps.
- At most six tiles are generated per frame. Requests first establish coarse
  coverage, then refine it. Moving very quickly can temporarily show coarser ground.
- The cache retains useful old tiles and evicts unused ones when it fills.
  Revisiting an evicted location regenerates identical noise.
- Tiles with the same seam mask share an instanced draw. Render bundles are reused
  until the resident cut, visibility or wireframe mode changes. Tiles can draw
  a subset of their samples when projected error and seam constraints permit.
  A stationary view
  neither regenerates noise nor rebuilds the render bundle.
- Raising render distance may enlarge the coarsest tile size to fit the same
  allocation. Requested detail can exceed the budget; **detail budget reached**
  means the planner kept complete coverage and stopped adding finer tiles.

For comparison, a dense 4 km square at 3.125 cm spacing would contain over
16 billion samples: roughly 244 GiB at the same 16 bytes per sample. This demo
stores only the requested patches, with a fixed 6.3 MiB atlas.

## Controls

| Control                      | What it does                                                      |
| ---------------------------- | ----------------------------------------------------------------- |
| Height                       | Distance above the local surface, from 25 cm to 2,048 m.          |
| Tile detail                  | Allowed surface error in pixels; lower values keep smaller bumps. |
| Render distance              | Visible range from 256 m to 8,192 m.                              |
| Follow ground                | Maintains your chosen clearance while moving.                     |
| From above / Near the ground | Jump between overview and close inspection.                       |
| LOD colors / Tile edges      | Reveal the scales and tile footprints.                            |
| Wireframe                    | Draw the actual stitched mesh edges.                              |

Drag to look, WASD to move, Space/C to rise/descend, and Shift to move faster.
Movement slows near the ground so you can inspect small features. The map also
zooms as you descend. **Reset view** returns to the initial camera.

## Reuse it

The built ESM, browser-global and CommonJS libraries export
`ProgressiveTerrainRenderer`, `ProgressiveTerrainField` and `ProgressiveTerrainLOD`.
The renderer has no Three.js dependency; the demo uses Three.js only for camera
matrices. A camera input is an object with `position: [x,y,z]`, `height` in pixels,
`fov` in radians, `far` in metres and a column-major `viewProjection` matrix.
It accepts an OpenGL-style depth projection and converts it to WebGPU depth.

```js
import { ProgressiveTerrainRenderer } from "./dist/index.esm.js";

const terrain = await new ProgressiveTerrainRenderer(canvas, {
  rootSize: 1024,
  minSize: 1,
  divs: 32,
  memoryMB: 8,
  maxTiles: 384,
  buildsPerFrame: 6,
}).initialize();

terrain.configure({ pixelError: 2 });
// In your animation loop, using your camera and its six frustum planes:
const stats = terrain.render(cameraInput, planes, performance.now(), {
  lodColors: false,
  tileBorders: true,
  wireframe: false,
});
// When removing the renderer:
terrain.dispose();
```

Planes are `[normalX, normalY, normalZ, constant]`, with the interior on the
nonnegative side. You can pass `[]` to disable frustum culling. `rootSize`, `minSize`
and `divs` must be powers of two, with `minSize <= rootSize` and `2 <= divs <= 128`.
Small memory budgets must still fit at least 48 tiles. Constructor settings control
allocation; `configure({ pixelError })` changes selection without reallocating.
`memoryMB` and `maxTiles` are upper bounds; atlas packing can leave a few slots
unused. `maxTiles` must be an integer from 48 to 1,024.

Source: [renderer](../src/progressive/renderer.js),
[planner](../src/progressive/lod.js), [CPU field](../src/progressive/field.js),
[noise shader](../src/progressive/shaders/field.wgsl),
[tile generation and drawing shader](../src/progressive/shaders/tiles.wgsl),
[complete camera/animation example](../src/progressive/demo.js).
Shader files use tinybuild's `.wgsl` text loader. To substitute another noise
function, update the CPU field and GPU field together, and update the conservative
bounds used by the planner. GPU generation uses a fixed seed of 7 in this example.

This demonstration does not implement erosion, surface edits, volumetric caves,
or planet-scale floating origins. Geometry changes discretely when a split becomes
ready; it is stitched but does not morph between levels. At very large world
coordinates, GPU float precision limits centimetre detail.

## Verification

`npm test` covers budgets, near/far detail, partial-generation coverage, 2:1
balance, negative coordinates, shared samples, seams and analytic gradients.
After `npm run build:checks`, open `tests/progressive-webgpu.html` under your server
address to check actual generated samples and shared GPU borders, progressive
fallback, bundle reuse, deterministic regeneration, distant travel, 8 km range
and WebGPU validation.

The GPU check also rotates through 360 degrees and verifies that no new tiles
or selections occur. It prints renderer CPU p95/max times and peak triangles
for the turn, plus CPU selection/cut timings during travel. These are renderer
measurements, not an FPS benchmark; browser scheduling and other work also
affect frame time.

The recorded check on October 10, 2026 used a 60° FOV, 2 km range, 0.75 m
clearance and the default 2 px detail target. The camera's detail-resolution input
was 900 px, with a 640 × 400 test canvas. After the cache settled:

| Check | Measured result |
| ----- | --------------- |
| Full turn, 120 headings | **221,568 peak triangles**, zero new tiles or selections |
| Renderer CPU during the turn | **0.50 ms p95**, 0.90 ms maximum |
| Travel, forty 2 m steps | **7.40 ms p95**, 8.10 ms maximum renderer CPU |
| Tile cache throughout travel and revisits | **6.3 MiB**, fixed allocation |
| Shared GPU border samples | Eight mixed-resolution borders matched exactly |

Travel forces a selection opportunity every step at simulated 130 ms intervals;
the check waits for submitted GPU work between steps. These values are one local
run, not a performance guarantee. [Recorded output](benchmarks/progressive-webgpu.txt)
includes the generation, eviction, seam and validation results. To repeat it,
build the checks and open the GPU test page described above.
