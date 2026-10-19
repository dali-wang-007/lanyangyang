import { escapeHtml } from './render.js';

export function eyeOffset(dx, dy, maxX, maxY) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x: 0, y: 0 };
  const strength = Math.min(1, length / 180);
  return { x: dx / length * maxX * strength, y: dy / length * maxY * strength };
}

function initMascot() {
  const mascot = document.querySelector('#mascot');
  if (!mascot) return;
  const eyes = [...mascot.querySelectorAll('.eye')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const note = document.querySelector('#mascot-note');
  const hint = document.querySelector('.mascot-hint');
  if (matchMedia('(pointer: coarse)').matches) hint.textContent = '轻轻点我，打个招呼';
  let point = null, frame = 0, visible = true;
  const reset = () => eyes.forEach(eye => { eye.style.setProperty('--eye-x', '0px'); eye.style.setProperty('--eye-y', '0px'); });
  function update() {
    frame = 0;
    if (!point || reduced.matches || !visible) return;
    eyes.forEach(eye => {
      const rect = eye.getBoundingClientRect();
      const offset = eyeOffset(point.x - rect.x - rect.width / 2, point.y - rect.y - rect.height / 2, rect.width * .13, rect.height * .10);
      eye.style.setProperty('--eye-x', `${offset.x.toFixed(2)}px`);
      eye.style.setProperty('--eye-y', `${offset.y.toFixed(2)}px`);
    });
  }
  window.addEventListener('pointermove', event => {
    point = {x: event.clientX, y: event.clientY};
    if (!frame && visible && !reduced.matches) frame = requestAnimationFrame(update);
  }, {passive: true});
  window.addEventListener('pointerdown', event => {
    point = {x: event.clientX, y: event.clientY}; update();
  }, {passive: true});
  document.documentElement.addEventListener('pointerleave', reset);
  reduced.addEventListener('change', reset);
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    mascot.style.animationPlayState = visible ? 'running' : 'paused';
    if (!visible) reset();
  }).observe(mascot);
  function blink() {
    if (visible && !document.hidden && !reduced.matches) {
      mascot.classList.add('is-blinking');
      setTimeout(() => mascot.classList.remove('is-blinking'), 250);
    }
  }
  setInterval(blink, 5700);
  const greetings = ['收到你的招呼啦。', '慢一点，也没关系。', '好东西，在下面。'];
  let greeting = 0, timer;
  mascot.addEventListener('click', () => {
    note.textContent = greetings[greeting++ % greetings.length];
    mascot.classList.add('is-greeting'); blink();
    clearTimeout(timer);
    timer = setTimeout(() => { mascot.classList.remove('is-greeting'); note.textContent = '嗨，慢慢逛。'; }, 2200);
  });
}

export function renderFeatured(platform) {
  return platform.items.map((item, index) => {
    if (item.status === 'pending' || !item.url) return `<article class="work-card work-placeholder"><span>0${index + 1}</span><h3>${escapeHtml(platform.label)}精选 · 待补充</h3><p>这篇作品的位置已留好，整理后见。</p></article>`;
    return `<a class="work-card" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer"><div class="work-art work-tone-${index}"><small>${escapeHtml(item.topic)}</small><strong>${escapeHtml(item.artTitle)}</strong><span class="work-glyph" aria-hidden="true">${escapeHtml(item.glyph)}</span></div><div class="work-meta"><span>${escapeHtml(platform.label)} / ${String(index+1).padStart(2,'0')}</span><span>${escapeHtml(item.metricDisplay)} ${escapeHtml(platform.metric)}</span></div><h3>${escapeHtml(item.title)}</h3><span class="work-open">打开原作品 <span aria-hidden="true">↗</span></span></a>`;
  }).join('');
}

async function initFeatured() {
  const panel = document.querySelector('#platform-works');
  if (!panel) return;
  try {
    const response = await fetch('data/featured-content.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const tabs = [...document.querySelectorAll('[data-platform]')];
    function show(id, focus = false) {
      const platform = data.platforms.find(item => item.id === id);
      if (!platform) return;
      panel.innerHTML = renderFeatured(platform);
      panel.setAttribute('aria-labelledby', `platform-${id}`);
      document.querySelector('#platform-note').textContent = platform.note;
      tabs.forEach(tab => {
        const selected = tab.dataset.platform === id;
        tab.setAttribute('aria-selected', String(selected)); tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
      });
    }
    tabs.forEach((tab,index) => {
      tab.addEventListener('click', () => show(tab.dataset.platform));
      tab.addEventListener('keydown', event => {
        const next = {ArrowRight:(index+1)%tabs.length,ArrowLeft:(index+tabs.length-1)%tabs.length,Home:0,End:tabs.length-1}[event.key];
        if (next === undefined) return;
        event.preventDefault(); show(tabs[next].dataset.platform,true);
      });
    });
    show('douyin');
  } catch (error) {
    panel.innerHTML = '<p class="notice">作品暂时未加载成功，请稍后刷新。</p>';
    console.error('Unable to load featured content',error);
  }
}

function initWechat() {
  const dialog = document.querySelector('#wechat-dialog');
  if (!dialog) return;
  document.querySelectorAll('[data-wechat-kind]').forEach(button => button.addEventListener('click', () => {
    document.querySelector('#wechat-instructions').textContent = `打开微信，在搜一搜中搜索“PM大力王”，选择“${button.dataset.wechatKind}”找到我。`;
    dialog.showModal();
  }));
  dialog.querySelector('[data-wechat-close]').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  dialog.querySelector('[data-copy-account]').addEventListener('click', async () => {
    const feedback = document.querySelector('#social-feedback');
    try { await navigator.clipboard.writeText('PM大力王'); feedback.textContent = '已复制：PM大力王'; }
    catch { feedback.textContent = '请在微信搜索：PM大力王'; }
    feedback.hidden = false;
    setTimeout(()=>{feedback.hidden=true;},3000);
  });
}

if (typeof document !== 'undefined') {
  const header = document.querySelector('.site-header');
  const updateHeader = () => header?.classList.toggle('is-scrolled', window.scrollY > 70);
  window.addEventListener('scroll',updateHeader,{passive:true}); updateHeader();
  initMascot(); initFeatured(); initWechat();
}
