import { studioRegionWeights } from "./studio.js";
import { createImpactHistory, impactHeight } from "./studio-impacts.js";

const tau = 2 * Math.PI;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
const mix = (a, b, t) => a + (b - a) * t;
function smooth(lo, hi, value) {
  const t = clamp((value - lo) / (hi - lo), 0, 1);
  return t * t * (3 - 2 * t);
}

function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function direction(span, x, y) {
  const longitude = tau * x / span, latitude = Math.PI * y / span;
  const horizontal = Math.sin(latitude);
  return [horizontal * Math.cos(longitude), Math.cos(latitude), horizontal * Math.sin(longitude)];
}

function karstPits(random) {
  const pits = [];
  const faults = 3 + Math.floor(3 * random());
  for (let i = 0; i < faults; i++) {
    const angle = random() * Math.PI;
    const dx = Math.cos(angle), dy = Math.sin(angle);
    const offset = 1.6 * (random() - 0.5);
    const start = -1.15 + 0.38 * random();
    const spacing = 0.20 + 0.17 * random();
    for (let t = start; t < 1.12; t += spacing * (0.70 + 0.66 * random())) {
      const cross = offset + 0.27 * (random() - 0.5);
      pits.push({
        x: t * dx - cross * dy,
        y: t * dy + cross * dx,
        width: 0.19 + 0.23 * random(),
        depth: 0.14 + 0.32 * random(),
        elongation: 0.58 + 0.40 * random(),
      });
    }
  }
  return pits;
}

function karstHeight(x, y, h, datum, pits) {
  const warp = 0.10 * Math.sin(5 * y + 2 * x);
  const edge = 1 - smooth(0.77, 1.36, Math.hypot(x * 0.88, y));
  if (edge <= 0) return h;
  let solution = 0, talus = 0, nearest = 1.4, second = 1.4;
  for (const pit of pits) {
    const dx = x + warp - pit.x, dy = y - pit.y;
    if (Math.abs(dx) * pit.elongation > 1.4 * pit.width || Math.abs(dy) > 1.4 * pit.width) continue;
    const d = Math.hypot(dx * pit.elongation, dy) / pit.width;
    if (d < nearest) {
      second = nearest;
      nearest = d;
    } else {
      second = Math.min(second, d);
    }
    // Bell-shaped hollows leave narrow divides, with debris at their toes.
    const bowl = 1 - smooth(0.12, 0.95, d);
    solution = Math.max(solution, bowl * pit.depth);
    talus = Math.max(talus, 0.045 * smooth(0.19, 0.51, d) * (1 - smooth(0.54, 0.84, d)));
  }
  // An old meandering valley links some of the sinks. The adjoining bedrock
  // stays high and forms the remnant towers and fins between the depressions.
  const valley = 1 - smooth(0.04, 0.24, Math.abs(y - 0.25 * Math.sin(3.4 * x) + 0.07 * x));
  const exposed = smooth(0.04, 0.19, solution);
  const dissolved = Math.max(solution, 0.17 * valley) + 0.05 * valley * exposed;
  const shelf = mix(h, datum + 0.13, 0.70);
  const remnant = 0.14 * (1 - smooth(0.02, 0.12, solution)) * smooth(0.08, 0.28, valley + talus);
  // Where two hollows nearly meet, the last band of rock forms a steep fin.
  const narrowDivide = (1 - smooth(0.07, 0.48, second - nearest)) *
    smooth(0.40, 0.79, nearest) * (1 - smooth(1.06, 1.37, second));
  const fin = 0.26 * narrowDivide * (0.72 + 0.28 * Math.sin(7 * x - 9 * y));
  return mix(h, shelf - dissolved + talus + remnant + fin, edge);
}

function riftAxis(along, fault) {
  const bend = fault.bend * Math.sin(fault.curve * along + fault.phase);
  return bend + fault.shift * (smooth(fault.first - 0.25, fault.first, along) -
    smooth(fault.last, fault.last + 0.36, along));
}

function riftHistory(random, phase, chance) {
  const fault = {
    phase,
    bend: 0.08 + 0.16 * random(),
    curve: 0.72 + 1.86 * random(),
    shift: 0.44 * (random() - 0.5),
    first: -1.10 + 0.86 * random(),
    last: 0.12 + 0.89 * random(),
    width: 0.17 + 0.17 * random(),
    depth: 0.43 + 0.21 * chance,
    vents: [],
    splays: [],
  };
  const ventCount = 1 + Math.floor(4 * random());
  for (let i = 0; i < ventCount; i++) {
    const at = -1.39 + 2.76 * (i + 0.19 + 0.63 * random()) / ventCount;
    fault.vents.push({
      at,
      across: riftAxis(at, fault) + 0.64 * (random() - 0.5),
      width: 0.12 + 0.26 * random(),
      height: 0.28 + 0.44 * random(),
      crater: 0.09 + 0.17 * random(),
    });
  }
  const splayCount = Math.floor(3 * random());
  for (let i = 0; i < splayCount; i++) {
    fault.splays.push({
      start: -1.32 + 1.65 * random(),
      length: 0.76 + 0.83 * random(),
      reach: (random() < 0.5 ? -1 : 1) * (0.38 + 0.50 * random()),
    });
  }
  return fault;
}

