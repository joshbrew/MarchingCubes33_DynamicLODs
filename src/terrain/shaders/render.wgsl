struct Vertex { position: vec4<f32>, normal: vec4<f32> }
struct BuildParams { origin: vec2<f32>, size: f32, divs: u32, slot: u32, stride: u32, seed: u32, pad: u32 }
@group(0) @binding(0) var<storage,read_write> buildVertices: array<Vertex>;
@group(0) @binding(1) var<uniform> build: BuildParams;
@compute @workgroup_size(8,8)
fn generate(@builtin(global_invocation_id) gid: vec3<u32>) {
  if(gid.x>build.divs || gid.y>build.divs){return;}
  let xz=build.origin+vec2<f32>(gid.xy)*(build.size/f32(build.divs));
  let h=terrain_height_gradient(xz,build.seed);
  let normal=normalize(vec3<f32>(-h.y,1.0,-h.z));
  let at=build.slot*build.stride+gid.y*(build.divs+1u)+gid.x;
  buildVertices[at]=Vertex(vec4<f32>(xz.x,h.x,xz.y,1),vec4<f32>(normal,0));
}
struct Frame {
  viewProjection: mat4x4<f32>, camera: vec4<f32>, sun: vec4<f32>, reserved: vec4<f32>, settings: vec4<f32>
}
struct Instance { slot:u32, storedDivs:u32, renderDivs:u32, lod:u32 }
@group(0) @binding(0) var<storage,read> renderVertices: array<Vertex>;
@group(0) @binding(1) var<storage,read> instances: array<Instance>;
@group(0) @binding(2) var<uniform> frame: Frame;
struct Varying {
  @builtin(position) clip:vec4<f32>, @location(0) world:vec3<f32>, @location(1) normal:vec3<f32>,
  @location(2) @interpolate(flat) lod:u32,
}
@vertex
fn vertex_main(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->Varying {
  let info=instances[instance];let stride=u32(frame.settings.x);let step=info.storedDivs/info.renderDivs;
  let x=vertex%(info.renderDivs+1u);let z=vertex/(info.renderDivs+1u);
  let v=renderVertices[info.slot*stride+z*step*(info.storedDivs+1u)+x*step];
  var clip=frame.viewProjection*vec4<f32>(v.position.xyz,1);
  // THREE's projection is OpenGL depth; WebGPU depth occupies [0,w].
  clip.z=(clip.z+clip.w)*0.5;
  return Varying(clip,v.position.xyz,v.normal.xyz,info.lod);
}
fn lod_color(level:u32)->vec3<f32> {
  var colors=array<vec3<f32>,6>(vec3<f32>(.95,.25,.22),vec3<f32>(1,.62,.18),vec3<f32>(.8,.82,.2),
    vec3<f32>(.22,.7,.46),vec3<f32>(.2,.6,.9),vec3<f32>(.55,.38,.9));
  return colors[min(level,5u)];
}
@fragment
fn fragment_main(input:Varying)->@location(0) vec4<f32> {
  let n=normalize(input.normal);
  let grass=mix(vec3<f32>(.13,.24,.12),vec3<f32>(.36,.43,.23),smoothstep(-50.0,180.0,input.world.y));
  let stone=vec3<f32>(.42,.40,.36);
  var color=mix(grass,stone,smoothstep(.25,.62,1.0-n.y));
  color=mix(color,vec3<f32>(.77,.79,.77),smoothstep(140.0,250.0,input.world.y)*smoothstep(.4,.85,n.y));
  color=mix(vec3<f32>(.09,.21,.28),color,smoothstep(-30.0,-8.0,input.world.y));
  if(frame.settings.y>0.5){color=lod_color(input.lod);}
  if(frame.settings.z>0.5){color=mix(lod_color(input.lod),vec3<f32>(.85),.35);}
  let light=.35+max(dot(n,normalize(frame.sun.xyz)),0.0)*.85;
  if(length(input.world-frame.camera.xyz)>frame.settings.w){discard;}
  return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
