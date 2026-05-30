# Event Contracts

Contratos versionados de eventos para integração entre serviços e runtime.

## Versão ativa

- `event-envelope.v1.json`

## Regras

- Todo evento publicado deve respeitar o envelope v1.
- `event_type` deve seguir `<dominio>.<entidade>.<acao>.v<versao>`.
- `tenant_id`, `event_id`, `occurred_at` e `idempotency_key` são obrigatórios.
- Evoluções incompatíveis exigem nova versão de schema (`v2`, `v3`, ...).

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Define contratos de eventos versionados entre serviços, workers e runtime.

**Valor que protege.** Protege integração assíncrona, idempotência, rastreabilidade por tenant e evolução sem consumidores quebrados.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve cobrir envelope v1, nomenclatura, campos obrigatórios, versionamento e consumidores críticos.

**Para production-ready.** Exige validação de schema, compatibilidade retroactiva, DLQ/retry, observabilidade e política de evolução de versões.
