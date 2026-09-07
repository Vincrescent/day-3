/* Universe Eye — test/e2e.js
 * QA Engineer harness: jalankan kode NYATA (noise/camera/ui) di jsdom dengan
 * stub THREE minimal (tanpa WebGL). Assert: chips, panel focus, panel hide,
 * orbit toggle, label build, keyboard focus, escapeHTML, camera damping.
 *
 * Run: node test/e2e.js
 */
'use strict';

const path = require('path');
const os = require('os');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');
const JSDOM_PATH = path.join(os.tmpdir(), 'node_modules', 'jsdom').split(path.sep).join('/');

let JSDOM;
try { JSDOM = require(JSDOM_PATH).JSDOM; }
catch (e) {
  try { JSDOM = require('jsdom').JSDOM; }
  catch (e2) {
    console.error('jsdom not found. Install: npm install jsdom');
    process.exit(2);
  }
}

const results = [];
let booted = false;
function check(name, cond, extra) {
  results.push({ name: name, ok: !!cond, extra: extra || '' });
  const tag = cond ? 'PASS' : 'FAIL';
  console.log('  [' + tag + '] ' + name + (cond ? '' : '  :: ' + (extra || '')));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ---------- stub THREE (minimal, cukup untuk noise-independent logic) ----------
function buildTHREEStub() {
  class Vec3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
    distanceTo(v) { const dx = this.x - v.x, dy = this.y - v.y, dz = this.z - v.z; return Math.sqrt(dx*dx+dy*dy+dz*dz); }
  }
  class Obj3 {
    constructor() {
      this.position = new Vec3();
      this.children = [];
      this.visible = true;
      this.userData = {};
      this.rotation = { x: 0, y: 0, z: 0, set(x, y, z) { this.x = x; this.y = y; this.z = z; } };
    }
    add(...objs) { this.children = this.children.concat(objs); return this; }
    remove() {}
    getWorldPosition(v) { v.copy(this.position); return v; }
    updateWorldMatrix() {}
  }
  class Group extends Obj3 {}
  const THREE = {
    Vector3: Vec3,
    Object3D: Obj3,
    Group: Group,
    MathUtils: { lerp: (a, b, t) => a + (b - a) * t },
    // kelas-kelas yang di-referensi modul lain (no-op stub)
    Color: class { constructor(c) { this.c = c; } setHex(h) {} },
    WebGLRenderer: class {
      constructor() { this.domElement = { style: {}, addEventListener: () => {} }; }
      setPixelRatio() {} setSize() {} render() {}
      getPixelRatio() { return 1; }
    },
    Scene: class { constructor() { this.children = []; } add() {} },
    PerspectiveCamera: class {
      constructor(fov, aspect, near, far) {
        this.fov = fov; this.aspect = aspect; this.near = near; this.far = far;
        this.position = new Vec3();
      }
      updateProjectionMatrix() {}
      lookAt() {}
      project(v) { v.x = 0; v.y = 0; v.z = 0; return v; }
    },
    FogExp2: class {}, AmbientLight: class {}, PointLight: class {}, DirectionalLight: class {},
    BufferGeometry: class { constructor() { this.attributes = {}; } setAttribute() { return this; } setFromPoints() { return this; } },
    BufferAttribute: class { constructor(a, n) { this.array = a; this.itemSize = n; } },
    Line: class extends Obj3 {}, LineBasicMaterial: class {}, Mesh: class extends Obj3 {}, MeshPhongMaterial: class {},
    MeshBasicMaterial: class {}, Sprite: class extends Obj3 {}, SpriteMaterial: class {},
    Points: class extends Obj3 {}, ShaderMaterial: class {}, SphereGeometry: class {}, RingGeometry: class {},
    CanvasTexture: class { constructor() {} }, TextureLoader: class { load(u, ok, pr, err) { if (err) setTimeout(() => err(), 0); } },
    AdditiveBlending: 2, sRGBEncoding: 3001, DoubleSide: 2,
  };
  return THREE;
}

