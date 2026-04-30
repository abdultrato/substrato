# Gestão de Mudanças (Change Management)

## Objetivo
Padronizar mudanças em produção com previsibilidade, baixo risco e rastreabilidade.

## Classificação de mudança
1. **Padrão**: baixo risco, procedimento repetível, rollback simples.
2. **Normal**: risco moderado, exige validação técnica e plano de rollback.
3. **Emergencial**: risco alto/urgência operacional, fluxo acelerado com revisão pós-incidente obrigatória.

## Fluxo mínimo
1. Abrir issue com contexto, impacto e critérios de aceitação.
2. Implementar via PR com checklist completo (`pull_request_template.md`).
3. Aprovação de owners conforme `CODEOWNERS`.
4. CI verde (`ci.yml`) e sem bloqueios críticos de segurança.
5. Aprovação operacional para janela de deploy.
6. Deploy manual por ambiente e validação pós-deploy.

## Matriz de risco (resumo)
1. **Baixo**: sem migração, sem impacto em autenticação, rollback imediato.
2. **Médio**: migração compatível ou alteração de comportamento não crítico.
3. **Alto**: alteração em auth, billing, multi-tenant, filas críticas ou dados sensíveis.

## Requisitos de mudança normal/alta
1. Plano de rollback documentado.
2. Evidência de testes e readiness.
3. Atualização de documentação operacional quando aplicável.
4. Responsável técnico definido.

## Pós-implementação
1. Confirmar health checks (`/health/live`, `/health/ready`).
2. Verificar alertas e métricas de erro/latência.
3. Registrar resultado da mudança (sucesso/rollback/incidente).
