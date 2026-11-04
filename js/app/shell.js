// App chrome shared by the traveler dashboard routes:
// shell layout, bottom navigation, bottom sheets, toasts, and the
// illustrated portrait + destination scene "photography".
import { icon } from '../icons.js';
import { BrandMark } from '../components.js';
import { TRAVELERS, currentTraveler, setTraveler, localTime } from './data.js';
import { openSheet, closeSheet, toast, DESKTOP_MQ } from './ui.js';
import { backButton } from '../nav.js';

export { openSheet, closeSheet, toast };

export const APP_ROUTES = {
  home: '#/app',
  passport: '#/app/passport',
  documents: '#/app/documents',
  profile: '#/app/profile',
};

const NAV = [
  { key: 'home', label: 'Home', ic: 'home' },
  { key: 'passport', label: 'Passport', ic: 'card' },
  { key: 'documents', label: 'Documents', ic: 'file' },
  { key: 'profile', label: 'Profile', ic: 'user' },
];

/* ---------------------------------------------------------------- Portrait */
// Faceless editorial illustration standing in for a patient photo.
let pid = 0;
export function Portrait(t, cls = '') {
  const p = t.portrait;
  const id = `pt${++pid}`;
  const bg = { mint: ['#DCEDD7', '#C1DEBA', '#8FB985'], peach: ['#F2DCCF', '#E7C4B1', '#D9A68C'], gray: ['#E6DFDA', '#D4CBC5', '#B3A79F'] }[p.bg];
  const hairBack = {
    bun: `<circle cx="60" cy="27" r="12" fill="${p.hair}"/><path d="M35 70C32 42 46 31 60 31s28 11 25 39c-3-15-12-22-25-22S38 55 35 70z" fill="${p.hair}"/>`,
    short: '',
    curly: [[36, 50, 13], [44, 34, 14], [60, 28, 15], [76, 34, 14], [84, 50, 13], [32, 66, 10], [88, 66, 10]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.hair}"/>`).join(''),
  }[p.hairStyle];
  const hairFront = {
    bun: '',
    short: `<path d="M37 62C35 40 48 34 60 34c16 0 26 8 23 28-3-12-11-17-23-16-10 0-18 4-23 16z" fill="${p.hair}"/>`,
    curly: [[46, 40, 9], [58, 36, 10], [71, 39, 9]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.hair}"/>`).join(''),
  }[p.hairStyle];
  return `<svg class="portrait ${cls}" viewBox="0 0 120 150" role="img" aria-label="Illustrated portrait of ${t.first} ${t.last}">
    <defs>
      <radialGradient id="${id}b" cx="30%" cy="20%" r="90%"><stop offset="0" stop-color="${bg[0]}"/><stop offset=".6" stop-color="${bg[1]}"/><stop offset="1" stop-color="${bg[2]}"/></radialGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".6" stop-color="#fff" stop-opacity="0"/></linearGradient>
      <filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .22 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    </defs>
    <rect width="120" height="150" fill="url(#${id}b)"/>
    ${hairBack}
    <path d="M8 150c4-34 26-44 52-44s48 10 52 44z" fill="${p.top}"/>
    <rect x="51" y="80" width="18" height="30" rx="8" fill="${p.skin}"/>
    <rect x="51" y="92" width="18" height="10" fill="#000" opacity=".12"/>
    <ellipse cx="38.5" cy="68" rx="4" ry="6" fill="${p.skin}"/><ellipse cx="81.5" cy="68" rx="4" ry="6" fill="${p.skin}"/>
    <ellipse cx="60" cy="64" rx="22" ry="27" fill="${p.skin}"/>
    <ellipse cx="66" cy="70" rx="14" ry="20" fill="#000" opacity=".06"/>
    ${hairFront}
    <rect width="120" height="150" fill="url(#${id}l)"/>
    <rect width="120" height="150" filter="url(#${id}g)" fill="#000"/>
  </svg>`;
}

