struct Frame {
  vp:mat4x4<f32>, eye:vec4<f32>, right:vec4<f32>, up:vec4<f32>,
  forward:vec4<f32>, options:vec4<f32>, solar:vec4<f32>,
}
struct AircraftPose { distance:f32, drop:f32, scale:f32, bank:f32 }
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<uniform> pose:AircraftPose;

// Chase aircraft from the flat cloud demo, rasterized with the planet's depth buffer.
const vertices = array(
  vec3f(0, .02, 1.05), vec3f(-.14, .02, -.65), vec3f(.14, .02, -.65),
  vec3f(0, .20, -.12), vec3f(0, -.12, -.35),
  vec3f(-.94, -.01, -.80), vec3f(.94, -.01, -.80),
  vec3f(-.68, .02, -.48), vec3f(.68, .02, -.48),
  vec3f(-.13, .14, 0), vec3f(.13, .14, 0), vec3f(0, .32, -.63),
  vec3f(-.72, 0, -.75), vec3f(.72, 0, -.75),
  vec3f(-.32, .05, -.80), vec3f(-.18, .05, -.80),
  vec3f(-.32, .05, .12), vec3f(-.18, .05, .12), vec3f(-.25, .22, -.36),
  vec3f(.18, .05, -.80), vec3f(.32, .05, -.80),
  vec3f(.18, .05, .12), vec3f(.32, .05, .12), vec3f(.25, .22, -.36),
);
const faces = array(
  vec3u(0, 1, 3), vec3u(0, 3, 2), vec3u(0, 4, 1), vec3u(0, 2, 4),
  vec3u(1, 2, 3), vec3u(1, 4, 2), vec3u(0, 7, 1), vec3u(0, 2, 8),
  vec3u(7, 12, 1), vec3u(8, 2, 13), vec3u(7, 5, 12), vec3u(8, 13, 6),
  vec3u(0, 1, 5), vec3u(0, 6, 2), vec3u(9, 3, 10), vec3u(1, 11, 3),
  vec3u(2, 3, 11), vec3u(1, 2, 11), vec3u(14, 18, 15), vec3u(14, 16, 18),
  vec3u(15, 18, 17), vec3u(16, 17, 18), vec3u(19, 23, 20), vec3u(19, 21, 23),
  vec3u(20, 23, 22), vec3u(21, 22, 23),
);

struct Vertex {
  @builtin(position) clip:vec4f,
  @location(0) @interpolate(flat) paint:vec3f,
}

@vertex fn aircraftVertex(@builtin(vertex_index) index:u32)->Vertex {
  let id = index / 3u;
  let face = faces[id];
  let point = vertices[face[index % 3u]];
  let forward = frame.forward.xyz;
  let up = frame.up.xyz;
  let right = frame.right.xyz;
  let bankCos = cos(pose.bank);
  let bankSin = sin(pose.bank);
  let axes = mat3x3f(right * bankCos + up * bankSin, up * bankCos - right * bankSin, forward);
  let center = forward * pose.distance - up * pose.drop;
  var clip = frame.vp * vec4f(center + (axes * point) * pose.scale, 1.0);
  clip.z = (clip.z + clip.w) * 0.5;

  let modelNormal = normalize(cross(vertices[face.y] - vertices[face.x], vertices[face.z] - vertices[face.x]));
  let normal = axes * modelNormal;
  let facing = select(-normal, normal, dot(normal, center) < 0.0);
  let light = 0.48 + 0.52 * max(dot(facing, frame.solar.xyz), 0.0);
  var paint = vec3f(.88, .93, 1);
  if (id == 10u || id == 11u) { paint = vec3f(.98, .19, .22); }
  if (id == 5u || id == 14u) { paint = vec3f(.10, .34, .56); }
  paint *= light;
  if (id == 18u || id == 22u) { paint = vec3f(.20, .75, 1); }
  return Vertex(clip, paint);
}

@fragment fn aircraftFragment(vertex:Vertex)->@location(0) vec4f {
  return vec4f(vertex.paint, 1.0);
}
