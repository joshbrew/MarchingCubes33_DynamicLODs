// Compact, slope-steered carrier for the scales below the baked erosion map.
// Each cell fades to zero at its boundary. The chart overlap closes the globe.
fn drainage_carrier(p:vec2<f32>,wave:vec2<f32>,seed:u32)->vec2<f32>{
  let cell=vec2<i32>(floor(p));
  let f=fract(p);
  let w=f*f*(3.0-2.0*f);
  var sum=vec2<f32>(0.0);
  for(var j=0;j<2;j++){
    for(var i=0;i<2;i++){
      let corner=vec2<i32>(i,j);
      let hash=planet_hash_bits(vec3<i32>(cell+corner,0),seed);
      let jitter=vec2<f32>(f32(hash&255u),f32((hash>>8u)&255u))*(.60/255.0)-.30;
      let phase=dot(f-vec2<f32>(corner)-jitter,wave)+1.57;
      let weight=select(1.0-w,w,corner>vec2<i32>(0));
      sum+=vec2<f32>(cos(phase),sin(phase))*weight.x*weight.y;
    }
  }
  return sum/max(.50,length(sum));
}

struct DrainageChart { point:vec2<f32>, slope:vec2<f32>, du:vec3<f32>, dv:vec3<f32> }
fn drainage_chart(dir:vec3<f32>,radius:f32,grade:vec3<f32>,hemisphere:f32)->DrainageChart{
  let projection=max(.5,1.0+hemisphere*dir.y);
  let uv=dir.xz/projection;
  let angular=vec3<f32>(dir.x,hemisphere+dir.y,dir.z);
  let du=vec3<f32>(1,0,0)-uv.x*angular;
  let dv=vec3<f32>(0,0,1)-uv.y*angular;
  let metric=2.0/(1.0+dot(uv,uv));
  return DrainageChart(uv*radius,vec2<f32>(dot(grade,du),dot(grade,dv))*metric,du/projection,dv/projection);
}

struct DrainageState { slope:vec2<f32>, fade:f32, mask:f32 }
fn drainage_start(grade:vec2<f32>)->DrainageState{
  return DrainageState(.74*normalize(grade+vec2<f32>(1e-5,0)),0.0,smoothstep(.045,.60,length(grade)));
}

// Use a separate, nearly constant flank slope to steer the smaller gullies.
// Their height fades back to the parent crest or crease at branch junctions.
fn drainage_band(chart:DrainageChart, wave:f32, amplitude:f32, seed:u32, state:ptr<function,DrainageState>)->vec4<f32>{
  let flow=normalize((*state).slope+vec2<f32>(1e-5,0));
  let across=vec2<f32>(-flow.y,flow.x)*7.1;
  let carrier=drainage_carrier(chart.point/wave,across,seed);
  let phase=carrier.x*(.58+.42*abs(carrier.x));
  let coverage=(*state).mask;
  let trough=max(0.0,-phase);
  let height=amplitude*(mix((*state).fade,.70*phase-1.05*trough*trough,coverage)-.10);
  let slope=-amplitude*(.70+2.10*trough)*coverage*(.58+.84*abs(carrier.x))*carrier.y*across/wave;
  (*state).fade=mix((*state).fade,phase,coverage);
  (*state).mask=coverage*(1.6-.6*coverage)*smoothstep(.02,.49,abs(carrier.y));
  let steering=carrier.y*inverseSqrt(.09+carrier.y*carrier.y);
  (*state).slope-=across*(amplitude*.71/wave)*steering;
  return vec4<f32>(height,slope,smoothstep(.28,.97,-(*state).fade));
}

