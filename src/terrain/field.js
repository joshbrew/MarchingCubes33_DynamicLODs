// Deterministic world-space height and analytic gradient; shared by tests and WGSL.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.TerrainField = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const bands = [[2400,140],[1000,65],[420,28],[180,12],[72,5],[28,2],[10,0.8]];
  const bounds = [-380, 480];
  function hash(x, z, seed = 7) {
    let h = (Math.imul(x, 0x8da6b343) ^ Math.imul(z, 0xd8163841) ^ Math.imul(seed, 0xcb1ab31f)) >>> 0;
    h = Math.imul(h ^ (h >>> 16), 0x7feb352d) >>> 0;
    h = Math.imul(h ^ (h >>> 15), 0x846ca68b) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295 * 2 - 1;
  }
  function noise(x, z, seed) {
    const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
    const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
    const du = 6 * fx * (1 - fx), dv = 6 * fz * (1 - fz);
    const a = hash(ix,iz,seed), b = hash(ix+1,iz,seed), c = hash(ix,iz+1,seed), d = hash(ix+1,iz+1,seed);
    return [a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v,
      ((b-a)*(1-v)+(d-c)*v)*du, ((c-a)*(1-u)+(d-b)*u)*dv];
  }
  function heightGradient(x,z,seed=7) {
    const output=[25,0,0];
    for(let i=0;i<bands.length;i++) {
      const [wave,amplitude]=bands[i],n=noise(x/wave+13.71,z/wave-8.29,seed+i*19);
      output[0]+=n[0]*amplitude; output[1]+=n[1]*amplitude/wave; output[2]+=n[2]*amplitude/wave;
    }
    const ridge=noise(x/620-2.7,z/620+4.1,seed+101),r=1-Math.abs(ridge[0]);
    output[0]+=r*r*100-50;
    const derivative=-2*r*Math.sign(ridge[0])*100/620;
    output[1]+=derivative*ridge[1]; output[2]+=derivative*ridge[2];
    return output;
  }
  function estimatedError(step) {
    let error=0;
    for(const [wave,amplitude] of bands) error+=amplitude*Math.min(1,2*(step/wave)**2);
    // Ridge cusps have first-order error rather than the smooth bands' curvature.
    return error+100*Math.min(1,step/620)*0.15;
  }
  const wgsl = `
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
`;
  return { hash, heightGradient, height:(x,z,seed=7)=>heightGradient(x,z,seed)[0], estimatedError, bounds, wgsl };
});
