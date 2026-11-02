// App · Documents & translation
// Mobile: summary → record list → layered card sheet. Desktop: summary + table
// with a live preview pane. Both: searchable language picker, instant switching,
// uploads (sample PDFs read by simulation; any PDF/image read by live AI when on).
import { icon } from '../icons.js';
import { observeReveals } from '../interactions.js';
import { currentTraveler } from './data.js';
import { appShell, AppTop, openSheet, toast, mountShell } from './shell.js';
import { isDesktop } from './ui.js';
import { DOC_KINDS, detectSample } from '../onboarding/data.js';
import { langInfo, term } from '../translate/glossary.js';
import { buildRecords, recordCard, summaryCard, fmtDate, KIND_ICON, currentFacts } from '../translate/records.js';
import { targetLang, setTargetLang, ensureTranslated, engineFor } from '../translate/state.js';
import { openLanguagePicker, openAiSettings } from '../translate/picker.js';
import { aiOn, extractDocument, summarize } from '../translate/ai.js';

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
export function LangBar(t, lang, { doctorLink = true } = {}) {
  const info = langInfo(lang);
  const eng = engineFor(lang);
  return `<div class="langbar">
    <button type="button" class="langbar__pick" data-pick-lang>
      <span class="langbar__k">${icon('translate')} Translate to</span>
      <span class="langbar__v" lang="${lang}" dir="${info.rtl ? 'rtl' : 'ltr'}">${esc(info.native)}</span>
      <span class="langbar__chev">${icon('chevron')}</span>
    </button>
    <div class="langbar__quick" role="group" aria-label="Quick switch">
      ${[...new Set([t.trip.lang, 'en', t.homeLang])].map((c) => `<button type="button" data-quick-lang="${c}" aria-pressed="${c === lang}" lang="${c}">${esc(langInfo(c).native)}</button>`).join('')}
    </div>
    <button type="button" class="langbar__engine langbar__engine--${eng === 'ai' || aiOn() ? 'ai' : 'sim'}" data-ai-settings>${icon('sparkle')}<span>${aiOn() ? 'Live AI' : 'Simulated'}</span></button>
    ${doctorLink ? `<a class="langbar__doc" href="#/app/doctor?lang=${lang}">${icon('eye')}<span>Doctor view</span></a>` : ''}
  </div>`;
}

function recRow(t, r, lang, selected) {
  const title = r.title ? term(r.title, 'en') : r.titleText;
  const sub = r.source === 'stored' ? `Stored · not read · ${fmtSize(r.upload.size)}`
    : r.source === 'ai' ? `Read by live AI · ${r.facts.length} items`
    : `${r.issuer}`;
  const langs = r.source === 'stored' ? '' : `<i>${(r.origLang || '?').toUpperCase()}</i>${icon('arrow')}<i class="is-to">${lang.toUpperCase()}</i>`;
  return `<li data-type="${r.kind}" data-search="${esc(`${title} ${r.issuer} ${r.upload?.name || ''} ${r.kind}`.toLowerCase())}">
    <button type="button" class="dcard dcard--${TONE[r.kind] || 'cream'}" data-rec="${r.id}" aria-pressed="${selected}">
      <span class="dcard__ic">${icon(KIND_ICON[r.kind] || 'file')}</span>
      <span class="dcard__txt"><small>${r.source === 'home' ? 'Home clinic' : 'Upload'} · ${fmtDate(r.date, 'en') || r.upload?.added || ''}</small><b>${esc(title)}</b><span class="dcard__preview">${esc(sub)}</span></span>
      <span class="dcard__type">${r.source === 'home' ? 'Original' : r.source === 'ai' ? 'Live AI' : 'Upload'}</span>
      <span class="dcard__date">${fmtDate(r.date, 'en') || r.upload?.added || ''}</span>
      <span class="dcard__langs dcard__flow">${r.upload && r.source !== 'home' ? '<i class="is-new">New</i>' : ''}${langs}</span>
    </button>
  </li>`;
}

