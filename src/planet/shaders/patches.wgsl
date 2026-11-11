struct Tile { origin:vec2<f32>, size:f32, face:u32, level:u32, pad0:u32, pad1:u32, pad2:u32 }
@group(0) @binding(1) var<storage,read> tiles:array<Tile>;
struct BaseVertex { fine:vec4<f32>, coarse:vec4<f32>, rock:vec4<f32> }
@group(0) @binding(6) var<storage,read> baseVertices:array<vec4<u32>>;
@group(0) @binding(7) var<storage,read> tileJobs:array<Tile>;
@group(0) @binding(8) var<storage,read_write> tileOutput:array<BaseVertex>;
fn cube_point(face:u32,p:vec2<f32>)->vec3<f32>{
  switch face {
    case 0u: {return vec3<f32>(1,p.y,p.x);}
    case 1u: {return vec3<f32>(-1,p.y,-p.x);}
    case 2u: {return vec3<f32>(p.x,1,p.y);}
    case 3u: {return vec3<f32>(p.x,-1,-p.y);}
    case 4u: {return vec3<f32>(-p.x,p.y,1);}
    default: {return vec3<f32>(p.x,p.y,-1);}
  }
}
fn tile_direction(tile:Tile,index:u32,divs:u32)->vec3<f32>{
  let row=divs+1u;
  let uv=tile.origin+vec2<f32>(f32(index%row),f32(index/row))*(tile.size/f32(divs));
  return normalize(cube_point(tile.face,uv));
}
@compute @workgroup_size(64) fn bake_tile_vertices(@builtin(global_invocation_id) id:vec3<u32>){
  let divs=u32(frame.options.x);
  let row=divs+1u;
  let vertices=row*row;
  if(id.x>=vertices){return;}
  let tile=tileJobs[id.y];
  let at=tile.pad0*vertices+id.x;
  let xy=vec2<u32>(id.x%row,id.x/row);
  if(tile.pad1>0u && all((xy&vec2<u32>(1u))==vec2<u32>(0u))){
    let quadrant=vec2<u32>(tile.pad2&1u,tile.pad2>>1u);
    let parent=xy/2u+quadrant*(divs/2u);
    tileOutput[at]=tileOutput[(tile.pad1-1u)*vertices+parent.y*row+parent.x];
    return;
  }
  let dir=tile_direction(tile,id.x,divs);
  let uv=studio_uv(dir);
  let side=i32(style.palette.z);
  let fine=studio_level(dir,frame.eye.w,side,0,uv);
  let coarse=studio_level(dir,frame.eye.w,max(1,(side-1)/4)+1,side*side,uv);
  let rock=studio_regions(uv,side,style.ocean.z>.5,style.ocean.w>.5);
  tileOutput[at]=BaseVertex(vec4<f32>(fine.height,fine.gradient),vec4<f32>(coarse.height,coarse.gradient),rock);
}
