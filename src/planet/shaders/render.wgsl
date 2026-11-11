override proceduralTerrain:bool=false;
fn detail_footprint(distance:f32,pixel:f32)->f32{
  return max(pixel,max(0.0,distance-420.0)*.004);
}
fn district_cell(index:i32)->vec3<f32>{
  let packed=bitcast<u32>(studioHeights[index]);
  return vec3<f32>(vec3<u32>(packed,packed>>8u,packed>>16u)&vec3<u32>(255u))/255.0;
}
fn district_material(uv:vec2<f32>,chart:vec4<f32>,width:i32,offset:i32)->vec3<f32>{
  if(width<2){return vec3<f32>(0.0);}
  let delta=uv-chart.xy;
  let local=vec2<f32>(fract(delta.x+.5)-.5,delta.y)/chart.zw;
  if(any(abs(local)>=vec2<f32>(1.0))){return vec3<f32>(0.0);}
  let side=i32(style.palette.z);
  let coarse=(side-1)/4+1;
  let provinces=min(129,side);
  let start=side*side+coarse*coarse+provinces*provinces+offset;
  let p=(local*.5+.5)*f32(width-1);
  let cell=min(vec2<i32>(floor(p)),vec2<i32>(width-2));
  let t=clamp(p-vec2<f32>(cell),vec2<f32>(0.0),vec2<f32>(1.0));
  let at=start+cell.y*width+cell.x;
  return mix(mix(district_cell(at),district_cell(at+1),t.x),
    mix(district_cell(at+width),district_cell(at+width+1),t.x),t.y);
}
fn district_flatness(water:f32,dune:vec2<f32>)->f32{
  return max(smoothstep(.48,.92,water),1.0-(1.0-.91*dune.x)*(1.0-dune.y));
}
fn studio_deposits(uv:vec2<f32>)->f32{
  let side=i32(style.palette.z);
  let coarse=(side-1)/4+1;
  let provinces=min(129,side);
  let start=side*side+coarse*coarse+provinces*provinces+2*i32(style.world.w);
  let width=min(257,side);
  if(i32(arrayLength(&studioHeights))<start+width*width){return 0.0;}
  let p=uv*f32(width-1);
  let cell=min(vec2<i32>(floor(p)),vec2<i32>(width-2));
  let t=p-vec2<f32>(cell);
  let a=start+cell.y*width+cell.x;
  return mix(mix(studioHeights[a],studioHeights[a+1],t.x),
    mix(studioHeights[a+width],studioHeights[a+width+1],t.x),t.y);
}
fn district_height(surface:PlanetSurface,flatness:f32)->f32{
  return mix(surface.height,surface.value*studioReliefMeters,flatness);
}
fn rock_visibility(world:vec3<f32>,distance:f32)->f32{
  let cutoff=22000.0*frame.eye.w/262144.0;
  if(distance>=cutoff){return 1.0;}
  var visibility=1.0;
  for(var i=0u;i<2u;i++){
    let rock=style.rockShadows[i];
    let size=rock.center.w;
    let p=world-rock.center.xyz;
    if(size<=0.0 || dot(p,p)>size*size*10.0){continue;}
    let up=normalize(rock.center.xyz);
    let day=dot(sun(),up);
    let travel=(rock.along.w*.55-dot(p,up))/max(day,.14);
    let q=(p+sun()*max(0.0,travel))/size;
    let width=length(vec2<f32>(dot(q,rock.along.xyz),2.7*dot(q,rock.across.xyz)));
    let shade=(1.0-smoothstep(.78,1.12,width))*smoothstep(-.06,.18,travel/size)*smoothstep(.09,.36,day);
    let contact=1.0-smoothstep(.32,1.34,length(p)/size);
    visibility=min(visibility,1.0-.42*shade-.13*contact);
  }
  return mix(visibility,1.0,smoothstep(cutoff*.65,cutoff,distance));
}
struct SurfaceVarying {
  @builtin(position) clip:vec4<f32>,
  @location(0) relative:vec3<f32>, @location(1) radial:vec3<f32>,
  @location(2) @interpolate(flat) level:u32,
  @location(3) baseShape:vec4<f32>,
  @location(4) rock:vec4<f32>,
  @location(5) guideSlope:vec3<f32>,
}
@vertex fn planet_vertex(@builtin(vertex_index) index:u32,@builtin(instance_index) instance:u32)->SurfaceVarying {
  let tile=tiles[instance]; let divs=u32(frame.options.x); let row=divs+1u;
  let dir=tile_direction(tile,index,divs); let radius=frame.eye.w;
  // The footprint depends on position, so stitched edges agree across tiles.
  let lateral=length(dir*length(frame.eye.xyz)-frame.eye.xyz);
  let range=length(vec2<f32>(lateral,frame.options.w));
  let pixel=range*frame.forward.w;
  // Use a continuous footprint so shared edge vertices evaluate the same
  // octaves. Finer relief still contributes to per-pixel shading.
  let footprint=max(frame.surface.y*.75,detail_footprint(range,pixel));
  let side=i32(style.palette.z);
  let vertex=tile.pad0*row*row+index;
  var sample:vec4<f32>;
  var gradient:vec3<f32>;
  var rock:vec4<f32>;
  let uv=studio_uv(dir);
  if(proceduralTerrain){
    let packed=baseVertices[vertex];
    gradient=vec3<f32>(unpack2x16float(packed.y),unpack2x16float(packed.z).x);
    sample=vec4<f32>(bitcast<f32>(packed.x),studio_level(dir,radius,side,0,uv).gradient);
    let weights=unpack4x8unorm(packed.w);
    rock=weights/max(.01,dot(weights,vec4<f32>(1.0)));
  }else{
    let at=vertex*3u;
    sample=mix(bitcast<vec4<f32>>(baseVertices[at]),bitcast<vec4<f32>>(baseVertices[at+1u]),studio_lod_weight(pixel,radius,side));
    gradient=sample.yzw;
    rock=bitcast<vec4<f32>>(baseVertices[at+2u]);
  }
  let base=StudioNoise(sample.x,sample.yzw,0.0,uv);
  let s=planet_surface(dir,radius,bitcast<u32>(frame.options.y),footprint,0.0,base,rock,7u,style.detail,
    vec3<f32>(style.modes.xy,style.lunarMaterial.y));
  let spring=district_material(s.uv,style.springChart,i32(style.world.y),0);
  let dune=district_material(s.uv,style.duneChart,i32(style.world.z),i32(style.world.w));
  let terrainHeight=district_height(s,district_flatness(spring.x,dune.xy))*style.world.x;
  let height=select(terrainHeight,max(terrainHeight,style.ocean.x),style.ocean.y>.5);
  let p=(dir*radius-frame.eye.xyz)+dir*height;
  var clip=frame.vp*vec4<f32>(p,1);
  clip.z=(clip.z+clip.w)*.5;
  return SurfaceVarying(clip,p,dir,tile.level,vec4<f32>(sample.x,gradient),rock,sample.yzw);
}
fn satellite_color(palette:vec3<f32>,radial:vec3<f32>,surface:PlanetSurface,mode:f32,pixel:f32)->vec3<f32>{
  let seed=u32(style.modes.z)|(u32(style.modes.w)<<16u);
  let district=planet_noise(radial*3.4,seed+6211u).value;
  let grain=planet_noise(radial*15.0,seed+8119u).value;
  let soil=.75*district+.25*grain;
  if(mode==1.0){
    let dune=smoothstep(-.07,.31,-soil-.12*surface.value);
    return mix(palette,vec3<f32>(.19,.14,.071),.72*dune);
  }
  if(mode==2.0){
    let sulfur=mix(vec3<f32>(.50,.14,.031),vec3<f32>(.83,.64,.24),smoothstep(-.12,.27,soil));
    let frost=smoothstep(.14,.37,district+.16*grain);
    let deposits=mix(sulfur,vec3<f32>(.55,.48,.57),frost);
    let lava=smoothstep(.18,.46,grain-.14*district)*smoothstep(.27,.79,surface.rock.w);
    return mix(mix(palette,deposits,.77),vec3<f32>(.064,.050,.047),.92*lava);
  }
  let texel=pixel/frame.eye.w;
  let patches=planet_noise(radial*42.0,seed+12473u).value*(1.0-smoothstep(.005,.018,texel));
  var chips=0.0;
  if(texel<.006){
    chips=planet_noise(radial*139.0,seed+19603u).value*(1.0-smoothstep(.0017,.006,texel));
  }
  if(mode==3.0){
    let basinBias=.12*clamp(surface.value,-1.0,1.0);
    let sheet=smoothstep(-.25,-.09,.88*district+.23*grain+.10*patches+.045*chips-basinBias);
    let glacier=studio_deposits(surface.uv);
    let ice=smoothstep(.11,.62,glacier);
    let fractures=1.0-smoothstep(.015,.12,abs(.71*patches+.29*chips));
    let plain=mix(vec3<f32>(.76,.81,.85),vec3<f32>(.96,.97,.94),smoothstep(-.24,.28,grain+.24*patches));
    let flow=mix(vec3<f32>(.29,.52,.64),vec3<f32>(.73,.87,.90),smoothstep(.18,.78,glacier))*
      (1.0-.14*fractures*abs(patches)*3.0);
    let rust=mix(vec3<f32>(.23,.026,.018),vec3<f32>(.59,.135,.060),
      smoothstep(-.30,.26,.44*grain+.37*patches+.19*chips));
    return mix(mix(palette,rust,.91),mix(plain,flow,ice),max(.96*sheet,ice));
  }
  let tone=smoothstep(-.17,.17,.77*district+.46*grain+.16*patches);
  let wear=smoothstep(-.33,.27,.48*grain+.44*patches+.18*chips);
  let slate=mix(vec3<f32>(.034,.074,.155),vec3<f32>(.166,.269,.412),wear);
  let oxidized=mix(vec3<f32>(.20,.045,.029),vec3<f32>(.53,.179,.092),wear);
  let regolith=mix(slate,oxidized,tone);
  let displacement=studio_deposits(surface.uv);
  let floor=smoothstep(.03,.36,-displacement);
  let rim=smoothstep(.022,.19,displacement);
  let saltNoise=planet_noise(radial*47.0,seed+49253u).value;
  let salts=smoothstep(.22,.49,.78*saltNoise+.27*grain)*smoothstep(.14,.42,-displacement);
  let rock=mix(palette,regolith,.97)*(1.0+.23*patches+.14*chips+.26*rim-.32*floor);
  return mix(rock,vec3<f32>(.58,.56,.50),.60*salts);
}
fn frost_margin(dir:vec3<f32>,height:f32)->f32{
  let latitude=dot(dir,style.climate.xyz);
  let wind=sin(dot(dir,vec3<f32>(9,4,-7))+14.0*style.climate.x);
  return height-style.climate.w+1.08*latitude*latitude-.115*wind;
}

