// App · Secure sharing
// Build a share (recipient, documents, sections, language, duration), then show
// a real QR code + link + access code. Lists every share with its status and
// activity history, and lets the patient revoke access.
import { icon } from '../icons.js';
import { currentTraveler } from './data.js';
import { appShell, AppTop, toast, mountShell } from './shell.js';
import { buildRecords, fmtDate, KIND_ICON } from '../translate/records.js';
import { getUploads } from './documents.js';
import { langInfo, term } from '../translate/glossary.js';
import { doctorLang, patientLang } from '../translate/state.js';
import { openLanguagePicker } from '../translate/picker.js';
import {
  DURATIONS, SECTIONS, createShare, revokeShare, sharesFor, getShare, statusOf, shareUrl, eventsFor,
} from '../share/store.js';
import { qrSvg } from '../share/qr.js';
import { remember, recall } from '../nav.js';
import { isConfigured, currentUser, saveProfile, createRemoteShare, revokeRemoteShare, remoteShareEvents } from '../backend/supabase.js';
import { refreshServices, shareOn } from '../translate/ai.js';
import { moment, illus } from '../fx.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const left = (ms) => {
  if (ms <= 0) return 'Expired';
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return d ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
};
const when = (ts) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts);
const EV = {
  created: ['plus', 'Share created'], opened: ['eye', 'Opened by recipient'], viewed: ['file', 'Viewed a document'],
  language: ['translate', 'Switched language'], denied: ['lock', 'Access attempt refused'], revoked: ['close', 'Access revoked'],
};

function builder(t, recs, st) {
  const isDoc = st.recipient === 'doctor';
  return `<section class="sbuild" data-builder>
    <div class="sbuild__step">
      <span class="sbuild__n">1</span><h2>Who is it for?</h2>
      <div class="sbuild__who" role="radiogroup" aria-label="Recipient">
        <button type="button" role="radio" aria-checked="${isDoc}" data-recipient="doctor">${icon('heart')}<b>A doctor</b><small>Treatment abroad</small></button>
        <button type="button" role="radio" aria-checked="${!isDoc}" data-recipient="insurer">${icon('umbrella')}<b>My insurer</b><small>Claim review only</small></button>
      </div>
    </div>
    <div class="sbuild__step">
      <span class="sbuild__n">2</span><h2>Which documents?</h2>
      <div class="sbuild__docs">
        ${recs.map((r) => `<label class="sdoc ${st.docs.includes(r.id) ? 'is-on' : ''}">
          <input type="checkbox" data-doc="${r.id}" ${st.docs.includes(r.id) ? 'checked' : ''}/>
          <span class="sdoc__ic">${icon(KIND_ICON[r.kind])}</span>
          <span class="sdoc__txt"><b>${esc(term(r.title, 'en'))}</b><small>${esc(r.issuer)} · ${fmtDate(r.date, 'en')} · ${esc(langInfo(r.origLang).name)} original</small></span>
          <span class="sdoc__tick">${icon('check')}</span>
        </label>`).join('')}
      </div>
    </div>
    ${isDoc ? `<div class="sbuild__step">
      <span class="sbuild__n">3</span><h2>What else can they see?</h2>
      <div class="sbuild__secs">
        ${SECTIONS.map((x) => `<label class="ssec-t ${x.always ? 'is-locked' : ''}"><input type="checkbox" data-sec="${x.key}" ${x.always || st.sections.includes(x.key) ? 'checked' : ''} ${x.always ? 'disabled' : ''}/><span>${x.label}${x.always ? ' <em>always shared</em>' : ''}</span></label>`).join('')}
      </div>
      <button type="button" class="slang" data-lang>${icon('translate')}<span>Doctor reads in <b lang="${st.lang}">${esc(langInfo(st.lang).native)}</b></span>${icon('chevron')}</button>
    </div>` : `<div class="sbuild__step">
      <span class="sbuild__n">3</span><h2>Claim details</h2>
      <p class="sbuild__note">${icon('lock')} ${esc(t.insurance.provider)} sees only the documents you tick, for this claim. Not your full history, summary or other records.</p>
      <label class="sfield"><span>Claim reference</span><input type="text" value="${esc(st.claimRef)}" data-claim autocomplete="off"/></label>
    </div>`}
    <div class="sbuild__step">
      <span class="sbuild__n">4</span><h2>For how long?</h2>
      <div class="segmented sbuild__dur" role="group" aria-label="Duration" data-dur>
        <span class="segmented__thumb" aria-hidden="true"></span>
        ${DURATIONS.map((d) => `<button type="button" data-d="${d.key}" aria-pressed="${st.duration === d.key}">${d.label}</button>`).join('')}
      </div>
    </div>
    <button type="button" class="btn btn--block sbuild__go" data-create ${st.docs.length ? '' : 'disabled'}><span>${isDoc ? 'Create secure access' : 'Authorize for claim review'}</span><span class="btn__dot">${icon('lock')}</span></button>
  </section>`;
}

