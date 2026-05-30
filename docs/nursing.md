# Enfermagem (`apps/nursing`)

Documenta os principais modelos e endpoints de enfermagem: registros, prescrições, evoluções, procedimentos, materiais e sinais vitais.

## Domínio
- Registros e evoluções de enfermagem vinculados a pacientes.
- Prescrições de cuidados de enfermagem.
- Procedimentos de enfermagem com itens de serviço e materiais consumidos, incluindo catálogo e valores padrão.
- Registro de sinais vitais associados a registros.
- Prefixos de IDs: `REG` (registro), `EVO` (evolução), `PRE` (prescrição), `PROC` (procedimento), além de prefixos para itens/materiais/valores.

## Modelos (resumo)
- `NursingRecord` (`REG`): `patient`, `priority` (Urg/Normal/Baixa), `observation`, `record_date`. Tenant propagado do paciente.
- `NursingEvolution` (`EVO`): `patient`, `observation`, `evolution_date`. Tenant propagado do paciente.
- `NursingPrescription` (`PRE`): `patient`, `description`, `prescription_date`, `active`. Tenant propagado do paciente.
- `Procedure` (`PROC`): `patient`, `professional`, `performed_date`, `notes`, subtotais (`services_subtotal`, `materials_subtotal`, `total`). Propaga tenant do paciente; método `recalculate_totals` soma itens e materiais.
- `ProcedureItem`: FK `procedure`, FK `catalog`, `description`, `quantity`, `performed`, `observation`.
- `ProcedureMaterial`: FK `procedure`, FK `procedure_item`, FK `product`, `quantity`, `lot`, `unit_cost`, `inventory_movement`, `observation`.
- `ProcedureItemValue`: preço unitário para um item de procedimento.
- `ProcedureMaterialValue`: custo unitário para um material consumido.
- `ProcedureCatalog`: catálogo de procedimentos (nome, descrição, `default_price`, `vat_percentage`, `applies_vat_by_default`).
- `ProcedureCatalogMaterial`: materiais padrão sugeridos por catálogo (produto, quantidade/custo default).
- `NursingVitalSign`: FK `record`, medições (`temperature_c`, `heart_rate`, `respiratory_rate`, `oxygen_saturation`, `blood_pressure`), `collected_at`.

## API
Grupo: `/api/v1/nursing/`
- Principais recursos (nomes dependem de aliases configurados nos viewsets): registros, prescrições, evoluções, procedimentos, itens, materiais, valores, sinais vitais, catálogos.
- Operações padrão DRF (GET/POST/PUT/PATCH/DELETE) com `IsAuthenticated` + `TenantScopedQuerysetMixin`.

### Busca/Ordenação (padrões mais usados)
- Registros: busca por `patient__name`; ordenação padrão `-record_date`.
- Evoluções: ordenação `-evolution_date`.
- Prescrições: ordenação `-prescription_date`.
- Procedimentos: ordenação `-performed_date`; busca por `patient__name` e `notes`.
- Itens/ Materiais: ordenação `-created_at`.
- Sinais vitais: ordenação `-collected_at`.

### Segurança
- Autenticação obrigatória; RBAC aplicado via roteamento dinâmico.
- Tenant sempre propagado do paciente (ou do procedimento/record vinculado).

## Exemplos rápidos
- Procedimentos de um paciente: `GET /api/v1/nursing/procedure/?patient=ID`
- Itens realizados de um procedimento: `GET /api/v1/nursing/procedureitem/?procedure=ID&performed=true`
- Materiais consumidos com produto específico: `GET /api/v1/nursing/procedurematerial/?product=ID`
- Sinais vitais mais recentes: `GET /api/v1/nursing/vitalsign/?ordering=-collected_at`

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Enfermagem (`apps/nursing`)' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
