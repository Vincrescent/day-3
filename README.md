# Universe Eye

### Observatorium pribadi — eksplorasi tata surya yang sinematik.

Buka, dan kamu melayang di antara delapan planet, Bulan, dan Matahari yang bernapas.
Seret untuk berputar, scroll untuk mendekat, klik sebuah planet — kamera membawamu
perlahan mendekat sementara bintang-bintang tetap di tempatnya.

*“Dari sini, segalanya terasa dekat.”*

```
┌────────────────────────────────────────────────────────────┐
│  UNIVERSE EYE                     ┌──────────────────────┐ │
│                                   │  PLANET             ✕ │ │
│        ·  ⊕  ─────────── ·        │  Jarak ke Matahari   │ │
│   ╭─────────────────────────╮     │  149,6 juta km (1AU) │ │
│   │      ○ ⊙  ·    ⊕       │     │  Periode orbit ...   │ │
│   ╰─────────────────────────╯     │                      │ │
│        [Merkurius][Venus][Bumi]   │  “Satu-satunya      │ │
│                                    │   tempat yang kita  │ │
│  seret · scroll · klik 1–9        │   ketahui…”         │ │
└────────────────────────────────────────────────────────────┘
```

## Menjalankan

**Opsi A — langsung:** buka `index.html` di browser. Semua yang dibutuhkan
(Three.js) dimuat dari CDN; tekstur Bumi lokal.

**Opsi B — server statis (disarankan):**
```bash
cd universe-eye
python -m http.server 8321     # atau: npx serve
# buka http://localhost:8321
```

Tidak perlu API key. Tidak perlu build step. 100% vanilla HTML/CSS/JS + Three.js (UMD).

## Fitur

| Fitur | Detail |
|---|---|
| Tata surya lengkap | Matahari + 8 planet + Bulan, orbit inklinasi nyata, kemiringan sumbu nyata |
| Kamera sinematik | Damping eksponensial (framerate-independent), intro drop, focus handoff 1–2 dtk, auto-tour |
| Panel info | Data publik per benda langit, kutipan, kredit sumber |
| Tekstur | Bumi = NASA Blue Marble (public domain); planet lain = **shader prosedural orisinal** (seam-free, fBm noise di arah bola) |
| Cincin Saturnus | Tekstur cincin prosedural + Celah Cassini |
| Matahari hidup | Korona sprite additive + denyut, PointLight pusat |
| Bintang | 28.000 partikel (field + pita Bimasakti) + 3 nebula, additive |
| Navigasi | Drag, scroll, pinch, klik (raycast drag-safe), label 3D, chips, keyboard `1–9` `0` `T` `O` `Esc` |
| Performa | Adaptive pixel-ratio (auto-drop DPR saat FPS <24), DPR cap 2, single draw batch |
| Aksesibilitas | `prefers-reduced-motion` (tanpa intro, damping pelan), ARIA labels, keyboard penuh |
| Fallback | Pesan jelas bila WebGL/Three.js tidak tersedia |

## Struktur (modular)

```
universe-eye/
├── index.html            # shell + CDN Three.js (fallback 2x) + noscript fallback
├── css/style.css         # design tokens (:root), tema observatorium, responsive
├── js/
│   ├── noise.js          # fBm value-noise 3D seamless + RNG seed (orisinal)
│   ├── starfield.js      # 28k bintang + Bimasakti + nebula (ShaderMaterial)
│   ├── solar-system.js   # data publik + tekstur prosedural + orbit + tick
│   ├── camera.js         # kamera bola + damping eksponensial + follow
│   ├── ui.js             # panel info, chips, labels, tour, keyboard
│   └── app.js            # orkestrator: renderer, raycast, adaptive DPR, loop
├── assets/textures/      # 4 tekstur Bumi (NASA, public domain) — 2.9 MB total
├── test/
│   ├── e2e.js            # harness jsdom 29 assertion (kode nyata, stub THREE)
│   └── stub-three.js     # stub THREE minimal untuk headless
├── ASSET_LICENSES.md     # provenance + lisensi setiap aset
├── DECISIONS.md          # catatan keputusan multi-agen (audit → desain → implementasi)
└── README.md
```

Setiap modul ≤ ~250 baris, single-responsibility, tanpa dependensi satu sama lain
kecuali urutan bootstrap di `index.html` (pola terinspirasi arsitektur modular
*God's Eye View* — MIT; **nol byte kode yang disalin**, hanya paterannya).

## Pengujian

```bash
node test/e2e.js    # → 29/29 checks passed
```
Harness menjalankan **kode produksi nyata** (noise, data, kamera, UI) di jsdom
dengan stub THREE. Menutupi: data, build tanpa canvas, chips, panel focus/hide,
toggle orbit, label, keyboard, tour, damping kamera, anti-XSS, error tak tertangkap.
WebGL rendering itu sendiri tetap butuh cek browser (lihat DECISIONS.md §7).

## Data & Aset (semua legal)

- Data orbit/planet: fakta publik (NASA/JPL/ESA) — public domain.
- Tekstur Bumi: NASA (public domain) via mirror three-globe.
- Semua visual lain: **dibuat orisinal** secara prosedural (noise.js).
- Detail: [`ASSET_LICENSES.md`](ASSET_LICENSES.md)

## Skala

Jarak antar-planet dan ukuran dibesar-kecilkan secara **visual** (kompresi) agar
seluruh sistem tetap terbaca dari satu sudut pandang — urutan, inklinasi, kemiringan
sumbu, dan rasio periode tetap akurat secara relatif. Ini pilihan artistik,
dipilih agar navigasi mulus, bukan simulasi fisika.

## Kredit

- Imagery Bumi: **NASA** (public domain), via [three-globe](https://github.com/vasturiano/three-globe)
- Three.js r128 (MIT) — [threejs.org](https://threejs.org/)
- Arsitektur modular terinspirasi *God's Eye View* (MIT, c. Bilawal Sidhu) — pola saja, bukan kodenya.
