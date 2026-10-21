/** Adjacent keyframes; yaw is normalized direction, not a measured 3D angle. */
export function selectViews(yaw) {
  const value = Number.isFinite(yaw) ? Math.max(-1, Math.min(1, yaw)) : 0;
  const index = (value + 1) * 2;
  const from = Math.floor(index), mix = index - from;
  return { from, to: mix === 0 ? from : from + 1, mix };
}
