import mc = require("marching-cubes-bourke-mc33");
import core = require("marching-cubes-bourke-mc33/core");
const camera = mc.createCamera({ position: [0, 2, 3] });
core
  .createSphere({ radius: 2 })
  .then((mesh) => mesh.positions satisfies Float32Array);
camera.far satisfies number;
