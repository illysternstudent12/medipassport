// App · Medical Passport: Wallet-style stack of passes
// (Medical ID · Health · Insurance · Emergency contact · Share QR)
// plus a clearly labeled "Add to Apple Wallet" demo preview.
import { icon } from '../icons.js';
import { Tag, QR } from '../components.js';
import { currentTraveler, LANG_NAMES } from './data.js';
import { appShell, AppTop, Portrait, APP_ROUTES, openSheet, toast, mountShell } from './shell.js';
import { isDesktop } from './ui.js';

const DURATIONS = [
  { key: '1h', label: '1 hour', secs: 3600 },
  { key: '24h', label: '24 hours', secs: 86400 },
  { key: 'visit', label: 'This visit', secs: 4 * 3600 },
];

const fmt = (s) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, '0')).join(':');

function passes(t) {
  return [
    {
      key: 'id', cls: 'wpass--id', label: 'Medical ID', meta: t.medicalId,
      body: `
        <div class="wid">
          <span class="wid__photo">${Portrait(t)}</span>
          <div class="wid__who">
            <span class="label">Name</span><b class="wid__name">${t.first} ${t.last}</b>
            <div class="wid__row">
              <div><span class="label">Nationality</span><b>${t.nationality}</b></div>
              <div><span class="label">Born</span><b>${t.dob}</b></div>
            </div>
          </div>
        </div>
        <div class="wfields">
          <div><span class="label">Blood</span><b>${t.blood}</b></div>
          <div><span class="label">Sex</span><b>${t.sex}</b></div>
          <div><span class="label">Speaks</span><b>${t.speaks}</b></div>
        </div>
        <div class="wmrz" aria-hidden="true">MP&lt;${t.flag}&lt;${t.last.toUpperCase()}&lt;&lt;${t.first.toUpperCase()}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br/>${t.medicalId.replace(/-/g, '')}&lt;${t.blood.replace('+', 'P').replace('−', 'N')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>`,
    },
    {
      key: 'health', cls: 'wpass--health', label: 'Allergies · Meds · Conditions', meta: `${t.allergies.length + t.medications.length + t.conditions.length + (t.tests?.length || 0)} items`,
      body: `
        <div class="wlist">
          <span class="label">Allergies</span>
          ${t.allergies.map((a) => `<div class="wlist__item wlist__item--alert"><b>${a.name}</b><span>${a.reaction}</span></div>`).join('')}
        </div>
        <div class="wlist">
          <span class="label">Medications</span>
          ${t.medications.map((m) => `<div class="wlist__item"><b>${m.name}</b><span>${m.dose} · ${m.schedule}</span></div>`).join('')}
        </div>
        <div class="wlist">
          <span class="label">Conditions</span>
          ${t.conditions.map((c) => `<div class="wlist__item"><b>${c.name}</b><span>${c.since ? `Since ${c.since}` : ''}</span></div>`).join('')}
        </div>
        ${t.tests?.length ? `<div class="wlist">
          <span class="label">Recent results</span>
          ${t.tests.map((x) => `<div class="wlist__item"><b>${x.name}</b><span>${x.value}</span></div>`).join('')}
        </div>` : ''}`,
    },
    {
      key: 'ins', cls: 'wpass--ins', label: t.insurance.provider, meta: t.insurance.status,
      body: `
        <div class="wins">
          <span class="wins__logo">${icon('umbrella')}</span>
          <div><span class="label">Plan</span><b class="wins__plan">${t.insurance.plan}</b></div>
        </div>
        <div class="wfields">
          <div><span class="label">Policy</span><b>${t.insurance.policy}</b></div>
          <div><span class="label">Valid until</span><b>${t.insurance.validUntil}</b></div>
          <div><span class="label">Network</span><b>${t.insurance.network} nearby</b></div>
        </div>
        <button type="button" class="wbtn" data-demo="Demo: this would call ${t.insurance.provider} 24/7 assistance.">${icon('phone')} 24/7 assistance</button>`,
    },
    {
      key: 'contact', cls: 'wpass--contact', label: 'Emergency contact', meta: t.contact.relation,
      body: `
        <div class="wcontact">
          <span class="wcontact__av">${t.contact.name.split(' ').map((w) => w[0]).join('')}</span>
          <div><b class="wid__name">${t.contact.name}</b><span>${t.contact.relation} · ${t.contact.phone}</span></div>
        </div>
        <div class="wfields">
          <div><span class="label">Home language</span><b>${LANG_NAMES[t.homeLang]}</b></div>
          <div><span class="label">Notify on SOS</span><b>On</b></div>
        </div>
        <button type="button" class="wbtn" data-demo="Demo: calling is disabled in the preview.">${icon('phone')} Call ${t.contact.name.split(' ')[0]}</button>`,
    },
    {
      key: 'share', cls: 'wpass--share', label: 'Share with doctor', meta: 'Temporary',
      body: `
        <div class="wshare" data-share>
          <div class="wshare__qr-wrap">
            <div class="wshare__qr" data-qr>${QR(t.id.length * 13, { fg: '#000', bg: '#FFFFFF' })}</div>
            <svg class="wshare__ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="56" data-ring/></svg>
          </div>
          <div class="wshare__info">
            <span class="label">Access expires in</span>
            <b class="wshare__timer" data-timer>01:00:00</b>
            <span class="wshare__state" data-state><span class="dot-live"></span> Doctor can view · translated to ${LANG_NAMES[t.trip.lang]}</span>
          </div>
        </div>
        <div class="segmented wshare__dur" role="group" aria-label="Access duration" data-dur>
          <span class="segmented__thumb" aria-hidden="true"></span>
          ${DURATIONS.map((d, i) => `<button type="button" data-d="${d.key}" aria-pressed="${i === 0}">${d.label}</button>`).join('')}
        </div>
        <div class="wshare__actions">
          <button type="button" class="wbtn" data-new>${icon('refresh')} New code</button>
          <button type="button" class="wbtn wbtn--line" data-revoke>${icon('close')} Revoke</button>
        </div>`,
    },
  ];
}

