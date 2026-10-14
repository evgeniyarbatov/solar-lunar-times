SITE_DIR = site

.DEFAULT_GOAL := help

setup:
	cd $(SITE_DIR) && npm install

site: setup
	cd $(SITE_DIR) && npm run dev -- --open

run: site

test: setup
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npx playwright install --with-deps chromium && npm run test:screenshot

help:
	@echo "run     - alias for site"
	@echo "setup   - install site/ npm dependencies"
	@echo "site    - run site dev server"
	@echo "test    - run site unit + screenshot tests"

.PHONY: setup run site test help
