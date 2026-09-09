// Keplerian orbital elements (J2000 epoch, NASA/JPL Standard elements)
// a (AU), e, i (deg), L (mean longitude), varpi (longitude of perihelion), Omega (ascending node), period (days)
export const BODIES = [
  { id:'sun',     name:'Sun',      type:'Star',   r:12, color:'#fbbf24',
    mass:'1.989 × 10³⁰ kg', radius:'696,340 km', diameter:'1,392,680 km',
    gravity:'274 m/s²', temperature:'5,778 K (surface)', moons:0,
    atmosphere:'Hydrogen (~73%), Helium (~25%)',
    description:'The Sun is the star at the center of the Solar System. It is a nearly perfect ball of hot plasma, heated to incandescence by nuclear fusion reactions in its core.' },

  { id:'mercury', name:'Mercury',  type:'Terrestrial Planet', r:2.2, color:'#a3a3a3',
    a:0.38709927, e:0.20563593, i:7.00497902,  L:252.25032350, varpi:77.45779628, Omega:48.33076593,  period:87.9691,
    mass:'3.301 × 10²³ kg', radius:'2,439.7 km', diameter:'4,879.4 km',
    gravity:'3.7 m/s²', orbitalPeriod:'87.97 days', rotationPeriod:'58.65 days',
    temperature:'167°C (mean)', moons:0,
    atmosphere:'Minimal — Oxygen, Sodium, Hydrogen traces',
    description:'Mercury is the smallest and closest planet to the Sun. Its surface is heavily cratered, resembling Earth\'s Moon.' },

  { id:'venus',   name:'Venus',    type:'Terrestrial Planet', r:3.5, color:'#e2a85a',
    a:0.72333566, e:0.00677672, i:3.39467605,  L:181.97909950, varpi:131.60246718, Omega:76.67984255,  period:224.701,
    mass:'4.867 × 10²⁴ kg', radius:'6,051.8 km', diameter:'12,103.6 km',
    gravity:'8.87 m/s²', orbitalPeriod:'224.7 days', rotationPeriod:'243.02 days (retrograde)',
    temperature:'464°C (surface)', moons:0,
    atmosphere:'CO₂ (96.5%), N₂ (3.5%) — extreme greenhouse',
    description:'Venus is the second planet from the Sun and the hottest in the Solar System due to its dense atmosphere causing a runaway greenhouse effect.' },

  { id:'earth',   name:'Earth',    type:'Terrestrial Planet', r:3.6, color:'#38bdf8',
    a:1.00000261, e:0.01671123, i:-0.00001531, L:100.46457166, varpi:102.93768193, Omega:0.0,          period:365.256,
    mass:'5.972 × 10²⁴ kg', radius:'6,371 km', diameter:'12,742 km',
    gravity:'9.807 m/s²', orbitalPeriod:'365.25 days', rotationPeriod:'23h 56m 4s',
    temperature:'15°C (mean)', moons:1,
    atmosphere:'N₂ (78%), O₂ (21%), Ar (0.93%)',
    description:'Earth is the third planet from the Sun and the only known astronomical object to harbor life. About 71% of its surface is covered in water.' },

  { id:'mars',    name:'Mars',     type:'Terrestrial Planet', r:2.8, color:'#ef4444',
    a:1.52368832, e:0.09339410, i:1.84969142,  L:355.45332585, varpi:336.04084226, Omega:49.57854322,  period:686.980,
    mass:'6.417 × 10²³ kg', radius:'3,389.5 km', diameter:'6,779 km',
    gravity:'3.72 m/s²', orbitalPeriod:'687 days', rotationPeriod:'24h 37m',
    temperature:'-65°C (mean)', moons:2,
    atmosphere:'CO₂ (95.3%), N₂ (2.7%), Ar (1.6%)',
    description:'Mars is the fourth planet from the Sun, known as the Red Planet due to iron oxide on its surface. It hosts Olympus Mons, the tallest volcano in the Solar System.' },

  { id:'jupiter', name:'Jupiter',  type:'Gas Giant', r:9, color:'#d4a574',
    a:5.20288700, e:0.04838624, i:1.30439695,  L:34.39644051, varpi:14.75385479,  Omega:100.55615209, period:4332.589,
    mass:'1.898 × 10²⁷ kg', radius:'69,911 km', diameter:'139,822 km',
    gravity:'24.79 m/s²', orbitalPeriod:'11.86 years', rotationPeriod:'9h 55m',
    temperature:'-110°C (cloud top)', moons:95,
    atmosphere:'H₂ (89.8%), He (10.2%)',
    description:'Jupiter is the fifth planet and the largest in the Solar System. Its Great Red Spot is a persistent anticyclonic storm larger than Earth.' },

  { id:'saturn',  name:'Saturn',   type:'Gas Giant', r:7.5, color:'#fcd34d',
    a:9.53667594, e:0.05386179, i:2.48599187,  L:49.95424423, varpi:92.43191814,  Omega:113.71503160, period:10759.22,
    mass:'5.683 × 10²⁶ kg', radius:'58,232 km', diameter:'116,464 km',
    gravity:'10.44 m/s²', orbitalPeriod:'29.46 years', rotationPeriod:'10h 42m',
    temperature:'-140°C (cloud top)', moons:146,
    atmosphere:'H₂ (96.3%), He (3.25%)',
    description:'Saturn is the sixth planet and second-largest. It is famous for its extensive ring system composed primarily of ice and rock particles.' },

  { id:'uranus',  name:'Uranus',   type:'Ice Giant', r:5.5, color:'#7dd3fc',
    a:19.18916464, e:0.04725744, i:0.77263783,  L:313.23810451, varpi:170.96424759, Omega:74.01692503,  period:30688.5,
    mass:'8.681 × 10²⁵ kg', radius:'25,362 km', diameter:'50,724 km',
    gravity:'8.87 m/s²', orbitalPeriod:'84.01 years', rotationPeriod:'17h 14m (retrograde)',
    temperature:'-195°C (cloud top)', moons:28,
    atmosphere:'H₂ (82.5%), He (15.2%), CH₄ (2.3%)',
    description:'Uranus is the seventh planet with an extreme axial tilt of 97.77°, essentially orbiting the Sun on its side. It was the first planet discovered with a telescope.' },

  { id:'neptune', name:'Neptune',  type:'Ice Giant', r:5.3, color:'#60a5fa',
    a:30.06992276, e:0.00859048, i:1.77004347,  L:304.88003275, varpi:44.97135788,  Omega:131.72169993, period:60182,
    mass:'1.024 × 10²⁶ kg', radius:'24,622 km', diameter:'49,244 km',
    gravity:'11.15 m/s²', orbitalPeriod:'164.8 years', rotationPeriod:'16h 6m',
    temperature:'-200°C (cloud top)', moons:16,
    atmosphere:'H₂ (80%), He (19%), CH₄ (1.5%)',
    description:'Neptune is the eighth and farthest known planet from the Sun. It has the strongest sustained winds of any planet, reaching speeds of 2,100 km/h.' },
];

