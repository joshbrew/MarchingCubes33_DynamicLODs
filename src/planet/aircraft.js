import aircraftWGSL from "./shaders/aircraft.wgsl";

export const aircraftVertexCount = 78;

export function createAircraft(device, format, frameUniform) {
  const module = device.createShaderModule({ label: "Planet aircraft", code: aircraftWGSL });
  const pipeline = device.createRenderPipeline({
    label: "Planet aircraft",
    layout: "auto",
    vertex: { module, entryPoint: "aircraftVertex" },
    fragment: { module, entryPoint: "aircraftFragment", targets: [{ format }] },
    depthStencil: { format: "depth24plus", depthWriteEnabled: true, depthCompare: "less" },
  });
  const pose = new Float32Array(4);
  const uniform = device.createBuffer({
    label: "Planet aircraft pose",
    size: pose.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const group = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frameUniform } },
      { binding: 1, resource: { buffer: uniform } },
    ],
  });
  return {
    uniform,
    draw(pass, camera, bank) {
      // Keep the chase model in front of the near plane at orbital altitudes.
      // Scale it with chase distance to preserve its apparent size.
      const distance = Math.max(8, camera.near * 1.5);
      pose[0] = distance;
      pose[1] = distance * 0.17;
      pose[2] = distance * 0.045;
      pose[3] = bank;
      device.queue.writeBuffer(uniform, 0, pose);
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, group);
      pass.draw(aircraftVertexCount);
    },
    dispose() {
      uniform.destroy();
    },
  };
}
