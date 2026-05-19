# legacy_schoolar policy

This folder is a temporary migration buffer from the old `schoolar-s` root project.

Rules:
1. Do not add new features here.
2. Do not reintroduce separate auth/users/middleware/infra stacks.
3. Extract domain logic incrementally into:
   - `apps/education/`
   - `services/education/`
   - `frontend-next/app/education/`
4. Delete legacy slices only after parity tests pass in Substrato runtime.
