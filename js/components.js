// Component library: string-template components + header/footer behaviour.
// Every component returns an HTML string so pages stay declarative.
import { icon } from './icons.js';

export const ROUTES = {
  home: '#/',
  start: '#/get-started',
  demo: '#/app',
  partners: '#/partners',
};

// Landing sections reachable from navigation. `data-scroll` links work from any route.
export const SECTIONS = [
  { id: 'passport', label: 'Passport' },
  { id: 'translation', label: 'AI Translation' },
  { id: 'emergency', label: 'Emergency' },
  { id: 'insurers', label: 'Insurers' },
];

/* ------------------------------------------------------------------ Brand */
/** Four-petal mark: a medical cross drawn as an organic bloom. */
export function BrandMark(cls = 'brand__mark') {
  return `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true">
    <circle cx="16" cy="16" r="16" fill="currentColor"/>
    <g fill="var(--mark-petal, #C1DEBA)">
      <ellipse cx="16" cy="9.6" rx="3.7" ry="5.4"/><ellipse cx="16" cy="22.4" rx="3.7" ry="5.4"/>
      <ellipse cx="9.6" cy="16" rx="5.4" ry="3.7"/><ellipse cx="22.4" cy="16" rx="5.4" ry="3.7"/>
    </g>
    <circle cx="16" cy="16" r="2.4" fill="var(--mark-core, #E7C4B1)"/>
  </svg>`;
}

export function Brand() {
  return `<a class="brand" href="${ROUTES.home}" aria-label="MediPassport home">${BrandMark()}<span>Medi<span class="brand__serif">passport</span></span></a>`;
}

/* ----------------------------------------------------------------- Button */
/**
 * Pill button with circular arrow badge and liquid hover fill.
 * @param {{label:string, href?:string, variant?:'primary'|'light'|'mint'|'ghost'|'ghost-light',
 *          size?:'sm', iconName?:string|false, cls?:string, attrs?:string, type?:string}} o
 */
export function Button({ label, href, variant = 'primary', size, iconName = 'arrow', cls = '', attrs = '', type }) {
  const classes = ['btn', variant !== 'primary' && `btn--${variant}`, size && `btn--${size}`, !iconName && 'btn--plain', cls]
    .filter(Boolean).join(' ');
  const dot = iconName ? `<span class="btn__dot">${icon(iconName)}</span>` : '';
  const inner = `<span>${label}</span>${dot}`;
  return type
    ? `<button class="${classes}" type="${type}" ${attrs}>${inner}</button>`
    : `<a class="${classes}" href="${href}" ${attrs}>${inner}</a>`;
}

/* -------------------------------------------------------------- Small bits */
export function Tag(label, { iconName, variant = '', cls = '' } = {}) {
  return `<span class="tag ${variant ? `tag--${variant}` : ''} ${cls}">${iconName ? icon(iconName) : ''}${label}</span>`;
}

export function Eyebrow(num, label) {
  return `<span class="eyebrow"><span class="eyebrow__num">${num}</span>${label}</span>`;
}

/** Headline whose lines slide up one after another. `lines` may contain HTML. */
export function SplitHeading(tag, lines, cls = '') {
  return `<${tag} class="split ${cls}">${lines
    .map((l, i) => `<span class="line"><span style="--i:${i}">${l}</span></span>`)
    .join('')}</${tag}>`;
}

/**
 * Floating widget card.
 * @param {{label?:string, value?:string, iconName?:string, body?:string, variant?:string, cls?:string, style?:string}} o
 */
export function Widget({ label, value, iconName, body = '', variant = '', cls = '', style = '' }) {
  const head = iconName
    ? `<div class="widget__row"><span class="widget__icon">${icon(iconName)}</span><div>${label ? `<div class="widget__label">${label}</div>` : ''}${value ? `<div class="widget__value">${value}</div>` : ''}</div></div>`
    : `${label ? `<div class="widget__label">${label}</div>` : ''}${value ? `<div class="widget__value">${value}</div>` : ''}`;
  return `<div class="widget ${variant ? `widget--${variant}` : ''} ${cls}" style="${style}">${head}${body}</div>`;
}

/** Phone frame. `screen` is the inner HTML of the display. */
export function Phone(screen, cls = '') {
  return `<div class="phone ${cls}">
    <div class="phone__screen">
      <span class="phone__island" aria-hidden="true"></span>
      <div class="phone__status" aria-hidden="true"><span>9:41</span><span style="display:flex;gap:4px;align-items:center">${icon('wifi', 'width="13" height="13"')}<svg width="22" height="11" viewBox="0 0 22 11"><rect x=".5" y=".5" width="18" height="10" rx="3" fill="none" stroke="currentColor" opacity=".5"/><rect x="2" y="2" width="13" height="7" rx="1.6" fill="currentColor"/></svg></span></div>
      ${screen}
    </div>
  </div>`;
}

/** Physical passport booklet, black leather with peach foil. */
export function PassportBooklet(name = 'Medical Passport', cls = '') {
  return `<div class="passport ${cls}" aria-hidden="true">
    <div class="passport__title">Medical<br/>Passport</div>
    <svg class="passport__crest" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="1.4">
      <circle cx="50" cy="50" r="46"/><circle cx="50" cy="50" r="38" stroke-dasharray="1.5 3"/>
      <g stroke-width="1.6">
        <ellipse cx="50" cy="33" rx="10" ry="15"/><ellipse cx="50" cy="67" rx="10" ry="15"/>
        <ellipse cx="33" cy="50" rx="15" ry="10"/><ellipse cx="67" cy="50" rx="15" ry="10"/>
      </g>
      <circle cx="50" cy="50" r="5" fill="currentColor"/>
    </svg>
    <div>
      <div class="passport__name">${name}</div>
      <div class="passport__chip" style="margin:0.9rem auto 0"></div>
    </div>
    <span class="passport__shine"></span>
  </div>`;
}

