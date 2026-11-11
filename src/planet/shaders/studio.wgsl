@group(0) @binding(3) var<storage,read> studioHeights:array<f32>;

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
// Blend toward a cubic B-spline when the guide needs low-pass filtering.
fn studio_curve(a:f32,b:f32,c:f32,d:f32,t:f32,smoothing:f32)->vec3<f32>{
  let cubic=studio_cubic(a,b,c,d,t);
  if(smoothing==0.0){return cubic;}
  let p=.5*(c-a);
  let q=.5*(a-2.0*b+c);
  let r=(d-a)/6.0+.5*(b-c);
  let spline=vec3<f32>((a+4.0*b+c)/6.0+t*(p+t*(q+t*r)),
    p+t*(2.0*q+3.0*t*r),2.0*q+6.0*t*r);
  return mix(cubic,spline,smoothing);
}
fn studio_row(pixel:vec2<i32>,t:f32,side:i32,offset:i32,smoothing:f32)->vec3<f32>{
  let columns=side-1;
  var y=pixel.y;
  var x=pixel.x;
  var fraction=t;
  if(y<0||y>columns){
    // Across a pole the meridian continues half a turn away.
    y=select(2*columns-y,-y,y<0);
    let across=f32(x)+t+f32(columns)*.5;
    x=i32(floor(across));
    fraction=fract(across);
  }
  let base=offset+y*side;
  x+=columns;
  return studio_curve(
    studioHeights[base+(x-1)%columns],studioHeights[base+x%columns],
    studioHeights[base+(x+1)%columns],studioHeights[base+(x+2)%columns],fraction,smoothing
  );
}
struct StudioNoise { height:f32, gradient:vec3<f32>, concavity:f32, uv:vec2<f32> }
fn studio_sample(dir:vec3<f32>,radius:f32,side:i32,offset:i32,uv:vec2<f32>,smoothing:f32)->StudioNoise{
  let segments=f32(side-1);
  let tau=6.283185307179586;
  let h=length(dir.xz);
  let p=uv*segments;
  let pixel=vec2<i32>(floor(p));
  let t=fract(p);
  let a=studio_row(pixel+vec2<i32>(0,-1),t.x,side,offset,smoothing);
  let b=studio_row(pixel,t.x,side,offset,smoothing);
  let c=studio_row(pixel+vec2<i32>(0,1),t.x,side,offset,smoothing);
  let d=studio_row(pixel+vec2<i32>(0,2),t.x,side,offset,smoothing);
  let value=studio_curve(a.x,b.x,c.x,d.x,t.y,smoothing);
  var gradient=vec3<f32>(0.0);
  if(h>1e-5){
    let du=studio_curve(a.y,b.y,c.y,d.y,t.y,smoothing).x;
    let tangentU=vec3<f32>(-dir.z,0,dir.x)/(tau*h*h);
    let tangentV=vec3<f32>(dir.x*dir.y/h,-h,dir.z*dir.y/h)/(tau*.5);
    gradient=(du*tangentU+value.y*tangentV)*segments/radius;
  }else{
    let ring=select(side-2,1,dir.y>0.0);
    let east=segments*.25;
    let west=segments*.75;
    let back=segments*.5;
    let x=studio_row(vec2<i32>(0,ring),0.0,side,offset,smoothing).x-
      studio_row(vec2<i32>(i32(back),ring),fract(back),side,offset,smoothing).x;
    let z=studio_row(vec2<i32>(i32(east),ring),fract(east),side,offset,smoothing).x-
      studio_row(vec2<i32>(i32(west),ring),fract(west),side,offset,smoothing).x;
    gradient=vec3<f32>(x,0,z)/(2.0*radius*sin(3.141592653589793/segments));
  }
  let longitudeSpan=max(.5,2.0*h);
  let concavity=value.z+mix(b.z,c.z,t.y)/(longitudeSpan*longitudeSpan);
  let scale=segments*.001;
  return StudioNoise(value.x,gradient,concavity*scale*scale*smoothstep(0.0,.11,h),uv);
}
fn studio_level(dir:vec3<f32>,radius:f32,side:i32,offset:i32,uv:vec2<f32>)->StudioNoise{
  return studio_sample(dir,radius,side,offset,uv,0.0);
}
fn studio_lod_weight(footprint:f32,radius:f32,side:i32)->f32{
  let texel=6.283185307179586*radius/f32(side-1);
  return smoothstep(texel*1.5,texel*4.0,footprint);
}
fn studio_noise(dir:vec3<f32>,radius:f32,side:i32,footprint:f32)->StudioNoise{
  let uv=studio_uv(dir);
  let weight=studio_lod_weight(footprint,radius,side);
  if(weight<=0.0){return studio_level(dir,radius,side,0,uv);}
  let coarse=studio_level(dir,radius,max(1,(side-1)/4)+1,side*side,uv);
  if(weight>=1.0){return coarse;}
  let fine=studio_level(dir,radius,side,0,uv);
  return StudioNoise(mix(fine.height,coarse.height,weight),
    mix(fine.gradient,coarse.gradient,weight),mix(fine.concavity,coarse.concavity,weight),uv);
}

fn studio_region_cell(index:i32)->vec3<f32>{
  let packed=bitcast<u32>(studioHeights[index]);
  return vec3<f32>(vec3<u32>(packed,packed>>8u,packed>>16u)&vec3<u32>(255u))/255.0;
}

fn studio_regions(uv:vec2<f32>,side:i32,mesa:bool,mountains:bool)->vec4<f32>{
  let coarse=max(1,(side-1)/4)+1;
  let start=side*side+coarse*coarse;
  let width=min(129,side);
  if(i32(arrayLength(&studioHeights))<start+width*width){
    if(mesa){return vec4<f32>(0,1,0,0);}
    return select(vec4<f32>(0,0,0,1),vec4<f32>(1,0,0,0),mountains);
  }
  let p=uv*f32(width-1);
  let cell=vec2<i32>(floor(p));
  let next=min(cell+1,vec2<i32>(width-1));
  let t=fract(p);
  let a=start+cell.y*width;
  let b=start+next.y*width;
  let rock=mix(
    mix(studio_region_cell(a+cell.x),studio_region_cell(a+next.x),t.x),
    mix(studio_region_cell(b+cell.x),studio_region_cell(b+next.x),t.x),t.y);
  let total=dot(rock,vec3<f32>(1));
  return vec4<f32>(max(0.0,1.0-total),rock/max(1.0,total));
}
