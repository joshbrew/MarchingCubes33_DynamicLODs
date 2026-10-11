fn progressive_height_gradient(xz: vec2<f32>, seed: u32) -> vec3<f32> {
  var result = terrain_height_gradient(xz, seed);
  var wave = 4.0;
  var amplitude = 0.42;
  for (var i = 0u; i < 7u; i++) {
    let n = terrain_noise(xz / wave, seed + 211u + i * 19u);
    result += vec3<f32>(n.x, n.y / wave, n.z / wave) * amplitude;
    wave *= 0.5;
    // The first step is 0.42 -> 0.22; subsequent octaves halve.
    amplitude = select(amplitude * 0.5, 0.22, i == 0u);
  }
  return result;
}
