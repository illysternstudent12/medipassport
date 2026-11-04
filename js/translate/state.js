// Language settings — four independent choices per traveler:
//   appLang          the interface (English for now)
//   patientLang      the language the patient reads their records in
//   doctorLang       the language doctors read shared records in
//   destinationLang  the language of the country being visited (responders)
// plus each document's own original language (see records.js).
import { SIM, langInfo } from './glossary.js';
import { aiOn, translateStrings } from './ai.js';
import { sourceStrings } from './records.js';

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const usable = (code) => code && (SIM.includes(code) || aiOn());

export const APP_LANGS = ['en'];
export const appLang = () => 'en';

export function patientLang(t) {
  const v = read(`mp.lang.patient.${t.id}`);
  return usable(v) ? v : t.homeLang;
}
export const setPatientLang = (t, code) => write(`mp.lang.patient.${t.id}`, code);

export function doctorLang(t) {
  const v = read(`mp.lang.doctor.${t.id}`) || read(`mp.lang.${t.id}`); // earlier single setting
  return usable(v) ? v : t.trip.lang;
}
export const setDoctorLang = (t, code) => write(`mp.lang.doctor.${t.id}`, code);

export const destinationLang = (t) => t.trip.lang;

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
