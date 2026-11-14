struct TileJob {
  origin:vec2<f32>, size:f32, face:u32, level:u32, slot:u32, parent:u32, quadrant:u32,
  children:vec4<u32>,
}

// The grid spacing doubles between a child and its parent. Sample indices
// are stored plus one so zero can indicate that the source is unavailable.
fn tile_sample_source(job:TileJob,xy:vec2<u32>,divs:u32)->u32{
  let row=divs+1u;
  let count=row*row;
  let midpoint=divs/2u;
  if(job.parent>0u && all((xy&vec2<u32>(1u))==vec2<u32>(0u))){
    let quadrant=vec2<u32>(job.quadrant&1u,job.quadrant>>1u);
    let parentXY=xy/2u+quadrant*midpoint;
    return (job.parent-1u)*count+parentXY.y*row+parentXY.x+1u;
  }
  if(any(job.children!=vec4<u32>(0u))){
    let quadrant=select(vec2<u32>(0u),vec2<u32>(1u),xy>=vec2<u32>(midpoint));
    let childSlot=job.children[quadrant.x+2u*quadrant.y];
    if(childSlot>0u){
      let childXY=(xy-quadrant*midpoint)*2u;
      return (childSlot-1u)*count+childXY.y*row+childXY.x+1u;
    }
  }
  return 0u;
}
