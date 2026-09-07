/* Universe Eye — camera.js
 * Kamera sinematik orisinal: koordinat bola di sekitar target + damping
 * eksponensial (framerate-independent). FASE 5 — Animation Engineer.
 *
 *  - "follow"   : target mengejar benda langit bergerak (planet/Bulan)
 *  - "system"   : target Matahari, radius lebar
 *  - drag/pinch : input langsung ke parameter target (dipangkas damping)
 *  - reduced motion : damping lebih pelan, intro dilewati
 * Window.UECamera
 */
(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  function UECamera(camera, dom) {
    this.camera = camera;
    this.dom = dom;
    this.target = new THREE.Vector3(0, 0, 0);   // posisi target (dipangkas)
    this.theta = -2.4;        // sudut azimut (awal: jauh, miring)
    this.phi = 1.05;          // sudut elevasi (0 = atas, PI = bawah)
    this.radius = 560;        // jarak awal: "menukik" ke dalam
    this.tTheta = -0.5;       // parameter target (demping ke sini)
    this.tPhi = 1.08;
    this.tRadius = 250;
    this.minRadius = 6;
    this.maxRadius = 620;
    this.minPhi = 0.14;
    this.maxPhi = Math.PI - 0.14;
    this.dampOrbit = 2.6;     // lambda rotasi
    this.dampZoom = 3.2;      // lambda zoom
    this.dampTarget = 2.2;    // lambda penguncian target
    this.followRec = null;    // record benda yang di-follow
    this.enabled = true;
    this.reduced = (typeof global.matchMedia === 'function') &&
      global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduced) {
      this.dampOrbit = 1.4; this.dampZoom = 1.8; this.dampTarget = 1.6;
      this.radius = 250; this.theta = -0.5; this.phi = 1.08; // tanpa intro drop
    }
    this._dragging = false;
    this._lastX = 0; this._lastY = 0;
    this._pinchD = 0;
    this._bind();
  }

  UECamera.prototype._bind = function () {
    var self = this;
    var el = this.dom;
    el.style.touchAction = 'none';

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      self._dragging = true;
      self._lastX = e.clientX; self._lastY = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* ok */ }
      if (self.onUserInput) self.onUserInput();
    });
    el.addEventListener('pointermove', function (e) {
      if (!self._dragging) return;
      var dx = e.clientX - self._lastX;
      var dy = e.clientY - self._lastY;
      self._lastX = e.clientX; self._lastY = e.clientY;
      var k = 0.0052 * (self.reduced ? 0.7 : 1);
      self.tTheta -= dx * k;
      self.tPhi -= dy * k;
      self._clamp();
    });
    function endDrag() { self._dragging = false; }
    el.addEventListener('pointerup', endDrag);
    el.addEventListener('pointercancel', endDrag);
    el.addEventListener('pointerleave', endDrag);

    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      var f = Math.exp(e.deltaY * 0.0011);
      self.tRadius = Math.min(self.maxRadius, Math.max(self.minRadius, self.tRadius * f));
      if (self.onUserInput) self.onUserInput();
    }, { passive: false });

    // pinch (2 pointer)
    var pts = {};
    el.addEventListener('pointerdown', function (e) { pts[e.pointerId] = [e.clientX, e.clientY]; });
    el.addEventListener('pointermove', function (e) {
      if (!pts[e.pointerId]) return;
      pts[e.pointerId] = [e.clientX, e.clientY];
      var ids = Object.keys(pts);
      if (ids.length === 2) {
        var a = pts[ids[0]], b = pts[ids[1]];
        var d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (self._pinchD > 0) {
          var f = self._pinchD / Math.max(20, d);
          self.tRadius = Math.min(self.maxRadius, Math.max(self.minRadius, self.tRadius * f));
        }
        self._pinchD = d;
      }
    });
    function clearPts(e) { delete pts[e.pointerId]; self._pinchD = 0; }
    el.addEventListener('pointerup', clearPts);
    el.addEventListener('pointercancel', clearPts);
  };

  UECamera.prototype._clamp = function () {
    this.tPhi = Math.min(this.maxPhi, Math.max(this.minPhi, this.tPhi));
  };

  // fokus ke record (planet/Matahari/Bulan) — handoff halus
  UECamera.prototype.focusBody = function (rec, dist) {
    this.followRec = rec;
    var d = dist || rec.body.radius * 7 + 3;
    this.tRadius = Math.max(this.minRadius + 0.5, d);
    // geser sedikit agar planet tidak menempel di tengah (komposisi sinematik)
    this.tTheta += 0.35;
  };

  UECamera.prototype.goSystem = function () {
    this.followRec = null;
    this.tRadius = 250;
    this.tPhi = 1.08;
  };

  // pelan-pelan jauhkan (dipakai saat tour pindah planet)
  UECamera.prototype.pullBack = function () {
    this.tRadius = Math.min(this.maxRadius, this.tRadius * 2.4);
  };

  // damping eksponensial framerate-independent
  function damp(cur, des, lambda, dt) {
    return THREE.MathUtils.lerp(cur, des, 1 - Math.exp(-lambda * dt));
  }

  UECamera.prototype.update = function (dt) {
    if (dt <= 0) return;
    var d = Math.min(dt, 0.05);

    // target posisi: kejar benda yang di-follow
    var desired = new THREE.Vector3(0, 0, 0);
    if (this.followRec) desired.copy(this.followRec.worldPos);
    this.target.x = damp(this.target.x, desired.x, this.dampTarget, d);
    this.target.y = damp(this.target.y, desired.y, this.dampTarget, d);
    this.target.z = damp(this.target.z, desired.z, this.dampTarget, d);

    this.theta = damp(this.theta, this.tTheta, this.dampOrbit, d);
    this.phi = damp(this.phi, this.tPhi, this.dampOrbit, d);
    this.radius = damp(this.radius, this.tRadius, this.dampZoom, d);

    var sp = Math.sin(this.phi), cph = Math.cos(this.phi);
    var x = this.target.x + this.radius * sp * Math.sin(this.theta);
    var y = this.target.y + this.radius * cph;
    var z = this.target.z + this.radius * sp * Math.cos(this.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  };

  global.UECamera = UECamera;
})(window);
