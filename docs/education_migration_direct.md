# Direct migration: Schoolar-S -> Substrato Education

## Product context

The `schoolar-s` merge changes Substrato's product boundary: Substrato must be documented and maintained as a multi-platform SaaS, not as a healthcare-only system. Education is now a first-class domain beside healthcare, ERP/WMS, finance, HR, monitoring and operational AI.

## Applied in this rollout

1. Created bounded context `apps/education`.
2. Added centralized API routes under `/api/v1/education/*`.
3. Enabled role-aware access for `Professor`, `Estudante` and school leadership flows with single login.
4. Added unified frontend routes:
   - `/education`
   - `/education/student`
   - `/education/teacher`
   - `/education/directoria`
5. Legacy module `apps/education/legacy_schoolar/` decommissioned and removed.

## Critical precautions

1. Keep identity centralized:
   - Never create parallel user tables.
   - Link education records to the shared `User` model.

2. Keep domain isolation:
   - No direct imports from healthcare models.
   - Integrate only via services/contracts/events.

3. Keep infrastructure centralized:
   - Do not introduce separate auth/middleware/logging in legacy code paths.
   - Reuse `platform`, `security`, `infrastructure`, and `shared/storage`.

4. Keep education runtime clean:
   - Do not reintroduce legacy code paths.
   - New features must be implemented in `apps/education` and `frontend-next`.

5. Preserve observability:
   - Publish education domain events.
   - Route failures to central monitoring.

## Immediate next migration cuts

1. Move schoolar domain workflows from legacy into `apps/education` services.
2. Remove duplicate auth/users/middleware from legacy path.
3. Rewrite frontend workflows in `frontend-next/app/education/*`.
4. Keep migration parity checks active with `education_migration_audit`.
