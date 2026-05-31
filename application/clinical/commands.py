from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.result_item import ResultItem


@dataclass(frozen=True, slots=True)
class StartResultAnalysisCommand:
    result_item: ResultItem
    user: Any = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class SaveResultValueCommand:
    result_item: ResultItem
    raw_value: Decimal | str | None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class ValidateResultCommand:
    result_item: ResultItem
    user: Any = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class DisregardResultCommand:
    result_item: ResultItem
    reason: str
    user: Any = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class DisregardEmptyRequestResultsCommand:
    lab_request: LabRequest
    reason: str
    user: Any = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class ValidateRequestResultsCommand:
    lab_request: LabRequest
    user: Any = None
    idempotent: bool = True
