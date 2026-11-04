// History-aware navigation (Batch 6.6).
//
// Every screen, step, sheet and detail view is a real browser-history entry,
// so the in-app Back button, Android's system Back, iOS/Android swipe-back
// gestures and the browser's own Back all do the same thing.
//
//  · Screens   — hash routes. Each entry gets an index (history.state.i) so we
//                know if we went back or forward, and restore scroll on back.
//  · Overlays  — sheets, map details, onboarding steps: pushState on the same
//                URL. Back pops the overlay instead of leaving the screen.
//  · goBack()  — real history.back() when there is an in-app entry behind us,
//                otherwise a sensible parent screen (deep links, new tabs).

const SCROLL = 'mp.nav.scroll';
let current = 0;          // index of the entry we're on
let direction = 'load';   // 'forward' | 'back' | 'refresh' | 'load'
const overlays = [];      // stack of { id, onPop }
let popWaiters = [];      // resolvers waiting for the next popstate

const state = () => history.state || {};
const readScroll = () => { try { return JSON.parse(sessionStorage.getItem(SCROLL)) || {}; } catch { return {}; } };
const writeScroll = (o) => { try { sessionStorage.setItem(SCROLL, JSON.stringify(o)); } catch { /* ignore */ } };

/** Called by the router before each render. Returns the navigation direction. */
let loaded = false;
export function syncEntry() {
  // Save where the user was on the screen we're leaving (DOM not yet replaced).
  if (loaded) saveScroll(currentHash, current, scrollY);
  const s = state();
  if (typeof s.i !== 'number') {
    // A brand-new entry: the first screen of this page load is 0, then +1 per screen.
    const i = loaded ? current + 1 : 0;
    history.replaceState({ ...s, i }, '');
    direction = loaded ? 'forward' : 'load';
    current = i;
  } else {
    // An entry we already know: reload (first render of this page load), back, forward or in-place refresh.
    direction = !loaded ? 'reload' : s.i < current ? 'back' : s.i > current ? 'forward' : 'refresh';
    current = s.i;
  }
  loaded = true;
  currentHash = location.hash;
  overlays.length = 0; // a new screen never inherits overlays
  return direction;
}
export const navDirection = () => direction;
export const canGoBack = () => current > 0;

/** Back to the real previous screen, or to `fallback` when there is none. */
export function goBack(fallback = '#/app') {
  if (overlays.length) { closeTopOverlay(); return; }
  if (canGoBack()) history.back();
  else location.hash = fallback;
}

/* ---------------------------------------------------------------- scroll */
let currentHash = location.hash;
function saveScroll(hash, i, y) { const o = readScroll(); o[`${i}|${hash}`] = Math.round(y); writeScroll(o); }
let scrollTimer = 0;
window.addEventListener('scroll', () => {
  clearTimeout(scrollTimer);
  const i = current, h = currentHash; // bind to this screen, even if the event arrives late
  scrollTimer = setTimeout(() => { if (i === current && h === currentHash) saveScroll(h, i, scrollY); }, 120);
}, { passive: true });
addEventListener('pagehide', () => saveScroll(currentHash, current, scrollY));
/** Scroll position to restore for the current entry (only meaningful on back/refresh). */
export const savedScroll = () => readScroll()[`${current}|${currentHash}`] ?? 0;

/* ---------------------------------------------------------------- overlays */
/** Wait until any history.back() we triggered has landed. */
export const settled = () => (popWaiters.length ? new Promise((r) => popWaiters.push(r)) : Promise.resolve());

/**
 * Register an overlay (sheet, detail view, step). Back closes it.
 * @param {string} id
 * @param {() => void} onPop  called when the overlay is popped by Back
 * @param {object} extra      extra history state (e.g. { obstep: 3 })
 */