/* ---------------------------------------------------------------- Scenes */
// Painterly destination "photographs": layered SVG with soft blur + grain.
export function Scene(kind, cls = '') {
  const id = `sc${++pid}`;
  const defs = `<defs>
    <filter id="${id}s" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <filter id="${id}x" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="${id}g"><feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .15 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>`;
  const grain = `<rect width="400" height="240" filter="url(#${id}g)" fill="#000"/>`;
  let body = '';
  if (kind === 'coast') {
    body = `${defs}<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2DCCF"/><stop offset=".55" stop-color="#E7C4B1"/><stop offset="1" stop-color="#D9A68C"/></linearGradient></defs>
      <rect width="400" height="240" fill="url(#${id}k)"/>
      <circle cx="285" cy="118" r="34" fill="#FBF3EB" opacity=".9" filter="url(#${id}x)"/>
      <path d="M0 132 L40 132 L44 108 L48 132 L70 132 L76 96 L80 70 L84 96 L88 76 L92 98 L96 66 L100 98 L104 80 L108 132 L150 132 L156 118 L190 118 L196 132 L400 132 V150 H0z" fill="#B3A79F" opacity=".85" filter="url(#${id}s)"/>
      <rect y="140" width="400" height="100" fill="#C1DEBA"/>
      <rect y="140" width="400" height="100" fill="#8FB985" opacity=".35"/>
      ${[150, 162, 176, 194, 216].map((y, i) => `<rect x="${(i * 53) % 120}" y="${y}" width="${260 - i * 20}" height="${1.5 + i * 0.5}" rx="1" fill="#FBF3EB" opacity="${0.55 - i * 0.07}"/>`).join('')}
      <path d="M232 152 q53 -5 106 0" stroke="#FBF3EB" stroke-width="3" opacity=".6" fill="none" filter="url(#${id}s)"/>
      <path d="M330 240 C328 190 340 160 352 140" stroke="#2a2420" stroke-width="4" fill="none"/>
      ${[[-50, 20], [-20, 32], [10, 26], [40, 18], [-80, 8]].map(([a, l]) => `<path d="M352 140 q${l * Math.cos(a * Math.PI / 180)} ${-6 - l * 0.2} ${l * 1.6 * Math.cos(a * Math.PI / 180)} ${l * 0.5}" stroke="#2a2420" stroke-width="5" fill="none" stroke-linecap="round"/>`).join('')}
      <path d="M352 140 q-24 -6 -40 6 M352 140 q-10 -20 -30 -22 M352 140 q14 -20 34 -18 M352 140 q26 -2 38 14 M352 140 q2 -24 -4 -38" stroke="#2a2420" stroke-width="4" fill="none" stroke-linecap="round"/>`;
  } else if (kind === 'hills') {
    body = `${defs}<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FBF3EB"/><stop offset="1" stop-color="#F2DCCF"/></linearGradient></defs>
      <rect width="400" height="240" fill="url(#${id}k)"/>
      <circle cx="90" cy="64" r="26" fill="#E7C4B1" filter="url(#${id}x)"/>
      <path d="M0 120 C80 90 160 100 240 80 S360 70 400 84 V240 H0z" fill="#D4CBC5" filter="url(#${id}s)"/>
      ${Array.from({ length: 18 }, (_, i) => { const x = i * 23 + 4; const y = 104 - Math.sin(i / 3) * 14 - (i > 8 ? 10 : 0); return `<rect x="${x}" y="${y}" width="18" height="${22 + (i % 3) * 6}" fill="${['#FBF3EB', '#F2DCCF', '#FFFFFF', '#E7C4B1'][i % 4]}"/><path d="M${x - 1} ${y} l10 -7 l10 7z" fill="#D9A68C"/>`; }).join('')}
      <path d="M0 170 C90 140 200 160 280 138 S380 130 400 136 V240 H0z" fill="#C1DEBA"/>
      ${Array.from({ length: 14 }, (_, i) => { const x = i * 30 - 6; const y = 150 - Math.sin(i / 2.4) * 10; return `<rect x="${x}" y="${y}" width="24" height="${30 + (i % 2) * 10}" fill="${['#FFFFFF', '#E7C4B1', '#FBF3EB'][i % 3]}"/><rect x="${x + 5}" y="${y + 8}" width="5" height="7" fill="#B3A79F"/><rect x="${x + 14}" y="${y + 8}" width="5" height="7" fill="#B3A79F"/><path d="M${x - 2} ${y} l14 -9 l14 9z" fill="#D9A68C"/>`; }).join('')}
      <path d="M0 208 C120 196 260 214 400 200 V240 H0z" fill="#8FB985"/>
      <g transform="translate(150 178)"><rect width="74" height="34" rx="8" fill="#E7C4B1"/><rect x="6" y="6" width="14" height="12" rx="2" fill="#FBF3EB"/><rect x="24" y="6" width="14" height="12" rx="2" fill="#FBF3EB"/><rect x="42" y="6" width="14" height="12" rx="2" fill="#FBF3EB"/><rect y="24" width="74" height="4" fill="#D9A68C"/><path d="M37 0 L44 -14" stroke="#2a2420" stroke-width="1.5"/></g>`;
  } else {
    body = `${defs}<linearGradient id="${id}k" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7C4B1"/><stop offset=".7" stop-color="#FBF3EB"/></linearGradient></defs>
      <rect width="400" height="240" fill="url(#${id}k)"/>
      <circle cx="120" cy="80" r="30" fill="#D9A68C" opacity=".8" filter="url(#${id}x)"/>
      <path d="M0 130 L60 84 L110 116 L170 62 L240 118 L300 80 L400 124 V240 H0z" fill="#D4CBC5" filter="url(#${id}s)"/>
      <path d="M0 160 L70 118 L140 150 L210 108 L290 156 L350 126 L400 146 V240 H0z" fill="#C1DEBA" opacity=".9"/>
      <rect y="150" width="400" height="26" fill="#FBF3EB" opacity=".55" filter="url(#${id}x)"/>
      <path d="M0 196 C80 172 150 188 230 170 S350 176 400 168 V240 H0z" fill="#8FB985"/>
      <g fill="#1d1916" transform="translate(286 92)">
        <rect x="18" y="0" width="2" height="16"/>
        ${[0, 1, 2, 3, 4].map((i) => `<path d="M${2 - i * 3} ${16 + i * 18} h${34 + i * 6} l${-6} 8 h${-(22 + i * 6)} z"/><rect x="${10 - i}" y="${24 + i * 18}" width="${18 + i * 2}" height="10"/>`).join('')}
        <rect x="4" y="106" width="30" height="20"/>
      </g>
      ${[[40, 210], [70, 220], [110, 214], [190, 222], [230, 212]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="16" ry="10" fill="#E7C4B1" opacity=".9"/>`).join('')}`;
  }
  return `<svg class="scene ${cls}" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" aria-hidden="true">${body}${grain}</svg>`;
}

