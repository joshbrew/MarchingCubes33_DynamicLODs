import * as THREE from "three";
import { ProgressiveTerrainRenderer } from "./renderer.js";
import { height } from "./field.js";

export async function startDemo() {
  const $ = (id) => document.getElementById(id),
    canvas = $("terrain"),
    status = $("status");
  const controls = [...document.querySelectorAll("button,input")];
  controls.forEach((c) => (c.disabled = true));
  if (innerWidth < 800 || innerHeight < 650) $("controls").open = false;
  const terrain = await new ProgressiveTerrainRenderer(canvas).initialize();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.02, 2048),
    vp = new THREE.Matrix4(),
    frustum = new THREE.Frustum();
  const direction = new THREE.Vector3(),
    motion = new THREE.Vector3(),
    keys = new Set();
  let yaw = 0.25,
    pitch = -0.4,
    clearance = 64,
    touring = false,
    dragging = false,
    lastX = 0,
    lastY = 0;
  let previous = performance.now(),
    frameAverage = 16.67,
    cpuAverage = 0,
    lastHUD = -Infinity,
    frame;
  function reset() {
    camera.position.set(128.25, height(128.25, 96.25) + 64, 96.25);
    yaw = 0.25;
    pitch = -0.4;
    clearance = 64;
    $("follow").checked = true;
    $("altitude").value = 6;
    touring = false;
    $("tour").textContent = "Start flythrough";
    keys.clear();
  }
  reset();
  function setClearance(value) {
    clearance = Math.max(0.25, Math.min(2048, value));
    camera.position.y =
      height(camera.position.x, camera.position.z) + clearance;
    $("altitude").value = Math.log2(clearance);
  }
  $("sky").onclick = () => {
    setClearance(1200);
    pitch = -0.6;
  };
  $("land").onclick = () => {
    setClearance(0.75);
    pitch = -0.28;
  };
  $("reset").onclick = reset;
  $("altitude").oninput = () => setClearance(2 ** Number($("altitude").value));
  $("detail").oninput = () => {
    terrain.configure({ pixelError: Number($("detail").value) });
    $("detailLabel").textContent = `${$("detail").value} px`;
  };
  $("distance").oninput = () => {
    camera.far = Number($("distance").value);
    $("distanceLabel").textContent = `${(camera.far / 1000).toFixed(2)} km`;
    terrain.dirty = true;
  };
  $("follow").onchange = () => {
    clearance = Math.max(
      0.25,
      camera.position.y - height(camera.position.x, camera.position.z),
    );
  };
  $("tour").onclick = () => {
    touring = !touring;
    $("tour").textContent = touring ? "Stop flythrough" : "Start flythrough";
    keys.clear();
    canvas.focus();
  };
  canvas.onpointerdown = (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    canvas.focus();
  };
  canvas.onpointermove = (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.003;
    pitch = Math.max(-1.5, Math.min(1.45, pitch - (e.clientY - lastY) * 0.003));
    lastX = e.clientX;
    lastY = e.clientY;
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    dragging = false;
  };
  const movementKeys = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyC",
    "Space",
    "ShiftLeft",
    "ShiftRight",
  ]);
  const down = (e) => {
      if (
        !movementKeys.has(e.code) ||
        /INPUT|SELECT|BUTTON/.test(document.activeElement?.tagName)
      )
        return;
      keys.add(e.code);
      e.preventDefault();
    },
    up = (e) => keys.delete(e.code),
    blur = () => {
      keys.clear();
      dragging = false;
    };
  window.addEventListener("keydown", down);
  window.addEventListener("keyup", up);
  window.addEventListener("blur", blur);
  const colors = (level) => `hsl(${(level * 41 + 65) % 360} 52% 60%)`;
  function updateHUD(now, stats) {
    if (now - lastHUD < 250) return;
    lastHUD = now;
    const spacing = Number.isFinite(stats.finest)
      ? stats.finest < 1
        ? `${(stats.finest * 100).toFixed(3)} cm`
        : `${stats.finest.toFixed(2)} m`
      : "—";
    $("spacing").textContent = spacing;
    $("fps").textContent =
      `${Math.round(1000 / frameAverage)} · ${cpuAverage.toFixed(1)} / ${stats.gpuMs?.toFixed(1) ?? "—"} ms`;
    $("triangles").textContent =
      `${(stats.triangles / 1000).toFixed(0)}k · ${stats.drawCalls}`;
    $("cache").textContent =
      `${stats.resident}/${stats.capacity} · ${(stats.atlasBytes / 1024 ** 2).toFixed(1)} MB`;
    $("builds").textContent = `${stats.builtThisFrame} / ${stats.pending}`;
    $("generation").textContent =
      `${stats.generationGpuMs?.toFixed(2) ?? "—"} ms · ${stats.evicted}`;
    $("altitudeLabel").textContent =
      `${clearance < 10 ? clearance.toFixed(2) : Math.round(clearance)} m`;
    $("altitude").value = Math.log2(clearance);
    if (stats.drawn) $("loading").hidden = true;
    const levels = stats.histogram.filter((n) => n > 0).length;
    status.textContent = terrain.errors.length
      ? terrain.errors.at(-1)
      : `${levels} visible detail levels · ${stats.seams} stitched tiles · ${stats.pending ? "generating finer tiles…" : "cache settled"}${stats.limited ? " · detail budget reached" : ""}`;
    status.classList.toggle("error", terrain.errors.length > 0);
    Object.assign(status.dataset, {
      pending: stats.pending,
      errors: terrain.errors.length,
      drawn: stats.drawn,
      spacing: stats.finest,
      resident: stats.resident,
      clearance,
    });
    const ctx = $("map").getContext("2d"),
      size = 196,
      span = Math.max(16, Math.min(camera.far * 2, clearance * 8));
    const ox = camera.position.x - span / 2,
      oz = camera.position.z - span / 2;
    ctx.fillStyle = "#1a2931";
    ctx.fillRect(0, 0, size, size);
    for (const n of terrain.cut?.values() || []) {
      const x = ((n.ox - ox) / span) * size,
        z = ((n.oz - oz) / span) * size,
        w = (n.size / span) * size;
      if (x + w < 0 || z + w < 0 || x > size || z > size) continue;
      ctx.fillStyle = colors(n.level);
      ctx.fillRect(x, z, w, w);
      ctx.strokeStyle = "#1a293177";
      ctx.strokeRect(x, z, w, w);
    }
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(size / 2, size / 2);
    ctx.lineTo(size / 2 + Math.sin(yaw) * 16, size / 2 - Math.cos(yaw) * 16);
    ctx.stroke();
    $("mapLabel").textContent =
      `${Math.round(span)} m footprint · zooms as you descend`;
  }
  function animate(now) {
    if (terrain.disposed) return;
    const dt = Math.min(0.05, (now - previous) / 1000);
    frameAverage = frameAverage * 0.94 + (now - previous) * 0.06;
    previous = now;
    const speed =
      Math.max(0.4, Math.min(220, clearance * 0.7)) *
      (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4 : 1);
    motion.set(0, 0, 0);
    const forward =
        Number(keys.has("KeyW") || touring) - Number(keys.has("KeyS")),
      right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
    motion.x = Math.sin(yaw) * forward + Math.cos(yaw) * right;
    motion.z = -Math.cos(yaw) * forward + Math.sin(yaw) * right;
    if (motion.lengthSq())
      camera.position.addScaledVector(motion.normalize(), speed * dt);
    const climb = Number(keys.has("Space")) - Number(keys.has("KeyC"));
    if ($("follow").checked) {
      clearance = Math.max(
        0.25,
        Math.min(2048, clearance + climb * speed * dt),
      );
      camera.position.y =
        height(camera.position.x, camera.position.z) + clearance;
    } else {
      camera.position.y += climb * speed * dt;
      camera.position.y = Math.max(
        height(camera.position.x, camera.position.z) + 0.25,
        camera.position.y,
      );
      clearance =
        camera.position.y - height(camera.position.x, camera.position.z);
    }
    // A short near plane is essential for inspecting centimetre geometry.
    camera.near = Math.max(0.015, Math.min(1, clearance * 0.01));
    camera.aspect = canvas.clientWidth / canvas.clientHeight;
    direction.set(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch),
    );
    camera.lookAt(camera.position.clone().add(direction));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(vp);
    try {
      const stats = terrain.render(
        {
          position: camera.position.toArray(),
          height: canvas.height,
          fov: (camera.fov * Math.PI) / 180,
          far: camera.far,
          viewProjection: vp.elements,
        },
        frustum.planes.map((p) => [
          p.normal.x,
          p.normal.y,
          p.normal.z,
          p.constant,
        ]),
        now,
        {
          lodColors: $("colors").checked,
          tileBorders: $("borders").checked,
          wireframe: $("wire").checked,
        },
      );
      cpuAverage = cpuAverage * 0.94 + stats.cpuMs * 0.06;
      updateHUD(now, stats);
      frame = requestAnimationFrame(animate);
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("error");
      console.error(error);
    }
  }
  controls.forEach((c) => (c.disabled = false));
  frame = requestAnimationFrame(animate);
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      terrain.dispose();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    },
    { once: true },
  );
}
