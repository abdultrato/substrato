# Arquitectura do Backend

Actualizado: 2026-05-25

O backend do Substrato é uma aplicação Django 4.2 com Django REST Framework, JWT, RBAC, multi-tenant, Celery, Redis opcional, PostgreSQL como base recomendada e fallback local para SQLite em desenvolvimento. A arquitectura mistura módulos Django maduros com camadas adicionais (`domain/`, `application/`, `services/`, `infrastructure/`) para separar regra de negócio, orquestração e adaptação técnica.

## Princípios

- O domínio não deve depender de detalhes de transporte HTTP quando uma regra pode viver em `apps/<modulo>/models.py`, `apps/<modulo>/models/` ou `services/<modulo>/`.
- A API deve ser uma camada fina de validação, serialização, autorização e orquestração.
- Toda entidade com tenant deve ser filtrada pelo tenant da request, nunca por valor livre enviado pelo cliente.
- Operações de escrita com efeito financeiro, clínico, farmacêutico ou académico devem ter validação explícita e testes.
- Soft delete, auditoria, versionamento e identificadores customizados devem usar os modelos/mixins base existentes.
- Compatibilidade PT/EN deve ser feita em camadas centralizadas de alias, não em correcções locais espalhadas.

## Camadas principais

| Camada | Caminhos | Responsabilidade |
|---|---|---|
| Entrada HTTP | `platform/urls.py`, `api/urls.py`, `api/v1/urls.py` | Admin, API, health checks, schema, docs e PDFs. |
| Routing API v1 | `api/v1/routing/routes.py` | Regista ViewSets por prefixo e aplica `RBACPermission` de forma uniforme. |
| Serialização | `api/v1/<modulo>/serializers.py` | Normaliza payloads, aliases legados, validações de request/response e representação DRF. |
| ViewSets/Views | `api/v1/<modulo>/viewsets.py`, `api/v1/<modulo>/viewsets_impl/` | CRUD, acções customizadas, filtros, permissões e chamadas a serviços. |
| Domínio Django | `apps/<modulo>/models.py`, `apps/<modulo>/models/` | Entidades persistidas, estados, validações de modelo, managers e sinais. |
| Serviços | `services/<modulo>/`, `apps/<modulo>/services/` | Casos de uso, cálculos, transacções, integração entre modelos e side effects controlados. |
| Infraestrutura | `infrastructure/` | Middleware, tenant context, request user context, storage, cache, outbox, idempotência e adaptadores. |
| Segurança | `security/` | JWT, RBAC, grupos, permissões, throttling, sanitização e auditoria de acesso. |
| Base comum | `core/` | Modelos base, mixins, constantes, value objects, eventos, ORM e utilitários partilhados. |
| Tarefas | `tasks/` | PDFs, jobs assíncronos e tarefas operacionais integradas com Celery/exports. |
| Observabilidade | `observability/`, `apps/monitoring`, `platform/urls.py` | Métricas, health checks, outbox, erros e SLOs. |

## Ciclo de uma request API

1. O cliente chama `/api/v1/<grupo>/<recurso>/` ou uma rota explícita em `api/v1/urls.py`.
2. `platform/urls.py` encaminha `/api/` para `api.urls` e daí para `api/v1/urls.py`.
3. Os middlewares aplicam segurança, tenant, captura de erros, request user context, limites e logging.
4. O router DRF, montado por `api/v1/routing/routes.py`, resolve o ViewSet.
5. `RBACPermission` é aplicado automaticamente aos ViewSets registados, salvo excepções explícitas.
6. O ViewSet aplica `TenantScopedQuerysetMixin` quando o modelo possui campo `tenant`.
7. O serializer normaliza aliases, valida payload, aplica `full_clean` quando configurado e devolve representação estável.
8. Serviços de domínio executam regras, transacções e side effects quando o caso de uso não é CRUD trivial.
9. A resposta passa pelo exception handler e pelos middlewares de auditoria/observabilidade.

## Configuração Django

| Ficheiro | Papel |
|---|---|
| `platform/settings/base.py` | Settings comuns: apps, middleware, DB, cache, auth, DRF, JWT, Celery, CORS, CSRF, OpenAPI. |
| `platform/settings/development.py` | Overrides locais, hosts permissivos e ajustes de logging/desempenho para desenvolvimento. |
| `platform/settings/production.py` | Hardening de produção, hosts obrigatórios, storage estático e cache. |
| `platform/settings/security.py` | Parâmetros de segurança reutilizáveis. |
| `platform/settings/logging.py` | Estrutura de logs por logger, handler e nível. |
| `plataforma/settings/development.py` | Compatibilidade para importar o pacote local `platform` sem conflito com o módulo standard library. |

