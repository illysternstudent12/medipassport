// Onboarding flow (Batch 3): residence → insurer → connect → upload →
// extract (labeled demo simulation) → review → permissions → activate.
import { icon } from '../icons.js';
import { BrandMark, QR } from '../components.js';
import { TRAVELERS, LANG_LABEL, travelerById, saveOnboarding, setTraveler, clearOnboarding } from '../app/data.js';
import { Portrait } from '../app/shell.js';
import { PassportCard } from '../app/home.js';
import {
  COUNTRIES, INSURERS, Flag, InsurerLogo, demoPolicy,
  DOC_KINDS, sampleUrl, extractFrom, detectSample,
} from './data.js';

const STEPS = [
  { key: 'welcome', kicker: 'Welcome', tone: 'peach' },
  { key: 'country', kicker: 'Residence', tone: 'mint' },
  { key: 'insurer', kicker: 'Insurer', tone: 'peach' },
  { key: 'connect', kicker: 'Connect', tone: 'mint' },
  { key: 'upload', kicker: 'Records', tone: 'peach' },
  { key: 'extract', kicker: 'Extract', tone: 'mint' },
  { key: 'review', kicker: 'Review', tone: 'peach' },
  { key: 'permissions', kicker: 'Permissions', tone: 'mint' },
  { key: 'done', kicker: 'Active', tone: 'black' },
];
const CATS = [
  { key: 'allergies', label: 'Allergies', one: 'allergy', ic: 'alert', fields: [['name', 'Allergy'], ['reaction', 'Reaction']] },
  { key: 'medications', label: 'Medications', one: 'medication', ic: 'rx', fields: [['name', 'Medication'], ['dose', 'Dose'], ['schedule', 'When']] },
  { key: 'conditions', label: 'Conditions', one: 'condition', ic: 'heart', fields: [['name', 'Condition'], ['since', 'Since']] },
  { key: 'tests', label: 'Test results', one: 'test result', ic: 'flask', fields: [['name', 'Test'], ['value', 'Result']] },
];
const PERMS = [
  { key: 'store', label: 'Store my passport securely', hint: 'Needed to keep your records in the app. Encrypted, and you can delete it any time.', locked: true },
  { key: 'qr', label: 'Share with doctors by QR, only when I choose', hint: 'Each code is temporary and you can revoke it.' },
  { key: 'status', label: 'Let my insurer see my passport is active', hint: 'Status only. No medical details.' },
  { key: 'claims', label: 'Send translated records with my claims', hint: 'Off by default. You can also decide claim by claim.' },
];

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const wait = (ms) => new Promise((r) => setTimeout(r, reduce() ? Math.min(ms, 60) : ms));
const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtSize = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
let uid = 0;

function freshState() {
  return {
    step: 0, country: null, insurer: null, policy: '', method: 'app',
    connected: false, files: [], extracted: null, edit: null,
    perms: { store: true, qr: true, status: true, claims: false },
  };
}

/* ======================================================================= views */
const persona = (s) => COUNTRIES.find((c) => c.code === s.country)?.traveler;
const insurerOf = (s) => (INSURERS[s.country] || []).find((i) => i.id === s.insurer);

function viewWelcome() {
  return `
    <h1 class="ob__h">Your passport,<br/><span class="serif">in a few minutes.</span></h1>
    <p class="ob__lead">We’ll connect your travel insurance, read your medical records, and build a passport any doctor abroad can understand.</p>
    <div class="ob-why">
      <div class="ob-why__item ob-why__item--mint">${icon('umbrella')}<b>Included with your policy</b><small>Participating travel insurers license MediPassport for their policyholders, so it’s free for you.</small></div>
      <div class="ob-why__item ob-why__item--peach">${icon('lock')}<b>You choose what’s included</b><small>Adding medical information is optional. Nothing is shared without your say.</small></div>
      <div class="ob-why__item ob-why__item--cream">${icon('clock')}<b>About 3 minutes</b><small>Mostly taps. Have a prescription or lab report handy, or use our samples.</small></div>
    </div>
    <p class="ob-demo">${icon('sparkle')} Demo: fictional travelers, illustrative insurers and sample documents.</p>`;
}

