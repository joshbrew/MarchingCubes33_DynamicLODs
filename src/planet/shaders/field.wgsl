const terrainRotation=mat3x3<f32>(
  vec3<f32>(4,28,-10)/30.0, vec3<f32>(-20,10,20)/30.0, vec3<f32>(22,4,20)/30.0);
const octaveTwist=mat3x3<f32>(
  vec3<f32>(4,8,1)/9.0, vec3<f32>(-4,1,8)/9.0, vec3<f32>(7,-4,4)/9.0);
struct PlanetSurface {
  height:f32, value:f32, gradient:vec3<f32>, patina:f32, shelter:f32,
  basin:f32, mineral:f32, uv:vec2<f32>, rock:vec4<f32>, baseGradient:vec3<f32>,
}
fn planet_surface(dir:vec3<f32>, radius:f32, seed:u32, footprint:f32, materialPixel:f32,
  base:StudioNoise, rock:vec4<f32>, bands:u32, detail:vec4<f32>, modes:vec3<f32>)->PlanetSurface {
  let scale=studioReliefMeters;
  let p=(terrainRotation*dir)*radius;
  let twistedPoint=octaveTwist*p;
  let studioSlope=terrainRotation*base.gradient;
  var height=base.height*scale;
  var gradient=vec3<f32>(0.0);
  var warp=vec2<f32>(1.15*base.height,0.0);
  var warpXGradient=1.15*studioSlope;
  var ridgeCarry=0.0;
  var ridgeCarrySlope=vec3<f32>(0.0);
  let upland=clamp((base.height+1.0)/3.0,0.0,1.0);
  let regionalStrength=.60+.62*upland*upland*(3.0-2.0*upland);
  let regionalSlope=studioSlope*(.62*2.0*upland*(1.0-upland));
  let waves=array<f32,2>(8600,3600);
  let amplitudes=array<f32,2>(290,165);
  let terraces=array<f32,2>(.13,.22);
  for(var level=0u;level<2u;level++){
    let wave=waves[level];
    let bandWeight=1.0-smoothstep(wave*.18,wave*.52,footprint);
    if(bandWeight<=0.0){break;}
    let crestWeight=1.0-smoothstep(wave*.065,wave*.19,footprint);
    let twisted=level==1u;
    let point=select(p,twistedPoint,twisted);
    let domain=mix(vec3<f32>(1.0),vec3<f32>(1.18,.70,.94),rock.x);
    let n=planet_noise(point*domain/wave+vec3<f32>(warp,0),seed+131u+level*19u);
    let groove=max(0.0,1.0-n.value*n.value/(.34*.34));
    let amplitude=amplitudes[level]*bandWeight*(1.0-.66*rock.y-.52*rock.z);
    let cut=.11*crestWeight;
    let layer=(n.value+1.0)*4.0;
    let edge=clamp((fract(layer)-.22)/.56,0.0,1.0);
    let shelf=(floor(layer)+edge*edge*(3.0-2.0*edge))*.25-1.0;
    let rounded=mix(n.value,shelf,terraces[level])-cut*groove*groove;
    // Chain the derivative through the offset, then through the cut in the height profile.
    let nativeSlope=n.slope*domain;
    let unwarpedSlope=select(nativeSlope,transpose(octaveTwist)*nativeSlope,twisted);
    let slope=unwarpedSlope/wave+n.slope.x*warpXGradient;
    let roundedSlope=mix(1.0,6.0*edge*(1.0-edge)/.56,terraces[level])+
      (4.0*cut/(.34*.34))*n.value*groove;
    var form=rounded;
    var shapeSlope=roundedSlope;
    if(rock.x>0.0){
      // Break the baked slopes into kilometer-scale divides and shoulders.
      // The second band only reaches full strength on the first band's ridge.
      let magnitude=length(vec2<f32>(n.value,.012));
      let width=select(.66,.90,n.value>0.0);
      let crest=max(0.0,1.0-(magnitude-.012)/width);
      let ridge=crest*crest;
      let ridgeSlope=-2.0*crest*n.value/(width*magnitude);
      let parent=select(1.0,ridgeCarry,level==1u);
      let relief=select(1.72,2.25,level==1u);
      let weight=min(.97,.89*detail.x)*crestWeight*rock.x;
      let sculpted=.31*n.value+relief*(ridge*parent-.28);
      form=mix(form,sculpted,weight);
      shapeSlope=mix(shapeSlope,.31+relief*ridgeSlope*parent,weight);
      if(level==0u){
        ridgeCarry=.30+.70*ridge;
        ridgeCarrySlope=.70*ridgeSlope*slope;
      }else{
        gradient+=amplitude*regionalStrength*weight*relief*ridge*ridgeCarrySlope;
      }
    }
    height+=amplitude*regionalStrength*form;
    gradient+=amplitude*(slope*(regionalStrength*shapeSlope)+form*regionalSlope);
    if(level==1u){break;}
    let along=.18+.16*crestWeight;
    warp=vec2<f32>(.65*n.value+along*n.slope.y,0);
    warpXGradient=.65*slope+along*(n.dySlope*domain/wave+n.dySlope.x*warpXGradient);
  }
  let terrainSlope=base.gradient*scale+transpose(terrainRotation)*gradient;
  let drainage=local_relief(dir,radius,seed,base.gradient*scale,base.height*scale,height,terrainSlope,
    footprint,materialPixel,bands,detail,modes,rock);
  let rockFace=smoothstep(.40,1.9,length(base.gradient*scale));
  let wallDetail=rockFace*(.65+.92*smoothstep(5.0,52.0,footprint));
  let slope=terrainSlope+drainage.slope*(1.0+wallDetail)+drainage.groundSlope;
  return PlanetSurface(height+drainage.height,base.height,slope,drainage.pigment,
    drainage.channels,base.concavity,drainage.pigment,base.uv,rock,base.gradient*scale);
}