## Aplicações instaladas

As aplicações locais são declaradas em `platform/settings/base.py` e incluem identidade, seguradoras, entidades externas, clínica, enfermagem, equipamentos, billing, pagamentos, notificações, tenants, farmácia, banco de sangue, contabilidade, recepção, auditoria, consultas, registos médicos, maternidade, cirurgia, recursos humanos, monitorização, assistente IA e educação.

A ordem importa: módulos de identidade, entidades externas e domínios base carregam antes de módulos que dependem deles. Evite reordenar `LOCAL_APPS` sem executar migrações, testes de import e validação do admin.

## Middlewares

A cadeia principal em `platform/settings/base.py` inclui:

- Segurança Django, WhiteNoise, CORS, sessão, locale e common middleware.
- `AdminPathAliasMiddleware` para compatibilidade de paths administrativos.
- `TenantMiddleware` e `TenantEnforcerMiddleware` para resolver e obrigar tenant.
- `ErrorCaptureMiddleware` para persistir falhas operacionais.
- Autenticação Django e mensagens.
- `RequestUserMiddleware` para disponibilizar utilizador actual em contexto local.
- `TenantLimitMiddleware`, `TenantAuditMiddleware`, `UserActivityMiddleware` e `APILoggingMiddleware` de forma configurável.
- Prometheus before/after middleware quando `django_prometheus` está disponível.

## Banco de dados e cache

- `DB_ENGINE=postgres` é o padrão recomendado.
- Em desenvolvimento, quando variáveis obrigatórias ou host PostgreSQL não existem, o backend cai para SQLite para facilitar arranque local.
- `DATABASE_ROUTERS` aponta para `infrastructure.database.TenantDatabaseRouter`.
- Redis é opcional via `USE_REDIS=true`; sem Redis, usa `DatabaseCache` na tabela `django_cache_table`.

## Celery e tarefas

A configuração Celery usa `REDIS_URL` como broker e result backend. As tarefas e jobs vivem em `tasks/`, `infrastructure/tasks/`, `services/reports/async_exports.py` e módulos específicos. Tarefas que produzem PDF ou exportações devem ter caminho síncrono quando o frontend espera blob e caminho assíncrono quando `?async=1` ou mecanismo equivalente for usado.

## Fronteiras de responsabilidade

| Situação | Local preferido |
|---|---|
| Validar regra de estado de uma entidade | Modelo ou serviço de domínio. |
| Validar formato de payload e aliases legados | Serializer. |
| Aplicar tenant da request | `TenantScopedQuerysetMixin`, middleware ou serviço central. |
| Construir resposta HTTP, PDF ou ficheiro | ViewSet/View fina chamando serviço/gerador. |
| Calcular preço, saldo, stock, tentativa académica ou remuneração | Serviço transaccional testado. |
| Integrar sistema externo | `integrations/` ou `infrastructure/` com contrato claro. |
| Publicar evento de domínio | `events/` ou outbox transaccional. |
| Expor métrica/saúde | `observability/`, `apps/monitoring` ou `platform/urls.py`. |

## Dependências técnicas críticas

- Django 4.2 e DRF para API e admin.
- `rest_framework_simplejwt` para JWT.
- `django_filters` para filtros declarativos.
- `drf_spectacular` para OpenAPI quando instalado.
- `django_prometheus` para métricas quando instalado.
- Celery e Redis para assíncrono quando activado.
- PostgreSQL para produção; SQLite apenas para desenvolvimento/testes locais.

## Regras de evolução

- Não duplicar regras de negócio entre viewset e serializer: uma regra deve ter um dono claro.
- Não aceitar `tenant` do payload para utilizadores normais: usar tenant resolvido da request.
- Não criar endpoint fora de `api/v1/routing/routes.py` sem justificar porque não é CRUD/DRF padrão.
- Não adicionar dependência externa sem documentar configuração, falha esperada, fallback e teste mínimo.
- Não deixar jobs assíncronos sem idempotência, rastreio de estado ou teste de contrato.
