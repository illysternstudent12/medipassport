// MediPassport Edge Function: share-open
// The only way a doctor (no account) can read shared data.
// POST { token, code }               → scoped record + signed links to shared files
// POST { token, code, check: true }  → { ok } while access is still valid (polling)
// POST { health: true }              → { ok }
// Checks: token exists, code matches, not revoked, not expired, not locked
// after repeated wrong codes. Only the sections and documents the patient
// chose are returned. Every attempt is logged for the patient to see.
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const sha256 = async (s: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const log = (share_id: string, type: string, detail = '') => db.from('share_events').insert({ share_id, type, detail });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    if (body.health) return json({ ok: true });
    const token = String(body.token || ''), code = String(body.code || '');
    if (token.length < 20) return json({ error: 'invalid' }, 404);

    const { data: share } = await db.from('shares').select('*').eq('token_hash', await sha256(token)).maybeSingle();
    if (!share) return json({ error: 'invalid' }, 404);
    if (share.revoked_at) { await log(share.id, 'denied', 'Link used after revocation'); return json({ error: 'revoked' }, 410); }
    if (new Date(share.expires_at).getTime() <= Date.now()) { await log(share.id, 'denied', 'Link used after expiry'); return json({ error: 'expired', expires_at: share.expires_at }, 410); }

    // Brute-force guard: 5 wrong codes in 15 minutes locks the share for that window.
    const since = new Date(Date.now() - 15 * 60e3).toISOString();
    const { count } = await db.from('share_events').select('id', { count: 'exact', head: true }).eq('share_id', share.id).eq('type', 'denied').eq('detail', 'Wrong access code').gte('at', since);
    if ((count ?? 0) >= 5) return json({ error: 'locked' }, 429);
    if ((await sha256(`${token}:${code}`)) !== share.code_hash) { await log(share.id, 'denied', 'Wrong access code'); return json({ error: 'wrong-code' }, 403); }

    if (body.check) return json({ ok: true, expires_at: share.expires_at });

    const scope = share.scope || {};
    const sections: string[] = Array.isArray(scope.sections) ? scope.sections : [];
    const { data: profile } = await db.from('profiles').select('traveler_key, data').eq('user_id', share.user_id).maybeSingle();
    const p = profile?.data || {};
    // Server-side minimisation: identity, allergies and blood type always; the rest only if shared.
    const shared = {
      first: p.first, last: p.last, dob: p.dob, sex: p.sex, nationality: p.nationality, medicalId: p.medicalId, blood: p.blood, homeLang: p.homeLang,
      allergies: p.allergies ?? [],
      medications: sections.includes('medications') ? p.medications ?? [] : undefined,
      conditions: sections.includes('conditions') ? p.conditions ?? [] : undefined,
      tests: sections.includes('tests') ? p.tests ?? [] : undefined,
      fictional: p.fictional === true,
    };
    const ids = (Array.isArray(scope.docs) ? scope.docs : []).filter((d: string) => UUID.test(d));
    let documents: unknown[] = [];
    if (ids.length) {
      const { data: rows } = await db.from('documents').select('id, title, kind, orig_lang, storage_path, mime, facts, created_at').eq('user_id', share.user_id).in('id', ids);
      documents = await Promise.all((rows || []).map(async (r) => {
        const { data: s } = await db.storage.from('medical-documents').createSignedUrl(r.storage_path, 600);
        return { id: r.id, title: r.title, kind: r.kind, orig_lang: r.orig_lang, mime: r.mime, facts: r.facts, created_at: r.created_at, url: s?.signedUrl || null };
      }));
    }
    await log(share.id, 'opened', `Doctor opened the record · ${scope.lang || ''}`);
    return json({
      share: { id: share.id, label: share.label, expires_at: share.expires_at, scope: { ...scope, docs: scope.docs } },
      profile: { traveler_key: profile?.traveler_key || scope.traveler, data: shared },
      documents,
    });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
