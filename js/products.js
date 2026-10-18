import {
  getGalleryIndex,
  renderProductCard,
  renderProductDetail,
  renderProductShelf,
  renderProductShowcase
} from './render.js';

function setupGallery(root) {
  root.querySelectorAll('[data-gallery]').forEach((gallery) => {
  const images = [...gallery.querySelectorAll('[data-gallery-image]')];
  const controls = [...gallery.querySelectorAll('[data-gallery-dot]')];
  let current = 0;

  function show(index) {
    current = getGalleryIndex(index, 0, images.length);
    images.forEach((image, imageIndex) => { image.hidden = imageIndex !== current; });
    controls.forEach((control, controlIndex) => control.setAttribute('aria-pressed', String(controlIndex === current)));
  }

  gallery.querySelectorAll('[data-gallery-step]').forEach((button) => button.addEventListener('click', () => {
    show(getGalleryIndex(current, Number(button.dataset.galleryStep), images.length));
  }));
  controls.forEach((control) => control.addEventListener('click', () => show(Number(control.dataset.galleryDot))));

  let touchStartX = null;
  gallery.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
  gallery.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    if (Math.abs(distance) >= 44) show(getGalleryIndex(current, distance < 0 ? 1 : -1, images.length));
    touchStartX = null;
  }, { passive: true });
  });
}

export async function initProducts(root = document) {
  const list = root.querySelector('[data-product-list]');
  const shelf = root.querySelector('[data-product-shelf]');
  const showcase = root.querySelector('[data-product-showcase]');
  const detail = root.querySelector('[data-product-detail]');
  if (!list && !shelf && !showcase && !detail) return;

  try {
    const response = await fetch('data/products.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();

    if (list) list.innerHTML = products.map(renderProductCard).join('\n');
    if (shelf) shelf.innerHTML = renderProductShelf(products);
    if (showcase && products[0]) {
      showcase.innerHTML = renderProductShowcase(products[0]);
      setupGallery(showcase);
    }
    shelf?.addEventListener('click', (event) => {
      const button = event.target.closest('[data-product-select]');
      if (!button || !showcase) return;
      const product = products.find((item) => item.id === button.dataset.productSelect);
      if (!product) return;
      shelf.querySelectorAll('[data-product-select]').forEach((item) => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      showcase.innerHTML = renderProductShowcase(product);
      setupGallery(showcase);
    });
    if (detail) {
      const requestedId = new URLSearchParams(location.search).get('id');
      const product = products.find((item) => item.id === requestedId) || products[0];
      if (!product) throw new Error('No product available');
      detail.innerHTML = renderProductDetail(product);
      document.title = `${product.title}｜PM大力王`;
      setupGallery(detail);
    }
  } catch (error) {
    const target = detail || showcase || shelf || list;
    target.innerHTML = '<div class="empty-state"><p>产品介绍暂时没有加载成功，请稍后刷新页面。</p></div>';
    console.error('Unable to load products', error);
  }
}

if (typeof document !== 'undefined') initProducts();
