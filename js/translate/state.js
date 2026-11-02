// Per-traveler translation target, plus the live-AI translation pass that
// fills gaps (non-glossary languages, free text) before a re-render.
import { SIM, langInfo } from './glossary.js';
import { aiOn, translateStrings } from './ai.js';
import { sourceStrings } from './records.js';

const key = (t) => `mp.lang.${t.id}`;

export function targetLang(t) {
  let v = null;
  try { v = localStorage.getItem(key(t)); } catch { /* ignore */ }
  if (v && (SIM.includes(v) || aiOn())) return v;
  return t.trip.lang;
}
export function setTargetLang(t, code) {
  try { localStorage.setItem(key(t), code); } catch { /* ignore */ }
}

/**
 * Make sure every string the records need in `lang` is available.
 * Returns 'ready' (nothing to do), 'translated' (live AI filled gaps),
 * or 'offline' (gaps remain because live AI is off; they render as "not translated").
 */
export async function ensureTranslated(recs, lang) {
  const needed = sourceStrings(recs, lang);
  if (!needed.length) return 'ready';
  if (!aiOn()) return 'offline';
  await translateStrings(lang, langInfo(lang).name, needed);
  return 'translated';
}

/** Which engine a language is served by right now. */
export const engineFor = (lang) => (SIM.includes(lang) ? 'sim' : 'ai');
