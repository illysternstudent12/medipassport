// Optional live AI engine (Claude). Off by default.
//
// The app has no backend, so live mode calls the Anthropic API straight from
// the browser with the user's own key, stored only in this browser's
// localStorage. This is meant for demos and local testing; a production
// build would route requests through a server that holds the key.
//
// The SDK is loaded on demand from a CDN, only after live mode is turned on.

const MODEL = 'claude-opus-5-5';
const SDK_URL = 'https://esm.sh/@anthropic-ai/sdk';
const SETTINGS_KEY = 'mp.ai';
const CACHE_KEY = 'mp.ai.cache';

/* ---------------------------------------------------------------- settings */
export function aiSettings() {
  try { return { enabled: false, key: '', ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) }; } catch { return { enabled: false, key: '' }; }
}
export function saveAiSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
  client = null;
}
export const aiOn = () => { const s = aiSettings(); return !!(s.enabled && s.key); };

/* ---------------------------------------------------------------- cache */
let cache = null;
const loadCache = () => {
  if (!cache) { try { cache = JSON.parse(localStorage.getItem(CACHE_KEY)) || {}; } catch { cache = {}; } }
  return cache;
};
const persist = () => { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch { /* quota */ } };
// Cache entries are { t: translation, u: uncertain, r: reason } (older entries are plain strings).
export function aiCached(lang, text) {
  if (!aiOn()) return null;
  const v = loadCache()[lang]?.[text];
  return v == null ? null : typeof v === 'string' ? v : v.t;
}
/** Why live AI flagged a translation as uncertain, or null if it didn't. */
export function aiUncertain(lang, text) {
  if (!aiOn()) return null;
  const v = loadCache()[lang]?.[text];
  return v && typeof v === 'object' && v.u ? (v.r || 'Uncertain translation') : null;
}
export function clearAiCache() { cache = {}; persist(); }

/* ---------------------------------------------------------------- client */
let client = null;
async function getClient() {
  const s = aiSettings();
  if (!s.enabled || !s.key) throw new Error('Live AI is off.');
  if (!client) {
    const { default: Anthropic } = await import(SDK_URL);
    client = new Anthropic({ apiKey: s.key, dangerouslyAllowBrowser: true });
  }
  return client;
}

/** One structured-output request. Returns parsed JSON or throws a readable error. */
async function ask({ system, content, schema, effort = 'medium' }) {
  const c = await getClient();
  let res;
  try {
    res = await c.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort, format: { type: 'json_schema', schema } },
      system,
    messages: [{ role: 'user', content }],
    });
  } catch (err) {
    const status = err?.status;
    if (status === 401) throw new Error('Live AI: your API key was rejected (401).');
    if (status === 429) throw new Error('Live AI is rate-limited right now (429). Try again shortly.');
    if (status === 413) throw new Error('Live AI: that file is too large to send.');
    if (status >= 500) throw new Error(`Live AI: the service had a problem (${status}). Try again.`);
    if (!status) throw new Error('Live AI: could not reach the service. Check your connection.');
    throw new Error(`Live AI request failed (${status}).`);
  }
  if (res.stop_reason === 'refusal') throw new Error('The model declined this request.');
  if (res.stop_reason === 'max_tokens') throw new Error('The response was cut off. Try fewer documents at once.');
  const text = res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try { return JSON.parse(text); } catch { throw new Error('The model returned an unreadable response.'); }
}

const RULES = `You work inside a medical passport app used by travelers and the doctors treating them abroad.
Hard rules:
- Never add, infer, complete or "correct" medical facts. Translate or copy only what is given.
- Keep drug names, doses, units, numbers, dates and reference ranges exactly as given (localise only the decimal separator if the target language requires it).
- Use standard clinical terminology a physician in the target language would expect.
- If something is unclear or illegible, leave it out rather than guessing.
- Source text may be in any language; detect it yourself. Never assume a source language.`;

/* ---------------------------------------------------------------- translate */
/** Translate a batch of English or source-language strings into `lang`. Results are cached. */
export async function translateStrings(lang, langName, strings) {
  const c = loadCache();
  c[lang] = c[lang] || {};
  const todo = strings.filter((s) => s && c[lang][s] === undefined);
  if (!todo.length) return 0;
  const out = await ask({
    system: `${RULES}\nTranslate each string into ${langName} (${lang}). Return one item per input string, in the same order.
Set "uncertain" to true when the translation might not be exact: an ambiguous term, a brand or abbreviation you can't expand with certainty, a dose or unit with no clear equivalent, or wording a clinician should double-check. Give a short English reason. Otherwise uncertain is false and reason is empty.`,
    content: JSON.stringify({ target_language: langName, strings: todo }),
    schema: {
      type: 'object',
      properties: {
        translations: {
          type: 'array',
          items: {
            type: 'object',
            properties: { text: { type: 'string' }, uncertain: { type: 'boolean' }, reason: { type: 'string' } },
            required: ['text', 'uncertain', 'reason'],
            additionalProperties: false,
          },
        },
      },
      required: ['translations'],
      additionalProperties: false,
    },
  });
  if (!Array.isArray(out.translations) || out.translations.length !== todo.length) {
    throw new Error('Translation came back incomplete. Nothing was saved.');
  }
  todo.forEach((s, i) => { const x = out.translations[i]; c[lang][s] = { t: x.text, u: !!x.uncertain, r: x.reason || '' }; });
  persist();
  return todo.length;
}

/* ---------------------------------------------------------------- summary */
/** Two-to-three sentence clinical summary, written only from the facts given. */
export async function summarize(lang, langName, factsJson) {
  const key = `__summary__${JSON.stringify(factsJson)}`;
  const c = loadCache();
  c[lang] = c[lang] || {};
  if (c[lang][key]) return c[lang][key];
  const out = await ask({
    system: `${RULES}\nWrite a 2-3 sentence handover summary in ${langName} for a treating doctor. Lead with allergies. Mention only facts present in the input; if a category is empty, say it is not recorded.`,
    content: JSON.stringify(factsJson),
    schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
  });
  c[lang][key] = out.summary;
  persist();
  return out.summary;
}

/* ---------------------------------------------------------------- extract */
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const toBase64 = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(String(r.result).split(',')[1]);
  r.onerror = () => reject(new Error('Could not read the file.'));
  r.readAsDataURL(file);
});

/** Read an uploaded PDF or image and pull out medical facts, verbatim. */
export async function extractDocument(file) {
  const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
  if (!isPdf && !IMAGE_TYPES.includes(file.type)) throw new Error('Live AI can read PDF, JPEG, PNG, GIF or WebP files.');
  const data = await toBase64(file);
  const block = isPdf
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
    : { type: 'image', source: { type: 'base64', media_type: file.type, data } };
  const list = { type: 'array', items: { type: 'string' } };
  return ask({
    system: `${RULES}\nExtract medical information from the attached document. Copy each item in the document's own language and wording, one item per string (for example "Penicillin: anaphylaxis" or "Amlodipine 5 mg once daily"). If the document is not a medical record, return empty lists.`,
    content: [block, { type: 'text', text: 'Extract the allergies, medications, conditions/diagnoses and test results from this document.' }],
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string' }, issuer: { type: 'string' },
        date: { type: 'string', description: 'ISO date (YYYY-MM-DD) if printed, else empty' },
        lang: { type: 'string', description: 'BCP 47 code of the document language' },
        allergies: list, medications: list, conditions: list, tests: list,
      },
      required: ['title', 'issuer', 'date', 'lang', 'allergies', 'medications', 'conditions', 'tests'],
      additionalProperties: false,
    },
  });
}
