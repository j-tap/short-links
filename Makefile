.PHONY: dev prod build generate_traefik clean

PROJECT_NAME=svr9pro

generate_traefik:
	bash -c "set -a && source .env && envsubst < docker-compose.traefik.template.yml > docker-compose.traefik.yml"

dev:
	docker compose -p $(PROJECT_NAME) --env-file .env -f docker-compose.yml up --build

prod: generate_traefik build
	docker compose -p $(PROJECT_NAME) --env-file .env -f docker-compose.prod.yml -f docker-compose.traefik.yml up -d

build:
	docker compose -p $(PROJECT_NAME) --env-file .env -f docker-compose.prod.yml -f docker-compose.traefik.yml build

clean:
	docker compose -p $(PROJECT_NAME) -f docker-compose.dev.yml down || true
	rm -rf frontend/.output frontend/.nuxt frontend/.vite frontend/.turbo
	rm -rf backend/.cache backend/build backend/.tmp/*.lock
