/* Universe Eye — corona.js (v1.1)
 * Overlay sinematik screen-space: glow corona Matahari (sinar radial + arc
 * tapered), halo dingin Bulan, radius disc bola pada kamera perspektif,
 * math sudut, budget backing-pixel, frame cap 30 fps, render-key caching.
 *
 * ADAPTASI dari "God's Eye View" (Bilawal Sidhu, 2026), file src/celestialRing.js —
 * hanya bagian MURNI (canvas 2D + math, bebas Cesium) yang dipindahkan:
 * drawTaperedArc, drawSunRays, drawMoonHaze, *DiscScreenRadius,
 * normalizeAngle, circularAngleDistance, pola budget/cap/caching-nya.
 *
 * Sumber dilisensi MIT — atribusi penuh dipertahankan (wajib MIT):
 *
 *   MIT License
 *   Copyright (c) 2026 Bilawal Sidhu
 *   Permission is hereby granted, free of charge, to any person obtaining a copy
 *   of this software and associated documentation files (the "Software"), to deal
 *   in the Software without restriction, including without limitation the rights
 *   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 *   copies of the Software, and to permit persons to whom the Software is
 *   furnished to do so, subject to the following conditions:
 *   The above copyright notice and this permission notice shall be included in all
 *   copies or substantial portions of the Software.
 *
 * Window.UECorona
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* ── budget (diport: pola ceiling backing-pixel supaya overlay tak makan
     budget frame utama — efek dekoratif 30 fps sudah cukup "hidup") ── */
  var MAX_FRAME_RATE = 30;
  var MAX_BACKING_PIXELS = 1500000;
  var MAX_BACKING_DIMENSION = 1400;
  var MAX_DEVICE_PIXEL_RATIO = 1.25;
  var PLANE_EPSILON = 0.045;

  function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

  /* ── MATH (diport apa adanya dari celestialRing.js) ── */

  /** Normalize an angle to [0, 2π). */
  function normalizeAngle(angle) {
    var wrapped = angle % TAU;
    return wrapped < 0 ? wrapped + TAU : wrapped;
  }

  /** Shortest unsigned distance between two circular angles. */
  function circularAngleDistance(a, b) {
    var delta = Math.abs(normalizeAngle(a) - normalizeAngle(b));
    return Math.min(delta, TAU - delta);
  }

  /**
   * Radius layar (CSS px) sebuah bola pada kamera perspektif.
   * Diport dari earthDiscScreenRadius — digeneralisasi dari radius Bumi WGS84
   * ke radius benda apa pun (planet/Matahari/Bulan Universe Eye).
   */
  function bodyDiscScreenRadius(bodyRadius, cameraDistance, viewportHeight, fovy) {
    if (
      !Number.isFinite(cameraDistance)
      || cameraDistance <= bodyRadius
      || !(viewportHeight > 0)
      || !Number.isFinite(fovy)
      || fovy <= 0 || fovy >= Math.PI
    ) return null;
    var angularRadius = Math.asin(clamp(bodyRadius / cameraDistance, 0, 1));
    var radius = (viewportHeight * 0.5) * Math.tan(angularRadius) / Math.tan(fovy * 0.5);
    return Number.isFinite(radius) && radius > 0 ? radius : null;
  }

  /* ── EFFECT LAYERS (diport dari celestialRing.js, canvas 2D murni) ── */

  /** One tapered orbital arc around a celestial marker. */
  function drawTaperedArc(ctx, cx, cy, radius, angle, rgb, strength) {
    var span = 0.82, segments = 18;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(' + rgb + ', ' + (0.5 * strength) + ')';
    ctx.shadowBlur = 9;
    for (var i = 0; i < segments; i++) {
      var t0 = i / segments, t1 = (i + 1) / segments;
      var a0 = angle - span + span * 2 * t0;
      var a1 = angle - span + span * 2 * t1;
      var envelope = Math.sin(Math.PI * ((t0 + t1) * 0.5));
      ctx.strokeStyle = 'rgba(' + rgb + ', ' + (strength * envelope * envelope) + ')';
      ctx.lineWidth = 0.7 + envelope * 1.25;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, a0, a1);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Soft directional rays cast inward from the sun marker. */
  function drawSunRays(ctx, cx, cy, radius, innerRadius, angle) {
    var sx = cx + Math.cos(angle) * radius;
    var sy = cy + Math.sin(angle) * radius;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 3, 0, TAU);
    ctx.arc(cx, cy, innerRadius, 0, TAU, true);
    ctx.clip('evenodd');
    ctx.globalCompositeOperation = 'screen';
    var glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, radius * 0.94);
    glow.addColorStop(0, 'rgba(255, 222, 126, 0.17)');
    glow.addColorStop(0.22, 'rgba(255, 229, 157, 0.085)');
    glow.addColorStop(0.58, 'rgba(255, 235, 188, 0.027)');
    glow.addColorStop(1, 'rgba(255, 242, 214, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(cx - radius - 4, cy - radius - 4, (radius + 4) * 2, (radius + 4) * 2);

    ctx.lineCap = 'round';
    ctx.shadowColor = 'rgba(255, 232, 171, 0.11)';
    ctx.shadowBlur = 18;
    var annulusWidth = Math.max(1, radius - innerRadius);
    for (var i = -2; i <= 2; i++) {
      var spread = i * 0.043;
      var rayAngle = angle + Math.PI + spread;
      var rayLength = annulusWidth * (0.7 + (2 - Math.abs(i)) * 0.07);
      var ex = sx + Math.cos(rayAngle) * rayLength;
      var ey = sy + Math.sin(rayAngle) * rayLength;
      var lineGradient = ctx.createLinearGradient(sx, sy, ex, ey);
      lineGradient.addColorStop(0, 'rgba(255, 230, 166, ' + (0.075 - Math.abs(i) * 0.011) + ')');
      lineGradient.addColorStop(1, 'rgba(255, 226, 156, 0)');
      ctx.strokeStyle = lineGradient;
      ctx.lineWidth = i === 0 ? 1.8 : 0.9;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(ex, ey);
      ctx.stroke();
    }
    ctx.restore();
  }

  /** Restrained cool haze around the moon sector. */
  function drawMoonHaze(ctx, cx, cy, radius, angle) {
    var mx = cx + Math.cos(angle) * radius;
    var my = cy + Math.sin(angle) * radius;
    var haze = ctx.createRadialGradient(mx, my, 0, mx, my, radius * 0.22);
    haze.addColorStop(0, 'rgba(63, 214, 255, 0.16)');
    haze.addColorStop(0.42, 'rgba(63, 214, 255, 0.055)');
    haze.addColorStop(1, 'rgba(63, 214, 255, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = haze;
    ctx.beginPath();
    ctx.arc(mx, my, radius * 0.22, 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  /* ── UECorona: overlay single-canvas (Matahari + Bulan) ── */

  function UECorona() {
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ue-corona';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.width = 0;
    this.height = 0;
    this.dpr = 1;
    this._nextDrawAt = 0;
    this._sunKey = '';
    this._moonKey = '';
    this._scratch = {
      world: new THREE.Vector3(),
      toCenter: new THREE.Vector3()
    };
  }

  /** Ukur ulang backing store dengan budget (pola _resize diport). */
  UECorona.prototype.resize = function (width, height) {
    if (width === this.width && height === this.height) return;
    this.width = width; this.height = height;
    if (!this.ctx) return;
    var nativeDpr = Math.max(1, global.devicePixelRatio || 1);
    var pixelsScale = Math.sqrt(MAX_BACKING_PIXELS / Math.max(1, width * height));
    var dimensionScale = MAX_BACKING_DIMENSION / Math.max(width, height);
    var dpr = Math.min(nativeDpr, MAX_DEVICE_PIXEL_RATIO, pixelsScale, dimensionScale);
    var bw = Math.max(1, Math.round(width * dpr));
    var bh = Math.max(1, Math.round(height * dpr));
    if (this.canvas.width !== bw) this.canvas.width = bw;
    if (this.canvas.height !== bh) this.canvas.height = bh;
    this.canvas.style.width = width + 'px';
    this.canvas.style.height = height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.dpr = dpr;
    this._sunKey = ''; this._moonKey = ''; // paksa redraw pasca resize
  };

  /* ── proyeksi ── */
  var _fwd = new THREE.Vector3();
  var _dir = new THREE.Vector3();

  /** Proyeksi world→layar; null jika di belakang kamera / keluar NDC. */
  function projectToScreen(pos, camera, w, h, out) {
    // guard "di belakang kamera" (dot arah-forward, kamera) — NDC saja tidak
    // cukup: titik di belakang kamera bisa z dalam [-1,1] dan glow ter-cermin
    if (camera.quaternion) {
      _fwd.set(0, 0, -1).applyQuaternion(camera.quaternion);
      _dir.copy(pos).sub(camera.position);
      if (_dir.dot(_fwd) <= 0) return null;
    }
    out.copy(pos).project(camera);
    if (out.z > 1 || out.z < -1) return null;
    out.x = (out.x + 1) * 0.5 * w;
    out.y = (1 - out.y) * 0.5 * h;
    return out;
  }

  /**
   * Dipanggil per frame SETELAH render (matrix kamera sudah up-to-date).
   * camera = THREE.PerspectiveCamera, system = api UESolarSystem.
   */
  UECorona.prototype.tick = function (camera, system) {
    if (!this.ctx || this.width < 10 || this.height < 10) return;
    var now = performance.now();
    if (now < this._nextDrawAt) return;
    this._nextDrawAt = now + 1000 / MAX_FRAME_RATE;

    var w = this.width, h = this.height;
    var sun = system.bodies[system.byId('sun')];
    var moon = system.bodies[system.byId('moon')];
    if (!sun || !moon) { this._clear(); return; }

    var s = this._scratch;
    s.world.set(0, 0, 0); // matahari di origin
    var sunDist = camera.position.distanceTo(s.world);
    var sunDisc = bodyDiscScreenRadius(sun.body.radius, sunDist, h, camera.fov * Math.PI / 180);
    var sunPos = projectToScreen(s.world, camera, w, h, s.toCenter);

    moon.node.getWorldPosition(s.world);
    var moonDist = camera.position.distanceTo(s.world);
    var moonDisc = bodyDiscScreenRadius(moon.body.radius, moonDist, h, camera.fov * Math.PI / 180);
    var moonPos = projectToScreen(s.world, camera, w, h, s.toCenter);

    var ctx = this.ctx;

    /* ── hitung key layer (diport: render-key caching dari celestialRing) ── */
    var sunKey = '', moonKey = '';
    if (sunPos && sunDisc && sunDisc > 2.5) {
      var sr = Math.min(sunDisc, h * 0.46);
      sunKey = 's' + Math.round(sunPos.x) + ':' + Math.round(sunPos.y) + ':' + Math.round(sr);
    }
    if (moonPos && moonDisc && moonDisc > 1.6) {
      var mr = Math.min(moonDisc * 3.2, h * 0.30);
      moonKey = 'm' + Math.round(moonPos.x) + ':' + Math.round(moonPos.y) + ':' + Math.round(mr);
    }

    var anyDirty = (sunKey && sunKey !== this._sunKey) || (moonKey && moonKey !== this._moonKey);
    var anyGone = (!sunKey && this._sunKey) || (!moonKey && this._moonKey);
    if (!anyDirty && !anyGone) return; // tak ada perubahan — hemat frame

    /* ── satu pass penuh: clear + (sun: core+ray+arc) + (moon) ── */
    ctx.clearRect(0, 0, w, h);
    if (sunKey) {
      var r2 = Math.min(sunDisc, h * 0.46);
      this._paintCore(ctx, sunPos.x, sunPos.y, r2);
      drawSunRays(ctx, sunPos.x, sunPos.y, r2, Math.max(1, r2 * 0.86), 0);
      drawTaperedArc(ctx, sunPos.x, sunPos.y, r2, 0, '222, 190, 89', 0.56);
    }
    if (moonKey) {
      var r3 = Math.min(moonDisc * 3.2, h * 0.30);
      drawMoonHaze(ctx, moonPos.x, moonPos.y, r3, 0);
      drawTaperedArc(ctx, moonPos.x, moonPos.y, r3 * 0.9, 0, '48, 201, 229', 0.42);
    }
    this._sunKey = sunKey;
    this._moonKey = moonKey;
  };

  /* inti glow hangat — membingkai bola Matahari 3D (sprite corona di scene
     hanya additive-lemah; inti ini memberi "permukaan menyala" sinematik) */
  UECorona.prototype._paintCore = function (ctx, cx, cy, radius) {
    var core = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius * 1.06);
    core.addColorStop(0, 'rgba(255, 244, 214, 0)');
    core.addColorStop(0.72, 'rgba(255, 214, 138, 0.10)');
    core.addColorStop(0.92, 'rgba(255, 180, 92, 0.16)');
    core.addColorStop(1, 'rgba(255, 170, 80, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.06, 0, TAU);
    ctx.fill();
    ctx.restore();
  };

  UECorona.prototype._clear = function () {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.width, this.height);
    this._sunKey = '';
    this._moonKey = '';
  };

  UECorona.prototype.hide = function (hidden) {
    this.canvas.style.display = hidden ? 'none' : '';
    if (hidden) this._clear();
  };

  global.UECorona = {
    create: function () { return new UECorona(); },
    // ekspos untuk test (math murni)
    normalizeAngle: normalizeAngle,
    circularAngleDistance: circularAngleDistance,
    bodyDiscScreenRadius: bodyDiscScreenRadius
  };
})(window);
