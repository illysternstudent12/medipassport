// App · Home: greeting, destination, passport card, insurance, medical
// summary widgets, quick access, and emergency help.
import { icon } from '../icons.js';
import { Tag, QR } from '../components.js';
import { observeReveals } from '../interactions.js';
import { currentTraveler, greeting, localTime, nextDose, fmtIn, LANG_NAMES, LANG_LABEL } from './data.js';
import { appShell, AppTop, Portrait, Scene, APP_ROUTES, openSheet, mountShell } from './shell.js';
import { recordsFor } from './documents.js';


export function PassportCard(t, { href = APP_ROUTES.passport, cls = '' } = {}) {
  return `<a class="pcard ${cls}" href="${href}" aria-label="Open medical passport for ${t.first} ${t.last}">
    <span class="pcard__sheen" aria-hidden="true"></span>
    <div class="pcard__top">
      <span class="pcard__brand"><svg viewBox="0 0 32 32" aria-hidden="true"><g fill="currentColor"><ellipse cx="16" cy="9.6" rx="3.7" ry="5.4"/><ellipse cx="16" cy="22.4" rx="3.7" ry="5.4"/><ellipse cx="9.6" cy="16" rx="5.4" ry="3.7"/><ellipse cx="22.4" cy="16" rx="5.4" ry="3.7"/></g></svg>Medical Passport</span>
      <span class="pcard__flag">${t.flag} → ${t.trip.code}</span>
    </div>
    <div class="pcard__mid">
      <span class="pcard__photo">${Portrait(t)}</span>
      <div>
        <div class="pcard__name">${t.first}<br/>${t.last}</div>
        <div class="pcard__id">${t.medicalId}</div>
      </div>
    </div>
    <div class="pcard__fields">
      <div><span>Blood</span><b>${t.blood}</b></div>
      <div><span>Allergies</span><b>${t.allergies.length}</b></div>
      <div><span>Meds</span><b>${t.medications.length}</b></div>
      <div class="pcard__open">${icon('arrow')}</div>
    </div>
  </a>`;
}

function widgetSheet(t, kind) {
  const sections = {
    allergies: {
      title: 'Allergies',
      html: (t.allergies.length ? '' : '<p class="detail">None recorded.</p>') + t.allergies.map((a) => `<div class="detail detail--alert"><div class="detail__head"><b>${a.name}</b>${Tag(a.severity, { variant: a.severity === 'Severe' ? 'alert' : 'peach' })}</div><p>${a.reaction}</p><small>${a.note}</small></div>`).join(''),
    },
    meds: {
      title: 'Medications',
      html: (t.medications.length ? '' : '<p class="detail">None recorded.</p>') + t.medications.map((m) => `<div class="detail"><div class="detail__head"><b>${m.name}</b><span class="detail__dose">${m.dose}</span></div><p>${m.schedule}</p>${m.times.length ? `<div class="detail__times">${m.times.map((x) => `<span>${x}</span>`).join('')}</div>` : ''}</div>`).join(''),
    },
    conditions: {
      title: 'Conditions',
      html: (t.conditions.length ? '' : '<p class="detail">None recorded.</p>') + t.conditions.map((c) => `<div class="detail"><div class="detail__head"><b>${c.name}</b><span class="detail__dose">Since ${c.since}</span></div><small>${c.note}</small></div>`).join(''),
    },
    blood: {
      title: 'Blood type',
      html: `<div class="detail detail--big"><b>${t.blood}</b><p>Verified from home records. Shown on your Medical ID and to responders.</p></div>`,
    },
  }[kind];
  openSheet({ ...sections, html: `<div class="details">${sections.html}</div>` });
}

