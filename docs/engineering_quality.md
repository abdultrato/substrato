# Engenharia de Qualidade: SLOs, Gates e Dívida Técnica

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
