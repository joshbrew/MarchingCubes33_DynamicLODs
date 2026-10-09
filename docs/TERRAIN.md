# Adaptive terrain prototype

Run `npm install` and `npm start`, then open `index.html?demo=terrain`.
The 8,192 × 8,192 m procedural world contains 4,096 tiles of 128 × 128 m.
Each tile selects 64, 32, 16, 8, 4, or 2 horizontal cells per axis, giving
2–64 m spacing. No full-resolution world mesh or density volume is allocated.
Enable **Infinite terrain**, then **Fly through map** for a straight, continuous
flight through newly generated terrain. Manual flight also has no map boundary
in this mode. Space/E climb; C/Q descend; Shift speeds up manual movement.

**Render distance** selects a 300–32,000 m visibility limit (default 1,800 m).
Both CPU candidate selection and the fragment shader enforce this radial limit;
the camera far plane updates with it. Terrain renders without fog. Increasing
the range may exceed the fixed resident budget; the HUD reports this and the
closest tiles take priority.
The limit is an upper cutoff, not a guarantee that every tile out to it is
resident. The bounded map and infinite generation window are each 8 km wide;
raising the cutoff does not enlarge that window or the 64 MB atlas. Use
**Uniform full detail** with a large range to stress full-resolution rendering.

The renderer is native WebGPU. Three.js supplies camera/frustum math only.
The existing Cartesian/spherical MC33/Bourke isosurface demo stays available
at `marchingcubesclassic.html`.

## Selection and sampling

`TerrainLOD.select` combines estimated projected height error with a player
detail radius. Camera position, vertical FoV, framebuffer height and frustum
change selection. `camera.player` can differ from `camera.position` for a
third-person or detached camera. A 20% hysteresis band reduces oscillation;
selection runs at most 10 Hz while rendering continues every display frame.
The procedural spectrum supplies an **estimated** geometric error, not a
proof that every triangle meets a strict pixel-error bound.

A Morton-ordered hierarchy of 16-cluster SAH treelets accelerates frustum
queries. It follows the portable H-PLOC structure examined in `babylon-avbd`.
Because terrain tile bounds are static, this adaptation builds once on the
CPU and traverses preorder escape links. It does not copy the AVBD solver or
rebuild/refit a GPU tree every frame. Bounds conservatively cover the entire
procedural height range. Node visit counts and build time are available in
`renderer.stats`.

## Infinite generation

Infinite mode slides the 8 km candidate window in tile-aligned 1,024 m steps.
It translates frustum planes into the static hierarchy's local space, so window
motion does not rebuild the tree. Cache entries and previous LODs are remapped
to the overlapping world tiles. Their atlas slots and samples stay intact;
departing tiles release slots and entering visible tiles are generated and
refined incrementally. The minimap follows this moving window.

Noise is evaluated at absolute world coordinates with the same seed throughout
the flight. Newly generated terrain therefore joins existing terrain, and return
visits reproduce the same field. Generation writes GPU mesh samples directly;
there is no full-map texture or mesh regeneration on each window shift. The
same 2:1 balancing, stitching, draw batching and memory budget apply to both
bounded and infinite modes. Switching infinite mode off resets the demo to
the original bounded map; Reset returns to the starting position in either mode.

Automatic infinite flight follows the heading captured when it starts, while
dragging can look around. It follows terrain height smoothly; Space/C adjust
flight clearance and the camera stays at least 8 m above the terrain.

Compute generates world-space height and its analytic gradient directly into
a resident GPU buffer. Normal evaluation uses the same continuous field at
every LOD, so normals agree at shared vertices. No mesh data is mapped or
downloaded during normal rendering. `readPatch` exists solely for verification.

The fixed atlas budget defaults to 64 MB and is checked against the device's
buffer/storage limits. New visible tiles first receive a cheap coarse patch;
nearby refinements take priority once coverage is established. Up to eight
tiles are generated per frame. Finer cached samples also serve coarser draws,
so zooming out does not trigger resampling. LRU eviction reuses slots belonging
to tiles outside the current working set. A resident-capacity warning appears
if the visible working set exceeds the atlas; nearest tiles then have priority.

## MC33/Bourke specialization and seams

This terrain path specializes the signed field `F(x,y,z)=y-height(x,z)`.
There is one surface crossing per vertical column and no caves or overhangs.
A vertical slab bounded by the conservative world height range has a constant
MC sign pattern. The imported Bourke or MC33 polygonizer supplies that cell's
triangle topology once; indexed templates reuse it at each horizontal LOD.
GPU computation then evaluates only the height vertices, avoiding the cost of
marching a redundant 3D volume. The templates have upward-facing terrain winding.

Desired neighboring grids are balanced to a maximum 2:1 resolution ratio.
During streaming, rendering only coarsens finer resident grids to maintain the
same invariant. This prevents a partially generated working set from requiring
unsupported transitions.

Each finer tile owns its stitch. Affected 2×2 blocks become perimeter fans;
odd boundary vertices are omitted and both corners and adjacent edge stitches
are handled in the same template. Coarse and fine borders therefore contain
identical segments and world samples. These are actual shared edge positions,
not skirts or hidden gaps. All 16 edge masks are tested for manifold connectivity,
orientation and complete tile area. Tile samples need not be regenerated when
a neighbor changes LOD; only the index template changes.

Tiles with the same LOD and stitch mask share index buffers and an instance
batch. Vertex shaders fetch resident samples using the instance's atlas slot
and sample stride. Normal mode uses at most 16 batches per level (96 total for
six levels), instead of one draw call per tile. Line templates provide wireframe
inspection. There are no indirect-count readbacks, query waits or geometry
uploads during steady rendering.

