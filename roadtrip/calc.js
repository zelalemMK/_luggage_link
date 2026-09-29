// Pure trip math — no DOM, no network. Everything here is unit-tested in test/calc.test.mjs.

const EARTH_RADIUS_MI = 3958.8;
export const METERS_PER_MILE = 1609.344;

export function haversineMiles([lat1, lon1], [lat2, lon2]) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_MI * Math.asin(Math.sqrt(a));
}

// Running distance (miles) at each vertex of a [lat, lon] polyline.
export function cumulativeMiles(coords) {
  const cum = [0];
  for (let i = 1; i < coords.length; i++) {
    cum.push(cum[i - 1] + haversineMiles(coords[i - 1], coords[i]));
  }
  return cum;
}

// The [lat, lon] that sits `miles` along the polyline (clamped to its ends).
export function pointAtMiles(coords, cum, miles) {
  if (miles <= 0) return coords[0];
  const total = cum[cum.length - 1];
  if (miles >= total) return coords[coords.length - 1];
  let lo = 0;
  let hi = cum.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= miles) lo = mid;
    else hi = mid;
  }
  const seg = cum[hi] - cum[lo];
  const t = seg === 0 ? 0 : (miles - cum[lo]) / seg;
  return [
    coords[lo][0] + t * (coords[hi][0] - coords[lo][0]),
    coords[lo][1] + t * (coords[hi][1] - coords[lo][1]),
  ];
}

// Evenly spaced marks every `step` miles, not including the start or the end.
export function marksEvery(totalMiles, step) {
  const marks = [];
  if (!(step > 0)) return marks;
  for (let m = step; m < totalMiles - 1e-9; m += step) marks.push(m);
  return marks;
}

export function planTrip(input) {
  const {
    miles,
    hours,
    mpg,
    gasPrice,
    tankGallons,
    reservePct = 20,
    maxHoursPerDay = 8,
    lodgingPerNight = 0,
    foodPerDay = 0,
    travelers = 1,
    extraCosts = 0,
  } = input;

  const gallons = mpg > 0 ? miles / mpg : 0;
  const fuelCost = gallons * gasPrice;
  const fullRange = mpg * tankGallons;
  // Refill when the tank drops to the reserve, so each leg uses (100 - reserve)% of a tank.
  const legMiles = fullRange * (1 - reservePct / 100);
  const fuelStops = legMiles > 0 ? Math.max(0, Math.ceil(miles / legMiles) - 1) : 0;

  const days = maxHoursPerDay > 0 ? Math.max(1, Math.ceil(hours / maxHoursPerDay - 1e-9)) : 1;
  const nights = days - 1;
  const lodgingCost = nights * lodgingPerNight;
  const foodCost = days * foodPerDay * travelers;
  const total = fuelCost + lodgingCost + foodCost + extraCosts;
  const avgMph = hours > 0 ? miles / hours : 0;

  return {
    miles,
    hours,
    avgMph,
    gallons,
    fuelCost,
    fullRange,
    legMiles,
    fuelStops,
    days,
    nights,
    lodgingCost,
    foodCost,
    extraCosts,
    total,
    perPerson: travelers > 0 ? total / travelers : total,
    costPerMile: miles > 0 ? total / miles : 0,
  };
}

// Mileposts where each driving day ends, assuming the route's average speed holds.
export function overnightMarks(plan, maxHoursPerDay) {
  if (plan.nights <= 0 || plan.avgMph <= 0) return [];
  const perDay = plan.avgMph * maxHoursPerDay;
  return marksEvery(plan.miles, perDay).slice(0, plan.nights);
}

// Mileposts where you'd want gas, leaving the reserve in the tank.
export function fuelMarks(plan) {
  return marksEvery(plan.miles, plan.legMiles).slice(0, plan.fuelStops);
}

// ---------- lodging / fuel classification (OpenStreetMap tags) ----------

const LODGING_KINDS = {
  camp_site: { label: 'Campground', rank: 1 },
  hostel: { label: 'Hostel', rank: 2 },
  ymca: { label: 'YMCA / YWCA', rank: 2 },
  motel: { label: 'Motel', rank: 3 },
  guest_house: { label: 'Guest house', rank: 4 },
  hotel: { label: 'Hotel', rank: 5 },
};

export function classifyPlace(tags = {}) {
  const name = tags.name || '';
  if (tags.amenity === 'fuel') return { kind: 'fuel', label: 'Gas station', rank: 0 };
  if (/\bY[MW]CA\b/i.test(name)) return { kind: 'ymca', ...LODGING_KINDS.ymca };
  const t = tags.tourism;
  if (t && LODGING_KINDS[t]) return { kind: t, ...LODGING_KINDS[t] };
  return { kind: 'other', label: 'Place', rank: 9 };
}

// One Overpass query for many search circles. kind: 'lodging' | 'fuel' | 'ymca'.
// YMCAs are searched on their own (see closestPerGroup) so they don't flood the lodging list.
export function buildOverpassQuery(points, radiusMeters, kind, { includeHotels = false } = {}) {
  const r = Math.round(radiusMeters);
  const tourism = includeHotels
    ? 'hostel|motel|camp_site|guest_house|hotel'
    : 'hostel|motel|camp_site|guest_house';
  const parts = [];
  for (const [lat, lon] of points) {
    const at = `(around:${r},${lat.toFixed(5)},${lon.toFixed(5)})`;
    if (kind === 'fuel') {
      parts.push(`nwr["amenity"="fuel"]${at};`);
    } else if (kind === 'ymca') {
      // Overpass uses POSIX regex (no \b), so match loosely and let classifyPlace confirm.
      parts.push(`nwr["name"~"Y[MW]CA",i]${at};`);
    } else {
      parts.push(`nwr["tourism"~"^(${tourism})$"]${at};`);
    }
  }
  return `[out:json][timeout:60];(${parts.join('')});out center tags 400;`;
}

