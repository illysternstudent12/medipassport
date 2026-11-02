// App · Emergency hub — "I need medical help"
// Five large, high-contrast actions. Calm, no decorative motion.
import { icon } from '../icons.js';
import { currentTraveler, localTime } from '../app/data.js';
import { openSheet, toast } from '../app/ui.js';
import { criticalLines } from '../translate/records.js';
import { langInfo } from '../translate/glossary.js';
import { DEMO } from './facilities.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** The persistent entry point used across the app. */
export const HelpButton = (cls = '') => `<a class="helpbtn ${cls}" href="#/app/emergency">${icon('siren')}<span>I need medical help</span></a>`;

export function openCallSheet(t) {
  const n = t.trip.emergency;
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
      <button type="button" class="ebig ebig--cream" data-demo="Demo: your insurer would receive your location and translated passport.">${icon('share')}<span><b>Notify my insurer</b><small>Sends your location and translated records</small></span>${icon('chevron')}</button>
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
      { n: 3, href: '#/app/passport?share', ic: 'qr', title: 'Share medical QR', sub: 'Temporary access that expires', cls: 'eact--cream' },
      { n: 4, btn: 'insurance', ic: 'umbrella', title: 'Contact insurance', sub: `${t.insurance.provider} · 24/7 assistance`, cls: 'eact--peach' },
      { n: 5, btn: 'call', ic: 'phone', title: `Call emergency services · ${t.trip.emergency}`, sub: `${t.trip.country}: ambulance, police, fire`, cls: 'eact--alert' },
    ];
    return `<div class="em">
      <header class="em-bar">
        <a class="em-bar__x" href="#/app" aria-label="Close and go back">${icon('close')}</a>
        <span class="em-bar__where">${icon('pin')} ${esc(demo?.label || t.trip.city)} · ${localTime(t)}</span>
      </header>
      <main class="em-main">
        <h1 class="em-title">I need<br/>medical help</h1>
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
        </section>
        <p class="app-note">Fictional traveler · demo scenario · calls are disabled</p>
      </main>
    </div>`;
  },
  mount(root) {
    const t = currentTraveler();
    const onClick = (e) => {
      const b = e.target.closest('[data-eact]');
      if (b?.dataset.eact === 'call') openCallSheet(t);
      if (b?.dataset.eact === 'insurance') openInsuranceSheet(t);
      const d = e.target.closest('[data-demo]');
      if (d) toast(d.dataset.demo);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  },
};