/** Layered viewer: translation in front, original behind; flip or compare. */
export function layeredViewer(t, r, lang, mode = 'stack') {
  if (r.source === 'stored') {
    return `<div class="lview">
      <div class="ufile"><span class="ufile__ic">${icon(r.upload.source === 'Camera' ? 'camera' : 'file')}</span><span><b>${esc(r.upload.name)}</b><small>${fmtSize(r.upload.size)} · ${r.upload.source} · ${r.upload.added}</small></span></div>
      <p class="unote">${r.upload.kind && !r.upload.mine ? 'This sample belongs to another demo traveler, so it was stored but not read.' : aiOn() ? 'Live AI couldn’t read this file. It’s stored with your passport.' : 'Stored with your passport. The simulated engine reads only MediPassport sample PDFs. Turn on live AI to read any PDF or photo.'}</p>
      <div class="dsheet__actions"><button type="button" class="btn btn--ghost" data-remove-upload="${r.upload.id}"><span>Remove upload</span><span class="btn__dot">${icon('close')}</span></button></div>
    </div>`;
  }
  const same = r.origLang === lang;
  const eng = r.source === 'ai' || engineFor(lang) === 'ai' ? 'ai' : 'sim';
  return `<div class="lview lview--${same ? 'single' : mode}" data-lview>
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
    <p class="verify verify--en">${icon('eye')} <span>Medical translations require professional verification. ${eng === 'ai' ? 'Translated by live AI (Claude).' : 'Simulated translation from a reviewed glossary; no AI model was used.'} Unrecognised text is shown as written, never guessed.</span></p>
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

/** AI narrative summary (live AI only). Facts in English, coded where possible. */
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
    if (q) setTargetLang(t, q);
    const lang = targetLang(t);
    const recs = recordsFor(t);
    const desk = isDesktop();
    return appShell('documents', `
      ${AppTop(t, { title: 'Documents', desk: 'Documents & translation' })}
      <section class="dhead">
        <h1 class="dhead__h">Records,<br/><span class="serif">in any language.</span></h1>
        <p class="dhead__sub">${recs.length} documents · originals in ${langInfo(currentFacts(t).homeLang).name}. Doctors see them translated, next to the original.</p>
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
          <p class="dempty" data-empty hidden>No documents match.</p>
          <div class="ddrop" data-drop>${icon('upload')}<span><b>Drop files to add them</b><small>${aiOn() ? 'Any PDF or photo · read by live AI' : 'Sample PDFs are read automatically · other files are stored'}</small></span></div>
        </div>
        <aside class="dpane" data-pane aria-live="polite"></aside>
      </div>
      <p class="app-note">Fictional traveler · sample data · not medical advice</p>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root), observeReveals(root)];
    let lang = targetLang(t);
    let selected = isDesktop() ? recordsFor(t)[0]?.id : null;
    let mode = 'stack';
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
      list.innerHTML = recs.map((r) => recRow(t, r, lang, isDesktop() && String(r.id) === String(selected))).join('');
      if (isDesktop() && selected) {
        const r = find(selected);
        if (r) { pane.innerHTML = layeredViewer(t, r, lang, mode); bindViewer(pane); }
      }
      applyFilter();
    };

    /* switch language: instant for glossary languages; live AI fills gaps */
    const switchTo = async (code) => {
      lang = code;
      setTargetLang(t, code);
      paint();
      try {
        if (aiOn()) setStatus(`${icon('sparkle')} ${engineFor(code) === 'ai' ? 'Translating with Claude…' : 'Checking for text the glossary doesn’t cover…'}`, 'is-busy');
        const res = await ensureTranslated(recordsFor(t), code);
        if (!alive || lang !== code) return;
        if (res === 'translated') paint();
        if (aiOn()) {
          setStatus(`${icon('sparkle')} Writing an AI summary…`, 'is-busy');
          const narrative = await summarize(code, langInfo(code).name, factsForAi(t));
          if (!alive || lang !== code) return;
          root.querySelector('[data-summary]').innerHTML = summaryCard(t, code, { engine: 'ai', narrative });
        }
        setStatus('');
      } catch (err) {
        setStatus(`${icon('alert')} ${esc(err.message || 'Live AI failed.')} Showing what the glossary covers; the rest is marked “not translated”.`, 'is-error');
      }
    };

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-pick-lang]')) {
        openLanguagePicker({ current: lang, suggested: [t.trip.lang, 'en', currentFacts(t).homeLang], onPick: switchTo });
        return;
      }
      const q = e.target.closest('[data-quick-lang]');
      if (q) { switchTo(q.dataset.quickLang); return; }
      if (e.target.closest('[data-ai-settings]')) { openAiSettings(); return; }
      const b = e.target.closest('[data-rec]');
      if (b) {
        const r = find(b.dataset.rec);
        if (!r) return;
        selected = r.id;
        if (isDesktop()) {
          list.querySelectorAll('[data-rec]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
          pane.innerHTML = layeredViewer(t, r, lang, mode); bindViewer(pane);
        } else {
          openSheet({ title: r.title ? term(r.title, 'en') : 'Uploaded document', html: layeredViewer(t, r, lang, 'stack'), mount: bindViewer });
        }
      }
      const m = e.target.closest('[data-lmode] [data-m]');
      if (m) mode = m.dataset.m;
    });

    /* filter + search */
    const filter = root.querySelector('[data-filter]');
    const search = root.querySelector('[data-search-input]');
    let fType = 'all', fq = '';
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
      fType = b.dataset.f;
      filter.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      applyFilter();
    });
    search.addEventListener('input', () => { fq = search.value.trim().toLowerCase(); applyFilter(); });

    /* uploads */
    const addFiles = async (files, source) => {
      for (const file of files) {
        const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
        const temp = document.createElement('li');
        temp.innerHTML = `<div class="dcard dcard--cream is-uploading"><span class="dcard__ic">${icon('upload')}</span><span class="dcard__txt"><small>${aiOn() ? 'Reading with live AI…' : 'Uploading…'}</small><b>${esc(file.name)}</b><span class="dcard__preview">${fmtSize(file.size)}</span></span><span class="dcard__bar"><i></i></span></div>`;
        list.prepend(temp);
        temp.scrollIntoView({ block: 'nearest' });
        const tag = await detectSample(file).catch(() => null);
        const u = {
          id, name: file.name, size: file.size, source,
          kind: tag?.kind ?? null, mine: tag ? tag.traveler === t.id : false,
          added: new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date()),
        };
        if (!tag && aiOn()) {
          try { u.ai = await extractDocument(file); } catch (err) { toast(err.message || 'Live AI couldn’t read this file.'); }
        } else {
          await new Promise((r) => setTimeout(r, 1000));
        }
        if (!alive) return;
        setUploads(t, [...getUploads(t), u]);
        selected = id;
        temp.remove();
        paint();
        list.querySelector(`[data-rec="${id}"]`)?.classList.add('is-fresh');
        toast(u.kind && u.mine ? `${DOC_KINDS[u.kind].label} recognized. Translation ready.`
          : u.ai ? `Read by live AI: ${(u.ai.allergies.length + u.ai.medications.length + u.ai.conditions.length + u.ai.tests.length)} items. Check them against the original.`
          : `${file.name} stored with your passport.`);
        if (u.ai) switchTo(lang);
        if (!isDesktop()) list.querySelector(`[data-rec="${id}"]`)?.click();
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

    paint();
    if (aiOn()) switchTo(lang);
    if (/[?&]lang=/.test(location.hash)) toast(`Showing your records in ${langInfo(lang).name}.`);
    return () => { alive = false; off.forEach((f) => f?.()); document.removeEventListener('click', onRemove); };
  },
};
