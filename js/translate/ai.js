// Connected translation / AI services — through the MediPassport backend.
//
// No secret key is ever in the browser. Translation, summaries and AI
// extraction call Supabase Edge Functions (see /supabase/functions), which hold
// the provider keys (Google Cloud Translation, DeepL, or Anthropic).
// Without a backend the app uses the offline glossary and says so.
import { isConfigured, callFn } from '../backend/supabase.js';

const CACHE_KEY = 'mp.ai.cache';
const STATUS_KEY = 'mp.svc';
export const PROVIDER_LABEL = { google: 'Google Cloud Translation', deepl: 'DeepL', claude: 'Claude' };

/* ---------------------------------------------------------------- service status */
const readStatus = () => { try { return JSON.parse(sessionStorage.getItem(STATUS_KEY)) || {}; } catch { return {}; } };
/** Probe the backend once per session (or when asked) and remember what's available. */
export async function refreshServices(force = false) {
  const prev = readStatus();
  if (!isConfigured()) { try { sessionStorage.removeItem(STATUS_KEY); } catch { /* ignore */ } return {}; }
  if (!force && prev.at && Date.now() - prev.at < 10 * 60e3) return prev;
  const probe = async (fn) => { try { return await callFn(fn, { health: true }); } catch (e) { return { ok: false, error: e.message }; } };
  const [translate, extract, summarize, share] = await Promise.all([probe('translate'), probe('extract'), probe('summarize'), probe('share-open')]);
  const st = { at: Date.now(), translate, extract, summarize, share };
  try { sessionStorage.setItem(STATUS_KEY, JSON.stringify(st)); } catch { /* ignore */ }
  return st;
}
export const services = () => readStatus();
/** A real translation provider is reachable (sync, from the last probe). */
export const aiOn = () => isConfigured() && !!readStatus().translate?.ok;
export const extractOn = () => isConfigured() && !!readStatus().extract?.ok;
export const summaryOn = () => isConfigured() && !!readStatus().summarize?.ok;
export const shareOn = () => isConfigured() && !!readStatus().share?.ok;
export const providerName = () => PROVIDER_LABEL[readStatus().translate?.provider] || 'Machine translation';

/* ---------------------------------------------------------------- cache */
let cache = null;
const loadCache = () => {
  if (!cache) { try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { cache = {}; } }
  return cache;
};
const persist = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ } };
// Entries are { t: translation, u: uncertain, r: reason, p: provider }.
export function aiCached(lang, text) {
  const v = loadCache()[lang]?.[text];
  return v == null ? null : typeof v === 'string' ? v : v.t;
}
export function aiUncertain(lang, text) {
  const v = loadCache()[lang]?.[text];
  return v && typeof v === 'object' && v.u ? (v.r || 'Uncertain translation') : null;
}
export function clearAiCache() { cache = {}; persist(); }

/* ---------------------------------------------------------------- calls */
/** Translate strings into `lang` via the backend. Results are cached. */
export async function translateStrings(lang, langName, strings) {
  const c = loadCache();
  c[lang] = c[lang] || {};
  const todo = [...new Set(strings.filter((s) => s && c[lang][s] === undefined))];
  if (!todo.length) return 0;
  for (let i = 0; i < todo.length; i += 150) {
    const batch = todo.slice(i, i + 150);
    const out = await callFn('translate', { target: lang, strings: batch });
    if (!Array.isArray(out.translations) || out.translations.length !== batch.length) throw new Error('Translation came back incomplete. Nothing was saved.');
    batch.forEach((s, k) => { const x = out.translations[k]; c[lang][s] = { t: x.text, u: !!x.uncertain, r: x.reason || '', p: out.provider }; });
  }
  persist();
  return todo.length;
}

/** 2–3 sentence handover summary from the facts given (Claude on the server). */
export async function summarize(lang, langName, factsJson) {
  if (!summaryOn()) return null;
  const key = `__summary__${JSON.stringify(factsJson)}`;
  const c = loadCache();
  c[lang] = c[lang] || {};
  if (c[lang][key]) return c[lang][key];
  const out = await callFn('summarize', { lang, facts: factsJson });
  c[lang][key] = out.summary;
  persist();
  return out.summary;
}

/** AI extraction from document text (Claude on the server). */
export const extractWithAi = (text, filename) => callFn('extract', { text, filename });
