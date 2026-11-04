// Landing page. Sections: hero · language marquee · problem · 01 passport ·
// 02 AI translation · 03 emergency · 04 insurers · closing CTA.
import { icon } from '../icons.js';
import { Button, Tag, Eyebrow, SplitHeading, Widget, Phone, PassportBooklet, QR, ROUTES } from '../components.js';
import { observeReveals } from '../interactions.js';

/* ------------------------------------------------------------------ Data */
// Sample record (illustrative). Original is the traveler's home-language file (Hebrew).
const ORIGINAL = {
  lang: 'עברית', dir: 'rtl', source: 'Home clinic file · scanned',
  rows: [
    ['אלרגיה', 'פניצילין: תגובה חמורה (אנפילקסיס)'],
    ['מחלה כרונית', 'סוכרת סוג 1'],
    ['תרופות', 'אינסולין גלרגין, 20 יחידות בערב'],
    ['סוג דם', 'O חיובי'],
  ],
};
const TRANSLATIONS = {
  en: { name: 'English', dir: 'ltr', rows: [
    ['Allergy', 'Penicillin: severe reaction (anaphylaxis)'],
    ['Chronic condition', 'Type 1 diabetes'],
    ['Medication', 'Insulin glargine, 20 units in the evening'],
    ['Blood type', 'O positive'],
  ] },
  es: { name: 'Español', dir: 'ltr', rows: [
    ['Alergia', 'Penicilina: reacción grave (anafilaxia)'],
    ['Enfermedad crónica', 'Diabetes tipo 1'],
    ['Medicación', 'Insulina glargina, 20 unidades por la noche'],
    ['Grupo sanguíneo', 'O positivo'],
  ] },
  fr: { name: 'Français', dir: 'ltr', rows: [
    ['Allergie', 'Pénicilline : réaction grave (anaphylaxie)'],
    ['Maladie chronique', 'Diabète de type 1'],
    ['Traitement', 'Insuline glargine, 20 unités le soir'],
    ['Groupe sanguin', 'O positif'],
  ] },
  ja: { name: '日本語', dir: 'ltr', rows: [
    ['アレルギー', 'ペニシリン:重度の反応(アナフィラキシー)'],
    ['慢性疾患', '1型糖尿病'],
    ['服用薬', 'インスリン グラルギン 20単位(夜)'],
    ['血液型', 'O型 Rh+'],
  ] },
  de: { name: 'Deutsch', dir: 'ltr', rows: [
    ['Allergie', 'Penicillin: schwere Reaktion (Anaphylaxie)'],
    ['Chronische Erkrankung', 'Typ-1-Diabetes'],
    ['Medikation', 'Insulin glargin, 20 Einheiten abends'],
    ['Blutgruppe', '0 positiv'],
  ] },
};

const LANGS = ['Español', '日本語', 'Français', 'ไทย', 'Deutsch', 'Ελληνικά', 'Português', 'Italiano', 'Türkçe', '한국어', 'Nederlands', 'עברית'];

const CLINICS = [
  { name: 'Central University Hospital', type: 'Hospital · ER 24/7', dist: '1.2 km', x: 62, y: 38 },
  { name: 'Eixample Medical Centre', type: 'Clinic · English-speaking', dist: '2.0 km', x: 34, y: 58 },
  { name: 'Provença Pharmacy', type: 'Pharmacy · open now', dist: '0.4 km', x: 80, y: 60 },
];

/* ------------------------------------------------------------ Fragments */
const phoneScreen = () => `
  <div class="app">
    <div class="app__top">
      <div><div class="app__hello">Hola, Maya</div><div class="app__where">${icon('pin', 'width="11" height="11"')} Barcelona, ES</div></div>
      <span class="app__avatar">MS</span>
    </div>
    <div class="app__pass">
      <div class="app__pass-head"><span class="app__pass-brand">Medical Passport</span><span class="app__pass-flag">ES · EN</span></div>
      <div class="app__pass-name">Maya Stein</div>
      <div class="app__pass-meta"><span>ID 0412 · 7781</span><span>Verified</span></div>
    </div>
    <div class="app__label">Critical info</div>
    <div class="app__grid">
      <div class="app__tile app__tile--alert"><span>Allergy</span><b>Penicillin</b></div>
      <div class="app__tile app__tile--mint"><span>Blood</span><b>O+</b></div>
      <div class="app__tile"><span>Condition</span><b>Type 1 diabetes</b></div>
      <div class="app__tile app__tile--peach"><span>Meds</span><b>Insulin</b></div>
    </div>
    <div class="app__share">${icon('qr', 'width="15" height="15"')} Share with doctor</div>
  </div>`;

