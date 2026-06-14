"""Teste ponta-a-ponta das actions de faturação por requisição.

Exercita a lógica nova do InvoiceViewSet:
- GET  /invoices/pending-requisitions/  → requisições sem fatura
- POST /invoices/start-billing/         → cria rascunho + sincroniza itens

Os endpoints são invocados via DRF (APIRequestFactory) com `request.tenant`
injetado (normalmente populado pelo TenantMiddleware), de modo a validar o
fluxo real: modelos -> action -> serializer.
"""

from datetime import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.utils import timezone
import pytest
from rest_framework.test import APIRequestFactory, force_authenticate

from api.v1.billing.viewsets_impl.core import InvoiceViewSet
from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.medical_exam import MedicalExam
from apps.clinical.models.patient import Patient
from apps.clinical.models.sample import Sample
from apps.tenants.models.tenant import Tenant
from core.constants.laboratory.method import Method
from core.constants.laboratory.sector import Sector
from core.constants.medical_exam.medical_exam_method import MedicalExamMethod
from core.constants.medical_exam.medical_exam_sector import MedicalExamSector

factory = APIRequestFactory()


@pytest.fixture(autouse=True)
def _reset_current_user():
    """Evita que o utilizador autenticado (set via dispatch do viewset) vaze para
    outros testes — caso contrário `created_by`/`updated_by` apontariam para um
    utilizador já revertido pelo rollback transacional."""
    yield
    from infrastructure.context.request_user import clear_current_user

    clear_current_user()


def _tenant():
    return Tenant.objects.create(identifier="tn-pend", name="Tenant Pend")


def _patient(tenant):
    return Patient.objects.create(
        tenant=tenant,
        name="Paciente Requisicao",
        gender="Masculino",
        address_street="Rua Z",
    )


def _exam(tenant):
    sample = Sample.objects.create(
        tenant=tenant,
        name="Sangue total",
        bottle_type=Sample.BottleType.EDTA_TUBE,
    )
    return LabExam.objects.create(
        tenant=tenant,
        name="Hemograma",
        price=Decimal("30.00"),
        method=Method.ENZIMATICO,
        sector=Sector.HEMATOLOGIA,
        sample_type=sample,
    )


def _medical_exam(tenant):
    return MedicalExam.objects.create(
        tenant=tenant,
        name="Ecografia abdominal",
        price=Decimal("150.00"),
        method=MedicalExamMethod.ULTRASSONOGRAFIA,
        sector=MedicalExamSector.RADIOLOGIA,
    )


def _pin_weekday(req):
    """Fixa created_at num dia útil para evitar a sobretaxa de fim de semana/feriado.

    O preço dos exames é multiplicado por `calculate_price_multiplier` com base na
    data da requisição (`_pricing_reference_date` usa `invoice.request.created_at`).
    Em fim de semana o multiplicador é 2x; fixar uma terça-feira mantém o preço base.
    """
    req.created_at = datetime(2024, 1, 2, 10, 0, tzinfo=timezone.get_current_timezone())
    req.save(update_fields=["created_at"])
    return req


def _user(name="Recepcao Teste"):
    User = get_user_model()
    return User.objects.create_user(
        username="rececao",
        email="rececao@example.com",
        password="x",
        name=name,
    )


def _get_pending(user, tenant):
    view = InvoiceViewSet.as_view({"get": "pending_requisitions"})
    request = factory.get("/invoices/pending-requisitions/")
    request.tenant = tenant
    force_authenticate(request, user=user)
    response = view(request)
    response.render()
    return response


def _post_start_billing(user, tenant, req_id):
    view = InvoiceViewSet.as_view({"post": "start_billing"})
    request = factory.post("/invoices/start-billing/", {"request": req_id}, format="json")
    request.tenant = tenant
    force_authenticate(request, user=user)
    response = view(request)
    response.render()
    return response


@pytest.mark.django_db
def test_requisicao_aparece_e_inicia_faturacao_ponta_a_ponta():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    user = _user()

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)
    _pin_weekday(req)

    # 1) A requisição recém-criada aparece automaticamente como pendente.
    resp = _get_pending(user, tenant)
    assert resp.status_code == 200
    pendentes = {row["id"]: row for row in resp.data}
    assert req.id in pendentes
    card = pendentes[req.id]
    assert card["paciente"] == patient.name
    assert card["num_exames"] == 1
    assert card["estado"] == req.status

    # 2) Iniciar faturação cria o rascunho e sincroniza os itens da requisição.
    resp = _post_start_billing(user, tenant, req.id)
    assert resp.status_code == 201, resp.data
    invoice_id = resp.data["id"]
    invoice = Invoice.objects.get(pk=invoice_id)
    assert invoice.status == Invoice.Status.DRAFT
    assert invoice.origin == Invoice.Origin.CLINICAL
    assert invoice.request_id == req.id
    assert invoice.patient_id == patient.id

    itens = list(invoice.items.filter(deleted=False))
    assert len(itens) == 1
    assert itens[0].exam_id == exam.id
    assert invoice.subtotal == exam.price

    # 3) Após faturar, a requisição deixa de aparecer como pendente.
    resp = _get_pending(user, tenant)
    assert req.id not in {row["id"] for row in resp.data}


@pytest.mark.django_db
def test_start_billing_e_idempotente():
    tenant = _tenant()
    patient = _patient(tenant)
    exam = _exam(tenant)
    user = _user()

    req = LabRequest.objects.create(tenant=tenant, patient=patient)
    LabRequestItem.objects.create(tenant=tenant, request=req, exam=exam)
    _pin_weekday(req)

    primeira = _post_start_billing(user, tenant, req.id)
    assert primeira.status_code == 201
    invoice_id = primeira.data["id"]

    # Repetir não cria nova fatura: devolve a mesma (200) e não duplica.
    segunda = _post_start_billing(user, tenant, req.id)
    assert segunda.status_code == 200
    assert segunda.data["id"] == invoice_id
    assert Invoice.objects.filter(request=req).count() == 1


@pytest.mark.django_db
def test_pending_requisitions_inclui_exame_medico():
    tenant = _tenant()
    patient = _patient(tenant)
    medical_exam = _medical_exam(tenant)
    user = _user()

    req = LabRequest.objects.create(
        tenant=tenant,
        patient=patient,
        type=LabRequest.Type.MEDICAL_EXAM,
    )
    LabRequestItem.objects.create(tenant=tenant, request=req, medical_exam=medical_exam)
    _pin_weekday(req)

    resp = _get_pending(user, tenant)
    pendentes = {row["id"]: row for row in resp.data}
    assert req.id in pendentes
    assert pendentes[req.id]["tipo"] == LabRequest.Type.MEDICAL_EXAM
    assert pendentes[req.id]["num_exames"] == 1

    resp = _post_start_billing(user, tenant, req.id)
    assert resp.status_code == 201
    invoice = Invoice.objects.get(pk=resp.data["id"])
    itens = list(invoice.items.filter(deleted=False))
    assert len(itens) == 1
    assert itens[0].medical_exam_id == medical_exam.id
    assert invoice.subtotal == medical_exam.price
