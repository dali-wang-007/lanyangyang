import {entryState} from './entry-state.js';

// Build embeds this controller after the overlay, independent of app downloads.
const overlay = document.querySelector('#entry');
if (overlay && document.documentElement.classList.contains('entry-active')) {
  const bar = overlay.querySelector('progress');
  const start = performance.now();
  const background = [];
  let ready = false, visibleAt = null, finished = false, frame, keyboardUsed = false;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.tabIndex = -1;
  overlay.focus({preventScroll: true});
  const finish = () => {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(frame);
    clearTimeout(failsafe);
    bar.value = 100;
    document.documentElement.classList.remove('entry-active');
    window.resetEntryLocation?.();
    background.forEach(el => { if ('entryInert' in el.dataset) { el.inert = false; delete el.dataset.entryInert; } });
    overlay.classList.add('entry-leaving');
    const hadFocus = overlay.contains(document.activeElement);
    overlay.inert = true;
    setTimeout(() => {
      overlay.hidden = true;
      if (hadFocus && keyboardUsed) document.querySelector('.brand')?.focus({preventScroll: true});
    }, 240);
  };
  const failsafe = setTimeout(finish, 12000);
  overlay.addEventListener('keydown', event => {
    keyboardUsed = true;
    if (event.key === 'Tab') { event.preventDefault(); overlay.focus(); }
  });
  const decoded = image => image?.decode ? image.decode().catch(() => {}) : Promise.resolve();
  const runner = new Image();
  runner.src = 'assets/mascot/sloth-run-side-v3.webp';
  decoded(runner).then(() => requestAnimationFrame(() => requestAnimationFrame(() => {
    visibleAt = performance.now();
    overlay.classList.add('entry-art-ready');
  })));
  const prepare = async () => {
    if (finished) return;
    background.push(...[...document.body.children].filter(el => el !== overlay && el.matches('header,main,footer,aside,.skip-link')));
    background.forEach(el => { if (!el.inert) { el.inert = true; el.dataset.entryInert = ''; } });
    await Promise.all([decoded(document.querySelector('.mascot-image')), document.fonts?.ready]);
    ready = true;
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', prepare, {once: true});
  else prepare();
  const tick = () => {
    if (finished) return;
    const now = performance.now();
    const state = entryState(now - start, {ready, visibleElapsed: visibleAt === null ? 0 : now - visibleAt});
    bar.value = state.progress;
    if (state.done) finish();
    else frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
} else if (overlay) overlay.hidden = true;
