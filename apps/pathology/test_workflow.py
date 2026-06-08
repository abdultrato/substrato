from __future__ import annotations

from uuid import uuid4

import pytest
from django.core.exceptions import ValidationError

from apps.clinical.models.patient import Patient
from apps.human_resources.models import Employee
from apps.pathology.models import (
    PathologyArchive,
    PathologyBillingEvent,
    PathologyEmbedding,
    PathologyGrossExamination,
    PathologyHistologySlide,
    PathologyMicrotomy,
    PathologyProcessing,
    PathologyQualityControl,
    PathologyReport,
    PathologyRequest,
    PathologySampleReception,
    PathologyStaining,
)
from apps.pathology.services import PathologyWorkflowService
from apps.tenants.models.tenant import Tenant


def _tenant():
    suffix = uuid4().hex[:8]
    return Tenant.objects.create(
        identifier=f"tn-pat-{suffix}", name="Tenant Pat", domain=f"{suffix}.local", active=True
    )


def _patient(tenant):
    return Patient.objects.create(tenant=tenant, name="Paciente Pat", document_number=f"PT-{uuid4().hex[:6]}")


def _pathologist(tenant):
    return Employee.objects.create(tenant=tenant, name="Dr. Pato", email=f"{uuid4().hex[:8]}@pat.test")


def _request_and_sample(tenant, patient):
    request = PathologyRequest.objects.create(
        tenant=tenant,
        patient=patient,
        request_type=PathologyRequest.RequestType.BREAST_BIOPSY,
    )
    sample = PathologySampleReception.objects.create(
        tenant=tenant,
        patient=patient,
        request=request,
        specimen_type=PathologySampleReception.SpecimenType.BIOPSY,
        anatomical_site="Mama esquerda",
    )
    return request, sample


@pytest.mark.django_db
def test_full_histology_pipeline_to_report_and_archive():
    tenant = _tenant()
    patient = _patient(tenant)
    pathologist = _pathologist(tenant)
    request, sample = _request_and_sample(tenant, patient)

    # Acessionamento → amostra aceite + número propagado + pedido RECEBIDO.
    accession = PathologyWorkflowService.generate_accession(sample, accessioned_by=pathologist)
    sample.refresh_from_db()
    request.refresh_from_db()
    assert accession.accession_number.startswith("H-")
    assert sample.accession_number == accession.accession_number
    assert sample.status == PathologySampleReception.Status.ACCEPTED
    assert request.status == PathologyRequest.Status.RECEIVED

    # Macroscopia → amostra em processamento + pedido em execução.
    gross = PathologyGrossExamination.objects.create(tenant=tenant, sample=sample, pathologist=pathologist)
    PathologyWorkflowService.finalize_gross(gross, gross_description="Fragmento de 1,2 cm, esbranquiçado.")
    sample.refresh_from_db()
    request.refresh_from_db()
    assert gross.status == PathologyGrossExamination.Status.COMPLETED
    assert sample.status == PathologySampleReception.Status.IN_PROCESSING
    assert request.status == PathologyRequest.Status.IN_PROGRESS

    # Processamento.
    processing = PathologyProcessing.objects.create(tenant=tenant, sample=sample)
    PathologyWorkflowService.start_processing(processing)
    PathologyWorkflowService.complete_processing(processing)
    assert processing.status == PathologyProcessing.Status.COMPLETED

    # Inclusão e microtomia.
    embedding = PathologyEmbedding.objects.create(
        tenant=tenant, sample=sample, processing=processing, block_number=f"B-{uuid4().hex[:6]}"
    )
    PathologyWorkflowService.mark_embedded(embedding)
    assert embedding.status == PathologyEmbedding.Status.EMBEDDED

    microtomy = PathologyMicrotomy.objects.create(tenant=tenant, sample=sample, embedding=embedding)
    PathologyWorkflowService.mark_cut(microtomy)
    assert microtomy.status == PathologyMicrotomy.Status.CUT

    # Lâmina + coloração (coloração concluída marca a lâmina STAINED).
    slide = PathologyWorkflowService.produce_slide(microtomy, slide_number=f"S-{uuid4().hex[:6]}")
    staining = PathologyStaining.objects.create(
        tenant=tenant, sample=sample, slide=slide, stain_type=PathologyStaining.StainType.HE, stain_name="H&E"
    )
    PathologyWorkflowService.complete_staining(staining)
    slide.refresh_from_db()
    assert slide.status == PathologyHistologySlide.Status.STAINED

    # Lâmina pronta → amostra pronta para laudo.
    PathologyWorkflowService.mark_slide_ready(slide)
    sample.refresh_from_db()
    assert sample.status == PathologySampleReception.Status.READY_FOR_REPORT

    # Laudo: assinar + liberar (gera faturação base).
    report = PathologyReport.objects.create(tenant=tenant, sample=sample)
    PathologyWorkflowService.sign_report(report, diagnosis="Carcinoma ductal invasivo", pathologist=pathologist)
    report.refresh_from_db()
    assert report.status == PathologyReport.Status.FINAL
    assert report.report_number.startswith("AP-")
    assert report.signed_at is not None

    PathologyWorkflowService.release_report(report, generate_base_billing=True)
    sample.refresh_from_db()
    request.refresh_from_db()
    assert report.delivered_at is not None
    assert sample.status == PathologySampleReception.Status.REPORTED
    assert request.status == PathologyRequest.Status.REPORTED
    assert PathologyBillingEvent.objects.filter(sample=sample).exists()

    # Arquivo do bloco → amostra arquivada.
    archive = PathologyWorkflowService.archive_material(
        sample=sample, archive_type=PathologyArchive.ArchiveType.BLOCK, location="Sala A / Est 2 / Cx 5"
    )
    sample.refresh_from_db()
    assert archive.status == PathologyArchive.Status.ARCHIVED
    assert sample.status == PathologySampleReception.Status.ARCHIVED


