// Insurer console (B2B) — #/insurer
// Enrollment, passports, connected policies, assistance requests, documents
// authorized for claim review, and licensing. Insurers never see medical
// histories: only status, assistance requests patients send, and documents a
// patient explicitly authorizes per claim (with expiry and revocation).
import { icon } from '../icons.js';
import { TRAVELERS, travelerById } from '../app/data.js';
import { Portrait } from '../app/shell.js';
import { openSheet, toast } from '../app/ui.js';
import { INSURERS, InsurerLogo } from '../onboarding/data.js';
import { buildRecords, fmtDate } from '../translate/records.js';
import { term } from '../translate/glossary.js';
import { layeredViewer, bindViewer } from '../app/documents.js';
import { claimAuthorizations, statusOf, logEvent, assistRequests } from '../share/store.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = new Intl.NumberFormat('en-GB');
const compact = (n) => (n >= 1000 ? `${+(n / 1000).toFixed(1)}K` : nf.format(n)); // one style per axis: 0 / 7.5K / 15K
const eur = (n) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
const when = (ts) => new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(ts);
const ORG_KEY = 'mp.insurer.org';
const ASSIST_STATE = 'mp.insurer.assist';

/* ---------------------------------------------------------------- demo data (fictional) */
const LICENSE_FEE = 3.9; // € per policyholder per year (fictional demo pricing)
const MONTHS = ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'];
const ORGS = {
  solstice: {
    insurer: INSURERS.IL.find((i) => i.id === 'solstice'), country: 'Israel', enrolled: 18420, connected: 17988, renews: '1 Mar 2027',
    active: [6120, 7040, 8210, 9480, 11630, 12890, 11240, 11906],
    people: [['Noa Ben-Ami', 'Explorer Plus', 'GR', 'Active'], ['Yonatan Peretz', 'Explorer', 'TH', 'Active'], ['Tamar Haddad', 'Weekend Escape', 'IT', 'Invited'], ['Omer Shalev', 'Explorer Plus', 'US', 'Active'], ['Lior Mizrahi', 'Explorer', 'PT', 'Not activated'], ['Dana Katz', 'Explorer Plus', 'JP', 'Active']],
    assists: [['Yonatan Peretz', 'Chiang Mai, Thailand', 3.2, 'Resolved'], ['Omer Shalev', 'Denver, United States', 27, 'Resolved']],
  },
  northwind: {
    insurer: INSURERS.JP.find((i) => i.id === 'northwind'), country: 'Japan', enrolled: 9310, connected: 9102, renews: '1 Apr 2027',
    active: [2810, 3120, 3560, 3990, 4720, 5310, 5480, 5762],
    people: [['Haruto Sato', 'Global Traveler', 'FR', 'Active'], ['Yui Tanaka', 'Business Trip', 'SG', 'Active'], ['Ren Kobayashi', 'Global Traveler', 'DE', 'Invited'], ['Mio Yamamoto', 'Business Trip', 'US', 'Active'], ['Sota Ito', 'Global Traveler', 'KR', 'Not activated']],
    assists: [['Yui Tanaka', 'Singapore', 9.5, 'In progress']],
  },
  meridian: {
    insurer: INSURERS.GB.find((i) => i.id === 'meridian'), country: 'United Kingdom', enrolled: 26750, connected: 25980, renews: '1 Jan 2027',
    active: [9940, 10820, 12410, 14200, 17350, 18960, 16020, 15488],
    people: [['Olivia Bennett', 'Annual Multi-trip', 'ES', 'Active'], ['Jack Thompson', 'Single Trip', 'MX', 'Active'], ['Priya Shah', 'Annual Multi-trip', 'IN', 'Active'], ['Ewan Fraser', 'Backpacker', 'VN', 'Invited'], ['Grace Okoye', 'Annual Multi-trip', 'FR', 'Not activated']],
    assists: [['Jack Thompson', 'Tulum, Mexico', 14, 'In progress'], ['Olivia Bennett', 'Seville, Spain', 52, 'Resolved']],
  },
};
const orgFor = (provider) => Object.keys(ORGS).find((k) => ORGS[k].insurer.full === provider);

