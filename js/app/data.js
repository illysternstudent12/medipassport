// Three fictional travelers with consistent medical profiles.
// All people, insurers, IDs and records are invented sample data.

export const LANG_NAMES = {
  he: 'עברית', en: 'English', es: 'Español', ja: '日本語', pt: 'Português',
};
export const LANG_LABEL = {
  he: 'Hebrew', en: 'English', es: 'Spanish', ja: 'Japanese', pt: 'Portuguese',
};

export const TRAVELERS = [
  {
    id: 'maya',
    first: 'Maya', last: 'Stein',
    dob: '14 Mar 1994', age: 32, sex: 'Female',
    nationality: 'Israeli', flag: 'IL',
    homeLang: 'he', speaks: 'Hebrew, English',
    medicalId: 'MP-IL-0412-7781',
    blood: 'O+',
    portrait: { bg: 'mint', skin: '#D9A88A', hair: '#2B1D16', hairStyle: 'bun', top: '#000000' },
    trip: {
      city: 'Barcelona', country: 'Spain', code: 'ES', tz: 'Europe/Madrid',
      lang: 'es', emergency: '112', dates: '28 Oct – 9 Nov', scene: 'coast',
    },
    insurance: {
      provider: 'Solstice Travel Insurance', plan: 'Explorer Plus', policy: 'SOL-2026-48812',
      validUntil: '9 Nov 2026', status: 'Active', network: 3,
    },
    contact: { name: 'Daniel Stein', relation: 'Brother', phone: '+972 5•• ••• 214' },
    allergies: [
      { name: 'Penicillin', severity: 'Severe', reaction: 'Anaphylaxis (2019)', note: 'Avoid all penicillin-class antibiotics.' },
    ],
    conditions: [
      { name: 'Type 1 diabetes', since: '2009', note: 'Uses a continuous glucose monitor (CGM).' },
    ],
    medications: [
      { name: 'Insulin glargine', dose: '20 units', schedule: 'Evening', times: ['21:00'] },
      { name: 'Insulin aspart', dose: 'By carb count', schedule: 'With meals', times: ['08:00', '13:30', '20:00'] },
    ],
    tests: [
      { name: 'HbA1c', value: '6.8 %', ref: 'Target < 7.0', date: '3 Sep 2026' },
      { name: 'Creatinine', value: '0.8 mg/dL', ref: '0.5 – 1.1', date: '3 Sep 2026' },
    ],
  },
  {
    id: 'kenji',
    first: 'Kenji', last: 'Watanabe',
    dob: '2 Jul 1987', age: 39, sex: 'Male',
    nationality: 'Japanese', flag: 'JP',
    homeLang: 'ja', speaks: 'Japanese, English',
    medicalId: 'MP-JP-2207-1953',
    blood: 'A+',
    portrait: { bg: 'peach', skin: '#E2B996', hair: '#121212', hairStyle: 'short', top: '#3B4A3A' },
    trip: {
      city: 'Lisbon', country: 'Portugal', code: 'PT', tz: 'Europe/Lisbon',
      lang: 'pt', emergency: '112', dates: '30 Oct – 12 Nov', scene: 'hills',
    },
    insurance: {
      provider: 'Northwind Assurance', plan: 'Global Traveler', policy: 'NWA-77-310459',
      validUntil: '12 Nov 2026', status: 'Active', network: 4,
    },
    contact: { name: 'Aiko Watanabe', relation: 'Spouse', phone: '+81 90 •••• 6620' },
    allergies: [
      { name: 'Peanuts', severity: 'Severe', reaction: 'Anaphylaxis', note: 'Carries an adrenaline auto-injector (0.3 mg).' },
    ],
    conditions: [
      { name: 'Asthma', since: 'Childhood', note: 'Last hospital admission in 2021.' },
    ],
    medications: [
      { name: 'Budesonide/formoterol', dose: '2 puffs', schedule: 'Twice daily', times: ['08:00', '20:00'] },
      { name: 'Salbutamol', dose: '100 µg', schedule: 'As needed', times: [] },
      { name: 'Adrenaline auto-injector', dose: '0.3 mg', schedule: 'Emergency only', times: [] },
    ],
    tests: [
      { name: 'FEV1', value: '82 % of predicted', ref: '> 80 %', date: '18 Jun 2026' },
      { name: 'FEV1/FVC ratio', value: '0.74', ref: '> 0.70', date: '18 Jun 2026' },
    ],
  },
  {
    id: 'amara',
    first: 'Amara', last: 'Okafor',
    dob: '23 Nov 1979', age: 46, sex: 'Female',
    nationality: 'British', flag: 'GB',
    homeLang: 'en', speaks: 'English, Igbo',
    medicalId: 'MP-GB-1179-4406',
    blood: 'B−',
    portrait: { bg: 'gray', skin: '#7A4E35', hair: '#1A1210', hairStyle: 'curly', top: '#E7C4B1' },
    trip: {
      city: 'Kyoto', country: 'Japan', code: 'JP', tz: 'Asia/Tokyo',
      lang: 'ja', emergency: '119', dates: '25 Oct – 8 Nov', scene: 'mountains',
    },
    insurance: {
      provider: 'Meridian Travel Cover', plan: 'Annual Multi-trip', policy: 'MTC-GB-552190',
      validUntil: '31 Mar 2027', status: 'Active', network: 2,
    },
    contact: { name: 'Chidi Okafor', relation: 'Husband', phone: '+44 7••• ••• 318' },
    allergies: [
      { name: 'Sulfonamide antibiotics', severity: 'Moderate', reaction: 'Rash', note: 'Avoid sulfa antibiotics.' },
      { name: 'Latex', severity: 'Mild', reaction: 'Contact dermatitis', note: 'Use latex-free gloves.' },
    ],
    conditions: [
      { name: 'Hypertension', since: '2020', note: 'Well controlled on medication.' },
      { name: 'Hypothyroidism', since: '2018', note: 'Stable on daily replacement.' },
    ],
    medications: [
      { name: 'Levothyroxine', dose: '75 µg', schedule: 'Morning, before breakfast', times: ['07:00'] },
      { name: 'Amlodipine', dose: '5 mg', schedule: 'Once daily', times: ['09:00'] },
    ],
    tests: [
      { name: 'TSH', value: '2.1 mIU/L', ref: '0.4 – 4.0', date: '22 Sep 2026' },
      { name: 'Potassium', value: '4.2 mmol/L', ref: '3.5 – 5.3', date: '22 Sep 2026' },
    ],
  },
];

