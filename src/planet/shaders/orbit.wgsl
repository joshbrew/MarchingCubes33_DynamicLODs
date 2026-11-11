struct OrbitVarying {
  @builtin(position) clip:vec4<f32>,
  @location(0) relative:vec3<f32>,
  @location(1) radial:vec3<f32>,
  @location(2) terrain:vec4<f32>,
  @location(3) @interpolate(flat) level:u32,
}

// The initial orbit samples the existing atlas directly. The full renderer
// builds patch samples once and reuses them when the camera moves.
fn orbit_sample(dir:vec3<f32>,radius:f32,side:i32,offset:i32,uv:vec2<f32>)->vec4<f32>{
  let segments=side-1;
  let p=uv*f32(segments);
  let cell=min(vec2<i32>(floor(p)),vec2<i32>(segments-1));
  let t=p-vec2<f32>(cell);
  let nextX=(cell.x+1)%segments;
  let row=offset+cell.y*side;
  let a=studioHeights[row+cell.x];
  let b=studioHeights[row+nextX];
  let c=studioHeights[row+side+cell.x];
  let d=studioHeights[row+side+nextX];
  let lo=mix(a,b,t.x);
  let hi=mix(c,d,t.x);
  let horizontal=max(length(dir.xz),.0001);
  let east=vec3<f32>(-dir.z,0,dir.x)/horizontal;
  let south=vec3<f32>(dir.x*dir.y/horizontal,-horizontal,dir.z*dir.y/horizontal);
  let du=mix(b-a,d-c,t.y)*smoothstep(.0001,.01,horizontal)/(6.28318530718*horizontal);
  let dv=(hi-lo)/3.14159265359;
  return vec4<f32>(mix(lo,hi,t.y),(east*du+south*dv)*(f32(segments)/radius));
}

@vertex fn orbit_vertex(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->OrbitVarying {
  let tile=tiles[instance];
  let dir=tile_direction(tile,vertex,u32(frame.options.x));
  let radius=frame.eye.w;
  let pixel=length(dir*radius-frame.eye.xyz)*frame.forward.w;
  let side=i32(style.palette.z);
  let uv=studio_uv(dir);
  let blend=studio_lod_weight(pixel,radius,side);
  let fine=orbit_sample(dir,radius,side,0,uv);
  let coarse=orbit_sample(dir,radius,max(1,(side-1)/4)+1,side*side,uv);
  let terrain=mix(fine,coarse,blend);
  let ground=terrain.x*studioReliefMeters*style.world.x;
  let height=select(ground,max(ground,style.ocean.x),style.ocean.y>.5);
  let relative=dir*(radius+height)-frame.eye.xyz;
  var clip=frame.vp*vec4<f32>(relative,1);
  clip.z=(clip.z+clip.w)*.5;
  return OrbitVarying(clip,relative,dir,terrain,tile.level);
}

@fragment fn orbit_fragment(v:OrbitVarying)->@location(0) vec4<f32> {
  if(frame.options.z>.5){
    return vec4<f32>(.45+.4*cos(vec3<f32>(0,2,4)+f32(v.level)*.85),1);
  }
  let radial=normalize(v.radial);
  let distance=length(v.relative);
  let ray=v.relative/max(distance,.001);
  let gradient=v.terrain.yzw-radial*dot(radial,v.terrain.yzw);
  let normal=normalize(radial-gradient*studioReliefMeters*style.world.x*.68);
  let day=dot(radial,sun());
  let ground=v.terrain.x*studioReliefMeters*style.world.x;
  let depth=style.ocean.x-ground;
  var color=preset_color(v.terrain.x,1.0)*solar_light(day,max(0.0,dot(normal,sun())),1.0,.27);
  if(style.ocean.y>.5&&depth>0.0){
    let water=mix(style.shallowWater.xyz,style.deepWater.xyz,1.0-exp(-depth*style.deepWater.w));
    let reflection=sky_air_color(radial,reflect(ray,radial))*.66;
    let fresnel=.025+.72*pow(1.0-max(0.0,dot(radial,-ray)),5.0);
    let lit=water*solar_light(day,max(0.0,day),1.0,.30);
    color=mix(color,mix(lit,reflection,fresnel),smoothstep(0.0,max(2.0,distance*frame.forward.w*.15),depth));
  }
  color=mix(color,sky_air_color(radial,-ray),terrain_haze(radial,-ray,distance));
  return vec4<f32>(pow(color,vec3<f32>(1.0/2.2)),1.0);
}
