# IA Operacional - Mapa Canonico Fase 2

Gerado em UTC: 2026-05-30T20:29:49.483564+00:00

## Resumo

- Modulos mapeados: 37
- Recursos mapeados: 227
- Campos de modelo: 4770
- Relacoes: 1361
- Acoes DRF customizadas: 96
- Aliases de serializer: 10605
- Recursos sem ROLE_POLICY explicita: 91

## Modulos

| Modulo | Label | Recursos | Campos | Acoes | Ferramentas directas |
| --- | --- | ---: | ---: | ---: | --- |
| `accounting` | Contabilidade | 4 | 63 | 0 | get_financial_operational_summary |
| `audit` | Auditoria | 2 | 50 | 0 | - |
| `billing` | Faturamento | 3 | 67 | 6 | get_financial_operational_summary |
| `bloodbank` | Banco de Sangue | 6 | 149 | 5 | - |
| `clinical` | Clínico | 10 | 208 | 10 | get_clinical_operational_summary, get_lab_request_collection_guidance |
| `clinical_pharmacy` | Clinical Pharmacy | 6 | 168 | 0 | - |
| `consultations` | Consultas | 4 | 84 | 8 | - |
| `credit_financing` | Credit Financing | 5 | 140 | 0 | - |
| `dashboard` | Dashboard | 1 | 23 | 1 | - |
| `dental` | Dental | 8 | 172 | 2 | - |
| `education` | Educação | 21 | 425 | 5 | get_education_summary |
| `equipment` | Equipamentos | 3 | 62 | 1 | - |
| `equipment_integrations` | Integrações de equipamentos | 8 | 149 | 0 | - |
| `external_entities` | Entidades externas | 1 | 21 | 0 | - |
| `human_resources` | Recursos Humanos | 11 | 219 | 4 | - |
| `identity` | Identidade | 3 | 40 | 4 | get_user_context |
| `insurer` | Seguradora | 4 | 73 | 0 | - |
| `maintenance` | Manutenção | 1 | 19 | 1 | - |
| `maternity` | Maternidade | 1 | 22 | 0 | - |
| `medical_records` | Prontuário | 2 | 40 | 0 | - |
| `monitoring` | Monitoramento | 1 | 26 | 0 | get_command_center_alerts |
| `notifications` | Notificações | 3 | 21 | 0 | - |
| `nursing` | Enfermagem | 14 | 252 | 5 | get_nursing_pending_work |
| `payments` | Pagamentos | 4 | 40 | 6 | get_financial_operational_summary |
| `pharmacy` | Farmácia | 7 | 119 | 11 | get_pharmacy_stock_summary |
| `physiotherapy` | Physiotherapy | 7 | 173 | 0 | - |
| `public_health` | Public Health | 7 | 179 | 0 | - |
| `radiology` | Radiology | 7 | 178 | 0 | - |
| `reception` | Recepção | 1 | 22 | 9 | - |
| `specialty_diagnostics` | Specialty Diagnostics | 6 | 157 | 0 | - |
| `surgery` | Cirurgia | 4 | 89 | 3 | - |
| `telemedicine` | Telemedicine | 6 | 160 | 0 | - |
| `tenants` | Clientes | 5 | 81 | 0 | - |
| `therapy` | Therapy | 7 | 182 | 0 | - |
| `transportation` | Transportation | 9 | 220 | 1 | - |
| `veterinary` | Veterinary | 11 | 233 | 0 | - |
| `warehouse` | Logística Empresarial | 24 | 444 | 14 | - |

## Recursos Com Acoes

