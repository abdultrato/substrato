# Fluxo completo de Odontologia

O módulo físico continua em `apps/dental` para preservar app label, migrations, imports e APIs existentes. A organização moderna é feita por recursos reutilizáveis dentro do app `odontologia`, com fronteiras lógicas equivalentes a agenda, clínica, odontograma, planeamento, execução, prótese, imagem, financeiro, inventário, documentos, auditoria e analytics.

## Sequência principal

1. `DentalAppointment` regista a marcação.
2. `DentalConsultation` regista o atendimento clínico dentário.
3. `DentalRecord` consolida o histórico odontológico.
4. `DentalOdontogram` e `DentalOdontogramEntry` estruturam o mapa dentário.
5. `DentalDiagnosis` liga diagnóstico a consulta, prontuário ou dente.
6. `DentalTreatmentPlan`, `DentalTreatmentPhase` e `DentalTreatmentPlanItem` organizam o plano por fases e itens.
7. `DentalQuotation` gera o orçamento.
8. `DentalApproval` regista aprovação clínica, financeira e consentimento.
9. `DentalPayment` controla sinais, prestações e pagamentos.
10. `DentalProcedureExecution` regista procedimentos executados.
11. `DentalProsthesisLabOrder`, `DentalImagingOrder`, `DentalPrescription` e `DentalFollowUp` cobrem os fluxos satélites.
12. `DentalMaterialConsumption` liga consumo de material ao procedimento e pode apontar para farmácia/armazém.
13. `DentalBillingItem` cria a base faturável para integração com faturas.
14. `DentalClinicalEvolution`, `DentalDocument` e `DentalAuditEvent` dão continuidade clínica e rastreabilidade.
15. `PatientDentalPlanSummary` resume plano ativo, saldo, itens e próxima consulta.

## Frontend

O catálogo em `frontend-next/lib/modules.ts` expõe todos os recursos em `dental`. As páginas antigas continuam estáveis e os novos recursos usam a rota dinâmica `frontend-next/app/dental/[resourceSlug]`, que mapeia slugs como `consultations`, `quotations`, `procedure-executions` e `billing-items` para os endpoints DRF correspondentes.

Os formulários em `frontend-next/lib/resources/resourceFormConfig.ts` escondem apenas campos internos e mantêm visíveis os campos exigidos pelo backend, como `patient`, `procedure`, `medication`, `description`, `treatment_plan` e `title` conforme o recurso.
