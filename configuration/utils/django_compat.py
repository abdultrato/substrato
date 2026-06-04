"""Compatibility helpers for Django versions used across local environments."""

from __future__ import annotations

from inspect import signature
from typing import Any

from django.db import models


_CHECK_CONSTRAINT_PARAM = (
    "condition" if "condition" in signature(models.CheckConstraint).parameters else "check"
)


def check_constraint(*, condition: Any, name: str, **kwargs: Any) -> models.CheckConstraint:
    """Create a CheckConstraint on Django 4.2 and Django 6+."""

    return models.CheckConstraint(
        **{_CHECK_CONSTRAINT_PARAM: condition},
        name=name,
        **kwargs,
    )
