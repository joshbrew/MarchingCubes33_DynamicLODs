// GPU instancing of actual MC meshes and nested 3D point-cloud samples.
(function(root){
  'use strict';const World=root.SpaceWorld,workerURL=new URL('worker.js',document.currentScript.src);
  const shader=`
struct Vertex { position:vec4<f32>, normal:vec4<f32> }
struct Instance { centerRadius:vec4<f32>, quaternion:vec4<f32>, tint:vec4<f32>, details:vec4<f32> }
struct Frame { vp:mat4x4<f32>, sun:vec4<f32>, settings:vec4<f32>, viewport:vec4<f32>, right:vec4<f32>, up:vec4<f32>, forward:vec4<f32> }
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> instances:array<Instance>;
@group(1) @binding(0) var<storage,read> geometry:array<Vertex>;
fn rotate(q:vec4<f32>,v:vec3<f32>)->vec3<f32>{return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
struct Varying {
 @builtin(position) clip:vec4<f32>, @location(0) local:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) relative:vec3<f32>,
 @location(3) tint:vec3<f32>, @location(4) @interpolate(flat) details:vec4<f32>, @location(5) uv:vec2<f32>
}
fn transformed(vertex:Vertex,info:Instance)->Varying{
 let relative=info.centerRadius.xyz+rotate(info.quaternion,vertex.position.xyz)*info.centerRadius.w;
 var clip=frame.vp*vec4<f32>(relative,1);clip.z=(clip.z+clip.w)*.5;
 return Varying(clip,vertex.position.xyz,rotate(info.quaternion,vertex.normal.xyz),relative,info.tint.xyz,info.details,vec2<f32>(0));
}
@vertex fn mesh_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{return transformed(geometry[v],instances[i]);}
@vertex fn point_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{
 var corners=array<vec2<f32>,6>(vec2<f32>(-1,-1),vec2<f32>(1,-1),vec2<f32>(1,1),vec2<f32>(-1,-1),vec2<f32>(1,1),vec2<f32>(-1,1));
 var result=transformed(geometry[v/6u],instances[i]);let uv=corners[v%6u];
 result.clip=vec4<f32>(result.clip.xy+uv*frame.settings.z/frame.viewport.xy*result.clip.w,result.clip.zw);result.uv=uv;return result;
}
fn lod_color(lod:f32)->vec3<f32>{var colors=array<vec3<f32>,${World.meshLevels+World.pointTiers.length}>(${[...World.meshColors,...World.pointColors].map(c=>'vec3<f32>('+[1,3,5].map(i=>(parseInt(c.slice(i,i+2),16)/255).toFixed(4)).join(',')+')').join(',')});return colors[min(u32(lod),${World.meshLevels+World.pointTiers.length-1}u)];}
fn shade(input:Varying,points:bool)->vec4<f32>{
 if(length(input.relative)>frame.settings.x){discard;}
 if(points&&dot(input.uv,input.uv)>1.0){discard;}
 let n=normalize(input.normal);let p=input.local;let kind=input.details.y;let variant=input.details.z;
 let light=.22+.88*max(0.0,dot(n,normalize(frame.sun.xyz)));
 let rim=pow(1.0-max(0.0,dot(n,normalize(-input.relative))),3.0);
 var color=input.tint;
 if(kind<.5){let strata=.82+.18*sin(p.x*34.0+p.y*25.0+p.z*41.0);color*=strata;}
 else if(kind<1.5){
   let terrain=sin(p.x*7.0+variant)*cos(p.z*6.0-variant)+sin(p.y*9.0+p.z*4.0)*.5;
   color=mix(vec3<f32>(.05,.16,.37),vec3<f32>(.28,.53,.30),smoothstep(-.15,.25,terrain));
   color=mix(color,vec3<f32>(.76,.85,.88),smoothstep(.45,.56,abs(p.y)));
   if(u32(variant)%2u==0u&&length(p)>.72){color=mix(vec3<f32>(.32,.21,.41),vec3<f32>(.82,.57,.35),.5+.5*sin(length(p.xz)*210.0));}
   color+=vec3<f32>(.12,.35,.65)*rim;
 }else{
   color=mix(vec3<f32>(.29,.22,.32),vec3<f32>(.22,.48,.29),smoothstep(.05,.22,p.y));
   color+=vec3<f32>(.08,.28,.32)*(1.0-smoothstep(-.6,-.2,p.y))*(.5+.5*sin(p.y*60.0));
 }
 if(frame.settings.y>.5){color=lod_color(input.details.x);}
 let exposure=select(light,.65+light*.65,points);return vec4<f32>(pow(max(color*exposure,vec3<f32>(.001)),vec3<f32>(1.0/2.2)),1);
}
@fragment fn mesh_fragment(input:Varying)->@location(0) vec4<f32>{return shade(input,false);}
@fragment fn point_fragment(input:Varying)->@location(0) vec4<f32>{return shade(input,true);}
struct Sky { @builtin(position) clip:vec4<f32>, @location(0) uv:vec2<f32> }
@vertex fn sky_vertex(@builtin(vertex_index) index:u32)->Sky{var corners=array<vec2<f32>,3>(vec2<f32>(-1,-1),vec2<f32>(3,-1),vec2<f32>(-1,3));let p=corners[index];return Sky(vec4<f32>(p,1,1),p);}
fn sky_hash(p:vec2<u32>)->f32{var h=(p.x*0x8da6b343u)^(p.y*0xd8163841u);h=(h^(h>>16u))*0x7feb352du;h=(h^(h>>15u))*0x846ca68bu;return f32(h^(h>>16u))/4294967295.0;}
@fragment fn sky_fragment(input:Sky)->@location(0) vec4<f32>{
 let ray=normalize(frame.forward.xyz+input.uv.x*frame.viewport.z*frame.right.xyz+input.uv.y*frame.viewport.w*frame.up.xyz);
 let uv=vec2<f32>(atan2(ray.z,ray.x)/6.2831853+.5,asin(ray.y)/3.1415927+.5);let grid=uv*vec2<f32>(1400,700);let cell=vec2<u32>(floor(grid));let seed=sky_hash(cell);
 let spot=vec2<f32>(sky_hash(cell+vec2<u32>(7,31)),sky_hash(cell+vec2<u32>(101,3)));
 let star=select(0.0,1.0-smoothstep(.02,.18,length(fract(grid)-spot)),seed>.989);
 let nebula=pow(max(0.0,.5+.5*sin(ray.x*8.0+ray.z*11.0+sin(ray.y*7.0))),5.0)*pow(1.0-abs(ray.y),6.0);
 let color=vec3<f32>(.003,.005,.013)+nebula*vec3<f32>(.025,.008,.042)+star*mix(vec3<f32>(.6,.72,1),vec3<f32>(1,.83,.62),seed);
 return vec4<f32>(pow(color,vec3<f32>(1.0/2.2)),1);
}
`;
  class Renderer{
    constructor(canvas,options={}){
      this.canvas=canvas;this.options={maxInstances:12000,maxChunks:2048,geometryMB:64,pointBudget:600000,...options};
      this.settings={mode:'mesh',quality:3,uniform:false,algorithm:'mc33',pointSize:2,lodDistance:4000,nearRadius:250,caves:false};
      this.chunks=new Map();this.cache=new Map();this.queue=new Map();this.inflight=new Set();this.failed=new Set();this.protected=new Set();this.previous=new Map();this.visible=[];
      this.lastSelect=-Infinity;this.dirty=true;this.disposed=false;this.bytes=0;this.errors=[];
      this.stats={generated:0,streamed:0,evicted:0,gpuMs:null,workerMs:0};
      this.geometryRevision=0;this.viewState=[];this.draws=null;
    }
    async initialize(){
      if(!navigator.gpu)throw new Error('Space LOD needs WebGPU on localhost in a supported browser');
      const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter');
      this.device=await adapter.requestDevice({requiredFeatures:adapter.features.has('timestamp-query')?['timestamp-query']:[]});const d=this.device;
      d.addEventListener('uncapturederror',event=>{this.errors.push(event.error.message);console.error(event.error);});d.lost.then(info=>{if(!this.disposed)this.errors.push(`GPU lost: ${info.message}`);});
      this.context=this.canvas.getContext('webgpu');this.format=navigator.gpu.getPreferredCanvasFormat();this.context.configure({device:d,format:this.format,alphaMode:'opaque'});
      this.frameBuffer=d.createBuffer({size:160,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.instances=d.createBuffer({size:this.options.maxInstances*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      const frameLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
      this.geometryLayout=d.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}}]});
      this.frameGroup=d.createBindGroup({layout:frameLayout,entries:[{binding:0,resource:{buffer:this.frameBuffer}},{binding:1,resource:{buffer:this.instances}}]});
      const module=d.createShaderModule({code:shader,label:'Space meshes, point clouds and star sky'}),info=await module.getCompilationInfo();
      const errors=info.messages.filter(m=>m.type==='error');if(errors.length)throw new Error(errors.map(m=>`${m.lineNum}: ${m.message}`).join('\n'));
      const layout=d.createPipelineLayout({bindGroupLayouts:[frameLayout,this.geometryLayout]});
      const pipeline=(vertex,fragment,primitive)=>d.createRenderPipelineAsync({layout,vertex:{module,entryPoint:vertex},fragment:{module,entryPoint:fragment,targets:[{format:this.format}]},primitive,depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}});
      this.mesh=await pipeline('mesh_vertex','mesh_fragment',{topology:'triangle-list',cullMode:'back'});this.points=await pipeline('point_vertex','point_fragment',{topology:'triangle-list'});
      this.sky=await d.createRenderPipelineAsync({layout:d.createPipelineLayout({bindGroupLayouts:[frameLayout]}),vertex:{module,entryPoint:'sky_vertex'},fragment:{module,entryPoint:'sky_fragment',targets:[{format:this.format}]},primitive:{topology:'triangle-list'},depthStencil:{format:'depth24plus',depthWriteEnabled:false,depthCompare:'always'}});
      this.workers=Array.from({length:2},()=>{const state={worker:new Worker(workerURL),busy:false,key:null};state.worker.onmessage=event=>this.receive(state,event.data);state.worker.onerror=event=>{this.errors.push(event.message);if(state.key){this.failed.add(state.key);this.inflight.delete(state.key);}state.busy=false;};return state;});
      this.timers=[];if(d.features.has('timestamp-query'))for(let i=0;i<3;i++)this.timers.push({busy:false,queries:d.createQuerySet({type:'timestamp',count:2}),resolve:d.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read:d.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})});
      this.instanceData=new Float32Array(this.options.maxInstances*16);this.frameData=new Float32Array(40);
      this.frameIndex=0;this.resize();return this;
    }
    configure(values){Object.assign(this.settings,values);this.previous.clear();this.queue.clear();this.dirty=true;}
    resize(){const ratio=Math.min(window.devicePixelRatio||1,1.5),width=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),height=Math.max(1,Math.round(this.canvas.clientHeight*ratio));this.ratio=ratio;if(this.canvas.width===width&&this.canvas.height===height&&this.depth)return;this.canvas.width=width;this.canvas.height=height;this.depth?.destroy();this.depth=this.device.createTexture({size:[width,height],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});this.dirty=true;}
    key(body,level){return `${this.settings.algorithm}:${body.kind}:${body.variant}${body.kind===2?(this.settings.caves?'c':'s'):''}:${level}`;}
    request(body,level,priority){const key=this.key(body,level);if(this.cache.has(key)||this.inflight.has(key)||this.failed.has(key))return;const previous=this.queue.get(key);if(!previous||priority>previous.priority)this.queue.set(key,{key,kind:body.kind,variant:body.variant,level,algorithm:this.settings.algorithm,caves:this.settings.caves,priority});}
    dispatch(){for(const state of this.workers){if(state.busy||!this.queue.size)continue;const request=Array.from(this.queue.values()).sort((a,b)=>b.priority-a.priority)[0];this.queue.delete(request.key);this.inflight.add(request.key);state.busy=true;state.key=request.key;state.worker.postMessage(request);}}
    upload(key,vertices,count){
      const limit=this.options.geometryMB*1024**2;
      while(this.bytes+vertices.byteLength>limit){let victim=null;for(const [id,g]of this.cache)if(!this.protected.has(id)&&(!victim||g.touched<victim[1].touched))victim=[id,g];if(!victim)return;victim[1].buffer.destroy();this.bytes-=victim[1].bytes;this.cache.delete(victim[0]);}
      const buffer=this.device.createBuffer({size:vertices.byteLength,usage:GPUBufferUsage.STORAGE,mappedAtCreation:true});new Float32Array(buffer.getMappedRange()).set(vertices);buffer.unmap();
      const group=this.device.createBindGroup({layout:this.geometryLayout,entries:[{binding:0,resource:{buffer}}]});
      this.cache.set(key,{key,buffer,group,count,bytes:vertices.byteLength,touched:performance.now()});this.bytes+=vertices.byteLength;
      this.geometryRevision++;
    }
    receive(state,result){if(this.disposed)return;state.busy=false;state.key=null;this.inflight.delete(result.key);if(result.error){this.failed.add(result.key);this.errors.push(result.error);}else{this.upload(result.key,result.vertices,result.count);if(result.fallback)this.upload(result.key.slice(0,result.key.lastIndexOf(':'))+':fallback-points',result.fallback.vertices,result.fallback.count);this.stats.generated++;this.stats.workerMs=result.ms;}this.dispatch();}
    select(camera,planes,now){
      const start=performance.now(),selection=World.sectors(camera.position,planes,camera.far,this.options.maxChunks),keep=new Set(selection.cells.map(c=>c.key)),visible=[];
      for(const sector of selection.cells){let entry=this.chunks.get(sector.key);if(!entry){entry={bodies:World.chunk(...sector.cell),touched:now};this.chunks.set(sector.key,entry);this.stats.streamed++;}entry.touched=now;
        for(const body of entry.bodies){const relative=body.position.map((v,i)=>v-camera.position[i]),distance=Math.hypot(...relative);if(distance-body.radius>camera.far||!World.visibleSphere(relative,body.radius,planes))continue;visible.push({body,distance,lod:World.chooseLOD(body,camera.position,camera.pixelScale,this.settings,this.previous.get(body.id))});}
      }
      visible.sort((a,b)=>a.distance-b.distance);this.visible=visible.slice(0,this.options.maxInstances);this.previous=new Map(this.visible.map(v=>[v.body.id,v.lod]));
      if(this.chunks.size>this.options.maxChunks*2){const victims=Array.from(this.chunks).filter(([key])=>!keep.has(key)).sort((a,b)=>a[1].touched-b[1].touched);for(const [key]of victims){if(this.chunks.size<=this.options.maxChunks*2)break;this.chunks.delete(key);this.stats.evicted++;}}
      this.stats.requestedBodies=visible.length;this.stats.sectors=selection.cells.length;this.stats.examined=selection.examined;this.stats.sectorLimited=selection.limited;this.stats.instanceLimited=visible.length>this.options.maxInstances;this.stats.selectionMs=performance.now()-start;this.lastSelect=now;this.dirty=false;
    }
    viewChanged(camera,planes){let at=0,changed=false;const compare=v=>{if(this.viewState[at]!==v)changed=true;this.viewState[at++]=v;};camera.position.forEach(compare);compare(camera.far);compare(camera.pixelScale);for(const plane of planes)plane.forEach(compare);return changed;}
    prepareDraws(camera,now){
      const groups=new Map();this.protected.clear();let requestedPoints=0,points=0,triangles=0,meshes=0,clouds=0,waiting=0,pointLimited=false;
      const histogram=new Array(World.meshLevels+World.pointTiers.length).fill(0),coarse=World.meshLevels-1;
      for(const item of this.visible){const {body,lod}=item;let representation=lod.representation,geometry;
        this.request(body,coarse,1000+lod.pixels);const key=this.key(body,representation==='points'?'points':lod.level);this.request(body,representation==='points'?'points':lod.level,100+lod.pixels*20);
        geometry=this.cache.get(key);if(!geometry){waiting++;if(representation==='points')geometry=this.cache.get(this.key(body,'fallback-points'));else for(let level=coarse;level>=0;level--){const cached=this.cache.get(this.key(body,level));if(cached)geometry=cached;}}
        if(!geometry)continue;geometry.touched=now;this.protected.add(geometry.key);
        let count=geometry.count,rank=lod.rank;
        if(representation==='points'){
          count=Math.min(count,World.pointTiers[lod.level]);requestedPoints+=count;
          const remaining=this.options.pointBudget-points;if(count>remaining){pointLimited=true;count=World.pointTiers.find(n=>n<=remaining&&n<=count)||0;}
          if(!count)continue;points+=count;clouds++;rank=World.meshLevels+World.pointTiers.findIndex(n=>n<=count);
        }else{triangles+=count/3;meshes++;rank=Number(geometry.key.slice(geometry.key.lastIndexOf(':')+1));}
        histogram[rank]++;const groupKey=`${geometry.key}:${representation}:${count}`;
        if(!groups.has(groupKey))groups.set(groupKey,{geometry,representation,count,items:[]});groups.get(groupKey).items.push({body,rank});
      }
      this.dispatch();const data=this.instanceData,draws=[];let at=0;
      for(const group of groups.values()){const first=at;for(const {body,rank}of group.items){const o=at++*16;data.set([...body.position.map((v,i)=>v-camera.position[i]),body.radius],o);data.set(body.rotation,o+4);data.set([...body.tint,1],o+8);data.set([rank,body.kind,body.variant,0],o+12);}draws.push({...group,first,instances:group.items.length});}
      if(at)this.device.queue.writeBuffer(this.instances,0,data,0,at*16);
      this.draws=draws;this.drawPosition=camera.position.slice();this.drawSelect=this.lastSelect;this.drawRevision=this.geometryRevision;
      Object.assign(this.stats,{drawCalls:draws.length+1,triangles,points,requestedPoints,meshes,clouds,drawn:at,waiting,pointLimited,histogram});
      this.stats.batchBuilds=(this.stats.batchBuilds||0)+1;
    }
    render(camera,planes,now,{lodColors=false}={}){
      const start=performance.now();this.resize();if(this.dirty||(now-this.lastSelect>=100&&this.viewChanged(camera,planes))){this.select(camera,planes,now);this.viewChanged(camera,planes);}
      if(!this.draws||this.drawSelect!==this.lastSelect||this.drawRevision!==this.geometryRevision||camera.position.some((v,i)=>v!==this.drawPosition[i]))this.prepareDraws(camera,now);
      const frame=this.frameData;frame.set(camera.viewProjection);frame.set([.4,.75,.6,0],16);frame.set([camera.far,Number(lodColors),this.settings.pointSize*this.ratio,0],20);frame.set([this.canvas.width,this.canvas.height,camera.tanX,camera.tanY],24);frame.set(camera.right,28);frame.set(camera.up,32);frame.set(camera.forward,36);this.device.queue.writeBuffer(this.frameBuffer,0,frame);
      const encoder=this.device.createCommandEncoder(),timer=this.frameIndex++%20===0?this.timers.find(t=>!t.busy):null;if(timer)timer.busy=true;
      const descriptor={colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store',clearValue:{r:0,g:0,b:0,a:1}}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}};
      if(timer)descriptor.timestampWrites={querySet:timer.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1};
      const pass=encoder.beginRenderPass(descriptor);pass.setPipeline(this.sky);pass.setBindGroup(0,this.frameGroup);pass.draw(3);
      for(const draw of this.draws){pass.setPipeline(draw.representation==='mesh'?this.mesh:this.points);pass.setBindGroup(0,this.frameGroup);pass.setBindGroup(1,draw.geometry.group);pass.draw(draw.count*(draw.representation==='points'?6:1),draw.instances,0,draw.first);}pass.end();
      if(timer){encoder.resolveQuerySet(timer.queries,0,2,timer.resolve,0);encoder.copyBufferToBuffer(timer.resolve,0,timer.read,0,16);}this.device.queue.submit([encoder.finish()]);
      if(timer)timer.read.mapAsync(GPUMapMode.READ).then(()=>{const stamps=new BigUint64Array(timer.read.getMappedRange());this.stats.gpuMs=Number(stamps[1]-stamps[0])/1e6;timer.read.unmap();timer.busy=false;}).catch(error=>{timer.busy=false;if(!this.disposed)this.errors.push(error.message);});
      Object.assign(this.stats,{cpuMs:performance.now()-start,pending:this.queue.size+this.inflight.size,geometryBytes:this.bytes,cachedChunks:this.chunks.size});return this.stats;
    }
    dispose(){if(this.disposed)return;this.disposed=true;for(const state of this.workers||[])state.worker.terminate();for(const geometry of this.cache.values())geometry.buffer.destroy();for(const timer of this.timers||[]){timer.queries.destroy();timer.resolve.destroy();timer.read.destroy();}this.frameBuffer?.destroy();this.instances?.destroy();this.depth?.destroy();this.context?.unconfigure();this.device?.destroy();}
  }
  root.SpaceLOD={Renderer,shader};
})(typeof globalThis!=='undefined'?globalThis:this);