export const appHome = {
  title: 'Home · MediPassport',
  html() {
    const t = currentTraveler();
    const nd = nextDose(t);
    return appShell('home', `
      ${AppTop(t)}
      <section class="hello h-hello">
        <p class="hello__kicker reveal">${greeting(t)},</p>
        <h1 class="hello__name reveal" style="--delay:60ms">${t.first}<span class="serif">.</span></h1>
        <p class="hello__sub reveal" style="--delay:120ms">It’s <b data-local-time>${localTime(t)}</b> in ${t.trip.city}. Your passport is ready in ${LANG_LABEL[t.trip.lang]}.</p>
      </section>

      <section class="dest h-dest reveal" style="--delay:160ms" aria-label="Current destination">
        ${Scene(t.trip.scene, 'dest__scene')}
        <div class="dest__shade" aria-hidden="true"></div>
        <div class="dest__top">${Tag(`${icon('plane')} ${t.trip.dates}`, { cls: 'tag--glass' })}${Tag(`<span class="dot-live"></span> Travel mode`, { cls: 'tag--glass' })}</div>
        <div class="dest__bottom">
          <div><span class="label">Now in</span><h2 class="dest__city">${t.trip.city}<span class="serif">, ${t.trip.country}</span></h2></div>
          <div class="dest__chips">
            <span><small>Local</small><b data-local-time>${localTime(t)}</b></span>
            <span><small>Emergency</small><b>${t.trip.emergency}</b></span>
            <span><small>Language</small><b>${LANG_NAMES[t.trip.lang]}</b></span>
          </div>
        </div>
      </section>

      <a class="sos h-sos reveal" href="#/app/emergency">
        <span class="sos__pulse" aria-hidden="true">${icon('siren')}</span>
        <span class="sos__txt"><b>I need medical help</b><small>Find care nearby · show your passport · call ${t.trip.emergency}</small></span>
        <span class="sos__go" aria-hidden="true">${icon('arrow')}</span>
      </a>

      <section class="h-pass reveal" aria-label="Medical passport">
        <div class="sec-head"><h2>Your passport</h2><a class="sec-head__link" href="${APP_ROUTES.passport}">Open ${icon('chevron')}</a></div>
        ${PassportCard(t)}
      </section>

      <section class="h-summary reveal" aria-label="Medical summary">
        <div class="sec-head"><h2>Medical summary</h2><span class="sec-head__hint">Tap a card</span></div>
        <div class="wrail" role="list">
          <button type="button" role="listitem" class="wtile wtile--alert" data-w="allergies">
            <span class="wtile__ic">${icon('alert')}</span><span class="label">Allergies</span>
            <b>${t.allergies[0]?.name ?? 'None recorded'}</b>
            <small>${t.allergies.length > 1 ? `+${t.allergies.length - 1} more · ` : ''}${t.allergies[0]?.severity ?? 'Add in Profile'}</small>
          </button>
          <button type="button" role="listitem" class="wtile wtile--peach" data-w="meds">
            <span class="wtile__ic">${icon('rx')}</span><span class="label">Next dose</span>
            ${nd ? `<b>${nd.med.name}</b><small>${nd.time} · <span data-next-in>${fmtIn(nd.diff)}</span></small>` : `<b>${t.medications[0]?.name ?? 'None recorded'}</b><small>${t.medications[0]?.schedule ?? ''}</small>`}
          </button>
          <button type="button" role="listitem" class="wtile wtile--mint" data-w="conditions">
            <span class="wtile__ic">${icon('heart')}</span><span class="label">Conditions</span>
            <b>${t.conditions[0]?.name ?? 'None recorded'}</b><small>${t.conditions.length > 1 ? `+${t.conditions.length - 1} more` : t.conditions[0]?.since ? `Since ${t.conditions[0].since}` : ''}</small>
          </button>
          <button type="button" role="listitem" class="wtile wtile--black" data-w="blood">
            <span class="wtile__ic">${icon('drop')}</span><span class="label">Blood type</span>
            <b class="wtile__huge">${t.blood}</b>
          </button>
        </div>
      </section>

      <section class="h-ins reveal" aria-label="Insurance">
        <div class="sec-head"><h2>Insurance</h2></div>
        <article class="ins">
          <div class="ins__top">
            <span class="ins__logo">${icon('umbrella')}</span>
            <div><b>${t.insurance.provider}</b><small>${t.insurance.plan}</small></div>
            <span class="ins__status"><span class="dot-live"></span>${t.insurance.status}</span>
          </div>
          <dl class="ins__grid">
            <div><dt>Policy</dt><dd>${t.insurance.policy}</dd></div>
            <div><dt>Valid until</dt><dd>${t.insurance.validUntil}</dd></div>
          </dl>
          <a class="ins__near" href="#/app/map">
            ${icon('pin')}<span><b>Find care nearby</b><small>Network status not verified for ${t.trip.city} · ask 24/7 assistance</small></span>${icon('chevron')}
          </a>
        </article>
      </section>

      <section class="h-quick reveal" aria-label="Quick access">
        <div class="sec-head"><h2>Quick access</h2></div>
        <div class="quick">
          <a class="quick__tile quick__tile--cream" href="${APP_ROUTES.documents}">
            ${icon('file')}<b>Documents</b><small>${recordsFor(t).length} records</small>
            <span class="quick__stack" aria-hidden="true"><i></i><i></i><i></i></span>
          </a>
          <a class="quick__tile quick__tile--mint" href="${APP_ROUTES.documents}?lang=${t.trip.lang}">
            ${icon('translate')}<b>Translations</b><small>Ready in ${LANG_NAMES[t.trip.lang]}</small>
            <span class="quick__lang" aria-hidden="true">${LANG_NAMES[t.homeLang]} → ${LANG_NAMES[t.trip.lang]}</span>
          </a>
          <a class="quick__tile quick__tile--black" href="${APP_ROUTES.passport}?share">
            <span class="quick__qr">${QR(t.id.length * 7, { fg: '#FBF3EB' })}</span><b>Share QR</b><small>Temporary doctor access</small>
          </a>
          <a class="quick__tile quick__tile--peach" href="${APP_ROUTES.documents}">
            ${icon('scan')}<b>Scan or upload</b><small>Add a paper record</small>
          </a>
        </div>
      </section>

      <p class="app-note h-note">Fictional traveler · sample data · not medical advice</p>

    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root), observeReveals(root)];
    root.querySelectorAll('[data-w]').forEach((b) => b.addEventListener('click', () => widgetSheet(t, b.dataset.w)));

    // Live local clock + next-dose countdown
    const tick = () => {
      root.querySelectorAll('[data-local-time]').forEach((el) => { if (!el.closest('.atop')) el.textContent = localTime(t); });
      const nd = nextDose(t);
      const el = root.querySelector('[data-next-in]');
      if (nd && el) el.textContent = fmtIn(nd.diff);
    };
    const timer = setInterval(tick, 15000);

    // Show floating SOS once the main SOS card scrolls away
    const card = root.querySelector('.sos');
    const fab = root.querySelector('.fab-sos');
    const io = new IntersectionObserver(([e]) => fab.classList.toggle('is-in', !e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(card);

    // Passport card tilt on pointer
    const pc = root.querySelector('.pcard');
    const tilt = (e) => {
      const r = pc.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      pc.style.setProperty('--rx', `${-y * 8}deg`); pc.style.setProperty('--ry', `${x * 10}deg`);
      pc.style.setProperty('--gx', `${(x + 0.5) * 100}%`); pc.style.setProperty('--gy', `${(y + 0.5) * 100}%`);
    };
    const untilt = () => { pc.style.setProperty('--rx', '0deg'); pc.style.setProperty('--ry', '0deg'); };
    if (matchMedia('(pointer: fine)').matches) { pc.addEventListener('pointermove', tilt); pc.addEventListener('pointerleave', untilt); }

    return () => { off.forEach((f) => f?.()); clearInterval(timer); io.disconnect(); };
  },
};
