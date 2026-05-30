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

## Alinhamento com beta e produção

**Última revisão documental:** 2026-05-30.

**Propósito no projecto.** Documenta o runtime Rust usado para eventos, cache, módulos e capacidades de alta previsibilidade.

**Valor que protege.** Protege a fronteira entre regras de negócio em Python e componentes de desempenho em Rust.

**Como usar na implementação.**
1. Ler este documento antes de alterar modelos, serializers, viewsets, tarefas, páginas, contratos ou prompts relacionados.
2. Confirmar impacto em tenant, RBAC, auditoria, dados sensíveis, jobs assíncronos, PDFs, eventos e experiência do utilizador.
3. Actualizar testes, schemas, runbooks e documentação no mesmo ciclo da alteração.
4. Registar dívida técnica remanescente com owner, impacto e prazo.

**Até produção beta.** Deve provar bootstrap de módulos, publicação de eventos, cache TTL e replay offline em cenários controlados.

**Para production-ready.** Exige benchmarks, observabilidade, contratos de eventos estáveis, testes de concorrência e política de compatibilidade.
