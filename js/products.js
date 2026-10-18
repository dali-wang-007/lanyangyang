import { getGalleryIndex, renderProductCard, renderProductDetail } from './render.js';

function setupGallery(root) {
  const gallery = root.querySelector('[data-gallery]');
  if (!gallery) return;
  const images = [...gallery.querySelectorAll('[data-gallery-image]')];
  const dots = [...gallery.querySelectorAll('[data-gallery-dot]')];
  let current = 0;

  function show(index) {
    current = getGalleryIndex(index, 0, images.length);
    images.forEach((image, imageIndex) => { image.hidden = imageIndex !== current; });
    dots.forEach((dot, dotIndex) => dot.setAttribute('aria-pressed', String(dotIndex === current)));
  }

  gallery.querySelectorAll('[data-gallery-step]').forEach((button) => button.addEventListener('click', () => {
    show(getGalleryIndex(current, Number(button.dataset.galleryStep), images.length));
  }));
  dots.forEach((dot) => dot.addEventListener('click', () => show(Number(dot.dataset.galleryDot))));

  let touchStartX = null;
  gallery.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0]?.clientX ?? null; }, { passive: true });
  gallery.addEventListener('touchend', (event) => {
    if (touchStartX === null) return;
    const distance = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    if (Math.abs(distance) >= 44) show(getGalleryIndex(current, distance < 0 ? 1 : -1, images.length));
    touchStartX = null;
  }, { passive: true });
}

export async function initProducts(root = document) {
  const list = root.querySelector('[data-product-list]');
  const detail = root.querySelector('[data-product-detail]');
  if (!list && !detail) return;

  try {
    const response = await fetch('data/products.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const products = await response.json();

    if (list) list.innerHTML = products.map(renderProductCard).join('\n');
    if (detail) {
      const requestedId = new URLSearchParams(location.search).get('id');
      const product = products.find((item) => item.id === requestedId) || products[0];
      if (!product) throw new Error('No product available');
      detail.innerHTML = renderProductDetail(product);
      document.title = `${product.title}｜懒羊羊`;
      setupGallery(detail);
    }
  } catch (error) {
    const target = detail || list;
    target.innerHTML = '<div class="empty-state"><p>产品介绍暂时没有加载成功，请稍后刷新页面。</p></div>';
    console.error('Unable to load products', error);
  }
}

if (typeof document !== 'undefined') initProducts();
