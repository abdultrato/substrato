# Manutenções de Equipamentos (`apps/maintenance`)

Documenta o modelo de manutenção e endpoints REST no grupo de equipamentos.

## Domínio
- Planejamento e execução de manutenções (preventivas/corretivas) de equipamentos.
- `tenant` propagado do equipamento (TenantPropagationMixin).
- Prefixo de IDs: `MNT`.

## Modelo `Maintenance`
- `equipment` *(FK)*: equipamento alvo.
- `type` *(choice)*: `DIARIA`, `SEMANAL`, `MENSAL`, `SEMESTRAL`, `ANUAL`.
- `scheduled_date` *(date)*: data prevista.
- `performed_date` *(date, opcional)*: data realizada.
- `description` *(text)*: detalhes da manutenção.
- `technician` *(str)*: responsável.
- Propriedade `performed`: True se `performed_date` preenchida.
- Herdado de `NoNameCoreModel`: `tenant`, `custom_id`, auditoria, soft delete.
- Índices: (`tenant`, `equipment`, `scheduled_date`), (`tenant`, `type`, `scheduled_date`), (`tenant`, `performed_date`). Ordenação padrão: `-scheduled_date`, `-created_at`.

## API
Grupo equipamentos, recurso `/maintenance/` (alias `/manutencao/`):
- Base: `/api/v1/equipment/`
- Operações padrão DRF: `GET`, `POST`, `GET {id}`, `PUT/PATCH {id}`, `DELETE {id}` (soft delete).

### Filtros (`MaintenanceFilter`)
- `tenant`, `custom_id`, `equipment`, `type`, `scheduled_date`, `performed_date`, `deleted`, `created_at`, `updated_at`.

### Busca (`search_fields`)
- `custom_id`, `equipment__name`, `equipment__serial_number`, `description`, `technician`.

### Ordenação (`ordering_fields`)
- `scheduled_date`, `performed_date`, `type`, `created_at`, `updated_at`. Padrão: `-scheduled_date`, `-created_at`.

### Serialização
- Serializer: `MaintenanceSerializer` (ver grupo equipment). Campo derivado `status` mostra “Executada” ou “Programada”.

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Manutenções previstas para abril/2026:  
  `GET /api/v1/equipment/maintenance/?scheduled_date__gte=2026-04-01&scheduled_date__lte=2026-04-30`
- Manutenções pendentes (sem `performed_date`):  
  `GET /api/v1/equipment/maintenance/?performed_date__isnull=true`
- Buscar por técnico:  
  `GET /api/v1/equipment/maintenance/?search=Silva`

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Manutenções de Equipamentos (`apps/maintenance`)' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
