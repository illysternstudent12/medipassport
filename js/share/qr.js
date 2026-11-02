// Real, scannable QR codes for share links.
// Uses qrcode-generator (MIT, Kazuhiko Arase) from jsDelivr, loaded on demand.
// Only isDark()/getModuleCount() are used; the SVG is drawn here to match the design.

let libPromise = null;
function loadLib() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (libPromise) return libPromise;
  libPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';
    s.onload = () => (window.qrcode ? resolve(window.qrcode) : reject(new Error('QR library missing')));
    s.onerror = () => { libPromise = null; reject(new Error('QR library failed to load')); };
    document.head.appendChild(s);
  });
  return libPromise;
}

/** Returns an <svg> string encoding `text`, or throws if the library can't load. */
export async function qrSvg(text, { fg = '#000000', bg = '#FFFFFF', label = 'QR code' } = {}) {
  const qrcode = await loadLib();
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const q = 4; // quiet zone
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + q} ${r + q}h1v1h-1z`;
  return `<svg class="qr qr--real" viewBox="0 0 ${n + q * 2} ${n + q * 2}" role="img" aria-label="${label}" shape-rendering="crispEdges">
    <rect width="100%" height="100%" fill="${bg}"/><path d="${d}" fill="${fg}"/></svg>`;
}
