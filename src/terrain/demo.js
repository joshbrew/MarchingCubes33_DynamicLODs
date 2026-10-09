(async function(){
  'use strict';
  const $=id=>document.getElementById(id),status=$('status'),loading=$('loading');
  if(window.matchMedia('(max-width:800px), (max-height:600px)').matches)$('terrainControls').open=false;
  const controls=Array.from(document.querySelectorAll('header input,header select,header button'));
  controls.forEach(control=>{control.disabled=true;});
  function report(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
  let terrain;
  try {
    if(!globalThis.THREE)throw new Error('Three.js could not load; check the connection and reload');
    await new Promise(resolve=>requestAnimationFrame(resolve));
    terrain=await new AdaptiveTerrain.Renderer($('terrain')).initialize();
  }catch(error){report(error.message,true);loading.textContent=error.message;return;}
  const camera=new THREE.PerspectiveCamera(60,1,1,1800),frustum=new THREE.Frustum(),viewProjection=new THREE.Matrix4();
  const keys=new Set(),direction=new THREE.Vector3(),forward=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(0,1,0);
  let yaw=0,pitch=-.18,dragging=false,touring=false,benchmark=null,previousTime=performance.now(),lastHUD=0,frame=0;
  let frameAverage=16.7,cpuAverage=0,lastError=null;
  let flightTime=0,flightHeading=0,flightClearance=140;
  const colors=['#f04038','#fca52e','#cccf33','#37b679','#3499e5','#9161e5'];
  function reset(){camera.position.set(-250,TerrainField.height(-250,450)+140,450);yaw=0;pitch=-.18;keys.clear();terrain.needsSelection=true;}
  reset();
  function stopFlight(){touring=false;$('tour').textContent='Fly through map';}
  function climbInput(){return Number(keys.has('KeyE')||keys.has('Space'))-Number(keys.has('KeyQ')||keys.has('KeyC'));}
  $('terrain').addEventListener('pointerdown',event=>{dragging=true;$('terrain').focus();$('terrain').setPointerCapture(event.pointerId);});
  $('terrain').addEventListener('pointerup',()=>{dragging=false;});
  $('terrain').addEventListener('pointermove',event=>{if(!dragging||benchmark)return;yaw-=event.movementX*.003;pitch=Math.max(-1.4,Math.min(1.3,pitch-event.movementY*.003));});
  window.addEventListener('keydown',event=>{if(/INPUT|SELECT|BUTTON/.test(event.target.tagName))return;keys.add(event.code);if(['Space','ArrowUp','ArrowDown'].includes(event.code))event.preventDefault();});
  window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});
  $('error').addEventListener('input',()=>{$('errorValue').textContent=`${$('error').value} px`;terrain.configure({pixelError:Number($('error').value)});});
  $('radius').addEventListener('input',()=>{$('radiusValue').textContent=`${$('radius').value} m`;terrain.configure({nearRadius:Number($('radius').value)});});
  $('sampling').addEventListener('change',()=>terrain.configure({uniform:$('sampling').value==='uniform'}));
  $('trees').addEventListener('change',()=>{terrain.vegetation.enabled=$('trees').checked;terrain.vegetation.lastPlan=null;});
  $('treeDistance').addEventListener('input',()=>{terrain.vegetation.distance=Number($('treeDistance').value);terrain.vegetation.lastPlan=null;$('treeDistanceValue').textContent=`${$('treeDistance').value} m`;});
  $('surface').addEventListener('change',()=>{terrain.algorithm=$('surface').value;});
  $('fov').addEventListener('change',()=>{camera.fov=Math.max(25,Math.min(100,Number($('fov').value)||60));$('fov').value=camera.fov;terrain.needsSelection=true;});
  $('distance').addEventListener('input',()=>{camera.far=Number($('distance').value);$('distanceValue').textContent=`${camera.far} m`;terrain.needsSelection=true;});
  $('infinite').addEventListener('change',()=>{
    terrain.configure({infinite:$('infinite').checked});stopFlight();
    $('worldLabel').textContent=$('infinite').checked?'Infinite world · samples down to 2 m':'8 × 8 km world · samples down to 2 m';
    if(!$('infinite').checked)reset();$('report').style.display='none';
  });
  $('tour').addEventListener('click',()=>{
    if(touring)stopFlight();else{touring=true;flightTime=0;flightHeading=yaw;flightClearance=Math.max(20,camera.position.y-TerrainField.height(camera.position.x,camera.position.z));$('tour').textContent='Stop flight';}
    keys.clear();$('terrain').focus();
  });
  $('reset').addEventListener('click',()=>{stopFlight();reset();$('report').style.display='none';});
  function beginBenchmark(){
    stopFlight();reset();benchmark={phase:'warm-adaptive',start:performance.now(),adaptive:[],uniform:[],savedUniform:terrain.settings.uniform};
    terrain.configure({uniform:false});controls.forEach(control=>{control.disabled=true;});$('report').style.display='block';$('report').textContent='Warming adaptive terrain at a fixed camera…';
  }
  $('benchmark').addEventListener('click',beginBenchmark);
  function recordBenchmark(now,stats){
    if(!benchmark)return;
    const elapsed=now-benchmark.start,b=benchmark;
    if(b.phase.startsWith('warm')) {
      if(elapsed>8000){$('report').textContent='Benchmark could not settle within 8 seconds. Try a smaller visible range.';finishBenchmark();return;}
      if(stats.pending===0&&elapsed>1500){b.phase=b.phase==='warm-adaptive'?'adaptive':'uniform';b.start=now;}
    }else{
      b[b.phase].push({frame:frameAverage,cpu:stats.cpuMs,gpu:stats.gpuMs,triangles:stats.triangles,vertices:stats.activeSamples,draws:stats.drawCalls});
      if(elapsed>2000){
        if(b.phase==='adaptive'){b.phase='warm-uniform';b.start=now;terrain.configure({uniform:true});$('report').textContent='Adaptive measured. Warming uniform full detail at the same camera…';}
        else{
          const mean=(items,key)=>{const values=items.map(i=>i[key]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null;};
          const a=b.adaptive,u=b.uniform,reduction=100*(1-mean(a,'triangles')/mean(u,'triangles'));
          const row=(items,name)=>`${name}\n  frame ${mean(items,'frame').toFixed(2)} ms · CPU ${mean(items,'cpu').toFixed(2)} ms\n  GPU render ${mean(items,'gpu')?.toFixed(2)??'unavailable'} ms\n  ${Math.round(mean(items,'triangles')).toLocaleString()} triangles · ${Math.round(mean(items,'draws'))} draws`;
          $('report').textContent=`Same camera · warm cache\n\n${row(a,'Adaptive')}\n\n${row(u,'Uniform full detail')}\n\n${reduction.toFixed(1)}% fewer triangles\nFrame time includes browser scheduling.\nGPU timestamps exclude generation.`;finishBenchmark();
        }
      }
    }
  }
  function finishBenchmark(){if(!benchmark)return;terrain.configure({uniform:benchmark.savedUniform});benchmark=null;controls.forEach(control=>{control.disabled=false;});}
  function drawMap(){
    const context=$('map').getContext('2d'),size=200,world=terrain.options.worldSize;
    context.fillStyle='#263a43';context.fillRect(0,0,size,size);
    for(const [id,lod]of terrain.lastActual||[]) {
      const t=terrain.tiles[id];context.fillStyle=colors[lod];context.fillRect((t.ox-terrain.origin[0]+world/2)/world*size,(t.oz-terrain.origin[1]+world/2)/world*size,t.size/world*size+.3,t.size/world*size+.3);
    }
    const x=(camera.position.x-terrain.origin[0]+world/2)/world*size,z=(camera.position.z-terrain.origin[1]+world/2)/world*size;
    context.strokeStyle='#fff';context.lineWidth=1.5;context.beginPath();context.moveTo(x,z);context.lineTo(x+Math.sin(yaw)*18,z-Math.cos(yaw)*18);context.stroke();
    context.fillStyle='#fff';context.beginPath();context.arc(x,z,3,0,Math.PI*2);context.fill();
    $('positionLabel').textContent=`x ${Math.round(camera.position.x)} · z ${Math.round(camera.position.z)} · altitude ${Math.round(camera.position.y)} m`;
  }
  function updateHUD(now,stats){
    if(now-lastHUD<250)return;lastHUD=now;
    $('frameTime').textContent=`${frameAverage.toFixed(1)} / ${stats.gpuMs?.toFixed(2)??'—'} ms`;
    $('triangleCount').textContent=stats.triangles.toLocaleString();$('drawCount').textContent=`${stats.drawCalls} / ${stats.drawn} tiles`;
    $('sampleCount').textContent=`${Math.round(stats.activeSamples/1000)}k / ${Math.round(stats.uniformSamples/1000)}k`;
    $('cacheCount').textContent=`${stats.resident} / ${terrain.capacity} · ${Math.round(stats.atlasBytes/1024**2)} MB`;
    $('buildCount').textContent=`${stats.builtThisFrame} / ${stats.pending}`;
    const vegetation=stats.vegetation;
    $('treeCount').textContent=`${vegetation?.trees||0} / ${vegetation?.draws||0}`;$('treeLods').textContent=(vegetation?.lods||[0,0,0]).join(' / ');
    $('histogram').replaceChildren(...stats.histogram.map((count,i)=>{const div=document.createElement('div');div.style.background=colors[i];div.style.flex=String(count);div.title=`LOD ${i}: ${count} tiles`;return div;}));
    if(stats.pending===0)loading.style.display='none';
    else if(stats.drawn>0)loading.style.display='none';
    if(terrain.errors.length){lastError=terrain.errors.at(-1);report(lastError,true);}
    else if(stats.capacityLimited)report('Visible range exceeds the resident cache; the closest tiles have priority.');
    else report(`${terrain.settings.infinite?`Infinite · ${stats.windowShifts} areas streamed · `:''}${stats.seams} stitched tiles · CPU submit ${cpuAverage.toFixed(2)} ms · ${stats.pending?'refining detail…':'cache settled'}`);
    status.dataset.pending=stats.pending;status.dataset.errors=terrain.errors.length;status.dataset.drawn=stats.drawn;
    status.dataset.altitude=camera.position.y;status.dataset.x=camera.position.x;status.dataset.z=camera.position.z;
    status.dataset.trees=vegetation?.trees||0;status.dataset.treeDraws=vegetation?.draws||0;
    drawMap();
  }
  function animate(now){
    if(terrain.disposed)return;frame=requestAnimationFrame(animate);
    const dt=Math.min(.05,(now-previousTime)/1000),elapsed=now-previousTime;previousTime=now;frameAverage=frameAverage*.94+elapsed*.06;
    if(touring&&!benchmark){
      flightTime+=dt;flightClearance=Math.max(20,Math.min(1400,flightClearance+climbInput()*dt*130));
      if(terrain.settings.infinite){
        camera.position.x+=Math.sin(flightHeading)*220*dt;camera.position.z-=Math.cos(flightHeading)*220*dt;
        const height=TerrainField.height(camera.position.x,camera.position.z)+flightClearance;
        camera.position.y+=(height-camera.position.y)*(1-Math.exp(-4*dt));
      }else{
        const t=flightTime*.07;
        camera.position.x=Math.sin(t)*1500;camera.position.z=Math.cos(t*.8)*1500;
        camera.position.y=TerrainField.height(camera.position.x,camera.position.z)+flightClearance+Math.sin(t*.7)*70;
        yaw=t+.9;pitch=-.2;
      }
    }else if(!benchmark){
      forward.set(Math.sin(yaw),0,-Math.cos(yaw));right.set(Math.cos(yaw),0,Math.sin(yaw));const movement=new THREE.Vector3();
      if(keys.has('KeyW'))movement.add(forward);if(keys.has('KeyS'))movement.sub(forward);
      if(keys.has('KeyD'))movement.add(right);if(keys.has('KeyA'))movement.sub(right);
      movement.y=climbInput();
      if(movement.lengthSq())camera.position.addScaledVector(movement.normalize(),dt*(keys.has('ShiftLeft')?450:130));
      if(!terrain.settings.infinite){const half=terrain.options.worldSize/2-20;camera.position.x=Math.max(-half,Math.min(half,camera.position.x));camera.position.z=Math.max(-half,Math.min(half,camera.position.z));}
    }
    camera.position.y=Math.max(TerrainField.height(camera.position.x,camera.position.z)+8,Math.min(1800,camera.position.y));
    direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));camera.up.copy(up);camera.lookAt(camera.position.clone().add(direction));
    camera.aspect=$('terrain').clientWidth/$('terrain').clientHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld();
    viewProjection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(viewProjection);
    const planes=frustum.planes.map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant]);
    const input={position:camera.position.toArray(),player:camera.position.toArray(),height:terrain.canvas.height,fov:camera.fov*Math.PI/180,far:camera.far,viewProjection:viewProjection.elements};
    try{
      const stats=terrain.render(input,planes,now,{lodColors:$('colors').checked,wireframe:$('wire').checked});cpuAverage=cpuAverage*.94+stats.cpuMs*.06;
      updateHUD(now,stats);recordBenchmark(now,stats);
    }catch(error){cancelAnimationFrame(frame);report(error.message,true);loading.style.display='block';loading.textContent=error.message;console.error(error);}
  }
  controls.forEach(control=>{control.disabled=false;});
  frame=requestAnimationFrame(animate);
  window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);terrain.dispose();});
})();
