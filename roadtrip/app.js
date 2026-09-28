import {
  METERS_PER_MILE,
  cumulativeMiles,
  pointAtMiles,
  marksEvery,
  planTrip,
  overnightMarks,
  fuelMarks,
  buildOverpassQuery,
  parseOverpass,
  nearestMark,
  sortPlaces,
  evaluate,
  FORMULA_FUNCTIONS,
} from './calc.js';

// Free, key-less public services. Swap these if you self-host or get rate limited.
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const OSRM = 'https://router.project-osrm.org/route/v1/driving';
const OVERPASS = 'https://overpass-api.de/api/interpreter';

const DEFAULT_SETTINGS = {
  mpg: 25,
  tankGallons: 14,
  reservePct: 25,
  gasPrice: 3.4,
  maxHoursPerDay: 8,
  lodgingPerNight: 60,
  foodPerDay: 25,
  travelers: 1,
  extraCosts: 0,
  radiusMiles: 8,
  gasEveryMiles: 100,
  includeHotels: false,
};

const DEFAULT_FORMULAS = [
  { name: 'Gas per person', expr: 'fuel_cost / travelers' },
  { name: 'Miles per day', expr: 'round(miles / days, 0)' },
  { name: 'Trip cost per mile', expr: 'round(total / miles, 2)' },
];

// ---------- persistence (localStorage can throw in private mode) ----------

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(`cheaptrip:${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  try {
    localStorage.setItem(`cheaptrip:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable — keep working in memory */
  }
}

const state = {
  settings: { ...DEFAULT_SETTINGS, ...load('settings', {}) },
  formulas: load('formulas', DEFAULT_FORMULAS),
  prices: load('prices', {}), // { "node/123": { price: 3.19, date: "2026-09-28" } }
  trip: load('trip', { from: '', via: '', to: '' }),
  route: null, // { coords, cum, miles, hours, endpoints }
  plan: null,
  places: [],
};

// ---------- map ----------

const map = L.map('map', { zoomControl: true }).setView([39.5, -98.35], 4);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; OpenStreetMap contributors',
}).addTo(map);
const routeLayer = L.layerGroup().addTo(map);
const marksLayer = L.layerGroup().addTo(map);
const placesLayer = L.layerGroup().addTo(map);

const dot = (color, size = 14) =>
  L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 3px #0007"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });

// ---------- helpers ----------

const $ = (sel) => document.querySelector(sel);
const money = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num = (n, d = 0) => n.toLocaleString(undefined, { maximumFractionDigits: d });
const hoursText = (h) => `${Math.floor(h)}h ${String(Math.round((h % 1) * 60)).padStart(2, '0')}m`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const navUrl = (lat, lon) => `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;

function setStatus(el, msg, isError = false) {
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

async function fetchJson(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${new URL(url).hostname} answered ${res.status}`);
  return res.json();
}

async function geocode(text) {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (m) return { lat: +m[1], lon: +m[2], name: text.trim() };
  const url = `${NOMINATIM}?format=jsonv2&limit=1&q=${encodeURIComponent(text)}`;
  const [hit] = await fetchJson(url, { headers: { Accept: 'application/json' } });
  if (!hit) throw new Error(`Couldn't find "${text}"`);
  return { lat: +hit.lat, lon: +hit.lon, name: hit.display_name };
}

// ---------- tabs ----------

document.querySelectorAll('.tabs button').forEach((btn) =>
  btn.addEventListener('click', () => showTab(btn.dataset.tab)),
);
function showTab(name) {
  document.querySelectorAll('.tabs button').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === name));
  document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== `tab-${name}`));
  if (name === 'costs') renderCosts();
}

// ---------- trip ----------

$('#from').value = state.trip.from;
$('#via').value = state.trip.via;
$('#to').value = state.trip.to;

