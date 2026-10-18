import {
  filterResources,
  getFacetCounts,
  paginateResources,
  toggleFacetSelection
} from './catalog.js';
import { renderPagination, renderResourceList, renderResultsSummary } from './render.js';

const PAGE_SIZE = 10;

export async function initCatalog(root = document) {
  const list = root.querySelector('#resource-list, #resource-grid');
  if (!list) return;

  const searchInput = root.querySelector('#catalog-search');
  const searchForm = root.querySelector('[data-search-form]');
  const clearSearch = root.querySelector('[data-search-clear]');
  const summary = root.querySelector('#results-summary');
  const pagination = root.querySelector('#resource-pagination');
  const filterToggle = root.querySelector('[data-filter-toggle]');
  const filterPanel = root.querySelector('[data-filter-panel]');
  const filterApply = root.querySelector('[data-filter-apply]');
  const selectedFilters = root.querySelector('[data-selected-filters]');
  const filterButtons = [...root.querySelectorAll('[data-filter-dimension][data-filter-value]')];
  const legacyCollectionButtons = [...root.querySelectorAll('[data-collection]')];
  const activeFilterCount = root.querySelector('[data-active-filter-count]');
  const state = {
    query: '',
    collectionIds: [],
    scenarios: [],
    materialTypes: [],
    audiences: [],
    page: 1
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
    if (selectedFilters) {
      const labels = [];
      for (const dimension of ['collectionIds', 'scenarios', 'materialTypes', 'audiences']) {
        for (const value of state[dimension]) {
          const source = filterButtons.find((button) => button.dataset.filterDimension === dimension && button.dataset.filterValue === value);
          labels.push(`<button type="button" data-remove-filter="${dimension}" data-remove-value="${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}">${source?.textContent.trim() || value}<span aria-hidden="true">×</span></button>`);
        }
      }
      selectedFilters.innerHTML = labels.join('');
      selectedFilters.hidden = labels.length === 0;
    }
  }

  function render() {
    const filtered = filterResources(resources, state);
    const pageResult = paginateResources(filtered, state.page, PAGE_SIZE);
    state.page = pageResult.page;
    list.innerHTML = renderResourceList(pageResult.items);
    list.setAttribute('aria-busy', 'false');
    summary.textContent = renderResultsSummary({
      visible: pageResult.items.length,
      total: filtered.length,
      query: state.query
    });
    pagination.innerHTML = renderPagination(pageResult);
    clearSearch.hidden = state.query.length === 0;
    if (filterApply) filterApply.textContent = `查看 ${filtered.length} 条资料`;
    syncControls();
  }

  function closeFilters() {
    if (!filterPanel) return;
    if (typeof filterPanel.close === 'function' && filterPanel.open) filterPanel.close();
    else filterPanel.removeAttribute('open');
    filterToggle?.setAttribute('aria-expanded', 'false');
  }

  function openFilters() {
    if (!filterPanel) return;
    if (typeof filterPanel.showModal === 'function') filterPanel.showModal();
    else filterPanel.setAttribute('open', '');
    filterToggle?.setAttribute('aria-expanded', 'true');
  }

  function resetFilters() {
    state.query = '';
    state.collectionIds = [];
    state.scenarios = [];
    state.materialTypes = [];
    state.audiences = [];
    state.page = 1;
    searchInput.value = '';
    closeFilters();
    render();
    searchInput.focus();
  }

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value.trim();
    state.page = 1;
    render();
  });

  searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    searchInput.blur();
    summary.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  clearSearch.addEventListener('click', () => {
    state.query = '';
    state.page = 1;
    searchInput.value = '';
    render();
    searchInput.focus();
  });

  filterButtons.forEach((button) => button.addEventListener('click', () => {
    const dimension = button.dataset.filterDimension;
    const value = button.dataset.filterValue;
    state[dimension] = value === 'all' ? [] : toggleFacetSelection(state[dimension], value);
    state.page = 1;
    render();
  }));

  legacyCollectionButtons.forEach((button) => button.addEventListener('click', () => {
    const value = button.dataset.collection;
    state.collectionIds = value === 'all' ? [] : [value];
    state.page = 1;
    render();
  }));

  filterToggle?.addEventListener('click', () => {
    const expanded = filterToggle.getAttribute('aria-expanded') === 'true';
    if (expanded) closeFilters();
    else openFilters();
  });

  root.querySelectorAll('[data-filter-close]').forEach((button) => button.addEventListener('click', closeFilters));
  filterApply?.addEventListener('click', () => {
    closeFilters();
    summary.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });
  filterPanel?.addEventListener('cancel', () => filterToggle?.setAttribute('aria-expanded', 'false'));
  filterPanel?.addEventListener('click', (event) => {
    if (event.target === filterPanel) closeFilters();
  });

  selectedFilters?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-remove-filter]');
    if (!button) return;
    state[button.dataset.removeFilter] = state[button.dataset.removeFilter].filter((value) => value !== button.dataset.removeValue);
    state.page = 1;
    render();
  });

  root.querySelectorAll('[data-filter-reset]').forEach((button) => button.addEventListener('click', resetFilters));

  pagination.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-page], button[data-page-step]');
    if (!button || button.disabled) return;
    state.page = button.dataset.page ? Number(button.dataset.page) : state.page + Number(button.dataset.pageStep);
    render();
    summary.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  });

  list.addEventListener('click', (event) => {
    if (event.target.closest('[data-clear-filters]')) resetFilters();
  });

  render();
}

if (typeof document !== 'undefined') initCatalog();