export const SPACECRAFT = [
  { id:'iss', name:'International Space Station', type:'spacecraft', subtype:'Space Station',
    operator:'NASA / Roscosmos / ESA / JAXA / CSA', status:'Operational',
    orbit:'LEO ~408 km', purpose:'Microgravity research laboratory',
    orbitRadius:1.3, orbitInc:51.6, orbitSpeed:0.0006, orbitParent:'earth',
    description:'The ISS is the largest modular space station in low Earth orbit. It serves as a microgravity and space environment research laboratory.',
    color:'#38bdf8' },

  { id:'terra', name:'Terra (EOS AM-1)', type:'spacecraft', subtype:'Earth Observation Satellite',
    operator:'NASA', status:'Operational',
    orbit:'Sun-synchronous LEO ~705 km', purpose:'Earth science observation',
    orbitRadius:1.55, orbitInc:98.2, orbitSpeed:0.0005, orbitParent:'earth',
    description:'Terra is a NASA Earth-observing satellite launched in 1999. It carries five instruments studying Earth\'s atmosphere, land, water, and energy balance.',
    color:'#22c55e' },

  { id:'tdrs', name:'TDRS (Tracking & Data Relay)', type:'spacecraft', subtype:'Communication Satellite',
    operator:'NASA', status:'Operational',
    orbit:'GEO ~35,786 km', purpose:'Space-to-ground communication relay',
    orbitRadius:2.0, orbitInc:5, orbitSpeed:0.0002, orbitParent:'earth',
    description:'TDRS satellites provide continuous communication between Earth and spacecraft in low Earth orbit, including the ISS and Hubble.',
    color:'#a78bfa' },

  { id:'firefly', name:'Firefly', type:'spacecraft', subtype:'Heliophysics Satellite',
    operator:'NASA', status:'Operational',
    orbit:'LEO ~600 km', purpose:'Study terrestrial gamma-ray flashes',
    orbitRadius:1.45, orbitInc:45, orbitSpeed:0.00055, orbitParent:'earth',
    description:'Firefly is a CubeSat mission designed to study terrestrial gamma-ray flashes (TGFs) and their relationship to lightning.',
    color:'#f59e0b' },

  { id:'cassini', name:'Cassini-Huygens', type:'spacecraft', subtype:'Planetary Orbiter',
    operator:'NASA / ESA / ASI', status:'Mission Ended (Sept 15, 2017)',
    orbit:'Saturn orbit (historical)', purpose:'Saturn system exploration',
    orbitRadius:1.6, orbitInc:28, orbitSpeed:0.0003, orbitParent:'saturn',
    description:'Cassini was a NASA–ESA–ASI spacecraft that studied Saturn and its moons from 2004 to 2017. It was intentionally deorbited into Saturn\'s atmosphere.',
    historical:true, color:'#fbbf24' },

  { id:'bennu', name:'Bennu', type:'small-body', subtype:'Near-Earth Asteroid',
    operator:'—', status:'Sampled by OSIRIS-REx (2020)',
    orbit:'Near-Earth orbit ~1.126 AU', purpose:'Asteroid study & sample return',
    orbitRadius:0, orbitInc:0, orbitSpeed:0, orbitParent:null,
    description:'101955 Bennu is a carbonaceous near-Earth asteroid. NASA\'s OSIRIS-REx mission collected a sample from its surface in 2020 and returned it to Earth in 2023.',
    color:'#94a3b8',
    // Bennu orbital elements (approximate)
    a:1.12639, e:0.20375, i:6.0349, L:101.7, varpi:66.2, Omega:2.06, period:436.6 },
];

export const SHOWERS = [
  { name:'Quadrantids',  peakMonth:1,  peakDay:3,  active:'28 Dec – 12 Jan', zhr:110 },
  { name:'Lyrids',       peakMonth:4,  peakDay:22, active:'16–25 Apr',       zhr:18 },
  { name:'Eta Aquarids', peakMonth:5,  peakDay:6,  active:'19 Apr–28 May',   zhr:30 },
  { name:'Draconids',    peakMonth:10, peakDay:8,  active:'6–10 Oct',        zhr:10 },
  { name:'Perseids',     peakMonth:8,  peakDay:12, active:'17 Jul–24 Aug',   zhr:110 },
  { name:'Orionids',     peakMonth:10, peakDay:21, active:'2 Oct–7 Nov',     zhr:20 },
  { name:'Leonids',      peakMonth:11, peakDay:17, active:'6–30 Nov',        zhr:15 },
  { name:'Geminids',     peakMonth:12, peakDay:14, active:'4–20 Dec',        zhr:150 },
  { name:'Ursids',       peakMonth:12, peakDay:22, active:'15–25 Dec',       zhr:10 },
];

export const PLANET_INFO = {};
for (const b of BODIES) {
  PLANET_INFO[b.id] = b;
}
