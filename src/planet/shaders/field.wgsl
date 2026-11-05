fn planet_hash_bits(p:vec3<i32>, seed:u32)->u32 {
  var n=(bitcast<u32>(p.x)*0x8da6b343u)^(bitcast<u32>(p.y)*0xd8163841u)^
    (bitcast<u32>(p.z)*0xcb1ab31fu)^(seed*0x165667b1u);
  n=(n^(n>>16u))*0x7feb352du;
  n=(n^(n>>15u))*0x846ca68bu;
  return n^(n>>16u);
}
fn planet_hash(p:vec3<i32>, seed:u32)->f32 {
  return f32(planet_hash_bits(p,seed))/4294967295.0*2.0-1.0;
}
fn gradient_corner(cell:vec3<i32>,f:vec3<f32>,offset:vec3<i32>,seed:u32)->vec4<f32>{
  let h=planet_hash_bits(cell+offset,seed)&15u;
  let x=vec3<f32>(1,0,0); let y=vec3<f32>(0,1,0); let z=vec3<f32>(0,0,1);
  let a=select(y,x,h<8u);
  let b=select(select(z,x,h==12u||h==14u),y,h<4u);
  let g=(select(a,-a,(h&1u)!=0u)+select(b,-b,(h&2u)!=0u))*(1.15/sqrt(2.0));
  return vec4<f32>(dot(g,f-vec3<f32>(offset)),g);
}
struct PlanetNoise { value:f32, slope:vec3<f32>, dySlope:vec3<f32> }
fn planet_noise(p:vec3<f32>, seed:u32)->PlanetNoise {
  let c=vec3<i32>(floor(p)); let f=fract(p);
  let t=f*f*f*(10.0+f*(-15.0+6.0*f));
  let g=30.0*f*f*(1.0-f)*(1.0-f);
  let a=gradient_corner(c,f,vec3<i32>(0,0,0),seed);
  let b=gradient_corner(c,f,vec3<i32>(1,0,0),seed);
  let d=gradient_corner(c,f,vec3<i32>(0,1,0),seed);
  let e=gradient_corner(c,f,vec3<i32>(1,1,0),seed);
  let h=gradient_corner(c,f,vec3<i32>(0,0,1),seed);
  let i=gradient_corner(c,f,vec3<i32>(1,0,1),seed);
  let j=gradient_corner(c,f,vec3<i32>(0,1,1),seed);
  let k=gradient_corner(c,f,vec3<i32>(1,1,1),seed);
  let a0=mix(a,b,t.x); let a1=mix(d,e,t.x);
  let b0=mix(h,i,t.x); let b1=mix(j,k,t.x);
  let z0=mix(a0,a1,t.y); let z1=mix(b0,b1,t.y);
  let y0=a1-a0; let y1=b1-b0;
  let value=mix(z0,z1,t.z);
  let dx=mix(mix(b-a,e-d,t.y),mix(i-h,k-j,t.y),t.z)*g.x;
  let yBlend=mix(y0,y1,t.z);
  let dy=yBlend*g.y;
  let dz=(z1-z0)*g.z;
  let slope=value.yzw+vec3<f32>(dx.x,dy.x,dz.x);
  // The y row of the Hessian is enough for differentiating the slope warp.
  let dySlope=vec3<f32>(
    dx.z+dy.y+mix((e.x-d.x)-(b.x-a.x),(k.x-j.x)-(i.x-h.x),t.z)*g.x*g.y,
    2.0*dy.z+yBlend.x*60.0*f.y*(f.y-1.0)*(2.0*f.y-1.0),
    dz.z+dy.w+(y1.x-y0.x)*g.y*g.z);
  return PlanetNoise(value.x,slope,dySlope);
}
const terrainRotation=mat3x3<f32>(
  vec3<f32>(4,28,-10)/30.0, vec3<f32>(-20,10,20)/30.0, vec3<f32>(22,4,20)/30.0);
const octaveTwist=mat3x3<f32>(
  vec3<f32>(4,8,1)/9.0, vec3<f32>(-4,1,8)/9.0, vec3<f32>(7,-4,4)/9.0);
