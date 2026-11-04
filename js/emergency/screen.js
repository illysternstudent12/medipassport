// App · Emergency hub — "I need medical help"
// Five large, high-contrast actions. Calm, no decorative motion.
import { icon } from '../icons.js';
import { backButton } from '../nav.js';
import { currentTraveler, localTime } from '../app/data.js';
import { openSheet, toast } from '../app/ui.js';
import { criticalLines } from '../translate/records.js';
import { langInfo } from '../translate/glossary.js';
import { DEMO } from './facilities.js';
import { addAssistRequest } from '../share/store.js';
import { haptic, moment, speak, stopSpeaking, handover } from '../fx.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The persistent entry point used across the app. */
export const HelpButton = (cls = '') => `<a class="helpbtn ${cls}" href="#/app/emergency">${icon('siren')}<span>I need medical help</span></a>`;

export function openCallSheet(t) {
  const n = t.trip.emergency;
  if (!n) {
    openSheet({ title: 'Call emergency services', tone: 'alert', html: `<div class="callsheet"><p class="callsheet__demo">${icon('alert')} <span><b>We don’t know the emergency number for ${esc(t.trip.country || 'this place')}.</b> Ask anyone nearby, or call your insurer’s 24/7 assistance line. 112 works in many countries from mobile phones.</span></p></div>` });
    return;
  }
  openSheet({
    title: 'Call emergency services',
    tone: 'alert',
    html: `<div class="callsheet">
      <div class="callsheet__num"><span>${esc(t.trip.country)} · ambulance, police, fire</span><b>${n}</b></div>
      <p class="callsheet__demo">${icon('alert')} <span><b>This is a demo. Calls are disabled.</b> In a real emergency, dial <b>${n}</b> on your phone’s keypad.${n === '112' ? ' 112 works across the EU, free from any phone.' : ''}</span></p>
      <ul class="callsheet__tips">
        <li><b>Say where you are.</b> ${DEMO[t.id]?.label ? `Demo location: ${esc(DEMO[t.id].label)}.` : ''}</li>
        <li><b>Say what happened</b> and that you have a medical passport.</li>
        <li><b>Show your passport</b> to responders when they arrive.</li>
      </ul>
      <a class="ebig ebig--black" href="#/app/doctor?lang=${t.trip.lang}">${icon('card')}<span><b>Show my medical passport</b><small>In ${esc(langInfo(t.trip.lang).name)}, for responders</small></span>${icon('chevron')}</a>
    </div>`,
  });
}

export function openInsuranceSheet(t) {
  const ins = t.insurance;
  openSheet({
    title: 'Contact insurance',
    html: `<div class="inssheet">
      <div class="inssheet__card">
        <span class="inssheet__logo">${icon('umbrella')}</span>
        <div><b>${esc(ins.provider)}</b><small>${esc(ins.plan)} · Policy ${esc(ins.policy)}</small></div>
        <span class="inssheet__ok">${esc(ins.status)}</span>
      </div>
      <button type="button" class="ebig ebig--peach" data-demo="Demo: this would call ${esc(ins.provider)} 24/7 medical assistance.">${icon('phone')}<span><b>Call 24/7 medical assistance</b><small>Before non-emergency treatment, if you can</small></span>${icon('chevron')}</button>
      <button type="button" class="ebig ebig--cream" data-notify-insurer>${icon('share')}<span><b>Notify my insurer</b><small>Sends your location and policy number. No medical records.</small></span>${icon('chevron')}</button>
      <a class="ebig ebig--cream" href="#/app/share">${icon('lock')}<span><b>Authorize documents for a claim</b><small>You choose which documents, for how long</small></span>${icon('chevron')}</a>
      <div class="inssheet__net">
        ${icon('eye')}
        <p><b>Network status not verified here.</b> ${esc(ins.provider)} hasn’t shared a verified list of partner facilities for ${esc(t.trip.city)}, so MediPassport doesn’t mark any facility as “in network”. In an emergency, go to the nearest emergency room; for anything else, ask the assistance line which facility to use.</p>
      </div>
    </div>`,
  });
}

