# IA Operacional - Roteamento Semantico Fase 4

Gerado em UTC: 2026-05-30T21:29:28.674326+00:00

## Resumo

- Probes analisados: 10
- Prontos sem clarificacao: 10
- Ainda exigem clarificacao: 0
- Probes com recursos normalizados: 10

## Ferramentas Seleccionadas

- `explore_database`: 10
- `get_command_center_alerts`: 1
- `get_financial_operational_summary`: 1
- `get_pharmacy_stock_summary`: 1

## Probes

| Entrada | Estado | Intencao | Recursos | Ferramentas |
| --- | --- | --- | --- | --- |
| `dente` | ready | `data_lookup` | dental-odontogram, dental-prosthesis_lab_order, dental-treatment_item, dental-appointment, dental-patient_treatment_plan | explore_database |
| `odontologia` | ready | `data_lookup` | dental-appointment, dental-odontogram, dental-treatment_item, dental-prosthesis_lab_order, dental-patient_treatment_plan | explore_database |
| `planos dentarios expirados` | ready | `data_lookup` | dental-patient_treatment_plan | explore_database |
| `plano dentario valido` | ready | `data_lookup` | dental-patient_treatment_plan, dental-treatment_plan | explore_database |
| `historico dentario` | ready | `data_lookup` | dental-record | explore_database |
| `consulta dentaria` | ready | `data_lookup` | dental-appointment, dental-treatment_item, dental-record, dental-odontogram, dental-prosthesis_lab_order | explore_database |
| `stock` | ready | `data_lookup` | warehouse-warehouse, warehouse-item_category, warehouse-shipment, warehouse-cycle_count, warehouse-item | explore_database, get_pharmacy_stock_summary |
| `faturas pendentes` | ready | `data_or_operational_lookup` | billing-invoice | explore_database, get_financial_operational_summary |
| `funcionarios ferias` | ready | `data_lookup` | human_resources-employee, human_resources-ferias | explore_database |
| `erros 500` | ready | `data_or_operational_lookup` | monitoring-error | explore_database, get_command_center_alerts |

## Achados Prioritarios

- Router e registry passam a consumir o mesmo servico de sinais semanticos antes de escolher ferramenta.
- Recursos reconhecidos por aliases canonicos agora chamam ferramentas operacionais mesmo quando a mensagem e curta.
- A fase 5 deve enriquecer filtros/estados para transformar termos como valido, expirado e pendente em querysets reais.
