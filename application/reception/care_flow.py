from decimal import ROUND_HALF_UP, Decimal

from django.core.exceptions import ValidationError
from django.db import transaction

from apps.billing.models.invoice import Invoice
from apps.clinical.models.lab_exam import LabExam
from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.lab_request_item import LabRequestItem
from apps.clinical.models.patient import Patient
from apps.clinical.models.result import Result
from apps.insurer.models.coverage_plan import CoveragePlan
from apps.insurer.models.insurer import Insurer
from apps.payments.models.payment import Payment
from apps.payments.models.receipt import Receipt
from apps.reception.models.reception_checkin import ReceptionCheckin


def _quantize_value(value):
    if value is None:
        return None

    return Decimal(value).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


def _resolve_patient(tenant, patient_id=None, patient=None):
    patient = patient or {}

    if patient_id:
        patient_obj = Patient.objects.filter(tenant=tenant, pk=patient_id).first()
        if not patient_obj:
            raise ValidationError({"patient_id": "Paciente não encontrado para este tenant."})

        for campo, value in patient.items():
            setattr(patient_obj, campo, value)
    else:
        name = (patient.get("name") or "").strip()
        address = (patient.get("address") or "").strip()

        if not name:
            raise ValidationError({"patient": {"name": "Nome é obrigatório."}})
        if not address:
            raise ValidationError({"patient": {"address": "Morada é obrigatória."}})

        patient_obj = Patient(tenant=tenant, **patient)

    patient_obj.tenant = tenant
    patient_obj.full_clean()
    patient_obj.save()
    return patient_obj


@transaction.atomic
def open_checkin(
    *,
    tenant,
    patient,
    priority=None,
    reason="",
    notes="",
    attendant=None,
):
    return ReceptionCheckin.objects.create(
        tenant=tenant,
        patient=patient,
        priority=priority or ReceptionCheckin.Priority.NORMAL,
        reason=reason or "",
        notes=notes or "",
        attendant=attendant,
    )


@transaction.atomic
def create_request_for_checkin(
    *,
    checkin,
    exam_ids,
    clinical_status=None,
):
    if checkin.request_id:
        raise ValidationError("Check-in já possui requisição vinculada.")

    ids = list(dict.fromkeys(exam_ids or []))
    if not ids:
        raise ValidationError({"request": {"exams_ids": "Informe ao menos um exam."}})

    exams = list(
        LabExam.objects.filter(
            tenant=checkin.tenant,
            pk__in=ids,
            deleted=False,
        ).order_by("pk")
    )

    if len(exams) != len(ids):
        raise ValidationError({"request": {"exams_ids": "Um ou mais exams são inválidos para este tenant."}})

    request = LabRequest(
        tenant=checkin.tenant,
        patient=checkin.patient,
    )

    if clinical_status:
        request.clinical_status = clinical_status

    request.full_clean()
    request.save()

    for exam in exams:
        item = LabRequestItem(
            tenant=checkin.tenant,
            request=request,
            exam=exam,
        )
        item.full_clean()
        item.save()

    Result.objects.create(
        request=request,
        tenant=checkin.tenant,
    )

    checkin.register_request(request)
    return request


@transaction.atomic
def create_invoice_for_checkin(
    *,
    checkin,
    issue=True,
    **legacy_kwargs,
):
    if legacy_kwargs.get("emitir") is not None:
        issue = legacy_kwargs.get("emitir")

    if checkin.invoice_id:
        raise ValidationError("Check-in já possui invoice vinculada.")

    if not checkin.request_id:
        raise ValidationError("Crie ou vincule uma requisição antes da invoice.")

    invoice = Invoice(
        tenant=checkin.tenant,
        origin=Invoice.Origin.CLINICAL,
        request=checkin.request,
        patient=checkin.patient,
    )
    invoice.full_clean()
    invoice.save()
    invoice.sync_items_from_origin()

    if issue:
        invoice.issue()

    checkin.register_invoice(invoice)
    return invoice


