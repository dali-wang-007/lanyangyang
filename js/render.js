export function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderMeta(resource) {
  const values = [resource.primaryScenario, resource.materialType, resource.audiences?.[0]].filter(Boolean);
  return `<span class="resource-item__meta">${values.map((value) => `<span>${escapeHtml(value)}</span>`).join('')}</span>`;
}

export function renderResourceItem(resource) {
  const title = escapeHtml(resource.title);
  const problem = resource.problem ? `<p class="resource-item__problem">${escapeHtml(resource.problem)}</p>` : '';
  return `<a class="resource-item" href="${escapeHtml(resource.url)}" target="_blank" rel="noopener noreferrer" aria-label="打开飞书资料：${title}">
  <span class="resource-item__content">
    <h3>${title}</h3>
    ${renderMeta(resource)}
    ${problem}
  </span>
  <span class="resource-item__open" aria-hidden="true">↗</span>
</a>`;
}

export function renderResourceList(resources) {
  if (!Array.isArray(resources) || resources.length === 0) {
    return `<div class="empty-state">
  <p>没有找到匹配的资料</p>
  <button class="button button--quiet" type="button" data-clear-filters>清除搜索和筛选</button>
</div>`;
  }
  return resources.map(renderResourceItem).join('\n');
}

export const renderResourceCard = renderResourceItem;
export const renderResourceGrid = renderResourceList;

export function renderResultsSummary({ visible, total, query }) {
  const prefix = query ? `“${escapeHtml(query)}”找到` : '找到';
  return `${prefix} ${total} 条资料，当前显示 ${visible} 条`;
}

function paginationItems(page, totalPages) {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const values = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...values].filter((value) => value >= 1 && value <= totalPages).sort((a, b) => a - b);
  return pages.flatMap((value, index) => {
    const previous = pages[index - 1];
    return previous && value - previous > 1 ? ['ellipsis', value] : [value];
  });
}

export function renderPagination({ page, totalPages }) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(safeTotal, Math.max(1, Number(page) || 1));
  if (safeTotal <= 1) return '';
  const pageButtons = paginationItems(safePage, safeTotal).map((value) => (
    value === 'ellipsis'
      ? '<span class="pagination__ellipsis" aria-hidden="true">…</span>'
      : `<button type="button" data-page="${value}"${value === safePage ? ' aria-current="page"' : ''} aria-label="第 ${value} 页">${value}</button>`
  )).join('');

  return `<nav class="pagination" aria-label="资料分页">
  <button type="button" data-page-step="-1" aria-label="上一页"${safePage === 1 ? ' disabled' : ''}>←</button>
  <span class="pagination__pages">${pageButtons}</span>
  <span class="pagination__status"><span data-page-current>${safePage}</span> / ${safeTotal}</span>
  <button type="button" data-page-step="1" aria-label="下一页"${safePage === safeTotal ? ' disabled' : ''}>→</button>
</nav>`;
}

function renderProductImage(image, className = '', { eager = false } = {}) {
  return `<img class="${className}" src="${escapeHtml(image.src)}" width="${escapeHtml(image.width)}" height="${escapeHtml(image.height)}" loading="${eager ? 'eager' : 'lazy'}"${eager ? ' fetchpriority="high"' : ''} alt="${escapeHtml(image.alt)}">`;
}

export function renderProductCard(product) {
  return `<article class="product-card" id="product-${escapeHtml(product.id)}">
  <a class="product-card__image" href="product.html?id=${encodeURIComponent(product.id)}" aria-label="查看产品：${escapeHtml(product.title)}">
    ${renderProductImage(product.cover, '', { eager: true })}
  </a>
  <div class="product-card__body">
    <p class="product-card__kicker">数字产品</p>
    <h3>${escapeHtml(product.title)}</h3>
    <p>${escapeHtml(product.summary)}</p>
    <a class="text-link" href="product.html?id=${encodeURIComponent(product.id)}">查看完整介绍 <span aria-hidden="true">→</span></a>
  </div>
</article>`;
}

export function renderProductShelf(products) {
  const items = products.map((product, index) => `<button class="product-shelf__item${index === 0 ? ' is-active' : ''}" type="button" data-product-select="${escapeHtml(product.id)}" aria-pressed="${index === 0}">
  <span>数字产品</span>
  <strong>${escapeHtml(product.title)}</strong>
</button>`).join('\n');
  return `${items}
<div class="product-shelf__coming" aria-label="更多产品正在整理中">
  <span aria-hidden="true">＋</span>
  <strong>更多产品</strong>
  <small>正在整理中</small>
</div>`;
}

function renderProductGallery(product, { inline = false } = {}) {
  const gallery = product.gallery.map((image, index) => `<figure class="product-gallery__image" data-gallery-image="${index}"${index === 0 ? '' : ' hidden'}>
    ${renderProductImage(image, '', { eager: index === 0 })}
  </figure>`).join('\n');
  const thumbs = product.gallery.map((image, index) => `<button type="button" data-gallery-thumb="${index}" data-gallery-dot="${index}" aria-label="查看第 ${index + 1} 张介绍图" aria-pressed="${index === 0}">
    ${renderProductImage(image, '', { eager: index === 0 })}
  </button>`).join('');
  return `<div class="product-gallery${inline ? ' product-gallery--inline' : ''}" data-gallery data-gallery-total="${product.gallery.length}">
    <div class="product-gallery__viewport">${gallery}</div>
    <div class="product-gallery__controls">
      <button type="button" data-gallery-step="-1" aria-label="上一张介绍图">←</button>
      <span class="product-gallery__thumbs">${thumbs}</span>
      <button type="button" data-gallery-step="1" aria-label="下一张介绍图">→</button>
    </div>
  </div>`;
}

export function renderProductShowcase(product) {
  const highlights = product.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  return `<article class="product-showcase" data-product-showcase="${escapeHtml(product.id)}">
  ${renderProductGallery(product, { inline: true })}
  <div class="product-showcase__copy">
    <p class="product-card__kicker">数字产品</p>
    <h3>${escapeHtml(product.title)}</h3>
    <p>${escapeHtml(product.summary)}</p>
    <ul class="product-showcase__highlights">${highlights}</ul>
    <a class="button button--primary" href="product.html?id=${encodeURIComponent(product.id)}">查看完整介绍 <span aria-hidden="true">→</span></a>
  </div>
</article>`;
}

export function renderProductDetail(product) {
  const highlights = product.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
  const channels = product.channels.map((channel) => `<a class="button button--primary" href="${escapeHtml(channel.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(channel.label)} <span aria-hidden="true">↗</span></a>`).join('');

  return `<div class="product-detail__layout">
  <div class="product-detail__copy">
    <p class="eyebrow">PM大力王的小产品</p>
    <h1>${escapeHtml(product.title)}</h1>
    <p class="product-detail__summary">${escapeHtml(product.summary)}</p>
    <p class="product-detail__audience">${escapeHtml(product.audience)}</p>
    <ul class="check-list">${highlights}</ul>
    <div class="product-detail__actions">${channels}</div>
  </div>
  ${renderProductGallery(product)}
</div>`;
}

export function getGalleryIndex(current, step, total) {
  if (!Number.isInteger(total) || total <= 0) return 0;
  return (current + step + total) % total;
}
