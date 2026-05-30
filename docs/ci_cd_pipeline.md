# CI/CD Empresarial

## Fluxo padrão
O workflow principal é `/.github/workflows/ci.yml` com quatro estágios:
1. `backend-quality`: lint, testes com coverage e readiness de produção.
2. `frontend-quality`: lint, type-check, testes e build.
3. `security`: SAST e auditoria de dependências.
4. `docker-build-smoke`: build de imagens backend/frontend sem push.

Dentro de `backend-quality`, há um gate adicional de migração education:
1. `python manage.py education_migration_audit --strict --output logs/education-migration-audit-ci.json --output-markdown logs/education-migration-audit-ci.md --format json`
2. Relatórios JSON e Markdown são publicados como artefacto versionado por execução.
3. O relatório Markdown é publicado em `GITHUB_STEP_SUMMARY` para leitura imediata no run.

## Publicação e deploy
1. `/.github/workflows/build.yml`: publica imagens Docker no GHCR em `push` para `main`, tags `v*` e execução manual.
2. `/.github/workflows/deploy.yml`: deploy manual com aprovação por ambiente (`staging`/`production`) e validação explícita de segredos.
3. Workflows legados redundantes de `test`/`lint` foram removidos para evitar execução duplicada de gates.
4. `/.github/workflows/codeql.yml`: análise SAST contínua com CodeQL para Python e JavaScript.
5. `/.github/dependabot.yml`: atualização automática semanal de dependências Python, NPM e GitHub Actions.
6. `/.github/workflows/dependency-review.yml`: bloqueio de PR para vulnerabilidades de dependência de alta severidade.
7. `/.github/workflows/sbom.yml`: geração e publicação de SBOM para backend e frontend.
8. `/.github/workflows/education-migration-audit.yml`: auditoria de migração education em modo manual e agendado (`cron` diário às `03:20 UTC`), com opções `strict`/`auto_fix` no modo manual, saída JSON+Markdown, resumo no run (incluindo cenários de falha), extração centralizada de `overview` em outputs do workflow via `scripts/extract_education_audit_overview.py`, notificação automática por issue quando a execução agendada falha, detalhe de métricas (`status`, segmentos divergentes, contagem de segmentos divergentes, `missing/extra`, `warnings`) na issue com base no bloco `overview` do JSON de auditoria, fecho automático dessa issue quando o agendado volta a passar, `concurrency` ativo e retenção de artefactos por 30 dias.
9. Todos os workflows definem `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` e usam versões atualizadas de actions (`checkout/setup-* /upload-artifact` e correlatas) para reduzir risco de quebra na transição dos runners para Node 24.

## Gates obrigatórios
1. `ruff check` no repositório completo, sem exclusões do módulo legado de education.
2. `pytest --cov` com fail-under configurado.
3. `python scripts/production_readiness_check.py`.
4. `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`.
5. `bandit` e `npm audit` em dependências de produção.
6. `education_migration_audit --strict` para bloquear regressão da trilha de migração `schoolar-s -> education`.

## Estratégia de branches
1. `main`: release branch.
2. `develop`: integração contínua.
3. Pull request para `main/develop` exige CI verde.

## Regras de promoção
1. Merge sem CI verde é bloqueado.
2. Build/publish de imagem ocorre só após merge em `main` ou tag de release.
3. Deploy é manual e exige credenciais válidas por ambiente.
4. Mudanças de infra/config passam por revisão técnica obrigatória.
5. Dependências críticas devem ser tratadas via PR de segurança antes de release.
6. Todo PR deve preencher checklist de segurança, validação e rollback.

## Variáveis mínimas para CI de produção
1. `DJANGO_SETTINGS_MODULE=platform.settings.production`
2. `DJANGO_DEBUG=False`
3. `DJANGO_SECRET_KEY` forte
4. `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
5. `DB_*` e `REDIS_URL`

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define a esteira de entrega que transforma alterações em releases verificáveis.

**Valor que protege.** Protege qualidade, segurança, repetibilidade e bloqueios automáticos antes de beta/produção.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve executar gates essenciais, build frontend/backend, checks de segurança e readiness.

**Para production-ready.** Exige promoção por ambientes, artefactos versionados, rollback automatizável e auditoria de releases.
