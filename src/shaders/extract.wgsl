fn sample_corner(cell: vec3<u32>, c: u32) -> f32 {
  let p = cell + corner_offset(c);
  return field[(p.z * uni.gy + p.y) * uni.gx + p.x] - uni.isolevel;
}
fn vertex_for_code(code: u32, cell: vec3<u32>, v: CubeVals) -> vec4<f32> {
  var local = vec3<f32>(0.5);
  if (code != 12u) {
    let a = edge_corner_a(code); let b = edge_corner_b(code);
    let va = getv(v,a); let diff = va - getv(v,b);
    var t = 0.5;
    if (abs(diff) >= 1e-9) { t = clamp(va / diff, 0.0, 1.0); }
    local = mix(vec3<f32>(corner_offset(a)), vec3<f32>(corner_offset(b)), t);
  }
  let p = (vec3<f32>(cell) + local) * vec3<f32>(uni.dx,uni.dy,uni.dz);
  return vec4<f32>(p.x, p.y, p.z + uni.zBase, 1.0);
}
@compute @workgroup_size(4,4,4)
fn cs(@builtin(global_invocation_id) cell: vec3<u32>) {
  if (any(cell >= vec3<u32>(uni.gx-1u,uni.gy-1u,uni.gz-1u))) { return; }
  let v = CubeVals(sample_corner(cell,0u),sample_corner(cell,1u),sample_corner(cell,2u),sample_corner(cell,3u),
                   sample_corner(cell,4u),sample_corner(cell,5u),sample_corner(cell,6u),sample_corner(cell,7u));
  var mask = 0u;
  for (var c = 0u; c < 8u; c += 1u) { if (getv(v,c) < 0.0) { mask |= corner_bit(c); } }
  if (mask == 0u || mask == 255u) { return; }
  let tris = cell_triangles(v,mask);
  let dst = atomicAdd(&counter,tris.count * 3u);
  for (var i = 0u; i < tris.count; i += 1u) {
    let codes = tris.codes[i];
    vertices[dst+i*3u] = vertex_for_code(codes.x,cell,v);
    vertices[dst+i*3u+1u] = vertex_for_code(codes.y,cell,v);
    vertices[dst+i*3u+2u] = vertex_for_code(codes.z,cell,v);
  }
}
