# Local terrain comparison — 2026-10-08

Measured with the demo's **Compare LOD** control in the Codex in-app browser,
using native WebGPU and the optional GPU timestamp feature. Both modes used
the same reset camera, MC33 heightfield topology, a settled resident cache,
and two seconds of samples after warming. The sphere demo was also open.
These are observations of this local run, not hardware-independent targets.
This baseline predates infinite generation and the fog-free radial distance cap.

World: 8,192 × 8,192 m; 128 m tiles; maximum 64 cells per tile axis (2 m spacing).
Adaptive settings: estimated 2.5 px error, 110 m player detail radius, 60° FoV.

| Metric | Adaptive | Uniform full detail |
| --- | ---: | ---: |
| Visible triangles | 195,912 | 2,506,752 |
| Instance batches / draws | 20 | 1 |
| Mean browser frame time | 8.79 ms | 11.30 ms |
| Mean CPU submission | 1.57 ms | 2.84 ms |
| Mean GPU render pass | 0.09 ms | 0.57 ms |

Adaptive rendering used **92.2% fewer triangles** in this view. GPU timestamps
measure the render pass, excluding generation, queue wait and compositing.
Frame time includes browser scheduling and concurrent workloads. Timing can
vary substantially between runs; the built-in control makes the comparison
repeatable for the current machine and viewport.

The adaptive view used approximately 107k active mesh vertices versus 1,293k
uniform vertices, with 306 drawn tiles and 35 stitched tiles. The atlas remained
at its 64 MB cap (496 slots), with 315 resident tiles and no pending generation.

Verification also ran a separate 2 km terrain with a deliberately small 4 MB
atlas to force eviction. GPU samples/normals matched the CPU analytic field
(maximum height discrepancy about 0.00004 m). Camera teleports exercised LRU
eviction and confirmed bounded residency and balanced 2:1 adjacency throughout
streaming. Both surface algorithms, wireframe and LOD colors passed WebGPU
validation. All 16 seam masks also passed CPU manifold/area checks.
