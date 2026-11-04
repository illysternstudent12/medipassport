// Structured medical records + language-aware rendering.
//
// Records are coded facts (allergen, reaction, drug, dose, schedule, test…),
// mirroring the sample PDFs in assets/demo-docs. Rendering a record in any
// language resolves each segment through, in order:
//   1. the reviewed glossary (simulated engine),
//   2. a cached live-AI translation (only if the user enabled live AI),
//   3. otherwise the source text, clearly marked "not translated".
// Nothing is ever filled in that isn't in the record.
import { icon } from '../icons.js';
import { term, termEn, isRtl, langInfo, SIM } from './glossary.js';
import { TRAVELERS, getOnboarding } from '../app/data.js';
import { aiCached, aiUncertain, providerName } from './ai.js';

/* ======================================================================= facts */
const F = {
  maya: {
    dob: '1994-03-14', homeLang: 'he',
    allergies: [{ kind: 'allergy', name: 'penicillin', severity: 'severe', reaction: 'anaphylaxis', year: 2019, advice: 'avoid_penicillins', critical: true }],
    conditions: [{ kind: 'condition', name: 't1d', since: { y: 2009 }, note: 'cgm' }],
    medications: [
      { kind: 'med', name: 'insulin_glargine', dose: { n: 20, unit: 'u_units' }, schedule: 'evening' },
      { kind: 'med', name: 'insulin_aspart', dose: { code: 'by_carb' }, schedule: 'with_meals' },
    ],
    tests: [
      { kind: 'test', name: 'hba1c', value: { n: 6.8, d: 1, unit: '%' }, ref: { target: { op: '<', n: 7, d: 1 } }, status: 'in_target', key: true },
      { kind: 'test', name: 'creatinine', value: { n: 0.8, d: 1, unit: 'mg/dL' }, ref: { range: [0.5, 1.1], d: 1 }, status: 'in_range' },
    ],
    blood: 'O+',
    docs: [
      { kind: 'rx', title: 'doc_rx', issuer: 'Carmel Family Health Clinic, Haifa', clinician: 'Dr. Noa Levi, MD', date: '2026-08-12' },
      { kind: 'lab', title: 'doc_lab', issuer: 'Carmel Medical Laboratory', clinician: 'Dr. Noa Levi, MD', date: '2026-09-03' },
      { kind: 'history', title: 'doc_history', issuer: 'Carmel Family Health Clinic, Haifa', clinician: 'Dr. Noa Levi, MD', date: '2026-01-01' },
    ],
  },
  kenji: {
    dob: '1987-07-02', homeLang: 'ja',
    allergies: [{ kind: 'allergy', name: 'peanuts', severity: 'severe', reaction: 'anaphylaxis', advice: 'carries_epipen', critical: true }],
    conditions: [{ kind: 'condition', name: 'asthma', since: { code: 'childhood' }, note: 'last_admission_2021' }],
    medications: [
      { kind: 'med', name: 'budesonide_formoterol', dose: { n: 2, unit: 'u_puffs' }, schedule: 'twice_daily' },
      { kind: 'med', name: 'salbutamol', dose: { n: 100, unit: 'µg' }, schedule: 'as_needed' },
      { kind: 'med', name: 'adrenaline_ai', dose: { n: 0.3, d: 1, unit: 'mg' }, schedule: 'emergency_only' },
    ],
    tests: [
      { kind: 'test', name: 'fev1', value: { pct: 82 }, ref: { op: '>', n: 80, unit: '%' }, status: 'in_range', key: true },
      { kind: 'test', name: 'fev1_fvc', value: { n: 0.74, d: 2 }, ref: { op: '>', n: 0.7, d: 2 }, status: 'in_range' },
    ],
    blood: 'A+',
    docs: [
      { kind: 'rx', title: 'doc_rx', issuer: 'Setagaya Respiratory Clinic, Tokyo', clinician: 'Dr. Hiroshi Mori', date: '2026-06-18' },
      { kind: 'lab', title: 'doc_spiro', issuer: 'Setagaya Respiratory Clinic, Pulmonary Function Lab', clinician: 'Dr. Hiroshi Mori', date: '2026-06-18' },
      { kind: 'history', title: 'doc_history', issuer: 'Setagaya Respiratory Clinic, Tokyo', clinician: 'Dr. Hiroshi Mori', date: '2026-03-01' },
    ],
  },
  amara: {
    dob: '1979-11-23', homeLang: 'en',
    allergies: [
      { kind: 'allergy', name: 'sulfonamides', severity: 'moderate', reaction: 'rash', advice: 'avoid_sulfa', critical: true },
      { kind: 'allergy', name: 'latex', severity: 'mild', reaction: 'contact_dermatitis', advice: 'latex_free' },
    ],
    conditions: [
      { kind: 'condition', name: 'hypertension', since: { y: 2020 }, note: 'well_controlled' },
      { kind: 'condition', name: 'hypothyroidism', since: { y: 2018 }, note: 'stable_replacement' },
    ],
    medications: [
      { kind: 'med', name: 'levothyroxine', dose: { n: 75, unit: 'µg' }, schedule: 'morning_before_breakfast' },
      { kind: 'med', name: 'amlodipine', dose: { n: 5, unit: 'mg' }, schedule: 'once_daily' },
    ],
    tests: [
      { kind: 'test', name: 'tsh', value: { n: 2.1, d: 1, unit: 'mIU/L' }, ref: { range: [0.4, 4], d: 1 }, status: 'in_range', key: true },
      { kind: 'test', name: 'potassium', value: { n: 4.2, d: 1, unit: 'mmol/L' }, ref: { range: [3.5, 5.3], d: 1 }, status: 'in_range' },
    ],
    blood: 'B−',
    docs: [
      { kind: 'rx', title: 'doc_rx', issuer: 'Elmfield GP Surgery, Bristol', clinician: 'Dr. Sarah Whitfield, MRCGP', date: '2026-10-02' },
      { kind: 'lab', title: 'doc_lab', issuer: 'Avon Vale Hospital Pathology', clinician: 'Dr. Sarah Whitfield, MRCGP', date: '2026-09-22' },
      { kind: 'history', title: 'doc_history', issuer: 'Elmfield GP Surgery, Bristol', clinician: 'Dr. Sarah Whitfield, MRCGP', date: '2026-01-10' },
    ],
  },
  // Guided demo: German originals (homeLang 'de'), read in Japan.
  lukas: {
    dob: '1985-04-11', homeLang: 'de',
    allergies: [{ kind: 'allergy', name: 'penicillin', severity: 'severe', reaction: 'anaphylaxis', year: 2015, advice: 'avoid_penicillins', critical: true }],
    conditions: [
      { kind: 'condition', name: 'hypertension', since: { y: 2021 }, note: 'well_controlled' },
      { kind: 'condition', name: 'asthma', since: { code: 'childhood' } },
    ],
    medications: [
      { kind: 'med', name: 'amlodipine', dose: { n: 5, unit: 'mg' }, schedule: 'once_daily' },
      { kind: 'med', name: 'salbutamol', dose: { n: 100, unit: 'µg' }, schedule: 'as_needed' },
    ],
    tests: [
      { kind: 'test', name: 'creatinine', value: { n: 0.9, d: 1, unit: 'mg/dL' }, ref: { range: [0.7, 1.3], d: 1 }, status: 'in_range', key: true },
      { kind: 'test', name: 'potassium', value: { n: 4.4, d: 1, unit: 'mmol/L' }, ref: { range: [3.5, 5.1], d: 1 }, status: 'in_range' },
    ],
    blood: 'A+',
    docs: [
      { kind: 'rx', title: 'doc_rx', issuer: 'Hausarztpraxis Dr. med. Jonas Krüger, Berlin', clinician: 'Dr. med. Jonas Krüger', date: '2026-10-08' },
      { kind: 'lab', title: 'doc_lab', issuer: 'Spree-Labor Diagnostik, Berlin', clinician: 'Dr. med. Jonas Krüger', date: '2026-10-01' },
      { kind: 'history', title: 'doc_history', issuer: 'Hausarztpraxis Dr. med. Jonas Krüger, Berlin', clinician: 'Dr. med. Jonas Krüger', date: '2026-01-15' },
    ],
  },
};
export const KIND_ICON = { rx: 'rx', lab: 'flask', history: 'file', upload: 'upload' };