$('#use-location').addEventListener('click', () => {
  const status = $('#status');
  if (!navigator.geolocation) return setStatus(status, 'Location is not available on this device.', true);
  setStatus(status, 'Getting your location…');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      $('#from').value = `${pos.coords.latitude.toFixed(5)},${pos.coords.longitude.toFixed(5)}`;
      setStatus(status, 'Using your current location.');
    },
    (err) => setStatus(status, `Location failed: ${err.message}`, true),
    { enableHighAccuracy: true, timeout: 15000 },
  );
});

$('#trip-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const status = $('#status');
  const trip = { from: $('#from').value, via: $('#via').value, to: $('#to').value };
  state.trip = trip;
  save('trip', trip);
  $('#plan-btn').disabled = true;
  try {
    setStatus(status, 'Looking up places…');
    const names = [trip.from, trip.via, trip.to].filter((s) => s.trim());
    const points = [];
    // Nominatim asks for at most one request per second.
    for (const [i, n] of names.entries()) {
      if (i) await new Promise((r) => setTimeout(r, 1000));
      points.push(await geocode(n));
    }
    setStatus(status, 'Finding the route…');
    const path = points.map((p) => `${p.lon},${p.lat}`).join(';');
    const data = await fetchJson(`${OSRM}/${path}?overview=full&geometries=geojson`);
    if (data.code !== 'Ok' || !data.routes?.length) throw new Error('No driving route found.');
    const r = data.routes[0];
    const coords = r.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
    state.route = {
      coords,
      cum: cumulativeMiles(coords),
      miles: r.distance / METERS_PER_MILE,
      hours: r.duration / 3600,
      endpoints: points,
    };
    state.places = [];
    placesLayer.clearLayers();
    $('#stops-list').innerHTML = '';
    setStatus(status, '');
    recompute();
    map.fitBounds(L.latLngBounds(coords), { padding: [24, 24] });
  } catch (err) {
    setStatus(status, err.message || String(err), true);
  } finally {
    $('#plan-btn').disabled = false;
  }
});

function recompute() {
  if (!state.route) return;
  const s = state.settings;
  state.plan = planTrip({ ...s, miles: state.route.miles, hours: state.route.hours });
  drawRoute();
  renderSummary();
  renderCosts();
  ['#find-lodging', '#find-fuel', '#find-fuel-all', '#find-lodging-dest'].forEach((id) => ($(id).disabled = false));
  $('#find-lodging').disabled = state.plan.nights === 0;
  $('#find-fuel').disabled = state.plan.fuelStops === 0;
}

function markPositions(marks) {
  return marks.map((m) => pointAtMiles(state.route.coords, state.route.cum, m));
}

function drawRoute() {
  routeLayer.clearLayers();
  marksLayer.clearLayers();
  const { coords, endpoints } = state.route;
  L.polyline(coords, { color: '#2f5d50', weight: 5, opacity: 0.85 }).addTo(routeLayer);
  endpoints.forEach((p, i) =>
    L.marker([p.lat, p.lon])
      .bindPopup(`${i === 0 ? 'Start' : i === endpoints.length - 1 ? 'Destination' : 'Via'}: ${esc(p.name)}`)
      .addTo(routeLayer),
  );
  const s = state.settings;
  overnightMarks(state.plan, s.maxHoursPerDay).forEach((m, i) => {
    const [lat, lon] = pointAtMiles(coords, state.route.cum, m);
    L.marker([lat, lon], { icon: dot('#8a4fbf', 18) })
      .bindPopup(`End of day ${i + 1} · mile ${num(m)}`)
      .addTo(marksLayer);
  });
  fuelMarks(state.plan).forEach((m, i) => {
    const [lat, lon] = pointAtMiles(coords, state.route.cum, m);
    L.marker([lat, lon], { icon: dot('#d0662b', 12) })
      .bindPopup(`Fuel stop ${i + 1} · mile ${num(m)}`)
      .addTo(marksLayer);
  });
}

