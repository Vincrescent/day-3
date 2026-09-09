// Kepler orbital mechanics — J2000 epoch solver
// Source: NASA/JPL Standard elements (public domain)

export const AU_PX = 180;
export const MS_PER_DAY = 86400000;
export const JD2000_UNIX = 946728000000;
export const DEG = Math.PI / 180;

/**
 * Compute heliocentric position of a body at time t (ms since epoch)
 * Returns {x, y, z} in AU-scaled pixels, rAU (distance in AU), vKms (velocity km/s)
 */
export function heliocentric(b, t) {
  const d = (t - JD2000_UNIX) / MS_PER_DAY;
  const n = 360 / b.period;
  const M = (b.L - b.varpi + n * d);
  const M2 = ((M % 360) + 360) % 360 * DEG;
  let E2 = M2;
  const e = b.e;
  for (let k = 0; k < 12; k++) E2 = E2 - (E2 - e * Math.sin(E2) - M2) / (1 - e * Math.cos(E2));
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E2 / 2), Math.sqrt(1 - e) * Math.cos(E2 / 2));
  const r = b.a * (1 - e * Math.cos(E2));
  const w = (b.varpi - b.Omega) * DEG;
  const O = b.Omega * DEG;
  const inc = b.i * DEG;
  const x1 = r * (Math.cos(O) * Math.cos(w + nu) - Math.sin(O) * Math.sin(w + nu) * Math.cos(inc));
  const y1 = r * (Math.sin(O) * Math.cos(w + nu) + Math.cos(O) * Math.sin(w + nu) * Math.cos(inc));
  const z1 = r * (Math.sin(w + nu) * Math.sin(inc));
  const vKms = 29.78 * Math.sqrt(Math.max(0, 2 / r - 1 / b.a));
  return { x: x1 * AU_PX, y: z1 * AU_PX, z: -y1 * AU_PX, rAU: r, vKms };
}

/** Compressed display radius (so inner/outer planets are both visible) */
export function dispRadius(rAU) { return 20 + 42 * Math.pow(rAU, 0.55); }

/** Convert heliocentric to display space (compressed radial distance, keep direction) */
export function toDisplay(b, t) {
  const p = heliocentric(b, t);
  const len = Math.hypot(p.x, p.y, p.z) || 1;
  const d = dispRadius(p.rAU);
  return { x: p.x / len * d, y: p.y / len * d, z: p.z / len * d, rAU: p.rAU, vKms: p.vKms };
}

/** Orbit curve point at true anomaly nu (rad) in display space */
export function orbitPointDisp(b, nu) {
  const rAU = b.a * (1 - b.e * b.e) / (1 + b.e * Math.cos(nu));
  const w = (b.varpi - b.Omega) * DEG, O = b.Omega * DEG, inc = b.i * DEG;
  const x1 = rAU * (Math.cos(O) * Math.cos(w + nu) - Math.sin(O) * Math.sin(w + nu) * Math.cos(inc));
  const y1 = rAU * (Math.sin(O) * Math.cos(w + nu) + Math.cos(O) * Math.sin(w + nu) * Math.cos(inc));
  const z1 = rAU * (Math.sin(w + nu) * Math.sin(inc));
  const len = Math.hypot(x1, y1, z1) || 1;
  const d = dispRadius(rAU);
  return { x: x1 / len * d, y: z1 / len * d, z: -y1 / len * d };
}
