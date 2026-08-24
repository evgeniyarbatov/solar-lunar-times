# TODO

First slice from [ROADMAP.md](ROADMAP.md)'s suggested order:

- [ ] **Now panel** — live sun/moon altitude/azimuth, day/night/twilight band,
  countdowns to the next few events. Highest-leverage "should I head out
  right now?" view; currently the site only shows discrete upcoming events.
- [ ] **Location fallback** — manual location entry / saved favorites, so a
  geolocation failure doesn't block the whole page (currently falls back to
  a single hardcoded reference location per git history).
- [ ] `site/` has a Playwright screenshot test (`make test`) but no CI
  workflow runs it on push.
