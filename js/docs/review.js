// Review extracted information before it is saved.
// The patient sees how the file was read, the detected language (and can
// change it), every extracted item (editable, removable), and can add items
// the reader missed. Nothing is saved until they press Save.
import { icon } from '../icons.js';
import { LANGS, langInfo } from '../translate/glossary.js';
import { openSheet, closeSheet } from '../app/ui.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KINDS = [['allergy', 'Allergy'], ['med', 'Medication'], ['condition', 'Diagnosis'], ['test', 'Test result']];
const KIND_IC = { allergy: 'alert', med: 'rx', condition: 'heart', test: 'flask' };

const methodLine = (r) => {
  const read = r.method === 'ocr' ? `Text recognised with OCR (Tesseract · ${esc((r.ocrLangs || []).join(' + '))}). OCR can misread letters and numbers.`
    : 'Text read from the PDF’s text layer (pdf.js).';
  const ex = r.extraction === 'ai' ? 'Items extracted by Claude through the MediPassport backend, copied as written.'
    : 'Items matched against the MediPassport medical glossary (12 languages). Not AI. Anything the glossary doesn’t know is not picked up, so add it yourself.';
  return `${read} ${ex}`;
};

const itemRow = (it, i) => `<li class="rv-item" data-i="${i}">
  <span class="rv-item__ic">${icon(KIND_IC[it.kind] || 'file')}</span>
  <div class="rv-item__fields">
    <select aria-label="Type" data-f="kind">${KINDS.map(([k, l]) => `<option value="${k}" ${k === it.kind ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <input type="text" aria-label="Name" placeholder="Name, as written" value="${esc(it.name)}" data-f="name"/>
    <input type="text" aria-label="Details" placeholder="Dose, reaction, value… (optional)" value="${esc(it.detail)}" data-f="detail"/>
    ${it.line ? `<small class="rv-item__src" title="Line in the document">“${esc(it.line.slice(0, 120))}”</small>` : it.added ? '<small class="rv-item__src">Added by you</small>' : ''}
  </div>
  <button type="button" class="rv-item__x" data-del="${i}" aria-label="Remove item">${icon('close')}</button>
</li>`;

/**
 * @param {{ file: File, result: object, signedIn: boolean, onSave: (out: object) => void, onStoreOnly: () => void }} o
 */
export function openReview({ file, result, signedIn, onSave, onStoreOnly }) {
  const items = result.items.map((x) => ({ ...x }));
  const opts = LANGS.map((l) => `<option value="${l.code}" ${l.code === result.lang ? 'selected' : ''}>${esc(l.name)}${l.native !== l.name ? ` · ${esc(l.native)}` : ''}</option>`).join('');
  const conf = result.lang ? `Detected automatically · ${result.langConf || 'medium'} confidence` : 'Not detected. Please choose.';
  const chars = result.text.replace(/\s/g, '').length;
  openSheet({
    title: 'Check what was found',
    html: `<div class="rv">
      <div class="ufile"><span class="ufile__ic">${icon(/^image\//.test(file.type) ? 'camera' : 'file')}</span><span><b>${esc(file.name)}</b><small>${esc(methodLine(result))}</small></span></div>
      ${result.note ? `<p class="rv-note is-warn">${icon('alert')} <span>${esc(result.note)}</span></p>` : ''}
      <label class="rv-field"><span>Document title</span><input type="text" data-title value="${esc(result.title || file.name.replace(/\.[a-z0-9]+$/i, ''))}"/></label>
      <label class="rv-field"><span>Original language <small>${esc(conf)}</small></span><select data-lang>${result.lang ? '' : '<option value="" selected>Choose…</option>'}${opts}</select></label>
      <h3 class="rv-h">${items.length ? `${items.length} item${items.length === 1 ? '' : 's'} found · check each against the original` : 'No medical items recognised'}</h3>
      ${items.length ? '' : `<p class="rv-note">${chars < 20 ? 'Almost no text could be read from this file. Try a sharper, well-lit photo, or add items yourself.' : 'Text was read, but no known allergy, medicine, diagnosis or test was recognised. Nothing has been guessed. Add items yourself, or save the file only.'}</p>`}
      <ul class="rv-list" data-items>${items.map(itemRow).join('')}</ul>
      <button type="button" class="wbtn wbtn--line rv-add" data-add>${icon('plus')} Add an item</button>
      <details class="rv-text"><summary>Show the text that was read (${chars} characters)</summary><pre dir="auto">${esc(result.text.slice(0, 6000)) || '—'}</pre></details>
      <p class="rv-note">${icon('lock')} <span>${signedIn ? 'Saving uploads the file to your private storage (Supabase) and keeps the items on this device.' : 'Saved on this device only. Sign in under Connected services to keep files in private cloud storage.'}</span></p>
      <div class="rv-actions">
        <button type="button" class="btn btn--ghost" data-store><span>Save file only</span><span class="btn__dot">${icon('file')}</span></button>
        <button type="button" class="btn" data-save><span>Save ${items.length ? 'checked items' : ''}</span><span class="btn__dot">${icon('check')}</span></button>
      </div>
    </div>`,
    mount(sheet) {
      const list = sheet.querySelector('[data-items]');
      const repaint = () => { list.innerHTML = items.map(itemRow).join(''); };
      list.addEventListener('input', (e) => {
        const li = e.target.closest('[data-i]'); const f = e.target.dataset.f;
        if (!li || !f) return;
        const it = items[+li.dataset.i];
        it[f] = e.target.value; it.edited = true;
        if (f === 'name' || f === 'kind') delete it.code; // a corrected name is no longer the glossary match
        if (f === 'kind') li.querySelector('.rv-item__ic').innerHTML = icon(KIND_IC[it.kind]);
      });
      sheet.addEventListener('click', (e) => {
        const d = e.target.closest('[data-del]');
        if (d) { items.splice(+d.dataset.del, 1); repaint(); return; }
        if (e.target.closest('[data-add]')) {
          items.push({ kind: 'allergy', name: '', detail: '', added: true, edited: true });
          repaint();
          list.lastElementChild?.querySelector('[data-f="name"]')?.focus();
          return;
        }
        if (e.target.closest('[data-store]')) { closeSheet(); onStoreOnly(); return; }
        if (e.target.closest('[data-save]')) {
          const lang = sheet.querySelector('[data-lang]').value || null;
          const clean = items.filter((x) => x.name.trim()).map((x) => ({ kind: x.kind, code: x.code, name: x.name.trim(), detail: (x.detail || '').trim(), edited: !!x.edited }));
          closeSheet();
          onSave({
            title: sheet.querySelector('[data-title]').value.trim() || file.name,
            lang, langSource: lang && lang === result.lang ? 'detected' : lang ? 'manual' : 'unknown',
            items: clean,
          });
        }
      });
    },
  });
}

export const langName = (c) => (c ? langInfo(c).name : 'unknown language');
