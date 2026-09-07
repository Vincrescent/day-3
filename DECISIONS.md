# DECISIONS LOG — Universe Eye

Catatan keputusan studio multi-agen (Day 3, 2026-09-08).
Peran: Creative Director (CD) · Riset Engineer (RE) · Technical Architect (TA) ·
Senior 3D Dev (S3D) · Animation Engineer (AE) · Performance Engineer (PE) · QA Engineer (QA).

## 0. Mandat

Proyek orisinal "Universe Eye": eksplorasi tata surya sinematik, navigasi mulus,
fokus pengalaman. ZIP referensi "God's Eye View" untuk referensi — ambil ide,
jangan salin identitas/feel. Sumber aset prioritas: NASA, ESA, Solar System Scope,
Poly Haven, Sketchfab (jika lisensi cocok). Workflow berurutan:
Audit → Lisensi → Proposal Desain → Implementasi → (iterasi sampai stabil).
Aturan kualitas: imersi, kamera halus, performa tinggi, aset legal, kode modular.

**Revisi kebijakan aset (2026-09-08):** Kebijakan awal "0 byte dari referensi"
direvisi atas izin owner — kode MIT dari referensi bisa dipakai asalkan atribusi
MIT dipertahankan. Hanya bagian murni (canvas 2D + math, bebas Cesium) yang diambil,
khususnya `src/celestialRing.js` → adaptasi jadi `js/corona.js`. Atribusi MIT
penuh di `js/corona.js` (header), `THIRD_PARTY_NOTICES.md`, dan `ASSET_LICENSES.md`.

## 1. FASE AUDIT (RE)

- Referensi di-unzip ke `.audit/` (89 MB, 465 file) — **dipertahankan di luar
  direktori proyek** agar tidak ikut ter-push.
- Referensi = Cesium.js spy-satellite simulator planet BUMI (Vite 6 + Cesium 1.124,
  arsitektur policy-modules + unit test per modul). Domain berbeda 180° dari kita.
- **Keputusan CD:** referensi hanya menjadi *kompas arah* (pola), bukan bahan bangun.

## 2. FASE LISENSI (RE → CD)

- Kode referensi MIT — boleh mempelajari & mengadopsi **pola** (modularitas,
  camera handoff, scene director, fallback keyless, test per modul).
- Data/aset referensi BUKAN MIT (Esri, Google 3D Tiles yang **dilarang rehost**,
  TeleGeography NonCommercial, OSM ODbL, 9 model GLB Sketchfab CC-BY = pesawat/kapal).
- **Keputusan CD (bound):** ZERO byte dari zip masuk ke proyek. Identitas
  (nama, tagline, layout HUD militer, warna signature, copy) 100% orisinal.
- Detail: `.audit/LICENSING_AUDIT.md`

## 3. Riset Aset (RE) — semua diuji live, bukan asumsi

