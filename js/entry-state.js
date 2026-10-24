export function entryState(elapsed, options = {}) {
  const {ready = true, visibleElapsed = elapsed} = options;
  const done = elapsed >= 12000 || (ready && visibleElapsed >= 2000);
  const progress = done ? 100 : Math.min(ready ? 99 : 90, Math.floor(Math.max(0, visibleElapsed) / 20));
  return {progress, done};
}
