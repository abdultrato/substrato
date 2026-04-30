## Resumo
- O que foi alterado.
- Motivo da alteração.
- Impacto esperado em produção.

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

## Segurança e conformidade
- [ ] Não expõe segredos em código, logs ou docs
- [ ] Mantém controles de autenticação/autorização
- [ ] Não reduz headers/políticas de segurança
- [ ] Dependências novas justificadas e revisadas

## Deploy e rollback
- [ ] Requer migração de banco
- [ ] Requer atualização de variáveis de ambiente
- [ ] Plano de rollback definido
- [ ] Runbook atualizado (quando aplicável)

## Checklist final
- [ ] Alterações seguem `CODEOWNERS`
- [ ] Documentação atualizada
- [ ] Escopo revisado (sem arquivos acidentais)
