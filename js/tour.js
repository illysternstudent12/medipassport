// Guided demo: Lukas Becker (Berlin) gets medical help in Tokyo.
// The guide drives the REAL screens. It can run:
//   · in the page (floating card), or
//   · on the present stage (#/present): phone frame + doctor's window + guide.
// It highlights what to tap, follows onboarding, ends on a recap screen, and
// can reset all demo data. Nothing is faked by the guide itself.
import { icon } from './icons.js';
import { setTraveler, clearOnboarding } from './app/data.js';
import { forget } from './nav.js';
import { sharesFor, statusOf, shareUrl } from './share/store.js';
import { openSheet, closeSheet } from './app/ui.js';
import { inFrame, presenting, setPresenting, illus, haptic } from './fx.js';

const KEY = 'mp.tour';
const TRAVELER = 'lukas';
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/**
 * route: where the step happens (null + action 'portal' = the latest doctor share).
 * spot: what to highlight, first visible match wins (in order).
 */
export const STEPS = [
  { title: 'Choose the traveler', route: '#/get-started', spot: ['[data-country="DE"]:not([aria-checked="true"])', '[data-next]:not([disabled])'],
    body: 'Pick <b>Germany</b> as the country of residence. Lukas Becker from Berlin is the fictional demo traveler.', tag: 'Fictional profile' },
  { title: 'Choose a German insurer', route: '#/get-started', spot: ['[data-insurer="sternweg"]:not([aria-checked="true"])', '[data-method="app"]:not([aria-pressed="true"])', '[data-next]:not([disabled])'],
    body: 'Select <b>Sternweg Reiseschutz</b>, then connect the policy.', tag: 'Simulated: fictional insurer, no insurer API' },
  { title: 'Upload German documents', route: '#/get-started', spot: ['[data-add-samples]:not([disabled])', '[data-next]:not([disabled])'],
    body: 'Tap <b>Add all 3 samples</b>: a German Rezept, Laborbefund and Anamnese (fictional PDFs). Your own PDFs and photos are read on the device too.', tag: 'Live: documents read on the device' },
  { title: 'Extract and verify', route: '#/get-started', spot: ['[data-next]:not([disabled])'],
    body: 'Watch the records being read, then check every item. Correct or remove anything before it’s saved. AI extraction runs only when the backend has an Anthropic key; otherwise items are matched against the medical glossary, and the screen says so.', tag: 'You review every item' },
  { title: 'Activate the passport', route: '#/get-started', spot: ['[data-next]:not([disabled])'],
    body: 'Choose what doctors and the insurer may see, then activate Lukas’s digital medical passport.', tag: 'Permissions saved on this device' },
  { title: 'Emergency in Tokyo', route: '#/app/emergency', spot: ['.em-call', 'a.eact[href="#/app/map"]'],
    body: 'Lukas is short of breath at Shinjuku Station. One calm screen: Japan’s number (119), what to do next, and his critical facts in Japanese. Try <b>Play in Japanese</b>.', tag: 'Demo scenario · calls disabled' },
  { title: 'Find a hospital', route: '#/app/map', spot: ['[data-f="er"][aria-pressed="false"]', '.fcard', '.navbtn--g'],
    body: 'Hospitals and clinics around Shinjuku are real OpenStreetMap data. Filter for <b>Emergency</b>, open one, and try the Google Maps / Apple Maps / Waze buttons. <b>Search this area</b> or the place search fetches live data.', tag: 'Live: OpenStreetMap' },
  { title: 'Records in Japanese', route: '#/app/documents?lang=ja', spot: ['[data-quick-lang="de"]', '[data-rec]'],
    body: 'Lukas’s German records, shown in Japanese. Switch to <b>Deutsch</b> and back to watch them translate. Medical terms come from a reviewed glossary; text it doesn’t cover is flagged, never guessed.', tag: 'Offline glossary · verify with a professional' },
  { title: 'Share with the doctor', route: '#/app/share', spot: ['[data-create]:not([disabled])', '[data-qr] svg'],
    body: 'Create a share for the treating doctor: Japanese, 1 hour. You get a real QR code, a link and a 4-digit access code.', tag: 'Server-verified when signed in · otherwise a demo link' },
  { title: 'Open the doctor portal', route: null, action: 'portal', spot: ['.pt-code__boxes', '[data-attest]'],
    body: 'This is the doctor’s screen. Enter the 4-digit access code from the share and confirm you are treating the patient.', tag: 'Clinician identity not verified' },
  { title: 'Japanese beside German', route: null, action: 'portal', spot: ['[data-lmode]', '[data-pl]'],
    body: 'Each document shows the German original beside the Japanese. Then <b>revoke</b> the share on the patient’s phone and watch the doctor’s screen lock within a second.', tag: 'Originals are never altered' },
  { title: 'Ask the insurer for help', route: '#/app/emergency', spot: ['[data-eact="insurance"]', '[data-notify-insurer]:not([disabled])'],
    body: 'Tap <b>Contact insurance</b>, then <b>Notify my insurer</b>. Sternweg sees the location and policy, not the medical records.', tag: 'Simulated assistance request', console: '#/insurer?org=sternweg' },
];

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (v) => { try { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); } catch { /* ignore */ } };
export const tourActive = () => !!read();