/* ======================================================================= current facts */
/** Medical facts for a traveler, honouring onboarding edits. Edited or added
 *  items become free-text facts: they are never "corrected" back to a code. */
export function currentFacts(t) {
  const base = F[t.id];
  const src = TRAVELERS.find((x) => x.id === t.id);
  const ob = getOnboarding();
  const edited = ob && ob.travelerId === t.id ? ob.medical : null;
  const pick = (cat, fields) => {
    if (!edited || !edited[cat]) return base[cat];
    return edited[cat].map((item) => {
      const i = src[cat].findIndex((b) => b.name === item.name);
      const same = i >= 0 && fields.every((f) => (src[cat][i][f] ?? '') === (item[f] ?? ''));
      if (same) return base[cat][i];
      return { kind: { allergies: 'allergy', medications: 'med', conditions: 'condition', tests: 'test' }[cat], text: { name: item.name, detail: fields.slice(1).map((f) => item[f]).filter(Boolean).join(' · ') }, edited: true };
    });
  };
  return {
    allergies: pick('allergies', ['name', 'reaction', 'severity']),
    medications: pick('medications', ['name', 'dose', 'schedule']),
    conditions: pick('conditions', ['name', 'since']),
    tests: pick('tests', ['name', 'value']),
    blood: (ob && ob.travelerId === t.id && ob.blood) || base.blood,
    dob: base.dob, homeLang: base.homeLang, docs: base.docs,
  };
}

