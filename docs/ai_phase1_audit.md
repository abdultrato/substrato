# IA Operacional - Auditoria Fase 1

Gerado em UTC: 2026-05-30T20:23:07.926487+00:00

## Resumo

- Ferramentas registadas: 15
- Módulos de API analisados: 37
- Recursos de API analisados: 227
- Módulos com ferramenta especializada directa: 9
- Módulos sem ferramenta especializada directa: 28
- Recursos sem aliases curados: 91
- Superfícies frontend da IA: 8
- Provider LLM actual: `local`
- Vector store disponível: True

## Leitura Técnica

A interpretação operacional ainda é majoritariamente baseada em termos explícitos; a busca semântica aparece na base de conhecimento, mas não governa todo o roteamento.

## Módulos Sem Ferramenta Especializada Directa

- `audit`
- `bloodbank`
- `clinical_pharmacy`
- `consultations`
- `credit_financing`
- `dashboard`
- `dental`
- `equipment`
- `equipment_integrations`
- `external_entities`
- `human_resources`
- `insurer`
- `maintenance`
- `maternity`
- `medical_records`
- `notifications`
- `physiotherapy`
- `public_health`
- `radiology`
- `reception`
- `specialty_diagnostics`
- `surgery`
- `telemedicine`
- `tenants`
- `therapy`
- `transportation`
- `veterinary`
- `warehouse`

## Ferramentas Registadas

| Ferramenta | Modo | Cobertura directa |
| --- | --- | --- |
| `answer_predicted_question` | `read` | genérica/sem módulo directo |
| `explore_database` | `read` | genérica/sem módulo directo |
| `get_clinical_operational_summary` | `read` | clinical |
| `get_command_center_alerts` | `read` | monitoring |
| `get_education_summary` | `read` | education |
| `get_financial_operational_summary` | `read` | accounting, billing, payments |
| `get_lab_request_collection_guidance` | `read` | clinical |
| `get_nursing_pending_work` | `read` | nursing |
| `get_pharmacy_stock_summary` | `read` | pharmacy |
| `get_project_identity` | `read` | genérica/sem módulo directo |
| `get_user_context` | `read` | identity |
| `prepare_crud_operation` | `prepare_action` | genérica/sem módulo directo |
| `prepare_operational_report` | `prepare_action` | genérica/sem módulo directo |
| `prepare_operational_task` | `prepare_action` | genérica/sem módulo directo |
| `run_sql_analytics` | `read` | genérica/sem módulo directo |

## Probes De Linguagem Solta

| Entrada | Área esperada | Recursos encontrados | Risco |
| --- | --- | --- | --- |
| `s` | mensagem vazia ou ruído | nenhum | Entrada curta demais pode virar clarificação genérica sem aprender intenção. |
| `dente` | odontologia | nenhum | Palavra solta de domínio precisa encontrar módulo/recurso mesmo sem verbo. |
| `planos dentarios expirados` | odontologia | nenhum | Mistura recurso + estado; precisa distinguir plano dentário de plano do paciente. |
| `pacientes hoje` | clínico/recepção | clinical-patient | Fragmento sem verbo exige inferência de contagem/listagem e período. |
| `paracetamol ontem` | farmácia | nenhum | Entidade + data relativa precisa virar consulta histórica segura. |
| `stock` | farmácia ou armazém | warehouse-warehouse, warehouse-item_category, warehouse-shipment, warehouse-cycle_count, warehouse-item | Termo ambíguo entre módulos deve pedir clarificação ou usar contexto activo. |
| `consultas abertas` | consultas | consultations-consultation, consultations-specialty, consultations-holiday, consultations-doctors | Estado operacional precisa mapear para campos reais de consulta. |
| `faturas pendentes` | facturação/financeiro | billing-invoice | Status financeiro exige aliases consistentes e filtros auditáveis. |
| `erros 500` | monitorização | monitoring-error | Pedido técnico curto precisa acionar Command Center sem depender de frase pronta. |
| `funcionarios ferias` | recursos humanos | human_resources-employee, human_resources-ferias, consultations-doctors | Dois substantivos devem resolver domínio, recurso e relação. |

## Taxonomia De Falhas

### keyword_overfit
- Título: Dependência excessiva de palavras-chave
- Sintoma: A IA acerta frases previstas, mas falha palavras soltas, erros ortográficos e sinónimos novos.
- Sinal de auditoria: Router e registry usam listas explícitas de termos; catálogo usa correspondência por regex de palavra inteira.
- Próxima fase: Fases 3, 4 e 6.

### module_coverage_gap
- Título: Cobertura desigual por módulo
- Sintoma: Alguns módulos têm ferramenta especializada, outros dependem apenas do explorador genérico.
- Sinal de auditoria: Comparação entre VIEWSET_GROUPS, catálogo de recursos e ferramentas registadas.
- Próxima fase: Fases 2 e 10.

### ambiguous_short_input
- Título: Entrada curta ou ambígua
- Sintoma: Pedidos como 'stock', 'dente' ou 'pendentes' não trazem intenção, recurso e filtros suficientes.
- Sinal de auditoria: Catálogo de probes de linguagem solta e recursos encontrados por termo.
- Próxima fase: Fases 4, 8 e 9.

### llm_not_semantic_core
- Título: Gateway local determinístico
- Sintoma: A resposta final resume ferramentas, mas não faz interpretação semântica profunda.
- Sinal de auditoria: LocalLlmGateway.provider permanece 'local'.
- Próxima fase: Fases 6 e 7.

### alias_drift
- Título: Aliases dispersos e difíceis de governar
- Sintoma: Termos PT/EN, labels, aliases de módulos e aliases de CRUD podem divergir.
- Sinal de auditoria: Resource catalog, CRUD e serializers mantêm normalizações próprias.
- Próxima fase: Fase 3.

### weak_feedback_loop
- Título: Falhas não viram treino automaticamente
- Sintoma: Perguntas não entendidas não geram fila governada de revisão e testes.
- Sinal de auditoria: A auditoria mede lacunas, mas ainda não há ciclo completo de aprendizagem.
- Próxima fase: Fases 17, 18 e 20.

## Achados Prioritários

- A IA já tem base operacional, mas a decisão ainda é predominantemente heurística e sensível a palavras exactas.
- O gateway LLM actual é local/determinístico; isto é seguro, mas limita compreensão semântica de linguagem livre.
- 28 módulos não têm ferramenta especializada directa; primeiros: audit, bloodbank, clinical_pharmacy, consultations, credit_financing, dashboard, dental, equipment.
- 13 módulos não têm aliases de módulo curados; primeiros: accounting, clinical_pharmacy, credit_financing, dashboard, dental, physiotherapy, public_health, radiology.
- 91 recursos não têm aliases curados; primeiros: audit-usuarios, dashboard-analytics, clinical_pharmacy-antibiotic_review, clinical_pharmacy-controlled_movement, clinical_pharmacy-ingredient, clinical_pharmacy-interaction_check, clinical_pharmacy-interaction_rule, clinical_pharmacy-preparation.
- A fase 2 deve transformar VIEWSET_GROUPS, modelos, serializers e permissões num mapa canónico consumido pela IA.
