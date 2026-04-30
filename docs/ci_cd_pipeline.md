# CI/CD Empresarial

## Fluxo padrão
O workflow principal é `/.github/workflows/ci.yml` com quatro estágios:
1. `backend-quality`: lint, testes com coverage e readiness de produção.
2. `frontend-quality`: lint, type-check, testes e build.
3. `security`: SAST e auditoria de dependências.
4. `docker-build-smoke`: build de imagens backend/frontend sem push.

## Publicação e deploy
1. `/.github/workflows/build.yml`: publica imagens Docker no GHCR em `push` para `main`, tags `v*` e execução manual.
2. `/.github/workflows/deploy.yml`: deploy manual com aprovação por ambiente (`staging`/`production`) e validação explícita de segredos.
3. Workflows legados redundantes de `test`/`lint` foram removidos para evitar execução duplicada de gates.
4. `/.github/workflows/codeql.yml`: análise SAST contínua com CodeQL para Python e JavaScript.
5. `/.github/dependabot.yml`: atualização automática semanal de dependências Python, NPM e GitHub Actions.

## Gates obrigatórios
1. `ruff check` e `ruff format --check`.
2. `pytest --cov` com fail-under configurado.
3. `python scripts/production_readiness_check.py`.
4. `npm run lint`, `npm run type-check`, `npm run test`, `npm run build`.
5. `bandit` e `npm audit` em dependências de produção.

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

## Variáveis mínimas para CI de produção
1. `DJANGO_SETTINGS_MODULE=platform.settings.production`
2. `DJANGO_DEBUG=False`
3. `DJANGO_SECRET_KEY` forte
4. `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
5. `DB_*` e `REDIS_URL`
