/* Universe Eye — camera-verbs.js (v1.0)
 * Camera verbs: satu slot gerak aktif, dibatalkan input manual (cancelFlight
 * reflex), speed words (slow/normal/fast), profil kecepatan trapezoid
 * (smoothstep naik → cruise → smoothstep turun) untuk dolly sinematik.
 *
 * ADAPTASI MIT dari "God's Eye View" (Bilawal Sidhu, 2026), src/cameraVerbs.js.
 * Yang dipindah: pola single active-motion slot, `once` vs `continuous`,
 * interruptCameraMotion(reason) sebagai satu-satunya release path,
 * cancelFlight reflex (pointerdown/wheel → interrupt), speed words,
 * approachValue, routeRampFraction, routeSpeedProfile (closed-form integral).
 *
 * Yang TIDAK dipindah: route dolly street-following, bank turn, terrain floor,
 * corridor warming — semua terikat Cesium (0 byte).
 *
 * API:
 *   UECameraVerbs.math         → { approachValue, routeRampFraction, routeSpeedProfile }
 *   UECameraVerbs.createMotionSlot() → { start, tick, interrupt, info, active }
 *   UECameraVerbs.bindCancelFlight(slot, canvasEl)
 *   UECameraVerbs.SPEEDS       → tuning constants (freeze)
 */
