export function carouselTargets(offsets, maxScroll) {
  return offsets.map(offset => Math.max(0, Math.min(offset, Math.max(0, maxScroll))));
}

export function nearestSlide(position, targets) {
  return targets.reduce((best, target, index) =>
    Math.abs(target - position) < Math.abs(targets[best] - position) ? index : best, 0);
}

// Native scrolling preserves touch momentum; dots are navigation, not a slideshow.
export function initCarousels(root = document) {
  root.querySelectorAll('.work-grid,.open-tools-grid,.mobile-product-track').forEach(track => {
    if (track.dataset.carouselReady) return;
    const slides = [...track.children];
    if (slides.length < 2) return;
    track.dataset.carouselReady = 'true';
    const label = track.closest('.platform-section')?.querySelector('h3')?.textContent ||
      (track.classList.contains('open-tools-grid') ? '小工具' : '产品');
    const controls = document.createElement('div');
    controls.className = 'carousel-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `${label}横向浏览`);
    const dots = slides.map((slide, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'carousel-dot';
      button.setAttribute('aria-label', `${label}：第 ${index + 1} 项，共 ${slides.length} 项`);
      button.addEventListener('click', () => go(index));
      controls.append(button);
      return button;
    });
    const count = document.createElement('span');
    count.className = 'carousel-count';
    count.setAttribute('aria-hidden', 'true');
    controls.append(count);
    track.after(controls);
    const mobile = matchMedia('(max-width: 760px)');
    let targets = [], frame = 0;
    function update() {
      frame = 0;
      const current = nearestSlide(track.scrollLeft, targets);
      dots.forEach((dot, index) => dot.setAttribute('aria-pressed', String(index === current)));
      count.textContent = `${current + 1} / ${slides.length}`;
    }
    function measure() {
      const origin = slides[0].getBoundingClientRect().left;
      targets = carouselTargets(slides.map(slide => slide.getBoundingClientRect().left - origin), track.scrollWidth - track.clientWidth);
      track.tabIndex = mobile.matches ? 0 : -1;
      track.setAttribute('aria-label', `${label}，左右滑动查看更多`);
      update();
    }
    function go(index) {
      track.scrollTo({left: targets[index], behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
    }
    track.addEventListener('scroll', () => { if (!frame) frame = requestAnimationFrame(update); }, {passive: true});
    track.addEventListener('keydown', event => {
      if (event.target !== track || !mobile.matches || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const current = nearestSlide(track.scrollLeft, targets);
      go(event.key === 'Home' ? 0 : event.key === 'End' ? slides.length - 1 : Math.max(0, Math.min(slides.length - 1, current + (event.key === 'ArrowRight' ? 1 : -1))));
    });
    new ResizeObserver(measure).observe(track);
    mobile.addEventListener('change', measure);
    measure();
  });
}
