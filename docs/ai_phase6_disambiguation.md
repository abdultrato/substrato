# IA Operacional - Desambiguacao Contextual Fase 6

Gerado em UTC: 2026-05-30T22:24:54.806652+00:00

## Resumo

- Probes analisados: 6
- Ambiguos: 1
- Prontos sem clarificacao: 5
- Com clarificacao: 1
- Resolvidos por modulo activo: 2
- Resolvidos por contexto/termos: 3

## Probes

| Entrada | Modulo activo | Estado | Top module | Recursos | Motivos |
| --- | --- | --- | --- | --- | --- |
| `stock` | `ai` | needs_clarification | `warehouse` | warehouse-item, warehouse-lot, pharmacy-lot, bloodbank-stock_movement, warehouse-stock_movement | - |
| `stock` | `pharmacy` | ready | `pharmacy` | pharmacy-lot, pharmacy-inventory_movement, pharmacy-product | modulo_activo:pharmacy |
| `stock` | `warehouse` | ready | `warehouse` | warehouse-item, warehouse-lot, warehouse-stock_movement, warehouse-stock_level, warehouse-warehouse | modulo_activo:warehouse |
| `stock de farmacia` | `ai` | ready | `pharmacy` | pharmacy-lot, pharmacy-material_requisition_item, pharmacy-sale_item, pharmacy-inventory_movement, pharmacy-product | termos_dominio:pharmacy |
| `stock do armazem` | `ai` | ready | `warehouse` | warehouse-warehouse, warehouse-item_category, warehouse-shipment, warehouse-cycle_count, warehouse-item | termos_dominio:warehouse |
| `mostre isso` | `ai` | ready | `pharmacy` | pharmacy-lot | foco_conversa:recurso |

## Achados Prioritarios

- Termos soltos como stock passam a gerar candidatos por modulo antes de consultar dados.
- Modulo activo, foco da conversa e termos de dominio passam a entrar na pontuacao final do recurso.
- Entradas ainda ambiguas agora pedem clarificacao explicita: stock.
- Resolucoes auditadas: stock->pharmacy, stock->warehouse, stock de farmacia->pharmacy, stock do armazem->warehouse, mostre isso->pharmacy.
- A fase 7 deve usar estes sinais para enriquecer memoria de conversa e follow-ups multi-turn.
