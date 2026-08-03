SITE_DIR = site
TERRAFORM_DIR = terraform

site:
	cd $(SITE_DIR) && npm install
	cd $(SITE_DIR) && npm run dev -- --open

test:
	cd $(SITE_DIR) && npm test
	cd $(SITE_DIR) && npm run test:screenshot

deploy:
	cd $(SITE_DIR) && npm install
	cd $(SITE_DIR) && npm run build
	cd $(TERRAFORM_DIR) && terraform init
	cd $(TERRAFORM_DIR) && terraform apply -auto-approve

run: deploy

help:
	@echo "site    - run site dev server"
	@echo "test    - run site unit + screenshot tests"
	@echo "deploy  - build site and terraform apply"
	@echo "run     - alias for deploy"

.PHONY: site test deploy run help
