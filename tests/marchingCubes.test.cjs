const test = require('node:test');
const assert = require('node:assert/strict');
const MC = require('../src/marchingCubes.js');
const Coordinates = require('../src/coordinates.js');

function sample(size, fn, config = { type: 'cartesian' }) {
  return Coordinates.sampleField(size, fn, config);
}
function triangles(positions) {
  const result = [];
  for (let i = 0; i < positions.length; i += 9) {
    result.push(Array.from({ length: 3 }, (_, v) => Array.from(positions.slice(i + v * 3, i + v * 3 + 3), n => n.toFixed(6)).join(',')).sort().join('|'));
  }
  return result.sort();
}
function edgeCounts(positions) {
  const counts = new Map();
  for (let i = 0; i < positions.length; i += 9) {
    const keys = Array.from({ length: 3 }, (_, v) => Array.from(positions.slice(i + v * 3, i + v * 3 + 3), n => n.toFixed(5)).join(','));
    for (let v = 0; v < 3; v++) {
      if (keys[v] === keys[(v + 1) % 3]) continue;
      const key = [keys[v], keys[(v + 1) % 3]].sort().join('|');
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return counts;
}

test('all 256 masks, with varied magnitudes, emit only valid crossing edges', () => {
  let seed = 12;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
  for (const impl of Object.values(MC.algorithms)) {
    const polygonize = impl.createPolygonizer(), codes = new Uint8Array(impl.maxVertices);
    for (let mask = 0; mask < 256; mask++) for (let repetition = 0; repetition < 40; repetition++) {
      const values = Float32Array.from({ length: 8 }, (_, c) => (mask & impl.cornerBit(c) ? -1 : 1) * (0.1 + random() * 10));
      const count = polygonize(values, mask, codes);
      assert.equal(count % 3, 0); assert.ok(count <= impl.maxVertices);
      assert.equal(count === 0, mask === 0 || mask === 255);
      for (const code of codes.slice(0, count)) {
        assert.ok(code <= 12);
        if (code === 12) continue;
        const [a, b] = impl.edges[code];
        assert.notEqual(values[a] < 0, values[b] < 0, `${impl.name} mask ${mask} code ${code}`);
      }
    }
  }
});

test('Bourke and MC33 agree on a plane through an anisotropic grid', () => {
  const size = { x: 7, y: 5, z: 4 }, field = sample(size, x => x - 0.37);
  const a = MC.extractCPU(field, size, 0, 'bourke'), b = MC.extractCPU(field, size, 0, 'mc33');
  assert.equal(a.length, b.length);
  for (const output of [a, b]) for (let i = 0; i < output.length; i += 3) assert.ok(Math.abs(output[i] - 0.37) < 1e-6);
});

test('both algorithms produce a closed sphere with consistent winding', () => {
  const size = { x: 17, y: 19, z: 21 };
  const field = sample(size, (x, y, z) => Math.hypot(x - 0.5, y - 0.5, z - 0.5) - 0.31);
  for (const algorithm of ['bourke', 'mc33']) {
    const output = MC.extractCPU(field, size, 0, algorithm);
    assert.ok(output.length > 0);
    assert.ok(Array.from(output).every(n => Number.isFinite(n) && n >= 0 && n <= 1));
    for (const count of edgeCounts(output).values()) assert.equal(count, 2, algorithm);
    let outward = 0, inward = 0;
    for (let i = 0; i < output.length; i += 9) {
      const a = output.slice(i, i + 3), b = output.slice(i + 3, i + 6), c = output.slice(i + 6, i + 9);
      const u = b.map((n, j) => n - a[j]), v = c.map((n, j) => n - a[j]);
      const normal = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]];
      const dot = normal.reduce((sum, n, j) => sum + n * ((a[j] + b[j] + c[j]) / 3 - 0.5), 0);
      if (dot > 1e-10) outward++; else if (dot < -1e-10) inward++;
    }
    // Classic Bourke's table points toward decreasing scalar values. MC33 uses
    // its own table convention; each algorithm must be internally consistent.
    assert.ok(outward === 0 || inward === 0, `${algorithm}: ${outward} outward, ${inward} inward`);
  }
});

test('MC33 face decisions depend on magnitudes, not just the sign mask', () => {
  const impl = MC.algorithms.mc33, polygonize = impl.createPolygonizer(), codes = new Uint8Array(36);
  const a = Float32Array.from([-5,1,-5,1,1,1,1,1]);
  const b = Float32Array.from([-1,5,-1,5,1,1,1,1]);
  const mask = 0xA0;
  const first = Array.from(codes.slice(0, polygonize(a, mask, codes)));
  const second = Array.from(codes.slice(0, polygonize(b, mask, codes)));
  assert.notDeepEqual(first, second);
});

