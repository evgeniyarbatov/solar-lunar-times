PROJECT_NAME := $(shell basename $(PWD))
VENV_PATH = ~/.venv/$(PROJECT_NAME)

# Location coordinates (Sapa, Vietnam)
LATITUDE = 22.336521532217972
LONGITUDE = 103.84304360007465

all: moon sun

venv:
	@python3 -m venv $(VENV_PATH)

install: venv
	@source $(VENV_PATH)/bin/activate && \
	pip install --disable-pip-version-check -q -r requirements.txt

sun:
	@mkdir -p data
	source $(VENV_PATH)/bin/activate && \
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) python scripts/sun.py

moon:
	@mkdir -p data
	source $(VENV_PATH)/bin/activate && \
	LATITUDE=$(LATITUDE) LONGITUDE=$(LONGITUDE) python scripts/moon.py


