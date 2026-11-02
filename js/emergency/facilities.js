// Nearby medical facilities from OpenStreetMap (Overpass API), plus helpers
// for distance, travel-time estimates, opening hours and navigation links.
//
// Data © OpenStreetMap contributors (ODbL). Facility details are shown only
// when present in OSM; nothing is filled in. Insurance-network status is
// "not verified" unless a verified network source exists (none does yet).

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];
const CACHE_KEY = 'mp.facilities';
const CACHE_TTL = 6 * 3600 * 1000;
export const SNAPSHOT_URL = 'assets/demo-data/barcelona-facilities.json';

/* ---------------------------------------------------------------- demo locations */
export const DEMO = {
  maya: {
    lat: 41.41362, lng: 2.15297, label: 'Park Güell, Barcelona', tz: 'Europe/Madrid',
    snapshot: SNAPSHOT_URL,
    scenario: 'Maya slipped on the steps at Park Güell and hurt her right ankle. She is conscious and in pain, and can’t put weight on it.',
  },
  kenji: { lat: 38.71394, lng: -9.13938, label: 'Baixa, Lisbon', tz: 'Europe/Lisbon' },
  amara: { lat: 35.00393, lng: 135.77810, label: 'Gion, Kyoto', tz: 'Asia/Tokyo' },
};

/* ---------------------------------------------------------------- geometry */
export function distanceM(a, b) {
  const R = 6371000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export const fmtDist = (m) => (m < 950 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 9500 ? 1 : 0)} km`);
/** Rough estimates from straight-line distance (no routing service). */
export function estimates(m) {
  const walk = Math.max(1, Math.round(((m * 1.3) / 1000 / 4.6) * 60));
  const drive = Math.max(2, Math.round(((m * 1.45) / 1000 / 22) * 60 + 2));
  return { walk, drive };
}
export const fmtMin = (n) => (n < 60 ? `${n} min` : `${Math.floor(n / 60)} h ${n % 60} min`);

/* ---------------------------------------------------------------- navigation */
export function navLinks(f, mode = 'walking') {
  const d = `${f.lat},${f.lng}`;
  return {
    google: `https://www.google.com/maps/dir/?api=1&destination=${d}&travelmode=${mode}`,
    apple: `https://maps.apple.com/?daddr=${d}&dirflg=${mode === 'walking' ? 'w' : 'd'}`,
    waze: `https://waze.com/ul?ll=${d}&navigate=yes`,
  };
}

/* ---------------------------------------------------------------- normalize */
const TYPE_ORDER = { er: 0, hospital: 1, clinic: 2, doctor: 3 };
function typeOf(tags) {
  const a = tags.amenity, h = tags.healthcare;
  const isHospital = a === 'hospital' || h === 'hospital';
  if (isHospital && tags.emergency === 'yes') return 'er';
  if (isHospital) return 'hospital';
  if (a === 'clinic' || h === 'clinic' || h === 'centre') return 'clinic';
  return 'doctor';
}
function address(t) {
  const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ');
  const city = [t['addr:postcode'], t['addr:city']].filter(Boolean).join(' ');
  return [street, city].filter(Boolean).join(', ') || t['addr:full'] || '';
}
export function normalize(elements) {
  const seen = new Set();
  return elements.map((e) => {
    const t = e.tags || {};
    const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
    if (!t.name || lat == null) return null;
    const key = `${t.name}|${lat.toFixed(4)}|${lng.toFixed(4)}`;
    if (seen.has(key)) return null;
    seen.add(key);
    return {
      id: `${e.type}/${e.id}`, name: t.name, type: typeOf(t), lat, lng,
      address: address(t),
      phone: t.phone || t['contact:phone'] || '',
      hours: t.opening_hours || '',
      website: t.website || t['contact:website'] || '',
      speciality: (t['healthcare:speciality'] || '').split(';').map((s) => s.trim()).filter(Boolean),
      operator: t.operator || '',
      emergency: t.emergency === 'yes',
      wheelchair: t.wheelchair || '',
      network: 'unverified',
    };
  }).filter(Boolean);
}

/* ---------------------------------------------------------------- fetch */
const query = (lat, lng, r) => `[out:json][timeout:25];(nwr["amenity"~"^(hospital|clinic|doctors)$"](around:${r},${lat},${lng});nwr["healthcare"~"^(hospital|clinic|doctor|centre)$"](around:${r},${lat},${lng}););out center tags;`;

