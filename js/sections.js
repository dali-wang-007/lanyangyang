const SECTION_IDS = ['resources', 'product', 'about'];

export function resolveSection(hash = '') {
  const value = String(hash).replace(/^#/u, '');
  return SECTION_IDS.includes(value) ? value : 'resources';
}

export function initSectionTabs(root = document) {
  const tabs = [...root.querySelectorAll('[data-section-tab]')];
  const panels = [...root.querySelectorAll('[data-section-panel]')];
  if (tabs.length === 0 || panels.length === 0) return;

  function activate(sectionId, { updateHash = false, focus = false } = {}) {
    const selected = resolveSection(`#${sectionId}`);
    tabs.forEach((tab) => {
      const active = tab.dataset.sectionTab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    panels.forEach((panel) => { panel.hidden = panel.dataset.sectionPanel !== selected; });
    if (updateHash && typeof history !== 'undefined') history.replaceState(null, '', `#${selected}`);
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab.dataset.sectionTab, { updateHash: true }));
    tab.addEventListener('keydown', (event) => {
      const keyMap = { ArrowLeft: index - 1, ArrowRight: index + 1, Home: 0, End: tabs.length - 1 };
      if (!(event.key in keyMap)) return;
      event.preventDefault();
      const targetIndex = (keyMap[event.key] + tabs.length) % tabs.length;
      activate(tabs[targetIndex].dataset.sectionTab, { updateHash: true, focus: true });
    });
  });

  root.querySelectorAll('a[href^="#"]').forEach((link) => link.addEventListener('click', () => {
    const section = resolveSection(link.getAttribute('href'));
    if (SECTION_IDS.includes(section)) activate(section, { updateHash: true });
  }));
  window.addEventListener('hashchange', () => activate(resolveSection(location.hash)));
  activate(resolveSection(location.hash));
}

if (typeof document !== 'undefined') initSectionTabs();
