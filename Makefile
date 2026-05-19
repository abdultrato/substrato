# ============================================================================
# MAKEFILE - Docker Commands
# ============================================================================

COMPOSE ?= docker compose
BACKEND_COVERAGE_MIN ?= 35

.PHONY: help build up up-build down logs shell migrate createsuperuser clean test lint \
	education-migration-preview education-migration-audit education-migration-audit-markdown education-migration-audit-strict education-migration-audit-fix

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
	@echo "  make quality-gate       - Executar gates de qualidade (backend + frontend)"
	@echo "  make quality-gate-backend - Coverage backend com fail-under"
	@echo "  make quality-gate-frontend - Lint + type-check + coverage frontend"
	@echo "  make lint               - Rodar linter (ruff)"
	@echo "  make format             - Formatar código"
	@echo ""
	@echo "Celery:"
	@echo "  make celery-logs        - Ver logs do Celery"
	@echo "  make celery-inspect     - Inspetar workers"
	@echo ""
	@echo "Operações:"
	@echo "  make ops-health         - Verificar health, metrics e Prometheus rules"
	@echo "  make ops-alert-rules    - Validar regras Prometheus com promtool"
	@echo "  make ops-slo            - Resumo rápido de latência/erros no /metrics"
	@echo "  make production-readiness - Gate de prontidão para produção"
	@echo "  make education-migration-preview - Inventário rápido de migração education"
	@echo "  make education-migration-audit   - Auditoria de divergências (education)"
	@echo "  make education-migration-audit-markdown - Auditoria com relatório Markdown em logs/"
	@echo "  make education-migration-audit-strict - Auditoria strict (falha se divergente)"
	@echo "  make education-migration-audit-fix - Auto-fix + strict para education"
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

quality-gate-backend:
	pytest --cov=. --cov-report=term-missing --cov-fail-under=$(BACKEND_COVERAGE_MIN)

quality-gate-frontend:
	cd frontend-next && npm run lint
	cd frontend-next && npm run type-check
	cd frontend-next && npm run test -- --coverage --run

quality-gate: quality-gate-backend quality-gate-frontend

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
	$(COMPOSE) exec backend python -m celery -A platform inspect active

celery-purge:
	$(COMPOSE) exec backend python -m celery -A platform purge

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

ops-alert-rules:
	$(COMPOSE) exec prometheus promtool check rules /etc/prometheus/rules/*.rules.yml

ops-health:
	@echo "== Health checks =="
	@curl -fsS http://localhost:8000/health/ready >/dev/null && echo "backend /health/ready: OK" || (echo "backend /health/ready: FAIL" && exit 1)
	@curl -fsS http://localhost:8000/metrics >/dev/null && echo "backend /metrics: OK" || (echo "backend /metrics: FAIL" && exit 1)
	@$(MAKE) ops-alert-rules

ops-slo:
	@echo "== SLO quick sample (/metrics) =="
	@curl -fsS http://localhost:8000/metrics | grep -E "substrato_api_request_duration_seconds|substrato_async_task_execution_duration_seconds|substrato_async_task_enqueue_total" | head -n 30 || true

production-readiness:
	python scripts/production_readiness_check.py

education-migration-preview:
	python manage.py education_migrate_legacy --format text

education-migration-audit:
	python manage.py education_migration_audit --format text

education-migration-audit-markdown:
	python manage.py education_migration_audit --output-markdown logs/education-migration-audit.md --format markdown

education-migration-audit-strict:
	python manage.py education_migration_audit --strict --format text

education-migration-audit-fix:
	python manage.py education_migration_audit --auto-fix --strict --format text

.DEFAULT_GOAL := help
