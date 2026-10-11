const vector = (v, name) => {
  const a = v?.toArray ? v.toArray() : Array.from(v || []);
  if (a.length !== 3 || !a.every(Number.isFinite))
    throw new TypeError(`${name} must contain three finite numbers.`);
  return a;
};
const normalize = (v) => {
  const length = Math.hypot(...v);
  if (length < 1e-12)
    throw new RangeError(
      "Camera direction and up must be nonzero and not parallel.",
    );
  return v.map((x) => x / length);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a.reduce((sum, v, i) => sum + v * b[i], 0);

/** Six inward-facing planes from a column-major OpenGL-depth projection. */
export function frustumPlanes(m) {
  if (m?.length !== 16 || !Array.from(m).every(Number.isFinite))
    throw new TypeError("viewProjection must contain 16 finite numbers.");
  return [
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [2, 1],
    [2, -1],
  ].map(([row, sign]) => {
    const p = [
      m[3] + sign * m[row],
      m[7] + sign * m[row + 4],
      m[11] + sign * m[row + 8],
      m[15] + sign * m[row + 12],
    ];
    const length = Math.hypot(...p.slice(0, 3));
    if (!length)
      throw new RangeError("Camera matrix contains a degenerate frustum.");
    return p.map((v) => v / length);
  });
}

/** Engine-independent perspective camera. fov is vertical, in radians. */
export function createCamera({
  position = [0, 200, 450],
  target,
  forward,
  up = [0, 1, 0],
  fov = Math.PI / 3,
  near = 0.1,
  far = 2048,
  aspect = 1,
  height = 720,
  player,
} = {}) {
  position = vector(position, "position");
  forward = normalize(
    forward
      ? vector(forward, "forward")
      : target
        ? vector(target, "target").map((v, i) => v - position[i])
        : [0, -0.2, -1],
  );
  const right = normalize(cross(forward, vector(up, "up")));
  up = normalize(cross(right, forward));
  if (
    !(
      fov > 0 &&
      fov < Math.PI &&
      near > 0 &&
      far > near &&
      aspect > 0 &&
      height > 0
    ) ||
    ![fov, near, far, aspect, height].every(Number.isFinite)
  )
    throw new RangeError(
      "Use 0 < fov < pi, 0 < near < far, and positive aspect/height.",
    );
  const tanY = Math.tan(fov / 2),
    tanX = tanY * aspect;
  const view = [
    right[0],
    up[0],
    -forward[0],
    0,
    right[1],
    up[1],
    -forward[1],
    0,
    right[2],
    up[2],
    -forward[2],
    0,
    -dot(right, position),
    -dot(up, position),
    dot(forward, position),
    1,
  ];
  const a = (far + near) / (near - far),
    b = (2 * far * near) / (near - far);
  const viewProjection = new Float64Array(16);
  for (let column = 0; column < 4; column++) {
    const i = column * 4;
    viewProjection[i] = view[i] / tanX;
    viewProjection[i + 1] = view[i + 1] / tanY;
    viewProjection[i + 2] = a * view[i + 2] + b * view[i + 3];
    viewProjection[i + 3] = -view[i + 2];
  }
  return {
    position,
    player: player ? vector(player, "player") : position.slice(),
    fov,
    near,
    far,
    aspect,
    height,
    right,
    up,
    forward,
    tanX,
    tanY,
    pixelScale: height / (2 * tanY),
    viewProjection,
    planes: frustumPlanes(viewProjection),
  };
}

/** Adapt a Three.js PerspectiveCamera without importing Three.js or changing it. */
export function cameraFromThree(camera, { height = 720, player } = {}) {
  if (
    !camera?.isPerspectiveCamera ||
    camera.coordinateSystem === 2001 ||
    camera.projectionMatrix?.elements?.[11] !== -1
  )
    throw new TypeError(
      "Use a Three.js perspective camera with an OpenGL depth projection.",
    );
  camera.updateWorldMatrix?.(true, false);
  const world = camera.matrixWorld.elements,
    p = camera.projectionMatrix.elements;
  // Projection coefficients preserve zoom, view offsets and asymmetric frusta.
  const inverse = camera.matrixWorldInverse.elements,
    viewProjection = new Float64Array(16);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++)
        viewProjection[c * 4 + r] += p[k * 4 + r] * inverse[c * 4 + k];
  const position = [world[12], world[13], world[14]],
    tanY = 1 / p[5],
    tanX = 1 / p[0];
  const right = normalize([world[0], world[1], world[2]]),
    up = normalize([world[4], world[5], world[6]]),
    forward = normalize([-world[8], -world[9], -world[10]]);
  return {
    position,
    player: player ? vector(player, "player") : position.slice(),
    fov: 2 * Math.atan(tanY),
    near: camera.near,
    far: camera.far,
    height,
    aspect: tanX / tanY,
    tanX,
    tanY,
    pixelScale: height / (2 * tanY),
    right,
    up,
    forward,
    skyForward: forward.map(
      (v, i) => v + right[i] * p[8] * tanX + up[i] * p[9] * tanY,
    ),
    viewProjection,
    planes: frustumPlanes(viewProjection),
  };
}

/** Space renders camera-relative centers; callers can always supply world cameras. */
export function relativeCamera(camera) {
  const m = Array.from(camera.viewProjection),
    p = camera.position;
  for (let row = 0; row < 4; row++)
    m[12 + row] += m[row] * p[0] + m[4 + row] * p[1] + m[8 + row] * p[2];
  return { ...camera, viewProjection: m, planes: frustumPlanes(m) };
}
