// Shared UI primitives for the app: bottom sheet / desktop dialog, toast,
// and the single source of truth for the desktop breakpoint.
import { icon } from '../icons.js';
import { pushOverlay, closeOverlay, dropOverlay, isOpen } from '../nav.js';

/** Desktop layout starts here. Keep in sync with css/app.css. */
export const DESKTOP_MQ = '(min-width: 960px)';
export const isDesktop = () => matchMedia(DESKTOP_MQ).matches;

/* ---------------------------------------------------------------- Sheet */
// A sheet is a history overlay: Android Back, swipe-back and the browser's
// Back close it, exactly like the X button or dragging it down.
let layer = null;
let lastFocus = null;

function removeLayer(el, animate = true) {
  if (!el || el.dataset.closing !== undefined) return;
  el.dataset.closing = '';
  if (!document.querySelector('.sheet-layer:not([data-closing])')) document.body.classList.remove('is-locked');
  if (!animate) { el.remove(); return; }
  el.classList.remove('is-open');
  setTimeout(() => el.remove(), 450);
}

export function openSheet({ title, html, mount, tone = '' }) {
  const replacing = !!layer && isOpen('sheet');
  if (layer) removeLayer(layer, false);
  lastFocus = replacing ? lastFocus : document.activeElement;
  const el = document.createElement('div');
  layer = el;
  el.className = 'sheet-layer';
  el.innerHTML = `
    <div class="sheet-backdrop" data-sheet-close></div>
    <div class="bsheet ${tone ? `bsheet--${tone}` : ''}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="bsheet__grab" data-grab><span></span></div>
      <div class="bsheet__head"><h2>${title}</h2><button type="button" class="bsheet__x" data-sheet-close aria-label="Close">${icon('close')}</button></div>
      <div class="bsheet__body">${html}</div>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => el.classList.add('is-open'));
  el.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) closeSheet(); });
  const sheet = el.querySelector('.bsheet');
  sheet.querySelector('.bsheet__x').focus({ preventScroll: true });

  // Back (system, gesture or browser) closes this sheet.
  if (!replacing) {
    pushOverlay('sheet', () => {
      removeLayer(el);
      if (layer === el) layer = null;
      lastFocus?.focus?.({ preventScroll: true });
    });
  }

  // Drag down to dismiss
  const grab = el.querySelector('[data-grab]');
  let y0 = null, dy = 0;
  grab.addEventListener('pointerdown', (e) => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); sheet.style.transition = 'none'; });
  grab.addEventListener('pointermove', (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sheet.style.transform = `translateY(${dy}px)`; });
  grab.addEventListener('pointerup', () => {
    sheet.style.transition = ''; sheet.style.transform = '';
    if (dy > 90) closeSheet();
    y0 = null; dy = 0;
  });
  mount?.(sheet);
}

/** Close the open sheet. `immediate` = the screen is changing (no history step). */
export function closeSheet(immediate = false) {
  if (!layer) return;
  const el = layer;
  layer = null;
  if (immediate) { dropOverlay('sheet'); removeLayer(el, false); return; }
  removeLayer(el); // close visually now; the history step below catches up
  lastFocus?.focus?.({ preventScroll: true });
  if (isOpen('sheet')) closeOverlay('sheet');
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && layer) closeSheet(); });
window.addEventListener('hashchange', () => closeSheet(true));

/* ---------------------------------------------------------------- Toast */
let toastTimer = 0;
export function toast(msg) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add('is-in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-in'), 3200);
}

