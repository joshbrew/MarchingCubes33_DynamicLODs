import * as THREE from "three";
import * as MarchingCubes from "./marchingCubes.js";
import * as MarchingCoordinates from "./coordinates.js";
import * as DemoFields from "./fields.js";
// Joshua Brewster (MIT License).
export async function startDemo() {
  "use strict";
  const status = document.getElementById("status");
  const algorithmInput = document.getElementById("algorithm");
  const backendInput = document.getElementById("backend");
  const coordinateInput = document.getElementById("coordinates");
  const isoInput = document.getElementById("isolevel");
  const surfaceInput = document.getElementById("surface");
  const thicknessInput = document.getElementById("thickness");
  const rebuildButton = document.getElementById("rebuild");
  const wireframeInput = document.getElementById("wireframe");
  function report(message, error = false) {
    status.textContent = message;
    status.classList.toggle("error", error);
  }
  const center = new THREE.Vector3(0.5, 0.5, 0.5);
  const gridSize = { x: 65, y: 65, z: 65 };
  const scenes = [new THREE.Scene(), new THREE.Scene()];
  const cameras = [0, 1].map(
    () => new THREE.PerspectiveCamera(45, 1, 0.01, 100),
  );
  const renderers = ["pointCanvas", "meshCanvas"].map(
    (id) =>
      new THREE.WebGLRenderer({
        canvas: document.getElementById(id),
        antialias: true,
      }),
  );
  renderers.forEach((renderer) =>
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)),
  );
  scenes.forEach((scene) => {
    scene.background = new THREE.Color(0xeeeeee);
  });
  const pointRoot = new THREE.Group();
  pointRoot.position.copy(center);
  scenes[0].add(pointRoot);
  const pointGeometry = new THREE.BufferGeometry();
  const pointMaterial = new THREE.PointsMaterial({
    color: 0xc43c3c,
    size: 0.003,
  });
  const meshMaterial = new THREE.MeshStandardMaterial({
    color: 0x156289,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), meshMaterial);
  scenes[1].add(mesh);
  scenes[1].add(new THREE.AmbientLight(0x888888));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(1, 2, 1);
  scenes[1].add(light);
  function resize() {
    renderers.forEach((renderer, i) => {
      const canvas = renderer.domElement,
        w = canvas.clientWidth,
        h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      cameras[i].aspect = w / h;
      cameras[i].updateProjectionMatrix();
    });
  }
  window.addEventListener("resize", resize);
  resize();
  let frame;
  function animate(t) {
    frame = requestAnimationFrame(animate);
    cameras.forEach((camera) => {
      camera.position.set(
        center.x + 1.3 * Math.cos(t * 0.00025),
        center.y + 0.3,
        center.z + 1.3 * Math.sin(t * 0.00025),
      );
      camera.lookAt(center);
    });
    renderers.forEach((renderer, i) => renderer.render(scenes[i], cameras[i]));
  }
  frame = requestAnimationFrame(animate);
  await new Promise((resolve) =>
    requestAnimationFrame(() => setTimeout(resolve, 0)),
  );
  const points = DemoFields.generateSpherePoints(15000, center, 0.3);
  const localPoints = points.slice();
  for (let i = 0; i < localPoints.length; i++) localPoints[i] -= 0.5;
  pointGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(localPoints, 3),
  );
  pointRoot.add(new THREE.Points(pointGeometry, pointMaterial));
  const fit = DemoFields.fitSphere(points);
  const sampleWorld = DemoFields.sphereSampler(fit);
  const cartesianField = MarchingCoordinates.sampleField(
    gridSize,
    sampleWorld,
    { type: "cartesian" },
  );
  const grids = new Map([
    [
      "cartesian",
      [
        {
          field: cartesianField,
          size: gridSize,
          coordinates: { type: "cartesian" },
        },
      ],
    ],
  ]);
  function getGrids(mode) {
    if (!grids.has(mode)) {
      const size =
        mode === "spherical"
          ? { x: 65, y: 33, z: 50 }
          : { x: 33, y: 33, z: 50 };
      const configs =
        mode === "spherical"
          ? [{ type: "spherical", center: fit.center, radius: [0.02, 0.7] }]
          : Array.from({ length: 6 }, (_, face) => ({
              type: "cube-sphere",
              face,
              center: fit.center,
              radius: [0.02, 0.7],
            }));
      grids.set(
        mode,
        configs.map((coordinates) => ({
          size,
          coordinates,
          field: MarchingCoordinates.sampleField(
            size,
            sampleWorld,
            coordinates,
          ),
        })),
      );
    }
    return grids.get(mode);
  }
  let device = null,
    running = false,
    pending = false;
  if (!navigator.gpu) {
    backendInput.querySelector('[value="gpu"]').disabled = true;
    backendInput.title =
      "WebGPU requires a supported browser and localhost or HTTPS";
  }
  async function getDevice() {
    if (device) return device;
    if (!navigator.gpu)
      throw new Error(
        "WebGPU is unavailable; use CPU or open this page on localhost in a supported browser",
      );
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter)
      throw new Error("No WebGPU adapter available; CPU remains available");
    const next = await adapter.requestDevice();
    device = next;
    next.lost.then((info) => {
      if (device !== next) return;
      device = null;
      backendInput.value = "cpu";
      report(`GPU device lost: ${info.message}. Switching to CPU.`, true);
      rebuild();
    });
    return next;
  }
  async function rebuild() {
    if (running) {
      pending = true;
      return;
    }
    running = true;
    rebuildButton.disabled = true;
    const algorithm = algorithmInput.value,
      backend = backendInput.value,
      mode = coordinateInput.value;
    const isoText = isoInput.value,
      thicknessText = thicknessInput.value,
      surface = surfaceInput.value;
    const iso = Number(isoText),
      thickness = Number(thicknessText);
    const label = `${algorithm === "mc33" ? "MC33" : "Bourke"} · ${backend === "gpu" ? "WebGPU" : "CPU"} · ${mode} · ${surfaceInput.selectedOptions[0].text}`;
    report(`Building ${label}…`);
    await new Promise((resolve) =>
      requestAnimationFrame(() => setTimeout(resolve, 0)),
    );
    try {
      if (!isoText || !thicknessText)
        throw new Error("Enter a surface offset and shell thickness");
      const boundaries = DemoFields.sphereSurfaces(
        fit,
        surface,
        thickness,
        iso,
      );
      if (
        boundaries.some(
          (boundary) => boundary.radius <= 0.02 || boundary.radius >= 0.49,
        )
      )
        throw new Error(
          "Keep each surface radius between 0.02 and 0.49 so it fits the sampled domain",
        );
      const inputGrids = getGrids(mode),
        start = performance.now(),
        chunks = [];
      const gpu = backend === "gpu" ? await getDevice() : null;
      for (const boundary of boundaries)
        for (const grid of inputGrids) {
          const options = { coordinates: grid.coordinates };
          const positions = gpu
            ? await MarchingCubes.extractGPU(
                gpu,
                grid.field,
                grid.size,
                boundary.iso,
                algorithm,
                options,
              )
            : MarchingCubes.extractCPU(
                grid.field,
                grid.size,
                boundary.iso,
                algorithm,
                options,
              );
          chunks.push(DemoFields.refineSphereSurface(positions, fit, boundary));
        }
      const positions = new Float32Array(
        chunks.reduce((sum, chunk) => sum + chunk.positions.length, 0),
      );
      const normals = new Float32Array(positions.length);
      let offset = 0;
      for (const chunk of chunks) {
        positions.set(chunk.positions, offset);
        normals.set(chunk.normals, offset);
        offset += chunk.positions.length;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3),
      );
      geometry.setAttribute("normal", new THREE.BufferAttribute(normals, 3));
      mesh.geometry.dispose();
      mesh.geometry = geometry;
      document.getElementById("meshLabel").textContent = label;
      report(
        `${label} — ${(positions.length / 9).toLocaleString()} triangles in ${(performance.now() - start).toFixed(1)} ms · point radius ${fit.radius.toFixed(4)} · ${boundaries.map((b) => `${b.side} ${b.radius.toFixed(4)}`).join(" / ")}`,
      );
    } catch (error) {
      report(`${label}: ${error.message}`, true);
      console.error(error);
    } finally {
      running = false;
      rebuildButton.disabled = false;
      if (pending) {
        pending = false;
        rebuild();
      }
    }
  }
  [
    algorithmInput,
    backendInput,
    coordinateInput,
    isoInput,
    surfaceInput,
    thicknessInput,
  ].forEach((input) => input.addEventListener("change", rebuild));
  rebuildButton.addEventListener("click", rebuild);
  wireframeInput.addEventListener("change", () => {
    meshMaterial.wireframe = wireframeInput.checked;
  });
  window.addEventListener("pagehide", () => {
    cancelAnimationFrame(frame);
    pointGeometry.dispose();
    pointMaterial.dispose();
    mesh.geometry.dispose();
    meshMaterial.dispose();
    renderers.forEach((renderer) => renderer.dispose());
    if (device) {
      const old = device;
      device = null;
      MarchingCubes.disposeGPU(old).finally(() => old.destroy());
    }
  });
  await rebuild();
}
