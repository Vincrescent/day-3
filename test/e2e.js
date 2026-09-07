/* Universe Eye — test/e2e.js (v1.1)
 * QA harness: kode NYATA (noise/camera/ui/solar-system) di jsdom + stub THREE.
 * Menutupi: data, build, PARENTING BULAN (fix), chips, panel, toggle
 * (orbit/label/scale/cine), time control, keyboard, tour, damping kamera,
 * tekstur prosedural (stepTextures), anti-XSS, error tak tertangkap.
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
  catch (e2) { console.error('jsdom not found. Install: npm install jsdom'); process.exit(2); }
}

const results = [];
function check(name, cond, extra) {
  results.push({ name, ok: !!cond });
  console.log('  [' + (cond ? 'PASS' : 'FAIL') + '] ' + name + (cond ? '' : '  :: ' + (extra || '')));
}
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function report() {
  const pass = results.filter(r => r.ok).length;
  const fail = results.length - pass;
  console.log('\n==== e2e v1.1 summary ====');
  console.log('  ' + pass + '/' + results.length + ' checks passed, ' + fail + ' failed');
  process.exit(fail === 0 ? 0 : 1);
}

async function main() {
  console.log('Universe Eye e2e v1.1 (jsdom) — ' + new Date().toISOString());
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  const { window } = dom;
  const { document } = window;

  window.THREE = require('./stub-three')();
  if (!window.matchMedia) window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {} });
  window.innerWidth = 1280; window.innerHeight = 720; window.devicePixelRatio = 1;

  const errors = [];
  window.addEventListener('error', (e) => errors.push(e.message));

  const load = (f) => window.eval(fs.readFileSync(path.join(ROOT, f), 'utf8'));
  load('js/noise.js');
  load('js/starfield.js');
  load('js/solar-system.js');
  load('js/camera.js');
  load('js/split-flap.js');
  load('js/ui.js');
  load('js/corona.js');

  // ---- noise API ----
  const N = window.UENoise;
  check('UENoise exposes noise3/fbm/RNG', typeof N.noise3 === 'function' && typeof N.fbm === 'function' && typeof N.RNG === 'function');
  const rng = new N.RNG(42);
  const a = rng.next(), b = rng.next();
  check('RNG deterministic & in [0,1)', a >= 0 && a < 1 && b >= 0 && b < 1);
  check('noise3 finite', Number.isFinite(N.noise3(0.1, 0.2, 0.3)));

  // ---- planet data ----
  const D = window.UEPlanetData;
  check('10 bodies (sun+8 planet+moon)', D.length === 10, 'got ' + D.length);
  check('all expected ids', ['sun','mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'].every(i => D.map(d => d.id).includes(i)));
  check('earth flagged realTexture', D.find(d => d.id === 'earth').realTexture === true);
  check('moon parent = earth', D.find(d => d.id === 'moon').parent === 'earth');
  check('planets have orbitAcc', D.filter(d => d.kind === 'planet').every(d => d.orbitAcc > 0));

  // ---- corona: math murni (adaptasi MIT dari God's Eye View) ----
  const C = window.UECorona;
  check('UECorona exposes math API', typeof C.bodyDiscScreenRadius === 'function' && typeof C.normalizeAngle === 'function');
  const na = C.normalizeAngle(-Math.PI / 2);
  check('normalizeAngle(-π/2) → 3π/2', Math.abs(na - (3 * Math.PI / 2)) < 1e-9, 'got ' + na);
  const cad = C.circularAngleDistance(0.1, Math.PI * 2 + 0.1);
  check('circularAngleDistance full-turn = 0', cad < 1e-9, 'got ' + cad);
  // disc radius: benda 10 unit, kamera 100 unit, fovy 55°, viewport 800px
  const disc = C.bodyDiscScreenRadius(10, 100, 800, 55 * Math.PI / 180);
  check('bodyDiscScreenRadius returns positive px', disc > 0 && disc < 800, 'got ' + disc);
  check('bodyDiscScreenRadius null behind/at camera', C.bodyDiscScreenRadius(10, 5, 800, 0.96) === null);
  // create() aman di jsdom (tanpa canvas 2d) — tidak boleh crash
  let c = null;
  try { c = C.create(); c.resize(800, 600); } catch (e) { check('corona create+resize no-crash (jsdom)', false, e.message); }
  if (c) check('corona create+resize no-crash (jsdom, no 2d ctx)', true);

  // ---- split-flap: math pure + DOM shell (adaptasi MIT dari God's Eye View) ----
  const SF = window.UESplitFlap;
  check('UESplitFlap exposes set/plan/visibleGlyphs', typeof SF.set === 'function' && typeof SF.plan === 'function' && typeof SF.visibleGlyphs === 'function');
  const plan = SF.plan('Bumi', 'Mars');
  check('plan: Bumi→Mars changes all 4 cols', plan.changedCount === 4 && plan.cells.length === 4, 'changed=' + plan.changedCount);
  check('plan: firstChanged=0 lastChanged=3', plan.firstChanged === 0 && plan.lastChanged === 3);
  check('plan: duration = 3*stagger + char', plan.durationMs === 3 * 26 + 190, 'dur=' + plan.durationMs);
  check('plan: no-change returns empty cells', SF.plan('Bumi', 'Bumi').changedCount === 0 && SF.plan('Bumi', 'Bumi').cells.length === 0);
  check('visibleGlyphs: at t=0 shows old glyphs', SF.visibleGlyphs(plan, 0) === 'Bumi', 'got ' + SF.visibleGlyphs(plan, 0));
  check('visibleGlyphs: after settle shows new', SF.visibleGlyphs(plan, 999) === 'Mars', 'got ' + SF.visibleGlyphs(plan, 999));
  // DOM: set() membangun shell + textContent benar (tak pernah kosong)
  const flipHost = document.getElementById('p-name');
  SF.set(flipHost, 'Bumi');
  check('split-flap: shell dibangun (ue-flap-host)', flipHost.classList.contains('ue-flap-host'));
  check('split-flap: textContent truth = Bumi', flipHost.textContent === 'Bumi', 'got ' + JSON.stringify(flipHost.textContent));
  SF.set(flipHost, 'Jupiter');
  check('split-flap: setelah set ke Jupiter, textContent = Jupiter', flipHost.textContent === 'Jupiter');
  check('split-flap: cells dekoratif ada saat kaskade aktif', flipHost.querySelector('.ue-flap-cells') !== null);

  // ---- build ----
  let sys, cam, ui;
  try {
    sys = window.UESolarSystem.build({});
    cam = new window.UECamera(new window.THREE.PerspectiveCamera(55, 16 / 9, 0.1, 6000), { style: {}, addEventListener: () => {}, setPointerCapture: () => {} });
    ui = new window.UEUI(sys, cam, { onScaleMode: () => {} });
  } catch (err) {
    check('build system+camera+ui', false, err.message);
    report();
    return;
  }
  check('build system+camera+ui', true);
  check('10 bodies in system', sys.bodies.length === 10);

  // ---- FIX QA: parenting bulan ----
  const moonRec = sys.bodies[sys.byId('moon')];
  const earthRec = sys.bodies[sys.byId('earth')];
  function inScene(o) {
    let p = o;
    while (p && p.parent) p = p.parent;
    // root harus group sistem (bukan null), artinya terparenting penuh
    return o === p ? false : p !== null;
  }
  check('FIX: moon terparenting ke scene graph (bukan dangling)', moonRec.node.parent !== null && inScene(moonRec.node));
  sys.tick(2.5);
  const d1 = moonRec.worldPos.distanceTo(earthRec.worldPos);
  sys.tick(3.0);
  const d2 = moonRec.worldPos.distanceTo(earthRec.worldPos);
  const MOON_ORBIT = moonRec.body.orbit; // 6.0
  check('FIX: jarak bulan-Bumi stabil ~6.0 (bukan ~0 di Matahari)', Math.abs(d1 - MOON_ORBIT) < 0.5 && Math.abs(d2 - MOON_ORBIT) < 0.5, 'd1=' + d1.toFixed(2) + ' d2=' + d2.toFixed(2));
  const moonFromSun = moonRec.worldPos.distanceTo(new window.THREE.Vector3(0, 0, 0));
  check('FIX: bulan ikut Bumi (jarak ke Matahari ~45, bukan ~4)', moonFromSun > 25, 'dist=' + moonFromSun.toFixed(1));

  // ---- chips ----
  const chips = document.querySelectorAll('#chips .chip');
  check('10 chips', chips.length === 10, 'got ' + chips.length);

  // ---- focus earth ----
  const earthChip = Array.from(chips).find(c => c.getAttribute('data-body') === 'earth');
  earthChip.click();
  await sleep(20);
  const panel = document.getElementById('panel');
  check('panel visible', !panel.classList.contains('hidden') && panel.classList.contains('show'));
  check('panel name Bumi', document.getElementById('p-name').textContent === 'Bumi');
  check('facts 4 rows', document.querySelectorAll('#p-facts .fact').length === 4);
  check('active chip earth', earthChip.classList.contains('active'));
  check('camera follows earth', cam.followRec && cam.followRec.body.id === 'earth');

  // ---- labels ----
  check('10 labels built', document.querySelectorAll('.body-label').length === 10);
  const bl = document.getElementById('btn-labels');
  bl.click();
  check('labels off', bl.getAttribute('aria-pressed') === 'false' && ui.labelsOn === false);
  bl.click();
  check('labels on', bl.getAttribute('aria-pressed') === 'true');

  // ---- orbit toggle ----
  const bo = document.getElementById('btn-orbits');
  bo.click();
  check('orbits hidden', sys.orbitLines.every(l => l.visible === false));
  bo.click();
  check('orbits visible', sys.orbitLines.every(l => l.visible === true));

  // ---- FITUR B: scale mode ----
  const bs = document.getElementById('btn-scale');
  const neptune = sys.bodies[sys.byId('neptune')];
  check('scale starts visual', sys.mode() === 'visual' && cam.mode === 'visual');
  bs.click();
  check('scale -> orbit (camera limit 3600)', sys.mode() === 'orbit' && cam.mode === 'orbit' && cam.maxRadius === 3600);
  check('orbit: neptune -> 30.07AU*60', Math.abs(neptune.orbitTarget - 30.07 * 60) < 1, 'target=' + neptune.orbitTarget);
  bs.click();
  check('scale -> visual (back to 205)', sys.mode() === 'visual' && Math.abs(neptune.orbitTarget - 205) < 0.5);

  // ---- FITUR D: cinematic ----
  const bc = document.getElementById('btn-cine');
  bc.click();
  check('cine on: class + auto-tour', document.body.classList.contains('cinematic') && ui.tourOn === true);
  check('cine: letterbox present', document.getElementById('cinema-bars') !== null);
  bc.click();
  check('cine off: tour stopped', !document.body.classList.contains('cinematic') && ui.tourOn === false);

  // ---- FITUR A: time control ----
  const tp = document.getElementById('btn-pause');
  const spd = document.getElementById('speed');
  check('time 1x awal', ui.timeScale === 1);
  tp.click();
  check('pause -> 0x', ui.timeScale === 0 && tp.innerHTML.indexOf('Main') >= 0);
  tp.click();
  check('resume -> 1x', ui.timeScale === 1);
  spd.value = '4';
  spd.dispatchEvent(new window.Event('input', { bubbles: true }));
  check('slider 4x', ui.timeScale === 4 && document.getElementById('speed-val').textContent === '4.00×');
  spd.value = '1';
  spd.dispatchEvent(new window.Event('input', { bubbles: true }));
  // verifikasi: tick dengan timeScale 0 tidak menggerakkan orbit
  sys.tick(1.0, 1);
  const eAng1 = Math.atan2(earthRec.node.position.z, earthRec.node.position.x);
  sys.tick(0, 10);
  const eAng2 = Math.atan2(earthRec.node.position.z, earthRec.node.position.x);
  check('tick dt=0 tidak menggerakkan (pause)', eAng1 === eAng2);

  // ---- goSystem ----
  document.getElementById('btn-home').click();
  await sleep(20);
  check('panel hidden (goSystem)', panel.classList.contains('hidden'));
  check('camera -> system', cam.followRec === null);

  // ---- keyboard ----
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '3' }));
  await sleep(20);
  check('key 3 -> Earth', document.getElementById('p-name').textContent === 'Bumi');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '5' }));
  await sleep(20);
  check('key 5 -> Mars', document.getElementById('p-name').textContent === 'Mars');
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ' }));
  check('space -> pause', ui.timeScale === 0);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: ' ' }));
  check('space -> resume', ui.timeScale === 1);
  window.dispatchEvent(new window.KeyboardEvent('keydown', { key: '0' }));
  await sleep(20);
  check('key 0 -> system', panel.classList.contains('hidden'));

  // ---- tour ----
  const bt = document.getElementById('btn-tour');
  bt.click();
  check('tour on', bt.getAttribute('aria-pressed') === 'true' && ui.tourOn);
  bt.click();
  check('tour off', bt.getAttribute('aria-pressed') === 'false' && !ui.tourOn);

  // ---- damping kamera ----
  for (let i = 0; i < 120; i++) cam.update(1 / 60);
  check('kamera damping konvergen', Math.abs(cam.theta - cam.tTheta) < 0.5);

  // ---- FITUR: tekstur prosedural staggered ----
  check('texture queue = 8 (7 planet + bulan; bumi raster, matahari shader)', sys.texturesRemaining() === 8, 'got ' + sys.texturesRemaining());
  let n = 0;
  while (sys.texturesRemaining() > 0 && n < 20) { sys.stepTextures(); n++; }
  check('stepTextures mengosongkan queue', sys.texturesRemaining() === 0, 'left=' + sys.texturesRemaining() + ' after ' + n + ' frames');

  // ---- anti-XSS ----
  const hostile = window.UEPlanetData.find(d => d.id === 'mercury');
  const orig = hostile.name;
  hostile.name = '<img src=x onerror=window.__xss=1>';
  Array.from(document.querySelectorAll('#chips .chip')).find(c => c.getAttribute('data-body') === 'mercury').click();
  await sleep(15);
  const rendered = document.getElementById('p-name').innerHTML;
  hostile.name = orig;
  check('XSS di-escape (tak ada <img> live)', !/^\s*<img/i.test(rendered) && !window.__xss);

  // ---- errors ----
  check('no uncaught errors', errors.length === 0, errors.join(' | '));

  report();
}

main().catch(err => { console.error('e2e crashed:', err); process.exit(3); });
