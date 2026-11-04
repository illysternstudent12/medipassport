// App · Profile: traveler identity, demo traveler switcher, details, settings.
import { icon } from '../icons.js';
import { observeReveals } from '../interactions.js';
import { currentTraveler, LANG_LABEL } from './data.js';
import { appShell, AppTop, Portrait, TravelerSwitch, toast, mountShell } from './shell.js';
import { langInfo } from '../translate/glossary.js';
import { patientLang, setPatientLang, doctorLang, setDoctorLang, destinationLang } from '../translate/state.js';
import { openLanguagePicker } from '../translate/picker.js';
import { recordsFor } from './documents.js';

const SETTINGS = [
  { key: 'autoTranslate', label: 'Auto-translate on arrival', hint: 'Switch your file to the local language when you land.', on: true },
  { key: 'doseReminders', label: 'Dose reminders in local time', hint: 'Adjusts your schedule to the time zone you’re in.', on: true },
  { key: 'insurerShare', label: 'Send records with claims', hint: 'Your insurer receives translated records when you file a claim.', on: false },
];
const prefKey = (t, k) => `mp.pref.${t.id}.${k}`;
const getPref = (t, s) => { try { const v = localStorage.getItem(prefKey(t, s.key)); return v === null ? s.on : v === '1'; } catch { return s.on; } };

export const appProfile = {
  title: 'Profile · MediPassport',
  html() {
    const t = currentTraveler();
    return appShell('profile', `
      ${AppTop(t, { title: 'Profile', desk: 'Profile' })}
      <section class="me p-me reveal">
        <span class="me__photo">${Portrait(t)}</span>
        <div class="me__txt">
          <h1 class="me__name">${t.first}<br/><span class="serif">${t.last}</span></h1>
          <p>${t.nationality} · ${t.age} · ${t.medicalId}</p>
        </div>
      </section>

      <section class="p-trav reveal" aria-label="Demo travelers">
        <div class="sec-head"><h2>Demo travelers</h2><span class="sec-head__hint">Switch profile</span></div>
        ${TravelerSwitch(t, 'list')}
      </section>

      <section class="p-details reveal" aria-label="Personal details">
        <div class="sec-head"><h2>Details</h2></div>
        <dl class="plist">
          <div><dt>Date of birth</dt><dd>${t.dob}</dd></div>
          <div><dt>Sex</dt><dd>${t.sex}</dd></div>
          <div><dt>Nationality</dt><dd>${t.nationality}</dd></div>
          <div><dt>Home language</dt><dd>${LANG_LABEL[t.homeLang]}</dd></div>
          <div><dt>Speaks</dt><dd>${t.speaks}</dd></div>
        </dl>
      </section>

      <section class="p-tiles reveal" aria-label="Trip and contact">
        <div class="ptiles">
          <div class="ptile ptile--mint">${icon('plane')}<span class="label">Current trip</span><b>${t.trip.city}</b><small>${t.trip.dates}</small></div>
          <div class="ptile ptile--peach">${icon('people')}<span class="label">Emergency contact</span><b>${t.contact.name}</b><small>${t.contact.relation}</small></div>
        </div>
      </section>

      <section class="p-langs reveal" aria-label="Languages">
        <div class="sec-head"><h2>Languages</h2><span class="sec-head__hint">Each one is independent</span></div>
        <ul class="langset">
          <li><div class="langset__row"><span class="langset__k">${icon('user')}<span><b>App interface</b><small>Menus and buttons</small></span></span><span class="langset__v langset__v--static">English<small>More languages later</small></span></div></li>
          <li><button type="button" class="langset__btn" data-setlang="patient"><span class="langset__k">${icon('eye')}<span><b>I read my records in</b><small>Your documents and summary</small></span></span><span class="langset__v" lang="${patientLang(t)}">${langInfo(patientLang(t)).native}${icon('chevron')}</span></button></li>
          <li><button type="button" class="langset__btn" data-setlang="doctor"><span class="langset__k">${icon('heart')}<span><b>Doctors read in</b><small>Default for Doctor view and shares</small></span></span><span class="langset__v" lang="${doctorLang(t)}">${langInfo(doctorLang(t)).native}${icon('chevron')}</span></button></li>
          <li><div class="langset__row"><span class="langset__k">${icon('plane')}<span><b>Destination</b><small>${t.trip.country} · for emergency responders</small></span></span><span class="langset__v langset__v--static" lang="${destinationLang(t)}">${langInfo(destinationLang(t)).native}<small>From your trip</small></span></div></li>
          <li><a class="langset__btn" href="#/app/documents"><span class="langset__k">${icon('file')}<span><b>Document originals</b><small>Detected per document · change on any document</small></span></span><span class="langset__v">${[...new Set(recordsFor(t).map((r) => r.origLang).filter(Boolean))].map((c) => langInfo(c).native).join(' · ')}${icon('chevron')}</span></a></li>
        </ul>
      </section>

      <section class="p-settings reveal" aria-label="Settings">
        <div class="sec-head"><h2>Settings</h2></div>
        <ul class="settings">
          ${SETTINGS.map((s) => `<li>
            <label class="toggle">
              <span class="toggle__txt"><b>${s.label}</b><small>${s.hint}</small></span>
              <input type="checkbox" role="switch" data-pref="${s.key}" ${getPref(t, s) ? 'checked' : ''}/>
              <span class="toggle__ui" aria-hidden="true"></span>
            </label>
          </li>`).join('')}
        </ul>
      </section>

      <section class="p-pro reveal" aria-label="Connected care">
        <div class="sec-head"><h2>Connected care</h2><span class="sec-head__hint">Demo</span></div>
        <div class="ptiles">
          <a class="ptile ptile--mint" href="#/app/share">${icon('qr')}<span class="label">Patients</span><b>Secure sharing</b><small>QR, links, access codes</small></a>
          <a class="ptile ptile--peach" href="#/insurer">${icon('umbrella')}<span class="label">Insurers</span><b>Insurer console</b><small>Simulated partner view</small></a>
        </div>
      </section>

      <a class="pexit p-exit" href="#/">${icon('logout')}<span>Back to website</span></a>
      <p class="app-note">Fictional traveler · sample data · not medical advice</p>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root), observeReveals(root)];
    root.querySelectorAll('[data-setlang]').forEach((b) => b.addEventListener('click', () => {
      const who = b.dataset.setlang;
      openLanguagePicker({
        current: who === 'patient' ? patientLang(t) : doctorLang(t),
        title: who === 'patient' ? 'Read my records in' : 'Doctors read in',
        suggested: [t.homeLang, 'en', t.trip.lang],
        onPick: (code) => {
          (who === 'patient' ? setPatientLang : setDoctorLang)(t, code);
          toast(`${who === 'patient' ? 'You read' : 'Doctors read'} in ${langInfo(code).name}.`);
          window.dispatchEvent(new HashChangeEvent('hashchange'));
        },
      });
    }));
    root.querySelectorAll('[data-pref]').forEach((inp) => inp.addEventListener('change', () => {
      try { localStorage.setItem(prefKey(t, inp.dataset.pref), inp.checked ? '1' : '0'); } catch { /* ignore */ }
      toast(`${inp.closest('label').querySelector('b').textContent}: ${inp.checked ? 'on' : 'off'}`);
    }));
    return () => off.forEach((f) => f?.());
  },
};
