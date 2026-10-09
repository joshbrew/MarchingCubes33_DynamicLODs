// Deterministic trees and their three reusable instanced meshes.
(function(root,factory){const api=typeof module==='object'&&module.exports?factory(require('./field.js'),require('./surface.js')):factory(root.TerrainField,root.TerrainSurface);if(typeof module==='object'&&module.exports)module.exports=api;else root.TerrainVegetation=api;})(typeof globalThis!=='undefined'?globalThis:this,function(Field,Surface){
  'use strict';
  function trees(tile,density=32,seed=7){
    const result=[],cx=Math.round(tile.ox/tile.size),cz=Math.round(tile.oz/tile.size);
    for(let i=0;i<density;i++){
      const rand=s=>(Field.hash(cx*53+i,cz*71-i,s+seed-7)+1)*.5;
      const u=.04+rand(307)*.92,v=.04+rand(619)*.92,x=tile.ox+u*tile.size,z=tile.oz+v*tile.size;
      const h=Field.heightGradient(x,z,seed),grove=(Field.hash(Math.floor(x/220),Math.floor(z/220),103+seed-7)+1)*.5;
      if(h[0]<-6||h[0]>200||Math.hypot(h[1],h[2])>.65||rand(821)> .35+grove*.65)continue;
      result.push({id:`${seed}:${cx}:${cz}:${i}`,x,z,u,v,height:11+rand(937)*14,yaw:rand(1223)*Math.PI*2,tint:rand(1549)});
    }
    return result;
  }
  function level(tree,camera,previous){
    const distance=Math.max(1,Math.hypot(tree.x-camera.position[0],tree.y+tree.height*.5-camera.position[1],tree.z-camera.position[2]));
    const pixels=tree.height*camera.height/(2*Math.tan(camera.fov/2)*distance);
    let lod=pixels>42?0:pixels>13?1:2;
    if(previous===0&&pixels>36)lod=0;else if(previous===1&&pixels>11&&pixels<48)lod=1;else if(previous===2&&pixels<15)lod=2;
    return lod;
  }
  function geometry(level){
    const vertices=[],emit=(p,n,c)=>vertices.push(...p,...n,...c);
    function cone(radius,bottom,top,sides,color,tipRadius=0){
      for(let i=0;i<sides;i++){
        const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;
        const p=[Math.cos(a)*radius,bottom,Math.sin(a)*radius],q=[Math.cos(b)*radius,bottom,Math.sin(b)*radius];
        const t=[Math.cos(a)*tipRadius,top,Math.sin(a)*tipRadius],r=[Math.cos(b)*tipRadius,top,Math.sin(b)*tipRadius];
        const n=[Math.cos((a+b)/2),radius/(top-bottom),Math.sin((a+b)/2)],length=Math.hypot(...n),normal=n.map(x=>x/length);
        emit(p,normal,color);emit(t,normal,color);emit(q,normal,color);
        if(tipRadius){emit(q,normal,color);emit(t,normal,color);emit(r,normal,color);}
        emit(q,[0,-1,0],color);emit([0,bottom,0],[0,-1,0],color);emit(p,[0,-1,0],color);
      }
    }
    if(level===2){
      // Two crossed silhouettes retain a real 3D position and depth at distance.
      for(let i=0;i<2;i++){const a=i*Math.PI/2,c=Math.cos(a),s=Math.sin(a),n=[-s,0,c],color=[.09,.26,.12];
        for(const p of [[-.24,.14],[0,1],[.24,.14]])emit([p[0]*c,p[1],p[0]*s],n,color);
        for(const p of [[-.025,0],[-.025,.2],[.025,.2],[-.025,0],[.025,.2],[.025,0]])emit([p[0]*c,p[1],p[0]*s],n,[.23,.14,.07]);
      }
    }else{
      cone(.026,0,.76,level===0?8:5,[.26,.16,.08],.012);
      if(level===0){cone(.25,.18,.68,8,[.08,.25,.12]);cone(.20,.38,.86,8,[.10,.29,.14]);cone(.14,.60,1,8,[.13,.34,.17]);}
      else {cone(.25,.18,.77,5,[.09,.27,.13]);cone(.16,.50,1,5,[.12,.32,.16]);}
    }
    return Float32Array.from(vertices);
  }
  const attachments=new Map();
  function attachment(divs,mask,algorithm,u,v){
    const key=`${algorithm}:${divs}:${mask}`;let bins=attachments.get(key);
    if(!bins){
      bins=Array.from({length:divs*divs},()=>[]);const indices=Surface.buildIndices(divs,mask,algorithm);
      for(let i=0;i<indices.length;i+=3){const ids=Array.from(indices.slice(i,i+3)),p=ids.map(n=>[n%(divs+1),Math.floor(n/(divs+1))]);
        for(let z=Math.min(...p.map(a=>a[1]));z<Math.max(...p.map(a=>a[1]));z++)for(let x=Math.min(...p.map(a=>a[0]));x<Math.max(...p.map(a=>a[0]));x++)bins[z*divs+x].push({ids,p});
      }attachments.set(key,bins);
    }
    const x=u*divs,z=v*divs;
    for(const {ids,p}of bins[Math.min(divs-1,Math.floor(z))*divs+Math.min(divs-1,Math.floor(x))]){
      const [a,b,c]=p,det=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);
      const wa=((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(z-c[1]))/det,wb=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(z-c[1]))/det,wc=1-wa-wb;
      if(Math.min(wa,wb,wc)>=-1e-6)return {ids,weights:[wa,wb,wc]};
    }
    throw new Error('Tree root is outside its terrain triangle');
  }
  return {trees,level,geometry,attachment};
});
