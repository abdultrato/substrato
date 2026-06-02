# ADR-001 - IA Especialista do Projeto em Modo Leitura

## Estado

Aceita.

## Contexto

O projeto já possui uma IA operacional com sessões, mensagens, ferramentas, política, auditoria, memória conversacional, aprendizagem de clarificação, mapa canônico e gateway local. As novas instruções exigem que a IA também funcione como especialista técnica do projeto: conhecer arquitetura, documentação, código, decisões e apoiar desenvolvimento.

## Decisão

Implementar uma camada inicial de contexto especialista em modo leitura:

- `docs/ai/project_memory.md` mantém memória estável do projeto.
- `docs/ai/agents.yaml` define agentes especializados e seus guardrails.
- `docs/ai/decisions/` armazena ADRs da IA e decisões técnicas.
- `apps.ai_assistant.services.project_context` faz busca lexical segura em documentação, código selecionado, memória e decisões.
- `search_project_context` é registrada como ferramenta de leitura no `AiToolRegistry`.

## Consequências

- A IA passa a responder perguntas técnicas com fontes reais do projeto.
- O boot Docker não depende de banco vetorial pesado.
- Edição de código, migrations, deploy e ações destrutivas continuam fora do modo automático e exigem confirmação humana.
- A camada pode evoluir para Qdrant, pgvector ou FAISS quando a política de dependências e deploy estiver estabilizada.
