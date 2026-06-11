# Relatório de Cobertura Frontend vs Backend

> Gerado em: 2026-06-11
> Metodologia: varredura de `VIEWSET_MAP` em todos os módulos de `api/v1/` cruzada com endpoints declarados em `GeneratedResourceListPage` / `GeneratedResourceCreatePage` / `GeneratedResourceDetailPage` no frontend.

---

## Resumo executivo

| Métrica | Valor |
|---------|-------|
| Endpoints backend (VIEWSET_MAP) | 333 |
| Endpoints com página frontend | 277 |
| **Sem página frontend** | **56** |
| Páginas frontend sem backend | 18 |
| Cobertura | 83% |

---

## Endpoints SEM página frontend (56)

### AUDIT (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `audit/usuarios` | `/audit/usuarios/` |

> Utilizadores auditados — existe `/audit/users/[id]/` mas sem lista/criar via gerado.

---

### CLINICAL_LABORATORY (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `clinical_laboratory/order_item` | `/clinical_laboratory/order_item/` |

> Item de ordem laboratorial — sem CRUD próprio, gerido dentro da ordem.

---

### CONSULTATIONS (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `consultations/doctors` | `/consultations/doctors/` |

> Endpoint de suporte (lista de médicos), não requer CRUD independente.

---

### DASHBOARD (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `dashboard/analytics` | `/dashboard/analytics/` |

> Exposto via `/dashboard/stats/` mas sem página CRUD gerada.

---

### DENTAL (17) — maior lacuna

| Endpoint | Rota canónica |
|----------|--------------|
| `dental/approval` | `/dental/approval/` |
| `dental/audit_event` | `/dental/audit_event/` |
| `dental/billing_item` | `/dental/billing_item/` |
| `dental/clinical_evolution` | `/dental/clinical_evolution/` |
| `dental/consultation` | `/dental/consultation/` |
| `dental/diagnosis` | `/dental/diagnosis/` |
| `dental/document` | `/dental/document/` |
| `dental/followup` | `/dental/followup/` |
| `dental/imaging_order` | `/dental/imaging_order/` |
| `dental/material_consumption` | `/dental/material_consumption/` |
| `dental/odontogram_chart` | `/dental/odontogram_chart/` |
| `dental/patient_plan_summary` | `/dental/patient_plan_summary/` |
| `dental/payment` | `/dental/payment/` |
| `dental/prescription` | `/dental/prescription/` |
| `dental/procedure_execution` | `/dental/procedure_execution/` |
| `dental/quotation` | `/dental/quotation/` |
| `dental/treatment_phase` | `/dental/treatment_phase/` |

> O módulo dental tem frontend parcial — apenas `appointment`, `odontogram`, `patient_treatment_plan`, `procedure`, `prosthesis_lab_order`, `record`, `treatment_item`, `treatment_plan` têm páginas. Os 17 acima estão expostos no backend mas sem acesso via frontend.

---

### EDUCATION (5)

| Endpoint | Rota canónica |
|----------|--------------|
| `education/assessment` | `/education/assessment/` |
| `education/bibliography` | `/education/bibliography/` |
| `education/content` | `/education/content/` |
| `education/exam_attempt` | `/education/exam_attempt/` |
| `education/lesson` | `/education/lesson/` |

> Os restantes 16 recursos de educação têm frontend. Estes 5 são sub-recursos secundários.

---

### IDENTITY (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `identity/passwordresettoken` | `/identity/passwordresettoken/` |

> Endpoint interno — tokens de reset de password não necessitam de CRUD público.

---

### MONITORING (3)

| Endpoint | Rota canónica |
|----------|--------------|
| `monitoring/cloud_control` | `/monitoring/cloud_control/` |
| `monitoring/export_job` | `/monitoring/export_job/` |
| `monitoring/telemetry` | `/monitoring/telemetry/` |

> Endpoints operacionais/internos. `export_job` e `telemetry` são usados programaticamente, não via UI de CRUD.

---

### NURSING (1)

| Endpoint | Rota canónica |
|----------|--------------|
| `nursing/ward_dashboard` | `/nursing/ward_dashboard/` |

> Dashboard agregado de enfermaria — não é um recurso CRUD, é um endpoint de leitura agregada.

---

### PUBLIC_HEALTH (8) — módulo inteiro sem frontend

| Endpoint | Rota canónica |
|----------|--------------|
| `public_health/adverse_event` | `/public_health/adverse_event/` |
| `public_health/campaign` | `/public_health/campaign/` |
| `public_health/dashboard` | `/public_health/dashboard/` |
| `public_health/immunization` | `/public_health/immunization/` |
| `public_health/lot` | `/public_health/lot/` |
| `public_health/notification` | `/public_health/notification/` |
| `public_health/target` | `/public_health/target/` |
| `public_health/vaccine` | `/public_health/vaccine/` |

> **Módulo completamente sem frontend.** O backend está totalmente implementado mas não há nenhuma página Next.js para este módulo.

---

### RECEPTION (2)

| Endpoint | Rota canónica |
|----------|--------------|
| `reception/care` | `/reception/care/` |
| `reception/workspace` | `/reception/workspace/` |

> Têm páginas dedicadas não-geradas (`/reception/page.tsx`). `workspace` é um endpoint de dados agregados, não CRUD.

