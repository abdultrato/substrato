"""Foundational runtime primitives for SUBSTRATO OS."""

from .cloud import (
    ClusterFailoverResult,
    CloudCluster,
    CloudControlPlaneError,
    ClusterNode,
    ModuleDeployment,
    RolloutAction,
    SQLiteCloudControlPlane,
)
from .distributed import (
    DistributedTask,
    EdgeNode,
    ReplicationEntry,
    SQLiteDistributedRuntime,
)
from .events import EventEnvelope, InMemoryEventStream
from .marketplace import InstalledModule, ModuleMarketplaceError, ModulePackage, SQLiteModuleMarketplace
from .modules import ModuleLoadError, ModuleManifest, ModuleRegistry, ModuleState
from .offline import OutboxEventRecord, OutboxReplayResult, SQLiteOutbox
from .queue import QueueMessage, QueueProcessResult, SQLiteTaskQueue
from .runtime import SubstratoRuntime
from .workflow import WorkflowContext, WorkflowEngine, WorkflowRule, WorkflowRun, WorkflowStep

__all__ = [
    "EventEnvelope",
    "InMemoryEventStream",
    "ModuleLoadError",
    "ModuleManifest",
    "ModuleRegistry",
    "ModuleState",
    "OutboxEventRecord",
    "OutboxReplayResult",
    "SQLiteOutbox",
    "QueueMessage",
    "QueueProcessResult",
    "SQLiteTaskQueue",
    "CloudCluster",
    "ClusterFailoverResult",
    "CloudControlPlaneError",
    "ClusterNode",
    "ModuleDeployment",
    "RolloutAction",
    "SQLiteCloudControlPlane",
    "DistributedTask",
    "EdgeNode",
    "InstalledModule",
    "ModuleMarketplaceError",
    "ModulePackage",
    "SQLiteModuleMarketplace",
    "ReplicationEntry",
    "SQLiteDistributedRuntime",
    "SubstratoRuntime",
    "WorkflowContext",
    "WorkflowEngine",
    "WorkflowRule",
    "WorkflowRun",
    "WorkflowStep",
]
