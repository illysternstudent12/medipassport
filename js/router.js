// Minimal hash router. Routes look like "#/get-started".
// Section links use data-scroll="<id>" so they never collide with route hashes.
import { syncEntry, savedScroll } from './nav.js';

export function createRouter({ routes, notFound, outlet, onChange }) {
  let cleanup = null;
  let pendingScroll = null;
  let seq = 0; // newest render wins if navigations overlap during a transition

  const currentPath = () => {
    const h = location.hash.replace(/^#/, '');
    return h.startsWith('/') ? h.split('?')[0] : '/';
  };

  function scrollToSection(id, smooth = true) {
    const target = document.getElementById(id);
    if (!target) return false;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto', block: 'start' });
    return true;
  }

  // Smooth, shared-element screen changes where the browser supports them.
  const canTransition = () => 'startViewTransition' in document && !matchMedia('(prefers-reduced-motion: reduce)').matches;

  function render() {
    const path = currentPath();
    const page = routes[path] || notFound;

    const dir = syncEntry(); // 'forward' | 'back' | 'refresh' | 'load' (new tab/link) | 'reload'
    if (typeof cleanup === 'function') { cleanup(); cleanup = null; }
    // A fresh container per render: listeners a page attaches to its root are
    // discarded with it, so revisiting a route never stacks duplicate handlers.
    const view = document.createElement('div');
    view.className = 'route-view';
    view.innerHTML = page.html();
    const moving = dir === 'forward' || dir === 'back';
    const token = ++seq;

    // Everything after the swap: the page mounts only once it is in the document.
    const finish = () => {
      if (token !== seq) return;
      outlet.replaceChildren(view);
      outlet.dataset.nav = dir;
      document.title = page.title;
      cleanup = page.mount ? page.mount(view) : null;
      onChange?.(path);
      if (pendingScroll) {
        const id = pendingScroll;
        pendingScroll = null;
        requestAnimationFrame(() => scrollToSection(id, false));
      } else if (dir === 'forward' || dir === 'load') {
        window.scrollTo({ top: 0, behavior: 'auto' });
        // Move focus for screen readers without scrolling.
        outlet.focus({ preventScroll: true });
      } else {
        // Back, refresh or reload: return to where the user was on this screen.
        const y = savedScroll();
        window.scrollTo({ top: y, behavior: 'auto' });
        requestAnimationFrame(() => window.scrollTo({ top: y, behavior: 'auto' }));
      }
    };

    if (moving && canTransition()) {
      document.documentElement.dataset.vt = dir;
      try {
        const vt = document.startViewTransition(finish);
        // A quick second navigation skips the animation; that's expected, not an error.
        vt.ready.catch(() => {}); vt.finished.catch(() => {}); vt.updateCallbackDone?.catch(() => {});
        return;
      } catch { /* fall through */ }
    }
    finish();
    if (moving) {
      outlet.classList.remove('route-enter');
      void outlet.offsetWidth; // restart animation
      outlet.classList.add('route-enter');
    }
  }

  // Delegate clicks on section links
  document.addEventListener('click', (e) => {
    const a = e.target.closest('[data-scroll]');
    if (!a) return;
    e.preventDefault();
    const id = a.getAttribute('data-scroll');
    if (currentPath() === '/') {
      scrollToSection(id);
    } else {
      pendingScroll = id;
      location.hash = '#/';
    }
  });

  window.addEventListener('hashchange', render);

  return {
    start() {
      if (!location.hash) history.replaceState(null, '', '#/');
      render();
    },
  };
}
