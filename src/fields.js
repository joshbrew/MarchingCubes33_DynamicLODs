// Generate random points on the surface of a sphere
function generateSpherePoints(numPoints, center, radius) {
  const buf = new Float32Array(numPoints * 3);
  const cx = center.x,
    cy = center.y,
    cz = center.z;

  for (let i = 0, p = 0; i < numPoints; ++i, p += 3) {
    const u = Math.random(); // 0‥1
    const v = Math.random();
    const theta = 2 * Math.PI * u; // azimuth
    const phi = Math.acos(2 * v - 1); // polar

    const sinPhi = Math.sin(phi);
    buf[p] = cx + radius * sinPhi * Math.cos(theta);
    buf[p + 1] = cy + radius * sinPhi * Math.sin(theta);
    buf[p + 2] = cz + radius * Math.cos(phi);
  }
  return buf; // Float32Array [x0,y0,z0, x1,y1,z1 …]
}

// Create a scalar field on a grid in [0,1]^3 by summing metaballs
function createScalarField(points, gridSize, k, eps = 0.0001) {
  const gx = gridSize.x,
    gy = gridSize.y,
    gz = gridSize.z;
  const invX = 1 / (gx - 1),
    invY = 1 / (gy - 1),
    invZ = 1 / (gz - 1);
  const buf = new Float32Array(gx * gy * gz);
  const idx = (x, y, z) =>
    z * (gx * gy) + // jump whole z–slices
    y * gx + // then rows within that slice
    x; // then columns within that row

  /* radius where exp(‑k·r²) == eps  →  outside that sphere contribution < eps */
  const r = Math.sqrt(-Math.log(eps) / k);
  const gxStep = invX,
    gyStep = invY,
    gzStep = invZ;

  for (let p = 0; p < points.length; p += 3) {
    const px = points[p],
      py = points[p + 1],
      pz = points[p + 2];

    const ix0 = Math.max(0, Math.floor((px - r) / gxStep));
    const ix1 = Math.min(gx - 1, Math.ceil((px + r) / gxStep));
    const iy0 = Math.max(0, Math.floor((py - r) / gyStep));
    const iy1 = Math.min(gy - 1, Math.ceil((py + r) / gyStep));
    const iz0 = Math.max(0, Math.floor((pz - r) / gzStep));
    const iz1 = Math.min(gz - 1, Math.ceil((pz + r) / gzStep));

    for (let i = ix0; i <= ix1; ++i) {
      const dx = i * invX - px;
      for (let j = iy0; j <= iy1; ++j) {
        const dy = j * invY - py;
        for (let k_ = iz0; k_ <= iz1; ++k_) {
          const dz = k_ * invZ - pz;
          const dist2 = dx * dx + dy * dy + dz * dz;
          buf[idx(i, j, k_)] += Math.exp(-k * dist2);
        }
      }
    }
  }
  return { data: buf, idx };
}

// Algebraic least-squares sphere fit, centered before solving for stability.
// This is a sphere reconstruction, not a general point-cloud distance field.
function fitSphere(points) {
  if (points.length < 12 || points.length % 3)
    throw new Error("A sphere fit needs at least four xyz points");
  const mean = [0, 0, 0],
    count = points.length / 3;
  for (let i = 0; i < points.length; i++) {
    if (!Number.isFinite(points[i]))
      throw new Error("Sphere points must be finite");
    mean[i % 3] += points[i] / count;
  }
  const matrix = Array.from({ length: 4 }, () => new Float64Array(5));
  for (let i = 0; i < points.length; i += 3) {
    const q = [
      points[i] - mean[0],
      points[i + 1] - mean[1],
      points[i + 2] - mean[2],
    ];
    const row = [2 * q[0], 2 * q[1], 2 * q[2], 1],
      rhs = q.reduce((sum, v) => sum + v * v, 0);
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) matrix[r][c] += row[r] * row[c];
      matrix[r][4] += row[r] * rhs;
    }
  }
  const scale = Math.max(...matrix.map((row) => Math.max(...row.slice(0, 4))));
  for (let c = 0; c < 4; c++) {
    let pivot = c;
    for (let r = c + 1; r < 4; r++)
      if (Math.abs(matrix[r][c]) > Math.abs(matrix[pivot][c])) pivot = r;
    if (Math.abs(matrix[pivot][c]) < scale * 1e-12)
      throw new Error("Sphere points must span three dimensions");
    [matrix[c], matrix[pivot]] = [matrix[pivot], matrix[c]];
    const divisor = matrix[c][c];
    for (let k = c; k < 5; k++) matrix[c][k] /= divisor;
    for (let r = 0; r < 4; r++)
      if (r !== c) {
        const factor = matrix[r][c];
        for (let k = c; k < 5; k++) matrix[r][k] -= factor * matrix[c][k];
      }
  }
  const offset = matrix.slice(0, 3).map((row) => row[4]);
  const center = mean.map((value, axis) => value + offset[axis]);
  const radius = Math.sqrt(
    matrix[3][4] + offset.reduce((sum, v) => sum + v * v, 0),
  );
  if (!Number.isFinite(radius) || radius <= 0)
    throw new Error("Sphere fit has no positive radius");
  let squaredError = 0,
    maxError = 0;
  for (let i = 0; i < points.length; i += 3) {
    const error = Math.abs(
      Math.hypot(
        points[i] - center[0],
        points[i + 1] - center[1],
        points[i + 2] - center[2],
      ) - radius,
    );
    squaredError += error * error;
    maxError = Math.max(maxError, error);
  }
  return {
    center,
    radius,
    rmsError: Math.sqrt(squaredError / count),
    maxError,
  };
}

