## Resumo
- O que foi alterado.
- Motivo da alteração.
- Impacto esperado em produção.

## Alinhamento com missão e beta
- Problema operacional que a alteração resolve.
- Domínio afectado: saúde, educação, ERP/WMS, RH, finanças, plataforma, frontend, backend, IA ou documentação.
- Contributo para beta interna, beta fechada, produção beta ou production-ready.
- Risco assumido e mitigação escolhida.

## Tipo de mudança
- [ ] Correção de bug
- [ ] Nova funcionalidade
- [ ] Refatoração
- [ ] Segurança
- [ ] Infraestrutura / CI-CD
- [ ] Documentação

## Evidências de validação
- [ ] Backend: testes/lint executados
- [ ] Frontend: lint/type-check/test/build executados
- [ ] Gate de prontidão: `python scripts/production_readiness_check.py`
- [ ] Sem regressão de endpoints críticos
- [ ] Documentação técnica/runbook actualizado quando a mudança altera comportamento, contrato, operação ou risco

## Segurança e conformidade
- [ ] Não expõe segredos em código, logs ou docs
- [ ] Mantém controles de autenticação/autorização
- [ ] Não reduz headers/políticas de segurança
- [ ] Dependências novas justificadas e revisadas
- [ ] Tenant, RBAC e auditoria revistos quando há dados ou acções sensíveis

## Deploy e rollback
- [ ] Requer migração de banco
- [ ] Requer atualização de variáveis de ambiente
- [ ] Plano de rollback definido
- [ ] Runbook atualizado (quando aplicável)
- [ ] Observação pós-deploy definida para alterações de beta/produção

## Checklist final
- [ ] Alterações seguem `CODEOWNERS`
- [ ] Documentação atualizada
- [ ] Escopo revisado (sem arquivos acidentais)
- [ ] Dívida técnica remanescente registada com owner e prazo
