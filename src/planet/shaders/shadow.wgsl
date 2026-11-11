@group(0) @binding(0) var sunMap: texture_storage_2d<rgba8unorm,write>;
struct ShadowParams { ocean:vec4<f32>, light:vec4<f32> }
@group(0) @binding(1) var<uniform> shadow:ShadowParams;

fn shadow_height(dir:vec3<f32>, side:i32)->f32{
  let last=side-1;
  let p=studio_uv(dir)*f32(last);
  let cell=vec2<i32>(floor(p));
  let f=fract(p);
  let x=cell.x%last;
  let next=(x+1)%last;
  let y=min(cell.y,last)*side;
  let row=min(cell.y+1,last)*side;
  return mix(mix(studioHeights[y+x],studioHeights[y+next],f.x),
    mix(studioHeights[row+x],studioHeights[row+next],f.x),f.y);
}

@compute @workgroup_size(8,8,1)
fn bake_sun_visibility(@builtin(global_invocation_id) id:vec3<u32>){
  let size=textureDimensions(sunMap);
  if(any(id.xy>=size)){return;}
  let uv=(vec2<f32>(id.xy)+.5)/vec2<f32>(size);
  let phi=uv.x*6.283185307179586;
  let theta=uv.y*3.141592653589793;
  let dir=vec3<f32>(sin(theta)*cos(phi),cos(theta),sin(theta)*sin(phi));
  let light=shadow.light.xyz;
  let day=dot(light,dir);
  let traceWeight=smoothstep(-.06,.045,day)*(1.0-smoothstep(.81,.94,day));
  var visibility=1.0;
  if(traceWeight>0.0){
    let side=i32(round(sqrt(f32(arrayLength(&studioHeights)))));
    // Trace the sun ray in radius-relative space, including planet curvature.
    let scale=.023*shadow.ocean.z;
    let ground=scale*shadow_height(dir,side);
    let surface=select(ground,max(ground,shadow.ocean.x),shadow.ocean.y>.5);
    let origin=dir*(1.0+surface);
    var distance=.0055;
    for(var i=0u;i<10u;i++){
      let samplePoint=origin+light*distance;
      let sampleRadius=length(samplePoint);
      let terrainRadius=1.0+scale*shadow_height(samplePoint/sampleRadius,side);
      let block=smoothstep(.00065,.0013+.009*distance,terrainRadius-sampleRadius);
      visibility=min(visibility,1.0-block);
      if(visibility<=.005){break;}
      distance*=1.55;
    }
  }
  textureStore(sunMap,vec2<i32>(id.xy),vec4<f32>(mix(1.0,visibility,traceWeight),0,0,1));
}
