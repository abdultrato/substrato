from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
import sqlite3
from typing import Any
from uuid import uuid4


class CloudControlPlaneError(RuntimeError):
    pass


@dataclass(frozen=True, slots=True)
class CloudCluster:
    cluster_id: str
    region: str
    control_plane_endpoint: str
    status: str
    metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ClusterNode:
    cluster_id: str
    node_id: str
    node_role: str
    assigned_at: datetime


@dataclass(frozen=True, slots=True)
class ModuleDeployment:
    deployment_id: str
    cluster_id: str
    module_key: str
    module_version: str
    desired_replicas: int
    ready_replicas: int
    strategy: str
    status: str
    last_error: str | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class RolloutAction:
    deployment_id: str
    cluster_id: str
    module_key: str
    module_version: str
    action: str
    replica_ordinal: int


@dataclass(frozen=True, slots=True)
class ClusterFailoverResult:
    source_cluster_id: str
    target_cluster_id: str
    migrated_deployments: int
    tasks_enqueued: int
    source_status: str
    target_status: str


class SQLiteCloudControlPlane:
    """
    Cluster registry and edge orchestration control-plane persisted in SQLite.
    """

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        self._ensure_schema()

    def register_cluster(
        self,
        *,
        cluster_id: str,
        region: str,
        control_plane_endpoint: str = "",
        status: str = "active",
        metadata: dict[str, Any] | None = None,
    ) -> CloudCluster:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            existing = conn.execute(
                """
                SELECT created_at
                FROM substrato_cloud_clusters
                WHERE cluster_id = ?
                """,
                (cluster_id,),
            ).fetchone()
            created_at = existing["created_at"] if existing else now
            conn.execute(
                """
                INSERT OR REPLACE INTO substrato_cloud_clusters (
                    cluster_id,
                    region,
                    control_plane_endpoint,
                    status,
                    metadata_json,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    cluster_id,
                    region,
                    control_plane_endpoint,
                    status,
                    json.dumps(metadata or {}),
                    created_at,
                    now,
                ),
            )
        cluster = self.get_cluster(cluster_id)
        if cluster is None:
            raise CloudControlPlaneError(f"Falha ao registrar cluster={cluster_id}")
        return cluster

    def set_cluster_status(self, cluster_id: str, status: str) -> bool:
        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            result = conn.execute(
                """
                UPDATE substrato_cloud_clusters
                SET status = ?, updated_at = ?
                WHERE cluster_id = ?
                """,
                (status, now, cluster_id),
            )
        return result.rowcount > 0

    def get_cluster(self, cluster_id: str) -> CloudCluster | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    cluster_id,
                    region,
                    control_plane_endpoint,
                    status,
                    metadata_json,
                    created_at,
                    updated_at
                FROM substrato_cloud_clusters
                WHERE cluster_id = ?
                """,
                (cluster_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_cluster(row)

    def list_clusters(self, *, status: str | None = None) -> list[CloudCluster]:
        where_clause = "WHERE status = ?" if status is not None else ""
        params: tuple[Any, ...] = (status,) if status is not None else ()
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    cluster_id,
                    region,
                    control_plane_endpoint,
                    status,
                    metadata_json,
                    created_at,
                    updated_at
                FROM substrato_cloud_clusters
                {where_clause}
                ORDER BY cluster_id ASC
                """,
                params,
            ).fetchall()
        return [self._row_to_cluster(row) for row in rows]

    def assign_node(
        self,
        *,
        cluster_id: str,
        node_id: str,
        node_role: str = "worker",
    ) -> ClusterNode:
        if self.get_cluster(cluster_id) is None:
            raise CloudControlPlaneError(f"Cluster not found: {cluster_id}")
        assigned_at = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            conn.execute(
                """
                INSERT OR REPLACE INTO substrato_cloud_cluster_nodes (
                    cluster_id,
                    node_id,
                    node_role,
                    assigned_at
                ) VALUES (?, ?, ?, ?)
                """,
                (cluster_id, node_id, node_role, assigned_at),
            )
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT cluster_id, node_id, node_role, assigned_at
                FROM substrato_cloud_cluster_nodes
                WHERE cluster_id = ? AND node_id = ?
                """,
                (cluster_id, node_id),
            ).fetchone()
        if row is None:
            raise CloudControlPlaneError(f"Falha ao associar node={node_id} cluster={cluster_id}")
        return self._row_to_cluster_node(row)

    def list_cluster_nodes(self, cluster_id: str) -> list[ClusterNode]:
        with self._connection() as conn:
            rows = conn.execute(
                """
                SELECT cluster_id, node_id, node_role, assigned_at
                FROM substrato_cloud_cluster_nodes
                WHERE cluster_id = ?
                ORDER BY node_id ASC
                """,
                (cluster_id,),
            ).fetchall()
        return [self._row_to_cluster_node(row) for row in rows]

    def deploy_module(
        self,
        *,
        cluster_id: str,
        module_key: str,
        module_version: str,
        desired_replicas: int,
        strategy: str = "rolling",
    ) -> ModuleDeployment:
        cluster = self.get_cluster(cluster_id)
        if cluster is None:
            raise CloudControlPlaneError(f"Cluster not found: {cluster_id}")

        now = datetime.now(tz=UTC).isoformat()
        safe_desired = max(1, int(desired_replicas))
        with self._connection() as conn:
            existing = conn.execute(
                """
                SELECT deployment_id, module_version, desired_replicas
                FROM substrato_cloud_module_deployments
                WHERE cluster_id = ? AND module_key = ?
                """,
                (cluster_id, module_key),
            ).fetchone()
            if existing is None:
                deployment_id = str(uuid4())
                conn.execute(
                    """
                    INSERT INTO substrato_cloud_module_deployments (
                        deployment_id,
                        cluster_id,
                        module_key,
                        module_version,
                        desired_replicas,
                        ready_replicas,
                        strategy,
                        status,
                        last_error,
                        created_at,
                        updated_at
                    ) VALUES (?, ?, ?, ?, ?, 0, ?, 'rolling_out', NULL, ?, ?)
                    """,
                    (
                        deployment_id,
                        cluster_id,
                        module_key,
                        module_version,
                        safe_desired,
                        strategy,
                        now,
                        now,
                    ),
                )
            else:
                deployment_id = existing["deployment_id"]
                version_changed = existing["module_version"] != module_version
                conn.execute(
                    """
                    UPDATE substrato_cloud_module_deployments
                    SET module_version = ?,
                        desired_replicas = ?,
                        strategy = ?,
                        status = CASE
                            WHEN status = 'completed' THEN 'rolling_out'
                            ELSE status
                        END,
                        ready_replicas = CASE
                            WHEN ? THEN 0
                            ELSE ready_replicas
                        END,
                        last_error = NULL,
                        updated_at = ?
                    WHERE deployment_id = ?
                    """,
                    (
                        module_version,
                        safe_desired,
                        strategy,
                        1 if version_changed else 0,
                        now,
                        deployment_id,
                    ),
                )

        deployment = self.get_deployment(deployment_id)
        if deployment is None:
            raise CloudControlPlaneError("Falha ao persistir deployment")
        return deployment

    def get_deployment(self, deployment_id: str) -> ModuleDeployment | None:
        with self._connection() as conn:
            row = conn.execute(
                """
                SELECT
                    deployment_id,
                    cluster_id,
                    module_key,
                    module_version,
                    desired_replicas,
                    ready_replicas,
                    strategy,
                    status,
                    last_error,
                    created_at,
                    updated_at
                FROM substrato_cloud_module_deployments
                WHERE deployment_id = ?
                """,
                (deployment_id,),
            ).fetchone()
        if row is None:
            return None
        return self._row_to_deployment(row)

    def list_deployments(
        self,
        *,
        cluster_id: str | None = None,
        status: str | None = None,
    ) -> list[ModuleDeployment]:
        clauses: list[str] = []
        params: list[Any] = []
        if cluster_id is not None:
            clauses.append("cluster_id = ?")
            params.append(cluster_id)
        if status is not None:
            clauses.append("status = ?")
            params.append(status)
        where_clause = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        with self._connection() as conn:
            rows = conn.execute(
                f"""
                SELECT
                    deployment_id,
                    cluster_id,
                    module_key,
                    module_version,
                    desired_replicas,
                    ready_replicas,
                    strategy,
                    status,
                    last_error,
                    created_at,
                    updated_at
                FROM substrato_cloud_module_deployments
                {where_clause}
                ORDER BY created_at ASC
                """,
                tuple(params),
            ).fetchall()
        return [self._row_to_deployment(row) for row in rows]

    def report_deployment_progress(
        self,
        *,
        deployment_id: str,
        ready_replicas: int,
        status: str | None = None,
        last_error: str | None = None,
    ) -> ModuleDeployment:
        deployment = self.get_deployment(deployment_id)
        if deployment is None:
            raise CloudControlPlaneError(f"Deployment not found: {deployment_id}")

        safe_ready = max(0, int(ready_replicas))
        inferred_status = status
        if inferred_status is None:
            if safe_ready >= deployment.desired_replicas:
                inferred_status = "completed"
            elif safe_ready == 0:
                inferred_status = "rolling_out"
            else:
                inferred_status = "rolling_out"

        now = datetime.now(tz=UTC).isoformat()
        with self._connection() as conn:
            conn.execute(
                """
                UPDATE substrato_cloud_module_deployments
                SET ready_replicas = ?,
                    status = ?,
                    last_error = ?,
                    updated_at = ?
                WHERE deployment_id = ?
                """,
                (safe_ready, inferred_status, last_error, now, deployment_id),
            )
        updated = self.get_deployment(deployment_id)
        if updated is None:
            raise CloudControlPlaneError("Falha ao atualizar deployment")
        return updated

    def plan_rollout_actions(self, deployment_id: str) -> list[RolloutAction]:
        deployment = self.get_deployment(deployment_id)
        if deployment is None:
            raise CloudControlPlaneError(f"Deployment not found: {deployment_id}")
        if deployment.status in {"failed", "paused"}:
            return []
        actions: list[RolloutAction] = []
        if deployment.ready_replicas < deployment.desired_replicas:
            for ordinal in range(deployment.ready_replicas + 1, deployment.desired_replicas + 1):
                actions.append(
                    RolloutAction(
                        deployment_id=deployment.deployment_id,
                        cluster_id=deployment.cluster_id,
                        module_key=deployment.module_key,
                        module_version=deployment.module_version,
                        action="start_replica",
                        replica_ordinal=ordinal,
                    )
                )
        elif deployment.ready_replicas > deployment.desired_replicas:
            for ordinal in range(deployment.ready_replicas, deployment.desired_replicas, -1):
                actions.append(
                    RolloutAction(
                        deployment_id=deployment.deployment_id,
                        cluster_id=deployment.cluster_id,
                        module_key=deployment.module_key,
                        module_version=deployment.module_version,
                        action="stop_replica",
                        replica_ordinal=ordinal,
                    )
                )
        return actions

    def _connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.database_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_schema(self) -> None:
        with self._connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_cloud_clusters (
                    cluster_id TEXT PRIMARY KEY,
                    region TEXT NOT NULL,
                    control_plane_endpoint TEXT NOT NULL,
                    status TEXT NOT NULL,
                    metadata_json TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_cloud_cluster_nodes (
                    cluster_id TEXT NOT NULL,
                    node_id TEXT NOT NULL,
                    node_role TEXT NOT NULL,
                    assigned_at TEXT NOT NULL,
                    PRIMARY KEY (cluster_id, node_id)
                )
                """
            )
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS substrato_cloud_module_deployments (
                    deployment_id TEXT PRIMARY KEY,
                    cluster_id TEXT NOT NULL,
                    module_key TEXT NOT NULL,
                    module_version TEXT NOT NULL,
                    desired_replicas INTEGER NOT NULL,
                    ready_replicas INTEGER NOT NULL DEFAULT 0,
                    strategy TEXT NOT NULL,
                    status TEXT NOT NULL,
                    last_error TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    UNIQUE(cluster_id, module_key)
                )
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_cloud_clusters_status
                    ON substrato_cloud_clusters(status, region)
                """
            )
            conn.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_substrato_cloud_module_deployments_status
                    ON substrato_cloud_module_deployments(status, cluster_id)
                """
            )

    def _row_to_cluster(self, row: sqlite3.Row) -> CloudCluster:
        return CloudCluster(
            cluster_id=row["cluster_id"],
            region=row["region"],
            control_plane_endpoint=row["control_plane_endpoint"],
            status=row["status"],
            metadata=json.loads(row["metadata_json"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )

    def _row_to_cluster_node(self, row: sqlite3.Row) -> ClusterNode:
        return ClusterNode(
            cluster_id=row["cluster_id"],
            node_id=row["node_id"],
            node_role=row["node_role"],
            assigned_at=datetime.fromisoformat(row["assigned_at"]),
        )

    def _row_to_deployment(self, row: sqlite3.Row) -> ModuleDeployment:
        return ModuleDeployment(
            deployment_id=row["deployment_id"],
            cluster_id=row["cluster_id"],
            module_key=row["module_key"],
            module_version=row["module_version"],
            desired_replicas=int(row["desired_replicas"]),
            ready_replicas=int(row["ready_replicas"]),
            strategy=row["strategy"],
            status=row["status"],
            last_error=row["last_error"],
            created_at=datetime.fromisoformat(row["created_at"]),
            updated_at=datetime.fromisoformat(row["updated_at"]),
        )
