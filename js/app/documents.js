// App · Documents & translation
// Mobile: summary → record list → layered card sheet. Desktop: summary + table
// with a live preview pane. Both: searchable language picker, instant switching,
// uploads read for real (pdf.js text layer, Tesseract OCR) and reviewed before saving.
import { icon } from '../icons.js';
import { observeReveals } from '../interactions.js';
import { currentTraveler } from './data.js';
import { appShell, AppTop, openSheet, toast, mountShell } from './shell.js';
import { isDesktop } from './ui.js';
import { langInfo, term } from '../translate/glossary.js';
import { buildRecords, recordCard, summaryCard, fmtDate, KIND_ICON, currentFacts, setDocLang } from '../translate/records.js';
import { patientLang, setPatientLang, doctorLang, ensureTranslated, engineFor } from '../translate/state.js';
import { remember, recall } from '../nav.js';
import { openLanguagePicker } from '../translate/picker.js';
import { aiOn, summaryOn, providerName, summarize } from '../translate/ai.js';
import { processDocument } from '../docs/process.js';
import { openReview } from '../docs/review.js';
import { isConfigured, currentUser, saveDocument } from '../backend/supabase.js';
import { morph, illus, moment } from '../fx.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const TYPES = [
  { key: 'all', label: 'All' }, { key: 'rx', label: 'Prescriptions' }, { key: 'lab', label: 'Tests' },
  { key: 'history', label: 'History' }, { key: 'upload', label: 'Uploads' },
];
const TONE = { rx: 'peach', lab: 'mint', history: 'gray', upload: 'cream' };

/* ---------------------------------------------------------------- uploads store */
const upKey = (t) => `mp.uploads.${t.id}`;
export const getUploads = (t) => { try { return JSON.parse(localStorage.getItem(upKey(t))) || []; } catch { return []; } };
const setUploads = (t, list) => { try { localStorage.setItem(upKey(t), JSON.stringify(list)); } catch { /* ignore */ } };
export const recordsFor = (t) => buildRecords(t, getUploads(t));

/* ---------------------------------------------------------------- pieces */
/** "4 documents · originals in Japanese and German. You read them in …" */
function headSub(recs, lang) {
  const origs = [...new Set(recs.map((r) => r.origLang).filter(Boolean))].map((c) => langInfo(c).name);
  const list = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' }).format(origs);
  return `${recs.length} documents · originals in ${esc(list)}. You read them in ${esc(langInfo(lang).name)}; doctors choose their own language.`;
}
export function LangBar(t, lang, { doctorLink = true } = {}) {
  const info = langInfo(lang);
  const eng = engineFor(lang);
  return `<div class="langbar">
    <button type="button" class="langbar__pick" data-pick-lang>
      <span class="langbar__k">${icon('translate')} I read in</span>
      <span class="langbar__v" lang="${lang}" dir="${info.rtl ? 'rtl' : 'ltr'}">${esc(info.native)}</span>
      <span class="langbar__chev">${icon('chevron')}</span>
    </button>
    <div class="langbar__quick" role="group" aria-label="Quick switch">
      ${[...new Set([lang, t.homeLang, 'en', t.trip.lang])].slice(0, 4).map((c) => `<button type="button" data-quick-lang="${c}" aria-pressed="${c === lang}" lang="${c}">${esc(langInfo(c).native)}</button>`).join('')}
    </div>
    <a class="langbar__engine langbar__engine--${eng === 'ai' || aiOn() ? 'ai' : 'sim'}" href="#/app/setup" title="Connected services">${icon('sparkle')}<span>${aiOn() ? esc(providerName()) : 'Offline glossary'}</span></a>
    ${doctorLink ? `<a class="langbar__doc" href="#/app/doctor">${icon('eye')}<span>Doctor view · ${esc(langInfo(doctorLang(t)).native)}</span></a>` : ''}
  </div>`;
}