@transaction.atomic
def register_payment_for_checkin(
    *,
    checkin,
    value=None,
    method=Payment.Method.CASH,
    external_reference="",
    insurer_id=None,
    coverage_plan_id=None,
    authorization_number="",
    insurance_date=None,
    confirm=True,
    **legacy_kwargs,
):
    if legacy_kwargs.get("confirmar") is not None:
        confirm = legacy_kwargs.get("confirmar")

    if not checkin.invoice_id:
        raise ValidationError("Check-in não possui invoice vinculada.")

    invoice = checkin.invoice
    if invoice.status == Invoice.Status.DRAFT:
        raise ValidationError("Emita a invoice antes de registrar payment.")

    value_payment = _quantize_value(value or invoice.total)
    if value_payment <= Decimal("0.00"):
        raise ValidationError({"payment": {"value": "Valor do payment deve ser maior que zero."}})

    insurer = None
    coverage_plan = None
    authorization_number = (authorization_number or "").strip()

    if method == Payment.Method.HEALTH_INSURANCE:
        if not insurer_id:
            raise ValidationError({"payment": {"insurer_id": "Informe a insurer do seguro de saúde."}})

        insurer = Insurer.objects.filter(tenant=checkin.tenant, pk=insurer_id).first()
        if not insurer:
            raise ValidationError({"payment": {"insurer_id": "Seguradora não encontrada para este tenant."}})

        if coverage_plan_id:
            coverage_plan = CoveragePlan.objects.filter(
                tenant=checkin.tenant, pk=coverage_plan_id
            ).first()
            if not coverage_plan:
                raise ValidationError(
                    {"payment": {"coverage_plan_id": "Plano de cobertura não encontrado para este tenant."}}
                )
            if coverage_plan.insurer_id != insurer.id:
                raise ValidationError(
                    {"payment": {"coverage_plan_id": "Plano de cobertura não pertence à insurer selecionada."}}
                )

        if not authorization_number:
            raise ValidationError({"payment": {"authorization_number": "Informe o número de autorização do seguro."}})

    payment = Payment(
        tenant=checkin.tenant,
        name=f"Pagamento {invoice.custom_id or invoice.pk}",
        invoice=invoice,
        value=value_payment,
        method=method,
        external_reference=external_reference or "",
        insurer=insurer,
        coverage_plan=coverage_plan,
        authorization_number=authorization_number or "",
        insurance_date=insurance_date or {},
    )
    payment.full_clean()
    payment.save()

    if confirm:
        payment.confirm()

    recibo = Receipt.objects.filter(payment=payment).order_by("-created_at", "-id").first()
    return payment, recibo


def get_care_summary(checkin):
    checkin = (
        ReceptionCheckin.objects.select_related(
            "patient",
            "request",
            "invoice",
            "attendant",
        )
        .prefetch_related(
            "request__itens__exam",
            "invoice__itens",
            "invoice__pagamentos",
            "invoice__recibos",
        )
        .get(pk=checkin.pk)
    )

    request = checkin.request
    invoice = checkin.invoice
    payments = list(invoice.pagamentos.order_by("-created_at")) if invoice else []
    receipts = list(invoice.recibos.order_by("-created_at")) if invoice else []

    return {
        "checkin": {
            "id": checkin.id,
            "custom_id": checkin.custom_id,
            "status": checkin.status,
            "status_display": checkin.get_status_display(),
            "priority": checkin.priority,
            "priority_display": checkin.get_priority_display(),
            "reason": checkin.reason,
            "notes": checkin.notes,
            "arrived_at": checkin.arrived_at.isoformat() if checkin.arrived_at else None,
            "called_at": checkin.called_at.isoformat() if checkin.called_at else None,
            "completed_at": checkin.completed_at.isoformat() if checkin.completed_at else None,
            "attendant": (
                checkin.attendant.get_full_name() or checkin.attendant.username if checkin.attendant_id else ""
            ),
        },
        "patient": {
            "id": checkin.patient_id,
            "custom_id": checkin.patient.custom_id,
            "name": checkin.patient.name,
            "document_number": checkin.patient.document_number,
            "contact": checkin.patient.contact,
            "address": checkin.patient.address,
        },
        "request": (
            {
                "id": request.id,
                "custom_id": request.custom_id,
                "status": request.status,
                "clinical_status": request.clinical_status,
                "exams": [
                    {
                        "id": item.exam_id,
                        "custom_id": item.exam.custom_id,
                        "name": item.exam.name,
                        "price": str(item.exam.price),
                    }
                    for item in request.itens.all()
                ],
            }
            if request
            else None
        ),
        "invoice": (
            {
                "id": invoice.id,
                "custom_id": invoice.custom_id,
                "status": invoice.status,
                "subtotal": str(invoice.subtotal),
                "vat_amount": str(invoice.vat_amount),
                "total": str(invoice.total),
                "patient_amount": str(invoice.patient_amount),
                "insurance_amount": str(invoice.insurance_amount),
                "items": [
                    {
                        "id": item.id,
                        "custom_id": item.custom_id,
                        "description": item.description,
                        "quantity": str(item.quantity),
                        "unit_price": str(item.unit_price),
                        "total": str(item.total),
                    }
                    for item in invoice.itens.filter(deleted=False)
                ],
                "itens": [
                    {
                        "id": item.id,
                        "custom_id": item.custom_id,
                        "description": item.description,
                        "quantity": str(item.quantity),
                        "unit_price": str(item.unit_price),
                        "total": str(item.total),
                    }
                    for item in invoice.itens.filter(deleted=False)
                ],
            }
            if invoice
            else None
        ),
        "payments": [
            {
                "id": payment.id,
                "custom_id": payment.custom_id,
                "name": payment.name,
                "value": str(payment.value),
                "method": payment.method,
                "method_display": payment.get_method_display(),
                "status": payment.status,
                "status_display": payment.get_status_display(),
                "external_reference": payment.external_reference,
                "insurer_id": payment.insurer_id,
                "coverage_plan_id": payment.coverage_plan_id,
                "authorization_number": payment.authorization_number,
                "insurance_date": payment.insurance_date,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            }
            for payment in payments
        ],
        "receipts": [
            {
                "id": recibo.id,
                "number": recibo.number,
                "value": str(recibo.value),
                "created_at": recibo.created_at.isoformat() if recibo.created_at else None,
            }
            for recibo in receipts
        ],
        "pagamentos": [
            {
                "id": payment.id,
                "custom_id": payment.custom_id,
                "name": payment.name,
                "value": str(payment.value),
                "method": payment.method,
                "method_display": payment.get_method_display(),
                "status": payment.status,
                "status_display": payment.get_status_display(),
                "external_reference": payment.external_reference,
                "insurer_id": payment.insurer_id,
                "coverage_plan_id": payment.coverage_plan_id,
                "authorization_number": payment.authorization_number,
                "insurance_date": payment.insurance_date,
                "paid_at": payment.paid_at.isoformat() if payment.paid_at else None,
            }
            for payment in payments
        ],
        "recibos": [
            {
                "id": recibo.id,
                "number": recibo.number,
                "value": str(recibo.value),
                "created_at": recibo.created_at.isoformat() if recibo.created_at else None,
            }
            for recibo in receipts
        ],
    }


