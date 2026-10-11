// Keep a narrow overlap outside the CPU frustum. The GPU still clips to the
// exact camera, so small turns need no new visibility cut or draw bundle.
export function guardPlanes(planes, distance, fraction = 0.12) {
  return planes.map((p, i) =>
    i < 4 ? [p[0], p[1], p[2], p[3] + distance * fraction] : p,
  );
}

// Large turns refresh immediately; gradual motion uses the existing 10 Hz cut.
export function turnedSince(planes, previous, threshold = 0.08) {
  return (
    planes.length !== previous?.length ||
    planes
      .slice(0, 4)
      .some(
        (p, i) =>
          p
            .slice(0, 3)
            .reduce((sum, n, axis) => sum + (n - previous[i][axis]) ** 2, 0) >
          threshold ** 2,
      )
  );
}
