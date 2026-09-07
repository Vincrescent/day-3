/* Universe Eye — ui.js
 * Panel info (Bahasa Indonesia), chips navigasi, label 3D→2D, dock, FPS.
 * Semua teks di-escape (escapeHTML) — tidak ada injection.
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

  function UEUI(system, camera) {
    this.system = system;
    this.camera = camera;
    this.labels = {};
    this.tourOn = false;
    this.tourIdx = -1;
    this.tourT = 0;
    this.tourStop = 9.5;       // detik per pemberhentian
    this.labelsOn = true;
    this.orbitsOn = true;
    this._labelsBuilt = false;
    this._proj = new THREE.Vector3();
    this._init();
  }

  UEUI.prototype._init = function () {
    var self = this;
    var chips = $('chips');
    chips.innerHTML = '';

    function chip(id, label, glyph) {
      var b = document.createElement('button');
      b.className = 'chip';
      b.setAttribute('data-body', id);
      b.innerHTML = '<span class="glyph">' + glyph + '</span>' + escapeHTML(label);
      b.addEventListener('click', function () { self.focusId(id); });
      chips.appendChild(b);
    }
    chip('system', 'Sistem', '&#8962;');
    var order = ['mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'];
    for (var i = 0; i < order.length; i++) {
      var rec = this.system.byId(order[i]);
      var b = this.system.bodies[rec];
      chip(b.body.id, b.body.name, '\u25CF');
    }

    $('btn-home').addEventListener('click', function () { self.goSystem(); });
    var bo = $('btn-orbits');
    bo.addEventListener('click', function () { self.setOrbits(!self.orbitsOn); });
    var bt = $('btn-tour');
    bt.addEventListener('click', function () { self.setTour(!self.tourOn); });
    $('panel-close').addEventListener('click', function () { self.goSystem(); });

    this._buildLabels();

    // keyboard navigation (1-8 = planet, 0 = sistem, T = jelajahi, O = orbit, Esc = keluar)
    global.addEventListener('keydown', function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      var k = e.key;
      if (k >= '1' && k <= '8') {
        var ids = ['mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'];
        self.focusId(ids[+k - 1]);
      } else if (k === '0') {
        self.goSystem();
      } else if (k === 't' || k === 'T') {
        self.setTour(!self.tourOn);
      } else if (k === 'o' || k === 'O') {
        self.setOrbits(!self.orbitsOn);
      } else if (k === 'Escape') {
        self.goSystem();
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
      el.addEventListener('click', (function (r, s) { return function () { s.focusRec(r); }; })(rec, self));
      wrap.appendChild(el);
      this.labels[rec.body.id] = el;
    }
  };

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
    $('p-eyebrow').textContent = b.kind === 'star' ? 'bintang' : (b.kind === 'moon' ? 'satelit alami' : 'planet');
    $('p-name').textContent = b.name;
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
    var panel = $('panel');
    panel.classList.remove('hidden');
    panel.classList.add('show');
  };

  UEUI.prototype._hidePanel = function () {
    var panel = $('panel');
    panel.classList.add('hidden');
    panel.classList.remove('show');
  };

  UEUI.prototype.setOrbits = function (on) {
    this.orbitsOn = on;
    var lines = this.system.orbitLines;
    for (var i = 0; i < lines.length; i++) lines[i].visible = on;
    var b = $('btn-orbits');
    b.setAttribute('aria-pressed', String(on));
    b.classList.toggle('on', on);
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
    var ids = ['mercury','venus','earth','moon','mars','jupiter','saturn','uranus','neptune'];
    this.tourIdx = (this.tourIdx + 1) % ids.length;
    var i = this.system.byId(ids[this.tourIdx]);
    if (i < 0) { this.setTour(false); return; }
    if (instant || this.camera.tRadius < 60) this.camera.pullBack();
    this.focusRec(this.system.bodies[i]);
    this.tourT = 0;
  };

  UEUI.prototype.tick = function (dt, camPos) {
    // tour otomatis
    if (this.tourOn) {
      this.tourT += dt;
      if (this.tourT > this.tourStop) this._tourNext(false);
    }
    this._updateLabels(camPos);
  };

  UEUI.prototype._updateLabels = function (camPos) {
  if (!this.labelsOn && this._labelsBuilt) return;
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
      // sembunyikan label yang jauh & kecil (kecuali saat di-follow)
      var tooFar = dist > 380 && rec.body.id !== 'sun';
      if (behind || x < -60 || x > w + 60 || y < -40 || y > h + 40 || tooFar) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
        el.style.left = x + 'px';
        el.style.top = (y - pr * (640 / Math.max(1, dist)) - 14) + 'px';
        var op = dist > 300 ? 0.45 : 0.9;
        el.style.opacity = String(op);
      }
    }
  };

  UEUI.prototype.updateFPS = function (fps) {
    var el = $('fps');
    if (el) el.textContent = fps + ' fps';
  };

  global.UEUI = UEUI;
})(window);
