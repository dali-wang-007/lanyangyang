// Original procedural mesh. No rotating image planes: eyes, muzzle, head and
// limbs all have depth and move in one shared, lit three-dimensional scene.
import * as T from './vendor/three.module.min.js';
import {strandPoints} from './fur-groom.js';

export function createSloth(host) {
  let renderer;
  try {
    renderer = new T.WebGLRenderer({alpha:true, antialias:true, powerPreference:'low-power'});
  } catch { return null; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-hidden','true');
  renderer.domElement.className = 'sloth-canvas';
  host.append(renderer.domElement);
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(32,1,.1,40);
  camera.position.set(0,2.1,8.9); camera.lookAt(0,1.85,0);
  scene.add(new T.HemisphereLight(0xfff5e5,0x8b7962,3));
  const key=new T.DirectionalLight(0xffedd5,4.5); key.position.set(-3,5,5); scene.add(key);
  const rim=new T.DirectionalLight(0xffffff,3); rim.position.set(3,4,-3); scene.add(rim);
  const fill=new T.DirectionalLight(0xc8dded,1.2); fill.position.set(4,1,4); scene.add(fill);
  const root=new T.Group(); scene.add(root);
  const torso=new T.Group(); root.add(torso);
  const head=new T.Group(); head.position.set(0,2.85,.04); torso.add(head);
  const material=(color,roughness=.9)=>new T.MeshStandardMaterial({color,roughness});
  const brown=material('#89644a'), cream=material('#ebd8b9'), patch=material('#5a382b');
  const noseMat=material('#392b27',.42), eyeMat=material('#151410',.14);
  const sphere=new T.SphereGeometry(1,48,32);
  let seed=77;
  const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
  const normal=new T.Vector3();
  function ellipsoid(parent,mat,pos,scale,fur=0) {
    const group=new T.Group(); group.position.set(...pos); parent.add(group);
    const mesh=new T.Mesh(sphere,mat); mesh.scale.set(...scale); group.add(mesh);
    if(fur) {
      // Fine curved guard hairs over a dense undercoat, not rigid cone spikes.
      const count=Math.round(fur*(innerWidth<760?1.65:2.4));
      const positions=[],colors=[];
      const base=mat.color;
      const fine=scale[2]<.45;
      for(let i=0;i<count;i++){
        const y=rand()*2-1,a=rand()*Math.PI*2,r=Math.sqrt(1-y*y);
        const x=Math.cos(a)*r,z=Math.sin(a)*r;
        normal.set(x/scale[0],y/scale[1],z/scale[2]).normalize();
        const guard=rand()>.7;
        const length=(guard?.045+rand()*.05:.02+rand()*.025)*(fine?.45:1);
        const points=strandPoints([x*scale[0],y*scale[1],z*scale[2]],normal.toArray(),length,-length*(.25+rand()*.5));
        const light=.82+Math.max(0,normal.y)*.25+rand()*.14;
        for(let j=0;j<points.length-1;j++)for(const k of [j,j+1]){
          positions.push(...points[k]);
          const brightness=light*(.85+k*.075);
          colors.push(base.r*brightness,base.g*brightness,base.b*brightness);
        }
      }
      const geometry=new T.BufferGeometry();
      geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));
      geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));
      const hairs=new T.LineSegments(geometry,new T.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.34,depthWrite:false}));
      group.add(hairs);
    }
    return group;
  }
  ellipsoid(torso,brown,[0,1.25,0],[.7,1.12,.53],7000);
  ellipsoid(torso,cream,[0,1.26,.39],[.49,.8,.2],2200);
  const arms=[];
  for(const side of [-1,1]){
    const arm=ellipsoid(torso,brown,[side*.7,1.35,.03],[.25,.88,.28],1800);
    arm.rotation.z=side*.14; arms.push(arm);
    ellipsoid(torso,brown,[side*.34,.28,.1],[.27,.35,.4],1200);
    for(let i=0;i<3;i++){
      ellipsoid(torso,cream,[side*.34+(i-1)*.095,.14,.43],[.035,.055,.135]);
      ellipsoid(arm,cream,[(i-1)*.075,-.8,.09],[.028,.105,.035]);
    }
  }
  ellipsoid(head,brown,[0,0,0],[.94,.9,.75],9000);
  ellipsoid(head,cream,[0,-.06,.43],[.8,.7,.43],2500);
  for(const side of [-1,1]){
    const mask=ellipsoid(head,patch,[side*.4,.04,.75],[.29,.37,.1],500);
    mask.rotation.z=side*-.42;
    ellipsoid(head,cream,[side*.36,.12,.84],[.19,.205,.085]);
    const eye=ellipsoid(head,eyeMat,[side*.36,.12,.91],[.135,.155,.095]);
    ellipsoid(eye,material('#ffffff',.18),[-.034,.055,.073],[.033,.04,.015]);
    ellipsoid(eye,material('#ffffff',.18),[.037,-.03,.084],[.012,.013,.01]);
  }
  ellipsoid(head,cream,[0,-.22,.81],[.3,.21,.2],450);
  ellipsoid(head,noseMat,[0,-.065,1.01],[.155,.1,.095]);
  // Smile follows the curved surface of the muzzle, rather than a decal.
  const smile=new T.CatmullRomCurve3([
    new T.Vector3(-.19,-.28,.957), new T.Vector3(-.1,-.34,1.005),
    new T.Vector3(0,-.36,1.02),new T.Vector3(.1,-.34,1.005),
    new T.Vector3(.19,-.28,.957)
  ]);
  head.add(new T.Mesh(new T.TubeGeometry(smile,24,.015,8,false),noseMat));
  // Slightly swept crown tufts.
  for(let i=0;i<5;i++){
    const tuft=ellipsoid(head,brown,[(i-2)*.09,.84,0],[.09,.19,.1],140);
    tuft.rotation.z=-(i-2)*.15;
  }
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let tx=0,ty=0,visible=true,frame=0,last=0,waveUntil=0;
  const resize=()=>{
    const {width,height}=host.getBoundingClientRect();
    if(!width||!height)return;
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();
    renderer.render(scene,camera);
  };
  new ResizeObserver(resize).observe(host);
  function draw(now){
    frame=0;
    if(!visible||document.hidden)return;
    const dt=Math.min((now-last)/1000,.05)||.016;last=now;
    const t=now/1000;
    const s=1-Math.exp(-dt*7), b=1-Math.exp(-dt*3);
    torso.rotation.y+=(tx*.25-torso.rotation.y)*b;
    head.rotation.y+=(tx*.5-head.rotation.y)*s;
    head.rotation.x+=(ty*.15-head.rotation.x)*s;
    head.rotation.z=reduced.matches?0:Math.sin(t*.7)*.025;
    torso.position.y=reduced.matches?0:Math.sin(t*1.3)*.018;
    arms[1].rotation.z=now<waveUntil?-.75+Math.sin(t*12)*.16:.14;
    host.dataset.headYaw=head.rotation.y.toFixed(3);
    host.dataset.bodyYaw=torso.rotation.y.toFixed(3);
    renderer.render(scene,camera);
    if(!reduced.matches)frame=requestAnimationFrame(draw);
  }
  function start(){if(!frame&&visible&&!document.hidden)frame=requestAnimationFrame(draw);}
  function point(event){
    if(reduced.matches)return;
    const r=host.getBoundingClientRect();
    tx=T.MathUtils.clamp((event.clientX-r.left-r.width/2)/(innerWidth*.3),-1,1);
    ty=T.MathUtils.clamp((event.clientY-r.top-r.height*.3)/(innerHeight*.5),-1,1);
    start();
  }
  window.addEventListener('pointermove',point,{passive:true});
  host.addEventListener('pointerdown',point,{passive:true});
  host.addEventListener('click',()=>{waveUntil=performance.now()+1600;start();});
  document.documentElement.addEventListener('pointerleave',()=>{tx=ty=0;});
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)start();else{cancelAnimationFrame(frame);frame=0;}}).observe(host);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){cancelAnimationFrame(frame);frame=0;}else start();});
  reduced.addEventListener('change',()=>{tx=ty=0;head.rotation.set(0,0,0);torso.rotation.set(0,0,0);start();});
  renderer.domElement.addEventListener('webglcontextlost',event=>{
    event.preventDefault();cancelAnimationFrame(frame);frame=0;
    host.classList.remove('has-3d');host.dataset.renderMode='static';
  });
  renderer.domElement.addEventListener('webglcontextrestored',()=>{host.classList.add('has-3d');host.dataset.renderMode='mesh';resize();start();});
  host.classList.add('has-3d');host.dataset.renderMode='mesh';resize();start();
  return {head,torso,renderer};
}
