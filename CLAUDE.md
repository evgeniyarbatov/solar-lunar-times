# solar-lunar-times

Static site showing upcoming sunrise/sunset/twilight, moon phase/rise/set, live sun/moon position, and golden/blue hour for the user's location, deployed to GitHub Pages at https://evgeniyarbatov.github.io/solar-lunar-times/.

## Structure

- `site/` — React + Vite app. `src/astro.js` computes upcoming solar/lunar events with `suncalc`; `src/dataUtils.js` has formatting helpers; `src/App.jsx` handles geolocation + render.
- `.github/workflows/deploy.yml` — unit tests, build, publish `site/dist` to GitHub Pages on push to `main`.

## Commands

- `make site` — site dev server
- `make test` — site unit tests + Playwright screenshot test
