import { escapeHtml } from './render.js';
import { initCarousels } from './carousel.js';

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
  import('./sloth-views.js?v=20261022-follow').then(async ({createSloth})=>{
    if(!await createSloth(mascot))document.querySelector('.mascot-hint').textContent='轻轻点我，打个招呼';
  }).catch(()=>{document.querySelector('.mascot-hint').textContent='轻轻点我，打个招呼';});
}

export function sortFeaturedItems(items) {
  return [...items].sort((a,b)=>(Number.isFinite(b.metricValue)?b.metricValue:-1)-(Number.isFinite(a.metricValue)?a.metricValue:-1));
}

export function previewClickAction(paused, sinceHover) {
  return paused ? 'play' : sinceHover < 300 ? 'keep' : 'pause';
}

export function openFullWork(event, open=(...args)=>window.open(...args)) {
  // Anchors already perform their native navigation; do not open a second tab.
  if(event.target.closest('a'))return;
  const card=event.target.closest('.work-card');
  const href=card?.querySelector('a.work-open')?.href;
  if(href&&/^https:\/\//i.test(href))open(href,'_blank','noopener,noreferrer');
}

export function renderFeatured(platform) {
  return sortFeaturedItems(platform.items).map((item, index) => {
    const pending = item.status === 'pending' || !item.url;
    const metadataPending = item.status === 'metadata-pending';
    const media = item.cover
      ? `<img src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title || platform.label)}封面" loading="eager" decoding="async" width="540" height="720">`
      : `<div class="cover-pending"><span aria-hidden="true">↗</span><strong>${metadataPending?'新分享':String(index+1).padStart(2,'0')}</strong><small>${metadataPending?'标题与封面待补充':'作品封面待补充'}</small></div>`;
    const preview = platform.id==='xiaohongshu' && item.preview && !pending ? `<video muted playsinline preload="none" data-preview-src="${escapeHtml(item.preview)}" aria-hidden="true"></video><button type="button" class="preview-control" aria-label="播放预览：${escapeHtml(item.title)}">▶</button><span class="preview-status" aria-live="polite"></span>` : '';
    const stats = item.stats?.length ? `<dl class="work-stats">${item.stats.map(stat=>`<div><dt>${escapeHtml(stat.label)}</dt>${stat.value===null?'<dd title="后台未提供该指标" aria-label="未提供">—</dd>':`<dd>${escapeHtml(String(stat.value))}</dd>`}</div>`).join('')}</dl>` : '';
    const title=escapeHtml(item.title || (platform.label+'精选作品 · 整理中'));
    const action=platform.id==='wechat'?'阅读完整文章':platform.id==='xiaohongshu'?'观看完整视频':'观看视频';
    return `<article class="work-card${pending ? ' work-placeholder' : ''}"><div class="work-media">${media}${preview}</div><div class="work-body"><div class="work-meta"><span>${pending||metadataPending ? '数据待补充' : escapeHtml(item.metricDisplay)+' '+escapeHtml(platform.metric)}</span></div><h3 title="${title}">${title}</h3>${stats}${pending ? '<span class="work-open work-open--pending">链接与数据待补充</span>' : `<a class="work-open" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${action} <span aria-hidden="true">↗</span></a>`}</div></article>`;
  }).join('');
}

function initPreviews(root) {
  const videos = [...root.querySelectorAll('video')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  videos.forEach(video => {
    const media = video.closest('.work-media'), button = media.querySelector('button'), status = media.querySelector('.preview-status');
    const card=media.closest('.work-card');
    let token=0,hoverStarted=-Infinity;
    const playLabel=button.getAttribute('aria-label');
    const stop = (complete=false) => {
      token++; video.pause(); media.classList.remove('is-playing');
      button.textContent = '▶';
      button.setAttribute('aria-label',playLabel);
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
        media.classList.add('is-playing'); button.textContent='Ⅱ';
        button.setAttribute('aria-label',playLabel.replace('播放','暂停'));
        button.setAttribute('aria-pressed','true'); status.textContent='';
      } catch { if(attempt===token) { stop(); status.textContent='预览暂不可用，可直接打开原视频'; } }
    }
    button.setAttribute('aria-pressed','false');
    button.addEventListener('click',()=>{
      const action=previewClickAction(video.paused,performance.now()-hoverStarted);
      if(action==='play')play();else if(action==='pause')stop();
    });
    card.addEventListener('pointerenter',event=>{
      if(event.pointerType==='mouse'&&!reduced.matches&&!navigator.connection?.saveData){hoverStarted=performance.now();play();}
    });
    card.addEventListener('pointerleave',()=>stop());
    video.addEventListener('stoppreview',()=>stop());
    video.addEventListener('ended',()=>stop(true));
    video.addEventListener('timeupdate',()=>{if(video.currentTime>=4.95)stop(true);});
    video.addEventListener('error',()=>{stop();status.textContent='预览暂不可用，可直接打开原视频';});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)stop();}).observe(media);
  });
}