function viewCountry(s) {
  return `
    <h1 class="ob__h">Where do you<br/><span class="serif">live?</span></h1>
    <p class="ob__lead">We’ll show travel insurers that offer MediPassport where you’re a resident.</p>
    <div class="countries" role="radiogroup" aria-label="Country of residence">
      ${COUNTRIES.map((c) => {
        const t = TRAVELERS.find((x) => x.id === c.traveler);
        return `<button type="button" class="country country--${c.tone || 'soon'}" role="radio" aria-checked="${s.country === c.code}" data-country="${c.code}" ${c.soon ? 'disabled' : ''}>
          <span class="country__flag">${Flag(c.code)}</span>
          <span class="country__name">${c.name}</span>
          <span class="country__native serif">${c.native}</span>
          ${c.soon ? '<span class="country__soon">Coming soon</span>' : `<span class="country__who"><span class="country__ph">${Portrait(t)}</span>Demo: ${t.first} ${t.last}</span>`}
          <span class="country__check" aria-hidden="true">${icon('check')}</span>
        </button>`;
      }).join('')}
    </div>`;
}

function viewInsurer(s) {
  const list = INSURERS[s.country] || [];
  return `
    <h1 class="ob__h">Who insures<br/><span class="serif">your trips?</span></h1>
    <p class="ob__lead">Choose the insurer on your travel policy.</p>
    <div class="insurers-pick" role="radiogroup" aria-label="Travel insurer">
      ${list.map((i) => `<button type="button" class="ipick" role="radio" aria-checked="${s.insurer === i.id}" data-insurer="${i.id}">
        <span class="ipick__logo" style="background:${i.bg};color:${i.fg}">${InsurerLogo(i)}</span>
        <span class="ipick__txt"><b>${i.full}</b><small>${i.tag}</small></span>
        <span class="ipick__radio" aria-hidden="true">${icon('check')}</span>
      </button>`).join('')}
    </div>
    <p class="ob-demo">${icon('sparkle')} Illustrative, fictional insurers. They don’t represent real companies or partnerships.</p>`;
}

function viewConnect(s) {
  const ins = insurerOf(s);
  const t = travelerById(persona(s));
  if (s.connected) {
    const plan = t.insurance.provider === ins.full ? t.insurance.plan : ins.plans[0];
    return `
      <h1 class="ob__h">Policy<br/><span class="serif">connected.</span></h1>
      <div class="policy" style="--logo-bg:${ins.bg};--logo-fg:${ins.fg}">
        <div class="policy__top">${InsurerLogo(ins)}<span class="policy__ok">${icon('check')} Active</span></div>
        <div class="policy__holder"><span class="label">Policyholder</span><b>${t.first} ${t.last}</b></div>
        <dl class="policy__grid">
          <div><dt>Plan</dt><dd>${plan}</dd></div>
          <div><dt>Policy</dt><dd>${esc(s.policy)}</dd></div>
          <div><dt>Valid until</dt><dd>${t.insurance.validUntil}</dd></div>
          <div><dt>MediPassport</dt><dd>Included</dd></div>
        </dl>
      </div>
      <p class="ob__lead ob__lead--sm">${ins.full} pays the MediPassport license for its policyholders. You won’t be charged.</p>
      <p class="ob-demo">${icon('sparkle')} Simulated integration: nothing was sent to an insurer.</p>`;
  }
  return `
    <h1 class="ob__h">Connect<br/><span class="serif">your policy.</span></h1>
    <div class="link-art" data-link-art>
      <span class="link-art__node" style="background:${ins.bg};color:${ins.fg}">${InsurerLogo(ins, 'ilogo--mark-only')}</span>
      <span class="link-art__line"><i></i><i></i><i></i></span>
      <span class="link-art__node link-art__node--mp">${BrandMark('link-art__mp')}</span>
    </div>
    <div class="methods" role="radiogroup" aria-label="How to connect">
      <button type="button" class="method" role="radio" aria-checked="${s.method === 'app'}" data-method="app">
        ${icon('phone')}<span><b>Continue with ${ins.full}</b><small>Approve in the insurer’s app. No password typed here.</small></span>
      </button>
      <button type="button" class="method" role="radio" aria-checked="${s.method === 'policy'}" data-method="policy">
        ${icon('receipt')}<span><b>Use my policy number</b><small>Found on your policy documents.</small></span>
      </button>
    </div>
    <label class="policy-field ${s.method === 'policy' ? 'is-on' : ''}" data-policy-field>
      <span>Policy number <em>(prefilled for the demo)</em></span>
      <input type="text" value="${esc(s.policy)}" data-policy autocomplete="off" spellcheck="false" />
    </label>
    <ol class="checks" data-checks hidden>
      <li>Finding your policy</li><li>Checking travel cover</li><li>Confirming MediPassport license</li>
    </ol>`;
}

