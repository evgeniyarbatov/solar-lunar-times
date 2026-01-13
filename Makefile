VENV_PATH := .venv

PYTHON := $(VENV_PATH)/bin/python
PIP := $(VENV_PATH)/bin/pip
REQUIREMENTS := requirements.txt

SITE_DIR = site
TERRAFORM_DIR = terraform

LATITUDE = 20.99483745161213
LONGITUDE = 105.86796789515121

venv:
	@python3 -m venv $(VENV_PATH)

install: venv
	@$(PIP) install --disable-pip-version-check -q --upgrade pip
	@$(PIP) install --disable-pip-version-check -q -r $(REQUIREMENTS)

sun:
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) $(PYTHON) scripts/sun.py

moon:
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) $(PYTHON) scripts/moon.py

run:
	cd $(SITE_DIR) && npm run dev

deploy:
	cd $(SITE_DIR) && npm run build
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve

cleanvenv:
	@rm -rf $(VENV_PATH)