export async function pushOverlay(id, onPop, extra = {}) {
  await settled();
  overlays.push({ id, onPop });
  history.pushState({ ...state(), overlay: id, ...extra }, '');
}
/** Replace the state of the current entry (e.g. a step changing in place). */
export const patchState = (extra) => history.replaceState({ ...state(), ...extra }, '');
export const isOpen = (id) => overlays.some((o) => o.id === id);

/** Close the top overlay via history, so Back and the close button stay in sync. */
export function closeTopOverlay() {
  if (!overlays.length) return Promise.resolve();
  const p = new Promise((r) => popWaiters.push(r));
  history.back();
  return p;
}
/** Close a specific overlay if it's on top; otherwise forget it. */
export function closeOverlay(id) {
  const top = overlays[overlays.length - 1];
  if (top?.id === id) return closeTopOverlay();
  const i = overlays.findIndex((o) => o.id === id);
  if (i >= 0) overlays.splice(i, 1);
  return Promise.resolve();
}
/** Forget an overlay without touching history (it was closed some other way). */
export function dropOverlay(id) {
  const i = overlays.findIndex((o) => o.id === id);
  if (i >= 0) overlays.splice(i, 1);
}

window.addEventListener('popstate', (e) => {
  const s = e.state || {};
  // Same-URL pops (no hashchange): close overlays above the state we landed on.
  if (typeof s.i === 'number' && s.i === current) {
    while (overlays.length && overlays[overlays.length - 1].id !== s.overlay) {
      const o = overlays.pop();
      try { o.onPop?.(s); } catch { /* ignore */ }
    }
    listeners.forEach((fn) => fn(s));
  }
  const w = popWaiters; popWaiters = [];
  w.forEach((r) => r());
});
const listeners = new Set();
/** Same-screen history changes (e.g. onboarding steps). */
export const onSameScreenPop = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };

/* ---------------------------------------------------------------- links & buttons */
document.addEventListener('click', (e) => {
  // In-app back buttons: <button data-nav-back="#/fallback">
  const b = e.target.closest('[data-nav-back]');
  if (b) { e.preventDefault(); goBack(b.dataset.navBack || '#/app'); return; }
  // Leaving the screen while overlays are open: pop them first so Back later
  // returns to this screen, not to a dead overlay entry.
  const a = e.target.closest('a[href^="#/"]');
  if (a && overlays.length && !a.target) {
    e.preventDefault();
    const href = a.getAttribute('href');
    const n = overlays.length;
    overlays.length = 0;
    const done = new Promise((r) => popWaiters.push(r));
    history.go(-n);
    done.then(() => { location.hash = href; });
  }
}, true);

/** Back button markup for headers. */
export const backButton = (fallback, label = 'Back', cls = '') =>
  `<button type="button" class="navback ${cls}" data-nav-back="${fallback}" aria-label="${label}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg><span>${label}</span></button>`;

/* ---------------------------------------------------------------- view state */
// Drafts and selections that should survive leaving and coming back.
export function remember(key, data) { try { sessionStorage.setItem(`mp.view.${key}`, JSON.stringify(data)); } catch { /* ignore */ } }
export function recall(key) { try { return JSON.parse(sessionStorage.getItem(`mp.view.${key}`)); } catch { return null; } }
export function forget(key) { try { sessionStorage.removeItem(`mp.view.${key}`); } catch { /* ignore */ } }

/* ---------------------------------------------------------------- edge swipe (home-screen app) */
// Browsers already turn edge swipes into Back. When MediPassport runs as a
// home-screen app (no browser chrome), add the same gesture ourselves.
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
if (standalone) {
  let x0 = null, y0 = 0;
  addEventListener('touchstart', (e) => { const t = e.touches[0]; x0 = t.clientX < 24 ? t.clientX : null; y0 = t.clientY; }, { passive: true });
  addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const t = e.changedTouches[0];
    if (t.clientX - x0 > 80 && Math.abs(t.clientY - y0) < 50 && (canGoBack() || overlays.length)) goBack();
    x0 = null;
  }, { passive: true });
}