/* ======================================================================= document languages */
// Every document has its own original language. Nothing assumes the traveler's
// home language: built-in records carry the language they were issued in,
// uploads are detected from their text, and the patient can correct either.
const DOC_LANG_KEY = 'mp.doclang';
const readOverrides = () => { try { return JSON.parse(localStorage.getItem(DOC_LANG_KEY)) || {}; } catch { return {}; } };
export function setDocLang(recId, lang) {
  const o = readOverrides();
  if (lang) o[recId] = lang; else delete o[recId];
  try { localStorage.setItem(DOC_LANG_KEY, JSON.stringify(o)); } catch { /* storage blocked */ }
}

// Sample PDFs: where they were issued and the language they are written in.
export const SAMPLE_META = {
  medplan: { title: 'doc_medplan', lang: 'de', issuer: 'Hausarztpraxis Dr. med. Lena Hoffmann, Berlin', clinician: 'Dr. med. Lena Hoffmann', date: '2026-05-05' },
  summary: { title: 'doc_history', lang: 'fr', issuer: 'Cabinet médical Dr Claire Moreau, Paris', clinician: 'Dr Claire Moreau', date: '2025-08-14' },
  // rx / lab / history samples are issued in the traveler's home language (see buildRecords).
  rx: {}, lab: {}, history: {},
};
/** Stable id for an uploaded sample document, so shares can reference it on any device. */
export const sampleRecId = (kind) => `smp-${kind}`;
/** Recreate uploaded-sample records from share ids (used by the doctor portal on another device). */
export const sampleUploadsFromIds = (ids) => ids.filter((x) => x.startsWith('smp-'))
  .map((x) => ({ id: x, kind: x.slice(4), mine: true, lang: SAMPLE_META[x.slice(4)]?.lang, langConf: 'high', langSource: 'detected', name: x }));

