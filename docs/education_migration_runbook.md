# Runbook: Migração `schoolar-s` -> `education`

## Objetivo
Executar e validar a migração de dados legados do `schoolar-s` para o domínio `apps/education` com controlo de divergências.

## Pré-requisitos
1. Backup da base de dados de destino.
2. Tenant de fallback definido (quando o legado não tiver `tenant_id` resolvível).
3. Ambiente Django funcional (`python manage.py check`).

## 1) Inventário inicial
```bash
python manage.py education_migration_inventory --format text
```

## 2) Preview de migração (sem escrita)
```bash
python manage.py education_migrate_legacy --format text
```

Com base legada externa (SQLite):
```bash
python manage.py education_migrate_legacy --legacy-db "C:\caminho\legacy_schoolar.sqlite3" --format text
```

## 3) Auditoria de divergências
```bash
python manage.py education_migration_audit --strict --format text
```

Com relatório JSON:
```bash
python manage.py education_migration_audit --strict --output logs/education-migration-audit.json --format json
```

Com relatório Markdown:
```bash
python manage.py education_migration_audit --strict --output-markdown logs/education-migration-audit.md --format markdown
```

Com JSON + Markdown no mesmo comando:
```bash
python manage.py education_migration_audit --strict --output logs/education-migration-audit.json --output-markdown logs/education-migration-audit.md --format json
```

## 4) Aplicar migração
```bash
python manage.py education_migrate_legacy --apply --fallback-tenant <tenant_identifier> --format text
```

Com base legada externa:
```bash
python manage.py education_migrate_legacy --legacy-db "C:\caminho\legacy_schoolar.sqlite3" --apply --fallback-tenant <tenant_identifier> --format text
```

## 5) Auto-fix de divergências
```bash
python manage.py education_migration_audit --auto-fix --strict --fallback-tenant <tenant_identifier> --format text
```

## 6) Validação final
1. `education_migration_audit --strict` deve terminar sem divergências.
2. Rever artefactos JSON e Markdown de auditoria (se gerados).
3. Executar testes da trilha de migração:
```bash
pytest -q tests/test_education_migrate_legacy_command.py tests/test_education_migration_audit_command.py tests/test_education_migration_inventory_command.py
```

## Notas
1. `--strict` falha o comando quando existir qualquer segmento divergente.
2. `--auto-fix` faz upsert seguro e reaudita no mesmo ciclo.
3. `--output-markdown` grava relatório Markdown legível para operação/auditoria.
4. Em CI, o gate está em `/.github/workflows/ci.yml` com upload de JSON+Markdown e resumo no run.
5. Há workflow dedicado em `/.github/workflows/education-migration-audit.yml`:
   - modo manual (`workflow_dispatch`) para execução sob demanda;
   - modo agendado diário (`03:20 UTC`) para vigilância contínua de divergências.
6. Quando o modo agendado falha, o workflow cria/atualiza uma issue operacional para rastreio e resposta.
7. Quando um agendado posterior volta a passar, a issue operacional aberta é comentada e encerrada automaticamente.
8. A issue/comentário operacional inclui métricas do JSON de auditoria (`status`, segmentos divergentes, totais de `missing/extra` e `warnings`) para diagnóstico imediato.
9. O workflow usa `concurrency` para evitar sobreposição de execuções e mantém artefactos por 30 dias.
10. O JSON inclui `overview` com resumo executivo: `status`, `segments_match/divergent`, `divergent_segments`, `total_missing_in_target`, `total_extra_in_target`, `warnings_total` e flags de `auto_fix`.
11. O workflow extrai `overview` para outputs internos e reutiliza os mesmos valores em notificações de falha e de recuperação, reduzindo duplicação de lógica.
12. A extração de outputs do `overview` é implementada por `scripts/extract_education_audit_overview.py`, que também pode ser executado localmente para diagnóstico rápido.
13. O workflow `education-migration-audit` aplica `python manage.py migrate --noinput` antes da auditoria para garantir o esquema mínimo no runner limpo.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Governa a migração e prontidão do domínio Education dentro do Substrato.

**Valor que protege.** Protege compatibilidade com o legado, continuidade académica e integração segura com identidade, pagamentos e relatórios.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve validar estudantes, professores, turmas, matrículas, avaliações, exames, presenças e workspaces principais.

**Para production-ready.** Exige migração auditável, rollback, contratos de dados, formação operacional e critérios de descontinuação do legado.
