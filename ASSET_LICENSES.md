# ASET LICENSES & PROVENANCE — Universe Eye

Semua aset dalam proyek ini diaudit oleh Riset Engineer (2026-09-08).
Prinsip: hanya public domain / permissive / orisinal. Kode pihak ketiga
MIT dipertahankan atribusinya sesuai syarat lisensi.

> **Catatan (2026-09-08, v1.1):** Kebijakan awal "0 byte dari referensi"
> **direvisi** atas izin eksplisit owner — kode MIT dari referensi boleh
> dipakai, asalkan atribusi MIT dipertahankan. Yang diambil: **bagian
> MURNI** (canvas 2D + math, bebas Cesium) dari `celestialRing.js` →
> diadaptasi ke `js/corona.js`. Kode Cesium-spesifik TIDAK diambil.

## 1. Tekstur Bumi (satu-satunya aset raster pihak ketiga)

| File | Isi | Sumber asli | Lisensi | Lokasi |
|---|---|---|---|---|
| earth-blue-marble.jpg | Peta siang Bumi 4096×2048 | NASA Blue Marble | Public domain (AS) | assets/textures/ |
| earth-night.jpg | Cahaya kota malam (Black Marble) | NASA | Public domain (AS) | assets/textures/ |
| earth-topology.png | Elevasi (bump map) | NASA/National Geographic | Public domain (AS) | assets/textures/ |
| earth-water.png | Mask air (specular) | NASA | Public domain (AS) | assets/textures/ |

Di-host ulang oleh [three-globe](https://github.com/vasturiano/three-globe)
(lisensi MIT; file ini publik domain dan boleh di-mirror). Diunduh dari
`cdn.jsdelivr.net/gh/vasturiano/three-globe@master/example/img/`.

**Attribution (wajib & sudah tampil di footer app):**
"Imagery Bumi: NASA (public domain) via three-globe"

## 2. Kode pihak ketiga

| Kode | Lisensi | Catatan |
|---|---|---|
| Three.js r128 (UMD) | MIT | Via cdnjs, fallback jsdelivr |
| `js/corona.js` (adaptasi) | **MIT** | Diadaptasi dari "God's Eye View" `src/celestialRing.js` (Bilawal Sidhu, 2026). Lihat §2a. |

### 2a. Adaptasi MIT — `corona.js` (wajib & sudah terpenuhi)

Sumber: **God's Eye View** — `src/celestialRing.js`, MIT License,
Copyright (c) 2026 Bilawal Sidhu.

**Bagian yang dipindahkan** (murni canvas-2D + math, bebas Cesium):
- `drawTaperedArc` — arc orbit tapered (canvas 2D)
- `drawSunRays` — sinar radial + glow corona
- `drawMoonHaze` — haze dingin Bulan
- `earthDiscScreenRadius` → digeneralisasi jadi `bodyDiscScreenRadius`
- `normalizeAngle`, `circularAngleDistance`
- Pola budget backing-pixel + frame-cap 30 fps + render-key caching

**Bagian TIDAK dipindahkan** (bergantung Cesium / simulasi satelit):
ephemeris, `projectEarthDiscToViewport`, `CelestialRing` class,
`renderGovernor`, ephemeris timer, marker DOM.

**Syarat MIT (atribusi) — STATUS:**
- ✅ Copyright notice + permissive grant disalin penuh di header `js/corona.js`
- ✅ Attribution juga di-`REPORT_QA.md` dan `DECISIONS.md`
- ⬜ Disarankan: tambah file `THIRD_PARTY_NOTICES.md` (tercantum di TODO QA)

**Orisinalitas identitas:** pola & math dipakai, tapi konteks, konstanta
tuning, layering, dan integrasi ke scene Universe Eye 100% orisinal.
Tidak ada penyalinan identitas/feel — ini adalah **adopsi kode permissif**
yang diizinkan owner, bukan penjiplakan.

## 3. Orisinal (tanpa lisensi pihak ketiga)

Semua file `js/*.js` selain adaptasi di §2a = karya orisinal Universe Eye:
- noise.js — value noise 3D + fBm + RNG seed
- starfield.js — 28.000 bintang, pita Bimasakti, nebula
- solar-system.js — 7 tekstur planet prosedural, cincin Saturnus, korona
- camera.js, ui.js, app.js, css/style.css
- (corona.js = adaptasi, lihat §2a)

## 4. Data (fakta ilmiah — public domain)

Jarak orbit (AU), periode, diameter, suhu, inklinasi, kemiringan sumbu:
data publik NASA/JPL/ESA. Fakta tidak dilindungi hak cipta; angka ditampilkan
sebagai informasi edukatif dengan kredit sumber per panel.

## 5. Yang TIDAK dipakai (audit negatif)

| Sumber | Alasan |
|---|---|
| Kode Cesium-spesifik God's Eye View | Bergantung Cesium + simulasi satelit/pesawat — tak portabel ke scene tata surya Three.js. Hanya bagian murni (canvas 2D + math) yang diambil (lihat §2a). |
| Data God's Eye View (Esri/Google/OSM/TeleGeography-NC) | Non-MIT, dilarang cache/rehost — 0 byte data. |
| Solar System Scope textures | CC BY 4.0, tapi endpoint /textures/* kini 404 (restrukturisasi situs) — tidak bisa divalidasi, pivot ke orisinal prosedural. |
| Google 3D Tiles / Esri | ToS melarang cache/rehost; domain bumi, bukan surya. |
| Poly Haven HDRI | Endpoint terblokir dari jaringan build; starfield prosedural sudah cukup. |
