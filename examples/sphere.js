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
