// Doctor portal — opened from a share link or QR.
//   #/portal?t=<token>  server-verified share: the code is checked by the
//                       share-open Edge Function (expiry, revocation, lockout)
//   #/portal?s=<token>  demo share: scope and code travel in the link
// Access code (clinician identity isn't verified), then only what the patient shared:
// identification, allergies always, other sections and documents by choice,
// original + translation side by side, language switching, live expiry.
import { icon } from '../icons.js';
import { BrandMark } from '../components.js';
import { travelerById } from '../app/data.js';
import { Portrait } from '../app/shell.js';
import { langInfo, term } from '../translate/glossary.js';
import { buildRecords, summaryCard, currentFacts, criticalLines, fmtDate, sampleUploadsFromIds } from '../translate/records.js';
import { openLanguagePicker } from '../translate/picker.js';
import { layeredViewer, bindViewer } from '../app/documents.js';
import { decodeToken, getShare, statusOf, logEvent, SECTIONS } from '../share/store.js';
import { isConfigured, openRemoteShare } from '../backend/supabase.js';
import { aiOn, providerName, refreshServices } from '../translate/ai.js';
import { ensureTranslated } from '../translate/state.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const left = (ms) => {
  if (ms <= 0) return '00:00:00';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return d ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const SESSION = 'mp.portal.session';
const RSESSION = 'mp.portal.remote';

/** Merge the token with this browser's registry (which knows about revocation). */
function resolveShare(tok) {
  const fromTok = decodeToken(tok);
  if (!fromTok) return null;
  const local = getShare(fromTok.id);
  return { ...fromTok, revokedAt: local?.revokedAt || null, local: !!local };
}

const frame = (inner, bar = '') => `<div class="pt">
  <header class="pt-bar"><span class="pt-bar__brand">${BrandMark()}<span>MediPassport <em>for clinicians</em></span></span>${bar}</header>
  ${inner}
</div>`;

function blocked(kind, sh) {
  const copy = {
    invalid: ['This link isn’t valid', 'Ask the patient to share again from their MediPassport app.'],
    expired: ['Access has expired', `This share ended ${sh ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(sh.expiresAt) : ''}. Ask the patient for a new code.`],
    revoked: ['Access was revoked', 'The patient ended this share. Ask them for a new code if you still need it.'],
    locked: ['Too many wrong codes', 'This link is locked for 15 minutes. Ask the patient to read the code again, or to share again.'],
    nobackend: ['This link needs the MediPassport backend', 'It is a server-verified share, but this copy of the app has no backend configured. Open the link on the site the patient shared it from.'],
  }[kind];
  return frame(`<main class="pt-lock">${icon('lock')}<h1>${copy[0]}</h1><p>${esc(copy[1])}</p><a class="wbtn" href="#/">${icon('arrow', 'style="rotate:180deg"')} MediPassport home</a></main>`);
}

function gate(t, sh) {
  return frame(`<main class="pt-gate">
    <div class="pt-gate__card">
      ${t ? `<span class="pt-gate__ph">${Portrait(t)}</span>` : `<span class="pt-gate__ph pt-gate__ph--lock">${icon('lock')}</span>`}
      <p class="label">Shared medical record</p>
      <h1>${t ? `${esc(t.first)} ${esc(t.last.charAt(0))}.` : 'Protected record'}</h1>
      <p class="pt-gate__sub">Enter the 4-digit access code the patient gives you.</p>
      <form class="pt-code" data-gate autocomplete="off">
        <div class="pt-code__boxes">${[0, 1, 2, 3].map((i) => `<input inputmode="numeric" maxlength="1" pattern="[0-9]" aria-label="Digit ${i + 1}" data-digit="${i}"/>`).join('')}</div>
        <label class="pt-attest"><input type="checkbox" data-attest/> <span>I am a clinician treating this patient.</span></label>
        <p class="pt-code__err" data-err role="alert"></p>
        <button type="submit" class="btn btn--block"><span>Open record</span><span class="btn__dot">${icon('lock')}</span></button>
      </form>
      ${sh.remote ? `<p class="pt-sim pt-sim--live">${icon('shield')} The code is checked on the MediPassport server. Every attempt is shown to the patient. The clinician’s identity and licence are not verified.</p>`
    : `<p class="pt-sim">${icon('sparkle')} Demo link: the code is checked in this browser. A server-verified share checks it on the MediPassport backend. The clinician’s identity and licence are not verified.</p>`}
    </div>
  </main>`);
}

