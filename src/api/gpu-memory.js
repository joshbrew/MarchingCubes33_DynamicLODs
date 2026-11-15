// Estimate logical allocation sizes. Canvas buffering, texture padding and
// driver allocations are implementation details that WebGPU does not expose.
export function textureBytes(format, width, height, depth = 1, mipLevels = 1, samples = 1, isVolume = false) {
  const channels = /^(rgba|bgra|rg|r)(8|16|32)/.exec(format);
  const pixelBytes = channels
    ? channels[1].length * Number(channels[2]) / 8
    : format === "stencil8" ? 1 : format === "depth16unorm" ? 2 : format === "depth32float-stencil8" ? 8 : 4;
  let texels = 0;
  for (let level = 0; level < mipLevels; level++) {
    texels += width * height * depth;
    width = Math.max(1, Math.floor(width / 2));
    height = Math.max(1, Math.floor(height / 2));
    if (isVolume) depth = Math.max(1, Math.floor(depth / 2));
  }
  return texels * pixelBytes * samples;
}

const isBuffer = (value) => typeof GPUBuffer !== "undefined" && value instanceof GPUBuffer;
const isTexture = (value) => typeof GPUTexture !== "undefined" && value instanceof GPUTexture;

export function ownedGpuResources(owner) {
  return Object.values(owner ?? {}).flat().filter((value) => isBuffer(value) || isTexture(value));
}

export function noiseGpuResources(builder) {
  if (!builder) return [];
  const resources = ownedGpuResources(builder);
  for (const pair of builder._texPairs.values()) {
    resources.push(...ownedGpuResources(pair));
    for (const tile of pair.tiles ?? []) resources.push(...ownedGpuResources(tile));
  }
  for (const volume of builder._volumeCache.values()) {
    for (const chunk of volume.chunks) resources.push(...ownedGpuResources(chunk));
  }
  return resources;
}

export function estimateGpuBytes(resources) {
  let bytes = 0;
  for (const resource of new Set(resources)) {
    if (isBuffer(resource)) bytes += resource.size;
    else if (isTexture(resource)) bytes += textureBytes(
      resource.format, resource.width, resource.height, resource.depthOrArrayLayers,
      resource.mipLevelCount, resource.sampleCount, resource.dimension === "3d",
    );
  }
  return bytes;
}
