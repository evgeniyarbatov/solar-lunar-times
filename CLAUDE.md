# solar-lunar-times

Static site showing sunrise/sunset/twilight times and moon phase/rise/set for a fixed location, deployed to S3 via Terraform.

## Structure

- `.env` — single source of truth for `LATITUDE`/`LONGITUDE`. Included directly by the Makefile; read by the Vite site via `envDir`/`envPrefix` in `site/vite.config.js` (`import.meta.env.LATITUDE`/`LONGITUDE`).
- `scripts/sun.py`, `scripts/moon.py` — Python (`pyephem`), generate `site/public/sun.csv` / `site/public/moon.csv` for the next 90 days. Take `LATITUDE`/`LONGITUDE` from env vars, set by the Makefile.
- `site/` — React + Vite app that fetches and renders the CSVs. `src/dataUtils.js` has the CSV/formatting helpers; `src/App.jsx` has the fetch + render logic.
- `terraform/` — S3 bucket + static website hosting for the built site.

## Commands

- `make install` — `uv sync`
- `make site` — site dev server
- `make sun` / `make moon` — regenerate the CSVs
- `make test` — site unit tests + Playwright screenshot test
- `make deploy` — build site, `terraform init` + `apply`
- `make run` — `sun` + `moon` + `deploy`

Python: `ruff` + `mypy --strict`, enforced via pre-commit (`.pre-commit-config.yaml`).
