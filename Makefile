.PHONY: dev prod build generate_traefik

generate_traefik:
	bash -c "set -a && source .env && envsubst < docker-compose.traefik.template.yml > docker-compose.traefik.yml"

dev:
	docker compose --env-file .env -f docker-compose.yml up --build

prod: generate_traefik build
	docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.traefik.yml up -d

build:
	docker compose --env-file .env -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.traefik.yml build
