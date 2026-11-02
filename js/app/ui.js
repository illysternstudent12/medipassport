// Shared UI primitives for the app: bottom sheet / desktop dialog, toast,
// and the single source of truth for the desktop breakpoint.
import { icon } from '../icons.js';

/** Desktop layout starts here. Keep in sync with css/app.css. */
export const DESKTOP_MQ = '(min-width: 960px)';
export const isDesktop = () => matchMedia(DESKTOP_MQ).matches;

/* ---------------------------------------------------------------- Sheet */
let layer = null;
let lastFocus = null;

export function openSheet({ title, html, mount, tone = '' }) {
  closeSheet(true);
  lastFocus = document.activeElement;
  layer = document.createElement('div');
  layer.className = 'sheet-layer';
  layer.innerHTML = `
    <div class="sheet-backdrop" data-sheet-close></div>
    <div class="bsheet ${tone ? `bsheet--${tone}` : ''}" role="dialog" aria-modal="true" aria-label="${title}">
      <div class="bsheet__grab" data-grab><span></span></div>
      <div class="bsheet__head"><h2>${title}</h2><button type="button" class="bsheet__x" data-sheet-close aria-label="Close">${icon('close')}</button></div>
      <div class="bsheet__body">${html}</div>
    </div>`;
  document.body.appendChild(layer);
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => layer.classList.add('is-open'));
  layer.addEventListener('click', (e) => { if (e.target.closest('[data-sheet-close]')) closeSheet(); });
  const sheet = layer.querySelector('.bsheet');
  sheet.querySelector('.bsheet__x').focus({ preventScroll: true });

  // Drag down to dismiss
  const grab = layer.querySelector('[data-grab]');
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

export function closeSheet(immediate = false) {
  if (!layer) return;
  const l = layer;
  layer = null;
  document.body.classList.remove('is-locked');
  if (immediate) { l.remove(); return; }
  l.classList.remove('is-open');
  setTimeout(() => l.remove(), 450);
  lastFocus?.focus?.({ preventScroll: true });
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

