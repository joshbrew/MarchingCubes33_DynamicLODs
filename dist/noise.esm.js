var se=`const PI : f32 = 3.141592653589793;
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

  let sinTheta = sin(theta);
  let cosTheta = cos(theta);
  let sinPhi = sin(phi);
  let cosPhi = cos(phi);

  // Match the Babylon / spherical cloud convention: Y is the polar axis and
  // longitude runs around X/Z. This keeps the baked spherical weather field in
  // parity with sphereUVFromWorld(), so the cloud weather map is actually baked
  // onto the same manifold it is sampled from at render time.
  let x = sinTheta * cosPhi;
  let y = cosTheta;
  let z = sinTheta * sinPhi;

  // Fade the procedural offset by latitude only so it stays symmetric around the
  // seam and vanishes cleanly at the poles.
  let equatorScale = sinTheta;
  let offset = options.sphereOffset;
  let offset2 = options.sphereOffset2;

  return vec3<f32>(
    x + 2.0 + equatorScale * (offset * sin(phi + theta) + offset2 * cos(2.0 * phi)),
    y + 2.0 + equatorScale * (offset * cos(theta + phi) + offset2 * sin(2.0 * theta)),
    z + 2.0 + equatorScale * (offset * sin(2.0 * phi + theta) + offset2 * cos(2.0 * theta + phi))
  );
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

  let v = v0 * params.scalar + params.transform;
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

fn studioMountainCut(chart:StudioErosionChart,height:f32)->f32 {
  // A height-dependent fade keeps sharp divides and lets the troughs cut.
  let fade=2.0*smoothstep(.05,1.62,height)-1.0;
  var ridge=0.0;
  let mountain=erosionFilter(
    chart.position+vec2<f32>(.29,-.44),vec3<f32>(height,chart.slope),fade,
    4.4,.48,.76,1.03,1.40,
    vec4<f32>(.10,0,.10,2.0),vec4<f32>(1.10,1.25,2.80,1.50),
    vec2<f32>(.70,.76),.145,1u,2.0,.48,.82,.52,chart.pixelSpan,&ridge
  );
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

fn studioVolcanicRelief(dir:vec3<f32>)->f32 {
  var relief=0.0;
  for(var i=0u;i<12u;i++){
    let q=(seedOffset3(params.seed+i*73856093u)-vec3<f32>(17.173,31.947,47.521))/
      vec3<f32>(131.0,137.0,149.0);
    let y=2.0*q.x-1.0;
    let ring=sqrt(max(0.0,1.0-y*y));
    let phi=TWO_PI*q.y;
    let center=vec3<f32>(ring*cos(phi),y,ring*sin(phi));
    let radius=mix(.031,.146,q.z*q.z);
    let d2=max(0.0,2.0-2.0*dot(dir,center))/(radius*radius);
    if(d2>2.2){continue;}
    let roughness=.14*simplex3D(dir*84.0+q*19.0);
    let distance=sqrt(d2)+roughness*smoothstep(.14,.46,d2);
    let bowl=1.0-smoothstep(.24,.85,distance);
    let rim=smoothstep(.60,.92,distance)*(1.0-smoothstep(.96,1.32,distance));
    let flank=1.0-smoothstep(.88,1.48,distance);
    relief+=(.16+.30*q.z)*rim-(.21+.25*q.z)*bowl+(.10+.18*q.z)*flank;
  }
  return clamp(relief,-.55,.39);
}

fn studioGeologicRelief(dir:vec3<f32>,height:f32)->f32 {
  let offset=seedOffset3(params.seed);
  if(params.voroMode==1u){
    // Stretch the folded noise along an oblique axis to get connected
    // mountain chains. The two sides of the crest erode at different rates.
    let fault=vec3<f32>(
      dot(dir,vec3<f32>(4,-20,22)/30.0),
      dot(dir,vec3<f32>(28,10,4)/30.0),
      dot(dir,vec3<f32>(-10,20,20)/30.0)
    );
    let province=simplex3D(dir*6.2-offset);
    let fold=simplex3D(dir*12.0+offset);
    let crossSection=simplex3D(fault*vec3<f32>(31,9,13)+offset+vec3<f32>(.73*fold,0,0));
    let flankWidth=select(.62,.91,crossSection>0.0);
    let crest=max(0.0,1.0-abs(crossSection)/flankWidth);
    let spurLine=simplex3D(fault*vec3<f32>(44,28,37)-offset+fold*.55);
    let spurs=max(0.0,1.0-abs(spurLine)/.60);
    let upland=smoothstep(-.31,.75,height)*smoothstep(-.46,.30,province);
    return upland*((crest-.43)*.59+crest*(spurs-.52)*.15);
  }
  if(params.voroMode==2u){
    // Broad beds erode into isolated, flat-capped blocks. The varying
    // bed thickness keeps ledges from marching across the entire globe.
    let strata=simplex3D(dir*8.0+offset);
    let fracture=simplex3D(dir*24.0-offset+strata*.5);
    let exposure=smoothstep(-.36,.38,strata)*smoothstep(-.44,.23,height);
    let raised=height+.30*smoothstep(-.38,.27,fracture);
    let bed=.27+.12*smoothstep(-.55,.6,strata);
    let layer=(raised+strata*.12)/bed;
    let cap=floor(layer)+smoothstep(.37,.63,fract(layer));
    return exposure*(raised-height+.91*(cap-layer)*bed);
  }
  if(params.voroMode==3u){return studioVolcanicRelief(dir);}
  return 0.0;
}

@compute @workgroup_size(8,8,1)
fn computeStudioSphereRelief(@builtin(global_invocation_id) gid:vec3<u32>){
  let x=i32(gid.x)+frame.originX;
  let y=i32(gid.y)+frame.originY;
  let last=i32(frame.fullWidth)-1;
  if(x>last||y>last){return;}
  let col=x%last;
  let raw=studioSphereHeight(col,y,last);
  if(y==0||y==last){
    storeRGBA(x,y,0,vec4<f32>(raw,0,0,0));
    return;
  }
  let step=PI/f32(last);
  let latitude=f32(y)*step;
  let longitude=2.0*f32(col)*step;
  let radial=sin(latitude);
  let dir=vec3<f32>(radial*cos(longitude),cos(latitude),radial*sin(longitude));
  var h=raw;
  if(params.voroMode==1u){
    let mid=.25*(studioSphereHeight(col-1,y,last)+studioSphereHeight(col+1,y,last)+
      studioSphereHeight(col,y-1,last)+studioSphereHeight(col,y+1,last));
    let broad=.25*(studioSphereHeight(col-3,y,last)+studioSphereHeight(col+3,y,last)+
      studioSphereHeight(col,y-3,last)+studioSphereHeight(col,y+3,last));
    h=mix(raw,.64*mid+.36*broad,.36*smoothstep(0.0,.07,radial));
  }
  storeRGBA(x,y,0,vec4<f32>(h+smoothstep(0.0,.043,radial)*studioGeologicRelief(dir,h),0,0,0));
}

fn applyStudioSphereErosion(gid:vec3<u32>,mountain:bool){
  let x=i32(gid.x)+frame.originX;
  let y=i32(gid.y)+frame.originY;
  let last=i32(frame.fullWidth)-1;
  if(x>last||y>last){return;}
  let col=x%last;
  let h=studioSphereHeight(col,y,last);
  if(y==0||y==last){
    storeRGBA(x,y,0,vec4<f32>(h,0,0,0));
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
  if(mountain){
    // The angular window stays wide on smaller bakes and near the poles.
    let guideY=max(2,i32(round(f32(last)*.012)));
    let guideX=max(1,i32(round(f32(guideY)/max(.5,2.0*radial))));
    rise=vec2<f32>(
      (studioSphereHeight(col+guideX,y,last)-studioSphereHeight(col-guideX,y,last))/f32(guideX),
      (studioSphereHeight(col,y-guideY,last)-studioSphereHeight(col,y+guideY,last))/f32(guideY)
    );
  }else{
    // The local gullies read the mountain cuts from the previous dispatch.
    let localX=studioSphereHeight(col+1,y,last)-studioSphereHeight(col-1,y,last);
    let localY=studioSphereHeight(col,y-1,last)-studioSphereHeight(col,y+1,last);
    let wideX=(studioSphereHeight(col+4,y,last)-studioSphereHeight(col-4,y,last))*.25;
    let wideY=(studioSphereHeight(col,y-4,last)-studioSphereHeight(col,y+4,last))*.25;
    rise=mix(vec2<f32>(localX,localY),vec2<f32>(wideX,wideY),.76);
  }
  let dx=rise.x/(4.0*step*max(radial,.03));
  let dy=rise.y/(2.0*step);
  let gradient=east*dx+north*dy;
  let grade=.023*length(gradient);
  let mountainWear=smoothstep(.042,.25,grade)*select(1.0,.50,params.voroMode==3u);
  let wear=select(smoothstep(.06,.43,grade),mountainWear,mountain);
  let polar=smoothstep(0.0,.043,radial);
  if(wear<=0.0){
    storeRGBA(x,y,0,vec4<f32>(h,0,0,0));
    return;
  }
  let blend=smoothstep(-.19,.19,dir.y);
  let angularSample=step*max(1.0,2.0*radial);
  var delta=0.0;
  if(blend>0.0){
    let chart=studioErosionChart(dir,gradient,1.0,angularSample);
    if(mountain){delta+=blend*studioMountainCut(chart,h);}
    else{delta+=blend*studioGullyCut(chart,h);}
  }
  if(blend<1.0){
    let chart=studioErosionChart(dir,gradient,-1.0,angularSample);
    if(mountain){delta+=(1.0-blend)*studioMountainCut(chart,h);}
    else{delta+=(1.0-blend)*studioGullyCut(chart,h);}
  }
  delta*=wear;
  if(mountain){
    storeRGBA(x,y,0,vec4<f32>(h+polar*delta,0,0,0));
    return;
  }
  // Exposed beds have sharp lips and shelves. Gully noise shifts the seams
  // through the rock so neighboring hills do not share a level staircase.
  let mesa=params.voroMode==2u;
  let bed=select(.155,.205,mesa);
  let elevation=h+delta;
  let stratum=(elevation+.43*delta)/bed;
  let shelf=floor(stratum)+smoothstep(select(.21,.30,mesa),select(.77,.71,mesa),fract(stratum));
  let ledge=(shelf-stratum)*bed*select(select(.42,.23,params.voroMode==1u),.93,mesa)*smoothstep(.18,.88,grade);
  storeRGBA(x,y,0,vec4<f32>(h+polar*(delta+ledge),0,0,0));
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
`;var Q=`// Fullscreen quad (module-scope constant)\r
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
`;var J=`const kQuad : array<vec2<f32>, 6> = array<vec2<f32>, 6>(\r
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
`;var ne=4096;var ee=2048,_e=8,H=class{constructor(t,r){this.device=t,this.queue=r,this.maxBufferChunkBytes=8e6,this.entryPoints=["computePerlin","computeBillow","computeAntiBillow","computeRidge","computeAntiRidge","computeRidgedMultifractal","computeRidgedMultifractal2","computeRidgedMultifractal3","computeRidgedMultifractal4","computeAntiRidgedMultifractal","computeAntiRidgedMultifractal2","computeAntiRidgedMultifractal3","computeAntiRidgedMultifractal4","computeFBM","computeFBM2","computeFBM3","computeCellularBM1","computeCellularBM2","computeCellularBM3","computeVoronoiBM1","computeVoronoiBM2","computeVoronoiBM3","computeCellular","computeWorley","computeAntiCellular","computeAntiWorley","computeLanczosBillow","computeLanczosAntiBillow","computeVoronoiTileNoise","computeVoronoiCircleNoise","computeVoronoiCircle2","computeVoronoiFlatShade","computeVoronoiRipple3D","computeVoronoiRipple3D2","computeVoronoiCircularRipple","computeFVoronoiRipple3D","computeFVoronoiCircularRipple","computeRippleNoise","computeFractalRipples","computeHexWorms","computePerlinWorms","computeWhiteNoise","computeBlueNoise","computeSimplex","computeSimplexFBM","computeCurl2D","computeCurlFBM2D","computeDomainWarpFBM1","computeDomainWarpFBM2","computeGaborAnisotropic","computeGaborMagic","computeGaborFlow","computeTerraceNoise","computeFoamNoise","computeTurbulence","computePerlin4D","computeWorley4D","computeAntiWorley4D","computeCellular4D","computeAntiCellular4D","computeBillow4D","computeAntiBillow4D","computeLanczosBillow4D","computeLanczosAntiBillow4D","computeFBM4D","computeVoronoi4D","computeVoronoiBM1_4D","computeVoronoiBM2_4D","computeVoronoiBM3_4D","computeVoronoiBM1_4D_vec","computeVoronoiBM2_4D_vec","computeVoronoiBM3_4D_vec","computeWorleyBM1_4D","computeWorleyBM2_4D","computeWorleyBM3_4D","computeWorleyBM1_4D_vec","computeWorleyBM2_4D_vec","computeWorleyBM3_4D_vec","computeCellularBM1_4D","computeCellularBM2_4D","computeCellularBM3_4D","computeCellularBM1_4D_vec","computeCellularBM2_4D_vec","computeCellularBM3_4D_vec","computeTerraceNoise4D","computeFoamNoise4D","computeTurbulence4D","computeSmokeNoise","computeTerrainNoise","computeHydrologyErosionHeightfield","computeStudioSphereErosion","computeHydrologyGuideField","computeHydrologyDrainageMask","computeGauss5x5","computeNormal","computeNormal8","computeSphereNormal","computeNormalVolume","clearTexture","computeStudioSphereRelief","computeStudioSphereMountainErosion"],this.shaderModule=t.createShaderModule({code:se}),this.bindGroupLayout=t.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:1,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:2,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:3,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:4,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"2d-array"}},{binding:5,visibility:GPUShaderStage.COMPUTE,buffer:{type:"read-only-storage"}},{binding:6,visibility:GPUShaderStage.COMPUTE,buffer:{type:"uniform"}},{binding:7,visibility:GPUShaderStage.COMPUTE,texture:{sampleType:"float",viewDimension:"3d"}},{binding:8,visibility:GPUShaderStage.COMPUTE,storageTexture:{access:"write-only",format:"rgba16float",viewDimension:"3d"}}]}),this.pipelineLayout=t.createPipelineLayout({bindGroupLayouts:[this.bindGroupLayout]}),this.pipelines=new Map,this._texPairs=new Map,this._tid=null,this._tag=new WeakMap,this._default2DKey="__default2d",this._volumeCache=new Map,this.viewA=null,this.viewB=null,this.width=0,this.height=0,this.layers=1,this.isA=!0,this._initBuffers(),this._ensureDummies(),this._ctxMap=new WeakMap}_initBuffers(){this.optionsBuffer?.destroy(),this.paramsBuffer?.destroy(),this.permBuffer?.destroy(),this.nullPosBuffer?.destroy(),this.optionsBuffer=this.device.createBuffer({size:32,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.paramsBuffer=this.device.createBuffer({size:96,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}),this.permBuffer=this.device.createBuffer({size:512*4,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.nullPosBuffer=this.device.createBuffer({size:64,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST}),this.queue.writeBuffer(this.optionsBuffer,0,new ArrayBuffer(32)),this.queue.writeBuffer(this.paramsBuffer,0,new ArrayBuffer(96)),this.queue.writeBuffer(this.permBuffer,0,new Uint32Array(512))}_ensureDummies(){this._dummy2D_sampleTex||(this._dummy2D_sampleTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy2D_sampleView=this._dummy2D_sampleTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy2D_writeTex||(this._dummy2D_writeTex=this.device.createTexture({size:[1,1,1],format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy2D_writeView=this._dummy2D_writeTex.createView({dimension:"2d-array",arrayLayerCount:1})),this._dummy3D_sampleTex||(this._dummy3D_sampleTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC}),this._dummy3D_sampleView=this._dummy3D_sampleTex.createView({dimension:"3d"})),this._dummy3D_writeTex||(this._dummy3D_writeTex=this.device.createTexture({size:{width:1,height:1,depthOrArrayLayers:1},dimension:"3d",format:"rgba16float",usage:GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.COPY_DST}),this._dummy3D_writeView=this._dummy3D_writeTex.createView({dimension:"3d"}))}_getMaxBufferChunkBytes(t){let r=this.device?.limits?.maxBufferSize??268435456,e=Math.max(1024*1024,Math.floor(r*.9)),i=Number.isFinite(t)?Math.floor(t):this.maxBufferChunkBytes;return(!Number.isFinite(i)||i<=0)&&(i=this.maxBufferChunkBytes),i=Math.max(4,i)&-4,Math.min(e,i)}_writeBufferChunked(t,r,e,i,a,o=null){let s=a|0;if(!(s>0))return;let l=this._getMaxBufferChunkBytes(o),n=0;for(;n<s;){let u=Math.min(l,s-n)|0;if(u=u&-4,u<=0)break;this.queue.writeBuffer(t,r+n|0,e,i+n|0,u),n=n+u|0}if(n!==s)throw new Error(`_writeBufferChunked: incomplete write ${n}/${s} bytes`)}async _readBGRA8TextureToRGBA8Pixels(t,r,e,i={}){let a=Math.max(1,r|0),o=Math.max(1,e|0),s=4,l=256,n=a*s,u=Math.ceil(n/l)*l,p=this.device?.limits?.maxBufferSize??256*1024*1024,f=Math.max(1024*1024,Math.floor(p*.9)),d=this._getMaxBufferChunkBytes(i.maxBufferChunkBytes);if(d<u&&(d=u),u>f)throw new Error(`_readBGRA8TextureToRGBA8Pixels: bytesPerRow=${u} exceeds safe buffer cap=${f}`);let g=Math.max(1,Math.floor(d/u))|0,h=new Uint8ClampedArray(a*o*4),y=[],z=this.device.createCommandEncoder();for(let b=0;b<o;b+=g){let _=Math.min(g,o-b)|0,C=u*_|0,T=this.device.createBuffer({size:C,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});z.copyTextureToBuffer({texture:t,origin:{x:0,y:b,z:0}},{buffer:T,bytesPerRow:u,rowsPerImage:_},{width:a,height:_,depthOrArrayLayers:1}),y.push({readBuffer:T,y0:b,rows:_})}if(this.queue.submit([z.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}for(let b of y){let{readBuffer:_,y0:C,rows:T}=b;await _.mapAsync(GPUMapMode.READ);let q=_.getMappedRange(),v=new Uint8Array(q);for(let A=0;A<T;A++){let w=A*u,c=(C+A)*a*4;for(let m=0;m<a;m++){let x=w+m*4,S=c+m*4;h[S+0]=v[x+2],h[S+1]=v[x+1],h[S+2]=v[x+0],h[S+3]=v[x+3]}}_.unmap(),_.destroy()}return h}resize(t){this.maxConfigs=t,this._initBuffers()}setPermTable(t){this.queue.writeBuffer(this.permBuffer,0,t)}setPosBuffer(t){this.posBuffer=t}setInputTextureView(t){try{if(((t?.texture?.usage??0)&GPUTextureUsage.TEXTURE_BINDING)===0){console.warn("setInputTextureView: provided texture view not created with TEXTURE_BINDING; ignoring.");return}}catch{}if(this.inputTextureView=t,this._tid!==null){let r=this._texPairs.get(this._tid);r&&(r.bindGroupDirty=!0)}}setOutputTextureView(t){try{if(((t?.texture?.usage??0)&GPUTextureUsage.STORAGE_BINDING)===0){console.warn("setOutputTextureView: provided texture view not created with STORAGE_BINDING; ignoring.");return}}catch{}if(this.outputTextureView=t,this._tid!==null){let r=this._texPairs.get(this._tid);r&&(r.bindGroupDirty=!0)}}buildPermTable(t=Date.now()){let e=new K(t).perm,i=new Uint32Array(512);for(let a=0;a<512;a++)i[a]=e[a];this.setPermTable(i)}setOptions(t={}){Array.isArray(t.noiseChoices)?this.noiseChoices=t.noiseChoices:this.noiseChoices||(this.noiseChoices=[0]);let{getGradient:r=0,outputChannel:e=1,baseRadius:i=0,heightScale:a=1,useCustomPos:o=0,ioFlags:s=0,sphereOffset:l=0,sphereOffset2:n=0}=t;this.useCustomPos=o>>>0;let u=new ArrayBuffer(32),p=new DataView(u);p.setUint32(0,r,!0),p.setUint32(4,this.useCustomPos,!0),p.setUint32(8,e,!0),p.setUint32(12,s>>>0,!0),p.setFloat32(16,i,!0),p.setFloat32(20,a,!0),p.setFloat32(24,Number.isFinite(Number(l))?Number(l):0,!0),p.setFloat32(28,Number.isFinite(Number(n))?Number(n):0,!0),this.queue.writeBuffer(this.optionsBuffer,0,u);for(let f of this._texPairs.values())f.bindGroupDirty=!0}setNoiseParams(t={}){let r=t||{},e=this._lastNoiseParams||{},i=Object.prototype.hasOwnProperty,a=(R,V)=>{let I=i.call(r,R)?r[R]:e[R],G=Number(I);if(Number.isFinite(G))return G;let L=Number(V);return Number.isFinite(L)?L:0},o=(R,V)=>{let I=i.call(r,R)?r[R]:e[R],G=Number(I);if(Number.isFinite(G))return G>>>0;let L=Number(V);return Number.isFinite(L)?L>>>0:0},s=(R,V)=>{let I=i.call(r,R)?r[R]:e[R],G=Number(I);if(Number.isFinite(G))return G|0;let L=Number(V);return Number.isFinite(L)?L|0:0},l=(R,V)=>{let I=i.call(r,R)?r[R]:e[R];return I===void 0?(V?1:0)>>>0:(I?1:0)>>>0},n=s("seed",e.seed??Date.now()|0),u=a("zoom",e.zoom??1),p=a("freq",e.freq??1),f=Math.max(u||0,1e-6),d=Math.max(p||0,1e-6),g=o("octaves",e.octaves??8),h=l("turbulence",e.turbulence??0),y=a("lacunarity",e.lacunarity??2),z=a("gain",e.gain??.5),b=a("xShift",e.xShift??0),_=a("yShift",e.yShift??0),C=a("zShift",e.zShift??0),T=a("seedAngle",e.seedAngle??0),q=a("exp1",e.exp1??1),v=a("exp2",e.exp2??0),A=a("threshold",e.threshold??.1),w=a("rippleFreq",e.rippleFreq??10),c=a("time",e.time??0),m=a("warpAmp",e.warpAmp??.5),x=a("gaborRadius",e.gaborRadius??4),S=a("terraceStep",e.terraceStep??8),P=l("toroidal",e.toroidal??0),N=o("voroMode",e.voroMode??0),k=a("edgeK",e.edgeK??0),W=a("scalar",e.scalar??1),F=a("transform",e.transform??0),E=new ArrayBuffer(96),D=new DataView(E),B=0;D.setUint32(B+0,n>>>0,!0),D.setFloat32(B+4,f,!0),D.setFloat32(B+8,d,!0),D.setUint32(B+12,g>>>0,!0),D.setFloat32(B+16,y,!0),D.setFloat32(B+20,z,!0),D.setFloat32(B+24,b,!0),D.setFloat32(B+28,_,!0),D.setFloat32(B+32,C,!0),D.setUint32(B+36,h>>>0,!0),D.setFloat32(B+40,T,!0),D.setFloat32(B+44,q,!0),D.setFloat32(B+48,v,!0),D.setFloat32(B+52,A,!0),D.setFloat32(B+56,w,!0),D.setFloat32(B+60,c,!0),D.setFloat32(B+64,m,!0),D.setFloat32(B+68,x,!0),D.setFloat32(B+72,S,!0),D.setUint32(B+76,P>>>0,!0),D.setUint32(B+80,N>>>0,!0),D.setFloat32(B+84,k,!0),D.setFloat32(B+88,W,!0),D.setFloat32(B+92,F,!0),this.queue.writeBuffer(this.paramsBuffer,0,E),this._lastNoiseParams={seed:n,zoom:f,freq:d,octaves:g,lacunarity:y,gain:z,xShift:b,yShift:_,zShift:C,turbulence:h,seedAngle:T,exp1:q,exp2:v,threshold:A,rippleFreq:w,time:c,warpAmp:m,gaborRadius:x,terraceStep:S,toroidal:P,voroMode:N,edgeK:k,scalar:W,transform:F};for(let R of this._texPairs.values())R.bindGroupDirty=!0;for(let[R,V]of this._volumeCache)!V||!Array.isArray(V.chunks)||(V._bindGroupsDirty=!0)}_numOr0(t){let r=Number(t);return Number.isFinite(r)?r:0}_resolveScroll2D(t,r,e,i,a,o){let s=t||{},l=Math.max(1,r|0),n=Math.max(1,e|0),u=Math.max(1,(i??l)|0),p=Math.max(1,(a??n)|0),f=o?u:l,d=o?p:n,g=this._numOr0(s.offsetX)*f,h=this._numOr0(s.offsetY)*d,y=g+this._numOr0(s.offsetXf)+this._numOr0(s.originXf)+this._numOr0(s.originX),z=h+this._numOr0(s.offsetYf)+this._numOr0(s.originYf)+this._numOr0(s.originY);return{baseXf:y,baseYf:z}}_resolveScroll3D(t,r,e,i){let a=t||{},o=Math.max(1,r|0),s=Math.max(1,e|0),l=Math.max(1,i|0),n=this._numOr0(a.offsetX)*o,u=this._numOr0(a.offsetY)*s,p=this._numOr0(a.offsetZ)*l,f=n+this._numOr0(a.offsetXf)+this._numOr0(a.originXf)+this._numOr0(a.originX),d=u+this._numOr0(a.offsetYf)+this._numOr0(a.originYf)+this._numOr0(a.originY),g=p+this._numOr0(a.offsetZf)+this._numOr0(a.originZf)+this._numOr0(a.originZ),h=Math.floor(g)|0;return{baseXf:f,baseYf:d,baseZ:h}}_update2DTileFrames(t,r={}){let e=this._texPairs.get(t);if(!e||!Array.isArray(e.tiles)||e.tiles.length===0)return;let i=Number.isFinite(r.frameFullWidth)?r.frameFullWidth>>>0:e.fullWidth,a=Number.isFinite(r.frameFullHeight)?r.frameFullHeight>>>0:e.fullHeight,o=r.squareWorld||String(r.worldMode||"").toLowerCase()==="crop";if(r.squareWorld){let d=Math.max(i,a,e.fullWidth,e.fullHeight)>>>0;i=d,a=d}let s=e.fullWidth>>>0,l=e.fullHeight>>>0,{baseXf:n,baseYf:u}=this._resolveScroll2D(r,s,l,i,a,o),p=o?1:i/Math.max(1,s),f=o?1:a/Math.max(1,l);for(let d of e.tiles){let g=d?.frames?.[0];if(!g)continue;let h=d.originX|0,y=d.originY|0,z=(h+n)*p,b=(y+u)*f,_=i>0?z/i:0,C=a>0?b/a:0;this._writeFrameUniform(g,{fullWidth:i,fullHeight:a,tileWidth:e.tileWidth,tileHeight:e.tileHeight,originX:h,originY:y,originZ:0,fullDepth:1,tileDepth:1,layerIndex:d.layerIndex|0,layers:e.layers>>>0,originXf:_,originYf:C})}}_update3DChunkFrames(t,r=null,e={}){if(!t||!Array.isArray(t.chunks)||t.chunks.length===0)return;let i=r&&Number.isFinite(r?.w)?r.w>>>0:t.full.w,a=r&&Number.isFinite(r?.h)?r.h>>>0:t.full.h,o=r&&Number.isFinite(r?.d)?r.d>>>0:t.full.d,s=t.full.w>>>0,l=t.full.h>>>0,n=t.full.d>>>0,{baseXf:u,baseYf:p,baseZ:f}=this._resolveScroll3D(e,s,l,n),d=i/Math.max(1,s),g=a/Math.max(1,l);for(let h of t.chunks){h.fb||(h.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}));let y=((h.ox|0)+u)*d,z=((h.oy|0)+p)*g,b=i>0?y/i:0,_=a>0?z/a:0,C=(h.oz|0)+f|0;this._writeFrameUniform(h.fb,{fullWidth:i,fullHeight:a,tileWidth:h.w,tileHeight:h.h,originX:h.ox|0,originY:h.oy|0,originZ:C,fullDepth:o,tileDepth:h.d,layerIndex:0,layers:1,originXf:b,originYf:_})}}_compute2DTiling(t,r){let e=Math.min(t,ne),i=Math.min(r,ne),a=Math.ceil(t/e),o=Math.ceil(r/i),s=a*o;return{tileW:e,tileH:i,tilesX:a,tilesY:o,layers:s}}_create2DPair(t,r,e=null){let i=this._compute2DTiling(t,r),a=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST,o=d=>this.device.createTexture({label:d,size:[i.tileW,i.tileH,i.layers],format:"rgba16float",usage:a}),s={dimension:"2d-array",arrayLayerCount:i.layers},l=e!=null?String(e):String(this._texPairs.size),n=o(`2D texA ${t}x${r}x${i.layers} (${l})`),u=o(`2D texB ${t}x${r}x${i.layers} (${l})`),p=n.createView(s),f=u.createView(s);return p.label=`2D:viewA (${l})`,f.label=`2D:viewB (${l})`,this._tag.set(p,`2D:A (${l})`),this._tag.set(f,`2D:B (${l})`),this._texPairs.set(l,{texA:n,texB:u,viewA:p,viewB:f,fullWidth:t,fullHeight:r,tileWidth:i.tileW,tileHeight:i.tileH,tilesX:i.tilesX,tilesY:i.tilesY,layers:i.layers,isA:!0,tiles:null,bindGroupDirty:!0}),this._tid===null&&this.setActiveTexture(l),l}createShaderTextures(t,r){this._tid!==null&&this._texPairs.has(this._tid)&&this.destroyTexturePair(this._tid);let e=this._create2DPair(t,r);return this.setActiveTexture(e),e}destroyTexturePair(t){let r=String(t),e=this._texPairs.get(r);if(e){try{e.texA.destroy()}catch{}try{e.texB.destroy()}catch{}if(Array.isArray(e.tiles))for(let i of e.tiles){if(Array.isArray(i.frames))for(let a of i.frames)try{a.destroy()}catch{}if(i.posBuf&&i.posBuf!==this.nullPosBuffer)try{i.posBuf.destroy()}catch{}}this._texPairs.delete(r),this._tid===r&&(this._tid=null,this.inputTextureView=null,this.outputTextureView=null,this.viewA=null,this.viewB=null)}}destroyAllTexturePairs(){let t=Array.from(this._texPairs.keys());for(let r of t)this.destroyTexturePair(r)}dispose(){if(!this.disposed){this.disposed=!0,this.destroyAllTexturePairs(),this.destroyAllVolumes();for(let t of[this.optionsBuffer,this.paramsBuffer,this.permBuffer,this.nullPosBuffer,this._dummy2D_sampleTex,this._dummy2D_writeTex,this._dummy3D_sampleTex,this._dummy3D_writeTex,this.blit2DUbo,this.blit3DUbo])t?.destroy();this.pipelines.clear()}}setActiveTexture(t){let r=String(t);if(!this._texPairs.has(r))throw new Error("setActiveTexture: invalid id");this._tid=r;let e=this._texPairs.get(r);this.viewA=e.viewA,this.viewB=e.viewB,this.width=e.tileWidth,this.height=e.tileHeight,this.layers=e.layers,this.inputTextureView=e.isA?e.viewA:e.viewB,this.outputTextureView=e.isA?e.viewB:e.viewA}_buildPosBuffer(t,r,e){if(!(e instanceof Float32Array)||e.byteLength<=0)return this.nullPosBuffer;let i=Math.max(1,Math.floor(t)),a=Math.max(1,Math.floor(r)),s=i*a*4;if(e.length!==s)throw new Error(`_buildPosBuffer: customData length ${e.length} != expected ${s} (width=${i}, height=${a})`);let l=this.device?.limits?.maxBufferSize??2147483648,n=this.device?.limits?.maxStorageBufferBindingSize??134217728,u=Math.floor(Math.min(l,n)*.98);if(e.byteLength>u)throw new Error(`_buildPosBuffer: ${e.byteLength} bytes exceeds the safe storage binding limit ${u} (maxBufferSize=${l}, maxStorageBufferBindingSize=${n}, w=${i}, h=${a})`);let p=this.device.createBuffer({size:e.byteLength,usage:GPUBufferUsage.STORAGE|GPUBufferUsage.COPY_DST});return this._writeBufferChunked(p,0,e.buffer,e.byteOffset,e.byteLength,this.maxBufferChunkBytes),p}_writeFrameUniform(t,r){let e=new ArrayBuffer(64),i=new DataView(e);i.setUint32(0,r.fullWidth>>>0,!0),i.setUint32(4,r.fullHeight>>>0,!0),i.setUint32(8,r.tileWidth>>>0,!0),i.setUint32(12,r.tileHeight>>>0,!0),i.setInt32(16,r.originX|0,!0),i.setInt32(20,r.originY|0,!0),i.setInt32(24,r.originZ|0,!0),i.setUint32(28,r.fullDepth>>>0,!0),i.setUint32(32,r.tileDepth>>>0,!0),i.setInt32(36,r.layerIndex|0,!0),i.setUint32(40,r.layers>>>0,!0),i.setUint32(44,0,!0),i.setFloat32(48,r.originXf??0,!0),i.setFloat32(52,r.originYf??0,!0),i.setFloat32(56,0,!0),i.setFloat32(60,0,!0),this.queue.writeBuffer(t,0,e)}_create2DTileBindGroups(t,r={}){let e=this._texPairs.get(t);if(!e)throw new Error("_create2DTileBindGroups: invalid tid");let i=((r.useCustomPos??0)|0)>>>0,a=i===2||i===3,o=i!==0&&!a,s=o&&r.customData instanceof Float32Array?r.customData:null,l=!!s,n=Array.isArray(e.tiles)&&e.tiles.some(f=>f&&f.posIsCustom),u=o&&!l;if(!l&&n&&!u&&(e.bindGroupDirty=!0),Array.isArray(e.tiles)&&!e.bindGroupDirty&&!l)return;let p=[];for(let f=0;f<e.tilesY;f++)for(let d=0;d<e.tilesX;d++){let g=f*e.tilesX+d,h=d*e.tileWidth,y=f*e.tileHeight,z=e.tiles&&e.tiles[g]||null,b=this.nullPosBuffer,_=!1;if(l)b=this._buildPosBuffer(e.tileWidth,e.tileHeight,s),_=b!==this.nullPosBuffer;else if(u&&z&&z.posBuf&&z.posIsCustom)b=z.posBuf,_=!0;else{if(u)throw new Error("_create2DTileBindGroups: useCustomPos=1 was requested without customData and no reusable custom position buffer exists.");if(!a&&z&&z.posBuf&&!z.posIsCustom)b=z.posBuf,_=!1;else if(b=this.nullPosBuffer,_=!1,z&&z.posBuf&&z.posIsCustom)try{z.posBuf.destroy()}catch{}}let C;z&&z.frames&&z.frames[0]?C=z.frames[0]:C=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let T=Number.isFinite(r.frameFullWidth)?r.frameFullWidth>>>0:e.fullWidth,q=Number.isFinite(r.frameFullHeight)?r.frameFullHeight>>>0:e.fullHeight,v=r.squareWorld||String(r.worldMode||"").toLowerCase()==="crop";if(r.squareWorld){let x=Math.max(T,q,e.fullWidth,e.fullHeight)>>>0;T=x,q=x}let A,w;if(v)A=h,w=y;else{let x=T/e.fullWidth,S=q/e.fullHeight;A=h*x,w=y*S}this._writeFrameUniform(C,{fullWidth:T,fullHeight:q,tileWidth:e.tileWidth,tileHeight:e.tileHeight,originX:h,originY:y,originZ:0,fullDepth:1,tileDepth:1,layerIndex:g,layers:e.layers,originXf:A,originYf:w});let c=z?.bgs?.[0]?.bgA??null,m=z?.bgs?.[0]?.bgB??null;(!c||!m||e.bindGroupDirty)&&(c=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:e.viewA},{binding:4,resource:e.viewB},{binding:5,resource:{buffer:b}},{binding:6,resource:{buffer:C}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]}),m=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:e.viewB},{binding:4,resource:e.viewA},{binding:5,resource:{buffer:b}},{binding:6,resource:{buffer:C}},{binding:7,resource:this._dummy3D_sampleView},{binding:8,resource:this._dummy3D_writeView}]})),p.push({layerIndex:g,originX:h,originY:y,frames:[C],posBuf:b,posIsCustom:_,bgs:[{bgA:c,bgB:m}]})}e.tiles=p,e.bindGroupDirty=!1,this._tid===t&&(this._tiles=p)}async _runPipelines(t,r,e,i,a,o,s=1){let l=t,n=r,u=Array.isArray(o),p=0,f=this.device.createCommandEncoder(),d=f.beginComputePass();for(let g of this.noiseChoices){let h=typeof g=="number"?this.entryPoints[g]:g,y=this.pipelines.get(h);y||(y=this.device.createComputePipeline({layout:this.pipelineLayout,compute:{module:this.shaderModule,entryPoint:h}}),this.pipelines.set(h,y)),u&&this.setNoiseParams(o[p++]),d.setPipeline(y),d.setBindGroup(0,l),d.dispatchWorkgroups(Math.ceil(e/8),Math.ceil(i/8),s),[l,n]=[n,l]}return d.end(),this.queue.submit([f.finish()]),n}async computeToTexture(t,r,e={},i={}){let a=t|0,o=r|0;if(!(a>0&&o>0))throw new Error(`computeToTexture: invalid size ${t}x${r}`);let s=this._get2DKey(i),l=this._texPairs.get(s);l?(l.fullWidth!==a||l.fullHeight!==o)&&(this.destroyTexturePair(s),this._create2DPair(a,o,s)):this._create2DPair(a,o,s),this.setActiveTexture(s);let n=this._texPairs.get(s);if(!n)throw new Error("computeToTexture: missing pair after ensure");e&&!Array.isArray(e)&&this.setNoiseParams(e);let u=i||{},p=((u.useCustomPos??0)|0)>>>0,f=p===2||p===3,d=p!==0&&!f,g=d&&u.customData instanceof Float32Array?u.customData:null,h=g?1:f?p:d?1:0;this.setOptions({...u,ioFlags:0,useCustomPos:h});let y={...u,useCustomPos:h,customData:g};(!n.tiles||n.bindGroupDirty||g)&&this._create2DTileBindGroups(s,y),this._update2DTileFrames(s,y);let z=n.isA,b=null,_=null;for(let T of n.tiles){let{bgA:q,bgB:v}=T.bgs[0],A=b?b===q?q:v:z?q:v,w=A===q?v:q;b=await this._runPipelines(A,w,n.tileWidth,n.tileHeight,1,e,1),_={bgA:q,bgB:v}}let C=b===_.bgB;return n.isA=C,this.setActiveTexture(s),this.getCurrentView(s)}_get2DKey(t){let r=t&&t.textureKey!==void 0&&t.textureKey!==null?String(t.textureKey):"";return r&&r.length?r:this._default2DKey}get2DView(t){let r=String(t),e=this._texPairs.get(r);return e?e.isA?e.viewA:e.viewB:null}getCurrentView(t=null){let r=t!=null?String(t):this._tid,e=this._texPairs.get(r);return e?e.isA?e.viewA:e.viewB:null}getCurrentTextureResource(t=null){let r=t!=null?String(t):this._tid,e=this._texPairs.get(r);return e?{texture:e.isA?e.texA:e.texB,view:e.isA?e.viewA:e.viewB,width:e.fullWidth,height:e.fullHeight,layers:e.layers,format:"rgba16float"}:null}_compute3DTiling(t,r,e){let i=Math.min(t,ee),a=Math.min(r,ee),o=this.device?.limits?.maxBufferSize??256*1024*1024,s=i*a*_e,l=Math.max(1,Math.floor(o*.8/Math.max(1,s))),n=Math.min(e,ee,l),u=Math.ceil(t/i),p=Math.ceil(r/a),f=Math.ceil(e/n);return{tw:i,th:a,td:n,nx:u,ny:p,nz:f}}_create3DChunks(t,r,e){let i=this._compute3DTiling(t,r,e),a=[],o=GPUTextureUsage.STORAGE_BINDING|GPUTextureUsage.TEXTURE_BINDING|GPUTextureUsage.COPY_SRC|GPUTextureUsage.COPY_DST;for(let s=0;s<i.nz;s++)for(let l=0;l<i.ny;l++)for(let n=0;n<i.nx;n++){let u=n*i.tw,p=l*i.th,f=s*i.td,d=this.device.createTexture({size:{width:i.tw,height:i.th,depthOrArrayLayers:i.td},dimension:"3d",format:"rgba16float",usage:o}),g=this.device.createTexture({size:{width:i.tw,height:i.th,depthOrArrayLayers:i.td},dimension:"3d",format:"rgba16float",usage:o}),h=d.createView({dimension:"3d"}),y=g.createView({dimension:"3d"});d.label=`3D texA ${i.tw}x${i.th}x${i.td} @ (${n},${l},${s})`,g.label=`3D texB ${i.tw}x${i.th}x${i.td} @ (${n},${l},${s})`,h.label=`3D:viewA[${n},${l},${s}]`,y.label=`3D:viewB[${n},${l},${s}]`,this._tag.set(h,`3D:A[${n},${l},${s}]`),this._tag.set(y,`3D:B[${n},${l},${s}]`),a.push({texA:d,texB:g,viewA:h,viewB:y,ox:u,oy:p,oz:f,w:i.tw,h:i.th,d:i.td,isA:!0,fb:null,posBuf:null,bgA:null,bgB:null})}return{chunks:a,tile:{w:i.tw,h:i.th,d:i.td},full:{w:t,h:r,d:e},grid:{nx:i.nx,ny:i.ny,nz:i.nz}}}_destroy3DSet(t){if(t)for(let r of t.chunks){try{r.texA.destroy()}catch{}try{r.texB.destroy()}catch{}if(r.viewA=null,r.viewB=null,r.bgA=null,r.bgB=null,r.fb){try{r.fb.destroy()}catch{}r.fb=null}if(r.posBuf&&r.posBuf!==this.nullPosBuffer){try{r.posBuf.destroy()}catch{}r.posBuf=null}}}destroyAllVolumes(){for(let[t,r]of this._volumeCache)this._destroy3DSet(r),this._volumeCache.delete(t)}get3DView(t){let r=this._volumeCache.get(String(t));if(!r)return null;let e=r.chunks.map(i=>i.isA?i.viewA:i.viewB);return e.length===1?e[0]:{views:e,meta:{full:r.full,tile:r.tile,grid:r.grid}}}destroyVolume(t){let r=String(t),e=this._volumeCache.get(r);e&&(this._destroy3DSet(e),this._volumeCache.delete(r))}_getOrCreate3DVolume(t,r,e,i=null,a=null){let o=i?String(i):`${t}x${r}x${e}`,s=this._volumeCache.get(o);if(s)return s;s=this._create3DChunks(t,r,e);for(let l of s.chunks){l.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=a&&Number.isFinite(a?.w)?a.w>>>0:s.full.w,u=a&&Number.isFinite(a?.h)?a.h>>>0:s.full.h,p=a&&Number.isFinite(a?.d)?a.d>>>0:s.full.d,f=n/s.full.w,d=u/s.full.h,g=l.ox*f,h=l.oy*d;this._writeFrameUniform(l.fb,{fullWidth:n,fullHeight:u,tileWidth:l.w,tileHeight:l.h,originX:l.ox,originY:l.oy,originZ:l.oz,fullDepth:p,tileDepth:l.d,layerIndex:0,layers:1,originXf:g,originYf:h});let y=this._buildPosBuffer(l.w,l.h,null);l.posBuf=y;try{l.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:y}},{binding:6,resource:{buffer:l.fb}},{binding:7,resource:l.viewA},{binding:8,resource:l.viewB}]}),l.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:l.posBuf}},{binding:6,resource:{buffer:l.fb}},{binding:7,resource:l.viewB},{binding:8,resource:l.viewA}]})}catch(z){throw new Error(`_getOrCreate3DVolume: createBindGroup failed: ${z?.message||z}`)}}return s._bindGroupsDirty=!1,this._volumeCache.set(o,s),s}_recreate3DBindGroups(t,r=null){if(!t||!Array.isArray(t.chunks))return;let e=r&&Number.isFinite(r.w)?r.w>>>0:t.full.w,i=r&&Number.isFinite(r.h)?r.h>>>0:t.full.h,a=r&&Number.isFinite(r.d)?r.d>>>0:t.full.d;for(let o of t.chunks){if(!o.fb){o.fb=this.device.createBuffer({size:64,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST});let n=e/t.full.w,u=i/t.full.h,p=o.ox*n,f=o.oy*u;this._writeFrameUniform(o.fb,{fullWidth:e,fullHeight:i,tileWidth:o.w,tileHeight:o.h,originX:o.ox,originY:o.oy,originZ:o.oz,fullDepth:a,tileDepth:o.d,layerIndex:0,layers:1,originXf:p,originYf:f})}o.posBuf||(o.posBuf=this._buildPosBuffer(o.w,o.h,null));let s=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:o.posBuf}},{binding:6,resource:{buffer:o.fb}},{binding:7,resource:o.viewA},{binding:8,resource:o.viewB}],l=[{binding:0,resource:{buffer:this.optionsBuffer}},{binding:1,resource:{buffer:this.paramsBuffer}},{binding:2,resource:{buffer:this.permBuffer}},{binding:3,resource:this._dummy2D_sampleView},{binding:4,resource:this._dummy2D_writeView},{binding:5,resource:{buffer:o.posBuf}},{binding:6,resource:{buffer:o.fb}},{binding:7,resource:o.viewB},{binding:8,resource:o.viewA}];try{o.bgA=this.device.createBindGroup({layout:this.bindGroupLayout,entries:s}),o.bgB=this.device.createBindGroup({layout:this.bindGroupLayout,entries:l})}catch(n){throw new Error(`_recreate3DBindGroups: failed to create bind groups: ${n?.message||n}`)}}t._bindGroupsDirty=!1}async computeToTexture3D(t,r,e,i={},a={}){let o=t|0,s=r|0,l=e|0;if(!(o>0&&s>0&&l>0))throw new Error(`computeToTexture3D: invalid size ${t}x${r}x${e}`);i&&!Array.isArray(i)&&this.setNoiseParams(i);let n=a||{};this.setOptions({...n,ioFlags:3,useCustomPos:n.useCustomPos??this.useCustomPos});let u=a&&(Number.isFinite(a.frameFullWidth)||Number.isFinite(a.frameFullHeight)||Number.isFinite(a.frameFullDepth))?{w:Number.isFinite(a.frameFullWidth)?a.frameFullWidth>>>0:o,h:Number.isFinite(a.frameFullHeight)?a.frameFullHeight>>>0:s,d:Number.isFinite(a.frameFullDepth)?a.frameFullDepth>>>0:l}:null,p=this._getOrCreate3DVolume(o,s,l,a.id,u);if(!p)throw new Error("computeToTexture3D: failed to create or retrieve volume");(p._bindGroupsDirty||!p.chunks[0].bgA||!p.chunks[0].bgB)&&this._recreate3DBindGroups(p,u),this._update3DChunkFrames(p,u,a);let f=null;for(let g of p.chunks){let h=g.isA?g.bgA:g.bgB,y=g.isA?g.bgB:g.bgA;if(!h||!y)throw new Error("computeToTexture3D: missing bind groups (volume not initialized correctly)");f=await this._runPipelines(h,y,g.w,g.h,g.d,i,g.d),g.isA=f===g.bgB}let d=p.chunks.map(g=>g.isA?g.viewA:g.viewB);return d.length===1?d[0]:{views:d,meta:{full:p.full,tile:p.tile,grid:p.grid}}}configureCanvas(t){let r=navigator.gpu.getPreferredCanvasFormat&&navigator.gpu.getPreferredCanvasFormat()||"bgra8unorm",e=t.getContext("webgpu");e.configure({device:this.device,format:r,alphaMode:"opaque",size:[t.width,t.height]}),this._ctxMap.set(t,{ctx:e,size:[t.width,t.height]})}initBlitRender(){this.sampler||(this.sampler=this.device.createSampler({magFilter:"linear",minFilter:"linear",addressModeU:"clamp-to-edge",addressModeV:"clamp-to-edge"})),this.bgl2D||(this.bgl2D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"2d-array"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline2D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl2D]}),vertex:{module:this.device.createShaderModule({code:Q}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:Q}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit2DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST})),this.bgl3D||(this.bgl3D=this.device.createBindGroupLayout({entries:[{binding:0,visibility:GPUShaderStage.FRAGMENT,sampler:{}},{binding:1,visibility:GPUShaderStage.FRAGMENT,texture:{sampleType:"float",viewDimension:"3d"}},{binding:2,visibility:GPUShaderStage.FRAGMENT,buffer:{type:"uniform"}}]}),this.pipeline3D=this.device.createRenderPipeline({layout:this.device.createPipelineLayout({bindGroupLayouts:[this.bgl3D]}),vertex:{module:this.device.createShaderModule({code:J}),entryPoint:"vs_main"},fragment:{module:this.device.createShaderModule({code:J}),entryPoint:"fs_main",targets:[{format:"bgra8unorm"}]},primitive:{topology:"triangle-list"}}),this.blit3DUbo=this.device.createBuffer({size:16,usage:GPUBufferUsage.UNIFORM|GPUBufferUsage.COPY_DST}))}_renderCommonCanvasSetup(t,r){let e="bgra8unorm",i=this._ctxMap.get(t);if(i){let s=t.width|0,l=t.height|0;(i.size[0]!==s||i.size[1]!==l)&&(i.size=[s,l],i.ctx.configure({device:this.device,format:e,alphaMode:"opaque",size:i.size}))}else{let s=t.getContext("webgpu"),l=[t.width|0,t.height|0];s.configure({device:this.device,format:e,alphaMode:"opaque",size:l}),i={ctx:s,size:l},this._ctxMap.set(t,i)}let a=this.device.createCommandEncoder(),o=a.beginRenderPass({colorAttachments:[{view:i.ctx.getCurrentTexture().createView(),loadOp:r?"clear":"load",clearValue:{r:0,g:0,b:0,a:1},storeOp:"store"}]});return{enc:a,pass:o,ctxEntry:i}}renderTextureToCanvas(t,r,e={}){let{layer:i=0,channel:a=0,preserveCanvasSize:o=!0,clear:s=!0}=e;if(this.initBlitRender(),!o)try{let f=t.texture;f&&typeof f.width=="number"&&typeof f.height=="number"&&(r.width=f.width,r.height=f.height)}catch{}let l=new Uint32Array([i>>>0,a>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,l.buffer,l.byteOffset,l.byteLength);let n=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:t},{binding:2,resource:{buffer:this.blit2DUbo}}]}),{enc:u,pass:p}=this._renderCommonCanvasSetup(r,s);p.setPipeline(this.pipeline2D),p.setBindGroup(0,n),p.draw(6,1,0,0),p.end(),this.queue.submit([u.finish()])}renderTexture3DSliceToCanvas(t,r,e={}){let{depth:i,slice:a=0,zNorm:o=null,channel:s=0,chunk:l=0,preserveCanvasSize:n=!0,clear:u=!0}=e;this.initBlitRender();let p,f;if(t&&t.views&&Array.isArray(t.views)?(p=t.views[Math.max(0,Math.min(l|0,t.views.length-1))],f=t.meta?.tile?.d??i):(p=t,f=i),!p||!f)throw new Error("renderTexture3DSliceToCanvas: need a 3D view and its depth");if(!n)try{let _=p.texture;_&&typeof _.width=="number"&&typeof _.height=="number"&&(r.width=_.width,r.height=_.height)}catch{}let d=o??(Math.min(Math.max(a,0),f-1)+.5)/f;d=Math.min(Math.max(d,0),1);let g=new ArrayBuffer(16),h=new DataView(g);h.setFloat32(0,d,!0),h.setUint32(4,s>>>0,!0),h.setUint32(8,0,!0),h.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,g);let y=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:p},{binding:2,resource:{buffer:this.blit3DUbo}}]}),{enc:z,pass:b}=this._renderCommonCanvasSetup(r,u);b.setPipeline(this.pipeline3D),b.setBindGroup(0,y),b.draw(6,1,0,0),b.end(),this.queue.submit([z.finish()])}setExportBackground(t="black"){this.exportBackground=t}_resolveExportBackground(t){let r=t===void 0?this.exportBackground:t;if(r==null)return{r:0,g:0,b:0,a:1,transparent:!1};if(typeof r=="string"){let i=r.trim().toLowerCase();if(i==="transparent")return{r:0,g:0,b:0,a:0,transparent:!0};if(i==="black")return{r:0,g:0,b:0,a:1,transparent:!1};if(i==="white")return{r:1,g:1,b:1,a:1,transparent:!1};if(i[0]==="#")return this._parseHexBackground(i)}let e=i=>{let a=Number(i);if(!Number.isFinite(a))return 0;let o=a>1?a/255:a;return Math.min(Math.max(o,0),1)};if(Array.isArray(r)){let i=e(r[0]),a=e(r[1]),o=e(r[2]),s=r.length>=4?e(r[3]):1;return{r:i,g:a,b:o,a:s,transparent:s<=0}}if(typeof r=="object"){let i=e(r.r),a=e(r.g),o=e(r.b),s=r.a===void 0?1:e(r.a);return{r:i,g:a,b:o,a:s,transparent:s<=0}}return{r:0,g:0,b:0,a:1,transparent:!1}}_parseHexBackground(t){let r=String(t).trim().replace(/^#/,""),e=f=>f+f,i=0,a=0,o=0,s=255;if(r.length===3||r.length===4)i=parseInt(e(r[0]),16),a=parseInt(e(r[1]),16),o=parseInt(e(r[2]),16),r.length===4&&(s=parseInt(e(r[3]),16));else if(r.length===6||r.length===8)i=parseInt(r.slice(0,2),16),a=parseInt(r.slice(2,4),16),o=parseInt(r.slice(4,6),16),r.length===8&&(s=parseInt(r.slice(6,8),16));else return{r:0,g:0,b:0,a:1,transparent:!1};let l=i/255,n=a/255,u=o/255,p=s/255;return{r:l,g:n,b:u,a:p,transparent:p<=0}}_applyExportBackground(t,r){if(!t||!r||r.transparent)return;let e=Math.round(r.r*255),i=Math.round(r.g*255),a=Math.round(r.b*255),o=Math.round((r.a??1)*255);if(o<=0)return;let s=t.length|0;if(o>=255){for(let l=0;l<s;l+=4){let n=t[l+3]|0;if(n===255)continue;if(n===0){t[l+0]=e,t[l+1]=i,t[l+2]=a,t[l+3]=255;continue}let u=255-n;t[l+0]=(t[l+0]*n+e*u)/255|0,t[l+1]=(t[l+1]*n+i*u)/255|0,t[l+2]=(t[l+2]*n+a*u)/255|0,t[l+3]=255}return}for(let l=0;l<s;l+=4){let n=t[l+0]|0,u=t[l+1]|0,p=t[l+2]|0,f=t[l+3]|0,d=f+o*(255-f)/255|0;if(d<=0){t[l+0]=0,t[l+1]=0,t[l+2]=0,t[l+3]=0;continue}let g=e*o|0,h=i*o|0,y=a*o|0,z=n*f|0,b=u*f|0,_=p*f|0,C=255-f|0,T=z+g*C/255|0,q=b+h*C/255|0,v=_+y*C/255|0;t[l+0]=Math.min(255,Math.max(0,T*255/d|0)),t[l+1]=Math.min(255,Math.max(0,q*255/d|0)),t[l+2]=Math.min(255,Math.max(0,v*255/d|0)),t[l+3]=Math.min(255,Math.max(0,d))}}_forceOpaqueAlpha(t){let r=t.length|0;for(let e=3;e<r;e+=4)t[e]=255}async export2DTextureToPNGBlob(t,r,e,i={}){if(!t)throw new Error("export2DTextureToPNGBlob: textureView is required");let a=Math.max(1,r|0),o=Math.max(1,e|0),s=i.layer??0,l=i.channel??0,n=this._resolveExportBackground(i.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let p=this.device.createTexture({size:[a,o,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),f=new Uint32Array([s>>>0,l>>>0,0,0]);this.queue.writeBuffer(this.blit2DUbo,0,f.buffer,f.byteOffset,f.byteLength);let d=this.device.createBindGroup({layout:this.bgl2D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:t},{binding:2,resource:{buffer:this.blit2DUbo}}]}),g=this.device.createCommandEncoder(),h=g.beginRenderPass({colorAttachments:[{view:p.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});if(h.setPipeline(this.pipeline2D),h.setBindGroup(0,d),h.draw(6,1,0,0),h.end(),this.queue.submit([g.finish()]),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let y=await this._readBGRA8TextureToRGBA8Pixels(p,a,o,{maxBufferChunkBytes:i.maxBufferChunkBytes??this.maxBufferChunkBytes});p.destroy();let z=i.useAlphaForBackground===!0;n.transparent||z?this._applyExportBackground(y,n):this._forceOpaqueAlpha(y);let b=document.createElement("canvas");b.width=a,b.height=o;let _=b.getContext("2d");if(!_)throw new Error("export2DTextureToPNGBlob: unable to get 2D context");return _.putImageData(new ImageData(y,a,o),0,0),await new Promise((T,q)=>{b.toBlob(v=>{v?T(v):q(new Error("export2DTextureToPNGBlob: toBlob returned null"))},"image/png")})}async exportCurrent2DToPNGBlob(t,r,e={}){let i=this.getCurrentView();if(!i)throw new Error("exportCurrent2DToPNGBlob: no active 2D texture view");return this.export2DTextureToPNGBlob(i,t,r,e)}async export3DSliceToPNGBlob(t,r,e,i={}){if(!t)throw new Error("export3DSliceToPNGBlob: target is required");let a=Math.max(1,r|0),o=Math.max(1,e|0),{depth:s,slice:l=0,zNorm:n=null,channel:u=0,chunk:p=0}=i;if(!s||s<=0)throw new Error("export3DSliceToPNGBlob: depth must be provided and > 0");let f=this._resolveExportBackground(i.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let d,g;if(t&&t.views&&Array.isArray(t.views)){let D=Math.max(0,Math.min(p|0,t.views.length-1));d=t.views[D],g=t.meta?.tile?.d??s}else d=t,g=s;if(!d||!g)throw new Error("export3DSliceToPNGBlob: need a 3D view and its depth");let h=n??(Math.min(Math.max(l,0),g-1)+.5)/g;h=Math.min(Math.max(h,0),1);let z=this.device.createTexture({size:[a,o,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),b=new ArrayBuffer(16),_=new DataView(b);_.setFloat32(0,h,!0),_.setUint32(4,u>>>0,!0),_.setUint32(8,0,!0),_.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,b);let C=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:d},{binding:2,resource:{buffer:this.blit3DUbo}}]}),T=this.device.createCommandEncoder(),q=T.beginRenderPass({colorAttachments:[{view:z.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});q.setPipeline(this.pipeline3D),q.setBindGroup(0,C),q.draw(6,1,0,0),q.end();let v=4,A=256,w=a*v,c=Math.ceil(w/A)*A,m=c*o,x=this.device.createBuffer({size:m,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});T.copyTextureToBuffer({texture:z},{buffer:x,bytesPerRow:c,rowsPerImage:o},{width:a,height:o,depthOrArrayLayers:1}),this.queue.submit([T.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await x.mapAsync(GPUMapMode.READ);let S=x.getMappedRange(),P=new Uint8Array(S),N=new Uint8ClampedArray(a*o*v),k=0;for(let D=0;D<o;D++){let B=D*c;for(let R=0;R<a;R++){let V=B+R*4;N[k++]=P[V+2],N[k++]=P[V+1],N[k++]=P[V+0],N[k++]=P[V+3]}}x.unmap(),x.destroy(),z.destroy(),this._applyExportBackground(N,f);let W=document.createElement("canvas");W.width=a,W.height=o;let F=W.getContext("2d");if(!F)throw new Error("export3DSliceToPNGBlob: unable to get 2D context");return F.putImageData(new ImageData(N,a,o),0,0),await new Promise((D,B)=>{W.toBlob(R=>{R?D(R):B(new Error("export3DSliceToPNGBlob: toBlob returned null"))},"image/png")})}async _render3DSliceToRGBA8Pixels(t,r,e,i,a=0,o=null){if(!t)throw new Error("_render3DSliceToRGBA8Pixels: view3D is required");let s=Math.max(1,r|0),l=Math.max(1,e|0);this.initBlitRender();let n=Math.min(Math.max(Number(i)||0,0),1),p=this.device.createTexture({size:[s,l,1],format:"bgra8unorm",usage:GPUTextureUsage.RENDER_ATTACHMENT|GPUTextureUsage.COPY_SRC}),f=new ArrayBuffer(16),d=new DataView(f);d.setFloat32(0,n,!0),d.setUint32(4,a>>>0,!0),d.setUint32(8,0,!0),d.setUint32(12,0,!0),this.queue.writeBuffer(this.blit3DUbo,0,f);let g=this.device.createBindGroup({layout:this.bgl3D,entries:[{binding:0,resource:this.sampler},{binding:1,resource:t},{binding:2,resource:{buffer:this.blit3DUbo}}]}),h=this.device.createCommandEncoder(),y=h.beginRenderPass({colorAttachments:[{view:p.createView(),loadOp:"clear",storeOp:"store",clearValue:{r:0,g:0,b:0,a:0}}]});y.setPipeline(this.pipeline3D),y.setBindGroup(0,g),y.draw(6,1,0,0),y.end();let z=4,b=256,_=s*z,C=Math.ceil(_/b)*b,T=C*l,q=this.device.createBuffer({size:T,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});h.copyTextureToBuffer({texture:p},{buffer:q,bytesPerRow:C,rowsPerImage:l},{width:s,height:l,depthOrArrayLayers:1}),this.queue.submit([h.finish()]),this.queue&&this.queue.onSubmittedWorkDone&&await this.queue.onSubmittedWorkDone(),await q.mapAsync(GPUMapMode.READ);let v=q.getMappedRange(),A=new Uint8Array(v),w=new Uint8ClampedArray(s*l*z),c=0;for(let m=0;m<l;m++){let x=m*C;for(let S=0;S<s;S++){let P=x+S*4;w[c++]=A[P+2],w[c++]=A[P+1],w[c++]=A[P+0],w[c++]=A[P+3]}}return q.unmap(),q.destroy(),p.destroy(),o&&this._applyExportBackground(w,o),w}async export3DTilesetToPNGBlob(t,r,e,i={}){if(!t)throw new Error("export3DTilesetToPNGBlob: target is required");let a=Math.max(1,r|0),o=Math.max(1,(e??r)|0),{depth:s,channel:l=0,chunk:n=0,tilesAcross:u=16,tilesDown:p=null,startSlice:f=0,sliceCount:d=null}=i,g=this._resolveExportBackground(i.background);if(this.initBlitRender(),this.queue&&this.queue.onSubmittedWorkDone)try{await this.queue.onSubmittedWorkDone()}catch{}let h,y;if(t&&t.views&&Array.isArray(t.views)){let x=Math.max(0,Math.min(n|0,t.views.length-1));h=t.views[x],y=t.meta?.tile?.d??s}else h=t,y=s;if(!h)throw new Error("export3DTilesetToPNGBlob: missing 3D view");if(!y||y<=0)throw new Error("export3DTilesetToPNGBlob: depth must be provided and > 0");let z=Math.max(1,u|0),b=p!=null?Math.max(1,p|0):Math.ceil(y/z),_=Math.min(Math.max(f|0,0),y-1),C=d!=null?Math.max(0,d|0):y-_,T=a*z,q=o*b,v=new Uint8ClampedArray(T*q*4),A=Math.min(y,_+C);for(let x=_;x<A;x++){let S=x-_,P=S%z,N=S/z|0;if(N>=b)break;let k=(x+.5)/y,W=await this._render3DSliceToRGBA8Pixels(h,a,o,k,l,g),F=P*a,E=N*o;for(let D=0;D<o;D++){let B=D*a*4,R=((E+D)*T+F)*4;v.set(W.subarray(B,B+a*4),R)}}let w=document.createElement("canvas");w.width=T,w.height=q;let c=w.getContext("2d");if(!c)throw new Error("export3DTilesetToPNGBlob: unable to get 2D context");return c.putImageData(new ImageData(v,T,q),0,0),await new Promise((x,S)=>{w.toBlob(P=>{P?x(P):S(new Error("export3DTilesetToPNGBlob: toBlob returned null"))},"image/png")})}},K=class{constructor(t=Date.now()){t<1e7&&(t*=1e7),this.seedN=t,this.seedK=t,this.perm=new Uint8Array(512),this.seed(t)}seed(t){let r=this.xorshift(t);for(let e=0;e<256;e++)this.perm[e]=e;for(let e=255;e>0;e--){let i=Math.floor(r()*(e+1));[this.perm[e],this.perm[i]]=[this.perm[i],this.perm[e]]}for(let e=0;e<256;e++)this.perm[e+256]=this.perm[e]}setSeed(t){this.seedN=t,this.seed(t),this.resetSeed()}random(t,r,e){let i;return typeof e=="number"?i=this.perm[(t&255)+this.perm[(r&255)+this.perm[e&255]]]&255:i=this.perm[(t&255)+this.perm[r&255]]&255,this.perm[i]/255*2-1}seededRandom(){this.seedK+=Math.E;let t=1e9*Math.sin(this.seedK);return t-Math.floor(t)}resetSeed(){this.seedK=this.seedN}xorshift(t){let r=t;return function(){return r^=r<<13,r^=r>>17,r^=r<<5,(r<0?1+~r:r)/4294967295}}dot(t,r=0,e=0,i=0){return t[0]*r+t[1]*e+t[2]*i}};function fe(M,t,r=1){let e=t-1,i=e*(t-2),a=new Int32Array(i).fill(-1),o=new Int32Array(i).fill(-1),s=new Uint8Array(i),l=new Float32Array(i),n=new Float32Array(i),u=new Float32Array(i),p=new Uint32Array(i),f=v=>(v+e)%e,d=Float64Array.from({length:t},(v,A)=>Math.sin(Math.PI*A/e));for(let v=1;v<e;v++){let A=d[v],w=Math.max(.06,2*A),c=1/Math.hypot(1,w);for(let m=0;m<e;m++){let x=(v-1)*e+m,S=M[v*t+m];u[x]=A;let P=-1,N=-1,k=0,W=0;for(let F=-1;F<=1;F++){let E=v+F;if(!(E<=0||E>=e))for(let D=-1;D<=1;D++){if(!D&&!F)continue;let B=f(m+D),V=(S-M[E*t+B])*(F?D?c:1:1/w),I=(E-1)*e+B;V>k?(N=P,W=k,P=I,k=V):V>W&&(N=I,W=V)}}P<0||(a[x]=P,l[x]=k,s[P]++,W>=.42*k&&(o[x]=N,s[N]++,n[x]=W*W/(k*k+W*W)))}}let g=0;for(let v=0;v<i;v++)s[v]||(p[g++]=v);for(let v=0;v<g;v++){let A=p[v],w=a[A],c=o[A];if(w<0)continue;let m=u[A]*n[A];u[w]+=u[A]-m,--s[w]||(p[g++]=w),c>=0&&(u[c]+=m,--s[c]||(p[g++]=c))}let h=new Float32Array(i),y=new Float32Array(i),z=new Float32Array(i),b=.66*Math.PI/(.023*e),_=.023*e/Math.PI,C=(1e3/e)**2,T=v=>Math.min(1,Math.max(0,v)),q=[-1,1];for(let v=0;v<i;v++){let A=Math.max(0,u[v]-d[Math.floor(v/e)+1]),w=Math.max(0,Math.min(1,(Math.log2(1+A*C)-2.65)/5.9)),c=l[v]*_;h[v]=w*(.065+.18*w)*(.7+.3*T(c/.22));let m=a[v];if(m>=0){let I=Math.max(0,l[v]-b)*.11;y[v]-=I,y[m]+=I}if(w<.5||m<0)continue;let x=Math.floor(v/e)+1,S=v%e,P=Math.floor(m/e)+1-x,N=(m%e-S+e+1)%e-1,k=l[m]*_,W=T((c-k-.035)/.32),F=1-T(k/.28),E=I=>{let G=Math.max(1,Math.min(e-1,x+I*N));return u[(G-1)*e+f(S-I*P)]},D=T(1.8*(1-Math.max(E(-1),E(1))/u[v])),B=W*F*D*w*.06,R=1-T(c/.13),V=M[x*t+S];for(let I of q){let G=x+I*N;if(R>0&&G>0&&G<e){let L=f(S-I*P),U=(G-1)*e+L,Y=M[G*t+L]-V-.018;z[U]=Math.max(z[U],Math.min(.043,Math.max(0,Y))*R*w)}if(B>0)for(let L=1;L<=3;L++){let U=x+L*P+I*N*Math.min(L,2);if(U<1||U>=e)continue;let Y=f(S+L*N-I*P*Math.min(L,2));y[(U-1)*e+Y]+=B*(1-L/4)}}}for(let v=1;v<e;v++){let A=Math.min(1,Math.min(v,e-v)/Math.max(2,e*.015)),w=r*A*A*(3-2*A);for(let c=0;c<e;c++){let m=(v-1)*e+c,x=0;for(let S=-1;S<=1;S++){let P=Math.max(1,Math.min(e-1,v+S));for(let N=-1;N<=1;N++)x+=h[(P-1)*e+f(c+N)]*(N?1:2)*(S?1:2)}M[v*t+c]+=w*(Math.min(.06,y[m])-z[m]-.52*h[m]-.82*x/16)}M[v*t+e]=M[v*t]}return M}function pe(M,t,r){return De(M,t,r==="volcanic"?.58:1),fe(M,t,r==="alpine"?.58:.7)}function De(M,t,r=1){let e=t-1,i=Math.min(256,Math.floor(e/3.5));if(i<12)return M;let a=i*(i-1),o=e/i,s=new Float32Array(a),l=Float32Array.from({length:i+1},(c,m)=>Math.sin(Math.PI*m/i)),n=(c,m)=>(c+m)%m,u=(c,m)=>M[Math.round(m)*t+n(Math.round(c),e)];for(let c=1;c<i;c++)for(let m=0;m<i;m++){let x=m*o,S=c*o,P=o*.48;s[(c-1)*i+m]=.4*u(x,S)+.15*(u(x-P,S)+u(x+P,S)+u(x,S-P)+u(x,S+P))}let f=s.slice().sort()[Math.floor(a*.2)],d=new Float32Array(a).fill(1/0),g=new Int32Array(a).fill(-1),h=new Uint32Array(a),y=new Uint32Array(a).fill(a),z=new Float32Array(a),b=new Uint32Array(a),_=0;function C(c){let m=_++;for(;m;){let x=m-1>>1;if(d[b[x]]<=d[c])break;b[m]=b[x],m=x}b[m]=c}function T(){let c=b[0],m=b[--_],x=0;for(;x*2+1<_;){let S=x*2+1;if(S+1<_&&d[b[S+1]]<d[b[S]]&&S++,d[m]<=d[b[S]])break;b[x]=b[S],x=S}return b[x]=m,c}for(let c=0;c<a;c++)s[c]<=f&&(d[c]=s[c],C(c));for(let c=0;_;c++){let m=T(),x=m%i,S=Math.floor(m/i)+1,P=l[S],N=Math.max(.08,2*P),k=1/Math.hypot(N,1);h[c]=m,y[m]=c,z[m]=P;let W=0;for(let F=-1;F<=1;F++){let E=S+F;if(!(E<1||E>=i))for(let D=-1;D<=1;D++){if(!D&&!F)continue;let B=(E-1)*i+n(x+D,i);if(d[B]===1/0)d[B]=Math.max(s[B],d[m]+2e-5),g[B]=m,C(B);else if(y[B]<c){let R=(d[m]-d[B])*(F?D?k:1:1/N);R>W&&(W=R,g[m]=B)}}}}for(let c=a-1;c>=0;c--){let m=h[c],x=g[m];x>=0&&(z[x]+=z[m])}let q=new Float32Array(t*t),v=(1e3/i)**2,A=c=>Math.max(0,Math.min(1,(Math.log2(1+z[c]*v)-7.2)/5.5)),w=(c,m)=>{let x=Math.min(1,Math.max(0,(s[c]-f+.12)/.36));return r*m*(.095+.24*m)*(.46+.54*x)};for(let c=0;c<a;c++){let m=g[c];if(m<0)continue;let x=A(c);if(x<=0)continue;let S=A(m),P=Math.floor(c/i)+1,N=c%i*o,k=P*o,W=(n(m%i-c%i+1,i)-1)*o,F=(Math.floor(m/i)-P+1)*o,E=Math.max(.35,2*l[P]),D=W*E,B=D*D+F*F,R=(.43+1.44*x)*o,V=(.43+1.44*S)*o,I=Math.max(R,V),G=I/E,L=w(c,x),U=w(m,S),Y=Math.max(1,Math.floor(Math.min(k,k+F)-I)),de=Math.min(e-1,Math.ceil(Math.max(k,k+F)+I)),ge=Math.floor(Math.min(N,N+W)-G),he=Math.ceil(Math.max(N,N+W)+G);for(let O=Y;O<=de;O++){let j=Math.min(1,Math.min(O,e-O)/(e*.022)),xe=j*j*(3-2*j),ie=O-k;for(let X=ge;X<=he;X++){let ae=(X-N)*E,Z=Math.min(1,Math.max(0,(ae*D+ie*F)/B)),ve=R+Z*(V-R),oe=((ae-Z*D)**2+(ie-Z*F)**2)/ve**2;if(oe>=1)continue;let ye=L+Z*(U-L),$=(1-oe)**2,le=O*t+n(X,e);q[le]=Math.max(q[le],ye*xe*$*(.57+.43*$*$))}}}for(let c=1;c<e;c++){let m=c*t;for(let x=0;x<e;x++)M[m+x]-=q[m+x];M[m+e]=M[m]}return M}var Me=`(()=>{function tt(f,l,R=1){let o=l-1,r=o*(l-2),w=new Int32Array(r).fill(-1),I=new Int32Array(r).fill(-1),k=new Uint8Array(r),Y=new Float32Array(r),_=new Float32Array(r),F=new Float32Array(r),C=new Uint32Array(r),X=c=>(c+o)%o,A=Float64Array.from({length:l},(c,M)=>Math.sin(Math.PI*M/o));for(let c=1;c<o;c++){let M=A[c],m=Math.max(.06,2*M),n=1/Math.hypot(1,m);for(let t=0;t<o;t++){let a=(c-1)*o+t,e=f[c*l+t];F[a]=M;let s=-1,i=-1,d=0,p=0;for(let h=-1;h<=1;h++){let g=c+h;if(!(g<=0||g>=o))for(let x=-1;x<=1;x++){if(!x&&!h)continue;let u=X(t+x),P=(e-f[g*l+u])*(h?x?n:1:1/m),y=(g-1)*o+u;P>d?(i=s,p=d,s=y,d=P):P>p&&(i=y,p=P)}}s<0||(w[a]=s,Y[a]=d,k[s]++,p>=.42*d&&(I[a]=i,k[i]++,_[a]=p*p/(d*d+p*p)))}}let U=0;for(let c=0;c<r;c++)k[c]||(C[U++]=c);for(let c=0;c<U;c++){let M=C[c],m=w[M],n=I[M];if(m<0)continue;let t=F[M]*_[M];F[m]+=F[M]-t,--k[m]||(C[U++]=m),n>=0&&(F[n]+=t,--k[n]||(C[U++]=n))}let j=new Float32Array(r),q=new Float32Array(r),z=new Float32Array(r),b=.66*Math.PI/(.023*o),L=.023*o/Math.PI,J=(1e3/o)**2,G=c=>Math.min(1,Math.max(0,c)),E=[-1,1];for(let c=0;c<r;c++){let M=Math.max(0,F[c]-A[Math.floor(c/o)+1]),m=Math.max(0,Math.min(1,(Math.log2(1+M*J)-2.65)/5.9)),n=Y[c]*L;j[c]=m*(.065+.18*m)*(.7+.3*G(n/.22));let t=w[c];if(t>=0){let y=Math.max(0,Y[c]-b)*.11;q[c]-=y,q[t]+=y}if(m<.5||t<0)continue;let a=Math.floor(c/o)+1,e=c%o,s=Math.floor(t/o)+1-a,i=(t%o-e+o+1)%o-1,d=Y[t]*L,p=G((n-d-.035)/.32),h=1-G(d/.28),g=y=>{let D=Math.max(1,Math.min(o-1,a+y*i));return F[(D-1)*o+X(e-y*s)]},x=G(1.8*(1-Math.max(g(-1),g(1))/F[c])),u=p*h*x*m*.06,W=1-G(n/.13),P=f[a*l+e];for(let y of E){let D=a+y*i;if(W>0&&D>0&&D<o){let S=X(e-y*s),T=(D-1)*o+S,H=f[D*l+S]-P-.018;z[T]=Math.max(z[T],Math.min(.043,Math.max(0,H))*W*m)}if(u>0)for(let S=1;S<=3;S++){let T=a+S*s+y*i*Math.min(S,2);if(T<1||T>=o)continue;let H=X(e+S*i-y*s*Math.min(S,2));q[(T-1)*o+H]+=u*(1-S/4)}}}for(let c=1;c<o;c++){let M=Math.min(1,Math.min(c,o-c)/Math.max(2,o*.015)),m=R*M*M*(3-2*M);for(let n=0;n<o;n++){let t=(c-1)*o+n,a=0;for(let e=-1;e<=1;e++){let s=Math.max(1,Math.min(o-1,c+e));for(let i=-1;i<=1;i++)a+=j[(s-1)*o+X(n+i)]*(i?1:2)*(e?1:2)}f[c*l+n]+=m*(Math.min(.06,q[t])-z[t]-.52*j[t]-.82*a/16)}f[c*l+o]=f[c*l]}return f}function nt(f,l,R){return it(f,l,R==="volcanic"?.58:1),tt(f,l,R==="alpine"?.58:.7)}function it(f,l,R=1){let o=l-1,r=Math.min(256,Math.floor(o/3.5));if(r<12)return f;let w=r*(r-1),I=o/r,k=new Float32Array(w),Y=Float32Array.from({length:r+1},(n,t)=>Math.sin(Math.PI*t/r)),_=(n,t)=>(n+t)%t,F=(n,t)=>f[Math.round(t)*l+_(Math.round(n),o)];for(let n=1;n<r;n++)for(let t=0;t<r;t++){let a=t*I,e=n*I,s=I*.48;k[(n-1)*r+t]=.4*F(a,e)+.15*(F(a-s,e)+F(a+s,e)+F(a,e-s)+F(a,e+s))}let X=k.slice().sort()[Math.floor(w*.2)],A=new Float32Array(w).fill(1/0),U=new Int32Array(w).fill(-1),j=new Uint32Array(w),q=new Uint32Array(w).fill(w),z=new Float32Array(w),b=new Uint32Array(w),L=0;function J(n){let t=L++;for(;t;){let a=t-1>>1;if(A[b[a]]<=A[n])break;b[t]=b[a],t=a}b[t]=n}function G(){let n=b[0],t=b[--L],a=0;for(;a*2+1<L;){let e=a*2+1;if(e+1<L&&A[b[e+1]]<A[b[e]]&&e++,A[t]<=A[b[e]])break;b[a]=b[e],a=e}return b[a]=t,n}for(let n=0;n<w;n++)k[n]<=X&&(A[n]=k[n],J(n));for(let n=0;L;n++){let t=G(),a=t%r,e=Math.floor(t/r)+1,s=Y[e],i=Math.max(.08,2*s),d=1/Math.hypot(i,1);j[n]=t,q[t]=n,z[t]=s;let p=0;for(let h=-1;h<=1;h++){let g=e+h;if(!(g<1||g>=r))for(let x=-1;x<=1;x++){if(!x&&!h)continue;let u=(g-1)*r+_(a+x,r);if(A[u]===1/0)A[u]=Math.max(k[u],A[t]+2e-5),U[u]=t,J(u);else if(q[u]<n){let W=(A[t]-A[u])*(h?x?d:1:1/i);W>p&&(p=W,U[t]=u)}}}}for(let n=w-1;n>=0;n--){let t=j[n],a=U[t];a>=0&&(z[a]+=z[t])}let E=new Float32Array(l*l),c=(1e3/r)**2,M=n=>Math.max(0,Math.min(1,(Math.log2(1+z[n]*c)-7.2)/5.5)),m=(n,t)=>{let a=Math.min(1,Math.max(0,(k[n]-X+.12)/.36));return R*t*(.095+.24*t)*(.46+.54*a)};for(let n=0;n<w;n++){let t=U[n];if(t<0)continue;let a=M(n);if(a<=0)continue;let e=M(t),s=Math.floor(n/r)+1,i=n%r*I,d=s*I,p=(_(t%r-n%r+1,r)-1)*I,h=(Math.floor(t/r)-s+1)*I,g=Math.max(.35,2*Y[s]),x=p*g,u=x*x+h*h,W=(.43+1.44*a)*I,P=(.43+1.44*e)*I,y=Math.max(W,P),D=y/g,S=m(n,a),T=m(t,e),H=Math.max(1,Math.floor(Math.min(d,d+h)-y)),ot=Math.min(o-1,Math.ceil(Math.max(d,d+h)+y)),at=Math.floor(Math.min(i,i+p)-D),ct=Math.ceil(Math.max(i,i+p)+D);for(let B=H;B<=ot;B++){let O=Math.min(1,Math.min(B,o-B)/(o*.022)),rt=O*O*(3-2*O),V=B-d;for(let K=at;K<=ct;K++){let Z=(K-i)*g,N=Math.min(1,Math.max(0,(Z*x+V*h)/u)),et=W+N*(P-W),$=((Z-N*x)**2+(V-N*h)**2)/et**2;if($>=1)continue;let st=S+N*(T-S),Q=(1-$)**2,v=B*l+_(K,o);E[v]=Math.max(E[v],st*rt*Q*(.57+.43*Q*Q))}}}for(let n=1;n<o;n++){let t=n*l;for(let a=0;a<o;a++)f[t+a]-=E[t+a];f[t+o]=f[t]}return f}self.onmessage=({data:{values:f,side:l,geology:R}})=>{let o=nt(f,l,R);self.postMessage(o,[o.buffer])};;if(typeof import_meta !== 'undefined')import_meta.url=location.origin+"/dist/";})();
`,Se=URL.createObjectURL(new globalThis.Blob([Me],{type:"text/javascript"})),ue=Se;var te=123456789;function re(M=123456789,{reseedLayers:t=M!==123456789}={}){let r=M>>>0;function e(){r+=1831565813;let f=Math.imul(r^r>>>15,1|r);return f^=f+Math.imul(f^f>>>7,61|f),((f^f>>>14)>>>0)/4294967296}let i=f=>(e()<.5?-1:1)*e()*f,a=i(.3),o=i(.1),s=e()*.4-.2+.65,l=e()*.2-.1+.65,n=e()*.2-.1,u=2.4,p=[["computeFBM",.8,6,2,.75,n+2],["computeFBM2",1,8,2,.75,n+1.3],["computeVoronoiTileNoise",.35,2,2,.9,s],["computeRidgedMultifractal4",.2,6,2.1,1,s],["computeLanczosBillow",.5,6,2,1,l]].map(([f,d,g,h,y,z],b)=>({entryPoint:f,params:{seed:t?M+(b+1)*15485863>>>0:M,zoom:u*d,freq:1,octaves:g,lacunarity:h,gain:.5,scalar:y,transform:0,xShift:z,yShift:z,zShift:z,seedAngle:Math.PI/2,threshold:.3,voroMode:2,warpAmp:0}}));return{seed:M,sphereOffset:a,sphereOffset2:o,layers:p}}function ce(M,t,r,e,i){return t+i*(.5*(r-M)+i*(M-2.5*t+2*r-.5*e+i*(.5*(e-M)+1.5*(t-r))))}function Pe({side:M,values:t},[r,e,i]){let a=Math.hypot(r,i),o=a>0?Math.atan2(i,r)/(2*Math.PI):0,s=(o-Math.floor(o))*(M-1),l=Math.atan2(a,e)*(M-1)/Math.PI,n=Math.floor(s),u=Math.floor(l),p=d=>(d+M-1)%(M-1),f=d=>{let g=Math.min(M-1,Math.max(0,u+d))*M;return ce(t[g+p(n-1)],t[g+p(n)],t[g+p(n+1)],t[g+p(n+2)],s-n)};return ce(f(-1),f(0),f(1),f(2),l-u)}var me={mixed:0,alpine:1,mesa:2,volcanic:3};async function Ce(M,t,r){if(typeof Worker=="function"){let e;try{return e=new Worker(ue),await new Promise((i,a)=>{e.onmessage=({data:o})=>i(o),e.onerror=a,e.onmessageerror=a,e.postMessage({values:M,side:t,geology:r})})}catch{}finally{e?.terminate()}}return pe(M,t,r)}function Ae(M){let t=M>>10&31,r=(M&1023)/1024,e=M&32768?-1:1;return t===31?r?NaN:e*(1/0):e*(t?2**(t-15)*(1+r):2**-14*r)}async function qe(M,t){let r=new H(M,M.queue);try{return await Te(r,t)}finally{r.dispose()}}async function Te(M,{seed:t=123456789,segments:r=1e3,reseedLayers:e,erosion:i=!1,geology:a="mixed"}={}){if(!Number.isInteger(r)||r<8||r>1024)throw new RangeError("Planet Studio noise needs 8\u20131024 segments.");if(!Number.isInteger(t))throw new RangeError("Use an integer noise seed.");if(!Object.hasOwn(me,a))throw new RangeError("Unknown planet geology.");let o=r+1,{sphereOffset:s,sphereOffset2:l,layers:n}=re(t,{reseedLayers:e}),{device:u}=M,p="planet-studio-height",f;try{let{messages:d}=await M.shaderModule.getCompilationInfo(),g=d.filter(w=>w.type==="error");if(g.length)throw new Error(g.map(w=>w.message).join(`
`));await M.computeToTexture(o,o,{scalar:1,transform:0},{textureKey:p,noiseChoices:["clearTexture"]});let h=a==="alpine"?1.75:a==="volcanic"?1.2:1.4;for(let{entryPoint:w,params:c}of n){let m=i&&w==="computeRidgedMultifractal4"?{...c,scalar:h,transform:.36*(h-1)}:c;M.buildPermTable(m.seed),await M.computeToTexture(o,o,m,{textureKey:p,useCustomPos:2,sphereOffset:s,sphereOffset2:l,noiseChoices:[w]})}i&&await M.computeToTexture(o,o,{seed:t,voroMode:me[a]},{textureKey:p,noiseChoices:["computeStudioSphereRelief","computeStudioSphereMountainErosion","computeStudioSphereErosion"]});let{texture:y}=M.getCurrentTextureResource(p),z=Math.ceil(o*8/256)*256;f=u.createBuffer({size:z*o,usage:GPUBufferUsage.COPY_DST|GPUBufferUsage.MAP_READ});let b=u.createCommandEncoder();b.copyTextureToBuffer({texture:y},{buffer:f,bytesPerRow:z},[o,o,1]),u.queue.submit([b.finish()]),await f.mapAsync(GPUMapMode.READ);let _=new Uint16Array(f.getMappedRange()),C=new Float32Array(o*o);for(let w=0;w<o;w++)for(let c=0;c<o;c++){let m=Ae(_[w*(z/2)+c*4]);if(!Number.isFinite(m))throw new Error("Planet Studio noise produced a nonfinite height.");C[w*o+c]=m}f.destroy(),f=null;let T=Math.min(8,Math.floor(r/8));for(let w of[0,r])for(let c=1;c<=T;c++){let m=Math.abs(w-c)*o,x=0;for(let P=0;P<r;P++)x+=C[m+P]/r;let S=.9*(1-c/(T+1))**2;for(let P=0;P<o;P++)C[m+P]+=(x-C[m+P])*S}i&&(C=await Ce(C,o,a));let q=1/0,v=-1/0,A=0;for(let w of C)q=Math.min(q,w),v=Math.max(v,w),A+=w;if(v-q<1e-7)throw new Error("Planet Studio noise produced a flat heightmap.");return{side:o,values:C,min:q,max:v,mean:A/C.length}}finally{f?.destroy(),M.destroyTexturePair(p)}}export{K as BaseNoise,H as NoiseComputeBuilder,qe as bakeStudioPlanetNoise,re as createStudioPlanetNoise,Pe as sampleStudioPlanetNoise,te as studioSeed};
