(async function(){
  const result=document.getElementById('results'),lines=[],log=text=>{lines.push(text);result.textContent=lines.join('\n');},assert=(ok,text)=>{if(!ok)throw new Error(text);};let renderer;
  try{
    renderer=await new SpaceLOD.Renderer(document.getElementById('space')).initialize();renderer.device.pushErrorScope('validation');
    const camera=new THREE.PerspectiveCamera(60,1280/720,1,32000),vp=new THREE.Matrix4(),frustum=new THREE.Frustum(),seen=new Set();let now=0;
    camera.lookAt(new THREE.Vector3(0,-.07,-1));camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);
    const planes=frustum.planes.map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant]),tanY=Math.tan(Math.PI/6);
    function render(position=[0,180,1500]){return renderer.render({position,far:32000,pixelScale:renderer.canvas.height/(2*tanY),viewProjection:vp.elements,right:[1,0,0],up:[0,1,0],forward:[0,-.07,-1],tanX:tanY*1280/720,tanY},planes,now+=110);}
    async function settle(position){let stats;renderer.dirty=true;for(let i=0;i<800;i++){
      stats=render(position);await renderer.device.queue.onSubmittedWorkDone();
      if(stats.pending===0&&stats.waiting===0&&i>0){stats.histogram.slice(0,8).forEach((count,level)=>{if(count)seen.add(level);});return {...stats,histogram:stats.histogram.slice()};}
      await new Promise(resolve=>setTimeout(resolve,20));
    }throw new Error('32 km geometry did not settle');}
    renderer.configure({maxMeshLevel:4});const baseline=await settle(),ids=renderer.visible.map(item=>item.body.id);log(`FIVE LEVEL BASELINE: ${baseline.drawn} bodies, ${baseline.triangles.toLocaleString()} triangles`);
    renderer.configure({maxMeshLevel:7});const adaptive=await settle();
    assert(JSON.stringify(ids)===JSON.stringify(renderer.visible.map(item=>item.body.id)),'same bodies remain visible');
    assert(adaptive.drawn===baseline.drawn&&adaptive.clouds===0,'same solid mesh population, no point substitution');
    assert(adaptive.triangles<baseline.triangles*.3,'far detail reduces triangles by at least 70%');
    assert(adaptive.histogram.slice(5,8).every(count=>count>0),'all three new far levels are actually drawn');
    log(`EIGHT LEVELS: ${adaptive.drawn} bodies, ${adaptive.triangles.toLocaleString()} triangles (${(100*(1-adaptive.triangles/baseline.triangles)).toFixed(1)}% fewer), ${adaptive.drawCalls} draws`);
    log(`LOD 0–7 populations: ${adaptive.histogram.slice(0,8).join(' / ')}`);
    const batches=renderer.stats.batchBuilds,selection=renderer.lastSelect;let cpu=0;
    for(let i=0;i<60;i++){cpu+=render().cpuMs;await renderer.device.queue.onSubmittedWorkDone();}
    assert(renderer.stats.batchBuilds===batches&&renderer.lastSelect===selection,'stationary frames reuse selection and uploaded instance batches');
    log(`PASS stationary selection and batches reused, mean CPU submission ${(cpu/60).toFixed(3)} ms`);
    await settle([-230,160,900]);assert(renderer.stats.batchBuilds>batches,'movement invalidates batches');assert(seen.size===8,'all eight drawn levels reached across camera travel');log('PASS all eight drawn mesh levels, movement invalidation');
    const repeat=await settle([81000,-55000,99000]);assert(repeat.drawn<=12000&&repeat.sectors<=2048&&repeat.cachedChunks<=4096&&repeat.geometryBytes<=64*1024**2,'production view and cache bounds during long travel');
    log('PASS 99 km travel with production body / sector / geometry budgets');
    assert(!await renderer.device.popErrorScope(),'GPU validation');assert(!renderer.errors.length,renderer.errors.join('\n'));log('ALL 32 KM STRESS CHECKS PASSED');document.body.dataset.result='pass';
  }catch(error){log(`FAIL ${error.stack||error}`);document.body.dataset.result='fail';}
  finally{renderer?.dispose();}
})();
