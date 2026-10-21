import { escapeHtml } from './render.js';

export function eyeOffset(dx, dy, maxX, maxY) {
  const length = Math.hypot(dx, dy);
  if (!length) return { x: 0, y: 0 };
  const strength = Math.min(1, length / 180);
  return { x: dx / length * maxX * strength, y: dy / length * maxY * strength };
}

function initMascot() {
  const mascot=document.querySelector('#mascot');
  if(!mascot)return;
  const note=document.querySelector('#mascot-note');
  if(matchMedia('(pointer: coarse)').matches)document.querySelector('.mascot-hint').textContent='轻轻点我，打个招呼';
  const greetings=['收到你的招呼啦。','慢一点，也没关系。','好东西，在下面。'];
  let count=0,timer;
  mascot.addEventListener('click',()=>{
    note.textContent=greetings[count++%greetings.length];
    clearTimeout(timer);timer=setTimeout(()=>note.textContent='嗨，慢慢逛。',2200);
  });
  import('./sloth-3d.js').then(({createSloth})=>{
    if(!createSloth(mascot))document.querySelector('.mascot-hint').textContent='轻轻点我，打个招呼';
  }).catch(()=>{document.querySelector('.mascot-hint').textContent='轻轻点我，打个招呼';});
}

export function renderFeatured(platform) {
  return platform.items.map((item, index) => {
    const pending = item.status === 'pending' || !item.url;
    const media = item.cover
      ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title || platform.label)}封面" loading="eager" decoding="async" width="540" height="720">`
      : `<div class="cover-pending"><span>${escapeHtml(platform.label)}</span><strong>${String(index+1).padStart(2,'0')}</strong><small>作品封面待补充</small></div>`;
    const preview = item.preview && !pending ? `<video muted playsinline preload="none" data-preview-src="${escapeHtml(item.preview)}" aria-hidden="true"></video><button type="button" class="preview-control" aria-label="预览前5秒：${escapeHtml(item.title)}">预览 5 秒</button><span class="preview-status" aria-live="polite"></span>` : '';
    return `<article class="work-card${pending ? ' work-placeholder' : ''}"><div class="work-media">${media}${preview}</div><div class="work-body"><div class="work-meta"><span>${escapeHtml(platform.label)} / ${String(index+1).padStart(2,'0')}</span><span>${pending ? '待补充' : escapeHtml(item.metricDisplay)+' '+escapeHtml(platform.metric)}</span></div><h3>${escapeHtml(item.title || (platform.label+'精选作品 · 整理中'))}</h3>${pending ? '<span class="work-open work-open--pending">链接与数据待补充</span>' : `<a class="work-open" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">观看完整${platform.id==='wechat'?'文章':'视频'} <span aria-hidden="true">↗</span></a>`}</div></article>`;
  }).join('');
}

function initPreviews(root) {
  const videos = [...root.querySelectorAll('video')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  videos.forEach(video => {
    const media = video.closest('.work-media'), button = media.querySelector('button'), status = media.querySelector('.preview-status');
    let token=0;
    const stop = (complete=false) => {
      token++; video.pause(); media.classList.remove('is-playing');
      button.textContent = complete ? '重播 5 秒' : '预览 5 秒';
      button.setAttribute('aria-pressed','false');
      status.textContent = complete ? '预览结束，点击下方观看完整视频 ↗' : '';
    };
    async function play() {
      videos.filter(other=>other!==video).forEach(other=>other.dispatchEvent(new Event('stoppreview')));
      if(!video.src) { video.src=video.dataset.previewSrc; video.load(); }
      const attempt=++token;
      video.currentTime=0;
      try {
        await video.play();
        if(attempt!==token) { video.pause(); return; }
        media.classList.add('is-playing'); button.textContent='暂停预览';
        button.setAttribute('aria-pressed','true'); status.textContent='';
      } catch { if(attempt===token) { stop(); status.textContent='预览暂不可用，可直接打开原视频'; } }
    }
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>video.paused ? play() : stop());
    media.addEventListener('pointerenter',event=>{
      if(event.pointerType==='mouse'&&!reduced.matches&&!navigator.connection?.saveData) play();
    });
    media.addEventListener('pointerleave',()=>stop());
    video.addEventListener('stoppreview',()=>stop());
    video.addEventListener('ended',()=>stop(true));
    video.addEventListener('timeupdate',()=>{if(video.currentTime>=4.95)stop(true);});
    video.addEventListener('error',()=>{stop();status.textContent='预览暂不可用，可直接打开原视频';});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(media);
  });
}

async function initFeatured() {
  const panel = document.querySelector('#platform-works');
  if (!panel) return;
  try {
    const response = await fetch('data/featured-content.json?v=20261020-studio');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    panel.innerHTML = data.platforms.map(platform=>`<section class="platform-section" id="works-${escapeHtml(platform.id)}" aria-labelledby="title-${escapeHtml(platform.id)}"><div class="platform-heading"><h3 id="title-${escapeHtml(platform.id)}">${escapeHtml(platform.label)}</h3><p>已发布 <strong>${platform.totalWorks ?? '待补充'}</strong>${platform.totalWorks===null?'':' 篇'}${platform.totalObservedAt ? ` <small>截至 ${escapeHtml(platform.totalObservedAt)}</small>` : ''}</p></div><p class="platform-note">${escapeHtml(platform.note)}</p><div class="work-grid">${renderFeatured(platform)}</div></section>`).join('');
    initPreviews(panel);
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

function initReveals() {
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  if(reduced.matches || !('IntersectionObserver' in window))return;
  const seen=new WeakSet();
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
    if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}
  }),{threshold:.08,rootMargin:'0px 0px 30px 0px'});
  function collect(){
    document.querySelectorAll('.section-heading,.open-tools-grid a,.about-layout,.product-showcase').forEach(el=>{
      if(seen.has(el))return;
      seen.add(el);el.classList.add('reveal-ready');observer.observe(el);
    });
  }
  collect();
  new MutationObserver(collect).observe(document.querySelector('main'),{childList:true,subtree:true});
  reduced.addEventListener('change',()=>{if(reduced.matches)document.querySelectorAll('.reveal-ready').forEach(el=>el.classList.add('is-revealed'));});
}

if (typeof document !== 'undefined') {
  const header = document.querySelector('.site-header');
  let scrolling=false;
  const updateHeader = () => {
    scrolling=false; header?.classList.toggle('is-scrolled', window.scrollY > 70);
    const distance=document.documentElement.scrollHeight-innerHeight;
    const progress=distance>0?Math.max(0,Math.min(100,scrollY/distance*100)):0;
    const fill=document.querySelector('#reading-fill'),percent=document.querySelector('#reading-percent');
    if(fill)fill.style.transform=`scaleY(${progress/100})`;
    if(percent)percent.textContent=`${Math.round(progress)}%`;
    const nav=[...document.querySelectorAll('.site-nav a')];
    let active=null;
    nav.forEach(link=>{if(document.querySelector(link.hash)?.getBoundingClientRect().top<=180)active=link;});
    nav.forEach(link=>{if(link===active)link.setAttribute('aria-current','location');else link.removeAttribute('aria-current');});
  };
  window.addEventListener('scroll',()=>{if(!scrolling){scrolling=true;requestAnimationFrame(updateHeader);}},{passive:true});
  window.addEventListener('resize',updateHeader);
  new ResizeObserver(updateHeader).observe(document.body); updateHeader();
  initMascot(); initFeatured(); initWechat(); initReveals();
  import('./studio-motion.js').then(m=>m.initStudioMotion());
}
