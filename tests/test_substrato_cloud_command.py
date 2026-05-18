from __future__ import annotations

from io import StringIO

from django.core.management import call_command
import pytest

from events.runtime_bridge import get_runtime, reset_runtime_bridge


@pytest.fixture(autouse=True)
def _reset_runtime_bridge_fixture():
    reset_runtime_bridge()
    yield
    reset_runtime_bridge()


def test_substrato_cloud_command_warns_when_runtime_disabled(settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = False
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "cloud-command.sqlite3")

    stdout = StringIO()
    call_command("substrato_cloud", "list-clusters", stdout=stdout)

    assert "runtime desativado" in stdout.getvalue().lower()


def test_substrato_cloud_register_and_list_clusters(settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = True
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "cloud-command.sqlite3")

    register_stdout = StringIO()
    call_command(
        "substrato_cloud",
        "register-cluster",
        "--cluster-id",
        "cluster-mz-1",
        "--region",
        "maputo",
        "--endpoint",
        "https://cp.maputo.local",
        stdout=register_stdout,
    )
    assert "cluster registrado" in register_stdout.getvalue().lower()

    list_stdout = StringIO()
    call_command("substrato_cloud", "list-clusters", stdout=list_stdout)
    output = list_stdout.getvalue()
    assert "cluster-mz-1" in output
    assert "maputo" in output


def test_substrato_cloud_failover_cluster_command(settings, tmp_path):
    settings.SUBSTRATO_OS_RUNTIME_ENABLED = True
    settings.SUBSTRATO_OS_OUTBOX_PATH = str(tmp_path / "cloud-command.sqlite3")

    runtime = get_runtime()
    runtime.register_edge_node(node_id="edge-a", region="maputo")
    runtime.register_edge_node(node_id="edge-b", region="beira")
    runtime.register_cloud_cluster(cluster_id="cluster-a", region="maputo")
    runtime.register_cloud_cluster(cluster_id="cluster-b", region="beira")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-a", node_id="edge-a")
    runtime.assign_edge_node_to_cluster(cluster_id="cluster-b", node_id="edge-b")
    runtime.deploy_module_to_cluster(
        cluster_id="cluster-a",
        module_key="substrato.modules.financeiro",
        module_version="1.1.0",
        desired_replicas=1,
    )

    stdout = StringIO()
    call_command(
        "substrato_cloud",
        "failover-cluster",
        "--source-cluster-id",
        "cluster-a",
        "--target-cluster-id",
        "cluster-b",
        stdout=stdout,
    )

    output = stdout.getvalue().lower()
    assert "failover concluído" in output
    assert "migrated=1" in output
