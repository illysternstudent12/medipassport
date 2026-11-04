// Present mode (#/present): for pitching on a laptop or projector.
// The app runs inside a phone frame, the doctor's screen appears beside it
// when the story gets there, and the guide sits on the right. Developer and
// setup links are hidden; text is slightly larger. On phones, present mode
// just runs the guided demo full-screen.
import { icon } from './icons.js';
import { BrandMark } from './components.js';
import { attachStage, detachStage, startTour, tourActive, confirmReset } from './tour.js';
import { setPresenting, presenting } from './fx.js';

const PHONE = { w: 390, h: 844 };
const DESK = { w: 1180, h: 780 };

export const presentPage = {
  title: 'Present · MediPassport',
  html: () => `<div class="stage" data-stage>
    <header class="stage__bar">
      <span class="stage__brand">${BrandMark()}<span>MediPassport <em>guided demo</em></span></span>
      <span class="stage__live"><i></i> Fictional data · live maps &amp; on-device reading · simulated insurers</span>
      <div class="stage__acts">
        <button type="button" class="stage__btn" data-restart>${icon('play')}<span>Restart</span></button>
        <button type="button" class="stage__btn" data-reset>${icon('refresh')}<span>Reset demo</span></button>
        <button type="button" class="stage__btn stage__btn--dark" data-leave>${icon('close')}<span>Exit present mode</span></button>
      </div>
    </header>
    <div class="stage__floor">
      <figure class="stage__phone" data-phone-wrap>
        <div class="stage__device" data-phone-scale><span class="stage__notch" aria-hidden="true"></span><iframe title="Patient’s phone" name="mp-stage" data-phone></iframe></div>
        <figcaption>Lukas’s phone</figcaption>
      </figure>
      <figure class="stage__doctor" data-doctor-wrap hidden>
        <div class="stage__window" data-doctor-scale>
          <div class="stage__chrome"><i></i><i></i><i></i><span data-doctor-title>Doctor’s computer · Tokyo</span></div>
          <iframe title="Doctor’s computer" name="mp-stage" data-doctor></iframe>
        </div>
        <figcaption data-doctor-cap>Doctor’s computer</figcaption>
      </figure>
      <div class="stage__guide" data-guide></div>
    </div>
  </div>`,
  mount(root) {
    if (!matchMedia('(min-width: 960px)').matches) {
      // Phones: the phone *is* the device. Run the guide full-screen instead.
      setPresenting(true);
      location.replace('#/tour');
      return null;
    }
    setPresenting(true);
    const phone = root.querySelector('[data-phone]');
    const doctor = root.querySelector('[data-doctor]');
    const dWrap = root.querySelector('[data-doctor-wrap]');
    const floor = root.querySelector('.stage__floor');
    phone.src = `${location.pathname}${tourActive() ? '#/get-started' : '#/app'}`;
    doctor.src = 'about:blank';

    const fit = () => {
      const availH = innerHeight - 150;
      const ps = Math.min(1, availH / PHONE.h);
      const pScale = root.querySelector('[data-phone-scale]');
      pScale.style.setProperty('--s', ps);
      root.querySelector('[data-phone-wrap]').style.width = `${PHONE.w * ps + 24}px`;
      const guideW = 380;
      const room = floor.clientWidth - (PHONE.w * ps + 24) - guideW - 64;
      const ds = Math.max(0.3, Math.min(1, room / DESK.w, availH / (DESK.h + 34)));
      root.querySelector('[data-doctor-scale]').style.setProperty('--s', ds);
      dWrap.style.width = `${DESK.w * ds}px`;
    };
    const showDoctor = (on, label = 'Doctor’s computer') => {
      dWrap.hidden = !on;
      root.querySelector('[data-doctor-cap]').textContent = label;
      root.querySelector('[data-doctor-title]').textContent = label === 'Doctor’s computer' ? 'Doctor’s computer · Tokyo' : `${label} · Sternweg Reiseschutz`;
      floor.classList.toggle('has-doctor', on);
      fit();
    };
    addEventListener('resize', fit);
    fit();

    attachStage({ phone, doctor, guide: root.querySelector('[data-guide]'), showDoctor });
    phone.addEventListener('load', () => attachStage({ phone, doctor, guide: root.querySelector('[data-guide]'), showDoctor }), { once: true });
    if (!tourActive()) phone.addEventListener('load', () => startTour(), { once: true });

    root.addEventListener('click', (e) => {
      if (e.target.closest('[data-restart]')) { startTour(); return; }
      if (e.target.closest('[data-reset]')) { confirmReset('#/present'); return; }
      if (e.target.closest('[data-leave]')) { setPresenting(false); location.hash = '#/'; }
    });
    return () => { removeEventListener('resize', fit); detachStage(); };
  },
};

export const isPresenting = presenting;
