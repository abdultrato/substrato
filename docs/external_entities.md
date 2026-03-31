# Entidades externas (`apps/external_entities`)

Documenta o modelo de empresas externas/internas e os endpoints REST expostos em `api/v1/external_entities`.

## Domínio
- Representa empregadores/parceiros usados em medicina ocupacional, terceiros e outras integrações.
- Cada registro herda `CoreModel` (campos de auditoria, versionamento e tenant).
- Prefixo de IDs amigáveis: `EMP` (gera `custom_id` como `EMP-0001`, etc.).

## Modelo `Company`
- `name` *(str, obrigatório)*: razão social.
- `nuit` *(str)*: Número Único de Identificação Tributária.
- `headquarters_address` *(str)*: sede/local principal.
- `contacts` *(str)*: pessoa ou referência de contacto.
- `email` *(email)*.
- `phone1` / `phone2` *(str)*: telefones principal e alternativo.
- `nib` *(str)*: conta bancária/NIB para faturação.
- `active` *(bool, default True)*: flag para ativar/desativar sem apagar.
- `notes` *(text)*: observações internas.
- Campos herdados de `CoreModel`: `tenant`, `custom_id`, `created_by/at`, `updated_by/at`, `deleted`, `deleted_at`, `deleted_by`, `version`.
- Índices: `tenant`, `name`, `nuit`, `active`. Ordenação padrão: `name`.

## API
Base: `/api/v1/external_entities/`

### Endpoints
- `GET /empresa/` — lista com filtros, busca e ordenação.
- `POST /empresa/` — cria empresa.
- `GET /empresa/{id}/` — detalhe.
- `PUT /empresa/{id}/` — atualiza total.
- `PATCH /empresa/{id}/` — atualização parcial.
- `DELETE /empresa/{id}/` — exclusão (soft delete, conforme `CoreModel`).

### Serialização e validação
- Serializer: `EmpresaSerializer`.
- Campos somente leitura: `id`, `custom_id`, `tenant`, audit fields, `deleted`, `version`.
- `name` é obrigatório na criação.

### Filtros e busca
- FilterSet: `EmpresaFilter`.
- Filtros permitidos: `tenant`, `custom_id`, `name`, `nuit`, `headquarters_address`, `contacts`, `email`, `phone1`, `phone2`, `nib`, `active`, `deleted`, `created_at`, `updated_at`.
- Busca (`search`): `custom_id`, `name`, `nuit`, `email`, `phone1`, `phone2`.
- Ordenação (`ordering`): `name`, `nuit`, `active`, `created_at`, `updated_at`. Ordem padrão: `name`.

### Segurança
- Permissão: `IsAuthenticated` + RBAC global aplicado no roteamento (`api.v1.routing.routes.register_routes`).
- Escopo multi-tenant via `TenantScopedQuerysetMixin`.

### Admin
- Listagem com colunas `custom_id`, `name`, `nuit`, `phone1`, `email`, `active`, `created_at`.
- Filtro rápido por `active` e busca por `custom_id`, `name`, `nuit`, `phone1`, `email`.

## Exemplos rápidos
- Buscar por NUIT parcial e ativos:  
  `GET /api/v1/external_entities/empresa/?search=12345&active=true`
- Ordenar por data de criação desc:  
  `GET /api/v1/external_entities/empresa/?ordering=-created_at`