/* ---------------------------------------------------------------- stage (present mode) */
// When the stage is mounted, the guide drives its frames instead of this window.
let stage = null; // { phone: HTMLIFrameElement, doctor: HTMLIFrameElement, guide: HTMLElement, showDoctor(bool) }
export function attachStage(s) { stage = s; render(); }
export function detachStage() { stage = null; el?.remove(); el = null; }
const appWin = () => (stage ? stage.phone.contentWindow : window);
const hashOf = (w) => { try { return w.location.hash; } catch { return ''; } };

function portalHash() {
  const sh = sharesFor(TRAVELER).find((s) => statusOf(s) === 'active' && s.recipient === 'doctor');
  if (!sh) return null;
  const u = shareUrl(sh);
  return u.slice(u.indexOf('#'));
}
const isPortalStep = (i) => STEPS[i].action === 'portal';

/** Start from scratch: Lukas, fresh onboarding. Only demo data is reset. */
export function startTour() {
  setTraveler(TRAVELER);
  clearOnboarding();
  forget('onboarding');
  write({ step: 0, min: false });
  if (stage) { stage.phone.contentWindow.location.hash = STEPS[0].route; stage.showDoctor(false); render(); return; }
  // Replace #/tour so Back doesn't restart the demo.
  if (location.hash.startsWith('#/tour')) location.replace(STEPS[0].route); else location.hash = STEPS[0].route;
  render();
}

function go(step) {
  const st = read(); if (!st) return;
  st.step = Math.max(0, Math.min(STEPS.length - 1, step)); st.min = false;
  write(st);
  haptic('tap');
  if (isPortalStep(st.step)) {
    const p = portalHash();
    if (!p) { render(); flash('Create a doctor share first (previous step). It isn’t created for you.'); return; }
    if (stage) {
      stage.showDoctor(true);
      if (!hashOf(stage.doctor.contentWindow).startsWith(p)) stage.doctor.src = `${location.pathname}${p}`;
      if (!hashOf(stage.phone.contentWindow).startsWith('#/app/share')) stage.phone.contentWindow.location.hash = '#/app/share';
    } else if (location.hash !== p) location.hash = p;
  } else {
    if (stage) stage.showDoctor(false);
    const w = appWin();
    if (hashOf(w) !== STEPS[st.step].route) w.location.hash = STEPS[st.step].route;
  }
  render();
}

