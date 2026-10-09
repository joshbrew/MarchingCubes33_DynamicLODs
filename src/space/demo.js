(async function(){
  'use strict';const $=id=>document.getElementById(id),canvas=$('space'),status=$('status'),controls=Array.from(document.querySelectorAll('header input,header select,header button'));
  if(window.matchMedia('(max-width:800px), (max-height:650px)').matches)$('controls').open=false;
  controls.forEach(c=>{c.disabled=true;});let renderer;
  try{if(!globalThis.THREE)throw new Error('Three.js could not load');renderer=new SpaceLOD.Renderer(canvas);await renderer.initialize();}
  catch(error){renderer?.dispose();status.textContent=error.message;status.classList.add('error');$('loading').textContent=error.message;return;}
  const camera=new THREE.PerspectiveCamera(60,1,1,9000),vp=new THREE.Matrix4(),frustum=new THREE.Frustum();
  const position=new THREE.Vector3(0,180,1500),direction=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),worldUp=new THREE.Vector3(0,1,0),keys=new Set();
  let yaw=0,pitch=-.07,flying=false,dragging=false,flightDirection=new THREE.Vector3(),last=performance.now(),lastHUD=0,frameTime=16.7,frame;
  function stop(){flying=false;$('fly').textContent='Start flythrough';}
  function reset(){stop();position.set(0,180,1500);yaw=0;pitch=-.07;keys.clear();renderer.dirty=true;}
  function focusBody(id){stop();const body=SpaceWorld.heroes.find(body=>body.id===id),offset=id==='island'?[2.2,.35,1.4]:[0,.35,2.6];position.fromArray(body.position).add(new THREE.Vector3(...offset).multiplyScalar(body.radius));yaw=Math.atan2(-offset[0],offset[2]);pitch=-Math.atan2(offset[1],Math.hypot(offset[0],offset[2]));keys.clear();renderer.dirty=true;canvas.focus();}
  for(const id of ['island','planet','asteroid'])$(id).addEventListener('click',()=>focusBody(id));$('reset').addEventListener('click',reset);
  $('fly').addEventListener('click',()=>{if(flying)stop();else{flying=true;flightDirection.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));$('fly').textContent='Stop flythrough';}keys.clear();canvas.focus();});
  canvas.addEventListener('pointerdown',event=>{dragging=true;canvas.focus();canvas.setPointerCapture(event.pointerId);});canvas.addEventListener('pointerup',()=>{dragging=false;});canvas.addEventListener('pointermove',event=>{if(dragging){yaw-=event.movementX*.003;pitch=Math.max(-1.5,Math.min(1.5,pitch-event.movementY*.003));renderer.dirty=true;}});
  window.addEventListener('keydown',event=>{if(/INPUT|SELECT|BUTTON/.test(event.target.tagName))return;keys.add(event.code);if(event.code==='Space')event.preventDefault();});window.addEventListener('keyup',event=>keys.delete(event.code));window.addEventListener('blur',()=>{keys.clear();dragging=false;});
  $('mode').addEventListener('change',()=>renderer.configure({mode:$('mode').value}));$('algorithm').addEventListener('change',()=>renderer.configure({algorithm:$('algorithm').value}));$('uniform').addEventListener('change',()=>renderer.configure({uniform:$('uniform').checked}));
  $('lodDistance').addEventListener('input',()=>{renderer.configure({lodDistance:Number($('lodDistance').value)});$('lodDistanceValue').textContent=`${$('lodDistance').value} m`;});
  $('nearRadius').addEventListener('input',()=>{renderer.configure({nearRadius:Number($('nearRadius').value)});$('nearRadiusValue').textContent=`${$('nearRadius').value} m`;});
  $('caves').addEventListener('change',()=>renderer.configure({caves:$('caves').checked}));
  $('distance').addEventListener('input',()=>{camera.far=Number($('distance').value);$('distanceValue').textContent=`${camera.far/1000} km`;renderer.dirty=true;});
  $('quality').addEventListener('input',()=>{renderer.configure({quality:Number($('quality').value)});$('qualityValue').textContent=`${$('quality').value} px`;});
  $('pointSize').addEventListener('input',()=>{renderer.configure({pointSize:Number($('pointSize').value)});$('pointValue').textContent=`${$('pointSize').value} px`;});$('speed').addEventListener('input',()=>{$('speedValue').textContent=`${$('speed').value} m/s`;});
  const colors=[...SpaceWorld.meshColors,...SpaceWorld.pointColors];
  function update(now,stats){if(now-lastHUD<250)return;lastHUD=now;
    $('frameTime').textContent=`${frameTime.toFixed(1)} / ${stats.gpuMs?.toFixed(2)??'—'} ms`;$('triangles').textContent=stats.triangles.toLocaleString();$('points').textContent=stats.points.toLocaleString();$('objects').textContent=`${stats.meshes} / ${stats.clouds}`;
    $('memory').textContent=`${(stats.geometryBytes/1024**2).toFixed(1)} MB / ${stats.cachedChunks}`;$('draws').textContent=`${stats.drawCalls} / ${stats.pending}`;
    $('histogram').replaceChildren(...stats.histogram.map((count,i)=>{const bar=document.createElement('div');bar.style.background=colors[i];bar.style.flex=String(count);bar.title=`${i<SpaceWorld.meshLevels?'Mesh LOD '+i:'Point tier '+(i-SpaceWorld.meshLevels)}: ${count} bodies`;return bar;}));
    $('meshLods').textContent=stats.histogram.slice(0,SpaceWorld.meshLevels).join(' / ');
    $('coords').textContent=`x ${(position.x/1000).toFixed(1)} · y ${(position.y/1000).toFixed(1)} · z ${(position.z/1000).toFixed(1)} km`;
    const limited=stats.sectorLimited||stats.instanceLimited||stats.pointLimited;
    status.textContent=renderer.errors.length?renderer.errors.at(-1):`${stats.streamed} sectors explored · ${stats.drawn.toLocaleString()} visible bodies · ${stats.waiting?'refining shapes…':'cache ready'}${limited?' · view budget reached':''}`;
    status.classList.toggle('error',renderer.errors.length>0);status.dataset.pending=stats.pending;status.dataset.errors=renderer.errors.length;status.dataset.drawn=stats.drawn;status.dataset.meshes=stats.meshes;status.dataset.points=stats.points;
    if(stats.drawn)$('loading').style.display='none';
  }
  function animate(now){if(renderer.disposed)return;frame=requestAnimationFrame(animate);const elapsed=now-last,dt=Math.min(.05,elapsed/1000);last=now;frameTime=frameTime*.94+elapsed*.06;
    direction.set(Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),-Math.cos(yaw)*Math.cos(pitch));right.crossVectors(direction,worldUp).normalize();up.crossVectors(right,direction).normalize();
    const speed=Number($('speed').value)*(keys.has('ShiftLeft')?3:1),movement=new THREE.Vector3();if(flying)position.addScaledVector(flightDirection,speed*dt);
    if(keys.has('KeyW'))movement.add(direction);if(keys.has('KeyS'))movement.sub(direction);if(keys.has('KeyD'))movement.add(right);if(keys.has('KeyA'))movement.sub(right);
    if(keys.has('Space')||keys.has('KeyE'))movement.y++;if(keys.has('KeyC')||keys.has('KeyQ'))movement.y--;if(movement.lengthSq())position.addScaledVector(movement.normalize(),speed*dt);
    // Floating origin: CPU keeps global double coordinates, GPU receives only
    // camera-relative centers. Travel does not accumulate GPU position error.
    camera.position.set(0,0,0);camera.up.copy(up);camera.lookAt(direction);camera.aspect=canvas.clientWidth/canvas.clientHeight;camera.updateProjectionMatrix();camera.updateMatrixWorld();vp.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);frustum.setFromProjectionMatrix(vp);
    const tanY=Math.tan(camera.fov*Math.PI/360),input={position:position.toArray(),far:camera.far,pixelScale:canvas.height/(2*tanY),viewProjection:vp.elements,right:right.toArray(),up:up.toArray(),forward:direction.toArray(),tanX:tanY*camera.aspect,tanY};
    try{update(now,renderer.render(input,frustum.planes.map(p=>[p.normal.x,p.normal.y,p.normal.z,p.constant]),now,{lodColors:$('colors').checked}));}
    catch(error){cancelAnimationFrame(frame);status.textContent=error.message;status.classList.add('error');console.error(error);}
  }
  controls.forEach(c=>{c.disabled=false;});frame=requestAnimationFrame(animate);window.addEventListener('pagehide',()=>{cancelAnimationFrame(frame);renderer.dispose();});
})();