/** Documents for a traveler: originals issued at home or abroad + uploads. */
export function buildRecords(t, uploads = []) {
  const f = currentFacts(t);
  const over = readOverrides();
  const factsFor = (kind) => (
    kind === 'rx' || kind === 'medplan' ? f.medications
      : kind === 'lab' ? f.tests
        : kind === 'summary' ? [...f.conditions, ...f.allergies, ...f.medications, { kind: 'blood', value: f.blood }]
          : [...f.conditions, ...f.allergies, { kind: 'blood', value: f.blood }]);
  const withLang = (rec, lang, info) => ({
    ...rec,
    origLang: over[rec.id] || lang,
    langInfo: over[rec.id] ? { source: 'manual', confidence: 'high', auto: lang } : info,
  });
  const recs = f.docs.map((d) => withLang({
    id: `${t.id}-${d.kind}`, ...d, source: 'home',
    facts: factsFor(d.kind), banner: d.kind === 'rx' ? f.allergies : [],
  }, f.homeLang, { source: 'record', confidence: 'high' }));
  const seen = new Set();
  uploads.forEach((u) => {
    if (u.kind && u.mine) {
      const id = sampleRecId(u.kind);
      if (seen.has(id)) return;
      seen.add(id);
      const meta = SAMPLE_META[u.kind] || {};
      const base = f.docs.find((x) => x.kind === u.kind) || { kind: u.kind === 'medplan' ? 'rx' : 'history', title: meta.title };
      recs.unshift(withLang({
        ...base, ...(meta.issuer ? { issuer: meta.issuer, clinician: meta.clinician, date: meta.date, title: meta.title } : {}),
        id, kind: base.kind, source: 'upload', upload: u, sampleKind: u.kind,
        facts: factsFor(u.kind), banner: ['rx', 'medplan'].includes(u.kind) ? f.allergies : [],
      }, u.lang || meta.lang || f.homeLang, { source: u.langSource || 'detected', confidence: u.langConf || 'medium' }));
    } else if (u.read) {
      // Read by the real pipeline (pdf.js / OCR → glossary or AI extraction), reviewed by the patient.
      recs.unshift(withLang({
        id: u.id, kind: 'upload', title: null, titleText: u.read.title || u.name, issuer: u.read.issuer || '', clinician: '', date: u.read.date || '',
        source: u.read.extraction === 'ai' ? 'ai' : 'read', upload: u, banner: [],
        facts: (u.read.items || []).map((x) => ({ kind: x.kind, code: x.code, text: { name: x.name, detail: x.detail || '' }, edited: x.edited })),
      }, u.lang || null, { source: u.langSource || (u.lang ? 'detected' : 'unknown'), confidence: u.langConf || 'medium' }));
    } else if (u.ai) {
      const tx = (x) => ({ name: String(x), detail: '' });
      recs.unshift(withLang({
        id: u.id, kind: 'upload', title: null, titleText: u.ai.title || u.name, issuer: u.ai.issuer || '', clinician: '', date: u.ai.date || '',
        source: 'ai', upload: u, banner: [],
        facts: [...(u.ai.allergies || []).map((x) => ({ kind: 'allergy', text: tx(x) })), ...(u.ai.medications || []).map((x) => ({ kind: 'med', text: tx(x) })),
          ...(u.ai.conditions || []).map((x) => ({ kind: 'condition', text: tx(x) })), ...(u.ai.tests || []).map((x) => ({ kind: 'test', text: tx(x) }))],
      }, (u.ai.lang || u.lang || 'en').split('-')[0], { source: 'ai', confidence: 'high' }));
    } else {
      recs.unshift(withLang({ id: u.id, kind: 'upload', title: null, titleText: u.name, issuer: '', clinician: '', date: '', source: 'stored', upload: u, facts: [], banner: [] },
        u.lang || null, { source: u.lang ? 'detected' : 'unknown', confidence: u.langConf || 'low' }));
    }
  });
  return recs;
}

/* ======================================================================= segments */
// A segment is { k, p } (glossary key + params) or { raw } (free text).
// resolve() → { text, src: 'gloss' | 'ai' | 'raw' | 'pending' }
export function resolve(seg, lang, origLang) {
  if (!seg) return null;
  if (seg.raw !== undefined) {
    if (!lang || lang === origLang) return { text: seg.raw, src: 'orig' };
    // Text matched to a glossary term: translate the term offline, never the rest.
    if (seg.k) { const g = term(seg.k, lang); if (g !== null) return { text: g, src: 'gloss' }; }
    const ai = aiCached(lang, seg.raw);
    return ai ? { text: ai, src: 'ai', unsure: aiUncertain(lang, seg.raw) } : { text: seg.raw, src: 'raw' };
  }
  const g = term(seg.k, lang, seg.p);
  if (g !== null) return { text: g, src: 'gloss' };
  const en = termEn(seg.k, seg.p);
  const ai = aiCached(lang, en);
  return ai ? { text: ai, src: 'ai', unsure: aiUncertain(lang, en) } : { text: en, src: 'pending' };
}

