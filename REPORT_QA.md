# Universe Eye — QA Report & Changelog

## v1.1 — QA Fix Pass (2026-09-08)

Revision ini menutup bug yang dilaporkan user ("planet tidak ada modelnya",
"posisi bulan di matahari", "kok ga jalan") dan menambahkan fitur yang
diadopsi dari pola arsitektur referensi (bukan kode).

---

### BUGS DIPERBAIKI (QA Engineer)

#### BUG-1: Bulan tidak mengorbit Bumi (terdampar di Matahari)
**Gejala:** Bulan tampil menempel di pusat sistem (di posisi Matahari).
**Akar masalah:** Di `solar-system.js`, pivot orbit bulan dibuat lalu
ditambahkan langsung ke `group` (root) alih-alih ke `node` Bumi. Akibatnya
bulan berputar mengelilingi origin, bukan mengelilingi Bumi yang bergerak.
**Fix:** Body berinduk (`kind==='moon'`) kini mem-parent pivot-nya ke
`parentRec.node` (node Bumi), dan `node` bulan masuk ke pivot. Rantai
`group → earthPivot → earthNode → moonPivot → moonNode` membuat posisi
bulan = posisi Bumi + offset orbit.
**Verifikasi:** e2e (jarak bulan-Bumi stabil 6.0) + live-app headless
WebGL2 (`live moon-orbit-earth dist=6.00`, `moon follows earth`).

#### BUG-2: Planet tampak "tidak ada modelnya"
**Gejala:** Planet lain (selain Bumi) tampak kosong/tak terlihat.
**Akar masalah (3 faktor):**
1. Radius planet terlalu kecil relatif pada jarak kamera awal, sehingga
   tersamar oleh fog + bintang.
2. Sisi gelap (night side) tanpa cahaya sama sekali — `ambient` rendah dan
   tanpa emissive, sehingga planet yang posisinya membelakangi Matahari
   tampak sebagai bintik hitam.
3. Tekstur prosedural di-build **serentak di boot** (≈5.7 detik blocking
   main thread), sehingga planet lama menampilkan placeholder gelap.
**Fix:**
- Radius planet dinaikkan (Mercury 1.6, Venus 2.9, Earth 3.0, Mars 2.2,
  Jupiter 7.5, Saturn 6.4, Uranus 4.4, Neptune 4.9).
- `AmbientLight` dinaikkan (0.5) + `DirectionalLight` rim (0.14, bluish)
  dari sisi berlawanan, sehingga sisi malam planet tetap terbaca.
- Material planet memakai `MeshPhongMaterial` dengan `emissive` turunan
  warna dasar + `emissiveIntensity` yang naik setelah tekstur siap —
   planet tidak lagi pernah menjadi bintik hitam total.
- Tekstur prosedural di-stagger: **1 per frame** via `stepTextures()` yang
   dipanggil dari render loop. Boot tak lagi membeku; planet muncul
   bertahap dengan progress bar.
**Verifikasi:** live-app `render 5 frames GL error=0`, `semua planet punya
geometry`, `textures: 8 planets have maps after stepTextures`.

#### BUG-3: "Kok ga jalan" — `window.UE.system` membeku `undefined`
**Gejala:** App kadang terlihat macet; probe/automation yang baca
`window.UE.system` dapat `undefined` sehingga dianggap "ga jalan".
**Akar masalah:** Di `app.js`, objek `UE` dibuat saat `init()` dengan
properti statis `system: system` — tapi `system` baru diisi di
`startWorld()` (asinkron, setelah `loadEarthTextures`). Nilai properti
statis itu **dibaca sekali saat objek literal dibuat**, jadi tetap `undefined`
seumur hidup, sementara `ready` (getter) sudah `true`.
**Fix:** Ganti `system`/`ui`/`cam` jadi **getter** yang membaca closure
`system`/`ui`/`cam` secara live, bukan snapshot.
**Verifikasi:** live-app `window.UE siap`, `system 10 bodies` (sebelumnya
`FAIL: Cannot read properties of undefined (reading 'bodies')`).

