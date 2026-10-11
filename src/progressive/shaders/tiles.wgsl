struct Build { origin: vec2<f32>, size: f32, slot: u32, divs: u32, columns: u32, seed: u32, pad: u32 }
@group(0) @binding(0) var outputTiles: texture_storage_2d<rgba32float, write>;
@group(0) @binding(1) var<uniform> build: Build;
@compute @workgroup_size(8,8)
fn generate(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x > build.divs || id.y > build.divs) { return; }
  let xz = build.origin + vec2<f32>(id.xy) * (build.size / f32(build.divs));
  let h = progressive_height_gradient(xz,build.seed);
  let offset = vec2<u32>(build.slot % build.columns, build.slot / build.columns) * (build.divs+1u);
  textureStore(outputTiles,vec2<i32>(offset + id.xy),vec4<f32>(h,1.0));
}
struct Frame { vp: mat4x4<f32>, camera: vec4<f32>, settings: vec4<f32>, atlas: vec4<u32> }
struct Tile { geometry: vec4<f32>, cache: vec4<u32> }
@group(0) @binding(0) var tiles: texture_2d<f32>;
@group(0) @binding(1) var<storage,read> instances: array<Tile>;
@group(0) @binding(2) var<uniform> frame: Frame;
struct Varying {
  @builtin(position) clip: vec4<f32>, @location(0) world: vec3<f32>,
  @location(1) normal: vec3<f32>, @location(2) local: vec2<f32>,
  @location(3) @interpolate(flat) level: u32,
}
@vertex
fn vertex_main(@builtin(vertex_index) id: u32, @builtin(instance_index) instance: u32) -> Varying {
  let tile = instances[instance];
  let row = tile.cache.y + 1u;
  let xy = vec2<u32>(id % row,id / row);
  let offset = vec2<u32>(tile.cache.x % frame.atlas.y,tile.cache.x / frame.atlas.y) * (frame.atlas.x+1u);
  let h = textureLoad(tiles,vec2<i32>(offset+xy*(frame.atlas.x/tile.cache.y)),0).xyz;
  let uv = vec2<f32>(xy) / f32(tile.cache.y);
  let xz = tile.geometry.xy + uv * tile.geometry.z;
  let world = vec3<f32>(xz.x,h.x,xz.y);
  var clip = frame.vp * vec4<f32>(world,1);
  clip.z = (clip.z+clip.w)*0.5;
  return Varying(clip,world,normalize(vec3<f32>(-h.y,1,-h.z)),uv,u32(tile.geometry.w));
}
fn detail_color(level: u32) -> vec3<f32> {
  let t = f32(level) * 0.71;
  return 0.52 + 0.38 * cos(vec3<f32>(t,t+2.1,t+4.2));
}
@fragment
fn fragment_main(input: Varying) -> @location(0) vec4<f32> {
  if (length(input.world-frame.camera.xyz) > frame.settings.x) { discard; }
  let n = normalize(input.normal);
  let slope = 1.0-n.y;
  let grass = mix(vec3<f32>(.19,.27,.09),vec3<f32>(.36,.39,.18),smoothstep(-40.0,160.0,input.world.y));
  var color = mix(grass,vec3<f32>(.36,.31,.24),smoothstep(.05,.36,slope));
  // World-space albedo; no per-frame noise evaluation or full-world texture.
  color *= .88+.12*n.y;
  if (frame.settings.y > 0.5) { color = detail_color(input.level); }
  if (frame.settings.z > 0.5) {
    let edge = min(min(input.local.x,1-input.local.x),min(input.local.y,1-input.local.y));
    let border = 1.0-smoothstep(0.0,max(fwidth(edge)*1.5,.001),edge);
    color = mix(color,vec3<f32>(.09,.12,.10),border*.85);
  }
  let light = .3+.8*max(dot(n,normalize(vec3<f32>(.4,.8,.3))),0.0);
  return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
