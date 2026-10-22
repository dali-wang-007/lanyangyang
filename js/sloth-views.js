import * as T from './vendor/three.module.min.js';
import { selectViews, lookTarget, advancePose } from './sloth-view-state.js?v=20261022-follow';

const asset = name => new URL(`../assets/mascot/views/${name}`, import.meta.url).href;
const names = ['left', 'left-mid', 'front', 'right-mid', 'right'];

// Image-based view interpolation, NOT a replacement low-poly character.
// The body is always the approved front image; optical flow aligns the head's
// eyes, nose and fur before blending adjacent generated yaw keyframes.
const fragmentShader = `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D viewA, viewB, original, flowAB, flowBA;
  uniform float blend, pitch, bodyYaw, bodyPitch;
  uniform vec2 gaze;
  uniform vec4 eyesA, eyesB;
  vec2 motion(sampler2D field, vec2 uv) {
    return (texture2D(field, uv).rg * 2.0 - 1.0) * 0.25;
  }
  vec4 premul(vec4 c) { return vec4(c.rgb * c.a, c.a); }
  vec2 eyeLook(vec2 uv, vec4 eyes) {
    // Small local parallax of the original irises, never replacement eye art.
    float l = length((uv - eyes.xy) / vec2(.043, .037));
    float r = length((uv - eyes.zw) / vec2(.043, .037));
    float mask = 1.0 - smoothstep(.28, 1.0, min(l, r));
    return uv - gaze * vec2(.0045, .0035) * mask;
  }
  void main() {
    vec2 uv = vUv;
    float head = smoothstep(0.55, 0.62, uv.y);
    float anchored = smoothstep(.04, .24, uv.y);
    float torso = anchored * (1.0 - smoothstep(.55, .69, uv.y));
    float torsoDepth = sqrt(max(0.0, 1.0 - pow((uv.x - .50) / .40, 2.0)));
    // Feet stay planted. Torso volume turns less and later than the neck.
    vec2 bodyUV = uv;
    bodyUV.x += (uv.x - .5) * (1.0 / cos(bodyYaw * .20) - 1.0) * anchored;
    bodyUV.x -= sin(bodyYaw * .20) * .15 * torsoDepth * torso;
    bodyUV.y -= bodyPitch * .012 * torso * torsoDepth;
    uv.x -= bodyYaw * .010 * head;
    // Ellipsoid-depth pitch: face/nose travel farther than the fur silhouette.
    // This is image-based depth deformation, not a reconstructed 3D mesh.
    vec2 face = (uv - vec2(.50, .79)) / vec2(.29, .23);
    float depth = sqrt(max(0.0, 1.0 - dot(face, face)));
    float angle = pitch * .28;
    uv.y = mix(uv.y, .79 + (uv.y - .79) / cos(angle) - sin(angle) * .115 * depth, head);
    vec2 a = uv, b = uv;
    for (int i = 0; i < 4; i++) {
      a = uv - blend * motion(flowAB, a);
      b = uv - (1.0 - blend) * motion(flowBA, b);
    }
    vec4 turned = mix(premul(texture2D(viewA, eyeLook(a, eyesA))), premul(texture2D(viewB, eyeLook(b, eyesB))), blend);
    // An exact keyframe must be sampled exactly, without flow rounding drift.
    if (blend < 0.00001) turned = premul(texture2D(viewA, eyeLook(uv, eyesA)));
    vec4 base = premul(texture2D(original, mix(vUv, bodyUV, 1.0 - head)));
    vec4 color = mix(base, turned, head);
    gl_FragColor = vec4(color.rgb / max(color.a, 0.00001), color.a);
  }
`;

export async function createSloth(element) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  element.dataset.headYaw = '0.000';
  element.dataset.bodyYaw = '0.000';
  element.dataset.headPitch = element.dataset.bodyPitch = '0.000';
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
    element.dataset.headPitch = element.dataset.bodyPitch = '0.000';
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
        blend: { value: 0 }, pitch: { value: 0 }, bodyYaw: { value: 0 }, bodyPitch: { value: 0 },
        gaze: { value: new T.Vector2() },
        eyesA: { value: new T.Vector4(.386, .77, .577, .77) },
        eyesB: { value: new T.Vector4(.386, .77, .577, .77) }
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
    let target = { yaw: 0, pitch: 0 }, pose = { yaw: 0, pitch: 0, gazeX: 0, gazeY: 0, bodyYaw: 0, bodyPitch: 0 }, visible = true;
    const eyes = [[.293,.766,.457,.77],[.336,.768,.518,.77],[.386,.77,.577,.77],[.446,.77,.632,.77],[.505,.77,.680,.774]];
    let lastTime = performance.now(), elapsed = 0;
    const uniforms = material.uniforms;
    function render(time) {
      raf = 0;
      if (disposed || !visible || document.hidden) return;
      const dt = Math.min((time - lastTime) / 1000, 0.05); lastTime = time; elapsed += dt;
      pose = advancePose(pose, target, dt);
      if (Math.abs(pose.yaw) < .0001 && target.yaw === 0) pose.yaw = 0;
      const pair = selectViews(pose.yaw), index = Math.min(pair.from, 3);
      uniforms.viewA.value = views[pair.from]; uniforms.viewB.value = views[pair.to];
      uniforms.flowAB.value = fields[index][0]; uniforms.flowBA.value = fields[index][1];
      uniforms.blend.value = pair.mix; uniforms.pitch.value = pose.pitch;
      uniforms.bodyYaw.value = pose.bodyYaw; uniforms.bodyPitch.value = pose.bodyPitch;
      uniforms.gaze.value.set(pose.gazeX, pose.gazeY);
      uniforms.eyesA.value.fromArray(eyes[pair.from]); uniforms.eyesB.value.fromArray(eyes[pair.to]);
      // Subtle following/body breathing, no flat-card Y-axis rotation.
      plane.rotation.z = -pose.bodyYaw * .015;
      plane.scale.y = 1 + Math.sin(elapsed * 1.35) * 0.002;
      plane.position.y = (plane.scale.y - 1) * 0.45;
      renderer.render(scene, camera);
      element.dataset.headYaw = pose.yaw.toFixed(3); element.dataset.bodyYaw = pose.bodyYaw.toFixed(3);
      element.dataset.headPitch = pose.pitch.toFixed(3); element.dataset.bodyPitch = pose.bodyPitch.toFixed(3);
      raf = requestAnimationFrame(render);
    }
    const resume = () => { if (!disposed && visible && !document.hidden && !raf) { lastTime = performance.now(); raf = requestAnimationFrame(render); } };
    function point(event) {
      if (event.pointerType === 'touch' && !element.contains(event.target)) return;
      const box = element.getBoundingClientRect();
      target = lookTarget(event.clientX, event.clientY, box, innerWidth);
      resume();
    }
    const neutral = () => { target = { yaw: 0, pitch: 0 }; resume(); };
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
