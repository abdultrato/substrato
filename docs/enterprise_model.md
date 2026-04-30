# Modelo Empresarial do Substrato

## Objetivo
Definir o baseline técnico para operar o Substrato como software empresarial: seguro, escalável, auditável e com qualidade contínua.

## Pilares
1. Segurança por omissão: produção bloqueada sem configuração segura.
2. Escalabilidade horizontal: API stateless, cache distribuído, workers assíncronos.
3. Operabilidade: health checks, métricas, alertas e runbooks.
4. Qualidade contínua: lint, testes, coverage, readiness e build containerizados.
5. Governança: documentação viva, gates de merge e rastreabilidade de decisão.

## Arquitetura alvo
1. Backend: Django + DRF + Celery.
2. Frontend: Next.js com proxy para API Django.
3. Dados: PostgreSQL (transacional) + Redis (cache/broker).
4. Observabilidade: Prometheus + Grafana + Alertmanager.
5. Entrega: GitHub Actions com gates de qualidade, segurança e build.

## Contratos operacionais mínimos
1. `DJANGO_DEBUG=False` em produção.
2. `USE_REDIS=true` em produção.
3. `DB_ENGINE=postgres` em produção.
4. `python scripts/production_readiness_check.py` obrigatório antes de deploy.
5. Deploy bloqueado quando `manage.py check --deploy` falhar.

## Documentos vinculados
- Segurança: `docs/security_baseline.md`
- CI/CD: `docs/ci_cd_pipeline.md`
- Release e rollback: `docs/release_and_rollback.md`
- Qualidade/SLOs: `docs/engineering_quality.md`
- Operações: `docs/operations_runbook.md`
