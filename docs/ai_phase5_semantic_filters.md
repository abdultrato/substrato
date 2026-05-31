# IA Operacional - Filtros Semanticos Fase 5

Gerado em UTC: 2026-05-30T21:43:15.564901+00:00

## Resumo

- Probes analisados: 8
- Probes com filtros reais: 8
- Filtros aplicados: 8
- Filtros ignorados: 0

## Probes

| Entrada | Recurso | Filtros aplicados |
| --- | --- | --- |
| `planos dentarios validos` | `dental-patient_treatment_plan` | validity valid_on 2026-05-30 |
| `planos dentarios expirados` | `dental-patient_treatment_plan` | validity expired_on 2026-05-30 |
| `faturas pendentes` | `billing-invoice` | status not_in ['PAGA', 'CANC'] |
| `consultas hoje` | `consultations-consultation` | scheduled_for between 2026-05-30..2026-05-30 |
| `consultas abertas` | `consultations-consultation` | status in ['MARCADA'] |
| `erros 500` | `monitoring-error` | status_code in [500] |
| `funcionarios ativos` | `human_resources-employee` | status in ['ATIVO'] |
| `lotes expirados` | `pharmacy-lot` | expiration_date lt 2026-05-30 |

## Achados Prioritarios

- Termos de estado e periodo agora geram filtros de queryset auditaveis antes da contagem e amostra segura.
- A validade de planos dentarios usa regra de dominio: status ACTIVE, inicio <= hoje e fim nulo ou futuro.
- Faturas pendentes usam regra operacional: excluir pagas e canceladas quando o modelo nao tem status PENDING.
- A fase 6 deve usar pontuacao semantica e historico de conversa para desambiguar termos como stock.