const botanical = (cls = '') => `
  <svg class="botanical ${cls}" viewBox="0 0 200 320" fill="none" aria-hidden="true">
    <path d="M100 318C98 240 96 170 104 20" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    ${[40, 80, 120, 160, 200, 240].map((y, i) => {
      const s = 1 - i * 0.1;
      return `<path d="M${101 - i * 0.6} ${y + 40}c-${30 * s} -${6 * s} -${58 * s} -${28 * s} -${66 * s} -${58 * s}c${30 * s} ${2 * s} ${56 * s} ${22 * s} ${66 * s} ${58 * s}z" fill="currentColor" opacity="${0.9 - i * 0.06}"/>
              <path d="M${101 - i * 0.6} ${y + 22}c${30 * s} -${6 * s} ${58 * s} -${28 * s} ${66 * s} -${58 * s}c-${30 * s} ${2 * s} -${56 * s} ${22 * s} -${66 * s} ${58 * s}z" fill="currentColor" opacity="${0.8 - i * 0.06}"/>`;
    }).join('')}
  </svg>`;

const pebble = (cls, style = '') => `<span class="stone ${cls}" style="${style}" aria-hidden="true"></span>`;

/* ------------------------------------------------------------------ Page */
export const landingPage = {
  title: 'MediPassport · Your Medical History. Anywhere.',
  html: () => `
  <!-- ============================================================ HERO -->
  <section class="hero" aria-labelledby="hero-title">
    <div class="container hero__grid">
      <div class="hero__copy">
        <div class="hero__tags reveal">
          ${Tag('<span class="dot-live"></span> Free with your travel insurance')}
          ${Tag('AI translation', { iconName: 'sparkle', variant: 'outline', cls: 'hide-sm' })}
        </div>
        ${SplitHeading('h1', ['Your Medical', 'History.', '<span class="serif">Anywhere.</span>'], 'h1 hero__title')}
        <div class="hero__sub">
          <p class="lead reveal" style="--delay:350ms">One secure passport for your allergies, conditions, medications and test results. Translated for any doctor, in any country, the moment you need care.</p>
          <div class="hero__ctas reveal" style="--delay:450ms">
            ${Button({ label: 'Guided demo', href: '#/tour' })}
            ${Button({ label: 'Explore the app', href: ROUTES.demo, variant: 'ghost', iconName: 'play' })}
          </div>
        </div>
      </div>

      <div class="hero__stage" data-parallax>
        <div class="hero__arch grain" aria-hidden="true">
          <span class="blob" style="width:70%;height:55%;left:-10%;top:-5%;background:var(--mint)"></span>
          <span class="blob" style="width:60%;height:50%;right:-15%;bottom:5%;background:var(--cream);animation-delay:-8s"></span>
          ${botanical('hero__leaf')}
        </div>
        ${pebble('stone--peach hero__stone-a', '')}
        ${pebble('stone--mint hero__stone-b', '')}

        <div class="hero__passport" data-depth="0.5">${PassportBooklet('Maya Stein')}</div>
        <div class="hero__phone" data-depth="1">${Phone(phoneScreen())}</div>

        <div class="hero__w hero__w--allergy float" data-depth="1.8" style="--float-delay:-1s">
          ${Widget({ label: 'Allergy · flagged', value: 'Penicillin', iconName: 'alert', style: '--rot:-4deg' })}
        </div>
        <div class="hero__w hero__w--lang float" data-depth="1.4" style="--float-delay:-3s">
          ${Widget({ variant: 'mint', label: 'Translating', iconName: 'translate', value: '<span data-hero-lang>Español</span>', style: '--rot:3deg' })}
        </div>
        <div class="hero__w hero__w--qr float" data-depth="2.2" style="--float-delay:-5s">
          ${Widget({ variant: 'black', cls: 'widget--qr', style: '--rot:-3deg', body: `<div class="hero__qr">${QR(3, { fg: '#FBF3EB', bg: 'transparent' })}</div><div class="widget__label">Doctor access</div><div class="widget__value" data-hero-timer>00:59:59</div>` })}
        </div>
        <div class="hero__w hero__w--blood float" data-depth="1.2" style="--float-delay:-2s">
          ${Widget({ variant: 'peach', label: 'Blood type', value: 'O positive', iconName: 'drop', style: '--rot:5deg' })}
        </div>
      </div>
    </div>

    <div class="hero__foot container">
      <a class="hero__scroll" href="${ROUTES.home}" data-scroll="problem">${icon('arrow')}<span>Scroll</span></a>
      <ul class="hero__facts">
        <li><b>4</b> record types: files, scans, prescriptions, tests</li>
        <li><b>QR</b> access that expires after the visit</li>
        <li><b>B2B2C</b> licensed by insurers, free for you</li>
      </ul>
    </div>
  </section>

  <!-- ============================================================ MARQUEE -->
  <div class="marquee" aria-hidden="true">
    <div class="marquee__track">
      ${[0, 1].map(() => LANGS.map((l, i) => `<span class="${i % 2 ? 'serif' : ''}">${l}</span><span class="marquee__dot">${icon('sparkle')}</span>`).join('')).join('')}
    </div>
  </div>

  <!-- ============================================================ PROBLEM -->
  <section class="section problem" id="problem" aria-labelledby="problem-title">
    <div class="container problem__grid">
      <div class="problem__aside reveal">
        ${Eyebrow('00', 'The gap')}
        <p class="problem__note">Your history lives in a clinic back home, in a local system, in your own language.</p>
      </div>
      <h2 id="problem-title" class="quote problem__quote reveal">
        Get sick abroad and the doctor meets a stranger. <span class="problem__muted">No allergies, no conditions, no medication list. Only what you remember, in a language they may not read.</span>
      </h2>
      <div class="problem__cards">
        <div class="problem__card card card--gray reveal" style="--delay:0ms">${icon('flask')}<h3>Repeated tests</h3><p>Results from home aren't available, so they're done again.</p></div>
        <div class="problem__card card card--peach reveal" style="--delay:120ms">${icon('translate')}<h3>Lost in translation</h3><p>Documents arrive in a language the doctor can't verify.</p></div>
        <div class="problem__card card card--mint reveal" style="--delay:240ms">${icon('receipt')}<h3>Hard-to-verify claims</h3><p>Insurers can't check care when records are missing.</p></div>
      </div>
    </div>
  </section>

  <!-- ============================================================ 01 PASSPORT -->
  <section class="section feature feature--passport" id="passport" aria-labelledby="passport-title">
    <div class="container">
      <header class="feature__head">
        <div class="reveal">${Eyebrow('01', 'Medical Passport')}</div>
        ${SplitHeading('h2', ['Every record,', '<span class="serif">one passport.</span>'], 'h2 feature__title')}
        <p class="lead reveal">Upload files or scan paper documents with your phone camera. Prescriptions, test results and health history, kept in one secure place.</p>
      </header>

      <div class="bento">
        <article class="bento__a card card--mint grain reveal" data-fan>
          <div class="bento__label">${Tag('Your file', { iconName: 'stack' })}<span class="bento__hint">Hover to open</span></div>
          <div class="docs" aria-hidden="true">
            <div class="doc doc--1"><span class="doc__type">Prescription</span><b>Insulin glargine</b><span class="doc__lines"><i></i><i></i><i style="width:60%"></i></span><span class="doc__stamp">Rx</span></div>
            <div class="doc doc--2"><span class="doc__type">Blood panel</span><b>HbA1c · 6.8%</b><span class="doc__lines"><i></i><i style="width:75%"></i><i></i></span><span class="doc__stamp doc__stamp--mint">Lab</span></div>
            <div class="doc doc--3"><span class="doc__type">Allergy record</span><b>Penicillin</b><span class="doc__lines"><i style="width:80%"></i><i></i><i style="width:50%"></i></span><span class="doc__stamp doc__stamp--alert">!</span></div>
          </div>
          <h3 class="h3 bento__title">Allergies, conditions, medications <span class="serif">and</span> results.</h3>
        </article>

        <article class="bento__b card card--black grain reveal" style="--delay:100ms">
          <div class="scan" aria-hidden="true">
            <div class="scan__paper"><span></span><span></span><span style="width:70%"></span><span></span><span style="width:45%"></span></div>
            <span class="scan__line"></span>
            <span class="scan__corner scan__corner--tl"></span><span class="scan__corner scan__corner--tr"></span>
            <span class="scan__corner scan__corner--bl"></span><span class="scan__corner scan__corner--br"></span>
          </div>
          <div>
            ${Tag('Camera scan', { iconName: 'camera', variant: 'mint' })}
            <h3 class="h3 bento__title">Paper in, <span class="serif">passport</span> out.</h3>
          </div>
        </article>

        <article class="bento__c card card--peach grain reveal" style="--delay:180ms">
          ${icon('lock', 'class="bento__icon"')}
          <h3 class="h3 bento__title">Private <span class="serif">by default.</span></h3>
          <p>Nothing is shared until you choose who sees it, and for how long.</p>
        </article>

        <article class="bento__d card reveal" style="--delay:240ms">
          <ul class="cats">
            <li><span>${icon('file')} Health history</span><b>12</b></li>
            <li><span>${icon('rx')} Prescriptions</span><b>4</b></li>
            <li><span>${icon('flask')} Test results</span><b>9</b></li>
            <li><span>${icon('alert')} Allergies</span><b>1</b></li>
          </ul>
        </article>
      </div>
    </div>
  </section>

  <!-- ============================================================ 02 TRANSLATION -->
  <section class="section feature feature--dark grain" id="translation" aria-labelledby="translation-title">
    <span class="blob" style="width:40vw;height:40vw;right:-10vw;top:-10vw;background:var(--peach);opacity:.25"></span>
    <div class="container">
      <header class="feature__head feature__head--split">
        <div>
          <div class="reveal">${Eyebrow('02', 'AI Translation')}</div>
          ${SplitHeading('h2', ['Read by any doctor,', '<span class="serif">in their language.</span>'], 'h2 feature__title')}
        </div>
        <p class="lead reveal">AI translates your file into the language of the country you're in, and shows it next to the original so the doctor can check every line.</p>
      </header>

      <div class="translator reveal">
        <div class="translator__bar">
          <div class="segmented segmented--light" role="group" aria-label="Translate to" data-seg>
            <span class="segmented__thumb" aria-hidden="true"></span>
            ${Object.entries(TRANSLATIONS).map(([k, v], i) => `<button type="button" data-lang="${k}" aria-pressed="${i === 0}">${v.name}</button>`).join('')}
          </div>
          <span class="translator__status" aria-live="polite"><span class="dot-live"></span><span data-tr-status>Translated · verified side by side</span></span>
        </div>

        <div class="translator__cols">
          <article class="sheet sheet--orig" lang="he" dir="rtl">
            <div class="sheet__head"><span class="label">Original · ${ORIGINAL.lang}</span><span class="sheet__src">${ORIGINAL.source}</span></div>
            <dl class="sheet__rows">${ORIGINAL.rows.map(([k, v], i) => `<div class="sheet__row ${i === 0 ? 'is-alert' : ''}" data-row="${i}"><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
          </article>

          <div class="translator__swap" aria-hidden="true">${icon('swap')}</div>

          <article class="sheet sheet--tr" data-tr-sheet>
            <div class="sheet__head"><span class="label">AI translation · <span data-tr-name>English</span></span>${Tag('Doctor view', { iconName: 'eye', variant: 'mint' })}</div>
            <dl class="sheet__rows" data-tr-rows></dl>
          </article>
        </div>
        <p class="translator__note">${icon('sparkle', 'width="14" height="14"')} Hover a line to see its match in the original. Sample record shown.</p>
      </div>
    </div>
  </section>

  <!-- ============================================================ 03 EMERGENCY -->
  <section class="section feature feature--emergency" id="emergency" aria-labelledby="emergency-title">
    <div class="container">
      <header class="feature__head">
        <div class="reveal">${Eyebrow('03', 'Emergency Assistance')}</div>
        ${SplitHeading('h2', ['Care nearby.', '<span class="serif">Access that expires.</span>'], 'h2 feature__title')}
        <p class="lead reveal">Find clinics and hospitals near you that work with your insurer. Share your file with one scan of a QR code, valid only for the visit.</p>
      </header>

      <div class="emergency">
        <article class="map card grain reveal" aria-label="Nearby in-network care, sample map">
          <svg class="map__svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <path d="M-5 30 C20 25 30 45 55 40 S90 20 110 28" class="map__road map__road--main"/>
            <path d="M-5 72 C25 80 45 60 70 66 S95 85 110 80" class="map__road"/>
            <path d="M28 -5 C30 30 22 60 32 110" class="map__road"/>
            <path d="M72 -5 C66 25 78 60 70 110" class="map__road map__road--main"/>
            <path d="M-5 50 L110 56" class="map__road map__road--thin"/>
            <path d="M48 -5 L52 110" class="map__road map__road--thin"/>
            <ellipse cx="85" cy="88" rx="22" ry="14" class="map__park"/>
            <ellipse cx="12" cy="12" rx="16" ry="10" class="map__park"/>
          </svg>
          <span class="map__me" style="left:46%;top:50%"><span></span></span>
          ${CLINICS.map((c, i) => `<button type="button" class="map__pin" style="left:${c.x}%;top:${c.y}%" data-pin="${i}" aria-label="${c.name}, ${c.dist}">${icon(i === 2 ? 'rx' : 'building')}</button>`).join('')}
          <div class="map__panel">
            <div class="map__panel-head"><span class="label">In your network</span>${Tag('3 nearby', { variant: 'mint' })}</div>
            <ul class="map__list">
              ${CLINICS.map((c, i) => `<li><button type="button" data-clinic="${i}" aria-pressed="${i === 0}"><span><b>${c.name}</b><small>${c.type}</small></span><span class="map__dist">${c.dist}</span></button></li>`).join('')}
            </ul>
          </div>
        </article>

        <article class="access card card--black grain reveal" style="--delay:120ms" data-access>
          <div class="access__head">
            <span class="label">Temporary doctor access</span>
            <span class="access__state" data-access-state><span class="dot-live"></span> Active</span>
          </div>
          <div class="access__qr-wrap">
            <div class="access__qr">${QR(11, { fg: '#000', bg: '#FBF3EB' })}</div>
            <svg class="access__ring" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="56"/><circle cx="60" cy="60" r="56" data-ring/></svg>
          </div>
          <div class="access__timer"><span class="label">Expires in</span><b data-access-timer>00:59:59</b></div>
          <ol class="access__steps">
            <li><span>1</span> Doctor scans</li>
            <li><span>2</span> Views translated file</li>
            <li><span>3</span> Access ends</li>
          </ol>
          ${Button({ label: 'Revoke access', type: 'button', variant: 'light', size: 'sm', iconName: 'close', attrs: 'data-access-toggle', cls: 'btn--block' })}
        </article>

        <aside class="sos card card--peach grain reveal" style="--delay:200ms">
          ${icon('phone', 'class="bento__icon"')}
          <div><span class="label">Local emergency number</span><b class="sos__num">112</b><p>Shown for the country you're in. Spain, and across the EU.</p></div>
        </aside>
      </div>
    </div>
  </section>

  <!-- ============================================================ 04 INSURERS -->
  <section class="section feature feature--insurers" id="insurers" aria-labelledby="insurers-title">
    <div class="container">
      <div class="insurers">
        <div class="insurers__copy">
          <div class="reveal">${Eyebrow('04', 'Insurance Integration')}</div>
          ${SplitHeading('h2', ['Built with', '<span class="serif">your insurer.</span>'], 'h2 feature__title')}
          <p class="lead reveal">Travel insurers license MediPassport for their policyholders and offer it free. When you need care, translated records reach the insurer directly, so claims are clearer and tests aren't repeated.</p>
          <div class="reveal hero__ctas" style="--delay:120ms">${Button({ label: 'Partner with us', href: ROUTES.partners, variant: 'primary' })}${Button({ label: 'Insurer console demo', href: '#/insurer', variant: 'ghost', iconName: 'eye' })}</div>
        </div>

        <ol class="flow" aria-label="How MediPassport connects insurer, traveler and doctor">
          <li class="flow__step card card--cream reveal">
            <span class="flow__n">A</span>${icon('umbrella')}
            <div><h3>Insurer</h3><p>Pays an annual license per policyholder.</p></div>
          </li>
          <li class="flow__step card card--mint reveal" style="--delay:100ms">
            <span class="flow__n">B</span>${icon('user')}
            <div><h3>Traveler</h3><p>Gets the app free with their policy.</p></div>
          </li>
          <li class="flow__step card card--peach reveal" style="--delay:200ms">
            <span class="flow__n">C</span>${icon('heart')}
            <div><h3>Doctor abroad</h3><p>Treats with the full, translated history.</p></div>
          </li>
          <li class="flow__step card card--black reveal" style="--delay:300ms">
            <span class="flow__n">D</span>${icon('receipt')}
            <div><h3>Claim</h3><p>Arrives with verified, translated records.</p></div>
          </li>
        </ol>
      </div>
    </div>
  </section>

  <!-- ============================================================ CTA -->
  <section class="section cta-wrap" aria-labelledby="cta-title">
    <div class="container">
      <div class="cta grain">
        <span class="blob" style="width:50%;height:70%;left:-10%;bottom:-30%;background:var(--mint);opacity:.35"></span>
        <span class="blob" style="width:40%;height:60%;right:5%;top:-30%;background:var(--peach);opacity:.35;animation-delay:-6s"></span>
        <div class="cta__copy">
          ${SplitHeading('h2', ['Pack light.', '<span class="serif">Bring your history.</span>'], 'h2 cta__title')}
          <p class="lead reveal">Set up your passport before you fly. It takes a few minutes and comes with your travel policy.</p>
          <div class="hero__ctas reveal">
            ${Button({ label: 'Get Started', href: ROUTES.start, variant: 'light' })}
            ${Button({ label: 'Explore Demo', href: ROUTES.demo, variant: 'ghost-light', iconName: 'play' })}
          </div>
        </div>
        <div class="cta__visual" aria-hidden="true">
          ${PassportBooklet('Maya Stein', 'cta__passport')}
          <div class="cta__stamp">${icon('check')} Ready to travel</div>
        </div>
      </div>
    </div>
  </section>`,

  mount(root) {
    const cleanups = [observeReveals(root)];
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    cleanups.push(mountHeroParallax(root, reduce));
    cleanups.push(mountHeroTicker(root, reduce));
    cleanups.push(mountTranslator(root));
    cleanups.push(mountEmergency(root));
    cleanups.push(mountFan(root));

    return () => cleanups.forEach((fn) => typeof fn === 'function' && fn());
  },
};

/* ------------------------------------------------------------ Behaviour */
function mountHeroParallax(root, reduce) {
  const stage = root.querySelector('[data-parallax]');
  if (!stage || reduce || !matchMedia('(pointer: fine)').matches) return null;
  const layers = [...stage.querySelectorAll('[data-depth]')];
  const passport = stage.querySelector('.passport');
  let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;

  const loop = () => {
    cx += (tx - cx) * 0.08;
    cy += (ty - cy) * 0.08;
    layers.forEach((l) => {
      const d = parseFloat(l.dataset.depth);
      l.style.transform = `translate3d(${cx * d * 14}px, ${cy * d * 14}px, 0)`;
    });
    if (passport) {
      passport.style.setProperty('--sx', `${50 + cx * 40}%`);
      passport.style.setProperty('--sy', `${30 + cy * 40}%`);
    }
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.001 ? requestAnimationFrame(loop) : 0;
  };
  const onMove = (e) => {
    const r = stage.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (!raf) raf = requestAnimationFrame(loop);
  };
  const onLeave = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(loop); };
  window.addEventListener('pointermove', onMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', onMove);
    document.documentElement.removeEventListener('pointerleave', onLeave);
  };
}

function fmt(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function mountHeroTicker(root, reduce) {
  const langEl = root.querySelector('[data-hero-lang]');
  const timerEl = root.querySelector('[data-hero-timer]');
  const names = ['Español', 'Français', '日本語', 'Deutsch', 'Ελληνικά', 'ไทย'];
  let i = 0, left = 3599;
  const langTimer = reduce ? 0 : setInterval(() => {
    i = (i + 1) % names.length;
    langEl.classList.add('is-swapping');
    setTimeout(() => { langEl.textContent = names[i]; langEl.classList.remove('is-swapping'); }, 220);
  }, 2400);
  const clock = setInterval(() => { left = left > 0 ? left - 1 : 3599; timerEl.textContent = fmt(left); }, 1000);
  return () => { clearInterval(langTimer); clearInterval(clock); };
}

function moveThumb(seg) {
  const thumb = seg.querySelector('.segmented__thumb');
  const active = seg.querySelector('[aria-pressed="true"]');
  if (!thumb || !active) return;
  thumb.style.width = `${active.offsetWidth}px`;
  thumb.style.transform = `translateX(${active.offsetLeft}px)`;
}

function mountTranslator(root) {
  const seg = root.querySelector('[data-seg]');
  const rowsEl = root.querySelector('[data-tr-rows]');
  const nameEl = root.querySelector('[data-tr-name]');
  const sheet = root.querySelector('[data-tr-sheet]');
  const status = root.querySelector('[data-tr-status]');
  let swapTimer = 0;

  const render = (key, animate) => {
    const t = TRANSLATIONS[key];
    nameEl.textContent = t.name;
    sheet.setAttribute('lang', key);
    rowsEl.innerHTML = t.rows
      .map(([k, v], i) => `<div class="sheet__row ${i === 0 ? 'is-alert' : ''} ${animate ? 'is-typing' : ''}" data-row="${i}" style="--i:${i}"><dt>${k}</dt><dd>${v}</dd></div>`)
      .join('');
    if (animate) {
      status.textContent = 'Translating…';
      clearTimeout(swapTimer);
      swapTimer = setTimeout(() => { status.textContent = 'Translated · verified side by side'; }, 900);
    }
  };

  seg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-lang]');
    if (!b || b.getAttribute('aria-pressed') === 'true') return;
    seg.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    moveThumb(seg);
    render(b.dataset.lang, true);
  });

  // Hovering a translated line highlights its source line, and vice versa.
  const link = (e) => {
    const row = e.target.closest('.sheet__row');
    const idx = row ? row.dataset.row : null;
    root.querySelectorAll('.translator .sheet__row').forEach((r) => r.classList.toggle('is-linked', r.dataset.row === idx));
  };
  const translator = root.querySelector('.translator');
  translator.addEventListener('pointerover', link);
  translator.addEventListener('pointerleave', () => root.querySelectorAll('.translator .sheet__row').forEach((r) => r.classList.remove('is-linked')));

  render('en', false);
  requestAnimationFrame(() => moveThumb(seg));
  const onResize = () => moveThumb(seg);
  window.addEventListener('resize', onResize);
  document.fonts?.ready.then(() => moveThumb(seg));
  return () => { window.removeEventListener('resize', onResize); clearTimeout(swapTimer); };
}

function mountEmergency(root) {
  // Clinic list <-> map pins
  const pins = root.querySelectorAll('[data-pin]');
  const items = root.querySelectorAll('[data-clinic]');
  const select = (i) => {
    items.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.clinic === String(i))));
    pins.forEach((p) => p.classList.toggle('is-active', p.dataset.pin === String(i)));
  };
  items.forEach((b) => b.addEventListener('click', () => select(b.dataset.clinic)));
  pins.forEach((p) => p.addEventListener('click', () => select(p.dataset.pin)));
  select(0);

  // QR access countdown + revoke
  const card = root.querySelector('[data-access]');
  const timerEl = card.querySelector('[data-access-timer]');
  const ring = card.querySelector('[data-ring]');
  const state = card.querySelector('[data-access-state]');
  const toggle = card.querySelector('[data-access-toggle]');
  const label = toggle.querySelector('span');
  const TOTAL = 3600;
  const C = 2 * Math.PI * 56;
  ring.style.strokeDasharray = `${C}`;
  let left = TOTAL - 1, active = true;

  const paint = () => {
    timerEl.textContent = active ? fmt(left) : '00:00:00';
    ring.style.strokeDashoffset = `${active ? C * (1 - left / TOTAL) : C}`;
  };
  const tick = setInterval(() => {
    if (!active) return;
    left = left > 0 ? left - 1 : TOTAL - 1;
    paint();
  }, 1000);
  toggle.addEventListener('click', () => {
    active = !active;
    if (active) left = TOTAL - 1;
    card.classList.toggle('is-revoked', !active);
    state.innerHTML = active ? '<span class="dot-live"></span> Active' : 'Revoked';
    label.textContent = active ? 'Revoke access' : 'Create new code';
    paint();
  });
  paint();
  return () => clearInterval(tick);
}

function mountFan(root) {
  // Touch devices: tap to fan the document stack (hover handles desktop).
  const el = root.querySelector('[data-fan]');
  if (!el) return null;
  const onClick = () => el.classList.toggle('is-open');
  el.addEventListener('click', onClick);
  return () => el.removeEventListener('click', onClick);
}
