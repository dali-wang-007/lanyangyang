import {
  filterResources,
  getFacetCounts,
  getVisibleResources,
  toggleFacetSelection
} from './catalog.js';
import { renderResourceList, renderResultsSummary } from './render.js';

const PAGE_SIZE = 30;

export async function initCatalog(root = document) {
  const list = root.querySelector('#resource-list, #resource-grid');
  if (!list) return;

  const searchInput = root.querySelector('#catalog-search');
  const searchForm = root.querySelector('[data-search-form]');
  const clearSearch = root.querySelector('[data-search-clear]');
  const summary = root.querySelector('#results-summary');
  const loadMore = root.querySelector('#load-more');
  const filterToggle = root.querySelector('[data-filter-toggle]');
  const filterPanel = root.querySelector('[data-filter-panel]');
  const filterButtons = [...root.querySelectorAll('[data-filter-dimension][data-filter-value]')];
  const legacyCollectionButtons = [...root.querySelectorAll('[data-collection]')];
  const activeFilterCount = root.querySelector('[data-active-filter-count]');
  const state = {
    query: '',
    collectionIds: [],
    scenarios: [],
    materialTypes: [],
    audiences: [],
    visibleLimit: PAGE_SIZE
  };

  let resources = [];
  try {
    const response = await fetch('data/resources.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    resources = await response.json();
  } catch (error) {
    list.setAttribute('aria-busy', 'false');
    list.innerHTML = '<div class="empty-state"><p>资料暂时没有加载成功，请稍后刷新页面。</p></div>';
    summary.textContent = '资料加载失败';
    console.error('Unable to load resource catalog', error);
    return;
  }

  for (const field of ['scenarios', 'materialType', 'audiences', 'collectionId']) {
    const counts = getFacetCounts(resources, field);
    for (const [value, count] of Object.entries(counts)) {
      const targets = root.querySelectorAll(`[data-count-facet="${field}"][data-count-value="${CSS.escape(value)}"]`);
      targets.forEach((target) => { target.textContent = String(count); });
    }
  }
  const collectionCounts = getFacetCounts(resources, 'collectionId');
  const allCount = root.querySelector('[data-count="all"]');
  if (allCount) allCount.textContent = String(resources.length);
  for (const [value, count] of Object.entries(collectionCounts)) {
    const target = root.querySelector(`[data-count="${value}"]`);
    if (target) target.textContent = String(count);
  }

  function selectedCount() {
    return state.collectionIds.length + state.scenarios.length + state.materialTypes.length + state.audiences.length;
  }

  function syncControls() {
    for (const button of filterButtons) {
      const dimension = button.dataset.filterDimension;
      const value = button.dataset.filterValue;
      const active = value === 'all' ? state[dimension].length === 0 : state[dimension].includes(value);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    const count = selectedCount();
    if (activeFilterCount) activeFilterCount.textContent = count > 0 ? String(count) : '';
    if (filterToggle) filterToggle.classList.toggle('has-active-filters', count > 0);
    for (const button of legacyCollectionButtons) {
      const value = button.dataset.collection;
      const active = value === 'all' ? state.collectionIds.length === 0 : state.collectionIds.includes(value);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
  }

  function render() {
    const filtered = filterResources(resources, state);
    const visible = getVisibleResources(filtered, state.visibleLimit);
    list.innerHTML = renderResourceList(visible);
    list.setAttribute('aria-busy', 'false');
    summary.textContent = renderResultsSummary({
      visible: visible.length,
      total: filtered.length,
      query: state.query
    });
    loadMore.hidden = visible.length >= filtered.length;
    if (!loadMore.hidden) loadMore.textContent = `再看 ${Math.min(PAGE_SIZE, filtered.length - visible.length)} 条`;
    clearSearch.hidden = state.query.length === 0;
    syncControls();
  }

  function resetFilters() {
    state.query = '';
    state.collectionIds = [];
    state.scenarios = [];
    state.materialTypes = [];
    state.audiences = [];
    state.visibleLimit = PAGE_SIZE;
    searchInput.value = '';
    if (filterPanel) filterPanel.hidden = true;
    if (filterToggle) filterToggle.setAttribute('aria-expanded', 'false');
    render();
    searchInput.focus();
  }

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    state.visibleLimit = PAGE_SIZE;
    render();
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchInput.blur();
    summary.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  clearSearch.addEventListener('click', () => {
    state.query = '';
    state.visibleLimit = PAGE_SIZE;
    searchInput.value = '';
    render();
    searchInput.focus();
  });

  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const dimension = button.dataset.filterDimension;
    const value = button.dataset.filterValue;
    state[dimension] = value === 'all' ? [] : toggleFacetSelection(state[dimension], value);
    state.visibleLimit = PAGE_SIZE;
    render();
  }));

  legacyCollectionButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.collection;
    state.collectionIds = value === 'all' ? [] : [value];
    state.visibleLimit = PAGE_SIZE;
    render();
  }));

  filterToggle?.addEventListener('click', () => {
    const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
    filterToggle.setAttribute('aria-expanded', String(!expanded));
    filterPanel.hidden = expanded;
  });

  root.querySelectorAll('[data-filter-reset]').forEach((button) => button.addEventListener('click', resetFilters));

  loadMore.addEventListener('click', () => {
    state.visibleLimit += PAGE_SIZE;
    render();
  });

  list.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-filters]')) resetFilters();
  });

  render();
}

if (typeof document !== 'undefined') initCatalog();
