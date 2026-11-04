// App · Medical map
// Map-first: Leaflet + OpenStreetMap tiles (tinted to the palette), facilities from OpenStreetMap.
// Mobile: expandable bottom sheet (peek / half / full). Desktop: floating panel.
import { icon } from '../icons.js';
import { backButton, pushOverlay, closeOverlay, isOpen, navDirection, remember, recall } from '../nav.js';
import { currentTraveler } from '../app/data.js';
import { toast, isDesktop } from '../app/ui.js';
import {
  DEMO, fetchLive, loadSnapshot, rank, openStatus, navLinks, fmtDist, fmtMin, TYPE_LABEL,
} from './facilities.js';
import { openCallSheet, openInsuranceSheet } from './screen.js';

const esc = (v) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TYPE_IC = { er: 'siren', hospital: 'building', clinic: 'heart', doctor: 'user' };
const FILTERS = [
  { key: 'all', label: 'All' }, { key: 'er', label: 'Emergency' }, { key: 'hospital', label: 'Hospitals' },
  { key: 'clinic', label: 'Clinics' }, { key: 'doctor', label: 'Doctors' }, { key: 'open', label: 'Open now' },
];

/* ---------------------------------------------------------------- Leaflet loader */
let leafletPromise = null;
function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    s.onload = () => resolve(window.L);
    s.onerror = () => { leafletPromise = null; reject(new Error('Map library failed to load. Check your connection.')); };
    document.head.appendChild(s);
  });
  return leafletPromise;
}

