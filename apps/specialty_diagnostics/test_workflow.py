from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models import Employee
from apps.specialty_diagnostics.models import (
    DiagnosticModality,
    DiagnosticSpecialty,
    SpecialtyDiagnosticEquipment,
    SpecialtyDiagnosticIntegrationEvent,
    SpecialtyDiagnosticMeasurement,
    SpecialtyDiagnosticOrder,
    SpecialtyDiagnosticReport,
)
from apps.specialty_diagnostics.services import SpecialtyDiagnosticsWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-dx-{suffix}", name="Tenant DX", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente DX", document_number=f"DX-{uuid4().hex[:6]}")


def _specialist(tenant):
    return Employee.objects.create(tenant=tenant, name="Dr. Cardio", email=f"{uuid4().hex[:8]}@dx.test")


def _equipment(tenant, *, status=SpecialtyDiagnosticEquipment.Status.ACTIVE, next_qc=None):
    return SpecialtyDiagnosticEquipment.objects.create(
        tenant=tenant,
        name="ECG 1",
        code=f"EQ-{uuid4().hex[:5]}",
        specialty=DiagnosticSpecialty.CARDIOLOGY,
        modality=DiagnosticModality.ECG,
        status=status,
        next_quality_control=next_qc,
    )


def _order(tenant, patient):
    return SpecialtyDiagnosticOrder.objects.create(
        tenant=tenant, patient=patient, clinical_indication="Palpitações"
    )


@pytest.mark.django_db
def test_full_specialty_pipeline_to_delivery():
    tenant = _tenant()
    patient = _patient(tenant)
    specialist = _specialist(tenant)
    equipment = _equipment(tenant)
    order = _order(tenant, patient)

    SpecialtyDiagnosticsWorkflowService.schedule_order(order, equipment=equipment)
    assert order.status == SpecialtyDiagnosticOrder.Status.SCHEDULED
    assert order.order_number.startswith("DX-")
    assert order.specialty == DiagnosticSpecialty.CARDIOLOGY  # propagado do equipamento

    SpecialtyDiagnosticsWorkflowService.start_exam(order)
    assert order.status == SpecialtyDiagnosticOrder.Status.IN_PROGRESS

    SpecialtyDiagnosticsWorkflowService.finish_execution(order)
    assert order.status == SpecialtyDiagnosticOrder.Status.PERFORMED
    assert order.performed_at is not None

    SpecialtyDiagnosticsWorkflowService.record_measurements(
        order,
        measurements=[
            {"code": "HR", "name": "Frequência cardíaca", "numeric_value": "72", "unit": "bpm"},
            {"code": "QTc", "name": "QTc", "numeric_value": "410", "unit": "ms", "abnormal": False},
        ],
    )
    order.refresh_from_db()
    assert order.measurements_complete is True
    assert order.measurements.count() == 2

    SpecialtyDiagnosticsWorkflowService.assign_specialist(order, specialist=specialist)
    assert order.status == SpecialtyDiagnosticOrder.Status.REPORTING

    report = SpecialtyDiagnosticReport.objects.create(tenant=tenant, order=order, specialist=specialist)
    SpecialtyDiagnosticsWorkflowService.sign_report(report, impression="Ritmo sinusal, sem alterações.")
    report.refresh_from_db()
    order.refresh_from_db()
    assert report.status == SpecialtyDiagnosticReport.Status.FINAL
    assert report.signed_at is not None
    assert order.status == SpecialtyDiagnosticOrder.Status.REPORTED
    assert order.report_available is True

    SpecialtyDiagnosticsWorkflowService.release_report(report)
    order.refresh_from_db()
    assert order.status == SpecialtyDiagnosticOrder.Status.DELIVERED


@pytest.mark.django_db
def test_sign_report_requires_measurements():
    tenant = _tenant()
    patient = _patient(tenant)
    order = _order(tenant, patient)
    report = SpecialtyDiagnosticReport.objects.create(tenant=tenant, order=order)
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticsWorkflowService.sign_report(report, impression="X")