function riftHeight(along, across, h, datum, fault, grade) {
  const end = 1 - smooth(1.35, 2.25, Math.abs(along));
  if (end <= 0) return h;
  const { phase, depth } = fault;
  const width = fault.width + 0.14 * smooth(-0.68, 0.79, Math.cos(along * 3.6 + phase));
  const offset = across - riftAxis(along, fault);
  const side = offset < 0 ? -1 : 1;
  // Tilted fault blocks alternate across the trough. The softer flank gets
  // a wider apron, while the harder flank holds an escarpment and a bench.
  const hard = smooth(-0.7, 0.7, side * Math.sin(1.9 * along + phase));
  const d = Math.abs(offset) / (width * mix(1.28, 0.82, hard));
  const floor = datum - depth - grade * 0.35 * along +
    0.10 * smooth(0.30, 0.95, Math.sin(along * 4.5 + phase));
  const bank = smooth(0.46, mix(1.20, 0.87, hard), d);
  const shelf = smooth(0.66, 0.83, d) * (1 - smooth(0.86, 1.13, d));
  const axisCut = 1 - smooth(0.75, 1.28, d);
  const talus = smooth(0.48, 0.84, d) * (1 - smooth(0.96, 1.18, d));
  let rock = mix(floor + depth * bank, h, 0.12 + 0.20 * bank);
  rock += 0.11 * hard * shelf + 0.065 * talus * (1 - hard);
  let shaped = mix(h, rock, end * axisCut);
  const shoulder = smooth(0.76, 1.08, d) * (1 - smooth(1.19, 1.86, d));
  shaped += end * shoulder * mix(0.038, 0.21, hard);

  // A splay branches off one wall near the relay between fault segments.
  let cut = 0;
  for (const { start, length, reach } of fault.splays) {
    const t = (along - start) / length;
    if (t <= 0 || t >= 1) continue;
    const splay = Math.abs(offset - reach * (0.18 + 0.82 * t));
    const branch = smooth(0, 0.22, t) * (1 - smooth(0.69, 1, t)) *
      (1 - smooth(0.065, 0.23, splay));
    cut = Math.max(cut, 0.23 * branch);
  }
  shaped -= cut;

  // Fissure-fed shields grow on the same axis as the fault, so some vents
  // rise out of the basin as islands while others sit up on a wall.
  for (const vent of fault.vents) {
    const range = Math.hypot(along - vent.at, across - vent.across) / vent.width;
    if (range >= 1.24) continue;
    const shield = 1 - smooth(0.09, 1.24, range);
    const caldera = 1 - smooth(0.10, 0.39, range);
    shaped += vent.height * shield ** 1.4 - vent.crater * caldera;
  }
  return shaped;
}

const separation = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

