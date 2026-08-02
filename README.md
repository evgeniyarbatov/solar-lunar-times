# Solar and Lunar Times

Site showing exact sunrise/sunset and moonrise/moonset times for each day, for planning runs and moon watching.

## How it works

Location is set once in `.env` (`LATITUDE`, `LONGITUDE`). Sun/moon times are computed for that location by `scripts/sun.py` / `scripts/moon.py` (Python, `pyephem`) and written to `site/public/sun.csv`, `site/public/moon.csv`, which a React/Vite site reads and displays.

The site is deployed as a static bundle to an S3 bucket via Terraform.

## Prerequisites

- [uv](https://docs.astral.sh/uv) (Python deps + running Python scripts)
- Node.js + npm (site)
- Terraform + AWS credentials (deploy only)

## Running

```sh
make install   # uv sync — creates/updates .venv
make site       # site dev server (npm install + npm run dev)

make sun        # generate site/public/sun.csv (pyephem)
make moon       # generate site/public/moon.csv (pyephem)

make test       # site unit + screenshot tests
make run         # generate sun/moon data and deploy (sun + moon + deploy)
make deploy      # build site, terraform init + apply
```

Run `make help` for the full command list.
