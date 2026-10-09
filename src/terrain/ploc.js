// Static terrain adaptation of AVBD's Morton-ordered, 16-cluster SAH treelets.
// Build once on CPU; stackless queries reuse the immutable tree as the camera moves.
(function (root, factory) {
  const api=factory();
  if(typeof module==='object' && module.exports) module.exports=api;
  else root.TerrainPLOC=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function expand(v) {
    let x=v&1023; x=(x|(x<<16))&0x030000ff; x=(x|(x<<8))&0x0300f00f;
    x=(x|(x<<4))&0x030c30c3; return (x|(x<<2))&0x09249249;
  }
  function union(a,b) {
    return {lo:a.lo.map((v,i)=>Math.min(v,b.lo[i])),hi:a.hi.map((v,i)=>Math.max(v,b.hi[i])),left:a,right:b,id:-1};
  }
  function area(n) { const d=n.hi.map((v,i)=>Math.max(0,v-n.lo[i])); return d[0]*d[1]+d[1]*d[2]+d[2]*d[0]; }
  function build(boxes,width=16) {
    if(!Number.isInteger(width)||width<2) throw new Error('Treelet width must be at least two');
    if(!boxes.length) return {bounds:new Float32Array(),escape:new Int32Array(),leaf:new Int32Array(),count:0};
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    for(const b of boxes) for(let i=0;i<3;i++) {
      if(!Number.isFinite(b.lo[i])||!Number.isFinite(b.hi[i])||b.hi[i]<b.lo[i]) throw new Error('Invalid terrain bounds');
      lo[i]=Math.min(lo[i],b.lo[i]);hi[i]=Math.max(hi[i],b.hi[i]);
    }
    let clusters=boxes.map(b=>{
      const q=b.lo.map((v,i)=>Math.min(1023,Math.max(0,Math.floor(((v+b.hi[i])*0.5-lo[i])/Math.max(hi[i]-lo[i],1e-9)*1024))));
      return {...b,key:((expand(q[0])<<2)|(expand(q[1])<<1)|expand(q[2]))>>>0};
    }).sort((a,b)=>a.key-b.key||a.id-b.id);
    while(clusters.length>1) {
      const next=[];
      for(let start=0;start<clusters.length;start+=width) {
        let live=clusters.slice(start,start+width);
        while(live.length>1) {
          const nearest=live.map((a,i)=>{
            let best=-1,cost=Infinity;
            for(let j=0;j<live.length;j++) if(i!==j) {
              const c=area(union(a,live[j])); if(c<cost||(c===cost&&j<best)) {best=j;cost=c;}
            }
            return best;
          });
          const used=new Set(),merged=[];
          for(let i=0;i<live.length;i++) {
            const j=nearest[i];
            if(j>i && nearest[j]===i) {merged.push(union(live[i],live[j]));used.add(i);used.add(j);}
          }
          if(!used.size) throw new Error('PLOC clustering did not make progress');
          live=live.filter((_,i)=>!used.has(i)).concat(merged);
        }
        next.push(live[0]);
      }
      clusters=next;
    }
    const count=boxes.length*2-1,bounds=new Float32Array(count*6),escape=new Int32Array(count),leaf=new Int32Array(count).fill(-1);
    let at=0;
    function flatten(n) {
      const index=at++; bounds.set(n.lo,index*6);bounds.set(n.hi,index*6+3);leaf[index]=n.id;
      if(n.id<0) {flatten(n.left);flatten(n.right);} escape[index]=at;
    }
    flatten(clusters[0]);return {bounds,escape,leaf,count};
  }
  function intersects(bounds,offset,planes) {
    for(const p of planes) {
      const x=bounds[offset+(p[0]>=0?3:0)],y=bounds[offset+(p[1]>=0?4:1)],z=bounds[offset+(p[2]>=0?5:2)];
      if(p[0]*x+p[1]*y+p[2]*z+p[3]<0) return false;
    }
    return true;
  }
  function query(tree,planes) {
    const ids=[];let at=0,visited=0;
    while(at<tree.count) {
      visited++;
      if(!intersects(tree.bounds,at*6,planes)) {at=tree.escape[at];continue;}
      if(tree.leaf[at]>=0) ids.push(tree.leaf[at]); at++;
    }
    return {ids,visited};
  }
  return {build,query,intersects};
});
