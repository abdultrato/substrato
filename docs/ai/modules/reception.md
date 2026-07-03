# IA Module Dossier - Reception

## Scope

This dossier teaches the Substrato AI how the Reception module works in real code, endpoint by endpoint, and how it connects to Clinical Laboratory, Billing, Payments, Insurance and adjacent operational modules.

Primary code anchors:

- `api/v1/reception/viewsets_impl/core.py`
- `api/v1/reception/serializers.py`
- `api/v1/reception/filters.py`
- `application/reception/care_flow.py`
- `application/reception/commands.py`
- `application/reception/handlers.py`
- `application/reception/get_workspace.py`
- `apps/reception/models/reception_checkin.py`
- `apps/reception/tests.py`

## Functional purpose

Reception is the operational intake layer for patient arrival and front-desk care flow. In this project it does not just register queue presence. It can:

- open a check-in for a patient;
- move the check-in through queue and attendance states;
- create or link a laboratory request;
- create or link an invoice;
- register payment against the invoice;
- expose a consolidated care summary for one check-in;
- expose a workspace summary for the current reception day.

The AI should treat Reception as a workflow hub, not as an isolated CRUD module.

## Canonical API resources

The canonical English resource routes are:

- `/api/v1/reception/workspace/`
- `/api/v1/reception/checkin/`
- `/api/v1/reception/care/`

Legacy Portuguese route names like `atendimento` and action names like `iniciar_atendimento` are intentionally not the public contract anymore. Tests assert that old routes return `404`.

## Core model: ReceptionCheckin

Model: `apps/reception/models/reception_checkin.py`

Important fields:

- `patient`: FK to `clinical.Patient`
- `request`: one-to-one to `clinical.LabRequest`
- `invoice`: one-to-one to `faturamento.Invoice`
- `attendant`: FK to `identidade.User`
- `priority`: `URG`, `PREF`, `NOR`
- `status`: `AGUARD`, `ATEND`, `REQ`, `FAT`, `CONC`, `CANC`
- `reason`
- `notes`
- `arrived_at`
- `called_at`
- `completed_at`

Priority labels:

- `URG`: Urgente
- `PREF`: Preferencial
- `NOR`: Normal

Status labels and meaning:

- `AGUARD`: patient is waiting in queue
- `ATEND`: check-in is in active attendance
- `REQ`: a laboratory request has been created or linked
- `FAT`: an invoice has been created or linked
- `CONC`: reception flow completed
- `CANC`: check-in cancelled

State transition rules implemented in model methods:

- `start_care(attendant=None)`:
  - blocks if status is already completed or cancelled;
  - sets `attendant`;
  - sets status to `ATEND`;
  - fills `called_at` once.
- `register_request(request)`:
  - idempotent if already linked;
  - sets `request`;
  - sets status to `REQ`.
- `register_invoice(invoice)`:
  - idempotent if already linked;
  - sets `invoice`;
  - sets status to `FAT`.
- `complete()`:
  - blocks if cancelled;
  - sets status to `CONC`;
  - sets `completed_at`.
- `cancel()`:
  - blocks if completed;
  - sets status to `CANC`;
  - sets `completed_at`.

AI reading rule:

- a check-in can have both `request` and `invoice`, but the `status` keeps the last milestone reached, not a multi-flag matrix.

## Reception serializer contract

Serializer: `ReceptionCheckinSerializer`

Useful computed read-only fields:

- `patient_name`
- `patient_code`
- `request_code`
- `invoice_code`
- `invoice_status`
- `invoice_status_display`
- `invoice_total`
- `invoice_patient_amount`
- `status_display`
- `priority_display`
- `attendant_name`

Important alias normalization supported by `CHECKIN_LEGACY_ALIASES`:

- `paciente`, `utente` -> `patient`
- `requisicao`, `requisição`, `pedido` -> `request`
- `fatura`, `factura` -> `invoice`
- `recepcionista`, `atendente` -> `attendant`
- `prioridade` -> `priority`
- `estado` -> `status`
- `motivo`, `razao`, `razão` -> `reason`
- `observacao`, `observação`, `notas` -> `notes`
- `chegada` -> `arrived_at`
- `inicio_atendimento`, `início_atendimento` -> `called_at`
- `concluido_em`, `concluído_em` -> `completed_at`

AI interpretation rule:

- user language can be Portuguese, English or mixed; aliases are intentional and should be reused when interpreting free-text requests about Reception.

## Endpoint catalog

### `GET /api/v1/reception/workspace/`

ViewSet: `ReceptionWorkspaceViewSet.list`