function renderSummary() {
  const p = state.plan;
  $('#summary').innerHTML = `
    <div class="stats">
      <div class="stat"><b>${num(p.miles)}</b><span>miles</span></div>
      <div class="stat"><b>${hoursText(p.hours)}</b><span>driving</span></div>
      <div class="stat"><b>${money(p.total)}</b><span>est. total</span></div>
      <div class="stat"><b>${p.days}</b><span>day${p.days === 1 ? '' : 's'} · ${p.nights} night${p.nights === 1 ? '' : 's'}</span></div>
      <div class="stat"><b>${num(p.gallons, 1)}</b><span>gallons</span></div>
      <div class="stat"><b>${p.fuelStops}</b><span>fuel stop${p.fuelStops === 1 ? '' : 's'}</span></div>
    </div>
    <p class="muted small">Purple dots = where each driving day ends (${state.settings.maxHoursPerDay} h/day).
    Orange dots = refuel at ${state.settings.reservePct}% tank (~every ${num(p.legMiles)} mi).
    Open <b>Stops</b> to find cheap places near them.</p>`;
}

// ---------- costs + custom formulas ----------

function formulaVars() {
  const p = state.plan;
  const s = state.settings;
  const vars = {
    miles: p?.miles ?? 0,
    hours: p?.hours ?? 0,
    avg_mph: p?.avgMph ?? 0,
    gallons: p?.gallons ?? 0,
    fuel_cost: p?.fuelCost ?? 0,
    fuel_stops: p?.fuelStops ?? 0,
    range: p?.fullRange ?? 0,
    days: p?.days ?? 0,
    nights: p?.nights ?? 0,
    lodging_cost: p?.lodgingCost ?? 0,
    food_cost: p?.foodCost ?? 0,
    extra_costs: s.extraCosts,
    total: p?.total ?? 0,
    mpg: s.mpg,
    gas_price: s.gasPrice,
    tank: s.tankGallons,
    travelers: s.travelers,
    lodging_per_night: s.lodgingPerNight,
    food_per_day: s.foodPerDay,
    hours_per_day: s.maxHoursPerDay,
  };
  return vars;
}
const slug = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'x';

function renderCosts() {
  const p = state.plan;
  $('#cost-table').innerHTML = p
    ? `<table>
        <tr><td>Gas (${num(p.gallons, 1)} gal × ${money(state.settings.gasPrice)})</td><td>${money(p.fuelCost)}</td></tr>
        <tr><td>Lodging (${p.nights} × ${money(state.settings.lodgingPerNight)})</td><td>${money(p.lodgingCost)}</td></tr>
        <tr><td>Food (${p.days} day × ${state.settings.travelers} × ${money(state.settings.foodPerDay)})</td><td>${money(p.foodCost)}</td></tr>
        <tr><td>Other</td><td>${money(p.extraCosts)}</td></tr>
        <tr class="total"><td>Total</td><td>${money(p.total)}</td></tr>
        <tr><td>Per person</td><td>${money(p.perPerson)}</td></tr>
      </table>`
    : '<p class="muted">Plan a route first — formulas still work with your settings.</p>';

  const base = formulaVars();
  // Each formula's result becomes a variable for the formulas below it, e.g. "gas_per_person".
  const vars = { ...base };
  $('#formulas').innerHTML = state.formulas
    .map((f, i) => {
      let out;
      try {
        const v = evaluate(f.expr, vars);
        vars[slug(f.name)] = v;
        out = `<span class="val">${Number.isFinite(v) ? num(v, 2) : '—'}</span>`;
      } catch (err) {
        out = `<span class="err">${esc(err.message)}</span>`;
      }
      return `<div class="formula">
        <div>${esc(f.name)}<code>${esc(f.expr)} → ${esc(slug(f.name))}</code></div>
        <div>${out} <button data-del="${i}" aria-label="Delete ${esc(f.name)}">✕</button></div>
      </div>`;
    })
    .join('');

  $('#var-list').innerHTML =
    `<p>Variables: ${Object.keys(base).map((k) => `<code>${k}</code>`).join('')}</p>` +
    `<p>Functions: ${FORMULA_FUNCTIONS.map((k) => `<code>${k}()</code>`).join('')}</p>` +
    `<p>Operators: <code>+ - * / % ^ ( )</code>. Each formula can use the ones above it by their short name.</p>`;
}

