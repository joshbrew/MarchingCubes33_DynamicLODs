# Marching Cubes — Bourke and MC33

## [Try Me!!](https://marchingcubeswebgpu.netlify.app/)

**Adaptive terrain demo** (`index.html?demo=terrain`) — an 8 × 8 km
GPU terrain map with player/camera-driven sampling, stitched LODs, a resident
cache, an optional infinite flythrough, a render-distance slider, and an
adaptive-vs-uniform benchmark. Space climbs and C descends; terrain has no fog.
Instanced forests have three tree LODs, their own distance slider, and roots
attached to the current stitched terrain triangles. Settled views reuse draw plans.
See [terrain documentation](docs/TERRAIN.md)
and [the HPLOC / older LOD source review](docs/terrain-source-review.md).

**Infinite space demo** (`index.html?demo=space`) streams a 3D field of
asteroids, floating islands with optional caves, and ringed planets. Choose adaptive
meshes, nested surface point clouds, or a hybrid; MC33 and Bourke both extract
the full volumetric shapes. Mesh only is the default, with eight mesh detail levels,
LOD distance and near-detail controls. Demo links are at the top of each page. Fly in any
direction, adjust distance up to 32 km, and enable LOD colors or full detail to
compare. See [space documentation](docs/SPACE.md).