const remoteEv = new Map(); // share id → events from the server (doctor opens, wrong codes…)
function shareRow(sh) {
  const s = statusOf(sh);
  const ev = [...(remoteEv.get(sh.id) || []), ...eventsFor(sh.id)].sort((a, b) => b.at - a.at);
  return `<li class="srow srow--${s}" data-share="${sh.id}">
    <button type="button" class="srow__main" data-open-share="${sh.id}">
      <span class="srow__ic">${icon(sh.recipient === 'insurer' ? 'umbrella' : 'heart')}</span>
      <span class="srow__txt"><b>${esc(sh.label)}${sh.claimRef ? ` · ${esc(sh.claimRef)}` : ''}</b><small>${sh.docs.length} document${sh.docs.length === 1 ? '' : 's'} · created ${when(sh.createdAt)} · ${sh.remote ? 'server-verified' : 'demo link'}</small></span>
      <span class="sstat sstat--${s}">${s === 'active' ? `<span data-left="${sh.expiresAt}">${left(sh.expiresAt - Date.now())}</span>` : s === 'revoked' ? 'Revoked' : 'Expired'}</span>
    </button>
    <details class="srow__log"><summary>Activity · ${ev.length}</summary>
      <ol>${ev.map((e) => `<li>${icon((EV[e.type] || EV.created)[0])}<span><b>${(EV[e.type] || [0, e.type])[1]}</b>${e.detail ? ` · ${esc(e.detail)}` : ''}</span><time>${when(e.at)}</time></li>`).join('')}</ol>
    </details>
  </li>`;
}

function resultCard(sh) {
  const s = statusOf(sh);
  const url = shareUrl(sh);
  return `<section class="sres sres--${s}" data-result="${sh.id}">
    <header class="sres__head"><span class="label">${sh.recipient === 'insurer' ? 'Claim authorization' : 'Doctor access'}</span><span class="sstat sstat--${s}">${s === 'active' ? 'Active' : s === 'revoked' ? 'Revoked' : 'Expired'}</span></header>
    <div class="sres__body">
      <div class="sres__qr" data-qr aria-live="polite"><span class="sres__qrload">Generating QR…</span></div>
      <div class="sres__info">
        <div><span class="label">Access code</span><b class="sres__code">${sh.code.split('').join(' ')}</b><small>Say it to the ${sh.recipient === 'insurer' ? 'claims handler' : 'doctor'}. They enter it to open the record.</small></div>
        <div><span class="label">Expires in</span><b class="sres__left" data-left="${sh.expiresAt}">${left(sh.expiresAt - Date.now())}</b></div>
      </div>
    </div>
    <div class="sres__link"><input type="text" readonly value="${esc(url)}" aria-label="Access link" data-url/><button type="button" class="wbtn" data-copy>${icon('file')} Copy link</button></div>
    <div class="sres__actions">
      ${sh.recipient === 'insurer'
        ? '<a class="wbtn wbtn--line" href="#/insurer" target="_blank" rel="noopener">' + icon('umbrella') + ' Open insurer console (demo)</a>'
        : `<a class="wbtn wbtn--line" href="${esc(url)}" target="_blank" rel="noopener">${icon('eye')} Preview doctor portal</a>`}
      ${s === 'active' ? `<button type="button" class="wbtn sres__revoke" data-revoke="${sh.id}">${icon('close')} Revoke now</button>` : ''}
    </div>
    ${sh.remote
    ? `<p class="sres__demo sres__demo--live">${icon('shield')} <span>Server-verified: the link holds only a random token. The code is checked by the MediPassport backend, which enforces expiry and revocation on every device and logs every attempt. Five wrong codes lock the link for 15 minutes. Clinician identity is not verified (no licence registry is connected).</span></p>`
    : `<p class="sres__demo">${icon('sparkle')} <span>Demo link: the access code and the share’s scope travel inside the link. Expiry is enforced anywhere; revocation and activity are tracked in this browser only.<span class="dev-only"> Sign in under <a href="#/app/setup">Connected services</a> for server-verified, revocable shares.</span></span></p>`}
  </section>`;
}