/** All English source strings a record needs (for live AI batching). */
export function sourceStrings(recs, lang) {
  const out = new Set();
  const visit = (seg) => {
    if (!seg || seg.lit !== undefined) return;
    if (seg.raw !== undefined) { if (seg.raw && !(seg.k && term(seg.k, lang) !== null)) out.add(seg.raw); return; }
    if (seg.k && term(seg.k, lang, seg.p) === null) out.add(termEn(seg.k, seg.p));
  };
  recs.forEach((r) => {
    visit(r.title ? { k: r.title } : null);
    r.facts.forEach((f) => factSegments(f, lang).forEach((row) => row.forEach(visit)));
  });
  ['allergies', 'medications', 'diagnoses', 'tests', 'blood', 'doctor_title', 'verify', 'results_ok', 'no_results', 'none_recorded', 'critical', 'key_result', 'in_range', 'in_target', 'not_recorded', 'reaction', 'severity', 'advice', 'dose', 'schedule', 'onset', 'note', 'result', 'reference', 'issued', 'issuer', 'patient', 'dob', 'original', 'show_original', 'records']
    .forEach((k) => visit({ k }));
  return [...out];
}

function fixed(n, d, lang) {
  // Keep clinically meaningful decimals ("7.0", "0.70") while localising the separator.
  const s = (+n).toFixed(d ?? 0);
  const comma = /^(es|fr|de|it|pt|ru)$/.test(lang);
  return comma ? s.replace('.', ',') : s;
}

/** Segments per display row: [labelSeg, valueSeg, subSeg?]. Numbers are pre-rendered raw-safe. */
function factSegments(f, lang) {
  if (f.text) return [[{ k: { allergy: 'allergy', med: 'medications', condition: 'diagnoses', test: 'result' }[f.kind] }, f.code ? { raw: f.text.name, k: f.code } : { raw: f.text.name }, f.text.detail ? { raw: f.text.detail } : null]];
  if (f.kind === 'allergy') {
    return [
      [{ k: 'allergy' }, { k: f.name }],
      [{ k: 'severity' }, { k: f.severity }],
      [{ k: 'reaction' }, f.year ? { k: f.reaction, suffix: ` (${f.year})` } : { k: f.reaction }],
      [{ k: 'advice' }, f.advice ? { k: f.advice } : { k: 'not_recorded' }],
    ];
  }
  if (f.kind === 'med') {
    const dose = f.dose.code ? { k: f.dose.code } : f.dose.unit.startsWith('u_') ? { k: f.dose.unit, prefix: `${fixed(f.dose.n, f.dose.d, lang)} ` } : { lit: `${fixed(f.dose.n, f.dose.d, lang)} ${f.dose.unit}` };
    return [[{ k: f.name }, dose, { k: f.schedule }]];
  }
  if (f.kind === 'condition') {
    const since = f.since?.code ? { k: f.since.code } : f.since?.y ? { k: 'since_year', p: { y: f.since.y } } : { k: 'not_recorded' };
    return [[{ k: f.name }, since, f.note ? { k: f.note } : null]];
  }
  if (f.kind === 'test') {
    const v = f.value.pct !== undefined ? { k: 'pct_predicted', p: { n: f.value.pct } } : { lit: `${fixed(f.value.n, f.value.d, lang)}${f.value.unit ? ` ${f.value.unit}` : ''}` };
    const r = f.ref.target ? { k: 'target', p: { x: `${f.ref.target.op} ${fixed(f.ref.target.n, f.ref.target.d, lang)}` } }
      : f.ref.range ? { lit: `${fixed(f.ref.range[0], f.ref.d, lang)} – ${fixed(f.ref.range[1], f.ref.d, lang)}` }
      : { lit: `${f.ref.op} ${fixed(f.ref.n, f.ref.d, lang)}${f.ref.unit ? ` ${f.ref.unit}` : ''}` };
    return [[{ k: f.name }, v, r]];
  }
  if (f.kind === 'blood') return [[{ k: 'blood' }, { lit: f.value }]];
  return [];
}

