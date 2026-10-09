// Native WebGPU terrain: GPU-resident samples, cached indexed MC heightfield
// topology, instance batches and bounded incremental generation. No mesh readback.
(function(root){
  'use strict';
  const Field=root.TerrainField,LOD=root.TerrainLOD,Surface=root.TerrainSurface,PLOC=root.TerrainPLOC;
  const shader=Field.wgsl+`
struct Vertex { position: vec4<f32>, normal: vec4<f32> }
struct BuildParams { origin: vec2<f32>, size: f32, divs: u32, slot: u32, stride: u32, seed: u32, pad: u32 }
@group(0) @binding(0) var<storage,read_write> buildVertices: array<Vertex>;
@group(0) @binding(1) var<uniform> build: BuildParams;
@compute @workgroup_size(8,8)
fn generate(@builtin(global_invocation_id) gid: vec3<u32>) {
  if(gid.x>build.divs || gid.y>build.divs){return;}
  let xz=build.origin+vec2<f32>(gid.xy)*(build.size/f32(build.divs));
  let h=terrain_height_gradient(xz,build.seed);
  let normal=normalize(vec3<f32>(-h.y,1.0,-h.z));
  let at=build.slot*build.stride+gid.y*(build.divs+1u)+gid.x;
  buildVertices[at]=Vertex(vec4<f32>(xz.x,h.x,xz.y,1),vec4<f32>(normal,0));
}
struct Frame {
  viewProjection: mat4x4<f32>, camera: vec4<f32>, sun: vec4<f32>, reserved: vec4<f32>, settings: vec4<f32>
}
struct Instance { slot:u32, storedDivs:u32, renderDivs:u32, lod:u32 }
@group(0) @binding(0) var<storage,read> renderVertices: array<Vertex>;
@group(0) @binding(1) var<storage,read> instances: array<Instance>;
@group(0) @binding(2) var<uniform> frame: Frame;
struct Varying {
  @builtin(position) clip:vec4<f32>, @location(0) world:vec3<f32>, @location(1) normal:vec3<f32>,
  @location(2) @interpolate(flat) lod:u32,
}
@vertex
fn vertex_main(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->Varying {
  let info=instances[instance];let stride=u32(frame.settings.x);let step=info.storedDivs/info.renderDivs;
  let x=vertex%(info.renderDivs+1u);let z=vertex/(info.renderDivs+1u);
  let v=renderVertices[info.slot*stride+z*step*(info.storedDivs+1u)+x*step];
  var clip=frame.viewProjection*vec4<f32>(v.position.xyz,1);
  // THREE's projection is OpenGL depth; WebGPU depth occupies [0,w].
  clip.z=(clip.z+clip.w)*0.5;
  return Varying(clip,v.position.xyz,v.normal.xyz,info.lod);
}
fn lod_color(level:u32)->vec3<f32> {
  var colors=array<vec3<f32>,6>(vec3<f32>(.95,.25,.22),vec3<f32>(1,.62,.18),vec3<f32>(.8,.82,.2),
    vec3<f32>(.22,.7,.46),vec3<f32>(.2,.6,.9),vec3<f32>(.55,.38,.9));
  return colors[min(level,5u)];
}
@fragment
fn fragment_main(input:Varying)->@location(0) vec4<f32> {
  let n=normalize(input.normal);
  let grass=mix(vec3<f32>(.13,.24,.12),vec3<f32>(.36,.43,.23),smoothstep(-50.0,180.0,input.world.y));
  let stone=vec3<f32>(.42,.40,.36);
  var color=mix(grass,stone,smoothstep(.25,.62,1.0-n.y));
  color=mix(color,vec3<f32>(.77,.79,.77),smoothstep(140.0,250.0,input.world.y)*smoothstep(.4,.85,n.y));
  color=mix(vec3<f32>(.09,.21,.28),color,smoothstep(-30.0,-8.0,input.world.y));
  if(frame.settings.y>0.5){color=lod_color(input.lod);}
  if(frame.settings.z>0.5){color=mix(lod_color(input.lod),vec3<f32>(.85),.35);}
  let light=.35+max(dot(n,normalize(frame.sun.xyz)),0.0)*.85;
  if(length(input.world-frame.camera.xyz)>frame.settings.w){discard;}
  return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
`;

  class Renderer {
    constructor(canvas,options={}) {
      this.canvas=canvas;this.options={worldSize:8192,tileSize:128,maxDivs:64,memoryMB:64,buildsPerFrame:8,...options};
      if(!Number.isInteger(this.options.maxDivs)||this.options.maxDivs<4||(this.options.maxDivs&(this.options.maxDivs-1)))throw new Error('Terrain maxDivs must be a power of two of at least 4');
      const map=LOD.makeTiles(this.options.worldSize,this.options.tileSize);this.tiles=map.tiles;this.side=map.side;
      this.levels=Math.log2(this.options.maxDivs); // 64,32,16,8,4,2
      const start=performance.now();this.tree=PLOC.build(this.tiles);this.treeBuildMs=performance.now()-start;
      this.settings={maxDivs:this.options.maxDivs,levels:this.levels,pixelError:2.5,nearRadius:110,uniform:false,infinite:false};
      this.origin=[0,0];
      this.entries=new Map();this.free=[];this.templates=new Map();this.previous=new Map();this.selected=new Map();
      this.visibleIds=[];this.needsSelection=true;this.lastSelect=-Infinity;this.generation=0;this.seed=7;this.algorithm='mc33';
      this.stats={generated:0,samples:0,cacheHits:0,evicted:0,windowShifts:0,gpuMs:null,treeBuildMs:this.treeBuildMs};
      this.errors=[];this.disposed=false;
      this.drawPlan=null;this.planAlgorithm=null;this.viewState=[];this.frameData=new Float32Array(32);
    }
    async initialize() {
      if(!navigator.gpu)throw new Error('This terrain demo requires WebGPU on localhost or HTTPS in a supported browser');
      const adapter=await navigator.gpu.requestAdapter();if(!adapter)throw new Error('No WebGPU adapter is available');
      const timestamp=adapter.features.has('timestamp-query');
      this.device=await adapter.requestDevice({requiredFeatures:timestamp?['timestamp-query']:[]});
      const device=this.device;
      device.addEventListener('uncapturederror',event=>{this.errors.push(event.error.message);console.error(event.error);});
      device.lost.then(info=>{if(!this.disposed)this.errors.push(`Device lost: ${info.message}`);});
      this.context=this.canvas.getContext('webgpu');this.format=navigator.gpu.getPreferredCanvasFormat();
      this.context.configure({device,format:this.format,alphaMode:'opaque'});
      this.stride=(this.options.maxDivs+1)**2;
      const bytesPerSlot=this.stride*32;
      const atlasLimit=Math.min(device.limits.maxStorageBufferBindingSize,device.limits.maxBufferSize,this.options.memoryMB*1024**2);
      this.capacity=Math.min(1024,Math.floor(atlasLimit/bytesPerSlot));
      if(this.capacity<16)throw new Error('GPU memory budget is too small for terrain patches');
      this.atlas=device.createBuffer({label:'Resident terrain samples',size:this.capacity*bytesPerSlot,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC});
      this.free=Array.from({length:this.capacity},(_,i)=>this.capacity-i-1);
      this.buildBudget=this.options.buildsPerFrame;
      this.buildParams=device.createBuffer({size:this.buildBudget*256,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.frameParams=device.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});
      this.instanceBuffer=device.createBuffer({size:this.capacity*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});
      const module=device.createShaderModule({label:'Terrain field, generation and render',code:shader});
      const compilation=await module.getCompilationInfo(),errors=compilation.messages.filter(m=>m.type==='error');
      if(errors.length)throw new Error(errors.map(m=>`${m.lineNum}: ${m.message}`).join('\n'));
      const buildLayout=device.createBindGroupLayout({entries:[
        {binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:'storage'}},
        {binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:'uniform',hasDynamicOffset:true,minBindingSize:32}}
      ]});
      this.compute=await device.createComputePipelineAsync({layout:device.createPipelineLayout({bindGroupLayouts:[buildLayout]}),compute:{module,entryPoint:'generate'}});
      this.buildGroup=device.createBindGroup({layout:buildLayout,entries:[{binding:0,resource:{buffer:this.atlas}},{binding:1,resource:{buffer:this.buildParams,size:32}}]});
      const renderLayout=device.createBindGroupLayout({entries:[
        {binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}},
        {binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:'read-only-storage'}},
        {binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:'uniform'}}
      ]});
      const pipelineLayout=device.createPipelineLayout({bindGroupLayouts:[renderLayout]});
      const descriptor={layout:pipelineLayout,vertex:{module,entryPoint:'vertex_main'},fragment:{module,entryPoint:'fragment_main',targets:[{format:this.format}]},depthStencil:{format:'depth24plus',depthWriteEnabled:true,depthCompare:'less'}};
      this.renderPipeline=await device.createRenderPipelineAsync({...descriptor,primitive:{topology:'triangle-list',cullMode:'back'}});
      this.linePipeline=await device.createRenderPipelineAsync({...descriptor,primitive:{topology:'line-list'}});
      this.renderGroup=device.createBindGroup({layout:renderLayout,entries:[{binding:0,resource:{buffer:this.atlas}},{binding:1,resource:{buffer:this.instanceBuffer}},{binding:2,resource:{buffer:this.frameParams}}]});
      this.stats.atlasBytes=this.capacity*bytesPerSlot;
      // Timing is asynchronous and sampled, never a render-loop queue wait.
      this.timers=[];
      if(timestamp)for(let i=0;i<3;i++)this.timers.push({busy:false,queries:device.createQuerySet({type:'timestamp',count:4}),resolve:device.createBuffer({size:32,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read:device.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})});
      this.frameIndex=0;this.resize();
      if(root.TerrainTrees)this.vegetation=await new root.TerrainTrees.Trees(this).initialize();
      return this;
    }
    resize() {
      const ratio=Math.min(window.devicePixelRatio||1,1.5),w=Math.max(1,Math.round(this.canvas.clientWidth*ratio)),h=Math.max(1,Math.round(this.canvas.clientHeight*ratio));
      if(this.canvas.width===w&&this.canvas.height===h&&this.depth)return;
      this.canvas.width=w;this.canvas.height=h;this.depth?.destroy();
      this.depth=this.device.createTexture({size:[w,h],format:'depth24plus',usage:GPUTextureUsage.RENDER_ATTACHMENT});
      this.needsSelection=true;
    }
    configure(values) {Object.assign(this.settings,values);this.previous.clear();this.needsSelection=true;}
    updateWindow(camera) {
      const next=this.settings.infinite?LOD.windowOffset(camera.position,this.options.worldSize,this.options.tileSize):[0,0];
      const dx=next[0]-this.origin[0],dz=next[1]-this.origin[1];
      if(!dx&&!dz)return;
      const shiftX=dx/this.options.tileSize,shiftZ=dz/this.options.tileSize;
      LOD.moveTiles(this.tiles,dx,dz);
      this.entries=LOD.shiftTileMap(this.entries,this.side,shiftX,shiftZ,entry=>{this.free.push(entry.slot);this.stats.evicted++;});
      for(const [id,entry]of this.entries)entry.id=id;
      this.previous=LOD.shiftTileMap(this.previous,this.side,shiftX,shiftZ);
      this.selected.clear();this.visibleIds=[];this.lastActual=new Map();
      this.origin=next;this.needsSelection=true;this.stats.windowShifts++;
    }
    select(camera,planes,now) {
      const start=performance.now();const cull=PLOC.query(this.tree,LOD.relativePlanes(planes,this.origin));
      cull.ids=cull.ids.filter(id=>LOD.distanceTo(this.tiles[id],camera.position)<=camera.far);
      // Camera/player footprint keeps nearby geometry resident when looking away.
      const keep=new Set(cull.ids);
      const px=Math.floor((camera.player[0]-this.origin[0]+this.options.worldSize/2)/this.options.tileSize),pz=Math.floor((camera.player[2]-this.origin[1]+this.options.worldSize/2)/this.options.tileSize);
      for(let z=pz-2;z<=pz+2;z++)for(let x=px-2;x<=px+2;x++)if(x>=0&&z>=0&&x<this.side&&z<this.side)keep.add(z*this.side+x);
      let ids=Array.from(keep);
      this.stats.capacityLimited=ids.length>this.capacity;
      if(ids.length>this.capacity)ids.sort((a,b)=>LOD.distanceTo(this.tiles[a],camera.position)-LOD.distanceTo(this.tiles[b],camera.position));
      ids=ids.slice(0,this.capacity);
      const selection=LOD.select(this.tiles,ids,this.side,camera,this.settings,this.previous);
      this.visibleIds=cull.ids.filter(id=>selection.levels.has(id));this.selected=selection.levels;this.previous=new Map(selection.levels);
      this.stats.selectionMs=performance.now()-start;this.stats.visited=cull.visited;this.stats.visible=cull.ids.length;this.stats.requested=ids.length;
      this.lastSelect=now;this.needsSelection=false;this.drawPlan=null;
    }
    getTemplate(divs,mask) {
      const key=`${this.algorithm}:${divs}:${mask}`;if(this.templates.has(key))return this.templates.get(key);
      const indices=Surface.buildIndices(divs,mask,this.algorithm),lines=Surface.lines(indices),device=this.device;
      function upload(data,label) {const b=device.createBuffer({size:data.byteLength,usage:GPUBufferUsage.INDEX,mappedAtCreation:true,label});new Uint32Array(b.getMappedRange()).set(data);b.unmap();return b;}
      const template={triangles:indices.length/3,indexCount:indices.length,lineCount:lines.length,index:upload(indices,'Terrain topology'),line:upload(lines,'Terrain wire topology')};
      this.templates.set(key,template);return template;
    }
    allocate(id,keep,now) {
      if(!this.free.length) {
        let victim=null;
        for(const e of this.entries.values())if(!keep.has(e.id)&&(!victim||e.touched<victim.touched))victim=e;
        if(!victim)return null;
        this.entries.delete(victim.id);this.free.push(victim.slot);this.stats.evicted++;
      }
      const entry={id,slot:this.free.pop(),lod:this.levels-1,touched:now,ready:false,generation:this.generation};this.entries.set(id,entry);return entry;
    }
    planBuilds(camera,now) {
      if(this.stats.pending===0&&this.drawPlan&&this.planGeneration===this.generation)return [];
      const keep=new Set(this.selected.keys()),missing=[],updates=[];
      for(const [id,lod]of this.selected) {
        const e=this.entries.get(id),distance=LOD.distanceTo(this.tiles[id],camera.position);
        if(e)e.touched=now;
        if(!e||!e.ready||e.generation!==this.generation)missing.push({id,lod:this.levels-1,distance});
        else if(e.lod>lod)updates.push({id,lod,distance,refine:true});
        else this.stats.cacheHits++;
      }
      missing.sort((a,b)=>a.distance-b.distance);
      // Establish inexpensive full coverage first, then refine nearby patches.
      updates.sort((a,b)=>Number(b.refine)-Number(a.refine)||a.distance-b.distance);
      const planned=[];
      for(const request of missing.concat(updates)) {
        if(planned.length>=this.buildBudget)break;
        const entry=this.entries.get(request.id)||this.allocate(request.id,keep,now);if(!entry)continue;
        planned.push({entry,lod:request.lod});
      }
      this.stats.pending=missing.length+updates.length-planned.length;
      return planned;
    }
    viewChanged(camera,planes) {
      let at=0,changed=false;
      const compare=value=>{if(this.viewState[at]!==value)changed=true;this.viewState[at++]=value;};
      camera.position.forEach(compare);camera.player.forEach(compare);[camera.height,camera.fov,camera.far].forEach(compare);
      for(const p of planes)p.forEach(compare);
      return changed;
    }
    prepareDrawPlan() {
      const actual=new Map();
      for(const [id,target]of this.selected) {const entry=this.entries.get(id);if(entry?.ready&&entry.generation===this.generation)actual.set(id,Math.max(target,entry.lod));}
      LOD.balance(actual,this.side,'coarsen');const masks=LOD.seams(actual,this.side),buckets=new Map();
      const histogram=new Array(this.levels).fill(0);let triangles=0,samples=0,seamCount=0;
      for(const id of this.visibleIds) {
        const level=actual.get(id);if(level===undefined)continue;
        const entry=this.entries.get(id),divs=this.options.maxDivs>>level,mask=masks.get(id),key=`${divs}:${mask}`;
        if(!buckets.has(key))buckets.set(key,{divs,mask,entries:[]});buckets.get(key).entries.push({entry,level});
        histogram[level]++;samples+=(divs+1)**2;if(mask)seamCount++;
      }
      const records=new Uint32Array(this.capacity*4),draws=[];let instance=0;
      for(const bucket of buckets.values()) {
        const template=this.getTemplate(bucket.divs,bucket.mask),base=instance;
        for(const {entry,level}of bucket.entries) {records.set([entry.slot,this.options.maxDivs>>entry.lod,bucket.divs,level],instance*4);instance++;}
        draws.push({template,base,count:bucket.entries.length});triangles+=template.triangles*bucket.entries.length;
      }
      if(instance)this.device.queue.writeBuffer(this.instanceBuffer,0,records,0,instance*4);
      Object.assign(this.stats,{triangles,drawCalls:draws.length,drawn:instance,histogram,seams:seamCount,activeSamples:samples,uniformSamples:instance*(this.options.maxDivs+1)**2});
      this.lastActual=actual;this.drawPlan=draws;this.planAlgorithm=this.algorithm;this.planGeneration=this.generation;
      this.stats.planBuilds=(this.stats.planBuilds||0)+1;
    }
    render(camera,planes,now,{lodColors=false,wireframe=false}={}) {
      const cpuStart=performance.now();this.resize();this.updateWindow(camera);
      if(this.needsSelection||(now-this.lastSelect>=100&&this.viewChanged(camera,planes))){this.select(camera,planes,now);this.viewChanged(camera,planes);}
      const builds=this.planBuilds(camera,now),device=this.device,encoder=device.createCommandEncoder({label:'Adaptive terrain frame'});
      const timer=this.frameIndex++%20===0?this.timers.find(t=>!t.busy):null;
      if(timer)timer.busy=true;
      if(builds.length) {
        const uniforms=new ArrayBuffer(builds.length*256),f32=new Float32Array(uniforms),u32=new Uint32Array(uniforms);
        builds.forEach(({entry,lod},i)=>{
          const tile=this.tiles[entry.id],o=i*64,divs=this.options.maxDivs>>lod;
          f32[o]=tile.ox;f32[o+1]=tile.oz;f32[o+2]=tile.size;u32[o+3]=divs;u32[o+4]=entry.slot;u32[o+5]=this.stride;u32[o+6]=this.seed;
          entry.lod=lod;entry.ready=true;entry.generation=this.generation;this.stats.generated++;this.stats.samples+=(divs+1)**2;
        });
        device.queue.writeBuffer(this.buildParams,0,uniforms);
        const pass=encoder.beginComputePass(timer?{timestampWrites:{querySet:timer.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});
        pass.setPipeline(this.compute);
        builds.forEach(({entry},i)=>{const divs=this.options.maxDivs>>entry.lod;pass.setBindGroup(0,this.buildGroup,[i*256]);pass.dispatchWorkgroups(Math.ceil((divs+1)/8),Math.ceil((divs+1)/8));});pass.end();
      }
      if(!this.drawPlan||builds.length||this.planAlgorithm!==this.algorithm)this.prepareDrawPlan();
      this.vegetation?.prepare(camera,planes,now);
      const frame=this.frameData;frame.set(camera.viewProjection,0);frame.set([...camera.position,1],16);frame.set([.5,.85,.35,0],20);
      frame.set([this.stride,Number(lodColors),Number(wireframe),camera.far],28);device.queue.writeBuffer(this.frameParams,0,frame);
      const descriptor={colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.71,g:.78,b:.82,a:1},loadOp:'clear',storeOp:'store'}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:'clear',depthStoreOp:'discard'}};
      if(timer)descriptor.timestampWrites={querySet:timer.queries,beginningOfPassWriteIndex:2,endOfPassWriteIndex:3};
      const pass=encoder.beginRenderPass(descriptor);pass.setPipeline(wireframe?this.linePipeline:this.renderPipeline);pass.setBindGroup(0,this.renderGroup);
      for(const draw of this.drawPlan) {pass.setIndexBuffer(wireframe?draw.template.line:draw.template.index,'uint32');pass.drawIndexed(wireframe?draw.template.lineCount:draw.template.indexCount,draw.count,0,0,draw.base);}
      this.vegetation?.render(pass);pass.end();
      if(timer) {
        // Queries 0/1 are unwritten in frames without generation; resolve only 2/3.
        const first=builds.length?0:2,count=builds.length?4:2;
        encoder.resolveQuerySet(timer.queries,first,count,timer.resolve,0);encoder.copyBufferToBuffer(timer.resolve,0,timer.read,0,count*8);
      }
      device.queue.submit([encoder.finish()]);
      if(timer)timer.read.mapAsync(GPUMapMode.READ).then(()=>{
        const stamps=new BigUint64Array(timer.read.getMappedRange());
        const generate=builds.length?Number(stamps[1]-stamps[0])/1e6:0,render=builds.length?Number(stamps[3]-stamps[2])/1e6:Number(stamps[1]-stamps[0])/1e6;
        this.stats.gpuMs=render;this.stats.generationGpuMs=generate;timer.read.unmap();timer.busy=false;
      }).catch(error=>{timer.busy=false;if(!this.disposed)this.errors.push(error.message);});
      this.stats.cpuMs=performance.now()-cpuStart;this.stats.resident=this.entries.size;this.stats.builtThisFrame=builds.length;
      this.stats.vegetation=this.vegetation?.stats;
      return this.stats;
    }
    // Explicit diagnostics for tests; production rendering never calls this.
    async readPatch(id) {
      const entry=this.entries.get(id);if(!entry?.ready)throw new Error('Patch is not ready');
      const divs=this.options.maxDivs>>entry.lod,count=(divs+1)**2;
      const read=this.device.createBuffer({size:count*32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});
      try {const e=this.device.createCommandEncoder();e.copyBufferToBuffer(this.atlas,entry.slot*this.stride*32,read,0,count*32);this.device.queue.submit([e.finish()]);await read.mapAsync(GPUMapMode.READ);const data=new Float32Array(read.getMappedRange()).slice();read.unmap();return {data,divs};}
      finally {read.destroy();}
    }
    dispose() {
      if(this.disposed)return;this.disposed=true;
      this.vegetation?.dispose();
      for(const t of this.templates.values()){t.index.destroy();t.line.destroy();}
      for(const t of this.timers||[]){t.queries.destroy();t.resolve.destroy();t.read.destroy();}
      for(const b of [this.atlas,this.buildParams,this.frameParams,this.instanceBuffer])b?.destroy();
      this.depth?.destroy();this.context?.unconfigure();this.device?.destroy();
    }
  }
  root.AdaptiveTerrain={Renderer,shader};
})(typeof globalThis!=='undefined'?globalThis:this);
