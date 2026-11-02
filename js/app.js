import { renderHeader, renderFooter, setActiveNav } from './components.js';
import { createRouter } from './router.js';
import { enableMagnetic } from './interactions.js';
import { landingPage } from './pages/landing.js';
import { partnersPage, notFoundPage } from './pages/stubs.js';
import { onboardingPage } from './onboarding/flow.js';
import { appHome } from './app/home.js';
import { appPassport } from './app/passport.js';
import { appDocuments } from './app/documents.js';
import { appProfile } from './app/profile.js';
import { appDoctor } from './app/doctor.js';
import { emergencyScreen } from './emergency/screen.js';
import { mapScreen } from './emergency/map.js';

renderHeader(document.getElementById('site-header'));
renderFooter(document.getElementById('site-footer'));
enableMagnetic();

createRouter({
  outlet: document.getElementById('main'),
  routes: {
    '/': landingPage,
    '/get-started': onboardingPage,
    '/partners': partnersPage,
    // Traveler dashboard (Batch 2). "Explore Demo" opens it.
    '/app': appHome,
    '/demo': appHome,
    '/app/passport': appPassport,
    '/app/documents': appDocuments,
    '/app/profile': appProfile,
    '/app/doctor': appDoctor,
    '/app/emergency': emergencyScreen,
    '/app/map': mapScreen,
  },
  notFound: notFoundPage,
  onChange(path) {
    setActiveNav(path);
    const isApp = path === '/demo' || path.startsWith('/app');
    document.body.classList.toggle('is-app', isApp);
    document.body.classList.toggle('is-onboarding', path === '/get-started');
  },
}).start();