// A fixed-size search on the baked globe, followed by bounded patches.
// No landmark shapes or extra textures are evaluated in the draw loop.
export function shapeStudioLandmarks(values, side, seed, variation, glacialSites, regions) {
  const sites = { impact: [], karst: [], rift: [] };
  const strength = smooth(0.24, 0.85, variation);
  if (side < 257 || strength <= 0) return sites;
  const span = side - 1;
  const wrap = (x) => ((x % span) + span) % span;
  const yStep = Math.PI / span;
  const heightAt = (x, y) => values[clamp(Math.round(y), 0, span) * side + wrap(Math.round(x))];
  const occupied = glacialSites.flatMap(({ overlook, head }) => [overlook, head]);
  const random = seededRandom(seed ^ 0x93a1ef4b);
  const candidates = [];
  for (let j = 0; j < 13; j++) {
    for (let i = 0; i < 28; i++) {
      const x = (i + random()) * span / 28;
      const y = (0.22 + 0.56 * (j + random()) / 13) * span;
      const dir = direction(span, x, y);
      const light = 0.54 * dir[0] + 0.45 * dir[1] + 0.71 * dir[2];
      if (occupied.some((p) => separation(p, dir) > 0.95)) continue;
      const xStep = tau * Math.sin(y * yStep) / span;
      const radius = 0.067 + 0.035 * random();
      const phase = random() * tau;
      const samples = Array.from({ length: 8 }, (_, k) => {
        const angle = phase + k * tau / 8;
        return heightAt(x + radius * Math.cos(angle) / xStep, y + radius * Math.sin(angle) / yStep);
      });
      const datum = samples.reduce((sum, value) => sum + value, 0) / samples.length;
      const relief = Math.max(...samples) - Math.min(...samples);
      const height = heightAt(x, y);
      const [, canyon, granite, volcanic] = studioRegionWeights({ regions }, dir);
      const bedrock = 0.54 * canyon + 0.48 * granite;
      candidates.push({ x, y, dir, xStep, radius, phase, datum, relief, height, light, bedrock, volcanic, samples, chance: random() });
    }
  }
  if (!candidates.length) return sites;
  const levels = candidates.map(({ datum }) => datum).sort((a, b) => a - b);
  const land = levels[Math.floor(levels.length * 0.70)];
  const scoreImpact = ({ datum, height, light, relief, chance }) =>
    1.3 * light - Math.abs(datum - land - 0.26) - 0.44 * relief - 0.32 * Math.abs(height - datum) + 0.20 * chance;
  const scoreKarst = ({ datum, height, light, relief, bedrock, chance }) =>
    light - Math.abs(datum - land - 0.36) - 0.65 * relief + 0.40 * (height - datum) + bedrock + 0.30 * chance;
  const impact = candidates.sort((a, b) => scoreImpact(b) - scoreImpact(a))[0];
  const karst = candidates
    .filter(({ dir }) => separation(dir, impact.dir) < 0.94)
    .sort((a, b) => scoreKarst(b) - scoreKarst(a))[0];
  const scoreRift = (target) => ({ datum, relief, light, volcanic, chance }) =>
    light - 1.26 * Math.abs(datum - target) - 0.38 * relief + 0.64 * volcanic + 0.17 * chance;
  const riftCandidates = candidates.filter(({ dir }) =>
    separation(dir, impact.dir) < 0.91 && (!karst || separation(dir, karst.dir) < 0.92));
  const pickRift = (candidates, target) => {
    const score = scoreRift(target);
    return candidates.sort((a, b) => score(b) - score(a))[0];
  };
  const coastalRift = pickRift(riftCandidates, levels[Math.floor(levels.length * 0.56)] + 0.30);
  const inlandRift = coastalRift && pickRift(riftCandidates.filter(({ dir, datum }) =>
    separation(dir, coastalRift.dir) < 0.91 && datum > coastalRift.datum + 0.29), land + 0.60);

  for (const [kind, patch] of [["impact", impact], ["karst", karst], ["rift", coastalRift], ["rift", inlandRift]]) {
    if (!patch) continue;
    const { x, y, xStep, radius, phase, datum, chance } = patch;
    const rift = kind === "rift";
    const low = rift ? patch.samples.indexOf(Math.min(...patch.samples)) : 0;
    const bearing = phase + low * tau / 8;
    const cos = Math.cos(bearing), sin = Math.sin(bearing);
    const impactBasin = kind === "impact";
    const impacts = impactBasin ? createImpactHistory(seed, (u, v) =>
      heightAt(x + (u * cos - v * sin) * radius / xStep, y + (u * sin + v * cos) * radius / yStep)
    ).sort((a, b) => b.wear - a.wear) : [];
    const impactExtent = Math.max(0, ...impacts.map(({ x, y, size, warp }) =>
      Math.hypot(x, y) + 1.53 * size * (1.021 + warp)));
    const extent = radius * (rift ? 2.65 : impactBasin ? impactExtent : 1.56);
    const pits = kind === "karst" ? karstPits(random) : [];
    const faultSeed = Math.imul(seed ^ (seed >>> 16), 0x85ebca6b) ^ Math.imul(Math.floor(x), 0x9e3779b1);
    const fault = rift ? riftHistory(seededRandom(faultSeed), phase, chance) : null;
    const grade = rift ? clamp(datum - patch.samples[low], 0.03, 0.28) : 0;
    for (let row = Math.max(1, Math.ceil(y - extent / yStep)); row <= Math.min(span - 1, y + extent / yStep); row++) {
      for (let col = Math.ceil(x - extent / xStep); col <= x + extent / xStep; col++) {
        const east = (col - x) * xStep / radius;
        const south = (row - y) * yStep / radius;
        const u = east * cos + south * sin, v = south * cos - east * sin;
        const index = row * side + wrap(col);
        const h = values[index];
        let shaped = h;
        if (impactBasin) {
          for (const event of impacts) shaped = impactHeight(u, v, shaped, event);
        } else if (rift) {
          shaped = riftHeight(u, v, h, datum, fault, grade);
        } else {
          shaped = karstHeight(u, v, h, datum, pits);
        }
        values[index] = mix(h, shaped, strength);
      }
      values[row * side + span] = values[row * side];
    }
    const view = rift ? 1.68 : impactBasin ? -Math.max(1.05, impactExtent * 0.46) : -0.97;
    const sideView = rift ? 0.65 : 0;
    let focusU = 0, focusV = 0;
    if (impactBasin) {
      const mass = impacts.reduce((sum, event) => sum + event.size, 0);
      for (const event of impacts) {
        focusU += event.x * event.size / mass;
        focusV += event.y * event.size / mass;
      }
    }
    const localDirection = (u, v) => direction(span, x + (u * cos - v * sin) * radius / xStep,
      y + (u * sin + v * cos) * radius / yStep);
    sites[kind].push({
      overlook: localDirection(focusU + view, focusV + sideView),
      target: localDirection(focusU, focusV),
    });
  }
  return sites;
}