Purpose:

- returns a cached same-day workspace summary for reception operations.

Returned summary includes:

- `checkins_today`
- `queue_size`
- `in_care`
- `new_patients`
- `pending_requests`
- `open_invoices`
- `receipts_generated_today`
- `received_today`

Also returns:

- `queue`: English-oriented list
- `fila`: Portuguese-oriented list

Implementation notes:

- source code in `application/reception/get_workspace.py`
- uses 60-second cache per tenant and date
- counts Reception check-ins, not all downstream clinical events
- joins queue items with patient, request, invoice and attendant

AI should answer questions like:

- "quantos check-ins tivemos hoje?"
- "quantos estão na fila?"
- "quanto recebemos hoje na recepção?"
- "há requisições pendentes vindas da recepção?"

### `GET /api/v1/reception/checkin/`

ViewSet: `ReceptionCheckinViewSet.list`

Filter fields from `ReceptionCheckinFilter`:

- `tenant`
- `patient`
- `request`
- `invoice`
- `attendant`
- `priority`
- `status`
- `arrived_at`
- `called_at`
- `completed_at`
- `created_at`

Search fields:

- `custom_id`
- `patient__custom_id`
- `patient__name`
- `patient__document_number`
- `request__custom_id`
- `invoice__custom_id`
- `attendant__first_name`
- `attendant__last_name`
- `attendant__username`
- `reason`
- `notes`

Ordering fields:

- `custom_id`
- `priority`
- `status`
- `arrived_at`
- `called_at`
- `completed_at`
- `created_at`

Default ordering:

- `-arrived_at`

AI should infer that list queries often mean queue analysis, patient lookup, or tracing linked request/invoice state.

### `POST /api/v1/reception/checkin/`

Creates a check-in using `ReceptionCheckinSerializer`.

Server-side write behavior:

- tenant comes from request tenant;
- `created_by` and `updated_by` come from authenticated user.

AI should ask for at least:

- patient or patient id;
- optional priority;
- reason;
- notes.

### `POST /api/v1/reception/checkin/{id}/start-care/`

Starts care and optionally assigns the current user as attendant.

AI rule:

- this is not a generic update; it is a workflow action.

### `POST /api/v1/reception/checkin/{id}/complete/`

Completes the check-in.

AI rule:

- completion is blocked for cancelled check-ins.

### `POST /api/v1/reception/checkin/{id}/cancel/`

Cancels the check-in.

AI rule:

- cancellation is blocked for completed check-ins.

### `GET /api/v1/reception/checkin/{id}/care/`

Returns the full care summary built by `get_care_summary(checkin)`.

This is one of the most important endpoints for AI understanding because it consolidates:

- check-in data;
- patient data;
- linked request data;
- linked invoice data;
- invoice items and billed sectors;
- payments;
- receipts;
- invoice creator display and department context.

The AI should use this endpoint logic mentally when a user asks:

- "what has already been done for this patient at reception?"
- "does this check-in already have request, invoice or payment?"
- "who created the invoice and from which department?"

### `POST /api/v1/reception/checkin/{id}/create-request/`

Payload serializer: `CreateReceptionRequestSerializer`

Accepted fields:

- `exams_ids`: required non-empty list of exam ids
- `clinical_status`: optional choice from `ClinicalStatus`

Implementation:

- creates `clinical.LabRequest`
- creates `LabRequestItem` in bulk
- ensures all exam ids belong to the same tenant
- creates `Result` if missing
- links request to check-in via `register_request`

Cross-module links:

- Clinical Laboratory: `LabExam`, `LabRequest`, `LabRequestItem`, `Result`

AI should know:

- this action is the bridge from Reception to laboratory requisitions
- exam selection is tenant-scoped and validated
- duplicate request creation is idempotently blocked in handlers if already linked

### `POST /api/v1/reception/checkin/{id}/create-invoice/`

Payload serializer: `CreateReceptionInvoiceSerializer`

Accepted fields:

- `issue` default `true`
- alias `emitir` -> `issue`

Implementation:

- creates `billing.Invoice`
- sets invoice origin:
  - `CLINICAL` if check-in already has request
  - `MIXED` otherwise
- calls billing sync from origin
- issues the invoice only if `issue=true` and invoice has billable items
- links invoice to check-in via `register_invoice`

Cross-module links:

- Billing: `Invoice`
- Billing service layer: `IssueInvoiceCommand`, `SyncInvoiceFromOriginCommand`

AI should understand:

