/* Universe Eye — ui.js (v1.1)
 * Panel info, chips, labels 3D→2D, dock + kontrol baru:
 *   - time control (pause + speed 0.25x–10x)
 *   - scale mode (Visual / Orbit-akurat)
 *   - labels toggle, hover highlight
 *   - cinematic mode (letterbox + hide UI + auto-tour)
 * Semua teks di-escape. Keyboard lengkap.
 * Window.UEUI
 */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var ORDER = ['mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'];

  function UEUI(system, camera, app) {
    this.system = system;
    this.camera = camera;
    this.app = app;            // ref ke orkestrator (untuk cinematic/dpr/fps)
    this.labels = {};
    this.tourOn = false;
    this.tourIdx = -1;
    this.tourT = 0;
    this.tourStop = 10.5;
    this.labelsOn = true;
    this.orbitsOn = true;
    this.cinematic = false;
    this.timeScale = 1;        // 0 = pause
    this._labelsBuilt = false;
    this._proj = new THREE.Vector3();
    this._init();
  }

  UEUI.prototype._init = function () {
    var self = this;
    var chips = $('chips');
    chips.innerHTML = '';

    function chip(id, label) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.setAttribute('data-body', id);
      b.innerHTML = escapeHTML(label);
      b.addEventListener('click', function () { self.focusId(id); });
      chips.appendChild(b);
    }
    chip('system', '⌂ Sistem');
    for (var i = 0; i < ORDER.length; i++) {
      var rec = this.system.byId(ORDER[i]);
      chip(this.system.bodies[rec].body.id, this.system.bodies[rec].body.name);
    }

    $('btn-home').addEventListener('click', function () { self.goSystem(); });
    var bo = $('btn-orbits');
    bo.addEventListener('click', function () { self.setOrbits(!self.orbitsOn); });
    var bl = $('btn-labels');
    bl.addEventListener('click', function () { self.setLabels(!self.labelsOn); });
    var bs = $('btn-scale');
    bs.addEventListener('click', function () { self.toggleScale(); });
    var bci = $('btn-cine');
    bci.addEventListener('click', function () { self.toggleCinematic(); });
    var bt = $('btn-tour');
    bt.addEventListener('click', function () { self.setTour(!self.tourOn); });
    $('panel-close').addEventListener('click', function () { self.goSystem(); });

    // time control
    var tb = $('btn-pause');
    tb.addEventListener('click', function () { self.togglePause(); });
    var ts = $('speed');
    ts.addEventListener('input', function () {
      self.timeScale = parseFloat(ts.value);
      $('speed-val').textContent = self.timeScale.toFixed(2) + '×';
      self._syncPauseBtn();
    });

    this._buildLabels();
    this._bindKeyboard();
  };

  UEUI.prototype._bindKeyboard = function () {
    var self = this;
    global.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
      var k = e.key;
      if (k >= '1' && k <= '9') {
        self.focusId(ORDER[+k - 1]);
      } else if (k === '0') {
        self.goSystem();
      } else if (k === 't' || k === 'T') {
        self.setTour(!self.tourOn);
      } else if (k === 'o' || k === 'O') {
        self.setOrbits(!self.orbitsOn);
      } else if (k === 'l' || k === 'L') {
        self.setLabels(!self.labelsOn);
      } else if (k === ' ' || k === 'Spacebar') {
        e.preventDefault();
        self.togglePause();
      } else if (k === 's' || k === 'S') {
        self.toggleScale();
      } else if (k === 'c' || k === 'C') {
        self.toggleCinematic();
      } else if (k === 'Escape') {
        if (self.cinematic) self.toggleCinematic();
        else self.goSystem();
      }
    });
  };

  UEUI.prototype._buildLabels = function () {
    if (this._labelsBuilt) return;
    this._labelsBuilt = true;
    var wrap = $('labels');
    for (var i = 0; i < this.system.bodies.length; i++) {
      var rec = this.system.bodies[i];
      var el = document.createElement('div');
      el.className = 'body-label';
      el.innerHTML = '<span class="bl-dot" style="background:#' +
        rec.body.color.toString(16).padStart(6, '0') + '"></span>' +
        escapeHTML(rec.body.name);
      el.addEventListener('click', (function (r, s) { return function () { s.focusRec(r); }; })(rec, this));
      wrap.appendChild(el);
      this.labels[rec.body.id] = el;
    }
  };

  // ---------- NAVIGASI ----------
  UEUI.prototype.focusRec = function (rec) {
    this.camera.focusBody(rec);
    this.showPanel(rec);
    this._setActiveChip(rec.body.id);
  };

  UEUI.prototype.focusId = function (id) {
    if (id === 'system') { this.goSystem(); return; }
    var i = this.system.byId(id);
    if (i >= 0) this.focusRec(this.system.bodies[i]);
  };

  UEUI.prototype.goSystem = function () {
    this.camera.goSystem();
    this._hidePanel();
    this._setActiveChip('system');
    this.setTour(false);
  };

  UEUI.prototype._setActiveChip = function (id) {
    var chips = document.querySelectorAll('#chips .chip');
    for (var i = 0; i < chips.length; i++) {
      chips[i].classList.toggle('active', chips[i].getAttribute('data-body') === id);
    }
  };

  UEUI.prototype.showPanel = function (rec) {
    var b = rec.body;
    var panel = $('panel');
    panel.classList.remove('hidden');
    panel.classList.add('show');
    var eyebrow = $('p-eyebrow');
    if (eyebrow) {
      eyebrow.textContent = b.kind === 'star' ? 'bintang' : (b.kind === 'moon' ? 'satelit alami' : 'planet');
    }
    // flip-mekanik pada header — split-flap departure-board (adaptasi MIT)
    var nameEl = $('p-name');
    if (nameEl) UESplitFlap.set(nameEl, b.name);
    $('p-latin').textContent = b.latin;
    var facts = $('p-facts');
    facts.innerHTML = '';
    for (var i = 0; i < b.facts.length; i++) {
      var row = document.createElement('div');
      row.className = 'fact';
      var k = document.createElement('span'); k.className = 'fact-k'; k.textContent = b.facts[i][0];
      var v = document.createElement('span'); v.className = 'fact-v'; v.textContent = b.facts[i][1];
      row.appendChild(k); row.appendChild(v);
      facts.appendChild(row);
    }
    $('p-quote').textContent = '\u201C' + b.quote + '\u201D';
    $('p-src').textContent = b.src;
  };

  UEUI.prototype._hidePanel = function () {
    var panel = $('panel');
    panel.classList.add('hidden');
    panel.classList.remove('show');
  };

  // ---------- TOGGLES ----------
  UEUI.prototype.setOrbits = function (on) {
    this.orbitsOn = on;
    for (var i = 0; i < this.system.orbitLines.length; i++) this.system.orbitLines[i].visible = on;
    var b = $('btn-orbits');
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
  };

  UEUI.prototype.setLabels = function (on) {
    this.labelsOn = on;
    var b = $('btn-labels');
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
  };

  UEUI.prototype.toggleScale = function () {
    var next = this.system.mode() === 'visual' ? 'orbit' : 'visual';
    this.system.setScaleMode(next);
    this.camera.setScaleMode(next);
    var b = $('btn-scale');
    b.textContent = next === 'visual' ? 'Skala: Visual' : 'Skala: Orbit';
    b.setAttribute('aria-pressed', String(next === 'orbit'));
    // fog + starfield scale + camera limits via app callback
    if (this.app && this.app.onScaleMode) this.app.onScaleMode(next);
    // auto-adjust framing
    if (next === 'orbit') this.camera.tRadius = Math.max(this.camera.tRadius, 900);
    else this.camera.tRadius = Math.min(this.camera.tRadius, 420);
  };

  UEUI.prototype.toggleCinematic = function () {
    this.cinematic = !this.cinematic;
    document.body.classList.toggle('cinematic', this.cinematic);
    var b = $('btn-cine');
    b.setAttribute('aria-pressed', String(this.cinematic));
    b.classList.toggle('on', this.cinematic);
    if (this.cinematic) this.setTour(true);
    else { this.setTour(false); }
  };

  UEUI.prototype.setTour = function (on) {
    this.tourOn = on;
    this.tourT = 0;
    var b = $('btn-tour');
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
    b.innerHTML = on ? '&#10074;&#10074; Jeda' : '&#9654; Jelajahi';
    if (on) this._tourNext(true);
  };

  UEUI.prototype._tourNext = function (instant) {
    this.tourIdx = (this.tourIdx + 1) % ORDER.length;
    var i = this.system.byId(ORDER[this.tourIdx]);
    if (i < 0) { this.setTour(false); return; }
    if (this.camera.tRadius < 80) this.camera.pullBack();
    this.focusRec(this.system.bodies[i]);
    this.tourT = 0;
  };

  // ---------- TIME ----------
  UEUI.prototype.togglePause = function () {
    if (this.timeScale > 0) {
      this._prevSpeed = this.timeScale;
      this.timeScale = 0;
    } else {
      this.timeScale = this._prevSpeed || 1;
    }
    $('speed').value = String(this.timeScale);
    $('speed-val').textContent = this.timeScale.toFixed(2) + '×';
    this._syncPauseBtn();
  };
  UEUI.prototype._syncPauseBtn = function () {
    var b = $('btn-pause');
    b.innerHTML = this.timeScale > 0 ? '&#10074;&#10074; Pause' : '&#9654; Main';
    b.setAttribute('aria-pressed', String(this.timeScale === 0));
  };

  // ---------- TICK (dipanggil per frame dari app) ----------
  UEUI.prototype.tick = function (dt, camPos) {
    if (this.tourOn) {
      this.tourT += dt;
      if (this.tourT > this.tourStop) this._tourNext(false);
    }
    this._updateLabels(camPos);
  };

  UEUI.prototype._updateLabels = function (camPos) {
    if (!this.labelsOn) return;
    var mi = this.system.modeInfo();
    var w = global.innerWidth, h = global.innerHeight;
    var V = this._proj;
    for (var i = 0; i < this.system.bodies.length; i++) {
      var rec = this.system.bodies[i];
      var el = this.labels[rec.body.id];
      if (!el) continue;
      var pr = rec.body.radius || 1;
      V.copy(rec.worldPos).project(this.camera.camera);
      var behind = V.z > 1;
      var x = (V.x * 0.5 + 0.5) * w;
      var y = (-V.y * 0.5 + 0.5) * h;
      var dist = rec.worldPos.distanceTo(camPos);
      var tooFar = dist > mi.labelFar && rec.body.id !== 'sun';
      if (behind || x < -60 || x > w + 60 || y < -40 || y > h + 40 || tooFar) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
        el.style.left = x + 'px';
        el.style.top = (y - pr * (700 / Math.max(1, dist)) - 16) + 'px';
        el.style.opacity = String(dist > mi.labelFar * 0.7 ? 0.45 : 0.92);
      }
    }
  };

  UEUI.prototype.updateFPS = function (fps) {
    var el = $('fps');
    if (el) el.textContent = fps + ' fps';
  };

  global.UEUI = UEUI;
})(window);
