# Source review for the terrain LOD work

Inspected on 2026-10-08. The source repositories were read without modification.
The new implementation lives in this marching-cubes repository.

## `babylon-avbd`

The substantive tree implementation is `src/gpu/gpuHploc.js` plus
`src/gpu/hplocpp.wgsl` and `hplocSort.wgsl`, described in `docs/HPLOC.md`.
It builds conservative AABBs, sorts Morton keys, merges mutual nearest neighbors
by surface-area cost within 16-cluster treelets, publishes hierarchy levels at
dispatch boundaries, and traverses escape links without a bounded stack.
Dynamic bodies refit every step and periodically rebuild. Its own documentation
identifies it as a portable treelet variant, rather than the paper's single-launch
wave algorithm.

`demo/hploc.js` is a smaller Morton-code demo helper and should not be mistaken
for the full current hierarchy. Terrain adopts the current treelet and traversal
ideas. Static terrain bounds make a once-built CPU hierarchy appropriate for the
few thousand tile candidates here; GPU BVH rebuilds would add work without
changing the tile bounds.

## `3dfractals/webgpubuild/shaders`

The existing attempts provide useful intentions: world-space brick transforms,
distance-based stride, cached mesh data and face transition patches. Several
implementation issues prevent using them unchanged:

| Location | Finding | Consequence |
| --- | --- | --- |
| `marchingCubesBricksLOD.wgsl:130–139` | `step` controls which invocations survive, but samples still use `G + OFF[c]` rather than `G + OFF[c] * step`. | Coarser LOD skips unit-size cells and leaves gaps instead of extracting larger cells. |
| `marchingCubesBricksLOD.wgsl:96–105,190` | `putVert` reserves individual vertices and `putTri` reserves and copies another triple into the same output/counter. | Scratch and triangle output are mixed; counts include extra vertices and the output is not a clean triangle stream. |
| `marchingCubesBricksLOD.wgsl:203–230` | Transition cells add offsets to maximum-face sample coordinates and read an `opp` point outside the brick; minimum-face subtraction can wrap unsigned coordinates. | Transition samples do not have a valid neighbor/halo contract and can read outside the intended field. |
| `lod2Compute.wgsl:70–79` | Lower `divs` changes the row stride to `divs+1`, without selecting spaced vertices from the original full-resolution VBO. | The output addresses a smaller prefix of the old grid rather than an evenly coarsened tile. |
| `lod3Compute.wgsl` and `lodCompute.js:163–164` | The 3D shader expects a LOD-size table, counter and index output at bindings 1, 2 and 3; the host binds only counter/index at 1 and 2. | Host and shader resource layouts disagree. |
| `lodCompute.js:181–190` | `resize` invokes the class constructor as an ordinary function. | JavaScript classes cannot be reinitialized this way. |
| `meshBuilderLODExample.js:32–38` | The example supplies positional constructor parameters while the current builder expects dimension/options objects. | The example no longer matches the implementation. |
| `hploc.js:15` | Imports `hplocpp.wgsl`, while the inspected folder contains `hploc.wgsl`. | The old example is not a working reference for the current AVBD hierarchy. |

The new heightfield path samples directly at the chosen grid spacing, uses
correct row/stride metadata when rendering finer cached samples coarsely,
balances adjacent resolutions, and tests every transition edge combination.
It builds on the marching-cubes tables already ported here, instead of wiring
the unchecked transition shader into the new renderer.

For arbitrary 3D density fields, a subsequent volumetric transition implementation
must explicitly define fine/coarse sample ownership, halo access, ambiguous
MC33 face decisions and output capacity. The heightfield perimeter templates
do not establish those general volumetric guarantees.
