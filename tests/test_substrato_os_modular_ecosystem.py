from __future__ import annotations

import pytest

from substrato_os.marketplace import ModuleMarketplaceError, ModulePackage
from substrato_os.modules import ModuleState
from substrato_os.runtime import SubstratoRuntime


def test_marketplace_install_with_dependencies_and_auto_load(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "modules.sqlite3")
    load_trace: list[str] = []

    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.core",
            version="1.0.0",
            description="Core base",
        )
    )
    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.financeiro",
            version="1.1.0",
            description="Finance module",
            dependencies=("substrato.modules.core",),
        )
    )

    installed = runtime.install_module_from_marketplace(
        "substrato.modules.financeiro",
        auto_register=True,
        auto_load=True,
        entrypoints={
            "substrato.modules.core": lambda: load_trace.append("core"),
            "substrato.modules.financeiro": lambda: load_trace.append("financeiro"),
        },
    )

    assert [item.module_key for item in installed] == [
        "substrato.modules.core",
        "substrato.modules.financeiro",
    ]
    assert runtime.modules.state_of("substrato.modules.core") is ModuleState.LOADED
    assert runtime.modules.state_of("substrato.modules.financeiro") is ModuleState.LOADED
    assert load_trace == ["core", "financeiro"]


def test_marketplace_install_picks_latest_version(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "modules.sqlite3")
    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.reports",
            version="1.0.0",
        )
    )
    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.reports",
            version="1.2.0",
        )
    )

    installed = runtime.install_module_from_marketplace("substrato.modules.reports")
    assert installed[-1].module_key == "substrato.modules.reports"
    assert installed[-1].version == "1.2.0"


def test_marketplace_enable_disable_installed_module(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "modules.sqlite3")
    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.rh",
            version="2.0.0",
        )
    )
    runtime.install_module_from_marketplace("substrato.modules.rh")

    disabled = runtime.disable_module_installation("substrato.modules.rh")
    assert disabled is True
    disabled_modules = runtime.list_installed_modules(status="disabled")
    assert [item.module_key for item in disabled_modules] == ["substrato.modules.rh"]

    enabled = runtime.enable_module_installation("substrato.modules.rh")
    assert enabled is True
    enabled_modules = runtime.list_installed_modules(status="enabled")
    assert [item.module_key for item in enabled_modules] == ["substrato.modules.rh"]


def test_marketplace_install_raises_for_missing_dependency(tmp_path) -> None:
    runtime = SubstratoRuntime(outbox_path=tmp_path / "modules.sqlite3")
    runtime.publish_module_package(
        ModulePackage(
            module_key="substrato.modules.analytics",
            version="1.0.0",
            dependencies=("substrato.modules.core",),
        )
    )

    with pytest.raises(ModuleMarketplaceError):
        runtime.install_module_from_marketplace("substrato.modules.analytics")
