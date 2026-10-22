/** Adjacent keyframes; yaw is normalized direction, not a measured 3D angle. */
export function selectViews(yaw) {
  const value = Number.isFinite(yaw) ? Math.max(-1, Math.min(1, yaw)) : 0;
  const index = (value + 1) * 2;
  const from = Math.floor(index), mix = index - from;
  return { from, to: mix === 0 ? from : from + 1, mix };
}

/** A bounded look direction in screen space, not a full neck revolution. */
export function lookTarget(x, y, rect, viewportWidth) {
  const clamp = value => Math.max(-1, Math.min(1, value));
  return {
    yaw: clamp((x - rect.left - rect.width / 2) / Math.max(240, viewportWidth * 0.35)),
    pitch: clamp((rect.top + rect.height * 0.24 - y) / 400)
  };
}

/** Frame-rate-independent gaze, neck and torso response with a soft follow-through. */
export function advancePose(pose, target, dt) {
  const step = Math.max(0, Math.min(dt, .05));
  const approach = (from, to, rate) => from + (to - from) * (1 - Math.exp(-rate * step));
  const yaw = approach(pose.yaw, target.yaw, 7);
  const pitch = approach(pose.pitch, target.pitch, 6);
  return {
    yaw, pitch,
    gazeX: approach(pose.gazeX, target.yaw, 15),
    gazeY: approach(pose.gazeY, target.pitch, 15),
    bodyYaw: approach(pose.bodyYaw, yaw, 2.8),
    bodyPitch: approach(pose.bodyPitch, pitch, 2.5)
  };
}
