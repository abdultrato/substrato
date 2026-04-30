# Runbook de Release e Rollback

## Pré-release
1. Garantir CI completo em verde.
2. Executar `make production-readiness`.
3. Validar migrações pendentes e plano de rollback de schema.
4. Confirmar janela de deploy e responsáveis de plantão.

## Execução de release
1. Publicar imagem versionada (backend e frontend).
2. Aplicar migrações com lock operacional.
3. Fazer deploy com estratégia rolling/blue-green.
4. Verificar pós-deploy:
   - `/health/live`
   - `/health/ready`
   - métricas e alertas críticos

## Critérios de rollback imediato
1. Aumento sustentado de erro 5xx.
2. Degradação grave de latência p95.
3. Falha de autenticação/autorização generalizada.
4. Falha em fluxos críticos de negócio.

## Procedimento de rollback
1. Reverter para a última imagem estável.
2. Se houver migração incompatível, executar plano de rollback de DB previamente aprovado.
3. Revalidar health checks e SLOs.
4. Abrir incidente com causa raiz e plano corretivo.

## Pós-incidente
1. Registrar timeline técnica.
2. Atualizar `docs/technical_debt_register.md`.
3. Criar ação preventiva no backlog com owner e prazo.