/* ======================================================================= render helpers */
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function seg(s, lang, origLang) {
  if (!s) return '';
  if (s.lit !== undefined) return `<bdi>${esc(s.lit)}</bdi>`;
  const r = resolve(s.k && s.raw === undefined ? { k: s.k, p: s.p } : s, lang, origLang);
  const text = `${s.prefix ? s.prefix : ''}${r.text}${s.suffix || ''}`;
  if (r.src === 'raw') return `<span class="seg seg--raw" lang="und" title="${esc(term('not_translated', lang) || 'Not translated · shown as written')}">${esc(text)}<i class="seg__flag" aria-hidden="true">${icon('alert')}</i></span>`;
  if (r.src === 'pending') return `<span class="seg seg--pending" lang="en">${esc(text)}</span>`;
  if (r.src === 'ai' && r.unsure) return `<span class="seg seg--ai seg--unsure" title="Verify: ${esc(r.unsure)}">${esc(text)}<i class="seg__flag seg__flag--unsure" aria-label="Uncertain translation, verify">${icon('eye')}</i></span>`;
  if (r.src === 'ai') return `<span class="seg seg--ai">${esc(text)}</span>`;
  return esc(text);
}
const L = (k, lang) => {
  const r = resolve({ k }, lang);
  return r.src === 'pending' ? `<span class="seg--pending" lang="en">${esc(r.text)}</span>` : esc(r.text);
};

