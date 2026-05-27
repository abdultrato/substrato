# Substrato

Plataforma multi-domínio e multi-tenant com backend Django + DRF + Celery e frontend Next.js. O Substrato já não é apenas uma plataforma de saúde: reúne workspaces e módulos para saúde/laboratório, educação, ERP/WMS, recursos humanos, finanças, operação e inteligência operacional.

A documentação consolidada do projeto está em `SUBSTRATO.md`. Este `README.md` permanece curto e funciona apenas como porta de entrada operacional do repositório.

## Escopo do produto
- **Saúde e laboratório:** recepção, pacientes, requisições, resultados, consultas, enfermagem, farmácia, banco de sangue, faturação e pagamentos.
- **Educação:** domínio migrado de `schoolar-s` para `apps/education`, com cursos, turmas, estudantes, professores, matrículas, presenças, avaliações, exames, conteúdos e áreas dedicadas para professor, estudante e directoria.
- **ERP e WMS:** compras, recebimentos, armazéns, localizações, itens, lotes, saldos, reservas, separação, expedição, transferências e inventário.
- **Backoffice e plataforma:** identidade, tenants, RBAC, contabilidade, recursos humanos, notificações, auditoria, monitorização, IA operacional, CI/CD e observabilidade.

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
- `docs/backend/`: documentação técnica do backend, catálogo de módulos, API, dados, tenancy, segurança e operação.
- `docs/frontend/`: documentação técnica do frontend, rotas, componentes, API, estado, qualidade e operação.

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
make migration-check
make release-baseline
```

## Backup e rollback operacional
```bash
make backup-automatic
make restore-backup BACKUP=backups/substrato_backup_YYYYmmdd_HHMMSS.tgz
```

## Governança técnica
- SLOs, gates e política de dívida técnica: `docs/engineering_quality.md`
- Documentação técnica do backend: `docs/backend/README.md`
- Documentação técnica do frontend: `docs/frontend/README.md`
- Runbook operacional: `docs/operations_runbook.md`
- Registro de dívida técnica: `docs/technical_debt_register.md`
- Fluxo de exportações assíncronas: `docs/async_exports.md`
- Modelo empresarial (visão executiva): `docs/enterprise_model.md`
- Baseline de segurança: `docs/security_baseline.md`
- Pipeline de CI/CD empresarial: `docs/ci_cd_pipeline.md`
- Runbook de migração education: `docs/education_migration_runbook.md`
- Runbook de release e rollback: `docs/release_and_rollback.md`
- Política de reporte de vulnerabilidades: `SECURITY.md`
- Gestão de mudanças (change management): `docs/change_management.md`
- Segurança de supply chain: `docs/supply_chain_security.md`

Os documentos Markdown históricos do projeto foram incorporados ao `SUBSTRATO.md`.