---

### FITUR BARU (diadopsi dari pola arsitektur referensi — orisinal, bukan salinan kode)

- **FITUR A — Time Control:** Tombol Pause/Resume + slider kecepatan
  0.25×–10× (log-scaled). `ui.timeScale` dikonsumsi `system.tick(dt, ts)`.
  Keyboard `Space` untuk pause/resume.
- **FITUR B — Scale Mode (Visual vs Orbit):**
  - *Visual* (default): jarak orbit dikompresi artistik agar sistem terbaca
    penuh dalam satu layar.
  - *Orbit-akurat*: 1 AU = 60 unit, jarak antar planet proporsional akurat
    (Neptunus 30.07 AU). `setScaleMode()` di-lerp halus antar mode;
    `maxRadius` kamera ikut naik (640→3600) + fog diperjarang.
  - Toggle di dock + keyboard `S`.
- **FITUR C — Labels & Focus:**
  - Label nama 3D→2D (diproyeksikan tiap frame), toggle di dock + keyboard `L`.
  - **Double-click** planet = fokus (di samping single-click yang sudah ada).
  - Hover highlight pada chip.
- **FITUR D — Cinematic Mode:**
  - Letterbox bars atas/bawah, UI disembunyikan, auto-tour berjalan.
  - Toggle di dock + keyboard `C`.
  - `window.UE` mem-ekspose handle untuk capture screenshot programatik.
- **FITUR E — Corona Overlay (adaptasi MIT):**
  - Overlay canvas-2D screen-space yang menggambar glow corona Matahari
    (sinar radial + arc tapered + inti hangat) dan halo dingin Bulan,
    diproyeksikan ke posisi 3D-nya per frame.
  - Code diadaptasi dari **God's Eye View** `src/celestialRing.js`
    (MIT, Bilawal Sidhu 2026) — bagian MURNI (canvas 2D + math, bebas
    Cesium) saja: `drawSunRays`, `drawTaperedArc`, `drawMoonHaze`,
    `*DiscScreenRadius`, `normalizeAngle`, `circularAngleDistance`, dan
    pola budget/frame-cap/caching-nya. Atribusi MIT dipertahankan di
    header `js/corona.js` + `THIRD_PARTY_NOTICES.md` + `ASSET_LICENSES.md`.
  - Performa: frame-cap 30 fps, budget backing-pixel, render-key caching
    (hanya gambar ulang saat posisi/radius berubah), guard
    behind-camera, `pointer-events:none`.
  - **Verifikasi:** live-app headless WebGL2 — corona canvas ter-mount,
    `corona drew 5981 alpha px (5597 warm)`, e2e 56/56.
- **FITUR F — Split-flap Departure Board (adaptasi MIT):**
  - Nama benda langit di panel info kini flip-mekanik per-karakter
    (kiri→kanan, cascade) seperti papan Solari bandara saat ganti fokus —
    bukan swap teks instan.
  - Code diadaptasi **utuh** dari **God's Eye View** `src/splitFlap.js`
    (521 baris, MIT, Bilawal Sidhu 2026) + blok CSS-nya. Kode 100% bebas
    Cesium (DOM + CSS murni), jadi port-nya setia: 4 invariant desain
    dipertahankan (textContent selalu truth & tak pernah kosong; satu timer
    per perubahan; kaskade terpotong flap dari glyph yang sedangnya
    ditampilkan; kolom tak pernah di-renumber).
  - Atribusi MIT: header `js/split-flap.js` + `THIRD_PARTY_NOTICES.md` §3
    + `ASSET_LICENSES.md` §2b.
  - Terintegrasi: `ui.js.showPanel()` memanggil `UESplitFlap.set(nameEl, ...)`.
    Kill-switch `SPLIT_FLAP_ENABLED=false` → kembali swap instan.
    `prefers-reduced-motion` → durasi kolaps ke 1ms.
  - **Verifikasi:** e2e 67/67 (plan/visibleGlyphs/shell/textContent truth);
    live probe browser nyata `test/qa/split-flap-live.html` — ALL PASS:
    mid-cascade host aktif + 8 cells + textContent selalu benar +
    cells dicabut setelah settle + `set(sama)=no-op`.

