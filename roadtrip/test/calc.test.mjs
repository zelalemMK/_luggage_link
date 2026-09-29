import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  haversineMiles, cumulativeMiles, pointAtMiles, marksEvery, planTrip,
  overnightMarks, fuelMarks, classifyPlace, buildOverpassQuery, parseOverpass,
  sortPlaces, closestPerGroup, evaluate,
} from '../calc.js';

const near = (a, b, tol = 0.01) => assert.ok(Math.abs(a - b) <= tol, `${a} ≉ ${b}`);

test('haversine: Denver → Boulder is about 24 miles', () => {
  near(haversineMiles([39.7392, -104.9903], [40.015, -105.2705]), 24.1, 0.5);
});

test('pointAtMiles interpolates along the line and clamps', () => {
  const coords = [[0, 0], [0, 1], [0, 2]];
  const cum = cumulativeMiles(coords);
  near(cum[2], 2 * 69.09, 0.2);
  const mid = pointAtMiles(coords, cum, cum[2] / 2);
  near(mid[1], 1, 1e-9);
  const q = pointAtMiles(coords, cum, cum[1] / 2);
  near(q[1], 0.5, 1e-9);
  assert.deepEqual(pointAtMiles(coords, cum, -5), [0, 0]);
  assert.deepEqual(pointAtMiles(coords, cum, 1e6), [0, 2]);
});

test('marksEvery excludes start and end', () => {
  assert.deepEqual(marksEvery(300, 100), [100, 200]);
  assert.deepEqual(marksEvery(301, 100), [100, 200, 300]);
  assert.deepEqual(marksEvery(50, 100), []);
  assert.deepEqual(marksEvery(50, 0), []);
});

test('planTrip: 1000 mi, 16 h trip', () => {
  const p = planTrip({
    miles: 1000, hours: 16, mpg: 25, gasPrice: 3.5, tankGallons: 14, reservePct: 25,
    maxHoursPerDay: 8, lodgingPerNight: 60, foodPerDay: 20, travelers: 2, extraCosts: 10,
  });
  near(p.gallons, 40);
  near(p.fuelCost, 140);
  near(p.fullRange, 350);
  near(p.legMiles, 262.5);
  assert.equal(p.fuelStops, 3); // 1000 / 262.5 = 3.8 legs → 3 stops
  assert.equal(p.days, 2);      // exactly 16h at 8h/day is 2 days, not 3
  assert.equal(p.nights, 1);
  near(p.lodgingCost, 60);
  near(p.foodCost, 80);
  near(p.total, 290);
  near(p.perPerson, 145);
  assert.deepEqual(overnightMarks(p, 8), [500]);
  assert.deepEqual(fuelMarks(p), [262.5, 525, 787.5]);
});

test('planTrip: short trip has no stops', () => {
  const p = planTrip({ miles: 60, hours: 1, mpg: 30, gasPrice: 3, tankGallons: 12, maxHoursPerDay: 8 });
  assert.equal(p.fuelStops, 0);
  assert.equal(p.days, 1);
  assert.equal(p.nights, 0);
  assert.deepEqual(overnightMarks(p, 8), []);
});

test('classifyPlace', () => {
  assert.equal(classifyPlace({ amenity: 'fuel' }).kind, 'fuel');
  assert.equal(classifyPlace({ name: 'Downtown YMCA', leisure: 'sports_centre' }).kind, 'ymca');
  assert.equal(classifyPlace({ name: 'YWCA Residence', tourism: 'hostel' }).kind, 'ymca');
  assert.equal(classifyPlace({ name: 'Ymcamp Store' }).kind, 'other');
  assert.equal(classifyPlace({ tourism: 'camp_site' }).rank, 1);
  assert.equal(classifyPlace({ tourism: 'motel' }).label, 'Motel');
});

