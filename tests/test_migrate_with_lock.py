import scripts.migrate_with_lock as migrate_with_lock


def test_get_int_env_uses_default_on_invalid(monkeypatch):
    monkeypatch.setenv("SUBSTRATO_MIGRATION_LOCK_ID", "abc")
    assert migrate_with_lock._get_int_env("SUBSTRATO_MIGRATION_LOCK_ID", 42) == 42


def test_main_non_postgres_runs_plain_migrate(monkeypatch):
    monkeypatch.setenv("DB_ENGINE", "sqlite3")

    called = {"count": 0}

    def _fake_run_manage_migrate():
        called["count"] += 1
        return 0

    monkeypatch.setattr(migrate_with_lock, "_run_manage_migrate", _fake_run_manage_migrate)

    assert migrate_with_lock.main() == 0
    assert called["count"] == 1


def test_main_postgres_runs_with_lock(monkeypatch):
    monkeypatch.setenv("DB_ENGINE", "postgres")
    monkeypatch.setattr(migrate_with_lock, "_run_with_advisory_lock", lambda: 0)

    assert migrate_with_lock.main() == 0


def test_main_postgres_handles_lock_failure(monkeypatch):
    monkeypatch.setenv("DB_ENGINE", "postgresql")
    monkeypatch.setattr(
        migrate_with_lock,
        "_run_with_advisory_lock",
        lambda: (_ for _ in ()).throw(RuntimeError("boom")),
    )

    assert migrate_with_lock.main() == 1
