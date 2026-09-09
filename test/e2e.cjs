#!/usr/bin/env node
/* Solar Watch e2e — jsdom harness */
const fs = require('fs');
const path = require('path');
const os = require('os');
const JSDOM_PATH = path.join(os.tmpdir(), 'node_modules', 'jsdom').split(path.sep).join('/');
let JSDOM;
try { JSDOM = require(JSDOM_PATH).JSDOM; }
catch (e) { JSDOM = require('jsdom').JSDOM; }

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
let pass = 0, fail = 0;
function check(name, cond, detail = '') {
  if (cond) { pass++; console.log(`[PASS] ${name}`); }
  else { fail++; console.log(`[FAIL] ${name} ${detail}`); }
}

const errors = [];
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost:8321/index.html',
  beforeParse(window) {
    window.onerror = (m) => errors.push(String(m));
    // canvas stub
    const ctxStub = new Proxy({}, {
      get: (t, p) => {
        if (p === 'canvas') return window.canvas;
        if (p === 'createRadialGradient' || p === 'createLinearGradient')
          return () => ({ addColorStop: () => {} });
        if (p === 'measureText') return () => ({ width: 0 });
        return typeof p === 'string' ? (() => {}) : undefined;
      },
      set: () => true,
    });
    window.HTMLCanvasElement.prototype.getContext = () => ctxStub;
    window.devicePixelRatio = 1;
    // Notification stub
    window.Notification = { permission: 'default', requestPermission: () => Promise.resolve('denied') };
    // history stub
    window.history.replaceState = () => {};
    // showPicker stub
    window.HTMLInputElement.prototype.showPicker = () => {};
    // fetch stub (NeoWs)
    window.fetch = (url) => {
      const today = new Date().toISOString().slice(0, 10);
      if (typeof url === 'string' && url.includes('neo/rest/v1/feed')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({
          element_count: 2,
          near_earth_objects: { [today]: [
            { id: '1', name: 'TEST-AST-1', is_potentially_hazardous_asteroid: true,
              estimated_diameter: { kilometers: { estimated_diameter_min: 0.01, estimated_diameter_max: 0.1 } },
              close_approach_data: [{ close_approach_date: today, miss_distance: { lunar: '12.3', kilometers: '4750000', astronomical: '0.032' }, relative_velocity: { kilometers_per_second: '15.2' } }],
              nasa_jpl_url: 'https://example.com', absolute_magnitude_h: 22.5 },
            { id: '2', name: 'TEST-AST-2', is_potentially_hazardous_asteroid: false,
              estimated_diameter: { kilometers: { estimated_diameter_min: 0.5, estimated_diameter_max: 1.2 } },
              close_approach_data: [{ close_approach_date: today, miss_distance: { lunar: '45.0', kilometers: '17000000', astronomical: '0.11' }, relative_velocity: { kilometers_per_second: '8.7' } }],
              absolute_magnitude_h: 19.3 },
          ] },
        }) });
      }
      return Promise.reject(new Error('unexpected fetch: ' + url));
    };
  },
});

const { window } = dom;
const { document } = window;