export const appShare = {
  title: 'Secure sharing · MediPassport',
  html() {
    const t = currentTraveler();
    return appShell('passport', `
      ${AppTop(t, { title: 'Sharing', desk: 'Secure sharing', back: '#/app/passport' })}
      <section class="shero">
        <h1 class="shero__h">Share on<br/><span class="serif">your terms.</span></h1>
        <p class="shero__sub">Choose who, what and for how long. Every share expires, and you can end it any time.</p>
        <p class="smode" data-mode aria-live="polite">${icon('clock')} <span>Checking sharing mode…</span></p>
      </section>
      <div class="slayout">
        <div data-build-slot></div>
        <div class="sside">
          <div data-result-slot></div>
          <section class="slist-wrap">
            <div class="sec-head"><h2>Your shares</h2><span class="sec-head__hint" data-count></span></div>
            <ul class="slist" data-list></ul>
          </section>
        </div>
      </div>
      <p class="app-note">Fictional traveler · clinician identity not verified · not medical advice</p>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root)];
    // Home records + uploaded sample documents (they can be rebuilt on any device). Live-AI uploads stay on this device.
    const ups = getUploads(t);
    let remote = false; // signed in + share-open deployed → server-verified shares
    const shareable = () => buildRecords(t, ups).filter((r) => r.source === 'home' || r.source === 'upload' || (remote && r.upload?.remote));
    let recs = shareable();
    const quick = /[?&]quick/.test(location.hash);
    const st = {
      recipient: 'doctor', docs: recs.map((r) => r.id), sections: ['medications', 'conditions', 'tests'],
      lang: doctorLang(t), duration: '1h', claimRef: `CLM-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9e4) + 1e4)}`, shown: null,
    };
    const buildSlot = root.querySelector('[data-build-slot]');
    const resSlot = root.querySelector('[data-result-slot]');
    const list = root.querySelector('[data-list]');

    const thumb = () => {
      const seg = root.querySelector('[data-dur]');
      const a = seg?.querySelector('[aria-pressed="true"]');
      const th = seg?.querySelector('.segmented__thumb');
      if (a && th) { th.style.width = `${a.offsetWidth}px`; th.style.transform = `translateX(${a.offsetLeft}px)`; }
    };
    // Keep the half-built share if the patient leaves and comes back.
    const saveDraft = () => remember(`share.${t.id}`, { recipient: st.recipient, docs: st.docs, sections: st.sections, lang: st.lang, duration: st.duration, claimRef: st.claimRef });
    const draft = !quick && recall(`share.${t.id}`);
    if (draft) Object.assign(st, draft, { docs: (draft.docs || []).filter((id) => recs.some((r) => r.id === id)) });
    const renderBuilder = () => { buildSlot.innerHTML = builder(t, recs, st); requestAnimationFrame(thumb); saveDraft(); };
    const renderList = () => {
      const shares = sharesFor(t.id);
      list.innerHTML = shares.length ? shares.map(shareRow).join('') : `<li class="slist__empty">${illus('share')}<b>No shares yet</b><span>Create one to give a doctor or your insurer temporary access.</span></li>`;
      root.querySelector('[data-count]').textContent = `${shares.filter((s) => statusOf(s) === 'active').length} active`;
    };
    const renderResult = async () => {
      const sh = st.shown && getShare(st.shown);
      if (!sh) { resSlot.innerHTML = ''; return; }
      resSlot.innerHTML = resultCard(sh);
      const box = resSlot.querySelector('[data-qr]');
      if (statusOf(sh) !== 'active') { box.innerHTML = `<span class="sres__qrload">${icon('lock')} No longer valid</span>`; return; }
      try {
        box.innerHTML = await qrSvg(shareUrl(sh), { label: `QR code for ${sh.label}` });
      } catch {
        box.innerHTML = `<span class="sres__qrload">QR unavailable offline. Use the link or code.</span>`;
      }
    };

    root.addEventListener('click', (e) => {
      const r = e.target.closest('[data-recipient]');
      if (r) { st.recipient = r.dataset.recipient; if (st.recipient === 'insurer') st.docs = []; else st.docs = recs.map((x) => x.id); renderBuilder(); return; }
      const d = e.target.closest('[data-d]');
      if (d) { st.duration = d.dataset.d; root.querySelectorAll('[data-d]').forEach((b) => b.setAttribute('aria-pressed', String(b === d))); thumb(); saveDraft(); return; }
      if (e.target.closest('[data-lang]')) {
        openLanguagePicker({ current: st.lang, title: 'Doctor’s language', suggested: [t.trip.lang, 'en'], onPick: (c) => { st.lang = c; renderBuilder(); } });
        return;
      }
      const cb = e.target.closest('[data-create]');
      if (cb) {
        cb.disabled = true;
        make({ recipient: st.recipient, docs: st.docs, sections: st.sections, lang: st.recipient === 'doctor' ? st.lang : 'en', duration: st.duration, claimRef: st.recipient === 'insurer' ? st.claimRef : '' })
          .then((sh) => {
            st.shown = sh.id;
            renderResult(); renderList();
            moment('share');
            toast(st.recipient === 'insurer' ? 'Documents authorized for this claim only.' : sh.remote ? 'Server-verified access created.' : 'Demo access created.');
            resSlot.scrollIntoView({ behavior: 'smooth', block: 'start' });
          })
          .catch((err) => toast(`Couldn’t create the share: ${err.message}`))
          .finally(() => { cb.disabled = false; });
        return;
      }
      const o = e.target.closest('[data-open-share]');
      if (o) { st.shown = o.dataset.openShare; renderResult(); resSlot.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const rv = e.target.closest('[data-revoke]');
      if (rv) {
        const sh = getShare(rv.dataset.revoke);
        rv.disabled = true;
        (sh?.remote ? revokeRemoteShare(sh.remote.id) : Promise.resolve())
          .then(() => { revokeShare(rv.dataset.revoke); renderResult(); renderList(); moment('revoke'); toast(sh?.remote ? 'Access revoked on the server. The link stops working everywhere.' : 'Access revoked.'); })
          .catch((err) => { rv.disabled = false; toast(`Couldn’t revoke on the server: ${err.message}. Try again.`); });
        return;
      }
      if (e.target.closest('[data-copy]')) {
        const inp = resSlot.querySelector('[data-url]');
        (navigator.clipboard?.writeText(inp.value) || Promise.reject()).then(() => toast('Link copied.')).catch(() => { inp.select(); toast('Select and copy the link.'); });
      }
    });
    root.addEventListener('change', (e) => {
      const doc = e.target.closest('[data-doc]');
      if (doc) {
        st.docs = doc.checked ? [...new Set([...st.docs, doc.dataset.doc])] : st.docs.filter((x) => x !== doc.dataset.doc);
        doc.closest('.sdoc').classList.toggle('is-on', doc.checked);
        root.querySelector('[data-create]').disabled = !st.docs.length;
        saveDraft();
      }
      const sec = e.target.closest('[data-sec]');
      if (sec) { st.sections = sec.checked ? [...new Set([...st.sections, sec.dataset.sec])] : st.sections.filter((x) => x !== sec.dataset.sec); saveDraft(); }
    });
    root.addEventListener('input', (e) => { if (e.target.matches('[data-claim]')) { st.claimRef = e.target.value.trim(); saveDraft(); } });

    // Live countdowns + refresh when another tab (the portal) logs activity
    const tick = setInterval(() => {
      root.querySelectorAll('[data-left]').forEach((el) => { el.textContent = left(+el.dataset.left - Date.now()); });
    }, 1000);
    const onStorage = (e) => { if (!e.key || e.key.startsWith('mp.share')) { renderList(); if (st.shown) renderResult(); } };
    window.addEventListener('storage', onStorage);

    /** Create a share: server-verified when signed in, otherwise a demo link. */
    async function make(o) {
      const base = { traveler: t.id, patientLang: patientLang(t), ...o };
      if (!remote) return createShare(base);
      await saveProfile(t); // the server serves the profile the patient keeps in their account
      const d = DURATIONS.find((x) => x.key === o.duration) || DURATIONS[0];
      const expiresAt = Date.now() + d.ms;
      const docs = o.docs.map((id) => ups.find((u) => u.id === id)?.remote?.id || id);
      const sections = o.recipient === 'doctor' ? [...new Set(['allergies', ...o.sections])] : [];
      const r = await createRemoteShare({ scope: { traveler: t.id, recipient: o.recipient, docs, sections, lang: o.lang, patientLang: base.patientLang }, expiresAt, label: o.label || (o.recipient === 'insurer' ? 'Claim review' : 'Treating doctor') });
      return createShare({ ...base, remote: { ...r, expiresAt } });
    }
    const pullEvents = async () => {
      if (!remote) return;
      const mine = sharesFor(t.id).filter((s) => s.remote).slice(0, 10);
      await Promise.all(mine.map(async (s) => {
        try { remoteEv.set(s.id, (await remoteShareEvents(s.remote.id)).map((e) => ({ type: e.type, detail: `${e.detail || ''} · server log`, at: Date.parse(e.at) }))); } catch { /* keep last */ }
      }));
      if (alive) renderList();
    };
    let alive = true;

    const start = async () => {
      const user = isConfigured() ? await currentUser() : null;
      if (user) { await refreshServices(); remote = shareOn(); }
      if (!alive) return;
      recs = shareable();
      if (remote && !draft) st.docs = recs.map((r) => r.id);
      root.querySelector('[data-mode]').innerHTML = remote
        ? `${icon('shield')} <span><b>Server-verified sharing</b> · signed in as ${esc(user.email)}. Links work on any device and stop the moment you revoke them.</span>`
        : `${icon('sparkle')} <span><b>Demo sharing</b> · ${user ? 'the share-open function isn’t deployed' : 'not signed in'}. <a href="#/app/setup">Connected services</a></span>`;
      renderBuilder(); renderList();
      if (quick) {
        // From "I need medical help": all records, all sections, local language, 1 hour.
        st.lang = t.trip.lang;
        try {
          const sh = await make({ recipient: 'doctor', docs: recs.map((r) => r.id), sections: SECTIONS.map((x) => x.key), lang: t.trip.lang, duration: '1h', label: 'Emergency · treating doctor' });
          st.shown = sh.id; renderResult(); renderList();
          toast('Emergency access created for 1 hour.');
        } catch (err) { toast(`Couldn’t create the share: ${err.message}`); }
      } else {
        const active = sharesFor(t.id).find((s) => statusOf(s) === 'active');
        if (active) { st.shown = active.id; renderResult(); }
      }
      pullEvents();
    };
    renderBuilder(); renderList();
    start();
    const evTimer = setInterval(pullEvents, 20000);
    return () => { alive = false; off.forEach((f) => f?.()); clearInterval(tick); clearInterval(evTimer); window.removeEventListener('storage', onStorage); };
  },
};
