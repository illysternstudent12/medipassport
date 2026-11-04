// Guided demo: Lukas Becker (Berlin) gets medical help in Tokyo.
// A floating, collapsible step card guides the visitor through the REAL
// screens. Nothing is faked by the tour itself; each step says what is live
// and what is simulated.
import { icon } from './icons.js';
import { setTraveler, clearOnboarding } from './app/data.js';
import { forget } from './nav.js';
import { sharesFor, statusOf, shareUrl } from './share/store.js';

const KEY = 'mp.tour';
const TRAVELER = 'lukas';
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** route: where the step happens. live/sim: honest labels shown on the card. */
export const STEPS = [
  { title: 'Choose the traveler', route: '#/get-started', body: 'Pick <b>Germany</b> as the country of residence. Lukas Becker from Berlin is the fictional demo traveler.', tag: 'Fictional profile' },
  { title: 'Choose a German insurer', route: '#/get-started', body: 'Select <b>Sternweg Reiseschutz</b> and a plan, then connect the policy.', tag: 'Simulated: fictional insurer, no insurer API' },
  { title: 'Upload German documents', route: '#/get-started', body: 'Tap <b>Add sample documents</b>: a German Rezept, Laborbefund and Anamnese (fictional PDFs). Your own PDFs and photos are read on the device too.', tag: 'Live: PDF reading on the device' },
  { title: 'Extract and verify', route: '#/get-started', body: 'Watch the records being read, then check every item. Correct or remove anything before it’s saved. AI extraction runs only when the backend has an Anthropic key; otherwise items are matched against the medical glossary, and the screen says so.', tag: 'You review every item' },
  { title: 'Activate the passport', route: '#/get-started', body: 'Choose what doctors and the insurer may see, then activate Lukas’s digital medical passport.', tag: 'Permissions saved on this device' },
  { title: 'Emergency in Tokyo', route: '#/app/emergency', body: 'Lukas is short of breath at Shinjuku Station. This is the one-tap emergency screen: Japan’s number (119), his critical medical facts, and next steps.', tag: 'Demo scenario · calls disabled' },
  { title: 'Find a hospital', route: '#/app/map', body: 'Hospitals and clinics around Shinjuku are real OpenStreetMap data. Filter for <b>Emergency</b>, open one, and try the Google Maps / Apple Maps / Waze buttons. <b>Search this area</b> or the place search fetches live data.', tag: 'Live: OpenStreetMap' },
  { title: 'Records in Japanese', route: '#/app/documents?lang=ja', body: 'Lukas’s German records, shown in Japanese. Medical terms come from a reviewed glossary; text it doesn’t cover is flagged, never guessed. A connected translation service fills the rest.', tag: 'Offline glossary · verify with a professional' },
  { title: 'Share with the doctor', route: '#/app/share', body: 'Create a share for the treating doctor: Japanese, 1 hour. You get a real QR code, a link and a 4-digit access code.', tag: 'Server-verified when signed in · otherwise a demo link' },
  { title: 'Open the doctor portal', route: null, action: 'portal', body: 'Open the share as the doctor would. Enter the 4-digit access code shown on the share screen, and confirm you are treating the patient.', tag: 'Clinician identity not verified' },
  { title: 'Japanese beside German', route: null, action: 'portal', body: 'Each document shows the German original side by side with the Japanese version. Switch languages at the top; allergies always stay first.', tag: 'Originals are never altered' },
  { title: 'Ask the insurer for help', route: '#/app/emergency', body: 'Tap <b>Notify my insurer</b>. Sternweg sees the location and policy, not the medical records. Finish to view the request in the insurer console.', tag: 'Simulated assistance request', finish: '#/insurer?org=sternweg' },
];

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };

function portalUrl() {
  const sh = sharesFor(TRAVELER).find((s) => statusOf(s) === 'active' && s.recipient === 'doctor');
  if (!sh) return null;
  const u = shareUrl(sh);
  return u.slice(u.indexOf('#'));
}
function routeFor(step) {
  const s = STEPS[step];
  return s.action === 'portal' ? portalUrl() : s.route;
}

/** Start from scratch: Lukas, fresh onboarding. Only demo data is reset. */
export function startTour() {
  setTraveler(TRAVELER);
  clearOnboarding();
  forget('onboarding');
  write({ step: 0, min: false });
  // Replace #/tour so Back doesn't restart the demo.
  if (location.hash.startsWith('#/tour')) location.replace(STEPS[0].route); else location.hash = STEPS[0].route;
  render();
}
function go(step) {
  const st = read(); if (!st) return;
  st.step = Math.max(0, Math.min(STEPS.length - 1, step)); st.min = false;
  write(st);
  const r = routeFor(st.step);
  if (r === null) { render(); flash('Create a doctor share first (step 9). It isn’t created for you.'); return; }
  if (r && location.hash !== r) location.hash = r;
  render();
}