/* ---------------------------------------------------------------- chart (single series, inline SVG) */
function barChart(values, labels) {
  const W = 560, H = 220, pl = 44, pr = 12, pt = 24, pb = 28;
  const max = Math.ceil(Math.max(...values) / 5000) * 5000 || 1;
  const ticks = [0, max / 2, max];
  const bw = Math.min(24, ((W - pl - pr) / values.length) * 0.5);
  const x = (i) => pl + ((W - pl - pr) / values.length) * (i + 0.5);
  const y = (v) => pt + (H - pt - pb) * (1 - v / max);
  const bar = (i, v) => {
    const x0 = x(i) - bw / 2, y0 = y(v), h = H - pb - y0, r = Math.min(4, h);
    return `M${x0},${H - pb} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + bw - r} Q${x0 + bw},${y0} ${x0 + bw},${y0 + r} V${H - pb} Z`;
  };
  const last = values.length - 1;
  return `<svg class="ichart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly active passports, ${labels[0]} to ${labels[last]} 2026. Latest: ${nf.format(values[last])}.">
    ${ticks.map((v) => `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="ichart__grid"/><text x="${pl - 8}" y="${y(v) + 4}" class="ichart__tick" text-anchor="end">${compact(v)}</text>`).join('')}
    ${values.map((v, i) => `<g class="ichart__bar" tabindex="0" data-tip="${labels[i]} 2026 · ${nf.format(v)} active passports">
      <rect x="${x(i) - (W - pl - pr) / values.length / 2}" y="${pt}" width="${(W - pl - pr) / values.length}" height="${H - pt - pb}" fill="transparent"/>
      <path d="${bar(i, v)}"/>
      <text x="${x(i)}" y="${H - 8}" class="ichart__tick" text-anchor="middle">${labels[i]}</text>
    </g>`).join('')}
    <text x="${x(last)}" y="${y(values[last]) - 8}" class="ichart__val" text-anchor="middle">${compact(values[last])}</text>
  </svg>`;
}

/* ---------------------------------------------------------------- views */
function signIn() {
  return `<div class="ic ic--gate"><main class="ic-gate">
    <p class="label">MediPassport · partner console</p>
    <h1>Insurer <span class="serif">sign-in</span></h1>
    <p class="ic-gate__sub">Choose an organization to sign in as its claims team.</p>
    <div class="ic-gate__orgs">${Object.entries(ORGS).map(([k, o]) => `<button type="button" class="ic-org" data-org="${k}" style="background:${o.insurer.bg};color:${o.insurer.fg}">${InsurerLogo(o.insurer)}<small>${o.country}</small></button>`).join('')}</div>
    <p class="pt-sim">${icon('sparkle')} Simulated authentication with fictional insurers and demo figures. No real company or partnership is shown.</p>
    <a class="link" href="#/">${icon('arrow', 'style="rotate:180deg"')} MediPassport home</a>
  </main></div>`;
}

