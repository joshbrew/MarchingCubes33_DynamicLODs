struct RockVarying {
  @builtin(position) clip:vec4<f32>,
  @location(0) relative:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) bed:vec2<f32>,
}
@vertex fn rock_vertex(
  @location(0) world:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) bed:vec2<f32>
)->RockVarying{
  let relative=world-frame.eye.xyz;
  var clip=frame.vp*vec4<f32>(relative,1);
  clip.z=(clip.z+clip.w)*.5;
  return RockVarying(clip,relative,normal,bed);
}
@fragment fn rock_fragment(v:RockVarying)->@location(0) vec4<f32>{
  let world=v.relative+frame.eye.xyz;
  let up=normalize(world);
  let n=normalize(v.normal);
  let detail=1.0-smoothstep(2.0,9.0,max(length(dpdx(v.relative)),length(dpdy(v.relative))));
  let weather=planet_noise(world/86.0,3401u).value;
  let grain=planet_noise(world/14.0,2619u);
  let face=normalize(n-detail*.15*(grain.slope-n*dot(grain.slope,n)));
  let bed=v.bed.x*19.0+weather*.70;
  let stratum=.78+.22*smoothstep(-.50,.68,sin(bed)+.31*sin(bed*2.74));
  let basalt=vec3<f32>(.18,.17,.15);
  let sandstone=mix(vec3<f32>(.46,.25,.13),vec3<f32>(.54,.36,.23),smoothstep(-.3,.42,weather));
  let stone=mix(basalt,sandstone,v.bed.y);
  let elevation=(length(world)-frame.eye.w)/(studioReliefMeters*style.world.x);
  let ground=preset_color(elevation,1.0);
  let rooted=mix(.24,.83,smoothstep(-.22,.60,v.bed.x));
  let color=mix(ground,stone,rooted)*mix(1.0,stratum,rooted)*(1.0+.13*grain.value*detail);
  let above=dot(up,face);
  let diffuse=max(0.0,dot(face,sun()));
  let day=dot(up,sun());
  var visibility=1.0;
  if(day>-.008&&day<.94){visibility=shadow_visibility(studio_uv(up));}
  let light=solar_light(day,diffuse,visibility,.26*(.66+.34*max(0.0,above)));
  let ray=normalize(v.relative);
  let haze=terrain_haze(up,ray,length(v.relative));
  return vec4<f32>(pow(mix(color*light,sky_air_color(up,ray),haze),vec3<f32>(1.0/2.2)),1.0);
}
