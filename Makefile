VENV_PATH := .venv

PYTHON := $(VENV_PATH)/bin/python
PIP := $(VENV_PATH)/bin/pip
REQUIREMENTS := requirements.txt

SITE_DIR = site
TERRAFORM_DIR = terraform

venv:
	@python3 -m venv $(VENV_PATH)

install: venv
	@$(PIP) install --disable-pip-version-check -q --upgrade pip
	@$(PIP) install --disable-pip-version-check -q -r $(REQUIREMENTS)

run:
	cd $(SITE_DIR) && npm run dev

test:
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npm run test:screenshot

deploy:
	cd $(SITE_DIR) && npm run build
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve

cleanvenv:
	@rm -rf $(VENV_PATH)