function recRow(t, r, lang, selected) {
  const title = r.title ? term(r.title, 'en') : r.titleText;
  const sub = r.source === 'stored' ? `Stored · not read · ${fmtSize(r.upload.size)}`
    : r.source === 'ai' ? `Extracted by AI · ${r.facts.length} items · reviewed`
    : r.source === 'read' ? `${r.upload.read?.method === 'ocr' ? 'OCR' : 'PDF text'} · ${r.facts.length} item${r.facts.length === 1 ? '' : 's'} · reviewed by you`
    : `${r.issuer}`;
  const langs = r.origLang === lang ? `<i title="Original language">${lang.toUpperCase()}</i>` : r.source === 'stored' ? `<i title="Original language">${(r.origLang || '?').toUpperCase()}</i>` : `<i title="Original: ${esc(langInfo(r.origLang || 'en').name)}">${(r.origLang || '?').toUpperCase()}</i>${icon('arrow')}<i class="is-to">${lang.toUpperCase()}</i>`;
  return `<li data-type="${r.kind}" data-search="${esc(`${title} ${r.issuer} ${r.upload?.name || ''} ${r.kind}`.toLowerCase())}">
    <button type="button" class="dcard dcard--${TONE[r.kind] || 'cream'}" data-rec="${r.id}" aria-pressed="${selected}">
      <span class="dcard__ic">${icon(KIND_ICON[r.kind] || 'file')}</span>
      <span class="dcard__txt"><small>${r.signup ? `Uploaded at sign-up · ${esc(r.signup)}` : r.source === 'home' ? `Home clinic · ${fmtDate(r.date, 'en')}` : `Upload · ${r.upload?.added || ''}`}</small><b>${esc(title)}</b><span class="dcard__preview">${esc(sub)}</span></span>
      <span class="dcard__type">${r.signup ? 'Uploaded' : r.source === 'home' ? 'Original' : r.source === 'ai' ? 'AI-read' : r.source === 'read' ? 'Read' : 'Upload'}</span>
      <span class="dcard__date">${fmtDate(r.date, 'en') || r.upload?.added || ''}</span>
      <span class="dcard__langs dcard__flow">${r.upload && r.source !== 'home' ? '<i class="is-new">New</i>' : ''}${langs}</span>
    </button>
  </li>`;
}

/** "Original language" line: how it was determined, and a Change button for the patient. */
function origLine(r, canChange) {
  const li = r.langInfo || {};
  const name = r.origLang ? langInfo(r.origLang) : null;
  const how = !r.origLang ? 'not detected'
    : li.source === 'manual' ? `set by you${li.auto ? ` (detected: ${langInfo(li.auto).name})` : ''}`
    : li.source === 'record' ? 'as issued'
    : li.source === 'ai' ? 'detected by AI'
    : `detected automatically · ${li.confidence || 'medium'} confidence`;
  const unsure = !r.origLang || (li.source === 'detected' && li.confidence === 'low');
  return `<div class="lview__orig ${unsure ? 'is-unsure' : ''}">
    ${icon(unsure ? 'alert' : 'globe')}
    <span>Original language: <b ${name ? `lang="${r.origLang}"` : ''}>${name ? `${esc(name.native)}${name.native !== name.name ? ` · ${esc(name.name)}` : ''}` : 'Unknown'}</b> <small>${how}${unsure ? ' · please check' : ''}</small></span>
    ${canChange ? `<button type="button" class="lview__change" data-doclang="${esc(r.id)}">${r.origLang ? 'Change' : 'Set language'}</button>` : ''}
  </div>`;
}

