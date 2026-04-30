# CI/CD Empresarial

## Fluxo padrão
O workflow principal é `/.github/workflows/ci.yml` com quatro estágios:
1. `backend-quality`: lint, testes com coverage e readiness de produção.
2. `frontend-quality`: lint, type-check, testes e build.
3. `security`: SAST e auditoria de dependências.
4. `docker-build-smoke`: build de imagens backend/frontend sem push.

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
2. Deploy só ocorre após pipeline completo.
3. Mudanças de infra/config passam por revisão técnica obrigatória.

## Variáveis mínimas para CI de produção
1. `DJANGO_SETTINGS_MODULE=platform.settings.production`
2. `DJANGO_DEBUG=False`
3. `DJANGO_SECRET_KEY` forte
4. `DJANGO_ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, `CSRF_TRUSTED_ORIGINS`
5. `DB_*` e `REDIS_URL`
