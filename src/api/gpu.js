/** Request a device without creating any UI. Caller owns the returned device. */
export async function createGPUDevice({
  adapterOptions,
  requiredFeatures = [],
  requiredLimits,
  timestamps = true,
} = {}) {
  const gpu = globalThis.navigator?.gpu;
  if (!gpu)
    throw new Error(
      "WebGPU is unavailable; use CPU extraction or a WebGPU browser over HTTPS.",
    );
  const adapter = await gpu.requestAdapter(adapterOptions);
  if (!adapter) throw new Error("No WebGPU adapter is available.");
  const features = new Set(requiredFeatures);
  if (timestamps && adapter.features.has("timestamp-query"))
    features.add("timestamp-query");
  return adapter.requestDevice({
    requiredFeatures: [...features],
    requiredLimits,
  });
}

export function isWebGPUSupported() {
  return Boolean(globalThis.navigator?.gpu);
}

// Each renderer owns its canvas context. A supplied device remains caller-owned.
export async function initializeGPU(renderer) {
  renderer.ownsDevice = !renderer.options.device;
  renderer.device = renderer.options.device || (await createGPUDevice());
  const d = renderer.device;
  renderer.onGPUError = (event) => renderer.errors.push(event.error.message);
  d.addEventListener("uncapturederror", renderer.onGPUError);
  const weak = new WeakRef(renderer);
  d.lost.then((info) => {
    const view = weak.deref();
    if (view && !view.disposed)
      view.errors.push(`GPU device lost: ${info.message}`);
  });
  renderer.context = renderer.canvas.getContext("webgpu");
  if (!renderer.context)
    throw new Error("Canvas cannot create a WebGPU context.");
  renderer.format =
    renderer.options.format ||
    globalThis.navigator.gpu.getPreferredCanvasFormat();
  renderer.context.configure({
    device: d,
    format: renderer.format,
    alphaMode: "opaque",
  });
  return d;
}

export function disposeGPUContext(renderer) {
  if (renderer.onGPUError)
    renderer.device?.removeEventListener(
      "uncapturederror",
      renderer.onGPUError,
    );
  renderer.context?.unconfigure();
  if (renderer.ownsDevice) renderer.device?.destroy();
}

export function renderSize(canvas, options = {}) {
  const ratio =
    options.pixelRatio ?? Math.min(globalThis.devicePixelRatio || 1, 1.5);
  if (!Number.isFinite(ratio) || ratio <= 0)
    throw new RangeError("pixelRatio must be positive and finite.");
  // OffscreenCanvas has no CSS size; its width/height are already physical pixels.
  return {
    ratio,
    width: Math.max(
      1,
      Math.round(
        canvas.clientWidth === undefined
          ? canvas.width
          : canvas.clientWidth * ratio,
      ),
    ),
    height: Math.max(
      1,
      Math.round(
        canvas.clientHeight === undefined
          ? canvas.height
          : canvas.clientHeight * ratio,
      ),
    ),
  };
}
