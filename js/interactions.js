// Shared micro-interactions.

/** Adds .is-in to .reveal elements as they scroll into view. Returns cleanup. */
export function observeReveals(root) {
  const els = root.querySelectorAll('.reveal, .split');
  if (!('IntersectionObserver' in window)) {
    els.forEach((el) => el.classList.add('is-in'));
    return () => {};
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  els.forEach((el) => io.observe(el));
  return () => io.disconnect();
}

/** Subtle magnetic pull on primary buttons (fine pointers only). */
export function enableMagnetic() {
  if (!matchMedia('(pointer: fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('pointermove', (e) => {
    const btn = e.target.closest?.('.btn');
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.12;
    const y = (e.clientY - r.top - r.height / 2) * 0.2;
    btn.style.translate = `${x}px ${y}px`;
    btn.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
  });
  document.addEventListener('pointerout', (e) => {
    const btn = e.target.closest?.('.btn');
    if (btn && !btn.contains(e.relatedTarget)) btn.style.translate = '';
  });
}
