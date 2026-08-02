# Uses uv (https://docs.astral.sh/uv) for dependency management — uv sync creates/updates .venv; run commands via uv run, no manual activation.
SITE_DIR = site
TERRAFORM_DIR = terraform

include .env

install:
	@uv sync

site:
	cd $(SITE_DIR) && npm install
	cd $(SITE_DIR) && npm run dev

test:
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npm run test:screenshot

sun: install
	@LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) uv run python scripts/sun.py

moon: install
	@LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) uv run python scripts/moon.py

deploy:
	cd $(SITE_DIR) && npm install
	cd $(SITE_DIR) && npm run build
	cd $(TERRAFORM_DIR) && terraform init
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve

run: sun moon deploy

lock:
	@uv lock

clean:
	rm -rf .venv

help:
	@echo "install  - create/update .venv and install dependencies"
	@echo "site     - run site dev server"
	@echo "run      - generate sun/moon data and deploy the site"
	@echo "test     - run site tests"
	@echo "sun      - run sun.py"
	@echo "moon     - run moon.py"
	@echo "deploy   - build site and terraform apply"
	@echo "lock     - refresh uv.lock"
	@echo "clean    - remove .venv"
