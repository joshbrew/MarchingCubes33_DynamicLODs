struct VertexRecipe {
  layers:array<NoiseParams,5>,
  shape:vec4<f32>,
  style:vec4<f32>,
  world:vec4<u32>,
  grid:vec4<u32>,
  region:vec4<f32>,
  regionWeights:array<vec4<f32>,5>,
  algorithms:array<vec4<u32>,2>,
}
struct VertexJob {
  origin:vec2<f32>, size:f32, face:u32, level:u32, slot:u32, parent:u32, quadrant:u32,
}
@group(1) @binding(0) var<uniform> recipe:VertexRecipe;
@group(1) @binding(1) var<storage,read> vertexJobs:array<VertexJob>;
@group(1) @binding(2) var<storage,read_write> vertexSamples:array<vec4<u32>>;

fn guide_at(dir:vec3<f32>,offset:i32)->StudioNoise{
  return studio_sample(dir,recipe.shape.x,i32(recipe.grid.x),offset,studio_uv(dir),select(1.0,.40,offset>0));
}

fn studio_vertex_height(dir:vec3<f32>)->vec4<f32>{
  let radial=length(dir.xz);
  let theta=atan2(radial,dir.y);
  let phi=select(0.0,atan2(dir.z,dir.x),radial>0.0);
  options.sphereOffset=recipe.shape.y;
  options.sphereOffset2=recipe.shape.z;
  options.spherePolarFade=.15;
  options.sphereFeatureDensity=recipe.shape.w;
  options.sphereRegion=recipe.region;
  options.sphereRegionSeed=recipe.world.x;
  let point=studio_sphere_position(dir,theta,phi);
  var regions=vec4<f32>(1,0,0,0);
  if(recipe.region.z>0.0){regions=studio_region_map(dir);}
  var raw=0.0;
  for(var layer=0u;layer<5u;layer++){
    studioPermutationSlot=layer;
    let p=recipe.layers[layer];
    var height:f32;
    switch recipe.algorithms[layer/4u][layer%4u] {
      case 0u:{height=generateFBM(point,p);}
      case 1u:{height=generateFBM2(point,p);}
      case 2u:{height=generateVoronoiTileNoise(point,p);}
      case 3u:{height=generateRidgedMultifractal4(point,p);}
      case 4u:{height=generateLanczosBillow(point,p);}
      case 5u:{height=generateLanczosAntiBillow(point,p);}
      case 6u:{height=generateSimplexFBM(point,p);}
      case 7u:{height=generateBillow(point,p);}
      case 8u:{height=generateRidgedMultifractal(point,p);}
      default:{height=generateVoronoiBM1(point,p);}
    }
    options.sphereBlend=select(recipe.style.x,0.0,layer==0u);
    options.sphereBlendPhase=13.7*f32(layer)+f32(recipe.world.x%997u)*.13;
    var value=height*p.scalar+p.transform;
    if(options.sphereBlend>0.0){value*=studio_layer_mask(point);}
    raw+=value*dot(regions,recipe.regionWeights[layer]);
  }
  options.sphereBlend=recipe.style.x;
  options.sphereRangeWeight=recipe.style.y;
  options.sphereLandscape=recipe.world.z;
  options.sphereLandscapeStrength=recipe.style.z;
  params.seed=recipe.world.x;
  params.voroMode=recipe.world.y;
  let side=i32(recipe.grid.x);
  let span=PI*.017/recipe.shape.w;
  var broad=raw;
  if(radial>.035&&(params.voroMode!=3u||options.sphereBlend>0.0)){
    let east=vec3<f32>(-dir.z,0.0,dir.x)/radial;
    let north=cross(east,dir);
    let cornerA=(east+north)*span;
    let cornerB=(east-north)*span;
    let offset=0;
    let around=guide_at(normalize(dir+cornerA),offset).height+guide_at(normalize(dir-cornerA),offset).height+
      guide_at(normalize(dir+cornerB),offset).height+guide_at(normalize(dir-cornerB),offset).height;
    broad=mix(raw,.28*raw+.18*around,smoothstep(.035,.155,radial));
  }
  // Match the reference Studio recipe's footprint for collapse and landforms.
  let angularSample=PI/f32(recipe.grid.y)*max(1.0,2.0*radial);
  let relief=studio_sphere_relief(dir,raw,broad,angularSample,regions);
  let erosion=guide_at(dir,side*side).height;
  return vec4<f32>(relief.x*recipe.style.w+erosion,relief.yzw);
}

