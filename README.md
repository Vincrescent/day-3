# SOLAR WATCH

**Day 3 — 30 Days Build Challenge** · Interactive NASA-style 3D Solar System Explorer & Monitor

## Overview

Solar Watch is an interactive 3D solar-system monitoring and exploration application built with Three.js. It combines real-time orbital simulation, NASA asteroid data, spacecraft visualization, and a cinematic camera system into a professional scientific visualization experience.

## Features

### Core
- **Real-time 3D solar system** — All 8 planets + Sun + Moon with mathematically accurate Kepler orbital mechanics (J2000 elements, Newton-Raphson solver)
- **Time travel** — Date picker, play/pause, forward/backward, speed control (0.1x to 10,000x)
- **NASA NeoWs integration** — Live near-Earth asteroid tracking with custom date range queries
- **PHA alerts** — Potentially Hazardous Asteroid detection with browser notifications
- **Deep links** — Shareable URLs encoding focus, date, speed, and view mode

### 3D Assets
- **Official NASA GLB models** — Mercury, Venus, Earth, Jupiter, Saturn, Uranus, Neptune, Moon (all public domain)
- **Spacecraft** — ISS, Terra, TDRS, Firefly, Cassini (historical), Bennu asteroid
- **Procedural fallbacks** — Every planet has a procedural texture that loads instantly, upgraded to real NASA textures/models when available
- **On-demand loading** — Large models (ISS 62MB, Bennu 105MB) only load when focused

### Visualization
- **Orbital paths** — Toggleable orbit lines for planets and spacecraft
- **God's Eye Earth mode** — Atmosphere, clouds, night lights, satellite orbits
- **Cinematic camera** — Smooth transitions, follow mode, auto-orbit
- **Starfield** — 6,000 procedural stars with realistic color distribution

### UI/UX
- **Modern HUD** — Glassmorphism panels, dark theme, scientific aesthetic
- **Left explorer panel** — Planets, spacecraft, asteroids, meteor showers
- **Right info panel** — Detailed scientific data on click (mass, radius, atmosphere, orbit, etc.)
- **Responsive** — Desktop, tablet, and mobile layouts
- **Keyboard navigation** — Space (play/pause), arrows (time step), Q/E (orbit in Earth view), Escape (reset)

### Technical
- **PWA** — Installable, offline shell, asset caching
- **Zero build required** — Opens directly as index.html (also works via `npm run dev` with Vite)
- **Performance** — LOD via on-demand GLB loading, texture fallbacks, frustum culling, instancing
- **Error handling** — Graceful API failures, missing asset fallbacks, network-offline support

## Quick Start

```bash
# Option 1: Direct (zero dependencies)
# Just open index.html in a browser

# Option 2: Dev server (Vite)
npm install
npm run dev
# Open http://localhost:5173

# Option 3: Static server
python -m http.server 8000
# Open http://localhost:8000
```

## NASA API Configuration

Solar Watch uses `DEMO_KEY` for the NASA NeoWs API. This has rate limits (30 req/hour, 50 req/day per IP). For heavier use, get a free API key at https://api.nasa.gov and replace `DEMO_KEY` in the fetch calls.

## Deep Links

```
?focus=mars                    Focus on Mars
?focus=jupiter                 Focus on Jupiter
?focus=iss                     Focus on ISS
?focus=cassini                 Focus on Cassini
?focus=bennu                   Focus on Bennu
?focus=earth&mode=earth        Earth God's Eye view
?date=2024-01-01               Set simulation date
?speed=100                     Set simulation speed
?focus=saturn&date=2004-07-01  Saturn when Cassini arrived
```

## Architecture

```
solar-watch/
├── index.html                 # Complete application (HTML + CSS + JS)
├── vite.config.js             # Vite dev server config
├── package.json               # Dependencies (vite, three)
├── ASSET_LICENSES.md          # All asset sources and licenses
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   └── assets/
│       ├── textures/          # 2K planet texture maps (JPG)
│       ├── solar-system/      # NASA GLB planet models
│       │   ├── mercury/       # Mercury_1_4878.glb (3 MB)
│       │   ├── venus/         # Venus_1_12103.glb (292 KB)
│       │   ├── earth/         # Earth_1_12756.glb (13 MB)
│       │   ├── moon/          # moon_small.glb (14 MB)
│       │   ├── jupiter/       # Jupiter_1_142984.glb (11 MB)
│       │   ├── saturn/        # Saturn_1_120536.glb (5.3 MB)
│       │   ├── uranus/        # Uranus_1_51118.glb (169 KB)
│       │   └── neptune/       # Neptune_1_49528.glb (572 KB)
│       ├── spacecraft/        # NASA GLB spacecraft models
│       │   ├── iss/           # ISS (62 MB, on-demand)
│       │   ├── cassini/       # Cassini Assembly (2.3 MB)
│       │   ├── terra/         # Terra (2.1 MB)
│       │   ├── tdrs/          # TDRS (1.8 MB)
│       │   ├── firefly/       # Firefly (287 KB)
│       │   └── satellite-kit/ # Modular parts
│       └── small-bodies/
│           └── bennu/         # Bennu (105 MB, on-demand)
├── src/                       # Modular source (for future refactoring)
│   ├── data/bodies.js
│   ├── engine/kepler.js
│   ├── engine/time.js
│   ├── api/neows.js
│   └── state/url.js
└── test/
    └── e2e.cjs                # jsdom e2e test suite
```

## Data Sources & Licensing

- **Orbital elements**: NASA/JPL Standard Elements (J2000) — public domain
- **NeoWs API**: NASA Near-Earth Object Web Service — free public API
- **Meteor showers**: IAU Meteor Data Center — public scientific data
- **3D Models**: All from NASA (public domain, see ASSET_LICENSES.md)
- **Textures**: Solar System Scope (CC0) + threex.planets (public domain)

## Performance Notes

- Planets load immediately with procedural textures (~0.1s), real textures load asynchronously
- GLB models for planets load in background (~48 MB total for all planets + moon)
- ISS (62 MB) and Bennu (105 MB) only load when the user focuses on them
- Three.js 0.160.0 loaded from CDN with importmap (no bundling overhead)
- Service worker caches CDN libraries and textures for offline use

## Known Limitations

- Mars has no NASA GLB model; uses procedural texture + 2K map
- Sun has no GLB model (NASA only provides USDZ); uses emissive sphere
- NeoWs API `DEMO_KEY` has rate limits (get free key at api.nasa.gov)
- Asteroid 3D positions are approximate (arranged around Earth, not true orbital positions)
- Moon orbit is simplified (circular, 27.3-day period)
- Service worker requires HTTPS or localhost

## Verification

```bash
node test/e2e.cjs   # jsdom e2e tests
```
