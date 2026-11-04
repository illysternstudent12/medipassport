// Supabase backend: Auth, Database, Storage and Edge Functions.
//
// Everything here is optional. When no project is configured the app stays in
// demo mode, and every screen says so. Secret API keys are never in the
// browser: translation, AI extraction and share verification run in Edge
// Functions (see /supabase).
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

const OVERRIDE = 'mp.backend';
const SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
export const BUCKET = 'medical-documents';

/* ---------------------------------------------------------------- config */
export function backendConfig() {
  let o = {};
  try { o = JSON.parse(localStorage.getItem(OVERRIDE)) || {}; } catch { /* ignore */ }
  return { url: (o.url || SUPABASE_URL || '').replace(/\/$/, ''), anonKey: o.anonKey || SUPABASE_ANON_KEY || '', source: o.url ? 'browser' : SUPABASE_URL ? 'config' : 'none' };
}
export function saveBackendConfig(url, anonKey) {
  try {
    if (url && anonKey) localStorage.setItem(OVERRIDE, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
    else localStorage.removeItem(OVERRIDE);
  } catch { /* ignore */ }
  clientP = null;
}
export const isConfigured = () => { const c = backendConfig(); return !!(c.url && c.anonKey); };

/* ---------------------------------------------------------------- client */
let clientP = null;
function loadSdk() {
  if (window.supabase?.createClient) return Promise.resolve(window.supabase);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SDK;
    s.onload = () => resolve(window.supabase);
    s.onerror = () => reject(new Error('Could not load the Supabase library. Check your connection.'));
    document.head.appendChild(s);
  });
}
export function sb() {
  if (!isConfigured()) return Promise.reject(new Error('Backend not connected.'));
  if (!clientP) {
    const c = backendConfig();
    clientP = loadSdk().then((lib) => lib.createClient(c.url, c.anonKey, { auth: { persistSession: true, storageKey: 'mp.sb.auth' } }));
  }
  return clientP;
}

/* ---------------------------------------------------------------- auth */
export async function currentUser() {
  if (!isConfigured()) return null;
  try { const { data } = await (await sb()).auth.getSession(); return data.session?.user || null; } catch { return null; }
}
export async function signIn(email, password) {
  const { data, error } = await (await sb()).auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.user;
}
export async function signUp(email, password) {
  const { data, error } = await (await sb()).auth.signUp({ email, password });
  if (error) throw new Error(error.message);
  return data;
}
export async function signOut() { await (await sb()).auth.signOut(); }

/* ---------------------------------------------------------------- edge functions */
/** Call an Edge Function. Throws Error with .status and a readable message. */
export async function callFn(name, body) {
  const c = await sb();
  const { data, error } = await c.functions.invoke(name, { body });
  if (error) {
    let status = error.context?.status || 0, msg = error.message;
    try { const j = await error.context.json(); msg = j.error || msg; } catch { /* not JSON */ }
    const e = new Error(status === 404 ? `The "${name}" function isn't deployed yet.` : status === 429 ? 'The service is rate-limited right now. Try again shortly.' : msg);
    e.status = status;
    throw e;
  }
  return data;
}

/** Which server-side services are configured (asks the functions themselves). */
export async function serviceStatus() {
  const out = { backend: isConfigured(), user: null, translate: null, extract: null, share: null };
  if (!out.backend) return out;
  out.user = await currentUser();
  const probe = async (fn) => { try { return await callFn(fn, { health: true }); } catch (e) { return { ok: false, error: e.message, status: e.status }; } };
  [out.translate, out.extract, out.share] = await Promise.all([probe('translate'), probe('extract'), probe('share-open')]);
  return out;
}

/* ---------------------------------------------------------------- data (Row Level Security: owner only) */
const uid = async () => { const u = await currentUser(); if (!u) throw new Error('Sign in first.'); return u.id; };

/** Store a fictional traveler profile + policy in the signed-in account. */
export async function saveProfile(t) {
  const c = await sb();
  const user_id = await uid();
  const data = { first: t.first, last: t.last, dob: t.dob, sex: t.sex, nationality: t.nationality, medicalId: t.medicalId, blood: t.blood,
    homeLang: t.homeLang, allergies: t.allergies, medications: t.medications, conditions: t.conditions, tests: t.tests, trip: t.trip, contact: t.contact, fictional: true };
  let r = await c.from('profiles').upsert({ user_id, traveler_key: t.id, data }, { onConflict: 'user_id' });
  if (r.error) throw new Error(r.error.message);
  r = await c.from('policies').upsert({ user_id, provider: t.insurance.provider, plan: t.insurance.plan, policy_number: t.insurance.policy,
    valid_until: t.insurance.validUntil, status: t.insurance.status, simulated: true }, { onConflict: 'user_id' });
  if (r.error) throw new Error(r.error.message);
}

/** Upload a file to private storage and record its reviewed facts. */
export async function saveDocument(file, meta) {
  const c = await sb();
  const user_id = await uid();
  const id = crypto.randomUUID();
  const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
  const path = `${user_id}/${id}-${safe}`;
  const up = await c.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false });
  if (up.error) throw new Error(`Storage: ${up.error.message}`);
  const row = { id, user_id, title: meta.title || file.name, kind: meta.kind || 'upload', orig_lang: meta.lang || null,
    storage_path: path, mime: file.type, size: file.size, facts: meta.facts || [], text_excerpt: (meta.text || '').slice(0, 4000), extraction: meta.method || null };
  const ins = await c.from('documents').insert(row).select().single();
  if (ins.error) { await c.storage.from(BUCKET).remove([path]); throw new Error(`Database: ${ins.error.message}`); }
  return ins.data;
}
export async function listDocuments() {
  const c = await sb();
  const { data, error } = await c.from('documents').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
export async function deleteDocument(row) {
  const c = await sb();
  await c.storage.from(BUCKET).remove([row.storage_path]);
  const { error } = await c.from('documents').delete().eq('id', row.id);
  if (error) throw new Error(error.message);
}
export async function signedUrl(path, seconds = 300) {
  const { data, error } = await (await sb()).storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

/* ---------------------------------------------------------------- shares (verified server-side) */
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Create a revocable share. Only hashes are stored; the token lives in the
 * link and the 4-digit code is told to the doctor. Verification, expiry and
 * revocation are enforced by the share-open Edge Function.
 */
export async function createRemoteShare({ scope, expiresAt, label }) {
  const c = await sb();
  const user_id = await uid();
  const token = b64url(crypto.getRandomValues(new Uint8Array(24)));
  const code = String(1000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 9000));
  const row = { user_id, token_hash: await sha256(token), code_hash: await sha256(`${token}:${code}`), scope, label, expires_at: new Date(expiresAt).toISOString() };
  const { data, error } = await c.from('shares').insert(row).select('id, created_at, expires_at').single();
  if (error) throw new Error(error.message);
  return { id: data.id, token, code };
}
export async function revokeRemoteShare(id) {
  const { error } = await (await sb()).from('shares').update({ revoked_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}
export async function remoteShareEvents(id) {
  const { data, error } = await (await sb()).from('share_events').select('*').eq('share_id', id).order('at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
}
/** Doctor side: open a share with token + code (no account needed). */
export const openRemoteShare = (token, code, extra = {}) => callFn('share-open', { token, code, ...extra });