/**
 * Deterministic QR-style matrix (illustrative, not scannable).
 * Three finder patterns + seeded noise so it looks right at every size.
 */
export function QR(seed = 7, { fg = '#000', bg = 'transparent', size = 25 } = {}) {
  let s = seed * 9301 + 49297;
  const rand = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const finder = (x, y) => `<rect x="${x}" y="${y}" width="7" height="7" fill="${fg}"/><rect x="${x + 1}" y="${y + 1}" width="5" height="5" fill="${bg === 'transparent' ? '#fff' : bg}"/><rect x="${x + 2}" y="${y + 2}" width="3" height="3" fill="${fg}"/>`;
  const inFinder = (x, y) => (x < 8 && y < 8) || (x > size - 9 && y < 8) || (x < 8 && y > size - 9);
  let cells = '';
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!inFinder(x, y) && rand() > 0.52) cells += `M${x} ${y}h1v1h-1z`;
    }
  }
  return `<svg class="qr" viewBox="-1 -1 ${size + 2} ${size + 2}" aria-hidden="true">
    <rect x="-1" y="-1" width="${size + 2}" height="${size + 2}" fill="${bg}"/>
    <path d="${cells}" fill="${fg}"/>${finder(0, 0)}${finder(size - 7, 0)}${finder(0, size - 7)}
  </svg>`;
}

/* ------------------------------------------------------------------ Header */
export function renderHeader(el) {
  el.className = 'site-header';
  el.innerHTML = `
    <div class="container site-header__inner">
      ${Brand()}
      <nav class="nav" aria-label="Primary">
        <ul class="nav__list">
          ${SECTIONS.map((s) => `<li><a class="nav__link" href="${ROUTES.home}" data-scroll="${s.id}">${s.label}</a></li>`).join('')}
        </ul>
      </nav>
      <div class="header-actions">
        ${Button({ label: 'Explore Demo', href: ROUTES.demo, variant: 'ghost', size: 'sm', iconName: false })}
        ${Button({ label: 'Get Started', href: ROUTES.start, size: 'sm', cls: 'btn--start' })}
        <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">
          <span class="menu-toggle__bars" aria-hidden="true"><span></span><span></span></span>
        </button>
      </div>
    </div>
    <div class="mobile-menu grain" id="mobile-menu" aria-hidden="true">
      <ul class="mobile-menu__list">
        ${SECTIONS.map((s, i) => `<li><a class="mobile-menu__link" href="${ROUTES.home}" data-scroll="${s.id}" tabindex="-1"><span>${s.label}</span><small>0${i + 1}</small></a></li>`).join('')}
      </ul>
      <div class="mobile-menu__ctas">
        ${Button({ label: 'Get Started', href: ROUTES.start, cls: 'btn--block', attrs: 'tabindex="-1"' })}
        ${Button({ label: 'Explore Demo', href: ROUTES.demo, variant: 'ghost', cls: 'btn--block', attrs: 'tabindex="-1"' })}
      </div>
    </div>`;

  const toggle = el.querySelector('.menu-toggle');
  const menu = el.querySelector('.mobile-menu');

  const setOpen = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.classList.toggle('is-open', open);
    menu.setAttribute('aria-hidden', String(!open));
    menu.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', open ? '0' : '-1'));
    document.body.classList.toggle('is-locked', open);
    el.classList.toggle('is-menu-open', open);
  };
  toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menu.classList.contains('is-open')) { setOpen(false); toggle.focus(); }
  });
  matchMedia('(min-width: 1080px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });

  // Glass once scrolled; tuck away when scrolling down, return when scrolling up.
  let lastY = window.scrollY;
  const onScroll = () => {
    const y = window.scrollY;
    el.classList.toggle('is-scrolled', y > 8);
    const hide = y > 400 && y > lastY + 4 && !menu.classList.contains('is-open');
    if (hide) el.classList.add('is-hidden');
    else if (y < lastY - 4 || y < 400) el.classList.remove('is-hidden');
    lastY = y;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

export function setActiveNav() {
  /* Section links are scroll targets, so there is no per-route active state yet. */
}

/* ------------------------------------------------------------------ Footer */
export function renderFooter(el) {
  el.className = 'site-footer grain';
  el.innerHTML = `
    <div class="container">
      <div class="site-footer__grid">
        <div>
          ${Brand()}
          <p class="site-footer__tag">A digital medical passport for international travelers, provided free through your travel insurer.</p>
        </div>
        <div class="site-footer__cols">
          <div>
            <h4>Product</h4>
            <ul>${SECTIONS.slice(0, 3).map((s) => `<li><a href="${ROUTES.home}" data-scroll="${s.id}">${s.label}</a></li>`).join('')}</ul>
          </div>
          <div>
            <h4>For insurers</h4>
            <ul>
              <li><a href="${ROUTES.home}" data-scroll="insurers">Insurance integration</a></li>
              <li><a href="${ROUTES.partners}">Partner with us</a></li>
            </ul>
          </div>
          <div>
            <h4>Start</h4>
            <ul>
              <li><a href="${ROUTES.start}">Get Started</a></li>
              <li><a href="${ROUTES.demo}">Explore Demo</a></li>
            </ul>
          </div>
        </div>
      </div>
      <div class="site-footer__word" aria-hidden="true">Medi<span class="serif">passport</span></div>
      <div class="site-footer__legal">
        <span>© ${new Date().getFullYear()} MediPassport</span>
        <span>Concept product · Not a medical device · Sample data shown</span>
      </div>
    </div>`;
}
