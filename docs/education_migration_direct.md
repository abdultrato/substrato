# Direct migration: Schoolar-S -> Substrato Education

## Applied in this rollout

1. Created bounded context `apps/education`.
2. Added centralized API routes under `/api/v1/education/*`.
3. Enabled role-aware access for `Professor` and `Estudante` with single login.
4. Added unified frontend routes:
   - `/education`
   - `/education/student`
5. Created temporary legacy isolation target:
   - `apps/education/legacy_schoolar/`

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

4. Keep legacy as transitional only:
   - Legacy code is read-only reference.
   - New features must be implemented in `apps/education` and `frontend-next`.

5. Preserve observability:
   - Publish education domain events.
   - Route failures to central monitoring.

## Immediate next migration cuts

1. Move schoolar domain workflows from legacy into `apps/education` services.
2. Remove duplicate auth/users/middleware from legacy path.
3. Rewrite frontend workflows in `frontend-next/app/education/*`.
4. Decommission `legacy_schoolar` incrementally after parity checks.