/* ---------------------------------------------------------------- Shell */
// One markup tree, two layouts (css/app.css):
//  · mobile  (< 960px): full-bleed view, floating bottom dock, sheets from below
//  · desktop (≥ 960px): side navigation, multi-column page grids, dialogs
export function appShell(active, content, t = currentTraveler()) {
  return `
  <div class="app-stage">
    <span class="blob app-blob" style="width:40vw;height:40vw;left:-12vw;top:10vh;background:var(--mint);opacity:.45"></span>
    <span class="blob app-blob" style="width:34vw;height:34vw;right:-10vw;bottom:0;background:var(--peach);opacity:.5;animation-delay:-9s"></span>
    ${SideNav(active, t)}
    <div class="app-frame" data-app-frame>
      <div class="app-view app-view--${active}" data-traveler="${t.id}">${content}</div>
      <a class="fab-sos ${active === 'home' ? '' : 'is-in'}" href="#/app/emergency">${icon('siren')}<span>I need help</span></a>
      ${BottomNav(active)}
    </div>
  </div>`;
}

function SideNav(active, t) {
  return `<aside class="snav" aria-label="Dashboard">
    <a class="brand snav__brand" href="#/">${BrandMark()}<span>Medi<span class="brand__serif">passport</span></span></a>
    <nav class="snav__nav" aria-label="App">
      ${NAV.map((n) => `<a class="snav__item" href="${APP_ROUTES[n.key]}" ${n.key === active ? 'aria-current="page"' : ''}>${icon(n.ic)}<span>${n.label}</span></a>`).join('')}
    </nav>
    <a class="snav__sos" href="#/app/emergency">${icon('siren')}<span><b>I need medical help</b><small>Find care · passport · call ${t.trip.emergency}</small></span></a>
    <div class="snav__pro">
      <span class="label">Connected care</span>
      <a class="snav__item snav__item--sm" href="#/app/share">${icon('qr')}<span>Secure sharing</span></a>
      <a class="snav__item snav__item--sm" href="#/insurer" target="_blank" rel="noopener">${icon('umbrella')}<span>Insurer console</span></a>
    </div>
    <div class="snav__who">
      <span class="label">Demo traveler</span>
      ${TravelerSwitch(t, 'compact')}
    </div>
    <a class="snav__back" href="#/">${icon('arrow', 'style="rotate:180deg"')} Back to website</a>
  </aside>`;
}

