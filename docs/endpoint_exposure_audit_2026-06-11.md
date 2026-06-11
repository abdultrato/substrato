# Auditoria de exposicao de endpoints - Substrato

Data da varredura: 2026-06-11

Atualizacao de implementacao em 2026-06-11:
- Foram criadas paginas dedicadas para os 26 endpoints que continuavam sem rota propria apos considerar aliases e rotas dinamicas existentes.
- Foram criadas mais 107 subpaginas CRUD (`new`, detalhe e/ou edicao) para listas dedicadas que ja existiam, mas ainda nao tinham todas as paginas suportadas pelo OpenAPI.
- As rotas geradas de criacao/edicao de `audit_activities/user-activities` foram convertidas para redirect, porque o contrato atual so permite listagem/detalhe.
- Verificacoes executadas:
  - `npm test -- --run __tests__/generated-resource-crud-route-coverage.test.ts __tests__/generated-resource-routes-contract.test.ts`
  - `npm run type-check`

Escopo:
- Backend Django/DRF registrado em `api/v1/routing/routes.py`.
- Frontend Next em `frontend-next`.
- Contrato OpenAPI importado pelo frontend em `frontend-next/schema.generated.json`.
- Catalogo estatico em `frontend-next/lib/modules.ts`.
- Paginas dedicadas em `frontend-next/app/**/page.tsx`.
- Registry generico de acoes em `frontend-next/lib/resources/detailActions.ts`.

## Resumo executivo

| Item | Resultado |
| --- | ---: |
| Grupos backend registrados | 39 |
| Recursos/ViewSets backend registrados | 333 |
| Acoes customizadas backend (`@action`) | 411 |
| Recursos backend ausentes do OpenAPI usado pelo frontend | 0 |
| Recursos backend ausentes do catalogo estatico `MODULES_BASE` | 41 |
| Recursos backend com pagina dedicada de modulo | 212 |
| Recursos backend expostos apenas pelo fallback generico `/resources` | 121 |
| Acoes detail POST backend | 366 |
| Acoes detail POST com botao no registry generico | 330 |
| Acoes detail POST sem botao no registry generico | 36 |

Conclusao principal: nao ha recurso de ViewSet registrado no backend que esteja fora do OpenAPI usado pelo frontend. A lacuna real esta na exposicao de produto: 121 recursos so aparecem pelo catalogo generico, e 36 acoes detail POST ainda nao tem botao declarado no registry generico de acoes.

## Situacao por dominio

| Dominio | Backend | Ausente OpenAPI | Ausente catalogo estatico | Sem pagina dedicada | So generico |
| --- | ---: | ---: | ---: | ---: | ---: |
| accounting | 4 | 0 | 0 | 1 | 1 |
| audit | 2 | 0 | 0 | 2 | 2 |
| billing | 3 | 0 | 0 | 3 | 3 |
| bloodbank | 6 | 0 | 0 | 0 | 0 |
| clinical | 10 | 0 | 0 | 10 | 10 |
| clinical_laboratory | 39 | 0 | 39 | 1 | 1 |
| clinical_pharmacy | 6 | 0 | 0 | 0 | 0 |
| consultations | 4 | 0 | 0 | 1 | 1 |
| credit_financing | 5 | 0 | 0 | 0 | 0 |
| dashboard | 1 | 0 | 0 | 1 | 1 |
| dental | 25 | 0 | 0 | 17 | 17 |
| education | 21 | 0 | 0 | 21 | 21 |
| equipment | 3 | 0 | 0 | 0 | 0 |
| equipment_integrations | 8 | 0 | 0 | 8 | 8 |
| external_entities | 1 | 0 | 0 | 1 | 1 |
| human_resources | 19 | 0 | 0 | 10 | 10 |
| identity | 3 | 0 | 1 | 3 | 3 |
| insurer | 4 | 0 | 0 | 2 | 2 |
| maintenance | 1 | 0 | 0 | 0 | 0 |
| maternity | 1 | 0 | 0 | 0 | 0 |
| medical_records | 2 | 0 | 0 | 0 | 0 |
| monitoring | 4 | 0 | 0 | 3 | 3 |
| notifications | 3 | 0 | 0 | 2 | 2 |
| nursing | 15 | 0 | 0 | 1 | 1 |
| pathology | 18 | 0 | 0 | 0 | 0 |
| payments | 4 | 0 | 0 | 3 | 3 |
| pharmacy | 7 | 0 | 0 | 0 | 0 |
| physiotherapy | 7 | 0 | 0 | 0 | 0 |
| public_health | 8 | 0 | 1 | 8 | 8 |
| radiology | 7 | 0 | 0 | 0 | 0 |
| reception | 3 | 0 | 0 | 3 | 3 |
| specialty_diagnostics | 6 | 0 | 0 | 0 | 0 |
| surgery | 21 | 0 | 0 | 0 | 0 |
| telemedicine | 6 | 0 | 0 | 0 | 0 |
| tenants | 5 | 0 | 0 | 5 | 5 |
| therapy | 7 | 0 | 0 | 0 | 0 |
| transportation | 9 | 0 | 0 | 0 | 0 |
| veterinary | 11 | 0 | 0 | 0 | 0 |
| warehouse | 24 | 0 | 0 | 15 | 15 |

