struct Frame {
  vp:mat4x4<f32>, eye:vec4<f32>, right:vec4<f32>, up:vec4<f32>, forward:vec4<f32>, options:vec4<f32>,
}
struct Tile { origin:vec2<f32>, size:f32, face:u32, level:u32, pad0:u32, pad1:u32, pad2:u32 }
struct PlanetStyle {
  palette:vec4<f32>, ocean:vec4<f32>, stops:array<vec4<f32>,32>,
}
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> tiles:array<Tile>;
@group(0) @binding(2) var<uniform> style:PlanetStyle;
fn cube_point(face:u32,p:vec2<f32>)->vec3<f32>{
  switch face {
    case 0u: {return vec3<f32>(1,p.y,p.x);}
    case 1u: {return vec3<f32>(-1,p.y,-p.x);}
    case 2u: {return vec3<f32>(p.x,1,p.y);}
    case 3u: {return vec3<f32>(p.x,-1,-p.y);}
    case 4u: {return vec3<f32>(-p.x,p.y,1);}
    default: {return vec3<f32>(p.x,p.y,-1);}
  }
}
fn sun()->vec3<f32>{return normalize(vec3<f32>(.54,.45,.71));}
struct SurfaceVarying {
  @builtin(position) clip:vec4<f32>,
  @location(0) relative:vec3<f32>, @location(1) radial:vec3<f32>,
  @location(2) @interpolate(flat) level:u32,
}
@vertex fn planet_vertex(@builtin(vertex_index) index:u32,@builtin(instance_index) instance:u32)->SurfaceVarying {
  let tile=tiles[instance]; let divs=u32(frame.options.x); let row=divs+1u;
  let uv=tile.origin+vec2<f32>(f32(index%row),f32(index/row))*(tile.size/f32(divs));
  let dir=normalize(cube_point(tile.face,uv)); let radius=frame.eye.w;
  let s=planet_surface(dir,radius,bitcast<u32>(frame.options.y),0.0,i32(style.palette.z),7u,style.ocean.z>.5);
  let height=select(s.height,max(s.height,style.ocean.x),style.ocean.y>.5);
  let p=(dir*radius-frame.eye.xyz)+dir*height;
  var clip=frame.vp*vec4<f32>(p,1);
  clip.z=(clip.z+clip.w)*.5;
  return SurfaceVarying(clip,p,dir,tile.level);
}
fn preset_color(value:f32,nearDetail:f32)->vec3<f32>{
  let last=style.palette.x-1.0;
  let index=last*clamp((value-style.palette.w)*style.palette.y,0.0,1.0);
  let lower=min(u32(index),u32(last)-1u);
  let fraction=index-f32(lower);
  let t=mix(clamp(fraction,.1,.9),fraction,nearDetail);
  return pow(mix(style.stops[lower].xyz,style.stops[lower+1u].xyz,t),vec3<f32>(2.2));
}
fn ocean_color(radial:vec3<f32>,view:vec3<f32>,depth:f32,pixel:f32)->vec3<f32>{
  var n=radial;
  if(pixel<5.0){
    let p=radial*frame.eye.w;
    let ripple=planet_noise(p/17.0,2501u).slope;
    n=normalize(radial-.055*(ripple-radial*dot(ripple,radial))*(1.0-smoothstep(2.0,5.0,pixel)));
  }
  let shallow=vec3<f32>(.035,.31,.34);
  let deep=vec3<f32>(.009,.062,.16);
  let water=mix(shallow,deep,smoothstep(0.0,1400.0,depth));
  let facing=max(0.0,dot(n,view));
  let skyLight=.63+.37*max(0.0,dot(radial,sun()));
  let glint=.24*pow(max(0.0,dot(n,normalize(view+sun()))),100.0);
  return mix(water*skyLight,vec3<f32>(.20,.37,.52),.45*pow(1.0-facing,4.0))+glint;
}
@fragment fn planet_fragment(v:SurfaceVarying)->@location(0) vec4<f32> {
  let radial=normalize(v.radial);
  let view=normalize(-v.relative); let p=radial*frame.eye.w;
  let pixel=max(length(dpdx(p)),length(dpdy(p)));
  if(frame.options.z>.5) {
    return vec4<f32>(.45+.4*cos(vec3<f32>(0,2,4)+f32(v.level)*.85),1);
  }
  // The last two bands affect lighting and pigment below mesh spacing.
  let material=planet_surface(radial,frame.eye.w,bitcast<u32>(frame.options.y),pixel,i32(style.palette.z),9u,style.ocean.z>.5);
  let tangent=material.gradient-radial*dot(radial,material.gradient);
  let distance=length(v.relative);
  // Studio uses radial lighting at globe scale. Terrain normals appear on approach.
  let nearDetail=1.0-smoothstep(2500.0,55000.0,distance);
  let normal=normalize(radial-tangent*nearDetail);
  let shade=mix(.47,.29,nearDetail);
  let sunlight=shade+(1.0-shade)*max(0.0,dot(normal,sun()));
  let pigment=material.patina*nearDetail;
  let baseColor=preset_color(material.value+.16*pigment,nearDetail);
  let steepness=1.0-max(0.0,dot(radial,normal));
  let exposed=nearDetail*smoothstep(.045,.27,steepness-.12*pigment);
  let stone=mix(baseColor,vec3<f32>(.27,.23,.18),.42);
  var color=mix(baseColor,stone,exposed)*sunlight*clamp(1.0+pigment,.62,1.25);
  let depth=style.ocean.x-material.height;
  if(style.ocean.y>.5 && depth>0.0){
    color=mix(color,ocean_color(radial,view,depth,pixel),smoothstep(0.0,max(2.0,pixel*.15),depth));
  }
  let horizon=pow(1.0-max(0.0,dot(view,radial)),3.0);
  let haze=horizon*.48*exp(-frame.options.w/54000.0)*(1.0-exp(-distance/28000.0));
  color=mix(color,vec3<f32>(.38,.59,.73),haze);
  return vec4<f32>(pow(color,vec3<f32>(1.0/2.2)),1);
}
struct SkyVertex { @builtin(position) clip:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn sky_vertex(@builtin(vertex_index) i:u32)->SkyVertex {
  let uv=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
  return SkyVertex(vec4<f32>(uv[i],.999999,1),uv[i]);
}
@fragment fn sky_fragment(v:SkyVertex)->@location(0) vec4<f32> {
  let ray=normalize(frame.forward.xyz+frame.right.xyz*v.uv.x*frame.right.w+
    frame.up.xyz*v.uv.y*frame.up.w);
  let eye=frame.eye.xyz; let r=frame.eye.w;
  let altitude=frame.options.w;
  let air=exp(-altitude/18000.0);
  let up=normalize(eye);
  let zenith=max(0.0,dot(up,ray));
  let color=mix(vec3<f32>(.62,.77,.87),vec3<f32>(.19,.40,.67),pow(zenith,.45));
  let star=step(.9975,planet_hash(vec3<i32>(floor(ray*1024.0)),58u))*.40;
  var result=mix(vec3<f32>(.025,.04,.08)+star,color,air);
  let closest=length(cross(eye,ray));
  let limb=(1.0-smoothstep(r+500.0,r+7000.0,closest))*
    smoothstep(r-5500.0,r+500.0,closest)*step(dot(eye,ray),0.0)*(1.0-air);
  result+=vec3<f32>(.20,.37,.58)*limb*(.25+.75*max(0.0,dot(up,sun())));
  return vec4<f32>(result,1);
}
