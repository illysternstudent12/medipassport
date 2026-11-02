// App · Doctor view
// A full-screen, hand-the-phone-over view. Everything renders in the doctor's
// language; one tap flips to the patient's language. Each source document can
// be flipped back to its original.
import { icon } from '../icons.js';
import { BrandMark } from '../components.js';
import { currentTraveler } from './data.js';
import { Portrait } from './shell.js';
import { toast } from './ui.js';
import { langInfo, term } from '../translate/glossary.js';
import { recordCard, summaryCard, currentFacts, criticalLines, fmtDate } from '../translate/records.js';
import { targetLang, setTargetLang, ensureTranslated, engineFor } from '../translate/state.js';
import { openLanguagePicker, openAiSettings } from '../translate/picker.js';
import { aiOn, summarize } from '../translate/ai.js';
import { recordsFor, factsForAi } from './documents.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function body(t, lang, patientLang, narrative) {
  const info = langInfo(lang);
  const f = currentFacts(t);
  const crit = criticalLines(t, lang);
  const recs = recordsFor(t).filter((r) => r.source !== 'stored');
  const eng = engineFor(lang);
  const showEn = lang !== 'en';
  return `
    <section class="dv-hero" lang="${lang}" dir="${info.rtl ? 'rtl' : 'ltr'}">
      <span class="dv-hero__ph">${Portrait(t)}</span>
      <div class="dv-hero__who">
        <h1 class="dv-hero__name"><bdi>${esc(t.first)} ${esc(t.last)}</bdi></h1>
        <p><span>${esc(term('dob', lang) || 'Date of birth')}</span> <bdi>${fmtDate(f.dob, lang)}</bdi> · <bdi>${esc(t.medicalId)}</bdi></p>
      </div>
      <div class="dv-hero__blood"><small>${crit.labels.blood}</small><b><bdi>${esc(f.blood)}</bdi></b></div>
    </section>

    <section class="dv-alert" lang="${lang}" dir="${info.rtl ? 'rtl' : 'ltr'}">
      <span class="dv-alert__ic">${icon('alert')}</span>
      <div><h2>${crit.labels.allergies}</h2><p>${crit.allergies.length ? crit.allergies.join(' · ') : esc(term('none_recorded', lang) || 'None recorded')}</p></div>
    </section>

    <p class="dv-verify" lang="${lang}" dir="${info.rtl ? 'rtl' : 'ltr'}">${icon('eye')}<span>${crit.labels.verify}${showEn ? `<small lang="en" dir="ltr">Medical translations require professional verification. ${eng === 'ai' ? 'Translated by live AI (Claude).' : 'Simulated translation from a reviewed glossary; no AI model was used.'}</small>` : ''}</span></p>

    <div class="dv-sum">${summaryCard(t, lang, { engine: aiOn() && narrative ? 'ai' : 'sim', narrative })}</div>

    <section class="dv-recs">
      <h2 class="dv-h2" lang="${lang}">${esc(term('records', lang) || 'Source documents')}</h2>
      <div class="dv-grid">
        ${recs.map((r) => `<div class="dv-rec" data-dvrec="${r.id}">
          <div class="dv-rec__card" data-face="tr">${recordCard(r, t, lang, { engine: r.source === 'ai' ? 'ai' : eng, variant: r.origLang === lang ? 'original' : 'translation' })}</div>
          ${r.origLang && r.origLang !== lang ? `<button type="button" class="dv-rec__flip" data-dvflip>${icon('swap')} <span lang="${lang}">${esc(term('show_original', lang) || 'Show original')} · ${esc(langInfo(r.origLang).native)}</span></button>` : ''}
        </div>`).join('')}
      </div>
    </section>

    <section class="dv-foot">
      <div><small>Insurance</small><b>${esc(t.insurance.provider)}</b><span>${esc(t.insurance.policy)}</span></div>
      <div><small>Emergency contact</small><b>${esc(t.contact.name)}</b><span>${esc(t.contact.relation)} · ${esc(t.contact.phone)}</span></div>
      <div><small>Patient language</small><b lang="${patientLang}">${esc(langInfo(patientLang).native)}</b><span>${esc(langInfo(patientLang).name)}</span></div>
    </section>
    <p class="app-note">Fictional traveler · sample data · not medical advice</p>`;
}

