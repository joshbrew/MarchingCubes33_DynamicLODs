const waves = [2500, 1100, 475, 180, 65, 22, 6];
const heights = [245, 138, 73, 24, 7, 2.25, 0.60];
// Worst-case channel cut at maximum strength, plus the existing rock ribs.
export const drainageBound = 1.85 * 2 * 1.32 *
  (0.84 * heights[0] + heights[1] + heights[2] + heights[3]) + 200;

function smooth(low, high, value) {
  const t = Math.min(1, Math.max(0, (value - low) / (high - low)));
  return t * t * (3 - 2 * t);
}

function chart([x, y, z], radius, [gx, gy, gz], hemisphere) {
  const projection = Math.max(0.5, 1 + hemisphere * y);
  const u = x / projection, v = z / projection;
  const radial = gx * x + gy * (hemisphere + y) + gz * z;
  const metric = 2 / (1 + u * u + v * v);
  return [u * radius, v * radius, (gx - u * radial) * metric, (gz - v * radial) * metric];
}

// This is the height-only counterpart of the render shader. The chart
// derivatives still steer each octave so camera clearance matches the mesh.
function carrier(px, py, wx, wy, salt, hash) {
  const x = Math.floor(px), y = Math.floor(py);
  const f = px - x, g = py - y;
  const u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  let cosine = 0, sine = 0;
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < 2; i++) {
      const key = hash(x + i, y + j, 0, salt);
      const jx = (key & 255) * (0.60 / 255) - 0.30;
      const jy = ((key >>> 8) & 255) * (0.60 / 255) - 0.30;
      const phase = (f - i - jx) * wx + (g - j - jy) * wy + 1.57;
      const weight = (i ? u : 1 - u) * (j ? v : 1 - v);
      cosine += Math.cos(phase) * weight;
      sine += Math.sin(phase) * weight;
    }
  }
  const norm = Math.max(0.50, Math.hypot(cosine, sine));
  return [cosine / norm, sine / norm];
}

