from __future__ import annotations

from typing import Any

from rest_framework.request import Request

from apps.clinical.models.lab_request import LabRequest
from apps.clinical.models.patient import Patient


def user_can_view_clinical_history(user) -> bool:
    """
    História clínica contém dados sensíveis. Limitamos explicitamente a:
    - Administrador
    - Médico
    - Medicina Ocupacional
    """
    if not user or not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_superuser", False):
        return True
    try:
        from security.permissions.rbac import GROUPS as RBAC_GROUPS, _normalize

        raw_groups = list(user.groups.values_list("name", flat=True))
        user_groups = {_normalize(g) for g in raw_groups if g}
        permitidos = {
            _normalize(RBAC_GROUPS["ADMIN"]),
            _normalize(RBAC_GROUPS["MEDICINA"]),
            _normalize(RBAC_GROUPS["MEDICINA_OCUPACIONAL"]),
        }
        return bool(user_groups & permitidos)
    except Exception:
        return False


def build_patient_clinical_history(request: Request, patient: Patient) -> dict[str, Any]:
    tenant = getattr(request, "tenant", None) or getattr(patient, "tenant", None)

    try:
        limit = int(getattr(getattr(request, "query_params", None), "get", lambda *_: None)("limit") or 200)
    except Exception:
        limit = 200
    limit = max(1, min(limit, 1000))

    # Vincular por número do documento: se houver, incluir eventuais registros
    # associados ao mesmo documento no mesmo tenant.
    patient_ids = [patient.id]
    document_number = (getattr(patient, "document_number", None) or "").strip()
    if document_number:
        qs_pacs = Patient.objects.filter(deleted=False, document_number=document_number)
        if tenant is not None:
            qs_pacs = qs_pacs.filter(tenant=tenant)
        patient_ids = list(qs_pacs.values_list("id", flat=True))

    # Prontuário (Cardex)
    from api.v1.medical_records.serializers import MedicalRecordEntrySerializer
    from apps.medical_records.models.medical_record_entry import MedicalRecordEntry

    qs_prontuario = (
        MedicalRecordEntry.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient", "doctor")
        .prefetch_related("consultations", "itens_prescription", "itens_prescription__medication")
        .order_by("-care_start_at", "-created_at")
    )
    if tenant is not None:
        qs_prontuario = qs_prontuario.filter(tenant=tenant)

    # Requisições (exams)
    qs_requisicoes = (
        LabRequest.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient", "requesting_company", "external_executing_company")
        .prefetch_related("itens", "itens__exam", "itens__medical_exam")
        .order_by("-created_at")
    )
    if tenant is not None:
        qs_requisicoes = qs_requisicoes.filter(tenant=tenant)

    # Consultas
    from api.v1.consultations.serializers import MedicalConsultationSerializer
    from apps.consultations.models.medical_consultation import MedicalConsultation

    qs_consultations = (
        MedicalConsultation.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient", "doctor", "specialty")
        .order_by("-scheduled_for", "-created_at")
    )
    if tenant is not None:
        qs_consultations = qs_consultations.filter(tenant=tenant)

    # Enfermagem: procedures + internamentos
    from api.v1.nursing.serializers import ProcedureSerializer, WardAdmissionSerializer
    from apps.nursing.models.procedure import Procedure
    from apps.nursing.models.ward import WardAdmission

    qs_procedures = (
        Procedure.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient")
        .prefetch_related("professional")
        .order_by("-performed_date", "-created_at")
    )
    if tenant is not None:
        qs_procedures = qs_procedures.filter(tenant=tenant)

    qs_internamentos = (
        WardAdmission.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient", "bed", "bed__ward")
        .order_by("-admission_date", "-created_at")
    )
    if tenant is not None:
        qs_internamentos = qs_internamentos.filter(tenant=tenant)

    # Farmácia: vendas
    from api.v1.pharmacy.serializers import SaleSerializer
    from apps.pharmacy.models.sale import Sale

    qs_vendas = (
        Sale.objects.filter(
            deleted=False,
            patient_id__in=patient_ids,
        )
        .select_related("patient")
        .order_by("-created_at")
    )
    if tenant is not None:
        qs_vendas = qs_vendas.filter(tenant=tenant)

    # Financeiro: faturas e recibos
    from api.v1.billing.serializers import InvoiceSerializer
    from apps.billing.models.invoice import Invoice

    qs_faturas = Invoice.objects.filter(
        deleted=False,
        patient_id__in=patient_ids,
    ).order_by("-created_at")
    if tenant is not None:
        qs_faturas = qs_faturas.filter(tenant=tenant)

    from api.v1.payments.serializers import ReceiptSerializer
    from apps.payments.models.receipt import Receipt

    qs_recibos = (
        Receipt.objects.filter(
            invoice__deleted=False,
            invoice__patient_id__in=patient_ids,
        )
        .select_related("invoice", "invoice__patient", "payment")
        .order_by("-created_at")
    )
    if tenant is not None:
        qs_recibos = qs_recibos.filter(invoice__tenant=tenant)

    # Serializers
    from ..serializers import LabRequestSerializer, PatientSerializer

    return {
        "patient": PatientSerializer(patient).data,
        "referencia": {
            "document_number": document_number or None,
            "pacientes_vinculados": len(set(patient_ids)),
        },
        "cardex": MedicalRecordEntrySerializer(qs_prontuario[:limit], many=True).data,
        "consultations": MedicalConsultationSerializer(qs_consultations[:limit], many=True).data,
        "requisicoes": LabRequestSerializer(qs_requisicoes[:limit], many=True, context={"request": request}).data,
        "procedures_enfermagem": ProcedureSerializer(qs_procedures[:limit], many=True).data,
        "internamentos_ward": WardAdmissionSerializer(qs_internamentos[:limit], many=True).data,
        "vendas_farmacia": SaleSerializer(qs_vendas[:limit], many=True).data,
        "faturas": InvoiceSerializer(qs_faturas[:limit], many=True).data,
        "recibos": ReceiptSerializer(qs_recibos[:limit], many=True).data,
    }

