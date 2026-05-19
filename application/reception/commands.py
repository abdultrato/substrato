from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from apps.payments.models.payment import Payment
from apps.reception.models.reception_checkin import ReceptionCheckin


@dataclass(frozen=True, slots=True)
class OpenCheckinCommand:
    tenant: Any
    patient: Any
    priority: str | None = None
    reason: str = ""
    notes: str = ""
    attendant: Any = None


@dataclass(frozen=True, slots=True)
class CreateRequestForCheckinCommand:
    checkin: ReceptionCheckin
    exam_ids: list[int]
    clinical_status: str | None = None
    idempotent: bool = True


@dataclass(frozen=True, slots=True)
class CreateInvoiceForCheckinCommand:
    checkin: ReceptionCheckin
    issue: bool = True
    idempotent: bool = True
    legacy_kwargs: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class RegisterPaymentForCheckinCommand:
    checkin: ReceptionCheckin
    value: Decimal | str | None = None
    method: str = Payment.Method.CASH
    external_reference: str = ""
    insurer_id: int | None = None
    coverage_plan_id: int | None = None
    authorization_number: str = ""
    insurance_date: dict[str, Any] | None = None
    confirm: bool = True
    idempotent: bool = True
    legacy_kwargs: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True, slots=True)
class LinkRequestToCheckinCommand:
    checkin: ReceptionCheckin
    tenant: Any
    request_id: int


@dataclass(frozen=True, slots=True)
class LinkInvoiceToCheckinCommand:
    checkin: ReceptionCheckin
    tenant: Any
    invoice_id: int


@dataclass(frozen=True, slots=True)
class ExecuteFullFlowCommand:
    tenant: Any
    user: Any = None
    patient_id: int | None = None
    patient: dict[str, Any] | None = None
    checkin: dict[str, Any] | None = None
    request: dict[str, Any] | None = None
    billing: dict[str, Any] | None = None
    payment: dict[str, Any] | None = None
    complete_checkin: bool = False
    faturamento: dict[str, Any] | None = None
    concluir_checkin: bool | None = None

