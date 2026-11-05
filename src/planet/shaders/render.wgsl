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
@group(0) @binding(4) var sunVisibility:texture_2d<f32>;
@group(0) @binding(5) var sunSampler:sampler;
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
fn detail_footprint(distance:f32,pixel:f32)->f32{
  return max(pixel,max(0.0,distance-420.0)*.004);
}
struct SurfaceVarying {
  @builtin(position) clip:vec4<f32>,
  @location(0) relative:vec3<f32>, @location(1) radial:vec3<f32>,
  @location(2) @interpolate(flat) level:u32,
}
@vertex fn planet_vertex(@builtin(vertex_index) index:u32,@builtin(instance_index) instance:u32)->SurfaceVarying {
  let tile=tiles[instance]; let divs=u32(frame.options.x); let row=divs+1u;
  let uv=tile.origin+vec2<f32>(f32(index%row),f32(index/row))*(tile.size/f32(divs));
  let dir=normalize(cube_point(tile.face,uv)); let radius=frame.eye.w;
  // The footprint depends on position, so stitched edges agree across tiles.
  let lateral=length(dir*length(frame.eye.xyz)-frame.eye.xyz);
  let range=length(vec2<f32>(lateral,frame.options.w));
  let footprint=detail_footprint(range,range*frame.forward.w*.75);
  let s=planet_surface(dir,radius,bitcast<u32>(frame.options.y),footprint,i32(style.palette.z),9u,style.ocean.z>.5,style.ocean.w>.5);
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
fn sky_air_color(up:vec3<f32>,ray:vec3<f32>)->vec3<f32>{
  let zenith=max(0.0,dot(up,ray));
  let horizon=pow(1.0-zenith,3.0);
  let towardSun=pow(max(0.0,dot(ray,sun())),12.0);
  let color=mix(vec3<f32>(.58,.71,.79),vec3<f32>(.16,.33,.59),pow(zenith,.40));
  return color+vec3<f32>(.15,.095,.035)*horizon*towardSun;
}

fn ocean_color(radial:vec3<f32>,view:vec3<f32>,depth:f32,pixel:f32,bottom:vec3<f32>,visibility:f32)->vec3<f32>{
  var n=radial;
  if(pixel<5.0){
    let p=radial*frame.eye.w;
    let ripple=planet_noise(p/17.0,2501u).slope;
    n=normalize(radial-.055*(ripple-radial*dot(ripple,radial))*(1.0-smoothstep(2.0,5.0,pixel)));
  }
  let shallow=vec3<f32>(.032,.16,.17);
  let deep=vec3<f32>(.009,.038,.073);
  let clarity=exp(-depth*.008);
  let water=mix(shallow,deep,1.0-exp(-depth*.0019))+bottom*.29*clarity;
  let facing=max(0.0,dot(n,view));
  let fresnel=.025+.72*pow(1.0-facing,5.0);
  let reflection=sky_air_color(radial,reflect(-view,n))*.66;
  let glint=.20*pow(max(0.0,dot(n,normalize(view+sun()))),115.0)*visibility;
  return mix(water*(.64+.36*visibility),reflection,fresnel)+glint;
}
@fragment fn planet_fragment(v:SurfaceVarying)->@location(0) vec4<f32> {
  let radial=normalize(v.radial);
  let distance=length(v.relative);
  let view=-v.relative/max(distance,1e-3);
  // A smooth angular footprint keeps octave transitions off triangle edges.
  let pixel=distance*frame.forward.w*inverseSqrt(max(.20,abs(dot(view,radial))));
  if(frame.options.z>.5) {
    return vec4<f32>(.45+.4*cos(vec3<f32>(0,2,4)+f32(v.level)*.85),1);
  }
  // The last two bands affect lighting and pigment below mesh spacing.
  let reliefPixel=detail_footprint(distance,pixel);
  let material=planet_surface(radial,frame.eye.w,bitcast<u32>(frame.options.y),reliefPixel,i32(style.palette.z),11u,style.ocean.z>.5,style.ocean.w>.5);
  let tangent=material.gradient-radial*dot(radial,material.gradient);
  // Studio uses radial lighting at globe scale. Terrain normals appear on approach.
  let nearDetail=1.0-smoothstep(2500.0,55000.0,distance);
  let normalDetail=1.0-smoothstep(6500.0,105000.0,distance);
  let normal=normalize(radial-tangent*normalDetail);
  let steepness=1.0-max(0.0,dot(radial,normal));
  let exposed=nearDetail*smoothstep(.055,.34,steepness-.12*material.patina);
  let shade=mix(.47,.31,nearDetail)-.06*exposed;
  let basin=smoothstep(.018,.19,material.basin)*(1.0-smoothstep(17000.0,85000.0,distance));
  let diffuse=max(0.0,dot(normal,sun()));
  let baked=textureSampleLevel(sunVisibility,sunSampler,material.uv,0.0).r;
  let visibility=mix(1.0,baked,1.0-smoothstep(48000.0,160000.0,distance));
  let skylight=shade*(1.0-material.shelter*nearDetail-.40*basin);
  let light=skylight*mix(vec3<f32>(1.0),vec3<f32>(.72,.88,1.15),nearDetail)+
    (1.0-shade)*diffuse*visibility*mix(vec3<f32>(1.0),vec3<f32>(1.12,1.02,.89),nearDetail);
  let pigment=material.patina*nearDetail;
  let baseColor=preset_color(material.value+.16*pigment,nearDetail);
  let luminance=dot(baseColor,vec3<f32>(.2126,.7152,.0722));
  let weathering=smoothstep(-.12,.14,material.mineral+.30*pigment);
  let rockColor=mix(vec3<f32>(.18,.19,.20),vec3<f32>(.31,.265,.21),weathering);
  // Tilt the beds through the planet and attenuate both periods by pixel size.
  var strata=0.0;
  if(exposed>.02 && reliefPixel<130.0){
    let bedHeight=material.height+frame.eye.w*dot(radial,vec3<f32>(.17,-.14,.09));
    let broad=cos(6.2831853*(bedHeight/310.0+1.8*material.mineral));
    let fine=cos(6.2831853*(bedHeight/84.0+3.0*material.mineral));
    let bedExposure=smoothstep(-.10,.12,material.mineral)*select(.42,1.0,style.ocean.z>.5);
    strata=bedExposure*(.09*broad*(1.0-smoothstep(35.0,130.0,reliefPixel))+
      .065*fine*(1.0-smoothstep(10.0,35.0,reliefPixel)));
  }
  let stone=mix(mix(vec3<f32>(luminance),baseColor,.58),rockColor,.40)*(1.0+strata);
  var color=mix(baseColor,stone,exposed)*light*clamp(1.0+pigment,.62,1.25);
  let depth=style.ocean.x-material.height;
  if(style.ocean.y>.5 && depth>0.0){
    color=mix(color,ocean_color(radial,view,depth,pixel,baseColor,visibility),smoothstep(0.0,max(2.0,pixel*.15),depth));
  }
  let horizon=pow(1.0-max(0.0,dot(view,radial)),3.0);
  let haze=horizon*.48*exp(-frame.options.w/54000.0)*(1.0-exp(-distance/28000.0));
  let hazeTint=mix(vec3<f32>(.36,.49,.65),vec3<f32>(.67,.70,.72),
    pow(max(0.0,dot(-view,sun())),8.0));
  color=mix(color,hazeTint,haze*.85);
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
  let color=sky_air_color(up,ray);
  let star=step(.9975,planet_hash(vec3<i32>(floor(ray*1024.0)),58u))*.40;
  var result=mix(vec3<f32>(.025,.04,.08)+star,color,air);
  let closest=length(cross(eye,ray));
  let limb=(1.0-smoothstep(r+500.0,r+7000.0,closest))*
    smoothstep(r-5500.0,r+500.0,closest)*step(dot(eye,ray),0.0)*(1.0-air);
  result+=vec3<f32>(.20,.37,.58)*limb*(.25+.75*max(0.0,dot(up,sun())));
  return vec4<f32>(result,1);
}