/** Records in the share: home records + uploaded samples (demo), + server documents (remote). */
function recsFor(t, sh) {
  const remoteUps = (sh.remoteDocs || []).map((d) => ({
    id: d.id, name: d.title, lang: d.orig_lang, langSource: 'detected', url: d.url,
    read: { title: d.title, items: Array.isArray(d.facts) ? d.facts : [], extraction: 'reviewed' },
  }));
  return buildRecords(t, [...sampleUploadsFromIds(sh.docs), ...remoteUps]).filter((r) => sh.docs.includes(r.id));
}

function portal(t, sh, lang) {
  const info = langInfo(lang);
  const f = currentFacts(t);
  const crit = criticalLines(t, lang);
  const recs = recsFor(t, sh);
  const shown = SECTIONS.filter((x) => sh.sections.includes(x.key));
  const hidden = SECTIONS.filter((x) => !sh.sections.includes(x.key));
  // Doctor's language first, then the patient's, then English and the destination's.
  const quick = [...new Set([sh.lang, sh.patientLang || t.homeLang, 'en', t.trip.lang])].slice(0, 4);
  return frame(`<main class="pt-main" lang="${lang}">
      <aside class="pt-side">
        <section class="pt-id">
          <span class="pt-id__ph">${Portrait(t)}</span>
          <div><h1 class="pt-id__name"><bdi>${esc(t.first)} ${esc(t.last)}</bdi></h1>
          <p>${esc(t.nationality)} · ${esc(t.sex)}</p></div>
          <dl class="pt-id__dl">
            <div><dt>${esc(term('dob', lang) || 'Date of birth')}</dt><dd><bdi>${fmtDate(f.dob, lang)}</bdi></dd></div>
            <div><dt>Medical ID</dt><dd><bdi>${esc(t.medicalId)}</bdi></dd></div>
            <div><dt>${esc(term('blood', lang) || 'Blood type')}</dt><dd class="pt-id__blood"><bdi>${esc(f.blood)}</bdi></dd></div>
            <div><dt>Speaks</dt><dd>${esc(t.speaks)}</dd></div>
          </dl>
        </section>
        <section class="pt-perm">
          <h2>${icon('lock')} Access</h2>
          <p class="pt-perm__left"><small>Expires in</small><b data-left="${sh.expiresAt}">${left(sh.expiresAt - Date.now())}</b></p>
          <ul>
            ${shown.map((x) => `<li class="is-on">${icon('check')} ${x.label}</li>`).join('')}
            ${hidden.map((x) => `<li class="is-off">${icon('close')} ${x.label} · not shared</li>`).join('')}
            <li class="is-on">${icon('file')} ${recs.length} source document${recs.length === 1 ? '' : 's'}</li>
          </ul>
          <p class="pt-perm__note">Shared by the patient for ${esc(sh.label || 'treatment')}. Access ends automatically, and the patient can revoke it at any time.${sh.remote ? ' Verified by the MediPassport server.' : ' Demo link.'}</p>
        </section>
      </aside>
      <div class="pt-content">
        <div class="pt-langbar">
          <span class="label">Reading in</span>
          <div class="pt-langbar__quick" role="group" aria-label="Language">${quick.map((c) => `<button type="button" data-pl="${c}" aria-pressed="${c === lang}" lang="${c}">${esc(langInfo(c).native)}</button>`).join('')}</div>
          <button type="button" class="pt-langbar__more" data-pmore>${icon('translate')} More languages</button>
        </div>
        <section class="dv-alert" dir="${info.rtl ? 'rtl' : 'ltr'}">
          <span class="dv-alert__ic">${icon('alert')}</span>
          <div><h2>${crit.labels.allergies}</h2><p>${crit.allergies.length ? crit.allergies.join(' · ') : esc(term('none_recorded', lang) || 'None recorded')}</p></div>
        </section>
        <p class="dv-verify" dir="${info.rtl ? 'rtl' : 'ltr'}">${icon('eye')}<span>${crit.labels.verify}${lang !== 'en' ? `<small lang="en" dir="ltr">Medical translations require professional verification. ${aiOn() ? `Glossary terms translated offline; other text machine-translated by ${esc(providerName())}.` : 'Translated from a reviewed medical glossary; no AI was used.'}</small>` : ''}</span></p>
        <div class="dv-sum">${summaryCard(t, lang, { sections: sh.sections })}</div>
        <section class="pt-recs">
          <h2 class="dv-h2">${esc(term('records', lang) || 'Source documents')}</h2>
          ${recs.length ? recs.map((r) => `<article class="pt-rec" data-prec="${r.id}">${layeredViewer(t, r, lang, 'compare')}${r.upload?.url ? `<a class="wbtn wbtn--line pt-orig" href="${esc(r.upload.url)}" target="_blank" rel="noopener">${icon('file')} Open the original file</a><small class="pt-orig__note">Private link, valid for 10 minutes.</small>` : ''}</article>`).join('') : '<p class="pt-none">No documents were shared. Ask the patient if you need records.</p>'}
        </section>
      </div>
    </main>`,
  `<span class="pt-bar__exp">${icon('clock')} <span data-left="${sh.expiresAt}">${left(sh.expiresAt - Date.now())}</span></span><button type="button" class="pt-bar__end" data-end>${icon('close')} End session</button>`);
}