export function renderPlatform(platform) {
  const label = escapeHtml(platform.label);
  const inside = '<span class="visit-pet" aria-hidden="true"><img src="assets/mascot/views/front.webp" alt="" width="1145" height="1374" loading="lazy"></span><span class="visit-label">看更多<span>去串门</span></span><span class="visit-arrow" aria-hidden="true">↗</span>';
  const classes = 'platform-more platform-more--sticker';
  const more = platform.profileUrl
    ? `<a class="${classes}" aria-label="去${label}主页看更多作品" href="${escapeHtml(platform.profileUrl)}" target="_blank" rel="noopener noreferrer">${inside}</a>`
    : `<button class="${classes}" aria-label="在微信查看${label}更多作品" type="button" data-wechat-kind="${label}">${inside}</button>`;
  const total = platform.totalLabel ? escapeHtml(platform.totalLabel) : platform.totalWorks == null ? '作品持续更新中' : `已发布 <strong>${platform.totalWorks}</strong> 篇`;
  const extras=(platform.additionalLinks||[]).map(link=>`<a class="supplemental-work" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)} <span aria-hidden="true">↗</span></a>`).join('');
  return `<section class="platform-section" id="works-${escapeHtml(platform.id)}" aria-labelledby="title-${escapeHtml(platform.id)}"><div class="platform-heading"><div class="platform-identity"><h3 id="title-${escapeHtml(platform.id)}">${label}</h3><p class="platform-total">${total}</p></div><div class="platform-actions">${more}</div></div><div class="work-grid">${renderFeatured(platform)}</div>${extras}</section>`;
}

export function renderPlatforms(platforms) {
  const order=['xiaohongshu','douyin','channels','wechat'];
  return [...platforms].sort((a,b)=>(order.indexOf(a.id)<0?99:order.indexOf(a.id))-(order.indexOf(b.id)<0?99:order.indexOf(b.id))).map(renderPlatform).join('');
}

async function initFeatured() {
  const panel = document.querySelector('#platform-works');
  if (!panel) return;
  try {
    const response = await fetch('data/featured-content.json?v=20261024-two-second');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    panel.innerHTML = renderPlatforms(data.platforms);
    panel.addEventListener('dblclick',openFullWork);
    initPreviews(panel);
    initCarousels(panel);
  } catch (error) {
    panel.innerHTML = '<p class="notice">作品暂时未加载成功，请稍后刷新。</p>';
    console.error('Unable to load featured content',error);
  }
}

function initWechat() {
  const dialog = document.querySelector('#wechat-dialog');
  if (!dialog) return;
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-wechat-kind]');
    if(!button)return;
    document.querySelector('#wechat-instructions').textContent = `打开微信，在搜一搜中搜索“PM大力王”，选择“${button.dataset.wechatKind}”找到我。`;
    dialog.showModal();
  });
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
  initCarousels();
  import('./studio-motion.js').then(m=>m.initStudioMotion());
}
