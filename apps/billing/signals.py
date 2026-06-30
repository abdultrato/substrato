"""Sinais de faturamento."""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models.invoice import Invoice
from .models.invoice_items import InvoiceItem


@receiver(post_save, sender=Invoice)
def register_invoice_event(sender, instance, created, **kwargs):
    """Ao criar uma fatura, registra histórico de criação."""
    if created:
        try:
            linhas = [
                f"Origem: {instance.get_origin_display()}",
                f"Referência: {instance.source_reference or '-'}",
                f"Paciente: {getattr(instance.patient, 'name', '-')}",
                f"Estado: {instance.get_status_display()}",
            ]
            instance.register_history("CRIACAO", "Fatura criada", linhas=linhas)
        except Exception:
            # Histórico é auxiliar; não deve quebrar fluxo de criação.
            pass


@receiver(post_save, sender=InvoiceItem)
def route_invoice_item_to_operational(sender, instance, created, **kwargs):
    """Encaminha itens de fatura para os módulos operacionais correspondentes.

    - EXA → LabRequest (LAB) + LabRequestItem
    - EXM → LabRequest (MED) + LabRequestItem
    - PRC → garante Procedure vinculada à fatura; cria se necessário
    - MAT → MaterialRequisition (ENF) + MaterialRequisitionItem
    """
    if not created:
        return
    try:
        _route(instance)
    except Exception:
        # Roteamento é operacional auxiliar; não deve bloquear o faturamento.
        pass


def _route(item: InvoiceItem):
    invoice = item.invoice

    if item.item_type == "EXA":
        _ensure_lab_request_item(invoice, item, request_type="LAB")
    elif item.item_type == "EXM":
        _ensure_lab_request_item(invoice, item, request_type="MED")
    elif item.item_type == "PRC":
        _ensure_procedure(invoice, item)
    elif item.item_type == "MAT":
        _ensure_material_requisition_item(invoice, item)


# ---------------------------------------------------------------------------
# EXA / EXM → LabRequest + LabRequestItem
# ---------------------------------------------------------------------------

def _ensure_lab_request_item(invoice, item, request_type):
    from apps.clinical.models.lab_request import LabRequest
    from apps.clinical.models.lab_request_item import LabRequestItem

    # Encontra ou cria o LabRequest associado à fatura.
    # invoice.request é OneToOne definido em Invoice; acessa via related_name "invoice"
    lab_req = invoice.request if invoice.request_id else None

    if lab_req is None:
        lab_req = LabRequest.objects.create(
            tenant=invoice.tenant,
            patient=invoice.patient,
            type=request_type,
            status="pendente",
        )
        invoice.request = lab_req
        invoice.save(update_fields=["request"])
    elif lab_req.type != request_type:
        # Tipo diferente: reutiliza ou cria outro LabRequest para o mesmo tipo.
        existing = LabRequest.objects.filter(
            tenant=invoice.tenant,
            patient=invoice.patient,
            type=request_type,
            status="pendente",
            deleted=False,
        ).first()
        if existing:
            lab_req = existing
        else:
            lab_req = LabRequest.objects.create(
                tenant=invoice.tenant,
                patient=invoice.patient,
                type=request_type,
                status="pendente",
            )

    # Cria o LabRequestItem apenas se ainda não existir para este exam/medical_exam.
    # EXA usa LabExam (template de campos), incompatível com LabRequestItem.exam (LabTest).
    # Apenas garante o LabRequest; itens serão vinculados pela enfermagem na colheita.
    if item.item_type == "EXA":
        pass  # LabRequest já garantido acima
    elif item.item_type == "EXM" and item.medical_exam_id:
        if not LabRequestItem.objects.filter(
            request=lab_req, medical_exam_id=item.medical_exam_id, deleted=False
        ).exists():
            LabRequestItem.objects.create(
                tenant=invoice.tenant,
                request=lab_req,
                medical_exam=item.medical_exam,
            )


# ---------------------------------------------------------------------------
# PRC → Procedure + ProcedureItem
# ---------------------------------------------------------------------------

def _ensure_procedure(invoice, item):
    from apps.nursing.models.procedure import Procedure
    from apps.nursing.models.procedure_item import ProcedureItem

    if not item.procedure_item_id:
        return

    procedure_item: ProcedureItem = item.procedure_item
    procedure: Procedure = procedure_item.procedure

    # Liga o Procedure à fatura via M2M (evita duplicatas).
    if not invoice.procedures.filter(pk=procedure.pk).exists():
        invoice.procedures.add(procedure)


# ---------------------------------------------------------------------------
# MAT → MaterialRequisition + MaterialRequisitionItem
# ---------------------------------------------------------------------------

def _ensure_material_requisition_item(invoice, item):
    from apps.pharmacy.models.material_requisition import MaterialRequisition
    from apps.pharmacy.models.material_requisition_item import MaterialRequisitionItem

    if not item.procedure_material_id:
        return

    proc_material = item.procedure_material
    product = proc_material.product

    fatura_ref = str(invoice.custom_id or invoice.pk)
    patient_name = getattr(invoice.patient, "name", "") or ""
    dept_value = f"{fatura_ref} · {patient_name}" if patient_name else fatura_ref
    # max_length=120 — truncate safely
    dept_value = dept_value[:120]

    # Encontra ou cria a MaterialRequisition pendente ligada a esta fatura.
    # Filtra por prefixo de fatura (antes do separador · ) para tolerar actualizações.
    requisition = MaterialRequisition.objects.filter(
        tenant=invoice.tenant,
        status="PEN",
        deleted=False,
        requested_by_department__startswith=fatura_ref,
    ).first()

    if requisition is None:
        requisition = MaterialRequisition.objects.create(
            tenant=invoice.tenant,
            sector="ENF",
            source="PHA",
            status="PEN",
            requested_by_department=dept_value,
        )
    elif requisition.requested_by_department != dept_value:
        # Keep patient name up to date on existing pending requisition.
        requisition.requested_by_department = dept_value
        requisition.save(update_fields=["requested_by_department", "updated_at"])

    # Adiciona o item apenas se o produto ainda não estiver na requisição.
    if not MaterialRequisitionItem.objects.filter(
        requisition=requisition, product=product, deleted=False
    ).exists():
        MaterialRequisitionItem.objects.create(
            tenant=invoice.tenant,
            requisition=requisition,
            product=product,
            requested_quantity=item.quantity or proc_material.quantity or 1,
        )
