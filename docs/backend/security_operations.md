# Segurança e Operação do Backend

Actualizado: 2026-05-25

Este documento reúne as regras de segurança, runtime e operação que protegem o backend em desenvolvimento, staging e produção.

## Autenticação

- A API usa JWT por `security.authenticacao.JWTAuth`.
- O header suportado é `Authorization: Bearer <token>`.
- `SIMPLE_JWT` define access e refresh token com validade de 30 minutos por padrão.
- Password reset usa tokens com TTL configurável em `PASSWORD_RESET_TOKEN_TTL_MINUTES`.
- Login tem throttling por scope `login`.

## Autorização e RBAC

- A autorização padrão em endpoints DRF é `IsAuthenticated` mais `RBACPermission` nos ViewSets registados.
- `api/v1/routing/routes.py` aplica RBAC automaticamente aos ViewSets.
- Excepções devem ser explícitas, pequenas e justificadas.
- Grupos e permissões vivem em `security/permissions/` e APIs auxiliares em `security/api/`.
- Superusers podem atravessar regras comuns, mas em produção devem ser restringidos por `SUBSTRATO_SUPERUSER_ALLOWLIST`.

## Multi-tenant

- `TenantMiddleware` resolve tenant da request.
- `TenantEnforcerMiddleware` impede acesso sem tenant quando o path exige escopo.
- `TenantScopedQuerysetMixin` filtra QuerySets e força tenant em escrita.
- `TenantLimitMiddleware` aplica limites por plano quando activado.
- `TenantAuditMiddleware` regista actividade por tenant quando activado.

Falha grave: qualquer endpoint que permita ler ou escrever dados de outro tenant por manipulação de ID ou payload.

## Segurança HTTP

Configurações principais:

- `SECURE_CONTENT_TYPE_NOSNIFF = True`.
- `X_FRAME_OPTIONS = "DENY"`.
- Cookies de sessão e CSRF são HTTP-only.
- Cookies seguros em produção (`SESSION_COOKIE_SECURE`, `CSRF_COOKIE_SECURE`).
- CORS aberto apenas em `DEBUG`; em produção usar `CORS_ALLOWED_ORIGINS`.
- `CSRF_TRUSTED_ORIGINS` deve ser configurado quando há reverse proxy/frontend em origin diferente.

## Métricas e health checks

| Endpoint | Semântica | Dependências |
|---|---|---|
| `/health/live` | Processo Django responde. | Nenhuma dependência externa. |
| `/health/ready` | Backend está pronto para tráfego. | Base de dados e Redis quando `USE_REDIS=true`. |
| `/metrics` | Métricas Prometheus. | `django_prometheus` quando instalado. |

`/metrics` pode exigir `Authorization: Bearer <PROMETHEUS_BEARER_TOKEN>`. Quando o token está configurado e a autorização falha, responde 404 para reduzir enumeração.

## Logs e erros

- Logging é configurado em `platform/settings/logging.py`.
- `ErrorCaptureMiddleware` persiste falhas operacionais.
- `APILoggingMiddleware` regista actividade de API quando activado.
- Logs não devem conter tokens, passwords, dados clínicos completos ou payloads de outro tenant.
- Erros de API devem passar pelo exception handler global e manter formato estruturado.

## Cache e Redis

- `USE_REDIS=true` activa Redis via `django_redis`.
- Sem Redis, o backend usa `DatabaseCache` na tabela `django_cache_table`.
- Cache de dados tenant-aware deve incluir tenant no key ou ficar em camada já escopada.
- Nunca cachear permissões, dados clínicos ou resultados financeiros sem estratégia clara de invalidação.

## Celery e assíncrono

- Broker e result backend usam `REDIS_URL`.
- Tarefas devem ser serializadas em JSON.
- Jobs de exportação devem ter estado rastreável e erro observável.
- Tarefas idempotentes são preferíveis; quando não forem, documentar porquê.
- Evitar side effects irreversíveis sem registo de auditoria.

## Ficheiros, PDFs e media

- `MEDIA_ROOT` recebe ficheiros carregados/gerados.
- `STATIC_ROOT` recebe estáticos colectados.
- PDFs clínicos, farmacêuticos e administrativos devem ser gerados por funções dedicadas em `tasks/generate_pdf/`.
- Endpoints de PDF devem definir content type correcto e evitar expor ficheiros fora do tenant.

## Ambientes

| Ambiente | Settings | Observações |
|---|---|---|
| Desenvolvimento | `plataforma.settings.development` | Pode cair para SQLite se PostgreSQL local não estiver disponível. |
| Produção | `platform.settings.production` | Exige hosts, endurece segurança, valida configuração e evita SQLite. |
| Testes | `pytest.ini` com settings de desenvolvimento | Usar `--reuse-db` para acelerar bateria local. |

## Comandos operacionais

```bash
python manage.py migrate
python manage.py makemigrations --check --dry-run
python manage.py migrate --check
python manage.py spectacular --file frontend-next/schema.json
python scripts/convert_schema_json.py
```

Targets úteis:

```bash
make quality-gate
make ops-health
make production-readiness
make migration-check
make release-baseline
make backup-automatic
make restore-backup BACKUP=backups/substrato_backup_YYYYmmdd_HHMMSS.tgz
```

## Validação de qualidade

Validação mínima antes de publicar alteração backend:

```bash
ruff check . --no-fix
python -m pytest -q --reuse-db
python manage.py makemigrations --check --dry-run
```

Quando a alteração toca frontend ou contrato API:

```bash
npm --prefix frontend-next run lint -- --max-warnings=0
npm --prefix frontend-next run type-check
```

Quando a alteração toca OpenAPI/tipos:

```bash
python manage.py spectacular --file frontend-next/schema.json
python scripts/convert_schema_json.py
```

## Backup e rollback

- Backups operacionais usam scripts em `scripts/backup_automatic.sh` e `scripts/restore_backup.sh`.
- Antes de migrations destrutivas, criar backup e plano de rollback.
- Rollback de código sem rollback de schema pode falhar; planear ambos juntos.
- Data migrations devem ter caminho reversível quando possível.

## Checklist de produção

1. `DEBUG=false`.
2. `DJANGO_ALLOWED_HOSTS` definido.
3. `CORS_ALLOWED_ORIGINS` e `CSRF_TRUSTED_ORIGINS` definidos para os domínios reais.
4. PostgreSQL configurado; não usar SQLite.
5. Redis configurado quando Celery/cache assíncrono for obrigatório.
6. `PROMETHEUS_BEARER_TOKEN` definido se `/metrics` estiver exposto.
7. Superuser allowlist revista.
8. `production-readiness`, `migration-check` e testes críticos verdes.
9. Backup recente criado antes de migração de schema/dados.
10. Logs e alertas operacionais verificados.
