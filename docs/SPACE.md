# Infinite volumetric space

Open `space.html` on the same localhost server. **Display** offers connected
meshes everywhere, true 3D surface points everywhere, or meshes nearby and points
far away. **Mesh only is the default.** Dot silhouettes in point modes are intentional. Mesh only retains a
closed triangle surface at every distance. Controls match terrain: drag to look,
WASD fly, Space/E up, C/Q down, Shift faster. The flythrough follows its starting
direction while you look around. Focus buttons jump to a floating island,
ringed planet or asteroid. Render distance ranges from 2 to 32 km.
The Sphere / Terrain / Infinite space links are at the top of every demo's controls.
Islands are solid by default; enable **Island caves** to carve shoulder cavities.

**LOD distance** ranges from 500 to 16,000 m (default 4000). Its distance bands
are 12%, 25%, 50%, 100%, 200%, 400% and 600% of that distance, followed by
the coarsest level. At the default, the new far bands begin at 8, 16 and 24 km.
Increasing it retains finer geometry farther away. **Near detail** forces the
finest mesh within 0–2000 m (default 250) of a body's conservative bounding sphere.
An estimated projected-error check can retain a finer level for large silhouettes
even beyond a distance band. **Full detail** forces level 0. The HUD lists actual
drawn populations for all eight mesh levels, including temporary cached fallbacks.

## Geometry and streaming

Deterministic 2.4 km sectors contain seven bodies plus the featured bodies where
applicable. Positions include independent X, Y and Z; spheres, asteroids, torus
rings and carved islands use actual signed 3D density fields. This path is not
the terrain heightfield specialization. Two background workers extract the
full Cartesian volumes through the imported MC33 or Bourke implementations.
Meshes have eight levels: asteroids use 48/36/28/20/16/10/6/4 Cartesian
divisions and islands use 64/48/32/24/16/10/6/4. Planets keep the original
64/48/36/28/24 volumetric levels nearby. Levels 5–7 use closed radial meshes
with 16/12/8 longitude segments fitted to the planet density field, plus an
explicit closed torus for ringed variants. Sparse Cartesian sampling would
otherwise lose the thin ring. These far planet proxies are shared by both
extractors. For variant 0, the farthest meshes cost 56 triangles per asteroid
or island and 112 per ringed planet. Surface gradients supply smooth normals. The extractor's winding is
preserved, choosing its outward convention once for the entire mesh; per-face
gradient flipping at sharp creases previously caused visible missing triangles.
Space geometry also places MC33 code-12 interior fans at the centroid of their
connected boundary vertices. The cloud port's cell-center placement could fold
fans around sharp cave/solid edges. This adjustment keeps the table connectivity
and shared face vertices; the general extraction API's cloud convention is unchanged.
Solid and cave-bearing islands have distinct cache keys, so changing the cave
toggle cannot reuse the other field's surface.

Four deterministic field variants per body type share immutable GPU geometry.
Different centers, radii, rotations and tints are GPU instances; shapes are
repeated rather than uniquely extracted for every body. Requested large-body
detail has priority over distant coarse bootstrap work. While workers finish,
a cached coarse mesh or point sample can temporarily appear.

Point clouds use deterministic unique vertices of the finest extracted mesh.
The 8192/2048/512/128/32/8/2/1 tiers are prefixes of the same surface cloud,
clamped to its available samples. Each sample has a real 3D position, surface
normal and depth; the GPU draws its small screen-facing dot. These are not
body-sized billboard images. The finest mesh may have fewer than 8192 unique
vertices, and random prefixes do not guarantee even surface coverage.

Mesh detail uses an estimated projected error; it is not a proven error bound.
Hybrid handoff has a 30–42 pixel hysteresis interval and only uses point clouds
for small silhouettes. Their sample count accounts for point size. Point-only
mode permits sparse larger silhouettes for inspecting the cloud. Mesh LODs and
point density tiers also have dead bands. Transitions are discrete, not morphed.

CPU sector selection runs at up to 10 Hz while the view changes. A stationary
view reuses its selection, instance batches and uploaded instance data. Movement,
projection/viewport changes, settings changes and new resident geometry invalidate
the applicable caches. Conservative sector and body bounds
are frustum/radial culled before GPU submission. Geometry is grouped by shape,
LOD and point count for instanced draws. Global CPU positions are doubles and
GPU centers are camera relative, avoiding growing floating-point position error
during long flights. Bodies regenerate deterministically on return visits.

## Budgets and measurements

Defaults cap a visible working set at 2048 sectors and 12,000 bodies, cached
sectors at 4096, resident geometry at 64 MB, and drawn point samples at 600,000.
Closest bodies/sectors have priority. The HUD reports budget limits. Maximum
distance is a cutoff, not a guarantee that everything out to it fits the view
budgets. Unlike the sliding terrain window, space sectors populate the full 3D
frustum up to the requested distance until a budget is reached.

Workers upload completed geometry once; production frames do not read meshes
back from the GPU. CPU instance/frame arrays are reused. Optional timestamp
queries measure the render pass asynchronously every 20 frames; they exclude
worker extraction, browser compositing and scheduling. Frame time includes
browser scheduling. No texture or external image asset is used for the bodies.

The local `tests/space-stress-webgpu.html` run uses the production budgets and
a 1280 × 720 CSS canvas. At 32 km, the five-level baseline drew 9,971,348
triangles; eight levels drew 2,020,660 triangles (79.7% fewer), with the exact
same 8425 solid mesh bodies in 72 draws. Its drawn level populations were
2/6/19/83/337/1520/2668/3790. No bodies were replaced with points or removed
to obtain these savings. Stationary CPU submission averaged 0.370 ms over
60 frames on this machine. These measurements depend on viewport, device and
camera position; they are not a frame-rate guarantee. The test verifies all
eight drawn levels, stationary cache reuse, movement invalidation, 99 km travel
and production cache/view budgets with GPU validation enabled.

`tests/space-webgpu.html` checks both extractors, warm cache reuse, vertical
and 99 km travel, 32 km view distance, return visits and all memory/view budgets.
It verifies mesh-only/solid-island defaults, the five near mesh levels during
camera travel, both distance controls, and switching solid/carved island caches.
CPU tests check deterministic 3D sectors, nested samples, representation
hysteresis, closed surfaces, and consistent directed island edges in all four
variants at all eight detail levels for both algorithms, with caves both on and off.
Additional checks verify closed outward sphere/ring proxy components fitted to
the original field in all four planet variants and all three far levels.
