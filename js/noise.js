/* Universe Eye — noise.js
 * Gradient value-noise 3D (seamless on a sphere when sampled from direction),
 * fBm, seeded RNG, and small math helpers. 100% orisinal, zero dependency.
 * Window.UENoise
 */
(function (global) {
  'use strict';

  // ---- deterministic RNG (mulberry32) ----
  function RNG(seed) {
    var s = seed >>> 0;
    this.next = function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---- gradient table (deterministic, no Math.random) ----
  var PERM = new Uint8Array(512);
  (function buildPerm() {
    var rng = new RNG(0x5EED12);
    var p = new Uint8Array(256);
    for (var i = 0; i < 256; i++) p[i] = i;
    for (var i2 = 255; i2 > 0; i2--) {
      var j = (rng.next() * (i2 + 1)) | 0;
      var t = p[i2]; p[i2] = p[j]; p[j] = t;
    }
    for (var k = 0; k < 512; k++) PERM[k] = p[k & 255];
  })();

  var G = [
    [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
    [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
    [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
    [1,1,0],[0,-1,1],[-1,1,0],[-1,0,-1]
  ];

  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function grad(hash, x, y, z) {
    var g = G[hash & 15];
    return g[0] * x + g[1] * y + g[2] * z;
  }

  // 3D gradient noise in ~[-1, 1]
  function noise3(x, y, z) {
    var X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
    x -= X; y -= Y; z -= Z;
    X &= 255; Y &= 255; Z &= 255;
    var u = fade(x), v = fade(y), w = fade(z);
    var A  = PERM[X] + Y,     B = PERM[X + 1] + Y;
    var AA = PERM[A] + Z,     AB = PERM[A + 1] + Z;
    var BA = PERM[B] + Z,     BB = PERM[B + 1] + Z;
    return lerp(
      lerp(
        lerp(grad(PERM[AA], x, y, z),     grad(PERM[BA], x - 1, y, z), u),
        lerp(grad(PERM[AB], x, y - 1, z), grad(PERM[BB], x - 1, y - 1, z), u), v),
      lerp(
        lerp(grad(PERM[AA + 1], x, y, z - 1),     grad(PERM[BA + 1], x - 1, y, z - 1), u),
        lerp(grad(PERM[AB + 1], x, y - 1, z - 1), grad(PERM[BB + 1], x - 1, y - 1, z - 1), u), v),
      w);
  }

  // fractal Brownian motion
  function fbm(x, y, z, octaves, lacunarity, gain) {
    var sum = 0, amp = 0.5, f = 1, norm = 0;
    for (var i = 0; i < octaves; i++) {
      sum += amp * noise3(x * f, y * f, z * f);
      norm += amp;
      amp *= gain;
      f *= lacunarity;
    }
    return sum / norm;
  }

  // unit-sphere direction from UV
  function sphereDir(u, v) {
    var lon = u * 6.283185307179586;
    var lat = (v - 0.5) * 3.141592653589793;
    var c = Math.cos(lat);
    return [c * Math.cos(lon), Math.sin(lat), c * Math.sin(lon)];
  }

  // wrap-aware noise sample: identical at u=0 and u=1 (seamless texture)
  function wrapSample(u, v, fn) {
    var du = 0.004; // one texel, so the wrap column copies u=0..1
    var a = fn(u, v);
    var b = fn(u < du ? 1 + u - du : u - du, v);
    return lerp(b, a, Math.min(1, u / du));
  }

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }
  function smoothstep(a, b, x) {
    var t = clamp01((x - a) / (b - a));
    return t * t * (3 - 2 * t);
  }

  global.UENoise = {
    RNG: RNG,
    noise3: noise3,
    fbm: fbm,
    sphereDir: sphereDir,
    wrapSample: wrapSample,
    clamp01: clamp01,
    smoothstep: smoothstep
  };
})(window);
