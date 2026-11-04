// MediPassport Edge Function: translate
// POST { target: "ja", strings: ["…"], source?: "de" }  →  { provider, detected, translations: [{ text, uncertain, reason }] }
// POST { health: true }                                 →  { ok, provider }
//
// Provider = the first secret that is set (Supabase → Edge Functions → Secrets):
//   GOOGLE_TRANSLATE_API_KEY  Google Cloud Translation v2 (free tier: 500k chars/month)
//   DEEPL_API_KEY             DeepL API Free (500k chars/month) or Pro
//   ANTHROPIC_API_KEY         Claude (also flags uncertain medical terms)
// Keys never reach the browser.
import Anthropic from 'npm:@anthropic-ai/sdk';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const GOOGLE = Deno.env.get('GOOGLE_TRANSLATE_API_KEY');
const DEEPL = Deno.env.get('DEEPL_API_KEY');
const CLAUDE = Deno.env.get('ANTHROPIC_API_KEY');
const provider = GOOGLE ? 'google' : DEEPL ? 'deepl' : CLAUDE ? 'claude' : null;

type Out = { text: string; uncertain: boolean; reason: string };

async function google(strings: string[], target: string, source?: string) {
  const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: strings, target: target === 'zh' ? 'zh-CN' : target, ...(source ? { source } : {}), format: 'text' }),
  });
  const j = await res.json();
  if (!res.ok) throw new HttpError(res.status === 403 || res.status === 429 ? 429 : 502, `Google Translation: ${j?.error?.message || res.status}`);
  const t = j.data.translations as { translatedText: string; detectedSourceLanguage?: string }[];
  return { detected: t[0]?.detectedSourceLanguage || source || null, out: t.map((x) => ({ text: x.translatedText, uncertain: false, reason: '' })) };
}

const DEEPL_TARGET: Record<string, string> = { en: 'EN-GB', pt: 'PT-PT', zh: 'ZH-HANS', 'zh-Hant': 'ZH-HANT', nb: 'NB' };
async function deepl(strings: string[], target: string, source?: string) {
  const host = DEEPL!.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com';
  const res = await fetch(`${host}/v2/translate`, {
    method: 'POST', headers: { Authorization: `DeepL-Auth-Key ${DEEPL}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: strings, target_lang: DEEPL_TARGET[target] || target.toUpperCase(), ...(source ? { source_lang: source.toUpperCase() } : {}) }),
  });
  if (res.status === 456) throw new HttpError(429, 'DeepL: monthly free quota reached.');
  if (res.status === 400) throw new HttpError(400, `DeepL doesn't support translating into "${target}". Choose another language or configure Google/Claude.`);
  const j = await res.json();
  if (!res.ok) throw new HttpError(res.status === 429 ? 429 : 502, `DeepL: ${j?.message || res.status}`);
  const t = j.translations as { text: string; detected_source_language?: string }[];
  return { detected: t[0]?.detected_source_language?.toLowerCase() || source || null, out: t.map((x) => ({ text: x.text, uncertain: false, reason: '' })) };
}

const RULES = `You work inside a medical passport app used by travelers and the doctors treating them abroad.
Never add, infer, complete or "correct" medical facts. Keep drug names, doses, units, numbers, dates and reference ranges exactly as given (localise only the decimal separator if required). Use standard clinical terminology. Source text may be in any language; detect it yourself.`;
async function claude(strings: string[], target: string) {
  const client = new Anthropic({ apiKey: CLAUDE });
  const res = await client.beta.messages.create({
    model: 'claude-opus-5-5', max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: {
        type: 'object', additionalProperties: false, required: ['detected', 'translations'],
        properties: {
          detected: { type: 'string', description: 'BCP 47 code of the main source language' },
          translations: { type: 'array', items: { type: 'object', additionalProperties: false, required: ['text', 'uncertain', 'reason'],
            properties: { text: { type: 'string' }, uncertain: { type: 'boolean' }, reason: { type: 'string' } } } },
        },
      } },
    },
    system: `${RULES}\nTranslate each string into the language with code "${target}". One item per input string, same order. Set uncertain=true (with a short English reason) when a term is ambiguous, an abbreviation or brand you can't expand with certainty, or a dose/unit with no clear equivalent.`,
    messages: [{ role: 'user', content: JSON.stringify({ target, strings }) }],
  } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
  if (res.stop_reason === 'refusal') throw new HttpError(422, 'The model declined this request.');
  const parsed = JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join(''));
  return { detected: parsed.detected || null, out: parsed.translations as Out[] };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.health) return json({ ok: !!provider, provider, note: provider ? undefined : 'Set GOOGLE_TRANSLATE_API_KEY, DEEPL_API_KEY or ANTHROPIC_API_KEY.' });
    if (!provider) throw new HttpError(501, 'No translation provider is configured on the server.');
    const target = String(body.target || '').trim();
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(target)) throw new HttpError(400, 'Invalid target language.');
    if (!Array.isArray(body.strings) || !body.strings.length) throw new HttpError(400, 'Nothing to translate.');
    if (body.strings.length > 200) throw new HttpError(413, 'At most 200 strings per request.');
    const strings = body.strings.map((s: unknown) => String(s ?? '').slice(0, 2000));
    const source = body.source ? String(body.source) : undefined;
    const r = provider === 'google' ? await google(strings, target, source) : provider === 'deepl' ? await deepl(strings, target, source) : await claude(strings, target);
    if (r.out.length !== strings.length) throw new HttpError(502, 'Translation came back incomplete.');
    return json({ provider, detected: r.detected, translations: r.out });
  } catch (e) {
    const status = (e as HttpError).status ?? 500;
    return json({ error: (e as Error).message }, status);
  }
});
