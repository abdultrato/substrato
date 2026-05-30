# Padrões de Manutenção do Backend

Actualizado: 2026-05-25

Este documento define o padrão esperado para evoluir o backend sem acumular dívida técnica invisível.

## Estrutura de uma alteração enterprise

Uma alteração completa deve responder a quatro perguntas:

1. Qual regra de negócio muda?
2. Qual contrato API ou operacional muda?
3. Que dados existentes são afectados?
4. Que teste prova que a alteração funciona e não regride?

Se uma destas respostas não existir, a alteração ainda não está pronta.

## Onde colocar código novo

| Necessidade | Local preferido |
|---|---|
| Novo modelo persistido | `apps/<modulo>/models.py` ou `apps/<modulo>/models/<entidade>.py`. |
| Novo endpoint CRUD | `api/v1/<modulo>/serializers.py`, `viewsets_impl/core.py`, `viewsets.py`, `filters.py`. |
| Regra de domínio reutilizável | `services/<modulo>/` ou `apps/<modulo>/services/`. |
| Integração externa | `integrations/` ou `infrastructure/` com contrato claro. |
| Middleware/contexto técnico | `infrastructure/middleware/` ou `infrastructure/context/`. |
| Permissão/RBAC | `security/permissions/`. |
| Tarefa assíncrona ou PDF | `tasks/` ou serviço dedicado chamado pela task. |
| Evento de domínio | `events/<modulo>/` ou outbox transaccional. |
| Constante partilhada | `core/constants/`. |
| Value object | `core/value_objects/`. |

## Regras de código

- Preferir nomes canónicos em inglês no código e labels/traduções em português quando expostos ao utilizador.
- Evitar lógica de negócio dentro de views quando a mesma regra pode ser testada num serviço ou modelo.
- Evitar imports circulares; mover contratos partilhados para `core/`, `services/` ou `domain/` quando necessário.
- Não usar `print()` em código Python de produção; usar `logging`.
- Não apanhar `Exception` sem logging, contexto ou transformação explícita de erro.
- Não criar queries que ignorem tenant sem teste e justificação.
- Não duplicar listas de choices entre backend e frontend; expor contrato ou centralizar aliases.
- Não misturar geração de ficheiro, regra de negócio e resposta HTTP na mesma função grande.

## Regras de serializers

- Validar payload e normalizar aliases.
- Não confiar em `tenant` enviado pelo cliente.
- Evitar side effects pesados em `validate`; side effects pertencem ao serviço ou `create/update` controlado.
- Mensagens de erro devem ser úteis e estáveis.
- Campos computados devem ser documentados quando usados pelo frontend.

## Regras de ViewSets

- Declarar `queryset`, `serializer_class`, `filterset_class`, `search_fields` e `ordering_fields` quando aplicável.
- Usar mixins de tenant e validação de search/ordering quando o endpoint for tenant-aware.
- Acções customizadas devem ter testes de status, permissão e payload principal.
- Endpoints de ficheiros devem indicar content type e formato de resposta.
- Se a acção puder ser demorada, suportar fila assíncrona ou documentar limite operacional.

## Regras de serviços

- Serviços devem receber entradas explícitas e retornar objectos/DTOs previsíveis.
- Operações multi-modelo devem usar `transaction.atomic()`.
- Serviços financeiros, clínicos, farmacêuticos e académicos devem ter testes focados.
- Não aceder a `request` dentro de serviços salvo adaptador explícito; passar `tenant`, `user` e parâmetros necessários.

## Regras de testes

Cobertura mínima por tipo de alteração:

| Alteração | Teste esperado |
|---|---|
| Serializer novo | Payload válido, payload inválido e alias quando existir. |
| ViewSet CRUD | List/detail/create/update ou pelo menos fluxo crítico. |
| Regra de estado | Transição permitida e transição bloqueada. |
| Tenant scope | Utilizador de outro tenant não lê/escreve. |
| PDF/export | Content type, status e caminho síncrono/assíncrono. |
| Serviço financeiro/stock | Cálculo, persistência e rollback em erro. |
| Middleware/permissão | Path permitido, path bloqueado e excepção documentada. |

Comandos recomendados:

```bash
ruff check . --no-fix
python -m pytest <ficheiros-ou-testes-focados> -q --reuse-db --nomigrations
```

Antes de merge/release maior:

```bash
python -m pytest -q --reuse-db
python manage.py makemigrations --check --dry-run
npm --prefix frontend-next run lint -- --max-warnings=0
npm --prefix frontend-next run type-check
```

## Documentação obrigatória

Actualizar documentação no mesmo commit quando:

- Criar aplicação Django nova.
- Criar prefixo API novo.
- Criar serviço de domínio crítico.
- Alterar regra de tenant, RBAC, autenticação ou permissões.
- Alterar contrato de PDF/exportação.
- Alterar settings, middleware, Celery, cache ou base de dados.
- Alterar fluxo financeiro, clínico, farmacêutico, RH, educação ou banco de sangue.

Documentos a actualizar:

- `docs/backend/module_catalog.md` para módulos e responsabilidades.
- `docs/backend/api_contract.md` para endpoints e contratos.
- `docs/backend/data_tenancy.md` para modelos, tenancy e dados.
- `docs/backend/security_operations.md` para segurança, runtime e operação.
- Documento específico em `docs/` quando o módulo já tiver runbook próprio.

## Checklist antes de commit

1. `git status --short` revisto.
2. Alterações pertencem ao mesmo objectivo.
3. `ruff check . --no-fix` verde ou falhas justificadas.
4. Testes focados verdes.
5. `git diff --check` sem erros.
6. Documentação actualizada.
7. Nenhum segredo, token, password ou ficheiro local foi adicionado.
8. Mensagem de commit descreve o resultado, não apenas a actividade.

## Anti-padrões a remover quando encontrados

- ViewSet com regra de negócio longa e sem teste.
- Serializer que aceita `tenant` de payload para utilizador normal.
- Método que altera stock, factura ou estado crítico sem transacção.
- Duplicação de aliases em vários ficheiros.
- `except Exception: pass`.
- `print()` em código de runtime.
- Teste que só verifica status 200 sem validar efeito persistido.
- Função de PDF que só devolve job JSON quando o frontend espera binário.
- Endpoint fora do router sem documentação de motivo.

## Critério de pronto

Uma alteração backend está pronta quando:

- A regra está implementada no dono correcto.
- O contrato API ou operacional está documentado.
- O comportamento crítico tem teste.
- O tenant e as permissões foram considerados.
- A validação local passou.
- O código não aumenta acoplamento sem necessidade.

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Orienta a evolução do backend Django/DRF/Celery, incluindo domínio, API, dados, segurança, tarefas e operação.

**Valor que protege.** Protege regras de negócio, tenant, RBAC, auditoria, compatibilidade de API e previsibilidade das migrações.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir endpoints críticos, migrations, jobs assíncronos, permissões e testes mínimos para tenants piloto.

**Para production-ready.** Exige contratos OpenAPI fiáveis, métricas, alertas, rollback de deploy/migração e validação por production_readiness_check.
