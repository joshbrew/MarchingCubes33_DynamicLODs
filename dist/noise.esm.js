var Zt=`const PI : f32 = 3.141592653589793;
const TWO_PI : f32 = 6.283185307179586;

const ANGLE_INCREMENT : f32 = PI / 4.0;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 options UBO \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct NoiseComputeOptions {
  getGradient : u32,
  useCustomPos : u32,
  outputChannel : u32,
  ioFlags : u32,
  baseRadius : f32,
  heightScale : f32,
  sphereOffset : f32,
  sphereOffset2 : f32,
  sphereBlend : f32,
  sphereBlendPhase : f32,
  sphereRangeWeight : f32,
  spherePolarFade : f32,
  sphereLandscape : u32,
  sphereLandscapeStrength : f32,
  sphereFeatureDensity : f32,
  sphereRegionSeed : u32,
  sphereRegion : vec4<f32>,
  sphereLayerWeights : vec4<f32>,
};
@group(0) @binding(0) var<uniform> options : NoiseComputeOptions;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 params UBO (layout kept) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct NoiseParams {
  seed : u32,
  zoom : f32,
  freq : f32,
  octaves : u32,
  lacunarity : f32,
  gain : f32,
  xShift : f32,
  yShift : f32,
  zShift : f32,
  turbulence : u32,
  seedAngle : f32,
  exp1 : f32,
  exp2 : f32,
  threshold : f32,
  rippleFreq : f32,
  time : f32,
  warpAmp : f32,
  gaborRadius : f32,
  terraceStep : f32,
  toroidal : u32,
  voroMode : u32,
  edgeK : f32,
  scalar : f32,
  transform : f32,
};
@group(0) @binding(1) var<uniform> params : NoiseParams;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 permutation table \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
struct PermTable { values : array<u32, 512>, };
const PERM_SIZE : u32 = 512u;
const PERM_MASK : u32 = PERM_SIZE - 1u;
const INV_255 : f32 = 1.0 / 255.0;
const INV_2_OVER_255 : f32 = 2.0 / 255.0;

@group(0) @binding(2) var<storage, read> permTable : PermTable;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 IO resources \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@group(0) @binding(3) var inputTex : texture_2d_array<f32>;
@group(0) @binding(4) var outputTex : texture_storage_2d_array<rgba16float, write>;
@group(0) @binding(5) var<storage, read> posBuf : array<vec4<f32>>;

struct Frame {
  fullWidth : u32,
  fullHeight : u32,
  tileWidth : u32,
  tileHeight : u32,

  originX : i32,
  originY : i32,
  originZ : i32,
  fullDepth : u32,

  tileDepth : u32,
  layerIndex : i32,
  layers : u32,
  _pad : u32,

  originXf : f32,
  originYf : f32,
  originZf : f32,
  _pad1    : f32,
};
@group(0) @binding(6) var<uniform> frame : Frame;

@group(0) @binding(7) var inputTex3D : texture_3d<f32>;
@group(0) @binding(8) var outputTex3D : texture_storage_3d<rgba16float, write>;

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 small utilities \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn clampZ(z: i32)->i32 {
  let depth = i32(max(u32(frame.fullDepth), 1u));
  return clamp(z, 0, depth - 1);
}
fn layerToZ(layerIndex:i32, layers:u32)->f32 {
  if (layers <= 1u) { return 0.0; }
  let li = max(layerIndex, 0);
  return f32(li) / f32(layers - 1u);
}
fn readFrom3D()->bool { return (options.ioFlags & 0x1u) != 0u; }
fn writeTo3D()->bool { return (options.ioFlags & 0x2u) != 0u; }

fn loadPrevRGBA(fx:i32, fy:i32, fz:i32)->vec4<f32> {
  if (readFrom3D()) { return textureLoad(inputTex3D, vec3<i32>(fx, fy, clampZ(fz)), 0); }
  return textureLoad(inputTex, vec2<i32>(fx, fy), frame.layerIndex, 0);
}
fn storeRGBA(fx:i32, fy:i32, fz:i32, col:vec4<f32>) {
  if (writeTo3D()) { textureStore(outputTex3D, vec3<i32>(fx, fy, clampZ(fz)), col); }
  else { textureStore(outputTex, vec2<i32>(fx, fy), frame.layerIndex, col); }
}

fn rotateXY3(p: vec3<f32>, angle: f32) -> vec3<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec3<f32>(
    p.x * c - p.y * s,
    p.x * s + p.y * c,
    p.z
  );
}


const STEREO_SCALE : f32 = 1.8;          // fixed packing scale for Clifford torus
const INV_SQRT2    : f32 = 0.7071067811865476; // 1/\u221A2

// add next to your other constants
const U_SCALE : f32 = 3.0;
const V_SCALE : f32 = 3.0;
const T_SCALE : f32 = 2.0;
const PACK_BIAS : vec4<f32> = vec4<f32>(0.37, 0.21, 0.29, 0.31);

fn packPeriodicUV(u: f32, v: f32, theta: f32) -> vec4<f32> {
  let aU = fract(u) * TWO_PI;
  let aV = fract(v) * TWO_PI;
  let aT = fract(theta) * TWO_PI;

  let x = cos(aU) * U_SCALE;
  let y = sin(aU) * U_SCALE;
  let z = cos(aV) * V_SCALE + cos(aT) * T_SCALE;
  let w = sin(aV) * V_SCALE + sin(aT) * T_SCALE;

  return vec4<f32>(x, y, z, w) + PACK_BIAS;
}


fn thetaFromDepth(fz: i32) -> f32 {
  let uses3D = writeTo3D() || readFrom3D();
  if (uses3D) {
    let d = max(f32(frame.fullDepth), 1.0);
    return (f32(clampZ(fz)) + 0.5) / d; // [0,1)
  }
  return layerToZ(frame.layerIndex, frame.layers);
}

fn seedOffset3(seed: u32) -> vec3<f32> {
  let a = f32((seed * 1664525u + 1013904223u) & 65535u) / 65536.0;
  let b = f32((seed * 22695477u + 1u) & 65535u) / 65536.0;
  let c = f32((seed * 1103515245u + 12345u) & 65535u) / 65536.0;

  return vec3<f32>(
    17.173 + a * 131.0,
    31.947 + b * 137.0,
    47.521 + c * 149.0
  );
}

fn fetchPlanetSpherePos(fx: i32, fy: i32) -> vec3<f32> {
  let w = i32(max(frame.fullWidth, 2u));
  let h = i32(max(frame.fullHeight, 2u));
  let segments = max(w - 1, 1);
  let maxLat = max(h - 1, 1);

  let lat = clamp(fy, 0, maxLat);
  let rawLon = fx;
  let lon = ((rawLon % segments) + segments) % segments;

  if (lat <= 0) {
    // Y-up north pole, matching sphereUVFromWorld() and the Babylon planet.
    return vec3<f32>(2.0, 3.0, 2.0);
  }

  if (lat >= maxLat) {
    // Y-up south pole, matching sphereUVFromWorld() and the Babylon planet.
    return vec3<f32>(2.0, 1.0, 2.0);
  }

  let theta = f32(lat) * PI / f32(maxLat);
  let phi = f32(lon) * TWO_PI / f32(segments);

  let dir=vec3<f32>(sin(theta)*cos(phi),cos(theta),sin(theta)*sin(phi));
  return studio_sphere_position(dir,theta,phi);
}

fn studio_sphere_position(dir:vec3<f32>,theta:f32,phi:f32)->vec3<f32>{
  let sinTheta=length(dir.xz);
  // The first longitude harmonic is already a smooth tangent displacement.
  // Only the second harmonic needs to disappear faster than polar radius.
  let offset = options.sphereOffset;
  let offset2 = options.sphereOffset2;
  let second = vec2<f32>(offset2 * cos(2.0 * phi),offset * sin(2.0 * phi + theta));
  var warp=vec3<f32>(offset * sin(phi + theta) + second.x,
    offset * cos(theta + phi) + offset2 * sin(2.0 * theta),
    second.y + offset2 * cos(2.0 * theta + phi));
  if(options.spherePolarFade>0.0){
    let fade=1.0-smoothstep(0.0,options.spherePolarFade,sinTheta);
    warp-=fade*vec3<f32>(second.x,0.0,second.y);
  }
  return dir+2.0+sinTheta*warp;
}


fn fetchAuroraCapPos(fx: i32, fy: i32) -> vec3<f32> {
  let w = i32(max(frame.fullWidth, 2u));
  let h = i32(max(frame.fullHeight, 2u));
  let segments = max(w - 1, 1);
  let maxRadial = max(h - 1, 1);

  let radialIndex = clamp(fy, 0, maxRadial);
  let rawLon = fx;
  let lon = ((rawLon % segments) + segments) % segments;

  let capHalfAngleDeg = max(options.baseRadius, 0.001);
  let capHalfAngle = radians(capHalfAngleDeg);
  let hemisphere = select(-1.0, 1.0, options.heightScale >= 0.0);

  let radial = f32(radialIndex) * capHalfAngle / f32(maxRadial);
  let phi = f32(lon) * TWO_PI / f32(segments);

  let sinR = sin(radial);
  let cosR = cos(radial);
  let sinPhi = sin(phi);
  let cosPhi = cos(phi);

  let x = sinR * cosPhi;
  let y = hemisphere * cosR;
  let z = sinR * sinPhi;

  let capScale = sinR;
  let offset = options.sphereOffset;
  let offset2 = options.sphereOffset2;

  return vec3<f32>(
    x + 2.0 + capScale * (offset * sin(phi + radial) + offset2 * cos(2.0 * phi)),
    y + 2.0 + capScale * (offset * cos(radial + phi) + offset2 * sin(2.0 * radial)),
    z + 2.0 + capScale * (offset * sin(2.0 * phi + radial) + offset2 * cos(2.0 * radial + phi))
  );
}

fn fetchPos(fx: i32, fy: i32, fz: i32) -> vec3<f32> {
  if (options.useCustomPos == 2u) {
    return fetchPlanetSpherePos(fx, fy);
  }

  if (options.useCustomPos == 3u) {
    return fetchAuroraCapPos(fx, fy);
  }

  if (options.useCustomPos == 1u) {
    let use3D = writeTo3D() || readFrom3D();
    let localX = u32(clamp(fx - frame.originX, 0, i32(max(frame.tileWidth, 1u)) - 1));
    let localY = u32(clamp(fy - frame.originY, 0, i32(max(frame.tileHeight, 1u)) - 1));
    let localZ = u32(max(select(frame.layerIndex, clampZ(fz) - frame.originZ, use3D), 0));
    let idx = localZ * frame.tileWidth * frame.tileHeight + localY * frame.tileWidth + localX;
    return posBuf[idx].xyz;
  }

  if (params.toroidal == 1u) {
    let cx = clamp(fx, 0, i32(frame.fullWidth) - 1);
    let cy = clamp(fy, 0, i32(frame.fullHeight) - 1);

    let invW = 1.0 / max(f32(frame.fullWidth), 1.0);
    let invH = 1.0 / max(f32(frame.fullHeight), 1.0);

    let U = (f32(cx) + 0.5) * invW;
    let V = (f32(cy) + 0.5) * invH;
    let theta = thetaFromDepth(fz);

    return vec3<f32>(U, V, theta);
  }

  let invW = 1.0 / max(f32(frame.fullWidth), 1.0);
  let invH = 1.0 / max(f32(frame.fullHeight), 1.0);

  var ox = frame.originXf;
  var oy = frame.originYf;
  if (ox == 0.0 && oy == 0.0) {
    ox = f32(frame.originX);
    oy = f32(frame.originY);
  }

  let x = (ox + f32(fx) + 0.5) * invW;
  let y = (oy + f32(fy) + 0.5) * invH;

  var z: f32;
  let uses3D = writeTo3D() || readFrom3D();
  if (uses3D) {
    if (frame.fullDepth <= 1u) {
      z = 0.0;
    } else {
      z = (f32(clampZ(fz)) + 0.5) / f32(frame.fullDepth);
    }
  } else {
    z = layerToZ(frame.layerIndex, frame.layers);
  }

  return vec3<f32>(x, y, z);
}



fn writeChannel(fx:i32, fy:i32, fz:i32, v0:f32, channel:u32, overwrite:u32) {
  if (!writeTo3D()) {
    if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) { return; }
  }

  var v = v0 * params.scalar + params.transform;
  if(options.useCustomPos==2u && options.sphereBlend>0.0){
    v*=studio_layer_mask(fetchPos(fx,fy,fz));
  }
  if(options.useCustomPos==2u && options.sphereRegion.z>0.0 &&
      any(options.sphereLayerWeights!=vec4<f32>(1.0))){
    let dir=studio_atlas_direction(fx,fy);
    v*=dot(studio_region_map(dir),options.sphereLayerWeights);
  }
  let needsAccum = (overwrite == 0u);
  let writesAll = (channel == 0u);
  let skipRead = (!needsAccum) && (writesAll || channel == 5u);
  var inCol = vec4<f32>(0.0);
  if (!skipRead) { inCol = loadPrevRGBA(fx, fy, fz); }
  var outCol = inCol;

  if (channel == 0u)      { let h = select(v + inCol.x, v, overwrite == 1u); outCol = vec4<f32>(h, h, h, h); }
  else if (channel == 1u) { let h = select(v + inCol.x, v, overwrite == 1u); outCol.x = h; }
  else if (channel == 2u) { let h = select(v + inCol.y, v, overwrite == 1u); outCol.y = h; }
  else if (channel == 3u) { let h = select(v + inCol.z, v, overwrite == 1u); outCol.z = h; }
  else if (channel == 4u) { let h = select(v + inCol.w, v, overwrite == 1u); outCol.w = h; }
  else if (channel == 5u) { let p = fetchPos(fx, fy, fz); let h = select(v + inCol.w, v, overwrite == 1u); outCol = vec4<f32>(p.x, p.y, p.z, h); }
  else if (channel == 6u) { let p = fetchPos(fx, fy, fz); let h = select(v + inCol.w, v, overwrite == 1u); outCol = vec4<f32>(p.x, p.y, h, inCol.w); }

  storeRGBA(fx, fy, fz, outCol);
}

fn studio_layer_mask(p:vec3<f32>)->f32{
  let phase=options.sphereBlendPhase;
  let province=simplex3D(p*3.1+vec3<f32>(phase,-.51*phase,1.31*phase));
  let mask=mix(.36,1.0,smoothstep(-.55,.32,province));
  return mix(1.0,mask,clamp(options.sphereBlend,0.0,1.0));
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 math / noise bits \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
/* gradient tables */
const GRAD2 : array<vec2<f32>, 8> = array<vec2<f32>, 8>(
  vec2<f32>( 1.0,  1.0), vec2<f32>(-1.0,  1.0),
  vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0, -1.0),
  vec2<f32>( 1.0,  0.0), vec2<f32>(-1.0,  0.0),
  vec2<f32>( 0.0,  1.0), vec2<f32>( 0.0, -1.0)
);

const GRAD3 : array<vec3<f32>, 12> = array<vec3<f32>, 12>(
  vec3<f32>( 1.0,  1.0,  0.0), vec3<f32>(-1.0,  1.0,  0.0),
  vec3<f32>( 1.0, -1.0,  0.0), vec3<f32>(-1.0, -1.0,  0.0),
  vec3<f32>( 1.0,  0.0,  1.0), vec3<f32>(-1.0,  0.0,  1.0),
  vec3<f32>( 1.0,  0.0, -1.0), vec3<f32>(-1.0,  0.0, -1.0),
  vec3<f32>( 0.0,  1.0,  1.0), vec3<f32>( 0.0, -1.0,  1.0),
  vec3<f32>( 0.0,  1.0, -1.0), vec3<f32>( 0.0, -1.0, -1.0)
);
const GRAD4 : array<vec4<f32>, 32> = array<vec4<f32>, 32>(
  vec4<f32>( 0.0,  1.0,  1.0,  1.0), vec4<f32>( 0.0,  1.0,  1.0, -1.0),
  vec4<f32>( 0.0,  1.0, -1.0,  1.0), vec4<f32>( 0.0,  1.0, -1.0, -1.0),
  vec4<f32>( 0.0, -1.0,  1.0,  1.0), vec4<f32>( 0.0, -1.0,  1.0, -1.0),
  vec4<f32>( 0.0, -1.0, -1.0,  1.0), vec4<f32>( 0.0, -1.0, -1.0, -1.0),

  vec4<f32>( 1.0,  0.0,  1.0,  1.0), vec4<f32>( 1.0,  0.0,  1.0, -1.0),
  vec4<f32>( 1.0,  0.0, -1.0,  1.0), vec4<f32>( 1.0,  0.0, -1.0, -1.0),
  vec4<f32>(-1.0,  0.0,  1.0,  1.0), vec4<f32>(-1.0,  0.0,  1.0, -1.0),
  vec4<f32>(-1.0,  0.0, -1.0,  1.0), vec4<f32>(-1.0,  0.0, -1.0, -1.0),

  vec4<f32>( 1.0,  1.0,  0.0,  1.0), vec4<f32>( 1.0,  1.0,  0.0, -1.0),
  vec4<f32>( 1.0, -1.0,  0.0,  1.0), vec4<f32>( 1.0, -1.0,  0.0, -1.0),
  vec4<f32>(-1.0,  1.0,  0.0,  1.0), vec4<f32>(-1.0,  1.0,  0.0, -1.0),
  vec4<f32>(-1.0, -1.0,  0.0,  1.0), vec4<f32>(-1.0, -1.0,  0.0, -1.0),

  vec4<f32>( 1.0,  1.0,  1.0,  0.0), vec4<f32>( 1.0,  1.0, -1.0,  0.0),
  vec4<f32>( 1.0, -1.0,  1.0,  0.0), vec4<f32>( 1.0, -1.0, -1.0,  0.0),
  vec4<f32>(-1.0,  1.0,  1.0,  0.0), vec4<f32>(-1.0,  1.0, -1.0,  0.0),
  vec4<f32>(-1.0, -1.0,  1.0,  0.0), vec4<f32>(-1.0, -1.0, -1.0,  0.0)
);

/* Gradient accessors */
fn gradient(idx:u32)->vec3<f32> {
  return GRAD3[idx % 12u];
}
fn gradient2(idx:u32)->vec2<f32> {
  return GRAD2[idx % 8u];
}
fn gradient4(idx: u32) -> vec4<f32> {
  return GRAD4[idx % 32u];
}


fn fade(t:f32)->f32 { return t*t*t*(t*(t*6.0 - 15.0) + 10.0); }
fn lerp(a:f32, b:f32, t:f32)->f32 { return a + t * (b - a); }

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 perm/hash helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn perm(idx: u32) -> u32 {
  return permTable.values[idx & PERM_MASK];
}

fn rot3(p: vec3<f32>) -> vec3<f32> {
  let x = 0.00 * p.x + -0.80 * p.y + -0.60 * p.z;
  let y = 0.80 * p.x +  0.36 * p.y + -0.48 * p.z;
  let z = 0.60 * p.x + -0.48 * p.y +  0.64 * p.z;
  return vec3<f32>(x, y, z);
}

fn hash2(ix : i32, iy : i32) -> u32 {
  return perm((u32(ix) & PERM_MASK) + perm(u32(iy) & PERM_MASK)) & PERM_MASK;
}
fn rand2(ix : i32, iy : i32) -> f32 {
  let idx = hash2(ix, iy);
  return f32(perm(idx)) * INV_2_OVER_255 - 1.0;
}
fn rand2u(ix : i32, iy : i32) -> f32 {
  let idx = hash2(ix, iy);
  return f32(perm(idx)) * INV_255;
}

// 3D helpers
fn hash3(ix : i32, iy : i32, iz : i32) -> u32 {
  return perm((u32(ix) & PERM_MASK)
            + perm((u32(iy) & PERM_MASK) + perm(u32(iz) & PERM_MASK)))
         & PERM_MASK;
}
fn rand3(ix : i32, iy : i32, iz : i32) -> f32 {
  let idx = hash3(ix, iy, iz);
  return f32(perm(idx)) * INV_2_OVER_255 - 1.0;
}
fn rand3u(ix : i32, iy : i32, iz : i32) -> f32 {
  let idx = hash3(ix, iy, iz);
  return f32(perm(idx)) * INV_255;
}

// 4D helpers
fn hash4(ix : i32, iy : i32, iz : i32, iw : i32) -> u32 {
  let a = perm(u32(ix) & PERM_MASK);
  let b = perm((u32(iy) & PERM_MASK) + a);
  let c = perm((u32(iz) & PERM_MASK) + b);
  return perm((u32(iw) & PERM_MASK) + c) & PERM_MASK;
}
fn rand4(ix : i32, iy : i32, iz : i32, iw : i32) -> f32 {
  let idx = hash4(ix, iy, iz, iw);
  return f32(perm(idx)) * INV_2_OVER_255 - 1.0;
}
fn rand4u(ix : i32, iy : i32, iz : i32, iw : i32) -> f32 {
  let idx = hash4(ix, iy, iz, iw);
  return f32(perm(idx)) * INV_255;
}


/* ---------- classic 2D Perlin ---------- */
fn noise2D(p : vec2<f32>) -> f32 {
  let ix = i32(floor(p.x));
  let iy = i32(floor(p.y));
  let X: u32 = u32(ix) & PERM_MASK;
  let Y: u32 = u32(iy) & PERM_MASK;

  let xf = p.x - floor(p.x);
  let yf = p.y - floor(p.y);

  let u = fade(xf);
  let v = fade(yf);

  let A  = perm(X) + Y;
  let B  = perm((X + 1u) & PERM_MASK) + Y;

  let gAA = gradient2(perm(A & PERM_MASK));
  let gBA = gradient2(perm(B & PERM_MASK));
  let gAB = gradient2(perm((A + 1u) & PERM_MASK));
  let gBB = gradient2(perm((B + 1u) & PERM_MASK));

  let x1 = lerp(dot(gAA, vec2<f32>(xf,       yf      )),
                dot(gBA, vec2<f32>(xf - 1.0, yf      )), u);
  let x2 = lerp(dot(gAB, vec2<f32>(xf,       yf - 1.0)),
                dot(gBB, vec2<f32>(xf - 1.0, yf - 1.0)), u);
  return lerp(x1, x2, v);
}

//matches 3d z=0 slice, less multiplying
fn noise2D_from_3D(p: vec3<f32>) -> f32 {
  let ix = i32(floor(p.x));
  let iy = i32(floor(p.y));
  let X: u32 = u32(ix) & PERM_MASK;
  let Y: u32 = u32(iy) & PERM_MASK;

  let xf = p.x - floor(p.x);
  let yf = p.y - floor(p.y);
  let u = fade(xf);
  let v = fade(yf);

  // 3D hashing path with Z = 0
  let A  = perm(X) + Y;
  let AA = perm(A & PERM_MASK);                 // + Z(=0)
  let AB = perm((A + 1u) & PERM_MASK);          // + Z(=0)
  let B  = perm((X + 1u) & PERM_MASK) + Y;
  let BA = perm(B & PERM_MASK);                 // + Z(=0)
  let BB = perm((B + 1u) & PERM_MASK);          // + Z(=0)

  let gAA = gradient(perm(AA & PERM_MASK));
  let gBA = gradient(perm(BA & PERM_MASK));
  let gAB = gradient(perm(AB & PERM_MASK));
  let gBB = gradient(perm(BB & PERM_MASK));

  let n00 = dot(gAA, vec3<f32>(xf,       yf,       0.0));
  let n10 = dot(gBA, vec3<f32>(xf - 1.0, yf,       0.0));
  let n01 = dot(gAB, vec3<f32>(xf,       yf - 1.0, 0.0));
  let n11 = dot(gBB, vec3<f32>(xf - 1.0, yf - 1.0, 0.0));

  let nx0 = lerp(n00, n10, u);
  let nx1 = lerp(n01, n11, u);
  return lerp(nx0, nx1, v);
}

/* ---------- classic 3D Perlin ---------- */
fn noise3D(p: vec3<f32>) -> f32 {
  if (p.z == 0.0) { return noise2D_from_3D(p); }

  let ix = i32(floor(p.x));
  let iy = i32(floor(p.y));
  let iz = i32(floor(p.z));
  let X: u32 = u32(ix) & PERM_MASK;
  let Y: u32 = u32(iy) & PERM_MASK;
  let Z: u32 = u32(iz) & PERM_MASK;

  let xf = p.x - floor(p.x);
  let yf = p.y - floor(p.y);
  let zf = p.z - floor(p.z);

  let u = fade(xf);
  let v = fade(yf);
  let w = fade(zf);

  let A  = perm(X) + Y;
  let AA = perm(A & PERM_MASK) + Z;
  let AB = perm((A + 1u) & PERM_MASK) + Z;
  let B  = perm((X + 1u) & PERM_MASK) + Y;
  let BA = perm(B & PERM_MASK) + Z;
  let BB = perm((B + 1u) & PERM_MASK) + Z;

  let gAA  = gradient(perm(AA & PERM_MASK));
  let gBA  = gradient(perm(BA & PERM_MASK));
  let gAB  = gradient(perm(AB & PERM_MASK));
  let gBB  = gradient(perm(BB & PERM_MASK));
  let gAA1 = gradient(perm((AA + 1u) & PERM_MASK));
  let gBA1 = gradient(perm((BA + 1u) & PERM_MASK));
  let gAB1 = gradient(perm((AB + 1u) & PERM_MASK));
  let gBB1 = gradient(perm((BB + 1u) & PERM_MASK));

  let x1 = lerp(dot(gAA,  vec3<f32>(xf,       yf,       zf      )),
                dot(gBA,  vec3<f32>(xf - 1.0, yf,       zf      )), u);
  let x2 = lerp(dot(gAB,  vec3<f32>(xf,       yf - 1.0, zf      )),
                dot(gBB,  vec3<f32>(xf - 1.0, yf - 1.0, zf      )), u);
  let y1 = lerp(x1, x2, v);

  let x3 = lerp(dot(gAA1, vec3<f32>(xf,       yf,       zf - 1.0)),
                dot(gBA1, vec3<f32>(xf - 1.0, yf,       zf - 1.0)), u);
  let x4 = lerp(dot(gAB1, vec3<f32>(xf,       yf - 1.0, zf - 1.0)),
                dot(gBB1, vec3<f32>(xf - 1.0, yf - 1.0, zf - 1.0)), u);
  let y2 = lerp(x3, x4, v);

  return lerp(y1, y2, w);
}


/* ---------- 4D Perlin (hypercube corners, gradient-based) ---------- */
fn noise4D(p: vec4<f32>) -> f32 {
  // integer cell coords
  let ix = i32(floor(p.x));
  let iy = i32(floor(p.y));
  let iz = i32(floor(p.z));
  let iw = i32(floor(p.w));

  let X: u32 = u32(ix) & PERM_MASK;
  let Y: u32 = u32(iy) & PERM_MASK;
  let Z: u32 = u32(iz) & PERM_MASK;
  let W: u32 = u32(iw) & PERM_MASK;

  // fractional part
  let xf = p.x - floor(p.x);
  let yf = p.y - floor(p.y);
  let zf = p.z - floor(p.z);
  let wf = p.w - floor(p.w);

  let u = fade(xf);
  let v = fade(yf);
  let t = fade(zf);
  let s = fade(wf);

  // helper to get corner gradient and dot product
  // corner offsets are dx,dy,dz,dw in {0,1}
  // for fractional component, use (xf - dx) etc; for dw=1 use (wf - 1.0)
  // compute hash for corner using hash4(ix+dx, iy+dy, iz+dz, iw+dw)
  let d0000 = dot(gradient4(perm(hash4(ix + 0, iy + 0, iz + 0, iw + 0))), vec4<f32>(xf,       yf,       zf,       wf      ));
  let d1000 = dot(gradient4(perm(hash4(ix + 1, iy + 0, iz + 0, iw + 0))), vec4<f32>(xf - 1.0, yf,       zf,       wf      ));
  let d0100 = dot(gradient4(perm(hash4(ix + 0, iy + 1, iz + 0, iw + 0))), vec4<f32>(xf,       yf - 1.0, zf,       wf      ));
  let d1100 = dot(gradient4(perm(hash4(ix + 1, iy + 1, iz + 0, iw + 0))), vec4<f32>(xf - 1.0, yf - 1.0, zf,       wf      ));

  let d0010 = dot(gradient4(perm(hash4(ix + 0, iy + 0, iz + 1, iw + 0))), vec4<f32>(xf,       yf,       zf - 1.0, wf      ));
  let d1010 = dot(gradient4(perm(hash4(ix + 1, iy + 0, iz + 1, iw + 0))), vec4<f32>(xf - 1.0, yf,       zf - 1.0, wf      ));
  let d0110 = dot(gradient4(perm(hash4(ix + 0, iy + 1, iz + 1, iw + 0))), vec4<f32>(xf,       yf - 1.0, zf - 1.0, wf      ));
  let d1110 = dot(gradient4(perm(hash4(ix + 1, iy + 1, iz + 1, iw + 0))), vec4<f32>(xf - 1.0, yf - 1.0, zf - 1.0, wf      ));

  let d0001 = dot(gradient4(perm(hash4(ix + 0, iy + 0, iz + 0, iw + 1))), vec4<f32>(xf,       yf,       zf,       wf - 1.0));
  let d1001 = dot(gradient4(perm(hash4(ix + 1, iy + 0, iz + 0, iw + 1))), vec4<f32>(xf - 1.0, yf,       zf,       wf - 1.0));
  let d0101 = dot(gradient4(perm(hash4(ix + 0, iy + 1, iz + 0, iw + 1))), vec4<f32>(xf,       yf - 1.0, zf,       wf - 1.0));
  let d1101 = dot(gradient4(perm(hash4(ix + 1, iy + 1, iz + 0, iw + 1))), vec4<f32>(xf - 1.0, yf - 1.0, zf,       wf - 1.0));

  let d0011 = dot(gradient4(perm(hash4(ix + 0, iy + 0, iz + 1, iw + 1))), vec4<f32>(xf,       yf,       zf - 1.0, wf - 1.0));
  let d1011 = dot(gradient4(perm(hash4(ix + 1, iy + 0, iz + 1, iw + 1))), vec4<f32>(xf - 1.0, yf,       zf - 1.0, wf - 1.0));
  let d0111 = dot(gradient4(perm(hash4(ix + 0, iy + 1, iz + 1, iw + 1))), vec4<f32>(xf,       yf - 1.0, zf - 1.0, wf - 1.0));
  let d1111 = dot(gradient4(perm(hash4(ix + 1, iy + 1, iz + 1, iw + 1))), vec4<f32>(xf - 1.0, yf - 1.0, zf - 1.0, wf - 1.0));

  // interpolate along x -> y -> z for w=0 layer
  let x00 = lerp(d0000, d1000, u);
  let x10 = lerp(d0100, d1100, u);
  let y0  = lerp(x00, x10, v);

  let x01 = lerp(d0010, d1010, u);
  let x11 = lerp(d0110, d1110, u);
  let y1  = lerp(x01, x11, v);

  let zLayer0 = lerp(y0, y1, t);

  // interpolate for w=1 layer
  let x00w = lerp(d0001, d1001, u);
  let x10w = lerp(d0101, d1101, u);
  let y0w  = lerp(x00w, x10w, v);

  let x01w = lerp(d0011, d1011, u);
  let x11w = lerp(d0111, d1111, u);
  let y1w  = lerp(x01w, x11w, v);

  let zLayer1 = lerp(y0w, y1w, t);

  // final interp along w
  return lerp(zLayer0, zLayer1, s);
}

fn worley3D(p : vec3<f32>) -> f32 {
    let fx = i32(floor(p.x));
    let fy = i32(floor(p.y));
    let fz = i32(floor(p.z));
    var minD : f32 = 1e9;
    for (var dz = -1; dz <= 1; dz = dz + 1) {
      for (var dy = -1; dy <= 1; dy = dy + 1) {
        for (var dx = -1; dx <= 1; dx = dx + 1) {
          let xi = fx + dx;
          let yi = fy + dy;
          let zi = fz + dz;
          let px = f32(xi) + rand3u(xi, yi, zi);
          let py = f32(yi) + rand3u(yi, zi, xi);
          let pz = f32(zi) + rand3u(zi, xi, yi);
          let dxv = px - p.x;
          let dyv = py - p.y;
          let dzv = pz - p.z;
          let d2 = dxv*dxv + dyv*dyv + dzv*dzv;
          if (d2 < minD) { minD = d2; }
        }
      }
    }
    return sqrt(minD);

}


/* ---------- 4D Worley (cellular) ---------- */
// fn worley4D(p: vec4<f32>) -> f32 {
//   let fx = i32(floor(p.x));
//   let fy = i32(floor(p.y));
//   let fz = i32(floor(p.z));
//   let fw = i32(floor(p.w));

//   var minDistSq : f32 = 1e9;

//   // iterate neighbor cells in 4D (3^4 = 81)
//   for (var dw = -1; dw <= 1; dw = dw + 1) {
//     for (var dz = -1; dz <= 1; dz = dz + 1) {
//       for (var dy = -1; dy <= 1; dy = dy + 1) {
//         for (var dx = -1; dx <= 1; dx = dx + 1) {
//           let xi = fx + dx;
//           let yi = fy + dy;
//           let zi = fz + dz;
//           let wi = fw + dw;

//           // jitter within each cell using rotated rand4u calls to decorrelate axes
//           let rx = rand4u(xi, yi, zi, wi);
//           let ry = rand4u(yi, zi, wi, xi);
//           let rz = rand4u(zi, wi, xi, yi);
//           let rw = rand4u(wi, xi, yi, zi);

//           let px = f32(xi) + rx;
//           let py = f32(yi) + ry;
//           let pz = f32(zi) + rz;
//           let pw = f32(wi) + rw;

//           let dxv = px - p.x;
//           let dyv = py - p.y;
//           let dzv = pz - p.z;
//           let dwv = pw - p.w;
//           let d2 = dxv * dxv + dyv * dyv + dzv * dzv + dwv * dwv;
//           if (d2 < minDistSq) { minDistSq = d2; }
//         }
//       }
//     }
//   }

//   return sqrt(minDistSq);
// }


fn cellular3D(p : vec3<f32>) -> f32 {
    let fx = i32(floor(p.x));
    let fy = i32(floor(p.y));
    let fz = i32(floor(p.z));
    var d1 : f32 = 1e9; var d2 : f32 = 1e9;
    for (var dz = -1; dz <= 1; dz++) {
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          let xi = fx + dx; let yi = fy + dy; let zi = fz + dz;
          let px = f32(xi) + rand3u(xi, yi, zi);
          let py = f32(yi) + rand3u(yi, zi, xi);
          let pz = f32(zi) + rand3u(zi, xi, yi);
          let dd = (px - p.x)*(px - p.x) + (py - p.y)*(py - p.y) + (pz - p.z)*(pz - p.z);
          if (dd < d1) { d2 = d1; d1 = dd; }
          else if (dd < d2) { d2 = dd; }
        }
      }
    }
    return d2 - d1;
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  2-D Simplex  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn simplex2D(p : vec2<f32>) -> f32 {
  let F2 : f32 = 0.3660254037844386;  // (\u221A3-1)/2
  let G2 : f32 = 0.2113248654051871;  // (3-\u221A3)/6

  // Skew to simplex grid
  let s  = (p.x + p.y) * F2;
  let i  = i32(floor(p.x + s));
  let j  = i32(floor(p.y + s));
  let t  = f32(i + j) * G2;

  let X0 = f32(i) - t;
  let Y0 = f32(j) - t;
  let x0 = p.x - X0;
  let y0 = p.y - Y0;

  // Simplex corner order
  var i1u : u32 = 0u;
  var j1u : u32 = 0u;
  if (x0 > y0) { i1u = 1u; } else { j1u = 1u; }

  // Offsets for remaining corners
  let x1 = x0 - f32(i1u) + G2;
  let y1 = y0 - f32(j1u) + G2;
  let x2 = x0 - 1.0 + 2.0 * G2;
  let y2 = y0 - 1.0 + 2.0 * G2;

  // Hashed gradients (mod 8 for 2D gradient table)
  let ii  = u32(i) & PERM_MASK;
  let jj  = u32(j) & PERM_MASK;
  let gi0 = perm(ii + perm(jj)) & 7u;
  let gi1 = perm(ii + i1u + perm((jj + j1u) & PERM_MASK)) & 7u;
  let gi2 = perm((ii + 1u) + perm((jj + 1u) & PERM_MASK)) & 7u;

  // Contributions from each corner
  var t0 = 0.5 - x0 * x0 - y0 * y0;
  var n0 : f32 = 0.0;
  if (t0 > 0.0) {
    t0 *= t0;
    n0 = t0 * t0 * dot(gradient2(gi0), vec2<f32>(x0, y0));
  }

  var t1 = 0.5 - x1 * x1 - y1 * y1;
  var n1 : f32 = 0.0;
  if (t1 > 0.0) {
    t1 *= t1;
    n1 = t1 * t1 * dot(gradient2(gi1), vec2<f32>(x1, y1));
  }

  var t2 = 0.5 - x2 * x2 - y2 * y2;
  var n2 : f32 = 0.0;
  if (t2 > 0.0) {
    t2 *= t2;
    n2 = t2 * t2 * dot(gradient2(gi2), vec2<f32>(x2, y2));
  }

  // Same scale used in the standard reference implementation
  return 70.0 * (n0 + n1 + n2);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 3-D Simplex Noise \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Call it like: let v = simplex3D(vec3<f32>(x,y,z));

fn simplex3D(pos : vec3<f32>) -> f32 {
    // Skew/\u200Bunskew factors for 3D
    let F3 : f32 = 1.0 / 3.0;
    let G3 : f32 = 1.0 / 6.0;

    // Skew the input space to find the simplex cell
    let s  = (pos.x + pos.y + pos.z) * F3;
    let i_f = floor(pos.x + s);
    let j_f = floor(pos.y + s);
    let k_f = floor(pos.z + s);

    let i = i32(i_f);
    let j = i32(j_f);
    let k = i32(k_f);

    // Unskew back to (x,y,z) space
    let t0 = f32(i + j + k) * G3;
    let X0 = f32(i) - t0;
    let Y0 = f32(j) - t0;
    let Z0 = f32(k) - t0;

    var x0 = pos.x - X0;
    var y0 = pos.y - Y0;
    var z0 = pos.z - Z0;

    // Determine which simplex we are in
    var i1: i32; var j1: i32; var k1: i32;
    var i2: i32; var j2: i32; var k2: i32;
    if (x0 >= y0) {
        if (y0 >= z0) {
            // X Y Z
            i1 = 1; j1 = 0; k1 = 0;
            i2 = 1; j2 = 1; k2 = 0;
        } else if (x0 >= z0) {
            // X Z Y
            i1 = 1; j1 = 0; k1 = 0;
            i2 = 1; j2 = 0; k2 = 1;
        } else {
            // Z X Y
            i1 = 0; j1 = 0; k1 = 1;
            i2 = 1; j2 = 0; k2 = 1;
        }
    } else {
        if (y0 < z0) {
            // Z Y X
            i1 = 0; j1 = 0; k1 = 1;
            i2 = 0; j2 = 1; k2 = 1;
        } else if (x0 < z0) {
            // Y Z X
            i1 = 0; j1 = 1; k1 = 0;
            i2 = 0; j2 = 1; k2 = 1;
        } else {
            // Y X Z
            i1 = 0; j1 = 1; k1 = 0;
            i2 = 1; j2 = 1; k2 = 0;
        }
    }

    // Offsets for the other three corners
    let x1 = x0 - f32(i1) + G3;
    let y1 = y0 - f32(j1) + G3;
    let z1 = z0 - f32(k1) + G3;

    let x2 = x0 - f32(i2) + 2.0 * G3;
    let y2 = y0 - f32(j2) + 2.0 * G3;
    let z2 = z0 - f32(k2) + 2.0 * G3;

    let x3 = x0 - 1.0 + 3.0 * G3;
    let y3 = y0 - 1.0 + 3.0 * G3;
    let z3 = z0 - 1.0 + 3.0 * G3;

    // Hash the corner indices to get gradient indices
    let ii = u32(i) & PERM_MASK;
    let jj = u32(j) & PERM_MASK;
    let kk = u32(k) & PERM_MASK;

    let gi0 = perm(ii + perm(jj + perm(kk)))        % 12u;
    let gi1 = perm(ii + u32(i1) + perm((jj + u32(j1)) + perm((kk + u32(k1))))) % 12u;
    let gi2 = perm(ii + u32(i2) + perm((jj + u32(j2)) + perm((kk + u32(k2))))) % 12u;
    let gi3 = perm(ii + 1u      + perm((jj + 1u     ) + perm((kk + 1u     )))) % 12u;

    // Compute contributions from each corner
    var n0: f32;
    var t_0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t_0 < 0.0) {
        n0 = 0.0;
    } else {
        let t2 = t_0 * t_0;
        n0 = t2 * t2 * dot(gradient(gi0), vec3<f32>(x0, y0, z0));
    }

    var n1: f32;
    var t_1 = 0.6 - x1*x1 - y1*y1 - z1*z1;
    if (t_1 < 0.0) {
        n1 = 0.0;
    } else {
        let t2 = t_1 * t_1;
        n1 = t2 * t2 * dot(gradient(gi1), vec3<f32>(x1, y1, z1));
    }

    var n2: f32;
    var t_2 = 0.6 - x2*x2 - y2*y2 - z2*z2;
    if (t_2 < 0.0) {
        n2 = 0.0;
    } else {
        let t2 = t_2 * t_2;
        n2 = t2 * t2 * dot(gradient(gi2), vec3<f32>(x2, y2, z2));
    }

    var n3: f32;
    var t_3 = 0.6 - x3*x3 - y3*y3 - z3*z3;
    if (t_3 < 0.0) {
        n3 = 0.0;
    } else {
        let t2 = t_3 * t_3;
        n3 = t2 * t2 * dot(gradient(gi3), vec3<f32>(x3, y3, z3));
    }

    // Final scale to match [-1,1]
    return 32.0 * (n0 + n1 + n2 + n3);
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  helpers  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/

fn cubicInterpolate(p0 : f32, p1 : f32, p2 : f32, p3 : f32, t : f32) -> f32 {
    return p1 + 0.5 * t *
        (p2 - p0 + t *
        (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3 + t *
        (3.0 * (p1 - p2) + p3 - p0)));
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Fast Lanczos 2-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn lanczos2D(pos : vec2<f32>) -> f32 {
    let ix  : i32 = i32(floor(pos.x));
    let iy  : i32 = i32(floor(pos.y));
    let dx  : f32 = pos.x - f32(ix);
    let dy  : f32 = pos.y - f32(iy);

    /* 4\xD74 neighbourhood hashed once \u2014 unrolled for speed */
    let n00 = rand2(ix - 1, iy - 1);
    let n10 = rand2(ix + 0, iy - 1);
    let n20 = rand2(ix + 1, iy - 1);
    let n30 = rand2(ix + 2, iy - 1);

    let n01 = rand2(ix - 1, iy + 0);
    let n11 = rand2(ix + 0, iy + 0);
    let n21 = rand2(ix + 1, iy + 0);
    let n31 = rand2(ix + 2, iy + 0);

    let n02 = rand2(ix - 1, iy + 1);
    let n12 = rand2(ix + 0, iy + 1);
    let n22 = rand2(ix + 1, iy + 1);
    let n32 = rand2(ix + 2, iy + 1);

    let n03 = rand2(ix - 1, iy + 2);
    let n13 = rand2(ix + 0, iy + 2);
    let n23 = rand2(ix + 1, iy + 2);
    let n33 = rand2(ix + 2, iy + 2);

    /* cubic along x (columns) */
    let col0 = cubicInterpolate(n00, n10, n20, n30, dx);
    let col1 = cubicInterpolate(n01, n11, n21, n31, dx);
    let col2 = cubicInterpolate(n02, n12, n22, n32, dx);
    let col3 = cubicInterpolate(n03, n13, n23, n33, dx);

    /* cubic along y (rows)  */
    return cubicInterpolate(col0, col1, col2, col3, dy);
}


/* helper to fetch one z-slice and cubic-interpolate along x/y */
fn slice(ix : i32, iy : i32, iz : i32, dx : f32, dy : f32) -> f32 {
    let n00 = rand3(ix - 1, iy - 1, iz);
    let n10 = rand3(ix + 0, iy - 1, iz);
    let n20 = rand3(ix + 1, iy - 1, iz);
    let n30 = rand3(ix + 2, iy - 1, iz);

    let n01 = rand3(ix - 1, iy + 0, iz);
    let n11 = rand3(ix + 0, iy + 0, iz);
    let n21 = rand3(ix + 1, iy + 0, iz);
    let n31 = rand3(ix + 2, iy + 0, iz);

    let n02 = rand3(ix - 1, iy + 1, iz);
    let n12 = rand3(ix + 0, iy + 1, iz);
    let n22 = rand3(ix + 1, iy + 1, iz);
    let n32 = rand3(ix + 2, iy + 1, iz);

    let n03 = rand3(ix - 1, iy + 2, iz);
    let n13 = rand3(ix + 0, iy + 2, iz);
    let n23 = rand3(ix + 1, iy + 2, iz);
    let n33 = rand3(ix + 2, iy + 2, iz);

    let col0 = cubicInterpolate(n00, n10, n20, n30, dx);
    let col1 = cubicInterpolate(n01, n11, n21, n31, dx);
    let col2 = cubicInterpolate(n02, n12, n22, n32, dx);
    let col3 = cubicInterpolate(n03, n13, n23, n33, dx);

    return cubicInterpolate(col0, col1, col2, col3, dy);
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Fast Lanczos 3-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn lanczos3D(pos : vec3<f32>) -> f32 {
    let ix : i32 = i32(floor(pos.x));
    let iy : i32 = i32(floor(pos.y));
    let iz : i32 = i32(floor(pos.z));
    let dx : f32 = pos.x - f32(ix);
    let dy : f32 = pos.y - f32(iy);
    let dz : f32 = pos.z - f32(iz);

    /* 4\xD74\xD74 neighbourhood \u2014 fetch & interpolate on-the-fly */

    let row0 = slice(ix, iy, iz - 1, dx, dy);
    let row1 = slice(ix, iy, iz + 0, dx, dy);
    let row2 = slice(ix, iy, iz + 1, dx, dy);
    let row3 = slice(ix, iy, iz + 2, dx, dy);

    return cubicInterpolate(row0, row1, row2, row3, dz);
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Voronoi 2-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn voronoi2D(pos : vec2<f32>) -> f32 {
    let fx : i32 = i32(floor(pos.x));
    let fy : i32 = i32(floor(pos.y));

    var minDist : f32 = 1e9;
    var minVal  : f32 = 0.0;

    for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
            let xi = fx + dx;
            let yi = fy + dy;

            let px = f32(xi) + rand2u(xi, yi);
            let py = f32(yi) + rand2u(yi, xi);

            let dist = (px - pos.x) * (px - pos.x) +
                       (py - pos.y) * (py - pos.y);

            if (dist < minDist) {
                minDist = dist;
                minVal  = rand2u(xi, yi);
            }
        }
    }
    return minVal;          // in [0,1]
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Voronoi 3-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
// fn voronoi3D(pos : vec3<f32>) -> f32 {
//     let fx : i32 = i32(floor(pos.x));
//     let fy : i32 = i32(floor(pos.y));
//     let fz : i32 = i32(floor(pos.z));

//     var minDist : f32 = 1e9;
//     var minVal  : f32 = 0.0;

//     for (var dz : i32 = -1; dz <= 1; dz = dz + 1) {
//         for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
//             for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
//                 let xi = fx + dx;
//                 let yi = fy + dy;
//                 let zi = fz + dz;

//                 let px = f32(xi) + rand3u(xi, yi, zi);
//                 let py = f32(yi) + rand3u(yi, zi, xi);
//                 let pz = f32(zi) + rand3u(zi, xi, yi);

//                 let dist = (px - pos.x) * (px - pos.x) +
//                            (py - pos.y) * (py - pos.y) +
//                            (pz - pos.z) * (pz - pos.z);

//                 if (dist < minDist) {
//                     minDist = dist;
//                     minVal  = rand3u(xi, yi, zi);
//                 }
//             }
//         }
//     }
//     return minVal;          // in [0,1]
// }



// ----------------- types & mode constants -----------------
struct Voro3DMetrics { f1Sq: f32, f2Sq: f32, cellVal: f32, };
struct Voro4DMetrics { f1Sq: f32, f2Sq: f32, cellVal: f32, };

// ----------------- voro_eval: pick output depending on mode -----------------


const VORO_CELL            : u32 = 0u;
const VORO_F1              : u32 = 1u;
const VORO_INTERIOR        : u32 = 2u;  // gap = F2 - F1
const VORO_EDGES           : u32 = 3u;  // scaled gap
const VORO_EDGE_THRESH     : u32 = 4u;  // gate gap >= threshold
const VORO_FLAT_SHADE      : u32 = 5u;  // interior = 1, edges = 0 (edges defined by gap < threshold)
const VORO_FLAT_SHADE_INV  : u32 = 6u;  // edges = 1, interior = 0 (gap < threshold)

// Added: "old cellular3D" compatible squared-gap modes (F2^2 - F1^2)
const VORO_INTERIOR_SQ        : u32 = 7u;  // gapSq = F2^2 - F1^2
const VORO_EDGES_SQ           : u32 = 8u;  // scaled gapSq
const VORO_EDGE_THRESH_SQ     : u32 = 9u;  // gate gapSq >= threshold
const VORO_FLAT_SHADE_SQ      : u32 = 10u; // interior = 1, edges = 0 (gapSq < threshold)
const VORO_FLAT_SHADE_INV_SQ  : u32 = 11u; // edges = 1, interior = 0 (gapSq < threshold)

// Added: F1 threshold and masks (useful for "radius" gates, bubble masks, etc.)
const VORO_F1_THRESH      : u32 = 12u; // gate F1 >= threshold, returns F1 * gate
const VORO_F1_MASK        : u32 = 13u; // smooth mask: 0 below threshold, 1 above (feather=edgeK)
const VORO_F1_MASK_INV    : u32 = 14u; // inverted mask: 1 below threshold, 0 above (feather=edgeK)

// Added: softer edge line response (no threshold needed)
const VORO_EDGE_RCP       : u32 = 15u; // 1 / (1 + gap*k)
const VORO_EDGE_RCP_SQ    : u32 = 16u; // 1 / (1 + gapSq*k)

fn voro_edge_dist(f1Sq: f32, f2Sq: f32) -> f32 {
  let f1 = sqrt(max(f1Sq, 0.0));
  let f2 = sqrt(max(f2Sq, 0.0));
  return max(f2 - f1, 0.0);
}

// edgeDist is gap (or gapSq for *_SQ modes)
// returns 1 near edges (small edgeDist), 0 in interior
fn voro_edge_mask(edgeDist: f32, threshold: f32, feather: f32) -> f32 {
  let t = max(threshold, 0.0);
  if (t <= 0.0) { return 0.0; }

  let f = max(feather, 0.0);
  if (f > 0.0) {
    return 1.0 - smoothstep(t, t + f, edgeDist);
  }
  return select(0.0, 1.0, edgeDist < t);
}

// returns 0 below threshold, 1 above (optionally smoothed)
fn voro_thresh_mask(v: f32, threshold: f32, feather: f32) -> f32 {
  let t = max(threshold, 0.0);
  if (t <= 0.0) { return 0.0; }

  let f = max(feather, 0.0);
  if (f > 0.0) {
    return smoothstep(t, t + f, v);
  }
  return select(0.0, 1.0, v >= t);
}

fn voro_eval3D_metrics(m: Voro3DMetrics, params: NoiseParams, freqOrScale: f32) -> f32 {
  return voro_eval(
    m.f1Sq,
    m.f2Sq,
    m.cellVal,
    params.voroMode,
    max(params.edgeK, 0.0),
    max(params.threshold, 0.0),
    freqOrScale
  );
}


// f1Sq/f2Sq are squared distances; cellVal in [0,1].
// edgeK is scale (edges modes) or feather (mask modes). freqOrScale unused.
fn voro_eval(
  f1Sq: f32,
  f2Sq: f32,
  cellVal: f32,
  mode: u32,
  edgeK: f32,
  threshold: f32,
  freqOrScale: f32
) -> f32 {
  let f1 = sqrt(max(f1Sq, 0.0));
  let f2 = sqrt(max(f2Sq, 0.0));
  let gap = max(f2 - f1, 0.0);

  let gapSq = max(f2Sq - f1Sq, 0.0);

  switch (mode) {
    case VORO_CELL: {
      return cellVal;
    }
    case VORO_F1: {
      return f1;
    }
    case VORO_INTERIOR: {
      return gap;
    }
    case VORO_EDGES: {
      let k = max(edgeK, 0.0);
      return clamp(gap * select(10.0, k, k > 0.0), 0.0, 1.0);
    }
    case VORO_EDGE_THRESH: {
      let t = max(threshold, 0.0);
      let gate = select(0.0, 1.0, gap >= t);
      return gap * gate;
    }
    case VORO_FLAT_SHADE: {
      let edge = voro_edge_mask(gap, threshold, edgeK);
      return 1.0 - edge;
    }
    case VORO_FLAT_SHADE_INV: {
      let edge = voro_edge_mask(gap, threshold, edgeK);
      return edge;
    }

    case VORO_INTERIOR_SQ: {
      return gapSq;
    }
    case VORO_EDGES_SQ: {
      let k = max(edgeK, 0.0);
      return clamp(gapSq * select(10.0, k, k > 0.0), 0.0, 1.0);
    }
    case VORO_EDGE_THRESH_SQ: {
      let t = max(threshold, 0.0);
      let gate = select(0.0, 1.0, gapSq >= t);
      return gapSq * gate;
    }
    case VORO_FLAT_SHADE_SQ: {
      let edge = voro_edge_mask(gapSq, threshold, edgeK);
      return 1.0 - edge;
    }
    case VORO_FLAT_SHADE_INV_SQ: {
      let edge = voro_edge_mask(gapSq, threshold, edgeK);
      return edge;
    }

    case VORO_F1_THRESH: {
      let t = max(threshold, 0.0);
      let gate = select(0.0, 1.0, f1 >= t);
      return f1 * gate;
    }
    case VORO_F1_MASK: {
      return voro_thresh_mask(f1, threshold, edgeK);
    }
    case VORO_F1_MASK_INV: {
      return 1.0 - voro_thresh_mask(f1, threshold, edgeK);
    }

    case VORO_EDGE_RCP: {
      let k = max(edgeK, 0.0);
      return 1.0 / (1.0 + gap * k*10);
    }
    case VORO_EDGE_RCP_SQ: {
      let k = max(edgeK, 0.0);
      return 1.0 / (1.0 + gapSq * k*10);
    }

    default: {
      return gap;
    }
  }
}

// ----------------- helpers: metrics -----------------
fn voro3D_metrics(pos: vec3<f32>) -> Voro3DMetrics {
  let fx = i32(floor(pos.x));
  let fy = i32(floor(pos.y));
  let fz = i32(floor(pos.z));

  var d1 : f32 = 1e9;
  var d2 : f32 = 1e9;
  var lab: f32 = 0.0;

  for (var dz = -1; dz <= 1; dz = dz + 1) {
    for (var dy = -1; dy <= 1; dy = dy + 1) {
      for (var dx = -1; dx <= 1; dx = dx + 1) {
        let xi = fx + dx; let yi = fy + dy; let zi = fz + dz;

        let rx = rand3u(xi, yi, zi);
        let ry = rand3u(yi, zi, xi);
        let rz = rand3u(zi, xi, yi);

        let px = f32(xi) + rx;
        let py = f32(yi) + ry;
        let pz = f32(zi) + rz;

        let dxv = px - pos.x;
        let dyv = py - pos.y;
        let dzv = pz - pos.z;

        let d2c = dxv*dxv + dyv*dyv + dzv*dzv;

        if (d2c < d1) {
          d2 = d1;
          d1 = d2c;
          lab = rand3u(xi, yi, zi);
        } else if (d2c < d2) {
          d2 = d2c;
        }
      }
    }
  }
  return Voro3DMetrics(d1, d2, lab);
}

fn voro4D_metrics(p: vec4<f32>) -> Voro4DMetrics {
  let fx = i32(floor(p.x));
  let fy = i32(floor(p.y));
  let fz = i32(floor(p.z));
  let fw = i32(floor(p.w));

  var d1 : f32 = 1e9;
  var d2 : f32 = 1e9;
  var lab: f32 = 0.0;

  for (var dw = -1; dw <= 1; dw = dw + 1) {
    for (var dz = -1; dz <= 1; dz = dz + 1) {
      for (var dy = -1; dy <= 1; dy = dy + 1) {
        for (var dx = -1; dx <= 1; dx = dx + 1) {
          let xi = fx + dx; let yi = fy + dy; let zi = fz + dz; let wi = fw + dw;

          let rx = rand4u(xi, yi, zi, wi);
          let ry = rand4u(yi, zi, wi, xi);
          let rz = rand4u(zi, wi, xi, yi);
          let rw = rand4u(wi, xi, yi, zi);

          let px = f32(xi) + rx;
          let py = f32(yi) + ry;
          let pz = f32(zi) + rz;
          let pw = f32(wi) + rw;

          let dxv = px - p.x; let dyv = py - p.y;
          let dzv = pz - p.z; let dwv = pw - p.w;

          let d2c = dxv*dxv + dyv*dyv + dzv*dzv + dwv*dwv;

          if (d2c < d1) {
            d2 = d1;
            d1 = d2c;
            lab = rand4u(xi, yi, zi, wi);
          } else if (d2c < d2) {
            d2 = d2c;
          }
        }
      }
    }
  }
  return Voro4DMetrics(d1, d2, lab);
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Cellular 2-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn cellular2D(pos : vec2<f32>) -> f32 {
    let fx : i32 = i32(floor(pos.x));
    let fy : i32 = i32(floor(pos.y));

    var minDist1 : f32 = 1e9;
    var minDist2 : f32 = 1e9;

    for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
            let xi = fx + dx;
            let yi = fy + dy;

            /* feature point */
            let px = f32(xi) + rand2u(xi, yi);
            let py = f32(yi) + rand2u(yi, xi);

            /* squared distance */
            let d = (px - pos.x) * (px - pos.x)
                  + (py - pos.y) * (py - pos.y);

            /* keep two smallest distances */
            if (d < minDist1) {
                minDist2 = minDist1;
                minDist1 = d;
            } else if (d < minDist2) {
                minDist2 = d;
            }
        }
    }
    /* return difference of 1st and 2nd nearest feature distances */
    return minDist2 - minDist1;
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Worley 2-D  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn worley2D(pos : vec2<f32>) -> f32 {
    let fx : i32 = i32(floor(pos.x));
    let fy : i32 = i32(floor(pos.y));

    var minDist : f32 = 1e9;

    for (var dy : i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx : i32 = -1; dx <= 1; dx = dx + 1) {
            let xi = fx + dx;
            let yi = fy + dy;

            /* feature point */
            let px = f32(xi) + rand2u(xi, yi);
            let py = f32(yi) + rand2u(yi, xi);

            /* squared distance */
            let d = (px - pos.x) * (px - pos.x)
                  + (py - pos.y) * (py - pos.y);

            if (d < minDist) {
                minDist = d;
            }
        }
    }

    return sqrt(minDist);    // Euclidean distance to nearest feature
}

/* central-diff gradient of scalar simplex */
fn gradSimplex2(q: vec2<f32>, eps: f32) -> vec2<f32> {
  let dx = (simplex2D(q + vec2<f32>(eps, 0.0)) - simplex2D(q - vec2<f32>(eps, 0.0))) / (2.0 * eps);
  let dy = (simplex2D(q + vec2<f32>(0.0, eps)) - simplex2D(q - vec2<f32>(0.0, eps))) / (2.0 * eps);
  return vec2<f32>(dx, dy);
}

/* single-octave curl = grad rotated 90\xB0 (\u2202N/\u2202y, -\u2202N/\u2202x) */
fn curl2_simplex2D(pos: vec2<f32>, p: NoiseParams) -> vec2<f32> {
  let zoom = max(p.zoom, 1e-6);
  let freq = max(p.freq, 1e-6);
  let base = pos / zoom + vec2<f32>(p.xShift, p.yShift);
  let q = base * freq;

  // choose \u03B5 ~ half a cycle of current scale to avoid lattice aliasing
  let cycles_per_world = max(freq / zoom, 1e-6);
  let eps = 0.5 / cycles_per_world;

  let g = gradSimplex2(q, eps * freq);
  return vec2<f32>(g.y, -g.x);
}

/* multi-octave curl: sum derivatives per octave (no sharp creases) */
fn curl2_simplexFBM(pos: vec2<f32>, p: NoiseParams) -> vec2<f32> {
  let zoom = max(p.zoom, 1e-6);
  var q      = pos / zoom + vec2<f32>(p.xShift, p.yShift);
  var freq   : f32 = max(p.freq, 1e-6);
  var amp    : f32 = 1.0;
  var angle  : f32 = p.seedAngle;
  var curl   : vec2<f32> = vec2<f32>(0.0);

  for (var i: u32 = 0u; i < p.octaves; i = i + 1u) {
    // \u03B5 scales with octave so the finite difference stays well-conditioned
    let cycles_per_world = max(freq / zoom, 1e-6);
    let eps = 0.5 / cycles_per_world;

    let g = gradSimplex2(q * freq, eps * freq);
    curl += vec2<f32>(g.y, -g.x) * amp;

    // next octave
    freq *= p.lacunarity;
    amp  *= p.gain;

    // decorrelate like your Perlin path (XY rotate + shift bleed into next)
    let cA = cos(angle);
    let sA = sin(angle);
    let nx = q.x * cA - q.y * sA;
    let ny = q.x * sA + q.y * cA;
    q = vec2<f32>(nx, ny) + vec2<f32>(p.xShift, p.yShift);
    angle += ANGLE_INCREMENT;
  }
  return curl;
}

/* map a non-negative magnitude to [-1,1] for your writeChannel convention */
fn mag_to_signed01(m: f32) -> f32 {
  return clamp(m, 0.0, 1.0) * 2.0 - 1.0;
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Domain-warp FBM  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn domainWarpFBM(p: vec3<f32>, params: NoiseParams,
                 warpAmp: f32, stages: u32) -> f32 {
    var q = p;
    for (var i: u32 = 0u; i < stages; i = i + 1u) {
        let w = fbm3D(q, params) * warpAmp;
        q = q + vec3<f32>(w, w, w);
    }
    return fbm3D(q, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 gabor utils \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

const TAU : f32 = 6.283185307179586;

fn saturate(x: f32) -> f32 { return clamp(x, 0.0, 1.0); }

fn hash_u32(x: u32) -> u32 {
  var v = x;
  v = (v ^ 61u) ^ (v >> 16u);
  v = v + (v << 3u);
  v = v ^ (v >> 4u);
  v = v * 0x27d4eb2du;
  v = v ^ (v >> 15u);
  return v;
}

fn hash3_u32(ix: i32, iy: i32, iz: i32, seed: u32, salt: u32) -> u32 {
  let x = u32(ix) * 73856093u;
  let y = u32(iy) * 19349663u;
  let z = u32(iz) * 83492791u;
  return hash_u32(x ^ y ^ z ^ seed ^ salt);
}

fn rnd01(h: u32) -> f32 {
  return f32(h) * (1.0 / 4294967295.0);
}

fn rand3_01(ix: i32, iy: i32, iz: i32, seed: u32, salt: u32) -> f32 {
  return rnd01(hash3_u32(ix, iy, iz, seed, salt));
}

fn rand3_vec3(ix: i32, iy: i32, iz: i32, seed: u32, salt: u32) -> vec3<f32> {
  let a = rand3_01(ix, iy, iz, seed, salt + 0u);
  let b = rand3_01(ix, iy, iz, seed, salt + 1u);
  let c = rand3_01(ix, iy, iz, seed, salt + 2u);
  return vec3<f32>(a, b, c);
}

fn rand_unit_vec3(ix: i32, iy: i32, iz: i32, seed: u32, salt: u32) -> vec3<f32> {
  let u = rand3_01(ix, iy, iz, seed, salt + 0u);
  let v = rand3_01(ix, iy, iz, seed, salt + 1u);

  let z = 1.0 - 2.0 * u;
  let r = sqrt(max(0.0, 1.0 - z * z));
  let a = TAU * v;

  return vec3<f32>(r * cos(a), r * sin(a), z);
}

fn gabor_kernel3D(d: vec3<f32>, dir: vec3<f32>, waveFreq: f32, sigma: f32, phase: f32) -> f32 {
  let s  = max(0.0005, sigma);
  let g  = exp(-dot(d, d) / (2.0 * s * s));
  let w  = cos(TAU * waveFreq * dot(dir, d) + phase);
  return g * w;
}

fn gaborWarpDomain(p: vec3<f32>, params: NoiseParams) -> vec3<f32> {
  let a = params.warpAmp;
  if (a <= 0.00001) { return p; }

  let w1 = simplex3D(p * 0.75 + vec3<f32>(13.1, 7.7, 19.3));
  let w2 = simplex3D(p * 0.75 + vec3<f32>(41.7, 23.9, 5.3));
  let w3 = simplex3D(p * 0.75 + vec3<f32>(9.9, 31.3, 17.7));

  return p + vec3<f32>(w1, w2, w3) * a;
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Gabor sparse-convolution  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn gaborOctave3D(p: vec3<f32>, waveFreq: f32, sigma: f32, params: NoiseParams) -> f32 {
  let base = vec3<i32>(
    i32(floor(p.x)),
    i32(floor(p.y)),
    i32(floor(p.z))
  );

  var sum: f32 = 0.0;

  for (var dz: i32 = -1; dz <= 1; dz = dz + 1) {
    for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
      for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
        let cx = base.x + dx;
        let cy = base.y + dy;
        let cz = base.z + dz;

        let jitter = rand3_vec3(cx, cy, cz, params.seed, 11u) - vec3<f32>(0.5, 0.5, 0.5);
        let center = vec3<f32>(f32(cx), f32(cy), f32(cz)) + vec3<f32>(0.5, 0.5, 0.5) + jitter * 0.95;

        let d     = p - center;
        let dir   = rand_unit_vec3(cx, cy, cz, params.seed, 41u);
        let phase = TAU * rand3_01(cx, cy, cz, params.seed, 71u);
        let amp   = rand3_01(cx, cy, cz, params.seed, 91u) * 2.0 - 1.0;

        sum += amp * gabor_kernel3D(d, dir, waveFreq, sigma, phase);
      }
    }
  }

  return sum * (1.0 / 9.0);
}

fn gaborShape(n: f32, params: NoiseParams) -> f32 {
  var v = 0.5 + 0.5 * clamp(n, -1.0, 1.0);

  let widen = max(0.0, params.gaborRadius) * max(0.0001, params.exp2);
  v = pow(saturate(v), 1.0 / (1.0 + widen));

  let t    = saturate(params.threshold);
  let hard = max(0.0001, params.exp1);

  let a = smoothstep(t - hard, t + hard, v);
  return a * 2.0 - 1.0;
}

fn gaborCellEdgeMask2D(cellP: vec2<f32>, edgeK: f32) -> f32 {
  let k = max(0.0, edgeK);
  if (k <= 0.00001) { return 1.0; }

  let width = select(k, 0.5 / k, k > 0.5);
  let w = clamp(width, 0.00001, 0.5);

  let f  = fract(cellP);
  let dx = min(f.x, 1.0 - f.x);
  let dy = min(f.y, 1.0 - f.y);
  let d  = min(dx, dy);

  return smoothstep(0.0, w, d);
}

/* Multi-octave Gabor with per-octave cell-edge fade */
fn gaborNoise3D(p: vec3<f32>, params: NoiseParams) -> f32 {
  var x = p.x / params.zoom + params.xShift;
  var y = p.y / params.zoom + params.yShift;
  var z = p.z / params.zoom + params.zShift;

  var sum     : f32 = 0.0;
  var amp     : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle   : f32 = params.seedAngle;

  let waveFreq = max(0.001, params.rippleFreq);

  var minMask : f32 = 1.0;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let sigma = max(0.0005, params.gaborRadius);

    var pp = vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc);
    pp = gaborWarpDomain(pp, params);

    let edgeM = gaborCellEdgeMask2D(pp.xy, params.edgeK);
    minMask = min(minMask, edgeM);

    var n = gaborOctave3D(pp, waveFreq, sigma, params);

    if (params.turbulence == 1u) {
      n = abs(n) * edgeM;
    } else {
      n = (-1.0) + (n + 1.0) * edgeM;
    }

    sum += n * amp;

    freqLoc *= params.lacunarity;
    amp     *= params.gain;

    let c  = cos(angle);
    let s  = sin(angle);
    let nx = x * c - y * s;
    let ny = x * s + y * c;
    let nz = y * s + z * c;

    x = nx + params.xShift;
    y = ny + params.yShift;
    z = nz + params.zShift;

    angle += ANGLE_INCREMENT;
  }

  if (params.turbulence == 1u) {
    sum = mix(-1.0, sum, minMask);
  }

  var out = gaborShape(sum, params);
  if (params.turbulence == 1u) { out = out - 1.0; }
  return out;
}

fn gaborFlowKernel3D(r: vec3<f32>, d: vec2<f32>, ex: f32, ey: f32, ez: f32, c: f32, phase: f32) -> f32 {
  let rx = dot(r.xy, d);
  let ry = dot(r.xy, vec2<f32>(d.y, -d.x));
  let g  = exp(ex * rx * rx + ey * ry * ry + ez * r.z * r.z);
  let w  = cos(c * rx + phase);
  return g * w;
}

fn gaborMagicNoise3D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let sizeF = select(12.0, par.terraceStep, par.terraceStep > 0.00001);
  let size  = max(1, i32(clamp(sizeF, 1.0, 48.0) + 0.5));

  let zRad  = i32(2u);

  let sig = max(0.0005, par.gaborRadius);
  let gam = max(0.0001, par.exp2);

  let sx = sig;
  let sy = sig / gam;
  let sz = sig;

  let ex = -0.5 / (sx * sx);
  let ey = -0.5 / (sy * sy);
  let ez = -0.5 / (sz * sz);

  let lam = max(0.001, par.rippleFreq);
  let c   = TAU / lam;

  let P = 0.1963495408; // PI/16

  var cs: array<vec2<f32>, 16>;
  var ph: array<f32, 16>;
  var acc: array<f32, 16>;

  for (var k: u32 = 0u; k < 16u; k = k + 1u) {
    acc[k] = 0.0;
    let a = f32(k) * P;
    cs[k] = vec2<f32>(cos(a), sin(a));
    ph[k] = TAU * rand3_01(i32(k), 0, 0, par.seed, 71u);
  }

  let base = vec3<f32>(
    p.x / par.zoom + par.xShift,
    p.y / par.zoom + par.yShift,
    p.z / par.zoom + par.zShift
  );

  let adv = vec3<f32>(par.time * 10.0, par.time * 10.0, par.time * 3.0);

  let seedOff = vec3<f32>(
    f32(par.seed & 1023u) * 23.17,
    f32((par.seed >> 10u) & 1023u) * 19.73,
    f32((par.seed >> 20u) & 1023u) * 17.11
  );

  let fscale = 0.1 * max(0.0001, par.freq);

  let phaseT = TAU * (par.time / lam);

  for (var dz: i32 = -zRad; dz <= zRad; dz = dz + 1) {
    for (var j: i32 = -size; j <= size; j = j + 1) {
      for (var i: i32 = -size; i <= size; i = i + 1) {
        let r = vec3<f32>(f32(i), f32(j), f32(dz));

        var sp = (base + r + adv + seedOff) * fscale;
        sp = gaborWarpDomain(sp, par);

        let src = 0.6 * (0.5 + 0.5 * noise3D(sp));

        for (var k: u32 = 0u; k < 16u; k = k + 1u) {
          acc[k] += src * gaborFlowKernel3D(r, cs[k], ex, ey, ez, c, ph[k] + phaseT);
        }
      }
    }
  }

  var mx: f32 = 0.0;
  for (var k: u32 = 0u; k < 16u; k = k + 1u) {
    mx = max(mx, acc[k]);
  }

  var v01 = saturate((mx / 10.0) * max(0.0001, par.gain));

  if (par.threshold > 0.00001) {
    let t    = saturate(par.threshold);
    let hard = max(0.0001, par.exp1);
    v01 = smoothstep(t - hard, t + hard, v01);
  }

  return v01 * 2.0 - 1.0;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 flow-gabor helpers \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

fn hash2f01(p: vec2<f32>, seed: u32) -> f32 {
  let h = sin(dot(p, vec2<f32>(12.9898, 78.233)) + f32(seed) * 0.000123);
  return fract(h * 43758.5453);
}

fn mnoise3D(p: vec3<f32>, mode: u32) -> f32 {
  let n = noise3D(p); // ~[-1,1]
  if (mode == 1u) { return -1.0 + 2.0 * abs(n); }          // cloud-like
  if (mode == 2u) { return -1.0 + 2.0 * (1.0 - abs(n)); }  // flame-like
  return n;
}

fn turb2D(U: vec2<f32>, t: f32, par: NoiseParams) -> f32 {
  var u = U;
  var tt = t;

  var f: f32 = 0.0;
  var q: f32 = 1.0;
  var s: f32 = 0.0;

  let m: f32 = 2.0;
  let iters: u32 = clamp(par.octaves, 1u, 4u);

  for (var i: u32 = 0u; i < 4u; i = i + 1u) {
    if (i >= iters) { break; }

    u -= tt * vec2<f32>(0.6, 0.2);
    f += q * mnoise3D(vec3<f32>(u, tt), par.voroMode);
    s += q;

    q *= 0.5;
    u *= m;
    tt *= 1.71;
  }

  return f / max(1e-6, s);
}

fn flowDir2D(U: vec2<f32>, t: f32, par: NoiseParams) -> vec2<f32> {
  let eps: f32 = 1e-3;
  let S: f32 = max(1e-4, par.freq);

  let a = turb2D(S * (U + vec2<f32>(0.0, -eps)), t, par);
  let b = turb2D(S * (U + vec2<f32>(0.0,  eps)), t, par);
  let c = turb2D(S * (U + vec2<f32>( eps, 0.0)), t, par);
  let d = turb2D(S * (U + vec2<f32>(-eps, 0.0)), t, par);

  var V = vec2<f32>((a - b), (c - d)) / eps;

  let l2 = dot(V, V);
  if (l2 < 1e-20) { V = vec2<f32>(1.0, 0.0); }
  else { V *= inverseSqrt(l2); }

  // optional: rotate into "normal field" (like the shadertoy toggle)
  if ((par.voroMode & 4u) != 0u) { V = vec2<f32>(-V.y, V.x); }

  return V;
}

fn gaborPhasorFlow(U: vec2<f32>, V: vec2<f32>, par: NoiseParams) -> vec2<f32> {
  let F: f32 = max(1e-4, par.rippleFreq);

  let Wf = select(12.0, par.terraceStep, par.terraceStep > 0.00001);
  let W  = max(1, i32(clamp(Wf, 1.0, 24.0) + 0.5));

  let TG: f32 = par.time * 0.5 * max(0.0, par.warpAmp);

  var s: vec2<f32> = vec2<f32>(0.0);
  var T: f32 = 0.0;

  for (var j: i32 = -W; j <= W; j = j + 1) {
    for (var i: i32 = -W; i <= W; i = i + 1) {
      let P = vec2<f32>(f32(i), f32(j));

      let h = hash2f01(U + P, par.seed);
      let ang = TWO_PI * h - F * dot(P, V) + TG;

      let v = vec2<f32>(cos(ang), sin(ang));

      let d = min(1.0, length(P) / f32(W));
      let K = 0.5 + 0.5 * cos(PI * d); // raised-cosine kernel

      s += v * K;
      T += K;
    }
  }

  return s / max(1e-6, T);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

fn generateGaborFlow(pos: vec3<f32>, par: NoiseParams) -> f32 {
  let zoom = max(par.zoom, 1e-6);

  // reconstruct pixel-ish domain like shadertoy (centered)
  let R = vec2<f32>(max(f32(frame.fullWidth), 1.0), max(f32(frame.fullHeight), 1.0));
  let uPix = vec2<f32>(pos.x * R.x, pos.y * R.y);
  let Uflow = (uPix - 0.5 * R) / R.y;

  // animated flow time
  let t = par.time * 0.2;

  // flow direction
  let V = flowDir2D(Uflow * (1.0 / zoom), t, par);

  // gabor phasor (use centered pixel coords like the reference)
  let s = gaborPhasorFlow((uPix - 0.5 * R) / zoom, V, par);

  // output mode:
  //  - turbulence==0: phasor profile (0..1)
  //  - turbulence==1: contrast (magnitude)
  let l = length(s);
  var v01: f32;

  if (par.turbulence == 1u) {
    v01 = saturate(4.0 * l * max(0.0001, par.gain));
  } else {
    let nx = select(1.0, s.x / l, l > 1e-8);
    v01 = 0.5 + 0.5 * nx;
    v01 = saturate(v01 * max(0.0001, par.gain));
  }

  if (par.threshold > 0.00001) {
    let tt = saturate(par.threshold);
    let hard = max(0.0001, par.exp1);
    v01 = smoothstep(tt - hard, tt + hard, v01);
  }

  return v01 * 2.0 - 1.0;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 compute entry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

@compute @workgroup_size(8,8,1)
fn computeGaborFlow(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateGaborFlow(p, params), options.outputChannel, 0u);
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Terrace & Foam filters  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn terrace(v:f32, steps:f32)  -> f32 { return floor(v*steps)/steps; }
fn foamify(v: f32) -> f32 {
    let x = clamp(v, 0.0, 1.0);

    let lo = smoothstep(0.18, 0.48, x);
    let hi = 1.0 - smoothstep(0.58, 0.92, x);

    let band = clamp(lo * hi, 0.0, 1.0);
    return pow(band, 0.6);
}
fn turbulence(v:f32)          -> f32 { return abs(v); }

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Simplex (multi-octave) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn generateSimplex(pos: vec3<f32>, p: NoiseParams) -> f32 {
    let invZoom = 1.0 / max(p.zoom, 1e-6);
    let domainOffset = seedOffset3(p.seed);

    let base = vec3<f32>(
      pos.x * invZoom + p.xShift,
      pos.y * invZoom + p.yShift,
      pos.z * invZoom + p.zShift
    ) + domainOffset;

    var sum     : f32 = 0.0;
    var amp     : f32 = 1.0;
    var ampSum  : f32 = 0.0;
    var freqLoc : f32 = max(p.freq, 1e-6);
    var angle   : f32 = p.seedAngle;

    for (var i: u32 = 0u; i < p.octaves; i = i + 1u) {
        let samplePos = rotateXY3(base, angle) * freqLoc;
        var n = simplex3D(samplePos);
        if (p.turbulence == 1u) { n = abs(n); }
        sum += n * amp;
        ampSum += amp;

        freqLoc *= p.lacunarity;
        amp     *= p.gain;
        angle   += ANGLE_INCREMENT;
    }

    if (ampSum > 0.0) {
        sum = sum / ampSum;
    }
    if (p.turbulence == 1u) { sum = sum * 2.0 - 1.0; }
    return sum;
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Simplex-based fBm helper (normalized)  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn sfbm3D(pos : vec3<f32>, params: NoiseParams) -> f32 {
    let invZoom = 1.0 / max(params.zoom, 1e-6);
    let domainOffset = seedOffset3(params.seed);

    let base = vec3<f32>(
      pos.x * invZoom + params.xShift,
      pos.y * invZoom + params.yShift,
      pos.z * invZoom + params.zShift
    ) + domainOffset;

    var sum       : f32 = 0.0;
    var amplitude : f32 = 1.0;
    var maxValue  : f32 = 0.0;
    var freqLoc   : f32 = max(params.freq, 1e-6);
    var angle     : f32 = params.seedAngle;
    let angleInc  : f32 = 2.0 * PI / max(f32(params.octaves), 1.0);

    for (var i : u32 = 0u; i < params.octaves; i = i + 1u) {
        let samplePos = rotateXY3(base, angle) * freqLoc;
        var n = simplex3D(samplePos);
        if (params.turbulence == 1u) { n = abs(n); }

        sum      += amplitude * n;
        maxValue += amplitude;

        freqLoc   *= params.lacunarity;
        amplitude *= params.gain;
        angle     += angleInc;
    }

    if (maxValue > 0.0) {
        var out = sum / maxValue;
        if (params.turbulence == 1u) {
            out = out * 2.0 - 1.0;
        }
        return out;
    }
    return 0.0;
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Simplex FBM (Perlin-style nested fBm)  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
fn generateSimplexFBM(pos: vec3<f32>, p: NoiseParams) -> f32 {
    // Same  you use for Perlin FBM: fBm once, then feed through again
    let fbm1 = sfbm3D(pos, p);
    let fbm2 = sfbm3D(vec3<f32>(fbm1, fbm1, fbm1), p);
    return 2.0 * fbm2;  // keep roughly in [-1,1]
}

fn generateDomainWarpFBM1(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let v = domainWarpFBM(pos, par, par.warpAmp, 1u);
    return v;
}

fn generateDomainWarpFBM2(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let v = domainWarpFBM(pos, par, par.warpAmp, 2u);
    return v;
}

fn generateGaborAniso(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let v = gaborNoise3D(pos, par);
    return v;
}

fn generateGaborMagic(pos: vec3<f32>, par: NoiseParams) -> f32 {
  return gaborMagicNoise3D(pos, par);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Perlin Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generatePerlin(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let invZoom = 1.0 / max(params.zoom, 1e-6);
  let domainOffset = seedOffset3(params.seed);

  let base = vec3<f32>(
    pos.x * invZoom + params.xShift,
    pos.y * invZoom + params.yShift,
    pos.z * invZoom + params.zShift
  ) + domainOffset;

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var freqLoc: f32 = max(params.freq, 1e-6);
  var angle: f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let samplePos = rotateXY3(base, angle) * freqLoc;

    var n: f32 = noise3D(samplePos);
    if (params.turbulence == 1u) {
      n = abs(n);
    }

    sum += n * amp;

    freqLoc *= params.lacunarity;
    amp *= params.gain;
    angle += ANGLE_INCREMENT;
  }

  if (params.turbulence == 1u) {
    sum = sum - 1.0;
  }

  return sum;
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D Perlin FBM \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generatePerlin4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z) / zoom;
  } else {
    base = vec4<f32>(
      pos.x / zoom + params.xShift,
      pos.y / zoom + params.yShift,
      pos.z / zoom + params.zShift,
      params.time
    );
  }

  var sum     : f32 = 0.0;
  var amp     : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle   : f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    var n = noise4D(base * freqLoc) * amp;
    if (params.turbulence == 1u) { n = abs(n); }
    sum += n;

    freqLoc *= params.lacunarity;
    amp     *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let s = sin(angle);
      let xy = vec2<f32>( base.x * c - base.y * s, base.x * s + base.y * c );
      let zw = vec2<f32>( base.z * c - base.w * s, base.z * s + base.w * c );
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  if (params.turbulence == 1u) { sum -= 1.0; }
  return sum;
}


fn generateTerraceNoise(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let base = generatePerlin(pos, par);
    let v = terrace(base, par.terraceStep);
    return v;
}

fn generateFoamNoise(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let base = generateBillow(pos, par);
    let v = foamify(base);
    return v;
}

fn generateTurbulence(pos: vec3<f32>, par: NoiseParams) -> f32 {
    let base = generatePerlin(pos, par);
    let v = turbulence(base);
    return v;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Billow Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateBillow(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var p = pos / zoom + vec3<f32>(params.xShift, params.yShift, params.zShift);

    var sum: f32     = 0.0;
    var amp: f32     = 1.0;
    var freqLoc: f32 = max(params.freq, 1e-6);
    var ampSum: f32  = 0.0;
    var angle: f32   = params.seedAngle;

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        let n  = noise3D(p * freqLoc);
        let b  = pow(abs(n), 0.75);
        sum    = sum + b * amp;
        ampSum = ampSum + amp;

        freqLoc = freqLoc * params.lacunarity;
        amp     = amp     * params.gain;

        let c  = cos(angle);
        let s  = sin(angle);
        let xy = vec2<f32>(p.x, p.y);
        let r  = vec2<f32>(xy.x * c - xy.y * s, xy.x * s + xy.y * c);
        p = vec3<f32>(r.x, r.y, p.z + 0.03125);

        angle = angle + ANGLE_INCREMENT;
    }

    if (ampSum > 0.0) {
        sum = sum / ampSum;
    }

    let k: f32 = 1.2;
    let cMid   = sum - 0.5;
    let shaped = 0.5 + cMid * k / (1.0 + abs(cMid) * (k - 1.0));

    return clamp(shaped, 0.0, 1.0);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti-Billow Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateAntiBillow(pos: vec3<f32>, params: NoiseParams) -> f32 {
    return 1.0 - generateBillow(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Ridge Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// basic ridge transform of gradient noise
fn ridgeNoise(pos : vec3<f32>) -> f32 {
    let v = noise3D(pos);
    let w = 1.0 - abs(v);
    return w * w;
}

// octave\u2010sum generator using ridge noise
// sample like: let r = generateRidge(vec3<f32>(x,y,z));
fn generateRidge(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var sum     : f32 = 0.0;
    var amp     : f32 = 1.0;
    var freqLoc : f32 = max(params.freq, 1e-6);

    for (var i : u32 = 0u; i < params.octaves; i = i + 1u) {
        sum = sum + ridgeNoise(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)) * amp;
        freqLoc = freqLoc * params.lacunarity;
        amp     = amp     * params.gain;
        x = x + params.xShift;
        y = y + params.yShift;
        z = z + params.zShift;
    }

    sum = sum - 1.0;
    return -sum;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti\u2010Ridge Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// identical ridge transform, but flips sign at output
fn generateAntiRidge(pos : vec3<f32>, params:NoiseParams) -> f32 {
    // reuse generateRidge and negate its result
    return -generateRidge(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Ridged Multifractal Noise (Fast Lanczos) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateRidgedMultifractal(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var freqLoc : f32 = max(params.freq, 1e-6);

    var sum : f32 = 1.0 - abs(lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)));
    var amp : f32 = 1.0;

    for (var i:u32 = 1u; i < params.octaves; i = i + 1u) {
        freqLoc = freqLoc * params.lacunarity;
        amp = amp * params.gain;

        var n : f32 = abs(lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)));
        if (params.exp2 != 0.0) {
            n = 1.0 - pow(n, params.exp2);
        }
        if (params.exp1 != 0.0) {
            n = pow(n, params.exp1);
        }

        sum = sum - n * amp;

        x = x + params.xShift;
        y = y + params.yShift;
        z = z + params.zShift;
    }

    return sum;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Ridged Multifractal Noise 2 (Fast Lanczos + Rotation) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateRidgedMultifractal2(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var x = (pos.x + params.xShift) / zoom;
    var y = (pos.y + params.yShift) / zoom;
    var z = (pos.z + params.zShift) / zoom;

    var freqLoc : f32 = max(params.freq, 1e-6);
    var sum : f32 = 1.0 - abs(lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)));
    var amp : f32 = 1.0;
    var angle : f32 = params.seedAngle;

    for (var i:u32 = 1u; i < params.octaves; i = i + 1u) {
        freqLoc = freqLoc * params.lacunarity;
        amp = amp * params.gain;

        var n : f32 = abs(lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)));
        if (params.exp2 != 0.0) {
            n = 1.0 - pow(n, params.exp2);
        }
        if (params.exp1 != 0.0) {
            n = pow(n, params.exp1);
        }

        sum = sum - n * amp;

        let c = cos(angle);
        let s = sin(angle);
        let nx = x * c - y * s;
        let ny = x * s + y * c;
        let nz = z;

        x = nx + params.xShift;
        y = ny + params.yShift;
        z = nz + params.zShift;

        angle = angle + ANGLE_INCREMENT;
    }

    return sum;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Ridged Multifractal Noise 3 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateRidgedMultifractal3(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var x = (pos.x + params.xShift) / zoom;
    var y = (pos.y + params.yShift) / zoom;
    var z = (pos.z + params.zShift) / zoom;
    var sum : f32 = 0.0;
    var amp : f32 = 1.0;
    var freqLoc : f32 = max(params.freq, 1e-6);

    for (var i:u32 = 0u; i < params.octaves; i = i + 1u) {
        var n : f32 = lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc));
        n = max(1e-7, n + 1.0);
        n = 2.0 * pow(n * 0.5, params.exp2 + 1.5) - 1.0;
        n = 1.0 - abs(n);
        if (params.exp1 - 1.0 != 0.0) {
            n = 1.0 - pow(n, params.exp1 - 1.0);
        }

        sum = sum + n * amp;

        freqLoc = freqLoc * params.lacunarity;
        x = x + params.xShift;
        y = y + params.yShift;
        z = z + params.zShift;
        amp = amp * params.gain;
    }

    return sum - 1.0;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Ridged Multifractal Noise 4 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateRidgedMultifractal4(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);

    var x = (pos.x + params.xShift) / zoom;
    var y = (pos.y + params.yShift) / zoom;
    var z = (pos.z + params.zShift) / zoom;
    var sum : f32 = 0.0;
    var amp : f32 = 1.0;
    var freqLoc : f32 = max(params.freq, 1e-6);

    for (var i:u32 = 0u; i < params.octaves; i = i + 1u) {
        var n : f32 = abs(lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)));
        if (params.exp2 != 0.0) {
            n = 1.0 - pow(n, params.exp2);
        }
        if (params.exp1 != 0.0) {
            n = pow(n, params.exp1);
        }

        sum = sum + n * amp;

        freqLoc = freqLoc * params.lacunarity;
        x = x + params.xShift;
        y = y + params.yShift;
        z = z + params.zShift;
        amp = amp * params.gain;
    }

    return 1.0 - sum;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti\u2010Ridged Multifractal Noise \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateAntiRidgedMultifractal(pos : vec3<f32>, params:NoiseParams) -> f32 {
    return -generateRidgedMultifractal(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti\u2010Ridged Multifractal Noise 2 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateAntiRidgedMultifractal2(pos : vec3<f32>, params:NoiseParams) -> f32 {
    return -generateRidgedMultifractal2(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti\u2010Ridged Multifractal Noise 3 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateAntiRidgedMultifractal3(pos : vec3<f32>, params:NoiseParams) -> f32 {
    return -generateRidgedMultifractal3(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Anti\u2010Ridged Multifractal Noise 4 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateAntiRidgedMultifractal4(pos : vec3<f32>, params:NoiseParams) -> f32 {
    return -generateRidgedMultifractal4(pos, params);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Fractal Brownian Motion (3D Simplex) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500

// 3-D FBM helper: sums octaves of simplex noise with rotating shifts
fn fbm3D(pos : vec3<f32>, params:NoiseParams) -> f32 {
    // apply zoom
    var x       = (pos.x + params.xShift) / params.zoom;
    var y       = (pos.y + params.yShift) / params.zoom;
    var z       = (pos.z + params.zShift) / params.zoom;
    var sum       : f32 = 0.0;
    var amplitude : f32 = 1.0;
    var maxValue  : f32 = 0.0;
    var freqLoc   : f32 = max(params.freq, 1e-6);
    // start angle from uniform seedAngle
    var angle     : f32 = params.seedAngle;
    let angleInc  : f32 = 2.0 * PI / f32(params.octaves);

    for (var i : u32 = 0u; i < params.octaves; i = i + 1u) {
        // accumulate weighted noise
        sum = sum + amplitude * simplex3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc));
        maxValue = maxValue + amplitude;

        // next freq & amp
        freqLoc   = freqLoc * params.lacunarity;
        amplitude = amplitude * params.gain;

        // advance rotation
        angle = angle + angleInc;
        let offX = params.xShift * cos(angle);
        let offY = params.yShift * cos(angle);
        let offZ = params.zShift * cos(angle);

        // apply shift
        x = x + offX;
        y = y + offY;
        z = z + offZ;
    }
    // normalize
    return sum / maxValue;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 FBM Generator #1 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// two\u2010stage fbm, then doubled
fn generateFBM(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let fbm1 = fbm3D(pos, params);
    let fbm2 = fbm3D(vec3<f32>(fbm1, fbm1, fbm1), params);
    return 2.0 * fbm2;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 FBM Generator #2 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// chained fbm with scaling by zoom
fn generateFBM2(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let fbm1 = fbm3D(pos, params);
    let s    = params.zoom;
    let fbm2 = fbm3D(vec3<f32>(fbm1 * s, fbm1 * s, fbm1 * s), params);
    let fbm3 = fbm3D(vec3<f32>(pos.x + fbm2 * s,
                               pos.y + fbm2 * s,
                               pos.z + fbm2 * s), params);
    return 2.0 * fbm3;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 FBM Generator #3 \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// three\u2010step chaining of fbm with offset
fn generateFBM3(pos : vec3<f32>, params:NoiseParams) -> f32 {
    let fbm1 = fbm3D(pos, params);
    let s    = params.zoom;
    let fbm2 = fbm3D(vec3<f32>(pos.x + fbm1 * s,
                               pos.y + fbm1 * s,
                               pos.z + fbm1 * s), params);
    let fbm3 = fbm3D(vec3<f32>(pos.x + fbm2 * s,
                               pos.y + fbm2 * s,
                               pos.z + fbm2 * s), params);
    return 2.0 * fbm3;
}

/*==============================================================================
  Cellular Brownian-Motion FBM helpers & generators
==============================================================================*/

fn edgeCut(val: f32, threshold: f32) -> f32 {
  // return 0.0 when val < threshold, otherwise return val
  return select(val, 0.0, val < threshold);
}

// 3-D Cellular FBM helper: sums octaves of cellular3D with rotating shifts
fn fbmCellular3D(pos : vec3<f32>, params : NoiseParams) -> f32 {
    var x = (pos.x + params.xShift) / params.zoom;
    var y = (pos.y + params.yShift) / params.zoom;
    var z = (pos.z + params.zShift) / params.zoom;

    var sum     : f32 = 0.0;
    var amp     : f32 = 1.0;
    var freqLoc : f32 = max(params.freq, 1e-6);

    var angle   : f32 = params.seedAngle;
    let angleInc: f32 = 2.0 * PI / f32(params.octaves);

    for (var i : u32 = 0u; i < params.octaves; i = i + 1u) {
        let n = edgeCut(cellular3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc)),
                        params.threshold);
        sum = sum + amp * n;

        freqLoc = freqLoc * params.lacunarity;
        amp     = amp     * params.gain;

        angle = angle + angleInc;
        let offX = params.xShift * cos(angle);
        let offY = params.yShift * cos(angle);
        let offZ = params.zShift * cos(angle);

        x = x + offX;
        y = y + offY;
        z = z + offZ;
    }
    return sum;
}

/* ---- Three cellular FBM flavours ---------------------------------------- */
fn generateCellularBM1(pos : vec3<f32>, params : NoiseParams) -> f32 {
    let f1 = fbmCellular3D(pos, params);
    let f2 = fbmCellular3D(vec3<f32>(f1 * params.zoom), params);
    return 1.5 * f2 - 1.0;
}

fn generateCellularBM2(pos : vec3<f32>, params : NoiseParams) -> f32 {
    let f1 = fbmCellular3D(pos, params);
    let f2 = fbmCellular3D(vec3<f32>(f1 * params.zoom), params);
    let f3 = fbmCellular3D(vec3<f32>(pos + f2 * params.zoom), params);
    return 1.5 * f3 - 1.0;
}

fn generateCellularBM3(pos : vec3<f32>, params : NoiseParams) -> f32 {
    let f1 = fbmCellular3D(pos, params);
    let f2 = fbmCellular3D(vec3<f32>(pos + f1 * params.zoom), params);
    let f3 = fbmCellular3D(vec3<f32>(pos + f2 * params.zoom), params);
    return 1.5 * f3 - 1.0;
}

/* ---- Voronoi and Voronoi Brownian-Motion flavours ---------------------------------- */

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D Voronoi Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateVoronoi4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var freqLoc: f32 = max(params.freq, 1e-6);

  let mode: u32 = params.voroMode;
  let edgeK: f32 = max(params.edgeK, 0.0);
  let threshold: f32 = max(params.threshold, 0.0);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z + params.time);
  } else {
    base = vec4<f32>(
      (pos.x + params.xShift) / zoom,
      (pos.y + params.yShift) / zoom,
      (pos.z + params.zShift) / zoom,
      params.time
    );
  }

  var angle: f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let P = base * freqLoc;
    let m = voro4D_metrics(P);
    let v = voro_eval(m.f1Sq, m.f2Sq, m.cellVal, mode, edgeK, threshold, freqLoc);

    sum += v * amp;

    freqLoc *= params.lacunarity;
    amp *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let s = sin(angle);
      let xy = vec2<f32>(base.x * c - base.y * s, base.x * s + base.y * c);
      let zw = vec2<f32>(base.z * c - base.w * s, base.z * s + base.w * c);
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  return sum;
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Voronoi Tile Noise (Edge-Aware) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateVoronoiTileNoise(pos : vec3<f32>, params:NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);
  var sum   : f32 = 0.0;
  var amp   : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);

  let mode : u32 = params.voroMode;
  let edgeK : f32 = max(params.edgeK, 0.0);
  let thresh : f32 = max(params.threshold, 0.0);

  var x = (pos.x + params.xShift) / zoom;
  var y = (pos.y + params.yShift) / zoom;
  var z = (pos.z + params.zShift) / zoom;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let P = vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc);
    let m = voro3D_metrics(P);
    let v = voro_eval(m.f1Sq, m.f2Sq, m.cellVal, mode, edgeK, thresh, freqLoc);

    sum = sum + v * amp;

    freqLoc = freqLoc * params.lacunarity;
    amp     = amp * params.gain;

    x = x + params.xShift;
    y = y + params.yShift;
    z = z + params.zShift;
  }

  return sum;
}


// BM1: f( f(p) )
fn generateVoronoiBM1(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoiTileNoise(p, par);
  return generateVoronoiTileNoise(vec3<f32>(f1 * par.zoom), par);
}

// BM2: f( p + f(f(p)) )
fn generateVoronoiBM2(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoiTileNoise(p, par);
  let f2 = generateVoronoiTileNoise(vec3<f32>(f1 * par.zoom), par);
  return generateVoronoiTileNoise(p + vec3<f32>(f2 * par.zoom), par);
}

// BM3: f( p + f(p + f(p)) )
fn generateVoronoiBM3(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoiTileNoise(p, par);
  let f2 = generateVoronoiTileNoise(p + vec3<f32>(f1 * par.zoom), par);
  return generateVoronoiTileNoise(p + vec3<f32>(f2 * par.zoom), par);
}

/* ---- Voronoi Brownian-Motion flavours (4D) ---------------------------------- */

// BM1 4D: f( f(p) )  (scalar feedback into XYZ, keep W/time from params)
fn generateVoronoiBM1_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoi4D(p, par);
  return generateVoronoi4D(vec3<f32>(f1 * par.zoom), par);
}

// BM2 4D: f( p + f(f(p)) )
fn generateVoronoiBM2_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoi4D(p, par);
  let f2 = generateVoronoi4D(vec3<f32>(f1 * par.zoom), par);
  return generateVoronoi4D(p + vec3<f32>(f2 * par.zoom), par);
}

// BM3 4D: f( p + f(p + f(p)) )
fn generateVoronoiBM3_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateVoronoi4D(p, par);
  let f2 = generateVoronoi4D(p + vec3<f32>(f1 * par.zoom), par);
  return generateVoronoi4D(p + vec3<f32>(f2 * par.zoom), par);
}

/* ---- vector-feedback variants (stronger, less axis-locked) ---------
   These keep it cheap but reduce the "all axes get same scalar" look by building
   a 3-vector from 3 decorrelated samples (offsets are constant, no extra params).
*/

fn _bm4D_vec(p: vec3<f32>, par: NoiseParams) -> vec3<f32> {
  let a = generateVoronoi4D(p + vec3<f32>(17.13,  3.71,  9.23), par);
  let b = generateVoronoi4D(p + vec3<f32>(-5.41, 11.19,  2.07), par);
  let c = generateVoronoi4D(p + vec3<f32>( 8.09, -6.77, 13.61), par);
  return vec3<f32>(a, b, c);
}

// BM1 4D (vec): f( vec(f(p)) )
fn generateVoronoiBM1_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec(p, par);
  return generateVoronoi4D(v1 * par.zoom, par);
}

// BM2 4D (vec): f( p + vec(f(vec(f(p)))) )
fn generateVoronoiBM2_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec(p, par);
  let v2 = _bm4D_vec(v1 * par.zoom, par);
  return generateVoronoi4D(p + v2 * par.zoom, par);
}

// BM3 4D (vec): f( p + vec(f(p + vec(f(p)))) )
fn generateVoronoiBM3_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec(p, par);
  let v2 = _bm4D_vec(p + v1 * par.zoom, par);
  return generateVoronoi4D(p + v2 * par.zoom, par);
}

// Generic "Voronoi-style" sampler for Cellular/Worley so they can share voro_eval modes.

struct VoroSample {
  f1Sq    : f32,
  f2Sq    : f32,
  cellVal : f32,
};

fn voro_sample3D(p: vec3<f32>) -> VoroSample {
  let fx = i32(floor(p.x));
  let fy = i32(floor(p.y));
  let fz = i32(floor(p.z));

  var d1: f32 = 1e9;
  var d2: f32 = 1e9;
  var cv: f32 = 0.0;

  for (var dz: i32 = -1; dz <= 1; dz = dz + 1) {
    for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
      for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
        let xi = fx + dx;
        let yi = fy + dy;
        let zi = fz + dz;

        let rx = rand3u(xi, yi, zi);
        let ry = rand3u(yi, zi, xi);
        let rz = rand3u(zi, xi, yi);

        let px = f32(xi) + rx;
        let py = f32(yi) + ry;
        let pz = f32(zi) + rz;

        let dxv = px - p.x;
        let dyv = py - p.y;
        let dzv = pz - p.z;
        let dd  = dxv * dxv + dyv * dyv + dzv * dzv;

        if (dd < d1) {
          d2 = d1;
          d1 = dd;
          cv = rand3u(xi, zi, yi);
        } else if (dd < d2) {
          d2 = dd;
        }
      }
    }
  }

  return VoroSample(d1, d2, cv);
}

fn voro_sample4D(p: vec4<f32>) -> VoroSample {
  let fx = i32(floor(p.x));
  let fy = i32(floor(p.y));
  let fz = i32(floor(p.z));
  let fw = i32(floor(p.w));

  var d1: f32 = 1e9;
  var d2: f32 = 1e9;
  var cv: f32 = 0.0;

  for (var dw: i32 = -1; dw <= 1; dw = dw + 1) {
    for (var dz: i32 = -1; dz <= 1; dz = dz + 1) {
      for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
        for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
          let xi = fx + dx;
          let yi = fy + dy;
          let zi = fz + dz;
          let wi = fw + dw;

          let rx = rand4u(xi, yi, zi, wi);
          let ry = rand4u(yi, zi, wi, xi);
          let rz = rand4u(zi, wi, xi, yi);
          let rw = rand4u(wi, xi, yi, zi);

          let px = f32(xi) + rx;
          let py = f32(yi) + ry;
          let pz = f32(zi) + rz;
          let pw = f32(wi) + rw;

          let dxv = px - p.x;
          let dyv = py - p.y;
          let dzv = pz - p.z;
          let dwv = pw - p.w;
          let dd  = dxv * dxv + dyv * dyv + dzv * dzv + dwv * dwv;

          if (dd < d1) {
            d2 = d1;
            d1 = dd;
            cv = rand4u(xi, zi, yi, wi);
          } else if (dd < d2) {
            d2 = dd;
          }
        }
      }
    }
  }

  return VoroSample(d1, d2, cv);
}

fn cellular4D(p: vec4<f32>) -> f32 {
  let s = voro_sample4D(p);
  return voro_edge_dist(s.f1Sq, s.f2Sq);
}

fn worley4D(p: vec4<f32>) -> f32 {
  let s = voro_sample4D(p);
  return sqrt(max(s.f1Sq, 0.0));
}

// Expects you to pass the same controls you use for Voronoi: params.voroMode, params.edgeK, params.threshold.
fn generateCellular(pos: vec3<f32>, params: NoiseParams) -> f32 {
  var x = (pos.x + params.xShift) / params.zoom;
  var y = (pos.y + params.yShift) / params.zoom;
  var z = (pos.z + params.zShift) / params.zoom;

  var sum     : f32 = 0.0;
  var amp     : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle   : f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let s = voro_sample3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc));

    var n = voro_eval(s.f1Sq, s.f2Sq, s.cellVal, params.voroMode, params.edgeK, params.threshold, freqLoc);
    if (params.turbulence == 1u) { n = abs(n); }
    n = clamp(n, 0.0, 1.0);

    sum = sum + n * amp;

    freqLoc = freqLoc * params.lacunarity;
    amp     = amp     * params.gain;

    let c = cos(angle);
    let sA = sin(angle);
    let nx = x * c - y * sA;
    let ny = x * sA + y * c;
    let nz = y * sA + z * c;

    x = nx + params.xShift;
    y = ny + params.yShift;
    z = nz + params.zShift;
    angle = angle + ANGLE_INCREMENT;
  }

  if (params.turbulence == 1u) { sum = sum - 1.0; }
  return 2.0 * sum - 1.0;
}

fn generateAntiCellular(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return -generateCellular(pos,params);
}

fn generateWorley(pos: vec3<f32>, params: NoiseParams) -> f32 {
  var x = (pos.x + params.xShift) / params.zoom;
  var y = (pos.y + params.yShift) / params.zoom;
  var z = (pos.z + params.zShift) / params.zoom;

  var sum     : f32 = 0.0;
  var amp     : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle   : f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let s = voro_sample3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc));

    var n = voro_eval(s.f1Sq, s.f2Sq, s.cellVal, params.voroMode, params.edgeK, params.threshold, freqLoc);
    if (params.turbulence == 1u) { n = abs(n); }
    n = clamp(n, 0.0, 1.0);

    sum = sum + n * amp;

    freqLoc = freqLoc * params.lacunarity;
    amp     = amp     * params.gain;

    let c = cos(angle);
    let sA = sin(angle);
    let nx = x * c - y * sA;
    let ny = x * sA + y * c;
    let nz = y * sA + z * c;

    x = nx + params.xShift;
    y = ny + params.yShift;
    z = nz + params.zShift;
    angle = angle + ANGLE_INCREMENT;
  }

  if (params.turbulence == 1u) { sum = sum - 1.0; }
  return sum - 1.0;
}

fn generateAntiWorley(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return -generateWorley(pos,params);
}

fn generateCellular4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z) / zoom;
  } else {
    base = vec4<f32>(
      pos.x / zoom + params.xShift,
      pos.y / zoom + params.yShift,
      pos.z / zoom + params.zShift,
      params.time
    );
  }

  var sum     : f32 = 0.0;
  var amp     : f32 = 1.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle   : f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let s = voro_sample4D(base * freqLoc);

    var v = voro_eval(s.f1Sq, s.f2Sq, s.cellVal, params.voroMode, params.edgeK, params.threshold, freqLoc);
    if (params.turbulence == 1u) { v = abs(v); }
    v = clamp(v, 0.0, 1.0);

    sum += v * amp;

    freqLoc *= params.lacunarity;
    amp     *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let sA = sin(angle);
      let xy = vec2<f32>( base.x * c - base.y * sA, base.x * sA + base.y * c );
      let zw = vec2<f32>( base.z * c - base.w * sA, base.z * sA + base.w * c );
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  if (params.turbulence == 1u) { sum -= 1.0; }
  return 2.0 * sum - 1.0;
}

fn generateAntiCellular4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return -generateCellular4D(pos,params);
}

fn generateWorley4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z) / zoom;
  } else {
    base = vec4<f32>(
      pos.x / zoom + params.xShift,
      pos.y / zoom + params.yShift,
      pos.z / zoom + params.zShift,
      params.time
    );
  }

  var sum    : f32 = 0.0;
  var amp    : f32 = 1.0;
  var ampSum : f32 = 0.0;
  var freqLoc : f32 = max(params.freq, 1e-6);
  var angle  : f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let s = voro_sample4D(base * freqLoc);

    var v = voro_eval(s.f1Sq, s.f2Sq, s.cellVal, params.voroMode, params.edgeK, params.threshold, freqLoc);
    if (params.turbulence == 1u) { v = abs(v); }
    v = clamp(v, 0.0, 1.0);

    sum    += v * amp;
    ampSum += amp;

    freqLoc *= params.lacunarity;
    amp     *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let sA = sin(angle);
      let xy = vec2<f32>( base.x * c - base.y * sA, base.x * sA + base.y * c );
      let zw = vec2<f32>( base.z * c - base.w * sA, base.z * sA + base.w * c );
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  let out = select(0.0, sum / ampSum, ampSum > 0.0);

  if (params.turbulence == 1u) { return clamp(out - 1.0, -1.0, 1.0); }
  return clamp(1.0 - out, 0.0, 1.0);
}

fn generateAntiWorley4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return 1-generateWorley4D(pos,params);
}

/* ---- Cellular Brownian-Motion flavours (4D) ---------------------------------- */

// BM1 4D: f( f(p) )
fn generateCellularBM1_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateCellular4D(p, par);
  return generateCellular4D(vec3<f32>(f1 * par.zoom), par);
}

// BM2 4D: f( p + f(f(p)) )
fn generateCellularBM2_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateCellular4D(p, par);
  let f2 = generateCellular4D(vec3<f32>(f1 * par.zoom), par);
  return generateCellular4D(p + vec3<f32>(f2 * par.zoom), par);
}

// BM3 4D: f( p + f(p + f(p)) )
fn generateCellularBM3_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateCellular4D(p, par);
  let f2 = generateCellular4D(p + vec3<f32>(f1 * par.zoom), par);
  return generateCellular4D(p + vec3<f32>(f2 * par.zoom), par);
}


/* ---- Worley Brownian-Motion flavours (4D) ----------------------------------- */

// BM1 4D: f( f(p) )
fn generateWorleyBM1_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateWorley4D(p, par);
  return generateWorley4D(vec3<f32>(f1 * par.zoom), par);
}

// BM2 4D: f( p + f(f(p)) )
fn generateWorleyBM2_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateWorley4D(p, par);
  let f2 = generateWorley4D(vec3<f32>(f1 * par.zoom), par);
  return generateWorley4D(p + vec3<f32>(f2 * par.zoom), par);
}

// BM3 4D: f( p + f(p + f(p)) )
fn generateWorleyBM3_4D(p: vec3<f32>, par: NoiseParams) -> f32 {
  let f1 = generateWorley4D(p, par);
  let f2 = generateWorley4D(p + vec3<f32>(f1 * par.zoom), par);
  return generateWorley4D(p + vec3<f32>(f2 * par.zoom), par);
}


/* ---- vector-feedback variants (stronger, less axis-locked) ------------------ */

fn _bm4D_vec_cellular(p: vec3<f32>, par: NoiseParams) -> vec3<f32> {
  let a = generateCellular4D(p + vec3<f32>(17.13,  3.71,  9.23), par);
  let b = generateCellular4D(p + vec3<f32>(-5.41, 11.19,  2.07), par);
  let c = generateCellular4D(p + vec3<f32>( 8.09, -6.77, 13.61), par);
  return vec3<f32>(a, b, c);
}

fn _bm4D_vec_worley(p: vec3<f32>, par: NoiseParams) -> vec3<f32> {
  let a = generateWorley4D(p + vec3<f32>(17.13,  3.71,  9.23), par);
  let b = generateWorley4D(p + vec3<f32>(-5.41, 11.19,  2.07), par);
  let c = generateWorley4D(p + vec3<f32>( 8.09, -6.77, 13.61), par);
  return vec3<f32>(a, b, c);
}


// BM1 4D (vec): f( vec(f(p)) )
fn generateCellularBM1_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_cellular(p, par);
  return generateCellular4D(v1 * par.zoom, par);
}

// BM2 4D (vec): f( p + vec(f(vec(f(p)))) )
fn generateCellularBM2_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_cellular(p, par);
  let v2 = _bm4D_vec_cellular(v1 * par.zoom, par);
  return generateCellular4D(p + v2 * par.zoom, par);
}

// BM3 4D (vec): f( p + vec(f(p + vec(f(p)))) )
fn generateCellularBM3_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_cellular(p, par);
  let v2 = _bm4D_vec_cellular(p + v1 * par.zoom, par);
  return generateCellular4D(p + v2 * par.zoom, par);
}


// BM1 4D (vec): f( vec(f(p)) )
fn generateWorleyBM1_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_worley(p, par);
  return generateWorley4D(v1 * par.zoom, par);
}

// BM2 4D (vec): f( p + vec(f(vec(f(p)))) )
fn generateWorleyBM2_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_worley(p, par);
  let v2 = _bm4D_vec_worley(v1 * par.zoom, par);
  return generateWorley4D(p + v2 * par.zoom, par);
}

// BM3 4D (vec): f( p + vec(f(p + vec(f(p)))) )
fn generateWorleyBM3_4D_vec(p: vec3<f32>, par: NoiseParams) -> f32 {
  let v1 = _bm4D_vec_worley(p, par);
  let v2 = _bm4D_vec_worley(p + v1 * par.zoom, par);
  return generateWorley4D(p + v2 * par.zoom, par);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D Billow Noise Generator \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateBillow4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z + params.time) / zoom;
  } else {
    base = vec4<f32>(
      pos.x / zoom + params.xShift,
      pos.y / zoom + params.yShift,
      pos.z / zoom + params.zShift,
      params.time
    );
  }

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var freqLoc: f32 = max(params.freq, 1e-6);
  var ampSum: f32 = 0.0;
  var angle: f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let n = noise4D(base * freqLoc);
    let b = pow(abs(n), 0.75);
    sum += b * amp;
    ampSum += amp;

    freqLoc *= params.lacunarity;
    amp *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let s = sin(angle);
      let xy = vec2<f32>(base.x * c - base.y * s, base.x * s + base.y * c);
      let zw = vec2<f32>(base.z * c - base.w * s, base.z * s + base.w * c);
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  if (ampSum > 0.0) { sum /= ampSum; }

  let k: f32 = 1.2;
  let cMid = sum - 0.5;
  let shaped = 0.5 + cMid * k / (1.0 + abs(cMid) * (k - 1.0));

  return clamp(shaped, 0.0, 1.0);
}

fn generateAntiBillow4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return 1.0 - generateBillow4D(pos, params);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D Terrace + Foam + Turbulence \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateTerraceNoise4D(pos: vec3<f32>, par: NoiseParams) -> f32 {
  let base = generatePerlin4D(pos, par);
  return terrace(base, par.terraceStep);
}

fn generateFoamNoise4D(pos: vec3<f32>, par: NoiseParams) -> f32 {
  let base = generateBillow4D(pos, par);
  return foamify(base);
}

fn generateTurbulence4D(pos: vec3<f32>, par: NoiseParams) -> f32 {
  let base = generatePerlin4D(pos, par);
  return turbulence(base);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D "Lanczos-like" Lowpass \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn lowpass4D(p: vec4<f32>) -> f32 {
  let o = vec4<f32>(0.37, 0.21, 0.29, 0.31);
  let a = noise4D(p);
  let b = noise4D(p + vec4<f32>(o.x, 0.0, 0.0, 0.0));
  let c = noise4D(p + vec4<f32>(0.0, o.y, 0.0, 0.0));
  let d = noise4D(p + vec4<f32>(0.0, 0.0, o.z, 0.0));
  let e = noise4D(p + vec4<f32>(0.0, 0.0, 0.0, o.w));
  return (a + b + c + d + e) * 0.2;
}

fn generateLanczosBillow4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  var base: vec4<f32>;
  if (params.toroidal == 1u) {
    base = packPeriodicUV(pos.x, pos.y, pos.z + params.time) / zoom;
  } else {
    base = vec4<f32>(
      pos.x / zoom + params.xShift,
      pos.y / zoom + params.yShift,
      pos.z / zoom + params.zShift,
      params.time
    );
  }

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var ampSum: f32 = 0.0;
  var freqLoc: f32 = max(params.freq, 1e-6);
  var angle: f32 = params.seedAngle;

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    let n = lowpass4D(base * freqLoc);
    let b = pow(abs(n), 0.75);
    sum += b * amp;
    ampSum += amp;

    freqLoc *= params.lacunarity;
    amp *= params.gain;

    if (params.toroidal != 1u) {
      let c = cos(angle);
      let s = sin(angle);
      let xy = vec2<f32>(base.x * c - base.y * s, base.x * s + base.y * c);
      let zw = vec2<f32>(base.z * c - base.w * s, base.z * s + base.w * c);
      base = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
      angle += ANGLE_INCREMENT;
    }
  }

  if (ampSum > 0.0) { sum /= ampSum; }

  let k: f32 = 1.2;
  let cMid = sum - 0.5;
  let shaped = 0.5 + cMid * k / (1.0 + abs(cMid) * (k - 1.0));

  return clamp(shaped, 0.0, 1.0);
}

fn generateLanczosAntiBillow4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  return 1.0 - generateLanczosBillow4D(pos, params);
}



// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 4D FBM core + generators \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn fbm4D_core(base: vec4<f32>, params: NoiseParams) -> f32 {
  var p = base;

  var sum: f32 = 0.0;
  var amp: f32 = 1.0;
  var maxAmp: f32 = 0.0;
  var freqLoc: f32 = max(params.freq, 1e-6);

  var angle: f32 = params.seedAngle;
  let angleInc: f32 = 2.0 * PI / max(f32(params.octaves), 1.0);

  for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
    sum += amp * noise4D(p * freqLoc);
    maxAmp += amp;

    freqLoc *= params.lacunarity;
    amp *= params.gain;

    if (params.toroidal != 1u) {
      angle += angleInc;
      let c = cos(angle);
      let s = sin(angle);
      let xy = vec2<f32>(p.x * c - p.y * s, p.x * s + p.y * c);
      let zw = vec2<f32>(p.z * c - p.w * s, p.z * s + p.w * c);
      p = vec4<f32>(
        xy.x + params.xShift,
        xy.y + params.yShift,
        zw.x + params.zShift,
        zw.y + params.time
      );
    }
  }

  return select(0.0, sum / maxAmp, maxAmp > 0.0);
}

fn fbm4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let zoom = max(params.zoom, 1e-6);

  if (params.toroidal == 1u) {
    let base = packPeriodicUV(pos.x, pos.y, pos.z + params.time) / zoom;
    return fbm4D_core(base, params);
  }

  let base = vec4<f32>(
    (pos.x + params.xShift) / zoom,
    (pos.y + params.yShift) / zoom,
    (pos.z + params.zShift) / zoom,
    params.time
  );
  return fbm4D_core(base, params);
}

fn generateFBM4D(pos: vec3<f32>, params: NoiseParams) -> f32 {
  let fbm1 = fbm4D(pos, params);
  let fbm2 = fbm4D_core(vec4<f32>(fbm1, fbm1, fbm1, fbm1), params);
  return 2.0 * fbm2;
}


/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500  Domain-warp FBM (4D)  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/

fn domainWarpFBM4D(p: vec3<f32>, params: NoiseParams, warpAmp: f32, stages: u32) -> f32 {
  var q = p;
  for (var i: u32 = 0u; i < stages; i = i + 1u) {
    let w = fbm4D(q, params) * warpAmp;
    q = q + vec3<f32>(w, w, w);
  }
  return fbm4D(q, params);
}

fn generateDomainWarpFBM1_4D(pos: vec3<f32>, par: NoiseParams) -> f32 {
  return domainWarpFBM4D(pos, par, par.warpAmp, 1u);
}

fn generateDomainWarpFBM2_4D(pos: vec3<f32>, par: NoiseParams) -> f32 {
  return domainWarpFBM4D(pos, par, par.warpAmp, 2u);
}

fn _warpVecFrom4D(p: vec3<f32>, par: NoiseParams) -> vec3<f32> {
  let a = fbm4D(p + vec3<f32>(17.13,  3.71,  9.23), par);
  let b = fbm4D(p + vec3<f32>(-5.41, 11.19,  2.07), par);
  let c = fbm4D(p + vec3<f32>( 8.09, -6.77, 13.61), par);
  return vec3<f32>(a, b, c);
}

fn domainWarpFBM4D_vec(p: vec3<f32>, params: NoiseParams, warpAmp: f32, stages: u32) -> f32 {
  var q = p;
  for (var i: u32 = 0u; i < stages; i = i + 1u) {
    let v = _warpVecFrom4D(q, params) * warpAmp;
    q = q + v;
  }
  return fbm4D(q, params);
}

fn generateDomainWarpFBM1_4D_vec(pos: vec3<f32>, par: NoiseParams) -> f32 {
  return domainWarpFBM4D_vec(pos, par, par.warpAmp, 1u);
}

fn generateDomainWarpFBM2_4D_vec(pos: vec3<f32>, par: NoiseParams) -> f32 {
  return domainWarpFBM4D_vec(pos, par, par.warpAmp, 2u);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Lanczos Billow Noise \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateLanczosBillow(pos : vec3<f32>, p : NoiseParams) -> f32 {
    var x       = (pos.x + p.xShift) / p.zoom;
    var y       = (pos.y + p.yShift) / p.zoom;
    var z       = (pos.z + p.zShift) / p.zoom;
    var sum     : f32 = 0.0;
    var maxAmp  : f32 = 0.0;
    var amp     : f32 = 1.0;
    var freqLoc : f32 = max(p.freq, 1e-6);
    var angle   : f32 = p.seedAngle;

    for (var i: u32 = 0u; i < p.octaves; i = i + 1u) {
        let n = lanczos3D(vec3<f32>(x * freqLoc, y * freqLoc, z * freqLoc));
        sum = sum + (2.0 * abs(n) - 1.0) * amp;
        maxAmp = maxAmp + amp;

        freqLoc = freqLoc * p.lacunarity;
        amp     = amp     * p.gain;

        // rotation around Z
        let c = cos(angle);
        let s = sin(angle);
        var newX = x * c - y * s;
        var newY = x * s + y * c;
        var newZ = z;

        // rotate in XZ plane
        let rX = newX * c + newZ * s;
        let rZ = -newX * s + newZ * c;
        newX = rX; newZ = rZ;

        // rotate in YZ plane
        let rY = newY * c - newZ * s;
        let rZ2 = newY * s + newZ * c;
        newY = rY; newZ = rZ2;

        // apply shift
        x = newX + p.xShift;
        y = newY + p.yShift;
        z = newZ + p.zShift;

        angle = angle + ANGLE_INCREMENT;
    }

    return sum / maxAmp;
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Lanczos Anti-Billow Noise \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn generateLanczosAntiBillow(pos : vec3<f32>, p : NoiseParams) -> f32 {
    return -generateLanczosBillow(pos, p);
}


// Raw Voronoi circle\u2010gradient cell value
fn voronoiCircleGradient(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let m = voro3D_metrics(pos);
    let minDist = sqrt(max(m.f1Sq, 0.0));
    let secondDist = sqrt(max(m.f2Sq, 0.0));

    let centerGrad = 1.0 - min(minDist, 1.0);
    let edgeDist = max(secondDist - minDist, 0.0);
    let edgeGrad = select(1.0, 0.0, edgeDist < params.threshold);
    let modeValue = voro_eval3D_metrics(m, params, max(params.freq, 1e-6));
    return select(modeValue, edgeGrad, params.voroMode == VORO_CELL) * centerGrad;
}

// Octaved generator matching your JS .generateNoise()
fn generateVoronoiCircleNoise(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var x       = pos.x / zoom + params.xShift;
    var y       = pos.y / zoom + params.yShift;
    var z       = pos.z / zoom + params.zShift;
    var total : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        let samplePos = vec3<f32>(x * freq, y * freq, z * freq);
        total = total + voronoiCircleGradient(samplePos, params) * amp;

        // next octave
        amp  = amp  * params.gain;
        freq = freq * params.lacunarity;
        x    = x + params.xShift;
        y    = y + params.yShift;
        z    = z + params.zShift;
    }

    // match JS: return \u2211noise \u2212 1.0
    return total - 1.0;
}




// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 distance helpers (add once) \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
fn euclideanDist(a: vec3<f32>, b: vec3<f32>) -> f32 {
  return length(a - b);
}
fn euclideanDistSq(a: vec3<f32>, b: vec3<f32>) -> f32 {
  let d = a - b;
  return dot(d, d);
}

fn euclideanDist2(a: vec2<f32>, b: vec2<f32>) -> f32 {
  return length(a - b);
}
fn euclideanDistSq2(a: vec2<f32>, b: vec2<f32>) -> f32 {
  let d = a - b;
  return dot(d, d);
}

fn euclideanDist4(a: vec4<f32>, b: vec4<f32>) -> f32 {
  return length(a - b);
}
fn euclideanDistSq4(a: vec4<f32>, b: vec4<f32>) -> f32 {
  let d = a - b;
  return dot(d, d);
}


// \u2500\u2500\u2500\u2500\u2500 1. Voronoi Circle\u2010Gradient Tile Noise 2 \u2500\u2500\u2500\u2500\u2500

fn voronoiCircleGradient2Raw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let m = voro3D_metrics(pos);
    let centerDist = sqrt(max(m.f1Sq, 0.0));
    let gradient = sin(centerDist * PI);
    let modeValue = voro_eval3D_metrics(m, params, max(params.freq, 1e-6));
    return select(modeValue, m.cellVal, params.voroMode == VORO_CELL) * gradient;
}

fn generateVoronoiCircle2(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var total : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);
    var angle     : f32 = params.seedAngle;
    let angleInc  : f32 = 2.0 * PI / max(f32(params.octaves), 1.0);

    for(var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        let samplePos = vec3<f32>(x * freq, y * freq, z * freq);
        total = total + voronoiCircleGradient2Raw(samplePos, params) * amp;
        amp   = amp * params.gain;
        freq  = freq * params.lacunarity;
        angle = angle + angleInc;
        x = x + params.xShift * cos(angle) + params.xShift;
        y = y + params.yShift * cos(angle) + params.yShift;
        z = z + params.zShift * cos(angle) + params.zShift;
    }
    return total - 1.0;
}

// \u2500\u2500\u2500\u2500\u2500 2. Voronoi Flat\u2010Shade Tile Noise \u2500\u2500\u2500\u2500\u2500

fn voronoiFlatShadeRaw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let fx : i32 = i32(floor(pos.x));
    let fy : i32 = i32(floor(pos.y));
    let fz : i32 = i32(floor(pos.z));
    var minDist    : f32 = 1e9;
    var secondDist : f32 = 1e9;

    for(var dz = -1; dz <= 1; dz = dz + 1) {
        for(var dy = -1; dy <= 1; dy = dy + 1) {
            for(var dx = -1; dx <= 1; dx = dx + 1) {
                let xi = fx + dx;
                let yi = fy + dy;
                let zi = fz + dz;
                let feature = vec3<f32>(f32(xi) + rand3u(xi, yi, zi),
                                        f32(yi) + rand3u(yi, zi, xi),
                                        f32(zi) + rand3u(zi, xi, yi));
                let d = euclideanDist(feature, pos);
                if(d < minDist) {
                    secondDist = minDist;
                    minDist    = d;
                } else if(d < secondDist) {
                    secondDist = d;
                }
            }
        }
    }
    let edgeDist = secondDist - minDist;
    return select(1.0, 0.0, edgeDist < params.threshold);
}

fn generateVoronoiFlatShade(posIn: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var pos = posIn / zoom + vec3<f32>(params.xShift, params.yShift, params.zShift);
    var total : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);
    for(var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        total = total + voronoiFlatShadeRaw(pos * freq, params) * amp;
        amp  = amp * params.gain;
        freq = freq * params.lacunarity;
        pos  = pos + vec3<f32>(params.xShift, params.yShift, params.zShift);
    }
    return total;
}

// \u2500\u2500\u2500\u2500\u2500 3. Voronoi Ripple 3D \u2500\u2500\u2500\u2500\u2500

fn voronoiRipple3DRaw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let m = voro3D_metrics(pos);
    let edgeDist = voro_edge_dist(m.f1Sq, m.f2Sq);
    let ripple = sin(PI + edgeDist * PI * params.rippleFreq + params.time);
    let rippleAmp = (1.0 + ripple) * 0.5;
    let modeValue = voro_eval3D_metrics(m, params, max(params.freq, 1e-6));
    return select(modeValue, m.cellVal, params.voroMode == VORO_CELL) * rippleAmp;
}

fn generateVoronoiRipple3D(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var total : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);
    for(var i: u32=0u; i<params.octaves; i=i+1u) {
        let sample = vec3<f32>(x * freq, y * freq, z * freq);
        total = total + voronoiRipple3DRaw(sample, params) * amp;
        amp   = amp * params.gain;
        freq  = freq * params.lacunarity;
        let angle = params.seedAngle * 2.0 * PI;
        x = x + params.xShift * cos(angle + f32(i));
        y = y + params.yShift * cos(angle + f32(i));
        z = z + params.zShift * cos(angle + f32(i));
    }
    return 2.0 * total - 1.0;
}


// \u2500\u2500\u2500\u2500\u2500 4. Voronoi Ripple 3D 2 \u2500\u2500\u2500\u2500\u2500
fn voronoiRipple3D2Raw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let m = voro3D_metrics(pos);
    let edgeDist = voro_edge_dist(m.f1Sq, m.f2Sq);
    let ripple = sin(PI + params.zoom * edgeDist * PI * params.rippleFreq + params.time);
    let rippleAmp = (1.0 + ripple) * 0.5;
    let modeValue = voro_eval3D_metrics(m, params, max(params.freq, 1e-6));
    return select(modeValue, m.cellVal, params.voroMode == VORO_CELL) * rippleAmp;
}

fn generateVoronoiRipple3D2(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var total: f32 = 0.0;
    var amp: f32 = 1.0;
    var freq: f32 = max(params.freq, 1e-6);

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        let sample = vec3<f32>(x * freq, y * freq, z * freq);
        total = total + voronoiRipple3D2Raw(sample, params) * amp;
        amp = amp * params.gain;
        freq = freq * params.lacunarity;
        let angle = params.seedAngle * 2.0 * PI;
        x = x + params.xShift * cos(angle + f32(i));
        y = y + params.yShift * cos(angle + f32(i));
        z = z + params.zShift * cos(angle + f32(i));
    }
    return 2.0 * total - 1.0;
}

// \u2500\u2500\u2500\u2500\u2500 5. Voronoi Circular Ripple 3D \u2500\u2500\u2500\u2500\u2500
fn voronoiCircularRippleRaw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let m = voro3D_metrics(pos);
    let minDist = sqrt(max(m.f1Sq, 0.0));
    let ripple = sin(PI + minDist * PI * params.rippleFreq + params.time);
    let rippleAmp = (1.0 + ripple) * 0.5;
    let modeValue = voro_eval3D_metrics(m, params, max(params.freq, 1e-6));
    return select(modeValue, m.cellVal, params.voroMode == VORO_CELL) * rippleAmp;
}

fn generateVoronoiCircularRipple(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var x = pos.x / zoom + params.xShift;
    var y = pos.y / zoom + params.yShift;
    var z = pos.z / zoom + params.zShift;
    var total: f32 = 0.0;
    var amp: f32 = 1.0;
    var freq: f32 = max(params.freq, 1e-6);

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        let sample = vec3<f32>(x * freq, y * freq, z * freq);
        total = total + voronoiCircularRippleRaw(sample, params) * amp;
        amp = amp * params.gain;
        freq = freq * params.lacunarity;
        let angle = params.seedAngle * 2.0 * PI;
        x = x + params.xShift * cos(angle + f32(i));
        y = y + params.yShift * cos(angle + f32(i));
        z = z + params.zShift * cos(angle + f32(i));
    }
    return 2.0 * total - 1.0;
}

// 6a. Fractal Voronoi Ripple 3D
fn generateFVoronoiRipple3D(posIn: vec3<f32>, params: NoiseParams) -> f32 {
    // first FBM pass
    let fbm1 = generateVoronoiRipple3D(posIn, params);

    // prepare second\u2010pass params: keep everything the same except zoom=1
    var p2 = params;
    p2.zoom = 1.0;

    // second FBM pass, feeding the scalar result back into xyz
    let sample = vec3<f32>(fbm1, fbm1, fbm1);
    let fbm2   = generateVoronoiRipple3D(sample, p2);

    return 2.0 * fbm2;
}

// 6b. Fractal Voronoi Circular Ripple 3D
fn generateFVoronoiCircularRipple(posIn: vec3<f32>, params: NoiseParams) -> f32 {
    // first FBM pass
    let fbm1 = generateVoronoiCircularRipple(posIn, params);

    // second\u2010pass with zoom=1
    var p2 = params;
    p2.zoom = 1.0;

    let sample = vec3<f32>(fbm1, fbm1, fbm1);
    let fbm2   = generateVoronoiCircularRipple(sample, p2);

    return 2.0 * fbm2;
}

// \u2014\u2014\u2014 continuousPermutation \u2014\u2014\u2014
fn continuousPermutation(value: f32) -> f32 {
    let iVal    = floor(value);
    let frac    = value - iVal;
    let i0      = i32(iVal);
    let idx1    = u32((i0 % 256 + 256) % 256);
    let idx2    = u32(((i0 + 1) % 256 + 256) % 256);
    let v1      = f32(perm(idx1));
    let v2      = f32(perm(idx2));
    return v1 + frac * (v2 - v1);
}

// \u2014\u2014\u2014 calculateRippleEffect \u2014\u2014\u2014
fn calculateRippleEffect(pos: vec3<f32>,
                         rippleFreq: f32,
                         neighborhoodSize: i32) -> f32 {
    var sum: f32 = 0.0;
    var count: f32 = 0.0;
    for (var dz = -neighborhoodSize; dz <= neighborhoodSize; dz = dz + 1) {
        for (var dy = -neighborhoodSize; dy <= neighborhoodSize; dy = dy + 1) {
            for (var dx = -neighborhoodSize; dx <= neighborhoodSize; dx = dx + 1) {
                let sample = vec3<f32>(
                    continuousPermutation(pos.x + f32(dx)),
                    continuousPermutation(pos.y + f32(dy)),
                    continuousPermutation(pos.z + f32(dz))
                );
                let d = length(sample - pos);
                sum = sum + sin(d * PI * rippleFreq);
                count = count + 1.0;
            }
        }
    }
    return sum / count;
}

// \u2014\u2014\u2014 generateRippleNoise \u2014\u2014\u2014
fn generateRippleNoise(pos: vec3<f32>, p: NoiseParams) -> f32 {
    let zoom = max(p.zoom, 1e-6);
    var x = pos.x / zoom + p.xShift;
    var y = pos.y / zoom + p.yShift;
    var z = pos.z / zoom + p.zShift;
    var sum: f32 = 0.0;
    var amp: f32 = 1.0;
    var freq: f32 = max(p.freq, 1e-6);
    var angle: f32 = p.seedAngle * 2.0 * PI;
    let angleInc = 2.0 * PI / max(f32(p.octaves), 1.0);
    let rippleFreqScaled = p.rippleFreq;
    let neigh = i32(p.exp1);

    for (var i: u32 = 0u; i < p.octaves; i = i + 1u) {
        var n = /* your base noise fn */ lanczos3D(vec3<f32>(x * freq, y * freq, z * freq)) * amp;
        if (p.turbulence == 1u) {
            n = abs(n);
        }
        let rip = calculateRippleEffect(vec3<f32>(x * freq, y * freq, z * freq),
                                        rippleFreqScaled,
                                        neigh);
        sum = sum + n * rip;

        freq   = freq * p.lacunarity;
        amp    = amp * p.gain;
        angle  = angle + angleInc;

        // simple phase offset; replace 0.0 with a hash if desired
        let phase: f32 = 0.0;
        x = x + p.xShift * cos(angle + phase);
        y = y + p.yShift * cos(angle + phase);
        z = z + p.zShift * cos(angle + phase);
    }

    if (p.turbulence == 1u) {
        sum = sum - 1.0;
    }
    return f32(p.octaves) * sum;
}

// \u2014\u2014\u2014 generateFractalRipples \u2014\u2014\u2014
fn generateFractalRipples(posIn: vec3<f32>, p: NoiseParams) -> f32 {
    // first pass at zoom scaled by exp2
    var p1 = p;
    p1.zoom = p.zoom * p.exp2+1.5;
    let fbm1 = generateRippleNoise(posIn, p1);

    // second pass feeding fbm1 back into xyz
    var p2 = p;
    let sample = vec3<f32>(fbm1, fbm1, fbm1);
    let fbm2   = generateRippleNoise(sample, p2);

    return 2.0 * fbm2;
}

// \u2014\u2014\u2014 1. HexWorms Raw \u2014\u2014\u2014
fn hexWormsRaw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let steps       : u32 = 5u;
    let persistence : f32 = 0.5;
    var total       : f32 = 0.0;
    var frequency   : f32 = 1.0;
    var amplitude   : f32 = 1.0;

    for (var i: u32 = 0u; i < steps; i = i + 1u) {
        // base cellular noise for direction
        let angle = generateCellular(pos * frequency, params) * 2.0 * PI;

        // step along the \u201Cworm\u201D
        let offset = vec3<f32>(
            cos(angle),
            sin(angle),
            sin(angle)
        ) * 0.5;
        let samplePos = pos + offset;

        // accumulate
        total = total + generateCellular(samplePos, params) * amplitude;

        amplitude = amplitude * persistence;
        frequency = frequency * 2.0;
    }

    // match JS: subtract 1 at the end
    return total - 1.0;
}

// \u2014\u2014\u2014 2. HexWorms Generator \u2014\u2014\u2014
fn generateHexWormsNoise(posIn: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var pos   = posIn / zoom + vec3<f32>(params.xShift, params.yShift, params.zShift);
    var sum   : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        sum = sum + hexWormsRaw(pos * freq, params) * amp;
        freq = freq * params.lacunarity;
        amp  = amp * params.gain;
        pos  = pos + vec3<f32>(params.xShift, params.yShift, params.zShift);
    }

    return sum;
}

// \u2014\u2014\u2014 3. PerlinWorms Raw \u2014\u2014\u2014
fn perlinWormsRaw(pos: vec3<f32>, params: NoiseParams) -> f32 {
    let steps       : u32 = 5u;
    let persistence : f32 = 0.5;
    var total       : f32 = 0.0;
    var frequency   : f32 = 1.0;
    var amplitude   : f32 = 1.0;

    for (var i: u32 = 0u; i < steps; i = i + 1u) {
        // base Perlin noise for direction
        let angle = generatePerlin(pos * frequency, params) * 2.0 * PI;

        // step along the \u201Cworm\u201D
        let offset = vec3<f32>(
            cos(angle),
            sin(angle),
            sin(angle)
        ) * 0.5;
        let samplePos = pos + offset;

        // accumulate
        total = total + generatePerlin(samplePos, params) * amplitude;

        amplitude = amplitude * persistence;
        frequency = frequency * 2.0;
    }

    return total;
}

// \u2014\u2014\u2014 PerlinWorms Generator \u2014\u2014\u2014
fn generatePerlinWormsNoise(posIn: vec3<f32>, params: NoiseParams) -> f32 {
    let zoom = max(params.zoom, 1e-6);
    var pos   = posIn / zoom + vec3<f32>(params.xShift, params.yShift, params.zShift);
    var sum   : f32 = 0.0;
    var amp   : f32 = 1.0;
    var freq  : f32 = max(params.freq, 1e-6);

    for (var i: u32 = 0u; i < params.octaves; i = i + 1u) {
        sum = sum + perlinWormsRaw(pos * freq, params) * amp;
        freq = freq * params.lacunarity;
        amp  = amp * params.gain;
        pos  = pos + vec3<f32>(params.xShift, params.yShift, params.zShift);
    }

    return sum;
}

// small helper: derive a few pseudorandom offsets from seed (u32)
fn seedOffsets(seed: u32) -> vec3<f32> {
  let s = f32(seed);
  let a = fract(sin(s * 12.9898) * 43758.5453);
  let b = fract(sin((s + 17.0) * 78.233) * 23421.631);
  let c = fract(sin((s + 31.0) * 37.719) * 97531.135);
  return vec3<f32>(a, b, c) * 0.5;
}

// safe tile sizes (u32) derived from Frame (avoid zero)
fn tileSizeX() -> u32 { return max(frame.tileWidth, 1u); }
fn tileSizeY() -> u32 { return max(frame.tileHeight, 1u); }
fn tileSizeZ() -> u32 { return max(frame.tileDepth, 1u); }

// --- helper: map pos -> integer pixel coords (uses frame uniform) ----------
// Returns wrapped pixel coords (periodic) so noise will tile across chunks.
fn posToPixelCoords_tiled(p : vec3<f32>) -> vec3<u32> {
  let fx = p.x * f32(frame.fullWidth);
  let fy = p.y * f32(frame.fullHeight);

  let ox_i : i32 = max(frame.originX, 0);
  let oy_i : i32 = max(frame.originY, 0);

  // integer pixel coords (unwrapped)
  let pxu : u32 = u32(floor(fx)) + u32(ox_i);
  let pyu : u32 = u32(floor(fy)) + u32(oy_i);

  let layer_i = max(frame.layerIndex, 0);
  let layer_u : u32 = u32(layer_i);

  // wrap coordinates into tile using modulo (cheap & correct for arbitrary tile sizes)
  let tx = tileSizeX();
  let ty = tileSizeY();
  let tz = tileSizeZ();
  let rx = pxu % tx;
  let ry = pyu % ty;
  let rz = layer_u % tz;

  return vec3<u32>(rx, ry, rz);
}

// --- deterministic integer hash that mixes seed (uses perm table) ---
// perm(...) implementation expected elsewhere (perm indexes 0..511)
fn hashed_with_seed(ix: u32, iy: u32, iz: u32, seed: u32) -> u32 {
  let a = perm((ix + seed * 1664525u) & 511u);
  let b = perm((a + (iy + seed * 22695477u)) & 511u);
  let c = perm((b + (iz + seed * 1103515245u)) & 511u);
  return c & 511u;
}
fn hashTo01_seeded(ix: u32, iy: u32, iz: u32, seed: u32) -> f32 {
  return f32(hashed_with_seed(ix, iy, iz, seed)) / 511.0;
}
fn hashToSigned01_seeded(ix: u32, iy: u32, iz: u32, seed: u32) -> f32 {
  return hashTo01_seeded(ix, iy, iz, seed) * 2.0 - 1.0;
}

// integer lattice helper consistent with the perm table, tiled by Frame sizes.
// p is continuous; freq and shifts control lattice alignment.
fn posToIntsForHash_tiled(p: vec3<f32>, freq: f32, sx: f32, sy: f32, sz: f32) -> vec3<u32> {
  let fx = floor(p.x * freq + sx);
  let fy = floor(p.y * freq + sy);
  let fz = floor(p.z * freq + sz);

  // cast and wrap to tile-size
  let tx = tileSizeX();
  let ty = tileSizeY();
  let tz = tileSizeZ();

  let ix = u32(fx) % tx;
  let iy = u32(fy) % ty;
  let iz = u32(fz) % tz;
  return vec3<u32>(ix, iy, iz);
}

// ---------------------- tiled value-noise 2D (smooth) ----------------------
// Uses posToIntsForHash_tiled internally => tiled/periodic by Frame tile sizes.
fn valueNoise2D_seeded(p : vec2<f32>, freq: f32, seed: u32, sx: f32, sy: f32) -> f32 {
  let f = max(freq, 1e-6);
  let fx = p.x * f + sx;
  let fy = p.y * f + sy;
  let ix_f = floor(fx);
  let iy_f = floor(fy);
  let txf = fx - ix_f;
  let tyf = fy - iy_f;

  // get tiled integer lattice coords (z = 0)
  let base = posToIntsForHash_tiled(vec3<f32>(ix_f, iy_f, 0.0), 1.0, 0.0, 0.0, 0.0);
  let ix = base.x;
  let iy = base.y;

  // neighbors (wrapped by tile in posToIntsForHash_tiled above)
  let ix1 = (ix + 1u) % tileSizeX();
  let iy1 = (iy + 1u) % tileSizeY();

  let h00 = hashToSigned01_seeded(ix,  iy,  0u, seed);
  let h10 = hashToSigned01_seeded(ix1, iy,  0u, seed);
  let h01 = hashToSigned01_seeded(ix,  iy1, 0u, seed);
  let h11 = hashToSigned01_seeded(ix1, iy1, 0u, seed);

  let sx_f = fade(txf);
  let sy_f = fade(tyf);
  let a = lerp(h00, h10, sx_f);
  let b = lerp(h01, h11, sx_f);
  return lerp(a, b, sy_f);
}

// ---------------------- White Noise (tiled, seeded, contrast/gain) ----
fn generateWhiteNoise(pos : vec3<f32>, params: NoiseParams) -> f32 {
  let seed : u32 = params.seed;

  // integer pixel coords (wrapped to tile)
  let ip = posToPixelCoords_tiled(pos);

  // subsampling (blocky) or per-pixel; safe cast
  let subs = max(u32(max(params.freq, 1.0)), 1u);
  let sx = (ip.x / subs) % tileSizeX();
  let sy = (ip.y / subs) % tileSizeY();
  let sz = ip.z % tileSizeZ();

  var v01 = hashTo01_seeded(sx, sy, sz, seed);

  // apply contrast around 0.5 via params.gain
  let contrast = 1.0 + params.gain;
  v01 = (v01 - 0.5) * contrast + 0.5;

  return clamp(v01, 0.0, 1.0);
}

fn wrapCoordOffset(base: u32, offset: i32, size: u32) -> u32 {
  let s = max(i32(size), 1);
  let v = ((i32(base) + offset) % s + s) % s;
  return u32(v);
}

fn blueNoiseLocalRank(ip: vec3<u32>, seed: u32, radius: i32) -> f32 {
  let center = hashTo01_seeded(ip.x, ip.y, ip.z, seed);
  var lower = 0.0;
  var total = 0.0;

  for (var dy: i32 = -radius; dy <= radius; dy = dy + 1) {
    for (var dx: i32 = -radius; dx <= radius; dx = dx + 1) {
      if (dx == 0 && dy == 0) {
        continue;
      }

      let sx = wrapCoordOffset(ip.x, dx, tileSizeX());
      let sy = wrapCoordOffset(ip.y, dy, tileSizeY());
      let n = hashTo01_seeded(sx, sy, ip.z, seed);
      lower += select(0.0, 1.0, n < center);
      total += 1.0;
    }
  }

  return (lower + center) / (total + 1.0);
}

// ---------------------- Blue Noise Generator (tiled, seeded) -------------
fn generateBlueNoise(pos : vec3<f32>, params: NoiseParams) -> f32 {
  let seed : u32 = params.seed;
  let ip0 = posToPixelCoords_tiled(pos);

  var ip = ip0;
  if (params.warpAmp > 0.0) {
    let jx = i32(round(hashToSigned01_seeded(ip0.x + 5u, ip0.y + 11u, ip0.z + 17u, seed) * params.warpAmp * 2.0));
    let jy = i32(round(hashToSigned01_seeded(ip0.x + 19u, ip0.y + 23u, ip0.z + 29u, seed) * params.warpAmp * 2.0));
    ip = vec3<u32>(
      wrapCoordOffset(ip0.x, jx, tileSizeX()),
      wrapCoordOffset(ip0.y, jy, tileSizeY()),
      ip0.z
    );
  }

  let rankSmall = blueNoiseLocalRank(ip, seed, 1);
  let rankLarge = blueNoiseLocalRank(ip, seed ^ 0x9E3779B9u, 2);
  var result = mix(rankLarge, rankSmall, 0.65);

  let micro = hashTo01_seeded(ip.x + 37u, ip.y + 61u, ip.z + 17u, seed ^ 0x85EBCA6Bu);
  result = clamp(result + (micro - 0.5) * (1.0 / 25.0), 0.0, 1.0);

  let contrast = max(1.0 + params.gain, 0.05);
  result = clamp((result - 0.5) * contrast + 0.5, 0.0, 1.0);
  return result;
}

const HYDRO_TAU : f32 = 6.283185307179586;

fn clamp01(x: f32) -> f32 {
  return clamp(x, 0.0, 1.0);
}

fn hydroHash2(p: vec2<f32>) -> vec2<f32> {
  let k = vec2<f32>(0.3183099, 0.3678794);
  let q = p * k + k.yx;
  return -1.0 + 2.0 * fract(16.0 * k * fract(q.x * q.y * (q.x + q.y)));
}

fn safeNormalize2(v: vec2<f32>) -> vec2<f32> {
  let l = length(v);
  if (l > 1e-10) {
    return v / l;
  }
  return vec2<f32>(0.0, 0.0);
}

fn powInv(t: f32, power: f32) -> f32 {
  return 1.0 - pow(1.0 - clamp01(t), power);
}

fn easeOut(t: f32) -> f32 {
  let v = 1.0 - clamp01(t);
  return 1.0 - v * v;
}

fn smoothStart(t: f32, smoothing: f32) -> f32 {
  let s = max(smoothing, 1e-6);
  if (t >= s) {
    return t - 0.5 * s;
  }
  return 0.5 * t * t / s;
}

fn loadPrevClamped2D(fx: i32, fy: i32, fz: i32) -> vec4<f32> {
  let cx = clamp(fx, 0, i32(frame.fullWidth) - 1);
  let cy = clamp(fy, 0, i32(frame.fullHeight) - 1);
  return loadPrevRGBA(cx, cy, fz);
}

fn fetchPosClamped2D(fx: i32, fy: i32, fz: i32) -> vec3<f32> {
  let cx = clamp(fx, 0, i32(frame.fullWidth) - 1);
  let cy = clamp(fy, 0, i32(frame.fullHeight) - 1);
  return fetchPos(cx, cy, fz);
}

fn resolutionScale() -> f32 {
  let refRes = 1024.0;
  let curRes = max(min(f32(frame.fullWidth), f32(frame.fullHeight)), 1.0);
  return curRes / refRes;
}

fn resolveFiniteSlope2D(fx: i32, fy: i32, fz: i32) -> vec2<f32> {
  let hL = loadPrevClamped2D(fx - 1, fy, fz).x;
  let hR = loadPrevClamped2D(fx + 1, fy, fz).x;
  let hD = loadPrevClamped2D(fx, fy - 1, fz).x;
  let hU = loadPrevClamped2D(fx, fy + 1, fz).x;

  let pL = fetchPosClamped2D(fx - 1, fy, fz);
  let pR = fetchPosClamped2D(fx + 1, fy, fz);
  let pD = fetchPosClamped2D(fx, fy - 1, fz);
  let pU = fetchPosClamped2D(fx, fy + 1, fz);

  let dx = max(abs(pR.x - pL.x), 1e-6);
  let dy = max(abs(pU.y - pD.y), 1e-6);

  let dHdX = (hR - hL) / dx;
  let dHdY = (hU - hD) / dy;

  return vec2<f32>(dHdX, dHdY);
}

fn guideGaussian(dx: i32, dy: i32, sigmaPx: f32) -> f32 {
  let s = max(sigmaPx, 0.05);
  let d2 = f32(dx * dx + dy * dy);
  return exp(-0.5 * d2 / (s * s));
}

fn guideHeightAt(fx: i32, fy: i32, fz: i32, sigmaWorld: f32) -> f32 {
  let sigmaPx = sigmaWorld * resolutionScale();

  var sumW = 0.0;
  var sumH = 0.0;

  for (var j: i32 = -4; j <= 4; j = j + 1) {
    for (var i: i32 = -4; i <= 4; i = i + 1) {
      let h = loadPrevClamped2D(fx + i, fy + j, fz).x;
      let w = guideGaussian(i, j, sigmaPx);
      sumW += w;
      sumH += h * w;
    }
  }

  return sumH / max(sumW, 1e-6);
}

fn drainBlurWeight(dx: i32, dy: i32, sigmaPx: f32) -> f32 {
  let s = max(sigmaPx, 0.05);
  let d2 = f32(dx * dx + dy * dy);
  return exp(-0.5 * d2 / (s * s));
}

fn blurredHeightAt(fx: i32, fy: i32, fz: i32, sigmaWorld: f32) -> f32 {
  let sigmaPx = sigmaWorld * resolutionScale();

  var sumW = 0.0;
  var sumH = 0.0;

  for (var j: i32 = -4; j <= 4; j = j + 1) {
    for (var i: i32 = -4; i <= 4; i = i + 1) {
      let s = loadPrevClamped2D(fx + i, fy + j, fz).x;
      let w = drainBlurWeight(i, j, sigmaPx);
      sumW += w;
      sumH += s * w;
    }
  }

  return sumH / max(sumW, 1e-6);
}

fn blurredRidgeAt(fx: i32, fy: i32, fz: i32, sigmaWorld: f32) -> f32 {
  let sigmaPx = sigmaWorld * resolutionScale();

  var sumW = 0.0;
  var sumR = 0.0;

  for (var j: i32 = -4; j <= 4; j = j + 1) {
    for (var i: i32 = -4; i <= 4; i = i + 1) {
      let s = loadPrevClamped2D(fx + i, fy + j, fz);
      let ridge = s.w * 2.0 - 1.0;
      let w = drainBlurWeight(i, j, sigmaPx);
      sumW += w;
      sumR += ridge * w;
    }
  }

  return sumR / max(sumW, 1e-6);
}

fn phacelleNoise(
  p: vec2<f32>,
  normDir: vec2<f32>,
  freq: f32,
  offset: f32,
  normalization: f32
) -> vec4<f32> {
  let sideDir = normDir.yx * vec2<f32>(-1.0, 1.0) * freq * HYDRO_TAU;
  let phaseOffset = offset * HYDRO_TAU;

  let pInt = floor(p);
  let pFrac = fract(p);

  var phaseDir = vec2<f32>(0.0);
  var weightSum = 0.0;

  for (var j: i32 = -1; j <= 2; j = j + 1) {
    for (var i: i32 = -1; i <= 2; i = i + 1) {
      let gridOffset = vec2<f32>(f32(i), f32(j));
      let gridPoint = pInt + gridOffset;
      let randomOffset = hydroHash2(gridPoint) * 0.5;
      let v = pFrac - gridOffset - randomOffset;

      let sqrDist = dot(v, v);
      var weight = exp(-sqrDist * 2.0);
      weight = max(0.0, weight - 0.01111);

      weightSum += weight;

      let waveInput = dot(v, sideDir) + phaseOffset;
      phaseDir += vec2<f32>(cos(waveInput), sin(waveInput)) * weight;
    }
  }

  let interpolated = phaseDir / max(weightSum, 1e-6);
  let mag = max(1.0 - normalization, length(interpolated));

  return vec4<f32>(interpolated / max(mag, 1e-6), sideDir);
}

fn pixelSpan2D(fx: i32, fy: i32, fz: i32) -> f32 {
  let pL = fetchPosClamped2D(fx - 1, fy, fz);
  let pR = fetchPosClamped2D(fx + 1, fy, fz);
  let pD = fetchPosClamped2D(fx, fy - 1, fz);
  let pU = fetchPosClamped2D(fx, fy + 1, fz);

  let dx = max(abs(pR.x - pL.x) * 0.5, 1e-6);
  let dy = max(abs(pU.y - pD.y) * 0.5, 1e-6);

  return max(dx, dy);
}


fn rotate2(v: vec2<f32>, angle: f32) -> vec2<f32> {
  let c = cos(angle);
  let s = sin(angle);
  return vec2<f32>(v.x * c - v.y * s, v.x * s + v.y * c);
}

fn signed01(v: f32) -> f32 {
  return v * 2.0 - 1.0;
}

fn terrainDetailMapScalar(uv: vec2<f32>, baseFreq: f32) -> f32 {
  var value = 0.0;
  var amp = 0.5;
  var ampSum = 0.0;
  var freqLoc = max(baseFreq, 1e-6);

  for (var i: u32 = 0u; i < 8u; i = i + 1u) {
    value += noise2D(uv * freqLoc) * amp;
    ampSum += amp;
    amp *= 0.95;
    freqLoc *= 2.0;
  }

  return value / max(ampSum, 1e-6);
}

fn generateSmokeNoise(pos: vec3<f32>, paramsIn: NoiseParams) -> f32 {
  let baseFreq = max(paramsIn.freq, 0.25);
  let baseOctaves = max(paramsIn.octaves, 3u);
  let lac = max(paramsIn.lacunarity, 2.0);

  var warpParams = paramsIn;
  warpParams.freq = baseFreq * 0.9;
  warpParams.octaves = max(baseOctaves, 3u);
  warpParams.gain = 0.55;
  warpParams.lacunarity = lac;

  let warpX = signed01(generateSimplex(pos + vec3<f32>(17.31, 9.73, 3.11), warpParams));
  let warpY = signed01(generatePerlin(pos + vec3<f32>(-11.37, 14.51, 5.71), warpParams));
  let warpZ = signed01(generateSimplex(pos + vec3<f32>(5.91, -7.13, 11.29), warpParams));
  let warpAmp = 0.18 + max(paramsIn.warpAmp, 0.0) * 0.35;
  let qWarp = pos + vec3<f32>(warpX, warpY, 0.35 * warpZ) * warpAmp;

  var macroParams = paramsIn;
  macroParams.freq = baseFreq * 0.5;
  macroParams.octaves = max(baseOctaves + 1u, 4u);
  macroParams.gain = 0.55;
  macroParams.lacunarity = lac;
  let macroRidge = signed01(generateRidgedMultifractal4(qWarp, macroParams));

  var continentalParams = paramsIn;
  continentalParams.freq = baseFreq * 0.28;
  continentalParams.octaves = max(baseOctaves, 3u);
  continentalParams.gain = 0.5;
  continentalParams.lacunarity = lac;
  let continental = signed01(generateBillow(qWarp + vec3<f32>(2.7, -4.1, 1.3), continentalParams));

  var ridgeParams = paramsIn;
  ridgeParams.freq = baseFreq * 1.45;
  ridgeParams.octaves = max(baseOctaves, 4u);
  ridgeParams.gain = 0.52;
  ridgeParams.lacunarity = lac;
  let detailRidge = signed01(generateRidgedMultifractal2(qWarp * 1.05 + vec3<f32>(4.2, 1.7, 0.0), ridgeParams));

  var worleyParams = paramsIn;
  worleyParams.freq = baseFreq * 1.75;
  worleyParams.octaves = 1u;
  worleyParams.gain = 1.0;
  worleyParams.lacunarity = 2.0;
  let cells = 1.0 - generateWorley(qWarp + vec3<f32>(7.5, -3.2, 0.0), worleyParams);
  let cellular = signed01(generateCellular(qWarp * 1.1 + vec3<f32>(-5.3, 6.4, 0.0), worleyParams));

  var rippleParams = paramsIn;
  rippleParams.freq = baseFreq * 2.25;
  rippleParams.octaves = 4u;
  rippleParams.gain = 0.7;
  rippleParams.lacunarity = max(lac, 2.0);
  let rippleWarpX = signed01(generatePerlin(qWarp * 1.9 + vec3<f32>(8.7, 3.1, 0.0), rippleParams));
  let rippleWarpY = signed01(generateSimplex(qWarp * 1.9 + vec3<f32>(-6.2, 5.4, 0.0), rippleParams));
  let rippleCarrier = signed01(generateBillow(qWarp * 2.3 + vec3<f32>(3.6, -8.9, 0.0), rippleParams));
  let rippleAngle = 0.6 + 0.35 * signed01(generatePerlin(qWarp + vec3<f32>(1.9, -2.7, 0.0), warpParams));
  let ripplePos = rotate2(qWarp.xy + vec2<f32>(rippleWarpX, rippleWarpY) * 0.08, rippleAngle);
  let rippleFreq = max(paramsIn.rippleFreq, 1.0);
  let ripple = sin(ripplePos.x * rippleFreq + rippleCarrier * 2.8);
  let rippleEnvelope = 0.5 + 0.5 * signed01(generatePerlin(qWarp * 1.35 + vec3<f32>(10.1, 4.8, 0.0), rippleParams));

  let cellBlend = clamp01(0.3 + paramsIn.threshold * 0.9);
  let rippleBlend = clamp01(0.02 + 0.008 * max(paramsIn.rippleFreq, 1.0));

  var terrain = 0.0;
  terrain += macroRidge * 0.46;
  terrain += continental * 0.14;
  terrain += detailRidge * 0.21;
  terrain += signed01(cells) * (0.10 * cellBlend);
  terrain += cellular * (0.06 * cellBlend);
  terrain += ripple * rippleEnvelope * rippleBlend;

  let lifted = terrain * 0.5 + 0.5 + paramsIn.zShift;
  return clamp01(lifted);
}

fn terrainVoroModeSample(pos: vec3<f32>, freqLoc: f32, mode: u32, edgeK: f32, threshold: f32) -> f32 {
  let s = voro_sample3D(pos * freqLoc);
  return clamp01(voro_eval(s.f1Sq, s.f2Sq, s.cellVal, mode, edgeK, threshold, freqLoc));
}

fn terrainVoroModeSmooth(pos: vec3<f32>, freqLoc: f32, mode: u32, edgeK: f32, threshold: f32) -> f32 {
  let step = 0.006;
  let center = terrainVoroModeSample(pos, freqLoc, mode, edgeK, threshold);
  let x1 = terrainVoroModeSample(pos + vec3<f32>( step, 0.0, 0.0), freqLoc, mode, edgeK, threshold);
  let x2 = terrainVoroModeSample(pos + vec3<f32>(-step, 0.0, 0.0), freqLoc, mode, edgeK, threshold);
  let y1 = terrainVoroModeSample(pos + vec3<f32>(0.0,  step, 0.0), freqLoc, mode, edgeK, threshold);
  let y2 = terrainVoroModeSample(pos + vec3<f32>(0.0, -step, 0.0), freqLoc, mode, edgeK, threshold);
  let d1 = terrainVoroModeSample(pos + vec3<f32>( step,  step, 0.0), freqLoc, mode, edgeK, threshold);
  let d2 = terrainVoroModeSample(pos + vec3<f32>(-step,  step, 0.0), freqLoc, mode, edgeK, threshold);
  let d3 = terrainVoroModeSample(pos + vec3<f32>( step, -step, 0.0), freqLoc, mode, edgeK, threshold);
  let d4 = terrainVoroModeSample(pos + vec3<f32>(-step, -step, 0.0), freqLoc, mode, edgeK, threshold);
  return clamp01((center * 4.0 + x1 * 2.0 + x2 * 2.0 + y1 * 2.0 + y2 * 2.0 + d1 + d2 + d3 + d4) / 16.0);
}

fn generateTerrainNoise(pos: vec3<f32>, paramsIn: NoiseParams) -> f32 {
  let baseFreq = max(paramsIn.freq, 0.24);
  let baseOctaves = max(paramsIn.octaves, 4u);
  let lac = max(paramsIn.lacunarity, 2.0);
  let warpAmount = 0.035 + max(paramsIn.warpAmp, 0.0) * 0.055;

  var warpParams = paramsIn;
  warpParams.freq = baseFreq * 0.55;
  warpParams.octaves = max(baseOctaves, 3u);
  warpParams.gain = 0.52;
  warpParams.lacunarity = lac;

  let warpA = signed01(generatePerlin(pos + vec3<f32>(7.3, -5.9, 1.7), warpParams));
  let warpB = signed01(generateSimplex(pos + vec3<f32>(-3.1, 9.4, 2.6), warpParams));
  let q = pos + vec3<f32>(warpA, warpB, 0.0) * warpAmount;

  var macroParams = paramsIn;
  macroParams.freq = baseFreq * 0.56;
  macroParams.octaves = max(baseOctaves + 1u, 5u);
  macroParams.gain = 0.58;
  macroParams.lacunarity = lac;
  let macroRidgeRaw = signed01(generateRidgedMultifractal4(q + vec3<f32>(4.2, 1.9, 0.0), macroParams));
  let macroRidge = sign(macroRidgeRaw) * pow(abs(macroRidgeRaw), 1.18);

  var sharpParams = paramsIn;
  sharpParams.freq = baseFreq * 1.08;
  sharpParams.octaves = max(baseOctaves, 5u);
  sharpParams.gain = 0.53;
  sharpParams.lacunarity = lac;
  let sharpRidgeRaw = signed01(generateRidgedMultifractal2(q * 1.04 + vec3<f32>(-3.7, 2.6, 0.0), sharpParams));
  let sharpRidge = sign(sharpRidgeRaw) * pow(abs(sharpRidgeRaw), 1.30);

  var worleyParams = paramsIn;
  worleyParams.freq = baseFreq * 0.82;
  worleyParams.octaves = 1u;
  worleyParams.gain = 1.0;
  worleyParams.lacunarity = 2.0;
  let worleyA = 1.0 - generateWorley(q + vec3<f32>(6.3, -1.7, 0.0), worleyParams);
  let worleyB = 1.0 - generateWorley(q + vec3<f32>(6.3 + 0.012, -1.7, 0.0), worleyParams);
  let worleyC = 1.0 - generateWorley(q + vec3<f32>(6.3 - 0.012, -1.7, 0.0), worleyParams);
  let worleyD = 1.0 - generateWorley(q + vec3<f32>(6.3, -1.7 + 0.012, 0.0), worleyParams);
  let worleyE = 1.0 - generateWorley(q + vec3<f32>(6.3, -1.7 - 0.012, 0.0), worleyParams);
  let smoothedWorley = (worleyA * 4.0 + worleyB + worleyC + worleyD + worleyE) / 8.0;
  let worleySignal = signed01(smoothedWorley);
  let worleyCarve = smoothstep(0.38, 0.84, smoothedWorley);
  let worleyGrad = vec2<f32>(worleyB - worleyC, worleyD - worleyE);
  let worleyTangent = safeNormalize2(vec2<f32>(-worleyGrad.y, worleyGrad.x));

  var angleParams = paramsIn;
  angleParams.freq = baseFreq * 0.72;
  angleParams.octaves = max(baseOctaves, 3u);
  angleParams.gain = 0.50;
  angleParams.lacunarity = lac;
  let angleField = signed01(generatePerlin(q + vec3<f32>(2.1, -4.7, 0.0), angleParams));
  let baseDir = safeNormalize2(vec2<f32>(cos(angleField * 1.9), sin(angleField * 1.9)));
  let joinMix = smoothstep(0.18, 0.82, smoothedWorley);
  let lineDir = safeNormalize2(mix(baseDir, worleyTangent, 0.72 * joinMix));
  let sideDir = vec2<f32>(-lineDir.y, lineDir.x);

  var rippleParams = paramsIn;
  rippleParams.freq = baseFreq * 1.7;
  rippleParams.octaves = 3u;
  rippleParams.gain = 0.62;
  rippleParams.lacunarity = max(lac, 2.0);
  let rippleWarp = vec2<f32>(
    signed01(generatePerlin(q * 1.25 + vec3<f32>(8.7, 1.3, 0.0), rippleParams)),
    signed01(generateSimplex(q * 1.25 + vec3<f32>(-6.2, 4.8, 0.0), rippleParams))
  ) * 0.024;
  let rippleCarrier = signed01(generateBillow(q * 1.85 + vec3<f32>(3.1, -7.2, 0.0), rippleParams));

  let detailMap = terrainDetailMapScalar(q.xy * 0.60 + vec2<f32>(11.7, -5.3), 2.0);
  let detailSoft = detailMap * detailMap * (3.0 - 2.0 * detailMap);
  let detailSignal = signed01(detailSoft);

  let joinedCoord = dot(q.xy + rippleWarp, sideDir);
  let branchCoord = dot(
    q.xy + rippleWarp * 0.7,
    safeNormalize2(mix(sideDir, worleyTangent, 0.35))
  );
  let rippleFreq = max(paramsIn.rippleFreq, 1.0) * 0.42;
  let ripplePrimary =
    sin(joinedCoord * rippleFreq + smoothedWorley * 4.0 + rippleCarrier * 1.1 + detailSignal * 0.28);
  let rippleBranch =
    sin(branchCoord * rippleFreq * 1.05 + smoothedWorley * 3.2 + rippleCarrier * 0.7 + detailSignal * 0.18);
  let ripple = mix(ripplePrimary, rippleBranch, 0.32 + 0.28 * joinMix);
  let rippleMask =
    smoothstep(0.08, 0.88, abs(macroRidge)) *
    (0.28 + 0.72 * joinMix) *
    (0.92 + 0.08 * detailSoft);
  let rippleBlend = clamp01(0.026 + 0.006 * max(paramsIn.rippleFreq, 1.0));

  let detailMask =
    smoothstep(0.12, 0.88, smoothedWorley) *
    smoothstep(0.04, 0.72, abs(macroRidge));

  var terrain = 0.0;
  terrain += macroRidge * 0.40;
  terrain += sharpRidge * 0.16;
  terrain += worleySignal * 0.11;
  terrain -= worleyCarve * 0.10;
  terrain += ripple * rippleMask * rippleBlend;
  terrain += detailSignal * detailMask * 0.012;

  let shaped = sign(terrain) * pow(abs(terrain), 0.96);
  let lifted = shaped * 0.5 + 0.5 + paramsIn.zShift;
  return clamp01(lifted);
}

fn erosionFilter(
  p: vec2<f32>,
  heightAndSlopeIn: vec3<f32>,
  fadeTargetIn: f32,
  strengthIn: f32,
  gullyWeightIn: f32,
  carrierWeightIn: f32,
  steeringWeightIn: f32,
  detailIn: f32,
  roundingIn: vec4<f32>,
  onsetIn: vec4<f32>,
  assumedSlopeIn: vec2<f32>,
  scaleIn: f32,
  octavesIn: u32,
  lacunarityIn: f32,
  gainIn: f32,
  cellScaleIn: f32,
  normalizationIn: f32,
  pixelSpanIn: f32,
  ridgeMapOut: ptr<function, f32>
) -> vec4<f32> {
  var heightAndSlope = heightAndSlopeIn;
  var fadeTarget = clamp(fadeTargetIn, -1.0, 1.0);

  let inputHeightAndSlope = heightAndSlopeIn;

  var strength = strengthIn * scaleIn;
  var freq = 1.0 / max(scaleIn * cellScaleIn, 1e-6);
  let carrierSharpness = 1.75;
  let slopeLength = max(length(heightAndSlopeIn.yz), 1e-10);
  var magnitude = 0.0;
  var roundingMult = 1.0;

  let roundingForInput =
    mix(roundingIn.y, roundingIn.x, clamp01(fadeTarget * 0.5 + 0.5)) * roundingIn.z;

  var combiMask =
    easeOut(smoothStart(slopeLength * onsetIn.x, roundingForInput * onsetIn.x));

  var ridgeMapCombiMask = easeOut(slopeLength * onsetIn.z);
  var ridgeMapFadeTarget = fadeTarget;

  var gullySlope =
    mix(
      heightAndSlopeIn.yz,
      safeNormalize2(heightAndSlopeIn.yz) * assumedSlopeIn.x,
      assumedSlopeIn.y
    );

  let pixelSpan = max(pixelSpanIn, 1e-6);

  for (var i: u32 = 0u; i < octavesIn; i = i + 1u) {
    let stripeStep = freq * cellScaleIn * HYDRO_TAU * pixelSpan;
    let stripeMask = 1.0 - smoothstep(1.05, 2.40, stripeStep);

    if (stripeMask <= 1e-4) {
      break;
    }

    var phacelle =
      phacelleNoise(
        p * freq,
        safeNormalize2(gullySlope),
        cellScaleIn,
        0.25,
        normalizationIn
      );

    phacelle = vec4<f32>(phacelle.xy, phacelle.z * -freq, phacelle.w * -freq);
    let sloping = abs(phacelle.y);
    let carrierRaw = clamp(phacelle.x, -1.0, 1.0);
    let carrierPhase = sign(carrierRaw) * pow(abs(carrierRaw), carrierSharpness);

    let octaveStrength = strength * stripeMask;

    gullySlope += sign(phacelle.y) * phacelle.zw * octaveStrength * gullyWeightIn * steeringWeightIn;

    let visibleGullies = vec3<f32>(carrierPhase, phacelle.y * phacelle.zw) * carrierWeightIn;
    let fadedGullies =
      mix(vec3<f32>(fadeTarget, 0.0, 0.0), visibleGullies, combiMask);

    heightAndSlope += fadedGullies * octaveStrength;
    magnitude += octaveStrength;
    let fadedCarrier = mix(fadeTarget, carrierPhase, combiMask);
    fadeTarget = mix(fadeTarget, fadedCarrier, stripeMask);

    let roundingForOctave =
      mix(roundingIn.y, roundingIn.x, clamp01(carrierPhase * 0.5 + 0.5)) * roundingMult;

    let newMask =
      easeOut(smoothStart(sloping * onsetIn.y, roundingForOctave * onsetIn.y));

    combiMask = powInv(combiMask, detailIn) * mix(1.0, newMask, stripeMask);

    ridgeMapFadeTarget = mix(ridgeMapFadeTarget, carrierPhase, ridgeMapCombiMask * stripeMask);

    let newRidgeMapMask = easeOut(sloping * onsetIn.w);
    ridgeMapCombiMask = ridgeMapCombiMask * mix(1.0, newRidgeMapMask, stripeMask);

    strength *= gainIn;
    freq *= lacunarityIn;
    roundingMult *= roundingIn.w;
  }

  *ridgeMapOut = ridgeMapFadeTarget * (1.0 - ridgeMapCombiMask);

  let delta = heightAndSlope - inputHeightAndSlope;
  return vec4<f32>(delta, magnitude);
}

fn studioSphereHeight(x:i32,y:i32,last:i32)->f32 {
  return loadPrevRGBA((x+last)%last,clamp(y,0,last),0).x;
}

struct StudioErosionChart { position:vec2<f32>, slope:vec2<f32>, pixelSpan:f32 }

fn studioErosionChart(
  dir:vec3<f32>,gradient:vec3<f32>,hemisphere:f32,pixelSpan:f32
)->StudioErosionChart {
  // Stereographic charts preserve the downhill angle. Their overlap avoids a
  // longitude seam and keeps the noise cells finite at both poles.
  let projection=1.0+hemisphere*dir.y;
  let uv=dir.xz/projection;
  let inverse=2.0/(1.0+dot(uv,uv));
  let angular=vec3<f32>(dir.x,hemisphere+dir.y,dir.z);
  let du=inverse*(vec3<f32>(1,0,0)-uv.x*angular);
  let dv=inverse*(vec3<f32>(0,0,1)-uv.y*angular);
  let slope=vec2<f32>(dot(gradient,du),dot(gradient,dv))*.14;
  let offset=seedOffset3(params.seed).xy;
  return StudioErosionChart(uv+offset,slope,pixelSpan/projection);
}

fn studioMountainCut(chart:StudioErosionChart,height:f32,ranges:bool)->f32 {
  let fade=2.0*smoothstep(.05,select(1.62,1.20,ranges),height)-1.0;
  var ridge=0.0;
  let mountain=erosionFilter(
    chart.position+vec2<f32>(.29,-.44),vec3<f32>(height,chart.slope),fade,
    select(4.4,5.8,ranges),.48,select(.76,.55,ranges),1.03,1.40,
    vec4<f32>(select(.10,.035,ranges),0,.10,2.0),vec4<f32>(1.10,1.25,2.80,1.50),
    vec2<f32>(.70,.88),select(.145,.083,ranges),select(1u,6u,ranges),
    2.08,.54,.82,.52,chart.pixelSpan,&ridge
  );
  if(ranges){
    // Preserve the fade contribution at crests. Clipping uplift rounds off
    // the exact divides the lower carrier weight is meant to keep.
    return mountain.x-.22*max(0.0,-mountain.x);
  }
  let incision=smoothstep(.065,.52,-mountain.x);
  let shoulder=smoothstep(.06,.48,mountain.x);
  return .10*shoulder-.55*incision;
}

fn studioGullyCut(chart:StudioErosionChart,height:f32)->f32 {
  let strength=select(3.05,3.55,params.voroMode==1u);
  var ridge=0.0;
  let erosion=erosionFilter(
    chart.position,vec3<f32>(height,chart.slope),-.17,strength,.48,.83,1.03,1.50,
    vec4<f32>(.10,0,.10,2.0),vec4<f32>(1.20,1.25,2.80,1.50),
    vec2<f32>(.72,.72),.076,3u,2.2,.48,.82,.52,chart.pixelSpan,&ridge
  );
  // Smaller tributaries start from the coarse pass's eroded slope.
  let tributaries=erosionFilter(
    chart.position+vec2<f32>(.57,.31),
    vec3<f32>(height+erosion.x,chart.slope+.30*erosion.yz),-.10,1.55,.37,.69,.92,1.38,
    vec4<f32>(.10,0,.10,1.8),vec4<f32>(1.20,1.25,2.80,1.50),
    vec2<f32>(.66,.68),.041,2u,2.1,.47,.83,.52,chart.pixelSpan,&ridge
  );
  return clamp(erosion.x+tributaries.x,-.265,.16);
}

fn studioVolcanicRelief(dir:vec3<f32>,texel:f32)->vec2<f32> {
  var relief=0.0;
  var foundation=0.0;
  var collapse=0.0;
  let density=options.sphereFeatureDensity;
  let vents=u32(clamp(round(12.0*density),5.0,32.0));
  for(var i=0u;i<vents;i++){
    let seed=params.seed+i*73856093u;
    let q=(seedOffset3(seed)-vec3<f32>(17.173,31.947,47.521))/
      vec3<f32>(131.0,137.0,149.0);
    let y=2.0*q.x-1.0;
    let ring=sqrt(max(0.0,1.0-y*y));
    let phi=TWO_PI*q.y;
    let center=vec3<f32>(ring*cos(phi),y,ring*sin(phi));
    let radius=mix(.035,.134,q.z*q.z);
    let distance2=max(0.0,2.0-2.0*dot(dir,center));
    let reach=mix(.11,.21,q.z)+.44*radius;
    let extent=max(radius*1.45,reach+.024);
    if(distance2*density*density>extent*extent){continue;}
    let east=vec3<f32>(-sin(phi),0,cos(phi));
    let north=cross(center,east);
    let angle=TWO_PI*canyon_bed_random(19,seed);
    let course=east*cos(angle)+north*sin(angle);
    let local=density*vec2<f32>(dot(dir,course),dot(dir,cross(center,course)));
    if(distance2*density*density<radius*radius*1.45*1.45){
      let shape=vec3<f32>(1.0-q.z,canyon_bed_random(23,seed),canyon_bed_random(37,seed));
      let profile=local/radius;
      let roughness=mix(.105,.040,shape.x)*simplex3D(dir*104.0+q*19.0);
      relief+=volcanic_vent(profile,shape,roughness);
      // Loose ejecta bury the old relief beneath the crater and upper flank.
      foundation=max(foundation,(1.0-smoothstep(.38,1.21,length(profile)))*mix(.45,1.0,shape.x));
    }
    // Off-axis flank vents and multiple tube directions follow the same
    // eruptive center. The world seed controls which branches survive.
    if(canyon_bed_random(5,seed)>.33){
      let flank=vec2<f32>(local.x*.64+local.y*.77,-local.x*.77+local.y*.64);
      let offset=radius*vec2<f32>(mix(.81,1.36,q.x),mix(-.34,.48,q.y));
      let smallRadius=clamp(radius*.45,.023,.044);
      let vent=(flank-offset)/smallRadius;
      if(dot(vent,vent)<1.45*1.45){
        let shape=vec3<f32>(mix(.56,.91,q.y),q.x,q.z);
        relief+=.62*volcanic_vent(vent,shape,.075*simplex3D(dir*140.0-q*17.0));
      }
    }
    collapse=min(collapse,lava_tube_collapse(local,radius,reach,seed,texel*density));
    if(q.x>.63){
      let branch=vec2<f32>(local.x*.78-local.y*.626,local.x*.626+local.y*.78);
      collapse=min(collapse,lava_tube_collapse(branch,radius*1.33,reach*.78,seed+8009u,texel*density));
    }
  }
  return vec2<f32>(clamp(relief,-.55,1.10)+collapse,foundation);
}

fn studioVolcanicCraterFields(dir:vec3<f32>,broad:f32,province:f32)->vec2<f32>{
  let volcanic=smoothstep(.22,.65,province);
  if(volcanic<=0.0){return vec2<f32>(0.0);}
  // Jitter vent centers in 3D so the fields wrap over every meridian.
  let shellRadius=24.0*options.sphereFeatureDensity;
  let position=dir*shellRadius;
  let base=vec3<i32>(floor(position));
  let next=select(vec3<i32>(1),vec3<i32>(-1),fract(position)<vec3<f32>(.5));
  let upland=smoothstep(-.36,.68,broad);
  let belt=smoothstep(-.53,.37,simplex3D(dir*11.0*options.sphereFeatureDensity+seedOffset3(params.seed)));
  let chance=volcanic*(.17+.31*upland+.21*belt);
  var raised=0.0;
  var carved=0.0;
  var foundation=0.0;
  // The radius and jitter bounds let each axis skip its farther neighbor.
  for(var i=0u;i<8u;i++){
    let cell=base+next*vec3<i32>(i32(i&1u),i32((i>>1u)&1u),i32(i>>2u));
    let key=params.seed^(bitcast<u32>(cell.x)*0x8da6b343u)^
      (bitcast<u32>(cell.y)*0xd8163841u)^(bitcast<u32>(cell.z)*0xcb1ab31fu);
    let activation=1.0-smoothstep(chance-.09,chance,canyon_bed_random(2,key));
    if(activation<=0.0){continue;}
    let shape=vec3<f32>(canyon_bed_random(5,key),canyon_bed_random(7,key),canyon_bed_random(11,key));
    let site=vec3<f32>(cell)+.22+.56*shape;
    let offset=site-position;
    if(dot(offset,offset)>.49){continue;}
    let lengthFromCenter=length(site);
    if(abs(lengthFromCenter-shellRadius)>.24){continue;}
    let center=site/lengthFromCenter;
    let width=mix(.19,.40,canyon_bed_random(19,key));
    let distance2=max(0.0,2.0-2.0*dot(dir,center))*shellRadius*shellRadius;
    if(distance2>width*width*2.56){continue;}
    let axis=select(vec3<f32>(0,1,0),vec3<f32>(1,0,0),abs(center.y)>.9);
    let east=normalize(cross(axis,center));
    let north=cross(center,east);
    let angle=TWO_PI*canyon_bed_random(23,key);
    let facing=east*cos(angle)+north*sin(angle);
    let point=vec2<f32>(dot(dir,facing),dot(dir,cross(center,facing)))*(shellRadius/width);
    let roughness=.064*simplex3D(dir*142.0*options.sphereFeatureDensity+shape*17.0);
    let threshold=mix(.63,.38,upland);
    let cinder=smoothstep(threshold-.07,threshold+.07,canyon_bed_random(29,key));
    var height=0.0;
    if(cinder>0.0){
      height+=cinder*volcanic_vent(point,vec3<f32>(mix(.70,1.0,shape.x),shape.y,shape.z),roughness);
    }
    if(cinder<1.0){
      height+=(1.0-cinder)*volcanic_caldera(point,shape,roughness);
    }
    let edge=1.0-smoothstep(1.30,1.55,length(point));
    height*=edge*activation*mix(.31,.62,width/.40);
    raised=max(raised,height);
    carved=min(carved,height);
    foundation=max(foundation,activation*(1.0-smoothstep(.28,1.28,length(point))));
  }
  return vec2<f32>(raised+carved,foundation);
}

fn studioRidge(value:f32,width:f32)->f32 {
  return max(0.0,1.0-abs(value)/width);
}

fn studioMountainRange(radial:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>)->f32 {
  let dir=radial*options.sphereFeatureDensity;
  // Fold the mountain belt and rotate the spurs away from the main divide.
  let fault=vec3<f32>(
    dot(dir,vec3<f32>(4,-20,22)/30.0),
    dot(dir,vec3<f32>(28,10,4)/30.0),
    dot(dir,vec3<f32>(-10,20,20)/30.0)
  );
  let province=simplex3D(dir*5.0-offset);
  let fold=simplex3D(dir*9.0+offset);
  let fracture=smoothstep(-.28,.52,province+.33*fold);
  let belt=fault*vec3<f32>(17,6,9)+vec3<f32>(.72*fold,.25*province,.34*fold);
  let line=simplex3D(belt+offset);
  let flank=abs(line)/(select(.82,1.22,line>0.0)*mix(1.12,.77,fracture));
  let crest=max(0.0,1.0-flank);
  // Oblique ribs cross the divide and split as the two limbs descend.
  // Intersect each rib with a dipping profile to make wedge-shaped faces.
  let spurDomain=vec3<f32>(belt.x*.77+1.05*belt.y,belt.y-.30*belt.x,belt.z);
  let spurLine=simplex3D(spurDomain*vec3<f32>(1.72,2.58,2.15)-offset)+.31*line;
  let opening=smoothstep(.07,.77,flank)*mix(.23,.55,.5+.5*fold);
  let fork=min(abs(spurLine-opening),abs(spurLine+.81*opening));
  let spur=studioRidge(fork,.53);
  let face=max(0.0,min(spur,1.22-1.09*flank));
  let ribs=studioRidge(simplex3D(spurDomain*vec3<f32>(3.7,5.6,4.6)+offset.yzx+.24*spurLine),.48);
  let relief=crest*(.57+.19*crest)+mix(.34,.55,fracture)*face+
    mix(.13,.28,fracture)*ribs*face*crest-.53;
  let uplift=smoothstep(-.58,.69,broad)*mix(.39,1.0,smoothstep(-.60,.34,province));
  let strength=select(.68,.89,params.voroMode==1u)*options.sphereRangeWeight;
  return strength*uplift*(relief+.82*(broad-height));
}

fn studio_atlas_direction(x:i32,y:i32)->vec3<f32>{
  let span=max(i32(frame.fullWidth)-1,1);
  let last=max(i32(frame.fullHeight)-1,1);
  if(y<=0){return vec3<f32>(0,1,0);}
  if(y>=last){return vec3<f32>(0,-1,0);}
  let theta=PI*f32(y)/f32(last);
  let phi=TWO_PI*f32((x%span+span)%span)/f32(span);
  return vec3<f32>(sin(theta)*cos(phi),cos(theta),sin(theta)*sin(phi));
}

// A separate seeded field keeps province boundaries independent of the
// permutation and parameters selected for any individual height layer.
fn studio_region_noise(p:vec3<f32>,salt:u32,valueNoise:bool)->f32{
  let cell=vec3<i32>(floor(p));
  let f=fract(p);
  let blend=f*f*f*(f*(6.0*f-15.0)+10.0);
  var result=0.0;
  for(var i=0u;i<8u;i++){
    let corner=vec3<i32>(i32(i&1u),i32((i>>1u)&1u),i32(i>>2u));
    let c=cell+corner;
    let hash=hash3_u32(c.x,c.y,c.z,options.sphereRegionSeed,salt);
    var height=2.0*rnd01(hash)-1.0;
    if(!valueNoise){height=dot(gradient(hash%12u),f-vec3<f32>(corner));}
    let w=select(1.0-blend,blend,corner!=vec3<i32>(0));
    result+=height*w.x*w.y*w.z;
  }
  return result;
}

fn studio_region_map(dir:vec3<f32>)->vec4<f32>{
  let mode=u32(options.sphereRegion.z);
  let p=dir*options.sphereRegion.x+seedOffset3(options.sphereRegionSeed);
  var scores:vec4<f32>;
  for(var i=0u;i<4u;i++){
    let salt=(i+1u)*0x9e3779b9u;
    var score=studio_region_noise(p,salt,mode==4u);
    if(mode==2u){score=.5-abs(score);}
    if(mode==3u){score+=.43*studio_region_noise(p*2.07,salt,false);}
    scores[i]=score;
  }
  // Region order is mountains, canyons, granite and volcanic.
  let geology=u32(options.sphereRegion.w);
  if(geology!=0u){scores[select(select(0u,1u,geology==2u),3u,geology==3u)]+=.17;}
  let peak=max(max(scores.x,scores.y),max(scores.z,scores.w));
  let influence=clamp(1.0-(peak-scores)/options.sphereRegion.y,vec4<f32>(0),vec4<f32>(1));
  let weights=influence*influence;
  return weights/dot(weights,vec4<f32>(1));
}

fn studioProvinces(dir:vec3<f32>,offset:vec3<f32>,hotspot:f32)->vec4<f32>{
  var home=vec4<f32>(1,0,0,0);
  if(params.voroMode==2u){home=vec4<f32>(0,1,0,0);}
  if(params.voroMode==3u){home=vec4<f32>(0,0,0,1);}
  if(options.sphereBlend<=0.0){return home;}
  let domain=dir*options.sphereFeatureDensity;
  let p=domain*3.45;
  let warp=.31*simplex3D(domain*6.7+offset.zxy);
  let scores=vec4<f32>(
    simplex3D(p+offset+warp),
    simplex3D(p-offset.yzx+warp),
    simplex3D(p*1.13+offset.zxy-warp),
    simplex3D(p*.93-offset-warp)+.68*hotspot
  )+home*select(.12,.38,params.voroMode!=0u);
  let top=max(max(scores.x,scores.y),max(scores.z,scores.w));
  let edge=max(vec4<f32>(0),1.0-(top-scores)/.44);
  let weights=edge*edge;
  var provinces=mix(home,weights/dot(weights,vec4<f32>(1)),smoothstep(0.0,.92,options.sphereBlend));
  // Let granite and alpine interiors keep their own profiles. Leave the
  // sandstone and volcanic shares intact at contacts with either one.
  let upland=provinces.x+provinces.z;
  let granite=provinces.z/max(.001,upland);
  provinces.z=upland*mix(granite,smoothstep(.12,.88,granite),.82*options.sphereBlend);
  provinces.x=upland-provinces.z;
  return provinces;
}

fn studioCanyonRelief(radial:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>)->f32{
  let dir=radial*options.sphereFeatureDensity;
  let strata=simplex3D(dir*8.0+offset);
  let fracture=simplex3D(dir*24.0-offset+strata*.5);
  let exposure=smoothstep(-.40,.32,strata)*smoothstep(-.44,.23,broad);
  let remnant=smoothstep(-.24,.30,fracture+.24*strata);
  // In some formations the same drainage widens into a basin, in others
  // it cuts a slot through the plateau. The shelf profile is applied later.
  var channel=simplex3D(dir*12.0-offset.zxy+1.55*strata);
  let basin=simplex3D(dir*4.1+offset.yzx);
  let winding=smoothstep(-.02,.54,basin)*smoothstep(-.48,-.08,broad)*
    (1.0-smoothstep(.42,.92,broad));
  var curvature=0.0;
  if(winding>0.0){
    // Bend an elongated channel field through the basin. Two bend scales
    // give long sweeps with smaller turns, and the domain stays spherical.
    let normal=normalize(fract(offset*vec3<f32>(.093,.127,.079))-.5+vec3<f32>(.001));
    let crosswise=normalize(cross(normal,select(vec3<f32>(0,1,0),vec3<f32>(0,0,1),abs(normal.y)>.9)));
    let along=dot(dir,crosswise);
    let across=dot(dir,normal);
    let lengthwise=along*14.0+1.9*basin;
    curvature=.72*sin(lengthwise)+.28*sin(lengthwise*2.31+.60*strata);
    let meander=vec3<f32>(10.0*across-1.55*curvature,along*6.0,
      9.0*dot(dir,cross(crosswise,normal)))+offset.zxy;
    channel=mix(channel,simplex3D(meander),winding*.76);
  }
  // Bedding can dip toward either bank. On the softer side the same
  // canyon opens into an apron, while the harder side holds its scarp.
  let dip=smoothstep(-.32,.32,strata)*2.0-1.0;
  let bend=mix(dip,curvature,winding*.86);
  let bank=(smoothstep(-.15,.15,channel)*2.0-1.0)*bend;
  let canyon=abs(channel)/mix(.69,1.40,.5+.5*bank);
  let narrow=smoothstep(-.49,.57,fracture);
  let width=mix(.47,.24,narrow)*(1.0+.46*winding);
  let wall=canyon/width;
  var tributary=0.0;
  var debris=0.0;
  var headcut=0.0;
  if(wall>.20 && wall<1.91){
    // Branches work back from the trunk along fractures. Their width
    // narrows upslope and both the cuts and the debris taper into the host.
    let joint=fracture+.31*channel+.19*strata;
    let head=smoothstep(.68,1.66,wall);
    let span=mix(.27,.105,head)*mix(.74,1.20,.5+.5*bank);
    let notch=1.0-smoothstep(.20*span,span,abs(joint));
    let weathered=smoothstep(-.48,.45,strata+.28*bank);
    let apron=smoothstep(.20,.47,wall);
    tributary=notch*apron*(1.0-head)*mix(.27,.57,weathered);
    debris=.060*notch*apron*(1.0-smoothstep(.43,.76,wall))*(.40+.60*weathered);
    if(wall>.67){
      // Persistent joints cut back through the upper rim. Where two arms
      // split, the strip between them keeps its cap as a spur or butte.
      let rim=smoothstep(.67,1.03,wall)*(1.0-smoothstep(1.46,1.91,wall));
      let deflect=simplex3D(dir*35.0+offset.yzx+.48*strata);
      let opening=.19*smoothstep(.79,1.49,wall)*smoothstep(-.52,.58,deflect);
      let fork=abs(abs(joint+.12*deflect)-opening);
      let cut=1.0-smoothstep(.042,mix(.16,.27,weathered),fork);
      headcut=rim*cut*mix(.19,.52,weathered)*(1.0-.32*exposure);
    }
  }
  let cutWall=wall-tributary;
  // A talus ramp leads to a middle bench, then a steeper caprock wall.
  // Its flat top follows the broad regional surface above the smaller hills.
  let apron=smoothstep(.04,.40,cutWall);
  let hardCap=smoothstep(-.18,.49,strata+.24*fracture);
  let capWall=mix(smoothstep(.38,1.14,cutWall),smoothstep(.57,.98,cutWall),hardCap);
  let ramp=mix(.32,.53,.5+.5*bank);
  let profile=ramp*apron+(1.0-ramp)*capWall;
  // A resistant cap follows the slow regional bedding, so small changes
  // in the underlying relief don't turn the top into a chain of peaks.
  let shelf=.24+.19*broad+.24*basin+.067*strata;
  let table=shelf+.065*remnant*exposure;
  let depth=mix(.30,.86,smoothstep(-.40,.52,broad))*mix(.76,1.0,narrow);
  // Cut an inset channel through the broad floor. The inside bench stays
  // shallower, leaving room for the sediment and runoff passes downstream.
  let inset=winding*.15*(1.0-smoothstep(.045,.23,cutWall));
  let pointBar=winding*.074*max(0.0,bank)*smoothstep(.07,.23,cutWall)*
    (1.0-smoothstep(.39,.62,cutWall));
  let canyonHeight=table-depth*max(1.0-profile,headcut)-inset+pointBar+debris;
  // Resistant beds recess softer sections of the wall. Fade them through
  // tributaries so the shelves break at gullies and at the foot of the cliff.
  let bed=canyon_bed(radial,canyonHeight,params.seed);
  let scarp=smoothstep(.19,.47,cutWall)*(1.0-smoothstep(.91,1.22,cutWall));
  let ledgeWeight=scarp*mix(.32,1.0,hardCap)*(1.0-smoothstep(.10,.48,max(tributary,headcut)));
  let ledges=ledgeWeight*clamp(bed.displacement,-.068,.068);
  let fit=smoothstep(-.66,.04,broad)*mix(.56,1.0,exposure);
  return fit*(canyonHeight+ledges-height);
}

fn graniteDome(cell:Voro3DMetrics,spread:f32)->f32{
  let center=pow(max(0.0,1.0-cell.f1Sq/spread),1.45);
  let interior=smoothstep(0.0,.24,cell.f2Sq-cell.f1Sq);
  return center*(.65+interior*mix(.04,.65,cell.cellVal));
}

fn studioGraniteRelief(radial:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>,granite:f32,texel:f32)->f32{
  let dir=radial*options.sphereFeatureDensity;
  let intrusion=simplex3D(dir*5.7+offset.zxy);
  let strike=normalize(offset.yzx-vec3<f32>(100.447,122.021,82.673));
  let along=dot(dir,strike);
  let hills=simplex3D(dir*13.0-offset+intrusion*.51);
  let knolls=simplex3D(dir*28.0+offset.yzx+hills*.59);
  let district=smoothstep(-.38,.46,intrusion+.39*hills);
  let field=dir*13.0-2.1*along*strike+offset+
    mix(.48,1.20,district)*vec3<f32>(.60*hills,.67*intrusion,.42*knolls);
  let coarse=voro3D_metrics(field);
  let mass=graniteDome(coarse,.92);
  let foothills=.46*broad+.15*hills+.059*knolls-.10;
  let outcrop=smoothstep(-.65,.37,intrusion+.28*hills);
  let packing=district*mix(.54,1.0,smoothstep(-.43,.52,knolls-.32*intrusion));
  var domes=mix(.31,.94,district)*mass;
  if(granite>.14 && outcrop>0.0){
    let medium=voro3D_metrics(field.yzx*2.14-offset.zxy);
    let knoll=graniteDome(medium,.83);
    let interstice=1.0-smoothstep(.45,.94,mass);
    domes+=smoothstep(.14,.49,granite)*mix(.09,.61,packing)*knoll*mix(.30,1.0,interstice);
    let fine=1.0-smoothstep(.004,.013,texel*options.sphereFeatureDensity);
    if(granite>.46 && fine>0.0){
      let blocks=voro3D_metrics(field.zxy*4.36-offset.yzx);
      domes+=fine*smoothstep(.46,.77,granite)*mix(.06,.17,packing)*graniteDome(blocks,.70);
    }
  }
  return foothills+outcrop*domes-height;
}

fn studio_mosaic(dir:vec3<f32>)->vec2<f32>{
  let key=params.seed*1664525u+1013904223u;
  let selection=key>>30u;
  let phase=f32(key&65535u)*(TWO_PI/65536.0);
  let bend=sin(dot(dir,vec3<f32>(-3.4,6.2,4.1))-phase);
  let belt=.72*sin(dot(dir,vec3<f32>(7.2,-4.6,3.8))+phase+.94*bend)+
    .28*sin(dot(dir,vec3<f32>(11.8,5.7,-7.3))-phase);
  return vec2<f32>(select(smoothstep(.15,.78,belt),0.0,selection==1u),
    select(smoothstep(.15,.78,-belt),0.0,selection==0u));
}

fn studioLandscape(dir:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>,canyon:f32)->f32{
  let mode=options.sphereLandscape;
  var mixWeights=vec2<f32>(select(0.0,1.0,mode==1u),select(0.0,1.0,mode==2u));
  if(mode==3u){mixWeights=studio_mosaic(dir);}
  if(mixWeights.x+mixWeights.y<=0.0){return height;}
  let province=simplex3D(dir*4.1+offset.yzx);
  let local=mix(1.0,smoothstep(-.58,.42,province),options.sphereBlend);
  let influence=options.sphereLandscapeStrength*select(local,1.0,mode==3u);
  let fold=simplex3D(dir*9.0-offset.zxy);
  if(mixWeights.x>0.0){
    // The broad profile sets the tablelands. Each contact has its own
    // elevation and thickness, and folds tilt whole runs of benches.
    let tilt=.09*fold+.08*dot(dir,vec3<f32>(.64,-.72,.38));
    let spacing=mix(.37,.65,smoothstep(-.65,.65,province+.27*fold));
    let column=(mix(broad,height,.80)-tilt)/spacing;
    let seed=params.seed+3167u;
    var layer=i32(floor(column));
    if(column<canyon_contact(layer,seed)){layer-=1;}
    let base=canyon_contact(layer,seed);
    let top=canyon_contact(layer+1,seed);
    let phase=clamp((column-base)/(top-base),0.0,1.0);
    let rim=mix(.38,.62,canyon_bed_random(layer,seed+9029u));
    let step=mix(phase,smoothstep(rim-.19,rim+.20,phase),.67);
    let table=(base+(top-base)*step)*spacing+tilt;
    let wash=abs(simplex3D(dir*23.0+offset.zxy+.97*fold));
    let cut=(1.0-smoothstep(.045,.32,wash))*.15;
    // Resistant horizons cross the region at different elevations. The
    // same eroded outline controls the apron, intermediate bench and cap.
    let block=simplex3D(dir*14.0+offset.zxy+.70*fold)+.24*simplex3D(dir*33.0-offset.yzx);
    let cap=.60+.36*province+.08*fold+tilt;
    let interval=mix(.21,.38,smoothstep(-.65,.65,fold-.28*province));
    let apron=smoothstep(-.48,-.27,block);
    let lowerCliff=smoothstep(-.28,-.10,block);
    let upperCliff=smoothstep(-.02,.16,block);
    let basin=mix(table-cut,min(table-cut,cap-1.85*interval),apron);
    let benchExposure=smoothstep(-.40,.53,fold+.31*province);
    let bench=mix(basin,cap-1.70*interval,mix(.24,.76,benchExposure)*apron);
    let shoulder=mix(bench,cap-.87*interval,lowerCliff);
    var landform=mix(shoulder,cap,upperCliff);
    let brokenRim=smoothstep(-.39,-.24,block)*(1.0-smoothstep(-.065,.085,block));
    if(brokenRim>0.0){
      // Closely spaced gullies isolate resistant fingers along some rims.
      // The pinnacles taper into the same bedrock as the adjoining cliffs.
      let weathering=smoothstep(-.05,.54,province+.65*fold);
      let fractures=abs(simplex3D(dir*47.0-offset.zxy+1.12*block));
      let ribs=(1.0-smoothstep(.055,.31,fractures))*brokenRim*weathering;
      let remnant=min(cap-.045,landform+interval*(.86+.56*wash));
      landform=mix(landform,max(landform,remnant),ribs);
    }
    let upland=smoothstep(-.98,-.26,broad);
    let strength=max(influence,options.sphereLandscapeStrength*smoothstep(.20,.68,canyon));
    let plateau=smoothstep(-.35,.45,province+.32*fold);
    return mix(height,landform,mixWeights.x*strength*upland*mix(.54,.91,plateau));
  }
  // Outward billows grow from the same coarse landscape. Smaller octaves
  // break up the shoulders while the host valleys remain between them.
  let p=dir*12.0+offset+vec3<f32>(.89*fold,.71*province,-.64*fold);
  let a=simplex3D(p);
  let b=simplex3D(p.yzx*2.07-offset.zxy+.68*a);
  let c=simplex3D(p.zxy*4.31+offset.yzx+.56*b);
  let d=simplex3D(p*8.91-offset+.51*c);
  let fbm=a+.49*b+.235*c+.106*d;
  let lobe=max(0.0,fbm+.31);
  let face=smoothstep(.04,.62,lobe);
  let ribs=1.0-smoothstep(.025,.32,abs(b+.46*c));
  return height+mixWeights.y*influence*(.64*lobe*min(.98,lobe)+.27*face*ribs-.10*face);
}

fn studioWindRelief(dir:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>,rock:vec4<f32>)->f32{
  let arid=studio_dryness(dir,rock,params.seed)*options.sphereBlend;
  if(arid<.025){return 0.0;}
  let wind=studio_wind_dir(params.seed);
  let along=dot(dir,wind);
  let across=dot(dir,vec3<f32>(-wind.z,0,wind.x));
  let warp=simplex3D(dir*11.0-offset.zxy);
  let corridor=simplex3D(vec3<f32>(along*10.0,across*37.0,dir.y*19.0)+offset.yzx+.55*warp);
  // Sand collects below the harder rock and thins across exposed uplands.
  let sediment=(1.0-smoothstep(.13,.58,broad))*(1.0-smoothstep(.10,.39,abs(height-broad)));
  let phase=fract(along*36.0+2.3*warp+.58*corridor+.28*cos(across*31.0+warp*3.1));
  let crest=mix(.50,.79,smoothstep(-.46,.46,warp));
  let dune=min(phase/crest,(1.0-phase)/(1.0-crest));
  let sand=sediment*smoothstep(-.63,.17,corridor)*(.37*dune*dune-.074-.75*(height-broad));
  // Wind runs along the resistant ribs. The soft material between them
  // wears into broad corridors that can still be cut by downstream runoff.
  let rib=studioRidge(corridor,.47);
  let erodible=smoothstep(-.53,.37,warp)*smoothstep(-.46,.15,broad);
  let abrasion=(1.0-sediment)*erodible*(.32*rib*rib-.19);
  let mesaRock=rock.y*smoothstep(-.02,.52,broad);
  return arid*smoothstep(.025,.13,arid)*(sand+abrasion)*(1.0-.65*mesaRock);
}

fn studioFaultRelief(dir:vec3<f32>,height:f32,broad:f32,offset:vec3<f32>,rock:vec4<f32>)->f32{
  let crystalline=4.0*rock.z*rock.w;
  let sedimentary=4.0*rock.y*rock.z;
  let susceptible=options.sphereBlend*(.37*rock.w+.67*crystalline+.36*sedimentary);
  if(susceptible<.025){return 0.0;}

  let strike=normalize(fract(offset*vec3<f32>(.109,.073,.127))-.5+vec3<f32>(.001));
  let east=normalize(cross(strike,select(vec3<f32>(0,1,0),vec3<f32>(1,0,0),abs(strike.y)>.9)));
  let plane=vec3<f32>(dot(dir,east),dot(dir,strike),dot(dir,cross(east,strike)));
  let extension=simplex3D(dir*4.6+offset.zxy);
  let activity=smoothstep(-.43,.37,extension);
  if(activity<=0.0){return 0.0;}
  let blocks=plane*vec3<f32>(15.0,5.0,10.0)+vec3<f32>(.84,.24,.45)*extension;
  let trace=simplex3D(blocks-offset);
  let relay=simplex3D(blocks*vec3<f32>(.74,2.7,1.6)+offset.yzx);

  // The hanging wall drops into the rift. Its footwall has a steep face
  // and a long tilted backslope. A relay passes the throw between strands.
  let slip=mix(.24,.76,smoothstep(-.56,.57,relay));
  let hanging=trace+.19*relay;
  let scarp=smoothstep(-.08,.135,hanging);
  let backSlope=1.0-smoothstep(.25,.97,hanging);
  let floor=1.0-smoothstep(.12,mix(.34,.68,slip),abs(hanging+.21));
  let outlet=smoothstep(.13,.57,abs(relay-.25*trace));
  let rift=floor*(.72+.28*outlet);
  let shoulder=scarp*backSlope*(.29+.17*slip);
  let shelf=smoothstep(.04,.20,hanging)*(1.0-smoothstep(.22,.41,hanging));
  let tilt=.17*scarp*hanging*smoothstep(-.49,.68,broad);
  let incision=(.42+.33*slip)*rift;
  // Preserve rough bedrock above the scarp and partially bury it on the
  // valley floor, where runoff will cut tributaries into the faulted blocks.
  let fill=.58*rift*(broad-height);
  return susceptible*activity*(shoulder+.10*shelf*crystalline-tilt-incision+fill);
}

// The same contact field runs through the whole sphere. It shapes rock
// where two provinces meet and leaves each pure province to its own profile.
fn studioContactRelief(dir:vec3<f32>,broad:f32,offset:vec3<f32>,rock:vec4<f32>)->f32{
  let graniteBelt=4.0*rock.x*rock.z;
  let tiltedBeds=4.0*rock.x*rock.y;
  let lavaPlateau=4.0*rock.w*rock.y;
  let sandstoneFins=4.0*rock.z*rock.y;
  let volcanicHighlands=4.0*rock.w*rock.x;
  let strength=graniteBelt+tiltedBeds+lavaPlateau+sandstoneFins+volcanicHighlands;
  if(strength<.008){return 0.0;}
  let uplift=smoothstep(-.57,.32,broad);
  if(uplift<=0.0){return 0.0;}

  let axis=normalize(fract(offset*vec3<f32>(.071,.113,.137))-.5+vec3<f32>(.001));
  let across=normalize(cross(axis,select(vec3<f32>(0,1,0),vec3<f32>(0,0,1),abs(axis.y)>.90)));
  let chart=vec3<f32>(dot(dir,across),dot(dir,cross(axis,across)),dot(dir,axis));
  let flexure=simplex3D(dir*6.3+offset.zxy);
  let belt=chart*vec3<f32>(22.0,8.0,11.0)+vec3<f32>(.68,.23,.39)*flexure;
  let line=simplex3D(belt+offset.yzx);
  let joints=simplex3D(belt*vec3<f32>(1.39,2.53,2.12)-offset+.24*line);

  // Granite ribs survive along the divide. Weathering widens the spaces
  // between them toward the domes and breaks their ends into rock steps.
  let rib=studioRidge(line,.81);
  let joint=1.0-smoothstep(.03,.26,abs(joints));
  let granite=.42*(rib*mix(.64,1.0,rib)-.29)-.14*joint*rib;

  // Folded beds leave triangular remnants on the softer flanks of a range.
  let dip=mix(.53,1.03,smoothstep(-.52,.52,flexure));
  let flank=abs(line)/select(dip,1.45-dip,line>0.0);
  let jointLine=abs(joints+.41*line);
  let wedge=max(0.0,min(1.0-flank,1.02-1.35*jointLine));
  let flankGully=smoothstep(.11,.46,flank)*(1.0-smoothstep(.84,1.24,flank))*
    smoothstep(.27,.61,jointLine);
  let flatiron=.77*wedge-.25*flankGully-.20;

  // Resistant lava caps a valley fill. Breaches in the cap become outlets
  // for runoff during the following erosion passes.
  let flow=smoothstep(-.42,.34,line+.37*flexure);
  let breach=1.0-smoothstep(.06,.42,abs(joints+.44*line));
  let cap=flow*mix(.19,.43,smoothstep(-.44,.44,flexure))*(1.0-.84*breach);
  let terrace=cap-.19*breach*smoothstep(.12,.76,flow)-.12;

  // Broken sedimentary ribs taper into the older crystalline floor. The
  // crest is offset by joints so the fins bend, break, and vary in length.
  let finAxis=abs(line+.21*joints);
  let fin=1.0-smoothstep(.08,.42,finAxis);
  let cover=smoothstep(-.48,.33,joints+.32*flexure);
  let shoulder=1.0-smoothstep(.23,.68,finAxis);
  let fins=cover*(.47*fin*fin+.15*shoulder)-.16;

  // Solid lava shoulders follow the flanks of the alpine divide. Glancing
  // fractures open into gullies while the harder flow tops remain above them.
  let flankRock=smoothstep(.14,.52,flank)*(1.0-smoothstep(.78,1.26,flank));
  let flowCap=smoothstep(-.42,.24,joints-.51*line)*flankRock;
  let spurCut=joint*smoothstep(.27,.93,flank);
  let basalt=.49*flowCap-.24*spurCut-.07;
  return uplift*smoothstep(.008,.065,strength)*
    (graniteBelt*granite+tiltedBeds*flatiron+lavaPlateau*terrace+
     sandstoneFins*fins+volcanicHighlands*basalt);
}

// Hotspots track an oblique arc. Older cones broaden and subside along it.
// The surrounding swell is wide enough for islands to emerge in ocean basins.
fn studioIslandArc(dir:vec3<f32>,broad:f32,texel:f32)->vec2<f32>{
  var height=0.0;
  var influence=0.0;
  var collapse=0.0;
  let density=options.sphereFeatureDensity;
  for(var chain=0u;chain<6u;chain++){
    let q=(seedOffset3(params.seed+chain*7302013u)-vec3<f32>(17.173,31.947,47.521))/
      vec3<f32>(131,137,149);
    let y=1.72*q.x-.86;
    let ring=sqrt(1.0-y*y);
    let angle=TWO_PI*q.y;
    let center=vec3<f32>(ring*cos(angle),y,ring*sin(angle));
    let span=max(0.0,2.0-2.0*dot(dir,center));
    if(span*density*density>.065){continue;}
    let east=vec3<f32>(-sin(angle),0,cos(angle));
    let course=normalize(east+(q.z-.5)*1.55*cross(center,east));
    if(q.z>.30){
      let tangent=cross(center,course);
      let flow=normalize(tangent+(q.y-.5)*course);
      let local=density*vec2<f32>(dot(dir,flow),dot(dir,cross(center,flow)));
      collapse=min(collapse,lava_tube_collapse(local,.047,mix(.12,.18,q.z),params.seed+chain*23179u,texel*density));
    }
    for(var i=0u;i<4u;i++){
      let age=f32(i)/3.0;
      let vent=normalize(center+course*((age-.50)*.22/density));
      let size=mix(.065,.029,age)*mix(.86,1.2,q.z)/density;
      let d=sqrt(max(0.0,2.0-2.0*dot(dir,vent)))/size;
      let tangent=normalize(course-vent*dot(vent,course));
      let local=vec2<f32>(dot(dir,tangent),dot(dir,cross(vent,tangent)))/size;
      let young=mix(.91,.37,age)*mix(.90,1.1,q.z);
      let shape=vec3<f32>(young,q.z,fract(q.x+age*1.7));
      let cone=volcanic_vent(local,shape,.065*simplex3D(dir*96.0+q*17.0));
      let pedestal=.32*(1.0-smoothstep(.22,1.64,d))*(1.0-smoothstep(-.60,.28,broad));
      height=max(height,cone+pedestal);
      influence=max(influence,1.0-smoothstep(.48,1.76,d));
    }
  }
  return vec2<f32>(height+collapse,influence);
}

@compute @workgroup_size(8,8,1)
fn computeStudioSphereRelief(@builtin(global_invocation_id) gid:vec3<u32>){
  let x=i32(gid.x)+frame.originX;
  let y=i32(gid.y)+frame.originY;
  let last=i32(frame.fullWidth)-1;
  if(x>last||y>last){return;}
  let col=x%last;
  let raw=studioSphereHeight(col,y,last);
  let step=PI/f32(last);
  let latitude=f32(y)*step;
  let longitude=2.0*f32(col)*step;
  let radial=sin(latitude);
  let dir=vec3<f32>(select(radial*cos(longitude),0.0,y==0||y==last),cos(latitude),
    select(radial*sin(longitude),0.0,y==0||y==last));
  var broad=raw;
  if(params.voroMode!=3u||options.sphereBlend>0.0){
    let spanY=max(1,i32(round(f32(last)*.017/options.sphereFeatureDensity)));
    let spanX=max(1,i32(round(f32(spanY)/max(.50,2.0*radial))));
    let around=studioSphereHeight(col-spanX,y-spanY,last)+studioSphereHeight(col+spanX,y-spanY,last)+
      studioSphereHeight(col-spanX,y+spanY,last)+studioSphereHeight(col+spanX,y+spanY,last);
    // The longitude box ceases to describe a square near a pole.
    broad=mix(raw,.28*raw+.18*around,smoothstep(.035,.155,radial));
  }
  let texel=step*max(1.0,2.0*radial);
  var regions=vec4<f32>(0);
  if(options.sphereRegion.z>0.0){regions=studio_region_map(dir);}
  storeRGBA(x,y,0,studio_sphere_relief(dir,raw,broad,texel,regions));
}

fn studio_sphere_relief(dir:vec3<f32>,raw:f32,broad:f32,texel:f32,regions:vec4<f32>)->vec4<f32>{
  let radial=length(dir.xz);
  let offset=seedOffset3(params.seed);
  var arc=vec2<f32>(0);
  if(options.sphereBlend>0.0){arc=studioIslandArc(dir,broad,texel);}
  var weights=regions;
  if(options.sphereRegion.z==0.0){weights=studioProvinces(dir,offset,arc.y);}
  var relief=0.0;
  if(weights.x>0.0){relief+=weights.x*studioMountainRange(dir,raw,broad,offset);}
  if(weights.z>0.0){relief+=weights.z*studioGraniteRelief(dir,raw,broad,offset,weights.z,texel);}
  if(weights.w>0.0){
    let volcanic=studioVolcanicRelief(dir,texel);
    let craters=studioVolcanicCraterFields(dir,broad,weights.w);
    relief+=weights.w*(volcanic.x+craters.x+max(volcanic.y,craters.y)*(broad-raw));
  }
  if(weights.y>0.0){
    // Broad caprock takes over inside sandstone country while the
    // existing province weights still blend it into neighboring ranges.
    let caprock=smoothstep(.10,.76,weights.y);
    relief=relief*((1.0-caprock)/max(.001,1.0-weights.y))+
      caprock*studioCanyonRelief(dir,raw,broad,offset);
  }
  relief+=studioContactRelief(dir,broad,offset,weights);
  relief+=studioWindRelief(dir,raw,broad,offset,weights);
  relief+=studioFaultRelief(dir,raw,broad,offset,weights);
  // A hot island can interrupt its host province without a terrain seam.
  relief+=arc.x*options.sphereBlend;
  var cap=0.0;
  if(radial<.23){
    // Reintroduce midsize landforms where longitude-based erosion fades.
    // The noise is evaluated in 3D, so ridges continue across the pole.
    let folds=simplex3D(dir*27.0+offset.zxy);
    let crest=studioRidge(simplex3D(dir*49.0-offset+folds*.69),.75);
    let rubble=simplex3D(dir*79.0+offset.yzx);
    let sharp=mix(.16,.26,weights.x+weights.y*.6);
    cap=(1.0-smoothstep(.075,.23,radial))*(.11*folds+.68*sharp*(crest*crest-.36)+.052*rubble);
  }
  var height=raw+relief+cap;
  if(options.sphereLandscape!=0u&&options.sphereLandscapeStrength>0.0){
    height=studioLandscape(dir,height,broad,offset,weights.y);
  }
  return vec4<f32>(height,weights.yzw);
}

fn applyStudioSphereErosion(gid:vec3<u32>,mountain:bool){
  let x=i32(gid.x)+frame.originX;
  let y=i32(gid.y)+frame.originY;
  let last=i32(frame.fullWidth)-1;
  if(x>last||y>last){return;}
  let col=x%last;
  let sample=loadPrevRGBA(col,y,0);
  let h=sample.x;
  let canyon=sample.y;
  let regional=options.sphereBlend>0.0;
  let ranges=params.voroMode<=1u||regional;
  if(y==0||y==last||(!mountain&&ranges&&!regional)){
    storeRGBA(x,y,0,sample);
    return;
  }
  let step=PI/f32(last);
  let latitude=f32(y)*step;
  let longitude=2.0*f32(col)*step;
  let radial=sin(latitude);
  let dir=vec3<f32>(radial*cos(longitude),cos(latitude),radial*sin(longitude));
  let east=vec3<f32>(-sin(longitude),0,cos(longitude));
  let north=cross(east,dir);
  var rise:vec2<f32>;
  var bankBend=vec2<f32>(0);
  if(mountain){
    // The angular window stays wide on smaller bakes and near the poles.
    let guideY=max(2,i32(round(f32(last)*select(.012,.0045,ranges))));
    let guideX=max(1,i32(round(f32(guideY)/max(.5,2.0*radial))));
    rise=vec2<f32>(
      (studioSphereHeight(col+guideX,y,last)-studioSphereHeight(col-guideX,y,last))/f32(guideX),
      (studioSphereHeight(col,y-guideY,last)-studioSphereHeight(col,y+guideY,last))/f32(guideY)
    );
  }else{
    // The local gullies read the mountain cuts from the previous dispatch.
    let localX=studioSphereHeight(col+1,y,last)-studioSphereHeight(col-1,y,last);
    let localY=studioSphereHeight(col,y-1,last)-studioSphereHeight(col,y+1,last);
    let wideHigh=vec2<f32>(studioSphereHeight(col+4,y,last),studioSphereHeight(col,y-4,last));
    let wideLow=vec2<f32>(studioSphereHeight(col-4,y,last),studioSphereHeight(col,y+4,last));
    rise=mix(vec2<f32>(localX,localY),(wideHigh-wideLow)*.25,.76);
    if(canyon>0.0){
      // Match the angular span along both axes without fetching more heights.
      let ratio=max(.5,2.0*radial);
      let referenceSpan=(.023/(4.0*step))*(f32(last)/1000.0);
      bankBend=(wideHigh+wideLow-2.0*h)*vec2<f32>(1.0/(ratio*ratio),1.0)*referenceSpan;
    }
  }
  let dx=rise.x/(4.0*step*max(radial,.03));
  let dy=rise.y/(2.0*step);
  let grade=vec2<f32>(dx,dy);
  let angularSample=step*max(1.0,2.0*radial);
  storeRGBA(x,y,0,vec4<f32>(studio_point_erosion(dir,sample,grade,east*dx+north*dy,bankBend,
    angularSample,mountain,ranges),sample.yzw));
}

fn studio_point_erosion(dir:vec3<f32>,sample:vec4<f32>,rise:vec2<f32>,gradient:vec3<f32>,
  bankBend:vec2<f32>,angularSample:f32,mountain:bool,ranges:bool)->f32{
  let h=sample.x;
  let canyon=sample.y;
  let granite=sample.z;
  let volcanic=sample.w;
  let alpine=clamp(1.0-canyon-granite-volcanic,0.0,1.0);
  let grade=.023*length(gradient);
  let mountainWear=smoothstep(.042,.25,grade)*select(1.0,.50,params.voroMode==3u);
  let rangeWear=smoothstep(-.58,.10,h)*mix(.82,1.0,mountainWear);
  let localWear=smoothstep(.06,.43,grade)*(canyon+.55*volcanic+.10*granite);
  let wear=select(
    select(smoothstep(.06,.43,grade),mountainWear,mountain),
    select(localWear,rangeWear*(1.16*alpine+.15*canyon+.45*volcanic+.12*granite),mountain),
    ranges);
  let polar=smoothstep(.055,.25,length(dir.xz));
  if(wear<=0.0){
    return h;
  }
  let blend=smoothstep(-.19,.19,dir.y);
  var delta=0.0;
  if(blend>0.0){
    let chart=studioErosionChart(dir,gradient,1.0,angularSample);
    if(mountain){delta+=blend*studioMountainCut(chart,h,ranges);}
    else{delta+=blend*studioGullyCut(chart,h);}
  }
  if(blend<1.0){
    let chart=studioErosionChart(dir,gradient,-1.0,angularSample);
    if(mountain){delta+=(1.0-blend)*studioMountainCut(chart,h,ranges);}
    else{delta+=(1.0-blend)*studioGullyCut(chart,h);}
  }
  delta*=wear;
  if(mountain){
    let eroded=h+polar*delta;
    let upland=max(0.0,eroded-.42);
    // Compress the vertical relief of the upper mountain belt. Crests and
    // branch cuts keep their shapes while broad slopes keep a wider base.
    let compression=.29*upland*upland/(.34+upland)*polar*alpine;
    return eroded-compression;
  }
  let elevation=h+delta;
  var ledge=0.0;
  if(canyon>0.0){
    let strata=canyon_bed(dir,elevation,params.seed);
    let resistant=smoothstep(.25,.83,strata.cement);
    let gully=canyon_gully_wear(rise,bankBend,grade,-delta);
    let exposure=smoothstep(.075,.49,grade)*
      (1.0-mix(.64,.24,resistant)*smoothstep(.025,.22,-delta));
    // Recess the shelf through the tributary and leave the adjacent spur proud.
    ledge+=canyon*(.72*strata.displacement*exposure*(1.0-mix(.89,.63,resistant)*gully)-.087*gully);
  }
  if(volcanic>0.0&&grade>.12){
    let flowBed=basalt_flow(dir,elevation,params.seed);
    let exposure=volcanic*smoothstep(.12,.56,grade);
    let scour=smoothstep(.02,.20,-delta);
    ledge+=exposure*((1.0+.72*alpine)*flowBed.displacement-.065*flowBed.ash*scour);
  }
  return h+polar*(delta+ledge);
}

@compute @workgroup_size(8,8,1)
fn computeStudioSphereMountainErosion(@builtin(global_invocation_id) gid:vec3<u32>){
  applyStudioSphereErosion(gid,true);
}

@compute @workgroup_size(8,8,1)
fn computeStudioSphereErosion(@builtin(global_invocation_id) gid:vec3<u32>){
  applyStudioSphereErosion(gid,false);
}

@compute @workgroup_size(8, 8, 1)
fn computeTerrainNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  let pos = fetchPos(fx, fy, fz);
  let v0 = generateTerrainNoise(pos, params);
  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeSmokeNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  let pos = fetchPos(fx, fy, fz);
  let v0 = generateSmokeNoise(pos, params);
  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeHydrologyErosionHeightfield(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (readFrom3D() || writeTo3D()) {
    return;
  }

  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  let src = loadPrevClamped2D(fx, fy, fz);
  let pos = fetchPos(fx, fy, fz);

  var baseHeight = src.x;
  var guideHeight = src.x;
  let rawSlope = resolveFiniteSlope2D(fx, fy, fz);
  var guideSlope = rawSlope;

  if (params.turbulence != 0u) {
    baseHeight = src.w;
    guideHeight = src.x;
    guideSlope = src.yz;

    if (length(guideSlope) < 1e-8) {
      guideSlope = rawSlope;
    }
  }

  let steerSlope = mix(rawSlope, guideSlope, 0.82);
  let fadeHeight = mix(baseHeight, guideHeight, 0.35);

  var erosionScale = params.zoom;
  if (abs(erosionScale) < 1e-6) {
    erosionScale = 0.15;
  }

  var domainScale = params.freq;
  if (abs(domainScale) < 1e-6) {
    domainScale = 1.0;
  }

  var erosionStrength = options.heightScale;
  if (abs(erosionStrength) < 1e-6) {
    erosionStrength = 1.0;
  }
  erosionStrength *= 0.22;

  var gullyWeight = params.exp1;
  if (abs(gullyWeight) < 1e-6) {
    gullyWeight = 0.5;
  }

  var carrierWeight = max(params.edgeK, 0.0);
  if (carrierWeight < 1e-6) {
    carrierWeight = 0.24;
  }
  carrierWeight = clamp01(carrierWeight);

  var steeringWeight = max(params.time, 0.0);
  if (steeringWeight < 1e-6) {
    steeringWeight = 1.10;
  }

  var detail = params.seedAngle;
  if (abs(detail) < 1e-6) {
    detail = 1.5;
  }

  var fadeScale = params.exp2;
  if (abs(fadeScale) < 1e-6) {
    fadeScale = 1.6666667;
  }

  var cellScale = params.threshold;
  if (abs(cellScale) < 1e-6) {
    cellScale = 0.7;
  }

  var normalization = params.rippleFreq;
  if (abs(normalization) < 1e-6) {
    normalization = 0.5;
  }
  normalization = clamp01(normalization);

  var assumedSlopeValue = params.warpAmp;
  if (abs(assumedSlopeValue) < 1e-6) {
    assumedSlopeValue = 0.7;
  }
  assumedSlopeValue = max(assumedSlopeValue, 1e-4);

  var assumedSlopeMix = params.gaborRadius;
  if (abs(assumedSlopeMix) < 1e-6) {
    assumedSlopeMix = 1.0;
  }
  assumedSlopeMix = clamp01(assumedSlopeMix);

  var onsetScale = params.terraceStep;
  if (abs(onsetScale) < 1e-6) {
    onsetScale = 8.0;
  }
  onsetScale = max(onsetScale / 8.0, 1e-4);

  let rounding = vec4<f32>(
    0.10,
    0.00,
    0.10,
    max(params.lacunarity, 1.0)
  );

  let onset = vec4<f32>(
    1.25,
    1.25,
    2.80,
    1.50
  ) * onsetScale;

  let assumedSlope = vec2<f32>(assumedSlopeValue, assumedSlopeMix);

  let seedShift = vec2<f32>(
    f32(params.seed & 65535u) * 0.00001173,
    f32((params.seed >> 16u) & 65535u) * 0.00000937
  );

  let domainP =
    pos.xy * domainScale +
    vec2<f32>(params.xShift, params.yShift) +
    seedShift;

  let fadeTarget = clamp(((fadeHeight - 0.5 + params.zShift) * 2.0) * fadeScale, -1.0, 1.0);
  let pixelSpan = pixelSpan2D(fx, fy, fz);

  var ridgeMap = 0.0;
  let h = erosionFilter(
    domainP,
    vec3<f32>(baseHeight, steerSlope.x, steerSlope.y),
    fadeTarget,
    erosionStrength,
    gullyWeight,
    carrierWeight,
    steeringWeight,
    detail,
    rounding,
    onset,
    assumedSlope,
    erosionScale,
    max(params.octaves, 1u),
    max(params.lacunarity, 1.0),
    max(params.gain, 1e-4),
    cellScale,
    normalization,
    pixelSpan,
    &ridgeMap
  );

  let terrainHeightOffsetConst = options.baseRadius;

  let offset = terrainHeightOffsetConst * h.w;

  let erodedHeight = baseHeight + h.x + offset;
  let outSlope = steerSlope + h.yz;
  let ridgeMapEncoded = clamp01(ridgeMap * 0.5 + 0.5);

  storeRGBA(
    fx,
    fy,
    fz,
    vec4<f32>(erodedHeight, outSlope.x, outSlope.y, ridgeMapEncoded)
  );
}

@compute @workgroup_size(8, 8, 1)
fn computeHydrologyGuideField(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (readFrom3D() || writeTo3D()) {
    return;
  }

  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  let src = loadPrevClamped2D(fx, fy, fz);
  let rawHeight = src.x;

  var sigma = abs(params.threshold);
  if (sigma < 1e-6) {
    sigma = 0.90;
  }

  var guideBlend = params.exp1;
  if (abs(guideBlend) < 1e-6) {
    guideBlend = 0.35;
  }
  guideBlend = clamp01(guideBlend);

  let blurredC = guideHeightAt(fx, fy, fz, sigma);
  let blurredL = guideHeightAt(fx - 1, fy, fz, sigma);
  let blurredR = guideHeightAt(fx + 1, fy, fz, sigma);
  let blurredD = guideHeightAt(fx, fy - 1, fz, sigma);
  let blurredU = guideHeightAt(fx, fy + 1, fz, sigma);

  let guideHeight = mix(rawHeight, blurredC, guideBlend);
  let guideL = mix(loadPrevClamped2D(fx - 1, fy, fz).x, blurredL, guideBlend);
  let guideR = mix(loadPrevClamped2D(fx + 1, fy, fz).x, blurredR, guideBlend);
  let guideD = mix(loadPrevClamped2D(fx, fy - 1, fz).x, blurredD, guideBlend);
  let guideU = mix(loadPrevClamped2D(fx, fy + 1, fz).x, blurredU, guideBlend);

  let pL = fetchPosClamped2D(fx - 1, fy, fz);
  let pR = fetchPosClamped2D(fx + 1, fy, fz);
  let pD = fetchPosClamped2D(fx, fy - 1, fz);
  let pU = fetchPosClamped2D(fx, fy + 1, fz);

  let dx = max(abs(pR.x - pL.x), 1e-6);
  let dy = max(abs(pU.y - pD.y), 1e-6);

  let guideSlopeX = (guideR - guideL) / dx;
  let guideSlopeY = (guideU - guideD) / dy;

  storeRGBA(
    fx,
    fy,
    fz,
    vec4<f32>(guideHeight, guideSlopeX, guideSlopeY, rawHeight)
  );
}

fn computeHydroDrainageField(fx: i32, fy: i32, fz: i32) -> vec4<f32> {
  let coarseSigma = 1.75;

  let hC = blurredHeightAt(fx, fy, fz, coarseSigma);
  let hL = blurredHeightAt(fx - 1, fy, fz, coarseSigma);
  let hR = blurredHeightAt(fx + 1, fy, fz, coarseSigma);
  let hD = blurredHeightAt(fx, fy - 1, fz, coarseSigma);
  let hU = blurredHeightAt(fx, fy + 1, fz, coarseSigma);

  let pL = fetchPosClamped2D(fx - 1, fy, fz);
  let pR = fetchPosClamped2D(fx + 1, fy, fz);
  let pD = fetchPosClamped2D(fx, fy - 1, fz);
  let pU = fetchPosClamped2D(fx, fy + 1, fz);

  let dx = max(abs(pR.x - pL.x), 1e-6);
  let dy = max(abs(pU.y - pD.y), 1e-6);

  let slope = vec2<f32>(
    (hR - hL) / dx,
    (hU - hD) / dy
  );

  let flowDir = -safeNormalize2(slope);

  let ridgeBroad = blurredRidgeAt(fx, fy, fz, 1.6);
  let valleyPrior = 1.0 - smoothstep(-0.12, 0.08, ridgeBroad);

  let valleyDepth = max(0.0, (hL + hR + hD + hU) * 0.25 - hC);
  let concavityGain = max(abs(params.edgeK), 1e-4) * 36.0;
  let concavityMask = clamp01(valleyDepth * concavityGain);

  let slopeOnset = max(abs(params.warpAmp), 1e-4);
  let slopeMask = easeOut(clamp01(length(slope) / slopeOnset));

  let contrast = max(abs(params.exp1), 1e-4);
  let gain = max(abs(params.exp2), 1e-4);

  var drainage = valleyPrior * concavityMask * slopeMask;
  drainage = pow(clamp01(drainage), contrast);
  drainage = clamp01(drainage * gain);

  return vec4<f32>(
    drainage,
    valleyPrior,
    flowDir.x * 0.5 + 0.5,
    flowDir.y * 0.5 + 0.5
  );
}

@compute @workgroup_size(8, 8, 1)
fn computeHydrologyDrainageMask(@builtin(global_invocation_id) gid: vec3<u32>) {
  if (readFrom3D() || writeTo3D()) {
    return;
  }

  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  let outCol = computeHydroDrainageField(fx, fy, fz);
  storeRGBA(fx, fy, fz, outCol);
}

// Shared tiling constants
const WGX : u32 = 8u;
const WGY : u32 = 8u;
const TILE_W : u32 = WGX + 2u; // 1 texel halo on each side
const TILE_H : u32 = WGY + 2u;

// Per-kernel workgroup tiles at module scope
var<workgroup> normalTile  : array<array<f32, TILE_W>, TILE_H>;
var<workgroup> normal8Tile : array<array<f32, TILE_W>, TILE_H>;
var<workgroup> volumeTile  : array<array<f32, TILE_W>, TILE_H>;
var<workgroup> sphereTile  : array<array<f32, TILE_W>, TILE_H>;

// Height fetch
fn sampleHeight(x: i32, y: i32, z: i32) -> f32 { if (readFrom3D()) { return textureLoad(inputTex3D, vec3<i32>(x, y, clampZ(z)), 0).x; } return textureLoad(inputTex, vec2<i32>(x, y), frame.layerIndex, 0).x; } fn safeNormalize(v: vec3<f32>) -> vec3<f32> { let len2 = dot(v, v); if (len2 > 1e-12) { return v * inverseSqrt(len2); } return vec3<f32>(0.0, 0.0, 1.0); }

@compute @workgroup_size(WGX, WGY, 1)
fn computeNormal(@builtin(global_invocation_id) gid: vec3<u32>,
                 @builtin(local_invocation_id)  lid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let wMax = i32(frame.fullWidth)  - 1;
  let hMax = i32(frame.fullHeight) - 1;

  let tx = i32(lid.x) + 1;
  let ty = i32(lid.y) + 1;

  let cx = clamp(fx, 0, wMax);
  let cy = clamp(fy, 0, hMax);

  // center
  normalTile[u32(ty)][u32(tx)] = sampleHeight(cx, cy, fz);

  // 1-texel halo
  if (lid.x == 0u)               { normalTile[u32(ty)][0u]               = sampleHeight(clamp(cx - 1, 0, wMax), cy, fz); }
  if (lid.x == WGX - 1u)         { normalTile[u32(ty)][TILE_W - 1u]      = sampleHeight(clamp(cx + 1, 0, wMax), cy, fz); }
  if (lid.y == 0u)               { normalTile[0u][u32(tx)]               = sampleHeight(cx, clamp(cy - 1, 0, hMax), fz); }
  if (lid.y == WGY - 1u)         { normalTile[TILE_H - 1u][u32(tx)]      = sampleHeight(cx, clamp(cy + 1, 0, hMax), fz); }
  if (lid.x == 0u && lid.y == 0u) {
    normalTile[0u][0u]            = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy - 1, 0, hMax), fz);
  }
  if (lid.x == WGX - 1u && lid.y == 0u) {
    normalTile[0u][TILE_W - 1u]   = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy - 1, 0, hMax), fz);
  }
  if (lid.x == 0u && lid.y == WGY - 1u) {
    normalTile[TILE_H - 1u][0u]   = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }
  if (lid.x == WGX - 1u && lid.y == WGY - 1u) {
    normalTile[TILE_H - 1u][TILE_W - 1u] = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }

  workgroupBarrier();

  // 4-neighbor central differences
  let zC = normalTile[u32(ty)][u32(tx)];
  let zL = normalTile[u32(ty)][u32(tx - 1)];
  let zR = normalTile[u32(ty)][u32(tx + 1)];
  let zD = normalTile[u32(ty - 1)][u32(tx)];
  let zU = normalTile[u32(ty + 1)][u32(tx)];

  let dx = (zR - zL) * 0.5;
  let dy = (zU - zD) * 0.5;

  let n   = normalize(vec3<f32>(dx, dy, 1.0));
  let enc = n * 0.5 + vec3<f32>(0.5);

  // pack: .r = original height, .g = enc.y, .b = enc.x, .a = enc.z
  let outCol = vec4<f32>(zC, enc.y, enc.x, enc.z);
  storeRGBA(cx, cy, fz, outCol);
}

// 8-neighbor filtered gradient using the same tile
@compute @workgroup_size(WGX, WGY, 1)
fn computeNormal8(@builtin(global_invocation_id) gid: vec3<u32>,
                  @builtin(local_invocation_id)  lid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let wMax = i32(frame.fullWidth)  - 1;
  let hMax = i32(frame.fullHeight) - 1;

  let tx = i32(lid.x) + 1;
  let ty = i32(lid.y) + 1;

  let cx = clamp(fx, 0, wMax);
  let cy = clamp(fy, 0, hMax);

  // center
  normal8Tile[u32(ty)][u32(tx)] = sampleHeight(cx, cy, fz);

  // halo
  if (lid.x == 0u)                    { normal8Tile[u32(ty)][0u]               = sampleHeight(clamp(cx - 1, 0, wMax), cy, fz); }
  if (lid.x == WGX - 1u)              { normal8Tile[u32(ty)][TILE_W - 1u]      = sampleHeight(clamp(cx + 1, 0, wMax), cy, fz); }
  if (lid.y == 0u)                    { normal8Tile[0u][u32(tx)]               = sampleHeight(cx, clamp(cy - 1, 0, hMax), fz); }
  if (lid.y == WGY - 1u)              { normal8Tile[TILE_H - 1u][u32(tx)]      = sampleHeight(cx, clamp(cy + 1, 0, hMax), fz); }
  if (lid.x == 0u && lid.y == 0u)     { normal8Tile[0u][0u]                    = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy - 1, 0, hMax), fz); }
  if (lid.x == WGX - 1u && lid.y == 0u) {
    normal8Tile[0u][TILE_W - 1u]      = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy - 1, 0, hMax), fz);
  }
  if (lid.x == 0u && lid.y == WGY - 1u) {
    normal8Tile[TILE_H - 1u][0u]      = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }
  if (lid.x == WGX - 1u && lid.y == WGY - 1u) {
    normal8Tile[TILE_H - 1u][TILE_W - 1u] = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }

  workgroupBarrier();

  let zC  = normal8Tile[u32(ty)][u32(tx)];
  let zL  = normal8Tile[u32(ty)][u32(tx - 1)];
  let zR  = normal8Tile[u32(ty)][u32(tx + 1)];
  let zD  = normal8Tile[u32(ty - 1)][u32(tx)];
  let zU  = normal8Tile[u32(ty + 1)][u32(tx)];
  let zUL = normal8Tile[u32(ty + 1)][u32(tx - 1)];
  let zUR = normal8Tile[u32(ty + 1)][u32(tx + 1)];
  let zDL = normal8Tile[u32(ty - 1)][u32(tx - 1)];
  let zDR = normal8Tile[u32(ty - 1)][u32(tx + 1)];

  let dx = ((zR + zUR + zDR) - (zL + zUL + zDL)) / 3.0;
  let dy = ((zU + zUR + zUL) - (zD + zDR + zDL)) / 3.0;

  let n   = normalize(vec3<f32>(dx, dy, 1.0));
  let enc = n * 0.5 + vec3<f32>(0.5);
  let outCol = vec4<f32>(zC, enc.y, enc.x, enc.z);
  storeRGBA(cx, cy, fz, outCol);
}

fn encode01(v: vec3<f32>) -> vec3<f32> {
    return v * 0.5 + vec3<f32>(0.5);
}

// Volume normals: tile the XY plane and only sample Z neighbors per pixel
@compute @workgroup_size(WGX, WGY, 1)
fn computeNormalVolume(@builtin(global_invocation_id) gid: vec3<u32>,
                       @builtin(local_invocation_id)  lid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let wMax = i32(frame.fullWidth)  - 1;
  let hMax = i32(frame.fullHeight) - 1;

  let tx = i32(lid.x) + 1;
  let ty = i32(lid.y) + 1;

  let cx = clamp(fx, 0, wMax);
  let cy = clamp(fy, 0, hMax);

  // center slice values once per tile
  volumeTile[u32(ty)][u32(tx)] = sampleHeight(cx, cy, fz);
  if (lid.x == 0u)                    { volumeTile[u32(ty)][0u]               = sampleHeight(clamp(cx - 1, 0, wMax), cy, fz); }
  if (lid.x == WGX - 1u)              { volumeTile[u32(ty)][TILE_W - 1u]      = sampleHeight(clamp(cx + 1, 0, wMax), cy, fz); }
  if (lid.y == 0u)                    { volumeTile[0u][u32(tx)]               = sampleHeight(cx, clamp(cy - 1, 0, hMax), fz); }
  if (lid.y == WGY - 1u)              { volumeTile[TILE_H - 1u][u32(tx)]      = sampleHeight(cx, clamp(cy + 1, 0, hMax), fz); }
  if (lid.x == 0u && lid.y == 0u)     { volumeTile[0u][0u]                    = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy - 1, 0, hMax), fz); }
  if (lid.x == WGX - 1u && lid.y == 0u) {
    volumeTile[0u][TILE_W - 1u]       = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy - 1, 0, hMax), fz);
  }
  if (lid.x == 0u && lid.y == WGY - 1u) {
    volumeTile[TILE_H - 1u][0u]       = sampleHeight(clamp(cx - 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }
  if (lid.x == WGX - 1u && lid.y == WGY - 1u) {
    volumeTile[TILE_H - 1u][TILE_W - 1u] = sampleHeight(clamp(cx + 1, 0, wMax), clamp(cy + 1, 0, hMax), fz);
  }

  workgroupBarrier();

  let zC = volumeTile[u32(ty)][u32(tx)];
  let zL = volumeTile[u32(ty)][u32(tx - 1)];
  let zR = volumeTile[u32(ty)][u32(tx + 1)];
  let zD = volumeTile[u32(ty - 1)][u32(tx)];
  let zU = volumeTile[u32(ty + 1)][u32(tx)];

  let dx = (zR - zL) * 0.5;
  let dy = (zU - zD) * 0.5;

  let zB = sampleHeight(cx, cy, clampZ(fz - 1));
  let zF = sampleHeight(cx, cy, clampZ(fz + 1));
  let dz = (zF - zB) * 0.5;

  let n   = safeNormalize(vec3<f32>(dx, dy, dz));
  let enc = encode01(n);
  storeRGBA(cx, cy, fz, vec4<f32>(enc, zC));
}


fn wrapSphereLon(lon: i32, width: i32) -> i32 {
    let segments = max(width - 1, 1);
    return ((lon % segments) + segments) % segments;
}

fn loadSphereHeight(lon: i32, lat: i32, width: i32, height: i32, layer: i32) -> f32 {
    let x = wrapSphereLon(lon, width);
    let y = clamp(lat, 0, height - 1);
    return textureLoad(inputTex, vec2<i32>(x, y), layer, 0).x;
}

fn sphereUnitFromAngles(theta: f32, phi: f32) -> vec3<f32> {
    let sTh = sin(theta);
    return vec3<f32>(sTh * cos(phi), sTh * sin(phi), cos(theta));
}

fn sphereSurfacePos(lat: i32, theta: f32, phi: f32, heightValue: f32, maxLat: i32) -> vec3<f32> {
    let r = options.baseRadius + heightValue * options.heightScale;

    if (lat <= 0) {
        return vec3<f32>(0.0, 0.0, r);
    }

    if (lat >= maxLat) {
        return vec3<f32>(0.0, 0.0, -r);
    }

    return sphereUnitFromAngles(theta, phi) * r;
}

// Sphere normals with logical longitude wrapping.
// The mesh keeps a duplicate seam column at lon == segments for Babylon/UVs, but
// the sampler treats longitude as modulo segments. This keeps lon 0 and lon N
// numerically identical and avoids the hard normal/color seam that shows up as a
// zipper around the planet.
@compute @workgroup_size(WGX, WGY, 1)
fn computeSphereNormal(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let w  = i32(frame.fullWidth);
    let h  = i32(frame.fullHeight);

    if (fx < 0 || fy < 0 || fx >= w || fy >= h) {
        return;
    }

    let segments = max(w - 1, 1);
    let maxLat = h - 1;
    let lon = wrapSphereLon(fx, w);
    let lat = clamp(fy, 0, maxLat);

    let baseH = loadSphereHeight(lon, lat, w, h, frame.layerIndex);
    let dPhi = 2.0 * PI / f32(segments);
    let dTheta = PI / f32(max(maxLat, 1));
    let theta = f32(lat) * dTheta;
    let phi = f32(lon) * dPhi;

    var n: vec3<f32>;

    if (lat <= 0) {
        n = vec3<f32>(0.0, 0.0, 1.0);
    } else if (lat >= maxLat) {
        n = vec3<f32>(0.0, 0.0, -1.0);
    } else {
        let hW = loadSphereHeight(lon - 1, lat, w, h, frame.layerIndex);
        let hE = loadSphereHeight(lon + 1, lat, w, h, frame.layerIndex);
        let hS = loadSphereHeight(lon, lat - 1, w, h, frame.layerIndex);
        let hN = loadSphereHeight(lon, lat + 1, w, h, frame.layerIndex);

        let pW = sphereSurfacePos(lat, theta, phi - dPhi, hW, maxLat);
        let pE = sphereSurfacePos(lat, theta, phi + dPhi, hE, maxLat);
        let pS = sphereSurfacePos(lat - 1, theta - dTheta, phi, hS, maxLat);
        let pN = sphereSurfacePos(lat + 1, theta + dTheta, phi, hN, maxLat);

        let tLon = pE - pW;
        let tLat = pN - pS;
        let radial = sphereUnitFromAngles(theta, phi);
        n = safeNormalize(cross(tLat, tLon));

        if (dot(n, radial) < 0.0) {
            n = -n;
        }
    }

    let enc = n * 0.5 + vec3<f32>(0.5);
    textureStore(outputTex, vec2<i32>(fx, fy), frame.layerIndex, vec4<f32>(baseH, enc.x, enc.y, enc.z));
}


// Texture clear to reset channel(s)
@compute @workgroup_size(8, 8, 1)
fn clearTexture(@builtin(global_invocation_id) gid : vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  writeChannel(fx, fy, fz, 0.0, options.outputChannel, 1u);
}

// \u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014
// 0) Perlin
// \u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014
@compute @workgroup_size(8, 8, 1)
fn computePerlin(@builtin(global_invocation_id) gid : vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);

    // fetch the 3D position for this pixel
    let p  = fetchPos(fx, fy, fz);

    // generate one sample of Perlin noise
    let v0 = generatePerlin(p, params);

    // add it into the selected channel (or all channels) of the output
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 0.1) Perlin 4D (fBM using time as W)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computePerlin4D(@builtin(global_invocation_id) gid : vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);

    // fetch the 3D position for this pixel (w comes from params.time inside the generator)
    let p  = fetchPos(fx, fy, fz);

    // generate one sample of 4D Perlin fBM (uses params.time as 4th dim)
    let v0 = generatePerlin4D(p, params);

    // write into output
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 1) Billow
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeBillow(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateBillow(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 2) AntiBillow
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiBillow(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiBillow(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 3) Ridge
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRidge(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRidge(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 4) AntiRidge
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiRidge(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiRidge(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 5) RidgedMultifractal
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRidgedMultifractal(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRidgedMultifractal(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 6) RidgedMultifractal2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRidgedMultifractal2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRidgedMultifractal2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 7) RidgedMultifractal3
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRidgedMultifractal3(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRidgedMultifractal3(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 8) RidgedMultifractal4
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRidgedMultifractal4(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRidgedMultifractal4(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 9) AntiRidgedMultifractal
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiRidgedMultifractal(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiRidgedMultifractal(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 10) AntiRidgedMultifractal2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiRidgedMultifractal2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiRidgedMultifractal2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 11) AntiRidgedMultifractal3
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiRidgedMultifractal3(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiRidgedMultifractal3(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 12) AntiRidgedMultifractal4
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiRidgedMultifractal4(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiRidgedMultifractal4(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 13) FBM (2\xB7simplex chain)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFBM(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFBM(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 14) FBM2 (chain+zoom FBM)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFBM2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFBM2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 15) FBM3 (three-stage FBM chain)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFBM3(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFBM3(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 16) CellularBM1
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellularBM1(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateCellularBM1(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 17) CellularBM2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellularBM2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateCellularBM2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 18) CellularBM3
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellularBM3(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateCellularBM3(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 19) VoronoiBM1
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM1(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiBM1(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 20) VoronoiBM2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiBM2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 21) VoronoiBM3
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM3(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiBM3(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 22) Cellular
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellular(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateCellular(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  22.1) AntiCellular
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
@compute @workgroup_size(8, 8, 1)
fn computeAntiCellular(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiCellular(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 22.2) Cellular
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellular4D(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateCellular4D(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  22.3) AntiCellular
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
@compute @workgroup_size(8, 8, 1)
fn computeAntiCellular4D(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiCellular4D(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 23) Worley
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeWorley(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateWorley(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

/*\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
  23.1) AntiWorley
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500*/
@compute @workgroup_size(8, 8, 1)
fn computeAntiWorley(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateAntiWorley(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 23.2) Worley 4D (fBM using time as W)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeWorley4D(@builtin(global_invocation_id) gid : vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);

    // fetch the 3D position for this pixel (w comes from params.time inside the generator)
    let p  = fetchPos(fx, fy, fz);

    // generate one sample of 4D Worley fBM (uses params.time as 4th dim)
    let v0 = generateWorley4D(p, params);

    // write into output
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 23.3) Worley 4D (fBM using time as W)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeAntiWorley4D(@builtin(global_invocation_id) gid : vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);

    // fetch the 3D position for this pixel (w comes from params.time inside the generator)
    let p  = fetchPos(fx, fy, fz);

    // generate one sample of 4D Worley fBM (uses params.time as 4th dim)
    let v0 = generateAntiWorley4D(p, params);

    // write into output
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Worley 4D BM variants (time as W)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM1_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM1_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM2_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM2_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM3_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM3_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM1_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM1_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM2_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM2_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeWorleyBM3_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateWorleyBM3_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}


// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// Cellular 4D BM variants (time as W)
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeCellularBM1_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM1_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeCellularBM2_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM2_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeCellularBM3_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM3_4D(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeCellularBM1_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM1_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeCellularBM2_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM2_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeCellularBM3_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let p = fetchPos(fx, fy, fz);
  let v0 = generateCellularBM3_4D_vec(p, params);

  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 24) VoronoiTileNoise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiTileNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiTileNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 25) LanczosBillow
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeLanczosBillow(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateLanczosBillow(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 26) LanczosAntiBillow
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeLanczosAntiBillow(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateLanczosAntiBillow(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 27) Voronoi Circle-Gradient Noise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiCircleNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiCircleNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 28) Voronoi Circle-Gradient Tile Noise 2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiCircle2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiCircle2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 29) Voronoi Flat-Shade Tile Noise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiFlatShade(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiFlatShade(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 30) Voronoi Ripple 3D
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiRipple3D(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiRipple3D(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 31) Voronoi Ripple 3D 2
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiRipple3D2(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiRipple3D2(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 32) Voronoi Circular Ripple 3D
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeVoronoiCircularRipple(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateVoronoiCircularRipple(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 33) Fractal Voronoi Ripple 3D
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFVoronoiRipple3D(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFVoronoiRipple3D(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 34) Fractal Voronoi Circular Ripple 3D
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFVoronoiCircularRipple(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFVoronoiCircularRipple(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 35) Ripple Noise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeRippleNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateRippleNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 36) Fractal Ripples
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeFractalRipples(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateFractalRipples(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 37) HexWorms
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeHexWorms(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateHexWormsNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 38) PerlinWorms
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computePerlinWorms(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generatePerlinWormsNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 39) White Noise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeWhiteNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateWhiteNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// 40) Blue Noise
// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
@compute @workgroup_size(8, 8, 1)
fn computeBlueNoise(@builtin(global_invocation_id) gid: vec3<u32>) {
    let fx = i32(frame.originX) + i32(gid.x);
    let fy = i32(frame.originY) + i32(gid.y);
    let fz = i32(frame.originZ) + i32(gid.z);
    let p  = fetchPos(fx, fy, fz);
    let v0 = generateBlueNoise(p, params);
    writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

// 41) Simplex
@compute @workgroup_size(8,8,1)
fn computeSimplex(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  let v0 = generateSimplex(p, params);
  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeSimplexFBM(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  let v0 = generateSimplexFBM(p, params);
  writeChannel(fx, fy, fz, v0, options.outputChannel, 0u);
}


@compute @workgroup_size(8,8,1)
fn computeCurl2D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let pos = fetchPos(fx, fy, fz).xy;
  let v   = curl2_simplex2D(pos, params);
  // gentle gain so it doesn\u2019t clip hard; tweak 0.75 if you like
  let m   = mag_to_signed01(length(v) * 0.75);

  writeChannel(fx, fy, fz, m, options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeCurlFBM2D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);

  let pos = fetchPos(fx, fy, fz).xy;
  let v   = curl2_simplexFBM(pos, params);
  let m   = mag_to_signed01(length(v) * 0.75);

  writeChannel(fx, fy, fz, m, options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeDomainWarpFBM1(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM1(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeDomainWarpFBM2(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM2(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeGaborAnisotropic(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateGaborAniso(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeGaborMagic(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateGaborMagic(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeTerraceNoise(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateTerraceNoise(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeFoamNoise(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateFoamNoise(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeTurbulence(@builtin(global_invocation_id) gid: vec3<u32>){
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateTurbulence(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeBillow4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateBillow4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeAntiBillow4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateAntiBillow4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeLanczosBillow4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateLanczosBillow4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeLanczosAntiBillow4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateLanczosAntiBillow4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeFBM4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateFBM4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8,8,1)
fn computeVoronoi4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoi4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM1_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM1_4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM2_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM2_4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM3_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM3_4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM1_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM1_4D_vec(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM2_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM2_4D_vec(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeVoronoiBM3_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateVoronoiBM3_4D_vec(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeDomainWarpFBM1_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM1_4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeDomainWarpFBM2_4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM2_4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeDomainWarpFBM1_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM1_4D_vec(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeDomainWarpFBM2_4D_vec(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateDomainWarpFBM2_4D_vec(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeTerraceNoise4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateTerraceNoise4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeFoamNoise4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateFoamNoise4D(p, params), options.outputChannel, 0u);
}

@compute @workgroup_size(8, 8, 1)
fn computeTurbulence4D(@builtin(global_invocation_id) gid: vec3<u32>) {
  let fx = i32(frame.originX) + i32(gid.x);
  let fy = i32(frame.originY) + i32(gid.y);
  let fz = i32(frame.originZ) + i32(gid.z);
  let p  = fetchPos(fx, fy, fz);
  writeChannel(fx, fy, fz, generateTurbulence4D(p, params), options.outputChannel, 0u);
}



// too slow to compile all at once due to branching, had to write new entry point logic
// fn computeMixedNoise(pos : vec3<f32>) -> f32 {
//     var result   : f32 = 0.0;
//     var paramIdx : u32 = 0u;

//     // copy the mask so we can eat bits out of it
//     var bits : u32 = options.mask;

//     // while there's still a set bit, handle just that one
//     loop {
//         // bail as soon as we've consumed all bits
//         if (bits == 0u) {
//             break;
//         }

//         // find the lowest set bit index
//         let i : u32 = firstTrailingBit(bits);

//         // clear that bit so next iteration finds the next one
//         bits = bits & (bits - 1u);

//         // load this algo's params
//         let p = params[paramIdx];
//         paramIdx = paramIdx + 1u;

//         // dispatch the one selected generator
//         var v : f32 = 0.0;
//         switch(i) {
//             case 0u:  { v = generatePerlin(pos, p); }
//             // case 1u:  { v = generateBillow(pos, p); }
//             // case 2u:  { v = generateAntiBillow(pos, p); }
//             // case 3u:  { v = generateRidge(pos, p); }
//             // case 4u:  { v = generateAntiRidge(pos, p); }
//             // case 5u:  { v = generateRidgedMultifractal(pos, p); }
//             // case 6u:  { v = generateRidgedMultifractal2(pos, p); }
//             // case 7u:  { v = generateRidgedMultifractal3(pos, p); }
//             // case 8u:  { v = generateRidgedMultifractal4(pos, p); }
//             // case 9u:  { v = generateAntiRidgedMultifractal(pos, p); }
//             // case 10u: { v = generateAntiRidgedMultifractal2(pos, p); }
//             // case 11u: { v = generateAntiRidgedMultifractal3(pos, p); }
//             // case 12u: { v = generateAntiRidgedMultifractal4(pos, p); }
//             // case 13u: { v = generateFBM(pos, p); }
//             // case 14u: { v = generateFBM2(pos, p); }
//             // case 15u: { v = generateFBM3(pos, p); }
//             // case 16u: { v = generateCellularBM1(pos, p); }
//             // case 17u: { v = generateCellularBM2(pos, p); }
//             // case 18u: { v = generateCellularBM3(pos, p); }
//             // case 19u: { v = generateVoronoiBM1(pos, p); }
//             // case 20u: { v = generateVoronoiBM2(pos, p); }
//             // case 21u: { v = generateVoronoiBM3(pos, p); }
//             // case 22u: { v = generateCellular(pos, p); }
//             // case 23u: { v = generateWorley(pos, p); }
//             // case 24u: { v = generateVoronoiTileNoise(pos, p); }
//             // case 25u: { v = generateLanczosBillow(pos, p); }
//             // case 26u: { v = generateLanczosAntiBillow(pos, p); }
//             //todo port the rest, also more generic ones like white/blue noise
//             default:  { /* unsupported bit \u2192 no contribution */ }
//         }

//         result = result + v;

//         // stop if we've reached the max slots you filled
//         if (paramIdx >= MAX_NOISE_CONFIGS) {
//             break;
//         }
//     }

//     return result;
// }

// \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 Compute Entry \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
// @compute @workgroup_size(8, 8, 1)
// fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
//     // 2) compute absolute pixel coords in the full output
//     let fx = i32(frame.originX) + i32(gid.x);
//     let fy = i32(frame.originY) + i32(gid.y);
//     let p = fetchPos(fx, fy);

//     // 4) compute the mixed noise height
//     let h = computeMixedNoise(p);

//     // 5) (optional) finite-difference normal
//     var out: vec4<f32>;
//     if (options.getGradient == 1u) {
//         // let ex = options.epsilon.x;
//         // let ey = options.epsilon.y;
//         // let ez = options.epsilon.z;

//         // let hx = computeMixedNoise(p + vec3<f32>(ex, 0.0, 0.0));
//         // let lx = computeMixedNoise(p - vec3<f32>(ex, 0.0, 0.0));
//         // let hy = computeMixedNoise(p + vec3<f32>(0.0, ey, 0.0));
//         // let ly = computeMixedNoise(p - vec3<f32>(0.0, ey, 0.0));
//         // let hz = computeMixedNoise(p + vec3<f32>(0.0, 0.0, ez));
//         // let lz = computeMixedNoise(p - vec3<f32>(0.0, 0.0, ez));

//         // var dx = (hx - lx) / (2.0 * ex);
//         // var dy = (hy - ly) / (2.0 * ey);
//         // var dz = (hz - lz) / (2.0 * ez);
//         // let invLen = 1.0 / max(1e-6, sqrt(dx*dx + dy*dy + dz*dz));
//         // dx *= invLen; dy *= invLen; dz *= invLen;

//         // out = vec4<f32>(h, dx, dy, dz);
//     } else {
//         out = vec4<f32>(h, h, h, h);
//     }

//   // 6) write into the layer of the 2D-array texture
//   textureStore(
//     outputTex,
//     vec2<i32>(fx, fy),
//     frame.layerIndex,
//     out
//   );
// }



// 5x5 Gaussian blur (separable weights via shared tile, single-pass)
// Applies per-channel convolution on RGBA and writes rgba16f
// If options.outputChannel == 0, writes all channels
// If 1..4, only that channel is replaced with blurred value, others copied from source

const WG_X : u32 = 16u;
const WG_Y : u32 = 16u;
const R    : u32 = 2u;        // kernel radius for 5x5
const TILE_SIZE : u32 = TILE_W * TILE_H;

const G5 : array<f32, 5> = array<f32,5>(1.0, 4.0, 6.0, 4.0, 1.0);
const G5NORM : f32 = 1.0 / 256.0;

var<workgroup> tileRGBA : array<vec4<f32>, TILE_SIZE>;

fn tileIndex(x: u32, y: u32)->u32 {
  return y * TILE_W + x;
}

@compute @workgroup_size(WG_X, WG_Y, 1)
fn computeGauss5x5(
  @builtin(local_invocation_id)  lid: vec3<u32>,
  @builtin(workgroup_id)         wid: vec3<u32>,
  @builtin(global_invocation_id) gid: vec3<u32>
){
  // Workgroup top-left in full image space
  let wgOx = i32(frame.originX) + i32(wid.x) * i32(WG_X);
  let wgOy = i32(frame.originY) + i32(wid.y) * i32(WG_Y);
  let fz   = i32(frame.originZ) + i32(gid.z);

  // Cooperatively load a (WG_X+4) x (WG_Y+4) tile with a 2px halo
  var ty: u32 = lid.y;
  loop {
    if (ty >= TILE_H) { break; }
    var tx: u32 = lid.x;
    loop {
      if (tx >= TILE_W) { break; }
      let sx = clamp(wgOx + i32(tx) - i32(R), 0, i32(frame.fullWidth)  - 1);
      let sy = clamp(wgOy + i32(ty) - i32(R), 0, i32(frame.fullHeight) - 1);
      tileRGBA[tileIndex(tx, ty)] = loadPrevRGBA(sx, sy, fz);
      tx += WG_X;
    }
    ty += WG_Y;
  }
  workgroupBarrier();

  // Output pixel this thread is responsible for
  let fx = wgOx + i32(lid.x);
  let fy = wgOy + i32(lid.y);

  // Guard writes that might fall off the image on the final groups
  if (fx < 0 || fy < 0 || fx >= i32(frame.fullWidth) || fy >= i32(frame.fullHeight)) {
    return;
  }

  // Center within the shared tile
  let txc = u32(lid.x) + R;
  let tyc = u32(lid.y) + R;

  // 5x5 Gaussian using separable weights via outer product on the tile
  var acc : vec4<f32> = vec4<f32>(0.0);
  for (var j: u32 = 0u; j < 5u; j = j + 1u) {
    let wy = G5[j];
    let tyN = u32(i32(tyc) + i32(j) - 2);
    for (var i: u32 = 0u; i < 5u; i = i + 1u) {
      let wx = G5[i];
      let txN = u32(i32(txc) + i32(i) - 2);
      let w = (wx * wy) * G5NORM;
      acc += tileRGBA[tileIndex(txN, tyN)] * w;
    }
  }

  // Channel selection: 0 -> write all, 1..4 -> replace that channel only
  var outCol = acc;
  if (options.outputChannel != 0u) {
    let src = loadPrevRGBA(fx, fy, fz);
    let c = options.outputChannel;
    outCol = src;
    if (c == 1u) { outCol.x = acc.x; }
    else if (c == 2u) { outCol.y = acc.y; }
    else if (c == 3u) { outCol.z = acc.z; }
    else if (c == 4u) { outCol.w = acc.w; }
  }

  storeRGBA(fx, fy, fz, outCol);
}
`;var Kt=`struct CanyonBed {
  displacement:f32,
  phase:f32,
  cement:f32,
  iron:f32,
  thickness:f32,
  lowerShelf:f32,
}

fn canyon_bed_random(layer:i32,seed:u32)->f32{
  var h=bitcast<u32>(layer)*0x9e3779b9u+seed;
  h=(h^(h>>16u))*0x7feb352du;
  h=(h^(h>>15u))*0x846ca68bu;
  return f32((h^(h>>16u))>>8u)/16777216.0;
}

fn canyon_contact(layer:i32,seed:u32)->f32{
  // Every contact stays inside its interval, so even the thinnest beds
  // stay in order as a formation dips and changes thickness.
  return f32(layer)+mix(.10,.76,canyon_bed_random(layer,seed));
}

fn canyon_bed(dir:vec3<f32>,height:f32,seed:u32)->CanyonBed{
  let salt=6.2831853*canyon_bed_random(11,seed);
  let orientation=seed^(seed>>13u);
  let strike=select(dir,dir.yzx,(orientation&1u)!=0u);
  let p=select(strike,strike.zxy,(orientation&2u)!=0u)*
    vec3<f32>(select(1.0,-1.0,(orientation&4u)!=0u),1.0,select(1.0,-1.0,(orientation&8u)!=0u));
  let fold=sin(dot(p,vec3<f32>(6.4,-8.9,4.8))+salt);
  let bend=sin(dot(p,vec3<f32>(-13.0,3.8,11.0))+.63*fold+salt);
  let province=smoothstep(-.8,.8,fold+.38*bend);
  let datum=dot(p,vec3<f32>(.33,-.27,.16))+.103*fold+.036*bend;
  let spacing=mix(.155,.395,province);
  let column=(height-datum)/spacing;
  var layer=i32(floor(column));
  if(column<canyon_contact(layer,seed)){layer-=1;}
  let bottom=canyon_contact(layer,seed);
  let top=canyon_contact(layer+1,seed);
  let phase=clamp((column-bottom)/(top-bottom),0.0,1.0);
  let cement=canyon_bed_random(layer,seed+3931u);
  let resistance=smoothstep(.16,.84,cement);
  let center=mix(.34,.67,canyon_bed_random(layer,seed+7207u));
  let transition=mix(.30,.075,resistance);
  let ramp=smoothstep(center-transition,center+transition,phase);
  // Where a bed is strongly cemented, a thinner ledge can split away from
  // the main face. It pinches back into the formation across the fold.
  let split=smoothstep(-.40,.61,bend-.31*fold)*smoothstep(.40,.85,cement);
  let lower=center-mix(.12,.21,province);
  let lowerRamp=smoothstep(lower-.053,lower+.072,phase);
  let profile=mix(ramp,lowerRamp,.44*split);
  let shelf=split*smoothstep(lower-.11,lower-.025,phase)*
    (1.0-smoothstep(lower+.048,lower+.126,phase));
  let thickness=(top-bottom)*spacing;
  let displacement=(profile-phase)*thickness*mix(.21,.98,resistance)*mix(.72,1.0,province);
  let iron=canyon_bed_random(layer,seed+19687u);
  let below=canyon_bed_random(layer-1,seed+19687u);
  let above=canyon_bed_random(layer+1,seed+19687u);
  let stain=iron+.5*(below-iron)*(1.0-smoothstep(0.0,.19,phase))+
    .5*(above-iron)*smoothstep(.81,1.0,phase);
  return CanyonBed(displacement,phase,cement,stain,thickness,shelf);
}

fn canyon_gully_wear(slope:vec2<f32>,bend:vec2<f32>,grade:f32,cut:f32)->f32{
  // Estimate the hollow across the fall line. Bends down the slope alone
  // often mark intact rock steps and should keep their profile.
  let crossSlope=slope.yx*slope.yx;
  let hollow=dot(bend,crossSlope)/max(dot(slope,slope),.001);
  return smoothstep(.016,.12,hollow)*smoothstep(.019,.155,cut)*smoothstep(.09,.38,grade);
}

struct BasaltFlow {
  displacement:f32,
  cap:f32,
  ash:f32,
  thickness:f32,
}

// Lava flows pond and thicken unevenly. Thin ash beds weather back between
// the hardened flows, especially where runoff already incises the slope.
fn basalt_flow(dir:vec3<f32>,height:f32,seed:u32)->BasaltFlow{
  let salt=6.2831853*canyon_bed_random(29,seed);
  let bend=sin(dot(dir,vec3<f32>(8.5,-5.2,11.3))+salt);
  let pond=sin(dot(dir,vec3<f32>(-5.8,11.3,4.6))+.83*bend-salt);
  let bedding=dot(dir,vec3<f32>(.19,.31,-.24))+.088*bend+.032*pond;
  let spacing=mix(.115,.315,smoothstep(-.94,.94,.56*bend+.68*pond));
  let units=(height-bedding)/spacing;
  let contacts=seed+5573u;
  var layer=i32(floor(units));
  if(units<canyon_contact(layer,contacts)){layer-=1;}
  let base=canyon_contact(layer,contacts);
  let top=canyon_contact(layer+1,contacts);
  let phase=clamp((units-base)/(top-base),0.0,1.0);
  let solid=smoothstep(.12,.86,canyon_bed_random(layer,seed+5399u)+.14*pond);
  let lip=mix(.43,.69,canyon_bed_random(layer,seed+7109u));
  let ramp=smoothstep(lip-mix(.29,.16,solid),lip+mix(.23,.08,solid),phase);
  let cap=solid*smoothstep(lip-.07,lip+.09,phase)*(1.0-smoothstep(.89,1.0,phase));
  let ash=mix(.92,.32,solid)*smoothstep(0.0,.13,phase)*(1.0-smoothstep(lip-.13,lip+.03,phase));
  let thickness=(top-base)*spacing;
  return BasaltFlow((ramp-phase)*thickness*mix(.20,.89,solid),cap,ash,thickness);
}
`;var $t=`fn studio_wind_dir(seed:u32)->vec3<f32>{
  let heading=6.283185307*f32(seed&65535u)/65536.0;
  return vec3<f32>(cos(heading),0.0,sin(heading));
}

fn studio_dryness(dir:vec3<f32>,rock:vec4<f32>,seed:u32)->f32{
  let phase=6.283185307*f32(seed>>16u)/65536.0;
  let belt=1.0-smoothstep(.43,.81,abs(dir.y));
  let lee=.78*sin(dot(dir,vec3<f32>(4.0,2.0,-5.52))+phase)+
    .40*sin(dot(dir,vec3<f32>(-8.7,3.3,-5.4))-.71*phase);
  let supply=min(1.0,1.42*(rock.y+.78*rock.w+.36*rock.z));
  return belt*supply*smoothstep(-.67,.47,lee);
}
`;var Qt=`// Closed summit bowls have irregular rims. The same profile can describe
// a low breached shield or a steep cinder cone with a narrow summit vent.
fn volcanic_vent(p:vec2<f32>,shape:vec3<f32>,rimNoise:f32)->f32{
  // The vent is offset from the foot of the cone. In its seeded local
  // orientation, unequal lobes form a broken lip and slump on one flank.
  let drift=vec2<f32>(.13*(shape.z-.5),.09*(shape.y-.5));
  let q=p-drift*(1.0-smoothstep(.22,1.0,length(p)));
  let warped=vec2<f32>(q.x+.24*(shape.z-.5)*q.y,q.y*mix(.68,1.48,shape.y));
  let r=length(warped);
  let heading=warped/max(r,.08);
  let crown=heading.x*(heading.x*heading.x-3.0*heading.y*heading.y);
  let shoulder=2.0*heading.x*heading.y;
  let lip=mix(.35,.25,shape.x)*(1.0+mix(.08,.19,shape.y)*crown+
    mix(-.12,.15,shape.z)*shoulder);
  let d=r+1.34*rimNoise*smoothstep(.08,.30,r)*(1.0-smoothstep(.65,1.25,r));
  let flank=smoothstep(0.0,.09,d-lip)*clamp((d-lip)/(1.36-lip),0.0,1.0);
  let cone=pow(1.0-flank,mix(2.6,1.25,shape.x)+.31*heading.y);
  let bowl=1.0-smoothstep(lip*.26,lip*1.04,d);
  let rim=smoothstep(lip*.69,lip,d)*(1.0-smoothstep(lip*1.05,lip*1.52,d));
  let breach=smoothstep(.42,.91,shape.z)*smoothstep(.045,.34,q.y)*
    (1.0-smoothstep(.06,.36,abs(q.x+.34*q.y)));
  let edge=1.0-smoothstep(1.05,1.45,length(p));
  return edge*(mix(.27,.99,shape.x)*cone-mix(.28,.63,shape.y)*bowl+
    (.12+.045*shoulder)*rim-(.12+.38*rim)*cone*breach);
}

fn volcanic_caldera(p:vec2<f32>,shape:vec3<f32>,rimNoise:f32)->f32{
  let r=length(p*vec2<f32>(1.0,mix(.83,1.23,shape.x)));
  let d=r+rimNoise*smoothstep(.22,.66,r);
  let floor=1.0-smoothstep(.29,.88,d);
  let rim=smoothstep(.68,.96,d)*(1.0-smoothstep(1.0,1.42,d));
  let breach=smoothstep(.60,.92,shape.z)*smoothstep(.28,.78,p.y)*
    (1.0-smoothstep(.14,.46,abs(p.x+.24*p.y)));
  let apron=1.0-smoothstep(.54,1.45,d);
  return .13*apron+mix(.25,.48,shape.x)*rim*(1.0-.68*breach)-mix(.35,.74,shape.y)*floor;
}

fn lava_tube_collapse(p:vec2<f32>,radius:f32,reach:f32,seed:u32,texel:f32)->f32{
  let start=.72*radius;
  if(p.x<start||p.x>=reach||abs(p.y)>.033||texel>=.024){return 0.0;}
  let step=mix(.034,.055,canyon_bed_random(4,seed));
  let along=(p.x-start)/step;
  let segment=i32(floor(along));
  let profile=canyon_bed_random(segment,seed+1723u);
  if(profile<.23){return 0.0;}
  let offset=mix(.39,.61,canyon_bed_random(segment,seed+6857u));
  let width=mix(.008,.016,canyon_bed_random(segment,seed+2671u));
  let taper=smoothstep(start,start+step*.65,p.x)*(1.0-smoothstep(reach-step*.56,reach,p.x));
  let bend=sin(along*1.58+6.2831853*canyon_bed_random(7,seed));
  let cross=abs(p.y-width*(.72*bend+.29*sin(along*3.39+.6*bend)));
  let lengthwise=abs(fract(along)-offset)/mix(.18,.34,profile);
  let d=length(vec2<f32>(lengthwise,cross/width));
  let wall=1.0-smoothstep(.31,1.0,d);
  let resolution=1.0-smoothstep(width*.78,width*1.44,texel);
  return -mix(.055,.205,profile)*wall*taper*resolution;
}
`;var St=`// Fullscreen quad (module-scope constant)\r
const kQuad : array<vec2<f32>, 6> = array<vec2<f32>, 6>(\r
  vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),\r
  vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)\r
);\r
\r
struct VsOut {\r
  @builtin(position) pos : vec4<f32>,\r
  @location(0)       uv  : vec2<f32>,\r
};\r
\r
@vertex\r
fn vs_main(@builtin(vertex_index) i : u32) -> VsOut {\r
  let p = kQuad[i];\r
\r
  var o : VsOut;\r
  o.pos = vec4<f32>(p, 0.0, 1.0);\r
  o.uv  = p * 0.5 + vec2<f32>(0.5, 0.5);\r
  return o;\r
}\r
\r
@group(0) @binding(0) var samp : sampler;\r
@group(0) @binding(1) var tex  : texture_2d_array<f32>;\r
\r
struct UBlit2D {\r
  layer   : u32,\r
  channel : u32,\r
  _pad0   : u32,\r
  _pad1   : u32,\r
};\r
@group(0) @binding(2) var<uniform> U : UBlit2D;\r
\r
@fragment\r
fn fs_main(in : VsOut) -> @location(0) vec4<f32> {\r
  // For array textures the signature is (tex, sampler, uv, arrayIndex, level)\r
  let c = textureSampleLevel(tex, samp, in.uv, i32(U.layer), 0.0);\r
\r
  // display a single channel directly\r
  var v = c.r;\r
  if (U.channel == 2u) { v = c.g; }\r
  if (U.channel == 3u) { v = c.b; }\r
  if (U.channel == 4u) { v = c.a; }\r
\r
  return vec4<f32>(clamp(v, 0.0, 1.0));\r
}\r
`;var Pt=`const kQuad : array<vec2<f32>, 6> = array<vec2<f32>, 6>(\r
  vec2<f32>(-1.0, -1.0), vec2<f32>( 1.0, -1.0), vec2<f32>(-1.0,  1.0),\r
  vec2<f32>(-1.0,  1.0), vec2<f32>( 1.0, -1.0), vec2<f32>( 1.0,  1.0)\r
);\r
\r
struct VsOut {\r
  @builtin(position) pos : vec4<f32>,\r
  @location(0)       uv  : vec2<f32>,\r
};\r
\r
@vertex\r
fn vs_main(@builtin(vertex_index) i : u32) -> VsOut {\r
  let p = kQuad[i];\r
  var o : VsOut;\r
  o.pos = vec4<f32>(p, 0.0, 1.0);\r
  o.uv  = p * 0.5 + vec2<f32>(0.5, 0.5);\r
  return o;\r
}\r
\r
@group(0) @binding(0) var samp : sampler;\r
@group(0) @binding(1) var tex3d : texture_3d<f32>;\r
\r
struct UBlit3D {\r
  zNorm   : f32,  // normalized depth [0..1]\r
  channel : u32,\r
  _pad0   : u32,\r
  _pad1   : u32,\r
};\r
@group(0) @binding(2) var<uniform> U : UBlit3D;\r
\r
@fragment\r
fn fs_main(in : VsOut) -> @location(0) vec4<f32> {\r
  let coord = vec3<f32>(in.uv, clamp(U.zNorm, 0.0, 1.0));\r
  let c = textureSample(tex3d, samp, coord);\r
\r
  // display a single channel directly\r
  var v = c.r;\r
  if (U.channel == 2u) { v = c.g; }\r
  if (U.channel == 3u) { v = c.b; }\r
  if (U.channel == 4u) { v = c.a; }\r
\r
  return vec4<f32>(clamp(v, 0.0, 1.0));\r
}\r
`;var Jt=4096;var Dt=2048,Ha=8,tt=class{constructor(e,t){this.device=e,this.queue=t,this.maxBufferChunkBytes=8e6,this.entryPoints=["computePerlin","computeBillow","computeAntiBillow","computeRidge","computeAntiRidge","computeRidgedMultifractal","computeRidgedMultifractal2","computeRidgedMultifractal3","computeRidgedMultifractal4","computeAntiRidgedMultifractal","computeAntiRidgedMultifractal2","computeAntiRidgedMultifractal3","computeAntiRidgedMultifractal4","computeFBM","computeFBM2","computeFBM3","computeCellularBM1","computeCellularBM2","computeCellularBM3","computeVoronoiBM1","computeVoronoiBM2","computeVoronoiBM3","computeCellular","computeWorley","computeAntiCellular","computeAntiWorley","computeLanczosBillow","computeLanczosAntiBillow","computeVoronoiTileNoise","computeVoronoiCircleNoise","computeVoronoiCircle2","computeVoronoiFlatShade","computeVoronoiRipple3D","computeVoronoiRipple3D2","computeVoronoiCircularRipple","computeFVoronoiRipple3D","computeFVoronoiCircularRipple","computeRippleNoise","computeFractalRipples","computeHexWorms","computePerlinWorms","computeWhiteNoise","computeBlueNoise","computeSimplex","computeSimplexFBM","computeCurl2D","computeCurlFBM2D","computeDomainWarpFBM1","computeDomainWarpFBM2","computeGaborAnisotropic","computeGaborMagic","computeGaborFlow","computeTerraceNoise","computeFoamNoise","computeTurbulence","computePerlin4D","computeWorley4D","computeAntiWorley4D","computeCellular4D","computeAntiCellular4D","computeBillow4D","computeAntiBillow4D","computeLanczosBillow4D","computeLanczosAntiBillow4D","computeFBM4D","computeVoronoi4D","computeVoronoiBM1_4D","computeVoronoiBM2_4D","computeVoronoiBM3_4D","computeVoronoiBM1_4D_vec","computeVoronoiBM2_4D_vec","computeVoronoiBM3_4D_vec","computeWorleyBM1_4D","computeWorleyBM2_4D","computeWorleyBM3_4D","computeWorleyBM1_4D_vec","computeWorleyBM2_4D_vec","computeWorleyBM3_4D_vec","computeCellularBM1_4D","computeCellularBM2_4D","computeCellularBM3_4D","computeCellularBM1_4D_vec","computeCellularBM2_4D_vec","computeCellularBM3_4D_vec","computeTerraceNoise4D","computeFoamNoise4D","computeTurbulence4D","computeSmokeNoise","computeTerrainNoise","computeHydrologyErosionHeightfield","computeStudioSphereErosion","computeHydrologyGuideField","computeHydrologyDrainageMask","computeGauss5x5","computeNormal","computeNormal8","computeSphereNormal","computeNormalVolume","clearTexture","computeStudioSphereRelief","computeStudioSphereMountainErosion"],this.shaderModule=e.createShaderModule({code:Kt+$t+Qt+Zt}),this.bindGroupLayout=e.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:7,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"3d"}},{binding:8,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"3d"}}]}),this.pipelineLayout=e.createPipelineLayout({bindGroupLayouts:[this.bindGroupLayout]}),this.pipelines=new Map,this._texPairs=new Map,this._tid=null,this._tag=new WeakMap,this._default2DKey="__default2d",this._volumeCache=new Map,this.viewA=null,this.viewB=null,this.width=0,this.height=0,this.layers=1,this.isA=!0,this._initBuffers(),this._ensureDummies(),this._ctxMap=new WeakMap}_initBuffers(){this.optionsBuffer?.destroy(),this.paramsBuffer?.destroy(),this.permBuffer?.destroy(),this.nullPosBuffer?.destroy(),this.optionsBuffer=this.device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.paramsBuffer=this.device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.permBuffer=this.device.createBuffer({size:512*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.nullPosBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.queue.writeBuffer(this.optionsBuffer,0,new ArrayBuffer(96)),this.queue.writeBuffer(this.paramsBuffer,0,new ArrayBuffer(96)),this.queue.writeBuffer(this.permBuffer,0,new Uint32Array(512))}_ensureDummies(){this._dummy2D_sampleTex||(this._dummy2D_sampleTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy2D_sampleView=this._dummy2D_sampleTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy2D_writeTex||(this._dummy2D_writeTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy2D_writeView=this._dummy2D_writeTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy3D_sampleTex||(this._dummy3D_sampleTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy3D_sampleView=this._dummy3D_sampleTex.createView({dimension:"3d"})),this._dummy3D_writeTex||(this._dummy3D_writeTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy3D_writeView=this._dummy3D_writeTex.createView({dimension:"3d"}))}_getMaxBufferChunkBytes(e){let t=this.device?.limits?.maxBufferSize??268435456,a=Math.max(1024*1024,Math.floor(t*.9)),r=Number.isFinite(e)?Math.floor(e):this.maxBufferChunkBytes;return(!Number.isFinite(r)||r<=0)&&(r=this.maxBufferChunkBytes),r=Math.max(4,r)&-4,Math.min(a,r)}_writeBufferChunked(e,t,a,r,o,f=null){let c=o|0;if(!(c>0))return;let s=this._getMaxBufferChunkBytes(f),n=0;for(;n<c;){let p=Math.min(s,c-n)|0;if(p=p&-4,p<=0)break;this.queue.writeBuffer(e,t+n|0,a,r+n|0,p),n=n+p|0}if(n!==c)throw new Error(`_writeBufferChunked: incomplete write ${n}/${c} bytes`)}async _readBGRA8TextureToRGBA8Pixels(e,t,a,r={}){let o=Math.max(1,t|0),f=Math.max(1,a|0),c=4,s=256,n=o*c,p=Math.ceil(n/s)*s,m=this.device?.limits?.maxBufferSize??256*1024*1024,l=Math.max(1024*1024,Math.floor(m*.9)),u=this._getMaxBufferChunkBytes(r.maxBufferChunkBytes);if(u<p&&(u=p),p>l)throw new Error(`_readBGRA8TextureToRGBA8Pixels: bytesPerRow=${p} exceeds safe buffer cap=${l}`);let g=Math.max(1,Math.floor(u/p))|0,y=new Uint8ClampedArray(o*f*4),h=[],b=this.device.createCommandEncoder();for(let x=0;x<f;x+=g){let M=Math.min(g,f-x)|0,B=p*M|0,z=this.device.createBuffer({size:B,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});b.copyTextureToBuffer({texture:e,origin:{x:0,y:x,z:0}},{buffer:z,bytesPerRow:p,rowsPerImage:M},{width:o,height:M,depthOrArrayLayers:1}),h.push({readBuffer:z,y0:x,rows:M})}if(this.queue.submit([b.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}for(let x of h){let{readBuffer:M,y0:B,rows:z}=x;await M.mapAsync(GPUMapMode.READ);let S=M.getMappedRange(),v=new Uint8Array(S);for(let k=0;k<z;k++){let A=k*p,d=(B+k)*o*4;for(let w=0;w<o;w++){let _=A+w*4,C=d+w*4;y[C+0]=v[_+2],y[C+1]=v[_+1],y[C+2]=v[_+0],y[C+3]=v[_+3]}}M.unmap(),M.destroy()}return y}resize(e){this.maxConfigs=e,this._initBuffers()}setPermTable(e){this.queue.writeBuffer(this.permBuffer,0,e)}setPosBuffer(e){this.posBuffer=e}setInputTextureView(e){try{if(((e?.texture?.usage??0)&GPUTextureUsage.TEXTURE_BINDING)===0){console.warn("setInputTextureView: provided texture view not created with TEXTURE_BINDING; ignoring.");return}}catch{}if(this.inputTextureView=e,this._tid!==null){let t=this._texPairs.get(this._tid);t&&(t.bindGroupDirty=!0)}}setOutputTextureView(e){try{if(((e?.texture?.usage??0)&GPUTextureUsage.STORAGE_BINDING)===0){console.warn("setOutputTextureView: provided texture view not created with STORAGE_BINDING; ignoring.");return}}catch{}if(this.outputTextureView=e,this._tid!==null){let t=this._texPairs.get(this._tid);t&&(t.bindGroupDirty=!0)}}buildPermTable(e=Date.now()){let a=new ht(e).perm,r=new Uint32Array(512);for(let o=0;o<512;o++)r[o]=a[o];this.setPermTable(r)}setOptions(e={}){Array.isArray(e.noiseChoices)?this.noiseChoices=e.noiseChoices:this.noiseChoices||(this.noiseChoices=[0]);let{getGradient:t=0,outputChannel:a=1,baseRadius:r=0,heightScale:o=1,useCustomPos:f=0,ioFlags:c=0,sphereOffset:s=0,sphereOffset2:n=0,sphereBlend:p=0,sphereBlendPhase:m=0,sphereRangeWeight:l=1,spherePolarFade:u=0,sphereLandscape:g=0,sphereLandscapeStrength:y=0,sphereFeatureDensity:h=1,sphereRegionSeed:b=0,sphereRegion:x=[0,0,0,0],sphereLayerWeights:M=[1,1,1,1]}=e;this.useCustomPos=f>>>0;let B=new ArrayBuffer(96),z=new DataView(B);z.setUint32(0,t,!0),z.setUint32(4,this.useCustomPos,!0),z.setUint32(8,a,!0),z.setUint32(12,c>>>0,!0),z.setFloat32(16,r,!0),z.setFloat32(20,o,!0),z.setFloat32(24,Number.isFinite(Number(s))?Number(s):0,!0),z.setFloat32(28,Number.isFinite(Number(n))?Number(n):0,!0),z.setFloat32(32,p,!0),z.setFloat32(36,m,!0),z.setFloat32(40,l,!0),z.setFloat32(44,u,!0),z.setUint32(48,g,!0),z.setFloat32(52,y,!0),z.setFloat32(56,h,!0),z.setUint32(60,b,!0);for(let S=0;S<4;S++)z.setFloat32(64+4*S,x[S],!0),z.setFloat32(80+4*S,M[S],!0);this.queue.writeBuffer(this.optionsBuffer,0,B);for(let S of this._texPairs.values())S.bindGroupDirty=!0}setNoiseParams(e={}){let t=e||{},a=this._lastNoiseParams||{},r=Object.prototype.hasOwnProperty,o=(j,V)=>{let $=r.call(t,j)?t[j]:a[j],te=Number($);if(Number.isFinite(te))return te;let J=Number(V);return Number.isFinite(J)?J:0},f=(j,V)=>{let $=r.call(t,j)?t[j]:a[j],te=Number($);if(Number.isFinite(te))return te>>>0;let J=Number(V);return Number.isFinite(J)?J>>>0:0},c=(j,V)=>{let $=r.call(t,j)?t[j]:a[j],te=Number($);if(Number.isFinite(te))return te|0;let J=Number(V);return Number.isFinite(J)?J|0:0},s=(j,V)=>{let $=r.call(t,j)?t[j]:a[j];return $===void 0?(V?1:0)>>>0:($?1:0)>>>0},n=c("seed",a.seed??Date.now()|0),p=o("zoom",a.zoom??1),m=o("freq",a.freq??1),l=Math.max(p||0,1e-6),u=Math.max(m||0,1e-6),g=f("octaves",a.octaves??8),y=s("turbulence",a.turbulence??0),h=o("lacunarity",a.lacunarity??2),b=o("gain",a.gain??.5),x=o("xShift",a.xShift??0),M=o("yShift",a.yShift??0),B=o("zShift",a.zShift??0),z=o("seedAngle",a.seedAngle??0),S=o("exp1",a.exp1??1),v=o("exp2",a.exp2??0),k=o("threshold",a.threshold??.1),A=o("rippleFreq",a.rippleFreq??10),d=o("time",a.time??0),w=o("warpAmp",a.warpAmp??.5),_=o("gaborRadius",a.gaborRadius??4),C=o("terraceStep",a.terraceStep??8),F=s("toroidal",a.toroidal??0),W=f("voroMode",a.voroMode??0),I=o("edgeK",a.edgeK??0),Q=o("scalar",a.scalar??1),G=o("transform",a.transform??0),K=new ArrayBuffer(96),N=new DataView(K),H=0;N.setUint32(H+0,n>>>0,!0),N.setFloat32(H+4,l,!0),N.setFloat32(H+8,u,!0),N.setUint32(H+12,g>>>0,!0),N.setFloat32(H+16,h,!0),N.setFloat32(H+20,b,!0),N.setFloat32(H+24,x,!0),N.setFloat32(H+28,M,!0),N.setFloat32(H+32,B,!0),N.setUint32(H+36,y>>>0,!0),N.setFloat32(H+40,z,!0),N.setFloat32(H+44,S,!0),N.setFloat32(H+48,v,!0),N.setFloat32(H+52,k,!0),N.setFloat32(H+56,A,!0),N.setFloat32(H+60,d,!0),N.setFloat32(H+64,w,!0),N.setFloat32(H+68,_,!0),N.setFloat32(H+72,C,!0),N.setUint32(H+76,F>>>0,!0),N.setUint32(H+80,W>>>0,!0),N.setFloat32(H+84,I,!0),N.setFloat32(H+88,Q,!0),N.setFloat32(H+92,G,!0),this.queue.writeBuffer(this.paramsBuffer,0,K),this._lastNoiseParams={seed:n,zoom:l,freq:u,octaves:g,lacunarity:h,gain:b,xShift:x,yShift:M,zShift:B,turbulence:y,seedAngle:z,exp1:S,exp2:v,threshold:k,rippleFreq:A,time:d,warpAmp:w,gaborRadius:_,terraceStep:C,toroidal:F,voroMode:W,edgeK:I,scalar:Q,transform:G};for(let j of this._texPairs.values())j.bindGroupDirty=!0;for(let[j,V]of this._volumeCache)!V||!Array.isArray(V.chunks)||(V._bindGroupsDirty=!0)}_numOr0(e){let t=Number(e);return Number.isFinite(t)?t:0}_resolveScroll2D(e,t,a,r,o,f){let c=e||{},s=Math.max(1,t|0),n=Math.max(1,a|0),p=Math.max(1,(r??s)|0),m=Math.max(1,(o??n)|0),l=f?p:s,u=f?m:n,g=this._numOr0(c.offsetX)*l,y=this._numOr0(c.offsetY)*u,h=g+this._numOr0(c.offsetXf)+this._numOr0(c.originXf)+this._numOr0(c.originX),b=y+this._numOr0(c.offsetYf)+this._numOr0(c.originYf)+this._numOr0(c.originY);return{baseXf:h,baseYf:b}}_resolveScroll3D(e,t,a,r){let o=e||{},f=Math.max(1,t|0),c=Math.max(1,a|0),s=Math.max(1,r|0),n=this._numOr0(o.offsetX)*f,p=this._numOr0(o.offsetY)*c,m=this._numOr0(o.offsetZ)*s,l=n+this._numOr0(o.offsetXf)+this._numOr0(o.originXf)+this._numOr0(o.originX),u=p+this._numOr0(o.offsetYf)+this._numOr0(o.originYf)+this._numOr0(o.originY),g=m+this._numOr0(o.offsetZf)+this._numOr0(o.originZf)+this._numOr0(o.originZ),y=Math.floor(g)|0;return{baseXf:l,baseYf:u,baseZ:y}}_update2DTileFrames(e,t={}){let a=this._texPairs.get(e);if(!a||!Array.isArray(a.tiles)||a.tiles.length===0)return;let r=Number.isFinite(t.frameFullWidth)?t.frameFullWidth>>>0:a.fullWidth,o=Number.isFinite(t.frameFullHeight)?t.frameFullHeight>>>0:a.fullHeight,f=t.squareWorld||String(t.worldMode||"").toLowerCase()==="crop";if(t.squareWorld){let u=Math.max(r,o,a.fullWidth,a.fullHeight)>>>0;r=u,o=u}let c=a.fullWidth>>>0,s=a.fullHeight>>>0,{baseXf:n,baseYf:p}=this._resolveScroll2D(t,c,s,r,o,f),m=f?1:r/Math.max(1,c),l=f?1:o/Math.max(1,s);for(let u of a.tiles){let g=u?.frames?.[0];if(!g)continue;let y=u.originX|0,h=u.originY|0,b=(y+n)*m,x=(h+p)*l,M=r>0?b/r:0,B=o>0?x/o:0;this._writeFrameUniform(g,{fullWidth:r,fullHeight:o,tileWidth:a.tileWidth,tileHeight:a.tileHeight,originX:y,originY:h,originZ:0,fullDepth:1,tileDepth:1,layerIndex:u.layerIndex|0,layers:a.layers>>>0,originXf:M,originYf:B})}}_update3DChunkFrames(e,t=null,a={}){if(!e||!Array.isArray(e.chunks)||e.chunks.length===0)return;let r=t&&Number.isFinite(t?.w)?t.w>>>0:e.full.w,o=t&&Number.isFinite(t?.h)?t.h>>>0:e.full.h,f=t&&Number.isFinite(t?.d)?t.d>>>0:e.full.d,c=e.full.w>>>0,s=e.full.h>>>0,n=e.full.d>>>0,{baseXf:p,baseYf:m,baseZ:l}=this._resolveScroll3D(a,c,s,n),u=r/Math.max(1,c),g=o/Math.max(1,s);for(let y of e.chunks){y.fb||(y.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));let h=((y.ox|0)+p)*u,b=((y.oy|0)+m)*g,x=r>0?h/r:0,M=o>0?b/o:0,B=(y.oz|0)+l|0;this._writeFrameUniform(y.fb,{fullWidth:r,fullHeight:o,tileWidth:y.w,tileHeight:y.h,originX:y.ox|0,originY:y.oy|0,originZ:B,fullDepth:f,tileDepth:y.d,layerIndex:0,layers:1,originXf:x,originYf:M})}}_compute2DTiling(e,t){let a=Math.min(e,Jt),r=Math.min(t,Jt),o=Math.ceil(e/a),f=Math.ceil(t/r),c=o*f;return{tileW:a,tileH:r,tilesX:o,tilesY:f,layers:c}}_create2DPair(e,t,a=null){let r=this._compute2DTiling(e,t),o=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,f=u=>this.device.createTexture({label:u,size:[r.tileW,r.tileH,r.layers],format:"rgba16float",usage:o}),c={dimension:"2d-array",arrayLayerCount:r.layers},s=a!=null?String(a):String(this._texPairs.size),n=f(`2D texA ${e}x${t}x${r.layers} (${s})`),p=f(`2D texB ${e}x${t}x${r.layers} (${s})`),m=n.createView(c),l=p.createView(c);return m.label=`2D:viewA (${s})`,l.label=`2D:viewB (${s})`,this._tag.set(m,`2D:A (${s})`),this._tag.set(l,`2D:B (${s})`),this._texPairs.set(s,{texA:n,texB:p,viewA:m,viewB:l,fullWidth:e,fullHeight:t,tileWidth:r.tileW,tileHeight:r.tileH,tilesX:r.tilesX,tilesY:r.tilesY,layers:r.layers,isA:!0,tiles:null,bindGroupDirty:!0}),this._tid===null&&this.setActiveTexture(s),s}createShaderTextures(e,t){this._tid!==null&&this._texPairs.has(this._tid)&&this.destroyTexturePair(this._tid);let a=this._create2DPair(e,t);return this.setActiveTexture(a),a}destroyTexturePair(e){let t=String(e),a=this._texPairs.get(t);if(a){try{a.texA.destroy()}catch{}try{a.texB.destroy()}catch{}if(Array.isArray(a.tiles))for(let r of a.tiles){if(Array.isArray(r.frames))for(let o of r.frames)try{o.destroy()}catch{}if(r.posBuf&&r.posBuf!==this.nullPosBuffer)try{r.posBuf.destroy()}catch{}}this._texPairs.delete(t),this._tid===t&&(this._tid=null,this.inputTextureView=null,this.outputTextureView=null,this.viewA=null,this.viewB=null)}}destroyAllTexturePairs(){let e=Array.from(this._texPairs.keys());for(let t of e)this.destroyTexturePair(t)}dispose(){if(!this.disposed){this.disposed=!0,this.destroyAllTexturePairs(),this.destroyAllVolumes();for(let e of[this.optionsBuffer,this.paramsBuffer,this.permBuffer,this.nullPosBuffer,this._dummy2D_sampleTex,this._dummy2D_writeTex,this._dummy3D_sampleTex,this._dummy3D_writeTex,this.blit2DUbo,this.blit3DUbo])e?.destroy();this.pipelines.clear()}}setActiveTexture(e){let t=String(e);if(!this._texPairs.has(t))throw new Error("setActiveTexture: invalid id");this._tid=t;let a=this._texPairs.get(t);this.viewA=a.viewA,this.viewB=a.viewB,this.width=a.tileWidth,this.height=a.tileHeight,this.layers=a.layers,this.inputTextureView=a.isA?a.viewA:a.viewB,this.outputTextureView=a.isA?a.viewB:a.viewA}_buildPosBuffer(e,t,a){if(!(a instanceof Float32Array)||a.byteLength<=0)return this.nullPosBuffer;let r=Math.max(1,Math.floor(e)),o=Math.max(1,Math.floor(t)),c=r*o*4;if(a.length!==c)throw new Error(`_buildPosBuffer: customData length ${a.length} != expected ${c} (width=${r}, height=${o})`);let s=this.device?.limits?.maxBufferSize??2147483648,n=this.device?.limits?.maxStorageBufferBindingSize??134217728,p=Math.floor(Math.min(s,n)*.98);if(a.byteLength>p)throw new Error(`_buildPosBuffer: ${a.byteLength} bytes exceeds the safe storage binding limit ${p} (maxBufferSize=${s}, maxStorageBufferBindingSize=${n}, w=${r}, h=${o})`);let m=this.device.createBuffer({size:a.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});return this._writeBufferChunked(m,0,a.buffer,a.byteOffset,a.byteLength,this.maxBufferChunkBytes),m}_writeFrameUniform(e,t){let a=new ArrayBuffer(64),r=new DataView(a);r.setUint32(0,t.fullWidth>>>0,!0),r.setUint32(4,t.fullHeight>>>0,!0),r.setUint32(8,t.tileWidth>>>0,!0),r.setUint32(12,t.tileHeight>>>0,!0),r.setInt32(16,t.originX|0,!0),r.setInt32(20,t.originY|0,!0),r.setInt32(24,t.originZ|0,!0),r.setUint32(28,t.fullDepth>>>0,!0),r.setUint32(32,t.tileDepth>>>0,!0),r.setInt32(36,t.layerIndex|0,!0),r.setUint32(40,t.layers>>>0,!0),r.setUint32(44,0,!0),r.setFloat32(48,t.originXf??0,!0),r.setFloat32(52,t.originYf??0,!0),r.setFloat32(56,0,!0),r.setFloat32(60,0,!0),this.queue.writeBuffer(e,0,a)}_create2DTileBindGroups(e,t={}){let a=this._texPairs.get(e);if(!a)throw new Error("_create2DTileBindGroups: invalid tid");let r=((t.useCustomPos??0)|0)>>>0,o=r===2||r===3,f=r!==0&&!o,c=f&&t.customData instanceof Float32Array?t.customData:null,s=!!c,n=Array.isArray(a.tiles)&&a.tiles.some(l=>l&&l.posIsCustom),p=f&&!s;if(!s&&n&&!p&&(a.bindGroupDirty=!0),Array.isArray(a.tiles)&&!a.bindGroupDirty&&!s)return;let m=[];for(let l=0;l<a.tilesY;l++)for(let u=0;u<a.tilesX;u++){let g=l*a.tilesX+u,y=u*a.tileWidth,h=l*a.tileHeight,b=a.tiles&&a.tiles[g]||null,x=this.nullPosBuffer,M=!1;if(s)x=this._buildPosBuffer(a.tileWidth,a.tileHeight,c),M=x!==this.nullPosBuffer;else if(p&&b&&b.posBuf&&b.posIsCustom)x=b.posBuf,M=!0;else{if(p)throw new Error("_create2DTileBindGroups: useCustomPos=1 was requested without customData and no reusable custom position buffer exists.");if(!o&&b&&b.posBuf&&!b.posIsCustom)x=b.posBuf,M=!1;else if(x=this.nullPosBuffer,M=!1,b&&b.posBuf&&b.posIsCustom)try{b.posBuf.destroy()}catch{}}let B;b&&b.frames&&b.frames[0]?B=b.frames[0]:B=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let z=Number.isFinite(t.frameFullWidth)?t.frameFullWidth>>>0:a.fullWidth,S=Number.isFinite(t.frameFullHeight)?t.frameFullHeight>>>0:a.fullHeight,v=t.squareWorld||String(t.worldMode||"").toLowerCase()==="crop";if(t.squareWorld){let _=Math.max(z,S,a.fullWidth,a.fullHeight)>>>0;z=_,S=_}let k,A;if(v)k=y,A=h;else{let _=z/a.fullWidth,C=S/a.fullHeight;k=y*_,A=h*C}this._writeFrameUniform(B,{fullWidth:z,fullHeight:S,tileWidth:a.tileWidth,tileHeight:a.tileHeight,originX:y,originY:h,originZ:0,fullDepth:1,tileDepth:1,layerIndex:g,layers:a.layers,originXf:k,originYf:A});let d=b?.bgs?.[0]?.bgA??null,w=b?.bgs?.[0]?.bgB??null;(!d||!w||a.bindGroupDirty)&&(d=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:a.viewA},{binding:4,resource:a.viewB},{binding:5,resource:{buffer:x}},{binding:6,resource:{buffer:B}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]}),w=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:a.viewB},{binding:4,resource:a.viewA},{binding:5,resource:{buffer:x}},{binding:6,resource:{buffer:B}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]})),m.push({layerIndex:g,originX:y,originY:h,frames:[B],posBuf:x,posIsCustom:M,bgs:[{bgA:d,bgB:w}]})}a.tiles=m,a.bindGroupDirty=!1,this._tid===e&&(this._tiles=m)}async prepareTexturePipelines(e){let a=(await Promise.allSettled([...new Set(e)].map(async r=>{if(this.pipelines.has(r))return;let o=await this.device.createComputePipelineAsync({layout:this.pipelineLayout,compute:{module:this.shaderModule,entryPoint:r}});!this.disposed&&!this.pipelines.has(r)&&this.pipelines.set(r,o)}))).find(r=>r.status==="rejected");if(a)throw a.reason}async _runPipelines(e,t,a,r,o,f,c=1){let s=e,n=t,p=Array.isArray(f),m=0,l=this.device.createCommandEncoder(),u=l.beginComputePass();for(let g of this.noiseChoices){let y=typeof g=="number"?this.entryPoints[g]:g,h=this.pipelines.get(y);h||(h=this.device.createComputePipeline({layout:this.pipelineLayout,compute:{module:this.shaderModule,entryPoint:y}}),this.pipelines.set(y,h)),p&&this.setNoiseParams(f[m++]),u.setPipeline(h),u.setBindGroup(0,s),u.dispatchWorkgroups(Math.ceil(a/8),Math.ceil(r/8),c),[s,n]=[n,s]}return u.end(),this.queue.submit([l.finish()]),n}async computeToTexture(e,t,a={},r={}){let o=e|0,f=t|0;if(!(o>0&&f>0))throw new Error(`computeToTexture: invalid size ${e}x${t}`);let c=this._get2DKey(r),s=this._texPairs.get(c);s?(s.fullWidth!==o||s.fullHeight!==f)&&(this.destroyTexturePair(c),this._create2DPair(o,f,c)):this._create2DPair(o,f,c),this.setActiveTexture(c);let n=this._texPairs.get(c);if(!n)throw new Error("computeToTexture: missing pair after ensure");a&&!Array.isArray(a)&&this.setNoiseParams(a);let p=r||{},m=((p.useCustomPos??0)|0)>>>0,l=m===2||m===3,u=m!==0&&!l,g=u&&p.customData instanceof Float32Array?p.customData:null,y=g?1:l?m:u?1:0;this.setOptions({...p,ioFlags:0,useCustomPos:y});let h={...p,useCustomPos:y,customData:g};(!n.tiles||n.bindGroupDirty||g)&&this._create2DTileBindGroups(c,h),this._update2DTileFrames(c,h);let b=n.isA,x=null,M=null;for(let z of n.tiles){let{bgA:S,bgB:v}=z.bgs[0],k=x?x===S?S:v:b?S:v,A=k===S?v:S;x=await this._runPipelines(k,A,n.tileWidth,n.tileHeight,1,a,1),M={bgA:S,bgB:v}}let B=x===M.bgB;return n.isA=B,this.setActiveTexture(c),this.getCurrentView(c)}_get2DKey(e){let t=e&&e.textureKey!==void 0&&e.textureKey!==null?String(e.textureKey):"";return t&&t.length?t:this._default2DKey}get2DView(e){let t=String(e),a=this._texPairs.get(t);return a?a.isA?a.viewA:a.viewB:null}getCurrentView(e=null){let t=e!=null?String(e):this._tid,a=this._texPairs.get(t);return a?a.isA?a.viewA:a.viewB:null}getCurrentTextureResource(e=null){let t=e!=null?String(e):this._tid,a=this._texPairs.get(t);return a?{texture:a.isA?a.texA:a.texB,view:a.isA?a.viewA:a.viewB,width:a.fullWidth,height:a.fullHeight,layers:a.layers,format:"rgba16float"}:null}_compute3DTiling(e,t,a){let r=Math.min(e,Dt),o=Math.min(t,Dt),f=this.device?.limits?.maxBufferSize??256*1024*1024,c=r*o*Ha,s=Math.max(1,Math.floor(f*.8/Math.max(1,c))),n=Math.min(a,Dt,s),p=Math.ceil(e/r),m=Math.ceil(t/o),l=Math.ceil(a/n);return{tw:r,th:o,td:n,nx:p,ny:m,nz:l}}_create3DChunks(e,t,a){let r=this._compute3DTiling(e,t,a),o=[],f=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST;for(let c=0;c<r.nz;c++)for(let s=0;s<r.ny;s++)for(let n=0;n<r.nx;n++){let p=n*r.tw,m=s*r.th,l=c*r.td,u=this.device.createTexture({size:{width:r.tw,height:r.th,depthOrArrayLayers:r.td},dimension:"3d",format:"rgba16float",usage:f}),g=this.device.createTexture({size:{width:r.tw,height:r.th,depthOrArrayLayers:r.td},dimension:"3d",format:"rgba16float",usage:f}),y=u.createView({dimension:"3d"}),h=g.createView({dimension:"3d"});u.label=`3D texA ${r.tw}x${r.th}x${r.td} @ (${n},${s},${c})`,g.label=`3D texB ${r.tw}x${r.th}x${r.td} @ (${n},${s},${c})`,y.label=`3D:viewA[${n},${s},${c}]`,h.label=`3D:viewB[${n},${s},${c}]`,this._tag.set(y,`3D:A[${n},${s},${c}]`),this._tag.set(h,`3D:B[${n},${s},${c}]`),o.push({texA:u,texB:g,viewA:y,viewB:h,ox:p,oy:m,oz:l,w:r.tw,h:r.th,d:r.td,isA:!0,fb:null,posBuf:null,bgA:null,bgB:null})}return{chunks:o,tile:{w:r.tw,h:r.th,d:r.td},full:{w:e,h:t,d:a},grid:{nx:r.nx,ny:r.ny,nz:r.nz}}}_destroy3DSet(e){if(e)for(let t of e.chunks){try{t.texA.destroy()}catch{}try{t.texB.destroy()}catch{}if(t.viewA=null,t.viewB=null,t.bgA=null,t.bgB=null,t.fb){try{t.fb.destroy()}catch{}t.fb=null}if(t.posBuf&&t.posBuf!==this.nullPosBuffer){try{t.posBuf.destroy()}catch{}t.posBuf=null}}}destroyAllVolumes(){for(let[e,t]of this._volumeCache)this._destroy3DSet(t),this._volumeCache.delete(e)}get3DView(e){let t=this._volumeCache.get(String(e));if(!t)return null;let a=t.chunks.map(r=>r.isA?r.viewA:r.viewB);return a.length===1?a[0]:{views:a,meta:{full:t.full,tile:t.tile,grid:t.grid}}}destroyVolume(e){let t=String(e),a=this._volumeCache.get(t);a&&(this._destroy3DSet(a),this._volumeCache.delete(t))}_getOrCreate3DVolume(e,t,a,r=null,o=null){let f=r?String(r):`${e}x${t}x${a}`,c=this._volumeCache.get(f);if(c)return c;c=this._create3DChunks(e,t,a);for(let s of c.chunks){s.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=o&&Number.isFinite(o?.w)?o.w>>>0:c.full.w,p=o&&Number.isFinite(o?.h)?o.h>>>0:c.full.h,m=o&&Number.isFinite(o?.d)?o.d>>>0:c.full.d,l=n/c.full.w,u=p/c.full.h,g=s.ox*l,y=s.oy*u;this._writeFrameUniform(s.fb,{fullWidth:n,fullHeight:p,tileWidth:s.w,tileHeight:s.h,originX:s.ox,originY:s.oy,originZ:s.oz,fullDepth:m,tileDepth:s.d,layerIndex:0,layers:1,originXf:g,originYf:y});let h=this._buildPosBuffer(s.w,s.h,null);s.posBuf=h;try{s.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:h}},{binding:6,resource:{buffer:s.fb}},{binding:7,resource:s.viewA},{binding:8,resource:s.viewB}]}),s.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:s.posBuf}},{binding:6,resource:{buffer:s.fb}},{binding:7,resource:s.viewB},{binding:8,resource:s.viewA}]})}catch(b){throw new Error(`_getOrCreate3DVolume: createBindGroup failed: ${b?.message||b}`)}}return c._bindGroupsDirty=!1,this._volumeCache.set(f,c),c}_recreate3DBindGroups(e,t=null){if(!e||!Array.isArray(e.chunks))return;let a=t&&Number.isFinite(t.w)?t.w>>>0:e.full.w,r=t&&Number.isFinite(t.h)?t.h>>>0:e.full.h,o=t&&Number.isFinite(t.d)?t.d>>>0:e.full.d;for(let f of e.chunks){if(!f.fb){f.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=a/e.full.w,p=r/e.full.h,m=f.ox*n,l=f.oy*p;this._writeFrameUniform(f.fb,{fullWidth:a,fullHeight:r,tileWidth:f.w,tileHeight:f.h,originX:f.ox,originY:f.oy,originZ:f.oz,fullDepth:o,tileDepth:f.d,layerIndex:0,layers:1,originXf:m,originYf:l})}f.posBuf||(f.posBuf=this._buildPosBuffer(f.w,f.h,null));let c=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:f.posBuf}},{binding:6,resource:{buffer:f.fb}},{binding:7,resource:f.viewA},{binding:8,resource:f.viewB}],s=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:f.posBuf}},{binding:6,resource:{buffer:f.fb}},{binding:7,resource:f.viewB},{binding:8,resource:f.viewA}];try{f.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:c}),f.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:s})}catch(n){throw new Error(`_recreate3DBindGroups: failed to create bind groups: ${n?.message||n}`)}}e._bindGroupsDirty=!1}async computeToTexture3D(e,t,a,r={},o={}){let f=e|0,c=t|0,s=a|0;if(!(f>0&&c>0&&s>0))throw new Error(`computeToTexture3D: invalid size ${e}x${t}x${a}`);r&&!Array.isArray(r)&&this.setNoiseParams(r);let n=o||{};this.setOptions({...n,ioFlags:3,useCustomPos:n.useCustomPos??this.useCustomPos});let p=o&&(Number.isFinite(o.frameFullWidth)||Number.isFinite(o.frameFullHeight)||Number.isFinite(o.frameFullDepth))?{w:Number.isFinite(o.frameFullWidth)?o.frameFullWidth>>>0:f,h:Number.isFinite(o.frameFullHeight)?o.frameFullHeight>>>0:c,d:Number.isFinite(o.frameFullDepth)?o.frameFullDepth>>>0:s}:null,m=this._getOrCreate3DVolume(f,c,s,o.id,p);if(!m)throw new Error("computeToTexture3D: failed to create or retrieve volume");(m._bindGroupsDirty||!m.chunks[0].bgA||!m.chunks[0].bgB)&&this._recreate3DBindGroups(m,p),this._update3DChunkFrames(m,p,o);let l=null;for(let g of m.chunks){let y=g.isA?g.bgA:g.bgB,h=g.isA?g.bgB:g.bgA;if(!y||!h)throw new Error("computeToTexture3D: missing bind groups (volume not initialized correctly)");l=await this._runPipelines(y,h,g.w,g.h,g.d,r,g.d),g.isA=l===g.bgB}let u=m.chunks.map(g=>g.isA?g.viewA:g.viewB);return u.length===1?u[0]:{views:u,meta:{full:m.full,tile:m.tile,grid:m.grid}}}configureCanvas(e){let t=navigator.gpu.getPreferredCanvasFormat&&navigator.gpu.getPreferredCanvasFormat()||"bgra8unorm",a=e.getContext("webgpu");a.configure({device:this.device,format:t,alphaMode:"opaque",size:[e.width,e.height]}),this._ctxMap.set(e,{ctx:a,size:[e.width,e.height]})}initBlitRender(){this.sampler||(this.sampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"})),this.bgl2D||(this.bgl2D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline2D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl2D]}),vertex:{module:this.device.createShaderModule({code:St}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:St}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit2DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),this.bgl3D||(this.bgl3D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"3d"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline3D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl3D]}),vertex:{module:this.device.createShaderModule({code:Pt}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:Pt}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit3DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}))}_renderCommonCanvasSetup(e,t){let a="bgra8unorm",r=this._ctxMap.get(e);if(r){let c=e.width|0,s=e.height|0;(r.size[0]!==c||r.size[1]!==s)&&(r.size=[c,s],r.ctx.configure({device:this.device,format:a,alphaMode:"opaque",size:r.size}))}else{let c=e.getContext("webgpu"),s=[e.width|0,e.height|0];c.configure({device:this.device,format:a,alphaMode:"opaque",size:s}),r={ctx:c,size:s},this._ctxMap.set(e,r)}let o=this.device.createCommandEncoder(),f=o.beginRenderPass({colorAttachments:[{view:r.ctx.getCurrentTexture().createView(),loadOp:t?"clear":"load",clearValue:{r:0,g:0,b:0,a:1},storeOp:"store"}]});return{enc:o,pass:f,ctxEntry:r}}renderTextureToCanvas(e,t,a={}){let{layer:r=0,channel:o=0,preserveCanvasSize:f=!0,clear:c=!0}=a;if(this.initBlitRender(),!f)try{let l=e.texture;l&&typeof l.width=="number"&&typeof l.height=="number"&&(t.width=l.width,t.height=l.height)}catch{}let s=new Uint32Array([r>>>0,o>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,s.buffer,s.byteOffset,s.byteLength);let n=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:e},{binding:2,resource:{buffer:this.blit2DUbo}}]}),{enc:p,pass:m}=this._renderCommonCanvasSetup(t,c);m.setPipeline(this.pipeline2D),m.setBindGroup(0,n),m.draw(6,1,0,0),m.end(),this.queue.submit([p.finish()])}renderTexture3DSliceToCanvas(e,t,a={}){let{depth:r,slice:o=0,zNorm:f=null,channel:c=0,chunk:s=0,preserveCanvasSize:n=!0,clear:p=!0}=a;this.initBlitRender();let m,l;if(e&&e.views&&Array.isArray(e.views)?(m=e.views[Math.max(0,Math.min(s|0,e.views.length-1))],l=e.meta?.tile?.d??r):(m=e,l=r),!m||!l)throw new Error("renderTexture3DSliceToCanvas: need a 3D view and its depth");if(!n)try{let M=m.texture;M&&typeof M.width=="number"&&typeof M.height=="number"&&(t.width=M.width,t.height=M.height)}catch{}let u=f??(Math.min(Math.max(o,0),l-1)+.5)/l;u=Math.min(Math.max(u,0),1);let g=new ArrayBuffer(16),y=new DataView(g);y.setFloat32(0,u,!0),y.setUint32(4,c>>>0,!0),y.setUint32(8,0,!0),y.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,g);let h=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:m},{binding:2,resource:{buffer:this.blit3DUbo}}]}),{enc:b,pass:x}=this._renderCommonCanvasSetup(t,p);x.setPipeline(this.pipeline3D),x.setBindGroup(0,h),x.draw(6,1,0,0),x.end(),this.queue.submit([b.finish()])}setExportBackground(e="black"){this.exportBackground=e}_resolveExportBackground(e){let t=e===void 0?this.exportBackground:e;if(t==null)return{r:0,g:0,b:0,a:1,transparent:!1};if(typeof t=="string"){let r=t.trim().toLowerCase();if(r==="transparent")return{r:0,g:0,b:0,a:0,transparent:!0};if(r==="black")return{r:0,g:0,b:0,a:1,transparent:!1};if(r==="white")return{r:1,g:1,b:1,a:1,transparent:!1};if(r[0]==="#")return this._parseHexBackground(r)}let a=r=>{let o=Number(r);if(!Number.isFinite(o))return 0;let f=o>1?o/255:o;return Math.min(Math.max(f,0),1)};if(Array.isArray(t)){let r=a(t[0]),o=a(t[1]),f=a(t[2]),c=t.length>=4?a(t[3]):1;return{r,g:o,b:f,a:c,transparent:c<=0}}if(typeof t=="object"){let r=a(t.r),o=a(t.g),f=a(t.b),c=t.a===void 0?1:a(t.a);return{r,g:o,b:f,a:c,transparent:c<=0}}return{r:0,g:0,b:0,a:1,transparent:!1}}_parseHexBackground(e){let t=String(e).trim().replace(/^#/,""),a=l=>l+l,r=0,o=0,f=0,c=255;if(t.length===3||t.length===4)r=parseInt(a(t[0]),16),o=parseInt(a(t[1]),16),f=parseInt(a(t[2]),16),t.length===4&&(c=parseInt(a(t[3]),16));else if(t.length===6||t.length===8)r=parseInt(t.slice(0,2),16),o=parseInt(t.slice(2,4),16),f=parseInt(t.slice(4,6),16),t.length===8&&(c=parseInt(t.slice(6,8),16));else return{r:0,g:0,b:0,a:1,transparent:!1};let s=r/255,n=o/255,p=f/255,m=c/255;return{r:s,g:n,b:p,a:m,transparent:m<=0}}_applyExportBackground(e,t){if(!e||!t||t.transparent)return;let a=Math.round(t.r*255),r=Math.round(t.g*255),o=Math.round(t.b*255),f=Math.round((t.a??1)*255);if(f<=0)return;let c=e.length|0;if(f>=255){for(let s=0;s<c;s+=4){let n=e[s+3]|0;if(n===255)continue;if(n===0){e[s+0]=a,e[s+1]=r,e[s+2]=o,e[s+3]=255;continue}let p=255-n;e[s+0]=(e[s+0]*n+a*p)/255|0,e[s+1]=(e[s+1]*n+r*p)/255|0,e[s+2]=(e[s+2]*n+o*p)/255|0,e[s+3]=255}return}for(let s=0;s<c;s+=4){let n=e[s+0]|0,p=e[s+1]|0,m=e[s+2]|0,l=e[s+3]|0,u=l+f*(255-l)/255|0;if(u<=0){e[s+0]=0,e[s+1]=0,e[s+2]=0,e[s+3]=0;continue}let g=a*f|0,y=r*f|0,h=o*f|0,b=n*l|0,x=p*l|0,M=m*l|0,B=255-l|0,z=b+g*B/255|0,S=x+y*B/255|0,v=M+h*B/255|0;e[s+0]=Math.min(255,Math.max(0,z*255/u|0)),e[s+1]=Math.min(255,Math.max(0,S*255/u|0)),e[s+2]=Math.min(255,Math.max(0,v*255/u|0)),e[s+3]=Math.min(255,Math.max(0,u))}}_forceOpaqueAlpha(e){let t=e.length|0;for(let a=3;a<t;a+=4)e[a]=255}async export2DTextureToPNGBlob(e,t,a,r={}){if(!e)throw new Error("export2DTextureToPNGBlob: textureView is required");let o=Math.max(1,t|0),f=Math.max(1,a|0),c=r.layer??0,s=r.channel??0,n=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let m=this.device.createTexture({size:[o,f,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),l=new Uint32Array([c>>>0,s>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,l.buffer,l.byteOffset,l.byteLength);let u=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:e},{binding:2,resource:{buffer:this.blit2DUbo}}]}),g=this.device.createCommandEncoder(),y=g.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});if(y.setPipeline(this.pipeline2D),y.setBindGroup(0,u),y.draw(6,1,0,0),y.end(),this.queue.submit([g.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let h=await this._readBGRA8TextureToRGBA8Pixels(m,o,f,{maxBufferChunkBytes:r.maxBufferChunkBytes??this.maxBufferChunkBytes});m.destroy();let b=r.useAlphaForBackground===!0;n.transparent||b?this._applyExportBackground(h,n):this._forceOpaqueAlpha(h);let x=document.createElement("canvas");x.width=o,x.height=f;let M=x.getContext("2d");if(!M)throw new Error("export2DTextureToPNGBlob: unable to get 2D context");return M.putImageData(new ImageData(h,o,f),0,0),await new Promise((z,S)=>{x.toBlob(v=>{v?z(v):S(new Error("export2DTextureToPNGBlob: toBlob returned null"))},"image/png")})}async exportCurrent2DToPNGBlob(e,t,a={}){let r=this.getCurrentView();if(!r)throw new Error("exportCurrent2DToPNGBlob: no active 2D texture view");return this.export2DTextureToPNGBlob(r,e,t,a)}async export3DSliceToPNGBlob(e,t,a,r={}){if(!e)throw new Error("export3DSliceToPNGBlob: target is required");let o=Math.max(1,t|0),f=Math.max(1,a|0),{depth:c,slice:s=0,zNorm:n=null,channel:p=0,chunk:m=0}=r;if(!c||c<=0)throw new Error("export3DSliceToPNGBlob: depth must be provided and > 0");let l=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let u,g;if(e&&e.views&&Array.isArray(e.views)){let N=Math.max(0,Math.min(m|0,e.views.length-1));u=e.views[N],g=e.meta?.tile?.d??c}else u=e,g=c;if(!u||!g)throw new Error("export3DSliceToPNGBlob: need a 3D view and its depth");let y=n??(Math.min(Math.max(s,0),g-1)+.5)/g;y=Math.min(Math.max(y,0),1);let b=this.device.createTexture({size:[o,f,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),x=new ArrayBuffer(16),M=new DataView(x);M.setFloat32(0,y,!0),M.setUint32(4,p>>>0,!0),M.setUint32(8,0,!0),M.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,x);let B=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:u},{binding:2,resource:{buffer:this.blit3DUbo}}]}),z=this.device.createCommandEncoder(),S=z.beginRenderPass({colorAttachments:[{view:b.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});S.setPipeline(this.pipeline3D),S.setBindGroup(0,B),S.draw(6,1,0,0),S.end();let v=4,k=256,A=o*v,d=Math.ceil(A/k)*k,w=d*f,_=this.device.createBuffer({size:w,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});z.copyTextureToBuffer({texture:b},{buffer:_,bytesPerRow:d,rowsPerImage:f},{width:o,height:f,depthOrArrayLayers:1}),this.queue.submit([z.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await _.mapAsync(GPUMapMode.READ);let C=_.getMappedRange(),F=new Uint8Array(C),W=new Uint8ClampedArray(o*f*v),I=0;for(let N=0;N<f;N++){let H=N*d;for(let j=0;j<o;j++){let V=H+j*4;W[I++]=F[V+2],W[I++]=F[V+1],W[I++]=F[V+0],W[I++]=F[V+3]}}_.unmap(),_.destroy(),b.destroy(),this._applyExportBackground(W,l);let Q=document.createElement("canvas");Q.width=o,Q.height=f;let G=Q.getContext("2d");if(!G)throw new Error("export3DSliceToPNGBlob: unable to get 2D context");return G.putImageData(new ImageData(W,o,f),0,0),await new Promise((N,H)=>{Q.toBlob(j=>{j?N(j):H(new Error("export3DSliceToPNGBlob: toBlob returned null"))},"image/png")})}async _render3DSliceToRGBA8Pixels(e,t,a,r,o=0,f=null){if(!e)throw new Error("_render3DSliceToRGBA8Pixels: view3D is required");let c=Math.max(1,t|0),s=Math.max(1,a|0);this.initBlitRender();let n=Math.min(Math.max(Number(r)||0,0),1),m=this.device.createTexture({size:[c,s,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),l=new ArrayBuffer(16),u=new DataView(l);u.setFloat32(0,n,!0),u.setUint32(4,o>>>0,!0),u.setUint32(8,0,!0),u.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,l);let g=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:e},{binding:2,resource:{buffer:this.blit3DUbo}}]}),y=this.device.createCommandEncoder(),h=y.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});h.setPipeline(this.pipeline3D),h.setBindGroup(0,g),h.draw(6,1,0,0),h.end();let b=4,x=256,M=c*b,B=Math.ceil(M/x)*x,z=B*s,S=this.device.createBuffer({size:z,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});y.copyTextureToBuffer({texture:m},{buffer:S,bytesPerRow:B,rowsPerImage:s},{width:c,height:s,depthOrArrayLayers:1}),this.queue.submit([y.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await S.mapAsync(GPUMapMode.READ);let v=S.getMappedRange(),k=new Uint8Array(v),A=new Uint8ClampedArray(c*s*b),d=0;for(let w=0;w<s;w++){let _=w*B;for(let C=0;C<c;C++){let F=_+C*4;A[d++]=k[F+2],A[d++]=k[F+1],A[d++]=k[F+0],A[d++]=k[F+3]}}return S.unmap(),S.destroy(),m.destroy(),f&&this._applyExportBackground(A,f),A}async export3DTilesetToPNGBlob(e,t,a,r={}){if(!e)throw new Error("export3DTilesetToPNGBlob: target is required");let o=Math.max(1,t|0),f=Math.max(1,(a??t)|0),{depth:c,channel:s=0,chunk:n=0,tilesAcross:p=16,tilesDown:m=null,startSlice:l=0,sliceCount:u=null}=r,g=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let y,h;if(e&&e.views&&Array.isArray(e.views)){let _=Math.max(0,Math.min(n|0,e.views.length-1));y=e.views[_],h=e.meta?.tile?.d??c}else y=e,h=c;if(!y)throw new Error("export3DTilesetToPNGBlob: missing 3D view");if(!h||h<=0)throw new Error("export3DTilesetToPNGBlob: depth must be provided and > 0");let b=Math.max(1,p|0),x=m!=null?Math.max(1,m|0):Math.ceil(h/b),M=Math.min(Math.max(l|0,0),h-1),B=u!=null?Math.max(0,u|0):h-M,z=o*b,S=f*x,v=new Uint8ClampedArray(z*S*4),k=Math.min(h,M+B);for(let _=M;_<k;_++){let C=_-M,F=C%b,W=C/b|0;if(W>=x)break;let I=(_+.5)/h,Q=await this._render3DSliceToRGBA8Pixels(y,o,f,I,s,g),G=F*o,K=W*f;for(let N=0;N<f;N++){let H=N*o*4,j=((K+N)*z+G)*4;v.set(Q.subarray(H,H+o*4),j)}}let A=document.createElement("canvas");A.width=z,A.height=S;let d=A.getContext("2d");if(!d)throw new Error("export3DTilesetToPNGBlob: unable to get 2D context");return d.putImageData(new ImageData(v,z,S),0,0),await new Promise((_,C)=>{A.toBlob(F=>{F?_(F):C(new Error("export3DTilesetToPNGBlob: toBlob returned null"))},"image/png")})}},ht=class{constructor(e=Date.now()){e<1e7&&(e*=1e7),this.seedN=e,this.seedK=e,this.perm=new Uint8Array(512),this.seed(e)}seed(e){let t=this.xorshift(e);for(let a=0;a<256;a++)this.perm[a]=a;for(let a=255;a>0;a--){let r=Math.floor(t()*(a+1));[this.perm[a],this.perm[r]]=[this.perm[r],this.perm[a]]}for(let a=0;a<256;a++)this.perm[a+256]=this.perm[a]}setSeed(e){this.seedN=e,this.seed(e),this.resetSeed()}random(e,t,a){let r;return typeof a=="number"?r=this.perm[(e&255)+this.perm[(t&255)+this.perm[a&255]]]&255:r=this.perm[(e&255)+this.perm[t&255]]&255,this.perm[r]/255*2-1}seededRandom(){this.seedK+=Math.E;let e=1e9*Math.sin(this.seedK);return e-Math.floor(e)}resetSeed(){this.seedK=this.seedN}xorshift(e){let t=e;return function(){return t^=t<<13,t^=t>>17,t^=t<<5,(t<0?1+~t:t)/4294967295}}dot(e,t=0,a=0,r=0){return e[0]*t+e[1]*a+e[2]*r}};function dt(i,e,t){let a=Math.min(1,Math.max(0,(t-i)/(e-i)));return a*a*(3-2*a)}function at(i,e){return dt(.0175,.0805,Math.min(i,e-i)/e)}function Bt(i,e,t){let a=i.length,r=2*t+1,o=0;for(let f=-t;f<=t;f++)o+=i[(f+a)%a];for(let f=0;f<a;f++)e[f]=o/r,o+=i[(f+t+1)%a]-i[(f-t+a)%a]}function At(i,e){let t=e-1;if(t<64)return;let a=Math.floor(Math.asin(.25)/Math.PI*t),r=new Float32Array(t),o=new Float32Array(t),f=Float64Array.from({length:t},(l,u)=>Math.cos(u*2*Math.PI/t)),c=Float64Array.from({length:t},(l,u)=>Math.sin(u*2*Math.PI/t)),s=Math.max(2,Math.round(t*.005)),n=Math.max(1,Math.round(t*.0035)),p=[1,4,6,4,1],m=new Float32Array((a+n*2+1)*e);for(let l of[0,t]){let u=l===0?1:-1;for(let S=1;S<=a;S++){let v=Math.sin(Math.PI*S/t),k=1-dt(.071,.25,v),A=Math.min(Math.floor(.23*t),Math.max(1,Math.round((1.5+2.3*k)/(2*v)))),d=(l+u*S)*e;r.set(i.subarray(d,d+t));let w=0,_=0;for(let I=0;I<t;I++)w+=r[I]*f[I],_+=r[I]*c[I];Bt(r,o,A),Bt(o,r,A),Bt(r,o,A);let C=2*A+1,W=2*(1-(Math.sin(C*Math.PI/t)/(C*Math.sin(Math.PI/t)))**3)/t;for(let I=0;I<t;I++){let Q=W*(w*f[I]+_*c[I]);i[d+I]+=k*(o[I]+Q-i[d+I])}i[d+t]=i[d]}for(let S=0;S<=a+n*2;S++){let v=(l+u*S)*e;m.set(i.subarray(v,v+e),S*e)}let g=0;for(let S of[n,2*n]){let v=0;for(let k=0;k<t;k++)v+=m[S*e+k];g+=(S===n?8:2)*v/t}i.fill((6*m[0]+g)/16,l*e,(l+1)*e);let y=Math.floor(t/2),h=t%2;for(let S=1;S<=a;S++){let v=Math.sin(Math.PI*S/t),k=1-dt(.038,.21,v);if(k<=0)break;let A=(l+u*S)*e;for(let d=0;d<t;d++){let w=0;for(let _=0;_<5;_++){let C=S+(_-2)*n,F=Math.abs(C)*e,W=C<0?(d+y)%t:d,I=m[F+W];w+=p[_]*(C<0&&h?(I+m[F+(W+1)%t])*.5:I)}i[A+d]+=k*(w/16-i[A+d])}i[A+t]=i[A]}let b=i[l*e],x=(l+u*s)*e,M=0,B=0,z=0;for(let S=0;S<t;S++){let v=i[x+S]-b;M+=v,B+=v*f[S],z+=v*c[S]}M/=t,B*=2/t,z*=2/t;for(let S=1;S<s;S++){let v=Math.sin(Math.PI*S/t)/Math.sin(Math.PI*s/t),k=1-dt(.45,1,v),A=(l+u*S)*e;for(let d=0;d<t;d++){let w=b+(B*f[d]+z*c[d])*v+M*v*v;i[A+d]+=k*(w-i[A+d])}i[A+t]=i[A]}}}function ea(i,e,t=1){let a=e-1,r=a*(e-2),o=new Int32Array(r).fill(-1),f=new Int32Array(r).fill(-1),c=new Uint8Array(r),s=new Float32Array(r),n=new Float32Array(r),p=new Float32Array(r),m=new Uint32Array(r),l=v=>(v+a)%a,u=Float64Array.from({length:e},(v,k)=>Math.sin(Math.PI*k/a));for(let v=1;v<a;v++){let k=u[v],A=Math.max(.06,2*k),d=1/Math.hypot(1,A);for(let w=0;w<a;w++){let _=(v-1)*a+w,C=i[v*e+w];p[_]=k;let F=-1,W=-1,I=0,Q=0;for(let G=-1;G<=1;G++){let K=v+G;if(!(K<=0||K>=a))for(let N=-1;N<=1;N++){if(!N&&!G)continue;let H=l(w+N),V=(C-i[K*e+H])*(G?N?d:1:1/A),$=(K-1)*a+H;V>I?(W=F,Q=I,F=$,I=V):V>Q&&(W=$,Q=V)}}F<0||(o[_]=F,s[_]=I,c[F]++,Q>=.42*I&&(f[_]=W,c[W]++,n[_]=Q*Q/(I*I+Q*Q)))}}let g=0;for(let v=0;v<r;v++)c[v]||(m[g++]=v);for(let v=0;v<g;v++){let k=m[v],A=o[k],d=f[k];if(A<0)continue;let w=p[k]*n[k];p[A]+=p[k]-w,--c[A]||(m[g++]=A),d>=0&&(p[d]+=w,--c[d]||(m[g++]=d))}let y=new Float32Array(r),h=new Float32Array(r),b=new Float32Array(r),x=.66*Math.PI/(.023*a),M=.023*a/Math.PI,B=(1e3/a)**2,z=v=>Math.min(1,Math.max(0,v)),S=[-1,1];for(let v=0;v<r;v++){let k=Math.max(0,p[v]-u[Math.floor(v/a)+1]),A=Math.max(0,Math.min(1,(Math.log2(1+k*B)-2.65)/5.9)),d=s[v]*M;y[v]=A*(.065+.18*A)*(.7+.3*z(d/.22));let w=o[v];if(w>=0){let $=Math.max(0,s[v]-x)*.11;h[v]-=$,h[w]+=$}if(A<.5||w<0)continue;let _=Math.floor(v/a)+1,C=v%a,F=Math.floor(w/a)+1-_,W=(w%a-C+a+1)%a-1,I=s[w]*M,Q=z((d-I-.035)/.32),G=1-z(I/.28),K=$=>{let te=Math.max(1,Math.min(a-1,_+$*W));return p[(te-1)*a+l(C-$*F)]},N=z(1.8*(1-Math.max(K(-1),K(1))/p[v])),H=Q*G*N*A*.06,j=1-z(d/.13),V=i[_*e+C];for(let $ of S){let te=_+$*W;if(j>0&&te>0&&te<a){let J=l(C-$*F),D=(te-1)*a+J,R=i[te*e+J]-V-.018;b[D]=Math.max(b[D],Math.min(.043,Math.max(0,R))*j*A)}if(H>0)for(let J=1;J<=3;J++){let D=_+J*F+$*W*Math.min(J,2);if(D<1||D>=a)continue;let R=l(C+J*W-$*F*Math.min(J,2));h[(D-1)*a+R]+=H*(1-J/4)}}}for(let v=1;v<a;v++){let k=t*at(v,a);for(let A=0;A<a;A++){let d=(v-1)*a+A,w=0;for(let _=-1;_<=1;_++){let C=Math.max(1,Math.min(a-1,v+_));for(let F=-1;F<=1;F++)w+=y[(C-1)*a+l(A+F)]*(F?1:2)*(_?1:2)}i[v*e+A]+=k*(Math.min(.06,h[d])-b[d]-.52*y[d]-.82*w/16)}i[v*e+a]=i[v*e]}return i}var Le=2*Math.PI,we=(i,e,t)=>Math.min(t,Math.max(e,i)),ve=(i,e,t)=>{let a=we((t-i)/(e-i),0,1);return a*a*(3-2*a)};function ta(i,e,t){return e*(.9*Math.sin(Le*i)+.34*Math.sin(1.7*Le*i+t*Le))}function Ya(i,e,t,a,r,o){let{x:f,y:c,xScale:s,yScale:n,dx:p,dy:m,length:l,width:u,bend:g,branch:y,cirque:h,head:b,outlet:x}=a,M=e-1,B=t.side-1,z=we(b-x,.14,.73),S=g/l,v=G=>x-.04*z+.7*z*(1-we(G,0,1))**2,k=[],A=4+Math.floor(4*h);for(let G=0;G<A;G++){let K=.16+.79*(G+.15+.7*o())/A,N=.1+.24*o(),H=y*(G%2?-1:1)*(.065+.14*o()),j=K-N,V=(.31+.3*o())*u/l;if(k.push({start:j,end:K,offset:H,root:0,bank:V,depth:.43+.24*o()}),o()<.74){let $=.33+.32*o(),te=j+N*$,J=H*(1-$)**1.3;k.push({start:te-(.055+.105*o()),end:te,offset:-H*(.24+.28*o()),root:J,bank:.63*V,depth:.32})}}let d=p*l/s,w=m*l/n,_=.39*l,C=Math.max(1,Math.floor(c+Math.min(-.37*w,1.11*w)-_/n)),F=Math.min(M-1,Math.ceil(c+Math.max(-.37*w,1.11*w)+_/n)),W=Math.floor(f+Math.min(-.37*d,1.11*d)-_/s),I=Math.ceil(f+Math.max(-.37*d,1.11*d)+_/s),Q=.58*Math.hypot(m*s,p*n)/l;for(let G=C;G<=F;G++){let K=Math.round(G*B/M)*t.side;for(let N=W;N<=I;N++){let H=(N-f)*s,j=(G-c)*n,V=(H*p+j*m)/l;if(V<=-.37||V>=1.11)continue;let $=(-H*m+j*p)/l-ta(V,S,h);if(Math.abs($)>.3)continue;let te=(N%M+M)%M,J=G*e+te,D=i[J],R=ve(-.02,.23,V),O=Math.max(Q,u/l*(.32+.68*R)*(1+.22*Math.sin(13*V+h*Le))),q=$*y<0?.69:1.13,Y=Math.max(0,1-Math.abs($)/(O*q)),T=ve(-.03,.14,V)*(1-ve(.94,1.11,V)),Z=T*Y**1.25*we(D-v(V)+.24*z,0,.88),X=T*Y;for(let P of k){if(V<=P.start||V>=P.end+.025)continue;let E=we((V-P.start)/(P.end-P.start),0,1),U=P.root+P.offset*(1-E)**1.3,L=Math.max(Q*.75,P.bank*(.22+.78*E)),ae=Math.max(0,1-Math.abs($-U)/L),re=ve(0,.46,E)*(1-ve(P.end,P.end+.025,V)),ie=v(P.end)+z*.42*(1-E);Z=Math.max(Z,re*ae*we(D-ie+.1*z,0,.72)*P.depth),X=Math.max(X,.72*re*ae)}if(i[J]=D-r*Z,X>0){let P=Math.round(te*B/M)%B,E=K+P;t.values[E]=Math.max(t.values[E],r*X),P===0&&(t.values[K+B]=t.values[E])}}i[G*e+M]=i[G*e]}}function Ct(i,e,t,a,r){let o=!!r,f=ve(.18,.84,a);if(e<257||f===0)return[];let c=e-1,s=d=>(d%c+c)%c,n=(d,w)=>i[we(Math.round(w),0,c)*e+s(Math.round(d))],p=(d,w)=>{let _=d/c*Le,C=w/c*Math.PI;return[Math.sin(C)*Math.cos(_),Math.cos(C),Math.sin(C)*Math.sin(_)]},m=t>>>0,l=()=>(m=Math.imul(m,1664525)+1013904223>>>0,m/2**32),u=[],g=[],y=[];for(let d=0;d<24;d++){let w=Math.acos(1-(d+.5)/12)*c/Math.PI;for(let _=0;_<48;_++)y.push(n((_+.5)*c/48,w))}y.sort((d,w)=>d-w);let h=y[Math.floor(y.length*.71)]+.19,b=32,x=20;for(let d=0;d<x;d++)for(let w=0;w<b;w++){let _=(w+l())*c/b,C=(.23+.54*(d+l())/x)*c,F=Le*Math.sin(C/c*Math.PI)/c,W=Math.PI/c,I=(o?.195:.075)+(o?.25:.055)*l(),Q=l(),G=o?.005+I*(.019+.023*Q):I*(.17+.065*Q),K=(o?I*.12:G*1.25)*(l()-.5),N=l()<.5?-1:1,H=l(),j=l()*Le,V=n(_,C),$=p(_,C),te=$[0]*.54+$[1]*.45+$[2]*.71,J,D;for(let R=0;R<8;R++){let O=j+R*Le/8,q=Math.cos(O),Y=Math.sin(O),T=n(_+q*I/F,C+Y*I/W),Z=V-T;if(Z<(o?.085:.25))continue;let X=n(_+q*I*.52/F,C+Y*I*.52/W),P=n(_+(q*I*.4-Y*G)/F,C+(Y*I*.4+q*G)/W),E=n(_+(q*I*.4+Y*G)/F,C+(Y*I*.4-q*G)/W),U=Math.min(P,E)-T,L=.65*we(Z,0,1.3)+.58*we(U,-.35,.85)+.24*we(X-T,-.45,.65)+.46*te+.16*l()+(o?.6*I:0),ae={x:_,y:C,xScale:F,yScale:W,dx:q,dy:Y,length:I,width:G,bend:K,branch:N,cirque:H,head:V,outlet:T,score:L};(!J||L>J.score)&&(J=ae),T>=h&&(!D||L>D.score)&&(D=ae)}J&&u.push(J),D&&g.push(D)}let M=[],B=u.map(({outlet:d})=>d).sort((d,w)=>d-w),z=B[Math.floor(B.length*.76)],S=B[Math.floor(B.length*.44)];u.sort((d,w)=>w.score-d.score);let v=d=>M.every(({x:w,y:_})=>Math.hypot(Math.min(Math.abs(w-d.x),c-Math.abs(w-d.x))*d.xScale,(_-d.y)*d.yScale)>=(o?.2:.31)),k=g.sort((d,w)=>w.score-d.score)[0];k&&M.push(k);let A=u.find(d=>d.outlet<=z&&d.outlet>=S&&v(d));A&&M.push(A);for(let d of u)if(v(d)&&(M.push(d),M.length===(o?11+(t>>>5)%5:4)))break;return M.map(d=>{let{x:w,y:_,xScale:C,yScale:F,dx:W,dy:I,length:Q,width:G,bend:K,branch:N,cirque:H,head:j,outlet:V}=d,$=X=>{let P=r?ta(X,K,H):0;return p(w+(X*W*Q-I*P)/C,_+(X*I*Q+W*P)/F)},te={overlook:$(.93),head:$(.12)};if(r)return Ya(i,e,r,d,f,l),te;let J=we(j-V,.26,1.14),D=W*Q/C,R=I*Q/F,O=Math.floor(w+Math.min(0,D)-3.2*G/C),q=Math.ceil(w+Math.max(0,D)+3.2*G/C),Y=Math.max(1,Math.floor(_+Math.min(0,R)-3.2*G/F)),T=Math.min(c-1,Math.ceil(_+Math.max(0,R)+3.2*G/F)),Z=X=>V-.09*J+.63*J*(1-X)**2;for(let X=Y;X<=T;X++){for(let P=O;P<=q;P++){let E=(P-w)*C,U=(X-_)*F,L=(E*W+U*I)/Q,ae=K*Math.sin(Math.PI*L),re=(-E*I+U*W-ae)/G,ie=we(L,0,1),se=.68+(.28+.37*H)*(1-ve(.04,.36,ie))+(.22+.24*(1-H))*ve(.56,.97,ie),ee=ve(-.17,.07,L)*(1-ve(.83,1.19,L))*(1-ve(.25,1,Math.abs(re)/se)),oe=X*e+s(P),le=i[oe],ue=ee*we(le-Z(ie),0,.95),pe=H>.28?2:1;for(let xe=0;xe<pe;xe++){let de=xe===0?N:-N,Be=.25+.14*H+xe*.31,ge=re*de,Ae=L-Be+.16*ge-.021*ge*ge,Te=1-ve(.047,.16+.07*H,Math.abs(Ae)),Qe=2+.55*H-.3*xe,Ye=Te*ve(.21,.72,ge)*(1-ve(Qe*.59,Qe,ge)),Je=Z(Be)+J*(.18+.09*we(ge,0,2.6));ue=Math.max(ue,Ye*we(le-Je,0,.62))}let me=.89-.11*re*re,he=(1-ve(.015,.067,Math.abs(L-me)))*(1-ve(.56,.97,Math.abs(re)))*ve(-.7,.28,re*N)*J*H*.075;i[oe]=le+f*(he-ue)}i[X*e+c]=i[X*e]}return te})}var kt=123456789;var Rt=Object.freeze({natural:0,mesas:1,fractal:2,mosaic:3});function aa(i){let e=(i^1353215269)>>>0;return e=Math.imul(e^e>>>16,2146121005),e=Math.imul(e^e>>>15,2221713035),.24+.88*(((e^e>>>16)>>>0)/4294967296)**1.12}function Fe({regions:i},[e,t,a],r){if(!i)return r==="mesa"?[0,1,0,0]:r==="volcanic"?[0,0,0,1]:[1,0,0,0];let{side:o,values:f}=i,c=o-1,s=Math.hypot(e,a),n=s>0?Math.atan2(a,e)/(2*Math.PI):0,p=(n-Math.floor(n))*c,m=Math.atan2(s,t)*c/Math.PI,l=Math.floor(p),u=Math.floor(m),g=Math.min(c,u+1),y=p-l,h=m-u,b=f[u*o+l],x=f[u*o+Math.min(c,l+1)],M=f[g*o+l],B=f[g*o+Math.min(c,l+1)],z=w=>((b>>>w&255)*(1-y)*(1-h)+(x>>>w&255)*y*(1-h)+(M>>>w&255)*(1-y)*h+(B>>>w&255)*y*h)/255,S=z(0),v=z(8),k=z(16),A=S+v+k,d=1/Math.max(1,A);return[Math.max(0,1-A),S*d,v*d,k*d]}function qt(i=123456789,{reseedLayers:e=i!==123456789}={}){let t=i>>>0;function a(){t+=1831565813;let l=Math.imul(t^t>>>15,1|t);return l^=l+Math.imul(l^l>>>7,61|l),((l^l>>>14)>>>0)/4294967296}let r=l=>(a()<.5?-1:1)*a()*l,o=r(.3),f=r(.1),c=a()*.4-.2+.65,s=a()*.2-.1+.65,n=a()*.2-.1,p=2.4,m=[["computeFBM",.8,6,2,.75,n+2],["computeFBM2",1,8,2,.75,n+1.3],["computeVoronoiTileNoise",.35,2,2,.9,c],["computeRidgedMultifractal4",.2,6,2.1,1,c],["computeLanczosBillow",.5,6,2,1,s]].map(([l,u,g,y,h,b],x)=>({entryPoint:l,params:{seed:e?i+(x+1)*15485863>>>0:i,zoom:p*u,freq:1,octaves:g,lacunarity:y,gain:.5,scalar:h,transform:0,xShift:b,yShift:b,zShift:b,seedAngle:Math.PI/2,threshold:.3,voroMode:2,warpAmp:0}}));return{seed:i,sphereOffset:o,sphereOffset2:f,layers:m}}function gt(i,e,t,a,r){return e+r*(.5*(t-i)+r*(i-2.5*e+2*t-.5*a+r*(.5*(a-i)+1.5*(e-t))))}function rt(i,e,t,a,r){return .5*(t-i)+r*(2*(i-2.5*e+2*t-.5*a)+r*(1.5*(a-i)+4.5*(e-t)))}function Ft({side:i,values:e},[t,a,r],o){let f=Math.hypot(t,r),c=f>0?Math.atan2(r,t)/(2*Math.PI):0,s=(c-Math.floor(c))*(i-1),n=Math.atan2(f,a)*(i-1)/Math.PI,p=Math.floor(n),m=x=>(x+i-1)%(i-1),l=(x,M,B=gt)=>{(x<0||x>=i)&&(x=x<0?-x:2*(i-1)-x,M+=(i-1)*.5);let z=Math.floor(M),S=x*i;return B(e[S+m(z-1)],e[S+m(z)],e[S+m(z+1)],e[S+m(z+2)],M-z)},u=(x,M=gt)=>l(p+x,s,M),g=u(-1),y=u(0),h=u(1),b=u(2);if(o&&f>1e-5){let x=gt(u(-1,rt),u(0,rt),u(1,rt),u(2,rt),n-p),M=rt(g,y,h,b,n-p),B=x/(2*Math.PI*f**2),z=M/(Math.PI*f),S=(i-1)*.023;o[0]=(-r*B+t*a*z)*S,o[1]=-f*f*z*S,o[2]=(t*B+r*a*z)*S}else if(o){let x=i-1,M=a>0?1:x-1,B=.023/(2*Math.sin(Math.PI/x));o[0]=(l(M,0)-l(M,x*.5))*B,o[1]=0,o[2]=(l(M,x*.25)-l(M,x*.75))*B}return gt(g,y,h,b,n-p)}function Ie(i,e,t,a){let r=Math.imul(i,2376512323)^Math.imul(e,3625334849)^Math.imul(t,3407524639)^Math.imul(a,374761393);return r=Math.imul(r^r>>>16,2146121005),r=Math.imul(r^r>>>15,2221713035),(r^r>>>16)>>>0}function ra(i,e,t,{min:a,max:r,mean:o,coverage:f}={}){if(f===0)return null;let c=Ie(0,0,0,t);if(f===void 0&&c>=2147483648)return null;if(a===void 0){a=1/0,r=-1/0;let u=0;for(let g of i)a=Math.min(a,g),r=Math.max(r,g),u+=g;o=u/i.length}let s=r-a;if(s===0)return a;let n=new Float64Array(96),p=Math.max(1,Math.floor((e-1)/160)),m=0;for(let u=1;u<e-1;u+=p){let g=Math.sin(Math.PI*u/(e-1));for(let y=0;y<e-1;y+=p){let h=Math.min(95,Math.floor((i[u*e+y]-a)/s*96));n[h]+=g,m+=g}}let l=m*(f??.28+.36*(c/2147483648));for(let u=0;u<n.length;u++){let g=n[u];if(g>0&&l<=g)return a+s*(u+l/g)/96;l-=g}return o}function be(i,e,t){let a=Math.max(0,Math.min(1,(t-i)/(e-i)));return a*a*(3-2*a)}function ia(i,e,t,a){let r=e-1,o=Math.max(1,Math.round(r/300)),f=r/65,c=.023*r/(2*Math.PI*o),s=i.slice();function n(p,m){let l=Math.floor(p),u=(l+r)%r,g=(u+1)%r,y=Math.max(0,Math.min(r,m)),h=Math.min(r-1,Math.floor(y)),b=p-l,x=y-h,M=h*e,B=s[M+u]*(1-b)+s[M+g]*b,z=s[M+e+u]*(1-b)+s[M+e+g]*b;return be(.025,.22,t-(B*(1-x)+z*x))}for(let p=o;p<=r-o;p++){let m=p*e,l=Math.sin(Math.PI*p/r),u=be(.08,.24,l);if(u===0)continue;let g=2*l,y=Math.max(1,Math.round(o/g));for(let h=0;h<r;h++){let b=s[m+h],x=b-t;if(x<-.2||x>.19)continue;let M=(s[m+(h+y)%r]-s[m+(h+r-y)%r])*o/(y*g),B=s[m+h+o*e]-s[m+h-o*e],z=Math.hypot(M,B),S=z*c;if(S<=.025)continue;let v=M/z,k=B/z,A=h-v*f/g,d=p-k*f,w=k*f*.58/g,_=-v*f*.58,C=be(.19,.84,.46*n(A,d)+.27*(n(A+w,d+_)+n(A-w,d-_))),F=be(.07,.36,S)*(.26+.74*C),W=(1-C)*be(.025,.13,S)*(1-be(.23,.56,S)),I=Math.min(x*.65,.058*(1-be(.035,.19,x))),Q=Math.min(-x*.64,.075*(1-be(.055,.2,-x))),G=Math.min(x*.52,.035*(1-be(.025,.13,x))),K=Math.min(-x*.68,.078*(1-be(.07,.2,-x))),N=x>=0?-F*I-W*G:F*Q+W*K;if(a!==void 0&&x>0){let j=be(.025,.075,x)*(1-be(.12,.19,x));if(a==="mesa"){let V=.05+.035*C,$=x/V,te=(Math.floor($)+be(.16,.76,$%1))*V;N+=.72*j*F*(te-x)}else{let V=.045*W*(1-be(.07,.15,x));N+=j*(V-.035*F)}}if(a!==void 0&&x<0){let j=-x,V=be(.012,.065,j)*(1-be(.09,.2,j));N+=V*(a==="mesa"?.064:.041)*W}let H=b+u*N;i[m+h]=x>=0?Math.max(t,H):Math.min(t,H)}i[m+r]=i[m]}}var De=2*Math.PI,oa=(i,e,t)=>Math.min(t,Math.max(e,i)),fe=(i,e,t)=>i+(e-i)*t;function Se(i,e,t){let a=oa((t-i)/(e-i),0,1);return a*a*(3-2*a)}function It(i,e,t=!1){let a=Math.imul(i^i>>>16,2246822507)^3355159585,r=()=>(a=Math.imul(a,1664525)+1013904223>>>0,a/4294967296),o=r(),f=o<.44?1:o<.81?2:3+Math.floor(r()*2),c=r()*De,s=[Math.cos(c),Math.sin(c)],n=r();return Array.from({length:t?1:f},(p,m)=>{let l=m===0,u=l?0:.51+.94*r(),g=(r()-.5)*u*(f===2?.84:1.6),y=s[0]*u-s[1]*g,h=s[1]*u+s[0]*g,b=l?.87+.24*r():(f===2?.38:.24)+.39*r(),x=l?n:.12+.7*r(),M=r()*De,B=.7+.3*r(),z=Math.cos(M),S=Math.sin(M),v=Array.from({length:12},(_,C)=>{let F=C*De/12,W=b*Math.cos(F),I=b*B*Math.sin(F);return e(y+W*z-I*S,h+W*S+I*z)}),k=v.reduce((_,C)=>_+C,0)/v.length,A=v.indexOf(Math.min(...v)),d=v.indexOf(Math.max(...v)),w=(.41+.38*r())*b**.74*fe(1,.69,x);return{x:y,y:h,size:b,stretch:B,cos:z,sin:S,datum:k,depth:w,wear:x,low:A*De/12,high:d*De/12,breach:fe(.19,.66,x)+.12*r(),rim:.33+.25*r(),harmonics:3+Math.floor(r()*5),warp:.042+.075*r(),offset:r()*De,bench:.6+.13*r(),rebound:b<.48?0:Math.floor(r()*4),reboundAngle:r()*De,reboundHeight:.34+.41*r()}})}function Tt(i,e,t,a){let r=i-a.x,o=e-a.y,f=1.53*a.size*(1.021+a.warp);if(r*r+o*o>=f*f)return t;let c=(r*a.cos+o*a.sin)/a.size,s=(o*a.cos-r*a.sin)/(a.size*a.stretch),n=Math.atan2(s,c),p=Math.cos(a.harmonics*n+a.offset+.7*Math.sin(3*n)),m=Math.cos((a.harmonics+5)*n-a.offset),l=Math.hypot(c,s)/(1+a.warp*p+.021*m);if(l>=1.53)return t;let u=Se(.76-.2*a.wear,.99,Math.cos(n-a.low)),g=a.breach*u,h=a.datum-a.depth*(1-(a.flatFloor?.065:.19)*l*l)+a.depth*(a.flatFloor?.045:.14)*(c*Math.cos(a.high)+s*Math.sin(a.high)),b=Se(a.bench-.1,a.bench,l)*(1-Se(a.bench+.08,a.bench+.18,l)),x=Se(.66-.09*a.wear,.96,l),M=Se(.84-.06*a.wear,1,l)*(1-Se(1.02,1.24+.1*a.wear,l)),B=a.depth*a.rim*M*(1+.28*p+.11*m)*(1-g),z=c*Math.cos(a.reboundAngle)+s*Math.sin(a.reboundAngle),S=s*Math.cos(a.reboundAngle)-c*Math.sin(a.reboundAngle),v=0;a.rebound===1?v=1-Se(.035,.33,Math.hypot(z+.1,S*1.35)):a.rebound===2?v=Math.max(1-Se(.02,.24,Math.hypot(z+.17,S-.08)),.76*(1-Se(.025,.2,Math.hypot(z-.19,S+.07)))):a.rebound===3&&(v=(1-Se(.025,.14,Math.abs(Math.hypot(z,S*.92)-.29)))*Se(-.66,.44,p+.5*m));let k=Se(1,1.16,l)*(1-Se(1.16,1.53,l)),A=a.depth*.11*k*(.57+.26*p+.15*m),d=h+a.depth*((1.06-.62*g)*x+.26*b+a.reboundHeight*v),w=(1-Se(.89,1.2,l))*(a.flatFloor?.98:fe(.94,.72,a.wear));return fe(t,d,w)+B+A}function Nt(i,e=!1){let t=(f,c)=>Ie(f,c,613,i)/4294967296,a=t(-1,0),r=e?1+Math.floor(4*a):a<.012?2:a<.08?1:0,o=t(0,0)*De;return Array.from({length:r},(f,c)=>{let s=fe(-.54,.54,t(c,1)),n=o+c*De/r+fe(-.39,.39,t(c,2)),p=Math.sqrt(1-s*s),m=c===0?fe(.32,.43,t(c,3)):fe(.17,.3,t(c,3));return{center:[p*Math.cos(n),s,p*Math.sin(n)],longitude:n,size:m}})}function Wt(i,e,t,a,r=1,o=!1,f=a>0||o?Nt(t,o):[],c=0){if(a<=0&&!f.length)return 0;let s={side:e,values:i},n=e-1,p=Math.PI/n,m=De/n,l=(W,I)=>Ie(W,I,187,t)/4294967296,u=l(0,0),g=o?Math.max(.72,r):r,y=o?fe(115,190,l(0,1)):u<.48?fe(0,5,l(0,1)):u<.79?fe(12,31,l(0,1)):fe(62,134,l(0,1)),h=Math.min(640,Math.round(a*g**2*y)),b=Math.min(1,c),x=Math.max(0,c-1),M=b**4,B=Math.max(1,g),z=Math.round((M*fe(190,255,u)+x*B*fe(355,490,u))*fe(.72,1,a)),S=Math.round((b*fe(295,440,u)+710*M+860*x*B)*fe(.65,1,a)),v=Float64Array.from({length:e},(W,I)=>Math.sin(I*p)),k=Float64Array.from({length:e},(W,I)=>Math.cos(I*p)),A=Float64Array.from({length:n},(W,I)=>Math.sin(I*m)),d=Float64Array.from({length:n},(W,I)=>Math.cos(I*m)),w=new Float64Array(n),_=new Float64Array(n),C=new Int32Array(n),F=0;for(let W=-f.length;W<h+z+S;W++){let I=W<0?f[W+f.length]:void 0,Q=W>=h&&W<h+z,G=W>=h+z,K=l(W,2),N=I?.size??(G?(.008+.067*K**fe(fe(3,2.3,M),1.7,x))/Math.sqrt(g):Q?(.036+.092*K**fe(2.7,1.7,x))/Math.sqrt(g):(.014+.103*K**2.3)/g);if(N<2.1*p||!I&&N>.28)continue;let H=x>0&&(Q||G)?.998:Math.min(.94,Math.cos(2*N+.04)),j=Math.acos(I?.center[1]??fe(-H,H,l(W,3))),V=I?(I.longitude+De)%De:De*l(W,4),$=Math.sin(j),te=Math.cos(j);if(N<1.4*m*$)continue;let J=Math.sin(V),D=Math.cos(V),R=[$*D,te,$*J],O=[-J,0,D],q=[-te*D,$,-te*J],Y=(ee,oe)=>{let le=Math.hypot(1,ee*N,oe*N);return Ft(s,R.map((ue,pe)=>(ue+N*(ee*O[pe]+oe*q[pe]))/le))},[T]=It(Ie(W,5,187,t),Y,!0),Z=l(W,6),X=I?fe(.38,.62,Z):G||Q?fe(.12,.85,Z):fe(.86,.13,(W+Z)/Math.max(1,h)),P=I?fe(.79,1.15,N/.43):T.depth*fe(1.02,.63,X)*(G?fe(.12+.065*M,.51+.15*M,K**1.8)+.22*x:Q?fe(.42,.92,K)+.22*x:fe(.31,.95,(N*g-.014)/.103)),E=I?{...T,wear:X,depth:P,size:1,stretch:fe(.9,.99,l(W,7)),warp:.42*T.warp,breach:.18,rim:.38,rebound:l(W,8)<.32?3:0,reboundHeight:.28,flatFloor:!0}:{...T,wear:X,depth:P,stretch:fe(.81,1,l(W,7)),rim:Q?Math.max(.49,T.rim):T.rim,rebound:G&&K<.84?0:T.rebound},U=Math.asin(1.53*E.size*(1.021+E.warp)*N),L=U>=Math.min(j,Math.PI-j),ae=Math.max(L?0:1,Math.ceil((j-U)/p)),re=Math.min(L?n:n-1,Math.floor((j+U)/p)),ie=L?Math.floor(n/2):Math.ceil(Math.asin(oa(Math.sin(U)/$,0,1))/m)+1,se=Math.round(V/m),ne=Math.min(n,2*ie+1);for(let ee=0;ee<ne;ee++){let oe=(se-ie+ee+n)%n;C[ee]=oe,w[ee]=(A[oe]*D-d[oe]*J)/N,_[ee]=(d[oe]*D+A[oe]*J)/N}for(let ee=ae;ee<=re;ee++){let oe=ee===0||ee===n?0:v[ee],le=$*k[ee]/N,ue=ee*e;for(let pe=0;pe<ne;pe++){if(L&&te*k[ee]+$*oe*_[pe]*N<=0)continue;let me=oe*w[pe],he=le-te*oe*_[pe],xe=ue+C[pe];i[xe]=Tt(me,he,i[xe],E)}i[ue+n]=i[ue]}F++}return F}var ot=2*Math.PI,Et=(i,e,t)=>Math.min(t,Math.max(e,i)),Ve=(i,e,t)=>i+(e-i)*t;function ce(i,e,t){let a=Et((t-i)/(e-i),0,1);return a*a*(3-2*a)}function sa(i){return()=>(i=Math.imul(i,1664525)+1013904223>>>0,i/4294967296)}function na(i,e,t){let a=ot*e/i,r=Math.PI*t/i,o=Math.sin(r);return[o*Math.cos(a),Math.cos(r),o*Math.sin(a)]}function Xa(i){let e=[],t=3+Math.floor(3*i());for(let a=0;a<t;a++){let r=i()*Math.PI,o=Math.cos(r),f=Math.sin(r),c=1.6*(i()-.5),s=-1.15+.38*i(),n=.2+.17*i();for(let p=s;p<1.12;p+=n*(.7+.66*i())){let m=c+.27*(i()-.5);e.push({x:p*o-m*f,y:p*f+m*o,width:.19+.23*i(),depth:.14+.32*i(),elongation:.58+.4*i()})}}return e}function ja(i,e,t,a,r){let o=.1*Math.sin(5*e+2*i),f=1-ce(.77,1.36,Math.hypot(i*.88,e));if(f<=0)return t;let c=0,s=0,n=1.4,p=1.4;for(let x of r){let M=i+o-x.x,B=e-x.y;if(Math.abs(M)*x.elongation>1.4*x.width||Math.abs(B)>1.4*x.width)continue;let z=Math.hypot(M*x.elongation,B)/x.width;z<n?(p=n,n=z):p=Math.min(p,z);let S=1-ce(.12,.95,z);c=Math.max(c,S*x.depth),s=Math.max(s,.045*ce(.19,.51,z)*(1-ce(.54,.84,z)))}let m=1-ce(.04,.24,Math.abs(e-.25*Math.sin(3.4*i)+.07*i)),l=ce(.04,.19,c),u=Math.max(c,.17*m)+.05*m*l,g=Ve(t,a+.13,.7),y=.14*(1-ce(.02,.12,c))*ce(.08,.28,m+s),b=.26*((1-ce(.07,.48,p-n))*ce(.4,.79,n)*(1-ce(1.06,1.37,p)))*(.72+.28*Math.sin(7*i-9*e));return Ve(t,g-u+s+y+b,f)}function la(i,e){return e.bend*Math.sin(e.curve*i+e.phase)+e.shift*(ce(e.first-.25,e.first,i)-ce(e.last,e.last+.36,i))}function Za(i,e,t){let a={phase:e,bend:.08+.16*i(),curve:.72+1.86*i(),shift:.44*(i()-.5),first:-1.1+.86*i(),last:.12+.89*i(),width:.17+.17*i(),depth:.43+.21*t,vents:[],splays:[]},r=1+Math.floor(4*i());for(let f=0;f<r;f++){let c=-1.39+2.76*(f+.19+.63*i())/r;a.vents.push({at:c,across:la(c,a)+.64*(i()-.5),width:.12+.26*i(),height:.28+.44*i(),crater:.09+.17*i()})}let o=Math.floor(3*i());for(let f=0;f<o;f++)a.splays.push({start:-1.32+1.65*i(),length:.76+.83*i(),reach:(i()<.5?-1:1)*(.38+.5*i())});return a}function Ka(i,e,t,a,r,o){let f=1-ce(1.35,2.25,Math.abs(i));if(f<=0)return t;let{phase:c,depth:s}=r,n=r.width+.14*ce(-.68,.79,Math.cos(i*3.6+c)),p=e-la(i,r),m=p<0?-1:1,l=ce(-.7,.7,m*Math.sin(1.9*i+c)),u=Math.abs(p)/(n*Ve(1.28,.82,l)),g=a-s-o*.35*i+.1*ce(.3,.95,Math.sin(i*4.5+c)),y=ce(.46,Ve(1.2,.87,l),u),h=ce(.66,.83,u)*(1-ce(.86,1.13,u)),b=1-ce(.75,1.28,u),x=ce(.48,.84,u)*(1-ce(.96,1.18,u)),M=Ve(g+s*y,t,.12+.2*y);M+=.11*l*h+.065*x*(1-l);let B=Ve(t,M,f*b),z=ce(.76,1.08,u)*(1-ce(1.19,1.86,u));B+=f*z*Ve(.038,.21,l);let S=0;for(let{start:v,length:k,reach:A}of r.splays){let d=(i-v)/k;if(d<=0||d>=1)continue;let w=Math.abs(p-A*(.18+.82*d)),_=ce(0,.22,d)*(1-ce(.69,1,d))*(1-ce(.065,.23,w));S=Math.max(S,.23*_)}B-=S;for(let v of r.vents){let k=Math.hypot(i-v.at,e-v.across)/v.width;if(k>=1.24)continue;let A=1-ce(.09,1.24,k),d=1-ce(.1,.39,k);B+=v.height*A**1.4-v.crater*d}return B}var it=(i,e)=>i[0]*e[0]+i[1]*e[1]+i[2]*e[2];function fa(i,e,t,a,r,o){let f={impact:[],karst:[],rift:[]},c=ce(.24,.85,a);if(e<257||c<=0)return f;let s=e-1,n=d=>(d%s+s)%s,p=Math.PI/s,m=(d,w)=>i[Et(Math.round(w),0,s)*e+n(Math.round(d))],l=r.flatMap(({overlook:d,head:w})=>[d,w]),u=sa(t^2476863307),g=[];for(let d=0;d<13;d++)for(let w=0;w<28;w++){let _=(w+u())*s/28,C=(.22+.56*(d+u())/13)*s,F=na(s,_,C),W=.54*F[0]+.45*F[1]+.71*F[2];if(l.some(D=>it(D,F)>.95))continue;let I=ot*Math.sin(C*p)/s,Q=.067+.035*u(),G=u()*ot,K=Array.from({length:8},(D,R)=>{let O=G+R*ot/8;return m(_+Q*Math.cos(O)/I,C+Q*Math.sin(O)/p)}),N=K.reduce((D,R)=>D+R,0)/K.length,H=Math.max(...K)-Math.min(...K),j=m(_,C),[,V,$,te]=Fe({regions:o},F),J=.54*V+.48*$;g.push({x:_,y:C,dir:F,xStep:I,radius:Q,phase:G,datum:N,relief:H,height:j,light:W,bedrock:J,volcanic:te,samples:K,chance:u()})}if(!g.length)return f;let y=g.map(({datum:d})=>d).sort((d,w)=>d-w),h=y[Math.floor(y.length*.7)],b=({datum:d,height:w,light:_,relief:C,chance:F})=>1.3*_-Math.abs(d-h-.26)-.44*C-.32*Math.abs(w-d)+.2*F,x=({datum:d,height:w,light:_,relief:C,bedrock:F,chance:W})=>_-Math.abs(d-h-.36)-.65*C+.4*(w-d)+F+.3*W,M=g.sort((d,w)=>b(w)-b(d))[0],B=g.filter(({dir:d})=>it(d,M.dir)<.94).sort((d,w)=>x(w)-x(d))[0],z=d=>({datum:w,relief:_,light:C,volcanic:F,chance:W})=>C-1.26*Math.abs(w-d)-.38*_+.64*F+.17*W,S=g.filter(({dir:d})=>it(d,M.dir)<.91&&(!B||it(d,B.dir)<.92)),v=(d,w)=>{let _=z(w);return d.sort((C,F)=>_(F)-_(C))[0]},k=v(S,y[Math.floor(y.length*.56)]+.3),A=k&&v(S.filter(({dir:d,datum:w})=>it(d,k.dir)<.91&&w>k.datum+.29),h+.6);for(let[d,w]of[["impact",M],["karst",B],["rift",k],["rift",A]]){if(!w)continue;let{x:_,y:C,xStep:F,radius:W,phase:I,datum:Q,chance:G}=w,K=d==="rift",N=K?w.samples.indexOf(Math.min(...w.samples)):0,H=I+N*ot/8,j=Math.cos(H),V=Math.sin(H),$=d==="impact",te=$?It(t,(U,L)=>m(_+(U*j-L*V)*W/F,C+(U*V+L*j)*W/p)).sort((U,L)=>L.wear-U.wear):[],J=Math.max(0,...te.map(({x:U,y:L,size:ae,warp:re})=>Math.hypot(U,L)+1.53*ae*(1.021+re))),D=W*(K?2.65:$?J:1.56),R=d==="karst"?Xa(u):[],O=Math.imul(t^t>>>16,2246822507)^Math.imul(Math.floor(_),2654435761),q=K?Za(sa(O),I,G):null,Y=K?Et(Q-w.samples[N],.03,.28):0;for(let U=Math.max(1,Math.ceil(C-D/p));U<=Math.min(s-1,C+D/p);U++){for(let L=Math.ceil(_-D/F);L<=_+D/F;L++){let ae=(L-_)*F/W,re=(U-C)*p/W,ie=ae*j+re*V,se=re*j-ae*V,ne=U*e+n(L),ee=i[ne],oe=ee;if($)for(let le of te)oe=Tt(ie,se,oe,le);else K?oe=Ka(ie,se,ee,Q,q,Y):oe=ja(ie,se,ee,Q,R);i[ne]=Ve(ee,oe,c)}i[U*e+s]=i[U*e]}let T=K?1.68:$?-Math.max(1.05,J*.46):-.97,Z=K?.65:0,X=0,P=0;if($){let U=te.reduce((L,ae)=>L+ae.size,0);for(let L of te)X+=L.x*L.size/U,P+=L.y*L.size/U}let E=(U,L)=>na(s,_+(U*j-L*V)*W/F,C+(U*V+L*j)*W/p);f[d].push({overlook:E(X+T,P+Z),target:E(X,P)})}return f}var Ze=2*Math.PI,yt=(i,e,t)=>Math.min(t,Math.max(e,i)),st=(i,e,t)=>i+(e-i)*t;function ze(i,e,t){let a=yt((t-i)/(e-i),0,1);return a*a*(3-2*a)}function ca(i,e,t){let a=Ze*i/t,r=Math.PI*e/t,o=Math.sin(r);return[o*Math.cos(a),Math.cos(r),o*Math.sin(a)]}function pa(i,e,t,a,r,o,f){let c=ze(.31,.76,a);if(e<513||c<=0)return;let s=e-1,n=q=>(q%s+s)%s,p=Math.PI/s,m=(q,Y)=>i[yt(Math.round(Y),0,s)*e+n(Math.round(q))],l=[];for(let q=0;q<24;q++){let Y=Math.acos(1-(q+.5)/12)/p;for(let T=0;T<40;T++)l.push(m((T+.5)*s/40,Y))}l.sort((q,Y)=>q-Y);let u=l[Math.floor(l.length*.74)]+.14,g=[...r.map(({head:q})=>q),...Object.values(o).flat().map(({target:q})=>q)],y=Math.imul(t^t>>>17,1757159915)^1900846437,h=()=>(y=Math.imul(y,1664525)+1013904223>>>0,y/4294967296),b;for(let q=0;q<17;q++)for(let Y=0;Y<32;Y++){let T=(Y+h())*s/32,Z=(.22+.56*(q+h())/17)*s,X=ca(T,Z,s);if(g.some(se=>se[0]*X[0]+se[1]*X[1]+se[2]*X[2]>.955))continue;let P=.54*X[0]+.45*X[1]+.71*X[2];if(P<.22)continue;let E=Ze*Math.sin(Z*p)/s,U=.042+.018*h(),L=h()*Ze,[,ae,re,ie]=Fe({regions:f},X);for(let se=0;se<8;se++){let ne=L+se*Ze/8,ee=Math.cos(ne),oe=Math.sin(ne),le=m(T-ee*U/E,Z-oe*U/p),ue=m(T+ee*U/E,Z+oe*U/p),pe=le-ue;if(ue<u-.2||pe<.16||pe>1.3)continue;let me=m(T,Z),he=.92*P-.6*Math.abs(pe-.56)-.54*Math.abs(me-(le+ue)*.5)-.38*Math.abs(ue-u)+.31*ie+.19*ae+.12*re+.2*h();(!b||he>b.score)&&(b={x:T,y:Z,xStep:E,size:U,dx:ee,dy:oe,high:le,low:ue,score:he})}}if(!b)return;let{x,y:M,xStep:B,size:z,dx:S,dy:v,high:k,low:A}=b,d=.15+.15*h(),w=h()*Ze,_=.7+.6*h(),C=h(),F=(Math.imul(t^t>>>16,2654435761)>>>0)%3,W=.42+.19*h(),I=(q,Y=0)=>d*Math.sin(2.4*q+w)+Y*W*ze(-.36,.68,q),Q=q=>st(k,A,yt((q+.95)/1.9,0,1)**_),G=[];function K(q,Y,T,Z){G.push({u:q,v:I(q,Y)+.17*(h()-.5),length:T,width:Z,level:Q(q),phase:h()*Ze,chemistry:yt(.82*C+.33*h()-.06,0,1)})}function N(q,Y,T,Z,X){let P=(Y-q)/Z;for(let E=0;E<Z;E++){let U=q+P*(E+.48+.32*(h()-.5));K(U,T,P*(.39+.21*h()),X*(.62+.52*h()))}}F===0?(K(-.68,0,.3,.54+.19*h()),N(-.37,.97,-1,2+Math.floor(2*h()),.31),N(-.11,1,1,2+Math.floor(2*h()),.36)):F===1?N(-1,1.04,0,3+Math.floor(4*h()),.54):(K(-.54,0,.55+.1*h(),.68+.13*h()),N(.12,1.1,0,2+Math.floor(2*h()),.46)),G.sort((q,Y)=>q.u-Y.u);let H=2.1*z,j=H/B,V=H/p,$=[x/s,M/s,j/s,V/s],te=new Uint32Array(96**2),J={height:0,wet:0,crust:0,tint:0},D=(q,Y,T)=>{let Z=(q-x)*B/z,X=(Y-M)*p/z,P=Z*S+X*v,E=X*S-Z*v,U=F===0?Math.min(Math.abs(E-I(P,-1)),Math.abs(E-I(P,1))):Math.abs(E-I(P)),L=(1-ze(.045,.16,U))*ze(-1.23,-.83,P)*(1-ze(.89,1.42,P)),ae=Q(P),re=st(T,Math.min(T,ae),.42*L),ie=0,se=L*.43,ne=C;for(let ee of G){let oe=(P-ee.u)/ee.length,le=(E-ee.v)/ee.width;if(Math.abs(oe)>1.62||Math.abs(le)>1.62)continue;let ue=Math.atan2(le,oe),pe=1+.097*Math.sin(3*ue+ee.phase)+.042*Math.cos(7*ue-ee.phase),me=Math.hypot(oe,le)/pe;if(me>=1.42)continue;let he=ze(.52,.98,Math.cos(ue))*(1-ze(.09,.29,Math.abs(le))),xe=ze(.76,.93,me)*(1-ze(1,1.24,me)),de=ze(1.02,1.23,me)*(1-ze(1.27,1.42,me)),Be=ee.level+xe*(.077-.063*he)-.05*de,ge=1-ze(.83,1.42,me);re=st(re,Be,ge);let Ae=1-ze(.64,.8,me),Te=(1-ze(1.01,1.42,me))*ze(.58,.85,me);ie=st(ie,Ae,ge),Te>se&&(se=Te,ne=ee.chemistry*(.61+.39*xe))}J.height=st(T,re,c),J.wet=ie*c,J.crust=se*c,J.tint=ne};for(let q=Math.ceil(M-V);q<=Math.floor(M+V);q++){for(let Y=Math.ceil(x-j);Y<=Math.floor(x+j);Y++){let T=q*e+n(Y);D(Y,q,i[T]),i[T]=J.height}i[q*e+s]=i[q*e]}let R=95;for(let q=0;q<=R;q++)for(let Y=0;Y<=R;Y++)D(x+(2*Y/R-1)*j,M+(2*q/R-1)*V,0),te[q*96+Y]=1056964608|Math.round(255*J.wet)|Math.round(255*J.crust)<<8|Math.round(255*J.tint)<<16;let O=(q,Y)=>ca(x+(q*S-Y*v)*z/B,M+(q*v+Y*S)*z/p,s);return o.springs=[{overlook:O(.86,.82),target:O(-.12,0)}],{chart:$,values:te,side:96}}var nt=2*Math.PI,lt=(i,e,t)=>Math.min(t,Math.max(e,i)),Ke=(i,e,t)=>i+(e-i)*t;function Ne(i,e,t){let a=lt((t-i)/(e-i),0,1);return a*a*(3-2*a)}function ua(i,e,t){let a=Math.PI*e/t,r=nt*i/t;return[Math.sin(a)*Math.cos(r),Math.cos(a),Math.sin(a)*Math.sin(r)]}function Lt(i,e){let t=i-Math.floor(i),a=Math.min(t/e,(1-t)/(1-e));return a*a*(1.32-.32*a)}function ma(i,e,t,a,r,o,f){let c=Ne(.32,.76,a);if(e<513||c<=0)return;let s=e-1,n=Math.PI/s,p=P=>(P%s+s)%s,m=(P,E)=>i[lt(Math.round(E),0,s)*e+p(Math.round(P))],l=Math.imul(t^t>>>16,2221713035)^458671337,u=()=>(l=Math.imul(l,1664525)+1013904223>>>0,l/4294967296),g=[...r.map(({head:P})=>P),...Object.values(o).flat().map(({target:P})=>P)],y=[];for(let P=0;P<20;P++){let E=Math.acos(1-(P+.5)/10)/n;for(let U=0;U<36;U++)y.push(m((U+.5)*s/36,E))}y.sort((P,E)=>P-E);let h=y[Math.floor(y.length*.75)],b;for(let P=0;P<18;P++)for(let E=0;E<36;E++){let U=(E+u())*s/36,L=(.23+.54*(P+u())/18)*s,ae=ua(U,L,s),re=.54*ae[0]+.45*ae[1]+.71*ae[2];if(re<.22||g.some(he=>he[0]*ae[0]+he[1]*ae[1]+he[2]*ae[2]>.934))continue;let ie=nt*Math.sin(L*n)/s,se=.066+.027*u(),ne=Array.from({length:8},(he,xe)=>{let de=xe*nt/8;return m(U+se*Math.cos(de)/ie,L+se*Math.sin(de)/n)}),ee=m(U,L);if(ee<h-.12)continue;let oe=ne.reduce((he,xe)=>he+xe,0)/ne.length,le=Math.max(...ne)-Math.min(...ne),[,ue,,pe]=Fe({regions:f},ae),me=.8*re-.52*Math.abs(ee-h-.17)+.55*lt(oe-ee,-.6,.65)-.26*lt(le-.33,0,1.6)+.3*ue+.39*pe+.18*u();(!b||me>b.score)&&(b={x:U,y:L,xStep:ie,radius:se,center:ee,mean:oe,volcanic:pe,score:me})}if(!b)return;let{x,y:M,xStep:B,radius:z,center:S,mean:v,volcanic:k}=b,A=u()*nt,d=Math.cos(A),w=Math.sin(A),_=u()*nt,C=(Math.imul(t^t>>>17,2146121005)>>>0)%3,F=3.05+1.24*u(),W=lt(.7*k+.55*u()-.1,0,1),I=Ke(S,v,.19),Q=.19+.16*u(),G=Q*(.68+.58*u()),K=0,N=0,H=1/0;for(let P=0;P<18;P++){let E=.14+.56*u(),U=.86*(u()-.5),L=m(x+(d*E-w*U)*z/B,M+(w*E+d*U)*z/n);L<H&&(K=E,N=U,H=L)}H=Math.max(I-.19,H-.055);let j=Array.from({length:20+Math.floor(12*u())},()=>({x:1.94*(u()-.5),y:1.9*(u()-.5),length:.15+.2*u(),width:.17+.23*u(),height:.09+.15*u(),curve:.22+.6*u()})),V=1.37*z/B,$=1.37*z/n,te=[x/s,M/s,V/s,$/s],J=new Uint32Array(96**2),D={height:0,sand:0,salt:0};function R(P,E,U){let L=(P-x)*B/z,ae=(E-M)*n/z,re=d*L+w*ae,ie=d*ae-w*L,se=1-Ne(.71,1.21,Math.hypot(re*.95,ie)),ne=I+.12*ie+.075*re*re,ee=Ne(.19,.59,U-ne),oe=Ne(-.63,.62,.65*Math.sin(5.7*ie+_+1.5*re)+.36*Math.cos(7.2*re-4.5*ie)),le=se*(1-ee)*Ke(.53,1,oe),ue=Math.hypot((re-K)/G,(ie-N)/Q)+.1*Math.sin(17*ie+5*re+_),pe=se*(1-Ne(.63,1.23,ue))*(1-Ne(H+.15,H+.33,U)),me;if(C===1){me=0;for(let xe of j){let de=(ie-xe.y)/xe.width;if(Math.abs(de)>=1)continue;let Be=de*de,ge=(re-xe.x)/xe.length-xe.curve*Be,Ae=(1-Ne(.06,1,Math.abs(de)))*Ne(-1,.48,ge)*(1-Ne(.48,.83,ge));me=Math.max(me,xe.height*Ae)}}else{let xe=re+.095*Math.sin(4.6*ie+_)+.054*Math.cos(10*ie-3.4*re),de=Lt(F*xe+.18*Math.sin(ie*7+_),.76);if(C===2){let Be=Lt(F*(ie*.67-.77*re+.08*Math.sin(re*8+_)),.68),ge=Lt(F*(ie*.72+.63*re+.13*Math.sin(ie*6-_)),.72);me=.13*de+.115*Be*ge+.082*de*Math.max(Be,ge)}else me=.22*de}let he=Ke(U,ne+me*Ke(.49,1.18,oe),le*.92);D.height=Ke(U,Ke(he,H,pe*.95),c),D.sand=le*(1-pe)*c,D.salt=pe*c}let O=95;for(let P=0;P<=O;P++)for(let E=0;E<=O;E++){let U=x+(2*E/O-1)*V,L=M+(2*P/O-1)*$;R(U,L,m(U,L)),J[P*96+E]=1056964608|Math.round(255*D.sand)|Math.round(255*D.salt)<<8|Math.round(255*W)<<16}for(let P=Math.ceil(M-$);P<=Math.floor(M+$);P++){for(let E=Math.ceil(x-V);E<=Math.floor(x+V);E++){let U=P*e+p(E);R(E,P,i[U]),i[U]=D.height}i[P*e+s]=i[P*e]}let q=(P,E)=>ua(x+(P*d-E*w)*z/B,M+(P*w+E*d)*z/n,s);o.dunes=[{overlook:q(.94,.69),target:q(-.07,0)}];let Y=q(-.01,0),Z=q(.01,0).map((P,E)=>P-Y[E]),X=Math.hypot(...Z);return{chart:te,values:J,side:96,wind:Z.map(P=>P/X)}}var $a=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],Qa=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],xa=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],Ja=Uint32Array.from(xa.flat(),i=>i>>>0),e1={name:"Bourke",corners:$a,edges:Qa,maxVertices:15,table:Ja,cornerBit:i=>1<<i,createPolygonizer(){return(i,e,t)=>{let a=xa[e],r=0;for(;r<15&&a[r]>=0;)t[r]=a[r],r++;return r}}};var ha=e1;var t1=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]);var ft=t1;var a1=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],r1=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],Vt=class{constructor(){this.table=ft,this.f_test_results=new Int32Array(6)}signbf(e){return e<0}face_tests(e){let t=this.v,a=this.f_test_results;return a.fill(0),e&128?(a[0]=(e&204)===132?t[0]*t[5]<t[1]*t[4]?-1:1:0,a[3]=(e&153)===129?t[0]*t[7]<t[3]*t[4]?-1:1:0,a[4]=(e&240)===160?t[0]*t[2]<t[1]*t[3]?-1:1:0):(a[0]=(e&204)===72?t[0]*t[5]<t[1]*t[4]?1:-1:0,a[3]=(e&153)===24?t[0]*t[7]<t[3]*t[4]?1:-1:0,a[4]=(e&240)===80?t[0]*t[2]<t[1]*t[3]?1:-1:0),e&2?(a[1]=(e&102)===66?t[1]*t[6]<t[2]*t[5]?-1:1:0,a[2]=(e&51)===18?t[3]*t[6]<t[2]*t[7]?-1:1:0,a[5]=(e&15)===10?t[4]*t[6]<t[5]*t[7]?-1:1:0):(a[1]=(e&102)===36?t[1]*t[6]<t[2]*t[5]?1:-1:0,a[2]=(e&51)===33?t[3]*t[6]<t[2]*t[7]?1:-1:0,a[5]=(e&15)===5?t[4]*t[6]<t[5]*t[7]?1:-1:0),a[0]+a[1]+a[2]+a[3]+a[4]+a[5]}face_test1(e){let t=this.v;switch(e){case 0:return t[0]*t[5]<t[1]*t[4]?72:132;case 1:return t[1]*t[6]<t[2]*t[5]?36:66;case 2:return t[3]*t[6]<t[2]*t[7]?33:18;case 3:return t[0]*t[7]<t[3]*t[4]?24:129;case 4:return t[0]*t[2]<t[1]*t[3]?80:160;default:return t[4]*t[6]<t[5]*t[7]?5:10}}interior_test(e,t){let a=this.v,r=1e-9,o=a[4]-a[0],f=a[5]-a[1],c=a[6]-a[2],s=a[7]-a[3],n=o*c-f*s;if(this.signbf(n)){if(e&1)return 0}else if(!(e&1)||Math.abs(n)<r)return 0;let p=.5*(a[3]*f+a[1]*s-a[2]*o-a[0]*c)/n;if(p<=r||p>=1-r)return 0;let m=a[0]+o*p,l=a[1]+f*p,u=a[2]+c*p,g=a[3]+s*p,y=u*m,h=g*l;if(e&1){if(y<h&&!this.signbf(h))return(this.signbf(l)===this.signbf(a[e]))+t}else if(y>h&&!this.signbf(y))return(this.signbf(m)===this.signbf(a[e]))+t;return 0}pattern(e){let t=this.table,a=(e&128)!==0,r=a?e^255:e,o=t[r];if(o===void 0)throw new Error(`MC33 lookup miss: ${r}`);let f=(o&2048)!==0,c=a?!f:f,s=c?e:e^255,n=o&2047,p=o>>>12,m;switch(p){case 0:m=n;break;case 1:m=s&this.face_test1(n>>2)?183+(n<<1):159+n;break;case 2:m=this.interior_test(n,0)?239+6*n:231+(n<<1);break;case 3:s&this.face_test1(n%6)?m=575+5*n:m=this.interior_test(Math.floor(n/6),0)?407+7*n:335+3*n;break;case 4:{let l=this.face_tests(s);l===-3?m=695+3*n:l===-1?m=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*n:l===1?m=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*n:m=this.interior_test(n>>1,0)?1095+9*n:1055+5*n;break}case 5:{let l=this.face_tests(s);l===-2?m=(n&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(n?1:3,0))?1213+(n<<3):1189+(n<<2):l===0?m=(this.f_test_results[2+n]<0?1261:1285)+(n<<3):m=(n&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(n?3:1,0))?1237+(n<<3):1201+(n<<2);break}case 6:{let l=this.face_tests(s);l===-2?m=this.interior_test(14287116>>(n<<1)&3,0)?1453+(n<<3):1357+(n<<2):l===0?m=(this.f_test_results[n>>1]<0?1645:1741)+(n<<3):m=this.interior_test(10991589>>(n<<1)&3,0)?1549+(n<<3):1405+(n<<2);break}default:{let l=Math.abs(this.face_tests(s));if(l===0){let u=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])m=2157+12*u;else{let g=this.interior_test(u,1);m=2285+(g?10*u-40*g:6*u)}}else if(l===2)m=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(m+=30);else if(l===4){let u=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];u>>4&&(u-=u&32?20:10),m=1845+3*u}else m=1839+2*this.f_test_results[0]}}return{offset:m+1,reverse:c}}triangles(e,t,a){if(this.v=e,t===0||t===255)return 0;let r=this.pattern(t),o=0;for(let f=r.offset;f<ft.length;f++){let c=ft[f],s=c&15,n=c>>4&15,p=c>>8&15;if(s<=12&&n<=12&&p<=12&&s!==n&&n!==p&&s!==p){if(o+3>a.length)throw new Error("MC33 cell exceeds output capacity");a[o++]=s,a[o++]=r.reverse?p:n,a[o++]=r.reverse?n:p}if(!(c&4096))return o}throw new Error("MC33 pattern exceeds lookup table")}},i1={name:"MC33",corners:a1,edges:r1,maxVertices:36,table:ft,cornerBit:i=>128>>i,createPolygonizer(){let i=new Vt;return i.triangles.bind(i)}};var da=i1;function Ut(i={type:"cartesian"}){if(i.type==="cartesian")return(o,f,c)=>[o,f,c];if(i.type!=="spherical"&&i.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${i.type}`);let e=i.radius||[.02,.7],t=i.center||[.5,.5,.5];if(e.length!==2||!e.every(Number.isFinite)||e[0]<0||e[1]<=e[0])throw new Error("Radius must be an increasing, nonnegative pair");if(t.length!==3||!t.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(i.type==="cube-sphere"){if(!Number.isInteger(i.face)||i.face<0||i.face>5)throw new Error("Cube-sphere face must be 0..5");return(o,f,c)=>{let s=2*o-1,n=2*f-1,m=[[1,n,-s],[-1,n,s],[s,1,-n],[s,-1,n],[s,n,1],[-s,n,-1]][i.face],u=(e[0]+c*(e[1]-e[0]))/Math.hypot(...m);return m.map((g,y)=>t[y]+g*u)}}let a=i.longitude||[-Math.PI,Math.PI],r=i.latitude||[-Math.PI/2,Math.PI/2];for(let o of[a,r])if(o.length!==2||!o.every(Number.isFinite)||o[1]<=o[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(r[0]<-Math.PI/2||r[1]>Math.PI/2||a[1]-a[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \xB1pi/2 and longitude span at most 2*pi");return(o,f,c)=>{let s=a[0]+o*(a[1]-a[0]),n=r[0]+f*(r[1]-r[0]),p=e[0]+c*(e[1]-e[0]),m=p*Math.cos(n);return Math.abs(Math.cos(n))<1e-15?[t[0],t[1]+p*Math.sin(n),t[2]]:[t[0]+m*Math.cos(s),t[1]+p*Math.sin(n),t[2]+m*Math.sin(s)]}}function ga(i,e){if(!e||e.type==="cartesian")return i;let t=Ut(e);for(let a=0;a<i.length;a+=3){let r=t(i[a],i[a+1],i[a+2]);i[a]=r[0],i[a+1]=r[1],i[a+2]=r[2]}return i}var s1={bourke:ha,mc33:da};function n1(i,e,t,a){let r=s1[a];if(!r)throw new Error(`Unknown marching cubes algorithm: ${a}`);if(!["x","y","z"].every(o=>Number.isInteger(e[o])&&e[o]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(i instanceof Float32Array)||i.length!==e.x*e.y*e.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(t))throw new Error("Isolevel must be finite");for(let o of i)if(!Number.isFinite(o)||!Number.isFinite(Math.fround(o-t)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return r}function ya(i,e,t=0,a="bourke",r={}){t=Math.fround(t),r.coordinates&&Ut(r.coordinates);let o=n1(i,e,t,a),{x:f,y:c,z:s}=e,n=o.createPolygonizer(),p=new Float32Array(8),m=new Uint8Array(o.maxVertices),l=new Float32Array(39),u=new Float32Array(65536),g=0;for(let y=0;y<s-1;y++)for(let h=0;h<c-1;h++)for(let b=0;b<f-1;b++){let x=0;for(let B=0;B<8;B++){let z=o.corners[B];p[B]=i[((y+z[2])*c+h+z[1])*f+b+z[0]]-t,p[B]<0&&(x|=o.cornerBit(B))}if(x===0||x===255)continue;let M=n(p,x,m);if(g+M*3>u.length){let B=new Float32Array(Math.max(u.length*2,g+M*3));B.set(u),u=B}for(let B=0;B<12;B++){let[z,S]=o.edges[B];if(p[z]<0==p[S]<0)continue;let v=p[z]-p[S],k=Math.abs(v)<1e-9?.5:Math.max(0,Math.min(1,p[z]/v)),A=o.corners[z],d=o.corners[S];l[B*3]=(b+A[0]+k*(d[0]-A[0]))/(f-1),l[B*3+1]=(h+A[1]+k*(d[1]-A[1]))/(c-1),l[B*3+2]=(y+A[2]+k*(d[2]-A[2]))/(s-1)}l[36]=(b+.5)/(f-1),l[37]=(h+.5)/(c-1),l[38]=(y+.5)/(s-1);for(let B=0;B<M;B++){let z=m[B]*3;u[g++]=l[z],u[g++]=l[z+1],u[g++]=l[z+2]}}return ga(u.slice(0,g),r.coordinates)}var l1=2*Math.PI;function f1(i,e){return[Math.sin(i)*Math.cos(e),Math.cos(i),Math.sin(i)*Math.sin(e)]}var vt=(i,e)=>i[0]*e[0]+i[1]*e[1]+i[2]*e[2];function He(i,e,t,a){let{bend:r,twist:o,thickness:f,peak:c,portals:s}=a,n=t-r*i*i+o*i*e,p=c-.17*i-.13*Math.cos(4.1*i+o),m=Math.hypot(i*.87+.08*e,(e-.15)/p,n/f)-1,l=Math.hypot((Math.abs(i)-.83-.11*e)/.34,(e+.28)/.68,(n+.06*i)/(f*1.48))-1,u=Math.max(0,.2-Math.abs(m-l)),g=Math.min(m,l)-1.25*u*u,y=.034*Math.sin(19*e+2.3*i+2.1*n)+.025*Math.sin(12*i+7.3*n+5*e)*Math.cos(10*e-3*n),h=1/0;for(let{at:b,width:x,height:M,lean:B}of s){let z=(i-b-B*e-.05*t)/x,S=Math.max(0,e+.08+.05*t)/M;h=Math.min(h,Math.hypot(z,S)-1)}return Math.max(g+y,-h+.37*y)}function c1(i){let e={x:55,y:45,z:29},t=[-1.39,-1.05,-.88],a=[1.39,1.6,.88],r=a.map((s,n)=>(s-t[n])/([e.x,e.y,e.z][n]-1)),o=new Float32Array(e.x*e.y*e.z);for(let s=0;s<e.z;s++)for(let n=0;n<e.y;n++)for(let p=0;p<e.x;p++)o[(s*e.y+n)*e.x+p]=He(t[0]+p*r[0],t[1]+n*r[1],t[2]+s*r[2],i);let f=ya(o,e,0,"mc33"),c=new Float32Array(f.length*2);for(let s=0;s<f.length;s+=3){let n=t[0]+f[s]*(a[0]-t[0]),p=t[1]+f[s+1]*(a[1]-t[1]),m=t[2]+f[s+2]*(a[2]-t[2]),l=.004;c.set([n,p,m,He(n+l,p,m,i)-He(n-l,p,m,i),He(n,p+l,m,i)-He(n,p-l,m,i),He(n,p,m+l,i)-He(n,p,m-l,i)],s*2)}return c}function va(i,e,t,a,r,o){if(e<513||a<.38)return;let f=e-1,c=Object.values(r).flat().map(({target:h})=>h),s=(h,b)=>i[Math.round(b)*e+(Math.round(h)%f+f)%f],n=[];for(let h=12;h<f;h+=19)for(let b=1;b<f;b+=19)n.push(s(b,h));n.sort((h,b)=>h-b);let p=n[Math.floor(.77*n.length)],m=Math.imul(t^t>>>17,2654435761)^1126074651,l=()=>(m=Math.imul(m,1664525)+1013904223>>>0,m/4294967296),u=[];for(let h=0;h<19;h++)for(let b=0;b<33;b++){let x=(b+l())*f/33,M=(.22+.56*(h+l())/19)*f,B=s(x,M);if(B<p-.18)continue;let z=Math.PI*M/f,S=l1*x/f,v=f1(z,S),k=vt(v,[.54,.45,.71]);if(k<.25||c.some(I=>vt(I,v)>.998))continue;let[,A,d,w]=Fe({regions:o},v),_=s(x+2,M)-s(x-2,M),C=s(x,M+4)-s(x,M-4),F=Math.hypot(_,C),W=.8*k+.56*A+.32*d+.24*w-.51*Math.abs(B-p-.21)-.38*Math.abs(F-.31)+.22*l();u.push({dir:v,theta:z,phi:S,dx:_,dy:C,canyon:A,volcanic:w,score:W})}let g=[];for(let h of u.sort((b,x)=>x.score-b.score))if(!g.some(b=>vt(b.dir,h.dir)>.94)&&(g.push(h),g.length===2))break;if(!g.length)return;let y=g.map(({dir:h,theta:b,phi:x,dx:M,dy:B,canyon:z,volcanic:S})=>{let v=[-Math.sin(x),0,Math.cos(x)],k=[Math.cos(b)*Math.cos(x),-Math.sin(b),Math.cos(b)*Math.sin(x)],A=Math.atan2(B,M)+Math.PI/2+(l()-.5)*1.55,d=v.map((G,K)=>G*Math.cos(A)+k[K]*Math.sin(A)),w=v.map((G,K)=>-G*Math.sin(A)+k[K]*Math.cos(A)),_=240+250*l(),C=.64+.45*l(),F={bend:.25*(l()-.5),twist:.35*(l()-.5),thickness:.23+.13*l(),peak:.79+.2*l(),portals:[]};l()<.39?F.portals.push({at:-.41,width:.24+.1*l(),height:.4+.14*l(),lean:-.11},{at:.34,width:.29+.1*l(),height:.49+.13*l(),lean:.13}):F.portals.push({at:(l()-.5)*.24,width:.52+.17*l(),height:.49+.14*l(),lean:(l()-.5)*.36});let W=vt(w,[.54,.45,.71])>=0?1:-1,I=h.map((G,K)=>G+(w[K]*W*_*3.6+d[K]*_*.78)/262144),Q=Math.hypot(...I);return{direction:h,span:d,depth:w,size:_,rise:C,tint:Math.min(1,.24+.59*z-.2*S+.27*l()),site:{target:h,overlook:I.map(G=>G/Q)},vertices:c1(F)}});return r.arches=y.map(({site:h})=>h),y}function ba(i){let e=f=>Ie(f,0,0,i)/4294967296,t=e(47);if(t>=.55)return[0,0,0,0];if(t>=.3)return[0,0,0,1.18+.42*e(37)];let a=.48*(e(21)-.5),r=.48*(e(23)-.5),o=Math.hypot(a,1,r);return[a/o,1/o,r/o,.65+.48*e(37)]}function Ma(i,e,t,a,r){if(r[3]===0)return-1/0;let o=Math.abs(i*r[0]+e*r[1]+t*r[2]),f=Math.sin(9*i+4*e-7*t+14*r[0]);return a-r[3]+1.08*o*o-.115*f}function wa(i,e,t,a,r,o,f=!0,c=1,s,n=!1,p=0,m=!1){let l=n||r>0?Nt(a,n):[];if(n){At(i,e);let k=Math.min(e,257),A=p>=1?{side:k,values:new Float32Array(k**2)}:void 0,d=C=>Math.round(C*(e-1)/(k-1));if(A)for(let C=0;C<k;C++)for(let F=0;F<k;F++)A.values[C*k+F]=i[d(C)*e+d(F)];if(Wt(i,e,a,r,c,!0,l,p),A)for(let C=0;C<k;C++)for(let F=0;F<k;F++){let W=C*k+F;A.values[W]=i[d(C)*e+d(F)]-A.values[W]}let w=m?{side:k,values:new Float32Array(k**2)}:void 0,_=w?Ct(i,e,a,.87,w):[];return{values:i,glacialSites:_,glacialIce:w,impactMaterial:A,landmarks:{},impactBasins:l,ocean:{seed:a,datum:null}}}let u=f?Ct(i,e,a,r):[],g=f?fa(i,e,a,r,u,o):{};Wt(i,e,a,f?0:r,c,!1,l);let y=f&&s===void 0?null:ra(i,e,a,{coverage:s}),h=f?null:ba(a),b=Math.min(e,257),x=f?null:{side:b,values:new Float32Array(b**2)},M=!f&&o&&r>0?{seed:a,variation:r,regions:o,sites:[]}:null;if(u1(i,e,t==="volcanic"?.84:1.32,y,h,x,M,!f&&{seed:a,geology:t,regions:o}),ea(i,e,t==="alpine"?.94:.74),y!==null&&ia(i,e,y,s===void 0?void 0:t),At(i,e),!f)return{values:i,glacialSites:u,landmarks:g,impactBasins:l,alluvium:x,invertedRidges:M?.sites,ocean:{seed:a,datum:y}};let z=pa(i,e,a,r,u,g,o),S=ma(i,e,a,r,u,g,o),v=va(i,e,a,r,g,o);return{values:i,glacialSites:u,landmarks:g,impactBasins:l,springs:z,dunes:S,rockSpans:v,ocean:s===void 0?void 0:{seed:a,datum:y}}}function u1(i,e,t=1,a=null,r=null,o=null,f=null,c=null){let s=e-1,n=Math.min(256,Math.floor(s/3.5));if(n<12)return i;let p=n*(n-1),m=s/n,l=new Float32Array(p),u=Float32Array.from({length:n+1},(D,R)=>Math.sin(Math.PI*R/n)),g=(D,R)=>(D+R)%R,y=(D,R)=>i[Math.round(R)*e+g(Math.round(D),s)];for(let D=1;D<n;D++)for(let R=0;R<n;R++){let O=R*m,q=D*m,Y=m*.48;l[(D-1)*n+R]=.4*y(O,q)+.15*(y(O-Y,q)+y(O+Y,q)+y(O,q-Y)+y(O,q+Y))}let b=l.slice().sort()[Math.floor(p*.2)],x=new Float32Array(p).fill(1/0),M=new Int32Array(p).fill(-1),B=new Uint32Array(p),z=new Uint32Array(p).fill(p),S=new Float32Array(p),v=new Uint32Array(p),k=0;function A(D){let R=k++;for(;R;){let O=R-1>>1;if(x[v[O]]<=x[D])break;v[R]=v[O],R=O}v[R]=D}function d(){let D=v[0],R=v[--k],O=0;for(;O*2+1<k;){let q=O*2+1;if(q+1<k&&x[v[q+1]]<x[v[q]]&&q++,x[R]<=x[v[q]])break;v[O]=v[q],O=q}return v[O]=R,D}for(let D=0;D<p;D++)l[D]<=b&&(x[D]=l[D],A(D));for(let D=0;k;D++){let R=d(),O=R%n,q=Math.floor(R/n)+1,Y=u[q],T=Math.max(.08,2*Y),Z=1/Math.hypot(T,1);B[D]=R,z[R]=D,S[R]=Y;let X=0;for(let P=-1;P<=1;P++){let E=q+P;if(!(E<1||E>=n))for(let U=-1;U<=1;U++){if(!U&&!P)continue;let L=(E-1)*n+g(O+U,n);if(x[L]===1/0)x[L]=Math.max(l[L],x[R]+2e-5),M[L]=R,A(L);else if(z[L]<D){let ae=(x[R]-x[L])*(P?U?Z:1:1/T);ae>X&&(X=ae,M[R]=L)}}}}let w=o&&new Float32Array(p),_=o&&new Float32Array(p),C=(1e3/n)**2;for(let D=p-1;D>=0;D--){let R=B[D],O=M[R];if(O<0)continue;let q=S[R];S[O]+=q,_&&(_[O]=Math.max(_[O],Math.min(w[O],q)),w[O]=Math.max(w[O],q))}if(_){let D=106.63474115247546/C;for(let R=0;R<p;R++){let O=_[R];if(O<=D){_[R]=0;continue}let q=Math.min(1,(Math.log2(1+O*C)-6.75)/4.6),Y=Math.min(1,O/Math.max(1,w[R]*.58));_[R]=q*Y}}let F=new Float32Array(e*e),W=a===null&&!o?null:new Float32Array(e*e),I=r&&r[3]!==0&&new Float32Array(p),Q=f&&new Float32Array(p),G=c&&(c.regions||c.geology==="mesa")&&new Float32Array(p),K=G&&new Float32Array(p),N=G&&new Float32Array(p),H=f&&new Float32Array(e*e),j=[];if(I||Q||G){let D=Float64Array.from({length:n},(T,Z)=>Math.cos(2*Math.PI*Z/n)),R=Float64Array.from({length:n},(T,Z)=>Math.sin(2*Math.PI*Z/n)),O=f?Ie(53,0,0,f.seed)*(2*Math.PI/4294967296):0,q=G?Ie(61,0,0,c.seed)*(2*Math.PI/4294967296):0,Y=Math.min(1,n/160);for(let T=1;T<n;T++){let Z=u[T],X=Math.cos(Math.PI*T/n);for(let P=0;P<n;P++){let E=(T-1)*n+P,U=l[E],L=Z*D[P],ae=Z*R[P];if(I){let se=Ma(L,X,ae,U,r),ne=Math.max(0,Math.min(1,(se-.015)/.48)),ee=Math.max(0,Math.min(1,(U-b-.16)/.54));I[E]=ne*ne*(3-2*ne)*ee}let re=Q&&Z>.19&&U>(a??b)+.12,ie=G||re?Fe(c||f,[L,X,ae],c?.geology):null;if(G){let se=a===null?1:Math.max(0,Math.min(1,(U-a-.02)/.22)),ne=Math.max(0,(ie[1]-.18)/.82)*(1-(I?.[E]??0));G[E]=ne;let ee=ne*se*at(T,n)*m;if(ee>0){let oe=Y*(35*L-52*X+28*ae)+q,le=Y*(-67*L+21*X+49*ae)-q;K[E]=ee*(1.36*Math.sin(oe)+.38*Math.sin(le))/Math.max(.5,2*Z),N[E]=ee*(.76*Math.cos(le)+.29*Math.cos(oe))}}if(re){let[,se,ne,ee]=ie,oe=.45*se+.27*ne+.91*ee,le=.69*Math.sin(9*L+3*X-7*ae+O)+.31*Math.cos(15*L-8*X+9*ae-O),ue=Math.max(0,Math.min(1,(le-.1)/.73)),pe=Math.max(0,Math.min(1,(oe-.26)/.57));Q[E]=f.variation*pe*ue*ue*(1-.85*(I?.[E]??0))}}}}let V=D=>Math.max(0,Math.min(1,(Math.log2(1+S[D]*C)-6.45)/6.4+.17*(G?.[D]??0))),$=(D,R)=>{let O=Math.min(1,Math.max(0,(l[D]-b+.12)/.36));return t*R*(.095+.24*R)*(.46+.54*O)*(1+.32*(G?.[D]??0))},te=(D,R)=>{let O=M[D];if(O<0||R<=.53)return 0;let q=Math.abs(l[D]-l[O])*n/256,Y=(R-.53)/.47,T=Math.max(0,1-q/.065),Z=a===null?1:Math.max(0,Math.min(1,(l[D]-a-.04)/.17));return Y*T*T*Z*(1-(I?.[D]??0))};for(let D=0;D<p;D++){let R=M[D];if(R<0)continue;let O=V(D);if(O<=0)continue;let q=V(R),Y=Math.floor(D/n)+1,T=D%n*m+(K?.[D]??0),Z=Y*m+(N?.[D]??0),X=(g(R%n-D%n+1,n)-1)*m+(K?.[R]??0)-(K?.[D]??0),P=(Math.floor(R/n)-Y+1)*m+(N?.[R]??0)-(N?.[D]??0),E=Math.max(.35,2*u[Y]),U=X*E,L=Math.max(1e-6,U*U+P*P),ae=(I?.[D]??0)*O*O,re=(I?.[R]??0)*q*q,ie=G?.[D]??0,se=G?.[R]??0,ne=(_?.[D]??0)*(1-ae),ee=(_?.[R]??0)*(1-re),oe=(.43+1.44*O)*m*(1+.57*ae+.43*ne),le=(.43+1.44*q)*m*(1+.57*re+.43*ee),ue=Math.max(oe,le),pe=$(D,O)*(1+.72*ae),me=$(R,q)*(1+.72*re),he=l[D]-pe,xe=Math.min(he,l[R]-me),de=o?te(D,O):0,Be=o?te(R,q):0,ge=de>0||Be>0,Ae=O*O*(Q?.[D]??0),Te=q*q*(Q?.[R]??0),Qe=Math.max(Ae,Te)>.025;Ae>.17&&Te>.17&&j.push({x:D%n,y:Y,score:(Ae+Te)/2});let Ye=a!==null&&O>.57&&l[D]>=a&&l[D]<a+.24&&l[R]<a&&l[R]>a-.2,Je=0,Xe=M[R];if(o&&O>.59&&Xe>=0&&ae<.22&&(a===null||l[R]>a+.05)){let Ce=l[D]-l[R],qe=Math.max(0,l[R]-l[Xe]),je=Math.max(0,Math.min(1,(.76*Ce-qe-.016)/.075));Je=t*O*je*Math.min(.2,.73*Ce)}let et=Je>.005,Gt=0;if(et){let Ce=((g(Xe%n-R%n+1,n)-1)*m+(K?.[Xe]??0)-(K?.[R]??0))*E,qe=(Math.floor(Xe/n)-Math.floor(R/n))*m+(N?.[Xe]??0)-(N?.[R]??0);Gt=(U*qe-P*Ce)/Math.sqrt(L*Math.max(1e-6,Ce**2+qe**2))}let bt=ue*(et?2.04:Ye?1.65:Qe?1.35:1),We=et?3.3:Ye?2.65:1,Ht=bt/E,Yt=Ye||et?Math.sqrt(L):0,Pa=Math.max(1,Math.floor(Math.min(Z,Z+We*P)-bt)),Da=Math.min(s-1,Math.ceil(Math.max(Z,Z+We*P)+bt)),Ba=Math.floor(Math.min(T,T+We*X)-Ht),Aa=Math.ceil(Math.max(T,T+We*X)+Ht);for(let Ce=Pa;Ce<=Da;Ce++){let qe=at(Ce,s),je=Ce-Z;for(let ct=Ba;ct<=Aa;ct++){let pt=(ct-T)*E,Ee=(pt*U+je*P)/L,ke=Math.min(1,Math.max(0,Ee)),_e=Ce*e+g(ct,s);if(Ye&&Ee>.2&&Ee<We){let ye=(Ee-.2)/(We-.2),Me=Math.abs(pt*P-je*U)/Yt,Re=le*(.52+ye),Ue=i[_e]-a;if(Me<Re&&Ue>-.19&&Ue<.034){let Oe=Me/Re,xt=(1-Oe)*Math.min(1,Oe*4),zt=Math.min(.15,.034-Ue);W[_e]=Math.max(W[_e],zt*xt*4*ye*(1-ye)*O*qe)}}if(et&&Ee>.42&&Ee<We){let ye=(Ee-.42)/(We-.42),Me=(pt*P-je*U)/Yt,Re=le*(.48+1.27*ye),Ue=l[R]-.068*(Ee-1),Oe=Math.max(0,i[_e]-Ue);if(Math.abs(Me)<Re&&Oe<.28){let xt=Me/Re,zt=1+.46*Gt*xt,_t=Math.abs(xt),Ia=(1-_t)**2*Math.min(1,5*_t),Ta=Math.min(1,.28+8*Math.abs(_t-.58*ye)),Na=Ia*Ta*4*ye*(1-ye),Wa=Je*Na*zt*(1-Oe/.28)*qe;W[_e]=Math.max(W[_e],Wa)}}let Ca=oe+ke*(le-oe),Pe=Math.hypot(pt-ke*U,je-ke*P)/Ca;if(Qe&&Pe<1.35){let ye=(Ae+ke*(Te-Ae))*qe,Me=Math.max(0,Math.min(1,(.54-Pe)/.3)),Re=Math.max(0,1-Math.abs(Pe-.84)/.51);H[_e]=Math.max(H[_e],.35*ye*Me*Me*(3-2*Me)),F[_e]=Math.max(F[_e],.19*ye*Re*Re)}if(Pe>=1)continue;let Mt=pe+ke*(me-pe),ka=ne+ke*(ee-ne),Xt=.27*(O+ke*(q-O))**2+.19*ka,ut=1-Math.max(0,(Pe-Xt)/(1-Xt));if(ie>0||se>0){let ye=ie+ke*(se-ie),Me=Math.max(0,Math.min(1,(Pe-.19)/.59)),Re=1-Me*Me*(3-2*Me);ut+=.77*ye*(Re-ut)}let Ra=ae+ke*(re-ae),wt=Pe*Pe,qa=1-wt*wt*(3-2*wt),Fa=ut+Ra*(qa-ut),jt=he+ke*(xe-he),mt=Math.min(1.65*Mt,Math.max(.4*Mt,i[_e]-jt))*qe*Fa;if(ge&&Pe>.28&&Pe<.94){let ye=Math.min(1,(Pe-.28)/.21,(.94-Pe)/.22),Me=ye*ye*(3-2*ye)*(de+ke*(Be-de)),Ue=(jt+Mt*(.24+.18*Pe)-(i[_e]-mt))*Me,Oe=Math.max(-.073*t,Math.min(.14*t,-Ue));mt=Math.max(0,mt+Oe*qe)}F[_e]=Math.max(F[_e],mt)}}}let J=o?(o.side-1)/s:0;for(let D=1;D<s;D++){let R=D*e;for(let O=0;O<s;O++){let q=R+O,Y=W?.[q]??0,T=H?.[q]??0;if(i[q]+=Y+T-F[q]*(1-.89*Math.min(1,T/.115)),o&&Y>0){let Z=Math.round(D*J);if(Z===0||Z===o.side-1)continue;let X=Math.round(O*J)%(o.side-1),P=Z*o.side+X,E=Y*(1-.5*Math.min(1,F[q]/.24));o.values[P]=Math.max(o.values[P],Math.min(1,E*9))}}i[R+s]=i[R]}if(j.length){j.sort((D,R)=>R.score-D.score);for(let{x:D,y:R}of j){let O=Math.PI*R/n,q=2*Math.PI*D/n,Y=Math.sin(O),T=[Y*Math.cos(q),Math.cos(O),Y*Math.sin(q)];if(!f.sites.some(Z=>Z[0]*T[0]+Z[1]*T[1]+Z[2]*T[2]>.998)&&(f.sites.push(T),f.sites.length>=48))break}}if(o)for(let D=1;D<o.side-1;D++){let R=D*o.side;o.values[R+o.side-1]=o.values[R]}return i}var wr=Object.freeze({computeFBM:"Perlin fBm",computeFBM2:"Warped fBm",computeVoronoiTileNoise:"Voronoi",computeRidgedMultifractal4:"Ridged multifractal",computeLanczosBillow:"Lanczos billow",computeLanczosAntiBillow:"Lanczos anti-billow",computeSimplexFBM:"Simplex fBm",computeBillow:"Billow",computeRidgedMultifractal:"Ridged Perlin",computeVoronoiBM1:"Voronoi fractal"}),m1=Object.freeze({perlin:"Perlin",ridged:"Ridged Perlin",fbm:"Perlin fBm",value:"Value noise"});var zr=Object.freeze({seed:[0,4294967295,1],zoom:[1e-4,100,.01],freq:[1e-4,100,.01],octaves:[1,12,1],lacunarity:[1,4,.05],gain:[0,1,.01],xShift:[-1e3,1e3,.05],yShift:[-1e3,1e3,.05],zShift:[-1e3,1e3,.05],turbulence:[0,1,1],seedAngle:[-10,10,.05],exp1:[0,8,.05],exp2:[0,8,.05],threshold:[0,1,.01],rippleFreq:[0,100,.1],time:[-1e3,1e3,.05],warpAmp:[-10,10,.05],gaborRadius:[.001,20,.1],terraceStep:[.001,100,.1],toroidal:[0,1,1],voroMode:[0,16,1],edgeK:[0,100,.1],scalar:[-4,4,.05],transform:[-4,4,.05]}),za=Object.freeze({turbulence:0,exp1:1,exp2:0,rippleFreq:10,time:0,gaborRadius:4,terraceStep:8,toroidal:0,edgeK:0});function _a(i,e){let t=i?.regionMap;return t?[t.frequency,t.transition,Object.keys(m1).indexOf(t.algorithm)+1,e]:[0,0,0,0]}var x1='(()=>{function b0(t,c,o){let x=Math.min(1,Math.max(0,(o-t)/(c-t)));return x*x*(3-2*x)}function t0(t,c){return b0(.0175,.0805,Math.min(t,c-t)/c)}function S0(t,c,o){let x=t.length,a=2*o+1,e=0;for(let f=-o;f<=o;f++)e+=t[(f+x)%x];for(let f=0;f<x;f++)c[f]=e/a,e+=t[(f+o+1)%x]-t[(f-o+x)%x]}function _0(t,c){let o=c-1;if(o<64)return;let x=Math.floor(Math.asin(.25)/Math.PI*o),a=new Float32Array(o),e=new Float32Array(o),f=Float64Array.from({length:o},(s,h)=>Math.cos(h*2*Math.PI/o)),M=Float64Array.from({length:o},(s,h)=>Math.sin(h*2*Math.PI/o)),r=Math.max(2,Math.round(o*.005)),n=Math.max(1,Math.round(o*.0035)),l=[1,4,6,4,1],b=new Float32Array((x+n*2+1)*c);for(let s of[0,o]){let h=s===0?1:-1;for(let F=1;F<=x;F++){let m=Math.sin(Math.PI*F/o),U=1-b0(.071,.25,m),E=Math.min(Math.floor(.23*o),Math.max(1,Math.round((1.5+2.3*U)/(2*m)))),i=(s+h*F)*c;a.set(t.subarray(i,i+o));let d=0,_=0;for(let k=0;k<o;k++)d+=a[k]*f[k],_+=a[k]*M[k];S0(a,e,E),S0(e,a,E),S0(a,e,E);let R=2*E+1,z=2*(1-(Math.sin(R*Math.PI/o)/(R*Math.sin(Math.PI/o)))**3)/o;for(let k=0;k<o;k++){let J=z*(d*f[k]+_*M[k]);t[i+k]+=U*(e[k]+J-t[i+k])}t[i+o]=t[i]}for(let F=0;F<=x+n*2;F++){let m=(s+h*F)*c;b.set(t.subarray(m,m+c),F*c)}let A=0;for(let F of[n,2*n]){let m=0;for(let U=0;U<o;U++)m+=b[F*c+U];A+=(F===n?8:2)*m/o}t.fill((6*b[0]+A)/16,s*c,(s+1)*c);let j=Math.floor(o/2),g=o%2;for(let F=1;F<=x;F++){let m=Math.sin(Math.PI*F/o),U=1-b0(.038,.21,m);if(U<=0)break;let E=(s+h*F)*c;for(let i=0;i<o;i++){let d=0;for(let _=0;_<5;_++){let R=F+(_-2)*n,C=Math.abs(R)*c,z=R<0?(i+j)%o:i,k=b[C+z];d+=l[_]*(R<0&&g?(k+b[C+(z+1)%o])*.5:k)}t[E+i]+=U*(d/16-t[E+i])}t[E+o]=t[E]}let B=t[s*c],u=(s+h*r)*c,I=0,W=0,P=0;for(let F=0;F<o;F++){let m=t[u+F]-B;I+=m,W+=m*f[F],P+=m*M[F]}I/=o,W*=2/o,P*=2/o;for(let F=1;F<r;F++){let m=Math.sin(Math.PI*F/o)/Math.sin(Math.PI*r/o),U=1-b0(.45,1,m),E=(s+h*F)*c;for(let i=0;i<o;i++){let d=B+(W*f[i]+P*M[i])*m+I*m*m;t[E+i]+=U*(d-t[E+i])}t[E+o]=t[E]}}}function X0(t,c,o=1){let x=c-1,a=x*(c-2),e=new Int32Array(a).fill(-1),f=new Int32Array(a).fill(-1),M=new Uint8Array(a),r=new Float32Array(a),n=new Float32Array(a),l=new Float32Array(a),b=new Uint32Array(a),s=m=>(m+x)%x,h=Float64Array.from({length:c},(m,U)=>Math.sin(Math.PI*U/x));for(let m=1;m<x;m++){let U=h[m],E=Math.max(.06,2*U),i=1/Math.hypot(1,E);for(let d=0;d<x;d++){let _=(m-1)*x+d,R=t[m*c+d];l[_]=U;let C=-1,z=-1,k=0,J=0;for(let Y=-1;Y<=1;Y++){let V=m+Y;if(!(V<=0||V>=x))for(let G=-1;G<=1;G++){if(!G&&!Y)continue;let v=s(d+G),T=(R-t[V*c+v])*(Y?G?i:1:1/E),D=(V-1)*x+v;T>k?(z=C,J=k,C=D,k=T):T>J&&(z=D,J=T)}}C<0||(e[_]=C,r[_]=k,M[C]++,J>=.42*k&&(f[_]=z,M[z]++,n[_]=J*J/(k*k+J*J)))}}let A=0;for(let m=0;m<a;m++)M[m]||(b[A++]=m);for(let m=0;m<A;m++){let U=b[m],E=e[U],i=f[U];if(E<0)continue;let d=l[U]*n[U];l[E]+=l[U]-d,--M[E]||(b[A++]=E),i>=0&&(l[i]+=d,--M[i]||(b[A++]=i))}let j=new Float32Array(a),g=new Float32Array(a),B=new Float32Array(a),u=.66*Math.PI/(.023*x),I=.023*x/Math.PI,W=(1e3/x)**2,P=m=>Math.min(1,Math.max(0,m)),F=[-1,1];for(let m=0;m<a;m++){let U=Math.max(0,l[m]-h[Math.floor(m/x)+1]),E=Math.max(0,Math.min(1,(Math.log2(1+U*W)-2.65)/5.9)),i=r[m]*I;j[m]=E*(.065+.18*E)*(.7+.3*P(i/.22));let d=e[m];if(d>=0){let D=Math.max(0,r[m]-u)*.11;g[m]-=D,g[d]+=D}if(E<.5||d<0)continue;let _=Math.floor(m/x)+1,R=m%x,C=Math.floor(d/x)+1-_,z=(d%x-R+x+1)%x-1,k=r[d]*I,J=P((i-k-.035)/.32),Y=1-P(k/.28),V=D=>{let a1=Math.max(1,Math.min(x-1,_+D*z));return l[(a1-1)*x+s(R-D*C)]},G=P(1.8*(1-Math.max(V(-1),V(1))/l[m])),v=J*Y*G*E*.06,x1=1-P(i/.13),T=t[_*c+R];for(let D of F){let a1=_+D*z;if(x1>0&&a1>0&&a1<x){let Q=s(R-D*C),p=(a1-1)*x+Q,w=t[a1*c+Q]-T-.018;B[p]=Math.max(B[p],Math.min(.043,Math.max(0,w))*x1*E)}if(v>0)for(let Q=1;Q<=3;Q++){let p=_+Q*C+D*z*Math.min(Q,2);if(p<1||p>=x)continue;let w=s(R+Q*z-D*C*Math.min(Q,2));g[(p-1)*x+w]+=v*(1-Q/4)}}}for(let m=1;m<x;m++){let U=o*t0(m,x);for(let E=0;E<x;E++){let i=(m-1)*x+E,d=0;for(let _=-1;_<=1;_++){let R=Math.max(1,Math.min(x-1,m+_));for(let C=-1;C<=1;C++)d+=j[(R-1)*x+s(E+C)]*(C?1:2)*(_?1:2)}t[m*c+E]+=U*(Math.min(.06,g[i])-B[i]-.52*j[i]-.82*d/16)}t[m*c+x]=t[m*c]}return t}var L1=2*Math.PI,S1=(t,c,o)=>Math.min(o,Math.max(c,t)),g1=(t,c,o)=>{let x=S1((o-t)/(c-t),0,1);return x*x*(3-2*x)};function q0(t,c,o){return c*(.9*Math.sin(L1*t)+.34*Math.sin(1.7*L1*t+o*L1))}function yt(t,c,o,x,a,e){let{x:f,y:M,xScale:r,yScale:n,dx:l,dy:b,length:s,width:h,bend:A,branch:j,cirque:g,head:B,outlet:u}=x,I=c-1,W=o.side-1,P=S1(B-u,.14,.73),F=A/s,m=Y=>u-.04*P+.7*P*(1-S1(Y,0,1))**2,U=[],E=4+Math.floor(4*g);for(let Y=0;Y<E;Y++){let V=.16+.79*(Y+.15+.7*e())/E,G=.1+.24*e(),v=j*(Y%2?-1:1)*(.065+.14*e()),x1=V-G,T=(.31+.3*e())*h/s;if(U.push({start:x1,end:V,offset:v,root:0,bank:T,depth:.43+.24*e()}),e()<.74){let D=.33+.32*e(),a1=x1+G*D,Q=v*(1-D)**1.3;U.push({start:a1-(.055+.105*e()),end:a1,offset:-v*(.24+.28*e()),root:Q,bank:.63*T,depth:.32})}}let i=l*s/r,d=b*s/n,_=.39*s,R=Math.max(1,Math.floor(M+Math.min(-.37*d,1.11*d)-_/n)),C=Math.min(I-1,Math.ceil(M+Math.max(-.37*d,1.11*d)+_/n)),z=Math.floor(f+Math.min(-.37*i,1.11*i)-_/r),k=Math.ceil(f+Math.max(-.37*i,1.11*i)+_/r),J=.58*Math.hypot(b*r,l*n)/s;for(let Y=R;Y<=C;Y++){let V=Math.round(Y*W/I)*o.side;for(let G=z;G<=k;G++){let v=(G-f)*r,x1=(Y-M)*n,T=(v*l+x1*b)/s;if(T<=-.37||T>=1.11)continue;let D=(-v*b+x1*l)/s-q0(T,F,g);if(Math.abs(D)>.3)continue;let a1=(G%I+I)%I,Q=Y*c+a1,p=t[Q],w=g1(-.02,.23,T),q=Math.max(J,h/s*(.32+.68*w)*(1+.22*Math.sin(13*T+g*L1))),y=D*j<0?.69:1.13,N=Math.max(0,1-Math.abs(D)/(q*y)),O=g1(-.03,.14,T)*(1-g1(.94,1.11,T)),$=O*N**1.25*S1(p-m(T)+.24*P,0,.88),Z=O*N;for(let S of U){if(T<=S.start||T>=S.end+.025)continue;let H=S1((T-S.start)/(S.end-S.start),0,1),X=S.root+S.offset*(1-H)**1.3,L=Math.max(J*.75,S.bank*(.22+.78*H)),t1=Math.max(0,1-Math.abs(D-X)/L),c1=g1(0,.46,H)*(1-g1(S.end,S.end+.025,T)),n1=m(S.end)+P*.42*(1-H);$=Math.max($,c1*t1*S1(p-n1+.1*P,0,.72)*S.depth),Z=Math.max(Z,.72*c1*t1)}if(t[Q]=p-a*$,Z>0){let S=Math.round(a1*W/I)%W,H=V+S;o.values[H]=Math.max(o.values[H],a*Z),S===0&&(o.values[V+W]=o.values[H])}}t[Y*c+I]=t[Y*c]}}function A0(t,c,o,x,a){let e=!!a,f=g1(.18,.84,x);if(c<257||f===0)return[];let M=c-1,r=i=>(i%M+M)%M,n=(i,d)=>t[S1(Math.round(d),0,M)*c+r(Math.round(i))],l=(i,d)=>{let _=i/M*L1,R=d/M*Math.PI;return[Math.sin(R)*Math.cos(_),Math.cos(R),Math.sin(R)*Math.sin(_)]},b=o>>>0,s=()=>(b=Math.imul(b,1664525)+1013904223>>>0,b/2**32),h=[],A=[],j=[];for(let i=0;i<24;i++){let d=Math.acos(1-(i+.5)/12)*M/Math.PI;for(let _=0;_<48;_++)j.push(n((_+.5)*M/48,d))}j.sort((i,d)=>i-d);let g=j[Math.floor(j.length*.71)]+.19,B=32,u=20;for(let i=0;i<u;i++)for(let d=0;d<B;d++){let _=(d+s())*M/B,R=(.23+.54*(i+s())/u)*M,C=L1*Math.sin(R/M*Math.PI)/M,z=Math.PI/M,k=(e?.195:.075)+(e?.25:.055)*s(),J=s(),Y=e?.005+k*(.019+.023*J):k*(.17+.065*J),V=(e?k*.12:Y*1.25)*(s()-.5),G=s()<.5?-1:1,v=s(),x1=s()*L1,T=n(_,R),D=l(_,R),a1=D[0]*.54+D[1]*.45+D[2]*.71,Q,p;for(let w=0;w<8;w++){let q=x1+w*L1/8,y=Math.cos(q),N=Math.sin(q),O=n(_+y*k/C,R+N*k/z),$=T-O;if($<(e?.085:.25))continue;let Z=n(_+y*k*.52/C,R+N*k*.52/z),S=n(_+(y*k*.4-N*Y)/C,R+(N*k*.4+y*Y)/z),H=n(_+(y*k*.4+N*Y)/C,R+(N*k*.4-y*Y)/z),X=Math.min(S,H)-O,L=.65*S1($,0,1.3)+.58*S1(X,-.35,.85)+.24*S1(Z-O,-.45,.65)+.46*a1+.16*s()+(e?.6*k:0),t1={x:_,y:R,xScale:C,yScale:z,dx:y,dy:N,length:k,width:Y,bend:V,branch:G,cirque:v,head:T,outlet:O,score:L};(!Q||L>Q.score)&&(Q=t1),O>=g&&(!p||L>p.score)&&(p=t1)}Q&&h.push(Q),p&&A.push(p)}let I=[],W=h.map(({outlet:i})=>i).sort((i,d)=>i-d),P=W[Math.floor(W.length*.76)],F=W[Math.floor(W.length*.44)];h.sort((i,d)=>d.score-i.score);let m=i=>I.every(({x:d,y:_})=>Math.hypot(Math.min(Math.abs(d-i.x),M-Math.abs(d-i.x))*i.xScale,(_-i.y)*i.yScale)>=(e?.2:.31)),U=A.sort((i,d)=>d.score-i.score)[0];U&&I.push(U);let E=h.find(i=>i.outlet<=P&&i.outlet>=F&&m(i));E&&I.push(E);for(let i of h)if(m(i)&&(I.push(i),I.length===(e?11+(o>>>5)%5:4)))break;return I.map(i=>{let{x:d,y:_,xScale:R,yScale:C,dx:z,dy:k,length:J,width:Y,bend:V,branch:G,cirque:v,head:x1,outlet:T}=i,D=Z=>{let S=a?q0(Z,V,v):0;return l(d+(Z*z*J-k*S)/R,_+(Z*k*J+z*S)/C)},a1={overlook:D(.93),head:D(.12)};if(a)return yt(t,c,a,i,f,s),a1;let Q=S1(x1-T,.26,1.14),p=z*J/R,w=k*J/C,q=Math.floor(d+Math.min(0,p)-3.2*Y/R),y=Math.ceil(d+Math.max(0,p)+3.2*Y/R),N=Math.max(1,Math.floor(_+Math.min(0,w)-3.2*Y/C)),O=Math.min(M-1,Math.ceil(_+Math.max(0,w)+3.2*Y/C)),$=Z=>T-.09*Q+.63*Q*(1-Z)**2;for(let Z=N;Z<=O;Z++){for(let S=q;S<=y;S++){let H=(S-d)*R,X=(Z-_)*C,L=(H*z+X*k)/J,t1=V*Math.sin(Math.PI*L),c1=(-H*k+X*z-t1)/Y,n1=S1(L,0,1),s1=.68+(.28+.37*v)*(1-g1(.04,.36,n1))+(.22+.24*(1-v))*g1(.56,.97,n1),K=g1(-.17,.07,L)*(1-g1(.83,1.19,L))*(1-g1(.25,1,Math.abs(c1)/s1)),o1=Z*c+r(S),r1=t[o1],f1=K*S1(r1-$(n1),0,.95),l1=v>.28?2:1;for(let M1=0;M1<l1;M1++){let m1=M1===0?G:-G,F1=.25+.14*v+M1*.31,d1=c1*m1,C1=L-F1+.16*d1-.021*d1*d1,U1=1-g1(.047,.16+.07*v,Math.abs(C1)),J1=2+.55*v-.3*M1,T1=U1*g1(.21,.72,d1)*(1-g1(J1*.59,J1,d1)),Q1=$(F1)+Q*(.18+.09*S1(d1,0,2.6));f1=Math.max(f1,T1*S1(r1-Q1,0,.62))}let b1=.89-.11*c1*c1,u1=(1-g1(.015,.067,Math.abs(L-b1)))*(1-g1(.56,.97,Math.abs(c1)))*g1(-.7,.28,c1*G)*Q*v*.075;t[o1]=r1+f*(u1-f1)}t[Z*c+M]=t[Z*c]}return a1})}var Tt=Object.freeze({natural:0,mesas:1,fractal:2,mosaic:3});function z1({regions:t},[c,o,x],a){if(!t)return a==="mesa"?[0,1,0,0]:a==="volcanic"?[0,0,0,1]:[1,0,0,0];let{side:e,values:f}=t,M=e-1,r=Math.hypot(c,x),n=r>0?Math.atan2(x,c)/(2*Math.PI):0,l=(n-Math.floor(n))*M,b=Math.atan2(r,o)*M/Math.PI,s=Math.floor(l),h=Math.floor(b),A=Math.min(M,h+1),j=l-s,g=b-h,B=f[h*e+s],u=f[h*e+Math.min(M,s+1)],I=f[A*e+s],W=f[A*e+Math.min(M,s+1)],P=d=>((B>>>d&255)*(1-j)*(1-g)+(u>>>d&255)*j*(1-g)+(I>>>d&255)*(1-j)*g+(W>>>d&255)*j*g)/255,F=P(0),m=P(8),U=P(16),E=F+m+U,i=1/Math.max(1,E);return[Math.max(0,1-E),F*i,m*i,U*i]}function M0(t,c,o,x,a){return c+a*(.5*(o-t)+a*(t-2.5*c+2*o-.5*x+a*(.5*(x-t)+1.5*(c-o))))}function x0(t,c,o,x,a){return .5*(o-t)+a*(2*(t-2.5*c+2*o-.5*x)+a*(1.5*(x-t)+4.5*(c-o)))}function L0({side:t,values:c},[o,x,a],e){let f=Math.hypot(o,a),M=f>0?Math.atan2(a,o)/(2*Math.PI):0,r=(M-Math.floor(M))*(t-1),n=Math.atan2(f,x)*(t-1)/Math.PI,l=Math.floor(n),b=u=>(u+t-1)%(t-1),s=(u,I,W=M0)=>{(u<0||u>=t)&&(u=u<0?-u:2*(t-1)-u,I+=(t-1)*.5);let P=Math.floor(I),F=u*t;return W(c[F+b(P-1)],c[F+b(P)],c[F+b(P+1)],c[F+b(P+2)],I-P)},h=(u,I=M0)=>s(l+u,r,I),A=h(-1),j=h(0),g=h(1),B=h(2);if(e&&f>1e-5){let u=M0(h(-1,x0),h(0,x0),h(1,x0),h(2,x0),n-l),I=x0(A,j,g,B,n-l),W=u/(2*Math.PI*f**2),P=I/(Math.PI*f),F=(t-1)*.023;e[0]=(-a*W+o*x*P)*F,e[1]=-f*f*P*F,e[2]=(o*W+a*x*P)*F}else if(e){let u=t-1,I=x>0?1:u-1,W=.023/(2*Math.sin(Math.PI/u));e[0]=(s(I,0)-s(I,u*.5))*W,e[1]=0,e[2]=(s(I,u*.25)-s(I,u*.75))*W}return M0(A,j,g,B,n-l)}function j1(t,c,o,x){let a=Math.imul(t,2376512323)^Math.imul(c,3625334849)^Math.imul(o,3407524639)^Math.imul(x,374761393);return a=Math.imul(a^a>>>16,2146121005),a=Math.imul(a^a>>>15,2221713035),(a^a>>>16)>>>0}function N0(t,c,o,{min:x,max:a,mean:e,coverage:f}={}){if(f===0)return null;let M=j1(0,0,0,o);if(f===void 0&&M>=2147483648)return null;if(x===void 0){x=1/0,a=-1/0;let h=0;for(let A of t)x=Math.min(x,A),a=Math.max(a,A),h+=A;e=h/t.length}let r=a-x;if(r===0)return x;let n=new Float64Array(96),l=Math.max(1,Math.floor((c-1)/160)),b=0;for(let h=1;h<c-1;h+=l){let A=Math.sin(Math.PI*h/(c-1));for(let j=0;j<c-1;j+=l){let g=Math.min(95,Math.floor((t[h*c+j]-x)/r*96));n[g]+=A,b+=A}}let s=b*(f??.28+.36*(M/2147483648));for(let h=0;h<n.length;h++){let A=n[h];if(A>0&&s<=A)return x+r*(h+s/A)/96;s-=A}return e}function y1(t,c,o){let x=Math.max(0,Math.min(1,(o-t)/(c-t)));return x*x*(3-2*x)}function Y0(t,c,o,x){let a=c-1,e=Math.max(1,Math.round(a/300)),f=a/65,M=.023*a/(2*Math.PI*e),r=t.slice();function n(l,b){let s=Math.floor(l),h=(s+a)%a,A=(h+1)%a,j=Math.max(0,Math.min(a,b)),g=Math.min(a-1,Math.floor(j)),B=l-s,u=j-g,I=g*c,W=r[I+h]*(1-B)+r[I+A]*B,P=r[I+c+h]*(1-B)+r[I+c+A]*B;return y1(.025,.22,o-(W*(1-u)+P*u))}for(let l=e;l<=a-e;l++){let b=l*c,s=Math.sin(Math.PI*l/a),h=y1(.08,.24,s);if(h===0)continue;let A=2*s,j=Math.max(1,Math.round(e/A));for(let g=0;g<a;g++){let B=r[b+g],u=B-o;if(u<-.2||u>.19)continue;let I=(r[b+(g+j)%a]-r[b+(g+a-j)%a])*e/(j*A),W=r[b+g+e*c]-r[b+g-e*c],P=Math.hypot(I,W),F=P*M;if(F<=.025)continue;let m=I/P,U=W/P,E=g-m*f/A,i=l-U*f,d=U*f*.58/A,_=-m*f*.58,R=y1(.19,.84,.46*n(E,i)+.27*(n(E+d,i+_)+n(E-d,i-_))),C=y1(.07,.36,F)*(.26+.74*R),z=(1-R)*y1(.025,.13,F)*(1-y1(.23,.56,F)),k=Math.min(u*.65,.058*(1-y1(.035,.19,u))),J=Math.min(-u*.64,.075*(1-y1(.055,.2,-u))),Y=Math.min(u*.52,.035*(1-y1(.025,.13,u))),V=Math.min(-u*.68,.078*(1-y1(.07,.2,-u))),G=u>=0?-C*k-z*Y:C*J+z*V;if(x!==void 0&&u>0){let x1=y1(.025,.075,u)*(1-y1(.12,.19,u));if(x==="mesa"){let T=.05+.035*R,D=u/T,a1=(Math.floor(D)+y1(.16,.76,D%1))*T;G+=.72*x1*C*(a1-u)}else{let T=.045*z*(1-y1(.07,.15,u));G+=x1*(T-.035*C)}}if(x!==void 0&&u<0){let x1=-u,T=y1(.012,.065,x1)*(1-y1(.09,.2,x1));G+=T*(x==="mesa"?.064:.041)*z}let v=B+h*G;t[b+g]=u>=0?Math.max(o,v):Math.min(o,v)}t[b+a]=t[b]}}var P1=2*Math.PI,O0=(t,c,o)=>Math.min(o,Math.max(c,t)),i1=(t,c,o)=>t+(c-t)*o;function I1(t,c,o){let x=O0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function I0(t,c,o=!1){let x=Math.imul(t^t>>>16,2246822507)^3355159585,a=()=>(x=Math.imul(x,1664525)+1013904223>>>0,x/4294967296),e=a(),f=e<.44?1:e<.81?2:3+Math.floor(a()*2),M=a()*P1,r=[Math.cos(M),Math.sin(M)],n=a();return Array.from({length:o?1:f},(l,b)=>{let s=b===0,h=s?0:.51+.94*a(),A=(a()-.5)*h*(f===2?.84:1.6),j=r[0]*h-r[1]*A,g=r[1]*h+r[0]*A,B=s?.87+.24*a():(f===2?.38:.24)+.39*a(),u=s?n:.12+.7*a(),I=a()*P1,W=.7+.3*a(),P=Math.cos(I),F=Math.sin(I),m=Array.from({length:12},(_,R)=>{let C=R*P1/12,z=B*Math.cos(C),k=B*W*Math.sin(C);return c(j+z*P-k*F,g+z*F+k*P)}),U=m.reduce((_,R)=>_+R,0)/m.length,E=m.indexOf(Math.min(...m)),i=m.indexOf(Math.max(...m)),d=(.41+.38*a())*B**.74*i1(1,.69,u);return{x:j,y:g,size:B,stretch:W,cos:P,sin:F,datum:U,depth:d,wear:u,low:E*P1/12,high:i*P1/12,breach:i1(.19,.66,u)+.12*a(),rim:.33+.25*a(),harmonics:3+Math.floor(a()*5),warp:.042+.075*a(),offset:a()*P1,bench:.6+.13*a(),rebound:B<.48?0:Math.floor(a()*4),reboundAngle:a()*P1,reboundHeight:.34+.41*a()}})}function k0(t,c,o,x){let a=t-x.x,e=c-x.y,f=1.53*x.size*(1.021+x.warp);if(a*a+e*e>=f*f)return o;let M=(a*x.cos+e*x.sin)/x.size,r=(e*x.cos-a*x.sin)/(x.size*x.stretch),n=Math.atan2(r,M),l=Math.cos(x.harmonics*n+x.offset+.7*Math.sin(3*n)),b=Math.cos((x.harmonics+5)*n-x.offset),s=Math.hypot(M,r)/(1+x.warp*l+.021*b);if(s>=1.53)return o;let h=I1(.76-.2*x.wear,.99,Math.cos(n-x.low)),A=x.breach*h,g=x.datum-x.depth*(1-(x.flatFloor?.065:.19)*s*s)+x.depth*(x.flatFloor?.045:.14)*(M*Math.cos(x.high)+r*Math.sin(x.high)),B=I1(x.bench-.1,x.bench,s)*(1-I1(x.bench+.08,x.bench+.18,s)),u=I1(.66-.09*x.wear,.96,s),I=I1(.84-.06*x.wear,1,s)*(1-I1(1.02,1.24+.1*x.wear,s)),W=x.depth*x.rim*I*(1+.28*l+.11*b)*(1-A),P=M*Math.cos(x.reboundAngle)+r*Math.sin(x.reboundAngle),F=r*Math.cos(x.reboundAngle)-M*Math.sin(x.reboundAngle),m=0;x.rebound===1?m=1-I1(.035,.33,Math.hypot(P+.1,F*1.35)):x.rebound===2?m=Math.max(1-I1(.02,.24,Math.hypot(P+.17,F-.08)),.76*(1-I1(.025,.2,Math.hypot(P-.19,F+.07)))):x.rebound===3&&(m=(1-I1(.025,.14,Math.abs(Math.hypot(P,F*.92)-.29)))*I1(-.66,.44,l+.5*b));let U=I1(1,1.16,s)*(1-I1(1.16,1.53,s)),E=x.depth*.11*U*(.57+.26*l+.15*b),i=g+x.depth*((1.06-.62*A)*u+.26*B+x.reboundHeight*m),d=(1-I1(.89,1.2,s))*(x.flatFloor?.98:i1(.94,.72,x.wear));return i1(o,i,d)+W+E}function P0(t,c=!1){let o=(f,M)=>j1(f,M,613,t)/4294967296,x=o(-1,0),a=c?1+Math.floor(4*x):x<.012?2:x<.08?1:0,e=o(0,0)*P1;return Array.from({length:a},(f,M)=>{let r=i1(-.54,.54,o(M,1)),n=e+M*P1/a+i1(-.39,.39,o(M,2)),l=Math.sqrt(1-r*r),b=M===0?i1(.32,.43,o(M,3)):i1(.17,.3,o(M,3));return{center:[l*Math.cos(n),r,l*Math.sin(n)],longitude:n,size:b}})}function F0(t,c,o,x,a=1,e=!1,f=x>0||e?P0(o,e):[],M=0){if(x<=0&&!f.length)return 0;let r={side:c,values:t},n=c-1,l=Math.PI/n,b=P1/n,s=(z,k)=>j1(z,k,187,o)/4294967296,h=s(0,0),A=e?Math.max(.72,a):a,j=e?i1(115,190,s(0,1)):h<.48?i1(0,5,s(0,1)):h<.79?i1(12,31,s(0,1)):i1(62,134,s(0,1)),g=Math.min(640,Math.round(x*A**2*j)),B=Math.min(1,M),u=Math.max(0,M-1),I=B**4,W=Math.max(1,A),P=Math.round((I*i1(190,255,h)+u*W*i1(355,490,h))*i1(.72,1,x)),F=Math.round((B*i1(295,440,h)+710*I+860*u*W)*i1(.65,1,x)),m=Float64Array.from({length:c},(z,k)=>Math.sin(k*l)),U=Float64Array.from({length:c},(z,k)=>Math.cos(k*l)),E=Float64Array.from({length:n},(z,k)=>Math.sin(k*b)),i=Float64Array.from({length:n},(z,k)=>Math.cos(k*b)),d=new Float64Array(n),_=new Float64Array(n),R=new Int32Array(n),C=0;for(let z=-f.length;z<g+P+F;z++){let k=z<0?f[z+f.length]:void 0,J=z>=g&&z<g+P,Y=z>=g+P,V=s(z,2),G=k?.size??(Y?(.008+.067*V**i1(i1(3,2.3,I),1.7,u))/Math.sqrt(A):J?(.036+.092*V**i1(2.7,1.7,u))/Math.sqrt(A):(.014+.103*V**2.3)/A);if(G<2.1*l||!k&&G>.28)continue;let v=u>0&&(J||Y)?.998:Math.min(.94,Math.cos(2*G+.04)),x1=Math.acos(k?.center[1]??i1(-v,v,s(z,3))),T=k?(k.longitude+P1)%P1:P1*s(z,4),D=Math.sin(x1),a1=Math.cos(x1);if(G<1.4*b*D)continue;let Q=Math.sin(T),p=Math.cos(T),w=[D*p,a1,D*Q],q=[-Q,0,p],y=[-a1*p,D,-a1*Q],N=(K,o1)=>{let r1=Math.hypot(1,K*G,o1*G);return L0(r,w.map((f1,l1)=>(f1+G*(K*q[l1]+o1*y[l1]))/r1))},[O]=I0(j1(z,5,187,o),N,!0),$=s(z,6),Z=k?i1(.38,.62,$):Y||J?i1(.12,.85,$):i1(.86,.13,(z+$)/Math.max(1,g)),S=k?i1(.79,1.15,G/.43):O.depth*i1(1.02,.63,Z)*(Y?i1(.12+.065*I,.51+.15*I,V**1.8)+.22*u:J?i1(.42,.92,V)+.22*u:i1(.31,.95,(G*A-.014)/.103)),H=k?{...O,wear:Z,depth:S,size:1,stretch:i1(.9,.99,s(z,7)),warp:.42*O.warp,breach:.18,rim:.38,rebound:s(z,8)<.32?3:0,reboundHeight:.28,flatFloor:!0}:{...O,wear:Z,depth:S,stretch:i1(.81,1,s(z,7)),rim:J?Math.max(.49,O.rim):O.rim,rebound:Y&&V<.84?0:O.rebound},X=Math.asin(1.53*H.size*(1.021+H.warp)*G),L=X>=Math.min(x1,Math.PI-x1),t1=Math.max(L?0:1,Math.ceil((x1-X)/l)),c1=Math.min(L?n:n-1,Math.floor((x1+X)/l)),n1=L?Math.floor(n/2):Math.ceil(Math.asin(O0(Math.sin(X)/D,0,1))/b)+1,s1=Math.round(T/b),e1=Math.min(n,2*n1+1);for(let K=0;K<e1;K++){let o1=(s1-n1+K+n)%n;R[K]=o1,d[K]=(E[o1]*p-i[o1]*Q)/G,_[K]=(i[o1]*p+E[o1]*Q)/G}for(let K=t1;K<=c1;K++){let o1=K===0||K===n?0:m[K],r1=D*U[K]/G,f1=K*c;for(let l1=0;l1<e1;l1++){if(L&&a1*U[K]+D*o1*_[l1]*G<=0)continue;let b1=o1*d[l1],u1=r1-a1*o1*_[l1],M1=f1+R[l1];t[M1]=k0(b1,u1,t[M1],H)}t[f1+n]=t[f1]}C++}return C}var o0=2*Math.PI,C0=(t,c,o)=>Math.min(o,Math.max(c,t)),N1=(t,c,o)=>t+(c-t)*o;function h1(t,c,o){let x=C0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function V0(t){return()=>(t=Math.imul(t,1664525)+1013904223>>>0,t/4294967296)}function G0(t,c,o){let x=o0*c/t,a=Math.PI*o/t,e=Math.sin(a);return[e*Math.cos(x),Math.cos(a),e*Math.sin(x)]}function wt(t){let c=[],o=3+Math.floor(3*t());for(let x=0;x<o;x++){let a=t()*Math.PI,e=Math.cos(a),f=Math.sin(a),M=1.6*(t()-.5),r=-1.15+.38*t(),n=.2+.17*t();for(let l=r;l<1.12;l+=n*(.7+.66*t())){let b=M+.27*(t()-.5);c.push({x:l*e-b*f,y:l*f+b*e,width:.19+.23*t(),depth:.14+.32*t(),elongation:.58+.4*t()})}}return c}function St(t,c,o,x,a){let e=.1*Math.sin(5*c+2*t),f=1-h1(.77,1.36,Math.hypot(t*.88,c));if(f<=0)return o;let M=0,r=0,n=1.4,l=1.4;for(let u of a){let I=t+e-u.x,W=c-u.y;if(Math.abs(I)*u.elongation>1.4*u.width||Math.abs(W)>1.4*u.width)continue;let P=Math.hypot(I*u.elongation,W)/u.width;P<n?(l=n,n=P):l=Math.min(l,P);let F=1-h1(.12,.95,P);M=Math.max(M,F*u.depth),r=Math.max(r,.045*h1(.19,.51,P)*(1-h1(.54,.84,P)))}let b=1-h1(.04,.24,Math.abs(c-.25*Math.sin(3.4*t)+.07*t)),s=h1(.04,.19,M),h=Math.max(M,.17*b)+.05*b*s,A=N1(o,x+.13,.7),j=.14*(1-h1(.02,.12,M))*h1(.08,.28,b+r),B=.26*((1-h1(.07,.48,l-n))*h1(.4,.79,n)*(1-h1(1.06,1.37,l)))*(.72+.28*Math.sin(7*t-9*c));return N1(o,A-h+r+j+B,f)}function T0(t,c){return c.bend*Math.sin(c.curve*t+c.phase)+c.shift*(h1(c.first-.25,c.first,t)-h1(c.last,c.last+.36,t))}function _t(t,c,o){let x={phase:c,bend:.08+.16*t(),curve:.72+1.86*t(),shift:.44*(t()-.5),first:-1.1+.86*t(),last:.12+.89*t(),width:.17+.17*t(),depth:.43+.21*o,vents:[],splays:[]},a=1+Math.floor(4*t());for(let f=0;f<a;f++){let M=-1.39+2.76*(f+.19+.63*t())/a;x.vents.push({at:M,across:T0(M,x)+.64*(t()-.5),width:.12+.26*t(),height:.28+.44*t(),crater:.09+.17*t()})}let e=Math.floor(3*t());for(let f=0;f<e;f++)x.splays.push({start:-1.32+1.65*t(),length:.76+.83*t(),reach:(t()<.5?-1:1)*(.38+.5*t())});return x}function At(t,c,o,x,a,e){let f=1-h1(1.35,2.25,Math.abs(t));if(f<=0)return o;let{phase:M,depth:r}=a,n=a.width+.14*h1(-.68,.79,Math.cos(t*3.6+M)),l=c-T0(t,a),b=l<0?-1:1,s=h1(-.7,.7,b*Math.sin(1.9*t+M)),h=Math.abs(l)/(n*N1(1.28,.82,s)),A=x-r-e*.35*t+.1*h1(.3,.95,Math.sin(t*4.5+M)),j=h1(.46,N1(1.2,.87,s),h),g=h1(.66,.83,h)*(1-h1(.86,1.13,h)),B=1-h1(.75,1.28,h),u=h1(.48,.84,h)*(1-h1(.96,1.18,h)),I=N1(A+r*j,o,.12+.2*j);I+=.11*s*g+.065*u*(1-s);let W=N1(o,I,f*B),P=h1(.76,1.08,h)*(1-h1(1.19,1.86,h));W+=f*P*N1(.038,.21,s);let F=0;for(let{start:m,length:U,reach:E}of a.splays){let i=(t-m)/U;if(i<=0||i>=1)continue;let d=Math.abs(l-E*(.18+.82*i)),_=h1(0,.22,i)*(1-h1(.69,1,i))*(1-h1(.065,.23,d));F=Math.max(F,.23*_)}W-=F;for(let m of a.vents){let U=Math.hypot(t-m.at,c-m.across)/m.width;if(U>=1.24)continue;let E=1-h1(.09,1.24,U),i=1-h1(.1,.39,U);W+=m.height*E**1.4-m.crater*i}return W}var c0=(t,c)=>t[0]*c[0]+t[1]*c[1]+t[2]*c[2];function $0(t,c,o,x,a,e){let f={impact:[],karst:[],rift:[]},M=h1(.24,.85,x);if(c<257||M<=0)return f;let r=c-1,n=i=>(i%r+r)%r,l=Math.PI/r,b=(i,d)=>t[C0(Math.round(d),0,r)*c+n(Math.round(i))],s=a.flatMap(({overlook:i,head:d})=>[i,d]),h=V0(o^2476863307),A=[];for(let i=0;i<13;i++)for(let d=0;d<28;d++){let _=(d+h())*r/28,R=(.22+.56*(i+h())/13)*r,C=G0(r,_,R),z=.54*C[0]+.45*C[1]+.71*C[2];if(s.some(p=>c0(p,C)>.95))continue;let k=o0*Math.sin(R*l)/r,J=.067+.035*h(),Y=h()*o0,V=Array.from({length:8},(p,w)=>{let q=Y+w*o0/8;return b(_+J*Math.cos(q)/k,R+J*Math.sin(q)/l)}),G=V.reduce((p,w)=>p+w,0)/V.length,v=Math.max(...V)-Math.min(...V),x1=b(_,R),[,T,D,a1]=z1({regions:e},C),Q=.54*T+.48*D;A.push({x:_,y:R,dir:C,xStep:k,radius:J,phase:Y,datum:G,relief:v,height:x1,light:z,bedrock:Q,volcanic:a1,samples:V,chance:h()})}if(!A.length)return f;let j=A.map(({datum:i})=>i).sort((i,d)=>i-d),g=j[Math.floor(j.length*.7)],B=({datum:i,height:d,light:_,relief:R,chance:C})=>1.3*_-Math.abs(i-g-.26)-.44*R-.32*Math.abs(d-i)+.2*C,u=({datum:i,height:d,light:_,relief:R,bedrock:C,chance:z})=>_-Math.abs(i-g-.36)-.65*R+.4*(d-i)+C+.3*z,I=A.sort((i,d)=>B(d)-B(i))[0],W=A.filter(({dir:i})=>c0(i,I.dir)<.94).sort((i,d)=>u(d)-u(i))[0],P=i=>({datum:d,relief:_,light:R,volcanic:C,chance:z})=>R-1.26*Math.abs(d-i)-.38*_+.64*C+.17*z,F=A.filter(({dir:i})=>c0(i,I.dir)<.91&&(!W||c0(i,W.dir)<.92)),m=(i,d)=>{let _=P(d);return i.sort((R,C)=>_(C)-_(R))[0]},U=m(F,j[Math.floor(j.length*.56)]+.3),E=U&&m(F.filter(({dir:i,datum:d})=>c0(i,U.dir)<.91&&d>U.datum+.29),g+.6);for(let[i,d]of[["impact",I],["karst",W],["rift",U],["rift",E]]){if(!d)continue;let{x:_,y:R,xStep:C,radius:z,phase:k,datum:J,chance:Y}=d,V=i==="rift",G=V?d.samples.indexOf(Math.min(...d.samples)):0,v=k+G*o0/8,x1=Math.cos(v),T=Math.sin(v),D=i==="impact",a1=D?I0(o,(X,L)=>b(_+(X*x1-L*T)*z/C,R+(X*T+L*x1)*z/l)).sort((X,L)=>L.wear-X.wear):[],Q=Math.max(0,...a1.map(({x:X,y:L,size:t1,warp:c1})=>Math.hypot(X,L)+1.53*t1*(1.021+c1))),p=z*(V?2.65:D?Q:1.56),w=i==="karst"?wt(h):[],q=Math.imul(o^o>>>16,2246822507)^Math.imul(Math.floor(_),2654435761),y=V?_t(V0(q),k,Y):null,N=V?C0(J-d.samples[G],.03,.28):0;for(let X=Math.max(1,Math.ceil(R-p/l));X<=Math.min(r-1,R+p/l);X++){for(let L=Math.ceil(_-p/C);L<=_+p/C;L++){let t1=(L-_)*C/z,c1=(X-R)*l/z,n1=t1*x1+c1*T,s1=c1*x1-t1*T,e1=X*c+n(L),K=t[e1],o1=K;if(D)for(let r1 of a1)o1=k0(n1,s1,o1,r1);else V?o1=At(n1,s1,K,J,y,N):o1=St(n1,s1,K,J,w);t[e1]=N1(K,o1,M)}t[X*c+r]=t[X*c]}let O=V?1.68:D?-Math.max(1.05,Q*.46):-.97,$=V?.65:0,Z=0,S=0;if(D){let X=a1.reduce((L,t1)=>L+t1.size,0);for(let L of a1)Z+=L.x*L.size/X,S+=L.y*L.size/X}let H=(X,L)=>G0(r,_+(X*x1-L*T)*z/C,R+(X*T+L*x1)*z/l);f[i].push({overlook:H(Z+O,S+$),target:H(Z,S)})}return f}var D1=2*Math.PI,u0=(t,c,o)=>Math.min(o,Math.max(c,t)),n0=(t,c,o)=>t+(c-t)*o;function _1(t,c,o){let x=u0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function Z0(t,c,o){let x=D1*t/o,a=Math.PI*c/o,e=Math.sin(a);return[e*Math.cos(x),Math.cos(a),e*Math.sin(x)]}function D0(t,c,o,x,a,e,f){let M=_1(.31,.76,x);if(c<513||M<=0)return;let r=c-1,n=y=>(y%r+r)%r,l=Math.PI/r,b=(y,N)=>t[u0(Math.round(N),0,r)*c+n(Math.round(y))],s=[];for(let y=0;y<24;y++){let N=Math.acos(1-(y+.5)/12)/l;for(let O=0;O<40;O++)s.push(b((O+.5)*r/40,N))}s.sort((y,N)=>y-N);let h=s[Math.floor(s.length*.74)]+.14,A=[...a.map(({head:y})=>y),...Object.values(e).flat().map(({target:y})=>y)],j=Math.imul(o^o>>>17,1757159915)^1900846437,g=()=>(j=Math.imul(j,1664525)+1013904223>>>0,j/4294967296),B;for(let y=0;y<17;y++)for(let N=0;N<32;N++){let O=(N+g())*r/32,$=(.22+.56*(y+g())/17)*r,Z=Z0(O,$,r);if(A.some(s1=>s1[0]*Z[0]+s1[1]*Z[1]+s1[2]*Z[2]>.955))continue;let S=.54*Z[0]+.45*Z[1]+.71*Z[2];if(S<.22)continue;let H=D1*Math.sin($*l)/r,X=.042+.018*g(),L=g()*D1,[,t1,c1,n1]=z1({regions:f},Z);for(let s1=0;s1<8;s1++){let e1=L+s1*D1/8,K=Math.cos(e1),o1=Math.sin(e1),r1=b(O-K*X/H,$-o1*X/l),f1=b(O+K*X/H,$+o1*X/l),l1=r1-f1;if(f1<h-.2||l1<.16||l1>1.3)continue;let b1=b(O,$),u1=.92*S-.6*Math.abs(l1-.56)-.54*Math.abs(b1-(r1+f1)*.5)-.38*Math.abs(f1-h)+.31*n1+.19*t1+.12*c1+.2*g();(!B||u1>B.score)&&(B={x:O,y:$,xStep:H,size:X,dx:K,dy:o1,high:r1,low:f1,score:u1})}}if(!B)return;let{x:u,y:I,xStep:W,size:P,dx:F,dy:m,high:U,low:E}=B,i=.15+.15*g(),d=g()*D1,_=.7+.6*g(),R=g(),C=(Math.imul(o^o>>>16,2654435761)>>>0)%3,z=.42+.19*g(),k=(y,N=0)=>i*Math.sin(2.4*y+d)+N*z*_1(-.36,.68,y),J=y=>n0(U,E,u0((y+.95)/1.9,0,1)**_),Y=[];function V(y,N,O,$){Y.push({u:y,v:k(y,N)+.17*(g()-.5),length:O,width:$,level:J(y),phase:g()*D1,chemistry:u0(.82*R+.33*g()-.06,0,1)})}function G(y,N,O,$,Z){let S=(N-y)/$;for(let H=0;H<$;H++){let X=y+S*(H+.48+.32*(g()-.5));V(X,O,S*(.39+.21*g()),Z*(.62+.52*g()))}}C===0?(V(-.68,0,.3,.54+.19*g()),G(-.37,.97,-1,2+Math.floor(2*g()),.31),G(-.11,1,1,2+Math.floor(2*g()),.36)):C===1?G(-1,1.04,0,3+Math.floor(4*g()),.54):(V(-.54,0,.55+.1*g(),.68+.13*g()),G(.12,1.1,0,2+Math.floor(2*g()),.46)),Y.sort((y,N)=>y.u-N.u);let v=2.1*P,x1=v/W,T=v/l,D=[u/r,I/r,x1/r,T/r],a1=new Uint32Array(96**2),Q={height:0,wet:0,crust:0,tint:0},p=(y,N,O)=>{let $=(y-u)*W/P,Z=(N-I)*l/P,S=$*F+Z*m,H=Z*F-$*m,X=C===0?Math.min(Math.abs(H-k(S,-1)),Math.abs(H-k(S,1))):Math.abs(H-k(S)),L=(1-_1(.045,.16,X))*_1(-1.23,-.83,S)*(1-_1(.89,1.42,S)),t1=J(S),c1=n0(O,Math.min(O,t1),.42*L),n1=0,s1=L*.43,e1=R;for(let K of Y){let o1=(S-K.u)/K.length,r1=(H-K.v)/K.width;if(Math.abs(o1)>1.62||Math.abs(r1)>1.62)continue;let f1=Math.atan2(r1,o1),l1=1+.097*Math.sin(3*f1+K.phase)+.042*Math.cos(7*f1-K.phase),b1=Math.hypot(o1,r1)/l1;if(b1>=1.42)continue;let u1=_1(.52,.98,Math.cos(f1))*(1-_1(.09,.29,Math.abs(r1))),M1=_1(.76,.93,b1)*(1-_1(1,1.24,b1)),m1=_1(1.02,1.23,b1)*(1-_1(1.27,1.42,b1)),F1=K.level+M1*(.077-.063*u1)-.05*m1,d1=1-_1(.83,1.42,b1);c1=n0(c1,F1,d1);let C1=1-_1(.64,.8,b1),U1=(1-_1(1.01,1.42,b1))*_1(.58,.85,b1);n1=n0(n1,C1,d1),U1>s1&&(s1=U1,e1=K.chemistry*(.61+.39*M1))}Q.height=n0(O,c1,M),Q.wet=n1*M,Q.crust=s1*M,Q.tint=e1};for(let y=Math.ceil(I-T);y<=Math.floor(I+T);y++){for(let N=Math.ceil(u-x1);N<=Math.floor(u+x1);N++){let O=y*c+n(N);p(N,y,t[O]),t[O]=Q.height}t[y*c+r]=t[y*c]}let w=95;for(let y=0;y<=w;y++)for(let N=0;N<=w;N++)p(u+(2*N/w-1)*x1,I+(2*y/w-1)*T,0),a1[y*96+N]=1056964608|Math.round(255*Q.wet)|Math.round(255*Q.crust)<<8|Math.round(255*Q.tint)<<16;let q=(y,N)=>Z0(u+(y*F-N*m)*P/W,I+(y*m+N*F)*P/l,r);return e.springs=[{overlook:q(.86,.82),target:q(-.12,0)}],{chart:D,values:a1,side:96}}var a0=2*Math.PI,s0=(t,c,o)=>Math.min(o,Math.max(c,t)),K1=(t,c,o)=>t+(c-t)*o;function H1(t,c,o){let x=s0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function K0(t,c,o){let x=Math.PI*c/o,a=a0*t/o;return[Math.sin(x)*Math.cos(a),Math.cos(x),Math.sin(x)*Math.sin(a)]}function R0(t,c){let o=t-Math.floor(t),x=Math.min(o/c,(1-o)/(1-c));return x*x*(1.32-.32*x)}function J0(t,c,o,x,a,e,f){let M=H1(.32,.76,x);if(c<513||M<=0)return;let r=c-1,n=Math.PI/r,l=S=>(S%r+r)%r,b=(S,H)=>t[s0(Math.round(H),0,r)*c+l(Math.round(S))],s=Math.imul(o^o>>>16,2221713035)^458671337,h=()=>(s=Math.imul(s,1664525)+1013904223>>>0,s/4294967296),A=[...a.map(({head:S})=>S),...Object.values(e).flat().map(({target:S})=>S)],j=[];for(let S=0;S<20;S++){let H=Math.acos(1-(S+.5)/10)/n;for(let X=0;X<36;X++)j.push(b((X+.5)*r/36,H))}j.sort((S,H)=>S-H);let g=j[Math.floor(j.length*.75)],B;for(let S=0;S<18;S++)for(let H=0;H<36;H++){let X=(H+h())*r/36,L=(.23+.54*(S+h())/18)*r,t1=K0(X,L,r),c1=.54*t1[0]+.45*t1[1]+.71*t1[2];if(c1<.22||A.some(u1=>u1[0]*t1[0]+u1[1]*t1[1]+u1[2]*t1[2]>.934))continue;let n1=a0*Math.sin(L*n)/r,s1=.066+.027*h(),e1=Array.from({length:8},(u1,M1)=>{let m1=M1*a0/8;return b(X+s1*Math.cos(m1)/n1,L+s1*Math.sin(m1)/n)}),K=b(X,L);if(K<g-.12)continue;let o1=e1.reduce((u1,M1)=>u1+M1,0)/e1.length,r1=Math.max(...e1)-Math.min(...e1),[,f1,,l1]=z1({regions:f},t1),b1=.8*c1-.52*Math.abs(K-g-.17)+.55*s0(o1-K,-.6,.65)-.26*s0(r1-.33,0,1.6)+.3*f1+.39*l1+.18*h();(!B||b1>B.score)&&(B={x:X,y:L,xStep:n1,radius:s1,center:K,mean:o1,volcanic:l1,score:b1})}if(!B)return;let{x:u,y:I,xStep:W,radius:P,center:F,mean:m,volcanic:U}=B,E=h()*a0,i=Math.cos(E),d=Math.sin(E),_=h()*a0,R=(Math.imul(o^o>>>17,2146121005)>>>0)%3,C=3.05+1.24*h(),z=s0(.7*U+.55*h()-.1,0,1),k=K1(F,m,.19),J=.19+.16*h(),Y=J*(.68+.58*h()),V=0,G=0,v=1/0;for(let S=0;S<18;S++){let H=.14+.56*h(),X=.86*(h()-.5),L=b(u+(i*H-d*X)*P/W,I+(d*H+i*X)*P/n);L<v&&(V=H,G=X,v=L)}v=Math.max(k-.19,v-.055);let x1=Array.from({length:20+Math.floor(12*h())},()=>({x:1.94*(h()-.5),y:1.9*(h()-.5),length:.15+.2*h(),width:.17+.23*h(),height:.09+.15*h(),curve:.22+.6*h()})),T=1.37*P/W,D=1.37*P/n,a1=[u/r,I/r,T/r,D/r],Q=new Uint32Array(96**2),p={height:0,sand:0,salt:0};function w(S,H,X){let L=(S-u)*W/P,t1=(H-I)*n/P,c1=i*L+d*t1,n1=i*t1-d*L,s1=1-H1(.71,1.21,Math.hypot(c1*.95,n1)),e1=k+.12*n1+.075*c1*c1,K=H1(.19,.59,X-e1),o1=H1(-.63,.62,.65*Math.sin(5.7*n1+_+1.5*c1)+.36*Math.cos(7.2*c1-4.5*n1)),r1=s1*(1-K)*K1(.53,1,o1),f1=Math.hypot((c1-V)/Y,(n1-G)/J)+.1*Math.sin(17*n1+5*c1+_),l1=s1*(1-H1(.63,1.23,f1))*(1-H1(v+.15,v+.33,X)),b1;if(R===1){b1=0;for(let M1 of x1){let m1=(n1-M1.y)/M1.width;if(Math.abs(m1)>=1)continue;let F1=m1*m1,d1=(c1-M1.x)/M1.length-M1.curve*F1,C1=(1-H1(.06,1,Math.abs(m1)))*H1(-1,.48,d1)*(1-H1(.48,.83,d1));b1=Math.max(b1,M1.height*C1)}}else{let M1=c1+.095*Math.sin(4.6*n1+_)+.054*Math.cos(10*n1-3.4*c1),m1=R0(C*M1+.18*Math.sin(n1*7+_),.76);if(R===2){let F1=R0(C*(n1*.67-.77*c1+.08*Math.sin(c1*8+_)),.68),d1=R0(C*(n1*.72+.63*c1+.13*Math.sin(n1*6-_)),.72);b1=.13*m1+.115*F1*d1+.082*m1*Math.max(F1,d1)}else b1=.22*m1}let u1=K1(X,e1+b1*K1(.49,1.18,o1),r1*.92);p.height=K1(X,K1(u1,v,l1*.95),M),p.sand=r1*(1-l1)*M,p.salt=l1*M}let q=95;for(let S=0;S<=q;S++)for(let H=0;H<=q;H++){let X=u+(2*H/q-1)*T,L=I+(2*S/q-1)*D;w(X,L,b(X,L)),Q[S*96+H]=1056964608|Math.round(255*p.sand)|Math.round(255*p.salt)<<8|Math.round(255*z)<<16}for(let S=Math.ceil(I-D);S<=Math.floor(I+D);S++){for(let H=Math.ceil(u-T);H<=Math.floor(u+T);H++){let X=S*c+l(H);w(H,S,t[X]),t[X]=p.height}t[S*c+r]=t[S*c]}let y=(S,H)=>K0(u+(S*i-H*d)*P/W,I+(S*d+H*i)*P/n,r);e.dunes=[{overlook:y(.94,.69),target:y(-.07,0)}];let N=y(-.01,0),$=y(.01,0).map((S,H)=>S-N[H]),Z=Math.hypot(...$);return{chart:a1,values:Q,side:96,wind:$.map(S=>S/Z)}}var It=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],kt=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],Q0=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],Pt=Uint32Array.from(Q0.flat(),t=>t>>>0),Ft={name:"Bourke",corners:It,edges:kt,maxVertices:15,table:Pt,cornerBit:t=>1<<t,createPolygonizer(){return(t,c,o)=>{let x=Q0[c],a=0;for(;a<15&&x[a]>=0;)o[a]=x[a],a++;return a}}};var v0=Ft;var Ct=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]);var e0=Ct;var Rt=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],Wt=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],W0=class{constructor(){this.table=e0,this.f_test_results=new Int32Array(6)}signbf(c){return c<0}face_tests(c){let o=this.v,x=this.f_test_results;return x.fill(0),c&128?(x[0]=(c&204)===132?o[0]*o[5]<o[1]*o[4]?-1:1:0,x[3]=(c&153)===129?o[0]*o[7]<o[3]*o[4]?-1:1:0,x[4]=(c&240)===160?o[0]*o[2]<o[1]*o[3]?-1:1:0):(x[0]=(c&204)===72?o[0]*o[5]<o[1]*o[4]?1:-1:0,x[3]=(c&153)===24?o[0]*o[7]<o[3]*o[4]?1:-1:0,x[4]=(c&240)===80?o[0]*o[2]<o[1]*o[3]?1:-1:0),c&2?(x[1]=(c&102)===66?o[1]*o[6]<o[2]*o[5]?-1:1:0,x[2]=(c&51)===18?o[3]*o[6]<o[2]*o[7]?-1:1:0,x[5]=(c&15)===10?o[4]*o[6]<o[5]*o[7]?-1:1:0):(x[1]=(c&102)===36?o[1]*o[6]<o[2]*o[5]?1:-1:0,x[2]=(c&51)===33?o[3]*o[6]<o[2]*o[7]?1:-1:0,x[5]=(c&15)===5?o[4]*o[6]<o[5]*o[7]?1:-1:0),x[0]+x[1]+x[2]+x[3]+x[4]+x[5]}face_test1(c){let o=this.v;switch(c){case 0:return o[0]*o[5]<o[1]*o[4]?72:132;case 1:return o[1]*o[6]<o[2]*o[5]?36:66;case 2:return o[3]*o[6]<o[2]*o[7]?33:18;case 3:return o[0]*o[7]<o[3]*o[4]?24:129;case 4:return o[0]*o[2]<o[1]*o[3]?80:160;default:return o[4]*o[6]<o[5]*o[7]?5:10}}interior_test(c,o){let x=this.v,a=1e-9,e=x[4]-x[0],f=x[5]-x[1],M=x[6]-x[2],r=x[7]-x[3],n=e*M-f*r;if(this.signbf(n)){if(c&1)return 0}else if(!(c&1)||Math.abs(n)<a)return 0;let l=.5*(x[3]*f+x[1]*r-x[2]*e-x[0]*M)/n;if(l<=a||l>=1-a)return 0;let b=x[0]+e*l,s=x[1]+f*l,h=x[2]+M*l,A=x[3]+r*l,j=h*b,g=A*s;if(c&1){if(j<g&&!this.signbf(g))return(this.signbf(s)===this.signbf(x[c]))+o}else if(j>g&&!this.signbf(j))return(this.signbf(b)===this.signbf(x[c]))+o;return 0}pattern(c){let o=this.table,x=(c&128)!==0,a=x?c^255:c,e=o[a];if(e===void 0)throw new Error(`MC33 lookup miss: ${a}`);let f=(e&2048)!==0,M=x?!f:f,r=M?c:c^255,n=e&2047,l=e>>>12,b;switch(l){case 0:b=n;break;case 1:b=r&this.face_test1(n>>2)?183+(n<<1):159+n;break;case 2:b=this.interior_test(n,0)?239+6*n:231+(n<<1);break;case 3:r&this.face_test1(n%6)?b=575+5*n:b=this.interior_test(Math.floor(n/6),0)?407+7*n:335+3*n;break;case 4:{let s=this.face_tests(r);s===-3?b=695+3*n:s===-1?b=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*n:s===1?b=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*n:b=this.interior_test(n>>1,0)?1095+9*n:1055+5*n;break}case 5:{let s=this.face_tests(r);s===-2?b=(n&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(n?1:3,0))?1213+(n<<3):1189+(n<<2):s===0?b=(this.f_test_results[2+n]<0?1261:1285)+(n<<3):b=(n&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(n?3:1,0))?1237+(n<<3):1201+(n<<2);break}case 6:{let s=this.face_tests(r);s===-2?b=this.interior_test(14287116>>(n<<1)&3,0)?1453+(n<<3):1357+(n<<2):s===0?b=(this.f_test_results[n>>1]<0?1645:1741)+(n<<3):b=this.interior_test(10991589>>(n<<1)&3,0)?1549+(n<<3):1405+(n<<2);break}default:{let s=Math.abs(this.face_tests(r));if(s===0){let h=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])b=2157+12*h;else{let A=this.interior_test(h,1);b=2285+(A?10*h-40*A:6*h)}}else if(s===2)b=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(b+=30);else if(s===4){let h=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];h>>4&&(h-=h&32?20:10),b=1845+3*h}else b=1839+2*this.f_test_results[0]}}return{offset:b+1,reverse:M}}triangles(c,o,x){if(this.v=c,o===0||o===255)return 0;let a=this.pattern(o),e=0;for(let f=a.offset;f<e0.length;f++){let M=e0[f],r=M&15,n=M>>4&15,l=M>>8&15;if(r<=12&&n<=12&&l<=12&&r!==n&&n!==l&&r!==l){if(e+3>x.length)throw new Error("MC33 cell exceeds output capacity");x[e++]=r,x[e++]=a.reverse?l:n,x[e++]=a.reverse?n:l}if(!(M&4096))return e}throw new Error("MC33 pattern exceeds lookup table")}},Bt={name:"MC33",corners:Rt,edges:Wt,maxVertices:36,table:e0,cornerBit:t=>128>>t,createPolygonizer(){let t=new W0;return t.triangles.bind(t)}};var tt=Bt;function B0(t={type:"cartesian"}){if(t.type==="cartesian")return(e,f,M)=>[e,f,M];if(t.type!=="spherical"&&t.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${t.type}`);let c=t.radius||[.02,.7],o=t.center||[.5,.5,.5];if(c.length!==2||!c.every(Number.isFinite)||c[0]<0||c[1]<=c[0])throw new Error("Radius must be an increasing, nonnegative pair");if(o.length!==3||!o.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(t.type==="cube-sphere"){if(!Number.isInteger(t.face)||t.face<0||t.face>5)throw new Error("Cube-sphere face must be 0..5");return(e,f,M)=>{let r=2*e-1,n=2*f-1,b=[[1,n,-r],[-1,n,r],[r,1,-n],[r,-1,n],[r,n,1],[-r,n,-1]][t.face],h=(c[0]+M*(c[1]-c[0]))/Math.hypot(...b);return b.map((A,j)=>o[j]+A*h)}}let x=t.longitude||[-Math.PI,Math.PI],a=t.latitude||[-Math.PI/2,Math.PI/2];for(let e of[x,a])if(e.length!==2||!e.every(Number.isFinite)||e[1]<=e[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(a[0]<-Math.PI/2||a[1]>Math.PI/2||x[1]-x[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \\xB1pi/2 and longitude span at most 2*pi");return(e,f,M)=>{let r=x[0]+e*(x[1]-x[0]),n=a[0]+f*(a[1]-a[0]),l=c[0]+M*(c[1]-c[0]),b=l*Math.cos(n);return Math.abs(Math.cos(n))<1e-15?[o[0],o[1]+l*Math.sin(n),o[2]]:[o[0]+b*Math.cos(r),o[1]+l*Math.sin(n),o[2]+b*Math.sin(r)]}}function xt(t,c){if(!c||c.type==="cartesian")return t;let o=B0(c);for(let x=0;x<t.length;x+=3){let a=o(t[x],t[x+1],t[x+2]);t[x]=a[0],t[x+1]=a[1],t[x+2]=a[2]}return t}var zt={bourke:v0,mc33:tt};function jt(t,c,o,x){let a=zt[x];if(!a)throw new Error(`Unknown marching cubes algorithm: ${x}`);if(!["x","y","z"].every(e=>Number.isInteger(c[e])&&c[e]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(t instanceof Float32Array)||t.length!==c.x*c.y*c.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(o))throw new Error("Isolevel must be finite");for(let e of t)if(!Number.isFinite(e)||!Number.isFinite(Math.fround(e-o)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return a}function ct(t,c,o=0,x="bourke",a={}){o=Math.fround(o),a.coordinates&&B0(a.coordinates);let e=jt(t,c,o,x),{x:f,y:M,z:r}=c,n=e.createPolygonizer(),l=new Float32Array(8),b=new Uint8Array(e.maxVertices),s=new Float32Array(39),h=new Float32Array(65536),A=0;for(let j=0;j<r-1;j++)for(let g=0;g<M-1;g++)for(let B=0;B<f-1;B++){let u=0;for(let W=0;W<8;W++){let P=e.corners[W];l[W]=t[((j+P[2])*M+g+P[1])*f+B+P[0]]-o,l[W]<0&&(u|=e.cornerBit(W))}if(u===0||u===255)continue;let I=n(l,u,b);if(A+I*3>h.length){let W=new Float32Array(Math.max(h.length*2,A+I*3));W.set(h),h=W}for(let W=0;W<12;W++){let[P,F]=e.edges[W];if(l[P]<0==l[F]<0)continue;let m=l[P]-l[F],U=Math.abs(m)<1e-9?.5:Math.max(0,Math.min(1,l[P]/m)),E=e.corners[P],i=e.corners[F];s[W*3]=(B+E[0]+U*(i[0]-E[0]))/(f-1),s[W*3+1]=(g+E[1]+U*(i[1]-E[1]))/(M-1),s[W*3+2]=(j+E[2]+U*(i[2]-E[2]))/(r-1)}s[36]=(B+.5)/(f-1),s[37]=(g+.5)/(M-1),s[38]=(j+.5)/(r-1);for(let W=0;W<I;W++){let P=b[W]*3;h[A++]=s[P],h[A++]=s[P+1],h[A++]=s[P+2]}}return xt(h.slice(0,A),a.coordinates)}var Ut=2*Math.PI;function Ht(t,c){return[Math.sin(t)*Math.cos(c),Math.cos(t),Math.sin(t)*Math.sin(c)]}var m0=(t,c)=>t[0]*c[0]+t[1]*c[1]+t[2]*c[2];function G1(t,c,o,x){let{bend:a,twist:e,thickness:f,peak:M,portals:r}=x,n=o-a*t*t+e*t*c,l=M-.17*t-.13*Math.cos(4.1*t+e),b=Math.hypot(t*.87+.08*c,(c-.15)/l,n/f)-1,s=Math.hypot((Math.abs(t)-.83-.11*c)/.34,(c+.28)/.68,(n+.06*t)/(f*1.48))-1,h=Math.max(0,.2-Math.abs(b-s)),A=Math.min(b,s)-1.25*h*h,j=.034*Math.sin(19*c+2.3*t+2.1*n)+.025*Math.sin(12*t+7.3*n+5*c)*Math.cos(10*c-3*n),g=1/0;for(let{at:B,width:u,height:I,lean:W}of r){let P=(t-B-W*c-.05*o)/u,F=Math.max(0,c+.08+.05*o)/I;g=Math.min(g,Math.hypot(P,F)-1)}return Math.max(A+j,-g+.37*j)}function Xt(t){let c={x:55,y:45,z:29},o=[-1.39,-1.05,-.88],x=[1.39,1.6,.88],a=x.map((r,n)=>(r-o[n])/([c.x,c.y,c.z][n]-1)),e=new Float32Array(c.x*c.y*c.z);for(let r=0;r<c.z;r++)for(let n=0;n<c.y;n++)for(let l=0;l<c.x;l++)e[(r*c.y+n)*c.x+l]=G1(o[0]+l*a[0],o[1]+n*a[1],o[2]+r*a[2],t);let f=ct(e,c,0,"mc33"),M=new Float32Array(f.length*2);for(let r=0;r<f.length;r+=3){let n=o[0]+f[r]*(x[0]-o[0]),l=o[1]+f[r+1]*(x[1]-o[1]),b=o[2]+f[r+2]*(x[2]-o[2]),s=.004;M.set([n,l,b,G1(n+s,l,b,t)-G1(n-s,l,b,t),G1(n,l+s,b,t)-G1(n,l-s,b,t),G1(n,l,b+s,t)-G1(n,l,b-s,t)],r*2)}return M}function ot(t,c,o,x,a,e){if(c<513||x<.38)return;let f=c-1,M=Object.values(a).flat().map(({target:g})=>g),r=(g,B)=>t[Math.round(B)*c+(Math.round(g)%f+f)%f],n=[];for(let g=12;g<f;g+=19)for(let B=1;B<f;B+=19)n.push(r(B,g));n.sort((g,B)=>g-B);let l=n[Math.floor(.77*n.length)],b=Math.imul(o^o>>>17,2654435761)^1126074651,s=()=>(b=Math.imul(b,1664525)+1013904223>>>0,b/4294967296),h=[];for(let g=0;g<19;g++)for(let B=0;B<33;B++){let u=(B+s())*f/33,I=(.22+.56*(g+s())/19)*f,W=r(u,I);if(W<l-.18)continue;let P=Math.PI*I/f,F=Ut*u/f,m=Ht(P,F),U=m0(m,[.54,.45,.71]);if(U<.25||M.some(k=>m0(k,m)>.998))continue;let[,E,i,d]=z1({regions:e},m),_=r(u+2,I)-r(u-2,I),R=r(u,I+4)-r(u,I-4),C=Math.hypot(_,R),z=.8*U+.56*E+.32*i+.24*d-.51*Math.abs(W-l-.21)-.38*Math.abs(C-.31)+.22*s();h.push({dir:m,theta:P,phi:F,dx:_,dy:R,canyon:E,volcanic:d,score:z})}let A=[];for(let g of h.sort((B,u)=>u.score-B.score))if(!A.some(B=>m0(B.dir,g.dir)>.94)&&(A.push(g),A.length===2))break;if(!A.length)return;let j=A.map(({dir:g,theta:B,phi:u,dx:I,dy:W,canyon:P,volcanic:F})=>{let m=[-Math.sin(u),0,Math.cos(u)],U=[Math.cos(B)*Math.cos(u),-Math.sin(B),Math.cos(B)*Math.sin(u)],E=Math.atan2(W,I)+Math.PI/2+(s()-.5)*1.55,i=m.map((Y,V)=>Y*Math.cos(E)+U[V]*Math.sin(E)),d=m.map((Y,V)=>-Y*Math.sin(E)+U[V]*Math.cos(E)),_=240+250*s(),R=.64+.45*s(),C={bend:.25*(s()-.5),twist:.35*(s()-.5),thickness:.23+.13*s(),peak:.79+.2*s(),portals:[]};s()<.39?C.portals.push({at:-.41,width:.24+.1*s(),height:.4+.14*s(),lean:-.11},{at:.34,width:.29+.1*s(),height:.49+.13*s(),lean:.13}):C.portals.push({at:(s()-.5)*.24,width:.52+.17*s(),height:.49+.14*s(),lean:(s()-.5)*.36});let z=m0(d,[.54,.45,.71])>=0?1:-1,k=g.map((Y,V)=>Y+(d[V]*z*_*3.6+i[V]*_*.78)/262144),J=Math.hypot(...k);return{direction:g,span:i,depth:d,size:_,rise:R,tint:Math.min(1,.24+.59*P-.2*F+.27*s()),site:{target:g,overlook:k.map(Y=>Y/J)},vertices:Xt(C)}});return a.arches=j.map(({site:g})=>g),j}function nt(t){let c=f=>j1(f,0,0,t)/4294967296,o=c(47);if(o>=.55)return[0,0,0,0];if(o>=.3)return[0,0,0,1.18+.42*c(37)];let x=.48*(c(21)-.5),a=.48*(c(23)-.5),e=Math.hypot(x,1,a);return[x/e,1/e,a/e,.65+.48*c(37)]}function at(t,c,o,x,a){if(a[3]===0)return-1/0;let e=Math.abs(t*a[0]+c*a[1]+o*a[2]),f=Math.sin(9*t+4*c-7*o+14*a[0]);return x-a[3]+1.08*e*e-.115*f}function st(t,c,o,x,a,e,f=!0,M=1,r,n=!1,l=0,b=!1){let s=n||a>0?P0(x,n):[];if(n){_0(t,c);let U=Math.min(c,257),E=l>=1?{side:U,values:new Float32Array(U**2)}:void 0,i=R=>Math.round(R*(c-1)/(U-1));if(E)for(let R=0;R<U;R++)for(let C=0;C<U;C++)E.values[R*U+C]=t[i(R)*c+i(C)];if(F0(t,c,x,a,M,!0,s,l),E)for(let R=0;R<U;R++)for(let C=0;C<U;C++){let z=R*U+C;E.values[z]=t[i(R)*c+i(C)]-E.values[z]}let d=b?{side:U,values:new Float32Array(U**2)}:void 0,_=d?A0(t,c,x,.87,d):[];return{values:t,glacialSites:_,glacialIce:d,impactMaterial:E,landmarks:{},impactBasins:s,ocean:{seed:x,datum:null}}}let h=f?A0(t,c,x,a):[],A=f?$0(t,c,x,a,h,e):{};F0(t,c,x,f?0:a,M,!1,s);let j=f&&r===void 0?null:N0(t,c,x,{coverage:r}),g=f?null:nt(x),B=Math.min(c,257),u=f?null:{side:B,values:new Float32Array(B**2)},I=!f&&e&&a>0?{seed:x,variation:a,regions:e,sites:[]}:null;if(Lt(t,c,o==="volcanic"?.84:1.32,j,g,u,I,!f&&{seed:x,geology:o,regions:e}),X0(t,c,o==="alpine"?.94:.74),j!==null&&Y0(t,c,j,r===void 0?void 0:o),_0(t,c),!f)return{values:t,glacialSites:h,landmarks:A,impactBasins:s,alluvium:u,invertedRidges:I?.sites,ocean:{seed:x,datum:j}};let P=D0(t,c,x,a,h,A,e),F=J0(t,c,x,a,h,A,e),m=ot(t,c,x,a,A,e);return{values:t,glacialSites:h,landmarks:A,impactBasins:s,springs:P,dunes:F,rockSpans:m,ocean:r===void 0?void 0:{seed:x,datum:j}}}function Lt(t,c,o=1,x=null,a=null,e=null,f=null,M=null){let r=c-1,n=Math.min(256,Math.floor(r/3.5));if(n<12)return t;let l=n*(n-1),b=r/n,s=new Float32Array(l),h=Float32Array.from({length:n+1},(p,w)=>Math.sin(Math.PI*w/n)),A=(p,w)=>(p+w)%w,j=(p,w)=>t[Math.round(w)*c+A(Math.round(p),r)];for(let p=1;p<n;p++)for(let w=0;w<n;w++){let q=w*b,y=p*b,N=b*.48;s[(p-1)*n+w]=.4*j(q,y)+.15*(j(q-N,y)+j(q+N,y)+j(q,y-N)+j(q,y+N))}let B=s.slice().sort()[Math.floor(l*.2)],u=new Float32Array(l).fill(1/0),I=new Int32Array(l).fill(-1),W=new Uint32Array(l),P=new Uint32Array(l).fill(l),F=new Float32Array(l),m=new Uint32Array(l),U=0;function E(p){let w=U++;for(;w;){let q=w-1>>1;if(u[m[q]]<=u[p])break;m[w]=m[q],w=q}m[w]=p}function i(){let p=m[0],w=m[--U],q=0;for(;q*2+1<U;){let y=q*2+1;if(y+1<U&&u[m[y+1]]<u[m[y]]&&y++,u[w]<=u[m[y]])break;m[q]=m[y],q=y}return m[q]=w,p}for(let p=0;p<l;p++)s[p]<=B&&(u[p]=s[p],E(p));for(let p=0;U;p++){let w=i(),q=w%n,y=Math.floor(w/n)+1,N=h[y],O=Math.max(.08,2*N),$=1/Math.hypot(O,1);W[p]=w,P[w]=p,F[w]=N;let Z=0;for(let S=-1;S<=1;S++){let H=y+S;if(!(H<1||H>=n))for(let X=-1;X<=1;X++){if(!X&&!S)continue;let L=(H-1)*n+A(q+X,n);if(u[L]===1/0)u[L]=Math.max(s[L],u[w]+2e-5),I[L]=w,E(L);else if(P[L]<p){let t1=(u[w]-u[L])*(S?X?$:1:1/O);t1>Z&&(Z=t1,I[w]=L)}}}}let d=e&&new Float32Array(l),_=e&&new Float32Array(l),R=(1e3/n)**2;for(let p=l-1;p>=0;p--){let w=W[p],q=I[w];if(q<0)continue;let y=F[w];F[q]+=y,_&&(_[q]=Math.max(_[q],Math.min(d[q],y)),d[q]=Math.max(d[q],y))}if(_){let p=106.63474115247546/R;for(let w=0;w<l;w++){let q=_[w];if(q<=p){_[w]=0;continue}let y=Math.min(1,(Math.log2(1+q*R)-6.75)/4.6),N=Math.min(1,q/Math.max(1,d[w]*.58));_[w]=y*N}}let C=new Float32Array(c*c),z=x===null&&!e?null:new Float32Array(c*c),k=a&&a[3]!==0&&new Float32Array(l),J=f&&new Float32Array(l),Y=M&&(M.regions||M.geology==="mesa")&&new Float32Array(l),V=Y&&new Float32Array(l),G=Y&&new Float32Array(l),v=f&&new Float32Array(c*c),x1=[];if(k||J||Y){let p=Float64Array.from({length:n},(O,$)=>Math.cos(2*Math.PI*$/n)),w=Float64Array.from({length:n},(O,$)=>Math.sin(2*Math.PI*$/n)),q=f?j1(53,0,0,f.seed)*(2*Math.PI/4294967296):0,y=Y?j1(61,0,0,M.seed)*(2*Math.PI/4294967296):0,N=Math.min(1,n/160);for(let O=1;O<n;O++){let $=h[O],Z=Math.cos(Math.PI*O/n);for(let S=0;S<n;S++){let H=(O-1)*n+S,X=s[H],L=$*p[S],t1=$*w[S];if(k){let s1=at(L,Z,t1,X,a),e1=Math.max(0,Math.min(1,(s1-.015)/.48)),K=Math.max(0,Math.min(1,(X-B-.16)/.54));k[H]=e1*e1*(3-2*e1)*K}let c1=J&&$>.19&&X>(x??B)+.12,n1=Y||c1?z1(M||f,[L,Z,t1],M?.geology):null;if(Y){let s1=x===null?1:Math.max(0,Math.min(1,(X-x-.02)/.22)),e1=Math.max(0,(n1[1]-.18)/.82)*(1-(k?.[H]??0));Y[H]=e1;let K=e1*s1*t0(O,n)*b;if(K>0){let o1=N*(35*L-52*Z+28*t1)+y,r1=N*(-67*L+21*Z+49*t1)-y;V[H]=K*(1.36*Math.sin(o1)+.38*Math.sin(r1))/Math.max(.5,2*$),G[H]=K*(.76*Math.cos(r1)+.29*Math.cos(o1))}}if(c1){let[,s1,e1,K]=n1,o1=.45*s1+.27*e1+.91*K,r1=.69*Math.sin(9*L+3*Z-7*t1+q)+.31*Math.cos(15*L-8*Z+9*t1-q),f1=Math.max(0,Math.min(1,(r1-.1)/.73)),l1=Math.max(0,Math.min(1,(o1-.26)/.57));J[H]=f.variation*l1*f1*f1*(1-.85*(k?.[H]??0))}}}}let T=p=>Math.max(0,Math.min(1,(Math.log2(1+F[p]*R)-6.45)/6.4+.17*(Y?.[p]??0))),D=(p,w)=>{let q=Math.min(1,Math.max(0,(s[p]-B+.12)/.36));return o*w*(.095+.24*w)*(.46+.54*q)*(1+.32*(Y?.[p]??0))},a1=(p,w)=>{let q=I[p];if(q<0||w<=.53)return 0;let y=Math.abs(s[p]-s[q])*n/256,N=(w-.53)/.47,O=Math.max(0,1-y/.065),$=x===null?1:Math.max(0,Math.min(1,(s[p]-x-.04)/.17));return N*O*O*$*(1-(k?.[p]??0))};for(let p=0;p<l;p++){let w=I[p];if(w<0)continue;let q=T(p);if(q<=0)continue;let y=T(w),N=Math.floor(p/n)+1,O=p%n*b+(V?.[p]??0),$=N*b+(G?.[p]??0),Z=(A(w%n-p%n+1,n)-1)*b+(V?.[w]??0)-(V?.[p]??0),S=(Math.floor(w/n)-N+1)*b+(G?.[w]??0)-(G?.[p]??0),H=Math.max(.35,2*h[N]),X=Z*H,L=Math.max(1e-6,X*X+S*S),t1=(k?.[p]??0)*q*q,c1=(k?.[w]??0)*y*y,n1=Y?.[p]??0,s1=Y?.[w]??0,e1=(_?.[p]??0)*(1-t1),K=(_?.[w]??0)*(1-c1),o1=(.43+1.44*q)*b*(1+.57*t1+.43*e1),r1=(.43+1.44*y)*b*(1+.57*c1+.43*K),f1=Math.max(o1,r1),l1=D(p,q)*(1+.72*t1),b1=D(w,y)*(1+.72*c1),u1=s[p]-l1,M1=Math.min(u1,s[w]-b1),m1=e?a1(p,q):0,F1=e?a1(w,y):0,d1=m1>0||F1>0,C1=q*q*(J?.[p]??0),U1=y*y*(J?.[w]??0),J1=Math.max(C1,U1)>.025;C1>.17&&U1>.17&&x1.push({x:p%n,y:N,score:(C1+U1)/2});let T1=x!==null&&q>.57&&s[p]>=x&&s[p]<x+.24&&s[w]<x&&s[w]>x-.2,Q1=0,$1=I[w];if(e&&q>.59&&$1>=0&&t1<.22&&(x===null||s[w]>x+.05)){let R1=s[p]-s[w],E1=Math.max(0,s[w]-s[$1]),Z1=Math.max(0,Math.min(1,(.76*R1-E1-.016)/.075));Q1=o*q*Z1*Math.min(.2,.73*R1)}let v1=Q1>.005,E0=0;if(v1){let R1=((A($1%n-w%n+1,n)-1)*b+(V?.[$1]??0)-(V?.[w]??0))*H,E1=(Math.floor($1/n)-Math.floor(w/n))*b+(G?.[$1]??0)-(G?.[w]??0);E0=(X*E1-S*R1)/Math.sqrt(L*Math.max(1e-6,R1**2+E1**2))}let d0=f1*(v1?2.04:T1?1.65:J1?1.35:1),X1=v1?3.3:T1?2.65:1,z0=d0/H,j0=T1||v1?Math.sqrt(L):0,et=Math.max(1,Math.floor(Math.min($,$+X1*S)-d0)),rt=Math.min(r-1,Math.ceil(Math.max($,$+X1*S)+d0)),it=Math.floor(Math.min(O,O+X1*Z)-z0),ht=Math.ceil(Math.max(O,O+X1*Z)+z0);for(let R1=et;R1<=rt;R1++){let E1=t0(R1,r),Z1=R1-$;for(let r0=it;r0<=ht;r0++){let i0=(r0-O)*H,q1=(i0*X+Z1*S)/L,W1=Math.min(1,Math.max(0,q1)),A1=R1*c+A(r0,r);if(T1&&q1>.2&&q1<X1){let p1=(q1-.2)/(X1-.2),w1=Math.abs(i0*S-Z1*X)/j0,B1=r1*(.52+p1),Y1=t[A1]-x;if(w1<B1&&Y1>-.19&&Y1<.034){let O1=w1/B1,f0=(1-O1)*Math.min(1,O1*4),y0=Math.min(.15,.034-Y1);z[A1]=Math.max(z[A1],y0*f0*4*p1*(1-p1)*q*E1)}}if(v1&&q1>.42&&q1<X1){let p1=(q1-.42)/(X1-.42),w1=(i0*S-Z1*X)/j0,B1=r1*(.48+1.27*p1),Y1=s[w]-.068*(q1-1),O1=Math.max(0,t[A1]-Y1);if(Math.abs(w1)<B1&&O1<.28){let f0=w1/B1,y0=1+.46*E0*f0,w0=Math.abs(f0),mt=(1-w0)**2*Math.min(1,5*w0),dt=Math.min(1,.28+8*Math.abs(w0-.58*p1)),pt=mt*dt*4*p1*(1-p1),gt=Q1*pt*y0*(1-O1/.28)*E1;z[A1]=Math.max(z[A1],gt)}}let lt=o1+W1*(r1-o1),k1=Math.hypot(i0-W1*X,Z1-W1*S)/lt;if(J1&&k1<1.35){let p1=(C1+W1*(U1-C1))*E1,w1=Math.max(0,Math.min(1,(.54-k1)/.3)),B1=Math.max(0,1-Math.abs(k1-.84)/.51);v[A1]=Math.max(v[A1],.35*p1*w1*w1*(3-2*w1)),C[A1]=Math.max(C[A1],.19*p1*B1*B1)}if(k1>=1)continue;let p0=l1+W1*(b1-l1),ft=e1+W1*(K-e1),U0=.27*(q+W1*(y-q))**2+.19*ft,h0=1-Math.max(0,(k1-U0)/(1-U0));if(n1>0||s1>0){let p1=n1+W1*(s1-n1),w1=Math.max(0,Math.min(1,(k1-.19)/.59)),B1=1-w1*w1*(3-2*w1);h0+=.77*p1*(B1-h0)}let bt=t1+W1*(c1-t1),g0=k1*k1,Mt=1-g0*g0*(3-2*g0),ut=h0+bt*(Mt-h0),H0=u1+W1*(M1-u1),l0=Math.min(1.65*p0,Math.max(.4*p0,t[A1]-H0))*E1*ut;if(d1&&k1>.28&&k1<.94){let p1=Math.min(1,(k1-.28)/.21,(.94-k1)/.22),w1=p1*p1*(3-2*p1)*(m1+W1*(F1-m1)),Y1=(H0+p0*(.24+.18*k1)-(t[A1]-l0))*w1,O1=Math.max(-.073*o,Math.min(.14*o,-Y1));l0=Math.max(0,l0+O1*E1)}C[A1]=Math.max(C[A1],l0)}}}let Q=e?(e.side-1)/r:0;for(let p=1;p<r;p++){let w=p*c;for(let q=0;q<r;q++){let y=w+q,N=z?.[y]??0,O=v?.[y]??0;if(t[y]+=N+O-C[y]*(1-.89*Math.min(1,O/.115)),e&&N>0){let $=Math.round(p*Q);if($===0||$===e.side-1)continue;let Z=Math.round(q*Q)%(e.side-1),S=$*e.side+Z,H=N*(1-.5*Math.min(1,C[y]/.24));e.values[S]=Math.max(e.values[S],Math.min(1,H*9))}}t[w+r]=t[w]}if(x1.length){x1.sort((p,w)=>w.score-p.score);for(let{x:p,y:w}of x1){let q=Math.PI*w/n,y=2*Math.PI*p/n,N=Math.sin(q),O=[N*Math.cos(y),Math.cos(q),N*Math.sin(y)];if(!f.sites.some($=>$[0]*O[0]+$[1]*O[1]+$[2]*O[2]>.998)&&(f.sites.push(O),f.sites.length>=48))break}}if(e)for(let p=1;p<e.side-1;p++){let w=p*e.side;e.values[w+e.side-1]=e.values[w]}return t}self.onmessage=({data:{values:t,side:c,settings:o}})=>{let{geology:x,seed:a,variation:e,regions:f,landmarkPatches:M,featureDensity:r,oceanCoverage:n,lunar:l,craterDetail:b,cryoGlaciers:s}=o,h=st(t,c,x,a,e,f,M,r,n,l,b,s),A=[h.values.buffer];h.alluvium&&A.push(h.alluvium.values.buffer),h.glacialIce&&A.push(h.glacialIce.values.buffer),h.impactMaterial&&A.push(h.impactMaterial.values.buffer),h.springs&&A.push(h.springs.values.buffer),h.dunes&&A.push(h.dunes.values.buffer);for(let j of h.rockSpans??[])A.push(j.vertices.buffer);self.postMessage(h,A)};;if(typeof import_meta !== \'undefined\')import_meta.url=location.origin+"/dist/";})();\n',h1=URL.createObjectURL(new globalThis.Blob([x1],{type:"text/javascript"})),Sa=h1;var Ot={mixed:0,alpine:1,mesa:2,volcanic:3};function g1(i,e,t,a,r,o,f,c){let s=qt(i,{reseedLayers:f}),n=e==="alpine"||e==="mixed",p=e==="alpine"?2.2:e==="volcanic"?1.36:1.75,m=n?.48:e==="mesa"?.43:.25,l=s.layers.map(({entryPoint:u,params:g},y)=>{let h={...za,...g};if(t&&u==="computeRidgedMultifractal4"){let x=1+(p-1)*r;h.scalar=x,h.transform=.36*(x-1)}else t&&(u==="computeFBM"&&(h.scalar*=.94),u==="computeFBM2"&&(h.scalar*=1-m*r),n&&u==="computeLanczosBillow"&&(h.scalar*=1-.52*r));let b=c?.layers[y];return b&&Object.assign(h,b.uniforms),h.zoom/=o,{entryPoint:b?.algorithm??u,layer:h,weights:b?.weights,blend:t&&y>0?a:0,phase:13.7*y+(i>>>0)%997*.13}});return{...s,layers:l,mountainRanges:n}}async function y1(i,e,t){if(typeof Worker=="function"){let u;try{return u=new Worker(Sa),await new Promise((g,y)=>{u.onmessage=({data:h})=>g(h),u.onerror=y,u.onmessageerror=y,u.postMessage({values:i,side:e,settings:t})})}catch{}finally{u?.terminate()}}let{geology:a,seed:r,variation:o,regions:f,landmarkPatches:c,featureDensity:s,oceanCoverage:n,lunar:p,craterDetail:m,cryoGlaciers:l}=t;return wa(i,e,a,r,o,f,c,s,n,p,m,l)}var v1=Float32Array.from({length:31},(i,e)=>2**(Math.max(1,e)-25));function $e(i){let e=i>>10&31,t=i&1023,a=i&32768?-1:1;return e===31?t?NaN:a*(1/0):a*v1[e]*(t+(e?1024:0))}async function b1(i,e){let t=new tt(i,i.queue);try{return await M1(t,e)}finally{t.dispose()}}async function M1(i,{seed:e=123456789,segments:t=1e3,reseedLayers:a,erosion:r=!1,geology:o="mixed",variation:f=.8,rangeWeight:c=1,landscape:s="natural",landscapeStrength:n=1,featureDensity:p=1,oceanCoverage:m,lunar:l=!1,craterDetail:u=0,cryoGlaciers:g=!1,landmarkPatches:y=!0,proceduralGuide:h=!1,noiseMix:b=null}={}){if(!Number.isInteger(t)||t<8||t>1536)throw new RangeError("Planet Studio noise needs 8\u20131536 segments.");if(!Number.isInteger(e))throw new RangeError("Use an integer noise seed.");if(!Number.isFinite(u)||u<0||u>2)throw new RangeError("Lunar crater detail must be between 0 and 2.");if(!Number.isFinite(p)||p<.0625||p>8)throw new RangeError("Feature density must be between 0.0625 and 8.");if(m!==void 0&&!(m>=0&&m<1&&Number.isFinite(m)))throw new RangeError("Ocean coverage must be at least 0 and less than 1.");if(!Object.hasOwn(Ot,o))throw new RangeError("Unknown planet geology.");if(!Object.hasOwn(Rt,s)||!Number.isFinite(n)||n<0||n>1)throw new RangeError("Use a valid planet landscape and strength from 0 to 1.");if(!Number.isFinite(f)||f<0||f>1||!Number.isFinite(c)||c<.35||c>1.35)throw new RangeError("Planet variation must be 0\u20131 and range weight 0.35\u20131.35.");let x=t+1,{sphereOffset:M,sphereOffset2:B,layers:z,mountainRanges:S}=g1(e,o,r,f,c,p,a,b),v=_a(b,Ot[o]),{device:k}=i,A="planet-studio-height",d=r?["computeStudioSphereRelief","computeStudioSphereMountainErosion",...S&&f===0?[]:["computeStudioSphereErosion"]]:[],w;try{let G=function(T){let{texture:Z}=i.getCurrentTextureResource(A),X=k.createCommandEncoder();X.copyTextureToBuffer({texture:Z},{buffer:w,bytesPerRow:I,offset:Q*T},[x,x,1]),k.queue.submit([X.finish()])},{messages:_}=await i.shaderModule.getCompilationInfo(),C=_.filter(T=>T.type==="error");if(C.length)throw new Error(C.map(T=>T.message).join(`
`));let F=async()=>{await i.prepareTexturePipelines(["clearTexture",...z.map(({entryPoint:T})=>T)]),await i.computeToTexture(x,x,{scalar:1,transform:0},{textureKey:A,noiseChoices:["clearTexture"]});for(let{entryPoint:T,layer:Z,weights:X,blend:P,phase:E}of z)i.buildPermTable(Z.seed),await i.computeToTexture(x,x,Z,{textureKey:A,useCustomPos:2,sphereOffset:M,sphereOffset2:B,spherePolarFade:r?.15:0,sphereBlend:P,sphereBlendPhase:E,sphereRegion:v,sphereRegionSeed:e,sphereLayerWeights:X,noiseChoices:[T]})},W=await Promise.allSettled([F(),i.prepareTexturePipelines(d)]);for(let T of W)if(T.status==="rejected")throw T.reason;let I=Math.ceil(x*8/256)*256,Q=I*x;if(w=k.createBuffer({size:Q*(h?3:1),usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),r){let T={seed:e,voroMode:Ot[o]},Z={textureKey:A,sphereBlend:f,sphereRangeWeight:c,sphereLandscape:Rt[s],sphereLandscapeStrength:n,sphereFeatureDensity:p,sphereRegion:v,sphereRegionSeed:e};h&&(G(1),await i.computeToTexture(x,x,T,{...Z,noiseChoices:d.slice(0,1)}),G(2)),await i.computeToTexture(x,x,T,{...Z,noiseChoices:h?d.slice(1):d})}G(0),await w.mapAsync(GPUMapMode.READ);let K=new Uint16Array(w.getMappedRange()),N=x*x,H=I/2,j=Q/2,V=new Float32Array(N),$=h?new Float32Array(2*N):null;for(let T=0;T<x;T++){let Z=T*H,X=T*x;for(let P=0;P<x;P++){let E=$e(K[Z+P*4]);if(!Number.isFinite(E))throw new Error("Planet Studio noise produced a nonfinite height.");V[X+P]=E}if($)for(let P=0;P<x;P++){let E=Z+P*4;$[X+P]=$e(K[j+E]),$[N+X+P]=$e(K[2*j+E])}}let te;if(r){let T=Math.min(x,129),Z=new Uint32Array(T**2),X=t/(T-1);for(let P=0;P<T;P++){let E=Math.round(P*X)*H;for(let U=0;U<T;U++){let L=E+Math.round(U*X)*4,ae=Math.round($e(K[L+1])*255),re=Math.round($e(K[L+2])*255),ie=Math.round($e(K[L+3])*255);Z[P*T+U]=1056964608|ae|re<<8|ie<<16}}te={side:T,values:Z}}w.destroy(),w=null;let J,D=r&&l?.46-.25*Math.min(1,u)**8-.13*Math.max(0,u-1):1;if(r){if(l)for(let X=0;X<V.length;X++)V[X]*=D;let{values:T,...Z}=await y1(V,x,{geology:o,seed:e,variation:f,regions:te,landmarkPatches:y,featureDensity:p,oceanCoverage:m,lunar:l,craterDetail:u,cryoGlaciers:g});V=T,J=Z}else{let T=Math.min(8,Math.floor(t/8));for(let Z of[0,t])for(let X=1;X<=T;X++){let P=Math.abs(Z-X)*x,E=0;for(let L=0;L<t;L++)E+=V[P+L]/t;let U=.9*(1-X/(T+1))**2;for(let L=0;L<x;L++)V[P+L]+=(E-V[P+L])*U}}let R=1/0,O=-1/0,q=0;for(let T of V)R=Math.min(R,T),O=Math.max(O,T),q+=T;if(O-R<1e-7)throw new Error("Planet Studio noise produced a flat heightmap.");let Y={side:x,values:V,min:R,max:O,mean:q/V.length,featureDensity:p};if($){for(let T=0;T<N;T++)$[N+T]=V[T]-$[N+T]*D;Y.guide=$,Y.hostRelief=D}return te?{...Y,regions:te,...J,reliefScale:aa(e)}:Y}finally{w?.destroy(),i.destroyTexturePair(A)}}export{ht as BaseNoise,tt as NoiseComputeBuilder,b1 as bakeStudioPlanetNoise,qt as createStudioPlanetNoise,Ft as sampleStudioPlanetNoise,kt as studioSeed};
