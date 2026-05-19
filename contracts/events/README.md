# Event Contracts

Contratos versionados de eventos para integração entre serviços e runtime.

## Versão ativa

- `event-envelope.v1.json`

## Regras

- Todo evento publicado deve respeitar o envelope v1.
- `event_type` deve seguir `<dominio>.<entidade>.<acao>.v<versao>`.
- `tenant_id`, `event_id`, `occurred_at` e `idempotency_key` são obrigatórios.
- Evoluções incompatíveis exigem nova versão de schema (`v2`, `v3`, ...).