$('#formulas').addEventListener('click', (e) => {
  const i = e.target.dataset.del;
  if (i === undefined) return;
  state.formulas.splice(+i, 1);
  save('formulas', state.formulas);
  renderCosts();
});

$('#formula-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#formula-name').value.trim();
  const expr = $('#formula-expr').value.trim();
  if (!name || !expr) return;
  state.formulas.push({ name, expr });
  save('formulas', state.formulas);
  $('#formula-name').value = '';
  $('#formula-expr').value = '';
  renderCosts();
});

// ---------- settings ----------

const settingsForm = $('#settings-form');
function fillSettings() {
  for (const [k, v] of Object.entries(state.settings)) {
    const input = settingsForm.elements[k];
    if (!input) continue;
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = v;
  }
  $('#gas-every-label').textContent = state.settings.gasEveryMiles;
}
settingsForm.addEventListener('input', (e) => {
  const input = e.target;
  if (!input.name) return;
  if (input.type === 'checkbox') state.settings[input.name] = input.checked;
  else {
    const v = parseFloat(input.value);
    if (!Number.isFinite(v)) return;
    state.settings[input.name] = v;
  }
  save('settings', state.settings);
  $('#gas-every-label').textContent = state.settings.gasEveryMiles;
  recompute();
});
$('#reset-data').addEventListener('click', () => {
  if (!confirm('Erase saved settings, formulas, trip, and logged gas prices?')) return;
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith('cheaptrip:'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* ignore */
  }
  location.reload();
});
fillSettings();

// ---------- stops: lodging + gas ----------