function dashboard(key) {
  const o = ORGS[key];
  const ins = o.insurer;
  const ours = TRAVELERS.filter((t) => t.insurance.provider === ins.full).map((t) => travelerById(t.id));
  const activeNow = o.active[o.active.length - 1];
  const prev = o.active[o.active.length - 2];
  const delta = ((activeNow - prev) / prev) * 100;
  const authed = claimAuthorizations().filter((s) => travelerById(s.traveler).insurance.provider === ins.full).sort((a, b) => b.createdAt - a.createdAt);
  const st = (() => { try { return JSON.parse(localStorage.getItem(ASSIST_STATE)) || {}; } catch { return {}; } })();
  const live = assistRequests().filter((r) => r.provider === ins.full).map((r) => ({ id: r.id, name: r.name, where: r.where, at: r.at, status: st[r.id] || 'New', live: true }));
  const seeded = o.assists.map(([name, where, hAgo, status], i) => ({ id: `${key}-a${i}`, name, where, at: Date.now() - hAgo * 3600e3, status: st[`${key}-a${i}`] || status }));
  const assists = [...live, ...seeded].sort((a, b) => b.at - a.at);
  const open = assists.filter((a) => a.status !== 'Resolved').length;
  return `<div class="ic">
    <header class="ic-bar">
      <span class="ic-bar__logo" style="background:${ins.bg};color:${ins.fg}">${InsurerLogo(ins)}</span>
      <span class="ic-bar__title">Partner console <em>· demo</em></span>
      <nav class="ic-bar__nav" aria-label="Sections">${[['ov', 'Overview'], ['as', 'Assistance'], ['cl', 'Claims documents'], ['ph', 'Policyholders'], ['li', 'Licensing']].map(([id, l]) => `<button type="button" data-jump="${id}">${l}</button>`).join('')}</nav>
      <button type="button" class="ic-bar__out" data-signout>${icon('logout')} Sign out</button>
    </header>
    <main class="ic-main">
      <section class="ic-kpis" id="ic-ov" aria-label="Overview">
        <div class="ikpi"><span>Enrolled policyholders</span><b>${nf.format(o.enrolled)}</b><small>Licensed seats this year</small></div>
        <div class="ikpi"><span>Active medical passports</span><b>${nf.format(activeNow)}</b><small class="${delta >= 0 ? 'is-up' : 'is-down'}">${delta >= 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)}% vs September</small></div>
        <div class="ikpi"><span>Connected policies</span><b>${nf.format(o.connected)}</b><small>${((o.connected / o.enrolled) * 100).toFixed(1)}% of enrolled</small></div>
        <div class="ikpi ikpi--alert"><span>Open assistance requests</span><b>${open}</b><small>${assists.length} in the last 7 days</small></div>
      </section>

      <div class="ic-grid">
        <section class="icard ic-chart">
          <header><h2>Monthly active passports</h2><button type="button" class="ic-tbtn" data-table aria-expanded="false">Show table</button></header>
          <div class="ichart-wrap" data-chart>${barChart(o.active, MONTHS)}<div class="ichart-tip" data-tip-box hidden></div></div>
          <table class="ic-table" data-chart-table hidden><thead><tr><th>Month (2026)</th><th>Active passports</th></tr></thead><tbody>${o.active.map((v, i) => `<tr><td>${MONTHS[i]}</td><td>${nf.format(v)}</td></tr>`).join('')}</tbody></table>
          <p class="ic-foot">Passports opened at least once in the month. Peaks follow the summer travel season.</p>
        </section>

        <section class="icard ic-privacy">
          <h2>${icon('lock')} What you can see</h2>
          <ul class="ic-can"><li>${icon('check')} Enrollment and policy status</li><li>${icon('check')} Whether a passport is active, not its contents</li><li>${icon('check')} Assistance requests a policyholder sends</li><li>${icon('check')} Documents a policyholder authorizes for a specific claim, until the authorization expires</li></ul>
          <h3>Never visible to insurers</h3>
          <ul class="ic-cant"><li>${icon('close')} Full medical history or summaries</li><li>${icon('close')} Allergies, conditions or medications outside an authorized document</li><li>${icon('close')} Documents shared only with doctors</li></ul>
        </section>
      </div>

      <section class="icard" id="ic-as">
        <header><h2>Emergency assistance requests</h2><span class="ic-hint">Location and policy only. No medical details unless authorized.</span></header>
        <ul class="ic-assists">${assists.map((a) => `<li class="iassist iassist--${a.status.replace(' ', '-').toLowerCase()}">
          <span class="iassist__ic">${icon('siren')}</span>
          <span class="iassist__txt"><b>${esc(a.name)}${a.live ? ' <em>from this device</em>' : ''}</b><small>${icon('pin')} ${esc(a.where)} · ${when(a.at)}</small></span>
          <span class="istat istat--${a.status.replace(' ', '-').toLowerCase()}">${a.status}</span>
          ${a.status !== 'Resolved' ? `<button type="button" class="wbtn wbtn--line" data-assist="${a.id}" data-next="${a.status === 'New' ? 'In progress' : 'Resolved'}">${a.status === 'New' ? 'Take case' : 'Resolve'}</button>` : ''}
        </li>`).join('')}</ul>
      </section>

      <section class="icard" id="ic-cl">
        <header><h2>Documents authorized for claims review</h2><span class="ic-hint">Each authorization covers one claim and expires.</span></header>
        ${authed.length ? `<ul class="ic-claims">${authed.map((s) => {
          const t = travelerById(s.traveler);
          const recs = buildRecords(t, []).filter((r) => s.docs.includes(r.id));
          const stt = statusOf(s);
          return `<li class="iclaim iclaim--${stt}">
            <span class="iclaim__ph">${Portrait(t)}</span>
            <span class="iclaim__txt"><b>${esc(t.first)} ${esc(t.last)} · ${esc(s.claimRef || 'Claim')}</b><small>Policy ${esc(t.insurance.policy)} · ${recs.map((r) => esc(term(r.title, 'en'))).join(', ')}</small></span>
            <span class="istat istat--${stt}">${stt === 'active' ? `Until ${when(s.expiresAt)}` : stt === 'revoked' ? 'Revoked by patient' : 'Expired'}</span>
            ${stt === 'active' ? `<button type="button" class="wbtn" data-review="${s.id}">${icon('eye')} Review</button>` : `<span class="iclaim__lock">${icon('lock')}</span>`}
          </li>`;
        }).join('')}</ul>` : `<div class="ic-empty">${icon('file')}<b>No documents authorized yet</b><p>Policyholders authorize documents from <em>Sharing → My insurer</em> in their app. Try it: open the patient app, create a claim authorization, then come back.</p><a class="wbtn" href="#/app/share" target="_blank" rel="noopener">${icon('share')} Open patient sharing</a></div>`}
      </section>

      <section class="icard" id="ic-ph">
        <header><h2>Policyholders</h2><span class="ic-hint">Sample of ${nf.format(o.enrolled)}. Medical information is private.</span></header>
        <div class="ic-tablewrap"><table class="ic-table ic-table--people">
          <thead><tr><th>Policyholder</th><th>Plan</th><th>Policy</th><th>Passport</th><th>Medical details</th></tr></thead>
          <tbody>
            ${ours.map((t) => `<tr><td><span class="ic-person"><span class="ic-person__ph">${Portrait(t)}</span>${esc(t.first)} ${esc(t.last)}</span></td><td>${esc(t.insurance.plan)}</td><td>${esc(t.insurance.policy)}</td><td><span class="istat istat--active">Active · ${esc(t.trip.country)}</span></td><td class="ic-private">${icon('lock')} Private</td></tr>`).join('')}
            ${o.people.map(([n, plan, cc, s], i) => `<tr><td><span class="ic-person"><span class="ic-person__init">${n.split(' ').map((w) => w[0]).join('')}</span>${esc(n)}</span></td><td>${esc(plan)}</td><td>${esc(`${ins.id.slice(0, 3).toUpperCase()}-2026-${String(31000 + i * 1373).padStart(5, '0')}`)}</td><td><span class="istat istat--${s.replace(' ', '-').toLowerCase()}">${s}${s === 'Active' ? ` · ${cc}` : ''}</span></td><td class="ic-private">${icon('lock')} Private</td></tr>`).join('')}
          </tbody>
        </table></div>
      </section>

      <section class="icard ic-lic" id="ic-li">
        <header><h2>Licensing &amp; subscription</h2><span class="ic-hint">Annual license per policyholder</span></header>
        <div class="ic-lic__grid">
          <div class="ikpi"><span>License fee</span><b>€${LICENSE_FEE.toFixed(2)}</b><small>Per policyholder, per year</small></div>
          <div class="ikpi"><span>Annual license value</span><b>${eur(o.enrolled * LICENSE_FEE)}</b><small>${nf.format(o.enrolled)} seats</small></div>
          <div class="ikpi"><span>Activation rate</span><b>${((activeNow / o.enrolled) * 100).toFixed(0)}%</b><small>Active passports ÷ enrolled</small></div>
          <div class="ikpi"><span>Renewal</span><b>${o.renews}</b><small>Plan: Partner Annual</small></div>
        </div>
        <div class="ic-seats" role="img" aria-label="${nf.format(activeNow)} of ${nf.format(o.enrolled)} seats active"><span style="width:${(activeNow / o.enrolled) * 100}%"></span></div>
        <p class="ic-foot">${nf.format(activeNow)} of ${nf.format(o.enrolled)} licensed seats active this month. Policyholders use MediPassport free; the license is paid by ${esc(ins.full)}.</p>
      </section>
      <p class="app-note">Fictional insurers, policyholders and figures · simulated sign-in · demo only</p>
    </main>
  </div>`;
}