export function fmtDate(iso, lang) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(+d)) return esc(iso);
  try {
    return new Intl.DateTimeFormat(`${lang === 'zh' ? 'zh-Hans' : lang}-u-ca-gregory-nu-latn`, { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
  } catch { return iso; }
}

const KIND_CLS = { allergy: 'hl-allergy', med: 'hl-med', condition: 'hl-dx', test: 'hl-test', blood: 'hl-blood' };

function factHtml(f, lang, origLang) {
  const rows = factSegments(f, lang);
  const cls = KIND_CLS[f.kind] || '';
  if (f.kind === 'allergy' && !f.text) {
    const [name, sev, react, adv] = rows;
    return `<div class="fact ${cls} ${f.critical ? 'is-critical' : ''}">
      <span class="fact__ic">${icon('alert')}</span>
      <div class="fact__body">
        <div class="fact__top"><b class="fact__name">${seg(name[1], lang, origLang)}</b><span class="fact__chip fact__chip--${f.severity}">${seg(sev[1], lang, origLang)}</span></div>
        <dl class="fact__dl"><div><dt>${L('reaction', lang)}</dt><dd>${seg(react[1], lang, origLang)}</dd></div><div><dt>${L('advice', lang)}</dt><dd>${seg(adv[1], lang, origLang)}</dd></div></dl>
      </div>
    </div>`;
  }
  const [a, b, c] = rows[0];
  const ic = { allergy: 'alert', med: 'rx', condition: 'heart', test: 'flask', blood: 'drop' }[f.kind];
  const chip = f.kind === 'test' && f.status ? `<span class="fact__chip fact__chip--ok">${L(f.status, lang)}</span>` : '';
  const key = f.key ? `<span class="fact__key">${L('key_result', lang)}</span>` : '';
  const edited = f.edited ? `<span class="fact__edited">${icon('user')} ${esc(term('not_translated', lang) && lang !== origLang ? term('not_translated', lang) : 'Added or corrected by you')}</span>` : '';
  if (f.kind === 'blood') return `<div class="fact ${cls}"><span class="fact__ic">${icon(ic)}</span><div class="fact__body"><div class="fact__top"><span class="fact__label">${seg(a, lang, origLang)}</span><b class="fact__big">${seg(b, lang, origLang)}</b></div></div></div>`;
  const labels = { med: ['dose', 'schedule'], condition: ['onset', 'note'], test: ['result', 'reference'] }[f.kind] || ['note', 'note'];
  return `<div class="fact ${cls} ${f.key ? 'is-key' : ''} ${f.edited ? 'is-edited' : ''}">
    <span class="fact__ic">${icon(ic)}</span>
    <div class="fact__body">
      <div class="fact__top"><b class="fact__name">${seg(f.text ? b : a, lang, origLang)}</b>${chip}${key}</div>
      ${f.text ? (c ? `<p class="fact__free">${seg(c, lang, origLang)}</p>` : '') : `<dl class="fact__dl">
        <div><dt>${L(labels[0], lang)}</dt><dd>${seg(b, lang, origLang)}</dd></div>
        ${c ? `<div><dt>${L(labels[1], lang)}</dt><dd>${seg(c, lang, origLang)}</dd></div>` : ''}
      </dl>`}
      ${edited}
    </div>
  </div>`;
}

/** One layered medical card for a record in a given language. */
export function recordCard(rec, t, lang, { variant = 'translation', engine = 'sim' } = {}) {
  const dir = isRtl(lang) ? 'rtl' : 'ltr';
  const f = currentFacts(t);
  const title = rec.title ? L(rec.title, lang) : esc(rec.titleText);
  const groups = [
    ['allergies', rec.facts.filter((x) => x.kind === 'allergy')],
    ['diagnoses', rec.facts.filter((x) => x.kind === 'condition')],
    ['medications', rec.facts.filter((x) => x.kind === 'med')],
    ['tests', rec.facts.filter((x) => x.kind === 'test')],
    ['blood', rec.facts.filter((x) => x.kind === 'blood')],
  ].filter(([, list]) => list.length);
  const isOrig = variant === 'original';
  const pending = !isOrig && sourceStrings([rec], lang).some((x) => !aiCached(lang, x));
  const badge = isOrig ? `<span class="rbadge rbadge--orig">${icon('file')} ${L('original', lang)} · ${esc(langInfo(lang).native)}</span>`
    : pending && !SIM.includes(lang) ? `<span class="rbadge rbadge--pending" lang="en">${icon('clock')} Not translated yet</span>`
    : engine === 'ai' ? `<span class="rbadge rbadge--ai" lang="en">${icon('sparkle')} ${esc(providerName())} · AI</span>`
    : `<span class="rbadge rbadge--sim">${icon('sparkle')} ${L('simulated', lang)}</span>`;
  return `<article class="rcard rcard--${rec.kind} ${isOrig ? 'rcard--orig' : ''}" lang="${lang}" dir="${dir}">
    <header class="rcard__head">
      <span class="rcard__ic">${icon(KIND_ICON[rec.kind] || 'file')}</span>
      <div class="rcard__titles">
        <h3 class="rcard__title">${title}</h3>
        <p class="rcard__issuer"><bdi>${esc(rec.issuer)}</bdi>${rec.date ? ` · <bdi>${fmtDate(rec.date, lang)}</bdi>` : ''}</p>
      </div>
      ${badge}
    </header>
    <div class="rcard__patient">
      <div><span>${L('patient', lang)}</span><b><bdi>${esc(t.first)} ${esc(t.last)}</bdi></b></div>
      <div><span>${L('dob', lang)}</span><b><bdi>${fmtDate(f.dob, lang)}</bdi></b></div>
      ${rec.clinician ? `<div><span>${L('issuer', lang)}</span><b><bdi>${esc(rec.clinician)}</bdi></b></div>` : ''}
    </div>
    ${rec.banner?.length ? `<div class="rcard__banner">${icon('alert')} <span>${L('allergies', lang)}: ${rec.banner.map((a) => seg(a.text ? { raw: a.text.name } : { k: a.name }, lang, rec.origLang)).join(', ')}</span></div>` : ''}
    <div class="rcard__groups">
      ${groups.map(([k, list]) => `<section class="rgroup rgroup--${k}"><h4>${L(k, lang)}</h4>${list.map((x) => factHtml(x, lang, rec.origLang)).join('')}</section>`).join('')}
      ${groups.length ? '' : `<p class="rcard__empty">${L('not_recorded', lang)}</p>`}
    </div>
  </article>`;
}

/* ======================================================================= summary */
/** Structured summary compiled only from recorded facts. */
export function summaryCard(t, lang, { engine = 'sim', narrative = null, sections = null } = {}) {
  // sections: null = everything; otherwise only these keys are rendered at all.
  const show = (k) => !sections || sections.includes(k);
  const f = currentFacts(t);
  const dir = isRtl(lang) ? 'rtl' : 'ltr';
  const o = f.homeLang;
  const allergyChips = f.allergies.map((a) => (a.text
    ? `<span class="schip schip--allergy">${seg({ raw: a.text.name }, lang, 'en')}</span>`
    : `<span class="schip schip--allergy ${a.critical ? 'is-critical' : ''}">${icon('alert')}${seg({ k: a.name }, lang, o)} <small>${seg({ k: a.reaction }, lang, o)}</small></span>`)).join('');
  const list = (arr, render) => (arr.length ? arr.map(render).join('') : `<span class="schip schip--none">${L('none_recorded', lang)}</span>`);
  const keyTests = f.tests.filter((x) => x.key || x.text);
  const allOk = f.tests.length && f.tests.every((x) => x.text || x.status === 'in_range' || x.status === 'in_target');
  return `<article class="scard" lang="${lang}" dir="${dir}">
    <header class="scard__head">
      <div><span class="scard__eyebrow">${engine === 'ai' && narrative ? `${icon('sparkle')} AI-generated · Claude` : `${icon('sparkle')} Compiled from records · no AI`}</span>
      <h3 class="scard__title">${L('doctor_title', lang)}</h3></div>
      <span class="scard__blood"><small>${L('blood', lang)}</small><b><bdi>${esc(f.blood)}</bdi></b></span>
    </header>
    ${narrative ? `<p class="scard__narr">${esc(narrative)}</p>` : ''}
    <section class="ssec ssec--allergy"><h4>${icon('alert')} ${L('allergies', lang)} <em>${L('critical', lang)}</em></h4><div class="schips">${f.allergies.length ? allergyChips : `<span class="schip schip--none">${L('none_recorded', lang)}</span>`}</div></section>
    ${show('conditions') ? `<section class="ssec ssec--dx"><h4>${icon('heart')} ${L('diagnoses', lang)}</h4><div class="schips">${list(f.conditions, (c) => `<span class="schip schip--dx">${c.text ? seg({ raw: c.text.name }, lang, 'en') : seg({ k: c.name }, lang, o)}</span>`)}</div></section>` : ''}
    ${show('medications') ? `<section class="ssec ssec--med"><h4>${icon('rx')} ${L('medications', lang)}</h4><div class="schips">${list(f.medications, (m) => `<span class="schip schip--med">${m.text ? seg({ raw: m.text.name }, lang, 'en') : `${seg({ k: m.name }, lang, o)} <small>${m.dose.code ? seg({ k: m.dose.code }, lang, o) : m.dose.unit.startsWith('u_') ? `${fixed(m.dose.n, m.dose.d, lang)} ${seg({ k: m.dose.unit }, lang, o)}` : `<bdi>${fixed(m.dose.n, m.dose.d, lang)} ${m.dose.unit}</bdi>`}</small>`}</span>`)}</div></section>` : ''}
    ${show('tests') ? `<section class="ssec ssec--test"><h4>${icon('flask')} ${L('tests', lang)}</h4>
      <div class="schips">${keyTests.map((x) => `<span class="schip schip--test">${x.text ? seg({ raw: x.text.name }, lang, 'en') : `${seg({ k: x.name }, lang, o)} <small>${factSegments(x, lang)[0][1].lit ? `<bdi>${esc(factSegments(x, lang)[0][1].lit)}</bdi>` : seg(factSegments(x, lang)[0][1], lang, o)}</small>`}</span>`).join('')}</div>
      <p class="ssec__line">${f.tests.length ? (allOk ? L('results_ok', lang) : '') : L('no_results', lang)}</p>
    </section>` : ''}
    <p class="verify">${icon('eye')} <span>${L('verify', lang)}</span></p>
  </article>`;
}

/** Short critical lines for responders (emergency sheet). */
export function criticalLines(t, lang) {
  const f = currentFacts(t);
  const o = f.homeLang;
  return {
    allergies: f.allergies.map((a) => (a.text ? seg({ raw: a.text.name }, lang, 'en') : `${seg({ k: a.name }, lang, o)}: ${seg({ k: a.reaction }, lang, o)}`)),
    conditions: f.conditions.map((c) => (c.text ? seg({ raw: c.text.name }, lang, 'en') : seg({ k: c.name }, lang, o))),
    blood: f.blood,
    labels: { allergies: L('allergies', lang), diagnoses: L('diagnoses', lang), blood: L('blood', lang), verify: L('verify', lang) },
  };
}

export const simLangs = () => SIM;