@pytest.mark.django_db
def test_reject_sample_requires_reason_and_opens_quality_event():
    tenant = _tenant()
    patient = _patient(tenant)
    _request, sample = _request_and_sample(tenant, patient)

    with pytest.raises(ValidationError):
        PathologyWorkflowService.reject_sample(sample, reason="")

    PathologyWorkflowService.reject_sample(sample, reason="Frasco sem identificação")
    sample.refresh_from_db()
    assert sample.status == PathologySampleReception.Status.REJECTED
    assert PathologyQualityControl.objects.filter(
        sample=sample, status=PathologyQualityControl.Status.FAIL
    ).exists()


@pytest.mark.django_db
def test_cannot_accession_rejected_sample():
    tenant = _tenant()
    patient = _patient(tenant)
    _request, sample = _request_and_sample(tenant, patient)
    PathologyWorkflowService.reject_sample(sample, reason="Material insuficiente")
    with pytest.raises(ValidationError):
        PathologyWorkflowService.generate_accession(sample)


@pytest.mark.django_db
def test_accession_numbers_are_sequential():
    tenant = _tenant()
    p1 = _patient(tenant)
    p2 = _patient(tenant)
    _r1, s1 = _request_and_sample(tenant, p1)
    _r2, s2 = _request_and_sample(tenant, p2)
    a1 = PathologyWorkflowService.generate_accession(s1)
    a2 = PathologyWorkflowService.generate_accession(s2)
    n1 = int(a1.accession_number.rsplit("-", 1)[1])
    n2 = int(a2.accession_number.rsplit("-", 1)[1])
    assert n2 == n1 + 1


@pytest.mark.django_db
def test_sign_report_requires_diagnosis():
    tenant = _tenant()
    patient = _patient(tenant)
    _request, sample = _request_and_sample(tenant, patient)
    report = PathologyReport.objects.create(tenant=tenant, sample=sample)
    with pytest.raises(ValidationError):
        PathologyWorkflowService.sign_report(report)


@pytest.mark.django_db
def test_amend_requires_signed_report():
    tenant = _tenant()
    patient = _patient(tenant)
    _request, sample = _request_and_sample(tenant, patient)
    report = PathologyReport.objects.create(tenant=tenant, sample=sample)
    with pytest.raises(ValidationError):
        PathologyWorkflowService.amend_report(report, reason="erro")

    PathologyWorkflowService.sign_report(report, diagnosis="Tecido benigno")
    PathologyWorkflowService.amend_report(report, reason="Correção de margem")
    report.refresh_from_db()
    assert report.status == PathologyReport.Status.AMENDED


@pytest.mark.django_db
def test_staining_repeat_opens_quality_event():
    tenant = _tenant()
    patient = _patient(tenant)
    _request, sample = _request_and_sample(tenant, patient)
    staining = PathologyStaining.objects.create(
        tenant=tenant, sample=sample, stain_type=PathologyStaining.StainType.HE, stain_name="H&E"
    )
    PathologyWorkflowService.repeat_staining(staining, reason="Coloração fraca")
    staining.refresh_from_db()
    assert staining.status == PathologyStaining.Status.REPEAT
    assert PathologyQualityControl.objects.filter(
        sample=sample, control_type=PathologyQualityControl.ControlType.STAIN_FAILURE
    ).exists()