export const insurerConsole = {
  title: 'Insurer console · MediPassport',
  html: () => '<div data-ic></div>',
  mount(root) {
    const host = root.querySelector('[data-ic]');
    const q = (location.hash.match(/[?&]org=(\w+)/) || [])[1];
    const getOrg = () => { try { return sessionStorage.getItem(ORG_KEY); } catch { return null; } };
    if (q && ORGS[q]) { try { sessionStorage.setItem(ORG_KEY, q); } catch { /* ignore */ } }
    const render = () => { const k = getOrg(); host.innerHTML = k && ORGS[k] ? dashboard(k) : signIn(); };
    render();

    host.addEventListener('click', (e) => {
      const org = e.target.closest('[data-org]');
      if (org) { try { sessionStorage.setItem(ORG_KEY, org.dataset.org); } catch { /* ignore */ } render(); window.scrollTo(0, 0); return; }
      if (e.target.closest('[data-signout]')) { try { sessionStorage.removeItem(ORG_KEY); } catch { /* ignore */ } render(); return; }
      const j = e.target.closest('[data-jump]');
      if (j) { host.querySelector(`#ic-${j.dataset.jump}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const tb = e.target.closest('[data-table]');
      if (tb) {
        const tbl = host.querySelector('[data-chart-table]');
        tbl.hidden = !tbl.hidden;
        tb.setAttribute('aria-expanded', String(!tbl.hidden));
        tb.textContent = tbl.hidden ? 'Show table' : 'Hide table';
        return;
      }
      const a = e.target.closest('[data-assist]');
      if (a) {
        let st = {};
        try { st = JSON.parse(localStorage.getItem(ASSIST_STATE)) || {}; } catch { /* ignore */ }
        st[a.dataset.assist] = a.dataset.next;
        try { localStorage.setItem(ASSIST_STATE, JSON.stringify(st)); } catch { /* ignore */ }
        toast(a.dataset.next === 'Resolved' ? 'Request resolved.' : 'Case assigned to you.');
        render();
        return;
      }
      const rv = e.target.closest('[data-review]');
      if (rv) {
        const sh = claimAuthorizations().find((s) => s.id === rv.dataset.review);
        if (!sh || statusOf(sh) !== 'active') { toast('This authorization is no longer valid.'); render(); return; }
        const t = travelerById(sh.traveler);
        const recs = buildRecords(t, []).filter((r) => sh.docs.includes(r.id));
        logEvent(sh.id, 'opened', 'Insurer claims review');
        openSheet({
          title: `${sh.claimRef || 'Claim'} · ${t.first} ${t.last}`,
          html: `<div class="ic-review"><p class="ic-review__note">${icon('lock')} Authorized by the policyholder for this claim only, until ${when(sh.expiresAt)}. Shown in English with the original.</p>
            ${recs.map((r) => `<article class="pt-rec" data-rrec="${r.id}"><h3 class="ic-review__t">${esc(term(r.title, 'en'))} · ${fmtDate(r.date, 'en')}</h3>${layeredViewer(t, r, 'en', 'compare')}</article>`).join('')}</div>`,
          mount: (sheet) => sheet.querySelectorAll('[data-lview]').forEach((lv) => bindViewer(lv.parentElement)),
        });
        recs.forEach((r) => logEvent(sh.id, 'viewed', `Insurer · ${term(r.title, 'en')}`));
      }
    });

    // Chart tooltip (hover + keyboard focus)
    const showTip = (g) => {
      const box = host.querySelector('[data-tip-box]');
      const wrap = host.querySelector('[data-chart]');
      if (!g || !box) { if (box) box.hidden = true; return; }
      const r = g.querySelector('path').getBoundingClientRect(), w = wrap.getBoundingClientRect();
      box.textContent = g.dataset.tip; box.hidden = false;
      box.style.left = `${r.left - w.left + r.width / 2}px`; box.style.top = `${r.top - w.top - 8}px`;
      host.querySelectorAll('.ichart__bar').forEach((b) => b.classList.toggle('is-hover', b === g));
    };
    host.addEventListener('pointerover', (e) => { const g = e.target.closest('.ichart__bar'); if (g) showTip(g); });
    host.addEventListener('pointerout', (e) => { if (e.target.closest('.ichart__bar') && !e.relatedTarget?.closest?.('.ichart__bar')) showTip(null); });
    host.addEventListener('focusin', (e) => { const g = e.target.closest('.ichart__bar'); if (g) showTip(g); });
    host.addEventListener('focusout', (e) => { if (e.target.closest('.ichart__bar')) showTip(null); });
    const onStorage = () => { if (getOrg()) render(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
};
