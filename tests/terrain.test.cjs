const test=require('node:test'),assert=require('node:assert/strict');
const LOD=require('../src/terrain/lod.js'),PLOC=require('../src/terrain/ploc.js');
const Surface=require('../src/terrain/surface.js'),Field=require('../src/terrain/field.js');

function topology(indices,n) {
  const edges=new Map();let area=0;
  for(let i=0;i<indices.length;i+=3) {
    const tri=Array.from(indices.slice(i,i+3)),p=tri.map(v=>[v%(n+1),Math.floor(v/(n+1))]);
    const signed=(p[1][0]-p[0][0])*(p[2][1]-p[0][1])-(p[1][1]-p[0][1])*(p[2][0]-p[0][0]);
    assert.ok(signed<0,'all triangles face up');area-=signed/2;
    for(let j=0;j<3;j++) {const a=tri[j],b=tri[(j+1)%3],key=[a,b].sort((a,b)=>a-b).join(',');edges.set(key,(edges.get(key)||0)+1);}
  }
  assert.equal(area,n*n,'seams cover the entire tile without missing area');
  const boundary=[];
  for(const [key,count]of edges) {
    const ids=key.split(',').map(Number),p=ids.map(v=>[v%(n+1),Math.floor(v/(n+1))]);
    const border=[0,1].some(axis=>p.every(v=>v[axis]===0)||p.every(v=>v[axis]===n));
    assert.equal(count,border?1:2,`edge ${key}`);if(border)boundary.push(p);
  }
  return boundary;
}
test('all 16 seam masks form manifold, full-area Bourke and MC33 heightfield meshes',()=>{
  for(const algorithm of ['bourke','mc33'])for(const n of [2,4,8,16,64])for(let mask=0;mask<16;mask++) {
    const indices=Surface.buildIndices(n,mask,algorithm);topology(indices,n);
    for(const v of indices) {
      const x=v%(n+1),z=Math.floor(v/(n+1));
      if((x===0&&(mask&1))||(x===n&&(mask&2)))assert.equal(z%2,0);
      if((z===0&&(mask&4))||(z===n&&(mask&8)))assert.equal(x%2,0);
    }
  }
});
test('fine and coarse tiles share exactly the same seam segments',()=>{
  for(const algorithm of ['bourke','mc33']) {
    const fine=topology(Surface.buildIndices(16,2,algorithm),16).filter(e=>e.every(p=>p[0]===16)).map(e=>e.map(p=>p[1]/16).sort((a,b)=>a-b).join(',')).sort();
    const coarse=topology(Surface.buildIndices(8,0,algorithm),8).filter(e=>e.every(p=>p[0]===0)).map(e=>e.map(p=>p[1]/8).sort((a,b)=>a-b).join(',')).sort();
    assert.deepEqual(fine,coarse);
  }
});
test('PLOC stackless culling agrees with a linear scan, including duplicate bounds',()=>{
  const {tiles}=LOD.makeTiles(2048,128),boxes=tiles.concat([{...tiles[3],id:tiles.length}]);
  const tree=PLOC.build(boxes);
  assert.equal(tree.count,boxes.length*2-1);
  for(const planes of [[],[[1,0,0,0]],[[0,0,1,-200],[-1,0,0,400]],[[1,0,0,-5000]]]) {
    const expected=boxes.filter(b=>PLOC.intersects(Float32Array.from([...b.lo,...b.hi]),0,planes)).map(b=>b.id).sort((a,b)=>a-b);
    assert.deepEqual(PLOC.query(tree,planes).ids.sort((a,b)=>a-b),expected);
  }
  assert.deepEqual(PLOC.query(PLOC.build([]),[]).ids,[]);
});
test('LOD depends on projected error, FoV, resolution and player proximity',()=>{
  const {tiles}=LOD.makeTiles(2048,128),tile=tiles[0];
  const settings={maxDivs:64,levels:6,pixelError:3,nearRadius:0};
  const camera={position:[0,700,0],player:[0,700,0],height:720,fov:Math.PI/3};
  const base=LOD.desiredLevel(tile,camera,settings);
  assert.ok(LOD.desiredLevel(tile,{...camera,height:2160},settings)<=base);
  assert.ok(LOD.desiredLevel(tile,{...camera,fov:Math.PI/6},settings)<=base);
  assert.ok(LOD.desiredLevel(tile,camera,{...settings,pixelError:10})>=base);
  assert.equal(LOD.desiredLevel(tile,{...camera,player:[tile.ox+10,0,tile.oz+10]},{...settings,nearRadius:100}),0);
});
test('desired and partially resident grids balance every adjacent level to 2:1',()=>{
  const side=8,desired=new Map(),resident=new Map();
  for(let id=0;id<side*side;id++) {desired.set(id,id===27?0:5);resident.set(id,id<10?5:0);}
  LOD.balance(desired,side);LOD.balance(resident,side,'coarsen');
  for(const levels of [desired,resident])for(const [id,l]of levels)for(const [other]of LOD.neighbors(id,side)) {
    if(levels.has(other))assert.ok(Math.abs(l-levels.get(other))<=1);
  }
  const masks=LOD.seams(desired,side);
  for(const [id,mask]of masks)for(const [other,bit]of LOD.neighbors(id,side))assert.equal(Boolean(mask&bit),desired.get(other)===desired.get(id)+1);
});
test('analytic terrain gradient matches finite differences and height bounds are conservative',()=>{
  for(let i=0;i<200;i++) {
    const x=Math.sin(i*31.2)*8000,z=Math.cos(i*12.7)*8000,h=Field.heightGradient(x,z);
    assert.ok(h[0]>=Field.bounds[0]&&h[0]<=Field.bounds[1]);
    const e=0.001,dx=(Field.height(x+e,z)-Field.height(x-e,z))/(2*e),dz=(Field.height(x,z+e)-Field.height(x,z-e))/(2*e);
    assert.ok(Math.abs(dx-h[1])<1e-5);assert.ok(Math.abs(dz-h[2])<1e-5);
  }
});

