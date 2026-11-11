const tau = 2 * Math.PI;
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const smooth = (a, b, value) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// These valleys are cut into the height bake before runoff, so streams can
// follow their floors. Each patch uses a local angular scale and wraps in X.
export function carveStudioGlacialValleys(values, side, seed, variation, ice) {
  const icy = !!ice;
  const strength = smooth(0.18, 0.84, variation);
  if (side < 257 || strength === 0) return [];
  const span = side - 1;
  const wrap = (x) => ((x % span) + span) % span;
  const heightAt = (x, y) => values[clamp(Math.round(y), 0, span) * side + wrap(Math.round(x))];
  const direction = (x, y) => {
    const longitude = x / span * tau, latitude = y / span * Math.PI;
    return [Math.sin(latitude) * Math.cos(longitude), Math.cos(latitude), Math.sin(latitude) * Math.sin(longitude)];
  };
  let state = seed >>> 0;
  const random = () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
  const candidates = [], uplandCandidates = [];
  const elevations = [];
  for (let j = 0; j < 24; j++) {
    const y = Math.acos(1 - (j + 0.5) / 12) * span / Math.PI;
    for (let i = 0; i < 48; i++) elevations.push(heightAt((i + 0.5) * span / 48, y));
  }
  elevations.sort((a, b) => a - b);
  const inlandFloor = elevations[Math.floor(elevations.length * 0.71)] + 0.19;
  const columns = 32, rows = 20;
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < columns; i++) {
      const x = (i + random()) * span / columns;
      const y = (0.23 + 0.54 * (j + random()) / rows) * span;
      const xScale = tau * Math.sin(y / span * Math.PI) / span;
      const yScale = Math.PI / span;
      const length = (icy ? 0.195 : 0.075) + (icy ? 0.25 : 0.055) * random();
      const widthRoll = random();
      const width = icy ? 0.024 + length * (0.048 + 0.055 * widthRoll)
        : length * (0.17 + 0.065 * widthRoll);
      const bend = width * (random() - 0.5) * 1.25;
      const branch = random() < 0.5 ? -1 : 1;
      const cirque = random();
      const phase = random() * tau;
      const head = heightAt(x, y);
      const dir = direction(x, y);
      const light = dir[0] * 0.54 + dir[1] * 0.45 + dir[2] * 0.71;
      let best, bestUpland;
      for (let heading = 0; heading < 8; heading++) {
        const angle = phase + heading * tau / 8;
        const dx = Math.cos(angle), dy = Math.sin(angle);
        const outlet = heightAt(x + dx * length / xScale, y + dy * length / yScale);
        const drop = head - outlet;
        if (drop < (icy ? 0.085 : 0.25)) continue;
        const mid = heightAt(x + dx * length * 0.52 / xScale, y + dy * length * 0.52 / yScale);
        const sideA = heightAt(x + (dx * length * 0.40 - dy * width) / xScale,
          y + (dy * length * 0.40 + dx * width) / yScale);
        const sideB = heightAt(x + (dx * length * 0.40 + dy * width) / xScale,
          y + (dy * length * 0.40 - dx * width) / yScale);
        const walls = Math.min(sideA, sideB) - outlet;
        const score = 0.65 * clamp(drop, 0, 1.3) + 0.58 * clamp(walls, -0.35, 0.85) +
          0.24 * clamp(mid - outlet, -0.45, 0.65) + 0.46 * light + 0.16 * random() +
          (icy ? 0.60 * length : 0);
        const candidate = { x, y, xScale, yScale, dx, dy, length, width, bend, branch, cirque, head, outlet, score };
        if (!best || score > best.score) best = candidate;
        if (outlet >= inlandFloor && (!bestUpland || score > bestUpland.score))
          bestUpland = candidate;
      }
      if (best) candidates.push(best);
      if (bestUpland) uplandCandidates.push(bestUpland);
    }
  }

  const patches = [];
  const byElevation = candidates.map(({ outlet }) => outlet).sort((a, b) => a - b);
  const nearCoast = byElevation[Math.floor(byElevation.length * 0.76)];
  const lowland = byElevation[Math.floor(byElevation.length * 0.44)];
  candidates.sort((a, b) => b.score - a.score);
  const separated = (patch) => patches.every(({ x, y }) => Math.hypot(
      Math.min(Math.abs(x - patch.x), span - Math.abs(x - patch.x)) * patch.xScale,
      (y - patch.y) * patch.yScale,
    ) >= (icy ? 0.20 : 0.31));
  // Seek both high troughs and low outlets. On wet worlds, the latter can flood.
  const upland = uplandCandidates.sort((a, b) => b.score - a.score)[0];
  if (upland) patches.push(upland);
  const low = candidates.find((patch) => patch.outlet <= nearCoast && patch.outlet >= lowland && separated(patch));
  if (low) patches.push(low);
  for (const patch of candidates) {
    if (!separated(patch)) continue;
    patches.push(patch);
    if (patches.length === (icy ? 11 + (seed >>> 5) % 5 : 4)) break;
  }

  return patches.map(({ x, y, xScale, yScale, dx, dy, length, width, bend, branch, cirque, head, outlet }) => {
    const relief = icy ? clamp(head - outlet, 0.14, 0.73) : clamp(head - outlet, 0.26, 1.14);
    const before = icy ? -0.17 : 0, after = icy ? 1.29 : 1;
    const pathX = dx * length / xScale, pathY = dy * length / yScale;
    const startX = Math.floor(x + Math.min(before * pathX, after * pathX) - 3.2 * width / xScale);
    const endX = Math.ceil(x + Math.max(before * pathX, after * pathX) + 3.2 * width / xScale);
    const startY = Math.max(1, Math.floor(y + Math.min(before * pathY, after * pathY) - 3.2 * width / yScale));
    const endY = Math.min(span - 1, Math.ceil(y + Math.max(before * pathY, after * pathY) + 3.2 * width / yScale));
    const floorAt = (t) => outlet - 0.09 * relief + 0.63 * relief * (1 - t) ** 2;
    for (let row = startY; row <= endY; row++) {
      for (let col = startX; col <= endX; col++) {
        const east = (col - x) * xScale, south = (row - y) * yScale;
        const along = (east * dx + south * dy) / length;
        if (icy && (along <= before || along >= after)) continue;
        const meander = bend * (icy ? 0.64 * Math.sin(tau * along) + 0.26 * Math.sin(Math.PI * along) :
          Math.sin(Math.PI * along));
        const across = (-east * dy + south * dx - meander) / width;
        const t = clamp(along, 0, 1);
        // Wide headwall cirques narrow into a deep trunk, then widen again at its mouth.
        const spanAt = 0.68 + (0.28 + 0.37 * cirque) * (1 - smooth(0.04, 0.36, t)) +
          (0.22 + 0.24 * (1 - cirque)) * smooth(0.56, 0.97, t);
        const footprint = smooth(-0.17, 0.07, along) * (1 - smooth(0.83, 1.19, along));
        const trough = footprint * (1 - smooth(0.25, 1.0, Math.abs(across) / spanAt));
        const at = row * side + wrap(col);
        const h = values[at];
        let cut = trough * clamp(h - floorAt(t), 0, 0.95);
        let iceCover = trough;
        if (icy) {
          // Offset the deep floor toward one wall. Vary the foot and crown
          // widths independently so the opposite wall has a longer apron.
          const fault = across * branch - 0.15 * Math.sin(tau * t + cirque * Math.PI);
          const rimWidth = fault < 0 ? 0.41 + 0.18 * cirque : 0.75 + 0.12 * cirque;
          const corridor = smooth(-0.12, 0.035, along) * (1 - smooth(0.93, 1.18, along));
          const rift = corridor * (1 - smooth(0.24, rimWidth, Math.abs(fault)));
          const scarp = relief * (0.36 + 0.40 * cirque) * rift;
          cut = Math.max(cut, rift * clamp(h - floorAt(t), 0, .62) + scarp);
          const tongue = smooth(0.33, 0.60, along) * (1 - smooth(1.03, 1.29, along)) *
            (1 - smooth(0.44, 1.26, Math.abs(across + 0.12 * branch)));
          iceCover = Math.max(rift, 0.68 * trough, 0.86 * tongue);
        }

        // Two shorter cirques hang above the trunk and open into its walls.
        const forks = cirque > 0.28 ? 2 : 1;
        for (let fork = 0; fork < forks; fork++) {
          const armSide = fork === 0 ? branch : -branch;
          const junction = 0.25 + 0.14 * cirque + fork * 0.31;
          const rise = across * armSide;
          const arm = along - junction + 0.16 * rise - 0.021 * rise * rise;
          const bowl = 1 - smooth(0.047, 0.16 + 0.07 * cirque, Math.abs(arm));
          const reach = 2.0 + 0.55 * cirque - 0.3 * fork;
          const mask = bowl * smooth(0.21, 0.72, rise) * (1 - smooth(reach * 0.59, reach, rise));
          const hangingFloor = floorAt(junction) + relief * (0.18 + 0.09 * clamp(rise, 0, 2.6));
          cut = Math.max(cut, mask * clamp(h - hangingFloor, 0, 0.62));
          if (icy) iceCover = Math.max(iceCover, 0.76 * mask);
        }
        // A low, broken moraine arcs around the mouth of some troughs.
        const terminal = 0.89 - 0.11 * across * across;
        const moraine = (1 - smooth(0.015, 0.067, Math.abs(along - terminal))) *
          (1 - smooth(0.56, 0.97, Math.abs(across))) *
          smooth(-0.70, 0.28, across * branch) * relief * cirque * 0.075;
        values[at] = h + strength * (moraine - cut);
        if (icy && iceCover > 0) {
          const last = ice.side - 1;
          const iceRow = Math.round(row / span * last) * ice.side;
          const iceColumn = Math.round(wrap(col) / span * last) % last;
          const at = iceRow + iceColumn;
          ice.values[at] = Math.max(ice.values[at], strength * iceCover);
          if (iceColumn === 0) ice.values[iceRow + last] = ice.values[at];
        }
      }
      values[row * side + span] = values[row * side];
    }
    return {
      overlook: direction(x + 0.93 * dx * length / xScale, y + 0.93 * dy * length / yScale),
      head: direction(x + 0.12 * dx * length / xScale, y + 0.12 * dy * length / yScale),
    };
  });
}
