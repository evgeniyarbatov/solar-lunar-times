# Uses uv (https://docs.astral.sh/uv) for dependency management — uv sync creates/updates .venv; run commands via uv run, no manual activation.
SITE_DIR = site
TERRAFORM_DIR = terraform

LATITUDE = 20.99483745161213
LONGITUDE = 105.86796789515121

install:
	@uv sync

run:
	cd $(SITE_DIR) && npm run dev

test:
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npm run test:screenshot

sun: install
	@LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) uv run python scripts/sun.py

moon: install
	@LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) uv run python scripts/moon.py

suncalc:
	@LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) TZ=Asia/Ho_Chi_Minh node scripts/suncalc_csv.js

deploy:
	cd $(SITE_DIR) && npm run build
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve

lock:
	@uv lock

clean:
	rm -rf .venv

help:
	@echo "install  - create/update .venv and install dependencies"
	@echo "run      - run site dev server"
	@echo "test     - run site tests"
	@echo "sun      - run sun.py"
	@echo "moon     - run moon.py"
	@echo "suncalc  - run suncalc_csv.js"
	@echo "deploy   - build site and terraform apply"
	@echo "lock     - refresh uv.lock"
	@echo "clean    - remove .venv"