@transaction.atomic
def execute_full_flow(
    *,
    tenant,
    user=None,
    patient_id=None,
    patient=None,
    checkin=None,
    request=None,
    billing=None,
    payment=None,
    complete_checkin=False,
    faturamento=None,
    concluir_checkin=None,
):
    if faturamento is not None:
        billing = faturamento
    if concluir_checkin is not None:
        complete_checkin = concluir_checkin

    patient_obj = _resolve_patient(
        tenant=tenant,
        patient_id=patient_id,
        patient=dict(patient or {}),
    )

    dados_checkin = dict(checkin or {})
    start_care = bool(dados_checkin.pop("start_care", dados_checkin.pop("iniciar_atendimento", False)))

    checkin_obj = open_checkin(
        tenant=tenant,
        patient=patient_obj,
        priority=dados_checkin.get("priority"),
        reason=dados_checkin.get("reason", ""),
        notes=dados_checkin.get("notes", ""),
        attendant=user if user and start_care else None,
    )

    if start_care:
        checkin_obj.start_care(attendant=user)

    request_obj = None
    if request:
        dados_request = dict(request)
        request_obj = create_request_for_checkin(
            checkin=checkin_obj,
            exam_ids=dados_request.get("exams_ids", []),
            clinical_status=dados_request.get("clinical_status"),
        )

    if billing or payment:
        if not checkin_obj.request_id and not request_obj:
            raise ValidationError("Fluxo financeiro requer uma requisição vinculada.")

        billing_data = dict(billing or {})
        create_invoice_for_checkin(
            checkin=checkin_obj,
            issue=True if payment else billing_data.get("issue", billing_data.get("emitir", True)),
        )

    if payment:
        dados_payment = dict(payment)
        register_payment_for_checkin(
            checkin=checkin_obj,
            value=dados_payment.get("value"),
            method=dados_payment.get("method", Payment.Method.CASH),
            external_reference=dados_payment.get("external_reference", ""),
            insurer_id=dados_payment.get("insurer_id"),
            coverage_plan_id=dados_payment.get("coverage_plan_id"),
            authorization_number=dados_payment.get("authorization_number", ""),
            insurance_date=dados_payment.get("insurance_date"),
            confirm=dados_payment.get("confirm", dados_payment.get("confirmar", True)),
        )

    if complete_checkin:
        checkin_obj.complete()

    return get_care_summary(checkin_obj)


_quantizar_value = _quantize_value
_resolver_patient = _resolve_patient