test('infinite window shifts preserve world-tile identity, slots and translated hierarchy culling',()=>{
  for(const [dx,dz]of [[2,-3],[-4,1],[20,0],[0,-20]]) {
    const {tiles,side}=LOD.makeTiles(2048,128),tree=PLOC.build(tiles);
    const old=new Map(tiles.map(t=>[t.id,{slot:t.id,ox:t.ox,oz:t.oz}])),discarded=[];
    LOD.moveTiles(tiles,dx*128,dz*128);
    const moved=LOD.shiftTileMap(old,side,dx,dz,entry=>discarded.push(entry));
    assert.equal(moved.size+discarded.length,old.size);
    assert.equal(moved.size,Math.max(0,side-Math.abs(dx))*Math.max(0,side-Math.abs(dz)));
    for(const [id,entry]of moved) {assert.equal(tiles[id].ox,entry.ox);assert.equal(tiles[id].oz,entry.oz);}
    for(const planes of [[],[[1,0,0,-100]],[[0,0,1,250],[-1,0,0,600]]]) {
      const actual=PLOC.query(tree,LOD.relativePlanes(planes,[dx*128,dz*128])).ids.sort((a,b)=>a-b);
      const expected=tiles.filter(t=>PLOC.intersects(Float32Array.from([...t.lo,...t.hi]),0,planes)).map(t=>t.id).sort((a,b)=>a-b);
      assert.deepEqual(actual,expected);
    }
  }
  for(const position of [[21000,100,-41000],[-33000,200,12800]]) {
    const offset=LOD.windowOffset(position,8192,128);
    offset.forEach((value,axis)=>{assert.ok(value%128===0);assert.ok(Math.abs(value-position[axis===0?0:2])<=512);});
  }
});