let el = null;
function flash(msg) {
  const n = el?.querySelector('[data-tmsg]');
  if (n) { n.textContent = msg; n.hidden = false; }
}
function render() {
  const st = read();
  if (!st) { el?.remove(); el = null; document.body.classList.remove('has-tour'); return; }
  if (!el) {
    el = document.createElement('aside');
    el.className = 'gtour';
    el.setAttribute('aria-label', 'Guided demo');
    document.body.appendChild(el);
    el.addEventListener('click', onClick);
  }
  document.body.classList.add('has-tour');
  const s = STEPS[st.step];
  const n = st.step + 1;
  const last = n === STEPS.length;
  el.classList.toggle('is-min', !!st.min);
  if (el.dataset.step !== String(st.step)) el.classList.remove('is-open');
  el.dataset.step = String(st.step);
  el.dataset.screen = location.hash.split('?')[0].replace(/^#\//, '').replace(/\//g, '-') || 'home';
  el.innerHTML = st.min
    ? `<button type="button" class="gtour__pill" data-t="open" aria-label="Show guided demo, step ${n} of ${STEPS.length}">${icon('play')}<span>Demo · ${n}/${STEPS.length}</span></button>`
    : `<div class="gtour__head">
        <span class="gtour__k">Guided demo · ${n}/${STEPS.length}</span>
        <span class="gtour__bar" aria-hidden="true"><i style="width:${(n / STEPS.length) * 100}%"></i></span>
        <button type="button" class="gtour__ic" data-t="min" aria-label="Minimise guide">${icon('chevron')}</button>
        <button type="button" class="gtour__ic" data-t="exit" aria-label="End guided demo">${icon('close')}</button>
      </div>
      <h2 class="gtour__h">${esc(s.title)}</h2>
      <p class="gtour__b" data-t="more">${s.body}</p>
      <button type="button" class="gtour__more" data-t="more">More about this step</button>
      <p class="gtour__tag">${icon('eye')} ${esc(s.tag)}</p>
      <p class="gtour__msg" data-tmsg role="status" hidden></p>
      <div class="gtour__nav">
        <button type="button" class="gtour__btn gtour__btn--line" data-t="prev" ${n === 1 ? 'disabled' : ''}>${icon('arrow', 'style="rotate:180deg"')}<span>Back</span></button>
        <button type="button" class="gtour__btn gtour__btn--line" data-t="here">${icon('pin')}<span>Go to step</span></button>
        <button type="button" class="gtour__btn" data-t="${last ? 'finish' : 'next'}"><span>${last ? 'Finish' : 'Next'}</span>${icon(last ? 'check' : 'arrow')}</button>
      </div>`;
}
function onClick(e) {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const st = read(); if (!st) return;
  const a = b.dataset.t;
  if (a === 'more') { el.classList.toggle('is-open'); return; }
  if (a === 'min' || a === 'open') { st.min = a === 'min'; write(st); render(); return; }
  if (a === 'exit') { write(null); render(); return; }
  if (a === 'prev') { go(st.step - 1); return; }
  if (a === 'next') { go(st.step + 1); return; }
  if (a === 'here') { go(st.step); return; }
  if (a === 'finish') { write(null); render(); location.hash = STEPS[STEPS.length - 1].finish; }
}

/** Mount once at app start: keeps the card across screens and reloads. */
export function initTour() {
  render();
  window.addEventListener('hashchange', () => setTimeout(render, 0));
  // Onboarding has no URL per step: move the guide forward as the visitor goes.
  const OB = { welcome: 0, country: 0, insurer: 1, connect: 1, upload: 2, extract: 3, review: 3, permissions: 4, done: 4 };
  window.addEventListener('mp:obstep', (e) => {
    const st = read();
    const to = OB[e.detail];
    if (!st || to === undefined || st.step > 4 || to === st.step) return;
    st.step = to; write(st); render();
  });
}

/** #/tour: start the guided demo from any link. */
export const tourPage = {
  title: 'Guided demo · MediPassport',
  html: () => '<div class="tour-start"></div>',
  mount() { setTimeout(startTour, 0); return null; },
};
