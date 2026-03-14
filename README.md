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
- **Frontend:** Next.js (App Router), TypeScript, Tailwind (se aplicável), Vitest/jest-dom/testing-library.
- **Multi‑tenant:** isolamento lógico por inquilino em toda a camada de dados (mixins + middleware).
- **Eventos/Integrações:** serviços de mensageria (e‑mail, SMS, WhatsApp), gateway de pagamentos e faturamento integrado.
- **Observabilidade:** health checks /health/live e /health/ready; logs estruturados; métricas previstas.

---

## 2) Principais Domínios e Funcionalidades
- **Identidade** (`aplicativos/identidade`): usuários com vínculo obrigatório a inquilino; permissões e auditoria.
- **Inquilinos** (`aplicativos/inquilinos`): planos, assinaturas, flags de feature e métricas de uso.
- **Clínico** (`aplicativos/clinico`): pacientes, exames, requisições, resultados.
- **Enfermagem** (`aplicativos/enfermagem`): procedimentos, materiais, sinais vitais e evolução; integração com faturamento.
- **Farmácia** (`aplicativos/farmacia`): produtos, lotes, estoque, vendas.
- **Faturamento** (`aplicativos/faturamento`): faturas multi‑origem, itens (exame, farmácia, enfermagem, ajustes), estados (rascunho, emitida, paga).
- **Pagamentos** (`aplicativos/pagamentos`): pagamentos, transações, recibos automáticos, reconciliação.
- **Contabilidade** (`aplicativos/contabilidade`): contas, lançamentos, movimentos (débito/crédito), conciliação.
- **Recepção** (`aplicativos/recepcao`): fluxo check‑in → requisição → fatura → pagamento (testado end‑to‑end).
- **Seguradora** (`aplicativos/seguradora`): seguradoras, planos, autorizações de procedimento.
- **Notificações** (`aplicativos/notificacoes`): templates, log de envio, canais (e‑mail/SMS/WhatsApp) com idempotência por referência.

---

## 3) Arquitetura
```
Cliente Web (Next.js) ──────► API DRF (Django)
                                │
                                ├─ Aplicação (aplicacao/) – orquestra casos de uso
                                │
                                ├─ Domínio (dominio/) – regras puras, eventos
                                │
                                ├─ Infra (infrastrutura/) – ORM, cache, middlewares
                                │
                                ├─ Integrações (integracoes/) – e-mail, SMS, WhatsApp, pagamentos
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
- OpenAPI gerada via DRF Spectacular (`/schema/`).
- Script `scripts/convert_schema_json.py` converte para `frontend-next/schema.generated.json` para formularios tipados.

---

## 4) Frontend (Next.js)
- App Router em `frontend-next/app`.
- CRUD “Recursos” como exemplo de form auto‑gerado: usa `components/form/AutoForm.tsx` + schema OpenAPI para tipar campos.
- Testes com Vitest / Testing Library.

Comandos úteis:
```bash
cd frontend-next
npm install
npm test          # vitest
npm run dev
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

### Build das imagens
```bash
docker build -f Dockerfile -t substrato_backend:latest .
docker build -f Dockerfile.frontend -t substrato_frontend:latest .
```

### Compose (produção)
- Arquivo: `docker-compose.prod.yml`
- Use um `.env.prod` com: `DJANGO_SECRET_KEY`, `DJANGO_ALLOWED_HOSTS`, `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `API_DOMAIN`, `FRONTEND_DOMAIN`, `REDIS_URL`, `DJANGO_DEBUG=False`.
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
pytest aplicativos/notificacoes/tests.py    # exemplo por app
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
  - Adapters externos isolados em `integracoes/`.
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
- **Apps principais:** `aplicativos/` (clinico, enfermagem, farmacia, faturamento, pagamentos, contabilidade, recepcao, seguradora, notificacoes, inquilinos, identidade).
- **OpenAPI:** `python manage.py spectacular --file schema.yml` ou `make schema`.
- **Scripts úteis:** `scripts/convert_schema_json.py` (backend → frontend forms).
- **Documentos:** `API-DOCS.md`, `DOCKER-QUICK-START.md`, `CI-CD.md`, `MONITORING.md`, `PROXIMOS_PASSOS.md`.

---

### Roadmap sugerido
- Endurecer imagem prod (dependências de teste fora da imagem).
- Habilitar métricas (Prometheus/Grafana já previsto no compose).
- SSL end‑to‑end com Traefik e DNS configurado.
- Backups automatizados do Postgres e rotação de logs.
