# Solar and Lunar Times

Static site showing upcoming sunrise/sunset/twilight, moon rise/set and phases, live sun/moon position, and golden/blue hour for your current location.

Live: https://evgeniyarbatov.github.io/solar-lunar-times/

## How it works

The browser requests geolocation, then computes solar and lunar events client-side with [suncalc](https://github.com/mourner/suncalc) (Jean Meeus algorithms). Only events still in the future are shown; the view refreshes periodically so past events drop off without redeploying.

A GitHub Actions workflow runs the unit tests, builds, and deploys to GitHub Pages on every push to `main`.

## Prerequisites

- Node.js + npm

## Running

```sh
make site     # site dev server (npm install + npm run dev)
make test     # site unit + screenshot tests
```

Run `make help` for the full command list.
