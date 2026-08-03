# solar-lunar-times

Static site showing upcoming sunrise/sunset/twilight and moon phase/rise/set for the user's location, deployed to S3 via Terraform.

## Structure

- `site/` — React + Vite app. `src/astro.js` computes upcoming solar/lunar events with `suncalc`; `src/dataUtils.js` has formatting helpers; `src/App.jsx` handles geolocation + render.
- `terraform/` — S3 bucket + static website hosting for the built site.

## Commands

- `make site` — site dev server
- `make test` — site unit tests + Playwright screenshot test
- `make deploy` — build site, `terraform init` + `apply`
- `make run` — alias for `deploy`