Switch between classic [Paul Bourke isosurfaces](https://paulbourke.net/geometry/polygonise/)
and Marching Cubes 33 on CPU or WebGPU. The sphere demo fits the actual source
points and reconstructs a tight shell. Algorithm changes reuse the same samples.

MC33's lookup tables and WGSL face/interior ambiguity decisions come from the
planet cloud shader in `vibe_code_experiments/noiseCompute/tools/clouds`. The
matching JavaScript decisions come from that project's MC33 demo. The previous
experimental center-fan method has been replaced by the full MC33 pattern selection.

## Recorded benchmark views

These screenshots are checked into [`docs/benchmarks`](docs/benchmarks) so the
visual result and the measurements stay with the implementation.

![Current tinybuild terrain with instanced trees and adaptive versus uniform benchmark](docs/benchmarks/terrain-tinybuild-benchmark.jpg)

Captured from the built Netlify folder on 2026-10-09 with trees enabled, a 1280 ×
720 viewport and the default 1800 m terrain cutoff. The same warm camera draws
184,928 terrain triangles adaptively versus 1,753,088 at uniform detail (89.5%
fewer). Mean GPU render time was 0.32 ms versus 0.91 ms; CPU submission was
0.28 ms versus 0.33 ms. Both modes averaged 16.68 ms including browser scheduling.
The forest uses 2,093 trees in three draw batches: 138 near, 1,478 mid-distance,
and 477 far instances. Triangle counts above describe terrain; timings include
the tree pass. Historical captures remain in `docs/benchmarks/`.

![Current tinybuild infinite space at 32 km with eight mesh LOD levels](docs/benchmarks/space-tinybuild-32km.jpg)

The space view was captured on 2026-10-09 with render bundles and mesh-only
rendering at the 32 km limit: a 1092 × 764 CSS viewport with a 1638 × 1146 render
buffer. The HUD shows 1,943,932 triangles across 7,456 bodies in 69 draws, with
all eight mesh levels active. The separate 1280 × 720 stress comparison held its
8,425 visible bodies constant and reduced the five-level baseline from 9,971,348
to 2,020,660 triangles (79.7% fewer). These are local captures; timings vary with
browser, viewport, and GPU.

Space also caches WebGPU render bundles and updates a GPU camera offset between
visibility cuts. A local 120-frame moving-camera test at 32 km reduced average
CPU submission from 9.45 to 2.57 ms, with 18 instance/bundle rebuilds instead of
120. The HUD now separates FPS, frame/GPU time, CPU submission and culling/batch
peaks; GPU render time excludes browser compositing and scheduling.
Streaming also prefers coarser resident meshes while requested LODs load,
avoiding temporary fine-mesh triangle spikes when expanding the view.

## Run the demo

Use Node.js 20 or newer. Run `npm install`, then `npm start`, and open the
address printed by the server. Tinybuild builds and serves the project.
The single `index.html` selects sphere, terrain or space using `?demo=sphere`,
`?demo=terrain` or `?demo=space`. Three.js is bundled locally with the demo;
the library has no Three.js dependency or CDN requirement.

Use **Algorithm**, **Compute**, and **Coordinates** to select the extraction
method. Choose **Outer only**, **Inner only**, or **Both**, adjust the shell
thickness or surface offset, and enable wireframe to inspect the result. CPU is the
default; WebGPU requires a supported browser and a secure context (localhost or
HTTPS). Unsupported browsers retain CPU mode. Timings include extraction and
geometry preparation; GPU timings include compilation on the first run and readback.
`npm run build` creates the library formats and demo bundle in `dist/`, plus
the deployable `site/index.html` and `site/dist/`. Netlify uses the included
`netlify.toml`: build command `npm run build`, publish directory `site`.
Any static HTTPS host can serve the contents of `site/`; localhost also works.
The older demo URLs redirect to the corresponding view of `index.html`.

## Reusable extraction API

The source is plain JavaScript with ESM imports/exports. Tinybuild produces
`dist/index.esm.js` for ESM in browsers or Node, `dist/index.cjs` for Node
`require()`, and `dist/index.js` for a regular browser script exposing
`globalThis.MarchingCubes`. The package's conditional exports select the matching
format automatically. Build the library alone with `npm run build:library`.

```js
import { extractCPU, extractGPU, Coordinates } from 'marching-cubes-bourke-mc33';
const size = { x: 32, y: 32, z: 32 };
const field = new Float32Array(size.x * size.y * size.z);
// Fill field[(z * size.y + y) * size.x + x] with scalar samples.

const positions = extractCPU(field, size, 0.5, 'mc33');
// In a WebGPU browser with an existing GPUDevice:
// const positions = await extractGPU(device, field, size, 0.5, 'mc33');
```

For direct browser use, import from `./dist/index.esm.js` in a module script,
or load `<script src="./dist/index.js"></script>` and call
`MarchingCubes.extractCPU(...)`. Node CommonJS consumers can use
`const { extractCPU } = require('marching-cubes-bourke-mc33')`.

The same entry exports `TerrainRenderer`, `Trees`, `SpaceRenderer`, and the
`TerrainField`, `TerrainLOD`, `TerrainPLOC`, `TerrainSurface`, `TerrainVegetation`,
`SpaceWorld`, `SpaceGeometry`, `Fields`, `Coordinates`, `Bourke` and `MC33` helpers.
Importing the package in Node needs no DOM or WebGPU device; renderers require
browser canvases and WebGPU when initialized.

GPU programs live in `src/shaders/`, `src/terrain/shaders/` and
`src/space/shaders/`. They use ordinary imports such as
`import shader from './shaders/render.wgsl'`; tinybuild's `.wgsl: 'text'` loader
embeds the shader text. The space worker uses the same `.worker.js` import and
blob-worker plugin as the cloud project, so all built library formats contain
their worker code without extra files or caller-relative worker URLs. When
bundling source in another project, use the WGSL loader and worker plugin from
`tinybuild.config.js`; the already-built ESM bundle needs neither plugin.

Both methods return `Float32Array` triangle soup `[x,y,z, x,y,z, ...]`.
Use `'bourke'` or `'mc33'` for the algorithm. Without a coordinate option, output
occupies the normalized Cartesian domain `[0,1]^3`. Each algorithm preserves its
source table's winding convention; the demo renders both sides.

The GPU runner caches pipelines and lookup buffers per device, splits the volume
into overlapping Z sample bricks, reads back only emitted vertices, and destroys
temporary buffers after each brick. Capacity accounts for Bourke's maximum 15
vertices per cell and MC33's maximum 36. Call `await MarchingCubes.disposeGPU(device)`
when done with the cached GPU resources.

## Spherical and cloud coordinates

MC33 extracts on a structured grid; it can use Cartesian cells or cells in a
coordinate parameterization. Both algorithms support:

| Mode | Grid axes | Options |
| --- | --- | --- |
| `cartesian` | x, y, z | Normalized `[0,1]^3` |
| `spherical` | longitude, latitude, radius | `longitude`, `latitude` in radians; `radius`, `center` |
| `cube-sphere` | face u, face v, radius | `face` from 0 to 5; `radius`, `center` |

```js
import { Coordinates, extractCPU } from 'marching-cubes-bourke-mc33';
const coordinates = {
  type: 'spherical',
  longitude: [-Math.PI, Math.PI],
  latitude: [-Math.PI / 2, Math.PI / 2],
  radius: [0.1, 0.6],
  center: [0, 0, 0]
};
const field = Coordinates.sampleField(size,
  (x, y, z) => Math.hypot(x, y, z) - 0.33, coordinates);
const positions = extractCPU(field, size, 0, 'mc33', { coordinates });
// extractGPU accepts the same options after the algorithm argument.
```

Spherical defaults are longitude `[-pi,pi]`, latitude `[-pi/2,pi/2]`, radius
`[0.02,0.7]`, center `[0.5,0.5,0.5]`. `sampleField` duplicates the longitude seam
for full-circle grids. Latitude poles collapse to single world-space points;
pole triangles can be degenerate. For uniform angular sampling without pole
singularities, use the cloud shader's `cube-sphere` mapping and extract all six
faces, sampling the same world-space field at shared boundaries.

Extraction interpolates in parameter coordinates, then maps the result into
world coordinates. GPU coordinate mapping currently happens on the CPU after
readback. Triangles remain flat approximations of the curved domain. The cloud
shader's code-12 vertex uses the cell center; cloud-specific projection, temporal
filtering, noise generation, and normal smoothing are not part of this port.

The demo fits a sphere to the generated point cloud by least squares, samples
`distance(center, position) - fittedRadius` directly in each coordinate system,
and caches those grids. Offset 0 puts the outer boundary at the point-cloud radius;
the inner boundary sits one shell thickness inside it. Each boundary is extracted
independently, so a thin shell cannot disappear between grid samples. Extracted
vertices are projected onto their fitted sphere and receive smooth radial normals,
with inward winding/normals for the inner surface and collapsed pole triangles
removed. Both panels use identical camera positions and scale.

This fitting step is specific to spherical point clouds; it is not a general
point-cloud reconstruction algorithm. The original summed Gaussian utility remains
available as `Fields.createScalarField`. Reusable extraction APIs still accept
arbitrary scalar fields without fitting or projection. Comparing algorithms within
a coordinate mode uses identical samples; switching modes changes the lattice.

## Verification

- `npm test`: mask coverage, ambiguity decisions, shared faces, closed meshes,
  coordinate mappings/seams, input validation, GPU brick limits, and ESM / Node
  CommonJS / browser-global package parity. Tests run against the built package.
- Run `npm run build:checks`, serve the repo, and open `tests/webgpu.html`: 56 CPU/WebGPU geometry and winding
  comparisons, including all masks, exact crossings, split bricks, spherical
  mapping, all six cube-sphere faces, and tight inner/outer sphere boundaries.
- `tests/terrain-webgpu.html`: terrain generation, stitches, caching, infinite
  travel, instanced tree LODs, and a fixed-view CPU draw-plan comparison.
- `tests/space-webgpu.html`: actual worker extraction/GPU rendering, all display
  modes, adaptive/full-detail comparison, vertical/99 km travel, and cache budgets.
- `tests/space-stress-webgpu.html`: 32 km comparison of five versus eight mesh
  levels with identical visible bodies and production budgets; stationary batch
  reuse and all eight drawn LODs.

See `THIRD_PARTY_NOTICES.md` for source attribution.