function walletPreview(t) {
  openSheet({
    title: 'Add to Apple Wallet',
    html: `
      <div class="awallet">
        <p class="awallet__demo">${icon('sparkle')} Demo preview: no pass is created or added to your device.</p>
        <div class="apass">
          <div class="apass__head">
            <span class="apass__logo"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="16" fill="#C1DEBA"/><g fill="#000"><ellipse cx="16" cy="9.6" rx="3.7" ry="5.4"/><ellipse cx="16" cy="22.4" rx="3.7" ry="5.4"/><ellipse cx="9.6" cy="16" rx="5.4" ry="3.7"/><ellipse cx="22.4" cy="16" rx="5.4" ry="3.7"/></g></svg>MediPassport</span>
            <span class="apass__hf"><small>BLOOD</small><b>${t.blood}</b></span>
          </div>
          <div class="apass__primary"><div><small>PATIENT</small><b>${t.first} ${t.last}</b></div><span class="apass__ph">${Portrait(t)}</span></div>
          <div class="apass__sec">
            <div><small>ALLERGY</small><b>${t.allergies[0]?.name ?? 'None'}</b></div>
            <div><small>CONDITION</small><b>${t.conditions[0]?.name ?? 'None'}</b></div>
          </div>
          <div class="apass__sec">
            <div><small>MEDICAL ID</small><b>${t.medicalId}</b></div>
            <div><small>INSURER</small><b>${t.insurance.provider.split(' ')[0]}</b></div>
          </div>
          <div class="apass__code">${QR(t.id.length * 5, { fg: '#000', bg: '#FFFFFF' })}<small>Scan for temporary access</small></div>
        </div>
        <p class="awallet__note">In production this would download a signed Wallet pass that stays on the lock screen and updates when your record changes.</p>
        <button type="button" class="wallet-btn wallet-btn--block" data-wallet-confirm>${walletGlyph()}<span><small>Demo</small>Add to Apple Wallet</span></button>
      </div>`,
    mount(sheet) {
      sheet.querySelector('[data-wallet-confirm]').addEventListener('click', (e) => {
        const b = e.currentTarget;
        b.classList.add('is-done');
        b.querySelector('span').innerHTML = '<small>Demo</small>Preview complete';
        toast('Demo only: nothing was added to Wallet.');
      });
    },
  });
}