## Measurements

Settled camera views now retain their culling/LOD selection, 2:1 balance,
stitch groups and GPU instance records. Changes to the camera, projection,
settings, resident detail, world window or algorithm rebuild the relevant plan.
The render loop still submits the frame and updates camera uniforms; it avoids
repeating balance/group work and uploading unchanged terrain instance data.
An 80-frame fixed-view diagnostic compared rebuilding draw groups with reusing
them, trees disabled: median CPU submit was 0.400 ms versus 0.200 ms locally.
This measures CPU submission, not a claim of doubled FPS. Re-run
`tests/terrain-webgpu.html` on the target hardware.

## Instanced forests

**Instanced trees** toggles deterministic vegetation, enabled by default.
**Tree distance** ranges from 200 to 2500 m and is also limited by terrain
render distance. Water, high ground and steep slopes reject trees; seeded grove
density, positions, sizes, rotations and colors reproduce on return visits.

Three shared meshes provide fuller conifers nearby, two simpler foliage layers
at medium distance, and two crossed silhouettes far away. Projected tree height
selects detail with hysteresis. CPU frustum and distance culling, a 16,000-tree
view cap, a 512-tile vegetation cache, and at most three instanced draws keep
cost bounded. Far trees fade with screen-door dithering; they retain depth and
do not need transparent sorting. This is a geometric prototype, not textured
botanical assets, wind animation or shadow rendering.

Each root stores barycentric weights for its actual rendered terrain triangle,
including all 16 stitch masks. The GPU reads those three resident height samples
to anchor it. Refinement, algorithm changes and recentering refresh attachments
without generating new tree meshes. This avoids hovering/sinking trees when the
sampled terrain differs from its analytic height. Tree selection/uploads are
retained for settled views and update at most 10 Hz during ordinary movement;
changed terrain draw plans refresh roots immediately.

The HUD separates terrain triangles/draws from tree instance counts and their
three LOD populations. The default local preview showed 2093 trees across
138 fine / 1478 medium / 477 distant instances, in three vegetation draws.
GPU render time includes trees when enabled. Compare LOD keeps vegetation
settings fixed, with tree LOD driven by the same camera in both terrain modes.

## Timing and comparisons

The HUD distinguishes frame time, GPU render time, CPU submission, current
geometry, resident capacity and pending tile generation. The sample counter
compares **active mesh vertices** to the same visible tiles at uniform maximum
resolution; it does not represent fresh evaluations every frame. Generated
sample totals are available separately in `renderer.stats.samples`.

GPU timings use optional timestamp queries in a three-slot asynchronous ring,
sampled once every 20 frames. `gpuMs` measures the render pass;
`generationGpuMs` measures the compute pass when generation is present. These
exclude queue wait and browser compositing. Frame time includes browser
scheduling and other workloads; it is not GPU execution time.

**Compare LOD** resets and holds a fixed camera, waits for generation to settle,
warms each mode, then collects two seconds of adaptive and uniform full-detail
measurements. It restores the previous sampling mode. Controls are held during
the measurement to preserve its view. The report includes triangles, draw calls,
CPU submission, GPU rendering and frame time. Close other GPU workloads for a
clean comparison. This benchmark measures steady rendering, not streaming or
startup compilation; **Fly through map** exercises movement and cache updates.

The [recorded local comparison](terrain-benchmark.md) reduced 2,506,752 uniform
triangles to 195,912 adaptive triangles (92.2%) at the same camera. It includes
the measured timings and their limits.

## Reuse

Import the renderer from the ESM bundle (or the package entry):

```js
import { TerrainRenderer } from 'marching-cubes-bourke-mc33';

const renderer = await new TerrainRenderer(canvas, {
  worldSize: 8192, tileSize: 128, maxDivs: 64,
  memoryMB: 64, buildsPerFrame: 8
}).initialize();

renderer.configure({ pixelError: 2.5, nearRadius: 110, infinite: true });
renderer.algorithm = 'mc33'; // or 'bourke'

// Once per frame, provide a column-major OpenGL view-projection matrix and
// six inward-facing world frustum planes [nx,ny,nz,constant].
renderer.render({
  position: [x,y,z], player: [px,py,pz], height: canvas.height,
  fov: verticalFovRadians, far: farDistance, viewProjection
}, planes, performance.now(), { lodColors: false, wireframe: false });

renderer.dispose();
```

`TerrainField` contains the procedural height/gradient and error estimate;
replace both its JavaScript and WGSL definitions, conservative bounds, and
error model together when supplying a different terrain field. This prototype
does not yet load heightmap datasets or implement sparse volumetric/cave chunks.
Its heightfield stitch templates cannot be used as general MC33 volume transitions.

## Checks

- `npm test`: includes the original MC33 checks and terrain hierarchy, LOD,
  analytic-gradient and all-edge seam topology tests.
- `/tests/terrain-webgpu.html`: compares GPU samples/normals with the CPU field,
  checks warm-cache reuse and adaptive geometry reduction, moves the camera
  across the map, verifies 2:1 adjacency and bounded residency, and validates
  both surface algorithms plus wireframe/color rendering. It also checks distance
  culling, exact sample reuse on recentering, and travel/return visits out to 32 km.
  Tree batches/toggle/cache bounds and stationary draw-plan reuse are checked,
  with a diagnostic CPU timing comparison. CPU tests also verify deterministic
  forests and barycentric roots on every stitch mask for both algorithms.
- `/tests/webgpu.html`: retains the full general MC33/Bourke CPU/GPU comparisons.

The inspection of the previous projects is recorded in
`docs/terrain-source-review.md`.