export function drainageHeight(dir, radius, seed, grade, baseHeight, terrainHeight, detail, rockType, noise, hash) {
  if (!detail.slopeOctaves && !detail.groundOctaves) return 0;
  const slopeStrength = smooth(0.05, 0.76, Math.hypot(...grade));
  const strength = 0.06 + 0.94 * slopeStrength;
  const radialGrade = dir[0] * grade[0] + dir[1] * grade[1] + dir[2] * grade[2];
  const wall = smooth(0.45, 2, Math.hypot(...grade.map((component, axis) => component - dir[axis] * radialGrade)));
  const blend = smooth(-0.19, 0.19, dir[1]);
  const charts = [
    [blend, 0, chart(dir, radius, grade, 1)],
    [1 - blend, 1471, chart(dir, radius, grade, -1)],
  ].filter(([weight]) => weight > 0);
  const parents = charts.map(([, , [, , gx, gy]]) => {
    const len = Math.hypot(gx + 1e-5, gy) || 1;
    return [0.74 * (gx + 1e-5) / len, 0.74 * gy / len, 0, smooth(0.045, 0.60, Math.hypot(gx, gy))];
  });
  let slopes = 1, ground = 1, height = 0;
  const graniteWear = 1 - 0.74 * rockType[2];
  const hillsideWear = 1.32 * rockType[0] + 0.86 * rockType[1] + 0.74 * rockType[2] + 0.84 * rockType[3];
  const erosion = detail.erosionStrength;
  if (detail.variation > 0) {
    const [x, y, z] = dir;
    const [a] = noise(x * 5.8 + 0.87, y * 5.8 - 1.52, z * 5.8 + 2.3, seed + 811);
    const [b] = noise(x * 9.2 - 2.4, y * 9.2 + 0.63, z * 9.2 + 1.1, seed + 1979);
    slopes -= 0.75 * detail.variation * (1 - smooth(-0.47, 0.31, a));
    ground -= 0.65 * detail.variation * (1 - smooth(-0.47, 0.31, b));
  }
  let groundRadius = radius;
  for (let i = 0; i < waves.length; i++) {
    const fine = i >= 4;
    if (i === 4) groundRadius = radius + terrainHeight + height;
    if (fine ? i - 4 >= detail.groundOctaves : i >= detail.slopeOctaves) continue;
    const mode = fine ? detail.ground : detail.slopes;
    const amplitude = heights[i] * (fine ? ground : slopes * graniteWear);
    const wave = waves[i], salt = seed + 3023 + i * 71;
    if (mode === "erosion") {
      const flowWeight = fine ? (i === 4 ? 1 - 0.35 * wall : 0.60 - 0.38 * wall) : 1;
      const cutStrength = fine ? Math.min(1.45, erosion) :
        erosion * hillsideWear * (i === 0 ? 0.84 : 1);
      for (let j = 0; i < 6 && j < charts.length; j++) {
        const [weight, offset, [u, v]] = charts[j];
        const [px, py, fade, mask] = parents[j];
        const len = Math.hypot(px + 1e-5, py) || 1;
        const wx = -7.1 * py / len, wy = 7.1 * (px + 1e-5) / len;
        const [value, phaseSlope] = carrier(u / wave, v / wave, wx, wy, salt + offset, hash);
        const phase = value * (0.58 + 0.42 * Math.abs(value));
        const trough = Math.max(0, -phase);
        const wet = amplitude * strength * flowWeight;
        height += weight * wet * cutStrength *
          (fade * (1 - mask) + (0.70 * phase - 1.05 * trough ** 2) * mask - 0.10);
        const steer = (wet * 0.71 / wave) * phaseSlope / Math.sqrt(0.09 + phaseSlope ** 2);
        parents[j] = [
          px - wx * steer, py - wy * steer, fade * (1 - mask) + phase * mask,
          mask * (1.6 - 0.6 * mask) * smooth(0.02, 0.49, Math.abs(phaseSlope)),
        ];
      }
      if (i <= 2 || fine) {
        const [x, y, z] = dir;
        const [, canyon, granite, volcanic] = rockType;
        const rotated = fine ? [
          (4 * x - 20 * y + 22 * z) / 30,
          (28 * x + 10 * y + 4 * z) / 30,
          (-10 * x + 20 * y + 20 * z) / 30,
        ] : dir;
        const [u, v, w] = rotated;
        const point = fine && i % 2 === 1 ? [
          (4 * u - 4 * v + 7 * w) / 9,
          (8 * u + v - 4 * w) / 9,
          (u + 8 * v + 4 * w) / 9,
        ] : rotated;
        const sampleRadius = fine ? groundRadius : radius + 0.60 * baseHeight;
        const [grain] = noise(...point.map((coordinate) => coordinate * sampleRadius / wave), salt + 431);
        if (i < 2) {
          const crest = Math.max(0, 1 - (Math.hypot(grain, 0.018) - 0.018) / 0.63);
          height += amplitude * slopeStrength * (i === 1 ? 0.89 : 0.59) * (crest * crest - 0.38);
        } else if (!fine) {
          height += heights[i] * 0.24 * graniteWear * grain;
        } else {
          const joint = grain - 0.14 * volcanic;
          const width = 0.55 - 0.27 * granite;
          const cut = Math.max(0, 1 - (Math.hypot(joint, 0.05) - 0.05) / width);
          const rim = Math.min(1, Math.max(0, (grain + 0.72) / 1.44));
          const lip = smooth(0.26, 0.66, rim) - rim;
          const form = 0.48 * grain - (0.22 + 0.52 * volcanic + 0.12 * granite) * cut * cut + 0.68 * canyon * lip;
          height += amplitude * (1.24 - 0.36 * slopeStrength) * (i >= 6 ? 1 : 0.77) * form;
        }
      }
    } else {
      const [value] = noise(...dir.map((coordinate) => coordinate * (fine ? groundRadius : radius) / wave), salt);
      const groove = Math.max(0, 1 - (Math.hypot(value, 0.055) - 0.055) / 0.51);
      height += amplitude * (mode === "incised" ? -groove * groove : 0.50 * value);
    }
  }
  return height;
}