/** Original and translation together: side by side by default, or layered. */
export function layeredViewer(t, r, lang, mode = 'compare', { canChange = false } = {}) {
  if (r.source === 'stored') {
    return `<div class="lview">
      ${origLine(r, canChange)}
      <div class="ufile"><span class="ufile__ic">${icon(r.upload.source === 'Camera' ? 'camera' : 'file')}</span><span><b>${esc(r.upload.name)}</b><small>${fmtSize(r.upload.size)} · ${r.upload.source} · ${r.upload.added}</small></span></div>
      <p class="unote">${r.upload.kind && !r.upload.mine ? 'This sample belongs to another demo traveler, so it was stored but not read.' : r.upload.error ? `This file couldn’t be read (${esc(r.upload.error)}). It’s stored with your passport.` : 'Stored with your passport without extracted items (you chose “Save file only”).'}${r.upload.remote ? ' Saved in your private cloud storage.' : ''}</p>
      <div class="dsheet__actions"><button type="button" class="btn btn--ghost" data-remove-upload="${r.upload.id}"><span>Remove upload</span><span class="btn__dot">${icon('close')}</span></button></div>
    </div>`;
  }
  const same = r.origLang === lang;
  const eng = engineFor(lang) === 'ai' ? 'ai' : 'sim';
  return `<div class="lview lview--${same ? 'single' : mode}" data-lview>
    ${origLine(r, canChange)}
    ${same ? '' : `<div class="lview__bar">
      <div class="segmented lview__mode" role="group" aria-label="View" data-lmode>
        <span class="segmented__thumb" aria-hidden="true"></span>
        <button type="button" data-m="stack" aria-pressed="${mode === 'stack'}">Layered</button>
        <button type="button" data-m="compare" aria-pressed="${mode === 'compare'}">Side by side</button>
      </div>
      <button type="button" class="lview__flip" data-flip>${icon('swap')} <span>Show original</span></button>
    </div>`}
    <div class="lview__deck">
      ${same ? '' : `<div class="lview__card lview__card--orig">${recordCard(r, t, r.origLang, { variant: 'original' })}</div>`}
      <div class="lview__card lview__card--tr">${recordCard(r, t, lang, { engine: eng, variant: same ? 'original' : 'translation' })}</div>
    </div>
    <p class="verify verify--en">${icon('eye')} <span>Medical translations require professional verification. ${aiOn() ? `Glossary terms translated offline; other text by ${esc(providerName())} (machine translation).` : 'Translated from a reviewed medical glossary; no AI or translation service was used.'} ${r.source === 'read' || r.source === 'ai' ? `Items were extracted from the file${r.source === 'ai' ? ' by AI' : ''} and checked by you. ` : ''}Unrecognised text is shown as written, never guessed.</span></p>
    ${r.upload && r.source !== 'home' ? `<div class="dsheet__actions"><button type="button" class="btn btn--ghost" data-remove-upload="${r.upload.id}"><span>Remove upload</span><span class="btn__dot">${icon('close')}</span></button></div>` : ''}
  </div>`;
}

export function bindViewer(box) {
  const lv = box.querySelector('[data-lview]');
  if (!lv) return;
  const seg = lv.querySelector('[data-lmode]');
  const thumb = () => {
    const a = seg?.querySelector('[aria-pressed="true"]');
    const th = seg?.querySelector('.segmented__thumb');
    if (a && th) { th.style.width = `${a.offsetWidth}px`; th.style.transform = `translateX(${a.offsetLeft}px)`; }
  };
  seg?.addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    lv.classList.remove('lview--stack', 'lview--compare', 'is-flipped');
    lv.classList.add(`lview--${b.dataset.m}`);
    thumb();
  });
  lv.querySelector('[data-flip]')?.addEventListener('click', (e) => {
    lv.classList.toggle('is-flipped');
    e.currentTarget.querySelector('span').textContent = lv.classList.contains('is-flipped') ? 'Show translation' : 'Show original';
  });
  requestAnimationFrame(thumb);
}

/** AI narrative summary (backend summary service only). Facts in English, coded where possible. */
export function factsForAi(t) {
  const f = currentFacts(t);
  const en = (k) => term(k, 'en');
  return {
    allergies: f.allergies.map((a) => (a.text ? a.text.name : `${en(a.name)} (${en(a.severity)}, ${en(a.reaction)})`)),
    diagnoses: f.conditions.map((c) => (c.text ? c.text.name : en(c.name))),
    medications: f.medications.map((m) => (m.text ? m.text.name : en(m.name))),
    test_results: f.tests.map((x) => (x.text ? x.text.name : `${en(x.name)}: ${x.value.pct !== undefined ? `${x.value.pct}% of predicted` : `${x.value.n}${x.value.unit ? ` ${x.value.unit}` : ''}`} (${en(x.status)})`)),
    blood_type: f.blood,
  };
}