## Recursos ausentes do catalogo estatico

Estes recursos existem no backend e no OpenAPI, mas nao aparecem diretamente no `MODULES_BASE`. Eles podem entrar no frontend pelo fallback OpenAPI de `useModulesCatalog`.

- `/clinical_laboratory/afb_smear/`
- `/clinical_laboratory/antibiogram/`
- `/clinical_laboratory/audit_finding/`
- `/clinical_laboratory/biosafety_inspection/`
- `/clinical_laboratory/collection/`
- `/clinical_laboratory/competency/`
- `/clinical_laboratory/complaint/`
- `/clinical_laboratory/corrective_action/`
- `/clinical_laboratory/critical_notification/`
- `/clinical_laboratory/culture/`
- `/clinical_laboratory/decontamination/`
- `/clinical_laboratory/exposure_incident/`
- `/clinical_laboratory/hazard/`
- `/clinical_laboratory/internal_audit/`
- `/clinical_laboratory/isolate/`
- `/clinical_laboratory/management_review/`
- `/clinical_laboratory/molecular_result/`
- `/clinical_laboratory/nonconformity/`
- `/clinical_laboratory/order/`
- `/clinical_laboratory/order_item/`
- `/clinical_laboratory/panel/`
- `/clinical_laboratory/ppe/`
- `/clinical_laboratory/ppe_distribution/`
- `/clinical_laboratory/quality_document/`
- `/clinical_laboratory/quality_indicator/`
- `/clinical_laboratory/reception/`
- `/clinical_laboratory/rejection/`
- `/clinical_laboratory/report/`
- `/clinical_laboratory/result/`
- `/clinical_laboratory/risk_assessment/`
- `/clinical_laboratory/sample/`
- `/clinical_laboratory/sector/`
- `/clinical_laboratory/spill/`
- `/clinical_laboratory/test/`
- `/clinical_laboratory/training_record/`
- `/clinical_laboratory/vaccination/`
- `/clinical_laboratory/validation/`
- `/clinical_laboratory/waste/`
- `/clinical_laboratory/worklist/`
- `/identity/passwordresettoken/`
- `/public_health/dashboard/`

## Recursos expostos apenas pelo generico `/resources`

Estes recursos existem no backend e aparecem no OpenAPI/catalago mesclado, mas nao tem pagina dedicada de modulo em `frontend-next/app`.

### accounting

- `/accounting/account/`

### audit

- `/audit/atividade/`
- `/audit/usuarios/`

### billing

- `/billing/invoice/`
- `/billing/invoicehistory/`
- `/billing/invoiceitem/`

### clinical

- `/clinical/exam/`
- `/clinical/examfield/`
- `/clinical/labrequest/`
- `/clinical/labrequestitem/`
- `/clinical/medicalexam/`
- `/clinical/medicalexamfield/`
- `/clinical/medicalresultfile/`
- `/clinical/patient/`
- `/clinical/resultitem/`
- `/clinical/sample/`

### clinical_laboratory

- `/clinical_laboratory/order_item/`

