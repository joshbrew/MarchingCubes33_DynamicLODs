struct Vertex { position:vec4<f32>, normal:vec4<f32> }
struct Tree { centerScale:vec4<f32>, style:vec4<f32>, samples:vec4<u32>, weights:vec4<f32> }
struct Frame { vp:mat4x4<f32>, camera:vec4<f32>, sun:vec4<f32>, pad:vec4<f32>, settings:vec4<f32> }
@group(0) @binding(0) var<storage,read> terrain:array<Vertex>;
@group(0) @binding(1) var<storage,read> trees:array<Tree>;
@group(0) @binding(2) var<uniform> frame:Frame;
struct Out { @builtin(position) clip:vec4<f32>, @location(0) normal:vec3<f32>, @location(1) color:vec3<f32>, @location(2) @interpolate(flat) style:vec4<f32> }
@vertex fn vertex(@location(0) p:vec3<f32>,@location(1) n:vec3<f32>,@location(2) color:vec3<f32>,@builtin(instance_index) id:u32)->Out{
 let tree=trees[id];let c=cos(tree.style.x);let s=sin(tree.style.x);
 let height=dot(vec3<f32>(terrain[tree.samples.x].position.y,terrain[tree.samples.y].position.y,terrain[tree.samples.z].position.y),tree.weights.xyz);
 let local=vec3<f32>(p.x*c-p.z*s,p.y,p.x*s+p.z*c)*tree.centerScale.w;
 var clip=frame.vp*vec4<f32>(vec3<f32>(tree.centerScale.x,height-.15,tree.centerScale.z)+local,1);clip.z=(clip.z+clip.w)*.5;
 return Out(clip,vec3<f32>(n.x*c-n.z*s,n.y,n.x*s+n.z*c),color,tree.style);
}
@fragment fn fragment(input:Out)->@location(0) vec4<f32>{
 // Screen-door fade avoids transparent sorting and keeps correct tree depth.
 let noise=fract(sin(dot(floor(input.clip.xy),vec2<f32>(12.9898,78.233)))*43758.5453);if(noise>input.style.z){discard;}
 var color=input.color*(.8+input.style.y*.4);
 if(frame.settings.y>.5){var colors=array<vec3<f32>,3>(vec3<f32>(1,.3,.18),vec3<f32>(1,.65,.2),vec3<f32>(.2,.7,.9));color=colors[u32(input.style.w)];}
 let light=.35+.8*abs(dot(normalize(input.normal),normalize(frame.sun.xyz)));
 return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