/* ---------------------------------------------------------------- page */
export const appDocuments = {
  title: 'Documents · MediPassport',
  html() {
    const t = currentTraveler();
    const q = (location.hash.match(/[?&]lang=([\w-]+)/) || [])[1];
    if (q) setPatientLang(t, q);
    const lang = patientLang(t);
    const recs = recordsFor(t);
    const desk = isDesktop();
    return appShell('documents', `
      ${AppTop(t, { title: 'Documents', desk: 'Documents & translation' })}
      <section class="dhead">
        <h1 class="dhead__h">Records,<br/><span class="serif">in any language.</span></h1>
        <p class="dhead__sub" data-dsub>${headSub(recs, lang)}</p>
        <div class="dhead__actions">
          <label class="dact dact--black"><input type="file" accept="image/*" capture="environment" data-up="Camera"/>${icon('scan')}<span>Scan</span></label>
          <label class="dact"><input type="file" accept="application/pdf,.pdf,image/*" multiple data-up="Files"/>${icon('upload')}<span>Upload</span></label>
        </div>
      </section>

      <div data-langbar>${LangBar(t, lang)}</div>
      <p class="tstatus" data-tstatus aria-live="polite" hidden></p>

      <section class="dsum" data-summary>${summaryCard(t, lang)}</section>

      <div class="dtools">
        <label class="dsearch">${icon('search')}<input type="search" placeholder="Search records" aria-label="Search records" data-search-input/></label>
        <div class="chips" role="group" aria-label="Filter documents" data-filter>
          ${TYPES.map((x, i) => `<button type="button" class="chipf" data-f="${x.key}" aria-pressed="${i === 0}">${x.label}</button>`).join('')}
        </div>
      </div>

      <div class="dlayout">
        <div class="dlist-wrap">
          <div class="dtable-head" aria-hidden="true"><span>Document</span><span>Source</span><span>Date</span><span>Translation</span></div>
          <ul class="dlist" data-list>${recs.map((r, i) => recRow(t, r, lang, desk && i === 0)).join('')}</ul>
          <div class="dempty" data-empty hidden>${illus('search')}<b>No documents match</b><span>Try another filter or search.</span></div>
          <div class="ddrop" data-drop>${icon('upload')}<span><b>Drop files to add them</b><small>Any PDF or photo · read on this device (PDF text or OCR) · you check every item before saving</small></span></div>
        </div>
        <aside class="dpane" data-pane aria-live="polite"></aside>
      </div>
      <p class="app-note">Fictional traveler · sample data · not medical advice</p>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root), observeReveals(root)];
    let lang = patientLang(t);
    let selected = isDesktop() ? recordsFor(t)[0]?.id : null;
    let mode = 'compare';
    const list = root.querySelector('[data-list]');
    const pane = root.querySelector('[data-pane]');
    const status = root.querySelector('[data-tstatus]');
    const find = (id) => recordsFor(t).find((r) => String(r.id) === String(id));
    let alive = true;

    const setStatus = (html, tone = '') => { status.hidden = !html; status.className = `tstatus ${tone}`; status.innerHTML = html || ''; };

    /* render everything that depends on language */
    const paint = () => {
      root.querySelector('[data-langbar]').innerHTML = LangBar(t, lang);
      root.querySelector('[data-summary]').innerHTML = summaryCard(t, lang, { engine: engineFor(lang) });
      const recs = recordsFor(t);
      root.querySelector('[data-dsub]').innerHTML = headSub(recs, lang);
      list.innerHTML = recs.map((r) => recRow(t, r, lang, isDesktop() && String(r.id) === String(selected))).join('');
      if (isDesktop() && selected) {
        const r = find(selected);
        if (r) { pane.innerHTML = layeredViewer(t, r, lang, mode, { canChange: true }); bindViewer(pane); }
      }
      applyFilter();
    };

    /* switch language: instant for glossary languages; a connected translation service fills gaps */
    const switchTo = async (code) => {
      const changed = lang !== code;
      lang = code;
      setPatientLang(t, code);
      paint();
      if (changed) { morph(root.querySelector('[data-summary]')); morph(pane); }
      try {
        if (aiOn()) setStatus(`${icon('sparkle')} ${engineFor(code) === 'ai' ? `Translating with ${esc(providerName())}…` : 'Checking for text the glossary doesn’t cover…'}`, 'is-busy');
        const res = await ensureTranslated(recordsFor(t), code);
        if (!alive || lang !== code) return;
        if (res === 'translated') paint();
        if (summaryOn()) {
          setStatus(`${icon('sparkle')} Writing an AI summary…`, 'is-busy');
          const narrative = await summarize(code, langInfo(code).name, factsForAi(t));
          if (!alive || lang !== code) return;
          root.querySelector('[data-summary]').innerHTML = summaryCard(t, code, { engine: 'ai', narrative });
        }
        setStatus('');
      } catch (err) {
        setStatus(`${icon('alert')} ${esc(err.message || 'Translation service failed.')} Showing what the glossary covers; the rest is marked “not translated”.`, 'is-error');
      }
    };

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-pick-lang]')) {
        openLanguagePicker({ current: lang, title: 'Read my records in', suggested: [t.homeLang, 'en', t.trip.lang], onPick: switchTo });
        return;
      }
      const dl = e.target.closest('[data-doclang]');
      if (dl) {
        const r = find(dl.dataset.doclang);
        if (!r) return;
        const auto = r.langInfo?.auto || (r.langInfo?.source !== 'manual' ? r.origLang : null);
        openLanguagePicker({
          current: r.origLang || '', title: 'Original language of this document', suggested: [auto, t.homeLang, 'en'].filter(Boolean),
          onPick: (code) => {
            setDocLang(r.id, code === auto ? null : code);
            toast(`Original language set to ${langInfo(code).name}.`);
            if (!isDesktop()) window.dispatchEvent(new HashChangeEvent('hashchange'));
            switchTo(lang);
          },
        });
        return;
      }
      const q = e.target.closest('[data-quick-lang]');
      if (q) { switchTo(q.dataset.quickLang); return; }
      const b = e.target.closest('[data-rec]');
      if (b) {
        const r = find(b.dataset.rec);
        if (!r) return;
        selected = r.id; saveView();
        if (isDesktop()) {
          list.querySelectorAll('[data-rec]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          pane.innerHTML = layeredViewer(t, r, lang, mode, { canChange: true }); bindViewer(pane);
        } else {
          openSheet({ title: r.title ? term(r.title, 'en') : 'Uploaded document', html: layeredViewer(t, r, lang, 'compare', { canChange: true }), mount: bindViewer });
        }
      }
      const m = e.target.closest('[data-lmode] [data-m]');
      if (m) { mode = m.dataset.m; saveView(); }
    });

    /* filter + search */
    const filter = root.querySelector('[data-filter]');
    const search = root.querySelector('[data-search-input]');
    let fType = 'all', fq = '';
    const saveView = () => remember(`docs.${t.id}`, { fType, fq, selected, mode });
    function applyFilter() {
      let shown = 0;
      list.querySelectorAll(':scope > li').forEach((li) => {
        const on = (fType === 'all' || li.dataset.type === fType) && (!fq || li.dataset.search.includes(fq));
        li.hidden = !on; if (on) shown++;
      });
      root.querySelector('[data-empty]').hidden = shown > 0;
    }
    filter.addEventListener('click', (e) => {
      const b = e.target.closest('[data-f]');
      if (!b) return;
      fType = b.dataset.f; saveView();
      filter.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      applyFilter();
    });
    search.addEventListener('input', () => { fq = search.value.trim().toLowerCase(); saveView(); applyFilter(); });

    /* uploads */
    const addFiles = async (files, source) => {
      for (const file of files) {
        const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        const temp = document.createElement('li');
        temp.innerHTML = `<div class="dcard dcard--cream is-uploading"><span class="dcard__ic">${icon('upload')}</span><span class="dcard__txt"><small data-step>Reading…</small><b>${esc(file.name)}</b><span class="dcard__preview">${fmtSize(file.size)}</span></span><span class="dcard__bar"><i data-pct></i></span></div>`;
        list.prepend(temp);
        temp.scrollIntoView({ block: 'nearest' });
        const step = temp.querySelector('[data-step]'), bar = temp.querySelector('[data-pct]');
        const onProgress = (label, pct) => {
          step.textContent = typeof pct === 'number' ? `${label} · ${Math.round(pct * 100)}%` : label;
          if (typeof pct === 'number') { bar.style.animation = 'none'; bar.style.width = `${Math.max(6, pct * 100)}%`; }
        };
        const added = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date());
        const base = { id, name: file.name, size: file.size, type: file.type, source, added };
        let result = null, error = null;
        try { result = await processDocument(file, { hint: t.homeLang, onProgress }); } catch (err) { error = err.message || 'Unreadable file'; }
        if (!alive) return;
        temp.remove();
        const user = isConfigured() ? await currentUser().catch(() => null) : null;

        const finish = async (u) => {
          if (user) {
            try {
              const row = await saveDocument(file, { title: u.read?.title || file.name, lang: u.lang, facts: u.read?.items || [], text: result?.text, method: u.read ? (u.read.extraction === 'ai' ? 'ai' : 'glossary') : 'manual' });
              u.remote = { id: row.id, path: row.storage_path };
            } catch (err) { toast(`Cloud save failed: ${err.message}. Kept on this device.`); }
          }
          setUploads(t, [...getUploads(t), u]);
          selected = id;
          paint();
          list.querySelector(`[data-rec="${id}"]`)?.classList.add('is-fresh');
          if (u.read) switchTo(lang);
          if (!isDesktop()) list.querySelector(`[data-rec="${id}"]`)?.click();
        };
        if (error) {
          toast(`Couldn’t read ${file.name}: ${error}`);
          await finish({ ...base, error, lang: null, langSource: 'unknown' });
          continue;
        }
        if (result.note) toast(result.note);
        await new Promise((done) => openReview({
          file, result, signedIn: !!user,
          onSave: async (rv) => {
            await finish({ ...base, lang: rv.lang, langConf: rv.langSource === 'manual' ? 'high' : result.langConf, langSource: rv.langSource,
              read: { title: rv.title, items: rv.items, method: result.method, ocrLangs: result.ocrLangs, extraction: result.extraction, excerpt: result.text.slice(0, 1500) } });
            moment('success');
            toast(`${rv.items.length} item${rv.items.length === 1 ? '' : 's'} saved from ${file.name}${rv.lang ? ` · ${langInfo(rv.lang).name}` : ''}.`);
            done();
          },
          onStoreOnly: async () => { await finish({ ...base, lang: result.lang, langConf: result.langConf, langSource: result.lang ? 'detected' : 'unknown' }); toast(`${file.name} stored with your passport.`); done(); },
        }));
      }
    };
    root.addEventListener('change', (e) => {
      const inp = e.target.closest('[data-up]');
      if (inp?.files?.length) { addFiles([...inp.files], inp.dataset.up); inp.value = ''; }
    });
    const drop = root.querySelector('[data-drop]');
    const frame = root.querySelector('.dlayout');
    frame.addEventListener('dragover', (e) => { if (e.dataTransfer?.types?.includes('Files')) { e.preventDefault(); drop.classList.add('is-over'); } });
    frame.addEventListener('dragleave', (e) => { if (!frame.contains(e.relatedTarget)) drop.classList.remove('is-over'); });
    frame.addEventListener('drop', (e) => {
      if (!e.dataTransfer?.files?.length) return;
      e.preventDefault(); drop.classList.remove('is-over');
      addFiles([...e.dataTransfer.files], 'Files');
    });

    const onRemove = (e) => {
      const b = e.target.closest('[data-remove-upload]');
      if (!b) return;
      setUploads(t, getUploads(t).filter((u) => u.id !== b.dataset.removeUpload));
      toast('Upload removed.');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    };
    document.addEventListener('click', onRemove);

    // Restore filter, search, open document and view mode from earlier in the session.
    const vs = recall(`docs.${t.id}`) || {};
    if (vs.fType) { fType = vs.fType; filter.querySelectorAll('[data-f]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.f === fType))); }
    if (vs.fq) { fq = vs.fq; search.value = vs.fq; }
    if (vs.mode) mode = vs.mode;
    if (isDesktop() && vs.selected && find(vs.selected)) selected = vs.selected;
    paint();
    if (aiOn()) switchTo(lang);
    if (/[?&]lang=/.test(location.hash)) toast(`Showing your records in ${langInfo(lang).name}.`);
    return () => { alive = false; off.forEach((f) => f?.()); document.removeEventListener('click', onRemove); };
  },
};
