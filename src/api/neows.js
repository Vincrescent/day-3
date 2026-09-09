// NASA NeoWs API client — asteroid close approach data

const API_BASE = 'https://api.nasa.gov/neo/rest/v1';
const API_KEY = 'DEMO_KEY';

/** Format date as YYYY-MM-DD */
function fmtDate(d) {
  return d instanceof Date ? d.toISOString().slice(0, 10) : String(d);
}

/** Fetch asteroids for a date range (max 7 days per NeoWs limitation) */
export async function fetchAsteroids(startDate, endDate) {
  const start = fmtDate(startDate);
  const end = endDate ? fmtDate(endDate) : start;
  const url = `${API_BASE}/feed?start_date=${start}&end_date=${end}&api_key=${API_KEY}`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`NeoWs API error: ${res.status}`);
    const d = await res.json();
    const allAsteroids = [];
    
    if (d.near_earth_objects) {
      for (const [date, objects] of Object.entries(d.near_earth_objects)) {
        for (const n of objects) {
          const ca = n.close_approach_data && n.close_approach_data[0];
          allAsteroids.push({
            id: n.id,
            name: n.name,
            neoRefId: n.neo_reference_id,
            hazard: !!n.is_potentially_hazardous_asteroid,
            absoluteMagnitude: n.absolute_magnitude_h,
            sizeMin: n.estimated_diameter?.kilometers?.estimated_diameter_min || 0,
            sizeMax: n.estimated_diameter?.kilometers?.estimated_diameter_max || 0,
            distLunar: ca?.miss_distance?.lunar || null,
            distKm: ca?.miss_distance?.kilometers || null,
            distAU: ca?.miss_distance?.astronomical || null,
            velocityKms: ca?.relative_velocity?.kilometers_per_second || null,
            velocityKmh: ca?.relative_velocity?.kilometers_per_hour || null,
            closeApproachDate: ca?.close_approach_date || date,
            closeApproachFull: ca?.close_approach_date_full || null,
            orbitingBody: ca?.orbiting_body || 'Earth',
            nasaUrl: n.nasa_jpl_url || null,
          });
        }
      }
    }

    // Sort by miss distance
    allAsteroids.sort((a, b) => (parseFloat(a.distLunar) || 999) - (parseFloat(b.distLunar) || 999));
    return { success: true, asteroids: allAsteroids, count: d.element_count || allAsteroids.length };
  } catch (err) {
    console.warn('NeoWs fetch failed:', err.message);
    return { success: false, asteroids: [], error: err.message };
  }
}

/** Fetch asteroid details by ID */
export async function fetchAsteroidDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/neo/${id}?api_key=${API_KEY}`);
    if (!res.ok) throw new Error(`NeoWs detail error: ${res.status}`);
    return { success: true, data: await res.json() };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