const walletGlyph = () => `<svg class="wallet-btn__ic" viewBox="0 0 28 22" aria-hidden="true">
  <rect x="1" y="1" width="26" height="20" rx="4" fill="#fff"/>
  <rect x="3" y="3" width="22" height="5" rx="1.5" fill="#C1DEBA"/><rect x="3" y="6" width="22" height="5" rx="1.5" fill="#E7C4B1"/><rect x="3" y="9" width="22" height="5" rx="1.5" fill="#D4CBC5"/>
  <path d="M1 13h7c1.5 0 2 3 6 3s4.5-3 6-3h7v4a4 4 0 01-4 4H5a4 4 0 01-4-4z" fill="#000" stroke="#fff" stroke-width=".8"/></svg>`;

export const appPassport = {
  title: 'Medical Passport · MediPassport',
  html() {
    const t = currentTraveler();
    const list = passes(t);
    return appShell('passport', `
      ${AppTop(t, { title: 'Passport', desk: 'Medical passport' })}
      <section class="ptitle">
        <h1 class="ptitle__h">Medical<br/><span class="serif">passport.</span></h1>
        <button type="button" class="wallet-btn" data-wallet>${walletGlyph()}<span><small>Demo preview</small>Add to Apple Wallet</span></button>
      </section>
      <p class="wallet-hint">${icon('card')} <span class="only-m">Tap a pass to open it. Tap again to put it back.</span><span class="only-d">All passes at a glance. Your share code is on the right.</span></p>
      <div class="wallet" data-wallet-stack style="--n:${list.length}">
        ${list.map((p, i) => `
          <article class="wpass ${p.cls}" data-pass="${p.key}" style="--i:${i}">
            <button type="button" class="wpass__head" aria-expanded="false" aria-controls="pass-${p.key}">
              <span class="wpass__label">${p.label}</span><span class="wpass__meta">${p.meta}</span>
            </button>
            <div class="wpass__body" id="pass-${p.key}">${p.body}</div>
          </article>`).join('')}
      </div>
      <div class="pfoot">
        ${Tag('Fictional traveler · sample data', { variant: 'outline' })}
        <a class="link" href="${APP_ROUTES.documents}">${icon('file')} Source documents</a>
      </div>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root)];
    const stack = root.querySelector('[data-wallet-stack]');
    const cards = [...stack.querySelectorAll('.wpass')];
    const PEEK = 64;

    const desktop = isDesktop();
    stack.classList.toggle('wallet--grid', desktop);
    const layout = (activeKey) => {
      if (desktop) {
        // Desktop: every pass is open in an editorial grid; no stacking.
        stack.style.height = '';
        cards.forEach((c) => { c.style.removeProperty('--y'); c.style.removeProperty('--s'); c.classList.remove('is-active', 'is-behind'); c.querySelector('.wpass__head').setAttribute('aria-expanded', 'true'); });
        return;
      }
      const active = cards.find((c) => c.dataset.pass === activeKey);
      stack.classList.toggle('has-active', !!active);
      let total = 0;
      if (!active) {
        cards.forEach((c, i) => {
          c.style.setProperty('--y', `${i * PEEK}px`);
          c.style.setProperty('--s', '1');
          c.classList.remove('is-active', 'is-behind');
          c.querySelector('.wpass__head').setAttribute('aria-expanded', 'false');
        });
        total = (cards.length - 1) * PEEK + cards[cards.length - 1].offsetHeight;
      } else {
        const h = active.scrollHeight;
        let j = 0;
        cards.forEach((c) => {
          const isA = c === active;
          c.classList.toggle('is-active', isA);
          c.classList.toggle('is-behind', !isA);
          c.querySelector('.wpass__head').setAttribute('aria-expanded', String(isA));
          if (isA) { c.style.setProperty('--y', '0px'); c.style.setProperty('--s', '1'); return; }
          c.style.setProperty('--y', `${h + 18 + j * 12}px`);
          c.style.setProperty('--s', `${1 - (cards.length - 2 - j) * 0.03}`);
          j++;
        });
        total = h + 18 + (cards.length - 2) * 12 + PEEK + 8;
      }
      stack.style.height = `${total}px`;
    };

    let activeKey = null;
    stack.addEventListener('click', (e) => {
      const card = e.target.closest('.wpass');
      if (!card || desktop) return;
      const isHead = e.target.closest('.wpass__head');
      if (card.classList.contains('is-active') && !isHead) return; // interacting inside an open pass
      activeKey = activeKey === card.dataset.pass ? null : card.dataset.pass;
      layout(activeKey);
      if (activeKey) stack.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    });

    root.querySelector('[data-wallet]').addEventListener('click', () => walletPreview(t));

    // Share pass: duration, countdown, regenerate, revoke
    const share = root.querySelector('[data-pass="share"]');
    const seg = share.querySelector('[data-dur]');
    const timerEl = share.querySelector('[data-timer]');
    const ring = share.querySelector('[data-ring]');
    const state = share.querySelector('[data-state]');
    const qr = share.querySelector('[data-qr]');
    const C = 2 * Math.PI * 56;
    ring.style.strokeDasharray = `${C}`;
    let total = 3600, left = 3600, revoked = false, seed = t.id.length * 13;

    const moveThumb = () => {
      const a = seg.querySelector('[aria-pressed="true"]');
      const th = seg.querySelector('.segmented__thumb');
      th.style.width = `${a.offsetWidth}px`;
      th.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const paint = () => {
      timerEl.textContent = revoked ? '00:00:00' : fmt(left);
      ring.style.strokeDashoffset = `${revoked ? C : C * (1 - left / total)}`;
      share.classList.toggle('is-revoked', revoked);
      state.innerHTML = revoked ? 'Access revoked · code no longer works' : `<span class="dot-live"></span> Doctor can view · translated to ${LANG_NAMES[t.trip.lang]}`;
    };
    const fresh = () => {
      seed += 17;
      qr.innerHTML = QR(seed, { fg: '#000', bg: '#FFFFFF' });
      qr.classList.remove('is-new'); void qr.offsetWidth; qr.classList.add('is-new');
      revoked = false; left = total; paint();
    };
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-d]');
      if (!b) return;
      seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      moveThumb();
      total = DURATIONS.find((d) => d.key === b.dataset.d).secs;
      fresh();
      layout(activeKey);
    });
    share.querySelector('[data-new]').addEventListener('click', () => { fresh(); toast('New code generated. The previous one stopped working.'); });
    share.querySelector('[data-revoke]').addEventListener('click', () => { revoked = true; paint(); toast('Access revoked.'); });
    const tick = setInterval(() => { if (!revoked && left > 0) { left--; paint(); } }, 1000);

    requestAnimationFrame(() => {
      layout(null);
      moveThumb();
      if (/[?&]share/.test(location.hash)) {
        if (desktop) { share.scrollIntoView({ block: 'center' }); share.classList.add('is-spot'); }
        else { activeKey = 'share'; layout('share'); }
      }
    });
    document.fonts?.ready.then(() => { layout(activeKey); moveThumb(); });
    const onResize = () => { layout(activeKey); moveThumb(); };
    window.addEventListener('resize', onResize);
    paint();

    return () => { off.forEach((f) => f?.()); clearInterval(tick); window.removeEventListener('resize', onResize); };
  },
};