export const emergencyScreen = {
  title: 'I need medical help · MediPassport',
  html() {
    const t = currentTraveler();
    const demo = DEMO[t.id];
    const crit = criticalLines(t, t.trip.lang);
    const lang = langInfo(t.trip.lang);
    const actions = [
      { n: 1, href: '#/app/map', ic: 'pin', title: 'Find medical help', sub: 'Emergency rooms, hospitals and clinics near you', cls: 'eact--mint' },
      { n: 2, href: `#/app/doctor?lang=${t.trip.lang}`, ic: 'card', title: 'Show medical passport', sub: `Full record in ${lang.name} for the doctor`, cls: 'eact--cream' },
      { n: 3, href: '#/app/share?quick', ic: 'qr', title: 'Share medical QR', sub: 'Creates 1-hour access for the doctor now', cls: 'eact--cream' },
      { n: 4, btn: 'insurance', ic: 'umbrella', title: 'Contact insurance', sub: `${t.insurance.provider} · 24/7 assistance`, cls: 'eact--peach' },
    ];
    return `<div class="em">
      <header class="em-bar">
        ${backButton('#/app')}
        <span class="em-bar__where">${icon('pin')} ${esc(demo?.label || t.trip.city)} · ${localTime(t)}</span>
        <a class="em-bar__exit" href="#/app" data-exit>${icon('home')}<span>Exit</span></a>
      </header>
      <main class="em-main">
        <h1 class="em-title">I need<br/>medical help</h1>
        <button type="button" class="em-call" data-eact="call" aria-label="Call emergency services, ${esc(t.trip.emergency)}, ${esc(t.trip.country)}">
          <span class="em-call__k">${icon('phone')} ${esc(t.trip.country)} · ambulance, police, fire</span>
          <b class="em-call__n">${esc(t.trip.emergency)}</b>
          <span class="em-call__s">Tap for what to say · calls are disabled in this demo</span>
        </button>
        ${demo?.scenario ? `<p class="em-scenario"><span>Demo scenario</span>${esc(demo.scenario)}</p>` : ''}
        <ol class="eacts">
          ${actions.map((a) => {
            const inner = `<span class="eact__n">${a.n}</span><span class="eact__ic">${icon(a.ic)}</span><span class="eact__txt"><b>${esc(a.title)}</b><small>${esc(a.sub)}</small></span><span class="eact__go">${icon('chevron')}</span>`;
            return `<li>${a.href ? `<a class="eact ${a.cls}" href="${a.href}">${inner}</a>` : `<button type="button" class="eact ${a.cls}" data-eact="${a.btn}">${inner}</button>`}</li>`;
          }).join('')}
        </ol>
        <section class="em-crit" lang="${t.trip.lang}" dir="${lang.rtl ? 'rtl' : 'ltr'}" aria-label="Critical information for responders">
          <h2>${icon('alert')} <span>For responders · ${esc(lang.native)}</span></h2>
          <dl>
            <div class="is-alert"><dt>${crit.labels.allergies}</dt><dd>${crit.allergies.join(' · ') || '—'}</dd></div>
            <div><dt>${crit.labels.diagnoses}</dt><dd>${crit.conditions.join(' · ') || '—'}</dd></div>
            <div><dt>${crit.labels.blood}</dt><dd><bdi>${esc(crit.blood)}</bdi></dd></div>
          </dl>
          <p class="em-crit__v">${crit.labels.verify}</p>
          <button type="button" class="em-say" data-say lang="en" dir="ltr">${icon('play')}<span>Play in ${esc(lang.name)}</span><small>Uses this phone’s own voice · works offline on most phones</small></button>
        </section>
        <p class="app-note">Fictional traveler · demo scenario · calls are disabled</p>
      </main>
    </div>`;
  },
  mount(root) {
    const t = currentTraveler();
    const onClick = (e) => {
      const b = e.target.closest('[data-eact]');
      if (b) haptic(b.dataset.eact === 'call' ? 'alert' : 'tap');
      if (b?.dataset.eact === 'call') openCallSheet(t);
      const say = e.target.closest('[data-say]');
      if (say) {
        const text = handover(criticalLines(t, t.trip.lang), t.trip.lang);
        say.classList.add('is-busy');
        speak(text, t.trip.lang).then((r) => {
          say.classList.remove('is-busy');
          if (r === 'no-voice') toast(`This device has no ${langInfo(t.trip.lang).name} voice. Show the card instead.`);
          if (r === 'unsupported') toast('Speech isn’t available in this browser. Show the card instead.');
        });
      }
      if (b?.dataset.eact === 'insurance') openInsuranceSheet(t);
      const d = e.target.closest('[data-demo]');
      if (d) toast(d.dataset.demo);
      if (e.target.closest('[data-exit]')) toast('Left emergency mode. Your shares and insurer notifications are kept.');
      const n = e.target.closest('[data-notify-insurer]');
      if (n && !n.disabled) {
        addAssistRequest({ provider: t.insurance.provider, name: `${t.first} ${t.last}`, where: DEMO[t.id]?.label || t.trip.city, policy: t.insurance.policy });
        n.disabled = true;
        n.querySelector('small').textContent = 'Sent. Your insurer can see your location and policy, not your records.';
        toast(`${t.insurance.provider} notified (demo). Visible in the insurer console.`);
        moment('share');
      }
    };
    document.addEventListener('click', onClick);
    return () => { stopSpeaking(); document.removeEventListener('click', onClick); };
  },
};