export const doctorPortal = {
  title: 'Shared medical record · MediPassport for clinicians',
  html: () => '<div data-portal></div>',
  mount(root) {
    const host = root.querySelector('[data-portal]');
    const rtok = (location.hash.match(/[?&]t=([\w-]+)/) || [])[1];
    if (rtok) return mountRemote(host, rtok);
    const tok = (location.hash.match(/[?&]s=([\w-]+)/) || [])[1];
    const sh = tok ? resolveShare(tok) : null;
    let timer = 0;
    if (!sh) { host.innerHTML = blocked('invalid'); return null; }
    const t = travelerById(sh.traveler);
    const s = statusOf(sh);
    if (s !== 'active') { logEvent(sh.id, 'denied', s === 'revoked' ? 'Link used after revocation' : 'Link used after expiry'); host.innerHTML = blocked(s, sh); return null; }
    let lang = sh.lang || t.trip.lang;

    const openPortal = () => {
      host.innerHTML = portal(t, sh, lang);
      host.querySelectorAll('[data-lview]').forEach((lv) => bindViewer(lv.parentElement));
    };
    const authed = () => { try { return sessionStorage.getItem(SESSION) === sh.id; } catch { return false; } };

    if (authed()) openPortal(); else host.innerHTML = gate(t, sh);

    host.addEventListener('input', (e) => {
      const d = e.target.closest('[data-digit]');
      if (!d) return;
      d.value = d.value.replace(/\D/g, '').slice(-1);
      if (d.value) host.querySelector(`[data-digit="${+d.dataset.digit + 1}"]`)?.focus();
    });
    host.addEventListener('keydown', (e) => {
      const d = e.target.closest('[data-digit]');
      if (d && e.key === 'Backspace' && !d.value) host.querySelector(`[data-digit="${+d.dataset.digit - 1}"]`)?.focus();
    });
    host.addEventListener('paste', (e) => {
      if (!e.target.closest('[data-digit]')) return;
      const v = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
      if (v.length === 4) { e.preventDefault(); host.querySelectorAll('[data-digit]').forEach((i, n) => { i.value = v[n]; }); }
    });
    host.addEventListener('submit', (e) => {
      if (!e.target.matches('[data-gate]')) return;
      e.preventDefault();
      const code = [...host.querySelectorAll('[data-digit]')].map((i) => i.value).join('');
      const err = host.querySelector('[data-err]');
      if (!host.querySelector('[data-attest]').checked) { err.textContent = 'Confirm that you are treating this patient.'; return; }
      if (code !== sh.code) { err.textContent = 'That code doesn’t match. Ask the patient to read it again.'; logEvent(sh.id, 'denied', 'Wrong access code'); return; }
      try { sessionStorage.setItem(SESSION, sh.id); } catch { /* ignore */ }
      logEvent(sh.id, 'opened', `Clinician signed in · ${langInfo(lang).name}`);
      openPortal();
    });
    host.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pl]');
      if (b && b.dataset.pl !== lang) { lang = b.dataset.pl; logEvent(sh.id, 'language', langInfo(lang).name); openPortal(); return; }
      if (e.target.closest('[data-pmore]')) {
        openLanguagePicker({ current: lang, title: 'Read the record in', suggested: [sh.lang, 'en'], onPick: (c) => { lang = c; logEvent(sh.id, 'language', langInfo(c).name); openPortal(); } });
        return;
      }
      if (e.target.closest('[data-end]')) { try { sessionStorage.removeItem(SESSION); } catch { /* ignore */ } host.innerHTML = gate(t, sh); return; }
      const flip = e.target.closest('[data-flip], [data-m]');
      if (flip) { const rec = flip.closest('[data-prec]'); if (rec) logEvent(sh.id, 'viewed', term(buildRecords(t, sampleUploadsFromIds(sh.docs)).find((r) => r.id === rec.dataset.prec)?.title, 'en') || 'Document'); }
    });

    // Countdown; lock the record the moment access ends (expiry or revocation in this browser).
    timer = setInterval(() => {
      const cur = { ...sh, revokedAt: getShare(sh.id)?.revokedAt || null };
      const st = statusOf(cur);
      if (st !== 'active') { clearInterval(timer); host.innerHTML = blocked(st, cur); return; }
      host.querySelectorAll('[data-left]').forEach((el) => { el.textContent = left(+el.dataset.left - Date.now()); });
    }, 1000);
    return () => clearInterval(timer);
  },
};

