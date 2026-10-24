// Run before parsing anchor targets so reloads always begin at the hero.
window.resetEntryLocation = function () {
  window.history.scrollRestoration = 'manual';
  if (window.location.hash) {
    window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  }
  window.scrollTo({top: 0, left: 0, behavior: 'instant'});
};
window.resetEntryLocation();
