// Minimal hash router. Routes look like "#/get-started".
// Section links use data-scroll="<id>" so they never collide with route hashes.

export function createRouter({ routes, notFound, outlet, onChange }) {
  let cleanup = null;
  let pendingScroll = null;

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

  function render() {
    const path = currentPath();
    const page = routes[path] || notFound;

    if (typeof cleanup === 'function') cleanup();
    outlet.innerHTML = page.html();
    outlet.classList.remove('route-enter');
    void outlet.offsetWidth; // restart animation
    outlet.classList.add('route-enter');
    document.title = page.title;
    cleanup = page.mount ? page.mount(outlet) : null;

    onChange?.(path);

    if (pendingScroll) {
      const id = pendingScroll;
      pendingScroll = null;
      requestAnimationFrame(() => scrollToSection(id, false));
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
      // Move focus for screen readers without scrolling.
      outlet.focus({ preventScroll: true });
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
