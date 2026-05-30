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

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define como mudanças são classificadas, aprovadas, comunicadas e revertidas.

**Valor que protege.** Protege estabilidade operacional e evita deploys sem contexto, owner ou plano de recuperação.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve ser usado em alterações com impacto em dados, permissões, workflows ou disponibilidade.

**Para production-ready.** Exige calendário de mudanças, CAB leve, revisão pós-release e integração com incidentes.
