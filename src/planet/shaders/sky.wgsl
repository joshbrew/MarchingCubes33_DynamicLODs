struct SkyVertex { @builtin(position) clip:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn sky_vertex(@builtin(vertex_index) i:u32)->SkyVertex {
  let uv=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));
  return SkyVertex(vec4<f32>(uv[i],.999999,1),uv[i]);
}
@fragment fn sky_fragment(v:SkyVertex)->@location(0) vec4<f32> {
  let ray=normalize(frame.forward.xyz+frame.right.xyz*v.uv.x*frame.right.w+
    frame.up.xyz*v.uv.y*frame.up.w);
  let eye=frame.eye.xyz; let r=frame.eye.w;
  let altitude=max(0.0,length(eye)-r);
  let air=exp(-altitude/18000.0)*frame.air.w;
  let up=normalize(eye);
  let day=dot(up,sun());
  let color=sky_air_color(up,ray)*air;
  let star=pow(clamp((planet_hash(vec3<i32>(floor(ray*1024.0)),58u)-.9965)/.0035,0.0,1.0),3.0)*.46;
  let opaqueAir=(1.0-smoothstep(10000.0,52000.0,altitude))*frame.air.w;
  let starVisibility=1.0-clamp(opaqueAir*smoothstep(-.20,.08,day),0.0,1.0);
  var result=vec3<f32>(.0007,.0012,.0025)+star*starVisibility*starVisibility+color;
  let closest=length(cross(eye,ray));
  let limb=(1.0-smoothstep(r+500.0,r+7000.0,closest))*
    smoothstep(r-5500.0,r+500.0,closest)*step(dot(eye,ray),0.0)*smoothstep(14000.0,44000.0,altitude);
  let limbUp=normalize(eye-ray*dot(eye,ray)+vec3<f32>(1e-6));
  result+=sky_air_color(limbUp,ray)*limb*frame.air.w;
  let sunAngle=length(ray-sun());
  let pixel=max(.0004,frame.forward.w*.65);
  let disk=1.0-smoothstep(max(0.0,.013-pixel),.013+pixel,sunAngle);
  let halo=exp(-sunAngle*18.0)*.24*air;
  let sunColor=mix(mix(vec3<f32>(1.0,.31,.11),frame.dusk.xyz,.40),vec3<f32>(1.0,.91,.70),
    mix(smoothstep(-.04,.35,day),1.0,1.0-clamp(air,0.0,1.0)));
  result+=(disk*2.2+halo)*sunColor;
  return vec4<f32>(pow(clamp(result,vec3<f32>(0),vec3<f32>(1)),vec3<f32>(1.0/2.2)),1);
}
