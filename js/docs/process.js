// Real document processing, in the browser (nothing leaves the device here):
//   PDF  → pdf.js text layer (any PDF, compressed or not)
//        → if there's no text layer (a scan): render pages → Tesseract OCR
//   Image → Tesseract OCR
//   → language detection → extraction:
//        · AI extraction (Claude via the backend), when configured
//        · otherwise an offline glossary matcher: recognises known allergens,
//          medicines, diagnoses and tests in 12 languages and copies the rest
//          of the line verbatim. It never fills in anything that isn't written.
// The patient reviews and corrects every item before it is saved.
import { detectLanguage } from '../translate/detect.js';
import { termVariants } from '../translate/glossary.js';
import { extractOn, extractWithAi } from '../translate/ai.js';

const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
const TESSERACT = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

// ISO 639-1 → Tesseract traineddata
export const TESS = { en: 'eng', de: 'deu', fr: 'fra', es: 'spa', it: 'ita', pt: 'por', nl: 'nld', pl: 'pol', tr: 'tur', ru: 'rus',
  uk: 'ukr', el: 'ell', he: 'heb', ar: 'ara', fa: 'fas', ja: 'jpn', zh: 'chi_sim', 'zh-Hant': 'chi_tra', ko: 'kor', hi: 'hin', th: 'tha',
  vi: 'vie', id: 'ind', sv: 'swe', da: 'dan', nb: 'nor', fi: 'fin', cs: 'ces', hu: 'hun', ro: 'ron', bg: 'bul', hr: 'hrv' };

const loadScript = (src, global) => (window[global] ? Promise.resolve(window[global]) : new Promise((res, rej) => {
  const s = document.createElement('script');
  s.src = src;
  s.onload = () => (window[global] ? res(window[global]) : rej(new Error(`${global} failed to load`)));
  s.onerror = () => rej(new Error(`Couldn't load ${global}. Check your connection.`));
  document.head.appendChild(s);
}));

/* ---------------------------------------------------------------- PDF */
async function pdfjs() {
  const lib = await loadScript(PDFJS, 'pdfjsLib');
  lib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
  return lib;
}
/** Text layer of every page, grouped into lines by position. */
export async function pdfText(file) {
  const lib = await pdfjs();
  const pdf = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let n = 1; n <= Math.min(pdf.numPages, 20); n++) {
    const page = await pdf.getPage(n);
    const tc = await page.getTextContent();
    const rows = new Map();
    tc.items.forEach((it) => {
      if (!it.str?.trim()) return;
      const y = Math.round(it.transform[5] / 3) * 3;
      if (!rows.has(y)) rows.set(y, []);
      rows.get(y).push({ x: it.transform[4], s: it.str });
    });
    const lines = [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([, r]) => r.sort((a, b) => a.x - b.x).map((x) => x.s).join('  ').replace(/\s{3,}/g, '  ').trim());
    pages.push(lines.join('\n'));
  }
  return { text: pages.join('\n\n'), pages: pdf.numPages, pdf };
}
async function pdfToCanvases(pdf, max = 3) {
  const out = [];
  for (let n = 1; n <= Math.min(pdf.numPages, max); n++) {
    const page = await pdf.getPage(n);
    const vp = page.getViewport({ scale: 2 });
    const c = document.createElement('canvas');
    c.width = vp.width; c.height = vp.height;
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    out.push(c);
  }
  return out;
}

/* ---------------------------------------------------------------- OCR */
const workers = new Map();
async function ocrWorker(langs, onProgress) {
  const key = langs.join('+');
  if (!workers.has(key)) {
    const T = await loadScript(TESSERACT, 'Tesseract');
    workers.set(key, T.createWorker(langs, 1, { logger: (m) => { if (m.status && typeof m.progress === 'number') onProgress?.(m.status, m.progress); } }));
  }
  return workers.get(key);
}
async function ocr(images, langs, onProgress) {
  const w = await ocrWorker(langs, onProgress);
  const parts = [];
  for (const img of images) {
    const { data } = await w.recognize(img);
    parts.push(data.text);
  }
  return parts.join('\n\n');
}

/* ---------------------------------------------------------------- pipeline */
/**
 * Read a file and return its text, language and how it was read.
 * @param {File} file
 * @param {{ hint?: string, onProgress?: (label: string, pct?: number) => void }} o
 */