test('buildOverpassQuery covers each point and kind', () => {
  const q = buildOverpassQuery([[40, -105], [41, -106]], 8000, 'lodging');
  assert.match(q, /around:8000,40\.00000,-105\.00000/);
  assert.match(q, /around:8000,41\.00000,-106\.00000/);
  assert.match(q, /hostel\|motel\|camp_site\|guest_house\)/);
  assert.doesNotMatch(q, /hotel\)/);
  assert.doesNotMatch(q, /YMCA|Y\[MW\]CA/);
  assert.match(buildOverpassQuery([[40, -105]], 1, 'lodging', { includeHotels: true }), /\|hotel\)/);
  const f = buildOverpassQuery([[40, -105]], 1000, 'fuel');
  assert.match(f, /"amenity"="fuel"/);
  assert.doesNotMatch(f, /tourism/);
  const y = buildOverpassQuery([[40, -105]], 40000, 'ymca');
  assert.match(y, /"name"~"Y\[MW\]CA",i\]\(around:40000,/);
  assert.doesNotMatch(y, /tourism|fuel/);
});

test('closestPerGroup keeps one per point, lodging-tagged first, then nearest', () => {
  const places = [
    { id: 'gym-near', group: 0, offRouteMiles: 1, tags: { leisure: 'sports_centre' } },
    { id: 'rooms-far', group: 0, offRouteMiles: 9, tags: { tourism: 'hostel' } },
    { id: 'gym-far', group: 2, offRouteMiles: 7, tags: {} },
    { id: 'gym-close', group: 2, offRouteMiles: 3, tags: {} },
  ];
  assert.deepEqual(closestPerGroup(places, 3).map((p) => p?.id ?? null), ['rooms-far', null, 'gym-close']);
});

test('parseOverpass dedupes and uses way centers', () => {
  const places = parseOverpass({ elements: [
    { type: 'node', id: 1, lat: 1, lon: 2, tags: { amenity: 'fuel', brand: 'Shell' } },
    { type: 'node', id: 1, lat: 1, lon: 2, tags: { amenity: 'fuel' } },
    { type: 'way', id: 7, center: { lat: 3, lon: 4 }, tags: { tourism: 'motel', name: 'Sleep Inn' } },
    { type: 'relation', id: 9, tags: {} },
  ] });
  assert.equal(places.length, 2);
  assert.equal(places[0].name, 'Shell');
  assert.deepEqual([places[1].id, places[1].lat, places[1].kind], ['way/7', 3, 'motel']);
});

test('sortPlaces: logged price first, then type rank, then distance', () => {
  const list = [
    { id: 'a', rank: 3, offRouteMiles: 1 },
    { id: 'b', rank: 1, offRouteMiles: 5 },
    { id: 'c', rank: 1, offRouteMiles: 2 },
    { id: 'd', rank: 3, offRouteMiles: 9 },
    { id: 'e', rank: 3, offRouteMiles: 9 },
  ];
  const prices = { d: { price: 3.1 }, e: { price: 2.9 } };
  assert.deepEqual(sortPlaces(list, prices).map((p) => p.id), ['e', 'd', 'c', 'b', 'a']);
});

test('evaluate: arithmetic, precedence, functions, variables', () => {
  assert.equal(evaluate('1 + 2 * 3'), 7);
  assert.equal(evaluate('(1 + 2) * 3'), 9);
  assert.equal(evaluate('2 ^ 3 ^ 2'), 512);
  assert.equal(evaluate('2 ** 3'), 8);
  assert.equal(evaluate('-2 ^ 2'), -4);
  assert.equal(evaluate('10 % 4'), 2);
  assert.equal(evaluate('max(1, miles, 3)', { miles: 7 }), 7);
  assert.equal(evaluate('round(fuel_cost / travelers, 2)', { fuel_cost: 10, travelers: 3 }), 3.33);
  assert.equal(evaluate('.5 * 4'), 2);
});

test('evaluate rejects bad input without running code', () => {
  assert.throws(() => evaluate(''), /Empty/);
  assert.throws(() => evaluate('1 +'), /ends too early/);
  assert.throws(() => evaluate('foo'), /Unknown variable "foo"/);
  assert.throws(() => evaluate('alert(1)'), /Unknown function/);
  assert.throws(() => evaluate('constructor', {}), /Unknown variable/);
  assert.throws(() => evaluate('1 2'), /Unexpected "2"/);
  assert.throws(() => evaluate('(1'), /Expected "\)"/);
  assert.throws(() => evaluate('1 $ 2'), /Unexpected "\$"/);
});
