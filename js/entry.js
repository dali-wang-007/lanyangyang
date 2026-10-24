import {entryState} from './hero-type-motion.js?v=20261024-playful';

const overlay=document.querySelector('#entry');
if(overlay&&document.documentElement.classList.contains('entry-active')){
  const bar=overlay.querySelector('progress');
  const start=performance.now();
  const background=[...document.body.children].filter(el=>el!==overlay&&el.matches('header,main,footer,aside,.skip-link'));
  background.forEach(el=>{if(!el.inert){el.inert=true;el.dataset.entryInert='';}});
  overlay.setAttribute('role','dialog');
  overlay.setAttribute('aria-modal','true');
  overlay.tabIndex=-1;
  overlay.focus({preventScroll:true});
  let finished=false,frame,keyboardUsed=false;
  const finish=()=>{
    if(finished)return;
    finished=true;cancelAnimationFrame(frame);
    document.documentElement.classList.remove('entry-active');
    background.forEach(el=>{if('entryInert' in el.dataset){el.inert=false;delete el.dataset.entryInert;}});
    overlay.classList.add('entry-leaving');
    const hadFocus=overlay.contains(document.activeElement);
    overlay.inert=true;
    setTimeout(()=>{overlay.hidden=true;if(hadFocus&&keyboardUsed)document.querySelector('.brand')?.focus({preventScroll:true});},240);
  };
  overlay.addEventListener('keydown',e=>{keyboardUsed=true;if(e.key==='Tab'){e.preventDefault();overlay.focus();}});
  const tick=()=>{
    const state=entryState(performance.now()-start);
    bar.value=state.progress;
    if(state.done)finish();else frame=requestAnimationFrame(tick);
  };
  tick();setTimeout(finish,3000);
}else if(overlay)overlay.hidden=true;
