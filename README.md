# Substrato – Plataforma Clínica/Laboratorial Multi‑Tenant

Arquitetura profissional em Django + DRF + Celery, com frontend Next.js/React, orientada a domínio (DDD) e preparada para operação SaaS multi‑tenant.

---

## Sumário
1. Visão Geral
2. Principais Domínios e Funcionalidades
3. Arquitetura
4. Frontend (Next.js)
5. Operação: Ambiente Local
6. Operação: Docker / Produção
7. Testes e Qualidade
8. Padrões de Código e Tipagem
9. Observabilidade e Segurança
10. Referências Rápidas

---

## 1) Visão Geral
- **Backend:** Django 4.2 + Django REST Framework, Postgres, Redis, Celery.
- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, tema claro/escuro (tokens CSS) e UI orientada a módulos.
- **Multi‑tenant:** isolamento lógico por inquilino em toda a camada de dados (mixins + middleware).
- **Eventos/Integrações:** serviços de mensageria (e‑mail, SMS, WhatsApp), gateway de pagamentos e faturamento integrado.
- **Observabilidade:** health checks /health/live e /health/ready; logs estruturados; métricas previstas.

---

## 2) Principais Domínios e Funcionalidades
- **Identidade** (`apps/identity`): usuários com vínculo obrigatório a inquilino; permissões e auditoria.
- **Inquilinos** (`apps/tenants`): planos, assinaturas, flags de feature e métricas de uso.
- **Clínico** (`apps/clinical`): pacientes, exames, requisições, resultados.
- **Prontuário (Cardex)** (`apps/medical_records`): registros clínicos, sintomas/diagnóstico e prescrição estruturada (itens).
- **Maternidade** (`apps/maternity`): acompanhamento de gestação (MVP) com campos adicionais (berçário, cama, partos, cesarianas).
- **Enfermagem** (`apps/nursing`): procedimentos, materiais, sinais vitais e evolução; integração com faturamento.
- **Enfermaria** (`apps/nursing`): gestão de enfermaria/camas/internamentos + dashboard (ocupação e próximas medicações).
- **Farmácia** (`apps/pharmacy`): produtos, lotes, estoque, vendas.
- **Faturamento** (`apps/billing`): faturas multi‑origem, itens (exame, farmácia, enfermagem, ajustes), estados (rascunho, emitida, paga).
- **Pagamentos** (`apps/payments`): pagamentos, transações, recibos automáticos (1 por fatura) e PDF do recibo.
- **Contabilidade** (`apps/accounting`): contas, lançamentos, movimentos (débito/crédito), conciliação.
- **Recepção** (`apps/reception`): fluxo check‑in → requisição → fatura → pagamento (testado end‑to‑end).
- **Seguradora** (`apps/insurer`): seguradoras, planos, autorizações de procedimento.
- **Notificações** (`apps/notifications`): templates, log de envio, canais (e‑mail/SMS/WhatsApp) com idempotência por referência.
- **Entidades externas** (`apps/external_entities`): empresas para medicina ocupacional e requisições/terceirizações.
- **Dashboard/Estatísticas** (`api/v1/dashboard` + frontend): KPIs, gráficos e exportação de relatórios (PDF/CSV/Word).

---

## 3) Arquitetura
```
Cliente Web (Next.js) ──────► API DRF (Django)
                                │
                                ├─ Aplicação (application/) – orquestra casos de uso
                                │
                                ├─ Domínio (domain/) – regras puras, eventos
                                │
                                ├─ Infra (infrastructure/) – ORM, cache, middlewares
                                │
                                ├─ Integrações (integrations/) – e-mail, SMS, WhatsApp, pagamentos
                                │
                                └─ Tarefas (Celery) – filas assíncronas (redis)

Persistência: Postgres
Cache/Filas: Redis
Serviço HTTP: gunicorn + nginx/traefik (prod)
```

### Tenancy
- `InquilinoMixin` aplica chave estrangeira obrigatória.
- Middleware `InquilinoMiddleware` resolve inquilino corrente.
- Restrições de unicidade condicionais por `inquilino`.

### Documentação & API
- OpenAPI gerada via DRF Spectacular (`/api/schema/`, `/api/docs/`, `/api/redoc/`).
- Script `generate_schema.py` gera/atualiza `frontend-next/schema.json` (usado pelo `AutoForm` no frontend).

---

## 4) Frontend (Next.js)
- App Router em `frontend-next/app`.
- CRUD “Recursos” como exemplo de form auto‑gerado: usa `components/form/AutoForm.tsx` + schema OpenAPI para tipar campos.
- Tema claro/escuro como atalho rápido (Header/Sidebar) e tokens no `app/globals.css`.
- Testes com Vitest / Testing Library.

Comandos úteis:
```bash
cd frontend-next
npm install
npm test          # vitest
npm run dev
npm run build
npm run build:admin-css   # gera CSS Tailwind compacto para o Django Admin (Jazzmin)
```

---

## 5) Operação: Ambiente Local
```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```
Variáveis (.env local):
- `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=True`, `DJANGO_ALLOWED_HOSTS=127.0.0.1,localhost`
- `DB_*` para Postgres ou use SQLite default.
- `REDIS_URL` se usar Celery/Redis local.
- Notificações (e-mail/WhatsApp):
- `DEFAULT_FROM_EMAIL`
- `EMAIL_BACKEND`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `EMAIL_USE_SSL`
- `NOTIFICACOES_EMAIL_ATIVAS=True|False`
- `NOTIFICACOES_WHATSAPP_ATIVAS=True|False`, `WHATSAPP_API_URL`, `WHATSAPP_API_KEY`
- Reposição de palavra-passe:
- `PASSWORD_RESET_TOKEN_TTL_MINUTES` (default: 30)

