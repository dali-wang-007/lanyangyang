import * as T from './vendor/three.module.min.js';
import { selectViews } from './sloth-view-state.js';

const asset = name => new URL(`../assets/mascot/views/${name}`, import.meta.url).href;
const names = ['left', 'left-mid', 'front', 'right-mid', 'right'];

// Image-based view interpolation, NOT a replacement low-poly character.
// The body is always the approved front image; optical flow aligns the head's
// eyes, nose and fur before blending adjacent generated yaw keyframes.
const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D viewA, viewB, original, flowAB, flowBA;
  uniform float blend, pitch;
  vec2 motion(sampler2D field, vec2 uv) {
    return (texture2D(field, uv).rg * 2.0 - 1.0) * 0.25;
  }
  vec4 premul(vec4 c) { return vec4(c.rgb * c.a, c.a); }
  void main() {
    vec2 uv = vUv;
    float head = smoothstep(0.55, 0.62, uv.y);
    uv.y -= pitch * 0.006 * head;
    vec2 a = uv, b = uv;
    for (int i = 0; i < 4; i++) {
      a = uv - blend * motion(flowAB, a);
      b = uv - (1.0 - blend) * motion(flowBA, b);
    }
    vec4 turned = mix(premul(texture2D(viewA, a)), premul(texture2D(viewB, b)), blend);
    // An exact keyframe must be sampled exactly, without flow rounding drift.
    if (blend < 0.00001) turned = premul(texture2D(viewA, uv));
    vec4 base = premul(texture2D(original, vUv));
    vec4 color = mix(base, turned, head);
    gl_FragColor = vec4(color.rgb / max(color.a, 0.00001), color.a);
  }
`;

export async function createSloth(element) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  element.dataset.headYaw = '0.000';
  element.dataset.bodyYaw = '0.000';
  element.dataset.renderMode = 'image';
  // No animation or WebGL/download cost when motion has been disabled.
  if (reduced.matches || navigator.connection?.saveData) return true;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' });
  } catch { return false; }
  const textures = [];
  let disposed = false, raf = 0, observer, resizeObserver;
  const controller = new AbortController();
  const listen = (target, name, callback, options = {}) => target.addEventListener(name, callback, { ...options, signal: controller.signal });
  let geometry, material;
  function fallback() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    controller.abort(); observer?.disconnect(); resizeObserver?.disconnect();
    element.classList.remove('has-views');
    element.dataset.renderMode = 'image';
    element.dataset.headYaw = '0.000';
    element.dataset.bodyYaw = '0.000';
    renderer.domElement.remove();
    textures.forEach(texture => texture.dispose());
    geometry?.dispose(); material?.dispose(); renderer.dispose();
  }
  const loader = new T.TextureLoader();
  const texture = async name => {
    const value = await loader.loadAsync(asset(name));
    if (disposed) { value.dispose(); throw new Error('Mascot loading cancelled'); }
    value.colorSpace = T.NoColorSpace; // Shader preserves source sRGB bytes.
    value.minFilter = T.LinearFilter; value.magFilter = T.LinearFilter;
    value.generateMipmaps = false;
    textures.push(value);
    return value;
  };
  try {
    const [views, fields] = await Promise.all([
      Promise.all(names.map(name => texture(`${name}.webp`))),
      Promise.all(Array.from({ length: 4 }, (_, i) => Promise.all([
        texture(`flow-${i}-forward.png`), texture(`flow-${i}-backward.png`)
      ])))
    ]);
    if (disposed) return false;
    const scene = new T.Scene(), camera = new T.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
    camera.position.z = 1;
    geometry = new T.PlaneGeometry(1, 1);
    material = new T.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      uniforms: {
        viewA: { value: views[2] }, viewB: { value: views[2] }, original: { value: views[2] },
        flowAB: { value: fields[2][0] }, flowBA: { value: fields[2][1] },
        blend: { value: 0 }, pitch: { value: 0 }
      },
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader
    });
    const plane = new T.Mesh(geometry, material); scene.add(plane);
    const canvas = renderer.domElement;
    canvas.className = 'sloth-canvas'; canvas.setAttribute('aria-hidden', 'true');
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setClearColor(0, 0); renderer.toneMapping = T.NoToneMapping;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(Math.max(1, width), Math.max(1, height), false);
      renderer.render(scene, camera);
    };
    resize();
    // The first rendered canvas uses exactly the same front texture as HTML.
    // Only then reveal it. A slow/erroring request never replaces the image.
    element.append(canvas);
    element.classList.add('has-views'); element.dataset.renderMode = 'multiview';
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element);
    let target = 0, yaw = 0, targetPitch = 0, pitch = 0, body = 0, visible = true;
    let lastTime = performance.now(), elapsed = 0;
    const uniforms = material.uniforms;
    function render(time) {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time; elapsed += dt;
      yaw += (target - yaw) * (1 - Math.exp(-7 * dt));
      pitch += (targetPitch - pitch) * (1 - Math.exp(-5 * dt));
      body += (yaw - body) * (1 - Math.exp(-3 * dt));
      if (Math.abs(yaw) < 0.0001 && target === 0) yaw = 0;
      const pair = selectViews(yaw), index = Math.min(pair.from, 3);
      uniforms.viewA.value = views[pair.from]; uniforms.viewB.value = views[pair.to];
      uniforms.flowAB.value = fields[index][0]; uniforms.flowBA.value = fields[index][1];
      uniforms.blend.value = pair.mix; uniforms.pitch.value = pitch;
      // Subtle following/body breathing, no flat-card Y-axis rotation.
      plane.rotation.z = -body * 0.012;
      plane.scale.y = 1 + Math.sin(elapsed * 1.35) * 0.002;
      plane.position.y = (plane.scale.y - 1) * 0.45;
      renderer.render(scene, camera);
      element.dataset.headYaw = yaw.toFixed(3); element.dataset.bodyYaw = body.toFixed(3);
      raf = requestAnimationFrame(render);
    }
    const resume = () => { if (!disposed && visible && !document.hidden && !raf) { lastTime = performance.now(); raf = requestAnimationFrame(render); } };
    function point(event) {
      if (event.pointerType === 'touch' && !element.contains(event.target)) return;
      const box = element.getBoundingClientRect();
      target = Math.max(-1, Math.min(1, (event.clientX - box.left - box.width / 2) / Math.max(240, innerWidth * 0.35)));
      targetPitch = Math.max(-1, Math.min(1, (box.top + box.height * 0.24 - event.clientY) / 400));
      resume();
    }
    const neutral = () => { target = 0; targetPitch = 0; resume(); };
    listen(window, 'pointermove', point, { passive: true });
    listen(element, 'pointerdown', point, { passive: true });
    listen(window, 'pointerup', event => { if (event.pointerType !== 'mouse') neutral(); });
    listen(document, 'pointerleave', neutral);
    listen(window, 'blur', neutral);
    listen(document, 'visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else resume(); });
    listen(canvas, 'webglcontextlost', event => { event.preventDefault(); fallback(); });
    listen(reduced, 'change', () => { if (reduced.matches) fallback(); });
    observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting;
      if (!visible) { cancelAnimationFrame(raf); raf = 0; } else resume();
    }, { rootMargin: '50px' }); observer.observe(element);
    resume();
    return true;
  } catch {
    fallback();
    return false;
  }
}
