struct Vertex { position:vec4<f32>, normal:vec4<f32> }
struct Instance { centerRadius:vec4<f32>, quaternion:vec4<f32>, tint:vec4<f32>, details:vec4<f32> }
struct Frame { vp:mat4x4<f32>, sun:vec4<f32>, settings:vec4<f32>, viewport:vec4<f32>, right:vec4<f32>, up:vec4<f32>, forward:vec4<f32>, cameraOffset:vec4<f32> }
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> instances:array<Instance>;
@group(1) @binding(0) var<storage,read> geometry:array<Vertex>;
fn rotate(q:vec4<f32>,v:vec3<f32>)->vec3<f32>{return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
struct Varying {
 @builtin(position) clip:vec4<f32>, @location(0) local:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) relative:vec3<f32>,
 @location(3) tint:vec3<f32>, @location(4) @interpolate(flat) details:vec4<f32>, @location(5) uv:vec2<f32>
}
fn transformed(vertex:Vertex,info:Instance)->Varying{
 let relative=(info.centerRadius.xyz-frame.cameraOffset.xyz)+rotate(info.quaternion,vertex.position.xyz)*info.centerRadius.w;
 var clip=frame.vp*vec4<f32>(relative,1);clip.z=(clip.z+clip.w)*.5;
 return Varying(clip,vertex.position.xyz,rotate(info.quaternion,vertex.normal.xyz),relative,info.tint.xyz,info.details,vec2<f32>(0));
}
@vertex fn mesh_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{return transformed(geometry[v],instances[i]);}
@vertex fn point_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{
 var corners=array<vec2<f32>,6>(vec2<f32>(-1,-1),vec2<f32>(1,-1),vec2<f32>(1,1),vec2<f32>(-1,-1),vec2<f32>(1,1),vec2<f32>(-1,1));
 var result=transformed(geometry[v/6u],instances[i]);let uv=corners[v%6u];
 result.clip=vec4<f32>(result.clip.xy+uv*frame.settings.z/frame.viewport.xy*result.clip.w,result.clip.zw);result.uv=uv;return result;
}
fn lod_color(lod:f32)->vec3<f32>{var colors=array<vec3<f32>,16>(vec3<f32>(1,.302,.188),vec3<f32>(1,.647,.18),vec3<f32>(.922,.851,.282),vec3<f32>(.263,.722,.475),vec3<f32>(.157,.561,1),vec3<f32>(.212,.796,.851),vec3<f32>(.510,.463,1),vec3<f32>(.741,.439,.910),vec3<f32>(.263,.922,.851),vec3<f32>(.443,.471,1),vec3<f32>(.722,.333,.980),vec3<f32>(.851,.651,1),vec3<f32>(.941,.616,.784),vec3<f32>(.745,.722,.910),vec3<f32>(.604,.663,.8),vec3<f32>(.467,.514,.6));return colors[min(u32(lod),15u)];}
fn shade(input:Varying,points:bool)->vec4<f32>{
 if(length(input.relative)>frame.settings.x){discard;}
 if(points&&dot(input.uv,input.uv)>1.0){discard;}
 let n=normalize(input.normal);let p=input.local;let kind=input.details.y;let variant=input.details.z;
 let light=.22+.88*max(0.0,dot(n,normalize(frame.sun.xyz)));
 let rim=pow(1.0-max(0.0,dot(n,normalize(-input.relative))),3.0);
 var color=input.tint;
 if(kind<.5){let strata=.82+.18*sin(p.x*34.0+p.y*25.0+p.z*41.0);color*=strata;}
 else if(kind<1.5){
   let terrain=sin(p.x*7.0+variant)*cos(p.z*6.0-variant)+sin(p.y*9.0+p.z*4.0)*.5;
   color=mix(vec3<f32>(.05,.16,.37),vec3<f32>(.28,.53,.30),smoothstep(-.15,.25,terrain));
   color=mix(color,vec3<f32>(.76,.85,.88),smoothstep(.45,.56,abs(p.y)));
   if(u32(variant)%2u==0u&&length(p)>.72){color=mix(vec3<f32>(.32,.21,.41),vec3<f32>(.82,.57,.35),.5+.5*sin(length(p.xz)*210.0));}
   color+=vec3<f32>(.12,.35,.65)*rim;
 }else{
   color=mix(vec3<f32>(.29,.22,.32),vec3<f32>(.22,.48,.29),smoothstep(.05,.22,p.y));
   color+=vec3<f32>(.08,.28,.32)*(1.0-smoothstep(-.6,-.2,p.y))*(.5+.5*sin(p.y*60.0));
 }
 if(frame.settings.y>.5){color=lod_color(input.details.x);}
 let exposure=select(light,.65+light*.65,points);return vec4<f32>(pow(max(color*exposure,vec3<f32>(.001)),vec3<f32>(1.0/2.2)),1);
}
@fragment fn mesh_fragment(input:Varying)->@location(0) vec4<f32>{return shade(input,false);}
@fragment fn point_fragment(input:Varying)->@location(0) vec4<f32>{return shade(input,true);}
struct Sky { @builtin(position) clip:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn sky_vertex(@builtin(vertex_index) index:u32)->Sky{var corners=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));let p=corners[index];return Sky(vec4<f32>(p,1,1),p);}
fn sky_hash(p:vec2<u32>)->f32{var h=(p.x*0x8da6b343u)^(p.y*0xd8163841u);h=(h^(h>>16u))*0x7feb352du;h=(h^(h>>15u))*0x846ca68bu;return f32(h^(h>>16u))/4294967295.0;}
@fragment fn sky_fragment(input:Sky)->@location(0) vec4<f32>{
 let ray=normalize(frame.forward.xyz+input.uv.x*frame.viewport.z*frame.right.xyz+input.uv.y*frame.viewport.w*frame.up.xyz);
 let uv=vec2<f32>(atan2(ray.z,ray.x)/6.2831853+.5,asin(ray.y)/3.1415927+.5);let grid=uv*vec2<f32>(1400,700);let cell=vec2<u32>(floor(grid));let seed=sky_hash(cell);
 let spot=vec2<f32>(sky_hash(cell+vec2<u32>(7,31)),sky_hash(cell+vec2<u32>(101,3)));
 let star=select(0.0,1.0-smoothstep(.02,.18,length(fract(grid)-spot)),seed>.989);
 let nebula=pow(max(0.0,.5+.5*sin(ray.x*8.0+ray.z*11.0+sin(ray.y*7.0))),5.0)*pow(1.0-abs(ray.y),6.0);
 let color=vec3<f32>(.003,.005,.013)+nebula*vec3<f32>(.025,.008,.042)+star*mix(vec3<f32>(.6,.72,1),vec3<f32>(1,.83,.62),seed);
 return vec4<f32>(pow(color,vec3<f32>(1.0/2.2)),1);
}
