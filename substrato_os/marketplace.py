from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
import json
from pathlib import Path
import sqlite3
from typing import Any

from .modules import MODULE_KEY_PATTERN


class ModuleMarketplaceError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class ModulePackage:
    module_key: str
    version: str
    description: str = ""
    dependencies: tuple[str, ...] = ()
    permissions: tuple[str, ...] = ()
    channel: str = "stable"
    checksum: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    published_at: datetime = field(default_factory=lambda: datetime.now(tz=UTC))

    def __post_init__(self) -> None:
        if not self.module_key or not MODULE_KEY_PATTERN.fullmatch(self.module_key):
            raise ValueError("Module key must match ^[a-z0-9_.-]+$")
        if not self.version:
            raise ValueError("Module version is required")
        if not self.channel:
            raise ValueError("Channel is required")
        for dependency in self.dependencies:
            if not MODULE_KEY_PATTERN.fullmatch(dependency):
                raise ValueError(f"Dependency key must match ^[a-z0-9_.-]+$: {dependency}")


@dataclass(frozen=True, slots=True)
class InstalledModule:
    module_key: str
    version: str
    status: str
    source: str
    installed_at: datetime
    updated_at: datetime


class SQLiteModuleMarketplace:
    """
    Persistent module marketplace with versioned catalog and installation state.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def publish(self, package: ModulePackage) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO substrato_module_marketplace (
                    module_key,
                    version,
                    description,
                    dependencies_json,
                    permissions_json,
                    channel,
                    checksum,
                    metadata_json,
                    published_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    package.module_key,
                    package.version,
                    package.description,
                    json.dumps(package.dependencies),
                    json.dumps(package.permissions),
                    package.channel,
                    package.checksum,
                    json.dumps(package.metadata),
                    package.published_at.isoformat(),
                ),
            )

    def list_packages(self, *, module_key: str | None = None, channel: str | None = None) -> list[ModulePackage]:
        clauses: list[str] = []
        params: list[Any] = []
        if module_key is not None:
            clauses.append("module_key = ?")
            params.append(module_key)
        if channel is not None:
            clauses.append("channel = ?")
            params.append(channel)

        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    module_key,
                    version,
                    description,
                    dependencies_json,
                    permissions_json,
                    channel,
                    checksum,
                    metadata_json,
                    published_at
                FROM substrato_module_marketplace
                {where_clause}
                ORDER BY module_key ASC, version DESC
                """,
                tuple(params),
            ).fetchall()
        packages = [self._row_to_package(row) for row in rows]
        return sorted(
            packages,
            key=lambda package: (package.module_key, self._descending_version_sort_key(package.version)),
        )

    def get_package(self, module_key: str, version: str) -> ModulePackage | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    module_key,
                    version,
                    description,
                    dependencies_json,
                    permissions_json,
                    channel,
                    checksum,
                    metadata_json,
                    published_at
                FROM substrato_module_marketplace
                WHERE module_key = ? AND version = ?
                """,
                (module_key, version),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_package(row)

    def latest_package(self, module_key: str, *, channel: str | None = None) -> ModulePackage | None:
        packages = self.list_packages(module_key=module_key, channel=channel)
        if not packages:
            return None
        return max(packages, key=lambda package: self._version_sort_key(package.version))

    def list_installed(self, *, status: str | None = None) -> list[InstalledModule]:
        where_clause = "WHERE status = ?" if status is not None else ""
        params: tuple[Any, ...] = (status,) if status is not None else ()
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT module_key, version, status, source, installed_at, updated_at
                FROM substrato_module_installations
                {where_clause}
                ORDER BY module_key ASC
                """,
                params,
            ).fetchall()
        return [self._row_to_installed(row) for row in rows]

    def get_installed(self, module_key: str) -> InstalledModule | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT module_key, version, status, source, installed_at, updated_at
                FROM substrato_module_installations
                WHERE module_key = ?
                """,
                (module_key,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_installed(row)

    def install(
        self,
        module_key: str,
        *,
        version: str | None = None,
        channel: str | None = "stable",
        source: str = "marketplace",
    ) -> tuple[InstalledModule, ...]:
        resolved_packages = self._resolve_installation_order(
            module_key=module_key,
            version=version,
            channel=channel,
        )
        installed_modules: list[InstalledModule] = []
        for package in resolved_packages:
            installed_modules.append(
                self._upsert_installed(
                    module_key=package.module_key,
                    version=package.version,
                    status="enabled",
                    source=source,
                )
            )
        return tuple(installed_modules)

    def enable(self, module_key: str) -> bool:
        return self._update_status(module_key=module_key, status="enabled")

    def disable(self, module_key: str) -> bool:
        return self._update_status(module_key=module_key, status="disabled")

    def _update_status(self, *, module_key: str, status: str) -> bool:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            result = conn.execute(
                """
                UPDATE substrato_module_installations
                SET status = ?, updated_at = ?
                WHERE module_key = ?
                """,
                (status, now, module_key),
            )
        return result.rowcount > 0

    def _resolve_installation_order(
        self,
        *,
        module_key: str,
        version: str | None,
        channel: str | None,
    ) -> tuple[ModulePackage, ...]:
        resolved: dict[str, ModulePackage] = {}
        visiting: set[str] = set()

        def resolve(current_key: str, pinned_version: str | None = None) -> None:
            if current_key in resolved:
                return
            if current_key in visiting:
                raise ModuleMarketplaceError(f"Circular dependency in marketplace at module={current_key}")

            package: ModulePackage | None
            if pinned_version is not None:
                package = self.get_package(current_key, pinned_version)
            else:
                package = self.latest_package(current_key, channel=channel)
            if package is None:
                raise ModuleMarketplaceError(
                    f"Module package not found module={current_key} version={pinned_version or 'latest'}"
                )

            visiting.add(current_key)
            for dependency_key in package.dependencies:
                resolve(dependency_key, None)
            visiting.remove(current_key)
            resolved[current_key] = package

        resolve(module_key, version)
        return tuple(resolved.values())

    def _upsert_installed(
        self,
        *,
        module_key: str,
        version: str,
        status: str,
        source: str,
    ) -> InstalledModule:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            existing = conn.execute(
                """
                SELECT installed_at
                FROM substrato_module_installations
                WHERE module_key = ?
                """,
                (module_key,),
            ).fetchone()
            installed_at = existing["installed_at"] if existing else now
            conn.execute(
                """
                INSERT OR REPLACE INTO substrato_module_installations (
                    module_key,
                    version,
                    status,
                    source,
                    installed_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (module_key, version, status, source, installed_at, now),
            )

        installed = self.get_installed(module_key)
        if installed is None:
            raise ModuleMarketplaceError(f"Failed to persist installation for module={module_key}")
        return installed

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_module_marketplace (
                    module_key TEXT NOT NULL,
                    version TEXT NOT NULL,
                    description TEXT NOT NULL,
                    dependencies_json TEXT NOT NULL,
                    permissions_json TEXT NOT NULL,
                    channel TEXT NOT NULL,
                    checksum TEXT NULL,
                    metadata_json TEXT NOT NULL,
                    published_at TEXT NOT NULL,
                    PRIMARY KEY (module_key, version)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_module_installations (
                    module_key TEXT PRIMARY KEY,
                    version TEXT NOT NULL,
                    status TEXT NOT NULL,
                    source TEXT NOT NULL,
                    installed_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_module_marketplace_channel
                    ON substrato_module_marketplace(channel, module_key)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_module_installations_status
                    ON substrato_module_installations(status)
                """
            )

    def _row_to_package(self, row: sqlite3.Row) -> ModulePackage:
        return ModulePackage(
            module_key=row["module_key"],
            version=row["version"],
            description=row["description"],
            dependencies=tuple(json.loads(row["dependencies_json"])),
            permissions=tuple(json.loads(row["permissions_json"])),
            channel=row["channel"],
            checksum=row["checksum"],
            metadata=json.loads(row["metadata_json"]),
            published_at=datetime.fromisoformat(row["published_at"]),
        )

    def _row_to_installed(self, row: sqlite3.Row) -> InstalledModule:
        return InstalledModule(
            module_key=row["module_key"],
            version=row["version"],
            status=row["status"],
            source=row["source"],
            installed_at=datetime.fromisoformat(row["installed_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def _version_sort_key(self, version: str) -> tuple[int, ...]:
        numeric_chunks: list[int] = []
        for token in version.replace("-", ".").split("."):
            if token.isdigit():
                numeric_chunks.append(int(token))
            else:
                numeric_chunks.append(0)
        return tuple(numeric_chunks)

    def _descending_version_sort_key(self, version: str) -> tuple[int, ...]:
        return tuple(-value for value in self._version_sort_key(version))
