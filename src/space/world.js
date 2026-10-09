// Deterministic 3D sectors and true volumetric bodies. No terrain heightfield.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.SpaceWorld=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const cellSize=2400,maxRadius=900;
  function hash(x,y,z,salt=0){let h=(Math.imul(x,73856093)^Math.imul(y,19349663)^Math.imul(z,83492791)^Math.imul(salt+31,1597334677))>>>0;h=Math.imul(h^(h>>>16),0x7feb352d)>>>0;h=Math.imul(h^(h>>>15),0x846ca68b)>>>0;return (h^(h>>>16))>>>0;}
  function random(seed){let n=seed>>>0;return()=>{n=(n+0x6d2b79f5)>>>0;let t=Math.imul(n^(n>>>15),n|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function quaternion(rng){const a=rng(),b=rng()*Math.PI*2,c=rng()*Math.PI*2;return [Math.sqrt(1-a)*Math.sin(b),Math.sqrt(1-a)*Math.cos(b),Math.sqrt(a)*Math.sin(c),Math.sqrt(a)*Math.cos(c)];}
  const heroes=[
    {id:'island',kind:2,variant:0,position:[420,-70,-250],radius:440,rotation:[0,0,0,1],tint:[.68,.87,.78]},
    {id:'planet',kind:1,variant:0,position:[-1300,430,-1900],radius:880,rotation:[.25,.08,.14,Math.sqrt(1-.25**2-.08**2-.14**2)],tint:[.45,.72,.91]},
    {id:'asteroid',kind:0,variant:2,position:[-230,100,500],radius:185,rotation:[.16,.34,.11,Math.sqrt(1-.16**2-.34**2-.11**2)],tint:[.63,.51,.39]}
  ];
  function chunk(x,y,z){
    const rng=random(hash(x,y,z)),bodies=[];
    for(let i=0;i<7;i++){
      const roll=rng(),kind=roll<.07?1:roll<.17?2:0;
      bodies.push({id:`${x}:${y}:${z}:${i}`,kind,variant:Math.floor(rng()*4),
        position:[(x+rng())*cellSize,(y+rng())*cellSize,(z+rng())*cellSize],
        radius:kind===1?350+rng()*500:kind===2?180+rng()*300:35+rng()*125,
        rotation:quaternion(rng),tint:kind===0?[.42+rng()*.3,.36+rng()*.2,.3+rng()*.2]:[.4+rng()*.3,.65+rng()*.2,.7+rng()*.25]});
    }
    for(const body of heroes)if(body.position.every((v,axis)=>Math.floor(v/cellSize)===[x,y,z][axis]))bodies.push({...body,position:body.position.slice(),rotation:body.rotation.slice(),tint:body.tint.slice()});
    return bodies;
  }
  function visibleSphere(relative,radius,planes){return planes.every(p=>p[0]*relative[0]+p[1]*relative[1]+p[2]*relative[2]+p[3]>=-radius);}
  function sectors(position,planes,distance,budget=2048){
    const origin=position.map(v=>Math.floor(v/cellSize)),range=Math.ceil((distance+maxRadius)/cellSize),candidates=[];
    let examined=0;const bound=Math.sqrt(3)*cellSize/2+maxRadius;
    for(let z=-range;z<=range;z++)for(let y=-range;y<=range;y++)for(let x=-range;x<=range;x++){
      examined++;const cell=[origin[0]+x,origin[1]+y,origin[2]+z],relative=cell.map((v,axis)=>(v+.5)*cellSize-position[axis]);
      const near=Math.hypot(...relative.map(v=>Math.max(0,Math.abs(v)-cellSize/2)));
      if(near>distance+maxRadius||!visibleSphere(relative,bound,planes))continue;
      candidates.push({key:cell.join(':'),cell,distance:near});
    }
    candidates.sort((a,b)=>a.distance-b.distance||a.key.localeCompare(b.key));
    return {cells:candidates.slice(0,budget),examined,requested:candidates.length,limited:candidates.length>budget};
  }
  function field(kind,variant,x,y,z,{caves=false}={}){
    const seed=variant*1.713,noise=Math.sin(x*5.3+seed)*Math.cos(y*4.1-seed)*Math.sin(z*6.2+1.3);
    if(kind===0){
      const r=Math.hypot(x/1.05,y/.87,z/.96),rough=.055*noise+.025*Math.sin(x*13+seed)*Math.sin(y*11)*Math.cos(z*9);
      const crater=.07*Math.exp(-65*((x-.46)**2+(y-.22)**2+(z-.35)**2));
      return r-.67-rough+crater;
    }
    if(kind===1){
      const ringed=variant%2===0,r=Math.hypot(x,y,z),sphere=r-(ringed?.60:.75)-.025*noise-.012*Math.sin(x*17+seed)*Math.cos(z*13);
      return ringed?Math.min(sphere,Math.hypot(Math.hypot(x,z)-.82,y)-.055):sphere;
    }
    const horizontal=Math.hypot(x,z),edge=.70+.05*Math.sin(x*8+seed)*Math.cos(z*7);
    const top=.23+.09*Math.sin(x*5+seed)*Math.cos(z*6),bottom=-.78+.8*Math.pow(horizontal,1.1)+.035*noise;
    const solid=Math.max(horizontal-edge,y-top,bottom-y);
    // Optional carved cave, not missing mesh geometry. Solid islands are the
    // default so an intentional cutout cannot be mistaken for an LOD defect.
    return caves?Math.max(solid,.235-Math.hypot(x-.48,y+.1,z-.04)):solid;
  }
  function gradient(kind,variant,x,y,z,options){const e=.0015;const n=[field(kind,variant,x+e,y,z,options)-field(kind,variant,x-e,y,z,options),field(kind,variant,x,y+e,z,options)-field(kind,variant,x,y-e,z,options),field(kind,variant,x,y,z+e,options)-field(kind,variant,x,y,z-e,options)];const length=Math.hypot(...n)||1;return n.map(v=>v/length);}
  const meshDivisions=[[48,36,28,20,16,10,6,4],[64,48,36,28,24,16,12,8],[64,48,32,24,16,10,6,4]],meshLevels=8;
  const meshColors=['#ff4d30','#ffa52e','#ebd948','#43b879','#288fff','#36cbd9','#8276ff','#bd70e8'];
  const pointColors=['#43ebd9','#7178ff','#b855fa','#d9a6ff','#f09dc8','#beb8e8','#9aa9cc','#778399'];
  const pointTiers=[8192,2048,512,128,32,8,2,1];
  function chooseLOD(body,position,pixelScale,{mode='mesh',quality=3,uniform=false,pointSize=2,lodDistance=4000,nearRadius=250,maxMeshLevel=meshLevels-1},previous){
    const centerDistance=Math.hypot(...body.position.map((v,i)=>v-position[i])),surfaceDistance=Math.max(0,centerDistance-body.radius);
    const distance=Math.max(1,centerDistance-body.radius*.45);
    const pixels=2*body.radius*.8*pixelScale/distance;
    const mesh=mode==='mesh'||(mode==='hybrid'&&(uniform||pixels>(previous?.representation==='mesh'?30:42)));
    let result;
    if(mesh){
      const errors=body.kind===1?[.003,.005,.010,.018,.028,.04,.065,.12]:body.kind===2?[.003,.006,.013,.024,.045,.08,.14,.25]:[.005,.009,.016,.027,.05,.08,.14,.25];
      const projected=level=>errors[level]*pixels/2;
      const bands=[.12,.25,.5,1,2,4,6].map(f=>Math.max(1,lodDistance)*f),last=Math.max(0,Math.min(meshLevels-1,maxMeshLevel));
      let errorLevel=0;while(errorLevel<last&&projected(errorLevel+1)<=quality*.35)errorLevel++;
      let distanceLevel=0;while(distanceLevel<last&&surfaceDistance>bands[distanceLevel])distanceLevel++;
      let level=uniform||surfaceDistance<=nearRadius?0:Math.min(distanceLevel,errorLevel);
      if(!uniform&&surfaceDistance>nearRadius&&previous?.representation==='mesh'){
        const p=previous.level,low=p===0?0:bands[p-1]*.85,high=p===meshLevels-1?Infinity:bands[p]*1.15;
        if(p<=last&&projected(p)<=quality*.42&&surfaceDistance>=low&&surfaceDistance<=high&&(p===last||projected(p+1)>=quality*.28||p===distanceLevel))level=p;
      }
      result={representation:'mesh',level,rank:level,pixels};
    }
    else{
      // Hybrid clouds hand off at a small silhouette; sample densely enough for
      // the chosen dot size rather than leaving large random holes in a body.
      const spacing=mode==='hybrid'?Math.min(quality,pointSize*.7):quality;
      const count=uniform?8192:Math.PI*(pixels/(2*spacing))**2;let level=pointTiers.length-1;while(level>0&&pointTiers[level]<count)level--;
      if(!uniform&&previous?.representation==='points'&&pointTiers[previous.level]>=count*.8&&(previous.level===pointTiers.length-1||pointTiers[previous.level+1]<count*1.2))level=previous.level;
      result={representation:'points',level,rank:level+meshLevels,pixels};
    }
    return result;
  }
  return {cellSize,maxRadius,hash,random,chunk,heroes,visibleSphere,sectors,field,gradient,meshDivisions,meshLevels,meshColors,pointColors,pointTiers,chooseLOD};
});
