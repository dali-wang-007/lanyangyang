export function initStudioMotion(){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(hover: hover) and (pointer: fine)');
  let active=null,frame=0;
  document.addEventListener('pointermove',event=>{
    if(reduced.matches||!fine.matches)return;
    const card=event.target.closest('.work-card,.open-tools-grid a');
    if(active&&active!==card)reset(active);
    active=card;if(!card||frame)return;
    const {clientX,clientY}=event;
    frame=requestAnimationFrame(()=>{
      frame=0;
      const r=card.getBoundingClientRect(),x=(clientX-r.left)/r.width,y=(clientY-r.top)/r.height;
      card.style.setProperty('--rx',`${(y-.5)*-7}deg`);
      card.style.setProperty('--ry',`${(x-.5)*9}deg`);
      card.style.setProperty('--glow-x',`${x*100}%`);
      card.style.setProperty('--glow-y',`${y*100}%`);
    });
  },{passive:true});
  function reset(el){el.style.removeProperty('--rx');el.style.removeProperty('--ry');}
  document.addEventListener('pointerout',event=>{
    const card=event.target.closest('.work-card,.open-tools-grid a');
    if(card&&!card.contains(event.relatedTarget)){reset(card);if(active===card)active=null;}
  });
  reduced.addEventListener('change',()=>{if(active)reset(active);});
  document.addEventListener('click',event=>{
    if(reduced.matches)return;
    const button=event.target.closest('.button,.filter-chip,.social-link,.header-contact');
    if(!button)return;
    button.animate([{scale:1},{scale:.94},{scale:1.035},{scale:1}],{duration:330,easing:'ease-out'});
  });
  // Discoverability uses actual catalog titles; selecting one runs the real search.
  const rail=document.querySelector('#resource-discovery-items');
  if(!rail)return;
  fetch('data/resources.json').then(r=>r.json()).then(items=>{
    const titles=items.filter(x=>x.title).slice(0,7).map(x=>x.title);
    for(const title of titles){
      const button=document.createElement('button');button.type='button';button.textContent=title;
      button.addEventListener('click',()=>{
        const input=document.querySelector('#catalog-search');
        input.value=title;input.dispatchEvent(new Event('input',{bubbles:true}));input.focus({preventScroll:true});
      });
      rail.append(button);
    }
  }).catch(()=>{document.querySelector('.resource-discovery').hidden=true;});
  const pause=document.querySelector('.discovery-pause');
  pause.addEventListener('click',()=>{
    const paused=pause.getAttribute('aria-pressed')!=='true';
    pause.setAttribute('aria-pressed',String(paused));
    pause.setAttribute('aria-label',paused?'继续资料标题滚动':'暂停资料标题滚动');
    pause.textContent=paused?'▷':'Ⅱ';
    rail.classList.toggle('is-paused',paused);
  });
}
