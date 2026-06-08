from __future__ import annotations

from datetime import timedelta
from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.clinical.models.patient import Patient
from apps.human_resources.models import Employee
from apps.radiology.models import (
    ImagingEquipment,
    ImagingModality,
    ImagingReport,
    ImagingStudy,
    PacsIntegrationEvent,
)
from apps.radiology.services import RadiologyWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-rad-{suffix}", name="Tenant Rad", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente Rad", document_number=f"RD-{uuid4().hex[:6]}")


def _radiologist(tenant):
    return Employee.objects.create(tenant=tenant, name="Dr. Radio", email=f"{uuid4().hex[:8]}@rad.test")


def _equipment(tenant, *, status=ImagingEquipment.Status.ACTIVE, modality=ImagingModality.XRAY, next_qc=None):
    return ImagingEquipment.objects.create(
        tenant=tenant,
        name="Raio-X 1",
        code=f"EQ-{uuid4().hex[:5]}",
        modality=modality,
        status=status,
        next_quality_control=next_qc,
    )


def _study(tenant, patient, *, modality=ImagingModality.XRAY):
    return ImagingStudy.objects.create(
        tenant=tenant,
        patient=patient,
        modality=modality,
        clinical_indication="Tosse persistente",
    )


@pytest.mark.django_db
def test_full_imaging_pipeline_schedule_to_delivery():
    tenant = _tenant()
    patient = _patient(tenant)
    radiologist = _radiologist(tenant)
    equipment = _equipment(tenant)
    study = _study(tenant, patient)

    RadiologyWorkflowService.schedule_study(study, equipment=equipment)
    assert study.status == ImagingStudy.Status.SCHEDULED
    assert study.accession_number.startswith("RAD-")

    RadiologyWorkflowService.start_acquisition(study)
    assert study.status == ImagingStudy.Status.IN_PROGRESS
    assert study.started_at is not None

    RadiologyWorkflowService.mark_acquired(study, image_count=24, study_instance_uid=f"1.2.3.{uuid4().hex[:8]}")
    assert study.status == ImagingStudy.Status.ACQUIRED
    assert study.images_available is True

    RadiologyWorkflowService.assign_radiologist(study, radiologist=radiologist)
    assert study.status == ImagingStudy.Status.REPORTING
    assert study.radiologist_id == radiologist.id

    report = ImagingReport.objects.create(tenant=tenant, study=study, radiologist=radiologist)
    RadiologyWorkflowService.sign_report(report, impression="Sem alterações pleuropulmonares.")
    report.refresh_from_db()
    study.refresh_from_db()
    assert report.status == ImagingReport.Status.FINAL
    assert report.signed_at is not None
    assert study.status == ImagingStudy.Status.REPORTED  # mark_reported via save do modelo

    RadiologyWorkflowService.release_report(report)
    study.refresh_from_db()
    assert study.status == ImagingStudy.Status.DELIVERED


@pytest.mark.django_db
def test_acquisition_blocked_for_equipment_in_maintenance():
    tenant = _tenant()
    patient = _patient(tenant)
    study = _study(tenant, patient)
    broken = _equipment(tenant, status=ImagingEquipment.Status.MAINTENANCE)
    with pytest.raises(ValidationError):
        RadiologyWorkflowService.start_acquisition(study, equipment=broken)


@pytest.mark.django_db
def test_acquisition_blocked_for_overdue_qc():
    tenant = _tenant()
    patient = _patient(tenant)
    study = _study(tenant, patient)
    overdue = _equipment(tenant, next_qc=timezone.localdate() - timedelta(days=1))
    with pytest.raises(ValidationError):
        RadiologyWorkflowService.start_acquisition(study, equipment=overdue)


@pytest.mark.django_db
def test_accession_numbers_are_sequential():
    tenant = _tenant()
    s1 = _study(tenant, _patient(tenant))
    s2 = _study(tenant, _patient(tenant))
    RadiologyWorkflowService.schedule_study(s1)
    RadiologyWorkflowService.schedule_study(s2)
    n1 = int(s1.accession_number.rsplit("-", 1)[1])
    n2 = int(s2.accession_number.rsplit("-", 1)[1])
    assert n2 == n1 + 1


@pytest.mark.django_db
def test_sign_report_requires_findings_or_impression():
    tenant = _tenant()
    patient = _patient(tenant)
    radiologist = _radiologist(tenant)
    study = _study(tenant, patient)
    report = ImagingReport.objects.create(tenant=tenant, study=study, radiologist=radiologist)
    with pytest.raises(ValidationError):
        RadiologyWorkflowService.sign_report(report)


@pytest.mark.django_db
def test_critical_result_requires_communication_before_release():
    tenant = _tenant()
    patient = _patient(tenant)
    radiologist = _radiologist(tenant)
    study = _study(tenant, patient)
    report = ImagingReport.objects.create(tenant=tenant, study=study, radiologist=radiologist)
    RadiologyWorkflowService.sign_report(report, impression="Pneumotórax hipertensivo.", critical_result=True)
    with pytest.raises(ValidationError):
        RadiologyWorkflowService.release_report(report)

    RadiologyWorkflowService.mark_critical_communicated(report, communication="Dr. Solicitante via telefone 14:05")
    RadiologyWorkflowService.release_report(report)
    study.refresh_from_db()
    assert study.status == ImagingStudy.Status.DELIVERED


@pytest.mark.django_db
def test_amend_creates_new_version():
    tenant = _tenant()
    patient = _patient(tenant)
    radiologist = _radiologist(tenant)
    study = _study(tenant, patient)
    report = ImagingReport.objects.create(tenant=tenant, study=study, radiologist=radiologist)
    RadiologyWorkflowService.sign_report(report, impression="Normal.")
    amended = RadiologyWorkflowService.amend_report(report, impression="Nódulo de 4mm no LSD.", reason="Revisão")
    assert amended.version_number == report.version_number + 1
    assert amended.status == ImagingReport.Status.AMENDED
    assert study.reports.count() == 2


@pytest.mark.django_db
def test_reprocess_pacs_event_only_when_failed():
    tenant = _tenant()
    patient = _patient(tenant)
    study = _study(tenant, patient)
    ok_event = RadiologyWorkflowService.record_pacs_event(
        study=study, event_type=PacsIntegrationEvent.EventType.STORE, status=PacsIntegrationEvent.Status.ACKNOWLEDGED
    )
    with pytest.raises(ValidationError):
        RadiologyWorkflowService.reprocess_pacs_event(ok_event)

    failed = RadiologyWorkflowService.record_pacs_event(
        study=study, event_type=PacsIntegrationEvent.EventType.STORE, status=PacsIntegrationEvent.Status.FAILED
    )
    RadiologyWorkflowService.reprocess_pacs_event(failed)
    failed.refresh_from_db()
    assert failed.status == PacsIntegrationEvent.Status.PENDING
    assert failed.retry_count == 1
