fn terrain_hash(p: vec2<i32>, seed: u32) -> f32 {
  var h = (bitcast<u32>(p.x)*0x8da6b343u) ^ (bitcast<u32>(p.y)*0xd8163841u) ^ (seed*0xcb1ab31fu);
  h = (h ^ (h >> 16u))*0x7feb352du;
  h = (h ^ (h >> 15u))*0x846ca68bu;
  return f32(h ^ (h >> 16u))/4294967295.0*2.0-1.0;
}
fn terrain_noise(p: vec2<f32>, seed: u32) -> vec3<f32> {
  let cell=vec2<i32>(floor(p)); let f=fract(p);
  let uv=f*f*(vec2<f32>(3.0)-2.0*f); let grad=6.0*f*(vec2<f32>(1.0)-f);
  let a=terrain_hash(cell,seed); let b=terrain_hash(cell+vec2<i32>(1,0),seed);
  let c=terrain_hash(cell+vec2<i32>(0,1),seed); let d=terrain_hash(cell+vec2<i32>(1,1),seed);
  return vec3<f32>(mix(mix(a,b,uv.x),mix(c,d,uv.x),uv.y),
    mix(b-a,d-c,uv.y)*grad.x,mix(c-a,d-b,uv.x)*grad.y);
}
fn terrain_height_gradient(xz: vec2<f32>, seed: u32) -> vec3<f32> {
  var waves=array<f32,7>(2400.0,1000.0,420.0,180.0,72.0,28.0,10.0);
  var amplitudes=array<f32,7>(140.0,65.0,28.0,12.0,5.0,2.0,0.8);
  var result=vec3<f32>(25.0,0.0,0.0);
  for(var i=0u;i<7u;i++) {
    let n=terrain_noise(xz/waves[i]+vec2<f32>(13.71,-8.29),seed+i*19u);
    result+=vec3<f32>(n.x,n.y/waves[i],n.z/waves[i])*amplitudes[i];
  }
  let n=terrain_noise(xz/620.0+vec2<f32>(-2.7,4.1),seed+101u); let r=1.0-abs(n.x);
  result.x+=r*r*100.0-50.0;
  result=vec3<f32>(result.x,result.yz+n.yz*(-2.0*r*sign(n.x)*100.0/620.0));
  return result;
}
