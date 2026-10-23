import {entryState} from './hero-type-motion.js?v=20261023-full';

const overlay=document.querySelector('#entry');
if(overlay&&document.documentElement.classList.contains('entry-active')){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const bar=overlay.querySelector('progress');
  const start=performance.now();
  const background=[...document.body.children].filter(el=>el!==overlay&&el.matches('header,main,footer,aside,.skip-link'));
  background.forEach(el=>{if(!el.inert){el.inert=true;el.dataset.entryInert='';}});
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.querySelector('button').focus({preventScroll:true});
  let finished=false,frame;
  const finish=()=>{
    if(finished)return;
    finished=true;cancelAnimationFrame(frame);
    document.documentElement.classList.remove('entry-active');
    background.forEach(el=>{if('entryInert' in el.dataset){el.inert=false;delete el.dataset.entryInert;}});
    overlay.classList.add('entry-leaving');
    const hadFocus=overlay.contains(document.activeElement);
    overlay.inert=true;
    setTimeout(()=>{overlay.hidden=true;if(hadFocus)document.querySelector('.brand')?.focus({preventScroll:true});},300);
  };
  overlay.querySelector('button').addEventListener('click',finish);
  overlay.addEventListener('keydown',e=>{if(e.key==='Escape')finish();if(e.key==='Tab'){e.preventDefault();overlay.querySelector('button').focus();}});
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
  const tick=()=>{
    const state=entryState(performance.now()-start,reduced.matches);
    bar.value=state.progress;
    if(state.done)finish();else frame=requestAnimationFrame(tick);
  };
  tick();setTimeout(finish,3000);
}else if(overlay)overlay.hidden=true;
