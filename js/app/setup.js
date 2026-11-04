// App · Connected services: what is live, what runs on this device, what
// needs credentials, and what is simulated by design. Every status here comes
// from a real check, never from a hard-coded "connected".
import { icon } from '../icons.js';
import { currentTraveler } from './data.js';
import { appShell, AppTop, toast, mountShell } from './shell.js';
import { backendConfig, saveBackendConfig, isConfigured, currentUser, signIn, signUp, signOut, saveProfile, listDocuments } from '../backend/supabase.js';
import { refreshServices, PROVIDER_LABEL, clearAiCache } from '../translate/ai.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const SETUP_DOC = 'https://github.com/illysternstudent12/medipassport/blob/main/docs/SETUP.md';

const pill = (state, text) => `<span class="svc__st svc__st--${state}">${state === 'ok' ? icon('check') : state === 'busy' ? icon('clock') : state === 'sim' ? icon('sparkle') : icon('alert')}${esc(text)}</span>`;
const row = (id, ic, name, what, st = pill('busy', 'Checking…')) => `<li class="svc" data-svc="${id}">
  <span class="svc__ic">${icon(ic)}</span>
  <span class="svc__txt"><b>${name}</b><small>${what}</small></span>
  <span class="svc__state" data-st>${st}</span>
</li>`;

/** Is this the public anon/publishable key, not a secret one? */
function keyProblem(k) {
  if (/^sb_secret_/.test(k)) return 'That is a secret key. Use the anon / publishable key. Secret keys belong only in Edge Function secrets.';
  const parts = k.split('.');
  if (parts.length === 3) {
    try { const p = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))); if (p.role === 'service_role') return 'That is the service_role key. Never put it in a browser. Use the anon key.'; } catch { /* not a JWT */ }
  } else if (!/^sb_publishable_/.test(k)) return 'This doesn’t look like a Supabase anon or publishable key.';
  return '';
}

const backendForm = (c) => `<form class="svc-form" data-cfg>
  <label><span>Project URL</span><input type="url" required placeholder="https://xxxx.supabase.co" value="${esc(c.source === 'browser' ? c.url : '')}" data-url autocomplete="off" spellcheck="false"/></label>
  <label><span>Anon (public) key</span><input type="text" required placeholder="eyJ… or sb_publishable_…" value="${esc(c.source === 'browser' ? c.anonKey : '')}" data-anon autocomplete="off" spellcheck="false"/></label>
  <p class="svc-hint">${icon('lock')} <span>Only the public key goes here; it is safe in a browser because Row Level Security protects every table. Provider keys (Google, DeepL, Anthropic) and the service role key are set as Edge Function secrets and never reach this page.</span></p>
  <div class="svc-actions">${c.source === 'browser' ? '<button type="button" class="wbtn wbtn--line" data-cfg-clear>Disconnect</button>' : ''}<button type="submit" class="wbtn">${icon('check')} Connect</button></div>
</form>`;

const authForm = () => `<form class="svc-form" data-auth>
  <label><span>Email</span><input type="email" required autocomplete="email" data-email/></label>
  <label><span>Password</span><input type="password" required minlength="8" autocomplete="current-password" data-pass/></label>
  <p class="svc-hint">${icon('user')} <span>An account in <b>your own</b> Supabase project. Store only the fictional demo profiles in it.</span></p>
  <div class="svc-actions"><button type="button" class="wbtn wbtn--line" data-signup>Create account</button><button type="submit" class="wbtn">${icon('check')} Sign in</button></div>
</form>`;

