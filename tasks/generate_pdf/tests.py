"""Testes unitários do pacote `tasks.generate_pdf`."""

from datetime import date
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

from django.http import HttpRequest
import pytest
from reportlab.lib.units import cm

from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_exam_field import LabExamField
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.clinical.models.result_item import ResultItem
from apps.clinical.models.sample import Sample
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.result_type import ResultType
from core.constants.laboratory.sector import Sector
from core.constants.laboratory.units import DefaultUnit
from domain.clinical.result_state import ResultState
from tasks.generate_pdf import pdf_base
from tasks.generate_pdf.patient_history_pdf_generator import generate_patient_history_pdf
from tasks.generate_pdf.patient_invoice_history_pdf_generator import generate_patient_invoice_history_pdf
from tasks.generate_pdf.patient_payment_history_pdf_generator import generate_patient_payment_history_pdf
from tasks.generate_pdf.pdf_base import (
    FONT,
    FONT_BOLD,
    PDF_BODY_FONT_SIZE,
    PDF_BOTTOM_MARGIN,
    PDF_MARGIN,
    PDF_TITLE_FONT_SIZE,
    _should_draw_signatures,
    cell_style,
    document_title_style,
    institutional_user_identity,
    user_name,
    user_primary_group,
)
from tasks.generate_pdf.pdf_improvements import A5Margins, FONT_IMPROVED, FONT_IMPROVED_BOLD
from tasks.generate_pdf.result_pdf_generator import generate_results_pdf
from tasks.generate_pdf.views import request_pdf


def test_request_pdf_404(db):
    """A view funcional deve retornar `Http404` para IDs inexistentes."""
    request = HttpRequest()
    try:
        request_pdf(request, request_id=99999)
    except Exception as exc:
        # Expect Http404
        assert exc.__class__.__name__ == "Http404"
    else:
        raise AssertionError("Expected Http404 for missing request")


def test_signature_flag_only_when_enabled():
    assert _should_draw_signatures(SimpleNamespace()) is False
    assert _should_draw_signatures(SimpleNamespace(include_signatures=False)) is False
    assert _should_draw_signatures(SimpleNamespace(include_signatures=True)) is True


def test_on_page_skips_signatures_when_disabled():
    canvas = object()
    doc = SimpleNamespace(include_signatures=False)
    user = object()
    with (
        patch.object(pdf_base, "draw_header") as draw_header_mock,
        patch.object(pdf_base, "draw_signatures") as draw_signatures_mock,
    ):
        pdf_base.on_page(canvas, doc, user=user)
    draw_header_mock.assert_called_once_with(canvas, doc)
    draw_signatures_mock.assert_not_called()


def test_on_page_draws_signatures_when_enabled():
    canvas = object()
    doc = SimpleNamespace(include_signatures=True)
    user = object()
    with (
        patch.object(pdf_base, "draw_header") as draw_header_mock,
        patch.object(pdf_base, "draw_signatures") as draw_signatures_mock,
    ):
        pdf_base.on_page(canvas, doc, user=user)
    draw_header_mock.assert_called_once_with(canvas, doc)
    draw_signatures_mock.assert_called_once_with(canvas, doc, user)


def test_user_name_prefers_full_name():
    user = SimpleNamespace(first_name="Ana", last_name="Matos", username="ana.matos")
    assert user_name(user) == "Ana Matos"


def test_user_name_falls_back_to_username_when_full_name_missing():
    user = SimpleNamespace(first_name="", last_name="", username="lab.user")
    assert user_name(user) == "lab.user"


def test_institutional_identity_uses_group_and_username_when_no_full_name():
    groups = SimpleNamespace(all=lambda: [SimpleNamespace(name="Laboratório")])
    user = SimpleNamespace(first_name="", last_name="", username="lab.user", groups=groups)
    assert user_primary_group(user) == "Laboratório"
    assert institutional_user_identity(user) == "Laboratório: lab.user"