test('MC33 neighboring cells resolve shared ambiguous faces consistently', () => {
  const size = { x: 6, y: 7, z: 8 };
  const field = sample(size, (x,y,z) => Math.sin(x*19+0.1)*Math.cos(y*21+0.2)*Math.sin(z*17+0.3) + 0.03);
  const output = MC.extractCPU(field,size,0,'mc33');
  for (const [key,count] of edgeCounts(output)) {
    const points = key.split('|').map(p => p.split(',').map(Number));
    const onBoundary = [0,1,2].some(axis => points.every(p => Math.abs(p[axis]) < 1e-5) || points.every(p => Math.abs(p[axis]-1) < 1e-5));
    assert.equal(count, onBoundary ? 1 : 2, key);
  }
});

test('isolevel shifts, empty fields and exact corner crossings are supported', () => {
  const size = { x: 3, y: 4, z: 5 }, field = sample(size, (x,y,z) => x+y+z);
  for (const algorithm of ['bourke','mc33']) {
    assert.equal(MC.extractCPU(new Float32Array(60), size, 1, algorithm).length,0);
    assert.deepEqual(triangles(MC.extractCPU(field,size,0.9,algorithm)), triangles(MC.extractCPU(Float32Array.from(field,n=>n+2),size,2.9,algorithm)));
    assert.ok(Array.from(MC.extractCPU(field,size,1,algorithm)).every(Number.isFinite));
  }
});

test('spherical coordinates preserve periodic seam samples and constant-radius surfaces', () => {
  const size = { x: 25,y: 13,z: 9 }, config = { type:'spherical', radius:[0.1,0.6], center:[1,2,3] };
  const field = sample(size, (x,y,z) => Math.hypot(x-1,y-2,z-3)-0.35,config);
  for(let z=0;z<size.z;z++) for(let y=0;y<size.y;y++) assert.equal(field[(z*size.y+y)*size.x],field[(z*size.y+y)*size.x+size.x-1]);
  for(const algorithm of ['bourke','mc33']) {
    const output=MC.extractCPU(field,size,0,algorithm,{coordinates:config});
    assert.ok(output.length>0);
    for(let i=0;i<output.length;i+=3) assert.ok(Math.abs(Math.hypot(output[i]-1,output[i+1]-2,output[i+2]-3)-0.35)<1e-6);
  }
});

test('all six cloud cube-sphere faces cover a closed radial surface', () => {
  const size={x:9,y:9,z:6};
  for(const algorithm of ['bourke','mc33']) {
    const chunks=[];
    for(let face=0;face<6;face++) {
      const config={type:'cube-sphere',face,radius:[0.1,0.6],center:[0,0,0]};
      const field=sample(size,(x,y,z)=>Math.hypot(x,y,z)-0.33,config);
      chunks.push(...MC.extractCPU(field,size,0,algorithm,{coordinates:config}));
    }
    const output=Float32Array.from(chunks);
    for(let i=0;i<output.length;i+=3) assert.ok(Math.abs(Math.hypot(...output.slice(i,i+3))-0.33)<1e-6);
    for(const count of edgeCounts(output).values()) assert.equal(count,2);
  }
});

test('GPU brick sizing accounts for MC33 capacity and storage binding limits', () => {
  const size={x:50,y:50,z:50},limits={maxBufferSize:256*1024**2,maxStorageBufferBindingSize:64*1024**2,maxComputeWorkgroupsPerDimension:65535};
  assert.equal(MC.brickDepthForLimits(size,MC.algorithms.bourke,limits),50);
  const depth=MC.brickDepthForLimits(size,MC.algorithms.mc33,limits);
  assert.ok(depth<50);
  assert.ok((size.x-1)*(size.y-1)*(depth-1)*36*16<=limits.maxStorageBufferBindingSize);
  assert.throws(()=>MC.brickDepthForLimits(size,MC.algorithms.mc33,{...limits,maxStorageBufferBindingSize:100}),/GPU limits/);
});

test('invalid data and coordinate configurations fail clearly', () => {
  assert.throws(()=>MC.extractCPU(new Float32Array(8),{x:2,y:2,z:2},0,'unknown'),/Unknown/);
  assert.throws(()=>MC.extractCPU(new Float32Array(7),{x:2,y:2,z:2}),/samples/);
  assert.throws(()=>MC.extractCPU(new Float32Array(8),{x:1,y:2,z:4}),/dimensions/);
  assert.throws(()=>MC.extractCPU(Float32Array.from([NaN,0,0,0,0,0,0,0]),{x:2,y:2,z:2}),/finite/);
  assert.throws(()=>Coordinates.createMapper({type:'spherical',radius:[1,0]}),/Radius/);
  assert.throws(()=>Coordinates.createMapper({type:'cube-sphere',face:6}),/face/);
});
