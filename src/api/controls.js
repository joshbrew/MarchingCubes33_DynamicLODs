/** Optional drag-look / WASD / Space / C controls. update(dt) takes seconds. */
export function attachFlyControls(
  canvas,
  camera,
  {
    speed = 80,
    lookSpeed = 0.003,
    groundHeight,
    clearance,
    followGround = Boolean(groundHeight),
  } = {},
) {
  const win = canvas?.ownerDocument?.defaultView;
  if (!win || !camera?.position || camera.position.length !== 3)
    throw new TypeError(
      "Fly controls need a browser canvas and mutable camera.position array.",
    );
  if (
    ![speed, lookSpeed].every((v) => Number.isFinite(v) && v > 0) ||
    (groundHeight !== undefined && typeof groundHeight !== "function") ||
    (clearance !== undefined &&
      (!Number.isFinite(clearance) || clearance < 0.25))
  )
    throw new RangeError(
      "Use positive speed/lookSpeed, a groundHeight function and clearance >= 0.25.",
    );
  const forward =
    camera.forward ||
    (camera.target
      ? camera.target.map((v, i) => v - camera.position[i])
      : [0, -0.2, -1]);
  let yaw = Math.atan2(forward[0], -forward[2]),
    pitch = Math.atan2(forward[1], Math.hypot(forward[0], forward[2]));
  let dragging = false,
    lastX = 0,
    lastY = 0,
    disposed = false;
  const keys = new Set(),
    listeners = [];
  const oldTabIndex = canvas.getAttribute("tabindex"),
    oldTouchAction = canvas.style.touchAction;
  if (oldTabIndex === null) canvas.tabIndex = 0;
  canvas.style.touchAction = "none";
  const clear = () => {
    keys.clear();
    dragging = false;
  };
  const on = (target, type, fn) => {
    target.addEventListener(type, fn);
    listeners.push(() => target.removeEventListener(type, fn));
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
  const controls = {
    enabled: true,
    speed,
    fly: false,
    followGround,
    clearance:
      clearance ??
      Math.max(
        0.25,
        camera.position[1] -
          (groundHeight?.(camera.position[0], camera.position[2]) ?? 0),
      ),
    update(dt) {
      if (disposed) throw new Error("Fly controls have been disposed.");
      if (!Number.isFinite(dt) || dt < 0)
        throw new RangeError("dt must be nonnegative seconds.");
      if (!controls.enabled) {
        clear();
        return camera;
      }
      const f =
          Number(keys.has("KeyW") || controls.fly) - Number(keys.has("KeyS")),
        r = Number(keys.has("KeyD")) - Number(keys.has("KeyA"));
      const x = Math.sin(yaw) * f + Math.cos(yaw) * r,
        z = -Math.cos(yaw) * f + Math.sin(yaw) * r;
      const step =
          controls.speed *
          Math.min(dt, 0.05) *
          (keys.has("ShiftLeft") || keys.has("ShiftRight") ? 4 : 1),
        length = Math.hypot(x, z);
      if (length) {
        camera.position[0] += (x / length) * step;
        camera.position[2] += (z / length) * step;
      }
      const climb = Number(keys.has("Space")) - Number(keys.has("KeyC"));
      if (controls.followGround && groundHeight) {
        controls.clearance = Math.max(0.25, controls.clearance + climb * step);
        camera.position[1] =
          groundHeight(camera.position[0], camera.position[2]) +
          controls.clearance;
      } else camera.position[1] += climb * step;
      camera.forward = [
        Math.sin(yaw) * Math.cos(pitch),
        Math.sin(pitch),
        -Math.cos(yaw) * Math.cos(pitch),
      ];
      return camera;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clear();
      listeners.forEach((remove) => remove());
      canvas.style.touchAction = oldTouchAction;
      if (oldTabIndex === null) canvas.removeAttribute("tabindex");
    },
  };
  on(canvas, "pointerdown", (e) => {
    if (!controls.enabled || e.button !== 0) return;
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.focus();
    canvas.setPointerCapture?.(e.pointerId);
  });
  on(canvas, "pointermove", (e) => {
    if (!dragging || !controls.enabled) return;
    yaw += (e.clientX - lastX) * lookSpeed;
    pitch = Math.max(
      -1.5,
      Math.min(1.5, pitch - (e.clientY - lastY) * lookSpeed),
    );
    lastX = e.clientX;
    lastY = e.clientY;
  });
  on(canvas, "pointerup", () => {
    dragging = false;
  });
  on(canvas, "pointercancel", clear);
  on(canvas, "lostpointercapture", () => {
    dragging = false;
  });
  on(win, "keydown", (e) => {
    if (
      controls.enabled &&
      canvas.ownerDocument.activeElement === canvas &&
      movement.has(e.code)
    ) {
      keys.add(e.code);
      e.preventDefault();
    }
  });
  on(win, "keyup", (e) => keys.delete(e.code));
  on(win, "blur", clear);
  on(canvas, "blur", clear);
  return controls;
}
