import { applyStudioRunoff } from "./studio-watersheds.js";

self.onmessage = ({ data: { values, side, geology } }) => {
  const terrain = applyStudioRunoff(values, side, geology);
  self.postMessage(terrain, [terrain.buffer]);
};
