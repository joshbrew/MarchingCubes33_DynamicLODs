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
=======
Turn a grid of numbers into a 3D shape made of triangles.

Think of a stack of graph paper. Each grid point says whether it is inside or
outside a shape. Marching cubes connects the boundary between the two.
**Bourke** and **MC33** are two ways to make those connections. You can try both.

The terrain and space demos also use **LOD**, short for _level of detail_:
nearby things get more triangles, faraway things get fewer.

## Contents

- [Run it](#1-run-it)
- [Try the demos](#2-try-the-examples): [Sphere](#sphere-turn-points-into-a-surface) · [Terrain](#terrain-detailed-ground-and-trees) · [Space](#space-asteroids-islands-and-planets)
- [Movement controls](#moving-around)
- [What the sliders and performance numbers mean](#which-sliders-should-i-change)
- [Make a sphere in JavaScript](#3-make-a-sphere-in-javascript)
- [Use it in another project](#4-use-it-in-another-project)
- [Deploy to Netlify](#5-put-the-demos-on-netlify)
- [Checks and further reading](#checks-and-further-reading)

## 1. Run it

Install **Node.js 20 or newer**, download or clone this repo, and open a terminal
inside its folder. Run:

```sh
npm install
npm start
```

Open the address printed by the server. Keep that terminal running.
You should see the sphere demo, with **Sphere**, **Terrain** and **Infinite space**
buttons at the top. Use those buttons to switch demos.

The sphere works in CPU mode without WebGPU. Terrain, space and GPU extraction
need a browser with WebGPU enabled, served locally or over HTTPS.
Use the server above; double-clicking the HTML file will not run the demos correctly.

## 2. Try the examples

### Sphere: turn points into a surface

1. Open **Sphere**. The left panel shows dots; the right shows the triangle surface.
2. Change **Algorithm** between **Bourke isosurfaces** and **Marching Cubes 33**.
3. Change **Surface** to **Outer only**, **Inner only**, or **Both**.
4. Leave **Surface offset** at `0` to keep the outer surface the same size as the dots.
5. Turn on **Wireframe** to see the individual triangles.

**Shell thickness** controls how far inside the outer surface the inner surface
sits. **Compute → WebGPU** runs extraction on the graphics card.
**Coordinates** lets you try a regular box-shaped grid, spherical sampling,
or the six faces of a cube wrapped around a sphere.

This example fits a sphere to sphere-shaped point clouds. It does not reconstruct
arbitrary objects from scattered points.

### Terrain: detailed ground and trees

1. Open **Terrain** and expand **Terrain controls** if they are collapsed.
2. Leave **Sampling** at **Adaptive LOD** and **Instanced trees** enabled.
3. Turn on **LOD colors** or **Wireframe** to see detail change with distance.
4. Enable **Infinite terrain**, then click **Fly through map** to keep generating ground.

To repeat the benchmark pictured below, reload the terrain demo, leave its
defaults in place, and click **Compare LOD**. Wait for the result panel.
It compares adaptive detail against full detail at the same camera position,
with trees enabled. Default terrain distance is `1800 m`; tree distance is `1400 m`.

![Terrain with trees and the adaptive versus full-detail comparison](docs/benchmarks/terrain-tinybuild-benchmark.jpg)

Recorded here: **184,928 terrain triangles instead of 1,753,088**—89.5% fewer—
with 2,093 trees. Terrain triangle counts exclude trees; render timings include them.
Your counts and timings can differ with window size and hardware.

### Space: asteroids, islands and planets

1. Open **Infinite space** and expand **Space controls** if needed.
2. Keep **Display → Mesh only** for solid surfaces at every distance.
3. Click **Start flythrough**. Drag to look around while you fly.
4. Turn on **LOD colors** to see the eight mesh detail levels.
5. For a heavier test, raise **Render distance** from `9 km` to `32 km`.

Use **Floating island**, **Ringed planet** or **Asteroid** to jump near an example.
**Island caves** adds intentional openings. The point-cloud display modes show
dots instead of solid triangles, so gaps between dots are expected.

![Space at 32 km with FPS, CPU and GPU readings](docs/benchmarks/space-tinybuild-32km.jpg)

This captured view draws 7,456 bodies with about 1.94 million triangles.
The separate 32 km stress test compares five versus eight detail levels:
**9.97 million → 2.02 million triangles** for the same 8,425 bodies.
See [space measurements](docs/SPACE.md#budgets-and-measurements) for the test conditions.

### Moving around

Click the terrain or space view before using the keyboard.

| Action                          | Control                        |
| ------------------------------- | ------------------------------ |
| Look around                     | Hold the mouse button and drag |
| Move                            | W / A / S / D                  |
| Go up / down                    | Space / C                      |
| Move faster                     | Hold Shift                     |
| Return to the starting position | Reset                          |

### Which sliders should I change?

| Setting                | What it does                                                |
| ---------------------- | ----------------------------------------------------------- |
| Render distance        | How far away things may be drawn. Lower it for less work.   |
| Terrain: Pixel error   | How much simplification to allow. Higher means less detail. |
| Terrain: Player detail | The area around you that keeps high detail.                 |
| Terrain: Tree distance | How far away trees may be drawn.                            |
| Space: Detail spacing  | How much simplification to allow. Higher means less detail. |
| Space: LOD distance    | Lower values switch to simpler meshes sooner.               |
| Space: Near detail     | The area around you that keeps the finest meshes.           |

Render distance is a limit, not a promise to fill the entire view. Both demos
have memory and object limits. Terrain keeps an 8 km window around its generated
map; infinite mode moves that window as you travel. Space fills a 3D region.

**Reading performance:** FPS means frames per second; higher is smoother.
Frame time is milliseconds per frame; lower is better (`20 ms ≈ 50 FPS`).
GPU render time measures only drawing on the graphics card. CPU work, generating
shapes and browser overhead also affect FPS, so a `3 ms` GPU reading does not
mean the whole frame took `3 ms`.

## 3. Make a sphere in JavaScript

After the build, run the included example:

```sh
node examples/sphere.js
```

It prints triangle counts for both algorithms. Here is the complete example:

```js
import { Coordinates, extractCPU } from "../dist/index.esm.js";

const size = { x: 32, y: 32, z: 32 };

// At each grid point: negative = inside the sphere, positive = outside.
const field = Coordinates.sampleField(
  size,
  (x, y, z) => Math.hypot(x - 0.5, y - 0.5, z - 0.5) - 0.3,
);

export function makeSphere(algorithm = "mc33") {
  // Find the surface where the sampled numbers cross zero.
  return extractCPU(field, size, 0, algorithm);
}

for (const algorithm of ["bourke", "mc33"]) {
  const positions = makeSphere(algorithm);
  console.log(`${algorithm}: ${positions.length / 9} triangles`);
}
```

The import path above is for a file in `examples/`. The result is a flat
`Float32Array`: every three numbers are an `x, y, z` point; every three points
make a triangle. That is why triangle count is `positions.length / 9`.
The values in this example occupy a box from `0` to `1` on each axis.

Change `0.3` to change the radius. Increase `32` on all three axes for a finer
grid and more work. Replace the distance formula to make a different shape.
Extraction makes the triangle data; your renderer draws it.

For the same calculation in a browser, keep the server running and open
`examples/browser.html` under the server address. It displays the triangle counts.

## 4. Use it in another project

Build just the reusable library:

```sh
npm run build:library
```

Copy the file matching your project from `dist/`:

| Your project                      | File           | How to use it                                                                        |
| --------------------------------- | -------------- | ------------------------------------------------------------------------------------ |
| Browser or Node with ES modules   | `index.esm.js` | `import { extractCPU, Coordinates } from "./dist/index.esm.js";`                     |
| Node with CommonJS                | `index.cjs`    | `const { extractCPU, Coordinates } = require("./dist/index.cjs");`                   |
| Browser with a regular script tag | `index.js`     | Load `<script src="./dist/index.js"></script>`, then use `MarchingCubes.extractCPU`. |

Adjust paths to where you copied the file. Each built library file includes its
shaders and worker code. No Three.js dependency is needed for the library.

To install it as a local package instead, run `npm pack` in this repo. In your
other project, run `npm install` followed by the path to the generated `.tgz` file.
Then import from `"marching-cubes-bourke-mc33"` instead of a file path.

[The API guide](docs/API.md) covers GPU extraction, drawing the result,
spherical coordinates, shader imports and the other exported helpers.

## 5. Put the demos on Netlify

<<<<<<< Updated upstream
See `THIRD_PARTY_NOTICES.md` for source attribution.
=======
Run:

```sh
npm run build
```

The ready-to-host files are in **`site/`**: one `index.html` and a `dist/` folder.
Upload that folder to a static HTTPS host, or connect the repo to Netlify with:

| Netlify setting   | Value           |
| ----------------- | --------------- |
| Build command     | `npm run build` |
| Publish directory | `site`          |

The included `netlify.toml` already supplies those settings.
The three views use `index.html?demo=sphere`, `index.html?demo=terrain` and
`index.html?demo=space` on whichever host you use.

## Checks and further reading

`npm test` builds the library and runs the CPU and package checks.

For GPU checks, run `npm run build:checks`, then `npm run serve` if the server
is not already running. Open these paths under its address:

| Page                             | What it checks                                      |
| -------------------------------- | --------------------------------------------------- |
| `tests/webgpu.html`              | CPU and GPU extraction agree                        |
| `tests/terrain-webgpu.html`      | Terrain, seams, trees and travel                    |
| `tests/space-webgpu.html`        | Space meshes, points, streaming and both algorithms |
| `tests/space-stress-webgpu.html` | The 32 km comparison and moving-camera performance  |

For source changes, run `npm run build` again and refresh the demo.
Use `npm run build:checks` again after changing GPU check code.

- [API and shader guide](docs/API.md)
- [How terrain works](docs/TERRAIN.md)
- [How space works, including performance measurements](docs/SPACE.md)
- [Where the terrain LOD ideas came from](docs/terrain-source-review.md)
- [Credits and third-party notices](THIRD_PARTY_NOTICES.md)

MIT licensed. The [original CodePen](https://codepen.io/mootytootyfrooty/pen/pvJREbv)
shows an older, classic-only version.
>>>>>>> Stashed changes
