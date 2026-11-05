@group(0) @binding(3) var<storage,read> studioHeights:array<f32>;

fn sun()->vec3<f32>{return normalize(vec3<f32>(.54,.45,.71));}

fn studio_uv(dir:vec3<f32>)->vec2<f32>{
  let h=length(dir.xz);
  var longitude=0.0;
  if(h>0.0){longitude=atan2(dir.z,dir.x)/6.283185307179586;}
  return vec2<f32>(fract(longitude),atan2(h,dir.y)/3.141592653589793);
}

// The last component interpolates sample curvature across texel boundaries.
fn studio_cubic(a:f32,b:f32,c:f32,d:f32,t:f32)->vec3<f32>{
  let p=.5*(c-a);
  let q=a-2.5*b+2.0*c-.5*d;
  let r=.5*(d-a)+1.5*(b-c);
  return vec3<f32>(b+t*(p+t*(q+t*r)),p+t*(2.0*q+t*3.0*r),mix(a-2.0*b+c,b-2.0*c+d,t));
}
fn studio_row(pixel:vec2<i32>,t:f32,side:i32,offset:i32)->vec3<f32>{
  let columns=side-1;
  let base=offset+clamp(pixel.y,0,side-1)*side;
  let x=pixel.x+columns;
  return studio_cubic(
    studioHeights[base+(x-1)%columns],studioHeights[base+x%columns],
    studioHeights[base+(x+1)%columns],studioHeights[base+(x+2)%columns],t
  );
}
struct StudioNoise { height:f32, gradient:vec3<f32>, concavity:f32, uv:vec2<f32> }
fn studio_level(dir:vec3<f32>,radius:f32,side:i32,offset:i32,uv:vec2<f32>)->StudioNoise{
  let segments=f32(side-1);
  let tau=6.283185307179586;
  let h=length(dir.xz);
  let p=uv*segments;
  let pixel=vec2<i32>(floor(p));
  let t=fract(p);
  let a=studio_row(pixel+vec2<i32>(0,-1),t.x,side,offset);
  let b=studio_row(pixel,t.x,side,offset);
  let c=studio_row(pixel+vec2<i32>(0,1),t.x,side,offset);
  let d=studio_row(pixel+vec2<i32>(0,2),t.x,side,offset);
  let value=studio_cubic(a.x,b.x,c.x,d.x,t.y);
  var gradient=vec3<f32>(0.0);
  if(h>1e-5){
    let du=studio_cubic(a.y,b.y,c.y,d.y,t.y).x;
    let tangentU=vec3<f32>(-dir.z,0,dir.x)/(tau*h*h);
    let tangentV=vec3<f32>(dir.x*dir.y/h,-h,dir.z*dir.y/h)/(tau*.5);
    gradient=(du*tangentU+value.y*tangentV)*segments/radius;
  }
  let longitudeSpan=max(.5,2.0*h);
  let concavity=value.z+mix(b.z,c.z,t.y)/(longitudeSpan*longitudeSpan);
  let scale=segments*.001;
  return StudioNoise(value.x,gradient,concavity*scale*scale*smoothstep(0.0,.11,h),uv);
}
fn studio_noise(dir:vec3<f32>,radius:f32,side:i32,footprint:f32)->StudioNoise{
  let uv=studio_uv(dir);
  let weight=smoothstep(radius*.006,radius*.018,footprint);
  if(weight<=0.0){return studio_level(dir,radius,side,0,uv);}
  let coarse=studio_level(dir,radius,max(1,(side-1)/4)+1,side*side,uv);
  if(weight>=1.0){return coarse;}
  let fine=studio_level(dir,radius,side,0,uv);
  return StudioNoise(mix(fine.height,coarse.height,weight),
    mix(fine.gradient,coarse.gradient,weight),mix(fine.concavity,coarse.concavity,weight),uv);
}
