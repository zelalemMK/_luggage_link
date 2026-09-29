# Cheap Trip Planner

A phone-friendly map app for planning road trips on a budget. Enter where you're starting and where
you're going; it draws the route, works out how many days and nights it takes, where you'll need gas,
and what the trip will cost. Then it finds cheap places to sleep (campgrounds, hostels, YMCAs, motels)
near where each driving day ends, and gas stations near each fuel stop.

It's plain HTML/JS with no build step and no API keys.

## What it does

- **Route** — From (or 📍 your location), optional Via stop, To. Driving route from OSRM.
- **Trip math** — miles, drive time, gallons, fuel stops (refuel at your chosen % left), days/nights
  from your max driving hours per day, and a cost breakdown (gas, lodging, food, other).
- **Stops** — searches OpenStreetMap around each overnight point / fuel stop:
  - Lodging ranked cheapest-type first: campground → hostel → motel → guest house (hotels optional).
  - **Find YMCA** shows just the one closest YMCA/YWCA to the point you pick: the end of each driving
    day, the halfway point, or your destination. It searches a wider radius (25 mi by default) because
    YMCAs are spread out, and prefers a branch listed as lodging over a gym-only one.
  - Gas stations, with a **Log price** box. Stations with prices you've logged sort cheapest first.
  - Every result has Navigate (opens Google/Apple Maps), and Call / Website when known.
- **My formulas** — add your own calculations, e.g. `fuel_cost / travelers` or `round(miles / days, 0)`.
  Formulas can use earlier formulas by their short name. The Costs tab lists every variable.
- Settings, formulas, your last trip, and logged gas prices are saved on the phone.

## Limits (honest version)

- **No live gas prices or room rates.** No free service provides them (GasBuddy etc. have no public API).
  Enter a typical gas price in Settings and log prices you see; lodging is ranked by type, not price.
- **Most YMCAs don't rent rooms.** Call the one it finds to ask about rooms.
- Uses free public servers (Nominatim, OSRM, Overpass). They're rate-limited; if a search fails, wait a minute.
- Needs a connection for maps, routing and searches. The app itself opens offline once installed.

## Put it on your phone

It has to be served over **https** to install and use your location. Easiest options:

1. **GitHub Pages** — repo Settings → Pages → deploy from branch, folder `/` — then open
   `https://<you>.github.io/<repo>/roadtrip/` on your phone.
2. **Netlify / Cloudflare Pages** — drag and drop this `roadtrip` folder.

Then on the phone: **iPhone** Safari → Share → *Add to Home Screen*; **Android** Chrome → ⋮ → *Install app*.

## Run locally

```sh
cd roadtrip
python3 -m http.server 8000   # open http://localhost:8000
npm test                      # unit tests for the trip math and formula engine (Node 20+)
```

## Files

- `calc.js` — pure trip math, OSM place classification, and the formula evaluator (no `eval`).
- `app.js` — map, UI, and calls to Nominatim / OSRM / Overpass.
- `sw.js`, `manifest.webmanifest`, `icon.svg` — make it installable and open offline.