Nota:
- Se você executar `manage.py` com um venv que não tem as dependências, erros como `ModuleNotFoundError: django_celery_beat` são esperados.
- Em modo Docker, prefira rodar comandos Django via `docker compose exec backend ...`.

### Backups e Reset (DEV)
Scripts prontos (ignorados pelo git via `backups/`):
```bash
./scripts/backup_automatico.sh --dest backups --keep 14
./scripts/reset_database_and_migrations.sh
./scripts/reset_database_and_migrations.sh --docker-db
```

---

## 6) Operação: Docker / Produção

### Compose (desenvolvimento)

**Linux/Kali:**
```bash
./docker-up.sh
```

**Windows (PowerShell):**
```powershell
./docker-up.ps1
```

Esses scripts automatizam o processo de build e inicialização, incluindo verificação de dependências e criação do arquivo .env.

Alternativamente, você pode executar manualmente:
```bash
cp .env.docker .env
docker compose up --build
```

### Usuários de demo (RBAC)
Após subir os containers, rode:
```bash
docker compose exec backend python manage.py migrate
docker compose exec backend python manage.py bootstrap_role_users --reset-password --password admin123
```

Credenciais (senha padrão `admin123`):
- `admin` (Administrador; único usuário com acesso ao `/admin`)
- `recepcao`, `laboratorio`, `enfermagem`, `medico`, `ocupacional`, `farmacia`, `contabilidade`, `rh`

### Build das imagens
```bash
docker build -f Dockerfile -t substrato_backend:latest .
docker build -f Dockerfile.frontend -t substrato_frontend:latest .
```

### Compose (produção)
- Arquivo: `docker-compose.prod.yml`
- Use um `.env.prod` com: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `API_DOMAIN`, `FRONTEND_DOMAIN`, `REDIS_URL`, `DJANGO_DEBUG=False`, `SLACK_WEBHOOK`.
- Pipeline sugerido:
```bash
docker compose -f docker-compose.prod.yml run --rm backend python manage.py migrate
docker compose -f docker-compose.prod.yml run --rm backend python manage.py collectstatic --noinput
docker compose -f docker-compose.prod.yml up -d traefik backend frontend celery celery_beat redis db
```
- Volume persistente: `media_volume` para uploads.

### EntryPoint ajustado
- Cria/relaciona tenant “default” para o superuser.
- `collectstatic` é tolerante a falta de permissão de volume (log de aviso, não aborta).

---

## 7) Testes e Qualidade

### Backend
```bash
pytest
pytest apps/notifications/tests.py    # exemplo por app
```
Cobertura atual: suíte completa de 46 testes cobre fluxos de clínica, recepção→faturamento→pagamento, contabilidade, enfermagem, farmácia, seguradora, notificações e inquilinos.

### Frontend
```bash
cd frontend-next
npm test
```

### CI
- Workflow `.github/workflows/ci.yml` roda pytest e testes do frontend.
- Makefile alvo: `make coverage-backend`, `make coverage-frontend`, `make schema-types`.

---

## 8) Padrões de Código e Tipagem
- Python: tipagem gradual; linters/formatters via Ruff configurados.
- Frontend: TypeScript estrito; formulários auto‑tipados a partir do OpenAPI.
- Convenções:
  - Regras de domínio fora de `api/`.
  - Adapters externos isolados em `integrations/`.
  - Tasks Celery não contêm regra de domínio, apenas orquestração.

---

## 9) Observabilidade e Segurança
- Health checks: `/health/live`, `/health/ready`.
- Métricas Prometheus: `/metrics` (habilitado por `django-prometheus`).
- Logging estruturado; hooks de auditoria em mixins.
- Permissões DRF customizadas; middleware de limites por tenant.
- Traefik com Let’s Encrypt configurável (production compose).
- Checklist de Docker em `DOCKER-TESTS.md` e guia em `DOCKER.md`.
- Grafana/Prometheus prontos no `docker-compose.prod.yml` (dashboards em `monitoring/grafana`).

---

## 10) Referências Rápidas
- **Apps principais:** `apps/` (clinical, medical_records, maternity, nursing, pharmacy, billing, payments, accounting, consultations, reception, external_entities, insurer, notifications, tenants, identity).
- **OpenAPI UI:** `http://localhost:8000/api/docs/` e `http://localhost:8000/api/redoc/`.
- **Schema para o frontend:** `python generate_schema.py` (gera `frontend-next/schema.json`).
- **Documentos:** `API-DOCS.md`, `DOCKER-QUICK-START.md`, `CI-CD.md`, `MONITORING.md`, `PROXIMOS_PASSOS.md`.

### Endpoints úteis (PDF/Relatórios)
- Resultados (LAB): `GET /api/v1/clinico/requisicaoanalise/<id>/pdf_resultados/`
- Fatura (PDF): `GET /api/v1/faturamento/fatura/<id>/pdf/`
- Recibo (PDF): `GET /api/v1/pagamentos/recibo/<id>/pdf/`
- Estatísticas export: `GET /api/v1/dashboard/analytics/export/?tipo=pdf|csv|word`
- História clínica (paciente): `GET /api/v1/clinico/paciente/<id>/historia_clinica/`

---

### Roadmap sugerido
- Endurecer imagem prod (dependências de teste fora da imagem).
- Habilitar métricas (Prometheus/Grafana já previsto no compose).
- SSL end‑to‑end com Traefik e DNS configurado.
- Backups automatizados do Postgres e rotação de logs.
