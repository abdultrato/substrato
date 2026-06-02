# Memória do Projeto

## Stack Principal

- Backend: Django 4.2, Django REST Framework e arquitetura multi-tenant.
- Frontend: Next.js 15, React 18 e Tailwind CSS em `frontend-next`.
- Banco de dados: PostgreSQL em Docker; SQLite aparece em ambientes locais legados.
- Cache e filas: Redis para cache/Celery quando `USE_REDIS=true`; fallback de cache em memória para desenvolvimento sem Redis.
- Containerização: Docker Compose com serviços `backend`, `frontend`, `db` e `redis`.
- Observabilidade: Command Center, logs de sistema, outbox transacional e healthchecks.

## Padrões Arquiteturais

- DDD e Clean Architecture como diretrizes de modularização.
- Service Layer para regras de aplicação.
- Ferramentas da IA devem ser pequenas, explícitas, testáveis e registradas no `AiToolRegistry`.
- Escritas e ações operacionais seguem duas fases: preparar ação e confirmar no backend.
- RBAC e tenant são obrigatórios para qualquer acesso a dados operacionais.

## Decisões Operacionais da IA

- A IA do Substrato é uma camada operacional e técnica permanente sobre o projeto, não um chatbot genérico.
- Respostas factuais devem usar fontes internas: documentação, código, mapa do projeto, banco autorizado ou memória.
- A IA pode sugerir alterações técnicas, tarefas e validações, mas não deve editar, apagar, migrar ou fazer deploy sem confirmação explícita.
- Dependências pesadas de vetor/embeddings ficam opcionais para preservar boot e Docker local.
- O gateway atual é local/determinístico, com cache e fallback; a arquitetura permanece pronta para provedor externo.

## Funcionalidades Concluídas

- Sessões, mensagens, ferramentas, ações sugeridas, política e auditoria da IA.
- Roteamento de intenção com sinais semânticos e aprendizagem incremental.
- Ferramentas operacionais para contexto do utilizador, Command Center, clínica, enfermagem, financeiro, farmácia, educação, SQL analytics, CRUD preparado, relatórios e tarefas.
- Mapa canônico do projeto para módulos, recursos, APIs, campos, filtros e permissões.
- Camada de contexto especialista do projeto para documentação, código, decisões, memória e agentes.

## Funcionalidades Pendentes

- Vetorização persistente em Qdrant/pgvector/FAISS com instalação opcional controlada.
- Ferramentas seguras de edição de código com aprovação humana e trilha de auditoria dedicada.
- Backlog técnico automático ligado a tarefas/PRs.
- Integração com provedor LLM externo ou modelo local quando a política de dados estiver fechada.

## Regras

- Nenhum módulo deve acessar diretamente outro domínio sem contrato claro.
- Toda regra crítica deve estar na camada de domínio ou serviço apropriado.
- Toda API deve preservar autenticação, RBAC, tenant e auditoria.
- Toda alteração relevante deve ter teste ou validação documentada.
- A IA deve consultar documentação e código antes de sugerir mudanças estruturais.
