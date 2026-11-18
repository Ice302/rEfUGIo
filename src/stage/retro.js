// The retro finish, as a full-screen shader over everything WebGL draws: ink misregistration,
// scanlines, VHS tracking tears that follow scroll speed, and film grain. The Voyage scene
// also uses its low-resolution mode, with a CRT curve and an ordered dither down to a fixed
// print palette, as on an old home computer.
import './nocm.js';
import * as THREE from 'three';

const PALETTE = ['#0b0c14', '#0a2a9c', '#0a3fdb', '#6d93f5', '#f6f2e6', '#e3d7b8', '#ffc60a', '#e5121e', '#8e0d16', '#3b3a47'].map((h) => new THREE.Color(h));

const fragment = /* glsl */ `
  uniform sampler2D tSrc;
  uniform vec2 uRes;
  uniform float uTime, uTear, uChroma, uScan, uGrain, uPixel, uQuant, uCurve, uVig, uDither, uBoil;
  uniform vec3 uPal[10];
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float bayer2(vec2 a) { a = floor(a); return fract(a.x / 2. + a.y * a.y * .75); }
  #define bayer4(a) (bayer2(.5 * (a)) * .25 + bayer2(a))
  #define bayer8(a) (bayer4(.5 * (a)) * .25 + bayer2(a))

  vec3 nearest(vec3 c) {
    vec3 best = uPal[0];
    float d = 1e9;
    for (int i = 0; i < 10; i++) {
      vec3 e = c - uPal[i];
      float k = dot(e, e);
      if (k < d) { d = k; best = uPal[i]; }
    }
    return best;
  }

  void main() {
    vec2 uv = vUv;
    if (uCurve > 0.) {
      // Curved like a CRT, scaled so the picture still reaches the corners of the screen
      vec2 c = uv - .5;
      uv = .5 + c * (1. + uCurve * dot(c, c)) / (1. + uCurve * .5);
    }
    if (uTear > .002) {
      float band = step(1. - uTear * .24, hash(vec2(floor(uv.y * 16.), floor(uTime * 12.))));
      uv.x += band * (hash(vec2(floor(uv.y * uRes.y / 3.), floor(uTime * 24.))) - .5) * .06 * uTear;
    }
    // Line boil: the whole drawing shimmers by under a pixel, stepped like cel animation on twos
    if (uBoil > 0.) {
      vec2 cell = floor(uv * uRes / 26.);
      float s = floor(uTime * 9.);
      uv += (vec2(hash(cell + s), hash(cell + s + 17.)) - .5) * uBoil / uRes;
    }
    if (uPixel > 1.) uv = (floor(uv * uRes / uPixel) + .5) * uPixel / uRes;
    vec4 base = texture2D(tSrc, uv);
    if (uChroma > 0.) {
      vec4 a = texture2D(tSrc, uv + vec2(uChroma, uChroma * .5));
      vec4 b = texture2D(tSrc, uv - vec2(uChroma, uChroma * .5));
      base = vec4(a.r, base.g, b.b, max(base.a, max(a.a, b.a)));
    }
    vec3 col = base.rgb;
    if (uQuant > .5) {
      vec2 cell = floor(uv * uRes / max(uPixel, 1.));
      col = nearest(col + (bayer8(cell) - .5) * uDither);
    }
    float line = .5 + .5 * sin(gl_FragCoord.y * 3.14159 / max(uPixel, 2.));
    col *= 1. - uScan * line;
    if (uVig > 0.) {
      vec2 v = vUv - .5;
      col *= 1. - uVig * smoothstep(.2, .75, dot(v, v) * 2.);
    }
    if (uGrain > 0.) col += (hash(gl_FragCoord.xy + uTime * 61.) - .5) * uGrain * base.a;
    gl_FragColor = vec4(col, base.a);
  }`;

export class RetroPass {
  constructor(renderer, opts = {}) {
    this.renderer = renderer;
    this.scale = opts.scale ?? 1;
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      minFilter: THREE.LinearFilter,
      magFilter: opts.nearest ? THREE.NearestFilter : THREE.LinearFilter,
      depthBuffer: true,
    });
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      transparent: false,
      blending: THREE.NoBlending,
      uniforms: {
        tSrc: { value: this.rt.texture },
        uRes: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uTear: { value: 0 },
        uChroma: { value: opts.chroma ?? 0.0007 },
        uScan: { value: opts.scan ?? 0.05 },
        uGrain: { value: opts.grain ?? 0.03 },
        uPixel: { value: opts.pixel ?? 1 },
        uQuant: { value: opts.quant ? 1 : 0 },
        uCurve: { value: opts.curve ?? 0 },
        uVig: { value: opts.vignette ?? 0 },
        uDither: { value: opts.dither ?? 0.16 },
        uBoil: { value: opts.boil ?? 0 },
        uPal: { value: PALETTE },
      },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
      fragmentShader: fragment,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    this.quad.frustumCulled = false;
    this.scene.add(this.quad);
  }

  setSize(w, h, ratio) {
    this.px = ratio;
    const rw = Math.max(2, Math.round(w * ratio));
    const rh = Math.max(2, Math.round(h * ratio));
    this.rt.setSize(rw, rh);
    this.material.uniforms.uRes.value.set(rw, rh);
  }

  set(name, value) {
    this.material.uniforms[name].value = value;
  }

  // Point rendering at one rectangle of the target. Sizes are in CSS pixels, y from the bottom.
  rect(x, y, w, h, sx, sw) {
    const k = this.px;
    const { rt } = this;
    rt.viewport.set(x * k, y * k, w * k, h * k);
    rt.scissor.set(sx * k, y * k, sw * k, h * k);
    rt.scissorTest = true;
    this.renderer.setRenderTarget(rt);
  }

  begin() {
    const r = this.renderer;
    const { rt } = this;
    rt.scissorTest = false;
    rt.viewport.set(0, 0, rt.width, rt.height);
    r.setRenderTarget(rt);
    r.clear(true, true, false);
  }

  end(time) {
    const r = this.renderer;
    this.material.uniforms.uTime.value = time;
    r.setRenderTarget(null);
    r.setScissorTest(false);
    r.render(this.scene, this.camera);
  }
}
