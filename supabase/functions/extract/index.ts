// MediPassport Edge Function: extract
// POST { text: "…OCR or PDF text…", filename? }  →  { title, issuer, date, lang, allergies[], medications[], conditions[], tests[] }
// POST { health: true }                         →  { ok, provider }
// Requires the ANTHROPIC_API_KEY secret. Items are copied verbatim, in the
// document's own language; nothing is inferred. The patient reviews every
// item in the app before anything is saved.
import Anthropic from 'npm:@anthropic-ai/sdk';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const KEY = Deno.env.get('ANTHROPIC_API_KEY');
const list = { type: 'array', items: { type: 'string' } };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.health) return json({ ok: !!KEY, provider: KEY ? 'claude' : null, note: KEY ? undefined : 'Set ANTHROPIC_API_KEY to enable AI extraction.' });
    if (!KEY) return json({ error: 'AI extraction is not configured on the server.' }, 501);
    const text = String(body.text || '').slice(0, 60000);
    if (text.trim().length < 20) return json({ error: 'Not enough text to extract from.' }, 400);
    const client = new Anthropic({ apiKey: KEY });
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5', max_tokens: 16000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: {
          type: 'object', additionalProperties: false,
          required: ['title', 'issuer', 'date', 'lang', 'allergies', 'medications', 'conditions', 'tests'],
          properties: {
            title: { type: 'string' }, issuer: { type: 'string' },
            date: { type: 'string', description: 'ISO date (YYYY-MM-DD) if printed, else empty' },
            lang: { type: 'string', description: 'BCP 47 code of the document language' },
            allergies: list, medications: list, conditions: list, tests: list,
          },
        } },
      },
      system: `You extract medical information from a document for a medical passport.
Copy each item in the document's own language and wording, one item per string (for example "Penicillin: anaphylaxis" or "Amlodipine 5 mg once daily").
Never add, infer or complete anything that isn't written. If text is illegible or ambiguous, leave it out. If this isn't a medical record, return empty lists.`,
      messages: [{ role: 'user', content: `Document text (from OCR/PDF extraction, may contain errors):\n\n${text}` }],
    } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (res.stop_reason === 'refusal') return json({ error: 'The model declined this request.' }, 422);
    return json({ provider: 'claude', ...JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')) });
  } catch (e) {
    const status = (e as { status?: number }).status;
    return json({ error: status === 429 ? 'AI service is rate-limited. Try again shortly.' : (e as Error).message }, status === 429 ? 429 : 500);
  }
});