// Normalise Overpass elements into {id, lat, lon, name, tags, kind, label, rank}.
export function parseOverpass(json) {
  const seen = new Set();
  const out = [];
  for (const el of json.elements || []) {
    const id = `${el.type}/${el.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat == null || lon == null) continue;
    const tags = el.tags || {};
    const c = classifyPlace(tags);
    out.push({
      id,
      lat,
      lon,
      name: tags.name || tags.brand || c.label,
      tags,
      ...c,
    });
  }
  return out;
}

// Attach each place to the nearest search mark, and its distance from it.
export function nearestMark(place, markPoints) {
  let best = { index: -1, miles: Infinity };
  markPoints.forEach((p, i) => {
    const d = haversineMiles(p, [place.lat, place.lon]);
    if (d < best.miles) best = { index: i, miles: d };
  });
  return best;
}

// The single best place per search point: one that's tagged as lodging beats a gym-only
// one, then the closest wins. Returns an array indexed by group (null where nothing was found).
export function closestPerGroup(places, groupCount) {
  const best = Array(groupCount).fill(null);
  for (const p of places) {
    const cur = best[p.group];
    const lodges = (x) => (x.tags?.tourism ? 0 : 1);
    if (!cur || lodges(p) < lodges(cur) || (lodges(p) === lodges(cur) && p.offRouteMiles < cur.offRouteMiles)) {
      best[p.group] = p;
    }
  }
  return best;
}

// Cheapest-first when a price is known, then by type rank, then by distance.
export function sortPlaces(places, prices = {}) {
  return [...places].sort((a, b) => {
    const pa = prices[a.id]?.price;
    const pb = prices[b.id]?.price;
    if (pa != null && pb != null && pa !== pb) return pa - pb;
    if (pa != null && pb == null) return -1;
    if (pb != null && pa == null) return 1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return (a.offRouteMiles ?? 0) - (b.offRouteMiles ?? 0);
  });
}

// ---------- tiny safe formula evaluator for user-defined calculations ----------

const FUNCS = {
  min: Math.min,
  max: Math.max,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
  ceil: Math.ceil,
  floor: Math.floor,
  abs: Math.abs,
  sqrt: Math.sqrt,
};

function tokenize(src) {
  const tokens = [];
  const re = /\s*(?:(\d+\.?\d*|\.\d+)|([A-Za-z_][A-Za-z0-9_]*)|(\*\*|[-+*/%^(),]))/y;
  let pos = 0;
  while (pos < src.length) {
    if (/^\s*$/.test(src.slice(pos))) break;
    re.lastIndex = pos;
    const m = re.exec(src);
    if (!m) throw new Error(`Unexpected "${src.slice(pos).trim()[0]}"`);
    pos = re.lastIndex;
    if (m[1] !== undefined) tokens.push({ t: 'num', v: parseFloat(m[1]) });
    else if (m[2] !== undefined) tokens.push({ t: 'id', v: m[2] });
    else tokens.push({ t: 'op', v: m[3] === '**' ? '^' : m[3] });
  }
  return tokens;
}

// Grammar: expr := term (('+'|'-') term)* ; term := unary (('*'|'/'|'%') unary)* ;
// unary := '-' unary | power ; power := atom ('^' unary)? ; atom := num | id | id '(' args ')' | '(' expr ')'
export function evaluate(src, vars = {}) {
  const tokens = tokenize(String(src));
  let i = 0;
  const peek = () => tokens[i];
  const eat = (v) => {
    const tok = tokens[i];
    if (!tok || tok.v !== v) throw new Error(`Expected "${v}"`);
    i++;
  };

  function expr() {
    let v = term();
    while (peek() && (peek().v === '+' || peek().v === '-')) {
      const op = tokens[i++].v;
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  }
  function term() {
    let v = unary();
    while (peek() && ['*', '/', '%'].includes(peek().v)) {
      const op = tokens[i++].v;
      const r = unary();
      v = op === '*' ? v * r : op === '/' ? v / r : v % r;
    }
    return v;
  }
  function unary() {
    if (peek() && peek().v === '-') {
      i++;
      return -unary();
    }
    if (peek() && peek().v === '+') {
      i++;
      return unary();
    }
    return power();
  }
  function power() {
    const base = atom();
    if (peek() && peek().v === '^') {
      i++;
      return base ** unary();
    }
    return base;
  }
  function atom() {
    const tok = tokens[i++];
    if (!tok) throw new Error('Formula ends too early');
    if (tok.t === 'num') return tok.v;
    if (tok.t === 'id') {
      if (peek() && peek().v === '(') {
        const fn = FUNCS[tok.v];
        if (!fn) throw new Error(`Unknown function "${tok.v}"`);
        i++;
        const args = [];
        if (peek() && peek().v !== ')') {
          args.push(expr());
          while (peek() && peek().v === ',') {
            i++;
            args.push(expr());
          }
        }
        eat(')');
        return fn(...args);
      }
      if (!Object.prototype.hasOwnProperty.call(vars, tok.v)) {
        throw new Error(`Unknown variable "${tok.v}"`);
      }
      return Number(vars[tok.v]);
    }
    if (tok.v === '(') {
      const v = expr();
      eat(')');
      return v;
    }
    throw new Error(`Unexpected "${tok.v}"`);
  }

  if (tokens.length === 0) throw new Error('Empty formula');
  const result = expr();
  if (i < tokens.length) throw new Error(`Unexpected "${tokens[i].v}"`);
  return result;
}

export const FORMULA_FUNCTIONS = Object.keys(FUNCS);
