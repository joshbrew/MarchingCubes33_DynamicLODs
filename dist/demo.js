var ud=Object.defineProperty;var Te=(r,e,t)=>()=>{if(t)throw t[0];try{return r&&(e=r(r=0)),e}catch(n){throw t=[n],n}};var pr=(r,e)=>{for(var t in e)ud(r,t,{get:e[t],enumerable:!0})};function Ct(){let r=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(et[r&255]+et[r>>8&255]+et[r>>16&255]+et[r>>24&255]+"-"+et[e&255]+et[e>>8&255]+"-"+et[e>>16&15|64]+et[e>>24&255]+"-"+et[t&63|128]+et[t>>8&255]+"-"+et[t>>16&255]+et[t>>24&255]+et[n&255]+et[n>>8&255]+et[n>>16&255]+et[n>>24&255]).toUpperCase()}function dt(r,e,t){return Math.max(e,Math.min(t,r))}function Xf(r,e){return(r%e+e)%e}function Xs(r,e,t){return(1-t)*r+t*e}function el(r){return(r&r-1)===0&&r!==0}function Yf(r){return Math.pow(2,Math.ceil(Math.log(r)/Math.LN2))}function $f(r){return Math.pow(2,Math.floor(Math.log(r)/Math.LN2))}function Ys(r){return typeof HTMLImageElement<"u"&&r instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&r instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&r instanceof ImageBitmap?un.getDataURL(r):r.data?{data:Array.prototype.slice.call(r.data),width:r.width,height:r.height,type:r.data.constructor.name}:(console.warn("THREE.Texture: Unable to serialize Texture."),{})}function Js(r,e,t,n,i){for(let s=0,a=r.length-3;s<=a;s+=3){_n.fromArray(r,s);let o=i.x*Math.abs(_n.x)+i.y*Math.abs(_n.y)+i.z*Math.abs(_n.z),c=e.dot(_n),l=t.dot(_n),u=n.dot(_n);if(Math.max(-Math.max(c,l,u),Math.min(c,l,u))>o)return!1}return!0}function Ke(){Object.defineProperty(this,"id",{value:sp++}),this.uuid=Ct(),this.name="",this.type="Material",this.fog=!0,this.blending=zi,this.side=Ms,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.blendSrc=Kl,this.blendDst=eu,this.blendEquation=$n,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.depthFunc=Sa,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=qf,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ws,this.stencilZFail=Ws,this.stencilZPass=Ws,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaTest=0,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0}function oa(r,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?r+(e-r)*6*t:t<1/2?e:t<2/3?r+(e-r)*6*(2/3-t):r}function ca(r){return r<.04045?r*.0773993808:Math.pow(r*.9478672986+.0521327014,2.4)}function la(r){return r<.0031308?r*12.92:1.055*Math.pow(r,.41666)-.055}function lu(r){if(r.length===0)return-1/0;let e=r[0];for(let t=1,n=r.length;t<n;++t)r[t]>e&&(e=r[t]);return e}function op(r,e,t,n,i,s,a,o){let c;if(e.side===Qe?c=n.intersectTriangle(a,s,i,!0,o):c=n.intersectTriangle(i,s,a,e.side!==hi,o),c===null)return null;Pr.copy(o),Pr.applyMatrix4(r.matrixWorld);let l=t.ray.origin.distanceTo(Pr);return l<t.near||l>t.far?null:{distance:l,point:Pr.clone(),object:r}}function Cr(r,e,t,n,i,s,a,o,c,l,u,h){nn.fromBufferAttribute(i,l),rn.fromBufferAttribute(i,u),sn.fromBufferAttribute(i,h);let d=r.morphTargetInfluences;if(e.morphTargets&&s&&d){Mr.set(0,0,0),Sr.set(0,0,0),Er.set(0,0,0);for(let p=0,g=s.length;p<g;p++){let v=d[p],x=s[p];v!==0&&(da.fromBufferAttribute(x,l),fa.fromBufferAttribute(x,u),pa.fromBufferAttribute(x,h),a?(Mr.addScaledVector(da,v),Sr.addScaledVector(fa,v),Er.addScaledVector(pa,v)):(Mr.addScaledVector(da.sub(nn),v),Sr.addScaledVector(fa.sub(rn),v),Er.addScaledVector(pa.sub(sn),v)))}nn.add(Mr),rn.add(Sr),sn.add(Er)}r.isSkinnedMesh&&e.skinning&&(r.boneTransform(l,nn),r.boneTransform(u,rn),r.boneTransform(h,sn));let f=op(r,e,t,n,nn,rn,sn,ma);if(f){o&&(Tr.fromBufferAttribute(o,l),Ar.fromBufferAttribute(o,u),Lr.fromBufferAttribute(o,h),f.uv=it.getUV(ma,nn,rn,sn,Tr,Ar,Lr,new K)),c&&(Tr.fromBufferAttribute(c,l),Ar.fromBufferAttribute(c,u),Lr.fromBufferAttribute(c,h),f.uv2=it.getUV(ma,nn,rn,sn,Tr,Ar,Lr,new K));let p={a:l,b:u,c:h,normal:new E,materialIndex:0};it.getNormal(nn,rn,sn,p.normal),f.face=p}return f}function ei(r){let e={};for(let t in r){e[t]={};for(let n in r[t]){let i=r[t][n];i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)?e[t][n]=i.clone():Array.isArray(i)?e[t][n]=i.slice():e[t][n]=i}}return e}function nt(r){let e={};for(let t=0;t<r.length;t++){let n=ei(r[t]);for(let i in n)e[i]=n[i]}return e}function uu(){let r=null,e=!1,t=null,n=null;function i(s,a){t(s,a),n=r.requestAnimationFrame(i)}return{start:function(){e!==!0&&t!==null&&(n=r.requestAnimationFrame(i),e=!0)},stop:function(){r.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(s){t=s},setContext:function(s){r=s}}}function hp(r,e){let t=e.isWebGL2,n=new WeakMap;function i(l,u){let h=l.array,d=l.usage,f=r.createBuffer();r.bindBuffer(u,f),r.bufferData(u,h,d),l.onUploadCallback();let p=5126;return h instanceof Float32Array?p=5126:h instanceof Float64Array?console.warn("THREE.WebGLAttributes: Unsupported data buffer format: Float64Array."):h instanceof Uint16Array?l.isFloat16BufferAttribute?t?p=5131:console.warn("THREE.WebGLAttributes: Usage of Float16BufferAttribute requires WebGL2."):p=5123:h instanceof Int16Array?p=5122:h instanceof Uint32Array?p=5125:h instanceof Int32Array?p=5124:h instanceof Int8Array?p=5120:h instanceof Uint8Array&&(p=5121),{buffer:f,type:p,bytesPerElement:h.BYTES_PER_ELEMENT,version:l.version}}function s(l,u,h){let d=u.array,f=u.updateRange;r.bindBuffer(h,l),f.count===-1?r.bufferSubData(h,0,d):(t?r.bufferSubData(h,f.offset*d.BYTES_PER_ELEMENT,d,f.offset,f.count):r.bufferSubData(h,f.offset*d.BYTES_PER_ELEMENT,d.subarray(f.offset,f.offset+f.count)),f.count=-1)}function a(l){return l.isInterleavedBufferAttribute&&(l=l.data),n.get(l)}function o(l){l.isInterleavedBufferAttribute&&(l=l.data);let u=n.get(l);u&&(r.deleteBuffer(u.buffer),n.delete(l))}function c(l,u){if(l.isGLBufferAttribute){let d=n.get(l);(!d||d.version<l.version)&&n.set(l,{buffer:l.buffer,type:l.type,bytesPerElement:l.elementSize,version:l.version});return}l.isInterleavedBufferAttribute&&(l=l.data);let h=n.get(l);h===void 0?n.set(l,i(l,u)):h.version<l.version&&(s(h.buffer,l,u),h.version=l.version)}return{get:a,remove:o,update:c}}function D0(r,e,t,n,i){let s=new he(0),a=0,o,c,l=null,u=0,h=null;function d(p,g,v,x){let m=g.isScene===!0?g.background:null;m&&m.isTexture&&(m=e.get(m));let b=r.xr,_=b.getSession&&b.getSession();_&&_.environmentBlendMode==="additive"&&(m=null),m===null?f(s,a):m&&m.isColor&&(f(m,1),x=!0),(r.autoClear||x)&&r.clear(r.autoClearColor,r.autoClearDepth,r.autoClearStencil),m&&(m.isCubeTexture||m.mapping===Vo)?(c===void 0&&(c=new lt(new Wi(1,1,1),new jt({name:"BackgroundCubeMaterial",uniforms:ei(zt.cube.uniforms),vertexShader:zt.cube.vertexShader,fragmentShader:zt.cube.fragmentShader,side:Qe,depthTest:!1,depthWrite:!1,fog:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(w,y,P){this.matrixWorld.copyPosition(P.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=m,c.material.uniforms.flipEnvMap.value=m.isCubeTexture&&m._needsFlipEnvMap?-1:1,(l!==m||u!==m.version||h!==r.toneMapping)&&(c.material.needsUpdate=!0,l=m,u=m.version,h=r.toneMapping),p.unshift(c,c.geometry,c.material,0,0,null)):m&&m.isTexture&&(o===void 0&&(o=new lt(new Ra(2,2),new jt({name:"BackgroundMaterial",uniforms:ei(zt.background.uniforms),vertexShader:zt.background.vertexShader,fragmentShader:zt.background.fragmentShader,side:Ms,depthTest:!1,depthWrite:!1,fog:!1})),o.geometry.deleteAttribute("normal"),Object.defineProperty(o.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(o)),o.material.uniforms.t2D.value=m,m.matrixAutoUpdate===!0&&m.updateMatrix(),o.material.uniforms.uvTransform.value.copy(m.matrix),(l!==m||u!==m.version||h!==r.toneMapping)&&(o.material.needsUpdate=!0,l=m,u=m.version,h=r.toneMapping),p.unshift(o,o.geometry,o.material,0,0,null))}function f(p,g){t.buffers.color.setClear(p.r,p.g,p.b,g,i)}return{getClearColor:function(){return s},setClearColor:function(p,g=1){s.set(p),a=g,f(s,a)},getClearAlpha:function(){return a},setClearAlpha:function(p){a=p,f(s,a)},render:d}}function z0(r,e,t,n){let i=r.getParameter(34921),s=n.isWebGL2?null:e.get("OES_vertex_array_object"),a=n.isWebGL2||s!==null,o={},c=g(null),l=c;function u(L,D,z,T,I){let Z=!1;if(a){let $=p(T,z,D);l!==$&&(l=$,d(l.object)),Z=v(T,I),Z&&x(T,I)}else{let $=D.wireframe===!0;(l.geometry!==T.id||l.program!==z.id||l.wireframe!==$)&&(l.geometry=T.id,l.program=z.id,l.wireframe=$,Z=!0)}L.isInstancedMesh===!0&&(Z=!0),I!==null&&t.update(I,34963),Z&&(P(L,D,z,T),I!==null&&r.bindBuffer(34963,t.get(I).buffer))}function h(){return n.isWebGL2?r.createVertexArray():s.createVertexArrayOES()}function d(L){return n.isWebGL2?r.bindVertexArray(L):s.bindVertexArrayOES(L)}function f(L){return n.isWebGL2?r.deleteVertexArray(L):s.deleteVertexArrayOES(L)}function p(L,D,z){let T=z.wireframe===!0,I=o[L.id];I===void 0&&(I={},o[L.id]=I);let Z=I[D.id];Z===void 0&&(Z={},I[D.id]=Z);let $=Z[T];return $===void 0&&($=g(h()),Z[T]=$),$}function g(L){let D=[],z=[],T=[];for(let I=0;I<i;I++)D[I]=0,z[I]=0,T[I]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:z,attributeDivisors:T,object:L,attributes:{},index:null}}function v(L,D){let z=l.attributes,T=L.attributes,I=0;for(let Z in T){let $=z[Z],U=T[Z];if($===void 0||$.attribute!==U||$.data!==U.data)return!0;I++}return l.attributesNum!==I||l.index!==D}function x(L,D){let z={},T=L.attributes,I=0;for(let Z in T){let $=T[Z],U={};U.attribute=$,$.data&&(U.data=$.data),z[Z]=U,I++}l.attributes=z,l.attributesNum=I,l.index=D}function m(){let L=l.newAttributes;for(let D=0,z=L.length;D<z;D++)L[D]=0}function b(L){_(L,0)}function _(L,D){let z=l.newAttributes,T=l.enabledAttributes,I=l.attributeDivisors;z[L]=1,T[L]===0&&(r.enableVertexAttribArray(L),T[L]=1),I[L]!==D&&((n.isWebGL2?r:e.get("ANGLE_instanced_arrays"))[n.isWebGL2?"vertexAttribDivisor":"vertexAttribDivisorANGLE"](L,D),I[L]=D)}function w(){let L=l.newAttributes,D=l.enabledAttributes;for(let z=0,T=D.length;z<T;z++)D[z]!==L[z]&&(r.disableVertexAttribArray(z),D[z]=0)}function y(L,D,z,T,I,Z){n.isWebGL2===!0&&(z===5124||z===5125)?r.vertexAttribIPointer(L,D,z,I,Z):r.vertexAttribPointer(L,D,z,T,I,Z)}function P(L,D,z,T){if(n.isWebGL2===!1&&(L.isInstancedMesh||T.isInstancedBufferGeometry)&&e.get("ANGLE_instanced_arrays")===null)return;m();let I=T.attributes,Z=z.getAttributes(),$=D.defaultAttributeValues;for(let U in Z){let W=Z[U];if(W>=0){let G=I[U];if(G!==void 0){let q=G.normalized,O=G.itemSize,de=t.get(G);if(de===void 0)continue;let fe=de.buffer,ee=de.type,le=de.bytesPerElement;if(G.isInterleavedBufferAttribute){let ge=G.data,Me=ge.stride,ve=G.offset;ge&&ge.isInstancedInterleavedBuffer?(_(W,ge.meshPerAttribute),T._maxInstanceCount===void 0&&(T._maxInstanceCount=ge.meshPerAttribute*ge.count)):b(W),r.bindBuffer(34962,fe),y(W,O,ee,q,Me*le,ve*le)}else G.isInstancedBufferAttribute?(_(W,G.meshPerAttribute),T._maxInstanceCount===void 0&&(T._maxInstanceCount=G.meshPerAttribute*G.count)):b(W),r.bindBuffer(34962,fe),y(W,O,ee,q,0,0)}else if(U==="instanceMatrix"){let q=t.get(L.instanceMatrix);if(q===void 0)continue;let O=q.buffer,de=q.type;_(W+0,1),_(W+1,1),_(W+2,1),_(W+3,1),r.bindBuffer(34962,O),r.vertexAttribPointer(W+0,4,de,!1,64,0),r.vertexAttribPointer(W+1,4,de,!1,64,16),r.vertexAttribPointer(W+2,4,de,!1,64,32),r.vertexAttribPointer(W+3,4,de,!1,64,48)}else if(U==="instanceColor"){let q=t.get(L.instanceColor);if(q===void 0)continue;let O=q.buffer,de=q.type;_(W,1),r.bindBuffer(34962,O),r.vertexAttribPointer(W,3,de,!1,12,0)}else if($!==void 0){let q=$[U];if(q!==void 0)switch(q.length){case 2:r.vertexAttrib2fv(W,q);break;case 3:r.vertexAttrib3fv(W,q);break;case 4:r.vertexAttrib4fv(W,q);break;default:r.vertexAttrib1fv(W,q)}}}}w()}function C(){H();for(let L in o){let D=o[L];for(let z in D){let T=D[z];for(let I in T)f(T[I].object),delete T[I];delete D[z]}delete o[L]}}function F(L){if(o[L.id]===void 0)return;let D=o[L.id];for(let z in D){let T=D[z];for(let I in T)f(T[I].object),delete T[I];delete D[z]}delete o[L.id]}function k(L){for(let D in o){let z=o[D];if(z[L.id]===void 0)continue;let T=z[L.id];for(let I in T)f(T[I].object),delete T[I];delete z[L.id]}}function H(){B(),l!==c&&(l=c,d(l.object))}function B(){c.geometry=null,c.program=null,c.wireframe=!1}return{setup:u,reset:H,resetDefaultState:B,dispose:C,releaseStatesOfGeometry:F,releaseStatesOfProgram:k,initAttributes:m,enableAttribute:b,disableUnusedAttributes:w}}function F0(r,e,t,n){let i=n.isWebGL2,s;function a(l){s=l}function o(l,u){r.drawArrays(s,l,u),t.update(u,s,1)}function c(l,u,h){if(h===0)return;let d,f;if(i)d=r,f="drawArraysInstanced";else if(d=e.get("ANGLE_instanced_arrays"),f="drawArraysInstancedANGLE",d===null){console.error("THREE.WebGLBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}d[f](s,l,u,h),t.update(u,s,h)}this.setMode=a,this.render=o,this.renderInstances=c}function B0(r,e,t){let n;function i(){if(n!==void 0)return n;if(e.has("EXT_texture_filter_anisotropic")===!0){let y=e.get("EXT_texture_filter_anisotropic");n=r.getParameter(y.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else n=0;return n}function s(y){if(y==="highp"){if(r.getShaderPrecisionFormat(35633,36338).precision>0&&r.getShaderPrecisionFormat(35632,36338).precision>0)return"highp";y="mediump"}return y==="mediump"&&r.getShaderPrecisionFormat(35633,36337).precision>0&&r.getShaderPrecisionFormat(35632,36337).precision>0?"mediump":"lowp"}let a=typeof WebGL2RenderingContext<"u"&&r instanceof WebGL2RenderingContext||typeof WebGL2ComputeRenderingContext<"u"&&r instanceof WebGL2ComputeRenderingContext,o=t.precision!==void 0?t.precision:"highp",c=s(o);c!==o&&(console.warn("THREE.WebGLRenderer:",o,"not supported, using",c,"instead."),o=c);let l=t.logarithmicDepthBuffer===!0,u=r.getParameter(34930),h=r.getParameter(35660),d=r.getParameter(3379),f=r.getParameter(34076),p=r.getParameter(34921),g=r.getParameter(36347),v=r.getParameter(36348),x=r.getParameter(36349),m=h>0,b=a||e.has("OES_texture_float"),_=m&&b,w=a?r.getParameter(36183):0;return{isWebGL2:a,getMaxAnisotropy:i,getMaxPrecision:s,precision:o,logarithmicDepthBuffer:l,maxTextures:u,maxVertexTextures:h,maxTextureSize:d,maxCubemapSize:f,maxAttributes:p,maxVertexUniforms:g,maxVaryings:v,maxFragmentUniforms:x,vertexTextures:m,floatFragmentTextures:b,floatVertexTextures:_,maxSamples:w}}function k0(r){let e=this,t=null,n=0,i=!1,s=!1,a=new gt,o=new Je,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(h,d,f){let p=h.length!==0||d||n!==0||i;return i=d,t=u(h,f,0),n=h.length,p},this.beginShadows=function(){s=!0,u(null)},this.endShadows=function(){s=!1,l()},this.setState=function(h,d,f){let p=h.clippingPlanes,g=h.clipIntersection,v=h.clipShadows,x=r.get(h);if(!i||p===null||p.length===0||s&&!v)s?u(null):l();else{let m=s?0:n,b=m*4,_=x.clippingState||null;c.value=_,_=u(p,d,b,f);for(let w=0;w!==b;++w)_[w]=t[w];x.clippingState=_,this.numIntersection=g?this.numPlanes:0,this.numPlanes+=m}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function u(h,d,f,p){let g=h!==null?h.length:0,v=null;if(g!==0){if(v=c.value,p!==!0||v===null){let x=f+g*4,m=d.matrixWorldInverse;o.getNormalMatrix(m),(v===null||v.length<x)&&(v=new Float32Array(x));for(let b=0,_=f;b!==g;++b,_+=4)a.copy(h[b]).applyMatrix4(m,o),a.normal.toArray(v,_),v[_+3]=a.constant}c.value=v,c.needsUpdate=!0}return e.numPlanes=g,e.numIntersection=0,v}}function N0(r){let e=new WeakMap;function t(a,o){return o===Uc?a.mapping=Go:o===Oc&&(a.mapping=Ho),a}function n(a){if(a&&a.isTexture){let o=a.mapping;if(o===Uc||o===Oc)if(e.has(a)){let c=e.get(a).texture;return t(c,a.mapping)}else{let c=a.image;if(c&&c.height>0){let l=r.getRenderTarget(),u=new ts(c.height/2);return u.fromEquirectangularTexture(r,a),e.set(a,u),r.setRenderTarget(l),a.addEventListener("dispose",i),t(u.texture,a.mapping)}else return null}}return a}function i(a){let o=a.target;o.removeEventListener("dispose",i);let c=e.get(o);c!==void 0&&(e.delete(o),c.dispose())}function s(){e=new WeakMap}return{get:n,dispose:s}}function U0(r){let e={};function t(n){if(e[n]!==void 0)return e[n];let i;switch(n){case"WEBGL_depth_texture":i=r.getExtension("WEBGL_depth_texture")||r.getExtension("MOZ_WEBGL_depth_texture")||r.getExtension("WEBKIT_WEBGL_depth_texture");break;case"EXT_texture_filter_anisotropic":i=r.getExtension("EXT_texture_filter_anisotropic")||r.getExtension("MOZ_EXT_texture_filter_anisotropic")||r.getExtension("WEBKIT_EXT_texture_filter_anisotropic");break;case"WEBGL_compressed_texture_s3tc":i=r.getExtension("WEBGL_compressed_texture_s3tc")||r.getExtension("MOZ_WEBGL_compressed_texture_s3tc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_s3tc");break;case"WEBGL_compressed_texture_pvrtc":i=r.getExtension("WEBGL_compressed_texture_pvrtc")||r.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");break;default:i=r.getExtension(n)}return e[n]=i,i}return{has:function(n){return t(n)!==null},init:function(n){n.isWebGL2?t("EXT_color_buffer_float"):(t("WEBGL_depth_texture"),t("OES_texture_float"),t("OES_texture_half_float"),t("OES_texture_half_float_linear"),t("OES_standard_derivatives"),t("OES_element_index_uint"),t("OES_vertex_array_object"),t("ANGLE_instanced_arrays")),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float")},get:function(n){let i=t(n);return i===null&&console.warn("THREE.WebGLRenderer: "+n+" extension not supported."),i}}}function O0(r,e,t,n){let i={},s=new WeakMap;function a(h){let d=h.target;d.index!==null&&e.remove(d.index);for(let p in d.attributes)e.remove(d.attributes[p]);d.removeEventListener("dispose",a),delete i[d.id];let f=s.get(d);f&&(e.remove(f),s.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}function o(h,d){return i[d.id]===!0||(d.addEventListener("dispose",a),i[d.id]=!0,t.memory.geometries++),d}function c(h){let d=h.attributes;for(let p in d)e.update(d[p],34962);let f=h.morphAttributes;for(let p in f){let g=f[p];for(let v=0,x=g.length;v<x;v++)e.update(g[v],34962)}}function l(h){let d=[],f=h.index,p=h.attributes.position,g=0;if(f!==null){let m=f.array;g=f.version;for(let b=0,_=m.length;b<_;b+=3){let w=m[b+0],y=m[b+1],P=m[b+2];d.push(w,y,y,P,P,w)}}else{let m=p.array;g=p.version;for(let b=0,_=m.length/3-1;b<_;b+=3){let w=b+0,y=b+1,P=b+2;d.push(w,y,y,P,P,w)}}let v=new(lu(d)>65535?es:Kr)(d,1);v.version=g;let x=s.get(h);x&&e.remove(x),s.set(h,v)}function u(h){let d=s.get(h);if(d){let f=h.index;f!==null&&d.version<f.version&&l(h)}else l(h);return s.get(h)}return{get:o,update:c,getWireframeAttribute:u}}function G0(r,e,t,n){let i=n.isWebGL2,s;function a(d){s=d}let o,c;function l(d){o=d.type,c=d.bytesPerElement}function u(d,f){r.drawElements(s,f,o,d*c),t.update(f,s,1)}function h(d,f,p){if(p===0)return;let g,v;if(i)g=r,v="drawElementsInstanced";else if(g=e.get("ANGLE_instanced_arrays"),v="drawElementsInstancedANGLE",g===null){console.error("THREE.WebGLIndexedBufferRenderer: using THREE.InstancedBufferGeometry but hardware does not support extension ANGLE_instanced_arrays.");return}g[v](s,f,o,d*c,p),t.update(f,s,p)}this.setMode=a,this.setIndex=l,this.render=u,this.renderInstances=h}function H0(r){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(s,a,o){switch(t.calls++,a){case 4:t.triangles+=o*(s/3);break;case 1:t.lines+=o*(s/2);break;case 3:t.lines+=o*(s-1);break;case 2:t.lines+=o*s;break;case 0:t.points+=o*s;break;default:console.error("THREE.WebGLInfo: Unknown draw mode:",a);break}}function i(){t.frame++,t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:i,update:n}}function V0(r,e){return r[0]-e[0]}function W0(r,e){return Math.abs(e[1])-Math.abs(r[1])}function q0(r){let e={},t=new Float32Array(8),n=[];for(let s=0;s<8;s++)n[s]=[s,0];function i(s,a,o,c){let l=s.morphTargetInfluences,u=l===void 0?0:l.length,h=e[a.id];if(h===void 0){h=[];for(let v=0;v<u;v++)h[v]=[v,0];e[a.id]=h}for(let v=0;v<u;v++){let x=h[v];x[0]=v,x[1]=l[v]}h.sort(W0);for(let v=0;v<8;v++)v<u&&h[v][1]?(n[v][0]=h[v][0],n[v][1]=h[v][1]):(n[v][0]=Number.MAX_SAFE_INTEGER,n[v][1]=0);n.sort(V0);let d=o.morphTargets&&a.morphAttributes.position,f=o.morphNormals&&a.morphAttributes.normal,p=0;for(let v=0;v<8;v++){let x=n[v],m=x[0],b=x[1];m!==Number.MAX_SAFE_INTEGER&&b?(d&&a.getAttribute("morphTarget"+v)!==d[m]&&a.setAttribute("morphTarget"+v,d[m]),f&&a.getAttribute("morphNormal"+v)!==f[m]&&a.setAttribute("morphNormal"+v,f[m]),t[v]=b,p+=b):(d&&a.hasAttribute("morphTarget"+v)===!0&&a.deleteAttribute("morphTarget"+v),f&&a.hasAttribute("morphNormal"+v)===!0&&a.deleteAttribute("morphNormal"+v),t[v]=0)}let g=a.morphTargetsRelative?1:1-p;c.getUniforms().setValue(r,"morphTargetBaseInfluence",g),c.getUniforms().setValue(r,"morphTargetInfluences",t)}return{update:i}}function X0(r,e,t,n){let i=new WeakMap;function s(c){let l=n.render.frame,u=c.geometry,h=e.get(c,u);return i.get(h)!==l&&(e.update(h),i.set(h,l)),c.isInstancedMesh&&(c.hasEventListener("dispose",o)===!1&&c.addEventListener("dispose",o),t.update(c.instanceMatrix,34962),c.instanceColor!==null&&t.update(c.instanceColor,34962)),h}function a(){i=new WeakMap}function o(c){let l=c.target;l.removeEventListener("dispose",o),t.remove(l.instanceMatrix),l.instanceColor!==null&&t.remove(l.instanceColor)}return{update:s,dispose:a}}function pi(r,e,t){let n=r[0];if(n<=0||n>0)return r;let i=e*t,s=dl[i];if(s===void 0&&(s=new Float32Array(i),dl[i]=s),e!==0){n.toArray(s,0);for(let a=1,o=0;a!==e;++a)o+=t,r[a].toArray(s,o)}return s}function ut(r,e){if(r.length!==e.length)return!1;for(let t=0,n=r.length;t<n;t++)if(r[t]!==e[t])return!1;return!0}function st(r,e){for(let t=0,n=e.length;t<n;t++)r[t]=e[t]}function fu(r,e){let t=fl[e];t===void 0&&(t=new Int32Array(e),fl[e]=t);for(let n=0;n!==e;++n)t[n]=r.allocateTextureUnit();return t}function Z0(r,e){let t=this.cache;t[0]!==e&&(r.uniform1f(this.addr,e),t[0]=e)}function J0(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(r.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(ut(t,e))return;r.uniform2fv(this.addr,e),st(t,e)}}function j0(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(r.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(r.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(ut(t,e))return;r.uniform3fv(this.addr,e),st(t,e)}}function Q0(r,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(r.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(ut(t,e))return;r.uniform4fv(this.addr,e),st(t,e)}}function K0(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;r.uniformMatrix2fv(this.addr,!1,e),st(t,e)}else{if(ut(t,n))return;xl.set(n),r.uniformMatrix2fv(this.addr,!1,xl),st(t,n)}}function em(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;r.uniformMatrix3fv(this.addr,!1,e),st(t,e)}else{if(ut(t,n))return;ml.set(n),r.uniformMatrix3fv(this.addr,!1,ml),st(t,n)}}function tm(r,e){let t=this.cache,n=e.elements;if(n===void 0){if(ut(t,e))return;r.uniformMatrix4fv(this.addr,!1,e),st(t,e)}else{if(ut(t,n))return;pl.set(n),r.uniformMatrix4fv(this.addr,!1,pl),st(t,n)}}function nm(r,e){let t=this.cache;t[0]!==e&&(r.uniform1i(this.addr,e),t[0]=e)}function im(r,e){let t=this.cache;ut(t,e)||(r.uniform2iv(this.addr,e),st(t,e))}function rm(r,e){let t=this.cache;ut(t,e)||(r.uniform3iv(this.addr,e),st(t,e))}function sm(r,e){let t=this.cache;ut(t,e)||(r.uniform4iv(this.addr,e),st(t,e))}function am(r,e){let t=this.cache;t[0]!==e&&(r.uniform1ui(this.addr,e),t[0]=e)}function om(r,e){let t=this.cache;ut(t,e)||(r.uniform2uiv(this.addr,e),st(t,e))}function cm(r,e){let t=this.cache;ut(t,e)||(r.uniform3uiv(this.addr,e),st(t,e))}function lm(r,e){let t=this.cache;ut(t,e)||(r.uniform4uiv(this.addr,e),st(t,e))}function um(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.safeSetTexture2D(e||hu,i)}function hm(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture3D(e||$0,i)}function dm(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.safeSetTextureCube(e||du,i)}function fm(r,e,t){let n=this.cache,i=t.allocateTextureUnit();n[0]!==i&&(r.uniform1i(this.addr,i),n[0]=i),t.setTexture2DArray(e||Y0,i)}function pm(r){switch(r){case 5126:return Z0;case 35664:return J0;case 35665:return j0;case 35666:return Q0;case 35674:return K0;case 35675:return em;case 35676:return tm;case 5124:case 35670:return nm;case 35667:case 35671:return im;case 35668:case 35672:return rm;case 35669:case 35673:return sm;case 5125:return am;case 36294:return om;case 36295:return cm;case 36296:return lm;case 35678:case 36198:case 36298:case 36306:case 35682:return um;case 35679:case 36299:case 36307:return hm;case 35680:case 36300:case 36308:case 36293:return dm;case 36289:case 36303:case 36311:case 36292:return fm}}function mm(r,e){r.uniform1fv(this.addr,e)}function xm(r,e){let t=pi(e,this.size,2);r.uniform2fv(this.addr,t)}function gm(r,e){let t=pi(e,this.size,3);r.uniform3fv(this.addr,t)}function vm(r,e){let t=pi(e,this.size,4);r.uniform4fv(this.addr,t)}function ym(r,e){let t=pi(e,this.size,4);r.uniformMatrix2fv(this.addr,!1,t)}function bm(r,e){let t=pi(e,this.size,9);r.uniformMatrix3fv(this.addr,!1,t)}function _m(r,e){let t=pi(e,this.size,16);r.uniformMatrix4fv(this.addr,!1,t)}function wm(r,e){r.uniform1iv(this.addr,e)}function Mm(r,e){r.uniform2iv(this.addr,e)}function Sm(r,e){r.uniform3iv(this.addr,e)}function Em(r,e){r.uniform4iv(this.addr,e)}function Tm(r,e){r.uniform1uiv(this.addr,e)}function Am(r,e){r.uniform2uiv(this.addr,e)}function Lm(r,e){r.uniform3uiv(this.addr,e)}function Pm(r,e){r.uniform4uiv(this.addr,e)}function Cm(r,e,t){let n=e.length,i=fu(t,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)t.safeSetTexture2D(e[s]||hu,i[s])}function Rm(r,e,t){let n=e.length,i=fu(t,n);r.uniform1iv(this.addr,i);for(let s=0;s!==n;++s)t.safeSetTextureCube(e[s]||du,i[s])}function Im(r){switch(r){case 5126:return mm;case 35664:return xm;case 35665:return gm;case 35666:return vm;case 35674:return ym;case 35675:return bm;case 35676:return _m;case 5124:case 35670:return wm;case 35667:case 35671:return Mm;case 35668:case 35672:return Sm;case 35669:case 35673:return Em;case 5125:return Tm;case 36294:return Am;case 36295:return Lm;case 36296:return Pm;case 35678:case 36198:case 36298:case 36306:case 35682:return Cm;case 35680:case 36300:case 36308:case 36293:return Rm}}function Dm(r,e,t){this.id=r,this.addr=t,this.cache=[],this.setValue=pm(e.type)}function pu(r,e,t){this.id=r,this.addr=t,this.cache=[],this.size=e.size,this.setValue=Im(e.type)}function mu(r){this.id=r,this.seq=[],this.map={}}function gl(r,e){r.seq.push(e),r.map[e.id]=e}function zm(r,e,t){let n=r.name,i=n.length;for(xa.lastIndex=0;;){let s=xa.exec(n),a=xa.lastIndex,o=s[1],c=s[2]==="]",l=s[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===i){gl(t,l===void 0?new Dm(o,r,e):new pu(o,r,e));break}else{let h=t.map[o];h===void 0&&(h=new mu(o),gl(t,h)),t=h}}}function cn(r,e){this.seq=[],this.map={};let t=r.getProgramParameter(e,35718);for(let n=0;n<t;++n){let i=r.getActiveUniform(e,n),s=r.getUniformLocation(e,i.name);zm(i,s,this)}}function vl(r,e,t){let n=r.createShader(e);return r.shaderSource(n,t),r.compileShader(n),n}function Bm(r){let e=r.split(`
`);for(let t=0;t<e.length;t++)e[t]=t+1+": "+e[t];return e.join(`
`)}function xu(r){switch(r){case di:return["Linear","( value )"];case $o:return["sRGB","( value )"];case ru:return["RGBE","( value )"];case su:return["RGBM","( value, 7.0 )"];case au:return["RGBM","( value, 16.0 )"];case ou:return["RGBD","( value, 256.0 )"];case iu:return["Gamma","( value, float( GAMMA_FACTOR ) )"];case Gf:return["LogLuv","( value )"];default:return console.warn("THREE.WebGLProgram: Unsupported encoding:",r),["Linear","( value )"]}}function yl(r,e,t){let n=r.getShaderParameter(e,35713),i=r.getShaderInfoLog(e).trim();if(n&&i==="")return"";let s=r.getShaderSource(e);return"THREE.WebGLShader: gl.getShaderInfoLog() "+t+`
`+i+Bm(s)}function Ei(r,e){let t=xu(e);return"vec4 "+r+"( vec4 value ) { return "+t[0]+"ToLinear"+t[1]+"; }"}function km(r,e){let t=xu(e);return"vec4 "+r+"( vec4 value ) { return LinearTo"+t[0]+t[1]+"; }"}function Nm(r,e){let t;switch(e){case Ud:t="Linear";break;case Od:t="Reinhard";break;case Gd:t="OptimizedCineon";break;case Hd:t="ACESFilmic";break;case Vd:t="Custom";break;default:console.warn("THREE.WebGLProgram: Unsupported toneMapping:",e),t="Linear"}return"vec3 "+r+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}function Um(r){return[r.extensionDerivatives||r.envMapCubeUV||r.bumpMap||r.tangentSpaceNormalMap||r.clearcoatNormalMap||r.flatShading||r.shaderID==="physical"?"#extension GL_OES_standard_derivatives : enable":"",(r.extensionFragDepth||r.logarithmicDepthBuffer)&&r.rendererExtensionFragDepth?"#extension GL_EXT_frag_depth : enable":"",r.extensionDrawBuffers&&r.rendererExtensionDrawBuffers?"#extension GL_EXT_draw_buffers : require":"",(r.extensionShaderTextureLOD||r.envMap)&&r.rendererExtensionShaderTextureLod?"#extension GL_EXT_shader_texture_lod : enable":""].filter(Ii).join(`
`)}function Om(r){let e=[];for(let t in r){let n=r[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function Gm(r,e){let t={},n=r.getProgramParameter(e,35721);for(let i=0;i<n;i++){let a=r.getActiveAttrib(e,i).name;t[a]=r.getAttribLocation(e,a)}return t}function Ii(r){return r!==""}function bl(r,e){return r.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function _l(r,e){return r.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}function Ia(r){return r.replace(Hm,Vm)}function Vm(r,e){let t=Ae[e];if(t===void 0)throw new Error("Can not resolve #include <"+e+">");return Ia(t)}function wl(r){return r.replace(qm,gu).replace(Wm,Xm)}function Xm(r,e,t,n){return console.warn("WebGLProgram: #pragma unroll_loop shader syntax is deprecated. Please use #pragma unroll_loop_start syntax instead."),gu(r,e,t,n)}function gu(r,e,t,n){let i="";for(let s=parseInt(e);s<parseInt(t);s++)i+=n.replace(/\[\s*i\s*\]/g,"[ "+s+" ]").replace(/UNROLLED_LOOP_INDEX/g,s);return i}function Ml(r){let e="precision "+r.precision+` float;
precision `+r.precision+" int;";return r.precision==="highp"?e+=`
#define HIGH_PRECISION`:r.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:r.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}function Ym(r){let e="SHADOWMAP_TYPE_BASIC";return r.shadowMapType===jl?e="SHADOWMAP_TYPE_PCF":r.shadowMapType===gd?e="SHADOWMAP_TYPE_PCF_SOFT":r.shadowMapType===Ri&&(e="SHADOWMAP_TYPE_VSM"),e}function $m(r){let e="ENVMAP_TYPE_CUBE";if(r.envMap)switch(r.envMapMode){case Go:case Ho:e="ENVMAP_TYPE_CUBE";break;case Vo:case Wo:e="ENVMAP_TYPE_CUBE_UV";break}return e}function Zm(r){let e="ENVMAP_MODE_REFLECTION";if(r.envMap)switch(r.envMapMode){case Ho:case Wo:e="ENVMAP_MODE_REFRACTION";break}return e}function Jm(r){let e="ENVMAP_BLENDING_NONE";if(r.envMap)switch(r.combine){case Ss:e="ENVMAP_BLENDING_MULTIPLY";break;case kd:e="ENVMAP_BLENDING_MIX";break;case Nd:e="ENVMAP_BLENDING_ADD";break}return e}function jm(r,e,t,n){let i=r.getContext(),s=t.defines,a=t.vertexShader,o=t.fragmentShader,c=Ym(t),l=$m(t),u=Zm(t),h=Jm(t),d=r.gammaFactor>0?r.gammaFactor:1,f=t.isWebGL2?"":Um(t),p=Om(s),g=i.createProgram(),v,x,m=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(v=[p].filter(Ii).join(`
`),v.length>0&&(v+=`
`),x=[f,p].filter(Ii).join(`
`),x.length>0&&(x+=`
`)):(v=[Ml(t),"#define SHADER_NAME "+t.shaderName,p,t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.supportsVertexTextures?"#define VERTEX_TEXTURES":"","#define GAMMA_FACTOR "+d,"#define MAX_BONES "+t.maxBones,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.displacementMap&&t.supportsVertexTextures?"#define USE_DISPLACEMENTMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.useVertexTexture?"#define BONE_TEXTURE":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_MORPHTARGETS","	attribute vec3 morphTarget0;","	attribute vec3 morphTarget1;","	attribute vec3 morphTarget2;","	attribute vec3 morphTarget3;","	#ifdef USE_MORPHNORMALS","		attribute vec3 morphNormal0;","		attribute vec3 morphNormal1;","		attribute vec3 morphNormal2;","		attribute vec3 morphNormal3;","	#else","		attribute vec3 morphTarget4;","		attribute vec3 morphTarget5;","		attribute vec3 morphTarget6;","		attribute vec3 morphTarget7;","	#endif","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Ii).join(`
`),x=[f,Ml(t),"#define SHADER_NAME "+t.shaderName,p,t.alphaTest?"#define ALPHATEST "+t.alphaTest+(t.alphaTest%1?"":".0"):"","#define GAMMA_FACTOR "+d,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+u:"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMap&&t.objectSpaceNormalMap?"#define OBJECTSPACE_NORMALMAP":"",t.normalMap&&t.tangentSpaceNormalMap?"#define TANGENTSPACE_NORMALMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.sheen?"#define USE_SHEEN":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.vertexTangents?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUvs?"#define USE_UV":"",t.uvsVertexOnly?"#define UVS_VERTEX_ONLY":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.physicallyCorrectLights?"#define PHYSICALLY_CORRECT_LIGHTS":"",t.logarithmicDepthBuffer?"#define USE_LOGDEPTHBUF":"",t.logarithmicDepthBuffer&&t.rendererExtensionFragDepth?"#define USE_LOGDEPTHBUF_EXT":"",(t.extensionShaderTextureLOD||t.envMap)&&t.rendererExtensionShaderTextureLod?"#define TEXTURE_LOD_EXT":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Fi?"#define TONE_MAPPING":"",t.toneMapping!==Fi?Ae.tonemapping_pars_fragment:"",t.toneMapping!==Fi?Nm("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",Ae.encodings_pars_fragment,t.map?Ei("mapTexelToLinear",t.mapEncoding):"",t.matcap?Ei("matcapTexelToLinear",t.matcapEncoding):"",t.envMap?Ei("envMapTexelToLinear",t.envMapEncoding):"",t.emissiveMap?Ei("emissiveMapTexelToLinear",t.emissiveMapEncoding):"",t.lightMap?Ei("lightMapTexelToLinear",t.lightMapEncoding):"",km("linearToOutputTexel",t.outputEncoding),t.depthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Ii).join(`
`)),a=Ia(a),a=bl(a,t),a=_l(a,t),o=Ia(o),o=bl(o,t),o=_l(o,t),a=wl(a),o=wl(o),t.isWebGL2&&t.isRawShaderMaterial!==!0&&(m=`#version 300 es
`,v=["#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+v,x=["#define varying in",t.glslVersion===Kc?"":"out highp vec4 pc_fragColor;",t.glslVersion===Kc?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+x);let b=m+v+a,_=m+x+o,w=vl(i,35633,b),y=vl(i,35632,_);if(i.attachShader(g,w),i.attachShader(g,y),t.index0AttributeName!==void 0?i.bindAttribLocation(g,0,t.index0AttributeName):t.morphTargets===!0&&i.bindAttribLocation(g,0,"position"),i.linkProgram(g),r.debug.checkShaderErrors){let F=i.getProgramInfoLog(g).trim(),k=i.getShaderInfoLog(w).trim(),H=i.getShaderInfoLog(y).trim(),B=!0,L=!0;if(i.getProgramParameter(g,35714)===!1){B=!1;let D=yl(i,w,"vertex"),z=yl(i,y,"fragment");console.error("THREE.WebGLProgram: shader error: ",i.getError(),"35715",i.getProgramParameter(g,35715),"gl.getProgramInfoLog",F,D,z)}else F!==""?console.warn("THREE.WebGLProgram: gl.getProgramInfoLog()",F):(k===""||H==="")&&(L=!1);L&&(this.diagnostics={runnable:B,programLog:F,vertexShader:{log:k,prefix:v},fragmentShader:{log:H,prefix:x}})}i.deleteShader(w),i.deleteShader(y);let P;this.getUniforms=function(){return P===void 0&&(P=new cn(i,g)),P};let C;return this.getAttributes=function(){return C===void 0&&(C=Gm(i,g)),C},this.destroy=function(){n.releaseStatesOfProgram(this),i.deleteProgram(g),this.program=void 0},this.name=t.shaderName,this.id=Fm++,this.cacheKey=e,this.usedTimes=1,this.program=g,this.vertexShader=w,this.fragmentShader=y,this}function Qm(r,e,t,n,i,s){let a=[],o=n.isWebGL2,c=n.logarithmicDepthBuffer,l=n.floatVertexTextures,u=n.maxVertexUniforms,h=n.vertexTextures,d=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distanceRGBA",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"},p=["precision","isWebGL2","supportsVertexTextures","outputEncoding","instancing","instancingColor","map","mapEncoding","matcap","matcapEncoding","envMap","envMapMode","envMapEncoding","envMapCubeUV","lightMap","lightMapEncoding","aoMap","emissiveMap","emissiveMapEncoding","bumpMap","normalMap","objectSpaceNormalMap","tangentSpaceNormalMap","clearcoatMap","clearcoatRoughnessMap","clearcoatNormalMap","displacementMap","specularMap","roughnessMap","metalnessMap","gradientMap","alphaMap","combine","vertexColors","vertexAlphas","vertexTangents","vertexUvs","uvsVertexOnly","fog","useFog","fogExp2","flatShading","sizeAttenuation","logarithmicDepthBuffer","skinning","maxBones","useVertexTexture","morphTargets","morphNormals","premultipliedAlpha","numDirLights","numPointLights","numSpotLights","numHemiLights","numRectAreaLights","numDirLightShadows","numPointLightShadows","numSpotLightShadows","shadowMapEnabled","shadowMapType","toneMapping","physicallyCorrectLights","alphaTest","doubleSided","flipSided","numClippingPlanes","numClipIntersection","depthPacking","dithering","sheen","transmissionMap"];function g(y){let C=y.skeleton.bones;if(l)return 1024;{let k=Math.floor((u-20)/4),H=Math.min(k,C.length);return H<C.length?(console.warn("THREE.WebGLRenderer: Skeleton has "+C.length+" bones. This GPU supports "+H+"."),0):H}}function v(y){let P;return y&&y.isTexture?P=y.encoding:y&&y.isWebGLRenderTarget?(console.warn("THREE.WebGLPrograms.getTextureEncodingFromMap: don't use render targets as textures. Use their .texture property instead."),P=y.texture.encoding):P=di,P}function x(y,P,C,F,k){let H=F.fog,B=y.isMeshStandardMaterial?F.environment:null,L=e.get(y.envMap||B),D=f[y.type],z=k.isSkinnedMesh?g(k):0;y.precision!==null&&(d=n.getMaxPrecision(y.precision),d!==y.precision&&console.warn("THREE.WebGLProgram.getParameters:",y.precision,"not supported, using",d,"instead."));let T,I;if(D){let U=zt[D];T=U.vertexShader,I=U.fragmentShader}else T=y.vertexShader,I=y.fragmentShader;let Z=r.getRenderTarget();return{isWebGL2:o,shaderID:D,shaderName:y.type,vertexShader:T,fragmentShader:I,defines:y.defines,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:d,instancing:k.isInstancedMesh===!0,instancingColor:k.isInstancedMesh===!0&&k.instanceColor!==null,supportsVertexTextures:h,outputEncoding:Z!==null?v(Z.texture):r.outputEncoding,map:!!y.map,mapEncoding:v(y.map),matcap:!!y.matcap,matcapEncoding:v(y.matcap),envMap:!!L,envMapMode:L&&L.mapping,envMapEncoding:v(L),envMapCubeUV:!!L&&(L.mapping===Vo||L.mapping===Wo),lightMap:!!y.lightMap,lightMapEncoding:v(y.lightMap),aoMap:!!y.aoMap,emissiveMap:!!y.emissiveMap,emissiveMapEncoding:v(y.emissiveMap),bumpMap:!!y.bumpMap,normalMap:!!y.normalMap,objectSpaceNormalMap:y.normalMapType===Wf,tangentSpaceNormalMap:y.normalMapType===fi,clearcoatMap:!!y.clearcoatMap,clearcoatRoughnessMap:!!y.clearcoatRoughnessMap,clearcoatNormalMap:!!y.clearcoatNormalMap,displacementMap:!!y.displacementMap,roughnessMap:!!y.roughnessMap,metalnessMap:!!y.metalnessMap,specularMap:!!y.specularMap,alphaMap:!!y.alphaMap,gradientMap:!!y.gradientMap,sheen:!!y.sheen,transmissionMap:!!y.transmissionMap,combine:y.combine,vertexTangents:y.normalMap&&y.vertexTangents,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&k.geometry&&k.geometry.attributes.color&&k.geometry.attributes.color.itemSize===4,vertexUvs:!!y.map||!!y.bumpMap||!!y.normalMap||!!y.specularMap||!!y.alphaMap||!!y.emissiveMap||!!y.roughnessMap||!!y.metalnessMap||!!y.clearcoatMap||!!y.clearcoatRoughnessMap||!!y.clearcoatNormalMap||!!y.displacementMap||!!y.transmissionMap,uvsVertexOnly:!(y.map||y.bumpMap||y.normalMap||y.specularMap||y.alphaMap||y.emissiveMap||y.roughnessMap||y.metalnessMap||y.clearcoatNormalMap||y.transmissionMap)&&!!y.displacementMap,fog:!!H,useFog:y.fog,fogExp2:H&&H.isFogExp2,flatShading:!!y.flatShading,sizeAttenuation:y.sizeAttenuation,logarithmicDepthBuffer:c,skinning:y.skinning&&z>0,maxBones:z,useVertexTexture:l,morphTargets:y.morphTargets,morphNormals:y.morphNormals,numDirLights:P.directional.length,numPointLights:P.point.length,numSpotLights:P.spot.length,numRectAreaLights:P.rectArea.length,numHemiLights:P.hemi.length,numDirLightShadows:P.directionalShadowMap.length,numPointLightShadows:P.pointShadowMap.length,numSpotLightShadows:P.spotShadowMap.length,numClippingPlanes:s.numPlanes,numClipIntersection:s.numIntersection,dithering:y.dithering,shadowMapEnabled:r.shadowMap.enabled&&C.length>0,shadowMapType:r.shadowMap.type,toneMapping:y.toneMapped?r.toneMapping:Fi,physicallyCorrectLights:r.physicallyCorrectLights,premultipliedAlpha:y.premultipliedAlpha,alphaTest:y.alphaTest,doubleSided:y.side===hi,flipSided:y.side===Qe,depthPacking:y.depthPacking!==void 0?y.depthPacking:!1,index0AttributeName:y.index0AttributeName,extensionDerivatives:y.extensions&&y.extensions.derivatives,extensionFragDepth:y.extensions&&y.extensions.fragDepth,extensionDrawBuffers:y.extensions&&y.extensions.drawBuffers,extensionShaderTextureLOD:y.extensions&&y.extensions.shaderTextureLOD,rendererExtensionFragDepth:o||t.has("EXT_frag_depth"),rendererExtensionDrawBuffers:o||t.has("WEBGL_draw_buffers"),rendererExtensionShaderTextureLod:o||t.has("EXT_shader_texture_lod"),customProgramCacheKey:y.customProgramCacheKey()}}function m(y){let P=[];if(y.shaderID?P.push(y.shaderID):(P.push(y.fragmentShader),P.push(y.vertexShader)),y.defines!==void 0)for(let C in y.defines)P.push(C),P.push(y.defines[C]);if(y.isRawShaderMaterial===!1){for(let C=0;C<p.length;C++)P.push(y[p[C]]);P.push(r.outputEncoding),P.push(r.gammaFactor)}return P.push(y.customProgramCacheKey),P.join()}function b(y){let P=f[y.type],C;if(P){let F=zt[P];C=cp.clone(F.uniforms)}else C=y.uniforms;return C}function _(y,P){let C;for(let F=0,k=a.length;F<k;F++){let H=a[F];if(H.cacheKey===P){C=H,++C.usedTimes;break}}return C===void 0&&(C=new jm(r,P,y,i),a.push(C)),C}function w(y){if(--y.usedTimes===0){let P=a.indexOf(y);a[P]=a[a.length-1],a.pop(),y.destroy()}}return{getParameters:x,getProgramCacheKey:m,getUniforms:b,acquireProgram:_,releaseProgram:w,programs:a}}function Km(){let r=new WeakMap;function e(s){let a=r.get(s);return a===void 0&&(a={},r.set(s,a)),a}function t(s){r.delete(s)}function n(s,a,o){r.get(s)[a]=o}function i(){r=new WeakMap}return{get:e,remove:t,update:n,dispose:i}}function ex(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.program!==e.program?r.program.id-e.program.id:r.material.id!==e.material.id?r.material.id-e.material.id:r.z!==e.z?r.z-e.z:r.id-e.id}function tx(r,e){return r.groupOrder!==e.groupOrder?r.groupOrder-e.groupOrder:r.renderOrder!==e.renderOrder?r.renderOrder-e.renderOrder:r.z!==e.z?e.z-r.z:r.id-e.id}function Sl(r){let e=[],t=0,n=[],i=[],s={id:-1};function a(){t=0,n.length=0,i.length=0}function o(d,f,p,g,v,x){let m=e[t],b=r.get(p);return m===void 0?(m={id:d.id,object:d,geometry:f,material:p,program:b.program||s,groupOrder:g,renderOrder:d.renderOrder,z:v,group:x},e[t]=m):(m.id=d.id,m.object=d,m.geometry=f,m.material=p,m.program=b.program||s,m.groupOrder=g,m.renderOrder=d.renderOrder,m.z=v,m.group=x),t++,m}function c(d,f,p,g,v,x){let m=o(d,f,p,g,v,x);(p.transparent===!0?i:n).push(m)}function l(d,f,p,g,v,x){let m=o(d,f,p,g,v,x);(p.transparent===!0?i:n).unshift(m)}function u(d,f){n.length>1&&n.sort(d||ex),i.length>1&&i.sort(f||tx)}function h(){for(let d=t,f=e.length;d<f;d++){let p=e[d];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.program=null,p.group=null}}return{opaque:n,transparent:i,init:a,push:c,unshift:l,finish:h,sort:u}}function nx(r){let e=new WeakMap;function t(i,s){let a;return e.has(i)===!1?(a=new Sl(r),e.set(i,[a])):s>=e.get(i).length?(a=new Sl(r),e.get(i).push(a)):a=e.get(i)[s],a}function n(){e=new WeakMap}return{get:t,dispose:n}}function ix(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new E,color:new he};break;case"SpotLight":t={position:new E,direction:new E,color:new he,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new E,color:new he,distance:0,decay:0};break;case"HemisphereLight":t={direction:new E,skyColor:new he,groundColor:new he};break;case"RectAreaLight":t={color:new he,position:new E,halfWidth:new E,halfHeight:new E};break}return r[e.id]=t,t}}}function rx(){let r={};return{get:function(e){if(r[e.id]!==void 0)return r[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case"SpotLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K};break;case"PointLight":t={shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new K,shadowCameraNear:1,shadowCameraFar:1e3};break}return r[e.id]=t,t}}}function ax(r,e){return(e.castShadow?1:0)-(r.castShadow?1:0)}function ox(r,e){let t=new ix,n=rx(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotShadow:[],spotShadowMap:[],spotShadowMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[]};for(let u=0;u<9;u++)i.probe.push(new E);let s=new E,a=new me,o=new me;function c(u){let h=0,d=0,f=0;for(let P=0;P<9;P++)i.probe[P].set(0,0,0);let p=0,g=0,v=0,x=0,m=0,b=0,_=0,w=0;u.sort(ax);for(let P=0,C=u.length;P<C;P++){let F=u[P],k=F.color,H=F.intensity,B=F.distance,L=F.shadow&&F.shadow.map?F.shadow.map.texture:null;if(F.isAmbientLight)h+=k.r*H,d+=k.g*H,f+=k.b*H;else if(F.isLightProbe)for(let D=0;D<9;D++)i.probe[D].addScaledVector(F.sh.coefficients[D],H);else if(F.isDirectionalLight){let D=t.get(F);if(D.color.copy(F.color).multiplyScalar(F.intensity),F.castShadow){let z=F.shadow,T=n.get(F);T.shadowBias=z.bias,T.shadowNormalBias=z.normalBias,T.shadowRadius=z.radius,T.shadowMapSize=z.mapSize,i.directionalShadow[p]=T,i.directionalShadowMap[p]=L,i.directionalShadowMatrix[p]=F.shadow.matrix,b++}i.directional[p]=D,p++}else if(F.isSpotLight){let D=t.get(F);if(D.position.setFromMatrixPosition(F.matrixWorld),D.color.copy(k).multiplyScalar(H),D.distance=B,D.coneCos=Math.cos(F.angle),D.penumbraCos=Math.cos(F.angle*(1-F.penumbra)),D.decay=F.decay,F.castShadow){let z=F.shadow,T=n.get(F);T.shadowBias=z.bias,T.shadowNormalBias=z.normalBias,T.shadowRadius=z.radius,T.shadowMapSize=z.mapSize,i.spotShadow[v]=T,i.spotShadowMap[v]=L,i.spotShadowMatrix[v]=F.shadow.matrix,w++}i.spot[v]=D,v++}else if(F.isRectAreaLight){let D=t.get(F);D.color.copy(k).multiplyScalar(H),D.halfWidth.set(F.width*.5,0,0),D.halfHeight.set(0,F.height*.5,0),i.rectArea[x]=D,x++}else if(F.isPointLight){let D=t.get(F);if(D.color.copy(F.color).multiplyScalar(F.intensity),D.distance=F.distance,D.decay=F.decay,F.castShadow){let z=F.shadow,T=n.get(F);T.shadowBias=z.bias,T.shadowNormalBias=z.normalBias,T.shadowRadius=z.radius,T.shadowMapSize=z.mapSize,T.shadowCameraNear=z.camera.near,T.shadowCameraFar=z.camera.far,i.pointShadow[g]=T,i.pointShadowMap[g]=L,i.pointShadowMatrix[g]=F.shadow.matrix,_++}i.point[g]=D,g++}else if(F.isHemisphereLight){let D=t.get(F);D.skyColor.copy(F.color).multiplyScalar(H),D.groundColor.copy(F.groundColor).multiplyScalar(H),i.hemi[m]=D,m++}}x>0&&(e.isWebGL2||r.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=se.LTC_FLOAT_1,i.rectAreaLTC2=se.LTC_FLOAT_2):r.has("OES_texture_half_float_linear")===!0?(i.rectAreaLTC1=se.LTC_HALF_1,i.rectAreaLTC2=se.LTC_HALF_2):console.error("THREE.WebGLRenderer: Unable to use RectAreaLight. Missing WebGL extensions.")),i.ambient[0]=h,i.ambient[1]=d,i.ambient[2]=f;let y=i.hash;(y.directionalLength!==p||y.pointLength!==g||y.spotLength!==v||y.rectAreaLength!==x||y.hemiLength!==m||y.numDirectionalShadows!==b||y.numPointShadows!==_||y.numSpotShadows!==w)&&(i.directional.length=p,i.spot.length=v,i.rectArea.length=x,i.point.length=g,i.hemi.length=m,i.directionalShadow.length=b,i.directionalShadowMap.length=b,i.pointShadow.length=_,i.pointShadowMap.length=_,i.spotShadow.length=w,i.spotShadowMap.length=w,i.directionalShadowMatrix.length=b,i.pointShadowMatrix.length=_,i.spotShadowMatrix.length=w,y.directionalLength=p,y.pointLength=g,y.spotLength=v,y.rectAreaLength=x,y.hemiLength=m,y.numDirectionalShadows=b,y.numPointShadows=_,y.numSpotShadows=w,i.version=sx++)}function l(u,h){let d=0,f=0,p=0,g=0,v=0,x=h.matrixWorldInverse;for(let m=0,b=u.length;m<b;m++){let _=u[m];if(_.isDirectionalLight){let w=i.directional[d];w.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(x),d++}else if(_.isSpotLight){let w=i.spot[p];w.position.setFromMatrixPosition(_.matrixWorld),w.position.applyMatrix4(x),w.direction.setFromMatrixPosition(_.matrixWorld),s.setFromMatrixPosition(_.target.matrixWorld),w.direction.sub(s),w.direction.transformDirection(x),p++}else if(_.isRectAreaLight){let w=i.rectArea[g];w.position.setFromMatrixPosition(_.matrixWorld),w.position.applyMatrix4(x),o.identity(),a.copy(_.matrixWorld),a.premultiply(x),o.extractRotation(a),w.halfWidth.set(_.width*.5,0,0),w.halfHeight.set(0,_.height*.5,0),w.halfWidth.applyMatrix4(o),w.halfHeight.applyMatrix4(o),g++}else if(_.isPointLight){let w=i.point[f];w.position.setFromMatrixPosition(_.matrixWorld),w.position.applyMatrix4(x),f++}else if(_.isHemisphereLight){let w=i.hemi[v];w.direction.setFromMatrixPosition(_.matrixWorld),w.direction.transformDirection(x),w.direction.normalize(),v++}}}return{setup:c,setupView:l,state:i}}function El(r,e){let t=new ox(r,e),n=[],i=[];function s(){n.length=0,i.length=0}function a(h){n.push(h)}function o(h){i.push(h)}function c(){t.setup(n)}function l(h){t.setupView(n,h)}return{init:s,state:{lightsArray:n,shadowsArray:i,lights:t},setupLights:c,setupLightsView:l,pushLight:a,pushShadow:o}}function cx(r,e){let t=new WeakMap;function n(s,a=0){let o;return t.has(s)===!1?(o=new El(r,e),t.set(s,[o])):a>=t.get(s).length?(o=new El(r,e),t.get(s).push(o)):o=t.get(s)[a],o}function i(){t=new WeakMap}return{get:n,dispose:i}}function vu(r,e,t){let n=new yt,i=new K,s=new K,a=new Re,o=[],c=[],l={},u=t.maxTextureSize,h={0:Qe,1:Ms,2:hi},d=new jt({defines:{SAMPLE_RATE:2/8,HALF_SAMPLE_RATE:1/8},uniforms:{shadow_pass:{value:null},resolution:{value:new K},radius:{value:4}},vertexShader:ux,fragmentShader:lx}),f=d.clone();f.defines.HORIZONTAL_PASS=1;let p=new Ie;p.setAttribute("position",new Ue(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let g=new lt(p,d),v=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=jl,this.render=function(y,P,C){if(v.enabled===!1||v.autoUpdate===!1&&v.needsUpdate===!1||y.length===0)return;let F=r.getRenderTarget(),k=r.getActiveCubeFace(),H=r.getActiveMipmapLevel(),B=r.state;B.setBlending(Di),B.buffers.color.setClear(1,1,1,1),B.buffers.depth.setTest(!0),B.setScissorTest(!1);for(let L=0,D=y.length;L<D;L++){let z=y[L],T=z.shadow;if(T===void 0){console.warn("THREE.WebGLShadowMap:",z,"has no shadow.");continue}if(T.autoUpdate===!1&&T.needsUpdate===!1)continue;i.copy(T.mapSize);let I=T.getFrameExtents();if(i.multiply(I),s.copy(T.mapSize),(i.x>u||i.y>u)&&(i.x>u&&(s.x=Math.floor(u/I.x),i.x=s.x*I.x,T.mapSize.x=s.x),i.y>u&&(s.y=Math.floor(u/I.y),i.y=s.y*I.y,T.mapSize.y=s.y)),T.map===null&&!T.isPointLightShadow&&this.type===Ri){let $={minFilter:vt,magFilter:vt,format:Pt};T.map=new $t(i.x,i.y,$),T.map.texture.name=z.name+".shadowMap",T.mapPass=new $t(i.x,i.y,$),T.camera.updateProjectionMatrix()}if(T.map===null){let $={minFilter:ct,magFilter:ct,format:Pt};T.map=new $t(i.x,i.y,$),T.map.texture.name=z.name+".shadowMap",T.camera.updateProjectionMatrix()}r.setRenderTarget(T.map),r.clear();let Z=T.getViewportCount();for(let $=0;$<Z;$++){let U=T.getViewport($);a.set(s.x*U.x,s.y*U.y,s.x*U.z,s.y*U.w),B.viewport(a),T.updateMatrices(z,$),n=T.getFrustum(),w(P,C,T.camera,z,this.type)}!T.isPointLightShadow&&this.type===Ri&&x(T,C),T.needsUpdate=!1}v.needsUpdate=!1,r.setRenderTarget(F,k,H)};function x(y,P){let C=e.update(g);d.uniforms.shadow_pass.value=y.map.texture,d.uniforms.resolution.value=y.mapSize,d.uniforms.radius.value=y.radius,r.setRenderTarget(y.mapPass),r.clear(),r.renderBufferDirect(P,null,C,d,g,null),f.uniforms.shadow_pass.value=y.mapPass.texture,f.uniforms.resolution.value=y.mapSize,f.uniforms.radius.value=y.radius,r.setRenderTarget(y.map),r.clear(),r.renderBufferDirect(P,null,C,f,g,null)}function m(y,P,C){let F=y<<0|P<<1|C<<2,k=o[F];return k===void 0&&(k=new ss({depthPacking:Vf,morphTargets:y,skinning:P}),o[F]=k),k}function b(y,P,C){let F=y<<0|P<<1|C<<2,k=c[F];return k===void 0&&(k=new as({morphTargets:y,skinning:P}),c[F]=k),k}function _(y,P,C,F,k,H,B){let L=null,D=m,z=y.customDepthMaterial;if(F.isPointLight===!0&&(D=b,z=y.customDistanceMaterial),z===void 0){let T=!1;C.morphTargets===!0&&(T=P.morphAttributes&&P.morphAttributes.position&&P.morphAttributes.position.length>0);let I=!1;y.isSkinnedMesh===!0&&(C.skinning===!0?I=!0:console.warn("THREE.WebGLShadowMap: THREE.SkinnedMesh with material.skinning set to false:",y));let Z=y.isInstancedMesh===!0;L=D(T,I,Z)}else L=z;if(r.localClippingEnabled&&C.clipShadows===!0&&C.clippingPlanes.length!==0){let T=L.uuid,I=C.uuid,Z=l[T];Z===void 0&&(Z={},l[T]=Z);let $=Z[I];$===void 0&&($=L.clone(),Z[I]=$),L=$}return L.visible=C.visible,L.wireframe=C.wireframe,B===Ri?L.side=C.shadowSide!==null?C.shadowSide:C.side:L.side=C.shadowSide!==null?C.shadowSide:h[C.side],L.clipShadows=C.clipShadows,L.clippingPlanes=C.clippingPlanes,L.clipIntersection=C.clipIntersection,L.wireframeLinewidth=C.wireframeLinewidth,L.linewidth=C.linewidth,F.isPointLight===!0&&L.isMeshDistanceMaterial===!0&&(L.referencePosition.setFromMatrixPosition(F.matrixWorld),L.nearDistance=k,L.farDistance=H),L}function w(y,P,C,F,k){if(y.visible===!1)return;if(y.layers.test(P.layers)&&(y.isMesh||y.isLine||y.isPoints)&&(y.castShadow||y.receiveShadow&&k===Ri)&&(!y.frustumCulled||n.intersectsObject(y))){y.modelViewMatrix.multiplyMatrices(C.matrixWorldInverse,y.matrixWorld);let L=e.update(y),D=y.material;if(Array.isArray(D)){let z=L.groups;for(let T=0,I=z.length;T<I;T++){let Z=z[T],$=D[Z.materialIndex];if($&&$.visible){let U=_(y,L,$,F,C.near,C.far,k);r.renderBufferDirect(C,null,L,U,y,Z)}}}else if(D.visible){let z=_(y,L,D,F,C.near,C.far,k);r.renderBufferDirect(C,null,L,z,y,null)}}let B=y.children;for(let L=0,D=B.length;L<D;L++)w(B[L],P,C,F,k)}}function hx(r,e,t){let n=t.isWebGL2;function i(){let R=!1,ie=new Re,re=null,xe=new Re(0,0,0,0);return{setMask:function(j){re!==j&&!R&&(r.colorMask(j,j,j,j),re=j)},setLocked:function(j){R=j},setClear:function(j,ye,De,Xe,xn){xn===!0&&(j*=Xe,ye*=Xe,De*=Xe),ie.set(j,ye,De,Xe),xe.equals(ie)===!1&&(r.clearColor(j,ye,De,Xe),xe.copy(ie))},reset:function(){R=!1,re=null,xe.set(-1,0,0,0)}}}function s(){let R=!1,ie=null,re=null,xe=null;return{setTest:function(j){j?G(2929):q(2929)},setMask:function(j){ie!==j&&!R&&(r.depthMask(j),ie=j)},setFunc:function(j){if(re!==j){if(j)switch(j){case Cd:r.depthFunc(512);break;case Rd:r.depthFunc(519);break;case Id:r.depthFunc(513);break;case Sa:r.depthFunc(515);break;case Dd:r.depthFunc(514);break;case zd:r.depthFunc(518);break;case Fd:r.depthFunc(516);break;case Bd:r.depthFunc(517);break;default:r.depthFunc(515)}else r.depthFunc(515);re=j}},setLocked:function(j){R=j},setClear:function(j){xe!==j&&(r.clearDepth(j),xe=j)},reset:function(){R=!1,ie=null,re=null,xe=null}}}function a(){let R=!1,ie=null,re=null,xe=null,j=null,ye=null,De=null,Xe=null,xn=null;return{setTest:function(We){R||(We?G(2960):q(2960))},setMask:function(We){ie!==We&&!R&&(r.stencilMask(We),ie=We)},setFunc:function(We,Ot,Mt){(re!==We||xe!==Ot||j!==Mt)&&(r.stencilFunc(We,Ot,Mt),re=We,xe=Ot,j=Mt)},setOp:function(We,Ot,Mt){(ye!==We||De!==Ot||Xe!==Mt)&&(r.stencilOp(We,Ot,Mt),ye=We,De=Ot,Xe=Mt)},setLocked:function(We){R=We},setClear:function(We){xn!==We&&(r.clearStencil(We),xn=We)},reset:function(){R=!1,ie=null,re=null,xe=null,j=null,ye=null,De=null,Xe=null,xn=null}}}let o=new i,c=new s,l=new a,u={},h=null,d={},f=null,p=!1,g=null,v=null,x=null,m=null,b=null,_=null,w=null,y=!1,P=null,C=null,F=null,k=null,H=null,B=r.getParameter(35661),L=!1,D=0,z=r.getParameter(7938);z.indexOf("WebGL")!==-1?(D=parseFloat(/^WebGL (\d)/.exec(z)[1]),L=D>=1):z.indexOf("OpenGL ES")!==-1&&(D=parseFloat(/^OpenGL ES (\d)/.exec(z)[1]),L=D>=2);let T=null,I={},Z=new Re(0,0,r.canvas.width,r.canvas.height),$=new Re(0,0,r.canvas.width,r.canvas.height);function U(R,ie,re){let xe=new Uint8Array(4),j=r.createTexture();r.bindTexture(R,j),r.texParameteri(R,10241,9728),r.texParameteri(R,10240,9728);for(let ye=0;ye<re;ye++)r.texImage2D(ie+ye,0,6408,1,1,0,6408,5121,xe);return j}let W={};W[3553]=U(3553,3553,1),W[34067]=U(34067,34069,6),o.setClear(0,0,0,1),c.setClear(1),l.setClear(0),G(2929),c.setFunc(Sa),ve(!1),Q(Dc),G(2884),ge(Di);function G(R){u[R]!==!0&&(r.enable(R),u[R]=!0)}function q(R){u[R]!==!1&&(r.disable(R),u[R]=!1)}function O(R){R!==h&&(r.bindFramebuffer(36160,R),h=R)}function de(R,ie){ie===null&&h!==null&&(ie=h),d[R]!==ie&&(r.bindFramebuffer(R,ie),d[R]=ie,n&&(R===36009&&(d[36160]=ie),R===36160&&(d[36009]=ie)))}function fe(R){return f!==R?(r.useProgram(R),f=R,!0):!1}let ee={[$n]:32774,[yd]:32778,[bd]:32779};if(n)ee[kc]=32775,ee[Nc]=32776;else{let R=e.get("EXT_blend_minmax");R!==null&&(ee[kc]=R.MIN_EXT,ee[Nc]=R.MAX_EXT)}let le={[_d]:0,[wd]:1,[Md]:768,[Kl]:770,[Pd]:776,[Ad]:774,[Ed]:772,[Sd]:769,[eu]:771,[Ld]:775,[Td]:773};function ge(R,ie,re,xe,j,ye,De,Xe){if(R===Di){p===!0&&(q(3042),p=!1);return}if(p===!1&&(G(3042),p=!0),R!==vd){if(R!==g||Xe!==y){if((v!==$n||b!==$n)&&(r.blendEquation(32774),v=$n,b=$n),Xe)switch(R){case zi:r.blendFuncSeparate(1,771,1,771);break;case zc:r.blendFunc(1,1);break;case Fc:r.blendFuncSeparate(0,0,769,771);break;case Bc:r.blendFuncSeparate(0,768,0,770);break;default:console.error("THREE.WebGLState: Invalid blending: ",R);break}else switch(R){case zi:r.blendFuncSeparate(770,771,1,771);break;case zc:r.blendFunc(770,1);break;case Fc:r.blendFunc(0,769);break;case Bc:r.blendFunc(0,768);break;default:console.error("THREE.WebGLState: Invalid blending: ",R);break}x=null,m=null,_=null,w=null,g=R,y=Xe}return}j=j||ie,ye=ye||re,De=De||xe,(ie!==v||j!==b)&&(r.blendEquationSeparate(ee[ie],ee[j]),v=ie,b=j),(re!==x||xe!==m||ye!==_||De!==w)&&(r.blendFuncSeparate(le[re],le[xe],le[ye],le[De]),x=re,m=xe,_=ye,w=De),g=R,y=null}function Me(R,ie){R.side===hi?q(2884):G(2884);let re=R.side===Qe;ie&&(re=!re),ve(re),R.blending===zi&&R.transparent===!1?ge(Di):ge(R.blending,R.blendEquation,R.blendSrc,R.blendDst,R.blendEquationAlpha,R.blendSrcAlpha,R.blendDstAlpha,R.premultipliedAlpha),c.setFunc(R.depthFunc),c.setTest(R.depthTest),c.setMask(R.depthWrite),o.setMask(R.colorWrite);let xe=R.stencilWrite;l.setTest(xe),xe&&(l.setMask(R.stencilWriteMask),l.setFunc(R.stencilFunc,R.stencilRef,R.stencilFuncMask),l.setOp(R.stencilFail,R.stencilZFail,R.stencilZPass)),ne(R.polygonOffset,R.polygonOffsetFactor,R.polygonOffsetUnits),R.alphaToCoverage===!0?G(32926):q(32926)}function ve(R){P!==R&&(R?r.frontFace(2304):r.frontFace(2305),P=R)}function Q(R){R!==md?(G(2884),R!==C&&(R===Dc?r.cullFace(1029):R===xd?r.cullFace(1028):r.cullFace(1032))):q(2884),C=R}function te(R){R!==F&&(L&&r.lineWidth(R),F=R)}function ne(R,ie,re){R?(G(32823),(k!==ie||H!==re)&&(r.polygonOffset(ie,re),k=ie,H=re)):q(32823)}function ue(R){R?G(3089):q(3089)}function ae(R){R===void 0&&(R=33984+B-1),T!==R&&(r.activeTexture(R),T=R)}function A(R,ie){T===null&&ae();let re=I[T];re===void 0&&(re={type:void 0,texture:void 0},I[T]=re),(re.type!==R||re.texture!==ie)&&(r.bindTexture(R,ie||W[R]),re.type=R,re.texture=ie)}function M(){let R=I[T];R!==void 0&&R.type!==void 0&&(r.bindTexture(R.type,null),R.type=void 0,R.texture=void 0)}function X(){try{r.compressedTexImage2D.apply(r,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function J(){try{r.texImage2D.apply(r,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function ce(){try{r.texImage3D.apply(r,arguments)}catch(R){console.error("THREE.WebGLState:",R)}}function pe(R){Z.equals(R)===!1&&(r.scissor(R.x,R.y,R.z,R.w),Z.copy(R))}function Pe(R){$.equals(R)===!1&&(r.viewport(R.x,R.y,R.z,R.w),$.copy(R))}function be(){r.disable(3042),r.disable(2884),r.disable(2929),r.disable(32823),r.disable(3089),r.disable(2960),r.disable(32926),r.blendEquation(32774),r.blendFunc(1,0),r.blendFuncSeparate(1,0,1,0),r.colorMask(!0,!0,!0,!0),r.clearColor(0,0,0,0),r.depthMask(!0),r.depthFunc(513),r.clearDepth(1),r.stencilMask(4294967295),r.stencilFunc(519,0,4294967295),r.stencilOp(7680,7680,7680),r.clearStencil(0),r.cullFace(1029),r.frontFace(2305),r.polygonOffset(0,0),r.activeTexture(33984),r.bindFramebuffer(36160,null),n===!0&&(r.bindFramebuffer(36009,null),r.bindFramebuffer(36008,null)),r.useProgram(null),r.lineWidth(1),r.scissor(0,0,r.canvas.width,r.canvas.height),r.viewport(0,0,r.canvas.width,r.canvas.height),u={},T=null,I={},h=null,d={},f=null,p=!1,g=null,v=null,x=null,m=null,b=null,_=null,w=null,y=!1,P=null,C=null,F=null,k=null,H=null,Z.set(0,0,r.canvas.width,r.canvas.height),$.set(0,0,r.canvas.width,r.canvas.height),o.reset(),c.reset(),l.reset()}return{buffers:{color:o,depth:c,stencil:l},enable:G,disable:q,bindFramebuffer:de,bindXRFramebuffer:O,useProgram:fe,setBlending:ge,setMaterial:Me,setFlipSided:ve,setCullFace:Q,setLineWidth:te,setPolygonOffset:ne,setScissorTest:ue,activeTexture:ae,bindTexture:A,unbindTexture:M,compressedTexImage2D:X,texImage2D:J,texImage3D:ce,scissor:pe,viewport:Pe,reset:be}}function dx(r,e,t,n,i,s,a){let o=i.isWebGL2,c=i.maxTextures,l=i.maxCubemapSize,u=i.maxTextureSize,h=i.maxSamples,d=new WeakMap,f,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function g(A,M){return p?new OffscreenCanvas(A,M):document.createElementNS("http://www.w3.org/1999/xhtml","canvas")}function v(A,M,X,J){let ce=1;if((A.width>J||A.height>J)&&(ce=J/Math.max(A.width,A.height)),ce<1||M===!0)if(typeof HTMLImageElement<"u"&&A instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&A instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&A instanceof ImageBitmap){let pe=M?$f:Math.floor,Pe=pe(ce*A.width),be=pe(ce*A.height);f===void 0&&(f=g(Pe,be));let R=X?g(Pe,be):f;return R.width=Pe,R.height=be,R.getContext("2d").drawImage(A,0,0,Pe,be),console.warn("THREE.WebGLRenderer: Texture has been resized from ("+A.width+"x"+A.height+") to ("+Pe+"x"+be+")."),R}else return"data"in A&&console.warn("THREE.WebGLRenderer: Image in DataTexture is too big ("+A.width+"x"+A.height+")."),A;return A}function x(A){return el(A.width)&&el(A.height)}function m(A){return o?!1:A.wrapS!==Lt||A.wrapT!==Lt||A.minFilter!==ct&&A.minFilter!==vt}function b(A,M){return A.generateMipmaps&&M&&A.minFilter!==ct&&A.minFilter!==vt}function _(A,M,X,J){r.generateMipmap(A);let ce=n.get(M);ce.__maxMipLevel=Math.log2(Math.max(X,J))}function w(A,M,X){if(o===!1)return M;if(A!==null){if(r[A]!==void 0)return r[A];console.warn("THREE.WebGLRenderer: Attempt to use non-existing WebGL internal format '"+A+"'")}let J=M;return M===6403&&(X===5126&&(J=33326),X===5131&&(J=33325),X===5121&&(J=33321)),M===6407&&(X===5126&&(J=34837),X===5131&&(J=34843),X===5121&&(J=32849)),M===6408&&(X===5126&&(J=34836),X===5131&&(J=34842),X===5121&&(J=32856)),(J===33325||J===33326||J===34842||J===34836)&&e.get("EXT_color_buffer_float"),J}function y(A){return A===ct||A===Gc||A===Hc?9728:9729}function P(A){let M=A.target;M.removeEventListener("dispose",P),F(M),M.isVideoTexture&&d.delete(M),a.memory.textures--}function C(A){let M=A.target;M.removeEventListener("dispose",C),k(M),a.memory.textures--}function F(A){let M=n.get(A);M.__webglInit!==void 0&&(r.deleteTexture(M.__webglTexture),n.remove(A))}function k(A){let M=A.texture,X=n.get(A),J=n.get(M);if(A){if(J.__webglTexture!==void 0&&r.deleteTexture(J.__webglTexture),A.depthTexture&&A.depthTexture.dispose(),A.isWebGLCubeRenderTarget)for(let ce=0;ce<6;ce++)r.deleteFramebuffer(X.__webglFramebuffer[ce]),X.__webglDepthbuffer&&r.deleteRenderbuffer(X.__webglDepthbuffer[ce]);else r.deleteFramebuffer(X.__webglFramebuffer),X.__webglDepthbuffer&&r.deleteRenderbuffer(X.__webglDepthbuffer),X.__webglMultisampledFramebuffer&&r.deleteFramebuffer(X.__webglMultisampledFramebuffer),X.__webglColorRenderbuffer&&r.deleteRenderbuffer(X.__webglColorRenderbuffer),X.__webglDepthRenderbuffer&&r.deleteRenderbuffer(X.__webglDepthRenderbuffer);n.remove(M),n.remove(A)}}let H=0;function B(){H=0}function L(){let A=H;return A>=c&&console.warn("THREE.WebGLTextures: Trying to use "+A+" texture units while this GPU supports only "+c),H+=1,A}function D(A,M){let X=n.get(A);if(A.isVideoTexture&&Q(A),A.version>0&&X.__version!==A.version){let J=A.image;if(J===void 0)console.warn("THREE.WebGLRenderer: Texture marked for update but image is undefined");else if(J.complete===!1)console.warn("THREE.WebGLRenderer: Texture marked for update but image is incomplete");else{G(X,A,M);return}}t.activeTexture(33984+M),t.bindTexture(3553,X.__webglTexture)}function z(A,M){let X=n.get(A);if(A.version>0&&X.__version!==A.version){G(X,A,M);return}t.activeTexture(33984+M),t.bindTexture(35866,X.__webglTexture)}function T(A,M){let X=n.get(A);if(A.version>0&&X.__version!==A.version){G(X,A,M);return}t.activeTexture(33984+M),t.bindTexture(32879,X.__webglTexture)}function I(A,M){let X=n.get(A);if(A.version>0&&X.__version!==A.version){q(X,A,M);return}t.activeTexture(33984+M),t.bindTexture(34067,X.__webglTexture)}let Z={[Ea]:10497,[Lt]:33071,[Ta]:33648},$={[ct]:9728,[Gc]:9984,[Hc]:9986,[vt]:9729,[Wd]:9985,[qo]:9987};function U(A,M,X){if(X?(r.texParameteri(A,10242,Z[M.wrapS]),r.texParameteri(A,10243,Z[M.wrapT]),(A===32879||A===35866)&&r.texParameteri(A,32882,Z[M.wrapR]),r.texParameteri(A,10240,$[M.magFilter]),r.texParameteri(A,10241,$[M.minFilter])):(r.texParameteri(A,10242,33071),r.texParameteri(A,10243,33071),(A===32879||A===35866)&&r.texParameteri(A,32882,33071),(M.wrapS!==Lt||M.wrapT!==Lt)&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.wrapS and Texture.wrapT should be set to THREE.ClampToEdgeWrapping."),r.texParameteri(A,10240,y(M.magFilter)),r.texParameteri(A,10241,y(M.minFilter)),M.minFilter!==ct&&M.minFilter!==vt&&console.warn("THREE.WebGLRenderer: Texture is not power of two. Texture.minFilter should be set to THREE.NearestFilter or THREE.LinearFilter.")),e.has("EXT_texture_filter_anisotropic")===!0){let J=e.get("EXT_texture_filter_anisotropic");if(M.type===on&&e.has("OES_texture_float_linear")===!1||o===!1&&M.type===$r&&e.has("OES_texture_half_float_linear")===!1)return;(M.anisotropy>1||n.get(M).__currentAnisotropy)&&(r.texParameterf(A,J.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(M.anisotropy,i.getMaxAnisotropy())),n.get(M).__currentAnisotropy=M.anisotropy)}}function W(A,M){A.__webglInit===void 0&&(A.__webglInit=!0,M.addEventListener("dispose",P),A.__webglTexture=r.createTexture(),a.memory.textures++)}function G(A,M,X){let J=3553;M.isDataTexture2DArray&&(J=35866),M.isDataTexture3D&&(J=32879),W(A,M),t.activeTexture(33984+X),t.bindTexture(J,A.__webglTexture),r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);let ce=m(M)&&x(M.image)===!1,pe=v(M.image,ce,!1,u),Pe=x(pe)||o,be=s.convert(M.format),R=s.convert(M.type),ie=w(M.internalFormat,be,R);U(J,M,Pe);let re,xe=M.mipmaps;if(M.isDepthTexture)ie=6402,o?M.type===on?ie=36012:M.type===qr?ie=33190:M.type===Bi?ie=35056:ie=33189:M.type===on&&console.error("WebGLRenderer: Floating point depth texture requires WebGL2."),M.format===Qn&&ie===6402&&M.type!==Yr&&M.type!==qr&&(console.warn("THREE.WebGLRenderer: Use UnsignedShortType or UnsignedIntType for DepthFormat DepthTexture."),M.type=Yr,R=s.convert(M.type)),M.format===Gi&&ie===6402&&(ie=34041,M.type!==Bi&&(console.warn("THREE.WebGLRenderer: Use UnsignedInt248Type for DepthStencilFormat DepthTexture."),M.type=Bi,R=s.convert(M.type))),t.texImage2D(3553,0,ie,pe.width,pe.height,0,be,R,null);else if(M.isDataTexture)if(xe.length>0&&Pe){for(let j=0,ye=xe.length;j<ye;j++)re=xe[j],t.texImage2D(3553,j,ie,re.width,re.height,0,be,R,re.data);M.generateMipmaps=!1,A.__maxMipLevel=xe.length-1}else t.texImage2D(3553,0,ie,pe.width,pe.height,0,be,R,pe.data),A.__maxMipLevel=0;else if(M.isCompressedTexture){for(let j=0,ye=xe.length;j<ye;j++)re=xe[j],M.format!==Pt&&M.format!==Mn?be!==null?t.compressedTexImage2D(3553,j,ie,re.width,re.height,0,re.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):t.texImage2D(3553,j,ie,re.width,re.height,0,be,R,re.data);A.__maxMipLevel=xe.length-1}else if(M.isDataTexture2DArray)t.texImage3D(35866,0,ie,pe.width,pe.height,pe.depth,0,be,R,pe.data),A.__maxMipLevel=0;else if(M.isDataTexture3D)t.texImage3D(32879,0,ie,pe.width,pe.height,pe.depth,0,be,R,pe.data),A.__maxMipLevel=0;else if(xe.length>0&&Pe){for(let j=0,ye=xe.length;j<ye;j++)re=xe[j],t.texImage2D(3553,j,ie,be,R,re);M.generateMipmaps=!1,A.__maxMipLevel=xe.length-1}else t.texImage2D(3553,0,ie,be,R,pe),A.__maxMipLevel=0;b(M,Pe)&&_(J,M,pe.width,pe.height),A.__version=M.version,M.onUpdate&&M.onUpdate(M)}function q(A,M,X){if(M.image.length!==6)return;W(A,M),t.activeTexture(33984+X),t.bindTexture(34067,A.__webglTexture),r.pixelStorei(37440,M.flipY),r.pixelStorei(37441,M.premultiplyAlpha),r.pixelStorei(3317,M.unpackAlignment),r.pixelStorei(37443,0);let J=M&&(M.isCompressedTexture||M.image[0].isCompressedTexture),ce=M.image[0]&&M.image[0].isDataTexture,pe=[];for(let j=0;j<6;j++)!J&&!ce?pe[j]=v(M.image[j],!1,!0,l):pe[j]=ce?M.image[j].image:M.image[j];let Pe=pe[0],be=x(Pe)||o,R=s.convert(M.format),ie=s.convert(M.type),re=w(M.internalFormat,R,ie);U(34067,M,be);let xe;if(J){for(let j=0;j<6;j++){xe=pe[j].mipmaps;for(let ye=0;ye<xe.length;ye++){let De=xe[ye];M.format!==Pt&&M.format!==Mn?R!==null?t.compressedTexImage2D(34069+j,ye,re,De.width,De.height,0,De.data):console.warn("THREE.WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):t.texImage2D(34069+j,ye,re,De.width,De.height,0,R,ie,De.data)}}A.__maxMipLevel=xe.length-1}else{xe=M.mipmaps;for(let j=0;j<6;j++)if(ce){t.texImage2D(34069+j,0,re,pe[j].width,pe[j].height,0,R,ie,pe[j].data);for(let ye=0;ye<xe.length;ye++){let Xe=xe[ye].image[j].image;t.texImage2D(34069+j,ye+1,re,Xe.width,Xe.height,0,R,ie,Xe.data)}}else{t.texImage2D(34069+j,0,re,R,ie,pe[j]);for(let ye=0;ye<xe.length;ye++){let De=xe[ye];t.texImage2D(34069+j,ye+1,re,R,ie,De.image[j])}}A.__maxMipLevel=xe.length}b(M,be)&&_(34067,M,Pe.width,Pe.height),A.__version=M.version,M.onUpdate&&M.onUpdate(M)}function O(A,M,X,J){let ce=M.texture,pe=s.convert(ce.format),Pe=s.convert(ce.type),be=w(ce.internalFormat,pe,Pe);J===32879||J===35866?t.texImage3D(J,0,be,M.width,M.height,M.depth,0,pe,Pe,null):t.texImage2D(J,0,be,M.width,M.height,0,pe,Pe,null),t.bindFramebuffer(36160,A),r.framebufferTexture2D(36160,X,J,n.get(ce).__webglTexture,0),t.bindFramebuffer(36160,null)}function de(A,M,X){if(r.bindRenderbuffer(36161,A),M.depthBuffer&&!M.stencilBuffer){let J=33189;if(X){let ce=M.depthTexture;ce&&ce.isDepthTexture&&(ce.type===on?J=36012:ce.type===qr&&(J=33190));let pe=ve(M);r.renderbufferStorageMultisample(36161,pe,J,M.width,M.height)}else r.renderbufferStorage(36161,J,M.width,M.height);r.framebufferRenderbuffer(36160,36096,36161,A)}else if(M.depthBuffer&&M.stencilBuffer){if(X){let J=ve(M);r.renderbufferStorageMultisample(36161,J,35056,M.width,M.height)}else r.renderbufferStorage(36161,34041,M.width,M.height);r.framebufferRenderbuffer(36160,33306,36161,A)}else{let J=M.texture,ce=s.convert(J.format),pe=s.convert(J.type),Pe=w(J.internalFormat,ce,pe);if(X){let be=ve(M);r.renderbufferStorageMultisample(36161,be,Pe,M.width,M.height)}else r.renderbufferStorage(36161,Pe,M.width,M.height)}r.bindRenderbuffer(36161,null)}function fe(A,M){if(M&&M.isWebGLCubeRenderTarget)throw new Error("Depth Texture with cube render targets is not supported");if(t.bindFramebuffer(36160,A),!(M.depthTexture&&M.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");(!n.get(M.depthTexture).__webglTexture||M.depthTexture.image.width!==M.width||M.depthTexture.image.height!==M.height)&&(M.depthTexture.image.width=M.width,M.depthTexture.image.height=M.height,M.depthTexture.needsUpdate=!0),D(M.depthTexture,0);let J=n.get(M.depthTexture).__webglTexture;if(M.depthTexture.format===Qn)r.framebufferTexture2D(36160,36096,3553,J,0);else if(M.depthTexture.format===Gi)r.framebufferTexture2D(36160,33306,3553,J,0);else throw new Error("Unknown depthTexture format")}function ee(A){let M=n.get(A),X=A.isWebGLCubeRenderTarget===!0;if(A.depthTexture){if(X)throw new Error("target.depthTexture not supported in Cube render targets");fe(M.__webglFramebuffer,A)}else if(X){M.__webglDepthbuffer=[];for(let J=0;J<6;J++)t.bindFramebuffer(36160,M.__webglFramebuffer[J]),M.__webglDepthbuffer[J]=r.createRenderbuffer(),de(M.__webglDepthbuffer[J],A,!1)}else t.bindFramebuffer(36160,M.__webglFramebuffer),M.__webglDepthbuffer=r.createRenderbuffer(),de(M.__webglDepthbuffer,A,!1);t.bindFramebuffer(36160,null)}function le(A){let M=A.texture,X=n.get(A),J=n.get(M);A.addEventListener("dispose",C),J.__webglTexture=r.createTexture(),J.__version=M.version,a.memory.textures++;let ce=A.isWebGLCubeRenderTarget===!0,pe=A.isWebGLMultisampleRenderTarget===!0,Pe=M.isDataTexture3D||M.isDataTexture2DArray,be=x(A)||o;if(o&&M.format===Mn&&(M.type===on||M.type===$r)&&(M.format=Pt,console.warn("THREE.WebGLRenderer: Rendering to textures with RGB format is not supported. Using RGBA format instead.")),ce){X.__webglFramebuffer=[];for(let R=0;R<6;R++)X.__webglFramebuffer[R]=r.createFramebuffer()}else if(X.__webglFramebuffer=r.createFramebuffer(),pe)if(o){X.__webglMultisampledFramebuffer=r.createFramebuffer(),X.__webglColorRenderbuffer=r.createRenderbuffer(),r.bindRenderbuffer(36161,X.__webglColorRenderbuffer);let R=s.convert(M.format),ie=s.convert(M.type),re=w(M.internalFormat,R,ie),xe=ve(A);r.renderbufferStorageMultisample(36161,xe,re,A.width,A.height),t.bindFramebuffer(36160,X.__webglMultisampledFramebuffer),r.framebufferRenderbuffer(36160,36064,36161,X.__webglColorRenderbuffer),r.bindRenderbuffer(36161,null),A.depthBuffer&&(X.__webglDepthRenderbuffer=r.createRenderbuffer(),de(X.__webglDepthRenderbuffer,A,!0)),t.bindFramebuffer(36160,null)}else console.warn("THREE.WebGLRenderer: WebGLMultisampleRenderTarget can only be used with WebGL2.");if(ce){t.bindTexture(34067,J.__webglTexture),U(34067,M,be);for(let R=0;R<6;R++)O(X.__webglFramebuffer[R],A,36064,34069+R);b(M,be)&&_(34067,M,A.width,A.height),t.bindTexture(34067,null)}else{let R=3553;Pe&&(o?R=M.isDataTexture3D?32879:35866:console.warn("THREE.DataTexture3D and THREE.DataTexture2DArray only supported with WebGL2.")),t.bindTexture(R,J.__webglTexture),U(R,M,be),O(X.__webglFramebuffer,A,36064,R),b(M,be)&&_(3553,M,A.width,A.height),t.bindTexture(3553,null)}A.depthBuffer&&ee(A)}function ge(A){let M=A.texture,X=x(A)||o;if(b(M,X)){let J=A.isWebGLCubeRenderTarget?34067:3553,ce=n.get(M).__webglTexture;t.bindTexture(J,ce),_(J,M,A.width,A.height),t.bindTexture(J,null)}}function Me(A){if(A.isWebGLMultisampleRenderTarget)if(o){let M=A.width,X=A.height,J=16384;A.depthBuffer&&(J|=256),A.stencilBuffer&&(J|=1024);let ce=n.get(A);t.bindFramebuffer(36008,ce.__webglMultisampledFramebuffer),t.bindFramebuffer(36009,ce.__webglFramebuffer),r.blitFramebuffer(0,0,M,X,0,0,M,X,J,9728),t.bindFramebuffer(36008,null),t.bindFramebuffer(36009,ce.__webglMultisampledFramebuffer)}else console.warn("THREE.WebGLRenderer: WebGLMultisampleRenderTarget can only be used with WebGL2.")}function ve(A){return o&&A.isWebGLMultisampleRenderTarget?Math.min(h,A.samples):0}function Q(A){let M=a.render.frame;d.get(A)!==M&&(d.set(A,M),A.update())}let te=!1,ne=!1;function ue(A,M){A&&A.isWebGLRenderTarget&&(te===!1&&(console.warn("THREE.WebGLTextures.safeSetTexture2D: don't use render targets as textures. Use their .texture property instead."),te=!0),A=A.texture),D(A,M)}function ae(A,M){A&&A.isWebGLCubeRenderTarget&&(ne===!1&&(console.warn("THREE.WebGLTextures.safeSetTextureCube: don't use cube render targets as textures. Use their .texture property instead."),ne=!0),A=A.texture),I(A,M)}this.allocateTextureUnit=L,this.resetTextureUnits=B,this.setTexture2D=D,this.setTexture2DArray=z,this.setTexture3D=T,this.setTextureCube=I,this.setupRenderTarget=le,this.updateRenderTargetMipmap=ge,this.updateMultisampleRenderTarget=Me,this.safeSetTexture2D=ue,this.safeSetTextureCube=ae}function fx(r,e,t){let n=t.isWebGL2;function i(s){let a;if(s===Xo)return 5121;if(s===$d)return 32819;if(s===Zd)return 32820;if(s===Jd)return 33635;if(s===qd)return 5120;if(s===Xd)return 5122;if(s===Yr)return 5123;if(s===Yd)return 5124;if(s===qr)return 5125;if(s===on)return 5126;if(s===$r)return n?5131:(a=e.get("OES_texture_half_float"),a!==null?a.HALF_FLOAT_OES:null);if(s===jd)return 6406;if(s===Mn)return 6407;if(s===Pt)return 6408;if(s===Qd)return 6409;if(s===Kd)return 6410;if(s===Qn)return 6402;if(s===Gi)return 34041;if(s===ef)return 6403;if(s===tf)return 36244;if(s===nf)return 33319;if(s===rf)return 33320;if(s===sf)return 36248;if(s===af)return 36249;if(s===Vc||s===Wc||s===qc||s===Xc)if(a=e.get("WEBGL_compressed_texture_s3tc"),a!==null){if(s===Vc)return a.COMPRESSED_RGB_S3TC_DXT1_EXT;if(s===Wc)return a.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(s===qc)return a.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(s===Xc)return a.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(s===Yc||s===$c||s===Zc||s===Jc)if(a=e.get("WEBGL_compressed_texture_pvrtc"),a!==null){if(s===Yc)return a.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(s===$c)return a.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(s===Zc)return a.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(s===Jc)return a.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(s===of)return a=e.get("WEBGL_compressed_texture_etc1"),a!==null?a.COMPRESSED_RGB_ETC1_WEBGL:null;if((s===jc||s===Qc)&&(a=e.get("WEBGL_compressed_texture_etc"),a!==null)){if(s===jc)return a.COMPRESSED_RGB8_ETC2;if(s===Qc)return a.COMPRESSED_RGBA8_ETC2_EAC}if(s===cf||s===lf||s===uf||s===hf||s===df||s===ff||s===pf||s===mf||s===xf||s===gf||s===vf||s===yf||s===bf||s===_f||s===Mf||s===Sf||s===Ef||s===Tf||s===Af||s===Lf||s===Pf||s===Cf||s===Rf||s===If||s===Df||s===zf||s===Ff||s===Bf)return a=e.get("WEBGL_compressed_texture_astc"),a!==null?s:null;if(s===wf)return a=e.get("EXT_texture_compression_bptc"),a!==null?s:null;if(s===Bi)return n?34042:(a=e.get("WEBGL_depth_texture"),a!==null?a.UNSIGNED_INT_24_8_WEBGL:null)}return{convert:i}}function mx(r){function e(x,m){x.fogColor.value.copy(m.color),m.isFog?(x.fogNear.value=m.near,x.fogFar.value=m.far):m.isFogExp2&&(x.fogDensity.value=m.density)}function t(x,m,b,_){m.isMeshBasicMaterial?n(x,m):m.isMeshLambertMaterial?(n(x,m),c(x,m)):m.isMeshToonMaterial?(n(x,m),u(x,m)):m.isMeshPhongMaterial?(n(x,m),l(x,m)):m.isMeshStandardMaterial?(n(x,m),m.isMeshPhysicalMaterial?d(x,m):h(x,m)):m.isMeshMatcapMaterial?(n(x,m),f(x,m)):m.isMeshDepthMaterial?(n(x,m),p(x,m)):m.isMeshDistanceMaterial?(n(x,m),g(x,m)):m.isMeshNormalMaterial?(n(x,m),v(x,m)):m.isLineBasicMaterial?(i(x,m),m.isLineDashedMaterial&&s(x,m)):m.isPointsMaterial?a(x,m,b,_):m.isSpriteMaterial?o(x,m):m.isShadowMaterial?(x.color.value.copy(m.color),x.opacity.value=m.opacity):m.isShaderMaterial&&(m.uniformsNeedUpdate=!1)}function n(x,m){x.opacity.value=m.opacity,m.color&&x.diffuse.value.copy(m.color),m.emissive&&x.emissive.value.copy(m.emissive).multiplyScalar(m.emissiveIntensity),m.map&&(x.map.value=m.map),m.alphaMap&&(x.alphaMap.value=m.alphaMap),m.specularMap&&(x.specularMap.value=m.specularMap);let b=r.get(m).envMap;if(b){x.envMap.value=b,x.flipEnvMap.value=b.isCubeTexture&&b._needsFlipEnvMap?-1:1,x.reflectivity.value=m.reflectivity,x.refractionRatio.value=m.refractionRatio;let y=r.get(b).__maxMipLevel;y!==void 0&&(x.maxMipLevel.value=y)}m.lightMap&&(x.lightMap.value=m.lightMap,x.lightMapIntensity.value=m.lightMapIntensity),m.aoMap&&(x.aoMap.value=m.aoMap,x.aoMapIntensity.value=m.aoMapIntensity);let _;m.map?_=m.map:m.specularMap?_=m.specularMap:m.displacementMap?_=m.displacementMap:m.normalMap?_=m.normalMap:m.bumpMap?_=m.bumpMap:m.roughnessMap?_=m.roughnessMap:m.metalnessMap?_=m.metalnessMap:m.alphaMap?_=m.alphaMap:m.emissiveMap?_=m.emissiveMap:m.clearcoatMap?_=m.clearcoatMap:m.clearcoatNormalMap?_=m.clearcoatNormalMap:m.clearcoatRoughnessMap&&(_=m.clearcoatRoughnessMap),_!==void 0&&(_.isWebGLRenderTarget&&(_=_.texture),_.matrixAutoUpdate===!0&&_.updateMatrix(),x.uvTransform.value.copy(_.matrix));let w;m.aoMap?w=m.aoMap:m.lightMap&&(w=m.lightMap),w!==void 0&&(w.isWebGLRenderTarget&&(w=w.texture),w.matrixAutoUpdate===!0&&w.updateMatrix(),x.uv2Transform.value.copy(w.matrix))}function i(x,m){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity}function s(x,m){x.dashSize.value=m.dashSize,x.totalSize.value=m.dashSize+m.gapSize,x.scale.value=m.scale}function a(x,m,b,_){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity,x.size.value=m.size*b,x.scale.value=_*.5,m.map&&(x.map.value=m.map),m.alphaMap&&(x.alphaMap.value=m.alphaMap);let w;m.map?w=m.map:m.alphaMap&&(w=m.alphaMap),w!==void 0&&(w.matrixAutoUpdate===!0&&w.updateMatrix(),x.uvTransform.value.copy(w.matrix))}function o(x,m){x.diffuse.value.copy(m.color),x.opacity.value=m.opacity,x.rotation.value=m.rotation,m.map&&(x.map.value=m.map),m.alphaMap&&(x.alphaMap.value=m.alphaMap);let b;m.map?b=m.map:m.alphaMap&&(b=m.alphaMap),b!==void 0&&(b.matrixAutoUpdate===!0&&b.updateMatrix(),x.uvTransform.value.copy(b.matrix))}function c(x,m){m.emissiveMap&&(x.emissiveMap.value=m.emissiveMap)}function l(x,m){x.specular.value.copy(m.specular),x.shininess.value=Math.max(m.shininess,1e-4),m.emissiveMap&&(x.emissiveMap.value=m.emissiveMap),m.bumpMap&&(x.bumpMap.value=m.bumpMap,x.bumpScale.value=m.bumpScale,m.side===Qe&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,x.normalScale.value.copy(m.normalScale),m.side===Qe&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias)}function u(x,m){m.gradientMap&&(x.gradientMap.value=m.gradientMap),m.emissiveMap&&(x.emissiveMap.value=m.emissiveMap),m.bumpMap&&(x.bumpMap.value=m.bumpMap,x.bumpScale.value=m.bumpScale,m.side===Qe&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,x.normalScale.value.copy(m.normalScale),m.side===Qe&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias)}function h(x,m){x.roughness.value=m.roughness,x.metalness.value=m.metalness,m.roughnessMap&&(x.roughnessMap.value=m.roughnessMap),m.metalnessMap&&(x.metalnessMap.value=m.metalnessMap),m.emissiveMap&&(x.emissiveMap.value=m.emissiveMap),m.bumpMap&&(x.bumpMap.value=m.bumpMap,x.bumpScale.value=m.bumpScale,m.side===Qe&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,x.normalScale.value.copy(m.normalScale),m.side===Qe&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias),r.get(m).envMap&&(x.envMapIntensity.value=m.envMapIntensity)}function d(x,m){h(x,m),x.reflectivity.value=m.reflectivity,x.clearcoat.value=m.clearcoat,x.clearcoatRoughness.value=m.clearcoatRoughness,m.sheen&&x.sheen.value.copy(m.sheen),m.clearcoatMap&&(x.clearcoatMap.value=m.clearcoatMap),m.clearcoatRoughnessMap&&(x.clearcoatRoughnessMap.value=m.clearcoatRoughnessMap),m.clearcoatNormalMap&&(x.clearcoatNormalScale.value.copy(m.clearcoatNormalScale),x.clearcoatNormalMap.value=m.clearcoatNormalMap,m.side===Qe&&x.clearcoatNormalScale.value.negate()),x.transmission.value=m.transmission,m.transmissionMap&&(x.transmissionMap.value=m.transmissionMap)}function f(x,m){m.matcap&&(x.matcap.value=m.matcap),m.bumpMap&&(x.bumpMap.value=m.bumpMap,x.bumpScale.value=m.bumpScale,m.side===Qe&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,x.normalScale.value.copy(m.normalScale),m.side===Qe&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias)}function p(x,m){m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias)}function g(x,m){m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias),x.referencePosition.value.copy(m.referencePosition),x.nearDistance.value=m.nearDistance,x.farDistance.value=m.farDistance}function v(x,m){m.bumpMap&&(x.bumpMap.value=m.bumpMap,x.bumpScale.value=m.bumpScale,m.side===Qe&&(x.bumpScale.value*=-1)),m.normalMap&&(x.normalMap.value=m.normalMap,x.normalScale.value.copy(m.normalScale),m.side===Qe&&x.normalScale.value.negate()),m.displacementMap&&(x.displacementMap.value=m.displacementMap,x.displacementScale.value=m.displacementScale,x.displacementBias.value=m.displacementBias)}return{refreshFogUniforms:e,refreshMaterialUniforms:t}}function xx(){let r=document.createElementNS("http://www.w3.org/1999/xhtml","canvas");return r.style.display="block",r}function Be(r){r=r||{};let e=r.canvas!==void 0?r.canvas:xx(),t=r.context!==void 0?r.context:null,n=r.alpha!==void 0?r.alpha:!1,i=r.depth!==void 0?r.depth:!0,s=r.stencil!==void 0?r.stencil:!0,a=r.antialias!==void 0?r.antialias:!1,o=r.premultipliedAlpha!==void 0?r.premultipliedAlpha:!0,c=r.preserveDrawingBuffer!==void 0?r.preserveDrawingBuffer:!1,l=r.powerPreference!==void 0?r.powerPreference:"default",u=r.failIfMajorPerformanceCaveat!==void 0?r.failIfMajorPerformanceCaveat:!1,h=null,d=null,f=[],p=[];this.domElement=e,this.debug={checkShaderErrors:!0},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.gammaFactor=2,this.outputEncoding=di,this.physicallyCorrectLights=!1,this.toneMapping=Fi,this.toneMappingExposure=1;let g=this,v=!1,x=0,m=0,b=null,_=-1,w=null,y=new Re,P=new Re,C=null,F=e.width,k=e.height,H=1,B=null,L=null,D=new Re(0,0,F,k),z=new Re(0,0,F,k),T=!1,I=new yt,Z=!1,$=!1,U=new me,W=new E,G={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};function q(){return b===null?H:1}let O=t;function de(S,V){for(let N=0;N<S.length;N++){let Y=S[N],oe=e.getContext(Y,V);if(oe!==null)return oe}return null}try{let S={alpha:n,depth:i,stencil:s,antialias:a,premultipliedAlpha:o,preserveDrawingBuffer:c,powerPreference:l,failIfMajorPerformanceCaveat:u};if(e.addEventListener("webglcontextlost",ye,!1),e.addEventListener("webglcontextrestored",De,!1),O===null){let V=["webgl2","webgl","experimental-webgl"];if(g.isWebGL1Renderer===!0&&V.shift(),O=de(V,S),O===null)throw de(V)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}O.getShaderPrecisionFormat===void 0&&(O.getShaderPrecisionFormat=function(){return{rangeMin:1,rangeMax:1,precision:1}})}catch(S){throw console.error("THREE.WebGLRenderer: "+S.message),S}let fe,ee,le,ge,Me,ve,Q,te,ne,ue,ae,A,M,X,J,ce,pe,Pe,be,R,ie,re;function xe(){fe=new U0(O),ee=new B0(O,fe,r),fe.init(ee),ie=new fx(O,fe,ee),le=new hx(O,fe,ee),ge=new H0(O),Me=new Km,ve=new dx(O,fe,le,Me,ee,ie,ge),Q=new N0(g),te=new hp(O,ee),re=new z0(O,fe,te,ee),ne=new O0(O,te,ge,re),ue=new X0(O,ne,te,ge),Pe=new q0(O),J=new k0(Me),ae=new Qm(g,Q,fe,ee,re,J),A=new mx(Me),M=new nx(Me),X=new cx(fe,ee),pe=new D0(g,Q,le,ue,o),ce=new vu(g,ue,ee),be=new F0(O,fe,ge,ee),R=new G0(O,fe,ge,ee),ge.programs=ae.programs,g.capabilities=ee,g.extensions=fe,g.properties=Me,g.renderLists=M,g.shadowMap=ce,g.state=le,g.info=ge}xe();let j=new Da(g,O);this.xr=j,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let S=fe.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=fe.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return H},this.setPixelRatio=function(S){S!==void 0&&(H=S,this.setSize(F,k,!1))},this.getSize=function(S){return S===void 0&&(console.warn("WebGLRenderer: .getsize() now requires a Vector2 as an argument"),S=new K),S.set(F,k)},this.setSize=function(S,V,N){if(j.isPresenting){console.warn("THREE.WebGLRenderer: Can't change size while VR device is presenting.");return}F=S,k=V,e.width=Math.floor(S*H),e.height=Math.floor(V*H),N!==!1&&(e.style.width=S+"px",e.style.height=V+"px"),this.setViewport(0,0,S,V)},this.getDrawingBufferSize=function(S){return S===void 0&&(console.warn("WebGLRenderer: .getdrawingBufferSize() now requires a Vector2 as an argument"),S=new K),S.set(F*H,k*H).floor()},this.setDrawingBufferSize=function(S,V,N){F=S,k=V,H=N,e.width=Math.floor(S*N),e.height=Math.floor(V*N),this.setViewport(0,0,S,V)},this.getCurrentViewport=function(S){return S===void 0&&(console.warn("WebGLRenderer: .getCurrentViewport() now requires a Vector4 as an argument"),S=new Re),S.copy(y)},this.getViewport=function(S){return S.copy(D)},this.setViewport=function(S,V,N,Y){S.isVector4?D.set(S.x,S.y,S.z,S.w):D.set(S,V,N,Y),le.viewport(y.copy(D).multiplyScalar(H).floor())},this.getScissor=function(S){return S.copy(z)},this.setScissor=function(S,V,N,Y){S.isVector4?z.set(S.x,S.y,S.z,S.w):z.set(S,V,N,Y),le.scissor(P.copy(z).multiplyScalar(H).floor())},this.getScissorTest=function(){return T},this.setScissorTest=function(S){le.setScissorTest(T=S)},this.setOpaqueSort=function(S){B=S},this.setTransparentSort=function(S){L=S},this.getClearColor=function(S){return S===void 0&&(console.warn("WebGLRenderer: .getClearColor() now requires a Color as an argument"),S=new he),S.copy(pe.getClearColor())},this.setClearColor=function(){pe.setClearColor.apply(pe,arguments)},this.getClearAlpha=function(){return pe.getClearAlpha()},this.setClearAlpha=function(){pe.setClearAlpha.apply(pe,arguments)},this.clear=function(S,V,N){let Y=0;(S===void 0||S)&&(Y|=16384),(V===void 0||V)&&(Y|=256),(N===void 0||N)&&(Y|=1024),O.clear(Y)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){e.removeEventListener("webglcontextlost",ye,!1),e.removeEventListener("webglcontextrestored",De,!1),M.dispose(),X.dispose(),Me.dispose(),Q.dispose(),ue.dispose(),re.dispose(),j.dispose(),j.removeEventListener("sessionstart",wc),j.removeEventListener("sessionend",Mc),gn.stop()};function ye(S){S.preventDefault(),console.log("THREE.WebGLRenderer: Context Lost."),v=!0}function De(){console.log("THREE.WebGLRenderer: Context Restored."),v=!1;let S=ge.autoReset,V=ce.enabled,N=ce.autoUpdate,Y=ce.needsUpdate,oe=ce.type;xe(),ge.autoReset=S,ce.enabled=V,ce.autoUpdate=N,ce.needsUpdate=Y,ce.type=oe}function Xe(S){let V=S.target;V.removeEventListener("dispose",Xe),xn(V)}function xn(S){We(S),Me.remove(S)}function We(S){let V=Me.get(S).programs;V!==void 0&&V.forEach(function(N){ae.releaseProgram(N)})}function Ot(S,V){S.render(function(N){g.renderBufferImmediate(N,V)})}this.renderBufferImmediate=function(S,V){re.initAttributes();let N=Me.get(S);S.hasPositions&&!N.position&&(N.position=O.createBuffer()),S.hasNormals&&!N.normal&&(N.normal=O.createBuffer()),S.hasUvs&&!N.uv&&(N.uv=O.createBuffer()),S.hasColors&&!N.color&&(N.color=O.createBuffer());let Y=V.getAttributes();S.hasPositions&&(O.bindBuffer(34962,N.position),O.bufferData(34962,S.positionArray,35048),re.enableAttribute(Y.position),O.vertexAttribPointer(Y.position,3,5126,!1,0,0)),S.hasNormals&&(O.bindBuffer(34962,N.normal),O.bufferData(34962,S.normalArray,35048),re.enableAttribute(Y.normal),O.vertexAttribPointer(Y.normal,3,5126,!1,0,0)),S.hasUvs&&(O.bindBuffer(34962,N.uv),O.bufferData(34962,S.uvArray,35048),re.enableAttribute(Y.uv),O.vertexAttribPointer(Y.uv,2,5126,!1,0,0)),S.hasColors&&(O.bindBuffer(34962,N.color),O.bufferData(34962,S.colorArray,35048),re.enableAttribute(Y.color),O.vertexAttribPointer(Y.color,3,5126,!1,0,0)),re.disableUnusedAttributes(),O.drawArrays(4,0,S.count),S.count=0},this.renderBufferDirect=function(S,V,N,Y,oe,Le){V===null&&(V=G);let _e=oe.isMesh&&oe.matrixWorld.determinant()<0,Ee=Lc(S,V,Y,oe);le.setMaterial(Y,_e);let Ne=N.index,Se=N.attributes.position;if(Ne===null){if(Se===void 0||Se.count===0)return}else if(Ne.count===0)return;let Ce=1;Y.wireframe===!0&&(Ne=ne.getWireframeAttribute(N),Ce=2),(Y.morphTargets||Y.morphNormals)&&Pe.update(oe,N,Y,Ee),re.setup(oe,Y,Ee,N,Ne);let we,ze=be;Ne!==null&&(we=te.get(Ne),ze=R,ze.setIndex(we));let It=Ne!==null?Ne.count:Se.count,ot=N.drawRange.start*Ce,vn=N.drawRange.count*Ce,Ze=Le!==null?Le.start*Ce:0,yn=Le!==null?Le.count*Ce:1/0,Ye=Math.max(ot,Ze),Hs=Math.min(It,ot+vn,Ze+yn)-1,ht=Math.max(0,Hs-Ye+1);if(ht!==0){if(oe.isMesh)Y.wireframe===!0?(le.setLineWidth(Y.wireframeLinewidth*q()),ze.setMode(1)):ze.setMode(4);else if(oe.isLine){let Gt=Y.linewidth;Gt===void 0&&(Gt=1),le.setLineWidth(Gt*q()),oe.isLineSegments?ze.setMode(1):oe.isLineLoop?ze.setMode(2):ze.setMode(3)}else oe.isPoints?ze.setMode(0):oe.isSprite&&ze.setMode(4);if(oe.isInstancedMesh)ze.renderInstances(Ye,ht,oe.count);else if(N.isInstancedBufferGeometry){let Gt=Math.min(N.instanceCount,N._maxInstanceCount);ze.renderInstances(Ye,ht,Gt)}else ze.render(Ye,ht)}},this.compile=function(S,V){d=X.get(S),d.init(),S.traverseVisible(function(N){N.isLight&&N.layers.test(V.layers)&&(d.pushLight(N),N.castShadow&&d.pushShadow(N))}),d.setupLights(),S.traverse(function(N){let Y=N.material;if(Y)if(Array.isArray(Y))for(let oe=0;oe<Y.length;oe++){let Le=Y[oe];Gs(Le,S,N)}else Gs(Y,S,N)})};let Mt=null;function ad(S){Mt&&Mt(S)}function wc(){gn.stop()}function Mc(){gn.start()}let gn=new uu;gn.setAnimationLoop(ad),typeof window<"u"&&gn.setContext(window),this.setAnimationLoop=function(S){Mt=S,j.setAnimationLoop(S),S===null?gn.stop():gn.start()},j.addEventListener("sessionstart",wc),j.addEventListener("sessionend",Mc),this.render=function(S,V){let N,Y;if(arguments[2]!==void 0&&(console.warn("THREE.WebGLRenderer.render(): the renderTarget argument has been removed. Use .setRenderTarget() instead."),N=arguments[2]),arguments[3]!==void 0&&(console.warn("THREE.WebGLRenderer.render(): the forceClear argument has been removed. Use .clear() instead."),Y=arguments[3]),V!==void 0&&V.isCamera!==!0){console.error("THREE.WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(v===!0)return;S.autoUpdate===!0&&S.updateMatrixWorld(),V.parent===null&&V.updateMatrixWorld(),j.enabled===!0&&j.isPresenting===!0&&(V=j.getCamera(V)),S.isScene===!0&&S.onBeforeRender(g,S,V,N||b),d=X.get(S,p.length),d.init(),p.push(d),U.multiplyMatrices(V.projectionMatrix,V.matrixWorldInverse),I.setFromProjectionMatrix(U),$=this.localClippingEnabled,Z=J.init(this.clippingPlanes,$,V),h=M.get(S,f.length),h.init(),f.push(h),Sc(S,V,0,g.sortObjects),h.finish(),g.sortObjects===!0&&h.sort(B,L),Z===!0&&J.beginShadows();let oe=d.state.shadowsArray;ce.render(oe,S,V),d.setupLights(),d.setupLightsView(V),Z===!0&&J.endShadows(),this.info.autoReset===!0&&this.info.reset(),N!==void 0&&this.setRenderTarget(N),pe.render(h,S,V,Y);let Le=h.opaque,_e=h.transparent;Le.length>0&&Ec(Le,S,V),_e.length>0&&Ec(_e,S,V),b!==null&&(ve.updateRenderTargetMipmap(b),ve.updateMultisampleRenderTarget(b)),S.isScene===!0&&S.onAfterRender(g,S,V),le.buffers.depth.setTest(!0),le.buffers.depth.setMask(!0),le.buffers.color.setMask(!0),le.setPolygonOffset(!1),re.resetDefaultState(),_=-1,w=null,p.pop(),p.length>0?d=p[p.length-1]:d=null,f.pop(),f.length>0?h=f[f.length-1]:h=null};function Sc(S,V,N,Y){if(S.visible===!1)return;if(S.layers.test(V.layers)){if(S.isGroup)N=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(V);else if(S.isLight)d.pushLight(S),S.castShadow&&d.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||I.intersectsSprite(S)){Y&&W.setFromMatrixPosition(S.matrixWorld).applyMatrix4(U);let _e=ue.update(S),Ee=S.material;Ee.visible&&h.push(S,_e,Ee,N,W.z,null)}}else if(S.isImmediateRenderObject)Y&&W.setFromMatrixPosition(S.matrixWorld).applyMatrix4(U),h.push(S,null,S.material,N,W.z,null);else if((S.isMesh||S.isLine||S.isPoints)&&(S.isSkinnedMesh&&S.skeleton.frame!==ge.render.frame&&(S.skeleton.update(),S.skeleton.frame=ge.render.frame),!S.frustumCulled||I.intersectsObject(S))){Y&&W.setFromMatrixPosition(S.matrixWorld).applyMatrix4(U);let _e=ue.update(S),Ee=S.material;if(Array.isArray(Ee)){let Ne=_e.groups;for(let Se=0,Ce=Ne.length;Se<Ce;Se++){let we=Ne[Se],ze=Ee[we.materialIndex];ze&&ze.visible&&h.push(S,_e,ze,N,W.z,we)}}else Ee.visible&&h.push(S,_e,Ee,N,W.z,null)}}let Le=S.children;for(let _e=0,Ee=Le.length;_e<Ee;_e++)Sc(Le[_e],V,N,Y)}function Ec(S,V,N){let Y=V.isScene===!0?V.overrideMaterial:null;for(let oe=0,Le=S.length;oe<Le;oe++){let _e=S[oe],Ee=_e.object,Ne=_e.geometry,Se=Y===null?_e.material:Y,Ce=_e.group;if(N.isArrayCamera){let we=N.cameras;for(let ze=0,It=we.length;ze<It;ze++){let ot=we[ze];Ee.layers.test(ot.layers)&&(le.viewport(y.copy(ot.viewport)),d.setupLightsView(ot),Tc(Ee,V,ot,Ne,Se,Ce))}}else Tc(Ee,V,N,Ne,Se,Ce)}}function Tc(S,V,N,Y,oe,Le){if(S.onBeforeRender(g,V,N,Y,oe,Le),S.modelViewMatrix.multiplyMatrices(N.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),S.isImmediateRenderObject){let _e=Lc(N,V,oe,S);le.setMaterial(oe),re.reset(),Ot(S,_e)}else g.renderBufferDirect(N,V,Y,oe,S,Le);S.onAfterRender(g,V,N,Y,oe,Le)}function Gs(S,V,N){V.isScene!==!0&&(V=G);let Y=Me.get(S),oe=d.state.lights,Le=d.state.shadowsArray,_e=oe.state.version,Ee=ae.getParameters(S,oe.state,Le,V,N),Ne=ae.getProgramCacheKey(Ee),Se=Y.programs;Y.environment=S.isMeshStandardMaterial?V.environment:null,Y.fog=V.fog,Y.envMap=Q.get(S.envMap||Y.environment),Se===void 0&&(S.addEventListener("dispose",Xe),Se=new Map,Y.programs=Se);let Ce=Se.get(Ne);if(Ce!==void 0){if(Y.currentProgram===Ce&&Y.lightsStateVersion===_e)return Ac(S,Ee),Ce}else Ee.uniforms=ae.getUniforms(S),S.onBuild(Ee,g),S.onBeforeCompile(Ee,g),Ce=ae.acquireProgram(Ee,Ne),Se.set(Ne,Ce),Y.uniforms=Ee.uniforms;let we=Y.uniforms;(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(we.clippingPlanes=J.uniform),Ac(S,Ee),Y.needsLights=cd(S),Y.lightsStateVersion=_e,Y.needsLights&&(we.ambientLightColor.value=oe.state.ambient,we.lightProbe.value=oe.state.probe,we.directionalLights.value=oe.state.directional,we.directionalLightShadows.value=oe.state.directionalShadow,we.spotLights.value=oe.state.spot,we.spotLightShadows.value=oe.state.spotShadow,we.rectAreaLights.value=oe.state.rectArea,we.ltc_1.value=oe.state.rectAreaLTC1,we.ltc_2.value=oe.state.rectAreaLTC2,we.pointLights.value=oe.state.point,we.pointLightShadows.value=oe.state.pointShadow,we.hemisphereLights.value=oe.state.hemi,we.directionalShadowMap.value=oe.state.directionalShadowMap,we.directionalShadowMatrix.value=oe.state.directionalShadowMatrix,we.spotShadowMap.value=oe.state.spotShadowMap,we.spotShadowMatrix.value=oe.state.spotShadowMatrix,we.pointShadowMap.value=oe.state.pointShadowMap,we.pointShadowMatrix.value=oe.state.pointShadowMatrix);let ze=Ce.getUniforms(),It=cn.seqWithValue(ze.seq,we);return Y.currentProgram=Ce,Y.uniformsList=It,Ce}function Ac(S,V){let N=Me.get(S);N.outputEncoding=V.outputEncoding,N.instancing=V.instancing,N.numClippingPlanes=V.numClippingPlanes,N.numIntersection=V.numClipIntersection,N.vertexAlphas=V.vertexAlphas}function Lc(S,V,N,Y){V.isScene!==!0&&(V=G),ve.resetTextureUnits();let oe=V.fog,Le=N.isMeshStandardMaterial?V.environment:null,_e=b===null?g.outputEncoding:b.texture.encoding,Ee=Q.get(N.envMap||Le),Ne=N.vertexColors===!0&&Y.geometry&&Y.geometry.attributes.color&&Y.geometry.attributes.color.itemSize===4,Se=Me.get(N),Ce=d.state.lights;if(Z===!0&&($===!0||S!==w)){let Ye=S===w&&N.id===_;J.setState(N,S,Ye)}let we=!1;N.version===Se.__version?(Se.needsLights&&Se.lightsStateVersion!==Ce.state.version||Se.outputEncoding!==_e||Y.isInstancedMesh&&Se.instancing===!1||!Y.isInstancedMesh&&Se.instancing===!0||Se.envMap!==Ee||N.fog&&Se.fog!==oe||Se.numClippingPlanes!==void 0&&(Se.numClippingPlanes!==J.numPlanes||Se.numIntersection!==J.numIntersection)||Se.vertexAlphas!==Ne)&&(we=!0):(we=!0,Se.__version=N.version);let ze=Se.currentProgram;we===!0&&(ze=Gs(N,V,Y));let It=!1,ot=!1,vn=!1,Ze=ze.getUniforms(),yn=Se.uniforms;if(le.useProgram(ze.program)&&(It=!0,ot=!0,vn=!0),N.id!==_&&(_=N.id,ot=!0),It||w!==S){if(Ze.setValue(O,"projectionMatrix",S.projectionMatrix),ee.logarithmicDepthBuffer&&Ze.setValue(O,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),w!==S&&(w=S,ot=!0,vn=!0),N.isShaderMaterial||N.isMeshPhongMaterial||N.isMeshToonMaterial||N.isMeshStandardMaterial||N.envMap){let Ye=Ze.map.cameraPosition;Ye!==void 0&&Ye.setValue(O,W.setFromMatrixPosition(S.matrixWorld))}(N.isMeshPhongMaterial||N.isMeshToonMaterial||N.isMeshLambertMaterial||N.isMeshBasicMaterial||N.isMeshStandardMaterial||N.isShaderMaterial)&&Ze.setValue(O,"isOrthographic",S.isOrthographicCamera===!0),(N.isMeshPhongMaterial||N.isMeshToonMaterial||N.isMeshLambertMaterial||N.isMeshBasicMaterial||N.isMeshStandardMaterial||N.isShaderMaterial||N.isShadowMaterial||N.skinning)&&Ze.setValue(O,"viewMatrix",S.matrixWorldInverse)}if(N.skinning){Ze.setOptional(O,Y,"bindMatrix"),Ze.setOptional(O,Y,"bindMatrixInverse");let Ye=Y.skeleton;if(Ye){let Hs=Ye.bones;if(ee.floatVertexTextures){if(Ye.boneTexture===null){let ht=Math.sqrt(Hs.length*4);ht=Yf(ht),ht=Math.max(ht,4);let Gt=new Float32Array(ht*ht*4);Gt.set(Ye.boneMatrices);let ld=new ns(Gt,ht,ht,Pt,on);Ye.boneMatrices=Gt,Ye.boneTexture=ld,Ye.boneTextureSize=ht}Ze.setValue(O,"boneTexture",Ye.boneTexture,ve),Ze.setValue(O,"boneTextureSize",Ye.boneTextureSize)}else Ze.setOptional(O,Ye,"boneMatrices")}}return(ot||Se.receiveShadow!==Y.receiveShadow)&&(Se.receiveShadow=Y.receiveShadow,Ze.setValue(O,"receiveShadow",Y.receiveShadow)),ot&&(Ze.setValue(O,"toneMappingExposure",g.toneMappingExposure),Se.needsLights&&od(yn,vn),oe&&N.fog&&A.refreshFogUniforms(yn,oe),A.refreshMaterialUniforms(yn,N,H,k),cn.upload(O,Se.uniformsList,yn,ve)),N.isShaderMaterial&&N.uniformsNeedUpdate===!0&&(cn.upload(O,Se.uniformsList,yn,ve),N.uniformsNeedUpdate=!1),N.isSpriteMaterial&&Ze.setValue(O,"center",Y.center),Ze.setValue(O,"modelViewMatrix",Y.modelViewMatrix),Ze.setValue(O,"normalMatrix",Y.normalMatrix),Ze.setValue(O,"modelMatrix",Y.matrixWorld),ze}function od(S,V){S.ambientLightColor.needsUpdate=V,S.lightProbe.needsUpdate=V,S.directionalLights.needsUpdate=V,S.directionalLightShadows.needsUpdate=V,S.pointLights.needsUpdate=V,S.pointLightShadows.needsUpdate=V,S.spotLights.needsUpdate=V,S.spotLightShadows.needsUpdate=V,S.rectAreaLights.needsUpdate=V,S.hemisphereLights.needsUpdate=V}function cd(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return x},this.getActiveMipmapLevel=function(){return m},this.getRenderTarget=function(){return b},this.setRenderTarget=function(S,V=0,N=0){b=S,x=V,m=N,S&&Me.get(S).__webglFramebuffer===void 0&&ve.setupRenderTarget(S);let Y=null,oe=!1,Le=!1;if(S){let _e=S.texture;(_e.isDataTexture3D||_e.isDataTexture2DArray)&&(Le=!0);let Ee=Me.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Y=Ee[V],oe=!0):S.isWebGLMultisampleRenderTarget?Y=Me.get(S).__webglMultisampledFramebuffer:Y=Ee,y.copy(S.viewport),P.copy(S.scissor),C=S.scissorTest}else y.copy(D).multiplyScalar(H).floor(),P.copy(z).multiplyScalar(H).floor(),C=T;if(le.bindFramebuffer(36160,Y),le.viewport(y),le.scissor(P),le.setScissorTest(C),oe){let _e=Me.get(S.texture);O.framebufferTexture2D(36160,36064,34069+V,_e.__webglTexture,N)}else if(Le){let _e=Me.get(S.texture),Ee=V||0;O.framebufferTextureLayer(36160,36064,_e.__webglTexture,N||0,Ee)}},this.readRenderTargetPixels=function(S,V,N,Y,oe,Le,_e){if(!(S&&S.isWebGLRenderTarget)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Ee=Me.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&_e!==void 0&&(Ee=Ee[_e]),Ee){le.bindFramebuffer(36160,Ee);try{let Ne=S.texture,Se=Ne.format,Ce=Ne.type;if(Se!==Pt&&ie.convert(Se)!==O.getParameter(35739)){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}let we=Ce===$r&&(fe.has("EXT_color_buffer_half_float")||ee.isWebGL2&&fe.has("EXT_color_buffer_float"));if(Ce!==Xo&&ie.convert(Ce)!==O.getParameter(35738)&&!(Ce===on&&(ee.isWebGL2||fe.has("OES_texture_float")||fe.has("WEBGL_color_buffer_float")))&&!we){console.error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O.checkFramebufferStatus(36160)===36053?V>=0&&V<=S.width-Y&&N>=0&&N<=S.height-oe&&O.readPixels(V,N,Y,oe,ie.convert(Se),ie.convert(Ce),Le):console.error("THREE.WebGLRenderer.readRenderTargetPixels: readPixels from renderTarget failed. Framebuffer not complete.")}finally{let Ne=b!==null?Me.get(b).__webglFramebuffer:null;le.bindFramebuffer(36160,Ne)}}},this.copyFramebufferToTexture=function(S,V,N=0){let Y=Math.pow(2,-N),oe=Math.floor(V.image.width*Y),Le=Math.floor(V.image.height*Y),_e=ie.convert(V.format);ve.setTexture2D(V,0),O.copyTexImage2D(3553,N,_e,S.x,S.y,oe,Le,0),le.unbindTexture()},this.copyTextureToTexture=function(S,V,N,Y=0){let oe=V.image.width,Le=V.image.height,_e=ie.convert(N.format),Ee=ie.convert(N.type);ve.setTexture2D(N,0),O.pixelStorei(37440,N.flipY),O.pixelStorei(37441,N.premultiplyAlpha),O.pixelStorei(3317,N.unpackAlignment),V.isDataTexture?O.texSubImage2D(3553,Y,S.x,S.y,oe,Le,_e,Ee,V.image.data):V.isCompressedTexture?O.compressedTexSubImage2D(3553,Y,S.x,S.y,V.mipmaps[0].width,V.mipmaps[0].height,_e,V.mipmaps[0].data):O.texSubImage2D(3553,Y,S.x,S.y,_e,Ee,V.image),Y===0&&N.generateMipmaps&&O.generateMipmap(3553),le.unbindTexture()},this.copyTextureToTexture3D=function(S,V,N,Y,oe=0){if(g.isWebGL1Renderer){console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: can only be used with WebGL2.");return}let{width:Le,height:_e,data:Ee}=N.image,Ne=ie.convert(Y.format),Se=ie.convert(Y.type),Ce;if(Y.isDataTexture3D)ve.setTexture3D(Y,0),Ce=32879;else if(Y.isDataTexture2DArray)ve.setTexture2DArray(Y,0),Ce=35866;else{console.warn("THREE.WebGLRenderer.copyTextureToTexture3D: only supports THREE.DataTexture3D and THREE.DataTexture2DArray.");return}O.pixelStorei(37440,Y.flipY),O.pixelStorei(37441,Y.premultiplyAlpha),O.pixelStorei(3317,Y.unpackAlignment);let we=O.getParameter(3314),ze=O.getParameter(32878),It=O.getParameter(3316),ot=O.getParameter(3315),vn=O.getParameter(32877);O.pixelStorei(3314,Le),O.pixelStorei(32878,_e),O.pixelStorei(3316,S.min.x),O.pixelStorei(3315,S.min.y),O.pixelStorei(32877,S.min.z),O.texSubImage3D(Ce,oe,V.x,V.y,V.z,S.max.x-S.min.x+1,S.max.y-S.min.y+1,S.max.z-S.min.z+1,Ne,Se,Ee),O.pixelStorei(3314,we),O.pixelStorei(32878,ze),O.pixelStorei(3316,It),O.pixelStorei(3315,ot),O.pixelStorei(32877,vn),oe===0&&Y.generateMipmaps&&O.generateMipmap(Ce),le.unbindTexture()},this.initTexture=function(S){ve.setTexture2D(S,0),le.unbindTexture()},this.resetState=function(){x=0,m=0,b=null,le.reset(),re.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}function zr(r,e,t,n,i,s){Xn.subVectors(r,t).addScalar(.5).multiply(n),i!==void 0?(Ai.x=s*Xn.x-i*Xn.y,Ai.y=i*Xn.x+s*Xn.y):Ai.copy(Xn),r.copy(e),r.x+=Ai.x,r.y+=Ai.y,r.applyMatrix4(yu)}function Ol(r,e,t,n,i,s,a){let o=Ga.distanceSqToPoint(r);if(o<t){let c=new E;Ga.closestPointToPoint(r,c),c.applyMatrix4(n);let l=i.ray.origin.distanceTo(c);if(l<i.near||l>i.far)return;s.push({distance:l,distanceToRay:Math.sqrt(o),point:c,index:e,face:null,object:a})}}function bu(r,e,t,n,i){let s,a;if(i===zx(r,e,t,n)>0)for(s=e;s<t;s+=n)a=Gl(s,r[s],r[s+1],a);else for(s=t-n;s>=e;s-=n)a=Gl(s,r[s],r[s+1],a);return a&&Es(a,a.next)&&(Ki(a),a=a.next),a}function fn(r,e){if(!r)return r;e||(e=r);let t=r,n;do if(n=!1,!t.steiner&&(Es(t,t.next)||Ve(t.prev,t,t.next)===0)){if(Ki(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function ji(r,e,t,n,i,s,a){if(!r)return;!a&&s&&Lx(r,n,i,s);let o=r,c,l;for(;r.prev!==r.next;){if(c=r.prev,l=r.next,s?bx(r,n,i,s):yx(r)){e.push(c.i/t),e.push(r.i/t),e.push(l.i/t),Ki(r),r=l.next,o=l.next;continue}if(r=l,r===o){a?a===1?(r=_x(fn(r),e,t),ji(r,e,t,n,i,s,2)):a===2&&wx(r,e,t,n,i,s):ji(fn(r),e,t,n,i,s,1);break}}}function yx(r){let e=r.prev,t=r,n=r.next;if(Ve(e,t,n)>=0)return!1;let i=r.next.next;for(;i!==r.prev;){if(jn(e.x,e.y,t.x,t.y,n.x,n.y,i.x,i.y)&&Ve(i.prev,i,i.next)>=0)return!1;i=i.next}return!0}function bx(r,e,t,n){let i=r.prev,s=r,a=r.next;if(Ve(i,s,a)>=0)return!1;let o=i.x<s.x?i.x<a.x?i.x:a.x:s.x<a.x?s.x:a.x,c=i.y<s.y?i.y<a.y?i.y:a.y:s.y<a.y?s.y:a.y,l=i.x>s.x?i.x>a.x?i.x:a.x:s.x>a.x?s.x:a.x,u=i.y>s.y?i.y>a.y?i.y:a.y:s.y>a.y?s.y:a.y,h=Xa(o,c,e,t,n),d=Xa(l,u,e,t,n),f=r.prevZ,p=r.nextZ;for(;f&&f.z>=h&&p&&p.z<=d;){if(f!==r.prev&&f!==r.next&&jn(i.x,i.y,s.x,s.y,a.x,a.y,f.x,f.y)&&Ve(f.prev,f,f.next)>=0||(f=f.prevZ,p!==r.prev&&p!==r.next&&jn(i.x,i.y,s.x,s.y,a.x,a.y,p.x,p.y)&&Ve(p.prev,p,p.next)>=0))return!1;p=p.nextZ}for(;f&&f.z>=h;){if(f!==r.prev&&f!==r.next&&jn(i.x,i.y,s.x,s.y,a.x,a.y,f.x,f.y)&&Ve(f.prev,f,f.next)>=0)return!1;f=f.prevZ}for(;p&&p.z<=d;){if(p!==r.prev&&p!==r.next&&jn(i.x,i.y,s.x,s.y,a.x,a.y,p.x,p.y)&&Ve(p.prev,p,p.next)>=0)return!1;p=p.nextZ}return!0}function _x(r,e,t){let n=r;do{let i=n.prev,s=n.next.next;!Es(i,s)&&_u(i,n,n.next,s)&&Qi(i,s)&&Qi(s,i)&&(e.push(i.i/t),e.push(n.i/t),e.push(s.i/t),Ki(n),Ki(n.next),n=r=s),n=n.next}while(n!==r);return fn(n)}function wx(r,e,t,n,i,s){let a=r;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&Rx(a,o)){let c=wu(a,o);a=fn(a,a.next),c=fn(c,c.next),ji(a,e,t,n,i,s),ji(c,e,t,n,i,s);return}o=o.next}a=a.next}while(a!==r)}function Mx(r,e,t,n){let i=[],s,a,o,c,l;for(s=0,a=e.length;s<a;s++)o=e[s]*n,c=s<a-1?e[s+1]*n:r.length,l=bu(r,o,c,n,!1),l===l.next&&(l.steiner=!0),i.push(Cx(l));for(i.sort(Sx),s=0;s<i.length;s++)Ex(i[s],t),t=fn(t,t.next);return t}function Sx(r,e){return r.x-e.x}function Ex(r,e){if(e=Tx(r,e),e){let t=wu(e,r);fn(e,e.next),fn(t,t.next)}}function Tx(r,e){let t=e,n=r.x,i=r.y,s=-1/0,a;do{if(i<=t.y&&i>=t.next.y&&t.next.y!==t.y){let d=t.x+(i-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>s){if(s=d,d===n){if(i===t.y)return t;if(i===t.next.y)return t.next}a=t.x<t.next.x?t:t.next}}t=t.next}while(t!==e);if(!a)return null;if(n===s)return a;let o=a,c=a.x,l=a.y,u=1/0,h;t=a;do n>=t.x&&t.x>=c&&n!==t.x&&jn(i<l?n:s,i,c,l,i<l?s:n,i,t.x,t.y)&&(h=Math.abs(i-t.y)/(n-t.x),Qi(t,r)&&(h<u||h===u&&(t.x>a.x||t.x===a.x&&Ax(a,t)))&&(a=t,u=h)),t=t.next;while(t!==o);return a}function Ax(r,e){return Ve(r.prev,r,e.prev)<0&&Ve(e.next,r,r.next)<0}function Lx(r,e,t,n){let i=r;do i.z===null&&(i.z=Xa(i.x,i.y,e,t,n)),i.prevZ=i.prev,i.nextZ=i.next,i=i.next;while(i!==r);i.prevZ.nextZ=null,i.prevZ=null,Px(i)}function Px(r){let e,t,n,i,s,a,o,c,l=1;do{for(t=r,r=null,s=null,a=0;t;){for(a++,n=t,o=0,e=0;e<l&&(o++,n=n.nextZ,!!n);e++);for(c=l;o>0||c>0&&n;)o!==0&&(c===0||!n||t.z<=n.z)?(i=t,t=t.nextZ,o--):(i=n,n=n.nextZ,c--),s?s.nextZ=i:r=i,i.prevZ=s,s=i;t=n}s.nextZ=null,l*=2}while(a>1);return r}function Xa(r,e,t,n,i){return r=32767*(r-t)*i,e=32767*(e-n)*i,r=(r|r<<8)&16711935,r=(r|r<<4)&252645135,r=(r|r<<2)&858993459,r=(r|r<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,r|e<<1}function Cx(r){let e=r,t=r;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==r);return t}function jn(r,e,t,n,i,s,a,o){return(i-a)*(e-o)-(r-a)*(s-o)>=0&&(r-a)*(n-o)-(t-a)*(e-o)>=0&&(t-a)*(s-o)-(i-a)*(n-o)>=0}function Rx(r,e){return r.next.i!==e.i&&r.prev.i!==e.i&&!Ix(r,e)&&(Qi(r,e)&&Qi(e,r)&&Dx(r,e)&&(Ve(r.prev,r,e.prev)||Ve(r,e.prev,e))||Es(r,e)&&Ve(r.prev,r,r.next)>0&&Ve(e.prev,e,e.next)>0)}function Ve(r,e,t){return(e.y-r.y)*(t.x-e.x)-(e.x-r.x)*(t.y-e.y)}function Es(r,e){return r.x===e.x&&r.y===e.y}function _u(r,e,t,n){let i=Or(Ve(r,e,t)),s=Or(Ve(r,e,n)),a=Or(Ve(t,n,r)),o=Or(Ve(t,n,e));return!!(i!==s&&a!==o||i===0&&Ur(r,t,e)||s===0&&Ur(r,n,e)||a===0&&Ur(t,r,n)||o===0&&Ur(t,e,n))}function Ur(r,e,t){return e.x<=Math.max(r.x,t.x)&&e.x>=Math.min(r.x,t.x)&&e.y<=Math.max(r.y,t.y)&&e.y>=Math.min(r.y,t.y)}function Or(r){return r>0?1:r<0?-1:0}function Ix(r,e){let t=r;do{if(t.i!==r.i&&t.next.i!==r.i&&t.i!==e.i&&t.next.i!==e.i&&_u(t,t.next,r,e))return!0;t=t.next}while(t!==r);return!1}function Qi(r,e){return Ve(r.prev,r,r.next)<0?Ve(r,e,r.next)>=0&&Ve(r,r.prev,e)>=0:Ve(r,e,r.prev)<0||Ve(r,r.next,e)<0}function Dx(r,e){let t=r,n=!1,i=(r.x+e.x)/2,s=(r.y+e.y)/2;do t.y>s!=t.next.y>s&&t.next.y!==t.y&&i<(t.next.x-t.x)*(s-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==r);return n}function wu(r,e){let t=new Ya(r.i,r.x,r.y),n=new Ya(e.i,e.x,e.y),i=r.next,s=e.prev;return r.next=e,e.prev=r,t.next=i,i.prev=t,n.next=t,t.prev=n,s.next=n,n.prev=s,n}function Gl(r,e,t,n){let i=new Ya(r,e,t);return n?(i.next=n.next,i.prev=n,n.next.prev=i,n.next=i):(i.prev=i,i.next=i),i}function Ki(r){r.next.prev=r.prev,r.prev.next=r.next,r.prevZ&&(r.prevZ.nextZ=r.nextZ),r.nextZ&&(r.nextZ.prevZ=r.prevZ)}function Ya(r,e,t){this.i=r,this.x=e,this.y=t,this.prev=null,this.next=null,this.z=null,this.prevZ=null,this.nextZ=null,this.steiner=!1}function zx(r,e,t,n){let i=0;for(let s=e,a=t-n;s<t;s+=n)i+=(r[a]-r[s])*(r[s+1]+r[a+1]),a=s;return i}function Hl(r){let e=r.length;e>2&&r[e-1].equals(r[0])&&r.pop()}function Vl(r,e){for(let t=0;t<e.length;t++)r.push(e[t].x),r.push(e[t].y)}function Bx(r,e,t){if(t.shapes=[],Array.isArray(r))for(let n=0,i=r.length;n<i;n++){let s=r[n];t.shapes.push(s.uuid)}else t.shapes.push(r.uuid);return e.extrudePath!==void 0&&(t.options.extrudePath=e.extrudePath.toJSON()),t}function kx(r,e){if(e.shapes=[],Array.isArray(r))for(let t=0,n=r.length;t<n;t++){let i=r[t];e.shapes.push(i.uuid)}else e.shapes.push(r.uuid);return e}function Nx(r){switch(r.toLowerCase()){case"scalar":case"double":case"float":case"number":case"integer":return si;case"vector":case"vector2":case"vector3":case"vector4":return ai;case"color":return hs;case"quaternion":return An;case"bool":case"boolean":return pn;case"string":return mn}throw new Error("THREE.KeyframeTrack: Unsupported typeName: "+r)}function Ux(r){if(r.type===void 0)throw new Error("THREE.KeyframeTrack: track type undefined, can not parse");let e=Nx(r.type);if(r.times===void 0){let t=[],n=[];Ge.flattenJSON(r.keys,t,n,"value"),r.times=t,r.values=n}return e.parse!==void 0?e.parse(r):new e(r.name,r.times,r.values,r.interpolation)}function Zo(){let r=0,e=0,t=0,n=0;function i(s,a,o,c){r=s,e=o,t=-3*s+3*a-2*o-c,n=2*s-2*a+o+c}return{initCatmullRom:function(s,a,o,c,l){i(a,o,l*(o-s),l*(c-a))},initNonuniformCatmullRom:function(s,a,o,c,l,u,h){let d=(a-s)/l-(o-s)/(l+u)+(o-a)/u,f=(o-a)/u-(c-a)/(u+h)+(c-o)/h;d*=u,f*=u,i(a,o,d,f)},calc:function(s){let a=s*s,o=a*s;return r+e*s+t*a+n*o}}}function Wl(r,e,t,n,i){let s=(n-e)*.5,a=(i-t)*.5,o=r*r,c=r*o;return(2*t-2*n+s+a)*c+(-3*t+3*n-2*s-a)*o+s*r+t}function Gx(r,e){let t=1-r;return t*t*e}function Hx(r,e){return 2*(1-r)*r*e}function Vx(r,e){return r*r*e}function Ni(r,e,t,n){return Gx(r,e)+Hx(r,t)+Vx(r,n)}function Wx(r,e){let t=1-r;return t*t*t*e}function qx(r,e){let t=1-r;return 3*t*t*r*e}function Xx(r,e){return 3*(1-r)*r*r*e}function Yx(r,e){return r*r*r*e}function Ui(r,e,t,n,i){return Wx(r,e)+qx(r,t)+Xx(r,n)+Yx(r,i)}function Zx(r,e,t){let n=Array.from(r),i=e/t.resolution,s=(t.boundingBox.yMax-t.boundingBox.yMin+t.underlineThickness)*i,a=[],o=0,c=0;for(let l=0;l<n.length;l++){let u=n[l];if(u===`
`)o=0,c-=s;else{let h=Jx(u,i,o,c,t);o+=h.offsetX,a.push(h.path)}}return a}function Jx(r,e,t,n,i){let s=i.glyphs[r]||i.glyphs["?"];if(!s){console.error('THREE.Font: character "'+r+'" does not exists in font family '+i.familyName+".");return}let a=new wo,o,c,l,u,h,d,f,p;if(s.o){let g=s._cachedOutline||(s._cachedOutline=s.o.split(" "));for(let v=0,x=g.length;v<x;)switch(g[v++]){case"m":o=g[v++]*e+t,c=g[v++]*e+n,a.moveTo(o,c);break;case"l":o=g[v++]*e+t,c=g[v++]*e+n,a.lineTo(o,c);break;case"q":l=g[v++]*e+t,u=g[v++]*e+n,h=g[v++]*e+t,d=g[v++]*e+n,a.quadraticCurveTo(h,d,l,u);break;case"b":l=g[v++]*e+t,u=g[v++]*e+n,h=g[v++]*e+t,d=g[v++]*e+n,f=g[v++]*e+t,p=g[v++]*e+n,a.bezierCurveTo(h,d,f,p,l,u);break}}return{offsetX:s.ha*e,path:a}}function Mu(r){let e=[];r&&r.isBone&&e.push(r);for(let t=0;t<r.children.length;t++)e.push.apply(e,Mu(r.children[t]));return e}function lg(){let r=[],e=[],t=[],n=Oi;for(let i=0;i<og;i++){let s=Math.pow(2,n);e.push(s);let a=1/s;i>Oi-Xr?a=Su[i-Oi+Xr-1]:i==0&&(a=0),t.push(a);let o=1/(s-1),c=-o/2,l=1+o/2,u=[c,c,l,c,l,l,c,c,l,l,c,l],h=6,d=6,f=3,p=2,g=1,v=new Float32Array(f*d*h),x=new Float32Array(p*d*h),m=new Float32Array(g*d*h);for(let _=0;_<h;_++){let w=_%3*2/3-1,y=_>2?0:-1,P=[w,y,0,w+2/3,y,0,w+2/3,y+1,0,w,y,0,w+2/3,y+1,0,w,y+1,0];v.set(P,f*d*_),x.set(u,p*d*_);let C=[_,_,_,_,_,_];m.set(C,g*d*_)}let b=new Ie;b.setAttribute("position",new Ue(v,f)),b.setAttribute("uv",new Ue(x,p)),b.setAttribute("faceIndex",new Ue(m,g)),r.push(b),n>Xr&&n--}return{_lodPlanes:r,_sizeLods:e,_sigmas:t}}var md,Dc,xd,jl,gd,Ri,Ms,Qe,hi,Ql,Di,zi,zc,Fc,Bc,vd,$n,yd,bd,kc,Nc,_d,wd,Md,Sd,Kl,eu,Ed,Td,Ad,Ld,Pd,Cd,Rd,Id,Sa,Dd,zd,Fd,Bd,Ss,kd,Nd,Fi,Ud,Od,Gd,Hd,Vd,tu,Go,Ho,Uc,Oc,Vo,Wo,Ea,Lt,Ta,ct,Gc,Hc,vt,Wd,qo,Xo,qd,Xd,Yr,Yd,qr,on,$r,$d,Zd,Jd,Bi,jd,Mn,Pt,Qd,Kd,Qn,Gi,ef,tf,nf,rf,sf,af,Vc,Wc,qc,Xc,Yc,$c,Zc,Jc,of,jc,Qc,cf,lf,uf,hf,df,ff,pf,mf,xf,gf,vf,yf,bf,_f,wf,Mf,Sf,Ef,Tf,Af,Lf,Pf,Cf,Rf,If,Df,zf,Ff,Bf,kf,Nf,Uf,Zr,Jr,Vs,Zn,Jn,jr,Yo,nu,Of,di,$o,iu,ru,Gf,su,au,ou,Hf,Vf,fi,Wf,Ws,qf,Hi,Qr,Kc,Jt,et,qs,Aa,K,Je,Cn,un,Zf,rt,Re,$t,La,tt,E,$s,tl,ft,Ht,_i,Zs,Rn,In,Dn,Qt,Kt,bn,wi,mr,xr,_n,Jf,nl,js,Qs,hn,Vt,Ks,gr,en,ea,vr,ta,dn,me,zn,St,jf,Qf,tn,yr,mt,il,rl,Kn,Pa,Kf,sl,Fn,Wt,br,Mi,ep,tp,al,ol,cl,np,ll,Fe,na,ip,rp,gt,Et,qt,ia,Xt,Bn,kn,ul,ra,sa,aa,it,sp,cu,Tt,_r,he,Vi,Oe,wr,Ue,Kr,es,Ca,$e,ap,Dt,ua,Nn,xt,Si,je,Ie,hl,Un,ha,nn,rn,sn,da,fa,pa,Mr,Sr,Er,Tr,Ar,Lr,ma,Pr,lt,Wi,cp,lp,up,jt,qi,He,On,Gn,Xi,ti,ts,ns,Hn,Rr,yt,Ra,dp,fp,pp,mp,xp,gp,vp,yp,bp,_p,wp,Mp,Sp,Ep,Tp,Ap,Lp,Pp,Cp,Rp,Ip,Dp,zp,Fp,Bp,kp,Np,Up,Op,Gp,Hp,Vp,Wp,qp,Xp,Yp,$p,Zp,Jp,jp,Qp,Kp,e1,t1,n1,i1,r1,s1,a1,o1,c1,l1,u1,h1,d1,f1,p1,m1,x1,g1,v1,y1,b1,_1,w1,M1,S1,E1,T1,A1,L1,P1,C1,R1,I1,D1,z1,F1,B1,k1,N1,U1,O1,G1,H1,V1,W1,q1,X1,Y1,$1,Z1,J1,j1,Q1,K1,e0,t0,n0,i0,r0,s0,a0,o0,c0,l0,u0,h0,d0,f0,p0,m0,x0,g0,v0,y0,b0,_0,w0,M0,S0,E0,T0,A0,L0,P0,C0,R0,I0,Ae,se,zt,is,rs,hu,Y0,$0,du,dl,fl,pl,ml,xl,xa,Fm,Hm,Wm,qm,sx,ss,as,lx,ux,os,Yt,px,ki,Da,za,Fa,Ba,Sn,En,qe,Yi,cs,Vn,Ti,Wn,qn,Xn,Ai,yu,Ir,Li,Dr,Tl,ga,Al,ka,Ll,Pl,Cl,gx,Rl,ls,Na,Il,Dl,Fr,Pi,Ua,Tn,zl,Fl,Bl,va,Br,$i,kl,Nl,Zi,Oa,ni,Ul,Ga,kr,Nr,Ji,Ha,Va,Wa,qa,pv,mv,xv,gv,vx,Zt,ii,Fx,$a,Za,Ja,ri,ja,Qa,Ka,eo,to,no,io,Ge,Ft,ro,us,so,bt,pn,hs,si,ao,An,mn,ai,ds,oi,oo,Ox,Bt,At,co,fs,lo,uo,pt,ci,ps,Gr,ya,ba,_a,ms,er,xs,li,ho,tr,gs,nr,$x,fo,ui,ln,_t,po,ql,Xl,Yl,ir,vs,mo,$l,Ci,wa,ys,xo,bs,_s,rr,sr,go,ws,ar,vo,yo,bo,_o,wo,Mo,Hr,jx,So,Eo,To,Ao,Lo,Po,Jo,Qx,jo,Kx,eg,tg,ng,ig,rg,sg,Co,ke,Ro,Io,Do,zo,Fo,Bo,Zl,Ln,Jl,Vr,ko,No,an,Wr,Ma,Uo,Oo,ag,vv,Xr,Oi,yv,Su,og,bv,cg,_v,wv,Mv,Sv,wn,Yn,Ev,or=Te(()=>{md=0,Dc=1,xd=2,jl=1,gd=2,Ri=3,Ms=0,Qe=1,hi=2,Ql=1,Di=0,zi=1,zc=2,Fc=3,Bc=4,vd=5,$n=100,yd=101,bd=102,kc=103,Nc=104,_d=200,wd=201,Md=202,Sd=203,Kl=204,eu=205,Ed=206,Td=207,Ad=208,Ld=209,Pd=210,Cd=0,Rd=1,Id=2,Sa=3,Dd=4,zd=5,Fd=6,Bd=7,Ss=0,kd=1,Nd=2,Fi=0,Ud=1,Od=2,Gd=3,Hd=4,Vd=5,tu=300,Go=301,Ho=302,Uc=303,Oc=304,Vo=306,Wo=307,Ea=1e3,Lt=1001,Ta=1002,ct=1003,Gc=1004,Hc=1005,vt=1006,Wd=1007,qo=1008,Xo=1009,qd=1010,Xd=1011,Yr=1012,Yd=1013,qr=1014,on=1015,$r=1016,$d=1017,Zd=1018,Jd=1019,Bi=1020,jd=1021,Mn=1022,Pt=1023,Qd=1024,Kd=1025,Qn=1026,Gi=1027,ef=1028,tf=1029,nf=1030,rf=1031,sf=1032,af=1033,Vc=33776,Wc=33777,qc=33778,Xc=33779,Yc=35840,$c=35841,Zc=35842,Jc=35843,of=36196,jc=37492,Qc=37496,cf=37808,lf=37809,uf=37810,hf=37811,df=37812,ff=37813,pf=37814,mf=37815,xf=37816,gf=37817,vf=37818,yf=37819,bf=37820,_f=37821,wf=36492,Mf=37840,Sf=37841,Ef=37842,Tf=37843,Af=37844,Lf=37845,Pf=37846,Cf=37847,Rf=37848,If=37849,Df=37850,zf=37851,Ff=37852,Bf=37853,kf=2200,Nf=2201,Uf=2202,Zr=2300,Jr=2301,Vs=2302,Zn=2400,Jn=2401,jr=2402,Yo=2500,nu=2501,Of=0,di=3e3,$o=3001,iu=3007,ru=3002,Gf=3003,su=3004,au=3005,ou=3006,Hf=3200,Vf=3201,fi=0,Wf=1,Ws=7680,qf=519,Hi=35044,Qr=35048,Kc="300 es",Jt=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){if(this._listeners===void 0)return!1;let n=this._listeners;return n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){if(this._listeners===void 0)return;let i=this._listeners[e];if(i!==void 0){let s=i.indexOf(t);s!==-1&&i.splice(s,1)}}dispatchEvent(e){if(this._listeners===void 0)return;let n=this._listeners[e.type];if(n!==void 0){e.target=this;let i=n.slice(0);for(let s=0,a=i.length;s<a;s++)i[s].call(this,e);e.target=null}}},et=[];for(let r=0;r<256;r++)et[r]=(r<16?"0":"")+r.toString(16);qs=Math.PI/180,Aa=180/Math.PI;K=class{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector2: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this)}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector2: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this)}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,i=e.elements;return this.x=i[0]*t+i[3]*n+i[6],this.y=i[1]*t+i[4]*n+i[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector2: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),i=Math.sin(t),s=this.x-e.x,a=this.y-e.y;return this.x=s*n-a*i+e.x,this.y=s*i+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}};K.prototype.isVector2=!0;Je=class{constructor(){this.elements=[1,0,0,0,1,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix3: the constructor no longer reads arguments. use .set() instead.")}set(e,t,n,i,s,a,o,c,l){let u=this.elements;return u[0]=e,u[1]=i,u[2]=o,u[3]=t,u[4]=s,u[5]=c,u[6]=n,u[7]=a,u[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],u=n[4],h=n[7],d=n[2],f=n[5],p=n[8],g=i[0],v=i[3],x=i[6],m=i[1],b=i[4],_=i[7],w=i[2],y=i[5],P=i[8];return s[0]=a*g+o*m+c*w,s[3]=a*v+o*b+c*y,s[6]=a*x+o*_+c*P,s[1]=l*g+u*m+h*w,s[4]=l*v+u*b+h*y,s[7]=l*x+u*_+h*P,s[2]=d*g+f*m+p*w,s[5]=d*v+f*b+p*y,s[8]=d*x+f*_+p*P,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8];return t*a*u-t*o*l-n*s*u+n*o*c+i*s*l-i*a*c}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=u*a-o*l,d=o*c-u*s,f=l*s-a*c,p=t*h+n*d+i*f;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let g=1/p;return e[0]=h*g,e[1]=(i*l-u*n)*g,e[2]=(o*n-i*a)*g,e[3]=d*g,e[4]=(u*t-i*c)*g,e[5]=(i*s-o*t)*g,e[6]=f*g,e[7]=(n*c-l*t)*g,e[8]=(a*t-n*s)*g,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,i,s,a,o){let c=Math.cos(s),l=Math.sin(s);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-i*l,i*c,-i*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){let n=this.elements;return n[0]*=e,n[3]*=e,n[6]*=e,n[1]*=t,n[4]*=t,n[7]*=t,this}rotate(e){let t=Math.cos(e),n=Math.sin(e),i=this.elements,s=i[0],a=i[3],o=i[6],c=i[1],l=i[4],u=i[7];return i[0]=t*s+n*c,i[3]=t*a+n*l,i[6]=t*o+n*u,i[1]=-n*s+t*c,i[4]=-n*a+t*l,i[7]=-n*o+t*u,this}translate(e,t){let n=this.elements;return n[0]+=e*n[2],n[3]+=e*n[5],n[6]+=e*n[8],n[1]+=t*n[2],n[4]+=t*n[5],n[7]+=t*n[8],this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<9;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Je.prototype.isMatrix3=!0;un=class{static getDataURL(e){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let t;if(e instanceof HTMLCanvasElement)t=e;else{Cn===void 0&&(Cn=document.createElementNS("http://www.w3.org/1999/xhtml","canvas")),Cn.width=e.width,Cn.height=e.height;let n=Cn.getContext("2d");e instanceof ImageData?n.putImageData(e,0,0):n.drawImage(e,0,0,e.width,e.height),t=Cn}return t.width>2048||t.height>2048?(console.warn("THREE.ImageUtils.getDataURL: Image converted to jpg for performance reasons",e),t.toDataURL("image/jpeg",.6)):t.toDataURL("image/png")}},Zf=0,rt=class r extends Jt{constructor(e=r.DEFAULT_IMAGE,t=r.DEFAULT_MAPPING,n=Lt,i=Lt,s=vt,a=qo,o=Pt,c=Xo,l=1,u=di){super(),Object.defineProperty(this,"id",{value:Zf++}),this.uuid=Ct(),this.name="",this.image=e,this.mipmaps=[],this.mapping=t,this.wrapS=n,this.wrapT=i,this.magFilter=s,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new K(0,0),this.repeat=new K(1,1),this.center=new K(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Je,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.encoding=u,this.version=0,this.onUpdate=null}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.image=e.image,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.encoding=e.encoding,this}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.5,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,mapping:this.mapping,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,type:this.type,encoding:this.encoding,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};if(this.image!==void 0){let i=this.image;if(i.uuid===void 0&&(i.uuid=Ct()),!t&&e.images[i.uuid]===void 0){let s;if(Array.isArray(i)){s=[];for(let a=0,o=i.length;a<o;a++)i[a].isDataTexture?s.push(Ys(i[a].image)):s.push(Ys(i[a]))}else s=Ys(i);e.images[i.uuid]={uuid:i.uuid,url:s}}n.image=i.uuid}return t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==tu)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Ea:e.x=e.x-Math.floor(e.x);break;case Lt:e.x=e.x<0?0:1;break;case Ta:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Ea:e.y=e.y-Math.floor(e.y);break;case Lt:e.y=e.y<0?0:1;break;case Ta:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&this.version++}};rt.DEFAULT_IMAGE=void 0;rt.DEFAULT_MAPPING=tu;rt.prototype.isTexture=!0;Re=class{constructor(e=0,t=0,n=0,i=1){this.x=e,this.y=t,this.z=n,this.w=i}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,i){return this.x=e,this.y=t,this.z=n,this.w=i,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector4: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this)}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector4: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this)}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*i+a[12]*s,this.y=a[1]*t+a[5]*n+a[9]*i+a[13]*s,this.z=a[2]*t+a[6]*n+a[10]*i+a[14]*s,this.w=a[3]*t+a[7]*n+a[11]*i+a[15]*s,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,i,s,c=e.elements,l=c[0],u=c[4],h=c[8],d=c[1],f=c[5],p=c[9],g=c[2],v=c[6],x=c[10];if(Math.abs(u-d)<.01&&Math.abs(h-g)<.01&&Math.abs(p-v)<.01){if(Math.abs(u+d)<.1&&Math.abs(h+g)<.1&&Math.abs(p+v)<.1&&Math.abs(l+f+x-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let b=(l+1)/2,_=(f+1)/2,w=(x+1)/2,y=(u+d)/4,P=(h+g)/4,C=(p+v)/4;return b>_&&b>w?b<.01?(n=0,i=.707106781,s=.707106781):(n=Math.sqrt(b),i=y/n,s=P/n):_>w?_<.01?(n=.707106781,i=0,s=.707106781):(i=Math.sqrt(_),n=y/i,s=C/i):w<.01?(n=.707106781,i=.707106781,s=0):(s=Math.sqrt(w),n=P/s,i=C/s),this.set(n,i,s,t),this}let m=Math.sqrt((v-p)*(v-p)+(h-g)*(h-g)+(d-u)*(d-u));return Math.abs(m)<.001&&(m=1),this.x=(v-p)/m,this.y=(h-g)/m,this.z=(d-u)/m,this.w=Math.acos((l+f+x-1)/2),this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this.w=Math.max(e.w,Math.min(t.w,this.w)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this.w=Math.max(e,Math.min(t,this.w)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this.w=this.w<0?Math.ceil(this.w):Math.floor(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector4: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}};Re.prototype.isVector4=!0;$t=class extends Jt{constructor(e,t,n){super(),this.width=e,this.height=t,this.depth=1,this.scissor=new Re(0,0,e,t),this.scissorTest=!1,this.viewport=new Re(0,0,e,t),n=n||{},this.texture=new rt(void 0,n.mapping,n.wrapS,n.wrapT,n.magFilter,n.minFilter,n.format,n.type,n.anisotropy,n.encoding),this.texture.image={},this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=1,this.texture.generateMipmaps=n.generateMipmaps!==void 0?n.generateMipmaps:!1,this.texture.minFilter=n.minFilter!==void 0?n.minFilter:vt,this.depthBuffer=n.depthBuffer!==void 0?n.depthBuffer:!0,this.stencilBuffer=n.stencilBuffer!==void 0?n.stencilBuffer:!1,this.depthTexture=n.depthTexture!==void 0?n.depthTexture:null}setTexture(e){e.image={width:this.width,height:this.height,depth:this.depth},this.texture=e}setSize(e,t,n=1){(this.width!==e||this.height!==t||this.depth!==n)&&(this.width=e,this.height=t,this.depth=n,this.texture.image.width=e,this.texture.image.height=t,this.texture.image.depth=n,this.dispose()),this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.width=e.width,this.height=e.height,this.depth=e.depth,this.viewport.copy(e.viewport),this.texture=e.texture.clone(),this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.depthTexture=e.depthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}};$t.prototype.isWebGLRenderTarget=!0;La=class extends $t{constructor(e,t,n){super(e,t,n),this.samples=4}copy(e){return super.copy.call(this,e),this.samples=e.samples,this}};La.prototype.isWebGLMultisampleRenderTarget=!0;tt=class{constructor(e=0,t=0,n=0,i=1){this._x=e,this._y=t,this._z=n,this._w=i}static slerp(e,t,n,i){return console.warn("THREE.Quaternion: Static .slerp() has been deprecated. Use qm.slerpQuaternions( qa, qb, t ) instead."),n.slerpQuaternions(e,t,i)}static slerpFlat(e,t,n,i,s,a,o){let c=n[i+0],l=n[i+1],u=n[i+2],h=n[i+3],d=s[a+0],f=s[a+1],p=s[a+2],g=s[a+3];if(o===0){e[t+0]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h;return}if(o===1){e[t+0]=d,e[t+1]=f,e[t+2]=p,e[t+3]=g;return}if(h!==g||c!==d||l!==f||u!==p){let v=1-o,x=c*d+l*f+u*p+h*g,m=x>=0?1:-1,b=1-x*x;if(b>Number.EPSILON){let w=Math.sqrt(b),y=Math.atan2(w,x*m);v=Math.sin(v*y)/w,o=Math.sin(o*y)/w}let _=o*m;if(c=c*v+d*_,l=l*v+f*_,u=u*v+p*_,h=h*v+g*_,v===1-o){let w=1/Math.sqrt(c*c+l*l+u*u+h*h);c*=w,l*=w,u*=w,h*=w}}e[t]=c,e[t+1]=l,e[t+2]=u,e[t+3]=h}static multiplyQuaternionsFlat(e,t,n,i,s,a){let o=n[i],c=n[i+1],l=n[i+2],u=n[i+3],h=s[a],d=s[a+1],f=s[a+2],p=s[a+3];return e[t]=o*p+u*h+c*f-l*d,e[t+1]=c*p+u*d+l*h-o*f,e[t+2]=l*p+u*f+o*d-c*h,e[t+3]=u*p-o*h-c*d-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._w=i,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t){if(!(e&&e.isEuler))throw new Error("THREE.Quaternion: .setFromEuler() now expects an Euler rotation rather than a Vector3 and order.");let n=e._x,i=e._y,s=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),u=o(i/2),h=o(s/2),d=c(n/2),f=c(i/2),p=c(s/2);switch(a){case"XYZ":this._x=d*u*h+l*f*p,this._y=l*f*h-d*u*p,this._z=l*u*p+d*f*h,this._w=l*u*h-d*f*p;break;case"YXZ":this._x=d*u*h+l*f*p,this._y=l*f*h-d*u*p,this._z=l*u*p-d*f*h,this._w=l*u*h+d*f*p;break;case"ZXY":this._x=d*u*h-l*f*p,this._y=l*f*h+d*u*p,this._z=l*u*p+d*f*h,this._w=l*u*h-d*f*p;break;case"ZYX":this._x=d*u*h-l*f*p,this._y=l*f*h+d*u*p,this._z=l*u*p-d*f*h,this._w=l*u*h+d*f*p;break;case"YZX":this._x=d*u*h+l*f*p,this._y=l*f*h+d*u*p,this._z=l*u*p-d*f*h,this._w=l*u*h-d*f*p;break;case"XZY":this._x=d*u*h-l*f*p,this._y=l*f*h-d*u*p,this._z=l*u*p+d*f*h,this._w=l*u*h+d*f*p;break;default:console.warn("THREE.Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t!==!1&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,i=Math.sin(n);return this._x=e.x*i,this._y=e.y*i,this._z=e.z*i,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],i=t[4],s=t[8],a=t[1],o=t[5],c=t[9],l=t[2],u=t[6],h=t[10],d=n+o+h;if(d>0){let f=.5/Math.sqrt(d+1);this._w=.25/f,this._x=(u-c)*f,this._y=(s-l)*f,this._z=(a-i)*f}else if(n>o&&n>h){let f=2*Math.sqrt(1+n-o-h);this._w=(u-c)/f,this._x=.25*f,this._y=(i+a)/f,this._z=(s+l)/f}else if(o>h){let f=2*Math.sqrt(1+o-n-h);this._w=(s-l)/f,this._x=(i+a)/f,this._y=.25*f,this._z=(c+u)/f}else{let f=2*Math.sqrt(1+h-n-o);this._w=(a-i)/f,this._x=(s+l)/f,this._y=(c+u)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<Number.EPSILON?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(dt(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let i=Math.min(1,t/n);return this.slerp(e,i),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e,t){return t!==void 0?(console.warn("THREE.Quaternion: .multiply() now only accepts one argument. Use .multiplyQuaternions( a, b ) instead."),this.multiplyQuaternions(e,t)):this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,i=e._y,s=e._z,a=e._w,o=t._x,c=t._y,l=t._z,u=t._w;return this._x=n*u+a*o+i*l-s*c,this._y=i*u+a*c+s*o-n*l,this._z=s*u+a*l+n*c-i*o,this._w=a*u-n*o-i*c-s*l,this._onChangeCallback(),this}slerp(e,t){if(t===0)return this;if(t===1)return this.copy(e);let n=this._x,i=this._y,s=this._z,a=this._w,o=a*e._w+n*e._x+i*e._y+s*e._z;if(o<0?(this._w=-e._w,this._x=-e._x,this._y=-e._y,this._z=-e._z,o=-o):this.copy(e),o>=1)return this._w=a,this._x=n,this._y=i,this._z=s,this;let c=1-o*o;if(c<=Number.EPSILON){let f=1-t;return this._w=f*a+t*this._w,this._x=f*n+t*this._x,this._y=f*i+t*this._y,this._z=f*s+t*this._z,this.normalize(),this._onChangeCallback(),this}let l=Math.sqrt(c),u=Math.atan2(l,o),h=Math.sin((1-t)*u)/l,d=Math.sin(t*u)/l;return this._w=a*h+this._w*d,this._x=n*h+this._x*d,this._y=i*h+this._y*d,this._z=s*h+this._z*d,this._onChangeCallback(),this}slerpQuaternions(e,t,n){this.copy(e).slerp(t,n)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}};tt.prototype.isQuaternion=!0;E=class{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e,t){return t!==void 0?(console.warn("THREE.Vector3: .add() now only accepts one argument. Use .addVectors( a, b ) instead."),this.addVectors(e,t)):(this.x+=e.x,this.y+=e.y,this.z+=e.z,this)}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e,t){return t!==void 0?(console.warn("THREE.Vector3: .sub() now only accepts one argument. Use .subVectors( a, b ) instead."),this.subVectors(e,t)):(this.x-=e.x,this.y-=e.y,this.z-=e.z,this)}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e,t){return t!==void 0?(console.warn("THREE.Vector3: .multiply() now only accepts one argument. Use .multiplyVectors( a, b ) instead."),this.multiplyVectors(e,t)):(this.x*=e.x,this.y*=e.y,this.z*=e.z,this)}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return e&&e.isEuler||console.error("THREE.Vector3: .applyEuler() now expects an Euler rotation rather than a Vector3 and order."),this.applyQuaternion(tl.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(tl.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6]*i,this.y=s[1]*t+s[4]*n+s[7]*i,this.z=s[2]*t+s[5]*n+s[8]*i,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,i=this.z,s=e.elements,a=1/(s[3]*t+s[7]*n+s[11]*i+s[15]);return this.x=(s[0]*t+s[4]*n+s[8]*i+s[12])*a,this.y=(s[1]*t+s[5]*n+s[9]*i+s[13])*a,this.z=(s[2]*t+s[6]*n+s[10]*i+s[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,i=this.z,s=e.x,a=e.y,o=e.z,c=e.w,l=c*t+a*i-o*n,u=c*n+o*t-s*i,h=c*i+s*n-a*t,d=-s*t-a*n-o*i;return this.x=l*c+d*-s+u*-o-h*-a,this.y=u*c+d*-a+h*-s-l*-o,this.z=h*c+d*-o+l*-a-u*-s,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,i=this.z,s=e.elements;return this.x=s[0]*t+s[4]*n+s[8]*i,this.y=s[1]*t+s[5]*n+s[9]*i,this.z=s[2]*t+s[6]*n+s[10]*i,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Math.max(e.x,Math.min(t.x,this.x)),this.y=Math.max(e.y,Math.min(t.y,this.y)),this.z=Math.max(e.z,Math.min(t.z,this.z)),this}clampScalar(e,t){return this.x=Math.max(e,Math.min(t,this.x)),this.y=Math.max(e,Math.min(t,this.y)),this.z=Math.max(e,Math.min(t,this.z)),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Math.max(e,Math.min(t,n)))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=this.x<0?Math.ceil(this.x):Math.floor(this.x),this.y=this.y<0?Math.ceil(this.y):Math.floor(this.y),this.z=this.z<0?Math.ceil(this.z):Math.floor(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e,t){return t!==void 0?(console.warn("THREE.Vector3: .cross() now only accepts one argument. Use .crossVectors( a, b ) instead."),this.crossVectors(e,t)):this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,i=e.y,s=e.z,a=t.x,o=t.y,c=t.z;return this.x=i*c-s*o,this.y=s*a-n*c,this.z=n*o-i*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return $s.copy(this).projectOnVector(e),this.sub($s)}reflect(e){return this.sub($s.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(dt(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,i=this.z-e.z;return t*t+n*n+i*i}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let i=Math.sin(t)*e;return this.x=i*Math.sin(n),this.y=Math.cos(t)*e,this.z=i*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),i=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=i,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t,n){return n!==void 0&&console.warn("THREE.Vector3: offset has been removed from .fromBufferAttribute()."),this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}};E.prototype.isVector3=!0;$s=new E,tl=new tt,ft=class{constructor(e=new E(1/0,1/0,1/0),t=new E(-1/0,-1/0,-1/0)){this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){let t=1/0,n=1/0,i=1/0,s=-1/0,a=-1/0,o=-1/0;for(let c=0,l=e.length;c<l;c+=3){let u=e[c],h=e[c+1],d=e[c+2];u<t&&(t=u),h<n&&(n=h),d<i&&(i=d),u>s&&(s=u),h>a&&(a=h),d>o&&(o=d)}return this.min.set(t,n,i),this.max.set(s,a,o),this}setFromBufferAttribute(e){let t=1/0,n=1/0,i=1/0,s=-1/0,a=-1/0,o=-1/0;for(let c=0,l=e.count;c<l;c++){let u=e.getX(c),h=e.getY(c),d=e.getZ(c);u<t&&(t=u),h<n&&(n=h),d<i&&(i=d),u>s&&(s=u),h>a&&(a=h),d>o&&(o=d)}return this.min.set(t,n,i),this.max.set(s,a,o),this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=_i.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e){return this.makeEmpty(),this.expandByObject(e)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return e===void 0&&(console.warn("THREE.Box3: .getCenter() target is now required"),e=new E),this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return e===void 0&&(console.warn("THREE.Box3: .getSize() target is now required"),e=new E),this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e){e.updateWorldMatrix(!1,!1);let t=e.geometry;t!==void 0&&(t.boundingBox===null&&t.computeBoundingBox(),Zs.copy(t.boundingBox),Zs.applyMatrix4(e.matrixWorld),this.union(Zs));let n=e.children;for(let i=0,s=n.length;i<s;i++)this.expandByObject(n[i]);return this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y||e.z<this.min.z||e.z>this.max.z)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t===void 0&&(console.warn("THREE.Box3: .getParameter() target is now required"),t=new E),t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y||e.max.z<this.min.z||e.min.z>this.max.z)}intersectsSphere(e){return this.clampPoint(e.center,_i),_i.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(wi),mr.subVectors(this.max,wi),Rn.subVectors(e.a,wi),In.subVectors(e.b,wi),Dn.subVectors(e.c,wi),Qt.subVectors(In,Rn),Kt.subVectors(Dn,In),bn.subVectors(Rn,Dn);let t=[0,-Qt.z,Qt.y,0,-Kt.z,Kt.y,0,-bn.z,bn.y,Qt.z,0,-Qt.x,Kt.z,0,-Kt.x,bn.z,0,-bn.x,-Qt.y,Qt.x,0,-Kt.y,Kt.x,0,-bn.y,bn.x,0];return!Js(t,Rn,In,Dn,mr)||(t=[1,0,0,0,1,0,0,0,1],!Js(t,Rn,In,Dn,mr))?!1:(xr.crossVectors(Qt,Kt),t=[xr.x,xr.y,xr.z],Js(t,Rn,In,Dn,mr))}clampPoint(e,t){return t===void 0&&(console.warn("THREE.Box3: .clampPoint() target is now required"),t=new E),t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return _i.copy(e).clamp(this.min,this.max).sub(e).length()}getBoundingSphere(e){return e===void 0&&console.error("THREE.Box3: .getBoundingSphere() target is now required"),this.getCenter(e.center),e.radius=this.getSize(_i).length()*.5,e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Ht[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Ht[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Ht[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Ht[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Ht[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Ht[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Ht[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Ht[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Ht),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}};ft.prototype.isBox3=!0;Ht=[new E,new E,new E,new E,new E,new E,new E,new E],_i=new E,Zs=new ft,Rn=new E,In=new E,Dn=new E,Qt=new E,Kt=new E,bn=new E,wi=new E,mr=new E,xr=new E,_n=new E;Jf=new ft,nl=new E,js=new E,Qs=new E,hn=class{constructor(e=new E,t=-1){this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Jf.setFromPoints(e).getCenter(n);let i=0;for(let s=0,a=e.length;s<a;s++)i=Math.max(i,n.distanceToSquared(e[s]));return this.radius=Math.sqrt(i),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t===void 0&&(console.warn("THREE.Sphere: .clampPoint() target is now required"),t=new E),t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return e===void 0&&(console.warn("THREE.Sphere: .getBoundingBox() target is now required"),e=new ft),this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){Qs.subVectors(e,this.center);let t=Qs.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),i=(n-this.radius)*.5;this.center.add(Qs.multiplyScalar(i/n)),this.radius+=i}return this}union(e){return js.subVectors(e.center,this.center).normalize().multiplyScalar(e.radius),this.expandByPoint(nl.copy(e.center).add(js)),this.expandByPoint(nl.copy(e.center).sub(js)),this}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}},Vt=new E,Ks=new E,gr=new E,en=new E,ea=new E,vr=new E,ta=new E,dn=class{constructor(e=new E,t=new E(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t===void 0&&(console.warn("THREE.Ray: .at() target is now required"),t=new E),t.copy(this.direction).multiplyScalar(e).add(this.origin)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,Vt)),this}closestPointToPoint(e,t){t===void 0&&(console.warn("THREE.Ray: .closestPointToPoint() target is now required"),t=new E),t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.direction).multiplyScalar(n).add(this.origin)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=Vt.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(Vt.copy(this.direction).multiplyScalar(t).add(this.origin),Vt.distanceToSquared(e))}distanceSqToSegment(e,t,n,i){Ks.copy(e).add(t).multiplyScalar(.5),gr.copy(t).sub(e).normalize(),en.copy(this.origin).sub(Ks);let s=e.distanceTo(t)*.5,a=-this.direction.dot(gr),o=en.dot(this.direction),c=-en.dot(gr),l=en.lengthSq(),u=Math.abs(1-a*a),h,d,f,p;if(u>0)if(h=a*c-o,d=a*o-c,p=s*u,h>=0)if(d>=-p)if(d<=p){let g=1/u;h*=g,d*=g,f=h*(h+a*d+2*o)+d*(a*h+d+2*c)+l}else d=s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;else d=-s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;else d<=-p?(h=Math.max(0,-(-a*s+o)),d=h>0?-s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l):d<=p?(h=0,d=Math.min(Math.max(-s,-c),s),f=d*(d+2*c)+l):(h=Math.max(0,-(a*s+o)),d=h>0?s:Math.min(Math.max(-s,-c),s),f=-h*h+d*(d+2*c)+l);else d=a>0?-s:s,h=Math.max(0,-(a*d+o)),f=-h*h+d*(d+2*c)+l;return n&&n.copy(this.direction).multiplyScalar(h).add(this.origin),i&&i.copy(gr).multiplyScalar(d).add(Ks),f}intersectSphere(e,t){Vt.subVectors(e.center,this.origin);let n=Vt.dot(this.direction),i=Vt.dot(Vt)-n*n,s=e.radius*e.radius;if(i>s)return null;let a=Math.sqrt(s-i),o=n-a,c=n+a;return o<0&&c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,i,s,a,o,c,l=1/this.direction.x,u=1/this.direction.y,h=1/this.direction.z,d=this.origin;return l>=0?(n=(e.min.x-d.x)*l,i=(e.max.x-d.x)*l):(n=(e.max.x-d.x)*l,i=(e.min.x-d.x)*l),u>=0?(s=(e.min.y-d.y)*u,a=(e.max.y-d.y)*u):(s=(e.max.y-d.y)*u,a=(e.min.y-d.y)*u),n>a||s>i||((s>n||n!==n)&&(n=s),(a<i||i!==i)&&(i=a),h>=0?(o=(e.min.z-d.z)*h,c=(e.max.z-d.z)*h):(o=(e.max.z-d.z)*h,c=(e.min.z-d.z)*h),n>c||o>i)||((o>n||n!==n)&&(n=o),(c<i||i!==i)&&(i=c),i<0)?null:this.at(n>=0?n:i,t)}intersectsBox(e){return this.intersectBox(e,Vt)!==null}intersectTriangle(e,t,n,i,s){ea.subVectors(t,e),vr.subVectors(n,e),ta.crossVectors(ea,vr);let a=this.direction.dot(ta),o;if(a>0){if(i)return null;o=1}else if(a<0)o=-1,a=-a;else return null;en.subVectors(this.origin,e);let c=o*this.direction.dot(vr.crossVectors(en,vr));if(c<0)return null;let l=o*this.direction.dot(ea.cross(en));if(l<0||c+l>a)return null;let u=-o*en.dot(ta);return u<0?null:this.at(u/a,s)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},me=class r{constructor(){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],arguments.length>0&&console.error("THREE.Matrix4: the constructor no longer reads arguments. use .set() instead.")}set(e,t,n,i,s,a,o,c,l,u,h,d,f,p,g,v){let x=this.elements;return x[0]=e,x[4]=t,x[8]=n,x[12]=i,x[1]=s,x[5]=a,x[9]=o,x[13]=c,x[2]=l,x[6]=u,x[10]=h,x[14]=d,x[3]=f,x[7]=p,x[11]=g,x[15]=v,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new r().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){let t=this.elements,n=e.elements,i=1/zn.setFromMatrixColumn(e,0).length(),s=1/zn.setFromMatrixColumn(e,1).length(),a=1/zn.setFromMatrixColumn(e,2).length();return t[0]=n[0]*i,t[1]=n[1]*i,t[2]=n[2]*i,t[3]=0,t[4]=n[4]*s,t[5]=n[5]*s,t[6]=n[6]*s,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){e&&e.isEuler||console.error("THREE.Matrix4: .makeRotationFromEuler() now expects a Euler rotation rather than a Vector3 and order.");let t=this.elements,n=e.x,i=e.y,s=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(i),l=Math.sin(i),u=Math.cos(s),h=Math.sin(s);if(e.order==="XYZ"){let d=a*u,f=a*h,p=o*u,g=o*h;t[0]=c*u,t[4]=-c*h,t[8]=l,t[1]=f+p*l,t[5]=d-g*l,t[9]=-o*c,t[2]=g-d*l,t[6]=p+f*l,t[10]=a*c}else if(e.order==="YXZ"){let d=c*u,f=c*h,p=l*u,g=l*h;t[0]=d+g*o,t[4]=p*o-f,t[8]=a*l,t[1]=a*h,t[5]=a*u,t[9]=-o,t[2]=f*o-p,t[6]=g+d*o,t[10]=a*c}else if(e.order==="ZXY"){let d=c*u,f=c*h,p=l*u,g=l*h;t[0]=d-g*o,t[4]=-a*h,t[8]=p+f*o,t[1]=f+p*o,t[5]=a*u,t[9]=g-d*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let d=a*u,f=a*h,p=o*u,g=o*h;t[0]=c*u,t[4]=p*l-f,t[8]=d*l+g,t[1]=c*h,t[5]=g*l+d,t[9]=f*l-p,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let d=a*c,f=a*l,p=o*c,g=o*l;t[0]=c*u,t[4]=g-d*h,t[8]=p*h+f,t[1]=h,t[5]=a*u,t[9]=-o*u,t[2]=-l*u,t[6]=f*h+p,t[10]=d-g*h}else if(e.order==="XZY"){let d=a*c,f=a*l,p=o*c,g=o*l;t[0]=c*u,t[4]=-h,t[8]=l*u,t[1]=d*h+g,t[5]=a*u,t[9]=f*h-p,t[2]=p*h-f,t[6]=o*u,t[10]=g*h+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(jf,e,Qf)}lookAt(e,t,n){let i=this.elements;return mt.subVectors(e,t),mt.lengthSq()===0&&(mt.z=1),mt.normalize(),tn.crossVectors(n,mt),tn.lengthSq()===0&&(Math.abs(n.z)===1?mt.x+=1e-4:mt.z+=1e-4,mt.normalize(),tn.crossVectors(n,mt)),tn.normalize(),yr.crossVectors(mt,tn),i[0]=tn.x,i[4]=yr.x,i[8]=mt.x,i[1]=tn.y,i[5]=yr.y,i[9]=mt.y,i[2]=tn.z,i[6]=yr.z,i[10]=mt.z,this}multiply(e,t){return t!==void 0?(console.warn("THREE.Matrix4: .multiply() now only accepts one argument. Use .multiplyMatrices( a, b ) instead."),this.multiplyMatrices(e,t)):this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,i=t.elements,s=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],u=n[1],h=n[5],d=n[9],f=n[13],p=n[2],g=n[6],v=n[10],x=n[14],m=n[3],b=n[7],_=n[11],w=n[15],y=i[0],P=i[4],C=i[8],F=i[12],k=i[1],H=i[5],B=i[9],L=i[13],D=i[2],z=i[6],T=i[10],I=i[14],Z=i[3],$=i[7],U=i[11],W=i[15];return s[0]=a*y+o*k+c*D+l*Z,s[4]=a*P+o*H+c*z+l*$,s[8]=a*C+o*B+c*T+l*U,s[12]=a*F+o*L+c*I+l*W,s[1]=u*y+h*k+d*D+f*Z,s[5]=u*P+h*H+d*z+f*$,s[9]=u*C+h*B+d*T+f*U,s[13]=u*F+h*L+d*I+f*W,s[2]=p*y+g*k+v*D+x*Z,s[6]=p*P+g*H+v*z+x*$,s[10]=p*C+g*B+v*T+x*U,s[14]=p*F+g*L+v*I+x*W,s[3]=m*y+b*k+_*D+w*Z,s[7]=m*P+b*H+_*z+w*$,s[11]=m*C+b*B+_*T+w*U,s[15]=m*F+b*L+_*I+w*W,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],i=e[8],s=e[12],a=e[1],o=e[5],c=e[9],l=e[13],u=e[2],h=e[6],d=e[10],f=e[14],p=e[3],g=e[7],v=e[11],x=e[15];return p*(+s*c*h-i*l*h-s*o*d+n*l*d+i*o*f-n*c*f)+g*(+t*c*f-t*l*d+s*a*d-i*a*f+i*l*u-s*c*u)+v*(+t*l*h-t*o*f-s*a*h+n*a*f+s*o*u-n*l*u)+x*(-i*o*u-t*c*h+t*o*d+i*a*h-n*a*d+n*c*u)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let i=this.elements;return e.isVector3?(i[12]=e.x,i[13]=e.y,i[14]=e.z):(i[12]=e,i[13]=t,i[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],i=e[2],s=e[3],a=e[4],o=e[5],c=e[6],l=e[7],u=e[8],h=e[9],d=e[10],f=e[11],p=e[12],g=e[13],v=e[14],x=e[15],m=h*v*l-g*d*l+g*c*f-o*v*f-h*c*x+o*d*x,b=p*d*l-u*v*l-p*c*f+a*v*f+u*c*x-a*d*x,_=u*g*l-p*h*l+p*o*f-a*g*f-u*o*x+a*h*x,w=p*h*c-u*g*c-p*o*d+a*g*d+u*o*v-a*h*v,y=t*m+n*b+i*_+s*w;if(y===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let P=1/y;return e[0]=m*P,e[1]=(g*d*s-h*v*s-g*i*f+n*v*f+h*i*x-n*d*x)*P,e[2]=(o*v*s-g*c*s+g*i*l-n*v*l-o*i*x+n*c*x)*P,e[3]=(h*c*s-o*d*s-h*i*l+n*d*l+o*i*f-n*c*f)*P,e[4]=b*P,e[5]=(u*v*s-p*d*s+p*i*f-t*v*f-u*i*x+t*d*x)*P,e[6]=(p*c*s-a*v*s-p*i*l+t*v*l+a*i*x-t*c*x)*P,e[7]=(a*d*s-u*c*s+u*i*l-t*d*l-a*i*f+t*c*f)*P,e[8]=_*P,e[9]=(p*h*s-u*g*s-p*n*f+t*g*f+u*n*x-t*h*x)*P,e[10]=(a*g*s-p*o*s+p*n*l-t*g*l-a*n*x+t*o*x)*P,e[11]=(u*o*s-a*h*s-u*n*l+t*h*l+a*n*f-t*o*f)*P,e[12]=w*P,e[13]=(u*g*i-p*h*i+p*n*d-t*g*d-u*n*v+t*h*v)*P,e[14]=(p*o*i-a*g*i-p*n*c+t*g*c+a*n*v-t*o*v)*P,e[15]=(a*h*i-u*o*i+u*n*c-t*h*c-a*n*d+t*o*d)*P,this}scale(e){let t=this.elements,n=e.x,i=e.y,s=e.z;return t[0]*=n,t[4]*=i,t[8]*=s,t[1]*=n,t[5]*=i,t[9]*=s,t[2]*=n,t[6]*=i,t[10]*=s,t[3]*=n,t[7]*=i,t[11]*=s,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],i=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,i))}makeTranslation(e,t,n){return this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),i=Math.sin(t),s=1-n,a=e.x,o=e.y,c=e.z,l=s*a,u=s*o;return this.set(l*a+n,l*o-i*c,l*c+i*o,0,l*o+i*c,u*o+n,u*c-i*a,0,l*c-i*o,u*c+i*a,s*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n){return this.set(1,t,n,0,e,1,n,0,e,t,1,0,0,0,0,1),this}compose(e,t,n){let i=this.elements,s=t._x,a=t._y,o=t._z,c=t._w,l=s+s,u=a+a,h=o+o,d=s*l,f=s*u,p=s*h,g=a*u,v=a*h,x=o*h,m=c*l,b=c*u,_=c*h,w=n.x,y=n.y,P=n.z;return i[0]=(1-(g+x))*w,i[1]=(f+_)*w,i[2]=(p-b)*w,i[3]=0,i[4]=(f-_)*y,i[5]=(1-(d+x))*y,i[6]=(v+m)*y,i[7]=0,i[8]=(p+b)*P,i[9]=(v-m)*P,i[10]=(1-(d+g))*P,i[11]=0,i[12]=e.x,i[13]=e.y,i[14]=e.z,i[15]=1,this}decompose(e,t,n){let i=this.elements,s=zn.set(i[0],i[1],i[2]).length(),a=zn.set(i[4],i[5],i[6]).length(),o=zn.set(i[8],i[9],i[10]).length();this.determinant()<0&&(s=-s),e.x=i[12],e.y=i[13],e.z=i[14],St.copy(this);let l=1/s,u=1/a,h=1/o;return St.elements[0]*=l,St.elements[1]*=l,St.elements[2]*=l,St.elements[4]*=u,St.elements[5]*=u,St.elements[6]*=u,St.elements[8]*=h,St.elements[9]*=h,St.elements[10]*=h,t.setFromRotationMatrix(St),n.x=s,n.y=a,n.z=o,this}makePerspective(e,t,n,i,s,a){a===void 0&&console.warn("THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.");let o=this.elements,c=2*s/(t-e),l=2*s/(n-i),u=(t+e)/(t-e),h=(n+i)/(n-i),d=-(a+s)/(a-s),f=-2*a*s/(a-s);return o[0]=c,o[4]=0,o[8]=u,o[12]=0,o[1]=0,o[5]=l,o[9]=h,o[13]=0,o[2]=0,o[6]=0,o[10]=d,o[14]=f,o[3]=0,o[7]=0,o[11]=-1,o[15]=0,this}makeOrthographic(e,t,n,i,s,a){let o=this.elements,c=1/(t-e),l=1/(n-i),u=1/(a-s),h=(t+e)*c,d=(n+i)*l,f=(a+s)*u;return o[0]=2*c,o[4]=0,o[8]=0,o[12]=-h,o[1]=0,o[5]=2*l,o[9]=0,o[13]=-d,o[2]=0,o[6]=0,o[10]=-2*u,o[14]=-f,o[3]=0,o[7]=0,o[11]=0,o[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let i=0;i<16;i++)if(t[i]!==n[i])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};me.prototype.isMatrix4=!0;zn=new E,St=new me,jf=new E(0,0,0),Qf=new E(1,1,1),tn=new E,yr=new E,mt=new E,il=new me,rl=new tt,Kn=class r{constructor(e=0,t=0,n=0,i=r.DefaultOrder){this._x=e,this._y=t,this._z=n,this._order=i}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,i){return this._x=e,this._y=t,this._z=n,this._order=i||this._order,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t,n){let i=e.elements,s=i[0],a=i[4],o=i[8],c=i[1],l=i[5],u=i[9],h=i[2],d=i[6],f=i[10];switch(t=t||this._order,t){case"XYZ":this._y=Math.asin(dt(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-u,f),this._z=Math.atan2(-a,s)):(this._x=Math.atan2(d,l),this._z=0);break;case"YXZ":this._x=Math.asin(-dt(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-h,s),this._z=0);break;case"ZXY":this._x=Math.asin(dt(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-h,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,s));break;case"ZYX":this._y=Math.asin(-dt(h,-1,1)),Math.abs(h)<.9999999?(this._x=Math.atan2(d,f),this._z=Math.atan2(c,s)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(dt(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-u,l),this._y=Math.atan2(-h,s)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-dt(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(d,l),this._y=Math.atan2(o,s)):(this._x=Math.atan2(-u,f),this._y=0);break;default:console.warn("THREE.Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n!==!1&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return il.makeRotationFromQuaternion(e),this.setFromRotationMatrix(il,t,n)}setFromVector3(e,t){return this.set(e.x,e.y,e.z,t||this._order)}reorder(e){return rl.setFromEuler(this),this.setFromQuaternion(rl,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}toVector3(e){return e?e.set(this._x,this._y,this._z):new E(this._x,this._y,this._z)}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}};Kn.prototype.isEuler=!0;Kn.DefaultOrder="XYZ";Kn.RotationOrders=["XYZ","YZX","ZXY","XZY","YXZ","ZYX"];Pa=class{constructor(){this.mask=1}set(e){this.mask=1<<e|0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}},Kf=0,sl=new E,Fn=new tt,Wt=new me,br=new E,Mi=new E,ep=new E,tp=new tt,al=new E(1,0,0),ol=new E(0,1,0),cl=new E(0,0,1),np={type:"added"},ll={type:"removed"},Fe=class r extends Jt{constructor(){super(),Object.defineProperty(this,"id",{value:Kf++}),this.uuid=Ct(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=r.DefaultUp.clone();let e=new E,t=new Kn,n=new tt,i=new E(1,1,1);function s(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(s),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:i},modelViewMatrix:{value:new me},normalMatrix:{value:new Je}}),this.matrix=new me,this.matrixWorld=new me,this.matrixAutoUpdate=r.DefaultMatrixAutoUpdate,this.matrixWorldNeedsUpdate=!1,this.layers=new Pa,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.userData={}}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Fn.setFromAxisAngle(e,t),this.quaternion.multiply(Fn),this}rotateOnWorldAxis(e,t){return Fn.setFromAxisAngle(e,t),this.quaternion.premultiply(Fn),this}rotateX(e){return this.rotateOnAxis(al,e)}rotateY(e){return this.rotateOnAxis(ol,e)}rotateZ(e){return this.rotateOnAxis(cl,e)}translateOnAxis(e,t){return sl.copy(e).applyQuaternion(this.quaternion),this.position.add(sl.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(al,e)}translateY(e){return this.translateOnAxis(ol,e)}translateZ(e){return this.translateOnAxis(cl,e)}localToWorld(e){return e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return e.applyMatrix4(Wt.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?br.copy(e):br.set(e,t,n);let i=this.parent;this.updateWorldMatrix(!0,!1),Mi.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Wt.lookAt(Mi,br,this.up):Wt.lookAt(br,Mi,this.up),this.quaternion.setFromRotationMatrix(Wt),i&&(Wt.extractRotation(i.matrixWorld),Fn.setFromRotationMatrix(Wt),this.quaternion.premultiply(Fn.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(console.error("THREE.Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.parent!==null&&e.parent.remove(e),e.parent=this,this.children.push(e),e.dispatchEvent(np)):console.error("THREE.Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(ll)),this}clear(){for(let e=0;e<this.children.length;e++){let t=this.children[e];t.parent=null,t.dispatchEvent(ll)}return this.children.length=0,this}attach(e){return this.updateWorldMatrix(!0,!1),Wt.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Wt.multiply(e.parent.matrixWorld)),e.applyMatrix4(Wt),this.add(e),e.updateWorldMatrix(!1,!0),this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,i=this.children.length;n<i;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getWorldPosition(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldPosition() target is now required"),e=new E),this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldQuaternion() target is now required"),e=new tt),this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mi,e,ep),e}getWorldScale(e){return e===void 0&&(console.warn("THREE.Object3D: .getWorldScale() target is now required"),e=new E),this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Mi,tp,e),e}getWorldDirection(e){e===void 0&&(console.warn("THREE.Object3D: .getWorldDirection() target is now required"),e=new E),this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale),this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,i=t.length;n<i;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t){let n=this.parent;if(e===!0&&n!==null&&n.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix),t===!0){let i=this.children;for(let s=0,a=i.length;s<a;s++)i[s].updateWorldMatrix(!1,!0)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{}},n.metadata={version:4.5,type:"Object",generator:"Object3D.toJSON"});let i={};i.uuid=this.uuid,i.type=this.type,this.name!==""&&(i.name=this.name),this.castShadow===!0&&(i.castShadow=!0),this.receiveShadow===!0&&(i.receiveShadow=!0),this.visible===!1&&(i.visible=!1),this.frustumCulled===!1&&(i.frustumCulled=!1),this.renderOrder!==0&&(i.renderOrder=this.renderOrder),JSON.stringify(this.userData)!=="{}"&&(i.userData=this.userData),i.layers=this.layers.mask,i.matrix=this.matrix.toArray(),this.matrixAutoUpdate===!1&&(i.matrixAutoUpdate=!1),this.isInstancedMesh&&(i.type="InstancedMesh",i.count=this.count,i.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(i.instanceColor=this.instanceColor.toJSON()));function s(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isMesh||this.isLine||this.isPoints){i.geometry=s(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,u=c.length;l<u;l++){let h=c[l];s(e.shapes,h)}else s(e.shapes,c)}}if(this.isSkinnedMesh&&(i.bindMode=this.bindMode,i.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(s(e.skeletons,this.skeleton),i.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(s(e.materials,this.material[c]));i.material=o}else i.material=s(e.materials,this.material);if(this.children.length>0){i.children=[];for(let o=0;o<this.children.length;o++)i.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){i.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];i.animations.push(s(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),u=a(e.images),h=a(e.shapes),d=a(e.skeletons),f=a(e.animations);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),u.length>0&&(n.images=u),h.length>0&&(n.shapes=h),d.length>0&&(n.skeletons=d),f.length>0&&(n.animations=f)}return n.object=i,n;function a(o){let c=[];for(let l in o){let u=o[l];delete u.metadata,c.push(u)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let i=e.children[n];this.add(i.clone())}return this}};Fe.DefaultUp=new E(0,1,0);Fe.DefaultMatrixAutoUpdate=!0;Fe.prototype.isObject3D=!0;na=new E,ip=new E,rp=new Je,gt=class{constructor(e=new E(1,0,0),t=0){this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,i){return this.normal.set(e,t,n),this.constant=i,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let i=na.subVectors(n,t).cross(ip.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(i,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t===void 0&&(console.warn("THREE.Plane: .projectPoint() target is now required"),t=new E),t.copy(this.normal).multiplyScalar(-this.distanceToPoint(e)).add(e)}intersectLine(e,t){t===void 0&&(console.warn("THREE.Plane: .intersectLine() target is now required"),t=new E);let n=e.delta(na),i=this.normal.dot(n);if(i===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let s=-(e.start.dot(this.normal)+this.constant)/i;return s<0||s>1?null:t.copy(n).multiplyScalar(s).add(e.start)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e===void 0&&(console.warn("THREE.Plane: .coplanarPoint() target is now required"),e=new E),e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||rp.getNormalMatrix(e),i=this.coplanarPoint(na).applyMatrix4(e),s=this.normal.applyMatrix3(n).normalize();return this.constant=-i.dot(s),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}};gt.prototype.isPlane=!0;Et=new E,qt=new E,ia=new E,Xt=new E,Bn=new E,kn=new E,ul=new E,ra=new E,sa=new E,aa=new E,it=class r{constructor(e=new E,t=new E,n=new E){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,i){i===void 0&&(console.warn("THREE.Triangle: .getNormal() target is now required"),i=new E),i.subVectors(n,t),Et.subVectors(e,t),i.cross(Et);let s=i.lengthSq();return s>0?i.multiplyScalar(1/Math.sqrt(s)):i.set(0,0,0)}static getBarycoord(e,t,n,i,s){Et.subVectors(i,t),qt.subVectors(n,t),ia.subVectors(e,t);let a=Et.dot(Et),o=Et.dot(qt),c=Et.dot(ia),l=qt.dot(qt),u=qt.dot(ia),h=a*l-o*o;if(s===void 0&&(console.warn("THREE.Triangle: .getBarycoord() target is now required"),s=new E),h===0)return s.set(-2,-1,-1);let d=1/h,f=(l*c-o*u)*d,p=(a*u-o*c)*d;return s.set(1-f-p,p,f)}static containsPoint(e,t,n,i){return this.getBarycoord(e,t,n,i,Xt),Xt.x>=0&&Xt.y>=0&&Xt.x+Xt.y<=1}static getUV(e,t,n,i,s,a,o,c){return this.getBarycoord(e,t,n,i,Xt),c.set(0,0),c.addScaledVector(s,Xt.x),c.addScaledVector(a,Xt.y),c.addScaledVector(o,Xt.z),c}static isFrontFacing(e,t,n,i){return Et.subVectors(n,t),qt.subVectors(e,t),Et.cross(qt).dot(i)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,i){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[i]),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Et.subVectors(this.c,this.b),qt.subVectors(this.a,this.b),Et.cross(qt).length()*.5}getMidpoint(e){return e===void 0&&(console.warn("THREE.Triangle: .getMidpoint() target is now required"),e=new E),e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return r.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e===void 0&&(console.warn("THREE.Triangle: .getPlane() target is now required"),e=new gt),e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return r.getBarycoord(e,this.a,this.b,this.c,t)}getUV(e,t,n,i,s){return r.getUV(e,this.a,this.b,this.c,t,n,i,s)}containsPoint(e){return r.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return r.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){t===void 0&&(console.warn("THREE.Triangle: .closestPointToPoint() target is now required"),t=new E);let n=this.a,i=this.b,s=this.c,a,o;Bn.subVectors(i,n),kn.subVectors(s,n),ra.subVectors(e,n);let c=Bn.dot(ra),l=kn.dot(ra);if(c<=0&&l<=0)return t.copy(n);sa.subVectors(e,i);let u=Bn.dot(sa),h=kn.dot(sa);if(u>=0&&h<=u)return t.copy(i);let d=c*h-u*l;if(d<=0&&c>=0&&u<=0)return a=c/(c-u),t.copy(n).addScaledVector(Bn,a);aa.subVectors(e,s);let f=Bn.dot(aa),p=kn.dot(aa);if(p>=0&&f<=p)return t.copy(s);let g=f*l-c*p;if(g<=0&&l>=0&&p<=0)return o=l/(l-p),t.copy(n).addScaledVector(kn,o);let v=u*p-f*h;if(v<=0&&h-u>=0&&f-p>=0)return ul.subVectors(s,i),o=(h-u)/(h-u+(f-p)),t.copy(i).addScaledVector(ul,o);let x=1/(v+g+d);return a=g*x,o=d*x,t.copy(n).addScaledVector(Bn,a).addScaledVector(kn,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},sp=0;Ke.prototype=Object.assign(Object.create(Jt.prototype),{constructor:Ke,isMaterial:!0,onBuild:function(){},onBeforeCompile:function(){},customProgramCacheKey:function(){return this.onBeforeCompile.toString()},setValues:function(r){if(r!==void 0)for(let e in r){let t=r[e];if(t===void 0){console.warn("THREE.Material: '"+e+"' parameter is undefined.");continue}if(e==="shading"){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=t===Ql;continue}let n=this[e];if(n===void 0){console.warn("THREE."+this.type+": '"+e+"' is not a property of this material.");continue}n&&n.isColor?n.set(t):n&&n.isVector3&&t&&t.isVector3?n.copy(t):this[e]=t}},toJSON:function(r){let e=r===void 0||typeof r=="string";e&&(r={textures:{},images:{}});let t={metadata:{version:4.5,type:"Material",generator:"Material.toJSON"}};t.uuid=this.uuid,t.type=this.type,this.name!==""&&(t.name=this.name),this.color&&this.color.isColor&&(t.color=this.color.getHex()),this.roughness!==void 0&&(t.roughness=this.roughness),this.metalness!==void 0&&(t.metalness=this.metalness),this.sheen&&this.sheen.isColor&&(t.sheen=this.sheen.getHex()),this.emissive&&this.emissive.isColor&&(t.emissive=this.emissive.getHex()),this.emissiveIntensity&&this.emissiveIntensity!==1&&(t.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(t.specular=this.specular.getHex()),this.shininess!==void 0&&(t.shininess=this.shininess),this.clearcoat!==void 0&&(t.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(t.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(t.clearcoatMap=this.clearcoatMap.toJSON(r).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(t.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(r).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(t.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(r).uuid,t.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.map&&this.map.isTexture&&(t.map=this.map.toJSON(r).uuid),this.matcap&&this.matcap.isTexture&&(t.matcap=this.matcap.toJSON(r).uuid),this.alphaMap&&this.alphaMap.isTexture&&(t.alphaMap=this.alphaMap.toJSON(r).uuid),this.lightMap&&this.lightMap.isTexture&&(t.lightMap=this.lightMap.toJSON(r).uuid,t.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(t.aoMap=this.aoMap.toJSON(r).uuid,t.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(t.bumpMap=this.bumpMap.toJSON(r).uuid,t.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(t.normalMap=this.normalMap.toJSON(r).uuid,t.normalMapType=this.normalMapType,t.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(t.displacementMap=this.displacementMap.toJSON(r).uuid,t.displacementScale=this.displacementScale,t.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(t.roughnessMap=this.roughnessMap.toJSON(r).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(t.metalnessMap=this.metalnessMap.toJSON(r).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(t.emissiveMap=this.emissiveMap.toJSON(r).uuid),this.specularMap&&this.specularMap.isTexture&&(t.specularMap=this.specularMap.toJSON(r).uuid),this.envMap&&this.envMap.isTexture&&(t.envMap=this.envMap.toJSON(r).uuid,this.combine!==void 0&&(t.combine=this.combine)),this.envMapIntensity!==void 0&&(t.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(t.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(t.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(t.gradientMap=this.gradientMap.toJSON(r).uuid),this.size!==void 0&&(t.size=this.size),this.shadowSide!==null&&(t.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(t.sizeAttenuation=this.sizeAttenuation),this.blending!==zi&&(t.blending=this.blending),this.side!==Ms&&(t.side=this.side),this.vertexColors&&(t.vertexColors=!0),this.opacity<1&&(t.opacity=this.opacity),this.transparent===!0&&(t.transparent=this.transparent),t.depthFunc=this.depthFunc,t.depthTest=this.depthTest,t.depthWrite=this.depthWrite,t.colorWrite=this.colorWrite,t.stencilWrite=this.stencilWrite,t.stencilWriteMask=this.stencilWriteMask,t.stencilFunc=this.stencilFunc,t.stencilRef=this.stencilRef,t.stencilFuncMask=this.stencilFuncMask,t.stencilFail=this.stencilFail,t.stencilZFail=this.stencilZFail,t.stencilZPass=this.stencilZPass,this.rotation&&this.rotation!==0&&(t.rotation=this.rotation),this.polygonOffset===!0&&(t.polygonOffset=!0),this.polygonOffsetFactor!==0&&(t.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(t.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth&&this.linewidth!==1&&(t.linewidth=this.linewidth),this.dashSize!==void 0&&(t.dashSize=this.dashSize),this.gapSize!==void 0&&(t.gapSize=this.gapSize),this.scale!==void 0&&(t.scale=this.scale),this.dithering===!0&&(t.dithering=!0),this.alphaTest>0&&(t.alphaTest=this.alphaTest),this.alphaToCoverage===!0&&(t.alphaToCoverage=this.alphaToCoverage),this.premultipliedAlpha===!0&&(t.premultipliedAlpha=this.premultipliedAlpha),this.wireframe===!0&&(t.wireframe=this.wireframe),this.wireframeLinewidth>1&&(t.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(t.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(t.wireframeLinejoin=this.wireframeLinejoin),this.morphTargets===!0&&(t.morphTargets=!0),this.morphNormals===!0&&(t.morphNormals=!0),this.skinning===!0&&(t.skinning=!0),this.flatShading===!0&&(t.flatShading=this.flatShading),this.visible===!1&&(t.visible=!1),this.toneMapped===!1&&(t.toneMapped=!1),JSON.stringify(this.userData)!=="{}"&&(t.userData=this.userData);function n(i){let s=[];for(let a in i){let o=i[a];delete o.metadata,s.push(o)}return s}if(e){let i=n(r.textures),s=n(r.images);i.length>0&&(t.textures=i),s.length>0&&(t.images=s)}return t},clone:function(){return new this.constructor().copy(this)},copy:function(r){this.name=r.name,this.fog=r.fog,this.blending=r.blending,this.side=r.side,this.vertexColors=r.vertexColors,this.opacity=r.opacity,this.transparent=r.transparent,this.blendSrc=r.blendSrc,this.blendDst=r.blendDst,this.blendEquation=r.blendEquation,this.blendSrcAlpha=r.blendSrcAlpha,this.blendDstAlpha=r.blendDstAlpha,this.blendEquationAlpha=r.blendEquationAlpha,this.depthFunc=r.depthFunc,this.depthTest=r.depthTest,this.depthWrite=r.depthWrite,this.stencilWriteMask=r.stencilWriteMask,this.stencilFunc=r.stencilFunc,this.stencilRef=r.stencilRef,this.stencilFuncMask=r.stencilFuncMask,this.stencilFail=r.stencilFail,this.stencilZFail=r.stencilZFail,this.stencilZPass=r.stencilZPass,this.stencilWrite=r.stencilWrite;let e=r.clippingPlanes,t=null;if(e!==null){let n=e.length;t=new Array(n);for(let i=0;i!==n;++i)t[i]=e[i].clone()}return this.clippingPlanes=t,this.clipIntersection=r.clipIntersection,this.clipShadows=r.clipShadows,this.shadowSide=r.shadowSide,this.colorWrite=r.colorWrite,this.precision=r.precision,this.polygonOffset=r.polygonOffset,this.polygonOffsetFactor=r.polygonOffsetFactor,this.polygonOffsetUnits=r.polygonOffsetUnits,this.dithering=r.dithering,this.alphaTest=r.alphaTest,this.alphaToCoverage=r.alphaToCoverage,this.premultipliedAlpha=r.premultipliedAlpha,this.visible=r.visible,this.toneMapped=r.toneMapped,this.userData=JSON.parse(JSON.stringify(r.userData)),this},dispose:function(){this.dispatchEvent({type:"dispose"})}});Object.defineProperty(Ke.prototype,"needsUpdate",{set:function(r){r===!0&&this.version++}});cu={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},Tt={h:0,s:0,l:0},_r={h:0,s:0,l:0};he=class{constructor(e,t,n){return t===void 0&&n===void 0?this.set(e):this.setRGB(e,t,n)}set(e){return e&&e.isColor?this.copy(e):typeof e=="number"?this.setHex(e):typeof e=="string"&&this.setStyle(e),this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,this}setRGB(e,t,n){return this.r=e,this.g=t,this.b=n,this}setHSL(e,t,n){if(e=Xf(e,1),t=dt(t,0,1),n=dt(n,0,1),t===0)this.r=this.g=this.b=n;else{let i=n<=.5?n*(1+t):n+t-n*t,s=2*n-i;this.r=oa(s,i,e+1/3),this.g=oa(s,i,e),this.b=oa(s,i,e-1/3)}return this}setStyle(e){function t(i){i!==void 0&&parseFloat(i)<1&&console.warn("THREE.Color: Alpha component of "+e+" will be ignored.")}let n;if(n=/^((?:rgb|hsl)a?)\(([^\)]*)\)/.exec(e)){let i,s=n[1],a=n[2];switch(s){case"rgb":case"rgba":if(i=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(255,parseInt(i[1],10))/255,this.g=Math.min(255,parseInt(i[2],10))/255,this.b=Math.min(255,parseInt(i[3],10))/255,t(i[4]),this;if(i=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return this.r=Math.min(100,parseInt(i[1],10))/100,this.g=Math.min(100,parseInt(i[2],10))/100,this.b=Math.min(100,parseInt(i[3],10))/100,t(i[4]),this;break;case"hsl":case"hsla":if(i=/^\s*(\d*\.?\d+)\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a)){let o=parseFloat(i[1])/360,c=parseInt(i[2],10)/100,l=parseInt(i[3],10)/100;return t(i[4]),this.setHSL(o,c,l)}break}}else if(n=/^\#([A-Fa-f\d]+)$/.exec(e)){let i=n[1],s=i.length;if(s===3)return this.r=parseInt(i.charAt(0)+i.charAt(0),16)/255,this.g=parseInt(i.charAt(1)+i.charAt(1),16)/255,this.b=parseInt(i.charAt(2)+i.charAt(2),16)/255,this;if(s===6)return this.r=parseInt(i.charAt(0)+i.charAt(1),16)/255,this.g=parseInt(i.charAt(2)+i.charAt(3),16)/255,this.b=parseInt(i.charAt(4)+i.charAt(5),16)/255,this}return e&&e.length>0?this.setColorName(e):this}setColorName(e){let t=cu[e.toLowerCase()];return t!==void 0?this.setHex(t):console.warn("THREE.Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copyGammaToLinear(e,t=2){return this.r=Math.pow(e.r,t),this.g=Math.pow(e.g,t),this.b=Math.pow(e.b,t),this}copyLinearToGamma(e,t=2){let n=t>0?1/t:1;return this.r=Math.pow(e.r,n),this.g=Math.pow(e.g,n),this.b=Math.pow(e.b,n),this}convertGammaToLinear(e){return this.copyGammaToLinear(this,e),this}convertLinearToGamma(e){return this.copyLinearToGamma(this,e),this}copySRGBToLinear(e){return this.r=ca(e.r),this.g=ca(e.g),this.b=ca(e.b),this}copyLinearToSRGB(e){return this.r=la(e.r),this.g=la(e.g),this.b=la(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(){return this.r*255<<16^this.g*255<<8^this.b*255<<0}getHexString(){return("000000"+this.getHex().toString(16)).slice(-6)}getHSL(e){e===void 0&&(console.warn("THREE.Color: .getHSL() target is now required"),e={h:0,s:0,l:0});let t=this.r,n=this.g,i=this.b,s=Math.max(t,n,i),a=Math.min(t,n,i),o,c,l=(a+s)/2;if(a===s)o=0,c=0;else{let u=s-a;switch(c=l<=.5?u/(s+a):u/(2-s-a),s){case t:o=(n-i)/u+(n<i?6:0);break;case n:o=(i-t)/u+2;break;case i:o=(t-n)/u+4;break}o/=6}return e.h=o,e.s=c,e.l=l,e}getStyle(){return"rgb("+(this.r*255|0)+","+(this.g*255|0)+","+(this.b*255|0)+")"}offsetHSL(e,t,n){return this.getHSL(Tt),Tt.h+=e,Tt.s+=t,Tt.l+=n,this.setHSL(Tt.h,Tt.s,Tt.l),this}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(Tt),e.getHSL(_r);let n=Xs(Tt.h,_r.h,t),i=Xs(Tt.s,_r.s,t),s=Xs(Tt.l,_r.l,t);return this.setHSL(n,i,s),this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),e.normalized===!0&&(this.r/=255,this.g/=255,this.b/=255),this}toJSON(){return this.getHex()}};he.NAMES=cu;he.prototype.isColor=!0;he.prototype.r=1;he.prototype.g=1;he.prototype.b=1;Vi=class extends Ke{constructor(e){super(),this.type="MeshBasicMaterial",this.color=new he(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Ss,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this}};Vi.prototype.isMeshBasicMaterial=!0;Oe=new E,wr=new K,Ue=class{constructor(e,t,n){if(Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n===!0,this.usage=Hi,this.updateRange={offset:0,count:-1},this.version=0,this.onUploadCallback=function(){}}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let i=0,s=this.itemSize;i<s;i++)this.array[e+i]=t.array[n+i];return this}copyArray(e){return this.array.set(e),this}copyColorsArray(e){let t=this.array,n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyColorsArray(): color is undefined",i),a=new he),t[n++]=a.r,t[n++]=a.g,t[n++]=a.b}return this}copyVector2sArray(e){let t=this.array,n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector2sArray(): vector is undefined",i),a=new K),t[n++]=a.x,t[n++]=a.y}return this}copyVector3sArray(e){let t=this.array,n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector3sArray(): vector is undefined",i),a=new E),t[n++]=a.x,t[n++]=a.y,t[n++]=a.z}return this}copyVector4sArray(e){let t=this.array,n=0;for(let i=0,s=e.length;i<s;i++){let a=e[i];a===void 0&&(console.warn("THREE.BufferAttribute.copyVector4sArray(): vector is undefined",i),a=new Re),t[n++]=a.x,t[n++]=a.y,t[n++]=a.z,t[n++]=a.w}return this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)wr.fromBufferAttribute(this,t),wr.applyMatrix3(e),this.setXY(t,wr.x,wr.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Oe.fromBufferAttribute(this,t),Oe.applyMatrix3(e),this.setXYZ(t,Oe.x,Oe.y,Oe.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Oe.x=this.getX(t),Oe.y=this.getY(t),Oe.z=this.getZ(t),Oe.applyMatrix4(e),this.setXYZ(t,Oe.x,Oe.y,Oe.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Oe.x=this.getX(t),Oe.y=this.getY(t),Oe.z=this.getZ(t),Oe.applyNormalMatrix(e),this.setXYZ(t,Oe.x,Oe.y,Oe.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Oe.x=this.getX(t),Oe.y=this.getY(t),Oe.z=this.getZ(t),Oe.transformDirection(e),this.setXYZ(t,Oe.x,Oe.y,Oe.z);return this}set(e,t=0){return this.array.set(e,t),this}getX(e){return this.array[e*this.itemSize]}setX(e,t){return this.array[e*this.itemSize]=t,this}getY(e){return this.array[e*this.itemSize+1]}setY(e,t){return this.array[e*this.itemSize+1]=t,this}getZ(e){return this.array[e*this.itemSize+2]}setZ(e,t){return this.array[e*this.itemSize+2]=t,this}getW(e){return this.array[e*this.itemSize+3]}setW(e,t){return this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,i){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e*=this.itemSize,this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=i,this.array[e+3]=s,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.prototype.slice.call(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Hi&&(e.usage=this.usage),(this.updateRange.offset!==0||this.updateRange.count!==-1)&&(e.updateRange=this.updateRange),e}};Ue.prototype.isBufferAttribute=!0;Kr=class extends Ue{constructor(e,t,n){super(new Uint16Array(e),t,n)}},es=class extends Ue{constructor(e,t,n){super(new Uint32Array(e),t,n)}},Ca=class extends Ue{constructor(e,t,n){super(new Uint16Array(e),t,n)}};Ca.prototype.isFloat16BufferAttribute=!0;$e=class extends Ue{constructor(e,t,n){super(new Float32Array(e),t,n)}};ap=0,Dt=new me,ua=new Fe,Nn=new E,xt=new ft,Si=new ft,je=new E,Ie=class r extends Jt{constructor(){super(),Object.defineProperty(this,"id",{value:ap++}),this.uuid=Ct(),this.name="",this.type="BufferGeometry",this.index=null,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={}}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(lu(e)>65535?es:Kr)(e,1):this.index=e,this}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let s=new Je().getNormalMatrix(e);n.applyNormalMatrix(s),n.needsUpdate=!0}let i=this.attributes.tangent;return i!==void 0&&(i.transformDirection(e),i.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}rotateX(e){return Dt.makeRotationX(e),this.applyMatrix4(Dt),this}rotateY(e){return Dt.makeRotationY(e),this.applyMatrix4(Dt),this}rotateZ(e){return Dt.makeRotationZ(e),this.applyMatrix4(Dt),this}translate(e,t,n){return Dt.makeTranslation(e,t,n),this.applyMatrix4(Dt),this}scale(e,t,n){return Dt.makeScale(e,t,n),this.applyMatrix4(Dt),this}lookAt(e){return ua.lookAt(e),ua.updateMatrix(),this.applyMatrix4(ua.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Nn).negate(),this.translate(Nn.x,Nn.y,Nn.z),this}setFromPoints(e){let t=[];for(let n=0,i=e.length;n<i;n++){let s=e[n];t.push(s.x,s.y,s.z||0)}return this.setAttribute("position",new $e(t,3)),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new ft);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingBox.set(new E(-1/0,-1/0,-1/0),new E(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,i=t.length;n<i;n++){let s=t[n];xt.setFromBufferAttribute(s),this.morphTargetsRelative?(je.addVectors(this.boundingBox.min,xt.min),this.boundingBox.expandByPoint(je),je.addVectors(this.boundingBox.max,xt.max),this.boundingBox.expandByPoint(je)):(this.boundingBox.expandByPoint(xt.min),this.boundingBox.expandByPoint(xt.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&console.error('THREE.BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new hn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){console.error('THREE.BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere. Alternatively set "mesh.frustumCulled" to "false".',this),this.boundingSphere.set(new E,1/0);return}if(e){let n=this.boundingSphere.center;if(xt.setFromBufferAttribute(e),t)for(let s=0,a=t.length;s<a;s++){let o=t[s];Si.setFromBufferAttribute(o),this.morphTargetsRelative?(je.addVectors(xt.min,Si.min),xt.expandByPoint(je),je.addVectors(xt.max,Si.max),xt.expandByPoint(je)):(xt.expandByPoint(Si.min),xt.expandByPoint(Si.max))}xt.getCenter(n);let i=0;for(let s=0,a=e.count;s<a;s++)je.fromBufferAttribute(e,s),i=Math.max(i,n.distanceToSquared(je));if(t)for(let s=0,a=t.length;s<a;s++){let o=t[s],c=this.morphTargetsRelative;for(let l=0,u=o.count;l<u;l++)je.fromBufferAttribute(o,l),c&&(Nn.fromBufferAttribute(e,l),je.add(Nn)),i=Math.max(i,n.distanceToSquared(je))}this.boundingSphere.radius=Math.sqrt(i),isNaN(this.boundingSphere.radius)&&console.error('THREE.BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeFaceNormals(){}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){console.error("THREE.BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=e.array,i=t.position.array,s=t.normal.array,a=t.uv.array,o=i.length/3;t.tangent===void 0&&this.setAttribute("tangent",new Ue(new Float32Array(4*o),4));let c=t.tangent.array,l=[],u=[];for(let k=0;k<o;k++)l[k]=new E,u[k]=new E;let h=new E,d=new E,f=new E,p=new K,g=new K,v=new K,x=new E,m=new E;function b(k,H,B){h.fromArray(i,k*3),d.fromArray(i,H*3),f.fromArray(i,B*3),p.fromArray(a,k*2),g.fromArray(a,H*2),v.fromArray(a,B*2),d.sub(h),f.sub(h),g.sub(p),v.sub(p);let L=1/(g.x*v.y-v.x*g.y);isFinite(L)&&(x.copy(d).multiplyScalar(v.y).addScaledVector(f,-g.y).multiplyScalar(L),m.copy(f).multiplyScalar(g.x).addScaledVector(d,-v.x).multiplyScalar(L),l[k].add(x),l[H].add(x),l[B].add(x),u[k].add(m),u[H].add(m),u[B].add(m))}let _=this.groups;_.length===0&&(_=[{start:0,count:n.length}]);for(let k=0,H=_.length;k<H;++k){let B=_[k],L=B.start,D=B.count;for(let z=L,T=L+D;z<T;z+=3)b(n[z+0],n[z+1],n[z+2])}let w=new E,y=new E,P=new E,C=new E;function F(k){P.fromArray(s,k*3),C.copy(P);let H=l[k];w.copy(H),w.sub(P.multiplyScalar(P.dot(H))).normalize(),y.crossVectors(C,H);let L=y.dot(u[k])<0?-1:1;c[k*4]=w.x,c[k*4+1]=w.y,c[k*4+2]=w.z,c[k*4+3]=L}for(let k=0,H=_.length;k<H;++k){let B=_[k],L=B.start,D=B.count;for(let z=L,T=L+D;z<T;z+=3)F(n[z+0]),F(n[z+1]),F(n[z+2])}}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0)n=new Ue(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,f=n.count;d<f;d++)n.setXYZ(d,0,0,0);let i=new E,s=new E,a=new E,o=new E,c=new E,l=new E,u=new E,h=new E;if(e)for(let d=0,f=e.count;d<f;d+=3){let p=e.getX(d+0),g=e.getX(d+1),v=e.getX(d+2);i.fromBufferAttribute(t,p),s.fromBufferAttribute(t,g),a.fromBufferAttribute(t,v),u.subVectors(a,s),h.subVectors(i,s),u.cross(h),o.fromBufferAttribute(n,p),c.fromBufferAttribute(n,g),l.fromBufferAttribute(n,v),o.add(u),c.add(u),l.add(u),n.setXYZ(p,o.x,o.y,o.z),n.setXYZ(g,c.x,c.y,c.z),n.setXYZ(v,l.x,l.y,l.z)}else for(let d=0,f=t.count;d<f;d+=3)i.fromBufferAttribute(t,d+0),s.fromBufferAttribute(t,d+1),a.fromBufferAttribute(t,d+2),u.subVectors(a,s),h.subVectors(i,s),u.cross(h),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}merge(e,t){if(!(e&&e.isBufferGeometry)){console.error("THREE.BufferGeometry.merge(): geometry not an instance of THREE.BufferGeometry.",e);return}t===void 0&&(t=0,console.warn("THREE.BufferGeometry.merge(): Overwriting original geometry, starting at offset=0. Use BufferGeometryUtils.mergeBufferGeometries() for lossless merge."));let n=this.attributes;for(let i in n){if(e.attributes[i]===void 0)continue;let a=n[i].array,o=e.attributes[i],c=o.array,l=o.itemSize*t,u=Math.min(c.length,a.length-l);for(let h=0,d=l;h<u;h++,d++)a[d]=c[h]}return this}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)je.fromBufferAttribute(e,t),je.normalize(),e.setXYZ(t,je.x,je.y,je.z)}toNonIndexed(){function e(o,c){let l=o.array,u=o.itemSize,h=o.normalized,d=new l.constructor(c.length*u),f=0,p=0;for(let g=0,v=c.length;g<v;g++){f=c[g]*u;for(let x=0;x<u;x++)d[p++]=l[f++]}return new Ue(d,u,h)}if(this.index===null)return console.warn("THREE.BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new r,n=this.index.array,i=this.attributes;for(let o in i){let c=i[o],l=e(c,n);t.setAttribute(o,l)}let s=this.morphAttributes;for(let o in s){let c=[],l=s[o];for(let u=0,h=l.length;u<h;u++){let d=l[u],f=e(d,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.5,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let i={},s=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],u=[];for(let h=0,d=l.length;h<d;h++){let f=l[h];u.push(f.toJSON(e.data))}u.length>0&&(i[c]=u,s=!0)}s&&(e.data.morphAttributes=i,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere={center:o.center.toArray(),radius:o.radius}),e}clone(){return new r().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone(t));let i=e.attributes;for(let l in i){let u=i[l];this.setAttribute(l,u.clone(t))}let s=e.morphAttributes;for(let l in s){let u=[],h=s[l];for(let d=0,f=h.length;d<f;d++)u.push(h[d].clone(t));this.morphAttributes[l]=u}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,u=a.length;l<u;l++){let h=a[l];this.addGroup(h.start,h.count,h.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this}dispose(){this.dispatchEvent({type:"dispose"})}};Ie.prototype.isBufferGeometry=!0;hl=new me,Un=new dn,ha=new hn,nn=new E,rn=new E,sn=new E,da=new E,fa=new E,pa=new E,Mr=new E,Sr=new E,Er=new E,Tr=new K,Ar=new K,Lr=new K,ma=new E,Pr=new E,lt=class extends Fe{constructor(e=new Ie,t=new Vi){super(),this.type="Mesh",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=e.material,this.geometry=e.geometry,this}updateMorphTargets(){let e=this.geometry;if(e.isBufferGeometry){let t=e.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{let t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Mesh.updateMorphTargets() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}}raycast(e,t){let n=this.geometry,i=this.material,s=this.matrixWorld;if(i===void 0||(n.boundingSphere===null&&n.computeBoundingSphere(),ha.copy(n.boundingSphere),ha.applyMatrix4(s),e.ray.intersectsSphere(ha)===!1)||(hl.copy(s).invert(),Un.copy(e.ray).applyMatrix4(hl),n.boundingBox!==null&&Un.intersectsBox(n.boundingBox)===!1))return;let a;if(n.isBufferGeometry){let o=n.index,c=n.attributes.position,l=n.morphAttributes.position,u=n.morphTargetsRelative,h=n.attributes.uv,d=n.attributes.uv2,f=n.groups,p=n.drawRange;if(o!==null)if(Array.isArray(i))for(let g=0,v=f.length;g<v;g++){let x=f[g],m=i[x.materialIndex],b=Math.max(x.start,p.start),_=Math.min(x.start+x.count,p.start+p.count);for(let w=b,y=_;w<y;w+=3){let P=o.getX(w),C=o.getX(w+1),F=o.getX(w+2);a=Cr(this,m,e,Un,c,l,u,h,d,P,C,F),a&&(a.faceIndex=Math.floor(w/3),a.face.materialIndex=x.materialIndex,t.push(a))}}else{let g=Math.max(0,p.start),v=Math.min(o.count,p.start+p.count);for(let x=g,m=v;x<m;x+=3){let b=o.getX(x),_=o.getX(x+1),w=o.getX(x+2);a=Cr(this,i,e,Un,c,l,u,h,d,b,_,w),a&&(a.faceIndex=Math.floor(x/3),t.push(a))}}else if(c!==void 0)if(Array.isArray(i))for(let g=0,v=f.length;g<v;g++){let x=f[g],m=i[x.materialIndex],b=Math.max(x.start,p.start),_=Math.min(x.start+x.count,p.start+p.count);for(let w=b,y=_;w<y;w+=3){let P=w,C=w+1,F=w+2;a=Cr(this,m,e,Un,c,l,u,h,d,P,C,F),a&&(a.faceIndex=Math.floor(w/3),a.face.materialIndex=x.materialIndex,t.push(a))}}else{let g=Math.max(0,p.start),v=Math.min(c.count,p.start+p.count);for(let x=g,m=v;x<m;x+=3){let b=x,_=x+1,w=x+2;a=Cr(this,i,e,Un,c,l,u,h,d,b,_,w),a&&(a.faceIndex=Math.floor(x/3),t.push(a))}}}else n.isGeometry&&console.error("THREE.Mesh.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}};lt.prototype.isMesh=!0;Wi=class extends Ie{constructor(e=1,t=1,n=1,i=1,s=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:i,heightSegments:s,depthSegments:a};let o=this;i=Math.floor(i),s=Math.floor(s),a=Math.floor(a);let c=[],l=[],u=[],h=[],d=0,f=0;p("z","y","x",-1,-1,n,t,e,a,s,0),p("z","y","x",1,-1,n,t,-e,a,s,1),p("x","z","y",1,1,e,n,t,i,a,2),p("x","z","y",1,-1,e,n,-t,i,a,3),p("x","y","z",1,-1,e,t,n,i,s,4),p("x","y","z",-1,-1,e,t,-n,i,s,5),this.setIndex(c),this.setAttribute("position",new $e(l,3)),this.setAttribute("normal",new $e(u,3)),this.setAttribute("uv",new $e(h,2));function p(g,v,x,m,b,_,w,y,P,C,F){let k=_/P,H=w/C,B=_/2,L=w/2,D=y/2,z=P+1,T=C+1,I=0,Z=0,$=new E;for(let U=0;U<T;U++){let W=U*H-L;for(let G=0;G<z;G++){let q=G*k-B;$[g]=q*m,$[v]=W*b,$[x]=D,l.push($.x,$.y,$.z),$[g]=0,$[v]=0,$[x]=y>0?1:-1,u.push($.x,$.y,$.z),h.push(G/P),h.push(1-U/C),I+=1}}for(let U=0;U<C;U++)for(let W=0;W<P;W++){let G=d+W+z*U,q=d+W+z*(U+1),O=d+(W+1)+z*(U+1),de=d+(W+1)+z*U;c.push(G,q,de),c.push(q,O,de),Z+=6}o.addGroup(f,Z,F),f+=Z,d+=I}}};cp={clone:ei,merge:nt},lp=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,up=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,jt=class extends Ke{constructor(e){super(),this.type="ShaderMaterial",this.defines={},this.uniforms={},this.vertexShader=lp,this.fragmentShader=up,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.extensions={derivatives:!1,fragDepth:!1,drawBuffers:!1,shaderTextureLOD:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv2:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&(e.attributes!==void 0&&console.error("THREE.ShaderMaterial: attributes should now be defined in THREE.BufferGeometry instead."),this.setValues(e))}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ei(e.uniforms),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.lights=e.lights,this.clipping=e.clipping,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let i in this.uniforms){let a=this.uniforms[i].value;a&&a.isTexture?t.uniforms[i]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[i]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[i]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[i]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[i]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[i]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[i]={type:"m4",value:a.toArray()}:t.uniforms[i]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader;let n={};for(let i in this.extensions)this.extensions[i]===!0&&(n[i]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}};jt.prototype.isShaderMaterial=!0;qi=class extends Fe{constructor(){super(),this.type="Camera",this.matrixWorldInverse=new me,this.projectionMatrix=new me,this.projectionMatrixInverse=new me}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this}getWorldDirection(e){e===void 0&&(console.warn("THREE.Camera: .getWorldDirection() target is now required"),e=new E),this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(-t[8],-t[9],-t[10]).normalize()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorldInverse.copy(this.matrixWorld).invert()}updateWorldMatrix(e,t){super.updateWorldMatrix(e,t),this.matrixWorldInverse.copy(this.matrixWorld).invert()}clone(){return new this.constructor().copy(this)}};qi.prototype.isCamera=!0;He=class extends qi{constructor(e=50,t=1,n=.1,i=2e3){super(),this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=i,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Aa*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(qs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Aa*2*Math.atan(Math.tan(qs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}setViewOffset(e,t,n,i,s,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(qs*.5*this.fov)/this.zoom,n=2*t,i=this.aspect*n,s=-.5*i,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;s+=a.offsetX*i/c,t-=a.offsetY*n/l,i*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(s+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(s,s+i,t,t-n,e,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};He.prototype.isPerspectiveCamera=!0;On=90,Gn=1,Xi=class extends Fe{constructor(e,t,n){if(super(),this.type="CubeCamera",n.isWebGLCubeRenderTarget!==!0){console.error("THREE.CubeCamera: The constructor now expects an instance of WebGLCubeRenderTarget as third parameter.");return}this.renderTarget=n;let i=new He(On,Gn,e,t);i.layers=this.layers,i.up.set(0,-1,0),i.lookAt(new E(1,0,0)),this.add(i);let s=new He(On,Gn,e,t);s.layers=this.layers,s.up.set(0,-1,0),s.lookAt(new E(-1,0,0)),this.add(s);let a=new He(On,Gn,e,t);a.layers=this.layers,a.up.set(0,0,1),a.lookAt(new E(0,1,0)),this.add(a);let o=new He(On,Gn,e,t);o.layers=this.layers,o.up.set(0,0,-1),o.lookAt(new E(0,-1,0)),this.add(o);let c=new He(On,Gn,e,t);c.layers=this.layers,c.up.set(0,-1,0),c.lookAt(new E(0,0,1)),this.add(c);let l=new He(On,Gn,e,t);l.layers=this.layers,l.up.set(0,-1,0),l.lookAt(new E(0,0,-1)),this.add(l)}update(e,t){this.parent===null&&this.updateMatrixWorld();let n=this.renderTarget,[i,s,a,o,c,l]=this.children,u=e.xr.enabled,h=e.getRenderTarget();e.xr.enabled=!1;let d=n.texture.generateMipmaps;n.texture.generateMipmaps=!1,e.setRenderTarget(n,0),e.render(t,i),e.setRenderTarget(n,1),e.render(t,s),e.setRenderTarget(n,2),e.render(t,a),e.setRenderTarget(n,3),e.render(t,o),e.setRenderTarget(n,4),e.render(t,c),n.texture.generateMipmaps=d,e.setRenderTarget(n,5),e.render(t,l),e.setRenderTarget(h),e.xr.enabled=u}},ti=class extends rt{constructor(e,t,n,i,s,a,o,c,l,u){e=e!==void 0?e:[],t=t!==void 0?t:Go,o=o!==void 0?o:Mn,super(e,t,n,i,s,a,o,c,l,u),this._needsFlipEnvMap=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};ti.prototype.isCubeTexture=!0;ts=class extends $t{constructor(e,t,n){Number.isInteger(t)&&(console.warn("THREE.WebGLCubeRenderTarget: constructor signature is now WebGLCubeRenderTarget( size, options )"),t=n),super(e,e,t),t=t||{},this.texture=new ti(void 0,t.mapping,t.wrapS,t.wrapT,t.magFilter,t.minFilter,t.format,t.type,t.anisotropy,t.encoding),this.texture.generateMipmaps=t.generateMipmaps!==void 0?t.generateMipmaps:!1,this.texture.minFilter=t.minFilter!==void 0?t.minFilter:vt,this.texture._needsFlipEnvMap=!1}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.format=Pt,this.texture.encoding=t.encoding,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},i=new Wi(5,5,5),s=new jt({name:"CubemapFromEquirect",uniforms:ei(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Qe,blending:Di});s.uniforms.tEquirect.value=t;let a=new lt(i,s),o=t.minFilter;return t.minFilter===qo&&(t.minFilter=vt),new Xi(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t,n,i){let s=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,i);e.setRenderTarget(s)}};ts.prototype.isWebGLCubeRenderTarget=!0;ns=class extends rt{constructor(e,t,n,i,s,a,o,c,l,u,h,d){super(null,a,o,c,l,u,i,s,h,d),this.image={data:e||null,width:t||1,height:n||1},this.magFilter=l!==void 0?l:ct,this.minFilter=u!==void 0?u:ct,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}};ns.prototype.isDataTexture=!0;Hn=new hn,Rr=new E,yt=class{constructor(e=new gt,t=new gt,n=new gt,i=new gt,s=new gt,a=new gt){this.planes=[e,t,n,i,s,a]}set(e,t,n,i,s,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(i),o[4].copy(s),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e){let t=this.planes,n=e.elements,i=n[0],s=n[1],a=n[2],o=n[3],c=n[4],l=n[5],u=n[6],h=n[7],d=n[8],f=n[9],p=n[10],g=n[11],v=n[12],x=n[13],m=n[14],b=n[15];return t[0].setComponents(o-i,h-c,g-d,b-v).normalize(),t[1].setComponents(o+i,h+c,g+d,b+v).normalize(),t[2].setComponents(o+s,h+l,g+f,b+x).normalize(),t[3].setComponents(o-s,h-l,g-f,b-x).normalize(),t[4].setComponents(o-a,h-u,g-p,b-m).normalize(),t[5].setComponents(o+a,h+u,g+p,b+m).normalize(),this}intersectsObject(e){let t=e.geometry;return t.boundingSphere===null&&t.computeBoundingSphere(),Hn.copy(t.boundingSphere).applyMatrix4(e.matrixWorld),this.intersectsSphere(Hn)}intersectsSprite(e){return Hn.center.set(0,0,0),Hn.radius=.7071067811865476,Hn.applyMatrix4(e.matrixWorld),this.intersectsSphere(Hn)}intersectsSphere(e){let t=this.planes,n=e.center,i=-e.radius;for(let s=0;s<6;s++)if(t[s].distanceToPoint(n)<i)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let i=t[n];if(Rr.x=i.normal.x>0?e.max.x:e.min.x,Rr.y=i.normal.y>0?e.max.y:e.min.y,Rr.z=i.normal.z>0?e.max.z:e.min.z,i.distanceToPoint(Rr)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};Ra=class extends Ie{constructor(e=1,t=1,n=1,i=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:i};let s=e/2,a=t/2,o=Math.floor(n),c=Math.floor(i),l=o+1,u=c+1,h=e/o,d=t/c,f=[],p=[],g=[],v=[];for(let x=0;x<u;x++){let m=x*d-a;for(let b=0;b<l;b++){let _=b*h-s;p.push(_,-m,0),g.push(0,0,1),v.push(b/o),v.push(1-x/c)}}for(let x=0;x<c;x++)for(let m=0;m<o;m++){let b=m+l*x,_=m+l*(x+1),w=m+1+l*(x+1),y=m+1+l*x;f.push(b,_,y),f.push(_,w,y)}this.setIndex(f),this.setAttribute("position",new $e(p,3)),this.setAttribute("normal",new $e(g,3)),this.setAttribute("uv",new $e(v,2))}},dp=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vUv ).g;
#endif`,fp=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,pp=`#ifdef ALPHATEST
	if ( diffuseColor.a < ALPHATEST ) discard;
#endif`,mp=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vUv2 ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.specularRoughness );
	#endif
#endif`,xp=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,gp="vec3 transformed = vec3( position );",vp=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,yp=`vec2 integrateSpecularBRDF( const in float dotNV, const in float roughness ) {
	const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 );
	vec4 r = roughness * c0 + c1;
	float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	return vec2( -1.04, 1.04 ) * a004 + r.zw;
}
float punctualLightIntensityToIrradianceFactor( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
#if defined ( PHYSICALLY_CORRECT_LIGHTS )
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
#else
	if( cutoffDistance > 0.0 && decayExponent > 0.0 ) {
		return pow( saturate( -lightDistance / cutoffDistance + 1.0 ), decayExponent );
	}
	return 1.0;
#endif
}
vec3 BRDF_Diffuse_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 specularColor, const in float dotLH ) {
	float fresnel = exp2( ( -5.55473 * dotLH - 6.98316 ) * dotLH );
	return ( 1.0 - specularColor ) * fresnel + specularColor;
}
vec3 F_Schlick_RoughnessDependent( const in vec3 F0, const in float dotNV, const in float roughness ) {
	float fresnel = exp2( ( -5.55473 * dotNV - 6.98316 ) * dotNV );
	vec3 Fr = max( vec3( 1.0 - roughness ), F0 ) - F0;
	return Fr * fresnel + F0;
}
float G_GGX_Smith( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gl = dotNL + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	float gv = dotNV + sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	return 1.0 / ( gl * gv );
}
float G_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
vec3 BRDF_Specular_GGX( const in IncidentLight incidentLight, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness ) {
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( incidentLight.direction + viewDir );
	float dotNL = saturate( dot( normal, incidentLight.direction ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_GGX_SmithCorrelated( alpha, dotNL, dotNV );
	float D = D_GGX( alpha, dotNH );
	return F * ( G * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transposeMat3( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
vec3 BRDF_Specular_GGX_Environment( const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
	return specularColor * brdf.x + brdf.y;
}
void BRDF_Specular_Multiscattering_Environment( const in GeometricContext geometry, const in vec3 specularColor, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
	float dotNV = saturate( dot( geometry.normal, geometry.viewDir ) );
	vec3 F = F_Schlick_RoughnessDependent( specularColor, dotNV, roughness );
	vec2 brdf = integrateSpecularBRDF( dotNV, roughness );
	vec3 FssEss = F * brdf.x + brdf.y;
	float Ess = brdf.x + brdf.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = specularColor + ( 1.0 - specularColor ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_Specular_BlinnPhong( const in IncidentLight incidentLight, const in GeometricContext geometry, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( incidentLight.direction + geometry.viewDir );
	float dotNH = saturate( dot( geometry.normal, halfDir ) );
	float dotLH = saturate( dot( incidentLight.direction, halfDir ) );
	vec3 F = F_Schlick( specularColor, dotLH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
}
float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {
	return ( 2.0 / pow2( ggxRoughness + 0.0001 ) - 2.0 );
}
float BlinnExponentToGGXRoughness( const in float blinnExponent ) {
	return sqrt( 2.0 / ( blinnExponent + 2.0 ) );
}
#if defined( USE_SHEEN )
float D_Charlie(float roughness, float NoH) {
	float invAlpha = 1.0 / roughness;
	float cos2h = NoH * NoH;
	float sin2h = max(1.0 - cos2h, 0.0078125);	return (2.0 + invAlpha) * pow(sin2h, invAlpha * 0.5) / (2.0 * PI);
}
float V_Neubelt(float NoV, float NoL) {
	return saturate(1.0 / (4.0 * (NoL + NoV - NoL * NoV)));
}
vec3 BRDF_Specular_Sheen( const in float roughness, const in vec3 L, const in GeometricContext geometry, vec3 specularColor ) {
	vec3 N = geometry.normal;
	vec3 V = geometry.viewDir;
	vec3 H = normalize( V + L );
	float dotNH = saturate( dot( N, H ) );
	return specularColor * D_Charlie( roughness, dotNH ) * V_Neubelt( dot(N, V), dot(N, L) );
}
#endif`,bp=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vUv );
		vec2 dSTdy = dFdy( vUv );
		float Hll = bumpScale * texture2D( bumpMap, vUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = vec3( dFdx( surf_pos.x ), dFdx( surf_pos.y ), dFdx( surf_pos.z ) );
		vec3 vSigmaY = vec3( dFdy( surf_pos.x ), dFdy( surf_pos.y ), dFdy( surf_pos.z ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,_p=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#pragma unroll_loop_start
	for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
		plane = clippingPlanes[ i ];
		if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
	}
	#pragma unroll_loop_end
	#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
		bool clipped = true;
		#pragma unroll_loop_start
		for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
		}
		#pragma unroll_loop_end
		if ( clipped ) discard;
	#endif
#endif`,wp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Mp=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Sp=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ep=`#if defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#elif defined( USE_COLOR )
	diffuseColor.rgb *= vColor;
#endif`,Tp=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR )
	varying vec3 vColor;
#endif`,Ap=`#if defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	varying vec3 vColor;
#endif`,Lp=`#if defined( USE_COLOR_ALPHA )
	vColor = vec4( 1.0 );
#elif defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )
	vColor = vec3( 1.0 );
#endif
#ifdef USE_COLOR
	vColor *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.xyz *= instanceColor.xyz;
#endif`,Pp=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement(a) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float average( const in vec3 color ) { return dot( color, vec3( 0.3333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract(sin(sn) * c);
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float max3( vec3 v ) { return max( max( v.x, v.y ), v.z ); }
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
struct GeometricContext {
	vec3 position;
	vec3 normal;
	vec3 viewDir;
#ifdef CLEARCOAT
	vec3 clearcoatNormal;
#endif
};
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
vec3 projectOnPlane(in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	float distance = dot( planeNormal, point - pointOnPlane );
	return - distance * planeNormal + point;
}
float sideOfPlane( in vec3 point, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return sign( dot( point - pointOnPlane, planeNormal ) );
}
vec3 linePlaneIntersect( in vec3 pointOnLine, in vec3 lineDirection, in vec3 pointOnPlane, in vec3 planeNormal ) {
	return lineDirection * ( dot( planeNormal, pointOnPlane - pointOnLine ) / dot( planeNormal, lineDirection ) ) + pointOnLine;
}
mat3 transposeMat3( const in mat3 m ) {
	mat3 tmp;
	tmp[ 0 ] = vec3( m[ 0 ].x, m[ 1 ].x, m[ 2 ].x );
	tmp[ 1 ] = vec3( m[ 0 ].y, m[ 1 ].y, m[ 2 ].y );
	tmp[ 2 ] = vec3( m[ 0 ].z, m[ 1 ].z, m[ 2 ].z );
	return tmp;
}
float linearToRelativeLuminance( const in vec3 color ) {
	vec3 weights = vec3( 0.2126, 0.7152, 0.0722 );
	return dot( weights, color.rgb );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}`,Cp=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_maxMipLevel 8.0
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_maxTileSize 256.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		float texelSize = 1.0 / ( 3.0 * cubeUV_maxTileSize );
		vec2 uv = getUV( direction, face ) * ( faceSize - 1.0 );
		vec2 f = fract( uv );
		uv += 0.5 - f;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		if ( mipInt < cubeUV_maxMipLevel ) {
			uv.y += 2.0 * cubeUV_maxTileSize;
		}
		uv.y += filterInt * 2.0 * cubeUV_minTileSize;
		uv.x += 3.0 * max( 0.0, cubeUV_maxTileSize - 2.0 * faceSize );
		uv *= texelSize;
		vec3 tl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.x += texelSize;
		vec3 tr = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.y += texelSize;
		vec3 br = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		uv.x -= texelSize;
		vec3 bl = envMapTexelToLinear( texture2D( envMap, uv ) ).rgb;
		vec3 tm = mix( tl, tr, f.x );
		vec3 bm = mix( bl, br, f.x );
		return mix( tm, bm, f.y );
	}
	#define r0 1.0
	#define v0 0.339
	#define m0 - 2.0
	#define r1 0.8
	#define v1 0.276
	#define m1 - 1.0
	#define r4 0.4
	#define v4 0.046
	#define m4 2.0
	#define r5 0.305
	#define v5 0.016
	#define m5 3.0
	#define r6 0.21
	#define v6 0.0038
	#define m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= r1 ) {
			mip = ( r0 - roughness ) * ( m1 - m0 ) / ( r0 - r1 ) + m0;
		} else if ( roughness >= r4 ) {
			mip = ( r1 - roughness ) * ( m4 - m1 ) / ( r1 - r4 ) + m1;
		} else if ( roughness >= r5 ) {
			mip = ( r4 - roughness ) * ( m5 - m4 ) / ( r4 - r5 ) + m4;
		} else if ( roughness >= r6 ) {
			mip = ( r5 - roughness ) * ( m6 - m5 ) / ( r5 - r6 ) + m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), m0, cubeUV_maxMipLevel );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Rp=`vec3 transformedNormal = objectNormal;
#ifdef USE_INSTANCING
	mat3 m = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( m[ 0 ], m[ 0 ] ), dot( m[ 1 ], m[ 1 ] ), dot( m[ 2 ], m[ 2 ] ) );
	transformedNormal = m * transformedNormal;
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	vec3 transformedTangent = ( modelViewMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Ip=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Dp=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vUv ).x * displacementScale + displacementBias );
#endif`,zp=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vUv );
	emissiveColor.rgb = emissiveMapTexelToLinear( emissiveColor ).rgb;
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Fp=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Bp="gl_FragColor = linearToOutputTexel( gl_FragColor );",kp=`
vec4 LinearToLinear( in vec4 value ) {
	return value;
}
vec4 GammaToLinear( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( gammaFactor ) ), value.a );
}
vec4 LinearToGamma( in vec4 value, in float gammaFactor ) {
	return vec4( pow( value.rgb, vec3( 1.0 / gammaFactor ) ), value.a );
}
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}
vec4 RGBEToLinear( in vec4 value ) {
	return vec4( value.rgb * exp2( value.a * 255.0 - 128.0 ), 1.0 );
}
vec4 LinearToRGBE( in vec4 value ) {
	float maxComponent = max( max( value.r, value.g ), value.b );
	float fExp = clamp( ceil( log2( maxComponent ) ), -128.0, 127.0 );
	return vec4( value.rgb / exp2( fExp ), ( fExp + 128.0 ) / 255.0 );
}
vec4 RGBMToLinear( in vec4 value, in float maxRange ) {
	return vec4( value.rgb * value.a * maxRange, 1.0 );
}
vec4 LinearToRGBM( in vec4 value, in float maxRange ) {
	float maxRGB = max( value.r, max( value.g, value.b ) );
	float M = clamp( maxRGB / maxRange, 0.0, 1.0 );
	M = ceil( M * 255.0 ) / 255.0;
	return vec4( value.rgb / ( M * maxRange ), M );
}
vec4 RGBDToLinear( in vec4 value, in float maxRange ) {
	return vec4( value.rgb * ( ( maxRange / 255.0 ) / value.a ), 1.0 );
}
vec4 LinearToRGBD( in vec4 value, in float maxRange ) {
	float maxRGB = max( value.r, max( value.g, value.b ) );
	float D = max( maxRange / maxRGB, 1.0 );
	D = clamp( floor( D ) / 255.0, 0.0, 1.0 );
	return vec4( value.rgb * ( D * ( 255.0 / maxRange ) ), D );
}
const mat3 cLogLuvM = mat3( 0.2209, 0.3390, 0.4184, 0.1138, 0.6780, 0.7319, 0.0102, 0.1130, 0.2969 );
vec4 LinearToLogLuv( in vec4 value ) {
	vec3 Xp_Y_XYZp = cLogLuvM * value.rgb;
	Xp_Y_XYZp = max( Xp_Y_XYZp, vec3( 1e-6, 1e-6, 1e-6 ) );
	vec4 vResult;
	vResult.xy = Xp_Y_XYZp.xy / Xp_Y_XYZp.z;
	float Le = 2.0 * log2(Xp_Y_XYZp.y) + 127.0;
	vResult.w = fract( Le );
	vResult.z = ( Le - ( floor( vResult.w * 255.0 ) ) / 255.0 ) / 255.0;
	return vResult;
}
const mat3 cLogLuvInverseM = mat3( 6.0014, -2.7008, -1.7996, -1.3320, 3.1029, -5.7721, 0.3008, -1.0882, 5.6268 );
vec4 LogLuvToLinear( in vec4 value ) {
	float Le = value.z * 255.0 + value.w;
	vec3 Xp_Y_XYZp;
	Xp_Y_XYZp.y = exp2( ( Le - 127.0 ) / 2.0 );
	Xp_Y_XYZp.z = Xp_Y_XYZp.y / value.y;
	Xp_Y_XYZp.x = value.x * Xp_Y_XYZp.z;
	vec3 vRGB = cLogLuvInverseM * Xp_Y_XYZp.rgb;
	return vec4( max( vRGB, 0.0 ), 1.0 );
}`,Np=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 envColor = textureCubeUV( envMap, reflectVec, 0.0 );
	#else
		vec4 envColor = vec4( 0.0 );
	#endif
	#ifndef ENVMAP_TYPE_CUBE_UV
		envColor = envMapTexelToLinear( envColor );
	#endif
	#ifdef ENVMAP_BLENDING_MULTIPLY
		outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_MIX )
		outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
	#elif defined( ENVMAP_BLENDING_ADD )
		outgoingLight += envColor.xyz * specularStrength * reflectivity;
	#endif
#endif`,Up=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform int maxMipLevel;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
	
#endif`,Op=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Gp=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) ||defined( PHONG )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Hp=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Vp=`#ifdef USE_FOG
	fogDepth = - mvPosition.z;
#endif`,Wp=`#ifdef USE_FOG
	varying float fogDepth;
#endif`,qp=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * fogDepth * fogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, fogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Xp=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float fogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Yp=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return texture2D( gradientMap, coord ).rgb;
	#else
		return ( coord.x < 0.7 ) ? vec3( 0.7 ) : vec3( 1.0 );
	#endif
}`,$p=`#ifdef USE_LIGHTMAP
	vec4 lightMapTexel= texture2D( lightMap, vUv2 );
	reflectedLight.indirectDiffuse += PI * lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
#endif`,Zp=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Jp=`vec3 diffuse = vec3( 1.0 );
GeometricContext geometry;
geometry.position = mvPosition.xyz;
geometry.normal = normalize( transformedNormal );
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( -mvPosition.xyz );
GeometricContext backGeometry;
backGeometry.position = geometry.position;
backGeometry.normal = -geometry.normal;
backGeometry.viewDir = geometry.viewDir;
vLightFront = vec3( 0.0 );
vIndirectFront = vec3( 0.0 );
#ifdef DOUBLE_SIDED
	vLightBack = vec3( 0.0 );
	vIndirectBack = vec3( 0.0 );
#endif
IncidentLight directLight;
float dotNL;
vec3 directLightColor_Diffuse;
vIndirectFront += getAmbientLightIrradiance( ambientLightColor );
vIndirectFront += getLightProbeIrradiance( lightProbe, geometry );
#ifdef DOUBLE_SIDED
	vIndirectBack += getAmbientLightIrradiance( ambientLightColor );
	vIndirectBack += getLightProbeIrradiance( lightProbe, backGeometry );
#endif
#if NUM_POINT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		getPointDirectLightIrradiance( pointLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_SPOT_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		getSpotDirectLightIrradiance( spotLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_DIR_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		getDirectionalDirectLightIrradiance( directionalLights[ i ], geometry, directLight );
		dotNL = dot( geometry.normal, directLight.direction );
		directLightColor_Diffuse = PI * directLight.color;
		vLightFront += saturate( dotNL ) * directLightColor_Diffuse;
		#ifdef DOUBLE_SIDED
			vLightBack += saturate( -dotNL ) * directLightColor_Diffuse;
		#endif
	}
	#pragma unroll_loop_end
#endif
#if NUM_HEMI_LIGHTS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
		vIndirectFront += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
		#ifdef DOUBLE_SIDED
			vIndirectBack += getHemisphereLightIrradiance( hemisphereLights[ i ], backGeometry );
		#endif
	}
	#pragma unroll_loop_end
#endif`,jp=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
uniform vec3 lightProbe[ 9 ];
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in GeometricContext geometry ) {
	vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	return irradiance;
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalDirectLightIrradiance( const in DirectionalLight directionalLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		directLight.color = directionalLight.color;
		directLight.direction = directionalLight.direction;
		directLight.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointDirectLightIrradiance( const in PointLight pointLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		vec3 lVector = pointLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		directLight.color = pointLight.color;
		directLight.color *= punctualLightIntensityToIrradianceFactor( lightDistance, pointLight.distance, pointLight.decay );
		directLight.visible = ( directLight.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotDirectLightIrradiance( const in SpotLight spotLight, const in GeometricContext geometry, out IncidentLight directLight ) {
		vec3 lVector = spotLight.position - geometry.position;
		directLight.direction = normalize( lVector );
		float lightDistance = length( lVector );
		float angleCos = dot( directLight.direction, spotLight.direction );
		if ( angleCos > spotLight.coneCos ) {
			float spotEffect = smoothstep( spotLight.coneCos, spotLight.penumbraCos, angleCos );
			directLight.color = spotLight.color;
			directLight.color *= spotEffect * punctualLightIntensityToIrradianceFactor( lightDistance, spotLight.distance, spotLight.decay );
			directLight.visible = true;
		} else {
			directLight.color = vec3( 0.0 );
			directLight.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in GeometricContext geometry ) {
		float dotNL = dot( geometry.normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			irradiance *= PI;
		#endif
		return irradiance;
	}
#endif`,Qp=`#if defined( USE_ENVMAP )
	#ifdef ENVMAP_MODE_REFRACTION
		uniform float refractionRatio;
	#endif
	vec3 getLightProbeIndirectIrradiance( const in GeometricContext geometry, const in int maxMIPLevel ) {
		vec3 worldNormal = inverseTransformDirection( geometry.normal, viewMatrix );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryVec = vec3( flipEnvMap * worldNormal.x, worldNormal.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryVec, float( maxMIPLevel ) );
			#else
				vec4 envMapColor = textureCube( envMap, queryVec, float( maxMIPLevel ) );
			#endif
			envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
		#elif defined( ENVMAP_TYPE_CUBE_UV )
			vec4 envMapColor = textureCubeUV( envMap, worldNormal, 1.0 );
		#else
			vec4 envMapColor = vec4( 0.0 );
		#endif
		return PI * envMapColor.rgb * envMapIntensity;
	}
	float getSpecularMIPLevel( const in float roughness, const in int maxMIPLevel ) {
		float maxMIPLevelScalar = float( maxMIPLevel );
		float sigma = PI * roughness * roughness / ( 1.0 + roughness );
		float desiredMIPLevel = maxMIPLevelScalar + log2( sigma );
		return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
	}
	vec3 getLightProbeIndirectRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in int maxMIPLevel ) {
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( -viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, roughness * roughness) );
		#else
			vec3 reflectVec = refract( -viewDir, normal, refractionRatio );
		#endif
		reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
		float specularMIPLevel = getSpecularMIPLevel( roughness, maxMIPLevel );
		#ifdef ENVMAP_TYPE_CUBE
			vec3 queryReflectVec = vec3( flipEnvMap * reflectVec.x, reflectVec.yz );
			#ifdef TEXTURE_LOD_EXT
				vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );
			#else
				vec4 envMapColor = textureCube( envMap, queryReflectVec, specularMIPLevel );
			#endif
			envMapColor.rgb = envMapTexelToLinear( envMapColor ).rgb;
		#elif defined( ENVMAP_TYPE_CUBE_UV )
			vec4 envMapColor = textureCubeUV( envMap, reflectVec, roughness );
		#endif
		return envMapColor.rgb * envMapIntensity;
	}
#endif`,Kp=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,e1=`varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometry.normal, directLight.direction ) * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in GeometricContext geometry, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon
#define Material_LightProbeLOD( material )	(0)`,t1=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,n1=`varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	reflectedLight.directDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_Specular_BlinnPhong( directLight, geometry, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in GeometricContext geometry, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong
#define Material_LightProbeLOD( material )	(0)`,i1=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb * ( 1.0 - metalnessFactor );
vec3 dxy = max( abs( dFdx( geometryNormal ) ), abs( dFdy( geometryNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.specularRoughness = max( roughnessFactor, 0.0525 );material.specularRoughness += geometryRoughness;
material.specularRoughness = min( material.specularRoughness, 1.0 );
#ifdef REFLECTIVITY
	material.specularColor = mix( vec3( MAXIMUM_SPECULAR_COEFFICIENT * pow2( reflectivity ) ), diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = mix( vec3( DEFAULT_SPECULAR_COEFFICIENT ), diffuseColor.rgb, metalnessFactor );
#endif
#ifdef CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheen;
#endif`,r1=`struct PhysicalMaterial {
	vec3 diffuseColor;
	float specularRoughness;
	vec3 specularColor;
#ifdef CLEARCOAT
	float clearcoat;
	float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	vec3 sheenColor;
#endif
};
#define MAXIMUM_SPECULAR_COEFFICIENT 0.16
#define DEFAULT_SPECULAR_COEFFICIENT 0.04
float clearcoatDHRApprox( const in float roughness, const in float dotNL ) {
	return DEFAULT_SPECULAR_COEFFICIENT + ( 1.0 - DEFAULT_SPECULAR_COEFFICIENT ) * ( pow( 1.0 - dotNL, 5.0 ) * pow( 1.0 - roughness, 2.0 ) );
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometry.normal;
		vec3 viewDir = geometry.viewDir;
		vec3 position = geometry.position;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.specularRoughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColor * t2.x + ( vec3( 1.0 ) - material.specularColor ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseColor * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometry.normal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifndef PHYSICALLY_CORRECT_LIGHTS
		irradiance *= PI;
	#endif
	#ifdef CLEARCOAT
		float ccDotNL = saturate( dot( geometry.clearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = ccDotNL * directLight.color;
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			ccIrradiance *= PI;
		#endif
		float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
		reflectedLight.directSpecular += ccIrradiance * material.clearcoat * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearcoatRoughness );
	#else
		float clearcoatDHR = 0.0;
	#endif
	#ifdef USE_SHEEN
		reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_Sheen(
			material.specularRoughness,
			directLight.direction,
			geometry,
			material.sheenColor
		);
	#else
		reflectedLight.directSpecular += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Specular_GGX( directLight, geometry.viewDir, geometry.normal, material.specularColor, material.specularRoughness);
	#endif
	reflectedLight.directDiffuse += ( 1.0 - clearcoatDHR ) * irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Diffuse_Lambert( material.diffuseColor );
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in GeometricContext geometry, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef CLEARCOAT
		float ccDotNV = saturate( dot( geometry.clearcoatNormal, geometry.viewDir ) );
		reflectedLight.indirectSpecular += clearcoatRadiance * material.clearcoat * BRDF_Specular_GGX_Environment( geometry.viewDir, geometry.clearcoatNormal, vec3( DEFAULT_SPECULAR_COEFFICIENT ), material.clearcoatRoughness );
		float ccDotNL = ccDotNV;
		float clearcoatDHR = material.clearcoat * clearcoatDHRApprox( material.clearcoatRoughness, ccDotNL );
	#else
		float clearcoatDHR = 0.0;
	#endif
	float clearcoatInv = 1.0 - clearcoatDHR;
	vec3 singleScattering = vec3( 0.0 );
	vec3 multiScattering = vec3( 0.0 );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	BRDF_Specular_Multiscattering_Environment( geometry, material.specularColor, material.specularRoughness, singleScattering, multiScattering );
	vec3 diffuse = material.diffuseColor * ( 1.0 - ( singleScattering + multiScattering ) );
	reflectedLight.indirectSpecular += clearcoatInv * radiance * singleScattering;
	reflectedLight.indirectSpecular += multiScattering * cosineWeightedIrradiance;
	reflectedLight.indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,s1=`
GeometricContext geometry;
geometry.position = - vViewPosition;
geometry.normal = normal;
geometry.viewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
#ifdef CLEARCOAT
	geometry.clearcoatNormal = clearcoatNormal;
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointDirectLightIrradiance( pointLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotDirectLightIrradiance( spotLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalDirectLightIrradiance( directionalLight, geometry, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= all( bvec2( directLight.visible, receiveShadow ) ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometry, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	irradiance += getLightProbeIrradiance( lightProbe, geometry );
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometry );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,a1=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel= texture2D( lightMap, vUv2 );
		vec3 lightMapIrradiance = lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
		#ifndef PHYSICALLY_CORRECT_LIGHTS
			lightMapIrradiance *= PI;
		#endif
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )
		iblIrradiance += getLightProbeIndirectIrradiance( geometry, maxMipLevel );
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	radiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.normal, material.specularRoughness, maxMipLevel );
	#ifdef CLEARCOAT
		clearcoatRadiance += getLightProbeIndirectRadiance( geometry.viewDir, geometry.clearcoatNormal, material.clearcoatRoughness, maxMipLevel );
	#endif
#endif`,o1=`#if defined( RE_IndirectDiffuse )
	RE_IndirectDiffuse( irradiance, geometry, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometry, material, reflectedLight );
#endif`,c1=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	gl_FragDepthEXT = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,l1=`#if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,u1=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		varying float vFragDepth;
		varying float vIsPerspective;
	#else
		uniform float logDepthBufFC;
	#endif
#endif`,h1=`#ifdef USE_LOGDEPTHBUF
	#ifdef USE_LOGDEPTHBUF_EXT
		vFragDepth = 1.0 + gl_Position.w;
		vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
	#else
		if ( isPerspectiveMatrix( projectionMatrix ) ) {
			gl_Position.z = log2( max( EPSILON, gl_Position.w + 1.0 ) ) * logDepthBufFC - 1.0;
			gl_Position.z *= gl_Position.w;
		}
	#endif
#endif`,d1=`#ifdef USE_MAP
	vec4 texelColor = texture2D( map, vUv );
	texelColor = mapTexelToLinear( texelColor );
	diffuseColor *= texelColor;
#endif`,f1=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,p1=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
#endif
#ifdef USE_MAP
	vec4 mapTexel = texture2D( map, uv );
	diffuseColor *= mapTexelToLinear( mapTexel );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,m1=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	uniform mat3 uvTransform;
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,x1=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vUv );
	metalnessFactor *= texelMetalness.b;
#endif`,g1=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,v1=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	objectNormal += morphNormal0 * morphTargetInfluences[ 0 ];
	objectNormal += morphNormal1 * morphTargetInfluences[ 1 ];
	objectNormal += morphNormal2 * morphTargetInfluences[ 2 ];
	objectNormal += morphNormal3 * morphTargetInfluences[ 3 ];
#endif`,y1=`#ifdef USE_MORPHTARGETS
	uniform float morphTargetBaseInfluence;
	#ifndef USE_MORPHNORMALS
		uniform float morphTargetInfluences[ 8 ];
	#else
		uniform float morphTargetInfluences[ 4 ];
	#endif
#endif`,b1=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	transformed += morphTarget0 * morphTargetInfluences[ 0 ];
	transformed += morphTarget1 * morphTargetInfluences[ 1 ];
	transformed += morphTarget2 * morphTargetInfluences[ 2 ];
	transformed += morphTarget3 * morphTargetInfluences[ 3 ];
	#ifndef USE_MORPHNORMALS
		transformed += morphTarget4 * morphTargetInfluences[ 4 ];
		transformed += morphTarget5 * morphTargetInfluences[ 5 ];
		transformed += morphTarget6 * morphTargetInfluences[ 6 ];
		transformed += morphTarget7 * morphTargetInfluences[ 7 ];
	#endif
#endif`,_1=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = vec3( dFdx( vViewPosition.x ), dFdx( vViewPosition.y ), dFdx( vViewPosition.z ) );
	vec3 fdy = vec3( dFdy( vViewPosition.x ), dFdy( vViewPosition.y ), dFdy( vViewPosition.z ) );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	#ifdef USE_TANGENT
		vec3 tangent = normalize( vTangent );
		vec3 bitangent = normalize( vBitangent );
		#ifdef DOUBLE_SIDED
			tangent = tangent * faceDirection;
			bitangent = bitangent * faceDirection;
		#endif
		#if defined( TANGENTSPACE_NORMALMAP ) || defined( USE_CLEARCOAT_NORMALMAP )
			mat3 vTBN = mat3( tangent, bitangent, normal );
		#endif
	#endif
#endif
vec3 geometryNormal = normal;`,w1=`#ifdef OBJECTSPACE_NORMALMAP
	normal = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( TANGENTSPACE_NORMALMAP )
	vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	#ifdef USE_TANGENT
		normal = normalize( vTBN * mapN );
	#else
		normal = perturbNormal2Arb( -vViewPosition, normal, mapN, faceDirection );
	#endif
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( -vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,M1=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef OBJECTSPACE_NORMALMAP
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( TANGENTSPACE_NORMALMAP ) || defined ( USE_CLEARCOAT_NORMALMAP ) )
	vec3 perturbNormal2Arb( vec3 eye_pos, vec3 surf_norm, vec3 mapN, float faceDirection ) {
		vec3 q0 = vec3( dFdx( eye_pos.x ), dFdx( eye_pos.y ), dFdx( eye_pos.z ) );
		vec3 q1 = vec3( dFdy( eye_pos.x ), dFdy( eye_pos.y ), dFdy( eye_pos.z ) );
		vec2 st0 = dFdx( vUv.st );
		vec2 st1 = dFdy( vUv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : faceDirection * inversesqrt( det );
		return normalize( T * ( mapN.x * scale ) + B * ( mapN.y * scale ) + N * mapN.z );
	}
#endif`,S1=`#ifdef CLEARCOAT
	vec3 clearcoatNormal = geometryNormal;
#endif`,E1=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	#ifdef USE_TANGENT
		clearcoatNormal = normalize( vTBN * clearcoatMapN );
	#else
		clearcoatNormal = perturbNormal2Arb( - vViewPosition, clearcoatNormal, clearcoatMapN, faceDirection );
	#endif
#endif`,T1=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif`,A1=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;
const vec3 PackFactors = vec3( 256. * 256. * 256., 256. * 256., 256. );
const vec4 UnpackFactors = UnpackDownscale / vec4( PackFactors, 1. );
const float ShiftRight8 = 1. / 256.;
vec4 packDepthToRGBA( const in float v ) {
	vec4 r = vec4( fract( v * PackFactors ), v );
	r.yzw -= r.xyz * ShiftRight8;	return r * PackUpscale;
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors );
}
vec4 pack2HalfToRGBA( vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ));
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w);
}
vec2 unpackRGBATo2Half( vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float linearClipZ, const in float near, const in float far ) {
	return linearClipZ * ( near - far ) - near;
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return (( near + viewZ ) * far ) / (( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float invClipZ, const in float near, const in float far ) {
	return ( near * far ) / ( ( far - near ) * invClipZ - far );
}`,L1=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,P1=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,C1=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,R1=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,I1=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vUv );
	roughnessFactor *= texelRoughness.g;
#endif`,D1=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,z1=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform sampler2D pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	float texture2DCompare( sampler2D depths, vec2 uv, float compare ) {
		return step( compare, unpackRGBAToDepth( texture2D( depths, uv ) ) );
	}
	vec2 texture2DDistribution( sampler2D shadow, vec2 uv ) {
		return unpackRGBATo2Half( texture2D( shadow, uv ) );
	}
	float VSMShadow (sampler2D shadow, vec2 uv, float compare ){
		float occlusion = 1.0;
		vec2 distribution = texture2DDistribution( shadow, uv );
		float hard_shadow = step( compare , distribution.x );
		if (hard_shadow != 1.0 ) {
			float distance = compare - distribution.x ;
			float variance = max( 0.00000, distribution.y * distribution.y );
			float softness_probability = variance / (variance + distance * distance );			softness_probability = clamp( ( softness_probability - 0.3 ) / ( 0.95 - 0.3 ), 0.0, 1.0 );			occlusion = clamp( max( hard_shadow, softness_probability ), 0.0, 1.0 );
		}
		return occlusion;
	}
	float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
		float shadow = 1.0;
		shadowCoord.xyz /= shadowCoord.w;
		shadowCoord.z += shadowBias;
		bvec4 inFrustumVec = bvec4 ( shadowCoord.x >= 0.0, shadowCoord.x <= 1.0, shadowCoord.y >= 0.0, shadowCoord.y <= 1.0 );
		bool inFrustum = all( inFrustumVec );
		bvec2 frustumTestVec = bvec2( inFrustum, shadowCoord.z <= 1.0 );
		bool frustumTest = all( frustumTestVec );
		if ( frustumTest ) {
		#if defined( SHADOWMAP_TYPE_PCF )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx0 = - texelSize.x * shadowRadius;
			float dy0 = - texelSize.y * shadowRadius;
			float dx1 = + texelSize.x * shadowRadius;
			float dy1 = + texelSize.y * shadowRadius;
			float dx2 = dx0 / 2.0;
			float dy2 = dy0 / 2.0;
			float dx3 = dx1 / 2.0;
			float dy3 = dy1 / 2.0;
			shadow = (
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy2 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx2, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx3, dy3 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( 0.0, dy1 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, shadowCoord.xy + vec2( dx1, dy1 ), shadowCoord.z )
			) * ( 1.0 / 17.0 );
		#elif defined( SHADOWMAP_TYPE_PCF_SOFT )
			vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
			float dx = texelSize.x;
			float dy = texelSize.y;
			vec2 uv = shadowCoord.xy;
			vec2 f = fract( uv * shadowMapSize + 0.5 );
			uv -= f * texelSize;
			shadow = (
				texture2DCompare( shadowMap, uv, shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( dx, 0.0 ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + vec2( 0.0, dy ), shadowCoord.z ) +
				texture2DCompare( shadowMap, uv + texelSize, shadowCoord.z ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, 0.0 ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 0.0 ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( -dx, dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, dy ), shadowCoord.z ),
					 f.x ) +
				mix( texture2DCompare( shadowMap, uv + vec2( 0.0, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( 0.0, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( texture2DCompare( shadowMap, uv + vec2( dx, -dy ), shadowCoord.z ), 
					 texture2DCompare( shadowMap, uv + vec2( dx, 2.0 * dy ), shadowCoord.z ),
					 f.y ) +
				mix( mix( texture2DCompare( shadowMap, uv + vec2( -dx, -dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, -dy ), shadowCoord.z ),
						  f.x ),
					 mix( texture2DCompare( shadowMap, uv + vec2( -dx, 2.0 * dy ), shadowCoord.z ), 
						  texture2DCompare( shadowMap, uv + vec2( 2.0 * dx, 2.0 * dy ), shadowCoord.z ),
						  f.x ),
					 f.y )
			) * ( 1.0 / 9.0 );
		#elif defined( SHADOWMAP_TYPE_VSM )
			shadow = VSMShadow( shadowMap, shadowCoord.xy, shadowCoord.z );
		#else
			shadow = texture2DCompare( shadowMap, shadowCoord.xy, shadowCoord.z );
		#endif
		}
		return shadow;
	}
	vec2 cubeToUV( vec3 v, float texelSizeY ) {
		vec3 absV = abs( v );
		float scaleToCube = 1.0 / max( absV.x, max( absV.y, absV.z ) );
		absV *= scaleToCube;
		v *= scaleToCube * ( 1.0 - 2.0 * texelSizeY );
		vec2 planar = v.xy;
		float almostATexel = 1.5 * texelSizeY;
		float almostOne = 1.0 - almostATexel;
		if ( absV.z >= almostOne ) {
			if ( v.z > 0.0 )
				planar.x = 4.0 - v.x;
		} else if ( absV.x >= almostOne ) {
			float signX = sign( v.x );
			planar.x = v.z * signX + 2.0 * signX;
		} else if ( absV.y >= almostOne ) {
			float signY = sign( v.y );
			planar.x = v.x + 2.0 * signY + 2.0;
			planar.y = v.z * signY - 2.0;
		}
		return vec2( 0.125, 0.25 ) * planar + vec2( 0.375, 0.75 );
	}
	float getPointShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		vec2 texelSize = vec2( 1.0 ) / ( shadowMapSize * vec2( 4.0, 2.0 ) );
		vec3 lightToPosition = shadowCoord.xyz;
		float dp = ( length( lightToPosition ) - shadowCameraNear ) / ( shadowCameraFar - shadowCameraNear );		dp += shadowBias;
		vec3 bd3D = normalize( lightToPosition );
		#if defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_PCF_SOFT ) || defined( SHADOWMAP_TYPE_VSM )
			vec2 offset = vec2( - 1, 1 ) * shadowRadius * texelSize.y;
			return (
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yyx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxy, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.xxx, texelSize.y ), dp ) +
				texture2DCompare( shadowMap, cubeToUV( bd3D + offset.yxx, texelSize.y ), dp )
			) * ( 1.0 / 9.0 );
		#else
			return texture2DCompare( shadowMap, cubeToUV( bd3D, texelSize.y ), dp );
		#endif
	}
#endif`,F1=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		uniform mat4 spotShadowMatrix[ NUM_SPOT_LIGHT_SHADOWS ];
		varying vec4 vSpotShadowCoord[ NUM_SPOT_LIGHT_SHADOWS ];
		struct SpotLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,B1=`#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0 || NUM_SPOT_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0
		vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		vec4 shadowWorldPosition;
	#endif
	#if NUM_DIR_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
		vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias, 0 );
		vSpotShadowCoord[ i ] = spotShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
		vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
	#endif
#endif`,k1=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowBias, spotLight.shadowRadius, vSpotShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,N1=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,U1=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	#ifdef BONE_TEXTURE
		uniform highp sampler2D boneTexture;
		uniform int boneTextureSize;
		mat4 getBoneMatrix( const in float i ) {
			float j = i * 4.0;
			float x = mod( j, float( boneTextureSize ) );
			float y = floor( j / float( boneTextureSize ) );
			float dx = 1.0 / float( boneTextureSize );
			float dy = 1.0 / float( boneTextureSize );
			y = dy * ( y + 0.5 );
			vec4 v1 = texture2D( boneTexture, vec2( dx * ( x + 0.5 ), y ) );
			vec4 v2 = texture2D( boneTexture, vec2( dx * ( x + 1.5 ), y ) );
			vec4 v3 = texture2D( boneTexture, vec2( dx * ( x + 2.5 ), y ) );
			vec4 v4 = texture2D( boneTexture, vec2( dx * ( x + 3.5 ), y ) );
			mat4 bone = mat4( v1, v2, v3, v4 );
			return bone;
		}
	#else
		uniform mat4 boneMatrices[ MAX_BONES ];
		mat4 getBoneMatrix( const in float i ) {
			mat4 bone = boneMatrices[ int(i) ];
			return bone;
		}
	#endif
#endif`,O1=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,G1=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,H1=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,V1=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,W1=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,q1=`#ifndef saturate
#define saturate(a) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return toneMappingExposure * color;
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 OptimizedCineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,X1=`#ifdef USE_TRANSMISSIONMAP
	totalTransmission *= texture2D( transmissionMap, vUv ).r;
#endif`,Y1=`#ifdef USE_TRANSMISSIONMAP
	uniform sampler2D transmissionMap;
#endif`,$1=`#if ( defined( USE_UV ) && ! defined( UVS_VERTEX_ONLY ) )
	varying vec2 vUv;
#endif`,Z1=`#ifdef USE_UV
	#ifdef UVS_VERTEX_ONLY
		vec2 vUv;
	#else
		varying vec2 vUv;
	#endif
	uniform mat3 uvTransform;
#endif`,J1=`#ifdef USE_UV
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
#endif`,j1=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	varying vec2 vUv2;
#endif`,Q1=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	attribute vec2 uv2;
	varying vec2 vUv2;
	uniform mat3 uv2Transform;
#endif`,K1=`#if defined( USE_LIGHTMAP ) || defined( USE_AOMAP )
	vUv2 = ( uv2Transform * vec3( uv2, 1 ) ).xy;
#endif`,e0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP )
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,t0=`uniform sampler2D t2D;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	gl_FragColor = mapTexelToLinear( texColor );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,n0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,i0=`#include <envmap_common_pars_fragment>
uniform float opacity;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	vec3 vReflect = vWorldDirection;
	#include <envmap_fragment>
	gl_FragColor = envColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,r0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,s0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <logdepthbuf_fragment>
	float fragCoordZ = 0.5 * vHighPrecisionZW[0] / vHighPrecisionZW[1] + 0.5;
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#endif
}`,a0=`#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,o0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( 1.0 );
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = packDepthToRGBA( dist );
}`,c0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <skinbase_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,l0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	vec4 texColor = texture2D( tEquirect, sampleUV );
	gl_FragColor = mapTexelToLinear( texColor );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
}`,u0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,h0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,d0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <color_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,f0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
	
		vec4 lightMapTexel= texture2D( lightMap, vUv2 );
		reflectedLight.indirectDiffuse += lightMapTexelToLinear( lightMapTexel ).rgb * lightMapIntensity;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,p0=`#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <skinbase_vertex>
	#ifdef USE_ENVMAP
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,m0=`uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <fog_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <emissivemap_fragment>
	#ifdef DOUBLE_SIDED
		reflectedLight.indirectDiffuse += ( gl_FrontFacing ) ? vIndirectFront : vIndirectBack;
	#else
		reflectedLight.indirectDiffuse += vIndirectFront;
	#endif
	#include <lightmap_fragment>
	reflectedLight.indirectDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb );
	#ifdef DOUBLE_SIDED
		reflectedLight.directDiffuse = ( gl_FrontFacing ) ? vLightFront : vLightBack;
	#else
		reflectedLight.directDiffuse = vLightFront;
	#endif
	reflectedLight.directDiffuse *= BRDF_Diffuse_Lambert( diffuseColor.rgb ) * getShadowMask();
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,x0=`#define LAMBERT
varying vec3 vLightFront;
varying vec3 vIndirectFront;
#ifdef DOUBLE_SIDED
	varying vec3 vLightBack;
	varying vec3 vIndirectBack;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <envmap_pars_vertex>
#include <bsdfs>
#include <lights_pars_begin>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <lights_lambert_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,g0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
		matcapColor = matcapTexelToLinear( matcapColor );
	#else
		vec4 matcapColor = vec4( 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,v0=`#define MATCAP
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#ifndef FLAT_SHADED
		vNormal = normalize( transformedNormal );
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,y0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,b0=`#define TOON
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,_0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,w0=`#define PHONG
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,M0=`#define STANDARD
#ifdef PHYSICAL
	#define REFLECTIVITY
	#define CLEARCOAT
	#define TRANSMISSION
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef TRANSMISSION
	uniform float transmission;
#endif
#ifdef REFLECTIVITY
	uniform float reflectivity;
#endif
#ifdef CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheen;
#endif
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <packing>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <uv2_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <transmissionmap_pars_fragment>
#include <bsdfs>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <lights_physical_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec4 diffuseColor = vec4( diffuse, opacity );
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#ifdef TRANSMISSION
		float totalTransmission = transmission;
	#endif
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <transmissionmap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#ifdef TRANSMISSION
		diffuseColor.a *= mix( saturate( 1. - totalTransmission + linearToRelativeLuminance( reflectedLight.directSpecular + reflectedLight.indirectSpecular ) ), 1.0, metalness );
	#endif
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,S0=`#define STANDARD
varying vec3 vViewPosition;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <uv_pars_vertex>
#include <uv2_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <uv2_vertex>
	#include <color_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,E0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <packing>
#include <uv_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( packNormalToRGB( normal ), opacity );
}`,T0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	varying vec3 vViewPosition;
#endif
#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif
#include <common>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( TANGENTSPACE_NORMALMAP )
	vViewPosition = - mvPosition.xyz;
#endif
}`,A0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,L0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <color_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,P0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <packing>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,C0=`#include <common>
#include <fog_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <begin_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,R0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	outgoingLight = diffuseColor.rgb;
	gl_FragColor = vec4( outgoingLight, diffuseColor.a );
	#include <tonemapping_fragment>
	#include <encodings_fragment>
	#include <fog_fragment>
}`,I0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 );
	vec2 scale;
	scale.x = length( vec3( modelMatrix[ 0 ].x, modelMatrix[ 0 ].y, modelMatrix[ 0 ].z ) );
	scale.y = length( vec3( modelMatrix[ 1 ].x, modelMatrix[ 1 ].y, modelMatrix[ 1 ].z ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ae={alphamap_fragment:dp,alphamap_pars_fragment:fp,alphatest_fragment:pp,aomap_fragment:mp,aomap_pars_fragment:xp,begin_vertex:gp,beginnormal_vertex:vp,bsdfs:yp,bumpmap_pars_fragment:bp,clipping_planes_fragment:_p,clipping_planes_pars_fragment:wp,clipping_planes_pars_vertex:Mp,clipping_planes_vertex:Sp,color_fragment:Ep,color_pars_fragment:Tp,color_pars_vertex:Ap,color_vertex:Lp,common:Pp,cube_uv_reflection_fragment:Cp,defaultnormal_vertex:Rp,displacementmap_pars_vertex:Ip,displacementmap_vertex:Dp,emissivemap_fragment:zp,emissivemap_pars_fragment:Fp,encodings_fragment:Bp,encodings_pars_fragment:kp,envmap_fragment:Np,envmap_common_pars_fragment:Up,envmap_pars_fragment:Op,envmap_pars_vertex:Gp,envmap_physical_pars_fragment:Qp,envmap_vertex:Hp,fog_vertex:Vp,fog_pars_vertex:Wp,fog_fragment:qp,fog_pars_fragment:Xp,gradientmap_pars_fragment:Yp,lightmap_fragment:$p,lightmap_pars_fragment:Zp,lights_lambert_vertex:Jp,lights_pars_begin:jp,lights_toon_fragment:Kp,lights_toon_pars_fragment:e1,lights_phong_fragment:t1,lights_phong_pars_fragment:n1,lights_physical_fragment:i1,lights_physical_pars_fragment:r1,lights_fragment_begin:s1,lights_fragment_maps:a1,lights_fragment_end:o1,logdepthbuf_fragment:c1,logdepthbuf_pars_fragment:l1,logdepthbuf_pars_vertex:u1,logdepthbuf_vertex:h1,map_fragment:d1,map_pars_fragment:f1,map_particle_fragment:p1,map_particle_pars_fragment:m1,metalnessmap_fragment:x1,metalnessmap_pars_fragment:g1,morphnormal_vertex:v1,morphtarget_pars_vertex:y1,morphtarget_vertex:b1,normal_fragment_begin:_1,normal_fragment_maps:w1,normalmap_pars_fragment:M1,clearcoat_normal_fragment_begin:S1,clearcoat_normal_fragment_maps:E1,clearcoat_pars_fragment:T1,packing:A1,premultiplied_alpha_fragment:L1,project_vertex:P1,dithering_fragment:C1,dithering_pars_fragment:R1,roughnessmap_fragment:I1,roughnessmap_pars_fragment:D1,shadowmap_pars_fragment:z1,shadowmap_pars_vertex:F1,shadowmap_vertex:B1,shadowmask_pars_fragment:k1,skinbase_vertex:N1,skinning_pars_vertex:U1,skinning_vertex:O1,skinnormal_vertex:G1,specularmap_fragment:H1,specularmap_pars_fragment:V1,tonemapping_fragment:W1,tonemapping_pars_fragment:q1,transmissionmap_fragment:X1,transmissionmap_pars_fragment:Y1,uv_pars_fragment:$1,uv_pars_vertex:Z1,uv_vertex:J1,uv2_pars_fragment:j1,uv2_pars_vertex:Q1,uv2_vertex:K1,worldpos_vertex:e0,background_frag:t0,background_vert:n0,cube_frag:i0,cube_vert:r0,depth_frag:s0,depth_vert:a0,distanceRGBA_frag:o0,distanceRGBA_vert:c0,equirect_frag:l0,equirect_vert:u0,linedashed_frag:h0,linedashed_vert:d0,meshbasic_frag:f0,meshbasic_vert:p0,meshlambert_frag:m0,meshlambert_vert:x0,meshmatcap_frag:g0,meshmatcap_vert:v0,meshtoon_frag:y0,meshtoon_vert:b0,meshphong_frag:_0,meshphong_vert:w0,meshphysical_frag:M0,meshphysical_vert:S0,normal_frag:E0,normal_vert:T0,points_frag:A0,points_vert:L0,shadow_frag:P0,shadow_vert:C0,sprite_frag:R0,sprite_vert:I0},se={common:{diffuse:{value:new he(15658734)},opacity:{value:1},map:{value:null},uvTransform:{value:new Je},uv2Transform:{value:new Je},alphaMap:{value:null}},specularmap:{specularMap:{value:null}},envmap:{envMap:{value:null},flipEnvMap:{value:-1},reflectivity:{value:1},refractionRatio:{value:.98},maxMipLevel:{value:0}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1}},emissivemap:{emissiveMap:{value:null}},bumpmap:{bumpMap:{value:null},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalScale:{value:new K(1,1)}},displacementmap:{displacementMap:{value:null},displacementScale:{value:1},displacementBias:{value:0}},roughnessmap:{roughnessMap:{value:null}},metalnessmap:{metalnessMap:{value:null}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new he(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMap:{value:[]},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotShadowMap:{value:[]},spotShadowMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMap:{value:[]},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new he(15658734)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},uvTransform:{value:new Je}},sprite:{diffuse:{value:new he(15658734)},opacity:{value:1},center:{value:new K(.5,.5)},rotation:{value:0},map:{value:null},alphaMap:{value:null},uvTransform:{value:new Je}}},zt={basic:{uniforms:nt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.fog]),vertexShader:Ae.meshbasic_vert,fragmentShader:Ae.meshbasic_frag},lambert:{uniforms:nt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.fog,se.lights,{emissive:{value:new he(0)}}]),vertexShader:Ae.meshlambert_vert,fragmentShader:Ae.meshlambert_frag},phong:{uniforms:nt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new he(0)},specular:{value:new he(1118481)},shininess:{value:30}}]),vertexShader:Ae.meshphong_vert,fragmentShader:Ae.meshphong_frag},standard:{uniforms:nt([se.common,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.roughnessmap,se.metalnessmap,se.fog,se.lights,{emissive:{value:new he(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ae.meshphysical_vert,fragmentShader:Ae.meshphysical_frag},toon:{uniforms:nt([se.common,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.gradientmap,se.fog,se.lights,{emissive:{value:new he(0)}}]),vertexShader:Ae.meshtoon_vert,fragmentShader:Ae.meshtoon_frag},matcap:{uniforms:nt([se.common,se.bumpmap,se.normalmap,se.displacementmap,se.fog,{matcap:{value:null}}]),vertexShader:Ae.meshmatcap_vert,fragmentShader:Ae.meshmatcap_frag},points:{uniforms:nt([se.points,se.fog]),vertexShader:Ae.points_vert,fragmentShader:Ae.points_frag},dashed:{uniforms:nt([se.common,se.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ae.linedashed_vert,fragmentShader:Ae.linedashed_frag},depth:{uniforms:nt([se.common,se.displacementmap]),vertexShader:Ae.depth_vert,fragmentShader:Ae.depth_frag},normal:{uniforms:nt([se.common,se.bumpmap,se.normalmap,se.displacementmap,{opacity:{value:1}}]),vertexShader:Ae.normal_vert,fragmentShader:Ae.normal_frag},sprite:{uniforms:nt([se.sprite,se.fog]),vertexShader:Ae.sprite_vert,fragmentShader:Ae.sprite_frag},background:{uniforms:{uvTransform:{value:new Je},t2D:{value:null}},vertexShader:Ae.background_vert,fragmentShader:Ae.background_frag},cube:{uniforms:nt([se.envmap,{opacity:{value:1}}]),vertexShader:Ae.cube_vert,fragmentShader:Ae.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ae.equirect_vert,fragmentShader:Ae.equirect_frag},distanceRGBA:{uniforms:nt([se.common,se.displacementmap,{referencePosition:{value:new E},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ae.distanceRGBA_vert,fragmentShader:Ae.distanceRGBA_frag},shadow:{uniforms:nt([se.lights,se.fog,{color:{value:new he(0)},opacity:{value:1}}]),vertexShader:Ae.shadow_vert,fragmentShader:Ae.shadow_frag}};zt.physical={uniforms:nt([zt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatNormalScale:{value:new K(1,1)},clearcoatNormalMap:{value:null},sheen:{value:new he(0)},transmission:{value:0},transmissionMap:{value:null}}]),vertexShader:Ae.meshphysical_vert,fragmentShader:Ae.meshphysical_frag};is=class extends rt{constructor(e=null,t=1,n=1,i=1){super(null),this.image={data:e,width:t,height:n,depth:i},this.magFilter=ct,this.minFilter=ct,this.wrapR=Lt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}};is.prototype.isDataTexture2DArray=!0;rs=class extends rt{constructor(e=null,t=1,n=1,i=1){super(null),this.image={data:e,width:t,height:n,depth:i},this.magFilter=ct,this.minFilter=ct,this.wrapR=Lt,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.needsUpdate=!0}};rs.prototype.isDataTexture3D=!0;hu=new rt,Y0=new is,$0=new rs,du=new ti,dl=[],fl=[],pl=new Float32Array(16),ml=new Float32Array(9),xl=new Float32Array(4);pu.prototype.updateCache=function(r){let e=this.cache;r instanceof Float32Array&&e.length!==r.length&&(this.cache=new Float32Array(r.length)),st(e,r)};mu.prototype.setValue=function(r,e,t){let n=this.seq;for(let i=0,s=n.length;i!==s;++i){let a=n[i];a.setValue(r,e[a.id],t)}};xa=/(\w+)(\])?(\[|\.)?/g;cn.prototype.setValue=function(r,e,t,n){let i=this.map[e];i!==void 0&&i.setValue(r,t,n)};cn.prototype.setOptional=function(r,e,t){let n=e[t];n!==void 0&&this.setValue(r,t,n)};cn.upload=function(r,e,t,n){for(let i=0,s=e.length;i!==s;++i){let a=e[i],o=t[a.id];o.needsUpdate!==!1&&a.setValue(r,o.value,n)}};cn.seqWithValue=function(r,e){let t=[];for(let n=0,i=r.length;n!==i;++n){let s=r[n];s.id in e&&t.push(s)}return t};Fm=0;Hm=/^[ \t]*#include +<([\w\d./]+)>/gm;Wm=/#pragma unroll_loop[\s]+?for \( int i \= (\d+)\; i < (\d+)\; i \+\+ \) \{([\s\S]+?)(?=\})\}/g,qm=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;sx=0;ss=class extends Ke{constructor(e){super(),this.type="MeshDepthMaterial",this.depthPacking=Hf,this.skinning=!1,this.morphTargets=!1,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}};ss.prototype.isMeshDepthMaterial=!0;as=class extends Ke{constructor(e){super(),this.type="MeshDistanceMaterial",this.referencePosition=new E,this.nearDistance=1,this.farDistance=1e3,this.skinning=!1,this.morphTargets=!1,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.fog=!1,this.setValues(e)}copy(e){return super.copy(e),this.referencePosition.copy(e.referencePosition),this.nearDistance=e.nearDistance,this.farDistance=e.farDistance,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};as.prototype.isMeshDistanceMaterial=!0;lx=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
#include <packing>
void main() {
	float mean = 0.0;
	float squared_mean = 0.0;
	float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy ) / resolution ) );
	for ( float i = -1.0; i < 1.0 ; i += SAMPLE_RATE) {
		#ifdef HORIZONTAL_PASS
			vec2 distribution = unpackRGBATo2Half( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( i, 0.0 ) * radius ) / resolution ) );
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = unpackRGBAToDepth( texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, i ) * radius ) / resolution ) );
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean * HALF_SAMPLE_RATE;
	squared_mean = squared_mean * HALF_SAMPLE_RATE;
	float std_dev = sqrt( squared_mean - mean * mean );
	gl_FragColor = pack2HalfToRGBA( vec2( mean, std_dev ) );
}`,ux=`void main() {
	gl_Position = vec4( position, 1.0 );
}`;os=class extends He{constructor(e=[]){super(),this.cameras=e}};os.prototype.isArrayCamera=!0;Yt=class extends Fe{constructor(){super(),this.type="Group"}};Yt.prototype.isGroup=!0;px={type:"move"},ki=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Yt,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Yt,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new E,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new E),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Yt,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new E,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new E),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let i=null,s=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred")if(o!==null&&(i=t.getPose(e.targetRaySpace,n),i!==null&&(o.matrix.fromArray(i.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),i.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(i.linearVelocity)):o.hasLinearVelocity=!1,i.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(i.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(px))),l&&e.hand){a=!0;for(let g of e.hand.values()){let v=t.getJointPose(g,n);if(l.joints[g.jointName]===void 0){let m=new Yt;m.matrixAutoUpdate=!1,m.visible=!1,l.joints[g.jointName]=m,l.add(m)}let x=l.joints[g.jointName];v!==null&&(x.matrix.fromArray(v.transform.matrix),x.matrix.decompose(x.position,x.rotation,x.scale),x.jointRadius=v.radius),x.visible=v!==null}let u=l.joints["index-finger-tip"],h=l.joints["thumb-tip"],d=u.position.distanceTo(h.position),f=.02,p=.005;l.inputState.pinching&&d>f+p?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&d<=f-p&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(s=t.getPose(e.gripSpace,n),s!==null&&(c.matrix.fromArray(s.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),s.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(s.linearVelocity)):c.hasLinearVelocity=!1,s.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(s.angularVelocity)):c.hasAngularVelocity=!1));return o!==null&&(o.visible=i!==null),c!==null&&(c.visible=s!==null),l!==null&&(l.visible=a!==null),this}},Da=class extends Jt{constructor(e,t){super();let n=this,i=e.state,s=null,a=1,o=null,c="local-floor",l=null,u=[],h=new Map,d=new He;d.layers.enable(1),d.viewport=new Re;let f=new He;f.layers.enable(2),f.viewport=new Re;let p=[d,f],g=new os;g.layers.enable(1),g.layers.enable(2);let v=null,x=null;this.enabled=!1,this.isPresenting=!1,this.getController=function(B){let L=u[B];return L===void 0&&(L=new ki,u[B]=L),L.getTargetRaySpace()},this.getControllerGrip=function(B){let L=u[B];return L===void 0&&(L=new ki,u[B]=L),L.getGripSpace()},this.getHand=function(B){let L=u[B];return L===void 0&&(L=new ki,u[B]=L),L.getHandSpace()};function m(B){let L=h.get(B.inputSource);L&&L.dispatchEvent({type:B.type,data:B.inputSource})}function b(){h.forEach(function(B,L){B.disconnect(L)}),h.clear(),v=null,x=null,i.bindXRFramebuffer(null),e.setRenderTarget(e.getRenderTarget()),H.stop(),n.isPresenting=!1,n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(B){a=B,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(B){c=B,n.isPresenting===!0&&console.warn("THREE.WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return o},this.getSession=function(){return s},this.setSession=async function(B){if(s=B,s!==null){s.addEventListener("select",m),s.addEventListener("selectstart",m),s.addEventListener("selectend",m),s.addEventListener("squeeze",m),s.addEventListener("squeezestart",m),s.addEventListener("squeezeend",m),s.addEventListener("end",b),s.addEventListener("inputsourceschange",_);let L=t.getContextAttributes();L.xrCompatible!==!0&&await t.makeXRCompatible();let D={antialias:L.antialias,alpha:L.alpha,depth:L.depth,stencil:L.stencil,framebufferScaleFactor:a},z=new XRWebGLLayer(s,t,D);s.updateRenderState({baseLayer:z}),o=await s.requestReferenceSpace(c),H.setContext(s),H.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}};function _(B){let L=s.inputSources;for(let D=0;D<u.length;D++)h.set(L[D],u[D]);for(let D=0;D<B.removed.length;D++){let z=B.removed[D],T=h.get(z);T&&(T.dispatchEvent({type:"disconnected",data:z}),h.delete(z))}for(let D=0;D<B.added.length;D++){let z=B.added[D],T=h.get(z);T&&T.dispatchEvent({type:"connected",data:z})}}let w=new E,y=new E;function P(B,L,D){w.setFromMatrixPosition(L.matrixWorld),y.setFromMatrixPosition(D.matrixWorld);let z=w.distanceTo(y),T=L.projectionMatrix.elements,I=D.projectionMatrix.elements,Z=T[14]/(T[10]-1),$=T[14]/(T[10]+1),U=(T[9]+1)/T[5],W=(T[9]-1)/T[5],G=(T[8]-1)/T[0],q=(I[8]+1)/I[0],O=Z*G,de=Z*q,fe=z/(-G+q),ee=fe*-G;L.matrixWorld.decompose(B.position,B.quaternion,B.scale),B.translateX(ee),B.translateZ(fe),B.matrixWorld.compose(B.position,B.quaternion,B.scale),B.matrixWorldInverse.copy(B.matrixWorld).invert();let le=Z+fe,ge=$+fe,Me=O-ee,ve=de+(z-ee),Q=U*$/ge*le,te=W*$/ge*le;B.projectionMatrix.makePerspective(Me,ve,Q,te,le,ge)}function C(B,L){L===null?B.matrixWorld.copy(B.matrix):B.matrixWorld.multiplyMatrices(L.matrixWorld,B.matrix),B.matrixWorldInverse.copy(B.matrixWorld).invert()}this.getCamera=function(B){g.near=f.near=d.near=B.near,g.far=f.far=d.far=B.far,(v!==g.near||x!==g.far)&&(s.updateRenderState({depthNear:g.near,depthFar:g.far}),v=g.near,x=g.far);let L=B.parent,D=g.cameras;C(g,L);for(let T=0;T<D.length;T++)C(D[T],L);B.matrixWorld.copy(g.matrixWorld),B.matrix.copy(g.matrix),B.matrix.decompose(B.position,B.quaternion,B.scale);let z=B.children;for(let T=0,I=z.length;T<I;T++)z[T].updateMatrixWorld(!0);return D.length===2?P(g,d,f):g.projectionMatrix.copy(d.projectionMatrix),g};let F=null;function k(B,L){if(l=L.getViewerPose(o),l!==null){let z=l.views,T=s.renderState.baseLayer;i.bindXRFramebuffer(T.framebuffer);let I=!1;z.length!==g.cameras.length&&(g.cameras.length=0,I=!0);for(let Z=0;Z<z.length;Z++){let $=z[Z],U=T.getViewport($),W=p[Z];W.matrix.fromArray($.transform.matrix),W.projectionMatrix.fromArray($.projectionMatrix),W.viewport.set(U.x,U.y,U.width,U.height),Z===0&&g.matrix.copy(W.matrix),I===!0&&g.cameras.push(W)}}let D=s.inputSources;for(let z=0;z<u.length;z++){let T=u[z],I=D[z];T.update(I,L,o)}F&&F(B,L)}let H=new uu;H.setAnimationLoop(k),this.setAnimationLoop=function(B){F=B},this.dispose=function(){}}};za=class extends Be{};za.prototype.isWebGL1Renderer=!0;Fa=class r{constructor(e,t=25e-5){this.name="",this.color=new he(e),this.density=t}clone(){return new r(this.color,this.density)}toJSON(){return{type:"FogExp2",color:this.color.getHex(),density:this.density}}};Fa.prototype.isFogExp2=!0;Ba=class r{constructor(e,t=1,n=1e3){this.name="",this.color=new he(e),this.near=t,this.far=n}clone(){return new r(this.color,this.near,this.far)}toJSON(){return{type:"Fog",color:this.color.getHex(),near:this.near,far:this.far}}};Ba.prototype.isFog=!0;Sn=class extends Fe{constructor(){super(),this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.overrideMaterial=null,this.autoUpdate=!0,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.autoUpdate=e.autoUpdate,this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.background!==null&&(t.object.background=this.background.toJSON(e)),this.environment!==null&&(t.object.environment=this.environment.toJSON(e)),this.fog!==null&&(t.object.fog=this.fog.toJSON()),t}};Sn.prototype.isScene=!0;En=class r{constructor(e,t){this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Hi,this.updateRange={offset:0,count:-1},this.version=0,this.uuid=Ct(),this.onUploadCallback=function(){}}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let i=0,s=this.stride;i<s;i++)this.array[e+i]=t.array[n+i];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ct()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new r(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Ct()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.prototype.slice.call(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}};En.prototype.isInterleavedBuffer=!0;qe=new E,Yi=class r{constructor(e,t,n,i){this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=i===!0}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)qe.x=this.getX(t),qe.y=this.getY(t),qe.z=this.getZ(t),qe.applyMatrix4(e),this.setXYZ(t,qe.x,qe.y,qe.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)qe.x=this.getX(t),qe.y=this.getY(t),qe.z=this.getZ(t),qe.applyNormalMatrix(e),this.setXYZ(t,qe.x,qe.y,qe.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)qe.x=this.getX(t),qe.y=this.getY(t),qe.z=this.getZ(t),qe.transformDirection(e),this.setXYZ(t,qe.x,qe.y,qe.z);return this}setX(e,t){return this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){return this.data.array[e*this.data.stride+this.offset]}getY(e){return this.data.array[e*this.data.stride+this.offset+1]}getZ(e){return this.data.array[e*this.data.stride+this.offset+2]}getW(e){return this.data.array[e*this.data.stride+this.offset+3]}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,i){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this}setXYZW(e,t,n,i,s){return e=e*this.data.stride+this.offset,this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=i,this.data.array[e+3]=s,this}clone(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.clone(): Cloning an interlaved buffer attribute will deinterleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return new Ue(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new r(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){console.log("THREE.InterleavedBufferAttribute.toJSON(): Serializing an interlaved buffer attribute will deinterleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let i=n*this.data.stride+this.offset;for(let s=0;s<this.itemSize;s++)t.push(this.data.array[i+s])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}};Yi.prototype.isInterleavedBufferAttribute=!0;cs=class extends Ke{constructor(e){super(),this.type="SpriteMaterial",this.color=new he(16777215),this.map=null,this.alphaMap=null,this.rotation=0,this.sizeAttenuation=!0,this.transparent=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.rotation=e.rotation,this.sizeAttenuation=e.sizeAttenuation,this}};cs.prototype.isSpriteMaterial=!0;Ti=new E,Wn=new E,qn=new E,Xn=new K,Ai=new K,yu=new me,Ir=new E,Li=new E,Dr=new E,Tl=new K,ga=new K,Al=new K,ka=class extends Fe{constructor(e){if(super(),this.type="Sprite",Vn===void 0){Vn=new Ie;let t=new Float32Array([-.5,-.5,0,0,0,.5,-.5,0,1,0,.5,.5,0,1,1,-.5,.5,0,0,1]),n=new En(t,5);Vn.setIndex([0,1,2,0,2,3]),Vn.setAttribute("position",new Yi(n,3,0,!1)),Vn.setAttribute("uv",new Yi(n,2,3,!1))}this.geometry=Vn,this.material=e!==void 0?e:new cs,this.center=new K(.5,.5)}raycast(e,t){e.camera===null&&console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.'),Wn.setFromMatrixScale(this.matrixWorld),yu.copy(e.camera.matrixWorld),this.modelViewMatrix.multiplyMatrices(e.camera.matrixWorldInverse,this.matrixWorld),qn.setFromMatrixPosition(this.modelViewMatrix),e.camera.isPerspectiveCamera&&this.material.sizeAttenuation===!1&&Wn.multiplyScalar(-qn.z);let n=this.material.rotation,i,s;n!==0&&(s=Math.cos(n),i=Math.sin(n));let a=this.center;zr(Ir.set(-.5,-.5,0),qn,a,Wn,i,s),zr(Li.set(.5,-.5,0),qn,a,Wn,i,s),zr(Dr.set(.5,.5,0),qn,a,Wn,i,s),Tl.set(0,0),ga.set(1,0),Al.set(1,1);let o=e.ray.intersectTriangle(Ir,Li,Dr,!1,Ti);if(o===null&&(zr(Li.set(-.5,.5,0),qn,a,Wn,i,s),ga.set(0,1),o=e.ray.intersectTriangle(Ir,Dr,Li,!1,Ti),o===null))return;let c=e.ray.origin.distanceTo(Ti);c<e.near||c>e.far||t.push({distance:c,point:Ti.clone(),uv:it.getUV(Ti,Ir,Li,Dr,Tl,ga,Al,new K),face:null,object:this})}copy(e){return super.copy(e),e.center!==void 0&&this.center.copy(e.center),this.material=e.material,this}};ka.prototype.isSprite=!0;Ll=new E,Pl=new Re,Cl=new Re,gx=new E,Rl=new me,ls=class extends lt{constructor(e,t){super(e,t),this.type="SkinnedMesh",this.bindMode="attached",this.bindMatrix=new me,this.bindMatrixInverse=new me}copy(e){return super.copy(e),this.bindMode=e.bindMode,this.bindMatrix.copy(e.bindMatrix),this.bindMatrixInverse.copy(e.bindMatrixInverse),this.skeleton=e.skeleton,this}bind(e,t){this.skeleton=e,t===void 0&&(this.updateMatrixWorld(!0),this.skeleton.calculateInverses(),t=this.matrixWorld),this.bindMatrix.copy(t),this.bindMatrixInverse.copy(t).invert()}pose(){this.skeleton.pose()}normalizeSkinWeights(){let e=new Re,t=this.geometry.attributes.skinWeight;for(let n=0,i=t.count;n<i;n++){e.x=t.getX(n),e.y=t.getY(n),e.z=t.getZ(n),e.w=t.getW(n);let s=1/e.manhattanLength();s!==1/0?e.multiplyScalar(s):e.set(1,0,0,0),t.setXYZW(n,e.x,e.y,e.z,e.w)}}updateMatrixWorld(e){super.updateMatrixWorld(e),this.bindMode==="attached"?this.bindMatrixInverse.copy(this.matrixWorld).invert():this.bindMode==="detached"?this.bindMatrixInverse.copy(this.bindMatrix).invert():console.warn("THREE.SkinnedMesh: Unrecognized bindMode: "+this.bindMode)}boneTransform(e,t){let n=this.skeleton,i=this.geometry;Pl.fromBufferAttribute(i.attributes.skinIndex,e),Cl.fromBufferAttribute(i.attributes.skinWeight,e),Ll.fromBufferAttribute(i.attributes.position,e).applyMatrix4(this.bindMatrix),t.set(0,0,0);for(let s=0;s<4;s++){let a=Cl.getComponent(s);if(a!==0){let o=Pl.getComponent(s);Rl.multiplyMatrices(n.bones[o].matrixWorld,n.boneInverses[o]),t.addScaledVector(gx.copy(Ll).applyMatrix4(Rl),a)}}return t.applyMatrix4(this.bindMatrixInverse)}};ls.prototype.isSkinnedMesh=!0;Na=class extends Fe{constructor(){super(),this.type="Bone"}};Na.prototype.isBone=!0;Il=new me,Dl=new me,Fr=[],Pi=new lt,Ua=class extends lt{constructor(e,t,n){super(e,t),this.instanceMatrix=new Ue(new Float32Array(n*16),16),this.instanceColor=null,this.count=n,this.frustumCulled=!1}copy(e){return super.copy(e),this.instanceMatrix.copy(e.instanceMatrix),e.instanceColor!==null&&(this.instanceColor=e.instanceColor.clone()),this.count=e.count,this}getColorAt(e,t){t.fromArray(this.instanceColor.array,e*3)}getMatrixAt(e,t){t.fromArray(this.instanceMatrix.array,e*16)}raycast(e,t){let n=this.matrixWorld,i=this.count;if(Pi.geometry=this.geometry,Pi.material=this.material,Pi.material!==void 0)for(let s=0;s<i;s++){this.getMatrixAt(s,Il),Dl.multiplyMatrices(n,Il),Pi.matrixWorld=Dl,Pi.raycast(e,Fr);for(let a=0,o=Fr.length;a<o;a++){let c=Fr[a];c.instanceId=s,c.object=this,t.push(c)}Fr.length=0}}setColorAt(e,t){this.instanceColor===null&&(this.instanceColor=new Ue(new Float32Array(this.count*3),3)),t.toArray(this.instanceColor.array,e*3)}setMatrixAt(e,t){t.toArray(this.instanceMatrix.array,e*16)}updateMorphTargets(){}dispose(){this.dispatchEvent({type:"dispose"})}};Ua.prototype.isInstancedMesh=!0;Tn=class extends Ke{constructor(e){super(),this.type="LineBasicMaterial",this.color=new he(16777215),this.linewidth=1,this.linecap="round",this.linejoin="round",this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.morphTargets=e.morphTargets,this}};Tn.prototype.isLineBasicMaterial=!0;zl=new E,Fl=new E,Bl=new me,va=new dn,Br=new hn,$i=class extends Fe{constructor(e=new Ie,t=new Tn){super(),this.type="Line",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),this.material=e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.isBufferGeometry)if(e.index===null){let t=e.attributes.position,n=[0];for(let i=1,s=t.count;i<s;i++)zl.fromBufferAttribute(t,i-1),Fl.fromBufferAttribute(t,i),n[i]=n[i-1],n[i]+=zl.distanceTo(Fl);e.setAttribute("lineDistance",new $e(n,1))}else console.warn("THREE.Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else e.isGeometry&&console.error("THREE.Line.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}raycast(e,t){let n=this.geometry,i=this.matrixWorld,s=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Br.copy(n.boundingSphere),Br.applyMatrix4(i),Br.radius+=s,e.ray.intersectsSphere(Br)===!1)return;Bl.copy(i).invert(),va.copy(e.ray).applyMatrix4(Bl);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=new E,u=new E,h=new E,d=new E,f=this.isLineSegments?2:1;if(n.isBufferGeometry){let p=n.index,v=n.attributes.position;if(p!==null){let x=Math.max(0,a.start),m=Math.min(p.count,a.start+a.count);for(let b=x,_=m-1;b<_;b+=f){let w=p.getX(b),y=p.getX(b+1);if(l.fromBufferAttribute(v,w),u.fromBufferAttribute(v,y),va.distanceSqToSegment(l,u,d,h)>c)continue;d.applyMatrix4(this.matrixWorld);let C=e.ray.origin.distanceTo(d);C<e.near||C>e.far||t.push({distance:C,point:h.clone().applyMatrix4(this.matrixWorld),index:b,face:null,faceIndex:null,object:this})}}else{let x=Math.max(0,a.start),m=Math.min(v.count,a.start+a.count);for(let b=x,_=m-1;b<_;b+=f){if(l.fromBufferAttribute(v,b),u.fromBufferAttribute(v,b+1),va.distanceSqToSegment(l,u,d,h)>c)continue;d.applyMatrix4(this.matrixWorld);let y=e.ray.origin.distanceTo(d);y<e.near||y>e.far||t.push({distance:y,point:h.clone().applyMatrix4(this.matrixWorld),index:b,face:null,faceIndex:null,object:this})}}}else n.isGeometry&&console.error("THREE.Line.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){let e=this.geometry;if(e.isBufferGeometry){let t=e.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{let t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Line.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}};$i.prototype.isLine=!0;kl=new E,Nl=new E,Zi=class extends $i{constructor(e,t){super(e,t),this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.isBufferGeometry)if(e.index===null){let t=e.attributes.position,n=[];for(let i=0,s=t.count;i<s;i+=2)kl.fromBufferAttribute(t,i),Nl.fromBufferAttribute(t,i+1),n[i]=i===0?0:n[i-1],n[i+1]=n[i]+kl.distanceTo(Nl);e.setAttribute("lineDistance",new $e(n,1))}else console.warn("THREE.LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");else e.isGeometry&&console.error("THREE.LineSegments.computeLineDistances() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.");return this}};Zi.prototype.isLineSegments=!0;Oa=class extends $i{constructor(e,t){super(e,t),this.type="LineLoop"}};Oa.prototype.isLineLoop=!0;ni=class extends Ke{constructor(e){super(),this.type="PointsMaterial",this.color=new he(16777215),this.map=null,this.alphaMap=null,this.size=1,this.sizeAttenuation=!0,this.morphTargets=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.alphaMap=e.alphaMap,this.size=e.size,this.sizeAttenuation=e.sizeAttenuation,this.morphTargets=e.morphTargets,this}};ni.prototype.isPointsMaterial=!0;Ul=new me,Ga=new dn,kr=new hn,Nr=new E,Ji=class extends Fe{constructor(e=new Ie,t=new ni){super(),this.type="Points",this.geometry=e,this.material=t,this.updateMorphTargets()}copy(e){return super.copy(e),this.material=e.material,this.geometry=e.geometry,this}raycast(e,t){let n=this.geometry,i=this.matrixWorld,s=e.params.Points.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),kr.copy(n.boundingSphere),kr.applyMatrix4(i),kr.radius+=s,e.ray.intersectsSphere(kr)===!1)return;Ul.copy(i).invert(),Ga.copy(e.ray).applyMatrix4(Ul);let o=s/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o;if(n.isBufferGeometry){let l=n.index,h=n.attributes.position;if(l!==null){let d=Math.max(0,a.start),f=Math.min(l.count,a.start+a.count);for(let p=d,g=f;p<g;p++){let v=l.getX(p);Nr.fromBufferAttribute(h,v),Ol(Nr,v,c,i,e,t,this)}}else{let d=Math.max(0,a.start),f=Math.min(h.count,a.start+a.count);for(let p=d,g=f;p<g;p++)Nr.fromBufferAttribute(h,p),Ol(Nr,p,c,i,e,t,this)}}else console.error("THREE.Points.raycast() no longer supports THREE.Geometry. Use THREE.BufferGeometry instead.")}updateMorphTargets(){let e=this.geometry;if(e.isBufferGeometry){let t=e.morphAttributes,n=Object.keys(t);if(n.length>0){let i=t[n[0]];if(i!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let s=0,a=i.length;s<a;s++){let o=i[s].name||String(s);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=s}}}}else{let t=e.morphTargets;t!==void 0&&t.length>0&&console.error("THREE.Points.updateMorphTargets() does not support THREE.Geometry. Use THREE.BufferGeometry instead.")}}};Ji.prototype.isPoints=!0;Ha=class extends rt{constructor(e,t,n,i,s,a,o,c,l){super(e,t,n,i,s,a,o,c,l),this.format=o!==void 0?o:Mn,this.minFilter=a!==void 0?a:vt,this.magFilter=s!==void 0?s:vt,this.generateMipmaps=!1;let u=this;function h(){u.needsUpdate=!0,e.requestVideoFrameCallback(h)}"requestVideoFrameCallback"in e&&e.requestVideoFrameCallback(h)}clone(){return new this.constructor(this.image).copy(this)}update(){let e=this.image;"requestVideoFrameCallback"in e===!1&&e.readyState>=e.HAVE_CURRENT_DATA&&(this.needsUpdate=!0)}};Ha.prototype.isVideoTexture=!0;Va=class extends rt{constructor(e,t,n,i,s,a,o,c,l,u,h,d){super(null,a,o,c,l,u,i,s,h,d),this.image={width:t,height:n},this.mipmaps=e,this.flipY=!1,this.generateMipmaps=!1}};Va.prototype.isCompressedTexture=!0;Wa=class extends rt{constructor(e,t,n,i,s,a,o,c,l){super(e,t,n,i,s,a,o,c,l),this.needsUpdate=!0}};Wa.prototype.isCanvasTexture=!0;qa=class extends rt{constructor(e,t,n,i,s,a,o,c,l,u){if(u=u!==void 0?u:Qn,u!==Qn&&u!==Gi)throw new Error("DepthTexture format must be either THREE.DepthFormat or THREE.DepthStencilFormat");n===void 0&&u===Qn&&(n=Yr),n===void 0&&u===Gi&&(n=Bi),super(null,i,s,a,o,c,u,n,l),this.image={width:e,height:t},this.magFilter=o!==void 0?o:ct,this.minFilter=c!==void 0?c:ct,this.flipY=!1,this.generateMipmaps=!1}};qa.prototype.isDepthTexture=!0;pv=new E,mv=new E,xv=new E,gv=new it,vx={triangulate:function(r,e,t){t=t||2;let n=e&&e.length,i=n?e[0]*t:r.length,s=bu(r,0,i,t,!0),a=[];if(!s||s.next===s.prev)return a;let o,c,l,u,h,d,f;if(n&&(s=Mx(r,e,s,t)),r.length>80*t){o=l=r[0],c=u=r[1];for(let p=t;p<i;p+=t)h=r[p],d=r[p+1],h<o&&(o=h),d<c&&(c=d),h>l&&(l=h),d>u&&(u=d);f=Math.max(l-o,u-c),f=f!==0?1/f:0}return ji(s,a,t,o,c,f),a}};Zt=class r{static area(e){let t=e.length,n=0;for(let i=t-1,s=0;s<t;i=s++)n+=e[i].x*e[s].y-e[s].x*e[i].y;return n*.5}static isClockWise(e){return r.area(e)<0}static triangulateShape(e,t){let n=[],i=[],s=[];Hl(e),Vl(n,e);let a=e.length;t.forEach(Hl);for(let c=0;c<t.length;c++)i.push(a),a+=t[c].length,Vl(n,t[c]);let o=vx.triangulate(n,i);for(let c=0;c<o.length;c+=3)s.push(o.slice(c,c+3));return s}};ii=class extends Ie{constructor(e,t){super(),this.type="ExtrudeGeometry",this.parameters={shapes:e,options:t},e=Array.isArray(e)?e:[e];let n=this,i=[],s=[];for(let o=0,c=e.length;o<c;o++){let l=e[o];a(l)}this.setAttribute("position",new $e(i,3)),this.setAttribute("uv",new $e(s,2)),this.computeVertexNormals();function a(o){let c=[],l=t.curveSegments!==void 0?t.curveSegments:12,u=t.steps!==void 0?t.steps:1,h=t.depth!==void 0?t.depth:100,d=t.bevelEnabled!==void 0?t.bevelEnabled:!0,f=t.bevelThickness!==void 0?t.bevelThickness:6,p=t.bevelSize!==void 0?t.bevelSize:f-2,g=t.bevelOffset!==void 0?t.bevelOffset:0,v=t.bevelSegments!==void 0?t.bevelSegments:3,x=t.extrudePath,m=t.UVGenerator!==void 0?t.UVGenerator:Fx;t.amount!==void 0&&(console.warn("THREE.ExtrudeBufferGeometry: amount has been renamed to depth."),h=t.amount);let b,_=!1,w,y,P,C;x&&(b=x.getSpacedPoints(u),_=!0,d=!1,w=x.computeFrenetFrames(u,!1),y=new E,P=new E,C=new E),d||(v=0,f=0,p=0,g=0);let F=o.extractPoints(l),k=F.shape,H=F.holes;if(!Zt.isClockWise(k)){k=k.reverse();for(let Q=0,te=H.length;Q<te;Q++){let ne=H[Q];Zt.isClockWise(ne)&&(H[Q]=ne.reverse())}}let L=Zt.triangulateShape(k,H),D=k;for(let Q=0,te=H.length;Q<te;Q++){let ne=H[Q];k=k.concat(ne)}function z(Q,te,ne){return te||console.error("THREE.ExtrudeGeometry: vec does not exist"),te.clone().multiplyScalar(ne).add(Q)}let T=k.length,I=L.length;function Z(Q,te,ne){let ue,ae,A,M=Q.x-te.x,X=Q.y-te.y,J=ne.x-Q.x,ce=ne.y-Q.y,pe=M*M+X*X,Pe=M*ce-X*J;if(Math.abs(Pe)>Number.EPSILON){let be=Math.sqrt(pe),R=Math.sqrt(J*J+ce*ce),ie=te.x-X/be,re=te.y+M/be,xe=ne.x-ce/R,j=ne.y+J/R,ye=((xe-ie)*ce-(j-re)*J)/(M*ce-X*J);ue=ie+M*ye-Q.x,ae=re+X*ye-Q.y;let De=ue*ue+ae*ae;if(De<=2)return new K(ue,ae);A=Math.sqrt(De/2)}else{let be=!1;M>Number.EPSILON?J>Number.EPSILON&&(be=!0):M<-Number.EPSILON?J<-Number.EPSILON&&(be=!0):Math.sign(X)===Math.sign(ce)&&(be=!0),be?(ue=-X,ae=M,A=Math.sqrt(pe)):(ue=M,ae=X,A=Math.sqrt(pe/2))}return new K(ue/A,ae/A)}let $=[];for(let Q=0,te=D.length,ne=te-1,ue=Q+1;Q<te;Q++,ne++,ue++)ne===te&&(ne=0),ue===te&&(ue=0),$[Q]=Z(D[Q],D[ne],D[ue]);let U=[],W,G=$.concat();for(let Q=0,te=H.length;Q<te;Q++){let ne=H[Q];W=[];for(let ue=0,ae=ne.length,A=ae-1,M=ue+1;ue<ae;ue++,A++,M++)A===ae&&(A=0),M===ae&&(M=0),W[ue]=Z(ne[ue],ne[A],ne[M]);U.push(W),G=G.concat(W)}for(let Q=0;Q<v;Q++){let te=Q/v,ne=f*Math.cos(te*Math.PI/2),ue=p*Math.sin(te*Math.PI/2)+g;for(let ae=0,A=D.length;ae<A;ae++){let M=z(D[ae],$[ae],ue);ee(M.x,M.y,-ne)}for(let ae=0,A=H.length;ae<A;ae++){let M=H[ae];W=U[ae];for(let X=0,J=M.length;X<J;X++){let ce=z(M[X],W[X],ue);ee(ce.x,ce.y,-ne)}}}let q=p+g;for(let Q=0;Q<T;Q++){let te=d?z(k[Q],G[Q],q):k[Q];_?(P.copy(w.normals[0]).multiplyScalar(te.x),y.copy(w.binormals[0]).multiplyScalar(te.y),C.copy(b[0]).add(P).add(y),ee(C.x,C.y,C.z)):ee(te.x,te.y,0)}for(let Q=1;Q<=u;Q++)for(let te=0;te<T;te++){let ne=d?z(k[te],G[te],q):k[te];_?(P.copy(w.normals[Q]).multiplyScalar(ne.x),y.copy(w.binormals[Q]).multiplyScalar(ne.y),C.copy(b[Q]).add(P).add(y),ee(C.x,C.y,C.z)):ee(ne.x,ne.y,h/u*Q)}for(let Q=v-1;Q>=0;Q--){let te=Q/v,ne=f*Math.cos(te*Math.PI/2),ue=p*Math.sin(te*Math.PI/2)+g;for(let ae=0,A=D.length;ae<A;ae++){let M=z(D[ae],$[ae],ue);ee(M.x,M.y,h+ne)}for(let ae=0,A=H.length;ae<A;ae++){let M=H[ae];W=U[ae];for(let X=0,J=M.length;X<J;X++){let ce=z(M[X],W[X],ue);_?ee(ce.x,ce.y+b[u-1].y,b[u-1].x+ne):ee(ce.x,ce.y,h+ne)}}}O(),de();function O(){let Q=i.length/3;if(d){let te=0,ne=T*te;for(let ue=0;ue<I;ue++){let ae=L[ue];le(ae[2]+ne,ae[1]+ne,ae[0]+ne)}te=u+v*2,ne=T*te;for(let ue=0;ue<I;ue++){let ae=L[ue];le(ae[0]+ne,ae[1]+ne,ae[2]+ne)}}else{for(let te=0;te<I;te++){let ne=L[te];le(ne[2],ne[1],ne[0])}for(let te=0;te<I;te++){let ne=L[te];le(ne[0]+T*u,ne[1]+T*u,ne[2]+T*u)}}n.addGroup(Q,i.length/3-Q,0)}function de(){let Q=i.length/3,te=0;fe(D,te),te+=D.length;for(let ne=0,ue=H.length;ne<ue;ne++){let ae=H[ne];fe(ae,te),te+=ae.length}n.addGroup(Q,i.length/3-Q,1)}function fe(Q,te){let ne=Q.length;for(;--ne>=0;){let ue=ne,ae=ne-1;ae<0&&(ae=Q.length-1);for(let A=0,M=u+v*2;A<M;A++){let X=T*A,J=T*(A+1),ce=te+ue+X,pe=te+ae+X,Pe=te+ae+J,be=te+ue+J;ge(ce,pe,Pe,be)}}}function ee(Q,te,ne){c.push(Q),c.push(te),c.push(ne)}function le(Q,te,ne){Me(Q),Me(te),Me(ne);let ue=i.length/3,ae=m.generateTopUV(n,i,ue-3,ue-2,ue-1);ve(ae[0]),ve(ae[1]),ve(ae[2])}function ge(Q,te,ne,ue){Me(Q),Me(te),Me(ue),Me(te),Me(ne),Me(ue);let ae=i.length/3,A=m.generateSideWallUV(n,i,ae-6,ae-3,ae-2,ae-1);ve(A[0]),ve(A[1]),ve(A[3]),ve(A[1]),ve(A[2]),ve(A[3])}function Me(Q){i.push(c[Q*3+0]),i.push(c[Q*3+1]),i.push(c[Q*3+2])}function ve(Q){s.push(Q.x),s.push(Q.y)}}}toJSON(){let e=Ie.prototype.toJSON.call(this),t=this.parameters.shapes,n=this.parameters.options;return Bx(t,n,e)}},Fx={generateTopUV:function(r,e,t,n,i){let s=e[t*3],a=e[t*3+1],o=e[n*3],c=e[n*3+1],l=e[i*3],u=e[i*3+1];return[new K(s,a),new K(o,c),new K(l,u)]},generateSideWallUV:function(r,e,t,n,i,s){let a=e[t*3],o=e[t*3+1],c=e[t*3+2],l=e[n*3],u=e[n*3+1],h=e[n*3+2],d=e[i*3],f=e[i*3+1],p=e[i*3+2],g=e[s*3],v=e[s*3+1],x=e[s*3+2];return Math.abs(o-u)<.01?[new K(a,1-c),new K(l,1-h),new K(d,1-p),new K(g,1-x)]:[new K(o,1-c),new K(u,1-h),new K(f,1-p),new K(v,1-x)]}};$a=class extends Ie{constructor(e,t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};let n=[],i=[],s=[],a=[],o=0,c=0;if(Array.isArray(e)===!1)l(e);else for(let u=0;u<e.length;u++)l(e[u]),this.addGroup(o,c,u),o+=c,c=0;this.setIndex(n),this.setAttribute("position",new $e(i,3)),this.setAttribute("normal",new $e(s,3)),this.setAttribute("uv",new $e(a,2));function l(u){let h=i.length/3,d=u.extractPoints(t),f=d.shape,p=d.holes;Zt.isClockWise(f)===!1&&(f=f.reverse());for(let v=0,x=p.length;v<x;v++){let m=p[v];Zt.isClockWise(m)===!0&&(p[v]=m.reverse())}let g=Zt.triangulateShape(f,p);for(let v=0,x=p.length;v<x;v++){let m=p[v];f=f.concat(m)}for(let v=0,x=f.length;v<x;v++){let m=f[v];i.push(m.x,m.y,0),s.push(0,0,1),a.push(m.x,m.y)}for(let v=0,x=g.length;v<x;v++){let m=g[v],b=m[0]+h,_=m[1]+h,w=m[2]+h;n.push(b,_,w),c+=3}}}toJSON(){let e=Ie.prototype.toJSON.call(this),t=this.parameters.shapes;return kx(t,e)}};Za=class extends Ke{constructor(e){super(),this.type="ShadowMaterial",this.color=new he(0),this.transparent=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this}};Za.prototype.isShadowMaterial=!0;Ja=class extends jt{constructor(e){super(e),this.type="RawShaderMaterial"}};Ja.prototype.isRawShaderMaterial=!0;ri=class extends Ke{constructor(e){super(),this.defines={STANDARD:""},this.type="MeshStandardMaterial",this.color=new he(16777215),this.roughness=1,this.metalness=0,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=fi,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.roughnessMap=null,this.metalnessMap=null,this.alphaMap=null,this.envMap=null,this.envMapIntensity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.vertexTangents=!1,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:""},this.color.copy(e.color),this.roughness=e.roughness,this.metalness=e.metalness,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.roughnessMap=e.roughnessMap,this.metalnessMap=e.metalnessMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapIntensity=e.envMapIntensity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this.vertexTangents=e.vertexTangents,this}};ri.prototype.isMeshStandardMaterial=!0;ja=class extends ri{constructor(e){super(),this.defines={STANDARD:"",PHYSICAL:""},this.type="MeshPhysicalMaterial",this.clearcoat=0,this.clearcoatMap=null,this.clearcoatRoughness=0,this.clearcoatRoughnessMap=null,this.clearcoatNormalScale=new K(1,1),this.clearcoatNormalMap=null,this.reflectivity=.5,Object.defineProperty(this,"ior",{get:function(){return(1+.4*this.reflectivity)/(1-.4*this.reflectivity)},set:function(t){this.reflectivity=dt(2.5*(t-1)/(t+1),0,1)}}),this.sheen=null,this.transmission=0,this.transmissionMap=null,this.setValues(e)}copy(e){return super.copy(e),this.defines={STANDARD:"",PHYSICAL:""},this.clearcoat=e.clearcoat,this.clearcoatMap=e.clearcoatMap,this.clearcoatRoughness=e.clearcoatRoughness,this.clearcoatRoughnessMap=e.clearcoatRoughnessMap,this.clearcoatNormalMap=e.clearcoatNormalMap,this.clearcoatNormalScale.copy(e.clearcoatNormalScale),this.reflectivity=e.reflectivity,e.sheen?this.sheen=(this.sheen||new he).copy(e.sheen):this.sheen=null,this.transmission=e.transmission,this.transmissionMap=e.transmissionMap,this}};ja.prototype.isMeshPhysicalMaterial=!0;Qa=class extends Ke{constructor(e){super(),this.type="MeshPhongMaterial",this.color=new he(16777215),this.specular=new he(1118481),this.shininess=30,this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=fi,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Ss,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.specular.copy(e.specular),this.shininess=e.shininess,this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}};Qa.prototype.isMeshPhongMaterial=!0;Ka=class extends Ke{constructor(e){super(),this.defines={TOON:""},this.type="MeshToonMaterial",this.color=new he(16777215),this.map=null,this.gradientMap=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=fi,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.gradientMap=e.gradientMap,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this}};Ka.prototype.isMeshToonMaterial=!0;eo=class extends Ke{constructor(e){super(),this.type="MeshNormalMaterial",this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=fi,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}};eo.prototype.isMeshNormalMaterial=!0;to=class extends Ke{constructor(e){super(),this.type="MeshLambertMaterial",this.color=new he(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.emissive=new he(0),this.emissiveIntensity=1,this.emissiveMap=null,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.combine=Ss,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.emissive.copy(e.emissive),this.emissiveMap=e.emissiveMap,this.emissiveIntensity=e.emissiveIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this}};to.prototype.isMeshLambertMaterial=!0;no=class extends Ke{constructor(e){super(),this.defines={MATCAP:""},this.type="MeshMatcapMaterial",this.color=new he(16777215),this.matcap=null,this.map=null,this.bumpMap=null,this.bumpScale=1,this.normalMap=null,this.normalMapType=fi,this.normalScale=new K(1,1),this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.alphaMap=null,this.skinning=!1,this.morphTargets=!1,this.morphNormals=!1,this.flatShading=!1,this.setValues(e)}copy(e){return super.copy(e),this.defines={MATCAP:""},this.color.copy(e.color),this.matcap=e.matcap,this.map=e.map,this.bumpMap=e.bumpMap,this.bumpScale=e.bumpScale,this.normalMap=e.normalMap,this.normalMapType=e.normalMapType,this.normalScale.copy(e.normalScale),this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.alphaMap=e.alphaMap,this.skinning=e.skinning,this.morphTargets=e.morphTargets,this.morphNormals=e.morphNormals,this.flatShading=e.flatShading,this}};no.prototype.isMeshMatcapMaterial=!0;io=class extends Tn{constructor(e){super(),this.type="LineDashedMaterial",this.scale=1,this.dashSize=3,this.gapSize=1,this.setValues(e)}copy(e){return super.copy(e),this.scale=e.scale,this.dashSize=e.dashSize,this.gapSize=e.gapSize,this}};io.prototype.isLineDashedMaterial=!0;Ge={arraySlice:function(r,e,t){return Ge.isTypedArray(r)?new r.constructor(r.subarray(e,t!==void 0?t:r.length)):r.slice(e,t)},convertArray:function(r,e,t){return!r||!t&&r.constructor===e?r:typeof e.BYTES_PER_ELEMENT=="number"?new e(r):Array.prototype.slice.call(r)},isTypedArray:function(r){return ArrayBuffer.isView(r)&&!(r instanceof DataView)},getKeyframeOrder:function(r){function e(i,s){return r[i]-r[s]}let t=r.length,n=new Array(t);for(let i=0;i!==t;++i)n[i]=i;return n.sort(e),n},sortedArray:function(r,e,t){let n=r.length,i=new r.constructor(n);for(let s=0,a=0;a!==n;++s){let o=t[s]*e;for(let c=0;c!==e;++c)i[a++]=r[o+c]}return i},flattenJSON:function(r,e,t,n){let i=1,s=r[0];for(;s!==void 0&&s[n]===void 0;)s=r[i++];if(s===void 0)return;let a=s[n];if(a!==void 0)if(Array.isArray(a))do a=s[n],a!==void 0&&(e.push(s.time),t.push.apply(t,a)),s=r[i++];while(s!==void 0);else if(a.toArray!==void 0)do a=s[n],a!==void 0&&(e.push(s.time),a.toArray(t,t.length)),s=r[i++];while(s!==void 0);else do a=s[n],a!==void 0&&(e.push(s.time),t.push(a)),s=r[i++];while(s!==void 0)},subclip:function(r,e,t,n,i=30){let s=r.clone();s.name=e;let a=[];for(let c=0;c<s.tracks.length;++c){let l=s.tracks[c],u=l.getValueSize(),h=[],d=[];for(let f=0;f<l.times.length;++f){let p=l.times[f]*i;if(!(p<t||p>=n)){h.push(l.times[f]);for(let g=0;g<u;++g)d.push(l.values[f*u+g])}}h.length!==0&&(l.times=Ge.convertArray(h,l.times.constructor),l.values=Ge.convertArray(d,l.values.constructor),a.push(l))}s.tracks=a;let o=1/0;for(let c=0;c<s.tracks.length;++c)o>s.tracks[c].times[0]&&(o=s.tracks[c].times[0]);for(let c=0;c<s.tracks.length;++c)s.tracks[c].shift(-1*o);return s.resetDuration(),s},makeClipAdditive:function(r,e=0,t=r,n=30){n<=0&&(n=30);let i=t.tracks.length,s=e/n;for(let a=0;a<i;++a){let o=t.tracks[a],c=o.ValueTypeName;if(c==="bool"||c==="string")continue;let l=r.tracks.find(function(x){return x.name===o.name&&x.ValueTypeName===c});if(l===void 0)continue;let u=0,h=o.getValueSize();o.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(u=h/3);let d=0,f=l.getValueSize();l.createInterpolant.isInterpolantFactoryMethodGLTFCubicSpline&&(d=f/3);let p=o.times.length-1,g;if(s<=o.times[0]){let x=u,m=h-u;g=Ge.arraySlice(o.values,x,m)}else if(s>=o.times[p]){let x=p*h+u,m=x+h-u;g=Ge.arraySlice(o.values,x,m)}else{let x=o.createInterpolant(),m=u,b=h-u;x.evaluate(s),g=Ge.arraySlice(x.resultBuffer,m,b)}c==="quaternion"&&new tt().fromArray(g).normalize().conjugate().toArray(g);let v=l.times.length;for(let x=0;x<v;++x){let m=x*f+d;if(c==="quaternion")tt.multiplyQuaternionsFlat(l.values,m,g,0,l.values,m);else{let b=f-d*2;for(let _=0;_<b;++_)l.values[m+_]-=g[_]}}}return r.blendMode=nu,r}},Ft=class{constructor(e,t,n,i){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=i!==void 0?i:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,i=t[n],s=t[n-1];e:{t:{let a;n:{i:if(!(e<i)){for(let o=n+2;;){if(i===void 0){if(e<s)break i;return n=t.length,this._cachedIndex=n,this.afterEnd_(n-1,e,s)}if(n===o)break;if(s=i,i=t[++n],e<i)break t}a=t.length;break n}if(!(e>=s)){let o=t[1];e<o&&(n=2,s=o);for(let c=n-2;;){if(s===void 0)return this._cachedIndex=0,this.beforeStart_(0,e,i);if(n===c)break;if(i=s,s=t[--n-1],e>=s)break t}a=n,n=0;break n}break e}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(i=t[n],s=t[n-1],s===void 0)return this._cachedIndex=0,this.beforeStart_(0,e,i);if(i===void 0)return n=t.length,this._cachedIndex=n,this.afterEnd_(n-1,s,e)}this._cachedIndex=n,this.intervalChanged_(n,s,i)}return this.interpolate_(n,s,e,i)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,i=this.valueSize,s=e*i;for(let a=0;a!==i;++a)t[a]=n[s+a];return t}interpolate_(){throw new Error("call to abstract method")}intervalChanged_(){}};Ft.prototype.beforeStart_=Ft.prototype.copySampleValue_;Ft.prototype.afterEnd_=Ft.prototype.copySampleValue_;ro=class extends Ft{constructor(e,t,n,i){super(e,t,n,i),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Zn,endingEnd:Zn}}intervalChanged_(e,t,n){let i=this.parameterPositions,s=e-2,a=e+1,o=i[s],c=i[a];if(o===void 0)switch(this.getSettings_().endingStart){case Jn:s=e,o=2*t-n;break;case jr:s=i.length-2,o=t+i[s]-i[s+1];break;default:s=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case Jn:a=e,c=2*n-t;break;case jr:a=1,c=n+i[1]-i[0];break;default:a=e-1,c=t}let l=(n-t)*.5,u=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=s*u,this._offsetNext=a*u}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,u=this._offsetPrev,h=this._offsetNext,d=this._weightPrev,f=this._weightNext,p=(n-t)/(i-t),g=p*p,v=g*p,x=-d*v+2*d*g-d*p,m=(1+d)*v+(-1.5-2*d)*g+(-.5+d)*p+1,b=(-1-f)*v+(1.5+f)*g+.5*p,_=f*v-f*g;for(let w=0;w!==o;++w)s[w]=x*a[u+w]+m*a[l+w]+b*a[c+w]+_*a[h+w];return s}},us=class extends Ft{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,u=(n-t)/(i-t),h=1-u;for(let d=0;d!==o;++d)s[d]=a[l+d]*h+a[c+d]*u;return s}},so=class extends Ft{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e){return this.copySampleValue_(e-1)}},bt=class{constructor(e,t,n,i){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ge.convertArray(t,this.TimeBufferType),this.values=Ge.convertArray(n,this.ValueBufferType),this.setInterpolation(i||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ge.convertArray(e.times,Array),values:Ge.convertArray(e.values,Array)};let i=e.getInterpolation();i!==e.DefaultInterpolation&&(n.interpolation=i)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new so(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new us(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ro(this.times,this.values,this.getValueSize(),e)}setInterpolation(e){let t;switch(e){case Zr:t=this.InterpolantFactoryMethodDiscrete;break;case Jr:t=this.InterpolantFactoryMethodLinear;break;case Vs:t=this.InterpolantFactoryMethodSmooth;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return console.warn("THREE.KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return Zr;case this.InterpolantFactoryMethodLinear:return Jr;case this.InterpolantFactoryMethodSmooth:return Vs}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,i=t.length;n!==i;++n)t[n]*=e}return this}trim(e,t){let n=this.times,i=n.length,s=0,a=i-1;for(;s!==i&&n[s]<e;)++s;for(;a!==-1&&n[a]>t;)--a;if(++a,s!==0||a!==i){s>=a&&(a=Math.max(a,1),s=a-1);let o=this.getValueSize();this.times=Ge.arraySlice(n,s,a),this.values=Ge.arraySlice(this.values,s*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(console.error("THREE.KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,i=this.values,s=n.length;s===0&&(console.error("THREE.KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==s;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){console.error("THREE.KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){console.error("THREE.KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(i!==void 0&&Ge.isTypedArray(i))for(let o=0,c=i.length;o!==c;++o){let l=i[o];if(isNaN(l)){console.error("THREE.KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=Ge.arraySlice(this.times),t=Ge.arraySlice(this.values),n=this.getValueSize(),i=this.getInterpolation()===Vs,s=e.length-1,a=1;for(let o=1;o<s;++o){let c=!1,l=e[o],u=e[o+1];if(l!==u&&(o!==1||l!==e[0]))if(i)c=!0;else{let h=o*n,d=h-n,f=h+n;for(let p=0;p!==n;++p){let g=t[h+p];if(g!==t[d+p]||g!==t[f+p]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let h=o*n,d=a*n;for(let f=0;f!==n;++f)t[d+f]=t[h+f]}++a}}if(s>0){e[a]=e[s];for(let o=s*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=Ge.arraySlice(e,0,a),this.values=Ge.arraySlice(t,0,a*n)):(this.times=e,this.values=t),this}clone(){let e=Ge.arraySlice(this.times,0),t=Ge.arraySlice(this.values,0),n=this.constructor,i=new n(this.name,e,t);return i.createInterpolant=this.createInterpolant,i}};bt.prototype.TimeBufferType=Float32Array;bt.prototype.ValueBufferType=Float32Array;bt.prototype.DefaultInterpolation=Jr;pn=class extends bt{};pn.prototype.ValueTypeName="bool";pn.prototype.ValueBufferType=Array;pn.prototype.DefaultInterpolation=Zr;pn.prototype.InterpolantFactoryMethodLinear=void 0;pn.prototype.InterpolantFactoryMethodSmooth=void 0;hs=class extends bt{};hs.prototype.ValueTypeName="color";si=class extends bt{};si.prototype.ValueTypeName="number";ao=class extends Ft{constructor(e,t,n,i){super(e,t,n,i)}interpolate_(e,t,n,i){let s=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(i-t),l=e*o;for(let u=l+o;l!==u;l+=4)tt.slerpFlat(s,0,a,l-o,a,l,c);return s}},An=class extends bt{InterpolantFactoryMethodLinear(e){return new ao(this.times,this.values,this.getValueSize(),e)}};An.prototype.ValueTypeName="quaternion";An.prototype.DefaultInterpolation=Jr;An.prototype.InterpolantFactoryMethodSmooth=void 0;mn=class extends bt{};mn.prototype.ValueTypeName="string";mn.prototype.ValueBufferType=Array;mn.prototype.DefaultInterpolation=Zr;mn.prototype.InterpolantFactoryMethodLinear=void 0;mn.prototype.InterpolantFactoryMethodSmooth=void 0;ai=class extends bt{};ai.prototype.ValueTypeName="vector";ds=class{constructor(e,t=-1,n,i=Yo){this.name=e,this.tracks=n,this.duration=t,this.blendMode=i,this.uuid=Ct(),this.duration<0&&this.resetDuration()}static parse(e){let t=[],n=e.tracks,i=1/(e.fps||1);for(let a=0,o=n.length;a!==o;++a)t.push(Ux(n[a]).scale(i));let s=new this(e.name,e.duration,t,e.blendMode);return s.uuid=e.uuid,s}static toJSON(e){let t=[],n=e.tracks,i={name:e.name,duration:e.duration,tracks:t,uuid:e.uuid,blendMode:e.blendMode};for(let s=0,a=n.length;s!==a;++s)t.push(bt.toJSON(n[s]));return i}static CreateFromMorphTargetSequence(e,t,n,i){let s=t.length,a=[];for(let o=0;o<s;o++){let c=[],l=[];c.push((o+s-1)%s,o,(o+1)%s),l.push(0,1,0);let u=Ge.getKeyframeOrder(c);c=Ge.sortedArray(c,1,u),l=Ge.sortedArray(l,1,u),!i&&c[0]===0&&(c.push(s),l.push(l[0])),a.push(new si(".morphTargetInfluences["+t[o].name+"]",c,l).scale(1/n))}return new this(e,-1,a)}static findByName(e,t){let n=e;if(!Array.isArray(e)){let i=e;n=i.geometry&&i.geometry.animations||i.animations}for(let i=0;i<n.length;i++)if(n[i].name===t)return n[i];return null}static CreateClipsFromMorphTargetSequences(e,t,n){let i={},s=/^([\w-]*?)([\d]+)$/;for(let o=0,c=e.length;o<c;o++){let l=e[o],u=l.name.match(s);if(u&&u.length>1){let h=u[1],d=i[h];d||(i[h]=d=[]),d.push(l)}}let a=[];for(let o in i)a.push(this.CreateFromMorphTargetSequence(o,i[o],t,n));return a}static parseAnimation(e,t){if(!e)return console.error("THREE.AnimationClip: No animation in JSONLoader data."),null;let n=function(h,d,f,p,g){if(f.length!==0){let v=[],x=[];Ge.flattenJSON(f,v,x,p),v.length!==0&&g.push(new h(d,v,x))}},i=[],s=e.name||"default",a=e.fps||30,o=e.blendMode,c=e.length||-1,l=e.hierarchy||[];for(let h=0;h<l.length;h++){let d=l[h].keys;if(!(!d||d.length===0))if(d[0].morphTargets){let f={},p;for(p=0;p<d.length;p++)if(d[p].morphTargets)for(let g=0;g<d[p].morphTargets.length;g++)f[d[p].morphTargets[g]]=-1;for(let g in f){let v=[],x=[];for(let m=0;m!==d[p].morphTargets.length;++m){let b=d[p];v.push(b.time),x.push(b.morphTarget===g?1:0)}i.push(new si(".morphTargetInfluence["+g+"]",v,x))}c=f.length*(a||1)}else{let f=".bones["+t[h].name+"]";n(ai,f+".position",d,"pos",i),n(An,f+".quaternion",d,"rot",i),n(ai,f+".scale",d,"scl",i)}}return i.length===0?null:new this(s,c,i,o)}resetDuration(){let e=this.tracks,t=0;for(let n=0,i=e.length;n!==i;++n){let s=this.tracks[n];t=Math.max(t,s.times[s.times.length-1])}return this.duration=t,this}trim(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].trim(0,this.duration);return this}validate(){let e=!0;for(let t=0;t<this.tracks.length;t++)e=e&&this.tracks[t].validate();return e}optimize(){for(let e=0;e<this.tracks.length;e++)this.tracks[e].optimize();return this}clone(){let e=[];for(let t=0;t<this.tracks.length;t++)e.push(this.tracks[t].clone());return new this.constructor(this.name,this.duration,e,this.blendMode)}toJSON(){return this.constructor.toJSON(this)}};oi={enabled:!1,files:{},add:function(r,e){this.enabled!==!1&&(this.files[r]=e)},get:function(r){if(this.enabled!==!1)return this.files[r]},remove:function(r){delete this.files[r]},clear:function(){this.files={}}},oo=class{constructor(e,t,n){let i=this,s=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this.itemStart=function(u){o++,s===!1&&i.onStart!==void 0&&i.onStart(u,a,o),s=!0},this.itemEnd=function(u){a++,i.onProgress!==void 0&&i.onProgress(u,a,o),a===o&&(s=!1,i.onLoad!==void 0&&i.onLoad())},this.itemError=function(u){i.onError!==void 0&&i.onError(u)},this.resolveURL=function(u){return c?c(u):u},this.setURLModifier=function(u){return c=u,this},this.addHandler=function(u,h){return l.push(u,h),this},this.removeHandler=function(u){let h=l.indexOf(u);return h!==-1&&l.splice(h,2),this},this.getHandler=function(u){for(let h=0,d=l.length;h<d;h+=2){let f=l[h],p=l[h+1];if(f.global&&(f.lastIndex=0),f.test(u))return p}return null}}},Ox=new oo,Bt=class{constructor(e){this.manager=e!==void 0?e:Ox,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={}}load(){}loadAsync(e,t){let n=this;return new Promise(function(i,s){n.load(e,i,t,s)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}},At={},co=class extends Bt{constructor(e){super(e)}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,a=oi.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;if(At[e]!==void 0){At[e].push({onLoad:t,onProgress:n,onError:i});return}let o=/^data:(.*?)(;base64)?,(.*)$/,c=e.match(o),l;if(c){let u=c[1],h=!!c[2],d=c[3];d=decodeURIComponent(d),h&&(d=atob(d));try{let f,p=(this.responseType||"").toLowerCase();switch(p){case"arraybuffer":case"blob":let g=new Uint8Array(d.length);for(let x=0;x<d.length;x++)g[x]=d.charCodeAt(x);p==="blob"?f=new Blob([g.buffer],{type:u}):f=g.buffer;break;case"document":f=new DOMParser().parseFromString(d,u);break;case"json":f=JSON.parse(d);break;default:f=d;break}setTimeout(function(){t&&t(f),s.manager.itemEnd(e)},0)}catch(f){setTimeout(function(){i&&i(f),s.manager.itemError(e),s.manager.itemEnd(e)},0)}}else{At[e]=[],At[e].push({onLoad:t,onProgress:n,onError:i}),l=new XMLHttpRequest,l.open("GET",e,!0),l.addEventListener("load",function(u){let h=this.response,d=At[e];if(delete At[e],this.status===200||this.status===0){this.status===0&&console.warn("THREE.FileLoader: HTTP Status 0 received."),oi.add(e,h);for(let f=0,p=d.length;f<p;f++){let g=d[f];g.onLoad&&g.onLoad(h)}s.manager.itemEnd(e)}else{for(let f=0,p=d.length;f<p;f++){let g=d[f];g.onError&&g.onError(u)}s.manager.itemError(e),s.manager.itemEnd(e)}},!1),l.addEventListener("progress",function(u){let h=At[e];for(let d=0,f=h.length;d<f;d++){let p=h[d];p.onProgress&&p.onProgress(u)}},!1),l.addEventListener("error",function(u){let h=At[e];delete At[e];for(let d=0,f=h.length;d<f;d++){let p=h[d];p.onError&&p.onError(u)}s.manager.itemError(e),s.manager.itemEnd(e)},!1),l.addEventListener("abort",function(u){let h=At[e];delete At[e];for(let d=0,f=h.length;d<f;d++){let p=h[d];p.onError&&p.onError(u)}s.manager.itemError(e),s.manager.itemEnd(e)},!1),this.responseType!==void 0&&(l.responseType=this.responseType),this.withCredentials!==void 0&&(l.withCredentials=this.withCredentials),l.overrideMimeType&&l.overrideMimeType(this.mimeType!==void 0?this.mimeType:"text/plain");for(let u in this.requestHeader)l.setRequestHeader(u,this.requestHeader[u]);l.send(null)}return s.manager.itemStart(e),l}setResponseType(e){return this.responseType=e,this}setMimeType(e){return this.mimeType=e,this}},fs=class extends Bt{constructor(e){super(e)}load(e,t,n,i){this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,a=oi.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;let o=document.createElementNS("http://www.w3.org/1999/xhtml","img");function c(){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1),oi.add(e,this),t&&t(this),s.manager.itemEnd(e)}function l(u){o.removeEventListener("load",c,!1),o.removeEventListener("error",l,!1),i&&i(u),s.manager.itemError(e),s.manager.itemEnd(e)}return o.addEventListener("load",c,!1),o.addEventListener("error",l,!1),e.substr(0,5)!=="data:"&&this.crossOrigin!==void 0&&(o.crossOrigin=this.crossOrigin),s.manager.itemStart(e),o.src=e,o}},lo=class extends Bt{constructor(e){super(e)}load(e,t,n,i){let s=new ti,a=new fs(this.manager);a.setCrossOrigin(this.crossOrigin),a.setPath(this.path);let o=0;function c(l){a.load(e[l],function(u){s.images[l]=u,o++,o===6&&(s.needsUpdate=!0,t&&t(s))},void 0,i)}for(let l=0;l<e.length;++l)c(l);return s}},uo=class extends Bt{constructor(e){super(e)}load(e,t,n,i){let s=new rt,a=new fs(this.manager);return a.setCrossOrigin(this.crossOrigin),a.setPath(this.path),a.load(e,function(o){s.image=o;let c=e.search(/\.jpe?g($|\?)/i)>0||e.search(/^data\:image\/jpeg/)===0;s.format=c?Mn:Pt,s.needsUpdate=!0,t!==void 0&&t(s)},n,i),s}},pt=class{constructor(){this.type="Curve",this.arcLengthDivisions=200}getPoint(){return console.warn("THREE.Curve: .getPoint() not implemented."),null}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,i=this.getPoint(0),s=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),s+=n.distanceTo(i),t.push(s),i=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t){let n=this.getLengths(),i=0,s=n.length,a;t?a=t:a=e*n[s-1];let o=0,c=s-1,l;for(;o<=c;)if(i=Math.floor(o+(c-o)/2),l=n[i]-a,l<0)o=i+1;else if(l>0)c=i-1;else{c=i;break}if(i=c,n[i]===a)return i/(s-1);let u=n[i],d=n[i+1]-u,f=(a-u)/d;return(i+f)/(s-1)}getTangent(e,t){let i=e-1e-4,s=e+1e-4;i<0&&(i=0),s>1&&(s=1);let a=this.getPoint(i),o=this.getPoint(s),c=t||(a.isVector2?new K:new E);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t){let n=new E,i=[],s=[],a=[],o=new E,c=new me;for(let f=0;f<=e;f++){let p=f/e;i[f]=this.getTangentAt(p,new E),i[f].normalize()}s[0]=new E,a[0]=new E;let l=Number.MAX_VALUE,u=Math.abs(i[0].x),h=Math.abs(i[0].y),d=Math.abs(i[0].z);u<=l&&(l=u,n.set(1,0,0)),h<=l&&(l=h,n.set(0,1,0)),d<=l&&n.set(0,0,1),o.crossVectors(i[0],n).normalize(),s[0].crossVectors(i[0],o),a[0].crossVectors(i[0],s[0]);for(let f=1;f<=e;f++){if(s[f]=s[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(i[f-1],i[f]),o.length()>Number.EPSILON){o.normalize();let p=Math.acos(dt(i[f-1].dot(i[f]),-1,1));s[f].applyMatrix4(c.makeRotationAxis(o,p))}a[f].crossVectors(i[f],s[f])}if(t===!0){let f=Math.acos(dt(s[0].dot(s[e]),-1,1));f/=e,i[0].dot(o.crossVectors(s[0],s[e]))>0&&(f=-f);for(let p=1;p<=e;p++)s[p].applyMatrix4(c.makeRotationAxis(i[p],f*p)),a[p].crossVectors(i[p],s[p])}return{tangents:i,normals:s,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.5,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},ci=class extends pt{constructor(e=0,t=0,n=1,i=1,s=0,a=Math.PI*2,o=!1,c=0){super(),this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=i,this.aStartAngle=s,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t){let n=t||new K,i=Math.PI*2,s=this.aEndAngle-this.aStartAngle,a=Math.abs(s)<Number.EPSILON;for(;s<0;)s+=i;for(;s>i;)s-=i;s<Number.EPSILON&&(a?s=0:s=i),this.aClockwise===!0&&!a&&(s===i?s=-i:s=s-i);let o=this.aStartAngle+e*s,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let u=Math.cos(this.aRotation),h=Math.sin(this.aRotation),d=c-this.aX,f=l-this.aY;c=d*u-f*h+this.aX,l=d*h+f*u+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}};ci.prototype.isEllipseCurve=!0;ps=class extends ci{constructor(e,t,n,i,s,a){super(e,t,n,n,i,s,a),this.type="ArcCurve"}};ps.prototype.isArcCurve=!0;Gr=new E,ya=new Zo,ba=new Zo,_a=new Zo,ms=class extends pt{constructor(e=[],t=!1,n="centripetal",i=.5){super(),this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=i}getPoint(e,t=new E){let n=t,i=this.points,s=i.length,a=(s-(this.closed?0:1))*e,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/s)+1)*s:c===0&&o===s-1&&(o=s-2,c=1);let l,u;this.closed||o>0?l=i[(o-1)%s]:(Gr.subVectors(i[0],i[1]).add(i[0]),l=Gr);let h=i[o%s],d=i[(o+1)%s];if(this.closed||o+2<s?u=i[(o+2)%s]:(Gr.subVectors(i[s-1],i[s-2]).add(i[s-1]),u=Gr),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,p=Math.pow(l.distanceToSquared(h),f),g=Math.pow(h.distanceToSquared(d),f),v=Math.pow(d.distanceToSquared(u),f);g<1e-4&&(g=1),p<1e-4&&(p=g),v<1e-4&&(v=g),ya.initNonuniformCatmullRom(l.x,h.x,d.x,u.x,p,g,v),ba.initNonuniformCatmullRom(l.y,h.y,d.y,u.y,p,g,v),_a.initNonuniformCatmullRom(l.z,h.z,d.z,u.z,p,g,v)}else this.curveType==="catmullrom"&&(ya.initCatmullRom(l.x,h.x,d.x,u.x,this.tension),ba.initCatmullRom(l.y,h.y,d.y,u.y,this.tension),_a.initCatmullRom(l.z,h.z,d.z,u.z,this.tension));return n.set(ya.calc(c),ba.calc(c),_a.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new E().fromArray(i))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};ms.prototype.isCatmullRomCurve3=!0;er=class extends pt{constructor(e=new K,t=new K,n=new K,i=new K){super(),this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new K){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ui(e,i.x,s.x,a.x,o.x),Ui(e,i.y,s.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}};er.prototype.isCubicBezierCurve=!0;xs=class extends pt{constructor(e=new E,t=new E,n=new E,i=new E){super(),this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=i}getPoint(e,t=new E){let n=t,i=this.v0,s=this.v1,a=this.v2,o=this.v3;return n.set(Ui(e,i.x,s.x,a.x,o.x),Ui(e,i.y,s.y,a.y,o.y),Ui(e,i.z,s.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}};xs.prototype.isCubicBezierCurve3=!0;li=class extends pt{constructor(e=new K,t=new K){super(),this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new K){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t){let n=t||new K;return n.copy(this.v2).sub(this.v1).normalize(),n}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}};li.prototype.isLineCurve=!0;ho=class extends pt{constructor(e=new E,t=new E){super(),this.type="LineCurve3",this.isLineCurve3=!0,this.v1=e,this.v2=t}getPoint(e,t=new E){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},tr=class extends pt{constructor(e=new K,t=new K,n=new K){super(),this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new K){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(Ni(e,i.x,s.x,a.x),Ni(e,i.y,s.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}};tr.prototype.isQuadraticBezierCurve=!0;gs=class extends pt{constructor(e=new E,t=new E,n=new E){super(),this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new E){let n=t,i=this.v0,s=this.v1,a=this.v2;return n.set(Ni(e,i.x,s.x,a.x),Ni(e,i.y,s.y,a.y),Ni(e,i.z,s.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}};gs.prototype.isQuadraticBezierCurve3=!0;nr=class extends pt{constructor(e=[]){super(),this.type="SplineCurve",this.points=e}getPoint(e,t=new K){let n=t,i=this.points,s=(i.length-1)*e,a=Math.floor(s),o=s-a,c=i[a===0?a:a-1],l=i[a],u=i[a>i.length-2?i.length-1:a+1],h=i[a>i.length-3?i.length-1:a+2];return n.set(Wl(o,c.x,l.x,u.x,h.x),Wl(o,c.y,l.y,u.y,h.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let i=this.points[t];e.points.push(i.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let i=e.points[t];this.points.push(new K().fromArray(i))}return this}};nr.prototype.isSplineCurve=!0;$x=Object.freeze({__proto__:null,ArcCurve:ps,CatmullRomCurve3:ms,CubicBezierCurve:er,CubicBezierCurve3:xs,EllipseCurve:ci,LineCurve:li,LineCurve3:ho,QuadraticBezierCurve:tr,QuadraticBezierCurve3:gs,SplineCurve:nr}),fo=class extends pt{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);e.equals(t)||this.curves.push(new li(t,e))}getPoint(e){let t=e*this.getLength(),n=this.getCurveLengths(),i=0;for(;i<n.length;){if(n[i]>=t){let s=n[i]-t,a=this.curves[i],o=a.getLength(),c=o===0?0:1-s/o;return a.getPointAt(c)}i++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,i=this.curves.length;n<i;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let i=0,s=this.curves;i<s.length;i++){let a=s[i],o=a&&a.isEllipseCurve?e*2:a&&(a.isLineCurve||a.isLineCurve3)?1:a&&a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){let u=c[l];n&&n.equals(u)||(t.push(u),n=u)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(i.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let i=this.curves[t];e.curves.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let i=e.curves[t];this.curves.push(new $x[i.type]().fromJSON(i))}return this}},ui=class extends fo{constructor(e){super(),this.type="Path",this.currentPoint=new K,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new li(this.currentPoint.clone(),new K(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,i){let s=new tr(this.currentPoint.clone(),new K(e,t),new K(n,i));return this.curves.push(s),this.currentPoint.set(n,i),this}bezierCurveTo(e,t,n,i,s,a){let o=new er(this.currentPoint.clone(),new K(e,t),new K(n,i),new K(s,a));return this.curves.push(o),this.currentPoint.set(s,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new nr(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,i,s,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,i,s,a),this}absarc(e,t,n,i,s,a){return this.absellipse(e,t,n,n,i,s,a),this}ellipse(e,t,n,i,s,a,o,c){let l=this.currentPoint.x,u=this.currentPoint.y;return this.absellipse(e+l,t+u,n,i,s,a,o,c),this}absellipse(e,t,n,i,s,a,o,c){let l=new ci(e,t,n,i,s,a,o,c);if(this.curves.length>0){let h=l.getPoint(0);h.equals(this.currentPoint)||this.lineTo(h.x,h.y)}this.curves.push(l);let u=l.getPoint(1);return this.currentPoint.copy(u),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},ln=class extends ui{constructor(e){super(e),this.uuid=Ct(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,i=this.holes.length;n<i;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(i.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let i=this.holes[t];e.holes.push(i.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let i=e.holes[t];this.holes.push(new ui().fromJSON(i))}return this}},_t=class extends Fe{constructor(e,t=1){super(),this.type="Light",this.color=new he(e),this.intensity=t}dispose(){}copy(e){return super.copy(e),this.color.copy(e.color),this.intensity=e.intensity,this}toJSON(e){let t=super.toJSON(e);return t.object.color=this.color.getHex(),t.object.intensity=this.intensity,this.groundColor!==void 0&&(t.object.groundColor=this.groundColor.getHex()),this.distance!==void 0&&(t.object.distance=this.distance),this.angle!==void 0&&(t.object.angle=this.angle),this.decay!==void 0&&(t.object.decay=this.decay),this.penumbra!==void 0&&(t.object.penumbra=this.penumbra),this.shadow!==void 0&&(t.object.shadow=this.shadow.toJSON()),t}};_t.prototype.isLight=!0;po=class extends _t{constructor(e,t,n){super(e,n),this.type="HemisphereLight",this.position.copy(Fe.DefaultUp),this.updateMatrix(),this.groundColor=new he(t)}copy(e){return _t.prototype.copy.call(this,e),this.groundColor.copy(e.groundColor),this}};po.prototype.isHemisphereLight=!0;ql=new me,Xl=new E,Yl=new E,ir=class{constructor(e){this.camera=e,this.bias=0,this.normalBias=0,this.radius=1,this.mapSize=new K(512,512),this.map=null,this.mapPass=null,this.matrix=new me,this.autoUpdate=!0,this.needsUpdate=!1,this._frustum=new yt,this._frameExtents=new K(1,1),this._viewportCount=1,this._viewports=[new Re(0,0,1,1)]}getViewportCount(){return this._viewportCount}getFrustum(){return this._frustum}updateMatrices(e){let t=this.camera,n=this.matrix;Xl.setFromMatrixPosition(e.matrixWorld),t.position.copy(Xl),Yl.setFromMatrixPosition(e.target.matrixWorld),t.lookAt(Yl),t.updateMatrixWorld(),ql.multiplyMatrices(t.projectionMatrix,t.matrixWorldInverse),this._frustum.setFromProjectionMatrix(ql),n.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1),n.multiply(t.projectionMatrix),n.multiply(t.matrixWorldInverse)}getViewport(e){return this._viewports[e]}getFrameExtents(){return this._frameExtents}dispose(){this.map&&this.map.dispose(),this.mapPass&&this.mapPass.dispose()}copy(e){return this.camera=e.camera.clone(),this.bias=e.bias,this.radius=e.radius,this.mapSize.copy(e.mapSize),this}clone(){return new this.constructor().copy(this)}toJSON(){let e={};return this.bias!==0&&(e.bias=this.bias),this.normalBias!==0&&(e.normalBias=this.normalBias),this.radius!==1&&(e.radius=this.radius),(this.mapSize.x!==512||this.mapSize.y!==512)&&(e.mapSize=this.mapSize.toArray()),e.camera=this.camera.toJSON(!1).object,delete e.camera.matrix,e}},vs=class extends ir{constructor(){super(new He(50,1,.5,500)),this.focus=1}updateMatrices(e){let t=this.camera,n=Aa*2*e.angle*this.focus,i=this.mapSize.width/this.mapSize.height,s=e.distance||t.far;(n!==t.fov||i!==t.aspect||s!==t.far)&&(t.fov=n,t.aspect=i,t.far=s,t.updateProjectionMatrix()),super.updateMatrices(e)}copy(e){return super.copy(e),this.focus=e.focus,this}};vs.prototype.isSpotLightShadow=!0;mo=class extends _t{constructor(e,t,n=0,i=Math.PI/3,s=0,a=1){super(e,t),this.type="SpotLight",this.position.copy(Fe.DefaultUp),this.updateMatrix(),this.target=new Fe,this.distance=n,this.angle=i,this.penumbra=s,this.decay=a,this.shadow=new vs}get power(){return this.intensity*Math.PI}set power(e){this.intensity=e/Math.PI}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.distance=e.distance,this.angle=e.angle,this.penumbra=e.penumbra,this.decay=e.decay,this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};mo.prototype.isSpotLight=!0;$l=new me,Ci=new E,wa=new E,ys=class extends ir{constructor(){super(new He(90,1,.5,500)),this._frameExtents=new K(4,2),this._viewportCount=6,this._viewports=[new Re(2,1,1,1),new Re(0,1,1,1),new Re(3,1,1,1),new Re(1,1,1,1),new Re(3,0,1,1),new Re(1,0,1,1)],this._cubeDirections=[new E(1,0,0),new E(-1,0,0),new E(0,0,1),new E(0,0,-1),new E(0,1,0),new E(0,-1,0)],this._cubeUps=[new E(0,1,0),new E(0,1,0),new E(0,1,0),new E(0,1,0),new E(0,0,1),new E(0,0,-1)]}updateMatrices(e,t=0){let n=this.camera,i=this.matrix,s=e.distance||n.far;s!==n.far&&(n.far=s,n.updateProjectionMatrix()),Ci.setFromMatrixPosition(e.matrixWorld),n.position.copy(Ci),wa.copy(n.position),wa.add(this._cubeDirections[t]),n.up.copy(this._cubeUps[t]),n.lookAt(wa),n.updateMatrixWorld(),i.makeTranslation(-Ci.x,-Ci.y,-Ci.z),$l.multiplyMatrices(n.projectionMatrix,n.matrixWorldInverse),this._frustum.setFromProjectionMatrix($l)}};ys.prototype.isPointLightShadow=!0;xo=class extends _t{constructor(e,t,n=0,i=1){super(e,t),this.type="PointLight",this.distance=n,this.decay=i,this.shadow=new ys}get power(){return this.intensity*4*Math.PI}set power(e){this.intensity=e/(4*Math.PI)}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.distance=e.distance,this.decay=e.decay,this.shadow=e.shadow.clone(),this}};xo.prototype.isPointLight=!0;bs=class extends qi{constructor(e=-1,t=1,n=1,i=-1,s=.1,a=2e3){super(),this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=i,this.near=s,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,i,s,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=i,this.view.width=s,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,i=(this.top+this.bottom)/2,s=n-e,a=n+e,o=i+t,c=i-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;s+=l*this.view.offsetX,a=s+l*this.view.width,o-=u*this.view.offsetY,c=o-u*this.view.height}this.projectionMatrix.makeOrthographic(s,a,o,c,this.near,this.far),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}};bs.prototype.isOrthographicCamera=!0;_s=class extends ir{constructor(){super(new bs(-5,5,5,-5,.5,500))}};_s.prototype.isDirectionalLightShadow=!0;rr=class extends _t{constructor(e,t){super(e,t),this.type="DirectionalLight",this.position.copy(Fe.DefaultUp),this.updateMatrix(),this.target=new Fe,this.shadow=new _s}dispose(){this.shadow.dispose()}copy(e){return super.copy(e),this.target=e.target.clone(),this.shadow=e.shadow.clone(),this}};rr.prototype.isDirectionalLight=!0;sr=class extends _t{constructor(e,t){super(e,t),this.type="AmbientLight"}};sr.prototype.isAmbientLight=!0;go=class extends _t{constructor(e,t,n=10,i=10){super(e,t),this.type="RectAreaLight",this.width=n,this.height=i}copy(e){return super.copy(e),this.width=e.width,this.height=e.height,this}toJSON(e){let t=super.toJSON(e);return t.object.width=this.width,t.object.height=this.height,t}};go.prototype.isRectAreaLight=!0;ws=class{constructor(){this.coefficients=[];for(let e=0;e<9;e++)this.coefficients.push(new E)}set(e){for(let t=0;t<9;t++)this.coefficients[t].copy(e[t]);return this}zero(){for(let e=0;e<9;e++)this.coefficients[e].set(0,0,0);return this}getAt(e,t){let n=e.x,i=e.y,s=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.282095),t.addScaledVector(a[1],.488603*i),t.addScaledVector(a[2],.488603*s),t.addScaledVector(a[3],.488603*n),t.addScaledVector(a[4],1.092548*(n*i)),t.addScaledVector(a[5],1.092548*(i*s)),t.addScaledVector(a[6],.315392*(3*s*s-1)),t.addScaledVector(a[7],1.092548*(n*s)),t.addScaledVector(a[8],.546274*(n*n-i*i)),t}getIrradianceAt(e,t){let n=e.x,i=e.y,s=e.z,a=this.coefficients;return t.copy(a[0]).multiplyScalar(.886227),t.addScaledVector(a[1],2*.511664*i),t.addScaledVector(a[2],2*.511664*s),t.addScaledVector(a[3],2*.511664*n),t.addScaledVector(a[4],2*.429043*n*i),t.addScaledVector(a[5],2*.429043*i*s),t.addScaledVector(a[6],.743125*s*s-.247708),t.addScaledVector(a[7],2*.429043*n*s),t.addScaledVector(a[8],.429043*(n*n-i*i)),t}add(e){for(let t=0;t<9;t++)this.coefficients[t].add(e.coefficients[t]);return this}addScaledSH(e,t){for(let n=0;n<9;n++)this.coefficients[n].addScaledVector(e.coefficients[n],t);return this}scale(e){for(let t=0;t<9;t++)this.coefficients[t].multiplyScalar(e);return this}lerp(e,t){for(let n=0;n<9;n++)this.coefficients[n].lerp(e.coefficients[n],t);return this}equals(e){for(let t=0;t<9;t++)if(!this.coefficients[t].equals(e.coefficients[t]))return!1;return!0}copy(e){return this.set(e.coefficients)}clone(){return new this.constructor().copy(this)}fromArray(e,t=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].fromArray(e,t+i*3);return this}toArray(e=[],t=0){let n=this.coefficients;for(let i=0;i<9;i++)n[i].toArray(e,t+i*3);return e}static getBasisAt(e,t){let n=e.x,i=e.y,s=e.z;t[0]=.282095,t[1]=.488603*i,t[2]=.488603*s,t[3]=.488603*n,t[4]=1.092548*n*i,t[5]=1.092548*i*s,t[6]=.315392*(3*s*s-1),t[7]=1.092548*n*s,t[8]=.546274*(n*n-i*i)}};ws.prototype.isSphericalHarmonics3=!0;ar=class extends _t{constructor(e=new ws,t=1){super(void 0,t),this.sh=e}copy(e){return super.copy(e),this.sh.copy(e.sh),this}fromJSON(e){return this.intensity=e.intensity,this.sh.fromArray(e.sh),this}toJSON(e){let t=super.toJSON(e);return t.object.sh=this.sh.toArray(),t}};ar.prototype.isLightProbe=!0;vo=class{static decodeText(e){if(typeof TextDecoder<"u")return new TextDecoder().decode(e);let t="";for(let n=0,i=e.length;n<i;n++)t+=String.fromCharCode(e[n]);try{return decodeURIComponent(escape(t))}catch{return t}}static extractUrlBase(e){let t=e.lastIndexOf("/");return t===-1?"./":e.substr(0,t+1)}},yo=class extends Ie{constructor(){super(),this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}clone(){return new this.constructor().copy(this)}toJSON(){let e=super.toJSON(this);return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}};yo.prototype.isInstancedBufferGeometry=!0;bo=class extends Ue{constructor(e,t,n,i){typeof n=="number"&&(i=n,n=!1,console.error("THREE.InstancedBufferAttribute: The constructor now expects normalized as the third argument.")),super(e,t,n),this.meshPerAttribute=i||1}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}toJSON(){let e=super.toJSON();return e.meshPerAttribute=this.meshPerAttribute,e.isInstancedBufferAttribute=!0,e}};bo.prototype.isInstancedBufferAttribute=!0;_o=class extends Bt{constructor(e){super(e),typeof createImageBitmap>"u"&&console.warn("THREE.ImageBitmapLoader: createImageBitmap() not supported."),typeof fetch>"u"&&console.warn("THREE.ImageBitmapLoader: fetch() not supported."),this.options={premultiplyAlpha:"none"}}setOptions(e){return this.options=e,this}load(e,t,n,i){e===void 0&&(e=""),this.path!==void 0&&(e=this.path+e),e=this.manager.resolveURL(e);let s=this,a=oi.get(e);if(a!==void 0)return s.manager.itemStart(e),setTimeout(function(){t&&t(a),s.manager.itemEnd(e)},0),a;let o={};o.credentials=this.crossOrigin==="anonymous"?"same-origin":"include",o.headers=this.requestHeader,fetch(e,o).then(function(c){return c.blob()}).then(function(c){return createImageBitmap(c,Object.assign(s.options,{colorSpaceConversion:"none"}))}).then(function(c){oi.add(e,c),t&&t(c),s.manager.itemEnd(e)}).catch(function(c){i&&i(c),s.manager.itemError(e),s.manager.itemEnd(e)}),s.manager.itemStart(e)}};_o.prototype.isImageBitmapLoader=!0;wo=class{constructor(){this.type="ShapePath",this.color=new he,this.subPaths=[],this.currentPath=null}moveTo(e,t){return this.currentPath=new ui,this.subPaths.push(this.currentPath),this.currentPath.moveTo(e,t),this}lineTo(e,t){return this.currentPath.lineTo(e,t),this}quadraticCurveTo(e,t,n,i){return this.currentPath.quadraticCurveTo(e,t,n,i),this}bezierCurveTo(e,t,n,i,s,a){return this.currentPath.bezierCurveTo(e,t,n,i,s,a),this}splineThru(e){return this.currentPath.splineThru(e),this}toShapes(e,t){function n(m){let b=[];for(let _=0,w=m.length;_<w;_++){let y=m[_],P=new ln;P.curves=y.curves,b.push(P)}return b}function i(m,b){let _=b.length,w=!1;for(let y=_-1,P=0;P<_;y=P++){let C=b[y],F=b[P],k=F.x-C.x,H=F.y-C.y;if(Math.abs(H)>Number.EPSILON){if(H<0&&(C=b[P],k=-k,F=b[y],H=-H),m.y<C.y||m.y>F.y)continue;if(m.y===C.y){if(m.x===C.x)return!0}else{let B=H*(m.x-C.x)-k*(m.y-C.y);if(B===0)return!0;if(B<0)continue;w=!w}}else{if(m.y!==C.y)continue;if(F.x<=m.x&&m.x<=C.x||C.x<=m.x&&m.x<=F.x)return!0}}return w}let s=Zt.isClockWise,a=this.subPaths;if(a.length===0)return[];if(t===!0)return n(a);let o,c,l,u=[];if(a.length===1)return c=a[0],l=new ln,l.curves=c.curves,u.push(l),u;let h=!s(a[0].getPoints());h=e?!h:h;let d=[],f=[],p=[],g=0,v;f[g]=void 0,p[g]=[];for(let m=0,b=a.length;m<b;m++)c=a[m],v=c.getPoints(),o=s(v),o=e?!o:o,o?(!h&&f[g]&&g++,f[g]={s:new ln,p:v},f[g].s.curves=c.curves,h&&g++,p[g]=[]):p[g].push({h:c,p:v[0]});if(!f[0])return n(a);if(f.length>1){let m=!1,b=[];for(let _=0,w=f.length;_<w;_++)d[_]=[];for(let _=0,w=f.length;_<w;_++){let y=p[_];for(let P=0;P<y.length;P++){let C=y[P],F=!0;for(let k=0;k<f.length;k++)i(C.p,f[k].p)&&(_!==k&&b.push({froms:_,tos:k,hole:P}),F?(F=!1,d[k].push(C)):m=!0);F&&d[_].push(C)}}b.length>0&&(m||(p=d))}let x;for(let m=0,b=f.length;m<b;m++){l=f[m].s,u.push(l),x=p[m];for(let _=0,w=x.length;_<w;_++)l.holes.push(x[_].h)}return u}},Mo=class{constructor(e){this.type="Font",this.data=e}generateShapes(e,t=100){let n=[],i=Zx(e,t,this.data);for(let s=0,a=i.length;s<a;s++)Array.prototype.push.apply(n,i[s].toShapes());return n}};Mo.prototype.isFont=!0;jx={getContext:function(){return Hr===void 0&&(Hr=new(window.AudioContext||window.webkitAudioContext)),Hr},setContext:function(r){Hr=r}},So=class extends Bt{constructor(e){super(e)}load(e,t,n,i){let s=this,a=new co(this.manager);a.setResponseType("arraybuffer"),a.setPath(this.path),a.setRequestHeader(this.requestHeader),a.setWithCredentials(this.withCredentials),a.load(e,function(o){try{let c=o.slice(0);jx.getContext().decodeAudioData(c,function(u){t(u)})}catch(c){i?i(c):console.error(c),s.manager.itemError(e)}},n,i)}},Eo=class extends ar{constructor(e,t,n=1){super(void 0,n);let i=new he().set(e),s=new he().set(t),a=new E(i.r,i.g,i.b),o=new E(s.r,s.g,s.b),c=Math.sqrt(Math.PI),l=c*Math.sqrt(.75);this.sh.coefficients[0].copy(a).add(o).multiplyScalar(c),this.sh.coefficients[1].copy(a).sub(o).multiplyScalar(l)}};Eo.prototype.isHemisphereLightProbe=!0;To=class extends ar{constructor(e,t=1){super(void 0,t);let n=new he().set(e);this.sh.coefficients[0].set(n.r,n.g,n.b).multiplyScalar(2*Math.sqrt(Math.PI))}};To.prototype.isAmbientLightProbe=!0;Ao=class extends Fe{constructor(e){super(),this.type="Audio",this.listener=e,this.context=e.context,this.gain=this.context.createGain(),this.gain.connect(e.getInput()),this.autoplay=!1,this.buffer=null,this.detune=0,this.loop=!1,this.loopStart=0,this.loopEnd=0,this.offset=0,this.duration=void 0,this.playbackRate=1,this.isPlaying=!1,this.hasPlaybackControl=!0,this.source=null,this.sourceType="empty",this._startedAt=0,this._progress=0,this._connected=!1,this.filters=[]}getOutput(){return this.gain}setNodeSource(e){return this.hasPlaybackControl=!1,this.sourceType="audioNode",this.source=e,this.connect(),this}setMediaElementSource(e){return this.hasPlaybackControl=!1,this.sourceType="mediaNode",this.source=this.context.createMediaElementSource(e),this.connect(),this}setMediaStreamSource(e){return this.hasPlaybackControl=!1,this.sourceType="mediaStreamNode",this.source=this.context.createMediaStreamSource(e),this.connect(),this}setBuffer(e){return this.buffer=e,this.sourceType="buffer",this.autoplay&&this.play(),this}play(e=0){if(this.isPlaying===!0){console.warn("THREE.Audio: Audio is already playing.");return}if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}this._startedAt=this.context.currentTime+e;let t=this.context.createBufferSource();return t.buffer=this.buffer,t.loop=this.loop,t.loopStart=this.loopStart,t.loopEnd=this.loopEnd,t.onended=this.onEnded.bind(this),t.start(this._startedAt,this._progress+this.offset,this.duration),this.isPlaying=!0,this.source=t,this.setDetune(this.detune),this.setPlaybackRate(this.playbackRate),this.connect()}pause(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.isPlaying===!0&&(this._progress+=Math.max(this.context.currentTime-this._startedAt,0)*this.playbackRate,this.loop===!0&&(this._progress=this._progress%(this.duration||this.buffer.duration)),this.source.stop(),this.source.onended=null,this.isPlaying=!1),this}stop(){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this._progress=0,this.source.stop(),this.source.onended=null,this.isPlaying=!1,this}connect(){if(this.filters.length>0){this.source.connect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].connect(this.filters[e]);this.filters[this.filters.length-1].connect(this.getOutput())}else this.source.connect(this.getOutput());return this._connected=!0,this}disconnect(){if(this.filters.length>0){this.source.disconnect(this.filters[0]);for(let e=1,t=this.filters.length;e<t;e++)this.filters[e-1].disconnect(this.filters[e]);this.filters[this.filters.length-1].disconnect(this.getOutput())}else this.source.disconnect(this.getOutput());return this._connected=!1,this}getFilters(){return this.filters}setFilters(e){return e||(e=[]),this._connected===!0?(this.disconnect(),this.filters=e.slice(),this.connect()):this.filters=e.slice(),this}setDetune(e){if(this.detune=e,this.source.detune!==void 0)return this.isPlaying===!0&&this.source.detune.setTargetAtTime(this.detune,this.context.currentTime,.01),this}getDetune(){return this.detune}getFilter(){return this.getFilters()[0]}setFilter(e){return this.setFilters(e?[e]:[])}setPlaybackRate(e){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.playbackRate=e,this.isPlaying===!0&&this.source.playbackRate.setTargetAtTime(this.playbackRate,this.context.currentTime,.01),this}getPlaybackRate(){return this.playbackRate}onEnded(){this.isPlaying=!1}getLoop(){return this.hasPlaybackControl===!1?(console.warn("THREE.Audio: this Audio has no playback control."),!1):this.loop}setLoop(e){if(this.hasPlaybackControl===!1){console.warn("THREE.Audio: this Audio has no playback control.");return}return this.loop=e,this.isPlaying===!0&&(this.source.loop=this.loop),this}setLoopStart(e){return this.loopStart=e,this}setLoopEnd(e){return this.loopEnd=e,this}getVolume(){return this.gain.gain.value}setVolume(e){return this.gain.gain.setTargetAtTime(e,this.context.currentTime,.01),this}},Lo=class{constructor(e,t=2048){this.analyser=e.context.createAnalyser(),this.analyser.fftSize=t,this.data=new Uint8Array(this.analyser.frequencyBinCount),e.getOutput().connect(this.analyser)}getFrequencyData(){return this.analyser.getByteFrequencyData(this.data),this.data}getAverageFrequency(){let e=0,t=this.getFrequencyData();for(let n=0;n<t.length;n++)e+=t[n];return e/t.length}},Po=class{constructor(e,t,n){this.binding=e,this.valueSize=n;let i,s,a;switch(t){case"quaternion":i=this._slerp,s=this._slerpAdditive,a=this._setAdditiveIdentityQuaternion,this.buffer=new Float64Array(n*6),this._workIndex=5;break;case"string":case"bool":i=this._select,s=this._select,a=this._setAdditiveIdentityOther,this.buffer=new Array(n*5);break;default:i=this._lerp,s=this._lerpAdditive,a=this._setAdditiveIdentityNumeric,this.buffer=new Float64Array(n*5)}this._mixBufferRegion=i,this._mixBufferRegionAdditive=s,this._setIdentity=a,this._origIndex=3,this._addIndex=4,this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,this.useCount=0,this.referenceCount=0}accumulate(e,t){let n=this.buffer,i=this.valueSize,s=e*i+i,a=this.cumulativeWeight;if(a===0){for(let o=0;o!==i;++o)n[s+o]=n[o];a=t}else{a+=t;let o=t/a;this._mixBufferRegion(n,s,0,o,i)}this.cumulativeWeight=a}accumulateAdditive(e){let t=this.buffer,n=this.valueSize,i=n*this._addIndex;this.cumulativeWeightAdditive===0&&this._setIdentity(),this._mixBufferRegionAdditive(t,i,0,e,n),this.cumulativeWeightAdditive+=e}apply(e){let t=this.valueSize,n=this.buffer,i=e*t+t,s=this.cumulativeWeight,a=this.cumulativeWeightAdditive,o=this.binding;if(this.cumulativeWeight=0,this.cumulativeWeightAdditive=0,s<1){let c=t*this._origIndex;this._mixBufferRegion(n,i,c,1-s,t)}a>0&&this._mixBufferRegionAdditive(n,i,this._addIndex*t,1,t);for(let c=t,l=t+t;c!==l;++c)if(n[c]!==n[c+t]){o.setValue(n,i);break}}saveOriginalState(){let e=this.binding,t=this.buffer,n=this.valueSize,i=n*this._origIndex;e.getValue(t,i);for(let s=n,a=i;s!==a;++s)t[s]=t[i+s%n];this._setIdentity(),this.cumulativeWeight=0,this.cumulativeWeightAdditive=0}restoreOriginalState(){let e=this.valueSize*3;this.binding.setValue(this.buffer,e)}_setAdditiveIdentityNumeric(){let e=this._addIndex*this.valueSize,t=e+this.valueSize;for(let n=e;n<t;n++)this.buffer[n]=0}_setAdditiveIdentityQuaternion(){this._setAdditiveIdentityNumeric(),this.buffer[this._addIndex*this.valueSize+3]=1}_setAdditiveIdentityOther(){let e=this._origIndex*this.valueSize,t=this._addIndex*this.valueSize;for(let n=0;n<this.valueSize;n++)this.buffer[t+n]=this.buffer[e+n]}_select(e,t,n,i,s){if(i>=.5)for(let a=0;a!==s;++a)e[t+a]=e[n+a]}_slerp(e,t,n,i){tt.slerpFlat(e,t,e,t,e,n,i)}_slerpAdditive(e,t,n,i,s){let a=this._workIndex*s;tt.multiplyQuaternionsFlat(e,a,e,t,e,n),tt.slerpFlat(e,t,e,t,e,a,i)}_lerp(e,t,n,i,s){let a=1-i;for(let o=0;o!==s;++o){let c=t+o;e[c]=e[c]*a+e[n+o]*i}}_lerpAdditive(e,t,n,i,s){for(let a=0;a!==s;++a){let o=t+a;e[o]=e[o]+e[n+a]*i}}},Jo="\\[\\]\\.:\\/",Qx=new RegExp("["+Jo+"]","g"),jo="[^"+Jo+"]",Kx="[^"+Jo.replace("\\.","")+"]",eg=/((?:WC+[\/:])*)/.source.replace("WC",jo),tg=/(WCOD+)?/.source.replace("WCOD",Kx),ng=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",jo),ig=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",jo),rg=new RegExp("^"+eg+tg+ng+ig+"$"),sg=["material","materials","bones"],Co=class{constructor(e,t,n){let i=n||ke.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,i)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,i=this._bindings[n];i!==void 0&&i.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let i=this._targetGroup.nCachedObjects_,s=n.length;i!==s;++i)n[i].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ke=class r{constructor(e,t,n){this.path=t,this.parsedPath=n||r.parseTrackName(t),this.node=r.findNode(e,this.parsedPath.nodeName)||e,this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new r.Composite(e,t,n):new r(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Qx,"")}static parseTrackName(e){let t=rg.exec(e);if(!t)throw new Error("PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},i=n.nodeName&&n.nodeName.lastIndexOf(".");if(i!==void 0&&i!==-1){let s=n.nodeName.substring(i+1);sg.indexOf(s)!==-1&&(n.nodeName=n.nodeName.substring(0,i),n.objectName=s)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(!t||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(s){for(let a=0;a<s.length;a++){let o=s[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},i=n(e.children);if(i)return i}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.node[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)e[t++]=n[i]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let i=0,s=n.length;i!==s;++i)n[i]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,i=t.propertyName,s=t.propertyIndex;if(e||(e=r.findNode(this.rootNode,t.nodeName)||this.rootNode,this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){console.error("THREE.PropertyBinding: Trying to update node for track: "+this.path+" but it wasn't found.");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===l){l=u;break}break;default:if(e[n]===void 0){console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let a=e[i];if(a===void 0){let l=t.nodeName;console.error("THREE.PropertyBinding: Trying to update property for track: "+l+"."+i+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.needsUpdate!==void 0?o=this.Versioning.NeedsUpdate:e.matrixWorldNeedsUpdate!==void 0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(s!==void 0){if(i==="morphTargetInfluences"){if(!e.geometry){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(e.geometry.isBufferGeometry){if(!e.geometry.morphAttributes){console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[s]!==void 0&&(s=e.morphTargetDictionary[s])}else{console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences on THREE.Geometry. Use THREE.BufferGeometry instead.",this);return}}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=s}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=i;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ke.Composite=Co;ke.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ke.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ke.prototype.GetterByBindingType=[ke.prototype._getValue_direct,ke.prototype._getValue_array,ke.prototype._getValue_arrayElement,ke.prototype._getValue_toArray];ke.prototype.SetterByBindingTypeAndVersioning=[[ke.prototype._setValue_direct,ke.prototype._setValue_direct_setNeedsUpdate,ke.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ke.prototype._setValue_array,ke.prototype._setValue_array_setNeedsUpdate,ke.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ke.prototype._setValue_arrayElement,ke.prototype._setValue_arrayElement_setNeedsUpdate,ke.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ke.prototype._setValue_fromArray,ke.prototype._setValue_fromArray_setNeedsUpdate,ke.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];Ro=class{constructor(){this.uuid=Ct(),this._objects=Array.prototype.slice.call(arguments),this.nCachedObjects_=0;let e={};this._indicesByUUID=e;for(let n=0,i=arguments.length;n!==i;++n)e[arguments[n].uuid]=n;this._paths=[],this._parsedPaths=[],this._bindings=[],this._bindingsIndicesByPath={};let t=this;this.stats={objects:{get total(){return t._objects.length},get inUse(){return this.total-t.nCachedObjects_}},get bindingsPerObject(){return t._bindings.length}}}add(){let e=this._objects,t=this._indicesByUUID,n=this._paths,i=this._parsedPaths,s=this._bindings,a=s.length,o,c=e.length,l=this.nCachedObjects_;for(let u=0,h=arguments.length;u!==h;++u){let d=arguments[u],f=d.uuid,p=t[f];if(p===void 0){p=c++,t[f]=p,e.push(d);for(let g=0,v=a;g!==v;++g)s[g].push(new ke(d,n[g],i[g]))}else if(p<l){o=e[p];let g=--l,v=e[g];t[v.uuid]=p,e[p]=v,t[f]=g,e[g]=d;for(let x=0,m=a;x!==m;++x){let b=s[x],_=b[g],w=b[p];b[p]=_,w===void 0&&(w=new ke(d,n[x],i[x])),b[g]=w}}else e[p]!==o&&console.error("THREE.AnimationObjectGroup: Different objects with the same UUID detected. Clean the caches or recreate your infrastructure when reloading scenes.")}this.nCachedObjects_=l}remove(){let e=this._objects,t=this._indicesByUUID,n=this._bindings,i=n.length,s=this.nCachedObjects_;for(let a=0,o=arguments.length;a!==o;++a){let c=arguments[a],l=c.uuid,u=t[l];if(u!==void 0&&u>=s){let h=s++,d=e[h];t[d.uuid]=u,e[u]=d,t[l]=h,e[h]=c;for(let f=0,p=i;f!==p;++f){let g=n[f],v=g[h],x=g[u];g[u]=v,g[h]=x}}}this.nCachedObjects_=s}uncache(){let e=this._objects,t=this._indicesByUUID,n=this._bindings,i=n.length,s=this.nCachedObjects_,a=e.length;for(let o=0,c=arguments.length;o!==c;++o){let l=arguments[o],u=l.uuid,h=t[u];if(h!==void 0)if(delete t[u],h<s){let d=--s,f=e[d],p=--a,g=e[p];t[f.uuid]=h,e[h]=f,t[g.uuid]=d,e[d]=g,e.pop();for(let v=0,x=i;v!==x;++v){let m=n[v],b=m[d],_=m[p];m[h]=b,m[d]=_,m.pop()}}else{let d=--a,f=e[d];d>0&&(t[f.uuid]=h),e[h]=f,e.pop();for(let p=0,g=i;p!==g;++p){let v=n[p];v[h]=v[d],v.pop()}}}this.nCachedObjects_=s}subscribe_(e,t){let n=this._bindingsIndicesByPath,i=n[e],s=this._bindings;if(i!==void 0)return s[i];let a=this._paths,o=this._parsedPaths,c=this._objects,l=c.length,u=this.nCachedObjects_,h=new Array(l);i=s.length,n[e]=i,a.push(e),o.push(t),s.push(h);for(let d=u,f=c.length;d!==f;++d){let p=c[d];h[d]=new ke(p,e,t)}return h}unsubscribe_(e){let t=this._bindingsIndicesByPath,n=t[e];if(n!==void 0){let i=this._paths,s=this._parsedPaths,a=this._bindings,o=a.length-1,c=a[o],l=e[o];t[l]=n,a[n]=c,a.pop(),s[n]=s[o],s.pop(),i[n]=i[o],i.pop()}}};Ro.prototype.isAnimationObjectGroup=!0;Io=class{constructor(e,t,n=null,i=t.blendMode){this._mixer=e,this._clip=t,this._localRoot=n,this.blendMode=i;let s=t.tracks,a=s.length,o=new Array(a),c={endingStart:Zn,endingEnd:Zn};for(let l=0;l!==a;++l){let u=s[l].createInterpolant(null);o[l]=u,u.settings=c}this._interpolantSettings=c,this._interpolants=o,this._propertyBindings=new Array(a),this._cacheIndex=null,this._byClipCacheIndex=null,this._timeScaleInterpolant=null,this._weightInterpolant=null,this.loop=Nf,this._loopCount=-1,this._startTime=null,this.time=0,this.timeScale=1,this._effectiveTimeScale=1,this.weight=1,this._effectiveWeight=1,this.repetitions=1/0,this.paused=!1,this.enabled=!0,this.clampWhenFinished=!1,this.zeroSlopeAtStart=!0,this.zeroSlopeAtEnd=!0}play(){return this._mixer._activateAction(this),this}stop(){return this._mixer._deactivateAction(this),this.reset()}reset(){return this.paused=!1,this.enabled=!0,this.time=0,this._loopCount=-1,this._startTime=null,this.stopFading().stopWarping()}isRunning(){return this.enabled&&!this.paused&&this.timeScale!==0&&this._startTime===null&&this._mixer._isActiveAction(this)}isScheduled(){return this._mixer._isActiveAction(this)}startAt(e){return this._startTime=e,this}setLoop(e,t){return this.loop=e,this.repetitions=t,this}setEffectiveWeight(e){return this.weight=e,this._effectiveWeight=this.enabled?e:0,this.stopFading()}getEffectiveWeight(){return this._effectiveWeight}fadeIn(e){return this._scheduleFading(e,0,1)}fadeOut(e){return this._scheduleFading(e,1,0)}crossFadeFrom(e,t,n){if(e.fadeOut(t),this.fadeIn(t),n){let i=this._clip.duration,s=e._clip.duration,a=s/i,o=i/s;e.warp(1,a,t),this.warp(o,1,t)}return this}crossFadeTo(e,t,n){return e.crossFadeFrom(this,t,n)}stopFading(){let e=this._weightInterpolant;return e!==null&&(this._weightInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}setEffectiveTimeScale(e){return this.timeScale=e,this._effectiveTimeScale=this.paused?0:e,this.stopWarping()}getEffectiveTimeScale(){return this._effectiveTimeScale}setDuration(e){return this.timeScale=this._clip.duration/e,this.stopWarping()}syncWith(e){return this.time=e.time,this.timeScale=e.timeScale,this.stopWarping()}halt(e){return this.warp(this._effectiveTimeScale,0,e)}warp(e,t,n){let i=this._mixer,s=i.time,a=this.timeScale,o=this._timeScaleInterpolant;o===null&&(o=i._lendControlInterpolant(),this._timeScaleInterpolant=o);let c=o.parameterPositions,l=o.sampleValues;return c[0]=s,c[1]=s+n,l[0]=e/a,l[1]=t/a,this}stopWarping(){let e=this._timeScaleInterpolant;return e!==null&&(this._timeScaleInterpolant=null,this._mixer._takeBackControlInterpolant(e)),this}getMixer(){return this._mixer}getClip(){return this._clip}getRoot(){return this._localRoot||this._mixer._root}_update(e,t,n,i){if(!this.enabled){this._updateWeight(e);return}let s=this._startTime;if(s!==null){let c=(e-s)*n;if(c<0||n===0)return;this._startTime=null,t=n*c}t*=this._updateTimeScale(e);let a=this._updateTime(t),o=this._updateWeight(e);if(o>0){let c=this._interpolants,l=this._propertyBindings;switch(this.blendMode){case nu:for(let u=0,h=c.length;u!==h;++u)c[u].evaluate(a),l[u].accumulateAdditive(o);break;case Yo:default:for(let u=0,h=c.length;u!==h;++u)c[u].evaluate(a),l[u].accumulate(i,o)}}}_updateWeight(e){let t=0;if(this.enabled){t=this.weight;let n=this._weightInterpolant;if(n!==null){let i=n.evaluate(e)[0];t*=i,e>n.parameterPositions[1]&&(this.stopFading(),i===0&&(this.enabled=!1))}}return this._effectiveWeight=t,t}_updateTimeScale(e){let t=0;if(!this.paused){t=this.timeScale;let n=this._timeScaleInterpolant;if(n!==null){let i=n.evaluate(e)[0];t*=i,e>n.parameterPositions[1]&&(this.stopWarping(),t===0?this.paused=!0:this.timeScale=t)}}return this._effectiveTimeScale=t,t}_updateTime(e){let t=this._clip.duration,n=this.loop,i=this.time+e,s=this._loopCount,a=n===Uf;if(e===0)return s===-1?i:a&&(s&1)===1?t-i:i;if(n===kf){s===-1&&(this._loopCount=0,this._setEndings(!0,!0,!1));e:{if(i>=t)i=t;else if(i<0)i=0;else{this.time=i;break e}this.clampWhenFinished?this.paused=!0:this.enabled=!1,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:e<0?-1:1})}}else{if(s===-1&&(e>=0?(s=0,this._setEndings(!0,this.repetitions===0,a)):this._setEndings(this.repetitions===0,!0,a)),i>=t||i<0){let o=Math.floor(i/t);i-=t*o,s+=Math.abs(o);let c=this.repetitions-s;if(c<=0)this.clampWhenFinished?this.paused=!0:this.enabled=!1,i=e>0?t:0,this.time=i,this._mixer.dispatchEvent({type:"finished",action:this,direction:e>0?1:-1});else{if(c===1){let l=e<0;this._setEndings(l,!l,a)}else this._setEndings(!1,!1,a);this._loopCount=s,this.time=i,this._mixer.dispatchEvent({type:"loop",action:this,loopDelta:o})}}else this.time=i;if(a&&(s&1)===1)return t-i}return i}_setEndings(e,t,n){let i=this._interpolantSettings;n?(i.endingStart=Jn,i.endingEnd=Jn):(e?i.endingStart=this.zeroSlopeAtStart?Jn:Zn:i.endingStart=jr,t?i.endingEnd=this.zeroSlopeAtEnd?Jn:Zn:i.endingEnd=jr)}_scheduleFading(e,t,n){let i=this._mixer,s=i.time,a=this._weightInterpolant;a===null&&(a=i._lendControlInterpolant(),this._weightInterpolant=a);let o=a.parameterPositions,c=a.sampleValues;return o[0]=s,c[0]=t,o[1]=s+e,c[1]=n,this}},Do=class extends Jt{constructor(e){super(),this._root=e,this._initMemoryManager(),this._accuIndex=0,this.time=0,this.timeScale=1}_bindAction(e,t){let n=e._localRoot||this._root,i=e._clip.tracks,s=i.length,a=e._propertyBindings,o=e._interpolants,c=n.uuid,l=this._bindingsByRootAndName,u=l[c];u===void 0&&(u={},l[c]=u);for(let h=0;h!==s;++h){let d=i[h],f=d.name,p=u[f];if(p!==void 0)a[h]=p;else{if(p=a[h],p!==void 0){p._cacheIndex===null&&(++p.referenceCount,this._addInactiveBinding(p,c,f));continue}let g=t&&t._propertyBindings[h].binding.parsedPath;p=new Po(ke.create(n,f,g),d.ValueTypeName,d.getValueSize()),++p.referenceCount,this._addInactiveBinding(p,c,f),a[h]=p}o[h].resultBuffer=p.buffer}}_activateAction(e){if(!this._isActiveAction(e)){if(e._cacheIndex===null){let n=(e._localRoot||this._root).uuid,i=e._clip.uuid,s=this._actionsByClip[i];this._bindAction(e,s&&s.knownActions[0]),this._addInactiveAction(e,i,n)}let t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){let s=t[n];s.useCount++===0&&(this._lendBinding(s),s.saveOriginalState())}this._lendAction(e)}}_deactivateAction(e){if(this._isActiveAction(e)){let t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){let s=t[n];--s.useCount===0&&(s.restoreOriginalState(),this._takeBackBinding(s))}this._takeBackAction(e)}}_initMemoryManager(){this._actions=[],this._nActiveActions=0,this._actionsByClip={},this._bindings=[],this._nActiveBindings=0,this._bindingsByRootAndName={},this._controlInterpolants=[],this._nActiveControlInterpolants=0;let e=this;this.stats={actions:{get total(){return e._actions.length},get inUse(){return e._nActiveActions}},bindings:{get total(){return e._bindings.length},get inUse(){return e._nActiveBindings}},controlInterpolants:{get total(){return e._controlInterpolants.length},get inUse(){return e._nActiveControlInterpolants}}}}_isActiveAction(e){let t=e._cacheIndex;return t!==null&&t<this._nActiveActions}_addInactiveAction(e,t,n){let i=this._actions,s=this._actionsByClip,a=s[t];if(a===void 0)a={knownActions:[e],actionByRoot:{}},e._byClipCacheIndex=0,s[t]=a;else{let o=a.knownActions;e._byClipCacheIndex=o.length,o.push(e)}e._cacheIndex=i.length,i.push(e),a.actionByRoot[n]=e}_removeInactiveAction(e){let t=this._actions,n=t[t.length-1],i=e._cacheIndex;n._cacheIndex=i,t[i]=n,t.pop(),e._cacheIndex=null;let s=e._clip.uuid,a=this._actionsByClip,o=a[s],c=o.knownActions,l=c[c.length-1],u=e._byClipCacheIndex;l._byClipCacheIndex=u,c[u]=l,c.pop(),e._byClipCacheIndex=null;let h=o.actionByRoot,d=(e._localRoot||this._root).uuid;delete h[d],c.length===0&&delete a[s],this._removeInactiveBindingsForAction(e)}_removeInactiveBindingsForAction(e){let t=e._propertyBindings;for(let n=0,i=t.length;n!==i;++n){let s=t[n];--s.referenceCount===0&&this._removeInactiveBinding(s)}}_lendAction(e){let t=this._actions,n=e._cacheIndex,i=this._nActiveActions++,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_takeBackAction(e){let t=this._actions,n=e._cacheIndex,i=--this._nActiveActions,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_addInactiveBinding(e,t,n){let i=this._bindingsByRootAndName,s=this._bindings,a=i[t];a===void 0&&(a={},i[t]=a),a[n]=e,e._cacheIndex=s.length,s.push(e)}_removeInactiveBinding(e){let t=this._bindings,n=e.binding,i=n.rootNode.uuid,s=n.path,a=this._bindingsByRootAndName,o=a[i],c=t[t.length-1],l=e._cacheIndex;c._cacheIndex=l,t[l]=c,t.pop(),delete o[s],Object.keys(o).length===0&&delete a[i]}_lendBinding(e){let t=this._bindings,n=e._cacheIndex,i=this._nActiveBindings++,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_takeBackBinding(e){let t=this._bindings,n=e._cacheIndex,i=--this._nActiveBindings,s=t[i];e._cacheIndex=i,t[i]=e,s._cacheIndex=n,t[n]=s}_lendControlInterpolant(){let e=this._controlInterpolants,t=this._nActiveControlInterpolants++,n=e[t];return n===void 0&&(n=new us(new Float32Array(2),new Float32Array(2),1,this._controlInterpolantsResultBuffer),n.__cacheIndex=t,e[t]=n),n}_takeBackControlInterpolant(e){let t=this._controlInterpolants,n=e.__cacheIndex,i=--this._nActiveControlInterpolants,s=t[i];e.__cacheIndex=i,t[i]=e,s.__cacheIndex=n,t[n]=s}clipAction(e,t,n){let i=t||this._root,s=i.uuid,a=typeof e=="string"?ds.findByName(i,e):e,o=a!==null?a.uuid:e,c=this._actionsByClip[o],l=null;if(n===void 0&&(a!==null?n=a.blendMode:n=Yo),c!==void 0){let h=c.actionByRoot[s];if(h!==void 0&&h.blendMode===n)return h;l=c.knownActions[0],a===null&&(a=l._clip)}if(a===null)return null;let u=new Io(this,a,t,n);return this._bindAction(u,l),this._addInactiveAction(u,o,s),u}existingAction(e,t){let n=t||this._root,i=n.uuid,s=typeof e=="string"?ds.findByName(n,e):e,a=s?s.uuid:e,o=this._actionsByClip[a];return o!==void 0&&o.actionByRoot[i]||null}stopAllAction(){let e=this._actions,t=this._nActiveActions;for(let n=t-1;n>=0;--n)e[n].stop();return this}update(e){e*=this.timeScale;let t=this._actions,n=this._nActiveActions,i=this.time+=e,s=Math.sign(e),a=this._accuIndex^=1;for(let l=0;l!==n;++l)t[l]._update(i,e,s,a);let o=this._bindings,c=this._nActiveBindings;for(let l=0;l!==c;++l)o[l].apply(a);return this}setTime(e){this.time=0;for(let t=0;t<this._actions.length;t++)this._actions[t].time=0;return this.update(e)}getRoot(){return this._root}uncacheClip(e){let t=this._actions,n=e.uuid,i=this._actionsByClip,s=i[n];if(s!==void 0){let a=s.knownActions;for(let o=0,c=a.length;o!==c;++o){let l=a[o];this._deactivateAction(l);let u=l._cacheIndex,h=t[t.length-1];l._cacheIndex=null,l._byClipCacheIndex=null,h._cacheIndex=u,t[u]=h,t.pop(),this._removeInactiveBindingsForAction(l)}delete i[n]}}uncacheRoot(e){let t=e.uuid,n=this._actionsByClip;for(let a in n){let o=n[a].actionByRoot,c=o[t];c!==void 0&&(this._deactivateAction(c),this._removeInactiveAction(c))}let i=this._bindingsByRootAndName,s=i[t];if(s!==void 0)for(let a in s){let o=s[a];o.restoreOriginalState(),this._removeInactiveBinding(o)}}uncacheAction(e,t){let n=this.existingAction(e,t);n!==null&&(this._deactivateAction(n),this._removeInactiveAction(n))}};Do.prototype._controlInterpolantsResultBuffer=new Float32Array(1);zo=class r{constructor(e){typeof e=="string"&&(console.warn("THREE.Uniform: Type parameter is no longer needed."),e=arguments[1]),this.value=e}clone(){return new r(this.value.clone===void 0?this.value:this.value.clone())}},Fo=class extends En{constructor(e,t,n=1){super(e,t),this.meshPerAttribute=n||1}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){let t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){let t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}};Fo.prototype.isInstancedInterleavedBuffer=!0;Bo=class{constructor(e,t,n,i,s){this.buffer=e,this.type=t,this.itemSize=n,this.elementSize=i,this.count=s,this.version=0}set needsUpdate(e){e===!0&&this.version++}setBuffer(e){return this.buffer=e,this}setType(e,t){return this.type=e,this.elementSize=t,this}setItemSize(e){return this.itemSize=e,this}setCount(e){return this.count=e,this}};Bo.prototype.isGLBufferAttribute=!0;Zl=new K,Ln=class{constructor(e=new K(1/0,1/0),t=new K(-1/0,-1/0)){this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Zl.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=1/0,this.max.x=this.max.y=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y}getCenter(e){return e===void 0&&(console.warn("THREE.Box2: .getCenter() target is now required"),e=new K),this.isEmpty()?e.set(0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return e===void 0&&(console.warn("THREE.Box2: .getSize() target is now required"),e=new K),this.isEmpty()?e.set(0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}containsPoint(e){return!(e.x<this.min.x||e.x>this.max.x||e.y<this.min.y||e.y>this.max.y)}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y}getParameter(e,t){return t===void 0&&(console.warn("THREE.Box2: .getParameter() target is now required"),t=new K),t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y))}intersectsBox(e){return!(e.max.x<this.min.x||e.min.x>this.max.x||e.max.y<this.min.y||e.min.y>this.max.y)}clampPoint(e,t){return t===void 0&&(console.warn("THREE.Box2: .clampPoint() target is now required"),t=new K),t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return Zl.copy(e).clamp(this.min,this.max).sub(e).length()}intersect(e){return this.min.max(e.min),this.max.min(e.max),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}};Ln.prototype.isBox2=!0;Jl=new E,Vr=new E,ko=class{constructor(e=new E,t=new E){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e===void 0&&(console.warn("THREE.Line3: .getCenter() target is now required"),e=new E),e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e===void 0&&(console.warn("THREE.Line3: .delta() target is now required"),e=new E),e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return t===void 0&&(console.warn("THREE.Line3: .at() target is now required"),t=new E),this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){Jl.subVectors(e,this.start),Vr.subVectors(this.end,this.start);let n=Vr.dot(Vr),s=Vr.dot(Jl)/n;return t&&(s=dt(s,0,1)),s}closestPointToPoint(e,t,n){let i=this.closestPointToPointParameter(e,t);return n===void 0&&(console.warn("THREE.Line3: .closestPointToPoint() target is now required"),n=new E),this.delta(n).multiplyScalar(i).add(this.start)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}},No=class extends Fe{constructor(e){super(),this.material=e,this.render=function(){},this.hasPositions=!1,this.hasNormals=!1,this.hasColors=!1,this.hasUvs=!1,this.positionArray=null,this.normalArray=null,this.colorArray=null,this.uvArray=null,this.count=0}};No.prototype.isImmediateRenderObject=!0;an=new E,Wr=new me,Ma=new me,Uo=class extends Zi{constructor(e){let t=Mu(e),n=new Ie,i=[],s=[],a=new he(0,0,1),o=new he(0,1,0);for(let l=0;l<t.length;l++){let u=t[l];u.parent&&u.parent.isBone&&(i.push(0,0,0),i.push(0,0,0),s.push(a.r,a.g,a.b),s.push(o.r,o.g,o.b))}n.setAttribute("position",new $e(i,3)),n.setAttribute("color",new $e(s,3));let c=new Tn({vertexColors:!0,depthTest:!1,depthWrite:!1,toneMapped:!1,transparent:!0});super(n,c),this.type="SkeletonHelper",this.isSkeletonHelper=!0,this.root=e,this.bones=t,this.matrix=e.matrixWorld,this.matrixAutoUpdate=!1}updateMatrixWorld(e){let t=this.bones,n=this.geometry,i=n.getAttribute("position");Ma.copy(this.root.matrixWorld).invert();for(let s=0,a=0;s<t.length;s++){let o=t[s];o.parent&&o.parent.isBone&&(Wr.multiplyMatrices(Ma,o.matrixWorld),an.setFromMatrixPosition(Wr),i.setXYZ(a,an.x,an.y,an.z),Wr.multiplyMatrices(Ma,o.parent.matrixWorld),an.setFromMatrixPosition(Wr),i.setXYZ(a+1,an.x,an.y,an.z),a+=2)}n.getAttribute("position").needsUpdate=!0,super.updateMatrixWorld(e)}};Oo=class extends Zi{constructor(e=10,t=10,n=4473924,i=8947848){n=new he(n),i=new he(i);let s=t/2,a=e/t,o=e/2,c=[],l=[];for(let d=0,f=0,p=-o;d<=t;d++,p+=a){c.push(-o,0,p,o,0,p),c.push(p,0,-o,p,0,o);let g=d===s?n:i;g.toArray(l,f),f+=3,g.toArray(l,f),f+=3,g.toArray(l,f),f+=3,g.toArray(l,f),f+=3}let u=new Ie;u.setAttribute("position",new $e(c,3)),u.setAttribute("color",new $e(l,3));let h=new Tn({vertexColors:!0,toneMapped:!1});super(u,h),this.type="GridHelper"}},ag=new Float32Array(1),vv=new Int32Array(ag.buffer),Xr=4,Oi=8,yv=Math.pow(2,Oi),Su=[.125,.215,.35,.446,.526,.582],og=Oi-Xr+1+Su.length,bv={[di]:0,[$o]:1,[ru]:2,[su]:3,[au]:4,[ou]:5,[iu]:6},cg=new Vi({side:Qe,depthWrite:!1,depthTest:!1}),_v=new lt(new Wi,cg),{_lodPlanes:wv,_sizeLods:Mv,_sigmas:Sv}=lg(),wn=(1+Math.sqrt(5))/2,Yn=1/wn,Ev=[new E(1,1,1),new E(-1,1,1),new E(1,1,-1),new E(-1,1,-1),new E(0,wn,Yn),new E(0,wn,-Yn),new E(Yn,0,wn),new E(-Yn,0,wn),new E(wn,Yn,0),new E(-wn,Yn,0)];pt.create=function(r,e){return console.log("THREE.Curve.create() has been deprecated"),r.prototype=Object.create(pt.prototype),r.prototype.constructor=r,r.prototype.getPoint=e,r};ui.prototype.fromPoints=function(r){return console.warn("THREE.Path: .fromPoints() has been renamed to .setFromPoints()."),this.setFromPoints(r)};Oo.prototype.setColors=function(){console.error("THREE.GridHelper: setColors() has been deprecated, pass them in the constructor instead.")};Uo.prototype.update=function(){console.error("THREE.SkeletonHelper: update() no longer needs to be called.")};Bt.prototype.extractUrlBase=function(r){return console.warn("THREE.Loader: .extractUrlBase() has been deprecated. Use THREE.LoaderUtils.extractUrlBase() instead."),vo.extractUrlBase(r)};Bt.Handlers={add:function(){console.error("THREE.Loader: Handlers.add() has been removed. Use LoadingManager.addHandler() instead.")},get:function(){console.error("THREE.Loader: Handlers.get() has been removed. Use LoadingManager.getHandler() instead.")}};Ln.prototype.center=function(r){return console.warn("THREE.Box2: .center() has been renamed to .getCenter()."),this.getCenter(r)};Ln.prototype.empty=function(){return console.warn("THREE.Box2: .empty() has been renamed to .isEmpty()."),this.isEmpty()};Ln.prototype.isIntersectionBox=function(r){return console.warn("THREE.Box2: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};Ln.prototype.size=function(r){return console.warn("THREE.Box2: .size() has been renamed to .getSize()."),this.getSize(r)};ft.prototype.center=function(r){return console.warn("THREE.Box3: .center() has been renamed to .getCenter()."),this.getCenter(r)};ft.prototype.empty=function(){return console.warn("THREE.Box3: .empty() has been renamed to .isEmpty()."),this.isEmpty()};ft.prototype.isIntersectionBox=function(r){return console.warn("THREE.Box3: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};ft.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Box3: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};ft.prototype.size=function(r){return console.warn("THREE.Box3: .size() has been renamed to .getSize()."),this.getSize(r)};hn.prototype.empty=function(){return console.warn("THREE.Sphere: .empty() has been renamed to .isEmpty()."),this.isEmpty()};yt.prototype.setFromMatrix=function(r){return console.warn("THREE.Frustum: .setFromMatrix() has been renamed to .setFromProjectionMatrix()."),this.setFromProjectionMatrix(r)};ko.prototype.center=function(r){return console.warn("THREE.Line3: .center() has been renamed to .getCenter()."),this.getCenter(r)};Je.prototype.flattenToArrayOffset=function(r,e){return console.warn("THREE.Matrix3: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,e)};Je.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix3: .multiplyVector3() has been removed. Use vector.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};Je.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix3: .multiplyVector3Array() has been removed.")};Je.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix3: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix3( matrix ) instead."),r.applyMatrix3(this)};Je.prototype.applyToVector3Array=function(){console.error("THREE.Matrix3: .applyToVector3Array() has been removed.")};Je.prototype.getInverse=function(r){return console.warn("THREE.Matrix3: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};me.prototype.extractPosition=function(r){return console.warn("THREE.Matrix4: .extractPosition() has been renamed to .copyPosition()."),this.copyPosition(r)};me.prototype.flattenToArrayOffset=function(r,e){return console.warn("THREE.Matrix4: .flattenToArrayOffset() has been deprecated. Use .toArray() instead."),this.toArray(r,e)};me.prototype.getPosition=function(){return console.warn("THREE.Matrix4: .getPosition() has been removed. Use Vector3.setFromMatrixPosition( matrix ) instead."),new E().setFromMatrixColumn(this,3)};me.prototype.setRotationFromQuaternion=function(r){return console.warn("THREE.Matrix4: .setRotationFromQuaternion() has been renamed to .makeRotationFromQuaternion()."),this.makeRotationFromQuaternion(r)};me.prototype.multiplyToArray=function(){console.warn("THREE.Matrix4: .multiplyToArray() has been removed.")};me.prototype.multiplyVector3=function(r){return console.warn("THREE.Matrix4: .multiplyVector3() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};me.prototype.multiplyVector4=function(r){return console.warn("THREE.Matrix4: .multiplyVector4() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};me.prototype.multiplyVector3Array=function(){console.error("THREE.Matrix4: .multiplyVector3Array() has been removed.")};me.prototype.rotateAxis=function(r){console.warn("THREE.Matrix4: .rotateAxis() has been removed. Use Vector3.transformDirection( matrix ) instead."),r.transformDirection(this)};me.prototype.crossVector=function(r){return console.warn("THREE.Matrix4: .crossVector() has been removed. Use vector.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};me.prototype.translate=function(){console.error("THREE.Matrix4: .translate() has been removed.")};me.prototype.rotateX=function(){console.error("THREE.Matrix4: .rotateX() has been removed.")};me.prototype.rotateY=function(){console.error("THREE.Matrix4: .rotateY() has been removed.")};me.prototype.rotateZ=function(){console.error("THREE.Matrix4: .rotateZ() has been removed.")};me.prototype.rotateByAxis=function(){console.error("THREE.Matrix4: .rotateByAxis() has been removed.")};me.prototype.applyToBufferAttribute=function(r){return console.warn("THREE.Matrix4: .applyToBufferAttribute() has been removed. Use attribute.applyMatrix4( matrix ) instead."),r.applyMatrix4(this)};me.prototype.applyToVector3Array=function(){console.error("THREE.Matrix4: .applyToVector3Array() has been removed.")};me.prototype.makeFrustum=function(r,e,t,n,i,s){return console.warn("THREE.Matrix4: .makeFrustum() has been removed. Use .makePerspective( left, right, top, bottom, near, far ) instead."),this.makePerspective(r,e,n,t,i,s)};me.prototype.getInverse=function(r){return console.warn("THREE.Matrix4: .getInverse() has been removed. Use matrixInv.copy( matrix ).invert(); instead."),this.copy(r).invert()};gt.prototype.isIntersectionLine=function(r){return console.warn("THREE.Plane: .isIntersectionLine() has been renamed to .intersectsLine()."),this.intersectsLine(r)};tt.prototype.multiplyVector3=function(r){return console.warn("THREE.Quaternion: .multiplyVector3() has been removed. Use is now vector.applyQuaternion( quaternion ) instead."),r.applyQuaternion(this)};tt.prototype.inverse=function(){return console.warn("THREE.Quaternion: .inverse() has been renamed to invert()."),this.invert()};dn.prototype.isIntersectionBox=function(r){return console.warn("THREE.Ray: .isIntersectionBox() has been renamed to .intersectsBox()."),this.intersectsBox(r)};dn.prototype.isIntersectionPlane=function(r){return console.warn("THREE.Ray: .isIntersectionPlane() has been renamed to .intersectsPlane()."),this.intersectsPlane(r)};dn.prototype.isIntersectionSphere=function(r){return console.warn("THREE.Ray: .isIntersectionSphere() has been renamed to .intersectsSphere()."),this.intersectsSphere(r)};it.prototype.area=function(){return console.warn("THREE.Triangle: .area() has been renamed to .getArea()."),this.getArea()};it.prototype.barycoordFromPoint=function(r,e){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),this.getBarycoord(r,e)};it.prototype.midpoint=function(r){return console.warn("THREE.Triangle: .midpoint() has been renamed to .getMidpoint()."),this.getMidpoint(r)};it.prototypenormal=function(r){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),this.getNormal(r)};it.prototype.plane=function(r){return console.warn("THREE.Triangle: .plane() has been renamed to .getPlane()."),this.getPlane(r)};it.barycoordFromPoint=function(r,e,t,n,i){return console.warn("THREE.Triangle: .barycoordFromPoint() has been renamed to .getBarycoord()."),it.getBarycoord(r,e,t,n,i)};it.normal=function(r,e,t,n){return console.warn("THREE.Triangle: .normal() has been renamed to .getNormal()."),it.getNormal(r,e,t,n)};ln.prototype.extractAllPoints=function(r){return console.warn("THREE.Shape: .extractAllPoints() has been removed. Use .extractPoints() instead."),this.extractPoints(r)};ln.prototype.extrude=function(r){return console.warn("THREE.Shape: .extrude() has been removed. Use ExtrudeGeometry() instead."),new ii(this,r)};ln.prototype.makeGeometry=function(r){return console.warn("THREE.Shape: .makeGeometry() has been removed. Use ShapeGeometry() instead."),new $a(this,r)};K.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector2: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};K.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector2: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};K.prototype.lengthManhattan=function(){return console.warn("THREE.Vector2: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};E.prototype.setEulerFromRotationMatrix=function(){console.error("THREE.Vector3: .setEulerFromRotationMatrix() has been removed. Use Euler.setFromRotationMatrix() instead.")};E.prototype.setEulerFromQuaternion=function(){console.error("THREE.Vector3: .setEulerFromQuaternion() has been removed. Use Euler.setFromQuaternion() instead.")};E.prototype.getPositionFromMatrix=function(r){return console.warn("THREE.Vector3: .getPositionFromMatrix() has been renamed to .setFromMatrixPosition()."),this.setFromMatrixPosition(r)};E.prototype.getScaleFromMatrix=function(r){return console.warn("THREE.Vector3: .getScaleFromMatrix() has been renamed to .setFromMatrixScale()."),this.setFromMatrixScale(r)};E.prototype.getColumnFromMatrix=function(r,e){return console.warn("THREE.Vector3: .getColumnFromMatrix() has been renamed to .setFromMatrixColumn()."),this.setFromMatrixColumn(e,r)};E.prototype.applyProjection=function(r){return console.warn("THREE.Vector3: .applyProjection() has been removed. Use .applyMatrix4( m ) instead."),this.applyMatrix4(r)};E.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector3: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};E.prototype.distanceToManhattan=function(r){return console.warn("THREE.Vector3: .distanceToManhattan() has been renamed to .manhattanDistanceTo()."),this.manhattanDistanceTo(r)};E.prototype.lengthManhattan=function(){return console.warn("THREE.Vector3: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};Re.prototype.fromAttribute=function(r,e,t){return console.warn("THREE.Vector4: .fromAttribute() has been renamed to .fromBufferAttribute()."),this.fromBufferAttribute(r,e,t)};Re.prototype.lengthManhattan=function(){return console.warn("THREE.Vector4: .lengthManhattan() has been renamed to .manhattanLength()."),this.manhattanLength()};Fe.prototype.getChildByName=function(r){return console.warn("THREE.Object3D: .getChildByName() has been renamed to .getObjectByName()."),this.getObjectByName(r)};Fe.prototype.renderDepth=function(){console.warn("THREE.Object3D: .renderDepth has been removed. Use .renderOrder, instead.")};Fe.prototype.translate=function(r,e){return console.warn("THREE.Object3D: .translate() has been removed. Use .translateOnAxis( axis, distance ) instead."),this.translateOnAxis(e,r)};Fe.prototype.getWorldRotation=function(){console.error("THREE.Object3D: .getWorldRotation() has been removed. Use THREE.Object3D.getWorldQuaternion( target ) instead.")};Fe.prototype.applyMatrix=function(r){return console.warn("THREE.Object3D: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties(Fe.prototype,{eulerOrder:{get:function(){return console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order},set:function(r){console.warn("THREE.Object3D: .eulerOrder is now .rotation.order."),this.rotation.order=r}},useQuaternion:{get:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")},set:function(){console.warn("THREE.Object3D: .useQuaternion has been removed. The library now uses quaternions by default.")}}});lt.prototype.setDrawMode=function(){console.error("THREE.Mesh: .setDrawMode() has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")};Object.defineProperties(lt.prototype,{drawMode:{get:function(){return console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode."),Of},set:function(){console.error("THREE.Mesh: .drawMode has been removed. The renderer now always assumes THREE.TrianglesDrawMode. Transform your geometry via BufferGeometryUtils.toTrianglesDrawMode() if necessary.")}}});ls.prototype.initBones=function(){console.error("THREE.SkinnedMesh: initBones() has been removed.")};He.prototype.setLens=function(r,e){console.warn("THREE.PerspectiveCamera.setLens is deprecated. Use .setFocalLength and .filmGauge for a photographic setup."),e!==void 0&&(this.filmGauge=e),this.setFocalLength(r)};Object.defineProperties(_t.prototype,{onlyShadow:{set:function(){console.warn("THREE.Light: .onlyShadow has been removed.")}},shadowCameraFov:{set:function(r){console.warn("THREE.Light: .shadowCameraFov is now .shadow.camera.fov."),this.shadow.camera.fov=r}},shadowCameraLeft:{set:function(r){console.warn("THREE.Light: .shadowCameraLeft is now .shadow.camera.left."),this.shadow.camera.left=r}},shadowCameraRight:{set:function(r){console.warn("THREE.Light: .shadowCameraRight is now .shadow.camera.right."),this.shadow.camera.right=r}},shadowCameraTop:{set:function(r){console.warn("THREE.Light: .shadowCameraTop is now .shadow.camera.top."),this.shadow.camera.top=r}},shadowCameraBottom:{set:function(r){console.warn("THREE.Light: .shadowCameraBottom is now .shadow.camera.bottom."),this.shadow.camera.bottom=r}},shadowCameraNear:{set:function(r){console.warn("THREE.Light: .shadowCameraNear is now .shadow.camera.near."),this.shadow.camera.near=r}},shadowCameraFar:{set:function(r){console.warn("THREE.Light: .shadowCameraFar is now .shadow.camera.far."),this.shadow.camera.far=r}},shadowCameraVisible:{set:function(){console.warn("THREE.Light: .shadowCameraVisible has been removed. Use new THREE.CameraHelper( light.shadow.camera ) instead.")}},shadowBias:{set:function(r){console.warn("THREE.Light: .shadowBias is now .shadow.bias."),this.shadow.bias=r}},shadowDarkness:{set:function(){console.warn("THREE.Light: .shadowDarkness has been removed.")}},shadowMapWidth:{set:function(r){console.warn("THREE.Light: .shadowMapWidth is now .shadow.mapSize.width."),this.shadow.mapSize.width=r}},shadowMapHeight:{set:function(r){console.warn("THREE.Light: .shadowMapHeight is now .shadow.mapSize.height."),this.shadow.mapSize.height=r}}});Object.defineProperties(Ue.prototype,{length:{get:function(){return console.warn("THREE.BufferAttribute: .length has been deprecated. Use .count instead."),this.array.length}},dynamic:{get:function(){return console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.usage===Qr},set:function(){console.warn("THREE.BufferAttribute: .dynamic has been deprecated. Use .usage instead."),this.setUsage(Qr)}}});Ue.prototype.setDynamic=function(r){return console.warn("THREE.BufferAttribute: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Qr:Hi),this};Ue.prototype.copyIndicesArray=function(){console.error("THREE.BufferAttribute: .copyIndicesArray() has been removed.")},Ue.prototype.setArray=function(){console.error("THREE.BufferAttribute: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};Ie.prototype.addIndex=function(r){console.warn("THREE.BufferGeometry: .addIndex() has been renamed to .setIndex()."),this.setIndex(r)};Ie.prototype.addAttribute=function(r,e){return console.warn("THREE.BufferGeometry: .addAttribute() has been renamed to .setAttribute()."),!(e&&e.isBufferAttribute)&&!(e&&e.isInterleavedBufferAttribute)?(console.warn("THREE.BufferGeometry: .addAttribute() now expects ( name, attribute )."),this.setAttribute(r,new Ue(arguments[1],arguments[2]))):r==="index"?(console.warn("THREE.BufferGeometry.addAttribute: Use .setIndex() for index attribute."),this.setIndex(e),this):this.setAttribute(r,e)};Ie.prototype.addDrawCall=function(r,e,t){t!==void 0&&console.warn("THREE.BufferGeometry: .addDrawCall() no longer supports indexOffset."),console.warn("THREE.BufferGeometry: .addDrawCall() is now .addGroup()."),this.addGroup(r,e)};Ie.prototype.clearDrawCalls=function(){console.warn("THREE.BufferGeometry: .clearDrawCalls() is now .clearGroups()."),this.clearGroups()};Ie.prototype.computeOffsets=function(){console.warn("THREE.BufferGeometry: .computeOffsets() has been removed.")};Ie.prototype.removeAttribute=function(r){return console.warn("THREE.BufferGeometry: .removeAttribute() has been renamed to .deleteAttribute()."),this.deleteAttribute(r)};Ie.prototype.applyMatrix=function(r){return console.warn("THREE.BufferGeometry: .applyMatrix() has been renamed to .applyMatrix4()."),this.applyMatrix4(r)};Object.defineProperties(Ie.prototype,{drawcalls:{get:function(){return console.error("THREE.BufferGeometry: .drawcalls has been renamed to .groups."),this.groups}},offsets:{get:function(){return console.warn("THREE.BufferGeometry: .offsets has been renamed to .groups."),this.groups}}});En.prototype.setDynamic=function(r){return console.warn("THREE.InterleavedBuffer: .setDynamic() has been deprecated. Use .setUsage() instead."),this.setUsage(r===!0?Qr:Hi),this};En.prototype.setArray=function(){console.error("THREE.InterleavedBuffer: .setArray has been removed. Use BufferGeometry .setAttribute to replace/resize attribute buffers")};ii.prototype.getArrays=function(){console.error("THREE.ExtrudeGeometry: .getArrays() has been removed.")};ii.prototype.addShapeList=function(){console.error("THREE.ExtrudeGeometry: .addShapeList() has been removed.")};ii.prototype.addShape=function(){console.error("THREE.ExtrudeGeometry: .addShape() has been removed.")};Sn.prototype.dispose=function(){console.error("THREE.Scene: .dispose() has been removed.")};zo.prototype.onUpdate=function(){return console.warn("THREE.Uniform: .onUpdate() has been removed. Use object.onBeforeRender() instead."),this};Object.defineProperties(Ke.prototype,{wrapAround:{get:function(){console.warn("THREE.Material: .wrapAround has been removed.")},set:function(){console.warn("THREE.Material: .wrapAround has been removed.")}},overdraw:{get:function(){console.warn("THREE.Material: .overdraw has been removed.")},set:function(){console.warn("THREE.Material: .overdraw has been removed.")}},wrapRGB:{get:function(){return console.warn("THREE.Material: .wrapRGB has been removed."),new he}},shading:{get:function(){console.error("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead.")},set:function(r){console.warn("THREE."+this.type+": .shading has been removed. Use the boolean .flatShading instead."),this.flatShading=r===Ql}},stencilMask:{get:function(){return console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask},set:function(r){console.warn("THREE."+this.type+": .stencilMask has been removed. Use .stencilFuncMask instead."),this.stencilFuncMask=r}}});Object.defineProperties(jt.prototype,{derivatives:{get:function(){return console.warn("THREE.ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives},set:function(r){console.warn("THREE. ShaderMaterial: .derivatives has been moved to .extensions.derivatives."),this.extensions.derivatives=r}}});Be.prototype.clearTarget=function(r,e,t,n){console.warn("THREE.WebGLRenderer: .clearTarget() has been deprecated. Use .setRenderTarget() and .clear() instead."),this.setRenderTarget(r),this.clear(e,t,n)};Be.prototype.animate=function(r){console.warn("THREE.WebGLRenderer: .animate() is now .setAnimationLoop()."),this.setAnimationLoop(r)};Be.prototype.getCurrentRenderTarget=function(){return console.warn("THREE.WebGLRenderer: .getCurrentRenderTarget() is now .getRenderTarget()."),this.getRenderTarget()};Be.prototype.getMaxAnisotropy=function(){return console.warn("THREE.WebGLRenderer: .getMaxAnisotropy() is now .capabilities.getMaxAnisotropy()."),this.capabilities.getMaxAnisotropy()};Be.prototype.getPrecision=function(){return console.warn("THREE.WebGLRenderer: .getPrecision() is now .capabilities.precision."),this.capabilities.precision};Be.prototype.resetGLState=function(){return console.warn("THREE.WebGLRenderer: .resetGLState() is now .state.reset()."),this.state.reset()};Be.prototype.supportsFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsFloatTextures() is now .extensions.get( 'OES_texture_float' )."),this.extensions.get("OES_texture_float")};Be.prototype.supportsHalfFloatTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsHalfFloatTextures() is now .extensions.get( 'OES_texture_half_float' )."),this.extensions.get("OES_texture_half_float")};Be.prototype.supportsStandardDerivatives=function(){return console.warn("THREE.WebGLRenderer: .supportsStandardDerivatives() is now .extensions.get( 'OES_standard_derivatives' )."),this.extensions.get("OES_standard_derivatives")};Be.prototype.supportsCompressedTextureS3TC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTextureS3TC() is now .extensions.get( 'WEBGL_compressed_texture_s3tc' )."),this.extensions.get("WEBGL_compressed_texture_s3tc")};Be.prototype.supportsCompressedTexturePVRTC=function(){return console.warn("THREE.WebGLRenderer: .supportsCompressedTexturePVRTC() is now .extensions.get( 'WEBGL_compressed_texture_pvrtc' )."),this.extensions.get("WEBGL_compressed_texture_pvrtc")};Be.prototype.supportsBlendMinMax=function(){return console.warn("THREE.WebGLRenderer: .supportsBlendMinMax() is now .extensions.get( 'EXT_blend_minmax' )."),this.extensions.get("EXT_blend_minmax")};Be.prototype.supportsVertexTextures=function(){return console.warn("THREE.WebGLRenderer: .supportsVertexTextures() is now .capabilities.vertexTextures."),this.capabilities.vertexTextures};Be.prototype.supportsInstancedArrays=function(){return console.warn("THREE.WebGLRenderer: .supportsInstancedArrays() is now .extensions.get( 'ANGLE_instanced_arrays' )."),this.extensions.get("ANGLE_instanced_arrays")};Be.prototype.enableScissorTest=function(r){console.warn("THREE.WebGLRenderer: .enableScissorTest() is now .setScissorTest()."),this.setScissorTest(r)};Be.prototype.initMaterial=function(){console.warn("THREE.WebGLRenderer: .initMaterial() has been removed.")};Be.prototype.addPrePlugin=function(){console.warn("THREE.WebGLRenderer: .addPrePlugin() has been removed.")};Be.prototype.addPostPlugin=function(){console.warn("THREE.WebGLRenderer: .addPostPlugin() has been removed.")};Be.prototype.updateShadowMap=function(){console.warn("THREE.WebGLRenderer: .updateShadowMap() has been removed.")};Be.prototype.setFaceCulling=function(){console.warn("THREE.WebGLRenderer: .setFaceCulling() has been removed.")};Be.prototype.allocTextureUnit=function(){console.warn("THREE.WebGLRenderer: .allocTextureUnit() has been removed.")};Be.prototype.setTexture=function(){console.warn("THREE.WebGLRenderer: .setTexture() has been removed.")};Be.prototype.setTexture2D=function(){console.warn("THREE.WebGLRenderer: .setTexture2D() has been removed.")};Be.prototype.setTextureCube=function(){console.warn("THREE.WebGLRenderer: .setTextureCube() has been removed.")};Be.prototype.getActiveMipMapLevel=function(){return console.warn("THREE.WebGLRenderer: .getActiveMipMapLevel() is now .getActiveMipmapLevel()."),this.getActiveMipmapLevel()};Object.defineProperties(Be.prototype,{shadowMapEnabled:{get:function(){return this.shadowMap.enabled},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapEnabled is now .shadowMap.enabled."),this.shadowMap.enabled=r}},shadowMapType:{get:function(){return this.shadowMap.type},set:function(r){console.warn("THREE.WebGLRenderer: .shadowMapType is now .shadowMap.type."),this.shadowMap.type=r}},shadowMapCullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMapCullFace has been removed. Set Material.shadowSide instead.")}},context:{get:function(){return console.warn("THREE.WebGLRenderer: .context has been removed. Use .getContext() instead."),this.getContext()}},vr:{get:function(){return console.warn("THREE.WebGLRenderer: .vr has been renamed to .xr"),this.xr}},gammaInput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead."),!1},set:function(){console.warn("THREE.WebGLRenderer: .gammaInput has been removed. Set the encoding for textures via Texture.encoding instead.")}},gammaOutput:{get:function(){return console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),!1},set:function(r){console.warn("THREE.WebGLRenderer: .gammaOutput has been removed. Set WebGLRenderer.outputEncoding instead."),this.outputEncoding=r===!0?$o:di}},toneMappingWhitePoint:{get:function(){return console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed."),1},set:function(){console.warn("THREE.WebGLRenderer: .toneMappingWhitePoint has been removed.")}}});Object.defineProperties(vu.prototype,{cullFace:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.cullFace has been removed. Set Material.shadowSide instead.")}},renderReverseSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderReverseSided has been removed. Set Material.shadowSide instead.")}},renderSingleSided:{get:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")},set:function(){console.warn("THREE.WebGLRenderer: .shadowMap.renderSingleSided has been removed. Set Material.shadowSide instead.")}}});Object.defineProperties($t.prototype,{wrapS:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapS is now .texture.wrapS."),this.texture.wrapS=r}},wrapT:{get:function(){return console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT},set:function(r){console.warn("THREE.WebGLRenderTarget: .wrapT is now .texture.wrapT."),this.texture.wrapT=r}},magFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .magFilter is now .texture.magFilter."),this.texture.magFilter=r}},minFilter:{get:function(){return console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter},set:function(r){console.warn("THREE.WebGLRenderTarget: .minFilter is now .texture.minFilter."),this.texture.minFilter=r}},anisotropy:{get:function(){return console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy},set:function(r){console.warn("THREE.WebGLRenderTarget: .anisotropy is now .texture.anisotropy."),this.texture.anisotropy=r}},offset:{get:function(){return console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset},set:function(r){console.warn("THREE.WebGLRenderTarget: .offset is now .texture.offset."),this.texture.offset=r}},repeat:{get:function(){return console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat},set:function(r){console.warn("THREE.WebGLRenderTarget: .repeat is now .texture.repeat."),this.texture.repeat=r}},format:{get:function(){return console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format},set:function(r){console.warn("THREE.WebGLRenderTarget: .format is now .texture.format."),this.texture.format=r}},type:{get:function(){return console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type},set:function(r){console.warn("THREE.WebGLRenderTarget: .type is now .texture.type."),this.texture.type=r}},generateMipmaps:{get:function(){return console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps},set:function(r){console.warn("THREE.WebGLRenderTarget: .generateMipmaps is now .texture.generateMipmaps."),this.texture.generateMipmaps=r}}});Ao.prototype.load=function(r){console.warn("THREE.Audio: .load has been deprecated. Use THREE.AudioLoader instead.");let e=this;return new So().load(r,function(n){e.setBuffer(n)}),this};Lo.prototype.getData=function(){return console.warn("THREE.AudioAnalyser: .getData() is now .getFrequencyData()."),this.getFrequencyData()};Xi.prototype.updateCubeMap=function(r,e){return console.warn("THREE.CubeCamera: .updateCubeMap() is now .update()."),this.update(r,e)};Xi.prototype.clear=function(r,e,t,n){return console.warn("THREE.CubeCamera: .clear() is now .renderTarget.clear()."),this.renderTarget.clear(r,e,t,n)};un.crossOrigin=void 0;un.loadTexture=function(r,e,t,n){console.warn("THREE.ImageUtils.loadTexture has been deprecated. Use THREE.TextureLoader() instead.");let i=new uo;i.setCrossOrigin(this.crossOrigin);let s=i.load(r,t,void 0,n);return e&&(s.mapping=e),s};un.loadTextureCube=function(r,e,t,n){console.warn("THREE.ImageUtils.loadTextureCube has been deprecated. Use THREE.CubeTextureLoader() instead.");let i=new lo;i.setCrossOrigin(this.crossOrigin);let s=i.load(r,t,void 0,n);return e&&(s.mapping=e),s};un.loadCompressedTexture=function(){console.error("THREE.ImageUtils.loadCompressedTexture has been removed. Use THREE.DDSLoader instead.")};un.loadCompressedTextureCube=function(){console.error("THREE.ImageUtils.loadCompressedTextureCube has been removed. Use THREE.DDSLoader instead.")};typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:"128"}}));typeof window<"u"&&(window.__THREE__?console.warn("WARNING: Multiple instances of Three.js being imported."):window.__THREE__="128")});var ug,hg,Eu,dg,fg,Tu,Au=Te(()=>{ug=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],hg=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],Eu=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],dg=Uint32Array.from(Eu.flat(),r=>r>>>0),fg={name:"Bourke",corners:ug,edges:hg,maxVertices:15,table:dg,cornerBit:r=>1<<r,createPolygonizer(){return(r,e,t)=>{let n=Eu[e],i=0;for(;i<15&&n[i]>=0;)t[i]=n[i],i++;return i}}},Tu=fg});var pg,cr,Lu=Te(()=>{pg=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]),cr=pg});var mg,xg,Qo,gg,Pu,Cu=Te(()=>{Lu();mg=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],xg=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],Qo=class{constructor(){this.table=cr,this.f_test_results=new Int32Array(6)}signbf(e){return e<0}face_tests(e){let t=this.v,n=this.f_test_results;return n.fill(0),e&128?(n[0]=(e&204)===132?t[0]*t[5]<t[1]*t[4]?-1:1:0,n[3]=(e&153)===129?t[0]*t[7]<t[3]*t[4]?-1:1:0,n[4]=(e&240)===160?t[0]*t[2]<t[1]*t[3]?-1:1:0):(n[0]=(e&204)===72?t[0]*t[5]<t[1]*t[4]?1:-1:0,n[3]=(e&153)===24?t[0]*t[7]<t[3]*t[4]?1:-1:0,n[4]=(e&240)===80?t[0]*t[2]<t[1]*t[3]?1:-1:0),e&2?(n[1]=(e&102)===66?t[1]*t[6]<t[2]*t[5]?-1:1:0,n[2]=(e&51)===18?t[3]*t[6]<t[2]*t[7]?-1:1:0,n[5]=(e&15)===10?t[4]*t[6]<t[5]*t[7]?-1:1:0):(n[1]=(e&102)===36?t[1]*t[6]<t[2]*t[5]?1:-1:0,n[2]=(e&51)===33?t[3]*t[6]<t[2]*t[7]?1:-1:0,n[5]=(e&15)===5?t[4]*t[6]<t[5]*t[7]?1:-1:0),n[0]+n[1]+n[2]+n[3]+n[4]+n[5]}face_test1(e){let t=this.v;switch(e){case 0:return t[0]*t[5]<t[1]*t[4]?72:132;case 1:return t[1]*t[6]<t[2]*t[5]?36:66;case 2:return t[3]*t[6]<t[2]*t[7]?33:18;case 3:return t[0]*t[7]<t[3]*t[4]?24:129;case 4:return t[0]*t[2]<t[1]*t[3]?80:160;default:return t[4]*t[6]<t[5]*t[7]?5:10}}interior_test(e,t){let n=this.v,i=1e-9,s=n[4]-n[0],a=n[5]-n[1],o=n[6]-n[2],c=n[7]-n[3],l=s*o-a*c;if(this.signbf(l)){if(e&1)return 0}else if(!(e&1)||Math.abs(l)<i)return 0;let u=.5*(n[3]*a+n[1]*c-n[2]*s-n[0]*o)/l;if(u<=i||u>=1-i)return 0;let h=n[0]+s*u,d=n[1]+a*u,f=n[2]+o*u,p=n[3]+c*u,g=f*h,v=p*d;if(e&1){if(g<v&&!this.signbf(v))return(this.signbf(d)===this.signbf(n[e]))+t}else if(g>v&&!this.signbf(g))return(this.signbf(h)===this.signbf(n[e]))+t;return 0}pattern(e){let t=this.table,n=(e&128)!==0,i=n?e^255:e,s=t[i];if(s===void 0)throw new Error(`MC33 lookup miss: ${i}`);let a=(s&2048)!==0,o=n?!a:a,c=o?e:e^255,l=s&2047,u=s>>>12,h;switch(u){case 0:h=l;break;case 1:h=c&this.face_test1(l>>2)?183+(l<<1):159+l;break;case 2:h=this.interior_test(l,0)?239+6*l:231+(l<<1);break;case 3:c&this.face_test1(l%6)?h=575+5*l:h=this.interior_test(Math.floor(l/6),0)?407+7*l:335+3*l;break;case 4:{let d=this.face_tests(c);d===-3?h=695+3*l:d===-1?h=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*l:d===1?h=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*l:h=this.interior_test(l>>1,0)?1095+9*l:1055+5*l;break}case 5:{let d=this.face_tests(c);d===-2?h=(l&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(l?1:3,0))?1213+(l<<3):1189+(l<<2):d===0?h=(this.f_test_results[2+l]<0?1261:1285)+(l<<3):h=(l&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(l?3:1,0))?1237+(l<<3):1201+(l<<2);break}case 6:{let d=this.face_tests(c);d===-2?h=this.interior_test(14287116>>(l<<1)&3,0)?1453+(l<<3):1357+(l<<2):d===0?h=(this.f_test_results[l>>1]<0?1645:1741)+(l<<3):h=this.interior_test(10991589>>(l<<1)&3,0)?1549+(l<<3):1405+(l<<2);break}default:{let d=Math.abs(this.face_tests(c));if(d===0){let f=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])h=2157+12*f;else{let p=this.interior_test(f,1);h=2285+(p?10*f-40*p:6*f)}}else if(d===2)h=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(h+=30);else if(d===4){let f=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];f>>4&&(f-=f&32?20:10),h=1845+3*f}else h=1839+2*this.f_test_results[0]}}return{offset:h+1,reverse:o}}triangles(e,t,n){if(this.v=e,t===0||t===255)return 0;let i=this.pattern(t),s=0;for(let a=i.offset;a<cr.length;a++){let o=cr[a],c=o&15,l=o>>4&15,u=o>>8&15;if(c<=12&&l<=12&&u<=12&&c!==l&&l!==u&&c!==u){if(s+3>n.length)throw new Error("MC33 cell exceeds output capacity");n[s++]=c,n[s++]=i.reverse?u:l,n[s++]=i.reverse?l:u}if(!(o&4096))return s}throw new Error("MC33 pattern exceeds lookup table")}},gg={name:"MC33",corners:mg,edges:xg,maxVertices:36,table:cr,cornerBit:r=>128>>r,createPolygonizer(){let r=new Qo;return r.triangles.bind(r)}},Pu=gg});function lr(r={type:"cartesian"}){if(r.type==="cartesian")return(s,a,o)=>[s,a,o];if(r.type!=="spherical"&&r.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${r.type}`);let e=r.radius||[.02,.7],t=r.center||[.5,.5,.5];if(e.length!==2||!e.every(Number.isFinite)||e[0]<0||e[1]<=e[0])throw new Error("Radius must be an increasing, nonnegative pair");if(t.length!==3||!t.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(r.type==="cube-sphere"){if(!Number.isInteger(r.face)||r.face<0||r.face>5)throw new Error("Cube-sphere face must be 0..5");return(s,a,o)=>{let c=2*s-1,l=2*a-1,h=[[1,l,-c],[-1,l,c],[c,1,-l],[c,-1,l],[c,l,1],[-c,l,-1]][r.face],f=(e[0]+o*(e[1]-e[0]))/Math.hypot(...h);return h.map((p,g)=>t[g]+p*f)}}let n=r.longitude||[-Math.PI,Math.PI],i=r.latitude||[-Math.PI/2,Math.PI/2];for(let s of[n,i])if(s.length!==2||!s.every(Number.isFinite)||s[1]<=s[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(i[0]<-Math.PI/2||i[1]>Math.PI/2||n[1]-n[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \xB1pi/2 and longitude span at most 2*pi");return(s,a,o)=>{let c=n[0]+s*(n[1]-n[0]),l=i[0]+a*(i[1]-i[0]),u=e[0]+o*(e[1]-e[0]),h=u*Math.cos(l);return Math.abs(Math.cos(l))<1e-15?[t[0],t[1]+u*Math.sin(l),t[2]]:[t[0]+h*Math.cos(c),t[1]+u*Math.sin(l),t[2]+h*Math.sin(c)]}}function Ko(r,e){if(!e||e.type==="cartesian")return r;let t=lr(e);for(let n=0;n<r.length;n+=3){let i=t(r[n],r[n+1],r[n+2]);r[n]=i[0],r[n+1]=i[1],r[n+2]=i[2]}return r}function ec(r,e,t){let n=lr(t),i=new Float32Array(r.x*r.y*r.z),s=t?.type==="spherical"&&Math.abs((t.longitude||[-Math.PI,Math.PI])[1]-(t.longitude||[-Math.PI,Math.PI])[0]-2*Math.PI)<1e-9;for(let a=0;a<r.z;a++)for(let o=0;o<r.y;o++)for(let c=0;c<r.x;c++){let l=(a*r.y+o)*r.x+c;if(s&&c===r.x-1){i[l]=i[(a*r.y+o)*r.x];continue}let u=n(c/(r.x-1),o/(r.y-1),a/(r.z-1));i[l]=e(...u)}return i}var tc=Te(()=>{});var Du,Iu=Te(()=>{Du=`struct Uniforms {
  isolevel: f32, dx: f32, dy: f32, dz: f32,
  gx: u32, gy: u32, gz: u32, zBase: f32,
};
@group(0) @binding(0) var<uniform> uni: Uniforms;
@group(0) @binding(1) var<storage, read> field: array<f32>;
@group(0) @binding(2) var<storage, read> table: array<u32>;
@group(0) @binding(3) var<storage, read_write> vertices: array<vec4<f32>>;
@group(0) @binding(4) var<storage, read_write> counter: atomic<u32>;
struct TriangleCodes { count: u32, codes: array<vec3<u32>, 12> }
`});var Fu,zu=Te(()=>{Fu=`struct CubeVals {
  v0: f32,
  v1: f32,
  v2: f32,
  v3: f32,
  v4: f32,
  v5: f32,
  v6: f32,
  v7: f32,
}

struct FaceTests {
  sum: i32,
  f0: i32,
  f1: i32,
  f2: i32,
  f3: i32,
  f4: i32,
  f5: i32,
}

struct PatternInfo {
  pcase: u32,
  reverse: bool,
}

fn signbit(v: f32) -> bool {
  return v < 0.0;
}

fn corner_offset(c: u32) -> vec3<u32> {
  switch c {
    case 0u: { return vec3<u32>(0u, 0u, 0u); }
    case 1u: { return vec3<u32>(0u, 1u, 0u); }
    case 2u: { return vec3<u32>(0u, 1u, 1u); }
    case 3u: { return vec3<u32>(0u, 0u, 1u); }
    case 4u: { return vec3<u32>(1u, 0u, 0u); }
    case 5u: { return vec3<u32>(1u, 1u, 0u); }
    case 6u: { return vec3<u32>(1u, 1u, 1u); }
    default: { return vec3<u32>(1u, 0u, 1u); }
  }
}

fn corner_bit(c: u32) -> u32 {
  switch c {
    case 0u: { return 0x80u; }
    case 1u: { return 0x40u; }
    case 2u: { return 0x20u; }
    case 3u: { return 0x10u; }
    case 4u: { return 0x08u; }
    case 5u: { return 0x04u; }
    case 6u: { return 0x02u; }
    default: { return 0x01u; }
  }
}

fn edge_corner_a(edge: u32) -> u32 {
  switch edge {
    case 0u: { return 0u; }
    case 1u: { return 1u; }
    case 2u: { return 2u; }
    case 3u: { return 3u; }
    case 4u: { return 4u; }
    case 5u: { return 5u; }
    case 6u: { return 6u; }
    case 7u: { return 7u; }
    case 8u: { return 0u; }
    case 9u: { return 1u; }
    case 10u: { return 2u; }
    default: { return 3u; }
  }
}

fn edge_corner_b(edge: u32) -> u32 {
  switch edge {
    case 0u: { return 1u; }
    case 1u: { return 2u; }
    case 2u: { return 3u; }
    case 3u: { return 0u; }
    case 4u: { return 5u; }
    case 5u: { return 6u; }
    case 6u: { return 7u; }
    case 7u: { return 4u; }
    case 8u: { return 4u; }
    case 9u: { return 5u; }
    case 10u: { return 6u; }
    default: { return 7u; }
  }
}

fn getv(v: CubeVals, i: u32) -> f32 {
  switch i {
    case 0u: { return v.v0; }
    case 1u: { return v.v1; }
    case 2u: { return v.v2; }
    case 3u: { return v.v3; }
    case 4u: { return v.v4; }
    case 5u: { return v.v5; }
    case 6u: { return v.v6; }
    default: { return v.v7; }
  }
}

fn face_test1(face: u32, v: CubeVals) -> u32 {
  switch face {
    case 0u: { return select(0x84u, 0x48u, v.v0 * v.v5 < v.v1 * v.v4); }
    case 1u: { return select(0x42u, 0x24u, v.v1 * v.v6 < v.v2 * v.v5); }
    case 2u: { return select(0x12u, 0x21u, v.v3 * v.v6 < v.v2 * v.v7); }
    case 3u: { return select(0x81u, 0x18u, v.v0 * v.v7 < v.v3 * v.v4); }
    case 4u: { return select(0xA0u, 0x50u, v.v0 * v.v2 < v.v1 * v.v3); }
    default: { return select(0x0Au, 0x05u, v.v4 * v.v6 < v.v5 * v.v7); }
  }
}

fn face_tests(i: u32, v: CubeVals) -> FaceTests {
  var f0 = 0i;
  var f1 = 0i;
  var f2 = 0i;
  var f3 = 0i;
  var f4 = 0i;
  var f5 = 0i;

  if ((i & 0x80u) != 0u) {
    if ((i & 0xCCu) == 0x84u) { f0 = select(1i, -1i, v.v0 * v.v5 < v.v1 * v.v4); }
    if ((i & 0x99u) == 0x81u) { f3 = select(1i, -1i, v.v0 * v.v7 < v.v3 * v.v4); }
    if ((i & 0xF0u) == 0xA0u) { f4 = select(1i, -1i, v.v0 * v.v2 < v.v1 * v.v3); }
  } else {
    if ((i & 0xCCu) == 0x48u) { f0 = select(-1i, 1i, v.v0 * v.v5 < v.v1 * v.v4); }
    if ((i & 0x99u) == 0x18u) { f3 = select(-1i, 1i, v.v0 * v.v7 < v.v3 * v.v4); }
    if ((i & 0xF0u) == 0x50u) { f4 = select(-1i, 1i, v.v0 * v.v2 < v.v1 * v.v3); }
  }

  if ((i & 0x02u) != 0u) {
    if ((i & 0x66u) == 0x42u) { f1 = select(1i, -1i, v.v1 * v.v6 < v.v2 * v.v5); }
    if ((i & 0x33u) == 0x12u) { f2 = select(1i, -1i, v.v3 * v.v6 < v.v2 * v.v7); }
    if ((i & 0x0Fu) == 0x0Au) { f5 = select(1i, -1i, v.v4 * v.v6 < v.v5 * v.v7); }
  } else {
    if ((i & 0x66u) == 0x24u) { f1 = select(-1i, 1i, v.v1 * v.v6 < v.v2 * v.v5); }
    if ((i & 0x33u) == 0x21u) { f2 = select(-1i, 1i, v.v3 * v.v6 < v.v2 * v.v7); }
    if ((i & 0x0Fu) == 0x05u) { f5 = select(-1i, 1i, v.v4 * v.v6 < v.v5 * v.v7); }
  }

  return FaceTests(f0 + f1 + f2 + f3 + f4 + f5, f0, f1, f2, f3, f4, f5);
}

fn interior_test(i: u32, flag13: u32, v: CubeVals) -> u32 {
  let tiny = 1e-9;
  let At = v.v4 - v.v0;
  let Bt = v.v5 - v.v1;
  let Ct = v.v6 - v.v2;
  let Dt = v.v7 - v.v3;
  let denom = At * Ct - Bt * Dt;

  if (signbit(denom)) {
    if ((i & 1u) != 0u) {
      return 0u;
    }
  } else if (((i & 1u) == 0u) || abs(denom) < tiny) {
    return 0u;
  }

  let t = 0.5 * (v.v3 * Bt + v.v1 * Dt - v.v2 * At - v.v0 * Ct) / denom;
  if (t <= tiny || t >= 1.0 - tiny) {
    return 0u;
  }

  let a = v.v0 + At * t;
  let b = v.v1 + Bt * t;
  let c = v.v2 + Ct * t;
  let d = v.v3 + Dt * t;
  let ac = c * a;
  let bd = d * b;

  if ((i & 1u) != 0u) {
    if (ac < bd && !signbit(bd)) {
      return select(0u, 1u, signbit(b) == signbit(getv(v, i))) + flag13;
    }
  } else if (ac > bd && !signbit(ac)) {
    return select(0u, 1u, signbit(a) == signbit(getv(v, i))) + flag13;
  }

  return 0u;
}

fn pattern_info(cubeIdx: u32, v: CubeVals) -> PatternInfo {
  let inverted = (cubeIdx & 0x80u) != 0u;
  let li = select(cubeIdx, cubeIdx ^ 0xFFu, inverted);
  let e0 = table[li];
  let reverseBit = (e0 & 0x800u) != 0u;
  let m = select(reverseBit, !reverseBit, inverted);
  let activeIndex = select(cubeIdx ^ 0xFFu, cubeIdx, m);
  let k = e0 & 0x7FFu;
  let caseId = e0 >> 12u;
  var pcase = 0u;

  switch caseId {
    case 0u: {
      pcase = k;
    }
    case 1u: {
      if ((activeIndex & face_test1(k >> 2u, v)) != 0u) {
        pcase = 183u + (k << 1u);
      } else {
        pcase = 159u + k;
      }
    }
    case 2u: {
      if (interior_test(k, 0u, v) != 0u) {
        pcase = 239u + 6u * k;
      } else {
        pcase = 231u + (k << 1u);
      }
    }
    case 3u: {
      if ((activeIndex & face_test1(k % 6u, v)) != 0u) {
        pcase = 575u + 5u * k;
      } else if (interior_test(k / 6u, 0u, v) != 0u) {
        pcase = 407u + 7u * k;
      } else {
        pcase = 335u + 3u * k;
      }
    }
    case 4u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -3i) {
        pcase = 695u + 3u * k;
      } else if (ft.sum == -1i) {
        if (ft.f4 + ft.f5 < 0i) {
          pcase = select(799u, 759u, ft.f0 + ft.f2 < 0i) + 5u * k;
        } else {
          pcase = 719u + 5u * k;
        }
      } else if (ft.sum == 1i) {
        if (ft.f4 + ft.f5 < 0i) {
          pcase = 983u + 9u * k;
        } else {
          pcase = select(911u, 839u, ft.f0 + ft.f2 < 0i) + 9u * k;
        }
      } else if (interior_test(k >> 1u, 0u, v) != 0u) {
        pcase = 1095u + 9u * k;
      } else {
        pcase = 1055u + 5u * k;
      }
    }
    case 5u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -2i) {
        var cond = false;
        if ((k & 2u) != 0u) {
          cond = interior_test(0u, 0u, v) != 0u;
        } else {
          cond = (interior_test(0u, 0u, v) != 0u) || (interior_test(select(3u, 1u, k != 0u), 0u, v) != 0u);
        }
        pcase = select(1189u + (k << 2u), 1213u + (k << 3u), cond);
      } else if (ft.sum == 0i) {
        pcase = select(1285u, 1261u, get_face_result(ft, 2u + k) < 0i) + (k << 3u);
      } else {
        var cond = false;
        if ((k & 2u) != 0u) {
          cond = interior_test(1u, 0u, v) != 0u;
        } else {
          cond = (interior_test(2u, 0u, v) != 0u) || (interior_test(select(1u, 3u, k != 0u), 0u, v) != 0u);
        }
        pcase = select(1201u + (k << 2u), 1237u + (k << 3u), cond);
      }
    }
    case 6u: {
      let ft = face_tests(activeIndex, v);
      if (ft.sum == -2i) {
        let arg = (0xDA010Cu >> (k << 1u)) & 3u;
        pcase = select(1357u + (k << 2u), 1453u + (k << 3u), interior_test(arg, 0u, v) != 0u);
      } else if (ft.sum == 0i) {
        pcase = select(1741u, 1645u, get_face_result(ft, k >> 1u) < 0i) + (k << 3u);
      } else {
        let arg = (0xA7B7E5u >> (k << 1u)) & 3u;
        pcase = select(1405u + (k << 2u), 1549u + (k << 3u), interior_test(arg, 0u, v) != 0u);
      }
    }
    default: {
      let ft = face_tests(activeIndex, v);
      let ftAbs = abs(ft.sum);
      if (ftAbs == 0i) {
        let kk = select(0u, 2u, ft.f1 < 0i) | select(0u, 1u, ft.f5 < 0i);
        if (ft.f0 * ft.f1 == ft.f5) {
          pcase = 2157u + 12u * kk;
        } else {
          let c = interior_test(kk, 1u, v);
          if (c != 0u) {
            pcase = u32(2285i + 10i * i32(kk) - 40i * i32(c));
          } else {
            pcase = 2285u + 6u * kk;
          }
        }
      } else if (ftAbs == 2i) {
        var idx = 0u;
        if (ft.f0 < 0i) {
          idx += select(0u, 1u, ft.f2 > 0i);
        } else {
          idx += 12u + select(0u, 1u, ft.f2 < 0i);
        }

        if (ft.f1 < 0i) {
          idx += select(0u, 1u, ft.f3 < 0i);
        } else {
          idx += 6u + select(0u, 1u, ft.f3 > 0i);
        }

        pcase = 1917u + 10u * idx;
        if (ft.f4 > 0i) {
          pcase += 30u;
        }
      } else if (ftAbs == 4i) {
        var kk = 21i + 11i * ft.f0 + 4i * ft.f1 + 3i * ft.f2 + 2i * ft.f3 + ft.f4;
        if (kk < 0i || kk >= 16i) {
          if ((kk & 32i) != 0i) {
            kk -= 20i;
          } else {
            kk -= 10i;
          }
        }
        pcase = u32(1845i + 3i * kk);
      } else {
        pcase = u32(1839i + 2i * ft.f0);
      }
    }
  }

  return PatternInfo(pcase + 1u, m);
}

fn get_face_result(ft: FaceTests, idx: u32) -> i32 {
  switch idx {
    case 0u: { return ft.f0; }
    case 1u: { return ft.f1; }
    case 2u: { return ft.f2; }
    case 3u: { return ft.f3; }
    case 4u: { return ft.f4; }
    default: { return ft.f5; }
  }
}
`});var ku,Bu=Te(()=>{ku=`fn cell_triangles(v: CubeVals, mask: u32) -> TriangleCodes {
  let info = pattern_info(mask, v);
  var pcase = info.pcase;
  var result: TriangleCodes;
  loop {
    if (pcase >= 2310u || result.count >= 12u) { break; }
    let word = table[pcase];
    let a = word & 0xFu;
    let b = (word >> 4u) & 0xFu;
    let c = (word >> 8u) & 0xFu;
    if (a <= 12u && b <= 12u && c <= 12u && a != b && b != c && a != c) {
      result.codes[result.count] = select(vec3<u32>(a,b,c), vec3<u32>(a,c,b), info.reverse);
      result.count += 1u;
    }
    if ((word & 0x1000u) == 0u) { break; }
    pcase += 1u;
  }
  return result;
}
`});var Uu,Nu=Te(()=>{Uu=`struct CubeVals { v0: f32, v1: f32, v2: f32, v3: f32, v4: f32, v5: f32, v6: f32, v7: f32 }
fn corner_offset(c: u32) -> vec3<u32> {
  var offsets = array<vec3<u32>, 8>(vec3<u32>(0,0,0),vec3<u32>(1,0,0),vec3<u32>(1,1,0),vec3<u32>(0,1,0),vec3<u32>(0,0,1),vec3<u32>(1,0,1),vec3<u32>(1,1,1),vec3<u32>(0,1,1));
  return offsets[c];
}
fn corner_bit(c: u32) -> u32 { return 1u << c; }
fn edge_corner_a(e: u32) -> u32 {
  var corners = array<u32,12>(0u,1u,2u,3u,4u,5u,6u,7u,0u,1u,2u,3u); return corners[e];
}
fn edge_corner_b(e: u32) -> u32 {
  var corners = array<u32,12>(1u,2u,3u,0u,5u,6u,7u,4u,4u,5u,6u,7u); return corners[e];
}
fn getv(v: CubeVals, i: u32) -> f32 {
  var values = array<f32,8>(v.v0,v.v1,v.v2,v.v3,v.v4,v.v5,v.v6,v.v7); return values[i];
}
fn cell_triangles(v: CubeVals, mask: u32) -> TriangleCodes {
  var result: TriangleCodes;
  for (var i = 0u; i < 15u; i += 3u) {
    let a = table[mask * 16u + i];
    if (a == 0xffffffffu) { break; }
    result.codes[result.count] = vec3<u32>(a, table[mask * 16u + i + 1u], table[mask * 16u + i + 2u]);
    result.count += 1u;
  }
  return result;
}
`});var Gu,Ou=Te(()=>{Gu=`fn sample_corner(cell: vec3<u32>, c: u32) -> f32 {
  let p = cell + corner_offset(c);
  return field[(p.z * uni.gy + p.y) * uni.gx + p.x] - uni.isolevel;
}
fn vertex_for_code(code: u32, cell: vec3<u32>, v: CubeVals) -> vec4<f32> {
  var local = vec3<f32>(0.5);
  if (code != 12u) {
    let a = edge_corner_a(code); let b = edge_corner_b(code);
    let va = getv(v,a); let diff = va - getv(v,b);
    var t = 0.5;
    if (abs(diff) >= 1e-9) { t = clamp(va / diff, 0.0, 1.0); }
    local = mix(vec3<f32>(corner_offset(a)), vec3<f32>(corner_offset(b)), t);
  }
  let p = (vec3<f32>(cell) + local) * vec3<f32>(uni.dx,uni.dy,uni.dz);
  return vec4<f32>(p.x, p.y, p.z + uni.zBase, 1.0);
}
@compute @workgroup_size(4,4,4)
fn cs(@builtin(global_invocation_id) cell: vec3<u32>) {
  if (any(cell >= vec3<u32>(uni.gx-1u,uni.gy-1u,uni.gz-1u))) { return; }
  let v = CubeVals(sample_corner(cell,0u),sample_corner(cell,1u),sample_corner(cell,2u),sample_corner(cell,3u),
                   sample_corner(cell,4u),sample_corner(cell,5u),sample_corner(cell,6u),sample_corner(cell,7u));
  var mask = 0u;
  for (var c = 0u; c < 8u; c += 1u) { if (getv(v,c) < 0.0) { mask |= corner_bit(c); } }
  if (mask == 0u || mask == 255u) { return; }
  let tris = cell_triangles(v,mask);
  let dst = atomicAdd(&counter,tris.count * 3u);
  for (var i = 0u; i < tris.count; i += 1u) {
    let codes = tris.codes[i];
    vertices[dst+i*3u] = vertex_for_code(codes.x,cell,v);
    vertices[dst+i*3u+1u] = vertex_for_code(codes.y,cell,v);
    vertices[dst+i*3u+2u] = vertex_for_code(codes.z,cell,v);
  }
}
`});function Hu(r,e,t,n){let i=ur[n];if(!i)throw new Error(`Unknown marching cubes algorithm: ${n}`);if(!["x","y","z"].every(s=>Number.isInteger(e[s])&&e[s]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(r instanceof Float32Array)||r.length!==e.x*e.y*e.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(t))throw new Error("Isolevel must be finite");for(let s of r)if(!Number.isFinite(s)||!Number.isFinite(Math.fround(s-t)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return i}function Vu(r,e,t=0,n="bourke",i={}){t=Math.fround(t),i.coordinates&&lr(i.coordinates);let s=Hu(r,e,t,n),{x:a,y:o,z:c}=e,l=s.createPolygonizer(),u=new Float32Array(8),h=new Uint8Array(s.maxVertices),d=new Float32Array(39),f=new Float32Array(65536),p=0;for(let g=0;g<c-1;g++)for(let v=0;v<o-1;v++)for(let x=0;x<a-1;x++){let m=0;for(let _=0;_<8;_++){let w=s.corners[_];u[_]=r[((g+w[2])*o+v+w[1])*a+x+w[0]]-t,u[_]<0&&(m|=s.cornerBit(_))}if(m===0||m===255)continue;let b=l(u,m,h);if(p+b*3>f.length){let _=new Float32Array(Math.max(f.length*2,p+b*3));_.set(f),f=_}for(let _=0;_<12;_++){let[w,y]=s.edges[_];if(u[w]<0==u[y]<0)continue;let P=u[w]-u[y],C=Math.abs(P)<1e-9?.5:Math.max(0,Math.min(1,u[w]/P)),F=s.corners[w],k=s.corners[y];d[_*3]=(x+F[0]+C*(k[0]-F[0]))/(a-1),d[_*3+1]=(v+F[1]+C*(k[1]-F[1]))/(o-1),d[_*3+2]=(g+F[2]+C*(k[2]-F[2]))/(c-1)}d[36]=(x+.5)/(a-1),d[37]=(v+.5)/(o-1),d[38]=(g+.5)/(c-1);for(let _=0;_<b;_++){let w=h[_]*3;f[p++]=d[w],f[p++]=d[w+1],f[p++]=d[w+2]}}return Ko(f.slice(0,p),i.coordinates)}function Mg(r){if(!ur[r])throw new Error(`Unknown marching cubes algorithm: ${r}`);let e=r==="mc33"?Fu+ku:Uu;return Du+e+Gu}async function Sg(r,e){let t=Ls.get(r);if(t||(t=new Map,Ls.set(r,t)),!t.has(e)){let n=(async()=>{let i=r.createShaderModule({code:Mg(e),label:`${e} marching cubes`}),a=(await i.getCompilationInfo()).messages.filter(l=>l.type==="error");if(a.length)throw new Error(a.map(l=>`${l.lineNum}: ${l.message}`).join(`
`));let o=await r.createComputePipelineAsync({layout:"auto",compute:{module:i,entryPoint:"cs"}}),c=As(r,ur[e].table,GPUBufferUsage.STORAGE);return{pipeline:o,table:c}})();t.set(e,n),n.catch(()=>t.delete(e))}return t.get(e)}function As(r,e,t){let n=r.createBuffer({size:e.byteLength,usage:t,mappedAtCreation:!0});return new Uint8Array(n.getMappedRange()).set(new Uint8Array(e.buffer,e.byteOffset,e.byteLength)),n.unmap(),n}function Eg(r,e,t){let n=Math.min(t.maxBufferSize,t.maxStorageBufferBindingSize),i=Math.floor(n/(r.x*r.y*4)),s=Math.floor(n/((r.x-1)*(r.y-1)*e.maxVertices*16)),a=t.maxComputeWorkgroupsPerDimension*4,o=Math.min(r.z,i,s+1,a+1);if(o<2||r.x-1>a||r.y-1>a)throw new Error("Grid XY plane exceeds GPU limits; reduce the grid dimensions");return o}async function Wu(r,e,t,n=0,i="bourke",s={}){n=Math.fround(n),s.coordinates&&lr(s.coordinates);let a=Hu(e,t,n,i),{x:o,y:c,z:l}=t,u=Eg(t,a,r.limits);if(s.brickDepth!==void 0){if(!Number.isInteger(s.brickDepth)||s.brickDepth<2)throw new Error("Brick depth must be at least 2");u=Math.min(u,s.brickDepth)}let{pipeline:h,table:d}=await Sg(r,i),f=[],p=0;for(let x=0;x<l-1;x+=u-1){let m=Math.min(u,l-x),b=[],_=w=>(b.push(w),w);try{let w=e.subarray(x*o*c,(x+m)*o*c),y=_(As(r,w,GPUBufferUsage.STORAGE)),P=(o-1)*(c-1)*(m-1)*a.maxVertices,C=_(r.createBuffer({size:P*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC})),F=_(As(r,new Uint32Array([0]),GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC)),k=new Uint32Array(8),H=new Float32Array(k.buffer);H.set([n,1/(o-1),1/(c-1),1/(l-1)]),k.set([o,c,m],4),H[7]=x/(l-1);let B=_(As(r,k,GPUBufferUsage.UNIFORM)),L=r.createBindGroup({layout:h.getBindGroupLayout(0),entries:[B,y,d,C,F].map((Z,$)=>({binding:$,resource:{buffer:Z}}))}),D=_(r.createBuffer({size:4,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})),z=r.createCommandEncoder(),T=z.beginComputePass();T.setPipeline(h),T.setBindGroup(0,L),T.dispatchWorkgroups(Math.ceil((o-1)/4),Math.ceil((c-1)/4),Math.ceil((m-1)/4)),T.end(),z.copyBufferToBuffer(F,0,D,0,4),r.queue.submit([z.finish()]),await D.mapAsync(GPUMapMode.READ);let I=new Uint32Array(D.getMappedRange())[0];if(D.unmap(),I>P||I%3!==0)throw new Error("Invalid GPU vertex count");if(I){let Z=_(r.createBuffer({size:I*16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})),$=r.createCommandEncoder();$.copyBufferToBuffer(C,0,Z,0,I*16),r.queue.submit([$.finish()]),await Z.mapAsync(GPUMapMode.READ);let U=new Float32Array(Z.getMappedRange()),W=new Float32Array(I*3);for(let G=0,q=0;G<U.length;G+=4)W[q++]=U[G],W[q++]=U[G+1],W[q++]=U[G+2];Z.unmap(),f.push(W),p+=W.length}}finally{for(let w of b)w.destroy()}}let g=new Float32Array(p),v=0;for(let x of f)g.set(x,v),v+=x.length;return Ko(g,s.coordinates)}async function qu(r){let e=Ls.get(r);if(!e)return;let t=await Promise.allSettled(e.values());for(let n of t)n.status==="fulfilled"&&n.value.table.destroy();Ls.delete(r)}var ur,Ls,nc=Te(()=>{Au();Cu();tc();Iu();zu();Bu();Nu();Ou();ur={bourke:Tu,mc33:Pu};Ls=new WeakMap});function Yu(r,e,t){let n=new Float32Array(r*3),i=e.x,s=e.y,a=e.z;for(let o=0,c=0;o<r;++o,c+=3){let l=Math.random(),u=Math.random(),h=2*Math.PI*l,d=Math.acos(2*u-1),f=Math.sin(d);n[c]=i+t*f*Math.cos(h),n[c+1]=s+t*f*Math.sin(h),n[c+2]=a+t*Math.cos(d)}return n}function $u(r){if(r.length<12||r.length%3)throw new Error("A sphere fit needs at least four xyz points");let e=[0,0,0],t=r.length/3;for(let u=0;u<r.length;u++){if(!Number.isFinite(r[u]))throw new Error("Sphere points must be finite");e[u%3]+=r[u]/t}let n=Array.from({length:4},()=>new Float64Array(5));for(let u=0;u<r.length;u+=3){let h=[r[u]-e[0],r[u+1]-e[1],r[u+2]-e[2]],d=[2*h[0],2*h[1],2*h[2],1],f=h.reduce((p,g)=>p+g*g,0);for(let p=0;p<4;p++){for(let g=0;g<4;g++)n[p][g]+=d[p]*d[g];n[p][4]+=d[p]*f}}let i=Math.max(...n.map(u=>Math.max(...u.slice(0,4))));for(let u=0;u<4;u++){let h=u;for(let f=u+1;f<4;f++)Math.abs(n[f][u])>Math.abs(n[h][u])&&(h=f);if(Math.abs(n[h][u])<i*1e-12)throw new Error("Sphere points must span three dimensions");[n[u],n[h]]=[n[h],n[u]];let d=n[u][u];for(let f=u;f<5;f++)n[u][f]/=d;for(let f=0;f<4;f++)if(f!==u){let p=n[f][u];for(let g=u;g<5;g++)n[f][g]-=p*n[u][g]}}let s=n.slice(0,3).map(u=>u[4]),a=e.map((u,h)=>u+s[h]),o=Math.sqrt(n[3][4]+s.reduce((u,h)=>u+h*h,0));if(!Number.isFinite(o)||o<=0)throw new Error("Sphere fit has no positive radius");let c=0,l=0;for(let u=0;u<r.length;u+=3){let h=Math.abs(Math.hypot(r[u]-a[0],r[u+1]-a[1],r[u+2]-a[2])-o);c+=h*h,l=Math.max(l,h)}return{center:a,radius:o,rmsError:Math.sqrt(c/t),maxError:l}}function Zu(r,e="outer",t=.004,n=0){if(!["outer","inner","both"].includes(e))throw new Error("Choose outer, inner or both surfaces");if(!Number.isFinite(n)||!Number.isFinite(t)||t<=0)throw new Error("Use a finite offset and positive shell thickness");let i=r.radius+n,s=i-t;if(i<=0||s<=0)throw new Error("Shell thickness must be smaller than the sphere radius plus offset");return[{side:"outer",radius:i,iso:n},{side:"inner",radius:s,iso:n-t}].filter(o=>e==="both"||o.side===e)}function Ju(r){return(e,t,n)=>Math.hypot(e-r.center[0],t-r.center[1],n-r.center[2])-r.radius}function ju(r,e,t){let n=new Float32Array(r.length),i=new Float32Array(r.length),s=0,a=t.side==="inner"?-1:1;for(let o=0;o<r.length;o+=9){let c=[],l=[];for(let g=0;g<3;g++){let v=[0,1,2].map(m=>r[o+g*3+m]-e.center[m]),x=Math.hypot(...v);if(!Number.isFinite(x)||x===0)throw new Error("Invalid sphere vertex");c.push(v.map((m,b)=>e.center[b]+m/x*t.radius)),l.push(v.map(m=>m/x*a))}let u=c[1].map((g,v)=>g-c[0][v]),h=c[2].map((g,v)=>g-c[0][v]),d=[u[1]*h[2]-u[2]*h[1],u[2]*h[0]-u[0]*h[2],u[0]*h[1]-u[1]*h[0]];if(Math.hypot(...d)<t.radius*t.radius*1e-12)continue;let p=d.reduce((g,v,x)=>g+v*l[0][x],0)<0?[0,2,1]:[0,1,2];for(let g of p)n.set(c[g],s),i.set(l[g],s),s+=3}return{positions:n.slice(0,s),normals:i.slice(0,s)}}var Qu=Te(()=>{});var Ku={};pr(Ku,{startDemo:()=>Ag});async function Ag(){"use strict";let r=document.getElementById("status"),e=document.getElementById("algorithm"),t=document.getElementById("backend"),n=document.getElementById("coordinates"),i=document.getElementById("isolevel"),s=document.getElementById("surface"),a=document.getElementById("thickness"),o=document.getElementById("rebuild"),c=document.getElementById("wireframe");function l(U,W=!1){r.textContent=U,r.classList.toggle("error",W)}let u=new E(.5,.5,.5),h={x:65,y:65,z:65},d=[new Sn,new Sn],f=[0,1].map(()=>new He(45,1,.01,100)),p=["pointCanvas","meshCanvas"].map(U=>new Be({canvas:document.getElementById(U),antialias:!0}));p.forEach(U=>U.setPixelRatio(Math.min(window.devicePixelRatio,2))),d.forEach(U=>{U.background=new he(15658734)});let g=new Yt;g.position.copy(u),d[0].add(g);let v=new Ie,x=new ni({color:12860476,size:.003}),m=new ri({color:1401481,side:hi}),b=new lt(new Ie,m);d[1].add(b),d[1].add(new sr(8947848));let _=new rr(16777215,.8);_.position.set(1,2,1),d[1].add(_);function w(){p.forEach((U,W)=>{let G=U.domElement,q=G.clientWidth,O=G.clientHeight;U.setSize(q,O,!1),f[W].aspect=q/O,f[W].updateProjectionMatrix()})}window.addEventListener("resize",w),w();let y;function P(U){y=requestAnimationFrame(P),f.forEach(W=>{W.position.set(u.x+1.3*Math.cos(U*25e-5),u.y+.3,u.z+1.3*Math.sin(U*25e-5)),W.lookAt(u)}),p.forEach((W,G)=>W.render(d[G],f[G]))}y=requestAnimationFrame(P),await new Promise(U=>requestAnimationFrame(()=>setTimeout(U,0)));let C=Yu(15e3,u,.3),F=C.slice();for(let U=0;U<F.length;U++)F[U]-=.5;v.setAttribute("position",new Ue(F,3)),g.add(new Ji(v,x));let k=$u(C),H=Ju(k),B=ec(h,H,{type:"cartesian"}),L=new Map([["cartesian",[{field:B,size:h,coordinates:{type:"cartesian"}}]]]);function D(U){if(!L.has(U)){let W=U==="spherical"?{x:65,y:33,z:50}:{x:33,y:33,z:50},G=U==="spherical"?[{type:"spherical",center:k.center,radius:[.02,.7]}]:Array.from({length:6},(q,O)=>({type:"cube-sphere",face:O,center:k.center,radius:[.02,.7]}));L.set(U,G.map(q=>({size:W,coordinates:q,field:ec(W,H,q)})))}return L.get(U)}let z=null,T=!1,I=!1;navigator.gpu||(t.querySelector('[value="gpu"]').disabled=!0,t.title="WebGPU requires a supported browser and localhost or HTTPS");async function Z(){if(z)return z;if(!navigator.gpu)throw new Error("WebGPU is unavailable; use CPU or open this page on localhost in a supported browser");let U=await navigator.gpu.requestAdapter();if(!U)throw new Error("No WebGPU adapter available; CPU remains available");let W=await U.requestDevice();return z=W,W.lost.then(G=>{z===W&&(z=null,t.value="cpu",l(`GPU device lost: ${G.message}. Switching to CPU.`,!0),$())}),W}async function $(){if(T){I=!0;return}T=!0,o.disabled=!0;let U=e.value,W=t.value,G=n.value,q=i.value,O=a.value,de=s.value,fe=Number(q),ee=Number(O),le=`${U==="mc33"?"MC33":"Bourke"} \xB7 ${W==="gpu"?"WebGPU":"CPU"} \xB7 ${G} \xB7 ${s.selectedOptions[0].text}`;l(`Building ${le}\u2026`),await new Promise(ge=>requestAnimationFrame(()=>setTimeout(ge,0)));try{if(!q||!O)throw new Error("Enter a surface offset and shell thickness");let ge=Zu(k,de,ee,fe);if(ge.some(M=>M.radius<=.02||M.radius>=.49))throw new Error("Keep each surface radius between 0.02 and 0.49 so it fits the sampled domain");let Me=D(G),ve=performance.now(),Q=[],te=W==="gpu"?await Z():null;for(let M of ge)for(let X of Me){let J={coordinates:X.coordinates},ce=te?await Wu(te,X.field,X.size,M.iso,U,J):Vu(X.field,X.size,M.iso,U,J);Q.push(ju(ce,k,M))}let ne=new Float32Array(Q.reduce((M,X)=>M+X.positions.length,0)),ue=new Float32Array(ne.length),ae=0;for(let M of Q)ne.set(M.positions,ae),ue.set(M.normals,ae),ae+=M.positions.length;let A=new Ie;A.setAttribute("position",new Ue(ne,3)),A.setAttribute("normal",new Ue(ue,3)),b.geometry.dispose(),b.geometry=A,document.getElementById("meshLabel").textContent=le,l(`${le} \u2014 ${(ne.length/9).toLocaleString()} triangles in ${(performance.now()-ve).toFixed(1)} ms \xB7 point radius ${k.radius.toFixed(4)} \xB7 ${ge.map(M=>`${M.side} ${M.radius.toFixed(4)}`).join(" / ")}`)}catch(ge){l(`${le}: ${ge.message}`,!0),console.error(ge)}finally{T=!1,o.disabled=!1,I&&(I=!1,$())}}[e,t,n,i,s,a].forEach(U=>U.addEventListener("change",$)),o.addEventListener("click",$),c.addEventListener("change",()=>{m.wireframe=c.checked}),window.addEventListener("pagehide",()=>{if(cancelAnimationFrame(y),v.dispose(),x.dispose(),b.geometry.dispose(),m.dispose(),p.forEach(U=>U.dispose()),z){let U=z;z=null,qu(U).finally(()=>U.destroy())}}),await $()}var eh=Te(()=>{or();nc();tc();Qu()});async function Lg({adapterOptions:r,requiredFeatures:e=[],requiredLimits:t,timestamps:n=!0}={}){let i=globalThis.navigator?.gpu;if(!i)throw new Error("WebGPU is unavailable; use CPU extraction or a WebGPU browser over HTTPS.");let s=await i.requestAdapter(r);if(!s)throw new Error("No WebGPU adapter is available.");let a=new Set(e);return n&&s.features.has("timestamp-query")&&a.add("timestamp-query"),s.requestDevice({requiredFeatures:[...a],requiredLimits:t})}async function mi(r){r.ownsDevice=!r.options.device,r.device=r.options.device||await Lg();let e=r.device;r.onGPUError=n=>r.errors.push(n.error.message),e.addEventListener("uncapturederror",r.onGPUError);let t=new WeakRef(r);if(e.lost.then(n=>{let i=t.deref();i&&!i.disposed&&i.errors.push(`GPU device lost: ${n.message}`)}),r.context=r.canvas.getContext("webgpu"),!r.context)throw new Error("Canvas cannot create a WebGPU context.");return r.format=r.options.format||globalThis.navigator.gpu.getPreferredCanvasFormat(),r.context.configure({device:e,format:r.format,alphaMode:"opaque"}),e}function xi(r){r.onGPUError&&r.device?.removeEventListener("uncapturederror",r.onGPUError),r.context?.unconfigure(),r.ownsDevice&&r.device?.destroy()}function gi(r,e={}){let t=e.pixelRatio??Math.min(globalThis.devicePixelRatio||1,1.5);if(!Number.isFinite(t)||t<=0)throw new RangeError("pixelRatio must be positive and finite.");return{ratio:t,width:Math.max(1,Math.round(r.clientWidth===void 0?r.width:r.clientWidth*t)),height:Math.max(1,Math.round(r.clientHeight===void 0?r.height:r.clientHeight*t))}}var Ps=Te(()=>{});var hr,th=Te(()=>{hr=`fn terrain_hash(p: vec2<i32>, seed: u32) -> f32 {
  var h = (bitcast<u32>(p.x)*0x8da6b343u) ^ (bitcast<u32>(p.y)*0xd8163841u) ^ (seed*0xcb1ab31fu);
  h = (h ^ (h >> 16u))*0x7feb352du;
  h = (h ^ (h >> 15u))*0x846ca68bu;
  return f32(h ^ (h >> 16u))/4294967295.0*2.0-1.0;
}
fn terrain_noise(p: vec2<f32>, seed: u32) -> vec3<f32> {
  let cell=vec2<i32>(floor(p)); let f=fract(p);
  let uv=f*f*(vec2<f32>(3.0)-2.0*f); let grad=6.0*f*(vec2<f32>(1.0)-f);
  let a=terrain_hash(cell,seed); let b=terrain_hash(cell+vec2<i32>(1,0),seed);
  let c=terrain_hash(cell+vec2<i32>(0,1),seed); let d=terrain_hash(cell+vec2<i32>(1,1),seed);
  return vec3<f32>(mix(mix(a,b,uv.x),mix(c,d,uv.x),uv.y),
    mix(b-a,d-c,uv.y)*grad.x,mix(c-a,d-b,uv.x)*grad.y);
}
fn terrain_height_gradient(xz: vec2<f32>, seed: u32) -> vec3<f32> {
  var waves=array<f32,7>(2400.0,1000.0,420.0,180.0,72.0,28.0,10.0);
  var amplitudes=array<f32,7>(140.0,65.0,28.0,12.0,5.0,2.0,0.8);
  var result=vec3<f32>(25.0,0.0,0.0);
  for(var i=0u;i<7u;i++) {
    let n=terrain_noise(xz/waves[i]+vec2<f32>(13.71,-8.29),seed+i*19u);
    result+=vec3<f32>(n.x,n.y/waves[i],n.z/waves[i])*amplitudes[i];
  }
  let n=terrain_noise(xz/620.0+vec2<f32>(-2.7,4.1),seed+101u); let r=1.0-abs(n.x);
  result.x+=r*r*100.0-50.0;
  result=vec3<f32>(result.x,result.yz+n.yz*(-2.0*r*sign(n.x)*100.0/620.0));
  return result;
}
`});function Rt(r,e,t=7){let n=(Math.imul(r,2376512323)^Math.imul(e,3625334849)^Math.imul(t,3407524639))>>>0;return n=Math.imul(n^n>>>16,2146121005)>>>0,n=Math.imul(n^n>>>15,2221713035)>>>0,((n^n>>>16)>>>0)/4294967295*2-1}function ic(r,e,t){let n=Math.floor(r),i=Math.floor(e),s=r-n,a=e-i,o=s*s*(3-2*s),c=a*a*(3-2*a),l=6*s*(1-s),u=6*a*(1-a),h=Rt(n,i,t),d=Rt(n+1,i,t),f=Rt(n,i+1,t),p=Rt(n+1,i+1,t);return[h+(d-h)*o+(f-h)*c+(h-d-f+p)*o*c,((d-h)*(1-c)+(p-f)*c)*l,((f-h)*(1-o)+(p-d)*o)*u]}function Cs(r,e,t){let n=Math.floor(r),i=Math.floor(e),s=r-n,a=e-i,o=s*s*(3-2*s),c=a*a*(3-2*a),l=Rt(n,i,t),u=Rt(n+1,i,t),h=Rt(n,i+1,t),d=Rt(n+1,i+1,t);return l+(u-l)*o+(h-l)*c+(l-u-h+d)*o*c}function sc(r,e,t=7){let n=[25,0,0];for(let o=0;o<dr.length;o++){let[c,l]=dr[o],u=ic(r/c+13.71,e/c-8.29,t+o*19);n[0]+=u[0]*l,n[1]+=u[1]*l/c,n[2]+=u[2]*l/c}let i=ic(r/620-2.7,e/620+4.1,t+101),s=1-Math.abs(i[0]);n[0]+=s*s*100-50;let a=-2*s*Math.sign(i[0])*100/620;return n[1]+=a*i[1],n[2]+=a*i[2],n}function fr(r){let e=0;for(let[t,n]of dr)e+=n*Math.min(1,2*(r/t)**2);return e+100*Math.min(1,r/620)*.15}function kt(r,e,t=7){let n=25;for(let s=0;s<dr.length;s++){let[a,o]=dr[s];n+=Cs(r/a+13.71,e/a-8.29,t+s*19)*o}let i=1-Math.abs(Cs(r/620-2.7,e/620+4.1,t+101));return n+(i*i*100-50)}var dr,rc,Pn=Te(()=>{th();dr=[[2400,140],[1e3,65],[420,28],[180,12],[72,5],[28,2],[10,.8]],rc=[-380,480]});function nh(r=8192,e=128){let t=r/e;if(!Number.isInteger(t)||t<1)throw new Error("World size must be divisible by tile size");let n=[];for(let i=0;i<t;i++)for(let s=0;s<t;s++){let a=s*e-r/2,o=i*e-r/2;n.push({id:i*t+s,x:s,z:i,ox:a,oz:o,size:e,lo:[a,rc[0],o],hi:[a+e,rc[1],o+e]})}return{tiles:n,side:t}}function zg(r,e){let t=r%e,n=Math.floor(r/e);return[[t>0?r-1:-1,Cg],[t<e-1?r+1:-1,Rg],[n>0?r-e:-1,Ig],[n<e-1?r+e:-1,Dg]]}function ih(r,e,t){let n=t*Math.max(1,Math.floor(e/t/8));return[Math.round(r[0]/n)*n,Math.round(r[2]/n)*n]}function ac(r,e,t,n,i=()=>{}){if(!Number.isInteger(t)||!Number.isInteger(n))throw new Error("Window shifts must use whole tiles");let s=new Map;for(let[a,o]of r){let c=a%e-t,l=Math.floor(a/e)-n;c>=0&&l>=0&&c<e&&l<e?s.set(l*e+c,o):i(o)}return s}function rh(r,e,t){for(let n of r)n.ox+=e,n.oz+=t,n.lo[0]+=e,n.hi[0]+=e,n.lo[2]+=t,n.hi[2]+=t}function sh(r,e){return r.map(t=>[t[0],t[1],t[2],t[3]+t[0]*e[0]+t[2]*e[1]])}function Nt(r,e){let t=0;for(let n=0;n<3;n++){let i=Math.max(r.lo[n]-e[n],0,e[n]-r.hi[n]);t+=i*i}return Math.sqrt(t)}function Fg(r,e,t,n,i){let s=Math.max(1,Nt(r,e.position)),a=i?0:e.height/(2*Math.tan(e.fov/2));if(Math.hypot(Math.max(r.ox-e.player[0],0,e.player[0]-r.ox-r.size),Math.max(r.oz-e.player[2],0,e.player[2]-r.oz-r.size))<t.nearRadius)return 0;let c=u=>(i?i[u]:fr(r.size/(t.maxDivs>>u))*a)/s,l=0;for(;l<t.levels-1&&c(l+1)<=t.pixelError;)l++;if(n!==void 0&&n<t.levels){let u=c(n),h=n+1<t.levels?c(n+1):1/0;if(u<=t.pixelError*1.2&&h>=t.pixelError*.8)return n}return l}function oc(r,e,t="refine"){let n=Array.from(r.keys()),i=(s,a)=>{let o=r.get(s),c=r.get(a);if(c===void 0||Math.abs(o-c)<=1)return;let l=t==="refine"?o>c?s:a:o<c?s:a;r.set(l,t==="refine"?Math.min(o,c)+1:Math.max(o,c)-1),n.push(l)};for(let s=0;s<n.length;s++){let a=n[s],o=a%e;o&&i(a,a-1),o<e-1&&i(a,a+1),a>=e&&i(a,a-e),a+e<e*e&&i(a,a+e)}return r}function cc(r,e){let t=new Map;for(let[n,i]of r){let s=0;for(let[a,o]of zg(n,e))r.get(a)===i+1&&(s|=o);t.set(n,s)}return t}function ah(r,e,t,n,i,s=new Map){let a=new Map,o=n.height/(2*Math.tan(n.fov/2)),c=e.length?Array.from({length:i.levels},(l,u)=>fr(r[e[0]].size/(i.maxDivs>>u))*o):[];for(let l of e)a.set(l,i.uniform?0:Fg(r[l],n,i,s.get(l),c));return oc(a,t),{levels:a,masks:cc(a,t)}}var Cg,Rg,Ig,Dg,lc=Te(()=>{Pn();Cg=1,Rg=2,Ig=4,Dg=8});function Bg(r){let e=ur[r];if(!e)throw new Error("Unknown terrain algorithm");let t=Float32Array.from(e.corners,o=>o[1]?1:-1),n=0;t.forEach((o,c)=>{o<0&&(n|=e.cornerBit(c))});let i=new Uint8Array(e.maxVertices),s=e.createPolygonizer()(t,n,i),a=[];for(let o of i.slice(0,s)){if(o===12)throw new Error("Heightfield template unexpectedly uses a center vertex");let[c,l]=e.edges[o],u=e.corners[c],h=e.corners[l];if(u[0]!==h[0]||u[2]!==h[2])throw new Error("Heightfield crossing must be vertical");a.push([u[0],u[2]])}return a}function yi(r,e=0,t="mc33"){if(!Number.isInteger(r)||r<2||r&r-1)throw new Error("Divisions must be a power of two of at least 2");if(!Number.isInteger(e)||e<0||e>15)throw new Error("Seam mask must be 0..15");let n=r+1,i=Bg(t),s=new Uint32Array(r*r*6),a=0;function o(l){let u=l.map(d=>[d%n,Math.floor(d/n)]),h=(u[1][0]-u[0][0])*(u[2][1]-u[0][1])-(u[1][1]-u[0][1])*(u[2][0]-u[0][0]);h!==0&&(h>0&&([l[1],l[2]]=[l[2],l[1]]),s.set(l,a),a+=3)}let c=[];for(let l=0;l<i.length;l+=3){let[u,h,d]=i.slice(l,l+3),f=(h[0]-u[0])*(d[1]-u[1])-(h[1]-u[1])*(d[0]-u[0]),p=[u[1]*n+u[0],h[1]*n+h[0],d[1]*n+d[0]];f>0&&([p[1],p[2]]=[p[2],p[1]]),c.push(...p)}for(let l=0;l<r;l+=2)for(let u=0;u<r;u+=2)if(u===0&&e&1||u===r-2&&e&2||l===0&&e&4||l===r-2&&e&8){let d=[[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1]].map(p=>[u+p[0],l+p[1]]).filter(([p,g])=>{let v=p===0&&e&1||p===r&&e&2,x=g===0&&e&4||g===r&&e&8;return!(v&&g&1)&&!(x&&p&1)}).map(([p,g])=>g*n+p),f=(l+1)*n+u+1;for(let p=0;p<d.length;p++)o([f,d[p],d[(p+1)%d.length]])}else for(let d=0;d<2;d++)for(let f=0;f<2;f++)for(let p=0;p<c.length;p++)s[a++]=(l+d)*n+u+f+c[p];return s.slice(0,a)}function Rs(r){let e=new Map;for(let t=0;t<r.length;t+=3)for(let n=0;n<3;n++){let i=r[t+n],s=r[t+(n+1)%3],a=i<s?`${i},${s}`:`${s},${i}`;e.has(a)||e.set(a,[i,s])}return Uint32Array.from(Array.from(e.values()).flat())}var Is=Te(()=>{nc()});function hc(r){let e=r&1023;return e=(e|e<<16)&50331903,e=(e|e<<8)&50393103,e=(e|e<<4)&51130563,(e|e<<2)&153391689}function ch(r,e){return{lo:r.lo.map((t,n)=>Math.min(t,e.lo[n])),hi:r.hi.map((t,n)=>Math.max(t,e.hi[n])),left:r,right:e,id:-1}}function kg(r){let e=r.hi.map((t,n)=>Math.max(0,t-r.lo[n]));return e[0]*e[1]+e[1]*e[2]+e[2]*e[0]}function lh(r,e=16){if(!Number.isInteger(e)||e<2)throw new Error("Treelet width must be at least two");if(!r.length)return{bounds:new Float32Array,escape:new Int32Array,leaf:new Int32Array,count:0};let t=[1/0,1/0,1/0],n=[-1/0,-1/0,-1/0];for(let h of r)for(let d=0;d<3;d++){if(!Number.isFinite(h.lo[d])||!Number.isFinite(h.hi[d])||h.hi[d]<h.lo[d])throw new Error("Invalid terrain bounds");t[d]=Math.min(t[d],h.lo[d]),n[d]=Math.max(n[d],h.hi[d])}let i=r.map(h=>{let d=h.lo.map((f,p)=>Math.min(1023,Math.max(0,Math.floor(((f+h.hi[p])*.5-t[p])/Math.max(n[p]-t[p],1e-9)*1024))));return{...h,key:(hc(d[0])<<2|hc(d[1])<<1|hc(d[2]))>>>0}}).sort((h,d)=>h.key-d.key||h.id-d.id);for(;i.length>1;){let h=[];for(let d=0;d<i.length;d+=e){let f=i.slice(d,d+e);for(;f.length>1;){let p=f.map((x,m)=>{let b=-1,_=1/0;for(let w=0;w<f.length;w++)if(m!==w){let y=kg(ch(x,f[w]));(y<_||y===_&&w<b)&&(b=w,_=y)}return b}),g=new Set,v=[];for(let x=0;x<f.length;x++){let m=p[x];m>x&&p[m]===x&&(v.push(ch(f[x],f[m])),g.add(x),g.add(m))}if(!g.size)throw new Error("PLOC clustering did not make progress");f=f.filter((x,m)=>!g.has(m)).concat(v)}h.push(f[0])}i=h}let s=r.length*2-1,a=new Float32Array(s*6),o=new Int32Array(s),c=new Int32Array(s).fill(-1),l=0;function u(h){let d=l++;a.set(h.lo,d*6),a.set(h.hi,d*6+3),c[d]=h.id,h.id<0&&(u(h.left),u(h.right)),o[d]=l}return u(i[0]),{bounds:a,escape:o,leaf:c,count:s}}function Ng(r,e,t){for(let n of t){let i=r[e+(n[0]>=0?3:0)],s=r[e+(n[1]>=0?4:1)],a=r[e+(n[2]>=0?5:2)];if(n[0]*i+n[1]*s+n[2]*a+n[3]<0)return!1}return!0}function uh(r,e){let t=[],n=0,i=0;for(;n<r.count;){if(i++,!Ng(r.bounds,n*6,e)){n=r.escape[n];continue}r.leaf[n]>=0&&t.push(r.leaf[n]),n++}return{ids:t,visited:i}}var hh=Te(()=>{});function fh(r,e=32,t=7){let n=[],i=Math.round(r.ox/r.size),s=Math.round(r.oz/r.size);for(let a=0;a<e;a++){let o=p=>(Rt(i*53+a,s*71-a,p+t-7)+1)*.5,c=.04+o(307)*.92,l=.04+o(619)*.92,u=r.ox+c*r.size,h=r.oz+l*r.size,d=sc(u,h,t),f=(Rt(Math.floor(u/220),Math.floor(h/220),103+t-7)+1)*.5;d[0]<-6||d[0]>200||Math.hypot(d[1],d[2])>.65||o(821)>.35+f*.65||n.push({id:`${t}:${i}:${s}:${a}`,x:u,z:h,u:c,v:l,height:11+o(937)*14,yaw:o(1223)*Math.PI*2,tint:o(1549)})}return n}function ph(r,e,t){let n=Math.max(1,Math.hypot(r.x-e.position[0],r.y+r.height*.5-e.position[1],r.z-e.position[2])),i=r.height*e.height/(2*Math.tan(e.fov/2)*n),s=i>42?0:i>13?1:2;return t===0&&i>36?s=0:t===1&&i>11&&i<48?s=1:t===2&&i<15&&(s=2),s}function mh(r){let e=[],t=(i,s,a)=>e.push(...i,...s,...a);function n(i,s,a,o,c,l=0){for(let u=0;u<o;u++){let h=u/o*Math.PI*2,d=(u+1)/o*Math.PI*2,f=[Math.cos(h)*i,s,Math.sin(h)*i],p=[Math.cos(d)*i,s,Math.sin(d)*i],g=[Math.cos(h)*l,a,Math.sin(h)*l],v=[Math.cos(d)*l,a,Math.sin(d)*l],x=[Math.cos((h+d)/2),i/(a-s),Math.sin((h+d)/2)],m=Math.hypot(...x),b=x.map(_=>_/m);t(f,b,c),t(g,b,c),t(p,b,c),l&&(t(p,b,c),t(g,b,c),t(v,b,c)),t(p,[0,-1,0],c),t([0,s,0],[0,-1,0],c),t(f,[0,-1,0],c)}}if(r===2)for(let i=0;i<2;i++){let s=i*Math.PI/2,a=Math.cos(s),o=Math.sin(s),c=[-o,0,a],l=[.09,.26,.12];for(let u of[[-.24,.14],[0,1],[.24,.14]])t([u[0]*a,u[1],u[0]*o],c,l);for(let u of[[-.025,0],[-.025,.2],[.025,.2],[-.025,0],[.025,.2],[.025,0]])t([u[0]*a,u[1],u[0]*o],c,[.23,.14,.07])}else n(.026,0,.76,r===0?8:5,[.26,.16,.08],.012),r===0?(n(.25,.18,.68,8,[.08,.25,.12]),n(.2,.38,.86,8,[.1,.29,.14]),n(.14,.6,1,8,[.13,.34,.17])):(n(.25,.18,.77,5,[.09,.27,.13]),n(.16,.5,1,5,[.12,.32,.16]));return Float32Array.from(e)}function xh(r,e,t,n,i){let s=n*r,a=i*r,o=Math.min(r-2,Math.floor(s/2)*2),c=Math.min(r-2,Math.floor(a/2)*2),l=(o===0?e&1:0)|(o===r-2?e&2:0)|(c===0?e&4:0)|(c===r-2?e&8:0),u=`${t}:${l}`,h=dh.get(u);if(!h){let p=yi(2,l,t);h=[];for(let g=0;g<p.length;g+=3)h.push(Array.from(p.subarray(g,g+3),v=>[v%3,Math.floor(v/3)]));dh.set(u,h)}let d=s-o,f=a-c;for(let p of h){let[g,v,x]=p,m=(v[1]-x[1])*(g[0]-x[0])+(x[0]-v[0])*(g[1]-x[1]),b=((v[1]-x[1])*(d-x[0])+(x[0]-v[0])*(f-x[1]))/m,_=((x[1]-g[1])*(d-x[0])+(g[0]-x[0])*(f-x[1]))/m,w=1-b-_;if(Math.min(b,_,w)>=-1e-6)return{ids:p.map(([y,P])=>(c+P)*(r+1)+o+y),weights:[b,_,w]}}throw new Error("Tree root is outside its terrain triangle")}var dh,gh=Te(()=>{Pn();Is();dh=new Map});var yh,vh=Te(()=>{yh=`struct Vertex { position:vec4<f32>, normal:vec4<f32> }
struct Tree { centerScale:vec4<f32>, style:vec4<f32>, samples:vec4<u32>, weights:vec4<f32> }
struct Frame { vp:mat4x4<f32>, camera:vec4<f32>, sun:vec4<f32>, pad:vec4<f32>, settings:vec4<f32> }
@group(0) @binding(0) var<storage,read> terrain:array<Vertex>;
@group(0) @binding(1) var<storage,read> trees:array<Tree>;
@group(0) @binding(2) var<uniform> frame:Frame;
struct Out { @builtin(position) clip:vec4<f32>, @location(0) normal:vec3<f32>, @location(1) color:vec3<f32>, @location(2) @interpolate(flat) style:vec4<f32> }
@vertex fn vertex(@location(0) p:vec3<f32>,@location(1) n:vec3<f32>,@location(2) color:vec3<f32>,@builtin(instance_index) id:u32)->Out{
 let tree=trees[id];let c=cos(tree.style.x);let s=sin(tree.style.x);
 let height=dot(vec3<f32>(terrain[tree.samples.x].position.y,terrain[tree.samples.y].position.y,terrain[tree.samples.z].position.y),tree.weights.xyz);
 let local=vec3<f32>(p.x*c-p.z*s,p.y,p.x*s+p.z*c)*tree.centerScale.w;
 var clip=frame.vp*vec4<f32>(vec3<f32>(tree.centerScale.x,height-.15,tree.centerScale.z)+local,1);clip.z=(clip.z+clip.w)*.5;
 return Out(clip,vec3<f32>(n.x*c-n.z*s,n.y,n.x*s+n.z*c),color,tree.style);
}
@fragment fn fragment(input:Out)->@location(0) vec4<f32>{
 // Screen-door fade avoids transparent sorting and keeps correct tree depth.
 let noise=fract(sin(dot(floor(input.clip.xy),vec2<f32>(12.9898,78.233)))*43758.5453);if(noise>input.style.z){discard;}
 var color=input.color*(.8+input.style.y*.4);
 if(frame.settings.y>.5){var colors=array<vec3<f32>,3>(vec3<f32>(1,.3,.18),vec3<f32>(1,.65,.2),vec3<f32>(.2,.7,.9));color=colors[u32(input.style.w)];}
 let light=.35+.8*abs(dot(normalize(input.normal),normalize(frame.sun.xyz)));
 return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
`});var Hg,Ds,bh=Te(()=>{gh();Pn();lc();vh();Hg=yh,Ds=class{constructor(e){this.terrain=e,this.enabled=!0,this.distance=1400,this.limit=16e3,this.cache=new Map,this.previous=new Map,this.data=new ArrayBuffer(this.limit*64),this.lastPlan=null,this.lastView="",this.stats={trees:0,triangles:0,draws:0}}async initialize(){let e=this.terrain,t=e.device;this.buffer=t.createBuffer({size:this.data.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});let n=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]});this.group=t.createBindGroup({layout:n,entries:[{binding:0,resource:{buffer:e.atlas}},{binding:1,resource:{buffer:this.buffer}},{binding:2,resource:{buffer:e.frameParams}}]});let i=t.createShaderModule({code:Hg}),s=await i.getCompilationInfo();if(s.messages.some(a=>a.type==="error"))throw new Error(s.messages.map(a=>a.message).join(`
`));return this.pipeline=await t.createRenderPipelineAsync({layout:t.createPipelineLayout({bindGroupLayouts:[n]}),vertex:{module:i,entryPoint:"vertex",buffers:[{arrayStride:36,attributes:[{shaderLocation:0,offset:0,format:"float32x3"},{shaderLocation:1,offset:12,format:"float32x3"},{shaderLocation:2,offset:24,format:"float32x3"}]}]},fragment:{module:i,entryPoint:"fragment",targets:[{format:e.format}]},primitive:{topology:"triangle-list",cullMode:"none"},depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}}),this.meshes=[0,1,2].map(a=>{let o=mh(a),c=t.createBuffer({size:o.byteLength,usage:GPUBufferUsage.VERTEX,mappedAtCreation:!0});return new Float32Array(c.getMappedRange()).set(o),c.unmap(),{buffer:c,count:o.length/9}}),this}tileTrees(e,t){let n=`${this.terrain.seed}:${e.ox}:${e.oz}`,i=this.cache.get(n);if(!i){i={trees:fh(e,32,this.terrain.seed),time:t};for(let s of i.trees)s.y=kt(s.x,s.z,this.terrain.seed);this.cache.set(n,i)}if(i.time=t,this.cache.size>512){let s;for(let a of this.cache)a[0]!==n&&(!s||a[1].time<s[1].time)&&(s=a);s&&this.cache.delete(s[0])}return i}prefetch(e,t){let n=this.terrain,i=Math.min(this.distance,e.far);(this.warmSelection!==n.selected||this.warmDistance!==i||this.warmSeed!==n.seed)&&(this.warmSelection=n.selected,this.warmDistance=i,this.warmSeed=n.seed,this.warmTiles=Array.from(n.prefetchIds||[]).map(a=>({tile:n.tiles[a],distance:Nt(n.tiles[a],e.position)})).filter(a=>a.distance<=i).sort((a,o)=>a.distance-o.distance).slice(0,512),this.warmAt=0);let s=0;for(;this.warmAt<this.warmTiles.length&&s<2;){let{tile:a}=this.warmTiles[this.warmAt++];this.cache.has(`${n.seed}:${a.ox}:${a.oz}`)||(this.tileTrees(a,t),s++)}}prepare(e,t,n){if(!this.enabled){(!this.draws||this.draws.length)&&(this.stats={trees:0,triangles:0,draws:0},this.draws=[]),this.lastPlan=null;return}this.prefetch(e,n);let i=this.terrain;if(this.lastPlan===i.drawPlan&&n-this.lastTime<100)return;let s=[...e.position,e.height,e.fov,e.far,this.distance,...t.flat()].join(",");if(this.lastPlan===i.drawPlan&&s===this.lastView)return;this.lastPlan=i.drawPlan,this.lastView=s,this.lastTime=n;let a=[],o=Math.min(this.distance,e.far),c=i.lastMasks;for(let g of i.visibleIds){let v=i.lastActual.get(g);if(v===void 0)continue;let x=i.tiles[g];if(Nt(x,e.position)>o)continue;let m=this.tileTrees(x,n);for(let b of m.trees){let _=b.y+b.height*.5,w=Math.hypot(b.x-e.position[0],_-e.position[1],b.z-e.position[2]);w>o||t.some(y=>y[0]*b.x+y[1]*_+y[2]*b.z+y[3]<-b.height*.6)||a.push({tree:b,id:g,level:v,distance:w})}}a.sort((g,v)=>g.distance-v.distance);let l=[[],[],[]],u=new Map;for(let g of a.slice(0,this.limit)){let v=ph(g.tree,e,this.previous.get(g.tree.id));l[v].push(g),u.set(g.tree.id,v)}this.previous=u;let h=new Float32Array(this.data),d=new Uint32Array(this.data),f=0,p=0;this.draws=[];for(let g=0;g<3;g++){let v=f;for(let{tree:x,id:m,level:b,distance:_}of l[g]){let w=i.drawEntries.get(m),y=i.options.maxDivs>>b,P=i.options.maxDivs>>w.lod,C=P/y,F=xh(y,c.get(m),i.algorithm,x.u,x.v),k=f++*16;h[k]=x.x,h[k+1]=0,h[k+2]=x.z,h[k+3]=x.height,h[k+4]=x.yaw,h[k+5]=x.tint,h[k+6]=Math.min(1,(o-_)/(o*.15)),h[k+7]=g;for(let H=0;H<3;H++){let B=F.ids[H];d[k+8+H]=w.base+Math.floor(B/(y+1))*C*(P+1)+B%(y+1)*C,h[k+12+H]=F.weights[H]}}f>v&&(this.draws.push({lod:g,first:v,instances:f-v}),p+=(f-v)*this.meshes[g].count/3)}f&&i.device.queue.writeBuffer(this.buffer,0,this.data,0,f*64),this.stats={trees:f,triangles:p,draws:this.draws.length,cachedTiles:this.cache.size,lods:l.map(g=>g.length),limited:a.length>this.limit}}render(e){if(!(!this.enabled||!this.draws?.length)){e.setPipeline(this.pipeline),e.setBindGroup(0,this.group);for(let t of this.draws){let n=this.meshes[t.lod];e.setVertexBuffer(0,n.buffer),e.draw(n.count,t.instances,0,t.first)}}}dispose(){this.buffer?.destroy();for(let e of this.meshes||[])e.buffer.destroy()}}});function zs(r,e,t=.12){return r.map((n,i)=>i<4?[n[0],n[1],n[2],n[3]+e*t]:n)}function Fs(r,e,t=.08){return r.length!==e?.length||r.slice(0,4).some((n,i)=>n.slice(0,3).reduce((s,a,o)=>s+(a-e[i][o])**2,0)>t**2)}var dc=Te(()=>{});var wh,_h=Te(()=>{wh=`struct Vertex { position: vec4<f32>, normal: vec4<f32> }
struct BuildParams { origin: vec2<f32>, size: f32, divs: u32, base: u32, stride: u32, seed: u32, pad: u32 }
@group(0) @binding(0) var<storage,read_write> buildVertices: array<Vertex>;
@group(0) @binding(1) var<uniform> build: BuildParams;
@compute @workgroup_size(8,8)
fn generate(@builtin(global_invocation_id) gid: vec3<u32>) {
  if(gid.x>build.divs || gid.y>build.divs){return;}
  let xz=build.origin+vec2<f32>(gid.xy)*(build.size/f32(build.divs));
  let h=terrain_height_gradient(xz,build.seed);
  let normal=normalize(vec3<f32>(-h.y,1.0,-h.z));
  let at=build.base+gid.y*(build.divs+1u)+gid.x;
  buildVertices[at]=Vertex(vec4<f32>(xz.x,h.x,xz.y,1),vec4<f32>(normal,0));
}
// Nine samples per map tile keep the entire horizon resident independently of
// the high-detail LRU. One dispatch establishes coverage, including on turns.
@compute @workgroup_size(8,8)
fn generate_coverage(@builtin(global_invocation_id) gid: vec3<u32>) {
  let side=build.pad;
  if(gid.x>=side*3u || gid.y>=side*3u){return;}
  let tile=gid.xy/3u;
  let local=gid.xy%3u;
  let xz=build.origin+(vec2<f32>(tile)+vec2<f32>(local)*0.5)*build.size;
  let h=terrain_height_gradient(xz,build.seed);
  let normal=normalize(vec3<f32>(-h.y,1.0,-h.z));
  let at=build.base+(tile.y*side+tile.x)*9u+local.y*3u+local.x;
  buildVertices[at]=Vertex(vec4<f32>(xz.x,h.x,xz.y,1),vec4<f32>(normal,0));
}
struct Frame {
  viewProjection: mat4x4<f32>, camera: vec4<f32>, sun: vec4<f32>, reserved: vec4<f32>, settings: vec4<f32>
}
struct Instance { base:u32, storedDivs:u32, renderDivs:u32, lod:u32 }
@group(0) @binding(0) var<storage,read> renderVertices: array<Vertex>;
@group(0) @binding(1) var<storage,read> instances: array<Instance>;
@group(0) @binding(2) var<uniform> frame: Frame;
struct Varying {
  @builtin(position) clip:vec4<f32>, @location(0) world:vec3<f32>, @location(1) normal:vec3<f32>,
  @location(2) @interpolate(flat) lod:u32,
}
@vertex
fn vertex_main(@builtin(vertex_index) vertex:u32,@builtin(instance_index) instance:u32)->Varying {
  let info=instances[instance];let step=info.storedDivs/info.renderDivs;
  let x=vertex%(info.renderDivs+1u);let z=vertex/(info.renderDivs+1u);
  let v=renderVertices[info.base+z*step*(info.storedDivs+1u)+x*step];
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
`});var Wg,Bs,Mh=Te(()=>{Ps();Pn();lc();Is();hh();bh();dc();_h();Wg=hr+wh,Bs=class{constructor(e,t={}){if(this.canvas=e,this.options={worldSize:8192,tileSize:128,maxDivs:64,memoryMB:64,buildsPerFrame:8,...t},!Number.isInteger(this.options.maxDivs)||this.options.maxDivs<4||this.options.maxDivs>128||this.options.maxDivs&this.options.maxDivs-1)throw new Error("Terrain maxDivs must be a power of two from 4 to 128");let{worldSize:n,tileSize:i,memoryMB:s,buildsPerFrame:a}=this.options,o=u=>Number.isFinite(u)&&u>=1&&Number.isInteger(Math.log2(u));if(!o(n)||!o(i)||i>n||n/i>512||!Number.isFinite(s)||s<=0||!Number.isInteger(a)||a<1||a>32)throw new RangeError("Use power-of-two world/tile sizes (up to 512 tiles per side), positive memoryMB and 1\u201332 builds per frame.");let c=nh(this.options.worldSize,this.options.tileSize);this.tiles=c.tiles,this.side=c.side,this.levels=Math.log2(this.options.maxDivs);let l=performance.now();this.tree=lh(this.tiles),this.treeBuildMs=performance.now()-l,this.settings={maxDivs:this.options.maxDivs,levels:this.levels,pixelError:2.5,nearRadius:110,uniform:!1,infinite:!1},this.origin=[0,0],this.entries=new Map,this.free=[],this.templates=new Map,this.previous=new Map,this.selected=new Map,this.detailSelected=new Map,this.visibleIds=[],this.needsSelection=!0,this.lastSelect=-1/0,this.generation=0,this.seed=7,this.algorithm="mc33",this.stats={generated:0,samples:0,cacheHits:0,evicted:0,windowShifts:0,gpuMs:null,treeBuildMs:this.treeBuildMs},this.errors=[],this.disposed=!1,this.drawPlan=null,this.planAlgorithm=null,this.viewState=[],this.frameData=new Float32Array(32)}async initialize(){let e=await mi(this);this.stride=(this.options.maxDivs+1)**2;let t=this.stride*32,n=Math.min(e.limits.maxStorageBufferBindingSize,e.limits.maxBufferSize,this.options.memoryMB*1024**2);if(this.coverageBytes=this.tiles.length*9*32,this.capacity=Math.min(1024,Math.floor((n-this.coverageBytes)/t)),this.capacity<16)throw new Error("GPU memory budget is too small for map coverage and 16 detail patches");this.coverageBase=this.capacity*this.stride,this.coverageGeneration=-1,this.coverageOrigin=[],this.coverageEntries=this.tiles.map(h=>({id:h.id,base:this.coverageBase+h.id*9,lod:this.levels-1,ready:!0})),this.atlas=e.createBuffer({label:"Resident terrain samples",size:this.capacity*t+this.coverageBytes,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_SRC}),this.free=Array.from({length:this.capacity},(h,d)=>this.capacity-d-1),this.buildBudget=this.options.buildsPerFrame,this.buildParams=e.createBuffer({size:(this.buildBudget+1)*256,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.frameParams=e.createBuffer({size:128,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.instanceBuffer=e.createBuffer({size:this.tiles.length*16,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});let i=e.createShaderModule({label:"Terrain field, generation and render",code:Wg}),s=await i.getCompilationInfo(),a=s.messages.filter(h=>h.type==="error");if(a.length)throw new Error(a.map(h=>`${h.lineNum}: ${h.message}`).join(`
`));let o=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"storage"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform",hasDynamicOffset:!0,minBindingSize:32}}]});this.compute=await e.createComputePipelineAsync({layout:e.createPipelineLayout({bindGroupLayouts:[o]}),compute:{module:i,entryPoint:"generate"}}),this.coverageCompute=await e.createComputePipelineAsync({layout:e.createPipelineLayout({bindGroupLayouts:[o]}),compute:{module:i,entryPoint:"generate_coverage"}}),this.buildGroup=e.createBindGroup({layout:o,entries:[{binding:0,resource:{buffer:this.atlas}},{binding:1,resource:{buffer:this.buildParams,size:32}}]});let c=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),u={layout:e.createPipelineLayout({bindGroupLayouts:[c]}),vertex:{module:i,entryPoint:"vertex_main"},fragment:{module:i,entryPoint:"fragment_main",targets:[{format:this.format}]},depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}};if(this.renderPipeline=await e.createRenderPipelineAsync({...u,primitive:{topology:"triangle-list",cullMode:"back"}}),this.linePipeline=await e.createRenderPipelineAsync({...u,primitive:{topology:"line-list"}}),this.renderGroup=e.createBindGroup({layout:c,entries:[{binding:0,resource:{buffer:this.atlas}},{binding:1,resource:{buffer:this.instanceBuffer}},{binding:2,resource:{buffer:this.frameParams}}]}),this.stats.atlasBytes=this.capacity*t+this.coverageBytes,this.stats.coverageBytes=this.coverageBytes,this.stats.coverageTiles=this.tiles.length,this.timers=[],e.features.has("timestamp-query"))for(let h=0;h<3;h++)this.timers.push({busy:!1,queries:e.createQuerySet({type:"timestamp",count:4}),resolve:e.createBuffer({size:32,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read:e.createBuffer({size:32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})});return this.frameIndex=0,this.resize(),this.vegetation=await new Ds(this).initialize(),this}resize(){let{width:e,height:t}=gi(this.canvas,this.options);this.canvas.width===e&&this.canvas.height===t&&this.depth||(this.canvas.width=e,this.canvas.height=t,this.depth?.destroy(),this.depth=this.device.createTexture({size:[e,t],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),this.needsSelection=!0)}configure(e){Object.assign(this.settings,e),this.previous.clear(),this.needsSelection=!0}updateWindow(e){let t=this.settings.infinite?ih(e.position,this.options.worldSize,this.options.tileSize):[0,0],n=t[0]-this.origin[0],i=t[1]-this.origin[1];if(!n&&!i)return;let s=n/this.options.tileSize,a=i/this.options.tileSize;rh(this.tiles,n,i),this.entries=ac(this.entries,this.side,s,a,o=>{this.free.push(o.slot),this.stats.evicted++});for(let[o,c]of this.entries)c.id=o;this.previous=ac(this.previous,this.side,s,a),this.selected.clear(),this.visibleIds=[],this.lastActual=new Map,this.origin=t,this.needsSelection=!0,this.stats.windowShifts++}select(e,t,n){let i=performance.now(),s=uh(this.tree,sh(zs(t,Math.min(e.far,this.options.tileSize*8)),this.origin));s.ids=s.ids.filter(p=>Nt(this.tiles[p],e.position)<=e.far);let a=new Set(s.ids),o=Math.floor((e.player[0]-this.origin[0]+this.options.worldSize/2)/this.options.tileSize),c=Math.floor((e.player[2]-this.origin[1]+this.options.worldSize/2)/this.options.tileSize),l=Math.min(e.far,this.options.tileSize*Math.sqrt(this.capacity*.35/Math.PI)),u=Math.ceil(l/this.options.tileSize);this.prefetchIds=new Set;for(let p=c-u;p<=c+u;p++)for(let g=o-u;g<=o+u;g++)g>=0&&p>=0&&g<this.side&&p<this.side&&Nt(this.tiles[p*this.side+g],e.player)<=l&&(a.add(p*this.side+g),this.prefetchIds.add(p*this.side+g));let h=Array.from(a),d=ah(this.tiles,h,this.side,e,this.settings,this.previous),f=h.filter(p=>d.levels.get(p)<this.levels-1);this.stats.capacityLimited=f.length>this.capacity,f.length>this.capacity&&f.sort((p,g)=>Nt(this.tiles[p],e.position)-Nt(this.tiles[g],e.position)),this.detailSelected=new Map(f.slice(0,this.capacity).map(p=>[p,d.levels.get(p)])),this.visibleIds=s.ids,this.selected=d.levels,this.previous=new Map(d.levels),this.stats.selectionMs=performance.now()-i,this.stats.visited=s.visited,this.stats.visible=s.ids.length,this.stats.requested=h.length,this.stats.prefetchRadius=l,this.stats.prefetched=d.levels.size-this.visibleIds.length,this.lastSelect=n,this.selectionPlanes=t.map(p=>p.slice()),this.needsSelection=!1,this.drawDirty=!0}getTemplate(e,t){let n=`${this.algorithm}:${e}:${t}`;if(this.templates.has(n))return this.templates.get(n);let i=yi(e,t,this.algorithm),s=Rs(i),a=this.device;function o(l,u){let h=a.createBuffer({size:l.byteLength,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0,label:u});return new Uint32Array(h.getMappedRange()).set(l),h.unmap(),h}let c={triangles:i.length/3,indexCount:i.length,lineCount:s.length,index:o(i,"Terrain topology"),line:o(s,"Terrain wire topology")};return this.templates.set(n,c),c}allocate(e,t,n){if(!this.free.length){let s=null;for(let a of this.entries.values())!t.has(a.id)&&(!s||a.touched<s.touched)&&(s=a);if(!s)return null;this.entries.delete(s.id),this.free.push(s.slot),this.stats.evicted++}let i={id:e,slot:this.free.pop(),lod:this.levels-1,touched:n,ready:!1,generation:this.generation};return i.base=i.slot*this.stride,this.entries.set(e,i),i}planBuilds(e,t){if(this.stats.pending===0&&!this.drawDirty&&this.drawPlan&&this.planGeneration===this.generation)return[];let n=new Set(this.detailSelected.keys()),i=[],s=[];for(let[l,u]of this.detailSelected){let h=this.entries.get(l),d=Nt(this.tiles[l],e.position);h&&(h.touched=t),!h||!h.ready||h.generation!==this.generation?i.push({id:l,lod:u,distance:d}):h.lod>u?s.push({id:l,lod:u,distance:d,refine:!0}):this.stats.cacheHits++}i.sort((l,u)=>l.distance-u.distance),s.sort((l,u)=>Number(u.refine)-Number(l.refine)||l.distance-u.distance);let a=new Set(this.visibleIds),o=[],c=[i,s].flatMap(l=>l.filter(u=>a.has(u.id)).concat(l.filter(u=>!a.has(u.id))));for(let l of c){if(o.length>=this.buildBudget)break;let u=this.entries.get(l.id)||this.allocate(l.id,n,t);u&&o.push({entry:u,lod:l.lod})}return this.stats.pending=i.length+s.length-o.length,o}viewChanged(e,t){let n=0,i=!1,s=a=>{this.viewState[n]!==a&&(i=!0),this.viewState[n++]=a};e.position.forEach(s),e.player.forEach(s),[e.height,e.fov,e.far].forEach(s);for(let a of t)a.forEach(s);return i}prepareDrawPlan(){let e=new Map,t=new Map;for(let[p,g]of this.selected){let v=this.entries.get(p),x=v?.ready&&v.generation===this.generation?v:this.coverageEntries[p];e.set(p,Math.max(g,x.lod)),t.set(p,x)}oc(e,this.side,"coarsen");let n=cc(e,this.side),i=new Map;this.lastActual=e,this.lastMasks=n,this.drawEntries=t,this.drawDirty=!1;let s=new Uint32Array(this.visibleIds.length*4);for(let p=0;p<this.visibleIds.length;p++){let g=this.visibleIds[p],v=t.get(g),x=p*4;s[x]=g,s[x+1]=v.base,s[x+2]=v.lod,s[x+3]=e.get(g)<<4|n.get(g)}if(this.drawPlan&&this.drawState?.length===s.length&&s.every((p,g)=>this.drawState[g]===p)&&this.planAlgorithm===this.algorithm&&this.planGeneration===this.generation){this.stats.planReuses=(this.stats.planReuses||0)+1;return}this.drawState=s;let a=new Array(this.levels).fill(0),o=0,c=0,l=0,u=0;for(let p of this.visibleIds){let g=e.get(p);if(g===void 0)continue;let v=t.get(p),x=this.options.maxDivs>>g,m=n.get(p),b=`${x}:${m}`;v.base>=this.coverageBase&&c++,i.has(b)||i.set(b,{divs:x,mask:m,entries:[]}),i.get(b).entries.push({entry:v,level:g}),a[g]++,l+=(x+1)**2,m&&u++}let h=new Uint32Array(this.visibleIds.length*4),d=[],f=0;for(let p of i.values()){let g=this.getTemplate(p.divs,p.mask),v=f;for(let{entry:x,level:m}of p.entries)h.set([x.base,this.options.maxDivs>>x.lod,p.divs,m],f*4),f++;d.push({template:g,base:v,count:p.entries.length}),o+=g.triangles*p.entries.length}f&&this.device.queue.writeBuffer(this.instanceBuffer,0,h,0,f*4),Object.assign(this.stats,{triangles:o,coarseDrawn:c,drawCalls:d.length,drawn:f,histogram:a,seams:u,activeSamples:l,uniformSamples:f*(this.options.maxDivs+1)**2}),this.drawPlan=d,this.planAlgorithm=this.algorithm,this.planGeneration=this.generation,this.stats.planBuilds=(this.stats.planBuilds||0)+1}render(e,t,n,{lodColors:i=!1,wireframe:s=!1}={}){let a=performance.now();this.resize(),this.updateWindow(e),(this.needsSelection||Fs(t,this.selectionPlanes)||n-this.lastSelect>=100&&this.viewChanged(e,t))&&(this.select(e,t,n),this.viewChanged(e,t));let o=this.planBuilds(e,n),c=this.device,l=c.createCommandEncoder({label:"Adaptive terrain frame"}),u=this.frameIndex++%20===0?this.timers.find(g=>!g.busy):null;u&&(u.busy=!0);let h=this.coverageGeneration!==this.generation||this.coverageSeed!==this.seed||this.origin.some((g,v)=>g!==this.coverageOrigin[v]);if(o.length||h){let g=new ArrayBuffer((this.buildBudget+1)*256),v=new Float32Array(g),x=new Uint32Array(g);if(o.forEach(({entry:b,lod:_},w)=>{let y=this.tiles[b.id],P=w*64,C=this.options.maxDivs>>_;v[P]=y.ox,v[P+1]=y.oz,v[P+2]=y.size,x[P+3]=C,x[P+4]=b.base,x[P+5]=this.stride,x[P+6]=this.seed,b.lod=_,b.ready=!0,b.generation=this.generation,this.stats.generated++,this.stats.samples+=(C+1)**2}),h){let b=this.buildBudget*64;v[b]=this.origin[0]-this.options.worldSize/2,v[b+1]=this.origin[1]-this.options.worldSize/2,v[b+2]=this.options.tileSize,x[b+4]=this.coverageBase,x[b+6]=this.seed,x[b+7]=this.side,this.coverageOrigin=this.origin.slice(),this.coverageSeed=this.seed,this.coverageGeneration=this.generation,this.stats.coverageBuilds=(this.stats.coverageBuilds||0)+1}c.queue.writeBuffer(this.buildParams,0,g);let m=l.beginComputePass(u?{timestampWrites:{querySet:u.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});m.setPipeline(this.compute),o.forEach(({entry:b},_)=>{let w=this.options.maxDivs>>b.lod;m.setBindGroup(0,this.buildGroup,[_*256]),m.dispatchWorkgroups(Math.ceil((w+1)/8),Math.ceil((w+1)/8))}),h&&(m.setPipeline(this.coverageCompute),m.setBindGroup(0,this.buildGroup,[this.buildBudget*256]),m.dispatchWorkgroups(Math.ceil(this.side*3/8),Math.ceil(this.side*3/8))),m.end()}if((!this.drawPlan||this.drawDirty||o.length||this.planAlgorithm!==this.algorithm)&&this.prepareDrawPlan(),this.vegetation?.prepare(e,t,n),this.bundlePlan!==this.drawPlan||this.bundleTrees!==this.vegetation?.draws||this.bundleWire!==s){let g=c.createRenderBundleEncoder({colorFormats:[this.format],depthStencilFormat:"depth24plus"});g.setPipeline(s?this.linePipeline:this.renderPipeline),g.setBindGroup(0,this.renderGroup);for(let v of this.drawPlan)g.setIndexBuffer(s?v.template.line:v.template.index,"uint32"),g.drawIndexed(s?v.template.lineCount:v.template.indexCount,v.count,0,0,v.base);this.vegetation?.render(g),this.renderBundle=g.finish(),this.bundlePlan=this.drawPlan,this.bundleTrees=this.vegetation?.draws,this.bundleWire=s,this.stats.bundleBuilds=(this.stats.bundleBuilds||0)+1}let d=this.frameData;d.set(e.viewProjection,0),d.set([...e.position,1],16),d.set([.5,.85,.35,0],20),d.set([this.stride,Number(i),Number(s),e.far],28),c.queue.writeBuffer(this.frameParams,0,d);let f={colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.71,g:.78,b:.82,a:1},loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}};u&&(f.timestampWrites={querySet:u.queries,beginningOfPassWriteIndex:2,endOfPassWriteIndex:3});let p=l.beginRenderPass(f);if(p.executeBundles([this.renderBundle]),p.end(),u){let g=o.length||h,v=g?0:2,x=g?4:2;l.resolveQuerySet(u.queries,v,x,u.resolve,0),l.copyBufferToBuffer(u.resolve,0,u.read,0,x*8)}return c.queue.submit([l.finish()]),u&&u.read.mapAsync(GPUMapMode.READ).then(()=>{let g=new BigUint64Array(u.read.getMappedRange()),v=o.length||h?Number(g[1]-g[0])/1e6:0,x=o.length||h?Number(g[3]-g[2])/1e6:Number(g[1]-g[0])/1e6;this.stats.gpuMs=x,this.stats.generationGpuMs=v,u.read.unmap(),u.busy=!1}).catch(g=>{u.busy=!1,this.disposed||this.errors.push(g.message)}),this.stats.cpuMs=performance.now()-a,this.stats.resident=this.entries.size,this.stats.builtThisFrame=o.length,this.stats.vegetation=this.vegetation?.stats,this.stats}async readPatch(e){let t=this.entries.get(e),n=t?.ready&&t.generation===this.generation?t:this.drawEntries?.get(e);if(!n?.ready)throw new Error("Patch is not ready");let i=this.options.maxDivs>>n.lod,s=(i+1)**2,a=this.device.createBuffer({size:s*32,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});try{let o=this.device.createCommandEncoder();o.copyBufferToBuffer(this.atlas,n.base*32,a,0,s*32),this.device.queue.submit([o.finish()]),await a.mapAsync(GPUMapMode.READ);let c=new Float32Array(a.getMappedRange()).slice();return a.unmap(),{data:c,divs:i}}finally{a.destroy()}}dispose(){if(!this.disposed){this.disposed=!0,this.vegetation?.dispose();for(let e of this.templates.values())e.index.destroy(),e.line.destroy();for(let e of this.timers||[])e.queries.destroy(),e.resolve.destroy(),e.read.destroy();for(let e of[this.atlas,this.buildParams,this.frameParams,this.instanceBuffer])e?.destroy();this.depth?.destroy(),xi(this)}}}});var Sh={};pr(Sh,{startDemo:()=>Xg});async function Xg(){"use strict";let r=G=>document.getElementById(G),e=r("status"),t=r("loading");window.matchMedia("(max-width:800px), (max-height:600px)").matches&&(r("terrainControls").open=!1);let n=Array.from(document.querySelectorAll("header input,header select,header button"));n.forEach(G=>{G.disabled=!0});function i(G,q=!1){e.textContent=G,e.classList.toggle("error",q)}let s;try{await new Promise(G=>requestAnimationFrame(G)),s=await new Bs(r("terrain")).initialize()}catch(G){i(G.message,!0),t.textContent=G.message;return}let a=new He(60,1,1,1800),o=new yt,c=new me,l=new Set,u=new E,h=new E,d=new E,f=new E(0,1,0),p=0,g=-.18,v=!1,x=!1,m=null,b=performance.now(),_=0,w=0,y=16.7,P=0,C=null,F=0,k=0,H=140,B=["#f04038","#fca52e","#cccf33","#37b679","#3499e5","#9161e5"];function L(){a.position.set(-250,kt(-250,450)+140,450),p=0,g=-.18,l.clear(),s.needsSelection=!0}L();function D(){x=!1,r("tour").textContent="Fly through map"}function z(){return Number(l.has("KeyE")||l.has("Space"))-Number(l.has("KeyQ")||l.has("KeyC"))}r("terrain").addEventListener("pointerdown",G=>{v=!0,r("terrain").focus(),r("terrain").setPointerCapture(G.pointerId)}),r("terrain").addEventListener("pointerup",()=>{v=!1}),r("terrain").addEventListener("pointermove",G=>{!v||m||(p-=G.movementX*.003,g=Math.max(-1.4,Math.min(1.3,g-G.movementY*.003)))}),window.addEventListener("keydown",G=>{/INPUT|SELECT|BUTTON/.test(G.target.tagName)||(l.add(G.code),["Space","ArrowUp","ArrowDown"].includes(G.code)&&G.preventDefault())}),window.addEventListener("keyup",G=>l.delete(G.code)),window.addEventListener("blur",()=>{l.clear(),v=!1}),r("error").addEventListener("input",()=>{r("errorValue").textContent=`${r("error").value} px`,s.configure({pixelError:Number(r("error").value)})}),r("radius").addEventListener("input",()=>{r("radiusValue").textContent=`${r("radius").value} m`,s.configure({nearRadius:Number(r("radius").value)})}),r("sampling").addEventListener("change",()=>s.configure({uniform:r("sampling").value==="uniform"})),r("trees").addEventListener("change",()=>{s.vegetation.enabled=r("trees").checked,s.vegetation.lastPlan=null}),r("treeDistance").addEventListener("input",()=>{s.vegetation.distance=Number(r("treeDistance").value),s.vegetation.lastPlan=null,r("treeDistanceValue").textContent=`${r("treeDistance").value} m`}),r("surface").addEventListener("change",()=>{s.algorithm=r("surface").value}),r("fov").addEventListener("change",()=>{a.fov=Math.max(25,Math.min(100,Number(r("fov").value)||60)),r("fov").value=a.fov,s.needsSelection=!0}),r("distance").addEventListener("input",()=>{a.far=Number(r("distance").value),r("distanceValue").textContent=`${a.far} m`,s.needsSelection=!0}),r("infinite").addEventListener("change",()=>{s.configure({infinite:r("infinite").checked}),D(),r("worldLabel").textContent=r("infinite").checked?"Infinite world \xB7 samples down to 2 m":"8 \xD7 8 km world \xB7 samples down to 2 m",r("infinite").checked||L(),r("report").style.display="none"}),r("tour").addEventListener("click",()=>{x?D():(x=!0,F=0,k=p,H=Math.max(20,a.position.y-kt(a.position.x,a.position.z)),r("tour").textContent="Stop flight"),l.clear(),r("terrain").focus()}),r("reset").addEventListener("click",()=>{D(),L(),r("report").style.display="none"});function T(){D(),L(),m={phase:"warm-adaptive",start:performance.now(),adaptive:[],uniform:[],savedUniform:s.settings.uniform},s.configure({uniform:!1}),n.forEach(G=>{G.disabled=!0}),r("report").style.display="block",r("report").textContent="Warming adaptive terrain at a fixed camera\u2026"}r("benchmark").addEventListener("click",T);function I(G,q){if(!m)return;let O=G-m.start,de=m;if(de.phase.startsWith("warm")){if(O>8e3){r("report").textContent="Benchmark could not settle within 8 seconds. Try a smaller visible range.",Z();return}q.pending===0&&O>1500&&(de.phase=de.phase==="warm-adaptive"?"adaptive":"uniform",de.start=G)}else if(de[de.phase].push({frame:y,cpu:q.cpuMs,gpu:q.gpuMs,triangles:q.triangles,vertices:q.activeSamples,draws:q.drawCalls}),O>2e3)if(de.phase==="adaptive")de.phase="warm-uniform",de.start=G,s.configure({uniform:!0}),r("report").textContent="Adaptive measured. Warming uniform full detail at the same camera\u2026";else{let fe=(ve,Q)=>{let te=ve.map(ne=>ne[Q]).filter(Number.isFinite);return te.length?te.reduce((ne,ue)=>ne+ue,0)/te.length:null},ee=de.adaptive,le=de.uniform,ge=100*(1-fe(ee,"triangles")/fe(le,"triangles")),Me=(ve,Q)=>`${Q}
  frame ${fe(ve,"frame").toFixed(2)} ms \xB7 CPU ${fe(ve,"cpu").toFixed(2)} ms
  GPU render ${fe(ve,"gpu")?.toFixed(2)??"unavailable"} ms
  ${Math.round(fe(ve,"triangles")).toLocaleString()} triangles \xB7 ${Math.round(fe(ve,"draws"))} draws`;r("report").textContent=`Same camera \xB7 warm cache

${Me(ee,"Adaptive")}

${Me(le,"Uniform full detail")}

${ge.toFixed(1)}% fewer triangles
Frame time includes browser scheduling.
GPU timestamps exclude generation.`,Z()}}function Z(){m&&(s.configure({uniform:m.savedUniform}),m=null,n.forEach(G=>{G.disabled=!1}))}function $(){let G=r("map").getContext("2d"),q=200,O=s.options.worldSize;G.fillStyle="#263a43",G.fillRect(0,0,q,q);for(let[ee,le]of s.lastActual||[]){let ge=s.tiles[ee];G.fillStyle=B[le],G.fillRect((ge.ox-s.origin[0]+O/2)/O*q,(ge.oz-s.origin[1]+O/2)/O*q,ge.size/O*q+.3,ge.size/O*q+.3)}let de=(a.position.x-s.origin[0]+O/2)/O*q,fe=(a.position.z-s.origin[1]+O/2)/O*q;G.strokeStyle="#fff",G.lineWidth=1.5,G.beginPath(),G.moveTo(de,fe),G.lineTo(de+Math.sin(p)*18,fe-Math.cos(p)*18),G.stroke(),G.fillStyle="#fff",G.beginPath(),G.arc(de,fe,3,0,Math.PI*2),G.fill(),r("positionLabel").textContent=`x ${Math.round(a.position.x)} \xB7 z ${Math.round(a.position.z)} \xB7 altitude ${Math.round(a.position.y)} m`}function U(G,q){if(G-_<250)return;_=G,r("frameTime").textContent=`${y.toFixed(1)} / ${q.gpuMs?.toFixed(2)??"\u2014"} ms`,r("triangleCount").textContent=q.triangles.toLocaleString(),r("drawCount").textContent=`${q.drawCalls} / ${q.drawn} tiles`,r("sampleCount").textContent=`${Math.round(q.activeSamples/1e3)}k / ${Math.round(q.uniformSamples/1e3)}k`,r("cacheCount").textContent=`${q.resident} / ${s.capacity} \xB7 ${Math.round(q.atlasBytes/1024**2)} MB`,r("buildCount").textContent=`${q.builtThisFrame} / ${q.pending}`;let O=q.vegetation;r("treeCount").textContent=`${O?.trees||0} / ${O?.draws||0}`,r("treeLods").textContent=(O?.lods||[0,0,0]).join(" / "),r("histogram").replaceChildren(...q.histogram.map((de,fe)=>{let ee=document.createElement("div");return ee.style.background=B[fe],ee.style.flex=String(de),ee.title=`LOD ${fe}: ${de} tiles`,ee})),(q.pending===0||q.drawn>0)&&(t.style.display="none"),s.errors.length?(C=s.errors.at(-1),i(C,!0)):q.capacityLimited?i("Detail cache full; nearby detail has priority and coarse terrain keeps the horizon covered."):i(`${s.settings.infinite?`Infinite \xB7 ${q.windowShifts} areas streamed \xB7 `:""}${q.seams} stitched tiles \xB7 CPU submit ${P.toFixed(2)} ms \xB7 ${q.pending?"refining detail\u2026":"cache settled"}`),e.dataset.pending=q.pending,e.dataset.errors=s.errors.length,e.dataset.drawn=q.drawn,e.dataset.altitude=a.position.y,e.dataset.x=a.position.x,e.dataset.z=a.position.z,e.dataset.trees=O?.trees||0,e.dataset.treeDraws=O?.draws||0,$()}function W(G){if(s.disposed)return;w=requestAnimationFrame(W);let q=Math.min(.05,(G-b)/1e3),O=G-b;if(b=G,y=y*.94+O*.06,x&&!m)if(F+=q,H=Math.max(20,Math.min(1400,H+z()*q*130)),s.settings.infinite){a.position.x+=Math.sin(k)*220*q,a.position.z-=Math.cos(k)*220*q;let ee=kt(a.position.x,a.position.z)+H;a.position.y+=(ee-a.position.y)*(1-Math.exp(-4*q))}else{let ee=F*.07;a.position.x=Math.sin(ee)*1500,a.position.z=Math.cos(ee*.8)*1500,a.position.y=kt(a.position.x,a.position.z)+H+Math.sin(ee*.7)*70,p=ee+.9,g=-.2}else if(!m){h.set(Math.sin(p),0,-Math.cos(p)),d.set(Math.cos(p),0,Math.sin(p));let ee=new E;if(l.has("KeyW")&&ee.add(h),l.has("KeyS")&&ee.sub(h),l.has("KeyD")&&ee.add(d),l.has("KeyA")&&ee.sub(d),ee.y=z(),ee.lengthSq()&&a.position.addScaledVector(ee.normalize(),q*(l.has("ShiftLeft")?450:130)),!s.settings.infinite){let le=s.options.worldSize/2-20;a.position.x=Math.max(-le,Math.min(le,a.position.x)),a.position.z=Math.max(-le,Math.min(le,a.position.z))}}a.position.y=Math.max(kt(a.position.x,a.position.z)+8,Math.min(1800,a.position.y)),u.set(Math.sin(p)*Math.cos(g),Math.sin(g),-Math.cos(p)*Math.cos(g)),a.up.copy(f),a.lookAt(a.position.clone().add(u)),a.aspect=r("terrain").clientWidth/r("terrain").clientHeight,a.updateProjectionMatrix(),a.updateMatrixWorld(),c.multiplyMatrices(a.projectionMatrix,a.matrixWorldInverse),o.setFromProjectionMatrix(c);let de=o.planes.map(ee=>[ee.normal.x,ee.normal.y,ee.normal.z,ee.constant]),fe={position:a.position.toArray(),player:a.position.toArray(),height:s.canvas.height,fov:a.fov*Math.PI/180,far:a.far,viewProjection:c.elements};try{let ee=s.render(fe,de,G,{lodColors:r("colors").checked,wireframe:r("wire").checked});P=P*.94+ee.cpuMs*.06,U(G,ee),I(G,ee)}catch(ee){cancelAnimationFrame(w),i(ee.message,!0),t.style.display="block",t.textContent=ee.message,console.error(ee)}}n.forEach(G=>{G.disabled=!1}),w=requestAnimationFrame(W),window.addEventListener("pagehide",()=>{cancelAnimationFrame(w),s.dispose()})}var Eh=Te(()=>{or();Mh();Pn()});function Yg(r,e,t,n=0){let i=(Math.imul(r,73856093)^Math.imul(e,19349663)^Math.imul(t,83492791)^Math.imul(n+31,1597334677))>>>0;return i=Math.imul(i^i>>>16,2146121005)>>>0,i=Math.imul(i^i>>>15,2221713035)>>>0,(i^i>>>16)>>>0}function $g(r){let e=r>>>0;return()=>{e=e+1831565813>>>0;let t=Math.imul(e^e>>>15,e|1);return t^=t+Math.imul(t^t>>>7,t|61),((t^t>>>14)>>>0)/4294967296}}function Zg(r){let e=r(),t=r()*Math.PI*2,n=r()*Math.PI*2;return[Math.sqrt(1-e)*Math.sin(t),Math.sqrt(1-e)*Math.cos(t),Math.sqrt(e)*Math.sin(n),Math.sqrt(e)*Math.cos(n)]}function Ah(r,e,t){let n=$g(Yg(r,e,t)),i=[];for(let s=0;s<7;s++){let a=n(),o=a<.07?1:a<.17?2:0;i.push({id:`${r}:${e}:${t}:${s}`,kind:o,variant:Math.floor(n()*4),position:[(r+n())*2400,(e+n())*2400,(t+n())*2400],radius:o===1?350+n()*500:o===2?180+n()*300:35+n()*125,rotation:Zg(n),tint:o===0?[.42+n()*.3,.36+n()*.2,.3+n()*.2]:[.4+n()*.3,.65+n()*.2,.7+n()*.25]})}for(let s of pc)s.position.every((a,o)=>Math.floor(a/2400)===[r,e,t][o])&&i.push({...s,position:s.position.slice(),rotation:s.rotation.slice(),tint:s.tint.slice()});return i}function Lh(r,e,t){return t.every(n=>n[0]*r[0]+n[1]*r[1]+n[2]*r[2]+n[3]>=-e)}function Ph(r,e,t,n=2048){let i=r.map(l=>Math.floor(l/2400)),s=Math.ceil((t+900)/2400),a=[],o=0,c=Math.sqrt(3)*2400/2+900;for(let l=-s;l<=s;l++){let u=i[2]+l,h=(u+.5)*2400-r[2],d=Math.max(0,Math.abs(h)-2400/2);for(let f=-s;f<=s;f++){let p=i[1]+f,g=(p+.5)*2400-r[1],v=Math.max(0,Math.abs(g)-2400/2);for(let x=-s;x<=s;x++){o++;let m=i[0]+x,b=(m+.5)*2400-r[0],_=Math.max(0,Math.abs(b)-2400/2),w=Math.hypot(_,v,d);if(w>t+900)continue;let y=!0;for(let P of e)if(P[0]*b+P[1]*g+P[2]*h+P[3]<-c){y=!1;break}y&&a.push({key:`${m}:${p}:${u}`,cell:[m,p,u],distance:w})}}}return a.sort((l,u)=>l.distance-u.distance||l.key.localeCompare(u.key)),{cells:a.slice(0,n),examined:o,requested:a.length,limited:a.length>n}}function Ih(r,e,t,{mode:n="mesh",quality:i=3,uniform:s=!1,pointSize:a=2,lodDistance:o=4e3,nearRadius:c=250,maxMeshLevel:l=at-1},u){let h=Math.hypot(r.position[0]-e[0],r.position[1]-e[1],r.position[2]-e[2]),d=Math.max(0,h-r.radius),f=Math.max(1,h-r.radius*.45),p=2*r.radius*.8*t/f,g=n==="mesh"||n==="hybrid"&&(s||p>(u?.representation==="mesh"?30:42)),v;if(g){let x=Th[r.kind]||Th[0],m=C=>x[C]*p/2,b=Math.max(1,o),_=Math.max(0,Math.min(at-1,l)),w=0;for(;w<_&&m(w+1)<=i*.35;)w++;let y=0;for(;y<_&&d>fc[y]*b;)y++;let P=s||d<=c?0:Math.min(y,w);if(!s&&d>c&&u?.representation==="mesh"){let C=u.level,F=C===0?0:fc[C-1]*b*.85,k=C===at-1?1/0:fc[C]*b*1.15;C<=_&&m(C)<=i*.42&&d>=F&&d<=k&&(C===_||m(C+1)>=i*.28||C===y)&&(P=C)}v={representation:"mesh",level:P,rank:P,pixels:p}}else{let x=n==="hybrid"?Math.min(i,a*.7):i,m=s?8192:Math.PI*(p/(2*x))**2,b=Ut.length-1;for(;b>0&&Ut[b]<m;)b--;!s&&u?.representation==="points"&&Ut[u.level]>=m*.8&&(u.level===Ut.length-1||Ut[u.level+1]<m*1.2)&&(b=u.level),v={representation:"points",level:b,rank:b+at,pixels:p}}return v}var pc,at,Ch,Rh,Ut,fc,Th,mc=Te(()=>{pc=[{id:"island",kind:2,variant:0,position:[420,-70,-250],radius:440,rotation:[0,0,0,1],tint:[.68,.87,.78]},{id:"planet",kind:1,variant:0,position:[-1300,430,-1900],radius:880,rotation:[.25,.08,.14,Math.sqrt(1-.25**2-.08**2-.14**2)],tint:[.45,.72,.91]},{id:"asteroid",kind:0,variant:2,position:[-230,100,500],radius:185,rotation:[.16,.34,.11,Math.sqrt(1-.16**2-.34**2-.11**2)],tint:[.63,.51,.39]}];at=10,Ch=["#ff4d30","#ffa52e","#ebd948","#43b879","#288fff","#36cbd9","#8276ff","#bd70e8","#da91b6","#b7bac9"],Rh=["#43ebd9","#7178ff","#b855fa","#d9a6ff","#f09dc8","#beb8e8","#9aa9cc","#778399"],Ut=[8192,2048,512,128,32,8,2,1],fc=[.12,.25,.5,1,1.5,2,3,4,6],Th=[[.005,.009,.016,.027,.05,.08,.14,.25,.34,.5],[.003,.005,.01,.018,.028,.04,.065,.12,.18,.3],[.003,.006,.013,.024,.045,.08,.14,.25,.34,.5]]});var Jg,jg,zh,Fh=Te(()=>{Jg='(()=>{function I(n){let a=n>>>0;return()=>{a=a+1831565813>>>0;let x=Math.imul(a^a>>>15,a|1);return x^=x+Math.imul(x^x>>>7,x|61),((x^x>>>14)>>>0)/4294967296}}var e1=[{id:"island",kind:2,variant:0,position:[420,-70,-250],radius:440,rotation:[0,0,0,1],tint:[.68,.87,.78]},{id:"planet",kind:1,variant:0,position:[-1300,430,-1900],radius:880,rotation:[.25,.08,.14,Math.sqrt(1-.25**2-.08**2-.14**2)],tint:[.45,.72,.91]},{id:"asteroid",kind:0,variant:2,position:[-230,100,500],radius:185,rotation:[.16,.34,.11,Math.sqrt(1-.16**2-.34**2-.11**2)],tint:[.63,.51,.39]}];function g(n,a,x,c,e,{caves:s=!1}={}){let i=a*1.713,o=Math.sin(x*5.3+i)*Math.cos(c*4.1-i)*Math.sin(e*6.2+1.3);if(n===0){let f=Math.hypot(x/1.05,c/.87,e/.96),u=.055*o+.025*Math.sin(x*13+i)*Math.sin(c*11)*Math.cos(e*9),d=.07*Math.exp(-65*((x-.46)**2+(c-.22)**2+(e-.35)**2));return f-.67-u+d}if(n===1){let f=a%2===0,u=Math.hypot(x,c,e),d=u-(f?.6:.75)-.025*o-.012*Math.sin(x*17+i)*Math.cos(e*13);return f?Math.min(d,Math.hypot(Math.hypot(x,e)-.82,c)-.055):d}let r=Math.hypot(x,e),t=.7+.05*Math.sin(x*8+i)*Math.cos(e*7),l=.23+.09*Math.sin(x*5+i)*Math.cos(e*6),h=-.78+.8*Math.pow(r,1.1)+.035*o,b=Math.max(r-t,c-l,h-c);return s?Math.max(b,.235-Math.hypot(x-.48,c+.1,e-.04)):b}function G(n,a,x,c,e,s){let o=[g(n,a,x+.0015,c,e,s)-g(n,a,x-.0015,c,e,s),g(n,a,x,c+.0015,e,s)-g(n,a,x,c-.0015,e,s),g(n,a,x,c,e+.0015,s)-g(n,a,x,c,e-.0015,s)],r=Math.hypot(...o)||1;return o.map(t=>t/r)}var F=[[48,36,28,20,16,10,6,4,3,2],[64,48,36,28,24,16,12,8,6,4],[64,48,32,24,16,10,6,4,3,2]],R=10;var W=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],j=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],L=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],V=Uint32Array.from(L.flat(),n=>n>>>0),Y={name:"Bourke",corners:W,edges:j,maxVertices:15,table:V,cornerBit:n=>1<<n,createPolygonizer(){return(n,a,x)=>{let c=L[a],e=0;for(;e<15&&c[e]>=0;)x[e]=c[e],e++;return e}}};var $=Y;var z=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]);var A=z;var X=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],H=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],B=class{constructor(){this.table=A,this.f_test_results=new Int32Array(6)}signbf(a){return a<0}face_tests(a){let x=this.v,c=this.f_test_results;return c.fill(0),a&128?(c[0]=(a&204)===132?x[0]*x[5]<x[1]*x[4]?-1:1:0,c[3]=(a&153)===129?x[0]*x[7]<x[3]*x[4]?-1:1:0,c[4]=(a&240)===160?x[0]*x[2]<x[1]*x[3]?-1:1:0):(c[0]=(a&204)===72?x[0]*x[5]<x[1]*x[4]?1:-1:0,c[3]=(a&153)===24?x[0]*x[7]<x[3]*x[4]?1:-1:0,c[4]=(a&240)===80?x[0]*x[2]<x[1]*x[3]?1:-1:0),a&2?(c[1]=(a&102)===66?x[1]*x[6]<x[2]*x[5]?-1:1:0,c[2]=(a&51)===18?x[3]*x[6]<x[2]*x[7]?-1:1:0,c[5]=(a&15)===10?x[4]*x[6]<x[5]*x[7]?-1:1:0):(c[1]=(a&102)===36?x[1]*x[6]<x[2]*x[5]?1:-1:0,c[2]=(a&51)===33?x[3]*x[6]<x[2]*x[7]?1:-1:0,c[5]=(a&15)===5?x[4]*x[6]<x[5]*x[7]?1:-1:0),c[0]+c[1]+c[2]+c[3]+c[4]+c[5]}face_test1(a){let x=this.v;switch(a){case 0:return x[0]*x[5]<x[1]*x[4]?72:132;case 1:return x[1]*x[6]<x[2]*x[5]?36:66;case 2:return x[3]*x[6]<x[2]*x[7]?33:18;case 3:return x[0]*x[7]<x[3]*x[4]?24:129;case 4:return x[0]*x[2]<x[1]*x[3]?80:160;default:return x[4]*x[6]<x[5]*x[7]?5:10}}interior_test(a,x){let c=this.v,e=1e-9,s=c[4]-c[0],i=c[5]-c[1],o=c[6]-c[2],r=c[7]-c[3],t=s*o-i*r;if(this.signbf(t)){if(a&1)return 0}else if(!(a&1)||Math.abs(t)<e)return 0;let l=.5*(c[3]*i+c[1]*r-c[2]*s-c[0]*o)/t;if(l<=e||l>=1-e)return 0;let h=c[0]+s*l,b=c[1]+i*l,f=c[2]+o*l,u=c[3]+r*l,d=f*h,p=u*b;if(a&1){if(d<p&&!this.signbf(p))return(this.signbf(b)===this.signbf(c[a]))+x}else if(d>p&&!this.signbf(d))return(this.signbf(h)===this.signbf(c[a]))+x;return 0}pattern(a){let x=this.table,c=(a&128)!==0,e=c?a^255:a,s=x[e];if(s===void 0)throw new Error(`MC33 lookup miss: ${e}`);let i=(s&2048)!==0,o=c?!i:i,r=o?a:a^255,t=s&2047,l=s>>>12,h;switch(l){case 0:h=t;break;case 1:h=r&this.face_test1(t>>2)?183+(t<<1):159+t;break;case 2:h=this.interior_test(t,0)?239+6*t:231+(t<<1);break;case 3:r&this.face_test1(t%6)?h=575+5*t:h=this.interior_test(Math.floor(t/6),0)?407+7*t:335+3*t;break;case 4:{let b=this.face_tests(r);b===-3?h=695+3*t:b===-1?h=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*t:b===1?h=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*t:h=this.interior_test(t>>1,0)?1095+9*t:1055+5*t;break}case 5:{let b=this.face_tests(r);b===-2?h=(t&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(t?1:3,0))?1213+(t<<3):1189+(t<<2):b===0?h=(this.f_test_results[2+t]<0?1261:1285)+(t<<3):h=(t&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(t?3:1,0))?1237+(t<<3):1201+(t<<2);break}case 6:{let b=this.face_tests(r);b===-2?h=this.interior_test(14287116>>(t<<1)&3,0)?1453+(t<<3):1357+(t<<2):b===0?h=(this.f_test_results[t>>1]<0?1645:1741)+(t<<3):h=this.interior_test(10991589>>(t<<1)&3,0)?1549+(t<<3):1405+(t<<2);break}default:{let b=Math.abs(this.face_tests(r));if(b===0){let f=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])h=2157+12*f;else{let u=this.interior_test(f,1);h=2285+(u?10*f-40*u:6*f)}}else if(b===2)h=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(h+=30);else if(b===4){let f=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];f>>4&&(f-=f&32?20:10),h=1845+3*f}else h=1839+2*this.f_test_results[0]}}return{offset:h+1,reverse:o}}triangles(a,x,c){if(this.v=a,x===0||x===255)return 0;let e=this.pattern(x),s=0;for(let i=e.offset;i<A.length;i++){let o=A[i],r=o&15,t=o>>4&15,l=o>>8&15;if(r<=12&&t<=12&&l<=12&&r!==t&&t!==l&&r!==l){if(s+3>c.length)throw new Error("MC33 cell exceeds output capacity");c[s++]=r,c[s++]=e.reverse?l:t,c[s++]=e.reverse?t:l}if(!(o&4096))return s}throw new Error("MC33 pattern exceeds lookup table")}},J={name:"MC33",corners:X,edges:H,maxVertices:36,table:A,cornerBit:n=>128>>n,createPolygonizer(){let n=new B;return n.triangles.bind(n)}};var T=J;function v(n={type:"cartesian"}){if(n.type==="cartesian")return(s,i,o)=>[s,i,o];if(n.type!=="spherical"&&n.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${n.type}`);let a=n.radius||[.02,.7],x=n.center||[.5,.5,.5];if(a.length!==2||!a.every(Number.isFinite)||a[0]<0||a[1]<=a[0])throw new Error("Radius must be an increasing, nonnegative pair");if(x.length!==3||!x.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(n.type==="cube-sphere"){if(!Number.isInteger(n.face)||n.face<0||n.face>5)throw new Error("Cube-sphere face must be 0..5");return(s,i,o)=>{let r=2*s-1,t=2*i-1,h=[[1,t,-r],[-1,t,r],[r,1,-t],[r,-1,t],[r,t,1],[-r,t,-1]][n.face],f=(a[0]+o*(a[1]-a[0]))/Math.hypot(...h);return h.map((u,d)=>x[d]+u*f)}}let c=n.longitude||[-Math.PI,Math.PI],e=n.latitude||[-Math.PI/2,Math.PI/2];for(let s of[c,e])if(s.length!==2||!s.every(Number.isFinite)||s[1]<=s[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(e[0]<-Math.PI/2||e[1]>Math.PI/2||c[1]-c[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \\xB1pi/2 and longitude span at most 2*pi");return(s,i,o)=>{let r=c[0]+s*(c[1]-c[0]),t=e[0]+i*(e[1]-e[0]),l=a[0]+o*(a[1]-a[0]),h=l*Math.cos(t);return Math.abs(Math.cos(t))<1e-15?[x[0],x[1]+l*Math.sin(t),x[2]]:[x[0]+h*Math.cos(r),x[1]+l*Math.sin(t),x[2]+h*Math.sin(r)]}}function q(n,a){if(!a||a.type==="cartesian")return n;let x=v(a);for(let c=0;c<n.length;c+=3){let e=x(n[c],n[c+1],n[c+2]);n[c]=e[0],n[c+1]=e[1],n[c+2]=e[2]}return n}var Q={bourke:$,mc33:T};function Z(n,a,x,c){let e=Q[c];if(!e)throw new Error(`Unknown marching cubes algorithm: ${c}`);if(!["x","y","z"].every(s=>Number.isInteger(a[s])&&a[s]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(n instanceof Float32Array)||n.length!==a.x*a.y*a.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(x))throw new Error("Isolevel must be finite");for(let s of n)if(!Number.isFinite(s)||!Number.isFinite(Math.fround(s-x)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return e}function N(n,a,x=0,c="bourke",e={}){x=Math.fround(x),e.coordinates&&v(e.coordinates);let s=Z(n,a,x,c),{x:i,y:o,z:r}=a,t=s.createPolygonizer(),l=new Float32Array(8),h=new Uint8Array(s.maxVertices),b=new Float32Array(39),f=new Float32Array(65536),u=0;for(let d=0;d<r-1;d++)for(let p=0;p<o-1;p++)for(let y=0;y<i-1;y++){let M=0;for(let m=0;m<8;m++){let _=s.corners[m];l[m]=n[((d+_[2])*o+p+_[1])*i+y+_[0]]-x,l[m]<0&&(M|=s.cornerBit(m))}if(M===0||M===255)continue;let w=t(l,M,h);if(u+w*3>f.length){let m=new Float32Array(Math.max(f.length*2,u+w*3));m.set(f),f=m}for(let m=0;m<12;m++){let[_,k]=s.edges[m];if(l[_]<0==l[k]<0)continue;let E=l[_]-l[k],U=Math.abs(E)<1e-9?.5:Math.max(0,Math.min(1,l[_]/E)),P=s.corners[_],S=s.corners[k];b[m*3]=(y+P[0]+U*(S[0]-P[0]))/(i-1),b[m*3+1]=(p+P[1]+U*(S[1]-P[1]))/(o-1),b[m*3+2]=(d+P[2]+U*(S[2]-P[2]))/(r-1)}b[36]=(y+.5)/(i-1),b[37]=(p+.5)/(o-1),b[38]=(d+.5)/(r-1);for(let m=0;m<w;m++){let _=h[m]*3;f[u++]=b[_],f[u++]=b[_+1],f[u++]=b[_+2]}}return q(f.slice(0,u),e.coordinates)}function c1(n,a){let x=[],c=a/2,e=n%2===0;function s(o,r){let t=[Math.sin(o)*Math.cos(r),Math.cos(o),Math.sin(o)*Math.sin(r)],l=e?.5:.66,h=e?.69:.84;for(let b=0;b<14;b++){let f=(l+h)/2;g(1,n,...t.map(u=>u*f))<0?l=f:h=f}return t.map(b=>b*(l+h)/2)}function i(o,r,t){x.push(...o,...r,...t)}for(let o=0;o<c;o++)for(let r=0;r<a;r++){let t=o*Math.PI/c,l=(o+1)*Math.PI/c,h=r*2*Math.PI/a,b=(r+1)%a*2*Math.PI/a,f=s(t,h),u=s(t,b),d=s(l,b),p=s(l,h);o>0&&i(f,u,p),o<c-1&&i(u,d,p)}if(e){let r=(t,l)=>{let h=.82+.055*Math.cos(l);return[h*Math.cos(t),.055*Math.sin(l),h*Math.sin(t)]};for(let t=0;t<a;t++)for(let l=0;l<4;l++){let h=t*2*Math.PI/a,b=(t+1)%a*2*Math.PI/a,f=l*2*Math.PI/4,u=(l+1)%4*2*Math.PI/4,d=r(h,f),p=r(b,f),y=r(b,u),M=r(h,u);i(d,M,p),i(p,M,y)}}return Float32Array.from(x,o=>(o+1)/2)}function t1(n,a){let x=new Map,c=e=>e.every(s=>Math.abs(s*a-Math.floor(s*a)-.5)<1e-5);for(let e=0;e<n.length;e+=9){let s=[0,1,2].map(i=>Array.from(n.subarray(e+i*3,e+i*3+3)));for(let i=0;i<3;i++)if(c(s[i])){let o=s[i].join(",");x.has(o)||x.set(o,{boundary:new Map,offsets:[]});let r=x.get(o);r.offsets.push(e+i*3);for(let t=0;t<3;t++)t!==i&&r.boundary.set(s[t].join(","),s[t])}}for(let e of x.values()){let s=[0,0,0];for(let i of e.boundary.values())for(let o=0;o<3;o++)s[o]+=i[o]/e.boundary.size;for(let i of e.offsets)n.set(s,i)}return x.size}function O(n,a,x,c="mc33",e={}){let s=F[n]?.[x];if(!s)throw new Error("Invalid body mesh level");let i=n===1&&x>=5,o;if(i)o=c1(a,s);else{let b=s+1,f={x:b,y:b,z:b},u=new Float32Array(b*b*b);for(let d=0;d<b;d++)for(let p=0;p<b;p++)for(let y=0;y<b;y++)u[(d*b+p)*b+y]=g(n,a,y/s*2-1,p/s*2-1,d/s*2-1,e);o=N(u,f,0,c)}let r=new Float32Array(o.length/3*8),t=0,l=0,h=!i&&c==="mc33"?t1(o,s):0;for(let b=0;b<o.length;b+=9){let f=[],u=[];for(let M=0;M<3;M++){let w=[0,1,2].map(m=>o[b+M*3+m]*2-1);f.push(w),u.push(G(n,a,...w,e))}let d=f[1].map((M,w)=>M-f[0][w]),p=f[2].map((M,w)=>M-f[0][w]),y=[d[1]*p[2]-d[2]*p[1],d[2]*p[0]-d[0]*p[2],d[0]*p[1]-d[1]*p[0]];if(!(Math.hypot(...y)<1e-12)){l+=y.reduce((M,w,m)=>M+w*(u[0][m]+u[1][m]+u[2][m]),0);for(let M=0;M<3;M++){let w=t++*8;r.set([...f[M],1,...u[M],0],w)}}}if(l<0)for(let b=0;b<t*8;b+=24)for(let f=0;f<8;f++){let u=r[b+8+f];r[b+8+f]=r[b+16+f],r[b+16+f]=u}return{vertices:r.slice(0,t*8),count:t,divisions:s,interiorVertices:h,proxy:i}}function C(n,a=8192,x=7){let c=new Map;for(let r=0;r<n.length;r+=8){let t=[n[r],n[r+1],n[r+2]].map(l=>Math.round(l*1e6)).join(":");c.has(t)||c.set(t,r)}let e=Array.from(c.values()),s=I(x);for(let r=e.length-1;r>0;r--){let t=Math.floor(s()*(r+1));[e[r],e[t]]=[e[t],e[r]]}let i=Math.min(a,e.length),o=new Float32Array(i*8);return e.slice(0,i).forEach((r,t)=>o.set(n.subarray(r,r+8),t*8)),{vertices:o,count:i}}self.onmessage=n=>{let{key:a,kind:x,variant:c,level:e,algorithm:s,caves:i}=n.data;try{let o=performance.now(),r=O(x,c,e==="points"?0:e,s,{caves:i}),t=e==="points"?C(r.vertices,8192,x*71+c):r,l=e===R-1?C(r.vertices,512,x*71+c):null;self.postMessage({key:a,...t,fallback:l,ms:performance.now()-o},l?[t.vertices.buffer,l.vertices.buffer]:[t.vertices.buffer])}catch(o){self.postMessage({key:a,error:o.message})}};;if(typeof import_meta !== \'undefined\')import_meta.url=location.origin+"/dist/";})();\n',jg=URL.createObjectURL(new globalThis.Blob([Jg],{type:"text/javascript"})),zh=jg});var kh,Bh=Te(()=>{kh=`struct Vertex { position:vec4<f32>, normal:vec4<f32> }
struct Instance { centerRadius:vec4<f32>, quaternion:vec4<f32>, tint:vec4<f32>, details:vec4<f32> }
struct Frame { vp:mat4x4<f32>, sun:vec4<f32>, settings:vec4<f32>, viewport:vec4<f32>, right:vec4<f32>, up:vec4<f32>, forward:vec4<f32>, cameraOffset:vec4<f32> }
@group(0) @binding(0) var<uniform> frame:Frame;
@group(0) @binding(1) var<storage,read> instances:array<Instance>;
@group(1) @binding(0) var<storage,read> geometry:array<Vertex>;
fn rotate(q:vec4<f32>,v:vec3<f32>)->vec3<f32>{return v+2.0*cross(q.xyz,cross(q.xyz,v)+q.w*v);}
struct Varying {
 @builtin(position) clip:vec4<f32>, @location(0) local:vec3<f32>, @location(1) normal:vec3<f32>, @location(2) relative:vec3<f32>,
 @location(3) tint:vec3<f32>, @location(4) @interpolate(flat) details:vec4<f32>, @location(5) uv:vec2<f32>
}
fn transformed(vertex:Vertex,info:Instance)->Varying{
 let relative=(info.centerRadius.xyz-frame.cameraOffset.xyz)+rotate(info.quaternion,vertex.position.xyz)*info.centerRadius.w;
 var clip=frame.vp*vec4<f32>(relative,1);clip.z=(clip.z+clip.w)*.5;
 return Varying(clip,vertex.position.xyz,rotate(info.quaternion,vertex.normal.xyz),relative,info.tint.xyz,info.details,vec2<f32>(0));
}
@vertex fn mesh_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{return transformed(geometry[v],instances[i]);}
@vertex fn point_vertex(@builtin(vertex_index) v:u32,@builtin(instance_index) i:u32)->Varying{
 var corners=array<vec2<f32>,6>(vec2<f32>(-1,-1),vec2<f32>(1,-1),vec2<f32>(1,1),vec2<f32>(-1,-1),vec2<f32>(1,1),vec2<f32>(-1,1));
 var result=transformed(geometry[v/6u],instances[i]);let uv=corners[v%6u];
 result.clip=vec4<f32>(result.clip.xy+uv*frame.settings.z/frame.viewport.xy*result.clip.w,result.clip.zw);result.uv=uv;return result;
}
fn lod_color(lod:f32)->vec3<f32>{var colors=array<vec3<f32>,16>(vec3<f32>(1,.302,.188),vec3<f32>(1,.647,.18),vec3<f32>(.922,.851,.282),vec3<f32>(.263,.722,.475),vec3<f32>(.157,.561,1),vec3<f32>(.212,.796,.851),vec3<f32>(.510,.463,1),vec3<f32>(.741,.439,.910),vec3<f32>(.263,.922,.851),vec3<f32>(.443,.471,1),vec3<f32>(.722,.333,.980),vec3<f32>(.851,.651,1),vec3<f32>(.941,.616,.784),vec3<f32>(.745,.722,.910),vec3<f32>(.604,.663,.8),vec3<f32>(.467,.514,.6));return colors[min(u32(lod),15u)];}
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
`});var Kg,ks,Nh=Te(()=>{Ps();mc();dc();Fh();Bh();Kg=kh,ks=class{constructor(e,t={}){if(this.canvas=e,this.options={maxInstances:12e3,maxChunks:2048,geometryMB:64,pointBudget:6e5,...t},![this.options.maxInstances,this.options.maxChunks,this.options.pointBudget,this.options.workers??2].every(n=>Number.isSafeInteger(n)&&n>0)||(this.options.workers??2)>8||!Number.isFinite(this.options.geometryMB)||this.options.geometryMB<=0)throw new RangeError("Use positive integer instance/chunk/point limits, 1\u20138 workers and positive geometryMB.");this.settings={mode:"mesh",quality:3,uniform:!1,algorithm:"mc33",pointSize:2,lodDistance:4e3,nearRadius:250,maxMeshLevel:at-1,caves:!1},this.chunks=new Map,this.cache=new Map,this.queue=new Map,this.inflight=new Set,this.failed=new Set,this.protected=new Set,this.baselines=new Set,this.previous=new Map,this.visible=[],this.lastSelect=-1/0,this.dirty=!0,this.disposed=!1,this.bytes=0,this.errors=[],this.stats={generated:0,streamed:0,evicted:0,gpuMs:null,workerMs:0},this.geometryRevision=0,this.viewState=[],this.draws=null}async initialize(){let e=await mi(this);this.frameBuffer=e.createBuffer({size:176,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.instances=e.createBuffer({size:this.options.maxInstances*64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});let t=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}]});this.geometryLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}}]}),this.frameGroup=e.createBindGroup({layout:t,entries:[{binding:0,resource:{buffer:this.frameBuffer}},{binding:1,resource:{buffer:this.instances}}]});let n=e.createShaderModule({code:Kg,label:"Space meshes, point clouds and star sky"}),s=(await n.getCompilationInfo()).messages.filter(c=>c.type==="error");if(s.length)throw new Error(s.map(c=>`${c.lineNum}: ${c.message}`).join(`
`));let a=e.createPipelineLayout({bindGroupLayouts:[t,this.geometryLayout]}),o=(c,l,u)=>e.createRenderPipelineAsync({layout:a,vertex:{module:n,entryPoint:c},fragment:{module:n,entryPoint:l,targets:[{format:this.format}]},primitive:u,depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}});if(this.mesh=await o("mesh_vertex","mesh_fragment",{topology:"triangle-list",cullMode:"back"}),this.points=await o("point_vertex","point_fragment",{topology:"triangle-list"}),this.sky=await e.createRenderPipelineAsync({layout:e.createPipelineLayout({bindGroupLayouts:[t]}),vertex:{module:n,entryPoint:"sky_vertex"},fragment:{module:n,entryPoint:"sky_fragment",targets:[{format:this.format}]},primitive:{topology:"triangle-list"},depthStencil:{format:"depth24plus",depthWriteEnabled:!1,depthCompare:"always"}}),this.workers=Array.from({length:this.options.workers??2},()=>{let c={worker:new Worker(this.options.workerURL??zh),busy:!1,key:null};return c.worker.onmessage=l=>this.receive(c,l.data),c.worker.onerror=l=>{this.errors.push(l.message),c.key&&(this.failed.add(c.key),this.inflight.delete(c.key)),c.busy=!1},c}),this.timers=[],e.features.has("timestamp-query"))for(let c=0;c<3;c++)this.timers.push({busy:!1,queries:e.createQuerySet({type:"timestamp",count:2}),resolve:e.createBuffer({size:16,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read:e.createBuffer({size:16,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ})});return this.instanceData=new Float32Array(this.options.maxInstances*16),this.frameData=new Float32Array(44),this.frameIndex=0,this.resize(),this.prewarm(),this.dispatch(),this}configure(e){Object.assign(this.settings,e),this.previous.clear(),this.queue.clear(),this.prewarm(),this.dirty=!0}prewarm(){this.baselines.clear();for(let e=0;e<3;e++)for(let t=0;t<4;t++){let n={kind:e,variant:t},i=at-1;this.baselines.add(this.key(n,i)),this.baselines.add(this.key(n,"fallback-points")),this.request(n,i,1e9),this.request(n,4,-100)}}resize(){let{ratio:e,width:t,height:n}=gi(this.canvas,this.options);this.ratio=e,!(this.canvas.width===t&&this.canvas.height===n&&this.depth)&&(this.canvas.width=t,this.canvas.height=n,this.depth?.destroy(),this.depth=this.device.createTexture({size:[t,n],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),this.dirty=!0)}key(e,t){return`${this.settings.algorithm}:${e.kind}:${e.variant}${e.kind===2?this.settings.caves?"c":"s":""}:${t}`}request(e,t,n){let i=this.key(e,t);if(this.cache.has(i)||this.inflight.has(i)||this.failed.has(i))return;let s=this.queue.get(i);(!s||n>s.priority)&&this.queue.set(i,{key:i,kind:e.kind,variant:e.variant,level:t,algorithm:this.settings.algorithm,caves:this.settings.caves,priority:n})}dispatch(){for(let e of this.workers){if(e.busy||!this.queue.size)continue;let t=Array.from(this.queue.values()).sort((n,i)=>i.priority-n.priority)[0];this.queue.delete(t.key),this.inflight.add(t.key),e.busy=!0,e.key=t.key,e.worker.postMessage(t)}}upload(e,t,n){let i=this.options.geometryMB*1048576;for(;this.bytes+t.byteLength>i;){let o=null;for(let[c,l]of this.cache)!this.protected.has(c)&&!(this.options.geometryMB>=1&&this.baselines.has(c))&&(!o||l.touched<o[1].touched)&&(o=[c,l]);if(!o)return;o[1].buffer.destroy(),this.bytes-=o[1].bytes,this.cache.delete(o[0])}let s=this.device.createBuffer({size:t.byteLength,usage:GPUBufferUsage.STORAGE,mappedAtCreation:!0});new Float32Array(s.getMappedRange()).set(t),s.unmap();let a=this.device.createBindGroup({layout:this.geometryLayout,entries:[{binding:0,resource:{buffer:s}}]});this.cache.set(e,{key:e,buffer:s,group:a,count:n,bytes:t.byteLength,touched:performance.now()}),this.bytes+=t.byteLength,this.geometryRevision++}receive(e,t){this.disposed||(e.busy=!1,e.key=null,this.inflight.delete(t.key),t.error?(this.failed.add(t.key),this.errors.push(t.error)):(this.upload(t.key,t.vertices,t.count),t.fallback&&this.upload(t.key.slice(0,t.key.lastIndexOf(":"))+":fallback-points",t.fallback.vertices,t.fallback.count),this.stats.generated++,this.stats.workerMs=t.ms),this.dispatch())}select(e,t,n){let i=performance.now(),s=Ph(e.position,zs(t,e.far),e.far,this.options.maxChunks),a=new Set(s.cells.map(c=>c.key)),o=[];for(let c of s.cells){let l=this.chunks.get(c.key);l||(l={bodies:Ah(...c.cell),touched:n},this.chunks.set(c.key,l),this.stats.streamed++),l.touched=n;for(let u of l.bodies){let h=u.position.map((f,p)=>f-e.position[p]),d=Math.hypot(...h);d-u.radius>e.far||!Lh(h,u.radius+d*.12,t)||o.push({body:u,distance:d,lod:Ih(u,e.position,e.pixelScale,this.settings,this.previous.get(u.id))})}}if(o.sort((c,l)=>c.distance-l.distance),this.visible=o.slice(0,this.options.maxInstances),this.previous=new Map(this.visible.map(c=>[c.body.id,c.lod])),this.chunks.size>this.options.maxChunks*2){let c=Array.from(this.chunks).filter(([l])=>!a.has(l)).sort((l,u)=>l[1].touched-u[1].touched);for(let[l]of c){if(this.chunks.size<=this.options.maxChunks*2)break;this.chunks.delete(l),this.stats.evicted++}}this.stats.requestedBodies=o.length,this.stats.sectors=s.cells.length,this.stats.examined=s.examined,this.stats.sectorLimited=s.limited,this.stats.instanceLimited=o.length>this.options.maxInstances,this.stats.selectionMs=performance.now()-i,this.lastSelect=n,this.selectionPlanes=t.map(c=>c.slice()),this.queue.clear(),this.prewarm(),this.dirty=!1}viewChanged(e,t){let n=0,i=!1,s=a=>{this.viewState[n]!==a&&(i=!0),this.viewState[n++]=a};e.position.forEach(s),s(e.far),s(e.pixelScale);for(let a of t)a.forEach(s);return i}prepareDraws(e,t){let n=performance.now(),i=new Map;this.protected.clear();let s=0,a=0,o=0,c=0,l=0,u=0,h=!1,d=new Array(at+Ut.length).fill(0),f=at-1;for(let m of this.visible){let{body:b,lod:_}=m,w=_.representation,y;this.request(b,f,1e9+_.pixels);let P=this.key(b,w==="points"?"points":_.level);if(this.request(b,w==="points"?"points":_.level,100+_.pixels*20),y=this.cache.get(P),!y)if(u++,w==="points")y=this.cache.get(this.key(b,"fallback-points"));else{for(let H=_.level+1;H<=f;H++){let B=this.cache.get(this.key(b,H));if(B){y=B;break}}if(!y)for(let H=_.level-1;H>=0;H--){let B=this.cache.get(this.key(b,H));if(B){y=B;break}}}if(!y)continue;y.touched=t,this.protected.add(y.key);let C=y.count,F=_.rank;if(w==="points"){C=Math.min(C,Ut[_.level]),s+=C;let H=this.options.pointBudget-a;if(C>H&&(h=!0,C=Ut.find(B=>B<=H&&B<=C)||0),!C)continue;a+=C,l++,F=at+Ut.findIndex(B=>B<=C)}else o+=C/3,c++,F=Number(y.key.slice(y.key.lastIndexOf(":")+1));d[F]++;let k=`${y.key}:${w}:${C}`;i.has(k)||i.set(k,{geometry:y,representation:w,count:C,items:[]}),i.get(k).items.push({body:b,rank:F})}this.dispatch();let p=this.instanceData,g=[],v=0;for(let m of i.values()){let b=v;for(let{body:_,rank:w}of m.items){let y=v++*16;p.set([..._.position.map((P,C)=>P-e.position[C]),_.radius],y),p.set(_.rotation,y+4),p.set([..._.tint,1],y+8),p.set([w,_.kind,_.variant,0],y+12)}g.push({...m,first:b,instances:m.items.length})}v&&this.device.queue.writeBuffer(this.instances,0,p,0,v*16),this.draws=g;let x=this.device.createRenderBundleEncoder({label:"Space visibility draw bundle",colorFormats:[this.format],depthStencilFormat:"depth24plus"});x.setPipeline(this.sky),x.setBindGroup(0,this.frameGroup),x.draw(3);for(let m of g)x.setPipeline(m.representation==="mesh"?this.mesh:this.points),x.setBindGroup(0,this.frameGroup),x.setBindGroup(1,m.geometry.group),x.draw(m.count*(m.representation==="points"?6:1),m.instances,0,m.first);this.bundles=[x.finish()],this.drawPosition=e.position.slice(),this.drawSelect=this.lastSelect,this.drawRevision=this.geometryRevision,Object.assign(this.stats,{drawCalls:g.length+1,triangles:o,points:a,requestedPoints:s,meshes:c,clouds:l,drawn:v,waiting:u,pointLimited:h,histogram:d}),this.stats.batchBuilds=(this.stats.batchBuilds||0)+1,this.stats.batchMs=performance.now()-n}render(e,t,n,{lodColors:i=!1}={}){let s=performance.now();this.stats.selectionMs=0,this.stats.batchMs=0,this.resize(),(this.dirty||Fs(t,this.selectionPlanes)||n-this.lastSelect>=100&&this.viewChanged(e,t))&&(this.select(e,t,n),this.viewChanged(e,t)),(!this.draws||this.drawSelect!==this.lastSelect||this.drawRevision!==this.geometryRevision)&&this.prepareDraws(e,n);let a=this.frameData;a.set(e.viewProjection),a.set([.4,.75,.6,0],16),a.set([e.far,Number(i),this.settings.pointSize*this.ratio,0],20),a.set([this.canvas.width,this.canvas.height,e.tanX,e.tanY],24),a.set(e.right,28),a.set(e.up,32),a.set(e.skyForward??e.forward,36);for(let h=0;h<3;h++)a[40+h]=e.position[h]-this.drawPosition[h];this.device.queue.writeBuffer(this.frameBuffer,0,a);let o=this.device.createCommandEncoder(),c=this.frameIndex++%20===0?this.timers.find(h=>!h.busy):null;c&&(c.busy=!0);let l={colorAttachments:[{view:this.context.getCurrentTexture().createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:1}}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}};c&&(l.timestampWrites={querySet:c.queries,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1});let u=o.beginRenderPass(l);return u.executeBundles(this.bundles),u.end(),c&&(o.resolveQuerySet(c.queries,0,2,c.resolve,0),o.copyBufferToBuffer(c.resolve,0,c.read,0,16)),this.device.queue.submit([o.finish()]),c&&c.read.mapAsync(GPUMapMode.READ).then(()=>{let h=new BigUint64Array(c.read.getMappedRange());this.stats.gpuMs=Number(h[1]-h[0])/1e6,c.read.unmap(),c.busy=!1}).catch(h=>{c.busy=!1,this.disposed||this.errors.push(h.message)}),Object.assign(this.stats,{cpuMs:performance.now()-s,pending:this.queue.size+this.inflight.size,geometryBytes:this.bytes,cachedChunks:this.chunks.size}),this.stats}dispose(){if(!this.disposed){this.disposed=!0;for(let e of this.workers||[])e.worker.terminate();for(let e of this.cache.values())e.buffer.destroy();for(let e of this.timers||[])e.queries.destroy(),e.resolve.destroy(),e.read.destroy();this.frameBuffer?.destroy(),this.instances?.destroy(),this.depth?.destroy(),xi(this)}}}});var Uh={};pr(Uh,{startDemo:()=>tv});async function tv(){"use strict";let r=T=>document.getElementById(T),e=r("space"),t=r("status"),n=Array.from(document.querySelectorAll("header input,header select,header button"));window.matchMedia("(max-width:800px), (max-height:650px)").matches&&(r("controls").open=!1),n.forEach(T=>{T.disabled=!0});let i;try{i=new ks(e),await i.initialize()}catch(T){i?.dispose(),t.textContent=T.message,t.classList.add("error"),r("loading").textContent=T.message;return}let s=new He(60,1,1,9e3),a=new me,o=new yt,c=new E(0,180,1500),l=new E,u=new E,h=new E,d=new E(0,1,0),f=new Set,p=0,g=-.07,v=!1,x=!1,m=new E,b=performance.now(),_=0,w=16.7,y=0,P=0,C=0,F;function k(){v=!1,r("fly").textContent="Start flythrough"}function H(){k(),c.set(0,180,1500),p=0,g=-.07,f.clear(),i.dirty=!0}function B(T){k();let I=pc.find($=>$.id===T),Z=T==="island"?[2.2,.35,1.4]:[0,.35,2.6];c.fromArray(I.position).add(new E(...Z).multiplyScalar(I.radius)),p=Math.atan2(-Z[0],Z[2]),g=-Math.atan2(Z[1],Math.hypot(Z[0],Z[2])),f.clear(),i.dirty=!0,e.focus()}for(let T of["island","planet","asteroid"])r(T).addEventListener("click",()=>B(T));r("reset").addEventListener("click",H),r("fly").addEventListener("click",()=>{v?k():(v=!0,m.set(Math.sin(p)*Math.cos(g),Math.sin(g),-Math.cos(p)*Math.cos(g)),r("fly").textContent="Stop flythrough"),f.clear(),e.focus()}),e.addEventListener("pointerdown",T=>{x=!0,e.focus(),e.setPointerCapture(T.pointerId)}),e.addEventListener("pointerup",()=>{x=!1}),e.addEventListener("pointermove",T=>{x&&(p-=T.movementX*.003,g=Math.max(-1.5,Math.min(1.5,g-T.movementY*.003)))}),window.addEventListener("keydown",T=>{/INPUT|SELECT|BUTTON/.test(T.target.tagName)||(f.add(T.code),T.code==="Space"&&T.preventDefault())}),window.addEventListener("keyup",T=>f.delete(T.code)),window.addEventListener("blur",()=>{f.clear(),x=!1}),r("mode").addEventListener("change",()=>i.configure({mode:r("mode").value})),r("algorithm").addEventListener("change",()=>i.configure({algorithm:r("algorithm").value})),r("uniform").addEventListener("change",()=>i.configure({uniform:r("uniform").checked})),r("lodDistance").addEventListener("input",()=>{i.configure({lodDistance:Number(r("lodDistance").value)}),r("lodDistanceValue").textContent=`${r("lodDistance").value} m`}),r("maxMeshLevel").max=String(at-1),r("maxMeshLevel").value=String(at-1),r("maxMeshLevel").addEventListener("input",()=>{i.configure({maxMeshLevel:Number(r("maxMeshLevel").value)}),r("maxMeshLevelValue").textContent=`Grade ${r("maxMeshLevel").value}`}),r("nearRadius").addEventListener("input",()=>{i.configure({nearRadius:Number(r("nearRadius").value)}),r("nearRadiusValue").textContent=`${r("nearRadius").value} m`}),r("caves").addEventListener("change",()=>i.configure({caves:r("caves").checked})),r("distance").addEventListener("input",()=>{s.far=Number(r("distance").value),r("distanceValue").textContent=`${s.far/1e3} km`,i.dirty=!0}),r("quality").addEventListener("input",()=>{i.configure({quality:Number(r("quality").value)}),r("qualityValue").textContent=`${r("quality").value} px`}),r("pointSize").addEventListener("input",()=>{i.configure({pointSize:Number(r("pointSize").value)}),r("pointValue").textContent=`${r("pointSize").value} px`}),r("speed").addEventListener("input",()=>{r("speedValue").textContent=`${r("speed").value} m/s`});let L=[...Ch,...Rh];function D(T,I){if(y=y*.94+I.cpuMs*.06,P=Math.max(P,I.selectionMs),C=Math.max(C,I.batchMs),T-_<250)return;_=T,r("frameTime").textContent=`${w.toFixed(1)} / ${I.gpuMs?.toFixed(2)??"\u2014"} ms`,r("fps").textContent=`${(1e3/w).toFixed(0)} FPS`,r("cpuTime").textContent=`${y.toFixed(2)} ms`,r("cpuBreakdown").textContent=`CPU peaks: cull ${P.toFixed(1)} ms \xB7 batches ${C.toFixed(1)} ms`,P=0,C=0,r("triangles").textContent=I.triangles.toLocaleString(),r("points").textContent=I.points.toLocaleString(),r("objects").textContent=`${I.meshes} / ${I.clouds}`,r("memory").textContent=`${(I.geometryBytes/1024**2).toFixed(1)} MB / ${I.cachedChunks}`,r("draws").textContent=`${I.drawCalls} / ${I.pending}`,r("histogram").replaceChildren(...I.histogram.map(($,U)=>{let W=document.createElement("div");return W.style.background=L[U],W.style.flex=String($),W.title=`${U<at?"Mesh LOD "+U:"Point tier "+(U-at)}: ${$} bodies`,W})),r("meshLods").textContent=I.histogram.slice(0,at).join(" / "),r("coords").textContent=`x ${(c.x/1e3).toFixed(1)} \xB7 y ${(c.y/1e3).toFixed(1)} \xB7 z ${(c.z/1e3).toFixed(1)} km`;let Z=I.sectorLimited||I.instanceLimited||I.pointLimited;t.textContent=i.errors.length?i.errors.at(-1):`${I.streamed} sectors explored \xB7 ${I.drawn.toLocaleString()} visible bodies \xB7 ${I.waiting?"refining shapes\u2026":"cache ready"}${Z?" \xB7 view budget reached":""}`,t.classList.toggle("error",i.errors.length>0),t.dataset.pending=I.pending,t.dataset.errors=i.errors.length,t.dataset.drawn=I.drawn,t.dataset.meshes=I.meshes,t.dataset.points=I.points,I.drawn&&(r("loading").style.display="none")}function z(T){if(i.disposed)return;F=requestAnimationFrame(z);let I=T-b,Z=Math.min(.05,I/1e3);b=T,w=w*.94+I*.06,l.set(Math.sin(p)*Math.cos(g),Math.sin(g),-Math.cos(p)*Math.cos(g)),u.crossVectors(l,d).normalize(),h.crossVectors(u,l).normalize();let $=Number(r("speed").value)*(f.has("ShiftLeft")?3:1),U=new E;v&&c.addScaledVector(m,$*Z),f.has("KeyW")&&U.add(l),f.has("KeyS")&&U.sub(l),f.has("KeyD")&&U.add(u),f.has("KeyA")&&U.sub(u),(f.has("Space")||f.has("KeyE"))&&U.y++,(f.has("KeyC")||f.has("KeyQ"))&&U.y--,U.lengthSq()&&c.addScaledVector(U.normalize(),$*Z),s.position.set(0,0,0),s.up.copy(h),s.lookAt(l),s.aspect=e.clientWidth/e.clientHeight,s.updateProjectionMatrix(),s.updateMatrixWorld(),a.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),o.setFromProjectionMatrix(a);let W=Math.tan(s.fov*Math.PI/360),G={position:c.toArray(),far:s.far,pixelScale:e.height/(2*W),viewProjection:a.elements,right:u.toArray(),up:h.toArray(),forward:l.toArray(),tanX:W*s.aspect,tanY:W};try{D(T,i.render(G,o.planes.map(q=>[q.normal.x,q.normal.y,q.normal.z,q.constant]),T,{lodColors:r("colors").checked}))}catch(q){cancelAnimationFrame(F),t.textContent=q.message,t.classList.add("error"),console.error(q)}}n.forEach(T=>{T.disabled=!1}),F=requestAnimationFrame(z),window.addEventListener("pagehide",()=>{cancelAnimationFrame(F),i.dispose()})}var Oh=Te(()=>{or();Nh();mc()});var Hh,Gh=Te(()=>{Hh=`fn progressive_height_gradient(xz: vec2<f32>, seed: u32) -> vec3<f32> {
  var result = terrain_height_gradient(xz, seed);
  var wave = 4.0;
  var amplitude = 0.42;
  for (var i = 0u; i < 7u; i++) {
    let n = terrain_noise(xz / wave, seed + 211u + i * 19u);
    result += vec3<f32>(n.x, n.y / wave, n.z / wave) * amplitude;
    wave *= 0.5;
    // The first step is 0.42 -> 0.22; subsequent octaves halve.
    amplitude = select(amplitude * 0.5, 0.22, i == 0u);
  }
  return result;
}
`});function wt(r,e,t=7){let n=kt(r,e,t);for(let i=0;i<xc.length;i++){let[s,a]=xc[i];n+=Cs(r/s,e/s,t+211+i*19)*a}return n}function vc(r){let e=fr(r);for(let[t,n]of xc)e+=n*Math.min(1,2*(r/t)**2);return e}var xc,gc,Vh,Ns=Te(()=>{Pn();Gh();xc=[[4,.42],[2,.22],[1,.11],[.5,.055],[.25,.0275],[.125,.01375],[.0625,.006875]],gc=[-382,482],Vh=hr+Hh});function bi(r,e,t,n=1024){let i=n/2**r;return{key:Wh(r,e,t),level:r,x:e,z:t,size:i,ox:e*i,oz:t*i}}function qh(r,e=1024){return[bi(r.level+1,r.x*2,r.z*2,e),bi(r.level+1,r.x*2+1,r.z*2,e),bi(r.level+1,r.x*2,r.z*2+1,e),bi(r.level+1,r.x*2+1,r.z*2+1,e)]}function Xh(r,e=1024){return bi(r.level-1,Math.floor(r.x/2),Math.floor(r.z/2),e)}function Us(r){if(r.lo===void 0){let e=wt(r.ox+r.size/2,r.oz+r.size/2),t=2.5*r.size+1.75;r.lo=Math.max(gc[0],e-t),r.hi=Math.min(gc[1],e+t)}return r}function yc(r,e){let{lo:t,hi:n}=Us(r);return Math.hypot(Math.max(r.ox-e[0],0,e[0]-r.ox-r.size),Math.max(t-e[1],0,e[1]-n),Math.max(r.oz-e[2],0,e[2]-r.oz-r.size))}function Yh(r,e=[]){return e.length?(Us(r),e.every(([t,n,i,s])=>t*(t>=0?r.ox+r.size:r.ox)+n*(n>=0?r.hi:r.lo)+i*(i>=0?r.oz+r.size:r.oz)+s>=0)):!0}function $h(r,e){let t=Math.max(r.ox,Math.min(r.ox+r.size,e[0])),n=Math.max(r.oz,Math.min(r.oz+r.size,e[2]));return Math.hypot(t-e[0],n-e[2],wt(t,n)-e[1])}function rv(r,e,t,n,i,s=0){let a=c=>{let l=n/2**c;return r.get(Wh(c,Math.floor(e/l),Math.floor(t/l)))},o=a(s);if(o)return o;for(let c=1;c<=i;c++){if(s-c>=0){let l=a(s-c);if(l)return l}if(s+c<=i){let l=a(s+c);if(l)return l}}}function bc(r,e,t=1024,n=10){let{ox:i,oz:s,size:a}=r,o=t/2**n/4;return[[i-o,s+a/2,1],[i+a+o,s+a/2,2],[i+a/2,s-o,4],[i+a/2,s+a+o,8]].map(([c,l,u])=>[rv(e,c,l,t,n,r.level),u])}function Zh(r,e=[],t={},n=new Set){let{rootSize:i=1024,minSize:s=1,divs:a=32,maxNodes:o=334,pixelError:c=2,boundsCache:l}=t,u=Math.round(Math.log2(i/s)),h=Array.from({length:u+1},(B,L)=>vc(i/2**L/a));function d(B){let L=l?.get(B.key);return L?.size===B.size&&(B.lo=L.lo,B.hi=L.hi),B}let f=new Map,p=new Map,g=new Set,v=[],x=Math.max(i,r.far),m=Math.floor((r.position[0]-x)/i),b=Math.floor((r.position[0]+x)/i),_=Math.floor((r.position[2]-x)/i),w=Math.floor((r.position[2]+x)/i);for(let B=_;B<=w;B++)for(let L=m;L<=b;L++){let D=d(bi(0,L,B,i));v.push(D),f.set(D.key,D),p.set(D.key,D)}if(f.size>o)throw new RangeError("Tile budget is too small for root coverage");let y=r.height/(2*Math.tan(r.fov/2)),P=[...r.position],C=[],F=B=>{if(B.level>=u)return 0;let L=B.distance??=$h(B,r.position);return B.distancePosition=P,yc(B,r.position)>r.far?0:h[B.level]*y/Math.max(L,.05)/c*(n.has(B.key)?1.2:1)},k=B=>{let L=F(B);L>1&&C.push({n:B,priority:L})};v.forEach(k);let H=!1;for(;C.length;){let z=function(T){if(!D.has(T.key)){D.set(T.key,T);for(let[I]of bc(T,p,i,u))I&&I.level<T.level&&z(I)}},B=0;for(let T=1;T<C.length;T++)C[T].priority>C[B].priority&&(B=T);let{n:L}=C.splice(B,1)[0];if(!p.has(L.key))continue;let D=new Map;if(z(L),f.size+D.size*4>o){H=!0;continue}for(let T of[...D.values()].sort((I,Z)=>I.level-Z.level)){p.delete(T.key),g.add(T.key);for(let I of qh(T,i))d(I),f.set(I.key,I),p.set(I.key,I),k(I)}}return{nodes:f,leaves:p,splits:g,roots:v,rootSize:i,maxLevel:u,limited:H}}function Jh(r,e){let t=new Map;function n(s){if(!e(s.key))return;if(!r.splits.has(s.key)){t.set(s.key,s);return}let a=qh(s,r.rootSize).map(o=>r.nodes.get(o.key)||o);a.every(o=>e(o.key))?a.forEach(n):t.set(s.key,s)}r.roots.forEach(n);let i=!0;for(;i;){i=!1;for(let s of t.values())if(bc(s,t,r.rootSize,r.maxLevel).some(([a])=>a&&s.level-a.level>1)){let a=r.nodes.get(Xh(s,r.rootSize).key);if(!a||!e(a.key))throw new Error("Resident ancestor missing");for(let[o,c]of t)c.ox>=a.ox&&c.oz>=a.oz&&c.ox+c.size<=a.ox+a.size&&c.oz+c.size<=a.oz+a.size&&t.delete(o);t.set(a.key,a),i=!0;break}}return t}function jh(r,e,t,n,i={}){let{divs:s=32,pixelError:a=2}=i,o=Math.min(4,s),c=e.height/(2*Math.tan(e.fov/2)),l=new Map,u=new Map,h=new Map,d=new Map,f=v=>(d.has(v)||d.set(v,vc(v)),d.get(v));for(let v of r.values()){h.set(v.key,bc(v,r,t,n));let x=Xh(v,t).key,m=v.distancePosition,b=e.position,_=m&&m[0]===b[0]&&m[1]===b[1]&&m[2]===b[2]?v.distance:$h(v,e.position),w=o;for(;w<s&&f(v.size/w)*c/Math.max(_,.05)>a;)w*=2;let y=l.get(x);y||(y={divs:w},l.set(x,y)),y.divs=Math.max(y.divs,w),u.set(v.key,y)}let p=!0;for(;p;){p=!1;for(let v of r.values()){let x=u.get(v.key);for(let[m]of h.get(v.key)){if(!m)continue;let b=u.get(m.key),_=v.size/x.divs,w=m.size/b.divs;_>w*2&&x.divs<s&&(x.divs*=2,p=!0),w>_*2&&b.divs<s&&(b.divs*=2,p=!0)}}}let g=new Map;for(let v of r.values()){let x=u.get(v.key).divs,m=v.size/x,b=0;for(let[_,w]of h.get(v.key))_&&_.size/u.get(_.key).divs>m&&(b|=w);g.set(v.key,{divs:x,mask:b})}return g}var Wh,Qh=Te(()=>{Ns();Wh=(r,e,t)=>`${r}:${e}:${t}`});var ed,Kh=Te(()=>{ed=`struct Build { origin: vec2<f32>, size: f32, slot: u32, divs: u32, columns: u32, seed: u32, pad: u32 }
@group(0) @binding(0) var outputTiles: texture_storage_2d<rgba32float, write>;
@group(0) @binding(1) var<uniform> build: Build;
@compute @workgroup_size(8,8)
fn generate(@builtin(global_invocation_id) id: vec3<u32>) {
  if (id.x > build.divs || id.y > build.divs) { return; }
  let xz = build.origin + vec2<f32>(id.xy) * (build.size / f32(build.divs));
  let h = progressive_height_gradient(xz,build.seed);
  let offset = vec2<u32>(build.slot % build.columns, build.slot / build.columns) * (build.divs+1u);
  textureStore(outputTiles,vec2<i32>(offset + id.xy),vec4<f32>(h,1.0));
}
struct Frame { vp: mat4x4<f32>, camera: vec4<f32>, settings: vec4<f32>, atlas: vec4<u32> }
struct Tile { geometry: vec4<f32>, cache: vec4<u32> }
@group(0) @binding(0) var tiles: texture_2d<f32>;
@group(0) @binding(1) var<storage,read> instances: array<Tile>;
@group(0) @binding(2) var<uniform> frame: Frame;
struct Varying {
  @builtin(position) clip: vec4<f32>, @location(0) world: vec3<f32>,
  @location(1) normal: vec3<f32>, @location(2) local: vec2<f32>,
  @location(3) @interpolate(flat) level: u32,
}
@vertex
fn vertex_main(@builtin(vertex_index) id: u32, @builtin(instance_index) instance: u32) -> Varying {
  let tile = instances[instance];
  let row = tile.cache.y + 1u;
  let xy = vec2<u32>(id % row,id / row);
  let offset = vec2<u32>(tile.cache.x % frame.atlas.y,tile.cache.x / frame.atlas.y) * (frame.atlas.x+1u);
  let h = textureLoad(tiles,vec2<i32>(offset+xy*(frame.atlas.x/tile.cache.y)),0).xyz;
  let uv = vec2<f32>(xy) / f32(tile.cache.y);
  let xz = tile.geometry.xy + uv * tile.geometry.z;
  let world = vec3<f32>(xz.x,h.x,xz.y);
  var clip = frame.vp * vec4<f32>(world,1);
  clip.z = (clip.z+clip.w)*0.5;
  return Varying(clip,world,normalize(vec3<f32>(-h.y,1,-h.z)),uv,u32(tile.geometry.w));
}
fn detail_color(level: u32) -> vec3<f32> {
  let t = f32(level) * 0.71;
  return 0.52 + 0.38 * cos(vec3<f32>(t,t+2.1,t+4.2));
}
@fragment
fn fragment_main(input: Varying) -> @location(0) vec4<f32> {
  if (length(input.world-frame.camera.xyz) > frame.settings.x) { discard; }
  let n = normalize(input.normal);
  let slope = 1.0-n.y;
  let grass = mix(vec3<f32>(.19,.27,.09),vec3<f32>(.36,.39,.18),smoothstep(-40.0,160.0,input.world.y));
  var color = mix(grass,vec3<f32>(.36,.31,.24),smoothstep(.05,.36,slope));
  // World-space albedo; no per-frame noise evaluation or full-world texture.
  color *= .88+.12*n.y;
  if (frame.settings.y > 0.5) { color = detail_color(input.level); }
  if (frame.settings.z > 0.5) {
    let edge = min(min(input.local.x,1-input.local.x),min(input.local.y,1-input.local.y));
    let border = 1.0-smoothstep(0.0,max(fwidth(edge)*1.5,.001),edge);
    color = mix(color,vec3<f32>(.09,.12,.10),border*.85);
  }
  let light = .3+.8*max(dot(n,normalize(vec3<f32>(.4,.8,.3))),0.0);
  return vec4<f32>(pow(color*light,vec3<f32>(1.0/2.2)),1);
}
`});var Os,td=Te(()=>{Ps();Ns();Qh();Is();Kh();Os=class{constructor(e,t={}){this.canvas=e,this.options={rootSize:1024,minSize:1,divs:32,memoryMB:8,maxTiles:384,buildsPerFrame:6,...t};let{rootSize:n,minSize:i,divs:s,memoryMB:a,buildsPerFrame:o,maxTiles:c}=this.options,l=u=>u>0&&Number.isInteger(Math.log2(u));if(!l(n)||!l(i)||i>n||!l(s)||s<2||s>128||!Number.isFinite(a)||a<4||!Number.isInteger(o)||o<1||o>32||!Number.isInteger(c)||c<48||c>1024)throw new RangeError("Use power-of-two tile sizes/divisions, 4+ MB, 48\u20131024 tiles and 1\u201332 builds per frame");this.settings={pixelError:2},this.entries=new Map,this.templates=new Map,this.free=[],this.errors=[],this.stats={generated:0,evicted:0,bundleBuilds:0,selections:0},this.frameData=new ArrayBuffer(112),this.lastSelect=-1/0,this.dirty=!0,this.disposed=!1}async initialize(){let e=await mi(this),t=this.options.divs+1,n=Math.min(this.options.maxTiles,Math.floor(this.options.memoryMB*1024**2/(t*t*16)));if(this.columns=Math.min(Math.floor(Math.sqrt(n)),Math.floor(e.limits.maxTextureDimension2D/t)),this.rows=Math.min(Math.floor(n/this.columns),Math.floor(e.limits.maxTextureDimension2D/t)),this.capacity=this.columns*this.rows,this.capacity<48)throw new Error("Tile cache needs room for at least 48 tiles");this.texture=e.createTexture({label:"Bounded progressive height/gradient tile atlas",size:[t*this.columns,t*this.rows],format:"rgba32float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this.stats.atlasBytes=this.capacity*t*t*16,this.free=Array.from({length:this.capacity},(l,u)=>u),this.buildParams=e.createBuffer({size:256*this.options.buildsPerFrame,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.frameParams=e.createBuffer({size:112,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.instanceBuffer=e.createBuffer({size:this.capacity*32,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});let i=e.createShaderModule({code:Vh+ed}),s=(await i.getCompilationInfo()).messages.filter(l=>l.type==="error");if(s.length)throw new Error(s.map(l=>l.message).join(`
`));let a=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba32float"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform",hasDynamicOffset:!0,minBindingSize:32}}]});this.compute=e.createComputePipeline({layout:e.createPipelineLayout({bindGroupLayouts:[a]}),compute:{module:i,entryPoint:"generate"}}),this.buildGroup=e.createBindGroup({layout:a,entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:{buffer:this.buildParams,size:32}}]});let o=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.VERTEX,texture:{sampleType:"unfilterable-float"}},{binding:1,visibility:GPUShaderStage.VERTEX,buffer:{type:"read-only-storage"}},{binding:2,visibility:GPUShaderStage.VERTEX|GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),c={layout:e.createPipelineLayout({bindGroupLayouts:[o]}),vertex:{module:i,entryPoint:"vertex_main"},fragment:{module:i,entryPoint:"fragment_main",targets:[{format:this.format}]},primitive:{topology:"triangle-list",cullMode:"back"},depthStencil:{format:"depth24plus",depthWriteEnabled:!0,depthCompare:"less"}};return this.pipeline=e.createRenderPipeline(c),this.linePipeline=e.createRenderPipeline({...c,primitive:{topology:"line-list"}}),this.renderGroup=e.createBindGroup({layout:o,entries:[{binding:0,resource:this.texture.createView()},{binding:1,resource:{buffer:this.instanceBuffer}},{binding:2,resource:{buffer:this.frameParams}}]}),e.features.has("timestamp-query")&&(this.timer={query:e.createQuerySet({type:"timestamp",count:4}),resolve:e.createBuffer({size:32,usage:GPUBufferUsage.QUERY_RESOLVE|GPUBufferUsage.COPY_SRC}),read:e.createBuffer({size:32,usage:GPUBufferUsage.MAP_READ|GPUBufferUsage.COPY_DST}),busy:!1}),this.resize(),this}configure(e){Object.assign(this.settings,e),this.dirty=!0}resize(){let{width:e,height:t}=gi(this.canvas,this.options);this.depth&&e===this.canvas.width&&t===this.canvas.height||(this.canvas.width=e,this.canvas.height=t,this.depth?.destroy(),this.depth=this.device.createTexture({size:[e,t],format:"depth24plus",usage:GPUTextureUsage.RENDER_ATTACHMENT}),this.dirty=!0)}select(e,t,n){let i=performance.now(),s=this.options.rootSize;for(;(Math.ceil(2*e.far/s)+2)**2>this.capacity/4;)s*=2;this.plan&&this.plan.rootSize!==s&&(this.entries.clear(),this.free=Array.from({length:this.capacity},(o,c)=>c)),this.plan=Zh(e,t,{...this.options,rootSize:s,maxNodes:Math.floor(this.capacity*.88),boundsCache:this.plan?.nodes,...this.settings},this.plan?.splits),this.planes=t,this.lastSelect=n,this.lastView=[...e.position,e.fov,e.far,e.height];let a=Math.abs(e.position[1]-wt(e.position[0],e.position[2]));this.sampleMove=Math.max(this.options.minSize*.25,Math.min(64,a*.06)),this.buildQueue=[];for(let o of this.plan.nodes.values()){let c=this.entries.get(o.key);c?c.touched=n:this.buildQueue.push(o)}this.buildQueue.sort((o,c)=>o.level-c.level||(o.distance??0)-(c.distance??0)),this.stats.pending=this.buildQueue.length,this.stats.selections++,this.stats.selectionMs=performance.now()-i,this.dirty=!1,this.cutDirty=!0,this.bundle=null}allocate(e,t){if(!this.free.length){let i;for(let s of this.entries.values())!this.plan.nodes.has(s.key)&&(!i||s.touched<i.touched)&&(i=s);if(!i)throw new Error("Resident tile budget exhausted");this.entries.delete(i.key),this.free.push(i.slot),this.stats.evicted++}let n={...e,slot:this.free.pop(),touched:t};return this.entries.set(e.key,n),n}build(e,t,n){let i=this.buildQueue.splice(0,this.options.buildsPerFrame);if(this.stats.pending=this.buildQueue.length,this.stats.builtThisFrame=i.length,!i.length)return!1;let s=new ArrayBuffer(i.length*256),a=new Float32Array(s),o=new Uint32Array(s);i.forEach((l,u)=>{let h=this.allocate(l,t),d=u*64;a.set([l.ox,l.oz,l.size],d),o.set([h.slot,this.options.divs,this.columns,7,0],d+3)}),this.device.queue.writeBuffer(this.buildParams,0,s);let c=e.beginComputePass(n?{timestampWrites:{querySet:this.timer.query,beginningOfPassWriteIndex:0,endOfPassWriteIndex:1}}:{});return c.setPipeline(this.compute),i.forEach((l,u)=>{c.setBindGroup(0,this.buildGroup,[u*256]),c.dispatchWorkgroups(Math.ceil((this.options.divs+1)/8),Math.ceil((this.options.divs+1)/8))}),c.end(),this.stats.generated+=i.length,this.cutDirty=!0,this.bundle=null,!0}template(e,t,n){let i=`${e}:${t}:${n}`;if(this.templates.has(i))return this.templates.get(i);let s=yi(e,t,"mc33"),a=s.length/3;n&&(s=Rs(s));let o=this.device.createBuffer({size:s.byteLength,usage:GPUBufferUsage.INDEX,mappedAtCreation:!0});new Uint32Array(o.getMappedRange()).set(s),o.unmap();let c={buffer:o,count:s.length,triangles:a};return this.templates.set(i,c),c}prepareCut(e){let t=performance.now();this.cut=Jh(this.plan,n=>this.entries.has(n)),this.meshLevels=jh(this.cut,e,this.plan.rootSize,this.plan.maxLevel,{...this.options,...this.settings}),this.records=[];for(let n of this.cut.values()){Us(n);let i=this.meshLevels.get(n.key);this.records.push({n,...i,slot:this.entries.get(n.key).slot,visible:!1})}this.cutDirty=!1,this.bundle=null,this.stats.cutMs=performance.now()-t}prepare(e,t,n){let i=performance.now(),s=!this.bundle||this.wireframe!==n;for(let v of this.records){let x=Yh(v.n,t)&&yc(v.n,e.position)<=e.far;x!==v.visible&&(s=!0),v.visible=x}if(!s){this.stats.drawPlanMs=performance.now()-i;return}let a=new Map,o=Array(this.plan.maxLevel+1).fill(0),c=1/0,l=0;for(let v of this.records){if(!v.visible)continue;let{n:x,mask:m,divs:b}=v,_=`${b}:${m}`;a.has(_)||a.set(_,[]),a.get(_).push(v),o[x.level]++,m&&l++,c=Math.min(c,x.size/b)}let u=new ArrayBuffer(this.capacity*32),h=new Float32Array(u),d=new Uint32Array(u),f=this.device.createRenderBundleEncoder({colorFormats:[this.format],depthStencilFormat:"depth24plus"});f.setPipeline(n?this.linePipeline:this.pipeline),f.setBindGroup(0,this.renderGroup);let p=0,g=0;for(let v of a.values()){let x=this.template(v[0].divs,v[0].mask,n),m=p;for(let{n:b,slot:_,divs:w}of v)h.set([b.ox,b.oz,b.size,b.level],p*8),d.set([_,w],p*8+4),p++;f.setIndexBuffer(x.buffer,"uint32"),f.drawIndexed(x.count,v.length,0,0,m),g+=x.triangles*v.length}p&&this.device.queue.writeBuffer(this.instanceBuffer,0,u,0,p*32),this.bundle=f.finish(),this.wireframe=n,Object.assign(this.stats,{drawn:p,triangles:g,drawCalls:a.size,finest:c,seams:l,histogram:o}),this.stats.bundleBuilds++,this.stats.drawPlanMs=performance.now()-i}render(e,t=[],n=performance.now(),{lodColors:i=!1,tileBorders:s=!0,wireframe:a=!1}={}){if(this.disposed)throw new Error("Renderer has been disposed");let o=performance.now();this.stats.selectionMs=0,this.stats.cutMs=0,this.resize();let c=[...e.position,e.fov,e.far,e.height],l=!this.lastView||Math.hypot(...e.position.map((x,m)=>x-this.lastView[m]))>this.sampleMove||c.slice(3).some((x,m)=>Math.abs(x-this.lastView[m+3])>1e-5);(this.dirty||l&&n-this.lastSelect>=120)&&this.select(e,t,n);let u=this.device.createCommandEncoder(),h=this.timer&&!this.timer.busy&&(!this.lastTimer||n-this.lastTimer>350);h&&(this.timer.busy=!0,this.lastTimer=n);let d=this.build(u,n,h);this.cutDirty&&this.prepareCut(e),this.prepare(e,t,a);let f=new Float32Array(this.frameData),p=new Uint32Array(this.frameData);f.set(e.viewProjection),f.set([...e.position,1],16),f.set([e.far,Number(i),Number(s),0],20),p.set([this.options.divs,this.columns,0,0],24),this.device.queue.writeBuffer(this.frameParams,0,this.frameData);let g={colorAttachments:[{view:this.context.getCurrentTexture().createView(),clearValue:{r:.54,g:.66,b:.75,a:1},loadOp:"clear",storeOp:"store"}],depthStencilAttachment:{view:this.depth.createView(),depthClearValue:1,depthLoadOp:"clear",depthStoreOp:"discard"}};h&&(g.timestampWrites={querySet:this.timer.query,beginningOfPassWriteIndex:2,endOfPassWriteIndex:3});let v=u.beginRenderPass(g);return v.executeBundles([this.bundle]),v.end(),h&&(u.resolveQuerySet(this.timer.query,d?0:2,d?4:2,this.timer.resolve,0),u.copyBufferToBuffer(this.timer.resolve,0,this.timer.read,0,d?32:16)),this.device.queue.submit([u.finish()]),h&&this.timer.read.mapAsync(GPUMapMode.READ).then(()=>{let x=new BigUint64Array(this.timer.read.getMappedRange());this.stats.gpuMs=Number(x[d?3:1]-x[d?2:0])/1e6,this.stats.generationGpuMs=d?Number(x[1]-x[0])/1e6:0,this.timer.read.unmap(),this.timer.busy=!1}).catch(x=>{this.disposed||this.errors.push(x.message)}),Object.assign(this.stats,{resident:this.entries.size,capacity:this.capacity,limited:this.plan.limited,cpuMs:performance.now()-o}),this.stats}async readTile(e){let t=this.entries.get(e);if(!t)throw new Error("Tile is not resident");let n=this.options.divs+1,i=Math.ceil(n*16/256)*256,s=this.device.createBuffer({size:i*n,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),a=this.device.createCommandEncoder();a.copyTextureToBuffer({texture:this.texture,origin:[t.slot%this.columns*n,Math.floor(t.slot/this.columns)*n]},{buffer:s,bytesPerRow:i},[n,n]),this.device.queue.submit([a.finish()]),await s.mapAsync(GPUMapMode.READ);let o=new Float32Array(s.getMappedRange()),c=new Float32Array(n*n*4);for(let l=0;l<n;l++)c.set(o.subarray(l*i/4,l*i/4+n*4),l*n*4);return s.unmap(),s.destroy(),{node:t,data:c,divs:this.options.divs}}dispose(){if(!this.disposed){this.disposed=!0,this.depth?.destroy(),this.texture?.destroy(),this.buildParams?.destroy(),this.frameParams?.destroy(),this.instanceBuffer?.destroy();for(let e of this.templates.values())e.buffer.destroy();this.timer?.query.destroy(),this.timer?.resolve.destroy(),this.timer?.read.destroy(),xi(this)}}}});var nd={};pr(nd,{startDemo:()=>ov});async function ov(){let r=T=>document.getElementById(T),e=r("terrain"),t=r("status"),n=[...document.querySelectorAll("button,input")];n.forEach(T=>T.disabled=!0),(innerWidth<800||innerHeight<650)&&(r("controls").open=!1);let i=await new Os(e).initialize(),s=new He(60,1,.02,2048),a=new me,o=new yt,c=new E,l=new E,u=new Set,h=.25,d=-.4,f=64,p=!1,g=!1,v=0,x=0,m=performance.now(),b=16.67,_=0,w=-1/0,y;function P(){s.position.set(128.25,wt(128.25,96.25)+64,96.25),h=.25,d=-.4,f=64,r("follow").checked=!0,r("altitude").value=6,p=!1,r("tour").textContent="Start flythrough",u.clear()}P();function C(T){f=Math.max(.25,Math.min(2048,T)),s.position.y=wt(s.position.x,s.position.z)+f,r("altitude").value=Math.log2(f)}r("sky").onclick=()=>{C(1200),d=-.6},r("land").onclick=()=>{C(.75),d=-.28},r("reset").onclick=P,r("altitude").oninput=()=>C(2**Number(r("altitude").value)),r("detail").oninput=()=>{i.configure({pixelError:Number(r("detail").value)}),r("detailLabel").textContent=`${r("detail").value} px`},r("distance").oninput=()=>{s.far=Number(r("distance").value),r("distanceLabel").textContent=`${(s.far/1e3).toFixed(2)} km`,i.dirty=!0},r("follow").onchange=()=>{f=Math.max(.25,s.position.y-wt(s.position.x,s.position.z))},r("tour").onclick=()=>{p=!p,r("tour").textContent=p?"Stop flythrough":"Start flythrough",u.clear(),e.focus()},e.onpointerdown=T=>{g=!0,v=T.clientX,x=T.clientY,e.setPointerCapture(T.pointerId),e.focus()},e.onpointermove=T=>{g&&(h+=(T.clientX-v)*.003,d=Math.max(-1.5,Math.min(1.45,d-(T.clientY-x)*.003)),v=T.clientX,x=T.clientY)},e.onpointerup=e.onpointercancel=()=>{g=!1};let F=new Set(["KeyW","KeyA","KeyS","KeyD","KeyC","Space","ShiftLeft","ShiftRight"]),k=T=>{!F.has(T.code)||/INPUT|SELECT|BUTTON/.test(document.activeElement?.tagName)||(u.add(T.code),T.preventDefault())},H=T=>u.delete(T.code),B=()=>{u.clear(),g=!1};window.addEventListener("keydown",k),window.addEventListener("keyup",H),window.addEventListener("blur",B);let L=T=>`hsl(${(T*41+65)%360} 52% 60%)`;function D(T,I){if(T-w<250)return;w=T;let Z=Number.isFinite(I.finest)?I.finest<1?`${(I.finest*100).toFixed(3)} cm`:`${I.finest.toFixed(2)} m`:"\u2014";r("spacing").textContent=Z,r("fps").textContent=`${Math.round(1e3/b)} \xB7 ${_.toFixed(1)} / ${I.gpuMs?.toFixed(1)??"\u2014"} ms`,r("triangles").textContent=`${(I.triangles/1e3).toFixed(0)}k \xB7 ${I.drawCalls}`,r("cache").textContent=`${I.resident}/${I.capacity} \xB7 ${(I.atlasBytes/1024**2).toFixed(1)} MB`,r("builds").textContent=`${I.builtThisFrame} / ${I.pending}`,r("generation").textContent=`${I.generationGpuMs?.toFixed(2)??"\u2014"} ms \xB7 ${I.evicted}`,r("altitudeLabel").textContent=`${f<10?f.toFixed(2):Math.round(f)} m`,r("altitude").value=Math.log2(f),I.drawn&&(r("loading").hidden=!0);let $=I.histogram.filter(de=>de>0).length;t.textContent=i.errors.length?i.errors.at(-1):`${$} visible detail levels \xB7 ${I.seams} stitched tiles \xB7 ${I.pending?"generating finer tiles\u2026":"cache settled"}${I.limited?" \xB7 detail budget reached":""}`,t.classList.toggle("error",i.errors.length>0),Object.assign(t.dataset,{pending:I.pending,errors:i.errors.length,drawn:I.drawn,spacing:I.finest,resident:I.resident,clearance:f});let U=r("map").getContext("2d"),W=196,G=Math.max(16,Math.min(s.far*2,f*8)),q=s.position.x-G/2,O=s.position.z-G/2;U.fillStyle="#1a2931",U.fillRect(0,0,W,W);for(let de of i.cut?.values()||[]){let fe=(de.ox-q)/G*W,ee=(de.oz-O)/G*W,le=de.size/G*W;fe+le<0||ee+le<0||fe>W||ee>W||(U.fillStyle=L(de.level),U.fillRect(fe,ee,le,le),U.strokeStyle="#1a293177",U.strokeRect(fe,ee,le,le))}U.fillStyle="#fff",U.beginPath(),U.arc(W/2,W/2,3,0,Math.PI*2),U.fill(),U.strokeStyle="#fff",U.beginPath(),U.moveTo(W/2,W/2),U.lineTo(W/2+Math.sin(h)*16,W/2-Math.cos(h)*16),U.stroke(),r("mapLabel").textContent=`${Math.round(G)} m footprint \xB7 zooms as you descend`}function z(T){if(i.disposed)return;let I=Math.min(.05,(T-m)/1e3);b=b*.94+(T-m)*.06,m=T;let Z=Math.max(.4,Math.min(220,f*.7))*(u.has("ShiftLeft")||u.has("ShiftRight")?4:1);l.set(0,0,0);let $=Number(u.has("KeyW")||p)-Number(u.has("KeyS")),U=Number(u.has("KeyD"))-Number(u.has("KeyA"));l.x=Math.sin(h)*$+Math.cos(h)*U,l.z=-Math.cos(h)*$+Math.sin(h)*U,l.lengthSq()&&s.position.addScaledVector(l.normalize(),Z*I);let W=Number(u.has("Space"))-Number(u.has("KeyC"));r("follow").checked?(f=Math.max(.25,Math.min(2048,f+W*Z*I)),s.position.y=wt(s.position.x,s.position.z)+f):(s.position.y+=W*Z*I,s.position.y=Math.max(wt(s.position.x,s.position.z)+.25,s.position.y),f=s.position.y-wt(s.position.x,s.position.z)),s.near=Math.max(.015,Math.min(1,f*.01)),s.aspect=e.clientWidth/e.clientHeight,c.set(Math.sin(h)*Math.cos(d),Math.sin(d),-Math.cos(h)*Math.cos(d)),s.lookAt(s.position.clone().add(c)),s.updateProjectionMatrix(),s.updateMatrixWorld(),a.multiplyMatrices(s.projectionMatrix,s.matrixWorldInverse),o.setFromProjectionMatrix(a);try{let G=i.render({position:s.position.toArray(),height:e.height,fov:s.fov*Math.PI/180,far:s.far,viewProjection:a.elements},o.planes.map(q=>[q.normal.x,q.normal.y,q.normal.z,q.constant]),T,{lodColors:r("colors").checked,tileBorders:r("borders").checked,wireframe:r("wire").checked});_=_*.94+G.cpuMs*.06,D(T,G),y=requestAnimationFrame(z)}catch(G){t.textContent=G.message,t.classList.add("error"),console.error(G)}}n.forEach(T=>T.disabled=!1),y=requestAnimationFrame(z),window.addEventListener("pagehide",()=>{cancelAnimationFrame(y),i.dispose(),window.removeEventListener("keydown",k),window.removeEventListener("keyup",H),window.removeEventListener("blur",B)},{once:!0})}var id=Te(()=>{or();td();Ns()});var Pc=`<!doctype html>
<!-- Joshua Brewster (MIT License) -->
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Marching Cubes \u2014 Bourke / MC33</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #eee;
        color: #182c3a;
        font:
          14px system-ui,
          sans-serif;
      }
      header {
        padding: 14px 20px;
        background: #fff;
        border-bottom: 1px solid #ccd5dc;
      }
      h1 {
        margin: 0 0 10px;
        font-size: 20px;
      }
      .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 14px;
      }
      label {
        display: flex;
        gap: 6px;
        align-items: center;
      }
      select,
      button {
        padding: 6px 10px;
        font: inherit;
      }
      #status {
        margin: 10px 0 0;
        min-height: 20px;
      }
      #status.error {
        color: #a12222;
      }
      main {
        display: grid;
        grid-template-columns: 1fr 1fr;
      }
      section {
        min-width: 0;
      }
      h2 {
        margin: 12px 20px 0;
        min-height: 38px;
        font-size: 14px;
        font-weight: 500;
      }
      canvas {
        display: block;
        width: 100%;
        height: 65vh;
      }
      .hint {
        margin: 0 20px 12px;
        color: #596773;
      }
      @media (max-width: 420px) {
        main {
          grid-template-columns: 1fr;
        }
        canvas {
          height: 40vh;
        }
      }
      .demo-nav {
        position: sticky;
        top: 0;
        z-index: 5;
        background: #fff;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
        font-size: 12px;
      }
      .demo-nav a {
        display: block;
        padding: 6px 9px;
        border: 1px solid #8298b266;
        border-radius: 5px;
        text-decoration: none;
      }
      .demo-nav a[aria-current="page"] {
        background: #8298b233;
        font-weight: 600;
      }
      .demo-nav a:hover {
        background: #8298b244;
      }
    </style>
  </head>
  <body>
    <header>
      <nav class="demo-nav" aria-label="Demos">
        <a href="index.html?demo=sphere" aria-current="page">Sphere</a
        ><a href="index.html?demo=terrain">Terrain</a
        ><a href="index.html?demo=space">Infinite space</a>
        <a href="index.html?demo=progressive">Noise tiles</a>
      </nav>
      <h1>Marching Cubes \u2014 Bourke / MC33</h1>
      <div class="controls">
        <label
          >Algorithm
          <select id="algorithm">
            <option value="bourke">Bourke isosurfaces</option>
            <option value="mc33">Marching Cubes 33</option>
          </select></label
        >
        <label
          >Compute
          <select id="backend">
            <option value="cpu">CPU</option>
            <option value="gpu">WebGPU</option>
          </select></label
        >
        <label
          >Coordinates
          <select id="coordinates">
            <option value="cartesian">Cartesian</option>
            <option value="spherical">Spherical</option>
            <option value="cube-sphere">Cube-sphere (cloud mapping)</option>
          </select></label
        >
        <label
          >Surface
          <select id="surface">
            <option value="outer">Outer only</option>
            <option value="inner">Inner only</option>
            <option value="both">Both</option>
          </select></label
        >
        <label
          >Shell thickness
          <input
            id="thickness"
            type="number"
            value="0.004"
            min="0.0001"
            step="0.001"
            style="width: 80px"
        /></label>
        <label
          >Surface offset
          <input
            id="isolevel"
            type="number"
            value="0"
            step="0.001"
            style="width: 80px"
        /></label>
        <button id="rebuild" type="button">Rebuild mesh</button>
        <label><input id="wireframe" type="checkbox" /> Wireframe</label>
      </div>
      <p id="status" role="status" aria-live="polite">
        Preparing the point cloud and scalar field\u2026
      </p>
    </header>
    <main>
      <section>
        <h2>Source point cloud</h2>
        <canvas id="pointCanvas"></canvas>
      </section>
      <section>
        <h2 id="meshLabel">Isosurface</h2>
        <canvas id="meshCanvas"></canvas>
      </section>
    </main>
    <p class="hint">
      The outer surface fits the source sphere at offset 0. The inner surface
      sits one shell thickness inside it. Both views share the same camera
      scale.
    </p>
  </body>
</html>
`;var Cc=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Adaptive Terrain \u2014 Bourke / MC33</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #16232c;
        color: #ecf2ed;
        font:
          13px system-ui,
          sans-serif;
        overflow: hidden;
      }
      #terrain {
        display: block;
        width: 100vw;
        height: 100vh;
        touch-action: none;
      }
      .panel {
        position: absolute;
        z-index: 2;
        background: rgba(15, 27, 35, 0.88);
        border: 1px solid #6c858558;
        border-radius: 10px;
        backdrop-filter: blur(8px);
      }
      header {
        top: 16px;
        left: 16px;
        padding: 16px;
        width: 350px;
        max-height: calc(100vh - 320px);
        overflow: auto;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 5px;
        letter-spacing: -0.4px;
      }
      summary {
        cursor: pointer;
        color: #cde1b4;
        margin: 8px 0;
      }
      details[open] summary {
        margin-bottom: 12px;
      }
      .sub {
        color: #b5c7c8;
        margin: 0 0 14px;
      }
      .row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin: 9px 0;
        gap: 10px;
      }
      label {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        width: 100%;
      }
      select,
      button,
      input[type="number"] {
        font: inherit;
        color: inherit;
        background: #273b47;
        border: 1px solid #6c858588;
        border-radius: 5px;
        padding: 6px 8px;
      }
      input[type="range"] {
        width: 150px;
        accent-color: #b2d791;
      }
      button {
        cursor: pointer;
      }
      button:hover {
        background: #3d5661;
      }
      .checks {
        display: flex;
        gap: 14px;
        flex-wrap: wrap;
        margin: 14px 0;
      }
      .checks label {
        width: auto;
        justify-content: start;
        gap: 5px;
      }
      #status {
        color: #b8d8ad;
        min-height: 20px;
        margin: 10px 0 0;
      }
      #status.error {
        color: #ffb3a5;
      }
      #telemetry {
        left: 16px;
        bottom: 16px;
        width: 350px;
        padding: 14px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .metric strong {
        display: block;
        font-size: 19px;
        font-weight: 600;
        font-variant-numeric: tabular-nums;
      }
      .metric span {
        font-size: 11px;
        color: #abc0c5;
      }
      #histogram {
        grid-column: 1/3;
        display: flex;
        gap: 3px;
        height: 8px;
        border-radius: 4px;
        overflow: hidden;
        background: #263744;
      }
      #mapPanel {
        right: 16px;
        bottom: 16px;
        padding: 12px;
      }
      #map {
        width: 200px;
        height: 200px;
        display: block;
      }
      #mapPanel p {
        font-size: 11px;
        color: #abc0c5;
        margin: 8px 0 0;
      }
      #help {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        color: #e9f1ef;
        text-align: center;
        max-width: 420px;
        text-shadow: 0 1px 4px #14212b;
        font-size: 12px;
        pointer-events: none;
      }
      #report {
        top: 16px;
        right: 16px;
        padding: 14px;
        width: 340px;
        white-space: pre-wrap;
        display: none;
        font: 12px system-ui;
        line-height: 1.6;
      }
      a {
        color: #cde1b4;
      }
      #loading {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        color: #eef6f2;
        font-size: 18px;
        pointer-events: none;
      }
      @media (max-width: 800px), (max-height: 600px) {
        header {
          width: 290px;
          top: 8px;
          left: 8px;
          padding: 12px;
          max-height: calc(100vh - 205px);
          overflow: auto;
        }
        #telemetry {
          width: 290px;
          left: 8px;
          bottom: 8px;
          grid-template-columns: repeat(3, 1fr);
          padding: 10px;
          gap: 8px;
        }
        .metric strong {
          font-size: 15px;
        }
        .metric span {
          font-size: 10px;
        }
        #histogram {
          grid-column: 1/4;
        }
        #mapPanel {
          display: none;
        }
        #help {
          display: none;
        }
        #report {
          right: 8px;
          top: auto;
          bottom: 8px;
          width: 270px;
          max-height: calc(100vh - 16px);
          overflow: auto;
        }
      }
      .demo-nav {
        position: sticky;
        top: 0;
        z-index: 5;
        background: #0f1b23;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
        font-size: 12px;
      }
      .demo-nav a {
        display: block;
        padding: 6px 9px;
        border: 1px solid #8298b266;
        border-radius: 5px;
        text-decoration: none;
      }
      .demo-nav a[aria-current="page"] {
        background: #8298b233;
        font-weight: 600;
      }
      .demo-nav a:hover {
        background: #8298b244;
      }
    </style>
  </head>
  <body>
    <canvas
      id="terrain"
      aria-label="Adaptive terrain map"
      tabindex="0"
    ></canvas>
    <div id="loading">Preparing terrain\u2026</div>
    <header class="panel">
      <nav class="demo-nav" aria-label="Demos">
        <a href="index.html?demo=sphere">Sphere</a
        ><a href="index.html?demo=terrain" aria-current="page">Terrain</a
        ><a href="index.html?demo=space">Infinite space</a>
        <a href="index.html?demo=progressive">Noise tiles</a>
      </nav>
      <h1>Adaptive terrain</h1>
      <p class="sub" id="worldLabel">8 \xD7 8 km world \xB7 samples down to 2 m</p>
      <details id="terrainControls" open>
        <summary>Terrain controls</summary>
        <div class="row">
          <label
            >Surface<select id="surface">
              <option value="mc33">MC33 heightfield</option>
              <option value="bourke">Bourke heightfield</option>
            </select></label
          >
        </div>
        <div class="row">
          <label
            >Sampling<select id="sampling">
              <option value="adaptive">Adaptive LOD</option>
              <option value="uniform">Uniform full detail</option>
            </select></label
          >
        </div>
        <div class="row">
          <label for="error"
            >Pixel error <output id="errorValue">2.5 px</output></label
          ><input
            id="error"
            type="range"
            min="0.5"
            max="12"
            step="0.5"
            value="2.5"
            aria-label="Pixel error"
          />
        </div>
        <div class="row">
          <label for="radius"
            >Player detail <output id="radiusValue">110 m</output></label
          ><input
            id="radius"
            type="range"
            min="0"
            max="350"
            step="10"
            value="110"
            aria-label="Player detail radius"
          />
        </div>
        <div class="row">
          <label
            >Field of view<input
              id="fov"
              type="number"
              min="25"
              max="100"
              value="60"
              style="width: 75px"
          /></label>
        </div>
        <div class="row">
          <label for="distance"
            >Render distance <output id="distanceValue">1800 m</output></label
          ><input
            id="distance"
            type="range"
            min="300"
            max="32000"
            step="100"
            value="1800"
            aria-label="Max render distance"
          />
        </div>
        <div class="checks">
          <label><input id="infinite" type="checkbox" />Infinite terrain</label
          ><label><input id="colors" type="checkbox" />LOD colors</label
          ><label><input id="wire" type="checkbox" />Wireframe</label>
        </div>
        <div class="checks">
          <label
            ><input id="trees" type="checkbox" checked />Instanced trees</label
          >
        </div>
        <div class="row">
          <label for="treeDistance"
            >Tree distance <output id="treeDistanceValue">1400 m</output></label
          ><input
            id="treeDistance"
            type="range"
            min="200"
            max="2500"
            step="100"
            value="1400"
            aria-label="Tree render distance"
          />
        </div>
        <div class="row">
          <button id="tour">Fly through map</button
          ><button id="benchmark">Compare LOD</button
          ><button id="reset">Reset</button>
        </div>
      </details>
      <p id="status" role="status" aria-live="polite">
        Compiling the GPU terrain pipeline\u2026
      </p>
      <p style="margin: 10px 0 0; font-size: 11px; color: #abc0c5">
        Drag to look \xB7 WASD \xB7 Space up \xB7 C down \xB7 Shift faster
      </p>
    </header>
    <div id="telemetry" class="panel" aria-label="Terrain performance">
      <div class="metric">
        <strong id="frameTime">\u2014</strong><span>frame / GPU render</span>
      </div>
      <div class="metric">
        <strong id="triangleCount">\u2014</strong><span>visible triangles</span>
      </div>
      <div class="metric">
        <strong id="drawCount">\u2014</strong><span>terrain draws / tiles</span>
      </div>
      <div class="metric">
        <strong id="sampleCount">\u2014</strong
        ><span>active vertices / full detail</span>
      </div>
      <div class="metric">
        <strong id="cacheCount">\u2014</strong
        ><span>resident tiles / memory cap</span>
      </div>
      <div class="metric">
        <strong id="buildCount">\u2014</strong><span>tile builds / pending</span>
      </div>
      <div class="metric">
        <strong id="treeCount">\u2014</strong><span>trees / vegetation draws</span>
      </div>
      <div class="metric">
        <strong id="treeLods">\u2014</strong
        ><span>trees: fine / medium / distant</span>
      </div>
      <div id="histogram" aria-label="LOD distribution"></div>
    </div>
    <aside id="mapPanel" class="panel">
      <canvas
        id="map"
        width="200"
        height="200"
        aria-label="Terrain LOD minimap"
      ></canvas>
      <p>
        Detail: red \u2192 orange \u2192 green \u2192 blue \u2192 violet<br /><span
          id="positionLabel"
        ></span>
      </p>
    </aside>
    <p id="help">
      WASD move \xB7 drag to look \xB7 Shift faster \xB7 Space up / C down<br />Enable
      Infinite terrain, then Fly through map for an endless flight.
    </p>
    <pre id="report" class="panel" role="status"></pre>
  </body>
</html>
`;var Rc=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Infinite Space \u2014 Volumetric LOD</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        background: #050611;
        color: #eef2ff;
        font:
          13px system-ui,
          sans-serif;
        overflow: hidden;
      }
      #space {
        display: block;
        width: 100vw;
        height: 100vh;
        touch-action: none;
        outline: none;
      }
      .panel {
        position: absolute;
        z-index: 2;
        border: 1px solid #8c9bbb35;
        background: #080d21e8;
        border-radius: 12px;
        backdrop-filter: blur(8px);
      }
      header {
        left: 16px;
        top: 16px;
        width: 330px;
        padding: 16px;
        max-height: calc(100vh - 345px);
        overflow: auto;
      }
      h1 {
        font-size: 22px;
        font-weight: 600;
        margin: 0 0 4px;
        letter-spacing: -0.5px;
      }
      .sub {
        color: #a5b1d4;
        margin: 0 0 12px;
        line-height: 1.5;
      }
      summary {
        cursor: pointer;
        color: #aecbff;
        margin: 8px 0 12px;
      }
      .row {
        margin: 9px 0;
        display: flex;
        gap: 12px;
        align-items: center;
        justify-content: space-between;
      }
      label {
        display: flex;
        gap: 10px;
        align-items: center;
        justify-content: space-between;
        width: 100%;
      }
      select,
      button {
        background: #1b2540;
        color: inherit;
        border: 1px solid #8c9bbb60;
        font: inherit;
        border-radius: 5px;
        padding: 6px 8px;
      }
      button {
        cursor: pointer;
      }
      button:hover {
        background: #2c3c62;
      }
      input[type="range"] {
        width: 145px;
        accent-color: #94aeef;
      }
      .checks {
        display: flex;
        gap: 16px;
        margin: 12px 0;
      }
      .checks label {
        width: auto;
      }
      .buttons {
        display: flex;
        gap: 7px;
        flex-wrap: wrap;
        margin: 12px 0;
      }
      #status {
        color: #b3e7d9;
        font-size: 12px;
        line-height: 1.5;
        margin: 12px 0 0;
      }
      #status.error {
        color: #ffb6b6;
      }
      a {
        color: #a6c4ff;
      }
      .links {
        font-size: 11px;
        margin: 12px 0 0;
        color: #a5b1d4;
      }
      #telemetry {
        left: 16px;
        bottom: 16px;
        width: 330px;
        padding: 13px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 11px;
      }
      .metric strong {
        display: block;
        font-size: 18px;
        font-weight: 550;
        font-variant-numeric: tabular-nums;
      }
      .metric span {
        font-size: 10px;
        color: #a5b1d4;
      }
      #histogram {
        grid-column: 1/3;
        display: flex;
        gap: 3px;
        height: 7px;
        background: #1c2540;
      }
      #histogram div {
        min-width: 1px;
      }
      #legend {
        right: 16px;
        bottom: 16px;
        padding: 14px;
        width: 235px;
        font-size: 12px;
        line-height: 1.7;
        color: #adbfe0;
      }
      #legend strong {
        color: #fff;
        font-weight: 500;
      }
      .swatch {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 7px;
      }
      #coords {
        margin-top: 10px;
        color: #aecbff;
        font-variant-numeric: tabular-nums;
      }
      #help {
        position: absolute;
        bottom: 16px;
        left: 50%;
        transform: translateX(-50%);
        font-size: 12px;
        color: #c1cce8;
        text-align: center;
        pointer-events: none;
        text-shadow: 0 2px 4px #000;
      }
      #loading {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translateX(-50%);
        color: #c1cce8;
        pointer-events: none;
      }
      @media (max-width: 800px), (max-height: 650px) {
        header {
          top: 8px;
          left: 8px;
          width: 290px;
          max-height: calc(100vh - 245px);
          padding: 12px;
        }
        #telemetry {
          bottom: 8px;
          left: 8px;
          width: 290px;
          grid-template-columns: repeat(3, 1fr);
          gap: 7px;
          padding: 10px;
        }
        .metric strong {
          font-size: 14px;
        }
        .metric span {
          font-size: 9px;
        }
        #histogram {
          grid-column: 1/4;
        }
        #legend,
        #help {
          display: none;
        }
      }
      .demo-nav {
        position: sticky;
        top: 0;
        z-index: 5;
        background: #080d21;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
        font-size: 12px;
      }
      .demo-nav a {
        display: block;
        padding: 6px 9px;
        border: 1px solid #8298b266;
        border-radius: 5px;
        text-decoration: none;
      }
      .demo-nav a[aria-current="page"] {
        background: #8298b233;
        font-weight: 600;
      }
      .demo-nav a:hover {
        background: #8298b244;
      }
    </style>
  </head>
  <body>
    <canvas
      id="space"
      tabindex="0"
      aria-label="Infinite asteroid and floating-world field"
    ></canvas>
    <div id="loading">Building 3D worlds\u2026</div>
    <header class="panel">
      <nav class="demo-nav" aria-label="Demos">
        <a href="index.html?demo=sphere">Sphere</a
        ><a href="index.html?demo=terrain">Terrain</a
        ><a href="index.html?demo=space" aria-current="page">Infinite space</a>
        <a href="index.html?demo=progressive">Noise tiles</a>
      </nav>
      <h1>Infinite space</h1>
      <p class="sub">
        Asteroids \xB7 floating islands \xB7 ringed planets<br />Full 3D shapes,
        meshes and point-cloud LOD
      </p>
      <details id="controls" open>
        <summary>Space controls</summary>
        <div class="row">
          <label
            >Display<select id="mode">
              <option value="mesh" selected>Mesh only</option>
              <option value="hybrid">Meshes near / points far</option>
              <option value="points">Point cloud only</option>
            </select></label
          >
        </div>
        <p style="font-size: 11px; color: #a5b1d4; margin: 4px 0 12px">
          Mesh only keeps distant bodies solid. Point modes show dots sampled
          from each surface.
        </p>
        <div class="row">
          <label
            >Algorithm<select id="algorithm">
              <option value="mc33">MC33</option>
              <option value="bourke">Bourke</option>
            </select></label
          >
        </div>
        <div class="row">
          <label for="distance"
            >Render distance <output id="distanceValue">9 km</output></label
          ><input
            id="distance"
            type="range"
            min="2000"
            max="64000"
            step="1000"
            value="9000"
            aria-label="Space render distance"
          />
        </div>
        <div class="row">
          <label for="quality"
            >Detail spacing <output id="qualityValue">3 px</output></label
          ><input
            id="quality"
            type="range"
            min="1"
            max="8"
            step=".5"
            value="3"
            aria-label="Detail spacing"
          />
        </div>
        <div class="row">
          <label for="lodDistance"
            >LOD distance <output id="lodDistanceValue">4000 m</output></label
          ><input
            id="lodDistance"
            type="range"
            min="500"
            max="16000"
            step="250"
            value="4000"
            aria-label="LOD distance"
          />
        </div>
        <div class="row">
          <label for="nearRadius"
            >Near detail <output id="nearRadiusValue">250 m</output></label
          ><input
            id="nearRadius"
            type="range"
            min="0"
            max="2000"
            step="50"
            value="250"
            aria-label="Near detail radius"
          />
        </div>
        <div class="row">
          <label for="pointSize"
            >Point size <output id="pointValue">2 px</output></label
          ><input
            id="pointSize"
            type="range"
            min="1"
            max="5"
            step=".25"
            value="2"
            aria-label="Point size"
          />
        </div>
        <div class="row">
          <label for="speed"
            >Flight speed <output id="speedValue">450 m/s</output></label
          ><input
            id="speed"
            type="range"
            min="100"
            max="2400"
            step="50"
            value="450"
            aria-label="Flight speed"
          />
        </div>
        <div class="row">
          <label for="maxMeshLevel"
            >Farthest mesh LOD
            <output id="maxMeshLevelValue">Grade 9</output></label
          ><input
            id="maxMeshLevel"
            type="range"
            min="0"
            max="9"
            step="1"
            value="9"
            aria-label="Farthest mesh LOD"
          />
        </div>
        <div class="checks">
          <label><input id="colors" type="checkbox" />LOD colors</label
          ><label><input id="uniform" type="checkbox" />Full detail</label>
        </div>
        <div class="checks">
          <label><input id="caves" type="checkbox" />Island caves</label>
        </div>
        <div class="buttons">
          <button id="fly">Start flythrough</button
          ><button id="reset">Reset</button>
        </div>
        <div class="buttons">
          <button id="island">Floating island</button
          ><button id="planet">Ringed planet</button
          ><button id="asteroid">Asteroid</button>
        </div>
      </details>
      <p id="status" role="status" aria-live="polite">Preparing space\u2026</p>
      <p class="links">
        Drag to look \xB7 WASD fly \xB7 Space up / C down \xB7 Shift faster
      </p>
    </header>
    <div id="telemetry" class="panel" aria-label="Space performance">
      <div class="metric">
        <strong id="fps">\u2014</strong><span>frames per second</span>
      </div>
      <div class="metric">
        <strong id="cpuTime">\u2014</strong><span>CPU submission</span>
      </div>
      <div class="metric">
        <strong id="frameTime">\u2014</strong><span>frame / GPU render</span>
      </div>
      <div class="metric">
        <strong id="triangles">\u2014</strong><span>mesh triangles</span>
      </div>
      <div class="metric">
        <strong id="points">\u2014</strong><span>3D surface points</span>
      </div>
      <div class="metric">
        <strong id="objects">\u2014</strong><span>meshes / point clouds</span>
      </div>
      <div class="metric">
        <strong id="memory">\u2014</strong><span>geometry cache / sectors</span>
      </div>
      <div class="metric">
        <strong id="draws">\u2014</strong><span>draws / queued shapes</span>
      </div>
      <div class="metric" style="grid-column: 1/-1">
        <strong id="meshLods" style="font-size: 13px">\u2014</strong
        ><span>mesh LOD 0 / 1 / 2 / 3 / 4 / 5 / 6 / 7</span>
      </div>
      <div id="histogram" aria-label="Space LOD distribution"></div>
      <div
        id="cpuBreakdown"
        style="grid-column: 1/-1; color: #a5b1d4; font-size: 10px"
      ></div>
    </div>
    <aside id="legend" class="panel">
      <strong>Ten mesh detail levels</strong><br /><span
        class="swatch"
        style="background: #ff4d30"
      ></span
      >LOD 0 \xB7 finest<br /><span
        class="swatch"
        style="background: #ffa52e"
      ></span
      >LOD 1 \xB7 high<br /><span class="swatch" style="background: #ebd948"></span
      >LOD 2 \xB7 medium<br /><span
        class="swatch"
        style="background: #43b879"
      ></span
      >LOD 3 \xB7 low<br /><span class="swatch" style="background: #288fff"></span
      >LOD 4 \xB7 distant<br /><span
        class="swatch"
        style="background: #36cbd9"
      ></span
      >LOD 5 \xB7 far<br /><span class="swatch" style="background: #8276ff"></span
      >LOD 6 \xB7 very far<br /><span
        class="swatch"
        style="background: #bd70e8"
      ></span
      >LOD 7 \xB7 horizon<br /><span
        class="swatch"
        style="background: #da91b6"
      ></span
      >LOD 8 \xB7 ultra far<br /><span
        class="swatch"
        style="background: #b7bac9"
      ></span
      >LOD 9 \xB7 smallest mesh<br />Point modes add eight density tiers.<br />Enable
      LOD colors to see transitions.
      <div id="coords"></div>
    </aside>
    <p id="help">
      Fly toward a body to watch its detail grow.<br />Independent 3D sectors
      stream in every direction.
    </p>
  </body>
</html>
`;var Ic=`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Progressive noise tiles \u2014 centimetres to kilometres</title>
    <style>
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        overflow: hidden;
        background: #829caf;
        color: #edf3e9;
        font:
          13px system-ui,
          sans-serif;
      }
      #terrain {
        width: 100vw;
        height: 100vh;
        display: block;
        touch-action: none;
      }
      .panel {
        position: absolute;
        z-index: 2;
        padding: 16px;
        background: #142229ed;
        border: 1px solid #9aada744;
        border-radius: 12px;
      }
      header {
        top: 16px;
        left: 16px;
        width: 330px;
        max-height: calc(100vh - 270px);
        overflow: auto;
      }
      .demo-nav {
        position: sticky;
        top: 0;
        z-index: 3;
        background: #142229;
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 14px;
      }
      a {
        color: #cce2ae;
        text-decoration: none;
      }
      .demo-nav a {
        border: 1px solid #a9bd9a55;
        border-radius: 5px;
        padding: 6px 8px;
      }
      .demo-nav a[aria-current] {
        background: #a9bd9a33;
      }
      h1 {
        font-size: 21px;
        margin: 0 0 8px;
        letter-spacing: -0.4px;
      }
      p {
        color: #b7c9c9;
        line-height: 1.5;
        margin: 8px 0 12px;
      }
      summary {
        cursor: pointer;
        color: #d3e6b9;
        margin: 12px 0;
      }
      label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
        margin: 12px 0;
      }
      input[type="range"] {
        width: 145px;
        accent-color: #c7df90;
      }
      button {
        color: inherit;
        background: #30434a;
        border: 1px solid #94a59b66;
        border-radius: 5px;
        padding: 8px 10px;
        font: inherit;
        cursor: pointer;
      }
      button:hover {
        background: #49605c;
      }
      .buttons {
        display: flex;
        flex-wrap: wrap;
        gap: 7px;
        margin: 12px 0;
      }
      .checks {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;
      }
      .checks label {
        justify-content: flex-start;
        gap: 5px;
        margin: 5px 0;
      }
      #status {
        margin: 12px 0 0;
        color: #c4dda7;
        font-size: 12px;
      }
      #status.error {
        color: #ffb3a5;
      }
      #telemetry {
        left: 16px;
        bottom: 16px;
        width: 330px;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .metric strong {
        display: block;
        font-size: 18px;
        font-variant-numeric: tabular-nums;
      }
      .metric span {
        color: #b6c7c7;
        font-size: 11px;
      }
      #mapPanel {
        right: 16px;
        bottom: 16px;
        width: 230px;
      }
      #map {
        width: 196px;
        height: 196px;
        display: block;
      }
      #mapPanel p {
        margin: 8px 0 0;
        font-size: 11px;
      }
      #help {
        position: absolute;
        left: 50%;
        bottom: 24px;
        transform: translateX(-50%);
        text-align: center;
        color: #fff;
        text-shadow: 0 1px 4px #15262d;
        pointer-events: none;
      }
      #loading {
        position: absolute;
        top: 45%;
        left: 50%;
        transform: translateX(-50%);
        color: white;
        text-shadow: 0 1px 6px black;
        pointer-events: none;
      }
      @media (max-width: 800px), (max-height: 650px) {
        header {
          top: 8px;
          left: 8px;
          width: 290px;
          max-height: calc(100vh - 235px);
          padding: 12px;
        }
        #telemetry {
          left: 8px;
          bottom: 8px;
          width: 290px;
          padding: 12px;
          gap: 8px;
        }
        .metric strong {
          font-size: 15px;
        }
        #mapPanel,
        #help {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <canvas
      id="terrain"
      tabindex="0"
      aria-label="Progressively generated noise terrain"
    ></canvas>
    <div id="loading">Generating the first noise tiles\u2026</div>
    <header class="panel">
      <nav class="demo-nav" aria-label="Demos">
        <a href="index.html?demo=sphere">Sphere</a
        ><a href="index.html?demo=terrain">Terrain</a>
        <a href="index.html?demo=space">Infinite space</a
        ><a href="index.html?demo=progressive" aria-current="page"
          >Noise tiles</a
        >
      </nav>
      <h1>Progressive noise tiles</h1>
      <p>
        Fly down to the ground. Smaller tiles reveal real bumps, down to
        <b>3.125 cm</b> mesh spacing. Old tiles are recycled.
      </p>
      <details id="controls" open>
        <summary>Explore the surface</summary>
        <div class="buttons">
          <button id="sky">From above</button
          ><button id="land">Near the ground</button
          ><button id="tour">Start flythrough</button>
        </div>
        <label>Height <output id="altitudeLabel">64 m</output></label>
        <input
          id="altitude"
          aria-label="Height above the surface"
          type="range"
          min="-2"
          max="11"
          step="0.05"
          value="6"
          style="width: 100%"
        />
        <label>Tile detail <output id="detailLabel">2 px</output></label>
        <input
          id="detail"
          aria-label="Allowed surface error in pixels"
          type="range"
          min="0.5"
          max="8"
          step="0.25"
          value="2"
          style="width: 100%"
        />
        <label>Render distance <output id="distanceLabel">2 km</output></label>
        <input
          id="distance"
          aria-label="Render distance"
          type="range"
          min="256"
          max="8192"
          step="128"
          value="2048"
          style="width: 100%"
        />
        <div class="checks">
          <label
            ><input id="follow" type="checkbox" checked />Follow ground</label
          >
          <label><input id="colors" type="checkbox" />LOD colors</label>
          <label
            ><input id="borders" type="checkbox" checked />Tile edges</label
          >
          <label><input id="wire" type="checkbox" />Wireframe</label>
        </div>
        <p>
          Lower Tile detail for finer sampling. Generation is spread across
          frames; the coarse surface stays visible while it refines.
        </p>
        <button id="reset">Reset view</button>
      </details>
      <p id="status">Preparing WebGPU\u2026</p>
    </header>
    <aside id="telemetry" class="panel" aria-label="Live performance">
      <div class="metric">
        <strong id="fps">\u2014</strong><span>FPS \xB7 CPU / GPU draw</span>
      </div>
      <div class="metric">
        <strong id="spacing">\u2014</strong><span>finest visible mesh spacing</span>
      </div>
      <div class="metric">
        <strong id="triangles">\u2014</strong><span>triangles \xB7 grouped draws</span>
      </div>
      <div class="metric">
        <strong id="cache">\u2014</strong><span>resident tiles \xB7 fixed atlas</span>
      </div>
      <div class="metric">
        <strong id="builds">\u2014</strong><span>new tiles / waiting</span>
      </div>
      <div class="metric">
        <strong id="generation">\u2014</strong
        ><span>GPU generation \xB7 evicted tiles</span>
      </div>
    </aside>
    <aside id="mapPanel" class="panel">
      <canvas id="map" width="196" height="196"></canvas>
      <p id="mapLabel">Tile footprint around you</p>
      <p>
        One continuous field. Small tiles hold fine detail; large tiles cover
        the horizon.
      </p>
    </aside>
    <div id="help">
      Drag to look \xB7 WASD to move \xB7 Space / C to rise / descend \xB7 Shift to speed
      up<br />Movement slows automatically near the ground.
    </div>
  </body>
</html>
`;var rd={sphere:{page:Pc,load:()=>Promise.resolve().then(()=>(eh(),Ku))},terrain:{page:Cc,load:()=>Promise.resolve().then(()=>(Eh(),Sh))},space:{page:Rc,load:()=>Promise.resolve().then(()=>(Oh(),Uh))},progressive:{page:Ic,load:()=>Promise.resolve().then(()=>(id(),nd))}},cv=new URLSearchParams(location.search).get("demo")||"sphere",sd=rd[cv]||rd.sphere,_c=new DOMParser().parseFromString(sd.page,"text/html");document.title=_c.title;document.head.append(..._c.head.querySelectorAll('style,link[rel="stylesheet"]'));document.body.replaceChildren(..._c.body.childNodes);try{await(await sd.load()).startDemo()}catch(r){let e=document.getElementById("status");e&&(e.textContent=r.message,e.classList.add("error")),console.error(r)}
/*! Bundled license information:

three/build/three.module.js:
  (**
   * @license
   * Copyright 2010-2021 Three.js Authors
   * SPDX-License-Identifier: MIT
   *)
*/
