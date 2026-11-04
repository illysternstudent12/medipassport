// Document language detection (offline).
//
// 1. Writing system first: Hebrew, Arabic, Japanese (kana), Chinese (Han only),
//    Korean, Cyrillic (Ukrainian vs Russian), Greek, Thai, Devanagari.
// 2. Latin-script languages by frequent words + characteristic letters.
// Returns { lang, confidence: 'high'|'medium'|'low', method } or lang null.
// The result is always shown to the user with a "Change" option.

const SCRIPTS = [
  ['he', /[֐-׿]/g], ['ar', /[؀-ۿ]/g], ['ja', /[぀-ヿ]/g],
  ['ko', /[가-힯]/g], ['zh', /[一-鿿]/g], ['ru', /[Ѐ-ӿ]/g],
  ['el', /[Ͱ-Ͽ]/g], ['th', /[฀-๿]/g], ['hi', /[ऀ-ॿ]/g],
];
const WORDS = {
  en: 'the and of to in for with is on not be daily once twice every before after as needed patient date birth allergy medication results reference issued signature',
  de: 'der die das und mit für bei von nicht ist ein eine täglich morgens abends bedarf einnahme hinweis ausgestellt geburtsdatum unterschrift diagnose seit nur im notfall',
  fr: 'le la les et des du de un une pour avec par est pas sous depuis chaque matin jour fois traitement date naissance allergie dose posologie remarque',
  es: 'el la los las y de del con para por una un es no cada día veces mañana noche fecha nacimiento alergia dosis tratamiento',
  it: 'il lo la gli le e di del della con per una un è non ogni giorno volte mattina sera data nascita allergia dose terapia',
  pt: 'o a os as e de do da dos com para por uma um é não cada dia vezes manhã noite data nascimento alergia dose tratamento',
  nl: 'de het een en van met voor bij niet is per dag keer ochtend avond datum geboorte allergie dosis',
  pl: 'i w z na do dla się nie jest dziennie raz rano wieczorem data urodzenia alergia dawka',
  tr: 've ile için bir bu günde kez sabah akşam tarih doğum alerji doz',
};
const LETTERS = {
  de: /[äöüß]/g, fr: /[éèêàçœù]/g, es: /[ñ¿¡]/g, pt: /[ãõ]/g, pl: /[łąęśźżń]/g, tr: /[ğışİ]/g, it: /[ìò]/g,
};

export function detectLanguage(text) {
  const t = String(text || '').trim();
  if (t.length < 12) return { lang: null, confidence: 'low', method: 'too-short' };

  // 1) Writing systems
  const counts = SCRIPTS.map(([lang, re]) => [lang, (t.match(re) || []).length]);
  const kana = counts.find(([l]) => l === 'ja')[1];
  const han = counts.find(([l]) => l === 'zh')[1];
  if (kana) counts.find(([l]) => l === 'ja')[1] += han; // Japanese mixes kanji with kana
  counts.sort((a, b) => b[1] - a[1]);
  const letters = (t.match(/\p{L}/gu) || []).length || 1;
  const [top, n] = counts[0];
  if (n / letters > 0.25) {
    let lang = top;
    if (lang === 'zh' && kana) lang = 'ja';
    if (lang === 'ru' && /[іїєґ]/i.test(t)) lang = 'uk';
    return { lang, confidence: n / letters > 0.5 ? 'high' : 'medium', method: 'script' };
  }

  // 2) Latin script: frequent words + characteristic letters
  const tokens = t.toLowerCase().normalize('NFC').match(/\p{L}+/gu) || [];
  const scores = Object.fromEntries(Object.keys(WORDS).map((l) => [l, 0]));
  Object.entries(WORDS).forEach(([l, list]) => {
    const set = new Set(list.split(' '));
    tokens.forEach((w) => { if (set.has(w)) scores[l] += 1; });
  });
  Object.entries(LETTERS).forEach(([l, re]) => { scores[l] += ((t.match(re) || []).length) * 0.6; });
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [[best, s1], [, s2]] = ranked;
  if (s1 < 2) return { lang: null, confidence: 'low', method: 'words', scores };
  const ratio = s1 / Math.max(1, s2);
  return { lang: best, confidence: s1 >= 8 && ratio >= 2 ? 'high' : ratio >= 1.4 ? 'medium' : 'low', method: 'words', scores };
}

/** Text from PDFs with uncompressed text (our samples and many simple PDFs). */
export async function pdfText(file) {
  const buf = await file.arrayBuffer();
  const raw = new TextDecoder('windows-1252').decode(buf);
  const parts = [];
  const re = /\(((?:\\.|[^\\)])*)\)\s*Tj/g;
  let m;
  while ((m = re.exec(raw))) parts.push(m[1].replace(/\\([()\\])/g, '$1'));
  return parts.join(' ');
}

/** Detect the language of an uploaded file, offline. Images can't be read without OCR. */
export async function detectFileLanguage(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf) return { lang: null, confidence: 'low', method: 'image' };
  try {
    const text = await pdfText(file);
    if (!text.trim()) return { lang: null, confidence: 'low', method: 'no-text' };
    return detectLanguage(text);
  } catch {
    return { lang: null, confidence: 'low', method: 'error' };
  }
}
