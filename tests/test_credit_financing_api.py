from decimal import Decimal
import json

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.core.exceptions import ValidationError
from django.utils import timezone
import pytest

from apps.billing.models.invoice import Invoice
from apps.clinical.models.patient import Patient
from apps.credit_financing.models import (
    CreditInstallment,
    ElectiveProcedureFinancing,
    HealthConsortium,
    ReimbursementClaim,
    StudentFunding,
)
from apps.education.models import Classroom, Course, Enrollment, StudentProfile
from apps.external_entities.models.company import Company
from apps.tenants.models.tenant import Tenant


def _response_data(response):
    if hasattr(response, "data"):
        return response.data
    return json.loads(response.content)


def _items(response):
    payload = _response_data(response)
    if isinstance(payload, dict) and isinstance(payload.get("results"), list):
        return payload["results"]
    if isinstance(payload, list):
        return payload
    return []


def _tenant():
    return Tenant.objects.create(
        identifier="tn-credit-financing",
        name="Tenant Créditos",
        domain="tenant-credit-financing.local",
        active=True,
    )


def _patient(tenant, name="Paciente Crédito"):
    return Patient.objects.create(
        tenant=tenant,
        name=name,
        gender="Feminino",
        address_street="Rua Financiamento",
    )


def _company(tenant, name="Convênio Saúde"):
    return Company.objects.create(tenant=tenant, name=name, nuit="123456789")


def _invoice(tenant, patient, total=Decimal("1000.00"), insurance=Decimal("700.00")):
    return Invoice.objects.create(
        tenant=tenant,
        patient=patient,
        origin=Invoice.Origin.MIXED,
        subtotal=total,
        total=total,
        insurance_amount=insurance,
        patient_amount=total,
    )


def _student_context(tenant):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="student-credit",
        email="student-credit@example.com",
        password="testpass123",
        tenant=tenant,
        first_name="Ana",
        last_name="Estudante",
    )
    student = StudentProfile.objects.create(tenant=tenant, user=user, student_code="STU-CRED-001")
    course = Course.objects.create(tenant=tenant, name="Enfermagem Geral", code="ENF-G")
    classroom = Classroom.objects.create(tenant=tenant, name="ENF 1", course=course, academic_year="2026", capacity=30)
    enrollment = Enrollment.objects.create(tenant=tenant, student=student, classroom=classroom, status="ACTIVE")
    return student, course, enrollment


def _authenticate_admin(tenant, api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="admin-credit-financing",
        email="admin-credit-financing@example.com",
        password="testpass123",
        tenant=tenant,
    )
    group, _ = Group.objects.get_or_create(name="Administrador")
    user.groups.add(group)
    api_client.defaults["HTTP_HOST"] = tenant.domain
    api_client.force_authenticate(user=user)
    return user


@pytest.mark.django_db
def test_credit_financing_models_cover_health_reimbursement_and_student_credit():
    tenant = _tenant()
    patient = _patient(tenant)
    company = _company(tenant)
    invoice = _invoice(tenant, patient)
    student, course, enrollment = _student_context(tenant)

    consortium = HealthConsortium.objects.create(
        patient=patient,
        sponsor_company=company,
        consortium_type="DENTAL_PLAN",
        quota_number="Q-001",
        target_amount=Decimal("1200.00"),
        contribution_amount=Decimal("100.00"),
        admin_fee_percent=Decimal("5.00"),
        term_months=12,
        status="ACTIVE",
        covered_services="Plano odontológico familiar",
    )
    financing = ElectiveProcedureFinancing.objects.create(
        patient=patient,
        invoice=invoice,
        financier_company=company,
        procedure_description="Cirurgia eletiva",
        contract_number="CTR-001",
        down_payment=Decimal("100.00"),
        annual_interest_rate=Decimal("12.00"),
        term_months=6,
        status="APPROVED",
    )
    paid_installment = CreditInstallment.objects.create(
        procedure_financing=financing,
        installment_number=1,
        due_date=timezone.localdate() + timezone.timedelta(days=30),
        principal_amount=Decimal("150.00"),
        interest_amount=Decimal("5.00"),
        paid_amount=Decimal("155.00"),
    )
    reimbursement = ReimbursementClaim.objects.create(
        invoice=invoice,
        payer_company=company,
        claim_type="AGREEMENT",
        status="GLOSSED",
        approved_amount=Decimal("500.00"),
        glosa_reason="Tabela contratual divergente",
    )
    funding = StudentFunding.objects.create(
        student=student,
        enrollment=enrollment,
        sponsor_company=company,
        funding_type="STUDENT_LOAN",
        status="APPROVED",
        coverage_percent=Decimal("50.00"),
        tuition_amount=Decimal("1200.00"),
        annual_interest_rate=Decimal("6.00"),
        term_months=12,
    )
    student_installment = CreditInstallment.objects.create(
        student_funding=funding,
        installment_number=1,
        due_date=timezone.localdate() + timezone.timedelta(days=30),
        principal_amount=Decimal("50.00"),
        interest_amount=Decimal("3.00"),
    )

    assert consortium.tenant == tenant
    assert consortium.expected_total_contribution == Decimal("1200.00")
    assert consortium.admin_fee_amount == Decimal("60.00")
    assert financing.tenant == tenant
    assert financing.principal_amount == Decimal("1000.00")
    assert financing.financed_amount == Decimal("900.00")
    assert financing.installment_amount > Decimal("150.00")
    assert paid_installment.status == "PAID"
    assert paid_installment.total_amount == Decimal("155.00")
    assert paid_installment.paid_at is not None
    assert reimbursement.patient == patient
    assert reimbursement.claimed_amount == Decimal("700.00")
    assert reimbursement.denied_amount == Decimal("200.00")
    assert reimbursement.balance_to_receive == Decimal("500.00")
    assert funding.course == course
    assert funding.academic_year == "2026"
    assert funding.approved_amount == Decimal("600.00")
    assert funding.financed_amount == Decimal("600.00")
    assert funding.monthly_installment > Decimal("50.00")
    assert student_installment.tenant == tenant
    assert student_installment.total_amount == Decimal("53.00")

    other_patient = _patient(tenant, name="Outro Paciente")
    with pytest.raises(ValidationError):
        ElectiveProcedureFinancing.objects.create(
            patient=other_patient,
            invoice=invoice,
            procedure_description="Procedimento incompatível",
            principal_amount=Decimal("100.00"),
            term_months=3,
        )

    with pytest.raises(ValidationError):
        CreditInstallment.objects.create(
            procedure_financing=financing,
            student_funding=funding,
            installment_number=2,
            due_date=timezone.localdate() + timezone.timedelta(days=60),
            principal_amount=Decimal("10.00"),
        )


