# Substrato

Plataforma multi-domínio e multi-tenant com backend Django + DRF + Celery e frontend Next.js. O Substrato já não é apenas uma plataforma de saúde: reúne workspaces e módulos para saúde/laboratório, educação, ERP/WMS, recursos humanos, finanças, operação e inteligência operacional.

O nome **Substrato** remete a **Sistema Unificado de Base Sustentável** unido a **Trato**, apelido do criador do projecto.

A documentação consolidada do projeto está em `SUBSTRATO.md`. Este `README.md` permanece curto e funciona apenas como porta de entrada operacional do repositório.

## Missão, visão e maior valor
- **Missão:** entregar uma plataforma multi-domínio, multi-tenant e auditável que una operação clínica, educação, ERP/WMS, finanças, recursos humanos e inteligência operacional num único núcleo técnico sustentável.
- **Visão:** tornar o Substrato uma base operacional production-ready para organizações que precisam de rastreabilidade, automação, dados fiáveis e capacidade de crescer sem substituir todos os sistemas a cada novo domínio.
- **Maior valor:** reduzir a fragmentação operacional. O projecto pretende trocar folhas soltas, sistemas isolados e decisões sem evidência por fluxos integrados, tenant-aware, observáveis e prontos para auditoria.

## Problemas que o projecto resolve
1. Processos críticos distribuídos por ferramentas sem contrato comum entre dados, permissões e auditoria.
2. Relatórios, PDFs e exportações que bloqueiam a operação quando correm no caminho transaccional.
3. Falta de rastreabilidade entre atendimento, stock, facturação, pagamentos, educação, RH e operação.
4. Crescimento de módulos sem governação técnica, testes, segurança e documentação sincronizados.
5. Dificuldade em preparar uma beta real quando a equipa não tem critérios objectivos de prontidão.

## Cronograma até produção beta
1. **Fundação técnica (30/05/2026 a 15/06/2026):** consolidar documentação, contratos de API/eventos, gates de qualidade, scripts de readiness, segurança base e inventário de dívida crítica.
2. **Beta interna (16/06/2026 a 30/06/2026):** estabilizar exportações assíncronas, PDF/admin shortcuts, fluxos essenciais de saúde, educação, ERP/WMS, RH e backoffice com testes de regressão.
3. **Beta fechada (01/07/2026 a 31/07/2026):** activar tenants piloto, validar permissões, auditoria, observabilidade, backups, rollback, migrações e workflows ponta-a-ponta em dados realistas.
4. **Produção beta (01/08/2026 a 31/08/2026):** operar com SLOs, runbooks, alertas, suporte a incidentes, releases controladas e critérios de aceitação por domínio.

## Caminho para production-ready
O Substrato só deve sair de produção beta quando cumprir, no mínimo:

- `DJANGO_DEBUG=False`, PostgreSQL, Redis, Celery e storage de media configurados para ambiente real.
- `python scripts/production_readiness_check.py`, `make quality-gate`, lint, testes, build frontend e checks de segurança aprovados.
- Backups restauráveis, rollback documentado, monitorização activa e alertas testados.
- Isolamento tenant, RBAC, auditoria e protecção de dados validados em fluxos críticos.
- Documentação técnica actualizada no mesmo ciclo das alterações de código.

## Escopo do produto
- **Saúde e laboratório:** recepção, pacientes, requisições, resultados, consultas, enfermagem, farmácia, banco de sangue, faturação e pagamentos.
- **Educação:** domínio migrado de `schoolar-s` para `apps/education`, com cursos, turmas, estudantes, professores, matrículas, presenças, avaliações, exames, conteúdos e áreas dedicadas para professor, estudante e directoria.
- **ERP e WMS:** compras, recebimentos, armazéns, localizações, itens, lotes, saldos, reservas, separação, expedição, transferências e inventário.
- **Backoffice e plataforma:** identidade, tenants, RBAC, contabilidade, recursos humanos, notificações, auditoria, monitorização, IA operacional, CI/CD e observabilidade.

## Stack principal
- Backend: Django 4.2, Django REST Framework, ASGI/Uvicorn, Postgres, Redis e Celery.
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
python -m uvicorn platform.asgi:application --host 0.0.0.0 --port 8000 --reload
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

## Procedimento de implementação
1. Ler o documento de domínio em `docs/` antes de alterar modelos, serializers, viewsets, tarefas, páginas ou contratos.
2. Confirmar tenant, RBAC, auditoria, idempotência e impacto em dados antes de escrever código.
3. Actualizar testes, OpenAPI/schema gerado, documentação e runbooks no mesmo ciclo da alteração.
4. Validar localmente com o menor conjunto de gates que cobre o risco da alteração; para mudanças transversais, executar `make quality-gate`.
5. Registar dívida técnica remanescente em `docs/technical_debt_register.md`, com owner, impacto e prazo.

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
