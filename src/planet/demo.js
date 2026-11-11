import { createCamera } from "../api/camera.js";
import { createPlanet } from "./renderer.js";
import { unit, cross, dot, clamp } from "./field.js";
import { getPreset, PlanetPresets } from "./presets.js";
import { sunDirection } from "./lighting.js";
import { frostMargin, studioClimate } from "../noise/studio-climate.js";
import { studioDryness } from "../noise/studio-wind.js";
import { sampleStudioAlluvium } from "../noise/studio-alluvium.js";
import { studioMosaic } from "../noise/studio.js";
import {
  cruiseElevation,
  minFlightClearance,
  moveOnSphere,
  surfaceFrame,
  surfaceRoute,
  viewAxes,
} from "./navigation.js";

const orbitDirection = unit([0.67, 0.32, 0.67]);
const solarPeriod = 120_000;
const radians = Math.PI / 180;
const landformNames = { alpine: "Rocky mountains", canyon: "Canyons and mesas", granite: "Granite domes", volcanic: "Volcanic terrain" };
const rockContacts = {
  "granite-divides": ["alpine", "granite"],
  flatirons: ["alpine", "canyon"],
  "lava-benches": ["volcanic", "canyon"],
  "sandstone-fins": ["canyon", "granite"],
  "basalt-highlands": ["alpine", "volcanic"],
  "fault-blocks": ["granite", "volcanic"],
};
const coastViews = { "drowned-canyons": 5500, "sediment-shelves": 3300, "rift-inlets": 6900 };
const windViews = { "dune-seas": 4100, "wind-badlands": 5200 };
const mosaicViews = { "terraced-plateaus": 0, "pinnacle-rims": 0, "fractal-outcrops": 1 };
const regionalHeights = {
  ...coastViews, ...windViews, "inverted-valleys": 3600, "alluvial-fans": 4200,
  "glacial-highlands": 6300, "fault-blocks": 8100, "terraced-plateaus": 5500,
  "pinnacle-rims": 3800, granite: 4400, canyon: 8200, volcanic: 6500,
};
const orbitClearance = 300000;
const maximumCameraRadius = 1156000;
const flightFov = Math.PI / 3;

function findVolcanicView(planet, sunlight) {
  const density = planet.studioMap.featureDensity;
  const vents = clamp(Math.round(12 * density), 5, 32);
  let best, bestScore = -Infinity;
  for (let i = 0; i < vents; i++) {
    // Match studioVolcanicRelief so the tour can aim at a real summit vent.
    const seed = (planet.studioSeed + Math.imul(i, 73856093)) >>> 0;
    const y = 2 * (((Math.imul(seed, 1664525) + 1013904223) & 65535) / 65536) - 1;
    const phi = 2 * Math.PI * (((Math.imul(seed, 22695477) + 1) & 65535) / 65536);
    const size = ((Math.imul(seed, 1103515245) + 12345) & 65535) / 65536;
    const ring = Math.sqrt(1 - y * y);
    const center = [ring * Math.cos(phi), y, ring * Math.sin(phi)];
    const rock = planet.sampleLandforms(center).volcanic;
    const daylight = dot(center, sunlight);
    if (rock < 0.38 || daylight < 0.15) continue;
    const { east, north } = surfaceFrame(center);
    const angularRadius = (0.035 + 0.099 * size ** 2) / density;
    const fromCenter = (axis, fraction) =>
      unit(center.map((value, index) => value + angularRadius * fraction * axis[index]));
    const crater = planet.sampleSurface(center);
    const rim = [east, north].flatMap(axis =>
      [-0.29, 0.29].map(offset => planet.sampleSurface(fromCenter(axis, offset)).height)).sort((a, b) => a - b);
    const lip = (rim[1] + rim[2]) * 0.5;
    const towardSun = unit(sunlight.map((value, axis) => value - daylight * center[axis]));
    const dir = fromCenter(towardSun, 0.88);
    const foot = planet.sampleSurface(dir);
    if (planet.oceanLevel !== null && lip < planet.oceanLevel + 120) continue;
    const score = (lip - crater.height) * 0.7 + (lip - foot.height) * 0.3 +
      1000 * rock + 650 * daylight - 650 * size;
    if (score > bestScore) {
      const frame = surfaceFrame(dir);
      const yaw = Math.atan2(dot(center, frame.east), dot(center, frame.north));
      const distanceToVent = 0.88 * angularRadius * planet.radius;
      const height = Math.max(3000, lip - foot.height + 0.96 * distanceToVent);
      best = { dir, yaw, height };
      bestScore = score;
    }
  }
  return best;
}

