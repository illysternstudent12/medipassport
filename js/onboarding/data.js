// Onboarding data: countries, illustrative insurers (fictional brands,
// no real partnerships), and the downloadable sample documents.
import { TRAVELERS } from '../app/data.js';

/* ---------------------------------------------------------------- Flags */
// Simplified flags drawn in SVG (emoji flags don't render on Windows).
const FLAGS = {
  IL: '<rect width="60" height="40" fill="#fff"/><rect y="5" width="60" height="5" fill="#0038b8"/><rect y="30" width="60" height="5" fill="#0038b8"/><path d="M30 12.5l6.5 11.25h-13zM30 27.5l-6.5-11.25h13z" fill="none" stroke="#0038b8" stroke-width="1.6"/>',
  JP: '<rect width="60" height="40" fill="#fff"/><circle cx="30" cy="20" r="11" fill="#bc002d"/>',
  GB: '<rect width="60" height="40" fill="#012169"/><path d="M0 0l60 40M60 0L0 40" stroke="#fff" stroke-width="8"/><path d="M0 0l60 40M60 0L0 40" stroke="#C8102E" stroke-width="3"/><path d="M30 0v40M0 20h60" stroke="#fff" stroke-width="12"/><path d="M30 0v40M0 20h60" stroke="#C8102E" stroke-width="7"/>',
  DE: '<rect width="60" height="13.4" fill="#000"/><rect y="13.3" width="60" height="13.4" fill="#DD0000"/><rect y="26.6" width="60" height="13.4" fill="#FFCE00"/>',
  FR: '<rect width="20" height="40" fill="#002395"/><rect x="20" width="20" height="40" fill="#fff"/><rect x="40" width="20" height="40" fill="#ED2939"/>',
  US: `<rect width="60" height="40" fill="#fff"/>${[0, 2, 4, 6, 8, 10, 12].map((i) => `<rect y="${i * 3.08}" width="60" height="3.08" fill="#B22234"/>`).join('')}<rect width="26" height="21.5" fill="#3C3B6E"/>`,
};
export const Flag = (code, cls = 'flag') => `<svg class="${cls}" viewBox="0 0 60 40" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${FLAGS[code]}</svg>`;

export const COUNTRIES = [
  { code: 'IL', name: 'Israel', native: 'ישראל', traveler: 'maya', tone: 'mint' },
  { code: 'JP', name: 'Japan', native: '日本', traveler: 'kenji', tone: 'peach' },
  { code: 'GB', name: 'United Kingdom', native: 'UK', traveler: 'amara', tone: 'gray' },
  { code: 'DE', name: 'Germany', native: 'Deutschland', soon: true },
  { code: 'FR', name: 'France', native: 'France', soon: true },
  { code: 'US', name: 'United States', native: 'USA', soon: true },
];

/* ---------------------------------------------------------------- Insurer marks */
// Each fictional insurer gets its own mark + wordmark style.
const MARKS = {
  sun: '<circle cx="24" cy="30" r="11" fill="currentColor"/>' + Array.from({ length: 7 }, (_, i) => { const a = Math.PI * (i / 6); return `<line x1="${24 - Math.cos(a) * 15}" y1="${30 - Math.sin(a) * 15}" x2="${24 - Math.cos(a) * 21}" y2="${30 - Math.sin(a) * 21}" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/>`; }).join('') + '<rect x="2" y="30" width="44" height="14" fill="var(--logo-bg)"/>',
  cedar: '<path d="M24 4L40 26H31L42 40H6L17 26H8z" fill="currentColor"/><rect x="21.5" y="40" width="5" height="5" fill="currentColor"/>',
  orchard: '<circle cx="24" cy="26" r="15" fill="currentColor"/><path d="M24 11c0-5 3-7 8-7-1 4-3 6-8 7z" fill="currentColor"/><circle cx="19" cy="22" r="3" fill="var(--logo-bg)" opacity=".5"/>',
  compass: '<circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M24 7l5 17-5 17-5-17z" fill="currentColor"/><path d="M7 24l17-4 17 4-17 4z" fill="currentColor" opacity=".45"/>',
  cloud: '<path d="M12 34a8 8 0 010-16 11 11 0 0121-3 9 9 0 013 19z" fill="currentColor"/>',
  rays: Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return `<line x1="${24 + Math.cos(a) * 7}" y1="${24 + Math.sin(a) * 7}" x2="${24 + Math.cos(a) * 19}" y2="${24 + Math.sin(a) * 19}" stroke="currentColor" stroke-width="${i % 2 ? 2 : 3.4}" stroke-linecap="round"/>`; }).join('') + '<circle cx="24" cy="24" r="4" fill="currentColor"/>',
  globe: '<circle cx="24" cy="24" r="18" fill="none" stroke="currentColor" stroke-width="2.4"/><ellipse cx="24" cy="24" rx="8" ry="18" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M6 24h36" stroke="currentColor" stroke-width="2.4"/><circle cx="24" cy="6" r="3.2" fill="currentColor"/>',
  thistle: '<path d="M16 24c0-9 4-15 8-15s8 6 8 15z" fill="currentColor"/>' + [-14, -7, 0, 7, 14].map((x) => `<line x1="24" y1="12" x2="${24 + x}" y2="2" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>`).join('') + '<path d="M18 24h12l-3 6h-6z" fill="currentColor" opacity=".55"/><rect x="22.6" y="30" width="2.8" height="14" fill="currentColor"/>',
  bramble: [[17, 18], [27, 16], [22, 26], [32, 25], [14, 28], [25, 35]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.2" fill="currentColor"/>`).join('') + '<path d="M24 10c3-6 8-7 12-6-2 4-6 6-12 6z" fill="currentColor" opacity=".55"/>',
};