function viewUpload(s) {
  const p = persona(s);
  const t = TRAVELERS.find((x) => x.id === p);
  return `
    <h1 class="ob__h">Add your<br/><span class="serif">medical records.</span></h1>
    <p class="ob__lead">Prescriptions, lab reports, a summary from your doctor. Add what you have.</p>
    <div class="sources">
      <label class="source source--black">
        <input type="file" accept="application/pdf,.pdf" multiple data-file="PDF" />
        ${icon('file')}<b>PDF</b><small>From email or a portal</small>
      </label>
      <label class="source source--peach">
        <input type="file" accept="image/*" capture="environment" data-file="Camera" />
        ${icon('camera')}<b>Camera</b><small>Snap a paper record</small>
      </label>
      <label class="source source--mint">
        <input type="file" accept="application/pdf,.pdf,image/*" multiple data-file="Files" />
        ${icon('upload')}<b>Phone files</b><small>Browse your device</small>
      </label>
    </div>
    <div class="drop" data-drop><span>${icon('upload')} Or drop files here</span></div>

    <section class="samples">
      <div class="samples__head">
        <span class="samples__ph">${Portrait(t)}</span>
        <div><b>No records handy?</b><small>Use ${t.first}’s fictional sample documents.</small></div>
      </div>
      <div class="samples__list">
        ${Object.entries(DOC_KINDS).map(([k, d]) => `<a class="sample sample--${d.tone}" href="${sampleUrl(p, k)}" download>
          ${icon(d.icon)}<span>${d.label}</span><small>PDF</small>${icon('arrow', 'class="sample__dl"')}</a>`).join('')}
      </div>
      <button type="button" class="samples__add" data-add-samples>${icon('plus')} Add all three samples</button>
    </section>

    <ul class="uploads" data-uploads aria-live="polite">${s.files.map(fileRow).join('')}</ul>`;
}

function fileRow(f) {
  const kind = f.kind ? DOC_KINDS[f.kind] : null;
  const status = f.status === 'reading' ? 'Uploading…'
    : f.status === 'other' ? `Sample for another demo traveler · stored, not read`
    : kind ? `Recognized · ${kind.label}` : 'Stored · not readable in the demo';
  return `<li class="upload ${f.status === 'reading' ? 'is-reading' : ''} ${kind && f.status !== 'other' ? `upload--${kind.tone}` : ''}" data-fid="${f.id}">
    <span class="upload__ic">${icon(kind ? kind.icon : f.source === 'Camera' ? 'camera' : 'file')}</span>
    <span class="upload__txt"><b>${esc(f.name)}</b><small>${f.source} · ${fmtSize(f.size)} · <span data-status>${status}</span></small></span>
    <button type="button" class="upload__x" data-remove="${f.id}" aria-label="Remove ${esc(f.name)}">${icon('close')}</button>
    <span class="upload__bar"><i></i></span>
  </li>`;
}

function viewExtract(s) {
  const readable = s.files.filter((f) => f.kind && f.status === 'done');
  return `
    <h1 class="ob__h">Reading your<br/><span class="serif">records.</span></h1>
    <p class="ob-demo ob-demo--strong">${icon('sparkle')} Demo simulation: no AI model runs here. Our sample PDFs carry a tag that tells the demo what they contain. A production build would use OCR and an AI model, then ask you to check the result.</p>
    ${readable.length ? `
      <div class="reading" data-reading>
        ${readable.map((f) => `<div class="rdoc rdoc--${DOC_KINDS[f.kind].tone}" data-rdoc="${f.id}">
          <div class="rdoc__paper">${icon(DOC_KINDS[f.kind].icon)}<b>${DOC_KINDS[f.kind].label}</b><span></span><span></span><span style="width:60%"></span><i class="rdoc__scan"></i></div>
          <div class="rdoc__out" data-out></div>
        </div>`).join('')}
      </div>
      <p class="found" data-found hidden></p>`
    : `<div class="nothing">${icon('file')}<b>Nothing to read yet</b><p>The demo can only read the MediPassport sample PDFs. You can add details by hand in the next step, or go back and add the samples.</p></div>`}`;
}

