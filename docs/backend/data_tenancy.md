# Dados, Tenancy e Domínio

Actualizado: 2026-05-25

Esta secção documenta como o backend representa dados, aplica multi-tenancy, gere estados e preserva consistência entre módulos.

## Modelos base

Os modelos base vivem em `core/models/base.py` e devem ser preferidos a heranças locais duplicadas.

| Modelo base | Responsabilidade |
|---|---|
| `BaseModel` | Base mínima, aliases legados de nomes de campos e normalização de lookups. |
| `IdentityModel` | Identificador customizado via `IdentifierMixin`. |
| `AuditModel` | Auditoria e versionamento sem soft delete/tenant. |
| `SoftDeleteModel` | Soft delete com `objects` filtrado e `all_objects` completo. |
| `TenantModel` | Base com tenant quando não é necessário o pacote completo de `CoreModel`. |
| `CoreModel` | Modelo principal: nome, identificador, auditoria, versionamento, soft delete e tenant. |
| `InqCoreModel` | Modelo sem tenant, mas com identificador, auditoria, versionamento e soft delete. |
| `NoNameCoreModel` | Modelo tenant-aware sem campo `name`. |

## Mixins centrais

| Mixin | Caminho | Papel |
|---|---|---|
| `IdentifierMixin` | `core/mixins/identifier.py` | Geração e exposição de `custom_id`. |
| `AuditMixin` | `core/mixins/audit.py` | Campos de criação/actualização e autoria. |
| `VersioningMixin` | `core/mixins/versioning.py` | Controlo de versão de registos. |
| `SoftDeleteMixin` | `core/mixins/soft_delete.py` | `deleted`, timestamps e semântica de remoção lógica. |
| `TenantMixin` | `core/mixins/tenant_scope.py` | Associação ao tenant. |
| Mixins de modelo | `core/mixins/model/` | Nome, descrição, código, posição, ordem e timestamp. |

## Managers e QuerySets

`core/models/managers.py` define `QuerySetAtivo`, `ManagerAtivo` e `AllObjectsManager`.

Comportamento esperado:

- `ManagerAtivo.get_queryset()` filtra `deleted=False` quando o modelo tem campo `deleted`.
- `all_objects` deve ser usado para auditoria, admin, recuperação e validações que precisam ver removidos logicamente.
- `ativos()`, `inativos()` e `deletados()` devem adaptar-se aos campos existentes (`ativo`, `active`, `is_active`, `deleted`) sem quebrar modelos mínimos.
- `search()` usa full-text search PostgreSQL quando disponível e fallback seguro para bases não-PostgreSQL.

Regra: nunca usar `objects` quando a regra precisa considerar registos removidos logicamente. Usar `all_objects` explicitamente e justificar no teste.

## Tenant scope

O tenant é resolvido por middleware e disponibilizado na request. O backend deve cumprir estas regras:

- QuerySets de entidades tenant-aware devem ser filtrados pelo tenant da request.
- Em criação e actualização, o tenant deve ser forçado pelo backend para utilizadores normais.
- O cliente não deve conseguir trocar tenant enviando `tenant`, `tenant_id` ou alias equivalente.
- Superuser pode atravessar tenants, mas a política de produção deve usar `SUPERUSER_ALLOWLIST`.
- Endpoints operacionais sem tenant devem documentar explicitamente porque são globais.

## Soft delete

Soft delete é a remoção lógica de registos. A regra padrão é:

- `objects` mostra apenas registos não removidos.
- `all_objects` mostra todos.
- APIs públicas devem esconder removidos salvo endpoint administrativo explícito.
- Relações de histórico, auditoria, facturação e stock podem precisar consultar removidos para manter rastreabilidade.
- Remoção física deve ser rara e reservada a dados temporários, testes ou limpeza operacional controlada.

## Alias de campos

`BaseModel` expõe aliases legados como `nome -> name`, `id_custom -> custom_id`, `inquilino -> tenant`, `deletado -> deleted`. Isto permite compatibilidade sem duplicar colunas.

Regras:

- Preferir nomes canónicos em código novo.
- Aceitar aliases apenas em camadas de compatibilidade controladas.
- Não criar novos aliases sem teste de serializer/queryset.

## Transacções

Operações multi-modelo devem usar transacção quando afectam:

- Stock farmacêutico ou banco de sangue.
- Facturas, pagamentos, recibos ou contabilidade.
- Criação de requisição clínica e resultados derivados.
- Inscrição, avaliação, tentativa de exame ou progressão académica.
- Outbox/eventos que precisam acompanhar uma escrita principal.

Em Django, preferir `transaction.atomic()` no serviço dono do caso de uso. Evitar transacções longas em views.

## Estados de domínio

Estados não devem ser strings soltas sem regra. Sempre que possível:

- Usar `TextChoices` ou enum equivalente.
- Centralizar transições em método de modelo ou serviço.
- Validar transição inválida com `ValidationError` ou erro DRF estruturado.
- Cobrir pelo menos o caminho feliz e uma transição inválida em testes.

Módulos com estado crítico: `bloodbank`, `pharmacy`, `billing`, `payments`, `education`, `clinical`, `equipment_integrations`, `notifications`.

## Migrações

Regras para migrations:

- Não editar migration já aplicada em ambientes partilhados sem plano de rollback.
- Usar `python manage.py makemigrations --check --dry-run` para detectar drift.
- Usar `python manage.py migrate --check` para confirmar estado aplicado.
- Para mudanças de dados, separar schema migration de data migration quando houver risco operacional.
- Nunca depender de SQLite para validar comportamento específico de PostgreSQL, como full-text search, locks ou constraints avançadas.

## Dados sensíveis

Dados clínicos, financeiros, RH e identidade são sensíveis. Regras:

- Não logar payload bruto com dados pessoais ou clínicos.
- Não devolver dados de outro tenant mesmo para IDs válidos.
- Não incluir tokens, passwords, credenciais ou chaves em responses, logs ou exceptions.
- Usar sanitização/redacção em IA, auditoria e monitorização.

## Consistência entre módulos

| Fluxo | Módulos envolvidos | Regra de consistência |
|---|---|---|
| Requisição clínica -> resultado | `clinical`, `tasks/generate_pdf`, `billing` | Resultado deve referenciar paciente, exame e item correctos. |
| Venda/stock farmácia | `pharmacy`, `billing`, `payments`, `accounting` | Movimento de stock e impacto financeiro devem ser atómicos quando acoplados. |
| Facturação com seguradora | `billing`, `insurer`, `payments`, `accounting` | Cobertura/co-pagamento devem ser calculados antes de emissão definitiva. |
| Equipamento -> resultado | `equipment_integrations`, `clinical` | Mensagem externa deve ser validada, mapeada e idempotente. |
| Educação -> avaliação | `education`, `notifications` | Tentativas, notas e progressão devem respeitar calendário e estado anterior. |
| Tenant -> limites | `tenants`, `infrastructure.middleware.limits` | Uso e plano devem bloquear ou alertar antes de exceder limites. |

## Checklist para alterar modelo

1. Confirmar se deve herdar de `CoreModel`, `NoNameCoreModel`, `SoftDeleteModel` ou base específica.
2. Definir tenant, soft delete, índices e constraints.
3. Definir choices/estado com transições claras.
4. Actualizar serializer, ViewSet, admin e filtros.
5. Criar ou actualizar testes de regra e API.
6. Verificar migrations com `makemigrations --check --dry-run` antes de publicar.
7. Actualizar este documento ou `module_catalog.md` se for novo conceito de domínio.

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
