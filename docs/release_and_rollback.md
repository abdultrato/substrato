# Runbook de Release e Rollback

## Pré-release
1. Garantir CI completo em verde.
2. Executar `make production-readiness`.
3. Executar `make migration-check`.
4. Gerar snapshot antes da mudança: `make backup-automatic`.
5. Confirmar janela de deploy e responsáveis de plantão.

## Execução de release
1. Publicar imagem versionada (backend e frontend).
2. Aplicar migrações com lock operacional: `make migrate-safe`.
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
2. Restaurar base conforme backup pré-release:
   - `make restore-backup BACKUP=backups/substrato_backup_YYYYmmdd_HHMMSS.tgz`
   - ou `./scripts/restore_backup.sh --from <backup> --dry-run` para validar antes.
3. Se houver migração incompatível, executar plano de rollback de schema previamente aprovado.
4. Revalidar health checks e SLOs.
5. Abrir incidente com causa raiz e plano corretivo.

## Pós-incidente
1. Registrar timeline técnica.
2. Atualizar `docs/technical_debt_register.md`.
3. Criar ação preventiva no backlog com owner e prazo.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define como publicar versões e recuperar quando uma release falha.

**Valor que protege.** Protege reversibilidade, confiança de beta e redução de impacto em tenants reais.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve incluir checklist de release, migrações, validação pós-deploy e rollback manual.

**Para production-ready.** Exige rollback ensaiado, artefactos versionados, janelas de deploy e métricas de estabilização.