export async function readDocument(file, { hint, onProgress } = {}) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  const isImg = /^image\//.test(file.type);
  if (!isPdf && !isImg) throw new Error('Use a PDF or an image (JPEG, PNG, WebP).');
  let text = '', method = '', ocrLangs = null, images = null;
  if (isPdf) {
    onProgress?.('Reading PDF text');
    const r = await pdfText(file);
    text = r.text;
    method = 'pdf-text';
    if (text.replace(/\s/g, '').length < 40) {
      onProgress?.('No text layer: preparing OCR');
      images = await pdfToCanvases(r.pdf);
    }
  } else {
    images = [file];
  }
  if (images) {
    // First pass in the hinted language (+ English), then re-run in the detected language if different.
    const first = [...new Set([TESS[hint] || 'eng', 'eng'])];
    ocrLangs = first;
    const label = (l) => `OCR (${l.join(' + ')})`;
    text = await ocr(images, first, (s, p) => onProgress?.(s === 'recognizing text' ? label(first) : `Loading OCR · ${s}`, p));
    method = 'ocr';
    const det = detectLanguage(text);
    if (det.lang && TESS[det.lang] && !first.includes(TESS[det.lang])) {
      ocrLangs = [TESS[det.lang], 'eng'];
      text = await ocr(images, ocrLangs, (s, p) => onProgress?.(s === 'recognizing text' ? label(ocrLangs) : `Loading OCR · ${s}`, p));
    }
  }
  const det = detectLanguage(text);
  return { text, method, ocrLangs, lang: det.lang, langConf: det.confidence };
}

/* ---------------------------------------------------------------- extraction */
const CATS = {
  allergy: ['penicillin', 'peanuts', 'sulfonamides', 'latex'],
  med: ['insulin_glargine', 'insulin_aspart', 'budesonide_formoterol', 'salbutamol', 'adrenaline_ai', 'levothyroxine', 'amlodipine'],
  condition: ['t1d', 'asthma', 'hypertension', 'hypothyroidism'],
  test: ['fev1_fvc', 'hba1c', 'creatinine', 'fev1', 'tsh', 'potassium'],
};
const norm = (s) => s.toLowerCase().normalize('NFKC').replace(/[‐-―]/g, '-');
/** Searchable forms of a term: the full text, and the parts outside/inside brackets. */
function forms(key) {
  const out = new Set();
  termVariants(key).forEach((v) => {
    const n = norm(v);
    out.add(n);
    const [a, b] = n.split(/[((]/);
    if (a?.trim().length >= 3) out.add(a.trim());
    if (b) { const inner = b.replace(/[))]/g, '').trim(); if (inner.length >= 3) out.add(inner); }
  });
  return [...out].filter((f) => f.length >= 3);
}
const FORMS = Object.fromEntries(Object.values(CATS).flat().map((k) => [k, forms(k)]));
const VALUE = /(\d+(?:[.,]\d+)?)\s*(%|mg\/dl|mmol\/l|miu\/l|µg|mcg|mg|ml|units?|einheiten|unités|单位|単位)?/i;

/** Offline: recognise glossary terms; copy the rest of the line verbatim. */
export function extractWithGlossary(text) {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const found = new Map();
  lines.forEach((line) => {
    const n = norm(line);
    for (const [kind, keys] of Object.entries(CATS)) {
      for (const key of keys) {
        if (found.has(key)) continue;
        const hit = FORMS[key].find((f) => n.includes(f));
        if (!hit) continue;
        if (key === 'fev1' && FORMS.fev1_fvc.some((f) => n.includes(f))) continue;
        const i = n.indexOf(hit);
        let detail = (line.slice(0, i) + '  ' + line.slice(i + hit.length)).replace(/\s{2,}/g, ' · ').replace(/^[\s:·,–-]+|[\s:·,–-]+$/g, '');
        if (kind === 'test') { const m = line.slice(i + hit.length).match(VALUE); detail = m ? m[0].trim() : detail; }
        if (kind === 'allergy') detail = detail.replace(/^(allerg\w*|alergi\w*|аллерг\w*|アレルギー|过敏|알레르기|אלרגי\S*|حساسية)\s*[:·]?\s*/i, '');
        detail = detail.replace(/^[\s:·,–-]+|[\s:·,–-]+$/g, '').replace(/(\s·\s)+[-–:]\s/g, ' · ');
        found.set(key, { kind, code: key, name: line.substr(i, hit.length), detail: detail.slice(0, 160), line });
      }
    }
  });
  return [...found.values()];
}

/** Turn AI output (verbatim strings) into review items. */
const fromAi = (r) => [
  ...(r.allergies || []).map((s) => ({ kind: 'allergy', name: s, detail: '' })),
  ...(r.medications || []).map((s) => ({ kind: 'med', name: s, detail: '' })),
  ...(r.conditions || []).map((s) => ({ kind: 'condition', name: s, detail: '' })),
  ...(r.tests || []).map((s) => ({ kind: 'test', name: s, detail: '' })),
];

/**
 * Full pipeline: read → detect → extract. Returns items for patient review.
 * Never throws for "nothing found"; returns an empty item list instead.
 */
export async function processDocument(file, opts = {}) {
  const read = await readDocument(file, opts);
  let items = [], extraction = 'glossary', title = '', note = '';
  if (extractOn() && read.text.trim().length >= 20) {
    try {
      opts.onProgress?.('AI extraction (Claude)');
      const r = await extractWithAi(read.text, file.name);
      items = fromAi(r); extraction = 'ai'; title = r.title || '';
      if (r.lang && !read.lang) read.lang = r.lang.split('-')[0];
    } catch (e) {
      note = `AI extraction unavailable (${e.message}). Used the offline glossary instead.`;
    }
  }
  if (extraction !== 'ai') items = extractWithGlossary(read.text);
  return { ...read, items, extraction, title, note };
}