Observacao: este item parece intencionalmente de segunda camada, pois o proprio ViewSet comenta que itens devem ser listados filtrados pelo pedido.

### consultations

- `/consultations/doctors/`

### dashboard

- `/dashboard/analytics/`

### dental

- `/dental/approval/`
- `/dental/audit_event/`
- `/dental/billing_item/`
- `/dental/clinical_evolution/`
- `/dental/consultation/`
- `/dental/diagnosis/`
- `/dental/document/`
- `/dental/followup/`
- `/dental/imaging_order/`
- `/dental/material_consumption/`
- `/dental/odontogram_chart/`
- `/dental/patient_plan_summary/`
- `/dental/payment/`
- `/dental/prescription/`
- `/dental/procedure_execution/`
- `/dental/quotation/`
- `/dental/treatment_phase/`

### education

- `/education/assessment/`
- `/education/assignment/`
- `/education/attendance/`
- `/education/bibliography/`
- `/education/classroom/`
- `/education/content/`
- `/education/course/`
- `/education/discipline_schedule/`
- `/education/enrollment/`
- `/education/exam_attempt/`
- `/education/examination/`
- `/education/examination_attempt/`
- `/education/grade/`
- `/education/lesson/`
- `/education/random_test/`
- `/education/schedule_progress/`
- `/education/skill/`
- `/education/student/`
- `/education/submission/`
- `/education/teacher/`
- `/education/thematic_map/`

### equipment_integrations

- `/equipment_integrations/analyte_mapping/`
- `/equipment_integrations/credential/`
- `/equipment_integrations/document/`
- `/equipment_integrations/equipment/`
- `/equipment_integrations/message/`
- `/equipment_integrations/order/`
- `/equipment_integrations/order_item/`
- `/equipment_integrations/routing/`

### external_entities

- `/external_entities/empresa/`

### human_resources

- `/human_resources/agregadofamiliar/`
- `/human_resources/dispensa/`
- `/human_resources/falta/`
- `/human_resources/ferias/`
- `/human_resources/folhapagamento/`
- `/human_resources/horaextra/`
- `/human_resources/horario/`
- `/human_resources/processodisciplinar/`
- `/human_resources/profissao/`
- `/human_resources/role/`

### identity

- `/identity/passwordresettoken/`
- `/identity/perfilprofissional/`
- `/identity/user/`

### insurer

- `/insurer/insurer/`
- `/insurer/tenant_coverage_plan/`

### monitoring

- `/monitoring/cloud_control/`
- `/monitoring/export_job/`
- `/monitoring/telemetry/`

### notifications

- `/notifications/logenvio/`
- `/notifications/template/`

### nursing

- `/nursing/ward_dashboard/`

### payments

- `/payments/receipt/`
- `/payments/reconciliation/`
- `/payments/transaction/`

### public_health

- `/public_health/adverse_event/`
- `/public_health/campaign/`
- `/public_health/dashboard/`
- `/public_health/immunization/`
- `/public_health/lot/`
- `/public_health/notification/`
- `/public_health/target/`
- `/public_health/vaccine/`

### reception

- `/reception/care/`
- `/reception/checkin/`
- `/reception/workspace/`

### tenants

- `/tenants/configuracaoinquilino/`
- `/tenants/featureflagtenant/`
- `/tenants/planoassinatura/`
- `/tenants/tenant/`
- `/tenants/usotenant/`

### warehouse

- `/warehouse/cycle_count/`
- `/warehouse/cycle_count_line/`
- `/warehouse/goods_receipt_line/`
- `/warehouse/item/`
- `/warehouse/item_category/`
- `/warehouse/lot/`
- `/warehouse/pick_list_line/`
- `/warehouse/purchase_order_line/`
- `/warehouse/replenishment_suggestion/`
- `/warehouse/sales_order_line/`
- `/warehouse/shipment_line/`
- `/warehouse/stock_movement/`
- `/warehouse/stock_transfer_line/`
- `/warehouse/storage_location/`
- `/warehouse/warehouse/`

## Acoes backend sem botao no registry generico

Estas acoes detail POST existem no backend/OpenAPI, mas nao estao declaradas em `frontend-next/lib/resources/detailActions.ts`. Algumas aparecem em fluxos especializados ou no cliente OpenAPI gerado, mas nao no painel generico `ResourceDetailActionsPanel`.