export const INSURERS = {
  IL: [
    { id: 'solstice', name: 'Solstice', full: 'Solstice Travel Insurance', mark: 'sun', bg: '#E7C4B1', fg: '#000', font: 'sans', tag: 'Medical cover abroad for 190+ countries',
      plans: ['Explorer Plus', 'Explorer', 'Weekend Escape'] },
    { id: 'cedar', name: 'Cedar Line', full: 'Cedar Line Insurance', mark: 'cedar', bg: '#000', fg: '#C1DEBA', font: 'serif', tag: 'Annual multi-trip policies',
      plans: ['Annual Multi-trip', 'Single Trip'] },
    { id: 'orchard', name: 'orchard', full: 'Orchard Travel Cover', mark: 'orchard', bg: '#C1DEBA', fg: '#000', font: 'round', tag: 'Family and student travel plans',
      plans: ['Family Abroad', 'Student Year'] },
  ],
  JP: [
    { id: 'northwind', name: 'NORTHWIND', full: 'Northwind Assurance', mark: 'compass', bg: '#000', fg: '#E7C4B1', font: 'wide', tag: 'Global plans for frequent travelers',
      plans: ['Global Traveler', 'Business Trip'] },
    { id: 'kumo', name: 'kumo', full: 'Kumo Travel Insurance', mark: 'cloud', bg: '#FBF3EB', fg: '#000', font: 'round', tag: 'Short trips, booked in minutes',
      plans: ['Kumo Light', 'Kumo Plus'] },
    { id: 'hikari', name: 'Hikari', full: 'Hikari Mutual', mark: 'rays', bg: '#E7C4B1', fg: '#000', font: 'serif', tag: 'Cooperative travel cover',
      plans: ['Hikari Standard', 'Hikari Premium'] },
  ],
  GB: [
    { id: 'meridian', name: 'Meridian', full: 'Meridian Travel Cover', mark: 'globe', bg: '#C1DEBA', fg: '#000', font: 'serif', tag: 'Annual and single-trip cover',
      plans: ['Annual Multi-trip', 'Single Trip', 'Backpacker'] },
    { id: 'thistle', name: 'THISTLE & CO.', full: 'Thistle & Co. Travel', mark: 'thistle', bg: '#000', fg: '#FBF3EB', font: 'wide', tag: 'Cover for pre-existing conditions',
      plans: ['Thistle Care', 'Thistle Care+'] },
    { id: 'bramble', name: 'bramble', full: 'Bramble Mutual', mark: 'bramble', bg: '#D4CBC5', fg: '#000', font: 'round', tag: 'Member-owned travel insurance',
      plans: ['Bramble Everyday', 'Bramble Long Stay'] },
  ],
};

export function InsurerLogo(ins, cls = '') {
  return `<span class="ilogo ilogo--${ins.font} ${cls}" style="--logo-bg:${ins.bg};--logo-fg:${ins.fg}">
    <svg class="ilogo__mark" viewBox="0 0 48 48" aria-hidden="true">${MARKS[ins.mark]}</svg>
    <span class="ilogo__word">${ins.name}</span>
  </span>`;
}

/** Deterministic demo policy number for an insurer. */
export function demoPolicy(ins, traveler) {
  const base = TRAVELERS.find((t) => t.id === traveler);
  if (base && base.insurance.provider === ins.full) return base.insurance.policy;
  let h = 0;
  for (const c of ins.id + traveler) h = (h * 31 + c.charCodeAt(0)) % 900000;
  return `${ins.id.slice(0, 3).toUpperCase()}-2026-${String(100000 + h).slice(0, 6)}`;
}

/* ---------------------------------------------------------------- Sample documents */
export const DOC_KINDS = {
  rx: { label: 'Prescription', file: 'prescription', icon: 'rx', tone: 'peach' },
  lab: { label: 'Lab report', file: 'lab-report', icon: 'flask', tone: 'mint' },
  history: { label: 'Medical history', file: 'medical-history', icon: 'file', tone: 'gray' },
  // Foreign-language originals (Batch 6.5): same facts, issued abroad.
  medplan: { label: 'Medication plan (German)', file: 'medikationsplan-de', icon: 'rx', tone: 'peach' },
  summary: { label: 'Medical summary (French)', file: 'resume-medical-fr', icon: 'file', tone: 'gray' },
};
/** Which sample documents exist for each traveler. */
export const SAMPLES = {
  maya: ['rx', 'lab', 'history'],
  kenji: ['rx', 'lab', 'history', 'medplan'],
  amara: ['rx', 'lab', 'history', 'summary'],
};
export const sampleUrl = (traveler, kind) => `assets/demo-docs/${traveler}-${DOC_KINDS[kind].file}.pdf`;

/** What each sample document contains (must match tools/make_demo_docs.py). */
export function extractFrom(traveler, kind) {
  const t = TRAVELERS.find((x) => x.id === traveler);
  if (!t) return {};
  if (kind === 'rx') return { medications: t.medications };
  if (kind === 'lab') return { tests: t.tests };
  if (kind === 'history') return { conditions: t.conditions, allergies: t.allergies, blood: t.blood };
  if (kind === 'medplan') return { medications: t.medications };
  if (kind === 'summary') return { conditions: t.conditions, allergies: t.allergies, medications: t.medications, blood: t.blood };
  return {};
}

/** Read the MPDEMO tag embedded in our sample PDFs' metadata. */
export async function detectSample(file) {
  if (!/pdf$/i.test(file.type) && !/\.pdf$/i.test(file.name)) return null;
  const text = await file.slice(0, 200000).text();
  const m = text.match(/MPDEMO:(\w+):(\w+)/);
  return m && DOC_KINDS[m[2]] ? { traveler: m[1], kind: m[2] } : null;
}
