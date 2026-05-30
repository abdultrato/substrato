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

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Incidentes / Ocorrências (`apps/incidents`)' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
