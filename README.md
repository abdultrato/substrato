# Substrato

Plataforma clínica e laboratorial multi-tenant com backend Django + DRF + Celery e frontend Next.js.

A documentação consolidada do projeto está em `SUBSTRATO.md`. Este `README.md` permanece curto e funciona apenas como porta de entrada operacional do repositório.

## Stack principal
- Backend: Django 4.2, Django REST Framework, Postgres, Redis e Celery.
- Frontend: Next.js 15, React 18, TypeScript e Tailwind CSS.
- Infraestrutura: Docker Compose, Nginx e OpenAPI via DRF Spectacular.

## Estrutura principal
- `apps/`: módulos de negócio.
- `application/`: casos de uso.
- `domain/`: regras de domínio.
- `api/`: endpoints REST, serializers e viewsets.
- `frontend-next/`: aplicação web.
- `SUBSTRATO.md`: documentação consolidada completa.

## Execução local
```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

```bash
cd frontend-next
npm install
npm run dev
```

## Docker
```bash
docker compose up --build
```

## Endpoints úteis
- API docs: `http://localhost:8000/api/docs/`
- ReDoc: `http://localhost:8000/api/redoc/`
- Schema OpenAPI: `http://localhost:8000/api/schema/`
- Health checks: `http://localhost:8000/health/live` e `http://localhost:8000/health/ready`

## Qualidade
```bash
make quality-gate
make ops-health
make production-readiness
```

## Governança técnica
- SLOs, gates e política de dívida técnica: `docs/engineering_quality.md`
- Runbook operacional: `docs/operations_runbook.md`
- Registro de dívida técnica: `docs/technical_debt_register.md`
- Fluxo de exportações assíncronas: `docs/async_exports.md`
- Modelo empresarial (visão executiva): `docs/enterprise_model.md`
- Baseline de segurança: `docs/security_baseline.md`
- Pipeline de CI/CD empresarial: `docs/ci_cd_pipeline.md`
- Runbook de release e rollback: `docs/release_and_rollback.md`

Os documentos Markdown históricos do projeto foram incorporados ao `SUBSTRATO.md`.
