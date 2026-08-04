# Roadmap

Make this site the go-to phone check before a run or a night of moon watching: accurate times, live sky position, and enough look-ahead to plan the week.

## Today

Static React app. Browser geolocation → client-side [suncalc](https://github.com/mourner/suncalc) → one card of **next** solar events (twilights through astronomical dusk, with sunrise/sunset azimuth) and lunar phase / illumination / next rise-set with azimuth. Refreshes every 30s. Deployed to S3.

Useful as a glanceable “what’s next,” thin for planning.

## Goals

| Use case | Need |
| --- | --- |
| **Runs** | When it’s light enough (or still dark), golden/blue hour edges, multi-day look-ahead, “time until…” countdowns |
| **Moon watching** | Live moon altitude/azimuth, next major phases, when the moon is up *and* the sky is dark, transit (highest point) |
| **Both** | Reliable location (not geo-only), clear “now” vs “upcoming,” works well on a phone outdoors |

Accuracy target: event times good to about a minute at mid-latitudes near sea level. Horizon events should note that terrain and elevation are not modeled.

---

## 1. Now panel (live sky)

Show continuous state, not only discrete events.

- **Sun:** altitude, azimuth, day/night/twilight band (astronomical / nautical / civil / day)
- **Moon:** altitude, azimuth, up/down, illumination %, phase name
- **Countdowns** to the next few useful events (e.g. civil dawn, sunset, moonrise)
- Optional: simple altitude-over-time sparkline for the next ~12–24h

Highest leverage for “should I head out right now?”

## 2. Run planning

- **Golden hour** and **blue hour** windows (start/end), not only civil dawn/dusk labels
- **Day length** trend vs yesterday / week (already show length; make change visible)
- **Multi-day solar strip** (next 7 days): sunrise, sunset, civil dawn/dusk, day length
- **“Good run windows”** presets — e.g. after civil dawn, before civil dusk, full daylight only — as filters or highlighted ranges, not a fitness tracker

## 3. Moon watching

- **Next principal phases** with exact local time: new, first quarter, full, last quarter (and age in days)
- **Moon transit** (culmination): time + altitude when highest — best view / photo moment that night
- **Dark-sky vs bright-moon overlap:** intervals when the moon is above the horizon after astronomical dusk (watch the moon) vs when it is below during night (dark sky)
- **Apparent size / distance** (optional badge on near-perigee full moons) — secondary
- Rise/set already have azimuth; keep and surface for “which horizon to face”

## 4. Look-ahead calendar

- 7–14 day grid: sun rise/set, moon rise/set, phase icon, illumination
- Tap a day → full event list for that date (same detail as today, for any day)
- Deep-linkable `?date=` / location so a plan is shareable or bookmarkable

## 5. Location & accuracy

- **Manual location** (search or lat/lon) and **saved favorites**; geo as default, not sole option
- Show resolved coordinates and local timezone; make “using device location” vs “pinned place” obvious
- Document / UI note: no terrain occlusion; elevation optional later (affects true horizon by minutes)
- Edge cases: polar day/night, moon always up/down — explicit copy instead of empty rows
- Validate suncalc outputs against a trusted ephemeris for a few lat/long/date fixtures in tests (regression, not a second engine unless accuracy requires it)

## 6. Product shell

- Mobile-first layout; large type outdoors; light/dark already matter — keep contrast high
- PWA (installable, offline shell + client calc) so it works with no network after first load
- Optional: wake-friendly auto-refresh already exists; tighten when tab is visible / location changes

## 7. Non-goals (for now)

- Weather, AQI, trail maps, or training plans
- Account system or cloud sync
- Sub-second or arc-second astronomy tooling
- Server-side generation of times (client calc is the product; keep it that way)

---

## Suggested order

1. **Now panel** + countdowns + live sun/moon position  
2. **Location fallback** (manual / saved) so geo failures don’t block use  
3. **Moon phases + transit + dark/bright windows**  
4. **Golden/blue hour** + 7-day solar strip  
5. **Multi-day calendar** + day deep-link  
6. **PWA** + accuracy fixtures / polar copy  

Ship each slice as something usable alone; avoid a big-bang redesign.

## Success

You can answer, in under ten seconds on a phone:

- Is it light enough to run, and when does that change?
- Where is the moon right now, and when is the best stretch tonight to watch it?
- What’s sunrise / moonrise doing the rest of this week?
