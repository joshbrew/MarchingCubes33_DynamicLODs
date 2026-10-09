# MC33 source and attribution

The MC33 lookup data in `src/mc33Tables.js` and the decision functions in
`src/shaders/mc33-core.wgsl` were imported from this project's cloud shader work:

- `vibe_code_experiments/noiseCompute/tools/clouds/mc33Tables.js`
- `vibe_code_experiments/noiseCompute/tools/clouds/shaders/planetCloudSurfaceMC33.wgsl`

The JavaScript face/interior tests and pattern selection in `src/mc33.js` were
adapted from the matching `vibe_code_experiments/marchingcubes33.html` implementation.
They use the cloud shader's negative-value classification and center-vertex convention.

The reference lookup table credits MC33_LookUpTable.h: programmed by David Vega
(dvega@uc.edu.ve) and Javier Abache (jabache@uc.edu.ve), March 2012. Modified by
David Vega, May/July 2018, April/June 2019, August 2021, February 2026.

The classic lookup table is retained from this repository's Paul Bourke demo.
Its original reference is <https://paulbourke.net/geometry/polygonise/>.

## Terrain hierarchy and LOD review

The terrain hierarchy adapts the Morton-ordered SAH treelet and stackless
traversal ideas in `babylon-avbd/src/gpu/gpuHploc.js` and `hplocpp.wgsl`
(MIT, copyright 2026 avbd-babylon contributors). The static CPU implementation
here is newly written for terrain; the AVBD physics solver is not included.
The previous `3dfractals/webgpubuild/shaders` LOD and transition attempts were
inspected for the design and findings recorded in `docs/terrain-source-review.md`.