---

### WAREHOUSE (15) — linhas de documentos

| Endpoint | Rota canónica |
|----------|--------------|
| `warehouse/cycle_count` | `/warehouse/cycle_count/` |
| `warehouse/cycle_count_line` | `/warehouse/cycle_count_line/` |
| `warehouse/goods_receipt_line` | `/warehouse/goods_receipt_line/` |
| `warehouse/item` | `/warehouse/item/` |
| `warehouse/item_category` | `/warehouse/item_category/` |
| `warehouse/lot` | `/warehouse/lot/` |
| `warehouse/pick_list_line` | `/warehouse/pick_list_line/` |
| `warehouse/purchase_order_line` | `/warehouse/purchase_order_line/` |
| `warehouse/replenishment_suggestion` | `/warehouse/replenishment_suggestion/` |
| `warehouse/sales_order_line` | `/warehouse/sales_order_line/` |
| `warehouse/shipment_line` | `/warehouse/shipment_line/` |
| `warehouse/stock_movement` | `/warehouse/stock_movement/` |
| `warehouse/stock_transfer_line` | `/warehouse/stock_transfer_line/` |
| `warehouse/storage_location` | `/warehouse/storage_location/` |
| `warehouse/warehouse` | `/warehouse/warehouse/` |

> O frontend de warehouse tem as páginas de cabeçalho (`purchase_order`, `sales_order`, `shipment`, etc.) mas não as linhas de detalhe nem os recursos de configuração base (`item`, `item_category`, `warehouse`, `storage_location`).

---

## Páginas frontend sem correspondência no backend (18)

Estas páginas apontam para endpoints que **não existem no router Django** e retornarão 404.

| Página frontend | Endpoint usado | Situação |
|----------------|---------------|----------|
| `/ai/assistant/investigations/` | `/ai/assistant/investigations/` | API via URLconf customizado (`api/v1/ai/urls.py`), não via router — funcional mas fora do VIEWSET_MAP |
| `/ai/assistant/sessions/` | `/ai/assistant/sessions/` | idem |
| `/ai/assistant/tasks/` | `/ai/assistant/tasks/` | idem |
| `/ai_assistant/ai-knowledge-entries/` | `/ai_assistant/ai-knowledge-entries/` | Não registado no backend — endpoint inexistente |
| `/ai_assistant/ai-messages/` | `/ai_assistant/ai-messages/` | Não registado no backend |
| `/ai_assistant/ai-policy-events/` | `/ai_assistant/ai-policy-events/` | Não registado no backend |
| `/ai_assistant/ai-suggested-actions/` | `/ai_assistant/ai-suggested-actions/` | Não registado no backend |
| `/ai_assistant/ai-tool-calls/` | `/ai_assistant/ai-tool-calls/` | Não registado no backend |
| `/clinical/clinical-events/` | `/clinical/clinical-events/` | Não existe no VIEWSET_MAP de `clinical` |
| `/clinical/clinical-histories/` | `/clinical/clinical-histories/` | Não existe no VIEWSET_MAP de `clinical` |
| `/clinical/clinical-references/` | `/clinical/clinical-references/` | Não existe no VIEWSET_MAP de `clinical` |
| `/accounting/account-balances/` | `/accounting/account-balances/` | Não existe no backend |
| `/accounting/ledger-lines/` | `/accounting/ledger-lines/` | Não existe no backend |
| `/monitoring/transactional-outbox-events/` | `/monitoring/transactional-outbox-events/` | Não existe no backend |
| `/payments/payment-histories/` | `/payments/payment-histories/` | Não existe no backend |
| `/pharmacy/parent-categories/` | `/pharmacy/parent-categories/` | Não existe no backend |
| `/pharmacy/product-categories/` | `/pharmacy/product-categories/` | Não existe no backend |
| `/tenants/tenant-subscriptions/` | `/tenants/tenant-subscriptions/` | Não existe no backend |

> **Nota:** Os três endpoints `/ai/assistant/*/` são funcionais — estão registados via URLconf customizado em `api/v1/ai/urls.py`, não via router. Os restantes 15 apontam para endpoints genuinamente inexistentes.

---

## Prioridades sugeridas

### Alta prioridade — funcionalidade bloqueada
1. **`public_health` (8 endpoints)** — módulo completamente implementado no backend sem qualquer frontend
2. **`dental` (17 endpoints)** — metade do módulo dental inacessível via frontend
3. **18 páginas com 404** — especialmente as 15 que apontam para endpoints inexistentes no backend

### Média prioridade — completude de módulos
4. **`warehouse` (15 sub-recursos)** — itens base de configuração e linhas de documentos sem CRUD
5. **`education` (5 endpoints)** — sub-recursos de aprendizagem em falta

### Baixa prioridade — internos/operacionais
6. `monitoring/cloud_control`, `monitoring/export_job`, `monitoring/telemetry` — operacionais
7. `identity/passwordresettoken` — interno
8. `nursing/ward_dashboard`, `dashboard/analytics` — agregados de leitura

precisa criar tais 17 subrecursos sem frontend em frontend, criar todos os endpoints de public health e expor eles ao frontend, criar crud completo para  warehouse em todas as paginas, e as 18 paginas do frontend que apontam para endpoints inexistentes em backend precisa corrigir o frontend