(function (global) {
  'use strict';

  /* ── Math murni (unit-testable; tanpa state, tanpa wall-clock) ────── */

  /**
   * First-order approach framerate-independent: 1 - e^(-rate*dt).
   * (Diadaptasi dari approachValue, cameraVerbs.js — 0044f9e1d4c2.)
   * @returns {number} nilai setelah ditingkatkan ke target.
   */
  function approachValue(current, target, ratePerS, dt) {
    if (!Number.isFinite(current)) return target;
    if (!Number.isFinite(target)) return current;
    var k = 1 - Math.exp(-Math.max(0, ratePerS) * Math.max(0, dt));
    return current + (target - current) * k;
  }

  /** Share durasi yang dipakai ease-in (dan ease-out lagi). */
  function routeRampFraction(durationS) {
    if (!(durationS > 0)) return 0;
    return Math.min(SPEEDS.routeRampMaxFraction, SPEEDS.routeRampS / durationS);
  }

  /**
   * Trapezoid speed profile — integral closed-form (distance = integral dari
   * kurva speed), jadi posisi presisi tanpa akumulasi per-frame drift, dan
   * speed kontinu di mana-mana: nol di kedua ujung, C1 di sambungan
   * ramp↔plateau (smoothstep ber-gradien nol di 0 dan 1).
   * (Diadaptasi dari routeSpeedProfile, cameraVerbs.js — 1347b90f98d9.)
   * @param {number} u waktu ternormalisasi 0..1
   * @param {number} r fraksi ramp (dari routeRampFraction)
   * @returns {{distance:number, speed:number}} fraksi ark 0..1 + speed
   *   (kali speed cruise).
   */
  function routeSpeedProfile(u, r) {
    var t = Math.min(1, Math.max(0, Number.isFinite(u) ? u : 0));
    if (!(r > 0)) return { distance: t, speed: 1 };
    var area = 1 - r; // kedua ramp berkontribusi r total
    function rampArea(p) { return r * (p * p * p - (p * p * p * p) / 2); }
    function smoothstep(p) { return p * p * (3 - 2 * p); }
    if (t <= r) {
      var p = t / r;
      return { distance: rampArea(p) / area, speed: smoothstep(p) };
    }
    if (t >= 1 - r) {
      var q = (1 - t) / r;
      return { distance: (area - rampArea(q)) / area, speed: smoothstep(q) };
    }
    return { distance: (r / 2 + (t - r)) / area, speed: 1 };
  }

  /* ── Tuning (freeze untuk test) ───────────────────────────────────── */
  var RAD = Math.PI / 180;
  var SPEEDS = Object.freeze({
    orbitDegS:   Object.freeze({ slow: 2, normal: 6, fast: 14 }),
    tiltDegS:    Object.freeze({ slow: 3, normal: 8, fast: 16 }),
    dollyDegS:   Object.freeze({ slow: 12, normal: 24, fast: 50 }),
    once: Object.freeze({
      orbitDeg: 30, tiltDeg: 12, dollyDeg: 45, durationS: 0.9
    }),
    dollyDefaultS: 3.2,
    routeRampS: 1.1,
    routeRampMaxFraction: 0.35,
    maxDollyDeg: 360
  });

  /* ── Motion slot ──────────────────────────────────────────────────── */

  /**
   * Buat satu motion slot. Pola dari cameraVerbs.js: satu gerak pada satu
   * waktu; `once` = nudge bounded yang self-stop saat budget habis;
   * `continuous` berjalan sampai interrupt() dipanggil — oleh input manual
   * (cancelFlight reflex), oleh verb baru (replaced), atau oleh stop eksplisit.
   * tick() deterministik: dt diberikan, tidak dibaca dari wall-clock.
   */
  function createMotionSlot() {
    var slot = { start: start, tick: tick, interrupt: interrupt, info: info, active: false };
    var m = null;      // state gerak aktif
    var lastMs = 0;

    function interrupt(reason) {
      var wasActive = !!m;
      m = null;
      if (wasActive) slot.active = false;
      return { wasActive: wasActive, reason: reason || 'interrupt' };
    }

    function info() {
      if (!m) return null;
      var out = { kind: m.kind, direction: m.direction, speed: m.speed, mode: m.mode };
      if (m.kind === 'dolly') { out.progress = m.u; out.degTraveled = m.degTraveled; out.durationS = m.durationS; }
      return out;
    }

    function pickSpeed(kind, s) {
      var tbl = kind === 'tilt' ? SPEEDS.tiltDegS : kind === 'dolly' ? SPEEDS.dollyDegS : SPEEDS.orbitDegS;
      return tbl[s] ? s : 'normal';
    }

    function start(verb, opts) {
      opts = opts || {};
      interrupt('replaced');
      var speed = pickSpeed(verb, opts.speed);
      var dir = opts.direction || 'right';
      var mode = opts.mode === 'continuous' ? 'continuous' : 'once';

      switch (verb) {
        case 'orbit':
          if (dir !== 'left' && dir !== 'right') return { ok: false, error: 'orbit butuh left/right.' };
          m = { kind: 'orbit', direction: dir, speed: speed, mode: mode };
          if (mode === 'once') m.elapsed = 0;
          break;
        case 'tilt':
          if (dir !== 'up' && dir !== 'down') return { ok: false, error: 'tilt butuh up/down.' };
          m = { kind: 'tilt', direction: dir, speed: speed, mode: mode };
          if (mode === 'once') m.elapsed = 0;
          break;
        case 'dolly':
          m = { kind: 'dolly', direction: dir, speed: speed, mode: 'continuous',
                durationS: Math.min(12, Math.max(1, opts.durationS || SPEEDS.dollyDefaultS)),
                u: 0, degTraveled: 0, lastDist: 0 };
          m.totalRad = Math.min(SPEEDS.maxDollyDeg, opts.totalDeg || 60) * RAD *
                       (dir === 'left' ? -1 : 1);
          break;
        default:
          return { ok: false, error: 'Verb tak dikenal "' + verb + '" — pakai orbit, tilt, dolly, atau stop.' };
      }
      slot.active = true;
      lastMs = 0;
      return { ok: true, verb: verb, direction: m.direction, speed: m.speed, mode: m.mode };
    }

    function tick(cam, dt) {
      if (!m) return;
      var d = Math.min(0.25, Math.max(0.001, Number.isFinite(dt) ? dt : 0.001));
      var sign = (m.direction === 'left') ? -1 : 1;

      if (m.kind === 'dolly') {
        // Trapezoid: theta = theta0 + totalRad * profile.distance(u)
        m.u = Math.min(1, m.u + d / m.durationS);
        var prof = routeSpeedProfile(m.u, routeRampFraction(m.durationS));
        cam.tTheta += (prof.distance - m.lastDist) * m.totalRad;
        m.lastDist = prof.distance;
        m.degTraveled = Math.abs((prof.distance) * m.totalRad / RAD);
        if (m.u >= 1) interrupt('dolly-complete');
        return;
      }

      // once: budget dengan ease-out (dari cameraVerbs.js: t = elapsed/duration)
      if (m.mode === 'once') {
        m.elapsed = (m.elapsed || 0) + d;
        var t = Math.min(1, m.elapsed / SPEEDS.once.durationS);
        if (m.kind === 'orbit') {
          // advance penuh dibilah ease-out → integrasi beda-beda
          var share = (t * t * (3 - 2 * t)); // smoothstep share
          var budget = SPEEDS.once.orbitDeg * RAD;
          cam.tTheta += (share - (m.lastShare || 0)) * budget * sign;
          m.lastShare = share;
        } else {
          var shareT = t * t * (3 - 2 * t);
          cam.tPhi += (shareT - (m.lastShare || 0)) * SPEEDS.once.tiltDeg * RAD * (m.direction === 'up' ? -1 : 1);
          m.lastShare = shareT;
        }
        if (t >= 1) interrupt('once-complete');
        return;
      }

      // continuous
      if (m.kind === 'orbit') {
        cam.tTheta += SPEEDS.orbitDegS[m.speed] * RAD * sign * d;
      } else {
        cam.tPhi += SPEEDS.tiltDegS[m.speed] * RAD * (m.direction === 'up' ? -1 : 1) * d;
      }
    }

    return slot;
  }

  /**
   * Bind cancelFlight reflex: SEMANTIK "any manual camera input reclaims
   * control" (cameraVerbs.js:576-588) — pointerdown/wheel pada canvas
   * meng-interrupt gerak aktif, instan (tidak di-ease).
   */
  function bindCancelFlight(slot, canvasEl) {
    if (!canvasEl || typeof slot.interrupt !== 'function') return function () {};
    function h() { slot.interrupt('manual-input'); }
    canvasEl.addEventListener('pointerdown', h, { passive: true });
    canvasEl.addEventListener('wheel', h, { passive: true });
    return function () {
      canvasEl.removeEventListener('pointerdown', h);
      canvasEl.removeEventListener('wheel', h);
    };
  }

  global.UECameraVerbs = {
    math: Object.freeze({
      approachValue: approachValue,
      routeRampFraction: routeRampFraction,
      routeSpeedProfile: routeSpeedProfile
    }),
    createMotionSlot: createMotionSlot,
    bindCancelFlight: bindCancelFlight,
    SPEEDS: SPEEDS
  };
})(window);
