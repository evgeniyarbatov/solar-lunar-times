# Solar and Lunar Times

Static site showing upcoming sunrise/sunset/twilight and moon rise/set times for your current location.

## How it works

The browser requests geolocation, then computes solar and lunar events client-side with [suncalc](https://github.com/mourner/suncalc) (Jean Meeus algorithms). Only events still in the future are shown; the view refreshes periodically so past events drop off without redeploying.

Deployed to GitHub Pages on every push to `main`: https://evgeniyarbatov.github.io/solar-lunar-times/

## Prerequisites

- Node.js + npm

## Running

```sh
make site     # site dev server (npm install + npm run dev)
make test     # site unit + screenshot tests
```

Run `make help` for the full command list.
