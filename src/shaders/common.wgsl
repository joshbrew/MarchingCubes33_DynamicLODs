struct Uniforms {
  isolevel: f32, dx: f32, dy: f32, dz: f32,
  gx: u32, gy: u32, gz: u32, zBase: f32,
};
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<storage, read> field: array<f32>;
@group(0) @binding(2) var<storage, read> table: array<u32>;
@group(0) @binding(3) var<storage, read_write> vertices: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> counter: atomic<u32>;
struct TriangleCodes { count: u32, codes: array<vec3<u32>, 12> }