export const appDoctor = {
  title: 'Doctor view · MediPassport',
  html() {
    const t = currentTraveler();
    const q = (location.hash.match(/[?&]lang=([\w-]+)/) || [])[1];
    if (q) setTargetLang(t, q);
    return `<div class="dv" data-dv>
      <header class="dv-bar">
        <a class="dv-bar__back" href="#/app/documents" aria-label="Back to documents">${icon('arrow', 'style="rotate:180deg"')}</a>
        <span class="dv-bar__brand">${BrandMark()}<span>Doctor view</span></span>
        <div class="dv-bar__langs" data-dvlangs></div>
      </header>
      <p class="dv-status" data-dvstatus hidden></p>
      <main class="dv-main" data-dvbody></main>
    </div>`;
  },
  mount(root) {
    const t = currentTraveler();
    const patientLang = currentFacts(t).homeLang;
    let doctorLang = targetLang(t);
    let viewing = 'doctor';
    let narrative = null;
    let alive = true;
    const bodyEl = root.querySelector('[data-dvbody]');
    const langsEl = root.querySelector('[data-dvlangs]');
    const status = root.querySelector('[data-dvstatus]');
    const cur = () => (viewing === 'doctor' ? doctorLang : patientLang);

    const paintBar = () => {
      const d = langInfo(doctorLang), p = langInfo(patientLang);
      langsEl.innerHTML = `
        <div class="dv-switch" role="group" aria-label="Reading language">
          <button type="button" data-view="doctor" aria-pressed="${viewing === 'doctor'}"><small>Doctor</small><span lang="${doctorLang}">${esc(d.native)}</span></button>
          <button type="button" data-view="patient" aria-pressed="${viewing === 'patient'}"><small>Patient</small><span lang="${patientLang}">${esc(p.native)}</span></button>
        </div>
        <button type="button" class="dv-bar__pick" data-dvpick>${icon('translate')}<span>Change</span></button>
        <button type="button" class="dv-bar__engine ${aiOn() ? 'is-ai' : ''}" data-ai-settings>${icon('sparkle')}<span>${aiOn() ? 'Live AI' : 'Simulated'}</span></button>`;
    };
    const paint = () => {
      paintBar();
      bodyEl.innerHTML = body(t, cur(), patientLang, aiOn() ? narrative : null);
      bodyEl.classList.remove('is-swap'); void bodyEl.offsetWidth; bodyEl.classList.add('is-swap');
    };
    const setStatus = (html, cls = '') => { status.hidden = !html; status.className = `dv-status ${cls}`; status.innerHTML = html || ''; };

    const fill = async () => {
      const lang = cur();
      narrative = null;
      paint();
      if (!aiOn()) return;
      try {
        setStatus(`${icon('sparkle')} ${engineFor(lang) === 'ai' ? 'Translating with Claude…' : 'Preparing AI summary…'}`, 'is-busy');
        const res = await ensureTranslated(recordsFor(t), lang);
        if (!alive || cur() !== lang) return;
        narrative = await summarize(lang, langInfo(lang).name, factsForAi(t));
        if (!alive || cur() !== lang) return;
        if (res === 'translated' || narrative) paint();
        setStatus('');
      } catch (err) {
        setStatus(`${icon('alert')} ${esc(err.message || 'Live AI failed.')}`, 'is-error');
      }
    };

    root.addEventListener('click', (e) => {
      const v = e.target.closest('[data-view]');
      if (v && v.dataset.view !== viewing) { viewing = v.dataset.view; fill(); return; }
      if (e.target.closest('[data-dvpick]')) {
        openLanguagePicker({
          current: doctorLang, title: 'Doctor’s language', suggested: [t.trip.lang, 'en', patientLang],
          onPick: (code) => { doctorLang = code; setTargetLang(t, code); viewing = 'doctor'; fill(); toast(`Doctor view in ${langInfo(code).name}.`); },
        });
        return;
      }
      if (e.target.closest('[data-ai-settings]')) { openAiSettings(); return; }
      const flip = e.target.closest('[data-dvflip]');
      if (flip) {
        const box = flip.closest('[data-dvrec]');
        const r = recordsFor(t).find((x) => String(x.id) === box.dataset.dvrec);
        const card = box.querySelector('[data-face]');
        const toOrig = card.dataset.face === 'tr';
        card.dataset.face = toOrig ? 'orig' : 'tr';
        card.classList.remove('is-flipping'); void card.offsetWidth; card.classList.add('is-flipping');
        card.innerHTML = toOrig ? recordCard(r, t, r.origLang, { variant: 'original' }) : recordCard(r, t, cur(), { engine: engineFor(cur()) });
        flip.querySelector('span').textContent = toOrig ? `← ${langInfo(cur()).native}` : `${term('show_original', cur()) || 'Show original'} · ${langInfo(r.origLang).native}`;
      }
    });
    const onKey = (e) => {
      if (e.key.toLowerCase() === 'f' && !e.target.closest('input, textarea')) { viewing = viewing === 'doctor' ? 'patient' : 'doctor'; fill(); }
    };
    document.addEventListener('keydown', onKey);

    fill();
    return () => { alive = false; document.removeEventListener('keydown', onKey); };
  },
};
