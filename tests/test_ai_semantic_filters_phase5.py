from __future__ import annotations

from io import StringIO
import json

from django.core.management import call_command

from apps.ai_assistant.services.semantic_filters import apply_semantic_filters, build_phase5_filter_report
from apps.ai_assistant.tools.resource_catalog import descriptor_by_basename
from apps.billing.models.invoice import Invoice
from apps.consultations.models.medical_consultation import MedicalConsultation
from apps.dental.models import DentalPatientTreatmentPlan
from apps.human_resources.models.employee import Employee
from apps.pharmacy.models.lot import Lot


def _filter_by_kind(result, kind: str) -> dict:
    return next(item for item in result.applied_filters if item["kind"] == kind)


def test_phase5_filters_dental_validity_with_domain_rule():
    descriptor = descriptor_by_basename("dental-patient_treatment_plan")
    result = apply_semantic_filters(
        queryset=DentalPatientTreatmentPlan.objects.all(),
        message="planos dentarios validos",
        descriptor=descriptor,
    )

    applied = _filter_by_kind(result, "domain_validity")
    assert applied["operator"] == "valid_on"
    assert applied["field"] == "validity"
    assert not result.skipped_filters


def test_phase5_filters_pending_invoices_by_excluding_closed_statuses():
    descriptor = descriptor_by_basename("billing-invoice")
    result = apply_semantic_filters(
        queryset=Invoice.objects.all(),
        message="faturas pendentes",
        descriptor=descriptor,
    )

    applied = _filter_by_kind(result, "domain_pending_status")
    assert applied["field"] == "status"
    assert applied["operator"] == "not_in"
    assert set(applied["values"]) == {Invoice.Status.PAID, Invoice.Status.CANCELED}


def test_phase5_filters_today_and_open_consultations():
    descriptor = descriptor_by_basename("consultations-consultation")
    today_result = apply_semantic_filters(
        queryset=MedicalConsultation.objects.all(),
        message="consultas hoje",
        descriptor=descriptor,
    )
    open_result = apply_semantic_filters(
        queryset=MedicalConsultation.objects.all(),
        message="consultas abertas",
        descriptor=descriptor,
    )

    date_filter = _filter_by_kind(today_result, "date_range")
    status_filter = _filter_by_kind(open_result, "semantic_status")

    assert date_filter["field"] == "scheduled_for"
    assert date_filter["label"] == "today"
    assert status_filter["field"] == "status"
    assert status_filter["values"] == [MedicalConsultation.Status.SCHEDULED]


def test_phase5_filters_active_employees_and_expired_lots_without_false_status_match():
    employee_descriptor = descriptor_by_basename("human_resources-employee")
    employee_result = apply_semantic_filters(
        queryset=Employee.objects.all(),
        message="funcionarios ativos",
        descriptor=employee_descriptor,
    )
    lot_descriptor = descriptor_by_basename("pharmacy-lot")
    lot_result = apply_semantic_filters(
        queryset=Lot.objects.all(),
        message="lotes expirados",
        descriptor=lot_descriptor,
    )

    status_filter = _filter_by_kind(employee_result, "semantic_status")
    expiration_filter = _filter_by_kind(lot_result, "semantic_expiration")

    assert status_filter["values"] == [Employee.Status.ACTIVE]
    assert Employee.Status.INACTIVE not in status_filter["values"]
    assert expiration_filter["field"] == "expiration_date"
    assert expiration_filter["operator"] == "lt"
    assert not lot_result.skipped_filters


def test_phase5_report_and_command_json():
    report = build_phase5_filter_report()

    assert report["phase"] == 5
    assert report["summary"]["probes_with_filters"] == report["summary"]["probes"]
    assert report["summary"]["filters_skipped"] == 0

    output = StringIO()
    call_command("audit_ai_filters_phase5", "--format", "json", stdout=output)
    payload = json.loads(output.getvalue())
    assert payload["phase"] == 5
    assert payload["summary"]["filters_applied"] >= 8
