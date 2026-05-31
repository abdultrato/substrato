# IA Operacional - Calibracao Por Perfil Fase 16

Gerado em UTC: 2026-05-31T01:56:50.042024+00:00

## Resumo

- Sessoes do perfil usadas: 2
- Sessoes do proprio utilizador: 1
- Feedbacks negativos do perfil: 3
- Outro perfil ignorado: True
- Sessao actual excluida da agregacao: True
- Bloqueio por perfil: `auto_resolution_profile_feedback_cooldown`
- Escopo do bloqueio: `profile`
- Estado do perfil: `cooldown`
- Perfil saudavel ainda resolve: True
- Confiabilidade saudavel: 1.0

## Achados Prioritarios

- Feedback de sessoes anteriores do mesmo perfil passa a calibrar a auto-resolucao.
- Rejeicoes repetidas por perfil bloqueiam a execucao automatica antes de tocar nas ferramentas.
- Sinais de outros perfis e da sessao actual nao contaminam a calibracao agregada.
