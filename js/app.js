/* Universe Eye — app.js
 * Orkestrator utama: setup renderer, raycast klik planet, resize,
 * shortcut keyboard, boot sequence, fallback tanpa WebGL.
 * IIFE + "use strict". Window.UE (bootstrap sekali pakai).
 */
(function (global) {
  'use strict';

  let booted = false;
  function init() {
    if (booted) return;
    booted = true;

    var viewport = document.getElementById('viewport');
    var intro = document.getElementById('intro');
    var loadbar = document.getElementById('loadbar');
    var no3dEl = document.getElementById('noscript');

    function fail(msg) {
      no3dEl.textContent = msg;
      no3dEl.classList.add('show');
      if (intro) intro.classList.add('done');
    }

    if (!global.THREE) {
      setTimeout(function () { fail('WebGL / Three.js tidak tersedia di browser ini. Coba browser modern (Chrome, Edge, Brave, Firefox).'); }, 2500);
      return;
    }

    // ---------- renderer ----------
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (err) {
      fail('WebGL tidak didukung oleh perangkat ini. Universe Eye membutuhkan WebGL 1.0/2.0.');
      return;
    }
    var DPR_CAP = Math.min(global.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(DPR_CAP);
    renderer.setSize(global.innerWidth, global.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    viewport.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060d);
    scene.fog = new THREE.FogExp2(0x05060d, 0.00042);

    var camera3d = new THREE.PerspectiveCamera(55, global.innerWidth / global.innerHeight, 0.1, 3000);

    // ---------- cahaya ----------
    scene.add(new THREE.AmbientLight(0x3a3f55, 0.55));
    var sunLight = new THREE.PointLight(0xfff0d8, 2.4, 0, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    var rim = new THREE.DirectionalLight(0x88aaff, 0.18);
    rim.position.set(-1, 0.4, -0.8);
    scene.add(rim);

    // ---------- world ----------
    var starfield = UEStarfield.build();
    scene.add(starfield.group);

    // ---------- boot: tekstur Bumi (public domain) lalu bangun tata surya ----------
    var system, ui, cam;
    function bootProgress(p) {
      if (loadbar) loadbar.style.width = (p * 100).toFixed(0) + '%';
    }

    function startWorld() {
      system = UESolarSystem.build(assets);
      scene.add(system.group);
      cam = new UECamera(camera3d, viewport);
      ui = new UEUI(system, cam);
      wireInput();
      bootProgress(1);
      hideIntro();
      loop();
    }

    var assets = {};
    UESolarSystem.loadEarthTextures('assets/textures/', bootProgress).then(function (a) {
      assets = a || {};
      startWorld();
    }).catch(function () {
      startWorld();
    });

    function hideIntro() {
      if (!intro) return;
      setTimeout(function () {
        intro.classList.add('done');
        setTimeout(function () {
          if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
        }, 1600);
      }, 450);
    }

    // ---------- input: klik planet (raycast, drag-safe) ----------
    var ray = new THREE.Raycaster();
    var ndc = new THREE.Vector2();
    var downX = 0, downY = 0, downT = 0;

    function pick(e) {
      ndc.x = (e.clientX / global.innerWidth) * 2 - 1;
      ndc.y = -(e.clientY / global.innerHeight) * 2 + 1;
      ray.setFromCamera(ndc, camera3d);
      var meshes = [];
      for (var i = 0; i < system.bodies.length; i++) meshes.push(system.bodies[i].mesh);
      var hits = ray.intersectObjects(meshes, false);
      if (!hits.length) return null;
      var id = hits[0].object.userData.bodyId;
      return system.bodies[system.byId(id)];
    }

    function wireInput() {
      var el = renderer.domElement;
      el.addEventListener('pointerdown', function (e) {
        downX = e.clientX; downY = e.clientY; downT = performance.now();
      });
      el.addEventListener('pointerup', function (e) {
        var moved = Math.hypot(e.clientX - downX, e.clientY - downY);
        var dt = performance.now() - downT;
        if (moved < 6 && dt < 450) {
          var rec = pick(e);
          if (rec) ui.focusRec(rec);
        }
      });
      if (cam && cam.onUserInput === undefined) cam.onUserInput = function () { if (ui) ui.setTour(false); };
      // keyboard navigation hidup di ui.js (UEUI._init)
    }

    // ---------- resize ----------
    global.addEventListener('resize', function () {
      camera3d.aspect = global.innerWidth / global.innerHeight;
      camera3d.updateProjectionMatrix();
      renderer.setSize(global.innerWidth, global.innerHeight);
    });

    // ---------- loop ----------
    // FASE 6 (Performance Engineer): adaptive pixel ratio.
    // Jika FPS turun <24 selama 2 detik, turunkan DPR satu level;
    // jika >45 selama 6 detik, naikkan kembali (max DPR_CAP).
    var DPR_LEVELS = [2, 1.5, 1.25, 1];
    var dprLevel = DPR_LEVELS.findIndex(function (v) { return v >= DPR_CAP; });
    if (dprLevel < 0) dprLevel = 0;
    var slowT = 0, fastT = 0;

    function setDpr() {
      var v = Math.min(DPR_LEVELS[dprLevel], DPR_CAP);
      if (renderer.getPixelRatio() !== v) {
        renderer.setPixelRatio(v);
        renderer.setSize(global.innerWidth, global.innerHeight);
      }
    }
    setDpr();

    var last = performance.now();
    var fpsT = 0, fpsN = 0;
    function loop() {
      requestAnimationFrame(loop);
      var now = performance.now();
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      system.tick(dt);
      starfield.tick(dt);
      cam.update(dt);
      ui.tick(dt, camera3d.position);

      fpsT += dt; fpsN++;
      if (fpsT >= 0.5) {
        var fps = Math.round(fpsN / fpsT);
        ui.updateFPS(fps);
        // adaptive quality
        if (fps < 24 && dprLevel < DPR_LEVELS.length - 1) {
          slowT += fpsT; fastT = 0;
          if (slowT > 2) { dprLevel++; slowT = 0; setDpr(); }
        } else if (fps > 45 && dprLevel > 0) {
          fastT += fpsT; slowT = 0;
          if (fastT > 6) { dprLevel--; fastT = 0; setDpr(); }
        } else { slowT = 0; fastT = 0; }
        fpsT = 0; fpsN = 0;
      }

      renderer.render(scene, camera3d);
    }

    global.UE = {
      version: '1.0.0',
      renderer: renderer,
      scene: scene,
      camera: camera3d,
      system: null,
      ui: null,
      get ready() { return !!system; }
    };
    global.UE.system = system;
    global.UE.ui = ui;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
