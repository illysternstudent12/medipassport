// Searchable global language selector. Translation services are set up on
// the Connected services screen (#/app/setup); no key is ever entered here.
import { icon } from '../icons.js';
import { LANGS, langInfo } from './glossary.js';
import { aiOn, providerName } from './ai.js';
import { openSheet, closeSheet, toast } from '../app/ui.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function row(l, current, live) {
  const locked = !l.sim && !live;
  return `<li><button type="button" class="lrow ${l.code === current ? 'is-current' : ''} ${locked ? 'is-locked' : ''}" data-lang="${l.code}" data-locked="${locked}"
      data-q="${esc(`${l.name} ${l.native} ${l.code}`.toLowerCase())}" lang="${l.code}">
    <span class="lrow__native" dir="${l.rtl ? 'rtl' : 'ltr'}">${esc(l.native)}</span>
    <span class="lrow__en" lang="en">${esc(l.name)}${l.rtl ? ' · RTL' : ''}</span>
    <span class="lrow__tag" lang="en">${l.sim ? 'Offline' : locked ? `${icon('lock')} Service` : `${icon('sparkle')} ${esc(providerName())}`}</span>
    ${l.code === current ? `<span class="lrow__check">${icon('check')}</span>` : ''}
  </button></li>`;
}

/**
 * Open the language selector.
 * @param {{ current: string, suggested?: string[], title?: string, onPick: (code: string) => void }} o
 */
export function openLanguagePicker({ current, suggested = [], title = 'Translate to', onPick }) {
  const live = aiOn();
  const sugg = [...new Set(suggested)].map(langInfo);
  const sim = LANGS.filter((l) => l.sim);
  const more = LANGS.filter((l) => !l.sim);
  openSheet({
    title,
    html: `
      <div class="lpick">
        <label class="dsearch lpick__search">${icon('search')}<input type="search" placeholder="Search ${LANGS.length} languages" aria-label="Search languages" data-lsearch autocomplete="off"/></label>
        <div class="lpick__engine ${live ? 'is-live' : ''}">
          ${live ? `${icon('sparkle')}<span><b>${esc(providerName())} is connected</b><small>Every supported language is available. Machine translations are labelled and need professional verification.</small></span>`
            : `${icon('sparkle')}<span><b>Offline glossary</b><small>${sim.length} languages from a reviewed medical glossary. Connect a translation service for the other ${more.length}.</small></span>`}
          <a class="lpick__ai" href="#/app/setup">${live ? 'Services' : 'Set up'}</a>
        </div>
        ${sugg.length ? `<div class="lpick__sec" data-sec><h3>Suggested</h3><ul class="lgrid">${sugg.map((l) => row(l, current, live)).join('')}</ul></div>` : ''}
        <div class="lpick__sec" data-sec><h3>Offline · glossary</h3><ul class="lgrid">${sim.map((l) => row(l, current, live)).join('')}</ul></div>
        <div class="lpick__sec" data-sec><h3>${live ? esc(providerName()) : 'Needs a translation service'}</h3><ul class="lgrid">${more.map((l) => row(l, current, live)).join('')}</ul></div>
        <p class="lpick__empty" data-lempty hidden>No language matches.</p>
      </div>`,
    mount(sheet) {
      const input = sheet.querySelector('[data-lsearch]');
      if (matchMedia('(pointer: fine)').matches) setTimeout(() => input.focus(), 50);
      input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        let any = false;
        sheet.querySelectorAll('[data-sec]').forEach((sec) => {
          let n = 0;
          sec.querySelectorAll('.lrow').forEach((b) => { const on = !q || b.dataset.q.includes(q); b.parentElement.hidden = !on; if (on) n++; });
          sec.hidden = !n; if (n) any = true;
        });
        sheet.querySelector('[data-lempty]').hidden = any;
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const first = [...sheet.querySelectorAll('.lrow')].find((b) => !b.parentElement.hidden && b.dataset.locked !== 'true');
        first?.click();
      });
      sheet.addEventListener('click', (e) => {
        const b = e.target.closest('.lrow');
        if (!b) return;
        if (b.dataset.locked === 'true') {
          toast(`${langInfo(b.dataset.lang).name} needs a connected translation service. See Connected services.`);
          return;
        }
        closeSheet();
        onPick(b.dataset.lang);
      });
    },
  });
}
