struct Frame {
  vp:mat4x4<f32>, eye:vec4<f32>, right:vec4<f32>, up:vec4<f32>, forward:vec4<f32>, options:vec4<f32>,
  solar:vec4<f32>, air:vec4<f32>, dusk:vec4<f32>, surface:vec4<f32>,
}
@group(0) @binding(0) var<uniform> frame:Frame;
struct RockShadow { center:vec4<f32>, along:vec4<f32>, across:vec4<f32> }
struct PlanetStyle {
  palette:vec4<f32>, ocean:vec4<f32>, detail:vec4<f32>, modes:vec4<f32>, stops:array<vec4<f32>,32>,
  world:vec4<f32>, springChart:vec4<f32>, duneChart:vec4<f32>, duneWind:vec4<f32>,
  rockShadows:array<RockShadow,2>,
  climate:vec4<f32>, shallowWater:vec4<f32>, deepWater:vec4<f32>,
  coastSediment:vec4<f32>, coastOutcrop:vec4<f32>, coastShoal:vec4<f32>,
  lunarMaterial:vec4<f32>,
}
@group(0) @binding(2) var<uniform> style:PlanetStyle;
@group(0) @binding(4) var sunVisibility:texture_2d_array<f32>;
@group(0) @binding(5) var sunSampler:sampler;
fn sun()->vec3<f32>{return frame.solar.xyz;}
fn shadow_visibility(uv:vec2<f32>)->f32{
  let layer=i32(frame.dusk.w);
  let a=textureSampleLevel(sunVisibility,sunSampler,uv,layer,0.0).r;
  if(frame.solar.w==0.0){return a;}
  let b=textureSampleLevel(sunVisibility,sunSampler,uv,1-layer,0.0).r;
  return mix(a,b,frame.solar.w);
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
  let horizon=(1.0-zenith)*(1.0-zenith);
  let day=dot(up,sun());
  let daylight=smoothstep(-.16,.28,day);
  let twilight=smoothstep(-.23,-.035,day)*(1.0-smoothstep(.03,.38,day));
  let facing=clamp(.5+.5*dot(ray,sun()),0.0,1.0);
  let sunward=facing*facing*facing;
  let blue=mix(frame.air.xyz*vec3<f32>(.16,.28,.53),frame.air.xyz,horizon);
  let dusk=frame.dusk.xyz*twilight*(.06+.48*sunward)*(.13+.87*horizon);
  return vec3<f32>(.002,.0035,.007)+blue*(.019+.98*daylight)+dusk;
}
fn solar_light(day:f32, diffuse:f32, visibility:f32, ambient:f32)->vec3<f32>{
  let twilight=smoothstep(-.20,.24,day);
  let lit=smoothstep(-.008,.025,day);
  let tint=mix(mix(vec3<f32>(1.0,.42,.18),frame.dusk.xyz,.32),vec3<f32>(1.10,1.01,.88),smoothstep(0.0,.38,day));
  let skyTint=mix(vec3<f32>(.70,.84,1.10),normalize(frame.air.xyz)*1.64,.34);
  let fill=ambient*mix(.075,.98,twilight);
  return fill*skyTint+(.94-ambient)*diffuse*lit*visibility*tint;
}
fn terrain_haze(up:vec3<f32>,ray:vec3<f32>,distance:f32)->f32{
  let horizon=1.0-max(0.0,dot(-ray,up));
  let air=exp(-max(0.0,length(frame.eye.xyz)-frame.eye.w)/44000.0)*frame.air.w;
  return .22*air*horizon*horizon*(1.0-exp(-distance/54000.0));
}
const studioReliefMeters=262144.0*.023;
