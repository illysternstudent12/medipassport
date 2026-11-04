// Secure sharing (Batch 6): shares, access tokens, activity history,
// claim authorizations and emergency-assistance requests.
//
// Two kinds of share:
//  · server-verified (signed in to the Supabase backend): the link holds only a
//    random token; the share-open Edge Function checks code, expiry and
//    revocation on every request, from any device, and logs each attempt.
//  · demo (no backend): see the limits below.
// DEMO LIMITS (shown in the UI): there is no server. A share's token travels
// in the link itself, so a link opened on another device enforces only its
// expiry. Revocation and activity history are kept in this browser's storage.
// A production system would issue opaque tokens and check every request
// server-side.

const SHARES = 'mp.shares';
const EVENTS = 'mp.share.events';
const ASSIST = 'mp.assist';
const LIVE_BASE = 'https://illysternstudent12.github.io/medipassport/';

const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } };

export const DURATIONS = [
  { key: '1h', label: '1 hour', ms: 3600e3 },
  { key: '24h', label: '24 hours', ms: 86400e3 },
  { key: '7d', label: '7 days', ms: 7 * 86400e3 },
];
export const SECTIONS = [
  { key: 'allergies', label: 'Allergies & blood type', always: true },
  { key: 'medications', label: 'Medications' },
  { key: 'conditions', label: 'Conditions' },
  { key: 'tests', label: 'Test results' },
];

/* ---------------------------------------------------------------- tokens */
const b64u = (s) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));

/** Compact token: everything the portal needs to open a share on any device. */
export function tokenFor(sh) {
  return b64u(JSON.stringify({ v: 1, i: sh.id, t: sh.traveler, d: sh.docs, s: sh.sections, l: sh.lang, p: sh.patientLang, e: Math.floor(sh.expiresAt / 1000), c: sh.code, r: sh.recipient }));
}
export function decodeToken(tok) {
  try {
    const o = JSON.parse(unb64u(tok));
    if (o.v !== 1) return null;
    return { id: o.i, traveler: o.t, docs: o.d || [], sections: o.s || ['allergies'], lang: o.l, patientLang: o.p || null, expiresAt: o.e * 1000, code: o.c, recipient: o.r || 'doctor' };
  } catch { return null; }
}
/** Link that works from any device (the live site) — or this origin when running locally. */
export function shareUrl(sh) {
  const local = /^(localhost|127\.|10\.|192\.168\.)/.test(location.hostname);
  const base = local ? `${location.origin}${location.pathname}` : LIVE_BASE;
  return sh.remote ? `${base}#/portal?t=${sh.remote.token}` : `${base}#/portal?s=${tokenFor(sh)}`;
}

/* ---------------------------------------------------------------- shares */
export const allShares = () => read(SHARES, []);
export const sharesFor = (travelerId) => allShares().filter((s) => s.traveler === travelerId).sort((a, b) => b.createdAt - a.createdAt);
export const getShare = (id) => allShares().find((s) => s.id === id) || null;

export function statusOf(sh, now = Date.now()) {
  if (sh.revokedAt) return 'revoked';
  if (now >= sh.expiresAt) return 'expired';
  return 'active';
}

const rid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4);
const code4 = () => String(Math.floor(1000 + Math.random() * 9000));

/**
 * Create a share.
 * @param {{traveler:string, recipient:'doctor'|'insurer', docs:string[], sections:string[], lang:string, duration:string, label?:string, claimRef?:string}} o
 */
export function createShare(o) {
  const d = DURATIONS.find((x) => x.key === o.duration) || DURATIONS[0];
  const now = Date.now();
  const sh = {
    id: rid(), traveler: o.traveler, recipient: o.recipient, docs: o.docs,
    patientLang: o.patientLang || null,
    // Doctors always receive allergies (safety). Insurers receive only the documents chosen.
    sections: o.recipient === 'doctor' ? [...new Set(['allergies', ...o.sections])] : [], lang: o.lang,
    createdAt: now, expiresAt: now + d.ms, duration: d.key, code: code4(),
    label: o.label || (o.recipient === 'insurer' ? 'Claim review' : 'Treating doctor'),
    claimRef: o.claimRef || '', revokedAt: null,
    ...(o.remote ? { id: o.remote.id, code: o.remote.code, remote: { id: o.remote.id, token: o.remote.token }, expiresAt: o.remote.expiresAt } : {}),
  };
  write(SHARES, [...allShares(), sh]);
  logEvent(sh.id, 'created', `${d.label} · ${sh.docs.length} document${sh.docs.length === 1 ? '' : 's'}`);
  return sh;
}
export function revokeShare(id) {
  const list = allShares().map((s) => (s.id === id && !s.revokedAt ? { ...s, revokedAt: Date.now() } : s));
  write(SHARES, list);
  logEvent(id, 'revoked', 'Access ended by the patient');
}

/* ---------------------------------------------------------------- activity */
export function logEvent(shareId, type, detail = '') {
  const ev = read(EVENTS, []);
  ev.push({ shareId, type, detail, at: Date.now() });
  write(EVENTS, ev.slice(-500));
}
export const eventsFor = (shareId) => read(EVENTS, []).filter((e) => e.shareId === shareId).sort((a, b) => b.at - a.at);

/* ---------------------------------------------------------------- insurer side */
/** Documents patients explicitly authorized for claim review (this browser). */
export const claimAuthorizations = () => allShares().filter((s) => s.recipient === 'insurer');

export const assistRequests = () => read(ASSIST, []);
export function addAssistRequest(r) {
  const list = assistRequests();
  list.push({ id: rid(), at: Date.now(), status: 'new', ...r });
  write(ASSIST, list);
}
