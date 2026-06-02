# IA Especialista do Projeto

Esta camada adiciona à IA Operacional a capacidade de responder perguntas técnicas sobre o Substrato com base em documentação, código, memória e decisões registradas.

## Componentes

- Serviço: `apps.ai_assistant.services.project_context`
- Ferramenta: `search_project_context`
- Memória: `docs/ai/project_memory.md`
- Agentes: `docs/ai/agents.yaml`
- Decisões: `docs/ai/decisions/`
- Comando: `python manage.py ai_project_context search --query "..."`

## Escopo Inicial

A implementação atual é propositalmente de leitura:

- busca documentação e código em caminhos permitidos;
- seleciona agentes especializados por palavras-chave;
- inclui memória e ADRs no contexto;
- registra execução via `AiToolCall`;
- gera resposta com fontes internas.

## Limites de Segurança

A IA não deve apagar arquivos, alterar banco de dados, rodar migrations, fazer deploy, alterar autenticação/permissões ou editar código automaticamente sem confirmação explícita.

## Evolução Planejada

1. Indexação persistente com banco vetorial opcional.
2. Ferramentas de criação/edição de arquivos com aprovação humana.
3. Geração automática de backlog técnico.
4. Relatórios de revisão de arquitetura, segurança e QA.
