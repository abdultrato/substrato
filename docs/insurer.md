# Seguradoras e Planos (`apps/insurer`)

Documenta seguradoras, planos de cobertura, autorizações de procedimento e endpoints REST em `api/v1/insurer`.

## Domínio
- Cadastro de seguradoras (`Insurer`) e planos de cobertura (`CoveragePlan`).
- Autorizações de procedimentos (`ProcedureAuthorization`) associadas a um plano.
- Overrides de plano por tenant (`TenantCoveragePlan`) para customizar percentuais locais.
- Prefixos: `SEG` (seguradora), `PLC` (plano), `AUT` (autorização), `TPL` (override por tenant).

## Modelos
- `Insurer`: `name`, `external_code`, `email`, `phone`, `active`.
- `CoveragePlan`: FK `insurer`, `coverage_percentage` (0-100), `requires_authorization`, `active`.
- `ProcedureAuthorization`: `request_id`, FK `plan`, `status` (`PENDENTE`, `APROVADA`, `NEGADA`), `authorization_code`, `response_date`, `name` (compat), `active`.
- `TenantCoveragePlan`: FK `global_plan`, `override_percentage` (opcional), `active`. Constraint única (`tenant`, `global_plan`).
- Todos herdam `CoreModel` + mixins de descrição/ordem onde aplicável.

## API
Base: `/api/v1/insurer/`

### Endpoints
- `/insurer/` — seguradoras.
- `/planocobertura/` — planos.
- `/autorizacaoprocedimento/` — autorizações.

Operações DRF padrão: listar, criar, detalhar, atualizar, deletar (soft delete do CoreModel).

### Serializers
- `InsurerSerializer`, `CoveragePlanSerializer`, `ProcedureAuthorizationSerializer` (`fields="__all__"`).

### Filtros (SafeFilterSet)
- `Insurer`: `tenant`, `custom_id`, `description`, `name`, `order`, `active`, `deleted`, `created_at`, `updated_at`, `external_code`, `email`, `phone`.
- `CoveragePlan`: mesmos campos base + `insurer`, `coverage_percentage`, `requires_authorization`.
- `ProcedureAuthorization`: campos base + `request_id`, `plan`, `status`, `authorization_code`, `response_date`.

### Busca (`search_fields`)
- Insurer: `custom_id`, `name`, `email`, `phone`, `description`, `external_code`.
- CoveragePlan: `custom_id`, `name`, `description`.
- ProcedureAuthorization: `custom_id`, `name`, `description`, `status`, `authorization_code`.

### Ordenação (`ordering_fields`)
- Todos expõem campos de auditoria + específicos (ver viewsets). Ordenação padrão: `-created_at`.

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Seguradoras ativas: `GET /api/v1/insurer/insurer/?active=true`
- Planos que exigem autorização: `GET /api/v1/insurer/planocobertura/?requires_authorization=true`
- Autorizações pendentes de um plano: `GET /api/v1/insurer/autorizacaoprocedimento/?plan=ID&status=PENDENTE`
