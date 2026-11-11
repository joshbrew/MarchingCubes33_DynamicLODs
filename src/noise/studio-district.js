export const districtAtlasSide = 96;

export function studioDistrictMask(district, [x, y, z], shift = 0) {
  if (!district) return 0;
  const [centerU, centerV, halfU, halfV] = district.chart;
  const offset = Math.atan2(z, x) / (2 * Math.PI) - centerU + 0.5;
  const u = (offset - Math.floor(offset) - 0.5) / halfU;
  const v = (Math.atan2(Math.hypot(x, z), y) / Math.PI - centerV) / halfV;
  if (Math.abs(u) >= 1 || Math.abs(v) >= 1) return 0;
  const last = district.side - 1;
  const px = (0.5 + u * 0.5) * last, py = (0.5 + v * 0.5) * last;
  const i = Math.min(last - 1, Math.floor(px)), j = Math.min(last - 1, Math.floor(py));
  const first = j * district.side + i, next = first + district.side;
  const f = px - i, g = py - j;
  const { values } = district;
  const row = (at) => (1 - f) * ((values[at] >>> shift) & 255) + f * ((values[at + 1] >>> shift) & 255);
  return ((1 - g) * row(first) + g * row(next)) / 255;
}
