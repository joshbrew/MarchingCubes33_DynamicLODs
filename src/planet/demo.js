import { createCamera } from "../api/camera.js";
import { createPlanet } from "./renderer.js";
import { unit, cross, dot, clamp, radius } from "./field.js";
import { PlanetPresets } from "./presets.js";
import {
  moveOnSphere,
  surfaceFrame,
  surfaceRoute,
  viewAxes,
} from "./navigation.js";

const orbitDirection = unit([0.67, 0.32, 0.67]);
const orbitAltitude = radius * 2.15;
const radians = Math.PI / 180;
function findLanding(planet) {
  const sunlight = unit([0.54, 0.45, 0.71]);
  let best = { dir: orbitDirection, yaw: 0 },
    bestScore = -Infinity,
    fallbackLight = -Infinity;
  for (let i = 0; i < 256; i++) {
    const y = (i + 0.5) / 128 - 1;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const r = Math.sqrt(1 - y * y);
    const dir = [r * Math.cos(angle), y, r * Math.sin(angle)];
    const light = dot(sunlight, dir);
    const ground = planet.sampleSurface(dir);
    if (ground.depth > 0) continue;
    if (bestScore === -Infinity && light > fallbackLight) {
      best = { dir, yaw: 0 };
      fallbackLight = light;
    }
    if (light < 0.55) continue;
    const { east, north } = surfaceFrame(dir);
    const offset = (tangent, distance) =>
      unit(dir.map((v, axis) => v + (tangent[axis] * distance) / radius));
    const slopeAlong = (tangent) =>
      (planet.sampleSurface(offset(tangent, 40)).height -
        planet.sampleSurface(offset(tangent, -40)).height) /
      80;
    const slope = Math.hypot(slopeAlong(east), slopeAlong(north));
    for (let h = 0; h < 8; h++) {
      const yaw = (h * Math.PI) / 4;
      const forward = north.map(
        (v, axis) => v * Math.cos(yaw) + east[axis] * Math.sin(yaw),
      );
      const valley = planet.sampleSurface(offset(forward, 1600)).height;
      const farRidge = planet.sampleSurface(offset(forward, 5900)).height;
      const viewRelief = Math.min(1.4, Math.max(0, farRidge - valley) / 950);
      const floorDrop = Math.min(1.1, Math.max(0, ground.height - valley) / 560);
      const skyline = Math.max(0, (farRidge - ground.height) / 5900 - 0.16);
      const score =
        1 -
        Math.abs(light - 0.68) +
        0.35 * viewRelief +
        0.3 * floorDrop -
        2.2 * skyline -
        0.85 * Math.min(1, slope);
      if (score > bestScore) {
        best = { dir, yaw };
        bestScore = score;
      }
    }
  }
  return best;
}
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
const ease = (t) => {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
};
const distance = (m) =>
  m >= 1000
    ? `${(m / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
    : `${m.toLocaleString(undefined, { maximumFractionDigits: 2 })} m`;

export async function startDemo() {
  const $ = (id) => document.getElementById(id),
    canvas = $("planet"),
    status = $("status");
  const controls = [...document.querySelectorAll("button,input,select")];
  for (const c of controls) c.disabled = true;
  const planet = await createPlanet(canvas, { studioSeed: newSeed() });
  const presetSelect = $("preset");
  for (const preset of PlanetPresets)
    presetSelect.add(new Option(preset.name, preset.id));
  presetSelect.value = planet.preset;
  let destination = findLanding(planet);
  let baking = false,
    bakeError = "";
  let flight = surfaceFrame(orbitDirection),
    altitude = orbitAltitude,
    yaw = 0,
    pitch = -Math.PI / 2;
  let approach,
    drag,
    frame,
    last,
    lastHUD = -Infinity,
    average = 16.7;
  const keys = new Set();
  function stop() {
    approach = null;
    $("approach").textContent = "Start approach";
  }
  function altitudeUI() {
    $("altitude").value = Math.log2(altitude);
    $("altitudeValue").textContent = distance(altitude);
  }
  function setAltitude(value) {
    altitude = clamp(value, 2, orbitAltitude);
    altitudeUI();
  }
  function orbit() {
    stop();
    flight = surfaceFrame(orbitDirection);
    yaw = 0;
    pitch = -Math.PI / 2;
    setAltitude(orbitAltitude);
  }
  $("orbit").onclick = orbit;
  async function changeWorld(preset, studioSeed) {
    stop();
    baking = true;
    bakeError = "";
    presetSelect.disabled = $("random").disabled = true;
    status.textContent = "Generating Planet Studio terrain…";
    try {
      await planet.configure({ preset, studioSeed });
      destination = findLanding(planet);
      orbit();
    } catch (error) {
      bakeError = error.message;
    } finally {
      baking = false;
      presetSelect.value = planet.preset;
      presetSelect.disabled = $("random").disabled = false;
    }
  }
  presetSelect.onchange = () => changeWorld(presetSelect.value, newSeed());
  $("random").onclick = () => {
    const nextSeed = newSeed();
    const previous = PlanetPresets.findIndex(({ id }) => id === planet.preset);
    const hash = (Math.imul(nextSeed ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0;
    const next =
      (previous + 1 + (hash % (PlanetPresets.length - 1))) %
      PlanetPresets.length;
    return changeWorld(PlanetPresets[next].id, nextSeed);
  };
  function landAt(height, pitchDegrees) {
    stop();
    flight = surfaceFrame(destination.dir);
    yaw = destination.yaw;
    pitch = pitchDegrees * radians;
    setAltitude(height);
  }
  $("shore").onclick = () => landAt(600, -13);
  $("surface").onclick = () => landAt(3, -7);
  $("approach").onclick = () => {
    if (baking) return;
    if (approach) {
      stop();
      return;
    }
    const route = surfaceRoute(surfaceFrame(orbitDirection), destination.dir);
    const end = route(1);
    const [, desired] = viewAxes(
      surfaceFrame(destination.dir),
      destination.yaw,
    );
    const heading = Math.atan2(dot(desired, end.east), dot(desired, end.north));
    approach = { start: performance.now(), route, heading };
    $("approach").textContent = "Stop approach";
    canvas.focus();
  };
  $("altitude").max = Math.log2(orbitAltitude);
  $("altitude").oninput = () => {
    stop();
    setAltitude(2 ** Number($("altitude").value));
    pitch = (-7 - 83 * ease((Math.log2(altitude) - 7) / 10)) * radians;
  };
  $("detail").oninput = () => {
    planet.configure({ pixelError: Number($("detail").value) });
    $("detailValue").textContent = `${$("detail").value} px`;
  };
  altitudeUI();
  for (const c of controls) c.disabled = false;
  canvas.oncontextmenu = (e) => e.preventDefault();
  canvas.onpointerdown = (e) => {
    if (drag || (e.button !== 0 && e.button !== 2)) return;
    e.preventDefault();
    stop();
    drag = {
      id: e.pointerId,
      button: e.button === 2 ? 2 : 1,
      x: e.clientX,
      y: e.clientY,
    };
    canvas.setPointerCapture(e.pointerId);
    canvas.focus();
  };
  canvas.onpointerup =
    canvas.onpointercancel =
    canvas.onlostpointercapture =
      (e) => {
        if (drag?.id === e.pointerId) drag = null;
      };
  function move(rightward, forward) {
    flight = moveOnSphere(flight, yaw, rightward, forward, radius);
  }
  canvas.onpointermove = (e) => {
    if (drag?.id !== e.pointerId) return;
    if (!(e.buttons & drag.button)) {
      drag = null;
      return;
    }
    const dx = e.clientX - drag.x,
      dy = e.clientY - drag.y;
    drag.x = e.clientX;
    drag.y = e.clientY;
    if (drag.button === 2) {
      yaw += dx * 0.003;
      pitch = clamp(pitch - dy * 0.003, -Math.PI / 2, 1.1);
    } else {
      const metersPerPixel = clamp(altitude * 0.002, 0.25, radius * 0.003);
      move(-dx * metersPerPixel, dy * metersPerPixel);
    }
  };
  const movement = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "Space",
    "KeyC",
    "ShiftLeft",
    "ShiftRight",
  ]);
  function keyDown(e) {
    if (!movement.has(e.code) || document.activeElement !== canvas) return;
    stop();
    keys.add(e.code);
    e.preventDefault();
  }
  function keyUp(e) {
    keys.delete(e.code);
  }
  const blur = () => keys.clear();
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);
  window.addEventListener("blur", blur);
  function draw(now) {
    const elapsed = last === undefined ? 16.7 : Math.max(0, now - last);
    const dt = Math.min(0.05, elapsed / 1000);
    last = now;
    average += 0.08 * (elapsed - average);
    if (approach) {
      const t = clamp((now - approach.start) / 19000, 0, 1);
      const glide = ease(t / 0.68);
      flight = approach.route(glide);
      altitude = orbitAltitude * (3 / orbitAltitude) ** t;
      yaw = approach.heading * ease(t / 0.7);
      pitch = (-90 + 83 * ease((t - 0.59) / 0.37)) * radians;
      if (t === 1) stop();
    } else {
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const speed =
        Math.max(5, altitude * 0.32) *
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4 : 1);
      if (forward || right) move(right * speed * dt, forward * speed * dt);
      const climb = Number(keys.has("Space")) - Number(keys.has("KeyC"));
      if (climb) setAltitude(altitude + climb * speed * dt);
    }
    const dir = flight.direction;
    const [right, tangentForward] = viewAxes(flight, yaw);
    const forward = dir.map(
      (v, i) => v * Math.sin(pitch) + tangentForward[i] * Math.cos(pitch),
    );
    const up = cross(right, forward);
    const ground = planet.sampleSurface(dir).height;
    planet.resize();
    const camera = createCamera({
      position: dir.map((v) => v * (radius + ground + altitude)),
      forward,
      up,
      near: Math.max(0.12, altitude * 0.08),
      far: 2 * radius + altitude + 12000,
      aspect: canvas.width / canvas.height,
      height: canvas.height,
    });
    camera.clearance = altitude;
    const stats = planet.render(camera, now, {
      lodColors: $("colors").checked,
      wireframe: $("wire").checked,
    });
    if (now - lastHUD >= 225) {
      lastHUD = now;
      altitudeUI();
      $("heightReadout").textContent = distance(altitude);
      $("seedReadout").textContent = planet.studioSeed;
      $("oceanReadout").textContent =
        planet.oceanLevel === null ? "Dry" : "Ocean";
      $("geologyReadout").textContent = {
        mixed: "Mixed",
        alpine: "Alpine",
        mesa: "Mesa and canyon",
        volcanic: "Volcanic",
      }[planet.geology];
      $("spacing").textContent = Number.isFinite(stats.finest)
        ? distance(stats.finest)
        : "—";
      $("tris").textContent = stats.triangles.toLocaleString();
      $("tiles").textContent = `${stats.tiles} / ${stats.leaves}`;
      $("grades").textContent = stats.grades;
      $("timing").textContent =
        `${stats.cpuMs.toFixed(1)} / ${stats.gpuMs?.toFixed(1) ?? "—"} ms`;
      $("fps").textContent = document.hidden
        ? "Background"
        : Math.round(1000 / average);
      status.textContent =
        planet.errors.at(-1) ||
        bakeError ||
        (baking
          ? "Generating Planet Studio terrain…"
          : approach
            ? "Descending toward the surface…"
            : "Left drag turns the planet. Right drag looks around.");
      status.classList.toggle("error", !!bakeError || planet.errors.length > 0);
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blur);
      planet.dispose();
    },
    { once: true },
  );
}
