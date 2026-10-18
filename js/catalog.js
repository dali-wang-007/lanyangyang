const SEARCH_FIELDS = [
  ['title', 12],
  ['primaryScenario', 7],
  ['scenarios', 6],
  ['scenario', 5],
  ['problem', 4],
  ['materialType', 3],
  ['audiences', 3],
  ['tags', 2],
  ['collectionLabel', 1]
];

export function normalizeSearchText(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .normalize('NFKC')
    .toLocaleLowerCase('zh-CN')
    .replace(/\s+/gu, ' ')
    .trim();
}

function fieldText(resource, field) {
  const value = resource?.[field];
  return normalizeSearchText(Array.isArray(value) ? value.join(' ') : value);
}

function matchesAny(resourceValues, selectedValues) {
  if (!Array.isArray(selectedValues) || selectedValues.length === 0) return true;
  const values = Array.isArray(resourceValues) ? resourceValues : [resourceValues];
  return selectedValues.some((selected) => values.includes(selected));
}

function searchScore(resource, terms) {
  if (terms.length === 0) return 0;
  const searchable = SEARCH_FIELDS.map(([field]) => fieldText(resource, field)).join(' ');
  if (!terms.every((term) => searchable.includes(term))) return -1;

  return terms.reduce((total, term) => {
    const bestFieldWeight = SEARCH_FIELDS.reduce((best, [field, weight]) => (
      fieldText(resource, field).includes(term) ? Math.max(best, weight) : best
    ), 0);
    return total + bestFieldWeight;
  }, 0);
}

export function filterResources(resources, {
  query = '',
  collectionId = 'all',
  collectionIds = [],
  scenarios = [],
  materialTypes = [],
  audiences = []
} = {}) {
  if (!Array.isArray(resources)) return [];
  const normalizedQuery = normalizeSearchText(query);
  const terms = normalizedQuery ? normalizedQuery.split(' ') : [];
  const selectedCollections = collectionIds.length > 0
    ? collectionIds
    : collectionId === 'all' ? [] : [collectionId];

  return resources
    .map((resource, index) => ({ resource, index, score: searchScore(resource, terms) }))
    .filter(({ resource, score }) => (
      score >= 0
      && matchesAny(resource.collectionId, selectedCollections)
      && matchesAny(resource.scenarios, scenarios)
      && matchesAny(resource.materialType, materialTypes)
      && matchesAny(resource.audiences, audiences)
    ))
    .sort((a, b) => terms.length > 0 ? b.score - a.score || a.index - b.index : a.index - b.index)
    .map(({ resource }) => resource);
}

export function getCollectionCounts(resources) {
  return (Array.isArray(resources) ? resources : []).reduce(
    (counts, resource) => {
      counts.all += 1;
      counts[resource.collectionId] = (counts[resource.collectionId] || 0) + 1;
      return counts;
    },
    { all: 0 }
  );
}

export function getFacetCounts(resources, field) {
  return (Array.isArray(resources) ? resources : []).reduce((counts, resource) => {
    const raw = resource?.[field];
    const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
    for (const value of new Set(values)) counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

export function toggleFacetSelection(selectedValues, value) {
  const values = Array.isArray(selectedValues) ? [...selectedValues] : [];
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function getVisibleResources(resources, limit = 30) {
  if (!Array.isArray(resources) || !Number.isFinite(limit) || limit <= 0) return [];
  return resources.slice(0, Math.floor(limit));
}
