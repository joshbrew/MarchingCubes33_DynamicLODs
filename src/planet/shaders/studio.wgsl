@group(0) @binding(3) var<storage,read> studioHeights:array<f32>;

// Returns interpolated value and derivative with respect to t.
fn studio_cubic(a:f32,b:f32,c:f32,d:f32,t:f32)->vec2<f32>{
  let p=.5*(c-a);
  let q=a-2.5*b+2.0*c-.5*d;
  let r=.5*(d-a)+1.5*(b-c);
  return vec2<f32>(b+t*(p+t*(q+t*r)),p+t*(2.0*q+t*3.0*r));
}
fn studio_row(pixel:vec2<i32>,t:f32,side:i32)->vec2<f32>{
  let columns=side-1;
  let base=clamp(pixel.y,0,side-1)*side;
  let x=pixel.x+columns;
  return studio_cubic(
    studioHeights[base+(x-1)%columns],studioHeights[base+x%columns],
    studioHeights[base+(x+1)%columns],studioHeights[base+(x+2)%columns],t
  );
}
fn studio_noise(dir:vec3<f32>,radius:f32,side:i32)->vec4<f32>{
  let segments=f32(side-1);
  let tau=6.283185307179586;
  let h=length(dir.xz);
  var longitude=0.0;
  if(h>0.0){longitude=atan2(dir.z,dir.x)/tau;}
  let uv=vec2<f32>(fract(longitude),atan2(h,dir.y)/(tau*.5))*segments;
  let pixel=vec2<i32>(floor(uv));
  let t=fract(uv);
  let a=studio_row(pixel+vec2<i32>(0,-1),t.x,side);
  let b=studio_row(pixel,t.x,side);
  let c=studio_row(pixel+vec2<i32>(0,1),t.x,side);
  let d=studio_row(pixel+vec2<i32>(0,2),t.x,side);
  let value=studio_cubic(a.x,b.x,c.x,d.x,t.y);
  var gradient=vec3<f32>(0.0);
  if(h>1e-5){
    let du=studio_cubic(a.y,b.y,c.y,d.y,t.y).x;
    let tangentU=vec3<f32>(-dir.z,0,dir.x)/(tau*h*h);
    let tangentV=vec3<f32>(dir.x*dir.y/h,-h,dir.z*dir.y/h)/(tau*.5);
    gradient=(du*tangentU+value.y*tangentV)*segments/radius;
  }
  return vec4<f32>(value.x,gradient);
}