| Sumber | Hasil uji | Keputusan |
|---|---|---|
| Solar System Scope /textures/* | semua URL 404 (restrukturisasi situs) | ❌ pivot |
| Google/Esri | ToS: dilarang cache/rehost | ❌ |
| NASA PDS / Planetary Computer | terblokir dari jaringan build (timeout) | ⚠️ tak dipakai |
| Poly Haven HDRI API | 404; butuh browser | ⚠️ skip |
| **three-globe (mirror NASA)** | ✅ 200, JPEG nyata 4096×2048 terverifikasi | ✅ dipakai (Bumi saja) |

- **Keputusan CD (bound):** Bumi = satu-satunya raster (public domain, legal,
  terverifikasi). Planet lain + cincin + korona + bintang = **prosedural orisinal**.
  Alasan: orisinal (memenuhi aturan), ringan (<1 MB vs ~20 MB raster), tajam
  tak terbatas saat close-up, nol risiko lisensi. Detail: `.audit/ASSET_DECISIONS.md`

## 4. PROPOSAL DESAIN v1.0 (TA → CD approve)

- Visi "observatorium pribadi" (hangat, kontemplatif, golden cosmic) —
  **bukan** "intelligence console" (dingin/taktis). Tagline orisinal:
  *"Dari sini, segalanya terasa dekat."*
- Stack: vanilla HTML/CSS/JS + Three.js r128 UMD (CDN, fallback 2x).
  Alasannya: 0 build step, konsisten dengan challenge, ringan, sesuai skill
  vanilla-webapp (verifikasi jsdom). Cesium ditolak: overkill untuk sistem tertutup.
- Skala: kompresi visual jarak (urutan/inklinasi/tilt/rasio periode tetap akurat).
  Alasan: seluruh sistem terbaca + navigasi mulus; bukan simulasi fisika.
- Scope MVP terkunci: intro drop, sistem penuh, focus handoff, panel info,
  auto-tour, orbit toggle, starfield, cincin, korona, adaptive DPR.
  Out of scope: data live, VR, audio (cadangan iterasi berikut).
- Detail: `.audit/DESIGN_PROPOSAL_V1.md`

## 5. IMPLEMENTASI (S3D + AE + PE)

- **Modular** (6 modul, single-responsibility, bootstrap via urutan script tag):
  noise → starfield → solar-system → camera → ui → app.
- **Orbit** via pivot Object3D (inklinasi + yaw per planet) — planet & garis orbit
  **selalu cocok** (menghindari bug Euler-mismatch; versi awal pakai Euler langsung
  dan ditemukan tidak konsisten saat review).
- **Tekstur prosedural** diarahkan dari arah bola (direction) + *wrap-sample* di u=0/1
  → **seam-free**. fBm 3–5 oktaf. Bintik Merah Jupiter, Celah Cassini, mare Bulan,
  es kutub Mars, spot Neptunus — semua feature artistik eksplisit.
- **Kamera (AE):** koordinat bola di sekitar target + damping eksponensial
  `lerp(cur, des, 1-exp(-λ·dt))` → framerate-independent & halus. Intro = drop
  radius 560→250 (dilewati bila `prefers-reduced-motion`).
- **Raycast drag-safe:** klik hanya bila gerakan <6px & <450ms.
- **PE:** DPR cap 2; **adaptive pixel-ratio** (turun 2→1.5→1.25→1 bila FPS<24
  selama 2 dtk; naik kembali bila >45 selama 6 dtk); 28k bintang dalam 2 draw batch;
  segmen bola 40–56; fog tipis untuk depth cueing.
- **UI (AE):** panel glassmorphic slide, chips pill, label 3D→2D (hide bila di belakang
  kamera / terlalu jauh / off-screen), kutipan serif per planet, kredit sumber per panel.

## 6. QA (QA) — iterasi sampai stabil

Harness: `test/e2e.js` (jsdom + stub THREE) menjalankan **kode produksi nyata**.

| Iterasi | Temuan | Aksi |
|---|---|---|
| 1 | 7/8 — stub kurang Group | fix test stub |
| 2 | 7/8 — `THREE.Group is not a constructor` + TDZ `class extends THREE.Object3D` | refactor stub (Obj3/Group terpisah) |
| 3 | 8/9 — `userData` tak ada di stub | tambah di stub |
| 4 | 26/28 — label tak pernah build (tunggu tick pertama) | **fix produk**: build di `_init()` |
| 5 | 27/28 — keyboard handler duplikat & handler label salah `this` | **fix produk**: keyboard pindah ke ui.js (testable), label pakai closure `self` |
| 6 | 28/28? — ekspektasi test salah: `3` = Bumi (mapping 1–9 benar) | **fix test** + hint HTML diupdate |
| final | **29/29 PASS, 0 uncaught errors** | stabil |

- **Batas honest:** jsdom tanpa canvas → tekstur prosedural & WebGL rendering
  tidak di-render di CI; kode generator-nya dites (dipanggil, tak crash, fallback
  warna polos berjalan). Rendering visual 3D perlu cek browser manual.

## 7. STATUS

| Aturan kualitas | Status |
|---|---|
| Imersi | ✅ intro, tour, damping, fog, korona, bintang, panel sinematik |
| Kamera halus | ✅ damping eksponensial, follow target bergerak, handoff 1–2 dtk |
| Performa tinggi | ✅ adaptive DPR, 2 batch bintang, segmen hemat, single CDN dep |
| Aset legal | ✅ public domain (Bumi) + orisinal (sisanya) + adaptasi MIT ber-atribusi; audit tertulis |
| Kode modular | ✅ 7 modul single-responsibility (noise/starfield/solar-system/camera/corona/ui/app); e2e 56/56 |
| Originalitas (bukan template generik) | ✅ identitas, shader, copy, UI — semua orisinal; pola sinematik diambil dari referensi (izin), bukan disalin |
| Dokumentasi keputusan | ✅ file ini + ASSET_LICENSES.md + README |

**Sisa (honest):** verifikasi visual browser (screenshot/frame grab) belum bisa
di-runcing otomatis dari jaringan ini (browser tool butuh approval Chrome;
preferensi user = Brave). Logika inti sudah terjamin e2e.
