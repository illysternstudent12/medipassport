// Secondary routes. Fully styled and navigable; the real onboarding, demo
// walkthrough and partner flows arrive in later batches.
import { icon } from '../icons.js';
import { Button, Tag, SplitHeading, ROUTES } from '../components.js';
import { observeReveals } from '../interactions.js';

const back = `<a class="stub__back link" href="${ROUTES.home}">${icon('arrow', 'style="rotate:180deg"')} Back to home</a>`;

const mountReveals = (root) => {
  const off = observeReveals(root);
  root.querySelectorAll('.split').forEach((el) => requestAnimationFrame(() => el.classList.add('is-in')));
  return off;
};

export const partnersPage = {
  title: 'Partner with us · MediPassport',
  html: () => `
  <section class="stub">
    <div class="container">
      ${back}
      <div class="stub__grid">
        <div class="stub__copy">
          ${Tag('Partner portal · coming soon', { iconName: 'umbrella', variant: 'mint' })}
          ${SplitHeading('h1', ['Partner with', '<span class="serif">MediPassport.</span>'], 'h2 stub__title')}
          <p class="lead">Offer every policyholder a digital medical passport, licensed annually per policyholder. Partner onboarding opens in a later release.</p>
          <div class="hero__ctas">${Button({ label: 'How it works', href: ROUTES.home, attrs: 'data-scroll="insurers"' })}${Button({ label: 'Insurer console demo', href: '#/insurer', variant: 'ghost', iconName: 'eye' })}</div>
        </div>
        <ol class="steps">
          <li class="steps__item card card--cream reveal"><span class="steps__n">1</span><div><h3>License per policyholder</h3><p>One annual fee, included in your travel policies.</p></div></li>
          <li class="steps__item card card--mint reveal" style="--delay:90ms"><span class="steps__n">2</span><div><h3>Offer it free</h3><p>Your customers get the app at no cost.</p></div></li>
          <li class="steps__item card card--black reveal" style="--delay:180ms"><span class="steps__n">3</span><div><h3>Receive translated records</h3><p>Check claims with documents you can read.</p></div></li>
        </ol>
      </div>
    </div>
  </section>`,
  mount: mountReveals,
};

export const notFoundPage = {
  title: 'Not found · MediPassport',
  html: () => `
  <section class="stub stub--center">
    <div class="container">
      <p class="stub__404" aria-hidden="true">4<span class="serif">0</span>4</p>
      <h1 class="h3">This page took a different flight.</h1>
      <div class="hero__ctas" style="justify-content:center;margin-top:1.5rem">${Button({ label: 'Back to home', href: ROUTES.home })}</div>
    </div>
  </section>`,
};
