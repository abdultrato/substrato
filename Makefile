# ============================================================================
# MAKEFILE - Docker Commands
# ============================================================================

.PHONY: help build up down logs shell migrate createsuperuser clean test lint

help:
	@echo "🐳 Substrato - Docker Commands"
	@echo ""
	@echo "Gerenciamento:"
	@echo "  make build              - Build das imagens Docker"
	@echo "  make up                 - Iniciar containers"
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
	docker-compose build

up:
	docker-compose up -d
	@echo "✅ Containers iniciados!"
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:3000"

down:
	docker-compose down

restart:
	docker-compose restart

logs:
	docker-compose logs -f

logs-backend:
	docker-compose logs -f backend

logs-frontend:
	docker-compose logs -f frontend

logs-db:
	docker-compose logs -f db

logs-redis:
	docker-compose logs -f redis

logs-celery:
	docker-compose logs -f celery

migrate:
	docker-compose exec backend python manage.py migrate

makemigrations:
	docker-compose exec backend python manage.py makemigrations

createsuperuser:
	docker-compose exec backend python manage.py createsuperuser

shell:
	docker-compose exec backend python manage.py shell

static:
	docker-compose exec backend python manage.py collectstatic --noinput

dbshell:
	docker-compose exec db psql -U substrato_user -d substrato_db

dbreset:
	@echo "⚠️  Isso vai RESETAR o banco de dados!"
	@read -p "Digite 'sim' para confirmar: " confirm; \
	if [ "$$confirm" = "sim" ]; then \
		docker-compose exec db dropdb -U substrato_user substrato_db; \
		docker-compose exec db createdb -U substrato_user substrato_db; \
		make migrate; \
		echo "✅ Banco resetado!"; \
	else \
		echo "Cancelado"; \
	fi

npm-install:
	docker-compose exec frontend npm install

npm-build:
	docker-compose exec frontend npm run build

test:
	docker-compose exec backend python manage.py test

lint:
	docker-compose exec backend ruff check .

format:
	docker-compose exec backend ruff format .

clean:
	docker-compose down -v
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	@echo "✅ Tudo limpo!"

ps:
	docker-compose ps

stats:
	docker stats

celery-inspect:
	docker-compose exec backend python -m celery -A plataforma inspect active

celery-purge:
	docker-compose exec backend python -m celery -A plataforma purge

redis-cli:
	docker-compose exec redis redis-cli

backup:
	@mkdir -p backups
	docker-compose exec db pg_dump -U substrato_user substrato_db > backups/db_`date +%Y%m%d_%H%M%S`.sql
	@echo "✅ Backup realizado!"

restore:
	@read -p "Arquivo para restaurar: " file; \
	docker-compose exec -T db psql -U substrato_user substrato_db < $$file; \
	echo "✅ Restaurado!"

bash-backend:
	docker-compose exec backend bash

bash-frontend:
	docker-compose exec frontend sh

bash-db:
	docker-compose exec db bash

prod-up:
	docker-compose -f docker-compose.prod.yml up -d

prod-down:
	docker-compose -f docker-compose.prod.yml down

prod-logs:
	docker-compose -f docker-compose.prod.yml logs -f

.DEFAULT_GOAL := help