---

### ATURAN KUALITAS (terpenuhi)
| Aturan | Status | Bukti |
|---|---|---|
| Imersi prioritas | ✅ | Cinematic mode, intro drop, letterbox, tour, emissive planet |
| Kamera halus | ✅ | Damping eksponensial framerate-independent, handoff focus, `kamera damping konvergen` |
| Performa tinggi | ✅ | Adaptive DPR, tekstur stagger (tak blocking), `GL error=0`, e2e tanpa hang |
| Aset legal | ✅ | Bumi = NASA public domain; sisanya 100% prosedural orisinal; adaptasi MIT (corona.js, split-flap.js) ber-atribusi penuh |
| Kode modular | ✅ | 8 modul tanggung-jawab-tunggal, IIFE + "use strict", API `window.*` |

### HASIL TEST
- **e2e (jsdom + stub THREE):** 67/67 checks PASS
- **Live-app (headless Chrome, WebGL2 nyata):** LIVE-APP ALL PASS
  (UE siap, 10 bodies, moon-orbit-earth dist=6.00, render loop hidup,
  frame render terjadi, semua planet punya geometry, corona canvas mounted)
- **Diag WebGL (17 checks):** ALL PASS — termasuk `corona drew 5981 alpha px (5597 warm)`,
  `render 5 frames GL error=0`, `textures: 8 planets have maps`
- **Aset HTTP:** root + 7 JS + CSS + tekstur Bumi = 200
- **Lint:** `node --check` clean semua modul (termasuk corona.js)

### ARSITEKTUR MODUL (skala & tanggung jawab)
```
noise.js        → noise prosedural (value-noise 3D, fbm, seeded RNG)
starfield.js    → 20K bintang + nebula + Milky Way band
solar-system.js → data orbit (Visual + OrbitAcc) + mesh + tekstur staggered
                  + parenting hierarchy + 2 mode skala + time control
camera.js       → koordinat bola + damping eksponensial + focus/goSystem/
                  setScaleMode/pullBack + drag/pinch
corona.js       → overlay screen-space: glow corona Matahari + halo Bulan
                  (adaptasi MIT dari God's Eye View celestialRing.js)
ui.js           → panel info (split-flap header), chips, labels, dock, timebar,
                  toggle, keyboard, tour, escapeHTML (anti-XSS)
split-flap.js   → flip-mekanik per-karakter (adaptasi MIT God's Eye View)
app.js          → orkestrator: renderer, raycast drag-safe, double-click,
                  resize, boot, adaptive DPR, loop, handle window.UE (getter),
                  mount + tick corona overlay
```

### CATATAN QA (untuk iteration berikutnya)
- Fog visual (`0.00042`) bisa jadi sedikit terlalu tebal untuk mode Orbit
  pada radius >1000 — pertimbangkan kurva fog adaptif per-mode.
- `index-live.html` / `diag-real.html` dipindah ke `test/qa/` (bukan aset
  produk; hanya harness QA).
- Boot progress bar belum memetakan 8 tekstur staggered — saat ini hanya
  memetakan 4 tekstur raster Bumi. Opional: tambahkan hook
  `onTextureProgress` ke `stepTextures()`.
- Corona overlay: glow saat kamera sangat jauh dari Matahari (mode Orbit)
  bisa jadi terlalu kecil/konsentris — pertimbangkan floor radius minimum
  agar efek tetap terbaca, atau fade-out saat sunDisc < threshold.
- `THIRD_PARTY_NOTICES.md` sudah dibuat (TODO QA v1.1 ditutup ✅).
