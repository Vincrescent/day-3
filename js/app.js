/* Universe Eye — app.js (v1.1)
 * Orkestrator utama: renderer, raycast (drag-safe), double-click focus,
 * resize, boot sequence, adaptive DPR, time control, scale mode, cinematic.
 * IIFE + "use strict".
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
    renderer.domElement.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    viewport.appendChild(renderer.domElement);

    var scene = new THREE.Scene();
    scene.background = new THREE.Color(0x05060d);
    scene.fog = new THREE.FogExp2(0x05060d, 0.00042);

    var camera3d = new THREE.PerspectiveCamera(55, global.innerWidth / global.innerHeight, 0.1, 6000);

    // ---------- cahaya ----------
    scene.add(new THREE.AmbientLight(0x4a5070, 0.5));   // dinaikkan agar sisi malam planet terbaca
    var sunLight = new THREE.PointLight(0xfff0d8, 2.2, 0, 2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);
    var rim = new THREE.DirectionalLight(0x88aaff, 0.14);
    rim.position.set(-1, 0.4, -0.8);
    scene.add(rim);

    // ---------- world ----------
    var starfield = UEStarfield.build();
    scene.add(starfield.group);

    // overlay sinematik screen-space (corona Matahari + halo Bulan)
    // — adaptasi MIT dari God's Eye View / celestialRing.js (lihat kepala corona.js)
    var corona = UECorona.create();
    viewport.appendChild(corona.canvas);
    corona.resize(global.innerWidth, global.innerHeight);
    corona.hide(true); // muncul setelah intro

    var system, ui, cam;
    var appRef = {
      onScaleMode: function (m) {
        var mi = system.modeInfo();
        scene.fog.density = mi.fog;
        starfield.group.scale.setScalar(mi.starScale);
      }
    };

    function bootProgress(p) {
      if (loadbar) loadbar.style.width = (p * 100).toFixed(0) + '%';
    }

    function startWorld() {
      system = UESolarSystem.build(assets);
      scene.add(system.group);
      cam = new UECamera(camera3d, viewport);
      ui = new UEUI(system, cam, appRef);
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
        corona.hide(false);
        setTimeout(function () {
          if (intro && intro.parentNode) intro.parentNode.removeChild(intro);
        }, 1600);
      }, 450);
    }

    // ---------- input: raycast klik + double-click ----------
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
      return system.bodies[system.byId(hits[0].object.userData.bodyId)];
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
      if (cam && cam.onUserInput === undefined) cam.onUserInput = function () {
        if (!ui) return;
        // FITUR G: cancelFlight reflex — SEMANTIK input manual (drag/wheel)
        // meng-interrupt verb aktif (auto-orbit / dolly), instan, tanpa ease.
        // (dari cameraVerbs.js: "ANY manual camera input reclaims control")
        if (ui.slot.active) ui.slot.interrupt('manual-input');
        ui._dollyRunning = false;
        if (ui.tourOn) ui.setTour(false);
      };
      // keyboard navigation hidup di ui.js
    }

    // ---------- resize ----------
    global.addEventListener('resize', function () {
      camera3d.aspect = global.innerWidth / global.innerHeight;
      camera3d.updateProjectionMatrix();
      renderer.setSize(global.innerWidth, global.innerHeight);
      corona.resize(global.innerWidth, global.innerHeight);
    });

    // ---------- loop ----------
    // Adaptive pixel ratio (Performance Engineer): turunkan DPR bila FPS <24,
    // naikkan kembali bila >45 selama 6 detik.
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

      // proses 1 tekstur prosedural per frame (tak memblokir main thread)
      if (system.texturesRemaining() > 0) system.stepTextures();

      system.tick(dt, ui.timeScale);
      starfield.tick(dt);
      cam.update(dt);
      ui.tick(dt, camera3d.position);

      fpsT += dt; fpsN++;
      if (fpsT >= 0.5) {
        var fps = Math.round(fpsN / fpsT);
        ui.updateFPS(fps);
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
      // overlay screen-space: proyeksi per frame, hanya kalau kamera berubah
      if (system) corona.tick(camera3d, system);
    }

    global.UE = {
      version: '1.1.0',
      renderer: renderer,
      scene: scene,
      camera: camera3d,
      // getter: `system`/`ui` terisi saat startWorld() (asinkron) — prop statis
      // akan membeku di undefined (ditemukan QA probe live-app)
      get ready() { return !!system; },
      get system() { return system; },
      get ui() { return ui; },
      get cam() { return cam; }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