| Recurso | Acoes |
| --- | --- |
| `dashboard-analytics` | export:GET |
| `clinical-labrequest` | result_items:GET, results_pdf:GET |
| `clinical-patient` | clinical_history:GET, clinical_history_by_document:GET, clinical_history_pdf:GET, invoice_history_pdf:GET, payment_history_pdf:GET |
| `clinical-resultitem` | save_result:POST, start_analysis:POST, validate_result:POST |
| `dental-patient_treatment_plan` | expired:GET, valid:GET |
| `consultations-consultation` | cancel:POST, clinical_history:GET, clinical_history_pdf:GET, complete:POST, create_invoice:POST, price_preview:GET, reschedule:POST, schedule:GET |
| `nursing-procedure` | pdf:GET |
| `nursing-procedure_item` | complete:POST, execute:POST, mark_billed:POST, mark_not_completed:POST |
| `equipment-incident` | perform_maintenance:POST |
| `pharmacy-inventory_movement` | history_pdf:GET |
| `pharmacy-lot` | available:GET, stock_pdf:GET |
| `pharmacy-material_requisition` | archive:POST, fulfill:POST, movement_history_pdf:GET, requester_context:GET |
| `pharmacy-product` | product_consumption_pdf:GET, least_requested_products_pdf:GET, most_requested_products_pdf:GET, product_sector_demand_pdf:GET |
| `warehouse-cycle_count` | post_document:POST |
| `warehouse-goods_receipt` | post_document:POST |
| `warehouse-pick_list` | mark_picked:POST |
| `warehouse-replenishment_plan` | create_purchase_order:POST, generate_plan:POST |
| `warehouse-sales_order` | allocate_order:POST, cancel_order:POST, confirm_order:POST, create_pick_list:POST, ship_order:POST |
| `warehouse-shipment` | post_document:POST, ship_document:POST |
| `warehouse-stock_reservation` | release_reservation:POST |
| `warehouse-stock_transfer` | post_document:POST |
| `billing-invoice` | billing_history:GET, billing_history_pdf:GET, confirm_payment:POST, issue:POST, pdf:GET, void:POST |
| `bloodbank-unit` | forward_to_sector:POST, register_dispatch_outcome:POST, release:POST, reserve:POST, transfuse:POST |
| `identity-user` | activate_en:POST, activate:POST, deactivate_en:POST, deactivate:POST |
| `payments-payment` | confirm:POST, refund:POST |
| `payments-receipt` | pdf:GET |
| `payments-reconciliation` | confirm:POST |
| `payments-transaction` | reconcile:POST, verify:POST |
| `reception-checkin` | cancel:POST, care:GET, complete:POST, create_invoice:POST, create_request:POST, link_invoice:POST, link_request:POST, register_payment:POST, start_care:POST |
| `maintenance-maintenance` | pending_requests:GET |
| `surgery-large_surgery` | create_invoice:POST |
| `surgery-small_surgery` | create_invoice:POST |
| `surgery-surgery` | create_invoice:POST |
| `human_resources-employee` | activate_en:POST, activate:POST, deactivate_en:POST, deactivate:POST |
| `education-attendance` | roll_call:POST |
| `education-discipline_schedule` | create_full_plan:POST, mark_completed:POST |
| `education-random_test` | schedule_for_classroom:POST |
| `education-schedule_progress` | mark_success:POST |
| `transportation-route` | optimize:POST |

## Achados Prioritarios

- O mapa canonico agora torna visiveis modulos, recursos, campos, filtros, acoes e permissoes num unico contrato.
- A IA deve consumir este mapa antes de escolher ferramenta, especialmente para palavras soltas e pedidos incompletos.
- 91 recursos nao aparecem explicitamente no ROLE_POLICY; primeiros: audit-atividade, audit-usuarios, clinical_pharmacy-antibiotic_review, clinical_pharmacy-controlled_movement, clinical_pharmacy-ingredient, clinical_pharmacy-interaction_check, clinical_pharmacy-interaction_rule, clinical_pharmacy-preparation.
- 13 modulos ainda nao possuem aliases canonicos; primeiros: accounting, clinical_pharmacy, credit_financing, dashboard, dental, physiotherapy, public_health, radiology.
- 91 recursos ainda nao possuem aliases canonicos; primeiros: audit-usuarios, dashboard-analytics, clinical_pharmacy-antibiotic_review, clinical_pharmacy-controlled_movement, clinical_pharmacy-ingredient, clinical_pharmacy-interaction_check, clinical_pharmacy-interaction_rule, clinical_pharmacy-preparation.
- 39 recursos expoem acoes DRF customizadas que devem virar intents de workflow; primeiros: dashboard-analytics, clinical-labrequest, clinical-patient, clinical-resultitem, dental-patient_treatment_plan, consultations-consultation, nursing-procedure, nursing-procedure_item.
- A fase 3 deve consolidar aliases dispersos usando este mapa como fonte de verdade.

## Como A IA Deve Usar Este Mapa

- Resolver palavras soltas primeiro contra aliases de modulo, aliases de recurso e aliases de serializer.
- Usar campos, filtros e acoes para extrair slots antes de chamar ferramentas.
- Validar sempre permissoes por `resource.permissions` antes de preparar qualquer acao.
- Quando houver varios candidatos fortes, usar contexto activo ou pedir clarificacao curta.
