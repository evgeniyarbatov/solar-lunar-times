SHELL := /bin/bash

SITE_DIR = site
TERRAFORM_DIR = terraform

PROJECT_NAME := $(shell basename $(PWD))
VENV_PATH = ~/.venv/$(PROJECT_NAME)

LATITUDE = 20.99483745161213
LONGITUDE = 105.86796789515121

all: moon sun

venv:
	@python3 -m venv $(VENV_PATH)

install: venv
	@source $(VENV_PATH)/bin/activate && \
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