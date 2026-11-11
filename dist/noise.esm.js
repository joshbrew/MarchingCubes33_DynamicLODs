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

fn voro_legacy_cell_or_eval3D(m: Voro3DMetrics, params: NoiseParams, freqOrScale: f32, legacyCellValue: f32) -> f32 {
  let modeValue = voro_eval3D_metrics(m, params, freqOrScale);
  return select(modeValue, legacyCellValue, params.voroMode == VORO_CELL);
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
    let legacyCellValue = centerGrad * edgeGrad;

    let modeValue = voro_legacy_cell_or_eval3D(m, params, max(params.freq, 1e-6), legacyCellValue);
    return select(modeValue * centerGrad, legacyCellValue, params.voroMode == VORO_CELL);
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
    let legacyCellValue = m.cellVal * gradient;

    let modeValue = voro_legacy_cell_or_eval3D(m, params, max(params.freq, 1e-6), legacyCellValue);
    return select(modeValue * gradient, legacyCellValue, params.voroMode == VORO_CELL);
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
    let legacyCellValue = m.cellVal * rippleAmp;

    let modeValue = voro_legacy_cell_or_eval3D(m, params, max(params.freq, 1e-6), legacyCellValue);
    return select(modeValue * rippleAmp, legacyCellValue, params.voroMode == VORO_CELL);
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
    let legacyCellValue = m.cellVal * rippleAmp;

    let modeValue = voro_legacy_cell_or_eval3D(m, params, max(params.freq, 1e-6), legacyCellValue);
    return select(modeValue * rippleAmp, legacyCellValue, params.voroMode == VORO_CELL);
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
    let legacyCellValue = m.cellVal * rippleAmp;

    let modeValue = voro_legacy_cell_or_eval3D(m, params, max(params.freq, 1e-6), legacyCellValue);
    return select(modeValue * rippleAmp, legacyCellValue, params.voroMode == VORO_CELL);
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
  storeRGBA(x,y,0,studio_sphere_relief(dir,raw,broad,texel));
}