setTimeout(async () => {
  try {
    check('no uncaught errors', errors.length === 0, JSON.stringify(errors.slice(0, 3)));

    // ─── INTRO SCREEN ─────────────────────────────────
    check('intro screen exists', !!document.getElementById('intro-screen'));
    check('intro MULAI button', !!document.getElementById('intro-start'));
    check('intro loading bar', !!document.getElementById('intro-bar'));
    check('intro canvas', !!document.getElementById('intro-canvas'));
    check('welcome audio element', !!document.getElementById('welcome-audio'));

    // ─── HEADER ─────────────────────────────────────
    check('title present', document.title.includes('Solar Watch'));
    check('topbar exists', !!document.getElementById('topbar'));
    check('brand name', document.body.textContent.includes('SOLAR WATCH'));

    // ─── PLANET LIST ────────────────────────────────
    const planetRows = document.querySelectorAll('#planet-list .obj-row');
    check('planet list has entries', planetRows.length >= 9, `got ${planetRows.length}`);
    const bodyText = document.body.textContent;
    for (const name of ['Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Moon']) {
      check(`planet ${name} listed`, bodyText.includes(name));
    }

    // ─── SPACECRAFT LIST ────────────────────────────
    const scRows = document.querySelectorAll('#spacecraft-list .obj-row');
    check('spacecraft list has entries', scRows.length >= 5, `got ${scRows.length}`);
    for (const name of ['ISS', 'Terra', 'TDRS', 'Firefly', 'Cassini', 'Bennu']) {
      check(`spacecraft ${name} listed`, bodyText.includes(name));
    }

    // ─── ASTEROIDS ──────────────────────────────────
    await new Promise(r => setTimeout(r, 500));
    const astItems = document.querySelectorAll('.ast-item');
    check('asteroids loaded (2)', astItems.length === 2, `got ${astItems.length}`);
    check('hazard class applied', !!document.querySelector('.ast-item.hazard'));
    check('hazard name shown', bodyText.includes('TEST-AST-1'));
    check('non-hazard shown', bodyText.includes('TEST-AST-2'));

    // ─── METEOR SHOWERS ─────────────────────────────
    const showers = document.querySelectorAll('.shower-item');
    check('9 showers listed', showers.length === 9, `got ${showers.length}`);
    check('shower ZHR present', bodyText.includes('ZHR 150'));

    // ─── MODE PILLS ─────────────────────────────────
    const pills = document.querySelectorAll('.mode-pill');
    check('4 mode pills', pills.length === 4, `got ${pills.length}`);
    check('overview mode active by default', pills[0].classList.contains('active'));

    // ─── TIME CONTROLS ──────────────────────────────
    check('play button exists', !!document.getElementById('tc-play'));
    check('speed selector exists', !!document.getElementById('tc-speed'));
    check('date input exists', !!document.getElementById('tc-date'));
    check('step back button', !!document.getElementById('tc-back'));
    check('step forward button', !!document.getElementById('tc-fwd'));
    check('reset now button', !!document.getElementById('tc-now'));

    // ─── SPEED OPTIONS ──────────────────────────────
    const speedOpts = document.querySelectorAll('#tc-speed option');
    check('6 speed options', speedOpts.length === 6, `got ${speedOpts.length}`);
    const speedValues = [...speedOpts].map(o => o.value);
    check('has 0.1x speed', speedValues.includes('0.1'));
    check('has 10000x speed', speedValues.includes('10000'));

    // ─── ORBIT TOGGLES ─────────────────────────────
    const orbitToggles = document.querySelectorAll('.orbit-tog');
    check('4 orbit toggles', orbitToggles.length === 4, `got ${orbitToggles.length}`);

    // ─── ASTEROID DATE CONTROLS ─────────────────────
    check('asteroid start date', !!document.getElementById('ast-start'));
    check('asteroid end date', !!document.getElementById('ast-end'));
    check('asteroid fetch button', !!document.getElementById('ast-fetch'));

    // ─── INFO PANEL ─────────────────────────────────
    check('right info panel exists', !!document.getElementById('right-panel'));
    check('info close button', !!document.getElementById('info-close'));

    // ─── PHA ALERT ──────────────────────────────────
    const phaAlert = document.getElementById('pha-alert');
    check('PHA alert element exists', !!phaAlert);
    // After asteroid load, PHA alert should show for hazardous asteroid
    await new Promise(r => setTimeout(r, 200));
    check('PHA alert triggered', phaAlert.classList.contains('show'));
    check('PHA body has content', document.getElementById('pha-body').textContent.includes('TEST-AST-1'));

    // ─── SHARE ──────────────────────────────────────
    check('share button exists', !!document.getElementById('share-btn'));
    check('share toast exists', !!document.getElementById('share-toast'));

    // ─── SIM DATE DISPLAY ───────────────────────────
    check('sim date badge', !!document.getElementById('sim-date-badge'));
    check('sim speed badge', !!document.getElementById('sim-speed-badge'));

    // ─── LEFT PANEL ─────────────────────────────────
    check('left panel exists', !!document.getElementById('left-panel'));
    check('left panel toggle', !!document.getElementById('left-toggle'));

    // ─── LOADING SCREEN ─────────────────────────────
    // Should be present initially (removed after timeout)
    check('loading screen element', document.body.textContent.includes('SOLAR WATCH'));

    // ─── VIEWPORT ───────────────────────────────────
    check('viewport canvas', !!document.getElementById('c'));
    check('stats element', !!document.getElementById('stats'));

    // ─── API STATUS ─────────────────────────────────
    check('API status indicator', !!document.getElementById('api-status'));

    // ─── ACCESSIBILITY ──────────────────────────────
    check('viewport has tablist', !!document.querySelector('[role="tablist"]'));
    check('time controls toolbar', !!document.querySelector('[role="toolbar"]'));
    const ariaLabels = document.querySelectorAll('[aria-label]');
    check('aria labels present (10+)', ariaLabels.length >= 10, `got ${ariaLabels.length}`);

  } catch (e) {
    check('unexpected exception', false, e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
  }

  console.log(`\n==== e2e summary ====\n  ${pass}/${pass + fail} checks passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}, 1200);