### billing

- `/billing/invoice/{id}/send-notification/`

### bloodbank

- `/bloodbank/donation/{id}/approve-screening/`
- `/bloodbank/donation/{id}/cancel/`
- `/bloodbank/donation/{id}/complete-collection/`
- `/bloodbank/donation/{id}/reject-screening/`
- `/bloodbank/donation/{id}/start-screening/`
- `/bloodbank/unit/{id}/forward-to-sector/`
- `/bloodbank/unit/{id}/register-dispatch-outcome/`
- `/bloodbank/unit/{id}/release/`
- `/bloodbank/unit/{id}/reserve/`
- `/bloodbank/unit/{id}/transfuse/`

### clinical

- `/clinical/labrequest/{id}/send-results-notification/`

### clinical_pharmacy

- `/clinical_pharmacy/preparation/{id}/adicionar-ingrediente/`

### dental

- `/dental/record/{id}/registar-odontograma/`

### education

- `/education/discipline_schedule/{id}/mark_completed/`
- `/education/schedule_progress/{id}/mark_success/`

### human_resources

- `/human_resources/employee/{id}/activate/`
- `/human_resources/employee/{id}/deactivate/`

### identity

- `/identity/user/{id}/activate/`
- `/identity/user/{id}/deactivate/`

### nursing

- `/nursing/ward_admission/{id}/transferir/`

### payments

- `/payments/transaction/{id}/reconcile/`
- `/payments/transaction/{id}/verify/`

### pharmacy

- `/pharmacy/material_requisition/{id}/fulfill/`

### physiotherapy

- `/physiotherapy/session/{id}/registar-uso-aparelho/`

### radiology

- `/radiology/study/{id}/atribuir-radiologista/`

### reception

- `/reception/checkin/{id}/link-invoice/`
- `/reception/checkin/{id}/link-request/`
- `/reception/checkin/{id}/register-payment/`

### specialty_diagnostics

- `/specialty_diagnostics/order/{id}/atribuir-especialista/`
- `/specialty_diagnostics/order/{id}/registar-medicoes/`

### surgery

- `/surgery/large_surgery/{id}/create-invoice/`
- `/surgery/small_surgery/{id}/create-invoice/`
- `/surgery/surgery/{id}/create-invoice/`

### therapy

- `/therapy/prescription_link/{id}/vincular/`

### transportation

- `/transportation/trip/{id}/rastrear/`

## Observacoes sobre rotas legadas do frontend

Ha muitas paginas em `frontend-next/app` com endpoints em plural/kebab, por exemplo `/clinical/lab-exams/` e `/billing/invoices/`. Elas nao foram classificadas automaticamente como quebradas porque o frontend aplica `canonicalizeEndpointPath()` antes das chamadas de API. Esse resolver cria aliases a partir do OpenAPI e tambem possui mapas estaticos para rotas legadas.

Risco residual: se uma pagina dedicada passa um alias que o resolver nao consegue canonicalizar, ela pode parecer existir visualmente, mas cair em endpoint inexistente. A verificacao manual recomendada e abrir as paginas dedicadas dos dominios com rotas antigas e confirmar no Network se a chamada final vai para `/api/v1/<dominio>/<recurso>/` canonico.

## Priorizacao recomendada

1. Resolver `clinical_laboratory` no catalogo estatico: sao 39 recursos ausentes de `MODULES_BASE`, embora estejam no OpenAPI.
2. Promover recursos P0 de operacao para paginas dedicadas: `billing`, `clinical`, `payments`, `reception`, `public_health`, `education` e `equipment_integrations`.
3. Decidir quais recursos devem continuar somente no generico por regra de negocio: itens, linhas, historicos e dashboards tecnicos podem permanecer como segunda camada.
4. Adicionar ao `detailActions.ts` as 36 acoes detail POST que ainda nao aparecem no painel generico, ou documentar explicitamente quais ficam em fluxos especializados.
5. Rodar um smoke manual no navegador para as rotas legadas/canonicalizadas e verificar a URL real chamada pelo `apiFetch`.