fn studio_sphere_relief(dir:vec3<f32>,raw:f32,broad:f32,texel:f32)->vec4<f32>{
  let radial=length(dir.xz);
  let offset=seedOffset3(params.seed);
  var arc=vec2<f32>(0);
  if(options.sphereBlend>0.0){arc=studioIslandArc(dir,broad,texel);}
  let weights=studioProvinces(dir,offset,arc.y);
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
`;var jt=`struct CanyonBed {
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
`;var Kt=`fn studio_wind_dir(seed:u32)->vec3<f32>{
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
`;var $t=`// Closed summit bowls have irregular rims. The same profile can describe
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
`;var Qt=4096;var Dt=2048,Ua=8,et=class{constructor(a,t){this.device=a,this.queue=t,this.maxBufferChunkBytes=8e6,this.entryPoints=["computePerlin","computeBillow","computeAntiBillow","computeRidge","computeAntiRidge","computeRidgedMultifractal","computeRidgedMultifractal2","computeRidgedMultifractal3","computeRidgedMultifractal4","computeAntiRidgedMultifractal","computeAntiRidgedMultifractal2","computeAntiRidgedMultifractal3","computeAntiRidgedMultifractal4","computeFBM","computeFBM2","computeFBM3","computeCellularBM1","computeCellularBM2","computeCellularBM3","computeVoronoiBM1","computeVoronoiBM2","computeVoronoiBM3","computeCellular","computeWorley","computeAntiCellular","computeAntiWorley","computeLanczosBillow","computeLanczosAntiBillow","computeVoronoiTileNoise","computeVoronoiCircleNoise","computeVoronoiCircle2","computeVoronoiFlatShade","computeVoronoiRipple3D","computeVoronoiRipple3D2","computeVoronoiCircularRipple","computeFVoronoiRipple3D","computeFVoronoiCircularRipple","computeRippleNoise","computeFractalRipples","computeHexWorms","computePerlinWorms","computeWhiteNoise","computeBlueNoise","computeSimplex","computeSimplexFBM","computeCurl2D","computeCurlFBM2D","computeDomainWarpFBM1","computeDomainWarpFBM2","computeGaborAnisotropic","computeGaborMagic","computeGaborFlow","computeTerraceNoise","computeFoamNoise","computeTurbulence","computePerlin4D","computeWorley4D","computeAntiWorley4D","computeCellular4D","computeAntiCellular4D","computeBillow4D","computeAntiBillow4D","computeLanczosBillow4D","computeLanczosAntiBillow4D","computeFBM4D","computeVoronoi4D","computeVoronoiBM1_4D","computeVoronoiBM2_4D","computeVoronoiBM3_4D","computeVoronoiBM1_4D_vec","computeVoronoiBM2_4D_vec","computeVoronoiBM3_4D_vec","computeWorleyBM1_4D","computeWorleyBM2_4D","computeWorleyBM3_4D","computeWorleyBM1_4D_vec","computeWorleyBM2_4D_vec","computeWorleyBM3_4D_vec","computeCellularBM1_4D","computeCellularBM2_4D","computeCellularBM3_4D","computeCellularBM1_4D_vec","computeCellularBM2_4D_vec","computeCellularBM3_4D_vec","computeTerraceNoise4D","computeFoamNoise4D","computeTurbulence4D","computeSmokeNoise","computeTerrainNoise","computeHydrologyErosionHeightfield","computeStudioSphereErosion","computeHydrologyGuideField","computeHydrologyDrainageMask","computeGauss5x5","computeNormal","computeNormal8","computeSphereNormal","computeNormalVolume","clearTexture","computeStudioSphereRelief","computeStudioSphereMountainErosion"],this.shaderModule=a.createShaderModule({code:jt+Kt+$t+Zt}),this.bindGroupLayout=a.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:7,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"3d"}},{binding:8,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"3d"}}]}),this.pipelineLayout=a.createPipelineLayout({bindGroupLayouts:[this.bindGroupLayout]}),this.pipelines=new Map,this._texPairs=new Map,this._tid=null,this._tag=new WeakMap,this._default2DKey="__default2d",this._volumeCache=new Map,this.viewA=null,this.viewB=null,this.width=0,this.height=0,this.layers=1,this.isA=!0,this._initBuffers(),this._ensureDummies(),this._ctxMap=new WeakMap}_initBuffers(){this.optionsBuffer?.destroy(),this.paramsBuffer?.destroy(),this.permBuffer?.destroy(),this.nullPosBuffer?.destroy(),this.optionsBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.paramsBuffer=this.device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.permBuffer=this.device.createBuffer({size:512*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.nullPosBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.queue.writeBuffer(this.optionsBuffer,0,new ArrayBuffer(64)),this.queue.writeBuffer(this.paramsBuffer,0,new ArrayBuffer(96)),this.queue.writeBuffer(this.permBuffer,0,new Uint32Array(512))}_ensureDummies(){this._dummy2D_sampleTex||(this._dummy2D_sampleTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy2D_sampleView=this._dummy2D_sampleTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy2D_writeTex||(this._dummy2D_writeTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy2D_writeView=this._dummy2D_writeTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy3D_sampleTex||(this._dummy3D_sampleTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy3D_sampleView=this._dummy3D_sampleTex.createView({dimension:"3d"})),this._dummy3D_writeTex||(this._dummy3D_writeTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy3D_writeView=this._dummy3D_writeTex.createView({dimension:"3d"}))}_getMaxBufferChunkBytes(a){let t=this.device?.limits?.maxBufferSize??268435456,e=Math.max(1024*1024,Math.floor(t*.9)),r=Number.isFinite(a)?Math.floor(a):this.maxBufferChunkBytes;return(!Number.isFinite(r)||r<=0)&&(r=this.maxBufferChunkBytes),r=Math.max(4,r)&-4,Math.min(e,r)}_writeBufferChunked(a,t,e,r,o,l=null){let c=o|0;if(!(c>0))return;let s=this._getMaxBufferChunkBytes(l),n=0;for(;n<c;){let p=Math.min(s,c-n)|0;if(p=p&-4,p<=0)break;this.queue.writeBuffer(a,t+n|0,e,r+n|0,p),n=n+p|0}if(n!==c)throw new Error(`_writeBufferChunked: incomplete write ${n}/${c} bytes`)}async _readBGRA8TextureToRGBA8Pixels(a,t,e,r={}){let o=Math.max(1,t|0),l=Math.max(1,e|0),c=4,s=256,n=o*c,p=Math.ceil(n/s)*s,m=this.device?.limits?.maxBufferSize??256*1024*1024,f=Math.max(1024*1024,Math.floor(m*.9)),u=this._getMaxBufferChunkBytes(r.maxBufferChunkBytes);if(u<p&&(u=p),p>f)throw new Error(`_readBGRA8TextureToRGBA8Pixels: bytesPerRow=${p} exceeds safe buffer cap=${f}`);let y=Math.max(1,Math.floor(u/p))|0,v=new Uint8ClampedArray(o*l*4),d=[],g=this.device.createCommandEncoder();for(let x=0;x<l;x+=y){let M=Math.min(y,l-x)|0,D=p*M|0,z=this.device.createBuffer({size:D,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});g.copyTextureToBuffer({texture:a,origin:{x:0,y:x,z:0}},{buffer:z,bytesPerRow:p,rowsPerImage:M},{width:o,height:M,depthOrArrayLayers:1}),d.push({readBuffer:z,y0:x,rows:M})}if(this.queue.submit([g.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}for(let x of d){let{readBuffer:M,y0:D,rows:z}=x;await M.mapAsync(GPUMapMode.READ);let _=M.getMappedRange(),b=new Uint8Array(_);for(let I=0;I<z;I++){let C=I*p,h=(D+I)*o*4;for(let w=0;w<o;w++){let S=C+w*4,q=h+w*4;v[q+0]=b[S+2],v[q+1]=b[S+1],v[q+2]=b[S+0],v[q+3]=b[S+3]}}M.unmap(),M.destroy()}return v}resize(a){this.maxConfigs=a,this._initBuffers()}setPermTable(a){this.queue.writeBuffer(this.permBuffer,0,a)}setPosBuffer(a){this.posBuffer=a}setInputTextureView(a){try{if(((a?.texture?.usage??0)&GPUTextureUsage.TEXTURE_BINDING)===0){console.warn("setInputTextureView: provided texture view not created with TEXTURE_BINDING; ignoring.");return}}catch{}if(this.inputTextureView=a,this._tid!==null){let t=this._texPairs.get(this._tid);t&&(t.bindGroupDirty=!0)}}setOutputTextureView(a){try{if(((a?.texture?.usage??0)&GPUTextureUsage.STORAGE_BINDING)===0){console.warn("setOutputTextureView: provided texture view not created with STORAGE_BINDING; ignoring.");return}}catch{}if(this.outputTextureView=a,this._tid!==null){let t=this._texPairs.get(this._tid);t&&(t.bindGroupDirty=!0)}}buildPermTable(a=Date.now()){let e=new ht(a).perm,r=new Uint32Array(512);for(let o=0;o<512;o++)r[o]=e[o];this.setPermTable(r)}setOptions(a={}){Array.isArray(a.noiseChoices)?this.noiseChoices=a.noiseChoices:this.noiseChoices||(this.noiseChoices=[0]);let{getGradient:t=0,outputChannel:e=1,baseRadius:r=0,heightScale:o=1,useCustomPos:l=0,ioFlags:c=0,sphereOffset:s=0,sphereOffset2:n=0,sphereBlend:p=0,sphereBlendPhase:m=0,sphereRangeWeight:f=1,spherePolarFade:u=0,sphereLandscape:y=0,sphereLandscapeStrength:v=0,sphereFeatureDensity:d=1}=a;this.useCustomPos=l>>>0;let g=new ArrayBuffer(64),x=new DataView(g);x.setUint32(0,t,!0),x.setUint32(4,this.useCustomPos,!0),x.setUint32(8,e,!0),x.setUint32(12,c>>>0,!0),x.setFloat32(16,r,!0),x.setFloat32(20,o,!0),x.setFloat32(24,Number.isFinite(Number(s))?Number(s):0,!0),x.setFloat32(28,Number.isFinite(Number(n))?Number(n):0,!0),x.setFloat32(32,p,!0),x.setFloat32(36,m,!0),x.setFloat32(40,f,!0),x.setFloat32(44,u,!0),x.setUint32(48,y,!0),x.setFloat32(52,v,!0),x.setFloat32(56,d,!0),this.queue.writeBuffer(this.optionsBuffer,0,g);for(let M of this._texPairs.values())M.bindGroupDirty=!0}setNoiseParams(a={}){let t=a||{},e=this._lastNoiseParams||{},r=Object.prototype.hasOwnProperty,o=(H,Z)=>{let J=r.call(t,H)?t[H]:e[H],te=Number(J);if(Number.isFinite(te))return te;let ee=Number(Z);return Number.isFinite(ee)?ee:0},l=(H,Z)=>{let J=r.call(t,H)?t[H]:e[H],te=Number(J);if(Number.isFinite(te))return te>>>0;let ee=Number(Z);return Number.isFinite(ee)?ee>>>0:0},c=(H,Z)=>{let J=r.call(t,H)?t[H]:e[H],te=Number(J);if(Number.isFinite(te))return te|0;let ee=Number(Z);return Number.isFinite(ee)?ee|0:0},s=(H,Z)=>{let J=r.call(t,H)?t[H]:e[H];return J===void 0?(Z?1:0)>>>0:(J?1:0)>>>0},n=c("seed",e.seed??Date.now()|0),p=o("zoom",e.zoom??1),m=o("freq",e.freq??1),f=Math.max(p||0,1e-6),u=Math.max(m||0,1e-6),y=l("octaves",e.octaves??8),v=s("turbulence",e.turbulence??0),d=o("lacunarity",e.lacunarity??2),g=o("gain",e.gain??.5),x=o("xShift",e.xShift??0),M=o("yShift",e.yShift??0),D=o("zShift",e.zShift??0),z=o("seedAngle",e.seedAngle??0),_=o("exp1",e.exp1??1),b=o("exp2",e.exp2??0),I=o("threshold",e.threshold??.1),C=o("rippleFreq",e.rippleFreq??10),h=o("time",e.time??0),w=o("warpAmp",e.warpAmp??.5),S=o("gaborRadius",e.gaborRadius??4),q=o("terraceStep",e.terraceStep??8),R=s("toroidal",e.toroidal??0),W=l("voroMode",e.voroMode??0),T=o("edgeK",e.edgeK??0),j=o("scalar",e.scalar??1),Q=o("transform",e.transform??0),$=new ArrayBuffer(96),L=new DataView($),X=0;L.setUint32(X+0,n>>>0,!0),L.setFloat32(X+4,f,!0),L.setFloat32(X+8,u,!0),L.setUint32(X+12,y>>>0,!0),L.setFloat32(X+16,d,!0),L.setFloat32(X+20,g,!0),L.setFloat32(X+24,x,!0),L.setFloat32(X+28,M,!0),L.setFloat32(X+32,D,!0),L.setUint32(X+36,v>>>0,!0),L.setFloat32(X+40,z,!0),L.setFloat32(X+44,_,!0),L.setFloat32(X+48,b,!0),L.setFloat32(X+52,I,!0),L.setFloat32(X+56,C,!0),L.setFloat32(X+60,h,!0),L.setFloat32(X+64,w,!0),L.setFloat32(X+68,S,!0),L.setFloat32(X+72,q,!0),L.setUint32(X+76,R>>>0,!0),L.setUint32(X+80,W>>>0,!0),L.setFloat32(X+84,T,!0),L.setFloat32(X+88,j,!0),L.setFloat32(X+92,Q,!0),this.queue.writeBuffer(this.paramsBuffer,0,$),this._lastNoiseParams={seed:n,zoom:f,freq:u,octaves:y,lacunarity:d,gain:g,xShift:x,yShift:M,zShift:D,turbulence:v,seedAngle:z,exp1:_,exp2:b,threshold:I,rippleFreq:C,time:h,warpAmp:w,gaborRadius:S,terraceStep:q,toroidal:R,voroMode:W,edgeK:T,scalar:j,transform:Q};for(let H of this._texPairs.values())H.bindGroupDirty=!0;for(let[H,Z]of this._volumeCache)!Z||!Array.isArray(Z.chunks)||(Z._bindGroupsDirty=!0)}_numOr0(a){let t=Number(a);return Number.isFinite(t)?t:0}_resolveScroll2D(a,t,e,r,o,l){let c=a||{},s=Math.max(1,t|0),n=Math.max(1,e|0),p=Math.max(1,(r??s)|0),m=Math.max(1,(o??n)|0),f=l?p:s,u=l?m:n,y=this._numOr0(c.offsetX)*f,v=this._numOr0(c.offsetY)*u,d=y+this._numOr0(c.offsetXf)+this._numOr0(c.originXf)+this._numOr0(c.originX),g=v+this._numOr0(c.offsetYf)+this._numOr0(c.originYf)+this._numOr0(c.originY);return{baseXf:d,baseYf:g}}_resolveScroll3D(a,t,e,r){let o=a||{},l=Math.max(1,t|0),c=Math.max(1,e|0),s=Math.max(1,r|0),n=this._numOr0(o.offsetX)*l,p=this._numOr0(o.offsetY)*c,m=this._numOr0(o.offsetZ)*s,f=n+this._numOr0(o.offsetXf)+this._numOr0(o.originXf)+this._numOr0(o.originX),u=p+this._numOr0(o.offsetYf)+this._numOr0(o.originYf)+this._numOr0(o.originY),y=m+this._numOr0(o.offsetZf)+this._numOr0(o.originZf)+this._numOr0(o.originZ),v=Math.floor(y)|0;return{baseXf:f,baseYf:u,baseZ:v}}_update2DTileFrames(a,t={}){let e=this._texPairs.get(a);if(!e||!Array.isArray(e.tiles)||e.tiles.length===0)return;let r=Number.isFinite(t.frameFullWidth)?t.frameFullWidth>>>0:e.fullWidth,o=Number.isFinite(t.frameFullHeight)?t.frameFullHeight>>>0:e.fullHeight,l=t.squareWorld||String(t.worldMode||"").toLowerCase()==="crop";if(t.squareWorld){let u=Math.max(r,o,e.fullWidth,e.fullHeight)>>>0;r=u,o=u}let c=e.fullWidth>>>0,s=e.fullHeight>>>0,{baseXf:n,baseYf:p}=this._resolveScroll2D(t,c,s,r,o,l),m=l?1:r/Math.max(1,c),f=l?1:o/Math.max(1,s);for(let u of e.tiles){let y=u?.frames?.[0];if(!y)continue;let v=u.originX|0,d=u.originY|0,g=(v+n)*m,x=(d+p)*f,M=r>0?g/r:0,D=o>0?x/o:0;this._writeFrameUniform(y,{fullWidth:r,fullHeight:o,tileWidth:e.tileWidth,tileHeight:e.tileHeight,originX:v,originY:d,originZ:0,fullDepth:1,tileDepth:1,layerIndex:u.layerIndex|0,layers:e.layers>>>0,originXf:M,originYf:D})}}_update3DChunkFrames(a,t=null,e={}){if(!a||!Array.isArray(a.chunks)||a.chunks.length===0)return;let r=t&&Number.isFinite(t?.w)?t.w>>>0:a.full.w,o=t&&Number.isFinite(t?.h)?t.h>>>0:a.full.h,l=t&&Number.isFinite(t?.d)?t.d>>>0:a.full.d,c=a.full.w>>>0,s=a.full.h>>>0,n=a.full.d>>>0,{baseXf:p,baseYf:m,baseZ:f}=this._resolveScroll3D(e,c,s,n),u=r/Math.max(1,c),y=o/Math.max(1,s);for(let v of a.chunks){v.fb||(v.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));let d=((v.ox|0)+p)*u,g=((v.oy|0)+m)*y,x=r>0?d/r:0,M=o>0?g/o:0,D=(v.oz|0)+f|0;this._writeFrameUniform(v.fb,{fullWidth:r,fullHeight:o,tileWidth:v.w,tileHeight:v.h,originX:v.ox|0,originY:v.oy|0,originZ:D,fullDepth:l,tileDepth:v.d,layerIndex:0,layers:1,originXf:x,originYf:M})}}_compute2DTiling(a,t){let e=Math.min(a,Qt),r=Math.min(t,Qt),o=Math.ceil(a/e),l=Math.ceil(t/r),c=o*l;return{tileW:e,tileH:r,tilesX:o,tilesY:l,layers:c}}_create2DPair(a,t,e=null){let r=this._compute2DTiling(a,t),o=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,l=u=>this.device.createTexture({label:u,size:[r.tileW,r.tileH,r.layers],format:"rgba16float",usage:o}),c={dimension:"2d-array",arrayLayerCount:r.layers},s=e!=null?String(e):String(this._texPairs.size),n=l(`2D texA ${a}x${t}x${r.layers} (${s})`),p=l(`2D texB ${a}x${t}x${r.layers} (${s})`),m=n.createView(c),f=p.createView(c);return m.label=`2D:viewA (${s})`,f.label=`2D:viewB (${s})`,this._tag.set(m,`2D:A (${s})`),this._tag.set(f,`2D:B (${s})`),this._texPairs.set(s,{texA:n,texB:p,viewA:m,viewB:f,fullWidth:a,fullHeight:t,tileWidth:r.tileW,tileHeight:r.tileH,tilesX:r.tilesX,tilesY:r.tilesY,layers:r.layers,isA:!0,tiles:null,bindGroupDirty:!0}),this._tid===null&&this.setActiveTexture(s),s}createShaderTextures(a,t){this._tid!==null&&this._texPairs.has(this._tid)&&this.destroyTexturePair(this._tid);let e=this._create2DPair(a,t);return this.setActiveTexture(e),e}destroyTexturePair(a){let t=String(a),e=this._texPairs.get(t);if(e){try{e.texA.destroy()}catch{}try{e.texB.destroy()}catch{}if(Array.isArray(e.tiles))for(let r of e.tiles){if(Array.isArray(r.frames))for(let o of r.frames)try{o.destroy()}catch{}if(r.posBuf&&r.posBuf!==this.nullPosBuffer)try{r.posBuf.destroy()}catch{}}this._texPairs.delete(t),this._tid===t&&(this._tid=null,this.inputTextureView=null,this.outputTextureView=null,this.viewA=null,this.viewB=null)}}destroyAllTexturePairs(){let a=Array.from(this._texPairs.keys());for(let t of a)this.destroyTexturePair(t)}dispose(){if(!this.disposed){this.disposed=!0,this.destroyAllTexturePairs(),this.destroyAllVolumes();for(let a of[this.optionsBuffer,this.paramsBuffer,this.permBuffer,this.nullPosBuffer,this._dummy2D_sampleTex,this._dummy2D_writeTex,this._dummy3D_sampleTex,this._dummy3D_writeTex,this.blit2DUbo,this.blit3DUbo])a?.destroy();this.pipelines.clear()}}setActiveTexture(a){let t=String(a);if(!this._texPairs.has(t))throw new Error("setActiveTexture: invalid id");this._tid=t;let e=this._texPairs.get(t);this.viewA=e.viewA,this.viewB=e.viewB,this.width=e.tileWidth,this.height=e.tileHeight,this.layers=e.layers,this.inputTextureView=e.isA?e.viewA:e.viewB,this.outputTextureView=e.isA?e.viewB:e.viewA}_buildPosBuffer(a,t,e){if(!(e instanceof Float32Array)||e.byteLength<=0)return this.nullPosBuffer;let r=Math.max(1,Math.floor(a)),o=Math.max(1,Math.floor(t)),c=r*o*4;if(e.length!==c)throw new Error(`_buildPosBuffer: customData length ${e.length} != expected ${c} (width=${r}, height=${o})`);let s=this.device?.limits?.maxBufferSize??2147483648,n=this.device?.limits?.maxStorageBufferBindingSize??134217728,p=Math.floor(Math.min(s,n)*.98);if(e.byteLength>p)throw new Error(`_buildPosBuffer: ${e.byteLength} bytes exceeds the safe storage binding limit ${p} (maxBufferSize=${s}, maxStorageBufferBindingSize=${n}, w=${r}, h=${o})`);let m=this.device.createBuffer({size:e.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});return this._writeBufferChunked(m,0,e.buffer,e.byteOffset,e.byteLength,this.maxBufferChunkBytes),m}_writeFrameUniform(a,t){let e=new ArrayBuffer(64),r=new DataView(e);r.setUint32(0,t.fullWidth>>>0,!0),r.setUint32(4,t.fullHeight>>>0,!0),r.setUint32(8,t.tileWidth>>>0,!0),r.setUint32(12,t.tileHeight>>>0,!0),r.setInt32(16,t.originX|0,!0),r.setInt32(20,t.originY|0,!0),r.setInt32(24,t.originZ|0,!0),r.setUint32(28,t.fullDepth>>>0,!0),r.setUint32(32,t.tileDepth>>>0,!0),r.setInt32(36,t.layerIndex|0,!0),r.setUint32(40,t.layers>>>0,!0),r.setUint32(44,0,!0),r.setFloat32(48,t.originXf??0,!0),r.setFloat32(52,t.originYf??0,!0),r.setFloat32(56,0,!0),r.setFloat32(60,0,!0),this.queue.writeBuffer(a,0,e)}_create2DTileBindGroups(a,t={}){let e=this._texPairs.get(a);if(!e)throw new Error("_create2DTileBindGroups: invalid tid");let r=((t.useCustomPos??0)|0)>>>0,o=r===2||r===3,l=r!==0&&!o,c=l&&t.customData instanceof Float32Array?t.customData:null,s=!!c,n=Array.isArray(e.tiles)&&e.tiles.some(f=>f&&f.posIsCustom),p=l&&!s;if(!s&&n&&!p&&(e.bindGroupDirty=!0),Array.isArray(e.tiles)&&!e.bindGroupDirty&&!s)return;let m=[];for(let f=0;f<e.tilesY;f++)for(let u=0;u<e.tilesX;u++){let y=f*e.tilesX+u,v=u*e.tileWidth,d=f*e.tileHeight,g=e.tiles&&e.tiles[y]||null,x=this.nullPosBuffer,M=!1;if(s)x=this._buildPosBuffer(e.tileWidth,e.tileHeight,c),M=x!==this.nullPosBuffer;else if(p&&g&&g.posBuf&&g.posIsCustom)x=g.posBuf,M=!0;else{if(p)throw new Error("_create2DTileBindGroups: useCustomPos=1 was requested without customData and no reusable custom position buffer exists.");if(!o&&g&&g.posBuf&&!g.posIsCustom)x=g.posBuf,M=!1;else if(x=this.nullPosBuffer,M=!1,g&&g.posBuf&&g.posIsCustom)try{g.posBuf.destroy()}catch{}}let D;g&&g.frames&&g.frames[0]?D=g.frames[0]:D=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let z=Number.isFinite(t.frameFullWidth)?t.frameFullWidth>>>0:e.fullWidth,_=Number.isFinite(t.frameFullHeight)?t.frameFullHeight>>>0:e.fullHeight,b=t.squareWorld||String(t.worldMode||"").toLowerCase()==="crop";if(t.squareWorld){let S=Math.max(z,_,e.fullWidth,e.fullHeight)>>>0;z=S,_=S}let I,C;if(b)I=v,C=d;else{let S=z/e.fullWidth,q=_/e.fullHeight;I=v*S,C=d*q}this._writeFrameUniform(D,{fullWidth:z,fullHeight:_,tileWidth:e.tileWidth,tileHeight:e.tileHeight,originX:v,originY:d,originZ:0,fullDepth:1,tileDepth:1,layerIndex:y,layers:e.layers,originXf:I,originYf:C});let h=g?.bgs?.[0]?.bgA??null,w=g?.bgs?.[0]?.bgB??null;(!h||!w||e.bindGroupDirty)&&(h=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:e.viewA},{binding:4,resource:e.viewB},{binding:5,resource:{buffer:x}},{binding:6,resource:{buffer:D}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]}),w=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:e.viewB},{binding:4,resource:e.viewA},{binding:5,resource:{buffer:x}},{binding:6,resource:{buffer:D}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]})),m.push({layerIndex:y,originX:v,originY:d,frames:[D],posBuf:x,posIsCustom:M,bgs:[{bgA:h,bgB:w}]})}e.tiles=m,e.bindGroupDirty=!1,this._tid===a&&(this._tiles=m)}async _runPipelines(a,t,e,r,o,l,c=1){let s=a,n=t,p=Array.isArray(l),m=0,f=this.device.createCommandEncoder(),u=f.beginComputePass();for(let y of this.noiseChoices){let v=typeof y=="number"?this.entryPoints[y]:y,d=this.pipelines.get(v);d||(d=this.device.createComputePipeline({layout:this.pipelineLayout,compute:{module:this.shaderModule,entryPoint:v}}),this.pipelines.set(v,d)),p&&this.setNoiseParams(l[m++]),u.setPipeline(d),u.setBindGroup(0,s),u.dispatchWorkgroups(Math.ceil(e/8),Math.ceil(r/8),c),[s,n]=[n,s]}return u.end(),this.queue.submit([f.finish()]),n}async computeToTexture(a,t,e={},r={}){let o=a|0,l=t|0;if(!(o>0&&l>0))throw new Error(`computeToTexture: invalid size ${a}x${t}`);let c=this._get2DKey(r),s=this._texPairs.get(c);s?(s.fullWidth!==o||s.fullHeight!==l)&&(this.destroyTexturePair(c),this._create2DPair(o,l,c)):this._create2DPair(o,l,c),this.setActiveTexture(c);let n=this._texPairs.get(c);if(!n)throw new Error("computeToTexture: missing pair after ensure");e&&!Array.isArray(e)&&this.setNoiseParams(e);let p=r||{},m=((p.useCustomPos??0)|0)>>>0,f=m===2||m===3,u=m!==0&&!f,y=u&&p.customData instanceof Float32Array?p.customData:null,v=y?1:f?m:u?1:0;this.setOptions({...p,ioFlags:0,useCustomPos:v});let d={...p,useCustomPos:v,customData:y};(!n.tiles||n.bindGroupDirty||y)&&this._create2DTileBindGroups(c,d),this._update2DTileFrames(c,d);let g=n.isA,x=null,M=null;for(let z of n.tiles){let{bgA:_,bgB:b}=z.bgs[0],I=x?x===_?_:b:g?_:b,C=I===_?b:_;x=await this._runPipelines(I,C,n.tileWidth,n.tileHeight,1,e,1),M={bgA:_,bgB:b}}let D=x===M.bgB;return n.isA=D,this.setActiveTexture(c),this.getCurrentView(c)}_get2DKey(a){let t=a&&a.textureKey!==void 0&&a.textureKey!==null?String(a.textureKey):"";return t&&t.length?t:this._default2DKey}get2DView(a){let t=String(a),e=this._texPairs.get(t);return e?e.isA?e.viewA:e.viewB:null}getCurrentView(a=null){let t=a!=null?String(a):this._tid,e=this._texPairs.get(t);return e?e.isA?e.viewA:e.viewB:null}getCurrentTextureResource(a=null){let t=a!=null?String(a):this._tid,e=this._texPairs.get(t);return e?{texture:e.isA?e.texA:e.texB,view:e.isA?e.viewA:e.viewB,width:e.fullWidth,height:e.fullHeight,layers:e.layers,format:"rgba16float"}:null}_compute3DTiling(a,t,e){let r=Math.min(a,Dt),o=Math.min(t,Dt),l=this.device?.limits?.maxBufferSize??256*1024*1024,c=r*o*Ua,s=Math.max(1,Math.floor(l*.8/Math.max(1,c))),n=Math.min(e,Dt,s),p=Math.ceil(a/r),m=Math.ceil(t/o),f=Math.ceil(e/n);return{tw:r,th:o,td:n,nx:p,ny:m,nz:f}}_create3DChunks(a,t,e){let r=this._compute3DTiling(a,t,e),o=[],l=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST;for(let c=0;c<r.nz;c++)for(let s=0;s<r.ny;s++)for(let n=0;n<r.nx;n++){let p=n*r.tw,m=s*r.th,f=c*r.td,u=this.device.createTexture({size:{width:r.tw,height:r.th,depthOrArrayLayers:r.td},dimension:"3d",format:"rgba16float",usage:l}),y=this.device.createTexture({size:{width:r.tw,height:r.th,depthOrArrayLayers:r.td},dimension:"3d",format:"rgba16float",usage:l}),v=u.createView({dimension:"3d"}),d=y.createView({dimension:"3d"});u.label=`3D texA ${r.tw}x${r.th}x${r.td} @ (${n},${s},${c})`,y.label=`3D texB ${r.tw}x${r.th}x${r.td} @ (${n},${s},${c})`,v.label=`3D:viewA[${n},${s},${c}]`,d.label=`3D:viewB[${n},${s},${c}]`,this._tag.set(v,`3D:A[${n},${s},${c}]`),this._tag.set(d,`3D:B[${n},${s},${c}]`),o.push({texA:u,texB:y,viewA:v,viewB:d,ox:p,oy:m,oz:f,w:r.tw,h:r.th,d:r.td,isA:!0,fb:null,posBuf:null,bgA:null,bgB:null})}return{chunks:o,tile:{w:r.tw,h:r.th,d:r.td},full:{w:a,h:t,d:e},grid:{nx:r.nx,ny:r.ny,nz:r.nz}}}_destroy3DSet(a){if(a)for(let t of a.chunks){try{t.texA.destroy()}catch{}try{t.texB.destroy()}catch{}if(t.viewA=null,t.viewB=null,t.bgA=null,t.bgB=null,t.fb){try{t.fb.destroy()}catch{}t.fb=null}if(t.posBuf&&t.posBuf!==this.nullPosBuffer){try{t.posBuf.destroy()}catch{}t.posBuf=null}}}destroyAllVolumes(){for(let[a,t]of this._volumeCache)this._destroy3DSet(t),this._volumeCache.delete(a)}get3DView(a){let t=this._volumeCache.get(String(a));if(!t)return null;let e=t.chunks.map(r=>r.isA?r.viewA:r.viewB);return e.length===1?e[0]:{views:e,meta:{full:t.full,tile:t.tile,grid:t.grid}}}destroyVolume(a){let t=String(a),e=this._volumeCache.get(t);e&&(this._destroy3DSet(e),this._volumeCache.delete(t))}_getOrCreate3DVolume(a,t,e,r=null,o=null){let l=r?String(r):`${a}x${t}x${e}`,c=this._volumeCache.get(l);if(c)return c;c=this._create3DChunks(a,t,e);for(let s of c.chunks){s.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=o&&Number.isFinite(o?.w)?o.w>>>0:c.full.w,p=o&&Number.isFinite(o?.h)?o.h>>>0:c.full.h,m=o&&Number.isFinite(o?.d)?o.d>>>0:c.full.d,f=n/c.full.w,u=p/c.full.h,y=s.ox*f,v=s.oy*u;this._writeFrameUniform(s.fb,{fullWidth:n,fullHeight:p,tileWidth:s.w,tileHeight:s.h,originX:s.ox,originY:s.oy,originZ:s.oz,fullDepth:m,tileDepth:s.d,layerIndex:0,layers:1,originXf:y,originYf:v});let d=this._buildPosBuffer(s.w,s.h,null);s.posBuf=d;try{s.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:d}},{binding:6,resource:{buffer:s.fb}},{binding:7,resource:s.viewA},{binding:8,resource:s.viewB}]}),s.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:s.posBuf}},{binding:6,resource:{buffer:s.fb}},{binding:7,resource:s.viewB},{binding:8,resource:s.viewA}]})}catch(g){throw new Error(`_getOrCreate3DVolume: createBindGroup failed: ${g?.message||g}`)}}return c._bindGroupsDirty=!1,this._volumeCache.set(l,c),c}_recreate3DBindGroups(a,t=null){if(!a||!Array.isArray(a.chunks))return;let e=t&&Number.isFinite(t.w)?t.w>>>0:a.full.w,r=t&&Number.isFinite(t.h)?t.h>>>0:a.full.h,o=t&&Number.isFinite(t.d)?t.d>>>0:a.full.d;for(let l of a.chunks){if(!l.fb){l.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=e/a.full.w,p=r/a.full.h,m=l.ox*n,f=l.oy*p;this._writeFrameUniform(l.fb,{fullWidth:e,fullHeight:r,tileWidth:l.w,tileHeight:l.h,originX:l.ox,originY:l.oy,originZ:l.oz,fullDepth:o,tileDepth:l.d,layerIndex:0,layers:1,originXf:m,originYf:f})}l.posBuf||(l.posBuf=this._buildPosBuffer(l.w,l.h,null));let c=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:l.posBuf}},{binding:6,resource:{buffer:l.fb}},{binding:7,resource:l.viewA},{binding:8,resource:l.viewB}],s=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:l.posBuf}},{binding:6,resource:{buffer:l.fb}},{binding:7,resource:l.viewB},{binding:8,resource:l.viewA}];try{l.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:c}),l.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:s})}catch(n){throw new Error(`_recreate3DBindGroups: failed to create bind groups: ${n?.message||n}`)}}a._bindGroupsDirty=!1}async computeToTexture3D(a,t,e,r={},o={}){let l=a|0,c=t|0,s=e|0;if(!(l>0&&c>0&&s>0))throw new Error(`computeToTexture3D: invalid size ${a}x${t}x${e}`);r&&!Array.isArray(r)&&this.setNoiseParams(r);let n=o||{};this.setOptions({...n,ioFlags:3,useCustomPos:n.useCustomPos??this.useCustomPos});let p=o&&(Number.isFinite(o.frameFullWidth)||Number.isFinite(o.frameFullHeight)||Number.isFinite(o.frameFullDepth))?{w:Number.isFinite(o.frameFullWidth)?o.frameFullWidth>>>0:l,h:Number.isFinite(o.frameFullHeight)?o.frameFullHeight>>>0:c,d:Number.isFinite(o.frameFullDepth)?o.frameFullDepth>>>0:s}:null,m=this._getOrCreate3DVolume(l,c,s,o.id,p);if(!m)throw new Error("computeToTexture3D: failed to create or retrieve volume");(m._bindGroupsDirty||!m.chunks[0].bgA||!m.chunks[0].bgB)&&this._recreate3DBindGroups(m,p),this._update3DChunkFrames(m,p,o);let f=null;for(let y of m.chunks){let v=y.isA?y.bgA:y.bgB,d=y.isA?y.bgB:y.bgA;if(!v||!d)throw new Error("computeToTexture3D: missing bind groups (volume not initialized correctly)");f=await this._runPipelines(v,d,y.w,y.h,y.d,r,y.d),y.isA=f===y.bgB}let u=m.chunks.map(y=>y.isA?y.viewA:y.viewB);return u.length===1?u[0]:{views:u,meta:{full:m.full,tile:m.tile,grid:m.grid}}}configureCanvas(a){let t=navigator.gpu.getPreferredCanvasFormat&&navigator.gpu.getPreferredCanvasFormat()||"bgra8unorm",e=a.getContext("webgpu");e.configure({device:this.device,format:t,alphaMode:"opaque",size:[a.width,a.height]}),this._ctxMap.set(a,{ctx:e,size:[a.width,a.height]})}initBlitRender(){this.sampler||(this.sampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"})),this.bgl2D||(this.bgl2D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline2D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl2D]}),vertex:{module:this.device.createShaderModule({code:St}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:St}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit2DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),this.bgl3D||(this.bgl3D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"3d"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline3D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl3D]}),vertex:{module:this.device.createShaderModule({code:Pt}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:Pt}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit3DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}))}_renderCommonCanvasSetup(a,t){let e="bgra8unorm",r=this._ctxMap.get(a);if(r){let c=a.width|0,s=a.height|0;(r.size[0]!==c||r.size[1]!==s)&&(r.size=[c,s],r.ctx.configure({device:this.device,format:e,alphaMode:"opaque",size:r.size}))}else{let c=a.getContext("webgpu"),s=[a.width|0,a.height|0];c.configure({device:this.device,format:e,alphaMode:"opaque",size:s}),r={ctx:c,size:s},this._ctxMap.set(a,r)}let o=this.device.createCommandEncoder(),l=o.beginRenderPass({colorAttachments:[{view:r.ctx.getCurrentTexture().createView(),loadOp:t?"clear":"load",clearValue:{r:0,g:0,b:0,a:1},storeOp:"store"}]});return{enc:o,pass:l,ctxEntry:r}}renderTextureToCanvas(a,t,e={}){let{layer:r=0,channel:o=0,preserveCanvasSize:l=!0,clear:c=!0}=e;if(this.initBlitRender(),!l)try{let f=a.texture;f&&typeof f.width=="number"&&typeof f.height=="number"&&(t.width=f.width,t.height=f.height)}catch{}let s=new Uint32Array([r>>>0,o>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,s.buffer,s.byteOffset,s.byteLength);let n=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:a},{binding:2,resource:{buffer:this.blit2DUbo}}]}),{enc:p,pass:m}=this._renderCommonCanvasSetup(t,c);m.setPipeline(this.pipeline2D),m.setBindGroup(0,n),m.draw(6,1,0,0),m.end(),this.queue.submit([p.finish()])}renderTexture3DSliceToCanvas(a,t,e={}){let{depth:r,slice:o=0,zNorm:l=null,channel:c=0,chunk:s=0,preserveCanvasSize:n=!0,clear:p=!0}=e;this.initBlitRender();let m,f;if(a&&a.views&&Array.isArray(a.views)?(m=a.views[Math.max(0,Math.min(s|0,a.views.length-1))],f=a.meta?.tile?.d??r):(m=a,f=r),!m||!f)throw new Error("renderTexture3DSliceToCanvas: need a 3D view and its depth");if(!n)try{let M=m.texture;M&&typeof M.width=="number"&&typeof M.height=="number"&&(t.width=M.width,t.height=M.height)}catch{}let u=l??(Math.min(Math.max(o,0),f-1)+.5)/f;u=Math.min(Math.max(u,0),1);let y=new ArrayBuffer(16),v=new DataView(y);v.setFloat32(0,u,!0),v.setUint32(4,c>>>0,!0),v.setUint32(8,0,!0),v.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,y);let d=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:m},{binding:2,resource:{buffer:this.blit3DUbo}}]}),{enc:g,pass:x}=this._renderCommonCanvasSetup(t,p);x.setPipeline(this.pipeline3D),x.setBindGroup(0,d),x.draw(6,1,0,0),x.end(),this.queue.submit([g.finish()])}setExportBackground(a="black"){this.exportBackground=a}_resolveExportBackground(a){let t=a===void 0?this.exportBackground:a;if(t==null)return{r:0,g:0,b:0,a:1,transparent:!1};if(typeof t=="string"){let r=t.trim().toLowerCase();if(r==="transparent")return{r:0,g:0,b:0,a:0,transparent:!0};if(r==="black")return{r:0,g:0,b:0,a:1,transparent:!1};if(r==="white")return{r:1,g:1,b:1,a:1,transparent:!1};if(r[0]==="#")return this._parseHexBackground(r)}let e=r=>{let o=Number(r);if(!Number.isFinite(o))return 0;let l=o>1?o/255:o;return Math.min(Math.max(l,0),1)};if(Array.isArray(t)){let r=e(t[0]),o=e(t[1]),l=e(t[2]),c=t.length>=4?e(t[3]):1;return{r,g:o,b:l,a:c,transparent:c<=0}}if(typeof t=="object"){let r=e(t.r),o=e(t.g),l=e(t.b),c=t.a===void 0?1:e(t.a);return{r,g:o,b:l,a:c,transparent:c<=0}}return{r:0,g:0,b:0,a:1,transparent:!1}}_parseHexBackground(a){let t=String(a).trim().replace(/^#/,""),e=f=>f+f,r=0,o=0,l=0,c=255;if(t.length===3||t.length===4)r=parseInt(e(t[0]),16),o=parseInt(e(t[1]),16),l=parseInt(e(t[2]),16),t.length===4&&(c=parseInt(e(t[3]),16));else if(t.length===6||t.length===8)r=parseInt(t.slice(0,2),16),o=parseInt(t.slice(2,4),16),l=parseInt(t.slice(4,6),16),t.length===8&&(c=parseInt(t.slice(6,8),16));else return{r:0,g:0,b:0,a:1,transparent:!1};let s=r/255,n=o/255,p=l/255,m=c/255;return{r:s,g:n,b:p,a:m,transparent:m<=0}}_applyExportBackground(a,t){if(!a||!t||t.transparent)return;let e=Math.round(t.r*255),r=Math.round(t.g*255),o=Math.round(t.b*255),l=Math.round((t.a??1)*255);if(l<=0)return;let c=a.length|0;if(l>=255){for(let s=0;s<c;s+=4){let n=a[s+3]|0;if(n===255)continue;if(n===0){a[s+0]=e,a[s+1]=r,a[s+2]=o,a[s+3]=255;continue}let p=255-n;a[s+0]=(a[s+0]*n+e*p)/255|0,a[s+1]=(a[s+1]*n+r*p)/255|0,a[s+2]=(a[s+2]*n+o*p)/255|0,a[s+3]=255}return}for(let s=0;s<c;s+=4){let n=a[s+0]|0,p=a[s+1]|0,m=a[s+2]|0,f=a[s+3]|0,u=f+l*(255-f)/255|0;if(u<=0){a[s+0]=0,a[s+1]=0,a[s+2]=0,a[s+3]=0;continue}let y=e*l|0,v=r*l|0,d=o*l|0,g=n*f|0,x=p*f|0,M=m*f|0,D=255-f|0,z=g+y*D/255|0,_=x+v*D/255|0,b=M+d*D/255|0;a[s+0]=Math.min(255,Math.max(0,z*255/u|0)),a[s+1]=Math.min(255,Math.max(0,_*255/u|0)),a[s+2]=Math.min(255,Math.max(0,b*255/u|0)),a[s+3]=Math.min(255,Math.max(0,u))}}_forceOpaqueAlpha(a){let t=a.length|0;for(let e=3;e<t;e+=4)a[e]=255}async export2DTextureToPNGBlob(a,t,e,r={}){if(!a)throw new Error("export2DTextureToPNGBlob: textureView is required");let o=Math.max(1,t|0),l=Math.max(1,e|0),c=r.layer??0,s=r.channel??0,n=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let m=this.device.createTexture({size:[o,l,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),f=new Uint32Array([c>>>0,s>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,f.buffer,f.byteOffset,f.byteLength);let u=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:a},{binding:2,resource:{buffer:this.blit2DUbo}}]}),y=this.device.createCommandEncoder(),v=y.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});if(v.setPipeline(this.pipeline2D),v.setBindGroup(0,u),v.draw(6,1,0,0),v.end(),this.queue.submit([y.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let d=await this._readBGRA8TextureToRGBA8Pixels(m,o,l,{maxBufferChunkBytes:r.maxBufferChunkBytes??this.maxBufferChunkBytes});m.destroy();let g=r.useAlphaForBackground===!0;n.transparent||g?this._applyExportBackground(d,n):this._forceOpaqueAlpha(d);let x=document.createElement("canvas");x.width=o,x.height=l;let M=x.getContext("2d");if(!M)throw new Error("export2DTextureToPNGBlob: unable to get 2D context");return M.putImageData(new ImageData(d,o,l),0,0),await new Promise((z,_)=>{x.toBlob(b=>{b?z(b):_(new Error("export2DTextureToPNGBlob: toBlob returned null"))},"image/png")})}async exportCurrent2DToPNGBlob(a,t,e={}){let r=this.getCurrentView();if(!r)throw new Error("exportCurrent2DToPNGBlob: no active 2D texture view");return this.export2DTextureToPNGBlob(r,a,t,e)}async export3DSliceToPNGBlob(a,t,e,r={}){if(!a)throw new Error("export3DSliceToPNGBlob: target is required");let o=Math.max(1,t|0),l=Math.max(1,e|0),{depth:c,slice:s=0,zNorm:n=null,channel:p=0,chunk:m=0}=r;if(!c||c<=0)throw new Error("export3DSliceToPNGBlob: depth must be provided and > 0");let f=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let u,y;if(a&&a.views&&Array.isArray(a.views)){let L=Math.max(0,Math.min(m|0,a.views.length-1));u=a.views[L],y=a.meta?.tile?.d??c}else u=a,y=c;if(!u||!y)throw new Error("export3DSliceToPNGBlob: need a 3D view and its depth");let v=n??(Math.min(Math.max(s,0),y-1)+.5)/y;v=Math.min(Math.max(v,0),1);let g=this.device.createTexture({size:[o,l,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),x=new ArrayBuffer(16),M=new DataView(x);M.setFloat32(0,v,!0),M.setUint32(4,p>>>0,!0),M.setUint32(8,0,!0),M.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,x);let D=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:u},{binding:2,resource:{buffer:this.blit3DUbo}}]}),z=this.device.createCommandEncoder(),_=z.beginRenderPass({colorAttachments:[{view:g.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});_.setPipeline(this.pipeline3D),_.setBindGroup(0,D),_.draw(6,1,0,0),_.end();let b=4,I=256,C=o*b,h=Math.ceil(C/I)*I,w=h*l,S=this.device.createBuffer({size:w,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});z.copyTextureToBuffer({texture:g},{buffer:S,bytesPerRow:h,rowsPerImage:l},{width:o,height:l,depthOrArrayLayers:1}),this.queue.submit([z.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await S.mapAsync(GPUMapMode.READ);let q=S.getMappedRange(),R=new Uint8Array(q),W=new Uint8ClampedArray(o*l*b),T=0;for(let L=0;L<l;L++){let X=L*h;for(let H=0;H<o;H++){let Z=X+H*4;W[T++]=R[Z+2],W[T++]=R[Z+1],W[T++]=R[Z+0],W[T++]=R[Z+3]}}S.unmap(),S.destroy(),g.destroy(),this._applyExportBackground(W,f);let j=document.createElement("canvas");j.width=o,j.height=l;let Q=j.getContext("2d");if(!Q)throw new Error("export3DSliceToPNGBlob: unable to get 2D context");return Q.putImageData(new ImageData(W,o,l),0,0),await new Promise((L,X)=>{j.toBlob(H=>{H?L(H):X(new Error("export3DSliceToPNGBlob: toBlob returned null"))},"image/png")})}async _render3DSliceToRGBA8Pixels(a,t,e,r,o=0,l=null){if(!a)throw new Error("_render3DSliceToRGBA8Pixels: view3D is required");let c=Math.max(1,t|0),s=Math.max(1,e|0);this.initBlitRender();let n=Math.min(Math.max(Number(r)||0,0),1),m=this.device.createTexture({size:[c,s,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),f=new ArrayBuffer(16),u=new DataView(f);u.setFloat32(0,n,!0),u.setUint32(4,o>>>0,!0),u.setUint32(8,0,!0),u.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,f);let y=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:a},{binding:2,resource:{buffer:this.blit3DUbo}}]}),v=this.device.createCommandEncoder(),d=v.beginRenderPass({colorAttachments:[{view:m.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});d.setPipeline(this.pipeline3D),d.setBindGroup(0,y),d.draw(6,1,0,0),d.end();let g=4,x=256,M=c*g,D=Math.ceil(M/x)*x,z=D*s,_=this.device.createBuffer({size:z,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});v.copyTextureToBuffer({texture:m},{buffer:_,bytesPerRow:D,rowsPerImage:s},{width:c,height:s,depthOrArrayLayers:1}),this.queue.submit([v.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await _.mapAsync(GPUMapMode.READ);let b=_.getMappedRange(),I=new Uint8Array(b),C=new Uint8ClampedArray(c*s*g),h=0;for(let w=0;w<s;w++){let S=w*D;for(let q=0;q<c;q++){let R=S+q*4;C[h++]=I[R+2],C[h++]=I[R+1],C[h++]=I[R+0],C[h++]=I[R+3]}}return _.unmap(),_.destroy(),m.destroy(),l&&this._applyExportBackground(C,l),C}async export3DTilesetToPNGBlob(a,t,e,r={}){if(!a)throw new Error("export3DTilesetToPNGBlob: target is required");let o=Math.max(1,t|0),l=Math.max(1,(e??t)|0),{depth:c,channel:s=0,chunk:n=0,tilesAcross:p=16,tilesDown:m=null,startSlice:f=0,sliceCount:u=null}=r,y=this._resolveExportBackground(r.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let v,d;if(a&&a.views&&Array.isArray(a.views)){let S=Math.max(0,Math.min(n|0,a.views.length-1));v=a.views[S],d=a.meta?.tile?.d??c}else v=a,d=c;if(!v)throw new Error("export3DTilesetToPNGBlob: missing 3D view");if(!d||d<=0)throw new Error("export3DTilesetToPNGBlob: depth must be provided and > 0");let g=Math.max(1,p|0),x=m!=null?Math.max(1,m|0):Math.ceil(d/g),M=Math.min(Math.max(f|0,0),d-1),D=u!=null?Math.max(0,u|0):d-M,z=o*g,_=l*x,b=new Uint8ClampedArray(z*_*4),I=Math.min(d,M+D);for(let S=M;S<I;S++){let q=S-M,R=q%g,W=q/g|0;if(W>=x)break;let T=(S+.5)/d,j=await this._render3DSliceToRGBA8Pixels(v,o,l,T,s,y),Q=R*o,$=W*l;for(let L=0;L<l;L++){let X=L*o*4,H=(($+L)*z+Q)*4;b.set(j.subarray(X,X+o*4),H)}}let C=document.createElement("canvas");C.width=z,C.height=_;let h=C.getContext("2d");if(!h)throw new Error("export3DTilesetToPNGBlob: unable to get 2D context");return h.putImageData(new ImageData(b,z,_),0,0),await new Promise((S,q)=>{C.toBlob(R=>{R?S(R):q(new Error("export3DTilesetToPNGBlob: toBlob returned null"))},"image/png")})}},ht=class{constructor(a=Date.now()){a<1e7&&(a*=1e7),this.seedN=a,this.seedK=a,this.perm=new Uint8Array(512),this.seed(a)}seed(a){let t=this.xorshift(a);for(let e=0;e<256;e++)this.perm[e]=e;for(let e=255;e>0;e--){let r=Math.floor(t()*(e+1));[this.perm[e],this.perm[r]]=[this.perm[r],this.perm[e]]}for(let e=0;e<256;e++)this.perm[e+256]=this.perm[e]}setSeed(a){this.seedN=a,this.seed(a),this.resetSeed()}random(a,t,e){let r;return typeof e=="number"?r=this.perm[(a&255)+this.perm[(t&255)+this.perm[e&255]]]&255:r=this.perm[(a&255)+this.perm[t&255]]&255,this.perm[r]/255*2-1}seededRandom(){this.seedK+=Math.E;let a=1e9*Math.sin(this.seedK);return a-Math.floor(a)}resetSeed(){this.seedK=this.seedN}xorshift(a){let t=a;return function(){return t^=t<<13,t^=t>>17,t^=t<<5,(t<0?1+~t:t)/4294967295}}dot(a,t=0,e=0,r=0){return a[0]*t+a[1]*e+a[2]*r}};function dt(i,a,t){let e=Math.min(1,Math.max(0,(t-i)/(a-i)));return e*e*(3-2*e)}function tt(i,a){return dt(.0175,.0805,Math.min(i,a-i)/a)}function Bt(i,a,t){let e=i.length,r=2*t+1,o=0;for(let l=-t;l<=t;l++)o+=i[(l+e)%e];for(let l=0;l<e;l++)a[l]=o/r,o+=i[(l+t+1)%e]-i[(l-t+e)%e]}function At(i,a){let t=a-1;if(t<64)return;let e=Math.floor(Math.asin(.25)/Math.PI*t),r=new Float32Array(t),o=new Float32Array(t),l=Float64Array.from({length:t},(f,u)=>Math.cos(u*2*Math.PI/t)),c=Float64Array.from({length:t},(f,u)=>Math.sin(u*2*Math.PI/t)),s=Math.max(2,Math.round(t*.005)),n=Math.max(1,Math.round(t*.0035)),p=[1,4,6,4,1],m=new Float32Array((e+n*2+1)*a);for(let f of[0,t]){let u=f===0?1:-1;for(let _=1;_<=e;_++){let b=Math.sin(Math.PI*_/t),I=1-dt(.071,.25,b),C=Math.min(Math.floor(.23*t),Math.max(1,Math.round((1.5+2.3*I)/(2*b)))),h=(f+u*_)*a;r.set(i.subarray(h,h+t));let w=0,S=0;for(let T=0;T<t;T++)w+=r[T]*l[T],S+=r[T]*c[T];Bt(r,o,C),Bt(o,r,C),Bt(r,o,C);let q=2*C+1,W=2*(1-(Math.sin(q*Math.PI/t)/(q*Math.sin(Math.PI/t)))**3)/t;for(let T=0;T<t;T++){let j=W*(w*l[T]+S*c[T]);i[h+T]+=I*(o[T]+j-i[h+T])}i[h+t]=i[h]}for(let _=0;_<=e+n*2;_++){let b=(f+u*_)*a;m.set(i.subarray(b,b+a),_*a)}let y=0;for(let _ of[n,2*n]){let b=0;for(let I=0;I<t;I++)b+=m[_*a+I];y+=(_===n?8:2)*b/t}i.fill((6*m[0]+y)/16,f*a,(f+1)*a);let v=Math.floor(t/2),d=t%2;for(let _=1;_<=e;_++){let b=Math.sin(Math.PI*_/t),I=1-dt(.038,.21,b);if(I<=0)break;let C=(f+u*_)*a;for(let h=0;h<t;h++){let w=0;for(let S=0;S<5;S++){let q=_+(S-2)*n,R=Math.abs(q)*a,W=q<0?(h+v)%t:h,T=m[R+W];w+=p[S]*(q<0&&d?(T+m[R+(W+1)%t])*.5:T)}i[C+h]+=I*(w/16-i[C+h])}i[C+t]=i[C]}let g=i[f*a],x=(f+u*s)*a,M=0,D=0,z=0;for(let _=0;_<t;_++){let b=i[x+_]-g;M+=b,D+=b*l[_],z+=b*c[_]}M/=t,D*=2/t,z*=2/t;for(let _=1;_<s;_++){let b=Math.sin(Math.PI*_/t)/Math.sin(Math.PI*s/t),I=1-dt(.45,1,b),C=(f+u*_)*a;for(let h=0;h<t;h++){let w=g+(D*l[h]+z*c[h])*b+M*b*b;i[C+h]+=I*(w-i[C+h])}i[C+t]=i[C]}}}function Jt(i,a,t=1){let e=a-1,r=e*(a-2),o=new Int32Array(r).fill(-1),l=new Int32Array(r).fill(-1),c=new Uint8Array(r),s=new Float32Array(r),n=new Float32Array(r),p=new Float32Array(r),m=new Uint32Array(r),f=b=>(b+e)%e,u=Float64Array.from({length:a},(b,I)=>Math.sin(Math.PI*I/e));for(let b=1;b<e;b++){let I=u[b],C=Math.max(.06,2*I),h=1/Math.hypot(1,C);for(let w=0;w<e;w++){let S=(b-1)*e+w,q=i[b*a+w];p[S]=I;let R=-1,W=-1,T=0,j=0;for(let Q=-1;Q<=1;Q++){let $=b+Q;if(!($<=0||$>=e))for(let L=-1;L<=1;L++){if(!L&&!Q)continue;let X=f(w+L),Z=(q-i[$*a+X])*(Q?L?h:1:1/C),J=($-1)*e+X;Z>T?(W=R,j=T,R=J,T=Z):Z>j&&(W=J,j=Z)}}R<0||(o[S]=R,s[S]=T,c[R]++,j>=.42*T&&(l[S]=W,c[W]++,n[S]=j*j/(T*T+j*j)))}}let y=0;for(let b=0;b<r;b++)c[b]||(m[y++]=b);for(let b=0;b<y;b++){let I=m[b],C=o[I],h=l[I];if(C<0)continue;let w=p[I]*n[I];p[C]+=p[I]-w,--c[C]||(m[y++]=C),h>=0&&(p[h]+=w,--c[h]||(m[y++]=h))}let v=new Float32Array(r),d=new Float32Array(r),g=new Float32Array(r),x=.66*Math.PI/(.023*e),M=.023*e/Math.PI,D=(1e3/e)**2,z=b=>Math.min(1,Math.max(0,b)),_=[-1,1];for(let b=0;b<r;b++){let I=Math.max(0,p[b]-u[Math.floor(b/e)+1]),C=Math.max(0,Math.min(1,(Math.log2(1+I*D)-2.65)/5.9)),h=s[b]*M;v[b]=C*(.065+.18*C)*(.7+.3*z(h/.22));let w=o[b];if(w>=0){let J=Math.max(0,s[b]-x)*.11;d[b]-=J,d[w]+=J}if(C<.5||w<0)continue;let S=Math.floor(b/e)+1,q=b%e,R=Math.floor(w/e)+1-S,W=(w%e-q+e+1)%e-1,T=s[w]*M,j=z((h-T-.035)/.32),Q=1-z(T/.28),$=J=>{let te=Math.max(1,Math.min(e-1,S+J*W));return p[(te-1)*e+f(q-J*R)]},L=z(1.8*(1-Math.max($(-1),$(1))/p[b])),X=j*Q*L*C*.06,H=1-z(h/.13),Z=i[S*a+q];for(let J of _){let te=S+J*W;if(H>0&&te>0&&te<e){let ee=f(q-J*R),P=(te-1)*e+ee,k=i[te*a+ee]-Z-.018;g[P]=Math.max(g[P],Math.min(.043,Math.max(0,k))*H*C)}if(X>0)for(let ee=1;ee<=3;ee++){let P=S+ee*R+J*W*Math.min(ee,2);if(P<1||P>=e)continue;let k=f(q+ee*W-J*R*Math.min(ee,2));d[(P-1)*e+k]+=X*(1-ee/4)}}}for(let b=1;b<e;b++){let I=t*tt(b,e);for(let C=0;C<e;C++){let h=(b-1)*e+C,w=0;for(let S=-1;S<=1;S++){let q=Math.max(1,Math.min(e-1,b+S));for(let R=-1;R<=1;R++)w+=v[(q-1)*e+f(C+R)]*(R?1:2)*(S?1:2)}i[b*a+C]+=I*(Math.min(.06,d[h])-g[h]-.52*v[h]-.82*w/16)}i[b*a+e]=i[b*a]}return i}var Ze=2*Math.PI,Ae=(i,a,t)=>Math.min(t,Math.max(a,i)),ye=(i,a,t)=>{let e=Ae((t-i)/(a-i),0,1);return e*e*(3-2*e)};function Ct(i,a,t,e,r){let o=!!r,l=ye(.18,.84,e);if(a<257||l===0)return[];let c=a-1,s=h=>(h%c+c)%c,n=(h,w)=>i[Ae(Math.round(w),0,c)*a+s(Math.round(h))],p=(h,w)=>{let S=h/c*Ze,q=w/c*Math.PI;return[Math.sin(q)*Math.cos(S),Math.cos(q),Math.sin(q)*Math.sin(S)]},m=t>>>0,f=()=>(m=Math.imul(m,1664525)+1013904223>>>0,m/2**32),u=[],y=[],v=[];for(let h=0;h<24;h++){let w=Math.acos(1-(h+.5)/12)*c/Math.PI;for(let S=0;S<48;S++)v.push(n((S+.5)*c/48,w))}v.sort((h,w)=>h-w);let d=v[Math.floor(v.length*.71)]+.19,g=32,x=20;for(let h=0;h<x;h++)for(let w=0;w<g;w++){let S=(w+f())*c/g,q=(.23+.54*(h+f())/x)*c,R=Ze*Math.sin(q/c*Math.PI)/c,W=Math.PI/c,T=(o?.195:.075)+(o?.25:.055)*f(),j=f(),Q=o?.024+T*(.048+.055*j):T*(.17+.065*j),$=Q*(f()-.5)*1.25,L=f()<.5?-1:1,X=f(),H=f()*Ze,Z=n(S,q),J=p(S,q),te=J[0]*.54+J[1]*.45+J[2]*.71,ee,P;for(let k=0;k<8;k++){let V=H+k*Ze/8,A=Math.cos(V),U=Math.sin(V),G=n(S+A*T/R,q+U*T/W),F=Z-G;if(F<(o?.085:.25))continue;let Y=n(S+A*T*.52/R,q+U*T*.52/W),B=n(S+(A*T*.4-U*Q)/R,q+(U*T*.4+A*Q)/W),E=n(S+(A*T*.4+U*Q)/R,q+(U*T*.4-A*Q)/W),N=Math.min(B,E)-G,O=.65*Ae(F,0,1.3)+.58*Ae(N,-.35,.85)+.24*Ae(Y-G,-.45,.65)+.46*te+.16*f()+(o?.6*T:0),K={x:S,y:q,xScale:R,yScale:W,dx:A,dy:U,length:T,width:Q,bend:$,branch:L,cirque:X,head:Z,outlet:G,score:O};(!ee||O>ee.score)&&(ee=K),G>=d&&(!P||O>P.score)&&(P=K)}ee&&u.push(ee),P&&y.push(P)}let M=[],D=u.map(({outlet:h})=>h).sort((h,w)=>h-w),z=D[Math.floor(D.length*.76)],_=D[Math.floor(D.length*.44)];u.sort((h,w)=>w.score-h.score);let b=h=>M.every(({x:w,y:S})=>Math.hypot(Math.min(Math.abs(w-h.x),c-Math.abs(w-h.x))*h.xScale,(S-h.y)*h.yScale)>=(o?.2:.31)),I=y.sort((h,w)=>w.score-h.score)[0];I&&M.push(I);let C=u.find(h=>h.outlet<=z&&h.outlet>=_&&b(h));C&&M.push(C);for(let h of u)if(b(h)&&(M.push(h),M.length===(o?11+(t>>>5)%5:4)))break;return M.map(({x:h,y:w,xScale:S,yScale:q,dx:R,dy:W,length:T,width:j,bend:Q,branch:$,cirque:L,head:X,outlet:H})=>{let Z=o?Ae(X-H,.14,.73):Ae(X-H,.26,1.14),J=o?-.17:0,te=o?1.29:1,ee=R*T/S,P=W*T/q,k=Math.floor(h+Math.min(J*ee,te*ee)-3.2*j/S),V=Math.ceil(h+Math.max(J*ee,te*ee)+3.2*j/S),A=Math.max(1,Math.floor(w+Math.min(J*P,te*P)-3.2*j/q)),U=Math.min(c-1,Math.ceil(w+Math.max(J*P,te*P)+3.2*j/q)),G=F=>H-.09*Z+.63*Z*(1-F)**2;for(let F=A;F<=U;F++){for(let Y=k;Y<=V;Y++){let B=(Y-h)*S,E=(F-w)*q,N=(B*R+E*W)/T;if(o&&(N<=J||N>=te))continue;let O=Q*(o?.64*Math.sin(Ze*N)+.26*Math.sin(Math.PI*N):Math.sin(Math.PI*N)),K=(-B*W+E*R-O)/j,ae=Ae(N,0,1),ie=.68+(.28+.37*L)*(1-ye(.04,.36,ae))+(.22+.24*(1-L))*ye(.56,.97,ae),se=ye(-.17,.07,N)*(1-ye(.83,1.19,N))*(1-ye(.25,1,Math.abs(K)/ie)),re=F*a+s(Y),ne=i[re],le=se*Ae(ne-G(ae),0,.95),xe=se;if(o){let fe=K*$-.15*Math.sin(Ze*ae+L*Math.PI),he=fe<0?.41+.18*L:.75+.12*L,me=ye(-.12,.035,N)*(1-ye(.93,1.18,N))*(1-ye(.24,he,Math.abs(fe))),Pe=Z*(.36+.4*L)*me;le=Math.max(le,me*Ae(ne-G(ae),0,.62)+Pe);let Ce=ye(.33,.6,N)*(1-ye(1.03,1.29,N))*(1-ye(.44,1.26,Math.abs(K+.12*$)));xe=Math.max(me,.68*se,.86*Ce)}let de=L>.28?2:1;for(let fe=0;fe<de;fe++){let he=fe===0?$:-$,be=.25+.14*L+fe*.31,me=K*he,Pe=N-be+.16*me-.021*me*me,Ce=1-ye(.047,.16+.07*L,Math.abs(Pe)),$e=2+.55*L-.3*fe,Ve=Ce*ye(.21,.72,me)*(1-ye($e*.59,$e,me)),Qe=G(be)+Z*(.18+.09*Ae(me,0,2.6));le=Math.max(le,Ve*Ae(ne-Qe,0,.62)),o&&(xe=Math.max(xe,.76*Ve))}let ue=.89-.11*K*K,ge=(1-ye(.015,.067,Math.abs(N-ue)))*(1-ye(.56,.97,Math.abs(K)))*ye(-.7,.28,K*$)*Z*L*.075;if(i[re]=ne+l*(ge-le),o&&xe>0){let fe=r.side-1,he=Math.round(F/c*fe)*r.side,be=Math.round(s(Y)/c*fe)%fe,me=he+be;r.values[me]=Math.max(r.values[me],l*xe),be===0&&(r.values[he+fe]=r.values[me])}}i[F*a+c]=i[F*a]}return{overlook:p(h+.93*R*T/S,w+.93*W*T/q),head:p(h+.12*R*T/S,w+.12*W*T/q)}})}var kt=123456789;var Rt=Object.freeze({natural:0,mesas:1,fractal:2,mosaic:3});function ea(i){let a=(i^1353215269)>>>0;return a=Math.imul(a^a>>>16,2146121005),a=Math.imul(a^a>>>15,2221713035),.24+.88*(((a^a>>>16)>>>0)/4294967296)**1.12}function Fe({regions:i},[a,t,e],r){if(!i)return r==="mesa"?[0,1,0,0]:r==="volcanic"?[0,0,0,1]:[1,0,0,0];let{side:o,values:l}=i,c=o-1,s=Math.hypot(a,e),n=s>0?Math.atan2(e,a)/(2*Math.PI):0,p=(n-Math.floor(n))*c,m=Math.atan2(s,t)*c/Math.PI,f=Math.floor(p),u=Math.floor(m),y=Math.min(c,u+1),v=p-f,d=m-u,g=l[u*o+f],x=l[u*o+Math.min(c,f+1)],M=l[y*o+f],D=l[y*o+Math.min(c,f+1)],z=w=>((g>>>w&255)*(1-v)*(1-d)+(x>>>w&255)*v*(1-d)+(M>>>w&255)*(1-v)*d+(D>>>w&255)*v*d)/255,_=z(0),b=z(8),I=z(16),C=_+b+I,h=1/Math.max(1,C);return[Math.max(0,1-C),_*h,b*h,I*h]}function It(i=123456789,{reseedLayers:a=i!==123456789}={}){let t=i>>>0;function e(){t+=1831565813;let f=Math.imul(t^t>>>15,1|t);return f^=f+Math.imul(f^f>>>7,61|f),((f^f>>>14)>>>0)/4294967296}let r=f=>(e()<.5?-1:1)*e()*f,o=r(.3),l=r(.1),c=e()*.4-.2+.65,s=e()*.2-.1+.65,n=e()*.2-.1,p=2.4,m=[["computeFBM",.8,6,2,.75,n+2],["computeFBM2",1,8,2,.75,n+1.3],["computeVoronoiTileNoise",.35,2,2,.9,c],["computeRidgedMultifractal4",.2,6,2.1,1,c],["computeLanczosBillow",.5,6,2,1,s]].map(([f,u,y,v,d,g],x)=>({entryPoint:f,params:{seed:a?i+(x+1)*15485863>>>0:i,zoom:p*u,freq:1,octaves:y,lacunarity:v,gain:.5,scalar:d,transform:0,xShift:g,yShift:g,zShift:g,seedAngle:Math.PI/2,threshold:.3,voroMode:2,warpAmp:0}}));return{seed:i,sphereOffset:o,sphereOffset2:l,layers:m}}function gt(i,a,t,e,r){return a+r*(.5*(t-i)+r*(i-2.5*a+2*t-.5*e+r*(.5*(e-i)+1.5*(a-t))))}function at(i,a,t,e,r){return .5*(t-i)+r*(2*(i-2.5*a+2*t-.5*e)+r*(1.5*(e-i)+4.5*(a-t)))}function qt({side:i,values:a},[t,e,r],o){let l=Math.hypot(t,r),c=l>0?Math.atan2(r,t)/(2*Math.PI):0,s=(c-Math.floor(c))*(i-1),n=Math.atan2(l,e)*(i-1)/Math.PI,p=Math.floor(n),m=x=>(x+i-1)%(i-1),f=(x,M,D=gt)=>{(x<0||x>=i)&&(x=x<0?-x:2*(i-1)-x,M+=(i-1)*.5);let z=Math.floor(M),_=x*i;return D(a[_+m(z-1)],a[_+m(z)],a[_+m(z+1)],a[_+m(z+2)],M-z)},u=(x,M=gt)=>f(p+x,s,M),y=u(-1),v=u(0),d=u(1),g=u(2);if(o&&l>1e-5){let x=gt(u(-1,at),u(0,at),u(1,at),u(2,at),n-p),M=at(y,v,d,g,n-p),D=x/(2*Math.PI*l**2),z=M/(Math.PI*l),_=(i-1)*.023;o[0]=(-r*D+t*e*z)*_,o[1]=-l*l*z*_,o[2]=(t*D+r*e*z)*_}else if(o){let x=i-1,M=e>0?1:x-1,D=.023/(2*Math.sin(Math.PI/x));o[0]=(f(M,0)-f(M,x*.5))*D,o[1]=0,o[2]=(f(M,x*.25)-f(M,x*.75))*D}return gt(y,v,d,g,n-p)}function Te(i,a,t,e){let r=Math.imul(i,2376512323)^Math.imul(a,3625334849)^Math.imul(t,3407524639)^Math.imul(e,374761393);return r=Math.imul(r^r>>>16,2146121005),r=Math.imul(r^r>>>15,2221713035),(r^r>>>16)>>>0}function ta(i,a,t,{min:e,max:r,mean:o,coverage:l}={}){if(l===0)return null;let c=Te(0,0,0,t);if(l===void 0&&c>=2147483648)return null;if(e===void 0){e=1/0,r=-1/0;let u=0;for(let y of i)e=Math.min(e,y),r=Math.max(r,y),u+=y;o=u/i.length}let s=r-e;if(s===0)return e;let n=new Float64Array(96),p=Math.max(1,Math.floor((a-1)/160)),m=0;for(let u=1;u<a-1;u+=p){let y=Math.sin(Math.PI*u/(a-1));for(let v=0;v<a-1;v+=p){let d=Math.min(95,Math.floor((i[u*a+v]-e)/s*96));n[d]+=y,m+=y}}let f=m*(l??.28+.36*(c/2147483648));for(let u=0;u<n.length;u++){let y=n[u];if(y>0&&f<=y)return e+s*(u+f/y)/96;f-=y}return o}function Me(i,a,t){let e=Math.max(0,Math.min(1,(t-i)/(a-i)));return e*e*(3-2*e)}function aa(i,a,t,e){let r=a-1,o=Math.max(1,Math.round(r/300)),l=r/65,c=.023*r/(2*Math.PI*o),s=i.slice();function n(p,m){let f=Math.floor(p),u=(f+r)%r,y=(u+1)%r,v=Math.max(0,Math.min(r,m)),d=Math.min(r-1,Math.floor(v)),g=p-f,x=v-d,M=d*a,D=s[M+u]*(1-g)+s[M+y]*g,z=s[M+a+u]*(1-g)+s[M+a+y]*g;return Me(.025,.22,t-(D*(1-x)+z*x))}for(let p=o;p<=r-o;p++){let m=p*a,f=Math.sin(Math.PI*p/r),u=Me(.08,.24,f);if(u===0)continue;let y=2*f,v=Math.max(1,Math.round(o/y));for(let d=0;d<r;d++){let g=s[m+d],x=g-t;if(x<-.2||x>.19)continue;let M=(s[m+(d+v)%r]-s[m+(d+r-v)%r])*o/(v*y),D=s[m+d+o*a]-s[m+d-o*a],z=Math.hypot(M,D),_=z*c;if(_<=.025)continue;let b=M/z,I=D/z,C=d-b*l/y,h=p-I*l,w=I*l*.58/y,S=-b*l*.58,q=Me(.19,.84,.46*n(C,h)+.27*(n(C+w,h+S)+n(C-w,h-S))),R=Me(.07,.36,_)*(.26+.74*q),W=(1-q)*Me(.025,.13,_)*(1-Me(.23,.56,_)),T=Math.min(x*.65,.058*(1-Me(.035,.19,x))),j=Math.min(-x*.64,.075*(1-Me(.055,.2,-x))),Q=Math.min(x*.52,.035*(1-Me(.025,.13,x))),$=Math.min(-x*.68,.078*(1-Me(.07,.2,-x))),L=x>=0?-R*T-W*Q:R*j+W*$;if(e!==void 0&&x>0){let H=Me(.025,.075,x)*(1-Me(.12,.19,x));if(e==="mesa"){let Z=.05+.035*q,J=x/Z,te=(Math.floor(J)+Me(.16,.76,J%1))*Z;L+=.72*H*R*(te-x)}else{let Z=.045*W*(1-Me(.07,.15,x));L+=H*(Z-.035*R)}}if(e!==void 0&&x<0){let H=-x,Z=Me(.012,.065,H)*(1-Me(.09,.2,H));L+=Z*(e==="mesa"?.064:.041)*W}let X=g+u*L;i[m+d]=x>=0?Math.max(t,X):Math.min(t,X)}i[m+r]=i[m]}}var Be=2*Math.PI,ra=(i,a,t)=>Math.min(t,Math.max(a,i)),pe=(i,a,t)=>i+(a-i)*t;function Se(i,a,t){let e=ra((t-i)/(a-i),0,1);return e*e*(3-2*e)}function Ft(i,a,t=!1){let e=Math.imul(i^i>>>16,2246822507)^3355159585,r=()=>(e=Math.imul(e,1664525)+1013904223>>>0,e/4294967296),o=r(),l=o<.44?1:o<.81?2:3+Math.floor(r()*2),c=r()*Be,s=[Math.cos(c),Math.sin(c)],n=r();return Array.from({length:t?1:l},(p,m)=>{let f=m===0,u=f?0:.51+.94*r(),y=(r()-.5)*u*(l===2?.84:1.6),v=s[0]*u-s[1]*y,d=s[1]*u+s[0]*y,g=f?.87+.24*r():(l===2?.38:.24)+.39*r(),x=f?n:.12+.7*r(),M=r()*Be,D=.7+.3*r(),z=Math.cos(M),_=Math.sin(M),b=Array.from({length:12},(S,q)=>{let R=q*Be/12,W=g*Math.cos(R),T=g*D*Math.sin(R);return a(v+W*z-T*_,d+W*_+T*z)}),I=b.reduce((S,q)=>S+q,0)/b.length,C=b.indexOf(Math.min(...b)),h=b.indexOf(Math.max(...b)),w=(.41+.38*r())*g**.74*pe(1,.69,x);return{x:v,y:d,size:g,stretch:D,cos:z,sin:_,datum:I,depth:w,wear:x,low:C*Be/12,high:h*Be/12,breach:pe(.19,.66,x)+.12*r(),rim:.33+.25*r(),harmonics:3+Math.floor(r()*5),warp:.042+.075*r(),offset:r()*Be,bench:.6+.13*r(),rebound:g<.48?0:Math.floor(r()*4),reboundAngle:r()*Be,reboundHeight:.34+.41*r()}})}function Tt(i,a,t,e){let r=i-e.x,o=a-e.y,l=1.53*e.size*(1.021+e.warp);if(r*r+o*o>=l*l)return t;let c=(r*e.cos+o*e.sin)/e.size,s=(o*e.cos-r*e.sin)/(e.size*e.stretch),n=Math.atan2(s,c),p=Math.cos(e.harmonics*n+e.offset+.7*Math.sin(3*n)),m=Math.cos((e.harmonics+5)*n-e.offset),f=Math.hypot(c,s)/(1+e.warp*p+.021*m);if(f>=1.53)return t;let u=Se(.76-.2*e.wear,.99,Math.cos(n-e.low)),y=e.breach*u,d=e.datum-e.depth*(1-(e.flatFloor?.065:.19)*f*f)+e.depth*(e.flatFloor?.045:.14)*(c*Math.cos(e.high)+s*Math.sin(e.high)),g=Se(e.bench-.1,e.bench,f)*(1-Se(e.bench+.08,e.bench+.18,f)),x=Se(.66-.09*e.wear,.96,f),M=Se(.84-.06*e.wear,1,f)*(1-Se(1.02,1.24+.1*e.wear,f)),D=e.depth*e.rim*M*(1+.28*p+.11*m)*(1-y),z=c*Math.cos(e.reboundAngle)+s*Math.sin(e.reboundAngle),_=s*Math.cos(e.reboundAngle)-c*Math.sin(e.reboundAngle),b=0;e.rebound===1?b=1-Se(.035,.33,Math.hypot(z+.1,_*1.35)):e.rebound===2?b=Math.max(1-Se(.02,.24,Math.hypot(z+.17,_-.08)),.76*(1-Se(.025,.2,Math.hypot(z-.19,_+.07)))):e.rebound===3&&(b=(1-Se(.025,.14,Math.abs(Math.hypot(z,_*.92)-.29)))*Se(-.66,.44,p+.5*m));let I=Se(1,1.16,f)*(1-Se(1.16,1.53,f)),C=e.depth*.11*I*(.57+.26*p+.15*m),h=d+e.depth*((1.06-.62*y)*x+.26*g+e.reboundHeight*b),w=(1-Se(.89,1.2,f))*(e.flatFloor?.98:pe(.94,.72,e.wear));return pe(t,h,w)+D+C}function Nt(i,a=!1){let t=(l,c)=>Te(l,c,613,i)/4294967296,e=t(-1,0),r=a?1+Math.floor(4*e):e<.012?2:e<.08?1:0,o=t(0,0)*Be;return Array.from({length:r},(l,c)=>{let s=pe(-.54,.54,t(c,1)),n=o+c*Be/r+pe(-.39,.39,t(c,2)),p=Math.sqrt(1-s*s),m=c===0?pe(.32,.43,t(c,3)):pe(.17,.3,t(c,3));return{center:[p*Math.cos(n),s,p*Math.sin(n)],longitude:n,size:m}})}function Wt(i,a,t,e,r=1,o=!1,l=e>0||o?Nt(t,o):[],c=0){if(e<=0&&!l.length)return 0;let s={side:a,values:i},n=a-1,p=Math.PI/n,m=Be/n,f=(z,_)=>Te(z,_,187,t)/4294967296,u=f(0,0),y=o?Math.max(.72,r):r,v=o?pe(115,190,f(0,1)):u<.48?pe(0,5,f(0,1)):u<.79?pe(12,31,f(0,1)):pe(62,134,f(0,1)),d=Math.min(640,Math.round(e*y**2*v)),g=c**4,x=Math.round(g*pe(190,255,u)*pe(.72,1,e)),M=Math.round((c*pe(295,440,u)+710*g)*pe(.65,1,e)),D=0;for(let z=-l.length;z<d+x+M;z++){let _=z<0?l[z+l.length]:void 0,b=z>=d&&z<d+x,I=z>=d+x,C=f(z,2),h=_?.size??(I?(.008+.067*C**pe(3,2.3,g))/Math.sqrt(y):b?(.036+.092*C**2.7)/Math.sqrt(y):(.014+.103*C**2.3)/y);if(h<2.1*p||!_&&h>.28)continue;let w=Math.min(.94,Math.cos(2*h+.04)),S=Math.acos(_?.center[1]??pe(-w,w,f(z,3))),q=_?(_.longitude+Be)%Be:Be*f(z,4),R=Math.sin(S),W=Math.cos(S);if(h<1.4*m*R)continue;let T=Math.sin(q),j=Math.cos(q),Q=[R*j,W,R*T],$=[-T,0,j],L=[-W*j,R,-W*T],X=(G,F)=>{let Y=Math.hypot(1,G*h,F*h);return qt(s,Q.map((B,E)=>(B+h*(G*$[E]+F*L[E]))/Y))},[H]=Ft(Te(z,5,187,t),X,!0),Z=f(z,6),J=_?pe(.38,.62,Z):I||b?pe(.12,.85,Z):pe(.86,.13,(z+Z)/Math.max(1,d)),te=_?pe(.79,1.15,h/.43):H.depth*pe(1.02,.63,J)*(I?pe(.12+.065*g,.51+.15*g,C**1.8):b?pe(.42,.92,C):pe(.31,.95,(h*y-.014)/.103)),ee=_?{...H,wear:J,depth:te,size:1,stretch:pe(.9,.99,f(z,7)),warp:.42*H.warp,breach:.18,rim:.38,rebound:f(z,8)<.32?3:0,reboundHeight:.28,flatFloor:!0}:{...H,wear:J,depth:te,stretch:pe(.81,1,f(z,7)),rim:b?Math.max(.49,H.rim):H.rim,rebound:I&&C<.84?0:H.rebound},P=Math.asin(1.53*ee.size*(1.021+ee.warp)*h),k=Math.max(1,Math.floor((S-P)/p)),V=Math.min(n-1,Math.ceil((S+P)/p)),A=Math.ceil(Math.asin(ra(Math.sin(P)/R,0,1))/m)+1,U=Math.round(q/m);for(let G=k;G<=V;G++){let F=Math.sin(G*p),Y=Math.cos(G*p);for(let B=U-A;B<=U+A;B++){let E=B*m-q,N=F*Math.sin(E)/h,O=(R*Y-W*F*Math.cos(E))/h,K=G*a+(B+n)%n;i[K]=Tt(N,O,i[K],ee)}i[G*a+n]=i[G*a]}D++}return D}var it=2*Math.PI,Et=(i,a,t)=>Math.min(t,Math.max(a,i)),Le=(i,a,t)=>i+(a-i)*t;function ce(i,a,t){let e=Et((t-i)/(a-i),0,1);return e*e*(3-2*e)}function ia(i){return()=>(i=Math.imul(i,1664525)+1013904223>>>0,i/4294967296)}function oa(i,a,t){let e=it*a/i,r=Math.PI*t/i,o=Math.sin(r);return[o*Math.cos(e),Math.cos(r),o*Math.sin(e)]}function Ga(i){let a=[],t=3+Math.floor(3*i());for(let e=0;e<t;e++){let r=i()*Math.PI,o=Math.cos(r),l=Math.sin(r),c=1.6*(i()-.5),s=-1.15+.38*i(),n=.2+.17*i();for(let p=s;p<1.12;p+=n*(.7+.66*i())){let m=c+.27*(i()-.5);a.push({x:p*o-m*l,y:p*l+m*o,width:.19+.23*i(),depth:.14+.32*i(),elongation:.58+.4*i()})}}return a}function Oa(i,a,t,e,r){let o=.1*Math.sin(5*a+2*i),l=1-ce(.77,1.36,Math.hypot(i*.88,a));if(l<=0)return t;let c=0,s=0,n=1.4,p=1.4;for(let x of r){let M=i+o-x.x,D=a-x.y;if(Math.abs(M)*x.elongation>1.4*x.width||Math.abs(D)>1.4*x.width)continue;let z=Math.hypot(M*x.elongation,D)/x.width;z<n?(p=n,n=z):p=Math.min(p,z);let _=1-ce(.12,.95,z);c=Math.max(c,_*x.depth),s=Math.max(s,.045*ce(.19,.51,z)*(1-ce(.54,.84,z)))}let m=1-ce(.04,.24,Math.abs(a-.25*Math.sin(3.4*i)+.07*i)),f=ce(.04,.19,c),u=Math.max(c,.17*m)+.05*m*f,y=Le(t,e+.13,.7),v=.14*(1-ce(.02,.12,c))*ce(.08,.28,m+s),g=.26*((1-ce(.07,.48,p-n))*ce(.4,.79,n)*(1-ce(1.06,1.37,p)))*(.72+.28*Math.sin(7*i-9*a));return Le(t,y-u+s+v+g,l)}function sa(i,a){return a.bend*Math.sin(a.curve*i+a.phase)+a.shift*(ce(a.first-.25,a.first,i)-ce(a.last,a.last+.36,i))}function Ha(i,a,t){let e={phase:a,bend:.08+.16*i(),curve:.72+1.86*i(),shift:.44*(i()-.5),first:-1.1+.86*i(),last:.12+.89*i(),width:.17+.17*i(),depth:.43+.21*t,vents:[],splays:[]},r=1+Math.floor(4*i());for(let l=0;l<r;l++){let c=-1.39+2.76*(l+.19+.63*i())/r;e.vents.push({at:c,across:sa(c,e)+.64*(i()-.5),width:.12+.26*i(),height:.28+.44*i(),crater:.09+.17*i()})}let o=Math.floor(3*i());for(let l=0;l<o;l++)e.splays.push({start:-1.32+1.65*i(),length:.76+.83*i(),reach:(i()<.5?-1:1)*(.38+.5*i())});return e}function Ya(i,a,t,e,r,o){let l=1-ce(1.35,2.25,Math.abs(i));if(l<=0)return t;let{phase:c,depth:s}=r,n=r.width+.14*ce(-.68,.79,Math.cos(i*3.6+c)),p=a-sa(i,r),m=p<0?-1:1,f=ce(-.7,.7,m*Math.sin(1.9*i+c)),u=Math.abs(p)/(n*Le(1.28,.82,f)),y=e-s-o*.35*i+.1*ce(.3,.95,Math.sin(i*4.5+c)),v=ce(.46,Le(1.2,.87,f),u),d=ce(.66,.83,u)*(1-ce(.86,1.13,u)),g=1-ce(.75,1.28,u),x=ce(.48,.84,u)*(1-ce(.96,1.18,u)),M=Le(y+s*v,t,.12+.2*v);M+=.11*f*d+.065*x*(1-f);let D=Le(t,M,l*g),z=ce(.76,1.08,u)*(1-ce(1.19,1.86,u));D+=l*z*Le(.038,.21,f);let _=0;for(let{start:b,length:I,reach:C}of r.splays){let h=(i-b)/I;if(h<=0||h>=1)continue;let w=Math.abs(p-C*(.18+.82*h)),S=ce(0,.22,h)*(1-ce(.69,1,h))*(1-ce(.065,.23,w));_=Math.max(_,.23*S)}D-=_;for(let b of r.vents){let I=Math.hypot(i-b.at,a-b.across)/b.width;if(I>=1.24)continue;let C=1-ce(.09,1.24,I),h=1-ce(.1,.39,I);D+=b.height*C**1.4-b.crater*h}return D}var rt=(i,a)=>i[0]*a[0]+i[1]*a[1]+i[2]*a[2];function na(i,a,t,e,r,o){let l={impact:[],karst:[],rift:[]},c=ce(.24,.85,e);if(a<257||c<=0)return l;let s=a-1,n=h=>(h%s+s)%s,p=Math.PI/s,m=(h,w)=>i[Et(Math.round(w),0,s)*a+n(Math.round(h))],f=r.flatMap(({overlook:h,head:w})=>[h,w]),u=ia(t^2476863307),y=[];for(let h=0;h<13;h++)for(let w=0;w<28;w++){let S=(w+u())*s/28,q=(.22+.56*(h+u())/13)*s,R=oa(s,S,q),W=.54*R[0]+.45*R[1]+.71*R[2];if(f.some(P=>rt(P,R)>.95))continue;let T=it*Math.sin(q*p)/s,j=.067+.035*u(),Q=u()*it,$=Array.from({length:8},(P,k)=>{let V=Q+k*it/8;return m(S+j*Math.cos(V)/T,q+j*Math.sin(V)/p)}),L=$.reduce((P,k)=>P+k,0)/$.length,X=Math.max(...$)-Math.min(...$),H=m(S,q),[,Z,J,te]=Fe({regions:o},R),ee=.54*Z+.48*J;y.push({x:S,y:q,dir:R,xStep:T,radius:j,phase:Q,datum:L,relief:X,height:H,light:W,bedrock:ee,volcanic:te,samples:$,chance:u()})}if(!y.length)return l;let v=y.map(({datum:h})=>h).sort((h,w)=>h-w),d=v[Math.floor(v.length*.7)],g=({datum:h,height:w,light:S,relief:q,chance:R})=>1.3*S-Math.abs(h-d-.26)-.44*q-.32*Math.abs(w-h)+.2*R,x=({datum:h,height:w,light:S,relief:q,bedrock:R,chance:W})=>S-Math.abs(h-d-.36)-.65*q+.4*(w-h)+R+.3*W,M=y.sort((h,w)=>g(w)-g(h))[0],D=y.filter(({dir:h})=>rt(h,M.dir)<.94).sort((h,w)=>x(w)-x(h))[0],z=h=>({datum:w,relief:S,light:q,volcanic:R,chance:W})=>q-1.26*Math.abs(w-h)-.38*S+.64*R+.17*W,_=y.filter(({dir:h})=>rt(h,M.dir)<.91&&(!D||rt(h,D.dir)<.92)),b=(h,w)=>{let S=z(w);return h.sort((q,R)=>S(R)-S(q))[0]},I=b(_,v[Math.floor(v.length*.56)]+.3),C=I&&b(_.filter(({dir:h,datum:w})=>rt(h,I.dir)<.91&&w>I.datum+.29),d+.6);for(let[h,w]of[["impact",M],["karst",D],["rift",I],["rift",C]]){if(!w)continue;let{x:S,y:q,xStep:R,radius:W,phase:T,datum:j,chance:Q}=w,$=h==="rift",L=$?w.samples.indexOf(Math.min(...w.samples)):0,X=T+L*it/8,H=Math.cos(X),Z=Math.sin(X),J=h==="impact",te=J?Ft(t,(N,O)=>m(S+(N*H-O*Z)*W/R,q+(N*Z+O*H)*W/p)).sort((N,O)=>O.wear-N.wear):[],ee=Math.max(0,...te.map(({x:N,y:O,size:K,warp:ae})=>Math.hypot(N,O)+1.53*K*(1.021+ae))),P=W*($?2.65:J?ee:1.56),k=h==="karst"?Ga(u):[],V=Math.imul(t^t>>>16,2246822507)^Math.imul(Math.floor(S),2654435761),A=$?Ha(ia(V),T,Q):null,U=$?Et(j-w.samples[L],.03,.28):0;for(let N=Math.max(1,Math.ceil(q-P/p));N<=Math.min(s-1,q+P/p);N++){for(let O=Math.ceil(S-P/R);O<=S+P/R;O++){let K=(O-S)*R/W,ae=(N-q)*p/W,ie=K*H+ae*Z,oe=ae*H-K*Z,se=N*a+n(O),re=i[se],ne=re;if(J)for(let le of te)ne=Tt(ie,oe,ne,le);else $?ne=Ya(ie,oe,re,j,A,U):ne=Oa(ie,oe,re,j,k);i[se]=Le(re,ne,c)}i[N*a+s]=i[N*a]}let G=$?1.68:J?-Math.max(1.05,ee*.46):-.97,F=$?.65:0,Y=0,B=0;if(J){let N=te.reduce((O,K)=>O+K.size,0);for(let O of te)Y+=O.x*O.size/N,B+=O.y*O.size/N}let E=(N,O)=>oa(s,S+(N*H-O*Z)*W/R,q+(N*Z+O*H)*W/p);l[h].push({overlook:E(Y+G,B+F),target:E(Y,B)})}return l}var je=2*Math.PI,yt=(i,a,t)=>Math.min(t,Math.max(a,i)),ot=(i,a,t)=>i+(a-i)*t;function ze(i,a,t){let e=yt((t-i)/(a-i),0,1);return e*e*(3-2*e)}function la(i,a,t){let e=je*i/t,r=Math.PI*a/t,o=Math.sin(r);return[o*Math.cos(e),Math.cos(r),o*Math.sin(e)]}function fa(i,a,t,e,r,o,l){let c=ze(.31,.76,e);if(a<513||c<=0)return;let s=a-1,n=A=>(A%s+s)%s,p=Math.PI/s,m=(A,U)=>i[yt(Math.round(U),0,s)*a+n(Math.round(A))],f=[];for(let A=0;A<24;A++){let U=Math.acos(1-(A+.5)/12)/p;for(let G=0;G<40;G++)f.push(m((G+.5)*s/40,U))}f.sort((A,U)=>A-U);let u=f[Math.floor(f.length*.74)]+.14,y=[...r.map(({head:A})=>A),...Object.values(o).flat().map(({target:A})=>A)],v=Math.imul(t^t>>>17,1757159915)^1900846437,d=()=>(v=Math.imul(v,1664525)+1013904223>>>0,v/4294967296),g;for(let A=0;A<17;A++)for(let U=0;U<32;U++){let G=(U+d())*s/32,F=(.22+.56*(A+d())/17)*s,Y=la(G,F,s);if(y.some(oe=>oe[0]*Y[0]+oe[1]*Y[1]+oe[2]*Y[2]>.955))continue;let B=.54*Y[0]+.45*Y[1]+.71*Y[2];if(B<.22)continue;let E=je*Math.sin(F*p)/s,N=.042+.018*d(),O=d()*je,[,K,ae,ie]=Fe({regions:l},Y);for(let oe=0;oe<8;oe++){let se=O+oe*je/8,re=Math.cos(se),ne=Math.sin(se),le=m(G-re*N/E,F-ne*N/p),xe=m(G+re*N/E,F+ne*N/p),de=le-xe;if(xe<u-.2||de<.16||de>1.3)continue;let ue=m(G,F),ge=.92*B-.6*Math.abs(de-.56)-.54*Math.abs(ue-(le+xe)*.5)-.38*Math.abs(xe-u)+.31*ie+.19*K+.12*ae+.2*d();(!g||ge>g.score)&&(g={x:G,y:F,xStep:E,size:N,dx:re,dy:ne,high:le,low:xe,score:ge})}}if(!g)return;let{x,y:M,xStep:D,size:z,dx:_,dy:b,high:I,low:C}=g,h=.15+.15*d(),w=d()*je,S=.7+.6*d(),q=d(),R=(Math.imul(t^t>>>16,2654435761)>>>0)%3,W=.42+.19*d(),T=(A,U=0)=>h*Math.sin(2.4*A+w)+U*W*ze(-.36,.68,A),j=A=>ot(I,C,yt((A+.95)/1.9,0,1)**S),Q=[];function $(A,U,G,F){Q.push({u:A,v:T(A,U)+.17*(d()-.5),length:G,width:F,level:j(A),phase:d()*je,chemistry:yt(.82*q+.33*d()-.06,0,1)})}function L(A,U,G,F,Y){let B=(U-A)/F;for(let E=0;E<F;E++){let N=A+B*(E+.48+.32*(d()-.5));$(N,G,B*(.39+.21*d()),Y*(.62+.52*d()))}}R===0?($(-.68,0,.3,.54+.19*d()),L(-.37,.97,-1,2+Math.floor(2*d()),.31),L(-.11,1,1,2+Math.floor(2*d()),.36)):R===1?L(-1,1.04,0,3+Math.floor(4*d()),.54):($(-.54,0,.55+.1*d(),.68+.13*d()),L(.12,1.1,0,2+Math.floor(2*d()),.46)),Q.sort((A,U)=>A.u-U.u);let X=2.1*z,H=X/D,Z=X/p,J=[x/s,M/s,H/s,Z/s],te=new Uint32Array(96**2),ee={height:0,wet:0,crust:0,tint:0},P=(A,U,G)=>{let F=(A-x)*D/z,Y=(U-M)*p/z,B=F*_+Y*b,E=Y*_-F*b,N=R===0?Math.min(Math.abs(E-T(B,-1)),Math.abs(E-T(B,1))):Math.abs(E-T(B)),O=(1-ze(.045,.16,N))*ze(-1.23,-.83,B)*(1-ze(.89,1.42,B)),K=j(B),ae=ot(G,Math.min(G,K),.42*O),ie=0,oe=O*.43,se=q;for(let re of Q){let ne=(B-re.u)/re.length,le=(E-re.v)/re.width;if(Math.abs(ne)>1.62||Math.abs(le)>1.62)continue;let xe=Math.atan2(le,ne),de=1+.097*Math.sin(3*xe+re.phase)+.042*Math.cos(7*xe-re.phase),ue=Math.hypot(ne,le)/de;if(ue>=1.42)continue;let ge=ze(.52,.98,Math.cos(xe))*(1-ze(.09,.29,Math.abs(le))),fe=ze(.76,.93,ue)*(1-ze(1,1.24,ue)),he=ze(1.02,1.23,ue)*(1-ze(1.27,1.42,ue)),be=re.level+fe*(.077-.063*ge)-.05*he,me=1-ze(.83,1.42,ue);ae=ot(ae,be,me);let Pe=1-ze(.64,.8,ue),Ce=(1-ze(1.01,1.42,ue))*ze(.58,.85,ue);ie=ot(ie,Pe,me),Ce>oe&&(oe=Ce,se=re.chemistry*(.61+.39*fe))}ee.height=ot(G,ae,c),ee.wet=ie*c,ee.crust=oe*c,ee.tint=se};for(let A=Math.ceil(M-Z);A<=Math.floor(M+Z);A++){for(let U=Math.ceil(x-H);U<=Math.floor(x+H);U++){let G=A*a+n(U);P(U,A,i[G]),i[G]=ee.height}i[A*a+s]=i[A*a]}let k=95;for(let A=0;A<=k;A++)for(let U=0;U<=k;U++)P(x+(2*U/k-1)*H,M+(2*A/k-1)*Z,0),te[A*96+U]=1056964608|Math.round(255*ee.wet)|Math.round(255*ee.crust)<<8|Math.round(255*ee.tint)<<16;let V=(A,U)=>la(x+(A*_-U*b)*z/D,M+(A*b+U*_)*z/p,s);return o.springs=[{overlook:V(.86,.82),target:V(-.12,0)}],{chart:J,values:te,side:96}}var st=2*Math.PI,nt=(i,a,t)=>Math.min(t,Math.max(a,i)),Ke=(i,a,t)=>i+(a-i)*t;function Ne(i,a,t){let e=nt((t-i)/(a-i),0,1);return e*e*(3-2*e)}function ca(i,a,t){let e=Math.PI*a/t,r=st*i/t;return[Math.sin(e)*Math.cos(r),Math.cos(e),Math.sin(e)*Math.sin(r)]}function Lt(i,a){let t=i-Math.floor(i),e=Math.min(t/a,(1-t)/(1-a));return e*e*(1.32-.32*e)}function pa(i,a,t,e,r,o,l){let c=Ne(.32,.76,e);if(a<513||c<=0)return;let s=a-1,n=Math.PI/s,p=B=>(B%s+s)%s,m=(B,E)=>i[nt(Math.round(E),0,s)*a+p(Math.round(B))],f=Math.imul(t^t>>>16,2221713035)^458671337,u=()=>(f=Math.imul(f,1664525)+1013904223>>>0,f/4294967296),y=[...r.map(({head:B})=>B),...Object.values(o).flat().map(({target:B})=>B)],v=[];for(let B=0;B<20;B++){let E=Math.acos(1-(B+.5)/10)/n;for(let N=0;N<36;N++)v.push(m((N+.5)*s/36,E))}v.sort((B,E)=>B-E);let d=v[Math.floor(v.length*.75)],g;for(let B=0;B<18;B++)for(let E=0;E<36;E++){let N=(E+u())*s/36,O=(.23+.54*(B+u())/18)*s,K=ca(N,O,s),ae=.54*K[0]+.45*K[1]+.71*K[2];if(ae<.22||y.some(ge=>ge[0]*K[0]+ge[1]*K[1]+ge[2]*K[2]>.934))continue;let ie=st*Math.sin(O*n)/s,oe=.066+.027*u(),se=Array.from({length:8},(ge,fe)=>{let he=fe*st/8;return m(N+oe*Math.cos(he)/ie,O+oe*Math.sin(he)/n)}),re=m(N,O);if(re<d-.12)continue;let ne=se.reduce((ge,fe)=>ge+fe,0)/se.length,le=Math.max(...se)-Math.min(...se),[,xe,,de]=Fe({regions:l},K),ue=.8*ae-.52*Math.abs(re-d-.17)+.55*nt(ne-re,-.6,.65)-.26*nt(le-.33,0,1.6)+.3*xe+.39*de+.18*u();(!g||ue>g.score)&&(g={x:N,y:O,xStep:ie,radius:oe,center:re,mean:ne,volcanic:de,score:ue})}if(!g)return;let{x,y:M,xStep:D,radius:z,center:_,mean:b,volcanic:I}=g,C=u()*st,h=Math.cos(C),w=Math.sin(C),S=u()*st,q=(Math.imul(t^t>>>17,2146121005)>>>0)%3,R=3.05+1.24*u(),W=nt(.7*I+.55*u()-.1,0,1),T=Ke(_,b,.19),j=.19+.16*u(),Q=j*(.68+.58*u()),$=0,L=0,X=1/0;for(let B=0;B<18;B++){let E=.14+.56*u(),N=.86*(u()-.5),O=m(x+(h*E-w*N)*z/D,M+(w*E+h*N)*z/n);O<X&&($=E,L=N,X=O)}X=Math.max(T-.19,X-.055);let H=Array.from({length:20+Math.floor(12*u())},()=>({x:1.94*(u()-.5),y:1.9*(u()-.5),length:.15+.2*u(),width:.17+.23*u(),height:.09+.15*u(),curve:.22+.6*u()})),Z=1.37*z/D,J=1.37*z/n,te=[x/s,M/s,Z/s,J/s],ee=new Uint32Array(96**2),P={height:0,sand:0,salt:0};function k(B,E,N){let O=(B-x)*D/z,K=(E-M)*n/z,ae=h*O+w*K,ie=h*K-w*O,oe=1-Ne(.71,1.21,Math.hypot(ae*.95,ie)),se=T+.12*ie+.075*ae*ae,re=Ne(.19,.59,N-se),ne=Ne(-.63,.62,.65*Math.sin(5.7*ie+S+1.5*ae)+.36*Math.cos(7.2*ae-4.5*ie)),le=oe*(1-re)*Ke(.53,1,ne),xe=Math.hypot((ae-$)/Q,(ie-L)/j)+.1*Math.sin(17*ie+5*ae+S),de=oe*(1-Ne(.63,1.23,xe))*(1-Ne(X+.15,X+.33,N)),ue;if(q===1){ue=0;for(let fe of H){let he=(ie-fe.y)/fe.width;if(Math.abs(he)>=1)continue;let be=he*he,me=(ae-fe.x)/fe.length-fe.curve*be,Pe=(1-Ne(.06,1,Math.abs(he)))*Ne(-1,.48,me)*(1-Ne(.48,.83,me));ue=Math.max(ue,fe.height*Pe)}}else{let fe=ae+.095*Math.sin(4.6*ie+S)+.054*Math.cos(10*ie-3.4*ae),he=Lt(R*fe+.18*Math.sin(ie*7+S),.76);if(q===2){let be=Lt(R*(ie*.67-.77*ae+.08*Math.sin(ae*8+S)),.68),me=Lt(R*(ie*.72+.63*ae+.13*Math.sin(ie*6-S)),.72);ue=.13*he+.115*be*me+.082*he*Math.max(be,me)}else ue=.22*he}let ge=Ke(N,se+ue*Ke(.49,1.18,ne),le*.92);P.height=Ke(N,Ke(ge,X,de*.95),c),P.sand=le*(1-de)*c,P.salt=de*c}let V=95;for(let B=0;B<=V;B++)for(let E=0;E<=V;E++){let N=x+(2*E/V-1)*Z,O=M+(2*B/V-1)*J;k(N,O,m(N,O)),ee[B*96+E]=1056964608|Math.round(255*P.sand)|Math.round(255*P.salt)<<8|Math.round(255*W)<<16}for(let B=Math.ceil(M-J);B<=Math.floor(M+J);B++){for(let E=Math.ceil(x-Z);E<=Math.floor(x+Z);E++){let N=B*a+p(E);k(E,B,i[N]),i[N]=P.height}i[B*a+s]=i[B*a]}let A=(B,E)=>ca(x+(B*h-E*w)*z/D,M+(B*w+E*h)*z/n,s);o.dunes=[{overlook:A(.94,.69),target:A(-.07,0)}];let U=A(-.01,0),F=A(.01,0).map((B,E)=>B-U[E]),Y=Math.hypot(...F);return{chart:te,values:ee,side:96,wind:F.map(B=>B/Y)}}var Xa=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],Za=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],ua=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],ja=Uint32Array.from(ua.flat(),i=>i>>>0),Ka={name:"Bourke",corners:Xa,edges:Za,maxVertices:15,table:ja,cornerBit:i=>1<<i,createPolygonizer(){return(i,a,t)=>{let e=ua[a],r=0;for(;r<15&&e[r]>=0;)t[r]=e[r],r++;return r}}};var ma=Ka;var $a=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]);var lt=$a;var Qa=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],Ja=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],Vt=class{constructor(){this.table=lt,this.f_test_results=new Int32Array(6)}signbf(a){return a<0}face_tests(a){let t=this.v,e=this.f_test_results;return e.fill(0),a&128?(e[0]=(a&204)===132?t[0]*t[5]<t[1]*t[4]?-1:1:0,e[3]=(a&153)===129?t[0]*t[7]<t[3]*t[4]?-1:1:0,e[4]=(a&240)===160?t[0]*t[2]<t[1]*t[3]?-1:1:0):(e[0]=(a&204)===72?t[0]*t[5]<t[1]*t[4]?1:-1:0,e[3]=(a&153)===24?t[0]*t[7]<t[3]*t[4]?1:-1:0,e[4]=(a&240)===80?t[0]*t[2]<t[1]*t[3]?1:-1:0),a&2?(e[1]=(a&102)===66?t[1]*t[6]<t[2]*t[5]?-1:1:0,e[2]=(a&51)===18?t[3]*t[6]<t[2]*t[7]?-1:1:0,e[5]=(a&15)===10?t[4]*t[6]<t[5]*t[7]?-1:1:0):(e[1]=(a&102)===36?t[1]*t[6]<t[2]*t[5]?1:-1:0,e[2]=(a&51)===33?t[3]*t[6]<t[2]*t[7]?1:-1:0,e[5]=(a&15)===5?t[4]*t[6]<t[5]*t[7]?1:-1:0),e[0]+e[1]+e[2]+e[3]+e[4]+e[5]}face_test1(a){let t=this.v;switch(a){case 0:return t[0]*t[5]<t[1]*t[4]?72:132;case 1:return t[1]*t[6]<t[2]*t[5]?36:66;case 2:return t[3]*t[6]<t[2]*t[7]?33:18;case 3:return t[0]*t[7]<t[3]*t[4]?24:129;case 4:return t[0]*t[2]<t[1]*t[3]?80:160;default:return t[4]*t[6]<t[5]*t[7]?5:10}}interior_test(a,t){let e=this.v,r=1e-9,o=e[4]-e[0],l=e[5]-e[1],c=e[6]-e[2],s=e[7]-e[3],n=o*c-l*s;if(this.signbf(n)){if(a&1)return 0}else if(!(a&1)||Math.abs(n)<r)return 0;let p=.5*(e[3]*l+e[1]*s-e[2]*o-e[0]*c)/n;if(p<=r||p>=1-r)return 0;let m=e[0]+o*p,f=e[1]+l*p,u=e[2]+c*p,y=e[3]+s*p,v=u*m,d=y*f;if(a&1){if(v<d&&!this.signbf(d))return(this.signbf(f)===this.signbf(e[a]))+t}else if(v>d&&!this.signbf(v))return(this.signbf(m)===this.signbf(e[a]))+t;return 0}pattern(a){let t=this.table,e=(a&128)!==0,r=e?a^255:a,o=t[r];if(o===void 0)throw new Error(`MC33 lookup miss: ${r}`);let l=(o&2048)!==0,c=e?!l:l,s=c?a:a^255,n=o&2047,p=o>>>12,m;switch(p){case 0:m=n;break;case 1:m=s&this.face_test1(n>>2)?183+(n<<1):159+n;break;case 2:m=this.interior_test(n,0)?239+6*n:231+(n<<1);break;case 3:s&this.face_test1(n%6)?m=575+5*n:m=this.interior_test(Math.floor(n/6),0)?407+7*n:335+3*n;break;case 4:{let f=this.face_tests(s);f===-3?m=695+3*n:f===-1?m=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*n:f===1?m=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*n:m=this.interior_test(n>>1,0)?1095+9*n:1055+5*n;break}case 5:{let f=this.face_tests(s);f===-2?m=(n&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(n?1:3,0))?1213+(n<<3):1189+(n<<2):f===0?m=(this.f_test_results[2+n]<0?1261:1285)+(n<<3):m=(n&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(n?3:1,0))?1237+(n<<3):1201+(n<<2);break}case 6:{let f=this.face_tests(s);f===-2?m=this.interior_test(14287116>>(n<<1)&3,0)?1453+(n<<3):1357+(n<<2):f===0?m=(this.f_test_results[n>>1]<0?1645:1741)+(n<<3):m=this.interior_test(10991589>>(n<<1)&3,0)?1549+(n<<3):1405+(n<<2);break}default:{let f=Math.abs(this.face_tests(s));if(f===0){let u=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])m=2157+12*u;else{let y=this.interior_test(u,1);m=2285+(y?10*u-40*y:6*u)}}else if(f===2)m=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(m+=30);else if(f===4){let u=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];u>>4&&(u-=u&32?20:10),m=1845+3*u}else m=1839+2*this.f_test_results[0]}}return{offset:m+1,reverse:c}}triangles(a,t,e){if(this.v=a,t===0||t===255)return 0;let r=this.pattern(t),o=0;for(let l=r.offset;l<lt.length;l++){let c=lt[l],s=c&15,n=c>>4&15,p=c>>8&15;if(s<=12&&n<=12&&p<=12&&s!==n&&n!==p&&s!==p){if(o+3>e.length)throw new Error("MC33 cell exceeds output capacity");e[o++]=s,e[o++]=r.reverse?p:n,e[o++]=r.reverse?n:p}if(!(c&4096))return o}throw new Error("MC33 pattern exceeds lookup table")}},e1={name:"MC33",corners:Qa,edges:Ja,maxVertices:36,table:lt,cornerBit:i=>128>>i,createPolygonizer(){let i=new Vt;return i.triangles.bind(i)}};var xa=e1;function Ut(i={type:"cartesian"}){if(i.type==="cartesian")return(o,l,c)=>[o,l,c];if(i.type!=="spherical"&&i.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${i.type}`);let a=i.radius||[.02,.7],t=i.center||[.5,.5,.5];if(a.length!==2||!a.every(Number.isFinite)||a[0]<0||a[1]<=a[0])throw new Error("Radius must be an increasing, nonnegative pair");if(t.length!==3||!t.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(i.type==="cube-sphere"){if(!Number.isInteger(i.face)||i.face<0||i.face>5)throw new Error("Cube-sphere face must be 0..5");return(o,l,c)=>{let s=2*o-1,n=2*l-1,m=[[1,n,-s],[-1,n,s],[s,1,-n],[s,-1,n],[s,n,1],[-s,n,-1]][i.face],u=(a[0]+c*(a[1]-a[0]))/Math.hypot(...m);return m.map((y,v)=>t[v]+y*u)}}let e=i.longitude||[-Math.PI,Math.PI],r=i.latitude||[-Math.PI/2,Math.PI/2];for(let o of[e,r])if(o.length!==2||!o.every(Number.isFinite)||o[1]<=o[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(r[0]<-Math.PI/2||r[1]>Math.PI/2||e[1]-e[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \xB1pi/2 and longitude span at most 2*pi");return(o,l,c)=>{let s=e[0]+o*(e[1]-e[0]),n=r[0]+l*(r[1]-r[0]),p=a[0]+c*(a[1]-a[0]),m=p*Math.cos(n);return Math.abs(Math.cos(n))<1e-15?[t[0],t[1]+p*Math.sin(n),t[2]]:[t[0]+m*Math.cos(s),t[1]+p*Math.sin(n),t[2]+m*Math.sin(s)]}}function ha(i,a){if(!a||a.type==="cartesian")return i;let t=Ut(a);for(let e=0;e<i.length;e+=3){let r=t(i[e],i[e+1],i[e+2]);i[e]=r[0],i[e+1]=r[1],i[e+2]=r[2]}return i}var a1={bourke:ma,mc33:xa};function r1(i,a,t,e){let r=a1[e];if(!r)throw new Error(`Unknown marching cubes algorithm: ${e}`);if(!["x","y","z"].every(o=>Number.isInteger(a[o])&&a[o]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(i instanceof Float32Array)||i.length!==a.x*a.y*a.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(t))throw new Error("Isolevel must be finite");for(let o of i)if(!Number.isFinite(o)||!Number.isFinite(Math.fround(o-t)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return r}function da(i,a,t=0,e="bourke",r={}){t=Math.fround(t),r.coordinates&&Ut(r.coordinates);let o=r1(i,a,t,e),{x:l,y:c,z:s}=a,n=o.createPolygonizer(),p=new Float32Array(8),m=new Uint8Array(o.maxVertices),f=new Float32Array(39),u=new Float32Array(65536),y=0;for(let v=0;v<s-1;v++)for(let d=0;d<c-1;d++)for(let g=0;g<l-1;g++){let x=0;for(let D=0;D<8;D++){let z=o.corners[D];p[D]=i[((v+z[2])*c+d+z[1])*l+g+z[0]]-t,p[D]<0&&(x|=o.cornerBit(D))}if(x===0||x===255)continue;let M=n(p,x,m);if(y+M*3>u.length){let D=new Float32Array(Math.max(u.length*2,y+M*3));D.set(u),u=D}for(let D=0;D<12;D++){let[z,_]=o.edges[D];if(p[z]<0==p[_]<0)continue;let b=p[z]-p[_],I=Math.abs(b)<1e-9?.5:Math.max(0,Math.min(1,p[z]/b)),C=o.corners[z],h=o.corners[_];f[D*3]=(g+C[0]+I*(h[0]-C[0]))/(l-1),f[D*3+1]=(d+C[1]+I*(h[1]-C[1]))/(c-1),f[D*3+2]=(v+C[2]+I*(h[2]-C[2]))/(s-1)}f[36]=(g+.5)/(l-1),f[37]=(d+.5)/(c-1),f[38]=(v+.5)/(s-1);for(let D=0;D<M;D++){let z=m[D]*3;u[y++]=f[z],u[y++]=f[z+1],u[y++]=f[z+2]}}return ha(u.slice(0,y),r.coordinates)}var i1=2*Math.PI;function o1(i,a){return[Math.sin(i)*Math.cos(a),Math.cos(i),Math.sin(i)*Math.sin(a)]}var vt=(i,a)=>i[0]*a[0]+i[1]*a[1]+i[2]*a[2];function He(i,a,t,e){let{bend:r,twist:o,thickness:l,peak:c,portals:s}=e,n=t-r*i*i+o*i*a,p=c-.17*i-.13*Math.cos(4.1*i+o),m=Math.hypot(i*.87+.08*a,(a-.15)/p,n/l)-1,f=Math.hypot((Math.abs(i)-.83-.11*a)/.34,(a+.28)/.68,(n+.06*i)/(l*1.48))-1,u=Math.max(0,.2-Math.abs(m-f)),y=Math.min(m,f)-1.25*u*u,v=.034*Math.sin(19*a+2.3*i+2.1*n)+.025*Math.sin(12*i+7.3*n+5*a)*Math.cos(10*a-3*n),d=1/0;for(let{at:g,width:x,height:M,lean:D}of s){let z=(i-g-D*a-.05*t)/x,_=Math.max(0,a+.08+.05*t)/M;d=Math.min(d,Math.hypot(z,_)-1)}return Math.max(y+v,-d+.37*v)}function s1(i){let a={x:55,y:45,z:29},t=[-1.39,-1.05,-.88],e=[1.39,1.6,.88],r=e.map((s,n)=>(s-t[n])/([a.x,a.y,a.z][n]-1)),o=new Float32Array(a.x*a.y*a.z);for(let s=0;s<a.z;s++)for(let n=0;n<a.y;n++)for(let p=0;p<a.x;p++)o[(s*a.y+n)*a.x+p]=He(t[0]+p*r[0],t[1]+n*r[1],t[2]+s*r[2],i);let l=da(o,a,0,"mc33"),c=new Float32Array(l.length*2);for(let s=0;s<l.length;s+=3){let n=t[0]+l[s]*(e[0]-t[0]),p=t[1]+l[s+1]*(e[1]-t[1]),m=t[2]+l[s+2]*(e[2]-t[2]),f=.004;c.set([n,p,m,He(n+f,p,m,i)-He(n-f,p,m,i),He(n,p+f,m,i)-He(n,p-f,m,i),He(n,p,m+f,i)-He(n,p,m-f,i)],s*2)}return c}function ga(i,a,t,e,r,o){if(a<513||e<.38)return;let l=a-1,c=Object.values(r).flat().map(({target:d})=>d),s=(d,g)=>i[Math.round(g)*a+(Math.round(d)%l+l)%l],n=[];for(let d=12;d<l;d+=19)for(let g=1;g<l;g+=19)n.push(s(g,d));n.sort((d,g)=>d-g);let p=n[Math.floor(.77*n.length)],m=Math.imul(t^t>>>17,2654435761)^1126074651,f=()=>(m=Math.imul(m,1664525)+1013904223>>>0,m/4294967296),u=[];for(let d=0;d<19;d++)for(let g=0;g<33;g++){let x=(g+f())*l/33,M=(.22+.56*(d+f())/19)*l,D=s(x,M);if(D<p-.18)continue;let z=Math.PI*M/l,_=i1*x/l,b=o1(z,_),I=vt(b,[.54,.45,.71]);if(I<.25||c.some(T=>vt(T,b)>.998))continue;let[,C,h,w]=Fe({regions:o},b),S=s(x+2,M)-s(x-2,M),q=s(x,M+4)-s(x,M-4),R=Math.hypot(S,q),W=.8*I+.56*C+.32*h+.24*w-.51*Math.abs(D-p-.21)-.38*Math.abs(R-.31)+.22*f();u.push({dir:b,theta:z,phi:_,dx:S,dy:q,canyon:C,volcanic:w,score:W})}let y=[];for(let d of u.sort((g,x)=>x.score-g.score))if(!y.some(g=>vt(g.dir,d.dir)>.94)&&(y.push(d),y.length===2))break;if(!y.length)return;let v=y.map(({dir:d,theta:g,phi:x,dx:M,dy:D,canyon:z,volcanic:_})=>{let b=[-Math.sin(x),0,Math.cos(x)],I=[Math.cos(g)*Math.cos(x),-Math.sin(g),Math.cos(g)*Math.sin(x)],C=Math.atan2(D,M)+Math.PI/2+(f()-.5)*1.55,h=b.map((Q,$)=>Q*Math.cos(C)+I[$]*Math.sin(C)),w=b.map((Q,$)=>-Q*Math.sin(C)+I[$]*Math.cos(C)),S=240+250*f(),q=.64+.45*f(),R={bend:.25*(f()-.5),twist:.35*(f()-.5),thickness:.23+.13*f(),peak:.79+.2*f(),portals:[]};f()<.39?R.portals.push({at:-.41,width:.24+.1*f(),height:.4+.14*f(),lean:-.11},{at:.34,width:.29+.1*f(),height:.49+.13*f(),lean:.13}):R.portals.push({at:(f()-.5)*.24,width:.52+.17*f(),height:.49+.14*f(),lean:(f()-.5)*.36});let W=vt(w,[.54,.45,.71])>=0?1:-1,T=d.map((Q,$)=>Q+(w[$]*W*S*3.6+h[$]*S*.78)/262144),j=Math.hypot(...T);return{direction:d,span:h,depth:w,size:S,rise:q,tint:Math.min(1,.24+.59*z-.2*_+.27*f()),site:{target:d,overlook:T.map(Q=>Q/j)},vertices:s1(R)}});return r.arches=v.map(({site:d})=>d),v}function ya(i){let a=l=>Te(l,0,0,i)/4294967296,t=a(47);if(t>=.55)return[0,0,0,0];if(t>=.3)return[0,0,0,1.18+.42*a(37)];let e=.48*(a(21)-.5),r=.48*(a(23)-.5),o=Math.hypot(e,1,r);return[e/o,1/o,r/o,.65+.48*a(37)]}function va(i,a,t,e,r){if(r[3]===0)return-1/0;let o=Math.abs(i*r[0]+a*r[1]+t*r[2]),l=Math.sin(9*i+4*a-7*t+14*r[0]);return e-r[3]+1.08*o*o-.115*l}function ba(i,a,t,e,r,o,l=!0,c=1,s,n=!1,p=0,m=!1){let f=n||r>0?Nt(e,n):[];if(n){At(i,a),Wt(i,a,e,r,c,!0,f,p);let I=Math.min(a,257),C=m?{side:I,values:new Float32Array(I**2)}:void 0,h=C?Ct(i,a,e,.87,C):[];return{values:i,glacialSites:h,glacialIce:C,landmarks:{},impactBasins:f,ocean:{seed:e,datum:null}}}let u=l?Ct(i,a,e,r):[],y=l?na(i,a,e,r,u,o):{};Wt(i,a,e,l?0:r,c,!1,f);let v=l&&s===void 0?null:ta(i,a,e,{coverage:s}),d=l?null:ya(e),g=Math.min(a,257),x=l?null:{side:g,values:new Float32Array(g**2)},M=!l&&o&&r>0?{seed:e,variation:r,regions:o,sites:[]}:null;if(l1(i,a,t==="volcanic"?.84:1.32,v,d,x,M,!l&&{seed:e,geology:t,regions:o}),Jt(i,a,t==="alpine"?.94:.74),v!==null&&aa(i,a,v,s===void 0?void 0:t),At(i,a),!l)return{values:i,glacialSites:u,landmarks:y,impactBasins:f,alluvium:x,invertedRidges:M?.sites,ocean:{seed:e,datum:v}};let z=fa(i,a,e,r,u,y,o),_=pa(i,a,e,r,u,y,o),b=ga(i,a,e,r,y,o);return{values:i,glacialSites:u,landmarks:y,impactBasins:f,springs:z,dunes:_,rockSpans:b,ocean:s===void 0?void 0:{seed:e,datum:v}}}function l1(i,a,t=1,e=null,r=null,o=null,l=null,c=null){let s=a-1,n=Math.min(256,Math.floor(s/3.5));if(n<12)return i;let p=n*(n-1),m=s/n,f=new Float32Array(p),u=Float32Array.from({length:n+1},(P,k)=>Math.sin(Math.PI*k/n)),y=(P,k)=>(P+k)%k,v=(P,k)=>i[Math.round(k)*a+y(Math.round(P),s)];for(let P=1;P<n;P++)for(let k=0;k<n;k++){let V=k*m,A=P*m,U=m*.48;f[(P-1)*n+k]=.4*v(V,A)+.15*(v(V-U,A)+v(V+U,A)+v(V,A-U)+v(V,A+U))}let g=f.slice().sort()[Math.floor(p*.2)],x=new Float32Array(p).fill(1/0),M=new Int32Array(p).fill(-1),D=new Uint32Array(p),z=new Uint32Array(p).fill(p),_=new Float32Array(p),b=new Uint32Array(p),I=0;function C(P){let k=I++;for(;k;){let V=k-1>>1;if(x[b[V]]<=x[P])break;b[k]=b[V],k=V}b[k]=P}function h(){let P=b[0],k=b[--I],V=0;for(;V*2+1<I;){let A=V*2+1;if(A+1<I&&x[b[A+1]]<x[b[A]]&&A++,x[k]<=x[b[A]])break;b[V]=b[A],V=A}return b[V]=k,P}for(let P=0;P<p;P++)f[P]<=g&&(x[P]=f[P],C(P));for(let P=0;I;P++){let k=h(),V=k%n,A=Math.floor(k/n)+1,U=u[A],G=Math.max(.08,2*U),F=1/Math.hypot(G,1);D[P]=k,z[k]=P,_[k]=U;let Y=0;for(let B=-1;B<=1;B++){let E=A+B;if(!(E<1||E>=n))for(let N=-1;N<=1;N++){if(!N&&!B)continue;let O=(E-1)*n+y(V+N,n);if(x[O]===1/0)x[O]=Math.max(f[O],x[k]+2e-5),M[O]=k,C(O);else if(z[O]<P){let K=(x[k]-x[O])*(B?N?F:1:1/G);K>Y&&(Y=K,M[k]=O)}}}}let w=o&&new Float32Array(p),S=o&&new Float32Array(p),q=(1e3/n)**2;for(let P=p-1;P>=0;P--){let k=D[P],V=M[k];if(V<0)continue;let A=_[k];_[V]+=A,S&&(S[V]=Math.max(S[V],Math.min(w[V],A)),w[V]=Math.max(w[V],A))}if(S){let P=106.63474115247546/q;for(let k=0;k<p;k++){let V=S[k];if(V<=P){S[k]=0;continue}let A=Math.min(1,(Math.log2(1+V*q)-6.75)/4.6),U=Math.min(1,V/Math.max(1,w[k]*.58));S[k]=A*U}}let R=new Float32Array(a*a),W=e===null&&!o?null:new Float32Array(a*a),T=r&&r[3]!==0&&new Float32Array(p),j=l&&new Float32Array(p),Q=c&&(c.regions||c.geology==="mesa")&&new Float32Array(p),$=Q&&new Float32Array(p),L=Q&&new Float32Array(p),X=l&&new Float32Array(a*a),H=[];if(T||j||Q){let P=Float64Array.from({length:n},(G,F)=>Math.cos(2*Math.PI*F/n)),k=Float64Array.from({length:n},(G,F)=>Math.sin(2*Math.PI*F/n)),V=l?Te(53,0,0,l.seed)*(2*Math.PI/4294967296):0,A=Q?Te(61,0,0,c.seed)*(2*Math.PI/4294967296):0,U=Math.min(1,n/160);for(let G=1;G<n;G++){let F=u[G],Y=Math.cos(Math.PI*G/n);for(let B=0;B<n;B++){let E=(G-1)*n+B,N=f[E],O=F*P[B],K=F*k[B];if(T){let oe=va(O,Y,K,N,r),se=Math.max(0,Math.min(1,(oe-.015)/.48)),re=Math.max(0,Math.min(1,(N-g-.16)/.54));T[E]=se*se*(3-2*se)*re}let ae=j&&F>.19&&N>(e??g)+.12,ie=Q||ae?Fe(c||l,[O,Y,K],c?.geology):null;if(Q){let oe=e===null?1:Math.max(0,Math.min(1,(N-e-.02)/.22)),se=Math.max(0,(ie[1]-.18)/.82)*(1-(T?.[E]??0));Q[E]=se;let re=se*oe*tt(G,n)*m;if(re>0){let ne=U*(35*O-52*Y+28*K)+A,le=U*(-67*O+21*Y+49*K)-A;$[E]=re*(1.36*Math.sin(ne)+.38*Math.sin(le))/Math.max(.5,2*F),L[E]=re*(.76*Math.cos(le)+.29*Math.cos(ne))}}if(ae){let[,oe,se,re]=ie,ne=.45*oe+.27*se+.91*re,le=.69*Math.sin(9*O+3*Y-7*K+V)+.31*Math.cos(15*O-8*Y+9*K-V),xe=Math.max(0,Math.min(1,(le-.1)/.73)),de=Math.max(0,Math.min(1,(ne-.26)/.57));j[E]=l.variation*de*xe*xe*(1-.85*(T?.[E]??0))}}}}let Z=P=>Math.max(0,Math.min(1,(Math.log2(1+_[P]*q)-6.45)/6.4+.17*(Q?.[P]??0))),J=(P,k)=>{let V=Math.min(1,Math.max(0,(f[P]-g+.12)/.36));return t*k*(.095+.24*k)*(.46+.54*V)*(1+.32*(Q?.[P]??0))},te=(P,k)=>{let V=M[P];if(V<0||k<=.53)return 0;let A=Math.abs(f[P]-f[V])*n/256,U=(k-.53)/.47,G=Math.max(0,1-A/.065),F=e===null?1:Math.max(0,Math.min(1,(f[P]-e-.04)/.17));return U*G*G*F*(1-(T?.[P]??0))};for(let P=0;P<p;P++){let k=M[P];if(k<0)continue;let V=Z(P);if(V<=0)continue;let A=Z(k),U=Math.floor(P/n)+1,G=P%n*m+($?.[P]??0),F=U*m+(L?.[P]??0),Y=(y(k%n-P%n+1,n)-1)*m+($?.[k]??0)-($?.[P]??0),B=(Math.floor(k/n)-U+1)*m+(L?.[k]??0)-(L?.[P]??0),E=Math.max(.35,2*u[U]),N=Y*E,O=Math.max(1e-6,N*N+B*B),K=(T?.[P]??0)*V*V,ae=(T?.[k]??0)*A*A,ie=Q?.[P]??0,oe=Q?.[k]??0,se=(S?.[P]??0)*(1-K),re=(S?.[k]??0)*(1-ae),ne=(.43+1.44*V)*m*(1+.57*K+.43*se),le=(.43+1.44*A)*m*(1+.57*ae+.43*re),xe=Math.max(ne,le),de=J(P,V)*(1+.72*K),ue=J(k,A)*(1+.72*ae),ge=f[P]-de,fe=Math.min(ge,f[k]-ue),he=o?te(P,V):0,be=o?te(k,A):0,me=he>0||be>0,Pe=V*V*(j?.[P]??0),Ce=A*A*(j?.[k]??0),$e=Math.max(Pe,Ce)>.025;Pe>.17&&Ce>.17&&H.push({x:P%n,y:U,score:(Pe+Ce)/2});let Ve=e!==null&&V>.57&&f[P]>=e&&f[P]<e+.24&&f[k]<e&&f[k]>e-.2,Qe=0,Ye=M[k];if(o&&V>.59&&Ye>=0&&K<.22&&(e===null||f[k]>e+.05)){let ke=f[P]-f[k],qe=Math.max(0,f[k]-f[Ye]),Xe=Math.max(0,Math.min(1,(.76*ke-qe-.016)/.075));Qe=t*V*Xe*Math.min(.2,.73*ke)}let Je=Qe>.005,Gt=0;if(Je){let ke=((y(Ye%n-k%n+1,n)-1)*m+($?.[Ye]??0)-($?.[k]??0))*E,qe=(Math.floor(Ye/n)-Math.floor(k/n))*m+(L?.[Ye]??0)-(L?.[k]??0);Gt=(N*qe-B*ke)/Math.sqrt(O*Math.max(1e-6,ke**2+qe**2))}let bt=xe*(Je?2.04:Ve?1.65:$e?1.35:1),We=Je?3.3:Ve?2.65:1,Ot=bt/E,Ht=Ve||Je?Math.sqrt(O):0,za=Math.max(1,Math.floor(Math.min(F,F+We*B)-bt)),_a=Math.min(s-1,Math.ceil(Math.max(F,F+We*B)+bt)),Sa=Math.floor(Math.min(G,G+We*Y)-Ot),Pa=Math.ceil(Math.max(G,G+We*Y)+Ot);for(let ke=za;ke<=_a;ke++){let qe=tt(ke,s),Xe=ke-F;for(let ct=Sa;ct<=Pa;ct++){let pt=(ct-G)*E,Ee=(pt*N+Xe*B)/O,Re=Math.min(1,Math.max(0,Ee)),_e=ke*a+y(ct,s);if(Ve&&Ee>.2&&Ee<We){let ve=(Ee-.2)/(We-.2),we=Math.abs(pt*B-Xe*N)/Ht,Ie=le*(.52+ve),Ue=i[_e]-e;if(we<Ie&&Ue>-.19&&Ue<.034){let Ge=we/Ie,xt=(1-Ge)*Math.min(1,Ge*4),zt=Math.min(.15,.034-Ue);W[_e]=Math.max(W[_e],zt*xt*4*ve*(1-ve)*V*qe)}}if(Je&&Ee>.42&&Ee<We){let ve=(Ee-.42)/(We-.42),we=(pt*B-Xe*N)/Ht,Ie=le*(.48+1.27*ve),Ue=f[k]-.068*(Ee-1),Ge=Math.max(0,i[_e]-Ue);if(Math.abs(we)<Ie&&Ge<.28){let xt=we/Ie,zt=1+.46*Gt*xt,_t=Math.abs(xt),Ra=(1-_t)**2*Math.min(1,5*_t),Ia=Math.min(1,.28+8*Math.abs(_t-.58*ve)),qa=Ra*Ia*4*ve*(1-ve),Fa=Qe*qa*zt*(1-Ge/.28)*qe;W[_e]=Math.max(W[_e],Fa)}}let Da=ne+Re*(le-ne),De=Math.hypot(pt-Re*N,Xe-Re*B)/Da;if($e&&De<1.35){let ve=(Pe+Re*(Ce-Pe))*qe,we=Math.max(0,Math.min(1,(.54-De)/.3)),Ie=Math.max(0,1-Math.abs(De-.84)/.51);X[_e]=Math.max(X[_e],.35*ve*we*we*(3-2*we)),R[_e]=Math.max(R[_e],.19*ve*Ie*Ie)}if(De>=1)continue;let Mt=de+Re*(ue-de),Ba=se+Re*(re-se),Yt=.27*(V+Re*(A-V))**2+.19*Ba,ut=1-Math.max(0,(De-Yt)/(1-Yt));if(ie>0||oe>0){let ve=ie+Re*(oe-ie),we=Math.max(0,Math.min(1,(De-.19)/.59)),Ie=1-we*we*(3-2*we);ut+=.77*ve*(Ie-ut)}let Aa=K+Re*(ae-K),wt=De*De,Ca=1-wt*wt*(3-2*wt),ka=ut+Aa*(Ca-ut),Xt=ge+Re*(fe-ge),mt=Math.min(1.65*Mt,Math.max(.4*Mt,i[_e]-Xt))*qe*ka;if(me&&De>.28&&De<.94){let ve=Math.min(1,(De-.28)/.21,(.94-De)/.22),we=ve*ve*(3-2*ve)*(he+Re*(be-he)),Ue=(Xt+Mt*(.24+.18*De)-(i[_e]-mt))*we,Ge=Math.max(-.073*t,Math.min(.14*t,-Ue));mt=Math.max(0,mt+Ge*qe)}R[_e]=Math.max(R[_e],mt)}}}let ee=o?(o.side-1)/s:0;for(let P=1;P<s;P++){let k=P*a;for(let V=0;V<s;V++){let A=k+V,U=W?.[A]??0,G=X?.[A]??0;if(i[A]+=U+G-R[A]*(1-.89*Math.min(1,G/.115)),o&&U>0){let F=Math.round(P*ee);if(F===0||F===o.side-1)continue;let Y=Math.round(V*ee)%(o.side-1),B=F*o.side+Y,E=U*(1-.5*Math.min(1,R[A]/.24));o.values[B]=Math.max(o.values[B],Math.min(1,E*9))}}i[k+s]=i[k]}if(H.length){H.sort((P,k)=>k.score-P.score);for(let{x:P,y:k}of H){let V=Math.PI*k/n,A=2*Math.PI*P/n,U=Math.sin(V),G=[U*Math.cos(A),Math.cos(V),U*Math.sin(A)];if(!l.sites.some(F=>F[0]*G[0]+F[1]*G[1]+F[2]*G[2]>.998)&&(l.sites.push(G),l.sites.length>=48))break}}if(o)for(let P=1;P<o.side-1;P++){let k=P*o.side;o.values[k+o.side-1]=o.values[k]}return i}var f1='(()=>{function b0(t,c,o){let x=Math.min(1,Math.max(0,(o-t)/(c-t)));return x*x*(3-2*x)}function t0(t,c){return b0(.0175,.0805,Math.min(t,c-t)/c)}function _0(t,c,o){let x=t.length,a=2*o+1,r=0;for(let f=-o;f<=o;f++)r+=t[(f+x)%x];for(let f=0;f<x;f++)c[f]=r/a,r+=t[(f+o+1)%x]-t[(f-o+x)%x]}function I0(t,c){let o=c-1;if(o<64)return;let x=Math.floor(Math.asin(.25)/Math.PI*o),a=new Float32Array(o),r=new Float32Array(o),f=Float64Array.from({length:o},(s,h)=>Math.cos(h*2*Math.PI/o)),M=Float64Array.from({length:o},(s,h)=>Math.sin(h*2*Math.PI/o)),e=Math.max(2,Math.round(o*.005)),n=Math.max(1,Math.round(o*.0035)),l=[1,4,6,4,1],b=new Float32Array((x+n*2+1)*c);for(let s of[0,o]){let h=s===0?1:-1;for(let k=1;k<=x;k++){let u=Math.sin(Math.PI*k/o),H=1-b0(.071,.25,u),C=Math.min(Math.floor(.23*o),Math.max(1,Math.round((1.5+2.3*H)/(2*u)))),i=(s+h*k)*c;a.set(t.subarray(i,i+o));let d=0,I=0;for(let z=0;z<o;z++)d+=a[z]*f[z],I+=a[z]*M[z];_0(a,r,C),_0(r,a,C),_0(a,r,C);let U=2*C+1,O=2*(1-(Math.sin(U*Math.PI/o)/(U*Math.sin(Math.PI/o)))**3)/o;for(let z=0;z<o;z++){let q=O*(d*f[z]+I*M[z]);t[i+z]+=H*(r[z]+q-t[i+z])}t[i+o]=t[i]}for(let k=0;k<=x+n*2;k++){let u=(s+h*k)*c;b.set(t.subarray(u,u+c),k*c)}let A=0;for(let k of[n,2*n]){let u=0;for(let H=0;H<o;H++)u+=b[k*c+H];A+=(k===n?8:2)*u/o}t.fill((6*b[0]+A)/16,s*c,(s+1)*c);let B=Math.floor(o/2),g=o%2;for(let k=1;k<=x;k++){let u=Math.sin(Math.PI*k/o),H=1-b0(.038,.21,u);if(H<=0)break;let C=(s+h*k)*c;for(let i=0;i<o;i++){let d=0;for(let I=0;I<5;I++){let U=k+(I-2)*n,W=Math.abs(U)*c,O=U<0?(i+B)%o:i,z=b[W+O];d+=l[I]*(U<0&&g?(z+b[W+(O+1)%o])*.5:z)}t[C+i]+=H*(d/16-t[C+i])}t[C+o]=t[C]}let F=t[s*c],m=(s+h*e)*c,P=0,E=0,y=0;for(let k=0;k<o;k++){let u=t[m+k]-F;P+=u,E+=u*f[k],y+=u*M[k]}P/=o,E*=2/o,y*=2/o;for(let k=1;k<e;k++){let u=Math.sin(Math.PI*k/o)/Math.sin(Math.PI*e/o),H=1-b0(.45,1,u),C=(s+h*k)*c;for(let i=0;i<o;i++){let d=F+(E*f[i]+y*M[i])*u+P*u*u;t[C+i]+=H*(d-t[C+i])}t[C+o]=t[C]}}}function L0(t,c,o=1){let x=c-1,a=x*(c-2),r=new Int32Array(a).fill(-1),f=new Int32Array(a).fill(-1),M=new Uint8Array(a),e=new Float32Array(a),n=new Float32Array(a),l=new Float32Array(a),b=new Uint32Array(a),s=u=>(u+x)%x,h=Float64Array.from({length:c},(u,H)=>Math.sin(Math.PI*H/x));for(let u=1;u<x;u++){let H=h[u],C=Math.max(.06,2*H),i=1/Math.hypot(1,C);for(let d=0;d<x;d++){let I=(u-1)*x+d,U=t[u*c+d];l[I]=H;let W=-1,O=-1,z=0,q=0;for(let $=-1;$<=1;$++){let G=u+$;if(!(G<=0||G>=x))for(let D=-1;D<=1;D++){if(!D&&!$)continue;let c1=s(d+D),Z=(U-t[G*c+c1])*($?D?i:1:1/C),K=(G-1)*x+c1;Z>z?(O=W,q=z,W=K,z=Z):Z>q&&(O=K,q=Z)}}W<0||(r[I]=W,e[I]=z,M[W]++,q>=.42*z&&(f[I]=O,M[O]++,n[I]=q*q/(z*z+q*q)))}}let A=0;for(let u=0;u<a;u++)M[u]||(b[A++]=u);for(let u=0;u<A;u++){let H=b[u],C=r[H],i=f[H];if(C<0)continue;let d=l[H]*n[H];l[C]+=l[H]-d,--M[C]||(b[A++]=C),i>=0&&(l[i]+=d,--M[i]||(b[A++]=i))}let B=new Float32Array(a),g=new Float32Array(a),F=new Float32Array(a),m=.66*Math.PI/(.023*x),P=.023*x/Math.PI,E=(1e3/x)**2,y=u=>Math.min(1,Math.max(0,u)),k=[-1,1];for(let u=0;u<a;u++){let H=Math.max(0,l[u]-h[Math.floor(u/x)+1]),C=Math.max(0,Math.min(1,(Math.log2(1+H*E)-2.65)/5.9)),i=e[u]*P;B[u]=C*(.065+.18*C)*(.7+.3*y(i/.22));let d=r[u];if(d>=0){let K=Math.max(0,e[u]-m)*.11;g[u]-=K,g[d]+=K}if(C<.5||d<0)continue;let I=Math.floor(u/x)+1,U=u%x,W=Math.floor(d/x)+1-I,O=(d%x-U+x+1)%x-1,z=e[d]*P,q=y((i-z-.035)/.32),$=1-y(z/.28),G=K=>{let n1=Math.max(1,Math.min(x-1,I+K*O));return l[(n1-1)*x+s(U-K*W)]},D=y(1.8*(1-Math.max(G(-1),G(1))/l[u])),c1=q*$*D*C*.06,v=1-y(i/.13),Z=t[I*c+U];for(let K of k){let n1=I+K*O;if(v>0&&n1>0&&n1<x){let Q=s(U-K*W),p=(n1-1)*x+Q,_=t[n1*c+Q]-Z-.018;F[p]=Math.max(F[p],Math.min(.043,Math.max(0,_))*v*C)}if(c1>0)for(let Q=1;Q<=3;Q++){let p=I+Q*W+K*O*Math.min(Q,2);if(p<1||p>=x)continue;let _=s(U+Q*O-K*W*Math.min(Q,2));g[(p-1)*x+_]+=c1*(1-Q/4)}}}for(let u=1;u<x;u++){let H=o*t0(u,x);for(let C=0;C<x;C++){let i=(u-1)*x+C,d=0;for(let I=-1;I<=1;I++){let U=Math.max(1,Math.min(x-1,u+I));for(let W=-1;W<=1;W++)d+=B[(U-1)*x+s(C+W)]*(W?1:2)*(I?1:2)}t[u*c+C]+=H*(Math.min(.06,g[i])-F[i]-.52*B[i]-.82*d/16)}t[u*c+x]=t[u*c]}return t}var D1=2*Math.PI,R1=(t,c,o)=>Math.min(o,Math.max(c,t)),d1=(t,c,o)=>{let x=R1((o-t)/(c-t),0,1);return x*x*(3-2*x)};function A0(t,c,o,x,a){let r=!!a,f=d1(.18,.84,x);if(c<257||f===0)return[];let M=c-1,e=i=>(i%M+M)%M,n=(i,d)=>t[R1(Math.round(d),0,M)*c+e(Math.round(i))],l=(i,d)=>{let I=i/M*D1,U=d/M*Math.PI;return[Math.sin(U)*Math.cos(I),Math.cos(U),Math.sin(U)*Math.sin(I)]},b=o>>>0,s=()=>(b=Math.imul(b,1664525)+1013904223>>>0,b/2**32),h=[],A=[],B=[];for(let i=0;i<24;i++){let d=Math.acos(1-(i+.5)/12)*M/Math.PI;for(let I=0;I<48;I++)B.push(n((I+.5)*M/48,d))}B.sort((i,d)=>i-d);let g=B[Math.floor(B.length*.71)]+.19,F=32,m=20;for(let i=0;i<m;i++)for(let d=0;d<F;d++){let I=(d+s())*M/F,U=(.23+.54*(i+s())/m)*M,W=D1*Math.sin(U/M*Math.PI)/M,O=Math.PI/M,z=(r?.195:.075)+(r?.25:.055)*s(),q=s(),$=r?.024+z*(.048+.055*q):z*(.17+.065*q),G=$*(s()-.5)*1.25,D=s()<.5?-1:1,c1=s(),v=s()*D1,Z=n(I,U),K=l(I,U),n1=K[0]*.54+K[1]*.45+K[2]*.71,Q,p;for(let _=0;_<8;_++){let j=v+_*D1/8,w=Math.cos(j),X=Math.sin(j),N=n(I+w*z/W,U+X*z/O),V=Z-N;if(V<(r?.085:.25))continue;let J=n(I+w*z*.52/W,U+X*z*.52/O),S=n(I+(w*z*.4-X*$)/W,U+(X*z*.4+w*$)/O),L=n(I+(w*z*.4+X*$)/W,U+(X*z*.4-w*$)/O),R=Math.min(S,L)-N,Y=.65*R1(V,0,1.3)+.58*R1(R,-.35,.85)+.24*R1(J-N,-.45,.65)+.46*n1+.16*s()+(r?.6*z:0),T={x:I,y:U,xScale:W,yScale:O,dx:w,dy:X,length:z,width:$,bend:G,branch:D,cirque:c1,head:Z,outlet:N,score:Y};(!Q||Y>Q.score)&&(Q=T),N>=g&&(!p||Y>p.score)&&(p=T)}Q&&h.push(Q),p&&A.push(p)}let P=[],E=h.map(({outlet:i})=>i).sort((i,d)=>i-d),y=E[Math.floor(E.length*.76)],k=E[Math.floor(E.length*.44)];h.sort((i,d)=>d.score-i.score);let u=i=>P.every(({x:d,y:I})=>Math.hypot(Math.min(Math.abs(d-i.x),M-Math.abs(d-i.x))*i.xScale,(I-i.y)*i.yScale)>=(r?.2:.31)),H=A.sort((i,d)=>d.score-i.score)[0];H&&P.push(H);let C=h.find(i=>i.outlet<=y&&i.outlet>=k&&u(i));C&&P.push(C);for(let i of h)if(u(i)&&(P.push(i),P.length===(r?11+(o>>>5)%5:4)))break;return P.map(({x:i,y:d,xScale:I,yScale:U,dx:W,dy:O,length:z,width:q,bend:$,branch:G,cirque:D,head:c1,outlet:v})=>{let Z=r?R1(c1-v,.14,.73):R1(c1-v,.26,1.14),K=r?-.17:0,n1=r?1.29:1,Q=W*z/I,p=O*z/U,_=Math.floor(i+Math.min(K*Q,n1*Q)-3.2*q/I),j=Math.ceil(i+Math.max(K*Q,n1*Q)+3.2*q/I),w=Math.max(1,Math.floor(d+Math.min(K*p,n1*p)-3.2*q/U)),X=Math.min(M-1,Math.ceil(d+Math.max(K*p,n1*p)+3.2*q/U)),N=V=>v-.09*Z+.63*Z*(1-V)**2;for(let V=w;V<=X;V++){for(let J=_;J<=j;J++){let S=(J-i)*I,L=(V-d)*U,R=(S*W+L*O)/z;if(r&&(R<=K||R>=n1))continue;let Y=$*(r?.64*Math.sin(D1*R)+.26*Math.sin(Math.PI*R):Math.sin(Math.PI*R)),T=(-S*O+L*W-Y)/q,t1=R1(R,0,1),o1=.68+(.28+.37*D)*(1-d1(.04,.36,t1))+(.22+.24*(1-D))*d1(.56,.97,t1),a1=d1(-.17,.07,R)*(1-d1(.83,1.19,R))*(1-d1(.25,1,Math.abs(T)/o1)),x1=V*c+e(J),s1=t[x1],e1=a1*R1(s1-N(t1),0,.95),M1=a1;if(r){let i1=T*G-.15*Math.sin(D1*t1+D*Math.PI),u1=i1<0?.41+.18*D:.75+.12*D,b1=d1(-.12,.035,R)*(1-d1(.93,1.18,R))*(1-d1(.24,u1,Math.abs(i1))),S1=Z*(.36+.4*D)*b1;e1=Math.max(e1,b1*R1(s1-N(t1),0,.62)+S1);let C1=d1(.33,.6,R)*(1-d1(1.03,1.29,R))*(1-d1(.44,1.26,Math.abs(T+.12*G)));M1=Math.max(b1,.68*a1,.86*C1)}let m1=D>.28?2:1;for(let i1=0;i1<m1;i1++){let u1=i1===0?G:-G,w1=.25+.14*D+i1*.31,b1=T*u1,S1=R-w1+.16*b1-.021*b1*b1,C1=1-d1(.047,.16+.07*D,Math.abs(S1)),J1=2+.55*D-.3*i1,Y1=C1*d1(.21,.72,b1)*(1-d1(J1*.59,J1,b1)),Q1=N(w1)+Z*(.18+.09*R1(b1,0,2.6));e1=Math.max(e1,Y1*R1(s1-Q1,0,.62)),r&&(M1=Math.max(M1,.76*Y1))}let f1=.89-.11*T*T,p1=(1-d1(.015,.067,Math.abs(R-f1)))*(1-d1(.56,.97,Math.abs(T)))*d1(-.7,.28,T*G)*Z*D*.075;if(t[x1]=s1+f*(p1-e1),r&&M1>0){let i1=a.side-1,u1=Math.round(V/M*i1)*a.side,w1=Math.round(e(J)/M*i1)%i1,b1=u1+w1;a.values[b1]=Math.max(a.values[b1],f*M1),w1===0&&(a.values[u1+i1]=a.values[b1])}}t[V*c+M]=t[V*c]}return{overlook:l(i+.93*W*z/I,d+.93*O*z/U),head:l(i+.12*W*z/I,d+.12*O*z/U)}})}var Gt=Object.freeze({natural:0,mesas:1,fractal:2,mosaic:3});function U1({regions:t},[c,o,x],a){if(!t)return a==="mesa"?[0,1,0,0]:a==="volcanic"?[0,0,0,1]:[1,0,0,0];let{side:r,values:f}=t,M=r-1,e=Math.hypot(c,x),n=e>0?Math.atan2(x,c)/(2*Math.PI):0,l=(n-Math.floor(n))*M,b=Math.atan2(e,o)*M/Math.PI,s=Math.floor(l),h=Math.floor(b),A=Math.min(M,h+1),B=l-s,g=b-h,F=f[h*r+s],m=f[h*r+Math.min(M,s+1)],P=f[A*r+s],E=f[A*r+Math.min(M,s+1)],y=d=>((F>>>d&255)*(1-B)*(1-g)+(m>>>d&255)*B*(1-g)+(P>>>d&255)*(1-B)*g+(E>>>d&255)*B*g)/255,k=y(0),u=y(8),H=y(16),C=k+u+H,i=1/Math.max(1,C);return[Math.max(0,1-C),k*i,u*i,H*i]}function M0(t,c,o,x,a){return c+a*(.5*(o-t)+a*(t-2.5*c+2*o-.5*x+a*(.5*(x-t)+1.5*(c-o))))}function x0(t,c,o,x,a){return .5*(o-t)+a*(2*(t-2.5*c+2*o-.5*x)+a*(1.5*(x-t)+4.5*(c-o)))}function X0({side:t,values:c},[o,x,a],r){let f=Math.hypot(o,a),M=f>0?Math.atan2(a,o)/(2*Math.PI):0,e=(M-Math.floor(M))*(t-1),n=Math.atan2(f,x)*(t-1)/Math.PI,l=Math.floor(n),b=m=>(m+t-1)%(t-1),s=(m,P,E=M0)=>{(m<0||m>=t)&&(m=m<0?-m:2*(t-1)-m,P+=(t-1)*.5);let y=Math.floor(P),k=m*t;return E(c[k+b(y-1)],c[k+b(y)],c[k+b(y+1)],c[k+b(y+2)],P-y)},h=(m,P=M0)=>s(l+m,e,P),A=h(-1),B=h(0),g=h(1),F=h(2);if(r&&f>1e-5){let m=M0(h(-1,x0),h(0,x0),h(1,x0),h(2,x0),n-l),P=x0(A,B,g,F,n-l),E=m/(2*Math.PI*f**2),y=P/(Math.PI*f),k=(t-1)*.023;r[0]=(-a*E+o*x*y)*k,r[1]=-f*f*y*k,r[2]=(o*E+a*x*y)*k}else if(r){let m=t-1,P=x>0?1:m-1,E=.023/(2*Math.sin(Math.PI/m));r[0]=(s(P,0)-s(P,m*.5))*E,r[1]=0,r[2]=(s(P,m*.25)-s(P,m*.75))*E}return M0(A,B,g,F,n-l)}function j1(t,c,o,x){let a=Math.imul(t,2376512323)^Math.imul(c,3625334849)^Math.imul(o,3407524639)^Math.imul(x,374761393);return a=Math.imul(a^a>>>16,2146121005),a=Math.imul(a^a>>>15,2221713035),(a^a>>>16)>>>0}function N0(t,c,o,{min:x,max:a,mean:r,coverage:f}={}){if(f===0)return null;let M=j1(0,0,0,o);if(f===void 0&&M>=2147483648)return null;if(x===void 0){x=1/0,a=-1/0;let h=0;for(let A of t)x=Math.min(x,A),a=Math.max(a,A),h+=A;r=h/t.length}let e=a-x;if(e===0)return x;let n=new Float64Array(96),l=Math.max(1,Math.floor((c-1)/160)),b=0;for(let h=1;h<c-1;h+=l){let A=Math.sin(Math.PI*h/(c-1));for(let B=0;B<c-1;B+=l){let g=Math.min(95,Math.floor((t[h*c+B]-x)/e*96));n[g]+=A,b+=A}}let s=b*(f??.28+.36*(M/2147483648));for(let h=0;h<n.length;h++){let A=n[h];if(A>0&&s<=A)return x+e*(h+s/A)/96;s-=A}return r}function y1(t,c,o){let x=Math.max(0,Math.min(1,(o-t)/(c-t)));return x*x*(3-2*x)}function Y0(t,c,o,x){let a=c-1,r=Math.max(1,Math.round(a/300)),f=a/65,M=.023*a/(2*Math.PI*r),e=t.slice();function n(l,b){let s=Math.floor(l),h=(s+a)%a,A=(h+1)%a,B=Math.max(0,Math.min(a,b)),g=Math.min(a-1,Math.floor(B)),F=l-s,m=B-g,P=g*c,E=e[P+h]*(1-F)+e[P+A]*F,y=e[P+c+h]*(1-F)+e[P+c+A]*F;return y1(.025,.22,o-(E*(1-m)+y*m))}for(let l=r;l<=a-r;l++){let b=l*c,s=Math.sin(Math.PI*l/a),h=y1(.08,.24,s);if(h===0)continue;let A=2*s,B=Math.max(1,Math.round(r/A));for(let g=0;g<a;g++){let F=e[b+g],m=F-o;if(m<-.2||m>.19)continue;let P=(e[b+(g+B)%a]-e[b+(g+a-B)%a])*r/(B*A),E=e[b+g+r*c]-e[b+g-r*c],y=Math.hypot(P,E),k=y*M;if(k<=.025)continue;let u=P/y,H=E/y,C=g-u*f/A,i=l-H*f,d=H*f*.58/A,I=-u*f*.58,U=y1(.19,.84,.46*n(C,i)+.27*(n(C+d,i+I)+n(C-d,i-I))),W=y1(.07,.36,k)*(.26+.74*U),O=(1-U)*y1(.025,.13,k)*(1-y1(.23,.56,k)),z=Math.min(m*.65,.058*(1-y1(.035,.19,m))),q=Math.min(-m*.64,.075*(1-y1(.055,.2,-m))),$=Math.min(m*.52,.035*(1-y1(.025,.13,m))),G=Math.min(-m*.68,.078*(1-y1(.07,.2,-m))),D=m>=0?-W*z-O*$:W*q+O*G;if(x!==void 0&&m>0){let v=y1(.025,.075,m)*(1-y1(.12,.19,m));if(x==="mesa"){let Z=.05+.035*U,K=m/Z,n1=(Math.floor(K)+y1(.16,.76,K%1))*Z;D+=.72*v*W*(n1-m)}else{let Z=.045*O*(1-y1(.07,.15,m));D+=v*(Z-.035*W)}}if(x!==void 0&&m<0){let v=-m,Z=y1(.012,.065,v)*(1-y1(.09,.2,v));D+=Z*(x==="mesa"?.064:.041)*O}let c1=F+h*D;t[b+g]=m>=0?Math.max(o,c1):Math.min(o,c1)}t[b+a]=t[b]}}var F1=2*Math.PI,O0=(t,c,o)=>Math.min(o,Math.max(c,t)),l1=(t,c,o)=>t+(c-t)*o;function k1(t,c,o){let x=O0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function k0(t,c,o=!1){let x=Math.imul(t^t>>>16,2246822507)^3355159585,a=()=>(x=Math.imul(x,1664525)+1013904223>>>0,x/4294967296),r=a(),f=r<.44?1:r<.81?2:3+Math.floor(a()*2),M=a()*F1,e=[Math.cos(M),Math.sin(M)],n=a();return Array.from({length:o?1:f},(l,b)=>{let s=b===0,h=s?0:.51+.94*a(),A=(a()-.5)*h*(f===2?.84:1.6),B=e[0]*h-e[1]*A,g=e[1]*h+e[0]*A,F=s?.87+.24*a():(f===2?.38:.24)+.39*a(),m=s?n:.12+.7*a(),P=a()*F1,E=.7+.3*a(),y=Math.cos(P),k=Math.sin(P),u=Array.from({length:12},(I,U)=>{let W=U*F1/12,O=F*Math.cos(W),z=F*E*Math.sin(W);return c(B+O*y-z*k,g+O*k+z*y)}),H=u.reduce((I,U)=>I+U,0)/u.length,C=u.indexOf(Math.min(...u)),i=u.indexOf(Math.max(...u)),d=(.41+.38*a())*F**.74*l1(1,.69,m);return{x:B,y:g,size:F,stretch:E,cos:y,sin:k,datum:H,depth:d,wear:m,low:C*F1/12,high:i*F1/12,breach:l1(.19,.66,m)+.12*a(),rim:.33+.25*a(),harmonics:3+Math.floor(a()*5),warp:.042+.075*a(),offset:a()*F1,bench:.6+.13*a(),rebound:F<.48?0:Math.floor(a()*4),reboundAngle:a()*F1,reboundHeight:.34+.41*a()}})}function S0(t,c,o,x){let a=t-x.x,r=c-x.y,f=1.53*x.size*(1.021+x.warp);if(a*a+r*r>=f*f)return o;let M=(a*x.cos+r*x.sin)/x.size,e=(r*x.cos-a*x.sin)/(x.size*x.stretch),n=Math.atan2(e,M),l=Math.cos(x.harmonics*n+x.offset+.7*Math.sin(3*n)),b=Math.cos((x.harmonics+5)*n-x.offset),s=Math.hypot(M,e)/(1+x.warp*l+.021*b);if(s>=1.53)return o;let h=k1(.76-.2*x.wear,.99,Math.cos(n-x.low)),A=x.breach*h,g=x.datum-x.depth*(1-(x.flatFloor?.065:.19)*s*s)+x.depth*(x.flatFloor?.045:.14)*(M*Math.cos(x.high)+e*Math.sin(x.high)),F=k1(x.bench-.1,x.bench,s)*(1-k1(x.bench+.08,x.bench+.18,s)),m=k1(.66-.09*x.wear,.96,s),P=k1(.84-.06*x.wear,1,s)*(1-k1(1.02,1.24+.1*x.wear,s)),E=x.depth*x.rim*P*(1+.28*l+.11*b)*(1-A),y=M*Math.cos(x.reboundAngle)+e*Math.sin(x.reboundAngle),k=e*Math.cos(x.reboundAngle)-M*Math.sin(x.reboundAngle),u=0;x.rebound===1?u=1-k1(.035,.33,Math.hypot(y+.1,k*1.35)):x.rebound===2?u=Math.max(1-k1(.02,.24,Math.hypot(y+.17,k-.08)),.76*(1-k1(.025,.2,Math.hypot(y-.19,k+.07)))):x.rebound===3&&(u=(1-k1(.025,.14,Math.abs(Math.hypot(y,k*.92)-.29)))*k1(-.66,.44,l+.5*b));let H=k1(1,1.16,s)*(1-k1(1.16,1.53,s)),C=x.depth*.11*H*(.57+.26*l+.15*b),i=g+x.depth*((1.06-.62*A)*m+.26*F+x.reboundHeight*u),d=(1-k1(.89,1.2,s))*(x.flatFloor?.98:l1(.94,.72,x.wear));return l1(o,i,d)+E+C}function P0(t,c=!1){let o=(f,M)=>j1(f,M,613,t)/4294967296,x=o(-1,0),a=c?1+Math.floor(4*x):x<.012?2:x<.08?1:0,r=o(0,0)*F1;return Array.from({length:a},(f,M)=>{let e=l1(-.54,.54,o(M,1)),n=r+M*F1/a+l1(-.39,.39,o(M,2)),l=Math.sqrt(1-e*e),b=M===0?l1(.32,.43,o(M,3)):l1(.17,.3,o(M,3));return{center:[l*Math.cos(n),e,l*Math.sin(n)],longitude:n,size:b}})}function F0(t,c,o,x,a=1,r=!1,f=x>0||r?P0(o,r):[],M=0){if(x<=0&&!f.length)return 0;let e={side:c,values:t},n=c-1,l=Math.PI/n,b=F1/n,s=(y,k)=>j1(y,k,187,o)/4294967296,h=s(0,0),A=r?Math.max(.72,a):a,B=r?l1(115,190,s(0,1)):h<.48?l1(0,5,s(0,1)):h<.79?l1(12,31,s(0,1)):l1(62,134,s(0,1)),g=Math.min(640,Math.round(x*A**2*B)),F=M**4,m=Math.round(F*l1(190,255,h)*l1(.72,1,x)),P=Math.round((M*l1(295,440,h)+710*F)*l1(.65,1,x)),E=0;for(let y=-f.length;y<g+m+P;y++){let k=y<0?f[y+f.length]:void 0,u=y>=g&&y<g+m,H=y>=g+m,C=s(y,2),i=k?.size??(H?(.008+.067*C**l1(3,2.3,F))/Math.sqrt(A):u?(.036+.092*C**2.7)/Math.sqrt(A):(.014+.103*C**2.3)/A);if(i<2.1*l||!k&&i>.28)continue;let d=Math.min(.94,Math.cos(2*i+.04)),I=Math.acos(k?.center[1]??l1(-d,d,s(y,3))),U=k?(k.longitude+F1)%F1:F1*s(y,4),W=Math.sin(I),O=Math.cos(I);if(i<1.4*b*W)continue;let z=Math.sin(U),q=Math.cos(U),$=[W*q,O,W*z],G=[-z,0,q],D=[-O*q,W,-O*z],c1=(N,V)=>{let J=Math.hypot(1,N*i,V*i);return X0(e,$.map((S,L)=>(S+i*(N*G[L]+V*D[L]))/J))},[v]=k0(j1(y,5,187,o),c1,!0),Z=s(y,6),K=k?l1(.38,.62,Z):H||u?l1(.12,.85,Z):l1(.86,.13,(y+Z)/Math.max(1,g)),n1=k?l1(.79,1.15,i/.43):v.depth*l1(1.02,.63,K)*(H?l1(.12+.065*F,.51+.15*F,C**1.8):u?l1(.42,.92,C):l1(.31,.95,(i*A-.014)/.103)),Q=k?{...v,wear:K,depth:n1,size:1,stretch:l1(.9,.99,s(y,7)),warp:.42*v.warp,breach:.18,rim:.38,rebound:s(y,8)<.32?3:0,reboundHeight:.28,flatFloor:!0}:{...v,wear:K,depth:n1,stretch:l1(.81,1,s(y,7)),rim:u?Math.max(.49,v.rim):v.rim,rebound:H&&C<.84?0:v.rebound},p=Math.asin(1.53*Q.size*(1.021+Q.warp)*i),_=Math.max(1,Math.floor((I-p)/l)),j=Math.min(n-1,Math.ceil((I+p)/l)),w=Math.ceil(Math.asin(O0(Math.sin(p)/W,0,1))/b)+1,X=Math.round(U/b);for(let N=_;N<=j;N++){let V=Math.sin(N*l),J=Math.cos(N*l);for(let S=X-w;S<=X+w;S++){let L=S*b-U,R=V*Math.sin(L)/i,Y=(W*J-O*V*Math.cos(L))/i,T=N*c+(S+n)%n;t[T]=S0(R,Y,t[T],Q)}t[N*c+n]=t[N*c]}E++}return E}var o0=2*Math.PI,R0=(t,c,o)=>Math.min(o,Math.max(c,t)),N1=(t,c,o)=>t+(c-t)*o;function h1(t,c,o){let x=R0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function V0(t){return()=>(t=Math.imul(t,1664525)+1013904223>>>0,t/4294967296)}function G0(t,c,o){let x=o0*c/t,a=Math.PI*o/t,r=Math.sin(a);return[r*Math.cos(x),Math.cos(a),r*Math.sin(x)]}function gt(t){let c=[],o=3+Math.floor(3*t());for(let x=0;x<o;x++){let a=t()*Math.PI,r=Math.cos(a),f=Math.sin(a),M=1.6*(t()-.5),e=-1.15+.38*t(),n=.2+.17*t();for(let l=e;l<1.12;l+=n*(.7+.66*t())){let b=M+.27*(t()-.5);c.push({x:l*r-b*f,y:l*f+b*r,width:.19+.23*t(),depth:.14+.32*t(),elongation:.58+.4*t()})}}return c}function wt(t,c,o,x,a){let r=.1*Math.sin(5*c+2*t),f=1-h1(.77,1.36,Math.hypot(t*.88,c));if(f<=0)return o;let M=0,e=0,n=1.4,l=1.4;for(let m of a){let P=t+r-m.x,E=c-m.y;if(Math.abs(P)*m.elongation>1.4*m.width||Math.abs(E)>1.4*m.width)continue;let y=Math.hypot(P*m.elongation,E)/m.width;y<n?(l=n,n=y):l=Math.min(l,y);let k=1-h1(.12,.95,y);M=Math.max(M,k*m.depth),e=Math.max(e,.045*h1(.19,.51,y)*(1-h1(.54,.84,y)))}let b=1-h1(.04,.24,Math.abs(c-.25*Math.sin(3.4*t)+.07*t)),s=h1(.04,.19,M),h=Math.max(M,.17*b)+.05*b*s,A=N1(o,x+.13,.7),B=.14*(1-h1(.02,.12,M))*h1(.08,.28,b+e),F=.26*((1-h1(.07,.48,l-n))*h1(.4,.79,n)*(1-h1(1.06,1.37,l)))*(.72+.28*Math.sin(7*t-9*c));return N1(o,A-h+e+B+F,f)}function T0(t,c){return c.bend*Math.sin(c.curve*t+c.phase)+c.shift*(h1(c.first-.25,c.first,t)-h1(c.last,c.last+.36,t))}function yt(t,c,o){let x={phase:c,bend:.08+.16*t(),curve:.72+1.86*t(),shift:.44*(t()-.5),first:-1.1+.86*t(),last:.12+.89*t(),width:.17+.17*t(),depth:.43+.21*o,vents:[],splays:[]},a=1+Math.floor(4*t());for(let f=0;f<a;f++){let M=-1.39+2.76*(f+.19+.63*t())/a;x.vents.push({at:M,across:T0(M,x)+.64*(t()-.5),width:.12+.26*t(),height:.28+.44*t(),crater:.09+.17*t()})}let r=Math.floor(3*t());for(let f=0;f<r;f++)x.splays.push({start:-1.32+1.65*t(),length:.76+.83*t(),reach:(t()<.5?-1:1)*(.38+.5*t())});return x}function _t(t,c,o,x,a,r){let f=1-h1(1.35,2.25,Math.abs(t));if(f<=0)return o;let{phase:M,depth:e}=a,n=a.width+.14*h1(-.68,.79,Math.cos(t*3.6+M)),l=c-T0(t,a),b=l<0?-1:1,s=h1(-.7,.7,b*Math.sin(1.9*t+M)),h=Math.abs(l)/(n*N1(1.28,.82,s)),A=x-e-r*.35*t+.1*h1(.3,.95,Math.sin(t*4.5+M)),B=h1(.46,N1(1.2,.87,s),h),g=h1(.66,.83,h)*(1-h1(.86,1.13,h)),F=1-h1(.75,1.28,h),m=h1(.48,.84,h)*(1-h1(.96,1.18,h)),P=N1(A+e*B,o,.12+.2*B);P+=.11*s*g+.065*m*(1-s);let E=N1(o,P,f*F),y=h1(.76,1.08,h)*(1-h1(1.19,1.86,h));E+=f*y*N1(.038,.21,s);let k=0;for(let{start:u,length:H,reach:C}of a.splays){let i=(t-u)/H;if(i<=0||i>=1)continue;let d=Math.abs(l-C*(.18+.82*i)),I=h1(0,.22,i)*(1-h1(.69,1,i))*(1-h1(.065,.23,d));k=Math.max(k,.23*I)}E-=k;for(let u of a.vents){let H=Math.hypot(t-u.at,c-u.across)/u.width;if(H>=1.24)continue;let C=1-h1(.09,1.24,H),i=1-h1(.1,.39,H);E+=u.height*C**1.4-u.crater*i}return E}var c0=(t,c)=>t[0]*c[0]+t[1]*c[1]+t[2]*c[2];function $0(t,c,o,x,a,r){let f={impact:[],karst:[],rift:[]},M=h1(.24,.85,x);if(c<257||M<=0)return f;let e=c-1,n=i=>(i%e+e)%e,l=Math.PI/e,b=(i,d)=>t[R0(Math.round(d),0,e)*c+n(Math.round(i))],s=a.flatMap(({overlook:i,head:d})=>[i,d]),h=V0(o^2476863307),A=[];for(let i=0;i<13;i++)for(let d=0;d<28;d++){let I=(d+h())*e/28,U=(.22+.56*(i+h())/13)*e,W=G0(e,I,U),O=.54*W[0]+.45*W[1]+.71*W[2];if(s.some(p=>c0(p,W)>.95))continue;let z=o0*Math.sin(U*l)/e,q=.067+.035*h(),$=h()*o0,G=Array.from({length:8},(p,_)=>{let j=$+_*o0/8;return b(I+q*Math.cos(j)/z,U+q*Math.sin(j)/l)}),D=G.reduce((p,_)=>p+_,0)/G.length,c1=Math.max(...G)-Math.min(...G),v=b(I,U),[,Z,K,n1]=U1({regions:r},W),Q=.54*Z+.48*K;A.push({x:I,y:U,dir:W,xStep:z,radius:q,phase:$,datum:D,relief:c1,height:v,light:O,bedrock:Q,volcanic:n1,samples:G,chance:h()})}if(!A.length)return f;let B=A.map(({datum:i})=>i).sort((i,d)=>i-d),g=B[Math.floor(B.length*.7)],F=({datum:i,height:d,light:I,relief:U,chance:W})=>1.3*I-Math.abs(i-g-.26)-.44*U-.32*Math.abs(d-i)+.2*W,m=({datum:i,height:d,light:I,relief:U,bedrock:W,chance:O})=>I-Math.abs(i-g-.36)-.65*U+.4*(d-i)+W+.3*O,P=A.sort((i,d)=>F(d)-F(i))[0],E=A.filter(({dir:i})=>c0(i,P.dir)<.94).sort((i,d)=>m(d)-m(i))[0],y=i=>({datum:d,relief:I,light:U,volcanic:W,chance:O})=>U-1.26*Math.abs(d-i)-.38*I+.64*W+.17*O,k=A.filter(({dir:i})=>c0(i,P.dir)<.91&&(!E||c0(i,E.dir)<.92)),u=(i,d)=>{let I=y(d);return i.sort((U,W)=>I(W)-I(U))[0]},H=u(k,B[Math.floor(B.length*.56)]+.3),C=H&&u(k.filter(({dir:i,datum:d})=>c0(i,H.dir)<.91&&d>H.datum+.29),g+.6);for(let[i,d]of[["impact",P],["karst",E],["rift",H],["rift",C]]){if(!d)continue;let{x:I,y:U,xStep:W,radius:O,phase:z,datum:q,chance:$}=d,G=i==="rift",D=G?d.samples.indexOf(Math.min(...d.samples)):0,c1=z+D*o0/8,v=Math.cos(c1),Z=Math.sin(c1),K=i==="impact",n1=K?k0(o,(R,Y)=>b(I+(R*v-Y*Z)*O/W,U+(R*Z+Y*v)*O/l)).sort((R,Y)=>Y.wear-R.wear):[],Q=Math.max(0,...n1.map(({x:R,y:Y,size:T,warp:t1})=>Math.hypot(R,Y)+1.53*T*(1.021+t1))),p=O*(G?2.65:K?Q:1.56),_=i==="karst"?gt(h):[],j=Math.imul(o^o>>>16,2246822507)^Math.imul(Math.floor(I),2654435761),w=G?yt(V0(j),z,$):null,X=G?R0(q-d.samples[D],.03,.28):0;for(let R=Math.max(1,Math.ceil(U-p/l));R<=Math.min(e-1,U+p/l);R++){for(let Y=Math.ceil(I-p/W);Y<=I+p/W;Y++){let T=(Y-I)*W/O,t1=(R-U)*l/O,o1=T*v+t1*Z,r1=t1*v-T*Z,a1=R*c+n(Y),x1=t[a1],s1=x1;if(K)for(let e1 of n1)s1=S0(o1,r1,s1,e1);else G?s1=_t(o1,r1,x1,q,w,X):s1=wt(o1,r1,x1,q,_);t[a1]=N1(x1,s1,M)}t[R*c+e]=t[R*c]}let N=G?1.68:K?-Math.max(1.05,Q*.46):-.97,V=G?.65:0,J=0,S=0;if(K){let R=n1.reduce((Y,T)=>Y+T.size,0);for(let Y of n1)J+=Y.x*Y.size/R,S+=Y.y*Y.size/R}let L=(R,Y)=>G0(e,I+(R*v-Y*Z)*O/W,U+(R*Z+Y*v)*O/l);f[i].push({overlook:L(J+N,S+V),target:L(J,S)})}return f}var Z1=2*Math.PI,u0=(t,c,o)=>Math.min(o,Math.max(c,t)),n0=(t,c,o)=>t+(c-t)*o;function I1(t,c,o){let x=u0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function q0(t,c,o){let x=Z1*t/o,a=Math.PI*c/o,r=Math.sin(a);return[r*Math.cos(x),Math.cos(a),r*Math.sin(x)]}function D0(t,c,o,x,a,r,f){let M=I1(.31,.76,x);if(c<513||M<=0)return;let e=c-1,n=w=>(w%e+e)%e,l=Math.PI/e,b=(w,X)=>t[u0(Math.round(X),0,e)*c+n(Math.round(w))],s=[];for(let w=0;w<24;w++){let X=Math.acos(1-(w+.5)/12)/l;for(let N=0;N<40;N++)s.push(b((N+.5)*e/40,X))}s.sort((w,X)=>w-X);let h=s[Math.floor(s.length*.74)]+.14,A=[...a.map(({head:w})=>w),...Object.values(r).flat().map(({target:w})=>w)],B=Math.imul(o^o>>>17,1757159915)^1900846437,g=()=>(B=Math.imul(B,1664525)+1013904223>>>0,B/4294967296),F;for(let w=0;w<17;w++)for(let X=0;X<32;X++){let N=(X+g())*e/32,V=(.22+.56*(w+g())/17)*e,J=q0(N,V,e);if(A.some(r1=>r1[0]*J[0]+r1[1]*J[1]+r1[2]*J[2]>.955))continue;let S=.54*J[0]+.45*J[1]+.71*J[2];if(S<.22)continue;let L=Z1*Math.sin(V*l)/e,R=.042+.018*g(),Y=g()*Z1,[,T,t1,o1]=U1({regions:f},J);for(let r1=0;r1<8;r1++){let a1=Y+r1*Z1/8,x1=Math.cos(a1),s1=Math.sin(a1),e1=b(N-x1*R/L,V-s1*R/l),M1=b(N+x1*R/L,V+s1*R/l),m1=e1-M1;if(M1<h-.2||m1<.16||m1>1.3)continue;let f1=b(N,V),p1=.92*S-.6*Math.abs(m1-.56)-.54*Math.abs(f1-(e1+M1)*.5)-.38*Math.abs(M1-h)+.31*o1+.19*T+.12*t1+.2*g();(!F||p1>F.score)&&(F={x:N,y:V,xStep:L,size:R,dx:x1,dy:s1,high:e1,low:M1,score:p1})}}if(!F)return;let{x:m,y:P,xStep:E,size:y,dx:k,dy:u,high:H,low:C}=F,i=.15+.15*g(),d=g()*Z1,I=.7+.6*g(),U=g(),W=(Math.imul(o^o>>>16,2654435761)>>>0)%3,O=.42+.19*g(),z=(w,X=0)=>i*Math.sin(2.4*w+d)+X*O*I1(-.36,.68,w),q=w=>n0(H,C,u0((w+.95)/1.9,0,1)**I),$=[];function G(w,X,N,V){$.push({u:w,v:z(w,X)+.17*(g()-.5),length:N,width:V,level:q(w),phase:g()*Z1,chemistry:u0(.82*U+.33*g()-.06,0,1)})}function D(w,X,N,V,J){let S=(X-w)/V;for(let L=0;L<V;L++){let R=w+S*(L+.48+.32*(g()-.5));G(R,N,S*(.39+.21*g()),J*(.62+.52*g()))}}W===0?(G(-.68,0,.3,.54+.19*g()),D(-.37,.97,-1,2+Math.floor(2*g()),.31),D(-.11,1,1,2+Math.floor(2*g()),.36)):W===1?D(-1,1.04,0,3+Math.floor(4*g()),.54):(G(-.54,0,.55+.1*g(),.68+.13*g()),D(.12,1.1,0,2+Math.floor(2*g()),.46)),$.sort((w,X)=>w.u-X.u);let c1=2.1*y,v=c1/E,Z=c1/l,K=[m/e,P/e,v/e,Z/e],n1=new Uint32Array(96**2),Q={height:0,wet:0,crust:0,tint:0},p=(w,X,N)=>{let V=(w-m)*E/y,J=(X-P)*l/y,S=V*k+J*u,L=J*k-V*u,R=W===0?Math.min(Math.abs(L-z(S,-1)),Math.abs(L-z(S,1))):Math.abs(L-z(S)),Y=(1-I1(.045,.16,R))*I1(-1.23,-.83,S)*(1-I1(.89,1.42,S)),T=q(S),t1=n0(N,Math.min(N,T),.42*Y),o1=0,r1=Y*.43,a1=U;for(let x1 of $){let s1=(S-x1.u)/x1.length,e1=(L-x1.v)/x1.width;if(Math.abs(s1)>1.62||Math.abs(e1)>1.62)continue;let M1=Math.atan2(e1,s1),m1=1+.097*Math.sin(3*M1+x1.phase)+.042*Math.cos(7*M1-x1.phase),f1=Math.hypot(s1,e1)/m1;if(f1>=1.42)continue;let p1=I1(.52,.98,Math.cos(M1))*(1-I1(.09,.29,Math.abs(e1))),i1=I1(.76,.93,f1)*(1-I1(1,1.24,f1)),u1=I1(1.02,1.23,f1)*(1-I1(1.27,1.42,f1)),w1=x1.level+i1*(.077-.063*p1)-.05*u1,b1=1-I1(.83,1.42,f1);t1=n0(t1,w1,b1);let S1=1-I1(.64,.8,f1),C1=(1-I1(1.01,1.42,f1))*I1(.58,.85,f1);o1=n0(o1,S1,b1),C1>r1&&(r1=C1,a1=x1.chemistry*(.61+.39*i1))}Q.height=n0(N,t1,M),Q.wet=o1*M,Q.crust=r1*M,Q.tint=a1};for(let w=Math.ceil(P-Z);w<=Math.floor(P+Z);w++){for(let X=Math.ceil(m-v);X<=Math.floor(m+v);X++){let N=w*c+n(X);p(X,w,t[N]),t[N]=Q.height}t[w*c+e]=t[w*c]}let _=95;for(let w=0;w<=_;w++)for(let X=0;X<=_;X++)p(m+(2*X/_-1)*v,P+(2*w/_-1)*Z,0),n1[w*96+X]=1056964608|Math.round(255*Q.wet)|Math.round(255*Q.crust)<<8|Math.round(255*Q.tint)<<16;let j=(w,X)=>q0(m+(w*k-X*u)*y/E,P+(w*u+X*k)*y/l,e);return r.springs=[{overlook:j(.86,.82),target:j(-.12,0)}],{chart:K,values:n1,side:96}}var a0=2*Math.PI,s0=(t,c,o)=>Math.min(o,Math.max(c,t)),K1=(t,c,o)=>t+(c-t)*o;function H1(t,c,o){let x=s0((o-t)/(c-t),0,1);return x*x*(3-2*x)}function Z0(t,c,o){let x=Math.PI*c/o,a=a0*t/o;return[Math.sin(x)*Math.cos(a),Math.cos(x),Math.sin(x)*Math.sin(a)]}function C0(t,c){let o=t-Math.floor(t),x=Math.min(o/c,(1-o)/(1-c));return x*x*(1.32-.32*x)}function K0(t,c,o,x,a,r,f){let M=H1(.32,.76,x);if(c<513||M<=0)return;let e=c-1,n=Math.PI/e,l=S=>(S%e+e)%e,b=(S,L)=>t[s0(Math.round(L),0,e)*c+l(Math.round(S))],s=Math.imul(o^o>>>16,2221713035)^458671337,h=()=>(s=Math.imul(s,1664525)+1013904223>>>0,s/4294967296),A=[...a.map(({head:S})=>S),...Object.values(r).flat().map(({target:S})=>S)],B=[];for(let S=0;S<20;S++){let L=Math.acos(1-(S+.5)/10)/n;for(let R=0;R<36;R++)B.push(b((R+.5)*e/36,L))}B.sort((S,L)=>S-L);let g=B[Math.floor(B.length*.75)],F;for(let S=0;S<18;S++)for(let L=0;L<36;L++){let R=(L+h())*e/36,Y=(.23+.54*(S+h())/18)*e,T=Z0(R,Y,e),t1=.54*T[0]+.45*T[1]+.71*T[2];if(t1<.22||A.some(p1=>p1[0]*T[0]+p1[1]*T[1]+p1[2]*T[2]>.934))continue;let o1=a0*Math.sin(Y*n)/e,r1=.066+.027*h(),a1=Array.from({length:8},(p1,i1)=>{let u1=i1*a0/8;return b(R+r1*Math.cos(u1)/o1,Y+r1*Math.sin(u1)/n)}),x1=b(R,Y);if(x1<g-.12)continue;let s1=a1.reduce((p1,i1)=>p1+i1,0)/a1.length,e1=Math.max(...a1)-Math.min(...a1),[,M1,,m1]=U1({regions:f},T),f1=.8*t1-.52*Math.abs(x1-g-.17)+.55*s0(s1-x1,-.6,.65)-.26*s0(e1-.33,0,1.6)+.3*M1+.39*m1+.18*h();(!F||f1>F.score)&&(F={x:R,y:Y,xStep:o1,radius:r1,center:x1,mean:s1,volcanic:m1,score:f1})}if(!F)return;let{x:m,y:P,xStep:E,radius:y,center:k,mean:u,volcanic:H}=F,C=h()*a0,i=Math.cos(C),d=Math.sin(C),I=h()*a0,U=(Math.imul(o^o>>>17,2146121005)>>>0)%3,W=3.05+1.24*h(),O=s0(.7*H+.55*h()-.1,0,1),z=K1(k,u,.19),q=.19+.16*h(),$=q*(.68+.58*h()),G=0,D=0,c1=1/0;for(let S=0;S<18;S++){let L=.14+.56*h(),R=.86*(h()-.5),Y=b(m+(i*L-d*R)*y/E,P+(d*L+i*R)*y/n);Y<c1&&(G=L,D=R,c1=Y)}c1=Math.max(z-.19,c1-.055);let v=Array.from({length:20+Math.floor(12*h())},()=>({x:1.94*(h()-.5),y:1.9*(h()-.5),length:.15+.2*h(),width:.17+.23*h(),height:.09+.15*h(),curve:.22+.6*h()})),Z=1.37*y/E,K=1.37*y/n,n1=[m/e,P/e,Z/e,K/e],Q=new Uint32Array(96**2),p={height:0,sand:0,salt:0};function _(S,L,R){let Y=(S-m)*E/y,T=(L-P)*n/y,t1=i*Y+d*T,o1=i*T-d*Y,r1=1-H1(.71,1.21,Math.hypot(t1*.95,o1)),a1=z+.12*o1+.075*t1*t1,x1=H1(.19,.59,R-a1),s1=H1(-.63,.62,.65*Math.sin(5.7*o1+I+1.5*t1)+.36*Math.cos(7.2*t1-4.5*o1)),e1=r1*(1-x1)*K1(.53,1,s1),M1=Math.hypot((t1-G)/$,(o1-D)/q)+.1*Math.sin(17*o1+5*t1+I),m1=r1*(1-H1(.63,1.23,M1))*(1-H1(c1+.15,c1+.33,R)),f1;if(U===1){f1=0;for(let i1 of v){let u1=(o1-i1.y)/i1.width;if(Math.abs(u1)>=1)continue;let w1=u1*u1,b1=(t1-i1.x)/i1.length-i1.curve*w1,S1=(1-H1(.06,1,Math.abs(u1)))*H1(-1,.48,b1)*(1-H1(.48,.83,b1));f1=Math.max(f1,i1.height*S1)}}else{let i1=t1+.095*Math.sin(4.6*o1+I)+.054*Math.cos(10*o1-3.4*t1),u1=C0(W*i1+.18*Math.sin(o1*7+I),.76);if(U===2){let w1=C0(W*(o1*.67-.77*t1+.08*Math.sin(t1*8+I)),.68),b1=C0(W*(o1*.72+.63*t1+.13*Math.sin(o1*6-I)),.72);f1=.13*u1+.115*w1*b1+.082*u1*Math.max(w1,b1)}else f1=.22*u1}let p1=K1(R,a1+f1*K1(.49,1.18,s1),e1*.92);p.height=K1(R,K1(p1,c1,m1*.95),M),p.sand=e1*(1-m1)*M,p.salt=m1*M}let j=95;for(let S=0;S<=j;S++)for(let L=0;L<=j;L++){let R=m+(2*L/j-1)*Z,Y=P+(2*S/j-1)*K;_(R,Y,b(R,Y)),Q[S*96+L]=1056964608|Math.round(255*p.sand)|Math.round(255*p.salt)<<8|Math.round(255*O)<<16}for(let S=Math.ceil(P-K);S<=Math.floor(P+K);S++){for(let L=Math.ceil(m-Z);L<=Math.floor(m+Z);L++){let R=S*c+l(L);_(L,S,t[R]),t[R]=p.height}t[S*c+e]=t[S*c]}let w=(S,L)=>Z0(m+(S*i-L*d)*y/E,P+(S*d+L*i)*y/n,e);r.dunes=[{overlook:w(.94,.69),target:w(-.07,0)}];let X=w(-.01,0),V=w(.01,0).map((S,L)=>S-X[L]),J=Math.hypot(...V);return{chart:n1,values:Q,side:96,wind:V.map(S=>S/J)}}var It=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],At=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],J0=[[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,9,8,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,2,10,0,2,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,8,3,2,10,8,10,9,8,-1,-1,-1,-1,-1,-1,-1],[3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,8,11,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,11,2,1,9,11,9,8,11,-1,-1,-1,-1,-1,-1,-1],[3,10,1,11,10,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,10,1,0,8,10,8,11,10,-1,-1,-1,-1,-1,-1,-1],[3,9,0,3,11,9,11,10,9,-1,-1,-1,-1,-1,-1,-1],[9,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,7,3,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,1,9,4,7,1,7,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,8,4,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,4,7,3,0,4,1,2,10,-1,-1,-1,-1,-1,-1,-1],[9,2,10,9,0,2,8,4,7,-1,-1,-1,-1,-1,-1,-1],[2,10,9,2,9,7,2,7,3,7,9,4,-1,-1,-1,-1],[8,4,7,3,11,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,4,7,11,2,4,2,0,4,-1,-1,-1,-1,-1,-1,-1],[9,0,1,8,4,7,2,3,11,-1,-1,-1,-1,-1,-1,-1],[4,7,11,9,4,11,9,11,2,9,2,1,-1,-1,-1,-1],[3,10,1,3,11,10,7,8,4,-1,-1,-1,-1,-1,-1,-1],[1,11,10,1,4,11,1,0,4,7,11,4,-1,-1,-1,-1],[4,7,8,9,0,11,9,11,10,11,0,3,-1,-1,-1,-1],[4,7,11,4,11,9,9,11,10,-1,-1,-1,-1,-1,-1,-1],[9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,5,4,1,5,0,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,5,4,8,3,5,3,1,5,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,10,9,5,4,-1,-1,-1,-1,-1,-1,-1],[5,2,10,5,4,2,4,0,2,-1,-1,-1,-1,-1,-1,-1],[2,10,5,3,2,5,3,5,4,3,4,8,-1,-1,-1,-1],[9,5,4,2,3,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,11,2,0,8,11,4,9,5,-1,-1,-1,-1,-1,-1,-1],[0,5,4,0,1,5,2,3,11,-1,-1,-1,-1,-1,-1,-1],[2,1,5,2,5,8,2,8,11,4,8,5,-1,-1,-1,-1],[10,3,11,10,1,3,9,5,4,-1,-1,-1,-1,-1,-1,-1],[4,9,5,0,8,1,8,10,1,8,11,10,-1,-1,-1,-1],[5,4,0,5,0,11,5,11,10,11,0,3,-1,-1,-1,-1],[5,4,8,5,8,10,10,8,11,-1,-1,-1,-1,-1,-1,-1],[9,7,8,5,7,9,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,3,0,9,5,3,5,7,3,-1,-1,-1,-1,-1,-1,-1],[0,7,8,0,1,7,1,5,7,-1,-1,-1,-1,-1,-1,-1],[1,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,7,8,9,5,7,10,1,2,-1,-1,-1,-1,-1,-1,-1],[10,1,2,9,5,0,5,3,0,5,7,3,-1,-1,-1,-1],[8,0,2,8,2,5,8,5,7,10,5,2,-1,-1,-1,-1],[2,10,5,2,5,3,3,5,7,-1,-1,-1,-1,-1,-1,-1],[7,9,5,7,8,9,3,11,2,-1,-1,-1,-1,-1,-1,-1],[9,5,7,9,7,2,9,2,0,2,7,11,-1,-1,-1,-1],[2,3,11,0,1,8,1,7,8,1,5,7,-1,-1,-1,-1],[11,2,1,11,1,7,7,1,5,-1,-1,-1,-1,-1,-1,-1],[9,5,8,8,5,7,10,1,3,10,3,11,-1,-1,-1,-1],[5,7,0,5,0,9,7,11,0,1,0,10,11,10,0,-1],[11,10,0,11,0,3,10,5,0,8,0,7,5,7,0,-1],[11,10,5,7,11,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,0,1,5,10,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,8,3,1,9,8,5,10,6,-1,-1,-1,-1,-1,-1,-1],[1,6,5,2,6,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,6,5,1,2,6,3,0,8,-1,-1,-1,-1,-1,-1,-1],[9,6,5,9,0,6,0,2,6,-1,-1,-1,-1,-1,-1,-1],[5,9,8,5,8,2,5,2,6,3,2,8,-1,-1,-1,-1],[2,3,11,10,6,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,0,8,11,2,0,10,6,5,-1,-1,-1,-1,-1,-1,-1],[0,1,9,2,3,11,5,10,6,-1,-1,-1,-1,-1,-1,-1],[5,10,6,1,9,2,9,11,2,9,8,11,-1,-1,-1,-1],[6,3,11,6,5,3,5,1,3,-1,-1,-1,-1,-1,-1,-1],[0,8,11,0,11,5,0,5,1,5,11,6,-1,-1,-1,-1],[3,11,6,0,3,6,0,6,5,0,5,9,-1,-1,-1,-1],[6,5,9,6,9,11,11,9,8,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,3,0,4,7,3,6,5,10,-1,-1,-1,-1,-1,-1,-1],[1,9,0,5,10,6,8,4,7,-1,-1,-1,-1,-1,-1,-1],[10,6,5,1,9,7,1,7,3,7,9,4,-1,-1,-1,-1],[6,1,2,6,5,1,4,7,8,-1,-1,-1,-1,-1,-1,-1],[1,2,5,5,2,6,3,0,4,3,4,7,-1,-1,-1,-1],[8,4,7,9,0,5,0,6,5,0,2,6,-1,-1,-1,-1],[7,3,9,7,9,4,3,2,9,5,9,6,2,6,9,-1],[3,11,2,7,8,4,10,6,5,-1,-1,-1,-1,-1,-1,-1],[5,10,6,4,7,2,4,2,0,2,7,11,-1,-1,-1,-1],[0,1,9,4,7,8,2,3,11,5,10,6,-1,-1,-1,-1],[9,2,1,9,11,2,9,4,11,7,11,4,5,10,6,-1],[8,4,7,3,11,5,3,5,1,5,11,6,-1,-1,-1,-1],[5,1,11,5,11,6,1,0,11,7,11,4,0,4,11,-1],[0,5,9,0,6,5,0,3,6,11,6,3,8,4,7,-1],[6,5,9,6,9,11,4,7,9,7,11,9,-1,-1,-1,-1],[10,4,9,6,4,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,10,6,4,9,10,0,8,3,-1,-1,-1,-1,-1,-1,-1],[10,0,1,10,6,0,6,4,0,-1,-1,-1,-1,-1,-1,-1],[8,3,1,8,1,6,8,6,4,6,1,10,-1,-1,-1,-1],[1,4,9,1,2,4,2,6,4,-1,-1,-1,-1,-1,-1,-1],[3,0,8,1,2,9,2,4,9,2,6,4,-1,-1,-1,-1],[0,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,3,2,8,2,4,4,2,6,-1,-1,-1,-1,-1,-1,-1],[10,4,9,10,6,4,11,2,3,-1,-1,-1,-1,-1,-1,-1],[0,8,2,2,8,11,4,9,10,4,10,6,-1,-1,-1,-1],[3,11,2,0,1,6,0,6,4,6,1,10,-1,-1,-1,-1],[6,4,1,6,1,10,4,8,1,2,1,11,8,11,1,-1],[9,6,4,9,3,6,9,1,3,11,6,3,-1,-1,-1,-1],[8,11,1,8,1,0,11,6,1,9,1,4,6,4,1,-1],[3,11,6,3,6,0,0,6,4,-1,-1,-1,-1,-1,-1,-1],[6,4,8,11,6,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,10,6,7,8,10,8,9,10,-1,-1,-1,-1,-1,-1,-1],[0,7,3,0,10,7,0,9,10,6,7,10,-1,-1,-1,-1],[10,6,7,1,10,7,1,7,8,1,8,0,-1,-1,-1,-1],[10,6,7,10,7,1,1,7,3,-1,-1,-1,-1,-1,-1,-1],[1,2,6,1,6,8,1,8,9,8,6,7,-1,-1,-1,-1],[2,6,9,2,9,1,6,7,9,0,9,3,7,3,9,-1],[7,8,0,7,0,6,6,0,2,-1,-1,-1,-1,-1,-1,-1],[7,3,2,6,7,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,11,10,6,8,10,8,9,8,6,7,-1,-1,-1,-1],[2,0,7,2,7,11,0,9,7,6,7,10,9,10,7,-1],[1,8,0,1,7,8,1,10,7,6,7,10,2,3,11,-1],[11,2,1,11,1,7,10,6,1,6,7,1,-1,-1,-1,-1],[8,9,6,8,6,7,9,1,6,11,6,3,1,3,6,-1],[0,9,1,11,6,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,8,0,7,0,6,3,11,0,11,6,0,-1,-1,-1,-1],[7,11,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,8,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,1,9,11,7,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,1,9,8,3,1,11,7,6,-1,-1,-1,-1,-1,-1,-1],[10,1,2,6,11,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,8,6,11,7,-1,-1,-1,-1,-1,-1,-1],[2,9,0,2,10,9,6,11,7,-1,-1,-1,-1,-1,-1,-1],[6,11,7,2,10,3,10,8,3,10,9,8,-1,-1,-1,-1],[7,2,3,6,2,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[7,0,8,7,6,0,6,2,0,-1,-1,-1,-1,-1,-1,-1],[2,7,6,2,3,7,0,1,9,-1,-1,-1,-1,-1,-1,-1],[1,6,2,1,8,6,1,9,8,8,7,6,-1,-1,-1,-1],[10,7,6,10,1,7,1,3,7,-1,-1,-1,-1,-1,-1,-1],[10,7,6,1,7,10,1,8,7,1,0,8,-1,-1,-1,-1],[0,3,7,0,7,10,0,10,9,6,10,7,-1,-1,-1,-1],[7,6,10,7,10,8,8,10,9,-1,-1,-1,-1,-1,-1,-1],[6,8,4,11,8,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,6,11,3,0,6,0,4,6,-1,-1,-1,-1,-1,-1,-1],[8,6,11,8,4,6,9,0,1,-1,-1,-1,-1,-1,-1,-1],[9,4,6,9,6,3,9,3,1,11,3,6,-1,-1,-1,-1],[6,8,4,6,11,8,1,2,10,-1,-1,-1,-1,-1,-1,-1],[1,2,10,3,0,11,0,6,11,0,4,6,-1,-1,-1,-1],[4,11,8,4,6,11,0,2,9,2,10,9,-1,-1,-1,-1],[10,9,3,10,3,2,9,4,3,11,3,6,4,6,3,-1],[8,2,3,8,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1],[0,4,2,4,6,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,9,0,2,3,4,2,4,6,4,3,8,-1,-1,-1,-1],[1,9,4,1,4,2,2,4,6,-1,-1,-1,-1,-1,-1,-1],[8,1,3,8,4,1,4,6,1,6,10,1,-1,-1,-1,-1],[10,1,0,10,0,6,6,0,4,-1,-1,-1,-1,-1,-1,-1],[4,6,3,4,3,8,6,10,3,0,3,9,10,9,3,-1],[10,9,4,6,10,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,5,7,6,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,5,11,7,6,-1,-1,-1,-1,-1,-1,-1],[5,0,1,5,4,0,7,6,11,-1,-1,-1,-1,-1,-1,-1],[11,7,6,8,3,4,3,5,4,3,1,5,-1,-1,-1,-1],[9,5,4,10,1,2,7,6,11,-1,-1,-1,-1,-1,-1,-1],[6,11,7,1,2,10,0,8,3,4,9,5,-1,-1,-1,-1],[7,6,11,5,4,10,4,2,10,4,0,2,-1,-1,-1,-1],[3,4,8,3,5,4,3,2,5,10,5,2,11,7,6,-1],[7,2,3,7,6,2,5,4,9,-1,-1,-1,-1,-1,-1,-1],[9,5,4,0,8,6,0,6,2,6,8,7,-1,-1,-1,-1],[3,6,2,3,7,6,1,5,0,5,4,0,-1,-1,-1,-1],[6,2,8,6,8,7,2,1,8,4,8,5,1,5,8,-1],[9,5,4,10,1,6,1,7,6,1,3,7,-1,-1,-1,-1],[1,6,10,1,7,6,1,0,7,8,7,0,9,5,4,-1],[4,0,10,4,10,5,0,3,10,6,10,7,3,7,10,-1],[7,6,10,7,10,8,5,4,10,4,8,10,-1,-1,-1,-1],[6,9,5,6,11,9,11,8,9,-1,-1,-1,-1,-1,-1,-1],[3,6,11,0,6,3,0,5,6,0,9,5,-1,-1,-1,-1],[0,11,8,0,5,11,0,1,5,5,6,11,-1,-1,-1,-1],[6,11,3,6,3,5,5,3,1,-1,-1,-1,-1,-1,-1,-1],[1,2,10,9,5,11,9,11,8,11,5,6,-1,-1,-1,-1],[0,11,3,0,6,11,0,9,6,5,6,9,1,2,10,-1],[11,8,5,11,5,6,8,0,5,10,5,2,0,2,5,-1],[6,11,3,6,3,5,2,10,3,10,5,3,-1,-1,-1,-1],[5,8,9,5,2,8,5,6,2,3,8,2,-1,-1,-1,-1],[9,5,6,9,6,0,0,6,2,-1,-1,-1,-1,-1,-1,-1],[1,5,8,1,8,0,5,6,8,3,8,2,6,2,8,-1],[1,5,6,2,1,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,6,1,6,10,3,8,6,5,6,9,8,9,6,-1],[10,1,0,10,0,6,9,5,0,5,6,0,-1,-1,-1,-1],[0,3,8,5,6,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[10,5,6,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,7,5,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[11,5,10,11,7,5,8,3,0,-1,-1,-1,-1,-1,-1,-1],[5,11,7,5,10,11,1,9,0,-1,-1,-1,-1,-1,-1,-1],[10,11,7,10,7,5,9,8,1,8,3,1,-1,-1,-1,-1],[11,1,2,11,7,1,7,5,1,-1,-1,-1,-1,-1,-1,-1],[0,8,3,1,2,7,1,7,5,7,2,11,-1,-1,-1,-1],[9,7,5,9,2,7,9,0,2,2,11,7,-1,-1,-1,-1],[7,5,2,7,2,11,5,9,2,3,2,8,9,8,2,-1],[2,5,10,2,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1],[8,2,0,8,5,2,8,7,5,10,2,5,-1,-1,-1,-1],[9,0,1,5,10,3,5,3,7,3,10,2,-1,-1,-1,-1],[9,8,2,9,2,1,8,7,2,10,2,5,7,5,2,-1],[1,3,5,3,7,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,8,7,0,7,1,1,7,5,-1,-1,-1,-1,-1,-1,-1],[9,0,3,9,3,5,5,3,7,-1,-1,-1,-1,-1,-1,-1],[9,8,7,5,9,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[5,8,4,5,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1],[5,0,4,5,11,0,5,10,11,11,3,0,-1,-1,-1,-1],[0,1,9,8,4,10,8,10,11,10,4,5,-1,-1,-1,-1],[10,11,4,10,4,5,11,3,4,9,4,1,3,1,4,-1],[2,5,1,2,8,5,2,11,8,4,5,8,-1,-1,-1,-1],[0,4,11,0,11,3,4,5,11,2,11,1,5,1,11,-1],[0,2,5,0,5,9,2,11,5,4,5,8,11,8,5,-1],[9,4,5,2,11,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,5,10,3,5,2,3,4,5,3,8,4,-1,-1,-1,-1],[5,10,2,5,2,4,4,2,0,-1,-1,-1,-1,-1,-1,-1],[3,10,2,3,5,10,3,8,5,4,5,8,0,1,9,-1],[5,10,2,5,2,4,1,9,2,9,4,2,-1,-1,-1,-1],[8,4,5,8,5,3,3,5,1,-1,-1,-1,-1,-1,-1,-1],[0,4,5,1,0,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[8,4,5,8,5,3,9,0,5,0,3,5,-1,-1,-1,-1],[9,4,5,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,11,7,4,9,11,9,10,11,-1,-1,-1,-1,-1,-1,-1],[0,8,3,4,9,7,9,11,7,9,10,11,-1,-1,-1,-1],[1,10,11,1,11,4,1,4,0,7,4,11,-1,-1,-1,-1],[3,1,4,3,4,8,1,10,4,7,4,11,10,11,4,-1],[4,11,7,9,11,4,9,2,11,9,1,2,-1,-1,-1,-1],[9,7,4,9,11,7,9,1,11,2,11,1,0,8,3,-1],[11,7,4,11,4,2,2,4,0,-1,-1,-1,-1,-1,-1,-1],[11,7,4,11,4,2,8,3,4,3,2,4,-1,-1,-1,-1],[2,9,10,2,7,9,2,3,7,7,4,9,-1,-1,-1,-1],[9,10,7,9,7,4,10,2,7,8,7,0,2,0,7,-1],[3,7,10,3,10,2,7,4,10,1,10,0,4,0,10,-1],[1,10,2,8,7,4,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,7,1,3,-1,-1,-1,-1,-1,-1,-1],[4,9,1,4,1,7,0,8,1,8,7,1,-1,-1,-1,-1],[4,0,3,7,4,3,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[4,8,7,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[9,10,8,10,11,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,11,9,10,-1,-1,-1,-1,-1,-1,-1],[0,1,10,0,10,8,8,10,11,-1,-1,-1,-1,-1,-1,-1],[3,1,10,11,3,10,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,2,11,1,11,9,9,11,8,-1,-1,-1,-1,-1,-1,-1],[3,0,9,3,9,11,1,2,9,2,11,9,-1,-1,-1,-1],[0,2,11,8,0,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[3,2,11,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,10,8,9,-1,-1,-1,-1,-1,-1,-1],[9,10,2,0,9,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[2,3,8,2,8,10,0,1,8,1,10,8,-1,-1,-1,-1],[1,10,2,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[1,3,8,9,1,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,9,1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[0,3,8,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1],[-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1,-1]],kt=Uint32Array.from(J0.flat(),t=>t>>>0),St={name:"Bourke",corners:It,edges:At,maxVertices:15,table:kt,cornerBit:t=>1<<t,createPolygonizer(){return(t,c,o)=>{let x=J0[c],a=0;for(;a<15&&x[a]>=0;)o[a]=x[a],a++;return a}}};var Q0=St;var Pt=new Uint32Array([0,2181,2182,2197,2179,6166,2205,2371,2180,2199,6164,2326,2193,2380,2335,1167,2178,2203,6152,2356,10243,14359,14356,1317,6158,2344,18434,1181,14357,1345,24580,272,2177,6154,2201,2338,6150,18432,2323,1177,10242,14350,14353,1341,14349,24578,1313,269,2187,2374,2359,1171,14355,24579,1349,302,14351,1329,24586,284,20481,12289,12297,135,2176,10241,6148,14343,2191,14347,2347,1337,6146,14342,18438,24577,2341,1309,1173,266,6162,14346,18437,24585,14358,20482,24584,12304,18433,24576,28672,16387,24582,12292,16391,4112,2185,14344,2362,1325,2377,24581,1169,305,14348,20480,24587,12306,1353,12290,281,141,2311,1333,1185,317,1321,12293,320,147,24583,12288,16388,4096,12291,8192,4108,127,896,265,538,2866,2373,1864,1974,1701,4489,312,4762,146,6970,794,4784,2944,4165,261,6517,2439,4928,884,7077,1973,5254,2920,5653,534,5926,1842,5226,2378,6469,56,4361,1864,5797,265,6469,538,5797,811,6070,538,6070,56,6962,1864,4634,56,6962,265,5797,2164,6469,1974,6405,4149,5203,2115,6516,6423,6257,129,5637,6480,4458,262,6725,6466,4682,402,5029,6998,4906,2869,4518,6066,4631,1649,6022,6150,7008,944,6196,4900,5954,2930,4666,5002,4520,24,4393,4793,4251,779,5285,6790,5258,1896,7013,6036,6073,1435,5797,896,6070,265,4634,1864,6469,2866,4261,6149,6243,5765,5795,928,6038,4534,4457,6512,6064,177,5962,6050,6258,6721,5249,386,4789,6964,6467,5556,5522,659,7066,6448,2483,6154,4122,2954,6299,6930,2961,4746,4994,2472,4678,5145,1057,6309,5253,2984,4134,4199,120,6213,5432,309,5994,6791,2442,5909,4530,379,4469,5896,1808,5158,6194,584,4202,5216,266,4425,4468,881,5163,5963,36,4773,5426,1845,5685,4971,339,5781,5641,518,6453,5008,1875,5046,4960,1030,6586,6068,2964,6054,5914,791,6693,4677,66,6501,6582,2233,5226,6804,896,5797,4489,312,5797,6155,43,7077,5499,56,5653,5665,2051,5797,4148,884,6326,5704,265,7077,6069,265,4762,6070,146,6070,4489,312,5926,5938,265,4165,6070,261,4762,4617,1864,6517,4634,2169,5254,4634,2230,4890,6970,2164,4634,4980,1027,5653,4630,2164,6469,4784,2944,6469,6970,794,5226,6474,811,6517,6535,691,4165,5392,2866,6469,5926,1842,4970,6410,4244,6148,5764,4998,928,6293,4517,4970,5521,5025,6243,2134,4261,6838,4138,6699,6251,5480,88,4261,6021,6267,5003,6715,4154,88,5765,4662,4897,4145,5377,6149,2147,4261,5206,4982,5748,4180,5024,2614,5270,6472,4248,6920,4363,5659,361,6037,4517,4538,6421,4247,6919,177,6566,5794,7010,4274,6064,6512,1942,6038,4411,6968,6072,6520,4457,438,6038,5936,4146,4354,5650,6422,2416,4453,5957,5974,5892,7009,4273,2823,5274,4616,6153,5257,5962,4730,1832,6565,5978,4521,6169,4632,5928,634,5286,6322,4790,6694,4516,6164,386,5146,7034,6067,6259,4483,5249,1191,5146,4116,4355,4627,5923,6695,1191,5701,5141,5958,4726,6258,4482,2068,6437,7044,5248,6464,4752,6994,1460,6565,4889,6426,7002,5211,4939,1081,7018,6982,4794,6442,4905,5177,843,4789,5016,4999,6967,5559,6437,659,6981,4389,4624,4896,5168,6964,2898,4709,5492,5479,4935,6467,4755,2341,4970,6410,5024,5764,902,5765,4970,6293,4410,2147,4261,6230,4138,6251,88,4261,6021,4184,6715,58,5765,4662,6243,5377,2053,4261,6710,4180,4982,928,5270,4457,6920,4363,1563,6037,4538,4273,4247,2823,6566,6038,4274,6064,2416,6038,4411,5659,6520,361,6038,4390,5936,6512,2326,4453,5892,6919,7009,177,5274,4616,5928,5962,634,6773,4730,6169,4632,1832,5286,6322,4482,4516,2068,5962,7034,4483,5249,2625,5146,4116,5923,6695,1191,5141,4726,6164,6258,386,6437,7044,5556,4752,2898,6837,4889,5177,5211,843,6982,6442,4939,4905,1081,4789,5016,4755,5559,2341,4789,4389,5168,6964,1460,4709,6437,5940,6467,659,6469,4634,1974,4787,6260,265,5797,6962,2164,6469,4634,56,6469,6070,56,5797,6962,265,5797,4361,1864,4634,6070,896,7013,6581,4634,6036,2967,7058,6260,6960,6576,2322,5285,6790,6962,6262,2212,6469,5002,6145,6785,2595,7013,4992,6036,7063,2485,5797,4393,7058,6960,2480,5285,6262,4361,6308,2694,6070,4666,6307,6145,2689,6725,6070,4682,4633,1065,4361,5251,4675,4791,1063,5797,4724,4791,5251,579,6725,4152,4633,5161,586,6469,6150,5752,4155,1547,5637,4245,4458,4907,97,5637,4245,4458,5960,97,6022,4634,4155,5643,104,6469,4518,5910,6066,370,4907,5961,4360,5912,377,5029,6998,5960,4955,810,6405,4634,4944,4996,1332,6405,5428,6070,4996,848,5029,6998,4361,4906,859,5797,5961,4473,4360,1816,4518,4992,6066,4466,1814,7269,7258,6084,7291,7316,7193,7201,7330,3254,7284,7351,7211,4553,7186,7177,7216,7299,3144,7333,7274,7218,7299,7240,7252,7286,7351,3115,6853,7224,7203,7330,7237,7316,7193,7169,3200,7269,6597,7350,7227,7171,7296,6084,7288,3220,5829,7274,7317,7177,7216,7347,7211,7186,3233,7317,7274,7184,7329,7240,7286,7303,7252,3081,7194,6086,7169,7296,7288,7350,7227,7203,3234,7269,7334,7257,4546,7346,6084,7291,7316,3098,7211,4553,7186,7241,7284,7303,7176,7216,3251,7333,7252,7286,7240,7210,7218,7347,7275,3207,7237,4810,7300,7224,7203,7257,7194,7169,3216,7269,7171,7312,7257,7350,6084,7291,7300,3128,7333,7254,7177,7216,7347,7275,7210,7186,3217,7333,7274,7252,7286,7303,7176,4553,7184,3145,7334,6086,7194,7169,7296,7224,7203,7346,3195,6853,7334,7316,7193,7201,7346,7291,7271,3141,7211,4553,7241,7284,7351,7218,7299,7176,3088,7333,7254,7210,7218,7299,7240,7284,7351,3179,6853,4810,7237,7300,7224,7171,7312,7193,3105,7237,7350,7227,7171,7312,7257,7300,7288,3175,5829,7210,5067,7275,7317,7177,7184,7329,3122,5829,7274,7317,7284,6088,7176,7184,7329,3145,7334,7296,7288,7271,7194,7201,7346,7227,3075,6757,5145,4530,6068,1201,5963,4425,4785,4532,2096,4773,5253,7030,6194,1410,6693,4664,5208,5416,25,6501,5008,7011,5779,1924,5781,4394,4243,6966,918,5269,5994,4362,6256,1952,6054,6016,4512,6768,946,5221,5209,4634,6834,7078,6070,5238,5537,2385,4228,5960,6327,7043,4787,4361,4400,4387,2308,5797,4907,7043,6260,6327,5494,5447,5810,2658,6469,4442,4152,4131,4609,6689,5401,6408,1176,5221,4992,6288,6532,5524,5703,7015,6019,2931,5797,6805,6561,4241,4882,4865,6962,4774,2854,5797,4361,6561,6805,5972,5989,6260,5264,2112,7078,4992,4984,5947,5755,6834,4514,4656,288,7066,2488,5158,36,4981,309,6054,4480,6017,2673,6978,4393,5266,1207,6709,5026,6227,1412,6501,5040,4278,105,5226,6474,4136,2091,6053,4489,4993,1978,5669,4928,5955,1313,6214,6410,6251,42,6037,4538,6025,945,4117,4662,5440,1891,4714,4137,4777,7010,5816,5224,5257,2057,6565,6025,6487,4521,6675,7075,6967,903,5125,5974,4117,4129,4896,4663,5671,1861,5226,6804,6404,5128,7040,6914,6834,2667,7077,4489,4408,5048,6327,5499,4442,405,5221,4438,5665,4657,4400,5123,5175,1607,6602,6854,6412,4140,4796,6347,6220,1132,7317,7354,7291,7255,6600,7224,7187,458,7189,4806,7201,5317,7286,6083,7171,3136,7238,7210,7316,7337,4800,7296,7352,3014,7333,6085,7354,7227,4553,5057,7305,2247,5829,4806,4668,5964,4988,4292,4124,348,5813,7040,5552,336,6022,4489,4390,1665,4762,6516,6034,882,5285,5050,5028,832,6517,6402,6439,1835,4458,6214,6241,2067,5994,6800,6048,880,6938,4416,4532,1867,4389,4741,4792,1112,5781,4662,5014,905,5270,4409,4969,1595,4773,6021,6181,2050,4678,4498,5161,56,6469,6170,4480,2954,5797,4393,7058,2203,5797,5961,4473,881,4666,6070,6307,2472,5797,4724,5931,36,5909,6066,4466,896,6586,6036,7063,2051,5126,4634,4155,1547,6405,4634,4944,1875,4933,6070,4996,309,6469,6022,4200,608,4678,4996,4930,400,6725,5288,6315,25,5813,5561,4394,2488,5269,4458,5655,1811,6022,5770,6793,571,5285,7030,6722,576,5909,4480,6167,2851,6586,5040,4281,1924,4518,4448,4196,946,6709,4666,5431,25,7013,6995,4945,1924,4197,6405,5634,1924,6214,6472,6528,6401,6243,4962,4402,259,6837,4441,4517,4496,5556,5304,4168,148,5765,4714,5513,4517,4790,5816,4769,345,6565,6710,6426,6675,6484,5687,5223,1110,4714,5944,4987,6025,5042,6038,5786,694,4261,7018,5957,5974,5440,5995,6658,2978,4117,4354,4611,4667,4184,6231,7047,2872,5050,6020,4987,5944,5024,4265,5129,1152,7018,7074,6756,6947,6721,4416,4880,801,6565,4896,4129,4663,4121,4730,6773,2330,4453,5206,5223,5240,5659,6931,6323,2171,4709,6153,6292,6402,6215,6437,5974,1861,6470,4882,4115,5665,6147,6497,5272,2312,6469,4442,4228,6404,7040,4528,6833,405,5797,4501,6677,6289,4737,7042,6950,678,5797,5988,5446,4980,6452,4409,4506,2394,4774,6950,6562,6070,5010,6291,6199,951,5797,6954,5818,4139,5972,5899,5127,1893,6949,6027,5048,5499,4152,4434,4384,560,6474,5264,6208,4992,6052,7079,7027,1923,7078,4400,4657,5123,6689,6979,5707,2858,6805,4506,5977,4634,4217,4976,4866,18,5221,5048,6027,4408,5755,5144,5396,1142,6469,5989,5972,4711,6183,4136,4233,2121,4806,7193,4544,5058,6156,6339,6476,1132,6853,4508,5321,5212,6844,4296,7052,448,7333,5484,4780,5820,7052,4553,6300,705,7333,6854,5317,5831,4988,4553,4412,2500,4810,7350,5052,6028,5756,6300,6572,962,7333,5452,5996,6854,5132,7106,4140,1995,7189,4668,4124,6339,6156,7111,5500,715,7354,7224,6084,7111,7300,7312,7337,960,5834,4546,7171,4811,7227,7232,7268,2753,6853,7193,4546,5056,4297,7223,7285,714,7237,6086,6028,7107,5835,4412,5404,1224,7237,7206,6220,6412,5532,4140,6086,2247,5228,6412,6220,5056,5004,4546,5676,2497,7237,4297,5320,5532,7052,4524,6844,448,5829,5804,5577,4554,6300,4796,7052,705,5829,5804,6492,6684,4412,7284,4988,2500,5834,4811,6076,6086,6572,5004,6300,962,5829,5578,7110,6850,4140,5964,5132,1995,6085,7227,6343,4156,4296,4636,4444,715,6602,7296,7316,6343,7239,7107,7354,960,4810,7350,7203,7107,7268,7169,7232,2753,6597,7194,4544,7312,7285,5058,7223,714,7269,6084,7111,7020,5404,6339,4412,1224,7269,6084,6476,6597,4716,6156,4140,2247,6469,4634,6070,896,6757,4496,6947,1924,7013,7001,4634,4992,6036,2967,6469,6070,6170,6145,6712,2595,6469,4634,4278,4155,5760,1656,6469,4518,4152,4466,6066,359,6725,6070,4992,5161,4633,1186,6757,6036,4503,5042,6167,2049,6405,4634,4933,6070,4944,900,4197,5520,4518,6020,6947,22,7013,4954,6020,4121,6995,2595,6757,4496,4930,4996,5234,1970,6757,6020,4281,4155,6953,537,6725,6310,4496,5042,5288,1656,7269,7257,4634,5321,4296,7288,7239,7227,5835,3075,6469,7334,5056,4546,7346,7227,7296,7288,6086,3098,7269,7334,6597,4524,7201,7346,6084,7111,7316,2051,6469,4810,7350,7227,7203,7194,7169,7288,4296,3175,7269,6764,6084,5532,6476,6028,6156,4524,4544,946,6469,7334,6076,6339,7203,7346,7271,7169,6849,3200,7269,7258,7350,4810,6084,7291,7193,5321,7201,56,6853,7334,7237,6086,7316,7193,7346,4546,7291,896,6757,7227,6084,6343,6156,4156,6956,7193,4636,2380,6853,7237,6070,4296,5321,7193,7169,7224,7203,714,6757,4508,4544,5058,5004,6156,6476,6076,6084,2860,6853,6764,7193,6476,5212,5756,6156,6343,4124,2851,7269,5834,4811,5532,4636,4524,4156,4297,5052,1924,7237,6086,7257,4634,7300,7288,7350,7227,7312,960,7269,6597,4634,7224,6084,7111,7300,7171,7312,3254,7237,5834,4297,5320,5532,4124,4524,5756,6028,571,7269,4810,5058,5532,4544,4524,5052,7020,6412,1924,6597,4810,7237,6070,6849,7169,7312,7300,7203,2243,6757,5320,4297,4156,5004,5244,6076,4636,4811,412,6853,5572,6070,7193,4546,5056,7312,7330,7300,3128,6853,7020,7193,6700,4636,6412,4156,7107,5724,1924,6853,5834,4811,5212,5756,6076,4668,5004,5320,25,7269,5548,6084,6076,7020,6700,5004,5058,6220,400,6853,7020,5212,7288,7107,5756,6220,6700,4668,25,7269,7258,7312,7171,7224,7300,7239,7291,7350,7330,7201,3097,6853,6764,5004,4668,6956,5212,6076,5756,6476,4508,4124,2060,7269,7334,7346,7257,7201,7194,7316,7239,7288,7296,7171,3131,7237,7020,5532,4524,4124,6412,6220,6028,5756,5052,4668,2604,6757,6020,7047,6323,6148,4244,4496,4880,4627,2851,6469,4442,6070,4992,4866,4114,6408,5272,6481,2593,6757,6565,6801,6694,4790,5042,4402,4145,6401,1924,6469,7078,4992,6199,5047,4656,4384,4634,4779,1659,5221,7078,5401,4634,4779,5537,5524,5238,6070,2051,6757,5042,6323,5492,7047,7010,5794,5974,6215,400,5221,5209,4634,4992,4233,6217,6019,7027,6070,1892,6757,4496,6801,6565,6464,5248,6020,5492,5749,946,6757,4992,4633,6466,5298,1972,6709,5508,6070,4496,4666,901,6501,4634,6915,7008,5776,1924,6469,6054,5042,4120,4472,423]);var r0=Pt;var Ft=[[0,0,0],[0,1,0],[0,1,1],[0,0,1],[1,0,0],[1,1,0],[1,1,1],[1,0,1]],Rt=[[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],W0=class{constructor(){this.table=r0,this.f_test_results=new Int32Array(6)}signbf(c){return c<0}face_tests(c){let o=this.v,x=this.f_test_results;return x.fill(0),c&128?(x[0]=(c&204)===132?o[0]*o[5]<o[1]*o[4]?-1:1:0,x[3]=(c&153)===129?o[0]*o[7]<o[3]*o[4]?-1:1:0,x[4]=(c&240)===160?o[0]*o[2]<o[1]*o[3]?-1:1:0):(x[0]=(c&204)===72?o[0]*o[5]<o[1]*o[4]?1:-1:0,x[3]=(c&153)===24?o[0]*o[7]<o[3]*o[4]?1:-1:0,x[4]=(c&240)===80?o[0]*o[2]<o[1]*o[3]?1:-1:0),c&2?(x[1]=(c&102)===66?o[1]*o[6]<o[2]*o[5]?-1:1:0,x[2]=(c&51)===18?o[3]*o[6]<o[2]*o[7]?-1:1:0,x[5]=(c&15)===10?o[4]*o[6]<o[5]*o[7]?-1:1:0):(x[1]=(c&102)===36?o[1]*o[6]<o[2]*o[5]?1:-1:0,x[2]=(c&51)===33?o[3]*o[6]<o[2]*o[7]?1:-1:0,x[5]=(c&15)===5?o[4]*o[6]<o[5]*o[7]?1:-1:0),x[0]+x[1]+x[2]+x[3]+x[4]+x[5]}face_test1(c){let o=this.v;switch(c){case 0:return o[0]*o[5]<o[1]*o[4]?72:132;case 1:return o[1]*o[6]<o[2]*o[5]?36:66;case 2:return o[3]*o[6]<o[2]*o[7]?33:18;case 3:return o[0]*o[7]<o[3]*o[4]?24:129;case 4:return o[0]*o[2]<o[1]*o[3]?80:160;default:return o[4]*o[6]<o[5]*o[7]?5:10}}interior_test(c,o){let x=this.v,a=1e-9,r=x[4]-x[0],f=x[5]-x[1],M=x[6]-x[2],e=x[7]-x[3],n=r*M-f*e;if(this.signbf(n)){if(c&1)return 0}else if(!(c&1)||Math.abs(n)<a)return 0;let l=.5*(x[3]*f+x[1]*e-x[2]*r-x[0]*M)/n;if(l<=a||l>=1-a)return 0;let b=x[0]+r*l,s=x[1]+f*l,h=x[2]+M*l,A=x[3]+e*l,B=h*b,g=A*s;if(c&1){if(B<g&&!this.signbf(g))return(this.signbf(s)===this.signbf(x[c]))+o}else if(B>g&&!this.signbf(B))return(this.signbf(b)===this.signbf(x[c]))+o;return 0}pattern(c){let o=this.table,x=(c&128)!==0,a=x?c^255:c,r=o[a];if(r===void 0)throw new Error(`MC33 lookup miss: ${a}`);let f=(r&2048)!==0,M=x?!f:f,e=M?c:c^255,n=r&2047,l=r>>>12,b;switch(l){case 0:b=n;break;case 1:b=e&this.face_test1(n>>2)?183+(n<<1):159+n;break;case 2:b=this.interior_test(n,0)?239+6*n:231+(n<<1);break;case 3:e&this.face_test1(n%6)?b=575+5*n:b=this.interior_test(Math.floor(n/6),0)?407+7*n:335+3*n;break;case 4:{let s=this.face_tests(e);s===-3?b=695+3*n:s===-1?b=(this.f_test_results[4]+this.f_test_results[5]<0?this.f_test_results[0]+this.f_test_results[2]<0?759:799:719)+5*n:s===1?b=(this.f_test_results[4]+this.f_test_results[5]<0?983:this.f_test_results[0]+this.f_test_results[2]<0?839:911)+9*n:b=this.interior_test(n>>1,0)?1095+9*n:1055+5*n;break}case 5:{let s=this.face_tests(e);s===-2?b=(n&2?this.interior_test(0,0):this.interior_test(0,0)||this.interior_test(n?1:3,0))?1213+(n<<3):1189+(n<<2):s===0?b=(this.f_test_results[2+n]<0?1261:1285)+(n<<3):b=(n&2?this.interior_test(1,0):this.interior_test(2,0)||this.interior_test(n?3:1,0))?1237+(n<<3):1201+(n<<2);break}case 6:{let s=this.face_tests(e);s===-2?b=this.interior_test(14287116>>(n<<1)&3,0)?1453+(n<<3):1357+(n<<2):s===0?b=(this.f_test_results[n>>1]<0?1645:1741)+(n<<3):b=this.interior_test(10991589>>(n<<1)&3,0)?1549+(n<<3):1405+(n<<2);break}default:{let s=Math.abs(this.face_tests(e));if(s===0){let h=(this.f_test_results[1]<0)<<1|this.f_test_results[5]<0;if(this.f_test_results[0]*this.f_test_results[1]===this.f_test_results[5])b=2157+12*h;else{let A=this.interior_test(h,1);b=2285+(A?10*h-40*A:6*h)}}else if(s===2)b=1917+10*((this.f_test_results[0]<0?this.f_test_results[2]>0:12+(this.f_test_results[2]<0))+(this.f_test_results[1]<0?this.f_test_results[3]<0:6+(this.f_test_results[3]>0))),this.f_test_results[4]>0&&(b+=30);else if(s===4){let h=21+11*this.f_test_results[0]+4*this.f_test_results[1]+3*this.f_test_results[2]+2*this.f_test_results[3]+this.f_test_results[4];h>>4&&(h-=h&32?20:10),b=1845+3*h}else b=1839+2*this.f_test_results[0]}}return{offset:b+1,reverse:M}}triangles(c,o,x){if(this.v=c,o===0||o===255)return 0;let a=this.pattern(o),r=0;for(let f=a.offset;f<r0.length;f++){let M=r0[f],e=M&15,n=M>>4&15,l=M>>8&15;if(e<=12&&n<=12&&l<=12&&e!==n&&n!==l&&e!==l){if(r+3>x.length)throw new Error("MC33 cell exceeds output capacity");x[r++]=e,x[r++]=a.reverse?l:n,x[r++]=a.reverse?n:l}if(!(M&4096))return r}throw new Error("MC33 pattern exceeds lookup table")}},Ct={name:"MC33",corners:Ft,edges:Rt,maxVertices:36,table:r0,cornerBit:t=>128>>t,createPolygonizer(){let t=new W0;return t.triangles.bind(t)}};var v0=Ct;function B0(t={type:"cartesian"}){if(t.type==="cartesian")return(r,f,M)=>[r,f,M];if(t.type!=="spherical"&&t.type!=="cube-sphere")throw new Error(`Unknown coordinates: ${t.type}`);let c=t.radius||[.02,.7],o=t.center||[.5,.5,.5];if(c.length!==2||!c.every(Number.isFinite)||c[0]<0||c[1]<=c[0])throw new Error("Radius must be an increasing, nonnegative pair");if(o.length!==3||!o.every(Number.isFinite))throw new Error("Center must contain three finite coordinates");if(t.type==="cube-sphere"){if(!Number.isInteger(t.face)||t.face<0||t.face>5)throw new Error("Cube-sphere face must be 0..5");return(r,f,M)=>{let e=2*r-1,n=2*f-1,b=[[1,n,-e],[-1,n,e],[e,1,-n],[e,-1,n],[e,n,1],[-e,n,-1]][t.face],h=(c[0]+M*(c[1]-c[0]))/Math.hypot(...b);return b.map((A,B)=>o[B]+A*h)}}let x=t.longitude||[-Math.PI,Math.PI],a=t.latitude||[-Math.PI/2,Math.PI/2];for(let r of[x,a])if(r.length!==2||!r.every(Number.isFinite)||r[1]<=r[0])throw new Error("Angular ranges must be increasing finite pairs in radians");if(a[0]<-Math.PI/2||a[1]>Math.PI/2||x[1]-x[0]>2*Math.PI+1e-9)throw new Error("Latitude must be within \\xB1pi/2 and longitude span at most 2*pi");return(r,f,M)=>{let e=x[0]+r*(x[1]-x[0]),n=a[0]+f*(a[1]-a[0]),l=c[0]+M*(c[1]-c[0]),b=l*Math.cos(n);return Math.abs(Math.cos(n))<1e-15?[o[0],o[1]+l*Math.sin(n),o[2]]:[o[0]+b*Math.cos(e),o[1]+l*Math.sin(n),o[2]+b*Math.sin(e)]}}function tt(t,c){if(!c||c.type==="cartesian")return t;let o=B0(c);for(let x=0;x<t.length;x+=3){let a=o(t[x],t[x+1],t[x+2]);t[x]=a[0],t[x+1]=a[1],t[x+2]=a[2]}return t}var Bt={bourke:Q0,mc33:v0};function Et(t,c,o,x){let a=Bt[x];if(!a)throw new Error(`Unknown marching cubes algorithm: ${x}`);if(!["x","y","z"].every(r=>Number.isInteger(c[r])&&c[r]>=2))throw new Error("Grid dimensions must be integers of at least 2");if(!(t instanceof Float32Array)||t.length!==c.x*c.y*c.z)throw new Error("Expected a Float32Array with x*y*z samples, indexed as (z*y + y)*x + x");if(!Number.isFinite(o))throw new Error("Isolevel must be finite");for(let r of t)if(!Number.isFinite(r)||!Number.isFinite(Math.fround(r-o)))throw new Error("Field samples and their differences from the isolevel must be finite f32 values");return a}function xt(t,c,o=0,x="bourke",a={}){o=Math.fround(o),a.coordinates&&B0(a.coordinates);let r=Et(t,c,o,x),{x:f,y:M,z:e}=c,n=r.createPolygonizer(),l=new Float32Array(8),b=new Uint8Array(r.maxVertices),s=new Float32Array(39),h=new Float32Array(65536),A=0;for(let B=0;B<e-1;B++)for(let g=0;g<M-1;g++)for(let F=0;F<f-1;F++){let m=0;for(let E=0;E<8;E++){let y=r.corners[E];l[E]=t[((B+y[2])*M+g+y[1])*f+F+y[0]]-o,l[E]<0&&(m|=r.cornerBit(E))}if(m===0||m===255)continue;let P=n(l,m,b);if(A+P*3>h.length){let E=new Float32Array(Math.max(h.length*2,A+P*3));E.set(h),h=E}for(let E=0;E<12;E++){let[y,k]=r.edges[E];if(l[y]<0==l[k]<0)continue;let u=l[y]-l[k],H=Math.abs(u)<1e-9?.5:Math.max(0,Math.min(1,l[y]/u)),C=r.corners[y],i=r.corners[k];s[E*3]=(F+C[0]+H*(i[0]-C[0]))/(f-1),s[E*3+1]=(g+C[1]+H*(i[1]-C[1]))/(M-1),s[E*3+2]=(B+C[2]+H*(i[2]-C[2]))/(e-1)}s[36]=(F+.5)/(f-1),s[37]=(g+.5)/(M-1),s[38]=(B+.5)/(e-1);for(let E=0;E<P;E++){let y=b[E]*3;h[A++]=s[y],h[A++]=s[y+1],h[A++]=s[y+2]}}return tt(h.slice(0,A),a.coordinates)}var zt=2*Math.PI;function Ut(t,c){return[Math.sin(t)*Math.cos(c),Math.cos(t),Math.sin(t)*Math.sin(c)]}var m0=(t,c)=>t[0]*c[0]+t[1]*c[1]+t[2]*c[2];function T1(t,c,o,x){let{bend:a,twist:r,thickness:f,peak:M,portals:e}=x,n=o-a*t*t+r*t*c,l=M-.17*t-.13*Math.cos(4.1*t+r),b=Math.hypot(t*.87+.08*c,(c-.15)/l,n/f)-1,s=Math.hypot((Math.abs(t)-.83-.11*c)/.34,(c+.28)/.68,(n+.06*t)/(f*1.48))-1,h=Math.max(0,.2-Math.abs(b-s)),A=Math.min(b,s)-1.25*h*h,B=.034*Math.sin(19*c+2.3*t+2.1*n)+.025*Math.sin(12*t+7.3*n+5*c)*Math.cos(10*c-3*n),g=1/0;for(let{at:F,width:m,height:P,lean:E}of e){let y=(t-F-E*c-.05*o)/m,k=Math.max(0,c+.08+.05*o)/P;g=Math.min(g,Math.hypot(y,k)-1)}return Math.max(A+B,-g+.37*B)}function jt(t){let c={x:55,y:45,z:29},o=[-1.39,-1.05,-.88],x=[1.39,1.6,.88],a=x.map((e,n)=>(e-o[n])/([c.x,c.y,c.z][n]-1)),r=new Float32Array(c.x*c.y*c.z);for(let e=0;e<c.z;e++)for(let n=0;n<c.y;n++)for(let l=0;l<c.x;l++)r[(e*c.y+n)*c.x+l]=T1(o[0]+l*a[0],o[1]+n*a[1],o[2]+e*a[2],t);let f=xt(r,c,0,"mc33"),M=new Float32Array(f.length*2);for(let e=0;e<f.length;e+=3){let n=o[0]+f[e]*(x[0]-o[0]),l=o[1]+f[e+1]*(x[1]-o[1]),b=o[2]+f[e+2]*(x[2]-o[2]),s=.004;M.set([n,l,b,T1(n+s,l,b,t)-T1(n-s,l,b,t),T1(n,l+s,b,t)-T1(n,l-s,b,t),T1(n,l,b+s,t)-T1(n,l,b-s,t)],e*2)}return M}function ct(t,c,o,x,a,r){if(c<513||x<.38)return;let f=c-1,M=Object.values(a).flat().map(({target:g})=>g),e=(g,F)=>t[Math.round(F)*c+(Math.round(g)%f+f)%f],n=[];for(let g=12;g<f;g+=19)for(let F=1;F<f;F+=19)n.push(e(F,g));n.sort((g,F)=>g-F);let l=n[Math.floor(.77*n.length)],b=Math.imul(o^o>>>17,2654435761)^1126074651,s=()=>(b=Math.imul(b,1664525)+1013904223>>>0,b/4294967296),h=[];for(let g=0;g<19;g++)for(let F=0;F<33;F++){let m=(F+s())*f/33,P=(.22+.56*(g+s())/19)*f,E=e(m,P);if(E<l-.18)continue;let y=Math.PI*P/f,k=zt*m/f,u=Ut(y,k),H=m0(u,[.54,.45,.71]);if(H<.25||M.some(z=>m0(z,u)>.998))continue;let[,C,i,d]=U1({regions:r},u),I=e(m+2,P)-e(m-2,P),U=e(m,P+4)-e(m,P-4),W=Math.hypot(I,U),O=.8*H+.56*C+.32*i+.24*d-.51*Math.abs(E-l-.21)-.38*Math.abs(W-.31)+.22*s();h.push({dir:u,theta:y,phi:k,dx:I,dy:U,canyon:C,volcanic:d,score:O})}let A=[];for(let g of h.sort((F,m)=>m.score-F.score))if(!A.some(F=>m0(F.dir,g.dir)>.94)&&(A.push(g),A.length===2))break;if(!A.length)return;let B=A.map(({dir:g,theta:F,phi:m,dx:P,dy:E,canyon:y,volcanic:k})=>{let u=[-Math.sin(m),0,Math.cos(m)],H=[Math.cos(F)*Math.cos(m),-Math.sin(F),Math.cos(F)*Math.sin(m)],C=Math.atan2(E,P)+Math.PI/2+(s()-.5)*1.55,i=u.map(($,G)=>$*Math.cos(C)+H[G]*Math.sin(C)),d=u.map(($,G)=>-$*Math.sin(C)+H[G]*Math.cos(C)),I=240+250*s(),U=.64+.45*s(),W={bend:.25*(s()-.5),twist:.35*(s()-.5),thickness:.23+.13*s(),peak:.79+.2*s(),portals:[]};s()<.39?W.portals.push({at:-.41,width:.24+.1*s(),height:.4+.14*s(),lean:-.11},{at:.34,width:.29+.1*s(),height:.49+.13*s(),lean:.13}):W.portals.push({at:(s()-.5)*.24,width:.52+.17*s(),height:.49+.14*s(),lean:(s()-.5)*.36});let O=m0(d,[.54,.45,.71])>=0?1:-1,z=g.map(($,G)=>$+(d[G]*O*I*3.6+i[G]*I*.78)/262144),q=Math.hypot(...z);return{direction:g,span:i,depth:d,size:I,rise:U,tint:Math.min(1,.24+.59*y-.2*k+.27*s()),site:{target:g,overlook:z.map($=>$/q)},vertices:jt(W)}});return a.arches=B.map(({site:g})=>g),B}function ot(t){let c=f=>j1(f,0,0,t)/4294967296,o=c(47);if(o>=.55)return[0,0,0,0];if(o>=.3)return[0,0,0,1.18+.42*c(37)];let x=.48*(c(21)-.5),a=.48*(c(23)-.5),r=Math.hypot(x,1,a);return[x/r,1/r,a/r,.65+.48*c(37)]}function nt(t,c,o,x,a){if(a[3]===0)return-1/0;let r=Math.abs(t*a[0]+c*a[1]+o*a[2]),f=Math.sin(9*t+4*c-7*o+14*a[0]);return x-a[3]+1.08*r*r-.115*f}function at(t,c,o,x,a,r,f=!0,M=1,e,n=!1,l=0,b=!1){let s=n||a>0?P0(x,n):[];if(n){I0(t,c),F0(t,c,x,a,M,!0,s,l);let H=Math.min(c,257),C=b?{side:H,values:new Float32Array(H**2)}:void 0,i=C?A0(t,c,x,.87,C):[];return{values:t,glacialSites:i,glacialIce:C,landmarks:{},impactBasins:s,ocean:{seed:x,datum:null}}}let h=f?A0(t,c,x,a):[],A=f?$0(t,c,x,a,h,r):{};F0(t,c,x,f?0:a,M,!1,s);let B=f&&e===void 0?null:N0(t,c,x,{coverage:e}),g=f?null:ot(x),F=Math.min(c,257),m=f?null:{side:F,values:new Float32Array(F**2)},P=!f&&r&&a>0?{seed:x,variation:a,regions:r,sites:[]}:null;if(Lt(t,c,o==="volcanic"?.84:1.32,B,g,m,P,!f&&{seed:x,geology:o,regions:r}),L0(t,c,o==="alpine"?.94:.74),B!==null&&Y0(t,c,B,e===void 0?void 0:o),I0(t,c),!f)return{values:t,glacialSites:h,landmarks:A,impactBasins:s,alluvium:m,invertedRidges:P?.sites,ocean:{seed:x,datum:B}};let y=D0(t,c,x,a,h,A,r),k=K0(t,c,x,a,h,A,r),u=ct(t,c,x,a,A,r);return{values:t,glacialSites:h,landmarks:A,impactBasins:s,springs:y,dunes:k,rockSpans:u,ocean:e===void 0?void 0:{seed:x,datum:B}}}function Lt(t,c,o=1,x=null,a=null,r=null,f=null,M=null){let e=c-1,n=Math.min(256,Math.floor(e/3.5));if(n<12)return t;let l=n*(n-1),b=e/n,s=new Float32Array(l),h=Float32Array.from({length:n+1},(p,_)=>Math.sin(Math.PI*_/n)),A=(p,_)=>(p+_)%_,B=(p,_)=>t[Math.round(_)*c+A(Math.round(p),e)];for(let p=1;p<n;p++)for(let _=0;_<n;_++){let j=_*b,w=p*b,X=b*.48;s[(p-1)*n+_]=.4*B(j,w)+.15*(B(j-X,w)+B(j+X,w)+B(j,w-X)+B(j,w+X))}let F=s.slice().sort()[Math.floor(l*.2)],m=new Float32Array(l).fill(1/0),P=new Int32Array(l).fill(-1),E=new Uint32Array(l),y=new Uint32Array(l).fill(l),k=new Float32Array(l),u=new Uint32Array(l),H=0;function C(p){let _=H++;for(;_;){let j=_-1>>1;if(m[u[j]]<=m[p])break;u[_]=u[j],_=j}u[_]=p}function i(){let p=u[0],_=u[--H],j=0;for(;j*2+1<H;){let w=j*2+1;if(w+1<H&&m[u[w+1]]<m[u[w]]&&w++,m[_]<=m[u[w]])break;u[j]=u[w],j=w}return u[j]=_,p}for(let p=0;p<l;p++)s[p]<=F&&(m[p]=s[p],C(p));for(let p=0;H;p++){let _=i(),j=_%n,w=Math.floor(_/n)+1,X=h[w],N=Math.max(.08,2*X),V=1/Math.hypot(N,1);E[p]=_,y[_]=p,k[_]=X;let J=0;for(let S=-1;S<=1;S++){let L=w+S;if(!(L<1||L>=n))for(let R=-1;R<=1;R++){if(!R&&!S)continue;let Y=(L-1)*n+A(j+R,n);if(m[Y]===1/0)m[Y]=Math.max(s[Y],m[_]+2e-5),P[Y]=_,C(Y);else if(y[Y]<p){let T=(m[_]-m[Y])*(S?R?V:1:1/N);T>J&&(J=T,P[_]=Y)}}}}let d=r&&new Float32Array(l),I=r&&new Float32Array(l),U=(1e3/n)**2;for(let p=l-1;p>=0;p--){let _=E[p],j=P[_];if(j<0)continue;let w=k[_];k[j]+=w,I&&(I[j]=Math.max(I[j],Math.min(d[j],w)),d[j]=Math.max(d[j],w))}if(I){let p=106.63474115247546/U;for(let _=0;_<l;_++){let j=I[_];if(j<=p){I[_]=0;continue}let w=Math.min(1,(Math.log2(1+j*U)-6.75)/4.6),X=Math.min(1,j/Math.max(1,d[_]*.58));I[_]=w*X}}let W=new Float32Array(c*c),O=x===null&&!r?null:new Float32Array(c*c),z=a&&a[3]!==0&&new Float32Array(l),q=f&&new Float32Array(l),$=M&&(M.regions||M.geology==="mesa")&&new Float32Array(l),G=$&&new Float32Array(l),D=$&&new Float32Array(l),c1=f&&new Float32Array(c*c),v=[];if(z||q||$){let p=Float64Array.from({length:n},(N,V)=>Math.cos(2*Math.PI*V/n)),_=Float64Array.from({length:n},(N,V)=>Math.sin(2*Math.PI*V/n)),j=f?j1(53,0,0,f.seed)*(2*Math.PI/4294967296):0,w=$?j1(61,0,0,M.seed)*(2*Math.PI/4294967296):0,X=Math.min(1,n/160);for(let N=1;N<n;N++){let V=h[N],J=Math.cos(Math.PI*N/n);for(let S=0;S<n;S++){let L=(N-1)*n+S,R=s[L],Y=V*p[S],T=V*_[S];if(z){let r1=nt(Y,J,T,R,a),a1=Math.max(0,Math.min(1,(r1-.015)/.48)),x1=Math.max(0,Math.min(1,(R-F-.16)/.54));z[L]=a1*a1*(3-2*a1)*x1}let t1=q&&V>.19&&R>(x??F)+.12,o1=$||t1?U1(M||f,[Y,J,T],M?.geology):null;if($){let r1=x===null?1:Math.max(0,Math.min(1,(R-x-.02)/.22)),a1=Math.max(0,(o1[1]-.18)/.82)*(1-(z?.[L]??0));$[L]=a1;let x1=a1*r1*t0(N,n)*b;if(x1>0){let s1=X*(35*Y-52*J+28*T)+w,e1=X*(-67*Y+21*J+49*T)-w;G[L]=x1*(1.36*Math.sin(s1)+.38*Math.sin(e1))/Math.max(.5,2*V),D[L]=x1*(.76*Math.cos(e1)+.29*Math.cos(s1))}}if(t1){let[,r1,a1,x1]=o1,s1=.45*r1+.27*a1+.91*x1,e1=.69*Math.sin(9*Y+3*J-7*T+j)+.31*Math.cos(15*Y-8*J+9*T-j),M1=Math.max(0,Math.min(1,(e1-.1)/.73)),m1=Math.max(0,Math.min(1,(s1-.26)/.57));q[L]=f.variation*m1*M1*M1*(1-.85*(z?.[L]??0))}}}}let Z=p=>Math.max(0,Math.min(1,(Math.log2(1+k[p]*U)-6.45)/6.4+.17*($?.[p]??0))),K=(p,_)=>{let j=Math.min(1,Math.max(0,(s[p]-F+.12)/.36));return o*_*(.095+.24*_)*(.46+.54*j)*(1+.32*($?.[p]??0))},n1=(p,_)=>{let j=P[p];if(j<0||_<=.53)return 0;let w=Math.abs(s[p]-s[j])*n/256,X=(_-.53)/.47,N=Math.max(0,1-w/.065),V=x===null?1:Math.max(0,Math.min(1,(s[p]-x-.04)/.17));return X*N*N*V*(1-(z?.[p]??0))};for(let p=0;p<l;p++){let _=P[p];if(_<0)continue;let j=Z(p);if(j<=0)continue;let w=Z(_),X=Math.floor(p/n)+1,N=p%n*b+(G?.[p]??0),V=X*b+(D?.[p]??0),J=(A(_%n-p%n+1,n)-1)*b+(G?.[_]??0)-(G?.[p]??0),S=(Math.floor(_/n)-X+1)*b+(D?.[_]??0)-(D?.[p]??0),L=Math.max(.35,2*h[X]),R=J*L,Y=Math.max(1e-6,R*R+S*S),T=(z?.[p]??0)*j*j,t1=(z?.[_]??0)*w*w,o1=$?.[p]??0,r1=$?.[_]??0,a1=(I?.[p]??0)*(1-T),x1=(I?.[_]??0)*(1-t1),s1=(.43+1.44*j)*b*(1+.57*T+.43*a1),e1=(.43+1.44*w)*b*(1+.57*t1+.43*x1),M1=Math.max(s1,e1),m1=K(p,j)*(1+.72*T),f1=K(_,w)*(1+.72*t1),p1=s[p]-m1,i1=Math.min(p1,s[_]-f1),u1=r?n1(p,j):0,w1=r?n1(_,w):0,b1=u1>0||w1>0,S1=j*j*(q?.[p]??0),C1=w*w*(q?.[_]??0),J1=Math.max(S1,C1)>.025;S1>.17&&C1>.17&&v.push({x:p%n,y:X,score:(S1+C1)/2});let Y1=x!==null&&j>.57&&s[p]>=x&&s[p]<x+.24&&s[_]<x&&s[_]>x-.2,Q1=0,$1=P[_];if(r&&j>.59&&$1>=0&&T<.22&&(x===null||s[_]>x+.05)){let W1=s[p]-s[_],z1=Math.max(0,s[_]-s[$1]),q1=Math.max(0,Math.min(1,(.76*W1-z1-.016)/.075));Q1=o*j*q1*Math.min(.2,.73*W1)}let v1=Q1>.005,E0=0;if(v1){let W1=((A($1%n-_%n+1,n)-1)*b+(G?.[$1]??0)-(G?.[_]??0))*L,z1=(Math.floor($1/n)-Math.floor(_/n))*b+(D?.[$1]??0)-(D?.[_]??0);E0=(R*z1-S*W1)/Math.sqrt(Y*Math.max(1e-6,W1**2+z1**2))}let p0=M1*(v1?2.04:Y1?1.65:J1?1.35:1),L1=v1?3.3:Y1?2.65:1,z0=p0/L,U0=Y1||v1?Math.sqrt(Y):0,st=Math.max(1,Math.floor(Math.min(V,V+L1*S)-p0)),rt=Math.min(e-1,Math.ceil(Math.max(V,V+L1*S)+p0)),et=Math.floor(Math.min(N,N+L1*J)-z0),it=Math.ceil(Math.max(N,N+L1*J)+z0);for(let W1=st;W1<=rt;W1++){let z1=t0(W1,e),q1=W1-V;for(let e0=et;e0<=it;e0++){let i0=(e0-N)*L,X1=(i0*R+q1*S)/Y,B1=Math.min(1,Math.max(0,X1)),A1=W1*c+A(e0,e);if(Y1&&X1>.2&&X1<L1){let g1=(X1-.2)/(L1-.2),_1=Math.abs(i0*S-q1*R)/U0,E1=e1*(.52+g1),O1=t[A1]-x;if(_1<E1&&O1>-.19&&O1<.034){let V1=_1/E1,f0=(1-V1)*Math.min(1,V1*4),w0=Math.min(.15,.034-O1);O[A1]=Math.max(O[A1],w0*f0*4*g1*(1-g1)*j*z1)}}if(v1&&X1>.42&&X1<L1){let g1=(X1-.42)/(L1-.42),_1=(i0*S-q1*R)/U0,E1=e1*(.48+1.27*g1),O1=s[_]-.068*(X1-1),V1=Math.max(0,t[A1]-O1);if(Math.abs(_1)<E1&&V1<.28){let f0=_1/E1,w0=1+.46*E0*f0,y0=Math.abs(f0),ut=(1-y0)**2*Math.min(1,5*y0),mt=Math.min(1,.28+8*Math.abs(y0-.58*g1)),pt=ut*mt*4*g1*(1-g1),dt=Q1*pt*w0*(1-V1/.28)*z1;O[A1]=Math.max(O[A1],dt)}}let ht=s1+B1*(e1-s1),P1=Math.hypot(i0-B1*R,q1-B1*S)/ht;if(J1&&P1<1.35){let g1=(S1+B1*(C1-S1))*z1,_1=Math.max(0,Math.min(1,(.54-P1)/.3)),E1=Math.max(0,1-Math.abs(P1-.84)/.51);c1[A1]=Math.max(c1[A1],.35*g1*_1*_1*(3-2*_1)),W[A1]=Math.max(W[A1],.19*g1*E1*E1)}if(P1>=1)continue;let d0=m1+B1*(f1-m1),lt=a1+B1*(x1-a1),j0=.27*(j+B1*(w-j))**2+.19*lt,h0=1-Math.max(0,(P1-j0)/(1-j0));if(o1>0||r1>0){let g1=o1+B1*(r1-o1),_1=Math.max(0,Math.min(1,(P1-.19)/.59)),E1=1-_1*_1*(3-2*_1);h0+=.77*g1*(E1-h0)}let ft=T+B1*(t1-T),g0=P1*P1,bt=1-g0*g0*(3-2*g0),Mt=h0+ft*(bt-h0),H0=p1+B1*(i1-p1),l0=Math.min(1.65*d0,Math.max(.4*d0,t[A1]-H0))*z1*Mt;if(b1&&P1>.28&&P1<.94){let g1=Math.min(1,(P1-.28)/.21,(.94-P1)/.22),_1=g1*g1*(3-2*g1)*(u1+B1*(w1-u1)),O1=(H0+d0*(.24+.18*P1)-(t[A1]-l0))*_1,V1=Math.max(-.073*o,Math.min(.14*o,-O1));l0=Math.max(0,l0+V1*z1)}W[A1]=Math.max(W[A1],l0)}}}let Q=r?(r.side-1)/e:0;for(let p=1;p<e;p++){let _=p*c;for(let j=0;j<e;j++){let w=_+j,X=O?.[w]??0,N=c1?.[w]??0;if(t[w]+=X+N-W[w]*(1-.89*Math.min(1,N/.115)),r&&X>0){let V=Math.round(p*Q);if(V===0||V===r.side-1)continue;let J=Math.round(j*Q)%(r.side-1),S=V*r.side+J,L=X*(1-.5*Math.min(1,W[w]/.24));r.values[S]=Math.max(r.values[S],Math.min(1,L*9))}}t[_+e]=t[_]}if(v.length){v.sort((p,_)=>_.score-p.score);for(let{x:p,y:_}of v){let j=Math.PI*_/n,w=2*Math.PI*p/n,X=Math.sin(j),N=[X*Math.cos(w),Math.cos(j),X*Math.sin(w)];if(!f.sites.some(V=>V[0]*N[0]+V[1]*N[1]+V[2]*N[2]>.998)&&(f.sites.push(N),f.sites.length>=48))break}}if(r)for(let p=1;p<r.side-1;p++){let _=p*r.side;r.values[_+r.side-1]=r.values[_]}return t}self.onmessage=({data:{values:t,side:c,settings:o}})=>{let{geology:x,seed:a,variation:r,regions:f,landmarkPatches:M,featureDensity:e,oceanCoverage:n,lunar:l,craterDetail:b,cryoGlaciers:s}=o,h=at(t,c,x,a,r,f,M,e,n,l,b,s),A=[h.values.buffer];h.alluvium&&A.push(h.alluvium.values.buffer),h.glacialIce&&A.push(h.glacialIce.values.buffer),h.springs&&A.push(h.springs.values.buffer),h.dunes&&A.push(h.dunes.values.buffer);for(let B of h.rockSpans??[])A.push(B.vertices.buffer);self.postMessage(h,A)};;if(typeof import_meta !== \'undefined\')import_meta.url=location.origin+"/dist/";})();\n',c1=URL.createObjectURL(new globalThis.Blob([f1],{type:"text/javascript"})),Ma=c1;var wa={mixed:0,alpine:1,mesa:2,volcanic:3};function u1(i,a,t,e,r,o,l){let c=It(i,{reseedLayers:l}),s=a==="alpine"||a==="mixed",n=a==="alpine"?2.2:a==="volcanic"?1.36:1.75,p=s?.48:a==="mesa"?.43:.25,m=c.layers.map(({entryPoint:f,params:u},y)=>{let v={...u,zoom:u.zoom/o};if(t&&f==="computeRidgedMultifractal4"){let d=1+(n-1)*r;v.scalar=d,v.transform=.36*(d-1)}else t&&(f==="computeFBM"&&(v.scalar*=.94),f==="computeFBM2"&&(v.scalar*=1-p*r),s&&f==="computeLanczosBillow"&&(v.scalar*=1-.52*r));return{entryPoint:f,layer:v,blend:t&&y>0?e:0,phase:13.7*y+(i>>>0)%997*.13}});return{...c,layers:m,mountainRanges:s}}async function m1(i,a,t){if(typeof Worker=="function"){let u;try{return u=new Worker(Ma),await new Promise((y,v)=>{u.onmessage=({data:d})=>y(d),u.onerror=v,u.onmessageerror=v,u.postMessage({values:i,side:a,settings:t})})}catch{}finally{u?.terminate()}}let{geology:e,seed:r,variation:o,regions:l,landmarkPatches:c,featureDensity:s,oceanCoverage:n,lunar:p,craterDetail:m,cryoGlaciers:f}=t;return ba(i,a,e,r,o,l,c,s,n,p,m,f)}function ft(i){let a=i>>10&31,t=(i&1023)/1024,e=i&32768?-1:1;return a===31?t?NaN:e*(1/0):e*(a?2**(a-15)*(1+t):2**-14*t)}async function x1(i,a){let t=new et(i,i.queue);try{return await h1(t,a)}finally{t.dispose()}}async function h1(i,{seed:a=123456789,segments:t=1e3,reseedLayers:e,erosion:r=!1,geology:o="mixed",variation:l=.8,rangeWeight:c=1,landscape:s="natural",landscapeStrength:n=1,featureDensity:p=1,oceanCoverage:m,lunar:f=!1,craterDetail:u=0,cryoGlaciers:y=!1,landmarkPatches:v=!0,proceduralGuide:d=!1}={}){if(!Number.isInteger(t)||t<8||t>1536)throw new RangeError("Planet Studio noise needs 8\u20131536 segments.");if(!Number.isInteger(a))throw new RangeError("Use an integer noise seed.");if(!Number.isFinite(u)||u<0||u>1)throw new RangeError("Lunar crater detail must be between 0 and 1.");if(!Number.isFinite(p)||p<.0625||p>8)throw new RangeError("Feature density must be between 0.0625 and 8.");if(m!==void 0&&!(m>=0&&m<1&&Number.isFinite(m)))throw new RangeError("Ocean coverage must be at least 0 and less than 1.");if(!Object.hasOwn(wa,o))throw new RangeError("Unknown planet geology.");if(!Object.hasOwn(Rt,s)||!Number.isFinite(n)||n<0||n>1)throw new RangeError("Use a valid planet landscape and strength from 0 to 1.");if(!Number.isFinite(l)||l<0||l>1||!Number.isFinite(c)||c<.35||c>1.35)throw new RangeError("Planet variation must be 0\u20131 and range weight 0.35\u20131.35.");let g=t+1,{sphereOffset:x,sphereOffset2:M,layers:D,mountainRanges:z}=u1(a,o,r,l,c,p,e),{device:_}=i,b="planet-studio-height",I;try{let q=function(F){let{texture:Y}=i.getCurrentTextureResource(b),B=_.createCommandEncoder();B.copyTextureToBuffer({texture:Y},{buffer:I,bytesPerRow:w,offset:S*F},[g,g,1]),_.queue.submit([B.finish()])},{messages:C}=await i.shaderModule.getCompilationInfo(),h=C.filter(F=>F.type==="error");if(h.length)throw new Error(h.map(F=>F.message).join(`
`));await i.computeToTexture(g,g,{scalar:1,transform:0},{textureKey:b,noiseChoices:["clearTexture"]});for(let{entryPoint:F,layer:Y,blend:B,phase:E}of D)i.buildPermTable(Y.seed),await i.computeToTexture(g,g,Y,{textureKey:b,useCustomPos:2,sphereOffset:x,sphereOffset2:M,spherePolarFade:r?.15:0,sphereBlend:B,sphereBlendPhase:E,noiseChoices:[F]});let w=Math.ceil(g*8/256)*256,S=w*g;if(I=_.createBuffer({size:S*(d?3:1),usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ}),r){let F={seed:a,voroMode:wa[o]},Y={textureKey:b,sphereBlend:l,sphereRangeWeight:c,sphereLandscape:Rt[s],sphereLandscapeStrength:n,sphereFeatureDensity:p},B=["computeStudioSphereMountainErosion",...z&&l===0?[]:["computeStudioSphereErosion"]];d?(q(1),await i.computeToTexture(g,g,F,{...Y,noiseChoices:["computeStudioSphereRelief"]}),q(2)):B.unshift("computeStudioSphereRelief"),B.length&&await i.computeToTexture(g,g,F,{...Y,noiseChoices:B})}q(0),await I.mapAsync(GPUMapMode.READ);let R=new Uint16Array(I.getMappedRange()),W=new Float32Array(g*g);for(let F=0;F<g;F++)for(let Y=0;Y<g;Y++){let B=ft(R[F*(w/2)+Y*4]);if(!Number.isFinite(B))throw new Error("Planet Studio noise produced a nonfinite height.");W[F*g+Y]=B}let T;if(r){let F=Math.min(g,129),Y=new Uint32Array(F**2),B=t/(F-1);for(let E=0;E<F;E++){let N=Math.round(E*B)*(w/2);for(let O=0;O<F;O++){let K=N+Math.round(O*B)*4,ae=Math.round(ft(R[K+1])*255),ie=Math.round(ft(R[K+2])*255),oe=Math.round(ft(R[K+3])*255);Y[E*F+O]=1056964608|ae|ie<<8|oe<<16}}T={side:F,values:Y}}let j=d?new Float32Array(2*g*g):null;if(j)for(let F=0;F<2;F++){let Y=(F+1)*S/2;for(let B=0;B<g;B++)for(let E=0;E<g;E++)j[F*g*g+B*g+E]=ft(R[Y+B*w/2+E*4])}I.destroy(),I=null;let Q,$,L,X,H,Z,J,te,ee,P,k=r&&f?.46-.25*u**8:1;if(r){if(f)for(let F=0;F<W.length;F++)W[F]*=k;({values:W,glacialSites:Q,glacialIce:$,landmarks:L,springs:X,dunes:H,rockSpans:Z,alluvium:J,invertedRidges:te,ocean:ee,impactBasins:P}=await m1(W,g,{geology:o,seed:a,variation:l,regions:T,landmarkPatches:v,featureDensity:p,oceanCoverage:m,lunar:f,craterDetail:u,cryoGlaciers:y}))}else{let F=Math.min(8,Math.floor(t/8));for(let Y of[0,t])for(let B=1;B<=F;B++){let E=Math.abs(Y-B)*g,N=0;for(let K=0;K<t;K++)N+=W[E+K]/t;let O=.9*(1-B/(F+1))**2;for(let K=0;K<g;K++)W[E+K]+=(N-W[E+K])*O}}let V=1/0,A=-1/0,U=0;for(let F of W)V=Math.min(V,F),A=Math.max(A,F),U+=F;if(A-V<1e-7)throw new Error("Planet Studio noise produced a flat heightmap.");let G={side:g,values:W,min:V,max:A,mean:U/W.length,featureDensity:p};if(j){let F=g*g;for(let Y=0;Y<F;Y++)j[F+Y]=W[Y]-j[F+Y]*k;G.guide=j,G.hostRelief=k}return T?{...G,regions:T,glacialSites:Q,glacialIce:$,landmarks:L,springs:X,dunes:H,rockSpans:Z,alluvium:J,invertedRidges:te,ocean:ee,impactBasins:P,reliefScale:ea(a)}:G}finally{I?.destroy(),i.destroyTexturePair(b)}}export{ht as BaseNoise,et as NoiseComputeBuilder,x1 as bakeStudioPlanetNoise,It as createStudioPlanetNoise,qt as sampleStudioPlanetNoise,kt as studioSeed};
