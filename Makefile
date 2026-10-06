SITE_DIR = site

install:
	cd $(SITE_DIR) && npm install

site: install
	cd $(SITE_DIR) && npm run dev -- --open

test: install
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npx playwright install --with-deps chromium && npm run test:screenshot

help:
	@echo "install - install site/ npm dependencies"
	@echo "site    - run site dev server"
	@echo "test    - run site unit + screenshot tests"

.PHONY: install site test help
