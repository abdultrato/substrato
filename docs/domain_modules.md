# Domain Modules

Este documento resume a organizacao por dominios configurada em
`substrato_os.domain_modules`.

## Principio

As apps Django existentes continuam com os mesmos pacotes, labels e migracoes.
O catalogo de modulos cria uma camada reutilizavel para agrupar dominios,
resolver aliases e registrar `ModuleManifest` no runtime Substrato OS.

## Status

- `implemented`: existe app Django ou implementacao Python dedicada.
- `partial`: existe suporte dentro de uma app maior, mas ainda nao e um modulo
  funcionalmente isolado.
- `planned`: lacuna mapeada para futura implementacao.

## Aliases principais

| Modulo solicitado | Modulo configurado | Implementacao |
| --- | --- | --- |
| `patients` | `clinical.patients` | `apps.clinical` |
| `appointments` | `clinical.appointments` | `apps.consultations` |
| `encounters` | `clinical.encounters` | `apps.consultations` |
| `electronic_health_records` | `clinical.electronic_health_records` | `apps.medical_records` |
| `dentistry` | `clinical.dentistry` | `apps.dental` |
| `laboratory` | `diagnostics.laboratory` | `apps.clinical` |
| `blood_bank` | `diagnostics.blood_bank` | `apps.bloodbank` |
| `insurance` | `administration.insurance` | `apps.insurer` |
| `finance` | `administration.finance` | `apps.accounting` |
| `payroll` | `administration.payroll` | `apps.human_resources.models.payroll` |
| `auditing` | `platform.auditing` | `apps.audit_activities` |
| `reporting` | `analytics.reporting` | `services.reports` |

## Lacunas planejadas

Ainda nao ha app ou implementacao dedicada para:

- `clinical.pediatrics`
- `clinical.cardiology`
- `clinical.orthopedics`
- `clinical.ophthalmology`
- `clinical.dermatology`
- `clinical.neurology`
- `clinical.oncology`
- `hospitalization.emergency`
- `hospitalization.inpatient_care`
- `hospitalization.intensive_care`
- `care.nutrition`
- `care.psychology`
- `care.social_services`
- `platform.documents`

## Uso

```python
from substrato_os.domain_modules import module_definition_for, register_domain_modules
from substrato_os.modules import ModuleRegistry

definition = module_definition_for("blood_bank")

registry = ModuleRegistry()
register_domain_modules(registry)
```
