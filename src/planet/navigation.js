import { clamp, cross, dot, unit } from "./field.js";

export const minFlightClearance = 2;

export function cruiseElevation(elevation, target, ground, ahead, dt) {
  const floor = ground + minFlightClearance;
  const desired = Math.max(floor, target, ahead + minFlightClearance);
  if (Math.abs(desired - elevation) < 0.01) return desired;
  const rate = desired > elevation ? 6 : 2;
  return Math.max(floor, elevation + (desired - elevation) * -Math.expm1(-rate * dt));
}

export function surfaceFrame(direction) {
  const east = unit(
    cross(Math.abs(direction[1]) > 0.98 ? [0, 0, 1] : [0, 1, 0], direction),
  );
  return { direction, east, north: cross(direction, east) };
}

export function viewAxes({ east, north }, yaw) {
  const c = Math.cos(yaw),
    s = Math.sin(yaw);
  return [
    east.map((v, i) => v * c - north[i] * s),
    north.map((v, i) => v * c + east[i] * s),
  ];
}

function travel(frame, tangent, angle) {
  const { direction, east } = frame;
  const c = Math.cos(angle),
    s = Math.sin(angle);
  const next = unit(direction.map((v, i) => v * c + tangent[i] * s));
  // Along a great circle, rotate the part of east parallel to travel.
  // The transverse part is already tangent at the new position.
  const component = dot(east, tangent);
  const moved = east.map(
    (v, i) => v + component * (tangent[i] * (c - 1) - direction[i] * s),
  );
  const correction = dot(moved, next);
  const nextEast = unit(moved.map((v, i) => v - correction * next[i]));
  return { direction: next, east: nextEast, north: cross(next, nextEast) };
}

export function moveOnSphere(frame, yaw, rightMeters, forwardMeters, radius) {
  const distance = Math.hypot(rightMeters, forwardMeters);
  if (distance === 0) return frame;
  const [right, forward] = viewAxes(frame, yaw);
  const tangent = right.map(
    (v, i) => (rightMeters * v + forwardMeters * forward[i]) / distance,
  );
  return travel(frame, tangent, distance / radius);
}

export function surfaceRoute(frame, target) {
  const { direction } = frame;
  const cosine = clamp(dot(direction, target), -1, 1);
  const projected = target.map((v, i) => v - cosine * direction[i]);
  const sine = Math.hypot(...projected);
  const tangent = sine > 1e-12 ? projected.map((v) => v / sine) : frame.east;
  const angle = Math.atan2(sine, cosine);
  return (fraction) => travel(frame, tangent, angle * fraction);
}
