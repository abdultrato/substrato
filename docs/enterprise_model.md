# Modelo Empresarial do Substrato

## Objetivo
Definir o baseline técnico para operar o Substrato como software empresarial: seguro, escalável, auditável e com qualidade contínua.

## Missão empresarial
Transformar o Substrato numa plataforma operacional vendável e sustentável, capaz de substituir conjuntos dispersos de ferramentas por um núcleo único de processos, dados, permissões e auditoria.

## Visão de evolução
O produto deve avançar por maturidade comprovada: primeiro consolidar contratos e fluxos essenciais, depois operar uma produção beta controlada, e só então declarar readiness para produção generalizada.

## Valor que deve ser protegido
O maior valor empresarial é confiança operacional: cada tenant deve saber quem fez o quê, com que permissão, em que fluxo, com que dado, e como a equipa consegue recuperar quando algo falha.

## Problemas-alvo
1. Operações clínicas, educacionais, financeiras e logísticas sem integração confiável.
2. Dependência de processos manuais para relatórios, documentos, autorização e auditoria.
3. Crescimento técnico sem critérios objectivos de segurança, qualidade e suporte.
4. Dificuldade em demonstrar prontidão para clientes piloto, investidores ou equipas de operação.

## Pilares
1. Segurança por omissão: produção bloqueada sem configuração segura.
2. Escalabilidade horizontal: API stateless, cache distribuído, workers assíncronos.
3. Operabilidade: health checks, métricas, alertas e runbooks.
4. Qualidade contínua: lint, testes, coverage, readiness e build containerizados.
5. Governança: documentação viva, gates de merge, ownership explícito e rastreabilidade de decisão.

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
6. Dependências e workflows versionados com lockfile, Dependabot e CodeQL ativos.

## Cronograma de maturidade empresarial
1. **Fundação técnica:** documentação de domínio, catálogo de módulos, contratos de API/eventos, readiness e segurança base.
2. **Beta interna:** validação de fluxos ponta-a-ponta por equipa técnica com dados realistas e rollback local.
3. **Beta fechada:** tenants piloto, observabilidade, suporte operacional, backups restauráveis e gestão de incidentes.
4. **Produção beta:** operação real controlada com SLOs, change management, release notes e revisão semanal de dívida.
5. **Production-ready:** escalabilidade validada, RPO/RTO ensaiados, compliance mínimo e suporte repetível.

## Procedimento de implementação empresarial
1. Classificar a alteração por domínio, risco e impacto em tenant/RBAC/auditoria.
2. Confirmar se há contrato público afectado: API, evento, PDF, schema, migração ou rota frontend.
3. Implementar com testes de unidade, integração ou contrato proporcionais ao risco.
4. Actualizar documentação, runbook e registo de dívida no mesmo ciclo.
5. Executar gates de qualidade e readiness antes de promover para beta ou produção.

## Documentos vinculados
- Segurança: `docs/security_baseline.md`
- Segurança de supply chain: `docs/supply_chain_security.md`
- CI/CD: `docs/ci_cd_pipeline.md`
- Release e rollback: `docs/release_and_rollback.md`
- Gestão de mudanças: `docs/change_management.md`
- Qualidade/SLOs: `docs/engineering_quality.md`
- Operações: `docs/operations_runbook.md`
