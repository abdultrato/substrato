# Substrato Runtime (Rust)

Núcleo Rust para SUBSTRATO OS com foco em:

- registro modular por app
- cache TTL com limpeza/evicção automática
- barramento de eventos in-memory com subscribers por tópico e wildcard
- fila offline para replay de eventos

## Estrutura

- `src/module.rs`: registro de módulos, dependências e ordem de carga.
- `src/cache.rs`: `AutoCache` com gerenciamento automático de memória (TTL + limite de entradas).
- `src/events.rs`: `EventEnvelope` e `EventBus`.
- `src/runtime.rs`: composição do runtime (`SubstratoRuntime`).
- `src/apps/*.rs`: descritores de cada app de domínio.

## Apps implementadas

- accounting
- audit_activities
- billing
- bloodbank
- clinical
- consultations
- equipment
- equipment_integrations
- external_entities
- human_resources
- identity
- incidents
- inspections
- insurer
- maintenance
- maternity
- medical_records
- monitoring
- notifications
- nursing
- payments
- pharmacy
- reception
- surgery
- tenants

## Uso básico

```rust
use serde_json::json;
use substrato_runtime::SubstratoRuntime;

let runtime = SubstratoRuntime::new();
runtime.bootstrap()?;

runtime.publish(
    "billing.invoice.issued",
    "billing",
    json!({"invoice_id": "INV-001", "total": 1200}),
    Some("tenant-a".to_string()),
);

runtime.cache_put("apps.billing", "invoice:INV-001", json!({"status": "issued"}));
let cached = runtime.cache_get("apps.billing", "invoice:INV-001");
```
