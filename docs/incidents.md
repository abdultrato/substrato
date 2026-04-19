# Incidentes / Ocorrências (`apps/incidents`)

Documenta o modelo de ocorrências e seu endpoint REST exposto no grupo de equipamentos.

## Domínio
- Registra avarias/incidentes associados a um equipamento.
- Usa `TenantPropagationMixin` para herdar `tenant` do equipamento relacionado.
- Prefixo de IDs amigáveis: `OCR`.

## Modelo `Incident`
- `equipment` *(FK obrigatória)*: equipamento afetado.
- `date` *(datetime)*: quando ocorreu/foi registrada a ocorrência.
- `type` *(choice)*: `AVARIA`, `INCIDENTE`, `OUTRO`.
- `description` *(text)*: detalhe do incidente.
- `support_contact` *(str)*: contato de assistência/técnico.
- `resolved` *(bool, default False)*: status de resolução.
- Herdado de `NoNameCoreModel`: `tenant`, `custom_id`, audit fields, soft delete.
- Índices: (`tenant`, `equipment`, `date`), (`tenant`, `type`, `date`), (`tenant`, `resolved`). Ordenação padrão: `-date`, `-created_at`.

## API
O endpoint fica no grupo de equipamentos:
- Base: `/api/v1/equipment/`
- Recurso: `/incident/` (alias `/ocorrencia/`)
- Operações padrão DRF: `GET`, `POST`, `GET {id}`, `PUT/PATCH {id}`, `DELETE {id}` (soft delete pelo modelo base).

### Filtros (`IncidentFilter`)
- `tenant`, `custom_id`, `equipment`, `date`, `type`, `resolved`, `deleted`, `created_at`, `updated_at`.

### Busca (`search_fields`)
- `custom_id`, `equipment__name`, `equipment__serial_number`, `description`, `support_contact`.

### Ordenação (`ordering_fields`)
- `date`, `type`, `resolved`, `created_at`, `updated_at`. Ordem padrão: `-date`, `-created_at`.

### Serialização
- Serializer: `IncidentSerializer`.
- Campo derivado `status`: “Resolvida” ou “Pendente”.
- Campos somente leitura (herdados): `id`, `custom_id`, `tenant`, auditoria, soft delete, `version`, e `status`.

### Segurança
- Permissões: `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC global aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Ocorrências pendentes por equipamento:  
  `GET /api/v1/equipment/incident/?equipment=ID&resolved=false`
- Buscar por série do equipamento:  
  `GET /api/v1/equipment/incident/?search=SN1234`
- Ordenar por data ascendente:  
  `GET /api/v1/equipment/incident/?ordering=date`
