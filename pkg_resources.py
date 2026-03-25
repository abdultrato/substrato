from __future__ import annotations

from dataclasses import dataclass
from importlib.metadata import PackageNotFoundError, version


class DistributionNotFound(LookupError):
    """Compatibility shim for packages that still import pkg_resources."""


@dataclass(frozen=True, slots=True)
class Distribution:
    version: str


def get_distribution(name: str) -> Distribution:
    try:
        return Distribution(version=version(name))
    except PackageNotFoundError as error:
        raise DistributionNotFound(name) from error
