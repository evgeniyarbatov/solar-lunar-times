VENV_PATH := .venv

PYTHON := $(VENV_PATH)/bin/python
PIP := $(VENV_PATH)/bin/pip
REQUIREMENTS := requirements.txt

venv:
	@python3 -m venv $(VENV_PATH)

install: venv
	@$(PIP) install --disable-pip-version-check -q --upgrade pip
	@$(PIP) install --disable-pip-version-check -q -r $(REQUIREMENTS)

SHELL := /bin/bash

SITE_DIR = site
TERRAFORM_DIR = terraform

LATITUDE = 20.99483745161213
LONGITUDE = 105.86796789515121

all: moon sun

	pip install --disable-pip-version-check -q -r requirements.txt

sun: install
	source $(VENV_PATH)/bin/activate && \
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) python scripts/sun.py

moon: install
	source $(VENV_PATH)/bin/activate && \
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) python scripts/moon.py

deploy:
	cd $(SITE_DIR) && npm install --force && npm run build
	cd $(TERRAFORM_DIR) && terraform init -reconfigure -input=false && \
	terraform apply -auto-approve

cleanvenv:
	@rm -rf $(VENV_PATH)
