import { studioLandscapes } from "../noise/studio.js";

const modes = ["erosion", "incised", "soft"];
export const rangeWeights = { hybrid: 1, ridges: 1.35, rolling: 0.35 };
export const defaultDetail = Object.freeze({
  range: "hybrid",
  landscape: "natural",
  landscapeStrength: 1,
  relief: 1,
  slopes: "erosion",
  ground: "erosion",
  slopeOctaves: 4,
  groundOctaves: 5,
  erosionStrength: 1.2,
  variation: 0.8,
});

export function planetDetail(update, previous = defaultDetail) {
  const detail = { ...previous, ...update };
  if (!Object.hasOwn(rangeWeights, detail.range) ||
      !Object.hasOwn(studioLandscapes, detail.landscape) ||
      !Number.isFinite(detail.landscapeStrength) || detail.landscapeStrength < 0 || detail.landscapeStrength > 1 ||
      !Number.isFinite(detail.relief) || detail.relief < 0.25 || detail.relief > 1.25 ||
      !modes.includes(detail.slopes) || !modes.includes(detail.ground) ||
      !Number.isInteger(detail.slopeOctaves) || detail.slopeOctaves < 0 || detail.slopeOctaves > 4 ||
      !Number.isInteger(detail.groundOctaves) || detail.groundOctaves < 0 || detail.groundOctaves > 5 ||
      !Number.isFinite(detail.erosionStrength) || detail.erosionStrength < 0 || detail.erosionStrength > 2 ||
      !(detail.variation >= 0 && detail.variation <= 1) || !Number.isFinite(detail.variation))
    throw new RangeError("Use a valid planet relief profile, octave counts and variation from 0 to 1.");
  return Object.freeze(detail);
}

export function detailUniforms(detail) {
  return [
    rangeWeights[detail.range], detail.variation, detail.slopeOctaves, detail.groundOctaves,
    modes.indexOf(detail.slopes), modes.indexOf(detail.ground), 0, 0,
  ];
}