async function searchAround(marks, kind, labelFor) {
  const status = $('#stops-status');
  const s = state.settings;
  const points = marks.map((m) => (Array.isArray(m) ? m : pointAtMiles(state.route.coords, state.route.cum, m)));
  if (!points.length) return setStatus(status, 'Nothing to search — no stops needed on this route.');
  setStatus(status, `Searching ${points.length} area${points.length === 1 ? '' : 's'}…`);
  document.querySelectorAll('.btn-grid button').forEach((b) => (b.dataset.wasDisabled = b.disabled, (b.disabled = true)));
  try {
    const query = buildOverpassQuery(points, s.radiusMiles * METERS_PER_MILE, kind, { includeHotels: s.includeHotels });
    const json = await fetchJson(OVERPASS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    const places = parseOverpass(json)
      .filter((p) => (kind === 'fuel' ? p.kind === 'fuel' : p.kind !== 'fuel' && p.kind !== 'other'))
      .map((p) => {
        const near = nearestMark(p, points);
        return { ...p, group: near.index, offRouteMiles: near.miles };
      });
    state.places = places;
    state.lastSearch = { points, kind, labelFor };
    renderPlaces();
    setStatus(status, places.length ? `Found ${places.length} place${places.length === 1 ? '' : 's'}.` : 'Nothing found — try a bigger search radius in Settings.');
  } catch (err) {
    setStatus(status, `Search failed: ${err.message}. The free server may be busy; try again in a minute.`, true);
  } finally {
    document.querySelectorAll('.btn-grid button').forEach((b) => (b.disabled = b.dataset.wasDisabled === 'true'));
  }
}

function renderPlaces() {
  const { points, labelFor } = state.lastSearch;
  placesLayer.clearLayers();
  const groups = points.map(() => []);
  state.places.forEach((p) => groups[p.group].push(p));
  const html = groups
    .map((list, gi) => {
      if (!list.length) return '';
      const sorted = sortPlaces(list, state.prices).slice(0, 12);
      return `<div class="group-title">${esc(labelFor(gi))}</div>` + sorted.map(placeCard).join('');
    })
    .join('');
  $('#stops-list').innerHTML = html;

  for (const p of state.places) {
    const isFuel = p.kind === 'fuel';
    const price = state.prices[p.id]?.price;
    L.marker([p.lat, p.lon], { icon: dot(isFuel ? '#d0662b' : '#8a4fbf', 10) })
      .bindPopup(
        `<b>${esc(p.name)}</b><br>${esc(p.label)}${price != null ? ` · $${price.toFixed(2)}` : ''}<br>` +
          `<a href="${navUrl(p.lat, p.lon)}" target="_blank" rel="noopener">Navigate</a>`,
      )
      .addTo(placesLayer);
  }
}

function placeCard(p) {
  const isFuel = p.kind === 'fuel';
  const t = p.tags;
  const addr = [t['addr:housenumber'], t['addr:street'], t['addr:city']].filter(Boolean).join(' ');
  const logged = state.prices[p.id];
  const extras = [
    `${num(p.offRouteMiles, 1)} mi from stop`,
    addr,
    t.opening_hours === '24/7' ? 'Open 24/7' : '',
    t.fee === 'no' ? 'Free' : '',
    t.brand && t.brand !== p.name ? t.brand : '',
  ].filter(Boolean);
  const phone = t.phone || t['contact:phone'];
  const web = t.website || t['contact:website'];
  return `<div class="place" data-id="${esc(p.id)}">
    <div class="place-head">
      <span class="place-name">${esc(p.name)}</span>
      <span class="badge ${isFuel ? 'fuel' : 'lodging'}">${esc(p.label)}</span>
    </div>
    <div class="place-meta">${esc(extras.join(' · '))}
      ${logged ? `<br><span class="price">$${logged.price.toFixed(2)}/gal</span> logged ${esc(logged.date)}` : ''}
    </div>
    <div class="place-actions">
      <a href="${navUrl(p.lat, p.lon)}" target="_blank" rel="noopener">Navigate</a>
      ${phone ? `<a href="tel:${esc(phone.replace(/[^\d+]/g, ''))}">Call</a>` : ''}
      ${web ? `<a href="${esc(web)}" target="_blank" rel="noopener">Website</a>` : ''}
      ${isFuel ? `<input type="number" step="0.01" min="0" placeholder="$/gal" aria-label="Price at ${esc(p.name)}" /><button data-log>Log price</button>` : ''}
    </div>
  </div>`;
}

$('#stops-list').addEventListener('click', (e) => {
  if (!e.target.matches('[data-log]')) return;
  const card = e.target.closest('.place');
  const price = parseFloat(card.querySelector('input').value);
  if (!Number.isFinite(price) || price <= 0) return;
  state.prices[card.dataset.id] = { price, date: new Date().toISOString().slice(0, 10) };
  save('prices', state.prices);
  renderPlaces();
});

$('#find-lodging').addEventListener('click', () => {
  const marks = overnightMarks(state.plan, state.settings.maxHoursPerDay);
  searchAround(marks, 'lodging', (i) => `Night ${i + 1} · around mile ${num(marks[i])}`);
});
$('#find-lodging-dest').addEventListener('click', () => {
  const end = state.route.coords[state.route.coords.length - 1];
  searchAround([end], 'lodging', () => 'Near destination');
});
$('#find-fuel').addEventListener('click', () => {
  const marks = fuelMarks(state.plan);
  searchAround(marks, 'fuel', (i) => `Fuel stop ${i + 1} · around mile ${num(marks[i])}`);
});
$('#find-fuel-all').addEventListener('click', () => {
  const marks = [0, ...marksEvery(state.route.miles, state.settings.gasEveryMiles)];
  searchAround(marks, 'fuel', (i) => `Around mile ${num(marks[i])}`);
});

// ---------- boot ----------

renderCosts();
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
