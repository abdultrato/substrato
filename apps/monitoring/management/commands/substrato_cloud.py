from __future__ import annotations

from django.core.management.base import BaseCommand, CommandError

from events.runtime_bridge import get_runtime, runtime_enabled


class Command(BaseCommand):
    help = "Opera o control-plane cloud do SUBSTRATO OS (clusters, deployments, rollout e failover)."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "action",
            choices=[
                "register-cluster",
                "list-clusters",
                "assign-node",
                "list-nodes",
                "deploy-module",
                "list-deployments",
                "reconcile-deployment",
                "report-progress",
                "failover-cluster",
            ],
        )
        parser.add_argument("--cluster-id", type=str)
        parser.add_argument("--region", type=str)
        parser.add_argument("--endpoint", type=str, default="")
        parser.add_argument("--cluster-status", type=str)
        parser.add_argument("--node-id", type=str)
        parser.add_argument("--node-role", type=str, default="worker")
        parser.add_argument("--node-region", type=str)
        parser.add_argument("--module-key", type=str)
        parser.add_argument("--module-version", type=str)
        parser.add_argument("--desired-replicas", type=int, default=1)
        parser.add_argument("--strategy", type=str, default="rolling")
        parser.add_argument("--deployment-id", type=str)
        parser.add_argument("--ready-replicas", type=int)
        parser.add_argument("--deployment-status", type=str)
        parser.add_argument("--source-cluster-id", type=str)
        parser.add_argument("--target-cluster-id", type=str)
        parser.add_argument("--queue-name", type=str, default="cloud.rollout")
        parser.add_argument("--lease-seconds", type=int, default=60)
        parser.add_argument(
            "--force",
            action="store_true",
            help="Executa mesmo com SUBSTRATO_OS_RUNTIME_ENABLED=false.",
        )

    def handle(self, *args, **options):
        if not runtime_enabled(force=options["force"]):
            self.stdout.write(
                self.style.WARNING(
                    "SUBSTRATO OS runtime desativado. Use --force para operação manual."
                )
            )
            return

        runtime = get_runtime()
        action = options["action"]

        if action == "register-cluster":
            cluster_id = self._required(options, "cluster_id")
            region = self._required(options, "region")
            cluster = runtime.register_cloud_cluster(
                cluster_id=cluster_id,
                region=region,
                control_plane_endpoint=options["endpoint"],
                status=options["cluster_status"] or "active",
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Cluster registrado cluster_id={cluster.cluster_id} region={cluster.region} status={cluster.status}"
                )
            )
            return

        if action == "list-clusters":
            clusters = runtime.list_cloud_clusters(status=options.get("cluster_status"))
            if not clusters:
                self.stdout.write("Nenhum cluster encontrado.")
                return
            for cluster in clusters:
                self.stdout.write(
                    f"{cluster.cluster_id} region={cluster.region} status={cluster.status} endpoint={cluster.control_plane_endpoint}"
                )
            return

        if action == "assign-node":
            cluster_id = self._required(options, "cluster_id")
            node_id = self._required(options, "node_id")
            node_region = options.get("node_region")
            if node_region:
                runtime.register_edge_node(
                    node_id=node_id,
                    region=node_region,
                    role=options["node_role"],
                )
            assignment = runtime.assign_edge_node_to_cluster(
                cluster_id=cluster_id,
                node_id=node_id,
                node_role=options["node_role"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Node associado cluster_id={assignment.cluster_id} node_id={assignment.node_id} role={assignment.node_role}"
                )
            )
            return

        if action == "list-nodes":
            cluster_id = self._required(options, "cluster_id")
            nodes = runtime.list_cluster_nodes(cluster_id)
            if not nodes:
                self.stdout.write(f"Nenhum node associado ao cluster={cluster_id}.")
                return
            for node in nodes:
                self.stdout.write(f"{node.node_id} role={node.node_role} assigned_at={node.assigned_at.isoformat()}")
            return

        if action == "deploy-module":
            cluster_id = self._required(options, "cluster_id")
            module_key = self._required(options, "module_key")
            module_version = self._required(options, "module_version")
            deployment = runtime.deploy_module_to_cluster(
                cluster_id=cluster_id,
                module_key=module_key,
                module_version=module_version,
                desired_replicas=options["desired_replicas"],
                strategy=options["strategy"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Deployment criado deployment_id={deployment.deployment_id} status={deployment.status}"
                )
            )
            return

        if action == "list-deployments":
            deployments = runtime.list_cluster_deployments(
                cluster_id=options.get("cluster_id"),
                status=options.get("deployment_status"),
            )
            if not deployments:
                self.stdout.write("Nenhum deployment encontrado.")
                return
            for deployment in deployments:
                self.stdout.write(

                        f"{deployment.deployment_id} "
                        f"cluster={deployment.cluster_id} "
                        f"module={deployment.module_key}:{deployment.module_version} "
                        f"ready={deployment.ready_replicas}/{deployment.desired_replicas} "
                        f"status={deployment.status}"

                )
            return

        if action == "reconcile-deployment":
            deployment_id = self._required(options, "deployment_id")
            queued = runtime.reconcile_cluster_deployment(
                deployment_id,
                queue_name=options["queue_name"],
                lease_seconds=options["lease_seconds"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Reconciliação concluída deployment_id={deployment_id} tasks_enqueued={len(queued)}"
                )
            )
            return

        if action == "report-progress":
            deployment_id = self._required(options, "deployment_id")
            ready_replicas = options.get("ready_replicas")
            if ready_replicas is None:
                raise CommandError("--ready-replicas é obrigatório para report-progress")
            deployment = runtime.report_cluster_deployment_progress(
                deployment_id=deployment_id,
                ready_replicas=ready_replicas,
                status=options.get("deployment_status"),
            )
            self.stdout.write(
                self.style.SUCCESS(
                    f"Progresso atualizado deployment_id={deployment.deployment_id} status={deployment.status} "
                    f"ready={deployment.ready_replicas}/{deployment.desired_replicas}"
                )
            )
            return

        if action == "failover-cluster":
            source_cluster_id = self._required(options, "source_cluster_id")
            result = runtime.auto_failover_cluster(
                source_cluster_id,
                target_cluster_id=options.get("target_cluster_id"),
                queue_name=options["queue_name"],
                lease_seconds=options["lease_seconds"],
            )
            self.stdout.write(
                self.style.SUCCESS(
                    "Failover concluído "
                    f"source={result.source_cluster_id} "
                    f"target={result.target_cluster_id} "
                    f"migrated={result.migrated_deployments} "
                    f"tasks_enqueued={result.tasks_enqueued}"
                )
            )
            return

    def _required(self, options: dict, key: str) -> str:
        value = options.get(key)
        if value in (None, ""):
            raise CommandError(f"--{key.replace('_', '-')} é obrigatório para esta ação")
        return str(value)
