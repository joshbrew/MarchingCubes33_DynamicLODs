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
struct PlanetNoise { value:f32, slope:vec3<f32>, dySlope:vec3<f32>, dxSlope:vec3<f32> }
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
  let x0=mix(b-a,e-d,t.y); let x1=mix(i-h,k-j,t.y);
  let xBlend=mix(x0,x1,t.z);
  let dx=xBlend*g.x;
  let yBlend=mix(y0,y1,t.z);
  let dy=yBlend*g.y;
  let dz=(z1-z0)*g.z;
  let slope=value.yzw+vec3<f32>(dx.x,dy.x,dz.x);
  let dd=60.0*f*(f-1.0)*(2.0*f-1.0);
  let dySlope=vec3<f32>(
    dx.z+dy.y+mix((e.x-d.x)-(b.x-a.x),(k.x-j.x)-(i.x-h.x),t.z)*g.x*g.y,
    2.0*dy.z+yBlend.x*dd.y,
    dz.z+dy.w+(y1.x-y0.x)*g.y*g.z);
  let dxSlope=vec3<f32>(
    2.0*dx.y+xBlend.x*dd.x,dySlope.x,dx.w+dz.y+(x1.x-x0.x)*g.x*g.z);
  return PlanetNoise(value.x,slope,dySlope,dxSlope);
}
const terrainRotation=mat3x3<f32>(
  vec3<f32>(4,28,-10)/30.0, vec3<f32>(-20,10,20)/30.0, vec3<f32>(22,4,20)/30.0);
const octaveTwist=mat3x3<f32>(
  vec3<f32>(4,8,1)/9.0, vec3<f32>(-4,1,8)/9.0, vec3<f32>(7,-4,4)/9.0);