function itemLine(cat, it) {
  if (cat === 'allergies') return [it.name, [it.severity, it.reaction].filter(Boolean).join(' · ')];
  if (cat === 'medications') return [it.name, [it.dose, it.schedule].filter(Boolean).join(' · ')];
  if (cat === 'conditions') return [it.name, it.since ? `Since ${it.since}` : ''];
  return [it.name, it.value];
}

function viewReview(s) {
  const ex = s.extracted;
  return `
    <h1 class="ob__h">Does this<br/><span class="serif">look right?</span></h1>
    <p class="ob__lead">Check each item. Tap to correct anything, or remove what you’d rather not include.</p>
    ${ex.blood ? `<div class="blood"><span class="label">Blood type</span>
      <div class="blood__opts" role="radiogroup" aria-label="Blood type">${['O+', 'O−', 'A+', 'A−', 'B+', 'B−', 'AB+', 'AB−'].map((b) => `<button type="button" role="radio" aria-checked="${ex.blood === b}" data-blood="${b}">${b}</button>`).join('')}</div></div>` : ''}
    ${CATS.map((c) => `
      <section class="rcat rcat--${c.key}">
        <div class="rcat__head"><span class="rcat__ic">${icon(c.ic)}</span><h2>${c.label}</h2><span class="rcat__n">${ex[c.key].length}</span></div>
        <ul class="ritems">
          ${ex[c.key].map((it, i) => {
            const editing = s.edit && s.edit.cat === c.key && s.edit.i === i;
            const [a, b] = itemLine(c.key, it);
            if (editing) {
              return `<li class="ritem is-editing"><form class="redit" data-edit-form="${c.key}:${i}">
                ${c.fields.map(([f, label]) => `<label><span>${label}</span><input name="${f}" value="${esc(it[f])}" ${f === 'name' ? 'required' : ''} autocomplete="off"/></label>`).join('')}
                ${c.key === 'allergies' ? `<label><span>Severity</span><select name="severity">${['Severe', 'Moderate', 'Mild'].map((v) => `<option ${it.severity === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>` : ''}
                <div class="redit__actions"><button type="button" class="wbtn wbtn--line" data-cancel>Cancel</button><button type="submit" class="wbtn">${icon('check')} Save</button></div>
              </form></li>`;
            }
            return `<li class="ritem ${it._edited ? 'is-edited' : ''}">
              <button type="button" class="ritem__main" data-edit="${c.key}:${i}">
                <span><b>${esc(a)}</b><small>${esc(b)}</small></span>
                <span class="ritem__src">${it._manual ? 'Added by you' : it._edited ? 'Corrected' : `From ${DOC_KINDS[it._src]?.label ?? 'record'}`}</span>
              </button>
              <button type="button" class="ritem__x" data-del="${c.key}:${i}" aria-label="Remove ${esc(a)}">${icon('close')}</button>
            </li>`;
          }).join('')}
        </ul>
        <button type="button" class="radd" data-add="${c.key}">${icon('plus')} Add ${c.one}</button>
      </section>`).join('')}`;
}

function viewPermissions(s) {
  const ins = insurerOf(s);
  return `
    <h1 class="ob__h">You’re<br/><span class="serif">in control.</span></h1>
    <p class="ob__lead">Medical information is yours. Adding it is optional, and your insurer only sees medical details if you send them with a claim.</p>
    <ul class="perms">
      ${PERMS.map((p) => `<li class="perm ${p.locked ? 'is-locked' : ''}">
        <label class="toggle">
          <span class="toggle__txt"><b>${p.key === 'status' ? `Let ${ins.full} see my passport is active` : p.label}</b><small>${p.hint}</small></span>
          <input type="checkbox" role="switch" data-perm="${p.key}" ${s.perms[p.key] ? 'checked' : ''} ${p.locked ? 'disabled' : ''}/>
          <span class="toggle__ui" aria-hidden="true"></span>
        </label>
      </li>`).join('')}
    </ul>
    <p class="ob-small">${icon('lock')} You can change these, delete records, or close your passport any time in Profile.</p>`;
}

function viewDone(s) {
  const t = travelerById(persona(s));
  return `
    <div class="done">
      <div class="done__burst" aria-hidden="true">${Array.from({ length: 14 }, (_, i) => `<i style="--a:${i * (360 / 14)}deg;--d:${(i % 4) * 60}ms"></i>`).join('')}</div>
      <div class="done__card">${PassportCard(t, { href: '#/app/passport' })}<span class="done__stamp">${icon('check')} Active</span></div>
      <h1 class="ob__h ob__h--center">Ready to<br/><span class="serif">travel, ${t.first}.</span></h1>
      <p class="ob__lead ob__lead--center">Your passport is active and translates into ${LANG_LABEL[t.trip.lang]} for your trip to ${t.trip.city}.</p>
      <div class="done__qr">${QR(9, { fg: '#000', bg: '#FBF3EB' })}<span><b>Doctor sharing ready</b><small>Create a temporary QR from your passport.</small></span></div>
    </div>`;
}

const VIEWS = { welcome: viewWelcome, country: viewCountry, insurer: viewInsurer, connect: viewConnect, upload: viewUpload, extract: viewExtract, review: viewReview, permissions: viewPermissions, done: viewDone };

function panelArt(s, key) {
  if (key === 'country' || key === 'welcome') {
    return `<div class="art-flags">${COUNTRIES.slice(0, 6).map((c, i) => `<span style="--i:${i}">${Flag(c.code)}</span>`).join('')}</div>`;
  }
  if (key === 'insurer' || key === 'connect') {
    const list = INSURERS[s.country] || INSURERS.IL;
    return `<div class="art-logos">${list.map((i, n) => `<span style="--i:${n};background:${i.bg};color:${i.fg}">${InsurerLogo(i)}</span>`).join('')}</div>`;
  }
  if (key === 'upload' || key === 'extract') {
    return `<div class="art-docs">${Object.values(DOC_KINDS).map((d, i) => `<span class="art-docs__d art-docs__d--${d.tone}" style="--i:${i}">${icon(d.icon)}<b>${d.label}</b><i></i><i></i><i></i></span>`).join('')}</div>`;
  }
  if (key === 'review' || key === 'permissions') {
    return `<div class="art-checks">${['Allergies', 'Medications', 'Conditions', 'Results'].map((l, i) => `<span style="--i:${i}">${icon('check')}${l}</span>`).join('')}</div>`;
  }
  return '';
}

function primaryLabel(s, key) {
  return {
    welcome: 'Let’s begin', country: 'Continue', insurer: 'Continue',
    connect: s.connected ? 'Continue' : 'Connect policy', upload: s.files.length ? 'Read my records' : 'Skip for now',
    extract: 'Review results', review: 'Looks right', permissions: 'Activate passport', done: 'Open my passport',
  }[key];
}

function canNext(s, key) {
  if (key === 'country') return !!s.country;
  if (key === 'insurer') return !!s.insurer;
  if (key === 'connect') return s.method === 'app' || s.policy.trim().length > 4;
  if (key === 'upload') return !s.files.some((f) => f.status === 'reading');
  if (key === 'extract') return !!s.extracted;
  return true;
}

/* ======================================================================= page */
export const onboardingPage = {
  title: 'Get Started · MediPassport',
  html: () => '<div class="ob-root" data-ob></div>',
  mount(root) {
    const host = root.querySelector('[data-ob]');
    let s = freshState();
    let busy = false;
    let alive = true;

    const go = (n) => { s.step = Math.max(0, Math.min(STEPS.length - 1, n)); s.edit = null; render(); host.scrollIntoView?.({ block: 'start' }); window.scrollTo(0, 0); };

    function render() {
      const st = STEPS[s.step];
      const prog = STEPS.slice(1, -1);
      host.innerHTML = `
        <div class="ob ob--${st.tone}" data-step-key="${st.key}">
          <header class="ob__bar">
            ${s.step > 0 && st.key !== 'done' ? `<button type="button" class="ob__icon" data-back aria-label="Back">${icon('arrow', 'style="rotate:180deg"')}</button>` : `<a class="ob__brand" href="#/" aria-label="MediPassport home">${BrandMark()}</a>`}
            <ol class="ob__prog" aria-label="Progress">
              ${prog.map((p, i) => `<li class="${i + 1 < s.step ? 'is-done' : i + 1 === s.step ? 'is-now' : ''}"><span class="sr-only">${p.kicker}${i + 1 === s.step ? ' (current step)' : ''}</span></li>`).join('')}
            </ol>
            <a class="ob__icon" href="#/" aria-label="Exit onboarding">${icon('close')}</a>
          </header>
          <div class="ob__grid">
            <aside class="ob__panel ob__panel--${st.tone} grain" aria-hidden="true">
              <span class="blob" style="width:70%;height:50%;left:-20%;top:-10%;background:var(--cream);opacity:.6"></span>
              <span class="ob__num">${st.key === 'done' ? '✓' : String(s.step).padStart(2, '0')}</span>
              <span class="ob__kicker">${st.kicker}</span>
              <div class="ob__art">${panelArt(s, st.key)}</div>
            </aside>
            <main class="ob__main">
              <span class="ob__step-label">${st.key === 'done' ? 'All set' : s.step === 0 ? 'Get started' : `Step ${s.step} of ${prog.length} · ${st.kicker}`}</span>
              <div class="ob__step">${VIEWS[st.key](s)}</div>
            </main>
          </div>
          <footer class="ob__actions">
            ${st.key === 'done' ? `<button type="button" class="ob__ghost" data-restart>Start over</button>` : ''}
            <button type="button" class="btn ob__next" data-next ${canNext(s, st.key) ? '' : 'disabled'}><span>${primaryLabel(s, st.key)}</span><span class="btn__dot">${icon(st.key === 'permissions' ? 'check' : 'arrow')}</span></button>
          </footer>
        </div>`;
      after(st.key);
    }
    const refreshNext = () => {
      const b = host.querySelector('[data-next]');
      if (!b) return;
      const key = STEPS[s.step].key;
      b.disabled = !canNext(s, key) || busy;
      b.querySelector('span').textContent = primaryLabel(s, key);
    };

    /* --- step side effects after render --- */
    function after(key) {
      if (key === 'extract' && !s.extracted) runExtraction();
      if (key === 'extract' && s.extracted) showExtracted(true);
    }

    /* --- connect --- */
    async function runConnect() {
      busy = true; refreshNext();
      const checks = host.querySelector('[data-checks]');
      const art = host.querySelector('[data-link-art]');
      host.querySelectorAll('.method, [data-policy-field]').forEach((el) => el.classList.add('is-dim'));
      checks.hidden = false;
      art.classList.add('is-linking');
      const items = [...checks.children];
      for (const li of items) {
        li.classList.add('is-running');
        await wait(750);
        if (!alive) return;
        li.classList.remove('is-running'); li.classList.add('is-ok');
      }
      art.classList.add('is-linked');
      await wait(500);
      if (!alive) return;
      busy = false;
      s.connected = true;
      render();
    }

    /* --- upload --- */
    async function addFiles(fileList, source) {
      const p = persona(s);
      for (const file of fileList) {
        const f = { id: ++uid, name: file.name, size: file.size, source, kind: null, status: 'reading' };
        s.files.push(f);
        const ul = host.querySelector('[data-uploads]');
        ul?.insertAdjacentHTML('beforeend', fileRow(f));
        ul?.lastElementChild?.scrollIntoView({ block: 'nearest', behavior: reduce() ? 'auto' : 'smooth' });
        refreshNext();
        const tag = await detectSample(file).catch(() => null);
        await wait(900 + Math.random() * 500);
        if (!alive) return;
        if (tag && tag.traveler === p) { f.kind = tag.kind; f.status = 'done'; }
        else if (tag) { f.kind = tag.kind; f.status = 'other'; }
        else { f.status = 'stored'; }
        s.extracted = null; // new files invalidate a previous extraction
        const li = host.querySelector(`[data-fid="${f.id}"]`);
        if (li) li.outerHTML = fileRow(f);
        refreshNext();
      }
    }
    async function addSamples() {
      const p = persona(s);
      const btn = host.querySelector('[data-add-samples]');
      btn.disabled = true;
      for (const k of Object.keys(DOC_KINDS)) {
        if (s.files.some((f) => f.kind === k && f.status === 'done')) continue;
        const res = await fetch(sampleUrl(p, k));
        const blob = await res.blob();
        await addFiles([new File([blob], `${p}-${DOC_KINDS[k].file}.pdf`, { type: 'application/pdf' })], 'Sample');
      }
      if (btn.isConnected) btn.disabled = false;
    }

    /* --- extraction (demo simulation) --- */
    function buildExtraction() {
      const p = persona(s);
      const out = { allergies: [], medications: [], conditions: [], tests: [], blood: null };
      s.files.filter((f) => f.kind && f.status === 'done').forEach((f) => {
        const data = extractFrom(p, f.kind);
        CATS.forEach((c) => (data[c.key] || []).forEach((it) => {
          if (!out[c.key].some((x) => x.name === it.name)) out[c.key].push({ ...it, _src: f.kind });
        }));
        if (data.blood) out.blood = data.blood;
      });
      return out;
    }
    const chipsFor = (kind) => {
      const d = extractFrom(persona(s), kind);
      const chips = [];
      (d.allergies || []).forEach((a) => chips.push(['alert', `Allergy · ${a.name}`]));
      (d.conditions || []).forEach((c) => chips.push(['heart', c.name]));
      if (d.blood) chips.push(['drop', `Blood ${d.blood}`]);
      (d.medications || []).forEach((m) => chips.push(['rx', `${m.name} · ${m.dose}`]));
      (d.tests || []).forEach((t) => chips.push(['flask', `${t.name} · ${t.value}`]));
      return chips;
    };
    async function runExtraction() {
      busy = true; refreshNext();
      const docs = [...host.querySelectorAll('[data-rdoc]')];
      for (const el of docs) {
        const f = s.files.find((x) => String(x.id) === el.dataset.rdoc);
        el.classList.add('is-scanning');
        await wait(900);
        if (!alive) return;
        const out = el.querySelector('[data-out]');
        for (const [ic, label] of chipsFor(f.kind)) {
          out.insertAdjacentHTML('beforeend', `<span class="xchip xchip--${ic}">${icon(ic)}${esc(label)}</span>`);
          await wait(260);
          if (!alive) return;
        }
        el.classList.remove('is-scanning'); el.classList.add('is-read');
      }
      s.extracted = buildExtraction();
      busy = false;
      showExtracted(false);
      refreshNext();
    }
    function showExtracted(instant) {
      const ex = s.extracted;
      if (instant) {
        host.querySelectorAll('[data-rdoc]').forEach((el) => {
          const f = s.files.find((x) => String(x.id) === el.dataset.rdoc);
          el.classList.add('is-read');
          el.querySelector('[data-out]').innerHTML = chipsFor(f.kind).map(([ic, l]) => `<span class="xchip xchip--${ic}">${icon(ic)}${esc(l)}</span>`).join('');
        });
      }
      const found = host.querySelector('[data-found]');
      if (found) {
        const parts = CATS.map((c) => ex[c.key].length ? `${ex[c.key].length} ${ex[c.key].length === 1 ? c.one : c.label.toLowerCase()}` : null).filter(Boolean);
        found.innerHTML = `${icon('check')} Found ${parts.join(', ')}. Next, check them.`;
        found.hidden = false;
      }
    }

    /* --- activation --- */
    function activate() {
      const p = persona(s);
      const ins = insurerOf(s);
      const base = TRAVELERS.find((t) => t.id === p);
      const ex = s.extracted || { allergies: [], medications: [], conditions: [], tests: [] };
      const clean = (arr) => arr.map(({ _src, _edited, _manual, ...it }) => it);
      saveOnboarding({
        travelerId: p,
        country: s.country,
        insurance: {
          provider: ins.full,
          plan: base.insurance.provider === ins.full ? base.insurance.plan : ins.plans[0],
          policy: s.policy, status: 'Active',
        },
        medical: {
          allergies: clean(ex.allergies),
          medications: clean(ex.medications).map((m) => ({ times: base.medications.find((b) => b.name === m.name)?.times ?? [], ...m })),
          conditions: clean(ex.conditions),
          tests: clean(ex.tests),
        },
        blood: ex.blood,
        permissions: s.perms,
        activatedAt: new Date().toISOString(),
      });
      setTraveler(p);
    }

    /* --- events --- */
    host.addEventListener('click', async (e) => {
      const el = e.target.closest('button, a');
      if (!el || busy && el.matches('[data-next], [data-back]')) return;
      const key = STEPS[s.step].key;

      if (el.matches('[data-back]')) {
        // Going back to before "connect" resets the connection; before upload resets extraction
        const target = key === 'connect' && s.connected ? s.step : s.step - 1;
        if (key === 'connect' && s.connected) { s.connected = false; render(); return; }
        go(target);
        return;
      }
      if (el.matches('[data-next]')) {
        if (key === 'connect' && !s.connected) { runConnect(); return; }
        if (key === 'upload' && !s.files.some((f) => f.status === 'done')) { s.extracted = buildExtraction(); go(s.step + 2); return; }
        if (key === 'permissions') { activate(); go(s.step + 1); return; }
        if (key === 'done') { location.hash = '#/app'; return; }
        go(s.step + 1);
        return;
      }
      if (el.matches('[data-restart]')) { clearOnboarding(); s = freshState(); render(); return; }

      if (el.dataset.country) {
        if (s.country !== el.dataset.country) {
          s = { ...freshState(), step: s.step, country: el.dataset.country };
        }
        host.querySelectorAll('[data-country]').forEach((b) => b.setAttribute('aria-checked', String(b === el)));
        refreshNext();
        return;
      }
      if (el.dataset.insurer) {
        if (s.insurer !== el.dataset.insurer) {
          s.insurer = el.dataset.insurer; s.connected = false;
          s.policy = demoPolicy(insurerOf(s), persona(s));
        }
        host.querySelectorAll('[data-insurer]').forEach((b) => b.setAttribute('aria-checked', String(b === el)));
        refreshNext();
        return;
      }
      if (el.dataset.method) {
        s.method = el.dataset.method;
        host.querySelectorAll('[data-method]').forEach((b) => b.setAttribute('aria-checked', String(b === el)));
        host.querySelector('[data-policy-field]').classList.toggle('is-on', s.method === 'policy');
        refreshNext();
        return;
      }
      if (el.matches('[data-add-samples]')) { addSamples(); return; }
      if (el.dataset.remove) {
        s.files = s.files.filter((f) => String(f.id) !== el.dataset.remove);
        s.extracted = null;
        el.closest('li').remove();
        refreshNext();
        return;
      }
      if (el.dataset.blood) { s.extracted.blood = el.dataset.blood; render(); return; }
      if (el.dataset.edit) { const [cat, i] = el.dataset.edit.split(':'); s.edit = { cat, i: +i }; render(); host.querySelector('.redit input')?.focus(); return; }
      if (el.matches('[data-cancel]')) {
        const { cat, i } = s.edit;
        if (s.extracted[cat][i]?._new) s.extracted[cat].splice(i, 1);
        s.edit = null; render(); return;
      }
      if (el.dataset.del) { const [cat, i] = el.dataset.del.split(':'); s.extracted[cat].splice(+i, 1); s.edit = null; render(); return; }
      if (el.dataset.add) {
        const cat = el.dataset.add;
        s.extracted[cat].push({ name: '', _manual: true, _new: true, ...(cat === 'allergies' ? { severity: 'Moderate' } : {}) });
        s.edit = { cat, i: s.extracted[cat].length - 1 };
        render();
        host.querySelector('.redit input')?.focus();
      }
    });

    host.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-edit-form]');
      if (!form) return;
      e.preventDefault();
      const [cat, i] = form.dataset.editForm.split(':');
      const item = s.extracted[cat][+i];
      new FormData(form).forEach((v, k) => { item[k] = String(v).trim(); });
      if (!item.name) return;
      if (cat === 'allergies' && !item.note) item.note = item.reaction || '';
      if (cat === 'conditions' && !item.note) item.note = '';
      if (cat === 'medications' && !item.times) item.times = [];
      if (!item._manual) item._edited = true;
      delete item._new;
      s.edit = null;
      render();
    });

    host.addEventListener('change', (e) => {
      const inp = e.target;
      if (inp.dataset.file && inp.files?.length) { addFiles([...inp.files], inp.dataset.file); inp.value = ''; }
      if (inp.dataset.perm) s.perms[inp.dataset.perm] = inp.checked;
    });
    host.addEventListener('input', (e) => {
      if (e.target.matches('[data-policy]')) { s.policy = e.target.value; refreshNext(); }
    });

    // Drag and drop (desktop)
    host.addEventListener('dragover', (e) => { const d = e.target.closest('[data-drop]'); if (d) { e.preventDefault(); d.classList.add('is-over'); } });
    host.addEventListener('dragleave', (e) => { e.target.closest('[data-drop]')?.classList.remove('is-over'); });
    host.addEventListener('drop', (e) => {
      const d = e.target.closest('[data-drop]');
      if (!d) return;
      e.preventDefault(); d.classList.remove('is-over');
      if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files], 'Files');
    });

    render();
    return () => { alive = false; };
  },
};