/* ---------------------------------------------------------------- highlight */
let spotted = null;
function spot() {
  spotted?.classList.remove('gtour-spot');
  spotted = null;
  const st = read();
  if (!st || (st.min && !stage)) return;
  const docs = [];
  try { if (isPortalStep(st.step) && stage) docs.push(stage.doctor.contentDocument); } catch { /* ignore */ }
  try { docs.push(appWin().document); } catch { /* ignore */ }
  for (const doc of docs.filter(Boolean)) {
    for (const sel of STEPS[st.step].spot || []) {
      const t = [...doc.querySelectorAll(sel)].find((x) => x.getClientRects().length);
      if (t) { t.classList.add('gtour-spot'); spotted = t; return; }
    }
  }
}
let spotTimer = 0;
const queueSpot = () => { clearTimeout(spotTimer); spotTimer = setTimeout(spot, 160); };
const observed = new WeakSet();
function observe(win) {
  try {
    if (!win || !win.document?.body || observed.has(win)) return;
    observed.add(win);
    new win.MutationObserver((list) => { if (list.some((m) => m.target !== spotted)) queueSpot(); })
      .observe(win.document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-checked', 'aria-pressed', 'disabled', 'hidden'] });
    if (win !== window) win.addEventListener('hashchange', () => setTimeout(render, 0));
    win.addEventListener('mp:obstep', onObStep);
  } catch { /* not ready */ }
}

/* ---------------------------------------------------------------- card */
let el = null;
function flash(msg) {
  const n = el?.querySelector('[data-tmsg]');
  if (n) { n.textContent = msg; n.hidden = false; }
}
function render() {
  if (inFrame()) return; // the frames never show their own guide
  const st = read();
  if (!st) { el?.remove(); el = null; document.body.classList.remove('has-tour'); spot(); return; }
  if (!el) {
    el = document.createElement('aside');
    el.className = 'gtour';
    el.setAttribute('aria-label', 'Guided demo');
    el.addEventListener('click', onClick);
  }
  const host = stage ? stage.guide : document.body;
  if (el.parentElement !== host) host.appendChild(el);
  el.classList.toggle('gtour--stage', !!stage);
  document.body.classList.toggle('has-tour', !stage);
  const s = STEPS[st.step];
  const n = st.step + 1;
  const last = n === STEPS.length;
  el.classList.toggle('is-min', !!st.min && !stage);
  if (el.dataset.step !== String(st.step)) el.classList.remove('is-open');
  el.dataset.step = String(st.step);
  el.dataset.screen = location.hash.split('?')[0].replace(/^#\//, '').replace(/\//g, '-') || 'home';
  const doctorBtn = isPortalStep(st.step) && !stage && matchMedia('(min-width: 960px)').matches
    ? `<button type="button" class="gtour__link" data-t="window">${icon('eye')} Open the doctor’s screen in a second window</button>` : '';
  el.innerHTML = st.min && !stage
    ? `<button type="button" class="gtour__pill" data-t="open" aria-label="Show guided demo, step ${n} of ${STEPS.length}">${icon('play')}<span>Demo · ${n}/${STEPS.length}</span></button>`
    : `<div class="gtour__head">
        <span class="gtour__k">Guided demo · ${n}/${STEPS.length}</span>
        <span class="gtour__bar" aria-hidden="true"><i style="width:${(n / STEPS.length) * 100}%"></i></span>
        ${stage ? '' : `<button type="button" class="gtour__ic" data-t="min" aria-label="Minimise guide">${icon('chevron')}</button>`}
        <button type="button" class="gtour__ic" data-t="exit" aria-label="End guided demo">${icon('close')}</button>
      </div>
      <h2 class="gtour__h">${esc(s.title)}</h2>
      <p class="gtour__b" data-t="more">${s.body}</p>
      <button type="button" class="gtour__more" data-t="more">More about this step</button>
      <p class="gtour__tag">${icon('eye')} ${esc(s.tag)}</p>
      ${doctorBtn}
      ${s.console ? `<button type="button" class="gtour__link" data-t="console">${icon('umbrella')} See the request in the insurer console</button>` : ''}
      <p class="gtour__msg" data-tmsg role="status" hidden></p>
      <div class="gtour__nav">
        <button type="button" class="gtour__btn gtour__btn--line" data-t="prev" ${n === 1 ? 'disabled' : ''}>${icon('arrow', 'style="rotate:180deg"')}<span>Back</span></button>
        <button type="button" class="gtour__btn gtour__btn--line" data-t="here">${icon('pin')}<span>Go to step</span></button>
        <button type="button" class="gtour__btn" data-t="${last ? 'finish' : 'next'}"><span>${last ? 'Finish' : 'Next'}</span>${icon(last ? 'check' : 'arrow')}</button>
      </div>`;
  if (stage) { observe(stage.phone.contentWindow); observe(stage.doctor.contentWindow); } else observe(window);
  queueSpot();
}
function onClick(e) {
  const b = e.target.closest('[data-t]'); if (!b) return;
  const st = read(); if (!st) return;
  const a = b.dataset.t;
  if (a === 'more') { el.classList.toggle('is-open'); return; }
  if (a === 'min' || a === 'open') { st.min = a === 'min'; write(st); render(); return; }
  if (a === 'exit') { write(null); render(); if (stage) location.hash = '#/'; return; }
  if (a === 'prev') { go(st.step - 1); return; }
  if (a === 'next') { go(st.step + 1); return; }
  if (a === 'here') { go(st.step); return; }
  if (a === 'window') { const p = portalHash(); if (p) window.open(`${location.pathname}${p}`, 'mp-doctor', 'width=1100,height=800'); else flash('Create a doctor share first.'); return; }
  if (a === 'console') {
    if (stage) { stage.showDoctor(true, 'Insurer console'); stage.doctor.src = `${location.pathname}#/insurer?org=sternweg`; } else location.hash = STEPS[st.step].console;
    return;
  }
  if (a === 'finish') { write(null); render(); location.hash = '#/demo-complete'; }
}

// Onboarding has no URL per step: move the guide forward as the visitor goes.
const OB = { welcome: 0, country: 0, insurer: 1, connect: 1, upload: 2, extract: 3, review: 3, permissions: 4, done: 4 };
function onObStep(e) {
  const st = read();
  const to = OB[e.detail];
  if (!st || to === undefined || st.step > 4 || to === st.step) return;
  st.step = to; write(st); render();
}

/** Mount once at app start: keeps the card across screens and reloads. */
export function initTour() {
  if (presenting()) document.documentElement.classList.add('is-presenting');
  if (inFrame()) return;
  render();
  window.addEventListener('hashchange', () => setTimeout(render, 0));
}

/* ---------------------------------------------------------------- reset */
const KEEP = /^mp\.(backend|sb\.|ai\.cache|facilities|fx)/;
export function resetDemoNow() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('mp.') && !KEEP.test(k)).forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage).filter((k) => k.startsWith('mp.')).forEach((k) => sessionStorage.removeItem(k));
  } catch { /* ignore */ }
}
/** Ask, then clear demo data (onboarding, uploads, shares, requests, languages). Backend settings stay. */
export function confirmReset(after = '#/') {
  openSheet({
    title: 'Reset the demo?',
    html: `<div class="rv">
      <p class="rv-note">${icon('refresh')} <span>This clears the demo on this device: onboarding, uploads, shares and their activity, insurer requests and language choices. Your backend connection and sign-in are kept.</span></p>
      <div class="rv-actions"><button type="button" class="btn btn--ghost" data-sheet-close><span>Cancel</span><span class="btn__dot">${icon('close')}</span></button>
      <button type="button" class="btn" data-do-reset><span>Reset demo</span><span class="btn__dot">${icon('refresh')}</span></button></div>
    </div>`,
    mount(sheet) {
      sheet.querySelector('[data-do-reset]').addEventListener('click', () => {
        closeSheet(true);
        resetDemoNow();
        if (after === '#/present') setPresenting(true); // stay on stage when resetting from it
        location.replace(`${location.pathname}${after}`);
        location.reload();
      });
    },
  });
}