/* ------------------------------------------------------------- State */
const KEY = 'mp.traveler';
const listeners = new Set();

const ONBOARD_KEY = 'mp.onboard';

/** Result of the onboarding flow (Batch 3), or null. */
export function getOnboarding() {
  try { return JSON.parse(localStorage.getItem(ONBOARD_KEY)) || null; } catch { return null; }
}
export function saveOnboarding(result) {
  try { localStorage.setItem(ONBOARD_KEY, JSON.stringify(result)); } catch { /* storage blocked */ }
}
export function clearOnboarding() {
  try { localStorage.removeItem(ONBOARD_KEY); } catch { /* storage blocked */ }
}

/** Traveler, with any onboarding edits (insurer + reviewed medical data) applied. */
export function travelerById(id) {
  const base = TRAVELERS.find((t) => t.id === id) || TRAVELERS[0];
  const ob = getOnboarding();
  if (!ob || ob.travelerId !== base.id) return base;
  const m = ob.medical || {};
  return {
    ...base,
    insurance: { ...base.insurance, ...ob.insurance },
    allergies: m.allergies ?? base.allergies,
    medications: m.medications ?? base.medications,
    conditions: m.conditions ?? base.conditions,
    tests: m.tests ?? base.tests,
    blood: ob.blood ?? base.blood,
    onboarded: true,
  };
}

export function currentTraveler() {
  let id = null;
  try { id = localStorage.getItem(KEY); } catch { /* storage blocked */ }
  return travelerById(id);
}
export function setTraveler(id) {
  try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn(currentTraveler()));
}
export function onTravelerChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/* ------------------------------------------------------------- Helpers */
export function localTime(t, opts = { hour: '2-digit', minute: '2-digit', hour12: false }) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: t.trip.tz }).format(new Date());
}
function localMinutes(t) {
  const [h, m] = localTime(t).split(':').map(Number);
  return h * 60 + m;
}
export function greeting(t) {
  const h = Math.floor(localMinutes(t) / 60);
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
/** Next scheduled dose across all meds, in destination local time. */
export function nextDose(t) {
  const now = localMinutes(t);
  let best = null;
  t.medications.forEach((m) => m.times.forEach((hhmm) => {
    const [h, mm] = hhmm.split(':').map(Number);
    let diff = h * 60 + mm - now;
    if (diff < 0) diff += 1440;
    if (!best || diff < best.diff) best = { med: m, time: hhmm, diff };
  }));
  return best;
}
export function fmtIn(mins) {
  const h = Math.floor(mins / 60), m = mins % 60;
  return h ? `in ${h}h ${String(m).padStart(2, '0')}m` : `in ${m} min`;
}