export const appSetup = {
  title: 'Connected services · MediPassport',
  html() {
    const t = currentTraveler();
    return appShell('profile', `
      ${AppTop(t, { title: 'Connected services', desk: 'Connected services', back: '#/app/profile' })}
      <section class="dhead">
        <h1 class="dhead__h">What’s live,<br/><span class="serif">and what isn’t.</span></h1>
        <p class="dhead__sub">Every status below is checked now, from this device. Nothing is shown as connected unless it answered.</p>
        <div class="dhead__actions"><button type="button" class="dact dact--black" data-recheck>${icon('refresh')}<span>Check again</span></button><a class="dact" href="${SETUP_DOC}" target="_blank" rel="noopener">${icon('file')}<span>Setup guide</span></a></div>
      </section>

      <section class="svc-sec" aria-label="Free services">
        <div class="sec-head"><h2>Live, no account needed</h2><span class="sec-head__hint">Free tiers</span></div>
        <ul class="svc-list">
          ${row('osm', 'map', 'OpenStreetMap tiles', 'Map background on Find care')}
          ${row('overpass', 'building', 'Overpass API', 'Real hospitals, clinics and pharmacies from OpenStreetMap')}
          ${row('nominatim', 'search', 'Nominatim search', 'Manual location search · one request per search, as its usage policy asks', pill('ok', 'Used on search'))}
          ${row('pdfjs', 'file', 'pdf.js', 'Reads the text layer of any PDF, on this device')}
          ${row('ocr', 'scan', 'Tesseract OCR', 'Reads photos and scanned PDFs on this device · downloads a language model on first use')}
        </ul>
      </section>

      <section class="svc-sec" aria-label="Backend">
        <div class="sec-head"><h2>Your backend · Supabase</h2><span class="sec-head__hint">Auth · Database · Storage</span></div>
        <ul class="svc-list">
          ${row('backend', 'shield', 'Supabase project', 'Accounts, private document storage, revocable shares')}
          ${row('account', 'user', 'Account', 'Signed-in user (Row Level Security: you only see your own rows)')}
        </ul>
        <div data-backend-ui></div>
      </section>

      <section class="svc-sec" aria-label="Server functions">
        <div class="sec-head"><h2>Server functions</h2><span class="sec-head__hint">Keys stay server-side</span></div>
        <ul class="svc-list">
          ${row('translate', 'translate', 'Translation', 'Google Cloud Translation, DeepL or Claude · any language the provider supports')}
          ${row('extract', 'sparkle', 'AI extraction', 'Claude reads OCR / PDF text into allergies, medicines, diagnoses and tests')}
          ${row('summarize', 'heart', 'Doctor summary', 'Claude writes a short handover from recorded facts only')}
          ${row('share', 'qr', 'Share verification', 'Checks share links, access codes, expiry and revocation; logs every attempt')}
        </ul>
        <button type="button" class="wbtn wbtn--line svc-clear" data-clear-cache>${icon('refresh')} Clear saved machine translations</button>
      </section>

      <section class="svc-sec" aria-label="Simulated">
        <div class="sec-head"><h2>Simulated, by design</h2><span class="sec-head__hint">No official APIs</span></div>
        <ul class="svc-list">
          ${row('ins', 'umbrella', 'Insurance policy connections', 'Insurers in this demo are fictional. Policies are sample data, never fetched from an insurer.', pill('sim', 'Simulated'))}
          ${row('net', 'building', 'Insurance-network verification', 'No facility is marked as in-network. Ask your insurer’s assistance line.', pill('sim', 'Not verified'))}
          ${row('partners', 'people', 'Insurer partnerships & console', 'Demo partnerships only; no real insurer is a partner.', pill('sim', 'Demo'))}
        </ul>
      </section>
      <p class="app-note">Fictional travelers · sample data · not medical advice</p>
    `, t);
  },
  mount(root) {
    const t = currentTraveler();
    const off = [mountShell(root)];
    let alive = true;
    const set = (id, html) => { const el = root.querySelector(`[data-svc="${id}"] [data-st]`); if (el && alive) el.innerHTML = html; };
    const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
    const ui = root.querySelector('[data-backend-ui]');

    const checkFree = () => {
      ['osm', 'overpass', 'pdfjs', 'ocr'].forEach((id) => set(id, pill('busy', 'Checking…')));
      const img = new Image();
      const tmo = setTimeout(() => set('osm', pill('off', 'No answer')), 8000);
      img.onload = () => { clearTimeout(tmo); set('osm', pill('ok', 'Live')); };
      img.onerror = () => { clearTimeout(tmo); set('osm', pill('off', 'Unreachable')); };
      img.src = `https://tile.openstreetmap.org/3/4/2.png?mp=${Date.now() % 1000}`;
      withTimeout(fetch('https://overpass-api.de/api/status'), 15000)
        .then((r) => r.text()).then((s) => { const slots = (s.match(/(\d+) slots available now/) || [])[1]; set('overpass', pill('ok', slots !== undefined ? `Live · ${slots} slots free` : 'Live')); })
        .catch(() => set('overpass', pill('off', 'Busy or unreachable · map uses the saved snapshot')));
      const script = (src, g) => (window[g] ? Promise.resolve() : new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }));
      withTimeout(script('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', 'pdfjsLib'), 15000).then(() => set('pdfjs', pill('ok', 'Ready'))).catch(() => set('pdfjs', pill('off', 'Couldn’t load')));
      withTimeout(script('https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js', 'Tesseract'), 15000).then(() => set('ocr', pill('ok', 'Ready'))).catch(() => set('ocr', pill('off', 'Couldn’t load')));
    };

    const paintBackend = async () => {
      const c = backendConfig();
      if (!isConfigured()) {
        set('backend', pill('off', 'Not connected'));
        set('account', pill('off', 'Needs a project'));
        ['translate', 'extract', 'summarize', 'share'].forEach((id) => set(id, pill('off', 'Needs the backend')));
        ui.innerHTML = `<p class="svc-hint">${icon('alert')} <span>Without a backend, uploads stay on this device, translation uses the offline glossary (12 languages), and shares are demo links that can’t be revoked on another device. <a href="${SETUP_DOC}" target="_blank" rel="noopener">Setup guide</a> · about 15 minutes, free tier.</span></p>${backendForm(c)}`;
        return;
      }
      set('backend', pill('ok', c.source === 'config' ? 'Configured in config.js' : 'Configured on this device'));
      const user = await currentUser();
      if (!alive) return;
      set('account', user ? pill('ok', user.email || 'Signed in') : pill('off', 'Signed out'));
      ui.innerHTML = user
        ? `<div class="svc-form"><p class="svc-hint">${icon('user')} <span>Signed in as <b>${esc(user.email)}</b>. <span data-doccount>Counting stored documents…</span></span></p>
            <div class="svc-actions"><button type="button" class="wbtn wbtn--line" data-signout>${icon('logout')} Sign out</button><button type="button" class="wbtn" data-saveprof>${icon('upload')} Save ${esc(t.first)}’s fictional profile</button></div></div>
            ${c.source === 'browser' ? `<details class="svc-more"><summary>Project settings</summary>${backendForm(c)}</details>` : ''}`
        : `${authForm()}${c.source === 'browser' ? `<details class="svc-more"><summary>Project settings</summary>${backendForm(c)}</details>` : ''}`;
      if (user) listDocuments().then((d) => { const el = ui.querySelector('[data-doccount]'); if (el) el.textContent = `${d.length} document${d.length === 1 ? '' : 's'} in private storage.`; })
        .catch((e) => { const el = ui.querySelector('[data-doccount]'); if (el) el.textContent = `Couldn’t read documents: ${e.message}. Did you run the SQL migration?`; });
      ['translate', 'extract', 'summarize', 'share'].forEach((id) => set(id, pill('busy', 'Checking…')));
      const st = await refreshServices(true);
      if (!alive) return;
      const show = (id, s, okText) => set(id, !s ? pill('off', 'No answer')
        : s.ok ? pill('ok', okText(s))
        : /isn't deployed/.test(s.error || '') ? pill('off', 'Not deployed')
        : pill('off', s.note || s.error || 'Key not set'));
      show('translate', st.translate, (s) => `Live · ${PROVIDER_LABEL[s.provider] || s.provider}`);
      show('extract', st.extract, () => 'Live · Claude');
      show('summarize', st.summarize, () => 'Live · Claude');
      show('share', st.share, () => 'Live');
    };

    root.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = e.target;
      if (f.matches('[data-cfg]')) {
        const url = f.querySelector('[data-url]').value.trim(), key = f.querySelector('[data-anon]').value.trim();
        if (!/^https:\/\/[\w-]+\.supabase\.(co|in)\/?$|^https:\/\/[\w.-]+(:\d+)?\/?$/.test(url)) { toast('Enter the project URL, like https://xxxx.supabase.co'); return; }
        const bad = keyProblem(key);
        if (bad) { toast(bad); return; }
        saveBackendConfig(url, key);
        toast('Backend saved on this device. Checking…');
        paintBackend();
      } else if (f.matches('[data-auth]')) {
        const btn = f.querySelector('[type="submit"]'); btn.disabled = true;
        try { await signIn(f.querySelector('[data-email]').value.trim(), f.querySelector('[data-pass]').value); toast('Signed in.'); paintBackend(); }
        catch (err) { toast(`Sign-in failed: ${err.message}`); }
        finally { btn.disabled = false; }
      }
    });
    root.addEventListener('click', async (e) => {
      if (e.target.closest('[data-recheck]')) { checkFree(); paintBackend(); return; }
      if (e.target.closest('[data-cfg-clear]')) { saveBackendConfig('', ''); toast('Backend disconnected on this device.'); paintBackend(); return; }
      if (e.target.closest('[data-clear-cache]')) { clearAiCache(); toast('Saved machine translations cleared.'); return; }
      if (e.target.closest('[data-signout]')) { await signOut().catch(() => {}); toast('Signed out.'); paintBackend(); return; }
      if (e.target.closest('[data-signup]')) {
        const f = e.target.closest('form');
        const email = f.querySelector('[data-email]').value.trim(), pass = f.querySelector('[data-pass]').value;
        if (!email || pass.length < 8) { toast('Enter an email and a password of at least 8 characters.'); return; }
        try { const r = await signUp(email, pass); toast(r.session ? 'Account created and signed in.' : 'Account created. Confirm the email Supabase sent you, then sign in.'); paintBackend(); }
        catch (err) { toast(`Couldn’t create the account: ${err.message}`); }
        return;
      }
      const sp = e.target.closest('[data-saveprof]');
      if (sp) {
        sp.disabled = true;
        try { await saveProfile(t); toast(`${t.first}’s fictional profile and simulated policy saved to your account.`); }
        catch (err) { toast(`Couldn’t save: ${err.message}`); }
        finally { sp.disabled = false; }
      }
    });

    checkFree();
    paintBackend();
    return () => { alive = false; off.forEach((f) => f?.()); };
  },
};