fn ocean_color(radial:vec3<f32>,view:vec3<f32>,depth:f32,pixel:f32,bottom:vec3<f32>,shoal:f32,visibility:f32)->vec3<f32>{
  var n=radial;
  if(pixel<5.0){
    let p=radial*frame.eye.w;
    let ripple=planet_noise(p/17.0,2501u).slope;
    n=normalize(radial-.055*(ripple-radial*dot(ripple,radial))*(1.0-smoothstep(2.0,5.0,pixel)));
  }
  let clarity=exp(-depth*style.shallowWater.w);
  let depthMix=1.0-exp(-depth*style.deepWater.w);
  let water=mix(mix(style.shallowWater.xyz,style.deepWater.xyz,depthMix),style.coastShoal.xyz,.43*shoal)+
    bottom*.29*clarity;
  let facing=max(0.0,dot(n,view));
  let fresnel=.025+.72*pow(1.0-facing,5.0);
  let reflection=sky_air_color(radial,reflect(-view,n))*.66;
  let day=dot(radial,sun());
  let glint=.30*pow(max(0.0,dot(n,normalize(view+sun()+vec3<f32>(1e-6)))),115.0)*
    visibility*smoothstep(-.008,.09,day);
  let light=solar_light(day,max(0.0,dot(n,sun())),visibility,.30);
  return mix(water*light,reflection,fresnel)+glint*mix(frame.dusk.xyz,vec3<f32>(1.0),smoothstep(0.0,.34,day));
}
@fragment fn planet_fragment(v:SurfaceVarying)->@location(0) vec4<f32> {
  let radial=normalize(v.radial);
  let distance=length(v.relative);
  let view=-v.relative/max(distance,1e-3);
  // A smooth angular footprint keeps octave transitions off triangle edges.
  let facing=dot(view,radial);
  let pixel=distance*frame.forward.w*inverseSqrt(max(.20,abs(facing)));
  let materialPixel=pixel;
  if(frame.options.z>.5) {
    return vec4<f32>(.45+.4*cos(vec3<f32>(0,2,4)+f32(v.level)*.85),1);
  }
  // Keep projected-pixel filtering while allowing kilometer-scale relief
  // to show beneath the camera during an orbital approach.
  let orbit=frame.surface.x*smoothstep(.57,.95,facing)*
    smoothstep(.81,.985,dot(-view,frame.forward.xyz));
  let reliefPixel=max(pixel,max(0.0,distance-420.0)*mix(.002,.00068,orbit));
  let side=i32(style.palette.z);
  let satellite=style.lunarMaterial.z;
  let craterLight=select(0.0,smoothstep(15000.0,48000.0,distance),satellite==4.0);
  var base:StudioNoise;
  var provinceRock:vec4<f32>;
  var craterSlope=vec3<f32>(0.0);
  if(proceduralTerrain){
    base=StudioNoise(v.baseShape.x,v.guideSlope,0.0,studio_uv(radial));
    provinceRock=v.rock;
    if(craterLight>0.0){
      // Resolve impact rims from the filtered height field even when the
      // orbital mesh is too coarse to carry their slopes at each vertex.
      let crater=studio_noise(radial,frame.eye.w,side,pixel);
      base.concavity=crater.concavity*craterLight;
      craterSlope=crater.gradient*studioReliefMeters;
    }
  }else{
    base=studio_noise(radial,frame.eye.w,side,pixel);
    provinceRock=studio_regions(base.uv,side,style.ocean.z>.5,style.ocean.w>.5);
  }
  let material=planet_surface(radial,frame.eye.w,bitcast<u32>(frame.options.y),reliefPixel,materialPixel,
    base,provinceRock,9u,style.detail,vec3<f32>(style.modes.xy,style.lunarMaterial.y));
  let spring=district_material(material.uv,style.springChart,i32(style.world.y),0);
  let dune=district_material(material.uv,style.duneChart,i32(style.world.z),i32(style.world.w));
  let flatness=district_flatness(spring.x,dune.xy);
  var slope=mix(material.gradient,material.baseGradient,flatness);
  if(proceduralTerrain){
    slope+=(v.baseShape.yzw-v.guideSlope)*studioReliefMeters;
    slope=mix(slope,craterSlope,.86*craterLight);
  }
  var windblown=0.0;
  if(satellite!=4.0 && style.detail.y>0.0 && abs(radial.y)<.81 && material.rock.y+material.rock.z+material.rock.w>.20){
    let seed=u32(style.modes.z)|(u32(style.modes.w)<<16u);
    let dryness=studio_dryness(radial,material.rock,seed)*style.detail.y;
    let sheltered=1.0-smoothstep(.34,.92,length(material.baseGradient)*style.world.x);
    windblown=smoothstep(.11,.59,dryness)*sheltered*(1.0-smoothstep(.22,.64,material.value));
    if(windblown>.07 && materialPixel<5.0){
      let wind=studio_wind_dir(seed);
      let ripple=dot(radial,wind)*frame.eye.w*.86+3.4*material.mineral;
      slope+=wind*.065*cos(ripple)*(1.0-smoothstep(.9,5.0,materialPixel))*windblown;
    }
  }
  if(dune.x>.08 && materialPixel<5.0){
    let wind=style.duneWind.xyz;
    let p=radial*frame.eye.w;
    let warp=planet_noise(p/55.0,4109u).value;
    let wave=1.37*dot(p,wind)+3.8*warp;
    let fade=1.0-smoothstep(.8,5.0,materialPixel);
    slope+=wind*(.14*cos(wave)+.036*cos(wave*2.13))*fade*dune.x;
  }
  let tangent=slope-radial*dot(radial,slope);
  let nearDetail=1.0-smoothstep(2500.0,55000.0,distance);
  let orbitalRelief=select(0.0,select(.52,1.28,satellite==4.0),satellite>=3.0)*
    (1.0-smoothstep(5.0,11.0,distance/frame.eye.w));
  let flyoverFade=smoothstep(35000.0,210000.0,distance);
  let normalDetail=max(orbitalRelief,1.0-flyoverFade*(1.0-.80*orbit));
  let normal=normalize(radial-tangent*(normalDetail*style.world.x));
  let steepness=1.0-max(0.0,dot(radial,normal));
  let parentSlope=material.baseGradient*style.world.x;
  let slopeCover=mix(1.0-inverseSqrt(1.0+dot(parentSlope,parentSlope)),steepness,.58);
  let footprint=max(materialPixel,reliefPixel*.30);
  var mottling=0.0;
  var grit=0.0;
  if(footprint<110.0 && distance<58000.0){
    let p=radial*(frame.eye.w+material.height*style.world.x);
    mottling=planet_noise(p/160.0,18461u).value*(1.0-smoothstep(32.0,110.0,footprint))*nearDetail;
    if(footprint<7.5){
      grit=planet_noise(p/9.0,14627u).value*(1.0-smoothstep(2.5,7.5,footprint));
    }
  }
  let mountain=material.rock.x;
  let rock=material.rock;
  let variance=style.detail.y;
  let exposureRange=mix(nearDetail,1.0-smoothstep(8000.0,85000.0,distance),mountain);
  let bare=dot(rock.yzw,vec3<f32>(.47,.62,.71))*variance;
  let cover=smoothstep(-.34,.58,material.value+.95*material.patina);
  let exposed=exposureRange*max(bare*mix(.53,1.0,cover),
    smoothstep(.047,.30,slopeCover-.11*material.patina+.12*mottling));
  let shade=mix(.24,.29,nearDetail)-.065*exposed;
  let basin=smoothstep(.018,.19,material.basin)*(1.0-smoothstep(17000.0,85000.0,distance));
  let diffuse=max(0.0,dot(normal,sun()));
  let day=dot(radial,sun());
  var visibility=1.0;
  if(day>-.008&&day<.94){visibility=shadow_visibility(material.uv);}
  let ambient=shade*clamp(1.0-material.shelter*nearDetail-.40*basin,.25,1.0);
  let light=solar_light(day,diffuse,visibility,ambient);
  let pigment=material.patina*nearDetail;
  var palette=preset_color(material.value+.16*pigment,nearDetail);
  if(satellite>0.0){palette=satellite_color(palette,radial,material,satellite,pixel);}
  // Carry the planet's hue into each rock family while keeping light and
  // dark minerals distinct, even where the preset ramp is very saturated.
  let paletteTint=mix(vec3<f32>(1),clamp((palette+.065)/(dot(palette,vec3<f32>(.30,.50,.20))+.065),
    vec3<f32>(.45),vec3<f32>(1.65)),.52);
  let weathering=smoothstep(-.12,.14,material.mineral+.30*pigment);
  let lowland=smoothstep(-.34,.10,-material.value+.12*material.patina);
  let alpine=mix(vec3<f32>(.17,.24,.13),vec3<f32>(.083,.15,.10),lowland);
  let sandstone=mix(vec3<f32>(.31,.137,.065),vec3<f32>(.51,.32,.17),mix(weathering,lowland,.32));
  let granite=mix(vec3<f32>(.23,.26,.28),vec3<f32>(.45,.38,.30),weathering);
  let volcanic=mix(vec3<f32>(.042,.050,.062),vec3<f32>(.21,.102,.060),weathering);
  let province=rock.x*alpine+rock.y*sandstone+rock.z*granite+rock.w*volcanic;
  let lunar=style.lunarMaterial.x;
  let paletteAuthority=max(lunar,select(0.0,.82,satellite>0.0));
  let regionalColor=(mix(.45,.59,nearDetail)+rock.w*mix(.07,.17,nearDetail))*(1.0-.88*paletteAuthority);
  let host=mix(palette,province*paletteTint,regionalColor);
  let retained=1.0-smoothstep(.024,.195,slopeCover+.066*mottling);
  let growth=style.duneWind.w*retained*dot(rock,vec4<f32>(1.0,.32,.60,.12))*exposureRange*
    (1.0-smoothstep(.62,1.46,material.value+.12*mottling));
  let turf=mix(vec3<f32>(.062,.102,.043),vec3<f32>(.145,.183,.073),
    smoothstep(-.34,.43,.61*mottling+.39*material.patina+.16*lowland));
  let drySediment=retained*exposureRange*(1.0-style.duneWind.w)*(1.0-paletteAuthority)*dot(rock,vec4<f32>(.29,.72,.18,.08));
  let dust=mix(vec3<f32>(.27,.20,.13),vec3<f32>(.43,.34,.22),weathering);
  let baseColor=mix(mix(host,dust*paletteTint,drySediment*.58),turf*paletteTint,growth*.88)*
    (1.0+.16*mottling+.095*grit);
  let slate=mix(vec3<f32>(.125,.16,.20),vec3<f32>(.29,.28,.245),weathering);
  var rockColor=rock.x*slate+rock.y*sandstone+rock.z*(granite*1.10)+rock.w*(volcanic*.73);
  var strata=0.0;
  if(exposed>.02 && rock.y>.03 && reliefPixel<680.0){
    // Pigment follows the same tilted, nonuniform formation as the baked ledges.
    let seed=u32(style.modes.z)|(u32(style.modes.w)<<16u);
    let bed=canyon_bed(radial,material.value,seed);
    let thickness=bed.thickness*studioReliefMeters*style.world.x;
    let visible=1.0-smoothstep(.12,.44,reliefPixel/max(1.0,thickness));
    let stain=clamp(.16+.70*bed.iron+.22*material.mineral,0.0,1.0);
    let bedPigment=mix(vec3<f32>(.56,.405,.235),vec3<f32>(.34,.112,.048),stain);
    let mainRib=smoothstep(.25,.48,bed.phase)*(1.0-smoothstep(.66,.86,bed.phase));
    let ribs=max(mainRib,.68*bed.lowerShelf);
    let wall=smoothstep(.025,.24,steepness);
    let cap=wall*ribs*smoothstep(.24,.81,bed.cement);
    let underside=smoothstep(.43,.59,bed.phase)*(1.0-smoothstep(.60,.72,bed.phase));
    let varnish=wall*underside*smoothstep(.47,.84,bed.iron)*bed.cement;
    let ledgeColor=bedPigment*mix(vec3<f32>(1),vec3<f32>(1.13,1.05,.92),cap)*
      mix(vec3<f32>(1),vec3<f32>(.72,.65,.58),varnish*.68);
    rockColor=mix(rockColor,ledgeColor,rock.y*visible*.64);
    strata=mix(.18,.27,wall)*rock.y*visible*(ribs-.38)*bed.cement;
  }
  if(exposed>.02 && reliefPixel<130.0){
    let bedHeight=material.height*style.world.x+frame.eye.w*dot(radial,vec3<f32>(.17,-.14,.09));
    let broad=cos(6.2831853*(bedHeight/310.0+1.8*material.mineral));
    let fine=cos(6.2831853*(bedHeight/84.0+3.0*material.mineral));
    let bedExposure=smoothstep(-.10,.12,material.mineral)*.42*(1.0-rock.y-.78*rock.w);
    strata+=bedExposure*(.09*broad*(1.0-smoothstep(35.0,130.0,reliefPixel))+
      .065*fine*(1.0-smoothstep(10.0,35.0,reliefPixel)));
  }
  let sediment=smoothstep(.014,.13,material.shelter)*exposureRange;
  let volcanicBedding=rock.w*min(1.28,.81+1.6*rock.x*variance);
  if(volcanicBedding>.035 && exposed>.015 && reliefPixel<620.0){
    let seed=u32(style.modes.z)|(u32(style.modes.w)<<16u);
    let bed=basalt_flow(radial,material.value,seed);
    let thickness=bed.thickness*studioReliefMeters*style.world.x;
    let visible=volcanicBedding*(1.0-smoothstep(.13,.52,reliefPixel/max(1.0,thickness)))*
      (1.0-smoothstep(280.0,620.0,reliefPixel));
    let basalt=mix(vec3<f32>(.060,.073,.088),vec3<f32>(.22,.15,.115),weathering*.68);
    let ash=mix(vec3<f32>(.25,.233,.213),vec3<f32>(.37,.241,.155),weathering);
    rockColor=mix(rockColor,ash,visible*max(.68*bed.ash,.28*sediment*(1.0-bed.cap)));
    rockColor=mix(rockColor,basalt,visible*.84*bed.cap);
  }
  let bedColor=mix(.60,.78,rock.y+rock.z);
  let stoneTint=mix(rockColor*paletteTint,palette*mix(.60,1.12,weathering),paletteAuthority);
  let stone=mix(baseColor,stoneTint,bedColor)*
    (1.0+strata+.40*mountain*sediment+.28*mottling+.30*grit);
  let localLight=rock_visibility(v.relative+frame.eye.xyz,distance);
  var color=mix(baseColor,stone,exposed)*light*clamp(1.0+pigment,.62,1.25)*localLight;
  if(windblown>.01){
    let ochre=mix(vec3<f32>(.46,.33,.17),vec3<f32>(.41,.235,.11),weathering);
    let sand=mix(ochre,vec3<f32>(.17,.145,.113),.88*rock.w);
    color=mix(color,mix(sand*paletteTint,baseColor,.26)*light*localLight,.73*windblown);
  }
  if(style.lunarMaterial.w==0.0 && distance<95000.0 && steepness<.17){
    let alluvium=studio_deposits(material.uv);
    if(alluvium>.015){
      let rockDust=mix(vec3<f32>(.35,.30,.22),vec3<f32>(.52,.30,.17),rock.y);
      let gravel=mix(rockDust,vec3<f32>(.16,.18,.19),.86*rock.w);
      let gravelShade=mix(mix(gravel*paletteTint,baseColor,.32),gravel*paletteTint,.58*weathering);
      let spread=smoothstep(.015,.58,alluvium)*(1.0-smoothstep(.04,.17,steepness));
      color=mix(color,gravelShade*light*localLight,.74*spread*(1.0-smoothstep(42000.0,95000.0,distance)));
    }
  }
  let depth=style.ocean.x-district_height(material,flatness)*style.world.x;
  let shoalDepth=style.coastShoal.w*max(.35,style.world.x);
  var shoal=0.0;
  if(shoalDepth>0.0 && style.ocean.y>.5 && depth<shoalDepth && materialPixel<940.0){
    // World-space bands give neighboring beaches different deposits and
    // fade out before the grain becomes smaller than a pixel.
    let seed=bitcast<u32>(frame.options.y);
    let point=radial*frame.eye.w;
    let bedVariation=planet_noise(point/1850.0,seed+3527u).value;
    let textureFade=1.0-smoothstep(340.0,940.0,materialPixel);
    var grains=0.0;
    if(materialPixel<72.0){
      grains=planet_noise((octaveTwist*point)/145.0,seed+2011u).value*
        (1.0-smoothstep(22.0,72.0,materialPixel));
    }
    let sheltered=1.0-smoothstep(.035,.22,slopeCover);
    let sedimentPatch=smoothstep(-.26,.44,bedVariation+.43*grains+.12*material.patina);
    if(depth>0.0){
      let reefBand=smoothstep(0.0,.19,depth/shoalDepth)*
        (1.0-smoothstep(.38,1.0,depth/shoalDepth));
      shoal=reefBand*sedimentPatch*mix(.26,1.0,sheltered)*textureFade;
    }else{
      let coast=1.0-smoothstep(.12,1.65,-depth/shoalDepth);
      let outcrop=smoothstep(.04,.26,slopeCover+.13*bedVariation);
      let deposits=sheltered*sedimentPatch;
      let rockTint=mix(style.coastSediment.xyz,style.coastOutcrop.xyz,outcrop);
      let brightness=1.0+.32*grains+.13*mottling+.14*grit;
      let coverage=textureFade*(.31*coast+.19*outcrop+.21*deposits)*
        mix(.45,1.0,max(deposits,outcrop));
      color=mix(color,rockTint*light*localLight*brightness,coverage);
    }
  }
  if(style.climate.w>0.0){
    let cold=frost_margin(radial,material.value)+.13*material.mineral+.19*sediment;
    let pack=smoothstep(.04,.39,cold)*(1.0-smoothstep(.045,.27,steepness));
    let ice=smoothstep(.16,.47,cold)*sediment;
    let frozen=mix(vec3<f32>(.70,.76,.81),vec3<f32>(.27,.46,.57),.64*ice);
    color=mix(color,frozen*light*localLight,.91*pack);
  }
  if(dune.x+dune.y>0.0){
    let sand=mix(vec3<f32>(.57,.31,.115),vec3<f32>(.10,.095,.09),smoothstep(.19,.83,dune.z));
    let saltBase=mix(vec3<f32>(.74,.69,.54),vec3<f32>(.60,.69,.68),dune.z);
    var salt=saltBase;
    if(dune.y>.04 && materialPixel<210.0){
      let p=radial*frame.eye.w;
      let tint=planet_noise(p/825.0,5171u).value;
      var crust=0.0;
      if(materialPixel<40.0){
        crust=planet_noise(p/85.0,7019u).value*(1.0-smoothstep(12.0,40.0,materialPixel));
      }
      let minerals=smoothstep(-.23,.45,tint+.31*crust);
      salt=mix(saltBase,vec3<f32>(.64,.43,.34),.37*minerals*(1.0-smoothstep(.62,.97,dune.y)));
      salt*=1.0+.13*tint+.08*crust;
    }
    color=mix(color,sand*paletteTint*light*(.96+.14*pigment),smoothstep(.035,.65,dune.x)*.96);
    color=mix(color,salt*mix(vec3<f32>(1),paletteTint,.45)*light,smoothstep(.035,.82,dune.y)*.94);
  }
  if(spring.x+spring.y>0.0){
    let ivory=vec3<f32>(.74,.64,.47);
    let ochre=vec3<f32>(.68,.23,.045);
    let deposit=mix(ivory,ochre,smoothstep(.14,.78,spring.z));
    color=mix(color,deposit*light*(.90+.36*pigment),spring.y*.92);
    let pool=mix(vec3<f32>(.12,.59,.48),vec3<f32>(.014,.23,.27),smoothstep(.20,.95,spring.x));
    let facing=max(0.0,dot(radial,view));
    let reflection=sky_air_color(radial,reflect(-view,radial));
    let sheen=.04+.39*pow(1.0-facing,4.0);
    let water=mix(pool*solar_light(day,max(0.0,day),visibility,.30),reflection,sheen);
    color=mix(color,water,smoothstep(.03,.76,spring.x));
  }
  var shoreBed=baseColor;
  let shoreWidth=212.34*style.world.x;
  if(style.ocean.y>.5 && abs(depth)<shoreWidth*2.0){
    let sheltered=(1.0-smoothstep(.012,.17,steepness))*mix(.56,1.0,sediment);
    let shore=1.0-smoothstep(.18,1.0,abs(depth)/shoreWidth);
    let shingle=mix(vec3<f32>(.30,.34,.33),vec3<f32>(.45,.29,.145),rock.y);
    let sand=mix(shingle,vec3<f32>(.105,.105,.095),rock.w);
    let bed=mix(sand*paletteTint,baseColor,.31);
    color=mix(color,bed*light,shore*sheltered*.72);
    shoreBed=mix(baseColor,bed,sheltered*(1.0-smoothstep(.12,2.0,max(0.0,depth)/shoreWidth)));
  }
  if(style.ocean.y>.5 && depth>0.0){
    color=mix(color,ocean_color(radial,view,depth,pixel,shoreBed,shoal,visibility),smoothstep(0.0,max(2.0,pixel*.15),depth));
  }
  color=mix(color,sky_air_color(radial,-view),terrain_haze(radial,-view,distance));
  return vec4<f32>(pow(color,vec3<f32>(1.0/2.2)),1);
}