struct LocalRelief { height:f32, slope:vec3<f32>, groundSlope:vec3<f32>, channels:f32, pigment:f32 }
fn local_relief(dir:vec3<f32>,radius:f32,seed:u32,grade:vec3<f32>,baseHeight:f32,
  terrainHeight:f32,terrainSlope:vec3<f32>,footprint:f32,materialPixel:f32,
  bands:u32, detail:vec4<f32>, modes:vec3<f32>, rockType:vec4<f32>)->LocalRelief{
  var result=LocalRelief(0.0,vec3<f32>(0),vec3<f32>(0),0.0,0.0);
  if(footprint>=1125.0 || detail.z+detail.w==0.0){return result;}
  let strength=smoothstep(.05,.76,length(grade));
  let wall=smoothstep(.45,2.0,length(grade-dir*dot(dir,grade)));
  let overlap=smoothstep(-.19,.19,dir.y);
  let north=drainage_chart(dir,radius,grade,1.0);
  let south=drainage_chart(dir,radius,grade,-1.0);
  var parentN=drainage_start(north.slope);
  var parentS=drainage_start(south.slope);
  var province=vec2<f32>(1.0);
  if(detail.y>0.0){
    let a=planet_noise(dir*5.8+vec3<f32>(.87,-1.52,2.3),seed+811u).value;
    let b=planet_noise(dir*9.2+vec3<f32>(-2.4,.63,1.1),seed+1979u).value;
    province=mix(vec2<f32>(1.0),mix(vec2<f32>(.25,.35),vec2<f32>(1.0),
      smoothstep(vec2<f32>(-.47),vec2<f32>(.31),vec2<f32>(a,b))),detail.y);
  }
  let waves=array<f32,9>(2500,1100,475,180,65,22,6,1.8,.55);
  let heights=array<f32,9>(245,138,73,24,7,2.25,.60,.18,.04);
  let graniteWear=1.0-.74*rockType.z;
  let hillsideWear=dot(rockType,vec4<f32>(1.32,.86,.74,.84));
  var groundRadius=radius;
  var groundGrade=terrainSlope;
  for(var i=0u;i<bands;i++){
    let wave=waves[i];
    let sampleSize=select(footprint,max(footprint,materialPixel),i>=7u);
    let weight=1.0-smoothstep(wave*.12,wave*.45,sampleSize);
    if(weight<=0.0){break;}
    let ground=i>=4u;
    if(i==4u){
      // Freeze the domain at the larger terrain scales. Fine octaves sample
      // actual relief in meters, including the sides of gullies and cliffs.
      groundRadius=radius+terrainHeight+result.height;
      groundGrade=terrainSlope+result.slope;
    }
    let octave=i-select(0u,4u,ground);
    if(octave>=u32(select(detail.z,detail.w,ground))){continue;}
    let mode=select(modes.x,modes.y,ground);
    let mask=select(province.x*graniteWear,province.y,ground);
    let amplitude=heights[i]*weight*mask;
    let salt=seed+3023u+i*71u;
    var height=0.0;
    var slope=vec3<f32>(0);
    if(mode==0.0){
      let flowWeight=select(1.0,select(mix(.60,.22,wall),mix(1.0,.65,wall),i==4u),ground);
      let wet=amplitude*mix(.06,1.0,strength)*flowWeight;
      let cutStrength=select(modes.z*hillsideWear*select(1.0,.84,i==0u),min(1.45,modes.z),ground);
      if(i<6u && overlap>0.0){
        let cut=drainage_band(north,wave,wet,salt,&parentN);
        height+=overlap*cut.x*cutStrength;
        slope+=overlap*(north.du*cut.y+north.dv*cut.z)*cutStrength;
        result.channels+=overlap*cut.w*weight*strength*mask*.11*flowWeight*min(1.5,cutStrength);
      }
      if(i<6u && overlap<1.0){
        let cut=drainage_band(south,wave,wet,salt+1471u,&parentS);
        height+=(1.0-overlap)*cut.x*cutStrength;
        slope+=(1.0-overlap)*(south.du*cut.y+south.dv*cut.z)*cutStrength;
        result.channels+=(1.0-overlap)*cut.w*weight*strength*mask*.11*flowWeight*min(1.5,cutStrength);
      }
      // Sample the displaced surface so rock detail survives steep slopes.
      // Kilometer-scale rock ribs survive between valleys, with finer grain
      // breaking up the channel walls.
      if(i<=2u || ground){
        let sampleRadius=select(radius+.60*baseHeight,groundRadius,ground);
        let sampleGrade=select(.60*grade,groundGrade,ground);
        let point=dir*sampleRadius;
        let twisted=ground&&(i&1u)==1u;
        let rotated=terrainRotation*point;
        let domain=select(select(point,rotated,ground),octaveTwist*rotated,twisted);
        let grain=planet_noise(domain/wave,salt+431u);
        let sampleSlope=select(grain.slope,transpose(octaveTwist)*grain.slope,twisted);
        let nativeSlope=select(sampleSlope,transpose(terrainRotation)*sampleSlope,ground);
        let gradient=(nativeSlope*(sampleRadius/radius)+dot(nativeSlope,dir)*sampleGrade)/wave;
        if(i<2u){
          let magnitude=length(vec2<f32>(grain.value,.018));
          let crest=max(0.0,1.0-(magnitude-.018)/.63);
          let rock=crest*crest-.38;
          let rubble=amplitude*strength*select(.59,.89,i==1u);
          height+=rubble*rock;
          slope-=rubble*(2.0*crest*grain.value/(.63*magnitude))*gradient;
          result.pigment+=rock*strength*weight*.08;
        }else if(!ground){
          let rubble=heights[i]*weight*.24*graniteWear;
          height+=rubble*grain.value;
          slope+=gradient*rubble;
          result.pigment+=grain.value*weight*.075;
        }else{
          // Quiet slopes expose rock between the channels. Sandstone ledges,
          // granite joints and porous lava share the same noise evaluation.
          let joint=grain.value-.14*rockType.w;
          let width=mix(.55,.28,rockType.z);
          let magnitude=length(vec2<f32>(joint,.05));
          let cut=max(0.0,1.0-(magnitude-.05)/width);
          let rim=clamp((grain.value+.72)/1.44,0.0,1.0);
          let lip=smoothstep(.26,.66,rim)-rim;
          let pit=.22+.52*rockType.w+.12*rockType.z;
          let form=.48*grain.value-pit*cut*cut+.68*rockType.y*lip;
          let rimT=clamp((rim-.26)/.40,0.0,1.0);
          let rimSlope=select(0.0,(6.0*rimT*(1.0-rimT)/.40-1.0)/1.44,rim>0.0&&rim<1.0);
          let derivative=.48+2.0*pit*cut*joint/(width*magnitude)+
            .68*rockType.y*rimSlope;
          let rubble=amplitude*mix(1.24,.88,strength)*select(.77,1.0,i>=6u);
          height+=rubble*form;
          slope+=gradient*(rubble*derivative);
          result.pigment+=form*weight*mask*mix(.25,.12,strength);
        }
      }
    }else{
      let sampleRadius=select(radius,groundRadius,ground);
      let n=planet_noise(dir*sampleRadius/wave,salt);
      let edge=length(vec2<f32>(n.value,.055));
      let groove=max(0.0,1.0-(edge-.055)/.51);
      let cut=mode==1.0;
      height=amplitude*select(.50*n.value,-groove*groove,cut);
      let derivative=select(.50,2.0*groove*n.value/(.51*edge),cut);
      let gradient=n.slope*(sampleRadius/radius)+select(vec3<f32>(0),dot(n.slope,dir)*groundGrade,ground);
      slope+=gradient*(amplitude*derivative/wave);
    }
    if(ground){result.groundSlope+=slope;}else{result.slope+=slope;}
    if(i<7u){result.height+=height;}
    result.pigment+=height/heights[i]*select(.015,.025,ground);
  }
  return result;
}
