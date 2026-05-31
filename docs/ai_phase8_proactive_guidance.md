# IA Operacional - Sugestoes Proactivas Fase 8

Gerado em UTC: 2026-05-30T22:38:10.128311+00:00

## Resumo

- Probes analisados: 6
- Probes com sugestoes: 6
- Sugestoes geradas: 27

## Tipos

- `filter`: 11
- `question`: 10
- `report`: 4
- `task`: 2

## Probes

| Contexto | Recursos | Tipos | Perguntas recomendadas |
| --- | --- | --- | --- |
| `planos dentarios` | dental-patient_treatment_plan | filter, filter, filter, question, report, question | Mostre pacientes com plano dentario expirado.<br>Mostre pacientes com plano dentario valido.<br>Compare validos e expirados neste recurso. |
| `stock farmacia` | pharmacy-lot | filter, filter, filter, question, question | Mostre lotes de farmacia expirados.<br>Compare validos e expirados neste recurso.<br>Mostre lotes que vencem nos proximos 30 dias. |
| `faturas` | billing-invoice | filter, filter, filter, report, question | Mostre faturas pendentes.<br>Compare pendentes com pagos ou concluidos.<br>Mostre faturas pagas este mes. |
| `wms` | warehouse-stock_level | filter, question, report, report, question | Mostre saldos abaixo do ponto de reposicao.<br>Mostre reservas de stock pendentes.<br>Gere um relatorio de stock e reposicao. |
| `monitoramento` | monitoring-error | filter, task, task, question | Mostre erros 500 das ultimas 24 horas.<br>Crie uma tarefa operacional para dar seguimento.<br>Crie uma tarefa para investigar estes erros. |
| `sem foco` | - | question, question | Indique o modulo e o periodo que devo investigar.<br>Mostre exemplos de perguntas que posso fazer. |

## Achados Prioritarios

- A IA passa a devolver perguntas recomendadas baseadas no recurso e nos filtros em foco.
- As sugestoes proactivas sao prompts seguros, nao acoes gravadas nem execucoes sem confirmacao.
- A fase 9 deve transformar estas sugestoes em seleccao visual e aprendizagem por uso.