struct PlanetSurface { height:f32, value:f32, gradient:vec3<f32>, patina:f32 }
fn planet_surface(dir:vec3<f32>, radius:f32, seed:u32, footprint:f32, side:i32, bands:u32, mesa:bool)->PlanetSurface {
  let base=studio_noise(dir,radius,side);
  let scale=radius*(1.15/50.0);
  let p=(terrainRotation*dir)*radius;
  let twistedPoint=octaveTwist*p;
  let studioSlope=terrainRotation*base.yzw;
  var height=base.x*scale;
  var gradient=vec3<f32>(0.0);
  var warp=1.15*base.x;
  var warpGradient=1.15*studioSlope;
  var patina=0.0;
  let region=clamp(radius/262144.0,.32,1.0);
  let upland=clamp((base.x+1.0)/3.0,0.0,1.0);
  let regionalStrength=.60+.62*upland*upland*(3.0-2.0*upland);
  let regionalSlope=studioSlope*(.62*2.0*upland*(1.0-upland));
  let waves=array<f32,9>(8600,2600,780,230,68,20,6,1.8,.55);
  let amplitudes=array<f32,9>(290,115,40,17,5.8,2.1,.74,.22,.07);
  let terraces=array<f32,9>(.18,.34,.22,.52,.54,.40,.22,0,0);
  for(var level=0u;level<bands;level++){
    let regional=level<2u;
    let wave=waves[level]*select(1.0,region,regional);
    let bandWeight=1.0-smoothstep(wave*.14,wave*.45,footprint);
    if(bandWeight<=0.0){break;}
    let twisted=level%2u==1u;
    let point=select(p,twistedPoint,twisted);
    let n=planet_noise(point/wave+vec3<f32>(warp,0,0),seed+131u+level*19u);
    let groove=max(0.0,1.0-n.value*n.value/(.34*.34));
    let amplitude=amplitudes[level]*bandWeight*select(1.0,region,regional);
    let strength=select(1.0,regionalStrength,regional);
    let cut=select(.36,.30,regional);
    let layer=(n.value+1.0)*4.0;
    let edge=clamp((fract(layer)-.22)/.56,0.0,1.0);
    let shelf=(floor(layer)+edge*edge*(3.0-2.0*edge))*.25-1.0;
    let form=mix(n.value,shelf,terraces[level])-cut*groove*groove;
    if(level<7u){height+=amplitude*strength*form;}
    // Chain the derivative through the offset, then through the cut in the height profile.
    let unwarpedSlope=select(n.slope,transpose(octaveTwist)*n.slope,twisted);
    let slope=unwarpedSlope/wave+n.slope.x*warpGradient;
    if(level==0u && mesa){
      // The warped layers cut continuous ledges into the actual mesh.
      let strata=base.x/.165+.38*n.value;
      let lip=clamp((fract(strata)-.3)/.4,0.0,1.0);
      let bed=.165*scale*.82*bandWeight;
      height+=bed*(floor(strata)+lip*lip*(3.0-2.0*lip)-strata);
      gradient+=bed*(6.0*lip*(1.0-lip)/.4-1.0)*(studioSlope/.165+.38*slope);
    }
    let shapeSlope=mix(1.0,6.0*edge*(1.0-edge)/.56,terraces[level])+
      (4.0*cut/(.34*.34))*n.value*groove;
    gradient+=amplitude*(slope*(strength*shapeSlope)+select(vec3<f32>(0.0),form*regionalSlope,regional));
    patina+=bandWeight*select(1.0,.52,regional)*(.16*n.value-.07*groove*groove);
    warp=.65*n.value+.34*n.slope.y;
    let dySlope=select(n.dySlope,transpose(octaveTwist)*n.dySlope,twisted);
    warpGradient=.65*slope+.34*(dySlope/wave+n.dySlope.x*warpGradient);
  }
  return PlanetSurface(height,base.x,base.yzw*scale+transpose(terrainRotation)*gradient,patina);
}
