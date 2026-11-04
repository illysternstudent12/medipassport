// Small experience helpers: haptics, soft sounds, spoken phrases, the
// translation "morph", empty-state illustrations and present mode.
// Everything is optional and degrades silently.

const FX_KEY = 'mp.fx'; // '0' turns sounds + haptics off
export const fxOn = () => { try { return localStorage.getItem(FX_KEY) !== '0'; } catch { return true; } };
export const setFx = (on) => { try { localStorage.setItem(FX_KEY, on ? '1' : '0'); } catch { /* ignore */ } };
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------------------------------------------------------- haptics */
const PATTERNS = { tap: 12, success: [18, 60, 28], warn: [40, 80, 40], alert: [60, 50, 60, 50, 90] };
export function haptic(kind = 'tap') {
  if (!fxOn() || !navigator.vibrate) return;
  try { navigator.vibrate(PATTERNS[kind] || PATTERNS.tap); } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- sounds (Web Audio, no files) */
let ctx = null;
const NOTES = { success: [523.25, 659.25, 783.99], share: [587.33, 880], revoke: [659.25, 493.88], soft: [698.46] };
export function chime(kind = 'soft') {
  if (!fxOn()) return;
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime;
    (NOTES[kind] || NOTES.soft).forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      const t = t0 + i * 0.11;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.07, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.connect(g).connect(ctx.destination);
      o.start(t); o.stop(t + 0.55);
    });
  } catch { /* audio unavailable */ }
}
/** Haptic + sound for a key moment. */
export const moment = (kind) => { haptic(kind === 'revoke' ? 'warn' : 'success'); chime(kind); };

/* ---------------------------------------------------------------- speech */
const BCP = { ja: 'ja-JP', de: 'de-DE', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', it: 'it-IT', pt: 'pt-PT', he: 'he-IL', ar: 'ar-SA', zh: 'zh-CN', ko: 'ko-KR', ru: 'ru-RU' };
const voicesReady = () => new Promise((res) => {
  const v = speechSynthesis.getVoices();
  if (v.length) return res(v);
  const done = () => res(speechSynthesis.getVoices());
  speechSynthesis.addEventListener('voiceschanged', done, { once: true });
  setTimeout(done, 1200);
});
/** Speak text with the device's own voice (offline on most phones). Resolves to a status. */
export async function speak(text, lang) {
  if (!('speechSynthesis' in window)) return 'unsupported';
  const voices = await voicesReady();
  const tag = BCP[lang] || lang;
  const voice = voices.find((v) => v.lang === tag) || voices.find((v) => v.lang?.toLowerCase().startsWith(lang));
  if (!voice) return 'no-voice';
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice; u.lang = voice.lang; u.rate = 0.88;
  speechSynthesis.speak(u);
  return 'ok';
}
export const stopSpeaking = () => { try { speechSynthesis.cancel(); } catch { /* ignore */ } };
/** A short spoken handover from criticalLines(): allergies, diagnoses, blood type. */
export function handover(c, lang) {
  const cjk = /^(ja|zh)/.test(lang);
  const [and, end] = cjk ? ['、', '。 '] : [', ', '. '];
  return [`${plain(c.labels.allergies)}: ${c.allergies.map(plain).join(and)}`, `${plain(c.labels.diagnoses)}: ${c.conditions.map(plain).join(and)}`, `${plain(c.labels.blood)}: ${c.blood}`].join(end);
}
/** Plain text from rendered HTML fragments (glossary output contains markup). */
export const plain = (html) => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.trim(); };

/* ---------------------------------------------------------------- translation morph */
/** Re-reveal translated content field by field after a language switch. */
export function morph(root) {
  if (!root || reduceMotion()) return;
  const els = root.querySelectorAll('.rcard__title, .fact__name, .fact__dl dd, .fact__free, .fact__chip, .rgroup h4, .scard__title, .schip, .ssec__line, .dv-alert p, .lview__card--tr .rbadge');
  els.forEach((el, i) => { el.style.setProperty('--mi', Math.min(i, 24)); el.classList.remove('is-morph'); });
  void root.offsetWidth;
  els.forEach((el) => el.classList.add('is-morph'));
}

/* ---------------------------------------------------------------- empty-state illustrations */
// Soft "stones" in the palette, drawn inline (no image files).
const ART = {
  search: '<circle cx="48" cy="46" r="26" fill="#C1DEBA"/><circle cx="48" cy="46" r="15" fill="#FBF3EB"/><rect x="66" y="64" width="26" height="11" rx="5.5" transform="rotate(45 66 64)" fill="#000"/><circle cx="92" cy="24" r="8" fill="#E7C4B1"/>',
  docs: '<rect x="22" y="20" width="50" height="64" rx="12" fill="#E7C4B1" transform="rotate(-8 47 52)"/><rect x="38" y="16" width="50" height="64" rx="12" fill="#FBF3EB" stroke="#000" stroke-width="2.5"/><rect x="48" y="32" width="28" height="4" rx="2" fill="#000"/><rect x="48" y="42" width="20" height="4" rx="2" fill="#D4CBC5"/><circle cx="92" cy="80" r="10" fill="#C1DEBA"/>',
  share: '<circle cx="40" cy="50" r="22" fill="#C1DEBA"/><circle cx="78" cy="38" r="15" fill="#E7C4B1"/><circle cx="80" cy="76" r="11" fill="#D4CBC5"/><path d="M40 50L78 38M40 50l40 26" stroke="#000" stroke-width="2.5" stroke-linecap="round"/>',
  map: '<path d="M18 30l26-10 28 10 26-10v62l-26 10-28-10-26 10z" fill="#FBF3EB" stroke="#000" stroke-width="2.5" stroke-linejoin="round"/><path d="M44 20v62M72 30v62" stroke="#D4CBC5" stroke-width="2.5"/><path d="M58 64c-9-11-13-17-13-23a13 13 0 0126 0c0 6-4 12-13 23z" fill="#A8432A"/><circle cx="58" cy="41" r="5" fill="#FBF3EB"/>',
  offline: '<path d="M20 50a54 54 0 0176 0M32 62a37 37 0 0152 0M44 74a20 20 0 0128 0" fill="none" stroke="#D4CBC5" stroke-width="6" stroke-linecap="round"/><circle cx="58" cy="86" r="6" fill="#000"/><circle cx="90" cy="24" r="10" fill="#C1DEBA"/>',
};
export const illus = (name, cls = '') => `<svg class="illus ${cls}" viewBox="0 0 116 100" aria-hidden="true">${ART[name] || ART.search}</svg>`;

/* ---------------------------------------------------------------- present mode */
const PRESENT_KEY = 'mp.present';
export const presenting = () => { try { return localStorage.getItem(PRESENT_KEY) === '1'; } catch { return false; } };
export function setPresenting(on) {
  try { if (on) localStorage.setItem(PRESENT_KEY, '1'); else localStorage.removeItem(PRESENT_KEY); } catch { /* ignore */ }
  document.documentElement.classList.toggle('is-presenting', on);
}
/** Inside the present-mode stage (its phone frame or doctor window). */
export const inFrame = () => window.name === 'mp-stage';
