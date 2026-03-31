# Cirurgias (`apps/surgery`)

Documenta cirurgias e catálogo de procedimentos cirúrgicos.

## Domínio
- `Surgery`: agendamento/execução de cirurgias, com paciente, cirurgião, procedimentos associados e custos estimados.
- `SurgicalProcedure`: catálogo de procedimentos cirúrgicos (nome, descrição, preço base, IVA).
- Prefixos: `CIR` (surgery), `PCIR` (procedimento do catálogo).

## Modelos
- `Surgery`
  - FKs: `patient`, `surgeon` (opcional), M2M `procedures`.
  - Campos livres: `procedure` (texto) e `description`.
  - Status: `AGENDADA`, `EM_ANDAMENTO`, `CONCLUIDA`, `CANCELADA`.
  - Datas: `scheduled_for`, `started_at`, `ended_at`.
  - Financeiro: `estimated_price`, `vat_percentage`, `applies_vat_by_default`.
  - Validações: tenant coerente entre patient/surgeon; datas coerentes.
  - Ordenação padrão: `-scheduled_for`, `-created_at`.
- `SurgicalProcedure`
  - Campos: `name`, `description`, `base_price`, `vat_percentage`, `applies_vat_by_default`, `active`.
  - Ordenação padrão: `name`.

## API
Base: `/api/v1/surgery/`

### Endpoints
- `/surgery/` — CRUD de cirurgias.
- `/procedimentocirurgico/` — CRUD do catálogo de procedimentos.

### Filtros (SafeFilterSet)
- Surgery: `patient`, `surgeon`, `procedures`, `status`, `scheduled_for`, `started_at`, `ended_at`, `created_at`.
- SurgicalProcedure: `name`, `active`, `created_at`.

### Busca / Ordenação
- Surgery: busca por `procedure`, `patient__name`, `surgeon__username`, `procedures__name`; ordenação padrão `-scheduled_for`, `-created_at`.
- SurgicalProcedure: busca por `name`, `description`, `custom_id`; ordenação padrão `name`.

### Serialização
- Serializers expõem todos os campos; cirurgias incluem procedimentos (M2M) e vínculo de fatura via action customizada.

### Segurança
- `IsAuthenticated` + `TenantScopedQuerysetMixin`; RBAC aplicado no roteamento dinâmico.

## Exemplos rápidos
- Cirurgias agendadas para hoje: `GET /api/v1/surgery/surgery/?scheduled_for__date=2026-03-31&status=AGENDADA`
- Procedimentos ativos do catálogo: `GET /api/v1/surgery/procedimentocirurgico/?active=true`
