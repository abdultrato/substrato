# Maternidade / Gestação (`apps/maternity`)

Documenta o modelo de gestação e o endpoint REST correspondente.

## Domínio
- Acompanhamento básico de gestações (MVP), podendo ser expandido para pré-natal, exames e partos.
- Prefixo de IDs: `MAT`.

## Modelo `Pregnancy`
- `patient` *(FK obrigatória)*: paciente gestante.
- `responsible_doctor` *(FK opcional)*: médico/ginecologista.
- `last_menstrual_period_date` *(date)*: DUM.
- `expected_delivery_date` *(date)*: DPP estimada.
- `nursery` *(str)* e `maternity_bed` *(str)*: localização interna (quando aplicável).
- Histórico obstétrico: `total_deliveries`, `normal_deliveries`, `cesareans`.
- `status` *(choice)*: `ACOMP`, `PARTO`, `ENCERR`, `CANCEL`.
- `notes` *(text)*.
- `created_at` *(datetime)*: timestamp manual (usa `timezone.now`).
- Herdado de `NoNameCoreModel`: `tenant`, `custom_id`, auditoria, soft delete.
- Índices: (`tenant`, `patient`, `created_at`) e (`tenant`, `status`, `created_at`). Ordenação padrão: `-created_at`, `-id`.
- Validações: coerência de tenant para paciente/médico; partos normais/cesáreos não podem exceder totais.

## API
Base: `/api/v1/maternity/`

### Endpoint
- `/gestacao/` — CRUD padrão DRF.

### Serialização
- `PregnancySerializer` expõe `patient_name` (read-only) e `doctor_name` derivado.
- Campos somente leitura: audit, soft delete, `custom_id`, `patient_name`, `doctor_name`.

### Filtros (`PregnancyFilter`)
- `patient`, `responsible_doctor`, `status`, `expected_delivery_date`, `created_at`.

### Busca (`search_fields`)
- `custom_id`, `patient__name`, `responsible_doctor__name`.

### Ordenação (`ordering_fields`)
- `created_at`, `status`, `expected_delivery_date`. Padrão: `-created_at`, `-id`.

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Gestações em acompanhamento: `GET /api/v1/maternity/gestacao/?status=ACOMP`
- DPP até 2026-06-30: `GET /api/v1/maternity/gestacao/?expected_delivery_date__lte=2026-06-30`
- Buscar paciente por nome: `GET /api/v1/maternity/gestacao/?search=Maria`
