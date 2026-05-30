# Engenharia de Qualidade: SLOs, Gates e Dívida Técnica

## Propósito

Este documento define como o Substrato mede prontidão técnica. A missão da qualidade é impedir que a pressa de implementar novos domínios degrade segurança, rastreabilidade, performance, documentação ou confiança operacional.

## Papel até beta e production-ready

1. **Até beta interna:** todos os fluxos críticos devem ter teste mínimo, documentação actualizada e comando de validação conhecido.
2. **Até beta fechada:** SLOs, alertas, incidentes e rollback devem estar ligados a owners e runbooks.
3. **Até produção beta:** releases devem ser reversíveis, observáveis e acompanhadas por checklist de mudança.
4. **Para production-ready:** qualidade deixa de ser esforço manual e passa a ser gate repetível em CI/CD, com cobertura, segurança e performance mensuráveis.

## 1) SLOs Operacionais

### API
- `Latency p95`: <= 1.2s (janela de 5 minutos).
- `Error rate 5xx`: <= 3% (janela de 5 minutos).

### Fila assíncrona
- Falha de enqueue: 0 em janela de 10 minutos.
- Falhas de execução: <= 5 em janela de 10 minutos.
- `Export latency p95`: <= 8s para jobs `export:*`.

## 2) Gates de qualidade (obrigatórios)

### Backend
- `pytest --cov=. --cov-report=term-missing --cov-fail-under=35`
- `ruff check .` e `ruff format . --check`
- `python scripts/production_readiness_check.py`

### Frontend
- `npm run lint`
- `npm run type-check`
- `npm run test -- --coverage --run` com thresholds globais em `vitest.config.ts`.
- `npm run build`

### Segurança
- `bandit -q -r apps api application core domain infrastructure security services`
- `pip-audit` (visibilidade de vulnerabilidades de dependências Python)
- `npm audit --omit=dev --audit-level=high`

## 3) Política de dívida técnica

Toda dívida técnica deve:
1. Ter item no registro de dívida técnica (`docs/technical_debt_register.md`).
2. Ter owner, impacto e prazo.
3. Ser revisada semanalmente junto com incidentes operacionais.
4. Entrar no sprint quando impacto operacional for `alto`.

## 4) Critérios de bloqueio para merge/release

Bloquear merge/release quando:
1. Gate de qualidade falhar.
2. Alertas críticos persistirem após janela de estabilização.
3. Regressão de SLO ocorrer sem plano aprovado de mitigação.

## 5) Procedimento de codificação orientado a qualidade

1. Antes de codificar, identificar o domínio afectado, contrato público, risco de dados e impacto em tenant/RBAC.
2. Durante a implementação, manter regra de negócio em domínio/aplicação e evitar lógica crítica dispersa em serializers, views ou componentes.
3. Depois da implementação, executar testes proporcionais ao risco e actualizar documentação técnica, runbook ou registo de dívida.
4. Antes de release beta, confirmar métricas, logs, rollback, migração e plano de observação pós-deploy.
