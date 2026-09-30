SITE_DIR = site

site:
	cd $(SITE_DIR) && npm install
	cd $(SITE_DIR) && npm run dev -- --open

test:
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npm run test:screenshot

help:
	@echo "site    - run site dev server"
	@echo "test    - run site unit + screenshot tests"

.PHONY: site test help