- invoice issuance can still result in a draft if there are no items
- an invoice without request is valid and uses `MIXED` origin

### `POST /api/v1/reception/checkin/{id}/register-payment/`

Payload serializer: `RegisterReceptionPaymentSerializer`

Accepted fields:

- `value`
- `method`
- `external_reference`
- `insurer_id`
- `coverage_plan_id`
- `authorization_number`
- `insurance_date`
- `confirm`

Alias:

- `confirmar` -> `confirm`

Insurance-specific validation:

- if payment method is `HEALTH_INSURANCE`, `insurer_id` is required
- `authorization_number` is required
- `coverage_plan_id`, if sent, must belong to the selected insurer

Implementation:

- requires linked invoice
- blocks if invoice is still draft
- defaults payment value to invoice total
- creates `payments.Payment`
- confirms payment if `confirm=true`
- fetches latest `Receipt` for the payment

Cross-module links:

- Payments: `Payment`, `Receipt`
- Insurance: `Insurer`, `CoveragePlan`
- Billing: invoice status gate before payment

AI should answer:

- "why did payment fail?"
- "what is missing for insurance payment?"
- "can I pay before issuing the invoice?" -> no

### `POST /api/v1/reception/checkin/{id}/link-request/`

Payload:

- `request_id`

Behavior:

- links an existing `LabRequest` in the same tenant
- blocks if another request is already linked

### `POST /api/v1/reception/checkin/{id}/link-invoice/`

Payload:

- `invoice_id`

Behavior:

- links an existing `Invoice` in the same tenant
- blocks if another invoice is already linked

### `POST /api/v1/reception/care/`

ViewSet: `ReceptionCareViewSet.create`

Serializer: `CareFlowCreateSerializer`

Supported payload blocks:

- `patient_id`
- `patient`
- `checkin`
- `request`
- `billing`
- `payment`
- `complete_checkin`

Aliases:

- `faturamento` -> `billing`
- `concluir_checkin` -> `complete_checkin`

Validation rules:

- must provide either `patient_id` or `patient`
- if `payment` is provided, `request` must also be provided in the same flow

This endpoint is the one-shot workflow endpoint for:

- creating or updating patient
- opening check-in
- creating request
- creating invoice
- registering payment
- optionally completing the check-in

AI should treat it as "full front-desk flow" rather than normal CRUD.

### `GET /api/v1/reception/care/{id}/`

Returns the same care summary as the detail check-in care action, but as a dedicated care resource route.

## Full care summary structure

`get_care_summary` returns a nested operational narrative.

Important blocks:

- `checkin`
- `patient`
- `request`
- `invoice`
- `payments`
- `receipts`

High-value invoice details for AI:

- `created_by_name`
- `created_by_department`
- `billed_item_sectors`

AI reasoning value:

- if a user asks why invoice value exists, the AI should correlate it with request-derived billable items and billed sectors
- if a user asks whether the patient has already paid, the AI should check confirmed payments and receipts

## Cross-module graph

Reception connects directly to:

- Clinical:
  - `Patient`
  - `LabRequest`
  - `LabRequestItem`
  - `LabExam`
  - `Result`
- Billing:
  - `Invoice`
  - invoice item generation and issue/sync workflow
- Payments:
  - `Payment`
  - `Receipt`
- Insurance:
  - `Insurer`
  - `CoveragePlan`
- Identity:
  - attendant user
  - invoice creator department via professional profile

Indirect operational links:

- Nursing and Medicine may later consume the same patient and request context
- Pharmacy is not created directly by Reception in this code path, but Reception can generate the patient and financial context that later affects medication and requisition flows
- Requests module questions may refer to the laboratory request created from Reception

## Query patterns the AI should handle well

Examples the AI should understand from this dossier:

- "abrir check-in do paciente X"
- "iniciar atendimento do check-in CHK-..."
- "ligar esta requisição ao check-in"
- "emitir fatura do check-in"
- "registar pagamento por seguro"
- "por que o pagamento por seguradora falhou?"
- "este check-in já tem requisição?"
- "este paciente já foi chamado?"
- "quantos estão na fila hoje?"
- "quanto a recepção recebeu hoje?"
- "quem criou a fatura e de que departamento?"
- "que setores foram faturados nesta passagem?"

## AI limitations to state explicitly

- Reception analytics from workspace are same-day cached snapshots, not historical BI.
- Queue counts are based on `ReceptionCheckin`, not all downstream clinical events.
- Payment success still depends on invoice state and insurance metadata.
- A linked request or invoice is tenant-scoped and can fail if the target belongs to another tenant.
