# Notificações (`apps/notifications`)

Documenta notificações enviadas e logs de envio, com endpoints REST em `api/v1/notifications`.

## Domínio
- `Notification`: representa uma mensagem a ser enviada (email/SMS/WhatsApp) para um destinatário, opcionalmente associada a um paciente.
- `DeliveryLog`: registros de tentativas/respostas de envio para uma notificação.
- Prefixos: não definidos (modelo não herda CoreModel), IDs padrão do Django.

## Modelos
- `Notification`
  - Campos: `patient` (FK opcional), `recipient`, `channel` (`email`, `sms`, `whatsapp`), `subject`, `event_type` (ex.: `RESET_SENHA`, `RESULTADO`), `external_reference`, `message`, `sent` (bool), `send_error`, `sent_at`, `created_at`.
  - Índices: `channel`, `event_type`, `sent`, `external_reference`. Ordenação padrão: `-created_at`.
- `DeliveryLog`
  - Campos: `notification` (FK), `status`, `response`, `created_at`.
  - Índices: (`notification`, `created_at`), `status`. Ordenação padrão: `-created_at`.

## API
Base: `/api/v1/notifications/`

### Endpoints
- `/notification/` — CRUD de notificações.
- `/logenvio/` — CRUD de logs de envio.

### Serialização
- `NotificationSerializer`, `DeliveryLogSerializer` (`fields="__all__"`).

### Filtros
- `NotificationFilter`: `recipient`, `channel`, `message`, `sent`, `created_at`.
- `DeliveryLogFilter`: `notification`, `status`, `response`, `created_at`.

### Busca (`search_fields`)
- Notification: `recipient`, `channel`, `message`.
- DeliveryLog: `status`, `response`.

### Ordenação (`ordering_fields`)
- Notification: `recipient`, `channel`, `message`, `sent`, `created_at` (padrão `-created_at`).
- DeliveryLog: `notification`, `status`, `response`, `created_at` (padrão `-created_at`).

### Segurança
- `IsAuthenticated` + escopo multi-tenant via `TenantScopedQuerysetMixin` (apesar de modelos não herdarem CoreModel).
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

## Exemplos rápidos
- Notificações enviadas por SMS ontem:  
  `GET /api/v1/notifications/notification/?channel=sms&sent=true&created_at__date=2026-03-30`
- Logs de envio com falha:  
  `GET /api/v1/notifications/logenvio/?status=failed`