@pytest.mark.django_db
def test_start_blocked_for_equipment_in_maintenance_or_overdue():
    tenant = _tenant()
    patient = _patient(tenant)
    order = _order(tenant, patient)
    broken = _equipment(tenant, status=SpecialtyDiagnosticEquipment.Status.MAINTENANCE)
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticsWorkflowService.start_exam(order, equipment=broken)

    overdue = _equipment(tenant, next_qc=timezone.localdate() - timedelta(days=1))
    order2 = _order(tenant, patient)
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticsWorkflowService.start_exam(order2, equipment=overdue)


@pytest.mark.django_db
def test_order_numbers_are_sequential():
    tenant = _tenant()
    o1 = _order(tenant, _patient(tenant))
    o2 = _order(tenant, _patient(tenant))
    SpecialtyDiagnosticsWorkflowService.schedule_order(o1)
    SpecialtyDiagnosticsWorkflowService.schedule_order(o2)
    n1 = int(o1.order_number.rsplit("-", 1)[1])
    n2 = int(o2.order_number.rsplit("-", 1)[1])
    assert n2 == n1 + 1


@pytest.mark.django_db
def test_critical_result_requires_communication_before_release():
    tenant = _tenant()
    patient = _patient(tenant)
    specialist = _specialist(tenant)
    order = _order(tenant, patient)
    SpecialtyDiagnosticsWorkflowService.record_measurements(
        order, measurements=[{"code": "HR", "name": "FC", "numeric_value": "180", "critical": True}]
    )
    report = SpecialtyDiagnosticReport.objects.create(tenant=tenant, order=order, specialist=specialist)
    SpecialtyDiagnosticsWorkflowService.sign_report(report, impression="Taquicardia ventricular.", critical_result=True)
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticsWorkflowService.release_report(report)

    SpecialtyDiagnosticsWorkflowService.mark_critical_communicated(report, communication="Médico via telefone 09:30")
    SpecialtyDiagnosticsWorkflowService.release_report(report)
    order.refresh_from_db()
    assert order.status == SpecialtyDiagnosticOrder.Status.DELIVERED


@pytest.mark.django_db
def test_amend_creates_new_version():
    tenant = _tenant()
    patient = _patient(tenant)
    order = _order(tenant, patient)
    SpecialtyDiagnosticsWorkflowService.record_measurements(
        order, measurements=[{"code": "HR", "name": "FC", "numeric_value": "70"}]
    )
    report = SpecialtyDiagnosticReport.objects.create(tenant=tenant, order=order)
    SpecialtyDiagnosticsWorkflowService.sign_report(report, impression="Normal.")
    amended = SpecialtyDiagnosticsWorkflowService.amend_report(report, impression="Bradicardia leve.", reason="Revisão")
    assert amended.version_number == report.version_number + 1
    assert amended.status == SpecialtyDiagnosticReport.Status.AMENDED
    assert order.reports.count() == 2


@pytest.mark.django_db
def test_reprocess_integration_event_only_when_failed():
    tenant = _tenant()
    order = _order(tenant, _patient(tenant))
    ok = SpecialtyDiagnosticsWorkflowService.record_integration_event(
        order=order, event_type=SpecialtyDiagnosticIntegrationEvent.EventType.DEVICE_IMPORT,
        status=SpecialtyDiagnosticIntegrationEvent.Status.ACKNOWLEDGED,
    )
    with pytest.raises(ValidationError):
        SpecialtyDiagnosticsWorkflowService.reprocess_integration_event(ok)

    failed = SpecialtyDiagnosticsWorkflowService.record_integration_event(
        order=order, event_type=SpecialtyDiagnosticIntegrationEvent.EventType.DEVICE_IMPORT,
        status=SpecialtyDiagnosticIntegrationEvent.Status.FAILED,
    )
    SpecialtyDiagnosticsWorkflowService.reprocess_integration_event(failed)
    failed.refresh_from_db()
    assert failed.status == SpecialtyDiagnosticIntegrationEvent.Status.PENDING
    assert failed.retry_count == 1