/* ---------------------------------------------------------------- pages */
/** #/tour: start the guided demo from any link (#/tour?present starts present mode). */
export const tourPage = {
  title: 'Guided demo · MediPassport',
  html: () => '<div class="tour-start"></div>',
  mount() {
    if (/[?&]present/.test(location.hash)) { setPresenting(true); location.replace('#/present'); return null; }
    setTimeout(startTour, 0);
    return null;
  },
};

const RECAP = [
  ['user', 'Residence', 'Germany · Lukas Becker'], ['umbrella', 'Insurer', 'Sternweg (fictional)'], ['upload', 'Documents', '3 German PDFs'],
  ['check', 'Verified', 'Every item checked'], ['card', 'Passport', 'Activated'], ['siren', 'Emergency', 'Shinjuku, Tokyo · 119'],
  ['map', 'Hospital', 'Real OpenStreetMap data'], ['translate', 'Translation', 'German → Japanese'], ['qr', 'QR share', '1 hour, revocable'],
  ['lock', 'Doctor portal', 'Access code'], ['swap', 'Side by side', 'Original + translation'], ['people', 'Insurer', 'Assistance requested'],
];
export const demoCompletePage = {
  title: 'Demo complete · MediPassport',
  html: () => `<section class="dfin">
    <div class="dfin__art">${illus('share', 'dfin__illus')}</div>
    <p class="label">Guided demo complete</p>
    <h1 class="dfin__h">Berlin to Tokyo,<br/><span class="serif">in twelve steps.</span></h1>
    <p class="dfin__sub">From travel insurance enrollment to a doctor reading German records in Japanese, and the insurer stepping in. Every screen you used is the real app.</p>
    <ol class="dfin__grid">${RECAP.map(([ic, k, v], i) => `<li style="--i:${i}"><span class="dfin__ic">${icon(ic)}</span><span><small>${String(i + 1).padStart(2, '0')} · ${k}</small><b>${v}</b></span></li>`).join('')}</ol>
    <p class="dfin__note">${icon('eye')} <span>Live: maps, hospital data, place search, on-device document reading, glossary translation, QR codes. Simulated: insurers, policy connection, network status, assistance requests. Clinician identity is not verified. Fictional data only.</span></p>
    <div class="dfin__actions">
      <a class="btn" href="#/tour"><span>Run it again</span><span class="btn__dot">${icon('play')}</span></a>
      <a class="btn btn--ghost" href="#/app"><span>Explore freely</span><span class="btn__dot">${icon('arrow')}</span></a>
      <a class="btn btn--ghost" href="#/insurer?org=sternweg"><span>Insurer console</span><span class="btn__dot">${icon('umbrella')}</span></a>
      <button type="button" class="btn btn--ghost" data-reset><span>Reset demo</span><span class="btn__dot">${icon('refresh')}</span></button>
    </div>
  </section>`,
  mount(root) {
    setPresenting(false); // the demo is over: show the full app again
    root.querySelector('[data-reset]').addEventListener('click', () => confirmReset());
    return null;
  },
};
