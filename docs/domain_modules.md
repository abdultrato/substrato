# Domain Modules

Este documento resume a organizacao por dominios configurada em
`substrato_os.domain_modules`.

## Principio

As apps Django existentes continuam com os mesmos pacotes, labels e migracoes.
O catalogo de modulos cria uma camada reutilizavel para agrupar dominios,
resolver aliases e registrar `ModuleManifest` no runtime Substrato OS.
Isso evita mover packages como `apps.dental` para `apps/clinical/dentistry`,
porque essa mudanca quebraria imports, app labels e historico de migrations.

Quando um modulo ainda nao tem app Django propria, o catalogo pode marca-lo
como `partial` e apontar para componentes reutilizaveis existentes. O campo
`extends` expressa essa heranca logica entre modulos; no runtime ele tambem
entra como dependencia do `ModuleManifest`.

## Status

- `implemented`: existe app Django ou implementacao Python dedicada.
- `partial`: existe suporte dentro de uma app maior, mas ainda nao e um modulo
  funcionalmente isolado.
- `planned`: lacuna mapeada para futura implementacao.

## Aliases principais

| Modulo solicitado | Modulo configurado | Implementacao |
| --- | --- | --- |
| `identity` | `platform.identity` | `apps.identity` |
| `tenants` | `platform.tenants` | `apps.tenants` |
| `users` | `platform.users` | `apps.identity` |
| `permissions` | `platform.permissions` | `apps.identity` + `security.permissions.rbac` |
| `patients` | `clinical.patients` | `apps.clinical` |
| `appointments` | `clinical.appointments` | `apps.consultations` |
| `encounters` | `clinical.encounters` | `apps.consultations` |
| `electronic_health_records` | `clinical.electronic_health_records` | `apps.medical_records` |
| `dentistry` | `clinical.dentistry` | `apps.dental` |
| `surgery` | `clinical.surgery` | `apps.surgery` |
| `pediatrics` | `clinical.pediatrics` | `apps.consultations` + `apps.medical_records` |
| `gynecology` | `clinical.gynecology` | `apps.maternity` |
| `obstetrics` | `clinical.obstetrics` | `apps.maternity` |
| `cardiology` | `clinical.cardiology` | `apps.consultations` + `apps.specialty_diagnostics` |
| `orthopedics` | `clinical.orthopedics` | `apps.consultations` + `apps.medical_records` |
| `ophthalmology` | `clinical.ophthalmology` | `apps.consultations` + `apps.specialty_diagnostics` |
| `dermatology` | `clinical.dermatology` | `apps.consultations` + `apps.telemedicine` |
| `neurology` | `clinical.neurology` | `apps.consultations` + `apps.specialty_diagnostics` |
| `oncology` | `clinical.oncology` | `apps.consultations` + `apps.medical_records` |
| `pathology` | `clinical.pathology` | `apps.pathology` |
| `laboratory` | `diagnostics.laboratory` | `apps.clinical` |
| `radiology` | `diagnostics.radiology` | `apps.radiology` |
| `blood_bank` | `diagnostics.blood_bank` | `apps.bloodbank` |
| `pharmacy` | `operations.pharmacy` | `apps.pharmacy` |
| `emergency` | `hospitalization.emergency` | `apps.reception` |
| `inpatient_care` | `hospitalization.inpatient_care` | `apps.nursing` |
| `intensive_care` | `hospitalization.intensive_care` | `apps.nursing` |
| `operating_room` | `hospitalization.operating_room` | `apps.surgery` |
| `nursing` | `care.nursing` | `apps.nursing` |
| `physiotherapy` | `care.physiotherapy` | `apps.physiotherapy` |
| `inventory` | `operations.inventory` | `apps.warehouse` |
| `procurement` | `operations.procurement` | `apps.warehouse.domain.purchasing` |
| `insurance` | `administration.insurance` | `apps.insurer` |
| `billing` | `administration.billing` | `apps.billing` |
| `finance` | `administration.finance` | `apps.accounting` |
| `human_resources` | `administration.human_resources` | `apps.human_resources` |
| `payroll` | `administration.payroll` | `apps.human_resources.models.payroll` |
| `analytics` | `analytics.analytics` | `apps.monitoring` |
| `auditing` | `platform.auditing` | `apps.audit_activities` |
| `notifications` | `platform.notifications` | `apps.notifications` |
| `integrations` | `platform.integrations` | `apps.equipment_integrations` + `integrations` |
| `reporting` | `analytics.reporting` | `services.reports` |
| `public_health` | `public_health.public_health` | `apps.public_health` |

## Organizacao logica por dominio

O catalogo exporta `DOMAIN_MODULE_KEYS_BY_DOMAIN` e
`module_definitions_for_domain()` para consumo por menus, marketplace,
permissoes e ferramentas internas.

- `clinical`: pacientes, consultas, prontuario, odontologia, cirurgia,
  ginecologia/obstetricia, especialidades clinicas e patologia.
- `diagnostics`: laboratorio, radiologia, banco de sangue, diagnosticos
  especializados e farmacia clinica.
- `hospitalization`: emergencia, internamento, cuidados intensivos e bloco
  operatorio.
- `care`: enfermagem, fisioterapia e terapia.
- `administration`: financeiro, faturamento, pagamentos, seguradoras, RH e
  payroll.
- `operations`: inventario, compras, farmacia, equipamentos, manutencoes,
  inspecoes, incidentes e transporte.
- `platform`: identidade, tenants, permissoes, auditoria, notificacoes e
  integracoes.
- `analytics` e `public_health`: monitoramento/relatorios e saude publica.

## Modulos parciais por reutilizacao

Estes modulos nao possuem app Django dedicada, mas ja estao configurados como
`partial` porque reutilizam recursos existentes:

- especialidades clinicas (`pediatrics`, `cardiology`, `orthopedics`,
  `ophthalmology`, `dermatology`, `neurology`, `oncology`) herdam
  `clinical.appointments` e `clinical.electronic_health_records`; cardiologia,
  neurologia e oftalmologia tambem herdam diagnosticos especializados.
- `hospitalization.emergency` usa check-ins/triagem da recepcao e herda
  encontros clinicos e enfermagem.
- `hospitalization.inpatient_care` e `hospitalization.intensive_care` usam
  alas, camas e internamentos de `apps.nursing`.

## Lacunas planejadas

Ainda nao ha app ou implementacao dedicada para:

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
