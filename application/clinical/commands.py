from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

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