fn vertex_direction(face:u32,point:vec2<f32>)->vec3<f32>{
  switch face {
    case 0u:{return normalize(vec3<f32>(1,point.y,point.x));}
    case 1u:{return normalize(vec3<f32>(-1,point.y,-point.x));}
    case 2u:{return normalize(vec3<f32>(point.x,1,point.y));}
    case 3u:{return normalize(vec3<f32>(point.x,-1,-point.y));}
    case 4u:{return normalize(vec3<f32>(-point.x,point.y,1));}
    default:{return normalize(vec3<f32>(point.x,point.y,-1));}
  }
}

var<workgroup> sampledRelief:array<vec4<f32>,48>;
@compute @workgroup_size(16,4)
fn sample_studio_vertices(@builtin(workgroup_id) group:vec3<u32>,@builtin(local_invocation_id) lane:vec3<u32>){
  let divs=recipe.world.w;
  let row=divs+1u;
  let count=row*row;
  let id=group.x*16u+lane.x;
  let job=vertexJobs[group.y];
  let probe=job.face==6u;
  let xy=vec2<u32>(id%row,id/row);
  let reuse=job.parent>0u && all((xy&vec2<u32>(1u))==vec2<u32>(0u));
  let dir=vertex_direction(job.face,job.origin+vec2<f32>(xy)*(job.size/f32(divs)));
  let axis=select(vec3<f32>(0,1,0),vec3<f32>(1,0,0),abs(dir.y)>.85);
  let east=normalize(cross(axis,dir));
  let north=cross(dir,east);
  // Each lane runs the same height evaluator, so the driver only has to
  // compile it once. The stencil is fixed in world space across every LOD.
  let step=24.0/recipe.shape.x;
  if(select(id<count && !reuse && lane.y<3u,id==0u && lane.y==0u,probe)){
    var sampleDir=dir;
    if(probe){sampleDir=vec3<f32>(job.origin,job.size);}
    else if(lane.y!=0u){sampleDir=normalize(dir+step*select(east,north,lane.y==2u));}
    sampledRelief[lane.y*16u+lane.x]=studio_vertex_height(sampleDir);
  }
  workgroupBarrier();
  if(lane.y!=0u || id>=count){return;}
  if(probe){
    if(id==0u){vertexSamples[0].x=bitcast<u32>(sampledRelief[0].x);}
    return;
  }
  let index=job.slot*count+id;
  if(reuse){
    let quadrant=vec2<u32>(job.quadrant&1u,job.quadrant>>1u);
    let parent=xy/2u+quadrant*(divs/2u);
    vertexSamples[index]=vertexSamples[(job.parent-1u)*count+parent.y*row+parent.x];
    return;
  }
  let relief=sampledRelief[lane.x];
  let eastHeight=sampledRelief[16u+lane.x].x;
  let northHeight=sampledRelief[32u+lane.x].x;
  let gradient=(east*(eastHeight-relief.x)+north*(northHeight-relief.x))/24.0;
  let rock=vec4<f32>(max(0.0,1.0-dot(relief.yzw,vec3<f32>(1.0))),relief.yzw);
  vertexSamples[index]=vec4<u32>(bitcast<u32>(relief.x),pack2x16float(gradient.xy),
    pack2x16float(vec2<f32>(gradient.z,0.0)),pack4x8unorm(rock));
}