struct PlanetSurface {
  height:f32, value:f32, gradient:vec3<f32>, patina:f32, shelter:f32,
  basin:f32, mineral:f32, uv:vec2<f32>,
}
fn planet_surface(dir:vec3<f32>, radius:f32, seed:u32, footprint:f32, side:i32, bands:u32, mesa:bool, mountains:bool)->PlanetSurface {
  let base=studio_noise(dir,radius,side,footprint);
  let scale=radius*(1.15/50.0);
  let p=(terrainRotation*dir)*radius;
  let twistedPoint=octaveTwist*p;
  let studioSlope=terrainRotation*base.gradient;
  var height=base.height*scale;
  var gradient=vec3<f32>(0.0);
  var warp=vec2<f32>(1.15*base.height,0.0);
  var warpXGradient=1.15*studioSlope;
  var warpYGradient=vec3<f32>(0.0);
  var rock=0.0;
  var rockSlope=vec3<f32>(0.0);
  var strataWarp=0.0;
  var strataSlope=vec3<f32>(0.0);
  var patina=0.0;
  var shelter=0.0;
  var mineral=0.0;
  var ridgeCarry=0.0;
  var ridgeCarrySlope=vec3<f32>(0.0);
  let region=clamp(radius/262144.0,.32,1.0);
  let upland=clamp((base.height+1.0)/3.0,0.0,1.0);
  let regionalStrength=.60+.62*upland*upland*(3.0-2.0*upland);
  let regionalSlope=studioSlope*(.62*2.0*upland*(1.0-upland));
  let waves=array<f32,11>(8600,3600,1550,720,340,155,68,26,6,1.8,.55);
  let amplitudes=array<f32,11>(290,165,124,86,54,26,12,4.2,.74,.22,.07);
  let terraces=array<f32,11>(.13,.22,.08,.12,.15,.23,.31,.40,.22,0,0);
  let ridges=array<f32,11>(0,.06,0,0,0,0,0,.66,0,0,0);
  let normalWarp=array<f32,11>(0,.21,.20,.32,.41,.52,.67,0,0,0,0);
  let bandSeeds=array<u32,11>(0,1,9,2,10,3,4,5,6,7,8);
  for(var level=0u;level<bands;level++){
    let regional=level<2u;
    let wave=waves[level]*select(1.0,region,regional);
    let bandWeight=select(1.0,1.0-smoothstep(wave*.14,wave*.45,footprint),level>=2u);
    if(bandWeight<=0.0){break;}
    // A ridge lip or groove is much narrower than its source octave.
    let crestWeight=1.0-smoothstep(wave*.065,wave*.19,footprint);
    let bandSeed=bandSeeds[level];
    let twisted=bandSeed%2u==1u;
    let point=select(p,twistedPoint,twisted);
    let ribs=level>=2u && level<=6u;
    let domain=select(vec3<f32>(1.0),vec3<f32>(1.25,.46,1.05),ribs);
    let n=planet_noise(point*domain/wave+vec3<f32>(warp,0),seed+131u+bandSeed*19u);
    let groove=max(0.0,1.0-n.value*n.value/(.34*.34));
    let amplitude=amplitudes[level]*bandWeight*select(1.0,region,regional);
    let strength=select(1.0,regionalStrength,regional);
    let cut=select(.36,.11,level<7u)*crestWeight;
    let layer=(n.value+1.0)*4.0;
    let edge=clamp((fract(layer)-.22)/.56,0.0,1.0);
    let shelf=(floor(layer)+edge*edge*(3.0-2.0*edge))*.25-1.0;
    let rounded=mix(n.value,shelf,terraces[level])-cut*groove*groove;
    // Chain the derivative through the offset, then through the cut in the height profile.
    let nativeSlope=domain*n.slope;
    let unwarpedSlope=select(nativeSlope,transpose(octaveTwist)*nativeSlope,twisted);
    let slope=unwarpedSlope/wave+n.slope.x*warpXGradient+n.slope.y*warpYGradient;
    if(level==0u){
      let exposed=clamp((n.value+.29)/.61,0.0,1.0);
      rock=.36+.64*exposed*exposed*(3.0-2.0*exposed);
      rockSlope=(.64*6.0/.61)*exposed*(1.0-exposed)*slope;
      strataWarp=.38*n.value;
      strataSlope=.38*slope;
    }
    if(level==1u && mesa){
      // The warped layers cut continuous ledges into the actual mesh.
      let strata=base.height/.165+strataWarp+.24*n.value;
      let lip=clamp((fract(strata)-.3)/.4,0.0,1.0);
      let bed=.165*scale*.82*bandWeight;
      height+=bed*(floor(strata)+lip*lip*(3.0-2.0*lip)-strata);
      gradient+=bed*(6.0*lip*(1.0-lip)/.4-1.0)*(studioSlope/.165+strataSlope+.24*slope);
    }
    let roundedSlope=mix(1.0,6.0*edge*(1.0-edge)/.56,terraces[level])+
      (4.0*cut/(.34*.34))*n.value*groove;
    var form=rounded;
    var shapeSlope=roundedSlope;
    if(ridges[level]>0.0){
      let roundedAbs=length(vec2<f32>(n.value,.035));
      let crest=max(0.0,1.0-(roundedAbs-.035)/.27);
      let trough=(n.value-.27)/.25;
      let channel=max(0.0,1.0-trough*trough);
      let sculpted=.50*n.value+.89*crest*crest-.61*channel*channel;
      let sculptedSlope=.50-(1.78/.27)*crest*n.value/roundedAbs+(2.44/.25)*channel*trough;
      let ridgeMix=ridges[level]*crestWeight;
      let weight=ridgeMix*rock;
      form=mix(rounded,sculpted,weight);
      shapeSlope=mix(roundedSlope,sculptedSlope,weight);
      gradient+=amplitude*strength*(sculpted-rounded)*ridgeMix*rockSlope;
      shelter+=bandWeight*weight*channel*channel*.16;
    }
    if(mountains && regional){
      // Break the baked slopes into kilometer-scale divides and shoulders.
      // The second band only reaches full strength on the first band's ridge.
      let magnitude=length(vec2<f32>(n.value,.036));
      let width=select(.68,.88,n.value>0.0);
      let crest=max(0.0,1.0-(magnitude-.036)/width);
      let ridge=crest*crest;
      let ridgeSlope=-2.0*crest*n.value/(width*magnitude);
      let parent=select(1.0,ridgeCarry,level==1u);
      let relief=select(1.72,2.25,level==1u);
      let weight=.89*crestWeight;
      let sculpted=.31*n.value+relief*(ridge*parent-.28);
      form=mix(form,sculpted,weight);
      shapeSlope=mix(shapeSlope,.31+relief*ridgeSlope*parent,weight);
      if(level==0u){
        ridgeCarry=.30+.70*ridge;
        ridgeCarrySlope=.70*ridgeSlope*slope;
      }else{
        gradient+=amplitude*strength*weight*relief*ridge*ridgeCarrySlope;
      }
    }
    // The parent ridge gates the next octave, so outcrops cluster and fork.
    // Reuse the existing gradient noise sample and its derivative.
    if(level>=1u && level<=6u){
      let magnitude=length(vec2<f32>(n.value,.022));
      let crest=max(0.0,1.0-(magnitude-.022)/.72);
      let ridge=crest*crest;
      let ridgeSlope=-2.0*crest*n.value/(.72*magnitude);
      if(level>=2u){
        let weight=.78*(1.0-smoothstep(wave*.105,wave*.32,footprint));
        let ridged=.55*rounded+1.05*ridge*ridgeCarry-.36;
        form=mix(rounded,ridged,weight);
        shapeSlope=mix(roundedSlope,.55*roundedSlope+1.05*ridgeSlope*ridgeCarry,weight);
        gradient+=amplitude*strength*weight*1.05*ridge*ridgeCarrySlope;
        mineral+=bandWeight*(.23*n.value+.10*(ridge*ridgeCarry-.40));
      }
      ridgeCarry=.3+.7*min(1.0,1.58*ridge);
      ridgeCarrySlope=select((.7*1.58*ridgeSlope)*slope,vec3<f32>(0.0),1.58*ridge>=1.0);
    }
    if(level<9u){height+=amplitude*strength*form;}
    gradient+=amplitude*(slope*(strength*shapeSlope)+select(vec3<f32>(0.0),form*regionalSlope,regional));
    patina+=bandWeight*select(1.0,.52,regional)*(.16*n.value-.07*crestWeight*groove*groove);
    // Bend the next sample using two components of the current noise normal.
    // The rotated frames give the resulting ledges and hollows different axes.
    let warpGain=normalWarp[level]*crestWeight;
    let along=.18+.16*crestWeight+.14*warpGain;
    let across=-.22*warpGain;
    warp=vec2<f32>(.65*n.value+along*n.slope.y,across*n.slope.x);
    let nativeDy=domain*n.dySlope;
    let nativeDx=domain*n.dxSlope;
    let dySlope=select(nativeDy,transpose(octaveTwist)*nativeDy,twisted);
    let dxSlope=select(nativeDx,transpose(octaveTwist)*nativeDx,twisted);
    let gradX=.65*slope+along*(dySlope/wave+n.dySlope.x*warpXGradient+n.dySlope.y*warpYGradient);
    warpYGradient=across*(dxSlope/wave+n.dxSlope.x*warpXGradient+n.dxSlope.y*warpYGradient);
    warpXGradient=gradX;
  }
  return PlanetSurface(height,base.height,base.gradient*scale+transpose(terrainRotation)*gradient,
    patina,shelter,base.concavity,mineral,base.uv);
}
