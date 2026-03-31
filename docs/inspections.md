# Inspeções Diárias (`apps/inspections`)

Documenta o modelo de inspeções diárias de equipamentos e seu endpoint REST no grupo de equipamentos.

## Domínio
- Registro diário do estado operacional e higienização de um equipamento.
- `tenant` propagado automaticamente do equipamento (TenantPropagationMixin).
- Prefixo de IDs amigáveis: `INSP`.

## Modelo `DailyInspection`
- `equipment` *(FK)*: equipamento inspecionado.
- `date` *(date)*: dia da inspeção (único por equipamento/tenant).
- `operation_status` *(choice)*: `FUNCIONANDO`, `AVARIADO`, `DESLIGADO`.
- `cleaning_performed` *(bool)*: higienização feita?
- `assessment` *(text)*: avaliação/achados.
- `notes` *(text)*: observações gerais.
- Herdado de `NoNameCoreModel`: `tenant`, `custom_id`, audit, soft delete.
- Constraint: único por (`tenant`, `equipment`, `date`).
- Índices: (`tenant`, `equipment`, `date`) e (`tenant`, `operation_status`, `date`). Ordenação padrão: `-date`, `-created_at`.

## API
Grupo equipamentos, recurso `/daily_inspection/` (alias `/inspecaodiaria/`):
- Base: `/api/v1/equipment/`
- Operações padrão DRF: `GET`, `POST`, `GET {id}`, `PUT/PATCH {id}`, `DELETE {id}` (soft delete).

### Filtros (`DailyInspectionFilter`)
- `tenant`, `custom_id`, `equipment`, `date`, `operation_status`, `cleaning_performed`, `deleted`, `created_at`, `updated_at`.

### Busca (`search_fields`)
- `custom_id`, `equipment__name`, `equipment__serial_number`, `assessment`, `notes`.

### Ordenação (`ordering_fields`)
- `date`, `operation_status`, `cleaning_performed`, `created_at`, `updated_at`. Padrão: `-date`, `-created_at`.

### Serialização
- Serializer: `DailyInspectionSerializer`.
- Campos somente leitura herdados + `description` (texto “<equipamento> - <data>”) e `status` (label de `operation_status`).

### Segurança
- Permissões: `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Inspeções de ontem por status:  
  `GET /api/v1/equipment/daily_inspection/?date=2026-03-30&operation_status=AVARIADO`
- Buscar inspeções de um equipamento pelo número de série:  
  `GET /api/v1/equipment/daily_inspection/?search=SN12345`
- Verificar se limpeza foi feita:  
  `GET /api/v1/equipment/daily_inspection/?cleaning_performed=true`
