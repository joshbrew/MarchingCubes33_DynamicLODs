const test = require('node:test');
const assert = require('node:assert/strict');
const Fields = require('../src/fields.js');
const Coordinates = require('../src/coordinates.js');
const MC = require('../src/marchingCubes.js');

function cloud(count = 1024, center = [.49, .51, .48], radius = .301) {
  const points = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, a = i * Math.PI * (3 - Math.sqrt(5)), h = Math.sqrt(1 - y * y);
    points.set([center[0] + radius * h * Math.cos(a), center[1] + radius * y, center[2] + radius * h * Math.sin(a)], i * 3);
  }
  return points;
}

test('sphere fit recovers the actual point-cloud size independently of point count', () => {
  for (const count of [16, 1024, 15000]) {
    const fit = Fields.fitSphere(cloud(count));
    fit.center.forEach((value, axis) => assert.ok(Math.abs(value - [.49, .51, .48][axis]) < 1e-7));
    assert.ok(Math.abs(fit.radius - .301) < 1e-7);
    assert.ok(fit.rmsError < 1e-7);
  }
  const points = cloud(1024, [12, -18, 9], 2.1), fit = Fields.fitSphere(points);
  assert.ok(Math.abs(fit.radius - 2.1) < 1e-6);
  assert.throws(() => Fields.fitSphere(new Float32Array(12)), /span three dimensions/);
  assert.throws(() => Fields.fitSphere([NaN, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), /finite/);
});

test('outer, inner and both select physical shell boundaries with constant thickness', () => {
  const fit = Fields.fitSphere(cloud());
  assert.equal(Fields.sphereSurfaces(fit, 'outer').length, 1);
  assert.equal(Fields.sphereSurfaces(fit, 'inner')[0].side, 'inner');
  const both = Fields.sphereSurfaces(fit, 'both', .004, .01);
  assert.ok(Math.abs(both[0].radius - both[1].radius - .004) < 1e-12);
  assert.equal(both[0].iso, .01);
  assert.equal(both[1].iso, .006);
  assert.throws(() => Fields.sphereSurfaces(fit, 'both', 1), /smaller/);
  assert.throws(() => Fields.sphereSurfaces(fit, 'outer', 0), /positive/);
});

test('both algorithms reconstruct tight thin sphere shells in every coordinate mode with correct normals and winding', () => {
  const fit = Fields.fitSphere(cloud()), size = { x: 25, y: 25, z: 25 }, sample = Fields.sphereSampler(fit);
  const groups = [[{ type: 'cartesian' }], [{ type: 'spherical', center: fit.center, radius: [.02, .7] }],
    Array.from({ length: 6 }, (_, face) => ({ type: 'cube-sphere', face, center: fit.center, radius: [.02, .7] }))];
  for (const configs of groups) for (const algorithm of ['bourke', 'mc33']) {
    const boundaries = Fields.sphereSurfaces(fit, 'both', .00001);
    let counts = [];
    for (const boundary of boundaries) {
      let count = 0;
      for (const coordinates of configs) {
        const field = Coordinates.sampleField(size, sample, coordinates);
        const raw = MC.extractCPU(field, size, boundary.iso, algorithm, { coordinates });
        const { positions, normals } = Fields.refineSphereSurface(raw, fit, boundary);
        assert.ok(positions.length > 0); count += positions.length / 9;
        for (let i = 0; i < positions.length; i += 3) {
          const d = [0, 1, 2].map(axis => positions[i + axis] - fit.center[axis]);
          assert.ok(Math.abs(Math.hypot(...d) - boundary.radius) < 1e-7, 'sphere vertices match the measured radius');
          const dot = d.reduce((sum, value, axis) => sum + value * normals[i + axis], 0);
          assert.ok(boundary.side === 'outer' ? dot > 0 : dot < 0, 'boundary normals');
        }
        for (let i = 0; i < positions.length; i += 9) {
          const a = [0, 1, 2].map(axis => positions[i + 3 + axis] - positions[i + axis]);
          const b = [0, 1, 2].map(axis => positions[i + 6 + axis] - positions[i + axis]);
          const cross = [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
          assert.ok(cross.reduce((sum, value, axis) => sum + value * normals[i + axis], 0) > 0, 'winding follows the boundary normal');
        }
      }
      counts.push(count);
    }
    assert.equal(counts[0], counts[1], 'independent crossings retain both boundaries even far below grid spacing');
  }
});
