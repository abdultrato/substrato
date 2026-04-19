# Recursos Humanos (`apps/human_resources`)

Documenta os modelos de RH e os endpoints REST em `api/v1/human_resources`.

## Domínio
- Gestão de cargos, funcionários e eventos de RH (dependentes, horários, faltas, férias, dispensas, horas extra e folha).
- Todos os modelos herdam `CoreModel`/`NoNameCoreModel` (auditoria, soft delete, `tenant`, `custom_id`).
- Prefixos de IDs: `CRG` (cargo), `FUN` (funcionário), `AGF` (agregado), `HRT` (horário), `FLT` (falta), `FER` (férias), `DSP` (dispensa), `HEX` (hora extra), `FPG` (folha).

## Modelos (resumo)
- `JobTitle`: `name`, `description`, `is_doctor` (flag para filtragem de médicos). Ordenação: `name`.
- `Employee`: `role`, `profession`, `nuit`, `nib`, `document_number`, `email`, `phone`, `admission_date`, `status`, `nominal_salary`, `salary_increase`, `base_month_hours`. Índices por `status`, `role`, `nuit`, `document_number`.
- `FamilyDependent`: `employee`, `relationship`, `birth_date`, `phone`, `lives_with_employee`, `notes`.
- `WorkSchedule`: `employee`, `weekday` (0-6), `start_time`, `end_time`, `active`.
- `Absence`: `employee`, `date`, `reason`, `justified`.
- `Vacation`: `employee`, `start_date`, `end_date`, `status`, `notes`.
- `Termination`: `employee`, `date`, `type`, `reason`.
- `Overtime`: `employee`, `date`, `hours`, `multiplier`, `notes`.
- `Payroll`: `employee`, `year`, `month`, `nominal_salary`, `base_month_hours`, `overtime_hour_multiplier`, `calculated_overtime_hours`, `hourly_value`, `overtime_value`, `total_salary`, `closed`. Constraint único: `(tenant, employee, year, month)`.

## API
Base: `/api/v1/human_resources/`

### Endpoints (CRUD padrão DRF)
- `/role/` — cargos.
- `/employee/` — funcionários.
- `/agregadofamiliar/` — dependentes.
- `/horario/` — horários de trabalho.
- `/falta/` — faltas.
- `/ferias/` — férias.
- `/dispensa/` — desligamentos.
- `/horaextra/` — horas extra.
- `/folhapagamento/` — folhas.
Suporta `GET`, `POST`, `GET {id}`, `PUT/PATCH {id}`, `DELETE {id}` (soft delete via modelo base).

### Serializers
- `JobTitleSerializer`, `EmployeeSerializer`, `FamilyDependentSerializer`, `WorkScheduleSerializer`, `AbsenceSerializer`, `VacationSerializer`, `TerminationSerializer`, `OvertimeSerializer`, `PayrollSerializer`.
- Campos somente leitura: `custom_id`, `tenant`, auditoria e soft delete (em todos). Para `Payroll`, também `calculated_overtime_hours`, `hourly_value`, `overtime_value`, `total_salary`.

### Filtros (FilterSet)
- `role`: `name`, `created_at`
- `employee`: `role`, `profession`, `status`, `admission_date`, `created_at`
- `agregadofamiliar`: `employee`, `relationship`, `lives_with_employee`, `created_at`
- `horario`: `employee`, `weekday`, `active`
- `falta`: `employee`, `date`, `justified`
- `ferias`: `employee`, `status`, `start_date`
- `dispensa`: `employee`, `type`, `date`
- `horaextra`: `employee`, `date`
- `folhapagamento`: `employee`, `year`, `month`, `closed`

### Busca (`search_fields`)
- `role`: `custom_id`, `name`
- `employee`: `custom_id`, `name`, `profession`, `email`, `phone`
- `agregadofamiliar`: `custom_id`, `name`, `employee__name`
Demais viewsets não definem busca.

### Ordenação (`ordering_fields`)
- `role`: `name`, `created_at` (padrão `name`)
- `employee`: `name`, `profession`, `admission_date`, `status`, `created_at` (padrão `name`)
- `agregadofamiliar`: `name`, `relationship`, `created_at` (padrão `name`)
- `horario`: `employee`, `weekday`, `start_time` (padrão idem)
- `falta`: `date`, `created_at` (padrão `-date`, `-created_at`)
- `ferias`: `start_date`, `status`, `created_at` (padrão `-start_date`, `-created_at`)
- `dispensa`: `date`, `type`, `created_at` (padrão `-date`, `-created_at`)
- `horaextra`: `date`, `created_at` (padrão `-date`, `-created_at`)
- `folhapagamento`: `year`, `month`, `created_at`, `closed` (padrão `-year`, `-month`, `-created_at`)

### Segurança
- `IsAuthenticated` em todos os viewsets + escopo multi-tenant via `TenantScopedQuerysetMixin`.
- RBAC aplicado no roteamento dinâmico (`api.v1.routing.routes.register_routes`).

### Admin
- Telas registradas para todos os modelos, com filtros e buscas por ID amigável, status e campos chave (ex.: `status` de funcionário, `is_doctor` em cargo, datas em férias/dispensa, `closed` em folha).

## Exemplos rápidos
- Listar médicos ativos: `GET /api/v1/human_resources/employee/?role__is_doctor=true&status=ATIVO`
- Buscar dependentes pelo nome do funcionário: `GET /api/v1/human_resources/agregadofamiliar/?search=Silva`
- Férias aprovadas ordenadas por início desc: `GET /api/v1/human_resources/ferias/?status=APROV&ordering=-start_date`
- Folha de março/2026 de um funcionário: `GET /api/v1/human_resources/folhapagamento/?employee=ID&year=2026&month=3`
