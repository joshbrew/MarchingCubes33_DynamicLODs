function smooth(lo, hi, value) {
  const t = Math.max(0, Math.min(1, (value - lo) / (hi - lo)));
  return t * t * (3 - 2 * t);
}

// Match studio_dryness in studio-wind.wgsl for finding scenic views.
export function studioDryness([x, y, z], { canyon, volcanic, granite }, seed) {
  const phase = 2 * Math.PI * (seed >>> 16) / 65536;
  const belt = 1 - smooth(0.43, 0.81, Math.abs(y));
  const lee = 0.78 * Math.sin(4 * x + 2 * y - 5.52 * z + phase) +
    0.40 * Math.sin(-8.7 * x + 3.3 * y - 5.4 * z - 0.71 * phase);
  const supply = Math.min(1, 1.42 * (canyon + 0.78 * volcanic + 0.36 * granite));
  return belt * supply * smooth(-0.67, 0.47, lee);
}