export function TravelerSwitch(t, variant = '') {
  return `<div class="tswitch tswitch--${variant}" role="group" aria-label="Choose demo traveler">
    ${TRAVELERS.map((x) => `<button type="button" class="tswitch__item" data-traveler-set="${x.id}" aria-pressed="${x.id === t.id}">
      <span class="tswitch__ph">${Portrait(x)}</span>
      <span class="tswitch__txt"><b>${x.first} ${x.last}</b><small>${x.trip.city}, ${x.trip.country}</small></span>
    </button>`).join('')}
  </div>`;
}

function BottomNav(active) {
  return `<nav class="bnav" aria-label="App">
    ${NAV.map((n) => `<a class="bnav__item" href="${APP_ROUTES[n.key]}" ${n.key === active ? 'aria-current="page"' : ''}>
      <span class="bnav__ic">${icon(n.ic)}</span><span class="bnav__label">${n.label}</span></a>`).join('')}
  </nav>`;
}

/** Page top bar. Mobile: avatar + small title + location. Desktop: large title + live context. */
export function AppTop(t, { title, desk, back } = {}) {
  // Main tabs show the avatar; secondary screens show Back (real history, with a fallback).
  return `<header class="atop ${back ? 'atop--sub' : ''}">
    ${back ? backButton(back) : `<a class="atop__me" href="${APP_ROUTES.profile}" aria-label="Profile: ${t.first} ${t.last}">${Portrait(t)}</a>`}
    ${title ? `<h1 class="atop__title">${title}</h1>` : ''}
    <h1 class="atop__desk" aria-hidden="${title ? 'true' : 'false'}">${desk || title || 'Today'}</h1>
    <span class="atop__ctx">
      <span class="atop__time">${icon('clock')} <span data-local-time></span></span>
      <span class="atop__loc">${icon('pin')} ${t.trip.city}</span>
    </span>
  </header>`;
}

/* ---------------------------------------------------------------- Mount */
/** Shared behaviour for every app page. Returns cleanup. */
export function mountShell(root) {
  const t = currentTraveler();
  const onClick = (e) => {
    const b = e.target.closest('[data-traveler-set]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    setTraveler(b.dataset.travelerSet);
    closeSheet(true);
    rerender();
    toast(`Now viewing ${b.querySelector('b').textContent}’s passport`);
  };
  root.addEventListener('click', onClick);
  document.addEventListener('click', onDemoClick);

  // Live destination clock in every top bar
  const paintTime = () => root.querySelectorAll('.atop [data-local-time]').forEach((el) => { el.textContent = `${localTime(t)} local`; });
  paintTime();
  const clock = setInterval(paintTime, 15000);

  // Crossing the breakpoint swaps layouts that are built differently in JS
  // (wallet stack vs. grid, document sheet vs. preview pane).
  const mq = matchMedia(DESKTOP_MQ);
  const onMq = () => rerender();
  mq.addEventListener('change', onMq);

  return () => {
    root.removeEventListener('click', onClick);
    document.removeEventListener('click', onDemoClick);
    mq.removeEventListener('change', onMq);
    clearInterval(clock);
  };
}
const rerender = () => window.dispatchEvent(new HashChangeEvent('hashchange'));
function onDemoClick(e) {
  const d = e.target.closest('[data-demo]');
  if (d) { e.preventDefault(); toast(d.dataset.demo); }
}