@pytest.mark.django_db
def test_credit_financing_api_exposes_credit_reimbursement_and_student_funding_workflow(api_client):
    tenant = _tenant()
    patient = _patient(tenant)
    company = _company(tenant)
    invoice = _invoice(tenant, patient)
    student, _course, enrollment = _student_context(tenant)
    _authenticate_admin(tenant, api_client)

    consortium_response = api_client.post(
        "/api/v1/credit_financing/consortium/",
        {
            "name": "Consórcio Dental Familiar",
            "patient": patient.id,
            "sponsor_company": company.id,
            "consortium_type": "DENTAL_PLAN",
            "quota_number": "Q-API-001",
            "target_amount": "1200.00",
            "contribution_amount": "100.00",
            "admin_fee_percent": "5.00",
            "term_months": 12,
            "status": "ACTIVE",
        },
        format="json",
    )
    assert consortium_response.status_code == 201
    assert _response_data(consortium_response)["expected_total_contribution"] == "1200.00"

    financing_response = api_client.post(
        "/api/v1/credit_financing/procedure_financing/",
        {
            "patient": patient.id,
            "invoice": invoice.id,
            "financier_company": company.id,
            "procedure_description": "Cirurgia eletiva",
            "contract_number": "CTR-API-001",
            "down_payment": "100.00",
            "annual_interest_rate": "12.00",
            "term_months": 6,
            "status": "APPROVED",
        },
        format="json",
    )
    assert financing_response.status_code == 201
    financing_payload = _response_data(financing_response)
    assert financing_payload["financed_amount"] == "900.00"
    assert Decimal(financing_payload["installment_amount"]) > Decimal("150.00")

    installment_response = api_client.post(
        "/api/v1/credit_financing/installment/",
        {
            "procedure_financing": financing_payload["id"],
            "installment_number": 1,
            "due_date": str(timezone.localdate() + timezone.timedelta(days=30)),
            "principal_amount": "150.00",
            "interest_amount": "5.00",
            "paid_amount": "155.00",
        },
        format="json",
    )
    assert installment_response.status_code == 201
    assert _response_data(installment_response)["status"] == "PAID"

    reimbursement_response = api_client.post(
        "/api/v1/credit_financing/reimbursement_claim/",
        {
            "invoice": invoice.id,
            "payer_company": company.id,
            "claim_type": "AGREEMENT",
            "status": "GLOSSED",
            "approved_amount": "500.00",
            "glosa_reason": "Tabela contratual divergente",
        },
        format="json",
    )
    assert reimbursement_response.status_code == 201
    reimbursement_payload = _response_data(reimbursement_response)
    assert reimbursement_payload["patient"] == patient.id
    assert reimbursement_payload["claimed_amount"] == "700.00"
    assert reimbursement_payload["denied_amount"] == "200.00"

    funding_response = api_client.post(
        "/api/v1/credit_financing/student_funding/",
        {
            "student": student.id,
            "enrollment": enrollment.id,
            "sponsor_company": company.id,
            "funding_type": "STUDENT_LOAN",
            "status": "APPROVED",
            "coverage_percent": "50.00",
            "tuition_amount": "1200.00",
            "annual_interest_rate": "6.00",
            "term_months": 12,
        },
        format="json",
    )
    assert funding_response.status_code == 201
    funding_payload = _response_data(funding_response)
    assert funding_payload["academic_year"] == "2026"
    assert funding_payload["approved_amount"] == "600.00"
    assert funding_payload["monthly_installment"] != "0.00"

    list_response = api_client.get("/api/v1/credit_financing/reimbursement_claim/?status=GLOSSED")
    assert list_response.status_code == 200
    assert len(_items(list_response)) == 1

    funding_list_response = api_client.get("/api/v1/credit_financing/student_funding/?funding_type=STUDENT_LOAN")
    assert funding_list_response.status_code == 200
    assert len(_items(funding_list_response)) == 1
