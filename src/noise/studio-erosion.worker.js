import { applyStudioRunoff } from "./studio-watersheds.js";

self.onmessage = ({ data: { values, side, settings } }) => {
  const { geology, seed, variation, regions, landmarkPatches, featureDensity,
    oceanCoverage, lunar, craterDetail, cryoGlaciers } = settings;
  const terrain = applyStudioRunoff(values, side, geology, seed, variation, regions, landmarkPatches, featureDensity,
    oceanCoverage, lunar, craterDetail, cryoGlaciers);
  const transfer = [terrain.values.buffer];
  if (terrain.alluvium) transfer.push(terrain.alluvium.values.buffer);
  if (terrain.glacialIce) transfer.push(terrain.glacialIce.values.buffer);
  if (terrain.springs) transfer.push(terrain.springs.values.buffer);
  if (terrain.dunes) transfer.push(terrain.dunes.values.buffer);
  for (const span of terrain.rockSpans ?? []) transfer.push(span.vertices.buffer);
  self.postMessage(terrain, transfer);
};
