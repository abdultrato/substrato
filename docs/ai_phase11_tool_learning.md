# IA Operacional - Aprendizagem de Ferramentas Fase 11

Gerado em UTC: 2026-05-31T00:06:08.507559+00:00

## Resumo

- Ferramentas sem aprendizagem: explore_database, get_financial_operational_summary
- Ferramentas com aprendizagem: get_financial_operational_summary, explore_database
- Pedido de relatório: get_financial_operational_summary, prepare_operational_report
- Relatório não adicionado sem sinal explícito: True

## Pesos

- `get_financial_operational_summary`: 16
- `prepare_operational_report`: 16

## Achados Prioritarios

- Pesos aprendidos passam a ordenar ferramentas compatíveis antes da execução.
- Ferramentas de relatório e tarefa só entram quando o pedido actual tem sinal explícito.
- A fase 12 deve usar estes pesos para escolher perguntas de clarificação mais específicas.
