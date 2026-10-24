// Deliberately independent of the mascot renderer: typography never swaps its art.
export function entryState(elapsed) {
  const progress=Math.floor(Math.max(0,Math.min(3000,elapsed))/30);
  return {progress,done:elapsed>=3000};
}
export function titleOffset(x, y, rect) {
  const clamp = n => Math.max(-1, Math.min(1, n));
  if (!(rect.width > 0 && rect.height > 0)) return {x:0,y:0};
  return {x:clamp((x-rect.left)/rect.width*2-1)*5, y:clamp((y-rect.top)/rect.height*2-1)*4};
}

export function initTitleMotion() {
  const hero=document.querySelector('.hero');
  const title=hero?.querySelector('.breathe-title');
  if(!title)return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const fine=matchMedia('(pointer: fine)');
  const set=({x,y})=>{title.style.setProperty('--look-x',`${x}px`);title.style.setProperty('--look-y',`${y}px`);};
  const reset=()=>set({x:0,y:0});
  hero.addEventListener('pointermove',event=>{
    if(reduced.matches||!fine.matches||event.pointerType!=='mouse')return;
    set(titleOffset(event.clientX,event.clientY,hero.getBoundingClientRect()));
  },{passive:true});
  hero.addEventListener('pointerleave',reset);
  reduced.addEventListener('change',reset);
  fine.addEventListener('change',reset);
}
if(typeof document!=='undefined')initTitleMotion();