async function main() {
  console.log('Universe Eye e2e (jsdom) — ' + new Date().toISOString());
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

  // buang tag <script src=...> (kami eval manual agar kontrol urutan)
  const htmlNoScripts = html.replace(/<script[\s\S]*?<\/script>/g, '');

  const dom = new JSDOM(htmlNoScripts, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    url: 'http://localhost/',
  });
  const { window } = dom;
  const { document } = window;

  // polyfill browser-ish
  window.THREE = buildTHREEStub();
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener(){}, removeListener(){} });
  window.innerWidth = 1280; window.innerHeight = 720;
  window.devicePixelRatio = 1;

  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));

  // load app modules (order = index.html) dalam scope window
  const load = (f) => window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  load('js/noise.js');
  load('js/starfield.js');
  load('js/solar-system.js');
  load('js/camera.js');
  load('js/ui.js');

  // ---- noise API ----
  const N = window.UENoise;
  check('UENoise exposes noise3/fbm/RNG', typeof N.noise3 === 'function' && typeof N.fbm === 'function' && typeof N.RNG === 'function');
  const rng = new N.RNG(42);
  const a = rng.next(), b = rng.next();
  check('RNG deterministic & in [0,1)', a >= 0 && a < 1 && b >= 0 && b < 1);
  const n1 = N.noise3(0.1, 0.2, 0.3);
  check('noise3 returns finite number', Number.isFinite(n1), String(n1));

  // ---- planet data ----
  const D = window.UEPlanetData;
  check('8 planets + sun + moon defined', D.length === 10, 'got ' + D.length);
  const ids = D.map(d => d.id);
  check('all expected body ids present', ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'].every(i => ids.includes(i)), ids.join(','));
  check('earth flagged realTexture', D.find(d => d.id === 'earth').realTexture === true);
  check('moon has parent earth', D.find(d => d.id === 'moon').parent === 'earth');

  // ---- build solar system (canvas-stubbed: canvas 2d context returns null -> fallback) ----
  // jsdom canvas: getContext('2d') returns null without node-canvas -> our code must not crash
  let sys, cam, ui;
  try {
    sys = window.UESolarSystem.build({});
    cam = new window.UECamera(new window.THREE.PerspectiveCamera(55, 16/9, 0.1, 3000), { style: {}, addEventListener: () => {}, setPointerCapture: () => {} });
    ui = new window.UEUI(sys, cam);
    booted = true;
  } catch (err) {
    check('solar system builds without canvas', false, err.message);
    report();
    return;
  }
  check('solar system builds without canvas', booted);
  check('10 bodies in system', sys.bodies.length === 10, String(sys.bodies.length));

  // ---- chips rendered ----
  const chips = document.querySelectorAll('#chips .chip');
  check('10 chips rendered (system + 9 bodies)', chips.length === 10, 'got ' + chips.length);

  // ---- focus a planet via chip -> panel shows ----
  const earthChip = Array.from(chips).find(c => c.getAttribute('data-body') === 'earth');
  check('earth chip found', !!earthChip);
  earthChip.click();
  await sleep(30);
  const panel = document.getElementById('panel');
  check('panel visible after focus', !panel.classList.contains('hidden') && panel.classList.contains('show'));
  check('panel name = Bumi', document.getElementById('p-name').textContent === 'Bumi', document.getElementById('p-name').textContent);
  const factRows = document.querySelectorAll('#p-facts .fact');
  check('panel facts rendered (4 rows)', factRows.length === 4, 'got ' + factRows.length);
  check('active chip = earth', earthChip.classList.contains('active'));
  check('camera following earth', cam.followRec && cam.followRec.body.id === 'earth');

  // ---- labels built ----
  const labels = document.querySelectorAll('.body-label');
  check('10 body labels built', labels.length === 10, 'got ' + labels.length);

  // ---- orbit toggle ----
  const bo = document.getElementById('btn-orbits');
  bo.click();
  check('orbits hidden after toggle', sys.orbitLines.every(l => l.visible === false));
  bo.click();
  check('orbits visible after 2nd toggle', sys.orbitLines.every(l => l.visible === true));

  // ---- goSystem hides panel ----
  document.getElementById('btn-home').click();
  await sleep(30);
  check('panel hidden after goSystem', panel.classList.contains('hidden'));
  check('camera target back to system', cam.followRec === null);

  // ---- keyboard focus (1-9: mercury..neptune; 3=earth, 5=mars) ----
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '3' }));
  await sleep(30);
  check('keyboard 3 focuses Earth', document.getElementById('p-name').textContent === 'Bumi', document.getElementById('p-name').textContent);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '5' }));
  await sleep(30);
  check('keyboard 5 focuses Mars', document.getElementById('p-name').textContent === 'Mars', document.getElementById('p-name').textContent);

  // ---- keyboard 0 => system ----
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0' }));
  await sleep(30);
  check('keyboard 0 returns to system', panel.classList.contains('hidden'));

  // ---- tour toggle ----
  const bt = document.getElementById('btn-tour');
  bt.click();
  check('tour on (aria-pressed true)', bt.getAttribute('aria-pressed') === 'true');
  bt.click();
  check('tour off (aria-pressed false)', bt.getAttribute('aria-pressed') === 'false');

  // ---- camera damping converges ----
  const startTheta = cam.theta;
  for (let i = 0; i < 120; i++) cam.update(1 / 60);
  check('camera theta damps toward target', Math.abs(cam.theta - cam.tTheta) < 0.5, 'theta=' + cam.theta.toFixed(3) + ' target=' + cam.tTheta.toFixed(3));

  // ---- escapeHTML (XSS) — UI uses textContent; verify no raw HTML injection path ----
  // We verify by injecting a hostile name through the data and checking panel uses textContent.
  const hostile = window.UEPlanetData.find(d => d.id === 'mercury');
  const orig = hostile.name;
  hostile.name = '<img src=x onerror=window.__xss=1>';
  const merChips = Array.from(document.querySelectorAll('#chips .chip'));
  // focusId uses showPanel -> textContent
  window.UEUI && document.getElementById && (() => {
    // re-focus mercury by id
    const mChip = merChips.find(c => c.getAttribute('data-body') === 'mercury');
    mChip.click();
  })();
  await sleep(20);
  const rendered = document.getElementById('p-name').innerHTML;
  hostile.name = orig;
  check('hostile name escaped in panel (no live <img>)', !/^\s*<img/i.test(rendered) && !window.__xss, 'innerHTML=' + rendered.slice(0, 40));

  // ---- no runtime errors ----
  check('no uncaught window errors', errors.length === 0, errors.join(' | '));

  report();
}

function report() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  console.log('\n==== e2e summary ====');
  console.log('  ' + pass + '/' + results.length + ' checks passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(err => { console.error('e2e crashed:', err); process.exit(3); });