function sphereSurfaces(fit, surface = "outer", thickness = 0.004, offset = 0) {
  if (!["outer", "inner", "both"].includes(surface))
    throw new Error("Choose outer, inner or both surfaces");
  if (!Number.isFinite(offset) || !Number.isFinite(thickness) || thickness <= 0)
    throw new Error("Use a finite offset and positive shell thickness");
  const outer = fit.radius + offset,
    inner = outer - thickness;
  if (outer <= 0 || inner <= 0)
    throw new Error(
      "Shell thickness must be smaller than the sphere radius plus offset",
    );
  const boundaries = [
    { side: "outer", radius: outer, iso: offset },
    { side: "inner", radius: inner, iso: offset - thickness },
  ];
  return boundaries.filter(
    (boundary) => surface === "both" || boundary.side === surface,
  );
}

function sphereSampler(fit) {
  return (x, y, z) =>
    Math.hypot(x - fit.center[0], y - fit.center[1], z - fit.center[2]) -
    fit.radius;
}

// Preserve the extracted topology, refine vertices onto the fitted boundary,
// and give the inner surface inward normals/winding. Remove collapsed poles.
function refineSphereSurface(input, fit, boundary) {
  const positions = new Float32Array(input.length),
    normals = new Float32Array(input.length);
  let written = 0;
  const direction = boundary.side === "inner" ? -1 : 1;
  for (let i = 0; i < input.length; i += 9) {
    const triangle = [],
      normal = [];
    for (let v = 0; v < 3; v++) {
      const d = [0, 1, 2].map(
        (axis) => input[i + v * 3 + axis] - fit.center[axis],
      );
      const length = Math.hypot(...d);
      if (!Number.isFinite(length) || length === 0)
        throw new Error("Invalid sphere vertex");
      triangle.push(
        d.map(
          (value, axis) =>
            fit.center[axis] + (value / length) * boundary.radius,
        ),
      );
      normal.push(d.map((value) => (value / length) * direction));
    }
    const a = triangle[1].map((v, axis) => v - triangle[0][axis]),
      b = triangle[2].map((v, axis) => v - triangle[0][axis]);
    const cross = [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0],
    ];
    if (Math.hypot(...cross) < boundary.radius * boundary.radius * 1e-12)
      continue;
    const dot = cross.reduce(
      (sum, value, axis) => sum + value * normal[0][axis],
      0,
    );
    const order = dot < 0 ? [0, 2, 1] : [0, 1, 2];
    for (const v of order) {
      positions.set(triangle[v], written);
      normals.set(normal[v], written);
      written += 3;
    }
  }
  return {
    positions: positions.slice(0, written),
    normals: normals.slice(0, written),
  };
}
export {
  generateSpherePoints,
  createScalarField,
  fitSphere,
  sphereSurfaces,
  sphereSampler,
  refineSphereSurface,
};
export default {
  generateSpherePoints,
  createScalarField,
  fitSphere,
  sphereSurfaces,
  sphereSampler,
  refineSphereSurface,
};
