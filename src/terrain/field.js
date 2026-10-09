import wgsl from "./shaders/field.wgsl";
const bands = [
  [2400, 140],
  [1000, 65],
  [420, 28],
  [180, 12],
  [72, 5],
  [28, 2],
  [10, 0.8],
];
const bounds = [-380, 480];
function hash(x, z, seed = 7) {
  let h =
    (Math.imul(x, 0x8da6b343) ^
      Math.imul(z, 0xd8163841) ^
      Math.imul(seed, 0xcb1ab31f)) >>>
    0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
}
function noise(x, z, seed) {
  const ix = Math.floor(x),
    iz = Math.floor(z),
    fx = x - ix,
    fz = z - iz;
  const u = fx * fx * (3 - 2 * fx),
    v = fz * fz * (3 - 2 * fz);
  const du = 6 * fx * (1 - fx),
    dv = 6 * fz * (1 - fz);
  const a = hash(ix, iz, seed),
    b = hash(ix + 1, iz, seed),
    c = hash(ix, iz + 1, seed),
    d = hash(ix + 1, iz + 1, seed);
  return [
    a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v,
    ((b - a) * (1 - v) + (d - c) * v) * du,
    ((c - a) * (1 - u) + (d - b) * u) * dv,
  ];
}
function heightGradient(x, z, seed = 7) {
  const output = [25, 0, 0];
  for (let i = 0; i < bands.length; i++) {
    const [wave, amplitude] = bands[i],
      n = noise(x / wave + 13.71, z / wave - 8.29, seed + i * 19);
    output[0] += n[0] * amplitude;
    output[1] += (n[1] * amplitude) / wave;
    output[2] += (n[2] * amplitude) / wave;
  }
  const ridge = noise(x / 620 - 2.7, z / 620 + 4.1, seed + 101),
    r = 1 - Math.abs(ridge[0]);
  output[0] += r * r * 100 - 50;
  const derivative = (-2 * r * Math.sign(ridge[0]) * 100) / 620;
  output[1] += derivative * ridge[1];
  output[2] += derivative * ridge[2];
  return output;
}
function estimatedError(step) {
  let error = 0;
  for (const [wave, amplitude] of bands)
    error += amplitude * Math.min(1, 2 * (step / wave) ** 2);
  // Ridge cusps have first-order error rather than the smooth bands' curvature.
  return error + 100 * Math.min(1, step / 620) * 0.15;
}
const height = (x, z, seed = 7) => heightGradient(x, z, seed)[0];
export { hash, heightGradient, height, estimatedError, bounds, wgsl };
export default { hash, heightGradient, height, estimatedError, bounds, wgsl };
