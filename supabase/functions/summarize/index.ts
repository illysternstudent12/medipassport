// MediPassport Edge Function: summarize
// POST { lang: "es", facts: { allergies[], diagnoses[], medications[], test_results[], blood_type } }  →  { summary }
// POST { health: true }  →  { ok, provider }
// Requires ANTHROPIC_API_KEY. Writes only from the facts given.
import Anthropic from 'npm:@anthropic-ai/sdk';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const KEY = Deno.env.get('ANTHROPIC_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.health) return json({ ok: !!KEY, provider: KEY ? 'claude' : null });
    if (!KEY) return json({ error: 'AI summaries are not configured on the server.' }, 501);
    const lang = String(body.lang || 'en');
    const client = new Anthropic({ apiKey: KEY });
    const res = await client.beta.messages.create({
      model: 'claude-opus-5-5', max_tokens: 4000, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: { type: 'object', additionalProperties: false, required: ['summary'], properties: { summary: { type: 'string' } } } } },
      system: `Write a 2-3 sentence handover summary for a treating doctor, in the language with code "${lang}". Lead with allergies. Mention only facts present in the input; if a category is empty, say it is not recorded. Keep drug names, doses and units exactly.`,
      messages: [{ role: 'user', content: JSON.stringify(body.facts ?? {}).slice(0, 20000) }],
    } as never) as unknown as { stop_reason: string; content: { type: string; text?: string }[] };
    if (res.stop_reason === 'refusal') return json({ error: 'The model declined this request.' }, 422);
    return json(JSON.parse(res.content.filter((b) => b.type === 'text').map((b) => b.text).join('')));
  } catch (e) {
    return json({ error: (e as Error).message }, (e as { status?: number }).status === 429 ? 429 : 500);
  }
});
