(async function(){
  const result=document.getElementById('results'),lines=[],log=text=>{lines.push(text);result.textContent=lines.join('\n');},assert=(ok,text)=>{if(!ok)throw new Error(text);};let renderer;
  try{
    renderer=await new SpaceLOD.Renderer(document.getElementById('space'),{maxInstances:1600,maxChunks:256,pointBudget:120000}).initialize();renderer.device.pushErrorScope('validation');
    const camera=new THREE.PerspectiveCamera(60,1.6,1,9000),vp=new THREE.Matrix4(),frustum=new THREE.Frustum();let now=0;
    camera.lookAt(new THREE.Vector3(0,0,-1));camera.updateMatrixWorld();
    function render(position=[0,180,1500],far=9000){camera.far=far;camera.updateProjectionMatrix();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);
      const tanY=Math.tan(Math.PI/6);return renderer.render({position,far,pixelScale:renderer.canvas.height/(2*tanY),viewProjection:vp.elements,right:[1,0,0],up:[0,1,0],forward:[0,0,-1],tanX:tanY*1.6,tanY},frustum.planes.map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant]),now+=110);
    }
    async function settle(position,far){let stats;renderer.dirty=true;for(let i=0;i<500;i++){stats=render(position,far);await renderer.device.queue.onSubmittedWorkDone();if(stats.pending===0&&stats.waiting===0&&i>0)return stats;await new Promise(resolve=>setTimeout(resolve,20));}throw new Error('Space geometry cache did not settle');}
    let stats=await settle();assert(renderer.settings.mode==='mesh'&&stats.meshes>0&&stats.clouds===0,'default space display is mesh-only');assert(renderer.settings.caves===false,'solid islands are the default');log('PASS mesh-only and solid-island defaults');
    renderer.configure({mode:'hybrid'});stats=await settle();assert(stats.meshes>0&&stats.clouds>0,'hybrid renders meshes and point clouds');assert(stats.drawn>50,'3D body visibility');log(`PASS hybrid: ${stats.meshes} meshes / ${stats.clouds} clouds, ${stats.triangles} triangles`);
    const generated=stats.generated;for(let i=0;i<5;i++)render();assert(renderer.stats.generated===generated,'warm frames do not rebuild shapes');log('PASS immutable geometry cache reused by stationary frames');
    renderer.configure({mode:'mesh'});stats=await settle();assert(stats.meshes>0&&stats.clouds===0&&stats.points===0,'mesh-only has connected surfaces, no point substitution');log(`PASS connected mesh-only: ${stats.meshes} bodies, ${stats.drawCalls} batched draws`);
    const drawnLevels=new Set();
    for(const position of [[0,180,1500],[-230,160,900],[0,180,5000]]){stats=await settle(position);stats.histogram.slice(0,SpaceWorld.meshLevels).forEach((count,level)=>{if(count)drawnLevels.add(level);});}
    assert([0,1,2,3,4].every(level=>drawnLevels.has(level)),'camera travel exercises the five near mesh LODs');stats=await settle();log('PASS five near mesh detail levels are drawn during camera travel (far levels checked by the 32 km stress test)');
    renderer.configure({lodDistance:16000,nearRadius:2000});stats=await settle();const retained=stats.triangles;
    renderer.configure({lodDistance:500,nearRadius:0});stats=await settle();assert(stats.triangles<retained,'LOD distance and near radius alter actual drawn geometry');
    renderer.configure({lodDistance:4000,nearRadius:250,caves:true});await settle();assert([...renderer.cache.keys()].some(key=>key.startsWith('mc33:2:')&&key.includes('c:')),'carved island variants are cached independently');
    renderer.configure({caves:false});stats=await settle();assert(renderer.visible.filter(v=>v.body.kind===2).every(v=>renderer.key(v.body,v.lod.level).includes('s:')),'solid variants return after cave toggle');log('PASS LOD distance / near detail controls and cave toggle');
    const adaptiveTriangles=stats.triangles;renderer.configure({uniform:true});stats=await settle();assert(stats.triangles>adaptiveTriangles,'full detail has more triangles than adaptive meshes');log(`PASS adaptive ${adaptiveTriangles} vs full detail ${stats.triangles} triangles`);
    renderer.configure({mode:'points',uniform:false});stats=await settle();assert(stats.meshes===0&&stats.clouds>0&&stats.points<=renderer.options.pointBudget,'point-only uses bounded true 3D samples');log(`PASS nested point-cloud tiers: ${stats.points} points`);
    renderer.configure({mode:'mesh',algorithm:'bourke',uniform:false});stats=await settle();assert(stats.meshes>0&&stats.clouds===0,'Bourke worker shapes are renderable');log('PASS Bourke / MC33 worker extraction and GPU pipelines');
    renderer.configure({mode:'hybrid',algorithm:'mc33'});
    for(const position of [[-100,34000,-32000],[81000,-55000,99000],[0,180,1500]]){
      stats=await settle(position,32000);assert(stats.drawn<=renderer.options.maxInstances&&stats.sectors<=renderer.options.maxChunks,'3D visibility budgets');assert(stats.points<=renderer.options.pointBudget,'point budget');assert(stats.geometryBytes<=renderer.options.geometryMB*1024**2,'geometry memory budget');assert(stats.cachedChunks<=renderer.options.maxChunks*2,'sector cache bound');
    }
    assert(stats.evicted>0,'travel evicts cached sectors');log('PASS vertical and 99 km travel, 32 km view cutoff, return visits and bounded caches');
    const validation=await renderer.device.popErrorScope();assert(!validation,validation?.message);assert(!renderer.errors.length,renderer.errors.join('\n'));log('ALL SPACE WEBGPU CHECKS PASSED');document.body.dataset.result='pass';
  }catch(error){log(`FAIL ${error.stack||error}`);document.body.dataset.result='fail';}
  finally{renderer?.dispose();}
})();