export function findLanding(planet, landform) {
  const { radius } = planet;
  const sunlight = sunDirection(0);
  const vent = landform === "volcanic" ? findVolcanicView(planet, sunlight) : null;
  if (vent) return vent;
  const islands = landform === "islands";
  const glacial = landform === "glacial-highlands";
  const wind = Object.hasOwn(windViews, landform);
  const dunes = landform === "dune-seas";
  const faults = landform === "fault-blocks";
  const granite = landform === "granite";
  const canyon = landform === "canyon";
  const volcanic = landform === "volcanic";
  const mosaic = Object.hasOwn(mosaicViews, landform) ? studioMosaic(planet.studioSeed) : null;
  const target = islands ? "volcanic" : glacial ? "alpine" : landform;
  const climate = glacial ? studioClimate(planet.studioSeed) : null;
  if (glacial && climate[3] === 0) return null;
  const contact = rockContacts[target];
  const provinceAt = (dir) => {
    if (mosaic) return planet.detail.landscape === "mosaic" ? mosaic.score(dir)[mosaicViews[landform]] : 1;
    const weights = planet.sampleLandforms(dir);
    if (wind) return studioDryness(dir, weights, planet.studioSeed);
    return contact ? 4 * weights[contact[0]] * weights[contact[1]] : weights[target];
  };
  const count = canyon ? 4096 : glacial || wind || faults || mosaic || granite ? 2304 : target ? 1280 : 256;
  let best = target ? null : { dir: orbitDirection, yaw: 0 },
    bestScore = -Infinity,
    fallbackLight = -Infinity;
  for (let i = 0; i < count; i++) {
    const y = 2 * (i + 0.5) / count - 1;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const r = Math.sqrt(1 - y * y);
    const dir = [r * Math.cos(angle), y, r * Math.sin(angle)];
    const light = dot(sunlight, dir);
    const province = target ? provinceAt(dir) : 1;
    if (province < (canyon || volcanic ? 0.55 : glacial || faults ? 0.26 : 0.48) || (target && light < 0.32)) continue;
    const ground = planet.sampleSurface(dir);
    if (ground.depth > 0) continue;
    if (glacial && frostMargin(...dir, ground.land, climate) < 0.11) continue;
    if (wind && ground.land > (dunes ? 0.38 : 0.94)) continue;
    if (!islands && !glacial && !wind && !mosaic && !granite && !canyon && bestScore === -Infinity && light > fallbackLight) {
      best = { dir, yaw: 0 };
      fallbackLight = light;
    }
    if (light < (target ? 0.32 : 0.55)) continue;
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
      const valleyDir = offset(forward, 1600);
      const ridgeDir = offset(forward, canyon ? 9700 : 5900);
      const valley = planet.sampleSurface(valleyDir);
      const farRidge = planet.sampleSurface(ridgeDir);
      if (faults && (valley.depth > 0 || farRidge.depth > 0)) continue;
      if (wind && (valley.depth > 0 || farRidge.depth > 0 || (dunes && farRidge.land > 0.47))) continue;
      const frost = glacial ? frostMargin(...ridgeDir, farRidge.land, climate) : 0;
      if (glacial && (frost < 0.19 || valley.depth > 0)) continue;
      const sea = planet.oceanLevel;
      const offshore = islands ? planet.sampleSurface(offset(forward, 12500)).depth : 0;
      if (islands && (sea === null || offshore < 80 || ground.height - sea > 2200)) continue;
      const foreground = planet.sampleSurface(offset(forward, 42)).height;
      const viewRelief = Math.min(1.4, Math.max(0, farRidge.height - valley.height) / 950);
      const floorDrop = Math.min(1.1, Math.max(0, ground.height - valley.height) / 560);
      const skyline = Math.max(0, (farRidge.height - ground.height) / 5900 - 0.16);
      let regionScore = 0;
      if (target && !islands) {
        const ahead = provinceAt(ridgeDir);
        regionScore = 0.62 * province + 0.74 * ahead -
          0.63 * Number(valley.depth > 0) - 0.82 * Number(farRidge.depth > 0);
      }
      if (dunes) {
        const far = planet.sampleSurface(offset(forward, 9900));
        if (far.depth > 0) continue;
        const lowland = Math.max(ground.height, valley.height, farRidge.height, far.height) -
          Math.min(ground.height, valley.height, farRidge.height, far.height);
        regionScore -= 0.85 * Math.abs(ground.land - 0.05) + 1.45 * clamp(lowland / 1400, 0, 2);
      } else if (wind) {
        regionScore += 0.44 * viewRelief + 0.28 * clamp(ground.land, 0, 1);
      } else if (canyon) {
        if (farRidge.depth > 0 || provinceAt(ridgeDir) < 0.60) continue;
        const side = cross(dir, forward);
        let tableScore = -Infinity;
        for (const sign of [-1, 1]) {
          const bank = (distance) => unit(ridgeDir.map((v, k) => v + sign * side[k] * distance / radius));
          const rimDir = bank(1800);
          const rim = planet.sampleSurface(rimDir), top = planet.sampleSurface(bank(3000));
          if (rim.depth > 0 || top.depth > 0 || provinceAt(rimDir) < 0.66) continue;
          const acrossTop = planet.sampleSurface(unit(rimDir.map((v, k) => v + forward[k] * 1100 / radius)));
          const rise = Math.min(rim.height, top.height, acrossTop.height) - farRidge.height;
          const uneven = Math.max(Math.abs(top.height - rim.height), Math.abs(acrossTop.height - rim.height));
          const relief = planet.studioMap.reliefScale;
          if (rise < 240 * relief || uneven > rise * 0.42) continue;
          tableScore = Math.max(tableScore, clamp((rise - 2.25 * uneven) / (250 * relief), -1, 4));
        }
        if (!Number.isFinite(tableScore)) continue;
        regionScore += tableScore;
      } else if (volcanic && farRidge.depth === 0 && provinceAt(ridgeDir) > 0.58) {
        const side = cross(dir, forward);
        const rim = (axis, offset) => planet.sampleSurface(unit(ridgeDir.map((v, k) => v + axis[k] * offset / radius))).height;
        const lip = Math.min(rim(side, -2400), rim(side, 2400), rim(forward, -2400), rim(forward, 2400));
        regionScore += clamp((lip - farRidge.height) / 180, 0, 4);
      } else if (granite) {
        if (provinceAt(ridgeDir) < 0.62 || valley.depth > 0 || farRidge.depth > 0) continue;
        const across = cross(dir, forward);
        const shoulder = (sign) => planet.sampleSurface(unit(ridgeDir.map((v, k) => v + sign * across[k] * 4200 / radius)));
        const left = shoulder(-1), right = shoulder(1);
        const backDir = offset(forward, 13300);
        const back = planet.sampleSurface(backDir);
        if (left.depth > 0 || right.depth > 0 || back.depth > 0) continue;
        const dome = farRidge.land - 0.5 * (valley.land + back.land);
        const sides = Math.min(left.land, right.land) - valley.land;
        const spike = Math.max(0, farRidge.land - 0.5 * (left.land + right.land) - 0.18);
        const interior = Math.min(provinceAt(valleyDir), provinceAt(backDir), provinceAt(offset(forward, 23500)));
        regionScore += clamp(3.6 * dome + 2.3 * sides - 4.1 * spike, -1.4, 2.5) + 2.5 * interior;
      } else if (mosaic) {
        if (valley.depth > 0 || farRidge.depth > 0 || provinceAt(ridgeDir) < 0.5) continue;
        const rim = planet.sampleSurface(offset(forward, 9200));
        if (rim.depth > 0) continue;
        const rise = Math.min(rim.height, farRidge.height) - valley.height;
        const top = Math.abs(rim.height - farRidge.height);
        if (mosaicViews[landform] === 0) {
          const side = cross(dir, forward);
          const flank = (sign) => planet.sampleSurface(unit(ridgeDir.map((v, k) => v + sign * side[k] * 1700 / radius)));
          const left = flank(-1), right = flank(1);
          if (left.depth > 0 || right.depth > 0) continue;
          if (landform === "terraced-plateaus") {
            const spread = Math.max(Math.abs(left.height - farRidge.height), Math.abs(right.height - farRidge.height));
            regionScore += clamp((rise - 1.7 * top - 1.25 * spread) / 520, -2, 3);
          } else {
            const prominence = farRidge.height - Math.max(left.height, right.height, valley.height);
            regionScore += clamp(prominence / 290, -1.4, 2.6);
          }
        } else {
          regionScore += 0.55 * clamp((Math.abs(rise) + top) / 1100, 0, 2);
        }
      } else if (faults) {
        const side = cross(dir, forward);
        const bank = (sign) => planet.sampleSurface(unit(valleyDir.map((v, k) =>
          v + sign * side[k] * 4100 / radius)));
        const leftBank = bank(-1), rightBank = bank(1);
        if (leftBank.depth > 0 || rightBank.depth > 0) continue;
        const left = leftBank.height, right = rightBank.height;
        const shoulder = Math.max(left, right) - valley.height;
        regionScore += 0.72 * clamp(shoulder / 1250, 0, 2) + 0.42 * clamp(Math.abs(left - right) / 1500, 0, 1);
      }
      const score =
        1 + regionScore + Math.min(.45, offshore / 2000) + clamp(frost, 0, .64) -
        Math.abs(light - 0.68) +
        0.35 * viewRelief +
        0.3 * floorDrop -
        Math.min(0.65, Math.max(0, (foreground - ground.height) / 70)) -
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

function findCoast(planet, view) {
  const { radius } = planet;
  const sea = planet.oceanLevel;
  if (sea === null) return null;
  const canyons = view === "drowned-canyons";
  const rift = view === "rift-inlets";
  const sun = sunDirection(0);
  let best = null;
  const count = 2304;
  for (let i = 0; i < count; i++) {
    const y = 2 * (i + 0.5) / count - 1;
    const angle = i * Math.PI * (3 - Math.sqrt(5));
    const horizontal = Math.sqrt(1 - y * y);
    const dir = [horizontal * Math.cos(angle), y, horizontal * Math.sin(angle)];
    const day = dot(dir, sun);
    if (day < 0.34) continue;
    const ground = planet.sampleSurface(dir);
    if (ground.depth > 0 || ground.height - sea > 1550) continue;
    const { east, north } = surfaceFrame(dir);
    const rock = planet.sampleLandforms(dir);
    const province = rift ? rock.volcanic * (.55 + 1.8 * rock.granite) : rock.canyon;
    for (let h = 0; h < 8; h++) {
      const yaw = h * Math.PI / 4;
      const forward = north.map((v, k) => v * Math.cos(yaw) + east[k] * Math.sin(yaw));
      const side = cross(dir, forward);
      const sample = (ahead, across = 0) => planet.sampleSurface(unit(dir.map((v, k) =>
        v + (forward[k] * ahead + side[k] * across) / radius)));
      const inlet = sample(4000);
      const offshore = sample(10500);
      if (inlet.depth <= 0 || offshore.depth < 70) continue;
      const left = sample(5200, -4100), right = sample(5200, 4100);
      const bank = Math.max(left.height, right.height) - sea;
      const relief = clamp(bank / 1250, 0, 2);
      const shallows = 1 - clamp(inlet.depth / 450, 0, 1);
      const oppositeShore = Math.min(left.height, right.height) - sea;
      const score = day * 0.5 + (rift ? 2.0 * province + relief + 0.65 * clamp(oppositeShore / 700, 0, 1) :
        canyons ? 1.24 * province + relief + 0.4 * clamp(inlet.depth / 450, 0, 1) :
        1.65 * shallows - 0.65 * relief - Math.abs(ground.height - sea - 160) / 1000);
      if (!best || score > best.score) best = { dir, yaw, score };
    }
  }
  return best;
}

function findAlluvialFan(planet) {
  const { radius } = planet;
  const atlas = planet.studioMap.alluvium;
  if (!atlas) return null;
  const { side, values } = atlas;
  const sunlight = sunDirection(0);
  const candidates = [];
  for (let y = 1; y < side - 1; y++) {
    for (let x = 0; x < side - 1; x++) {
      const cover = values[y * side + x];
      if (cover < 0.13) continue;
      const latitude = Math.PI * y / (side - 1);
      const longitude = 2 * Math.PI * x / (side - 1);
      const horizontal = Math.sin(latitude);
      const target = [horizontal * Math.cos(longitude), Math.cos(latitude), horizontal * Math.sin(longitude)];
      const light = dot(target, sunlight);
      if (light > 0.32) candidates.push({ target, score: cover + 0.43 * light });
    }
  }
  candidates.sort((a, b) => b.score - a.score);
  let best = null;
  for (const { target, score } of candidates.slice(0, 72)) {
    const ground = planet.sampleSurface(target);
    if (planet.oceanLevel !== null && (ground.depth > 0 || ground.height - planet.oceanLevel < 130)) continue;
    const { east, north } = surfaceFrame(target);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4;
      const offset = east.map((v, i) => v * Math.cos(angle) + north[i] * Math.sin(angle));
      const dir = unit(target.map((v, i) => v + offset[i] * (6900 / radius)));
      const eyeGround = planet.sampleSurface(dir);
      if (eyeGround.depth > 0) continue;
      const horizon = unit(target.map((v, i) => v - offset[i] * (5300 / radius)));
      const relief = planet.sampleSurface(horizon).height - ground.height;
      const view = score + 0.33 * clamp(relief / 850, 0, 1) -
        0.49 * clamp(Math.abs(eyeGround.height - ground.height) / 1600, 0, 1) +
        0.15 * sampleStudioAlluvium(atlas, horizon);
      if (!best || view > best.score) {
        const frame = surfaceFrame(dir);
        best = { dir, yaw: Math.atan2(dot(target, frame.east), dot(target, frame.north)), score: view };
      }
    }
  }
  return best;
}

function findInvertedRidge(planet) {
  const { radius } = planet;
  const sunlight = sunDirection(0);
  let best = null;
  for (const target of planet.studioMap.invertedRidges ?? []) {
    const light = dot(target, sunlight);
    if (light < 0.23) continue;
    const ground = planet.sampleSurface(target);
    if (ground.depth > 0) continue;
    const { east, north } = surfaceFrame(target);
    for (let j = 0; j < 8; j++) {
      const angle = j * Math.PI / 4;
      const lateral = east.map((v, i) => v * Math.cos(angle) + north[i] * Math.sin(angle));
      const offset = (meters) => unit(target.map((v, i) => v + lateral[i] * meters / radius));
      const front = planet.sampleSurface(offset(2700));
      const back = planet.sampleSurface(offset(-2700));
      const dir = offset(5700);
      if (planet.sampleSurface(dir).depth > 0) continue;
      const relief = Math.min(ground.height - front.height, ground.height - back.height);
      const score = 1.8 * clamp(relief / 1100, -1, 1.2) + 0.65 * light;
      if (!best || score > best.score) {
        const frame = surfaceFrame(dir);
        best = { dir, yaw: Math.atan2(dot(target, frame.east), dot(target, frame.north)), score };
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
  const panels = [$("controls"), $("performance")];
  const hideInterface = $("hideInterface"), showInterface = $("showInterface");
  function toggleInterface(hidden) {
    for (const panel of panels) panel.hidden = hidden;
    showInterface.hidden = !hidden;
    if (hidden) canvas.focus();
    else hideInterface.focus();
  }
  hideInterface.onclick = () => toggleInterface(true);
  showInterface.onclick = () => toggleInterface(false);
  const controls = [...$("controls").querySelectorAll("button,input,select")].filter(control => control !== hideInterface);
  for (const c of controls) c.disabled = true;
  const terrainSampling = $("terrainSampling");
  const triangleBudget = $("triangleBudget");
  const divs = 16;
  const trianglesPerPatch = 2 * divs ** 2;
  const verticesPerPatch = (divs + 1) ** 2;
  const triangleStep = Number(triangleBudget.step);
  const tileLimit = (triangles) => Math.floor(triangles / trianglesPerPatch);
  const planet = await createPlanet(canvas, {
    studioSeed: newSeed(),
    terrainSampling: terrainSampling.value,
    divs,
    maxTiles: tileLimit(Number(triangleBudget.max)),
    tileBudget: tileLimit(triangleBudget.valueAsNumber),
    streamingLod: true,
    progressiveStartup: true,
  });
  await planet.configure({
    pixelError: $("detail").valueAsNumber,
    lodScale: $("lodScale").valueAsNumber,
  });
  function triangleLimit(sampling) {
    const maxTiles = planet.maxTileBudget(sampling);
    const maxTriangles = (maxTiles + 1) * trianglesPerPatch - 1;
    return Math.floor(maxTriangles / triangleStep) * triangleStep;
  }
  function updateBudgetLabel() {
    $("triangleBudgetValue").textContent = triangleBudget.valueAsNumber.toLocaleString();
    triangleBudget.title = `Up to ${(tileLimit(Number(triangleBudget.max)) * verticesPerPatch).toLocaleString()} grid vertices`;
  }
  function syncBudgetLimit() {
    triangleBudget.max = triangleLimit(planet.terrainSampling);
    updateBudgetLabel();
  }
  syncBudgetLimit();
  const presetSelect = $("preset");
  const sizeSelect = $("planetSize");
  const regionSelect = $("region");
  let radius = planet.radius;
  const maximumClearance = () => Math.max(maximumCameraRadius - radius, radius * 2.15);
  for (const preset of PlanetPresets)
    presetSelect.add(new Option(preset.name, preset.id));
  presetSelect.value = planet.preset;
  let destination;
  let selectedRegion = "";
  function findRegion(choice) {
    if (choice === "glacial-highlands" && getPreset(planet.preset).cryoGlaciers) {
      const daylight = sunDirection(0);
      const length = ({ overlook, head }) => Math.acos(clamp(dot(overlook, head), -1, 1));
      const score = (site) => dot(site.overlook, daylight) + .8 * length(site);
      const [site] = [...planet.studioMap.glacialSites].sort((a, b) =>
        score(b) - score(a));
      if (!site) return null;
      const { north, east } = surfaceFrame(site.overlook);
      const yaw = Math.atan2(dot(site.head, east), dot(site.head, north));
      return { dir: site.overlook, yaw, height: Math.max(4200, .37 * length(site) * planet.radius), pitch: -39 };
    }
    if (choice === "impact-basins") {
      const daylight = sunDirection(0);
      const [site] = [...(planet.studioMap.impactBasins ?? [])].sort((a, b) =>
        dot(b.center, daylight) - dot(a.center, daylight));
      if (!site) return null;
      return { dir: site.center, yaw: 0, height: planet.radius * site.size * 1.9, pitch: -83 };
    }
    if (choice === "inverted-valleys") return findInvertedRidge(planet);
    if (choice === "alluvial-fans") return findAlluvialFan(planet);
    if (Object.hasOwn(coastViews, choice)) return findCoast(planet, choice);
    return findLanding(planet, choice || undefined);
  }
  function refreshDestination() {
    const option = [...regionSelect.options].find(({ value }) => value === selectedRegion);
    const next = selectedRegion && option && !option.disabled ? findRegion(selectedRegion) : null;
    if (!next) selectedRegion = "";
    regionSelect.value = selectedRegion;
    destination = next;
  }
  function updateRegions() {
    const noRegionalVariation = planet.detail.variation === 0;
    const profile = getPreset(planet.preset);
    const climate = profile.lunar || profile.material ? [0, 0, 0, 0] : studioClimate(planet.studioSeed);
    regionSelect.querySelector('option[value="impact-basins"]').disabled = !planet.studioMap.impactBasins?.length;
    $("climateReadout").textContent = profile.cryoGlaciers ? "Glacial ice" :
      climate[3] === 0 ? "Snow-free" : climate[1] === 0 ? "Highland snow" : "Polar snow";
    regionSelect.querySelector('option[value="glacial-highlands"]').disabled =
      profile.cryoGlaciers ? !planet.studioMap.glacialSites?.length : climate[3] === 0;
    const mosaic = studioMosaic(planet.studioSeed);
    const { landscape, landscapeStrength } = planet.detail;
    const terraces = landscapeStrength > 0 && (landscape === "mesas" || (landscape === "mosaic" && mosaic.mesas));
    for (const choice of ["terraced-plateaus", "pinnacle-rims"])
      regionSelect.querySelector(`option[value="${choice}"]`).disabled = !terraces;
    regionSelect.querySelector('option[value="fractal-outcrops"]').disabled = !landscapeStrength ||
      !(landscape === "fractal" || (landscape === "mosaic" && mosaic.fractal));
    for (const view of ["islands", ...Object.keys(coastViews)])
      regionSelect.querySelector(`option[value="${view}"]`).disabled = planet.oceanLevel === null ||
        (view === "rift-inlets" && noRegionalVariation);
    for (const contact of [...Object.keys(rockContacts), ...Object.keys(windViews)])
      regionSelect.querySelector(`option[value="${contact}"]`).disabled = noRegionalVariation;
    regionSelect.querySelector('option[value="inverted-valleys"]').disabled = !planet.studioMap.invertedRidges?.length;
    regionSelect.querySelector('option[value="alluvial-fans"]').disabled = !planet.studioMap.alluvium;
  }
  updateRegions();
  let baking = false,
    bakeError = "";
  async function readGround(dir) {
    const map = planet.studioMap;
    const approximate = planet.sampleSurface(dir).height;
    const sample = await planet.probeSurface(dir);
    if (!sample || map !== planet.studioMap) return null;
    return { dir, map, correction: sample.height - approximate, height: sample.height };
  }
  let groundProbe;
  const orbitGround = planet.sampleSurface(orbitDirection).height;
  let flight = surfaceFrame(orbitDirection),
    elevation = orbitGround + orbitClearance,
    targetElevation = elevation,
    clearance = orbitClearance,
    yaw = 0,
    pitch = -Math.PI / 2;
  let approach,
    drag,
    lookAhead,
    frame,
    last,
    lastHUD = -Infinity,
    average = 16.7;
  let probing = false, lastProbe = -Infinity;
  let landingRequest = 0;
  const keys = new Set();
  function stop() {
    approach = null;
    $("approach").textContent = "Start approach";
  }
  function altitudeUI() {
    $("altitude").value = Math.log2(clearance);
    $("altitudeValue").textContent = distance(clearance);
  }
  function setAltitude(value, ground = planet.sampleSurface(flight.direction).height) {
    clearance = clamp(value, minFlightClearance, maximumClearance());
    targetElevation = elevation = ground + clearance;
    lookAhead = null;
    altitudeUI();
  }
  async function orbit() {
    const request = ++landingRequest;
    stop();
    const orbitFrame = flight = surfaceFrame(orbitDirection);
    yaw = 0;
    pitch = -Math.PI / 2;
    setAltitude(orbitClearance);
    try {
      const sample = await readGround(orbitDirection);
      if (request !== landingRequest || flight !== orbitFrame || !sample) return;
      groundProbe = sample;
      setAltitude(orbitClearance, sample.height);
    } catch (error) {
      if (request === landingRequest) bakeError = error.message;
    }
  }
  $("orbit").onclick = orbit;
  async function changeWorld(preset, studioSeed, size, sampling, resetSun = false) {
    landingRequest++;
    stop();
    baking = true;
    bakeError = "";
    const worldControls = [presetSelect, $("random"), regionSelect, sizeSelect, terrainSampling, triangleBudget];
    for (const control of worldControls) control.disabled = true;
    status.textContent = "Generating Planet Studio terrain…";
    status.hidden = false;
    try {
      const budget = sampling ? Math.min(triangleBudget.valueAsNumber, triangleLimit(sampling)) : undefined;
      await planet.configure({ preset, studioSeed, radius: size, terrainSampling: sampling,
        tileBudget: budget === undefined ? undefined : tileLimit(budget) });
      groundProbe = null;
      radius = planet.radius;
      $("altitude").max = Math.log2(maximumClearance());
      updateRegions();
      refreshDestination();
      if (!sampling) await orbit();
      if (resetSun) setSunPhase(0);
    } catch (error) {
      bakeError = error.message;
    } finally {
      baking = false;
      presetSelect.value = planet.preset;
      sizeSelect.value = String(planet.radius);
      terrainSampling.value = planet.terrainSampling;
      syncBudgetLimit();
      for (const control of worldControls) control.disabled = false;
    }
  }
  presetSelect.onchange = () => changeWorld(presetSelect.value, newSeed());
  sizeSelect.onchange = () => changeWorld(undefined, undefined, Number(sizeSelect.value));
  terrainSampling.onchange = () => changeWorld(undefined, undefined, undefined, terrainSampling.value);
  $("random").onclick = () => {
    const nextSeed = newSeed();
    const previous = PlanetPresets.findIndex(({ id }) => id === planet.preset);
    const hash = (Math.imul(nextSeed ^ 0x9e3779b9, 1664525) + 1013904223) >>> 0;
    const next =
      (previous + 1 + (hash % (PlanetPresets.length - 1))) %
      PlanetPresets.length;
    const sizes = [...sizeSelect.options].map((option) => Number(option.value)).filter((size) => size !== planet.radius);
    return changeWorld(PlanetPresets[next].id, nextSeed, sizes[(hash >>> 24) % sizes.length], undefined, true);
  };
  async function landAt(height, pitchDegrees) {
    if (baking) return;
    stop();
    const request = ++landingRequest;
    const { dir, yaw: heading } = destination ??= findRegion("");
    let sample;
    try {
      sample = await readGround(dir);
    } catch (error) {
      if (request === landingRequest) bakeError = error.message;
      return;
    }
    if (request !== landingRequest || !sample) return;
    groundProbe = sample;
    flight = surfaceFrame(dir);
    yaw = heading;
    pitch = pitchDegrees * radians;
    setAltitude(height, sample.height);
  }
  $("shore").onclick = () => landAt(600, -13);
  $("surface").onclick = () => landAt(3, -7);
  regionSelect.onchange = () => {
    const choice = regionSelect.value;
    const next = findRegion(choice);
    if (!next) {
      regionSelect.value = selectedRegion;
      bakeError = "No suitable site for that landform on this world.";
      return;
    }
    bakeError = "";
    selectedRegion = choice;
    destination = next;
    if (choice) landAt(next.height ?? regionalHeights[choice] ?? 7000,
      next.pitch ?? (next.height ? -44 : choice === "volcanic" ? -48 : choice === "canyon" ? -40 : -31));
  };
  $("approach").onclick = () => {
    if (baking) return;
    landingRequest++;
    if (approach) {
      stop();
      return;
    }
    destination ??= findRegion("");
    const route = surfaceRoute(surfaceFrame(orbitDirection), destination.dir);
    const end = route(1);
    const [, desired] = viewAxes(
      surfaceFrame(destination.dir),
      destination.yaw,
    );
    const heading = Math.atan2(dot(desired, end.east), dot(desired, end.north));
    approach = {
      start: performance.now(), route, heading,
      startGround: groundProbe?.dir === orbitDirection && groundProbe.map === planet.studioMap
        ? groundProbe.height : planet.sampleSurface(orbitDirection).height,
      endGround: planet.sampleSurface(destination.dir).height,
    };
    lookAhead = null;
    $("approach").textContent = "Stop approach";
    canvas.focus();
  };
  $("altitude").max = Math.log2(maximumClearance());
  $("altitude").oninput = () => {
    landingRequest++;
    stop();
    setAltitude(2 ** Number($("altitude").value));
    pitch = (-7 - 83 * ease((Math.log2(clearance) - 7) / 10)) * radians;
  };
  $("detail").oninput = () => {
    planet.configure({ pixelError: Number($("detail").value) });
    $("detailValue").textContent = `${$("detail").value} px`;
  };
  $("lodScale").oninput = () => {
    const scale = Number($("lodScale").value);
    planet.configure({ lodScale: scale });
    $("lodScaleValue").textContent = `${scale.toFixed(2)}×`;
  };
  triangleBudget.oninput = updateBudgetLabel;
  triangleBudget.onchange = () => planet.configure({ tileBudget: tileLimit(triangleBudget.valueAsNumber) });
  let sunPhase = 0;
  const sunCycle = $("sunCycle"), sunSlider = $("sunPhase"), sunAngle = $("sunPhaseValue");
  const atmosphere = $("atmosphere");
  function setSunPhase(turn) {
    sunPhase = turn;
    sunSlider.value = Math.floor(turn * 360);
    sunAngle.textContent = `${sunSlider.value}°`;
  }
  sunSlider.oninput = () => {
    sunCycle.checked = false;
    setSunPhase(sunSlider.valueAsNumber / 360);
  };
  const detailControls = {
    landscape: "landscape", landscapeStrength: "landscapeStrength",
    terrainRelief: "relief",
    rangeShape: "range", slopeNoise: "slopes", groundNoise: "ground",
    slopeOctaves: "slopeOctaves", groundOctaves: "groundOctaves", noiseVariation: "variation",
    erosionStrength: "erosionStrength",
  };
  const erosionStrength = $("erosionStrength");
  erosionStrength.oninput = () => {
    $("erosionStrengthValue").textContent = `${erosionStrength.valueAsNumber.toFixed(2)}×`;
  };
  const noiseInputs = Object.keys(detailControls).map($);
  const updateStyleStrength = () => { $("landscapeStrength").disabled = planet.detail.landscape === "natural"; };
  for (const input of noiseInputs) {
    input.onchange = async () => {
      const key = detailControls[input.id];
      const value = input.tagName === "SELECT" ? input.value : input.valueAsNumber;
      const rebake = key === "range" || key === "variation" || key === "landscape" || key === "landscapeStrength";
      if (rebake) {
        stop();
        baking = true;
        for (const control of [...noiseInputs, presetSelect, sizeSelect, terrainSampling, regionSelect, $("random")]) control.disabled = true;
        status.textContent = "Rebuilding terrain relief…";
        status.hidden = false;
      }
      bakeError = "";
      try {
        await planet.configure({ detail: { [key]: value } });
        updateRegions();
        if (rebake) refreshDestination();
      } catch (error) {
        bakeError = error.message;
        input.value = planet.detail[key];
        if (input === erosionStrength) erosionStrength.oninput();
      } finally {
        if (rebake) {
          baking = false;
          for (const control of [...noiseInputs, presetSelect, sizeSelect, terrainSampling, regionSelect, $("random")]) control.disabled = false;
          updateStyleStrength();
        }
      }
    };
  }
  altitudeUI();
  for (const c of controls) c.disabled = false;
  updateStyleStrength();
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
    const distance = Math.hypot(rightward, forward);
    if (clearance < 1500 && distance > 0) {
      const scale = Math.min(12, 80 / distance);
      lookAhead = moveOnSphere(flight, yaw, rightward * scale, forward * scale, radius).direction;
    }
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
      const metersPerPixel = clamp(clearance * 0.002, 0.25, radius * 0.003);
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
    if (e.code === "KeyH" && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey &&
        !e.target.closest?.("input, select, textarea, [contenteditable]")) {
      toggleInterface(!panels[0].hidden);
      e.preventDefault();
      return;
    }
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
    if (sunCycle.checked) sunPhase = (sunPhase + elapsed / solarPeriod) % 1;
    average += 0.08 * (elapsed - average);
    let verticalMove = 0;
    let approachElevation;
    if (approach) {
      const t = clamp((now - approach.start) / 19000, 0, 1);
      const glide = ease(t / 0.68);
      flight = approach.route(glide);
      approachElevation = approach.startGround + (approach.endGround - approach.startGround) * glide +
        orbitClearance * (3 / orbitClearance) ** t;
      yaw = approach.heading * ease(t / 0.7);
      pitch = (-90 + 83 * ease((t - 0.59) / 0.37)) * radians;
      if (t === 1) stop();
    } else {
      const forward = Number(keys.has("KeyW")) - Number(keys.has("KeyS"));
      const right = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const speed =
        Math.max(5, clearance * 0.32) *
        (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4 : 1);
      if (forward || right) move(right * speed * dt, forward * speed * dt);
      const climb = Number(keys.has("Space")) - Number(keys.has("KeyC"));
      verticalMove = climb * speed * dt;
    }
    const dir = flight.direction;
    const [right, tangentForward] = viewAxes(flight, yaw);
    const forward = dir.map(
      (v, i) => v * Math.sin(pitch) + tangentForward[i] * Math.cos(pitch),
    );
    const up = cross(right, forward);
    const approximateGround = planet.sampleSurface(dir).height;
    const probeDistance = groundProbe?.map === planet.studioMap ?
      Math.hypot(...dir.map((value, axis) => value - groundProbe.dir[axis])) * radius : Infinity;
    const ground = approximateGround + (groundProbe?.correction ?? 0) * clamp(1 - probeDistance / 200, 0, 1);
    if (!baking && !probing && planet.terrainSampling === "procedural" && clearance < 14000 &&
        probeDistance > 1 && now - lastProbe > 90) {
      const map = planet.studioMap;
      probing = true;
      lastProbe = now;
      planet.probeSurface(dir).then((sample) => {
        if (sample && map === planet.studioMap)
          groundProbe = { dir, map, correction: sample.height - approximateGround };
      }).catch((error) => { if (map === planet.studioMap) bakeError = error.message; })
        .finally(() => { probing = false; });
    }
    if (approachElevation !== undefined) {
      targetElevation = approachElevation;
      elevation = Math.max(targetElevation, ground + minFlightClearance);
    } else if (verticalMove) {
      targetElevation = elevation = clamp(elevation + verticalMove, ground + minFlightClearance, ground + maximumClearance());
    } else {
      const ahead = lookAhead ? planet.sampleSurface(lookAhead).height : ground;
      elevation = cruiseElevation(elevation, targetElevation, ground, ahead, dt);
    }
    lookAhead = null;
    clearance = elevation - ground;
    planet.resize();
    const camera = createCamera({
      position: dir.map((v) => v * (radius + elevation)),
      forward,
      up,
      fov: flightFov,
      near: Math.max(0.12, clearance * 0.08),
      far: 2 * radius + Math.max(0, elevation) + 12000,
      aspect: canvas.width / canvas.height,
      height: canvas.height,
    });
    camera.clearance = clearance;
    const stats = planet.render(camera, now, {
      lodColors: $("colors").checked,
      wireframe: $("wire").checked,
      sunPhase,
      atmosphere: atmosphere.value,
    });
    if (now - lastHUD >= 225) {
      lastHUD = now;
      altitudeUI();
      if (sunCycle.checked) {
        sunSlider.value = Math.floor(sunPhase * 360);
        sunAngle.textContent = `${sunSlider.value}°`;
      }
      $("heightReadout").textContent = distance(clearance);
      $("seedReadout").textContent = planet.studioSeed;
      $("reliefReadout").textContent = `${planet.studioMap.reliefScale.toFixed(2)}×`;
      $("oceanReadout").textContent =
        planet.oceanLevel === null ? "Dry" : getPreset(planet.preset).ocean?.name ?? "Ocean";
      const landforms = Object.entries(planet.sampleLandforms(dir)).sort((a, b) => b[1] - a[1]);
      $("geologyReadout").textContent = landforms.slice(0, landforms[1][1] > 0.28 ? 2 : 1)
        .map(([kind]) => landformNames[kind]).join(" / ");
      $("spacing").textContent = Number.isFinite(stats.finest)
        ? distance(stats.finest)
        : "—";
      $("tris").textContent = stats.triangles.toLocaleString();
      $("gridVertices").textContent = (stats.tiles * verticesPerPatch).toLocaleString();
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
            : planet.startupPreview ? "Preparing surface detail…" : "");
      status.hidden = !status.textContent;
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
