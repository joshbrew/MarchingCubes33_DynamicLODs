import { unit } from "./field.js";

const initialSun = unit([0.54, 0.45, 0.71]);
const east = unit([initialSun[2], 0, -initialSun[0]]);

export function sunDirection(turn) {
  const angle = turn * 2 * Math.PI;
  const c = Math.cos(angle), s = Math.sin(angle);
  return initialSun.map((value, i) => value * c + east[i] * s);
}

// Linear-light daylight horizon, dusk scattering, and air density.
const skies = {
  blue: [[.23, .40, .65], [.93, .34, .105], 1],
  amber: [[.54, .34, .14], [.95, .24, .072], 1.1],
  violet: [[.35, .26, .57], [.76, .22, .46], .93],
  teal: [[.15, .43, .40], [.73, .53, .15], 1.06],
  thin: [[.30, .40, .57], [.82, .36, .18], .18],
  titan: [[.31, .43, .33], [.92, .56, .20], 1.18],
  airless: [[.27, .32, .44], [.69, .37, .22], .015],
  pluto: [[.28, .43, .70], [.65, .43, .25], .09],
};
const presetSkies = {
  utahish: "amber", desert: "amber", volcanic: "amber", "mars-dawn": "amber",
  badlands: "amber", "gas-giant": "amber", "lavender-dusk": "violet",
  toxic: "teal", "copper-oxide": "teal", jungle: "teal", "moon-dust": "thin",
  "verdigris-sea": "teal", "amethyst-tide": "violet",
  "lunar-highlands": "thin", "basalt-mare": "thin",
  titan: "titan", io: "airless", pluto: "pluto", ceres: "airless",
  "ceres-crater-fields": "airless",
};

export function atmosphereColors(preset, atmosphere) {
  const key = atmosphere === "preset" ? presetSkies[preset] ?? "blue" : atmosphere;
  return Object.hasOwn(skies, key) ? skies[key] : skies.blue;
}
