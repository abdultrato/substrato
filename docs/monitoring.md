# Monitoramento de Erros (`apps/monitoring`)

Documenta o modelo de erros de sistema e o endpoint REST em `api/v1/monitoring`.

## Domínio
- `SystemError`: registros de exceções não tratadas (HTTP) capturadas pela aplicação.
- Prefixo de IDs: `ERR`.

## Modelo `SystemError`
- `user` *(FK opcional)*: usuário autenticado que gerou o erro.
- Request: `method`, `path` (curto), `full_path`, `status_code`, `duration_ms`, `ip`, `user_agent`.
- View info: `view_basename`, `view_action`, `object_id`.
- Exceção: `exception_class`, `message`, `traceback`, `metadata` (JSON).
- Herdado de `NoNameCoreModel`: `tenant`, `custom_id`, audit, soft delete.
- Índices: (`tenant`, `created_at`), (`tenant`, `status_code`, `created_at`), (`tenant`, `exception_class`, `created_at`). Ordenação padrão: `-created_at`, `-id`.

## API
Base: `/api/v1/monitoring/`

### Endpoint
- `/error/` — somente leitura (`ReadOnlyModelViewSet`), usado para listar/detalhar erros.

### Serialização
- `SystemErrorSerializer`: inclui `user_name` derivado; `ip` é somente leitura.
- Campos somente leitura: audit/soft delete + `user_name`.

### Filtros (`SystemErrorFilter`)
- `user`, `status_code`, `exception_class`, `path`, `view_basename`, `view_action`, `created_at`.

### Busca (`search_fields`)
- `path`, `exception_class`, `message`, `user__username`.

### Ordenação (`ordering_fields`)
- `created_at`, `status_code`, `exception_class`. Padrão: `-created_at`, `-id`.

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Erros 500 das últimas 24h:  
  `GET /api/v1/monitoring/error/?status_code=500&created_at__gte=2026-03-30`
- Buscar por classe de exceção:  
  `GET /api/v1/monitoring/error/?exception_class=IntegrityError`
- Filtrar por path específico:  
  `GET /api/v1/monitoring/error/?path=/api/v1/consultations/`