/* ---------------------------------------------------------------- views */
function statusChip(f, tz) {
  const s = openStatus(f.hours, tz);
  return `<span class="fstat fstat--${s.status}">${esc(s.label)}</span>`;
}
function listItem(f, tz, selected) {
  return `<li><button type="button" class="fcard ${selected ? 'is-selected' : ''}" data-fid="${esc(f.id)}">
    <span class="fcard__mk fcard__mk--${f.type}">${icon(TYPE_IC[f.type])}</span>
    <span class="fcard__body">
      <b class="fcard__name">${esc(f.name)}</b>
      <span class="fcard__meta">${TYPE_LABEL[f.type]}${f.speciality[0] ? ` · ${esc(f.speciality[0])}` : ''}</span>
      <span class="fcard__row">${statusChip(f, tz)}${f.type === 'er' ? '<span class="fstat fstat--er">ER</span>' : ''}</span>
    </span>
    <span class="fcard__dist"><b>${fmtDist(f.m)}</b><small>${fmtMin(f.est.walk)} walk</small></span>
  </button></li>`;
}
function detail(f, tz, live) {
  const s = openStatus(f.hours, tz);
  const nav = navLinks(f, f.m > 2500 ? 'driving' : 'walking');
  return `<div class="fdet">
    <button type="button" class="fdet__back" data-back>${icon('arrow', 'style="rotate:180deg"')} All results</button>
    <div class="fdet__head">
      <span class="fcard__mk fcard__mk--${f.type} fdet__mk">${icon(TYPE_IC[f.type])}</span>
      <div><h2 class="fdet__name">${esc(f.name)}</h2><p class="fdet__type">${TYPE_LABEL[f.type]}${f.operator ? ` · ${esc(f.operator)}` : ''}</p></div>
    </div>
    <div class="fdet__badges">
      ${f.type === 'er' ? '<span class="fstat fstat--er">Emergency department</span>' : ''}
      ${statusChip(f, tz)}
      <span class="fstat fstat--net">${icon('eye')} Network not verified</span>
    </div>
    <div class="fdet__times">
      <div><small>Distance</small><b>${fmtDist(f.m)}</b></div>
      <div><small>Walk · est.</small><b>${fmtMin(f.est.walk)}</b></div>
      <div><small>Drive · est.</small><b>${fmtMin(f.est.drive)}</b></div>
    </div>
    <div class="fdet__nav">
      <span class="label">Navigate with</span>
      <div class="fdet__navbtns">
        <a class="navbtn navbtn--g" href="${nav.google}" target="_blank" rel="noopener">${icon('map')} Google Maps</a>
        <a class="navbtn navbtn--a" href="${nav.apple}" target="_blank" rel="noopener">${icon('map')} Apple Maps</a>
        <a class="navbtn navbtn--w" href="${nav.waze}" target="_blank" rel="noopener">${icon('map')} Waze</a>
      </div>
    </div>
    <dl class="fdet__info">
      <div><dt>${icon('pin')} Address</dt><dd>${f.address ? esc(f.address) : '<span class="muted">Not listed</span>'}</dd></div>
      <div><dt>${icon('phone')} Phone</dt><dd>${f.phone ? (live ? `<a href="tel:${esc(f.phone.replace(/\s/g, ''))}">${esc(f.phone)}</a>` : `${esc(f.phone)} <button type="button" class="fdet__call" data-demo-call>${icon('phone')} Call</button>`) : '<span class="muted">Not listed</span>'}</dd></div>
      <div><dt>${icon('clock')} Hours</dt><dd>${f.hours ? `${esc(s.label)}${s.raw && s.raw !== s.label ? `<small>${esc(f.hours)}</small>` : ''}` : '<span class="muted">Not listed · call ahead</span>'}</dd></div>
      ${f.speciality.length ? `<div><dt>${icon('heart')} Specialities</dt><dd>${f.speciality.map(esc).join(', ')}</dd></div>` : ''}
      ${f.website ? `<div><dt>${icon('globe')} Website</dt><dd><a href="${esc(f.website)}" target="_blank" rel="noopener">${esc(f.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></dd></div>` : ''}
    </dl>
    <p class="fdet__note">${icon('eye')} Details come from OpenStreetMap and may be out of date. Travel times are straight-line estimates. Insurance network status is shown only when your insurer has verified it.</p>
  </div>`;
}

/* ---------------------------------------------------------------- page */
export const mapScreen = {
  title: 'Find medical help · MediPassport',
  html() {
    return `<div class="mp" data-mp>
      <div class="mp-map" data-map role="application" aria-label="Map of nearby medical facilities"></div>
      <header class="mp-top">
        ${backButton('#/app/emergency', 'Back', 'navback--float')}
        <label class="mp-search">${icon('search')}<input type="search" placeholder="Search hospitals, clinics, specialities" aria-label="Search nearby facilities" data-q/></label>
        <button type="button" class="mp-iconbtn" data-locate aria-label="Use my location">${icon('pin')}</button>
      </header>
      <div class="mp-chips" role="group" aria-label="Filter facilities" data-filters>
        ${FILTERS.map((f, i) => `<button type="button" class="chipf" data-f="${f.key}" aria-pressed="${i === 0}">${f.label}</button>`).join('')}
      </div>
      <button type="button" class="mp-area" data-area hidden>${icon('refresh')} Search this area</button>
      <aside class="mp-panel" data-panel data-snap="half" aria-label="Nearby facilities">
        <div class="mp-grab" data-grab><span></span></div>
        <div class="mp-panel__head">
          <div><h1 class="mp-h">Medical help nearby</h1><p class="mp-src" data-src>Loading…</p></div>
          <button type="button" class="mp-call" data-call>${icon('phone')}<span data-callnum>112</span></button>
        </div>
        <div class="mp-panel__body" data-body></div>
      </aside>
      <div class="mp-fabs">
        <button type="button" class="mp-iconbtn" data-recenter aria-label="Recenter on location">${icon('pin')}</button>
      </div>
    </div>`;
  },
  mount(root) {
    const t = currentTraveler();
    const demo = DEMO[t.id] || { lat: 41.3874, lng: 2.1686, label: t.trip.city, tz: t.trip.tz };
    const st = {
      me: { lat: demo.lat, lng: demo.lng }, from: { lat: demo.lat, lng: demo.lng }, label: demo.label, tz: demo.tz || t.trip.tz, live: false,
      all: [], ranked: [], filter: 'all', q: '', selected: null, source: '', at: null,
    };
    let L = null, map = null, layer = null, me = null, alive = true;
    const markers = new Map();
    const body = root.querySelector('[data-body]');
    const panel = root.querySelector('[data-panel]');
    const src = root.querySelector('[data-src]');
    root.querySelector('[data-callnum]').textContent = t.trip.emergency;

    const visible = () => st.ranked.filter((f) => {
      if (st.filter === 'open' && openStatus(f.hours, st.tz).status !== 'open') return false;
      if (!['all', 'open'].includes(st.filter) && !(st.filter === 'hospital' ? ['hospital', 'er'].includes(f.type) : f.type === st.filter)) return false;
      if (st.q) {
        const hay = `${f.name} ${TYPE_LABEL[f.type]} ${f.speciality.join(' ')} ${f.address} ${f.operator}`.toLowerCase();
        return st.q.split(/\s+/).every((w) => hay.includes(w));
      }
      return true;
    });

    const setSnap = (s) => { panel.dataset.snap = s; setTimeout(() => map?.invalidateSize(), 320); };

    const renderList = () => {
      const v = visible();
      const f = st.selected && st.ranked.find((x) => x.id === st.selected);
      if (f) { body.innerHTML = detail(f, st.tz, st.live); return; }
      body.innerHTML = v.length
        ? `<ul class="flist">${v.slice(0, 60).map((x) => listItem(x, st.tz, false)).join('')}</ul>
           <p class="mp-attr">Facility data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> (ODbL)</p>`
        : `<div class="mp-empty">${icon('search')}<b>No matches nearby</b><p>Try another filter or search, or call ${esc(t.trip.emergency)} in an emergency.</p></div>`;
    };

    const markerIcon = (f, sel) => L.divIcon({
      className: 'mk',
      html: `<span class="mk__pin mk__pin--${f.type} ${sel ? 'is-sel' : ''}">${icon(TYPE_IC[f.type])}</span>`,
      iconSize: [38, 46], iconAnchor: [19, 44],
    });
    const renderMarkers = () => {
      if (!map) return;
      layer.clearLayers(); markers.clear();
      visible().slice(0, 80).forEach((f) => {
        const m = L.marker([f.lat, f.lng], { icon: markerIcon(f, f.id === st.selected), title: f.name, keyboard: true, riseOnHover: true })
          .on('click', () => select(f.id, false));
        m.addTo(layer); markers.set(f.id, m);
      });
    };
    const renderMe = () => {
      if (!map) return;
      if (me) me.remove();
      me = L.marker([st.me.lat, st.me.lng], {
        icon: L.divIcon({ className: 'mk', html: `<span class="mk__me"><i></i></span><span class="mk__melabel">${st.live ? 'You' : `${esc(t.first)} · demo`}</span>`, iconSize: [22, 22], iconAnchor: [11, 11] }),
        interactive: false, zIndexOffset: 1000,
      }).addTo(map);
    };
    const updateSrc = () => {
      const when = st.at ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(st.at) : '';
      src.innerHTML = `${icon('pin')} ${esc(st.label)} · ${visible().length} places · ${st.source === 'snapshot' ? `saved map data${when ? ` (${when})` : ''}` : st.source === 'cache' ? 'recent map data' : 'live map data'}`;
    };
    const refresh = () => { renderList(); renderMarkers(); updateSrc(); };

    const save = () => remember(`map.${t.id}`, { filter: st.filter, q: st.q, selected: st.selected });
    const leaveDetail = () => { st.selected = null; save(); renderList(); renderMarkers(); };
    function select(id, fly = true) {
      st.selected = id;
      save();
      // Details are a history step: Back (button, gesture or system) returns to the list.
      if (!isOpen('fdetail')) pushOverlay('fdetail', leaveDetail);
      const f = st.ranked.find((x) => x.id === id);
      renderList(); renderMarkers();
      if (f && map) {
        // Keep the selected place visible beside the panel (desktop) or above the sheet (mobile).
        const z = fly ? Math.max(map.getZoom(), 16) : map.getZoom();
        const offset = isDesktop() ? L.point(-230, 0) : L.point(0, innerHeight * 0.22);
        const target = map.unproject(map.project([f.lat, f.lng], z).add(offset), z);
        map.flyTo(target, z, { duration: fly ? 0.6 : 0.35 });
      }
      if (!isDesktop()) setSnap('half');
      body.scrollTop = 0;
    }

    const showError = (msg, retry) => {
      body.innerHTML = `<div class="mp-empty mp-empty--err">${icon('alert')}<b>${esc(msg)}</b>
        <p>You can still call ${esc(t.trip.emergency)} or contact your insurer.</p>
        <div class="mp-empty__btns"><button type="button" class="wbtn" data-retry>${icon('refresh')} Try again</button><button type="button" class="wbtn wbtn--line" data-ins>${icon('umbrella')} Contact insurance</button></div></div>`;
      body.querySelector('[data-retry]').onclick = retry;
      src.textContent = 'Map data unavailable';
    };

    const fit = () => {
      if (!map || !st.ranked.length) return;
      const near = st.ranked.slice(0, 8);
      map.fitBounds(L.latLngBounds([[st.me.lat, st.me.lng], ...near.map((f) => [f.lat, f.lng])]), {
        paddingTopLeft: isDesktop() ? [470, 90] : [24, 150], paddingBottomRight: isDesktop() ? [70, 60] : [24, Math.round(innerHeight * 0.5)], maxZoom: 16,
      });
    };

    // me: where the person is (ranking + marker). from: where to search. live: real location (enables calls).
    const load = async (from, { live, label, me = from, snapshot = false }) => {
      st.from = from; st.me = me; st.live = live; st.label = label; st.selected = null;
      body.innerHTML = '<div class="mp-loading"><span></span><span></span><span></span></div>';
      src.textContent = 'Finding medical help nearby…';
      try {
        let res;
        if (snapshot && demo.snapshot) {
          try { res = await loadSnapshot(demo.snapshot); } catch { res = await fetchLive(from.lat, from.lng); }
        } else {
          res = await fetchLive(from.lat, from.lng);
        }
        if (!alive) return;
        st.all = res.facilities; st.source = res.source; st.at = res.at;
        st.ranked = rank(st.all, st.me);
        renderMe(); refresh();
        // Coming back to the map: reopen the facility the user was looking at.
        if (restoreSel && st.ranked.some((x) => x.id === restoreSel)) { const id = restoreSel; restoreSel = null; select(id, false); }
        if (label !== 'Map area') fit();
      } catch (err) {
        if (!alive) return;
        showError(err.message, () => load(from, { live, label, me, snapshot }));
      }
    };

    /* events */
    root.addEventListener('click', (e) => {
      const c = e.target.closest('[data-fid]');
      if (c) { select(c.dataset.fid); return; }
      if (e.target.closest('[data-back]')) { if (isOpen('fdetail')) closeOverlay('fdetail'); else leaveDetail(); return; }
      if (e.target.closest('[data-call]')) { openCallSheet(t); return; }
      if (e.target.closest('[data-ins]')) { openInsuranceSheet(t); return; }
      if (e.target.closest('[data-demo-call]')) { toast('Demo: calls are disabled. Use “Use my location” for real calling.'); return; }
      if (e.target.closest('[data-recenter]')) { map?.flyTo([st.me.lat, st.me.lng], 15, { duration: 0.6 }); return; }
      const f = e.target.closest('[data-f]');
      if (f) {
        st.filter = f.dataset.f; st.selected = null; save();
        if (isOpen('fdetail')) closeOverlay('fdetail');
        root.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b === f)));
        refresh(); return;
      }
      if (e.target.closest('[data-locate]')) {
        if (!navigator.geolocation) { toast('Location isn’t available in this browser.'); return; }
        src.textContent = 'Waiting for location permission…';
        navigator.geolocation.getCurrentPosition(
          (p) => { toast('Using your location. Calls are now enabled.'); st.tz = Intl.DateTimeFormat().resolvedOptions().timeZone; load({ lat: p.coords.latitude, lng: p.coords.longitude }, { live: true, label: 'Your location' }); },
          (err) => { toast(err.code === 1 ? 'Location permission denied. Showing the demo location.' : 'Couldn’t get your location.'); updateSrc(); },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
        );
        return;
      }
      if (e.target.closest('[data-area]')) {
        const c2 = map.getCenter();
        root.querySelector('[data-area]').hidden = true;
        load({ lat: c2.lat, lng: c2.lng }, { live: st.live, label: 'Map area', me: st.me });
      }
    });
    root.querySelector('[data-q]').addEventListener('input', (e) => {
      st.q = e.target.value.trim().toLowerCase(); st.selected = null; save(); refresh();
      if (isOpen('fdetail')) closeOverlay('fdetail');
    });

    /* bottom sheet drag (mobile) */
    const grab = root.querySelector('[data-grab]');
    const SNAPS = ['peek', 'half', 'full'];
    let y0 = null;
    grab.addEventListener('pointerdown', (e) => { y0 = e.clientY; grab.setPointerCapture(e.pointerId); });
    grab.addEventListener('pointerup', (e) => {
      if (y0 === null) return;
      const dy = e.clientY - y0; y0 = null;
      const i = SNAPS.indexOf(panel.dataset.snap);
      if (Math.abs(dy) < 8) setSnap(SNAPS[(i + 1) % 3]);
      else setSnap(SNAPS[Math.max(0, Math.min(2, i + (dy < 0 ? 1 : -1)))]);
    });

    /* map */
    loadLeaflet().then((Lf) => {
      if (!alive) return;
      L = Lf;
      map = L.map(root.querySelector('[data-map]'), { zoomControl: false, attributionControl: true }).setView([st.from.lat, st.from.lng], 15);
      // Standard OSM tiles (light use with attribution, per the OSM tile usage policy).
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
      L.control.zoom({ position: 'bottomright' }).addTo(map);
      layer = L.layerGroup().addTo(map);
      renderMe(); renderMarkers();
      fit();
      map.on('moveend', () => {
        const c = map.getCenter();
        const far = Math.hypot(c.lat - st.from.lat, (c.lng - st.from.lng) * Math.cos(c.lat * Math.PI / 180)) * 111000 > 1500;
        root.querySelector('[data-area]').hidden = !far;
      });
    }).catch((err) => { root.querySelector('[data-map]').innerHTML = `<p class="mp-maperr">${icon('alert')} ${esc(err.message)}</p>`; });

    // Restore filters/search (always) and the open facility (when returning with Back).
    const saved = recall(`map.${t.id}`) || {};
    let restoreSel = ['back', 'refresh', 'reload'].includes(navDirection()) ? saved.selected : null;
    if (saved.filter) {
      st.filter = saved.filter;
      root.querySelectorAll('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === st.filter)));
    }
    if (saved.q) { st.q = saved.q; root.querySelector('[data-q]').value = saved.q; }
    load(st.from, { live: false, label: demo.label, snapshot: true });
    return () => { alive = false; map?.remove(); };
  },
};
