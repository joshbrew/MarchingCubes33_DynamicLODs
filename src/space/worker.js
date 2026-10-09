importScripts('../bourke.js','../mc33Tables.js','../mc33.js','../mc33Shader.js','../coordinates.js','../marchingCubes.js','world.js','geometry.js');
onmessage=event=>{
  const {key,kind,variant,level,algorithm,caves}=event.data;
  try{
    const start=performance.now(),mesh=SpaceGeometry.build(kind,variant,level==='points'?0:level,algorithm,{caves});
    const geometry=level==='points'?SpaceGeometry.pointCloud(mesh.vertices,8192,kind*71+variant):mesh;
    const fallback=level===SpaceWorld.meshLevels-1?SpaceGeometry.pointCloud(mesh.vertices,512,kind*71+variant):null;
    postMessage({key,...geometry,fallback,ms:performance.now()-start},fallback?[geometry.vertices.buffer,fallback.vertices.buffer]:[geometry.vertices.buffer]);
  }catch(error){postMessage({key,error:error.message});}
};
