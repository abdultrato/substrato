# Substrato Healthcare Platform

Plataforma clínica integrada (Next.js 15 + Django 4.2) migrada para Replit.

## Arquitetura

- **frontend-next/** — Next.js 15 (App Router) na porta **5000** (única exposta publicamente).
- **platform/** + apps Django — backend na porta 8000, acedido pela URL pública via proxy do Next.js (`/api`, `/admin`, `/pdf`, `/static`, `/media`, `/health`).
- **PostgreSQL** — Replit Postgres (vars `PG*`).
- **Cache** — DatabaseCache (`django_cache_table`); Redis desativado (`USE_REDIS=false`).
- **Celery** — desativado (sem broker).

## Workflows

| Workflow | Comando |
|---|---|
| `Django backend` | `DJANGO_SETTINGS_MODULE=platform.settings.development python manage.py runserver 0.0.0.0:8000 --noreload` |
| `Start application` | `cd frontend-next && npm run dev` (Next.js em `0.0.0.0:5000`) |

## Acesso

- App: `https://<repl-url>/`
- Admin: `https://<repl-url>/admin/` (utilizador `admin` / senha inicial `ChangeMe123!` — rotacionar)
- Health: `/health/live`, `/health/ready`

## Decisões de design

- **Tipografia**: Inter (texto) + Plus Jakarta Sans (títulos), carregadas via `next/font/google`.
- **Sidebar**: itens com tooltip (`title`) descritivo, indicador lateral no item ativo, micro-translação no hover.
- **Header**: marca clicável, sem subtítulos redundantes.
- **Tema**: claro/escuro com bootstrap inline em `<head>` (anti-FOUC) e gradientes de fundo com transição suave.

## Deploy

- Tipo: autoscale.
- Build: `scripts/build_production.sh`.
- Run: `scripts/start_production.sh` (gunicorn :8000 + `next start` :5000).

## Dívida técnica conhecida

- `.env.production` está versionado com `DJANGO_SECRET_KEY`, `FERNET_KEY` e credenciais — precisa de rotação para Replit Secrets.
- Endpoint `/api/v1/dashboard/events/` retorna 404 em dev (a tratar).