def test_pdf_style_policy_uses_helvetica_minimal_margins_and_requested_sizes():
    assert FONT == "Helvetica"
    assert FONT_BOLD == "Helvetica-Bold"
    assert FONT_IMPROVED == FONT
    assert FONT_IMPROVED_BOLD == FONT_BOLD
    assert PDF_MARGIN == pytest.approx(0.5 * cm)
    assert PDF_BOTTOM_MARGIN == pytest.approx(0.5 * cm)
    assert A5Margins.LEFT == pytest.approx(PDF_MARGIN)
    assert A5Margins.RIGHT == pytest.approx(PDF_MARGIN)
    assert A5Margins.BOTTOM == pytest.approx(PDF_BOTTOM_MARGIN)
    assert cell_style.fontSize == PDF_BODY_FONT_SIZE == 10
    assert document_title_style().fontSize == PDF_TITLE_FONT_SIZE == 11


def test_generate_qr_code_returns_image_reader_for_valid_url():
    pdf_base.generate_qr_code.cache_clear()

    qr = pdf_base.generate_qr_code("https://example.test/fatura/FAT-001")

    assert qr is not None


def test_generate_patient_history_pdf_with_basic_payload():
    payload = {
        "patient": {
            "id_custom": "PAC-001",
            "nome": "Paciente Teste",
            "tipo_documento": "BI",
            "numero_id": "1100110011A",
            "genero": "Masculino",
            "contacto": "+258840000000",
            "email": "paciente@example.com",
            "criado_em": "2026-04-28T10:00:00Z",
        },
        "referencia": {"pacientes_vinculados": 1},
        "cardex": [],
        "requisicoes": [],
        "consultations": [],
        "procedures_enfermagem": [],
        "internamentos_ward": [],
        "vendas_farmacia": [],
        "faturas": [],
        "recibos": [],
    }

    pdf_bytes, filename = generate_patient_history_pdf(payload, request=None)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
    assert "PAC-001" in filename


def test_generate_patient_invoice_history_pdf_with_basic_payload():
    payload = {
        "patient": {
            "id_custom": "PAC-INV-001",
            "nome": "Paciente Faturas",
            "tipo_documento": "BI",
            "numero_id": "2200220011A",
        },
        "faturas": [],
    }

    pdf_bytes, filename = generate_patient_invoice_history_pdf(payload, request=None)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
    assert "historia_faturas" in filename


def test_generate_patient_payment_history_pdf_with_basic_payload():
    payload = {
        "patient": {
            "id_custom": "PAC-PAG-001",
            "nome": "Paciente Pagamentos",
            "tipo_documento": "BI",
            "numero_id": "3300330011A",
        },
        "pagamentos": [],
        "recibos": [],
    }

    pdf_bytes, filename = generate_patient_payment_history_pdf(payload, request=None)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
    assert "historia_pagamentos" in filename


@pytest.mark.django_db
def test_generate_results_pdf_with_validated_item():
    """A geração de resultados deve produzir bytes quando existe item validado."""
    tenant = Tenant.objects.create(identifier="tn-pdf", name="Tenant PDF")
    patient = Patient.objects.create(
        tenant=tenant,
        name="Paciente PDF",
        gender="Masculino",
        address_street="Rua PDF",
        birth_date=date(1992, 1, 1),
    )
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
    )

    exam = LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("10.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        turnaround_hours=2,
        sample_type=sample,
    )
    field = LabExamField.objects.create(
        tenant=tenant,
        exam=exam,
        name="Hemoglobina",
        type=ResultType.NUMERICO,
        unit=DefaultUnit.G_DL,
    )

    request = LabRequest.objects.create(tenant=tenant, patient=patient)
    request_item = LabRequestItem.objects.create(tenant=tenant, request=request, exam=exam)

    result = Result.objects.create(request=request, tenant=tenant)
    request_item._create_results()
    item = ResultItem.objects.get(result=result, exam_field=field)
    item.result_value = Decimal("13.2")
    item.status = ResultState.VALIDATED
    item.save(update_fields=["result_value", "status"])

    pdf_bytes, filename = generate_results_pdf(request, apenas_validados=True)

    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 0
    assert filename.endswith(".pdf")
