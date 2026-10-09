struct CubeVals { v0: f32, v1: f32, v2: f32, v3: f32, v4: f32, v5: f32, v6: f32, v7: f32 }
fn corner_offset(c: u32) -> vec3<u32> {
  var offsets = array<vec3<u32>, 8>(vec3<u32>(0,0,0),vec3<u32>(1,0,0),vec3<u32>(1,1,0),vec3<u32>(0,1,0),vec3<u32>(0,0,1),vec3<u32>(1,0,1),vec3<u32>(1,1,1),vec3<u32>(0,1,1));
  return offsets[c];
}
fn corner_bit(c: u32) -> u32 { return 1u << c; }
fn edge_corner_a(e: u32) -> u32 {
  var corners = array<u32,12>(0u,1u,2u,3u,4u,5u,6u,7u,0u,1u,2u,3u); return corners[e];
}
fn edge_corner_b(e: u32) -> u32 {
  var corners = array<u32,12>(1u,2u,3u,0u,5u,6u,7u,4u,4u,5u,6u,7u); return corners[e];
}
fn getv(v: CubeVals, i: u32) -> f32 {
  var values = array<f32,8>(v.v0,v.v1,v.v2,v.v3,v.v4,v.v5,v.v6,v.v7); return values[i];
}
fn cell_triangles(v: CubeVals, mask: u32) -> TriangleCodes {
  var result: TriangleCodes;
  for (var i = 0u; i < 15u; i += 3u) {
    let a = table[mask * 16u + i];
    if (a == 0xffffffffu) { break; }
    result.codes[result.count] = vec3<u32>(a, table[mask * 16u + i + 1u], table[mask * 16u + i + 2u]);
    result.count += 1u;
  }
  return result;
}
