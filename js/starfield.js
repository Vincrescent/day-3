/* Universe Eye — starfield.js
 * 20.000 bintang (Points + sprite glow shader) + pita Bimasakti + 3 nebula
 * additive. Semua prosedural orisinal — tidak ada aset pihak ketiga.
 * Window.UEStarfield
 */
(function (global) {
  'use strict';

  var N_BRIGHT = 16000;
  var N_BAND   = 12000;
  var SPRITE_VS = [
    'attribute float aSize;',
    'attribute vec3 aColor;',
    'varying vec3 vColor;',
    'void main() {',
    '  vColor = aColor;',
    '  vec4 mv = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = aSize;',
    '  gl_Position = projectionMatrix * mv;',
    '}'
  ].join('\n');
  var SPRITE_FS = [
    'varying vec3 vColor;',
    'void main() {',
    '  vec2 c = gl_PointCoord - 0.5;',
    '  float d = length(c) * 2.0;',
    '  float g = exp(-d * d * 5.0) + 0.55 * exp(-d * 14.0);',
    '  gl_FragColor = vec4(vColor, 1.0) * g;',
    '}'
  ].join('\n');

  function makePoints(count, fill, rng, radius) {
    var pos = new Float32Array(count * 3);
    var col = new Float32Array(count * 3);
    var size = new Float32Array(count);
    for (var i = 0; i < count; i++) fill(i, pos, col, size, rng, radius);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    var mat = new THREE.ShaderMaterial({
      vertexShader: SPRITE_VS,
      fragmentShader: SPRITE_FS,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true
    });
    var pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return pts;
  }

  // spherical-shell fill for bright field stars
  function fillField(i, pos, col, size, rng, radius) {
    var u = rng.next(), v = rng.next();
    var th = u * 6.2831853;
    var ph = Math.acos(2 * v - 1);
    var r = radius * (0.75 + 0.25 * rng.next());
    pos[i * 3]     = r * Math.sin(ph) * Math.cos(th);
    pos[i * 3 + 1] = r * Math.cos(ph);
    pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    // spektral: biru-putih ~ kuning ~ oranye langka
    var t = rng.next();
    var b = 1.0, g = 1.0, rr = 1.0;
    if (t > 0.9) { rr = 1.0; g = 0.72; b = 0.5; }        // oranye
    else if (t > 0.72) { rr = 1.0; g = 0.88; b = 0.66; } // kuning
    else if (t < 0.18) { rr = 0.68; g = 0.8; b = 1.0; }  // biru
    var m = 0.35 + 0.65 * Math.pow(rng.next(), 2.2);
    col[i * 3] = rr * m; col[i * 3 + 1] = g * m; col[i * 3 + 2] = b * m;
    size[i] = 1.2 + Math.pow(rng.next(), 3.0) * 4.6;
  }

  // Bimasakti: pita gaussian mengikuti lingkaran besar yang dimiringkan
  function fillBand(i, pos, col, size, rng, radius) {
    var th = rng.next() * 6.2831853;
    var spread = (rng.next() + rng.next() + rng.next() - 1.5) * 0.16;
    var r = radius * (0.8 + 0.18 * rng.next());
    var c = Math.cos(th), s = Math.sin(th);
    // lokal: sepanjang pita = x, tebal = y, tinggi = z
    var lx = r * c;
    var ly = r * spread * 0.6;
    var lz = r * s;
    // miringkan pita (rotasi ~28° di X, ~62° di Y)
    var ax = 0.49, ay = 1.08, az = 0.24;
    var x = lx;
    var y = ly * Math.cos(ax) - lz * Math.sin(ax);
    var z = ly * Math.sin(ax) + lz * Math.cos(ax);
    var x2 = x * Math.cos(ay) + z * Math.sin(ay);
    var z2 = -x * Math.sin(ay) + z * Math.cos(ay);
    pos[i * 3] = x2 + (rng.next() - 0.5) * 40;
    pos[i * 3 + 1] = y + (rng.next() - 0.5) * 40;
    pos[i * 3 + 2] = z2 + (rng.next() - 0.5) * 40;
    var m = 0.10 + 0.3 * Math.pow(rng.next(), 2.0);
    var warm = 0.85 + 0.3 * rng.next();
    col[i * 3] = m * warm; col[i * 3 + 1] = m * 0.92; col[i * 3 + 2] = m * 0.8;
    size[i] = 1.0 + Math.pow(rng.next(), 2.5) * 3.2;
  }

  function makeNebulaTexture(tint) {
    var S = 256;
    var cv = document.createElement('canvas');
    cv.width = cv.height = S;
    var ctx = cv.getContext('2d');
    if (!ctx) return null;
    var img = ctx.createImageData(S, S);
    var rng = new UENoise.RNG(0x5EED01);
    for (var y = 0; y < S; y++) {
      for (var x = 0; x < S; x++) {
        var nx = (x / S - 0.5) * 3.2, ny = (y / S - 0.5) * 3.2;
        var n = 0.5 + 0.5 * UENoise.fbm(nx, ny, 7.7, 5, 2.1, 0.5);
        var fall = Math.exp(-((nx * nx + ny * ny) * 1.4));
        var a = Math.pow(n, 2.2) * fall * 0.6;
        var o = (y * S + x) * 4;
        img.data[o]     = tint[0] * a * 255;
        img.data[o + 1] = tint[1] * a * 255;
        img.data[o + 2] = tint[2] * a * 255;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    var tex = new THREE.CanvasTexture(cv);
    tex.needsUpdate = true;
    return tex;
  }

  function build() {
    var rng = new UENoise.RNG(0x5EED42);
    var group = new THREE.Group();

    var field = makePoints(N_BRIGHT, fillField, rng, 760);
    var band  = makePoints(N_BAND, fillBand, rng, 700);
    group.add(field, band);

    // nebula samar di kejauhan (additive, sangat redup — kesan dust kosmik)
    var tints = [[0.5, 0.62, 0.9], [0.9, 0.55, 0.45], [0.55, 0.85, 0.8]];
    var nebRng = new UENoise.RNG(0x5EED99);
    for (var i = 0; i < 3; i++) {
      var tex = makeNebulaTexture(tints[i]);
      if (!tex) continue; // env tanpa canvas — lewati nebula, jangan crash
      var spr = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.16,
        rotation: nebRng.next() * 6.283
      }));
      var th = nebRng.next() * 6.283, ph = 0.5 + nebRng.next() * 2.0;
      var rr = 640;
      spr.position.set(
        rr * Math.sin(ph) * Math.cos(th),
        rr * Math.cos(ph),
        rr * Math.sin(ph) * Math.sin(th)
      );
      spr.scale.setScalar(300 + nebRng.next() * 220);
      group.add(spr);
    }

    var api = {
      group: group,
      tick: function (dt) { /* bintang statis — tidak ada rotasi (realisme) */ }
    };
    return api;
  }

  global.UEStarfield = { build: build };
})(window);
