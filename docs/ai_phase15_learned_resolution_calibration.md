# IA Operacional - Calibracao Da Resolucao Aprendida Fase 15

Gerado em UTC: 2026-05-31T01:25:45.737243+00:00

## Resumo

- Resolucao inicial aplicada: True
- Bloqueio apos um negativo: `option_blocked_by_feedback`
- Bloqueio apos negativos repetidos: `auto_resolution_feedback_cooldown`
- Confiabilidade apos negativos: 0.0
- Sequencia negativa recente: 2
- Confiabilidade apos aceite: 1.0
- Resolucao mantida apos aceite: True
- Estado da calibracao: `cooldown`

## Achados Prioritarios

- A auto-resolucao passa a consultar a confiabilidade da sessao antes de executar uma opcao aprendida.
- Dois feedbacks negativos recentes colocam a resolucao aprendida em espera e devolvem clarificacao.
- Feedback positivo mantem a resolucao automatica disponivel e fica visivel no payload de auditoria.
