# Prontuário Médico (`apps/medical_records`)

Documenta o Cardex (registros clínicos) e itens de prescrição, com endpoints REST em `api/v1/medical_records`.

## Domínio
- `MedicalRecordEntry`: registros clínicos (anamnese/evolução) vinculados a paciente e opcionalmente consultas.
- `PrescriptionItem`: itens estruturados de prescrição atrelados a um Cardex.
- Prefixos: `PRT` (Cardex), `PRTI` (item de prescrição).

## Modelos
- `MedicalRecordEntry`
  - FKs: `patient` (obrigatória), `doctor` (opcional), M2M `consultations`.
  - Datas: `care_start_at`, `care_end_at`.
  - `status`: `RASCUNHO`, `FINALIZADO`, `CANCELADO`.
  - Campos clínicos: `symptoms`, `diagnosis`, `prescription` (texto livre), `medical_report`.
  - Validações: coerência de tenant para paciente/médico; `care_end_at` não pode ser anterior ao início.
  - Propaga `tenant` do paciente no `save`.
  - Índices: (`tenant`, `patient`, `care_start_at`), (`tenant`, `doctor`, `care_start_at`), (`tenant`, `status`, `care_start_at`). Ordenação padrão: `-care_start_at`, `-created_at`.
- `PrescriptionItem`
  - FKs: `record` (Cardex), `medication` (produto Farmácia).
  - Campos: `dosage_value`, `dosage_unit`, `interval_hours`, `dose_count`, `notes`.
  - Validações: tenant de record/medication; medication deve ser do tipo Medicamento; `dose_count` > 0; intervalo obrigatório para múltiplas doses; dosagem > 0.
  - Propaga `tenant` do record.
  - Índices: (`tenant`, `record`), (`tenant`, `medication`). Ordenação padrão: `-created_at`.

## API
Base: `/api/v1/medical_records/`

### Endpoints
- `/record/` — Cardex.
- `/prescricaoitem/` — Itens de prescrição.

Operações DRF padrão: listar, criar, detalhar, atualizar, deletar (soft delete do modelo base).

### Serialização
- `MedicalRecordEntrySerializer`: inclui `patient_name`, `doctor_name`, `consultation_codes`, `prescription_items` (read-only).
- `PrescriptionItemSerializer`: inclui `medication_name` (read-only).
- Campos somente leitura: audit/soft delete + derivados citados.

### Filtros (SafeFilterSet)
- `MedicalRecordEntry`: `patient`, `doctor`, `consultations`, `status`, `care_start_at`, `care_end_at`, `created_at`.
- `PrescriptionItem`: `record`, `medication`, `dosage_unit`, `dose_count`, `created_at`.

### Busca (`search_fields`)
- Cardex: `custom_id`, `patient__name`, `doctor__name`, `diagnosis`, `symptoms`.
- Itens: `custom_id`, `medication__name`, `notes`.

### Ordenação (`ordering_fields`)
- Cardex: `care_start_at`, `care_end_at`, `created_at`, `status` (padrão `-care_start_at`, `-created_at`).
- Itens: `created_at`, `dosage_value`, `dose_count` (padrão `-created_at`).

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Cardex finalizados para um paciente:  
  `GET /api/v1/medical_records/record/?patient=ID&status=FINALIZADO`
- Registros entre datas de atendimento:  
  `GET /api/v1/medical_records/record/?care_start_at__gte=2026-03-01&care_end_at__lte=2026-03-31`
- Itens de prescrição de um Cardex:  
  `GET /api/v1/medical_records/prescricaoitem/?record=ID`

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o domínio ou capacidade descrita por 'Prontuário Médico (`apps/medical_records`)' dentro da plataforma Substrato.

**Valor que protege.** Protege clareza de âmbito, fronteiras de responsabilidade, integração com módulos vizinhos e critérios de entrega.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve descrever o fluxo mínimo demonstrável, dados principais, permissões, endpoints/UI e validação necessária.

**Para production-ready.** Exige owners, testes, auditoria, métricas, runbook de falhas e política de evolução do domínio.
