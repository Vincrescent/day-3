# ASET LICENSES & PROVENANCE — Universe Eye

Semua aset dalam proyek ini diaudit oleh Riset Engineer (2026-09-08).
Prinsip: hanya public domain / permissive / orisinal. Tidak ada aset dari
referensi "God's Eye View" (0 byte).

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

## 3. Orisinal (tanpa lisensi pihak ketiga)

Semua file `js/*.js` kecuali import Three.js = karya orisinal Universe Eye:
- noise.js — value noise 3D + fBm + RNG seed
- starfield.js — 28.000 bintang, pita Bimasakti, nebula
- solar-system.js — 7 tekstur planet prosedural, cincin Saturnus, korona
- camera.js, ui.js, app.js, css/style.css

## 4. Data (fakta ilmiah — public domain)

Jarak orbit (AU), periode, diameter, suhu, inklinasi, kemiringan sumbu:
data publik NASA/JPL/ESA. Fakta tidak dilindungi hak cipta; angka ditampilkan
sebagai informasi edukatif dengan kredit sumber per panel.

## 5. Yang TIDAK dipakai (audit negatif)

| Sumber | Alasan |
|---|---|
| Kode/data God's Eye View | MIT kode boleh, tapi identitas & feel dilarang salin; data-nya non-MIT (Esri/Google/OSM/TeleGeography-NC). Keputusan: 0 byte. |
| Solar System Scope textures | CC BY 4.0, tapi endpoint /textures/* kini 404 (restrukturisasi situs) — tidak bisa divalidasi, pivot ke orisinal prosedural. |
| Google 3D Tiles / Esri | ToS melarang cache/rehost; domain bumi, bukan surya. |
| Poly Haven HDRI | Endpoint terblokir dari jaringan build; starfield prosedural sudah cukup. |
