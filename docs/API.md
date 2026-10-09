# API and shader guide

[Back to the getting-started guide](../README.md)

The [runnable sphere example](../examples/sphere.js) is the starting point.
This guide adds the details needed to supply your own data or change the source.

## Contents

- [Input and output](#input-and-output)
- [Draw the triangle data](#draw-the-triangle-data)
- [Run extraction on the GPU](#run-extraction-on-the-gpu)
- [Spherical coordinates](#spherical-coordinates)
- [Other exports](#other-exports)
- [WGSL and worker imports](#wgsl-and-worker-imports)
- [Scope and source attribution](#scope-and-source-attribution)

## Input and output

```js
extractCPU(field, size, isolevel, algorithm, options);
await extractGPU(device, field, size, isolevel, algorithm, options);
```

| Argument    | Meaning                                                                     |
| ----------- | --------------------------------------------------------------------------- |
| `field`     | A `Float32Array` with one number per grid point. All values must be finite. |
| `size`      | `{ x, y, z }`, with integer dimensions of at least 2.                       |
| `isolevel`  | The value whose boundary you want. Defaults to `0`.                         |
| `algorithm` | `"bourke"` or `"mc33"`. Defaults to `"bourke"`.                             |
| `options`   | Optional coordinate mapping, described below.                               |
| `device`    | An initialized WebGPU `GPUDevice`; only needed by `extractGPU`.             |

`Coordinates.sampleField(size, callback)` fills the array for you, calling the
callback with normalized coordinates from 0 to 1. To fill it yourself, store a
sample at grid indices `(x, y, z)` in `field[(z * size.y + y) * size.x + x]`.
There must be exactly `size.x * size.y * size.z` samples.

Both extractors return a `Float32Array` of vertex positions:

```text
x1, y1, z1, x2, y2, z2, x3, y3, z3, ...
|____________ one triangle ____________|
```

There are no indices or normals in this result. Without a coordinate mapping,
positions occupy the normalized box `[0,1]³`. Apply a scale and translation in
your renderer to place that box in your world.

## Draw the triangle data

The extraction library has no Three.js dependency. If your application already
uses Three.js, this helper converts the returned positions into a mesh:

```js
import * as THREE from "three";

export function meshFromPositions(positions) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshNormalMaterial({ side: THREE.DoubleSide });
  return new THREE.Mesh(geometry, material);
}
```

Pass it the result of `extractCPU` or `extractGPU`, then add the returned mesh
to your existing scene. The complete camera, renderer and animation setup is in
[`src/demo.js`](../src/demo.js). Each algorithm retains its source table's winding
convention; the helper above renders both sides. Shared-vertex smoothing or
field-gradient normals are separate steps.

## Run extraction on the GPU

Use this in a browser module at the repo root, after building. It prints the
triangle count in the browser console. It needs a WebGPU-enabled browser and
the local server or an HTTPS host.

```js
import { Coordinates, extractGPU, disposeGPU } from "./dist/index.esm.js";

if (!navigator.gpu) throw new Error("This browser does not provide WebGPU.");
const adapter = await navigator.gpu.requestAdapter();
if (!adapter) throw new Error("No WebGPU adapter is available.");
const device = await adapter.requestDevice();

try {
  const size = { x: 32, y: 32, z: 32 };
  const field = Coordinates.sampleField(
    size,
    (x, y, z) => Math.hypot(x - 0.5, y - 0.5, z - 0.5) - 0.3,
  );
  const positions = await extractGPU(device, field, size, 0, "mc33");
  console.log(`${positions.length / 9} triangles`);
} finally {
  await disposeGPU(device);
  device.destroy();
}
```

In an application, keep your device alive and reuse it. The extractor caches
pipelines and lookup buffers per device. Call `disposeGPU(device)` when finished
with those extraction resources. Destroy the device only if your application
also no longer needs it.

Extraction splits large volumes into overlapping Z sample bricks to fit GPU
storage limits. The returned triangle data is read back to the CPU. The first
call includes compilation, so compare warm calls when measuring extraction time.
The space and terrain renderers have separate streaming/rendering paths.

## Spherical coordinates

The input still needs a structured grid. Coordinate options change where that
grid samples the world; they do not make arbitrary scattered points a valid input.

| Mapping       | Grid axes                                             |
| ------------- | ----------------------------------------------------- |
| `cartesian`   | X, Y, Z in a box                                      |
| `spherical`   | Longitude, latitude, radius                           |
| `cube-sphere` | Face U, face V, radius; extract each of the six faces |

This complete example makes a radius-0.33 sphere centered at the origin. Save it
at the repo root as a JavaScript module, or use it in a served browser module:

```js
import { Coordinates, extractCPU } from "./dist/index.esm.js";

const size = { x: 65, y: 33, z: 17 };
const coordinates = {
  type: "spherical",
  longitude: [-Math.PI, Math.PI],
  latitude: [-Math.PI / 2, Math.PI / 2],
  radius: [0.1, 0.6],
  center: [0, 0, 0],
};
const field = Coordinates.sampleField(
  size,
  (x, y, z) => Math.hypot(x, y, z) - 0.33,
  coordinates,
);
const positions = extractCPU(field, size, 0, "mc33", { coordinates });
console.log(`${positions.length / 9} triangles`);
```

Pass the same `coordinates` to sampling and extraction. `extractGPU` accepts the
same options after the algorithm argument. Angular ranges use radians.
Spherical defaults are longitude `[-π,π]`, latitude `[-π/2,π/2]`, radius
`[0.02,0.7]` and center `[0.5,0.5,0.5]`.

Full longitude coverage duplicates the seam samples. Latitude poles collapse
to single points, so some triangles may be degenerate. Cube-sphere mapping
avoids the latitude poles: use `type: "cube-sphere"` and `face: 0` through `5`,
sampling the same world-space function on each face's shared boundaries.

Extraction interpolates within the sample grid, then maps positions to the world.
GPU coordinate mapping currently runs on the CPU after readback. Triangles are
flat approximations of a curved domain.

## Other exports

Import these names from the same library entry:

| Export                                                                             | Purpose                                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `extractCPU`, `extractGPU`, `disposeGPU`                                           | General surface extraction and cleanup                                    |
| `Coordinates`                                                                      | Sample grids and map positions                                            |
| `Fields`                                                                           | Sphere fitting, sphere shell helpers and the older Gaussian field utility |
| `Bourke`, `MC33`                                                                   | Lower-level polygonizers                                                  |
| `MarchingCubes`                                                                    | Namespace containing the extraction functions                             |
| `createShader`, `algorithms`, `brickDepthForLimits`                                | Shader generation, algorithm metadata and GPU sizing                      |
| `TerrainRenderer`, `Trees`                                                         | Browser WebGPU terrain and instanced vegetation                           |
| `TerrainField`, `TerrainLOD`, `TerrainPLOC`, `TerrainSurface`, `TerrainVegetation` | Terrain building blocks                                                   |
| `SpaceRenderer`, `SpaceWorld`, `SpaceGeometry`                                     | Browser space rendering, object generation and geometry                   |

Importing the built library in Node requires no DOM or WebGPU device.
Initializing a renderer requires a browser canvas and WebGPU. Renderer integration
is covered in the [terrain guide](TERRAIN.md) and [space guide](SPACE.md), with
complete usage in [`src/terrain/demo.js`](../src/terrain/demo.js) and
[`src/space/demo.js`](../src/space/demo.js).

## WGSL and worker imports

WGSL is the language used by the GPU programs. Source files import shader text:

```js
import renderShader from "./shaders/render.wgsl";
```

The import is relative to the module containing it. Tinybuild's loader setting
`{ ".wgsl": "text" }` embeds the text. The shader files live in
[`src/shaders`](../src/shaders), [`src/terrain/shaders`](../src/terrain/shaders)
and [`src/space/shaders`](../src/space/shaders).

Space imports its background worker with:

```js
import workerURL from "./space.worker.js";
const worker = new Worker(workerURL);
```

Tinybuild's blob-worker plugin bundles that worker and its imports. The settings
are in [`tinybuild.config.js`](../tinybuild.config.js); the demo build is in
[`tinybuild.web.config.js`](../tinybuild.web.config.js).
If you bundle the raw source in another project, use the same WGSL loader and
worker plugin. If you import a built `dist/` library file, no such build setup
is needed in the receiving project.

## Scope and source attribution

MC33's tables and WGSL face/interior ambiguity decisions come from the planet
cloud shader in `vibe_code_experiments/noiseCompute/tools/clouds`. JavaScript
decisions come from that project's MC33 demo. Cloud-specific projection,
temporal filtering, noise generation and normal smoothing are separate from
this general extraction port. Its code-12 vertex uses the cell center;
space geometry adjusts that interior fan placement for its own fields.

The sphere demo fits the source points, extracts each shell boundary separately
and projects the result onto that fitted sphere, with radial normals. The inner
surface sits one shell thickness inside the outer surface. These fitting and
projection steps belong to the sphere example, rather than general extraction.
The older Gaussian utility remains available as `Fields.createScalarField`.

The [third-party notices](../THIRD_PARTY_NOTICES.md) contain attribution, including
the [Paul Bourke isosurface reference](https://paulbourke.net/geometry/polygonise/).