function readCache() { try { return JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { return {}; } }
function writeCache(c) { try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch { /* quota */ } }
const cacheKey = (lat, lng, r) => `${lat.toFixed(3)},${lng.toFixed(3)},${r}`;

/** Live query with retry across public endpoints. Throws a readable error. */
export async function fetchLive(lat, lng, radius = 3000, { signal } = {}) {
  const k = cacheKey(lat, lng, radius);
  const c = readCache();
  if (c[k] && Date.now() - c[k].at < CACHE_TTL) return { facilities: c[k].facilities, source: 'cache', at: c[k].at };
  const body = new URLSearchParams({ data: query(lat, lng, radius) });
  let lastErr = null;
  for (let i = 0; i < ENDPOINTS.length; i++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 15000);
    signal?.addEventListener('abort', () => ctl.abort());
    try {
      const res = await fetch(ENDPOINTS[i], { method: 'POST', body, signal: ctl.signal });
      if (!res.ok) throw new Error(res.status === 429 || res.status >= 500 ? 'busy' : `HTTP ${res.status}`);
      const json = await res.json();
      const facilities = normalize(json.elements || []);
      c[k] = { at: Date.now(), facilities };
      writeCache(c);
      return { facilities, source: 'live', at: Date.now() };
    } catch (err) {
      if (signal?.aborted) throw err;
      lastErr = err.name === 'AbortError' ? new Error('busy') : err;
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(lastErr?.message === 'busy'
    ? 'The map data service (OpenStreetMap Overpass) is busy right now.'
    : 'Couldn’t load nearby facilities. Check your connection.');
}

/** Bundled snapshot for the demo scenario (works offline). */
export async function loadSnapshot(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('missing');
  const json = await res.json();
  return { facilities: json.facilities, source: 'snapshot', at: Date.parse(json.captured) || null, attribution: json.attribution };
}

/** Sort by distance and attach distance + estimates. */
export function rank(facilities, from) {
  return facilities
    .map((f) => { const m = distanceM(from, f); return { ...f, m, est: estimates(m) }; })
    .sort((a, b) => a.m - b.m || TYPE_ORDER[a.type] - TYPE_ORDER[b.type]);
}

/* ---------------------------------------------------------------- opening hours */
// Light parser for common OSM opening_hours forms ("24/7", "Mo-Fr 08:00-20:00;
// Sa 09:00-14:00", "Mo,We 09:00-13:00,16:00-19:00"). Anything else returns
// status "unknown" and the raw value is shown as-is.
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
function expandDays(spec) {
  const out = new Set();
  for (const part of spec.split(',')) {
    const [a, b] = part.split('-');
    const i = DAYS.indexOf(a), j = b ? DAYS.indexOf(b) : i;
    if (i < 0 || j < 0) return null;
    for (let k = i; ; k = (k + 1) % 7) { out.add(k); if (k === j) break; }
  }
  return out;
}
export function openStatus(hours, tz) {
  if (!hours) return { status: 'unknown', label: 'Hours not listed' };
  const h = hours.trim();
  if (h === '24/7') return { status: 'open', label: 'Open 24 hours', always: true };
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  const wd = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 }[parts.find((p) => p.type === 'weekday').value];
  const now = +parts.find((p) => p.type === 'hour').value * 60 + +parts.find((p) => p.type === 'minute').value;
  let matchedDay = false, open = false, closesAt = null;
  for (const rule of h.split(';').map((r) => r.trim()).filter(Boolean)) {
    if (/^PH\b/.test(rule)) continue;
    const m = rule.match(/^([A-Za-z,-]+)\s+(.+)$/);
    if (!m) return { status: 'unknown', label: hours };
    const days = expandDays(m[1]);
    if (!days) return { status: 'unknown', label: hours };
    if (!days.has(wd)) continue;
    matchedDay = true;
    if (/^off$/i.test(m[2])) { open = false; continue; }
    for (const span of m[2].split(',')) {
      const t = span.trim().match(/^(\d{1,2}):(\d{2})-(\d{1,2}):(\d{2})$/);
      if (!t) return { status: 'unknown', label: hours };
      const s = +t[1] * 60 + +t[2], e = +t[3] * 60 + +t[4];
      if (now >= s && now < (e <= s ? e + 1440 : e)) { open = true; closesAt = `${t[3].padStart(2, '0')}:${t[4]}`; }
    }
  }
  if (!matchedDay) return { status: 'closed', label: 'Closed today', raw: hours };
  return open ? { status: 'open', label: `Open · closes ${closesAt}`, raw: hours } : { status: 'closed', label: 'Closed now', raw: hours };
}

export const TYPE_LABEL = { er: 'Emergency room', hospital: 'Hospital', clinic: 'Clinic', doctor: 'Doctor' };
