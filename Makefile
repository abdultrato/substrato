# ============================================================================
# MAKEFILE - Docker Commands
# ============================================================================

COMPOSE ?= docker compose

.PHONY: help build up up-build down logs shell migrate createsuperuser clean test lint

help:
	@echo "🐳 Substrato - Docker Commands"
	@echo ""
	@echo "Gerenciamento:"
	@echo "  make build              - Build das imagens Docker"
	@echo "  make up                 - Iniciar containers (com build)"
	@echo "  make up-build           - Iniciar em foreground (com build)"
	@echo "  make down               - Parar containers"
	@echo "  make logs               - Ver logs em tempo real"
	@echo "  make clean              - Remover volumes e dados"
	@echo ""
	@echo "Django:"
	@echo "  make migrate            - Executar migrations"
	@echo "  make createsuperuser    - Criar superuser"
	@echo "  make shell              - Django shell interativo"
	@echo "  make static             - Coletar arquivos estáticos"
	@echo ""
	@echo "Banco de Dados:"
	@echo "  make dbshell            - PostgreSQL shell"
	@echo "  make dbreset            - Resetar banco (⚠️ cuidado!)"
	@echo ""
	@echo "Frontend:"
	@echo "  make npm-install        - npm install"
	@echo "  make npm-build          - npm run build"
	@echo ""
	@echo "Desenvolvimento:"
	@echo "  make test               - Executar testes"
	@echo "  make lint               - Rodar linter (ruff)"
	@echo "  make format             - Formatar código"
	@echo ""
	@echo "Celery:"
	@echo "  make celery-logs        - Ver logs do Celery"
	@echo "  make celery-inspect     - Inspetar workers"
	@echo ""

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up --build -d
	@echo "✅ Containers iniciados!"
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:3000"

up-build:
	$(COMPOSE) up --build

down:
	$(COMPOSE) down

restart:
	$(COMPOSE) restart

logs:
	$(COMPOSE) logs -f

logs-backend:
	$(COMPOSE) logs -f backend

logs-frontend:
	$(COMPOSE) logs -f frontend

logs-db:
	$(COMPOSE) logs -f db

logs-redis:
	$(COMPOSE) logs -f redis

logs-celery:
	$(COMPOSE) logs -f celery

migrate:
	$(COMPOSE) exec backend python manage.py migrate

makemigrations:
	$(COMPOSE) exec backend python manage.py makemigrations

createsuperuser:
	$(COMPOSE) exec backend python manage.py createsuperuser

shell:
	$(COMPOSE) exec backend python manage.py shell

static:
	$(COMPOSE) exec backend python manage.py collectstatic --noinput

dbshell:
	$(COMPOSE) exec db psql -U substrato_user -d substrato

dbreset:
	@echo "⚠️  Isso vai RESETAR o banco de dados!"
	@read -p "Digite 'sim' para confirmar: " confirm; \
	if [ "$$confirm" = "sim" ]; then \
		$(COMPOSE) exec db dropdb -U substrato_user --if-exists --maintenance-db=postgres substrato; \
		$(COMPOSE) exec db createdb -U substrato_user --maintenance-db=postgres substrato; \
		make migrate; \
		echo "✅ Banco resetado!"; \
	else \
		echo "Cancelado"; \
	fi

npm-install:
	$(COMPOSE) exec frontend npm install

npm-build:
	$(COMPOSE) exec frontend npm run build

schema:
	python manage.py spectacular --file frontend-next/schema.json
	python scripts/convert_schema_json.py

types:
	cd frontend-next && npm run generate:api

schema-types: schema types

coverage-backend:
	pytest --cov=. --cov-report=term-missing

coverage-frontend:
	cd frontend-next && npm test -- --coverage

test:
	$(COMPOSE) exec backend pytest

lint:
	$(COMPOSE) exec backend ruff check .

format:
	$(COMPOSE) exec backend ruff format .

clean:
	$(COMPOSE) down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "✅ Tudo limpo!"

ps:
	$(COMPOSE) ps

stats:
	docker stats

celery-inspect:
	$(COMPOSE) exec backend python -m celery -A plataforma inspect active

celery-purge:
	$(COMPOSE) exec backend python -m celery -A plataforma purge

redis-cli:
	$(COMPOSE) exec redis redis-cli

backup:
	@mkdir -p backups
	$(COMPOSE) exec -T db pg_dump -U substrato_user substrato > backups/db_`date +%Y%m%d_%H%M%S`.sql
	@echo "✅ Backup realizado!"

restore:
	@read -p "Arquivo para restaurar: " file; \
	$(COMPOSE) exec -T db psql -U substrato_user substrato < $$file; \
	echo "✅ Restaurado!"

bash-backend:
	$(COMPOSE) exec backend bash

bash-frontend:
	$(COMPOSE) exec frontend sh

bash-db:
	$(COMPOSE) exec db bash

prod-up:
	$(COMPOSE) -f docker-compose.prod.yml up -d

prod-down:
	$(COMPOSE) -f docker-compose.prod.yml down

prod-logs:
	$(COMPOSE) -f docker-compose.prod.yml logs -f

.DEFAULT_GOAL := help
