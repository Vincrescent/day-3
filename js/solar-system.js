/* Universe Eye — solar-system.js
 * Data tata surya (fakta publik, public domain) + mesh + tekstur prosedural
 * orisinal (canvas, wrap-aware seam) + orbit line + animasi.
 * Bumi = satu-satunya tekstur raster (NASA public domain via three-globe).
 * Window.UESolarSystem, Window.UEPlanetData
 */
(function (global) {
  'use strict';

  // ---------- DATA ----------
  // Skala visual: jarak dipadatkan agar seluruh sistem tetap terbaca (visual compression);
  // urutan, kemiringan, inklinasi, dan rasio periode tetap akurat secara relatif.
  var AU = 'Jarak ke Matahari';
  var BODIES = [
    { id:'sun', name:'Matahari', latin:'Sol', kind:'star',
      radius:10, orbit:0, period:0, incl:0, tilt:7.25, spin:0.010, seed:3,
      color:0xffc46b,
      facts:[['Diameter','1.392.700 km'],['Permukaan','± 5.500 °C'],['Rotasi','25–35 hari'],['Umur','± 4,6 miliar tahun']],
      quote:'Bintang yang menjadi matahari bagi seluruh tata surya.',
      src:'NASA / ESA — data publik' },
    { id:'mercury', name:'Merkurius', latin:'Mercurius', kind:'planet',
      radius:1.0, orbit:24, period:87.97, incl:7.0, tilt:0.03, spin:0.020, seed:11,
      color:0x9a8f83,
      facts:[['Diameter','4.879 km'],[AU,'57,9 juta km (0,39 AU)'],['Periode orbit','88 hari'],['Suhu','−173 … 427 °C']],
      quote:'Terkecil dan tercepat — mengelilingi Matahari lebih cepat dari bulan purnama.',
      src:'NASA / JPL — data publik' },
    { id:'venus', name:'Venus', latin:'Venus', kind:'planet',
      radius:1.9, orbit:34, period:224.7, incl:3.39, tilt:177.4, spin:-0.016, seed:23,
      color:0xd8b98a,
      facts:[['Diameter','12.104 km'],[AU,'108,2 juta km (0,72 AU)'],['Periode orbit','225 hari'],['Suhu permukaan','± 465 °C']],
      quote:'Planet terpanas — selimut karbon dioksida yang tak tertembusi cahaya.',
      src:'NASA / ESA — data publik' },
    { id:'earth', name:'Bumi', latin:'Terra', kind:'planet',
      radius:2.0, orbit:45, period:365.25, incl:0.0, tilt:23.44, spin:0.030, seed:37,
      color:0x4a7fb5, realTexture:true,
      facts:[['Diameter','12.742 km'],[AU,'149,6 juta km (1 AU)'],['Periode orbit','365,25 hari'],['Suhu rata-rata','15 °C']],
      quote:'Satu-satunya tempat yang kita ketahui menatap kembali ke langit.',
      src:'Imagery: NASA (public domain) via three-globe' },
    { id:'moon', name:'Bulan', latin:'Luna', kind:'moon', parent:'earth',
      radius:0.6, orbit:4.4, period:27.32, incl:5.14, tilt:6.7, spin:0.012, seed:41,
      color:0xb9b6b0,
      facts:[['Diameter','3.474 km'],['Jarak ke Bumi','384.400 km'],['Periode orbit','27,3 hari'],['Peran','Menstabilkan sumbu Bumi']],
      quote:'Satelit tua yang menjaga kemiringan Bumi tetap tenang.',
      src:'NASA — data publik' },
    { id:'mars', name:'Mars', latin:'Mars', kind:'planet',
      radius:1.4, orbit:58, period:686.98, incl:1.85, tilt:25.19, spin:0.029, seed:53,
      color:0xb0532e,
      facts:[['Diameter','6.779 km'],[AU,'227,9 juta km (1,52 AU)'],['Periode orbit','687 hari'],['Suhu rata-rata','−63 °C']],
      quote:'Gurun merah — es di kutub, badai debu yang bisa menutupi planet.',
      src:'NASA / MRO — data publik' },
    { id:'jupiter', name:'Jupiter', latin:'Jupiter', kind:'planet',
      radius:5.5, orbit:95, period:4332.6, incl:1.30, tilt:3.13, spin:0.055, seed:67,
      color:0xc9a578,
      facts:[['Diameter','139.820 km'],[AU,'778,5 juta km (5,20 AU)'],['Periode orbit','11,9 tahun'],['Rotasi','9,9 jam']],
      quote:'Raksasa gas — Bintik Merah besarnya selebar Bumi.',
      src:'NASA / Juno — data publik' },
    { id:'saturn', name:'Saturnus', latin:'Saturnus', kind:'planet', rings:true,
      radius:4.8, orbit:130, period:10759, incl:2.49, tilt:26.73, spin:0.050, seed:71,
      color:0xd6bd8f,
      facts:[['Diameter','116.460 km'],[AU,'1,43 miliar km (9,54 AU)'],['Periode orbit','29,4 tahun'],['Kepadatan','lebih ringan dari air']],
      quote:'Mahkota cincin es — struktur yang bisa mengapung di lautan.',
      src:'NASA / Cassini — data publik' },
    { id:'uranus', name:'Uranus', latin:'Uranus', kind:'planet',
      radius:3.2, orbit:165, period:30687, incl:0.77, tilt:97.77, spin:-0.035, seed:83,
      color:0x7fd4d9,
      facts:[['Diameter','50.724 km'],[AU,'2,87 miliar km (19,2 AU)'],['Periode orbit','84 tahun'],['Kemiringan','97,8° — berbaring']],
      quote:'Berotasi dengan sisi — tiap musimnya berlangsung dua dekade penuh.',
      src:'NASA / Voyager 2 — data publik' },
    { id:'neptune', name:'Neptunus', latin:'Neptunus', kind:'planet',
      radius:3.1, orbit:195, period:60190, incl:1.77, tilt:28.32, spin:0.038, seed:97,
      color:0x2f5fd0,
      facts:[['Diameter','49.244 km'],[AU,'4,49 miliar km (30,1 AU)'],['Periode orbit','165 tahun'],['Angin','hingga 2.100 km/j']],
      quote:'Angin tercepat di tata surya, dibalut biru cobalt yang dalam.',
      src:'NASA / Voyager 2 — data publik' }
  ];

  global.UEPlanetData = BODIES;

  // ---------- TEKSTUR PROSEDURAL (orisinal, seam-free) ----------
  var W = 512, H = 256;

  function makeCanvas() {
    var cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    var ctx = cv.getContext('2d');
    if (!ctx) return null; // env tanpa canvas (headless) — fallback warna polos
    return { cv: cv, ctx: ctx, img: ctx.createImageData(W, H) };
  }

  function finalize(c) {
    c.ctx.putImageData(c.img, 0, 0);
    var tex = new THREE.CanvasTexture(c.cv);
    tex.anisotropy = 4;
    return tex;
  }

  function px(c, i, r, g, b) {
    var o = i * 4;
    c.img.data[o]     = r > 255 ? 255 : r;
    c.img.data[o + 1] = g > 255 ? 255 : g;
    c.img.data[o + 2] = b > 255 ? 255 : b;
    c.img.data[o + 3] = 255;
  }

  function wrapFb(u, v, scale, oct, lac, gain, offset) {
    return UENoise.wrapSample(u, v, function (uu, vv) {
      var d = UENoise.sphereDir(uu, vv);
      var o = offset || 0;
      return UENoise.fbm(d.x * scale + o, d.y * scale, d.z * scale, oct, lac, gain);
    });
  }

  function buildMercury(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var n  = wrapFb(u, v, 3.4, 5, 2.2, 0.55);
      var cr = wrapFb(u, v, 11.0, 3, 2.4, 0.5, 20);
      var m = 0.5 + 0.5 * n;
      var base = 96 + m * 74;
      var k = cr > 0.62 ? 0.78 : (cr < 0.30 ? 1.06 : 1.0);
      px(c, y * W + x, base * k, base * k * 0.96, base * k * 0.92);
    }
    return finalize(c);
  }

  function buildMoon(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var n = wrapFb(u, v, 4.5, 5, 2.2, 0.55);
      var mare = wrapFb(u, v, 1.7, 4, 2.2, 0.5, 9);
      var m = 0.5 + 0.5 * n;
      var base = 120 + m * 90;
      if (mare > 0.56) base *= 0.72;
      px(c, y * W + x, base, base * 0.99, base * 1.02);
    }
    return finalize(c);
  }

  function buildVenus(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var swirl = wrapFb(u, v, 2.0, 5, 2.3, 0.55);
      var band = Math.sin((v + swirl * 0.10) * 9.4 + swirl * 2.2);
      var t = 0.5 + 0.5 * band, m = 0.5 + 0.5 * swirl;
      px(c, y * W + x,
        214 + t * 22 - m * 14,
        178 + t * 26 - m * 10,
        128 + t * 30 - m * 8);
    }
    return finalize(c);
  }

  function buildMars(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var d = UENoise.sphereDir(u, v);
      var n = wrapFb(u, v, 3.1, 5, 2.2, 0.55);
      var maria = wrapFb(u, v, 1.6, 4, 2.3, 0.5, 4);
      var lat = Math.asin(d.y);
      var cap = UENoise.smoothstep(1.18, 1.42, Math.abs(lat)) * (0.75 + 0.25 * (0.5 + 0.5 * n));
      var m = 0.5 + 0.5 * n;
      var r = 150 + m * 70, g = 74 + m * 34, b = 40 + m * 20;
      if (maria > 0.58) { r *= 0.62; g *= 0.58; b *= 0.55; }
      r = r + (245 - r) * cap; g = g + (245 - g) * cap; b = b + (240 - b) * cap;
      px(c, y * W + x, r, g, b);
    }
    return finalize(c);
  }

  function buildJupiter(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var turb = wrapFb(u, v, 2.4, 5, 2.3, 0.55);
      var yw = v + turb * 0.045;
      var band = Math.sin(yw * 3.14159 * 8.6) * 0.5 + 0.5;
      var fine = Math.sin(yw * 3.14159 * 21 + turb * 3.0) * 0.5 + 0.5;
      var m = 0.5 + 0.5 * band;
      var r = 205 + m * 40 + fine * 12, g = 168 + m * 48 + fine * 8, b = 128 + m * 52;
      if (m < 0.32) { r = 148 + m * 60; g = 84 + m * 50; b = 52 + m * 40; }
      // Bintik Merah Besar (Great Red Spot)
      var du = Math.abs(u - 0.30); du = Math.min(du, 1 - du);
      var dv = v - 0.615;
      var dd = Math.sqrt(du * du * 3.4 + dv * dv * 26);
      if (dd < 0.20) {
        var s = 1 - dd / 0.20;
        var sw = Math.sin(dd * 40 + turb * 6) * 0.5 + 0.5;
        r = r * (1 - s) + (178 + sw * 30) * s;
        g = g * (1 - s) + (62 + sw * 22) * s;
        b = b * (1 - s) + (44 + sw * 16) * s;
      }
      px(c, y * W + x, r, g, b);
    }
    return finalize(c);
  }

  function buildSaturn(seed) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var turb = wrapFb(u, v, 2.0, 4, 2.3, 0.5);
      var band = Math.sin((v + turb * 0.03) * 3.14159 * 7.4) * 0.5 + 0.5;
      var m = 0.5 + 0.5 * band;
      px(c, y * W + x,
        202 + m * 34 + turb * 10,
        180 + m * 32 + turb * 8,
        138 + m * 30 + turb * 6);
    }
    return finalize(c);
  }

  function buildIceGiant(col1, col2, spotOn) {
    var c = makeCanvas(); if (!c) return null;
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var u = x / W, v = y / H;
      var turb = wrapFb(u, v, 1.8, 4, 2.2, 0.5);
      var band = Math.sin((v + turb * 0.02) * 3.14159 * 5.2) * 0.5 + 0.5;
      var m = 0.5 + 0.5 * band;
      var spot = 0;
      if (spotOn) {
        var du = Math.abs(u - 0.62); du = Math.min(du, 1 - du);
        var dv = v - 0.42;
        var dd = du * du * 6 + dv * dv * 30;
        spot = Math.max(0, 1 - Math.sqrt(dd)) * 0.28;
      }
      px(c, y * W + x,
        col1[0] + m * (col2[0] - col1[0]) + spot * 230,
        col1[1] + m * (col2[1] - col1[1]) + spot * 235,
        col1[2] + m * (col2[2] - col1[2]) + spot * 255);
    }
    return finalize(c);
  }

  function buildRingTexture() {
    var S = 1024, T = 64;
    var cv = document.createElement('canvas');
    cv.width = S; cv.height = T;
    var ctx = cv.getContext('2d');
    if (!ctx) return null;
    var img = ctx.createImageData(S, T);
    for (var x = 0; x < S; x++) {
      var t = x / S; // 0 = tepi dalam, 1 = tepi luar
      var n  = 0.5 + 0.5 * UENoise.noise3(t * 22, 3.7, 1.2);
      var n2 = 0.5 + 0.5 * UENoise.noise3(t * 90, 8.1, 4.4);
      var a = 0.55 + 0.35 * n + 0.25 * n2;
      if (t > 0.62 && t < 0.70) a *= 0.12;   // Celah Cassini
      if (t > 0.36 && t < 0.39) a *= 0.35;   // celah halus
      if (t < 0.06) a *= t / 0.06;
      if (t > 0.96) a *= (1 - t) / 0.04;
      var shade = 196 + n * 40 + n2 * 18;
      for (var y = 0; y < T; y++) {
        var o = (y * S + x) * 4;
        img.data[o] = shade; img.data[o + 1] = shade * 0.93; img.data[o + 2] = shade * 0.80;
        img.data[o + 3] = a * 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    return tex;
  }

  var TEX_BUILDS = {
    mercury: buildMercury, venus: buildVenus, mars: buildMars,
    jupiter: buildJupiter, saturn: buildSaturn, moon: buildMoon
  };

  // ---------- SCENE ----------
  // Periode visual: kompresi (hari^0.62) agar semua planet bergerak terbaca,
  // tetap menjaga urutan kecepatan (Merkurius tercepat, Neptunus terlama).
  var YEAR_UNITS = 34.0;
  function visualPeriod(days) { return Math.pow(days / 365.25, 0.62) * YEAR_UNITS; }

  function makeCorona(op) {
    var S = 256;
    var cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var ctx = cv.getContext('2d');
    if (!ctx) return null;
    var g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0.0, 'rgba(255,244,214,' + op + ')');
    g.addColorStop(0.25, 'rgba(255,196,110,' + (op * 0.55).toFixed(3) + ')');
    g.addColorStop(0.55, 'rgba(255,140,60,' + (op * 0.18).toFixed(3) + ')');
    g.addColorStop(1.0, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    var tex = new THREE.CanvasTexture(cv);
    return new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    }));
  }

  function build(assets) {
    var group = new THREE.Group();
    var bodies = [];      // record per benda
    var orbitLines = [];  // garis orbit (toggle-able)

    function materialFor(body, tex) {
      if (body.id === 'earth' && assets && assets.earthMap) {
        return new THREE.MeshPhongMaterial({
          map: assets.earthMap,
          bumpMap: assets.earthBump || null,
          bumpScale: 1.6,
          specularMap: assets.earthWater || null,
          specular: new THREE.Color(0x334455),
          shininess: 26,
          emissiveMap: assets.earthNight || null,
          emissive: new THREE.Color(0xffffff),
          emissiveIntensity: 0.85
        });
      }
      if (tex) return new THREE.MeshPhongMaterial({ map: tex, shininess: 5, specular: new THREE.Color(0x111111) });
      return new THREE.MeshPhongMaterial({ color: body.color, shininess: 5 });
    }

    function makeBody(body) {
      var seg = body.radius > 4 ? 56 : (body.radius > 2 ? 48 : 40);
      var geo = new THREE.SphereGeometry(body.radius, seg, Math.max(20, seg / 2 | 0));
      var tex = null;
      if (body.kind !== 'star' && !body.realTexture) {
        if (body.id === 'uranus') tex = buildIceGiant([92, 178, 186], [126, 214, 221], false);
        else if (body.id === 'neptune') tex = buildIceGiant([36, 74, 178], [62, 112, 214], true);
        else {
          var fn = TEX_BUILDS[body.id];
          if (fn) tex = fn(body.seed || 1);
        }
      }
      var mesh = new THREE.Mesh(geo, materialFor(body, tex));
      // kemiringan sumbu (axial tilt) — visual, di rotasi pada Z mesh
      mesh.rotation.z = (body.tilt * Math.PI / 180) * 0.5;
      mesh.userData.bodyId = body.id;

      var node = new THREE.Object3D();
      node.add(mesh);

      var rec = {
        body: body, mesh: mesh, node: node, pivot: null,
        worldPos: new THREE.Vector3(),
        phase: ((body.seed || 1) * 0.83) % 6.2831853
      };

      if (body.kind === 'star') {
        rec.node.position.set(0, 0, 0);
        var cor1 = makeCorona(0.9), cor2 = makeCorona(0.42);
        rec.corona = [cor1, cor2];
        if (cor1) rec.node.add(cor1);
        if (cor2) rec.node.add(cor2);
      }

      if (body.rings) {
        var ringTex = buildRingTexture();
        if (ringTex) {
          var inner = body.radius * 1.35, outer = body.radius * 2.35;
          var rg = new THREE.RingGeometry(inner, outer, 128, 1);
          var pos = rg.attributes.position, uv = rg.attributes.uv, v3 = new THREE.Vector3();
          for (var i = 0; i < pos.count; i++) {
            v3.fromBufferAttribute(pos, i);
            var rr = v3.length();
            uv.setXY(i, (rr - inner) / (outer - inner), 0.5);
          }
          var ring = new THREE.Mesh(rg, new THREE.MeshBasicMaterial({
            map: ringTex, side: THREE.DoubleSide, transparent: true,
            depthWrite: false, opacity: 0.96
          }));
          ring.rotation.x = Math.PI / 2;
          mesh.add(ring);
        }
      }
      return rec;
    }

    // orbit line: lingkaran lokal di bidang XZ, miring inklinasi + yaw per planet
    function makeOrbitPivot(body, rec) {
      var pivot = new THREE.Object3D();
      var e = (body.incl / 180) * Math.PI * 0.16; // inklinasi visual (diperkecil agar terbaca)
      pivot.rotation.set(e, ((body.seed || 1) * 0.71) % 6.283, 0, 'YXZ');
      group.add(pivot);
      rec.pivot = pivot;

      if (body.kind !== 'moon') {
        var N = 160, pts = [];
        for (var i = 0; i <= N; i++) {
          var a = (i / N) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * body.orbit, 0, Math.sin(a) * body.orbit));
        }
        var line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({ color: 0x5a6b8c, transparent: true, opacity: 0.20 })
        );
        pivot.add(line);
        orbitLines.push(line);
        rec.orbitLine = line;
      }
      return pivot;
    }

    for (var i = 0; i < BODIES.length; i++) {
      var body = BODIES[i];
      var rec = makeBody(body);
      bodies.push(rec);
      if (body.kind === 'star') {
        group.add(rec.node);
      } else if (body.parent) {
        var parentRec = bodies[byId(body.parent)];
        makeOrbitPivot(body, rec);
        parentRec.node.add(rec.pivot);   // pivot bulan mengikuti Bumi
      } else {
        makeOrbitPivot(body, rec);
        pivot_add(rec);
      }
    }

    function pivot_add(rec) { rec.pivot.add(rec.node); }
    function byId(id) {
      for (var i = 0; i < BODIES.length; i++) if (BODIES[i].id === id) return i;
      return 0;
    }

    // ---------- TICK ----------
    var t0 = 0;
    function tick(dt) {
      t0 += dt;
      for (var i = 0; i < bodies.length; i++) {
        var rec = bodies[i], b = rec.body;
        rec.mesh.rotation.y += b.spin * dt * 4;
        if (b.kind === 'star') {
          var pulse = 1 + Math.sin(t0 * 0.9) * 0.012;
          if (rec.corona[0]) rec.corona[0].scale.setScalar(b.radius * 3.1 * pulse);
          if (rec.corona[1]) rec.corona[1].scale.setScalar(b.radius * 5.6 * (2 - pulse));
          continue;
        }
        // sudut orbit pada lokal pivot (pivot memegang inklinasi + yaw)
        var a = rec.phase + (t0 / Math.max(1, visualPeriod(b.period))) * Math.PI * 2;
        rec.node.position.set(Math.cos(a) * b.orbit, 0, Math.sin(a) * b.orbit);
      }
      // posisi dunia (setelah seluruh node di-update)
      for (var j = 0; j < bodies.length; j++) bodies[j].node.getWorldPosition(bodies[j].worldPos);
    }

    var api = {
      group: group,
      bodies: bodies,
      orbitLines: orbitLines,
      tick: tick,
      byId: byId,
      focusDist: function (rec) { return rec.body.radius * 7 + 3; }
    };
    return api;
  }

  // ---------- ASET BUMI (public domain) ----------
  function loadEarthTextures(base, onProgress) {
    var loader = new THREE.TextureLoader();
    var paths = [
      ['earthMap', 'earth-blue-marble.jpg'],
      ['earthNight', 'earth-night.jpg'],
      ['earthBump', 'earth-topology.png'],
      ['earthWater', 'earth-water.png']
    ];
    var out = {}, done = 0;
    function step() {
      done++;
      if (onProgress) onProgress(done / paths.length);
    }
    function load(key, url) {
      return new Promise(function (resolve) {
        loader.load(
          base + url,
          function (tex) { out[key] = tex; if (tex.anisotropy !== undefined) tex.anisotropy = 4; step(); resolve(); },
          undefined,
          function () { step(); resolve(); }
        );
      });
    }
    return Promise.all(paths.map(function (p) { return load(p[0], p[1]); }))
      .then(function () { return out; });
  }

  global.UESolarSystem = { build: build, loadEarthTextures: loadEarthTextures, BODIES: BODIES };
})(window);