/* ---------------------------------------------------------------- server-verified shares */
function mountRemote(host, token) {
  if (!isConfigured()) { host.innerHTML = blocked('nobackend'); return null; }
  let sh = null, t = null, lang = 'en', code = '', timer = 0, check = 0, alive = true;
  const fail = (e) => {
    const k = e.status === 404 ? 'invalid' : e.status === 410 ? (/revoked/.test(e.message) ? 'revoked' : 'expired') : e.status === 429 ? 'locked' : null;
    return k;
  };
  const paint = () => {
    host.innerHTML = portal(t, sh, lang);
    host.querySelectorAll('[data-lview]').forEach((lv) => bindViewer(lv.parentElement));
  };
  const fill = async () => {
    paint();
    if (!aiOn()) return;
    try { if ((await ensureTranslated(recsFor(t, sh), lang)) === 'translated' && alive) paint(); } catch { /* glossary only */ }
  };
  const open = async (c, quiet = false) => {
    const data = await openRemoteShare(token, c);
    code = c;
    try { sessionStorage.setItem(RSESSION, JSON.stringify({ token, code })); } catch { /* ignore */ }
    const sc = data.share.scope || {};
    t = travelerById(data.profile.traveler_key || sc.traveler);
    sh = { id: data.share.id, remote: true, traveler: t.id, docs: sc.docs || [], sections: sc.sections || ['allergies'], lang: sc.lang, patientLang: sc.patientLang,
      expiresAt: Date.parse(data.share.expires_at), label: data.share.label, recipient: sc.recipient || 'doctor', remoteDocs: data.documents || [] };
    lang = sh.lang || t.trip.lang;
    await refreshServices();
    if (!alive) return;
    fill();
    // Countdown, plus a server check so revocation locks the record within ~20 s.
    clearInterval(timer); clearInterval(check);
    timer = setInterval(() => {
      if (Date.now() >= sh.expiresAt) { stop(); host.innerHTML = blocked('expired', sh); return; }
      host.querySelectorAll('[data-left]').forEach((el) => { el.textContent = left(+el.dataset.left - Date.now()); });
    }, 1000);
    check = setInterval(() => {
      openRemoteShare(token, code, { check: true }).catch((e) => { const k = fail(e); if (k && alive) { stop(); host.innerHTML = blocked(k, sh); } });
    }, 20000);
    if (!quiet) { /* first open is logged by the server */ }
  };
  const stop = () => { clearInterval(timer); clearInterval(check); try { sessionStorage.removeItem(RSESSION); } catch { /* ignore */ } };

  let saved = null;
  try { saved = JSON.parse(sessionStorage.getItem(RSESSION)); } catch { /* ignore */ }
  host.innerHTML = gate(null, { remote: true });
  if (saved?.token === token && saved.code) {
    open(saved.code, true).catch((e) => { const k = fail(e); if (k) host.innerHTML = blocked(k); else host.innerHTML = gate(null, { remote: true }); });
  }

  host.addEventListener('input', (e) => {
    const d = e.target.closest('[data-digit]');
    if (!d) return;
    d.value = d.value.replace(/\D/g, '').slice(-1);
    if (d.value) host.querySelector(`[data-digit="${+d.dataset.digit + 1}"]`)?.focus();
  });
  host.addEventListener('keydown', (e) => {
    const d = e.target.closest('[data-digit]');
    if (d && e.key === 'Backspace' && !d.value) host.querySelector(`[data-digit="${+d.dataset.digit - 1}"]`)?.focus();
  });
  host.addEventListener('paste', (e) => {
    if (!e.target.closest('[data-digit]')) return;
    const v = (e.clipboardData?.getData('text') || '').replace(/\D/g, '').slice(0, 4);
    if (v.length === 4) { e.preventDefault(); host.querySelectorAll('[data-digit]').forEach((i, n) => { i.value = v[n]; }); }
  });
  host.addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-gate]')) return;
    e.preventDefault();
    const c = [...host.querySelectorAll('[data-digit]')].map((i) => i.value).join('');
    const err = host.querySelector('[data-err]');
    const btn = e.target.querySelector('[type="submit"]');
    if (!host.querySelector('[data-attest]').checked) { err.textContent = 'Confirm that you are treating this patient.'; return; }
    if (c.length !== 4) { err.textContent = 'Enter all 4 digits.'; return; }
    btn.disabled = true; err.textContent = 'Checking with the server…';
    try { await open(c); }
    catch (x) {
      const k = fail(x);
      if (k) { host.innerHTML = blocked(k); return; }
      err.textContent = x.status === 403 ? 'That code doesn’t match. Ask the patient to read it again.' : `Couldn’t reach the server: ${x.message}`;
      btn.disabled = false;
    }
  });
  host.addEventListener('click', (e) => {
    if (!sh) return;
    const b = e.target.closest('[data-pl]');
    if (b && b.dataset.pl !== lang) { lang = b.dataset.pl; fill(); return; }
    if (e.target.closest('[data-pmore]')) {
      openLanguagePicker({ current: lang, title: 'Read the record in', suggested: [sh.lang, 'en'], onPick: (c) => { lang = c; fill(); } });
      return;
    }
    if (e.target.closest('[data-end]')) { stop(); sh = null; host.innerHTML = gate(null, { remote: true }); }
  });
  return () => { alive = false; clearInterval(timer); clearInterval(check); };
}
